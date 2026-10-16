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

/* Детерминированный генератор для проверок пересчёта: иначе результат зависит
   от удачи конкретного розыгрыша, а в jsdom Math.random между eval замирает. */
let rndState = 20261015;
const seededRandom = () => {
    rndState = (rndState * 1103515245 + 12345) % 2147483648;
    return rndState / 2147483648
};
w.__rndTest = seededRandom;

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

// Dynamic roulette output combines labels with changing amounts, so translate each label
// before interpolating the values instead of relying on a whole-string dictionary lookup.
const rouletteOutcome = w.document.createElement('div');
rouletteOutcome.id = 'roulette-outcome';
w.document.body.append(rouletteOutcome);
for (const [lang, expected] of [
    ['en', { color: 'Black', score: 'Player: -100 · House: 100' }],
    ['kk', { color: 'Қара', score: 'Ойыншы: -100 · Ұйымдастырушы: 100' }],
]) {
    ev(`LANG=${JSON.stringify(lang)}`);
    ev('rouletteShowLast({number:2,color:"black",result:-100})');
    check(`${lang}: рулетка — перевод цвета`, rouletteOutcome.querySelector('strong')?.textContent === expected.color, rouletteOutcome.textContent);
    check(`${lang}: рулетка — игрок и организатор переведены`, rouletteOutcome.querySelector('small')?.textContent === expected.score, rouletteOutcome.textContent);
}
rouletteOutcome.remove();
ev('LANG="ru"');

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
    // Подсказка переведена, если для её русского текста в этом языке есть перевод.
    // Казахский тоже пишется кириллицей, поэтому для kk проверяем сам перевод, а не алфавит.
    const untranslatedHints = ev(`(() => {
        const ok = h => typeof CONTENT[h] === 'string' && CONTENT[h] !== '' && CONTENT[h] !== h;
        const tasks = [...COURSE_BASE.sections.flatMap(s => s.tasks || []), ...(COURSE_BASE.bankProblems || []).flatMap(p => p.tasks || [])];
        return tasks.filter(t => /[\\u0400-\\u04FF]/.test(t.hint || '') && !ok(t.hint)).map(t => t.id);
    })()`);
    check(`${lang}: все подсказки к заданиям переведены`, untranslatedHints.length === 0, untranslatedHints.slice(0, 5).join(', '));
    if (lang === 'en') {
        const cyrillicHints = ev('allTasks.filter(t => /[\\u0400-\\u04FF]/.test(t.hint || "")).map(t => t.id)');
        check('en: в английских подсказках нет кириллицы', cyrillicHints.length === 0, cyrillicHints.slice(0, 5).join(', '));
    }
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

// --- 18. ИИ-наставник: страница и сгенерированная задача переведены ------
// Регресс: подпись «Сгенерированная задача», счётчик «Решено … из …» и
// заголовки раздела оставались на русском при любом языке интерфейса.
const aiMain = () => w.document.getElementById('main-content');
const aiMainText = () => aiMain().textContent.replace(/\s+/g, ' ');
for (const lang of ['en', 'kk']) {
    ev(`setLanguage(${JSON.stringify(lang)})`);
    await wait(350);
    ev("go('ai')");
    await wait(350);
    const main = aiMain();
    const title = main.querySelector('h1')?.textContent.trim() || '';
    const recText = main.querySelector('.ai-rec-list .small.muted')?.textContent.trim() || '';
    const genTitle = main.querySelector('#ai-gen-result strong')?.textContent.trim() || '';
    const genQuestion = main.querySelector('#ai-gen-result p')?.textContent.trim() || '';
    const navLabel = [...w.document.querySelectorAll('#course-nav .nav-label')]
        .some(el => el.textContent.trim() === (lang === 'en' ? 'AI mentor' : 'ЖИ-тәлімгер'));
    if (lang === 'en') {
        check('en: заголовок страницы переведён', title === 'AI mentor for statistics', title);
        check('en: подзаголовок переведён', /INTELLIGENT HELPER/.test(aiMainText()), aiMainText().slice(0, 120));
        check('en: пункт меню переведён', navLabel);
        check('en: счётчик рекомендаций переведён', /^Solved \d+ of \d+\./.test(recText), recText);
        check('en: сгенерированная задача переведена', genTitle.startsWith('Generated task · '), genTitle);
        check('en: условие сгенерированной задачи переведено',
            genQuestion.length > 0 && !/[\u0400-\u04FF]/.test(genQuestion), genQuestion.slice(0, 120));
        check('en: на странице ИИ не осталось кириллицы', !/[\u0400-\u04FF]/.test(aiMainText()),
            (aiMainText().match(/[\u0400-\u04FF][^ ]*/g) || []).slice(0, 4).join(' '));
    } else {
        check('kk: заголовок страницы переведён', title === 'Статистика бойынша ЖИ-тәлімгер', title);
        check('kk: пункт меню переведён', navLabel);
        check('kk: счётчик рекомендаций переведён', /^\d+ ішінен \d+ шешіліп/.test(recText), recText);
        check('kk: сгенерированная задача переведена', genTitle.startsWith('Генерацияланған тапсырма · '), genTitle);
        check('kk: на странице ИИ не осталось русских фраз',
            !/Решено|Сгенерированная|ИИ-наставник|Повторите/.test(aiMainText()),
            (aiMainText().match(/Решено[^.]*|Сгенерированная[^·]*|ИИ-наставник[^ ]*/g) || []).slice(0, 3).join(' '));
    }
}
// Счётчик рекомендаций показывает реальный прогресс по теме.
ev("setLanguage('en')");
await wait(250);
const counted = ev('SECTIONS[0].tasks[0].id');
// Остальные темы закрыты, поэтому первая тема попадает в список рекомендаций.
ev('allTasks.filter(t=>t.sectionId!=="intro-stats").forEach(t=>{progress.solved[t.id]=true})');
ev(`progress.solved[${JSON.stringify(counted)}]=true`);
const recs = ev('aiRecommendations()');
const countedRec = recs.find(r => r.title === ev('SECTIONS[0].title'));
check('счётчик рекомендаций учитывает решённые задания',
    !!countedRec && /Solved 1 of 21\./.test(countedRec.text), countedRec ? countedRec.text : 'нет рекомендации');
ev('Object.assign(progress,EMPTY_PROGRESS());persist()');

// Внешняя модель получает задание на языке интерфейса.
let captured = null;
w.fetch = async (url, options) => {
    captured = JSON.parse(options.body);
    return {
        ok: true, status: 200,
        json: async () => ({choices: [{message: {content: JSON.stringify({question: 'Sample question', answer: 'Sample answer'})}}]}),
    };
};
ev("progress.settings.aiEnabled=true;progress.settings.aiApiKey='test-key'");
for (const [lang, marker, topicLabel] of [['en', /must be in English/, 'Topic: '], ['kk', /қазақ тілінде/, 'Тақырып: ']]) {
    ev(`setLanguage(${JSON.stringify(lang)})`);
    await wait(300);
    captured = null;
    await ev('aiGenerate()');
    await wait(200);
    check(`${lang}: внешняя модель получила инструкцию на языке интерфейса`,
        !!captured && marker.test(captured.messages[0].content), captured ? captured.messages[0].content.slice(0, 90) : 'запрос не отправлен');
    check(`${lang}: тема задачи передана на языке интерфейса`,
        !!captured && captured.messages[1].content.startsWith(topicLabel),
        captured ? captured.messages[1].content.slice(0, 90) : 'запрос не отправлен');
    const genQuestion = aiMain().querySelector('#ai-gen-result p')?.textContent.trim() || '';
    check(`${lang}: сгенерированная моделью задача показана`, genQuestion === 'Sample question', genQuestion);
}
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey=''");
ev("setLanguage('ru')");
await wait(250);
ev("go('ai')");
await wait(300);
check('ru: страница ИИ остаётся на русском',
    (aiMain().querySelector('h1')?.textContent.trim() || '') === 'ИИ-наставник по статистике',
    aiMain().querySelector('h1')?.textContent.trim() || '');

