import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#materials',beforeParse(w){w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))}}});
const w=dom.window;await new Promise(r=>setTimeout(r,2500));const ev=x=>w.eval(x);const doc=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cyr=/[а-яё]/i;
const cards=()=>[...doc.querySelectorAll('.resource-card')];
// Заголовок карточки — интерфейсный текст: переводчик страницы переводит и его.
// Поэтому id материала (кнопка «Смотреть») сравниваем отдельно от видимого заголовка.
const cardIds=()=>cards().map(c=>c.querySelector('button[onclick^="openMaterial"]').getAttribute('onclick').match(/'([^']+)'/)[1]);
const cardTitles=()=>cards().map(c=>c.querySelector('h3').textContent.trim());
const text=(el=doc.getElementById('main-content'))=>el.textContent.replace(/\s+/g,' ').trim();
const hasCyr=(list)=>list.filter(t=>cyr.test(t));

// В библиотеке встроены три версии каждой презентации: русская, английская и казахская.
assert(ev("materials.filter(m=>/-en$/.test(m.id)).length>=7"),'нет английских презентаций');
assert(ev("materials.filter(m=>/-kk$/.test(m.id)).length>=7"),'нет казахских презентаций');
const uniqueDecks=ev("materialsInLanguage(materials.filter(m=>m.kind==='slides')).length");

// --- 1. Английский интерфейс: одна карточка на презентацию, английский файл ---
ev("setLanguage('en')");await wait(300);
ev("location.hash='#materials'");await wait(150);
const enIds=cardIds(),enTitles=cardTitles();
assert.equal(enIds.length,ev("materialsInLanguage(materials).length"),'карточек столько же, сколько презентаций');
assert.equal(new Set(enIds).size,enIds.length,'нет повторов одной презентации');
assert.equal(enIds.filter(id=>id==='lesson1-en').length,1,'Lesson 1 открывается из английского файла');
assert(enIds.includes('series-en'),'английский файл дополнительного модуля');
assert(!enIds.some(id=>/-kk$/.test(id)),'казахских файлов в английской библиотеке нет: '+enIds.filter(id=>/-kk$/.test(id)).join(' | '));
assert(!enIds.some(id=>!/(-(en|kk))$/.test(id)&&ev(`materialBaseId('${id}')`)!==id),'русского дубля с переводом нет');
assert.equal(hasCyr(enTitles).length,0,'в английской библиотеке нет кириллицы: '+hasCyr(enTitles).join(' | '));
assert(enTitles.includes('Lesson 1. Random Variables'),'английское название презентации');
assert(!text().includes('добавлено учителем'),'подпись «добавлено учителем» переведена');
assert(!/Презентация ·/.test(text()),'значок «Презентация» переведён');
assert(/18 slides/.test(text()),'объём слайдов по-английски: '+text().slice(0,200));
for(const img of doc.querySelectorAll('.resource-card img.resource-cover'))assert(!cyr.test(img.getAttribute('alt')),'alt обложки: '+img.getAttribute('alt'));
for(const btn of doc.querySelectorAll('.resource-card [aria-label]'))assert(!cyr.test(btn.getAttribute('aria-label')),'подпись кнопки: '+btn.getAttribute('aria-label'));

// --- 2. Просмотрщик открывает английский PDF, а не русский оригинал ---
// Карточка открывает уже выбранный файл; прямой openMaterial уважает явный id.
ev("(document.querySelector('.resource-card button[onclick^=\"openMaterial\"]')).click()");await wait(200);
assert.equal(ev("pdfState.id"),'lesson1-en','карточка открывает английскую версию');
assert.equal(doc.getElementById('pdf-title').textContent,'Lesson 1. Random Variables');
ev("document.getElementById('pdf-dialog').close()");await wait(80);

