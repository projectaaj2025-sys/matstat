/* ---- 13. Комиксы, исторические сюжеты и запоминалки ---------------------- */
// Комикс — картинка без текста и три подписи под ней; сюжет и запоминалки — текст.
// Всё содержимое хранится сразу на трёх языках и выбирается по языку интерфейса,
// поэтому блоки помечены no-translate: словарный переводчик их не трогает.

const SP_STORIES = {ru: SP_STORIES_RU, en: SP_STORIES_EN, kk: SP_STORIES_KK};

// Книги, на которые опираются комиксы: [ключ, автор и название, пояснение]; адреса — в SP_BOOK_URLS.
const SP_BOOK_URLS = {
    takahashi: 'https://dmkpress.com/catalog/manga/978-5-97060-179-2/',
    orlin: 'https://alpinabook.ru/catalog/book-matematika-s-duratskimi-risunkami/',
    gonick: 'https://azbooka.ru/books/algebra-estestvennaya-nauka-v-komiksakh-imez',
    sardar: 'https://eksmo.ru/book/matematika-v-komiksakh-ITD935072/'
};

const SP_STORY_BOOKS = {
    ru: [
        ['takahashi', 'Син Такахаси. «Занимательная статистика. Манга»', 'История школьницы Руи, которая шаг за шагом осваивает данные, среднее, разброс и проверку гипотез.'],
        ['orlin', 'Бен Орлин. «Математика с дурацкими рисунками»', 'Вероятность, статистика и лотереи — в нарочито неумелых, но очень точных картинках. В этой манере нарисованы комиксы курса.'],
        ['gonick', 'Ларри Гоник. «Алгебра. Естественная наука в комиксах»', 'Основа для формул курса: выражения, уравнения и графики в рисованных историях.'],
        ['sardar', 'Зияуддин Сардар, Джерри Рейвиц, Борин ван Лун. «Математика в комиксах»', 'Зачем нужна математика и как её идеи появлялись в разных культурах.']
    ],
    en: [
        ['takahashi', 'Shin Takahashi. “The Manga Guide to Statistics”', 'The story of the schoolgirl Rui, who masters data, the mean, spread and hypothesis testing step by step.'],
        ['orlin', 'Ben Orlin. “Math with Bad Drawings”', 'Probability, statistics and lotteries in deliberately clumsy but very precise pictures. The comics of this course are drawn in this manner.'],
        ['gonick', 'Larry Gonick. “The Cartoon Guide to Algebra”', 'The basis for the formulas of the course: expressions, equations and graphs in drawn stories.'],
        ['sardar', 'Ziauddin Sardar, Jerry Ravetz, Borin Van Loon. “Introducing Mathematics: A Graphic Guide”', 'Why mathematics is needed and how its ideas arose in different cultures.']
    ],
    kk: [
        ['takahashi', 'Син Такахаси. «Қызықты статистика. Манга»', 'Деректерді, орташаны, шашырауды және болжамдарды тексеруді қадам-қадаммен меңгеретін оқушы қыз Руидің оқиғасы.'],
        ['orlin', 'Бен Орлин. «Ебедейсіз суреттері бар математика»', 'Ықтималдық, статистика және лотереялар — әдейі олақ, бірақ өте дәл суреттерде. Курс комикстері осы мәнерде салынған.'],
        ['gonick', 'Ларри Гоник. «Алгебра. Комикстегі жаратылыстану ғылымы»', 'Курс формулаларының негізі: өрнектер, теңдеулер және графиктер суретті оқиғаларда.'],
        ['sardar', 'Зияуддин Сардар, Джерри Рейвиц, Борин ван Лун. «Комикстегі математика»', 'Математика не үшін керек және оның идеялары әртүрлі мәдениеттерде қалай пайда болған.']
    ]
};

// Где тема комикса разбирается в книгах: [ключ книги, место]. Место: «P» — пролог,
// римское число — часть, остальное — номера глав (нумерация русских изданий).
const SP_COMIC_REFS = {
    'probability-foundations': [['orlin', '9, 15']],
    'intro-stats': [['takahashi', 'P'], ['takahashi', '1']],
    'variation-series': [['takahashi', '2']],
    'frequency': [['takahashi', '3']],
    'central-tendency': [['orlin', '16'], ['takahashi', '2']],
    'mathematical-statistics-introduction': [['orlin', '18'], ['takahashi', '7']],
    'random-variables': [['takahashi', '1, 5']],
    'distribution-law': [['orlin', '15']],
    'math-expectation': [['orlin', '11']],
    'variance-std': [['takahashi', '2'], ['orlin', '16']],
    'binomial-distribution': [['orlin', '12, 17']],
    'geometric-distribution': [['orlin', '12']],
    'hypergeometric-distribution': [['orlin', 'III']],
    'other-distributions': [['orlin', 'III'], ['takahashi', '5']],
    'law-of-large-numbers': [['orlin', '12, 14']],
    'continuous-rv': [['takahashi', '5']],
    'cognitive-biases': [['orlin', '16'], ['takahashi', '6']],
    'research-tasks': [['takahashi', 'P'], ['orlin', '18']],
    'combined-problems': [['orlin', 'III']],
    'pisa-tests': [['orlin', '16, 19']],
    'advanced-variation-series': [['takahashi', '2']]
};

