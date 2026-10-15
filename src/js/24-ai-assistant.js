/* ---- ИИ-наставник: локальный помощник + опциональная внешняя модель ---- */

function aiSettings() {
    if (!progress.settings || typeof progress.settings !== 'object') progress.settings = {};
    const s = progress.settings;
    if (typeof s.aiEndpoint !== 'string') s.aiEndpoint = 'https://api.openai.com/v1/chat/completions';
    if (typeof s.aiModel !== 'string') s.aiModel = 'gpt-4o-mini';
    if (typeof s.aiApiKey !== 'string') s.aiApiKey = '';
    if (typeof s.aiEnabled !== 'boolean') s.aiEnabled = false;
    return s
}

function aiSaveSettings() {
    const ep = $('ai-endpoint'), md = $('ai-model'), key = $('ai-key'), en = $('ai-enabled');
    if (ep) aiSettings().aiEndpoint = ep.value.trim() || aiSettings().aiEndpoint;
    if (md) aiSettings().aiModel = md.value.trim() || aiSettings().aiModel;
    if (key) aiSettings().aiApiKey = key.value.trim();
    if (en) aiSettings().aiEnabled = !!en.checked;
    persist();
    toast(ui('Настройки ИИ сохранены.'))
}

/* ---- База знаний: поиск по теории курса ------------------------------- */

function aiKnowledgeBase() {
    const out = [];
    for (const s of SECTIONS) {
        out.push({title: s.title, text: [s.subtitle, (s.objectives || []).join(' '), s.theory || '', (s.formulas || []).join(' '), s.error || ''].join(' '), sectionId: s.id});
    }
    for (const p of (COURSE.bankProblems || [])) {
        for (const t of (p.tasks || [])) {
            out.push({title: 'Банк задач · ' + p.title, text: (t.question || '') + ' ' + (t.solution || ''), sectionId: 'bank'});
        }
    }
    return out
}

function aiSearchKnowledge(query) {
    const q = String(query || '').toLowerCase().replace(/ё/g, 'е');
    const terms = q.split(/\s+/).filter(w => w.length >= 3);
    const kb = aiKnowledgeBase();
    const scored = kb.map(item => {
        const text = String(item.text || '').toLowerCase().replace(/ё/g, 'е');
        let score = 0;
        for (const t of terms) if (text.includes(t)) score += 1;
        if (item.title.toLowerCase().includes(q)) score += 3;
        return {item, score}
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    return scored.map(x => x.item)
}

function aiLocalAnswer(question) {
    const q = String(question || '').trim();
    if (!q) return ui('Задайте вопрос по статистике — я постараюсь помочь.');
    const low = q.toLowerCase();
    // быстрые ответы на частые вопросы
    if (/что такое|определение|означает/.test(low) && /выборк|генеральн/.test(low)) {
        return ui('Выборка — это часть генеральной совокупности, по которой делают выводы о всей совокупности. Генеральная совокупность — все объекты, о которых хотим судить.')
    }
    if (/формул|как (посчитать|вычислить|найти)/.test(low)) {
        const hits = aiSearchKnowledge(q);
        if (hits.length) {
            const h = hits[0];
            const sec = SECTIONS.find(s => s.id === h.sectionId);
            return ui('Похоже, это связано с темой «') + esc(h.title) + ui('». ') + (sec ? ui('Откройте раздел «') + esc(sec.title) + ui('»: там есть формулы и примеры.') : '')
        }
    }
    const hits = aiSearchKnowledge(q);
    if (!hits.length) {
        return ui('Не нашёл точного совпадения в курсе. Попробуйте переформулировать или укажите тему (например, «математическое ожидание», «дисперсия», «биномиальное распределение»).')
    }
    const parts = hits.map(h => {
        const sec = SECTIONS.find(s => s.id === h.sectionId);
        const link = sec ? ` <a href="#${sec.id}/theory">${esc(sec.title)}</a>` : '';
        return `<div class="ai-hit"><strong>${esc(h.title)}</strong>${link}<p class="small muted">${esc(String(h.text || '').slice(0, 260))}…</p></div>`
    });
    return ui('Вот что нашлось в курсе:') + parts.join('')
}

/* ---- Рекомендации по ошибкам ------------------------------------------ */

function aiRecommendations() {
    const recs = [];
    const weak = SECTIONS.map(s => {
        const total = s.tasks.length || 1;
        const done = s.tasks.filter(t => progress.solved[t.id]).length;
        return {s, done, total, ratio: done / total}
    }).filter(x => x.ratio < 1).sort((a, b) => a.ratio - b.ratio).slice(0, 5);
    for (const w of weak) {
        recs.push({title: w.s.title, text: ui('Решено ') + w.done + ui(' из ') + w.total + ui('. Повторите теорию и задания.'), link: '#' + w.s.id + '/practice'})
    }
    // открытые ответы с низким процентом
    const openLow = Object.entries(progress.openReplies || {}).filter(([id, r]) => r && (r.percent || 0) < 80).map(([id]) => taskMap[id]).filter(Boolean).slice(0, 4);
    for (const t of openLow) {
        const sec = SECTIONS.find(s => s.id === t.sectionId);
        recs.push({title: ui('Открытый ответ: ') + (sec ? sec.title : t.id), text: ui('Процент выполнения ниже 80 %. Дополните ответ по критериям.'), link: '#' + t.sectionId + '/practice'})
    }
    if (!recs.length) recs.push({title: ui('Отличная работа!'), text: ui('Все задания решены. Попробуйте банк задач или контрольную работу.'), link: '#bank'});
    return recs
}

/* ---- Генерация задач (простые числовые варианты) ----------------------- */

function aiGenerateTask(topicId) {
    const s = SECTIONS.find(x => x.id === topicId) || SECTIONS[0];
    // Подбираем случайную числовую задачу именно из выбранной темы, чтобы
    // генератор работал по всем темам курса, а не выдавал одну и ту же задачу.
    const pool = (s.tasks || []).filter(t => t && t.type === 'number' && t.answer !== undefined && t.answer !== null);
    const base = pool.length ? pool[Math.floor(Math.random() * pool.length)] : ((s.tasks || [])[0] || null);
    const answer = base && base.solution
        ? base.solution
        : (base ? (ui('Ответ: ') + String(base.answer) + '.') : ui('Решение не найдено.'));
    return {
        title: ui('Сгенерированная задача · ') + s.title,
        question: base && base.question ? base.question : (ui('Составьте и решите задачу по теме «') + s.title + ui('».')),
        answer: answer,
        sectionId: s.id
    }
}

/* ---- Внешняя модель ---------------------------------------------------- */

async function aiExternalChat(messages) {
    const s = aiSettings();
    if (!s.aiEnabled || !s.aiApiKey) throw new Error('external-disabled');
    const res = await fetch(s.aiEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.aiApiKey},
        body: JSON.stringify({model: s.aiModel, messages: messages, temperature: 0.4})
    });
    if (!res.ok) throw new Error('http-' + res.status);
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('no-content');
    return content
}

