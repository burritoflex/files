
// ─── AUTH GUARD ──────────────────────────────────────
const _user = JSON.parse(localStorage.getItem('aavahana-user')||'null');
if(!_user) window.location.href='login.html';

// Apply dark mode before paint
if(localStorage.getItem('aavahana-dark')==='1') document.body.classList.add('dark');

const TASKS = [
  "Quality check raw materials batch 101",
  "Maintenance documentation Line A",
  "Safety Training Module 2",
  "Warehouse stock verification",
  "End-of-day production report",
];

const LS = {
  ACTIVE:   'aavahana-active',
  ASSIGNED: 'aavahana-assigned',
  BANNER:   'aavahana-banner-hidden',
  DAILY:    'aavahana-daily-notes',
  WEEKLY:   'aavahana-weekly-notes',
  HISTORY:  'aavahana-task-history',
};

// --- All state at the top so nothing hits TDZ ---
let sel            = [];
let active         = JSON.parse(localStorage.getItem(LS.ACTIVE) || '[]');
let assigned       = parseInt(localStorage.getItem(LS.ASSIGNED) || '0', 10) || 0;
let notes          = {
  daily:  JSON.parse(localStorage.getItem(LS.DAILY)  || '[]'),
  weekly: JSON.parse(localStorage.getItem(LS.WEEKLY) || '[]'),
};
let analyticsChart = null;
let activeTab      = 'week';
const DAY_SHORT    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let touring        = false;
let step           = 0;
let tgt            = null;
let focusEl        = null;

// ─── SAVE ────────────────────────────────────────────
function saveActive(){
  localStorage.setItem(LS.ACTIVE,   JSON.stringify(active));
  localStorage.setItem(LS.ASSIGNED, String(assigned));
  snapshotToday();
  renderWeekly();
  renderAnalytics();
}
function saveNotes(type){
  localStorage.setItem(type==='daily'?LS.DAILY:LS.WEEKLY, JSON.stringify(notes[type]));
}

// ─── INIT ────────────────────────────────────────────
(function(){
  // Set greeting name from logged-in user
  const firstName = _user ? _user.firstName : 'there';
  document.getElementById('g-name').textContent = firstName;

  // Populate settings popup user info
  if(_user){
    document.getElementById('sp-name').textContent  = _user.name;
    document.getElementById('sp-empid').textContent = _user.empid;
  }

  // Dark toggle initial state
  if(localStorage.getItem('aavahana-dark')==='1'){
    document.getElementById('dark-toggle').classList.add('on');
  }

  tick();
  if(localStorage.getItem(LS.BANNER)==='1'){
    const b=document.getElementById('tour-banner');
    if(b) b.classList.add('hidden');
  }
  if(active.length){
    show('v-empty','hidden');
    show('v-active','');
    renderActive(false);
  }
  saveActive();
  renderWeekly();
  renderSavedNotes('daily');
  renderSavedNotes('weekly');
  setInterval(tick, 60000);
})();

// ─── CLOCK ───────────────────────────────────────────
function tick(){
  const n=new Date(), h=n.getHours();
  document.getElementById('g-label').textContent =
    h<12?'Good morning,':h<17?'Good afternoon,':'Good evening,';
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DA=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('d-num').textContent = n.getDate();
  document.getElementById('d-lbl').textContent = MO[n.getMonth()]+', '+DA[n.getDay()];
}

// ─── SETTINGS POPUP ──────────────────────────────────
function openSettings(){
  document.getElementById('settings-popup').classList.remove('hidden');
  document.getElementById('settings-overlay').classList.remove('hidden');
}
function closeSettings(){
  document.getElementById('settings-popup').classList.add('hidden');
  document.getElementById('settings-overlay').classList.add('hidden');
}
function toggleDark(){
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('aavahana-dark', isDark?'1':'0');
  document.getElementById('dark-toggle').classList.toggle('on', isDark);
  // Re-render chart so colours update
  renderAnalytics();
}
function doLogout(){
  closeSettings();
  showModal({
    title: 'Log out?',
    body: 'You will be returned to the login screen. Your progress is saved.',
    confirmText: 'Log Out',
    danger: true,
    icon: 'fa-arrow-right-from-bracket',
    onConfirm: () => {
      localStorage.removeItem('aavahana-user');
      window.location.href='login.html';
    }
  });
}

