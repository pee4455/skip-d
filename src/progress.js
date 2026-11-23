/* Progress tab: charts, calendar and the day sheet. */
import { HAS_GSAP, REDUCE } from './config';
import { L, fmtDate, t } from './i18n';
import { S } from './store';
import { $, addDays, baht, celebrate, countTo, cssVar, fastHours, fromKey, icon, keyOf, mondayOf, nightKey, nightSaving, saved } from './util';
import { setStatus } from './checkin';
import { tab } from './app';

/* ---------- render: progress ---------- */
let calMonth = (()=>{ const d=fromKey(nightKey()); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let weekChart=null, saveChart=null;
export function destroyCharts(){ weekChart?.destroy(); saveChart?.destroy(); weekChart=saveChart=null; }

export function renderProgress(){
  const tn=fromKey(nightKey()), y=tn.getFullYear(), m=tn.getMonth();
  const entries = Object.entries(S.log).filter(([k])=>{ const d=fromKey(k); return d.getFullYear()===y && d.getMonth()===m; });
  const good = entries.filter(([,s])=>s==='ok'||s==='light').length;
  countTo($('pmNights'), entries.filter(([,s])=>s==='ok').length, undefined, 'nights');
  if(entries.length) countTo($('pmRate'), Math.round(good/entries.length*100), v=>Math.round(v)+'%');
  else { $('pmRate').textContent='–'; delete $('pmRate').dataset.v; }
  countTo($('pmSaved'), entries.reduce((a,[,s])=>a+nightSaving(s),0), baht);
  if(tab==='progress') renderCharts(tn);
  renderCal(); renderFeed();
}

function gradFill(ctx, area, a, b){ const g=ctx.createLinearGradient(0,area.bottom,0,area.top); g.addColorStop(0,a); g.addColorStop(1,b); return g; }

export function renderCharts(tonight){
  if(!window.Chart) return;
  const th = { muted:cssVar('--muted'), line:cssVar('--line'), light:cssVar('--light'), card:cssVar('--card'), ink:cssVar('--ink') };
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Inter","IBM Plex Sans Thai",sans-serif';
  Chart.defaults.color = th.muted;
  const tooltip = { backgroundColor:th.ink, titleColor:th.card, bodyColor:th.card, padding:10, cornerRadius:10, displayColors:false };

  // weekly bars (last 8 weeks)
  const mon=mondayOf(tonight), labels=[], ok=[], li=[];
  for(let w=7; w>=0; w--){
    const ws=addDays(mon,-7*w); let o=0, l=0;
    for(let i=0;i<7;i++){ const s=S.log[keyOf(addDays(ws,i))]; if(s==='ok') o++; else if(s==='light') l++; }
    labels.push(w===0 ? t('thisWk') : fmtDate(ws)); ok.push(o); li.push(l);
  }
  const avg = Math.round(ok.slice(4).reduce((a,b)=>a+b,0)/4*10)/10;
  countTo($('weekAvg'), avg, v=>(Math.round(v*10)/10).toLocaleString(L().locale,{minimumFractionDigits:1,maximumFractionDigits:1}), 'perWk');
  if(weekChart){ weekChart.data.labels=labels; weekChart.data.datasets[0].data=ok; weekChart.data.datasets[1].data=li; weekChart.update(); }
  else weekChart = new Chart($('weekChart'), {
    type:'bar',
    data:{ labels, datasets:[
      { label:t('stOk'), data:ok, borderRadius:7, borderSkipped:false, barPercentage:.58, categoryPercentage:.9,
        backgroundColor:c=>{ const {ctx,chartArea}=c.chart; return chartArea ? gradFill(ctx,chartArea,'#ff3d00','#ff9a62') : '#ff5a1f'; } },
      { label:t('stLight'), data:li, borderRadius:7, borderSkipped:false, barPercentage:.58, categoryPercentage:.9, backgroundColor:th.light },
    ]},
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:REDUCE?0:900, easing:'easeOutQuart'},
      plugins:{ legend:{display:false}, tooltip },
      scales:{ x:{ stacked:true, grid:{display:false}, border:{display:false}, ticks:{font:{size:10}, maxRotation:0, autoSkip:true, maxTicksLimit:5} },
               y:{ stacked:true, min:0, max:7, ticks:{stepSize:7, font:{size:10}}, grid:{color:th.line}, border:{display:false} } } }
  });

  // cumulative savings, last 30 days
  const sLabels=[], sData=[], keys=Object.keys(S.log).sort(), start=addDays(tonight,-29);
  let run=0, ki=0;
  while(ki<keys.length && keys[ki]<keyOf(start)){ run+=nightSaving(S.log[keys[ki]]); ki++; }
  for(let i=0;i<30;i++){
    const d=addDays(start,i), k=keyOf(d);
    while(ki<keys.length && keys[ki]<=k){ run+=nightSaving(S.log[keys[ki]]); ki++; }
    sLabels.push(fmtDate(d)); sData.push(run);
  }
  countTo($('saveTotal'), saved(), baht);
  if(saveChart){ saveChart.data.labels=sLabels; saveChart.data.datasets[0].data=sData; saveChart.update(); }
  else saveChart = new Chart($('saveChart'), {
    type:'line',
    data:{ labels:sLabels, datasets:[{ data:sData, borderColor:'#ff5a1f', borderWidth:2.5, tension:.38, pointRadius:0, pointHoverRadius:5,
      pointHoverBackgroundColor:'#ff5a1f', pointHoverBorderColor:'#fff', pointHoverBorderWidth:2, fill:true,
      backgroundColor:c=>{ const {ctx,chartArea}=c.chart; return chartArea ? gradFill(ctx,chartArea,'rgba(255,90,31,0)','rgba(255,90,31,.28)') : 'rgba(255,90,31,.15)'; } }]},
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:REDUCE?0:1100, easing:'easeOutQuart'},
      interaction:{mode:'index', intersect:false},
      plugins:{ legend:{display:false}, tooltip:{...tooltip, callbacks:{label:c=>baht(c.parsed.y)}} },
      scales:{ x:{ grid:{display:false}, border:{display:false}, ticks:{font:{size:10}, maxRotation:0, maxTicksLimit:4} },
               y:{ beginAtZero:true, suggestedMax:Math.max(100, Number(S.settings.cost||0)*4), ticks:{font:{size:10}, maxTicksLimit:4, precision:0, callback:v=>'฿'+Number(v).toLocaleString(L().locale)}, grid:{color:th.line}, border:{display:false} } } }
  });
}

