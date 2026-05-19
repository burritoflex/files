
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
  HISTORY:  'aavahana-task-history',  // {date:'YYYY-MM-DD', done:N, total:N}[]
};

let sel   = [];        // selected in modal
let active= JSON.parse(localStorage.getItem(LS.ACTIVE) || '[]');
let assigned = parseInt(localStorage.getItem(LS.ASSIGNED) || '0', 10) || 0;
let notes = {
  daily: JSON.parse(localStorage.getItem(LS.DAILY) || '[]'),
  weekly: JSON.parse(localStorage.getItem(LS.WEEKLY) || '[]')
};

function saveActive(){
  localStorage.setItem(LS.ACTIVE, JSON.stringify(active));
  localStorage.setItem(LS.ASSIGNED, String(assigned));
  snapshotToday();
  renderWeekly();
  renderAnalytics();
}
function saveNotes(type){
  localStorage.setItem(type==='daily'?LS.DAILY:LS.WEEKLY, JSON.stringify(notes[type]));
}
let touring  = false;
let step     = 0;
let tgt      = null;
let focusEl  = null;



(function(){
  tick();
  if(localStorage.getItem(LS.BANNER)==='1'){
    const b=document.getElementById('tour-banner'); if(b) b.classList.add('hidden');
  }
  if(active.length){
    show('v-empty','hidden'); show('v-active','');
    renderActive(false);
  }
  saveActive();
  renderWeekly();
  renderSavedNotes('daily');
  renderSavedNotes('weekly');
  renderAnalytics();
  setInterval(tick, 60000);
})();

function tick(){
  const n=new Date(), h=n.getHours();
  document.getElementById('g-label').textContent =
    h<12?'Good morning,':h<17?'Good afternoon,':'Good evening,';
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DA=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('d-num').textContent = n.getDate();
  document.getElementById('d-lbl').textContent = MO[n.getMonth()]+', '+DA[n.getDay()];
}


function hideBanner(){
  document.getElementById('tour-banner').classList.add('hidden');
  localStorage.setItem(LS.BANNER,'1');
}


