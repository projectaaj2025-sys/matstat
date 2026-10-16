import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'promo', '_screens');
const BASE = process.env.STATPRACTICUM_URL || 'http://127.0.0.1:4173/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await fs.mkdir(OUT, {recursive: true});

/* The bundled Lambda Chromium also ships the NSS libraries it needs. In this
   Debian sandbox they are extracted manually once and then loaded via
   LD_LIBRARY_PATH by the command that launches this script. */
try {
  const {inflate} = await import('@sparticuz/chromium');
  await inflate(path.join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin', 'al2023.tar.br'));
} catch (_) {
  // The directory may already exist from a previous run.
}

const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  headless: true,
  args: [...chromium.args, '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({width: 1600, height: 900, deviceScaleFactor: 1});
page.on('console', msg => {
  if (msg.type() === 'error') console.error('[browser]', msg.text());
});
page.on('pageerror', err => console.error('[page]', err.message));

async function settle(ms = 450) {
  await wait(ms);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function go(hash, selector = '.page') {
  await page.evaluate(value => { location.hash = value; }, hash);
  await page.waitForSelector(selector, {timeout: 120000});
  await settle();
}

async function shot(name) {
  await page.screenshot({path: path.join(OUT, `${name}.png`), type: 'png'});
  console.log(name);
}

async function shotAt(name, selector, offset = 100) {
  const y = await page.$eval(selector, (node, before) => Math.max(0, node.getBoundingClientRect().top + window.scrollY - before), offset);
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - 900));
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    type: 'png',
    clip: {x: 0, y: Math.min(y, maxY), width: 1600, height: 900},
    captureBeyondViewport: true,
  });
  console.log(name);
}

async function top() {
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await settle(160);
}

await page.goto(BASE + '#home', {waitUntil: 'load', timeout: 120000});
await page.waitForSelector('.hero', {timeout: 120000});

/* Seed a realistic-looking local profile. This is presentation data only and
   remains inside the isolated capture browser. */
await page.evaluate(() => {
  try {
    for (const key of Object.keys(progress.solved)) delete progress.solved[key];
    for (const key of Object.keys(progress.attempts)) delete progress.attempts[key];
    allTasks.slice(0, 84).forEach((task, index) => {
      progress.solved[task.id] = true;
      progress.attempts[task.id] = index % 9 === 0 ? 3 : 1;
    });
    allTasks.slice(84, 102).forEach((task, index) => {
      progress.attempts[task.id] = 2 + (index % 3);
    });
    progress.settings = {showSolutions: false, autoGrade: true, solutionAttempts: 3, passShare: .8};
    progress.visited = Object.fromEntries(SECTIONS.slice(0, 9).map(s => [s.id, true]));
    progress.name = 'Ученик 10А';
    persist();
    renderRoute();
  } catch (error) {
    console.error(error);
  }
});
await top();
await shot('01-home');

await go('#central-tendency', '.topic-head');
await top();
await shot('02-theory');

await go('#central-tendency/practice', '.task-card');
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.task-card')];
  const card = cards.find(node => {
    const task = taskMap[node.dataset.task];
    return task && ['number', 'graph', 'single', 'multi', 'table', 'match'].includes(task.type);
  });
  if (!card) return;
  const task = taskMap[card.dataset.task];
  const controls = [...card.querySelectorAll('[data-answer]')];
  if (task.type === 'number' || task.type === 'graph') controls[0].value = String(task.answer).replace('.', ',');
  if (task.type === 'single') controls[Number(task.answer)].checked = true;
  if (task.type === 'multi') task.answer.forEach(i => { if (controls[i]) controls[i].checked = true; });
  if (task.type === 'table' || task.type === 'match') task.answer.forEach((answer, i) => { if (controls[i]) controls[i].value = answer; });
  checkTask(card.id.slice(5));
  card.scrollIntoView({block: 'start'});
  window.scrollBy(0, -102);
});
await settle();
await shot('03-practice-check');

await go('#research-tasks/lab', '#research-lab');
await page.evaluate(() => {
  selectResearch('roulette');
  const n = document.getElementById('roulette-n');
  if (n) n.value = '1000';
  const p = document.getElementById('roulette-prediction');
  if (p) p.value = '-2,7';
  runRouletteBatch();
  document.getElementById('roulette-panel')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -120);
});
await settle(700);
await shot('04-roulette-lab');

