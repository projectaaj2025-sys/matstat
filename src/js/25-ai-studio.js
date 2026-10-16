/* ---- Студия задач: генерация, разбор и проверка ----------------------- */
/* Задача из генератора — это такая же карточка, как в курсе: условие,
   таблицы данных, график, поле ответа и разбор. Без ключа берётся задание
   курса, с ключом — новая задача от модели в том же формате. */

const aiStudioTasks = {};

function aiStudioRegister(key, task) {
    if (!key || !task) return;
    aiStudioTasks[key] = task
}

/* ---- Хранилище сгенерированных задач --------------------------------- */

function aiTaskStore() {
    const s = aiSettings();
    if (!Array.isArray(s.aiTasks)) s.aiTasks = [];
    return s.aiTasks
}

function aiPlainTask(task) {
    const out = {
        id: task.id, type: task.type, question: task.question, options: task.options,
        inputTables: task.inputTables, chart: task.chart, answer: task.answer,
        acceptedAnswers: task.acceptedAnswers, tolerance: task.tolerance,
        hint: task.hint, solution: task.solution, sectionId: task.sectionId, sectionTitle: task.sectionTitle,
        /* Задача с новыми числами хранится целиком: перерисовка из курса её потеряет. */
        source: task.source, origin: task.origin, numbersChanged: task.numbersChanged, numbersPreview: task.numbersPreview,
        /* Контекст PISA, вид и сложность нужны карточке и рабочему листу после перезагрузки. */
        aiContext: task.aiContext, difficulty: task.difficulty, genKind: task.genKind,
        rows: task.rows, headers: task.headers, rubric: task.rubric
    };
    for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
    return out
}

function aiTaskStoreAdd(task, section) {
    const store = aiTaskStore();
    const item = {
        id: 'ai-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ts: Date.now(),
        topicId: (section && section.id) || task.sectionId || '',
        source: task.source === 'model' ? 'model' : 'course'
    };
    /* Вид, сложность и контекст лежат и на самой записи: задача курса по
       ссылке refId при перерисовке возьмёт их отсюда. */
    if (task.difficulty) item.difficulty = task.difficulty;
    if (task.genKind) item.genKind = task.genKind;
    if (task.aiContext) item.aiContext = task.aiContext;
    if (item.source === 'course' && task.id && taskMap[task.id] && !task.numbersChanged) item.refId = task.id;
    else item.task = aiPlainTask(task);
    store.unshift(item);
    while (store.length > 24) store.pop();
    persist();
    return item
}

function aiStudioRemove(key) {
    const store = aiTaskStore();
    const index = store.findIndex(item => item.id === key);
    if (index < 0) return;
    store.splice(index, 1);
    const selected = aiWsSelected();
    const at = selected.indexOf(key);
    if (at >= 0) selected.splice(at, 1);
    persist();
    aiRenderStudio();
    toast(ait('ai.studio.removed'))
}

/* ---- Сложность созданных задач ---------------------------------------- */

function aiDifficultyKey(task) {
    if (!task) return 'standard';
    if (task.difficulty) return aiGenLevelKey(task.difficulty);
    if (task.level === 'Базовый') return 'basic';
    if (task.level === 'Повышенный') return 'advanced';
    return 'standard'
}

function aiTaskMatchesLevel(task, level) {
    if (level === 'basic') return task.level === 'Базовый' || !task.level;
    if (level === 'advanced') return ['Применение', 'Повышенный', 'PISA'].includes(task.level) || !task.level;
    return ['Базовый', 'Применение', 'PISA'].includes(task.level) || !task.level
}

/* ---- Выбор задач в рабочий лист ---------------------------------------- */

function aiWsSelected() {
    const s = aiSettings();
    if (!Array.isArray(s.aiWsSelected)) s.aiWsSelected = [];
    return s.aiWsSelected
}

function aiWsToggle(itemId, checked) {
    const selected = aiWsSelected();
    const at = selected.indexOf(itemId);
    if (checked && at < 0) selected.push(itemId);
    if (!checked && at >= 0) selected.splice(at, 1);
    persist();
    aiWsUpdateButton()
}

function aiWsUpdateButton() {
    const button = $('ai-ws-make');
    if (button) button.textContent = ait('ai.studio.wsMake', {n: String(aiWsSelected().length)})
}

/* Полная задача записи хранилища: задача курса по ссылке плюс вид,
   сложность и контекст, записанные на самой записи. */
function aiStoredTask(item) {
    if (!item) return {};
    const base = item.refId && taskMap[item.refId] ? taskMap[item.refId] : {};
    const task = Object.assign({}, base, item.task || {});
    if (item.difficulty && !task.difficulty) task.difficulty = item.difficulty;
    if (item.genKind && !task.genKind) task.genKind = item.genKind;
    if (item.aiContext && !task.aiContext) task.aiContext = item.aiContext;
    task.source = item.source || task.source || 'course';
    return task
}

/* ---- Локальная генерация: берём задание курса с данными -------------- */

function aiTaskHasData(task) {
    return !!((task.inputTables || []).length || task.chart)
}

/* В английском интерфейсе данные задания должны быть переведены: если в них
   осталась кириллица, такая задача для генерации не годится. */
function aiTaskIsLocalized(task) {
    if (aiLang() !== 'en') return true;
    const blob = JSON.stringify({q: task.question, o: task.options || [], t: task.inputTables || [], y: (task.chart && task.chart.yLabel) || ''});
    return !/[\u0400-\u04FF]/.test(blob)
}

/* Тасуем кандидатов, чтобы подбор подходящей формулировки не повторялся. */
function aiShuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = out[i];
        out[i] = out[j];
        out[j] = swap
    }
    return out
}

/* Первая формулировка, для которой нашёлся безопасный пересчёт чисел. Задания с
   таблицами и графиком идут первыми: в них видно данные. */
