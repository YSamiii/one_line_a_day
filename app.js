
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = 'oneLineDay.entries.v2';
const LEGACY_KEY = 'oneLineDay.entries.v1';
const SETTINGS_KEY = 'oneLineDay.settings.v1';
const PRESETS_KEY = 'oneLineDay.blockPresets.v1';

let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"language":"system","theme":"system","palette":"dopamine"}');
if(!settings.palette) settings.palette='dopamine';
let currentMonth = new Date();
let currentYear = new Date().getFullYear();
let yearFilter = 'both';
let searchFilter = 'both';
let selectedDate = null;
let pendingBlockContainer = null;
let blockPresets = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null') || ['今天的工作','家庭','特别的一天'];

function migrateEntries(){
  const current = localStorage.getItem(STORAGE_KEY);
  if(current) return JSON.parse(current);
  const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
  const migrated = {};
  Object.entries(legacy).forEach(([k,e])=>{
    const blocks=[];
    if(e.mine) blocks.push({id:'mine',title:'我的一天',text:e.mine});
    if(e.xixi) blocks.push({id:'xixi',title:'熹熹的一天',text:e.xixi});
    if(blocks.length) migrated[k]={blocks,updatedAt:e.updatedAt||Date.now()};
  });
  localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
  return migrated;
}
let entries=migrateEntries();

const i18n={
  zh:{
    appTitle:'One Line a Day',today:'今天',calendar:'日历',year:'全年',review:'回顾',
    myDay:'我的一天',xixiDay:'熹熹的一天',both:'全部',mineShort:'我',xixiShort:'熹熹',jumpToMonth:'跳转月份',saveToday:'保存今天',save:'保存',myPlaceholder:'用一句话记住今天。',
    onThisDay:'往年今日',reviewDesc:'这里会显示去年、前年同一天留下的一句话。',search:'搜索',
    searchPlaceholder:'搜索关键词或标题',editDay:'编辑这一天',settings:'设置',language:'语言',
    appearance:'外观',colorTheme:'配色主题',exportBackup:'导出完整备份',importBackup:'导入完整备份',
    localOnly:'当前版本数据保存在本机浏览器中。',noEntry:'还没有记录。',saved:'已保存',
    daysRecorded:'已记录 {n} 天',addBlock:'新增记录区块',newBlock:'新记录',
    blockPlaceholder:'用一句话记录这个部分。',chooseBlock:'选择记录区块',customBlock:'自定义标题',blockPresets:'常用区块标题',blockPresetsDesc:'新增记录时直接选择，不用每天重新输入标题。',presetPlaceholder:'例如：熹熹的一天',add:'添加'
  },
  en:{
    appTitle:'One Line a Day',today:'Today',calendar:'Calendar',year:'Year',review:'Review',
    myDay:'My Day',xixiDay:"Xixi's Day",both:'All',mineShort:'Me',xixiShort:'Xixi',jumpToMonth:'Jump to month',saveToday:'Save Today',save:'Save',myPlaceholder:'Remember today in one sentence.',
    onThisDay:'On This Day',reviewDesc:'See what you wrote on this date in previous years.',search:'Search',
    searchPlaceholder:'Search words or titles',editDay:'Edit This Day',settings:'Settings',language:'Language',
    appearance:'Appearance',colorTheme:'Color Theme',exportBackup:'Export Full Backup',importBackup:'Import Full Backup',
    localOnly:'This version stores data in this browser.',noEntry:'No entry yet.',saved:'Saved',
    daysRecorded:'{n} days recorded',addBlock:'Add another block',newBlock:'New block',
    blockPlaceholder:'Remember this part of the day in one sentence.',chooseBlock:'Choose a block',customBlock:'Custom title',blockPresets:'Saved block titles',blockPresetsDesc:'Choose a saved title when adding a block.',presetPlaceholder:"e.g. Xixi's Day",add:'Add'
  }
};

