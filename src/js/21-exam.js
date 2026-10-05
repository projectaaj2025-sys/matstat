/* ---- 10. Контрольная работа -------------------------------------------- */

let spExam = null, spExamTimer = null;

const SP_EXAM_KEY = 'statpracticum-v2-exam';

function spExamActive() {
    return !!(spExam && !spExam.submitted)
}

function spExamSave() {
    try {
        if (spExam) localStorage.setItem(SP_EXAM_KEY, JSON.stringify(spExam));
        else localStorage.removeItem(SP_EXAM_KEY)
    } catch (e) { /* хранилище может быть недоступно */ }
}

function spExamRestore() {
    try {
        const raw = localStorage.getItem(SP_EXAM_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && data.config && !data.submitted) spExam = data
    } catch (e) { spExam = null }
}

function spExamPool(section, withOpen) {
    let pool;
    if (section && section !== 'all') {
        const s = SECTIONS.find(x => x.id === section);
        pool = s ? s.tasks.slice() : allTasks.slice()
    } else pool = allTasks.slice();
    return pool.filter(t => withOpen || t.type !== 'open')
}

function spExamStart(config) {
    const pool = spExamPool(config.section, config.open),
        wanted = Math.max(3, Math.min(30, Number(config.count) || 10)),
        picked = spShuffle(pool).slice(0, Math.min(wanted, pool.length)),
        opened = picked.filter(t => t.type === 'open').length;
    spExam = {
        config: {section: config.section || 'all', count: picked.length, minutes: Math.max(5, Math.min(90, Number(config.minutes) || 20)), open: !!config.open, all: pool.length},
        ids: picked.map(t => t.id),
        opened,
        started: Date.now(),
        endsAt: Date.now() + Math.max(5, Math.min(90, Number(config.minutes) || 20)) * 60000,
        answers: {},
        submitted: false,
        result: null
    };
    spExamSave();
    location.hash = '#exam/run';
    renderRoute()
}

function spShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function spExamLeft() {
    if (!spExam) return '—';
    const ms = Math.max(0, spExam.endsAt - Date.now()),
        m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

function spExamTick() {
    const el = $('exam-clock');
    if (!el) return;
    el.textContent = spExamLeft();
    el.classList.toggle('warn', spExam && spExam.endsAt - Date.now() < 120000);
    if (spExam && Date.now() >= spExam.endsAt) {
        toast(ui('Время контрольной вышло: работа сдана автоматически.'), true);
        spExamSubmit(true)
    }
}

function spExamAnswer(cid) {
    if (!spExam || spExam.submitted) return;
    const card = $('card-' + cid), t = card ? taskMap[card.dataset.task] : null;
    if (!t) return;
    spExam.answers[t.id] = getTaskAnswer(card);
    const st = $('status-' + cid);
    if (st) st.textContent = ui('Ответ принят')
}

function spExamSubmit(auto) {
    if (!spExam || spExam.submitted) return;
    if (!auto && !confirm(ui('Сдать контрольную? Проверить ответы и что-то изменить после сдачи уже нельзя.'))) return;
    let points = 0, maxPoints = 0;
    const rows = [];
    for (const id of spExam.ids) {
        const t = taskMap[id], a = spExam.answers[id];
        maxPoints++;
        let ok = false, note = '';
        if (t.type === 'open') {
            const s = spScoreOpen(t, String(a || ''));
            ok = s.credited;
            note = Math.round(s.percent * 100) + '%'
        } else if (a === undefined || a === '' || (Array.isArray(a) && !a.length)) note = ui('нет ответа');
        else {
            ok = spCheckAuto(t, a, true);
            if (!ok) note = ui('неверно')
        }
        if (ok) points++;
        rows.push({id, ok, note, answered: a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0)})
    }
    const score = Math.round(100 * points / Math.max(1, maxPoints));
    spExam.submitted = true;
    spExam.result = {points, maxPoints, score, rows, date: new Date().toISOString()};
    progress.tests = (progress.tests || []).concat([{
        date: spExam.result.date,
        config: spExam.config,
        taskIds: spExam.ids.slice(),
        score,
        points,
        maxPoints,
        marks: rows.map(r => r.ok)
    }]).slice(-8);
    persist();
    spExamSave();
    clearInterval(spExamTimer);
    spExamTimer = null;
    if (location.hash !== '#exam/result') location.hash = '#exam/result';
    renderRoute();
    toast(ui('Контрольная сдана:') + ' ' + score + '%')
}