function aiTaskWithNewNumbers(section, candidates, opts) {
    if (opts.swap === false || typeof aiTaskNumberVariant !== 'function' || !aiNumberSwapEnabled()) return null;
    const source = candidates.filter(aiTaskIsLocalized);
    const ordered = aiShuffle(source.length ? source : candidates);
    const groups = [ordered.filter(aiTaskHasData), ordered.filter(t => !aiTaskHasData(t))];
    for (const group of groups) {
        for (const task of group) {
            if (opts.exclude && task.id === opts.exclude) continue;
            const variant = aiTaskNumberVariant(task, {sectionId: section.id, sectionTitle: section.title});
            if (variant) return variant
        }
    }
    return null
}

/* Локальная задача PISA без ключа: контекст курса берётся ЦЕЛИКОМ — описание
   и таблица данных вместе с одним вопросом к нему. Пересчитывать числа здесь
   нельзя: данные живут в тексте контекста, и карточка без него нерешаема. */
function aiLocalPisaTask(section, opts) {
    const level = aiGenLevelKey(opts.level || opts.difficulty);
    let sections = section && (section.contexts || []).length ? [section] : SECTIONS.filter(s => (s.contexts || []).length);
    sections = sections.slice().sort((a, b) => (b.id === 'pisa-tests') - (a.id === 'pisa-tests'));
    let candidates = [];
    for (const sec of sections) {
        const byId = {};
        for (const c of (sec.contexts || [])) byId[c.id] = c;
        for (const task of (sec.tasks || [])) {
            if (!task || !task.context || !byId[task.context] || !task.solution) continue;
            if (!['number', 'single', 'table'].includes(task.type)) continue;
            if (task.answer === undefined || task.answer === null || task.answer === '') continue;
            candidates.push({sec: sec, ctx: byId[task.context], task: task})
        }
    }
    const byLevel = candidates.filter(x => aiTaskMatchesLevel(x.task, level));
    if (byLevel.length) candidates = byLevel;
    candidates = candidates.filter(x => x.task.id !== opts.exclude);
    if (!candidates.length) return null;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const base = picked.task;
    return Object.assign({}, base, {
        origin: base.id, source: 'course', genKind: 'pisa', difficulty: level,
        sectionId: picked.sec.id, sectionTitle: picked.sec.title,
        aiContext: {title: picked.ctx.title, description: picked.ctx.description, dataTable: picked.ctx.dataTable || undefined}
    })
}

function aiGenerateTask(topicId, options) {
    const opts = options || {};
    const section = SECTIONS.find(x => x.id === topicId) || SECTIONS[0] || {id: '', title: '', tasks: []};
    const kind = opts.kind === 'pisa' || (!opts.kind && aiSettings().aiGenKind === 'pisa') ? 'pisa' : 'task';
    const level = aiGenLevelKey(opts.level || opts.difficulty || aiSettings().aiGenLevel);
    if (kind === 'pisa') {
        const pisa = aiLocalPisaTask(section, {level: level, exclude: opts.exclude});
        if (pisa) return pisa
    }
    const pool = (section.tasks || []).filter(t => t && t.solution && ['number', 'graph', 'table', 'single'].includes(t.type) && !t.context);
    const pick = list => list.length ? list[Math.floor(Math.random() * list.length)] : null;
    let candidates = pool.filter(t => aiTaskMatchesLevel(t, level));
    if (!candidates.length) candidates = pool;
    candidates = candidates.filter(t => t.id !== opts.exclude);
    if (!candidates.length) candidates = pool;
    const withData = candidates.filter(aiTaskHasData).filter(aiTaskIsLocalized);
    const translated = candidates.filter(aiTaskIsLocalized);
    const base = pick(withData) || pick(translated) || pick(candidates) || (section.tasks || [])[0] || null;
    /* Без ключа генератор не копирует задание курса, а пересчитывает его. */
    const variant = aiTaskWithNewNumbers(section, candidates, opts);
    if (variant) { variant.genKind = 'task'; variant.difficulty = level; return variant }
    const answer = base ? (base.answer !== undefined ? base.answer : '') : '';
    return {
        id: base ? base.id : 'ai-empty',
        source: 'course', genKind: 'task', difficulty: level,
        type: base ? base.type : 'number',
        question: base && base.question ? base.question : ui('Составьте и решите задачу по теме «') + section.title + ui('».'),
        options: base && base.options ? base.options : undefined,
        inputTables: base && base.inputTables ? base.inputTables : undefined,
        chart: base && base.chart ? base.chart : undefined,
        hint: base ? base.hint : '',
        solution: base ? base.solution : '',
        answer: answer,
        acceptedAnswers: base && base.acceptedAnswers ? base.acceptedAnswers : undefined,
        tolerance: base && base.tolerance !== undefined ? base.tolerance : undefined,
        sectionId: section.id,
        sectionTitle: section.title
    }
}

/* ---- Задача от модели: строгий JSON превращаем в карточку ------------ */

function aiNormalizeTable(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (Array.isArray(raw)) return null;
    let head = raw.head || raw.headers || raw.columns || raw.header || [];
    let rows = raw.rows || raw.data || raw.body || [];
    if (!Array.isArray(head) || !head.length) return null;
    if (!Array.isArray(rows) || !rows.length) return null;
    rows = rows.map(row => Array.isArray(row) ? row : head.map(key => row && row[key] !== undefined ? row[key] : ''));
    rows = rows.filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
    if (!rows.length) return null;
    return {caption: String(raw.caption || raw.title || ait('ai.table.caption')), head: head.map(String), rows: rows.map(row => row.map(cell => String(cell ?? '')))}
}

/* Модель возвращает JSON (возможно, в ```-блоке или с пояснением вокруг). */
function aiParseJsonBlock(content) {
    const text = String(content || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(text) } catch (e) { /* ниже пробуем найти объект в тексте */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)) } catch (e) { return null }
    }
    return null
}

/* Контекст PISA от модели: название, описание и необязательная таблица. */
function aiNormalizeContext(raw, data) {
    let source = raw;
    if (!source && data && (data.contextTitle || data.contextDescription)) {
        source = {title: data.contextTitle, description: data.contextDescription}
    }
    if (typeof source === 'string') source = {description: source};
    if (!source || typeof source !== 'object') return null;
    const description = String(source.description || source.text || source.statement || source.story || '').trim();
    if (!description) return null;
    const table = aiNormalizeTable(source.table || source.dataTable || source.data_table || null);
    return {title: String(source.title || source.name || ait('ai.studio.context')), description: description, dataTable: table || undefined}
}

