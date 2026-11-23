/* Gacha pulls, card reveal, Rewards tab. */
import { HAS_GSAP } from './config';
import { L, fmtDate, lang, t } from './i18n';
import { S, save } from './store';
import { $, addDays, celebrate, countTo, fromKey, icon, mondayOf, pop, toast } from './util';
import { checkBadges } from './badges';
import { CHARS, CHAR_BY_ID, PITY, SETS, SET_BY_ID, TIERS, TIER_ORDER, charSVG, ownedCount, tierIdx } from './chars';
import { allQuests, claimQuest, isClaimable, rewardChips, setQuest } from './quests';
import { coinsLeft } from './shop';
import { escapeHtml } from './tour';
import { renderAll, showTab } from './app';

export let questIndex = {};

/* ---------- gacha pulls ---------- */
let gBusy=false;
function rollTier(force){
  if(force) return Math.random()<.85 ? 'sr' : 'legend';
  let r=Math.random()*100;
  for(const k of TIER_ORDER){ r-=TIERS[k].rate; if(r<0) return k; }
  return 'salt';
}
function grant(tier){
  const g=S.gacha, pool=CHARS.filter(c=>c.tier===tier && !c.limited), ch=pool[Math.floor(Math.random()*pool.length)];
  const isNew=!g.owned[ch.id];
  g.owned[ch.id]=(g.owned[ch.id]||0)+1; g.pulls++;
  const shards=isNew?0:TIERS[tier].shard; g.shards+=shards;
  return { ch, tier, isNew, shards };
}
function pullOne(gold){
  const g=S.gacha, tier=rollTier(gold || g.pity>=PITY-1);
  g.pity = tierIdx(tier)>=3 ? 0 : g.pity+1;
  return grant(tier);
}
function pullTen(){
  const res=[]; for(let i=0;i<10;i++) res.push(pullOne(false));
  if(!res.some(r=>tierIdx(r.tier)>=2)){
    const last=res[9], g=S.gacha;
    g.owned[last.ch.id]--; if(!g.owned[last.ch.id]) delete g.owned[last.ch.id];
    g.shards-=last.shards; g.pulls--;
    res[9]=grant('rare');
  }
  return res;
}
async function startPull(kind){
  if(gBusy) return;
  const g=S.gacha, cost = kind==='ten' ? 10 : 1, fromStage=$('stage').classList.contains('open');
  if(kind==='gold'){ if(g.gold<1) return; g.gold--; }
  else if(g.tickets<cost){ toast(t('noTickets')); if(HAS_GSAP) gsap.fromTo('#machineSvg',{x:-6},{x:0,duration:.4,ease:'elastic.out(1,.3)'}); return; }
  else g.tickets-=cost;
  gBusy=true;
  const results = kind==='ten' ? pullTen() : [pullOne(kind==='gold')];
  checkBadges(); save(); renderRewards();
  if(!fromStage) await machineAnim();
  openStage(results);
}
function machineAnim(){
  if(!HAS_GSAP) return Promise.resolve();
  return new Promise(res=>{
    const tl=gsap.timeline({onComplete:res});
    tl.to('#knob',{rotation:'+=360', svgOrigin:'72 206', duration:.85, ease:'power2.inOut'},0)
      .to('#machineSvg',{x:'random(-4,4)', duration:.05, repeat:12, yoyo:true, repeatRefresh:true},0)
      .to('#domeCaps .cj',{y:'random(-10,4)', x:'random(-5,5)', rotation:'random(-30,30)', duration:.12, repeat:5, yoyo:true, repeatRefresh:true, stagger:.01},0)
      .set('#machineSvg',{x:0})
      .set('#domeCaps .cj',{x:0,y:0,rotation:0});
  });
}
function renderMachine(){
  const box=$('domeCaps'); if(box.childElementCount) return;
  const cols=['#f0f1f5','#f0f1f5','#5fd3e2','#5fd3e2','#a98bff','#ffd24d','#ff7a3d','#f0f1f5','#5fd3e2','#a98bff','#ff9fc8','#ffd24d','#5fd3e2','#f0f1f5','#a98bff','#ff7a3d'];
  let h='';
  for(let i=0;i<16;i++){
    const row=Math.floor(i/5), x=46+((i%5)*27)+(row%2?13:0), y=142-row*22-(Math.random()*4), a=Math.round(Math.random()*360);
    h+=`<g transform="translate(${x} ${y})"><g class="cj"><g transform="rotate(${a})"><circle r="12" fill="${cols[i]}"/><path d="M-12 0 a12 12 0 0 0 24 0z" fill="#fff"/><circle r="12" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/><ellipse cx="-4" cy="-6" rx="3.5" ry="2" fill="rgba(255,255,255,.7)"/></g></g></g>`;
  }
  box.innerHTML=h;
}