// --- 19. ИИ-помощник: провайдеры, где взять ключ и разметка ответа -------
// Регресс: сгенерированные задачи показывались обрезанными, таблицы данных и
// таблицы из ответа модели не отрисовывались, а подключить DeepSeek было негде.
ev("Object.assign(progress,EMPTY_PROGRESS());persist()");
ev("progress.settings.aiProvider='deepseek';progress.settings.aiBaseUrl='https://api.deepseek.com';progress.settings.aiEnabled=false;progress.settings.aiApiKey=''");
ev("setLanguage('ru')");
await wait(250);
ev("go('ai')");
await wait(400);
const aiPage = aiMain();
check('провайдер по умолчанию — DeepSeek', ev("aiSettings().aiProvider") === 'deepseek' && ev("aiSettings().aiBaseUrl") === 'https://api.deepseek.com',
    ev("aiSettings().aiProvider") + ' / ' + ev("aiSettings().aiBaseUrl"));
const providerOptions = ev("[...document.querySelectorAll('#ai-provider option')].map(o=>o.value)");
check('в списке есть DeepSeek, локальные модели и свой адрес',
    ['deepseek', 'openrouter', 'ollama', 'lmstudio', 'custom'].every(id => providerOptions.includes(id)),
    providerOptions.join(','));
const deepseekGuide = ev("document.getElementById('ai-provider-help').innerHTML");
check('подсказка ведёт на страницу ключей DeepSeek', /platform\.deepseek\.com\/api_keys/.test(deepseekGuide));
check('шаги получения ключа расписаны подробно',
    ev("document.querySelectorAll('#ai-provider-help .ai-instructions li').length") >= 5,
    String(ev("document.querySelectorAll('#ai-provider-help .ai-instructions li').length")));
check('в подсказке есть ссылка на цены и лимиты', /api-docs\.deepseek\.com/.test(deepseekGuide));
check('на странице есть таблица частых ошибок с 402',
    /402/.test(ev("document.querySelector('#ai-provider-help').closest('.card').parentElement.textContent")));
ev("document.getElementById('ai-provider').value='openrouter';aiProviderChanged()");
check('смена провайдера подставляет базовый адрес OpenRouter',
    ev("document.getElementById('ai-base').value") === 'https://openrouter.ai/api/v1'
    && /openrouter\.ai\/keys/.test(ev("document.getElementById('ai-provider-help').innerHTML")),
    ev("document.getElementById('ai-base').value"));
ev("document.getElementById('ai-provider').value='ollama';aiProviderChanged()");
check('локальная модель подставляет localhost и не требует ключа',
    ev("document.getElementById('ai-base').value") === 'http://localhost:11434/v1'
    && ev("document.getElementById('ai-model').value") === 'llama3.1',
    ev("document.getElementById('ai-base').value"));

// Таблицы из ответа модели: markdown превращается в настоящую таблицу курса.
const richAnswer = ev("aiRichHtml('Итог:\\n\\n| x | P |\\n| --- | --- |\\n| 1 | 0,2 |\\n| 2 | 0,8 |\\n\\n- шаг 1\\n- шаг 2')");
check('таблица из ответа модели отрисована', /<div class="table-scroll"><table class="data-table">/.test(richAnswer)
    && (richAnswer.match(/<tr>/g) || []).length === 3, richAnswer.slice(0, 140));
check('строки таблицы не потеряли данные', richAnswer.includes('0,2') && richAnswer.includes('0,8'));
check('список из ответа модели отрисован', /<ul class="ai-list">/.test(richAnswer));
check('формулы остаются для KaTeX', ev("aiRichHtml('$D(X)=M(X^2)-(M(X))^2$')").includes('$D(X)'));

// --- 20. Карточка сгенерированной задачи собирается целиком ---------------
const dataTask = ev("allTasks.find(t=>(t.inputTables||[]).length&&t.solution&&t.answer!==undefined)");
check('задание с таблицей данных найдено', !!dataTask, dataTask ? dataTask.id : 'нет');
const dataCard = ev(`aiTaskCardHtml(taskMap[${JSON.stringify(dataTask.id)}],{key:'probe'})`);
check('карточка задачи показывает таблицу данных с подписью',
    /<table class="data-table">/.test(dataCard) && /<caption>/.test(dataCard) && dataCard.includes('<tbody>'),
    dataCard.slice(0, 120));
check('в карточке есть поле ответа и разбор', dataCard.includes('ai-in-probe') && dataCard.includes('open-solution'));
const dataSection = dataTask.sectionId;
ev(`document.getElementById('ai-gen-topic').value=${JSON.stringify(dataSection)}`);
await ev('aiGenerate()');
await wait(250);
const generatedCard = ev("document.getElementById('ai-gen-result').innerHTML");
check('сгенерированная задача отрисована карточкой', /class="card ai-task-card"/.test(generatedCard), generatedCard.slice(0, 100));
check('сгенерированная задача не обрезана: есть условие, ответ и разбор',
    /ai-question/.test(generatedCard) && /ai-in-preview/.test(generatedCard) && /open-solution/.test(generatedCard));
const generatedHasData = ev("!!(aiStudioTasks['preview'].inputTables||[]).length || !!aiStudioTasks['preview'].chart");
check('данные сгенерированной задачи показаны, а не потеряны',
    !generatedHasData || /<table|chart-wrap/.test(generatedCard),
    generatedHasData ? generatedCard.slice(0, 120) : 'задача без данных');
check('сгенерированная задача сохраняется в «Мои задачи»', ev("progress.settings.aiTasks.length") >= 1,
    String(ev("progress.settings.aiTasks.length")));
check('«Мои задачи» перерисованы карточками', ev("document.querySelectorAll('#ai-task-list .ai-task-card').length") >= 1);

// Локальная проверка ответа в сгенерированной задаче.
const storedKey = ev("progress.settings.aiTasks[0].id");
const storedAnswer = ev(`(aiStudioTasks[${JSON.stringify(storedKey)}]||{}).answer`);
ev("document.getElementById('ai-in-" + storedKey + "').value=''");
ev(`aiStudioCheck(${JSON.stringify(storedKey)})`);
check('пустой ответ не проверяется', /Введите ответ/.test(ev(`document.getElementById('ai-fb-${storedKey}').textContent`)),
    ev(`document.getElementById('ai-fb-${storedKey}').textContent`).slice(0, 60));
if (storedAnswer !== undefined && storedAnswer !== null && String(storedAnswer).trim() !== '') {
    ev(`document.getElementById('ai-in-${storedKey}').value=${JSON.stringify(String(storedAnswer))}`);
    ev(`aiStudioCheck(${JSON.stringify(storedKey)})`);
    check('верный ответ подтверждается локально',
        /Верно/.test(ev(`document.getElementById('ai-fb-${storedKey}').textContent`)),
        ev(`document.getElementById('ai-fb-${storedKey}').textContent`).slice(0, 80));
}

// --- 21. Кнопки ИИ в карточках заданий и панель помощника -----------------
ev("go('variance-std','practice')");
await wait(400);
const bars = w.document.querySelectorAll('#task-list .ai-task-bar');
check('в карточках заданий есть кнопки ИИ', bars.length > 0, String(bars.length));
check('кнопок три: разбор, проверка и похожая задача',
    bars.length > 0 && bars[0].querySelectorAll('button').length === 3,
    bars.length ? String(bars[0].querySelectorAll('button').length) : 'нет панели');
check('панель помощника висит на странице', !!w.document.getElementById('ai-fab'));
const hintTaskId = ev("SECTIONS.find(s=>s.id==='variance-std').tasks[0].id");
ev(`spAiExplainTask(${JSON.stringify(hintTaskId)})`);
await wait(300);
check('панель открылась и знает задание',
    !w.document.getElementById('ai-drawer').classList.contains('hidden')
    && /Задание:/.test(w.document.getElementById('ai-drawer-context').textContent),
    w.document.getElementById('ai-drawer-context').textContent.slice(0, 60));
const drawerText = w.document.getElementById('ai-drawer-log').textContent.replace(/\s+/g, ' ');
check('без ключа разбор идёт по подсказке курса', /Порядок разбора|Подсказка курса/.test(drawerText), drawerText.slice(-120));
check('вопрос остался в истории диалога', ev("progress.settings.aiChat.length") >= 2,
    String(ev("progress.settings.aiChat.length")));
