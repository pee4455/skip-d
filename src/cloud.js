/* Cloud sync (Supabase), sign-in sheet and sign-in page. */
import { mergeState, pristine, shape, stable } from './lib/state';
import { CLOUD, HAS_GSAP, SYNC_KEY } from './config';
import { L, lang, t } from './i18n';
import { S, hooks, replaceState } from './store';
import { $, escHTML, icon, sleep, toast } from './util';
import { destroyCharts } from './progress';
import { startTour } from './tour';
import { renderAll } from './app';

/* ---------- cloud sync (Supabase) ----------
   Local-first: the app always runs from localStorage. When signed in, the whole
   state is mirrored to one row per user in public.user_state (see supabase/schema.sql). */
var sb = null, cloudUser = null, syncState = 'wait', syncAt = 0, syncT = null, syncBusy = false, syncAgain = false, cloudLoading = null;
/* settles once the launch-time sync is over (or there is nothing to sync), so the splash can wait for fresh data */
export let cloudFirstSettled = false, cloudFirstDone;
export const cloudFirst = new Promise(r => { cloudFirstDone = () => { cloudFirstSettled = true; r(); }; });
const syncWaiters = [];   // resolved after the next sync attempt finishes
const nextSync = (cap=4000) => Promise.race([new Promise(r=>syncWaiters.push(r)), sleep(cap)]);
export const cloudOn = () => !!(CLOUD.url && CLOUD.key);
function syncMeta(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }catch(e){ return {}; } }
function setSyncMeta(m){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify(m)); }catch(e){} }


hooks.afterSave = () => scheduleSync();
function scheduleSync(ms=1500){ if(!sb || !cloudUser) return; clearTimeout(syncT); syncT = setTimeout(cloudSync, ms); }
async function cloudSync(){
  if(!sb || !cloudUser) return;
  if(syncBusy){ syncAgain = true; return; }
  clearTimeout(syncT); syncT = null; syncBusy = true; setSync('busy');
  const uid = cloudUser.id;
  try{
    const { data:row, error } = await sb.from('user_state').select('data').eq('user_id', uid).maybeSingle();
    if(error) throw error;
    if(!cloudUser || cloudUser.id!==uid) return;
    const first = syncMeta().uid !== uid;
    const remote = row ? shape(row.data) : null;
    const next = !remote ? S : first ? (pristine(S) ? remote : mergeState(remote, S, true)) : mergeState(S, remote);
    next.settings.lang = lang;   // language is a per-device choice
    if(stable(next)!==stable(S)){
      replaceState(next);
      destroyCharts(); renderAll();
      if(first) toast(t('cloudPulled'));
    }
    if(!remote || stable(S)!==stable(remote)){
      const { error:e2 } = await sb.from('user_state').upsert({ user_id:uid, data:S, updated_at:new Date().toISOString() });
      if(e2) throw e2;
    }
    setSyncMeta({ uid }); syncAt = Date.now(); setSync('ok');
  }catch(e){
    console.warn('cloud sync failed', e);
    setSync(navigator.onLine===false ? 'offline' : 'err');
  }finally{
    syncBusy = false; cloudFirstDone(); syncWaiters.splice(0).forEach(f=>f());
    if(syncAgain){ syncAgain = false; scheduleSync(300); }
  }
}
function setSync(s){ syncState = s; renderAccount(); }

export function renderAccount(){
  if(!cloudOn()) return;
  $('acctHead').hidden = $('acct').hidden = false;
  if(!cloudUser){
    $('acct').innerHTML = `<div class="row" data-act="signin" role="button" tabindex="0"><div class="ic cloud">${icon('cloud')}</div><div class="t"><b>${t('cloudCta')}</b><span>${t('cloudCtaSub')}</span></div><svg class="i chev"><use href="#i-chevron-right"/></svg></div>`;
    return;
  }
  const st = syncState, warn = st==='err' || st==='offline';
  const time = syncAt ? new Date(syncAt).toLocaleTimeString(L().locale, { hour:'2-digit', minute:'2-digit' }) : '';
  const label = st==='busy' ? t('syncBusy') : st==='offline' ? t('syncOffline') : st==='err' ? t('syncErr') : st==='ok' ? t('syncOk',{time}) : t('syncWait');
  const dot = warn ? 'warn' : st==='ok' ? '' : 'busy';
  $('acct').innerHTML =
    `<div class="row" data-act="sync" role="button" tabindex="0"><div class="ic ${warn?'warn':'cloud'}">${icon(warn?'cloud-off':'cloud')}</div><div class="t"><b>${escHTML(cloudUser.email||'')}</b><span><i class="dot ${dot}"></i>${label}</span></div><span class="sync-ic ${st==='busy'?'spin':''}">${icon('refresh-cw')}</span></div>`+
    `<div class="row" data-act="signout" role="button" tabindex="0"><div class="ic">${icon('log-out')}</div><div class="t"><b>${t('signOut')}</b></div></div>`+
    `<div class="row danger-row" data-act="delete" role="button" tabindex="0"><div class="ic">${icon('trash-2')}</div><div class="t"><b>${t('delCloud')}</b></div></div>`;
}

