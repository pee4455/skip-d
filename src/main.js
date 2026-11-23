/* Entry point: boot. */
import { mergeState, shape } from './lib/state';
import { bestTime, segTotals, splits } from './lib/run-math';
import { S, save, setS } from './store';
import { nightKey } from './util';
import { checkBadges } from './badges';
import { setStatus } from './checkin';
import { cityWallet, openCitySheet, openPostcard } from './city';
import { coinsLeft, openShop } from './shop';
import { festActive, lotusLeft, openFest } from './festival';
import { renderTimer } from './home';
import { R, buildRun, startRun } from './run';
import { cloudInit } from './cloud';
import { splashGate } from './splash';
import { applyStatic, renderAll, showTab, tab } from './app';
import { registerSW } from './pwa';

/* ---------- boot ---------- */
applyStatic(); checkBadges(); save(); renderAll(); showTab('home');
setInterval(()=>{ if(tab==='home') renderTimer(); }, 1000);
cloudInit();
splashGate();
registerSW();
let lastNight = nightKey();
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ renderAll(); } });
setInterval(()=>{ const n=nightKey(); if(n!==lastNight){ lastNight=n; renderAll(); } }, 60000);

/* debugging hook for local development only */
if(import.meta.env.DEV || ['localhost','127.0.0.1'].includes(location.hostname)){
  window.__app = { get S(){ return S; }, set S(v){ setS(v); }, save, renderAll, setStatus, mergeState, shape, cityWallet, coinsLeft, lotusLeft, festActive, buildRun, splits, bestTime, segTotals, showTab, openShop, openFest, openCitySheet, openPostcard, startRun, R:()=>R };
}
