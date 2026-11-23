/* The city: skyline per night, materials, building, monthly postcard. */
import { L, lang, t } from './i18n';
import { S, save } from './store';
import { $, celebrate, closeModal, countStatus, escHTML, fromKey, icon, keyOf, nightKey, openModal, pad, toast } from './util';
import { CHARS, CHAR_BY_ID, buddySVG, charSVG } from './chars';
import { renderCityFx } from './shop';

/* ---------- city: one plot per night of this month ----------
   fasted → a tower (every 7th night in a row → a landmark), light → a small house,
   missed → an empty lot, tonight (not logged yet) → a crane waiting to build. */
const CITY_TONES = ['#2c3150','#36304f','#2a3d4f','#3d3045','#2f2f45','#283a44'];
export const cityHash = k => { let h=2166136261; for(const c of k) h=Math.imul(h ^ c.charCodeAt(0), 16777619); return (h>>>0)/4294967296; };
let cityBuilt = null;   // keys already standing, so only new buildings play the rise animation
(function cityStars(){
  let h='';
  for(let i=0;i<30;i++){ const r=cityHash('star'+i), r2=cityHash('s2'+i), x=(r*318+1).toFixed(1), y=(r2*120+6).toFixed(1);
    h+=`<circle cx="${x}" cy="${y}" r="${(.5+r*.8).toFixed(2)}" opacity="${(.35+r2*.5).toFixed(2)}" class="${i%3?'':'tw'}" style="animation-delay:${(r*2.6).toFixed(2)}s"/>`; }
  $('cityStars').innerHTML = h;
})();
/* builds the skyline markup for any month; A = animation bookkeeping (live view only) */
const ymOf = ts => nightKey(new Date(ts)).slice(0,7);
const monthRuns = ym => S.runs.filter(r=>ymOf(r.at)===ym);
const monthCravings = ym => S.sessions.filter(x=>ymOf(x.t)===ym).length;
const tonightResisted = () => { const k=nightKey(); return S.sessions.some(x=>nightKey(new Date(x.t))===k); };
function buildCity(y, m, tonight, A, postcard){
  const n=new Date(y,m+1,0).getDate(), ym=`${y}-${pad(m+1)}`, G=211, slot=312/n;
  const runs=monthRuns(ym), km=runs.reduce((a,r)=>a+r.dist,0), elev=runs.reduce((a,r)=>a+(r.elev||0),0), cv=monthCravings(ym);
  let out='', towers=0, houses=0, ok=0, run=0;
  const tops=[];
  // hills behind the city grow with this month's treadmill climb
  if(elev>0){
    const h=Math.min(48, 8+elev/8), h2=h*.7;
    out += `<path class="hill far" d="M0 ${G} C30 ${G-h2} 70 ${G-h2*.4} 110 ${G-h2*.8} S190 ${G-h2*.3} 230 ${G-h2} S300 ${G-h2*.5} 320 ${G-h2*.6} V${G}Z"/>`;
    out += `<path class="hill" d="M0 ${G-h*.5} C40 ${G-h} 80 ${G-h*.3} 130 ${G-h*.6} S220 ${G-h} 270 ${G-h*.45} S320 ${G-h*.8} 320 ${G-h*.8} V${G}H0Z"/>`;
  }
  // a food monster lurks over the city on nights you have not fought a craving yet
  if(!postcard && tonight && !tonightResisted()) out += `<g class="monster" transform="translate(238 ${G-64})"><g class="peek"><path d="M0 20 q0 -20 10 -20 q10 0 10 20 l-3.3 -3 -3.3 3 -3.4 -3 -3.3 3 -3.4 -3z" fill="#7a4fd8"/><circle cx="6.5" cy="8" r="2.4" fill="#fff"/><circle cx="13.5" cy="8" r="2.4" fill="#fff"/><circle cx="7.2" cy="8.5" r="1.1" fill="#2b1d16"/><circle cx="14.2" cy="8.5" r="1.1" fill="#2b1d16"/><path d="M6 13.5 l1.6 1.6 1.6 -1.6 1.6 1.6 1.6 -1.6 1.6 1.6" stroke="#fff" stroke-width=".9" fill="none"/><path d="M21 7 l5 -5 M23.5 1.5 v3.5 M25.8 -.4 v3.5" stroke="#c9c9cf" stroke-width="1.1" fill="none" stroke-linecap="round"/></g></g>`;
  for(let d=1; d<=n; d++){
    const k=keyOf(new Date(y,m,d,12)), st=S.log[k], r=cityHash(k), x=4+(d-1)*slot, w=Math.max(4, slot-1.3), cx=x+w/2;
    run = st==='ok'||st==='light' ? run+1 : 0;
    if(st==='ok') ok++;
    const grow = id=>{ if(!A) return ''; A.now.add(id); return A.seen.has(id) && !A.first ? '' : ` rise" data-d="${A.first ? (d*.03).toFixed(2) : '.1'}`; };
    const upg = st==='light' && S.city.up[k];   // a light-night house upgraded with bricks
    if(st==='ok' || upg){
      towers++;
      const land = st==='ok' && run%7===0, h = land ? 70 : Math.round((upg ? 26 : 30)+r*(upg ? 18 : 26)), top=G-h, tone = upg ? '#5b4034' : CITY_TONES[Math.floor(r*CITY_TONES.length)];
      let extra='';
      if(land) extra = `<path class="emblem" d="M${cx+1.5} ${top-14} a5 5 0 1 0 4 7.5 a3.9 3.9 0 1 1 -4 -7.5z"/><line class="ant" x1="${cx}" y1="${top}" x2="${cx}" y2="${top-5}"/>`;
      else if(r>.72) extra = `<line class="ant" x1="${cx}" y1="${top}" x2="${cx}" y2="${top-8}"/><circle class="blink" cx="${cx}" cy="${top-8.5}" r="1.1"/>`;
      else if(r<.25) extra = `<rect class="roof" x="${x+w*.2}" y="${top-6}" width="${w*.6}" height="6"/>`;
      tops.push({ x:x+1.2, top: r<.25 ? top-6 : top, h, k });
      out += `<g class="bld${grow('t'+k)}" style="--bc:${land ? '#4a3a6a' : tone}">${extra}<rect class="body" x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${h}" rx="1"/><rect class="wins ${r>.5?'b':''}" x="${(x+.5).toFixed(1)}" y="${top+3}" width="${(w-1).toFixed(1)}" height="${h-6}"/></g>`;
    } else if(st==='light'){
      houses++;
      const h=Math.round(10+r*6), top=G-h;
      out += `<g class="bld house${grow('h'+k)}" style="--bc:#6a4f3c"><path class="roof" d="M${(x-.5).toFixed(1)} ${top} L${cx.toFixed(1)} ${top-6} L${(x+w+.5).toFixed(1)} ${top}Z"/><rect class="body" x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${h}"/><rect class="hw" x="${(cx-1.2).toFixed(1)}" y="${top+3}" width="2.4" height="2.6"/></g>`;
    } else if(st==='miss'){
      out += S.shop.frozen[k] ? `<g class="ice"><rect x="${x.toFixed(1)}" y="${G-7}" width="${w.toFixed(1)}" height="7" rx="1.5"/><path d="M${(x+1.2).toFixed(1)} ${G-5.5} h${(w*.4).toFixed(1)}"/></g>`
        : `<path class="lot" d="M${x.toFixed(1)} ${G} q${(w/2).toFixed(1)} -4 ${w.toFixed(1)} 0z"/>`;
    } else if(tonight && k===tonight){
      out += `<g class="crane"><line x1="${cx}" y1="${G}" x2="${cx}" y2="${G-46}"/><line x1="${cx-7}" y1="${G-44}" x2="${cx+16}" y2="${G-44}"/><line x1="${cx+13}" y1="${G-44}" x2="${cx+13}" y2="${G-32}"/><path d="M${cx} ${G-46} L${cx+16} ${G-44}"/><circle class="blink" cx="${cx}" cy="${G-48}" r="1.5"/></g>`;
    } else if(!tonight || k>tonight){
      out += `<rect class="plot" x="${x.toFixed(1)}" y="${G-1.5}" width="${w.toFixed(1)}" height="1.5"/>`;
    }
  }
  // every craving you fought off this month plants a victory flag on a tower (tallest first)
  tops.sort((a,b)=>b.h-a.h).slice(0, cv).forEach((tp,i)=>{
    out += `<g class="flag"><line x1="${tp.x.toFixed(1)}" y1="${tp.top}" x2="${tp.x.toFixed(1)}" y2="${tp.top-10}"/><path class="pennant" style="animation-delay:-${(i*.37).toFixed(2)}s" d="M${tp.x.toFixed(1)} ${tp.top-10} l7 2 -7 2z"/></g>`;
  });
  out += cityFront(ym, A);
  // the street gets paved as you run: 20 km this month paves all of it
  const pw = Math.min(1, km/20)*320;
  let road = '';
  if(pw>0){
    road = `<rect class="road" x="0" y="211.5" width="${pw.toFixed(1)}" height="8.5"/><line class="lane" x1="2" y1="215.8" x2="${Math.max(2,pw-2).toFixed(1)}" y2="215.8"/>`;
    if(pw<320) road += `<path class="cone" d="M${(pw+3).toFixed(1)} 219 l2.2 -6 2.2 6z"/>`;
  }
  return { html:out, road, towers, houses, ok, km, elev, cv, ym };
}
export function renderCity(){
  const tn=fromKey(nightKey()), y=tn.getFullYear(), m=tn.getMonth();
  const A = { first:cityBuilt===null, seen:cityBuilt||new Set(), now:new Set() };
  const c = buildCity(y, m, keyOf(tn), A);
  $('skyline').innerHTML = c.html;
  $('cityRoad').innerHTML = c.road;
  renderCityFx();
  $('skyline').querySelectorAll('[data-d]').forEach(g=>g.style.setProperty('--d', g.dataset.d+'s'));
  cityBuilt = A.now;
  const month = L().monthsLong[m];
  const w = cityWallet();
  $('cityCap').innerHTML = (c.towers||c.houses ? t('cityCap',{m:month, b:`<b>${c.towers}</b>`, h:`<b>${c.houses}</b>`}) : t('cityEmpty'))
    + ` <span class="cap-mat">${icon('brick')}${w.brick}</span>${icon('chevron-right')}`;
  cityStats = { month, towers:c.towers, houses:c.houses, km:c.km, cv:c.cv };
  if($('citySheet').classList.contains('open')) renderCitySheet();
}