function loadScript(src){
  return new Promise((ok, no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>{ s.remove(); no(new Error('could not load '+src)); }; document.head.appendChild(s); });
}
function cloudLoad(){
  if(sb) return Promise.resolve(sb);
  if(!cloudLoading) cloudLoading = (window.supabase ? Promise.resolve() : loadScript('vendor/supabase.min.js')).then(()=>{
    sb = window.supabase.createClient(CLOUD.url, CLOUD.key, {
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit', storageKey:'skipdinner.auth' }
    });
    sb.auth.onAuthStateChange((ev, session)=>{
      const u = session?.user || null, was = cloudUser?.id;
      cloudUser = u;
      if(!u){ clearTimeout(syncT); syncT = null; syncState = 'wait'; cloudFirstDone(); }
      renderAccount();
      if(u && u.id!==was) setTimeout(cloudSync, 0);   // don't await Supabase calls inside this callback
    });
    return sb;
  }).catch(e=>{ cloudLoading = null; throw e; });
  return cloudLoading;
}
export function cloudInit(){
  if(!cloudOn()) return;
  renderAccount();
  cloudLoad().catch(()=>{ syncState = 'offline'; renderAccount(); cloudFirstDone(); });
  document.addEventListener('visibilitychange', ()=>{
    if(!cloudUser) return;
    if(document.hidden){ if(syncT) cloudSync(); }
    else if(Date.now() - syncAt > 15000) cloudSync();
  });
  window.addEventListener('online', ()=>{ if(cloudUser) cloudSync(); else cloudLoad().catch(()=>{}); });
}

async function signOut(){
  if(syncT) await cloudSync();
  try{ await sb.auth.signOut({ scope:'local' }); }catch(e){}
  cloudUser = null; syncState = 'wait'; renderAccount(); toast(t('signedOut'));
}
async function deleteAccount(){
  if(!confirm(t('delCloudConfirm'))) return;
  setSync('busy');
  const { error } = await sb.rpc('delete_my_account');
  if(error){ console.warn(error); setSync('err'); toast(t(errKey(error) || 'errGeneric')); return; }
  clearTimeout(syncT); syncT = null; setSyncMeta({});
  try{ await sb.auth.signOut({ scope:'local' }); }catch(e){}
  cloudUser = null; syncState = 'wait'; renderAccount(); toast(t('delCloudDone'));
}
$('acct').addEventListener('click', e=>{
  const r = e.target.closest('[data-act]'); if(!r) return;
  const a = r.dataset.act;
  if(a==='signin') openAuth();
  else if(a==='sync'){ if(syncState!=='busy') cloudSync(); }
  else if(a==='signout') signOut();
  else if(a==='delete') deleteAccount();
});
$('acct').addEventListener('keydown', e=>{ if((e.key==='Enter' || e.key===' ') && e.target.dataset.act){ e.preventDefault(); e.target.click(); } });

