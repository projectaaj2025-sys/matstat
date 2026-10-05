const MESSAGES=[
 {label:'Малый шаг',title:'Начни с одного небольшого шага',text:'Большая задача становится понятнее, когда разделена на части.',action:'Выбери один пункт, который можешь выполнить сейчас.'},
 {label:'Ошибка',title:'Ошибка может подсказать следующий шаг',text:'Неудачная попытка не определяет твои способности. Найди место, где рассуждение изменилось.',action:'Отметь один шаг для повторной проверки.'},
 {label:'Пауза',title:'Дай себе короткую паузу',text:'Не обязательно решать всё без остановки. Иногда полезно вернуться к условию свежим взглядом.',action:'Передохни и снова прочитай вопрос задачи.'},
 {label:'Вопрос',title:'Хороший вопрос — часть решения',text:'Если что-то непонятно, можно уточнить. Это не слабость, а способ учиться.',action:'Сформулируй один точный вопрос учителю или однокласснику.'},
 {label:'Прогресс',title:'Заметь свой сегодняшний прогресс',text:'Даже небольшое новое понимание имеет значение.',action:'Назови одну вещь, которую сегодня понял лучше.'},
 {label:'Условие',title:'Вернись к условию, а не к догадке',text:'Спокойная проверка данных иногда полезнее быстрого ответа.',action:'Отдели известные данные от того, что нужно найти.'},
 {label:'Объясни',title:'Попробуй объяснить своими словами',text:'Понимание укрепляется, когда ты можешь рассказать ход рассуждения.',action:'Объясни один шаг без чтения готового решения.'},
 {label:'Сравни',title:'Другой путь может помочь',text:'Одну задачу иногда можно увидеть через таблицу, рисунок или формулу.',action:'Попробуй представить данные ещё одним способом.'},
 {label:'Поддержка',title:'Можно попросить поддержку',text:'Учиться вместе — нормально. Важно не просто получить ответ, а понять его.',action:'Попроси подсказку к шагу, а не готовый результат.'},
 {label:'Проверь',title:'Проверка — твой помощник',text:'Единицы, знак и знаменатель часто подсказывают, правдоподобен ли ответ.',action:'Проверь одну из этих трёх вещей в своей работе.'},
 {label:'Терпение',title:'Не сравнивай свой темп с чужим',text:'Разным людям нужно разное время для нового понятия.',action:'Выбери реалистичный следующий шаг без спешки.'},
 {label:'Вывод',title:'Заверши мысль собственным выводом',text:'Число становится полезным, когда ты понимаешь, что оно означает.',action:'Допиши фразу: «Мой результат означает, что…».'}
];
let encouragementAngle=0,encouragementBusy=false,encouragementTimer=null,reflectionMode=readStore('statpracticum-reflection-mode','encouragement')==='lesson4'?'lesson4':'encouragement',lessonReflectionAngle=0;
function encouragementWheel(){const n=MESSAGES.length,R=165,ri=82,center=180,colors=['#138675','#2b6f82','#9c734b','#547965'],point=(r,a)=>`${center+r*Math.cos(a)},${center+r*Math.sin(a)}`;return `<svg class="encouragement-wheel" viewBox="0 0 360 360" role="img" aria-label="Рулетка из 12 поддерживающих напутствий"><title>Рулетка напутствий для завершения урока</title><circle cx="180" cy="180" r="175" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/><g id="encouragement-rotor" style="transform-origin:180px 180px;transform:rotate(${encouragementAngle}deg)">${MESSAGES.map((m,i)=>{const a=(i-.5)*2*Math.PI/n-Math.PI/2,b=(i+.5)*2*Math.PI/n-Math.PI/2,c=i*2*Math.PI/n-Math.PI/2,x=center+121*Math.cos(c),y=center+121*Math.sin(c);return `<path d="M ${point(R,a)} A ${R} ${R} 0 0 1 ${point(R,b)} L ${point(ri,b)} A ${ri} ${ri} 0 0 0 ${point(ri,a)} Z" fill="${colors[i%colors.length]}" stroke="#fff" stroke-width="1.2"/><text x="${x}" y="${y}" transform="rotate(${i*360/n},${x},${y})" text-anchor="middle" dominant-baseline="central" font-size="9.5" fill="#fff" font-weight="700">${esc(m.label)}</text>`}).join('')}</g><circle cx="180" cy="180" r="77" fill="var(--surface)"/><text x="180" y="170" text-anchor="middle" fill="var(--accent-dark)" font-size="15" font-weight="800">Следующий</text><text x="180" y="194" text-anchor="middle" fill="var(--accent-dark)" font-size="15" font-weight="800">шаг</text><path d="M168 6 L192 6 L180 27 Z" fill="var(--orange)" stroke="#fff" stroke-width="1"/></svg>`}
// The wheel suggests a question; classroom votes are added only by an explicit click.
const LESSON_REFLECTION={
 red:{
  colorName:'Красное',label:'всё понятно',title:'Красное (всё понятно)',
  questionText:'Какую разницу между распределениями ты можешь объяснить своими словами?',
  text:'Я понял и могу объяснить разницу между распределениями.'
 },
 black:{
  colorName:'Чёрное',label:'есть вопросы',title:'Чёрное (есть вопросы)',
  questionText:'Что ты понял, а что нужно перечитать или уточнить?',
  text:'В целом понял, но путаюсь и надо прочитать всё ещё раз.'
 },
 zero:{
  colorName:'Зеро',label:'ничего не понял',title:'Зеро (ничего не понял)',
  questionText:'Зачем нужны статистика и вероятности, даже если исходы случайны?',
  text:'Зачем нужны эти статистики и вероятности, если в жизни всё равно всё случайно, — ничего не понял.'
 }
};
const KNOWLEDGE_VOTE_KEY='statpracticum-knowledge-votes';
const emptyKnowledgeVotes=()=>({red:0,black:0,zero:0});
function readKnowledgeVotes(){
 const raw=readStore(KNOWLEDGE_VOTE_KEY,{}),votes=emptyKnowledgeVotes();
 for(const id of Object.keys(votes)){
  const n=raw&&typeof raw==='object'?raw[id]:null;
  votes[id]=Number.isSafeInteger(n)&&n>=0&&n<=1000000000?n:0;
 }
 return votes;
}
let knowledgeVotes=readKnowledgeVotes();
function knowledgeVoteTotal(){return knowledgeVotes.red+knowledgeVotes.black+knowledgeVotes.zero}
function knowledgeVoteHint(){return storageOK
 ?'Голоса сохраняются только в этом браузере. Это локальный счётчик, а не общий онлайн-опрос: голоса с других устройств не суммируются. Сброс очищает только голоса — заметка и учебный прогресс остаются.'
 :'Браузер ограничил локальное хранилище: счётчик работает только до перезагрузки или закрытия этой страницы. Это не общий онлайн-опрос; голоса с других устройств не суммируются. Сброс очищает только голоса.'}