function aiNormalizeChart(raw) {
    if (!raw || typeof raw !== 'object') return undefined;
    const xs = Array.isArray(raw.xs) ? raw.xs.map(Number) : [];
    const ys = Array.isArray(raw.ys) ? raw.ys.map(Number) : [];
    if (xs.length < 2 || xs.length !== ys.length || xs.some(v => !Number.isFinite(v)) || ys.some(v => !Number.isFinite(v))) return undefined;
    return {xs: xs, ys: ys, yLabel: String(raw.yLabel || raw.y_label || ''), kind: raw.kind === 'bars' ? 'bars' : 'polygon'}
}

/* Допуск из требования округления в вопросе: «до сотых» — половина сотой. */
function aiAnswerTolerance(question, rawTolerance) {
    const given = Number(rawTolerance);
    if (Number.isFinite(given) && given > 0) return Math.min(given, 0.1);
    const q = String(question || '').toLowerCase();
    if (/тысячн|thousandth|0[.,]001|3\s*(знак|decimal)/.test(q)) return 0.0005;
    if (/сот|hundredth|0[.,]01|2\s*(знак|decimal)/.test(q)) return 0.005;
    if (/десят|tenth|0[.,]1|1\s*(знак|decimal)/.test(q)) return 0.05;
    if (/до цел|whole number|бүтін/.test(q)) return 0.5;
    if (/округл|round|дөңгелек/.test(q)) return 0.01;
    return undefined
}

/* Что не так с задачей от модели; '' — задачу можно показывать и проверять. */
function aiTaskProblem(task, kind) {
    if (!task || !String(task.question || '').trim()) return 'question';
    const answer = task.answer;
    if (answer === undefined || answer === null || (typeof answer === 'string' && !answer.trim())) return 'answer';
    if (Array.isArray(answer) && (!answer.length || answer.every(v => String(v ?? '').trim() === ''))) return 'answer';
    if (Array.isArray(task.options) && task.options.length) {
        if (task.options.length < 2) return 'options';
        if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= task.options.length) return 'options'
    }
    const wantPisa = kind === 'pisa' || (task && task.genKind === 'pisa');
    if (wantPisa && (!task.aiContext || !String(task.aiContext.description || '').trim())) return 'context';
    return ''
}

function aiTaskFromModelAnswer(content, section, opts) {
    const options = opts || {};
    let data = aiParseJsonBlock(content);
    if (!data || typeof data !== 'object') return null;
    if (data.task && typeof data.task === 'object' && !data.question) {
        data = Object.assign({}, data.task, {context: data.context || data.task.context, table: data.table || data.task.table})
    }
    const question = data.question || data.taskText || data.problem || data.statement;
    if (!question) return null;
    const kind = options.kind === 'pisa' || data.context || data.situation || data.scenario ? 'pisa' : 'task';
    const aiContext = aiNormalizeContext(data.context || data.situation || data.scenario, data);
    let table = aiNormalizeTable(data.table || data.dataTable || data.data_table || (Array.isArray(data.tables) ? data.tables[0] : null));
    let inputTables = Array.isArray(data.inputTables) ? data.inputTables.map(aiNormalizeTable).filter(Boolean) : undefined;
    if (!inputTables && table) {
        /* У PISA таблица данных принадлежит контексту, а не вопросу. */
        if (aiContext && kind === 'pisa') {
            if (!aiContext.dataTable) aiContext.dataTable = table;
        } else inputTables = [table];
        table = null
    }
    if (inputTables && !inputTables.length) inputTables = undefined;
    const chart = aiNormalizeChart(data.chart || data.graph);
    const optionList = Array.isArray(data.options) ? data.options.map(x => String(x).trim()).filter(Boolean) : undefined;
    const rawAnswer = data.answer !== undefined && data.answer !== null ? data.answer : (data.a !== undefined ? data.a : '');
    let answer = '';
    if (optionList && optionList.length) {
        /* Эталон выбора — номер варианта, как в заданиях курса. Модель может
           дать номер (answerIndex), число или сам текст варианта. */
        let index = -1;
        for (const key of ['answerIndex', 'correctIndex', 'answer_index', 'correct']) {
            const value = data[key];
            if (value !== undefined && value !== null && String(value).trim() !== '' && Number.isInteger(Number(value))
                && Number(value) >= 0 && Number(value) < optionList.length) { index = Number(value); break }
        }
        if (index < 0) index = optionList.findIndex(option => aiNormalizeAnswer(option) === aiNormalizeAnswer(rawAnswer));
        if (index < 0 && /^-?\d+$/.test(String(rawAnswer).trim())) {
            const numeric = Number(rawAnswer);
            if (numeric >= 0 && numeric < optionList.length) index = numeric
        }
        answer = index >= 0 ? index : '';
    } else if (Array.isArray(rawAnswer)) {
        answer = rawAnswer.map(value => {
            const number = typeof value === 'number' ? value : numeric(value);
            return number !== null && number !== undefined ? number : String(value)
        });
    } else if (typeof rawAnswer === 'string' && rawAnswer.includes(';')) {
        const parts = rawAnswer.split(';').map(x => x.trim()).filter(Boolean);
        answer = parts.length > 1 && parts.every(x => numeric(x) !== null) ? parts.map(x => numeric(x)) : rawAnswer;
    } else {
        answer = typeof rawAnswer === 'number' ? rawAnswer : String(rawAnswer);
    }
    const task = {
        id: 'model-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        source: 'model',
        genKind: kind,
        difficulty: aiGenLevelKey(options.level || data.difficulty || data.level),
        type: optionList && optionList.length ? 'single' : (Array.isArray(answer) ? 'table' : (chart ? 'graph' : 'number')),
        question: String(question),
        options: optionList && optionList.length ? optionList : undefined,
        inputTables: inputTables,
        chart: chart,
        aiContext: aiContext || undefined,
        hint: String(data.hint || data.note || ''),
        solution: String(data.solution || data.explanation || ''),
        answer: answer,
        tolerance: aiAnswerTolerance(question, data.tolerance),
        sectionId: (section && section.id) || '',
        sectionTitle: (section && section.title) || ''
    };
    if (aiTaskProblem(task, kind)) task._invalid = aiTaskProblem(task, kind);
    return task
}

