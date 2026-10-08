// Проверка правила показа разборов в jsdom.
// Запуск: node tools/test-solution-gate.mjs [путь к сборке]
// Зависимости: npm ci (jsdom закреплён в package-lock.json).
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');
const jsdomConsole = errors => {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => {
        const message = String(error && (error.detail || error.message || error));
        if (!/Not implemented/.test(message)) errors.push(message);
    });
    return virtualConsole;
};
const disableUnsupportedScroll = window => { window.scrollTo = () => {} };
const initialErrors = [];

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: jsdomConsole(initialErrors),
    beforeParse: disableUnsupportedScroll,
    url: 'https://projectaaj2025-sys.github.io/matstat/',
});
const w = dom.window;
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(1500);

// Объявления const/let верхнего уровня не попадают в window — читаем их через eval.
const ev = expr => w.eval(expr);
const esc = s => ev('esc')(s);

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ok   ${name}`) }
    else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`) }
};

const slotHtml = t => ev('spSolutionHtml')(t, 'q-' + t.id);
// jsdom сериализует булев атрибут как open="" — учитываем оба вида разметки.
const isOpen = h => h.includes('open-solution') && /<details[^>]*\sopen(\s|=|>)/.test(h);
const isLocked = h => h.includes('task-detail locked');

console.log(`Сборка: ${file}`);

// --- 1. Чистый прогресс: разбор закрыт -------------------------------------
const numTask = ev('allTasks.find(t=>t.type==="number"&&t.solution)');
check('числовое задание найдено', !!numTask);
ev(`progress.attempts[${JSON.stringify(numTask.id)}]=0;progress.solved[${JSON.stringify(numTask.id)}]=false`);
let h = slotHtml(numTask);
check('старт: разбор закрыт', isLocked(h), h.slice(0, 140));
check('старт: счётчик 0 / 3', h.includes('<strong>0 / 3</strong>'));
check('старт: обещание про верный ответ', h.includes('верного ответа'));

// --- 2. Одна неверная попытка: всё ещё закрыт ------------------------------
ev(`progress.attempts[${JSON.stringify(numTask.id)}]=1`);
h = slotHtml(numTask);
check('1 попытка: закрыт', isLocked(h));
check('1 попытка: счётчик 1 / 3', h.includes('<strong>1 / 3</strong>'));

// --- 3. Верный ответ: разбор открыт сразу ---------------------------------
ev(`progress.solved[${JSON.stringify(numTask.id)}]=true`);
h = slotHtml(numTask);
check('верный ответ: разбор открыт', isOpen(h), h.slice(0, 140));
check('верный ответ: показан текст решения', h.includes(esc(numTask.solution)));

// --- 4. Верный ответ на первой попытке (без порога) -----------------------
ev(`progress.attempts[${JSON.stringify(numTask.id)}]=1`);
h = slotHtml(numTask);
check('верный ответ при 1 попытке: открыт', isOpen(h));

// --- 5. Порог попыток по-прежнему работает --------------------------------
ev(`progress.solved[${JSON.stringify(numTask.id)}]=false;progress.attempts[${JSON.stringify(numTask.id)}]=3`);
h = slotHtml(numTask);
check('3 попытки без зачёта: открыт', isOpen(h));

// --- 6. Ползунок «показывать решения» -------------------------------------
ev(`progress.attempts[${JSON.stringify(numTask.id)}]=0;progress.settings.showSolutions=false`);
h = slotHtml(numTask);
check('ползунок выключен: закрыт', isLocked(h));
ev('spToggleSolutions(true)');
h = slotHtml(numTask);
check('ползунок включён: открыт', isOpen(h));
ev('spToggleSolutions(false)');

// --- 7. Открытое задание: пример открывается после зачёта -----------------
const openTask = ev('allTasks.find(t=>t.type==="open"&&t.solution)');
check('открытое задание найдено', !!openTask);
ev(`progress.attempts[${JSON.stringify(openTask.id)}]=0;progress.solved[${JSON.stringify(openTask.id)}]=false`);
h = slotHtml(openTask);
check('открытое задание без ответа: закрыт', isLocked(h));
ev(`progress.solved[${JSON.stringify(openTask.id)}]=true`);
h = slotHtml(openTask);
check('открытое задание зачтено: пример открыт', isOpen(h));
check('заголовок «Пример и пояснение»', h.includes('Пример и пояснение'));
ev(`progress.solved[${JSON.stringify(openTask.id)}]=false`);