let chipError = '';
try { ev(`aiTaskMode(${JSON.stringify(hintTaskId)},'explain')`) } catch (error) { chipError = String(error && error.message || error) }
await wait(250);
check('кнопки панели помощника отвечают без ошибок', !chipError, chipError);
// «Похожая задача» без ключа — карточка из задания курса, а не пустой ответ.
const storedBefore = ev("progress.settings.aiTasks.length");
ev("spAiGenerateSimilar({section: SECTIONS[1]})");
await wait(400);
check('«Похожая задача» без ключа собирает карточку',
    /ai-task-card/.test(ev("document.getElementById('ai-drawer-log').innerHTML")));
check('похожая задача попала в «Мои задачи»',
    ev("progress.settings.aiTasks.length") === storedBefore + 1,
    ev("progress.settings.aiTasks.length") + ' / ' + storedBefore);
// Вопрос о теме: локальный ответ берёт теорию именно этой темы.
ev("progress.settings.aiChat=[];persist()");
ev("spAiAskTopic('variance-std')");
await wait(400);
check('вопрос о теме отвечает теорией этой темы',
    /ai-hit/.test(ev("document.getElementById('ai-drawer-log').innerHTML")));
ev('aiDrawerClose()');
ev("go('variance-std','theory')");
await wait(350);
check('в теории есть кнопка «Объясни тему»', /spAiAskTopic\('variance-std'\)/.test(aiMain().innerHTML));

// --- 22. Контрольная: помощник не подсказывает ---------------------------
ev("spExamStart({section:'all',count:3,minutes:10,includeOpen:false})");
await wait(300);
ev("go('exam','run')");
await wait(300);
check('во время контрольной кнопки ИИ в карточках скрыты',
    w.document.querySelectorAll('#main-content .ai-task-bar').length === 0);
ev('aiDrawerOpen(null)');
check('панель помощника во время контрольной не открывается',
    w.document.getElementById('ai-drawer').classList.contains('hidden'));
ev("spExamSubmit(true)");
await wait(300);

// --- 23. Проверка подключения и понятные ошибки --------------------------
w.fetch = async (url, options) => ({
    ok: true, status: 200,
    json: async () => ({data: [{id: 'deepseek-flash'}, {id: 'deepseek-v4-pro'}]}),
});
ev("progress.settings.aiEnabled=true;progress.settings.aiApiKey='test-key'");
const connection = await ev('aiTestConnection()');
check('проверка подключения видит список моделей',
    !!connection && connection.ok === true && (connection.models || []).length === 2,
    JSON.stringify(connection).slice(0, 90));
ev("go('ai')");
await wait(400);
check('загруженный список моделей остаётся в подсказке поля «Модель»',
    ev("document.querySelectorAll('#ai-model-list option').length") >= 2,
    String(ev("document.querySelectorAll('#ai-model-list option').length")));
w.fetch = async () => ({ok: false, status: 402, text: async () => '{"error":{"message":"Insufficient Balance"}}'});
const failed = await ev('aiTestConnection()');
check('ошибка 402 объясняется словами про баланс',
    !!failed && failed.ok === false && /баланс/.test(failed.reason), failed ? failed.reason.slice(0, 90) : 'нет ответа');
w.fetch = async () => ({ok: false, status: 401, text: async () => '{"error":{"message":"Authentication Fails"}}'});
const denied = await ev('aiTestConnection()');
check('ошибка 401 объясняется словами про ключ',
    !!denied && denied.ok === false && /ключ/i.test(denied.reason), denied ? denied.reason.slice(0, 90) : 'нет ответа');
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey='';progress.settings.aiChat=[];progress.settings.aiTasks=[];persist()");
ev("setLanguage('ru')");
await wait(250);

// --- 24. Локальный генератор меняет числа в задачах курса ----------------
// Регресс: без ключа генератор просто копировал задание курса, поэтому
// «новая» задача совпадала с исходной и её ответ можно было подсмотреть.
const poolOf = () => ev(`(() => {
    const out = [];
    for (const s of SECTIONS) for (const t of (s.tasks || [])) {
        if (t && t.solution && ['number','graph','table','single'].includes(t.type) && !t.context) out.push({id: t.id, sectionId: s.id});
    }
    return out;
})()`);
const variantOf = item => ev(`aiTaskNumberVariant(
    (SECTIONS.find(s => s.id === ${JSON.stringify(item.sectionId)}) || {tasks: []}).tasks.find(t => t.id === ${JSON.stringify(item.id)}) || taskMap[${JSON.stringify(item.id)}],
    {sectionId: ${JSON.stringify(item.sectionId)}, random: window.__rndTest})`);

check('переключатель новых чисел включён по умолчанию', ev('aiNumberSwapEnabled()') === true);
ev("go('ai')");
await wait(350);
const swapBox = w.document.getElementById('ai-swap-numbers');
check('в генераторе есть флажок «менять числа»', !!swapBox);
check('флажок соответствует настройке', !!swapBox && swapBox.checked === ev('aiSettings().aiSwapNumbers'));
check('подсказка генератора объясняет пересчёт чисел',
    /считаются заново/.test(w.document.getElementById('main-content').textContent)
    && /вариантов/.test(w.document.getElementById('main-content').textContent));
check('в генераторе сказано, что числа подбираются заново',
    /пересчитывает их с другими числами/.test(w.document.getElementById('main-content').textContent));
ev('aiToggleNumberSwap(false)');
check('выключение флажка сохраняется в настройках', ev('aiSettings().aiSwapNumbers') === false && ev('aiNumberSwapEnabled()') === false);
const plainWhenOff = ev("aiGenerateTask('intro-stats', {})");
check('выключенный пересчёт не создаёт вариант',
    !!plainWhenOff && !plainWhenOff.numbersChanged && !/^ainum-/.test(plainWhenOff.id),
    JSON.stringify(plainWhenOff && plainWhenOff.id));
ev('aiToggleNumberSwap(true)');
check('включение флажка возвращает пересчёт', ev('aiNumberSwapEnabled()') === true);

let mutated = 0, inconsistent = [];
const themeHits = new Set();
for (const item of poolOf()) {
    let variant = null;
    for (let attempt = 0; attempt < 6 && !variant; attempt++) variant = variantOf(item);
    if (!variant) continue;
    mutated++;
    themeHits.add(item.sectionId);
    const base = ev(`taskMap[${JSON.stringify(item.id)}]`);
    const problems = [];
    if (!variant.numbersChanged || !variant.numbersPreview) problems.push('нет пометки о новых числах');
    const sameQuestion = variant.question === base.question;
    const sameTables = JSON.stringify(variant.inputTables || null) === JSON.stringify(base.inputTables || null);
    const sameChart = JSON.stringify(variant.chart || null) === JSON.stringify(base.chart || null);
    if (sameQuestion && sameTables && sameChart) problems.push('условие, таблицы и график не изменились');
    if (variant.id === base.id) problems.push('id не изменился');
    if (ev(`aiNumSame(${JSON.stringify(variant.answer)}, ${JSON.stringify(base.answer)})`)) problems.push('ответ не изменился');
    // Ответ должен быть согласован с числами нового условия: тот же пересчёт
    // повторяется на новых числах и даёт опубликованный ответ.
    const answerNumbers = (Array.isArray(variant.answer) ? variant.answer : [variant.answer]).map(Number);
    const solutionNumbers = (String(variant.solution).match(/[−-]?\d+(?:[.,]\d+)?/g) || [])
        .map(text => Number(text.replace('−', '-').replace(',', '.')));
    if (!answerNumbers.every(value => solutionNumbers.some(other => Math.abs(other - value) <= 1e-4 * Math.max(1, Math.abs(value))))) {
        problems.push('ответ не сходится с разбором')
    }
    if (problems.length) inconsistent.push(item.id + ' (' + problems.join('; ') + ')');
}
check('пересчёт охватывает большую часть числовых заданий', mutated >= 150, `пересчитано ${mutated}`);
check('пересчёт покрывает почти все темы курса', themeHits.size >= 16, `тем: ${themeHits.size}`);
check('пересчитанные задачи согласованы', inconsistent.length === 0, inconsistent.slice(0, 4).join(' | '));
// Задание без чисел (выбор ответа по теории) пересчитать нельзя: вариант не создаётся.
const choiceTask = ev("SECTIONS.find(s => s.id === 'intro-stats').tasks.filter(t => t.id === 'intro_choice')");
check('генератор не берёт задание, для которого нет пересчёта', variantOf({id: 'intro_choice', sectionId: 'intro-stats'}) === null);
check('такое задание всё равно годится как задание курса', choiceTask.length === 1);

