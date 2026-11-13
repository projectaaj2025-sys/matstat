import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#central-tendency',beforeParse(w){w.scrollTo=()=>{}}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const ev=x=>w.eval(x);const doc=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// Every lesson has a story and comic captions in all three languages with the same shape.
const ids=ev('SECTIONS.map(s=>s.id)'),stories=ev('SP_STORIES'),comics=ev('SP_COMIC_TEXT'),images=ev('SP_COMIC_IMAGES');
const cyr=/[а-яё]/i,kkOnly=/[әғқңөұүһі]/i;
for(const lang of ['ru','en','kk']){
 assert.deepEqual(Object.keys(stories[lang]).sort(),[...ids].sort(),`темы сюжетов: ${lang}`);
 for(const id of ids){
  const s=stories[lang][id],ru=stories.ru[id],label=`${id} (${lang})`;
  assert(/\d{4}/.test(s.year)&&s.who&&s.title&&s.moral,`сюжет ${label}`);
  assert.equal(s.year.match(/\d{4}/)[0],ru.year.match(/\d{4}/)[0],`год ${label}`);
  assert.equal(s.text.length,ru.text.length,`абзацы ${label}`);
  assert.equal(s.memo.length,ru.memo.length,`запоминалки ${label}`);
  assert(s.memo.length>=3&&s.memo.every(m=>m.length===2&&m[0]&&m[1]),`запоминалки ${label}`);
  const c=comics[id][lang];assert(c&&c.length===4&&c.every(Boolean),`подписи комикса ${label}`);
  const all=[s.who,s.title,s.moral,...s.text,...s.memo.flat(),...c].join(' ');
  if(lang==='en')assert(!cyr.test(all),`кириллица в английском тексте ${id}`);
  if(lang==='kk')assert(kkOnly.test(all),`нет казахского текста ${id}`);
  // Numbers must survive translation: years, decimals and large numbers of each paragraph are compared
  // (decimal marks and thousands separators aside; small counts may be written in words).
  const digits=t=>(t.replace(/(\d)[\s.,\u00a0](?=\d)/g,'$1').match(/\d{3,}/g)||[]).sort().join(',');
  s.text.forEach((t,i)=>assert.equal(digits(t),digits(ru.text[i]),`числа в абзаце ${i+1}: ${label}`));
  c.slice(1).forEach((t,i)=>assert.equal(digits(t),digits(comics[id].ru[i+1]),`числа в подписи ${i+1}: ${label}`));
 }
}
assert.deepEqual(Object.keys(comics).sort(),[...ids].sort());
for(const id of Object.keys(images)){assert(ids.includes(id),`картинка без темы: ${id}`);assert(images[id].startsWith('data:image/webp;base64,'))}
const withImage=ids.filter(id=>images[id]);assert(withImage.length>=10);

// The block under the theory: one picture, three captions outside the picture, no character names.
const block=doc.getElementById('story-block');assert(block);
assert.equal(block.querySelectorAll('img.cx-image').length,1);
assert.equal(block.querySelectorAll('.cx-caps li').length,3);
assert(block.textContent.includes('Миллиардер в автобусе'));assert(block.textContent.includes('Сколько весит бык?'));
assert.equal(block.querySelectorAll('.memo-note').length,4);
assert(!/Айш|Тимур|кот Сигма/.test(JSON.stringify([stories,comics])));
assert(block.compareDocumentPosition(doc.querySelector('.theory-card'))&w.Node.DOCUMENT_POSITION_PRECEDING);

// Every lesson renders its block; the comic appears exactly where a picture exists.
for(const id of ids){ev(`go('${id}','theory')`);await wait(5);const b=doc.getElementById('story-block');assert(b,`блок не нарисован: ${id}`);assert.equal(b.querySelectorAll('.cx-comic').length,images[id]?1:0,`комикс: ${id}`)}

// The overview page: chronological timeline, comics and mnemonics tabs.
ev("location.hash='#stories'");await wait(50);
assert(doc.querySelector('.stories-page'));assert(doc.querySelector('#course-nav a[href="#stories"].active'));
const years=[...doc.querySelectorAll('.story-timeline .story-year strong')].map(e=>Number(e.textContent.match(/\d{4}/)[0]));
assert.equal(years.length,ids.length);assert.deepEqual(years,[...years].sort((a,b)=>a-b));assert.equal(years[0],1620);
ev("spStoriesSet('comics')");assert.equal(doc.querySelectorAll('.cx-comic').length,withImage.length);
ev("spStoriesSet('memo')");assert.equal(doc.querySelectorAll('.memo-note').length,Object.values(stories.ru).reduce((n,s)=>n+s.memo.length,0));
assert.equal(doc.querySelectorAll('.story-books li').length,4);
assert.equal(doc.querySelectorAll('.story-books li a[href^="https://"]').length,4);

// Every topic names the book chapters behind its comic, and the library links to the four books.
const refs=ev('SP_COMIC_REFS'),urls=ev('SP_BOOK_URLS');
for(const id of ids){assert(refs[id]&&refs[id].length,`нет ссылки на книгу: ${id}`);for(const [key] of refs[id])assert(urls[key],`неизвестная книга: ${key}`)}
ev("go('math-expectation','theory')");await wait(20);
let refLine=doc.querySelector('#story-block .cx-refs');assert(refLine&&refLine.textContent.includes('Орлин')&&refLine.textContent.includes('гл. 11'));assert.equal(refLine.querySelector('a').href,urls.orlin);
ev("location.hash='#materials'");await wait(50);
assert.equal(doc.querySelectorAll('.source-card').length,7);assert.equal(doc.querySelectorAll('.source-card[href*="alpinabook.ru"]').length,1);
ev("setLanguage('en')");await wait(50);
assert(doc.querySelector('.source-card[href*="alpinabook.ru"]').textContent.includes('Math with Bad Drawings'));assert(!cyr.test(doc.querySelector('.source-card[href*="dmkpress.com"]').textContent));
ev("setLanguage('ru')");await wait(50);

// Content follows the interface language and returns to Russian intact.
ev("setLanguage('en');go('central-tendency','theory')");await wait(50);
let b=doc.getElementById('story-block');assert(b.textContent.includes('A billionaire on the bus'));assert(b.textContent.includes('How much does the ox weigh?'));assert(b.textContent.includes('Memory hooks'));
assert(!cyr.test(b.textContent),'русский текст в английском блоке');
ev("setLanguage('kk')");await wait(50);
b=doc.getElementById('story-block');assert(b.textContent.includes('Автобустағы миллиардер'));assert(b.textContent.includes('Өгіз қанша тартады?'));
ev("setLanguage('ru');location.hash='#home'");await wait(50);
assert(doc.querySelector('.story-teaser a[href="#stories"]'));assert(doc.querySelector('.story-teaser img'));
assert.deepEqual(errors,[]);dom.window.close();console.log('OK: комиксы, исторические сюжеты и запоминалки на трёх языках');
