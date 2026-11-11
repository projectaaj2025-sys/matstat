import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import assert from 'node:assert/strict';
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!String(e.message).includes('Not implemented'))errors.push(e.message)});
const dom=new JSDOM(readFileSync(process.argv[2]||'index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/#law-of-large-numbers/lab',beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;}});
const w=dom.window;await new Promise(r=>setTimeout(r,1000));const ev=x=>w.eval(x),doc=w.document;
// Spread is set before a series, used for every throw, locked while records exist, and saved.
assert.equal(ev('ballExperiment.spread'),1.3);doc.getElementById('ball-spread').value='1.8';ev('ballChangeSpread()');assert.equal(ev('ballExperiment.spread'),1.8);
assert(ev('Math.abs(ballTrajectory(50,50,()=>0,1.8).vx) > Math.abs(ballTrajectory(50,50,()=>0,0.8).vx)'));
w.requestAnimationFrame=cb=>cb(w.performance.now()+1000);ev('throwBall()');assert(doc.getElementById('ball-spread').disabled);assert.equal(ev('ballExperiment.throws[0].spread'),1.8);ev('resetBallExperiment()');assert(!doc.getElementById('ball-spread').disabled);assert.equal(ev('ballExperiment.spread'),1.8);
// The coin uses its specified p, not a forced proportion of heads.
ev('llnState.p=0');ev('runLLN(true,20)');assert.equal(ev('llnState.values.length'),20);assert.equal(ev('llnState.heads'),0);ev('llnState.p=1; clearLLN(); runLLN(true,20)');assert.equal(ev('llnState.heads'),20);ev('runLLN(true,1)');assert.equal(ev('llnState.values.length'),21);
// Random data are opt-in, confirmed, displayed and are the data sent to CSV.
const panel=doc.getElementById('topic-panel');ev('renderOrderedSeriesLab')(panel);const input=doc.getElementById('ordered-data'),original=input.value;w.confirm=()=>false;ev("randomLabData('ordered')");assert.equal(input.value,original);
w.confirm=()=>true;const originalRandom=w.Math.random;w.Math.random=()=>.2;ev("randomLabData('ordered')");assert.equal(input.value,'3; 3; 3; 3; 3; 3; 3; 3; 3; 3');assert.equal(ev('labState.csv.length'),10);assert(ev('labState.csv.every(r=>r[1]===3)'));
ev('renderTendencyLab')(panel);ev("randomLabData('tendency')");assert.equal(doc.getElementById('tend-outlier').value,'15');assert.equal(ev('labState.csv.at(-1)'),15);
const lesson=ev("SECTIONS.find(s=>s.id==='mathematical-statistics-introduction')");ev('renderSeriesLab')(lesson,panel);ev("randomLabData('series')");assert.equal(ev('labState.data.length'),10);assert(ev('labState.csv.every(x=>x===3)'));
ev('renderProbabilityLab')(panel);ev('runUrn(1)');w.confirm=()=>false;ev('randomUrn()');assert.equal(ev('urnState.rows.length'),1);w.confirm=()=>true;ev('randomUrn()');assert.equal(doc.getElementById('urn-red').value,'3');assert.equal(doc.getElementById('urn-blue').value,'3');assert.equal(ev('urnState.rows.length'),0);assert(doc.getElementById('urn-result').textContent.includes('0,25'));
w.Math.random=originalRandom;assert.deepEqual(errors,[]);dom.window.close();console.log('OK: разброс бросков, вероятности монеты и случайные учебные наборы');
