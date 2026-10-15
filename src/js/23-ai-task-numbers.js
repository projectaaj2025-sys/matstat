/* ---- Локальный генератор: те же задачи курса, но с другими числами ---- */
/* Без ключа провайдера генератор берёт задание курса и пересчитывает его с
   другими числами: условие, таблицы данных, график и ответ меняются
   согласованно, поэтому такую задачу можно решать заново.

   Правило подбирается по формулировке задания — набор данных (размах, среднее,
   медиана, мода, объём, сумма, дисперсия), таблицы частот и формулы
   вероятностей. Любое правило сначала проверяется на исходных числах: если
   пересчёт не даёт ответа курса, вариант не создаётся и задача остаётся без
   изменений. Ответы не выдумываются: новое число считает та же формула,
   которая воспроизвела эталонный ответ. */

/* Числовые токены: «4», «0,25», «−7», «1.5», «1 000». */
const AI_NUM_TOKEN = /[−-]?(?:\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[.,]\d+)?/g;

const AI_NUM_WORDS = {
    ru: {'двух': 2, 'трёх': 3, 'трех': 3, 'четырёх': 4, 'четырех': 4, 'пяти': 5, 'шести': 6, 'семи': 7, 'восьми': 8, 'девяти': 9, 'десяти': 10,
        'первой': 1, 'второй': 2, 'третьей': 3, 'четвёртой': 4, 'четвертой': 4, 'пятой': 5, 'шестой': 6},
    en: {'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6},
    kk: {'екі': 2, 'үш': 3, 'төрт': 4, 'бес': 5, 'алты': 6, 'жеті': 7, 'сегіз': 8, 'тоғыз': 9, 'он': 10,
        'бірінші': 1, 'екінші': 2, 'үшінші': 3, 'төртінші': 4, 'бесінші': 5}
};

/* Родительный падеж множественного числа: «5 голосов», но «2 голоса». */
function aiNumGenitivePlural(value) {
    const number = Math.abs(Math.round(Number(value)));
    const mod100 = number % 100, mod10 = number % 10;
    if (mod100 >= 11 && mod100 <= 14) return true;
    return mod10 !== 1 && !(mod10 >= 2 && mod10 <= 4)
}

function aiNumValue(text) {
    const raw = String(text == null ? '' : text).trim().replace(/\u2212/g, '-').replace(/[\s\u00a0]/g, '').replace(',', '.');
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null
}

function aiNumTokens(text) {
    const source = String(text == null ? '' : text);
    const out = [];
    AI_NUM_TOKEN.lastIndex = 0;
    let token;
    while ((token = AI_NUM_TOKEN.exec(source))) {
        const value = aiNumValue(token[0]);
        if (value === null) continue;
        out.push({text: token[0], value: value, start: token.index, end: token.index + token[0].length})
    }
    return out
}

/* Новое число записываем в том же стиле, что и исходное: «0,5» остаётся с
   запятой, «0.25» — с точкой, «−7» — с типографским минусом. */
function aiNumFormat(like, value) {
    const sample = String(like == null ? '' : like);
    const comma = sample.includes(',') && !sample.includes('.');
    const grouped = /\d[\s\u00a0]\d{3}/.test(sample) || Math.abs(Number(value)) >= 10000;
    const places = ((sample.match(/[.,](\d+)/) || [])[1] || '').length;
    const rounded = Number(Number(value).toFixed(places));
    let text = rounded.toFixed(places);
    if (!places) text = String(Math.round(rounded));
    if (comma) text = text.replace('.', ',');
    if (grouped && Math.abs(rounded) >= 1000) {
        const [whole, fraction] = text.split(/[.,]/);
        const sign = whole.startsWith('-') ? '-' : '';
        const digits = sign ? whole.slice(1) : whole;
        const groups = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        text = sign + groups + (fraction === undefined ? '' : (comma ? ',' : '.') + fraction)
    }
    if (sample.startsWith('\u2212')) text = text.replace('-', '\u2212');
    return text
}

function aiNumSame(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
        const left = Array.isArray(a) ? a : [a], right = Array.isArray(b) ? b : [b];
        return left.length === right.length && left.every((value, index) => aiNumSame(value, right[index]))
    }
    const left = Number(a), right = Number(b);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return String(a) === String(b);
    return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(right))
}

/* ---- Новые значения --------------------------------------------------- */

const AI_NUM_PROBS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9];

function aiNumProbPool(slot, spec) {
    const places = ((slot.text.match(/[.,](\d+)/) || [])[1] || '').length || 1;
    const min = spec && spec.min !== undefined ? spec.min : 0.01;
    const max = spec && spec.max !== undefined ? spec.max : 0.99;
    return AI_NUM_PROBS.filter(value => value >= min && value <= max)
        .map(value => Number(value.toFixed(Math.min(places, 2))))
        .filter((value, index, list) => list.indexOf(value) === index && value !== slot.value)
}

/* Новое значение слота: тот же характер величины (счётчик, доля, вероятность). */
function aiNumPick(slot, spec, rnd) {
    const value = slot.value;
    const isDecimal = /[.,]/.test(slot.text);
    const min = spec && spec.min !== undefined ? spec.min : null;
    const max = spec && spec.max !== undefined ? spec.max : null;
    const clamp = next => {
        let out = next;
        if (min !== null) out = Math.max(min, out);
        if (max !== null) out = Math.min(max, out);
        return Number(out)
    };
    const kind = (spec && spec.kind) || (isDecimal ? 'dec' : 'int');
    if (kind === 'prob') {
        const pool = aiNumProbPool(slot, spec);
        if (!pool.length) return null;
        return pool[Math.floor(rnd() * pool.length)]
    }
    if (kind === 'dec') {
        const places = Math.min(4, ((slot.text.match(/[.,](\d+)/) || [])[1] || '').length || 2);
        const factors = [0.5, 0.75, 1.25, 1.5, 2, 0.6, 1.8, 2.5];
        /* Границы могут отсечь часть вариантов — перебираем, пока не найдём новый. */
        for (let attempt = 0; attempt < 8; attempt++) {
            const factor = factors[Math.floor(rnd() * factors.length)];
            const next = clamp(Number((value * factor).toFixed(places)));
            if (!aiNumSame(next, value)) return next
        }
        return null
    }
    const factors = Math.abs(value) >= 20 ? [0.5, 0.6, 0.75, 1.25, 1.5, 2] : [0.5, 0.75, 1.25, 1.5, 2];
    const deltas = [-3, -2, -1, 1, 2, 3];
    /* Диапазон известен: половину раз берём любое значение из него — так
       вариант не «ходит» вокруг одного и того же числа. */
    if (min !== null && max !== null && max > min && rnd() < 0.5) {
        const span = Math.floor(max) - Math.ceil(min);
        if (span > 0) {
            const from = Math.ceil(min), to = Math.floor(max);
            for (let attempt = 0; attempt < 6; attempt++) {
                const candidate = from + Math.floor(rnd() * (span + 1));
                if (!aiNumSame(candidate, value)) return candidate
            }
        }
    }
    for (let attempt = 0; attempt < 6; attempt++) {
        const useFactor = Math.abs(value) >= 20 && rnd() < 0.6;
        const candidate = useFactor
            ? clamp(Math.round(value * factors[Math.floor(rnd() * factors.length)]))
            : clamp(value + deltas[Math.floor(rnd() * deltas.length)]);
        if (aiNumSame(candidate, value)) continue;
        /* Счётчик не превращаем в ноль или дробь без явной границы. */
        if (value >= 1 && candidate < 1 && min === null) continue;
        return candidate
    }
    return null
}

/* Суммы, средние и доли нужны и правилам, и разбору. */
function aiNumStats(values) {
    const list = values.filter(value => Number.isFinite(value));
    if (!list.length) return null;
    const sorted = list.slice().sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, value) => acc + value, 0);
    const mean = sum / count;
    const middle = Math.floor(count / 2);
    const median = count % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    const tally = new Map();
    for (const value of sorted) tally.set(value, (tally.get(value) || 0) + 1);
    let top = 0;
    for (const times of tally.values()) top = Math.max(top, times);
    const modes = [...tally.keys()].filter(value => tally.get(value) === top).sort((a, b) => a - b);
    const variance = sorted.reduce((acc, value) => acc + (value - mean) ** 2, 0) / count;
    return {
        count: count, sum: sum, min: sorted[0], max: sorted[count - 1], range: sorted[count - 1] - sorted[0],
        mean: mean, median: median, mode: top > 1 && modes.length === 1 ? modes[0] : null,
        variance: variance, sd: Math.sqrt(variance), sorted: sorted
    }
}

function aiNumRound(value, places) {
    return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(places === undefined ? 6 : places)) : value
}

/* Список чисел для разбора: «0,3; 0,5; 0,2». */
function aiNumList(values) {
    return values.map(value => aiNumFormat(String(aiNumRound(value, 4)), Number(value))).join('; ')
}

/* ---- Позиции чисел в тексте задания ---------------------------------- */

/* Задание показывается на языке интерфейса: числа те же и в том же порядке,
   поэтому позиции слотов переносятся по порядку. Если тексты расходятся,
   вариант не создаём — лучше показать задание курса, чем испортить условие. */
function aiNumLocateSlots(baseQuestion, targetQuestion, slots) {
    const baseTokens = aiNumListTokens(String(baseQuestion), aiNumTokens(baseQuestion));
    const targetTokens = aiNumListTokens(String(targetQuestion), aiNumTokens(targetQuestion));
    if (!baseTokens.length || baseTokens.length !== targetTokens.length) return null;
    for (let i = 0; i < baseTokens.length; i++) {
        if (!aiNumSame(baseTokens[i].value, targetTokens[i].value)) return null
    }
    const located = [];
    for (const slot of slots) {
        /* Слот может занимать часть токена: «2» внутри «−2» в D(3X−2Y). */
        const index = baseTokens.findIndex((token, i) => !located.some(item => item.index === i)
            && slot.start >= token.start && slot.end <= token.end);
        if (index < 0) return null;
        const baseToken = baseTokens[index], targetToken = targetTokens[index];
        const shift = Math.max(0, slot.start - baseToken.start);
        const length = slot.end - slot.start;
        const text = targetToken.text.slice(shift, shift + length) || targetToken.text;
        located.push({name: slot.name, index: index, text: text, value: aiNumValue(text) === null ? targetToken.value : aiNumValue(text),
            start: targetToken.start + shift, end: targetToken.start + shift + text.length})
    }
    return located
}

function aiNumRewrite(text, replacements) {
    let out = String(text == null ? '' : text);
    for (const item of replacements.slice().sort((a, b) => b.start - a.start)) {
        out = out.slice(0, item.start) + item.text + out.slice(item.end)
    }
    return out
}

/* ---- Согласование таблиц и графика ----------------------------------- */

function aiNumMirrorTable(table, from, to) {
    if (!table || !Array.isArray(table.rows) || !from.length) return table;
    const cells = [];
    table.rows.forEach((row, r) => (row || []).forEach((cell, c) => {
        const value = aiNumValue(cell);
        if (value !== null) cells.push({r: r, c: c, value: value, text: String(cell)})
    }));
    if (cells.length !== from.length) return table;
    const pool = cells.slice();
    const pairs = [];
    for (const value of from) {
        const index = pool.findIndex(cell => aiNumSame(cell.value, value));
        if (index < 0) return table;
        pairs.push(pool[index]);
        pool.splice(index, 1)
    }
    const rows = table.rows.map(row => (row || []).slice());
    pairs.forEach((cell, i) => { rows[cell.r][cell.c] = aiNumFormat(cell.text, to[i]) });
    return Object.assign({}, table, {rows: rows})
}

function aiNumMirrorSeries(series, from, to) {
    if (!Array.isArray(series) || series.length !== from.length) return series;
    const pool = series.map((value, i) => ({value: Number(value), i: i}));
    const order = [];
    for (const value of from) {
        const index = pool.findIndex(cell => aiNumSame(cell.value, value));
        if (index < 0) return series;
        order.push(pool[index].i);
        pool.splice(index, 1)
    }
    const out = series.slice();
    order.forEach((position, i) => { out[position] = to[i] });
    return out
}

function aiNumMirrorData(task, from, to) {
    const patch = {};
    if (!from.length) return patch;
    const tables = task.inputTables || [];
    if (tables.length) {
        const next = tables.map(table => aiNumMirrorTable(table, from, to));
        if (next.some((table, i) => table !== tables[i])) patch.inputTables = next
    }
    if (task.chart && Array.isArray(task.chart.ys)) {
        const ys = aiNumMirrorSeries(task.chart.ys, from, to);
        if (ys !== task.chart.ys) patch.chart = Object.assign({}, task.chart, {ys: ys})
    }
    return patch
}

/* ---- Правила пересчёта ------------------------------------------------ */
/* У каждого правила: re по русскому оригиналу условия, order — имена групп с
   числами в порядке появления в тексте, calc — ответ по числам, check —
   правдоподобность новых чисел, steps — короткое решение для разбора.
   keep — числа, которые не меняем (округления, число интервалов),
   derived — числа, которые считаются из остальных. */