/* ---- city materials: fasted night = 2 bricks, light night = 1 wood (3 wood → 1 brick) ----
   Earned amounts come from the log, so editing a night fixes the wallet too; only spending is stored. */
let cityStats = { month:'', towers:0, houses:0 };
const DECOR = { tree:{cost:1, icon:'tree'}, lamp:{cost:1, icon:'lamp'}, fountain:{cost:4, icon:'fountain'} };
const DECOR_SLOTS = 10, UPGRADE_COST = 3;
const cityMonth = () => nightKey().slice(0,7);
export function cityWallet(){
  const c=S.city;
  return { brick: Math.max(0, countStatus('ok')*2 + (c.crafted||0) + 5*(S.shop.owned.bricks||0) - (c.brickUsed||0)), wood: Math.max(0, countStatus('light') - (c.woodUsed||0)) };
}
function monthDecor(ym=cityMonth()){
  const out=[]; for(let i=0;i<DECOR_SLOTS;i++){ const v=S.city.decor[ym+':'+i]; if(v) out[i]=v; } return out;
}
function upgradableHouses(){
  const ym=cityMonth(); return Object.keys(S.log).filter(k=>k.startsWith(ym) && S.log[k]==='light' && !S.city.up[k]).sort();
}
function cityResidents(){
  const b = S.gacha.buddy && S.gacha.owned[S.gacha.buddy] ? CHAR_BY_ID[S.gacha.buddy] : null;
  const seed = nightKey();   // a different crowd strolls by each day
  const others = CHARS.filter(c=>S.gacha.owned[c.id] && c!==b).sort((a,c)=>cityHash(seed+a.id)-cityHash(seed+c.id));
  return { buddy:b, walkers:others.slice(0, b ? 3 : 4), total: CHARS.filter(c=>S.gacha.owned[c.id]).length };
}
/* foreground street: decorations, the buddy's house, and residents walking up and down */
function cityFront(ym, A){
  const G=211;
  let out='';
  monthDecor(ym).forEach((type,i)=>{
    if(!type) return;
    const x = 12 + i*27 + (i%2)*4, id='d'+ym+i;
    if(A) A.now.add(id);
    const cls = !A || (A.seen.has(id) && !A.first) ? '' : ' rise';
    if(type==='tree') out += `<g class="deco${cls}"><rect x="${x-.8}" y="${G-6}" width="1.6" height="6" fill="#6b4a2a"/><circle cx="${x}" cy="${G-10}" r="5" fill="#2f8f4e"/><circle cx="${x-2.5}" cy="${G-8}" r="3.4" fill="#3fae5f"/><circle cx="${x+2.6}" cy="${G-8.5}" r="3.2" fill="#37a056"/></g>`;
    else if(type==='lamp') out += `<g class="deco lamp${cls}"><line x1="${x}" y1="${G}" x2="${x}" y2="${G-15}" stroke="#8a8aa0" stroke-width="1.1"/><path d="M${x-2.6} ${G-15} h5.2 l-1 -2.4 h-3.2z" fill="#8a8aa0"/><circle class="bulb" cx="${x}" cy="${G-14}" r="1.6"/><circle class="halo" cx="${x}" cy="${G-13}" r="7"/></g>`;
    else if(type==='fountain') out += `<g class="deco fountain${cls}"><path d="M${x-9} ${G-4} h18 v4 h-18z" fill="#7d8aa6"/><path class="jet" d="M${x} ${G-4} V${G-13} M${x} ${G-12} q-5 1 -7 8 M${x} ${G-12} q5 1 7 8"/><circle cx="${x}" cy="${G-14}" r="1.4" fill="#9fd8ff"/></g>`;
  });
  const res = cityResidents();
  const sprite = (ch, x, size) => charSVG(ch).replace('<svg ', `<svg x="${x}" y="${G-size}" width="${size}" height="${size}" `);
  if(res.buddy){
    const hx=298;
    out += `<g class="bhouse"><path d="M${hx-11} ${G-13} L${hx} ${G-22} L${hx+11} ${G-13}Z" fill="#ff6a5c"/><rect x="${hx-9}" y="${G-13}" width="18" height="13" fill="#f4e3cf"/><rect x="${hx-2.5}" y="${G-8}" width="5" height="8" rx="2.5" fill="#8a5a3a"/><path class="heart" d="M${hx} ${G-14.5} l-2.2 -2.1 a1.3 1.3 0 0 1 2.2 -1.6 a1.3 1.3 0 0 1 2.2 1.6z"/></g>`;
    out += `<g class="walker" transform="translate(268 0)" style="--a:262px;--b:276px;--dur:7s;--delay:-2s"><g class="hop">${buddySVG(res.buddy).replace('<svg ', `<svg x="0" y="${G-17}" width="17" height="17" `)}</g></g>`;
  }
  res.walkers.forEach((ch,i)=>{
    const r=cityHash(nightKey()+ch.id), a=Math.round(4+r*90+i*40), b=Math.min(res.buddy ? 236 : 296, a+70+Math.round(r*80)), dur=(12+r*10).toFixed(1);
    out += `<g class="walker" transform="translate(${a} 0)" style="--a:${a}px;--b:${b}px;--dur:${dur}s;--delay:-${(r*dur).toFixed(1)}s"><g class="hop">${sprite(ch, 0, 15)}</g></g>`;
  });
  return out;
}

