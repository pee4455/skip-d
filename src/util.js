/* Small shared helpers: DOM, dates and the fasting window, motion, toasts, XP, bottom sheets. */
import { HAS_GSAP, REDUCE } from './config';
import { L, t } from './i18n';
import { S } from './store';

/* ---------- helpers ---------- */
export const $ = id => document.getElementById(id);
export const pad = n => String(n).padStart(2,'0');
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const fromKey = k => { const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d,12); };
export const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const atTime = (base,hhmm) => { const [h,m]=hhmm.split(':').map(Number); const d=new Date(base); d.setHours(h,m,0,0); return d; };
export const icon = id => `<svg class="i"><use href="#i-${id}"/></svg>`;
export const baht = n => '฿' + Math.round(n).toLocaleString(L().locale);
export const mondayOf = d => addDays(d, -((d.getDay()+6)%7));
export const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export function hms(ms){ const s=Math.max(0,Math.floor(ms/1000)); return `${Math.floor(s/3600)}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`; }
export function mmss(msv){ const s=Math.max(0,Math.floor(msv/1000)); return `${Math.floor(s/60)}:${pad(s%60)}`; }
export function hrsMin(msv){ const m=Math.max(0,Math.round(msv/60000)); const h=Math.floor(m/60), mm=m%60; return h ? t('hm',{h,m:mm}) : t('mOnly',{m:mm}); }
export function fastHours(){ const [ch,cm]=S.settings.cutoff.split(':').map(Number), [bh,bm]=S.settings.breakfast.split(':').map(Number);
  const mins=((bh*60+bm)+1440-(ch*60+cm))%1440; return t('hours',{n:Math.round(mins/6)/10}); }

export function nightKey(now=new Date()){ return keyOf(now < atTime(now,S.settings.breakfast) ? addDays(now,-1) : now); }
export function fastingState(now=new Date()){
  const {cutoff,breakfast} = S.settings;
  const cut = atTime(now,cutoff), brk = atTime(now,breakfast);
  if(now < brk) return { fasting:true, start:atTime(addDays(now,-1),cutoff), end:brk };
  if(now >= cut) return { fasting:true, start:cut, end:atTime(addDays(now,1),breakfast) };
  return { fasting:false, since:brk, start:cut, end:atTime(addDays(now,1),breakfast) };
}
export function countStatus(s){ return Object.values(S.log).filter(v=>v===s).length; }
export const nightSaving = s => s==='ok' ? Number(S.settings.cost||0) : s==='light' ? Number(S.settings.cost||0)/2 : 0;
export function saved(){ return Object.values(S.log).reduce((a,s)=>a+nightSaving(s),0); }
export function streak(){
  let d = fromKey(nightKey());
  if(!S.log[keyOf(d)]) d = addDays(d,-1);
  let n=0;
  for(;;){ const k=keyOf(d), v=S.log[k]; if(v==='ok'||v==='light') n++; else if(!(v==='miss' && S.shop.frozen[k])) break; d=addDays(d,-1); }
  return n;
}
export function levelInfo(xp){ let Lv=1; while(xp >= 50*(Lv+1)*Lv) Lv++; const base=50*Lv*(Lv-1), next=50*(Lv+1)*Lv; return {L:Lv,cur:xp-base,need:next-base}; }
export const levelName = Lv => L().levels[Math.min(Lv,L().levels.length)-1];

/* ---------- motion ---------- */
export function countTo(el, to, fmt=v=>Math.round(v), unitKey){
  const from = el.dataset.v==null ? 0 : Number(el.dataset.v);
  el.dataset.v = to;
  const draw = v => { el.innerHTML = fmt(v) + (unitKey ? `<span class="u">${t(unitKey)}</span>` : ''); };
  if(el._tw) el._tw.kill();
  if(!HAS_GSAP || from===to){ draw(to); return; }
  const o={v:from}; el._tw = gsap.to(o,{v:to,duration:1.1,ease:'power3.out',onUpdate:()=>draw(o.v)});
}
export function animateIn(section){
  if(!HAS_GSAP) return;
  gsap.fromTo(section.querySelectorAll('.anim'), {opacity:0,y:18}, {opacity:1,y:0,duration:.55,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});
}
let fire = null;
export function celebrate(power=1){
  if(REDUCE || !window.confetti) return;
  if(!fire) fire = confetti.create($('confetti'), {resize:true, useWorker:true});
  const colors=['#ff3d00','#ff6a2b','#ff9a62','#ffd2bf','#ffffff'];
  fire({particleCount:Math.round(70*power), spread:70, startVelocity:42, origin:{y:.72}, colors, scalar:.9, ticks:220});
  setTimeout(()=>fire({particleCount:Math.round(40*power), spread:110, origin:{y:.6}, colors, scalar:.75, ticks:200}), 160);
}
export function pop(el){ if(HAS_GSAP && el) gsap.fromTo(el,{scale:.85},{scale:1,duration:.5,ease:'back.out(3)'}); }

/* ---------- feedback ---------- */
let toastT;
export function toast(msg){ $('toastText').textContent=msg; const el=$('toast'); el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2400); }
export function gainXP(n){
  const before = levelInfo(S.xp).L;
  S.xp = Math.max(0, S.xp+n);
  const after = levelInfo(S.xp).L;
  if(after>before) setTimeout(()=>{ toast(t('levelUp',{name:levelName(after), l:after})); celebrate(1.2); }, 2600);
}
export const sleep = ms => new Promise(r=>setTimeout(r,ms));

/* ---- bottom sheets (run detail, manual log, city, postcard, festival) ----
   Named openModal/closeModal so they do not clash with the calendar day sheet (openSheet/closeSheet). */
export function openModal(id){ $(id).classList.add('open'); $(id).querySelector('.rm-panel').scrollTop=0; if(HAS_GSAP) gsap.fromTo(`#${id} .rm-panel`,{y:'100%'},{y:0,duration:.45,ease:'power4.out'}); }
export function closeModal(id){
  if(!HAS_GSAP){ $(id).classList.remove('open'); return; }
  gsap.to(`#${id} .rm-panel`,{y:'100%',duration:.28,ease:'power3.in',onComplete:()=>{ $(id).classList.remove('open'); gsap.set(`#${id} .rm-panel`,{clearProps:'transform'}); }});
}
export const escHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
