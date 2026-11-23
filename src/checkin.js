/* Nightly check-in. */
import { XP_VAL } from './config';
import { S, save } from './store';
import { addDays, fastingState, gainXP, keyOf, nightKey } from './util';
import { checkBadges } from './badges';
import { useFreeze } from './shop';
import { renderAll } from './app';

/* ---------- check-in ---------- */
export function checkinTarget(){
  const now=new Date(), fs=fastingState(now);
  if(!fs.fasting){
    const last = keyOf(addDays(now,-1));
    if(!S.log[last]) return { key:last, title:'ciLastNight', open:true };
    return { key:keyOf(now), title:'ciTonight', open:false };
  }
  return { key:nightKey(now), title:'ciTonight', open:true };
}
export function setStatus(key,status){
  const old = S.log[key];
  if(status==='miss' && old!=='miss') useFreeze(key);
  else if(status!=='miss' && S.shop.frozen[key]) delete S.shop.frozen[key];   // not a miss any more: the freeze comes back
  if(old) gainXP(-XP_VAL[old]);
  if(status){ S.log[key]=status; gainXP(XP_VAL[status]); } else delete S.log[key];
  S.logAt[key] = Date.now();
  checkBadges(); save(); renderAll();
}