// Пересчёт отвечает на числа задания: размах, частота, биномиальное и
// геометрическое распределение считаются заново.
const cases = [
    {id: 't1_1', sectionId: 'intro-stats', expect: 'range'},
    {id: 'v3_frequency_01', sectionId: 'frequency', expect: 'share'},
    {id: 'v3_binomial_distribution_04', sectionId: 'binomial-distribution', expect: 'probability'},
    {id: 'v3_geometric_distribution_02', sectionId: 'geometric-distribution', expect: 'expectation'},
    {id: 'v3_variance_std_04', sectionId: 'variance-std', expect: 'sd'},
    {id: 'v3_continuous_rv_01', sectionId: 'continuous-rv', expect: 'density'},
];
let caseFails = [];
for (const item of cases) {
    let variant = null;
    for (let attempt = 0; attempt < 8 && !variant; attempt++) variant = variantOf(item);
    if (!variant) { caseFails.push(item.id + ': нет варианта'); continue }
    if (!/^ainum-/.test(variant.id) || variant.origin !== item.id) caseFails.push(item.id + ': нет связи с заданием курса');
    if (!variant.solution || !String(variant.solution).length) caseFails.push(item.id + ': пустой разбор');
}
check('пересчёт работает в разных темах', caseFails.length === 0, caseFails.slice(0, 3).join(' | '));

// Карточка пересчитанной задачи: пометка, «было → стало» и верный ответ.
let variety = null;
for (let attempt = 0; attempt < 8 && !variety; attempt++) variety = variantOf({id: 't1_1', sectionId: 'intro-stats'});
check('вариант задания с новыми числами собирается', !!variety);
const varietyCard = variety ? ev(`aiTaskCardHtml(${JSON.stringify(variety)}, {key: 'swap-probe'})`) : '';
check('в карточке есть пометка «новые числа»', /новые числа/.test(varietyCard));
check('в карточке видно «было → стало»', varietyCard.includes('→') && /Новые числа/.test(varietyCard));
check('карточка пересчитанной задачи содержит условие, ответ и разбор',
    /ai-question/.test(varietyCard) && /ai-in-swap-probe/.test(varietyCard) && /open-solution/.test(varietyCard));
ev(`aiToggleNumberSwap(true); go('ai')`);
await wait(400);
ev("document.getElementById('ai-gen-topic').value='variance-std'");
await ev('aiGenerate()');
await wait(300);
check('под генератором видно, сколько заданий пересчитано',
    /Числа пересчитаны: 1 из 1/.test(ev("(document.getElementById('ai-gen-summary') || {}).textContent || ''")),
    ev("(document.getElementById('ai-gen-summary') || {}).textContent || ''").slice(0, 80));
const swapped = ev("progress.settings.aiTasks[0]");
const swappedTask = ev(`aiStudioTasks[${JSON.stringify(swapped.id)}]`);
check('генератор сохранил задачу с новыми числами', !!swapped && !!swapped.task && swapped.task.numbersChanged === true,
    JSON.stringify(swapped).slice(0, 120));
check('в «Моих задачах» видны новые числа, а не задание курса',
    !!swappedTask && swappedTask.numbersChanged === true && ev(`aiStoredCardHtml(progress.settings.aiTasks[0])`).includes('→'));
// Условие может остаться прежним, а числа лежать в таблице — тогда
// меняется таблица данных, поэтому сверяем и текст, и данные.
check('сохранённая задача отличается от задания курса',
    ev(`(() => {
        const base = taskMap[${JSON.stringify(String(swapped.task.origin))}];
        if (!base) return true;
        const sameText = base.question === ${JSON.stringify(String(swapped.task.question))};
        const sameTables = JSON.stringify(base.inputTables || null) === ${JSON.stringify(JSON.stringify(swapped.task.inputTables || null))};
        const sameChart = JSON.stringify(base.chart || null) === ${JSON.stringify(JSON.stringify(swapped.task.chart || null))};
        return !(sameText && sameTables && sameChart)
    })()`));
// Локальная проверка ответа: подставленный ответ пересчитанной задачи верен.
ev(`document.getElementById('ai-in-${swapped.id}') && (document.getElementById('ai-in-${swapped.id}').value = ${JSON.stringify(String(swappedTask.answer))})`);
ev(`aiStudioCheck(${JSON.stringify(swapped.id)})`);
check('ответ пересчитанной задачи проверяется локально',
    /Верно/.test(ev(`(document.getElementById('ai-fb-${swapped.id}') || {}).textContent || ''`)),
    ev(`(document.getElementById('ai-fb-${swapped.id}') || {}).textContent || ''`).slice(0, 80));

// Перезагрузка страницы: пересчитанная задача лежит в прогрессе целиком,
// поэтому новые числа, ответ и разбор остаются на месте.
ev('persist()');
const savedProgress = ev("localStorage.getItem('statpracticum-v2-progress')");
const reloadedDom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: jsdomConsole(initialErrors),
    beforeParse: win => {
        disableUnsupportedScroll(win);
        win.localStorage.setItem('statpracticum-v2-progress', savedProgress)
    },
    url: 'https://projectaaj2025-sys.github.io/matstat/',
});
await wait(1800);
const rv = expr => reloadedDom.window.eval(expr);
const reloaded = rv("progress.settings.aiTasks[0]");
check('после перезагрузки пересчитанная задача на месте',
    !!reloaded && !!reloaded.task && reloaded.task.numbersChanged === true && !reloaded.refId,
    JSON.stringify(reloaded).slice(0, 120));
check('после перезагрузки сохранены те же числа и ответ',
    !!reloaded && reloaded.task.question === String(swapped.task.question) && String(reloaded.task.answer) === String(swappedTask.answer));
rv("go('ai')");
await wait(400);
const reloadKey = rv("progress.settings.aiTasks[0].id");
const reloadedCard = rv(`aiStoredCardHtml(progress.settings.aiTasks[0])`);
check('после перезагрузки карточка помнит новые числа',
    /новые числа/.test(reloadedCard) && reloadedCard.includes('→'));
rv(`document.getElementById('ai-in-${reloadKey}') && (document.getElementById('ai-in-${reloadKey}').value = ${JSON.stringify(String(swappedTask.answer))})`);
rv(`aiStudioCheck(${JSON.stringify(reloadKey)})`);
check('после перезагрузки ответ по-прежнему проверяется локально',
    /Верно/.test(rv(`(document.getElementById('ai-fb-${reloadKey}') || {}).textContent || ''`)),
    rv(`(document.getElementById('ai-fb-${reloadKey}') || {}).textContent || ''`).slice(0, 80));
reloadedDom.window.close();

// Пока решения скрыты (режим ученика), эталонный ответ в карточке не виден,
// а пересчёт и пометка «новые числа» остаются. Учитель включает решения —
// эталонный ответ возвращается.
ev('progress.settings.showSolutions = false');
check('решения скрыты: эталонный ответ не показан',
    !varietyCard.includes(ev("ait('ai.check.reference')")) && varietyCard.includes(ev("ait('ai.check.referenceHidden')")),
    varietyCard.slice(0, 160));
check('решения скрыты: пометка о новых числах осталась',
    /новые числа/.test(varietyCard) && /→/.test(varietyCard));
check('решения скрыты: пересчёт продолжает работать', variantOf({id: 't1_1', sectionId: 'intro-stats'}) !== null);
ev('progress.settings.showSolutions = true');
const teacherCard = ev(`aiTaskCardHtml(${JSON.stringify(variety)}, {key: 'swap-teacher'})`);
check('решения показаны: эталонный ответ вернулся',
    teacherCard.includes(ev("ait('ai.check.reference')")) && !teacherCard.includes(ev("ait('ai.check.referenceHidden')")));
ev('progress.settings.showSolutions = false');