// ─── BANNER ──────────────────────────────────────────
function hideBanner(){
  document.getElementById('tour-banner').classList.add('hidden');
  localStorage.setItem(LS.BANNER,'1');
}

// ─── TASK SELECTION ──────────────────────────────────
function openSel(){
  const rem=TASKS.filter(t=>!active.find(a=>a.name===t));
  if(!rem.length){ toast('All supervisor tasks added'); return; }
  sel=[];
  show('v-empty','hidden'); show('v-active','hidden'); show('v-sel','');
  show('v-slider','hidden');
  renderOpts();
  if(touring && step===1) advTour(2);
}
function closeSel(){
  sel=[];
  show('v-sel','hidden');
  show('v-slider','hidden');
  active.length ? show('v-active','') : show('v-empty','');
  if(touring) endTour();
}
function renderOpts(){
  const rem=TASKS.filter(t=>!active.find(a=>a.name===t));
  const c=document.getElementById('opt-list');
  c.innerHTML='';
  rem.forEach(t=>{
    const s=sel.includes(t);
    const d=document.createElement('div');
    d.className='topt'+(s?' sel':'');
    d.innerHTML=`<span class="topt-text">${t}</span><div class="topt-check">${s?'<i class="fa-solid fa-check"></i>':''}</div>`;
    d.onclick=()=>toggleOpt(t);
    c.appendChild(d);
  });
}
function toggleOpt(t){
  sel.includes(t)?sel=sel.filter(x=>x!==t):sel.push(t);
  renderOpts();
  const sa=document.getElementById('v-slider');
  sel.length>0?sa.classList.remove('hidden'):sa.classList.add('hidden');
}

// ─── SLIDER (mobile) ─────────────────────────────────
(function initSlider(){
  const th=document.getElementById('sthumb');
  const wr=document.getElementById('sconf');
  const fi=document.getElementById('sfill');
  let drag=false, ox=0;
  th.addEventListener('pointerdown',e=>{ drag=true; ox=e.clientX; th.setPointerCapture(e.pointerId); e.preventDefault(); });
  function completeSlide(max){
    drag=false;
    th.style.transition='transform .18s'; fi.style.transition='width .18s';
    th.style.transform=`translateX(${max}px)`; wr.style.background='var(--green)'; fi.style.width='100%';
    setTimeout(()=>{ th.style.background='#fff'; th.style.color='var(--green)'; th.innerHTML='<i class="fa-solid fa-check"></i>'; setTimeout(confirmPlan,250); },180);
  }
  th.addEventListener('pointermove',e=>{
    if(!drag) return;
    const max=wr.offsetWidth-th.offsetWidth-14;
    let d=Math.max(0,Math.min(e.clientX-ox,max));
    th.style.transform=`translateX(${d}px)`; fi.style.width=(58+d)+'px';
    if(d>=max-1) completeSlide(max);
  });
  th.addEventListener('pointerup',()=>{
    if(!drag) return; drag=false;
    th.style.transition='transform .3s'; fi.style.transition='width .3s';
    th.style.transform=''; fi.style.width='58px';
    setTimeout(()=>{ th.style.transition=''; fi.style.transition=''; },320);
  });
})();

function confirmPlan(){
  const th=document.getElementById('sthumb'),wr=document.getElementById('sconf'),fi=document.getElementById('sfill');
  wr.style.background=''; fi.style.width='58px';
  th.style.transition=''; fi.style.transition='';
  th.style.transform=''; th.style.background=''; th.style.color='';
  th.innerHTML='<i class="fa-solid fa-chevron-right"></i>';
  sel.forEach(t=>{ if(!active.find(a=>a.name===t)){ active.push({name:t,status:'pending',subtasks:[]}); assigned++; } });
  sel=[];
  show('v-sel','hidden'); show('v-empty','hidden'); show('v-active','');
  renderActive(true); saveActive(); renderWeekly();
  toast('Plan confirmed');
  if(touring && step===2) advTour(3);
}

