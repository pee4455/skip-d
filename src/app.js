/* App shell: static text, language, tabs, global events, renderAll. */
import { blank } from './lib/state';
import { XP_VAL } from './config';
import { lang, setLangCode, t } from './i18n';
import { S, save, setS } from './store';
import { $, animateIn, celebrate, fromKey, nightKey, toast } from './util';
import { checkinTarget, setStatus } from './checkin';
import { renderHome } from './home';
import { destroyCharts, renderCharts, renderProgress } from './progress';
import { renderProfile } from './profile';
import { showMission, sos, tickSOS } from './sos';
import { renderRewards } from './gacha';
import { renderRun } from './run';
import { renderAccount } from './cloud';

/* ---------- static text ---------- */
export function applyStatic(){
  document.documentElement.lang = lang;
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $('navTitle').textContent = t($('tab-'+tab).dataset.title);
  $('langBtnText').textContent = lang==='th' ? 'EN' : 'ไทย';
  document.querySelectorAll('#langSeg button').forEach(b=>b.classList.toggle('sel', b.dataset.lang===lang));
}
function setLang(l){
  if(l===lang) return;
  setLangCode(l); S.settings.lang = l; save();
  applyStatic(); destroyCharts(); renderAll();
  if(tab==='progress') renderCharts(fromKey(nightKey()));
  if($('sos').classList.contains('open') && sos){ showMission(); tickSOS(); }
  toast(t('langSwitched'));
}

export function renderAll(){ renderHome(); renderRun(); renderProgress(); renderProfile(); renderRewards(); renderAccount(); }

/* ---------- tabs & nav ---------- */
export let tab='home';
export function showTab(name){
  const changed = name!==tab; tab=name;
  document.querySelectorAll('.tab').forEach(s=>s.hidden = s.id!=='tab-'+name);
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===name));
  $('navTitle').textContent = t($('tab-'+name).dataset.title);
  window.scrollTo(0,0); onScroll();
  if(name==='progress') renderCharts(fromKey(nightKey()));
  if(changed) animateIn($('tab-'+name));
}
document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('miniAvatar').onclick = ()=>showTab('profile');
function onScroll(){ $('nav').classList.toggle('show', window.scrollY>48); }
window.addEventListener('scroll', onScroll, {passive:true});

/* ---------- events ---------- */
$('langBtn').onclick = ()=>setLang(lang==='th' ? 'en' : 'th');
document.querySelectorAll('#langSeg button').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));

document.querySelectorAll('#seg button').forEach(b=>b.onclick=()=>{
  const tg=checkinTarget(); if(!tg.open) return;
  const s=b.dataset.s; if(S.log[tg.key]===s) return;
  setStatus(tg.key,s);
  if(s==='ok'){ celebrate(); toast(t('toastOk',{xp:XP_VAL.ok})); }
  else toast(s==='light' ? t('toastLight',{xp:XP_VAL.light}) : t('toastMiss'));
});

function bindSetting(id, apply){
  $(id).addEventListener('change', ()=>{ if(apply($(id).value)!==false){ save(); renderAll(); toast(t('settingsSaved')); } else renderProfile(); });
}
bindSetting('fName', v=>{ S.settings.name=v.trim(); });
bindSetting('fCut', v=>{ if(!v||v<=S.settings.breakfast){ toast(t('errCut')); return false; } S.settings.cutoff=v; });
bindSetting('fBreak', v=>{ if(!v||v>=S.settings.cutoff){ toast(t('errBreak')); return false; } S.settings.breakfast=v; });
bindSetting('fCost', v=>{ S.settings.cost=Math.max(0,Number(v)||0); });
bindSetting('fWeight', v=>{ const n=Number(v); if(!(n>=25 && n<=250)){ toast(t('errWeight')); return false; } S.settings.weight=Math.round(n*10)/10; });
$('resetAll').onclick=()=>{ if(confirm(t('resetConfirm'))){ const l=lang; setS(blank()); S.settings.lang=l; S.epoch=Date.now(); save(); destroyCharts(); renderAll(); toast(t('resetDone')); } };

try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ destroyCharts(); renderAll(); }); }catch(e){}