/* ---- city sheet: wallet, crafting, building, residents ---- */
function renderCitySheet(){
  const w=cityWallet(), res=cityResidents(), up=upgradableHouses(), deco=monthDecor(), free=DECOR_SLOTS - deco.filter(Boolean).length;
  const cost = n => `<span>${icon('brick')}${t('costBricks',{n})}</span>`;
  const row = (ic, title, sub, act, ok) => `<div class="cs-row"><div class="ic">${icon(ic)}</div><div class="t"><b>${title}</b>${sub}</div><button class="press" data-act="${act}" ${ok?'':'disabled'}>${t('build')}</button></div>`;
  $('csBody').innerHTML = `
    <h3 class="rd-title" id="csH">${t('cityTitle',{m:cityStats.month})}</h3>
    <p class="cs-sub">${t('citySub',{b:cityStats.towers, h:cityStats.houses, r:res.total})}</p>
    <div class="cs-wallet">
      <div><div class="ic brick">${icon('brick')}</div><div><b class="num">${w.brick}</b><span>${t('brick')}</span></div></div>
      <div><div class="ic wood">${icon('wood')}</div><div><b class="num">${w.wood}</b><span>${t('wood')}</span></div></div>
    </div>
    <button class="cs-craft press" data-act="craft" ${w.wood>=3?'':'disabled'}>${icon('wood')}${t('craft')}</button>
    <div class="rd-h">${t('cityBuild')}<span>${t('slotsLeft',{n:free})}</span></div>
    <div class="cs-list">
      ${row('building', t('upHouse'), `${cost(UPGRADE_COST)}<span> · ${t('upHouseSub',{n:up.length})}</span>`, 'upgrade', up.length && w.brick>=UPGRADE_COST)}
      ${row('tree', t('dTree'), cost(DECOR.tree.cost), 'tree', free>0 && w.brick>=DECOR.tree.cost)}
      ${row('lamp', t('dLamp'), cost(DECOR.lamp.cost), 'lamp', free>0 && w.brick>=DECOR.lamp.cost)}
      ${row('fountain', t('dFountain'), cost(DECOR.fountain.cost), 'fountain', free>0 && w.brick>=DECOR.fountain.cost)}
    </div>
    <div class="rd-h">${t('residents')}<span>${res.total}</span></div>
    ${res.total ? `<div class="cs-res">${res.buddy ? `<div class="bud">${charSVG(res.buddy)}${t('buddyHome',{name:escHTML(res.buddy.name[lang])})}</div>` : ''}${res.walkers.map(c=>`<div>${charSVG(c)}${escHTML(c.name[lang])}</div>`).join('')}</div>` : `<p class="cs-note" style="margin-top:0">${t('noResidents')}</p>`}
    <button class="cs-craft cs-pc press" data-act="postcard">${icon('sparkles')}${t('pcTitle')}</button>
    <p class="cs-note">${t('cityHow')}</p>`;
}
export function openCitySheet(){ renderCitySheet(); openModal('citySheet'); }
function cityAct(act){
  if(act==='postcard'){ closeModal('citySheet'); setTimeout(()=>openPostcard(), 250); return; }
  const w=cityWallet(), c=S.city, ym=cityMonth();
  if(act==='craft'){ if(w.wood<3) return; c.woodUsed=(c.woodUsed||0)+3; c.crafted=(c.crafted||0)+1; toast(t('crafted')); }
  else if(act==='upgrade'){
    const k=upgradableHouses()[0]; if(!k || w.brick<UPGRADE_COST) return toast(t('noBricks'));
    c.up[k]=1; c.brickUsed=(c.brickUsed||0)+UPGRADE_COST; toast(t('builtToast'));
  } else if(DECOR[act]){
    const i=[...Array(DECOR_SLOTS).keys()].find(i=>!c.decor[ym+':'+i]);
    if(i===undefined) return;
    if(w.brick<DECOR[act].cost) return toast(t('noBricks'));
    c.decor[ym+':'+i]=act; c.brickUsed=(c.brickUsed||0)+DECOR[act].cost; toast(t('builtToast'));
  } else return;
  save(); renderCity(); renderCitySheet(); celebrate(.4);
}
$('csBody').addEventListener('click', e=>{ const b=e.target.closest('[data-act]'); if(b && !b.disabled) cityAct(b.dataset.act); });
$('city').onclick = $('cityCap').onclick = openCitySheet;
$('csClose').onclick = $('citySheetBg').onclick = ()=>closeModal('citySheet');

