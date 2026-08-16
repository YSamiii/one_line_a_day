
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = 'oneLineDay.entries.v1';
const SETTINGS_KEY = 'oneLineDay.settings.v1';

const mineTagsAll = ['工作','家庭','心情','出游','特别事件'];
const xixiTagsAll = ['语言','大运动','认知','情绪','Daycare','第一次'];

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"language":"system","theme":"system"}');
let currentMonth = new Date();
let currentYear = new Date().getFullYear();
let yearFilter = 'both';
let searchFilter = 'both';
let selectedDate = null;
let todayTagState = {mine:[],xixi:[]};

const i18n = {
  zh:{
    appTitle:'One Line a Day', today:'今天', calendar:'日历', year:'全年', review:'回顾',
    myDay:'我的一天', xixiDay:'熹熹的一天', saveToday:'保存今天', save:'保存',
    myPlaceholder:'用一句话记住今天。', xixiPlaceholder:'今天熹熹有什么值得记住的？',
    both:'一起', mineShort:'我', xixiShort:'熹熹', onThisDay:'往年今日',
    reviewDesc:'这里会显示去年、前年同一天留下的一句话。', search:'搜索',
    searchPlaceholder:'搜索关键词或标签', editDay:'编辑这一天', settings:'设置',
    language:'语言', appearance:'外观', exportBackup:'导出完整备份',
    importBackup:'导入完整备份', localOnly:'当前版本数据保存在本机浏览器中。',
    noEntry:'还没有记录。', saved:'已保存', daysRecorded:'已记录 {n} 天'
  },
  en:{
    appTitle:'One Line a Day', today:'Today', calendar:'Calendar', year:'Year', review:'Review',
    myDay:'My Day', xixiDay:"Xixi's Day", saveToday:'Save Today', save:'Save',
    myPlaceholder:'Remember today in one sentence.', xixiPlaceholder:'What is worth remembering about Xixi today?',
    both:'Both', mineShort:'Me', xixiShort:'Xixi', onThisDay:'On This Day',
    reviewDesc:'See what you wrote on this date in previous years.', search:'Search',
    searchPlaceholder:'Search words or tags', editDay:'Edit This Day', settings:'Settings',
    language:'Language', appearance:'Appearance', exportBackup:'Export Full Backup',
    importBackup:'Import Full Backup', localOnly:'This version stores data in this browser.',
    noEntry:'No entry yet.', saved:'Saved', daysRecorded:'{n} days recorded'
  }
};

