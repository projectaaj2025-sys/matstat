/* ---- 11. Конспекты уроков (двуязычные) --------------------------------- */

function spNoteLangs() {
    return (COURSE.lessonNotes || [])
}

function spMaterialTitle(m) {
    const langs = m && m.langs;
    if (!langs) return m.title;
    const L = langs[LANG] || langs.ru;
    return (L && L.title) || m.title
}

function spMaterialBody(m) {
    const langs = m && m.langs;
    if (!langs) return m.data;
    const L = langs[LANG] || langs.ru;
    return (L && L.body) || m.data
}

function spNoteLesson(n) {
    const L = n.langs && n.langs[LANG];
    return (L && L.lesson) || n.lesson
}

function spSectionNotes(sectionId) {
    return spNoteLangs().filter(n => n.sectionId === sectionId)
}

function spOpenNote(id) {
    const n = spNoteLangs().find(x => x.id === id);
    if (!n) { toast(ui('Конспект не найден.'), true); return }
    $('text-title').textContent = spMaterialTitle(n);
    $('text-body').innerHTML = `<article class="prose">${markdown(spMaterialBody(n))}</article><div class="row wrap" style="margin-top:25px"><button class="btn" onclick="spNoteDownload('${esc(id)}')">${ico('download')} ${ui('Скачать текст')}</button></div>`;
    math($('text-body'));
    $('text-dialog').showModal()
}

function spNoteDownload(id) {
    const n = spNoteLangs().find(x => x.id === id);
    if (!n) return;
    download(new Blob(['\ufeff' + spMaterialTitle(n) + '\n\n' + spMaterialBody(n)], {type: 'text/plain;charset=utf-8'}), ui('СтатПрактикум — конспект урока.txt'))
}

function spNotesBlock() {
    const notes = spNoteLangs();
    if (!notes.length) return '';
    return `<div class="card" style="margin-top:18px"><div class="between" style="margin-bottom:14px"><h3 style="margin:0">${ui('Конспекты уроков')}</h3><span class="pill green">${ui('на трёх языках')}</span></div><p class="small muted">${ui('Одностраничный конспект к каждому уроку и презентации: понятия, формулы, ход урока и вопросы для класса. Конспект открывается на выбранном языке интерфейса.')}</p><div class="notes-grid">${notes.map(n=>`<button class="note-card" onclick="spOpenNote('${esc(n.id)}')"><strong>${esc(spMaterialTitle(n))}</strong><span class="small muted">${esc(spNoteLesson(n))}</span></button>`).join('')}</div></div>`
}