// --- 3. Казахский интерфейс ---
ev("setLanguage('kk')");await wait(350);
ev("location.hash='#materials'");await wait(150);
const kkIds=cardIds(),kkTitles=cardTitles();
assert.equal(kkIds.length,enIds.length,'столько же карточек, сколько в английском');
assert.equal(kkIds.filter(id=>id==='lesson1-kk').length,1,'казахская презентация показана один раз');
assert(kkIds.includes('series-kk'),'казахский файл дополнительного модуля');
assert(!kkIds.some(id=>/-en$/.test(id)),'английских файлов в казахской библиотеке нет: '+kkIds.filter(id=>/-en$/.test(id)).join(' | '));
assert(kkTitles.includes('Сабақ 1. Кездейсоқ шамалар'),'казахское название презентации: '+kkTitles.slice(0,3).join(' | '));
assert(!kkTitles.some(t=>/^Lesson \d\./.test(t)),'английских названий нет: '+kkTitles.filter(t=>/^Lesson \d\./.test(t)).join(' | '));
assert(!kkTitles.some(t=>t.includes('Вариационные ряды')),'русское название не подменяет казахское: '+kkTitles.filter(t=>t.includes('Вариационные')).join(' | '));
assert(!text().includes('добавлено учителем'),'подпись учителя переведена и на казахский');
ev("(document.querySelector('.resource-card button[onclick^=\"openMaterial\"]')).click()");await wait(200);
assert.equal(ev("pdfState.id"),'lesson1-kk','карточка открывает казахскую версию');
assert.equal(doc.getElementById('pdf-title').textContent,'Сабақ 1. Кездейсоқ шамалар');
ev("document.getElementById('pdf-dialog').close()");await wait(80);

// --- 4. Русский интерфейс: русские оригиналы и русские подписи ---
ev("setLanguage('ru')");await wait(350);
ev("location.hash='#materials'");await wait(150);
const ruIds=cardIds(),ruTitles=cardTitles();
assert.equal(ruIds.length,enIds.length,'столько же карточек, сколько переводов');
assert.equal(ruIds.filter(id=>id==='lesson1').length,1,'русский оригинал показан один раз');
assert(!ruIds.some(id=>/-(en|kk)$/.test(id)),'переводов в русской библиотеке нет: '+ruIds.filter(id=>/-(en|kk)$/.test(id)).join(' | '));
assert(ruTitles.includes('Урок 1. Случайные величины'),'русское название презентации');
assert(!ruTitles.some(t=>/^(Lesson|Сабақ) /.test(t)),'переводы не показываются в русской библиотеке: '+ruTitles.filter(t=>/^(Lesson|Сабақ) /.test(t)).join(' | '));
// В русской версии badge показывает только вид материала.
assert(/<span class="pill (?:warm|green)"[^>]*>Презентация<\/span>/.test(doc.querySelector('.resource-card').innerHTML),'русский значок презентации');
assert(/18 слайдов/.test(text()),'объём слайдов по-русски');
ev("(document.querySelector('.resource-card button[onclick^=\"openMaterial\"]')).click()");await wait(200);
assert.equal(ev("pdfState.id"),'lesson1','русская карточка открывает оригинал');
ev("document.getElementById('pdf-dialog').close()");await wait(80);

// --- 5. Вкладка «Материалы» темы показывает один файл на презентацию ---
ev("go('random-variables','slides')");await wait(150);
assert.equal(cardIds().length,2,'в теме две презентации без дублей: '+cardIds().join(' | '));
assert(!cardIds().some(id=>/-(en|kk)$/.test(id)),'на русском только русские файлы');
ev("setLanguage('en')");await wait(350);ev("go('random-variables','slides')");await wait(150);
assert(cardIds().every(id=>/-en$/.test(id)),'в английской теме только английские файлы: '+cardIds().join(' | '));
assert.equal(hasCyr(cardTitles()).length,0,'английская тема без кириллицы');
const topicTab=doc.querySelector('.tab[aria-controls="topic-panel"]');
assert(doc.querySelector('#topic-panel').textContent.includes('Theory and slides for the topic'),'заголовок вкладки переведён');

