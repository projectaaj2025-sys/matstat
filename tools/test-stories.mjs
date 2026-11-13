import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#central-tendency',beforeParse(w){w.scrollTo=()=>{}}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const ev=x=>w.eval(x);const doc=w.document;

// Every lesson has a complete story, and no story is left without a lesson.
const ids=ev('SECTIONS.map(s=>s.id)'),stories=ev('SP_STORIES');
assert.deepEqual(Object.keys(stories).filter(id=>!ids.includes(id)),[]);
const props=ev('Object.keys(SP_CX_PROPS)'),moods=['ok','lol','wow','hm','sad'],cast=['aisha','timur','cat'];
for(const id of ids){
 const s=stories[id];assert(s,`нет истории для темы ${id}`);
 assert(s.comic.title&&s.comic.panels.length>=3,`комикс ${id}`);
 for(const p of s.comic.panels){
  for(const side of ['l','r'])if(p[side]){const [who,mood]=p[side].split(':');assert(cast.includes(who)&&moods.includes(mood),`герой ${id}: ${p[side]}`)}
  if(p.prop)assert(props.includes(p.prop),`предмет ${id}: ${p.prop}`);
  assert(p.say.length>=1&&p.say.length<=3,`реплики ${id}`);
  for(const [side,text] of p.say){assert(p[side],`реплика без героя в ${id}: ${text}`);assert(text.length<=150,`длинная реплика в ${id}: ${text}`)}
 }
 assert(/\d{4}/.test(s.history.year)&&s.history.who&&s.history.title&&s.history.moral&&s.history.text.length>=2,`история ${id}`);
 assert(s.memo.length>=3&&s.memo.every(m=>m.length===2&&m[0]&&m[1]),`запоминалки ${id}`);
}

// The block is drawn under the theory of a lesson.
const block=doc.getElementById('story-block');assert(block);
assert.equal(block.querySelectorAll('.cx-panel').length,3);
assert(block.querySelectorAll('.cx-panel svg.cx-actor').length>=5);
assert(block.textContent.includes('Миллиардер в автобусе'));assert(block.textContent.includes('Сколько весит бык?'));
assert.equal(block.querySelectorAll('.memo-note').length,4);
assert(doc.querySelector('.theory-card'));assert(block.compareDocumentPosition(doc.querySelector('.theory-card'))&w.Node.DOCUMENT_POSITION_PRECEDING);

// Every lesson renders its block without errors.
for(const id of ids){ev(`go('${id}','theory')`);await new Promise(r=>setTimeout(r,5));assert(doc.getElementById('story-block'),`блок не нарисован: ${id}`)}

// The overview page: timeline in chronological order, comics and mnemonics tabs.
ev("location.hash='#stories'");await new Promise(r=>setTimeout(r,50));
assert(doc.querySelector('.stories-page'));assert(doc.querySelector('#course-nav a[href="#stories"].active'));
const years=[...doc.querySelectorAll('.story-timeline .story-year strong')].map(e=>Number(e.textContent.match(/\d{4}/)[0]));
assert.equal(years.length,ids.length);assert.deepEqual(years,[...years].sort((a,b)=>a-b));assert.equal(years[0],1620);
assert.equal(doc.querySelectorAll('.story-timeline a.story-topic').length,ids.length);
ev("spStoriesSet('comics')");assert.equal(doc.querySelectorAll('.cx-comic').length,ids.length);
ev("spStoriesSet('memo')");assert.equal(doc.querySelectorAll('.memo-note').length,Object.values(stories).reduce((n,s)=>n+s.memo.length,0));
assert.equal(doc.querySelectorAll('.story-books li').length,4);

// Interface captions follow the selected language; the home page shows the teaser.
ev("setLanguage('en')");await new Promise(r=>setTimeout(r,50));
assert(doc.querySelector('.stories-page h1').textContent.includes('Stories and memory hooks'));
ev("setLanguage('ru');location.hash='#home'");await new Promise(r=>setTimeout(r,50));
assert(doc.querySelector('.story-teaser a[href="#stories"]'));
assert.deepEqual(errors,[]);dom.window.close();console.log('OK: комиксы, исторические сюжеты и запоминалки для всех тем');
