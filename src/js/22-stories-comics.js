/* ---- 13. Комиксы, исторические сюжеты и запоминалки ---------------------- */
// Рисунки собираются из SVG-деталей прямо на странице: без внешних картинок,
// поэтому блок работает офлайн, печатается и остаётся лёгким.

const SP_CX_INK = '#19313d', SP_CX_SKIN = '#f6cfa6';
const SP_CX_CAST = {aisha: 'Айша', timur: 'Тимур', cat: 'кот Сигма'};

function spCxFace(mood, cat) {
    const y = cat ? 39 : 37, dx = cat ? 9 : 8, ink = SP_CX_INK;
    const eye = (x, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ink}"/>`;
    const arc = x => `<path d="M${x - 4} ${y + 1} Q${x} ${y - 5} ${x + 4} ${y + 1}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`;
    const brow = (x, a, b) => `<path d="M${x - 5} ${y - 9 + a} L${x + 5} ${y - 9 + b}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
    const l = 45 - dx, r = 45 + dx, my = cat ? 0 : y + 10;
    let eyes, mouth;
    switch (mood) {
        case 'lol': eyes = arc(l) + arc(r); mouth = `<path d="M37 ${my - 1} Q45 ${my + 11} 53 ${my - 1} Z" fill="#8a2f3b" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`; break;
        case 'wow': eyes = eye(l, 3.4) + eye(r, 3.4) + brow(l, -4, -5) + brow(r, -5, -4); mouth = `<ellipse cx="45" cy="${my + 2}" rx="3.4" ry="4.6" fill="#8a2f3b" stroke="${ink}" stroke-width="1.4"/>`; break;
        case 'hm': eyes = eye(l, 2.6) + eye(r, 2.6) + brow(l, -2, 1) + brow(r, -3, -3); mouth = `<path d="M38 ${my + 3} L52 ${my}" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`; break;
        case 'sad': eyes = eye(l, 2.6) + eye(r, 2.6) + brow(l, 1, -2) + brow(r, -2, 1); mouth = `<path d="M38 ${my + 4} Q45 ${my - 3} 52 ${my + 4}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`; break;
        default: eyes = eye(l, 2.6) + eye(r, 2.6); mouth = `<path d="M37 ${my} Q45 ${my + 8} 53 ${my}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return {eyes, mouth}
}

function spCxActor(who, mood) {
    const ink = SP_CX_INK, skin = SP_CX_SKIN, f = spCxFace(mood, who === 'cat');
    const open = `<svg class="cx-actor" viewBox="0 0 90 112" role="img" aria-label="${SP_CX_CAST[who] || ''}">`;
    if (who === 'cat') {
        const glasses = `<circle cx="36" cy="39" r="8" fill="#fff" fill-opacity=".75" stroke="${ink}" stroke-width="1.8"/><circle cx="54" cy="39" r="8" fill="#fff" fill-opacity=".75" stroke="${ink}" stroke-width="1.8"/><path d="M44 39h2" stroke="${ink}" stroke-width="1.8"/>`;
        const muzzle = mood === 'lol' || mood === 'wow'
            ? `<ellipse cx="45" cy="54" rx="3.6" ry="${mood === 'wow' ? 4 : 3}" fill="#8a2f3b" stroke="${ink}" stroke-width="1.3"/>`
            : `<path d="M45 51 Q41 56 37 53 M45 51 Q49 56 53 53" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
        return `${open}<path d="M64 100 Q86 98 80 72" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><path d="M64 100 Q86 98 80 72" fill="none" stroke="#9aa7b4" stroke-width="6.5" stroke-linecap="round"/>
<ellipse cx="45" cy="88" rx="24" ry="22" fill="#9aa7b4" stroke="${ink}" stroke-width="2"/><ellipse cx="45" cy="95" rx="13" ry="14" fill="#edf1f4"/>
<path d="M23 32 L26 8 L43 20 Z M67 32 L64 8 L47 20 Z" fill="#9aa7b4" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M28 24 L29 14 L36 20 Z M62 24 L61 14 L54 20 Z" fill="#f3a6b4"/>
<ellipse cx="45" cy="41" rx="25" ry="21" fill="#9aa7b4" stroke="${ink}" stroke-width="2"/>${glasses}${f.eyes}
<path d="M42.5 47.5h5L45 51z" fill="#e2788d" stroke="${ink}" stroke-width="1"/>${muzzle}
<path d="M20 47l-12-3M20 51l-12 2M70 47l12-3M70 51l12 2" stroke="${ink}" stroke-width="1.2" stroke-linecap="round"/>
<circle cx="45" cy="69" r="6.5" fill="#f2c14e" stroke="${ink}" stroke-width="1.6"/><text x="45" y="72.6" text-anchor="middle" font-size="9.5" font-weight="700" fill="${ink}" font-family="Georgia,serif">σ</text></svg>`
    }
    const girl = who === 'aisha', hair = girl ? '#2b2a3a' : '#6b4226', top = girl ? '#17a08c' : '#ee9a5d';
    const back = girl
        ? `<path d="M23 38 Q13 62 19 84" fill="none" stroke="${hair}" stroke-width="8.5" stroke-linecap="round"/><path d="M67 38 Q77 62 71 84" fill="none" stroke="${hair}" stroke-width="8.5" stroke-linecap="round"/><circle cx="19" cy="86" r="5" fill="#ef6a8d" stroke="${ink}" stroke-width="1.4"/><circle cx="71" cy="86" r="5" fill="#ef6a8d" stroke="${ink}" stroke-width="1.4"/><circle cx="45" cy="34" r="24.5" fill="${hair}"/>`
        : `<circle cx="23.5" cy="39" r="4.2" fill="${skin}" stroke="${ink}" stroke-width="1.6"/><circle cx="66.5" cy="39" r="4.2" fill="${skin}" stroke="${ink}" stroke-width="1.6"/>`;
    const front = girl
        ? `<path d="M24.5 36 Q26 14 45 14 Q64 14 65.5 36 Q57 23 45 25 Q33 23 24.5 36Z" fill="${hair}"/>`
        : `<path d="M24.5 33 Q22 13 37 15 L41 7 L47 14 L54 8 L57 16 Q69 17 65.5 33 Q58 23 45 24.5 Q32 23 24.5 33Z" fill="${hair}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
    const detail = girl
        ? `<path d="M37 70 Q45 78 53 70" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`
        : `<path d="M41 70v11M49 70v11" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M33 96h24v16H33z" fill="#d9813f" stroke="${ink}" stroke-width="1.4"/>`;
    return `${open}${back}<path d="M22 112 Q21 72 45 68 Q69 72 68 112 Z" fill="${top}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>${detail}
<path d="M40 56h10v13q-5 4-10 0z" fill="${skin}" stroke="${ink}" stroke-width="1.6"/><circle cx="45" cy="37" r="21" fill="${skin}" stroke="${ink}" stroke-width="2"/>${front}
<circle cx="32" cy="45" r="3.4" fill="#f4a08c" fill-opacity=".55"/><circle cx="58" cy="45" r="3.4" fill="#f4a08c" fill-opacity=".55"/>${f.eyes}${f.mouth}</svg>`
}