function renderCal(){
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  $('calTitle').textContent = L().monthYear(m,y,L());
  const tonight=fromKey(nightKey()), first=new Date(y,m,1,12), days=new Date(y,m+1,0).getDate();
  const lead=(first.getDay()+6)%7;
  const cal=$('cal'); cal.innerHTML = L().weekHead.map(d=>`<div class="wd">${d}</div>`).join('') + '<div class="blank"></div>'.repeat(lead);
  for(let i=1;i<=days;i++){
    const d=new Date(y,m,i,12), k=keyOf(d), s=S.log[k], future=d>tonight;
    const b=document.createElement('div');
    b.innerHTML = `<button class="dotday press ${s||''} ${k===keyOf(tonight)?'today':''} ${future?'future':''}" ${future?'disabled':''} aria-label="${fmtDate(d)}">${i}</button>`;
    if(!future) b.firstChild.onclick = ()=>openSheet(k);
    cal.appendChild(b);
  }
  const nextMonth = new Date(y,m+1,1);
  $('calNext').disabled = nextMonth > tonight; $('calNext').style.opacity = nextMonth > tonight ? .3 : 1;
}

function renderFeed(){
  const keys = Object.keys(S.log).sort().reverse().slice(0,12);
  if(!keys.length){ $('feed').innerHTML = `<div class="empty">${t('empty')}</div>`; return; }
  const T = { ok:'feedOk', light:'feedLight', miss:'feedMiss' };
  const I = { ok:'check', light:'coffee', miss:'utensils-crossed' };
  $('feed').innerHTML = keys.map(k=>{
    const s=S.log[k], d=fromKey(k);
    const fights = S.sessions.filter(x=>nightKey(new Date(x.t))===k).length;
    const sub = `${L().daysShort[d.getDay()]} ${fmtDate(d)}` + (s==='ok'?` · ${fastHours()}`:'') + (fights?` · ${t('feedFights',{n:fights})}`:'');
    const r = nightSaving(s) ? '+'+baht(nightSaving(s)) : '';
    return `<div class="row"><div class="ic ${s}">${icon(I[s])}</div><div class="t"><b>${t(T[s])}</b><span>${sub}</span></div><div class="r num">${r}</div></div>`;
  }).join('');
}

/* ---------- action sheet ---------- */
let sheetKey=null;
function openSheet(k){
  sheetKey=k; const d=fromKey(k);
  $('sheetTitle').textContent = `${L().days[d.getDay()]} · ${fmtDate(d)}`;
  document.querySelectorAll('#sheet [data-s]').forEach(b=>b.classList.toggle('cur', !!b.dataset.s && b.dataset.s===S.log[k]));
  $('sheetClear').style.display = S.log[k] ? '' : 'none';
  $('sheet').classList.add('open');
  if(HAS_GSAP){ gsap.fromTo('#sheetBg',{opacity:0},{opacity:1,duration:.25}); gsap.fromTo('#sheetPanel',{y:'110%'},{y:0,duration:.45,ease:'power4.out'}); }
}
function closeSheet(){
  if(!HAS_GSAP){ $('sheet').classList.remove('open'); return; }
  gsap.to('#sheetBg',{opacity:0,duration:.2});
  gsap.to('#sheetPanel',{y:'110%',duration:.3,ease:'power3.in',onComplete:()=>$('sheet').classList.remove('open')});
}
document.querySelectorAll('#sheet [data-s]').forEach(b=>b.onclick=()=>{
  const s=b.dataset.s||undefined, k=sheetKey; closeSheet();
  if(S.log[k]!==s){ setStatus(k,s); if(s==='ok') celebrate(.5); }
});
$('sheetBg').onclick = closeSheet; $('sheetCancel').onclick = closeSheet;
$('calPrev').onclick=()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1); renderCal(); };
$('calNext').onclick=()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1); renderCal(); };
