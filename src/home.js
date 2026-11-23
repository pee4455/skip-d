/* Today tab: hero clock and the week strip. */
import { XP_VAL } from './config';
import { L, fmtDate, t } from './i18n';
import { S } from './store';
import { $, addDays, baht, countTo, fastHours, fastingState, fromKey, hms, hrsMin, icon, keyOf, mondayOf, nightKey, saved, streak } from './util';
import { avatarHTML } from './chars';
import { checkinTarget } from './checkin';
import { renderCity } from './city';
import { renderFest } from './festival';

/* ---------- render: home ---------- */
export function renderHome(){
  const now=new Date();
  $('homeDate').textContent = L().homeDate(now, L());
  $('homeTitle').textContent = S.settings.name ? t('hello',{name:S.settings.name}) : t('tabToday');
  $('miniAvatar').innerHTML = avatarHTML(); $('miniAvatar').dataset.frame = S.shop.equip.frame||'';
  $('phaseRange').textContent = `${S.settings.cutoff} – ${S.settings.breakfast}`;
  $('mClose').textContent = S.settings.cutoff; $('mBreak').textContent = S.settings.breakfast; $('mGoal').textContent = fastHours();
  renderTimer(); renderCity(); renderFest();

  const tg=checkinTarget(), cur=S.log[tg.key];
  $('ciTitle').textContent = t(tg.title);
  $('ciDate').textContent = `${L().daysShort[fromKey(tg.key).getDay()]} ${fmtDate(fromKey(tg.key))}`;
  $('seg').classList.toggle('locked', !tg.open);
  const idx = ['ok','light','miss'].indexOf(cur), th=$('segThumb');
  th.style.opacity = idx<0 ? 0 : 1; th.className = 'thumb ' + (cur||'');
  if(idx>=0) th.style.transform = `translateX(${idx*100}%)`;
  document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('sel', b.dataset.s===cur));
  $('ciNote').innerHTML = (!tg.open ? icon('timer') + t('ciLocked',{t:S.settings.cutoff})
    : cur ? icon('check') + t('ciSaved',{xp:XP_VAL[cur]}) : icon('sparkles') + t('ciHint'));

  const tonight=fromKey(nightKey(now)), mon=mondayOf(tonight);
  let html='', cnt=0;
  for(let i=0;i<7;i++){
    const d=addDays(mon,i), k=keyOf(d), s=S.log[k];
    if(s==='ok'||s==='light') cnt++;
    const inner = s==='ok'||s==='light' ? icon('check') : d.getDate();
    html += `<div><div class="wd">${L().weekHead[i]}</div><div class="dotday ${s||''} ${k===keyOf(tonight)?'today':''}">${inner}</div></div>`;
  }
  $('week').innerHTML = html;
  $('weekCount').textContent = t('weekCount',{n:cnt});

  countTo($('stStreak'), streak(), undefined, 'nights');
  countTo($('stSaved'), saved(), baht);
  countTo($('stFought'), S.cravings, undefined, 'times');
}

export function renderTimer(){
  const now=new Date(), fs=fastingState(now), hero=$('hero');
  let p;
  if(fs.fasting){
    const total=fs.end-fs.start, done=now-fs.start; p=Math.min(1,done/total);
    hero.classList.add('live'); hero.classList.remove('day');
    $('phaseText').textContent=t('fasting');
    $('heroLabel').textContent=t('fastingFor');
    $('heroTime').textContent=hms(done);
    $('heroSub').textContent=t('left',{t:hrsMin(fs.end-now)});
  }else{
    const total=fs.start-fs.since, left=fs.start-now; p=Math.min(1,Math.max(0,1-left/total));
    hero.classList.remove('live'); hero.classList.add('day');
    $('phaseText').textContent=t('eating');
    $('heroLabel').textContent=t('closesIn');
    $('heroTime').textContent=hms(left);
    $('heroSub').textContent = left<3600000 ? t('lastMealSoon') : t('eatLunch');
  }
  // the moon (sun by day) rides the sky arc from left to right as time passes
  $('ringArc').style.strokeDashoffset = 1-p;
  const th = Math.PI*(1-p);
  $('celestial').setAttribute('transform', `translate(${(160+135*Math.cos(th)).toFixed(1)} ${(172-135*Math.sin(th)).toFixed(1)})`);
}