const AI_NUM_RULES = [
    {
        id: 'relative-frequency',
        re: /В ходе (?<n>\d+) испытаний некоторое событие произошло (?<m>\d+) раз/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'frequency-volume',
        re: /Объем выборки равен (?<n>\d+)\. Значение [^.]*встречается в ней (?<m>\d+) раз/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'frequency-count',
        re: /Частота события (?<w>\d+(?:[.,]\d+)?) в серии (?<n>\d+) опытов\. Сколько раз произошло событие/,
        order: ['w', 'n'],
        spec: {w: {kind: 'prob', min: 0.05, max: 0.8}},
        check: args => args.n >= 5 && args.w > 0 && args.w < 1 && Number.isInteger(args.w * args.n),
        calc: args => Math.round(args.w * args.n),
        steps: (args, answer, fmt) => `${fmt(args.w)} · ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'walkers',
        re: /Из (?<n>\d+) учеников (?<m>\d+) приходят пешком\. Найдите относительную частоту/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'failures',
        re: /Из (?<n>\d+) проверок (?<m>\d+) успешны\. Найдите частоту неуспеха/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n && args.n - args.m <= 20,
        calc: args => (args.n - args.m) / args.n,
        steps: (args, answer, fmt) => `(${fmt(args.n)} - ${fmt(args.m)}) / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'section-share',
        re: /Из (?<n>\d+) учеников (?<m>\d+) посещают секцию; среди них (?<k>\d+) идут пешком/,
        order: ['n', 'm', 'k'],
        check: args => args.k > 0 && args.k < args.m && args.m < args.n,
        calc: args => args.k / args.m,
        steps: (args, answer, fmt) => `${fmt(args.k)} / ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'project-share',
        re: /Из (?<n>\d+) учеников (?<m>\d+) посещают кружок\. Среди посещающих (?<k>\d+) выбрали проект/,
        order: ['n', 'm', 'k'],
        check: args => args.k > 0 && args.k < args.m && args.m <= args.n,
        calc: args => args.k / args.m,
        steps: (args, answer, fmt) => `${fmt(args.k)} / ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'conditional-frequency',
        re: /В группе B (?<n>\d+) человек\. Событие A произошло у (?<m>\d+)/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'answers-included',
        re: /Из (?<n>\d+) заявленных участников (?<m>\d+) не ответили\. Сколько ответов включено в данные/,
        order: ['n', 'm'],
        check: args => args.m > 2 && args.m < args.n / 2,
        calc: args => args.n - args.m,
        steps: (args, answer, fmt) => `${fmt(args.n)} - ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'pooled-frequency',
        re: /В первой серии (?<m1>\d+) успехов из (?<n1>\d+), во второй (?<m2>\d+) из (?<n2>\d+)\. Найдите частоту в объединённой серии/,
        order: ['m1', 'n1', 'm2', 'n2'],
        check: args => args.m1 > 0 && args.m2 > 0 && args.m1 < args.n1 && args.m2 < args.n2,
        calc: args => (args.m1 + args.m2) / (args.n1 + args.n2),
        steps: (args, answer, fmt) => `(${fmt(args.m1)} + ${fmt(args.m2)}) / (${fmt(args.n1)} + ${fmt(args.n2)}) = ${fmt(answer)}`
    },
    {
        id: 'group-shares',
        re: /В группе (?<n>\d+) человек: (?<a>\d+) выбрали А, (?<b>\d+) — Б, остальные — В\. Заполните доли/,
        order: ['n', 'a', 'b'],
        check: args => args.a > 0 && args.b > 0 && args.a + args.b < args.n,
        calc: args => [args.a / args.n, args.b / args.n, (args.n - args.a - args.b) / args.n],
        steps: (args, answer) => `${aiNumList(answer)}`
    },
    {
        id: 'frequency-shares',
        re: /Объём выборки (?<n>\d+)\. Для трёх вариантов частоты равны (?<a>\d+), (?<b>\d+) и (?<c>\d+)\. Заполните относительные частоты/,
        order: ['n', 'a', 'b', 'c'],
        derived: {n: args => args.a + args.b + args.c},
        check: args => Math.min(args.a, args.b, args.c) > 0 && args.a + args.b + args.c <= 60,
        calc: args => [args.a / args.n, args.b / args.n, args.c / args.n],
        steps: (args, answer) => `${aiNumList(answer)}`
    },
    {
        id: 'frequency-volume-shares',
        re: /Для частот (?<a>\d+);(?<b>\d+);(?<c>\d+) найдите объём и три доли/,
        order: ['a', 'b', 'c'],
        check: args => Math.min(args.a, args.b, args.c) > 0 && args.a + args.b + args.c <= 40,
        calc: args => {
            const total = args.a + args.b + args.c;
            return [total, args.a / total, args.b / total, args.c / total]
        },
        steps: (args, answer) => `${aiNumList(answer)}`
    },
    {
        id: 'weighted-mark',
        re: /Оценки (?<v1>\d+(?:[.,]\d+)?), (?<v2>\d+(?:[.,]\d+)?), (?<v3>\d+(?:[.,]\d+)?) встречаются (?<f1>\d+), (?<f2>\d+), (?<f3>\d+) раза?\. Найдите среднюю оценку/,
        order: ['v1', 'v2', 'v3', 'f1', 'f2', 'f3'],
        spec: {v1: {kind: 'dec', min: 1, max: 5}, v2: {kind: 'dec', min: 1, max: 5}, v3: {kind: 'dec', min: 1, max: 5}},
        check: args => args.f1 > 0 && args.f2 > 0 && args.f3 > 0,
        calc: args => (args.v1 * args.f1 + args.v2 * args.f2 + args.v3 * args.f3) / (args.f1 + args.f2 + args.f3),
        steps: (args, answer, fmt) => `(${fmt(args.v1)}·${fmt(args.f1)} + ${fmt(args.v2)}·${fmt(args.f2)} + ${fmt(args.v3)}·${fmt(args.f3)}) / (${fmt(args.f1)} + ${fmt(args.f2)} + ${fmt(args.f3)}) = ${fmt(answer)}`
    },
    {
        id: 'urn-moments',
        re: /Для урны с (?<white>\d+) белыми и (?<black>\d+) чёрными, n=(?<n>\d+) найдите моменты числа белых/,
        order: ['white', 'black', 'n'],
        check: args => args.n > 0 && args.n < args.white + args.black,
        calc: args => {
            const total = args.white + args.black, share = args.white / total;
            return [args.n * share, args.n * share * (1 - share) * (total - args.n) / (total - 1)]
        },
        steps: (args, answer) => `${aiNumList(answer)}`
    },
    {
        id: 'geometric-first-success',
        re: /Вероятность успеха (?<p>\d+(?:[.,]\d+)?)\. Какова вероятность первого успеха на (?<w>[а-яё]+) попытке/,
        order: ['p'],
        fixed: {k: {group: 'w'}},
        check: args => args.p > 0 && args.p < 1 && args.k > 0,
        calc: args => (1 - args.p) ** (args.k - 1) * args.p,
        steps: (args, answer, fmt) => `(1 - ${fmt(args.p)})^${args.k - 1} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-cdf',
        re: /При p=(?<p>\d+(?:[.,]\d+)?) найдите вероятность успеха не позднее (?<w>[а-яё]+) попытки/,
        order: ['p'],
        fixed: {k: {group: 'w'}},
        check: args => args.p > 0 && args.p < 1 && args.k > 0,
        calc: args => 1 - (1 - args.p) ** args.k,
        steps: (args, answer, fmt) => `1 - (1 - ${fmt(args.p)})^${args.k} = ${fmt(answer)}`
    },
    {
        id: 'poisson-expectation',
        re: /Пуассоновская модель с λ=(?<l>\d+(?:[.,]\d+)?)\. Найдите ожидание/,
        order: ['l'],
        check: args => args.l > 0,
        calc: args => args.l,
        steps: (args, answer, fmt) => `M(X) = λ = ${fmt(answer)}`
    },
    {
        id: 'poisson-probability',
        re: /Пуассоновская модель с λ=(?<l>\d+(?:[.,]\d+)?)\. Найдите P\(X=(?<k>\d+)\), округлите до (?<d>\d+(?:[.,]\d+)?)/,
        order: ['l', 'k', 'd'],
        keep: ['d'],
        spec: {k: {kind: 'int', min: 0, max: 6}},
        check: args => args.l > 0 && args.k >= 0 && args.k <= 6,
        calc: args => {
            let factorial = 1;
            for (let i = 2; i <= args.k; i++) factorial *= i;
            return Math.exp(-args.l) * args.l ** args.k / factorial
        },
        steps: (args, answer, fmt) => `e^(-${fmt(args.l)}) · ${fmt(args.l)}^${args.k} / ${args.k}! = ${fmt(answer)}`
    },
    {
        id: 'uniform-interval-clipped',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);\s*(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите P\((?<c>[−-]?\d+(?:[.,]\d+)?)\s*≤\s*X\s*≤\s*(?<d>[−-]?\d+(?:[.,]\d+)?)\)/,
        order: ['a', 'b', 'c', 'd'],
        check: args => args.b > args.a && args.d > args.c && Math.min(args.d, args.b) > Math.max(args.c, args.a),
        calc: args => (Math.min(args.d, args.b) - Math.max(args.c, args.a)) / (args.b - args.a),
        steps: (args, answer, fmt) => `(${fmt(Math.min(args.d, args.b))} - ${aiNumTerm(Math.max(args.c, args.a), fmt)}) / (${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'uniform-variance-digits',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);\s*(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите D\(X\)/,
        order: ['a', 'b'],
        derived: {b: (args, rnd) => args.a + [6, 12, 24][Math.floor(rnd() * 3)]},
        check: args => args.b > args.a,
        calc: args => (args.b - args.a) ** 2 / 12,
        steps: (args, answer, fmt) => `(${fmt(args.b)} - ${aiNumTerm(args.a, fmt)})² / 12 = ${fmt(answer)}`
    },
    {
        id: 'uniform-expectation',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите M\(X\)/,
        order: ['a', 'b'],
        check: args => args.b > args.a,
        calc: args => (args.a + args.b) / 2,
        steps: (args, answer, fmt) => `(${fmt(args.a)} + ${fmt(args.b)}) / 2 = ${fmt(answer)}`
    },
    {
        id: 'uniform-interval',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите P\((?<c>[−-]?\d+(?:[.,]\d+)?)≤X≤(?<d>[−-]?\d+(?:[.,]\d+)?)\)/,
        order: ['a', 'b', 'c', 'd'],
        check: args => args.b > args.a && args.d > args.c && args.c >= args.a && args.d <= args.b,
        calc: args => (args.d - args.c) / (args.b - args.a),
        steps: (args, answer, fmt) => `(${fmt(args.d)} - ${aiNumTerm(args.c, fmt)}) / (${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'uniform-density',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);\s*(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите плотность/,
        order: ['a', 'b'],
        check: args => args.b > args.a,
        calc: args => 1 / (args.b - args.a),
        steps: (args, answer, fmt) => `1 / (${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'uniform-left-tail',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите P\(X≤(?<c>[−-]?\d+(?:[.,]\d+)?)\)/,
        order: ['a', 'b', 'c'],
        keep: ['c'],
        check: args => args.b > args.a && args.c > args.a && args.c < args.b,
        calc: args => (args.c - args.a) / (args.b - args.a),
        steps: (args, answer, fmt) => `(${fmt(args.c)} - ${aiNumTerm(args.a, fmt)}) / (${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'uniform-wait',
        re: /Равномерное ожидание автобуса на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите вероятность ждать больше (?<t>[−-]?\d+(?:[.,]\d+)?) минут/,
        order: ['a', 'b', 't'],
        check: args => args.b > args.a && args.t > args.a && args.t < args.b,
        calc: args => (args.b - args.t) / (args.b - args.a),
        steps: (args, answer, fmt) => `(${fmt(args.b)} - ${fmt(args.t)}) / (${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'interval-density',
        re: /На интервале длиной (?<len>\d+(?:[.,]\d+)?) постоянная плотность (?<d>\d+(?:[.,]\d+)?)\. Найдите вероятность этого интервала/,
        order: ['len', 'd'],
        check: args => args.len > 0 && args.d > 0 && args.d * args.len <= 1,
        calc: args => args.len * args.d,
        steps: (args, answer, fmt) => `${fmt(args.len)} · ${fmt(args.d)} = ${fmt(answer)}`
    },
    {
        id: 'density-of-interval',
        re: /Плотность вероятности НСВ задана на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\] формулой f\(x\) = (?<d>\d+(?:[.,]\d+)?)\. Чему равна вероятность интервала \[(?<c1>[−-]?\d+(?:[.,]\d+)?);(?<c2>[−-]?\d+(?:[.,]\d+)?)\]/,
        order: ['a', 'b', 'c1', 'c2'],
        keep: ['a', 'c1'],
        derived: {d: args => 1 / (args.b - args.a)},
        spec: {d: {kind: 'dec', min: 0.01}},
        check: args => args.b > args.a && args.c2 > args.c1 && args.c1 >= args.a && args.c2 <= args.b,
        calc: args => args.d * (args.c2 - args.c1),
        steps: (args, answer, fmt) => `${fmt(args.d)} · (${fmt(args.c2)} - ${aiNumTerm(args.c1, fmt)}) = ${fmt(answer)}`
    },
    {
        id: 'uniform-cdf',
        re: /X равномерна на \[(?<a>[−-]?\d+(?:[.,]\d+)?);(?<b>[−-]?\d+(?:[.,]\d+)?)\]\. Найдите F\((?<c1>[−-]?\d+(?:[.,]\d+)?)\), F\((?<c2>[−-]?\d+(?:[.,]\d+)?)\), F\((?<c3>[−-]?\d+(?:[.,]\d+)?)\)/,
        order: ['a', 'b', 'c1', 'c2', 'c3'],
        keep: ['c1', 'c2', 'c3'],
        check: args => args.b > args.a && args.c1 >= args.a && args.c3 <= args.b && args.c1 < args.c2 && args.c2 < args.c3,
        calc: args => [args.c1, args.c2, args.c3].map(value => (value - args.a) / (args.b - args.a)),
        steps: (args, answer, fmt) => `${aiNumList(answer)}`
    },
    {
        id: 'coin-toss-frequency',
        re: /После (?<n>\d+(?:[\s\u00a0]\d{3})+|\d+) бросков монеты орёл выпал (?<m>\d+) раз\. Найдите частоту/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n && args.n >= 100,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'toss-frequency',
        re: /При (?<n>\d+(?:[\s\u00a0]\d{3})+|\d+) подбрасываниях монеты орел выпал (?<m>\d+) раз\. Чему равна относительная частота/,
        order: ['n', 'm'],
        check: args => args.m > 0 && args.m < args.n && args.n >= 100,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'frequency-deviation',
        re: /При теоретическом p=(?<p>\d+(?:[.,]\d+)?) найдите абсолютное отклонение частоты (?<w>\d+(?:[.,]\d+)?)/,
        order: ['p', 'w'],
        check: args => args.p > 0 && args.p < 1 && args.w > 0 && args.w < 1 && !aiNumSame(args.p, args.w),
        calc: args => Math.abs(args.w - args.p),
        steps: (args, answer, fmt) => `|${fmt(args.w)} - ${fmt(args.p)}| = ${fmt(answer)}`
    },
    {
        id: 'payments-expectation',
        re: /Ожидание одной независимой выплаты (?<a>\d+(?:[.,]\d+)?)\. Найдите ожидание суммы (?<n>\d+) выплат/,
        order: ['a', 'n'],
        check: args => args.a > 0 && args.n > 1,
        calc: args => args.a * args.n,
        steps: (args, answer, fmt) => `${fmt(args.a)} · ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'variance-of-mean',
        re: /Независимые одинаково распределённые X имеют D=(?<d>\d+(?:[.,]\d+)?)\. Найдите дисперсию среднего (?<n>\d+) наблюдений/,
        order: ['d', 'n'],
        check: args => args.d > 0 && args.n > 1 && args.n <= 200,
        calc: args => args.d / args.n,
        steps: (args, answer, fmt) => `${fmt(args.d)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'mean-shrink',
        re: /При увеличении n с (?<n1>\d+) до (?<n2>\d+) во сколько раз уменьшается σ среднего/,
        order: ['n1', 'n2'],
        check: args => args.n2 > args.n1 && args.n1 >= 10 && args.n2 <= 2000,
        calc: args => Math.sqrt(args.n2 / args.n1),
        steps: (args, answer, fmt) => `√(${fmt(args.n2)} / ${fmt(args.n1)}) = ${fmt(answer)}`
    },
    {
        id: 'successes-expectation',
        re: /В независимых испытаниях p=(?<p>\d+(?:[.,]\d+)?)\. При n=(?<n>\d+) чему равно ожидаемое число успехов/,
        order: ['p', 'n'],
        check: args => args.p > 0 && args.p < 1 && args.n > 10,
        calc: args => args.p * args.n,
        steps: (args, answer, fmt) => `${fmt(args.p)} · ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'variance-to-sd',
        re: /D\(X\)=(?<a>\d+(?:[.,]\d+)?)\. Найдите σ\(X\)/,
        order: ['a'],
        derived: {a: (args, rnd) => (2 + Math.floor(rnd() * 5)) ** 2},
        check: args => args.a > 0,
        calc: args => Math.sqrt(args.a),
        steps: (args, answer, fmt) => `σ(X) = √${fmt(args.a)} = ${fmt(answer)}`
    },
    {
        id: 'sd-to-variance',
        re: /σ\(X\)=(?<s>\d+(?:[.,]\d+)?)\. Найдите D\(X\)/,
        order: ['s'],
        check: args => args.s > 0,
        calc: args => args.s ** 2,
        steps: (args, answer, fmt) => `D(X) = ${fmt(args.s)}² = ${fmt(answer)}`
    },
    {
        id: 'variance-scale',
        re: /D\(X\)=(?<a>\d+(?:[.,]\d+)?)\. Найдите D\((?<b>[−-]?\d+)X(?:\+(?<c>[−-]?\d+(?:[.,]\d+)?))?\)/,
        order: ['a', 'b', 'c'],
        spec: {b: {kind: 'int', min: -6, max: 6}},
        check: args => args.a > 0 && args.b !== 0 && args.b !== 1 && args.b !== -1,
        calc: args => args.b ** 2 * args.a,
        steps: (args, answer, fmt) => `${fmt(args.b)}² · ${fmt(args.a)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-scale',
        re: /M\(X\)=(?<a>[−-]?\d+(?:[.,]\d+)?)[^.]*\. Найдите M\((?<b>[−-]?\d+)X(?:\+(?<c>[−-]?\d+(?:[.,]\d+)?))?\)/,
        order: ['a', 'b', 'c'],
        spec: {b: {kind: 'int', min: -6, max: 6}},
        check: args => args.b !== 0 && args.b !== 1,
        calc: args => args.b * args.a + (args.c === undefined ? 0 : args.c),
        steps: (args, answer, fmt) => `${fmt(args.b)} · ${fmt(args.a)}${args.c === undefined ? '' : (args.c < 0 ? ` - ${fmt(-args.c)}` : ` + ${fmt(args.c)}`)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-combination',
        re: /M\(X\)=(?<a>[−-]?\d+(?:[.,]\d+)?), M\(Y\)=(?<b>[−-]?\d+(?:[.,]\d+)?)\. Найдите M\((?<c>[−-]?\d+)X(?<d>[+−-]\d+(?:[.,]\d+)?)Y\)/,
        order: ['a', 'b', 'c', 'd'],
        spec: {c: {kind: 'int', min: 2, max: 5}},
        check: args => args.c !== 0 && args.d !== 0 && Math.abs(args.d) <= 9,
        calc: args => args.c * args.a + args.d * args.b,
        steps: (args, answer, fmt) => `${fmt(args.c)}·${fmt(args.a)} ${args.d < 0 ? '-' : '+'} ${fmt(Math.abs(args.d))}·${fmt(args.b)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-sum',
        re: /M\(X\)=(?<a>[−-]?\d+(?:[.,]\d+)?), M\(Y\)=(?<b>[−-]?\d+(?:[.,]\d+)?)\. Найдите M\(X\+Y\)/,
        order: ['a', 'b'],
        calc: args => args.a + args.b,
        steps: (args, answer, fmt) => `${fmt(args.a)} + ${fmt(args.b)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-constant',
        re: /Постоянная величина равна (?<a>[−-]?\d+(?:[.,]\d+)?)\. Найдите её ожидание/,
        order: ['a'],
        check: args => args.a !== 0,
        calc: args => args.a,
        steps: (args, answer, fmt) => `M(C) = ${fmt(answer)}`
    },
    {
        id: 'expectation-indicator',
        re: /Индикатор успеха имеет p=(?<p>\d+(?:[.,]\d+)?)\. Найдите его ожидание/,
        order: ['p'],
        check: args => args.p > 0 && args.p < 1,
        calc: args => args.p,
        steps: (args, answer, fmt) => `M(X) = p = ${fmt(answer)}`
    },
    {
        id: 'expectation-trials',
        re: /В (?<n>\d+) независимых проверках вероятность успеха каждой (?<p>\d+(?:[.,]\d+)?)\. Найдите ожидаемое число успехов/,
        order: ['n', 'p'],
        check: args => args.n >= 3 && args.p > 0 && args.p < 1,
        calc: args => aiNumRound(args.n * args.p, 6),
        steps: (args, answer, fmt) => `${fmt(args.n)} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-prize',
        re: /Приз равен (?<prize>\d+(?:[.,]\d+)?) с вероятностью (?<p>\d+(?:[.,]\d+)?), иначе 0\. Вход стоит (?<cost>\d+(?:[.,]\d+)?)\. Найдите ожидание чистого результата/,
        order: ['prize', 'p', 'cost'],
        check: args => args.p > 0 && args.p < 1 && args.prize > 0 && args.cost > 0 && args.prize * args.p < args.cost,
        calc: args => aiNumRound(args.prize * args.p - args.cost, 6),
        steps: (args, answer, fmt) => `${fmt(args.prize)} · ${fmt(args.p)} - ${fmt(args.cost)} = ${fmt(answer)}`
    },
    {
        id: 'expectation-solve-x',
        re: /X принимает 1 и x с вероятностями (?<p1>\d+(?:[.,]\d+)?) и (?<p2>\d+(?:[.,]\d+)?)\. M\(X\)=(?<m>\d+(?:[.,]\d+)?)\. Найдите x/,
        order: ['p1', 'p2', 'm'],
        check: args => Math.abs(args.p1 + args.p2 - 1) < 0.001 && args.p2 > 0.05 && args.m > args.p1,
        calc: args => (args.m - args.p1) / args.p2,
        steps: (args, answer, fmt) => `(${fmt(args.m)} - ${fmt(args.p1)}) / ${fmt(args.p2)} = ${fmt(answer)}`
    },
    {
        id: 'variance-sum',
        re: /Независимые X и Y имеют (?:D\(X\)=|дисперсии )(?<a>\d+(?:[.,]\d+)?)(?:, D\(Y\)=| и )(?<b>\d+(?:[.,]\d+)?)\. Найдите D\(X[+−-]Y\)/,
        order: ['a', 'b'],
        calc: args => args.a + args.b,
        steps: (args, answer, fmt) => `${fmt(args.a)} + ${fmt(args.b)} = ${fmt(answer)}`
    },
    {
        id: 'variance-combination',
        re: /Независимые X,Y: D\(X\)=(?<a>\d+(?:[.,]\d+)?), D\(Y\)=(?<b>\d+(?:[.,]\d+)?)\. Найдите D\((?<c>[−-]?\d+)X[+−-](?<d>[−-]?\d+)Y\)/,
        order: ['a', 'b', 'c', 'd'],
        spec: {c: {kind: 'int', min: 2, max: 4}, d: {kind: 'int', min: 2, max: 4}},
        check: args => args.c > 0 && args.d > 0,
        calc: args => args.c ** 2 * args.a + args.d ** 2 * args.b,
        steps: (args, answer, fmt) => `${fmt(args.c)}²·${fmt(args.a)} + ${fmt(args.d)}²·${fmt(args.b)} = ${fmt(answer)}`
    },
    {
        id: 'coin-binomial',
        re: /Монету подбрасывают (?<n>\d+) раза?\. Какова вероятность ровно (?<k>\d+) выпаданий орла/,
        order: ['n', 'k'],
        spec: {n: {kind: 'int', min: 3, max: 8}, k: {kind: 'int', min: 1, max: 4}},
        check: args => args.k > 0 && args.k < args.n,
        calc: args => {
            let pick = 1;
            for (let i = 1; i <= args.k; i++) pick = pick * (args.n - args.k + i) / i;
            return pick / 2 ** args.n
        },
        steps: (args, answer, fmt) => `C(${args.n}, ${args.k}) / 2^${args.n} = ${fmt(answer)}`
    },
    {
        id: 'binomial-probability',
        re: /n=(?<n>\d+), p=(?<p>\d+(?:[.,]\d+)?)\. Найдите P\(X=(?<k>\d+)\)/,
        order: ['n', 'p', 'k'],
        spec: {n: {kind: 'int', min: 3, max: 12}},
        check: args => args.k >= 0 && args.k <= args.n && args.p > 0 && args.p < 1,
        calc: args => {
            let pick = 1;
            for (let i = 1; i <= args.k; i++) pick = pick * (args.n - args.k + i) / i;
            return pick * args.p ** args.k * (1 - args.p) ** (args.n - args.k)
        },
        steps: (args, answer, fmt) => `C(${args.n}, ${args.k}) · ${fmt(args.p)}^${args.k} · (1 - ${fmt(args.p)})^${args.n - args.k} = ${fmt(answer)}`
    },
    {
        id: 'binomial-tail',
        re: /n=(?<n>\d+), p=(?<p>\d+(?:[.,]\d+)?)\. Найдите P\(X≥(?<k>\d+)\)/,
        order: ['n', 'p', 'k'],
        spec: {n: {kind: 'int', min: 3, max: 10}, k: {kind: 'int', min: 1, max: 4}},
        check: args => args.k >= 1 && args.k <= args.n && args.p > 0 && args.p < 1,
        calc: args => {
            const term = k => {
                let pick = 1;
                for (let i = 1; i <= k; i++) pick = pick * (args.n - k + i) / i;
                return pick * args.p ** k * (1 - args.p) ** (args.n - k)
            };
            let total = 0;
            for (let k = args.k; k <= args.n; k++) total += term(k);
            return total
        },
        steps: (args, answer, fmt) => `P(X≥${args.k}) = ${fmt(answer)} (n=${args.n}, p=${fmt(args.p)})`
    },
    {
        id: 'binomial-mean',
        re: /n=(?<n>\d+), p=(?<p>\d+(?:[.,]\d+)?)\. Найдите M\(X\)/,
        order: ['n', 'p'],
        check: args => args.n > 0 && args.p > 0 && args.p < 1,
        calc: args => aiNumRound(args.n * args.p, 6),
        steps: (args, answer, fmt) => `${fmt(args.n)} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'binomial-variance',
        re: /n=(?<n>\d+), p=(?<p>\d+(?:[.,]\d+)?)\. Найдите D\(X\)/,
        order: ['n', 'p'],
        check: args => args.n > 0 && args.p > 0 && args.p < 1,
        calc: args => aiNumRound(args.n * args.p * (1 - args.p), 6),
        steps: (args, answer, fmt) => `${fmt(args.n)} · ${fmt(args.p)} · (1 - ${fmt(args.p)}) = ${fmt(answer)}`
    },
    {
        id: 'binomial-sd',
        re: /n=(?<n>\d+), p=(?<p>\d+(?:[.,]\d+)?)\. Найдите стандартное отклонение, округлите до (?<d>\d+(?:[.,]\d+)?)/,
        order: ['n', 'p', 'd'],
        keep: ['d'],
        check: args => args.n > 1 && args.p > 0 && args.p < 1,
        calc: args => Math.sqrt(args.n * args.p * (1 - args.p)),
        steps: (args, answer, fmt) => `√(${fmt(args.n)} · ${fmt(args.p)} · (1 - ${fmt(args.p)})) = ${fmt(answer)}`
    },
    {
        id: 'binomial-find-p',
        re: /Ожидаемое число успехов (?<m>\d+) при n=(?<n>\d+)\. Найдите p/,
        order: ['m', 'n'],
        check: args => args.m > 0 && args.m < args.n && args.n % args.m === 0,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'binomial-find-n',
        re: /Нужно среднее число успехов (?<m>\d+) при p=(?<p>\d+(?:[.,]\d+)?)\. Какое n/,
        order: ['m', 'p'],
        check: args => args.m > 0 && args.p > 0 && args.p < 1 && Number.isInteger(args.m / args.p),
        calc: args => args.m / args.p,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-mean',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите M\(X\)/,
        order: ['p'],
        check: args => args.p > 0 && args.p <= 0.5,
        calc: args => 1 / args.p,
        steps: (args, answer, fmt) => `M(X) = 1 / ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-variance',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите D\(X\)/,
        order: ['p'],
        check: args => args.p > 0 && args.p <= 0.5,
        calc: args => (1 - args.p) / args.p ** 2,
        steps: (args, answer, fmt) => `D(X) = (1 - ${fmt(args.p)}) / ${fmt(args.p)}² = ${fmt(answer)}`
    },
    {
        id: 'geometric-mass',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите P\(X=(?<k>\d+)\)/,
        order: ['p', 'k'],
        spec: {k: {kind: 'int', min: 1, max: 5}},
        check: args => args.p > 0 && args.p < 1 && args.k >= 1,
        calc: args => (1 - args.p) ** (args.k - 1) * args.p,
        steps: (args, answer, fmt) => `(1 - ${fmt(args.p)})^${args.k - 1} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-tail',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите P\(X>(?<k>\d+)\)/,
        order: ['p', 'k'],
        spec: {k: {kind: 'int', min: 1, max: 6}},
        check: args => args.p > 0 && args.p < 1 && args.k >= 1,
        calc: args => (1 - args.p) ** args.k,
        steps: (args, answer, fmt) => `(1 - ${fmt(args.p)})^${args.k} = ${fmt(answer)}`
    },
    {
        id: 'geometric-cdf-value',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите P\(X≤(?<k>\d+)\)/,
        order: ['p', 'k'],
        spec: {k: {kind: 'int', min: 1, max: 6}},
        check: args => args.p > 0 && args.p < 1 && args.k >= 1,
        calc: args => 1 - (1 - args.p) ** args.k,
        steps: (args, answer, fmt) => `1 - (1 - ${fmt(args.p)})^${args.k} = ${fmt(answer)}`
    },
    {
        id: 'mean-to-sum',
        re: /Среднее (?<w>[а-яё]+) чисел равно (?<m>\d+(?:[.,]\d+)?)\. Чему равна их сумма/,
        order: ['m'],
        fixed: {n: {group: 'w'}},
        check: args => args.n >= 3 && args.m > 0,
        calc: args => args.n * args.m,
        steps: (args, answer, fmt) => `${args.n} · ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'mean-after-add',
        re: /Среднее (?<w>[а-яё]+) наблюдений (?<m>\d+(?:[.,]\d+)?)\. Добавили значение (?<v>\d+(?:[.,]\d+)?)\. Найдите новое среднее/,
        order: ['m', 'v'],
        fixed: {n: {group: 'w'}},
        check: args => args.n >= 2 && args.m > 0 && args.v > 0,
        calc: args => (args.n * args.m + args.v) / (args.n + 1),
        steps: (args, answer, fmt) => `(${args.n} · ${fmt(args.m)} + ${fmt(args.v)}) / ${args.n + 1} = ${fmt(answer)}`
    },
    {
        id: 'mean-shift',
        re: /Все значения увеличили на (?<d>\d+(?:[.,]\d+)?)\. Среднее было (?<m>\d+(?:[.,]\d+)?)\. Какое стало/,
        order: ['d', 'm'],
        check: args => args.d !== 0,
        calc: args => args.m + args.d,
        steps: (args, answer, fmt) => `${fmt(args.m)} + ${fmt(args.d)} = ${fmt(answer)}`
    },
    {
        id: 'median-scale',
        re: /Все значения умножили на (?<k>\d+(?:[.,]\d+)?)\. Медиана была (?<m>\d+(?:[.,]\d+)?)\. Какой стала/,
        order: ['k', 'm'],
        check: args => args.k > 1,
        calc: args => args.k * args.m,
        steps: (args, answer, fmt) => `${fmt(args.k)} · ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'interval-width',
        re: /Минимум равен (?<a>[−-]?\d+(?:[.,]\d+)?), максимум (?<b>[−-]?\d+(?:[.,]\d+)?)\. Выбрано (?<k>\d+) равных интервалов\. Чему равна ширина интервала/,
        order: ['a', 'k', 'b'],
        derived: {b: (args, rnd) => args.a + args.k * (2 + Math.floor(rnd() * 6))},
        check: args => args.b > args.a && args.k >= 2,
        calc: args => (args.b - args.a) / args.k,
        steps: (args, answer, fmt) => `(${fmt(args.b)} - ${aiNumTerm(args.a, fmt)}) / ${fmt(args.k)} = ${fmt(answer)}`
    },
    {
        id: 'range-to-width',
        re: /Размах (?<r>\d+(?:[.,]\d+)?), выбраны (?<k>\d+) равных интервалов\. Найдите ширину/,
        order: ['r', 'k'],
        derived: {r: (args, rnd) => args.k * (2 + Math.floor(rnd() * 5))},
        check: args => args.r > 0 && args.k >= 2,
        calc: args => args.r / args.k,
        steps: (args, answer, fmt) => `${fmt(args.r)} / ${fmt(args.k)} = ${fmt(answer)}`
    },
    {
        id: 'ordered-range',
        re: /Первое число упорядоченного ряда (?<a>\d+(?:[.,]\d+)?), последнее (?<b>\d+(?:[.,]\d+)?)\. Найдите размах/,
        order: ['a', 'b'],
        check: args => args.b > args.a,
        calc: args => args.b - args.a,
        steps: (args, answer, fmt) => `${fmt(args.b)} - ${aiNumTerm(args.a, fmt)} = ${fmt(answer)}`
    },
    /* ---- Отдельные формулы из тем распределений --------------------------- */
    {
        id: 'binomial-mean-digits',
        re: /(?<n>\d+) независимых изделий\. Вероятность брака (?<p>\d+(?:[.,]\d+)?)/,
        order: ['n', 'p'],
        spec: {p: {kind: 'prob', min: 0.01, max: 0.2}},
        check: args => args.n >= 10 && args.p > 0 && args.p < 1,
        calc: args => args.n * args.p,
        steps: (args, answer, fmt) => `${fmt(args.n)} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-memoryless',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. После [^.]*неудач найдите вероятность успеха следующей/,
        order: ['p'],
        spec: {p: {kind: 'prob', min: 0.05, max: 0.9}},
        check: args => args.p > 0 && args.p < 1,
        calc: args => args.p,
        steps: (args, answer, fmt) => `Прошлые неудачи не меняют p: ${fmt(answer)}`
    },
    {
        id: 'geometric-inverse-mean',
        re: /M\(X\)=(?<m>\d+)\. Найдите p/,
        order: ['m'],
        derived: {m: (args, rnd) => [2, 4, 5, 8, 10][Math.floor(rnd() * 5)]},
        check: args => args.m > 1,
        calc: args => 1 / args.m,
        steps: (args, answer, fmt) => `p = 1 / ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'geometric-two-failures',
        re: /p=(?<p>\d+(?:[.,]\d+)?)\. Найдите вероятность хотя бы двух неудач/,
        order: ['p'],
        spec: {p: {kind: 'prob', min: 0.05, max: 0.9}},
        check: args => args.p > 0 && args.p < 1,
        calc: args => (1 - args.p) ** 2,
        steps: (args, answer, fmt) => `(${fmt(1 - args.p)})² = ${fmt(answer)}`
    },
    {
        id: 'expectation-linear-shift',
        re: /Ожидание X равно (?<m>[\d.,]+)\. Найдите M\((?<k>\d+)X(?<c>[−-]\d+)\)/,
        order: ['m', 'k', 'c'],
        spec: {m: {kind: 'int', min: 1, max: 9}, k: {kind: 'int', min: 2, max: 5}, c: {kind: 'int', min: -6, max: -1}},
        check: args => args.k !== 1 && args.c !== 0,
        calc: args => args.k * args.m + args.c,
        steps: (args, answer, fmt) => `${fmt(args.k)} · ${fmt(args.m)} - ${fmt(-args.c)} = ${fmt(answer)}`
    },
    {
        id: 'poisson-characteristics',
        re: /Пуассона λ=(?<l>\d+) заполните характеристики/,
        order: ['l'],
        derived: {l: (args, rnd) => [4, 9, 16, 25][Math.floor(rnd() * 4)]},
        check: args => args.l > 1 && Number.isInteger(Math.sqrt(args.l)),
        calc: args => [args.l, args.l, Math.sqrt(args.l)],
        steps: (args, answer, fmt) => `M = D = λ = ${fmt(args.l)}, σ = √${fmt(args.l)} = ${fmt(Math.sqrt(args.l))}`
    },
    {
        id: 'normal-sigma-variance',
        re: /нормальной модели среднее (?<mu>[\d.,]+)[^.]*σ=(?<s>[\d.,]+)[^.]*\.\s*Найдите дисперсию/,
        order: ['mu', 's'],
        spec: {mu: {kind: 'int', min: 50, max: 200}},
        derived: {s: (args, rnd) => 2 + Math.floor(rnd() * 10)},
        check: args => args.s > 1,
        calc: args => args.s ** 2,
        steps: (args, answer, fmt) => `D = ${fmt(args.s)}² = ${fmt(answer)}`
    },
    {
        id: 'normal-z-score',
        re: /μ=(?<mu>[\d.,]+), σ=(?<s>[\d.,]+)\. Какой z соответствует x=(?<x>[\d.,]+)/,
        order: ['mu', 's', 'x'],
        spec: {mu: {kind: 'int', min: 50, max: 200}, s: {kind: 'int', min: 2, max: 20}},
        derived: {x: (args, rnd) => args.mu + (1 + Math.floor(rnd() * 3)) * args.s},
        check: args => args.s > 0,
        calc: args => (args.x - args.mu) / args.s,
        steps: (args, answer, fmt) => `(${fmt(args.x)} - ${fmt(args.mu)}) / ${fmt(args.s)} = ${fmt(answer)}`
    },
    {
        id: 'exponential-mean',
        re: /Экспоненциальная модель: λ=(?<l>[\d.,]+) в минуту\. Найдите среднее/,
        order: ['l'],
        derived: {l: (args, rnd) => [0.1, 0.2, 0.25, 0.5][Math.floor(rnd() * 4)]},
        check: args => args.l > 0 && args.l < 1,
        calc: args => 1 / args.l,
        steps: (args, answer, fmt) => `1 / ${fmt(args.l)} = ${fmt(answer)}`
    },
    {
        id: 'sigma-from-variance-words',
        re: /Дисперсия случайной величины равна (?<d>\d+)\. Чему равно среднеквадратичное/,
        order: ['d'],
        derived: {d: (args, rnd) => [4, 9, 16, 25, 36][Math.floor(rnd() * 5)]},
        check: args => args.d > 1 && Number.isInteger(Math.sqrt(args.d)),
        calc: args => Math.sqrt(args.d),
        steps: (args, answer, fmt) => `σ = √${fmt(args.d)} = ${fmt(answer)}`
    },
    /* ---- Доли из разных тем --------------------------------------------- */
    {
        id: 'bias-test-share',
        re: /отметил (?<m>\d+) дефектных и (?<n>\d+) исправных изделий/,
        order: ['m', 'n'],
        spec: {m: {kind: 'int', min: 20, max: 200}, n: {kind: 'int', min: 100, max: 900}},
        calc: args => args.m / (args.m + args.n),
        steps: (args, answer, fmt) => `${fmt(args.m)} / (${fmt(args.m)} + ${fmt(args.n)}) = ${fmt(answer)}`
    },
    {
        id: 'positive-share',
        re: /(?<m>\d+) положительных сигналов, из них (?<k>\d+) истинных/,
        order: ['m', 'k'],
        spec: {m: {kind: 'int', min: 50, max: 500}},
        derived: {k: (args, rnd) => Math.max(1, Math.round(args.m / (3 + Math.floor(rnd() * 4))))},
        check: args => args.k > 0 && args.k < args.m,
        calc: args => args.k / args.m,
        steps: (args, answer, fmt) => `${fmt(args.k)} / ${fmt(args.m)} = ${fmt(answer)}`
    },
    {
        id: 'nonresponse-share',
        re: /В выборке (?<n>\d+) человек (?<m>\d+) не ответили/,
        order: ['n', 'm'],
        spec: {n: {kind: 'int', min: 50, max: 500}},
        derived: {m: (args, rnd) => Math.max(1, Math.round(args.n / (4 + Math.floor(rnd() * 8))))},
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'letter-frequency',
        re: /В тексте (?<n>\d[\d\s\u00a0]*\d) русских букв, из них (?<m>\d+) букв/,
        order: ['n', 'm'],
        spec: {n: {kind: 'int', min: 500, max: 5000}},
        derived: {m: (args, rnd) => Math.max(2, Math.round(args.n * (1 + Math.floor(rnd() * 9)) / 100))},
        check: args => args.m > 0 && args.m < args.n,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    {
        id: 'frequency-share-of-all',
        re: /(?<m>\d+) учеников[^.]*долю среди всех (?<n>\d+)/,
        order: ['m', 'n'],
        derived: {n: (args, rnd) => args.m * (2 + Math.floor(rnd() * 8))},
        check: args => args.m > 0 && args.n > args.m,
        calc: args => args.m / args.n,
        steps: (args, answer, fmt) => `${fmt(args.m)} / ${fmt(args.n)} = ${fmt(answer)}`
    },
    /* ---- Комбинированные задачи ----------------------------------------- */
    {
        id: 'linear-transform-moments',
        re: /M\(X\)=(?<m>[−-]?\d+(?:[.,]\d+)?), D\(X\)=(?<d>\d+(?:[.,]\d+)?)\. Для Y=(?<k>\d+)X\+(?<c>\d+)/,
        order: ['m', 'd', 'k', 'c'],
        spec: {m: {kind: 'int', min: 1, max: 9}, d: {kind: 'int', min: 1, max: 9}, k: {kind: 'int', min: 2, max: 4}, c: {kind: 'int', min: 1, max: 9}},
        check: args => args.k !== 1 && args.d > 0,
        calc: args => [args.k * args.m + args.c, args.k * args.k * args.d],
        steps: (args, answer, fmt) => `M(Y) = ${fmt(args.k)} · ${fmt(args.m)} + ${fmt(args.c)} = ${fmt(answer[0])}; D(Y) = ${fmt(args.k)}² · ${fmt(args.d)} = ${fmt(answer[1])}`
    },
    {
        id: 'two-point-second-moment',
        re: /Таблица даёт X=(?<x1>[−-]?\d+(?:[.,]\d+)?) или (?<x2>[−-]?\d+(?:[.,]\d+)?) с p=(?<p1>\d+(?:[.,]\d+)?) и (?<p2>\d+(?:[.,]\d+)?)\. Найдите M\(X²\)/,
        order: ['x1', 'x2', 'p1', 'p2'],
        spec: {x1: {kind: 'int', min: 1, max: 6}, x2: {kind: 'int', min: 2, max: 9}},
        derived: {p1: (args, rnd) => [0.1, 0.2, 0.25, 0.4, 0.5][Math.floor(rnd() * 5)],
            p2: args => Number((1 - args.p1).toFixed(2))},
        check: args => args.p1 > 0 && args.p1 < 1 && args.p2 > 0 && args.p2 < 1 && args.x1 !== args.x2,
        calc: args => args.x1 ** 2 * args.p1 + args.x2 ** 2 * args.p2,
        steps: (args, answer, fmt) => `${fmt(args.x1)}² · ${fmt(args.p1)} + ${fmt(args.x2)}² · ${fmt(args.p2)} = ${fmt(answer)}`
    },
    {
        id: 'prize-cost-choice',
        re: /Приз 0 или (?<prize>\d+(?:[.,]\d+)?) имеет вероятности (?<p0>\d+(?:[.,]\d+)?) и (?<p1>\d+(?:[.,]\d+)?)\. Участие стоит (?<cost>\d+(?:[.,]\d+)?)/,
        order: ['prize', 'p0', 'p1', 'cost'],
        spec: {prize: {kind: 'int', min: 20, max: 200}, cost: {kind: 'int', min: 5, max: 50}},
        derived: {p0: (args, rnd) => [0.6, 0.7, 0.75, 0.8][Math.floor(rnd() * 4)],
            p1: args => Number((1 - args.p0).toFixed(2))},
        check: args => args.p0 > 0 && args.p0 < 1 && args.p1 > 0 && args.p1 < 1 && args.prize * args.p1 !== args.cost,
        calc: args => args.prize * args.p1 - args.cost,
        steps: (args, answer, fmt) => `${fmt(args.prize)} · ${fmt(args.p1)} - ${fmt(args.cost)} = ${fmt(answer)}`
    },
    {
        id: 'indicator-loss-expectation',
        re: /Индикатор дефекта с p=(?<p>\d+(?:[.,]\d+)?) умножили на убыток (?<loss>\d+)/,
        order: ['p', 'loss'],
        derived: {loss: (args, rnd) => [100, 200, 500, 1000, 2000][Math.floor(rnd() * 5)]},
        check: args => args.p > 0 && args.p < 1 && args.loss > 0,
        calc: args => args.p * args.loss,
        steps: (args, answer, fmt) => `${fmt(args.p)} · ${fmt(args.loss)} = ${fmt(answer)}`
    },
    /* ---- Гипергеометрическая модель: крайние случаи ---------------------- */
    {
        id: 'hypergeometric-max',
        re: /Из (?<n>\d+) учеников (?<m>\d+) отличника?\. Выбрали (?<k>\d+)\. Каково максимальное число отличников/,
        order: ['n', 'm', 'k'],
        spec: {n: {kind: 'int', min: 6, max: 40}, k: {kind: 'int', min: 1, max: 8}},
        derived: {m: (args, rnd) => 2 + Math.floor(rnd() * 3)},
        check: args => args.m < args.n && args.k < args.n && Math.min(args.m, args.k) > 0,
        calc: args => Math.min(args.m, args.k),
        steps: (args, answer, fmt) => `min(M, n) = min(${fmt(args.m)}, ${fmt(args.k)}) = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-min',
        re: /N=(?<n>\d+), M=(?<m>\d+), n=(?<k>\d+)\. Каково минимальное число успехов/,
        order: ['n', 'm', 'k'],
        spec: {n: {kind: 'int', min: 6, max: 40}, m: {kind: 'int', min: 2, max: 20}, k: {kind: 'int', min: 1, max: 10}},
        check: args => args.m <= args.n && args.k > 0 && args.k <= args.n,
        calc: args => Math.max(0, args.k - (args.n - args.m)),
        steps: (args, answer, fmt) => `max(0, ${fmt(args.k)} - (${fmt(args.n)} - ${fmt(args.m)})) = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-all-success',
        re: /N=(?<n>\d+), M=(?<m>\d+), n=(?<k>\d+)\. Найдите P\(оба успеха\)/,
        order: ['n', 'm', 'k'],
        spec: {n: {kind: 'int', min: 4, max: 12}, m: {kind: 'int', min: 2, max: 6}, k: {kind: 'int', min: 2, max: 4}},
        check: args => args.m >= args.k && args.n > args.m && args.k <= args.n,
        calc: args => aiNumChoose(args.m, args.k) / aiNumChoose(args.n, args.k),
        steps: (args, answer, fmt) => `C(${fmt(args.m)}, ${fmt(args.k)}) / C(${fmt(args.n)}, ${fmt(args.k)}) = ${fmt(answer)}`
    },
    /* ---- Гистограмма и число интервалов --------------------------------- */
    {
        id: 'histogram-height',
        re: /Относительная частота интервала равна (?<p>\d+(?:[.,]\d+)?), его ширина — (?<w>\d+(?:[.,]\d+)?)/,
        order: ['p', 'w'],
        spec: {p: {kind: 'prob', min: 0.1, max: 0.8}},
        derived: {w: (args, rnd) => [2, 4, 5][Math.floor(rnd() * 3)]},
        check: args => args.p > 0 && args.p < 1 && args.w > 0,
        calc: args => args.p / args.w,
        steps: (args, answer, fmt) => `${fmt(args.p)} / ${fmt(args.w)} = ${fmt(answer)}`
    },
    {
        id: 'histogram-height-two',
        re: /В интервале ширины (?<w>\d+(?:[.,]\d+)?) относительная частота (?<p>\d+(?:[.,]\d+)?)/,
        order: ['w', 'p'],
        spec: {p: {kind: 'prob', min: 0.1, max: 0.8}},
        derived: {w: (args, rnd) => [2, 4, 5][Math.floor(rnd() * 3)]},
        check: args => args.p > 0 && args.p < 1 && args.w > 0,
        calc: args => args.p / args.w,
        steps: (args, answer, fmt) => `${fmt(args.p)} / ${fmt(args.w)} = ${fmt(answer)}`
    },
    {
        id: 'histogram-area',
        re: /Высота плотностной гистограммы (?<h>\d+(?:[.,]\d+)?), ширина столбца (?<w>\d+(?:[.,]\d+)?)/,
        order: ['h', 'w'],
        spec: {h: {kind: 'prob', min: 0.05, max: 0.6}, w: {kind: 'int', min: 2, max: 8}},
        calc: args => args.h * args.w,
        steps: (args, answer, fmt) => `${fmt(args.h)} · ${fmt(args.w)} = ${fmt(answer)}`
    },
    {
        id: 'histogram-heights-two',
        re: /Интервалы имеют ширины (?<w1>\d+(?:[.,]\d+)?) и (?<w2>\d+(?:[.,]\d+)?) и доли (?<p1>\d+(?:[.,]\d+)?) и (?<p2>\d+(?:[.,]\d+)?)\. Найдите обе высоты/,
        order: ['w1', 'w2', 'p1', 'p2'],
        spec: {w1: {kind: 'int', min: 1, max: 4}, w2: {kind: 'int', min: 1, max: 4}},
        derived: {p1: (args, rnd) => [0.2, 0.4, 0.5, 0.6][Math.floor(rnd() * 4)],
            p2: args => Number((1 - args.p1).toFixed(2))},
        check: args => args.w1 > 0 && args.w2 > 0 && args.p1 > 0 && args.p1 < 1 && args.p2 > 0 && args.p2 < 1,
        calc: args => [args.p1 / args.w1, args.p2 / args.w2],
        steps: (args, answer, fmt) => `${fmt(args.p1)} / ${fmt(args.w1)} = ${fmt(answer[0])}; ${fmt(args.p2)} / ${fmt(args.w2)} = ${fmt(answer[1])}`
    },
    /* ---- Гипергеометрическая схема: урна и выбранные шары ---------------- */
    {
        id: 'geometric-first-success-attempt',
        re: /Вероятность попадания в цель равна (?<p>\d+(?:[.,]\d+)?)\. Стрельба ведется до первого попадания\. Найти вероятность первого успеха на (?<k>\d+)-й попытке/,
        order: ['p', 'k'],
        spec: {p: {kind: 'prob', min: 0.1, max: 0.5}, k: {kind: 'int', min: 2, max: 5}},
        check: args => args.p > 0 && args.p < 1 && args.k >= 2,
        calc: args => (1 - args.p) ** (args.k - 1) * args.p,
        steps: (args, answer, fmt) => `(1 − ${fmt(args.p)})^${fmt(args.k - 1)} · ${fmt(args.p)} = ${fmt(answer)}`
    },
    {
        id: 'urn-one-white',
        re: /В урне (?<a>\d+) белых и (?<b>\d+) (?:чёрных|черных) шара?\. Наудачу берут (?<n>\d+) шара?\. Какова вероятность того, что среди них ровно 1 белый/,
        order: ['a', 'b', 'n'],
        spec: {a: {kind: 'int', min: 2, max: 9}, b: {kind: 'int', min: 2, max: 9}, n: {kind: 'int', min: 2, max: 4}},
        check: args => args.a >= 2 && args.b >= 2 && args.n >= 2 && args.n <= args.a + args.b && args.b >= args.n - 1,
        calc: args => aiNumChoose(args.a, 1) * aiNumChoose(args.b, args.n - 1) / aiNumChoose(args.a + args.b, args.n),
        steps: (args, answer, fmt) => `C(${fmt(args.a)}; 1) · C(${fmt(args.b)}; ${fmt(args.n - 1)}) / C(${fmt(args.a + args.b)}; ${fmt(args.n)}) = ${fmt(answer)}`
    },
    {
        id: 'urn-both-white',
        re: /В урне (?<a>\d+) белых и (?<b>\d+) (?:чёрных|черных)\. Выбирают (?<n>\d+) без возвращения\. Найдите P\(оба белые\)/,
        order: ['a', 'b', 'n'],
        spec: {a: {kind: 'int', min: 2, max: 9}, b: {kind: 'int', min: 2, max: 9}, n: {kind: 'int', min: 2, max: 4}},
        check: args => args.a >= args.n && args.b >= 1 && args.n >= 2 && args.n <= args.a + args.b,
        calc: args => aiNumChoose(args.a, args.n) / aiNumChoose(args.a + args.b, args.n),
        steps: (args, answer, fmt) => `C(${fmt(args.a)}; ${fmt(args.n)}) / C(${fmt(args.a + args.b)}; ${fmt(args.n)}) = ${fmt(answer)}`
    },
    {
        id: 'urn-both-black',
        re: /В урне (?<a>\d+) белых и (?<b>\d+) (?:чёрных|черных)\. Выбирают (?<n>\d+) без возвращения\. Найдите P\(оба чёрные\)/,
        order: ['a', 'b', 'n'],
        spec: {a: {kind: 'int', min: 2, max: 9}, b: {kind: 'int', min: 2, max: 9}, n: {kind: 'int', min: 2, max: 4}},
        check: args => args.b >= args.n && args.a >= 1 && args.n >= 2 && args.n <= args.a + args.b,
        calc: args => aiNumChoose(args.b, args.n) / aiNumChoose(args.a + args.b, args.n),
        steps: (args, answer, fmt) => `C(${fmt(args.b)}; ${fmt(args.n)}) / C(${fmt(args.a + args.b)}; ${fmt(args.n)}) = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-mean-coded',
        re: /N=(?<N>\d+), M=(?<M>\d+), n=(?<n>\d+)\. Найдите M\(X\)/,
        order: ['N', 'M', 'n'],
        spec: {N: {kind: 'int', min: 8, max: 40}, M: {kind: 'int', min: 2, max: 6}, n: {kind: 'int', min: 2, max: 8}},
        check: args => args.M >= 2 && args.n >= 2 && args.M + 2 <= args.N && args.n <= args.N,
        calc: args => args.n * args.M / args.N,
        steps: (args, answer, fmt) => `nM/N = ${fmt(args.n)} · ${fmt(args.M)} / ${fmt(args.N)} = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-variance-coded',
        re: /N=(?<N>\d+), M=(?<M>\d+), n=(?<n>\d+)\. Найдите D\(X\)/,
        order: ['N', 'M', 'n'],
        spec: {N: {kind: 'int', min: 8, max: 40}, M: {kind: 'int', min: 2, max: 6}, n: {kind: 'int', min: 2, max: 8}},
        check: args => args.M >= 2 && args.n >= 2 && args.M + 2 <= args.N && args.n <= args.N && args.N > 1,
        calc: args => {
            const p = args.M / args.N;
            return args.n * p * (1 - p) * (args.N - args.n) / (args.N - 1)
        },
        steps: (args, answer, fmt) => `n·p·(1−p)·(N−n)/(N−1) = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-mean-worded',
        re: /В группе (?<N>\d+) учеников, из них (?<M>\d+) отличник(?:а|ов)?\. Выбирают (?<n>\d+) без возвращения\. Найдите ожидаемое число отличников/,
        order: ['N', 'M', 'n'],
        spec: {N: {kind: 'int', min: 10, max: 40}, M: {kind: 'int', min: 2, max: 4}, n: {kind: 'int', min: 2, max: 8}},
        check: args => args.M >= 2 && args.M <= 4 && args.n >= 2 && args.n <= args.N && args.M + 3 <= args.N,
        calc: args => args.n * args.M / args.N,
        steps: (args, answer, fmt) => `nM/N = ${fmt(args.n)} · ${fmt(args.M)} / ${fmt(args.N)} = ${fmt(answer)}`
    },
    {
        id: 'hypergeometric-expectation',
        re: /Из (?<N>\d+) билетов (?<M>\d+) выигрышных, купили (?<n>\d+) разных/,
        order: ['N', 'M', 'n'],
        spec: {N: {kind: 'int', min: 12, max: 60}, M: {kind: 'int', min: 2, max: 12}, n: {kind: 'int', min: 2, max: 8}},
        check: args => args.M >= 2 && args.n >= 2 && args.M < args.N && args.n < args.N,
        calc: args => args.n * args.M / args.N,
        steps: (args, answer, fmt) => `${fmt(args.n)} · ${fmt(args.M)} / ${fmt(args.N)} = ${fmt(answer)}`
    },
    {
        id: 'poisson-variance',
        re: /Пуассоновская модель с λ=(?<l>\d+(?:[.,]\d+)?)\. Найдите дисперсию/,
        order: ['l'],
        spec: {l: {kind: 'int', min: 1, max: 20}},
        check: args => args.l > 0,
        calc: args => args.l,
        steps: (args, answer, fmt) => `D(X) = λ = ${fmt(answer)}`
    },
    {
        /* Число партий — словом («Три»), поэтому меняем только дисперсию. */
        id: 'sum-of-independent-variances',
        re: /Три независимые партии имеют одинаковую дисперсию (?<d>\d+(?:[.,]\d+)?)/,
        order: ['d'],
        spec: {d: {kind: 'int', min: 1, max: 30}},
        derived: {d: (args, rnd) => {
            const pool = [];
            for (let value = 1; value <= 12; value++) { if (value !== args.d) pool.push(value) }
            return pool[Math.floor(rnd() * pool.length)]
        }},
        check: args => args.d > 0,
        calc: args => 3 * args.d,
        steps: (args, answer, fmt) => `3 · ${fmt(args.d)} = ${fmt(answer)}`
    },
    {
        id: 'variance-linear-combination',
        re: /Независимые X,Y: D\(X\)=(?<dx>\d+(?:[.,]\d+)?), D\(Y\)=(?<dy>\d+(?:[.,]\d+)?)\. Найдите D\((?<a>\d+)X[−-](?<b>\d+)Y\)/,
        order: ['dx', 'dy', 'a', 'b'],
        spec: {dx: {kind: 'int', min: 1, max: 20}, dy: {kind: 'int', min: 1, max: 20}, a: {kind: 'int', min: 2, max: 5}, b: {kind: 'int', min: 2, max: 5}},
        check: args => args.dx > 0 && args.dy > 0,
        calc: args => args.a * args.a * args.dx + args.b * args.b * args.dy,
        steps: (args, answer, fmt) => `${fmt(args.a)}² · ${fmt(args.dx)} + ${fmt(args.b)}² · ${fmt(args.dy)} = ${fmt(answer)}`
    },
    {
        id: 'sturges-intervals',
        re: /при n=(?<n>\d+) найдите k/i,
        order: ['n'],
        spec: {n: {kind: 'int', min: 2, max: 400}},
        calc: args => Math.ceil(1 + Math.log2(args.n)),
        steps: (args, answer, fmt) => `k = ⌈1 + log₂${fmt(args.n)}⌉ = ${fmt(answer)}`
    },
    /* ---- Доли в двух группах и сериях ----------------------------------- */
    {
        id: 'two-group-shares',
        re: /В двух одинаковых по объёму группах (?<m1>\d+) из (?<n1>\d+) и (?<m2>\d+) из (?<n2>\d+) успехов/,
        order: ['m1', 'n1', 'm2', 'n2'],
        spec: {n1: {kind: 'int', min: 20, max: 200}},
        derived: {m1: (args, rnd) => Math.max(1, Math.round(args.n1 / (2 + Math.floor(rnd() * 4)))),
            m2: (args, rnd) => Math.max(1, Math.round(args.n1 / (2 + Math.floor(rnd() * 4)))),
            n2: args => args.n1},
        check: args => args.n1 > 0 && args.m1 > 0 && args.m1 < args.n1 && args.m2 > 0 && args.m2 < args.n2,
        calc: args => [args.m1 / args.n1, args.m2 / args.n2],
        steps: (args, answer, fmt) => `${fmt(args.m1)} / ${fmt(args.n1)} = ${fmt(answer[0])}; ${fmt(args.m2)} / ${fmt(args.n2)} = ${fmt(answer[1])}`
    },
    {
        id: 'two-series-frequencies',
        re: /В двух сериях (?<m1>\d+) из (?<n1>\d+) и (?<m2>\d+) из (?<n2>\d+) успехов при p=(?<p>\d+(?:[.,]\d+)?)/,
        order: ['m1', 'n1', 'm2', 'n2', 'p'],
        keep: ['p'],
        derived: {
            n1: (args, rnd) => [50, 100, 200][Math.floor(rnd() * 3)],
            n2: (args, rnd) => [500, 1000, 2000][Math.floor(rnd() * 3)],
            m1: args => Math.round(args.p * args.n1),
            m2: (args, rnd) => Math.round(args.p * args.n2) + 1 + Math.floor(rnd() * 5)
        },
        check: args => args.m1 < args.n1 && args.m2 < args.n2 && args.p > 0 && args.p < 1 && args.m2 / args.n2 >= args.p,
        calc: args => [args.m1 / args.n1, args.m2 / args.n2, args.m2 / args.n2 - args.p],
        steps: (args, answer, fmt) => `${fmt(args.m1)} / ${fmt(args.n1)} = ${fmt(answer[0])}; ${fmt(args.m2)} / ${fmt(args.n2)} = ${fmt(answer[1])}; ${fmt(answer[1])} - ${fmt(args.p)} = ${fmt(answer[2])}`
    },
    {
        id: 'conditional-product',
        re: /P\(A\)=(?<a>[\d.,]+), P\(B\)=(?<b>[\d.,]+)[^.]*независим/,
        order: ['a', 'b'],
        spec: {a: {kind: 'prob', min: 0.1, max: 0.9}, b: {kind: 'prob', min: 0.1, max: 0.9}},
        check: args => args.a > 0 && args.a < 1 && args.b > 0 && args.b < 1,
        calc: args => args.a * args.b,
        steps: (args, answer, fmt) => `${fmt(args.a)} · ${fmt(args.b)} = ${fmt(answer)}`
    }
];

/* Статистики набора данных: слово в условии подсказывает, что считаем. */
const AI_NUM_STAT_WORDS = [
    {stat: 'range', re: /размах/},
    {stat: 'mean', re: /средн/},
    {stat: 'median', re: /медиан/},
    {stat: 'mode', re: /мод[аыуе]/},
    {stat: 'count', re: /объ[её]м|сколько наблюдений|число наблюдений|количество наблюдений|сколько чисел|сколько элементов/},
    {stat: 'sum', re: /сумм|всего/},
    {stat: 'min', re: /минимальн|минимум|наименьш/},
    {stat: 'max', re: /максимальн|максимум|наибольш/},
    {stat: 'variance', re: /дисперси/},
    {stat: 'sd', re: /стандартн[а-яё]* отклонен|среднеквадратичн/}
];

function aiNumStatValue(stat, stats) {
    if (!stats) return null;
    const map = {range: stats.range, mean: stats.mean, median: stats.median, mode: stats.mode, count: stats.count,
        sum: stats.sum, min: stats.min, max: stats.max, variance: stats.variance, sd: stats.sd};
    return map[stat] === undefined ? null : map[stat]
}

function aiNumWordsStats(text) {
    const lower = String(text == null ? '' : text).toLowerCase();
    return AI_NUM_STAT_WORDS.filter(word => word.re.test(lower)).map(word => word.stat)
}

/* ---- Разбор задания курса -------------------------------------------- */

function aiNumBaseTask(task) {
    if (!task || !task.id || typeof COURSE_BASE === 'undefined' || !COURSE_BASE || !Array.isArray(COURSE_BASE.sections)) return null;
    for (const section of COURSE_BASE.sections) {
        const found = (section.tasks || []).find(item => item.id === task.id);
        if (found) return found
    }
    return null
}

function aiNumAnswerValue(answer) {
    if (Array.isArray(answer)) {
        const list = answer.map(item => aiNumValue(String(item)));
        return list.length && list.every(value => value !== null) ? list : null
    }
    if (answer === undefined || answer === null || String(answer).trim() === '') return null;
    return aiNumValue(String(answer))
}

/* Числа правила: позиции ищем по тексту, значения — по токенам. */
function aiNumRuleMatch(rule, question) {
    if (!rule.re || !Array.isArray(rule.order)) return null;
    const match = String(question || '').match(rule.re);
    if (!match || !match.groups) return null;
    const inner = aiNumTokens(match[0]);
    const used = [];
    const slots = [];
    const args = {};
    for (const name of rule.order) {
        const raw = match.groups[name];
        if (raw === undefined) continue;
        let index = inner.findIndex((token, i) => !used.includes(i) && token.text === raw);
        let shift = 0;
        if (index < 0) {
            /* Токен может нести знак: «D(3X−2Y)» — знак оставляем на месте. */
            index = inner.findIndex((token, i) => !used.includes(i) && token.text.replace(/^[−-]/, '') === raw);
            if (index >= 0) shift = inner[index].text.length - raw.length
        }
        if (index < 0) return null;
        used.push(index);
        slots.push({name: name, start: match.index + inner[index].start + shift, end: match.index + inner[index].end,
            text: raw, value: aiNumValue(raw)});
        args[name] = aiNumValue(raw)
    }
    for (const name of Object.keys(rule.fixed || {})) {
        const group = String((match.groups[rule.fixed[name].group]) || '').toLowerCase();
        const words = AI_NUM_WORDS[typeof aiLang === 'function' ? aiLang() : 'ru'] || AI_NUM_WORDS.ru;
        if (words[group] === undefined) return null;
        args[name] = words[group]
    }
    return {args: args, slots: slots}
}

/* Правило принимается, только если на исходных числах оно даёт ответ курса. */
function aiNumRuleVerified(rule, question, answer) {
    const found = aiNumRuleMatch(rule, question);
    if (!found) return null;
    if (rule.check && !rule.check(found.args)) return null;
    let value = null;
    try { value = rule.calc(found.args) } catch (error) { value = null }
    if (value === null || value === undefined) return null;
    if (!aiNumAnswerSane(value)) return null;
    if (aiNumSame(value, answer)) return found;
    /* В курсе ответ бывает округлён («округлите до 0,001») — сверяем и так. */
    const places = aiNumRoundPlaces(question);
    if (places !== null && aiNumSame(aiNumRoundAnswer(value, places), answer)) return found;
    return null
}

/* ---- Моменты по таблице закона ---------------------------------------- */
/* Таблица «X …» / «P …»: новые вероятности, а M(X), D(X) или σ(X) считаются
   заново по той же таблице. Формулировка должна называть ровно одну из трёх
   характеристик — иначе вариант не создаём. */
function aiNumMomentPlan(task, base, answer) {
    const baseTable = base && (base.inputTables || [])[0];
    const table = (task.inputTables || [])[0];
    if (!baseTable || !table) return null;
    const head = baseTable.head || [], row = (baseTable.rows || [])[0] || [];
    if (head.length < 3 || row.length !== head.length) return null;
    if (!/^(x|значение|xi)$/i.test(String(head[0] == null ? '' : head[0]).trim())) return null;
    if (!/^(p|вероятность)/i.test(String(row[0] == null ? '' : row[0]).trim())) return null;
    const xs = head.slice(1).map(value => aiNumValue(value));
    const ps = row.slice(1).map(value => aiNumValue(value));
    if (xs.some(value => value === null) || ps.some(value => value === null)) return null;
    if (Math.abs(ps.reduce((acc, value) => acc + value, 0) - 1) > 1e-9) return null;
    if (xs.length < 2) return null;
    const question = base.question;
    const mean = xs.reduce((acc, value, index) => acc + value * ps[index], 0);
    const second = xs.reduce((acc, value, index) => acc + value * value * ps[index], 0);
    const variance = second - mean * mean;
    const wanted = [];
    if (/(?:^|[^A-Za-zА-Яа-я])M\s*\(\s*X\s*\)|математическ[а-яё]* ожидание/.test(question)) wanted.push({id: 'mean', value: mean});
    if (/D\s*\(\s*X\s*\)|дисперси/.test(question)) wanted.push({id: 'variance', value: variance});
    if (/σ\s*\(\s*X\s*\)|среднеквадратич|стандартное отклонение/.test(question)) wanted.push({id: 'sd', value: Math.sqrt(variance)});
    const both = Array.isArray(answer) && answer.length === 2
        && aiNumSame(answer[0], mean) && aiNumSame(answer[1], variance)
        && /M\s*\(\s*X\s*\)/.test(question) && /D\s*\(\s*X\s*\)/.test(question);
    const asked = both ? [{id: 'both', value: answer}] : wanted.filter(item => aiNumSame(item.value, answer));
    if (asked.length !== 1) return null;
    const localRow = (table.rows || [])[0] || [];
    if (localRow.length !== row.length) return null;
    const texts = row.slice(1).map((cell, index) => String(localRow[index + 1]));
    return {
        kind: 'moment', base: base, stat: asked[0].id, xs: xs, values: ps, answer: answer,
        table: table, row: row, texts: texts, calc: next => {
            const nextMean = xs.reduce((acc, value, index) => acc + value * next[index], 0);
            const nextSecond = xs.reduce((acc, value, index) => acc + value * value * next[index], 0);
            if (asked[0].id === 'mean') return nextMean;
            const nextVariance = nextSecond - nextMean * nextMean;
            if (asked[0].id === 'both') return [Number(nextMean.toFixed(4)), Number(nextVariance.toFixed(4))];
            return asked[0].id === 'variance' ? nextVariance : Math.sqrt(Math.max(0, nextVariance))
        },
        steps: (next, result, fmt) => {
            const terms = next.map((value, index) => `${fmt(xs[index])} · ${fmt(value)}`);
            if (asked[0].id === 'both') {
                const nextMean = xs.reduce((acc, value, index) => acc + value * next[index], 0);
                const nextSecond = xs.reduce((acc, value, index) => acc + value * value * next[index], 0);
                return `M(X) = ${terms.join(' + ')} = ${fmt(result[0])}; D(X) = M(X²) - M(X)² = ${fmt(nextSecond)} - ${fmt(nextMean)}² = ${fmt(result[1])}`
            }
            const label = asked[0].id === 'mean' ? 'M(X)' : (asked[0].id === 'variance' ? 'D(X)' : 'σ(X)');
            return `${label} = ${terms.join(' + ')} = ${fmt(result)}`
        }
    }
}

/* ---- Вариант табличных моментов: новые вероятности в таблице ---------- */
function aiNumMomentVariant(task, plan, options, rnd) {
    const opts = options || {};
    const baseTask = plan.base || task;
    for (let attempt = 0; attempt < 60; attempt++) {
        const next = aiNumPickLaw(plan.values, plan.texts, rnd, false);
        if (!next) continue;
        let value = null;
        try { value = plan.calc(next) } catch (error) { value = null }
        if (value === null || value === undefined) continue;
        if (!aiNumAnswerSane(value)) continue;
        if (!aiNumNicerThan(value, plan.answer)) continue;
        const rounded = aiNumRoundAnswer(value, 4);
        if (aiNumSame(rounded, plan.answer)) continue;
        const inputTables = (task.inputTables || []).map((table, index) => {
            if (index) return table;
            const rows = (table.rows || []).map((cells, rowIndex) => {
                if (rowIndex) return cells;
                return cells.map((cell, cellIndex) => (cellIndex === 0 ? cell : aiNumFormat(plan.texts[cellIndex - 1], next[cellIndex - 1])))
            });
            return Object.assign({}, table, {rows: rows})
        });
        const chart = task.chart && Array.isArray(task.chart.ys)
            ? Object.assign({}, task.chart, {ys: aiNumMirrorSeries(task.chart.ys, plan.values, next)})
            : task.chart;
        return Object.assign({}, task, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${plan.texts.join(', ')} → ${next.map((item, index) => aiNumFormat(plan.texts[index], item)).join(', ')}`,
            chart: chart,
            inputTables: inputTables,
            answer: rounded,
            tolerance: aiNumAnswerTolerance(task, rounded, value),
            acceptedAnswers: undefined,
            solution: ait('ai.num.solution', {steps: plan.steps(next, value, source => aiNumFormat(String(aiNumRound(Number(source), 4)), Number(source)))})
        })
    }
    return null
}

/* ---- Частоты в таблице или на графике -------------------------------- */
/* Данные лежат в таблице или на графике, условие спрашивает объём, моду или
   долю. Меняем частоты, ответ считаем заново по тому же вопросу. */
function aiNumCountsPlan(task, base, answer) {
    const baseTable = base && (base.inputTables || [])[0];
    const table = (task.inputTables || [])[0];
    const chart = base && base.chart;
    let labels = null, counts = null, texts = null, localTexts = null, rowLabel = '';
    if (baseTable && table) {
        const head = baseTable.head || [], row = (baseTable.rows || [])[0] || [];
        const localRow = (table.rows || [])[0] || [];
        if (head.length < 3 || row.length !== head.length || localRow.length !== row.length) return null;
        labels = head.slice(1).map(value => aiNumValue(value));
        counts = row.slice(1).map(value => aiNumValue(value));
        texts = row.slice(1).map(cell => String(cell));
        localTexts = localRow.slice(1).map(cell => String(cell));
        rowLabel = String(row[0] == null ? '' : row[0]).trim()
    } else if (chart && Array.isArray(chart.xs) && Array.isArray(chart.ys) && chart.xs.length >= 3 && chart.xs.length === chart.ys.length) {
        labels = chart.xs.map(Number);
        counts = chart.ys.map(Number);
        texts = counts.map(value => String(value));
        localTexts = texts.slice()
    } else return null;
    if (labels.some(value => !Number.isFinite(value))) return null;
    if (counts.some(value => !Number.isFinite(value) || !Number.isInteger(value) || value < 0)) return null;
    /* Вероятностные таблицы — дело плана закона распределения. */
    if (/^(p|вероятность)/i.test(rowLabel)) return null;
    const total = counts.reduce((acc, value) => acc + value, 0);
    if (total <= 0) return null;
    const top = Math.max.apply(null, counts);
    /* Если за числами идёт существительное в родительном падеже («… голосов»,
       «… учеников»), новые частоты должны с ним согласоваться. */
    const following = String(base.question).match(/\d+(?:[.,]\d+)?(?:[;,\s]+\d+(?:[.,]\d+)?)*\s+(?<noun>[а-яё]{3,})(?![а-яё])/i);
    const genitive = !!(following && /(ов|ей)$/i.test(following.groups.noun));
    const winners = counts.map((value, index) => (value === top ? index : -1)).filter(index => index >= 0);
    const question = base.question;
    const named = question.match(/(?:долю|доля) значения (?<v>\d+(?:[.,]\d+)?)/);
    /* «Найдите долю Б» — буква задаёт столбик по порядку (А, Б, В, …). */
    const letter = question.match(/(?:долю|доля) (?<L>[АБВГДЕЖ])(?![а-яё])/iu);
    const modes = [];
    if (/объём выборки|сколько всего|сумма частот|общее число|всего наблюдений/.test(question)) {
        modes.push({id: 'sum', value: total, calc: next => next.reduce((acc, value) => acc + value, 0)})
    }
    if (/наибольшая частота|наибольшей частотой|самая большая частота/.test(question) && winners.length === 1) {
        modes.push({id: 'top-label', value: labels[winners[0]], calc: next => {
            const best = Math.max.apply(null, next);
            const hits = next.map((value, index) => (value === best ? index : -1)).filter(index => index >= 0);
            return hits.length === 1 ? labels[hits[0]] : null
        }})
    }
    const shareIndex = named
        ? labels.findIndex(value => aiNumSame(value, aiNumValue(named.groups.v)))
        : (letter ? 'АБВГДЕЖ'.indexOf(letter.groups.L.toUpperCase()) : -1);
    if (shareIndex >= 0 && shareIndex < counts.length) {
        modes.push({id: 'share', value: counts[shareIndex] / total, calc: next => next[shareIndex] / next.reduce((acc, value) => acc + value, 0)})
    }
    const asked = modes.filter(mode => aiNumSame(mode.value, answer));
    if (asked.length !== 1) return null;
    return {
        kind: 'counts', base: base, stat: asked[0].id, labels: labels, values: counts, texts: texts, localTexts: localTexts, genitive: genitive,
        table: table, row: baseTable ? (baseTable.rows || [])[0] : null, answer: answer, calc: asked[0].calc,
        steps: (next, result, fmt) => {
            if (asked[0].id === 'sum') return `${next.map(value => fmt(value)).join(' + ')} = ${fmt(result)}`;
            if (asked[0].id === 'share') {
                return `${fmt(next[shareIndex])} / ${fmt(next.reduce((acc, value) => acc + value, 0))} = ${fmt(result)}`
            }
            const best = Math.max.apply(null, next);
            const hits = next.map((value, index) => (value === best ? index : -1)).filter(index => index >= 0);
            return `Наибольшая частота ${fmt(best)} у значения ${fmt(labels[hits[0]])}`
        }
    }
}

/* ---- Вариант частот: новые частоты в таблице и на графике -------------- */
function aiNumCountsVariant(task, plan, options, rnd) {
    const opts = options || {};
    const baseTask = plan.base || task;
    const oldTotal = plan.values.reduce((acc, value) => acc + value, 0);
    for (let attempt = 0; attempt < 120; attempt++) {
        /* Свежий набор частот: объём выборки плавает, доли пересчитываются. */
        const target = Math.max(plan.values.length + 1, Math.round(oldTotal * (0.5 + rnd() * 1.3)));
        const weights = plan.values.map(() => 0.15 + rnd());
        const weightSum = weights.reduce((acc, value) => acc + value, 0);
        const next = weights.map(weight => Math.max(0, Math.round(target * weight / weightSum)));
        const changed = next.filter((value, index) => !aiNumSame(value, plan.values[index])).length;
        if (changed < Math.min(2, plan.values.length)) continue;
        const total = next.reduce((acc, value) => acc + value, 0);
        if (total <= 0) continue;
        /* Наибольшая частота должна быть одна — иначе в условии нет ответа. */
        if (plan.stat === 'top-label' && next.filter(value => value === Math.max.apply(null, next)).length !== 1) continue;
        /* «5 голосов», но «2 голоса»: подбираем числа под слово в условии. */
        if (plan.genitive && next.some(value => !aiNumGenitivePlural(value))) continue;
        let value = null;
        try { value = plan.calc(next) } catch (error) { value = null }
        if (value === null || value === undefined || !aiNumAnswerSane(value)) continue;
        if (!aiNumNicerThan(value, plan.answer)) continue;
        const rounded = aiNumRoundAnswer(value, 4);
        if (aiNumSame(rounded, plan.answer)) continue;
        /* Если частоты перечислены и в условии, переписываем их там же. */
        const label = aiNumLawQuestion(task.question, plan.values, next);
        if (label.mentioned && !label.text) continue;
        const inputTables = (task.inputTables || []).length
            ? (task.inputTables || []).map((table, index) => {
                if (index) return table;
                const rows = (table.rows || []).map((cells, rowIndex) => {
                    if (rowIndex) return cells;
                    return cells.map((cell, cellIndex) => (cellIndex === 0 ? cell : aiNumFormat(plan.texts[cellIndex - 1], next[cellIndex - 1])))
                });
                return Object.assign({}, table, {rows: rows})
            })
            : task.inputTables;
        const chart = task.chart && Array.isArray(task.chart.ys) && task.chart.ys.length === next.length
            ? Object.assign({}, task.chart, {ys: next.slice()})
            : task.chart;
        const fmt = source => aiNumFormat(String(aiNumRound(Number(source), 4)), Number(source));
        return Object.assign({}, task, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${plan.texts.join(', ')} → ${next.map((item, index) => aiNumFormat(plan.texts[index], item)).join(', ')}`,
            question: label.text || task.question,
            chart: chart,
            inputTables: inputTables,
            answer: rounded,
            tolerance: aiNumAnswerTolerance(task, rounded, value),
            acceptedAnswers: undefined,
            solution: ait('ai.num.solution', {steps: plan.steps(next, value, fmt)})
        })
    }
    return null
}

/* ---- Список данных: «Данные 1;1;2;2;2;4. Заполните частоты» ----------- */
/* Условие перечисляет наблюдения, ответ — таблица частот. Меняем данные и
   пересчитываем таблицу: строки-значения и частоты идут по возрастанию. */
function aiNumDataListPlan(task, base, answer) {
    if (!Array.isArray(answer) || answer.length < 2 || answer.length > 5) return null;
    if (answer.some(value => !Number.isInteger(Number(value)) || Number(value) < 1)) return null;
    if ((base.inputTables || []).length || base.chart) return null;
    const rows = base.rows || [];
    if (rows.length !== answer.length) return null;
    if (!/частот/.test(base.question)) return null;
    const run = aiNumLongestRun(base.question);
    if (!run || run.length < answer.length + 2 || run.length > 14) return null;
    const values = run.map(token => token.value);
    if (values.some(value => !Number.isInteger(value))) return null;
    const distinct = [...new Set(values)].sort((a, b) => a - b);
    if (distinct.length !== answer.length) return null;
    const counts = distinct.map(value => values.filter(item => aiNumSame(item, value)).length);
    if (!counts.every((value, index) => aiNumSame(value, answer[index]))) return null;
    const gap = String(base.question).slice(run[0].end, run[1].start);
    return {
        kind: 'datalist', base: base, run: run, values: values, answer: answer, rows: rows,
        total: values.length, sep: /^[;,\s\u00a0]+$/.test(gap) ? gap : '; '
    }
}

function aiNumDataListVariant(task, plan, options, rnd) {
    const opts = options || {};
    const baseTask = plan.base || task;
    const k = plan.answer.length;
    const times = value => {
        const mod100 = value % 100;
        if (mod100 >= 11 && mod100 <= 14) return 'раз';
        const mod10 = value % 10;
        return mod10 === 1 ? 'раз' : (mod10 >= 2 && mod10 <= 4 ? 'раза' : 'раз')
    };
    for (let attempt = 0; attempt < 80; attempt++) {
        const low = 1 + Math.floor(rnd() * 7);
        const values = [];
        for (let i = 0; i < k; i++) values.push(low + i);
        if (rnd() < 0.4) values[k - 1] += 1 + Math.floor(rnd() * 3);
        /* Наблюдения раскладываем по значениям: у каждого хотя бы одно. */
        const counts = new Array(k).fill(1);
        for (let i = k; i < plan.total; i++) counts[Math.floor(rnd() * k)] += 1;
        if (counts.every((value, index) => aiNumSame(value, plan.answer[index]))) continue;
        const changed = counts.filter((value, index) => !aiNumSame(value, plan.answer[index])).length;
        if (changed < 1) continue;
        const list = [];
        values.forEach((value, index) => { for (let i = 0; i < counts[index]; i++) list.push(value) });
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const tmp = list[i]; list[i] = list[j]; list[j] = tmp
        }
        const fmt = source => aiNumFormat(String(source), Number(source));
        const texts = list.map(value => fmt(value));
        const question = aiNumRewrite(baseTask.question, [{
            start: plan.run[0].start, end: plan.run[plan.run.length - 1].end, text: texts.join(plan.sep)
        }]);
        if (question === baseTask.question) continue;
        const rows = plan.rows.map((row, index) => {
            const cell = String((row || [])[0] == null ? '' : (row || [])[0]);
            const tokens = aiNumTokens(cell);
            const label = tokens.length
                ? aiNumRewrite(cell, tokens.slice(-1).map(token => ({start: token.start, end: token.end, text: aiNumFormat(token.text, values[index])})))
                : fmt(values[index]);
            return [(row || []).length > 1 ? Object.assign([], row, {0: label}) : label]
        });
        const steps = values.map((value, index) => `значение ${fmt(value)} встречается ${counts[index]} ${times(counts[index])}`).join(', ')
            + `. Всего наблюдений: ${fmt(plan.total)}`;
        return Object.assign({}, task, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${plan.run.map(token => token.text).join(', ')} → ${texts.join(', ')}`,
            question: question,
            rows: rows,
            answer: counts.slice(),
            tolerance: aiNumAnswerTolerance(task, counts, counts),
            acceptedAnswers: undefined,
            solution: ait('ai.num.solution', {steps: steps})
        })
    }
    return null
}

/* ---- Доли в таблице частот: «4/14 7/14 3/14» -------------------------- */
/* Строка P задана долями с общим знаменателем. Меняем числители, сумма
   остаётся равна знаменателю, ответ — доля названного значения. */
function aiNumFractionsPlan(task, base, answer) {
    const table = (base.inputTables || [])[0];
    if (!table || (base.inputTables || []).length !== 1) return null;
    const head = table.head || [];
    const row = (table.rows || [])[0] || [];
    if (head.length < 3 || row.length !== head.length) return null;
    const cells = row.slice(1).map(cell => String(cell));
    const fractions = cells.map(cell => (cell.match(/^(?<a>\d+)\s*\/\s*(?<b>\d+)$/) || []).groups);
    if (fractions.some(item => !item)) return null;
    const base_ = Number(fractions[0].b);
    if (fractions.some(item => Number(item.b) !== base_)) return null;
    const numerators = fractions.map(item => Number(item.a));
    if (numerators.some(value => !Number.isInteger(value) || value < 1)) return null;
    if (numerators.reduce((acc, value) => acc + value, 0) !== base_) return null;
    const named = String(base.question).match(/(?:долю|доля|доля значения|частоту) значения (?<v>\d+(?:[.,]\d+)?)/);
    if (!named) return null;
    const target = aiNumValue(named.groups.v);
    const index = head.slice(1).findIndex(value => aiNumSame(aiNumValue(value), target));
    if (index < 0) return null;
    if (!aiNumSame(numerators[index] / base_, answer)) return null;
    return {
        kind: 'fractions', base: base, table: table, head: head, row: row, cells: cells,
        denominators: base_, numerators: numerators, index: index, answer: answer
    }
}

function aiNumFractionsVariant(task, plan, options, rnd) {
    const opts = options || {};
    const baseTask = plan.base || task;
    const k = plan.numerators.length;
    const pools = [10, 12, 15, 16, 20, 24, 25, 30, 40, 50];
    for (let attempt = 0; attempt < 80; attempt++) {
        const total = pools[Math.floor(rnd() * pools.length)];
        /* Числитель названного значения выбираем так, чтобы доля была короткой. */
        const options_ = [];
        for (let a = 1; a < total; a++) {
            const share = a / total;
            if (Math.abs(Number(share.toFixed(2)) - share) < 1e-9 && a >= 1) options_.push(a)
        }
        if (!options_.length) continue;
        const target = options_[Math.floor(rnd() * options_.length)];
        let left = total - target - (k - 1);
        if (left < 0) continue;
        const others = new Array(k - 1).fill(1);
        while (left > 0) {
            others[Math.floor(rnd() * (k - 1))] += 1;
            left -= 1
        }
        let cursor = 0;
        const numerators = [];
        for (let i = 0; i < k; i++) numerators.push(i === plan.index ? target : others[cursor++]);
        if (numerators.reduce((acc, value) => acc + value, 0) !== total) continue;
        const share = numerators[plan.index] / total;
        if (!aiNumNice(share)) continue;
        if (!aiNumNicerThan(share, plan.answer)) continue;
        const places = aiNumRoundPlaces(task.question);
        const rounded = aiNumRoundAnswer(share, places === null ? 2 : places);
        if (aiNumSame(rounded, plan.answer)) continue;
        const cells = numerators.map(value => `${value}/${total}`);
        const inputTables = (task.inputTables || []).map((table, index) => {
            if (index) return table;
            const rows = (table.rows || []).map((cells_, rowIndex) => {
                if (rowIndex) return cells_;
                return cells_.map((cell, cellIndex) => (cellIndex === 0 ? cell : cells[cellIndex - 1]))
            });
            return Object.assign({}, table, {rows: rows})
        });
        const fmt = source => aiNumFormat(String(aiNumRound(Number(source), 4)).replace('.', ','), Number(source));
        const steps = `${numerators[plan.index]}/${total} = ${fmt(rounded)}`;
        return Object.assign({}, task, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${plan.cells.join(', ')} → ${cells.join(', ')}`,
            inputTables: inputTables,
            answer: rounded,
            tolerance: aiNumAnswerTolerance(task, rounded, share),
            acceptedAnswers: undefined,
            solution: ait('ai.num.solution', {steps: steps})
        })
    }
    return null
}

/* ---- Порядок данных: упорядоченный ряд остаётся упорядоченным ---------- */
function aiNumOrderPlan(run, base, answer) {
    if (!Array.isArray(answer) || !run || run.length < 2) return null;
    const values = run.map(token => token.value);
    const sorted = values.slice().sort((a, b) => a - b);
    if (sorted.length !== answer.length) return null;
    if (!sorted.every((value, index) => aiNumSame(value, answer[index]))) return null;
    return {
        kind: 'dataset', stat: 'sorted', base: base, values: values, slots: aiNumNamedSlots(run), answer: answer,
        calc: next => next.slice().sort((a, b) => a - b),
        steps: (next, result, fmt) => `По возрастанию: ${result.map(value => fmt(value)).join('; ')}`
    }
}

/* ---- Общая формула по числам условия ---------------------------------- */
/* Последняя попытка: если ответ курса воспроизводится ровно одной комбинацией
   чисел условия, пересчитываем по ней. Уникальность важна — похожие формулы
   не должны подменять друг друга. Числа-метки (X=2, X≥3) не трогаем. */
const AI_NUM_EXPR = [
    {id: 'value', arity: 1, calc: values => values[0]},
    {id: 'square', arity: 1, calc: values => values[0] ** 2, steps: (values, answer, fmt) => `${fmt(values[0])}² = ${fmt(answer)}`},
    {id: 'root', arity: 1, calc: values => Math.sqrt(values[0]), steps: (values, answer, fmt) => `√${fmt(values[0])} = ${fmt(answer)}`},
    {id: 'reciprocal', arity: 1, check: values => values[0] !== 0, calc: values => 1 / values[0], steps: (values, answer, fmt) => `1 / ${fmt(values[0])} = ${fmt(answer)}`},
    {id: 'sum', arity: 2, calc: values => values[0] + values[1], steps: (values, answer, fmt) => `${fmt(values[0])} + ${fmt(values[1])} = ${fmt(answer)}`},
    {id: 'difference', arity: 2, calc: values => values[0] - values[1], steps: (values, answer, fmt) => `${fmt(values[0])} - ${aiNumTerm(values[1], fmt)} = ${fmt(answer)}`},
    {id: 'product', arity: 2, calc: values => values[0] * values[1], steps: (values, answer, fmt) => `${fmt(values[0])} · ${fmt(values[1])} = ${fmt(answer)}`},
    {id: 'ratio', arity: 2, check: values => values[1] !== 0, calc: values => values[0] / values[1], steps: (values, answer, fmt) => `${fmt(values[0])} / ${fmt(values[1])} = ${fmt(answer)}`},
    {id: 'percent', arity: 2, check: values => values[1] !== 0, calc: values => values[0] / values[1] * 100, steps: (values, answer, fmt) => `${fmt(values[0])} / ${fmt(values[1])} · 100% = ${fmt(answer)}`},
    {id: 'geometric-two', arity: 1, check: values => values[0] > 0 && values[0] < 1, calc: values => (1 - values[0]) ** 2, steps: (values, answer, fmt) => `(1 - ${fmt(values[0])})² = ${fmt(answer)}`},
    {id: 'uniform-variance', arity: 2, check: values => values[1] > values[0], calc: values => (values[1] - values[0]) ** 2 / 12, steps: (values, answer, fmt) => `(${fmt(values[1])} - ${aiNumTerm(values[0], fmt)})² / 12 = ${fmt(answer)}`},
    {id: 'total', arity: 0, calc: values => values.reduce((acc, value) => acc + value, 0), steps: (values, answer, fmt) => `${values.map(value => fmt(value)).join(' + ')} = ${fmt(answer)}`}
];

/* Сочетания: C(n, k). */
function aiNumChoose(n, k) {
    if (!Number.isFinite(n) || !Number.isFinite(k) || k < 0 || n < 0 || k > n) return null;
    let out = 1;
    for (let i = 1; i <= k; i++) out = out * (n - k + i) / i;
    return out
}

/* Числа-метки вопроса («X=2», «X ≤ 3») остаются на месте: это не данные. */
function aiNumTokenIsLabel(question, token) {
    const text = String(question == null ? '' : question);
    const before = text.slice(Math.max(0, token.start - 4), token.start);
    const after = text.slice(token.end, token.end + 4);
    if (/[XxХх]\s*[=<>≤≥]\s*$/.test(before)) return true;
    return /^\s*[=<>≤≥]\s*[XxХх]/.test(after)
}

function aiNumCombinations(size, arity) {
    const out = [];
    const walk = (start, combo) => {
        if (combo.length === arity) { out.push(combo.slice()); return }
        for (let i = start; i < size; i++) { combo.push(i); walk(i + 1, combo); combo.pop() }
    };
    walk(0, []);
    return out
}

function aiNumGenericPlan(task, question, run, answer) {
    if (Array.isArray(answer) || !run || !run.length || run.length > 4) return null;
    /* В заданиях с таблицей или графиком числа условия могут быть подписями:
       там работают точные планы, а общая формула легко ошибается. */
    if ((task.inputTables || []).length || task.chart) return null;
    const values = run.map(token => token.value);
    const matches = [];
    const labels = run.map(token => aiNumTokenIsLabel(question, token));
    for (const expr of AI_NUM_EXPR) {
        /* arity 0 — сразу все числа условия (сумма набора). */
        const combos = expr.arity === 0
            ? (labels.some(Boolean) ? [] : [run.map((token, index) => index)])
            : aiNumCombinations(run.length, expr.arity);
        for (const combo of combos) {
            if (combo.some(index => labels[index])) continue;
            const args = combo.map(index => values[index]);
            if (expr.check && !expr.check(args)) continue;
            let value = null;
            try { value = expr.calc(args) } catch (error) { value = null }
            if (value === null || !Number.isFinite(value)) continue;
            if (!aiNumSame(value, answer)) continue;
            matches.push({expr: expr, indexes: combo})
        }
    }
    if (!matches.length) return null;
    /* Формул может оказаться несколько («сумма» и «все числа» считают одно и
       то же). Берём набор, если все они трогают одни и те же числа: тогда в
       варианте достаточно проверить, что формулы дают один и тот же ответ. */
    const indexes = matches[0].indexes.join(',');
    if (matches.some(match => match.indexes.join(',') !== indexes)) return null;
    const picked = matches[0];
    return {
        kind: 'dataset', stat: 'formula', base: null, values: values, answer: answer,
        slots: picked.indexes.map(index => Object.assign({}, run[index], {name: 'v' + index})),
        calc: next => picked.expr.calc(next),
        calcs: matches.map(match => next => match.expr.calc(next)),
        steps: (next, result, fmt) => (picked.expr.steps ? String(picked.expr.steps(next, result, fmt) || '') : '')
    }
}

/* ---- Закон распределения в таблице ----------------------------------- */
/* Таблица курса: в шапке значения X, в строке — вероятности. Меняем только
   вероятности, а ответ считаем по формулировке задания. */
function aiNumLawPlan(task, base, answer) {
    const baseTable = base && (base.inputTables || [])[0];
    const table = (task.inputTables || [])[0];
    if (!baseTable || !table) return null;
    const head = baseTable.head || [], row = (baseTable.rows || [])[0] || [];
    const localHead = table.head || [], localRow = (table.rows || [])[0] || [];
    if (head.length < 3 || row.length !== head.length) return null;
    if (localHead.length !== head.length || localRow.length !== row.length) return null;
    if (!/^(x|значение|xi)$/i.test(String(head[0] == null ? '' : head[0]).trim())) return null;
    if (!/^(p|вероятность)/i.test(String(row[0] == null ? '' : row[0]).trim())) return null;
    if (head.slice(1).some((cell, i) => String(cell).trim() !== String(localHead[i + 1]).trim())) return null;
    const xs = head.slice(1).map(value => aiNumValue(value));
    if (xs.some(value => value === null)) return null;
    const values = row.slice(1).map(value => aiNumValue(value));
    const known = [];
    values.forEach((value, index) => { if (value !== null) known.push({value: value, index: index}) });
    if (known.length < 2) return null;
    const missing = values.indexOf(null);
    if (missing >= 0 && values.filter(value => value === null).length > 1) return null;
    const knownValues = known.map(cell => cell.value);
    const total = knownValues.reduce((acc, value) => acc + value, 0);
    const question = base.question;
    const sumWhere = test => values.map((value, index) => ({x: xs[index], p: value}))
        .filter(cell => cell.p !== null && test(cell.x))
        .reduce((acc, cell) => acc + cell.p, 0);
    const bound = question.match(/P\(\s*X\s*(?<op>≤|≥|<|>)\s*(?<t>[−-]?\d+(?:[.,]\d+)?)\s*\)/);
    const notEqual = question.match(/вероятность, что X не равно (?<t>[−-]?\d+(?:[.,]\d+)?)/);
    const cumulative = /накопленные вероятности/.test(question);
    let mode = null;
    if (missing >= 0 && /пропущенн/.test(question)) mode = 'missing';
    else if (cumulative && missing < 0) mode = 'cumulative';
    else if (bound && missing < 0) mode = 'bound';
    else if (notEqual && missing < 0) mode = 'not-equal';
    if (!mode) return null;
    const test = mode === 'bound' ? aiNumCompareOp(bound.groups.op, Number(String(bound.groups.t).replace(',', '.'))) : null;
    const target = mode === 'not-equal' ? Number(String(notEqual.groups.t).replace(',', '.')) : null;
    const calc = next => {
        const full = values.map((value, index) => value === null ? 1 - next.reduce((acc, item) => acc + item, 0) : next[known.findIndex(cell => cell.index === index)]);
        if (mode === 'missing') return 1 - next.reduce((acc, item) => acc + item, 0);
        if (mode === 'cumulative') {
            let running = 0;
            return full.map(value => (running += value))
        }
        if (mode === 'not-equal') return 1 - full.filter((value, index) => aiNumSame(xs[index], target)).reduce((acc, value) => acc + value, 0);
        return full.filter((value, index) => test(xs[index])).reduce((acc, value) => acc + value, 0)
    };
    if (!aiNumSame(calc(knownValues), answer)) return null;
    return {
        kind: 'law', base: base, values: knownValues, cells: known.map(cell => cell.index), xs: xs,
        table: table, row: localRow, answer: answer, calc: calc, mode: mode, free: missing >= 0,
        steps: next => aiNumLawSteps(mode, values, known, xs, test, target, next, calc(next))
    }
}

function aiNumCompareOp(op, target) {
    if (op === '≤') return value => value <= target + 1e-9;
    if (op === '≥') return value => value >= target - 1e-9;
    if (op === '<') return value => value < target - 1e-9;
    return value => value > target + 1e-9
}

function aiNumLawSteps(mode, values, known, xs, test, target, next, result) {
    const full = values.map((value, index) => value === null ? 1 - next.reduce((acc, item) => acc + item, 0) : next[known.findIndex(cell => cell.index === index)]);
    if (mode === 'missing') return `1 - (${aiNumList(next)}) = ${aiNumList([result])}`;
    if (mode === 'cumulative') return full.map((value, index) => index + 1).map((count, index) =>
        full.slice(0, count).map(item => aiNumFormat(String(item), item)).join(' + ') + ' = ' + aiNumList([full.slice(0, count).reduce((acc, item) => acc + item, 0)])).join('; ');
    if (mode === 'not-equal') return `1 - ${aiNumList(full.filter((value, index) => aiNumSame(xs[index], target)))} = ${aiNumList([result])}`;
    return `${aiNumList(full.filter((value, index) => test(xs[index])))} = ${aiNumList([result])}`
}

/* Вероятности закона набираем целыми весами: сумма обязана остаться ровно
   единицей, а знаков после запятой столько же, сколько было в курсе.
   Если одна вероятность пропущена (её и находят), веса занимают не весь
   запас — остаток достаётся пропущенной клетке. */
function aiNumPickLaw(values, texts, rnd, freeSlot) {
    const places = Math.max(...texts.map(text => ((text.match(/[.,](\d+)/) || [])[1] || '').length));
    const base = places >= 2 ? 100 : 10;
    const step = places >= 2 ? 10 : 1;
    const count = values.length;
    for (let attempt = 0; attempt < 80; attempt++) {
        const spare = Math.floor(base / step) - count;
        const total = freeSlot ? base - step * (1 + Math.floor(rnd() * Math.max(1, spare))) : base;
        if (total < count * step) continue;
        const weights = [];
        let used = 0;
        for (let i = 0; i < count; i++) {
            const room = total - used - (count - 1 - i) * step;
            if (room < step) break;
            const weight = i === count - 1 ? room : step * (1 + Math.floor(rnd() * Math.floor(room / step)));
            weights.push(weight);
            used += weight
        }
        if (weights.length !== count) continue;
        const next = weights.map(weight => Number((weight / base).toFixed(places)));
        /* Меняем все вероятности, иначе таблица выглядит почти прежней. */
        if (next.some((value, index) => aiNumSame(value, values[index]))) continue;
        return next
    }
    return null
}

/* План пересчёта: либо подходящая формула, либо набор данных с характеристикой. */
function aiNumPlan(task) {
    if (!task || !task.question) return null;
    if (!['number', 'table', 'graph'].includes(task.type)) return null;
    const answer = aiNumAnswerValue(task.answer);
    if (answer === null) return null;
    const base = aiNumBaseTask(task) || task;
    const question = base.question;
    for (const rule of AI_NUM_RULES) {
        const found = aiNumRuleVerified(rule, question, answer);
        if (found) return {kind: 'rule', rule: rule, found: found, slots: found.slots, answer: answer, base: base}
    }
    const run = aiNumLongestRun(question);
    const moment = aiNumMomentPlan(task, base, answer);
    if (moment) return moment;
    const rows = aiNumRowStatsPlan(run, base, answer);
    if (rows) return Object.assign(rows, {base: base});
    const law = aiNumLawPlan(task, base, answer);
    if (law) return law;
    const counts = aiNumCountsPlan(task, base, answer);
    if (counts) return counts;
    const fractions = aiNumFractionsPlan(task, base, answer);
    if (fractions) return fractions;
    const datalist = aiNumDataListPlan(task, base, answer);
    if (datalist) return datalist;
    const order = aiNumOrderPlan(run, base, answer);
    if (order) return order;
    const generic = aiNumGenericPlan(task, question, run, answer);
    if (generic) return Object.assign(generic, {base: base});
    if (!run || run.length < 3) return null;
    const values = run.map(token => token.value);
    const stats = aiNumStats(values);
    const asked = aiNumAskedStats(question, task)
        .filter(stat => aiNumStatValue(stat, stats) !== null && aiNumSame(aiNumStatValue(stat, stats), answer));
    if (!asked.length) return null;
    const stat = asked[0];
    return {
        kind: 'dataset', base: base, stat: stat, values: values, slots: aiNumNamedSlots(run), answer: answer,
        calc: next => aiNumStatValue(stat, aiNumStats(next)),
        steps: (next, result, fmt) => aiNumStatSteps(stat, next, result, fmt)
    }
}

/* Слотам набора данных даём имена: по ним числа условия меняются по отдельности. */
function aiNumNamedSlots(run) {
    return (run || []).map((token, index) => Object.assign({}, token, {name: 'v' + index}))
}

/* Красивый ответ: дробь без длинного хвоста. */
function aiNumNice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return false;
    return Math.abs(Number(number.toFixed(4)) - number) < 1e-9
}

/* Самая длинная цепочка чисел, разделённых только знаками препинания. */
/* «4,7,3» — три числа, а не «4,7» и «3»: разделяем, если сразу за запятой
   идёт ещё цифра. Десятичная запись («0,5») остаётся нетронутой. */
function aiNumListTokens(source, tokens) {
    const out = [];
    for (const token of tokens) {
        if (token.text.includes(',') && /^,\d/.test(source.slice(token.end))) {
            let start = token.start;
            for (const part of token.text.split(',')) {
                out.push({text: part, value: Number(part), start: start, end: start + part.length});
                start += part.length + 1
            }
            continue
        }
        out.push(token)
    }
    return out
}

function aiNumLongestRun(question) {
    const source = String(question == null ? '' : question);
    const tokens = aiNumListTokens(source, aiNumTokens(source));
    if (!tokens.length) return null;
    let best = null;
    let start = 0;
    for (let i = 1; i <= tokens.length; i++) {
        const joined = i < tokens.length && /^[\s,;:]*(?:и|and|және)?[\s,;:]*$/.test(source.slice(tokens[i - 1].end, tokens[i].start));
        if (joined) continue;
        const run = tokens.slice(start, i);
        if (!best || run.length > best.length) best = run;
        start = i
    }
    return best && best.length ? best : null
}

/* Что именно спрашивают про набор данных. */
function aiNumAskedStats(question, task) {
    const lower = String(question == null ? '' : question).toLowerCase();
    const asked = [];
    for (const word of AI_NUM_STAT_WORDS) {
        if (!word.re.test(lower)) continue;
        /* «Объём выборки» на графике частот — это сумма всех частот. */
        if (word.stat === 'count' && task && (task.chart || task.type === 'graph')) { asked.push('sum'); continue }
        asked.push(word.stat)
    }
    /* «Крайние значения» — это минимум и максимум сразу. */
    if (/крайн/.test(lower)) { asked.push('min'); asked.push('max') }
    const unique = [...new Set(asked)];
    return /крайн/.test(lower) ? unique.filter(stat => stat !== 'min').concat(['min', 'max']) : unique
}

/* Таблица, где в каждой строке своя характеристика набора. */
function aiNumRowStatsPlan(run, baseTask, answer) {
    const rows = (baseTask && baseTask.rows) || [];
    if (!run || run.length < 3) return null;
    if (!Array.isArray(answer) || !rows.length || rows.length !== answer.length) return null;
    const values = run.map(token => token.value);
    const stats = aiNumStats(values);
    const plan = [];
    for (let i = 0; i < rows.length; i++) {
        const label = Array.isArray(rows[i]) ? String(rows[i][0]) : String(rows[i]);
        const stat = aiNumWordsStats(label).find(name => aiNumStatValue(name, stats) !== null && aiNumSame(aiNumStatValue(name, stats), answer[i]));
        if (!stat) return null;
        plan.push(stat)
    }
    return {
        kind: 'rows', stats: plan, values: values, slots: aiNumNamedSlots(run), answer: answer,
        calc: next => plan.map(stat => aiNumStatValue(stat, aiNumStats(next))),
        steps: (next, result, fmt) => {
            const stats = aiNumStats(next);
            return plan.map((stat, i) => `${ait('ai.num.stat.' + stat)}: ${aiNumStatSteps(stat, next, aiNumStatValue(stat, stats), fmt)}`).join('; ')
        }
    }
}

/* Отрицательное число в разборе берём в скобки: «10 - (-5)», а не «10 - -5». */
function aiNumTerm(value, fmt) {
    return Number(value) < 0 ? `(${fmt(value)})` : fmt(value)
}

function aiNumStatSteps(stat, values, result, fmt) {
    const stats = aiNumStats(values);
    if (stat === 'range') return `${fmt(stats.max)} - ${aiNumTerm(stats.min, fmt)} = ${fmt(result)}`;
    if (stat === 'mean') return `(${values.map(value => fmt(value)).join(' + ')}) / ${values.length} = ${fmt(result)}`;
    if (stat === 'sum') return `${values.map(value => fmt(value)).join(' + ')} = ${fmt(result)}`;
    if (stat === 'count') return String(values.length);
    if (stat === 'median') return `${stats.sorted.map(value => fmt(value)).join('; ')} = ${fmt(result)}`;
    if (stat === 'variance') return `Σ(x - ${fmt(stats.mean)})² / ${values.length} = ${fmt(result)}`;
    if (stat === 'sd') return `√${fmt(stats.variance)} = ${fmt(result)}`;
    return fmt(result)
}

/* ---- Сборка варианта -------------------------------------------------- */

function aiNumDefaultSpec(slot) {
    const isDecimal = /[.,]/.test(slot.text);
    if (!isDecimal) return {kind: 'int'}
    if (slot.value > 0 && slot.value < 1) return {kind: 'prob', min: 0.05, max: 0.95}
    return {kind: 'dec', min: 0.01}
}

function aiNumValuesSane(values, source) {
    if (!values.length) return false;
    if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 1e6)) return false;
    /* Данные без отрицательных чисел не должны ими обзавестись. */
    if (values.some(value => value < 0) && !values.some(value => value > 0)) return false;
    /* Набор из разных чисел не превращаем в константу: задача станет пустой. */
    if (source && new Set(source).size > 1 && new Set(values).size < 2) return false;
    return true
}

/* Ответ должен попадать в разумные границы: школа, а не миллионы. */
function aiNumAnswerSane(value) {
    if (Array.isArray(value)) return value.length > 0 && value.every(item => Number.isFinite(Number(item)) && Math.abs(Number(item)) < 1e6);
    if (!Number.isFinite(Number(value))) return false;
    return Math.abs(Number(value)) < 1e6
}

/* Набор данных меняем целиком: одинаковые значения остаются одинаковыми
   (мода и повторы не ломаются), а порядок и правдоподобные границы сохраняются.
   Одно и то же преобразование применяется ко всем числам набора. */
function aiNumPickData(values, rnd, strict) {
    if (!values.length) return null;
    const ints = values.every(value => Number.isInteger(value));
    const distinct = [...new Set(values)].sort((a, b) => a - b);
    const stats = aiNumStats(values);
    /* Пятибалльные отметки и другие малые данные не выводим за привычную шкалу. */
    const marks = ints && stats.min >= 1 && stats.max <= 5;
    const span = Math.max(1, Math.round((stats.max - stats.min) / 4));
    const lowBound = marks ? 1 : Math.max(stats.min >= 0 ? 0 : stats.min - span, stats.min - span);
    const highBound = marks ? 5 : stats.max + span;
    const keepDistinct = [];
    const collapsed = [];
    for (const scale of [1, 1.25, 0.8, 0.5, 1.5, 0.75, 2]) {
        for (const shift of [0, 1, -1, 2, -2, 3, -3]) {
            if (scale === 1 && shift === 0) continue;
            const map = distinct.map(value => ints ? Math.round(value * scale + shift) : Number((value * scale + shift).toFixed(2)));
            if (map.some(value => value < lowBound || value > highBound)) continue;
            /* Одинаковые числа остаются одинаковыми, а разные — по возможности разными. */
            if (new Set(map).size >= distinct.length) keepDistinct.push(map);
            else if (new Set(map).size >= Math.min(distinct.length, 2)) collapsed.push(map)
        }
    }
    /* Свежие случайные карты: каждый вызов генератора даёт новые числа.
       Набор подходящих значений перемешиваем; если условие показывает числа
       по возрастанию, порядок сохраняем — иначе ряд перестанет быть рядом. */
    const count = distinct.length;
    const width = Math.max(1, highBound - lowBound);
    const quantum = ints ? 1 : 0.01;
    const room = Math.round(width / quantum);
    const ascending = values.every((value, index) => index === 0 || value >= values[index - 1]);
    const levels = [];
    for (let i = 0; i <= room && levels.length <= 400; i++) levels.push(Number((lowBound + i * quantum).toFixed(2)));
    for (let attempt = 0; attempt < 60 && levels.length >= count; attempt++) {
        const pool = levels.slice();
        const chosen = [];
        while (chosen.length < count) {
            const index = Math.floor(rnd() * pool.length);
            chosen.push(pool[index]);
            pool.splice(index, 1)
        }
        chosen.sort((a, b) => a - b);
        const map = chosen.slice();
        if (!ascending) {
            for (let i = map.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                const swap = map[i];
                map[i] = map[j];
                map[j] = swap
            }
        }
        if (new Set(map).size !== count) continue;
        if (map.every((value, index) => aiNumSame(value, distinct[index]))) continue;
        keepDistinct.push(map)
    }
    const options = strict && keepDistinct.length ? keepDistinct : keepDistinct.concat(collapsed);
    if (!options.length) return null;
    /* Предпочитаем карты, где меняется не одно число, а хотя бы два. */
    const changed = map => map.filter((value, index) => !aiNumSame(value, distinct[index])).length;
    const strong = options.filter(map => changed(map) >= Math.min(2, distinct.length));
    const pool = strong.length ? strong : options;
    const map = pool[Math.floor(rnd() * pool.length)];
    return values.map(value => map[distinct.indexOf(value)])
}

/* Если условие просит округлить до 0,001, ответ печатаем именно так. */
function aiNumRoundPlaces(question) {
    const match = String(question || '').match(/округл[а-яё]*\s+до\s+(?<d>\d+(?:[.,]\d+)?)/);
    if (!match || !match.groups) return null;
    const places = ((String(match.groups.d).match(/[.,](\d+)/) || [])[1] || '').length;
    return places ? Math.min(places, 4) : null
}

/* Ответ печатаем коротко: 0,6667 вместо 0,6666666666666666. Допуск проверки
   поднимаем до 1e-4, чтобы точное значение тоже засчитывалось. */
function aiNumRoundAnswer(value, places) {
    const digits = places === undefined || places === null ? 4 : places;
    if (Array.isArray(value)) return value.map(item => aiNumRound(item, digits));
    return aiNumRound(value, digits)
}

function aiNumAnswerTolerance(task, rounded, exact) {
    const current = task && typeof task.tolerance === 'number' ? task.tolerance : 0;
    return aiNumSame(rounded, exact) ? (current || undefined) : Math.max(current, 1e-4)
}

/* Новый ответ не должен быть «длиннее» эталонного: 0,3 остаётся 0,3, а не 0,4667. */
function aiNumNicerThan(value, original) {
    if (Array.isArray(value) || Array.isArray(original)) {
        const left = Array.isArray(value) ? value : [value], right = Array.isArray(original) ? original : [original];
        return left.length === right.length && left.every((item, i) => aiNumNicerThan(item, right[i]))
    }
    if (!aiNumNice(original)) return true;
    return aiNumNice(value)
}

/* Вероятности бывают перечислены и в условии («полигон показывает 0,1; 0,6; 0,3»).
   Тогда их нужно заменить там же, иначе условие разойдётся с таблицей. */
function aiNumLawQuestion(question, oldValues, newValues) {
    const tokens = aiNumTokens(question);
    if (!tokens.length) return {text: null, mentioned: false};
    const mentioned = tokens.some(token => oldValues.some(value => aiNumSame(token.value, value)));
    if (!mentioned) return {text: null, mentioned: false};
    /* Ищем нужные числа подряд: в условии они перечислены списком. Из
       подходящих списков берём последний — данные идут после подписей. */
    const targets = [];
    for (let start = 0; start + oldValues.length <= tokens.length; start++) {
        let hit = true;
        for (let i = 0; i < oldValues.length; i++) {
            if (!aiNumSame(tokens[start + i].value, oldValues[i])) { hit = false; break }
        }
        if (hit) targets.push(start)
    }
    if (!targets.length) return {text: null, mentioned: true};
    const start = targets[targets.length - 1];
    const positions = [];
    for (let i = 0; i < oldValues.length; i++) positions.push(start + i);
    const replacements = positions.map((index, i) => ({start: tokens[index].start, end: tokens[index].end,
        text: aiNumFormat(tokens[index].text, newValues[i])}));
    const text = aiNumRewrite(question, replacements);
    return {text: text === question ? null : text, mentioned: true}
}

/* Вариант табличного закона: в таблице меняются вероятности, ответ — заново. */
function aiNumLawVariant(task, plan, options, rnd) {
    const opts = options || {};
    const baseTask = plan.base || task;
    const row = (task.inputTables || [])[0] && ((task.inputTables || [])[0].rows || [])[0];
    if (!row) return null;
    const texts = plan.cells.map(index => String(row[index + 1]));
    for (let attempt = 0; attempt < 60; attempt++) {
        const next = aiNumPickLaw(plan.values, texts, rnd, plan.free);
        if (!next) continue;
        let value = null;
        try { value = plan.calc(next) } catch (error) { value = null }
        if (value === null || value === undefined) continue;
        if (!aiNumAnswerSane(value)) continue;
        if (!aiNumNicerThan(value, plan.answer)) continue;
        const rounded = aiNumRoundAnswer(value, 4);
        if (aiNumSame(rounded, plan.answer)) continue;
        const label = aiNumLawQuestion(task.question, plan.values, next);
        /* Если вероятности упомянуты в условии, а переписать их не удалось,
           вариант не создаём: условие и таблица разошлись бы. */
        if (label.mentioned && !label.text) continue;
        const inputTables = (task.inputTables || []).map((table, index) => {
            if (index) return table;
            const rows = (table.rows || []).map((cells, rowIndex) => {
                if (rowIndex) return cells;
                return cells.map((cell, cellIndex) => {
                    const slot = plan.cells.indexOf(cellIndex - 1);
                    if (cellIndex === 0 || slot < 0) return cell;
                    return aiNumFormat(String(plan.row[cellIndex]), next[slot])
                })
            });
            return Object.assign({}, table, {rows: rows})
        });
        const chart = task.chart && Array.isArray(task.chart.ys)
            ? Object.assign({}, task.chart, {ys: aiNumMirrorSeries(task.chart.ys, plan.values, next)})
            : task.chart;
        return Object.assign({}, task, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${texts.join(', ')} → ${next.map((item, index) => aiNumFormat(texts[index], item)).join(', ')}`,
            question: label.text || task.question,
            chart: chart,
            inputTables: inputTables,
            answer: rounded,
            tolerance: aiNumAnswerTolerance(task, rounded, value),
            acceptedAnswers: undefined,
            solution: ait('ai.num.solution', {steps: plan.steps(next)})
        })
    }
    return null
}


/* Вариант задания: новые числа, пересчитанный ответ и разбор. */
function aiTaskNumberVariant(task, options) {
    const opts = options || {};
    const plan = aiNumPlan(task);
    if (!plan) return null;
    const rnd = typeof opts.random === 'function' ? opts.random : Math.random;
    const baseTask = plan.base || task;
    if (plan.kind === 'law') return aiNumLawVariant(task, plan, opts, rnd);
    if (plan.kind === 'moment') return aiNumMomentVariant(task, plan, opts, rnd);
    if (plan.kind === 'counts') return aiNumCountsVariant(task, plan, opts, rnd);
    if (plan.kind === 'fractions') return aiNumFractionsVariant(task, plan, opts, rnd);
    if (plan.kind === 'datalist') return aiNumDataListVariant(task, plan, opts, rnd);
    const located = aiNumLocateSlots(baseTask.question, task.question, plan.slots);
    if (!located) return null;
    const kept = plan.rule && plan.rule.keep ? plan.rule.keep : [];
    const mutable = located.filter(slot => !kept.includes(slot.name));
    if (!mutable.length && !(plan.rule && plan.rule.derived)) return null;
    for (let attempt = 0; attempt < 60; attempt++) {
        const args = plan.found ? Object.assign({}, plan.found.args) : {};
        const texts = {};
        const values = {};
        let failed = false;
        if (plan.kind === 'rule') {
            for (const slot of mutable) {
                if (plan.rule.derived && plan.rule.derived[slot.name]) continue;
                const spec = Object.assign({}, aiNumDefaultSpec(slot), (plan.rule.spec && plan.rule.spec[slot.name]) || {});
                const picked = aiNumPick(slot, spec, rnd);
                if (picked === null) { failed = true; break }
                /* В условие попадает ровно то число, которое показывает текст. */
                const text = aiNumFormat(slot.text, picked);
                const value = aiNumValue(text);
                if (value === null || aiNumSame(value, slot.value)) { failed = true; break }
                texts[slot.name] = text;
                values[slot.name] = value;
                args[slot.name] = value
            }
        } else {
            const picked = aiNumPickData(located.map(slot => slot.value), rnd, attempt < 16);
            if (!picked) continue;
            if (!aiNumValuesSane(picked, located.map(slot => slot.value))) continue;
            for (let i = 0; i < located.length; i++) {
                const slot = located[i];
                const text = aiNumFormat(slot.text, picked[i]);
                const value = aiNumValue(text);
                if (value === null) { failed = true; break }
                texts[slot.name] = text;
                values[slot.name] = value;
                args[slot.name] = value
            }
            if (!aiNumValuesSane(located.map(slot => args[slot.name]), located.map(slot => slot.value))) continue;
            /* Набор данных должен остаться разным: одни и те же числа не считаем. */
            if (located.every(slot => aiNumSame(args[slot.name], slot.value))) continue
        }
        if (failed) continue;
        for (const name of Object.keys((plan.rule && plan.rule.derived) || {})) {
            const slot = located.find(item => item.name === name);
            if (!slot) { failed = true; break }
            let value = null;
            try { value = plan.rule.derived[name](args, rnd) } catch (error) { value = null }
            if (value === null || !Number.isFinite(Number(value))) { failed = true; break }
            const text = aiNumFormat(slot.text, value);
            const parsed = aiNumValue(text);
            if (parsed === null || aiNumSame(parsed, slot.value)) { failed = true; break }
            texts[name] = text;
            values[name] = parsed;
            args[name] = parsed
        }
        if (failed) continue;
        let value = null;
        try {
            value = plan.kind === 'rule' ? plan.rule.calc(args) : plan.calc(mutable.map(slot => args[slot.name]))
        } catch (error) { value = null }
        if (value === null || value === undefined) continue;
        if (!aiNumAnswerSane(value)) continue;
        if (plan.kind === 'rule' && plan.rule.check && !plan.rule.check(args)) continue;
        /* Несколько подходящих формул: ответ принимаем, только если все они
           дают одно и то же число — тогда задача решается однозначно. */
        if (plan.calcs && plan.calcs.length > 1) {
            const picked = mutable.map(slot => args[slot.name]);
            const agreed = plan.calcs.every(calc => {
                let other = null;
                try { other = calc(picked) } catch (error) { other = null }
                return other !== null && aiNumSame(other, value)
            });
            if (!agreed) continue
        }
        /* Если ответ курса — короткая дробь, новый тоже должен быть коротким. */
        if (!aiNumNicerThan(value, plan.answer)) continue;
        const places = aiNumRoundPlaces(task.question);
        const rounded = aiNumRoundAnswer(value, places);
        if (aiNumSame(rounded, plan.answer)) continue;
        const replacements = [];
        const fromTexts = [];
        const toTexts = [];
        const fromValues = [];
        const toValues = [];
        for (const slot of located) {
            const text = texts[slot.name];
            if (text === undefined) continue;
            replacements.push({start: slot.start, end: slot.end, text: text});
            fromTexts.push(slot.text);
            toTexts.push(text);
            fromValues.push(slot.value);
            toValues.push(values[slot.name])
        }
        const question = aiNumRewrite(task.question, replacements);
        if (question === task.question) continue;
        const patch = aiNumMirrorData(task, fromValues, toValues);
        const fmt = source => aiNumFormat(String(aiNumRound(Number(source), places === null ? 4 : places)), Number(source));
        const steps = plan.kind === 'rule'
            ? (plan.rule.steps ? String(plan.rule.steps(args, value, fmt) || '') : '')
            : String(plan.steps(mutable.map(slot => args[slot.name]), value, fmt) || '');
        return Object.assign({}, task, patch, {
            id: 'ainum-' + (baseTask.id || 'task') + '-' + Date.now().toString(36) + '-' + Math.floor(rnd() * 46656).toString(36),
            origin: baseTask.id || '',
            source: 'course',
            sectionId: opts.sectionId || task.sectionId || '',
            sectionTitle: opts.sectionTitle || task.sectionTitle || '',
            numbersChanged: true,
            numbersPreview: `${fromTexts.join(', ')} → ${toTexts.join(', ')}`,
            question: question,
            answer: rounded,
            tolerance: aiNumAnswerTolerance(task, rounded, value),
            acceptedAnswers: undefined,
            solution: steps ? ait('ai.num.solution', {steps: steps}) : ait('ai.num.solutionShort', {answer: String(rounded)})
        })
    }
    return null
}

/* Подпись к задаче: сработал ли пересчёт (карточка сама показывает «было → стало»). */
function aiNumberSwapNote(task) {
    if (!aiNumberSwapEnabled()) return '';
    if (task && task.numbersChanged) return '';
    return ait('ai.num.kept')
}

/* Переключатель в карточке генератора. */
function aiNumberSwapEnabled() {
    if (typeof aiSettings !== 'function') return false;
    return aiSettings().aiSwapNumbers !== false
}

function aiToggleNumberSwap(enabled) {
    const settings = aiSettings();
    settings.aiSwapNumbers = !!enabled;
    if (typeof persist === 'function') persist();
    if (typeof toast === 'function') toast(ait('ai.num.' + (enabled ? 'on' : 'off')), !enabled)
}