// Табличный закон распределения: меняются вероятности в таблице, а ответ
// считается заново по той же формулировке задания.
for (const law of [{id: 't5_1', sectionId: 'distribution-law'}, {id: 'law_graph', sectionId: 'distribution-law'},
    {id: 'v3_distribution_law_04', sectionId: 'distribution-law'}, {id: 'v3_distribution_law_07', sectionId: 'distribution-law'}]) {
    let variant = null;
    for (let attempt = 0; attempt < 8 && !variant; attempt++) variant = variantOf(law);
    if (!variant) { caseFails.push(law.id + ': нет варианта с таблицей'); continue }
    const base = ev(`taskMap[${JSON.stringify(law.id)}]`);
    if (JSON.stringify(variant.inputTables) === JSON.stringify(base.inputTables)) caseFails.push(law.id + ': таблица не изменилась');
    if (ev(`aiNumSame(${JSON.stringify(variant.answer)}, ${JSON.stringify(base.answer)})`)) caseFails.push(law.id + ': ответ не изменился');
    if (variant.question !== base.question) caseFails.push(law.id + ': условие переписано без надобности');
}
check('табличный закон распределения пересчитывается', caseFails.length === 0, caseFails.slice(0, 3).join(' | '));

// Ответ такой задачи проверяется независимым расчётом: P(X≤1) — сумма новых
// вероятностей значений, которые не больше единицы.
const lawVariant = (() => {
    let variant = null;
    for (let attempt = 0; attempt < 8 && !variant; attempt++) variant = variantOf({id: 'v3_distribution_law_04', sectionId: 'distribution-law'});
    return variant;
})();
const lawNumbers = lawVariant ? (lawVariant.inputTables[0].rows[0].slice(1).map(cell => Number(String(cell).replace(',', '.')))) : [];
const lawXs = lawVariant ? lawVariant.inputTables[0].head.slice(1).map(Number) : [];
const lawExpected = lawNumbers.reduce((acc, p, i) => (lawXs[i] <= 1 ? acc + p : acc), 0);
check('ответ табличного закона сходится с новыми вероятностями',
    !!lawVariant && Math.abs(lawExpected - Number(lawVariant.answer)) < 1e-9,
    `${lawExpected} против ${lawVariant && lawVariant.answer}`);
check('сумма вероятностей остаётся единицей',
    !!lawVariant && Math.abs(lawNumbers.reduce((acc, p) => acc + p, 0) - 1) < 1e-9,
    String(lawNumbers.reduce((acc, p) => acc + p, 0)));

// Разные числа при каждом запуске: набор подходящих условий не повторяется.
const firstNumbers = [];
for (let attempt = 0; attempt < 10; attempt++) {
    const variant = variantOf({id: 't1_1', sectionId: 'intro-stats'});
    if (variant) firstNumbers.push(String(variant.question));
}
check('генератор выдаёт разные числа, а не одно и то же',
    firstNumbers.length >= 8 && new Set(firstNumbers).size >= 6,
    `разных условий ${new Set(firstNumbers).size} из ${firstNumbers.length}`);

// Табличные моменты: M(X) и D(X) по таблице считаются заново.
for (const momentCase of [{id: 't5_1', sectionId: 'distribution-law'}, {id: 'v3_math_expectation_01', sectionId: 'math-expectation'},
    {id: 'v3_variance_std_01', sectionId: 'variance-std'}, {id: 'v3_combined_problems_01', sectionId: 'combined-problems'}]) {
    let variant = null;
    for (let attempt = 0; attempt < 8 && !variant; attempt++) variant = variantOf(momentCase);
    if (!variant) { caseFails.push(momentCase.id + ': нет варианта по таблице'); continue }
    const base = ev(`taskMap[${JSON.stringify(momentCase.id)}]`);
    if (JSON.stringify(variant.inputTables) === JSON.stringify(base.inputTables)) caseFails.push(momentCase.id + ': таблица не изменилась');
}
check('моменты по таблице пересчитываются', caseFails.length === 0, caseFails.slice(0, 3).join(' | '));

// Общая формула: ответ курса воспроизводится ровно одной комбинацией чисел.
check('пересчёт по общей формуле работает',
    ['v3_continuous_rv_05', 't7_1', 'v3_other_distributions_12'].every(id => {
        const section = ev(`taskMap[${JSON.stringify(id)}].sectionId`);
        let variant = null;
        for (let attempt = 0; attempt < 8 && !variant; attempt++) variant = variantOf({id: id, sectionId: section});
        return !!variant && variant.numbersChanged === true
    }));

// График и таблица: данные меняются вместе с условием.
const graphBase = ev("taskMap['v3_intro_stats_12']");
let graphVariant = null;
for (let attempt = 0; attempt < 8 && !graphVariant; attempt++) graphVariant = variantOf({id: 'v3_intro_stats_12', sectionId: 'intro-stats'});
check('числа графика меняются вместе с условием',
    !!graphVariant && graphVariant.question !== graphBase.question
    && JSON.stringify(graphVariant.chart) !== JSON.stringify(graphBase.chart)
    && JSON.stringify(graphVariant.inputTables) !== JSON.stringify(graphBase.inputTables),
    graphVariant ? graphVariant.question : 'нет варианта');
check('высоты частот на графике переписаны верно',
    !!graphVariant && String(graphVariant.chart.ys.join(';')) === String(graphVariant.inputTables[0].rows[0].slice(1).join(';'))
    && Number(graphVariant.answer) === graphVariant.chart.ys.reduce((acc, value) => acc + Number(value), 0),
    graphVariant ? 'сумма ' + graphVariant.answer + ' против ' + graphVariant.chart.ys.join('+') : 'нет варианта');

// Два набора чисел одного задания не должны повторяться: 8 запусков — 6 разных наборов.
// Розыгрыш идёт одним вызовом: внутри jsdom Math.random между eval-ами замирает.
const sumDraws = ev(`Array.from({length: 8}, () => {
    const v = aiTaskNumberVariant(taskMap['var_graph'], {sectionId: 'variation-series'});
    return v && v.chart ? v.chart.ys.join(',') : null
}).filter(Boolean).map(String)`);
check('каждый запуск даёт новый набор данных',
    sumDraws.length >= 6 && new Set(sumDraws).size >= 5, `наборов: ${new Set(sumDraws).size} из ${sumDraws.length}`);

// Пересчёт берём пачкой внутри одного eval: в jsdom Math.random между вызовами замирает.
const newFamilies = ev(`(() => {
    const items = [
        {id: 'v3_math_expectation_11', sectionId: 'math-expectation'},
        {id: 'v3_variance_std_14', sectionId: 'variance-std'},
        {id: 'v3_geometric_distribution_10', sectionId: 'geometric-distribution'},
        {id: 'v3_binomial_distribution_09', sectionId: 'binomial-distribution'},
        {id: 'var_table', sectionId: 'variation-series'},
        {id: 'v3_advanced_variation_series_02', sectionId: 'advanced-variation-series'},
        {id: 'v3_frequency_08', sectionId: 'frequency'}
    ];
    const out = {};
    for (const item of items) {
        let variant = null;
        for (let i = 0; i < 16 && !variant; i++) variant = aiTaskNumberVariant(taskMap[item.id], {sectionId: item.sectionId});
        out[item.id] = variant
    }
    return out
})()`);
const familyFails = [];
for (const [id, variant] of Object.entries(newFamilies)) {
    if (!variant) { familyFails.push(id + ': нет варианта'); continue }
    if (!variant.numbersChanged) familyFails.push(id + ': нет пометки');
}
check('сравнение двух вариантов пересчитывается',
    !familyFails.includes('v3_math_expectation_11: нет варианта') && !familyFails.includes('v3_variance_std_14: нет варианта')
    && !familyFails.includes('v3_geometric_distribution_10: нет варианта')
    && Array.isArray(newFamilies['v3_math_expectation_11'].answer) && newFamilies['v3_math_expectation_11'].answer.length === 2
    && Number(newFamilies['v3_variance_std_14'].answer[1]) === 0,
    familyFails.join(' | '));
check('в сравнении вариантов таблица пересчитана, а разбор показывает расчёт',
    JSON.stringify(newFamilies['v3_math_expectation_11'].inputTables) !== JSON.stringify(ev("taskMap['v3_math_expectation_11'].inputTables"))
    && /·/.test(String(newFamilies['v3_math_expectation_11'].solution)));
const binomialVariant = newFamilies['v3_binomial_distribution_09'];
check('биномиальный закон пересчитывается по n и p',
    /При n=(\d+), p=[\d,]+ заполните закон/.test(binomialVariant.question)
    && binomialVariant.answer.length === Number(binomialVariant.question.match(/При n=(\d+)/)[1]) + 1
    && binomialVariant.rows.length === binomialVariant.answer.length
    && Math.abs(binomialVariant.answer.reduce((acc, value) => acc + Number(value), 0) - 1) < 1e-3,
    binomialVariant.question + ' | ' + JSON.stringify(binomialVariant.answer));