/* Ответ модели для режима «похожая задача» превращаем в карточку,
   а если JSON не разобрался — оставляем текст, чтобы ничего не потерялось. */
function aiFormatAnswer(answer, ctx) {
    if (ctx && ctx.kind === 'similar') {
        const task = aiTaskFromModelAnswer(answer, ctx.section, {kind: ctx.genKind, level: ctx.level});
        if (task && !aiTaskProblem(task, ctx.genKind)) {
            const item = aiTaskStoreAdd(task, ctx.section);
            const key = 'drawer-' + item.id;
            aiStudioRegister(key, task);
            if (typeof aiRenderStudio === 'function') aiRenderStudio();
            toast(ait('ai.studio.added'));
            return aiTaskCardHtml(task, {key: key, source: 'model', title: ui('Сгенерированная задача') + (ctx.section ? ' · ' + ctx.section.title : '')})
        }
        /* Непроверяемую задачу карточкой не делаем: показываем текст модели
           и честное предупреждение, а в «Мои задачи» она не попадает. */
        return `<p class="small muted">${esc(ait('ai.studio.invalid'))}</p>` + aiRichHtml(aiLocalize(answer))
    }
    return aiRichHtml(aiLocalize(answer))
}

/* Эталон для показа учителю: у выбора — текст варианта, у нескольких
   ответов — список через точку с запятой. */
function aiAnswerText(task) {
    if (!task) return '';
    if (task.type === 'single' && Array.isArray(task.options) && task.options.length) {
        if (typeof task.answer === 'number' && task.options[task.answer] !== undefined) return String(task.options[task.answer]);
        return String(task.answer ?? '')
    }
    if (Array.isArray(task.answer)) return task.answer.join('; ');
    return String(task.answer ?? '')
}

/* ---- Рендер карточки задачи ------------------------------------------ */

/* Эталонный ответ показывается, когда в профиле учителя включён показ решений. */
function aiReferenceVisible() {
    if (typeof spSettings !== 'function') return true;
    return spSettings().showSolutions === true
}

function aiTaskCardHtml(task, opts) {
    const o = opts || {};
    const key = o.key || 'preview';
    const title = o.title || task.title || ait('ai.studio.title');
    const typeLabel = FORMAT[task.type] ? ui(FORMAT[task.type]) : ui('Числовой ответ');
    const source = o.source || task.source || 'course';
    const sourceLabel = source === 'model' ? ait('ai.studio.fromModel') : ait('ai.studio.fromCourse');
    const changedPill = task.numbersChanged ? `<span class="pill warm">${esc(ait('ai.num.changed'))}</span>` : '';
    const levelPill = `<span class="pill">${esc(ait('ai.studio.level'))}: ${esc(aiLevelLabel(aiDifficultyKey(task)))}</span>`;
    const pisaPill = task.genKind === 'pisa' || task.aiContext ? `<span class="pill warm">PISA</span>` : '';
    /* Контекст PISA печатается в карточке перед вопросом: без него задача
       не решается, поэтому он — часть условия, а не подпись. */
    const contextHtmlAi = task.aiContext ? `<div class="ai-context">
          <span class="pill green">${esc(ait('ai.studio.context'))} · PISA</span>
          <h4>${esc(task.aiContext.title || ait('ai.studio.context'))}</h4>
          <div>${aiRichHtml(aiLocalize(task.aiContext.description || ''))}</div>
          ${task.aiContext.dataTable ? renderDataTable(task.aiContext.dataTable) : ''}
        </div>` : '';
    if (o.register !== false) aiStudioRegister(key, task);
    const tables = (task.inputTables || []).map(renderDataTable).join('');
    const chart = task.chart && task.chart.xs && task.chart.ys
        ? plot(task.chart.xs, task.chart.ys, {line: task.chart.kind === 'polygon', bars: task.chart.kind === 'bars', yLabel: task.chart.yLabel, xLabel: ui('Значение X')})
        : '';
    const options = (task.options || []).length
        ? `<ul class="ai-options">${task.options.map((option, index) => `<li>${index + 1}) ${aiRichHtml(String(option))}</li>`).join('')}</ul>`
        : '';
    const answerHint = task.type === 'single' && (task.options || []).length
        ? `<p class="small muted" style="margin-top:6px">${esc(ait('ai.studio.optionsHint'))}</p>`
        : (Array.isArray(task.answer) ? `<p class="small muted" style="margin-top:6px">${esc(ait('ai.studio.parts'))}</p>` : '');
    const answerBlock = o.answer === false ? '' : `<div class="ai-answer-row">
        <label class="small muted" for="ai-in-${esc(key)}">${esc(ait('ai.studio.answer'))}</label>
        <div class="row wrap" style="gap:8px;margin-top:6px">
          <input id="ai-in-${esc(key)}" data-ai-answer class="field" style="flex:1;min-width:170px" placeholder="${esc(ait('ai.studio.answer'))}" onkeydown="if(event.key==='Enter')aiStudioCheck('${esc(key)}')">
          <button class="btn primary" onclick="aiStudioCheck('${esc(key)}')">${esc(ait('ai.studio.check'))}</button>
          ${aiConfigured() ? `<button class="btn ghost" onclick="aiStudioCheckWithModel('${esc(key)}')">${esc(ait('ai.studio.askAi'))}</button>` : ''}
          ${o.remove ? `<button class="btn ghost danger" onclick="aiStudioRemove('${esc(key)}')">${esc(ait('ai.studio.remove'))}</button>` : ''}
        </div>
        ${answerHint}
        <div class="feedback hidden" id="ai-fb-${esc(key)}" aria-live="polite"></div>
      </div>`;
    /* Пока решения скрыты (режим ученика), эталонный ответ в карточке не
       показываем: пересчитанную задачу иначе можно запомнить вместе с ответом. */
    const reference = !aiReferenceVisible()
        ? `<p class="small muted">${esc(ait('ai.check.referenceHidden'))}</p>`
        : (task.answer !== undefined && task.answer !== null && String(task.answer).trim() !== ''
            ? `<p class="small muted">${esc(ait('ai.check.reference'))} <strong>${esc(aiAnswerText(task))}</strong></p>`
            : '');
    const solution = task.solution
        ? `<details class="open-solution"><summary>${esc(ait('ai.studio.solutionHidden'))}</summary>${aiRichHtml(aiLocalize(task.solution))}${reference}</details>`
        : reference;
    const hint = task.hint ? `<details class="open-solution"><summary>${esc(ait('ai.studio.hint'))}</summary><p>${aiRichHtml(aiLocalize(task.hint))}</p></details>` : '';
    return `<article class="card ai-task-card" id="ai-card-${esc(key)}" data-ai-card="${esc(key)}">
        <div class="ai-task-head">
          <strong>${esc(title)}</strong>
          <span class="row wrap" style="gap:6px">${changedPill}${pisaPill}<span class="pill">${esc(typeLabel)}</span>${levelPill}<span class="pill ${source === 'model' ? 'warm' : 'green'}">${esc(sourceLabel)}</span></span>
        </div>
        <div class="ai-task-meta small muted">${esc(task.sectionTitle || ((SECTIONS.find(s => s.id === task.sectionId) || {}).title) || '')}${o.meta ? ' · ' + esc(o.meta) : ''}</div>
        ${task.numbersChanged && task.numbersPreview ? `<div class="ai-task-meta small muted">${esc(ait('ai.num.preview', {list: task.numbersPreview}))}</div>` : ''}
        ${o.note ? `<div class="ai-task-meta small muted">${esc(o.note)}</div>` : ''}
        ${contextHtmlAi}
        <div class="ai-question">${aiRichHtml(aiLocalize(task.question))}</div>
        ${tables}${chart}${options}${answerBlock}${hint}${solution}
        ${o.selectId ? `<div class="ai-ws-row"><label class="small"><input type="checkbox" data-ai-ws="${esc(o.selectId)}" ${o.selected ? 'checked' : ''} onchange="aiWsToggle('${esc(o.selectId)}', this.checked)"> ${esc(ait('ai.studio.forSheet'))}</label></div>` : ''}
      </article>`
}