const SP_REF_WORDS = {
    ru: {lead: 'Рисунок — в манере книги Бена Орлина. Тема в книгах:', P: 'пролог', part: 'часть', ch: 'гл.'},
    en: {lead: 'Drawn in the manner of Ben Orlin’s book. The topic in the books:', P: 'prologue', part: 'part', ch: 'ch.'},
    kk: {lead: 'Сурет Бен Орлин кітабының мәнерінде салынған. Тақырып кітаптарда:', P: 'пролог', part: 'бөлім', ch: 'тар.'}
};

function spBooks() {
    return SP_STORY_BOOKS[spStoryLang()] || SP_STORY_BOOKS.ru
}

// Короткое название книги без пояснения: «Бен Орлин. «…»».
function spRefsHtml(id) {
    const refs = SP_COMIC_REFS[id];
    if (!refs) return '';
    const w = SP_REF_WORDS[spStoryLang()], books = Object.fromEntries(spBooks().map(b => [b[0], b[1]])), byBook = new Map();
    for (const [key, loc] of refs) {
        const place = loc === 'P' ? w.P : /^[IVX]+$/.test(loc) ? `${w.part} ${loc}` : `${w.ch} ${loc}`;
        byBook.set(key, [...(byBook.get(key) || []), place])
    }
    return `<p class="cx-refs"><span>${esc(w.lead)}</span> ${[...byBook].map(([key, places]) => `<a href="${SP_BOOK_URLS[key]}" target="_blank" rel="noopener noreferrer">${esc(books[key])}</a>, ${esc(places.join(', '))}`).join('; ')}.</p>`
}

// Карточки книг для блока «Дополнительное чтение и эксперименты» в библиотеке.
function spBookSources() {
    return spBooks().map(([key, title, description]) => ({title, description, url: SP_BOOK_URLS[key], book: true}))
}

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
    return `<section class="cx-comic no-translate"><div class="story-head"><span class="story-kind cx-kind-comic">${ui('Комикс')}</span><h3>${esc(c.title)}</h3></div><figure class="cx-figure"><img class="cx-image" src="${c.image}" alt="${esc(ui('Комикс'))}: ${esc(c.title)}" loading="lazy" decoding="async"></figure><ol class="cx-caps">${c.caps.map((t, i) => `<li><span class="cx-num" aria-hidden="true">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>${spRefsHtml(id)}</section>`
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
    <section class="card story-books no-translate"><h3>${ico('book')} ${ui('Что почитать дальше: математика в картинках')}</h3><p class="small muted">${ui('Сюжеты комиксов придуманы для курса, а нарисованы они в манере «Математики с дурацкими рисунками». Под каждым комиксом указано, где тема разбирается в этих книгах.')}</p><ul>${spBooks().map(([key, title, note]) => `<li><a href="${SP_BOOK_URLS[key]}" target="_blank" rel="noopener noreferrer"><strong>${esc(title)}</strong></a><span>${esc(note)}</span></li>`).join('')}</ul></section>${footer()}</div>`
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
    'Сюжеты комиксов придуманы для курса, а нарисованы они в манере «Математики с дурацкими рисунками». Под каждым комиксом указано, где тема разбирается в этих книгах.': 'The plots of the comics were invented for this course, and they are drawn in the manner of “Math with Bad Drawings”. Under each comic you can see where its topic is covered in these books.', 'Книга · страница издательства': 'Book · publisher’s page',
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
    'Сюжеты комиксов придуманы для курса, а нарисованы они в манере «Математики с дурацкими рисунками». Под каждым комиксом указано, где тема разбирается в этих книгах.': 'Комикстердің желісі осы курс үшін ойлап табылған, ал суреттері «Ебедейсіз суреттері бар математика» мәнерінде салынған. Әр комикстің астында тақырыптың осы кітаптардың қай жерінде қарастырылатыны көрсетілген.', 'Книга · страница издательства': 'Кітап · баспа беті',
    'НОВОЕ В КУРСЕ': 'КУРСТАҒЫ ЖАҢАЛЫҚ', 'Комиксы, истории и запоминалки': 'Комикстер, оқиғалар және есте сақтау тәсілдері',
    'Почему десять миллионов анкет ошиблись, чем опасен миллиардер в автобусе и какая фраза помогает не перепутать моду с медианой.': 'Он миллион сауалнама неге қателесті, автобустағы миллиардер несімен қауіпті және моданы медианамен шатастырмауға қандай сөйлем көмектеседі.',
    'Открыть истории': 'Оқиғаларды ашу'
});