function lang(){
  if(settings.language==='zh'||settings.language==='en') return settings.language;
  return navigator.language.toLowerCase().startsWith('zh')?'zh':'en';
}
function t(k,vars={}){
  let s=(i18n[lang()]||i18n.zh)[k]||k;
  Object.entries(vars).forEach(([a,b])=>s=s.replace(`{${a}}`,b));
  return s;
}
function applySettings(){
  document.documentElement.dataset.theme=settings.theme;
  document.documentElement.dataset.palette=settings.palette || 'dopamine';
  document.documentElement.lang=lang()==='zh'?'zh-CN':'en';
  $('#languageSelect').value=settings.language;
  $('#themeSelect').value=settings.theme;
  const paletteSelect = $('#paletteSelect');
  if(paletteSelect) paletteSelect.value=settings.palette || 'dopamine';
  $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $$('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  $('#appTitle').textContent=t('appTitle');
  renderPresetSettings();
  renderAll();
}
function dateKey(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseKey(k){const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);}
function saveEntries(){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));}
function uid(){return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function defaultBlocks(){return [{id:'mine',title:t('myDay'),text:''}];}
function getEntry(k){
  const e=entries[k];
  if(!e?.blocks?.length) return {blocks:defaultBlocks()};
  const blocks=e.blocks.map((b,i)=>({...b,title:i===0?t('myDay'):b.title}));
  if(blocks[0].id!=='mine') blocks.unshift(defaultBlocks()[0]);
  return {blocks};
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(s=''){return escapeHtml(s);}

function blockHTML(block,index){
  const isDefault=index===0;
  return `<section class="dynamic-block card ${isDefault?'default-block':'extra-block'}" data-block-id="${escapeAttr(block.id)}">
    <div class="block-title-row">
      <div class="block-title-left">
        <span class="block-color-dot" style="background:${isDefault?'var(--mine)':'var(--xixi)'}"></span>
        <input class="block-title-input" ${isDefault?'readonly':''} maxlength="30"
          value="${escapeAttr(isDefault?t('myDay'):(block.title||t('newBlock')))}">
      </div>
      ${isDefault?'':`<button class="remove-block" aria-label="delete">×</button>`}
    </div>
    <textarea maxlength="120" placeholder="${escapeAttr(isDefault?t('myPlaceholder'):t('blockPlaceholder'))}">${escapeHtml(block.text||'')}</textarea>
    <div class="count">${(block.text||'').length}/120</div>
  </section>`;
}
function wireBlocks(container){
  container.querySelectorAll('.dynamic-block').forEach(block=>{
    const ta=block.querySelector('textarea'),count=block.querySelector('.count');
    ta.addEventListener('input',()=>count.textContent=`${ta.value.length}/120`);
    const rm=block.querySelector('.remove-block');
    if(rm) rm.onclick=()=>block.remove();
  });
}
function renderBlocks(container,blocks){
  container.innerHTML=blocks.map((b,i)=>blockHTML(b,i)).join('');
  wireBlocks(container);
}
function addBlockWithTitle(container,title){
  const block={id:uid(),title:title||t('newBlock'),text:''};
  container.insertAdjacentHTML('beforeend',blockHTML(block,container.children.length));
  wireBlocks(container);
  const last=container.lastElementChild;
  last.scrollIntoView({behavior:'smooth',block:'center'});
  last.querySelector('textarea')?.focus();
}
function renderBlockPicker(){
  const list=$('#blockPresetList');
  list.innerHTML=blockPresets.length
    ? blockPresets.map(title=>`<button class="preset-choice" data-title="${escapeAttr(title)}"><span>${escapeHtml(title)}</span><span class="preset-arrow">›</span></button>`).join('')
    : `<div class="empty">${t('noEntry')}</div>`;
  list.querySelectorAll('.preset-choice').forEach(btn=>btn.onclick=()=>{
    addBlockWithTitle(pendingBlockContainer,btn.dataset.title);
    $('#blockPickerDialog').close();
  });
}
function openBlockPicker(container){
  pendingBlockContainer=container;
  renderBlockPicker();
  $('#blockPickerDialog').showModal();
}
function renderPresetSettings(){
  const box=$('#presetSettingsList');
  if(!box) return;
  box.innerHTML=blockPresets.map((title,i)=>`<span class="preset-pill">${escapeHtml(title)}<button data-index="${i}" aria-label="delete">×</button></span>`).join('');
  box.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
    blockPresets.splice(Number(btn.dataset.index),1);
    localStorage.setItem(PRESETS_KEY,JSON.stringify(blockPresets));
    renderPresetSettings();
  });
}
function collectBlocks(container){
  const blocks=[...container.querySelectorAll('.dynamic-block')].map((el,i)=>({
    id:i===0?'mine':(el.dataset.blockId||uid()),
    title:i===0?t('myDay'):(el.querySelector('.block-title-input').value.trim()||t('newBlock')),
    text:el.querySelector('textarea').value.trim()
  }));
  return blocks;
}

