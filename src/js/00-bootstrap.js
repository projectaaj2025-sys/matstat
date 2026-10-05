'use strict';
const COURSE_SOURCE=document.getElementById('course-data').textContent;
// Course content is translated from the data itself, so a sentence with a formula inside
// is translated as one whole sentence. The Russian original always stays in COURSE_BASE.
const COURSE_BASE=JSON.parse(COURSE_SOURCE);
let COURSE=COURSE_BASE;
let SECTIONS=COURSE.sections;
const INITIAL_MATERIALS=JSON.parse(document.getElementById('material-data').textContent);
let materials=[...INITIAL_MATERIALS];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let LOCALE_TAG='ru-RU';
const fmt=(v,n=3)=>Number.isFinite(Number(v))?Number(v).toLocaleString(LOCALE_TAG,{maximumFractionDigits:n}):'—';
const fmtP=v=>fmt(v*100,2)+'%';
const ico=(name,cls='')=>`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${({chart:'<path d="M4 4v16h16M7 15l4-5 4 3 5-8"/>',book:'<path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1zM12 5v16"/>',pen:'<path d="M4 20l1-5L16 4a2 2 0 013 3L8 18l-4 2zM14 6l3 3"/>',flask:'<path d="M9 3h6M10 3v7l-6 9a1 1 0 001 2h14a1 1 0 001-2l-6-9V3M8 15h8"/>',slides:'<path d="M3 4h18v13H3zM12 17v4M8 21h8M7 12l3-4 4 3 3-5"/>',arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',check:'<path d="M5 12l4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',download:'<path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"/>',file:'<path d="M5 3h12l3 3v15H5zM17 3v4h3M8 11h9M8 15h6"/>',external:'<path d="M14 3h7v7M21 3l-9 9M10 4H4v16h16v-6"/>',heart:'<path d="M20 5a5 5 0 00-8 2 5 5 0 00-8-2c-5 5 2 11 8 15 6-4 13-10 8-15z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',moon:'<path d="M20 14A8.5 8.5 0 1110 4a7 7 0 0010 10z"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="M8 3l-2 6 6 4 6-4-2-6M3 14l6 2 3 5 3-5 6-2M9 16l3-3 3 3"/>',leaf:'<path d="M5 19C-2 4 11 2 21 3c0 13-6 18-16 16zM4 21L17 8"/>',home:'<path d="M3 11l9-8 9 8M5 9v12h5v-7h4v7h5V9"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',up:'<path d="M6 14l6-6 6 6"/>',down:'<path d="M6 10l6 6 6-6"/>',upload:'<path d="M12 17V3M7 8l5-5 5 5M4 16v5h16v-5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',dice:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>'})[name]||'<circle cx="12" cy="12" r="8"/>'}</svg>`;
const FORMAT={number:'Числовой ответ',single:'Один вариант',multi:'Несколько вариантов',table:'Заполнение таблицы',match:'Соответствие',order:'Порядок действий',graph:'Чтение графика',open:'Открытый ответ'};
let route={id:'home',tab:'theory'}, lastTopic='intro-stats', teacherTopic='intro-stats';
let storageOK=true;
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(e){storageOK=false;return fallback}}
const EMPTY_PROGRESS=()=>({solved:{},answers:{},attempts:{},openReplies:{},reviews:{},visited:{},name:'',studentId:'',updated:0});
let progress=Object.assign(EMPTY_PROGRESS(),readStore('statpracticum-v2-progress',{}));
for(const k of ['solved','answers','attempts','openReplies','reviews','visited'])progress[k]=progress[k]||{};
function persist(){progress.updated=Date.now();try{localStorage.setItem('statpracticum-v2-progress',JSON.stringify(progress))}catch(e){storageOK=false}}
function math(root){if(!root)return;renderMathInElement(root,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false}],throwOnError:false,strict:false,trust:false,ignoredClasses:['no-math']})}
function F(tex,display=false){return `<span class="${display?'formula-block':'math-inline'}">${display?'$$':'$'}${esc(tex)}${display?'$$':'$'}</span>`}
let BANK_PROBLEMS=COURSE.bankProblems||[];
const bankTitle=()=>`Банк задач (${BANK_PROBLEMS.length})`;
let BANK_TASKS,allTasks,taskMap,total;
function rebuildDerived(){BANK_TASKS=BANK_PROBLEMS.flatMap(p=>p.tasks.map(t=>({...t,sectionId:'bank',sectionTitle:`Банк задач · № ${p.displayNumber} · ${p.title}`})));allTasks=[...SECTIONS.flatMap(s=>s.tasks.map(t=>({...t,sectionId:s.id,sectionTitle:s.title}))),...BANK_TASKS];taskMap=Object.fromEntries(allTasks.map(t=>[t.id,t]));total=allTasks.length}
// Keys whose values are identifiers or machine data and must never be translated.
const LOCALIZE_SKIP=new Set(['id','sectionId','problemId','context','sourceId','newIn','type','kind','mime','url','answer','acceptedAnswers','tolerance','displayNumber','number','minutes','pages','size','retrieved','period','i18n','style']);
let CONTENT={};
function localizeNode(node,key){
 if(Array.isArray(node))return node.map(x=>localizeNode(x,key));
 if(node&&typeof node==='object'){const out={};for(const k in node)out[k]=localizeNode(node[k],k);return out}
 if(typeof node==='string'&&!LOCALIZE_SKIP.has(key)){const t=CONTENT[node];if(typeof t==='string'&&t)return t}
 return node;
}
function applyContentLanguage(lang){
 CONTENT=((COURSE_BASE.i18n||{}).content||{})[lang]||{};
 LOCALE_TAG=({ru:'ru-RU',en:'en-US',kk:'kk-KZ'})[lang]||'ru-RU';
 const untranslated=lang==='ru'||!Object.keys(CONTENT).length;
 COURSE=untranslated?COURSE_BASE:localizeNode(JSON.parse(COURSE_SOURCE),'');
 SECTIONS=COURSE.sections;BANK_PROBLEMS=COURSE.bankProblems||[];rebuildDerived();
}
rebuildDerived();
if(progress.openReplies['method-03-1']||typeof progress.answers['method-03-1']==='string'){for(const k of ['solved','answers','openReplies','reviews'])delete progress[k]['method-03-1'];persist()}