// ─── ACTIVE TASKS ────────────────────────────────────
function renderActive(anim){
  const c=document.getElementById('active-list');
  c.innerHTML='';
  active.forEach((t,i)=>{
    if(!t.subtasks) t.subtasks=[];
    updateTaskStatusFromSubtasks(t);
    const d=document.createElement('div');
    d.className='task-block'+(anim?' fup':'');
    if(anim) d.style.animationDelay=(i*50)+'ms';
    const row=document.createElement('div');
    row.className='trow';
    row.innerHTML=`
      <span class="tname${t.status==='done'?' done':''}">${t.name}</span>
      <button class="spill ${t.status}" onclick="cycleStatus(${i})">
        <span class="sdot"></span><span>${cap(t.status)}</span>
      </button>`;
    d.appendChild(row);
    const subList=document.createElement('div');
    subList.className='subtasks';
    t.subtasks.forEach((s,si)=>{
      const sr=document.createElement('div');
      sr.className='subtask-row'+(s.done?' done':'');
      const check=document.createElement('button');
      check.className='subtask-check'; check.type='button';
      check.innerHTML='<i class="fa-solid fa-check"></i>';
      check.onclick=()=>toggleSubtask(i,si);
      const name=document.createElement('span');
      name.className='subtask-name'; name.textContent=s.name;
      sr.appendChild(check); sr.appendChild(name); subList.appendChild(sr);
    });
    d.appendChild(subList);
    const add=document.createElement('div');
    add.className='subtask-add';
    add.innerHTML=`
      <input class="subtask-input" id="subtask-input-${i}" placeholder="Add a subtask" onkeydown="if(event.key==='Enter') addSubtask(${i})">
      <button class="subtask-btn" onclick="addSubtask(${i})" aria-label="Add subtask"><i class="fa-solid fa-plus"></i></button>`;
    d.appendChild(add);
    c.appendChild(d);
  });
  const badge=document.getElementById('task-badge');
  const done=active.filter(x=>x.status==='done').length;
  badge.textContent=`${done}/${active.length} done`;
  badge.classList.remove('hidden');
}
function updateTaskStatusFromSubtasks(t){
  if(!t.subtasks||!t.subtasks.length) return;
  const done=t.subtasks.filter(s=>s.done).length;
  t.status=done===0?'pending':done===t.subtasks.length?'done':'working';
}
function addSubtask(i){
  const input=document.getElementById('subtask-input-'+i);
  const val=input.value.trim();
  if(!val){ toast('Add a subtask name'); return; }
  active[i].subtasks.push({name:val,done:false});
  updateTaskStatusFromSubtasks(active[i]);
  renderActive(false); saveActive(); renderWeekly();
}
function toggleSubtask(i,si){
  active[i].subtasks[si].done=!active[i].subtasks[si].done;
  updateTaskStatusFromSubtasks(active[i]);
  renderActive(false); saveActive(); renderWeekly();
}
function cycleStatus(i){
  const t=active[i];
  if(t.subtasks&&t.subtasks.length){ toast('Complete subtasks to update this task'); return; }
  t.status=t.status==='pending'?'working':t.status==='working'?'done':'pending';
  renderActive(false); saveActive(); renderWeekly();
}
function cap(s){ return s[0].toUpperCase()+s.slice(1); }

