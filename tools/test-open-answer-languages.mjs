// Проверка автопроверки открытых ответов на трёх языках курса.
// Эталонный разбор должен зачитываться и на русском, и на английском, и на
// казахском, причём независимо от языка интерфейса: ученик может отвечать на
// любом из языков. Пустой ответ при этом не должен зачитываться нигде.
// Запуск: node tools/test-open-answer-languages.mjs [путь к сборке]
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
const LANGS = ['ru', 'en', 'kk'];

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ok   ${name}`) }
    else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`) }
};
const useLang = lang => ev(`applyContentLanguage(${JSON.stringify(lang)})`) === undefined;
const json = expr => JSON.parse(ev(`JSON.stringify(${expr})`));

console.log(`Сборка: ${file}`);

// --- 1. Данные: ключи заданы одинаково на трёх языках ------------------------
// Пункт либо проверяется словами во всех трёх языках, либо во всех трёх
// остаётся «мягким» (без ключей) — иначе ответ на одном из языков теряет
// пункты, которые находят для другого языка. Число мягких пунктов закреплено,
// чтобы набор ключей нельзя было тихо ослабить.
const SOFT_LIMIT = 27;
const dataRows = json(`allTasks.filter(t=>t.type==='open').map(t=>{
    const ch=t.check||{}, n=(t.rubric||[]).length;
    const lists={ru:ch.criteria||[], en:ch.criteriaEn||[], kk:ch.criteriaKk||[]};
    const ragged=[], empty=[]; let soft=0;
    for (let i=0;i<n;i+=1){
        const has=lang=>{const s=lists[lang][i]; return Array.isArray(s)&&s.length>0};
        const any=has('ru')||has('en')||has('kk'), all=has('ru')&&has('en')&&has('kk');
        if (!any) soft+=1;
        else if (!all) ragged.push(i+1);
        for (const lang of ['ru','en','kk']){
            const s=lists[lang][i];
            if (Array.isArray(s)&&!s.length) empty.push(lang+(i+1))
        }
    }
    return {id:t.id,rubric:n,soft,ragged,empty,
        ruLen:lists.ru.length,enLen:lists.en.length,kkLen:lists.kk.length}
})`);
const wrongLengths = dataRows.filter(r => r.ruLen !== r.rubric || r.enLen !== r.rubric || r.kkLen !== r.rubric);
const raggedSets = dataRows.filter(r => r.ragged.length);
const emptySets = dataRows.filter(r => r.empty.length);
const softTotal = dataRows.reduce((sum, r) => sum + r.soft, 0);
check('открытые задания с метаданными проверки найдены', dataRows.length >= 96, `найдено ${dataRows.length}`);
check('списки пунктов совпадают по длине с рубрикой во всех языках', wrongLengths.length === 0,
    wrongLengths.slice(0, 5).map(r => `${r.id}: рубрика ${r.rubric}, ru ${r.ruLen}, en ${r.enLen}, kk ${r.kkLen}`).join('; '));
check('наборы ключей EN/KK есть у каждого пункта всех заданий', raggedSets.length === 0,
    raggedSets.slice(0, 5).map(r => `${r.id}: без ключей в части языков — пункты ${r.ragged.join(', ')}`).join('; '));
check('в наборах ключей нет пустых списков', emptySets.length === 0,
    emptySets.slice(0, 5).map(r => `${r.id}: пусто ${r.empty.join(', ')}`).join('; '));
console.log(`  инфо: мягких пунктов (проверяются по смыслу, без ключей) — ${softTotal} из ${dataRows.reduce((a, r) => a + r.rubric, 0)}`);
check(`мягких пунктов не больше ${SOFT_LIMIT} (набор ключей не ослаблен)`, softTotal <= SOFT_LIMIT,
    `сейчас ${softTotal}`);

// --- 2. Эталонные разборы: зачёт в своём языке ------------------------------
const solutions = {};
for (const lang of LANGS) {
    useLang(lang);
    solutions[lang] = json(`allTasks.filter(t=>t.type==='open'&&t.solution).map(t=>[t.id,t.solution])`);
}
for (const lang of LANGS) {
    useLang(lang);
    const rows = json(`allTasks.filter(t=>t.type==='open'&&t.check&&t.solution).map(t=>{
        const s=spScoreOpen(t,t.solution);
        return {id:t.id,credited:s.credited,percent:s.percent,missing:s.criteria.filter(c=>!c.soft&&!c.found).length,numbers:s.numbers.ok,coverage:s.coverage}
    })`);
    const credited = rows.filter(r => r.credited).length;
    console.log(`  ${lang}: разбор засчитан ${credited} / ${rows.length}`);
    check(`${lang}: все эталонные разборы засчитаны (${credited}/${rows.length})`, credited === rows.length,
        rows.filter(r => !r.credited).slice(0, 6).map(r => `${r.id} ${Math.round(r.percent * 100)}% (пунктов не найдено: ${r.missing}, числа: ${r.numbers ? 'ок' : 'нет'}, охват ${Math.round(r.coverage * 100)}%)`).join('; '));
}

// --- 3. Ответ на другом языке, чем интерфейс --------------------------------
const matrix = [];
for (const ui of LANGS) {
    useLang(ui);
    const payload = {};
    for (const answer of LANGS) payload[answer] = Object.fromEntries(solutions[answer]);
    ev(`globalThis.__spAuditSolutions = ${JSON.stringify(payload)}`);
    const rows = json(`(function(){
        const out=[];
        for (const answer of ${JSON.stringify(LANGS)}) {
            const sols=globalThis.__spAuditSolutions[answer];
            for (const t of allTasks) {
                if (t.type!=='open'||!t.check||!sols[t.id]) continue;
                const s=spScoreOpen(Object.assign({},t,{solution:sols[t.id]}),sols[t.id]);
                out.push({id:t.id,answer,credited:s.credited,percent:s.percent})
            }
        }
        return out
    })()`);
    matrix.push(...rows.map(r => ({...r, ui})));
}
const combos = [...new Set(matrix.map(r => r.ui + '→' + r.answer))];
for (const combo of combos) {
    const rows = matrix.filter(r => r.ui + '→' + r.answer === combo);
    const credited = rows.filter(r => r.credited).length;
    check(`ответ ${combo}: засчитано (${credited}/${rows.length})`, credited === rows.length,
        rows.filter(r => !r.credited).slice(0, 6).map(r => `${r.id} ${Math.round(r.percent * 100)}%`).join('; '));
}

// --- 4. Пустой и «ничего не знаю» ответы не зачитываются --------------------
for (const lang of LANGS) {
    useLang(lang);
    const rows = json(`allTasks.filter(t=>t.type==='open'&&t.check).map(t=>{
        const empty=spScoreOpen(t,''), stub=spScoreOpen(t,'не знаю');
        return {id:t.id,empty:empty.credited,stub:stub.credited}
    })`);
    const badEmpty = rows.filter(r => r.empty).map(r => r.id);
    const badStub = rows.filter(r => r.stub).map(r => r.id);
    check(`${lang}: пустой ответ не зачитывается`, badEmpty.length === 0, badEmpty.slice(0, 5).join(', '));
    check(`${lang}: ответ «не знаю» не зачитывается`, badStub.length === 0, badStub.slice(0, 5).join(', '));
}

// --- 5. Без ошибок в консоли ------------------------------------------------
check('нет ошибок jsdom при переключении языков', initialErrors.length === 0, initialErrors.slice(0, 2).join(' | '));

console.log(`\nИтог: ${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
