/* ---- 13. Комиксы, исторические сюжеты и запоминалки ---------------------- */
// Комикс — картинка без текста и три подписи под ней; сюжет и запоминалки — текст.
// Всё содержимое хранится сразу на трёх языках и выбирается по языку интерфейса,
// поэтому блоки помечены no-translate: словарный переводчик их не трогает.

const SP_STORIES = {ru: SP_STORIES_RU, en: SP_STORIES_EN, kk: SP_STORIES_KK};

const SP_STORY_BOOKS = {
    ru: [
        ['Син Такахаси. «Занимательная статистика. Манга»', 'История школьницы Руи, которая шаг за шагом осваивает данные, среднее, разброс и проверку гипотез.'],
        ['Бен Орлин. «Математика с дурацкими рисунками»', 'Вероятность, статистика и лотереи — в нарочито неумелых, но очень точных картинках.'],
        ['Ларри Гоник. «Алгебра. Естественная наука в комиксах»', 'Основа для формул курса: выражения, уравнения и графики в рисованных историях.'],
        ['Зияуддин Сардар, Джерри Рейвиц, Борин ван Лун. «Математика в комиксах»', 'Зачем нужна математика и как её идеи появлялись в разных культурах.']
    ],
    en: [
        ['Shin Takahashi. “The Manga Guide to Statistics”', 'The story of the schoolgirl Rui, who masters data, the mean, spread and hypothesis testing step by step.'],
        ['Ben Orlin. “Math with Bad Drawings”', 'Probability, statistics and lotteries in deliberately clumsy but very precise pictures.'],
        ['Larry Gonick. “The Cartoon Guide to Algebra”', 'The basis for the formulas of the course: expressions, equations and graphs in drawn stories.'],
        ['Ziauddin Sardar, Jerry Ravetz, Borin Van Loon. “Introducing Mathematics: A Graphic Guide”', 'Why mathematics is needed and how its ideas arose in different cultures.']
    ],
    kk: [
        ['Син Такахаси. «Қызықты статистика. Манга»', 'Деректерді, орташаны, шашырауды және болжамдарды тексеруді қадам-қадаммен меңгеретін оқушы қыз Руидің оқиғасы.'],
        ['Бен Орлин. «Ебедейсіз суреттері бар математика»', 'Ықтималдық, статистика және лотереялар — әдейі олақ, бірақ өте дәл суреттерде.'],
        ['Ларри Гоник. «Алгебра. Комикстегі жаратылыстану ғылымы»', 'Курс формулаларының негізі: өрнектер, теңдеулер және графиктер суретті оқиғаларда.'],
        ['Зияуддин Сардар, Джерри Рейвиц, Борин ван Лун. «Комикстегі математика»', 'Математика не үшін керек және оның идеялары әртүрлі мәдениеттерде қалай пайда болған.']
    ]
};

function spStoryLang() {
    return SP_STORIES[LANG] ? LANG : 'ru'
}

function spStory(id) {
    return SP_STORIES[spStoryLang()][id] || SP_STORIES.ru[id] || null
}

function spComic(id) {
    const text = SP_COMIC_TEXT[id], image = SP_COMIC_IMAGES[id];
    if (!text || !image) return null;
    const [title, ...caps] = text[spStoryLang()] || text.ru;
    return {title, caps, image}
}