/* ---- Проверка ответа -------------------------------------------------- */

function aiNormalizeAnswer(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/ё/g, 'е')
}

/* null — проверить локально нельзя (нужна внешняя модель). */
function aiLocalVerdict(task, value) {
    if (!task || !String(value || '').trim()) return null;
    const expected = task.answer;
    if (expected === undefined || expected === null || String(expected).trim() === '') return null;
    if (Array.isArray(expected)) {
        /* Несколько ответов: сначала разделитель «точка с запятой», затем запятая. */
        let parts = String(value).split(/[;\n]+/).map(x => x.trim()).filter(Boolean);
        if (parts.length !== expected.length) {
            const byComma = String(value).split(/,/).map(x => x.trim()).filter(Boolean);
            if (byComma.length === expected.length) parts = byComma;
        }
        if (parts.length !== expected.length) return false;
        return parts.every((part, index) => compareNumber(part, expected[index], task.tolerance ?? 1e-6))
    }
    if (task.type === 'single' && Array.isArray(task.options) && task.options.length) {
        const options = task.options;
        let expectedIndex = typeof expected === 'number' ? expected
            : options.findIndex(option => aiNormalizeAnswer(option) === aiNormalizeAnswer(expected));
        if (expectedIndex < 0 && /^-?\d+$/.test(String(expected).trim())) expectedIndex = Number(expected);
        if (expectedIndex < 0) return aiNormalizeAnswer(expected) === aiNormalizeAnswer(value);
        const textIndex = options.findIndex(option => aiNormalizeAnswer(option) === aiNormalizeAnswer(value));
        if (textIndex >= 0) return textIndex === expectedIndex;
        const numeric = Number(String(value).trim().replace(',', '.'));
        if (Number.isInteger(numeric)) {
            /* Варианты подписаны с 1; номер, равный сохранённому индексу, тоже
               принимаем — так задания курса хранили ответ до этой подписи. */
            return numeric - 1 === expectedIndex || numeric === expectedIndex
        }
        return false
    }
    if (typeof expected === 'number' || numeric(expected) !== null) return compareNumber(value, expected, task.tolerance ?? 1e-6);
    return aiNormalizeAnswer(expected) === aiNormalizeAnswer(value)
}

function aiStudioCheck(key) {
    const task = aiStudioTasks[key];
    const card = $('ai-card-' + key);
    if (!task || !card) return;
    const input = card.querySelector('[data-ai-answer]');
    const value = input ? input.value.trim() : '';
    const feedback = $('ai-fb-' + key);
    if (!feedback) return;
    if (!value) {
        feedback.className = 'feedback error';
        feedback.textContent = ait('ai.studio.fill');
        return
    }
    const verdict = aiLocalVerdict(task, value);
    const head = verdict === null ? ait('ai.studio.noAnswer') : (verdict ? ait('ai.studio.verdictOk') : ait('ai.studio.verdictNo'));
    feedback.className = 'feedback ' + (verdict ? 'success' : (verdict === false ? 'error' : ''));
    feedback.innerHTML = `<strong>${esc(head)}</strong><br><span class="small muted">${esc(verdict === null ? ait('ai.studio.askAiHint') : ait('ai.check.teacher'))}</span>`;
    math(feedback)
}

async function aiStudioCheckWithModel(key) {
    const task = aiStudioTasks[key];
    const card = $('ai-card-' + key);
    if (!task || !card) return;
    const input = card.querySelector('[data-ai-answer]');
    const value = input ? input.value.trim() : '';
    if (!value) { toast(ait('ai.studio.fill'), true); return }
    aiDrawerOpen({kind: 'checkTask', task: task});
    await aiSend(ait('ai.q.check', {question: String(task.question || '').slice(0, 110), answer: value}), {kind: 'check', task: task, answerValue: value})
}

/* ---- Ответ помощника по заданию без внешней модели -------------------- */

