import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#law-of-large-numbers/lab',beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const ev=x=>w.eval(x),doc=w.document;
assert(!doc.getElementById('ball-player'));assert(!doc.getElementById('ball-path'));assert(doc.getElementById('ball-object'));assert(doc.getElementById('ball-hit-area'));assert(Number(doc.getElementById('ball-hit-area').getAttribute('r'))>=50);
doc.getElementById('ball-aim').value='0';doc.getElementById('ball-power').value='0';ev('autoBallSettings()');assert.equal(doc.getElementById('ball-aim').value,'50');assert.equal(doc.getElementById('ball-aim-value').textContent,'50');
const power=Number(doc.getElementById('ball-power').value),shot=ev(`ballTrajectory(50,${power},()=>.5,0)`),landing=ev('ballPosition')(shot.rimTime,shot);assert(Math.abs(landing.z-5.3)<.03);assert.equal(ev('ballExperiment.throws.length'),0);assert(doc.getElementById('ball-gesture-status').textContent.includes('не гарантировано'));
// No preset result pattern: controlled random input can yield only hits or only misses.
w.Math.random=()=>0.5;ev('runAutomaticBallThrows()');assert.equal(ev('ballExperiment.throws.length'),20);assert(ev('ballExperiment.throws.every(r=>r.hit===1 && r.source==="simulation" && r.automatic)'));assert(doc.getElementById('ball-auto-series').disabled);assert(doc.getElementById('ball-autoset').disabled);assert(doc.getElementById('ball-throw').disabled);
ev('resetBallExperiment()');ev('autoBallSettings()');w.Math.random=()=>0;ev('runAutomaticBallThrows()');assert(ev('ballExperiment.throws.every(r=>r.hit===0)'));
// A partially filled participant is completed without spilling into the next participant.
doc.getElementById('ball-players').value='5';ev('resetBallExperiment()');doc.getElementById('ball-manual-data').value='1 0 1';ev('addManualBallThrows()');ev('runAutomaticBallThrows()');assert.equal(ev('ballExperiment.throws.length'),20);assert.equal(ev('ballExperiment.throws.filter(r=>r.source==="manual").length'),3);assert(ev('ballExperiment.throws.slice(3).every(r=>r.player===1 && r.source==="simulation")'));assert(doc.getElementById('ball-result').textContent.includes('Участник 2'));assert(!doc.getElementById('ball-auto-series').disabled);assert(doc.getElementById('ball-result').textContent.includes('Смешанный'));
ev('runAutomaticBallThrows()');assert.equal(ev('ballExperiment.throws.length'),40);assert(ev('ballExperiment.throws.slice(20).every(r=>r.player===2)'));
assert.deepEqual(errors,[]);dom.window.close();console.log('OK: автоматический подбор, случайные броски и границы участников');