// --- 6. Панель учителя: варианты загрузки и список материалов ---
ev("teacherTopic='random-variables';go('teacher','materials')");await wait(250);
const teacherText=text();
assert(!teacherText.includes('Слайды / презентация'),'вариант загрузки переведён');
assert(!teacherText.includes('Методический материал для учителя'),'методический материал переведён');
assert(!teacherText.includes('Встроенный оригинал'),'подпись «Встроенный оригинал» переведена');
assert(!teacherText.includes('Сабақ 1.'),'казахский файл не подписан английским названием');
// Каждая презентация — одна строка; значки языков открывают нужный файл.
assert.equal(doc.querySelectorAll('.material-list-item').length,enIds.length,'в панели учителя столько же строк, сколько презентаций');
assert(/built-in deck/.test(teacherText),'подпись происхождения переведена: '+teacherText.slice(teacherText.indexOf('Connected'),teacherText.indexOf('Connected')+140));
ev("openMaterial('lesson2-kk')");await wait(200);
assert.equal(ev("pdfState.id"),'lesson2-kk','значок языка открывает выбранный файл даже в английском интерфейсе');
ev("document.getElementById('pdf-dialog').close()");await wait(80);

// --- 7. Открытая презентация переключается вместе с языком страницы ---
ev("location.hash='#materials'");await wait(200);
ev("(document.querySelector('.resource-card button[onclick^=\"openMaterial\"]')).click()");await wait(200);
assert.equal(ev("pdfState.id"),'lesson1-en');ev("setPdfPage(5)");await wait(150);
ev("setLanguage('kk')");await wait(400);
assert.equal(ev("pdfState.id"),'lesson1-kk','просмотрщик переключился на казахский файл');
assert.equal(ev("pdfState.page"),5,'номер слайда сохранился');
assert.equal(doc.getElementById('pdf-title').textContent,'Сабақ 1. Кездейсоқ шамалар','название сменилось');
assert(/18/.test(doc.getElementById('pdf-count').textContent),'счётчик страниц обновился: '+doc.getElementById('pdf-count').textContent);
assert(!doc.getElementById('pdf-loading').textContent.includes('Не удалось'),'ошибка просмотра не показана');
ev("setLanguage('en')");await wait(400);
assert.equal(ev("pdfState.id"),'lesson1-en','возврат к английскому файлу');
ev("document.getElementById('pdf-dialog').close()");await wait(100);
ev("setLanguage('ru')");await wait(300);

// --- 8. План урока учителя: файлы также без дублей ---
ev("setLanguage('en')");await wait(350);
ev("teacherTopic='random-variables';go('teacher','lesson')");await wait(250);
const lessonRows=[...doc.querySelectorAll('#teacher-panel .material-list-item')];
assert.equal(lessonRows.length,2,'в плане урока две презентации без дублей: '+lessonRows.length);
assert(lessonRows.every(r=>!/[а-яё]/i.test(r.textContent)),'строки плана урока без кириллицы');
assert(/18 slides/.test(lessonRows.map(r=>r.textContent).join(' ')),'объём слайдов в плане урока по-английски');

// --- 9. Счётчики презентаций не учитывают переводы ---
const deckCount=ev("materialsInLanguage(INITIAL_MATERIALS.filter(m=>m.kind==='slides')).length");
ev("location.hash='#home'");await wait(200);
const homeText=doc.getElementById('main-content').textContent.replace(/\s+/g,' ');
assert(homeText.includes(String(deckCount)+' '),'на главной число презентаций без переводов: '+homeText.slice(homeText.indexOf('слайдов'),homeText.indexOf('слайдов')+40));
ev("go('random-variables','slides')");await wait(150);
assert(!/\b3\b/.test(ev("sectionMaterials(SECTIONS.find(s=>s.id==='random-variables')).length")),'в теме 6 файлов, но 2 презентации');
assert.equal(doc.querySelectorAll('.tab-count').length>=1,true);

// --- 9. Текст слайда без декоративных знаков вопроса ---
assert.equal(ev("readableSlideText('?\\n?\\n4\\n12\\nRandom variables\\nGrade 10')"),'Random variables\nGrade 10','служебные знаки убраны');
assert.equal(ev("readableSlideText('?\\n?\\n4\\n12')"),'','только знаки — пустой текст');
assert(ev("readableSlideText('Все материалы\\nкурса')").startsWith('Все материалы'),'обычный текст не меняется');

assert.deepEqual(errors,[]);
dom.window.close();
console.log('OK: презентации показываются на языке интерфейса в библиотеке, теме и просмотрщике');