/* ---------- stage (capsule → card reveal) ---------- */
function stageReset(){
  $('reveal').innerHTML=''; $('multi').innerHTML=''; $('stageActions').innerHTML=''; $('stageHint').textContent='';
  $('burst').className='burst'; const cap=$('capsule');
  if(HAS_GSAP) gsap.set(cap,{clearProps:'all'});
  cap.querySelectorAll('.cap-top,.cap-bot').forEach(e=>e.removeAttribute('style'));
  cap.style.display='none'; cap.onclick=null;
}
function stageOpen(){
  stageReset();
  const st=$('stage');
  if(!st.classList.contains('open')){ st.classList.add('open'); document.body.style.overflow='hidden'; if(HAS_GSAP) gsap.fromTo(st,{opacity:0},{opacity:1,duration:.3}); }
}
function closeStage(){
  gBusy=false;
  const done=()=>{ $('stage').classList.remove('open'); stageReset(); document.body.style.overflow=''; renderAll(); };
  if(HAS_GSAP) gsap.to('#stage',{opacity:0,duration:.25,onComplete:()=>{ done(); gsap.set('#stage',{clearProps:'opacity'}); }}); else done();
}
function openStage(results){
  stageOpen();
  if(results.length===1) showCapsule(results[0]); else showMulti(results);
}
function flash(){ if(HAS_GSAP) gsap.fromTo('#stageFlash',{opacity:.85},{opacity:0,duration:.7,ease:'power2.out'}); }
function showCapsule(r){
  const real=r.tier, cap=$('capsule');
  let shown=real;
  if(tierIdx(real)>=3 && Math.random()<.5) shown = Math.random()<.5 ? 'common' : 'rare';
  else if(real==='legend' && Math.random()<.6) shown='sr';
  cap.dataset.tier=shown; cap.style.display='';
  $('stageHint').textContent=t('tapToOpen');
  if(HAS_GSAP) gsap.fromTo(cap,{y:-innerHeight*.7,rotation:-240,scale:.8},{y:0,rotation:0,scale:1,duration:1.1,ease:'bounce.out'});
  let busy=false;
  cap.onclick = async ()=>{
    if(busy) return; busy=true;
    if(cap.dataset.tier!==real){
      $('stageHint').textContent=t('tapAgain');
      if(HAS_GSAP){ await gsap.to(cap,{x:'random(-14,14)',rotation:'random(-18,18)',duration:.06,repeat:11,yoyo:true,repeatRefresh:true}); gsap.set(cap,{x:0,rotation:0}); }
      flash();
      const next = TIER_ORDER[Math.min(tierIdx(real), Math.max(tierIdx(cap.dataset.tier)+1, 3))];
      cap.dataset.tier=next;
      if(HAS_GSAP) gsap.fromTo(cap,{scale:1.4},{scale:1,duration:.6,ease:'back.out(3)'});
      if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(40); }catch(e){}
      if(next===real) $('stageHint').textContent=t('tapToOpen');
      busy=false; return;
    }
    await openCapsule(cap, r);
  };
}
async function openCapsule(cap, r){
  $('stageHint').textContent='';
  if(HAS_GSAP){
    await gsap.to(cap,{rotation:14,duration:.07,repeat:5,yoyo:true,ease:'power1.inOut'});
    gsap.set(cap,{rotation:0});
    gsap.to(cap.querySelector('.cap-top'),{y:-160,rotation:-50,opacity:0,duration:.6,ease:'power2.out'});
    gsap.to(cap.querySelector('.cap-bot'),{y:160,rotation:35,opacity:0,duration:.6,ease:'power2.out'});
    flash();
    await new Promise(res=>setTimeout(res,220));
  }
  cap.style.display='none';
  revealCard(r);
}
function quipFor(tier){
  if(tier==='salt'){ const q=L().saltQuips; return q[Math.floor(Math.random()*q.length)]; }
  return t('quip_'+tier);
}
function revealCard(r){
  const b=$('burst'); b.dataset.tier=r.tier; b.className='burst on';
  $('reveal').innerHTML = cardHTML(r.ch, { isNew:r.isNew, shards:r.shards, count:S.gacha.owned[r.ch.id], quip:quipFor(r.tier) });
  const card=$('reveal').querySelector('.gcard');
  if(HAS_GSAP){
    gsap.fromTo(card,{rotationY:180,scale:.4,opacity:0},{rotationY:0,scale:1,opacity:1,duration:.9,ease:'back.out(1.4)'});
    gsap.fromTo('#reveal .gc-under',{opacity:0,y:10},{opacity:1,y:0,duration:.4,delay:.6});
  }
  const ti=tierIdx(r.tier);
  if(ti>=3) celebrate(ti===4?2.2:1.3); else if(ti===2) celebrate(.6);
  if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(ti>=3?[50,40,120]:25); }catch(e){}
  const again = S.gacha.tickets>=1 ? `<button class="st-btn ghost press" id="stAgain">${icon('sparkles')}${t('again')}</button>` : '';
  $('stageActions').innerHTML = again + `<button class="st-btn press" id="stKeep">${t('keep')}</button>`;
  if($('stAgain')) $('stAgain').onclick=()=>{ gBusy=false; startPull('one'); };
  $('stKeep').onclick=closeStage;
}
function showMulti(res){
  const m=$('multi');
  m.innerHTML=res.map(r=>`<div class="mslot"><div class="capsule sm" data-tier="${r.tier}"><div class="cap-top"></div><div class="cap-bot"></div><div class="cap-shine"></div></div></div>`).join('');
  if(HAS_GSAP) gsap.fromTo('#multi .capsule',{y:-innerHeight,rotation:-180},{y:0,rotation:0,duration:.9,stagger:.06,ease:'bounce.out'});
  $('stageActions').innerHTML=`<button class="st-btn press" id="stOpenAll">${t('openAll')}</button>`;
  $('stOpenAll').onclick=()=>openAll(res);
}
async function openAll(res){
  $('stageActions').innerHTML='';
  const slots=[...document.querySelectorAll('#multi .mslot')];
  for(let i=0;i<slots.length;i++){
    const r=res[i];
    slots[i].innerHTML=miniCardHTML(r.ch,{isNew:r.isNew, tiny:true});
    if(HAS_GSAP){
      gsap.fromTo(slots[i].firstElementChild,{rotationY:180,scale:.5,opacity:0},{rotationY:0,scale:1,opacity:1,duration:.45,ease:'back.out(1.7)'});
      if(tierIdx(r.tier)>=3){ flash(); await new Promise(x=>setTimeout(x,420)); } else await new Promise(x=>setTimeout(x,130));
    }
  }
  const best=Math.max(...res.map(r=>tierIdx(r.tier)));
  const b=$('burst'); b.dataset.tier=TIER_ORDER[best]; b.className='burst on';
  celebrate(best>=4?2.2:best>=3?1.3:.7);
  $('stageHint').textContent=t('multiSummary',{n:res.filter(r=>r.isNew).length, s:res.reduce((a,r)=>a+r.shards,0)});
  $('stageActions').innerHTML=`<button class="st-btn press" id="stKeep">${t('keep')}</button>`;
  $('stKeep').onclick=closeStage;
}
function showDetail(id){
  const ch=CHAR_BY_ID[id], cnt=S.gacha.owned[id]; if(!ch || !cnt) return;
  stageOpen();
  const b=$('burst'); b.dataset.tier=ch.tier; b.className='burst on';
  $('reveal').innerHTML=cardHTML(ch,{count:cnt});
  if(HAS_GSAP) gsap.fromTo('#reveal .gcard',{scale:.7,opacity:0,rotationY:-30},{scale:1,opacity:1,rotationY:0,duration:.55,ease:'back.out(1.6)'});
  const isB=S.gacha.buddy===id;
  $('stageActions').innerHTML=`<button class="st-btn ghost press" id="stBuddy" ${isB?'disabled':''}>${icon('heart')}${isB?t('isBuddy'):t('setBuddy')}</button><button class="st-btn press" id="stKeep">${t('close')}</button>`;
  $('stBuddy').onclick=()=>{ S.gacha.buddy=id; save(); renderAll(); toast(t('buddySet',{name:ch.name[lang]})); closeStage(); };
  $('stKeep').onclick=closeStage;
}