function lang(){
  if(settings.language === 'zh' || settings.language === 'en') return settings.language;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
function t(k, vars={}){
  let s = (i18n[lang()]||i18n.zh)[k] || k;
  Object.entries(vars).forEach(([a,b]) => s=s.replace(`{${a}}`,b));
  return s;
}
function applySettings(){
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.lang = lang()==='zh' ? 'zh-CN' : 'en';
  $('#languageSelect').value = settings.language;
  $('#themeSelect').value = settings.theme;
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $$('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
  $('#appTitle').textContent = t('appTitle');
  renderAll();
}
function dateKey(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseKey(k){ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d); }
function getEntry(k){ return entries[k] || {mine:'',xixi:'',mineTags:[],xixiTags:[]}; }
function saveEntries(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }

function renderToday(){
  const now = new Date();
  const locale = lang()==='zh' ? 'zh-CN' : 'en-CA';
  $('#todayLabel').textContent = new Intl.DateTimeFormat(locale,{weekday:'long'}).format(now);
  $('#bigDate').textContent = now.getDate();
  $('#subDate').textContent = new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',weekday:'long'}).format(now);
  const e = getEntry(dateKey(now));
  $('#mineText').value = e.mine || '';
  $('#xixiText').value = e.xixi || '';
  todayTagState = {mine:[...(e.mineTags||[])],xixi:[...(e.xixiTags||[])]};
  updateCount();
  renderTagChips();
  const n = Object.values(entries).filter(e => e.mine || e.xixi).length;
  $('#streakText').textContent = t('daysRecorded',{n});
}
function renderTagChips(){
  const make = (container, tags, side) => {
    container.innerHTML='';
    tags.forEach(tag=>{
      const b=document.createElement('button');
      b.className='tag-chip'+(todayTagState[side].includes(tag)?' active':'');
      b.textContent=tag;
      b.onclick=()=>{ 
        const a=todayTagState[side];
        todayTagState[side]=a.includes(tag)?a.filter(x=>x!==tag):[...a,tag];
        renderTagChips();
      };
      container.appendChild(b);
    })
  };
  make($('#mineTags'),mineTagsAll,'mine');
  make($('#xixiTags'),xixiTagsAll,'xixi');
}
function updateCount(){
  $('#mineCount').textContent = `${$('#mineText').value.length}/120`;
  $('#xixiCount').textContent = `${$('#xixiText').value.length}/120`;
}
$('#mineText').addEventListener('input',updateCount);
$('#xixiText').addEventListener('input',updateCount);

$('#saveBtn').onclick=()=>{
  const k=dateKey(new Date());
  entries[k]={
    mine:$('#mineText').value.trim(), xixi:$('#xixiText').value.trim(),
    mineTags:todayTagState.mine, xixiTags:todayTagState.xixi, updatedAt:Date.now()
  };
  if(!entries[k].mine && !entries[k].xixi) delete entries[k];
  saveEntries(); renderAll();
  $('#saveHint').textContent='✓ '+t('saved');
  setTimeout(()=>$('#saveHint').textContent='',1600);
};

function weekdayLabels(){
  return lang()==='zh' ? ['一','二','三','四','五','六','日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
}
function renderCalendar(){
  const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
  const locale=lang()==='zh'?'zh-CN':'en-CA';
  $('#monthTitle').textContent=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long'}).format(currentMonth);
  $('#weekdayRow').innerHTML=weekdayLabels().map(x=>`<div>${x}</div>`).join('');
  const first=new Date(y,m,1);
  const mondayIndex=(first.getDay()+6)%7;
  const start=new Date(y,m,1-mondayIndex);
  const todayK=dateKey(new Date());
  let html='';
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const k=dateKey(d), e=getEntry(k);
    html+=`<button class="day-cell ${d.getMonth()!==m?'out':''} ${k===todayK?'today':''}" data-date="${k}">
      <span class="day-num">${d.getDate()}</span>
      <span class="cell-dots">${e.mine?'<i style="background:var(--mine)"></i>':''}${e.xixi?'<i style="background:var(--xixi)"></i>':''}</span>
    </button>`;
  }
  $('#calendarGrid').innerHTML=html;
  $$('.day-cell').forEach(b=>b.onclick=()=>openEntryDialog(b.dataset.date));
}
$('#prevMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);renderCalendar()};
$('#nextMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);renderCalendar()};
$('#monthTitle').onclick=()=>{currentMonth=new Date();renderCalendar()};

function openEntryDialog(k){
  selectedDate=k; const e=getEntry(k), d=parseKey(k);
  const locale=lang()==='zh'?'zh-CN':'en-CA';
  $('#dialogDate').textContent=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(d);
  $('#dialogMine').value=e.mine||''; $('#dialogXixi').value=e.xixi||'';
  $('#entryDialog').showModal();
}
$('#closeDialog').onclick=()=>$('#entryDialog').close();
$('#dialogSave').onclick=()=>{
  const old=getEntry(selectedDate);
  entries[selectedDate]={...old,mine:$('#dialogMine').value.trim(),xixi:$('#dialogXixi').value.trim(),updatedAt:Date.now()};
  if(!entries[selectedDate].mine && !entries[selectedDate].xixi) delete entries[selectedDate];
  saveEntries(); $('#entryDialog').close(); renderAll();
};

function renderYear(){
  $('#yearTitle').textContent=currentYear;
  const locale=lang()==='zh'?'zh-CN':'en-CA';
  const monthNames=[...Array(12)].map((_,m)=>new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(currentYear,m,1)));
  $('#yearMonths').innerHTML=monthNames.map((name,m)=>{
    const rows=Object.keys(entries).filter(k=>{
      const d=parseKey(k); return d.getFullYear()===currentYear && d.getMonth()===m;
    }).sort().map(k=>{
      const d=parseKey(k), e=getEntry(k);
      const mine=(yearFilter!=='xixi'&&e.mine)?`<p class="mine-line">${escapeHtml(e.mine)}</p>`:'';
      const xixi=(yearFilter!=='mine'&&e.xixi)?`<p class="xixi-line">${escapeHtml(e.xixi)}</p>`:'';
      if(!mine&&!xixi)return '';
      return `<div class="year-entry" data-date="${k}"><div class="date">${d.getDate()}</div><div>${mine}${xixi}</div></div>`;
    }).join('');
    return `<div class="month-card"><h3>${name}</h3>${rows||`<div class="empty">${t('noEntry')}</div>`}</div>`;
  }).join('');
  $$('.year-entry').forEach(x=>x.onclick=()=>openEntryDialog(x.dataset.date));
}
$('#prevYear').onclick=()=>{currentYear--;renderYear()};
$('#nextYear').onclick=()=>{currentYear++;renderYear()};
$$('[data-year-filter]').forEach(b=>b.onclick=()=>{
  yearFilter=b.dataset.yearFilter;
  $$('[data-year-filter]').forEach(x=>x.classList.toggle('active',x===b));
  renderYear();
});

function renderReview(){
  const now=new Date(), list=[];
  Object.keys(entries).forEach(k=>{
    const d=parseKey(k);
    if(d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()&&d.getFullYear()<now.getFullYear())
      list.push([k,getEntry(k)]);
  });
  list.sort((a,b)=>b[0].localeCompare(a[0]));
  $('#reviewList').innerHTML=list.length?list.map(([k,e])=>`
    <div class="review-item">
      <div class="review-year">${parseKey(k).getFullYear()}</div>
      ${e.mine?`<p class="mine-line">● ${escapeHtml(e.mine)}</p>`:''}
      ${e.xixi?`<p class="xixi-line">● ${escapeHtml(e.xixi)}</p>`:''}
    </div>`).join(''):`<div class="empty">${t('noEntry')}</div>`;
  renderSearch();
}
function renderSearch(){
  const q=$('#searchInput').value.trim().toLowerCase();
  if(!q){$('#searchResults').innerHTML='';return;}
  const out=[];
  Object.keys(entries).sort().reverse().forEach(k=>{
    const e=getEntry(k);
    const mineHay=(e.mine+' '+(e.mineTags||[]).join(' ')).toLowerCase();
    const xixiHay=(e.xixi+' '+(e.xixiTags||[]).join(' ')).toLowerCase();
    const mine=searchFilter!=='xixi' && mineHay.includes(q) && e.mine;
    const xixi=searchFilter!=='mine' && xixiHay.includes(q) && e.xixi;
    if(mine||xixi) out.push({k,e,mine,xixi});
  });
  $('#searchResults').innerHTML=out.length?out.map(r=>`
    <div class="search-item" data-date="${r.k}">
      <div class="eyebrow">${r.k}</div>
      ${r.mine?`<p>● ${escapeHtml(r.e.mine)}</p>`:''}
      ${r.xixi?`<p>● ${escapeHtml(r.e.xixi)}</p>`:''}
    </div>`).join(''):`<div class="empty">${t('noEntry')}</div>`;
  $$('.search-item').forEach(x=>x.onclick=()=>openEntryDialog(x.dataset.date));
}
$('#searchInput').addEventListener('input',renderSearch);
$$('[data-search-filter]').forEach(b=>b.onclick=()=>{
  searchFilter=b.dataset.searchFilter;
  $$('[data-search-filter]').forEach(x=>x.classList.toggle('active',x===b));
  renderSearch();
});

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

$$('.bottom-nav button').forEach(b=>b.onclick=()=>{
  $$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));
  if(b.dataset.view==='calendarView') renderCalendar();
  if(b.dataset.view==='yearView') renderYear();
  if(b.dataset.view==='reviewView') renderReview();
});

$('#settingsBtn').onclick=()=>$('#settingsDialog').showModal();
$('#closeSettings').onclick=()=>$('#settingsDialog').close();
$('#languageSelect').onchange=e=>{settings.language=e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));applySettings()};
$('#themeSelect').onchange=e=>{settings.theme=e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));applySettings()};

$('#exportBtn').onclick=()=>{
  const payload={app:'One Line a Day',version:1,exportedAt:new Date().toISOString(),settings,entries};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`one-line-day-backup-${dateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#importInput').onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    const data=JSON.parse(await f.text());
    if(data.entries){entries=data.entries;saveEntries();}
    if(data.settings){settings={...settings,...data.settings};localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
    applySettings(); $('#settingsDialog').close(); alert(t('saved'));
  }catch{ alert('Invalid backup file'); }
};

function renderAll(){ renderToday(); renderCalendar(); renderYear(); renderReview(); }
applySettings();

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