function openSel(){
  const rem = TASKS.filter(t=>!active.find(a=>a.name===t));
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


(function initSlider(){
  const th=document.getElementById('sthumb');
  const wr=document.getElementById('sconf');
  const fi=document.getElementById('sfill');
  let drag=false, ox=0;

  th.addEventListener('pointerdown',e=>{
    drag=true; ox=e.clientX;
    th.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  function completeSlide(max){
    drag=false;
    th.style.transition='transform .18s';
    fi.style.transition='width .18s';
    th.style.transform=`translateX(${max}px)`;
    wr.style.background='var(--green)';
    fi.style.width='100%';
    setTimeout(()=>{
      th.style.background='#fff'; th.style.color='var(--green)';
      th.innerHTML='<i class="fa-solid fa-check"></i>';
      setTimeout(confirmPlan,250);
    },180);
  }

  th.addEventListener('pointermove',e=>{
    if(!drag) return;
    const max=wr.offsetWidth-th.offsetWidth-14;
    let d=Math.max(0,Math.min(e.clientX-ox, max));
    th.style.transform=`translateX(${d}px)`;
    fi.style.width=(58+d)+'px';
    if(d>=max-1){
      completeSlide(max);
    }
  });
  th.addEventListener('pointerup',()=>{
    if(!drag) return; drag=false;
    th.style.transition='transform .3s'; fi.style.transition='width .3s';
    th.style.transform=''; fi.style.width='58px';
    setTimeout(()=>{th.style.transition='';fi.style.transition='';},320);
  });
})();

function confirmPlan(){
  /* reset slider */
  const th=document.getElementById('sthumb'),wr=document.getElementById('sconf'),fi=document.getElementById('sfill');
  wr.style.background=''; fi.style.width='58px';
  th.style.transition=''; fi.style.transition='';
  th.style.transform=''; th.style.background=''; th.style.color='';
  th.innerHTML='<i class="fa-solid fa-chevron-right"></i>';

  sel.forEach(t=>{ if(!active.find(a=>a.name===t)){ active.push({name:t,status:'pending',subtasks:[]}); assigned++; } });
  sel=[];
  show('v-sel','hidden'); show('v-empty','hidden'); show('v-active','');
  renderActive(true);
  saveActive();
  renderWeekly();
  toast('Plan confirmed');
  if(touring && step===2) advTour(3);
}


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
        <span class="sdot"></span>
        <span>${cap(t.status)}</span>
      </button>`;
    d.appendChild(row);

    const subList=document.createElement('div');
    subList.className='subtasks';
    t.subtasks.forEach((s,si)=>{
      const sr=document.createElement('div');
      sr.className='subtask-row'+(s.done?' done':'');
      const check=document.createElement('button');
      check.className='subtask-check';
      check.type='button';
      check.innerHTML='<i class="fa-solid fa-check"></i>';
      check.onclick=()=>toggleSubtask(i,si);
      const name=document.createElement('span');
      name.className='subtask-name';
      name.textContent=s.name;
      sr.appendChild(check);
      sr.appendChild(name);
      subList.appendChild(sr);
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
  if(!t.subtasks || !t.subtasks.length) return;
  const done=t.subtasks.filter(s=>s.done).length;
  t.status=done===0?'pending':done===t.subtasks.length?'done':'working';
}

function addSubtask(i){
  const input=document.getElementById('subtask-input-'+i);
  const val=input.value.trim();
  if(!val){ toast('Add a subtask name'); return; }
  active[i].subtasks.push({name:val,done:false});
  updateTaskStatusFromSubtasks(active[i]);
  renderActive(false);
  saveActive();
  renderWeekly();
}

function toggleSubtask(i,si){
  active[i].subtasks[si].done=!active[i].subtasks[si].done;
  updateTaskStatusFromSubtasks(active[i]);
  renderActive(false);
  saveActive();
  renderWeekly();
}

function cycleStatus(i){
  const t=active[i];
  if(t.subtasks && t.subtasks.length){
    toast('Complete subtasks to update this task');
    return;
  }
  t.status=t.status==='pending'?'working':t.status==='working'?'done':'pending';
  renderActive(false);
  saveActive();
  renderWeekly();
}

function cap(s){ return s[0].toUpperCase()+s.slice(1); }

/* ═══════════════════════════════════════════════
   ANALYTICS — data layer + chart rendering
   Storage: LS.HISTORY  →  array of daily snapshots
   { date: 'YYYY-MM-DD', done: N, total: N }
   One entry per calendar day, upserted on every save.
   Backend hook: replace loadHistory() / saveHistory()
   with API calls when a backend is available.
═══════════════════════════════════════════════ */

// --- Data layer (swap these two functions for backend) ---
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(LS.HISTORY)||'[]'); }
  catch(e){ return []; }
}
function saveHistory(hist){
  localStorage.setItem(LS.HISTORY, JSON.stringify(hist));
}

function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Called every time task state changes; upserts today's snapshot
function snapshotToday(){
  const key=todayKey();
  const done=active.filter(t=>t.status==='done').length;
  const total=active.length;
  const hist=loadHistory();
  const idx=hist.findIndex(h=>h.date===key);
  if(idx>=0){ hist[idx].done=done; hist[idx].total=total; }
  else { hist.push({date:key,done,total}); }
  // keep only last 12 weeks (84 days)
  hist.sort((a,b)=>a.date.localeCompare(b.date));
  if(hist.length>84) hist.splice(0,hist.length-84);
  saveHistory(hist);
}

// --- Chart state ---
let analyticsChart=null;
let activeTab='week';

function switchTab(tab){
  activeTab=tab;
  document.getElementById('tab-week').classList.toggle('active',tab==='week');
  document.getElementById('tab-weeks').classList.toggle('active',tab==='weeks');
  renderAnalytics();
}

// Returns Mon–Sun labels for the ISO week containing `date`
function getWeekDays(date){
  const d=new Date(date);
  const day=d.getDay()||7; // Mon=1..Sun=7
  const mon=new Date(d); mon.setDate(d.getDate()-day+1);
  const days=[];
  for(let i=0;i<7;i++){
    const dd=new Date(mon); dd.setDate(mon.getDate()+i);
    days.push(dd);
  }
  return days;
}

function dateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DAY_SHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEK_SHORT=['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'];

function renderAnalytics(){
  const hist=loadHistory();
  const ctx=document.getElementById('analytics-chart');
  if(!ctx) return;

  const emptyEl = document.getElementById('chart-empty');
  const wrapEl  = document.getElementById('chart-wrap');
  const tabsEl  = document.getElementById('chart-tabs');
  const legEl   = document.getElementById('chart-legend');

  // Show chart whenever there's any task activity (current or historic).
  // Backend hook: just have loadHistory() return non-empty data and this
  // condition will pick it up automatically.
  const hasActivity = hist.length > 0 || (typeof active !== 'undefined' && active.length > 0);
  if(!hasActivity){
    if(emptyEl) emptyEl.classList.remove('hidden');
    if(wrapEl)  wrapEl.classList.add('hidden');
    if(tabsEl)  tabsEl.classList.add('hidden');
    if(legEl)   legEl.innerHTML='';
    if(analyticsChart){ analyticsChart.destroy(); analyticsChart=null; }
    return;
  }
  if(emptyEl) emptyEl.classList.add('hidden');
  if(wrapEl)  wrapEl.classList.remove('hidden');
  if(tabsEl)  tabsEl.classList.remove('hidden');

  // If Chart.js failed to load (offline / blocked CDN), surface a message
  // instead of failing silently.
  if(typeof Chart === 'undefined'){
    if(wrapEl) wrapEl.innerHTML =
      '<div class="wempty" style="margin:0">Chart library failed to load. Check your connection and refresh.</div>';
    return;
  }

  if(analyticsChart){ analyticsChart.destroy(); analyticsChart=null; }

  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3d37cc';
  const navy=getComputedStyle(document.documentElement).getPropertyValue('--navy').trim()||'#0a0e27';
  const green=getComputedStyle(document.documentElement).getPropertyValue('--green').trim()||'#059669';
  const t3=getComputedStyle(document.documentElement).getPropertyValue('--t3').trim()||'#9b99bc';
  const border=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#e5e3f5';

  const commonOptions={
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{
      backgroundColor:navy, titleColor:'#fff', bodyColor:'rgba(255,255,255,.8)',
      padding:10, cornerRadius:8, displayColors:false,
      callbacks:{
        label:ctx=>activeTab==='week'
          ?`${ctx.raw} task${ctx.raw!==1?'s':''} done`
          :`${ctx.dataset.label}: ${ctx.raw}%`
      }
    }},
    scales:{
      x:{ grid:{color:border}, ticks:{color:t3,font:{size:10,family:'DM Sans'}}, border:{display:false} },
      y:{ grid:{color:border}, ticks:{color:t3,font:{size:10,family:'DM Sans'},stepSize:1}, border:{display:false}, beginAtZero:true }
    },
    animation:{ duration:500, easing:'easeOutQuart' }
  };

  try {
  if(activeTab==='week'){
    // Mon–Sun of current week; today highlighted
    const weekDays=getWeekDays(new Date());
    const labels=weekDays.map(d=>DAY_SHORT[d.getDay()]);
    const todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
    const data=weekDays.map(d=>{
      const h=hist.find(x=>x.date===dateKey(d));
      return h?h.done:0;
    });
    const bgColors=data.map((_,i)=>i===todayIdx?accent:'rgba(61,55,204,.18)');
    const borderColors=data.map((_,i)=>i===todayIdx?accent:'rgba(61,55,204,.35)');

    analyticsChart=new Chart(ctx,{
      type:'bar',
      data:{ labels, datasets:[{ data, backgroundColor:bgColors, borderColor:borderColors, borderWidth:1.5, borderRadius:6, borderSkipped:false }] },
      options:{...commonOptions, scales:{...commonOptions.scales, y:{...commonOptions.scales.y, max:Math.max(5,...data)+1}}}
    });

    // legend
    const leg=document.getElementById('chart-legend');
    leg.innerHTML=`
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${accent}"></div>Today</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:rgba(61,55,204,.35)"></div>Other days</div>`;

  } else {
    // Weekly trend: last 8 ISO weeks, completion %
    const today=new Date();
    const weeks=[];
    for(let w=7;w>=0;w--){
      const ref=new Date(today); ref.setDate(today.getDate()-w*7);
      weeks.push(getWeekDays(ref));
    }
    const labels=weeks.map((_,i)=>i===7?'This week':`${8-i}w ago`);
    const pctData=weeks.map(wk=>{
      const entries=wk.map(d=>hist.find(x=>x.date===dateKey(d))).filter(Boolean);
      if(!entries.length) return 0;
      const done=entries.reduce((s,e)=>s+e.done,0);
      const total=entries.reduce((s,e)=>s+e.total,0);
      return total?Math.round(done/total*100):0;
    });
    const avgData=weeks.map(wk=>{
      const entries=wk.map(d=>hist.find(x=>x.date===dateKey(d))).filter(Boolean);
      if(!entries.length) return 0;
      return Math.round(entries.reduce((s,e)=>s+e.done,0)/7*10)/10;
    });

    analyticsChart=new Chart(ctx,{
      type:'line',
      data:{
        labels,
        datasets:[
          { label:'Completion %', data:pctData, borderColor:accent, backgroundColor:'rgba(61,55,204,.08)', fill:true, tension:.35, pointRadius:4, pointBackgroundColor:accent, borderWidth:2 },
          { label:'Avg tasks/day', data:avgData, borderColor:green, backgroundColor:'transparent', fill:false, tension:.35, pointRadius:4, pointBackgroundColor:green, borderWidth:2, yAxisID:'y2' }
        ]
      },
      options:{
        ...commonOptions,
        scales:{
          x:commonOptions.scales.x,
          y:{...commonOptions.scales.y, max:100, ticks:{...commonOptions.scales.y.ticks, callback:v=>v+'%'}},
          y2:{position:'right', grid:{display:false}, ticks:{color:t3,font:{size:10,family:'DM Sans'}}, border:{display:false}, beginAtZero:true}
        }
      }
    });

    const leg=document.getElementById('chart-legend');
    leg.innerHTML=`
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${accent}"></div>Completion %</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background:${green}"></div>Avg tasks/day</div>`;
  }
  } catch (err) {
    console.error('Chart render failed:', err);
    if(wrapEl) wrapEl.innerHTML =
      '<div class="wempty" style="margin:0">Could not render chart: '+(err.message||err)+'</div>';
  }
}




function renderWeekly(){
  const done=active.filter(t=>t.status==='done');
  const we=document.getElementById('w-empty'),ws=document.getElementById('w-summary'),wf=document.getElementById('w-feed');
  if(!assigned){ we.classList.remove('hidden'); ws.classList.add('hidden'); wf.innerHTML=''; return; }
  we.classList.add('hidden'); ws.classList.remove('hidden');
  const pct=Math.round(done.length/assigned*100);
  document.getElementById('w-pct').textContent=pct+'%';
  let narr;
  if(!done.length) narr=`${assigned} task${assigned>1?'s':''} planned. Mark them done as you go.`;
  else if(pct<50)  narr=`Getting started - ${done.length} of ${assigned} tasks done. Keep going.`;
  else if(pct<80)  narr=`Good progress! ${done.length} of ${assigned} tasks completed this week.`;
  else if(pct<100) narr=`Almost there - ${done.length} of ${assigned} done. Strong week ahead.`;
  else             narr=`Excellent! All ${assigned} tasks completed. Outstanding week.`;
  document.getElementById('w-narr').textContent=narr;
  wf.innerHTML=done.map(t=>`
    <div class="witem fup">
      <i class="fa-solid fa-circle-check wcheck"></i>
      <span class="wname">${t.name}</span>
    </div>`).join('');
}


function showWeeklyNote(){
  document.getElementById('wn-btn').classList.add('hidden');
  document.getElementById('wn-area').classList.remove('hidden');
}

function renderSavedNotes(type){
  const c=document.getElementById(type==='daily'?'daily-saved-notes':'weekly-saved-notes');
  if(!c) return;
  c.innerHTML='';
  notes[type].forEach((n,i)=>{
    const d=document.createElement('div');
    d.className='saved-note fup';
    const meta=document.createElement('span');
    meta.className='saved-note-meta';
    meta.textContent=type==='daily'?'Saved daily note':'Saved weekly note';
    const body=document.createElement('span');
    body.textContent=n;
    const del=document.createElement('button');
    del.className='note-delete';
    del.type='button';
    del.setAttribute('aria-label','Delete note');
    del.innerHTML='<i class="fa-solid fa-trash"></i>';
    del.onclick=()=>deleteNote(type,i);
    d.appendChild(meta);
    d.appendChild(body);
    d.appendChild(del);
    c.appendChild(d);
  });
}

function deleteNote(type,i){
  notes[type].splice(i,1);
  saveNotes(type);
  renderSavedNotes(type);
  toast('Note deleted');
}

function doSubmit(type){
  const id=type==='daily'?'daily-note':'weekly-note';
  const el=document.getElementById(id);
  const val=el.value.trim();
  if(!val){ toast('Nothing to submit yet'); return; }
  notes[type].unshift(val);
  saveNotes(type);
  renderSavedNotes(type);
  el.value='';
  toast(type==='daily'?'Daily note saved':'Weekly note saved');
  if(touring && type==='daily' && step===4) advTour(5);
  if(touring && type==='weekly' && step===6) endTour();
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


const STEPS=[
  {title:"Add today's tasks",    text:"Tap the + button to see tasks your supervisor has assigned. Pick which ones you'll work on today."},
  {title:"Select and confirm",   text:"Tap one or more tasks you want to work on today. When you are happy with your selection, slide to confirm your plan."},
  {title:"Track your progress",  text:"Tap a task's badge to update its status: Pending to Working to Done. Tap again to cycle back if needed.",   btnLabel:'Got it'},
  {title:"Daily note",           text:"Write a short note each day - tasks completed, blockers, or observations. Submit a note to continue.",btnLabel:'Got it'},
  {title:"Weekly report",        text:"This fills automatically from your completed tasks. Your completion rate and task list are tracked here.",btnLabel:'Got it'},
  {title:"Weekly note",          text:"Here is an optional weekly note for adding context to the weekly report. Submit one to finish, or finish the tour.",  btnLabel:'Finish tour'},
];
const scrims={top:document.getElementById('s-top'),bot:document.getElementById('s-bot'),left:document.getElementById('s-left'),right:document.getElementById('s-right')};
const tutEl=document.getElementById('tut');

function startTour(){
  touring=true; hideBanner();
  Object.values(scrims).forEach(s=>s.style.display='block');
  tutEl.style.display='block';
  step=1; renderStep();
  requestAnimationFrame(syncTour);
}

function advTour(s){ step=s; renderStep(); }

function renderStep(){
  const s=STEPS[step-1];
  if(!s){ endTour(); return; }
  document.getElementById('tut-title').textContent=s.title;
  document.getElementById('tut-text').textContent=s.text;
  const next=document.getElementById('tut-next');
  next.textContent=s.btnLabel||'Next';
  s.btnLabel ? next.classList.remove('hidden') : next.classList.add('hidden');
  const ids=['add-btn','plan-card','active-list','note-card','report-card','weekly-note-section'];
  if(focusEl) focusEl.classList.remove('tour-focus');
  tgt=document.getElementById(ids[step-1]);
  focusEl=tgt;
  focusEl.classList.add('tour-focus');
  tgt.scrollIntoView({behavior:'smooth',block:step>=5?'end':'center'});
}

function tutNext(){
  if(step<=2) return;
  if(step>=STEPS.length){ endTour(); return; }
  step++; renderStep();
}

function syncTour(){
  if(!touring||!tgt) return;
  const raw=tgt.getBoundingClientRect(), w=window.innerWidth, h=window.innerHeight;
  const r={top:Math.max(0,raw.top),bottom:Math.min(h,raw.bottom),left:Math.max(0,raw.left),right:Math.min(w,raw.right)};
  r.width=Math.max(0,r.right-r.left); r.height=Math.max(0,r.bottom-r.top);
  scrims.top.style.cssText='display:block;inset:0;width:100vw;height:100vh;top:0;left:0';
  scrims.bot.style.display='none';
  scrims.left.style.display='none';
  scrims.right.style.display='none';
  const tipH=tutEl.offsetHeight||160;
  const gap=14;
  const margin=12;
  const spaceAbove=r.top-margin;
  const spaceBelow=h-r.bottom-margin;
  let top;
  if(spaceBelow>=tipH+gap){
    top=r.bottom+gap;
  }else if(spaceAbove>=tipH+gap){
    top=r.top-tipH-gap;
  }else{
    top=Math.max(margin, Math.min(h-tipH-margin, r.top-tipH-gap));
  }
  tutEl.style.bottom='auto';
  tutEl.style.top=top+'px';
  tutEl.style.left='50%'; tutEl.style.transform='translateX(-50%)';
  requestAnimationFrame(syncTour);
}

function endTour(){
  touring=false;
  Object.values(scrims).forEach(s=>s.style.display='none');
  if(focusEl) focusEl.classList.remove('tour-focus');
  focusEl=null;
  tutEl.style.display='none';
}
