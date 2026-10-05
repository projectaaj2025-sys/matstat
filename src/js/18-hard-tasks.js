/* ---- 7. Трудные задания ------------------------------------------------- */

function spDifficultyMap() {
    const rows = [];
    for (const t of allTasks) {
        const attempts = progress.attempts[t.id] || 0,
            solved = !!progress.solved[t.id],
            reply = progress.openReplies[t.id];
        let percent = solved ? 1 : 0;
        if (t.type === 'open' && reply) percent = Number.isFinite(reply.percent) ? reply.percent : spScoreOpen(t, reply.text).percent;
        const missed = t.type === 'open' && reply && !solved ? (Number.isFinite(reply.percent) ? 1 - reply.percent : 0) : 0;
        if (solved) continue;
        const weight = attempts * 2 + (reply ? 1.5 : 0) + missed * 3;
        rows.push({task: t, attempts, reply: !!reply, percent, weight})
    }
    return rows.sort((a, b) => b.weight - a.weight || b.attempts - a.attempts)
}

function spHardTasks(count = 8) {
    return spDifficultyMap().filter(x => x.weight > 0).slice(0, count)
}

function spTopicDifficulty() {
    return SECTIONS.map(s => {
        const done = sectionDone(s), total = s.tasks.length;
        return {section: s, done, total, percent: total ? done / total : 0}
    }).filter(x => x.done < x.total).sort((a, b) => a.percent - b.percent)
}

function spProgressCards() {
    const hard = spHardTasks(6),
        topics = spTopicDifficulty().slice(0, 4),
        st = spStudyStats(),
        tests = (progress.tests || []).slice(-1)[0];
    return `<div class="grid2" style="margin-top:23px">
      <div class="card"><div class="between" style="margin-bottom:14px"><h3 style="margin:0">${ui('Трудные задания')}</h3><span class="pill">${ui('личная карта')}</span></div>
        ${hard.length?`<p class="small muted">${ui('Здесь собраны задания, на которых вы чаще спотыкались: больше попыток, незачтённые ответы или пропущенные пункты.')}</p><ol class="hard-list">${hard.map(x=>`<li><a href="#${x.task.sectionId}/practice">${esc(x.task.title||x.task.question.slice(0,60))}</a><span class="small muted">${esc(x.task.sectionTitle||'')} · ${ui('попыток')}: ${x.attempts}${x.reply?' · '+Math.round(x.percent*100)+'%':''}</span></li>`).join('')}</ol><button class="btn primary" style="margin-top:14px" onclick="go('trainer','hard')">${ui('Тренировать эти задания')}</button>`:`<p class="small muted">${ui('Пока нет данных: решите несколько заданий, и карта покажет, что стоит повторить.')}</p>`}
        ${topics.length?`<div class="topic-difficulty">${topics.map(x=>`<div class="topic-result"><span class="topic-num">${sectionNumber(x.section)}</span><a href="#${x.section.id}/practice">${esc(x.section.title)}</a><div class="progress-track"><div class="progress-fill" style="width:${100*x.percent}%"></div></div><span class="result-count">${x.done} / ${x.total}</span></div>`).join('')}</div>`:''}
      </div>
      <div class="card"><div class="between" style="margin-bottom:14px"><h3 style="margin:0">${ui('Тренажёр ошибок')}</h3><span class="pill">${ui('повторение')}</span></div>
        <p class="small muted">${ui('Повторяйте только нерешённые задания — по теме, по всему курсу или по личной карте трудности. Попытки и ответы сохраняются как обычно.')}</p>
        <div class="row wrap" style="margin-top:14px"><button class="btn primary" onclick="go('trainer','all')">${ui('Весь курс')}</button><button class="btn" onclick="go('trainer','hard')">${ui('Трудные задания')}</button></div>
        <div class="sep"></div>
        <h4>${ui('Контрольная работа')}</h4>
        <p class="small muted">${ui('Случайная выборка заданий по теме или по всему курсу с таймером. Разборы и подсказки закрыты до сдачи, результат считается автоматически.')}</p>
        ${tests?`<p class="small muted">${ui('Последняя контрольная:')} <strong>${tests.score}%</strong> · ${ui('заданий')}: ${tests.taskIds.length} · ${esc(new Date(tests.date).toLocaleString(LOCALE_TAG,{day:'2-digit',month:'2-digit',year:'numeric'}))}</p>`:''}
        <div class="row wrap" style="margin-top:12px"><button class="btn primary" onclick="go('exam','build')">${ui('Настроить и начать')}</button>${tests?`<button class="btn" onclick="go('exam','result')">${ui('Результат последней')}</button>`:''}</div>
      </div></div>`
}
