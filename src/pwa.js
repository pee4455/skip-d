/* Service worker registration and the "new version" bar.
   The home-screen app on iPhone usually resumes instead of reloading, so it checks for a new
   version every time it comes back to the foreground and offers to switch. */
import { $ } from './util';

let reloadOnSwitch = false;

function offerUpdate(reg){
  const bar = $('updateBar');
  if(!bar || !reg.waiting) return;
  bar.hidden = false;
  $('updateBtn').onclick = () => {
    bar.classList.add('busy');
    reloadOnSwitch = true;
    reg.waiting && reg.waiting.postMessage({ type:'SKIP_WAITING' });
  };
}

export function registerSW(){
  if(!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  // the new worker took over because the user asked: load the new version
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(reloadOnSwitch) location.reload(); });
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // a new version only needs the bar when an older one is already running this page
    if(reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if(w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(reg); });
    });
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if(!document.hidden) check(); });
    setInterval(check, 60 * 60 * 1000);
  }).catch(() => {});
}