/* ---------- sign-in sheet: email → 6-digit code (works inside the home-screen app, unlike links) ---------- */
let authEmail = '', resendAt = 0, resendTick = null, gateMode = false, moonieHTML = '';
export function setMoonieHTML(v){ moonieHTML = v; }
const GATE_SKIP = 'skipdinner.noLogin';   // set when the user chooses to use the app without an account
const errKey = err => navigator.onLine===false ? 'errNet' : err?.status===429 ? 'errRate' : null;
function openAuth(){
  gateMode = false; $('auth').classList.remove('gate');
  authStep(1); $('authEmail').value = authEmail;
  $('auth').classList.add('open');
  if(HAS_GSAP) gsap.fromTo('#auth .rm-panel', {y:'100%'}, {y:0, duration:.45, ease:'power4.out'});
  cloudLoad().catch(()=>authErr('errNet'));
}
function closeAuth(){
  clearInterval(resendTick);
  const done = ()=>{ $('auth').classList.remove('open', 'gate'); window.gsap?.set('#auth', {clearProps:'opacity'}); };
  if(!HAS_GSAP){ done(); return; }
  if(gateMode) gsap.to('#auth', {opacity:0, duration:.35, ease:'power2.in', onComplete:done});
  else gsap.to('#auth .rm-panel', {y:'100%', duration:.3, ease:'power3.in', onComplete:done});
}
/* ---- sign-in page after the splash: shown while signed out, unless the user chose to skip ---- */
function hasSession(){ try{ return !!localStorage.getItem('skipdinner.auth'); }catch(e){ return false; } }
export function needGate(){
  if(!cloudOn() || hasSession()) return false;
  try{ return !localStorage.getItem(GATE_SKIP); }catch(e){ return false; }
}
export function openGate(){
  gateMode = true;
  $('gateHero').innerHTML = moonieHTML;
  $('auth').classList.add('gate', 'open');
  authStep(1); $('authEmail').value = authEmail;
  if(HAS_GSAP){
    gsap.fromTo('#auth', {opacity:0}, {opacity:1, duration:.35});
    gsap.fromTo('#auth .rm-panel > *', {opacity:0, y:14}, {opacity:1, y:0, duration:.5, stagger:.05, ease:'power3.out', clearProps:'opacity,transform'});
  }
  cloudLoad().catch(()=>authErr('errNet'));
}
function leaveGate(signedIn){
  closeAuth(); gateMode = false;
  // a fresh sign-in pulls cloud data first, so the tour only runs for people who really have not seen it
  (signedIn ? nextSync() : Promise.resolve()).then(maybeTour);
}
export function maybeTour(){ if(!S.tourDone) setTimeout(startTour, 450); }
$('authSkip').onclick = ()=>{ try{ localStorage.setItem(GATE_SKIP, '1'); }catch(e){} leaveGate(false); };
function authStep(n){
  $('authStep1').hidden = n!==1; $('authStep2').hidden = n!==2;
  $('authH').textContent = t(n===1 ? (gateMode ? 'gateTitle' : 'authTitle') : 'codeTitle');
  $('authLead').innerHTML = n===1 ? escHTML(t(gateMode ? 'gateLead' : 'authLead')) : t('codeLead', { email:escHTML(authEmail) });
  $('authNote').textContent = t(n===1 ? 'authNote' : 'codeHint');
  $('authErr').textContent = '';
  if(n===2){ $('authCode').value = ''; tickResend(); } else clearInterval(resendTick);
}
function authErr(k){
  $('authErr').textContent = t(k);
  if(HAS_GSAP) gsap.fromTo('#auth .rm-panel', {x:-7}, {x:0, duration:.5, ease:'elastic.out(1,.3)'});
}
function authBusy(btn, on){ btn.disabled = on; }
function sendOtp(email){
  return sb.auth.signInWithOtp({ email, options:{ shouldCreateUser:true, emailRedirectTo: location.origin + location.pathname } });
}
function tickResend(){
  clearInterval(resendTick);
  const draw = ()=>{
    const s = Math.ceil((resendAt - Date.now())/1000), b = $('authResend');
    b.disabled = s>0; b.textContent = s>0 ? t('resendIn',{s}) : t('resend');
    if(s<=0) clearInterval(resendTick);
  };
  draw(); resendTick = setInterval(draw, 1000);
}
$('authStep1').addEventListener('submit', async e=>{
  e.preventDefault();
  const email = $('authEmail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return authErr('errEmail');
  const btn = $('authSend'); authBusy(btn, true);
  try{
    await cloudLoad();
    const { error } = await sendOtp(email);
    if(error) throw error;
    authEmail = email; resendAt = Date.now() + 60000; authStep(2);
    setTimeout(()=>$('authCode').focus(), 60);
  }catch(err){ console.warn(err); authErr(errKey(err) || 'errSend'); }
  finally{ authBusy(btn, false); }
});
$('authStep2').addEventListener('submit', async e=>{
  e.preventDefault();
  const token = $('authCode').value.replace(/\D/g, '');
  if(token.length < 6) return authErr('errCode');
  const btn = $('authVerify'); authBusy(btn, true);
  try{
    const { error } = await sb.auth.verifyOtp({ email:authEmail, token, type:'email' });
    if(error) throw error;
    try{ localStorage.removeItem(GATE_SKIP); }catch(e){}
    if(gateMode) leaveGate(true); else closeAuth();
    toast(t('signedIn'));
  }catch(err){ console.warn(err); authErr(errKey(err) || 'errCode'); }
  finally{ authBusy(btn, false); }
});
$('authCode').addEventListener('input', e=>{ e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); $('authErr').textContent = ''; });
$('authEmail').addEventListener('input', ()=>{ $('authErr').textContent = ''; });
$('authBack').onclick = ()=>{ authStep(1); $('authEmail').value = authEmail; $('authEmail').focus(); };
$('authResend').onclick = async ()=>{
  if(Date.now() < resendAt) return;
  resendAt = Date.now() + 60000; tickResend();
  const { error } = await sendOtp(authEmail);
  if(error){ resendAt = 0; tickResend(); authErr(errKey(error) || 'errSend'); }
};
$('authClose').onclick = $('authBg').onclick = closeAuth;
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !gateMode && $('auth').classList.contains('open')) closeAuth(); });