function renderToday(){
  const now=new Date(),locale=lang()==='zh'?'zh-CN':'en-CA';
  $('#todayLabel').textContent=new Intl.DateTimeFormat(locale,{weekday:'long'}).format(now);
  $('#bigDate').textContent=now.getDate();
  $('#subDate').textContent=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',weekday:'long'}).format(now);
  renderBlocks($('#blocksContainer'),getEntry(dateKey(now)).blocks);
  const n=Object.values(entries).filter(e=>e.blocks?.some(b=>b.text)).length;
  $('#streakText').textContent=t('daysRecorded',{n});
}
$('#addBlockBtn').onclick=()=>openBlockPicker($('#blocksContainer'));
$('#saveBtn').onclick=()=>{
  const k=dateKey(new Date()),blocks=collectBlocks($('#blocksContainer'));
  if(blocks.some(b=>b.text)) entries[k]={blocks,updatedAt:Date.now()}; else delete entries[k];
  saveEntries();renderAll();
  $('#saveHint').textContent='✓ '+t('saved');
  setTimeout(()=>$('#saveHint').textContent='',1600);
};


function monthNamesFor(year){
  const locale=lang()==='zh'?'zh-CN':'en-CA';
  return [...Array(12)].map((_,m)=>new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(year,m,1)));
}
function renderCalendarMonthSelect(){
  const sel=$('#calendarMonthSelect');
  if(!sel) return;
  const y=currentMonth.getFullYear();
  const names=monthNamesFor(y);
  sel.innerHTML=names.map((name,m)=>`<option value="${m}" ${m===currentMonth.getMonth()?'selected':''}>${y} · ${name}</option>`).join('');
}
function renderYearMonthSelect(){
  const sel=$('#yearMonthSelect');
  if(!sel) return;
  const names=monthNamesFor(currentYear);
  sel.innerHTML=`<option value="">${t('jumpToMonth')}</option>`+
    names.map((name,m)=>`<option value="${m}">${name}</option>`).join('');
}

