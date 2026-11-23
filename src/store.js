/* The saved state S: load, save (localStorage), and the hook that triggers a cloud sync. */
import { blank, shape } from './lib/state';
import { KEY } from './config';
import { setLangCode } from './i18n';

/* ---------- state ---------- */
function load(){
  try{ const r = JSON.parse(localStorage.getItem(KEY)); if(r && typeof r==='object') return shape(r); }catch(e){}
  return blank();
}
export let S = load();
setLangCode(S.settings.lang==='en' ? 'en' : 'th');
/* updatedAt moves only when something really changed, so cloud merges can tell which copy is newer */
const snapOf = s => JSON.stringify({...s, updatedAt:0});
var lastSnap = snapOf(S);
function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
/* other modules replace the whole state through these (an imported binding cannot be assigned) */
export function setS(v){ S = v; }
export function replaceState(next){ S = next; lastSnap = snapOf(S); persist(); }
/* cloud sync plugs in here, so the store does not depend on it */
export const hooks = { afterSave(){} };
export function save(){
  const snap = snapOf(S);
  if(snap===lastSnap) return;
  S.updatedAt = Date.now(); lastSnap = snap; persist(); hooks.afterSave();
}
