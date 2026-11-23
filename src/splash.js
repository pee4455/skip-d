/* Loading screen. */
import { HAS_GSAP, REDUCE } from './config';
import { t } from './i18n';
import { $, animateIn, sleep } from './util';
import { R, openLive } from './run';
import { cloudFirst, cloudFirstSettled, cloudOn, maybeTour, needGate, openGate, setMoonieHTML } from './cloud';
import { showTab } from './app';

/* ---------- splash (loading screen) ----------
   Stays up for at least ~1.3s from launch, until the fonts are in, and — when signed
   in — until the launch sync has pulled fresh data (capped at 3s so offline never blocks). */
function splashMsg(text){ window.__spStop = true; clearInterval(window.__spTick); const m = $('spMsg'); if(m){ m.classList.remove('swap'); m.textContent = text; } }
export function splashGate(){
  window.__spArmed = true;
  const sm = $('spMoonie');   // keep a copy of Moonie for the sign-in page before the splash is removed
  if(sm) setMoonieHTML(sm.outerHTML.replace(' id="spMoonie"', '').replace(/spFace/g, 'gtFace'));
  if(!$('splash')) return hideSplash();
  const shown = sleep(Math.max(0, 1300 - performance.now()));
  const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, sleep(2000)]) : Promise.resolve();
  let signedIn = false;
  try{ signedIn = cloudOn() && !!localStorage.getItem('skipdinner.auth'); }catch(e){}
  const cloud = signedIn ? Promise.race([cloudFirst, sleep(3000)]) : null;
  Promise.all([shown, fonts])
    .then(()=>{ if(cloud && !cloudFirstSettled) splashMsg(t('syncBusy')); return cloud; })
    .then(hideSplash, hideSplash);
}
function hideSplash(){
  const sp = $('splash');
  if(!sp){ animateIn($('tab-home')); return afterSplash(); }
  if(sp.dataset.out) return;
  sp.dataset.out = '1';
  window.__spStop = true; clearInterval(window.__spTick);
  // finish the progress bar from wherever its CSS animation got to
  const bar = $('spBar'), at = getComputedStyle(bar).transform;
  bar.style.animation = 'none'; bar.style.transform = at === 'none' ? 'scaleX(.9)' : at;
  void bar.offsetWidth;
  bar.style.transition = 'transform .25s ease-out'; bar.style.transform = 'scaleX(1)';
  const finish = ()=>{ sp.remove(); afterSplash(); };
  if(!HAS_GSAP){ sp.classList.add('out'); animateIn($('tab-home')); setTimeout(finish, REDUCE ? 0 : 320); return; }
  $('spMoonie').setAttribute('data-mood', 'excited');
  gsap.timeline({ onComplete: finish })
    .to('#spMoonie', { y:-16, duration:.18, ease:'power2.out' }, .12)
    .to('#spMoonie', { y:0, duration:.34, ease:'bounce.out' })
    .call(()=>animateIn($('tab-home')), null, '-=.1')
    .to(sp, { opacity:0, scale:1.05, duration:.36, ease:'power2.inOut' }, '<');
}
function afterSplash(){
  if(R){ showTab('run'); openLive(); return; }   // the app was closed mid-run: go straight back to it
  if(needGate()) openGate(); else maybeTour();
}