function spComicHtml(id) {
    const c = spComic(id);
    if (!c) return '';
    return `<section class="cx-comic no-translate"><div class="story-head"><span class="story-kind cx-kind-comic">${ui('Комикс')}</span><h3>${esc(c.title)}</h3></div><figure class="cx-figure"><img class="cx-image" src="${c.image}" alt="${esc(ui('Комикс'))}: ${esc(c.title)}" width="1200" height="670" loading="lazy" decoding="async"></figure><ol class="cx-caps">${c.caps.map((t, i) => `<li><span class="cx-num" aria-hidden="true">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol></section>`
}

function spHistoryHtml(id, link) {
    const h = spStory(id);
    if (!h) return '';
    return `<section class="story-history no-translate"><div class="story-year"><strong>${esc(h.year)}</strong><span>${esc(h.who)}</span></div><div><div class="story-head"><span class="story-kind cx-kind-history">${ui('Как это было')}</span><h3>${esc(h.title)}</h3></div>${h.text.map(t => `<p>${esc(t)}</p>`).join('')}<p class="story-moral"><b>${ui('Вывод для нас:')}</b> ${esc(h.moral)}</p>${link || ''}</div></section>`
}

function spMemoHtml(id, title) {
    const h = spStory(id);
    if (!h || !h.memo.length) return '';
    return `<section class="story-memo no-translate"><div class="story-head"><span class="story-kind cx-kind-memo">${ui('Запоминалки')}</span><h3>${title ? esc(title) : ui('Чтобы не забыть')}</h3></div><div class="memo-grid">${h.memo.map(([phrase, hint], i) => `<div class="memo-note memo-tilt${i % 3}"><strong>${esc(phrase)}</strong><span>${esc(hint)}</span></div>`).join('')}</div></section>`
}

// Блок под теорией урока: комикс → история → запоминалки.
function spStoryBlock(s) {
    if (!spStory(s.id)) return '';
    return `<article class="card story-card" id="story-block"><div class="between story-top"><div><span class="eyebrow">${ui('ЧТОБЫ ЗАПОМНИЛОСЬ')}</span><h2>${ui(spComic(s.id) ? 'Комикс, история и запоминалки' : 'История и запоминалки')}</h2></div><a class="btn sm" href="#stories">${ico('book')} ${ui('Все истории')}</a></div>${spComicHtml(s.id)}${spHistoryHtml(s.id)}${spMemoHtml(s.id)}</article>`
}

// Год для сортировки ленты: «1920-е», «около 1620» и «1713–1738» — по первому году.
function spStoryYear(id) {
    const m = String(SP_STORIES.ru[id].year).match(/\d{4}/);
    return m ? Number(m[0]) : 0
}

function spStoryList() {
    return SECTIONS.filter(s => SP_STORIES.ru[s.id])
}

let spStoriesTab = 'time';

function spStoriesSet(tab) {
    spStoriesTab = tab;
    spRenderStories()
}

function spRenderStories() {
    const all = spStoryList(), comics = all.filter(s => spComic(s.id)), tab = ['time', 'comics', 'memo'].includes(spStoriesTab) ? spStoriesTab : 'time';
    const topic = s => `<a class="story-topic" href="#${s.id}">${ui('Тема')} ${sectionNumber(s)} · ${esc(s.title)} ${ico('arrow')}</a>`;
    let body;
    if (tab === 'time') body = `<div class="story-timeline">${[...all].sort((a, b) => spStoryYear(a.id) - spStoryYear(b.id)).map(s => spHistoryHtml(s.id, topic(s))).join('')}</div>`;
    else if (tab === 'comics') body = `<div class="stack">${comics.map(s => `<article class="card story-card">${spComicHtml(s.id)}${topic(s)}</article>`).join('')}</div>`;
    else body = `<div class="stack">${all.map(s => `<article class="card story-card">${spMemoHtml(s.id, s.title)}${topic(s)}</article>`).join('')}</div>`;
    const tabs = [['time', 'Лента времени', all.length], ['comics', 'Комиксы', comics.length], ['memo', 'Запоминалки', all.reduce((n, s) => n + spStory(s.id).memo.length, 0)]];
    $('main-content').innerHTML = `<div class="page stories-page">${pageTop('Истории и запоминалки')}<p class="eyebrow">${ui('КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ')}</p><h1>${ui('Истории и запоминалки')}</h1><p class="page-description">${ui('К темам курса — короткие комиксы в картинках, настоящие сюжеты из истории науки и фразы, которые помогают удержать главное в памяти.')}</p>
    <nav class="tabs" role="tablist" aria-label="${ui('Истории и запоминалки')}">${tabs.map(([id, title, n]) => `<button class="tab ${tab === id ? 'active' : ''}" role="tab" aria-selected="${tab === id}" onclick="spStoriesSet('${id}')">${ui(title)}<span class="tab-count">${n}</span></button>`).join('')}</nav>
    ${body}
    <section class="card story-books no-translate"><h3>${ico('book')} ${ui('Что почитать дальше: математика в картинках')}</h3><p class="small muted">${ui('Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.')}</p><ul>${(SP_STORY_BOOKS[spStoryLang()] || SP_STORY_BOOKS.ru).map(([title, note]) => `<li><strong>${esc(title)}</strong><span>${esc(note)}</span></li>`).join('')}</ul></section>${footer()}</div>`
}

// Карточка на главной странице.
function spStoriesTeaser() {
    const first = spStoryList().find(s => spComic(s.id));
    if (!first) return '';
    return `<section class="card story-teaser"><img class="story-teaser-img" src="${spComic(first.id).image}" alt="" width="1200" height="670" loading="lazy" decoding="async"><div><span class="eyebrow">${ui('НОВОЕ В КУРСЕ')}</span><h2>${ui('Комиксы, истории и запоминалки')}</h2><p>${ui('Почему десять миллионов анкет ошиблись, чем опасен миллиардер в автобусе и какая фраза помогает не перепутать моду с медианой.')}</p></div><a href="#stories" class="btn primary">${ui('Открыть истории')} ${ico('arrow')}</a></section>`
}

Object.assign(DICTS.en, {
    'Комикс': 'Comic', 'Как это было': 'How it happened', 'Вывод для нас:': 'What it means for us:', 'Запоминалки': 'Memory hooks', 'Чтобы не забыть': 'So you do not forget',
    'ЧТОБЫ ЗАПОМНИЛОСЬ': 'TO MAKE IT STICK', 'Комикс, история и запоминалки': 'Comic, history and memory hooks', 'История и запоминалки': 'History and memory hooks', 'Все истории': 'All stories', 'Тема': 'Topic',
    'Истории и запоминалки': 'Stories and memory hooks', 'КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ': 'COMICS · HISTORY · MEMORY HOOKS',
    'К темам курса — короткие комиксы в картинках, настоящие сюжеты из истории науки и фразы, которые помогают удержать главное в памяти.': 'For the topics of the course: short picture comics, true episodes from the history of science and phrases that help you remember the key idea.',
    'Лента времени': 'Timeline', 'Комиксы': 'Comics', 'Что почитать дальше: математика в картинках': 'Further reading: mathematics in pictures',
    'Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.': 'The comics in this course were made for it. These books continue the theme — look for them in a library.',
    'НОВОЕ В КУРСЕ': 'NEW IN THE COURSE', 'Комиксы, истории и запоминалки': 'Comics, stories and memory hooks',
    'Почему десять миллионов анкет ошиблись, чем опасен миллиардер в автобусе и какая фраза помогает не перепутать моду с медианой.': 'Why ten million ballots got it wrong, what is dangerous about a billionaire on a bus, and which phrase keeps the mode and the median apart.',
    'Открыть истории': 'Open the stories'
});
Object.assign(DICTS.kk, {
    'Комикс': 'Комикс', 'Как это было': 'Бұл қалай болды', 'Вывод для нас:': 'Біз үшін қорытынды:', 'Запоминалки': 'Есте сақтау тәсілдері', 'Чтобы не забыть': 'Ұмытпау үшін',
    'ЧТОБЫ ЗАПОМНИЛОСЬ': 'ЕСТЕ ҚАЛУЫ ҮШІН', 'Комикс, история и запоминалки': 'Комикс, тарих және есте сақтау тәсілдері', 'История и запоминалки': 'Тарих және есте сақтау тәсілдері', 'Все истории': 'Барлық оқиғалар', 'Тема': 'Тақырып',
    'Истории и запоминалки': 'Оқиғалар мен есте сақтау тәсілдері', 'КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ': 'КОМИКСТЕР · ТАРИХ · ЕСТЕ САҚТАУ',
    'К темам курса — короткие комиксы в картинках, настоящие сюжеты из истории науки и фразы, которые помогают удержать главное в памяти.': 'Курс тақырыптарына — суретті қысқа комикстер, ғылым тарихынан шынайы оқиғалар және негізгі ойды есте сақтауға көмектесетін сөйлемдер.',
    'Лента времени': 'Уақыт таспасы', 'Комиксы': 'Комикстер', 'Что почитать дальше: математика в картинках': 'Әрі қарай не оқуға болады: суреттегі математика',
    'Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.': 'Курс комикстері арнайы осы курс үшін жасалған. Ал мына кітаптар тақырыпты жалғастырады — оларды кітапханадан іздеп көріңіз.',
    'НОВОЕ В КУРСЕ': 'КУРСТАҒЫ ЖАҢАЛЫҚ', 'Комиксы, истории и запоминалки': 'Комикстер, оқиғалар және есте сақтау тәсілдері',
    'Почему десять миллионов анкет ошиблись, чем опасен миллиардер в автобусе и какая фраза помогает не перепутать моду с медианой.': 'Он миллион сауалнама неге қателесті, автобустағы миллиардер несімен қауіпті және моданы медианамен шатастырмауға қандай сөйлем көмектеседі.',
    'Открыть истории': 'Оқиғаларды ашу'
});