check('частоты, доли и списки данных пересчитываются',
    JSON.stringify(newFamilies['var_table'].rows) !== JSON.stringify(ev("taskMap['var_table'].rows"))
    && JSON.stringify(newFamilies['v3_advanced_variation_series_02'].inputTables) !== JSON.stringify(ev("taskMap['v3_advanced_variation_series_02'].inputTables"))
    && JSON.stringify(newFamilies['v3_frequency_08'].chart) !== JSON.stringify(ev("taskMap['v3_frequency_08'].chart"))
    && newFamilies['v3_frequency_08'].answer !== undefined,
    familyFails.join(' | '));

// Флажок выключен: генератор берёт задание курса без изменений.
ev('aiToggleNumberSwap(false)');
ev("go('ai')");
await wait(400);
ev("document.getElementById('ai-gen-topic').value='intro-stats'");
await ev('aiGenerate()');
await wait(250);
const plain = ev("progress.settings.aiTasks[0]");
check('с выключенным флажком задача берётся из курса',
    !!plain && !!plain.refId && ev(`!!taskMap[${JSON.stringify(plain.refId)}]`),
    JSON.stringify(plain).slice(0, 120));
check('без пересчёта задача ссылается на курс без inline-копии', !!plain && !!plain.refId && !plain.task);
ev('aiToggleNumberSwap(true)');
check('включённый флажок возвращает пометку в карточке',
    !!variety && /новые числа/.test(ev(`aiTaskCardHtml(${JSON.stringify(variety)}, {key: 'swap-probe-2'})`)));

// Переводы: строки о новых числах есть на всех языках, английская карточка без кириллицы.
for (const lang of ['en', 'kk']) {
    ev(`setLanguage(${JSON.stringify(lang)})`);
    await wait(250);
    const texts = ev("[ait('ai.num.swap'), ait('ai.num.changed'), ait('ai.num.kept'), ait('ai.num.swapHint'), ait('ai.num.preview', {list: '4 → 5'})]");
    check(`${lang}: строки о новых числах переведены`, texts.every(text => !/[\u0400-\u04FF]/.test(text) || lang === 'kk'),
        texts.join(' | ').slice(0, 120));
}
ev("setLanguage('en')");
await wait(250);
const enVariant = variantOf({id: 't1_1', sectionId: 'intro-stats'});
const enCard = enVariant ? ev(`aiTaskCardHtml(${JSON.stringify(enVariant)}, {key: 'swap-en'})`) : '';
check('en: карточка пересчитанной задачи переведена',
    !!enVariant && enCard.length > 0 && !/[\u0400-\u04FF]/.test(enCard),
    (enCard.match(/[\u0400-\u04FF][^ <]*/g) || []).slice(0, 4).join(' '));
ev("setLanguage('ru')");
await wait(250);
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey='';progress.settings.aiChat=[];progress.settings.aiTasks=[];progress.settings.aiSwapNumbers=true;persist()");

// --- 25. Создание совсем новых задач: PISA, сложность, листы ------------
// Регресс: генератор не умел PISA (контекст выбрасывался, а офлайн-карточка
// теряла данные контекста), выбор ответа текстом не засчитывался, сложность
// выбрать было нельзя, а из созданных задач нельзя было собрать лист.
ev("Object.assign(progress,EMPTY_PROGRESS());persist()");
ev("setLanguage('ru')");
await wait(250);
ev("go('ai')");
await wait(400);
check('в генераторе есть выбор вида задачи и сложности',
    !!w.document.getElementById('ai-gen-kind') && !!w.document.getElementById('ai-gen-level')
    && !!w.document.getElementById('ai-ws-make'));
ev("document.getElementById('ai-gen-kind').value='pisa';document.getElementById('ai-gen-level').value='advanced';aiGenPrefsChanged()");
check('вид и сложность запоминаются в настройках',
    ev("aiSettings().aiGenKind") === 'pisa' && ev("aiSettings().aiGenLevel") === 'advanced');

const pisaMock = {
    context: {title: 'Доставка воды в школу', description: 'Школа заказывает воду. В понедельник привезли 10 бутылей, во вторник 14, в среду 16. Ученики хотят понять средний расход.', table: {caption: 'Привоз', head: ['День', 'Бутылей'], rows: [['Пн', '10'], ['Вт', '14'], ['Ср', '16']]}},
    question: 'Найдите среднее число бутылей в день, округлите до десятых.', answer: '13.3',
    hint: 'Сложите и разделите на 3.', solution: '(10+14+16)/3 = 13,333… ≈ 13,3.'
};
let genCaptured = null;
w.fetch = async (url, options) => {
    genCaptured = JSON.parse(options.body);
    return {ok: true, status: 200, json: async () => ({choices: [{message: {content: JSON.stringify(pisaMock)}}]})};
};
ev("progress.settings.aiEnabled=true;progress.settings.aiApiKey='test-key';progress.settings.aiProvider='deepseek';progress.settings.aiBaseUrl='https://api.deepseek.com';progress.settings.aiTasks=[];persist()");
ev("document.getElementById('ai-gen-topic').value='pisa-tests';document.getElementById('ai-gen-count').value='1'");
await ev('aiGenerate()');
await wait(300);
check('модель просят создать контекст и один вопрос к нему',
    !!genCaptured && genCaptured.messages[0].content.includes('"context"') && /PISA/.test(genCaptured.messages[0].content),
    genCaptured ? genCaptured.messages[0].content.slice(0, 120) : 'нет запроса');
check('в запросе указана выбранная сложность',
    !!genCaptured && /повышенная/i.test(genCaptured.messages[0].content));
const genStored = ev('progress.settings.aiTasks[0]');
check('созданная PISA-задача сохранена с контекстом, видом и сложностью',
    !!genStored && !!genStored.task && genStored.task.genKind === 'pisa' && genStored.task.difficulty === 'advanced'
    && genStored.task.aiContext.title === 'Доставка воды в школу',
    JSON.stringify(genStored).slice(0, 160));
check('карточка созданной задачи показывает контекст и его таблицу',
    w.document.getElementById('ai-gen-result').innerHTML.includes('Доставка воды в школу')
    && w.document.getElementById('ai-gen-result').innerHTML.includes('Привоз'));
const genKey = genStored.id;
ev(`document.getElementById('ai-in-${genKey}').value='13,3';aiStudioCheck(${JSON.stringify(genKey)})`);
check('ответ созданной PISA-задачи проверяется локально',
    /Верно/.test(ev(`document.getElementById('ai-fb-${genKey}').textContent`)));

// Выбор ответа: эталон текстом превращается в номер варианта и засчитывается.
const singleTask = ev(`aiTaskFromModelAnswer(${JSON.stringify(JSON.stringify({question: 'q', options: ['Геометрическое', 'Биномиальное', 'Равномерное'], answer: 'Биномиальное', solution: 's'}))}, null, {})`);
check('выбор ответа текстом хранится номером варианта', singleTask.answer === 1, String(singleTask.answer));
check('выбор засчитывается по тексту и по номеру с 1',
    ev(`aiLocalVerdict(${JSON.stringify(singleTask)}, 'Биномиальное')`) === true
    && ev(`aiLocalVerdict(${JSON.stringify(singleTask)}, '2')`) === true
    && ev(`aiLocalVerdict(${JSON.stringify(singleTask)}, 'Геометрическое')`) === false);
// Округление из условия даёт допуск, несколько ответов — через точку с запятой.
check('ответ с округлением из условия засчитывается',
    ev(`aiLocalVerdict(aiTaskFromModelAnswer('{"question":"Найдите долю, округлите до сотых","answer":"0.333333","solution":"s"}', null, {}), '0,33')`) === true);
check('несколько ответов проверяются по частям',
    ev(`aiLocalVerdict(aiTaskFromModelAnswer('{"question":"q","answer":[2.5,0.25],"solution":"s"}', null, {}), '2.5; 0.25')`) === true);
check('задача без проверяемого ответа не создаётся',
    ev(`aiTaskProblem(aiTaskFromModelAnswer('{"question":"q"}', null, {}), 'task')`) === 'answer'
    && ev(`aiTaskProblem(aiTaskFromModelAnswer('{"question":"q","answer":"1"}', null, {kind: 'pisa'}), 'pisa')`) === 'context');

