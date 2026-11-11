import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#law-of-large-numbers/lab',beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const ev=x=>w.eval(x),doc=w.document;
assert.equal(ev('SECTIONS.filter(s=>!WORKED_EXAMPLES[s.id]).length'),0,'every lesson has a worked example');
assert.equal(ev('ballTrajectory(50,50,()=>0.5).hit'),true,'centre can hit');assert.equal(ev('ballTrajectory(50,50,()=>0).hit'),false,'same setting can miss');
const hit=ev('ballTrajectory(50,50,()=>0.5)'),atRim=ev('ballPosition')(hit.rimTime,hit);assert(Math.abs(atRim.y-0.8)<1e-9);assert(atRim.z>4.67&&atRim.z<5.93);
assert(doc.getElementById('ball-scene'));assert(doc.getElementById('ball-object'));w.requestAnimationFrame=cb=>cb(w.performance.now()+1000);let orig=w.Math.random;w.Math.random=()=>.5;ev('throwBall()');w.Math.random=()=>0;ev('throwBall()');w.Math.random=orig;assert.deepEqual(Array.from(ev('ballExperiment.throws.map(r=>r.hit)')),[1,0]);assert(doc.getElementById('ball-result').textContent.includes('1 0'));
// Changing participants and cancelling the reset preserves data and selection.
w.confirm=()=>false;doc.getElementById('ball-players').value='5';ev('resetBallExperiment()');assert.equal(doc.getElementById('ball-players').value,'1');assert.equal(ev('ballExperiment.throws.length'),2);w.confirm=()=>true;
// Gesture adjusts the controls and throws; no pointer-only interaction is required.
const svg=doc.getElementById('ball-scene');svg.getBoundingClientRect=()=>({width:760});ev('ballPointerDown')({target:doc.getElementById('ball-object'),clientX:400,clientY:400,pointerId:1,preventDefault(){}});ev('ballPointerMove')({clientX:410,clientY:300,pointerId:1});ev('ballPointerUp')({clientY:300,pointerId:1});assert.equal(ev('ballExperiment.throws.length'),3);
ev("renderProbabilityLab(document.getElementById('topic-panel'))");assert(doc.getElementById('urn-experiment'));w.Math.random=()=>0;ev('runUrn(1)');w.Math.random=orig;assert.deepEqual(Array.from(ev('urnState.rows[0]')),[1,1]);
doc.getElementById('urn-mode').value='without';ev('urnChanged()');assert.equal(ev('urnState.rows.length'),0);assert(doc.getElementById('urn-result').textContent.includes('0,2222'));
doc.getElementById('urn-red').value='0';doc.getElementById('urn-blue').value='2';ev('urnChanged()');assert(doc.getElementById('urn-result').textContent.includes('0/2'));ev('runUrn(100)');assert.equal(ev('urnState.rows.filter(r=>r[0]||r[1]).length'),0);
doc.getElementById('urn-red').value='';ev('urnChanged()');assert(doc.getElementById('urn-one').disabled);
assert.deepEqual(errors,[]);dom.window.close();console.log('OK: решённые задачи, 3D-броски, жесты и урна');
