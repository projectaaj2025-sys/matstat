/* ---- 9. Глобальный поиск по заданиям ----------------------------------- */

let spSearchState = {q: '', format: 'all', level: 'all', status: 'all'};

function spSearchFold(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
}

function spSearchFound() {
    const q = spSearchFold(spSearchState.q).trim(),
        words = q.split(/\s+/).filter(Boolean);
    let list = allTasks.filter(t => {
        if (spSearchState.format !== 'all' && t.type !== spSearchState.format) return false;
        if (spSearchState.level !== 'all' && (t.level || 'Базовый') !== spSearchState.level) return false;
        if (spSearchState.status === 'solved' && !progress.solved[t.id]) return false;
        if (spSearchState.status === 'todo' && progress.solved[t.id]) return false;
        if (!words.length) return true;
        const hay = spSearchFold([t.question, t.title || '', t.sectionTitle || '', (t.rubric || []).join(' '), t.solution || ''].join(' '));
        return words.every(w => hay.includes(w))
    });
    return list
}

function spRenderSearch() {
    const list = spSearchFound(),
        shown = list.slice(0, 40),
        levels = [...new Set(allTasks.map(t => t.level || 'Базовый'))],
        s = spSearchState;
    $('main-content').innerHTML = `<div class="page search-page">${pageTop('Поиск заданий')}<p class="eyebrow">${ui('НАЙТИ ЗАДАНИЕ И ОТВЕТИТЬ СРАЗУ')}</p><h1>${ui('Поиск по заданиям')}</h1><p class="page-description">${ui('Поиск идёт по вопросам, критериям, разборам и темам курса. Здесь же можно ответить на найденное задание.')}</p>
    <div class="card search-bar"><div class="grid2"><div class="field"><label for="sp-search-q">${ui('Что найти')}</label><input id="sp-search-q" type="search" value="${esc(s.q)}" placeholder="${ui('Например: дисперсия, полигон, рулетка')}" oninput="spSearchSet('q',this.value)"></div><div class="row wrap" style="align-items:flex-end;gap:12px"><div class="field"><label for="sp-search-format">${ui('Формат')}</label><select id="sp-search-format" onchange="spSearchSet('format',this.value)"><option value="all">${ui('Все форматы')}</option>${Object.entries(FORMAT).map(([k,v])=>`<option value="${k}" ${s.format===k?'selected':''}>${ui(v)}</option>`).join('')}</select></div><div class="field"><label for="sp-search-level">${ui('Уровень')}</label><select id="sp-search-level" onchange="spSearchSet('level',this.value)"><option value="all">${ui('Все уровни')}</option>${levels.map(l=>`<option value="${esc(l)}" ${s.level===l?'selected':''}>${esc(l)}</option>`).join('')}</select></div><div class="field"><label for="sp-search-status">${ui('Статус')}</label><select id="sp-search-status" onchange="spSearchSet('status',this.value)"><option value="all" ${s.status==='all'?'selected':''}>${ui('Любой')}</option><option value="todo" ${s.status==='todo'?'selected':''}>${ui('Не зачтено')}</option><option value="solved" ${s.status==='solved'?'selected':''}>${ui('Зачтено')}</option></select></div></div></div><p class="small muted" style="margin-top:12px">${ui('Найдено заданий:')} <strong>${list.length}</strong>${list.length>shown.length?' · '+ui('показаны первые')+' '+shown.length:''}</p></div>
    <div class="stack" style="margin-top:20px">${shown.length?shown.map((t,i)=>taskHtml(t,i+1,'sr')).join(''):`<div class="empty">${ui('По этому запросу заданий нет. Измените слова или фильтры.')}</div>`}</div>${footer()}</div>`;
    math($('main-content'));
    const box = $('sp-search-q');
    if (box && s.q && document.activeElement !== box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length) }
}

function spSearchSet(key, value) {
    spSearchState[key] = value;
    spRenderSearch()
}
