/* Craving mode (SOS). */
import { CD_C, HAS_GSAP, WAVE_MS } from './config';
import { L, t } from './i18n';
import { S, save } from './store';
import { $, celebrate, gainXP, mmss, pop } from './util';
import { checkBadges } from './badges';
import { renderAll } from './app';

/* ---------- SOS ---------- */
export let sos = null, sosTimer = null, missionIdx = -1;
export function showMission(){ $('mText').textContent = L().missionList[missionIdx] || ''; }
function newMission(){
  const n = L().missionList.length; let i;
  do{ i=Math.floor(Math.random()*n); }while(n>1 && i===missionIdx);
  missionIdx=i; showMission(); $('mDone').disabled=false; $('mDoneText').textContent=t('mDone');
  if(HAS_GSAP) gsap.fromTo('#mText',{opacity:0,y:8},{opacity:1,y:0,duration:.35,ease:'power2.out'});
}
export function tickSOS(){
  const el=Date.now()-sos.start, left=WAVE_MS-el;
  $('sosClock').textContent = left>0 ? mmss(left+999) : mmss(el);
  $('sosCue').textContent = (el/1000)%10 < 4 ? t('breatheIn') : t('breatheOut');
  $('sosSub').textContent = left>0 ? t('sosSub') : t('sosSubDone');
  $('cdArc').style.strokeDashoffset = CD_C*(1-Math.max(0,left)/WAVE_MS);
}
$('sosBtn').onclick = ()=>{
  sos = { start:Date.now(), missions:0, xp:0 };
  newMission();
  const br=$('breath'); br.classList.remove('go'); void br.offsetWidth; br.classList.add('go');
  $('sos').classList.remove('done'); $('sos').classList.add('open');
  document.body.style.overflow='hidden';
  tickSOS(); clearInterval(sosTimer); sosTimer=setInterval(tickSOS,250);
  if(HAS_GSAP){
    gsap.fromTo('#sos',{opacity:0},{opacity:1,duration:.3});
    gsap.fromTo('#sos .run > *',{opacity:0,y:24},{opacity:1,y:0,duration:.6,stagger:.07,ease:'power3.out',clearProps:'transform,opacity'});
  }
};
function closeSOS(){
  clearInterval(sosTimer);
  const done=()=>{ $('sos').classList.remove('open'); document.body.style.overflow=''; renderAll(); };
  if(HAS_GSAP) gsap.to('#sos',{opacity:0,duration:.25,onComplete:()=>{ done(); gsap.set('#sos',{clearProps:'opacity'}); }}); else done();
}
$('sosClose').onclick = closeSOS;
$('mShuffle').onclick = newMission;
$('mDone').onclick = ()=>{
  S.challenges++; gainXP(10); sos.missions++; sos.xp+=10; checkBadges(); save();
  $('mDone').disabled=true; $('mDoneText').textContent=t('mDoneOk');
  pop($('mDone'));
  setTimeout(newMission, 900);
};
$('sosFinish').onclick = ()=>{
  clearInterval(sosTimer);
  const dur = Date.now()-sos.start;
  S.cravings++; S.sessions.push({ t:Date.now(), d:Math.round(dur/1000) }); if(S.sessions.length>300) S.sessions.shift();
  gainXP(10); sos.xp+=10; checkBadges(); save();
  $('sumTime').textContent = mmss(dur);
  $('sumMissions').textContent = sos.missions;
  $('sumXP').textContent = '+'+sos.xp;
  $('sumMsg').textContent = t('sumMsg',{n:S.cravings}) + ' ' + t('cityFlag');
  $('sos').classList.add('done');
  if(HAS_GSAP){
    gsap.fromTo('#sos .summary .ok',{scale:.2,opacity:0,rotate:-30},{scale:1,opacity:1,rotate:0,duration:.7,ease:'back.out(2.2)'});
    gsap.fromTo('#sos .summary > :not(.ok)',{opacity:0,y:20},{opacity:1,y:0,duration:.5,stagger:.08,delay:.2,ease:'power3.out',clearProps:'transform,opacity'});
  }
  celebrate(1.1);
};
$('sosDone').onclick = closeSOS;