/* ---- Рендер страницы --------------------------------------------------- */

function renderAI() {
    const s = aiSettings();
    const recs = aiRecommendations();
    const gen = aiGenerateTask((SECTIONS[0] || {}).id);
    $('main-content').innerHTML = `<div class="page ai-page">
      ${pageTop('ИИ-наставник')}
      <p class="eyebrow">ИНТЕЛЛЕКТУАЛЬНЫЙ ПОМОЩНИК</p>
      <h1>ИИ-наставник по статистике</h1>
      <p class="page-description">${ui('Задавайте вопросы, получайте подсказки и рекомендации. По умолчанию работает локально, без интернета. При желании подключите внешнюю модель (OpenAI-совместимый API) — ключ хранится только в этом браузере.')}</p>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${ui('Чат с наставником')}</h3>
        <div id="ai-chat-log" class="ai-chat-log"></div>
        <div class="row" style="gap:8px;margin-top:10px">
          <input id="ai-question" class="field" style="flex:1" placeholder="${ui('Например: как найти дисперсию?')}" onkeydown="if(event.key==='Enter')aiAsk()">
          <button class="btn primary" onclick="aiAsk()">${ui('Спросить')}</button>
        </div>
        <p class="small muted" style="margin-top:8px">${ui('Локальный режим ищет ответы в теории курса. Если подключена внешняя модель, вопрос уйдёт в неё.')}</p>
      </div>

      <div class="grid2" style="margin-top:18px">
        <div class="card">
          <h3 style="margin-top:0">${ui('Рекомендации')}</h3>
          <ul class="ai-rec-list">${recs.map(r => `<li><a href="${r.link}"><strong>${esc(r.title)}</strong></a><p class="small muted">${esc(r.text)}</p></li>`).join('')}</ul>
        </div>
        <div class="card">
          <h3 style="margin-top:0">${ui('Генератор задач')}</h3>
          <label class="small muted">${ui('Тема')}</label>
          <select id="ai-gen-topic" style="margin:6px 0 10px">${SECTIONS.map(sec => `<option value="${sec.id}">${esc(sec.title)}</option>`).join('')}</select>
          <button class="btn" onclick="aiGenerate()">${ui('Сгенерировать задачу')}</button>
          <div id="ai-gen-result" class="ai-gen-result" style="margin-top:12px"></div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${ui('Подключение внешней модели (необязательно)')}</h3>
        <div class="profile-grid">
          <div class="profile-row"><label><input type="checkbox" id="ai-enabled" ${s.aiEnabled?'checked':''}> ${ui('Использовать внешнюю модель')}</label></div>
          <div class="profile-row"><label class="small muted">${ui('Endpoint (OpenAI-совместимый)')}</label><input id="ai-endpoint" class="field" value="${esc(s.aiEndpoint)}" style="width:100%"></div>
          <div class="profile-row"><label class="small muted">${ui('Модель')}</label><input id="ai-model" class="field" value="${esc(s.aiModel)}" style="width:100%"></div>
          <div class="profile-row"><label class="small muted">${ui('API-ключ')}</label><input id="ai-key" class="field" type="password" value="${esc(s.aiApiKey)}" style="width:100%" placeholder="sk-..."></div>
        </div>
        <button class="btn primary" style="margin-top:10px" onclick="aiSaveSettings()">${ui('Сохранить настройки')}</button>
        <p class="small muted" style="margin-top:8px">${ui('Ключ хранится только в localStorage этого браузера. При офлайн-работе внешняя модель недоступна, используется локальный помощник.')}</p>
      </div>
      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${ui('Как подключить ИИ')}</h3>
        <ol class="ai-instructions">
          <li>${ui('Получите API-ключ у провайдера с OpenAI-совместимым API (OpenAI, Groq, Together, локальный Ollama и др.).')}</li>
          <li>${ui('Откройте этот раздел и поставьте галочку «Использовать внешнюю модель».')}</li>
          <li>${ui('Проверьте Endpoint: по умолчанию https://api.openai.com/v1/chat/completions. Для другого провайдера укажите его адрес.')}</li>
          <li>${ui('Введите название модели, например gpt-4o-mini.')}</li>
          <li>${ui('Вставьте API-ключ в поле «API-ключ».')}</li>
          <li>${ui('Нажмите «Сохранить настройки».')}</li>
          <li>${ui('После этого вопросы в чате будут отправляться во внешнюю модель. Без ключа работает локальный помощник по теории курса.')}</li>
        </ol>
        <p class="small muted" style="margin-top:8px">${ui('Ключ хранится только в localStorage этого браузера и отправляется только на выбранный Endpoint. Если модель не отвечает, проверьте ключ, адрес и разрешение CORS у провайдера.')}</p>
      </div>
      ${footer()}
    </div>`;
    // показать первую сгенерированную задачу
    const res = $('ai-gen-result');
    if (res) res.innerHTML = aiRenderGenerated(gen);
    // приветствие в чате
    const log = $('ai-chat-log');
    if (log && !log.dataset.init) {
        log.dataset.init = '1';
        aiAppendChat('assistant', ui('Здравствуйте! Я ИИ-наставник по статистике. Спросите меня о любой теме курса.'));
    }
    math($('main-content'))
}