// Офлайн-PISA: контекст курса целиком, карточка не теряет его данные.
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey=''");
const localPisa = ev("aiGenerateTask('pisa-tests', {kind: 'pisa', level: 'standard'})");
check('офлайн-задача PISA несёт контекст целиком',
    !!localPisa && localPisa.genKind === 'pisa' && !!localPisa.aiContext && localPisa.aiContext.description.length > 20,
    localPisa && localPisa.aiContext ? localPisa.aiContext.title : 'нет контекста');
check('офлайн-карточка PISA показывает контекст',
    !!localPisa && ev(`aiTaskCardHtml(${JSON.stringify(localPisa)}, {key: 'pisa-off', register: false})`).includes(localPisa.aiContext.title));

// «Похожая задача»: модель видит исходное задание и данные его контекста.
let similarCaptured = null;
w.fetch = async (url, options) => {
    similarCaptured = JSON.parse(options.body);
    return {ok: true, status: 200, json: async () => ({choices: [{message: {content: JSON.stringify(pisaMock)}}]})};
};
ev("progress.settings.aiEnabled=true;progress.settings.aiApiKey='test-key';progress.settings.aiTasks=[];persist()");
ev("spAiSimilarTask('p1_q1')");
await wait(500);
const similarSystem = similarCaptured ? similarCaptured.messages.map(m => m.content).join('\n') : '';
check('похожая задача: модель видит исходный вопрос и контекст',
    similarSystem.includes('Сколько всего учеников') && /3;4;5/.test(similarSystem),
    similarSystem.slice(0, 140));
ev('aiDrawerClose()');
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey=''");

// Рабочий лист комбинируется из отмеченных созданных задач.
ev('progress.settings.aiTasks=[];persist()');
ev(`aiTaskStoreAdd(aiTaskFromModelAnswer(${JSON.stringify(JSON.stringify(pisaMock))}, null, {kind: 'pisa', level: 'basic'}), null)`);
ev(`aiTaskStoreAdd(aiTaskFromModelAnswer('{"question":"Новая задача про кофейню: найдите среднее чисел 10, 20 и 30.","answer":"20","solution":"(10+20+30)/3 = 20"}', null, {kind: 'task', level: 'standard'}), null)`);
ev("go('ai')");
await wait(400);
const sheetIds = ev('progress.settings.aiTasks.map(x=>x.id)');
check('созданные задачи лежат в хранилище', Array.isArray(sheetIds) && sheetIds.length === 2);
for (const id of sheetIds) ev(`aiWsToggle(${JSON.stringify(id)}, true)`);
check('отметки «в лист» сохранены', ev('aiSettings().aiWsSelected.length') === 2);
ev("document.getElementById('worksheet-dialog').showModal = function() {}");
ev("document.getElementById('ai-ws-key').checked = true");
ev('aiMakeWorksheet()');
await wait(250);
const sheetHtml = w.document.getElementById('worksheet-body').innerHTML;
check('лист содержит контекст PISA и обе созданные задачи',
    sheetHtml.includes('Доставка воды в школу') && sheetHtml.includes('среднее число бутылей') && sheetHtml.includes('кофейню'));
check('версия учителя содержит ответы созданных задач', sheetHtml.includes('worksheet-answer'));
ev('wsState.key=false;renderWorksheet()');
await wait(250);
check('ученическая версия листа без ответов',
    !w.document.getElementById('worksheet-body').innerHTML.includes('worksheet-answer'));
ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey='';progress.settings.aiTasks=[];progress.settings.aiWsSelected=[];persist()");

// --- Серверный Gemini-ключ: он никогда не попадает в браузерную сборку ---
let aiCalls = [];
w.fetch = async (url, options = {}) => {
    aiCalls.push({url, options});
    if (url === '/api/ai/config') return {
        ok: true, headers: {get: () => 'application/json'}, json: async () => ({geminiAvailable: true})
    };
    if (url.endsWith('/models')) return {
        ok: true, json: async () => ({models: [{name: 'models/gemini-2.5-flash'}]})
    };
    return {
        ok: true,
        json: async () => ({candidates: [{content: {parts: [{text: 'Ответ модели'}]}}]})
    };
};
ev('progress.settings={};aiSettings()');
await ev('aiDetectSiteKey()');
check('при доступном сервере Gemini включён по умолчанию',
    ev("aiConfigured() && aiSettings().aiProvider==='gemini' && aiSettings().aiKeySource==='site' && aiSettings().aiApiKey===''"));
check('ключ сайта не виден в HTML и поле заблокировано',
    ev("document.getElementById('ai-key').disabled && document.getElementById('ai-key').value===''"));
aiCalls = [];
const siteAnswer = await ev("aiExternalChat([{role:'user',content:'ping'}],{stream:false})");
check('запрос идёт через сервер без заголовка Authorization',
    siteAnswer === 'Ответ модели' && aiCalls[0]?.url === '/api/ai/gemini/generateContent'
    && !('Authorization' in aiCalls[0].options.headers)
    && JSON.parse(aiCalls[0].options.body).contents[0].parts[0].text === 'ping');
aiCalls = [];
const siteModels = await ev('aiFetchModels()');
check('список моделей идёт через сервер без личного ключа',
    siteModels.includes('gemini-2.5-flash') && aiCalls[0]?.url === '/api/ai/models'
    && !('Authorization' in aiCalls[0].options.headers));
ev("document.getElementById('ai-key-source').value='own';aiKeySourceChanged()");
check('пользователь может разблокировать поле своего ключа',
    ev("!document.getElementById('ai-key').disabled"));
ev("document.getElementById('ai-key').value='personal-test-key';aiSaveSettings()");
aiCalls = [];
await ev("aiExternalChat([{role:'user',content:'ping'}],{stream:false})");
check('личный ключ заменяет ключ сайта и идёт напрямую провайдеру',
    ev("aiSettings().aiKeySource==='own'")
    && aiCalls[0]?.url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    && aiCalls[0].options.headers['x-goog-api-key'] === 'personal-test-key'
    && !('Authorization' in aiCalls[0].options.headers));
aiCalls = [];
const personalModels = await ev('aiFetchModels()');
check('личный Gemini-ключ запрашивает модели через нативный API',
    personalModels.includes('gemini-2.5-flash')
    && aiCalls[0]?.url === 'https://generativelanguage.googleapis.com/v1beta/models'
    && aiCalls[0].options.headers['x-goog-api-key'] === 'personal-test-key');
ev("progress.settings.aiBaseUrl='https://generativelanguage.googleapis.com/v1beta/openai'");
check('старый адрес Gemini из браузера переносится на нативный API',
    ev("aiSettings().aiBaseUrl === 'https://generativelanguage.googleapis.com/v1beta'"));
const geminiPayload = ev("aiGeminiBody([{role:'system',content:'You are helpful'},{role:'user',content:'Привет'},{role:'assistant',content:'Здравствуйте'},{role:'user',content:'Вопрос'}], {maxTokens:128})");
check('контекст диалога и системное сообщение переведены в формат Gemini',
    geminiPayload.systemInstruction.parts[0].text === 'You are helpful'
    && geminiPayload.contents.map(c => c.role).join(',') === 'user,model,user'
    && geminiPayload.generationConfig.maxOutputTokens === 128);
const encoder = new TextEncoder();
w.TextDecoder = TextDecoder;
w.fetch = async () => ({
    ok: true, body: {getReader: () => {
        const chunks = ['data: {"candidates":[{"content":{"parts":[{"text":"Привет"}]}}]}\n\n',
                        'data: {"candidates":[{"content":{"parts":[{"text":" мир"}]}}]}\n\n'];
        return {read: async () => chunks.length ? {done:false,value:encoder.encode(chunks.shift())} : {done:true}};
    }}
});
const streamed = await ev("aiExternalChat([{role:'user',content:'ping'}],{stream:true})");
check('потоковый ответ Gemini собирается из SSE', streamed === 'Привет мир');
ev("progress.settings.aiKeySource='site';progress.settings.aiApiKey='';aiSiteAvailable=false");
check('без сервера сайт не притворяется подключённым', !ev('aiConfigured()'));

