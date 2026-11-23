/* Festivals (Loy Krathong 2026): lotus, floats, quests, shop. */
import { REDUCE } from './config';
import { lang, t } from './i18n';
import { S, save } from './store';
import { $, celebrate, closeModal, escHTML, fromKey, icon, nightKey, openModal, toast } from './util';
import { checkBadges } from './badges';
import { CHAR_BY_ID } from './chars';
import { SHOP_BY_ID, SHOP_ITEMS, itemArt, toggleUse } from './shop';
import { miniCardHTML } from './gacha';
import { renderAll, showTab } from './app';

/* ---------- festivals ----------
   One festival at a time. It runs on its own currency (lotus) earned mostly by fasting, so the
   event rewards the habit the app is for. Leftover lotus turn into coins when it ends. */
export const FEST = { id:'lk26', start:'2026-11-20', end:'2026-11-30', peak:'2026-11-24', rate:5 };
const FEST_CHAR = { id:'krathong', price:80 };
export const festActive = () => { const k=nightKey(); return k>=FEST.start && k<=FEST.end; };
export const festOver = () => nightKey() > FEST.end;
const inFest = k => k>=FEST.start && k<=FEST.end;
const festFloats = () => Object.keys(S.fest.floats).filter(inFest).sort();
const festOk = () => Object.keys(S.log).filter(k=>inFest(k) && S.log[k]==='ok').length;
const festSos = () => S.sessions.filter(x=>inFest(nightKey(new Date(x.t)))).length;
const FEST_QUESTS = [
  { id:'e:lk26:float1', ic:'sparkles',     k:'fq_float1', goal:1, val:()=>festFloats().length, lotus:5 },
  { id:'e:lk26:sos',    ic:'shield-check', k:'fq_sos',    goal:1, val:festSos,                lotus:8 },
  { id:'e:lk26:fast3',  ic:'moon-star',    k:'fq_fast3',  goal:3, val:festOk,                 lotus:15 },
  { id:'e:lk26:peak',   ic:'moon-star',    k:'fq_peak',   goal:1, val:()=>S.log[FEST.peak]==='ok'?1:0, lotus:25 },
  { id:'e:lk26:float5', ic:'sparkles',     k:'fq_float5', goal:5, val:()=>festFloats().length, lotus:20 },
];
function lotusEarned(){
  let n=0;
  Object.keys(S.log).forEach(k=>{ if(inFest(k)) n += S.log[k]==='ok' ? 5 : S.log[k]==='light' ? 2 : 0; });
  n += festFloats().length;
  FEST_QUESTS.forEach(q=>{ if(S.quests.claimed[q.id]) n += q.lotus; });
  return n;
}
const lotusSpent = () => Object.keys(S.shop.owned).reduce((a,id)=>a + (SHOP_BY_ID[id]?.lotus ? SHOP_BY_ID[id].price : id==='fchar:'+FEST_CHAR.id ? FEST_CHAR.price : 0), 0);
export const lotusLeft = () => Math.max(0, lotusEarned() - lotusSpent());
const festReady = () => FEST_QUESTS.filter(q=>q.val()>=q.goal && !S.quests.claimed[q.id]).length;
function festDaysLeft(){ return Math.round((fromKey(FEST.end) - fromKey(nightKey()))/864e5); }

