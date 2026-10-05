/* ---- 8. Тренажёр ошибок ------------------------------------------------- */

let spTrainerScope = 'all';

function spTrainerPool(scope) {
    let pool;
    if (scope === 'hard') pool = spHardTasks(40).map(x => x.task);
    else pool = allTasks.filter(t => !progress.solved[t.id]);
    if (scope && scope !== 'all' && scope !== 'hard') {
        const s = SECTIONS.find(s => s.id === scope);
        if (s) pool = s.tasks.filter(t => !progress.solved[t.id]);
    }
    return {scope, list: pool}
}

function spRenderTrainer(scope) {
    spTrainerScope = scope || 'all';
    const s = SECTIONS.find(s => s.id === spTrainerScope),
        {list} = spTrainerPool(spTrainerScope),
        title = s ? s.title : (spTrainerScope === 'hard' ? ui('Трудные задания') : ui('Весь курс')),
        ordered = s ? tasksInDisplayOrder({tasks: list, contexts: s.contexts}) : list;
    $('main-content').innerHTML = `<div class="page">${pageTop('Тренажёр ошибок')}<p class="eyebrow">${ui('ПОВТОРЕНИЕ ТОЛЬКО НЕРЕШЁННОГО')}</p><h1>${ui('Тренажёр ошибок')}: ${esc(title)}</h1><p class="page-description">${ui('Здесь собраны только задания, которые ещё не зачтены. Отвечайте по порядку; как только задание зачтено, оно исчезает из очереди.')}</p><div class="card trainer-head"><div class="row wrap" style="justify-content:space-between"><div class="row wrap"><span class="pill green">${ui('Осталось')}: <strong id="trainer-counter">${list.length}</strong></span><span class="pill">${ui('Решено в этой сессии')}: <strong id="trainer-solved">0</strong></span></div><div class="row wrap"><select aria-label="${ui('Что повторять')}" onchange="go('trainer',this.value)"><option value="all" ${spTrainerScope==='all'?'selected':''}>${ui('Весь курс')}</option><option value="hard" ${spTrainerScope==='hard'?'selected':''}>${ui('Трудные задания')}</option>${SECTIONS.filter(s=>s.tasks.some(t=>!progress.solved[t.id])).map(s=>`<option value="${s.id}" ${spTrainerScope===s.id?'selected':''}>${sectionNumber(s)}. ${esc(s.title)}</option>`).join('')}</select><button class="btn ghost" onclick="spTrainerClear()">${ui('Убрать решённые')}</button></div></div></div><div id="trainer-list" class="stack">${list.length?ordered.map((t,i)=>taskHtml(t,i+1,'tr')).join(''):`<div class="empty">${ui('Здесь всё решено — отличная работа! Выберите другой раздел или откройте курс.')}</div>`}</div>${footer()}</div>`;
    math($('main-content'))
}

function spTrainerSync() {
    const host = $('trainer-list');
    if (!host || route.id !== 'trainer') return;
    let solved = 0;
    host.querySelectorAll('[data-task]').forEach(card => {
        const ok = !!progress.solved[card.dataset.task];
        card.classList.toggle('trainer-solved', ok);
        if (ok) solved++
    });
    const left = host.querySelectorAll('[data-task]').length - solved,
        counter = $('trainer-counter'), doneEl = $('trainer-solved');
    if (counter) counter.textContent = left;
    if (doneEl) doneEl.textContent = solved
}

function spHardRefresh() {
    if (route.id === 'progress') renderProgress()
}

function spTrainerClear() {
    const {list} = spTrainerPool(spTrainerScope);
    const left = list.filter(t => !progress.solved[t.id]);
    if (!left.length) { renderRoute(); toast(ui('В этой очереди всё решено.')); return }
    spRenderTrainer(spTrainerScope);
    toast(ui('Решённые задания убраны из очереди. Осталось: ') + left.length)
}