await go('#pisa-tests/practice', '#task-list');
await page.evaluate(() => {
  const contexts = [...document.querySelectorAll('.context-head')];
  const real = contexts.find(node => node.textContent.includes('Данные Казахстана')) || contexts[0];
  real?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -102);
});
await settle();
await shot('05-pisa-data');

await go('#bank', '#bank-list');
await page.evaluate(() => {
  bankOpenId = 'situation-09';
  renderBankList();
  document.getElementById('problem-situation-09')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -154);
});
await settle();
await shot('06-bank-open');
await shotAt('06b-bank-detail', '#problem-situation-09', 110);

await go('#search', '.search-bar');
await page.evaluate(() => {
  spSearchState.q = 'дисперсия';
  spSearchState.level = 'Применение';
  spSearchState.status = 'all';
  spRenderSearch();
  window.scrollTo({top: 0, behavior: 'instant'});
});
await settle();
await shot('07-search');

await go('#trainer/all', '.trainer-head');
await top();
await shot('08-trainer');

await go('#exam', '#exam-section');
await top();
await shot('09-exam-builder');

await page.evaluate(() => {
  spExamStart({section: 'all', count: 5, minutes: 20, open: false});
});
await page.waitForSelector('.exam-head', {timeout: 30000});
await top();
await shot('10-exam-run');

await page.evaluate(() => {
  spExam.ids.forEach((id, index) => {
    const task = taskMap[id];
    if (!task) return;
    if (index < 3) spExam.answers[id] = Array.isArray(task.answer) ? task.answer.slice() : task.answer;
    else spExam.answers[id] = task.type === 'multi' || task.type === 'table' || task.type === 'match' || task.type === 'order' ? [] : '__неверно__';
  });
  spExamSubmit(true);
});
await page.waitForSelector('.exam-result', {timeout: 30000});
await top();
await shot('11-exam-result');

await go('#progress', '.progress-overview');
await top();
await shot('12-progress');

await go('#ai', '.ai-page');
await top();
await shot('13-ai-page');
await shotAt('13b-ai-api-settings', '#ai-enabled', 190);

await page.evaluate(() => {
  aiDrawerOpen({kind: 'topic', section: SECTIONS.find(s => s.id === 'variance-std') || SECTIONS[0]});
  const input = document.getElementById('ai-drawer-question');
  if (input) input.value = 'Как найти дисперсию и проверить ответ?';
  aiDrawerSend();
});
await settle(900);
await shot('14-ai-drawer');
await page.evaluate(() => aiDrawerClose());

await go('#teacher/lesson', '.teacher-profile');
await page.evaluate(() => {
  document.querySelector('.teacher-profile')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -100);
});
await settle();
await shot('15-teacher-profile');

await page.evaluate(() => {
  document.getElementById('teacher-panel')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -105);
});
await settle();
await shot('16-teacher-plan');
await shotAt('16b-teacher-plan-detail', '#teacher-panel', 100);

await go('#teacher/materials', '#teacher-panel');
await page.evaluate(() => {
  document.getElementById('teacher-panel')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -105);
});
await settle();
await shot('17-teacher-upload');
await shotAt('17b-teacher-upload-detail', '#teacher-panel', 100);

await go('#materials', '.library-page');
await top();
await shot('18-library');

await go('#reflection', '.reflection-page');
await top();
await shot('19-reflection');

await go('#research-tasks/lab', '#research-lab');
await page.evaluate(() => {
  selectResearch('project');
  document.getElementById('research-lab')?.scrollIntoView({block: 'start'});
  window.scrollBy(0, -105);
});
await settle();
await shot('20-project');

await go('#home', '.hero');
await page.evaluate(() => setLanguage('en'));
await page.waitForSelector('.hero');
await top();
await shot('21-home-en');

await page.evaluate(() => setLanguage('kk'));
await page.waitForSelector('.hero');
await top();
await shot('22-home-kk');

await browser.close();
console.log(`Saved to ${OUT}`);