/* ---------- card markup ---------- */
function cardHTML(ch,o={}){
  const under = o.isNew===false && o.shards ? t('dupe',{n:o.shards}) : o.count ? t('owned',{n:o.count}) : '';
  return `<div class="gcard t-${ch.tier}"><div class="gcard-in">
      <div class="gc-top"><span class="tier-pill">${t('tier_'+ch.tier)}</span><span class="gc-no">#${String(ch.no).padStart(2,'0')}</span></div>
      <div class="gc-art">${charSVG(ch)}</div>
      <div class="gc-meta"><div class="gc-stars">${'★'.repeat(TIERS[ch.tier].stars)}</div><div class="gc-set" style="--sc:${SET_BY_ID[ch.set].color}">${icon(SET_BY_ID[ch.set].icon)}${SET_BY_ID[ch.set].name[lang]}</div><div class="gc-name">${ch.name[lang]}</div><div class="gc-desc">${ch.desc[lang]}</div></div>
      ${o.isNew?`<span class="gc-new">${t('newTag')}</span>`:''}
    </div></div>
    <div class="gc-under">${under}${o.quip?`<div class="gc-quip">${o.quip}</div>`:''}</div>`;
}
export function miniCardHTML(ch,o={}){
  if(o.locked) return `<div class="mcard locked"><div class="mcard-in"><div class="mc-art">${charSVG(ch)}</div><div class="mc-name">???</div></div></div>`;
  return `<div class="mcard t-${ch.tier} ${o.tiny?'tiny':''}"><div class="mcard-in">
      ${o.count>1?`<span class="mc-cnt">×${o.count}</span>`:''}${o.buddy?`<span class="mc-buddy">${icon('heart')}</span>`:''}${o.isNew?`<span class="mc-new">${t('newTag')}</span>`:''}
      <div class="mc-art">${charSVG(ch)}</div><div class="mc-stars">${'★'.repeat(TIERS[ch.tier].stars)}</div><div class="mc-name">${ch.name[lang]}</div>
    </div></div>`;
}