function spCheckAuto(t, a, exam) {
    if (t.type === 'number' || t.type === 'graph') return compareNumber(a, t.answer, t.tolerance ?? 1e-6);
    if (t.type === 'single') return String(a) === String(t.answer);
    if (t.type === 'multi') return JSON.stringify([...a].sort((x, y) => x - y)) === JSON.stringify([...t.answer].sort((x, y) => x - y));
    if (t.type === 'table') return (t.acceptedAnswers || [t.answer]).some(expected => a.every((x, i) => compareNumber(x, expected[i], t.tolerance ?? 1e-6)));
    if (t.type === 'match') return a.every((x, i) => Number(x) === t.answer[i]);
    if (t.type === 'order') return JSON.stringify(a) === JSON.stringify(t.answer);
    return false
}

/* В итоге контрольной работа уже сдана, поэтому разбор показываем сразу. */
function spExamSolutionCell(t) {
    if (!t || !t.solution) return '—';
    const label = t.type === 'open' ? ui('Пример и пояснение') : ui('Разбор решения');
    return `<details class="task-detail"><summary>${label}</summary><p>${esc(t.solution)}</p></details>`
}

function spExamResultHtml() {
    const r = spExam && spExam.result ? spExam.result : (progress.tests || []).slice(-1)[0];
    if (!r) return `<div class="empty">${ui('Результатов пока нет: настройте контрольную и начните её.')}</div>`;
    const rows = r.rows && r.rows.map(x => ({...x, task: taskMap[x.id]})) || (r.marks || []).map((ok, i) => ({ok, task: taskMap[r.taskIds[i]]}));
    return `<div class="card exam-result"><div class="between" style="align-items:flex-start;flex-wrap:wrap;gap:14px"><div><h3 style="margin-bottom:6px">${ui('Итог контрольной')}: <strong>${r.score}%</strong></h3><p class="small muted" style="margin:0">${ui('Решено заданий:')} <strong>${r.points} / ${r.maxPoints}</strong> · ${esc(new Date(r.date).toLocaleString(LOCALE_TAG))}</p></div><button class="btn" onclick="spExamCsv()">${ico('download')} CSV</button></div><div class="table-scroll" style="margin-top:16px"><table class="data-table"><caption>${ui('Разбор по заданиям')}</caption><thead><tr><th scope="col">#</th><th scope="col">${ui('Задание')}</th><th scope="col">${ui('Тема')}</th><th scope="col">${ui('Результат')}</th><th scope="col">${ui('Разбор задания')}</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><th scope="row">${i+1}</th><td>${esc(String((x.task&&(x.task.title||x.task.question))||'').slice(0,90))}</td><td>${esc((x.task&&x.task.sectionTitle)||'')}</td><td>${x.ok?'✓':(x.note||'—')}</td><td>${spExamSolutionCell(x.task)}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:12px">${ui('Разбор задания раскрывается в последнем столбце. В темах курса разбор открывается после верного ответа или порога попыток.')}</p></div>`
}

