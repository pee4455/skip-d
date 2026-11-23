/* Achievement badges. */
import { L, t } from './i18n';
import { S } from './store';
import { celebrate, countStatus, saved, streak, toast } from './util';
import { totalKm } from './run';

export const BADGES = [
  { id:'first', icon:'sprout',       test:()=>countStatus('ok')>=1 },
  { id:'s3',    txt:'3',             test:s=>s.best>=3 },
  { id:'s7',    txt:'7',             test:s=>s.best>=7 },
  { id:'s14',   txt:'14',            test:s=>s.best>=14 },
  { id:'s30',   txt:'30',            test:s=>s.best>=30 },
  { id:'n20',   icon:'moon-star',    test:()=>countStatus('ok')>=20 },
  { id:'f1',    icon:'shield-check', test:s=>s.cravings>=1 },
  { id:'f10',   icon:'flame',        test:s=>s.cravings>=10 },
  { id:'c10',   icon:'target',       test:s=>s.challenges>=10 },
  { id:'b500',  icon:'piggy-bank',   test:()=>saved()>=500 },
  { id:'b2000', icon:'coins',        test:()=>saved()>=2000 },
  { id:'honest',icon:'heart',        test:()=>countStatus('miss')>=1 },
  { id:'run1',  icon:'footprints',   test:s=>(s.runs||[]).length>=1 },
  { id:'run42', icon:'mountain',     test:()=>totalKm()>=42.195 },
  { id:'lk26',  icon:'lotus',        test:s=>Object.keys((s.fest||{}).floats||{}).some(k=>k>='2026-11-20' && k<='2026-11-30') },
];
export function checkBadges(){
  S.best = Math.max(S.best||0, streak());
  let delay = 0;
  for(const b of BADGES){
    if(!S.badges.includes(b.id) && b.test(S)){
      S.badges.push(b.id);
      delay += 2600; setTimeout(()=>{ toast(t('badgeGot',{name:L().badges[b.id]})); celebrate(.6); }, delay);
    }
  }
}