/* ---- monthly postcard: the month's city at night + its stats, as a shareable 1080×1350 image ---- */
let pcBlob = null, pcYm = '', pcJob = 0;
function postcardMonths(){
  const set = new Set([cityMonth()]);
  Object.keys(S.log).forEach(k=>set.add(k.slice(0,7)));
  S.runs.forEach(r=>set.add(ymOf(r.at)));
  return [...set].sort().reverse().slice(0,6);
}
const PC_PROPS = ['fill','stroke','stroke-width','opacity','fill-opacity','stroke-opacity','stop-color','stop-opacity','display','stroke-dasharray','stroke-linecap','stroke-linejoin'];
async function postcardBlob(ym){
  const [y, mo] = ym.split('-').map(Number), m = mo-1, isCur = ym===cityMonth();
  const c = buildCity(y, m, isCur ? keyOf(fromKey(nightKey())) : null, null, true);
  // draw the city off-screen inside a "night" hero so the CSS applies, then bake the computed styles in
  const stage = document.createElement('div'); stage.className = 'hero live pc-stage';
  const svg = $('city').querySelector('svg').cloneNode(true);
  stage.appendChild(svg); document.body.appendChild(stage);
  svg.querySelector('#skyline').innerHTML = c.html;
  svg.querySelector('#cityRoad').innerHTML = c.road;
  svg.querySelector('#celestial').setAttribute('transform', 'translate(262 58)');
  svg.querySelectorAll('.arc-track,.arc-fill,.clouds').forEach(e=>e.remove());
  const els = [svg, ...svg.querySelectorAll('*')];
  const baked = els.map(el=>{ const cs=getComputedStyle(el); return PC_PROPS.map(pr=>`${pr}:${cs.getPropertyValue(pr)}`).join(';'); });
  els.forEach((el,i)=>{ el.setAttribute('style', baked[i]); el.removeAttribute('class'); });
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '1000'); svg.setAttribute('height', '688');
  const str = new XMLSerializer().serializeToString(svg);
  stage.remove();
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  await img.decode();

  const W=1080, H=1350, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const x = cv.getContext('2d');
  const font = (w,sz) => `${w} ${sz}px "IBM Plex Sans Thai","Inter",-apple-system,system-ui,sans-serif`;
  try{ await Promise.all([document.fonts.load(font(700,72)), document.fonts.load(font(600,28))]); }catch(e){}
  const bg = x.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#17142e'); bg.addColorStop(1,'#09090d');
  x.fillStyle = bg; x.fillRect(0,0,W,H);
  const gl = x.createRadialGradient(W*.88,90,0,W*.88,90,560); gl.addColorStop(0,'rgba(255,90,31,.38)'); gl.addColorStop(1,'rgba(255,90,31,0)');
  x.fillStyle = gl; x.fillRect(0,0,W,H);
  x.fillStyle = '#ff9a62'; x.font = font(700,30); x.fillText(t('pcBrand'), 60, 110);
  x.fillStyle = '#fff'; x.font = font(700,72); x.fillText(`${t('cityTitle',{m:L().monthsLong[m]})} ${y}`, 60, 196);
  // city card
  const cx=40, cy=250, cw=1000, ch=688;
  x.save(); x.beginPath(); x.roundRect ? x.roundRect(cx, cy, cw, ch, 40) : x.rect(cx, cy, cw, ch); x.clip();
  x.fillStyle = '#121215'; x.fillRect(cx, cy, cw, ch); x.drawImage(img, cx, cy, cw, ch);
  x.restore();
  // stats
  const stats = [[c.towers, t('pcTowers')], [c.ok, t('pcNights')], [c.km.toFixed(1), t('pcKm')], [c.cv, t('pcFlags')]];
  stats.forEach(([v,label],i)=>{
    const sx = 60 + i*250;
    x.fillStyle = '#fff'; x.font = font(700,68); x.fillText(String(v), sx, 1070);
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = font(600,27); x.fillText(label, sx, 1114);
  });
  x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(60, 1180, W-120, 2);
  x.fillStyle = 'rgba(255,255,255,.5)'; x.font = font(600,28); x.fillText(t('pcFooter'), 60, 1250);
  return new Promise(r=>cv.toBlob(r, 'image/png'));
}
async function showPostcard(ym){
  pcYm = ym; const job = ++pcJob;
  $('pcMonths').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b.dataset.ym===ym));
  $('pcImg').parentElement.classList.add('busy');
  try{
    const blob = await postcardBlob(ym);
    if(job!==pcJob) return;
    pcBlob = blob;
    const old = $('pcImg').src; $('pcImg').src = URL.createObjectURL(blob); if(old.startsWith('blob:')) URL.revokeObjectURL(old);
  }catch(e){ console.warn('postcard failed', e); toast(t('pcFail')); }
  finally{ if(job===pcJob) $('pcImg').parentElement.classList.remove('busy'); }
}
export function openPostcard(){
  $('pcMonths').innerHTML = postcardMonths().map(ym=>{ const [y,m]=ym.split('-').map(Number); return `<button class="press" data-ym="${ym}">${L().monthsLong[m-1]} ${y}</button>`; }).join('');
  openModal('pcSheet');
  showPostcard(cityMonth());
}
$('pcMonths').onclick = e=>{ const b=e.target.closest('button'); if(b && b.dataset.ym!==pcYm) showPostcard(b.dataset.ym); };
$('pcShare').onclick = async ()=>{
  if(!pcBlob) return;
  const file = new File([pcBlob], `city-${pcYm}.png`, { type:'image/png' });
  try{
    if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:t('pcTitle') }); return; }
  }catch(e){ if(e.name==='AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(pcBlob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
};
$('pcClose').onclick = $('pcBg').onclick = ()=>closeModal('pcSheet');