// --- 8. Проверка ответа через интерфейс карточки --------------------------
const task = ev('allTasks.find(t=>t.type==="single"&&t.solution)');
check('задание с выбором ответа найдено', !!task);
ev(`progress.attempts[${JSON.stringify(task.id)}]=0;progress.solved[${JSON.stringify(task.id)}]=false`);
ev('go')(task.sectionId, 'practice');
await wait(400);
const input = w.document.querySelector(`#card-q-${task.id} [data-answer][value="${task.answer}"]`);
check('вариант ответа отрисован', !!input);
if (input) {
    input.checked = true;
    ev('checkTask')('q-' + task.id);
    const slot = w.document.querySelector(`#solution-q-${task.id}`);
    h = slot ? slot.innerHTML : '';
    check('после верного ответа разбор открыт в карточке', isOpen(h), h.slice(0, 160));
    check('задание зачтено', ev(`!!progress.solved[${JSON.stringify(task.id)}]`));
}

// --- 9. Повторный вход: зачтённое задание показывает разбор сразу --------
ev('go')(task.sectionId, 'practice');
await wait(400);
const slot2 = w.document.querySelector(`#solution-q-${task.id}`);
check('повторный вход: разбор открыт', slot2 && isOpen(slot2.innerHTML));

// --- 10. Переводы новых строк ---------------------------------------------
const phrases = [
    'откроется после верного ответа',
    'Разбор откроется после верного ответа или нескольких попыток:',
    'Подсказка ниже поможет: разбор появится сразу после верного ответа, а если ответ не засчитывается — после порога попыток.',
    'Разборы снова скрыты: они откроются после верного ответа или нескольких попыток.',
];
for (const lang of ['en', 'kk']) {
    ev(`LANG=${JSON.stringify(lang)}`);
    for (const p of phrases) {
        const out = ev('ui')(p);
        check(`${lang}: есть перевод «${p.slice(0, 40)}…»`, out !== p, out);
    }
}
ev('LANG="ru"');
check('русский: строка остаётся русской', ev('ui')('откроется после верного ответа') === 'откроется после верного ответа');

// --- 10б. Переводы данных курса: вопрос, варианты и разбор не сдвигаются ---
// Регресс: в заданиях про дисперсию переводы стояли со сдвигом на одну строку,
// из-за чего верный вариант «см²» отображался как «cm».
const courseCases = [
    {
        id: 'v3_variance_std_12',
        en: {
            question: 'The mean is measured in centimetres. In what units is the variance measured?',
            options: ['cm', 'cm²', 'Without units'],
            answer: 'cm²',
            solution: 'The squared deviations have the square of the source unit.',
        },
        kk: {
            question: 'Орташа сантиметрмен өлшенген. Дисперсия қандай бірліктермен өлшенеді?',
            options: ['см', 'см²', 'Бірліксіз'],
            answer: 'см²',
            solution: 'Ауытқу квадраттары бастапқы бірліктің квадратына ие.',
        },
    },
    {
        id: 'v3_variance_std_13',
        en: { solution: 'The variance is non-negative, a shift does not change it, and σ is not the maximum deviation.' },
        kk: { solution: 'Дисперсия теріс емес, ығысу оны өзгертпейді, σ ауытқудың максимумы емес.' },
    },
];
for (const lang of ['en', 'kk']) {
    ev(`applyContentLanguage(${JSON.stringify(lang)})`);
    for (const c of courseCases) {
        const t = ev(`taskMap[${JSON.stringify(c.id)}]`);
        const want = c[lang];
        if (want.question) check(`${lang}: ${c.id}: вопрос переведён верно`, t.question === want.question, t.question);
        if (want.options) check(`${lang}: ${c.id}: варианты переведены верно`, JSON.stringify(t.options) === JSON.stringify(want.options), JSON.stringify(t.options));
        if (want.answer) check(`${lang}: ${c.id}: верный вариант читается как «${want.answer}»`, t.options[t.answer] === want.answer, String(t.options[t.answer]));
        check(`${lang}: ${c.id}: разбор переведён верно`, t.solution === want.solution, t.solution);
    }
}
ev("applyContentLanguage('ru')");
ev("LANG='en'");
check('en: «Вариационный ряд» — Variation series', ev("ui('Вариационный ряд')") === 'Variation series', ev("ui('Вариационный ряд')"));
check('en: «Дискретные и интервальные вариационные ряды» — variation series', ev("ui('Дискретные и интервальные вариационные ряды')") === 'Discrete and interval variation series', ev("ui('Дискретные и интервальные вариационные ряды')"));
ev("LANG='ru'");