// ─── ANALYTICS DATA LAYER ────────────────────────────
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(LS.HISTORY)||'[]'); } catch(e){ return []; }
}
function saveHistory(hist){ localStorage.setItem(LS.HISTORY,JSON.stringify(hist)); }
function todayKey(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function snapshotToday(){
  const key=todayKey();
  const done=active.filter(t=>t.status==='done').length;
  const total=active.length;
  const hist=loadHistory();
  const idx=hist.findIndex(h=>h.date===key);
  if(idx>=0){ hist[idx].done=done; hist[idx].total=total; }
  else{ hist.push({date:key,done,total}); }
  hist.sort((a,b)=>a.date.localeCompare(b.date));
  if(hist.length>84) hist.splice(0,hist.length-84);
  saveHistory(hist);
}

// ─── ANALYTICS CHART ─────────────────────────────────
function getWeekDays(date){
  const d=new Date(date);
  const day=d.getDay()||7;
  const mon=new Date(d); mon.setDate(d.getDate()-day+1);
  const days=[];
  for(let i=0;i<7;i++){ const dd=new Date(mon); dd.setDate(mon.getDate()+i); days.push(dd); }
  return days;
}
function dateKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function switchTab(tab){
  activeTab=tab;
  document.getElementById('tab-week').classList.toggle('active',tab==='week');
  document.getElementById('tab-weeks').classList.toggle('active',tab==='weeks');
  renderAnalytics();
}
function renderAnalytics(){
  const wrapEl  = document.getElementById('chart-wrap');
  const emptyEl = document.getElementById('chart-empty');
  const tabsEl  = document.getElementById('chart-tabs');
  const legEl   = document.getElementById('chart-legend');
  if(emptyEl) emptyEl.classList.add('hidden');
  if(wrapEl)  wrapEl.classList.remove('hidden');
  if(tabsEl)  tabsEl.classList.remove('hidden');
  if(typeof Chart==='undefined'){
    if(wrapEl) wrapEl.innerHTML='<p style="padding:20px;color:var(--t3);font-size:13px">Chart.js failed to load.</p>';
    return;
  }
  if(analyticsChart){ analyticsChart.destroy(); analyticsChart=null; }
  if(wrapEl){
    const old=document.getElementById('analytics-chart');
    if(old) old.remove();
    const fresh=document.createElement('canvas');
    fresh.id='analytics-chart';
    wrapEl.appendChild(fresh);
  }
  const hist   = loadHistory();
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3d37cc';
  const navy   = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim()||'#0a0e27';
  const t3     = getComputedStyle(document.documentElement).getPropertyValue('--t3').trim()||'#9b99bc';
  const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#e5e3f5';
  const canvas = document.getElementById('analytics-chart');
  if(!canvas) return;
  const sharedScales={
    x:{ grid:{color:border}, ticks:{color:t3,font:{size:10,family:'DM Sans'}}, border:{display:false} },
    y:{ grid:{color:border}, ticks:{color:t3,font:{size:10,family:'DM Sans'},stepSize:1,precision:0}, border:{display:false}, beginAtZero:true }
  };
  const sharedPlugins={
    legend:{display:false},
    tooltip:{ backgroundColor:navy, titleColor:'#fff', bodyColor:'rgba(255,255,255,.8)', padding:10, cornerRadius:8, displayColors:false,
      callbacks:{ label:item=>`${item.raw} task${item.raw!==1?'s':''} done` } }
  };
  if(activeTab==='week'){
    const weekDays=getWeekDays(new Date());
    const labels=weekDays.map(d=>DAY_SHORT[d.getDay()]);
    const todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
    const data=weekDays.map(d=>{ const h=hist.find(x=>x.date===dateKey(d)); return h?h.done:0; });
    const maxY=Math.max(5,...data)+1;
    const isDark = document.body.classList.contains('dark');
    const todayColor  = isDark ? 'rgba(255,255,255,0.9)' : '#3d37cc';
    const otherColor  = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(61,55,204,0.25)';
    const otherBorder = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(61,55,204,0.5)';
    const bgColors = labels.map((_,i) => i===todayIdx ? todayColor : otherColor);
    const bdColors = labels.map((_,i) => i===todayIdx ? todayColor : otherBorder);
    analyticsChart=new Chart(canvas,{
      type:'bar',
      data:{ labels, datasets:[{ data, backgroundColor:bgColors, borderColor:bdColors, borderWidth:1.5, borderRadius:6, borderSkipped:false }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:sharedPlugins, scales:{ x:sharedScales.x, y:{...sharedScales.y,max:maxY} }, animation:{duration:400} }
    });
    if(legEl) legEl.innerHTML=`
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${todayColor}"></div>Today</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${otherColor}; border:1px solid ${otherBorder}"></div>Other days</div>`;
  } else {
    const today=new Date(); const weeks=[];
    for(let w=7;w>=0;w--){ const ref=new Date(today); ref.setDate(today.getDate()-w*7); weeks.push(getWeekDays(ref)); }
    const labels=weeks.map((_,i)=>i===7?'This week':`${8-i}w ago`);
    const doneData=weeks.map(wk=>{ const e=wk.map(d=>hist.find(x=>x.date===dateKey(d))).filter(Boolean); return e.reduce((s,x)=>s+x.done,0); });
    const maxY=Math.max(5,...doneData)+1;
    const isDarkL = document.body.classList.contains('dark');
    const lineColor = isDarkL ? 'rgba(255,255,255,0.85)' : '#3d37cc';
    const fillColor = isDarkL ? 'rgba(255,255,255,0.07)' : 'rgba(61,55,204,0.1)';
    analyticsChart=new Chart(canvas,{
      type:'line',
      data:{ labels, datasets:[{ label:'Tasks done', data:doneData, borderColor:lineColor, backgroundColor:fillColor, fill:true, tension:.35, pointRadius:4, pointBackgroundColor:lineColor, pointBorderColor: isDarkL?'#0b0f14':'#fff', pointBackgroundColor:isDarkL?'rgba(255,255,255,0.85)':'#3d37cc', pointBorderWidth:2, borderWidth:2.5 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:sharedPlugins, scales:{ x:sharedScales.x, y:{...sharedScales.y,max:maxY} }, animation:{duration:400} }
    });
    if(legEl) legEl.innerHTML=`
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${lineColor}"></div>Tasks done per week</div>`;
  }
}

// ─── WEEKLY REPORT ───────────────────────────────────
function renderWeekly(){
  const done=active.filter(t=>t.status==='done');
  const we=document.getElementById('w-empty'),ws=document.getElementById('w-summary'),wf=document.getElementById('w-feed');
  if(!assigned){ we.classList.remove('hidden'); ws.classList.add('hidden'); wf.innerHTML=''; return; }
  we.classList.add('hidden'); ws.classList.remove('hidden');
  const pct=Math.round(done.length/assigned*100);
  document.getElementById('w-pct').textContent=pct+'%';
  let narr;
  if(!done.length)  narr=`${assigned} task${assigned>1?'s':''} planned. Mark them done as you go.`;
  else if(pct<50)   narr=`Getting started — ${done.length} of ${assigned} tasks done. Keep going.`;
  else if(pct<80)   narr=`Good progress! ${done.length} of ${assigned} tasks completed this week.`;
  else if(pct<100)  narr=`Almost there — ${done.length} of ${assigned} done. Strong week ahead.`;
  else              narr=`Excellent! All ${assigned} tasks completed. Outstanding week.`;
  document.getElementById('w-narr').textContent=narr;
  wf.innerHTML=done.map(t=>`
    <div class="witem fup">
      <i class="fa-solid fa-circle-check wcheck"></i>
      <span class="wname">${t.name}</span>
    </div>`).join('');
}

// ─── NOTES ───────────────────────────────────────────
function showWeeklyNote(){
  document.getElementById('wn-btn').classList.add('hidden');
  document.getElementById('wn-area').classList.remove('hidden');
}
function renderSavedNotes(type){
  const c=document.getElementById(type==='daily'?'daily-saved-notes':'weekly-saved-notes');
  if(!c) return; c.innerHTML='';
  notes[type].forEach((n,i)=>{
    const d=document.createElement('div'); d.className='saved-note fup';
    const meta=document.createElement('span'); meta.className='saved-note-meta';
    meta.textContent=type==='daily'?'Saved daily note':'Saved weekly note';
    const body=document.createElement('span'); body.textContent=n;
    const del=document.createElement('button'); del.className='note-delete'; del.type='button';
    del.setAttribute('aria-label','Delete note'); del.innerHTML='<i class="fa-solid fa-trash"></i>';
    del.onclick=()=>deleteNote(type,i);
    d.appendChild(meta); d.appendChild(body); d.appendChild(del); c.appendChild(d);
  });
}
function deleteNote(type,i){
  notes[type].splice(i,1); saveNotes(type); renderSavedNotes(type); toast('Note deleted');
}
function doSubmit(type){
  const id=type==='daily'?'daily-note':'weekly-note';
  const el=document.getElementById(id); const val=el.value.trim();
  if(!val){ toast('Nothing to submit yet'); return; }
  notes[type].unshift(val); saveNotes(type); renderSavedNotes(type); el.value='';
  toast(type==='daily'?'Daily note saved':'Weekly note saved');
  if(touring&&type==='daily'&&step===4) advTour(5);
  if(touring&&type==='weekly'&&step===6) endTour();
}

// ─── TOAST ───────────────────────────────────────────

// ─── CONFIRM MODAL ───────────────────────────────────
function showModal({ title, body, confirmText='Confirm', danger=false, icon='fa-triangle-exclamation', onConfirm }){
  document.getElementById('cm-title').textContent   = title;
  document.getElementById('cm-body').textContent    = body;
  document.getElementById('cm-icon').innerHTML      = `<i class="fa-solid ${icon}"></i>`;
  document.getElementById('cm-icon').className      = 'cm-icon' + (danger ? ' danger' : '');
  const confirmBtn = document.getElementById('cm-confirm');
  confirmBtn.textContent = confirmText;
  confirmBtn.className   = 'cm-btn-confirm' + (danger ? ' danger' : '');
  confirmBtn.onclick     = () => { closeModal(); onConfirm(); };
  document.getElementById('confirm-modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal(){
  document.getElementById('confirm-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}
function toast(msg){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; },2000);
  setTimeout(()=>t.remove(),2400);
}
function show(id,action){
  const el=document.getElementById(id);
  action==='hidden'?el.classList.add('hidden'):el.classList.remove('hidden');
}

// ─── TOUR ────────────────────────────────────────────
const STEPS=[
  {title:"Add today's tasks",   text:"Tap the + button to see tasks assigned by your supervisor. Pick the ones you'll work on today."},
  {title:"Select and confirm",  text:"Tap one or more tasks to select them. Then confirm your plan using the button below."},
  {title:"Today's tasks",       text:"Your active tasks appear here. Tap the status badge to cycle through Pending → Working → Done.", btnLabel:'Got it'},
  {title:"Analytics",           text:"Track your daily task completion as a bar chart. Switch to Weekly Trend to see your progress over the past 8 weeks — updates automatically as you complete tasks.", btnLabel:'Got it'},
  {title:"Daily note",          text:"Write a short note each day — tasks completed, blockers, or anything worth remembering. Submit to save.", btnLabel:'Got it'},
  {title:"Weekly report",       text:"This fills automatically from your completed tasks. Your completion rate and full task list are tracked here.", btnLabel:'Got it'},
  {title:"Weekly note",         text:"An optional note to add context to your weekly report. Submit one to finish the tour, or skip.", btnLabel:'Finish tour'},
];
const scrims={top:document.getElementById('s-top'),bot:document.getElementById('s-bot'),left:document.getElementById('s-left'),right:document.getElementById('s-right')};
const tutEl=document.getElementById('tut');
let _tourSnapshot = null;

function startTour(){
  // If user has already done work, prompt and save state
  if(active.length > 0){
    showModal({
      title: 'Start guided tour?',
      body: "You've already started working. The tour will temporarily reset your progress and restore it when finished.",
      confirmText: 'Start Tour',
      icon: 'fa-compass',
      onConfirm: () => _launchTour(true)
    });
    return;
  }

  _launchTour(false);
}

function _launchTour(withSnapshot){
  if(withSnapshot){
    _tourSnapshot = {
      active:   JSON.stringify(active),
      assigned: assigned,
      notes:    JSON.stringify(notes),
    };
    active   = [];
    assigned = 0;
    notes    = { daily: [], weekly: [] };
  }
  // Close any open panels
  show('v-sel',    'hidden');
  show('v-active', 'hidden');
  show('v-slider', 'hidden');
  show('v-empty',  '');
  sel = [];
  document.getElementById('task-badge').classList.add('hidden');
  document.getElementById('daily-note').value = '';
  const wn = document.getElementById('weekly-note');
  if(wn) wn.value = '';
  document.getElementById('daily-saved-notes').innerHTML  = '';
  document.getElementById('weekly-saved-notes').innerHTML = '';
  document.getElementById('w-feed').innerHTML = '';
  document.getElementById('w-summary').classList.add('hidden');
  document.getElementById('w-empty').classList.remove('hidden');

  touring = true;
  hideBanner();
  Object.values(scrims).forEach(s=>s.style.display='block');
  tutEl.style.display='block';
  step=1; renderStep(); requestAnimationFrame(syncTour);
}
function advTour(s){ step=s; renderStep(); }
function renderStep(){
  const s=STEPS[step-1]; if(!s){ endTour(); return; }
  document.getElementById('tut-title').textContent=s.title;
  document.getElementById('tut-text').textContent=s.text;
  const next=document.getElementById('tut-next'); next.textContent=s.btnLabel||'Next';
  s.btnLabel?next.classList.remove('hidden'):next.classList.add('hidden');
  const ids=['add-btn','plan-card','active-list','analytics-card','note-card','report-card','weekly-note-section'];
  if(focusEl) focusEl.classList.remove('tour-focus');
  tgt=document.getElementById(ids[step-1]);
  // Never highlight the tut box itself
  if(tgt && tgt.id !== 'tut'){
    focusEl=tgt;
    focusEl.classList.add('tour-focus');
    // Elements inside cards need their parent card lifted above the scrim
    const cardParentMap = {
      'add-btn':              'plan-card',
      'active-list':          'plan-card',
      'weekly-note-section':  'report-card',
    };
    const parentCardId = cardParentMap[tgt.id];
    if(parentCardId){
      const parentCard = document.getElementById(parentCardId);
      if(parentCard){
        parentCard.style.zIndex   = '2600';
        parentCard.style.position = 'relative';
        parentCard.style.backdropFilter = 'none';
        parentCard.style.webkitBackdropFilter = 'none';
        parentCard.style.overflow = 'visible';
        parentCard.style.background = document.body.classList.contains('dark') ? '#1e2430' : '#ffffff';
      }
    } else {
      // Reset any previously lifted cards
      ['plan-card','report-card'].forEach(id => {
        const c = document.getElementById(id);
        if(c) c.style.cssText = '';
      });
    }
  } else {
    focusEl=null;
  }
  tgt.scrollIntoView({behavior:'smooth',block:step>=5?'end':'center'});
}
function tutNext(){ if(step<=2) return; if(step>=STEPS.length){ endTour(); return; } step++; renderStep(); }
function syncTour(){
  if(!touring||!tgt) return;
  // Show just the one scrim as a full overlay — pointer-events:none so focused element is clickable
  scrims.top.style.cssText='display:block;position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none';
  scrims.bot.style.display='none';
  scrims.left.style.display='none';
  scrims.right.style.display='none';

  // Position tooltip
  const raw=tgt.getBoundingClientRect();
  const h=window.innerHeight, tipH=tutEl.offsetHeight||160, gap=14, margin=12;
  const spaceBelow=h-raw.bottom-margin, spaceAbove=raw.top-margin;
  let top;
  if(spaceBelow>=tipH+gap)      top=raw.bottom+gap;
  else if(spaceAbove>=tipH+gap) top=raw.top-tipH-gap;
  else                          top=Math.max(margin, h-tipH-margin);
  tutEl.style.bottom='auto';
  tutEl.style.top=top+'px';
  tutEl.style.left='50%';
  tutEl.style.transform='translateX(-50%)';
  requestAnimationFrame(syncTour);
}
function endTour(){
  touring=false;
  Object.values(scrims).forEach(s=>s.style.display='none');
  if(focusEl) focusEl.classList.remove('tour-focus'); focusEl=null; tutEl.style.display='none';
  // Reset any inline styles set during tour
  ['plan-card','report-card'].forEach(id => {
    const c = document.getElementById(id);
    if(c) c.style.cssText = '';
  });
  // Restore pre-tour state if we snapshotted
  if(_tourSnapshot){
    active   = JSON.parse(_tourSnapshot.active);
    assigned = _tourSnapshot.assigned;
    notes    = JSON.parse(_tourSnapshot.notes);
    _tourSnapshot = null;
    if(active.length){
      show('v-empty','hidden');
      show('v-active','');
      renderActive(false);
    }
    renderWeekly();
    renderAnalytics();
    renderSavedNotes('daily');
    renderSavedNotes('weekly');
    toast('Your progress has been restored.');
  }
}
