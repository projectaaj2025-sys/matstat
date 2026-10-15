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
        hint: task.hint, solution: task.solution, sectionId: task.sectionId, sectionTitle: task.sectionTitle
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
    if (item.source === 'course' && task.id) item.refId = task.id;
    else item.task = aiPlainTask(task);
    store.unshift(item);
    while (store.length > 12) store.pop();
    persist();
    return item
}

function aiStudioRemove(key) {
    const store = aiTaskStore();
    const index = store.findIndex(item => item.id === key);
    if (index < 0) return;
    store.splice(index, 1);
    persist();
    aiRenderStudio();
    toast(ait('ai.studio.removed'))
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

function aiGenerateTask(topicId, options) {
    const opts = options || {};
    const section = SECTIONS.find(x => x.id === topicId) || SECTIONS[0] || {id: '', title: '', tasks: []};
    const pool = (section.tasks || []).filter(t => t && t.solution && ['number', 'graph', 'table', 'single'].includes(t.type) && !t.context);
    const pick = list => list.length ? list[Math.floor(Math.random() * list.length)] : null;
    let candidates = pool.filter(t => t.id !== opts.exclude);
    if (!candidates.length) candidates = pool;
    const withData = candidates.filter(aiTaskHasData).filter(aiTaskIsLocalized);
    const translated = candidates.filter(aiTaskIsLocalized);
    const base = pick(withData) || pick(translated) || pick(candidates) || (section.tasks || [])[0] || null;
    const answer = base ? (base.answer !== undefined ? base.answer : '') : '';
    return {
        id: base ? base.id : 'ai-empty',
        source: 'course',
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
    return {caption: String(raw.caption || raw.title || aiSettings().aiModel || ''), head: head.map(String), rows: rows.map(row => row.map(cell => String(cell ?? '')))}
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

function aiTaskFromModelAnswer(content, section) {
    const data = aiParseJsonBlock(content);
    if (!data || typeof data !== 'object') return null;
    const question = data.question || data.task || data.problem || data.statement;
    if (!question) return null;
    const table = aiNormalizeTable(data.table || data.dataTable || data.data_table || (Array.isArray(data.tables) ? data.tables[0] : null));
    const inputTables = Array.isArray(data.inputTables) ? data.inputTables.map(aiNormalizeTable).filter(Boolean) : (table ? [table] : undefined);
    const options = Array.isArray(data.options) && data.options.length ? data.options.map(String) : undefined;
    const rawAnswer = data.answer !== undefined && data.answer !== null ? data.answer : (data.a !== undefined ? data.a : '');
    return {
        id: 'model-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        source: 'model',
        type: options ? 'single' : (inputTables ? 'table' : 'number'),
        question: String(question),
        options: options,
        inputTables: inputTables,
        chart: undefined,
        hint: String(data.hint || data.note || ''),
        solution: String(data.solution || data.explanation || ''),
        answer: typeof rawAnswer === 'number' ? rawAnswer : String(rawAnswer),
        sectionId: (section && section.id) || '',
        sectionTitle: (section && section.title) || ''
    }
}

/* Ответ модели для режима «похожая задача» превращаем в карточку,
   а если JSON не разобрался — оставляем текст, чтобы ничего не потерялось. */
function aiFormatAnswer(answer, ctx) {
    if (ctx && ctx.kind === 'similar') {
        const task = aiTaskFromModelAnswer(answer, ctx.section);
        if (task) {
            const item = aiTaskStoreAdd(task, ctx.section);
            const key = 'drawer-' + item.id;
            aiStudioRegister(key, task);
            if (typeof aiRenderStudio === 'function') aiRenderStudio();
            toast(ait('ai.studio.added'));
            return aiTaskCardHtml(task, {key: key, source: 'model', title: ui('Сгенерированная задача') + (ctx.section ? ' · ' + ctx.section.title : '')})
        }
    }
    return aiRichHtml(aiLocalize(answer))
}

/* ---- Рендер карточки задачи ------------------------------------------ */

function aiTaskCardHtml(task, opts) {
    const o = opts || {};
    const key = o.key || 'preview';
    const title = o.title || task.title || ait('ai.studio.title');
    const typeLabel = FORMAT[task.type] ? ui(FORMAT[task.type]) : ui('Числовой ответ');
    const source = o.source || task.source || 'course';
    const sourceLabel = source === 'model' ? ait('ai.studio.fromModel') : ait('ai.studio.fromCourse');
    if (o.register !== false) aiStudioRegister(key, task);
    const tables = (task.inputTables || []).map(renderDataTable).join('');
    const chart = task.chart && task.chart.xs && task.chart.ys
        ? plot(task.chart.xs, task.chart.ys, {line: task.chart.kind === 'polygon', bars: task.chart.kind === 'bars', yLabel: task.chart.yLabel, xLabel: ui('Значение X')})
        : '';
    const options = (task.options || []).length
        ? `<ul class="ai-options">${task.options.map(option => `<li>${aiRichHtml(String(option))}</li>`).join('')}</ul>`
        : '';
    const answerBlock = o.answer === false ? '' : `<div class="ai-answer-row">
        <label class="small muted" for="ai-in-${esc(key)}">${esc(ait('ai.studio.answer'))}</label>
        <div class="row wrap" style="gap:8px;margin-top:6px">
          <input id="ai-in-${esc(key)}" data-ai-answer class="field" style="flex:1;min-width:170px" placeholder="${esc(ait('ai.studio.answer'))}" onkeydown="if(event.key==='Enter')aiStudioCheck('${esc(key)}')">
          <button class="btn primary" onclick="aiStudioCheck('${esc(key)}')">${esc(ait('ai.studio.check'))}</button>
          ${aiConfigured() ? `<button class="btn ghost" onclick="aiStudioCheckWithModel('${esc(key)}')">${esc(ait('ai.studio.askAi'))}</button>` : ''}
          ${o.remove ? `<button class="btn ghost danger" onclick="aiStudioRemove('${esc(key)}')">${esc(ait('ai.studio.remove'))}</button>` : ''}
        </div>
        <div class="feedback hidden" id="ai-fb-${esc(key)}" aria-live="polite"></div>
      </div>`;
    const reference = task.answer !== undefined && task.answer !== null && String(task.answer).trim() !== ''
        ? `<p class="small muted">${esc(ait('ai.check.reference'))} <strong>${esc(String(task.answer))}</strong></p>`
        : '';
    const solution = task.solution
        ? `<details class="open-solution"><summary>${esc(ait('ai.studio.solutionHidden'))}</summary>${aiRichHtml(aiLocalize(task.solution))}${reference}</details>`
        : reference;
    const hint = task.hint ? `<details class="open-solution"><summary>${esc(ait('ai.studio.hint'))}</summary><p>${aiRichHtml(aiLocalize(task.hint))}</p></details>` : '';
    return `<article class="card ai-task-card" id="ai-card-${esc(key)}" data-ai-card="${esc(key)}">
        <div class="ai-task-head">
          <strong>${esc(title)}</strong>
          <span class="row wrap" style="gap:6px"><span class="pill">${esc(typeLabel)}</span><span class="pill ${source === 'model' ? 'warm' : 'green'}">${esc(sourceLabel)}</span></span>
        </div>
        <div class="ai-task-meta small muted">${esc(task.sectionTitle || ((SECTIONS.find(s => s.id === task.sectionId) || {}).title) || '')}${o.meta ? ' · ' + esc(o.meta) : ''}</div>
        <div class="ai-question">${aiRichHtml(aiLocalize(task.question))}</div>
        ${tables}${chart}${options}${answerBlock}${hint}${solution}
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
        const parts = String(value).split(/[;,\n]/).map(x => x.trim()).filter(Boolean);
        if (parts.length !== expected.length) return null;
        return parts.every((part, index) => compareNumber(part, expected[index], task.tolerance ?? 1e-6))
    }
    if (task.type === 'single' && Array.isArray(task.options)) {
        const index = Number(value);
        if (Number.isInteger(index) && index >= 0 && index < task.options.length) return index === Number(expected);
        return aiNormalizeAnswer(task.options[Number(expected)]) === aiNormalizeAnswer(value)
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
        const generated = aiGenerateTask(topic.id, {});
        const item = aiTaskStoreAdd(generated, topic);
        const key = 'drawer-' + item.id;
        aiStudioRegister(key, generated);
        aiRenderStudio();
        toast(ait('ai.studio.added'));
        return `<p>${esc(ait('ai.studio.local'))}</p>${aiTaskCardHtml(generated, {key: key, source: 'course', title: ui('Сгенерированная задача') + (topic.title ? ' · ' + topic.title : '')})}`
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
            parts.push(`<p>${esc(ait('ai.check.reference'))} <strong>${esc(String(task.answer))}</strong></p>`)
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
    aiDrawerOpen({kind: 'topic', section: section});
    aiSend(ait('ai.q.similar', {topic: section.title}), {kind: 'similar', section: section})
}

/* Кнопка в теории: «спросить помощника об этой теме». */
function spAiAskTopic(sectionId) {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    aiDrawerOpen({kind: 'topic', section: section});
    aiSend(ait('ai.q.topic', {topic: section.title}), {kind: 'topic', section: section})
}

/* ---- Генератор на странице «ИИ-наставник» ----------------------------- */

async function aiGenerate() {
    const topicSelect = $('ai-gen-topic');
    const countSelect = $('ai-gen-count');
    const topicId = topicSelect ? topicSelect.value : (SECTIONS[0] || {}).id;
    const section = SECTIONS.find(x => x.id === topicId) || SECTIONS[0];
    const count = Math.min(3, Math.max(1, Number(countSelect ? countSelect.value : 1) || 1));
    const res = $('ai-gen-result');
    if (res) res.innerHTML = '<em>' + esc(count > 1 ? ait('ai.studio.makingSet') : ait('ai.studio.making')) + '</em>';
    const tasks = [];
    let failure = '';
    if (aiConfigured()) {
        for (let i = 0; i < count; i++) {
            try {
                const messages = [
                    {role: 'system', content: aiSystemMessage({kind: 'similar', section: section})},
                    {role: 'user', content: aiTopicLabel() + ': ' + (section ? section.title : topicId)}
                ];
                const content = await aiExternalChat(messages, {temperature: 0.7, stream: false});
                const task = aiTaskFromModelAnswer(content, section);
                if (task) tasks.push(task)
            } catch (error) {
                failure = aiErrorReason(error);
                aiStatusLine(failure, 'error');
                break
            }
        }
    }
    if (!tasks.length) {
        const used = [];
        for (let i = 0; i < count; i++) {
            const local = aiGenerateTask(section ? section.id : topicId, {exclude: used[used.length - 1]});
            if (used.includes(local.id) && used.length) continue;
            local.source = 'course';
            used.push(local.id);
            tasks.push(local)
        }
        if (!tasks.length) {
            const local = aiGenerateTask(section ? section.id : topicId, {});
            local.source = 'course';
            tasks.push(local)
        }
    }
    for (const task of tasks) aiTaskStoreAdd(task, section);
    if (res) {
        const title = ui('Сгенерированная задача') + (section ? ' · ' + section.title : '');
        res.innerHTML = aiTaskCardHtml(tasks[0], {key: 'preview', title: title, source: tasks[0].source})
            + (failure ? `<p class="small muted">${esc(ait('ai.fallback', {reason: failure}))}</p>` : '');
        math(res)
    }
    if (typeof aiRenderStudio === 'function') aiRenderStudio();
    return tasks
}

function aiStoredCardHtml(item) {
    const key = item.id;
    const date = new Date(item.ts || Date.now()).toLocaleString(LOCALE_TAG);
    const title = ui('Сгенерированная задача');
    if (item.source === 'course' && item.refId && taskMap[item.refId]) {
        const task = taskMap[item.refId];
        const merged = Object.assign({}, task, {source: 'course'});
        return aiTaskCardHtml(merged, {key: key, title: title, source: 'course', remove: true, meta: date})
    }
    return aiTaskCardHtml(Object.assign({source: 'model'}, item.task || {}), {key: key, title: title, source: 'model', remove: true, meta: date})
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
    math(list)
}
