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
// таблицы из ответа модели не отрисовывались, а подключить внешнюю модель было негде.
// Список начинается с бесплатных провайдеров: ключ выдаётся без платёжных данных,
// а остаток лимитов приходит в заголовках ответа и виден прямо в курсе.
ev("Object.assign(progress,EMPTY_PROGRESS());persist()");
ev("progress.settings=undefined");
check('новая установка выбирает бесплатного провайдера — Groq',
    ev("aiSettings().aiProvider") === 'groq' && ev("aiSettings().aiBaseUrl") === 'https://api.groq.com/openai/v1',
    ev("aiSettings().aiProvider") + ' / ' + ev("aiSettings().aiBaseUrl"));
check('настройки прежних версий без ключа переключаются с DeepSeek на Groq',
    ev("progress.settings.aiProvider='deepseek';progress.settings.aiBaseUrl='https://api.deepseek.com';progress.settings.aiApiKey='';delete progress.settings.aiFreeDefaultMigrated;aiSettings().aiProvider") === 'groq',
    ev("progress.settings.aiProvider"));
ev("progress.settings.aiProvider='deepseek';progress.settings.aiBaseUrl='https://api.deepseek.com';progress.settings.aiApiKey='sk-test';delete progress.settings.aiFreeDefaultMigrated");
check('заведённый ключ DeepSeek при обновлении не трогают',
    ev("aiSettings().aiProvider") === 'deepseek' && ev("aiSettings().aiBaseUrl") === 'https://api.deepseek.com',
    ev("aiSettings().aiProvider") + ' / ' + ev("aiSettings().aiBaseUrl"));
ev("progress.settings.aiProvider='groq';progress.settings.aiBaseUrl='https://api.groq.com/openai/v1';progress.settings.aiModel='openai/gpt-oss-120b';progress.settings.aiApiKey='';progress.settings.aiEnabled=false");
ev("setLanguage('ru')");
await wait(250);
ev("go('ai')");
await wait(400);
const aiPage = aiMain();
const providerOptions = ev("[...document.querySelectorAll('#ai-provider option')].map(o=>o.value)");
check('бесплатные провайдеры идут первыми в списке',
    providerOptions.slice(0, 3).join(',') === 'groq,gemini,openrouter',
    providerOptions.join(','));
check('в списке есть платные, локальные модели и свой адрес',
    ['deepseek', 'openai', 'ollama', 'lmstudio', 'custom'].every(id => providerOptions.includes(id)),
    providerOptions.join(','));
check('провайдеры сгруппированы: без карты, платные, локальные',
    ev("[...document.querySelectorAll('#ai-provider optgroup')].length") === 3,
    String(ev("[...document.querySelectorAll('#ai-provider optgroup')].length")));
const groqGuide = ev("document.getElementById('ai-provider-help').innerHTML");
check('подсказка ведёт на страницу ключей Groq', /console\.groq\.com\/keys/.test(groqGuide));
check('в подсказке сказано, что платёжные данные не нужны', /без карты/i.test(groqGuide));
check('в подсказке перечислены четыре счётчика лимитов',
    /RPM/.test(groqGuide) && /TPM/.test(groqGuide) && /RPD/.test(groqGuide) && /TPD/.test(groqGuide));
check('в подсказке есть заголовки с остатком лимитов',
    /x-ratelimit-remaining-requests/.test(groqGuide) && /x-ratelimit-remaining-tokens/.test(groqGuide));
check('в подсказке есть оговорка про российский адрес', /российского адреса/.test(groqGuide));
check('шаги получения ключа расписаны подробно',
    ev("document.querySelectorAll('#ai-provider-help .ai-instructions li').length") >= 5,
    String(ev("document.querySelectorAll('#ai-provider-help .ai-instructions li').length")));
check('в подсказке есть ссылка на лимиты',
    /console\.groq\.com\/docs\/rate-limits/.test(groqGuide) && /console\.groq\.com\/settings\/limits/.test(groqGuide));