function aiTaskLocalReply(ctx, question) {
    if (!ctx) return '';
    const task = ctx.task || null;
    const section = SECTIONS.find(s => s.id === (task ? task.sectionId : (ctx.section || {}).id)) || ctx.section || null;
    /* Новая задача по теме собирается и без ключа: форматы задачи те же. */
    if (ctx.kind === 'similar') {
        const topic = section || SECTIONS[0] || {};
        const generated = aiGenerateTask(topic.id, {kind: ctx.genKind, level: ctx.level, exclude: ctx.baseTask ? ctx.baseTask.id : (task ? task.id : undefined)});
        const item = aiTaskStoreAdd(generated, topic);
        const key = 'drawer-' + item.id;
        aiStudioRegister(key, generated);
        aiRenderStudio();
        toast(ait('ai.studio.added'));
        const note = generated.genKind === 'pisa' ? ait('ai.studio.localPisa') : aiNumberSwapNote(generated);
        return `<p>${esc(ait('ai.studio.local'))}</p>${aiTaskCardHtml(generated, {key: key, source: 'course', title: ui('Сгенерированная задача') + (topic.title ? ' · ' + topic.title : ''), note: note})}`
    }
    /* Вопрос о теме: сначала теория этой темы, потом общий поиск по курсу. */
    if (ctx.kind === 'topic' && section && !task) {
        const snippet = aiTheorySnippets(section, question || '');
        if (!snippet) return '';
        return `<p>${esc(ait('ai.local.theory', {title: section.title}))}</p>${snippet}
          <p><a class="btn sm ghost" href="#${section.id}/theory">${esc(ait('ai.local.open'))}</a>
             <a class="btn sm ghost" href="#${section.id}/practice">${esc(ait('ai.local.practice'))}</a></p>`
    }
    if (!task) return '';
    if (ctx.kind === 'check') {
        const value = ctx.answerValue !== undefined ? ctx.answerValue : '';
        const verdict = aiLocalVerdict(task, value);
        const parts = [];
        if (verdict !== null) parts.push(`<p><strong>${esc(verdict ? ait('ai.check.correct') : ait('ai.check.wrong'))}</strong></p>`);
        if (task.answer !== undefined && task.answer !== null && String(task.answer).trim() !== '') {
            parts.push(`<p>${esc(ait('ai.check.reference'))} <strong>${esc(aiAnswerText(task))}</strong></p>`)
        }
        parts.push(`<p class="small muted">${esc(ait('ai.check.teacher'))} ${esc(ait('ai.local.modelOnly'))}</p>`);
        return parts.join('')
    }
    if (ctx.kind === 'explain') {
        const parts = [`<p>${esc(ait('ai.local.steps'))}</p>`];
        if (task.hint) parts.push(`<p>${esc(ait('ai.local.hint', {hint: task.hint}))}</p>`);
        if (progress.solved[task.id] && task.solution) parts.push(`<p>${aiRichHtml(aiLocalize(task.solution))}</p>`);
        if (section) parts.push(aiTheorySnippets(section, question || task.question || '') + `<p><a class="btn sm ghost" href="#${section.id}/theory">${esc(ait('ai.local.open'))}</a> <a class="btn sm ghost" href="#${section.id}/practice">${esc(ait('ai.local.practice'))}</a></p>`);
        parts.push(`<p class="small muted">${esc(ait('ai.local.modelOnly'))}</p>`);
        return parts.join('')
    }
    if (ctx.kind === 'data') {
        const parts = [];
        if ((task.inputTables || []).length) parts.push((task.inputTables || []).map(renderDataTable).join(''));
        if (task.chart) parts.push(plot(task.chart.xs, task.chart.ys, {line: task.chart.kind === 'polygon', bars: task.chart.kind === 'bars', yLabel: task.chart.yLabel, xLabel: ui('Значение X')}));
        if (section) parts.push(aiTheorySnippets(section, question || '') || '');
        if (!parts.length) return '';
        parts.push(`<p class="small muted">${esc(ait('ai.local.modelOnly'))}</p>`);
        return parts.join('')
    }
    return ''
}

/* ---- Кнопки в карточках заданий курса --------------------------------- */

function spAiTaskBar(t, cid) {
    if (!t || !t.id) return '';
    if (typeof spExamActive === 'function' && spExamActive()) return '';
    return `<div class="ai-task-bar" data-ai-bar="${esc(t.id)}">
        <span class="ai-task-bar-label">${ico('bot')} ${esc(ait('ai.bar.label'))}</span>
        <button class="btn sm" onclick="spAiExplainTask('${esc(t.id)}')">${esc(ait('ai.bar.explain'))}</button>
        <button class="btn sm" onclick="spAiCheckMyWork('${esc(t.id)}','${esc(cid)}')">${esc(ait('ai.bar.check'))}</button>
        <button class="btn sm ghost" onclick="spAiSimilarTask('${esc(t.id)}')">${esc(ait('ai.bar.similar'))}</button>
      </div>`
}

/* Кнопки панели помощника: разбор или проверка выбранного задания. */
function aiTaskMode(taskId, mode, cid) {
    if (mode === 'check') { spAiCheckMyWork(taskId, cid); return }
    spAiExplainTask(taskId)
}

/* Задание, о котором идёт речь: его данные уходят в системную инструкцию. */
function spAiTaskContext(taskId) {
    const task = taskMap[taskId];
    if (!task) return null;
    return {kind: 'task', task: task}
}

function spAiExplainTask(taskId) {
    const task = taskMap[taskId];
    if (!task) return;
    aiDrawerOpen({kind: 'task', task: task});
    aiSend(ait('ai.q.explain', {question: String(task.question || '').slice(0, 140)}), {kind: 'explain', task: task})
}

function spAiCheckMyWork(taskId, cid) {
    const task = taskMap[taskId];
    if (!task) return;
    const card = cid ? $('card-' + cid) : null;
    let answer = progress.answers[taskId];
    if ((answer === undefined || answer === '' || (Array.isArray(answer) && !answer.length)) && card && typeof getTaskAnswer === 'function') {
        answer = getTaskAnswer(card)
    }
    if (Array.isArray(answer)) answer = answer.join(', ');
    const value = String(answer ?? '').trim();
    if (!value) { toast(ait('ai.needAnswer'), true); return }
    aiDrawerOpen({kind: 'checkTask', task: task, cid: cid});
    aiSend(ait('ai.q.check', {question: String(task.question || '').slice(0, 140), answer: value.slice(0, 300)}), {kind: 'check', task: task, answerValue: value})
}

