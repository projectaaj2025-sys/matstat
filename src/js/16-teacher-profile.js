/* ---- 5. Профиль учителя ------------------------------------------------- */

function spStudyStats() {
    const openIds = allTasks.filter(t => t.type === 'open'),
        solvedOpen = openIds.filter(t => progress.solved[t.id]).length,
        auto = Object.keys(progress.auto || {}).length,
        tests = (progress.tests || []).length;
    return {openTotal: openIds.length, solvedOpen, auto, tests}
}

function spProfileHtml() {
    const s = spSettings(), st = spStudyStats();
    return `<div class="card teacher-profile"><div class="between" style="align-items:flex-start;flex-wrap:wrap;gap:14px"><div><h3 style="margin-bottom:8px">${ui('Профиль учителя')}</h3><p class="small muted" style="max-width:760px;margin:0">${ui('Настройки действуют в этом браузере: они меняют показ разборов, строгость автооценки и правила тренировок. Сервер не нужен, права доступа не требуются.')}</p></div><span class="pill green">${ui('Версия')} ${esc(COURSE.version)}</span></div><div class="profile-grid">
      <div class="profile-row"><label class="switch" for="sp-solutions"><input type="checkbox" id="sp-solutions" ${s.showSolutions?'checked':''} onchange="spToggleSolutions(this.checked)"><span class="switch-track" aria-hidden="true"></span><span class="visually-hidden">${ui('Показывать решения под заданиями')}</span></label><div><strong>${ui('Показывать решения под заданиями')}</strong><p class="small muted">${ui('Ползунок включён — все разборы и примеры открыты под заданиями, удобно разбирать решение вместе с классом. Ползунок выключен — решения скрыты, а у заданий с автопроверкой разбор открывается после верного ответа или нескольких попыток.')}</p></div></div>
      <div class="profile-row"><label class="switch" for="sp-autograde"><input type="checkbox" id="sp-autograde" ${s.autoGrade?'checked':''} onchange="spToggleAutoGrade(this.checked)"><span class="switch-track" aria-hidden="true"></span><span class="visually-hidden">${ui('Автоматическая оценка открытых ответов')}</span></label><div><strong>${ui('Автоматическая оценка открытых ответов')}</strong><p class="small muted">${ui('Когда включено, развёрнутый ответ проверяется сразу: находятся слова критериев, числа из образца и охват разбора. Ответ зачитывается, когда выполнено не меньше порога. Проверка никогда не ставит «неверно» — она показывает, чего не хватает.')}</p><p class="profile-stat" id="sp-autograde-stat"></p></div></div>
      <div class="profile-row range-row"><div><strong>${ui('Порог зачёта')}</strong><p class="small muted">${ui('Сколько процентов проверяемых пунктов нужно выполнить, чтобы ответ зачли. 100 % — зачёт только за полный ответ; 80 % — допускает один-два пропущенных пункта.')}</p><div class="profile-range"><input type="range" id="sp-threshold" min="50" max="100" step="10" value="${Math.round(s.passShare*100)}" aria-label="${ui('Порог зачёта')}" oninput="spSetPassThreshold(this.value)"><output id="sp-threshold-out" for="sp-threshold">${Math.round(s.passShare*100)} %</output></div></div></div>
      <div class="profile-row range-row"><div><strong>${ui('Попыток до показа разбора')}</strong><p class="small muted">${ui('Сколько попыток нужно сделать в задании с автопроверкой, прежде чем откроется разбор решения, если ползунок показа решений выключен. Верный ответ открывает разбор сразу, не дожидаясь порога.')}</p><div class="profile-range"><input type="range" id="sp-attempts" min="1" max="6" step="1" value="${s.solutionAttempts}" aria-label="${ui('Попыток до показа разбора')}" oninput="spSetAttemptGate(this.value)"><output id="sp-attempts-out" for="sp-attempts">${s.solutionAttempts}</output></div></div></div>
    </div></div>`
}

function spProfileSync() {
    const out = $('sp-attempts-out'), thr = $('sp-threshold-out'), s = spSettings();
    if (out) out.textContent = s.solutionAttempts;
    if (thr) thr.textContent = Math.round(s.passShare * 100) + ' %';
    const st = $('sp-autograde-stat');
    if (st) {
        const p = spStudyStats();
        st.innerHTML = `${ui('Открытых ответов зачтено:')} <strong>${p.solvedOpen} / ${p.openTotal}</strong> · ${ui('из них с первой попытки:')} <strong>${p.auto}</strong> · ${ui('контрольных выполнено:')} <strong>${p.tests}</strong>`
    }
}

function spToggleSolutions(on) {
    spSetSetting('showSolutions', !!on);
    spApplySolutionMode();
    spProfileSync();
    toast(on ? ui('Разборы открыты под всеми заданиями на этом устройстве.') : ui('Разборы снова скрыты: они откроются после верного ответа или нескольких попыток.'))
}

function spToggleAutoGrade(on) {
    spSetSetting('autoGrade', !!on);
    spProfileSync();
    toast(on ? ui('Автоматическая оценка включена: ответы проверяются сразу при сохранении.') : ui('Автоматическая оценка выключена: ответы сохраняются без зачёта, проверьте их сами по критериям.'))
}

function spSetAttemptGate(value) {
    const n = Math.min(6, Math.max(1, Math.round(Number(value) || 3)));
    spSetSetting('solutionAttempts', n);
    spApplySolutionMode();
    spProfileSync()
}

function spSetPassThreshold(value) {
    const p = Math.min(1, Math.max(.5, (Number(value) || 100) / 100));
    spSetSetting('passShare', p);
    spProfileSync();
    if (route.id === 'progress') renderProgress();
    else spRegrade()
}

/* Пересчитывает зачёты по всем сохранённым открытым ответам под текущий порог. */
function spRegrade() {
    let credited = 0, lost = 0;
    for (const [id, reply] of Object.entries(progress.openReplies)) {
        const t = taskMap[id];
        if (!t || t.type !== 'open') continue;
        const s = spScoreOpen(t, reply.text);
        reply.percent = s.percent;
        reply.credited = s.credited;
        if (s.credited && !progress.solved[id]) { progress.solved[id] = true; credited++ }
        else if (!s.credited && progress.solved[id]) { delete progress.solved[id]; lost++ }
    }
    persist();
    updateProgressUI();
    return {credited, lost}
}