function setReflectionMode(mode){
 reflectionMode=mode==='lesson4'?'lesson4':'encouragement';
 try{localStorage.setItem('statpracticum-reflection-mode',JSON.stringify(reflectionMode))}catch(e){storageOK=false}
 renderReflection();
}
function knowledgeAssessmentHtml(){
 const total=knowledgeVoteTotal();
 return `<section class="card lesson-self-assessment" aria-labelledby="knowledge-assessment-heading">
  <div class="knowledge-heading">
   <div><span class="eyebrow">ЦВЕТ ВЫБИРАЕТ УЧЕНИК</span><h3 id="knowledge-assessment-heading">Самооценка класса</h3></div>
   <div class="knowledge-summary"><span class="knowledge-total">Всего голосов: <strong id="knowledge-total">${fmt(total,0)}</strong></span><button class="btn danger sm" id="reset-knowledge-votes" onclick="resetKnowledgeVotes()" ${total?'':'disabled'}>${ico('trash')} Сбросить голоса</button></div>
  </div>
  <p class="assessment-instruction">Каждый ученик выбирает своё состояние после урока. Собирайте голоса по очереди на одном устройстве или вводите их как учитель: <strong>один клик — один голос</strong>. Повторное нажатие добавляет новый голос, а не меняет предыдущий.</p>
  <div class="assessment-options" role="group" aria-label="Добавление голосов по трём цветам">${Object.entries(LESSON_REFLECTION).map(([id,item])=>{
   const share=total?knowledgeVotes[id]/total:0;
   return `<article class="assessment-card ${id}">
    <div class="assessment-heading"><span class="assessment-dot" aria-hidden="true"></span><h4>${esc(item.title)}</h4></div>
    <p class="assessment-explanation" id="assessment-help-${id}">${esc(item.text)}</p>
    <div class="assessment-vote-footer">
     <div class="assessment-vote-stats"><div class="assessment-vote-count"><span>Голоса:</span> <strong id="knowledge-count-${id}">${fmt(knowledgeVotes[id],0)}</strong></div><span class="assessment-share" id="knowledge-share-${id}">${fmtP(share)} от всех</span></div>
     <div class="assessment-share-track" aria-hidden="true"><span id="knowledge-bar-${id}" style="width:${share*100}%"></span></div>
     <button class="btn assessment-choice ${id}" data-assessment="${id}" aria-label="Добавить голос: ${item.colorName} — ${esc(item.label)}" aria-describedby="assessment-help-${id}" onclick="chooseLessonAssessment('${id}')">+ Голос за ${id==='red'?'красное':id==='black'?'чёрное':'зеро'}</button>
    </div>
   </article>`;
  }).join('')}</div>
  <p id="assessment-description" class="assessment-status" role="status" aria-live="polite" aria-atomic="true">${total?'Можно добавить голос следующего ученика.':'Пока нет голосов. Выберите цвет самостоятельно — колесо не голосует за вас.'}</p>
  <p class="control-hint" id="knowledge-storage-hint">${knowledgeVoteHint()}</p>
 </section>`;
}
function renderReflection(){
 clearTimeout(encouragementTimer);encouragementBusy=false;
 const lesson=reflectionMode==='lesson4';
 $('main-content').innerHTML=`<div class="page reflection-page">
  ${pageTop('Рефлексия')}<span class="eyebrow">ЗАВЕРШЕНИЕ УРОКА · ${lesson?'ОСМЫСЛЕНИЕ И САМООЦЕНКА':'ПОДДЕРЖКА'}</span>
  <h1>${lesson?'Рефлексия «Европейская рулетка»':'Рулетка напутствий'}</h1>
  <nav class="reflection-modes" aria-label="Вариант рефлексии"><button class="btn ${lesson?'':'primary'}" data-reflection-mode="encouragement" onclick="setReflectionMode('encouragement')">Напутствие и мотивация</button><button class="btn ${lesson?'primary':''}" data-reflection-mode="lesson4" onclick="setReflectionMode('lesson4')">Европейская рулетка</button></nav>
  <p class="page-description">${lesson?'Красное, чёрное и зеро помогают осмыслить урок. Колесо предлагает случайный вопрос, но не оценивает знания и не добавляет голос. Каждый ученик сам выбирает цвет своей самооценки в карточках ниже.':'Крутите колесо, получите короткое напутствие и выберите один следующий шаг. Здесь нет выигрышей, проигрышей или оценки знаний.'}</p>
  <div class="encouragement-layout">
   <section class="card encouragement-visual">
    ${lesson?rouletteWheel(lessonReflectionAngle,'lesson-reflection-rotor'):encouragementWheel()}
    <button class="btn primary" id="encouragement-spin" onclick="spinEncouragement()">${lesson?'Крутить и получить вопрос':'Крутить и получить напутствие'}</button>
    <p class="small muted">${lesson?'Случайный цвет задаёт вопрос, а не объявляет, что вы всё или ничего поняли. Никаких ставок и денег.':'Выбор случайный. Это не предсказание будущего и не характеристика ваших способностей.'}</p>
    ${lesson?`<button class="btn ghost sm" style="margin-top:10px" onclick="openMaterial('lesson4',25)">Слайд 25</button>`:''}
   </section>
   <section class="card encouragement-message" id="encouragement-result" aria-live="polite"><span class="pill green">${lesson?'Вопрос для осмысления':'Ваш следующий шаг'}</span><h2>Как завершить урок?</h2><p>${lesson?'Получите вопрос и ответьте по своей работе. После этого выберите подходящий цвет и добавьте свой голос в самооценке класса.':'Нажмите кнопку колеса. Напутствие поможет выбрать небольшое действие, а не заменит ваш собственный вывод.'}</p></section>
  </div>
  ${lesson?knowledgeAssessmentHtml():''}
  <section class="card reflection-notes"><h3>Моя короткая рефлексия</h3><p>Что получилось? Что осталось непонятным? Что я попробую дальше?</p><label class="small muted" for="reflection-note">Заметка для себя</label><textarea id="reflection-note" rows="4" maxlength="3000" placeholder="Сегодня я понял… Следующий шаг…" oninput="saveReflectionNote(this.value)">${esc(readStore('statpracticum-reflection-note',''))}</textarea><p class="control-hint">Заметка хранится только в вашем браузере, если хранилище доступно.</p><div class="row wrap"><button class="btn" onclick="openResearch('project')">${ico('flask')} Продолжить свой проект</button><button class="btn ghost" onclick="go('home')">Обзор курса</button></div></section>
  ${footer()}</div>`;
}
function updateKnowledgeVotes(message){
 if(!$('knowledge-total'))return;
 const total=knowledgeVoteTotal();$('knowledge-total').textContent=fmt(total,0);
 for(const id of Object.keys(LESSON_REFLECTION)){
  const share=total?knowledgeVotes[id]/total:0;
  $('knowledge-count-'+id).textContent=fmt(knowledgeVotes[id],0);
  $('knowledge-share-'+id).textContent=fmtP(share)+' от всех';
  $('knowledge-bar-'+id).style.width=share*100+'%';
 }
 $('reset-knowledge-votes').disabled=total===0;
 $('knowledge-storage-hint').textContent=knowledgeVoteHint();
 if(message)$('assessment-description').textContent=message;
}
function persistKnowledgeVotes(){
 try{localStorage.setItem(KNOWLEDGE_VOTE_KEY,JSON.stringify(knowledgeVotes))}catch(e){storageOK=false}
}
function chooseLessonAssessment(id){
 if(!Object.prototype.hasOwnProperty.call(LESSON_REFLECTION,id))return;
 if(storageOK)knowledgeVotes=readKnowledgeVotes();
 if(knowledgeVotes[id]>=1000000000){updateKnowledgeVotes('Достигнут предел счётчика. Начните новый сбор голосов после сброса.');return}
 knowledgeVotes[id]++;persistKnowledgeVotes();
 updateKnowledgeVotes(`Добавлен голос: ${LESSON_REFLECTION[id].colorName}. Всего голосов: ${fmt(knowledgeVoteTotal(),0)}.`);
}
function resetKnowledgeVotes(){
 knowledgeVotes=emptyKnowledgeVotes();persistKnowledgeVotes();
 updateKnowledgeVotes('Все голоса сброшены. Можно начать новую самооценку класса. Заметка и учебный прогресс сохранены.');
}
window.addEventListener('storage',event=>{
 if(event.key===KNOWLEDGE_VOTE_KEY){knowledgeVotes=readKnowledgeVotes();updateKnowledgeVotes('Счётчик обновлён в другой вкладке этого браузера.');}
});
function saveReflectionNote(text){try{localStorage.setItem('statpracticum-reflection-note',JSON.stringify(text))}catch(e){storageOK=false}}
function encouragementDraw(){return Math.floor(Math.random()*MESSAGES.length)}
function spinEncouragement(){const lesson=reflectionMode==='lesson4',rotor=$(lesson?'lesson-reflection-rotor':'encouragement-rotor');if(encouragementBusy||!rotor)return;encouragementBusy=true;$('encouragement-spin').disabled=true;const i=lesson?Math.floor(Math.random()*37):encouragementDraw(),n=lesson?37:MESSAGES.length,goal=(360-i*360/n)%360,angle=lesson?lessonReflectionAngle:encouragementAngle,current=((angle%360)+360)%360,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,next=angle+(reduced?0:4*360)+(goal-current+360)%360;if(lesson)lessonReflectionAngle=next;else encouragementAngle=next;rotor.style.transition=reduced?'none':'transform 1.5s cubic-bezier(.15,.7,.15,1)';rotor.style.transform=`rotate(${next}deg)`;encouragementTimer=setTimeout(()=>{if(!$('encouragement-result')||lesson!==(reflectionMode==='lesson4'))return;const number=lesson?EURO_ORDER[i]:null,color=lesson?rouletteColor(number):null,m=lesson?LESSON_REFLECTION[color]:MESSAGES[i];$('encouragement-result').innerHTML=`<span class="pill green">${lesson?rouletteColorName(number)+' · вопрос': 'Напутствие'}</span>${lesson?`<span class="roulette-ball ${color}" style="margin-top:15px">${number}</span>`:''}<h2>${esc(lesson?m.colorName+': вопрос для размышления':m.title)}</h2><p>${esc(lesson?m.questionText:m.text)}</p>${lesson?'':`<div class="encouragement-action"><span class="caps">Небольшое действие</span><p>${esc(m.action)}</p></div>`}`;encouragementBusy=false;$('encouragement-spin').disabled=false},reduced?0:1530)}

