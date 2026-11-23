/* Daily, weekly and milestone quests. */
import { HAS_GSAP } from './config';
import { lang, t } from './i18n';
import { S, save } from './store';
import { $, addDays, countStatus, fastingState, fromKey, icon, keyOf, mondayOf, nightKey, pop, streak, toast } from './util';
import { CHARS, SETS, ownedCount } from './chars';
import { questIndex, renderRewards } from './gacha';
import { dayStart, runsBetween, totalKm } from './run';

/* ---------- quests ---------- */
function questNight(){
  const now=new Date();
  if(fastingState(now).fasting) return nightKey(now);
  const y=keyOf(addDays(now,-1));
  const pending = dailyQuests(y).some(q=>q.cur>=q.goal && !S.quests.claimed[q.id]);
  return (!S.log[y] || pending) ? y : keyOf(now);
}
const nightHadSos = k => S.sessions.some(x=>nightKey(new Date(x.t))===k);
function dailyQuests(k){ return [
  { id:`d:${k}:checkin`, icon:'check',        title:t('qCheckin'), cur:S.log[k]?1:0,        goal:1, reward:{shards:1} },
  { id:`d:${k}:fast`,    icon:'moon-star',    title:t('qFast'),    cur:S.log[k]==='ok'?1:0, goal:1, reward:{shards:3} },
  { id:`d:${k}:sos`,     icon:'shield-check', title:t('qSos'),     cur:nightHadSos(k)?1:0,  goal:1, reward:{shards:2} },
]; }
function weeklyQuests(k){
  const mon=mondayOf(fromKey(k)), wk=keyOf(mon); let ok=0, logged=0;
  for(let i=0;i<7;i++){ const s=S.log[keyOf(addDays(mon,i))]; if(s) logged++; if(s==='ok') ok++; }
  return [
    { id:`w:${wk}:fast3`, icon:'flame',          title:t('qWeek3'),   cur:Math.min(ok,3), goal:3, reward:{tickets:1} },
    { id:`w:${wk}:fast5`, icon:'flame',          title:t('qWeek5'),   cur:Math.min(ok,5), goal:5, reward:{tickets:2} },
    { id:`w:${wk}:log7`,  icon:'calendar-check', title:t('qWeekLog'), cur:logged,         goal:7, reward:{tickets:1} },
    { id:`w:${wk}:run2`,  icon:'footprints',     title:t('qRun2'),    cur:Math.min(runsBetween(dayStart(mon), 7).length,2), goal:2, reward:{tickets:1} },
    { id:`w:${wk}:run10`, icon:'footprints',     title:t('qRun10'),   cur:Math.min(Math.floor(runsBetween(dayStart(mon), 7).reduce((a,r)=>a+r.dist,0)),10), goal:10, reward:{tickets:2} },
  ];
}
const MILESTONES = [
  { track:'streak',  icon:'flame',     val:()=>Math.max(S.best||0, streak()), title:n=>t('qStreak',{n}),
    items:[[3,{tickets:1}],[7,{tickets:2}],[14,{tickets:3}],[21,{tickets:3}],[30,{tickets:3,gold:1}],[60,{tickets:5,gold:1}],[100,{tickets:8,gold:2}]] },
  { track:'total',   icon:'moon-star', val:()=>countStatus('ok'), title:n=>t('qTotal',{n}),
    items:[[1,{tickets:1}],[10,{tickets:2}],[25,{tickets:3}],[50,{tickets:3,gold:1}],[100,{tickets:5,gold:1}]] },
  { track:'collect', icon:'book-open', val:()=>ownedCount(), title:n=>t('qCollect',{n}),
    items:[[6,{tickets:1}],[12,{tickets:2}],[18,{tickets:3,gold:1}],[24,{tickets:3}],[30,{tickets:4,gold:1}],[36,{tickets:5,gold:2}]] },
  { track:'run',     icon:'footprints', val:()=>Math.floor(totalKm()), title:n=>t('qRunTotal',{n}),
    items:[[5,{tickets:1}],[21,{tickets:2}],[42,{tickets:3,gold:1}],[100,{tickets:5,gold:1}],[200,{tickets:6,gold:2}]] },
];
/* one quest per collection; it only shows in the quest list once the set is complete */
export function setQuest(s){
  const all=CHARS.filter(c=>c.set===s.id);
  return { id:`set:${s.id}`, icon:s.icon, title:t('qSet',{name:s.name[lang]}), cur:all.filter(c=>S.gacha.owned[c.id]).length, goal:all.length, reward:s.reward };
}
function milestoneQuests(){
  const out=[];
  if(!S.quests.claimed['m:welcome']) out.push({ id:'m:welcome', icon:'gift', title:t('qWelcome'), cur:1, goal:1, reward:{tickets:1} });
  for(const s of SETS){ const q=setQuest(s); if(isClaimable(q)) out.push(q); }
  for(const tr of MILESTONES){
    const v=tr.val(); let lockedShown=false;
    for(const [n,reward] of tr.items){
      const id=`m:${tr.track}:${n}`;
      if(S.quests.claimed[id]) continue;
      if(v>=n) out.push({ id, icon:tr.icon, title:tr.title(n), cur:n, goal:n, reward });
      else if(!lockedShown){ out.push({ id, icon:tr.icon, title:tr.title(n), cur:v, goal:n, reward }); lockedShown=true; }
    }
  }
  return out;
}
export function allQuests(){
  const k=questNight(), add=l=>l.map(q=>({...q, reward:{...q.reward, coins:coinValue(q.id)}}));
  return { k, daily:add(dailyQuests(k)), weekly:add(weeklyQuests(k)), milestones:add(milestoneQuests()) };
}
export function coinValue(id){ if(id==='m:welcome') return 50; return ({d:10, w:30, m:50, set:100})[id.split(':')[0]] || 0; }
export const isClaimable = q => q.cur>=q.goal && !S.quests.claimed[q.id];
function claimableCount(){ const a=allQuests(); return [...a.daily,...a.weekly,...a.milestones].filter(isClaimable).length; }

