/* Profile tab. */
import { LV_C } from './config';
import { L, t } from './i18n';
import { S } from './store';
import { $, countStatus, countTo, icon, levelInfo, levelName } from './util';
import { BADGES } from './badges';
import { avatarHTML } from './chars';

/* ---------- render: profile ---------- */
export function renderProfile(){
  const li=levelInfo(S.xp);
  $('avatar').innerHTML = avatarHTML(); $('avatar').dataset.frame = S.shop.equip.frame||'';
  $('pName').textContent = S.settings.name || t('user');
  $('pLevel').textContent = `Lv.${li.L} · ${levelName(li.L)}`;
  $('pXP').textContent = t('xpLine',{xp:S.xp.toLocaleString(L().locale), n:li.need-li.cur, l:li.L+1});
  $('lvRing').style.strokeDashoffset = LV_C*(1-li.cur/li.need);
  countTo($('pTotal'), countStatus('ok'));
  countTo($('pBest'), S.best||0);
  countTo($('pMissions'), S.challenges);
  const got = BADGES.filter(b=>S.badges.includes(b.id)).length;
  $('badgeCount').textContent = `${got}/${BADGES.length}`;
  $('badges').innerHTML = BADGES.map(b=>{
    const has=S.badges.includes(b.id);
    return `<div class="${has?'':'locked'}"><div class="medal ${has?'got':''}">${b.icon ? icon(b.icon) : b.txt}</div><div class="n">${L().badges[b.id]}</div></div>`;
  }).join('');
  if(document.activeElement?.tagName!=='INPUT'){
    $('fName').value=S.settings.name; $('fCut').value=S.settings.cutoff; $('fBreak').value=S.settings.breakfast; $('fCost').value=S.settings.cost; $('fWeight').value=S.settings.weight;
  }
}