// --- 11. Старые записи проверок (журнал 3.6–3.7) не ломают карточку -----
const openId = JSON.stringify(openTask.id);
for (const weird of ['"Зачтено"', '{}', '{comment:"перенесено из старого журнала"}', 'null']) {
    ev(`progress.reviews[${openId}]=${weird}`);
    ev('go')(openTask.sectionId, 'practice');
    await wait(250);
    const card = w.document.querySelector(`#card-q-${openTask.id}`);
    check(`старая запись проверки ${weird}: карточка открытого задания на месте`, !!card && card.innerHTML.includes('textarea'));
}
ev(`delete progress.reviews[${openId}]`);

// --- 12. Порядок запуска: spBoot() раньше первой отрисовки страницы -----
const bootAt = html.indexOf('spBoot();');
const renderAt = html.lastIndexOf('renderRoute();loadAdditions();');
check('spBoot() вызывается до первого renderRoute()', bootAt > -1 && renderAt > bootAt, `${bootAt} / ${renderAt}`);

// --- 13. Прямой вход по ссылке на тему: страница не остается пустой ------
const topic = ev('allTasks.find(t=>t.type==="open").sectionId');
const bootErrors = [];
const dom2 = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: jsdomConsole(bootErrors),
    beforeParse: disableUnsupportedScroll,
    url: `https://projectaaj2025-sys.github.io/matstat/#${topic}/practice`,
});
await wait(1500);
const main2 = dom2.window.document.getElementById('main-content');
const txt2 = (main2 ? main2.textContent : '').replace(/\s+/g, ' ');
check(`прямой вход в тему «${topic}»: задания отрисованы`, /ЗАДАНИЕ \d/.test(txt2), txt2.slice(0, 120));
check('прямой вход: без исключений при запуске', !bootErrors.length, bootErrors.slice(0, 2).join(' | ').slice(0, 160));
dom2.window.close();

// --- 14. Дымовой проход по всем маршрутам ---------------------------------
const smokeErrors = [];
const dom3 = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: jsdomConsole(smokeErrors),
    beforeParse: disableUnsupportedScroll,
    url: 'https://projectaaj2025-sys.github.io/matstat/',
});
await wait(1500);
const topics = ev('SECTIONS.map(s=>s.id)');
const routes = [['home'], ['materials'], ['teacher'], ['progress'], ['bank'], ['reflection'],
    ['trainer', 'all'], ['exam'], ['search'], ...topics.map(id => [id, 'practice'])];
for (const [id, tab] of routes) {
    dom3.window.eval('go')(id, tab);
    await wait(120);
    const text = (dom3.window.document.getElementById('main-content').textContent || '').replace(/\s+/g, ' ');
    check(`маршрут ${id}${tab ? '/' + tab : ''}: страница отрисована`,
        text.length > 200 && !text.includes('Страница не открылась'), text.slice(0, 90));
}
check('дымовой проход: без исключений', smokeErrors.length === 0, smokeErrors.slice(0, 2).join(' | '));
dom3.window.close();

// --- 15. Все форматы ответа: верный ответ открывает разбор ----------------
const setAnswer = (task, cid) => {
    const card = w.document.getElementById('card-' + cid);
    if (!card) return 'нет карточки';
    const all = sel => [...card.querySelectorAll(sel)];
    if (task.type === 'number' || task.type === 'graph') {
        card.querySelector('[data-answer]').value = String(task.answer); return null;
    }
    if (task.type === 'single') {
        const el = all('[data-answer]').find(x => Number(x.value) === task.answer);
        return el ? (el.checked = true, null) : 'нет варианта ' + task.answer;
    }
    if (task.type === 'multi') {
        all('[data-answer]').forEach(x => { x.checked = task.answer.includes(Number(x.value)) }); return null;
    }
    if (task.type === 'table') {
        const expected = (task.acceptedAnswers || [task.answer])[0];
        all('[data-answer]').forEach((x, i) => { x.value = String(expected[i]) }); return null;
    }
    if (task.type === 'match') {
        all('[data-answer]').forEach((x, i) => { x.value = String(task.answer[i]) }); return null;
    }
    if (task.type === 'order') {
        all('[data-order]').forEach((x, i) => { x.dataset.order = String(task.answer[i]) }); return null;
    }
    if (task.type === 'open') { card.querySelector('[data-answer]').value = task.solution; return null }
    return 'неизвестный тип ' + task.type;
};

