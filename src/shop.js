/* Shop: quest coins, items, characters of the day, city effects, buddy outfits. */
import { HAS_GSAP } from './config';
import { L, lang, t } from './i18n';
import { S, save } from './store';
import { $, addDays, celebrate, escHTML, fromKey, icon, keyOf, pop, toast } from './util';
import { checkBadges } from './badges';
import { CHARS, CHAR_BY_ID, F, TIERS, _faceCache, accessorize, charSVG } from './chars';
import { coinValue } from './quests';
import { cityHash } from './city';
import { FEST, festActive, festOver, lotusLeft, openFest } from './festival';
import { miniCardHTML } from './gacha';
import { dayStart } from './run';
import { renderAll } from './app';

/* ---------- shop: spend quest coins ----------
   Coins earned come from claimed quests and coins spent from what you own, so both are
   derived and merge cleanly between devices. */
export const SHOP_ITEMS = [
  { id:'ticket',   cat:'item',  price:40,  kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#ff9a62,#ff5a1f)', grant:()=>{ S.gacha.tickets+=1; } },
  { id:'ticket10', cat:'item',  price:360, kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#a78bfa,#7c3aed)', grant:()=>{ S.gacha.tickets+=10; } },
  { id:'goldt',    cat:'item',  price:400, kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#ffd34d,#f59e0b)', grant:()=>{ S.gacha.gold+=1; } },
  { id:'freeze',   cat:'item',  price:120, kind:'stock', art:'shield-check', tone:'linear-gradient(135deg,#7dd3fc,#2563eb)' },
  { id:'bricks',   cat:'item',  price:30,  kind:'stock', art:'brick', tone:'linear-gradient(135deg,#ff8a5c,#d9480f)' },
  { id:'balloon',  cat:'city',  price:150, kind:'fx' },
  { id:'ferris',   cat:'city',  price:350, kind:'fx' },
  { id:'fireworks',cat:'city',  price:250, kind:'fx' },
  { id:'aurora',   cat:'city',  price:300, kind:'fx' },
  { id:'meteor',   cat:'city',  price:200, kind:'fx' },
  { id:'snow',     cat:'city',  price:180, kind:'fx' },
  { id:'hat_party',  cat:'style', slot:'hat',   price:100, kind:'wear' },
  { id:'hat_beanie', cat:'style', slot:'hat',   price:120, kind:'wear' },
  { id:'hat_crown',  cat:'style', slot:'hat',   price:300, kind:'wear' },
  { id:'face_sun',   cat:'style', slot:'face',  price:120, kind:'wear' },
  { id:'face_heart', cat:'style', slot:'face',  price:90,  kind:'wear' },
  { id:'frame_gold',    cat:'style', slot:'frame', price:150, kind:'wear' },
  { id:'frame_rainbow', cat:'style', slot:'frame', price:250, kind:'wear' },
  { id:'frame_neon',    cat:'style', slot:'frame', price:200, kind:'wear' },
  // Loy Krathong 2026: paid in lotus, sold only during the festival, kept forever
  { id:'kt_bread',    cat:'fest', lotus:true, price:15, kind:'krathong' },
  { id:'kt_coco',     cat:'fest', lotus:true, price:20, kind:'krathong' },
  { id:'kt_lotus',    cat:'fest', lotus:true, price:40, kind:'krathong' },
  { id:'kt_moonie',   cat:'fest', lotus:true, price:60, kind:'krathong' },
  { id:'lantern',     cat:'fest', lotus:true, price:50, kind:'fx', showIn:'city' },
  { id:'hat_chada',   cat:'fest', lotus:true, price:45, kind:'wear', slot:'hat', showIn:'style' },
  { id:'frame_lotus', cat:'fest', lotus:true, price:35, kind:'wear', slot:'frame', showIn:'style' },
];
export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i=>[i.id,i]));
const CHAR_PRICE = { salt:30, common:80, rare:200, sr:500, legend:1500 };
const itemPrice = id => id.startsWith('char:') ? CHAR_PRICE[CHAR_BY_ID[id.slice(5)]?.tier] || 0 : SHOP_BY_ID[id]?.price || 0;
const coinsEarned = () => Object.keys(S.quests.claimed).reduce((a,id)=>a+coinValue(id), 0) + (festOver() ? lotusLeft()*FEST.rate : 0);
const coinsSpent = () => Object.entries(S.shop.owned).reduce((a,[id,n])=>a + (SHOP_BY_ID[id]?.lotus || id.startsWith('fchar:') ? 0 : itemPrice(id)*n), 0);
export const coinsLeft = () => Math.max(0, coinsEarned() - coinsSpent());
const freezeLeft = () => Math.max(0, (S.shop.owned.freeze||0) - Object.keys(S.shop.frozen).length);
/* a missed night uses a streak freeze, but only when there is a streak to save */
export function useFreeze(key){
  if(!freezeLeft()) return;
  const prev=keyOf(addDays(fromKey(key),-1)), v=S.log[prev];
  if(!(v==='ok' || v==='light' || S.shop.frozen[prev])) return;
  S.shop.frozen[key]=Date.now();
  setTimeout(()=>toast(t('freezeUsed')), 300);
}
function dailyChars(){
  const k=keyOf(new Date());
  const pick=(tiers,salt)=>{ const pool=CHARS.filter(c=>tiers.includes(c.tier) && !c.limited); return pool[Math.floor(cityHash(k+salt)*pool.length)]; };
  return [...new Set([pick(['salt','common'],'a'), pick(['common'],'b'), pick(['rare'],'c'), pick(['sr','legend'],'d')])];
}
/* little scenes for the city effects */
function fxArt(id, preview){
  const G=211;
  if(id==='aurora') return `<g class="fx-night"><defs><linearGradient id="gAuro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7dffd8" stop-opacity="0"/><stop offset=".3" stop-color="#7dffd8" stop-opacity=".5"/><stop offset=".7" stop-color="#b48aff" stop-opacity=".45"/><stop offset="1" stop-color="#b48aff" stop-opacity="0"/></linearGradient></defs><path class="au" d="M-20 40 C40 10 90 60 150 30 S260 10 340 40 L340 62 C260 32 200 72 150 52 S40 32 -20 62Z" fill="url(#gAuro)"/><path class="au a2" d="M-20 72 C60 42 110 82 170 57 S270 42 340 68 L340 84 C270 60 210 94 170 72 S60 62 -20 86Z" fill="url(#gAuro)" opacity=".6"/></g>`;
  if(id==='meteor') return `<g class="fx-night"><g class="meteor" transform="translate(120 40)"><line x1="0" y1="0" x2="-26" y2="-9" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/><circle r="1.4" fill="#fff"/></g><g class="meteor m2" transform="translate(200 30)"><line x1="0" y1="0" x2="-20" y2="-7" stroke="#cfe6ff" stroke-width="1.1" stroke-linecap="round"/><circle r="1.1" fill="#fff"/></g></g>`;
  if(id==='fireworks'){
    const burst=(x,y,c,delay)=>{ let l=''; for(let i=0;i<12;i++){ const a=i*Math.PI/6, c1=Math.cos(a), s1=Math.sin(a); l+=`<line x1="${(c1*4).toFixed(1)}" y1="${(s1*4).toFixed(1)}" x2="${(c1*14).toFixed(1)}" y2="${(s1*14).toFixed(1)}"/><circle cx="${(c1*16.5).toFixed(1)}" cy="${(s1*16.5).toFixed(1)}" r="1"/>`; }
      return `<g transform="translate(${x} ${y})"><g class="burst" style="animation-delay:${delay}s" stroke="${c}" fill="${c}" stroke-width="1.3" stroke-linecap="round">${l}</g></g>`; };
    return `<g class="fx-night">${burst(92,62,'#ff6a8a',0)}${burst(232,48,'#ffd36b',-1.4)}${burst(165,90,'#7dd3fc',-.7)}</g>`;
  }
  if(id==='lantern'){
    let h=''; for(let i=0;i<7;i++){ const r=cityHash('lan'+i), r2=cityHash('ln2'+i), d=(16+r2*12).toFixed(1), x=Math.round(20+r*280);
      h+=`<g class="lan" transform="translate(${x} ${preview ? Math.round(40+r2*120) : 120})" style="--x:${x}px;--d:${d}s;--dl:-${(r*d).toFixed(1)}s;--dx:${Math.round((r2-.5)*40)}px"><circle cy="1" r="7" fill="#ffb84d" opacity=".28"/><path d="M-3.2 -4.5 h6.4 l1.3 7.5 h-9z" fill="#ff9a3c"/><path d="M-2 3.2 h4" stroke="#ffe08a" stroke-width="1.4"/></g>`; }
    return `<g class="fx-night">${h}</g>`;
  }
  if(id==='balloon') return `<g transform="translate(70 60)"><g class="bfloat"><path d="M0 -14 a11 12 0 0 1 11 12 c0 7 -6 10 -8 14 h-6 c-2 -4 -8 -7 -8 -14 a11 12 0 0 1 11 -12z" fill="#ff6a5c"/><path d="M0 -14 c-4.5 4 -5.5 16 -3 26 M0 -14 c4.5 4 5.5 16 3 26" stroke="#ffd36b" stroke-width="2.2" fill="none"/><path d="M-3 12 l1 5 M3 12 l-1 5" stroke="#c9a27a" stroke-width=".7"/><rect x="-3" y="17" width="6" height="4.5" rx="1" fill="#8a5a2b"/></g></g>`;
  if(id==='ferris'){
    const cx=preview?160:58, cy=G-30, r=22; let sp='', cab='';
    for(let i=0;i<8;i++){ const a=i*Math.PI/4, x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; sp+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; cab+=`<circle class="cab" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; }
    return `<g><path d="M${cx-13} ${G} L${cx} ${cy} L${cx+13} ${G}" stroke="#7d7da0" stroke-width="1.8" fill="none"/><g class="wheel" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#b9b9d6" stroke-width="1.3"/><g stroke="#9a9ac0" stroke-width=".8">${sp}</g>${cab}</g><circle cx="${cx}" cy="${cy}" r="2.4" fill="#d1d1e6"/></g>`;
  }
  if(id==='snow'){
    let h=''; for(let i=0;i<34;i++){ const r=cityHash('flake'+i), r2=cityHash('fl2'+i), d=(6+r2*6).toFixed(1);
      h+=`<circle class="flake" cx="${(r*320).toFixed(1)}" cy="${preview ? (r2*200).toFixed(1) : -6}" r="${(.7+r2*1.1).toFixed(2)}" style="--d:${d}s;--dl:-${(r*d).toFixed(1)}s;--dx:${((r2-.5)*24).toFixed(1)}px"/>`; }
    return `<g>${h}</g>`;
  }
  return '';
}
export function renderCityFx(){
  const fx=S.shop.equip.fx||{};
  $('cityFxBack').innerHTML = ['aurora','meteor','fireworks','lantern','balloon','ferris'].filter(k=>fx[k] && S.shop.owned[k]).map(k=>fxArt(k)).join('');
  $('cityFxFront').innerHTML = fx.snow && S.shop.owned.snow ? fxArt('snow') : '';
}
/* ---- shop screen ---- */
let shopCat = 'item';
const SHOP_CATS = [['item','ticket','catItem'], ['chars','sparkles','catChars'], ['city','building','catCity'], ['style','heart','catStyle']];
export function itemArt(it){
  if(it.cat==='item') return `<div class="si-art"><div class="big" style="background:${it.tone}">${icon(it.art)}</div></div>`;
  if(it.cat==='city') return `<div class="si-art scene"><svg viewBox="0 0 320 220">${fxArt(it.id, true).replace(/gAuro/g, "gAuroP")}<rect x="0" y="205" width="320" height="15" fill="#1e1e26"/><path d="M20 205 h30 v-40 h-30z M60 205 h22 v-60 h-22z M240 205 h26 v-48 h-26z M276 205 h24 v-30 h-24z" fill="#2c3150"/></svg></div>`;
  const b = S.gacha.buddy && S.gacha.owned[S.gacha.buddy] && CHAR_BY_ID[S.gacha.buddy];
  const base = b ? charSVG(b) : `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="58" r="32" fill="#ffd98f" stroke="#e39a33" stroke-width="1.5"/>${F(50,60,1)}</svg>`;
  const id = b ? b.id : '_plain';
  if(!b) _faceCache._plain = {cx:50, cy:60, s:1};
  if(it.slot==='frame') return `<div class="si-art"><div class="fprev" data-frame="${it.id}">${b ? base : ''}</div></div>`;
  return `<div class="si-art">${accessorize(base, id, {[it.slot]:it.id})}</div>`;
}
function buyBtn(id, price, label){
  const poor = coinsLeft() < price;
  return `<button class="si-buy press ${poor?'poor':''}" data-buy="${id}" data-price="${price}">${label || icon('coins')+price}</button>`;
}
function shopCard(it){
  const name=t('si_'+it.id), desc=t('sd_'+it.id), owned=S.shop.owned[it.id]||0;
  let btn, stock='';
  if(it.kind==='fx'){
    const on = !!S.shop.equip.fx[it.id];
    btn = owned ? `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>` : buyBtn(it.id, it.price);
  } else if(it.kind==='wear'){
    const on = S.shop.equip[it.slot]===it.id;
    btn = owned ? `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>` : buyBtn(it.id, it.price);
  } else {
    btn = buyBtn(it.id, it.price);
    if(it.id==='freeze' && freezeLeft()) stock = t('stockN',{n:freezeLeft()});
  }
  return `<div class="card sitem">${itemArt(it)}${stock?`<span class="si-stock">${stock}</span>`:''}<b>${name}</b><span class="si-desc">${desc}</span>${btn}</div>`;
}
function renderShop(){
  $('shopCoins').textContent = coinsLeft().toLocaleString(L().locale);
  $('shopCats').innerHTML = SHOP_CATS.map(([id,ic,k])=>`<button class="press ${id===shopCat?'sel':''}" data-cat="${id}">${icon(ic)}${t(k)}</button>`).join('');
  let h='';
  if(shopCat==='chars'){
    const hrs = Math.max(1, Math.ceil((dayStart(addDays(new Date(),1)) - new Date())/3600000));
    h = `<div class="shop-sec"><h3>${t('charsToday')}</h3><span>${t('charsRefresh',{h:hrs})}</span></div><div class="shop-grid">` +
      dailyChars().map(ch=>{ const id='char:'+ch.id, price=CHAR_PRICE[ch.tier], have=S.gacha.owned[ch.id];
        return `<div class="card sitem"><div class="si-art chr">${miniCardHTML(ch,{})}</div><b>${escHTML(ch.name[lang])}</b><span class="si-desc">${t('tier_'+ch.tier)} · ${'★'.repeat(TIERS[ch.tier].stars)}</span>${have ? `<button class="si-buy" disabled>${icon('check')}${t('ownedIt')}</button>` : buyBtn(id, price)}</div>`; }).join('') + '</div>';
  } else {
    const intro = { item:'introItem', city:'introCity', style:'introStyle' }[shopCat];
    h = (festActive() ? `<button class="card fest-banner press" data-fest="1" style="margin:0 0 12px"><span class="fb-ic">${icon('lotus')}</span><span class="tx"><b>${t('festName')}</b><span>${t('festShopSub')}</span></span><span class="lotus-pill">${icon('lotus')}${lotusLeft()}</span></button>` : '') + `<p class="shop-note">${t(intro)}${shopCat==='style' && !(S.gacha.buddy && S.gacha.owned[S.gacha.buddy]) ? ' '+t('needBuddy') : ''}</p><div class="shop-grid">${SHOP_ITEMS.filter(i=>i.cat===shopCat || (i.showIn===shopCat && S.shop.owned[i.id])).map(shopCard).join('')}</div>`;
  }
  $('shopBody').innerHTML = h;
}
export function openShop(){
  renderShop(); $('shop').classList.add('open'); $('shop').scrollTop=0; document.body.style.overflow='hidden';
  if(HAS_GSAP) gsap.fromTo('#shop .shop-in',{y:40,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out',clearProps:'transform,opacity'});
}
function closeShop(){ $('shop').classList.remove('open'); document.body.style.overflow=''; }
function buyItem(id){
  const price=itemPrice(id);
  if(!price || coinsLeft()<price){ toast(t('notEnough')); return; }
  let name;
  if(id.startsWith('char:')){
    const ch=CHAR_BY_ID[id.slice(5)]; if(S.gacha.owned[ch.id]) return;
    S.gacha.owned[ch.id]=1; name=ch.name[lang];
  } else {
    const it=SHOP_BY_ID[id]; name=t('si_'+id);
    if(it.kind==='use') it.grant();
    if((it.kind==='fx' || it.kind==='wear') && S.shop.owned[id]) return;
  }
  S.shop.owned[id]=(S.shop.owned[id]||0)+1;
  const it=SHOP_BY_ID[id];
  if(it?.kind==='fx') S.shop.equip.fx[id]=1;          // put new things on right away
  if(it?.kind==='wear') S.shop.equip[it.slot]=id;
  checkBadges(); save(); renderAll(); renderShop();
  pop($('shopCoins').parentElement); celebrate(.6); toast(t('bought',{name}));
}
export function toggleUse(id){
  const it=SHOP_BY_ID[id]; if(!it || !S.shop.owned[id]) return;
  if(it.kind==='fx'){ if(S.shop.equip.fx[id]) delete S.shop.equip.fx[id]; else S.shop.equip.fx[id]=1; }
  else if(it.kind==='krathong') S.shop.equip.krathong = id;
  else S.shop.equip[it.slot] = S.shop.equip[it.slot]===id ? '' : id;
  save(); renderAll(); renderShop();
}
$('shopBody').addEventListener('click', e=>{ if(e.target.closest('[data-fest]')){ closeShop(); openFest(); } });
$('shopCats').onclick = e=>{ const b=e.target.closest('[data-cat]'); if(b){ shopCat=b.dataset.cat; renderShop(); } };
/* buying takes two taps: the first turns the price into "confirm" for 3 seconds */
$('shopBody').onclick = e=>{
  const u=e.target.closest('[data-use]'); if(u){ toggleUse(u.dataset.use); return; }
  const b=e.target.closest('[data-buy]'); if(!b) return;
  const price=Number(b.dataset.price);
  if(coinsLeft()<price){ toast(t('notEnough')); return; }
  if(!b.classList.contains('confirm')){
    document.querySelectorAll('#shopBody .si-buy.confirm').forEach(x=>{ x.classList.remove('confirm'); x.innerHTML=x.dataset.label; });
    b.dataset.label=b.innerHTML; b.classList.add('confirm'); b.textContent=t('buyConfirm',{n:price});
    clearTimeout(b._t); b._t=setTimeout(()=>{ if(b.isConnected){ b.classList.remove('confirm'); b.innerHTML=b.dataset.label; } }, 3000);
    return;
  }
  buyItem(b.dataset.buy);
};
$('shopBtn').onclick = openShop;
$('shopClose').onclick = closeShop;
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('shop').classList.contains('open')) closeShop(); });