/* krathong designs, drawn with the waterline at y=0 */
function krathongArt(d){
  const candle = `<circle class="fglow" cy="-23" r="6" fill="#ffd36b" opacity=".35"/><rect x="-1.7" y="-19" width="3.4" height="9" rx="1" fill="#fff3d6"/><path class="flame" d="M0 -25.5 q2.8 3.6 0 6 q-2.8 -2.4 0 -6z" fill="#ffb84d"/><path d="M-5 -10 l-2 -9 M5 -10 l2 -9" stroke="#8a5a2b" stroke-width=".8"/><circle cx="-7" cy="-19" r=".9" fill="#ff4d4d"/><circle cx="7" cy="-19" r=".9" fill="#ff4d4d"/>`;
  const base = {
    kt_leaf:  `<path d="M-14 -5 l2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 1.4 6z" fill="#5cb85c"/><path d="M-16 0 q16 5 32 0 l-3 -5 h-26z" fill="#3f8f3f"/><circle cx="-8" cy="-10" r="2.6" fill="#ff8fb8"/><circle cx="8" cy="-10" r="2.6" fill="#ffd36b"/>`,
    kt_bread: `<path d="M-15 0 q15 5 30 0 l-2 -7 q-13 -3.5 -26 0z" fill="#d9a15a"/><path d="M-11 -6 q11 -3 22 0" stroke="#f3cf95" stroke-width="2" fill="none"/><circle cx="-7" cy="-9" r="2.3" fill="#ff8fb8"/><circle cx="7" cy="-9" r="2.3" fill="#fff"/><path d="M19 3 q3.5 -2.4 7 0 q-3.5 2.4 -7 0z M26 3 l2.4 -1.8 v3.6z" fill="#ff9a3c"/>`,
    kt_coco:  `<path d="M-15 -4 a15 9 0 0 0 30 0z" fill="#7a4b2a"/><ellipse cy="-4" rx="15" ry="2.4" fill="#f4ead6"/><circle cx="-7" cy="-8" r="2.5" fill="#ff5a8a"/><circle cx="7" cy="-8" r="2.5" fill="#ffd36b"/>`,
    kt_lotus: `<path d="M-16 0 q16 4 32 0 l-2 -3 h-28z" fill="#d99a00"/><path d="M-14 -3 q-4 -8 2.5 -12.5 q2.5 7 1.5 12.5z M14 -3 q4 -8 -2.5 -12.5 q-2.5 7 -1.5 12.5z M-7 -3 q-2.5 -10 7 -16 q9.5 6 7 16z" fill="#ffd34d" stroke="#ff8fb8" stroke-width=".9"/>`,
    kt_moonie:`<path d="M-15 0 q15 5 30 0 l-2 -5 h-26z" fill="#3f8f3f"/><circle cy="-11" r="9" fill="#ffd98f" stroke="#e39a33" stroke-width="1"/><ellipse cx="-3.2" cy="-12" rx="1.3" ry="1.7" fill="#2b1d16"/><ellipse cx="3.2" cy="-12" rx="1.3" ry="1.7" fill="#2b1d16"/><path d="M-2.2 -8.4 q2.2 2 4.4 0" stroke="#2b1d16" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="-9" rx="1.8" ry="1" fill="#ff8a7a" opacity=".6"/><ellipse cx="6" cy="-9" rx="1.8" ry="1" fill="#ff8a7a" opacity=".6"/>`,
  }[d] || '';
  return `<g>${base}${d==='kt_moonie' ? `<g transform="translate(0 -7)">${candle}</g>` : candle}</g>`;
}
const ktSVG = (d, h=44) => `<svg viewBox="-22 -32 48 38" style="height:${h}px" aria-hidden="true">${krathongArt(d)}</svg>`;
let riverNew = '';
function renderRiver(){
  const fl = festFloats(), n = fl.length;
  $('riverKt').innerHTML = fl.map((k,i)=>{
    const x = n===1 ? 160 : Math.round(24 + i*(272/(n-1))), y = 33 + (i%2)*4, f=S.fest.floats[k];
    return `<g transform="translate(${x} ${y}) scale(.72)"><g class="${k===riverNew ? 'kt-enter' : ''}"><g class="kt-bob" style="animation-delay:-${(i*.7).toFixed(1)}s">${krathongArt(f.d)}</g></g></g>`;
  }).join('');
  riverNew = '';
}
export function renderFest(){
  const on = festActive();
  $('festBanner').hidden = $('river').hidden = !on;
  if(!on) return;
  renderRiver();
  const days = festDaysLeft(), floated = !!S.fest.floats[nightKey()], ready = festReady();
  $('fbTitle').textContent = t('festName');
  $('fbSub').textContent = [floated ? t('fbDone') : t('fbFloat'), ready ? t('fbReady',{n:ready}) : '', days ? t('festLeft',{n:days}) : t('festLast')].filter(Boolean).join(' · ');
  $('fbLotus').textContent = lotusLeft();
  if($('festSheet').classList.contains('open')) renderFestSheet();
}
let ktChoice = '';
function festItemCard(it){
  const name=t('si_'+it.id), owned=!!S.shop.owned[it.id];
  let art;
  if(it.kind==='krathong') art = `<div class="si-art kt">${ktSVG(it.id, 70)}</div>`;
  else art = itemArt({...it, cat: it.showIn});
  let btn;
  if(owned){
    const on = it.kind==='krathong' ? S.shop.equip.krathong===it.id : it.kind==='fx' ? !!S.shop.equip.fx[it.id] : S.shop.equip[it.slot]===it.id;
    btn = `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>`;
  } else btn = `<button class="si-buy lotus press ${lotusLeft()<it.price?'poor':''}" data-fbuy="${it.id}" data-price="${it.price}">${icon('lotus')}${it.price}</button>`;
  return `<div class="card sitem">${art}<b>${name}</b><span class="si-desc">${t('sd_'+it.id)}</span>${btn}</div>`;
}
function renderFestSheet(){
  const k = nightKey(), f = S.fest.floats[k], days = festDaysLeft(), left = lotusLeft();
  const owned = ['kt_leaf', ...SHOP_ITEMS.filter(i=>i.kind==='krathong' && S.shop.owned[i.id]).map(i=>i.id)];
  if(!owned.includes(ktChoice)) ktChoice = owned.includes(S.shop.equip.krathong) ? S.shop.equip.krathong : 'kt_leaf';
  const ch = CHAR_BY_ID[FEST_CHAR.id], haveCh = !!S.gacha.owned[ch.id];
  const floatSec = f
    ? `<div class="fs-done">${ktSVG(f.d)}<div><b>${t('floatedTonight')}</b><span>${f.w ? '“'+escHTML(f.w)+'”' : t('floatNoWish')}</span></div></div>`
    : `<div class="kt-pick" id="ktPick">${owned.map(d=>`<button class="press ${d===ktChoice?'sel':''}" data-kt="${d}">${ktSVG(d)}${t('si_'+d)}</button>`).join('')}</div>
       <input class="fs-wish" id="fsWish" maxlength="40" placeholder="${t('floatWish')}" autocomplete="off">
       <button class="fs-float press" id="fsFloat">${icon('sparkles')}${t('floatBtn')} <span style="opacity:.8">+1</span>${icon('lotus')}</button>`;
  const quests = FEST_QUESTS.map(q=>{ const cur=Math.min(q.val(), q.goal), done=!!S.quests.claimed[q.id], ready=cur>=q.goal && !done;
    return `<div class="cs-row fs-q"><div class="ic">${icon(q.ic)}</div><div class="t"><b>${t(q.k)}</b><span><span class="rw l">${icon('lotus')}${q.lotus}</span> · ${cur}/${q.goal}</span></div>${done ? `<span class="q-done">${icon('check')}${t('claimed')}</span>` : `<button class="q-claim press" data-fq="${q.id}" ${ready?'':'disabled'}>${t('claim')}</button>`}</div>`; }).join('');
  const chCard = `<div class="card sitem"><div class="si-art chr">${miniCardHTML(ch,{})}</div><b>${escHTML(ch.name[lang])}</b><span class="si-desc">${t('sd_fchar')}</span>${haveCh ? `<button class="si-buy" disabled>${icon('check')}${t('ownedIt')}</button>` : `<button class="si-buy lotus press ${left<FEST_CHAR.price?'poor':''}" data-fbuy="fchar:${ch.id}" data-price="${FEST_CHAR.price}">${icon('lotus')}${FEST_CHAR.price}</button>`}</div>`;
  $('fsBody').innerHTML = `
    <div class="fs-hero"><span class="left">${days ? t('festLeft',{n:days}) : t('festLast')}</span><div class="k">${t('festKicker')}</div><h3 id="fsH">${t('festName')}</h3><div class="sub">${t('festPeak')}</div>
      <svg viewBox="0 0 320 70" aria-hidden="true"><circle cx="252" cy="22" r="13" fill="#ffe9a8"/><circle cx="252" cy="22" r="22" fill="#ffe9a8" opacity=".15"/><rect y="42" width="320" height="28" fill="#122042"/><g class="moonref"><ellipse cx="252" cy="49" rx="12" ry="2.2"/><ellipse cx="250" cy="56" rx="7" ry="1.6"/></g>
        <g transform="translate(70 58) scale(.8)"><g class="kt-bob">${krathongArt('kt_leaf')}</g></g><g transform="translate(140 62) scale(.6)"><g class="kt-bob" style="animation-delay:-1s">${krathongArt('kt_lotus')}</g></g><g transform="translate(196 57) scale(.7)"><g class="kt-bob" style="animation-delay:-2s">${krathongArt('kt_coco')}</g></g></svg></div>
    <div class="fs-wallet"><div class="ic">${icon('lotus')}</div><div><b class="num">${left}</b><span>${t('lotus')} · ${t('lotusHow')}</span></div></div>
    <div class="rd-h">${t('floatTitle')}</div>${floatSec}
    <div class="rd-h">${t('festQuests')}</div><div class="cs-list">${quests}</div>
    <div class="rd-h">${t('festShop')}<span>${t('festShopSub')}</span></div>
    <div class="shop-grid">${chCard}${SHOP_ITEMS.filter(i=>i.cat==='fest').map(festItemCard).join('')}</div>
    <p class="cs-note">${t('festNote')}</p>`;
}
export function openFest(){ ktChoice=''; renderFestSheet(); openModal('festSheet'); }
function floatKrathong(){
  const k=nightKey(); if(!festActive() || S.fest.floats[k]) return;
  S.fest.floats[k] = { d:ktChoice || 'kt_leaf', w:($('fsWish')?.value||'').trim().slice(0,40), t:Date.now() };
  riverNew = k; checkBadges(); save(); closeModal('festSheet');
  showTab('home'); renderAll();
  setTimeout(()=>{ $('river').scrollIntoView({behavior:REDUCE?'auto':'smooth', block:'center'}); }, 350);
  toast(t('floated')); celebrate(.9);
}
function buyFest(id){
  if(!festActive()) return;
  const isChar = id.startsWith('fchar:'), it = SHOP_BY_ID[id], price = isChar ? FEST_CHAR.price : it?.price;
  if(!price || S.shop.owned[id]) return;
  if(lotusLeft() < price){ toast(t('notEnoughLotus')); return; }
  S.shop.owned[id] = 1;
  if(isChar) S.gacha.owned[id.slice(6)] = 1;
  else if(it.kind==='fx') S.shop.equip.fx[id] = 1;
  else if(it.kind==='wear') S.shop.equip[it.slot] = id;
  else if(it.kind==='krathong'){ S.shop.equip.krathong = id; ktChoice = id; }
  checkBadges(); save(); renderAll(); renderFestSheet();
  celebrate(.6); toast(t('bought',{name: isChar ? CHAR_BY_ID[id.slice(6)].name[lang] : t('si_'+id)}));
}
$('fsBody').addEventListener('click', e=>{
  const kt=e.target.closest('[data-kt]'); if(kt){ ktChoice=kt.dataset.kt; $('ktPick').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b===kt)); return; }
  if(e.target.closest('#fsFloat')){ floatKrathong(); return; }
  const q=e.target.closest('[data-fq]'); if(q && !q.disabled){ S.quests.claimed[q.dataset.fq]=true; save(); renderAll(); renderFestSheet(); celebrate(.5); toast(t('claimedLotus',{n:FEST_QUESTS.find(x=>x.id===q.dataset.fq).lotus})); return; }
  const u=e.target.closest('[data-use]'); if(u){ toggleUse(u.dataset.use); renderFestSheet(); return; }
  const b=e.target.closest('[data-fbuy]'); if(!b) return;
  const price=Number(b.dataset.price);
  if(lotusLeft()<price){ toast(t('notEnoughLotus')); return; }
  if(!b.classList.contains('confirm')){   // two taps to buy, like the shop
    $('fsBody').querySelectorAll('.si-buy.confirm').forEach(x=>{ x.classList.remove('confirm'); x.innerHTML=x.dataset.label; });
    b.dataset.label=b.innerHTML; b.classList.add('confirm'); b.textContent=t('buyConfirm',{n:price});
    clearTimeout(b._t); b._t=setTimeout(()=>{ if(b.isConnected){ b.classList.remove('confirm'); b.innerHTML=b.dataset.label; } }, 3000);
    return;
  }
  buyFest(b.dataset.fbuy);
});
$('festBanner').onclick = openFest;
$('fsClose').onclick = $('festBg').onclick = ()=>closeModal('festSheet');