function spAiSimilarTask(taskId) {
    const task = taskMap[taskId];
    if (!task) return;
    const section = SECTIONS.find(s => s.id === task.sectionId) || SECTIONS[0];
    spAiGenerateSimilar({section: section, baseTask: task})
}

function spAiGenerateSimilar(options) {
    const opts = options || {};
    const section = opts.section || SECTIONS.find(s => s.id === route.id) || SECTIONS[0];
    if (!section) return;
    const baseTask = opts.baseTask || null;
    const kind = baseTask && (baseTask.genKind === 'pisa' || baseTask.aiContext || baseTask.context) ? 'pisa'
        : (section.id === 'pisa-tests' ? 'pisa' : aiSettings().aiGenKind);
    aiDrawerOpen(baseTask ? {kind: 'task', task: baseTask, section: section} : {kind: 'topic', section: section});
    aiSend(ait('ai.q.similar', {topic: section.title}),
        {kind: 'similar', section: section, baseTask: baseTask, task: baseTask || undefined, genKind: kind, level: aiSettings().aiGenLevel})
}

/* Кнопка в теории: «спросить помощника об этой теме». */
function spAiAskTopic(sectionId) {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    aiDrawerOpen({kind: 'topic', section: section});
    aiSend(ait('ai.q.topic', {topic: section.title}), {kind: 'topic', section: section})
}

/* ---- Генератор на странице «ИИ-наставник» ----------------------------- */

/* Вид и сложность из селектов генератора запоминаются в настройках. */
function aiGenPrefsChanged() {
    const s = aiSettings();
    const kind = $('ai-gen-kind'), level = $('ai-gen-level');
    if (kind) s.aiGenKind = kind.value === 'pisa' ? 'pisa' : 'task';
    if (level) s.aiGenLevel = aiGenLevelKey(level.value);
    persist()
}

function aiGenOptions() {
    const kindSelect = $('ai-gen-kind'), levelSelect = $('ai-gen-level');
    const s = aiSettings();
    return {
        kind: kindSelect ? (kindSelect.value === 'pisa' ? 'pisa' : 'task') : (s.aiGenKind === 'pisa' ? 'pisa' : 'task'),
        level: aiGenLevelKey(levelSelect ? levelSelect.value : s.aiGenLevel)
    }
}

async function aiGenerate() {
    const topicSelect = $('ai-gen-topic');
    const countSelect = $('ai-gen-count');
    const topicId = topicSelect ? topicSelect.value : (SECTIONS[0] || {}).id;
    const section = SECTIONS.find(x => x.id === topicId) || SECTIONS[0];
    const count = Math.min(3, Math.max(1, Number(countSelect ? countSelect.value : 1) || 1));
    const gen = aiGenOptions();
    aiGenPrefsChanged();
    const res = $('ai-gen-result');
    if (res) res.innerHTML = '<em>' + esc(count > 1 ? ait('ai.studio.makingSet') : ait('ai.studio.making')) + '</em>';
    const tasks = [];
    let failure = '';
    if (aiConfigured()) {
        /* С ключом задачи придумывает внешняя модель: совсем новые, не из курса.
           Непроверяемый ответ модели карточкой не становится. */
        const avoid = [];
        for (let i = 0; i < count; i++) {
            let task = null;
            try {
                for (let attempt = 0; attempt < 2 && !task; attempt++) {
                    const user = aiTopicLabel() + ': ' + (section ? section.title : topicId)
                        + '\n' + (aiLang() === 'en' ? 'Create task ' + (i + 1) + ' of ' + count + '.'
                            : aiLang() === 'kk' ? (i + 1) + '-тапсырманы құрастырыңыз, барлығы ' + count + '.'
                            : 'Создай задачу ' + (i + 1) + ' из ' + count + '.')
                        + (avoid.length ? '\n' + (aiLang() === 'en' ? 'Do not repeat these already created tasks: '
                            : aiLang() === 'kk' ? 'Мына құрастырылған тапсырмаларды қайталамаңыз: '
                            : 'Не повторяй уже созданные задачи: ') + avoid.join(' | ') : '');
                    const messages = [
                        {role: 'system', content: aiGenerateSystem({kind: gen.kind, level: gen.level, section: section})},
                        {role: 'user', content: user}
                    ];
                    const content = await aiExternalChat(messages, {temperature: 0.7, stream: false, maxTokens: 3000});
                    const parsed = aiTaskFromModelAnswer(content, section, {kind: gen.kind, level: gen.level});
                    if (parsed && !aiTaskProblem(parsed, gen.kind)) task = parsed
                }
            } catch (error) {
                failure = aiErrorReason(error);
                aiStatusLine(failure, 'error');
                break
            }
            if (task) { tasks.push(task); avoid.push(String(task.question).slice(0, 90)) }
            else if (!failure) failure = ait('ai.studio.invalid');
        }
    }
    if (!tasks.length) {
        /* Без ключа или при сбое модели — честный локальный режим: для обычной
           задачи пересчёт чисел курса, для PISA — контекст курса целиком. */
        const used = [];
        for (let i = 0; i < count; i++) {
            const local = aiGenerateTask(section ? section.id : topicId,
                {exclude: used[used.length - 1], kind: gen.kind, level: gen.level});
            const key = local.origin || local.id;
            if (used.includes(key) && used.length) continue;
            if (local.source !== 'model') local.source = 'course';
            used.push(key);
            tasks.push(local)
        }
        if (!tasks.length) {
            const local = aiGenerateTask(section ? section.id : topicId, {kind: gen.kind, level: gen.level});
            local.source = 'course';
            tasks.push(local)
        }
    }
    for (const task of tasks) aiTaskStoreAdd(task, section);
    if (res) {
        const title = ui('Сгенерированная задача') + (section ? ' · ' + section.title : '');
        /* Локальный генератор: показываем, сколько заданий получило новые числа. */
        const local = !tasks.some(task => task && task.source === 'model');
        const swapped = tasks.filter(task => task && task.numbersChanged).length;
        const summary = local
            ? (gen.kind === 'pisa' && !swapped
                ? `<p class="small muted" id="ai-gen-summary">${esc(ait('ai.studio.localPisa'))}</p>`
                : `<p class="small muted" id="ai-gen-summary">${esc(ait('ai.num.summary', {n: String(swapped), total: String(tasks.length)}))}</p>`)
            : '';
        res.innerHTML = tasks.map((task, index) => aiTaskCardHtml(task,
            {key: 'preview' + (index ? '-' + index : ''), title: title, source: task.source, note: task.genKind === 'pisa' && task.source !== 'model' ? ait('ai.studio.localPisa') : aiNumberSwapNote(task)})).join('')
            + summary
            + (failure ? `<p class="small muted">${esc(tasks.some(task => task.source === 'model') ? failure : ait('ai.fallback', {reason: failure}))}</p>` : '');
        math(res)
    }
    if (typeof aiRenderStudio === 'function') aiRenderStudio();
    return tasks
}