const guideCard = ev("document.querySelector('#ai-provider-help').closest('.card').textContent");
check('на странице есть таблица бесплатных провайдеров', /Бесплатные провайдеры без карты/.test(guideCard));
check('в таблице сказано, что бесплатный уровень Gemini платит данными',
    /улучшения продуктов/.test(guideCard) && /«нет»/.test(guideCard), guideCard.slice(0, 80));
check('в таблице сказано про хвост :free у OpenRouter', /:free/.test(guideCard));
check('на странице есть таблица частых ошибок с 402',
    /402/.test(ev("document.querySelector('#ai-provider-help').closest('.card').parentElement.textContent")));
ev("document.getElementById('ai-provider').value='gemini';aiProviderChanged()");
check('смена провайдера подставляет базовый адрес Gemini',
    ev("document.getElementById('ai-base').value") === 'https://generativelanguage.googleapis.com/v1beta/openai'
    && /aistudio\.google\.com\/apikey/.test(ev("document.getElementById('ai-provider-help').innerHTML")),
    ev("document.getElementById('ai-base').value"));
check('в подсказке Gemini сказано, что лимитов в документации нет',
    /AI Studio\./.test(ev("document.getElementById('ai-provider-help').innerHTML")));
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
// --- 24. Лимиты бесплатного тарифа из заголовков ответа -------------------
// Groq и OpenRouter присылают остаток счётчиков в x-ratelimit-…: курс показывает
// его сам, без похода в кабинет провайдера.
ev("progress.settings.aiProvider='groq';progress.settings.aiBaseUrl='https://api.groq.com/openai/v1';progress.settings.aiModel='openai/gpt-oss-120b';progress.settings.aiApiKey='test-key';progress.settings.aiEnabled=true;persist()");
ev("setLanguage('ru')");
ev("go('ai')");
await wait(400);
const limitHeaders = {
    'x-ratelimit-limit-requests': '1000',
    'x-ratelimit-remaining-requests': '998',
    'x-ratelimit-limit-tokens': '6000',
    'x-ratelimit-remaining-tokens': '5400',
    'x-ratelimit-reset-requests': '2m59.56s',
    'x-ratelimit-reset-tokens': '7.66s'
};
w.fetch = async () => ({
    ok: true, status: 200,
    headers: {get: name => limitHeaders[name] || null},
    json: async () => ({data: [{id: 'openai/gpt-oss-120b'}, {id: 'llama-3.3-70b-versatile'}]}),
});
await ev('aiFetchModels()');
const limitsLine = ev("document.getElementById('ai-limits').textContent");
const limitsPlain = limitsLine.replace(/[\s\u00A0]/g, '');
check('остаток лимитов из заголовков виден на странице',
    limitsPlain.includes('998из1000') && limitsPlain.includes('5400из6000') && limitsPlain.includes('2m59.56s'), limitsLine);
check('в строке лимитов назван провайдер', /Groq/.test(limitsLine), limitsLine);
check('те же лимиты показывает панель помощника',
    ev("document.getElementById('ai-drawer-mode').textContent").includes('998'),
    ev("document.getElementById('ai-drawer-mode').textContent"));
w.fetch = async () => ({
    ok: false, status: 429,
    headers: {get: name => ({'retry-after': '7', 'x-ratelimit-remaining-requests': '0'}[name] || null)},
    text: async () => '{"error":{"message":"Rate limit reached for requests"}}',
});
const limited = await ev('aiTestConnection()');
check('ошибка 429 называет время повтора из заголовка retry-after',
    !!limited && limited.ok === false && /через 7/.test(limited.reason), limited ? limited.reason.slice(0, 120) : 'нет ответа');
check('после ошибки 429 остаток лимитов обновляется',
    /осталось 0/.test(ev("document.getElementById('ai-limits').textContent")),
    ev("document.getElementById('ai-limits').textContent"));

ev("progress.settings.aiEnabled=false;progress.settings.aiApiKey='';progress.settings.aiChat=[];progress.settings.aiTasks=[];persist()");
ev("setLanguage('ru')");
await wait(250);

console.log(`\nИтог с регрессиями: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