for (const type of ev('[...new Set(allTasks.map(t=>t.type))]')) {
    const task = ev(`allTasks.find(t=>t.type===${JSON.stringify(type)}&&t.solution)`);
    ev('Object.assign(progress,EMPTY_PROGRESS(),{attempts:{},solved:{},answers:{},openReplies:{}})');
    ev(type === 'open' ? 'spSetPassThreshold(50)' : 'spSetPassThreshold(100)');
    ev('go')(task.sectionId, 'practice');
    await wait(250);
    const cid = 'q-' + task.id;
    const err = setAnswer(task, cid);
    if (err) { check(`формат ${type}: ответ выставляется`, false, err); continue }
    ev('checkTask')(cid);
    await wait(150);
    check(`формат ${type}: верный ответ зачтён`, ev(`!!progress.solved[${JSON.stringify(task.id)}]`));
    const slot = w.document.getElementById('solution-' + cid);
    check(`формат ${type}: разбор открыт с первой попытки`, !!slot && isOpen(slot.innerHTML),
        slot ? slot.innerHTML.slice(0, 90) : 'нет слота');
}

// --- 16. Контрольная: разборы скрыты до сдачи и открыты в итоге ----------
ev('Object.assign(progress,EMPTY_PROGRESS(),{attempts:{},solved:{},answers:{},openReplies:{},tests:[]})');
ev('spExamStart({section:"all",count:5,minutes:10,open:false})');
await wait(350);
check('контрольная: страница прохождения отрисована', /Сдать работу/.test(w.document.getElementById('main-content').innerHTML));
check('контрольная: разборы скрыты до сдачи', !w.document.querySelector('[data-solution-for]'));
const examIds = ev('spExam.ids');
for (const id of examIds) {
    const err = setAnswer(ev(`taskMap[${JSON.stringify(id)}]`), 'ex-' + id);
    if (err) check(`контрольная: задание ${id}`, false, err);
    ev('spExamAnswer')('ex-' + id);
}
ev('spExamSubmit(true)');
await wait(450);
check('контрольная: итог сохранён в историю', ev('(progress.tests||[]).length') > 0);
const examTable = w.document.querySelector('.exam-result table');
check('контрольная: колонка «Разбор задания» в итоге', !!examTable && /Разбор задания/.test(examTable.textContent));
check('контрольная: разбор под каждым заданием',
    !!examTable && examTable.querySelectorAll('details.task-detail').length === examIds.length,
    examTable ? String(examTable.querySelectorAll('details.task-detail').length) : 'нет таблицы');
const examDetails = examTable ? [...examTable.querySelectorAll('details.task-detail')] : [];
const examSolutions = examIds.map(id => String(ev(`taskMap[${JSON.stringify(id)}].solution`) || '').trim());
// Формулы в тексте решения KaTeX превращает в разметку, поэтому дословно совпадают не все.
const examExact = examDetails.filter((d, i) => {
    const body = d.querySelector('p');
    return !!body && body.textContent.trim() === examSolutions[i];
}).length;
check('контрольная: в разборе текст решения задания',
    examDetails.length > 0 && examDetails.every(d => d.textContent.trim().length > 0)
    && examExact >= Math.ceil(examDetails.length / 2),
    `дословно ${examExact} из ${examDetails.length}, остальные с формулами`);
ev('spExam=null');

// --- 17. Сброс прогресса возвращает замок --------------------------------
const firstTask = ev('allTasks[0]');
ev(`progress.solved[${JSON.stringify(firstTask.id)}]=true`);
ev('go')(firstTask.sectionId, 'practice');
await wait(250);
const solvedSlot = w.document.getElementById('solution-q-' + firstTask.id);
check('сброс: зачтённое задание показывало разбор', !!solvedSlot && isOpen(solvedSlot.innerHTML));
ev('Object.assign(progress,EMPTY_PROGRESS());persist();renderRoute()');
await wait(250);
const freshSlot = w.document.getElementById('solution-q-' + firstTask.id);
check('сброс: после очистки прогресса разбор закрыт', !!freshSlot && isLocked(freshSlot.innerHTML),
    freshSlot ? freshSlot.innerHTML.slice(0, 80) : 'нет слота');
check('основной DOM: без исключений', !initialErrors.length, initialErrors.slice(0, 2).join(' | '));

console.log(`\nИтог с регрессиями: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