let currentProjectStats=null;
const PROJECT_KEY='statpracticum-project-v31';
function projectIdeas(){return SECTIONS.find(s=>s.id==='research-tasks').projectIdeas||[]}
function projectSnapshot(){return {topic:$('project-topic').value,question:$('project-question').value,units:$('project-units').value,method:$('project-method').value,data:$('project-data').value,conclusion:$('project-conclusion').value}}
function saveProject(){if(!$('project-topic'))return;try{localStorage.setItem(PROJECT_KEY,JSON.stringify(projectSnapshot()))}catch(e){storageOK=false}}
function renderProjectLab(panel){const ideas=projectIdeas(),saved=readStore(PROJECT_KEY,{topic:ideas[0]?.id||'queue',question:'',units:'',method:'',data:'',conclusion:''}),idea=ideas.find(x=>x.id===saved.topic)||ideas[0];currentProjectStats=null;labState={kind:'own-project',csv:[]};panel.innerHTML=labHead('Мой самостоятельный проект','Выберите тему или сформулируйте свою. Введите собственные анонимные наблюдения, изучите числовые характеристики и напишите вывод. Объём сам по себе не задаёт распределение.')+`<section class="card project-form"><div class="grid2"><div class="control-field"><label for="project-topic">Вариант темы</label><select id="project-topic" onchange="chooseProject(this.value)">${ideas.map(p=>`<option value="${p.id}" ${idea.id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}<option value="own" ${saved.topic==='own'?'selected':''}>Своя тема</option></select></div><div class="control-field"><label for="project-units">Единицы X</label><input id="project-units" maxlength="60" value="${esc(saved.units||idea.units)}" oninput="saveProject()"></div></div><div id="project-idea" class="project-idea-detail"></div><label class="small muted" for="project-question">Мой исследовательский вопрос</label><textarea id="project-question" rows="2" maxlength="1200" oninput="saveProject()">${esc(saved.question||idea.question)}</textarea><label class="small muted" for="project-method">Совокупность, способ отбора и одинаковые условия измерений</label><textarea id="project-method" rows="3" maxlength="3000" oninput="saveProject()" placeholder="Кого или что наблюдаем? Как выбираем? Есть ли зависимости, смещение и согласие участников?">${esc(saved.method)}</textarea><label class="small muted" for="project-data">Мои наблюдения · точка с запятой или пробел</label><textarea id="project-data" rows="4" maxlength="50000" oninput="saveProject();clearProjectResult()" placeholder="Например: 1,5; 2; 2,5. Вставьте собственные данные, не фамилии.">${esc(saved.data)}</textarea><p class="control-hint">До 2000 числовых наблюдений. Для проекта обычно полезны 25–40, если это уместно. Число 25 из условия столовой без самих данных не позволяет построить графики.</p><div class="row wrap"><button class="btn primary" onclick="calculateProject()">Исследовать мои данные</button><button class="btn" onclick="exportLab()">${ico('download')} CSV наблюдений</button><button class="btn ghost" onclick="saveProjectReport()">Скачать отчёт</button></div><div id="project-error" class="lab-result-error" aria-live="polite"></div></section><div id="project-results"></div><section class="card project-conclusion"><h3>Мой вывод</h3><label class="small muted" for="project-conclusion">Что означает среднее и разброс? Что можно и нельзя заключить?</label><textarea id="project-conclusion" rows="5" maxlength="6000" oninput="saveProject()" placeholder="Данные показывают… Разброс означает… Ограничение моего исследования…">${esc(saved.conclusion)}</textarea><p class="small muted">Если у вас есть теоретический закон, его M,D,σ рассчитываются отдельно. Эмпирические показатели одной выборки не являются автоматически точными параметрами совокупности.</p><a class="btn ghost" href="#advanced-variation-series/lab">Интервальная группировка · дополнительная тема 11 класса</a></section>`;updateProjectIdea(saved.topic||idea.id);if(saved.data.trim())calculateProject()}
function updateProjectIdea(id){const p=projectIdeas().find(p=>p.id===id);$('project-idea').innerHTML=p?`<p><strong>X:</strong> ${esc(p.variable)} · ${esc(p.type)}</p><p><strong>Данные:</strong> ${esc(p.collection)}</p><p><strong>Характеристики:</strong> ${esc(p.compare)}</p>`:'<p>Укажите свой вопрос, случайную величину, единицы и способ наблюдения.</p>'}
function chooseProject(id){const idea=projectIdeas().find(p=>p.id===id);if(idea){$('project-question').value=idea.question;$('project-units').value=idea.units}updateProjectIdea(id);saveProject();clearProjectResult()}
function clearProjectResult(){currentProjectStats=null;if($('project-results'))$('project-results').innerHTML='';if(labState?.kind==='own-project')labState.csv=[]}
function calculateProject(){try{const data=parseDataset($('project-data').value),st=basicStats(data),units=$('project-units').value.trim();st.sd=Math.sqrt(st.variance);currentProjectStats={...st,data,units};labState={kind:'own-project',csv:data.map((v,i)=>[i+1,v]),csvHeaders:['Номер наблюдения',units?'X, '+units:'X']};$('project-error').textContent='';const every=Math.max(1,Math.ceil(st.n/450)),xs=[],ys=[];data.forEach((x,i)=>{if(i<15||i%every===0||i===data.length-1){xs.push(i+1);ys.push(x)}});const span=Math.max(1,st.max-st.min);$('project-results').innerHTML=labTiles([{value:st.n,label:'Моих наблюдений'},{value:fmt(st.mean,5),label:'Среднее выборки'},{value:fmt(st.variance,5),label:'Эмпирическая дисперсия · деление на n'},{value:fmt(st.sd,5),label:'Стандартное отклонение'}])+`<section class="card lab-visual"><h3>Посмотрите на свои наблюдения</h3>${plot(xs,ys,{line:true,bars:false,dots:true,yMin:st.min-.06*span,yMax:st.max+.06*span,xLabel:'Номер наблюдения',yLabel:units?'X, '+units:'Наблюдаемое X'})}${renderDataTable({caption:'Числовые характеристики введённой выборки',head:['Характеристика','Значение'],rows:[['n',st.n],['Среднее',fmt(st.mean,6)],['Медиана',fmt(st.median,6)],['Мода',st.modes.length?st.modes.map(x=>fmt(x,6)).join('; '):'В принятом соглашении нет'],['Минимум',fmt(st.min,6)],['Максимум',fmt(st.max,6)],['Размах',fmt(st.range,6)],['Дисперсия с делением на n',fmt(st.variance,6)],['Стандартное отклонение',fmt(st.sd,6)]]})}<p class="small muted">Здесь вычислены эмпирические показатели ваших данных, не параметры заранее известного закона. Единицы дисперсии — квадрат единицы X; единицы σ совпадают с X. Малый объём, зависимость, самоотбор и выбросы нужно обсудить в выводе.</p></section>`;math($('project-results'));saveProject()}catch(e){$('project-error').textContent=e.message;clearProjectResult();labState={kind:'own-project',csv:[]}}}
function saveProjectReport(){if(!currentProjectStats){toast('Сначала введите наблюдения и выполните расчёт.',true);return}const s=projectSnapshot(),st=currentProjectStats,body=`<article class="prose"><h1>Моё самостоятельное исследование</h1><h3>Вопрос</h3><p>${esc(s.question)}</p><h3>Отбор и измерение</h3><p style="white-space:pre-line">${esc(s.method||'Не указан')}</p><h3>Данные · ${esc(s.units)}</h3><p class="sample-row">${esc(dataString(st.data))}</p>${renderDataTable({caption:'Характеристики выборки',head:['Показатель','Значение'],rows:[['n',st.n],['Среднее',fmt(st.mean,6)],['Дисперсия, деление на n',fmt(st.variance,6)],['σ',fmt(st.sd,6)],['Медиана',fmt(st.median,6)],['Размах',fmt(st.range,6)]]})}<h3>Мой вывод и ограничения</h3><p style="white-space:pre-line">${esc(s.conclusion||'Вывод ещё не написан')}</p></article>`;download(new Blob([standaloneDocument('Самостоятельный проект',body)],{type:'text/html;charset=utf-8'}),'СтатПрактикум — мой проект.html')}

// Conditions are complete; provenance labels do not replace the task.