function weekdayLabels(){return lang()==='zh'?['一','二','三','四','五','六','日']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];}
function renderCalendar(){
  const y=currentMonth.getFullYear(),m=currentMonth.getMonth(),locale=lang()==='zh'?'zh-CN':'en-CA';
  renderCalendarMonthSelect();
  $('#weekdayRow').innerHTML=weekdayLabels().map(x=>`<div>${x}</div>`).join('');
  const first=new Date(y,m,1),mondayIndex=(first.getDay()+6)%7,start=new Date(y,m,1-mondayIndex),todayK=dateKey(new Date());
  let html='';
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const k=dateKey(d),count=entries[k]?.blocks?.filter(b=>b.text).length||0;
    html+=`<button class="day-cell ${d.getMonth()!==m?'out':''} ${k===todayK?'today':''}" data-date="${k}">
      <span class="day-num">${d.getDate()}</span>
      <span class="cell-dots">${count?'<i style="background:var(--mine)"></i>':''}${count>1?'<i style="background:var(--xixi)"></i>':''}</span>
    </button>`;
  }
  $('#calendarGrid').innerHTML=html;
  $$('.day-cell').forEach(b=>b.onclick=()=>openEntryDialog(b.dataset.date));
}
$('#prevMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);renderCalendar()};
$('#nextMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);renderCalendar()};
$('#calendarMonthSelect').onchange=e=>{
  currentMonth=new Date(currentMonth.getFullYear(),Number(e.target.value),1);
  renderCalendar();
};

function openEntryDialog(k){
  selectedDate=k;
  const d=parseKey(k),locale=lang()==='zh'?'zh-CN':'en-CA';
  $('#dialogDate').textContent=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(d);
  renderBlocks($('#dialogBlocksContainer'),getEntry(k).blocks);
  $('#entryDialog').showModal();
}
$('#dialogAddBlockBtn').onclick=()=>openBlockPicker($('#dialogBlocksContainer'));
$('#closeDialog').onclick=()=>$('#entryDialog').close();
$('#dialogSave').onclick=()=>{
  const blocks=collectBlocks($('#dialogBlocksContainer'));
  if(blocks.some(b=>b.text)) entries[selectedDate]={blocks,updatedAt:Date.now()}; else delete entries[selectedDate];
  saveEntries();$('#entryDialog').close();renderAll();
};

function renderYear(){
  $('#yearTitle').textContent=currentYear;
  renderYearMonthSelect();
  const locale=lang()==='zh'?'zh-CN':'en-CA';
  const names=[...Array(12)].map((_,m)=>new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(currentYear,m,1)));
  $('#yearMonths').innerHTML=names.map((name,m)=>{
    const rows=Object.keys(entries).filter(k=>{
      const d=parseKey(k);return d.getFullYear()===currentYear&&d.getMonth()===m;
    }).sort().map(k=>{
      const d=parseKey(k);
      const blocks=(entries[k].blocks||[]).filter(b=>b.text);
      const filtered=blocks.filter((b,i)=>{
        const isMine = b.id==='mine' || b.title==='我的一天' || b.title==='My Day';
        const isXixi = b.title==='熹熹的一天' || b.title==="Xixi's Day";
        if(yearFilter==='mine') return isMine;
        if(yearFilter==='xixi') return isXixi;
        return true;
      });
      const lines=filtered.map((b)=>{
        const isMine = b.id==='mine' || b.title==='我的一天' || b.title==='My Day';
        const cls = isMine ? 'mine-line' : 'xixi-line';
        const title = isMine ? t('myDay') : (b.title==='熹熹的一天' || b.title==="Xixi's Day" ? t('xixiDay') : b.title);
        return `<p class="${cls}"><strong>${escapeHtml(title)}：</strong>${escapeHtml(b.text)}</p>`;
      }).join('');
      return lines?`<div class="year-entry" data-date="${k}"><div class="date">${d.getDate()}</div><div>${lines}</div></div>`:'';
    }).join('');
    return `<div class="month-card" id="year-month-${m}"><h3>${name}</h3>${rows||`<div class="empty">${t('noEntry')}</div>`}</div>`;
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
$('#yearMonthSelect').onchange=e=>{
  const month=e.target.value;
  if(month==='') return;
  const target=document.getElementById(`year-month-${month}`);
  if(target){
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }
};

function renderReview(){
  const now=new Date(),list=[];
  Object.keys(entries).forEach(k=>{
    const d=parseKey(k);
    if(d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()&&d.getFullYear()<now.getFullYear()) list.push([k,entries[k]]);
  });
  list.sort((a,b)=>b[0].localeCompare(a[0]));
  $('#reviewList').innerHTML=list.length?list.map(([k,e])=>`
    <div class="review-item"><div class="review-year">${parseKey(k).getFullYear()}</div>
    ${(e.blocks||[]).filter(b=>b.text).map((b,i)=>`<p><strong>${escapeHtml(i===0?t('myDay'):b.title)}：</strong>${escapeHtml(b.text)}</p>`).join('')}
    </div>`).join(''):`<div class="empty">${t('noEntry')}</div>`;
  renderSearch();
}
function renderSearch(){
  const q=$('#searchInput').value.trim().toLowerCase();
  if(!q){$('#searchResults').innerHTML='';return;}
  const out=[];
  Object.keys(entries).sort().reverse().forEach(k=>{
    const matched=(entries[k].blocks||[]).filter((b)=>{
      const isMine = b.id==='mine' || b.title==='我的一天' || b.title==='My Day';
      const isXixi = b.title==='熹熹的一天' || b.title==="Xixi's Day";
      if(searchFilter==='mine' && !isMine) return false;
      if(searchFilter==='xixi' && !isXixi) return false;
      const displayTitle = isMine ? t('myDay') : (isXixi ? t('xixiDay') : b.title);
      return `${displayTitle} ${b.text}`.toLowerCase().includes(q);
    });
    if(matched.length) out.push({k,matched});
  });
  $('#searchResults').innerHTML=out.length?out.map(r=>`
    <div class="search-item" data-date="${r.k}">
      <div class="eyebrow">${r.k}</div>
      ${r.matched.map(b=>{
        const isMine=b.id==='mine'||b.title==='我的一天'||b.title==='My Day';
        const isXixi=b.title==='熹熹的一天'||b.title==="Xixi's Day";
        const title=isMine?t('myDay'):(isXixi?t('xixiDay'):b.title);
        return `<p><strong>${escapeHtml(title)}：</strong>${escapeHtml(b.text)}</p>`;
      }).join('')}
    </div>`).join(''):`<div class="empty">${t('noEntry')}</div>`;
  $$('.search-item').forEach(x=>x.onclick=()=>openEntryDialog(x.dataset.date));
}
$('#searchInput').addEventListener('input',renderSearch);
$$('[data-search-filter]').forEach(b=>b.onclick=()=>{
  searchFilter=b.dataset.searchFilter;
  $$('[data-search-filter]').forEach(x=>x.classList.toggle('active',x===b));
  renderSearch();
});

$$('.bottom-nav button').forEach(b=>b.onclick=()=>{
  $$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));
  if(b.dataset.view==='calendarView')renderCalendar();
  if(b.dataset.view==='yearView')renderYear();
  if(b.dataset.view==='reviewView')renderReview();
});

$('#closeBlockPicker').onclick=()=>$('#blockPickerDialog').close();
$('#customBlockBtn').onclick=()=>{
  const title=prompt(t('customBlock'));
  if(title && title.trim()){
    addBlockWithTitle(pendingBlockContainer,title.trim());
    $('#blockPickerDialog').close();
  }
};
$('#addPresetBtn').onclick=()=>{
  const input=$('#newPresetInput');
  const title=input.value.trim();
  if(!title) return;
  if(!blockPresets.includes(title)) blockPresets.push(title);
  localStorage.setItem(PRESETS_KEY,JSON.stringify(blockPresets));
  input.value='';
  renderPresetSettings();
};
$('#newPresetInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();$('#addPresetBtn').click();}
});

$('#settingsBtn').onclick=()=>{renderPresetSettings();$('#settingsDialog').showModal();};
$('#closeSettings').onclick=()=>$('#settingsDialog').close();
$('#languageSelect').onchange=e=>{settings.language=e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));applySettings()};
$('#themeSelect').onchange=e=>{settings.theme=e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));applySettings()};
$('#paletteSelect').onchange=e=>{settings.palette=e.target.value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));applySettings()};

$('#exportBtn').onclick=()=>{
  const payload={app:'One Line a Day',version:9,exportedAt:new Date().toISOString(),settings,blockPresets,entries};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`one-line-day-backup-${dateKey(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);
};
$('#importInput').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const data=JSON.parse(await f.text());
    if(data.entries){entries=data.entries;saveEntries();}
    if(Array.isArray(data.blockPresets)){blockPresets=data.blockPresets;localStorage.setItem(PRESETS_KEY,JSON.stringify(blockPresets));}
    if(data.settings){settings={...settings,...data.settings};localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
    applySettings();$('#settingsDialog').close();alert(t('saved'));
  }catch{alert('Invalid backup file');}
};

function renderAll(){renderToday();renderCalendar();renderYear();renderReview();}
applySettings();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