function aiStoredCardHtml(item) {
    const key = item.id;
    const date = new Date(item.ts || Date.now()).toLocaleString(LOCALE_TAG);
    const title = ui('Сгенерированная задача');
    const task = aiStoredTask(item);
    return aiTaskCardHtml(task, {
        key: key, title: title, source: task.source || 'model', remove: true, meta: date,
        selectId: item.id, selected: aiWsSelected().includes(item.id)
    })
}

function aiRenderStudio() {
    const list = $('ai-task-list');
    if (!list) return;
    const items = aiTaskStore();
    const count = $('ai-task-count');
    if (count) count.textContent = items.length ? String(items.length) : '';
    list.innerHTML = items.length
        ? items.map(aiStoredCardHtml).join('')
        : `<div class="empty">${esc(ait('ai.studio.empty'))}</div>`;
    aiWsUpdateButton();
    math(list)
}

/* ---- Рабочий лист из созданных задач ----------------------------------- */

function aiMakeWorksheet() {
    const ids = aiWsSelected().filter(id => aiTaskStore().some(item => item.id === id));
    if (!ids.length) { toast(ait('ai.studio.wsNeed'), true); return }
    const keyBox = $('ai-ws-key');
    wsState = {kind: 'ai', ids: ids, key: !!(keyBox && keyBox.checked)};
    renderWorksheet();
    toast(ait('ai.studio.wsDone', {n: String(ids.length)}))
}

/* Контекст PISA в листе: заголовок, описание и таблица данных перед вопросом. */
function aiContextPrintHtml(context) {
    if (!context) return '';
    return `<header class="context-head"><span class="pill green">PISA · ${esc(ait('ai.studio.context'))}</span><h3 style="margin-top:10px">${esc(context.title || '')}</h3><p>${esc(context.description || '')}</p>${context.dataTable ? renderDataTable(context.dataTable) : ''}</header>`
}

function aiPrintTask(task, index, key) {
    /* Задание курса табличной формы умеет печатать общий printTask. */
    if (task.headers && task.rows && typeof printTask === 'function') return printTask(task, index, key);
    let body = (task.inputTables || []).map(renderDataTable).join('');
    if (task.chart && task.chart.xs && task.chart.ys) {
        body += plot(task.chart.xs, task.chart.ys, {line: task.chart.kind === 'polygon', bars: task.chart.kind === 'bars', yLabel: task.chart.yLabel, xLabel: ui('Значение X')})
    }
    if ((task.options || []).length) {
        body += `<ul style="list-style:none;padding-left:0">${task.options.map((option, i) => `<li><span>○ ${i + 1})</span> <span>${esc(String(option))}</span></li>`).join('')}</ul>`
    }
    if (task.type !== 'single') body += '<p><span>Ответ:</span> _______________________________________</p>';
    const answer = key ? `<div class="worksheet-answer"><strong>Ответ:</strong> ${esc(aiAnswerText(task))}${task.solution ? `<p style="margin-top:8px">${esc(task.solution)}</p>` : ''}</div>` : '';
    return `<section class="worksheet-task"><span class="small muted">${esc(FORMAT[task.type] ? ui(FORMAT[task.type]) : FORMAT.number)} · ${esc(aiLevelLabel(aiDifficultyKey(task)))}</span><h3><span>${index + 1}.</span> <span>${esc(task.question || '')}</span></h3>${body}${answer}</section>`
}

function worksheetAi(w) {
    const items = (w.ids || []).map(id => aiTaskStore().find(item => item.id === id)).filter(Boolean);
    if (!items.length) return null;
    $('worksheet-title').textContent = ait('ai.studio.wsTitle');
    let lastContext = '';
    const body = items.map((item, index) => {
        const task = aiStoredTask(item);
        let contextHtml = '';
        if (task.aiContext) {
            const signature = String(task.aiContext.title || '') + '|' + String(task.aiContext.description || '');
            if (signature !== lastContext) contextHtml = aiContextPrintHtml(task.aiContext);
            lastContext = signature
        }
        return contextHtml + aiPrintTask(task, index, w.key)
    }).join('');
    return `<span class="small muted"><span>СТАТПРАКТИКУМ</span> · <span>${w.key ? 'ВЕРСИЯ УЧИТЕЛЯ С КЛЮЧОМ' : 'РАБОЧИЙ ЛИСТ'}</span></span><h1 style="margin-top:12px">${esc(ait('ai.studio.wsTitle'))}</h1><p><span>Имя:</span> ______________________________ &nbsp; <span>Дата:</span> _________________</p><p class="small">${w.key ? 'Лист содержит ответы и решения для учителя.' : 'Запишите расчёты и объясните ответ. Контекст PISA читайте перед вопросом к нему.'}</p>${body}<p class="small muted" style="border-top:1px solid var(--line);padding-top:15px">СтатПрактикум · задания, созданные ИИ-наставником. Внешние ресурсы для выполнения не требуются.</p>`
}