// Небольшие предметы в центре кадра. Все нарисованы в поле 70×70.
const SP_CX_PROPS = {
    dice: i => `<rect x="12" y="20" width="38" height="38" rx="8" fill="#fff" stroke="${i}" stroke-width="2.4"/><circle cx="22" cy="30" r="3.2" fill="${i}"/><circle cx="40" cy="30" r="3.2" fill="${i}"/><circle cx="31" cy="39" r="3.2" fill="${i}"/><circle cx="22" cy="48" r="3.2" fill="${i}"/><circle cx="40" cy="48" r="3.2" fill="${i}"/><rect x="40" y="8" width="22" height="22" rx="5" fill="#ffe9a8" stroke="${i}" stroke-width="2.2" transform="rotate(14 51 19)"/><circle cx="51" cy="19" r="2.8" fill="${i}"/>`,
    coin: i => `<ellipse cx="35" cy="40" rx="22" ry="22" fill="#f2c14e" stroke="${i}" stroke-width="2.4"/><ellipse cx="35" cy="40" rx="15.5" ry="15.5" fill="none" stroke="${i}" stroke-width="1.4" stroke-dasharray="3 3"/><text x="35" y="47" text-anchor="middle" font-size="19" font-weight="800" fill="${i}">₸</text><path d="M10 14q5-8 12-6M60 12q-3-6-9-6" fill="none" stroke="${i}" stroke-width="1.8" stroke-linecap="round"/>`,
    chart: i => `<path d="M8 8v54h56" fill="none" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/><rect x="15" y="40" width="10" height="22" fill="#8dc9af" stroke="${i}" stroke-width="1.8"/><rect x="29" y="22" width="10" height="40" fill="#17a08c" stroke="${i}" stroke-width="1.8"/><rect x="43" y="31" width="10" height="31" fill="#8dc9af" stroke="${i}" stroke-width="1.8"/>`,
    trick: i => `<path d="M8 8v54h56" fill="none" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/><rect x="17" y="46" width="14" height="16" fill="#8dc9af" stroke="${i}" stroke-width="1.8"/><rect x="39" y="14" width="14" height="48" fill="#ee9a5d" stroke="${i}" stroke-width="1.8"/><path d="M3 54l5-3 -5-3 5-3" fill="none" stroke="#b74c46" stroke-width="1.8"/><text x="24" y="42" text-anchor="middle" font-size="9" font-weight="700" fill="${i}">96</text><text x="46" y="11" text-anchor="middle" font-size="9" font-weight="700" fill="${i}">98</text>`,
    line: i => `<path d="M8 8v54h56" fill="none" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/><path d="M8 35h56" stroke="#b74c46" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M11 14l5 34 5-22 6 14 6-9 6 6 7-4 7 2 8-1" fill="none" stroke="#17a08c" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`,
    pot: i => `<path d="M12 30h46v18q0 14-14 14H26q-14 0-14-14z" fill="#c9d6dc" stroke="${i}" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 36H5M58 36h7" stroke="${i}" stroke-width="3" stroke-linecap="round"/><ellipse cx="35" cy="30" rx="23" ry="5.5" fill="#f2c14e" stroke="${i}" stroke-width="2"/><path d="M26 20q-4-5 0-9M36 18q-4-5 0-9M46 20q-4-5 0-9" fill="none" stroke="${i}" stroke-width="1.8" stroke-linecap="round"/>`,
    rows: i => [[10, 44, '2'], [22, 44, '2'], [34, 38, '3'], [46, 30, '4'], [58, 22, '5']].map(([x, y, t]) => `<rect x="${x - 5}" y="${y}" width="10" height="${62 - y}" rx="3" fill="#8dc9af" stroke="${i}" stroke-width="1.6"/><text x="${x}" y="${y - 3}" text-anchor="middle" font-size="10" font-weight="700" fill="${i}">${t}</text>`).join('') + `<path d="M3 62h64" stroke="${i}" stroke-width="2.2" stroke-linecap="round"/>`,
    robot: i => `<rect x="17" y="24" width="36" height="28" rx="7" fill="#c9d6dc" stroke="${i}" stroke-width="2.4"/><circle cx="28" cy="37" r="4.5" fill="#17a08c" stroke="${i}" stroke-width="1.6"/><circle cx="42" cy="37" r="4.5" fill="#17a08c" stroke="${i}" stroke-width="1.6"/><path d="M29 46h12M35 24V13" stroke="${i}" stroke-width="2.2" stroke-linecap="round"/><circle cx="35" cy="11" r="3.6" fill="#ef6a8d" stroke="${i}" stroke-width="1.6"/><path d="M17 38h-7M53 38h7M26 52v10M44 52v10" stroke="${i}" stroke-width="2.6" stroke-linecap="round"/>`,
    bus: i => `<rect x="5" y="18" width="60" height="34" rx="7" fill="#f2c14e" stroke="${i}" stroke-width="2.4"/><path d="M11 25h13v12H11zM28 25h13v12H28zM45 25h14v12H45z" fill="#dff1f6" stroke="${i}" stroke-width="1.6"/><path d="M5 43h60" stroke="${i}" stroke-width="1.6"/><circle cx="19" cy="54" r="6" fill="#4a5a63" stroke="${i}" stroke-width="2"/><circle cx="51" cy="54" r="6" fill="#4a5a63" stroke="${i}" stroke-width="2"/>`,
    ticket: i => `<path d="M6 22h58v10a5 5 0 000 10v10H6V42a5 5 0 000-10z" fill="#ffe9a8" stroke="${i}" stroke-width="2.2" stroke-linejoin="round"/><path d="M22 24v26" stroke="${i}" stroke-width="1.4" stroke-dasharray="3 3"/><text x="43" y="42" text-anchor="middle" font-size="10.5" font-weight="800" fill="${i}">10 000</text><path d="${spCxStar(13, 14, 8)}" fill="#f2c14e" stroke="${i}" stroke-width="1.2"/>`,
    scale: i => `<path d="M35 14v44M20 58h30" stroke="${i}" stroke-width="2.6" stroke-linecap="round"/><path d="M10 22l50-6" stroke="${i}" stroke-width="2.6" stroke-linecap="round"/><path d="M10 22l-7 16h14zM60 16l-7 20h14z" fill="#8dc9af" stroke="${i}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="35" cy="14" r="3.6" fill="#f2c14e" stroke="${i}" stroke-width="1.6"/>`,
    target: i => `<circle cx="35" cy="36" r="27" fill="#fff" stroke="${i}" stroke-width="2.4"/><circle cx="35" cy="36" r="18" fill="#f8c9c4" stroke="${i}" stroke-width="1.6"/><circle cx="35" cy="36" r="9" fill="#e06a61" stroke="${i}" stroke-width="1.6"/>${[[33, 34], [38, 37], [35, 40], [31, 38], [37, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${i}"/>`).join('')}`,
    scatter: i => `<circle cx="35" cy="36" r="27" fill="#fff" stroke="${i}" stroke-width="2.4"/><circle cx="35" cy="36" r="18" fill="#f8c9c4" stroke="${i}" stroke-width="1.6"/><circle cx="35" cy="36" r="9" fill="#e06a61" stroke="${i}" stroke-width="1.6"/>${[[14, 22], [55, 50], [36, 35], [20, 54], [52, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${i}"/>`).join('')}`,
    ball: i => `<path d="M40 8h24v22H40z" fill="#fff" stroke="${i}" stroke-width="2"/><path d="M45 30q0 12 7 16 7-4 7-16" fill="none" stroke="${i}" stroke-width="1.6" stroke-dasharray="3 2"/><path d="M45 30h14" stroke="#e06a61" stroke-width="3"/><circle cx="20" cy="46" r="14" fill="#ee9a5d" stroke="${i}" stroke-width="2.4"/><path d="M6 46h28M20 32v28M9 37q11 9 22 0M9 55q11-9 22 0" fill="none" stroke="${i}" stroke-width="1.4"/>`,
    box: i => `<path d="M8 28h54v32H8z" fill="#f3a6b4" stroke="${i}" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 28l8-12h38l8 12" fill="#f8c9c4" stroke="${i}" stroke-width="2.2" stroke-linejoin="round"/>${[[20, 40, '#6b4226'], [34, 40, '#f2c14e'], [48, 40, '#6b4226'], [27, 51, '#f2c14e'], [41, 51, '#f2c14e']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="${i}" stroke-width="1.4"/>`).join('')}`,
    phone: i => `<rect x="20" y="6" width="30" height="56" rx="6" fill="#fff" stroke="${i}" stroke-width="2.4"/><rect x="25" y="14" width="15" height="8" rx="4" fill="#8dc9af"/><rect x="30" y="26" width="15" height="8" rx="4" fill="#c9d6dc"/><rect x="25" y="38" width="12" height="8" rx="4" fill="#8dc9af"/><path d="M31 56h8" stroke="${i}" stroke-width="2" stroke-linecap="round"/>`,
    bell: i => `<path d="M5 60h60" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/><path d="M6 59 C22 59 24 14 35 14 C46 14 48 59 64 59Z" fill="#dff1ea" stroke="${i}" stroke-width="2.2" stroke-linejoin="round"/><path d="M27 59V31.5C30 20 33 14 35 14c3 0 7 8 9.5 21V59z" fill="#17a08c" fill-opacity=".75"/>`,
    stop: i => `<path d="M5 60h60" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/><rect x="12" y="28" width="46" height="18" fill="#dff1ea" stroke="${i}" stroke-width="2"/><rect x="21" y="28" width="14" height="18" fill="#17a08c" fill-opacity=".8"/><path d="M12 46v14M58 46v14" stroke="${i}" stroke-width="1.6"/><text x="12" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${i}">0</text><text x="58" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${i}">10</text>`,
    stars: i => `<rect x="5" y="14" width="60" height="42" rx="8" fill="#fff" stroke="${i}" stroke-width="2.4"/>${[15, 28, 41, 54].map(x => `<path d="${spCxStar(x, 28, 6)}" fill="#f2c14e" stroke="${i}" stroke-width="1"/>`).join('')}<path d="M13 43h36M13 49h24" stroke="#9aa7b4" stroke-width="2.4" stroke-linecap="round"/>`,
    clip: i => `<rect x="12" y="10" width="46" height="54" rx="5" fill="#fff" stroke="${i}" stroke-width="2.4"/><rect x="25" y="5" width="20" height="10" rx="3" fill="#9aa7b4" stroke="${i}" stroke-width="1.8"/><path d="M19 27l3 3 5-6M19 40l3 3 5-6M19 53l3 3 5-6" fill="none" stroke="#17a08c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 28h19M32 41h19M32 54h13" stroke="#9aa7b4" stroke-width="2.4" stroke-linecap="round"/>`,
    doors: i => [[4, '1'], [26, '2'], [48, '3']].map(([x, t]) => `<rect x="${x}" y="14" width="18" height="46" rx="3" fill="${t === '3' ? '#edf1f4' : '#ee9a5d'}" stroke="${i}" stroke-width="2"/><text x="${x + 9}" y="33" text-anchor="middle" font-size="12" font-weight="800" fill="${i}">${t}</text><circle cx="${x + 14}" cy="40" r="1.6" fill="${i}"/>`).join(''),
    hist: i => `<path d="M5 62h62" stroke="${i}" stroke-width="2.4" stroke-linecap="round"/>${[[8, 12], [18, 26], [28, 44], [38, 36], [48, 20], [58, 9]].map(([x, h]) => `<rect x="${x}" y="${62 - h}" width="10" height="${h}" fill="#8dc9af" stroke="${i}" stroke-width="1.6"/>`).join('')}`,
    ask: i => `<circle cx="35" cy="36" r="27" fill="#ffe9a8" stroke="${i}" stroke-width="2.4"/><text x="35" y="51" text-anchor="middle" font-size="42" font-weight="800" fill="${i}">?</text>`
};

function spCxStar(cx, cy, r) {
    let d = '';
    for (let k = 0; k < 10; k++) {
        const a = Math.PI * (k / 5 - .5), q = k % 2 ? r * .45 : r;
        d += (k ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(1) + ' ' + (cy + q * Math.sin(a)).toFixed(1)
    }
    return d + 'Z'
}

function spCxProp(name) {
    const draw = SP_CX_PROPS[name];
    return draw ? `<svg class="cx-prop" viewBox="0 0 70 70" aria-hidden="true">${draw(SP_CX_INK)}</svg>` : '<span class="cx-prop"></span>'
}

function spCxPanel(p, n) {
    const side = spec => { if (!spec) return '<span class="cx-actor"></span>'; const [who, mood] = spec.split(':'); return spCxActor(who, mood || 'ok') };
    const whoAt = at => { const spec = p[at]; return spec ? spec.split(':')[0] : '' };
    const bubbles = (p.say || []).map(([at, text]) => `<p class="cx-b cx-${at} cx-by-${whoAt(at)}"><b class="cx-who">${esc(ui(SP_CX_CAST[whoAt(at)] || ''))}</b><span>${esc(text)}</span></p>`).join('');
    return `<figure class="cx-panel cx-bg${(n % 4) + 1}"><span class="cx-n" aria-hidden="true">${n + 1}</span>${p.cap ? `<figcaption class="cx-cap">${esc(p.cap)}</figcaption>` : ''}<div class="cx-bubbles">${bubbles}</div><div class="cx-stage">${side(p.l)}${spCxProp(p.prop)}${side(p.r)}</div></figure>`
}

function spComicHtml(story) {
    const c = story && story.comic;
    if (!c) return '';
    return `<section class="cx-comic" aria-label="${esc(ui('Комикс'))}"><div class="story-head"><span class="story-kind cx-kind-comic">${ui('Комикс')}</span><h3>${esc(c.title)}</h3></div><div class="cx-strip">${c.panels.map(spCxPanel).join('')}</div></section>`
}

function spHistoryHtml(story, link) {
    const h = story && story.history;
    if (!h) return '';
    return `<section class="story-history"><div class="story-year"><strong>${esc(h.year)}</strong><span>${esc(h.who)}</span></div><div><div class="story-head"><span class="story-kind cx-kind-history">${ui('Как это было')}</span><h3>${esc(h.title)}</h3></div>${h.text.map(t => `<p>${esc(t)}</p>`).join('')}<p class="story-moral"><b>${ui('Вывод для нас:')}</b> ${esc(h.moral)}</p>${link || ''}</div></section>`
}

function spMemoHtml(story, title) {
    const m = story && story.memo;
    if (!m || !m.length) return '';
    return `<section class="story-memo"><div class="story-head"><span class="story-kind cx-kind-memo">${ui('Запоминалки')}</span><h3>${title ? esc(title) : ui('Чтобы не забыть')}</h3></div><div class="memo-grid">${m.map(([phrase, hint], i) => `<div class="memo-note memo-tilt${i % 3}"><strong>${esc(phrase)}</strong><span>${esc(hint)}</span></div>`).join('')}</div></section>`
}

// Блок под теорией урока: комикс → история → запоминалки.
function spStoryBlock(s) {
    const story = SP_STORIES[s.id];
    if (!story) return '';
    return `<article class="card story-card" id="story-block"><div class="between story-top"><div><span class="eyebrow">${ui('ЧТОБЫ ЗАПОМНИЛОСЬ')}</span><h2>${ui('Комикс, история и запоминалки')}</h2></div><a class="btn sm" href="#stories">${ico('book')} ${ui('Все истории')}</a></div>${spComicHtml(story)}${spHistoryHtml(story)}${spMemoHtml(story)}</article>`
}

// Число из подписи года: «1920-е», «около 1620» и «1713–1738» сортируются по первому году.
function spStoryYear(story) {
    const m = String(story.history.year).match(/\d{4}/);
    return m ? Number(m[0]) : 0
}

function spStoryList() {
    return SECTIONS.filter(s => SP_STORIES[s.id]).map(s => ({s, story: SP_STORIES[s.id]}))
}

let spStoriesTab = 'time';

function spStoriesSet(tab) {
    spStoriesTab = tab;
    spRenderStories()
}

function spRenderStories() {
    const all = spStoryList(), tab = ['time', 'comics', 'memo'].includes(spStoriesTab) ? spStoriesTab : 'time';
    const topic = s => `<a class="story-topic" href="#${s.id}">${ui('Тема')} ${sectionNumber(s)} · ${esc(s.title)} ${ico('arrow')}</a>`;
    let body;
    if (tab === 'time') body = `<div class="story-timeline">${[...all].sort((a, b) => spStoryYear(a.story) - spStoryYear(b.story)).map(({s, story}) => spHistoryHtml(story, topic(s))).join('')}</div>`;
    else if (tab === 'comics') body = `<div class="stack">${all.map(({s, story}) => `<article class="card story-card">${spComicHtml(story)}${topic(s)}</article>`).join('')}</div>`;
    else body = `<div class="stack">${all.map(({s, story}) => `<article class="card story-card">${spMemoHtml(story, s.title)}${topic(s)}</article>`).join('')}</div>`;
    const tabs = [['time', 'Лента времени', all.length], ['comics', 'Комиксы', all.length], ['memo', 'Запоминалки', all.reduce((n, x) => n + x.story.memo.length, 0)]];
    $('main-content').innerHTML = `<div class="page stories-page">${pageTop('Истории и запоминалки')}<p class="eyebrow">${ui('КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ')}</p><h1>${ui('Истории и запоминалки')}</h1><p class="page-description">${ui('К каждой теме — короткий комикс с Айшой, Тимуром и котом Сигмой, настоящий сюжет из истории науки и фразы, которые помогают удержать главное в памяти.')}</p>
    <div class="cx-cast card"><div class="cx-cast-item">${spCxActor('aisha', 'ok')}<div><strong>${ui('Айша')}</strong><span>${ui('Сначала спрашивает «а откуда данные?», потом считает.')}</span></div></div><div class="cx-cast-item">${spCxActor('timur', 'lol')}<div><strong>${ui('Тимур')}</strong><span>${ui('Спешит с выводами — и поэтому находит все ловушки первым.')}</span></div></div><div class="cx-cast-item">${spCxActor('cat', 'ok')}<div><strong>${ui('Кот Сигма')}</strong><span>${ui('Носит на ошейнике букву σ и знает, чем закончится спор.')}</span></div></div></div>
    <nav class="tabs" role="tablist" aria-label="${ui('Истории и запоминалки')}">${tabs.map(([id, title, n]) => `<button class="tab ${tab === id ? 'active' : ''}" role="tab" aria-selected="${tab === id}" onclick="spStoriesSet('${id}')">${ui(title)}<span class="tab-count">${n}</span></button>`).join('')}</nav>
    ${body}
    <section class="card story-books"><h3>${ico('book')} ${ui('Что почитать дальше: математика в картинках')}</h3><p class="small muted">${ui('Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.')}</p><ul>${SP_STORY_BOOKS.map(([title, note]) => `<li><strong>${esc(title)}</strong><span>${esc(note)}</span></li>`).join('')}</ul></section>${footer()}</div>`
}

// Карточка на главной странице.
function spStoriesTeaser() {
    const all = spStoryList();
    if (!all.length) return '';
    return `<section class="card story-teaser"><div class="story-teaser-cast">${spCxActor('aisha', 'ok')}${spCxActor('cat', 'lol')}${spCxActor('timur', 'wow')}</div><div><span class="eyebrow">${ui('НОВОЕ В КУРСЕ')}</span><h2>${ui('Комиксы, истории и запоминалки')}</h2><p>${ui('Почему десять миллионов анкет ошиблись, как кот объясняет дисперсию и какая фраза помогает не перепутать моду с медианой.')}</p></div><a href="#stories" class="btn primary">${ui('Открыть истории')} ${ico('arrow')}</a></section>`
}

Object.assign(DICTS.en, {
    'Комикс': 'Comic', 'Как это было': 'How it happened', 'Вывод для нас:': 'What it means for us:', 'Запоминалки': 'Memory hooks', 'Чтобы не забыть': 'So you do not forget',
    'ЧТОБЫ ЗАПОМНИЛОСЬ': 'TO MAKE IT STICK', 'Комикс, история и запоминалки': 'Comic, history and memory hooks', 'Все истории': 'All stories', 'Тема': 'Topic',
    'Истории и запоминалки': 'Stories and memory hooks', 'КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ': 'COMICS · HISTORY · MEMORY HOOKS',
    'К каждой теме — короткий комикс с Айшой, Тимуром и котом Сигмой, настоящий сюжет из истории науки и фразы, которые помогают удержать главное в памяти.': 'Each topic has a short comic with Aisha, Timur and Sigma the cat, a true episode from the history of science and phrases that help you remember the key idea. The stories themselves are in Russian for now.',
    'Айша': 'Aisha', 'Тимур': 'Timur', 'Кот Сигма': 'Sigma the cat', 'кот Сигма': 'Sigma the cat',
    'Сначала спрашивает «а откуда данные?», потом считает.': 'Asks “where do the data come from?” first, and calculates second.',
    'Спешит с выводами — и поэтому находит все ловушки первым.': 'Jumps to conclusions — and so finds every trap first.',
    'Носит на ошейнике букву σ и знает, чем закончится спор.': 'Wears the letter σ on the collar and knows how the argument will end.',
    'Лента времени': 'Timeline', 'Комиксы': 'Comics', 'Что почитать дальше: математика в картинках': 'Further reading: mathematics in pictures',
    'Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.': 'The comics in this course were drawn for it. These books continue the theme — look for them in a library.',
    'НОВОЕ В КУРСЕ': 'NEW IN THE COURSE', 'Комиксы, истории и запоминалки': 'Comics, stories and memory hooks',
    'Почему десять миллионов анкет ошиблись, как кот объясняет дисперсию и какая фраза помогает не перепутать моду с медианой.': 'Why ten million ballots got it wrong, how a cat explains variance, and which phrase keeps the mode and the median apart.',
    'Открыть истории': 'Open the stories'
});
Object.assign(DICTS.kk, {
    'Комикс': 'Комикс', 'Как это было': 'Бұл қалай болды', 'Вывод для нас:': 'Біз үшін қорытынды:', 'Запоминалки': 'Есте сақтау тәсілдері', 'Чтобы не забыть': 'Ұмытпау үшін',
    'ЧТОБЫ ЗАПОМНИЛОСЬ': 'ЕСТЕ ҚАЛУЫ ҮШІН', 'Комикс, история и запоминалки': 'Комикс, тарих және есте сақтау тәсілдері', 'Все истории': 'Барлық оқиғалар', 'Тема': 'Тақырып',
    'Истории и запоминалки': 'Оқиғалар мен есте сақтау тәсілдері', 'КОМИКСЫ · ИСТОРИЯ · ЗАПОМИНАЛКИ': 'КОМИКСТЕР · ТАРИХ · ЕСТЕ САҚТАУ',
    'К каждой теме — короткий комикс с Айшой, Тимуром и котом Сигмой, настоящий сюжет из истории науки и фразы, которые помогают удержать главное в памяти.': 'Әр тақырыпқа — Айша, Тимур және Сигма мысық қатысатын қысқа комикс, ғылым тарихынан шынайы оқиға және негізгі ойды есте сақтауға көмектесетін сөйлемдер. Оқиғалардың мәтіні әзірге орыс тілінде.',
    'Айша': 'Айша', 'Тимур': 'Тимур', 'Кот Сигма': 'Сигма мысық', 'кот Сигма': 'Сигма мысық',
    'Сначала спрашивает «а откуда данные?», потом считает.': 'Алдымен «деректер қайдан алынды?» деп сұрайды, содан кейін есептейді.',
    'Спешит с выводами — и поэтому находит все ловушки первым.': 'Қорытындыға асығады — сондықтан барлық тұзақты бірінші болып табады.',
    'Носит на ошейнике букву σ и знает, чем закончится спор.': 'Қарғыбауында σ әрпін тағып жүреді және даудың немен аяқталатынын біледі.',
    'Лента времени': 'Уақыт таспасы', 'Комиксы': 'Комикстер', 'Что почитать дальше: математика в картинках': 'Әрі қарай не оқуға болады: суреттегі математика',
    'Комиксы курса нарисованы специально для него. А эти книги продолжают тему — их стоит поискать в библиотеке.': 'Курс комикстері арнайы осы курс үшін салынған. Ал мына кітаптар тақырыпты жалғастырады — оларды кітапханадан іздеп көріңіз.',
    'НОВОЕ В КУРСЕ': 'КУРСТАҒЫ ЖАҢАЛЫҚ', 'Комиксы, истории и запоминалки': 'Комикстер, оқиғалар және есте сақтау тәсілдері',
    'Почему десять миллионов анкет ошиблись, как кот объясняет дисперсию и какая фраза помогает не перепутать моду с медианой.': 'Он миллион сауалнама неге қателесті, мысық дисперсияны қалай түсіндіреді және моданы медианамен шатастырмауға қандай сөйлем көмектеседі.',
    'Открыть истории': 'Оқиғаларды ашу'
});
