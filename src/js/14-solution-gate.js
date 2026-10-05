/* ---- 3. Режим разборов -------------------------------------------------- */

/* Разбор открывается в трёх случаях: ползунок «показывать решения» включён,
   ответ уже зачтён (решён верно) или пройден порог попыток. */
function spSolutionUnlocked(t) {
    const s = spSettings();
    if (s.showSolutions) return true;
    if (progress.solved[t.id]) return true;
    return (progress.attempts[t.id] || 0) >= s.solutionAttempts
}

function spSolutionHtml(t, cid) {
    const s = spSettings(),
        label = t.type === 'open' ? ui('Пример и пояснение') : ui('Разбор решения'),
        attempts = progress.attempts[t.id] || 0;
    if (spSolutionUnlocked(t)) return `<details class="task-detail open-solution" open><summary>${label}</summary><p>${esc(t.solution)}</p></details>`;
    return `<details class="task-detail locked"><summary>${label} · ${ui('откроется после верного ответа')}</summary><p class="small muted">${ui('Разбор откроется после верного ответа или нескольких попыток:')} <strong>${attempts} / ${s.solutionAttempts}</strong>. ${ui('Подсказка ниже поможет: разбор появится сразу после верного ответа, а если ответ не засчитывается — после порога попыток.')}</p></details>`
}

function spSolutionSlot(t, cid) {
    if (spExamActive()) return '';
    return `<div class="solution-slot" id="solution-${cid}" data-solution-for="${esc(cid)}">${spSolutionHtml(t,cid)}</div>`
}

function spRefreshSolution(cid) {
    const slot = $('solution-' + cid);
    if (!slot) return;
    const card = slot.closest('[data-task]'), t = card ? taskMap[card.dataset.task] : null;
    if (t) slot.innerHTML = spSolutionHtml(t, cid)
}

function spApplySolutionMode() {
    document.querySelectorAll('[data-solution-for]').forEach(el => spRefreshSolution(el.dataset.solutionFor))
}
