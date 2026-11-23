/* Treadmill runs: live screen, logging, Run tab. */
import { bestTime, buildRun as buildRunCore, durStr, kmStr, paceStr, parseDur, runPace, runXP, segTotals, splits } from './lib/run-math';
import { HAS_GSAP, REDUCE } from './config';
import { L, fmtDate, t } from './i18n';
import { S, save } from './store';
import { $, addDays, celebrate, closeModal, countTo, escHTML, gainXP, hms, hrsMin, icon, mondayOf, openModal, pop, toast } from './util';
import { checkBadges } from './badges';
import { renderAll, showTab } from './app';

/* ---------- treadmill runs ----------
   No GPS on a treadmill, so a run is the console settings over time: segments [t, km/h, incline%],
   each holding until the next one (t = seconds of moving time). Distance, pace, climb and calories
   are all derived from them, and fixing the totals after a run just rescales the segments. */
const RUN_KEY = 'skipdinner.run';          // the run in progress, kept on this device only
const RUN_PREFS = 'skipdinner.runPrefs';   // last speed/incline used, to start the next run there
const SPEED_CHIPS = [4,5,6,8,10,12], INCLINE_CHIPS = [0,1,2,4,6,8];
const r1 = v => Math.round(v*10)/10;
const runKg = () => Math.min(250, Math.max(25, Number(S.settings.weight)||60));
function runPrefs(){ try{ return JSON.parse(localStorage.getItem(RUN_PREFS)) || {}; }catch(e){ return {}; } }
export function totalKm(){ return (S.runs||[]).reduce((a,r)=>a+r.dist,0); }
export function dayStart(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
export function runsBetween(from, days){ const a=from.getTime(), b=addDays(from,days).getTime(); return S.runs.filter(r=>r.at>=a && r.at<b); }
function runTitle(r){ const d=new Date(r.at); return L().runTitle(d.getHours(), L().days[d.getDay()]); }
function runWhen(r){ const d=new Date(r.at); return `${fmtDate(d)} · ${d.toLocaleTimeString(L().locale,{hour:'2-digit',minute:'2-digit'})}`; }
/* started within an hour before closing time up to 4 hours after: running instead of dinner */
function isDinnerRun(r){ const d=new Date(r.at), [h,m]=S.settings.cutoff.split(':').map(Number), x=d.getHours()*60+d.getMinutes(), c=h*60+m; return x>=c-60 && x<=c+240; }

/* stepped speed line (+ incline) for a run, drawn in a w×h box */
function profileSVG(r, w, h, withInc){
  const T=r.dur||1, speeds=r.segs.map(s=>s[1]), maxS=Math.max(...speeds, 1), maxI=Math.max(...r.segs.map(s=>s[2]), 0);
  const lo=Math.min(...speeds)*.6;   // start the speed axis below the slowest speed so changes are visible
  const y = (v,a,b) => (h - (v-a)/((b-a)||1)*h*.86).toFixed(1);
  let line='', inc='';
  r.segs.forEach(([ts,sp,ic],k)=>{
    const x1=(ts/T*w).toFixed(1), x2=((k+1<r.segs.length ? r.segs[k+1][0] : T)/T*w).toFixed(1);
    line += `${k?'L':'M'}${x1} ${y(sp,lo,maxS)}H${x2}`;
    inc  += `${k?'L':'M'}${x1} ${y(Math.max(0,ic),0,maxI*1.25||1)}H${x2}`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="sp-area" d="${line}V${h}H0Z"/><path class="sp-line" d="${line}"/>${withInc && maxI>0 ? `<path class="inc-line" d="${inc}"/>` : ''}</svg>`;
}
/* saved runs use this device's body weight for calories */
export const buildRun = o => buildRunCore(o, runKg());
function commitRun(run){
  S.runs = S.runs.filter(r=>r.id!==run.id); S.runs.push(run); S.runs.sort((a,b)=>a.at-b.at);
  const xp=runXP(run.dist), sh=Math.floor(run.dist);
  gainXP(xp); S.gacha.shards += sh;
  checkBadges(); save(); renderAll();
  return { xp, sh };
}
function deleteRun(id){
  const r=S.runs.find(x=>x.id===id);
  if(!r || !confirm(t('runDeleteConfirm'))) return;
  S.runs = S.runs.filter(x=>x.id!==id); S.runDel[id]=Date.now();
  gainXP(-runXP(r.dist)); S.gacha.shards = Math.max(0, S.gacha.shards - Math.floor(r.dist));
  save(); renderAll(); closeModal('runSheet'); toast(t('runDeleted'));
}
/* vibrate only after a real tap, as browsers require */
function buzz(p){ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(p); }catch(e){} }
const newRunId = () => 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---- live run ---- */
function loadRun(){ try{ const r=JSON.parse(localStorage.getItem(RUN_KEY)); return r && Array.isArray(r.segs) && r.segs.length ? r : null; }catch(e){ return null; } }
function keepRun(){ try{ R ? localStorage.setItem(RUN_KEY, JSON.stringify(R)) : localStorage.removeItem(RUN_KEY); }catch(e){} }
export let R = loadRun(), wakeLock = null, runShow = 10, sumFeel = 0, logFeel = 0, kcalTouched = false;
const runT = (now=Date.now()) => R ? R.acc + (R.since ? (now-R.since)/1000 : 0) : 0;
const runNow = () => { const T=runT(); return { T, ...segTotals(R.segs, T, runKg()) }; };
const liveOpen = () => $('runLive').classList.contains('open');
async function wake(on){
  try{
    if(on && !wakeLock && 'wakeLock' in navigator){ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', ()=>{ wakeLock=null; }); }
    else if(!on && wakeLock){ const w=wakeLock; wakeLock=null; await w.release(); }
  }catch(e){}
}
function runSet(speed, incline){
  if(!R) return;
  speed = r1(Math.min(25, Math.max(0, speed))); incline = r1(Math.min(15, Math.max(-3, incline)));
  if(speed===R.speed && incline===R.incline) return;
  R.speed=speed; R.incline=incline;
  const now=Math.round(runT()), segs=R.segs, last=segs[segs.length-1];
  if(now-last[0] < 2){
    last[1]=speed; last[2]=incline;
    const prev=segs[segs.length-2]; if(prev && prev[1]===speed && prev[2]===incline) segs.pop();
  } else segs.push([now, speed, incline]);
  keepRun(); drawLive();
  try{ localStorage.setItem(RUN_PREFS, JSON.stringify({speed, incline})); }catch(e){}
}
export function startRun(){
  if(R){ openLive(); return; }
  const p=runPrefs(), sp=r1(p.speed ?? 6), inc=r1(p.incline ?? 1);
  R = { id:newRunId(), at:Date.now(), segs:[[0,sp,inc]], speed:sp, incline:inc, acc:0, since:null, km:0, kmT:0 };
  openLive();
  countdown(()=>{ if(!R) return; R.at=Date.now(); R.since=Date.now(); keepRun(); wake(true); drawLive(); });
}
function countdown(done){
  const el=$('rlCount');
  if(REDUCE){ done(); return; }
  const seq=[3,2,1,t('runGo')]; let i=0;
  el.classList.add('on');
  const step=()=>{
    if(i===seq.length){ el.classList.remove('on'); el.innerHTML=''; return; }
    el.innerHTML=`<span>${seq[i]}</span>`;
    if(HAS_GSAP) gsap.fromTo(el.firstChild,{scale:1.8,opacity:0},{scale:1,opacity:1,duration:.45,ease:'back.out(2)'});
    buzz(i===3?120:30);
    if(i===3) done();
    i++; setTimeout(step, i===4 ? 600 : 800);
  };
  step();
}
export function openLive(){
  if(!R) return;
  const el=$('runLive'); el.classList.remove('sum'); el.classList.add('open'); document.body.style.overflow='hidden';
  drawLive(); drawPill();
  if(HAS_GSAP) gsap.fromTo(el,{opacity:0,y:28},{opacity:1,y:0,duration:.4,ease:'power3.out',clearProps:'opacity,transform'});
  if(R.since) wake(true);
}
function closeLive(){ $('runLive').classList.remove('open','sum'); document.body.style.overflow=''; wake(false); renderRun(); drawPill(); }
function drawLive(){
  if(!R) return;
  const n=runNow(), paused=!R.since;
  $('rlTime').textContent = hms(n.T*1000);
  $('rlDist').textContent = kmStr(n.dist);
  $('rlPace').textContent = paceStr(R.speed>0 ? 3600/R.speed : NaN);
  $('rlKcal').textContent = Math.round(n.kcal);
  $('rlElev').textContent = Math.round(n.elev);
  $('rlSpeed').textContent = R.speed.toFixed(1);
  $('rlInc').textContent = R.incline.toFixed(1);
  document.querySelectorAll('#rlSpeedChips button').forEach(b=>b.classList.toggle('sel', Number(b.dataset.v)===R.speed));
  document.querySelectorAll('#rlIncChips button').forEach(b=>b.classList.toggle('sel', Number(b.dataset.v)===R.incline));
  $('runLive').classList.toggle('paused', paused);
  $('rlState').textContent = t(paused ? 'runPaused' : 'runOn');
}
function drawPill(){
  const p=$('runPill'), on=!!R && !liveOpen();
  p.classList.toggle('on', on);
  if(!on) return;
  p.classList.toggle('paused', !R.since);
  const n=runNow(); $('runPillText').textContent = `${hms(n.T*1000)} · ${kmStr(n.dist)} km`;
}
/* a toast + buzz at every full kilometre, like a running watch */
function checkSplit(){
  if(!R?.since) return;
  const n=runNow(), km=Math.floor(n.dist+1e-9), was=R.km||0;
  if(km<=was) return;
  const sec=n.T-(R.kmT||0);
  R.km=km; R.kmT=n.T; keepRun();
  if(km!==was+1) return;
  toast(t('runSplit',{n:km, p:paceStr(sec)}));
  buzz([60,40,60]);
  if(liveOpen()) pop($('rlDist').parentElement);
}
setInterval(()=>{ if(!R) return; checkSplit(); if(liveOpen()) drawLive(); drawPill(); }, 500);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && R?.since && liveOpen()) wake(true); });

$('rlSpeedChips').innerHTML = SPEED_CHIPS.map(v=>`<button type="button" class="press" data-v="${v}">${v}</button>`).join('');
$('rlIncChips').innerHTML = INCLINE_CHIPS.map(v=>`<button type="button" class="press" data-v="${v}">${v}</button>`).join('');
$('rlSpeedChips').onclick = e=>{ const b=e.target.closest('button'); if(b && R) runSet(Number(b.dataset.v), R.incline); };
$('rlIncChips').onclick = e=>{ const b=e.target.closest('button'); if(b && R) runSet(R.speed, Number(b.dataset.v)); };
/* −/+ step once on tap and keep stepping while held, like the console buttons */
document.querySelectorAll('#runLive [data-adj]').forEach(b=>{
  let hold=null, rep=null;
  const step=()=>{ if(!R) return; const d=Number(b.dataset.d); b.dataset.adj==='speed' ? runSet(R.speed+d, R.incline) : runSet(R.speed, R.incline+d); };
  const stop=()=>{ clearTimeout(hold); clearInterval(rep); hold=rep=null; };
  b.addEventListener('pointerdown', e=>{ e.preventDefault(); stop(); step(); hold=setTimeout(()=>{ rep=setInterval(step, 85); }, 420); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev, stop));
  b.addEventListener('click', e=>{ if(e.detail===0) step(); });   // keyboard
  b.addEventListener('contextmenu', e=>e.preventDefault());
});
$('rlPause').onclick = ()=>{ if(!R?.since) return; R.acc=runT(); R.since=null; keepRun(); wake(false); drawLive(); };
$('rlResume').onclick = ()=>{ if(!R || R.since) return; R.since=Date.now(); keepRun(); wake(true); drawLive(); };
$('rlMin').onclick = closeLive;
$('runPill').onclick = openLive;

/* ---- finish: confirm the numbers against the treadmill screen, then save ---- */
function drawFeel(id, val){ $(id).innerHTML = [1,2,3].map(v=>`<button type="button" class="press ${v===val?'sel':''}" data-v="${v}">${t('feel'+v)}</button>`).join(''); }
function sumDraft(){
  const dist=Number($('rsDist').value), dur=parseDur($('rsTime').value);
  return dist>0 && dur>0 ? buildRun({ id:R.id, at:R.at, segs:R.segs, rawDur:runT(), dur, dist, feel:sumFeel }) : null;
}
function drawSum(){
  const d = R && sumDraft();
  if(d && !kcalTouched) $('rsKcal').value = d.kcal;
  $('rsPace').textContent = d ? paceStr(runPace(d)) : '–:––';
  $('rsElev').innerHTML = d ? `${d.elev}<span class="u">m</span>` : '0';
  $('rsXP').textContent = '+' + (d ? runXP(d.dist) : 0);
}
function openSummary(){
  if(!R) return;
  if(R.since){ R.acc=runT(); R.since=null; keepRun(); }
  wake(false);
  const n=runNow();
  $('rsDist').value = kmStr(n.dist); $('rsTime').value = durStr(n.T); $('rsKcal').value = Math.round(n.kcal);
  sumFeel=0; kcalTouched=false; drawFeel('rsFeel', 0); drawSum();
  $('runLive').classList.add('sum'); $('runLive').scrollTop=0;
  if(HAS_GSAP) gsap.fromTo('#rlSum > *',{opacity:0,y:16},{opacity:1,y:0,duration:.45,stagger:.04,ease:'power3.out',clearProps:'opacity,transform'});
}
$('rlFinish').onclick = openSummary;
['rsDist','rsTime'].forEach(id=>$(id).addEventListener('input', drawSum));
$('rsKcal').addEventListener('input', ()=>{ kcalTouched = true; });
$('rsFeel').onclick = e=>{ const b=e.target.closest('button'); if(!b) return; sumFeel = sumFeel===Number(b.dataset.v) ? 0 : Number(b.dataset.v); drawFeel('rsFeel', sumFeel); };
$('rsSave').onclick = ()=>{
  if(!R) return;
  const dist=Number($('rsDist').value), dur=parseDur($('rsTime').value);
  if(!(dur>=60)) return toast(t('runTooShort'));
  if(!(dist>=0.01 && dist<=100 && dist/(dur/3600) <= 30)) return toast(t('runBadInput'));
  const kcal = kcalTouched ? Math.max(0, Math.round(Number($('rsKcal').value)||0)) : undefined;
  const run = buildRun({ id:R.id, at:R.at, segs:R.segs, rawDur:runT(), dur, dist, kcal, feel:sumFeel });
  R=null; keepRun();
  const rw = commitRun(run);
  closeLive(); showTab('run');
  toast(t('runSaved',{xp:rw.xp, s:rw.sh})); celebrate(1.1);
};
$('rsDiscard').onclick = ()=>{ if(!confirm(t('runDiscardConfirm'))) return; R=null; keepRun(); closeLive(); };
function openRunDetail(id){
  const r=S.runs.find(x=>x.id===id); if(!r) return;
  const sp=splits(r), whole=sp.filter(s=>!s.part), fast=Math.min(...whole.map(s=>s.sec));
  const cell=(k,v,u='')=>`<div><span class="k">${t(k)}</span><b class="num">${v}${u?`<small>${u}</small>`:''}</b></div>`;
  const splitRows = sp.map(s=>{ const pace=s.sec/(s.part||1); return `<div class="split ${!s.part && s.sec===fast && whole.length>1?'best':''}"><span class="km num">${s.km}</span><b class="num">${paceStr(pace)}</b><div class="bar"><i style="width:${Math.max(8, Math.min(100, (fast/pace)*100 || 100))}%"></i></div></div>`; }).join('');
  $('rdBody').innerHTML =
    `<h3 class="rd-title">${escHTML(runTitle(r))}</h3>
     <p class="rd-date">${L().days[new Date(r.at).getDay()]} · ${runWhen(r)}${r.manual?' · '+t('runManual'):''}${r.feel?' · '+t('feel'+r.feel):''}</p>
     <div class="rd-grid">
       ${cell('runDist', kmStr(r.dist), 'km')}${cell('runTime', durStr(r.dur))}${cell('runAvgPace', paceStr(runPace(r)), '/km')}
       ${cell('runAvgSpeed', (r.dist/(r.dur/3600)).toFixed(1), 'km/h')}${cell('runElev', r.elev||0, 'm')}${cell('runKcal', r.kcal||0, 'kcal')}
     </div>
     ${r.manual ? '' : `<div class="rd-h">${t('runProfile')}<span><span><i></i>${t('runSpeed')}</span>${Math.max(...r.segs.map(s=>s[2]))>0?`<span><i class="inc"></i>${t('runIncline')}</span>`:''}</span></div>
       <div class="rd-chart">${profileSVG(r, 320, 120, true)}</div><div class="rd-axis"><span>0:00</span><span>${durStr(r.dur)}</span></div>`}
     ${sp.length ? `<div class="rd-h">${t('runSplits')}<span>km · /km</span></div>${splitRows}` : ''}`;
  $('rdDel').onclick = ()=>deleteRun(id);
  openModal('runSheet');
}
$('rdClose').onclick = $('runSheetBg').onclick = ()=>closeModal('runSheet');
function openLog(){
  const d=new Date(); d.setSeconds(0,0);
  $('lgWhen').value = new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('lgWhen').max = $('lgWhen').value;
  ['lgMin','lgDist','lgKcal'].forEach(id=>$(id).value='');
  $('lgInc').value = runPrefs().incline ?? '';
  logFeel=0; drawFeel('lgFeel', 0);
  openModal('runLog');
}
$('lgFeel').onclick = e=>{ const b=e.target.closest('button'); if(!b) return; logFeel = logFeel===Number(b.dataset.v) ? 0 : Number(b.dataset.v); drawFeel('lgFeel', logFeel); };
$('lgSave').onclick = ()=>{
  const at=new Date($('lgWhen').value).getTime(), dur=Number($('lgMin').value)*60, dist=Number($('lgDist').value);
  const inc=Math.min(15, Math.max(-3, Number($('lgInc').value)||0)), kc=$('lgKcal').value.trim();
  if(!isFinite(at)) return toast(t('runBadInput'));
  if(at > Date.now()+60000) return toast(t('runFuture'));
  if(!(dur>=60)) return toast(t('runTooShort'));
  if(!(dist>=0.01 && dist<=100 && dist/(dur/3600) <= 30)) return toast(t('runBadInput'));
  const run = buildRun({ id:newRunId(), at, segs:[[0, dist/(dur/3600), r1(inc)]], rawDur:dur, dur, dist, kcal: kc==='' ? undefined : Math.max(0, Math.round(Number(kc)||0)), feel:logFeel, manual:true });
  const rw = commitRun(run);
  closeModal('runLog'); toast(t('runSaved',{xp:rw.xp, s:rw.sh})); celebrate(.8);
};
$('lgCancel').onclick = $('runLogBg').onclick = ()=>closeModal('runLog');

/* ---- Run tab ---- */
function runCard(r){
  const tags = (r.manual ? `<span class="rc-tag">${icon('pencil')}${t('runManual')}</span>` : '') + (isDinnerRun(r) ? `<span class="rc-tag dinner">${icon('moon-star')}${t('runDinner')}</span>` : '');
  return `<button class="card rcard press" data-run="${r.id}">
    <div class="rc-head"><div class="rc-ic">${icon('footprints')}</div><div class="t"><b>${escHTML(runTitle(r))}</b><span>${runWhen(r)}</span></div></div>
    ${tags ? `<div class="rc-tags">${tags}</div>` : ''}
    <div class="rc-stats">
      <div><span class="k">${t('runDist')}</span><b class="num">${kmStr(r.dist)}<small>km</small></b></div>
      <div><span class="k">${t('runPace')}</span><b class="num">${paceStr(runPace(r))}<small>/km</small></b></div>
      <div><span class="k">${t('runTime')}</span><b class="num">${durStr(r.dur)}</b></div>
    </div>
    ${r.manual ? '' : `<div class="rc-spark">${profileSVG(r, 300, 36, false)}</div>`}
  </button>`;
}
export function renderRun(){
  const now=new Date(), mon=dayStart(mondayOf(now)), week=runsBetween(mon, 7);
  const sum=(list,f)=>list.reduce((a,r)=>a+(f(r)||0),0);
  countTo($('rwKm'), sum(week,r=>r.dist), v=>v.toFixed(1));
  $('rwSub').textContent = t('runWeekSub',{ n:week.length, time:hrsMin(sum(week,r=>r.dur)*1000), m:Math.round(sum(week,r=>r.elev)) });
  const days=[...Array(7)].map((_,i)=>sum(runsBetween(addDays(mon,i),1), r=>r.dist)), dmax=Math.max(...days,1), today=(now.getDay()+6)%7;
  $('rwBars').innerHTML = days.map((km,i)=>`<div class="${i===today?'today':''}"><div class="bar"><i class="${km?'on':''}" style="height:${Math.max(5, Math.round(km/dmax*70))}px"></i></div><span>${L().daysShort[(i+1)%7]}</span></div>`).join('');

  $('runCta').classList.toggle('live', !!R);
  $('runCtaText').textContent = t(R ? 'runBack' : 'runStart');

  const wks=[...Array(12)].map((_,k)=>{ const a=addDays(mon,-7*(11-k)); return { a, km:sum(runsBetween(a,7), r=>r.dist) }; });
  const wmax=Math.max(...wks.map(w=>w.km),1);
  $('wk12').innerHTML = wks.map((w,k)=>`<div class="${k===11?'cur':''}"><div class="bar"><i class="${w.km?'on':''}" style="height:${Math.max(4, Math.round(w.km/wmax*84))}px"></i></div><span>${k%4===0 ? `${w.a.getDate()}/${w.a.getMonth()+1}` : ''}</span></div>`).join('');
  $('wk12Avg').textContent = t('runWeeksAvg',{ km:(sum(wks,w=>w.km)/12).toFixed(1) });

  const recs=[];
  if(S.runs.length){
    const top=f=>S.runs.reduce((b,r)=>f(r)>f(b)?r:b);
    const lg=top(r=>r.dist); recs.push({ ic:'footprints', k:'recLongest', v:`${kmStr(lg.dist)} km`, r:lg });
    for(const [m,k] of [[1000,'rec1k'],[5000,'rec5k'],[10000,'rec10k']]){
      let best=Infinity, br=null; S.runs.forEach(r=>{ const s=bestTime(r,m); if(s<best){ best=s; br=r; } });
      if(br) recs.push({ ic:'timer', k, v:durStr(best), r:br });
    }
    const cl=top(r=>r.elev||0); if(cl.elev>0) recs.push({ ic:'mountain', k:'recClimb', v:`${cl.elev} m`, r:cl });
    const ln=top(r=>r.dur); recs.push({ ic:'activity', k:'recLong', v:durStr(ln.dur), r:ln });
  }
  $('runRecs').innerHTML = recs.length
    ? recs.map(x=>`<div class="row press" data-run="${x.r.id}" role="button" tabindex="0"><div class="ic">${icon(x.ic)}</div><div class="t"><b>${t(x.k)}</b><span>${fmtDate(new Date(x.r.at))}</span></div><div class="r num">${x.v}</div></div>`).join('')
    : `<div class="empty">${t('recNone')}</div>`;

  countTo($('rtCount'), S.runs.length);
  countTo($('rtKm'), totalKm(), v=>v.toFixed(1));
  countTo($('rtHrs'), sum(S.runs,r=>r.dur)/3600, v=>v.toFixed(1));

  const list=S.runs.slice().sort((a,b)=>b.at-a.at);
  $('runCountAside').textContent = list.length ? t('runCountN',{n:list.length}) : '';
  $('runFeed').innerHTML = list.length
    ? list.slice(0,runShow).map(runCard).join('') + (list.length>runShow ? `<button class="more-btn press" id="runMore">${t('runMore')}</button>` : '')
    : `<div class="card empty">${t('runEmpty')}</div>`;
}
$('runCta').onclick = startRun;
$('runLogBtn').onclick = openLog;
$('runFeed').onclick = e=>{ if(e.target.closest('#runMore')){ runShow+=10; renderRun(); return; } const c=e.target.closest('[data-run]'); if(c) openRunDetail(c.dataset.run); };
$('runRecs').onclick = e=>{ const c=e.target.closest('[data-run]'); if(c) openRunDetail(c.dataset.run); };
$('runRecs').addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.dataset.run){ e.preventDefault(); openRunDetail(e.target.dataset.run); } });