/* ---------- render rewards tab ---------- */
export function renderRewards(){
  const g=S.gacha;
  renderMachine();
  countTo($('wTickets'), g.tickets); countTo($('wGold'), g.gold); countTo($('wShards'), g.shards);
  countTo($('wCoins'), coinsLeft());
  if($('shop').classList.contains('open')) $('shopCoins').textContent = coinsLeft().toLocaleString(L().locale);
  $('exBtn').disabled = g.shards<10;
  $('pityText').innerHTML = t('pity',{n:`<b>${PITY-g.pity}</b>`});
  $('pull1').disabled = g.tickets<1; $('pull10').disabled = g.tickets<10;
  $('pullGold').hidden = g.gold<1;

  // quests
  const a=allQuests(); questIndex={};
  [...a.daily,...a.weekly,...a.milestones].forEach(q=>questIndex[q.id]=q);
  const d=fromKey(a.k), mon=mondayOf(d);
  const group=(ic,title,aside,list)=> list.length ? `<div class="q-group"><div class="q-head">${icon(ic)}<b>${title}</b><span>${aside}</span></div><div class="list">${list.map(questRow).join('')}</div></div>` : '';
  $('questList').innerHTML =
    group('sun', t('qDaily'), t('nightOf',{d:`${L().daysShort[d.getDay()]} ${fmtDate(d)}`}), a.daily) +
    group('calendar-check', t('qWeekly'), `${fmtDate(mon)} – ${fmtDate(addDays(mon,6))}`, a.weekly) +
    group('medal', t('qMilestone'), '', a.milestones);
  const ready=[...a.daily,...a.weekly,...a.milestones].filter(isClaimable).length;
  $('questCount').textContent = ready ? t('readyCount',{n:ready}) : '';

  // collection
  const own=ownedCount();
  $('collCount').textContent = t('collected',{n:own, m:CHARS.length});
  $('tierProg').innerHTML = TIER_ORDER.map(k=>{
    const all=CHARS.filter(c=>c.tier===k), got=all.filter(c=>g.owned[c.id]).length;
    return `<span class="tp t-${k}"><i></i>${t('tier_'+k)} ${got}/${all.length}</span>`;
  }).join('');
  $('collGrid').innerHTML = SETS.map(s=>{
    const q=setQuest(s), done=q.cur>=q.goal, claimed=!!S.quests.claimed[q.id], pct=Math.round(q.cur/q.goal*100);
    const side = claimed ? `<span class="cset-done">${icon('check')}${t('setDone')}</span>`
      : done ? `<button class="q-claim cset-claim press" data-q="${q.id}">${t('claim')}</button>`
      : `<span class="q-rw">${rewardChips(s.reward)}</span>`;
    const cards = CHARS.filter(c=>c.set===s.id).map(c=>`<button class="cslot press" data-id="${c.id}" aria-label="${g.owned[c.id]?escapeHtml(c.name[lang]):'???'}">${miniCardHTML(c,{locked:!g.owned[c.id], count:g.owned[c.id], buddy:g.buddy===c.id})}</button>`).join('');
    return `<section class="cset ${done?'is-done':''} ${done&&!claimed?'is-ready':''}" style="--sc:${s.color}">
      <div class="cset-head"><div class="cset-ic">${icon(s.icon)}</div>
        <div class="cset-t"><b>${s.name[lang]}</b><div class="cset-sub"><div class="cset-bar"><i style="width:${pct}%"></i></div><span>${q.cur}/${q.goal}</span></div></div>
        <div class="cset-side">${side}</div></div>
      <div class="coll-grid">${cards}</div></section>`;
  }).join('');

  // badges / strip
  const dot = ready>0 || g.tickets>0 || g.gold>0;
  $('rwDot').hidden = !dot;
  $('rwStripText').textContent = t('homeRewards',{t:g.tickets, q:ready});
  $('rwStrip').classList.toggle('hot', dot);
}
function questRow(q){
  const claimed=!!S.quests.claimed[q.id], ready=isClaimable(q), pct=Math.min(100,q.cur/q.goal*100);
  const btn = claimed ? `<span class="q-done">${icon('check')}${t('claimed')}</span>`
    : `<button class="q-claim press" data-q="${q.id}" ${ready?'':'disabled'}>${ready?t('claim'):`${Math.min(q.cur,q.goal)}/${q.goal}`}</button>`;
  return `<div class="q-row ${claimed?'is-claimed':''} ${ready?'is-ready':''}"><div class="q-ic">${icon(q.icon)}</div>
    <div class="q-main"><b>${q.title}</b><div class="q-bar"><i style="width:${pct}%"></i></div></div>
    <div class="q-side"><span class="q-rw">${rewardChips(q.reward)}</span>${btn}</div></div>`;
}
function showRates(){
  const rows = TIER_ORDER.slice().reverse().map(k=>`<div class="rate-row"><span class="tp t-${k}"><i></i>${t('tier_'+k)}</span><span class="stars">${'★'.repeat(TIERS[k].stars)}</span><span class="pct">${TIERS[k].rate}%</span></div>`).join('');
  $('ratesBody').innerHTML = rows + `<ul class="rate-notes"><li>${t('ratePity')}</li><li>${t('rate10')}</li><li>${t('rateGold')}</li><li>${t('rateDupe')}</li></ul>`;
  $('rates').classList.add('open');
  if(HAS_GSAP) gsap.fromTo('#rates .rm-panel',{y:'100%'},{y:0,duration:.45,ease:'power4.out'});
}

$('questList').addEventListener('click', e=>{ const b=e.target.closest('.q-claim'); if(b && !b.disabled) claimQuest(b.dataset.q, b); });
$('collGrid').addEventListener('click', e=>{
  const c=e.target.closest('.cset-claim'); if(c){ questIndex[c.dataset.q] ||= setQuest(SET_BY_ID[c.dataset.q.slice(4)]); claimQuest(c.dataset.q, c); return; }
  const b=e.target.closest('.cslot'); if(b) showDetail(b.dataset.id);
});
$('pull1').onclick=()=>startPull('one');
$('pull10').onclick=()=>startPull('ten');
$('pullGold').onclick=()=>startPull('gold');
$('exBtn').onclick=()=>{ const g=S.gacha; if(g.shards<10) return; g.shards-=10; g.tickets++; save(); renderRewards(); pop($('wallet')); toast(t('exchanged')); };
$('ratesBtn').onclick=showRates;
$('ratesClose').onclick=$('ratesBg').onclick=()=>$('rates').classList.remove('open');
$('rwStrip').onclick=()=>showTab('rewards');
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('stage').classList.contains('open') && !$('capsule').offsetParent) closeStage(); });
