const LANGUAGES=(COURSE.i18n&&COURSE.i18n.languages)||[{id:'ru',label:'Русский',short:'Рус',htmlLang:'ru'}];
const DICTS={ru:{},en:(COURSE.i18n&&COURSE.i18n.en)||{},kk:(COURSE.i18n&&COURSE.i18n.kk)||{}};
const PATTERNS=((COURSE.i18n&&COURSE.i18n.patterns)||[]).map(p=>({re:new RegExp('^'+p.re+'$'),en:p.en,kk:p.kk}));
const LANG_KEY='statpracticum-lang';
let LANG=(()=>{const saved=readStore(LANG_KEY,'ru');return LANGUAGES.some(l=>l.id===saved)?saved:'ru'})();
const SKIP_TAGS=new Set(['SCRIPT','STYLE','TEXTAREA','CODE','CANVAS']);
const ATTRS=['aria-label','placeholder','title','alt','aria-description'];
let translating=false;
// Russian originals are kept so switching languages never translates translated text.
const originalText=new WeakMap(),originalAttrs=new WeakMap();
function dict(){return DICTS[LANG]||{}}
// The course data keeps its own dictionary; page-drawn text such as material titles is looked up there too.
function dataDict(){return ((COURSE_BASE.i18n&&COURSE_BASE.i18n.content)||{})[LANG]||{}}
// Spacing and non-breaking spaces must not prevent a dictionary hit.
function normalise(text){return text.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function translatePhrase(text){
 const d=dict();if(!text)return null;
 const key=normalise(text);
 if(Object.prototype.hasOwnProperty.call(d,key))return d[key];
 const c=dataDict();
 if(Object.prototype.hasOwnProperty.call(c,key))return c[key];
 // Labels that contain a number keep the number and translate the words around it.
 for(const pattern of PATTERNS){
  const match=key.match(pattern.re);
  if(!match)continue;
  const template=pattern[LANG];
  if(!template)continue;
  return template.replace(/\{(\d+)\}/g,(_,i)=>{const captured=match[Number(i)+1];if(captured===undefined)return '';const key=normalise(captured);return Object.prototype.hasOwnProperty.call(d,key)?d[key]:captured});
 }
 return null;
}
// Text the page draws itself: translated when a language is active, source text in Russian.
function interfaceText(text){if(LANG==='ru')return text;const done=translatePhrase(text);return done===null?text:done}
function skipNode(node){for(let el=node.parentElement;el;el=el.parentElement){if(SKIP_TAGS.has(el.tagName))return true;if(el.classList&&(el.classList.contains('katex')||el.classList.contains('no-translate')))return true}return false}
function translateTree(root){
 if(LANG==='ru'||!root||translating)return;
 translating=true;
 try{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const pending=[];
  for(let node=walker.nextNode();node;node=walker.nextNode())pending.push(node);
  for(const node of pending){
   if(skipNode(node))continue;
   const source=originalText.has(node)?originalText.get(node):node.nodeValue;
   const translated=translatePhrase(source);
   if(translated!==null&&translated!==node.nodeValue){if(!originalText.has(node))originalText.set(node,node.nodeValue);node.nodeValue=translated}
  }
  const elements=root.nodeType===1?[root,...root.querySelectorAll('*')]:[...root.querySelectorAll('*')];
  for(const el of elements){
   // A textarea keeps its own text untranslated, but its placeholder is interface text.
   if(SKIP_TAGS.has(el.tagName)&&el.tagName!=='TEXTAREA'&&el.tagName!=='CANVAS')continue;
   for(const attr of ATTRS){
    if(!el.hasAttribute(attr))continue;
    const saved=originalAttrs.get(el)||{},source=Object.prototype.hasOwnProperty.call(saved,attr)?saved[attr]:el.getAttribute(attr);
    const translated=translatePhrase(source);
    if(translated!==null&&translated!==el.getAttribute(attr)){saved[attr]=source;originalAttrs.set(el,saved);el.setAttribute(attr,translated)}
   }
   if(el.tagName==='OPTION'&&el.label&&el.label!==el.textContent){const translated=translatePhrase(el.label);if(translated!==null)el.label=translated}
  }
 }finally{translating=false}
}
// Detached fragments (printouts, exports) are not covered by the mutation observer,
// so they are translated explicitly before they leave the page.
function localizeFragment(root){
 if(LANG==='ru'||!root)return root;
 const els=root.nodeType===1?[root,...root.querySelectorAll('*')]:[...root.querySelectorAll('*')];
 translateTree(root);
 for(const el of els){if(el.tagName==='OPTION'){const v=translatePhrase(el.textContent);if(v!==null)el.textContent=v}}
 return root
}
// Language tag for exported documents.
function docLang(){const l=LANGUAGES.find(x=>x.id===LANG);return (l&&l.htmlLang)||'ru'}
// Shorthand used by the page code when it builds captions and export rows itself.
function ui(text){if(typeof LANG==='undefined'||LANG==='ru')return text;const done=translatePhrase(text);return done===null?text:done}
function restoreRussian(root){
 translating=true;
 try{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode())if(originalText.has(node))node.nodeValue=originalText.get(node);
  for(const el of [root,...root.querySelectorAll('*')]){
   const saved=originalAttrs.get(el);
   if(saved)for(const attr of Object.keys(saved))el.setAttribute(attr,saved[attr]);
  }
 }finally{translating=false}
}
function translateDocument(){
 const html=document.documentElement;
 html.lang=(LANGUAGES.find(l=>l.id===LANG)||{}).htmlLang||'ru';
 restoreRussian(document.body);
 translateTree(document.body);
 const head=document.title.split(' · ')[0],translated=translatePhrase(head);
 document.title=(translated===null?head:translated)+' · '+(translatePhrase('СтатПрактикум')||'СтатПрактикум');
}
function setLanguage(id){
 if(!LANGUAGES.some(l=>l.id===id))return;
 LANG=id;
 try{localStorage.setItem(LANG_KEY,JSON.stringify(id))}catch(e){storageOK=false}
 // Static chrome keeps its Russian source, so a re-render plus restore covers the whole page.
 if(typeof applyContentLanguage==='function')applyContentLanguage(id);
 renderRoute();translateDocument();
 // A worksheet dialog holds data rendered at open time, so it is rebuilt in the new language.
 try{if(typeof wsRefresh==='function')wsRefresh()}catch(e){}
 const picker=$('lang-select');if(picker)picker.value=id;
}
// Used by the coverage checker: a Cyrillic string can be Kazakh (or English in the wrong
// place), so the page is asked whether the string is one of its own translations.
let TARGET_TEXT=null,TARGET_TEXT_BLOB='',TARGET_TEXT_LANG=null;
const targetNorm=v=>String(v).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function knownTargetText(text){if(!text)return false;if(!TARGET_TEXT||TARGET_TEXT_LANG!==LANG){TARGET_TEXT=new Set();TARGET_TEXT_LANG=LANG;
 const parts=[],base=(typeof COURSE_BASE!=='undefined'&&COURSE_BASE.i18n)||{},ui=base[LANG]||{};
 for(const k in ui){const v=ui[k];if(typeof v==='string'){TARGET_TEXT.add(v);parts.push(targetNorm(v))}}
 const cont=(base.content||{})[LANG]||{};
 for(const k in cont){const v=cont[k];if(typeof v==='string'){TARGET_TEXT.add(v);parts.push(targetNorm(v))}}
 TARGET_TEXT_BLOB=parts.join(' \u0000 ')}
 const needle=targetNorm(text);
 return TARGET_TEXT.has(text)||TARGET_TEXT.has(needle)||(needle.length>12&&TARGET_TEXT_BLOB.includes(needle))}
function mountLanguagePicker(){
 const host=$('lang-picker');if(!host)return;
 host.innerHTML=`<label class="hidden" for="lang-select">Язык интерфейса</label><select id="lang-select" class="lang-select" aria-label="Язык интерфейса">${LANGUAGES.map(l=>`<option value="${l.id}" ${l.id===LANG?'selected':''}>${l.short}</option>`).join('')}</select>`;
 $('lang-select').addEventListener('change',e=>setLanguage(e.target.value));
}
// Dialogs and lab panels render outside renderRoute, so watch for new nodes too.
const translationObserver=new MutationObserver(records=>{
 if(LANG==='ru'||translating)return;
 for(const record of records){
  for(const node of record.addedNodes){
   if(node.nodeType===1)translateTree(node);
   else if(node.nodeType===3&&!skipNode(node)){const translated=translatePhrase(node.nodeValue);if(translated!==null)node.nodeValue=translated}
  }
 }
});
