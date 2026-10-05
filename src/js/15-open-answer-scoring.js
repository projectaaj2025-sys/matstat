/* ---- 4. Проверка развёрнутого ответа по метаданным --------------------- */

function spSpecHasWord(w, folded, signs) {
    if (w.length >= 4) return signs.includes(w.slice(0, 4));
    return new RegExp('(^|\\s)' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(folded)
}

function spAltOk(alt, folded, signs) {
    return String(alt).split(' ').filter(Boolean).every(w => spSpecHasWord(w, folded, signs))
}

function spSpecFound(spec, folded, signs) {
    if (!spec) return false;
    if (Array.isArray(spec)) return spec.some(a => spAltOk(a, folded, signs));
    if (spec.none && spec.none.some(a => spAltOk(a, folded, signs))) return false;
    if (spec.all && !spec.all.every(a => spAltOk(a, folded, signs))) return false;
    if (spec.any && !spec.any.some(a => spAltOk(a, folded, signs))) return false;
    return true
}

/* Разбор ответа: что найдено, что нет, сколько процентов выполнено. */
function spScoreOpen(t, text) {
    const meta = t.check || {criteria: [], numbers: []},
        folded = assistFold(text),
        signs = assistTerms(text).map(x => x.sign),
        criteria = (t.rubric || []).map((c, i) => {
            const spec = i < meta.criteria.length ? meta.criteria[i] : null;
            return {index: i, text: c, soft: spec === null, spec, found: spec === null ? false : spSpecFound(spec, folded, signs)}
        }),
        solTerms = new Set(assistTerms(t.solution || '').map(x => x.sign)),
        coverage = solTerms.size ? [...solTerms].filter(x => signs.includes(x)).length / solTerms.size : 1,
        req = meta.numbers || [],
        ansNums = [...spCollectNumbers(text)],
        foundNums = req.filter(v => ansNums.some(x => spSameNumber(x, v))),
        needNums = req.length <= 2 ? req.length : Math.ceil(.8 * req.length),
        numsOk = !req.length || foundNums.length >= needNums,
        items = criteria.filter(c => !c.soft),
        points = items.filter(c => c.found).length + (req.length && numsOk ? 1 : 0) + (coverage >= SP_COVERAGE_FLOOR ? 1 : 0),
        totalPoints = items.length + (req.length ? 1 : 0) + 1,
        percent = totalPoints ? points / totalPoints : 1,
        words = assistFold(text).split(' ').filter(Boolean).length;
    const missing = criteria.filter(c => !c.soft && !c.found);
    return {
        criteria,
        coverage,
        coverageOk: coverage >= SP_COVERAGE_FLOOR,
        numbers: {required: req, found: foundNums, ok: numsOk},
        percent,
        words,
        missing,
        softCount: criteria.filter(c => c.soft).length,
        threshold: spPassShare(),
        credited: percent >= spPassShare() - 1e-9
    }
}

function spPercentBar(percent, ok) {
    return `<div class="assist-bar"><div class="assist-bar-fill${ok?' ok':''}" style="width:${Math.round(percent*100)}%"></div><span>${Math.round(percent*100)}%</span></div>`
}

function spScoreHtml(t, text) {
    const s = spScoreOpen(t, text),
        left = s.missing.map(c => `<li>${esc(c.text)}</li>`).join('');
    let numbers = '';
    if (s.numbers.required.length) {
        const list = s.numbers.required.map(v => esc(String(v).replace('.', ','))).join(', ');
        numbers = `<p class="assist-note">${ui('Числа из образца:')} <strong>${s.numbers.found.length} / ${s.numbers.required.length}</strong> (${list})${s.numbers.ok?' ✓':''}</p>`
    }
    return `<div class="assist-score">${spPercentBar(s.percent, s.credited)}
      <p>${s.credited
            ? `<strong>${ui('Зачтено автоматически.')}</strong> ${ui('Все проверяемые пункты найдены: задание засчитано.')}`
            : `<strong>${ui('Пока не зачтено:')}</strong> ${ui('выполнено проверяемых пунктов')} <strong>${Math.round(s.percent*100)}%</strong>, ${ui('нужно не меньше')} <strong>${Math.round(s.threshold*100)}%</strong>.`}</p>
      ${left?`<p class="small muted">${ui('Не найдено в тексте:')}</p><ul class="assist-missing">${left}</ul>`:''}
      ${s.coverageOk?'':`<p class="assist-note">${ui('Ответ заметно короче разбора: раскройте основные шаги и понятия задачи.')}</p>`}
      ${numbers}
      ${s.softCount?`<p class="assist-note">${ui('Пункты, которые проверяются по смыслу (не словами), отмечены в критериях задания: перечитайте их сами.')}</p>`:''}
    </div>`
}

/* Критерии проверки: до ответа — только замок и число пунктов. */
function spCriteriaItems(t) {
    const meta = t.check || {criteria: []};
    return (t.rubric || []).map((c, i) => {
        const spec = i < meta.criteria.length ? meta.criteria[i] : null;
        return {text: c, soft: spec === null}
    })
}

function spCriteriaHtml(t) {
    const items = spCriteriaItems(t),
        n = items.length,
        reply = progress.openReplies[t.id];
    if (!reply) {
        return `<p class="assist-lock"><strong>${ui('Критерии проверки · откроются после ответа')}</strong></p>` +
            `<p class="assist-lock-count">${ui('Пунктов проверки:')} <strong>${n}</strong></p>`
    }
    const scored = spScoreOpen(t, reply.text).criteria,
        list = items.map((c, i) => {
            const found = !c.soft && scored[i] && scored[i].found,
                mark = c.soft
                    ? `<span class="assist-mark soft">${ui('по смыслу')}</span>`
                    : `<span class="assist-mark ${found ? 'ok' : 'miss'}" aria-label="${found ? ui('выполнено') : ui('не найдено')}">${found ? '✓' : '○'}</span>`;
            return `<li>${mark}<span>${esc(c.text)}</span></li>`
        }).join('');
    return `<details class="task-detail assist-criteria" open><summary>${ui('Критерии проверки')}</summary>` +
        `<ul class="assist-criteria-list">${list}</ul>` +
        `<p class="assist-note">${ui('Отметки «✓» и «○» поставлены по словам и числам ответа; пункты «по смыслу» проверьте сами.')}</p></details>`
}

function spCriteriaSlot(t, cid) {
    if (spExamActive()) return '';
    return `<div class="assist-criteria-slot" id="criteria-${cid}" data-criteria-for="${esc(cid)}">${spCriteriaHtml(t)}</div>`
}

function spRefreshCriteria(cid) {
    const host = $('criteria-' + cid);
    if (!host) return;
    const card = host.closest('[data-task]'), t = card ? taskMap[card.dataset.task] : null;
    if (t) host.innerHTML = spCriteriaHtml(t)
}

/* Записи журнала 3.6–3.7 могли остаться в прогрессе на устройстве:
   показываем их как историю проверки, но никогда не ломаем отрисовку темы. */
function spReviewLabel(rev) {
    if (!rev || typeof rev !== 'object') return ui('Ответ проверен');
    if (!rev.approved) return ui('Нужно доработать');
    return rev.auto ? ui('Зачтено автоматически (предварительно)') : ui('Учитель зачёл ответ')
}

function spOpenCardHtml(t) {
    const reply = progress.openReplies[t.id];
    if (!reply) return '';
    const credit = !!progress.solved[t.id];
    return `<div class="feedback ${credit?'success':''}" id="open-score-${t.id}"><strong>${credit?ui('Зачтено автоматически (предварительно)'):ui('Ожидает доработки')}</strong>${spScoreHtml(t, reply.text)}</div>`
}

function spOpenSubmit(t, cid, text) {
    const s = spScoreOpen(t, text),
        auto = spSettings().autoGrade,
        credit = s.credited && auto,
        status = $('status-' + cid),
        prev = progress.openReplies[t.id];
    progress.attempts[t.id] = (progress.attempts[t.id] || 0) + 1;
    progress.openReplies[t.id] = {text, date: new Date().toISOString(), percent: s.percent, credited: credit};
    if (credit) {
        progress.solved[t.id] = true;
        if (prev && !prev.credited) delete progress.auto[t.id];
        else progress.auto[t.id] = progress.auto[t.id] || new Date().toISOString()
    } else {
        delete progress.solved[t.id]
    }
    persist();
    if (status) status.textContent = credit ? ui('Зачтено автоматически') : ui('Сохранено');
    feedback(cid, ui('Ответ сохранён на этом устройстве.') + ' ' + spScoreHtml(t, text) + (auto ? '' : ' <br>' + ui('Автоматическая оценка выключена в профиле: зачёт не выставлен, проверьте ответ по критериям сами.')), credit ? 'success' : '');
    const holder = $('open-score-' + t.id);
    if (holder) holder.outerHTML = spOpenCardHtml(t);
    spRefreshCriteria(cid);
    spRefreshSolution(cid);
    updateProgressUI();
    spAfterCheck(t)
}
