/* ---- Презентации и материалы: выбор языка, подписи и обложки -------------- */
/* В библиотеку встроены русские PDF и их переводы (id вида «lesson1-en», «lesson1-kk»).
   Раньше карточки показывали все вложенные файлы подряд: в английском интерфейсе
   рядом с Lesson 1 стояли казахский «Сабақ 1» и русский оригинал, а подпись
   «добавлено учителем» оставалась русской. Ниже — один источник правды:
   какой перевод показать, на каком языке встроенный PDF и как подписать материал. */
const MATERIAL_LANG_SUFFIX=/-(en|kk)$/;
const MATERIAL_LANG_NAME={ru:'Русский',en:'English',kk:'Қазақша'};
function materialBaseId(id){return String(id||'').replace(MATERIAL_LANG_SUFFIX,'')}
function materialLang(id){
 const m=String(id||'').match(MATERIAL_LANG_SUFFIX);
 if(m)return m[1];
 // Материалы, добавленные учителем, могли быть сохранены без суффикса.
 const item=materials.find(x=>x.id===id);
 return (item&&item.lang)||'ru';
}
// Язык интерфейса — только ru/en/kk; неизвестный код считается русским.
function interfaceLang(){return typeof LANG!=='undefined'&&['en','kk'].includes(LANG)?LANG:'ru'}
// Перевод презентации на выбранный язык; русский оригинал — запасной вариант.
function localizedMaterial(m){
 if(!m)return m;
 const want=interfaceLang(),base=materialBaseId(m.id);
 if(materialLang(m.id)===want)return m;
 return materials.find(x=>x.id===base+'-'+want)||materials.find(x=>x.id===base)||m;
}
// Одна карточка на презентацию: перевод текущего языка вместо трёх копий подряд.
function materialsInLanguage(list){
 const lang=interfaceLang(),order=[],groups=new Map();
 for(const m of list){
  const base=materialBaseId(m.id);
  if(!groups.has(base)){groups.set(base,[]);order.push(base)}
  groups.get(base).push(m);
 }
 return order.map(base=>{
  const group=groups.get(base);
  return group.find(x=>x.id===base+'-'+lang)||group.find(x=>materialLang(x.id)==='ru')||group[0];
 }).filter(Boolean);
}
// Язык самого PDF: у перевода он известен из id, у оригинала — из названия файла.
function builtinMaterialLang(m){
 if(!m)return 'ru';
 const lang=materialLang(m.id);
 if(MATERIAL_LANG_SUFFIX.test(m.id))return lang;
 if(m.lang)return m.lang;
 const name=String(m.name||'');
 if(/\(EN\)|_en\.|\ben\.pdf$/i.test(name))return 'en';
 if(/\(KK\)|_kk\.|\bkk\.pdf$/i.test(name))return 'kk';
 return lang;
}
// Подписи к формату и количеству страниц.
// «Слайдов» у презентаций и «страниц» у методических материалов: формат виден в подписи.
// Для английского и казахского слова свои, иначе подпись читается как машинный перевод.
function materialFormatLabel(m){
 const lang=interfaceLang();
 if(m.mime==='images')return lang==='en'?'Slide images':lang==='kk'?'Слайд суреттері':'Изображения слайдов';
 if(m.mime?.startsWith('text/'))return lang==='en'?'Text with formulas':lang==='kk'?'Формулалары бар мәтін':'Текст с формулами';
 if(m.mime!=='application/pdf')return lang==='en'?'Material':lang==='kk'?'Материал':'Материал';
 if(lang==='en')return m.kind==='method'?'Pages':'Slides';
 if(lang==='kk')return m.kind==='method'?'Бет':'Слайд';
 return m.kind==='method'?'Страниц':'Слайдов';
}
function materialPagesLabel(m){
 const n=Number(m.pages)||0,lang=interfaceLang();
 if(!n)return materialFormatLabel(m);
 const unit=materialFormatLabel(m);
 if(lang==='en')return n+' '+(unit==='Pages'?(n===1?'page':'pages'):unit.toLowerCase());
 if(lang==='kk')return n+' '+unit;
 return n+' '+unit.toLowerCase();
}
function materialKindLabel(m){
 const lang=interfaceLang();
 if(m.kind==='method')return lang==='en'?'For teachers':lang==='kk'?'Мұғалім':'Учителю';
 if(m.kind==='theory')return lang==='en'?'Theory':lang==='kk'?'Теория':'Теория';
 return lang==='en'?'Presentation':lang==='kk'?'Презентация':'Презентация';
}
function materialSourceLabel(m){
 const lang=interfaceLang();
 if(!m||m.builtin===false)return lang==='en'?'added by a teacher':lang==='kk'?'мұғалім қосқан':'добавлено учителем';
 return lang==='en'?'built-in deck':lang==='kk'?'кірістірілген жинақ':'встроенная презентация';
}
// У встроенных переводов нет своего id в словаре: язык берётся из самого файла.
function materialLangLabel(m){
 const lang=builtinMaterialLang(m);
 if(lang==='ru')return '';
 return MATERIAL_LANG_NAME[lang]||'';
}
function materialAriaOpen(){return interfaceLang()==='en'?'Open the material':interfaceLang()==='kk'?'Материалды ашу':'Открыть материал'}
// Название для подписи кнопки: у встроенных материалов есть перевод в словаре страницы.
function materialSpokenTitle(m){return typeof ui==='function'?ui(m.title):m.title}
function materialAriaDownload(m){
 const lang=interfaceLang(),title=materialSpokenTitle(m);
 if(lang==='en')return 'Download '+title;
 if(lang==='kk')return title+' жүктеу';
 return 'Скачать '+title;
}
// Подпись обложки: видно, к какому файлу относится картинка.
function materialCoverAlt(m){
 const lang=interfaceLang();
 return (lang==='en'?'Cover: ':lang==='kk'?'Мұқаба: ':'Обложка: ')+materialSpokenTitle(m);
}
// Все версии одной презентации: значок языка открывает нужный файл учителю.
function materialVersions(m){
 const base=materialBaseId(m.id),found=[];
 for(const lang of ['ru','en','kk']){
  const item=materials.find(x=>x.id===(lang==='ru'?base:base+'-'+lang));
  if(item)found.push(item);
 }
 return found;
}
function materialLangShort(lang){return ({ru:'Рус',en:'Eng',kk:'Қаз'})[lang]||lang}
function materialVersionButtons(m){
 const versions=materialVersions(m);
 if(versions.length<2)return '';
 return `<span class="row" style="gap:3px">${versions.map(v=>`<button class="btn sm${v.id===localizedMaterial(m).id?' primary':''}" onclick="openMaterial('${v.id}')" aria-label="${esc(ui('Открыть презентацию на языке')+': '+MATERIAL_LANG_NAME[materialLang(v.id)])}">${materialLangShort(materialLang(v.id))}</button>`).join('')}</span>`
}
// Строка списка материалов в панели учителя: одна презентация вместо трёх копий.
function teacherMaterialRow(m){
 const current=localizedMaterial(m);
 return `<div class="material-list-item"><div><h4>${esc(ui(current.title))}</h4><span class="small muted">${ui(materialKindLabel(current))} · ${ui(materialSourceLabel(current))}${current.pages?' · '+esc(materialPagesLabel(current)):''}${current.topics.length?' · '+current.topics.map(id=>{const s=SECTIONS.find(s=>s.id===id);return s?sectionNumber(s):id}).join(', ')+' '+ui('тема'):''}</span></div><div class="row">${materialVersionButtons(m)}<button class="btn icon sm" onclick="openMaterial('${current.id}')" aria-label="${esc(ui('Просмотр'))}">${ico('book')}</button><button class="btn icon sm" onclick="downloadMaterial('${current.id}')" aria-label="${esc(ui('Скачать'))}">${ico('download')}</button>${current.builtin===false?`<button class="btn icon sm danger" onclick="deleteMaterial('${current.id}')" aria-label="${esc(ui('Удалить дополнительный материал'))}">${ico('trash')}</button>`:''}</div></div>`
}