export function rewardChips(r){
  let h='';
  if(r.tickets) h+=`<span class="rw t">${icon('ticket')}${r.tickets}</span>`;
  if(r.gold) h+=`<span class="rw g">${icon('ticket')}${r.gold}</span>`;
  if(r.shards) h+=`<span class="rw s">✦${r.shards}</span>`;
  if(r.coins) h+=`<span class="rw c">${icon('coins')}${r.coins}</span>`;
  return h;
}
function rewardText(r){
  const p=[];
  if(r.tickets) p.push(`${t('tickets')} ×${r.tickets}`);
  if(r.gold) p.push(`${t('gold')} ×${r.gold}`);
  if(r.shards) p.push(`✦ ×${r.shards}`);
  if(r.coins) p.push(`${t('coins')} ×${r.coins}`);
  return p.join(' · ');
}
export function claimQuest(id, btn){
  const q=questIndex[id]; if(!q || !isClaimable(q)) return;
  S.quests.claimed[id]=true;
  const g=S.gacha; g.tickets+=q.reward.tickets||0; g.gold+=q.reward.gold||0; g.shards+=q.reward.shards||0;
  save(); flyReward(btn); toast(t('claimedToast',{r:rewardText(q.reward)}));
  renderRewards();
}
function flyReward(btn){
  if(!HAS_GSAP || !btn) return;
  const from=btn.getBoundingClientRect(), to=$('wallet').getBoundingClientRect();
  for(let i=0;i<6;i++){
    const d=document.createElement('div'); d.className='fly'; d.innerHTML=icon('ticket'); document.body.appendChild(d);
    gsap.fromTo(d,{x:from.left+from.width/2-11, y:from.top, scale:.6, opacity:1},
      {x:to.left+to.width*(.2+Math.random()*.6), y:to.top+to.height/2, scale:1, opacity:.2, duration:.7+Math.random()*.25, delay:i*.04, ease:'power2.in', onComplete:()=>d.remove()});
  }
  setTimeout(()=>pop($('wallet')), 750);
}
