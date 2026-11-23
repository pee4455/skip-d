/* Onboarding tour with Moonie. */
import { HAS_GSAP, REDUCE } from './config';
import { lang, t } from './i18n';
import { S, save } from './store';
import { $, celebrate, gainXP, pad, pop, sleep, toast } from './util';
import { renderAll, showTab, tab } from './app';

/* ---------- onboarding tour (NPC guide "Moonie") ---------- */
const STEPS = [
  { key:'t_welcome', mood:'excited', wave:true },
  { key:'t_name',    mood:'happy',   type:'name', top:true },
  { key:'t_hero',    mood:'happy',   tab:'home', target:'#hero' },
  { key:'t_cutoff',  mood:'think',   tab:'home', target:'#hero .hero-metrics', type:'cutoff' },
  { key:'t_sos',     mood:'wink',    tab:'home', target:'#sosBtn' },
  { key:'t_checkin', mood:'happy',   tab:'home', target:'#ciCard' },
  { key:'t_week',    mood:'excited', tab:'home', target:'#week' },
  { key:'t_charts',  mood:'think',   tab:'progress', target:'#weekCard' },
  { key:'t_cal',     mood:'wink',    tab:'progress', target:'#calCard' },
  { key:'t_badges',  mood:'excited', tab:'profile', target:'#badges' },
  { key:'t_run',     mood:'excited', tab:'run', target:'#runCta' },
  { key:'t_gacha',   mood:'excited', tab:'rewards', target:'#machineCard' },
  { key:'t_help',    mood:'happy',   tab:'home', target:'#helpBtn', round:true },
  { key:'t_done',    mood:'excited', wave:true, final:true },
];
let tour = null;
const hole = { x:0, y:0, w:0, h:0, r:26 };
function drawHole(){
  const W=innerWidth, H=innerHeight, {x,y,w,h}=hole, r=Math.max(0,Math.min(hole.r, w/2, h/2));
  let p = `M0 0H${W}V${H}H0Z`;
  if(w>2 && h>2) p += ` M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
  $('shade').style.clipPath = `path(evenodd, "${p}")`;
  Object.assign($('spot').style, { left:x+'px', top:y+'px', width:w+'px', height:h+'px', borderRadius:r+'px' });
}
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function graphemes(s){ try{ return [...new Intl.Segmenter(lang,{granularity:'grapheme'}).segment(s)].map(x=>x.segment); }catch(e){ return Array.from(s); } }
function tourVars(){
  const n=S.settings.name;
  return lang==='th'
    ? { hi: n ? `ยินดีที่ได้รู้จักนะ คุณ${n}!\n` : '', nm: n ? ` คุณ${n}` : '' }
    : { hi: n ? `Nice to meet you, ${n}!\n` : '',      nm: n ? `, ${n}` : '' };
}

export function startTour(){
  if(tour || $('sos').classList.contains('open')) return;
  tour = { i:-1, typing:null, run:0, firstTime:!S.tourDone };
  $('tour').classList.add('open'); document.body.style.overflow='hidden';
  Object.assign(hole,{ x:innerWidth/2, y:innerHeight*0.38, w:0, h:0 }); drawHole(); $('spot').style.opacity=0;
  if(HAS_GSAP){
    gsap.fromTo('#tour',{opacity:0},{opacity:1,duration:.35});
    gsap.fromTo('#dlg',{y:60,opacity:0},{y:0,opacity:1,duration:.6,ease:'back.out(1.5)',delay:.1});
    gsap.fromTo('#mascot',{scale:.3,rotate:-25},{scale:1,rotate:0,duration:.8,ease:'elastic.out(1,.55)',delay:.25});
  }
  goStep(0);
}

function endTour(completed){
  if(!tour) return;
  clearInterval(tour.typing);
  const first = tour.firstTime;
  S.tourDone = true;
  if(completed && first) gainXP(20);
  save();
  const fin = ()=>{
    $('tour').classList.remove('open'); document.body.style.overflow=''; tour=null;
    showTab('home'); renderAll();
    if(completed){ celebrate(1); if(first) toast(t('tourGift')); }
  };
  if(HAS_GSAP) gsap.to('#tour',{opacity:0,duration:.3,onComplete:()=>{ fin(); gsap.set('#tour',{clearProps:'opacity'}); }});
  else fin();
}

async function goStep(i){
  const run = ++tour.run, st = STEPS[i];
  tour.i = i;
  clearInterval(tour.typing); tour.typing=null; tour.onTyped=null;
  $('dlgBox').classList.remove('ready');
  $('tourDots').innerHTML = STEPS.map((_,k)=>`<i class="${k===i?'on':k<i?'done':''}"></i>`).join('');
  $('tourNext').textContent = st.final ? t('tourStart') : st.type==='name' ? t('tourNoName') : t('tourNext');
  $('tourSkip').style.visibility = st.final ? 'hidden' : 'visible';
  $('dlgExtra').innerHTML=''; $('dlgText').textContent='';
  const m=$('moonie'); m.dataset.mood=st.mood; m.classList.toggle('wave', !!st.wave);
  if(HAS_GSAP && i>0) gsap.fromTo('#mascot',{y:0},{y:-12,duration:.18,yoyo:true,repeat:1,ease:'power2.out'});
  if(st.tab && st.tab!==tab){ showTab(st.tab); await sleep(650); } else await sleep(40);
  if(!tour || run!==tour.run) return;
  await layoutStep(true);
  if(!tour || run!==tour.run) return;
  typeText(t(st.final && !tour.firstTime ? 't_doneAgain' : st.key, tourVars()), ()=>renderExtra(st));
}

async function layoutStep(scroll){
  if(!tour) return;
  const st=STEPS[tour.i], el=st.target && document.querySelector(st.target);
  let rect=null;
  if(el){
    if(scroll){ const r=el.getBoundingClientRect(); window.scrollTo(0, Math.max(0, window.scrollY + r.top - 96)); await sleep(70); }
    rect = el.getBoundingClientRect();
  }
  const need = $('dlgBox').offsetHeight + 110;
  const top = st.top || (rect && rect.bottom > innerHeight - need && rect.top > need);
  $('dlg').classList.toggle('top', !!top);
  const pad = 8;
  const box = rect
    ? { x:rect.left-pad, y:rect.top-pad, w:rect.width+pad*2, h:rect.height+pad*2, r: st.round ? 999 : 26 }
    : { x:innerWidth/2, y:innerHeight*0.38, w:0, h:0, r:26 };
  if(HAS_GSAP){
    gsap.to(hole,{...box, duration:.55, ease:'power3.inOut', onUpdate:drawHole});
    gsap.to('#spot',{opacity: rect ? 1 : 0, duration:.3, delay: rect ? .35 : 0});
  }else{ Object.assign(hole, box); drawHole(); $('spot').style.opacity = rect ? 1 : 0; }
}

function typeText(str, done){
  const g=graphemes(str), el=$('dlgText');
  let k=0;
  tour.full=str; tour.onTyped=done;
  $('moonie').classList.add('talking');
  if(REDUCE){ finishTyping(); return; }
  tour.typing = setInterval(()=>{ k++; el.textContent=g.slice(0,k).join(''); if(k>=g.length) finishTyping(); }, 24);
}
function finishTyping(){
  if(!tour) return;
  clearInterval(tour.typing); tour.typing=null;
  $('dlgText').textContent = tour.full;
  $('moonie').classList.remove('talking');
  $('dlgBox').classList.add('ready');
  const cb=tour.onTyped; tour.onTyped=null; if(cb) cb();
}
function advance(){
  if(!tour) return;
  if(tour.typing){ finishTyping(); return; }
  const st=STEPS[tour.i];
  if(st.final) endTour(true); else goStep(tour.i+1);
}

function renderExtra(st){
  const x=$('dlgExtra');
  if(st.type==='name'){
    x.innerHTML = `<form class="dlg-input" id="nameForm"><input id="tourName" maxlength="20" autocomplete="nickname" enterkeyhint="done" placeholder="${escapeHtml(t('fNamePh'))}" value="${escapeHtml(S.settings.name)}"><button type="submit">${escapeHtml(t('tourOk'))}</button></form>`;
    $('nameForm').onsubmit = e=>{
      e.preventDefault();
      const v=$('tourName').value.trim();
      if(v){ S.settings.name=v; save(); renderAll(); }
      $('tourName').blur(); goStep(tour.i+1);
    };
  }else if(st.type==='cutoff'){
    const opts=['16:00','17:00','18:00','19:00'];
    x.innerHTML = `<div class="dlg-choices">${opts.map(o=>`<button data-v="${o}" class="${o===S.settings.cutoff?'sel':''}">${o}</button>`).join('')}</div>`;
    x.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const v=b.dataset.v;
      if(v<=S.settings.breakfast){ toast(t('errCut')); return; }
      S.settings.cutoff=v; save(); renderAll();
      x.querySelectorAll('button').forEach(o=>o.classList.toggle('sel', o===b)); pop(b);
      setTimeout(()=>{ if(tour && STEPS[tour.i]===st) goStep(tour.i+1); }, 450);
    });
  }
  if(HAS_GSAP && x.innerHTML) gsap.fromTo(x,{opacity:0,y:8},{opacity:1,y:0,duration:.35});
}

$('dlgBox').addEventListener('click', e=>{ if(e.target.closest('button,input,form')) return; advance(); });
$('tour').addEventListener('click', e=>{ if(e.target===$('tour')) advance(); });
$('tourNext').onclick = e=>{ e.stopPropagation(); advance(); };
$('tourSkip').onclick = e=>{ e.stopPropagation(); endTour(false); };
$('mascot').onclick = e=>{
  e.stopPropagation();
  const m=$('moonie'); m.dataset.mood='wink'; pop($('mascot'));
  setTimeout(()=>{ if(tour) m.dataset.mood=STEPS[tour.i].mood; }, 800);
};
document.addEventListener('keydown', e=>{
  if(!tour || e.target.tagName==='INPUT') return;
  if(e.key==='Enter' || e.key===' ' || e.key==='ArrowRight'){ e.preventDefault(); advance(); }
  else if(e.key==='Escape') endTour(false);
});
window.addEventListener('resize', ()=>{ if(tour) layoutStep(false); });
$('helpBtn').onclick = ()=>startTour();
$('replayTour').onclick = ()=>{ showTab('home'); setTimeout(startTour, 350); };