// --- 26. Ввод ключа без предварительного сохранения и работа всех функций с ключом ---
ev("progress.settings={};aiSettings();go('ai')");
await wait(250);
aiCalls = [];
w.fetch = async (url, options = {}) => {
    aiCalls.push({url, options});
    if (url.endsWith('/models')) return {
        ok: true,
        json: async () => ({models: [
            {name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent']},
            {name: 'models/imagen-3.0-generate-002', supportedGenerationMethods: ['predict']},
            {name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent']}
        ]})
    };
    return {
        ok: true,
        json: async () => ({candidates: [{content: {parts: [
            {text: 'Черновик рассуждений', thought: true},
            {text: 'Чистый ответ Gemini'}
        ]}}]})
    };
};
// Пользователь вставляет ключ AQ./AIza с пробелами и Bearer и сразу жмёт «Проверить подключение», не нажав «Сохранить».
ev("document.getElementById('ai-key').value='  \"Bearer AQ.Ab8RN6K_test_gemini_key_12345\"  ';aiKeyInput()");
check('ввод ключа AQ. автоматически выбирает Gemini и включает галочку',
    ev("document.getElementById('ai-provider').value==='gemini' && document.getElementById('ai-enabled').checked===true"));
const directTest = await ev("aiTestConnection()");
check('проверка подключения работает сразу после ввода ключа без кнопки «Сохранить»',
    !!directTest && directTest.ok === true && ev("aiConfigured() && aiSettings().aiApiKey==='AQ.Ab8RN6K_test_gemini_key_12345'"));
check('фильтр моделей Gemini отсекает embedding и imagen',
    JSON.stringify(directTest.models) === JSON.stringify(['gemini-2.5-flash']),
    JSON.stringify(directTest.models));
check('проверка подключения с моделями не тратит лишний запрос generateContent',
    aiCalls.length === 1 && aiCalls[0].url === 'https://generativelanguage.googleapis.com/v1beta/models',
    String(aiCalls.length));
check('статус чата на странице сразу переключается на внешнюю модель',
    ev("document.getElementById('ai-chat-mode').textContent === ait('ai.setup.ready')"));

// Выключение и повторное включение галочки пользователем.
ev("document.getElementById('ai-enabled').checked=false;aiToggleEnabled(false)");
check('снятие галочки отключает внешнюю модель при сохранённом ключе',
    ev("!aiConfigured() && aiSettings().aiDisabledByUser===true"));
ev("document.getElementById('ai-enabled').checked=true;aiToggleEnabled(true)");
check('возврат галочки снова включает внешнюю модель',
    ev("aiConfigured() && !aiSettings().aiDisabledByUser"));

// Мысли модели (thought:true) не попадают в видимый текст ответа, а подряд идущие роли склеиваются.
const cleanedTurnPayload = ev("aiGeminiBody([{role:'assistant',content:'Приветствие'},{role:'user',content:'Часть 1'},{role:'user',content:'Часть 2'}], {})");
check('aiGeminiBody убирает начальный ход model и склеивает соседние ходы одной роли',
    cleanedTurnPayload.contents.length === 1
    && cleanedTurnPayload.contents[0].role === 'user'
    && cleanedTurnPayload.contents[0].parts[0].text === 'Часть 1\n\nЧасть 2');
const thoughtFiltered = await ev("aiExternalChat([{role:'user',content:'Проверка'}],{stream:false})");
check('aiGeminiContent отфильтровывает внутренние блоки thought:true',
    thoughtFiltered === 'Чистый ответ Gemini', thoughtFiltered);

// Загрузка моделей без предварительного сохранения для Groq-ключа и обновление выбранной модели.
ev("progress.settings={};aiSettings();go('ai')");
await wait(200);
w.fetch = async (url, options = {}) => {
    aiCalls.push({url, options});
    return {ok: true, json: async () => ({data: [{id: 'llama-3.3-70b-versatile'}, {id: 'mixtral-8x7b-32768'}]})};
};
ev("document.getElementById('ai-key').value='gsk_testGroqKey1234567890';document.getElementById('ai-model').value='old-removed-model'");
await ev("aiLoadModels()");
check('aiLoadModels автоопределяет Groq по ключу gsk_, включает модель и подставляет актуальную модель из списка',
    ev("aiConfigured() && aiSettings().aiProvider==='groq' && aiSettings().aiModel==='llama-3.3-70b-versatile' && document.getElementById('ai-model').value==='llama-3.3-70b-versatile'"));

// Разбор JSON с одиночными LaTeX-слэшами и нестандартными форматами таблиц от внешней модели.
const latexJson = '{"question":"Найдите $\\bar{x}$ и $\\sigma$, если $\\frac{10}{2}=5$ и $a \\times b \\neq 0$","answer":"5 баллов","options":[],"table":[["Значение","Частота"],[4,2],[6,2]],"hint":"Используйте $\\bar{x}$","solution":"По формуле $\\bar{x}=\\frac{4\\cdot 2+6\\cdot 2}{4}=5$."}';
const parsedLatexTask = ev(`aiTaskFromModelAnswer(${JSON.stringify(latexJson)}, SECTIONS[0], {kind:'task', level:'standard'})`);
check('JSON с одиночными LaTeX-слэшами (\\frac, \\bar, \\times, \\neq, \\sigma) и 2D-таблицей разбирается без ошибок',
    !!parsedLatexTask && !parsedLatexTask._invalid
    && parsedLatexTask.answer === 5
    && parsedLatexTask.inputTables?.[0]?.head?.join(',') === 'Значение,Частота'
    && parsedLatexTask.inputTables?.[0]?.rows?.length === 2,
    JSON.stringify(parsedLatexTask).slice(0, 140));

// «Похожая задача» с подключённым ключом не засоряется историей чата и создаёт проверяемую карточку.
ev("progress.settings.aiChat=[{role:'user',html:'Старый вопрос'},{role:'assistant',html:'Старый ответ'}]");
aiCalls = [];
w.fetch = async (url, options = {}) => {
    aiCalls.push({url, options});
    return {
        ok: true,
        json: async () => ({choices: [{message: {content: JSON.stringify({
            question: 'В выборке 5 измерений: 2, 4, 6, 8, 10. Найдите среднее арифметическое.',
            answer: 6,
            options: [],
            table: null,
            hint: 'Сложите все числа и разделите на 5.',
            solution: '(2+4+6+8+10)/5 = 6.'
        })}}]})
    };
};
const countBeforeSimilar = ev("progress.settings.aiTasks.length");
ev("spAiGenerateSimilar({section: SECTIONS[0]})");
await wait(350);
const similarSentMessages = JSON.parse(aiCalls[0].options.body).messages;
check('«Похожая задача» с ключом отправляет чистый запрос без старой переписки чата',
    similarSentMessages.length === 2 && similarSentMessages[0].role === 'system' && similarSentMessages[1].role === 'user',
    similarSentMessages.map(m => m.role).join(','));
check('«Похожая задача» с ключом добавляет задачу от модели в «Мои задачи» и рисует карточку',
    ev("progress.settings.aiTasks.length") === countBeforeSimilar + 1
    && ev("progress.settings.aiTasks[0].source === 'model'")
    && /ai-task-card/.test(ev("document.getElementById('ai-drawer-log').innerHTML")));

// Проверка ответа ученика с ключом: для тестового задания передаётся текст выбранного варианта, а не индекс 0.
const checkSingleTask = ev("allTasks.find(t=>t.type==='single' && Array.isArray(t.options) && t.options.length>=2)");
ev(`progress.answers[${JSON.stringify(checkSingleTask.id)}]=0`);
aiCalls = [];
w.fetch = async (url, options = {}) => {
    aiCalls.push({url, options});
    return {ok: true, json: async () => ({choices: [{message: {content: 'Ответ проверен.'}}]})};
};
ev(`spAiCheckMyWork(${JSON.stringify(checkSingleTask.id)}, '')`);
await wait(300);
const checkSentBody = JSON.parse(aiCalls[0].options.body);
check('при проверке тестового задания модель видит номер с 1 и текст выбранного варианта',
    checkSentBody.messages[checkSentBody.messages.length - 1].content.includes('1) ' + checkSingleTask.options[0])
    && checkSentBody.messages[0].content.includes('correctOption'),
    checkSentBody.messages[checkSentBody.messages.length - 1].content);

console.log(`\nИтог с регрессиями: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