function aiRenderGenerated(g) {
    return `<div class="card" style="margin:0"><strong>${esc(g.title)}</strong><p>${esc(g.question)}</p><details class="open-solution"><summary>${ui('Решение')}</summary><p>${esc(g.answer)}</p></details></div>`
}

function aiAppendChat(role, html) {
    const log = $('ai-chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant');
    div.innerHTML = (role === 'user' ? '<strong>' + ui('Вы') + ':</strong> ' : '<strong>' + ui('Наставник') + ':</strong> ') + html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight
}

async function aiAsk() {
    const input = $('ai-question');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    aiAppendChat('user', esc(q));
    const s = aiSettings();
    if (s.aiEnabled && s.aiApiKey) {
        aiAppendChat('assistant', '<em>' + ui('Думаю…') + '</em>');
        const placeholder = $('ai-chat-log').lastChild;
        try {
            const messages = [
                {role: 'system', content: 'Ты помощник по курсу математической статистики для школьников. Отвечай по-русски, кратко и понятно, с формулами при необходимости.'},
                {role: 'user', content: q}
            ];
            const answer = await aiExternalChat(messages);
            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
            aiAppendChat('assistant', esc(answer).replace(/\n/g, '<br>'));
        } catch (e) {
            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
            aiAppendChat('assistant', ui('Внешняя модель недоступна (') + esc(String(e.message || e)) + ui('). Использую локальный ответ: ') + aiLocalAnswer(q));
        }
    } else {
        aiAppendChat('assistant', aiLocalAnswer(q));
    }
}

function aiGenerate() {
    const sel = $('ai-gen-topic');
    const topicId = sel ? sel.value : (SECTIONS[0] || {}).id;
    const g = aiGenerateTask(topicId);
    const res = $('ai-gen-result');
    if (res) res.innerHTML = aiRenderGenerated(g)
}

/* экспорт для навигации */
window.renderAI = renderAI;