function spExamCsv() {
    const r = spExam && spExam.result ? spExam.result : (progress.tests || []).slice(-1)[0];
    if (!r) { toast(ui('Результатов пока нет.'), true); return }
    const rows = [[ui('Номер'), ui('Тема'), ui('Задание'), ui('Формат'), ui('Результат'), ui('Балл')]];
    (r.rows || []).forEach((x, i) => {
        const t = taskMap[x.id];
        rows.push([i + 1, t ? t.sectionTitle : '', t ? (t.title || t.question) : x.id, t ? ui(FORMAT[t.type]) : '', x.ok ? ui('верно') : (x.note || ui('неверно')), x.ok ? 1 : 0])
    });
    rows.push([ui('Итого'), '', '', '', r.score + '%', r.points + ' / ' + r.maxPoints]);
    download(new Blob(['\ufeff' + rows.map(r2 => r2.map(csvCell).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}), ui('СтатПрактикум — контрольная.csv'));
    toast(ui('Результаты контрольной выгружены в CSV.'))
}

function spRenderExamPanel(panel) {
    const last = (progress.tests || []).slice(-1)[0];
    panel.innerHTML = `<div class="card"><div class="between" style="align-items:flex-start;flex-wrap:wrap;gap:14px"><div><h3 style="margin-bottom:8px">${ui('Контрольная работа')}</h3><p class="small muted" style="max-width:720px">${ui('Соберите контрольную: тема, число заданий, время и открытые ответы. Задания выбираются случайно, разборы и подсказки закрыты до сдачи, итог считается автоматически.')}</p></div><span class="pill green">${ui('Без интернета')}</span></div><div class="grid2" style="margin-top:20px"><div class="field"><label for="exam-section">${ui('Тема')}</label><select id="exam-section"><option value="all">${ui('Весь курс')}</option>${SECTIONS.map(s=>`<option value="${s.id}">${sectionNumber(s)}. ${esc(s.title)}</option>`).join('')}</select></div><div class="row wrap" style="align-items:flex-end;gap:12px"><div class="field"><label for="exam-count">${ui('Заданий')}</label><input id="exam-count" type="number" min="3" max="30" value="10"></div><div class="field"><label for="exam-minutes">${ui('Минут')}</label><input id="exam-minutes" type="number" min="5" max="90" value="20"></div></div></div><label class="assist-check" style="margin-top:14px"><input type="checkbox" id="exam-open" checked><span>${ui('Включать открытые ответы (проверяются автоматически по критериям)')}</span></label><div class="row wrap" style="margin-top:18px"><button class="btn primary" onclick="spExamStartFromForm()">${ui('Начать контрольную')}</button>${last?`<button class="btn" onclick="go('exam','result')">${ui('Результат последней')} (${last.score}%)</button>`:''}</div><p class="control-hint">${ui('Ученик проходит контрольную на своём устройстве: настройки задаёт учитель, а результат сохраняется в этом браузере и выгружается в CSV.')}</p></div>${last?spExamHistoryHtml():''}`
}

function spExamStartFromForm() {
    const section = $('exam-section') ? $('exam-section').value : 'all',
        count = $('exam-count') ? $('exam-count').value : 10,
        minutes = $('exam-minutes') ? $('exam-minutes').value : 20,
        open = $('exam-open') ? $('exam-open').checked : true;
    spExamStart({section, count, minutes, open})
}

function spExamHistoryHtml() {
    const tests = (progress.tests || []).slice().reverse();
    if (!tests.length) return '';
    return `<div class="card" style="margin-top:18px"><h3>${ui('История контрольных')}</h3><div class="table-scroll"><table class="data-table"><thead><tr><th scope="col">${ui('Дата')}</th><th scope="col">${ui('Тема')}</th><th scope="col">${ui('Заданий')}</th><th scope="col">${ui('Результат')}</th><th scope="col">CSV</th></tr></thead><tbody>${tests.map((t,i)=>`<tr><th scope="row">${esc(new Date(t.date).toLocaleDateString(LOCALE_TAG))}</th><td>${esc(t.config && t.config.section && t.config.section!=='all' ? ((SECTIONS.find(s=>s.id===t.config.section)||{}).title||t.config.section) : ui('Весь курс'))}</td><td>${t.taskIds.length}</td><td>${t.score}%</td><td><button class="btn sm ghost" onclick="spExamCsvAt(${i})">${ui('Скачать')}</button></td></tr>`).join('')}</tbody></table></div></div>`
}

function spExamCsvAt(reverseIndex) {
    const tests = (progress.tests || []).slice().reverse();
    const t = tests[reverseIndex];
    if (!t) return;
    const rows = [[ui('Дата'), ui('Тема'), ui('Задание'), ui('Формат'), ui('Результат')]];
    (t.taskIds || []).forEach((id, i) => {
        const task = taskMap[id];
        rows.push([new Date(t.date).toLocaleString(LOCALE_TAG), task ? task.sectionTitle : '', task ? (task.title || task.question) : id, task ? ui(FORMAT[task.type]) : '', (t.marks || [])[i] ? ui('верно') : ui('неверно')])
    });
    rows.push([ui('Итого'), '', '', '', t.score + '%'])
    download(new Blob(['\ufeff' + rows.map(r => r.map(csvCell).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}), ui('СтатПрактикум — контрольная.csv'))
}

function spRenderExamBuilder() {
    const s = SECTIONS[0];
    $('main-content').innerHTML = `<div class="page">${pageTop('Контрольная работа')}<p class="eyebrow">${ui('ПРОВЕРКА ЗНАНИЙ')}</p><h1>${ui('Контрольная работа')}</h1><p class="page-description">${ui('Случайные задания по выбранной теме или всему курсу, таймер и автоматический итог. Разборы и подсказки закрыты до сдачи.')}</p><div class="card"><div class="grid2"><div class="field"><label for="exam-section">${ui('Тема')}</label><select id="exam-section"><option value="all">${ui('Весь курс')}</option>${SECTIONS.map(x=>`<option value="${x.id}">${sectionNumber(x)}. ${esc(x.title)}</option>`).join('')}</select></div><div class="row wrap" style="align-items:flex-end;gap:12px"><div class="field"><label for="exam-count">${ui('Заданий')}</label><input id="exam-count" type="number" min="3" max="30" value="10"></div><div class="field"><label for="exam-minutes">${ui('Минут')}</label><input id="exam-minutes" type="number" min="5" max="90" value="20"></div></div></div><label class="assist-check" style="margin-top:14px"><input type="checkbox" id="exam-open" checked><span>${ui('Включать открытые ответы (проверяются автоматически по критериям)')}</span></label><div class="row wrap" style="margin-top:18px"><button class="btn primary" onclick="spExamStartFromForm()">${ui('Начать контрольную')}</button><button class="btn ghost" onclick="go('progress')">${ui('Мой прогресс')}</button></div></div>${spExamHistoryHtml()}${footer()}</div>`;
    math($('main-content'))
}

function spRenderExamRun() {
    if (!spExam) { spRenderExamBuilder(); return }
    const list = spExam.ids.map(id => taskMap[id]).filter(Boolean),
        shown = list;
    $('main-content').innerHTML = `<div class="page exam-page">${pageTop('Контрольная работа')}<div class="card exam-head"><div class="between" style="align-items:flex-start;flex-wrap:wrap;gap:14px"><div><h1 style="margin:0 0 6px">${ui('Контрольная работа')}</h1><p class="small muted" style="margin:0">${ui('Заданий:')} <strong>${shown.length}</strong> · ${ui('открытых ответов:')} <strong>${shown.filter(t=>t.type==='open').length}</strong></p></div><div class="exam-clock-box"><span class="small muted">${ui('Осталось')}</span><strong id="exam-clock">${spExamLeft()}</strong><button class="btn primary" onclick="spExamSubmit(false)">${ui('Сдать работу')}</button></div></div><p class="assist-note">${ui('Разборы, подсказки и проверка по ходу контрольной закрыты: они появятся после сдачи. Ответы сохраняются на этом устройстве.')}</p></div><div class="stack" style="margin-top:18px">${shown.map((t,i)=>taskHtml(t,i+1,'ex')).join('')}</div><div class="card" style="margin-top:18px"><button class="btn primary" onclick="spExamSubmit(false)">${ui('Сдать работу')}</button><span class="small muted" style="margin-left:12px">${ui('После сдачи откроется итог и разбор ошибок.')}</span></div>${footer()}</div>`;
    math($('main-content'));
    clearInterval(spExamTimer);
    spExamTimer = setInterval(spExamTick, 1000)
}

function spRenderExamResult() {
    $('main-content').innerHTML = `<div class="page">${pageTop('Контрольная работа')}<p class="eyebrow">${ui('ИТОГ')}</p><h1>${ui('Итог контрольной')}</h1><p class="page-description">${ui('Результат считается автоматически: задания с автопроверкой и открытые ответы по критериям. Скачайте CSV, чтобы сохранить итог.')}</p>${spExamResultHtml()}<div class="row wrap" style="margin-top:18px"><button class="btn primary" onclick="go('exam','build')">${ui('Новая контрольная')}</button><button class="btn" onclick="go('progress')">${ui('Мой прогресс')}</button></div>${spExamHistoryHtml()}${footer()}</div>`;
    math($('main-content'))
}
