// Проверка правила показа разборов в jsdom.
// Запуск: node tools/test-solution-gate.mjs [путь к сборке]
// (нужен jsdom: npm i jsdom, рядом должна быть папка node_modules)
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
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
let bootError = null;
const vc = new VirtualConsole();
vc.on('jsdomError', err => {
    const msg = String(err && (err.detail || err.message || err));
    // jsdom не реализует часть браузерных API (scrollTo и подобные) — это не ошибка сборки.
    if (/Not implemented/.test(msg)) return;
    bootError = msg;
});
const dom2 = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    url: `https://projectaaj2025-sys.github.io/matstat/#${topic}/practice`,
});
await wait(1500);
const main2 = dom2.window.document.getElementById('main-content');
const txt2 = (main2 ? main2.textContent : '').replace(/\s+/g, ' ');
check(`прямой вход в тему «${topic}»: задания отрисованы`, /ЗАДАНИЕ \d/.test(txt2), txt2.slice(0, 120));
check('прямой вход: без исключений при запуске', !bootError, String(bootError).slice(0, 160));
dom2.window.close();

// --- 14. Дымовой проход по всем маршрутам ---------------------------------
const smokeErrors = [];
const vcs = new VirtualConsole();
vcs.on('jsdomError', err => {
    const msg = String(err && (err.detail || err.message || err));
    if (!/Not implemented/.test(msg)) smokeErrors.push(msg);
});
const dom3 = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vcs,
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

console.log(`\nИтог с регрессиями: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
