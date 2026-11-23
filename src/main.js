/* Kitchen Closed (ปิดครัว) — the app. State shape/merge and run maths live in ./lib (typed and tested). */
import { DEFAULTS, detectLang, blank, shape, stable, pristine, mergeState } from './lib/state';
import { kcalPerMin, segTotals, paceStr, durStr, kmStr, runPace, runXP, parseDur, cumDist, bestTime, splits, buildRun as buildRunCore } from './lib/run-math';

const KEY = 'skipdinner.v1';
/* Supabase project (Project Settings → API). The publishable/anon key is meant
   to ship in the page: row level security keeps each user's data private.
   Leave both empty to turn cloud sync off. Never put the secret/service_role key here. */
const CLOUD = { url:'https://acfamivfwkpihgqrmfui.supabase.co', key:'sb_publishable__yvE3Bg8EwsYPxoDbKGpZQ_vf-N7k0W' };
const SYNC_KEY = 'skipdinner.sync';
const XP_VAL = { ok:50, light:20, miss:5 };
const WAVE_MS = 10*60*1000;
const RING_C = 2*Math.PI*104, LV_C = 2*Math.PI*39, CD_C = 2*Math.PI*146;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = !!window.gsap && !REDUCE;

/* ---------- translations ---------- */
const I18N = {
  th: {
    appTitle:'ปิดครัว',
    tabToday:'วันนี้', tabProgress:'ความคืบหน้า', tabProfile:'โปรไฟล์',
    hello:'สวัสดี {name}',
    homeDate:(d,L)=>`วัน${L.days[d.getDay()]}ที่ ${d.getDate()} ${L.monthsLong[d.getMonth()]}`,
    date:(d,L)=>`${d.getDate()} ${L.months[d.getMonth()]}`,
    monthYear:(m,y,L)=>`${L.monthsLong[m]} ${y+543}`,
    days:['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'],
    daysShort:['อา','จ','อ','พ','พฤ','ศ','ส'],
    weekHead:['จ','อ','พ','พฤ','ศ','ส','อา'],
    months:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
    monthsLong:['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
    locale:'th-TH',
    hours:'{n} ชม.', hm:'{h} ชม. {m} นาที', mOnly:'{m} นาที',
    nights:'คืน', times:'ครั้ง',
    fasting:'กำลังงด', eating:'ช่วงกินได้',
    fastingFor:'งดมาแล้ว', closesIn:'ปิดครัวในอีก',
    left:'เหลือ {t}', lastMealSoon:'ใกล้มื้อสุดท้ายแล้ว', eatLunch:'กินกลางวันให้อิ่มพอดี',
    lblClose:'ปิดครัว', lblBreak:'มื้อเช้า', lblGoal:'เป้าหมาย',
    sosCta:'หิวอยู่? เริ่มโหมดต้านหิว',
    ciTonight:'เช็คอินคืนนี้', ciLastNight:'เช็คอินเมื่อคืน',
    ciLocked:'เช็คอินได้หลัง {t} น.', ciSaved:'บันทึกแล้ว · +{xp} XP',
    ciHint:'งดได้ +50 XP · กินเบาๆ +20 XP · พลาด +5 XP',
    stOk:'งดได้', stLight:'กินเบาๆ', stMiss:'พลาด',
    thisWeek:'สัปดาห์นี้', weekCount:'{n}/7 คืน',
    streak:'สตรีค', saved:'ประหยัด', resisted:'ต้านหิว',
    overview:'ภาพรวม', thisMonth:'เดือนนี้', successRate:'สำเร็จ',
    weeklyTitle:'คืนที่งดได้ต่อสัปดาห์', perWk:'คืน/สัปดาห์ (เฉลี่ย)', thisWk:'สัปดาห์นี้',
    savingsTitle:'เงินที่ประหยัดสะสม', last30:'30 วันล่าสุด',
    calendar:'ปฏิทิน', tapToEdit:'แตะวันเพื่อแก้ไข', prevMonth:'เดือนก่อน', nextMonth:'เดือนถัดไป',
    recent:'บันทึกล่าสุด', empty:'ยังไม่มีบันทึก เช็คอินคืนแรกได้ที่หน้า "วันนี้"',
    feedOk:'งดมื้อเย็นสำเร็จ', feedLight:'กินเบาๆ', feedMiss:'พลาดมื้อเย็น', feedFights:'ต้านหิว {n} ครั้ง',
    sheetClear:'ลบบันทึกวันนี้', cancel:'ยกเลิก',
    yourAccount:'บัญชีของคุณ', user:'ผู้ใช้',
    xpLine:'{xp} XP · อีก {n} XP ถึง Lv.{l}',
    totalFasted:'งดได้ทั้งหมด', bestStreak:'สตรีคสูงสุด', missions:'ภารกิจ',
    achievements:'ความสำเร็จ', settings:'ตั้งค่า', language:'ภาษา',
    fName:'ชื่อ', fNamePh:'ใส่ชื่อ', fCut:'เวลาปิดครัว', fBreak:'มื้อเช้า', fCost:'ค่ามื้อเย็น (บาท)',
    reset:'ล้างข้อมูลทั้งหมด', resetConfirm:'ล้างประวัติ XP และความสำเร็จทั้งหมด? ย้อนกลับไม่ได้', resetDone:'ล้างข้อมูลแล้ว',
    footnote:'ฟังร่างกายตัวเองเสมอ ถ้าเวียนหัว ใจสั่น มือสั่น มีโรคประจำตัว (เช่น เบาหวาน กรดไหลย้อน) หรือกำลังตั้งครรภ์ ให้กินได้เลยและปรึกษาแพทย์ก่อนงดมื้อเป็นประจำ · ข้อมูลเก็บไว้ในเครื่องนี้ และขึ้นคลาวด์เฉพาะเมื่อคุณล็อกอิน',
    tabRun:'วิ่ง', runEyebrow:'ลู่วิ่ง', runThisWeek:'สัปดาห์นี้', runWeekSub:'{n} ครั้ง · {time} · ไต่ {m} ม.',
    runStart:'เริ่มวิ่งบนลู่', runBack:'กลับไปที่การวิ่ง', runLog:'บันทึกการวิ่งย้อนหลัง',
    runWeeks:'12 สัปดาห์ล่าสุด', runWeeksAvg:'เฉลี่ย {km} กม./สัปดาห์', runRecords:'สถิติส่วนตัว', runTotals:'รวมทั้งหมด',
    runActivities:'กิจกรรม', runCountN:'{n} ครั้ง', runCount:'ครั้ง', runKmTotal:'กิโลเมตร', runHours:'ชั่วโมง', runMore:'ดูเพิ่ม',
    runEmpty:'ยังไม่มีการวิ่ง ลองกด "เริ่มวิ่งบนลู่" แล้วสถิติจะมาอยู่ตรงนี้',
    recLongest:'ระยะไกลที่สุด', rec1k:'1 กม. เร็วที่สุด', rec5k:'5 กม. เร็วที่สุด', rec10k:'10 กม. เร็วที่สุด', recClimb:'ไต่สูงที่สุด', recLong:'วิ่งนานที่สุด',
    recNone:'วิ่งครั้งแรกเพื่อปลดล็อกสถิติส่วนตัว',
    runDist:'ระยะทาง', runDistKm:'ระยะทาง (กม.)', runPace:'เพซ', runAvgPace:'เพซเฉลี่ย', runTime:'เวลา', runKcal:'แคลอรี่', runElev:'ไต่ระดับ',
    runSpeed:'ความเร็ว', runAvgSpeed:'ความเร็วเฉลี่ย', runIncline:'ความชัน',
    runLiveTitle:'วิ่งบนลู่', runMin:'ย่อหน้าจอ', runOn:'กำลังวิ่ง', runPaused:'พักอยู่', runGo:'ไป!',
    runPause:'พัก', runResume:'วิ่งต่อ', runFinish:'จบการวิ่ง',
    runSlower:'ลดความเร็ว', runFaster:'เพิ่มความเร็ว', runLower:'ลดความชัน', runHigher:'เพิ่มความชัน',
    runSplit:'กม. ที่ {n} · เพซ {p}',
    runDoneTitle:'วิ่งเสร็จแล้ว!', runDoneSub:'ตัวเลขตรงกับหน้าจอลู่วิ่งไหม? แก้ให้ตรงได้ก่อนบันทึก',
    runFeel:'รู้สึกยังไง', feel1:'สบายๆ', feel2:'กำลังดี', feel3:'เหนื่อยมาก',
    runSave:'บันทึกการวิ่ง', runDiscard:'ทิ้งการวิ่งนี้', runDiscardConfirm:'ทิ้งการวิ่งนี้ใช่ไหม? จะไม่ถูกบันทึก',
    runTooShort:'สั้นเกินไป ต้องวิ่งอย่างน้อย 1 นาที', runBadInput:'ตรวจสอบระยะทางและเวลาอีกครั้ง', runFuture:'เลือกเวลาในอนาคตไม่ได้',
    runSaved:'บันทึกแล้ว +{xp} XP · ✦{s}', runDelete:'ลบการวิ่งนี้', runDeleted:'ลบการวิ่งแล้ว',
    runDeleteConfirm:'ลบการวิ่งนี้ใช่ไหม? XP และ ✦ ที่ได้จะถูกหักคืน',
    runManual:'บันทึกเอง', runDinner:'ช่วงมื้อเย็น', runProfile:'ความเร็วและความชัน', runSplits:'สปลิตรายกิโล',
    runLogTitle:'บันทึกการวิ่งย้อนหลัง', runLogSub:'ใส่ตัวเลขจากหน้าจอลู่วิ่ง', runWhen:'วันและเวลา', runMinutes:'เวลาที่วิ่ง (นาที)',
    runAvgIncline:'ความชันเฉลี่ย (%)', runKcalOpt:'แคลอรี่', auto:'อัตโนมัติ',
    runTitle:(h,day)=>'วิ่ง'+(h>=5&&h<11?'ตอนเช้า':h>=11&&h<14?'ตอนเที่ยง':h>=14&&h<17?'ตอนบ่าย':h>=17&&h<21?'ตอนเย็น':'ตอนดึก')+'วัน'+day,
    qRun2:'วิ่งบนลู่ 2 ครั้งในสัปดาห์', qRun10:'วิ่งรวม 10 กม. ในสัปดาห์', qRunTotal:'วิ่งบนลู่รวม {n} กม.',
    fWeight:'น้ำหนักตัว (กก.)', errWeight:'ใส่น้ำหนัก 25–250 กก.',
    settingsSaved:'บันทึกการตั้งค่าแล้ว', errCut:'เวลาปิดครัวต้องหลังมื้อเช้า', errBreak:'มื้อเช้าต้องก่อนเวลาปิดครัว',
    toastOk:'เยี่ยมมาก · +{xp} XP', toastLight:'รักษาสตรีคไว้ได้ · +{xp} XP', toastMiss:'ไม่เป็นไร พรุ่งนี้เริ่มใหม่',
    levelUp:'เลื่อนระดับ: {name} · Lv.{l}', badgeGot:'ได้รับความสำเร็จ: {name}',
    sosTitle:'โหมดต้านหิว', close:'ปิด',
    sosSub:'ความอยากมักมาเป็นระลอกแล้วค่อยๆ จางลง หายใจตามวงกลมไปก่อน',
    sosSubDone:'ครบ 10 นาทีแล้ว ความอยากน่าจะเบาลง เก่งมาก',
    breatheIn:'หายใจเข้า', breatheOut:'หายใจออกช้าๆ',
    missionLabel:'ภารกิจระหว่างรอ', shuffle:'สุ่มใหม่', mDone:'ทำแล้ว', mDoneOk:'เยี่ยม',
    sosFinish:'ผ่านไปได้แล้ว', sumTitle:'ต้านความหิวสำเร็จ', sumMsg:'ครั้งที่ {n} ที่คุณชนะความหิว', time:'เวลา', done:'เสร็จสิ้น',
    langSwitched:'เปลี่ยนเป็นภาษาไทยแล้ว',
    tabRewards:'รางวัล', rwEyebrow:'เควส & กาชา', rwStripTitle:'เควส & ตู้กาชา', homeRewards:'ตั๋ว {t} ใบ · เควสพร้อมรับ {q}',
    tickets:'ตั๋ว', gold:'ตั๋วทอง', shards:'เศษดาว', exchange:'แลก 10✦ → ตั๋ว', exchanged:'แลกเศษดาวเป็นตั๋ว 1 ใบแล้ว',
    machineTitle:'ตู้กาชาพระจันทร์', rates:'อัตราการออก', pull1:'หมุน 1 ครั้ง', pull10:'หมุน 10 ครั้ง', pullGold:'ใช้ตั๋วทอง', rateGoldShort:'การันตี SR ขึ้นไป',
    pity:'การันตี SR+ ภายใน {n} ครั้ง', noTickets:'ตั๋วไม่พอ ทำเควสเพื่อรับตั๋วเพิ่มนะ',
    questsTitle:'เควส', readyCount:'พร้อมรับ {n}', qDaily:'ประจำคืน', qWeekly:'ประจำสัปดาห์', qMilestone:'เป้าหมายพิเศษ', nightOf:'คืน{d}',
    qCheckin:'เช็คอิน (ผลไหนก็ได้)', qFast:'งดมื้อเย็นได้', qSos:'ใช้โหมดต้านหิวจนจบ (ถ้าหิว)',
    qWeek3:'งดได้ 3 คืนในสัปดาห์', qWeek5:'งดได้ 5 คืนในสัปดาห์', qWeekLog:'เช็คอินครบ 7 คืน',
    qStreak:'สตรีคถึง {n} คืน', qTotal:'งดได้รวม {n} คืน', qCollect:'สะสมตัวละคร {n} ตัว', qWelcome:'ของขวัญต้อนรับสู่ตู้กาชา',
    claim:'รับ', claimed:'รับแล้ว', claimedToast:'ได้รับ {r}',
    collection:'สมุดสะสม', collected:'{n}/{m} ตัว', qSet:'สะสมครบชุด "{name}"', setDone:'ครบชุด',
    tier_salt:'เกลือ', tier_common:'ธรรมดา', tier_rare:'แรร์', tier_sr:'ซูเปอร์แรร์', tier_legend:'ตำนาน',
    tapToOpen:'แตะเพื่อเปิด', tapAgain:'เอ๊ะ!? แคปซูลสั่น… แตะอีกที!', openAll:'เปิดทั้งหมด',
    again:'หมุนอีกครั้ง', keep:'เก็บเข้าสมุด', newTag:'ใหม่!', dupe:'ได้ซ้ำ → +{n} ✦', owned:'มีอยู่ ×{n}',
    setBuddy:'ตั้งเป็นคู่หู', isBuddy:'คู่หูของคุณ', buddySet:'{name} เป็นคู่หูของคุณแล้ว!',
    multiSummary:'ตัวใหม่ {n} ตัว · ได้เศษดาว ✦{s}',
    ratePity:'ถ้าไม่ได้ SR ขึ้นไปติดกัน 9 ครั้ง ครั้งที่ 10 การันตี SR ขึ้นไป',
    rate10:'หมุน 10 ครั้ง การันตีแรร์ขึ้นไปอย่างน้อย 1 ตัว',
    rateGold:'ตั๋วทองการันตี SR ขึ้นไปทุกครั้ง (ได้จากเป้าหมายพิเศษ)',
    rateDupe:'ได้ตัวซ้ำจะเปลี่ยนเป็นเศษดาว ✦ (เกลือ 1 · ธรรมดา 2 · แรร์ 4 · SR 10 · ตำนาน 25) สะสม 10✦ แลกตั๋วได้ 1 ใบ',
    saltQuips:['เค็มอีกแล้ว…','เกลือมาตามนัด','ไม่เป็นไร เกลือก็มีประโยชน์ (นิดนึง)','ตู้นี้ชอบเกลือจริงๆ','ความเค็ม +1'],
    quip_common:'เพื่อนใหม่มาแล้ว!', quip_rare:'โอ้โห! ได้แรร์!', quip_sr:'ซูเปอร์แรร์!! ดวงดีสุดๆ', quip_legend:'ตำนานปรากฏตัวแล้ว!!!',
    t_run:'ชอบวิ่งไหม? แท็บ "วิ่ง" จับเวลาวิ่งบนลู่ให้\nตั้งความเร็วกับความชันตามหน้าจอลู่ แล้วเราจะคิดระยะทาง เพซ กับแคลอรี่ให้เอง',
    t_gacha:'ทำเควสแล้วจะได้ตั๋วมาหมุนตู้กาชา สะสมตัวละครให้ครบทั้ง 6 คอลเลกชัน!\nระวัง "เกลือ" ด้วยนะ ออกบ่อยมาก',
    mascotName:'มูนนี่', tourSkip:'ข้าม', tourNext:'ต่อไป', tourStart:'เริ่มเลย!', tourOk:'ตกลง', tourNoName:'ไม่บอกดีกว่า',
    helpAria:'วิธีใช้', replayTour:'ดูวิธีใช้อีกครั้ง', tourGift:'ของขวัญต้อนรับ +20 XP',
    acctTitle:'บัญชีและคลาวด์', cloudCta:'สำรองข้อมูลขึ้นคลาวด์', cloudCtaSub:'ล็อกอินด้วยอีเมล ข้อมูลไม่หาย ใช้ได้หลายเครื่อง',
    syncOk:'ซิงก์แล้ว · {time}', syncBusy:'กำลังซิงก์…', syncOffline:'ออฟไลน์ · จะซิงก์เมื่อต่อเน็ต', syncErr:'ซิงก์ไม่สำเร็จ · แตะเพื่อลองใหม่', syncWait:'กำลังเชื่อมต่อ…',
    signOut:'ออกจากระบบ', signedOut:'ออกจากระบบแล้ว ข้อมูลยังอยู่ในเครื่องนี้', signedIn:'ล็อกอินแล้ว กำลังซิงก์ข้อมูล',
    delCloud:'ลบบัญชีและข้อมูลบนคลาวด์', delCloudConfirm:'ลบบัญชีและข้อมูลบนคลาวด์ถาวร? ข้อมูลในเครื่องนี้ยังอยู่', delCloudDone:'ลบบัญชีแล้ว',
    cloudPulled:'ดึงข้อมูลจากคลาวด์แล้ว',
    gateTitle:'ยินดีต้อนรับสู่ปิดครัว', gateLead:'เก็บสตรีคและตัวละครไว้บนคลา⁠วด์\nเปิดเครื่องไหนก็เจอ ไม่ต้องตั้งรหัสผ่าน', gateSkip:'ใช้งานแบบไม่ล็อกอิน',
    authTitle:'ล็อกอินหรือสมัคร', authLead:'ไม่ต้องตั้งรหัสผ่าน เราจะส่งรหัสยืนยันไปที่อีเมลของคุณ', authNote:'ใช้อีเมลเดิมในทุกเครื่องเพื่อซิงก์ข้อมูลเดียวกัน',
    sendCode:'ส่งรหัส', codeTitle:'ใส่รหัสจากอีเมล', codeLead:'ส่งรหัสไปที่ <b>{email}</b> แล้ว', codeHint:'ไม่เจออีเมล? ลองดูในโฟลเดอร์สแปม', codeAria:'รหัสยืนยัน',
    verify:'ยืนยัน', resend:'ส่งรหัสใหม่', resendIn:'ส่งใหม่ได้ใน {s} วิ', changeEmail:'เปลี่ยนอีเมล',
    errEmail:'อีเมลไม่ถูกต้อง', errCode:'รหัสไม่ถูกต้องหรือหมดอายุ', errSend:'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง', errRate:'ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่', errNet:'เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต', errGeneric:'มีบางอย่างผิดพลาด ลองใหม่อีกครั้ง',
    t_welcome:'สวัสดี! เราชื่อ "มูนนี่" เป็นเชฟประจำแอปปิดครัว\nเดี๋ยวเราพาทัวร์สั้นๆ แค่ 1 นาทีนะ',
    t_name:'ก่อนอื่นเลย… ให้เราเรียกคุณว่าอะไรดี?',
    t_hero:'{hi}นี่คือเมืองของคุณ! กลางวันพระอาทิตย์จะเดินข้ามฟ้าจนถึงเวลาปิดครัว พอถึงเวลา ดวงจันทร์จะนับว่างดมาแล้วกี่ชั่วโมง\nงดได้ 1 คืน = สร้างตึก 1 หลัง กินเบาๆ = ได้บ้านหลังเล็ก',
    cityCap:'เมืองเดือน{m} · ตึก {b} · บ้าน {h}',
    festName:'ลอยกระทง 2569', festKicker:'เทศกาล', festPeak:'คืนวันเพ็ญ อังคารที่ 24 พ.ย.', festLeft:'เหลือ {n} วัน', festLast:'วันสุดท้าย!',
    lotus:'ดอกบัว', lotusHow:'งดได้ +5 · กินเบาๆ +2 · ลอยกระทง +1 ต่อคืน',
    floatTitle:'ลอยกระทงคืนนี้', floatWish:'คำอธิษฐาน (ไม่ใส่ก็ได้)', floatBtn:'ลอยกระทง', floated:'ลอยกระทงแล้ว ขอให้สมหวังนะ!',
    floatedTonight:'คืนนี้ลอยกระทงแล้ว', floatNoWish:'พรุ่งนี้มาลอยใหม่ได้อีก', fbFloat:'คืนนี้ยังไม่ได้ลอยกระทง', fbDone:'ลอยกระทงคืนนี้แล้ว', fbReady:'เควสพร้อมรับ {n}',
    festQuests:'เควสเทศกาล', claimedLotus:'ได้ดอกบัว +{n}',
    fq_float1:'ลอยกระทงครั้งแรก', fq_sos:'ต้านหิวได้ 1 ครั้งช่วงเทศกาล', fq_fast3:'งดได้ 3 คืนช่วงเทศกาล', fq_peak:'งดได้ในคืนวันลอยกระทง (24 พ.ย.)', fq_float5:'ลอยกระทงครบ 5 คืน',
    festShop:'ร้านเทศกาล', festShopSub:'ของรุ่นพิเศษ ซื้อได้ถึง 30 พ.ย.', notEnoughLotus:'ดอกบัวไม่พอ งดมื้อเย็นเพิ่มอีกนิดนะ',
    festNote:'หมดเทศกาลแล้ว ดอกบัวที่เหลือจะแลกเป็นเหรียญให้อัตโนมัติ (1 ดอก = 5 เหรียญ) ส่วนของที่ซื้อไว้เก็บใช้ได้ตลอด',
    si_kt_leaf:'กระทงใบตอง', si_kt_bread:'กระทงขนมปัง', sd_kt_bread:'ให้ปลากินแทนเรา', si_kt_coco:'กระทงกะลา', sd_kt_coco:'รักษ์โลก ลอยได้นาน',
    si_kt_lotus:'กระทงบัวทอง', sd_kt_lotus:'อลังการที่สุดในแม่น้ำ', si_kt_moonie:'กระทงมูนนี่', sd_kt_moonie:'มูนนี่ลอยไปส่งคำอธิษฐาน',
    si_lantern:'โคมลอยยี่เป็ง', sd_lantern:'โคมลอยขึ้นฟ้าเหนือเมืองยามค่ำ', si_hat_chada:'ชฎา', sd_hat_chada:'ชุดไทยให้ตัวคู่หู',
    si_frame_lotus:'กรอบดอกบัว', sd_frame_lotus:'กรอบรูปโปรไฟล์ฉบับเทศกาล', sd_fchar:'ตัวละครรุ่นพิเศษ มีเฉพาะเทศกาลนี้',
    shopTitle:'ร้านค้า', shopBanner:'ใช้เหรียญจากเควสซื้อของแต่งเมือง ตัวละคร และไอเทม', coins:'เหรียญ',
    coinHow:'ได้เหรียญจากเควส: รายวัน +10 · รายสัปดาห์ +30 · เป้าหมาย +50 · ครบคอลเลกชัน +100',
    catItem:'ไอเทม', catChars:'ตัวละคร', catCity:'แต่งเมือง', catStyle:'แต่งตัวละคร',
    introItem:'ไอเทมช่วยเล่น ซื้อได้ไม่จำกัด', introCity:'เอฟเฟกต์ในเมืองของคุณ ซื้อครั้งเดียว เปิด/ปิดได้ตลอด', introStyle:'ของแต่งให้ตัวคู่หู และกรอบรูปโปรไฟล์',
    needBuddy:'(ตั้งตัวคู่หูในสมุดสะสมก่อน ของแต่งจะใส่ให้ตัวคู่หู)',
    charsToday:'ตัวละครประจำวัน', charsRefresh:'เปลี่ยนในอีก {h} ชม.', ownedIt:'มีแล้ว',
    buyConfirm:'ยืนยัน {n}', bought:'ซื้อแล้ว: {name}', notEnough:'เหรียญไม่พอ ทำเควสเพิ่มอีกนิด', useIt:'ใช้', inUse:'ใช้อยู่', stockN:'มี {n}',
    freezeUsed:'ใช้บัตรกันสตรีคแล้ว สตรีคยังไม่ขาด!',
    si_ticket:'ตั๋วกาชา', sd_ticket:'หมุนตู้กาชาได้ 1 ครั้ง', si_ticket10:'ตั๋วกาชา ×10', sd_ticket10:'คุ้มกว่าซื้อทีละใบ',
    si_goldt:'ตั๋วทอง', sd_goldt:'การันตีระดับซูเปอร์แรร์ขึ้นไป', si_freeze:'บัตรกันสตรีค', sd_freeze:'พลาด 1 คืน สตรีคไม่ขาด ใช้ให้อัตโนมัติ',
    si_bricks:'อิฐ ×5', sd_bricks:'เอาไปอัปเกรดและแต่งเมือง',
    si_balloon:'บอลลูนลมร้อน', sd_balloon:'ลอยเหนือเมืองทั้งวัน', si_ferris:'ชิงช้าสวรรค์', sd_ferris:'หมุนช้าๆ หลังเมือง ไฟเปิดตอนกลางคืน',
    si_fireworks:'ดอกไม้ไฟ', sd_fireworks:'จุดฉลองทุกคืนที่งดอยู่', si_aurora:'แสงเหนือ', sd_aurora:'ม่านแสงเขียวม่วงบนฟ้ายามค่ำ',
    si_meteor:'ฝนดาวตก', sd_meteor:'ดาวตกพาดผ่านฟ้าเป็นระยะ', si_snow:'หิมะตก', sd_snow:'หิมะโปรยลงมาเบาๆ',
    si_hat_party:'หมวกปาร์ตี้', sd_hat_party:'ใส่ให้ตัวคู่หู', si_hat_beanie:'หมวกไหมพรม', sd_hat_beanie:'ใส่ให้ตัวคู่หู', si_hat_crown:'มงกุฎทอง', sd_hat_crown:'ใส่ให้ตัวคู่หู',
    si_face_sun:'แว่นกันแดด', sd_face_sun:'ใส่ให้ตัวคู่หู', si_face_heart:'แก้มหัวใจ', sd_face_heart:'ใส่ให้ตัวคู่หู',
    si_frame_gold:'กรอบทอง', sd_frame_gold:'กรอบรูปโปรไฟล์', si_frame_rainbow:'กรอบสายรุ้ง', sd_frame_rainbow:'กรอบรูปโปรไฟล์', si_frame_neon:'กรอบนีออน', sd_frame_neon:'กรอบรูปโปรไฟล์เรืองแสง',
    pcTitle:'โปสการ์ดเมือง', pcSub:'ภาพสรุปเมืองของแต่ละเดือน แชร์ให้เพื่อนดูหรือเก็บไว้เป็นที่ระลึก', pcShare:'แชร์ / บันทึกรูป', pcFail:'สร้างโปสการ์ดไม่สำเร็จ ลองอีกครั้ง',
    pcBrand:'ปิดครัว · โปสการ์ดเมือง', pcTowers:'ตึก', pcNights:'คืนที่งดได้', pcKm:'กม. ที่วิ่ง', pcFlags:'ธงชัยชนะ', pcFooter:'ปิดครัว — งดมื้อเย็นให้สนุกขึ้น',
    cityFlag:'ปักธงชัยชนะบนตึกในเมืองแล้ว และไล่มอนสเตอร์ไปได้คืนนี้!',
    cityTitle:'เมืองเดือน{m}', citySub:'ตึก {b} · บ้าน {h} · ผู้อยู่อาศัย {r}', brick:'อิฐ', wood:'ไม้',
    craft:'แปรรูปไม้ 3 ชิ้น → อิฐ 1 ก้อน', crafted:'ได้อิฐเพิ่ม 1 ก้อน', cityBuild:'สร้างในเมือง', slotsLeft:'ที่ว่างหน้าเมือง {n}',
    upHouse:'อัปเกรดบ้านเป็นตึก', upHouseSub:'อัปเกรดได้ {n} หลัง', dTree:'ปลูกต้นไม้', dLamp:'เสาไฟถนน', dFountain:'น้ำพุกลางเมือง',
    costBricks:'อิฐ {n}', build:'สร้าง', builtToast:'สร้างเสร็จแล้ว!', noBricks:'อิฐไม่พอ',
    residents:'ผู้อยู่อาศัย', buddyHome:'บ้านของ{name}', noResidents:'หมุนกาชาเพื่อชวนตัวละครมาอยู่ในเมือง ตัวคู่หูจะได้บ้านของตัวเองด้วย',
    cityHow:'งดได้ 1 คืน = อิฐ 2 ก้อน · กินเบาๆ = ไม้ 1 ชิ้น · พลาด = ไม่ได้วัสดุ ใช้อิฐอัปเกรดบ้านจากคืนที่กินเบาๆ ให้เป็นตึก หรือแต่งหน้าเมืองได้', cityEmpty:'งดมื้อเย็นได้ 1 คืน = สร้างตึก 1 หลังในเมืองนี้',
    t_cutoff:'ปกติอยากปิดครัวกี่โมงดี? เลือกได้เลย\n(เปลี่ยนทีหลังได้ในหน้าโปรไฟล์)',
    t_sos:'ตอนดึกๆ ถ้าหิวจนทนไม่ไหว กดปุ่มนี้เลย! เราจะพาหายใจ และให้ทำภารกิจเล็กๆ จนความอยากผ่านไป',
    t_checkin:'หลังเวลาปิดครัว มาเช็คอินตรงนี้ทุกคืนนะ\nงดได้รับ 50 XP · กินเบาๆ ก็ยังรักษาสตรีคไว้ได้',
    t_week:'วงกลมสีส้มคือคืนที่ทำสำเร็จ\nลองเก็บให้ครบ 7 วงในสัปดาห์นี้ดูสิ!',
    t_charts:'หน้านี้ไว้ดูภาพรวม กราฟจะบอกว่าแต่ละสัปดาห์งดได้กี่คืน แตะที่แท่งกราฟเพื่อดูตัวเลขได้ด้วย',
    t_cal:'ลืมเช็คอินเหรอ? ไม่เป็นไร แตะวันในปฏิทินเพื่อแก้ย้อนหลังได้เลย',
    t_badges:'ทำสำเร็จเรื่อยๆ จะได้ปลดล็อกเหรียญพวกนี้\nมีทั้งหมด 12 เหรียญ ลองเก็บให้ครบนะ',
    t_help:'ถ้าลืมวิธีใช้ กดปุ่มนี้ แล้วเราจะกลับมาอธิบายให้ใหม่',
    t_done:'พร้อมแล้ว{nm}! รับ 20 XP เป็นของขวัญต้อนรับ\nคืนนี้มาสู้ไปด้วยกันนะ',
    t_doneAgain:'พร้อมแล้ว{nm}! ไปลุยกันต่อเลย',
    levels:['มือใหม่','เริ่มจับทาง','มีวินัย','สม่ำเสมอ','แข็งแกร่ง','ตัวจริง','ระดับโปร','ตำนาน'],
    badges:{ first:'คืนแรก', s3:'สตรีค 3 คืน', s7:'สตรีค 7 คืน', s14:'สตรีค 14 คืน', s30:'สตรีค 30 คืน', n20:'งดได้ 20 คืน',
      f1:'ต้านหิวครั้งแรก', f10:'ต้านหิว 10 ครั้ง', c10:'ภารกิจ 10 ครั้ง', b500:'ประหยัด ฿500', b2000:'ประหยัด ฿2,000', honest:'บันทึกตามจริง', run1:'วิ่งครั้งแรก', run42:'ครบมาราธอน', lk26:'ลอยกระทง 2569' },
    missionList:[
      'ดื่มน้ำเปล่า 1 แก้วใหญ่ให้หมดแก้ว','แปรงฟันเลย ปากสดชื่นแล้วความอยากจะลดลง','ชงชาร้อนหรือชาสมุนไพร ไม่ใส่น้ำตาล',
      'สควอท 15 ครั้ง','ออกไปเดินเบาๆ 5 นาที','อาบน้ำอุ่นให้สบายตัว','ทักหรือโทรหาเพื่อนสักคน','เขียน 3 เรื่องดีๆ ที่เกิดขึ้นวันนี้',
      'ยืดเหยียดร่างกาย 5 นาที','เก็บโต๊ะหรือจัดห้อง 10 นาที','อ่านหนังสือ 10 หน้า','เตรียมตัวเข้านอนให้เร็วขึ้นคืนนี้',
      'เคี้ยวหมากฝรั่งไม่มีน้ำตาล','ฟังเพลงหรือพอดแคสต์ที่ชอบ 1 ตอน'],
  },
  en: {
    appTitle:'Kitchen Closed',
    tabToday:'Today', tabProgress:'Progress', tabProfile:'Profile',
    hello:'Hi, {name}',
    homeDate:(d,L)=>`${L.days[d.getDay()]}, ${L.monthsLong[d.getMonth()]} ${d.getDate()}`,
    date:(d,L)=>`${L.months[d.getMonth()]} ${d.getDate()}`,
    monthYear:(m,y,L)=>`${L.monthsLong[m]} ${y}`,
    days:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    daysShort:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    weekHead:['M','T','W','T','F','S','S'],
    months:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    monthsLong:['January','February','March','April','May','June','July','August','September','October','November','December'],
    locale:'en-US',
    hours:'{n}h', hm:'{h}h {m}m', mOnly:'{m}m',
    nights:'nights', times:'times',
    fasting:'Fasting', eating:'Eating window',
    fastingFor:'Fasting for', closesIn:'Kitchen closes in',
    left:'{t} left', lastMealSoon:'Last meal soon', eatLunch:'Have a solid lunch',
    lblClose:'Closes', lblBreak:'Breakfast', lblGoal:'Goal',
    sosCta:'Hungry? Start craving mode',
    ciTonight:'Check in tonight', ciLastNight:'Check in last night',
    ciLocked:'Check-in opens at {t}', ciSaved:'Saved · +{xp} XP',
    ciHint:'Fasted +50 XP · Light +20 XP · Missed +5 XP',
    stOk:'Fasted', stLight:'Light', stMiss:'Missed',
    thisWeek:'This week', weekCount:'{n}/7 nights',
    streak:'Streak', saved:'Saved', resisted:'Resisted',
    overview:'Overview', thisMonth:'This month', successRate:'Success',
    weeklyTitle:'Nights fasted per week', perWk:'nights/wk avg', thisWk:'This wk',
    savingsTitle:'Total saved', last30:'Last 30 days',
    calendar:'Calendar', tapToEdit:'Tap a day to edit', prevMonth:'Previous month', nextMonth:'Next month',
    recent:'Recent', empty:'No entries yet. Check in your first night on the Today tab.',
    feedOk:'Skipped dinner', feedLight:'Light meal', feedMiss:'Had dinner', feedFights:'{n} cravings resisted',
    sheetClear:'Clear entry', cancel:'Cancel',
    yourAccount:'Your account', user:'You',
    xpLine:'{xp} XP · {n} XP to Lv.{l}',
    totalFasted:'Total fasted', bestStreak:'Best streak', missions:'Missions',
    achievements:'Achievements', settings:'Settings', language:'Language',
    fName:'Name', fNamePh:'Your name', fCut:'Kitchen closes', fBreak:'Breakfast', fCost:'Dinner cost (฿)',
    reset:'Reset all data', resetConfirm:'Erase all history, XP and achievements? This cannot be undone.', resetDone:'All data cleared',
    footnote:'Listen to your body. If you feel dizzy, shaky or your heart races, have a medical condition (e.g. diabetes, acid reflux) or are pregnant — eat, and talk to a doctor before skipping meals regularly. · Your data stays on this device and goes to the cloud only if you sign in.',
    tabRun:'Run', runEyebrow:'Treadmill', runThisWeek:'This week', runWeekSub:'{n} runs · {time} · {m} m climb',
    runStart:'Start treadmill run', runBack:'Back to your run', runLog:'Log a past run',
    runWeeks:'Last 12 weeks', runWeeksAvg:'Avg {km} km/week', runRecords:'Personal records', runTotals:'All time',
    runActivities:'Activities', runCountN:'{n} runs', runCount:'Runs', runKmTotal:'Kilometres', runHours:'Hours', runMore:'Show more',
    runEmpty:'No runs yet. Tap "Start treadmill run" and your stats will show up here.',
    recLongest:'Longest run', rec1k:'Fastest 1 km', rec5k:'Fastest 5 km', rec10k:'Fastest 10 km', recClimb:'Most climb', recLong:'Longest time',
    recNone:'Finish your first run to unlock personal records.',
    runDist:'Distance', runDistKm:'Distance (km)', runPace:'Pace', runAvgPace:'Avg pace', runTime:'Time', runKcal:'Calories', runElev:'Climb',
    runSpeed:'Speed', runAvgSpeed:'Avg speed', runIncline:'Incline',
    runLiveTitle:'Treadmill run', runMin:'Minimize', runOn:'Running', runPaused:'Paused', runGo:'Go!',
    runPause:'Pause', runResume:'Resume', runFinish:'Finish',
    runSlower:'Slower', runFaster:'Faster', runLower:'Lower incline', runHigher:'Higher incline',
    runSplit:'Km {n} · {p} /km',
    runDoneTitle:'Run complete!', runDoneSub:'Do the numbers match the treadmill screen? Fix them before saving.',
    runFeel:'How did it feel?', feel1:'Easy', feel2:'Moderate', feel3:'Hard',
    runSave:'Save run', runDiscard:'Discard this run', runDiscardConfirm:'Discard this run? It will not be saved.',
    runTooShort:'Too short. Run for at least 1 minute.', runBadInput:'Check the distance and time.', runFuture:'That time is in the future.',
    runSaved:'Saved +{xp} XP · ✦{s}', runDelete:'Delete this run', runDeleted:'Run deleted',
    runDeleteConfirm:'Delete this run? The XP and ✦ it earned will be taken back.',
    runManual:'Logged', runDinner:'Dinner time', runProfile:'Speed & incline', runSplits:'Splits',
    runLogTitle:'Log a past run', runLogSub:'Enter the numbers from the treadmill screen.', runWhen:'Date & time', runMinutes:'Duration (min)',
    runAvgIncline:'Avg incline (%)', runKcalOpt:'Calories', auto:'Auto',
    runTitle:(h,day)=>`${day} ${h>=5&&h<11?'morning':h>=11&&h<14?'lunch':h>=14&&h<17?'afternoon':h>=17&&h<21?'evening':'night'} run`,
    qRun2:'Run on the treadmill twice this week', qRun10:'Run 10 km this week', qRunTotal:'Run {n} km in total',
    fWeight:'Body weight (kg)', errWeight:'Enter a weight from 25 to 250 kg',
    settingsSaved:'Settings saved', errCut:'Kitchen must close after breakfast', errBreak:'Breakfast must be before kitchen closes',
    toastOk:'Great job · +{xp} XP', toastLight:'Streak kept · +{xp} XP', toastMiss:'No worries — fresh start tomorrow',
    levelUp:'Level up: {name} · Lv.{l}', badgeGot:'Achievement unlocked: {name}',
    sosTitle:'Craving mode', close:'Close',
    sosSub:'Cravings come in waves and fade. Breathe with the circle for now.',
    sosSubDone:'10 minutes done — the craving should be easing. Nice work.',
    breatheIn:'Breathe in', breatheOut:'Breathe out slowly',
    missionLabel:'While you wait', shuffle:'Shuffle', mDone:'Done', mDoneOk:'Nice',
    sosFinish:'I made it', sumTitle:'Craving resisted', sumMsg:'Craving #{n} beaten', time:'Time', done:'Done',
    langSwitched:'Switched to English',
    tabRewards:'Rewards', rwEyebrow:'Quests & Gacha', rwStripTitle:'Quests & Gachapon', homeRewards:'{t} tickets · {q} quests ready',
    tickets:'Tickets', gold:'Gold', shards:'Stardust', exchange:'10✦ → ticket', exchanged:'Traded stardust for 1 ticket',
    machineTitle:'Moon Gachapon', rates:'Drop rates', pull1:'Pull ×1', pull10:'Pull ×10', pullGold:'Use gold ticket', rateGoldShort:'SR or better guaranteed',
    pity:'SR+ guaranteed within {n} pulls', noTickets:'Not enough tickets — complete quests to earn more',
    questsTitle:'Quests', readyCount:'{n} ready', qDaily:'Tonight', qWeekly:'This week', qMilestone:'Milestones', nightOf:'Night of {d}',
    qCheckin:'Check in (any result)', qFast:'Skip dinner', qSos:'Finish craving mode (if hungry)',
    qWeek3:'Fast 3 nights this week', qWeek5:'Fast 5 nights this week', qWeekLog:'Check in all 7 nights',
    qStreak:'Reach a {n}-night streak', qTotal:'Fast {n} nights in total', qCollect:'Collect {n} characters', qWelcome:'Welcome gift for the gachapon',
    claim:'Claim', claimed:'Claimed', claimedToast:'Received {r}',
    collection:'Collection', collected:'{n}/{m}', qSet:'Complete the "{name}" set', setDone:'Complete',
    tier_salt:'Salt', tier_common:'Common', tier_rare:'Rare', tier_sr:'Super Rare', tier_legend:'Legend',
    tapToOpen:'Tap to open', tapAgain:'Wait… it is shaking! Tap again!', openAll:'Open all',
    again:'Pull again', keep:'Add to collection', newTag:'NEW!', dupe:'Duplicate → +{n} ✦', owned:'Owned ×{n}',
    setBuddy:'Set as buddy', isBuddy:'Your buddy', buddySet:'{name} is now your buddy!',
    multiSummary:'{n} new · +{s} stardust',
    ratePity:'If 9 pulls in a row miss SR+, the 10th is guaranteed SR or better',
    rate10:'A 10-pull guarantees at least one Rare or better',
    rateGold:'Gold tickets always give SR or better (earned from milestones)',
    rateDupe:'Duplicates turn into stardust ✦ (Salt 1 · Common 2 · Rare 4 · SR 10 · Legend 25). Trade 10✦ for a ticket.',
    saltQuips:['Salty again…','Salt arrives right on schedule','Salt has its uses (kind of)','This machine really loves salt','+1 saltiness'],
    quip_common:'A new friend appears!', quip_rare:'Ooh — a Rare!', quip_sr:'SUPER RARE!! What luck!', quip_legend:'A LEGEND has appeared!!!',
    t_run:'Like running? The Run tab tracks treadmill runs.\nSet the speed and incline like on the treadmill and I will work out distance, pace and calories.',
    t_gacha:'Complete quests to earn tickets for the gachapon. Complete all 6 collections!\nWatch out for "Salt" — it drops a lot.',
    mascotName:'Moonie', tourSkip:'Skip', tourNext:'Next', tourStart:"Let's go!", tourOk:'OK', tourNoName:'Skip',
    helpAria:'How to use', replayTour:'Replay tutorial', tourGift:'Welcome gift +20 XP',
    acctTitle:'Account & cloud', cloudCta:'Back up to the cloud', cloudCtaSub:'Sign in with email to keep your data safe on every device',
    syncOk:'Synced · {time}', syncBusy:'Syncing…', syncOffline:'Offline · will sync when online', syncErr:'Sync failed · tap to retry', syncWait:'Connecting…',
    signOut:'Sign out', signedOut:'Signed out. Your data stays on this device.', signedIn:'Signed in. Syncing your data.',
    delCloud:'Delete account & cloud data', delCloudConfirm:'Permanently delete your account and cloud data? Data on this device stays.', delCloudDone:'Account deleted',
    cloudPulled:'Loaded your data from the cloud',
    gateTitle:'Welcome to Kitchen Closed', gateLead:'Keep your streak and characters safe in the cloud, on every device. No password needed.', gateSkip:'Use without an account',
    authTitle:'Sign in or sign up', authLead:"No password needed. We'll email you a sign-in code.", authNote:'Use the same email on every device to sync the same data.',
    sendCode:'Send code', codeTitle:'Enter the code', codeLead:'We sent a code to <b>{email}</b>', codeHint:"Can't find it? Check your spam folder.", codeAria:'Sign-in code',
    verify:'Verify', resend:'Resend code', resendIn:'Resend in {s}s', changeEmail:'Change email',
    errEmail:'That email looks wrong', errCode:'Wrong or expired code', errSend:"Couldn't send. Try again.", errRate:'Too many tries. Wait a moment and try again.', errNet:'No connection. Check your internet.', errGeneric:'Something went wrong. Try again.',
    t_welcome:"Hi there! I'm Moonie, the chef of Kitchen Closed.\nLet me give you a quick 1-minute tour.",
    t_name:'First things first… what should I call you?',
    t_hero:'{hi}This is your city! By day the sun crosses the sky until closing time, then the moon shows how long you have fasted.\nEach fasted night builds a tower, a light meal builds a small house.',
    cityCap:'{m} city · {b} towers · {h} houses',
    festName:'Loy Krathong 2026', festKicker:'Festival', festPeak:'Full-moon night: Tuesday 24 Nov', festLeft:'{n} days left', festLast:'Last day!',
    lotus:'Lotus', lotusHow:'Fasted +5 · light meal +2 · float +1 per night',
    floatTitle:'Float a krathong tonight', floatWish:'Make a wish (optional)', floatBtn:'Float it', floated:'Your krathong is floating. May your wish come true!',
    floatedTonight:'You floated a krathong tonight', floatNoWish:'Come back tomorrow to float another', fbFloat:"You haven't floated a krathong tonight", fbDone:'Krathong floated tonight', fbReady:'{n} quests ready',
    festQuests:'Festival quests', claimedLotus:'+{n} lotus',
    fq_float1:'Float your first krathong', fq_sos:'Resist a craving during the festival', fq_fast3:'Fast 3 nights during the festival', fq_peak:'Fast on Loy Krathong night (24 Nov)', fq_float5:'Float a krathong on 5 nights',
    festShop:'Festival shop', festShopSub:'Limited items, until 30 Nov', notEnoughLotus:'Not enough lotus yet. Fast a few more nights.',
    festNote:'When the festival ends, leftover lotus turn into coins automatically (1 lotus = 5 coins). Festival items are yours to keep.',
    si_kt_leaf:'Banana-leaf krathong', si_kt_bread:'Bread krathong', sd_kt_bread:'The fish eat it, so you don\'t', si_kt_coco:'Coconut krathong', sd_kt_coco:'Eco-friendly and floats for ages',
    si_kt_lotus:'Golden lotus krathong', sd_kt_lotus:'The fanciest on the river', si_kt_moonie:'Moonie krathong', sd_kt_moonie:'Moonie carries your wish',
    si_lantern:'Yi Peng sky lanterns', sd_lantern:'Lanterns rise over your city at night', si_hat_chada:'Chada crown', sd_hat_chada:'Thai dress-up for your buddy',
    si_frame_lotus:'Lotus frame', sd_frame_lotus:'A festival profile frame', sd_fchar:'A limited character, only during this festival',
    shopTitle:'Shop', shopBanner:'Spend quest coins on city decor, characters and items', coins:'Coins',
    coinHow:'Earn coins from quests: daily +10 · weekly +30 · goals +50 · a full collection +100',
    catItem:'Items', catChars:'Characters', catCity:'City', catStyle:'Outfits',
    introItem:'Handy items, buy as many as you like.', introCity:'Effects for your city. Buy once, switch on or off any time.', introStyle:'Outfits for your buddy and frames for your profile picture.',
    needBuddy:'(Pick a buddy in the Collection first; outfits are worn by your buddy.)',
    charsToday:"Today's characters", charsRefresh:'New in {h}h', ownedIt:'Owned',
    buyConfirm:'Confirm {n}', bought:'Bought: {name}', notEnough:'Not enough coins yet. Finish a few more quests.', useIt:'Use', inUse:'In use', stockN:'×{n}',
    freezeUsed:'Streak freeze used. Your streak is safe!',
    si_ticket:'Gacha ticket', sd_ticket:'One pull at the gachapon', si_ticket10:'Gacha tickets ×10', sd_ticket10:'Better value than one by one',
    si_goldt:'Gold ticket', sd_goldt:'Guaranteed Super Rare or better', si_freeze:'Streak freeze', sd_freeze:'Miss a night without losing your streak. Used automatically.',
    si_bricks:'Bricks ×5', sd_bricks:'For upgrading and decorating your city',
    si_balloon:'Hot-air balloon', sd_balloon:'Floats over your city all day', si_ferris:'Ferris wheel', sd_ferris:'Turns slowly behind the city, lit at night',
    si_fireworks:'Fireworks', sd_fireworks:'A celebration every fasting night', si_aurora:'Aurora', sd_aurora:'Green and violet lights in the night sky',
    si_meteor:'Meteor shower', sd_meteor:'Shooting stars cross the sky', si_snow:'Snowfall', sd_snow:'Gentle snow over the city',
    si_hat_party:'Party hat', sd_hat_party:'For your buddy', si_hat_beanie:'Beanie', sd_hat_beanie:'For your buddy', si_hat_crown:'Golden crown', sd_hat_crown:'For your buddy',
    si_face_sun:'Sunglasses', sd_face_sun:'For your buddy', si_face_heart:'Heart cheeks', sd_face_heart:'For your buddy',
    si_frame_gold:'Gold frame', sd_frame_gold:'For your profile picture', si_frame_rainbow:'Rainbow frame', sd_frame_rainbow:'For your profile picture', si_frame_neon:'Neon frame', sd_frame_neon:'A glowing profile frame',
    pcTitle:'City postcard', pcSub:'A snapshot of your city for each month. Share it or keep it as a souvenir.', pcShare:'Share / save image', pcFail:'Could not make the postcard. Try again.',
    pcBrand:'Kitchen Closed · City postcard', pcTowers:'towers', pcNights:'nights fasted', pcKm:'km run', pcFlags:'victory flags', pcFooter:'Kitchen Closed — skip dinner, the fun way',
    cityFlag:'A victory flag now flies over your city, and the monster is gone for tonight!',
    cityTitle:'{m} city', citySub:'{b} towers · {h} houses · {r} residents', brick:'Bricks', wood:'Wood',
    craft:'Turn 3 wood into 1 brick', crafted:'+1 brick', cityBuild:'Build', slotsLeft:'{n} spots left',
    upHouse:'Upgrade a house to a tower', upHouseSub:'{n} can be upgraded', dTree:'Plant a tree', dLamp:'Street lamp', dFountain:'Town fountain',
    costBricks:'{n} bricks', build:'Build', builtToast:'Built!', noBricks:'Not enough bricks',
    residents:'Residents', buddyHome:"{name}'s house", noResidents:'Pull the gachapon to invite characters to live here. Your buddy gets a house of its own.',
    cityHow:'A fasted night = 2 bricks · a light meal = 1 wood · a missed night = nothing. Spend bricks to turn light-meal houses into towers, or to decorate the street.', cityEmpty:'Each fasted night builds a tower in this city',
    t_cutoff:'What time do you usually want to close the kitchen? Pick one!\n(You can change it later in Profile.)',
    t_sos:'Late-night hunger getting loud? Tap this! I will breathe with you and give you small missions until the craving passes.',
    t_checkin:'After closing time, check in here every night.\nFasted earns 50 XP · a light meal still keeps your streak.',
    t_week:'Orange circles are nights you nailed it.\nTry to fill all 7 this week!',
    t_charts:'Here is your overview — how many nights you fasted each week. Tap a bar to see the numbers.',
    t_cal:'Forgot to check in? No worries — tap any day on the calendar to fix it.',
    t_badges:'Keep going to unlock these achievements.\nThere are 12 in total — collect them all!',
    t_help:'Forget how something works? Tap here and I will walk you through it again.',
    t_done:"You're all set{nm}! Here's 20 XP as a welcome gift.\nLet's take on tonight together.",
    t_doneAgain:"You're all set{nm}! Let's keep going.",
    levels:['Beginner','Finding rhythm','Disciplined','Consistent','Strong','The real deal','Pro','Legend'],
    badges:{ first:'First night', s3:'3-night streak', s7:'7-night streak', s14:'14-night streak', s30:'30-night streak', n20:'20 nights fasted',
      f1:'First craving resisted', f10:'10 cravings resisted', c10:'10 missions', b500:'Saved ฿500', b2000:'Saved ฿2,000', honest:'Honest log', run1:'First run', run42:'Marathon total', lk26:'Loy Krathong 2026' },
    missionList:[
      'Drink a big glass of water — all of it','Brush your teeth — a fresh mouth curbs cravings','Make hot tea or herbal tea, no sugar',
      'Do 15 squats','Take a gentle 5-minute walk','Take a warm shower','Message or call a friend','Write down 3 good things from today',
      'Stretch for 5 minutes','Tidy your desk or room for 10 minutes','Read 10 pages of a book','Get ready for bed a bit earlier tonight',
      'Chew sugar-free gum','Listen to a favorite song or podcast episode'],
  },
};
let lang = 'th';
const L = () => I18N[lang];
function t(key, vars={}){
  const v = L()[key] ?? I18N.th[key] ?? key;
  return typeof v==='string' ? v.replace(/\{(\w+)\}/g, (_,k)=>vars[k] ?? '') : v;
}
const fmtDate = d => L().date(d, L());

const BADGES = [
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

/* ---------- state ---------- */
function load(){
  try{ const r = JSON.parse(localStorage.getItem(KEY)); if(r && typeof r==='object') return shape(r); }catch(e){}
  return blank();
}
let S = load();
lang = S.settings.lang==='en' ? 'en' : 'th';
/* updatedAt moves only when something really changed, so cloud merges can tell which copy is newer */
const snapOf = s => JSON.stringify({...s, updatedAt:0});
var lastSnap = snapOf(S);
function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function save(){
  const snap = snapOf(S);
  if(snap===lastSnap) return;
  S.updatedAt = Date.now(); lastSnap = snap; persist(); scheduleSync();
}

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d,12); };
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const atTime = (base,hhmm) => { const [h,m]=hhmm.split(':').map(Number); const d=new Date(base); d.setHours(h,m,0,0); return d; };
const icon = id => `<svg class="i"><use href="#i-${id}"/></svg>`;
const baht = n => '฿' + Math.round(n).toLocaleString(L().locale);
const mondayOf = d => addDays(d, -((d.getDay()+6)%7));
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function hms(ms){ const s=Math.max(0,Math.floor(ms/1000)); return `${Math.floor(s/3600)}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`; }
function mmss(msv){ const s=Math.max(0,Math.floor(msv/1000)); return `${Math.floor(s/60)}:${pad(s%60)}`; }
function hrsMin(msv){ const m=Math.max(0,Math.round(msv/60000)); const h=Math.floor(m/60), mm=m%60; return h ? t('hm',{h,m:mm}) : t('mOnly',{m:mm}); }
function fastHours(){ const [ch,cm]=S.settings.cutoff.split(':').map(Number), [bh,bm]=S.settings.breakfast.split(':').map(Number);
  const mins=((bh*60+bm)+1440-(ch*60+cm))%1440; return t('hours',{n:Math.round(mins/6)/10}); }

function nightKey(now=new Date()){ return keyOf(now < atTime(now,S.settings.breakfast) ? addDays(now,-1) : now); }
function fastingState(now=new Date()){
  const {cutoff,breakfast} = S.settings;
  const cut = atTime(now,cutoff), brk = atTime(now,breakfast);
  if(now < brk) return { fasting:true, start:atTime(addDays(now,-1),cutoff), end:brk };
  if(now >= cut) return { fasting:true, start:cut, end:atTime(addDays(now,1),breakfast) };
  return { fasting:false, since:brk, start:cut, end:atTime(addDays(now,1),breakfast) };
}
function countStatus(s){ return Object.values(S.log).filter(v=>v===s).length; }
const nightSaving = s => s==='ok' ? Number(S.settings.cost||0) : s==='light' ? Number(S.settings.cost||0)/2 : 0;
function saved(){ return Object.values(S.log).reduce((a,s)=>a+nightSaving(s),0); }
function streak(){
  let d = fromKey(nightKey());
  if(!S.log[keyOf(d)]) d = addDays(d,-1);
  let n=0;
  for(;;){ const k=keyOf(d), v=S.log[k]; if(v==='ok'||v==='light') n++; else if(!(v==='miss' && S.shop.frozen[k])) break; d=addDays(d,-1); }
  return n;
}
function levelInfo(xp){ let Lv=1; while(xp >= 50*(Lv+1)*Lv) Lv++; const base=50*Lv*(Lv-1), next=50*(Lv+1)*Lv; return {L:Lv,cur:xp-base,need:next-base}; }
const levelName = Lv => L().levels[Math.min(Lv,L().levels.length)-1];

/* ---------- motion ---------- */
function countTo(el, to, fmt=v=>Math.round(v), unitKey){
  const from = el.dataset.v==null ? 0 : Number(el.dataset.v);
  el.dataset.v = to;
  const draw = v => { el.innerHTML = fmt(v) + (unitKey ? `<span class="u">${t(unitKey)}</span>` : ''); };
  if(el._tw) el._tw.kill();
  if(!HAS_GSAP || from===to){ draw(to); return; }
  const o={v:from}; el._tw = gsap.to(o,{v:to,duration:1.1,ease:'power3.out',onUpdate:()=>draw(o.v)});
}
function animateIn(section){
  if(!HAS_GSAP) return;
  gsap.fromTo(section.querySelectorAll('.anim'), {opacity:0,y:18}, {opacity:1,y:0,duration:.55,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});
}
let fire = null;
function celebrate(power=1){
  if(REDUCE || !window.confetti) return;
  if(!fire) fire = confetti.create($('confetti'), {resize:true, useWorker:true});
  const colors=['#ff3d00','#ff6a2b','#ff9a62','#ffd2bf','#ffffff'];
  fire({particleCount:Math.round(70*power), spread:70, startVelocity:42, origin:{y:.72}, colors, scalar:.9, ticks:220});
  setTimeout(()=>fire({particleCount:Math.round(40*power), spread:110, origin:{y:.6}, colors, scalar:.75, ticks:200}), 160);
}
function pop(el){ if(HAS_GSAP && el) gsap.fromTo(el,{scale:.85},{scale:1,duration:.5,ease:'back.out(3)'}); }

/* ---------- feedback ---------- */
let toastT;
function toast(msg){ $('toastText').textContent=msg; const el=$('toast'); el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2400); }
function gainXP(n){
  const before = levelInfo(S.xp).L;
  S.xp = Math.max(0, S.xp+n);
  const after = levelInfo(S.xp).L;
  if(after>before) setTimeout(()=>{ toast(t('levelUp',{name:levelName(after), l:after})); celebrate(1.2); }, 2600);
}
function checkBadges(){
  S.best = Math.max(S.best||0, streak());
  let delay = 0;
  for(const b of BADGES){
    if(!S.badges.includes(b.id) && b.test(S)){
      S.badges.push(b.id);
      delay += 2600; setTimeout(()=>{ toast(t('badgeGot',{name:L().badges[b.id]})); celebrate(.6); }, delay);
    }
  }
}

/* ---------- check-in ---------- */
function checkinTarget(){
  const now=new Date(), fs=fastingState(now);
  if(!fs.fasting){
    const last = keyOf(addDays(now,-1));
    if(!S.log[last]) return { key:last, title:'ciLastNight', open:true };
    return { key:keyOf(now), title:'ciTonight', open:false };
  }
  return { key:nightKey(now), title:'ciTonight', open:true };
}
function setStatus(key,status){
  const old = S.log[key];
  if(status==='miss' && old!=='miss') useFreeze(key);
  else if(status!=='miss' && S.shop.frozen[key]) delete S.shop.frozen[key];   // not a miss any more: the freeze comes back
  if(old) gainXP(-XP_VAL[old]);
  if(status){ S.log[key]=status; gainXP(XP_VAL[status]); } else delete S.log[key];
  S.logAt[key] = Date.now();
  checkBadges(); save(); renderAll();
}

/* ---------- static text ---------- */
function applyStatic(){
  document.documentElement.lang = lang;
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $('navTitle').textContent = t($('tab-'+tab).dataset.title);
  $('langBtnText').textContent = lang==='th' ? 'EN' : 'ไทย';
  document.querySelectorAll('#langSeg button').forEach(b=>b.classList.toggle('sel', b.dataset.lang===lang));
}
function setLang(l){
  if(l===lang) return;
  lang = l; S.settings.lang = l; save();
  applyStatic(); destroyCharts(); renderAll();
  if(tab==='progress') renderCharts(fromKey(nightKey()));
  if($('sos').classList.contains('open') && sos){ showMission(); tickSOS(); }
  toast(t('langSwitched'));
}

/* ---------- render: home ---------- */
function renderHome(){
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

function renderTimer(){
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

/* ---------- city: one plot per night of this month ----------
   fasted → a tower (every 7th night in a row → a landmark), light → a small house,
   missed → an empty lot, tonight (not logged yet) → a crane waiting to build. */
const CITY_TONES = ['#2c3150','#36304f','#2a3d4f','#3d3045','#2f2f45','#283a44'];
const cityHash = k => { let h=2166136261; for(const c of k) h=Math.imul(h ^ c.charCodeAt(0), 16777619); return (h>>>0)/4294967296; };
let cityBuilt = null;   // keys already standing, so only new buildings play the rise animation
(function cityStars(){
  let h='';
  for(let i=0;i<30;i++){ const r=cityHash('star'+i), r2=cityHash('s2'+i), x=(r*318+1).toFixed(1), y=(r2*120+6).toFixed(1);
    h+=`<circle cx="${x}" cy="${y}" r="${(.5+r*.8).toFixed(2)}" opacity="${(.35+r2*.5).toFixed(2)}" class="${i%3?'':'tw'}" style="animation-delay:${(r*2.6).toFixed(2)}s"/>`; }
  $('cityStars').innerHTML = h;
})();
/* builds the skyline markup for any month; A = animation bookkeeping (live view only) */
const ymOf = ts => nightKey(new Date(ts)).slice(0,7);
const monthRuns = ym => S.runs.filter(r=>ymOf(r.at)===ym);
const monthCravings = ym => S.sessions.filter(x=>ymOf(x.t)===ym).length;
const tonightResisted = () => { const k=nightKey(); return S.sessions.some(x=>nightKey(new Date(x.t))===k); };
function buildCity(y, m, tonight, A, postcard){
  const n=new Date(y,m+1,0).getDate(), ym=`${y}-${pad(m+1)}`, G=211, slot=312/n;
  const runs=monthRuns(ym), km=runs.reduce((a,r)=>a+r.dist,0), elev=runs.reduce((a,r)=>a+(r.elev||0),0), cv=monthCravings(ym);
  let out='', towers=0, houses=0, ok=0, run=0;
  const tops=[];
  // hills behind the city grow with this month's treadmill climb
  if(elev>0){
    const h=Math.min(48, 8+elev/8), h2=h*.7;
    out += `<path class="hill far" d="M0 ${G} C30 ${G-h2} 70 ${G-h2*.4} 110 ${G-h2*.8} S190 ${G-h2*.3} 230 ${G-h2} S300 ${G-h2*.5} 320 ${G-h2*.6} V${G}Z"/>`;
    out += `<path class="hill" d="M0 ${G-h*.5} C40 ${G-h} 80 ${G-h*.3} 130 ${G-h*.6} S220 ${G-h} 270 ${G-h*.45} S320 ${G-h*.8} 320 ${G-h*.8} V${G}H0Z"/>`;
  }
  // a food monster lurks over the city on nights you have not fought a craving yet
  if(!postcard && tonight && !tonightResisted()) out += `<g class="monster" transform="translate(238 ${G-64})"><g class="peek"><path d="M0 20 q0 -20 10 -20 q10 0 10 20 l-3.3 -3 -3.3 3 -3.4 -3 -3.3 3 -3.4 -3z" fill="#7a4fd8"/><circle cx="6.5" cy="8" r="2.4" fill="#fff"/><circle cx="13.5" cy="8" r="2.4" fill="#fff"/><circle cx="7.2" cy="8.5" r="1.1" fill="#2b1d16"/><circle cx="14.2" cy="8.5" r="1.1" fill="#2b1d16"/><path d="M6 13.5 l1.6 1.6 1.6 -1.6 1.6 1.6 1.6 -1.6 1.6 1.6" stroke="#fff" stroke-width=".9" fill="none"/><path d="M21 7 l5 -5 M23.5 1.5 v3.5 M25.8 -.4 v3.5" stroke="#c9c9cf" stroke-width="1.1" fill="none" stroke-linecap="round"/></g></g>`;
  for(let d=1; d<=n; d++){
    const k=keyOf(new Date(y,m,d,12)), st=S.log[k], r=cityHash(k), x=4+(d-1)*slot, w=Math.max(4, slot-1.3), cx=x+w/2;
    run = st==='ok'||st==='light' ? run+1 : 0;
    if(st==='ok') ok++;
    const grow = id=>{ if(!A) return ''; A.now.add(id); return A.seen.has(id) && !A.first ? '' : ` rise" data-d="${A.first ? (d*.03).toFixed(2) : '.1'}`; };
    const upg = st==='light' && S.city.up[k];   // a light-night house upgraded with bricks
    if(st==='ok' || upg){
      towers++;
      const land = st==='ok' && run%7===0, h = land ? 70 : Math.round((upg ? 26 : 30)+r*(upg ? 18 : 26)), top=G-h, tone = upg ? '#5b4034' : CITY_TONES[Math.floor(r*CITY_TONES.length)];
      let extra='';
      if(land) extra = `<path class="emblem" d="M${cx+1.5} ${top-14} a5 5 0 1 0 4 7.5 a3.9 3.9 0 1 1 -4 -7.5z"/><line class="ant" x1="${cx}" y1="${top}" x2="${cx}" y2="${top-5}"/>`;
      else if(r>.72) extra = `<line class="ant" x1="${cx}" y1="${top}" x2="${cx}" y2="${top-8}"/><circle class="blink" cx="${cx}" cy="${top-8.5}" r="1.1"/>`;
      else if(r<.25) extra = `<rect class="roof" x="${x+w*.2}" y="${top-6}" width="${w*.6}" height="6"/>`;
      tops.push({ x:x+1.2, top: r<.25 ? top-6 : top, h, k });
      out += `<g class="bld${grow('t'+k)}" style="--bc:${land ? '#4a3a6a' : tone}">${extra}<rect class="body" x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${h}" rx="1"/><rect class="wins ${r>.5?'b':''}" x="${(x+.5).toFixed(1)}" y="${top+3}" width="${(w-1).toFixed(1)}" height="${h-6}"/></g>`;
    } else if(st==='light'){
      houses++;
      const h=Math.round(10+r*6), top=G-h;
      out += `<g class="bld house${grow('h'+k)}" style="--bc:#6a4f3c"><path class="roof" d="M${(x-.5).toFixed(1)} ${top} L${cx.toFixed(1)} ${top-6} L${(x+w+.5).toFixed(1)} ${top}Z"/><rect class="body" x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${h}"/><rect class="hw" x="${(cx-1.2).toFixed(1)}" y="${top+3}" width="2.4" height="2.6"/></g>`;
    } else if(st==='miss'){
      out += S.shop.frozen[k] ? `<g class="ice"><rect x="${x.toFixed(1)}" y="${G-7}" width="${w.toFixed(1)}" height="7" rx="1.5"/><path d="M${(x+1.2).toFixed(1)} ${G-5.5} h${(w*.4).toFixed(1)}"/></g>`
        : `<path class="lot" d="M${x.toFixed(1)} ${G} q${(w/2).toFixed(1)} -4 ${w.toFixed(1)} 0z"/>`;
    } else if(tonight && k===tonight){
      out += `<g class="crane"><line x1="${cx}" y1="${G}" x2="${cx}" y2="${G-46}"/><line x1="${cx-7}" y1="${G-44}" x2="${cx+16}" y2="${G-44}"/><line x1="${cx+13}" y1="${G-44}" x2="${cx+13}" y2="${G-32}"/><path d="M${cx} ${G-46} L${cx+16} ${G-44}"/><circle class="blink" cx="${cx}" cy="${G-48}" r="1.5"/></g>`;
    } else if(!tonight || k>tonight){
      out += `<rect class="plot" x="${x.toFixed(1)}" y="${G-1.5}" width="${w.toFixed(1)}" height="1.5"/>`;
    }
  }
  // every craving you fought off this month plants a victory flag on a tower (tallest first)
  tops.sort((a,b)=>b.h-a.h).slice(0, cv).forEach((tp,i)=>{
    out += `<g class="flag"><line x1="${tp.x.toFixed(1)}" y1="${tp.top}" x2="${tp.x.toFixed(1)}" y2="${tp.top-10}"/><path class="pennant" style="animation-delay:-${(i*.37).toFixed(2)}s" d="M${tp.x.toFixed(1)} ${tp.top-10} l7 2 -7 2z"/></g>`;
  });
  out += cityFront(ym, A);
  // the street gets paved as you run: 20 km this month paves all of it
  const pw = Math.min(1, km/20)*320;
  let road = '';
  if(pw>0){
    road = `<rect class="road" x="0" y="211.5" width="${pw.toFixed(1)}" height="8.5"/><line class="lane" x1="2" y1="215.8" x2="${Math.max(2,pw-2).toFixed(1)}" y2="215.8"/>`;
    if(pw<320) road += `<path class="cone" d="M${(pw+3).toFixed(1)} 219 l2.2 -6 2.2 6z"/>`;
  }
  return { html:out, road, towers, houses, ok, km, elev, cv, ym };
}
function renderCity(){
  const tn=fromKey(nightKey()), y=tn.getFullYear(), m=tn.getMonth();
  const A = { first:cityBuilt===null, seen:cityBuilt||new Set(), now:new Set() };
  const c = buildCity(y, m, keyOf(tn), A);
  $('skyline').innerHTML = c.html;
  $('cityRoad').innerHTML = c.road;
  renderCityFx();
  $('skyline').querySelectorAll('[data-d]').forEach(g=>g.style.setProperty('--d', g.dataset.d+'s'));
  cityBuilt = A.now;
  const month = L().monthsLong[m];
  const w = cityWallet();
  $('cityCap').innerHTML = (c.towers||c.houses ? t('cityCap',{m:month, b:`<b>${c.towers}</b>`, h:`<b>${c.houses}</b>`}) : t('cityEmpty'))
    + ` <span class="cap-mat">${icon('brick')}${w.brick}</span>${icon('chevron-right')}`;
  cityStats = { month, towers:c.towers, houses:c.houses, km:c.km, cv:c.cv };
  if($('citySheet').classList.contains('open')) renderCitySheet();
}

/* ---- city materials: fasted night = 2 bricks, light night = 1 wood (3 wood → 1 brick) ----
   Earned amounts come from the log, so editing a night fixes the wallet too; only spending is stored. */
let cityStats = { month:'', towers:0, houses:0 };
const DECOR = { tree:{cost:1, icon:'tree'}, lamp:{cost:1, icon:'lamp'}, fountain:{cost:4, icon:'fountain'} };
const DECOR_SLOTS = 10, UPGRADE_COST = 3;
const cityMonth = () => nightKey().slice(0,7);
function cityWallet(){
  const c=S.city;
  return { brick: Math.max(0, countStatus('ok')*2 + (c.crafted||0) + 5*(S.shop.owned.bricks||0) - (c.brickUsed||0)), wood: Math.max(0, countStatus('light') - (c.woodUsed||0)) };
}
function monthDecor(ym=cityMonth()){
  const out=[]; for(let i=0;i<DECOR_SLOTS;i++){ const v=S.city.decor[ym+':'+i]; if(v) out[i]=v; } return out;
}
function upgradableHouses(){
  const ym=cityMonth(); return Object.keys(S.log).filter(k=>k.startsWith(ym) && S.log[k]==='light' && !S.city.up[k]).sort();
}
function cityResidents(){
  const b = S.gacha.buddy && S.gacha.owned[S.gacha.buddy] ? CHAR_BY_ID[S.gacha.buddy] : null;
  const seed = nightKey();   // a different crowd strolls by each day
  const others = CHARS.filter(c=>S.gacha.owned[c.id] && c!==b).sort((a,c)=>cityHash(seed+a.id)-cityHash(seed+c.id));
  return { buddy:b, walkers:others.slice(0, b ? 3 : 4), total: CHARS.filter(c=>S.gacha.owned[c.id]).length };
}
/* foreground street: decorations, the buddy's house, and residents walking up and down */
function cityFront(ym, A){
  const G=211;
  let out='';
  monthDecor(ym).forEach((type,i)=>{
    if(!type) return;
    const x = 12 + i*27 + (i%2)*4, id='d'+ym+i;
    if(A) A.now.add(id);
    const cls = !A || (A.seen.has(id) && !A.first) ? '' : ' rise';
    if(type==='tree') out += `<g class="deco${cls}"><rect x="${x-.8}" y="${G-6}" width="1.6" height="6" fill="#6b4a2a"/><circle cx="${x}" cy="${G-10}" r="5" fill="#2f8f4e"/><circle cx="${x-2.5}" cy="${G-8}" r="3.4" fill="#3fae5f"/><circle cx="${x+2.6}" cy="${G-8.5}" r="3.2" fill="#37a056"/></g>`;
    else if(type==='lamp') out += `<g class="deco lamp${cls}"><line x1="${x}" y1="${G}" x2="${x}" y2="${G-15}" stroke="#8a8aa0" stroke-width="1.1"/><path d="M${x-2.6} ${G-15} h5.2 l-1 -2.4 h-3.2z" fill="#8a8aa0"/><circle class="bulb" cx="${x}" cy="${G-14}" r="1.6"/><circle class="halo" cx="${x}" cy="${G-13}" r="7"/></g>`;
    else if(type==='fountain') out += `<g class="deco fountain${cls}"><path d="M${x-9} ${G-4} h18 v4 h-18z" fill="#7d8aa6"/><path class="jet" d="M${x} ${G-4} V${G-13} M${x} ${G-12} q-5 1 -7 8 M${x} ${G-12} q5 1 7 8"/><circle cx="${x}" cy="${G-14}" r="1.4" fill="#9fd8ff"/></g>`;
  });
  const res = cityResidents();
  const sprite = (ch, x, size) => charSVG(ch).replace('<svg ', `<svg x="${x}" y="${G-size}" width="${size}" height="${size}" `);
  if(res.buddy){
    const hx=298;
    out += `<g class="bhouse"><path d="M${hx-11} ${G-13} L${hx} ${G-22} L${hx+11} ${G-13}Z" fill="#ff6a5c"/><rect x="${hx-9}" y="${G-13}" width="18" height="13" fill="#f4e3cf"/><rect x="${hx-2.5}" y="${G-8}" width="5" height="8" rx="2.5" fill="#8a5a3a"/><path class="heart" d="M${hx} ${G-14.5} l-2.2 -2.1 a1.3 1.3 0 0 1 2.2 -1.6 a1.3 1.3 0 0 1 2.2 1.6z"/></g>`;
    out += `<g class="walker" transform="translate(268 0)" style="--a:262px;--b:276px;--dur:7s;--delay:-2s"><g class="hop">${buddySVG(res.buddy).replace('<svg ', `<svg x="0" y="${G-17}" width="17" height="17" `)}</g></g>`;
  }
  res.walkers.forEach((ch,i)=>{
    const r=cityHash(nightKey()+ch.id), a=Math.round(4+r*90+i*40), b=Math.min(res.buddy ? 236 : 296, a+70+Math.round(r*80)), dur=(12+r*10).toFixed(1);
    out += `<g class="walker" transform="translate(${a} 0)" style="--a:${a}px;--b:${b}px;--dur:${dur}s;--delay:-${(r*dur).toFixed(1)}s"><g class="hop">${sprite(ch, 0, 15)}</g></g>`;
  });
  return out;
}

/* ---- city sheet: wallet, crafting, building, residents ---- */
function renderCitySheet(){
  const w=cityWallet(), res=cityResidents(), up=upgradableHouses(), deco=monthDecor(), free=DECOR_SLOTS - deco.filter(Boolean).length;
  const cost = n => `<span>${icon('brick')}${t('costBricks',{n})}</span>`;
  const row = (ic, title, sub, act, ok) => `<div class="cs-row"><div class="ic">${icon(ic)}</div><div class="t"><b>${title}</b>${sub}</div><button class="press" data-act="${act}" ${ok?'':'disabled'}>${t('build')}</button></div>`;
  $('csBody').innerHTML = `
    <h3 class="rd-title" id="csH">${t('cityTitle',{m:cityStats.month})}</h3>
    <p class="cs-sub">${t('citySub',{b:cityStats.towers, h:cityStats.houses, r:res.total})}</p>
    <div class="cs-wallet">
      <div><div class="ic brick">${icon('brick')}</div><div><b class="num">${w.brick}</b><span>${t('brick')}</span></div></div>
      <div><div class="ic wood">${icon('wood')}</div><div><b class="num">${w.wood}</b><span>${t('wood')}</span></div></div>
    </div>
    <button class="cs-craft press" data-act="craft" ${w.wood>=3?'':'disabled'}>${icon('wood')}${t('craft')}</button>
    <div class="rd-h">${t('cityBuild')}<span>${t('slotsLeft',{n:free})}</span></div>
    <div class="cs-list">
      ${row('building', t('upHouse'), `${cost(UPGRADE_COST)}<span> · ${t('upHouseSub',{n:up.length})}</span>`, 'upgrade', up.length && w.brick>=UPGRADE_COST)}
      ${row('tree', t('dTree'), cost(DECOR.tree.cost), 'tree', free>0 && w.brick>=DECOR.tree.cost)}
      ${row('lamp', t('dLamp'), cost(DECOR.lamp.cost), 'lamp', free>0 && w.brick>=DECOR.lamp.cost)}
      ${row('fountain', t('dFountain'), cost(DECOR.fountain.cost), 'fountain', free>0 && w.brick>=DECOR.fountain.cost)}
    </div>
    <div class="rd-h">${t('residents')}<span>${res.total}</span></div>
    ${res.total ? `<div class="cs-res">${res.buddy ? `<div class="bud">${charSVG(res.buddy)}${t('buddyHome',{name:escHTML(res.buddy.name[lang])})}</div>` : ''}${res.walkers.map(c=>`<div>${charSVG(c)}${escHTML(c.name[lang])}</div>`).join('')}</div>` : `<p class="cs-note" style="margin-top:0">${t('noResidents')}</p>`}
    <button class="cs-craft cs-pc press" data-act="postcard">${icon('sparkles')}${t('pcTitle')}</button>
    <p class="cs-note">${t('cityHow')}</p>`;
}
function openCitySheet(){ renderCitySheet(); openModal('citySheet'); }
function cityAct(act){
  if(act==='postcard'){ closeModal('citySheet'); setTimeout(()=>openPostcard(), 250); return; }
  const w=cityWallet(), c=S.city, ym=cityMonth();
  if(act==='craft'){ if(w.wood<3) return; c.woodUsed=(c.woodUsed||0)+3; c.crafted=(c.crafted||0)+1; toast(t('crafted')); }
  else if(act==='upgrade'){
    const k=upgradableHouses()[0]; if(!k || w.brick<UPGRADE_COST) return toast(t('noBricks'));
    c.up[k]=1; c.brickUsed=(c.brickUsed||0)+UPGRADE_COST; toast(t('builtToast'));
  } else if(DECOR[act]){
    const i=[...Array(DECOR_SLOTS).keys()].find(i=>!c.decor[ym+':'+i]);
    if(i===undefined) return;
    if(w.brick<DECOR[act].cost) return toast(t('noBricks'));
    c.decor[ym+':'+i]=act; c.brickUsed=(c.brickUsed||0)+DECOR[act].cost; toast(t('builtToast'));
  } else return;
  save(); renderCity(); renderCitySheet(); celebrate(.4);
}
$('csBody').addEventListener('click', e=>{ const b=e.target.closest('[data-act]'); if(b && !b.disabled) cityAct(b.dataset.act); });
$('city').onclick = $('cityCap').onclick = openCitySheet;
$('csClose').onclick = $('citySheetBg').onclick = ()=>closeModal('citySheet');

/* ---- monthly postcard: the month's city at night + its stats, as a shareable 1080×1350 image ---- */
let pcBlob = null, pcYm = '', pcJob = 0;
function postcardMonths(){
  const set = new Set([cityMonth()]);
  Object.keys(S.log).forEach(k=>set.add(k.slice(0,7)));
  S.runs.forEach(r=>set.add(ymOf(r.at)));
  return [...set].sort().reverse().slice(0,6);
}
const PC_PROPS = ['fill','stroke','stroke-width','opacity','fill-opacity','stroke-opacity','stop-color','stop-opacity','display','stroke-dasharray','stroke-linecap','stroke-linejoin'];
async function postcardBlob(ym){
  const [y, mo] = ym.split('-').map(Number), m = mo-1, isCur = ym===cityMonth();
  const c = buildCity(y, m, isCur ? keyOf(fromKey(nightKey())) : null, null, true);
  // draw the city off-screen inside a "night" hero so the CSS applies, then bake the computed styles in
  const stage = document.createElement('div'); stage.className = 'hero live pc-stage';
  const svg = $('city').querySelector('svg').cloneNode(true);
  stage.appendChild(svg); document.body.appendChild(stage);
  svg.querySelector('#skyline').innerHTML = c.html;
  svg.querySelector('#cityRoad').innerHTML = c.road;
  svg.querySelector('#celestial').setAttribute('transform', 'translate(262 58)');
  svg.querySelectorAll('.arc-track,.arc-fill,.clouds').forEach(e=>e.remove());
  const els = [svg, ...svg.querySelectorAll('*')];
  const baked = els.map(el=>{ const cs=getComputedStyle(el); return PC_PROPS.map(pr=>`${pr}:${cs.getPropertyValue(pr)}`).join(';'); });
  els.forEach((el,i)=>{ el.setAttribute('style', baked[i]); el.removeAttribute('class'); });
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '1000'); svg.setAttribute('height', '688');
  const str = new XMLSerializer().serializeToString(svg);
  stage.remove();
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  await img.decode();

  const W=1080, H=1350, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const x = cv.getContext('2d');
  const font = (w,sz) => `${w} ${sz}px "IBM Plex Sans Thai","Inter",-apple-system,system-ui,sans-serif`;
  try{ await Promise.all([document.fonts.load(font(700,72)), document.fonts.load(font(600,28))]); }catch(e){}
  const bg = x.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#17142e'); bg.addColorStop(1,'#09090d');
  x.fillStyle = bg; x.fillRect(0,0,W,H);
  const gl = x.createRadialGradient(W*.88,90,0,W*.88,90,560); gl.addColorStop(0,'rgba(255,90,31,.38)'); gl.addColorStop(1,'rgba(255,90,31,0)');
  x.fillStyle = gl; x.fillRect(0,0,W,H);
  x.fillStyle = '#ff9a62'; x.font = font(700,30); x.fillText(t('pcBrand'), 60, 110);
  x.fillStyle = '#fff'; x.font = font(700,72); x.fillText(`${t('cityTitle',{m:L().monthsLong[m]})} ${y}`, 60, 196);
  // city card
  const cx=40, cy=250, cw=1000, ch=688;
  x.save(); x.beginPath(); x.roundRect ? x.roundRect(cx, cy, cw, ch, 40) : x.rect(cx, cy, cw, ch); x.clip();
  x.fillStyle = '#121215'; x.fillRect(cx, cy, cw, ch); x.drawImage(img, cx, cy, cw, ch);
  x.restore();
  // stats
  const stats = [[c.towers, t('pcTowers')], [c.ok, t('pcNights')], [c.km.toFixed(1), t('pcKm')], [c.cv, t('pcFlags')]];
  stats.forEach(([v,label],i)=>{
    const sx = 60 + i*250;
    x.fillStyle = '#fff'; x.font = font(700,68); x.fillText(String(v), sx, 1070);
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = font(600,27); x.fillText(label, sx, 1114);
  });
  x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(60, 1180, W-120, 2);
  x.fillStyle = 'rgba(255,255,255,.5)'; x.font = font(600,28); x.fillText(t('pcFooter'), 60, 1250);
  return new Promise(r=>cv.toBlob(r, 'image/png'));
}
async function showPostcard(ym){
  pcYm = ym; const job = ++pcJob;
  $('pcMonths').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b.dataset.ym===ym));
  $('pcImg').parentElement.classList.add('busy');
  try{
    const blob = await postcardBlob(ym);
    if(job!==pcJob) return;
    pcBlob = blob;
    const old = $('pcImg').src; $('pcImg').src = URL.createObjectURL(blob); if(old.startsWith('blob:')) URL.revokeObjectURL(old);
  }catch(e){ console.warn('postcard failed', e); toast(t('pcFail')); }
  finally{ if(job===pcJob) $('pcImg').parentElement.classList.remove('busy'); }
}
function openPostcard(){
  $('pcMonths').innerHTML = postcardMonths().map(ym=>{ const [y,m]=ym.split('-').map(Number); return `<button class="press" data-ym="${ym}">${L().monthsLong[m-1]} ${y}</button>`; }).join('');
  openModal('pcSheet');
  showPostcard(cityMonth());
}
$('pcMonths').onclick = e=>{ const b=e.target.closest('button'); if(b && b.dataset.ym!==pcYm) showPostcard(b.dataset.ym); };
$('pcShare').onclick = async ()=>{
  if(!pcBlob) return;
  const file = new File([pcBlob], `city-${pcYm}.png`, { type:'image/png' });
  try{
    if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:t('pcTitle') }); return; }
  }catch(e){ if(e.name==='AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(pcBlob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
};
$('pcClose').onclick = $('pcBg').onclick = ()=>closeModal('pcSheet');

/* ---------- shop: spend quest coins ----------
   Coins earned come from claimed quests and coins spent from what you own, so both are
   derived and merge cleanly between devices. */
const SHOP_ITEMS = [
  { id:'ticket',   cat:'item',  price:40,  kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#ff9a62,#ff5a1f)', grant:()=>{ S.gacha.tickets+=1; } },
  { id:'ticket10', cat:'item',  price:360, kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#a78bfa,#7c3aed)', grant:()=>{ S.gacha.tickets+=10; } },
  { id:'goldt',    cat:'item',  price:400, kind:'use',   art:'ticket', tone:'linear-gradient(135deg,#ffd34d,#f59e0b)', grant:()=>{ S.gacha.gold+=1; } },
  { id:'freeze',   cat:'item',  price:120, kind:'stock', art:'shield-check', tone:'linear-gradient(135deg,#7dd3fc,#2563eb)' },
  { id:'bricks',   cat:'item',  price:30,  kind:'stock', art:'brick', tone:'linear-gradient(135deg,#ff8a5c,#d9480f)' },
  { id:'balloon',  cat:'city',  price:150, kind:'fx' },
  { id:'ferris',   cat:'city',  price:350, kind:'fx' },
  { id:'fireworks',cat:'city',  price:250, kind:'fx' },
  { id:'aurora',   cat:'city',  price:300, kind:'fx' },
  { id:'meteor',   cat:'city',  price:200, kind:'fx' },
  { id:'snow',     cat:'city',  price:180, kind:'fx' },
  { id:'hat_party',  cat:'style', slot:'hat',   price:100, kind:'wear' },
  { id:'hat_beanie', cat:'style', slot:'hat',   price:120, kind:'wear' },
  { id:'hat_crown',  cat:'style', slot:'hat',   price:300, kind:'wear' },
  { id:'face_sun',   cat:'style', slot:'face',  price:120, kind:'wear' },
  { id:'face_heart', cat:'style', slot:'face',  price:90,  kind:'wear' },
  { id:'frame_gold',    cat:'style', slot:'frame', price:150, kind:'wear' },
  { id:'frame_rainbow', cat:'style', slot:'frame', price:250, kind:'wear' },
  { id:'frame_neon',    cat:'style', slot:'frame', price:200, kind:'wear' },
  // Loy Krathong 2026: paid in lotus, sold only during the festival, kept forever
  { id:'kt_bread',    cat:'fest', lotus:true, price:15, kind:'krathong' },
  { id:'kt_coco',     cat:'fest', lotus:true, price:20, kind:'krathong' },
  { id:'kt_lotus',    cat:'fest', lotus:true, price:40, kind:'krathong' },
  { id:'kt_moonie',   cat:'fest', lotus:true, price:60, kind:'krathong' },
  { id:'lantern',     cat:'fest', lotus:true, price:50, kind:'fx', showIn:'city' },
  { id:'hat_chada',   cat:'fest', lotus:true, price:45, kind:'wear', slot:'hat', showIn:'style' },
  { id:'frame_lotus', cat:'fest', lotus:true, price:35, kind:'wear', slot:'frame', showIn:'style' },
];
const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i=>[i.id,i]));
const CHAR_PRICE = { salt:30, common:80, rare:200, sr:500, legend:1500 };
const itemPrice = id => id.startsWith('char:') ? CHAR_PRICE[CHAR_BY_ID[id.slice(5)]?.tier] || 0 : SHOP_BY_ID[id]?.price || 0;
const coinsEarned = () => Object.keys(S.quests.claimed).reduce((a,id)=>a+coinValue(id), 0) + (festOver() ? lotusLeft()*FEST.rate : 0);
const coinsSpent = () => Object.entries(S.shop.owned).reduce((a,[id,n])=>a + (SHOP_BY_ID[id]?.lotus || id.startsWith('fchar:') ? 0 : itemPrice(id)*n), 0);
const coinsLeft = () => Math.max(0, coinsEarned() - coinsSpent());
const freezeLeft = () => Math.max(0, (S.shop.owned.freeze||0) - Object.keys(S.shop.frozen).length);
/* a missed night uses a streak freeze, but only when there is a streak to save */
function useFreeze(key){
  if(!freezeLeft()) return;
  const prev=keyOf(addDays(fromKey(key),-1)), v=S.log[prev];
  if(!(v==='ok' || v==='light' || S.shop.frozen[prev])) return;
  S.shop.frozen[key]=Date.now();
  setTimeout(()=>toast(t('freezeUsed')), 300);
}
function dailyChars(){
  const k=keyOf(new Date());
  const pick=(tiers,salt)=>{ const pool=CHARS.filter(c=>tiers.includes(c.tier) && !c.limited); return pool[Math.floor(cityHash(k+salt)*pool.length)]; };
  return [...new Set([pick(['salt','common'],'a'), pick(['common'],'b'), pick(['rare'],'c'), pick(['sr','legend'],'d')])];
}
/* little scenes for the city effects */
function fxArt(id, preview){
  const G=211;
  if(id==='aurora') return `<g class="fx-night"><defs><linearGradient id="gAuro" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7dffd8" stop-opacity="0"/><stop offset=".3" stop-color="#7dffd8" stop-opacity=".5"/><stop offset=".7" stop-color="#b48aff" stop-opacity=".45"/><stop offset="1" stop-color="#b48aff" stop-opacity="0"/></linearGradient></defs><path class="au" d="M-20 40 C40 10 90 60 150 30 S260 10 340 40 L340 62 C260 32 200 72 150 52 S40 32 -20 62Z" fill="url(#gAuro)"/><path class="au a2" d="M-20 72 C60 42 110 82 170 57 S270 42 340 68 L340 84 C270 60 210 94 170 72 S60 62 -20 86Z" fill="url(#gAuro)" opacity=".6"/></g>`;
  if(id==='meteor') return `<g class="fx-night"><g class="meteor" transform="translate(120 40)"><line x1="0" y1="0" x2="-26" y2="-9" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/><circle r="1.4" fill="#fff"/></g><g class="meteor m2" transform="translate(200 30)"><line x1="0" y1="0" x2="-20" y2="-7" stroke="#cfe6ff" stroke-width="1.1" stroke-linecap="round"/><circle r="1.1" fill="#fff"/></g></g>`;
  if(id==='fireworks'){
    const burst=(x,y,c,delay)=>{ let l=''; for(let i=0;i<12;i++){ const a=i*Math.PI/6, c1=Math.cos(a), s1=Math.sin(a); l+=`<line x1="${(c1*4).toFixed(1)}" y1="${(s1*4).toFixed(1)}" x2="${(c1*14).toFixed(1)}" y2="${(s1*14).toFixed(1)}"/><circle cx="${(c1*16.5).toFixed(1)}" cy="${(s1*16.5).toFixed(1)}" r="1"/>`; }
      return `<g transform="translate(${x} ${y})"><g class="burst" style="animation-delay:${delay}s" stroke="${c}" fill="${c}" stroke-width="1.3" stroke-linecap="round">${l}</g></g>`; };
    return `<g class="fx-night">${burst(92,62,'#ff6a8a',0)}${burst(232,48,'#ffd36b',-1.4)}${burst(165,90,'#7dd3fc',-.7)}</g>`;
  }
  if(id==='lantern'){
    let h=''; for(let i=0;i<7;i++){ const r=cityHash('lan'+i), r2=cityHash('ln2'+i), d=(16+r2*12).toFixed(1), x=Math.round(20+r*280);
      h+=`<g class="lan" transform="translate(${x} ${preview ? Math.round(40+r2*120) : 120})" style="--x:${x}px;--d:${d}s;--dl:-${(r*d).toFixed(1)}s;--dx:${Math.round((r2-.5)*40)}px"><circle cy="1" r="7" fill="#ffb84d" opacity=".28"/><path d="M-3.2 -4.5 h6.4 l1.3 7.5 h-9z" fill="#ff9a3c"/><path d="M-2 3.2 h4" stroke="#ffe08a" stroke-width="1.4"/></g>`; }
    return `<g class="fx-night">${h}</g>`;
  }
  if(id==='balloon') return `<g transform="translate(70 60)"><g class="bfloat"><path d="M0 -14 a11 12 0 0 1 11 12 c0 7 -6 10 -8 14 h-6 c-2 -4 -8 -7 -8 -14 a11 12 0 0 1 11 -12z" fill="#ff6a5c"/><path d="M0 -14 c-4.5 4 -5.5 16 -3 26 M0 -14 c4.5 4 5.5 16 3 26" stroke="#ffd36b" stroke-width="2.2" fill="none"/><path d="M-3 12 l1 5 M3 12 l-1 5" stroke="#c9a27a" stroke-width=".7"/><rect x="-3" y="17" width="6" height="4.5" rx="1" fill="#8a5a2b"/></g></g>`;
  if(id==='ferris'){
    const cx=preview?160:58, cy=G-30, r=22; let sp='', cab='';
    for(let i=0;i<8;i++){ const a=i*Math.PI/4, x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; sp+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; cab+=`<circle class="cab" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; }
    return `<g><path d="M${cx-13} ${G} L${cx} ${cy} L${cx+13} ${G}" stroke="#7d7da0" stroke-width="1.8" fill="none"/><g class="wheel" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#b9b9d6" stroke-width="1.3"/><g stroke="#9a9ac0" stroke-width=".8">${sp}</g>${cab}</g><circle cx="${cx}" cy="${cy}" r="2.4" fill="#d1d1e6"/></g>`;
  }
  if(id==='snow'){
    let h=''; for(let i=0;i<34;i++){ const r=cityHash('flake'+i), r2=cityHash('fl2'+i), d=(6+r2*6).toFixed(1);
      h+=`<circle class="flake" cx="${(r*320).toFixed(1)}" cy="${preview ? (r2*200).toFixed(1) : -6}" r="${(.7+r2*1.1).toFixed(2)}" style="--d:${d}s;--dl:-${(r*d).toFixed(1)}s;--dx:${((r2-.5)*24).toFixed(1)}px"/>`; }
    return `<g>${h}</g>`;
  }
  return '';
}
function renderCityFx(){
  const fx=S.shop.equip.fx||{};
  $('cityFxBack').innerHTML = ['aurora','meteor','fireworks','lantern','balloon','ferris'].filter(k=>fx[k] && S.shop.owned[k]).map(k=>fxArt(k)).join('');
  $('cityFxFront').innerHTML = fx.snow && S.shop.owned.snow ? fxArt('snow') : '';
}
/* ---- shop screen ---- */
let shopCat = 'item';
const SHOP_CATS = [['item','ticket','catItem'], ['chars','sparkles','catChars'], ['city','building','catCity'], ['style','heart','catStyle']];
function itemArt(it){
  if(it.cat==='item') return `<div class="si-art"><div class="big" style="background:${it.tone}">${icon(it.art)}</div></div>`;
  if(it.cat==='city') return `<div class="si-art scene"><svg viewBox="0 0 320 220">${fxArt(it.id, true).replace(/gAuro/g, "gAuroP")}<rect x="0" y="205" width="320" height="15" fill="#1e1e26"/><path d="M20 205 h30 v-40 h-30z M60 205 h22 v-60 h-22z M240 205 h26 v-48 h-26z M276 205 h24 v-30 h-24z" fill="#2c3150"/></svg></div>`;
  const b = S.gacha.buddy && S.gacha.owned[S.gacha.buddy] && CHAR_BY_ID[S.gacha.buddy];
  const base = b ? charSVG(b) : `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="58" r="32" fill="#ffd98f" stroke="#e39a33" stroke-width="1.5"/>${F(50,60,1)}</svg>`;
  const id = b ? b.id : '_plain';
  if(!b) _faceCache._plain = {cx:50, cy:60, s:1};
  if(it.slot==='frame') return `<div class="si-art"><div class="fprev" data-frame="${it.id}">${b ? base : ''}</div></div>`;
  return `<div class="si-art">${accessorize(base, id, {[it.slot]:it.id})}</div>`;
}
function buyBtn(id, price, label){
  const poor = coinsLeft() < price;
  return `<button class="si-buy press ${poor?'poor':''}" data-buy="${id}" data-price="${price}">${label || icon('coins')+price}</button>`;
}
function shopCard(it){
  const name=t('si_'+it.id), desc=t('sd_'+it.id), owned=S.shop.owned[it.id]||0;
  let btn, stock='';
  if(it.kind==='fx'){
    const on = !!S.shop.equip.fx[it.id];
    btn = owned ? `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>` : buyBtn(it.id, it.price);
  } else if(it.kind==='wear'){
    const on = S.shop.equip[it.slot]===it.id;
    btn = owned ? `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>` : buyBtn(it.id, it.price);
  } else {
    btn = buyBtn(it.id, it.price);
    if(it.id==='freeze' && freezeLeft()) stock = t('stockN',{n:freezeLeft()});
  }
  return `<div class="card sitem">${itemArt(it)}${stock?`<span class="si-stock">${stock}</span>`:''}<b>${name}</b><span class="si-desc">${desc}</span>${btn}</div>`;
}
function renderShop(){
  $('shopCoins').textContent = coinsLeft().toLocaleString(L().locale);
  $('shopCats').innerHTML = SHOP_CATS.map(([id,ic,k])=>`<button class="press ${id===shopCat?'sel':''}" data-cat="${id}">${icon(ic)}${t(k)}</button>`).join('');
  let h='';
  if(shopCat==='chars'){
    const hrs = Math.max(1, Math.ceil((dayStart(addDays(new Date(),1)) - new Date())/3600000));
    h = `<div class="shop-sec"><h3>${t('charsToday')}</h3><span>${t('charsRefresh',{h:hrs})}</span></div><div class="shop-grid">` +
      dailyChars().map(ch=>{ const id='char:'+ch.id, price=CHAR_PRICE[ch.tier], have=S.gacha.owned[ch.id];
        return `<div class="card sitem"><div class="si-art chr">${miniCardHTML(ch,{})}</div><b>${escHTML(ch.name[lang])}</b><span class="si-desc">${t('tier_'+ch.tier)} · ${'★'.repeat(TIERS[ch.tier].stars)}</span>${have ? `<button class="si-buy" disabled>${icon('check')}${t('ownedIt')}</button>` : buyBtn(id, price)}</div>`; }).join('') + '</div>';
  } else {
    const intro = { item:'introItem', city:'introCity', style:'introStyle' }[shopCat];
    h = (festActive() ? `<button class="card fest-banner press" data-fest="1" style="margin:0 0 12px"><span class="fb-ic">${icon('lotus')}</span><span class="tx"><b>${t('festName')}</b><span>${t('festShopSub')}</span></span><span class="lotus-pill">${icon('lotus')}${lotusLeft()}</span></button>` : '') + `<p class="shop-note">${t(intro)}${shopCat==='style' && !(S.gacha.buddy && S.gacha.owned[S.gacha.buddy]) ? ' '+t('needBuddy') : ''}</p><div class="shop-grid">${SHOP_ITEMS.filter(i=>i.cat===shopCat || (i.showIn===shopCat && S.shop.owned[i.id])).map(shopCard).join('')}</div>`;
  }
  $('shopBody').innerHTML = h;
}
function openShop(){
  renderShop(); $('shop').classList.add('open'); $('shop').scrollTop=0; document.body.style.overflow='hidden';
  if(HAS_GSAP) gsap.fromTo('#shop .shop-in',{y:40,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out',clearProps:'transform,opacity'});
}
function closeShop(){ $('shop').classList.remove('open'); document.body.style.overflow=''; }
function buyItem(id){
  const price=itemPrice(id);
  if(!price || coinsLeft()<price){ toast(t('notEnough')); return; }
  let name;
  if(id.startsWith('char:')){
    const ch=CHAR_BY_ID[id.slice(5)]; if(S.gacha.owned[ch.id]) return;
    S.gacha.owned[ch.id]=1; name=ch.name[lang];
  } else {
    const it=SHOP_BY_ID[id]; name=t('si_'+id);
    if(it.kind==='use') it.grant();
    if((it.kind==='fx' || it.kind==='wear') && S.shop.owned[id]) return;
  }
  S.shop.owned[id]=(S.shop.owned[id]||0)+1;
  const it=SHOP_BY_ID[id];
  if(it?.kind==='fx') S.shop.equip.fx[id]=1;          // put new things on right away
  if(it?.kind==='wear') S.shop.equip[it.slot]=id;
  checkBadges(); save(); renderAll(); renderShop();
  pop($('shopCoins').parentElement); celebrate(.6); toast(t('bought',{name}));
}
function toggleUse(id){
  const it=SHOP_BY_ID[id]; if(!it || !S.shop.owned[id]) return;
  if(it.kind==='fx'){ if(S.shop.equip.fx[id]) delete S.shop.equip.fx[id]; else S.shop.equip.fx[id]=1; }
  else if(it.kind==='krathong') S.shop.equip.krathong = id;
  else S.shop.equip[it.slot] = S.shop.equip[it.slot]===id ? '' : id;
  save(); renderAll(); renderShop();
}
$('shopBody').addEventListener('click', e=>{ if(e.target.closest('[data-fest]')){ closeShop(); openFest(); } });
$('shopCats').onclick = e=>{ const b=e.target.closest('[data-cat]'); if(b){ shopCat=b.dataset.cat; renderShop(); } };
/* buying takes two taps: the first turns the price into "confirm" for 3 seconds */
$('shopBody').onclick = e=>{
  const u=e.target.closest('[data-use]'); if(u){ toggleUse(u.dataset.use); return; }
  const b=e.target.closest('[data-buy]'); if(!b) return;
  const price=Number(b.dataset.price);
  if(coinsLeft()<price){ toast(t('notEnough')); return; }
  if(!b.classList.contains('confirm')){
    document.querySelectorAll('#shopBody .si-buy.confirm').forEach(x=>{ x.classList.remove('confirm'); x.innerHTML=x.dataset.label; });
    b.dataset.label=b.innerHTML; b.classList.add('confirm'); b.textContent=t('buyConfirm',{n:price});
    clearTimeout(b._t); b._t=setTimeout(()=>{ if(b.isConnected){ b.classList.remove('confirm'); b.innerHTML=b.dataset.label; } }, 3000);
    return;
  }
  buyItem(b.dataset.buy);
};
$('shopBtn').onclick = openShop;
$('shopClose').onclick = closeShop;
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('shop').classList.contains('open')) closeShop(); });

/* ---------- festivals ----------
   One festival at a time. It runs on its own currency (lotus) earned mostly by fasting, so the
   event rewards the habit the app is for. Leftover lotus turn into coins when it ends. */
const FEST = { id:'lk26', start:'2026-11-20', end:'2026-11-30', peak:'2026-11-24', rate:5 };
const FEST_CHAR = { id:'krathong', price:80 };
const festActive = () => { const k=nightKey(); return k>=FEST.start && k<=FEST.end; };
const festOver = () => nightKey() > FEST.end;
const inFest = k => k>=FEST.start && k<=FEST.end;
const festFloats = () => Object.keys(S.fest.floats).filter(inFest).sort();
const festOk = () => Object.keys(S.log).filter(k=>inFest(k) && S.log[k]==='ok').length;
const festSos = () => S.sessions.filter(x=>inFest(nightKey(new Date(x.t)))).length;
const FEST_QUESTS = [
  { id:'e:lk26:float1', ic:'sparkles',     k:'fq_float1', goal:1, val:()=>festFloats().length, lotus:5 },
  { id:'e:lk26:sos',    ic:'shield-check', k:'fq_sos',    goal:1, val:festSos,                lotus:8 },
  { id:'e:lk26:fast3',  ic:'moon-star',    k:'fq_fast3',  goal:3, val:festOk,                 lotus:15 },
  { id:'e:lk26:peak',   ic:'moon-star',    k:'fq_peak',   goal:1, val:()=>S.log[FEST.peak]==='ok'?1:0, lotus:25 },
  { id:'e:lk26:float5', ic:'sparkles',     k:'fq_float5', goal:5, val:()=>festFloats().length, lotus:20 },
];
function lotusEarned(){
  let n=0;
  Object.keys(S.log).forEach(k=>{ if(inFest(k)) n += S.log[k]==='ok' ? 5 : S.log[k]==='light' ? 2 : 0; });
  n += festFloats().length;
  FEST_QUESTS.forEach(q=>{ if(S.quests.claimed[q.id]) n += q.lotus; });
  return n;
}
const lotusSpent = () => Object.keys(S.shop.owned).reduce((a,id)=>a + (SHOP_BY_ID[id]?.lotus ? SHOP_BY_ID[id].price : id==='fchar:'+FEST_CHAR.id ? FEST_CHAR.price : 0), 0);
const lotusLeft = () => Math.max(0, lotusEarned() - lotusSpent());
const festReady = () => FEST_QUESTS.filter(q=>q.val()>=q.goal && !S.quests.claimed[q.id]).length;
function festDaysLeft(){ return Math.round((fromKey(FEST.end) - fromKey(nightKey()))/864e5); }

/* krathong designs, drawn with the waterline at y=0 */
function krathongArt(d){
  const candle = `<circle class="fglow" cy="-23" r="6" fill="#ffd36b" opacity=".35"/><rect x="-1.7" y="-19" width="3.4" height="9" rx="1" fill="#fff3d6"/><path class="flame" d="M0 -25.5 q2.8 3.6 0 6 q-2.8 -2.4 0 -6z" fill="#ffb84d"/><path d="M-5 -10 l-2 -9 M5 -10 l2 -9" stroke="#8a5a2b" stroke-width=".8"/><circle cx="-7" cy="-19" r=".9" fill="#ff4d4d"/><circle cx="7" cy="-19" r=".9" fill="#ff4d4d"/>`;
  const base = {
    kt_leaf:  `<path d="M-14 -5 l2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 2.4 6 2.4 -6 1.4 6z" fill="#5cb85c"/><path d="M-16 0 q16 5 32 0 l-3 -5 h-26z" fill="#3f8f3f"/><circle cx="-8" cy="-10" r="2.6" fill="#ff8fb8"/><circle cx="8" cy="-10" r="2.6" fill="#ffd36b"/>`,
    kt_bread: `<path d="M-15 0 q15 5 30 0 l-2 -7 q-13 -3.5 -26 0z" fill="#d9a15a"/><path d="M-11 -6 q11 -3 22 0" stroke="#f3cf95" stroke-width="2" fill="none"/><circle cx="-7" cy="-9" r="2.3" fill="#ff8fb8"/><circle cx="7" cy="-9" r="2.3" fill="#fff"/><path d="M19 3 q3.5 -2.4 7 0 q-3.5 2.4 -7 0z M26 3 l2.4 -1.8 v3.6z" fill="#ff9a3c"/>`,
    kt_coco:  `<path d="M-15 -4 a15 9 0 0 0 30 0z" fill="#7a4b2a"/><ellipse cy="-4" rx="15" ry="2.4" fill="#f4ead6"/><circle cx="-7" cy="-8" r="2.5" fill="#ff5a8a"/><circle cx="7" cy="-8" r="2.5" fill="#ffd36b"/>`,
    kt_lotus: `<path d="M-16 0 q16 4 32 0 l-2 -3 h-28z" fill="#d99a00"/><path d="M-14 -3 q-4 -8 2.5 -12.5 q2.5 7 1.5 12.5z M14 -3 q4 -8 -2.5 -12.5 q-2.5 7 -1.5 12.5z M-7 -3 q-2.5 -10 7 -16 q9.5 6 7 16z" fill="#ffd34d" stroke="#ff8fb8" stroke-width=".9"/>`,
    kt_moonie:`<path d="M-15 0 q15 5 30 0 l-2 -5 h-26z" fill="#3f8f3f"/><circle cy="-11" r="9" fill="#ffd98f" stroke="#e39a33" stroke-width="1"/><ellipse cx="-3.2" cy="-12" rx="1.3" ry="1.7" fill="#2b1d16"/><ellipse cx="3.2" cy="-12" rx="1.3" ry="1.7" fill="#2b1d16"/><path d="M-2.2 -8.4 q2.2 2 4.4 0" stroke="#2b1d16" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="-9" rx="1.8" ry="1" fill="#ff8a7a" opacity=".6"/><ellipse cx="6" cy="-9" rx="1.8" ry="1" fill="#ff8a7a" opacity=".6"/>`,
  }[d] || '';
  return `<g>${base}${d==='kt_moonie' ? `<g transform="translate(0 -7)">${candle}</g>` : candle}</g>`;
}
const ktSVG = (d, h=44) => `<svg viewBox="-22 -32 48 38" style="height:${h}px" aria-hidden="true">${krathongArt(d)}</svg>`;
let riverNew = '';
function renderRiver(){
  const fl = festFloats(), n = fl.length;
  $('riverKt').innerHTML = fl.map((k,i)=>{
    const x = n===1 ? 160 : Math.round(24 + i*(272/(n-1))), y = 33 + (i%2)*4, f=S.fest.floats[k];
    return `<g transform="translate(${x} ${y}) scale(.72)"><g class="${k===riverNew ? 'kt-enter' : ''}"><g class="kt-bob" style="animation-delay:-${(i*.7).toFixed(1)}s">${krathongArt(f.d)}</g></g></g>`;
  }).join('');
  riverNew = '';
}
function renderFest(){
  const on = festActive();
  $('festBanner').hidden = $('river').hidden = !on;
  if(!on) return;
  renderRiver();
  const days = festDaysLeft(), floated = !!S.fest.floats[nightKey()], ready = festReady();
  $('fbTitle').textContent = t('festName');
  $('fbSub').textContent = [floated ? t('fbDone') : t('fbFloat'), ready ? t('fbReady',{n:ready}) : '', days ? t('festLeft',{n:days}) : t('festLast')].filter(Boolean).join(' · ');
  $('fbLotus').textContent = lotusLeft();
  if($('festSheet').classList.contains('open')) renderFestSheet();
}
let ktChoice = '';
function festItemCard(it){
  const name=t('si_'+it.id), owned=!!S.shop.owned[it.id];
  let art;
  if(it.kind==='krathong') art = `<div class="si-art kt">${ktSVG(it.id, 70)}</div>`;
  else art = itemArt({...it, cat: it.showIn});
  let btn;
  if(owned){
    const on = it.kind==='krathong' ? S.shop.equip.krathong===it.id : it.kind==='fx' ? !!S.shop.equip.fx[it.id] : S.shop.equip[it.slot]===it.id;
    btn = `<button class="si-buy press ${on?'on':'use'}" data-use="${it.id}">${on ? icon('check')+t('inUse') : t('useIt')}</button>`;
  } else btn = `<button class="si-buy lotus press ${lotusLeft()<it.price?'poor':''}" data-fbuy="${it.id}" data-price="${it.price}">${icon('lotus')}${it.price}</button>`;
  return `<div class="card sitem">${art}<b>${name}</b><span class="si-desc">${t('sd_'+it.id)}</span>${btn}</div>`;
}
function renderFestSheet(){
  const k = nightKey(), f = S.fest.floats[k], days = festDaysLeft(), left = lotusLeft();
  const owned = ['kt_leaf', ...SHOP_ITEMS.filter(i=>i.kind==='krathong' && S.shop.owned[i.id]).map(i=>i.id)];
  if(!owned.includes(ktChoice)) ktChoice = owned.includes(S.shop.equip.krathong) ? S.shop.equip.krathong : 'kt_leaf';
  const ch = CHAR_BY_ID[FEST_CHAR.id], haveCh = !!S.gacha.owned[ch.id];
  const floatSec = f
    ? `<div class="fs-done">${ktSVG(f.d)}<div><b>${t('floatedTonight')}</b><span>${f.w ? '“'+escHTML(f.w)+'”' : t('floatNoWish')}</span></div></div>`
    : `<div class="kt-pick" id="ktPick">${owned.map(d=>`<button class="press ${d===ktChoice?'sel':''}" data-kt="${d}">${ktSVG(d)}${t('si_'+d)}</button>`).join('')}</div>
       <input class="fs-wish" id="fsWish" maxlength="40" placeholder="${t('floatWish')}" autocomplete="off">
       <button class="fs-float press" id="fsFloat">${icon('sparkles')}${t('floatBtn')} <span style="opacity:.8">+1</span>${icon('lotus')}</button>`;
  const quests = FEST_QUESTS.map(q=>{ const cur=Math.min(q.val(), q.goal), done=!!S.quests.claimed[q.id], ready=cur>=q.goal && !done;
    return `<div class="cs-row fs-q"><div class="ic">${icon(q.ic)}</div><div class="t"><b>${t(q.k)}</b><span><span class="rw l">${icon('lotus')}${q.lotus}</span> · ${cur}/${q.goal}</span></div>${done ? `<span class="q-done">${icon('check')}${t('claimed')}</span>` : `<button class="q-claim press" data-fq="${q.id}" ${ready?'':'disabled'}>${t('claim')}</button>`}</div>`; }).join('');
  const chCard = `<div class="card sitem"><div class="si-art chr">${miniCardHTML(ch,{})}</div><b>${escHTML(ch.name[lang])}</b><span class="si-desc">${t('sd_fchar')}</span>${haveCh ? `<button class="si-buy" disabled>${icon('check')}${t('ownedIt')}</button>` : `<button class="si-buy lotus press ${left<FEST_CHAR.price?'poor':''}" data-fbuy="fchar:${ch.id}" data-price="${FEST_CHAR.price}">${icon('lotus')}${FEST_CHAR.price}</button>`}</div>`;
  $('fsBody').innerHTML = `
    <div class="fs-hero"><span class="left">${days ? t('festLeft',{n:days}) : t('festLast')}</span><div class="k">${t('festKicker')}</div><h3 id="fsH">${t('festName')}</h3><div class="sub">${t('festPeak')}</div>
      <svg viewBox="0 0 320 70" aria-hidden="true"><circle cx="252" cy="22" r="13" fill="#ffe9a8"/><circle cx="252" cy="22" r="22" fill="#ffe9a8" opacity=".15"/><rect y="42" width="320" height="28" fill="#122042"/><g class="moonref"><ellipse cx="252" cy="49" rx="12" ry="2.2"/><ellipse cx="250" cy="56" rx="7" ry="1.6"/></g>
        <g transform="translate(70 58) scale(.8)"><g class="kt-bob">${krathongArt('kt_leaf')}</g></g><g transform="translate(140 62) scale(.6)"><g class="kt-bob" style="animation-delay:-1s">${krathongArt('kt_lotus')}</g></g><g transform="translate(196 57) scale(.7)"><g class="kt-bob" style="animation-delay:-2s">${krathongArt('kt_coco')}</g></g></svg></div>
    <div class="fs-wallet"><div class="ic">${icon('lotus')}</div><div><b class="num">${left}</b><span>${t('lotus')} · ${t('lotusHow')}</span></div></div>
    <div class="rd-h">${t('floatTitle')}</div>${floatSec}
    <div class="rd-h">${t('festQuests')}</div><div class="cs-list">${quests}</div>
    <div class="rd-h">${t('festShop')}<span>${t('festShopSub')}</span></div>
    <div class="shop-grid">${chCard}${SHOP_ITEMS.filter(i=>i.cat==='fest').map(festItemCard).join('')}</div>
    <p class="cs-note">${t('festNote')}</p>`;
}
function openFest(){ ktChoice=''; renderFestSheet(); openModal('festSheet'); }
function floatKrathong(){
  const k=nightKey(); if(!festActive() || S.fest.floats[k]) return;
  S.fest.floats[k] = { d:ktChoice || 'kt_leaf', w:($('fsWish')?.value||'').trim().slice(0,40), t:Date.now() };
  riverNew = k; checkBadges(); save(); closeModal('festSheet');
  showTab('home'); renderAll();
  setTimeout(()=>{ $('river').scrollIntoView({behavior:REDUCE?'auto':'smooth', block:'center'}); }, 350);
  toast(t('floated')); celebrate(.9);
}
function buyFest(id){
  if(!festActive()) return;
  const isChar = id.startsWith('fchar:'), it = SHOP_BY_ID[id], price = isChar ? FEST_CHAR.price : it?.price;
  if(!price || S.shop.owned[id]) return;
  if(lotusLeft() < price){ toast(t('notEnoughLotus')); return; }
  S.shop.owned[id] = 1;
  if(isChar) S.gacha.owned[id.slice(6)] = 1;
  else if(it.kind==='fx') S.shop.equip.fx[id] = 1;
  else if(it.kind==='wear') S.shop.equip[it.slot] = id;
  else if(it.kind==='krathong'){ S.shop.equip.krathong = id; ktChoice = id; }
  checkBadges(); save(); renderAll(); renderFestSheet();
  celebrate(.6); toast(t('bought',{name: isChar ? CHAR_BY_ID[id.slice(6)].name[lang] : t('si_'+id)}));
}
$('fsBody').addEventListener('click', e=>{
  const kt=e.target.closest('[data-kt]'); if(kt){ ktChoice=kt.dataset.kt; $('ktPick').querySelectorAll('button').forEach(b=>b.classList.toggle('sel', b===kt)); return; }
  if(e.target.closest('#fsFloat')){ floatKrathong(); return; }
  const q=e.target.closest('[data-fq]'); if(q && !q.disabled){ S.quests.claimed[q.dataset.fq]=true; save(); renderAll(); renderFestSheet(); celebrate(.5); toast(t('claimedLotus',{n:FEST_QUESTS.find(x=>x.id===q.dataset.fq).lotus})); return; }
  const u=e.target.closest('[data-use]'); if(u){ toggleUse(u.dataset.use); renderFestSheet(); return; }
  const b=e.target.closest('[data-fbuy]'); if(!b) return;
  const price=Number(b.dataset.price);
  if(lotusLeft()<price){ toast(t('notEnoughLotus')); return; }
  if(!b.classList.contains('confirm')){   // two taps to buy, like the shop
    $('fsBody').querySelectorAll('.si-buy.confirm').forEach(x=>{ x.classList.remove('confirm'); x.innerHTML=x.dataset.label; });
    b.dataset.label=b.innerHTML; b.classList.add('confirm'); b.textContent=t('buyConfirm',{n:price});
    clearTimeout(b._t); b._t=setTimeout(()=>{ if(b.isConnected){ b.classList.remove('confirm'); b.innerHTML=b.dataset.label; } }, 3000);
    return;
  }
  buyFest(b.dataset.fbuy);
});
$('festBanner').onclick = openFest;
$('fsClose').onclick = $('festBg').onclick = ()=>closeModal('festSheet');

/* ---------- render: progress ---------- */
let calMonth = (()=>{ const d=fromKey(nightKey()); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let weekChart=null, saveChart=null;
function destroyCharts(){ weekChart?.destroy(); saveChart?.destroy(); weekChart=saveChart=null; }

function renderProgress(){
  const tn=fromKey(nightKey()), y=tn.getFullYear(), m=tn.getMonth();
  const entries = Object.entries(S.log).filter(([k])=>{ const d=fromKey(k); return d.getFullYear()===y && d.getMonth()===m; });
  const good = entries.filter(([,s])=>s==='ok'||s==='light').length;
  countTo($('pmNights'), entries.filter(([,s])=>s==='ok').length, undefined, 'nights');
  if(entries.length) countTo($('pmRate'), Math.round(good/entries.length*100), v=>Math.round(v)+'%');
  else { $('pmRate').textContent='–'; delete $('pmRate').dataset.v; }
  countTo($('pmSaved'), entries.reduce((a,[,s])=>a+nightSaving(s),0), baht);
  if(tab==='progress') renderCharts(tn);
  renderCal(); renderFeed();
}

function gradFill(ctx, area, a, b){ const g=ctx.createLinearGradient(0,area.bottom,0,area.top); g.addColorStop(0,a); g.addColorStop(1,b); return g; }

function renderCharts(tonight){
  if(!window.Chart) return;
  const th = { muted:cssVar('--muted'), line:cssVar('--line'), light:cssVar('--light'), card:cssVar('--card'), ink:cssVar('--ink') };
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Inter","IBM Plex Sans Thai",sans-serif';
  Chart.defaults.color = th.muted;
  const tooltip = { backgroundColor:th.ink, titleColor:th.card, bodyColor:th.card, padding:10, cornerRadius:10, displayColors:false };

  // weekly bars (last 8 weeks)
  const mon=mondayOf(tonight), labels=[], ok=[], li=[];
  for(let w=7; w>=0; w--){
    const ws=addDays(mon,-7*w); let o=0, l=0;
    for(let i=0;i<7;i++){ const s=S.log[keyOf(addDays(ws,i))]; if(s==='ok') o++; else if(s==='light') l++; }
    labels.push(w===0 ? t('thisWk') : fmtDate(ws)); ok.push(o); li.push(l);
  }
  const avg = Math.round(ok.slice(4).reduce((a,b)=>a+b,0)/4*10)/10;
  countTo($('weekAvg'), avg, v=>(Math.round(v*10)/10).toLocaleString(L().locale,{minimumFractionDigits:1,maximumFractionDigits:1}), 'perWk');
  if(weekChart){ weekChart.data.labels=labels; weekChart.data.datasets[0].data=ok; weekChart.data.datasets[1].data=li; weekChart.update(); }
  else weekChart = new Chart($('weekChart'), {
    type:'bar',
    data:{ labels, datasets:[
      { label:t('stOk'), data:ok, borderRadius:7, borderSkipped:false, barPercentage:.58, categoryPercentage:.9,
        backgroundColor:c=>{ const {ctx,chartArea}=c.chart; return chartArea ? gradFill(ctx,chartArea,'#ff3d00','#ff9a62') : '#ff5a1f'; } },
      { label:t('stLight'), data:li, borderRadius:7, borderSkipped:false, barPercentage:.58, categoryPercentage:.9, backgroundColor:th.light },
    ]},
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:REDUCE?0:900, easing:'easeOutQuart'},
      plugins:{ legend:{display:false}, tooltip },
      scales:{ x:{ stacked:true, grid:{display:false}, border:{display:false}, ticks:{font:{size:10}, maxRotation:0, autoSkip:true, maxTicksLimit:5} },
               y:{ stacked:true, min:0, max:7, ticks:{stepSize:7, font:{size:10}}, grid:{color:th.line}, border:{display:false} } } }
  });

  // cumulative savings, last 30 days
  const sLabels=[], sData=[], keys=Object.keys(S.log).sort(), start=addDays(tonight,-29);
  let run=0, ki=0;
  while(ki<keys.length && keys[ki]<keyOf(start)){ run+=nightSaving(S.log[keys[ki]]); ki++; }
  for(let i=0;i<30;i++){
    const d=addDays(start,i), k=keyOf(d);
    while(ki<keys.length && keys[ki]<=k){ run+=nightSaving(S.log[keys[ki]]); ki++; }
    sLabels.push(fmtDate(d)); sData.push(run);
  }
  countTo($('saveTotal'), saved(), baht);
  if(saveChart){ saveChart.data.labels=sLabels; saveChart.data.datasets[0].data=sData; saveChart.update(); }
  else saveChart = new Chart($('saveChart'), {
    type:'line',
    data:{ labels:sLabels, datasets:[{ data:sData, borderColor:'#ff5a1f', borderWidth:2.5, tension:.38, pointRadius:0, pointHoverRadius:5,
      pointHoverBackgroundColor:'#ff5a1f', pointHoverBorderColor:'#fff', pointHoverBorderWidth:2, fill:true,
      backgroundColor:c=>{ const {ctx,chartArea}=c.chart; return chartArea ? gradFill(ctx,chartArea,'rgba(255,90,31,0)','rgba(255,90,31,.28)') : 'rgba(255,90,31,.15)'; } }]},
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:REDUCE?0:1100, easing:'easeOutQuart'},
      interaction:{mode:'index', intersect:false},
      plugins:{ legend:{display:false}, tooltip:{...tooltip, callbacks:{label:c=>baht(c.parsed.y)}} },
      scales:{ x:{ grid:{display:false}, border:{display:false}, ticks:{font:{size:10}, maxRotation:0, maxTicksLimit:4} },
               y:{ beginAtZero:true, suggestedMax:Math.max(100, Number(S.settings.cost||0)*4), ticks:{font:{size:10}, maxTicksLimit:4, precision:0, callback:v=>'฿'+Number(v).toLocaleString(L().locale)}, grid:{color:th.line}, border:{display:false} } } }
  });
}

function renderCal(){
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  $('calTitle').textContent = L().monthYear(m,y,L());
  const tonight=fromKey(nightKey()), first=new Date(y,m,1,12), days=new Date(y,m+1,0).getDate();
  const lead=(first.getDay()+6)%7;
  const cal=$('cal'); cal.innerHTML = L().weekHead.map(d=>`<div class="wd">${d}</div>`).join('') + '<div class="blank"></div>'.repeat(lead);
  for(let i=1;i<=days;i++){
    const d=new Date(y,m,i,12), k=keyOf(d), s=S.log[k], future=d>tonight;
    const b=document.createElement('div');
    b.innerHTML = `<button class="dotday press ${s||''} ${k===keyOf(tonight)?'today':''} ${future?'future':''}" ${future?'disabled':''} aria-label="${fmtDate(d)}">${i}</button>`;
    if(!future) b.firstChild.onclick = ()=>openSheet(k);
    cal.appendChild(b);
  }
  const nextMonth = new Date(y,m+1,1);
  $('calNext').disabled = nextMonth > tonight; $('calNext').style.opacity = nextMonth > tonight ? .3 : 1;
}

function renderFeed(){
  const keys = Object.keys(S.log).sort().reverse().slice(0,12);
  if(!keys.length){ $('feed').innerHTML = `<div class="empty">${t('empty')}</div>`; return; }
  const T = { ok:'feedOk', light:'feedLight', miss:'feedMiss' };
  const I = { ok:'check', light:'coffee', miss:'utensils-crossed' };
  $('feed').innerHTML = keys.map(k=>{
    const s=S.log[k], d=fromKey(k);
    const fights = S.sessions.filter(x=>nightKey(new Date(x.t))===k).length;
    const sub = `${L().daysShort[d.getDay()]} ${fmtDate(d)}` + (s==='ok'?` · ${fastHours()}`:'') + (fights?` · ${t('feedFights',{n:fights})}`:'');
    const r = nightSaving(s) ? '+'+baht(nightSaving(s)) : '';
    return `<div class="row"><div class="ic ${s}">${icon(I[s])}</div><div class="t"><b>${t(T[s])}</b><span>${sub}</span></div><div class="r num">${r}</div></div>`;
  }).join('');
}

/* ---------- action sheet ---------- */
let sheetKey=null;
function openSheet(k){
  sheetKey=k; const d=fromKey(k);
  $('sheetTitle').textContent = `${L().days[d.getDay()]} · ${fmtDate(d)}`;
  document.querySelectorAll('#sheet [data-s]').forEach(b=>b.classList.toggle('cur', !!b.dataset.s && b.dataset.s===S.log[k]));
  $('sheetClear').style.display = S.log[k] ? '' : 'none';
  $('sheet').classList.add('open');
  if(HAS_GSAP){ gsap.fromTo('#sheetBg',{opacity:0},{opacity:1,duration:.25}); gsap.fromTo('#sheetPanel',{y:'110%'},{y:0,duration:.45,ease:'power4.out'}); }
}
function closeSheet(){
  if(!HAS_GSAP){ $('sheet').classList.remove('open'); return; }
  gsap.to('#sheetBg',{opacity:0,duration:.2});
  gsap.to('#sheetPanel',{y:'110%',duration:.3,ease:'power3.in',onComplete:()=>$('sheet').classList.remove('open')});
}
document.querySelectorAll('#sheet [data-s]').forEach(b=>b.onclick=()=>{
  const s=b.dataset.s||undefined, k=sheetKey; closeSheet();
  if(S.log[k]!==s){ setStatus(k,s); if(s==='ok') celebrate(.5); }
});
$('sheetBg').onclick = closeSheet; $('sheetCancel').onclick = closeSheet;

/* ---------- render: profile ---------- */
function renderProfile(){
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

function renderAll(){ renderHome(); renderRun(); renderProgress(); renderProfile(); renderRewards(); renderAccount(); }

/* ---------- tabs & nav ---------- */
let tab='home';
function showTab(name){
  const changed = name!==tab; tab=name;
  document.querySelectorAll('.tab').forEach(s=>s.hidden = s.id!=='tab-'+name);
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===name));
  $('navTitle').textContent = t($('tab-'+name).dataset.title);
  window.scrollTo(0,0); onScroll();
  if(name==='progress') renderCharts(fromKey(nightKey()));
  if(changed) animateIn($('tab-'+name));
}
document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('miniAvatar').onclick = ()=>showTab('profile');
function onScroll(){ $('nav').classList.toggle('show', window.scrollY>48); }
window.addEventListener('scroll', onScroll, {passive:true});

/* ---------- events ---------- */
$('langBtn').onclick = ()=>setLang(lang==='th' ? 'en' : 'th');
document.querySelectorAll('#langSeg button').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));

document.querySelectorAll('#seg button').forEach(b=>b.onclick=()=>{
  const tg=checkinTarget(); if(!tg.open) return;
  const s=b.dataset.s; if(S.log[tg.key]===s) return;
  setStatus(tg.key,s);
  if(s==='ok'){ celebrate(); toast(t('toastOk',{xp:XP_VAL.ok})); }
  else toast(s==='light' ? t('toastLight',{xp:XP_VAL.light}) : t('toastMiss'));
});
$('calPrev').onclick=()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1); renderCal(); };
$('calNext').onclick=()=>{ calMonth=new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1); renderCal(); };

function bindSetting(id, apply){
  $(id).addEventListener('change', ()=>{ if(apply($(id).value)!==false){ save(); renderAll(); toast(t('settingsSaved')); } else renderProfile(); });
}
bindSetting('fName', v=>{ S.settings.name=v.trim(); });
bindSetting('fCut', v=>{ if(!v||v<=S.settings.breakfast){ toast(t('errCut')); return false; } S.settings.cutoff=v; });
bindSetting('fBreak', v=>{ if(!v||v>=S.settings.cutoff){ toast(t('errBreak')); return false; } S.settings.breakfast=v; });
bindSetting('fCost', v=>{ S.settings.cost=Math.max(0,Number(v)||0); });
bindSetting('fWeight', v=>{ const n=Number(v); if(!(n>=25 && n<=250)){ toast(t('errWeight')); return false; } S.settings.weight=Math.round(n*10)/10; });
$('resetAll').onclick=()=>{ if(confirm(t('resetConfirm'))){ const l=lang; S=blank(); S.settings.lang=l; S.epoch=Date.now(); save(); destroyCharts(); renderAll(); toast(t('resetDone')); } };

try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ destroyCharts(); renderAll(); }); }catch(e){}

/* ---------- SOS ---------- */
let sos = null, sosTimer = null, missionIdx = -1;
function showMission(){ $('mText').textContent = L().missionList[missionIdx] || ''; }
function newMission(){
  const n = L().missionList.length; let i;
  do{ i=Math.floor(Math.random()*n); }while(n>1 && i===missionIdx);
  missionIdx=i; showMission(); $('mDone').disabled=false; $('mDoneText').textContent=t('mDone');
  if(HAS_GSAP) gsap.fromTo('#mText',{opacity:0,y:8},{opacity:1,y:0,duration:.35,ease:'power2.out'});
}
function tickSOS(){
  const el=Date.now()-sos.start, left=WAVE_MS-el;
  $('sosClock').textContent = left>0 ? mmss(left+999) : mmss(el);
  $('sosCue').textContent = (el/1000)%10 < 4 ? t('breatheIn') : t('breatheOut');
  $('sosSub').textContent = left>0 ? t('sosSub') : t('sosSubDone');
  $('cdArc').style.strokeDashoffset = CD_C*(1-Math.max(0,left)/WAVE_MS);
}
$('sosBtn').onclick = ()=>{
  sos = { start:Date.now(), missions:0, xp:0 };
  newMission();
  const br=$('breath'); br.classList.remove('go'); void br.offsetWidth; br.classList.add('go');
  $('sos').classList.remove('done'); $('sos').classList.add('open');
  document.body.style.overflow='hidden';
  tickSOS(); clearInterval(sosTimer); sosTimer=setInterval(tickSOS,250);
  if(HAS_GSAP){
    gsap.fromTo('#sos',{opacity:0},{opacity:1,duration:.3});
    gsap.fromTo('#sos .run > *',{opacity:0,y:24},{opacity:1,y:0,duration:.6,stagger:.07,ease:'power3.out',clearProps:'transform,opacity'});
  }
};
function closeSOS(){
  clearInterval(sosTimer);
  const done=()=>{ $('sos').classList.remove('open'); document.body.style.overflow=''; renderAll(); };
  if(HAS_GSAP) gsap.to('#sos',{opacity:0,duration:.25,onComplete:()=>{ done(); gsap.set('#sos',{clearProps:'opacity'}); }}); else done();
}
$('sosClose').onclick = closeSOS;
$('mShuffle').onclick = newMission;
$('mDone').onclick = ()=>{
  S.challenges++; gainXP(10); sos.missions++; sos.xp+=10; checkBadges(); save();
  $('mDone').disabled=true; $('mDoneText').textContent=t('mDoneOk');
  pop($('mDone'));
  setTimeout(newMission, 900);
};
$('sosFinish').onclick = ()=>{
  clearInterval(sosTimer);
  const dur = Date.now()-sos.start;
  S.cravings++; S.sessions.push({ t:Date.now(), d:Math.round(dur/1000) }); if(S.sessions.length>300) S.sessions.shift();
  gainXP(10); sos.xp+=10; checkBadges(); save();
  $('sumTime').textContent = mmss(dur);
  $('sumMissions').textContent = sos.missions;
  $('sumXP').textContent = '+'+sos.xp;
  $('sumMsg').textContent = t('sumMsg',{n:S.cravings}) + ' ' + t('cityFlag');
  $('sos').classList.add('done');
  if(HAS_GSAP){
    gsap.fromTo('#sos .summary .ok',{scale:.2,opacity:0,rotate:-30},{scale:1,opacity:1,rotate:0,duration:.7,ease:'back.out(2.2)'});
    gsap.fromTo('#sos .summary > :not(.ok)',{opacity:0,y:20},{opacity:1,y:0,duration:.5,stagger:.08,delay:.2,ease:'power3.out',clearProps:'transform,opacity'});
  }
  celebrate(1.1);
};
$('sosDone').onclick = closeSOS;

/* ---------- gacha: tiers & characters ---------- */
const TIERS = {
  salt:   { rate:45, shard:1,  stars:1 },
  common: { rate:32, shard:2,  stars:2 },
  rare:   { rate:16, shard:4,  stars:3 },
  sr:     { rate:6,  shard:10, stars:4 },
  legend: { rate:1,  shard:25, stars:5 },
};
const TIER_ORDER = ['salt','common','rare','sr','legend'];
const PITY = 10;
const tierIdx = k => TIER_ORDER.indexOf(k);

const INK = '#2b1d16';
let _faceRec = null;
function F(cx,cy,s=1,e='open',mo='smile'){
  if(_faceRec && !_faceRec.v) _faceRec.v = {cx, cy, s};
  const ex=8.5*s, sw=(2.3*s).toFixed(2), my=cy+6.5*s;
  const P=d=>`<path d="${d}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  let o='';
  if(e==='happy') o+=P(`M${cx-ex-3.4*s} ${cy+s} q${3.4*s} ${-4*s} ${6.8*s} 0 M${cx+ex-3.4*s} ${cy+s} q${3.4*s} ${-4*s} ${6.8*s} 0`);
  else if(e==='sleepy') o+=P(`M${cx-ex-3.4*s} ${cy} q${3.4*s} ${3*s} ${6.8*s} 0 M${cx+ex-3.4*s} ${cy} q${3.4*s} ${3*s} ${6.8*s} 0`);
  else if(e==='flat') o+=P(`M${cx-ex-3*s} ${cy} h${6*s} M${cx+ex-3*s} ${cy} h${6*s}`);
  else o+=`<ellipse cx="${cx-ex}" cy="${cy}" rx="${3*s}" ry="${3.9*s}" fill="${INK}"/><ellipse cx="${cx+ex}" cy="${cy}" rx="${3*s}" ry="${3.9*s}" fill="${INK}"/><circle cx="${cx-ex+1.1*s}" cy="${cy-1.4*s}" r="${1.1*s}" fill="#fff"/><circle cx="${cx+ex+1.1*s}" cy="${cy-1.4*s}" r="${1.1*s}" fill="#fff"/>`;
  o+=`<ellipse cx="${cx-ex-4.5*s}" cy="${cy+5*s}" rx="${3.4*s}" ry="${2.1*s}" fill="#ff8a7a" opacity=".55"/><ellipse cx="${cx+ex+4.5*s}" cy="${cy+5*s}" rx="${3.4*s}" ry="${2.1*s}" fill="#ff8a7a" opacity=".55"/>`;
  if(mo==='smile') o+=P(`M${cx-4*s} ${my} q${4*s} ${4.5*s} ${8*s} 0`);
  else if(mo==='sad') o+=P(`M${cx-4*s} ${my+2.5*s} q${4*s} ${-4*s} ${8*s} 0`);
  else if(mo==='flat') o+=P(`M${cx-3.5*s} ${my+s} h${7*s}`);
  else if(mo==='o') o+=`<ellipse cx="${cx}" cy="${my+s}" rx="${1.9*s}" ry="${2.3*s}" fill="#7a2618"/>`;
  else if(mo==='open') o+=`<path d="M${cx-4.5*s} ${my-s} q${4.5*s} ${7.5*s} ${9*s} 0 z" fill="#7a2618" stroke="${INK}" stroke-width="${(1.2*s).toFixed(2)}" stroke-linejoin="round"/>`;
  return o;
}
function starPath(cx,cy,r){ let d=''; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r; d+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1); } return d+'Z'; }

const CHARS = [
  { id:'salt', tier:'salt', name:{th:'เกลือป่น',en:'Salty'},
    desc:{th:'ออกบ่อยที่สุดในตู้ ใครๆ ก็เรียกว่า "เกลือ" แต่เค็มอย่างมีวินัยนะ',en:'The most common pull of all. Everyone calls it "salty", but it is salty with discipline.'},
    art:()=>`<g fill="#fff" stroke="#c7cad3" stroke-width=".8"><rect x="18" y="22" width="4" height="4" transform="rotate(25 20 24)"/><rect x="78" y="30" width="3.5" height="3.5" transform="rotate(-20 80 32)"/><rect x="24" y="12" width="3" height="3"/><rect x="74" y="16" width="3" height="3" transform="rotate(40 75 17)"/></g>
      <path d="M32 44 q0 -22 18 -22 q18 0 18 22z" fill="#c4c9d2" stroke="#a3a9b5" stroke-width="2"/>
      <circle cx="44" cy="33" r="1.7" fill="#7f8692"/><circle cx="50" cy="29" r="1.7" fill="#7f8692"/><circle cx="56" cy="33" r="1.7" fill="#7f8692"/>
      <rect x="29" y="42" width="42" height="48" rx="12" fill="#f8f8fb" stroke="#c7cad3" stroke-width="2"/>
      <rect x="31" y="44" width="38" height="5" rx="2.5" fill="#e3e5eb"/>
      ${F(50,64,1,'open','sad')}<path d="M69 52 q3 5 0 7 q-3 -2 0 -7z" fill="#8fd0ff"/>` },
  { id:'soy', tier:'salt', name:{th:'ซองซีอิ๊ว',en:'Soy Packet'},
    desc:{th:'ติดมากับกล่องข้าวทุกกล่อง แต่ไม่เคยมีใครแกะใช้',en:'Comes with every takeout box. Nobody ever opens it.'},
    art:()=>`<path d="M24 28 l5.2 -4 5.2 4 5.2 -4 5.2 4 5.2 -4 5.2 4 5.2 -4 5.2 4 5.2 -4 5.2 4 V82 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6z" fill="#6b4330" stroke="#4a2c1f" stroke-width="2" stroke-linejoin="round"/>
      <rect x="31" y="40" width="38" height="32" rx="7" fill="#f3dfbf"/>
      <text x="50" y="83" text-anchor="middle" font-size="6.5" font-weight="800" fill="#f3dfbf" font-family="sans-serif">SOY</text>
      ${F(50,54,.85,'flat','flat')}` },
  { id:'pick', tier:'salt', name:{th:'ไม้จิ้มฟัน',en:'Toothpick'},
    desc:{th:'ผอมเพรียวที่สุดในแก๊ง เพราะไม่เคยกินมื้อเย็นเลยสักครั้ง',en:'The slimmest of the gang — never had dinner in its life.'},
    art:()=>`<path d="M50 4 L56 20 V80 L50 96 L44 80 V20 Z" fill="#ecc994" stroke="#c39a5f" stroke-width="2" stroke-linejoin="round"/>
      <path d="M47 26 V74" stroke="#f6dcb2" stroke-width="2" stroke-linecap="round"/>${F(50,48,.5,'open','smile')}` },
  { id:'tissue', tier:'salt', name:{th:'ทิชชู่',en:'Tissue'},
    desc:{th:'พร้อมซับน้ำตาเวลาเผลอดูคลิปรีวิวอาหารตอนดึก',en:'Here to wipe your tears when food reviews pop up at midnight.'},
    art:()=>`<path d="M22 42 q6 -18 28 -12 q22 -8 28 12 l-5 44 q-23 8 -46 0z" fill="#fff" stroke="#d3d6de" stroke-width="2" stroke-linejoin="round"/>
      <path d="M34 34 q16 12 32 -2" stroke="#e7e9ef" stroke-width="2.5" fill="none"/>
      ${F(52,60,1,'sleepy','o')}<path d="M40 66 q2.5 4 0 6 q-2.5 -2 0 -6z" fill="#8fd0ff"/>` },
  { id:'spoon', tier:'salt', name:{th:'ช้อนพลาสติก',en:'Plastic Spoon'},
    desc:{th:'ร่างกายใช้ครั้งเดียวทิ้ง แต่ใจสู้ไม่เคยทิ้ง',en:'Single-use body, reusable fighting spirit.'},
    art:()=>`<rect x="45" y="52" width="10" height="42" rx="5" fill="#f5f5f8" stroke="#cfd2da" stroke-width="2"/>
      <ellipse cx="50" cy="34" rx="21" ry="25" fill="#f5f5f8" stroke="#cfd2da" stroke-width="2"/>
      <ellipse cx="41" cy="23" rx="4.5" ry="7.5" fill="#fff" transform="rotate(20 41 23)"/>
      ${F(50,36,.9,'open','smile')}<path d="M64 42 l-4 4 3 3" stroke="#cfd2da" stroke-width="1.5" fill="none"/>` },

  { id:'glass', tier:'common', name:{th:'น้องน้ำเปล่า',en:'Glassy'},
    desc:{th:'หิวเมื่อไหร่ ดื่มเราก่อน 1 แก้วนะ',en:'Hungry? Drink me first — one full glass.'},
    art:()=>`<path d="M27 18 H73 L66 90 H34 Z" fill="#eef9ff" stroke="#9fd2f2" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M30.6 44 H69.4 L66 90 H34 Z" fill="#62bdf8"/>
      <path d="M30.6 44 q9.7 -5 19.4 0 t19.4 0 V48 H30.6z" fill="#9fd8ff"/>
      <rect x="35" y="24" width="5" height="56" rx="2.5" fill="#fff" opacity=".6"/>
      <circle cx="59" cy="80" r="2.4" fill="#d6f0ff"/><circle cx="63" cy="72" r="1.6" fill="#d6f0ff"/>${F(51,62,1,'open','smile')}` },
  { id:'tea', tier:'common', name:{th:'ชาอุ่น',en:'Warm Tea'},
    desc:{th:'อุ่นท้อง อุ่นใจ ขอแบบไม่ใส่น้ำตาลนะ',en:'Warms your tummy and your heart. No sugar, please.'},
    art:()=>`<ellipse cx="50" cy="88" rx="36" ry="7" fill="#dcebe1" stroke="#bdd6c5" stroke-width="2"/>
      <path d="M76 52 q15 0 13 13 q-2 10 -15 8" fill="none" stroke="#c7ddcd" stroke-width="5" stroke-linecap="round"/>
      <path d="M22 46 H78 V62 a28 24 0 0 1 -56 0 Z" fill="#fff" stroke="#c7ddcd" stroke-width="2.5"/>
      <ellipse cx="50" cy="46" rx="28" ry="6.5" fill="#a5cc6b" stroke="#c7ddcd" stroke-width="2"/>
      <path d="M40 36 q-6 -7 0 -13 q6 -6 0 -13 M58 38 q-6 -7 0 -13 q6 -6 0 -13" stroke="#d4dad6" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${F(50,63,1,'happy','smile')}` },
  { id:'brush', tier:'common', name:{th:'แปรงจัง',en:'Brushy'},
    desc:{th:'แปรงฟันเสร็จเมื่อไหร่ ครัวก็ปิดตามไปด้วย',en:'Once your teeth are brushed, the kitchen is closed.'},
    art:()=>`<rect x="39" y="36" width="22" height="58" rx="11" fill="#4aa5ff" stroke="#2c83de" stroke-width="2"/>
      <rect x="38" y="8" width="24" height="30" rx="8" fill="#fff" stroke="#cdd3dd" stroke-width="2"/>
      <path d="M43 12 V26 M50 12 V26 M57 12 V26" stroke="#79d0ff" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="33" cy="10" r="3" fill="#fff" stroke="#dbe6f2"/><circle cx="68" cy="14" r="3.5" fill="#fff" stroke="#dbe6f2"/><circle cx="29" cy="20" r="2" fill="#fff" stroke="#dbe6f2"/>
      ${F(50,60,.7,'open','smile')}` },
  { id:'pillow', tier:'common', name:{th:'หมอนนุ่ม',en:'Pillow Pal'},
    desc:{th:'นอนเร็ว = หิวน้อย สูตรลับของคนงดมื้อเย็น',en:'Sleep early, crave less. The secret recipe.'},
    art:()=>`<path d="M14 34 q36 -12 72 0 q7 17 0 34 q-36 12 -72 0 q-7 -17 0 -34z" fill="#efe7ff" stroke="#c6b3f0" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M22 40 q28 -6 56 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      <text x="76" y="24" font-size="13" font-weight="800" fill="#a78bfa" font-family="sans-serif">z</text><text x="86" y="14" font-size="9" font-weight="800" fill="#c4b0fb" font-family="sans-serif">z</text>
      ${F(50,52,1,'sleepy','o')}` },
  { id:'shoe', tier:'common', name:{th:'รองเท้าวิ่ง',en:'Sneaky'},
    desc:{th:'พาไปเดินย่อยเบาๆ 5 นาที ความอยากหายเกลี้ยง',en:'A gentle 5-minute walk and cravings vanish.'},
    art:()=>`<path d="M2 50 h8 M0 58 h6" stroke="#ffb3aa" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12 72 q0 -28 20 -34 l18 -4 q4 12 18 14 l14 4 q12 4 12 16 v4 z" fill="#ff6a5c" stroke="#d9473a" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="10" y="70" width="84" height="12" rx="6" fill="#fff" stroke="#d6d7dd" stroke-width="2"/>
      <path d="M38 42 l8 6 M43 38 l8 6 M48 36 l7 5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M62 62 q10 -2 20 2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>${F(31,58,.75,'open','smile')}` },

  { id:'owl', tier:'rare', name:{th:'นกฮูกยามดึก',en:'Night Owl'},
    desc:{th:'เฝ้าครัวทั้งคืน ใครแอบเปิดตู้เย็น นกฮูกเห็นหมดนะ',en:'Guards the kitchen all night. Opening the fridge? The owl sees you.'},
    art:()=>`<path d="M84 6 a14 14 0 1 0 10 24 a11 11 0 1 1 -10 -24z" fill="#ffe08a"/>
      <path d="M28 34 L30 14 L44 28 Z M72 34 L70 14 L56 28 Z" fill="#5a4a8c" stroke="#3f3270" stroke-width="2" stroke-linejoin="round"/>
      <path d="M22 54 q-8 18 6 30 q4 -14 2 -30z M78 54 q8 18 -6 30 q-4 -14 -2 -30z" fill="#4f4080"/>
      <ellipse cx="50" cy="58" rx="30" ry="33" fill="#6a5aa3" stroke="#463a80" stroke-width="2"/>
      <ellipse cx="50" cy="70" rx="18" ry="19" fill="#ddd4f7"/>
      <path d="M43 66 l3 3 3 -3 M51 66 l3 3 3 -3 M47 74 l3 3 3 -3" stroke="#b5a8e6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="46" r="11" fill="#ffd56b" stroke="#463a80" stroke-width="2"/><circle cx="62" cy="46" r="11" fill="#ffd56b" stroke="#463a80" stroke-width="2"/>
      <circle cx="39" cy="47" r="5.5" fill="${INK}"/><circle cx="61" cy="47" r="5.5" fill="${INK}"/><circle cx="41" cy="45" r="1.8" fill="#fff"/><circle cx="63" cy="45" r="1.8" fill="#fff"/>
      <path d="M46 55 L50 62 L54 55 Z" fill="#ff9a3c" stroke="#d9741c" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M42 90 v4 M46 90 v4 M54 90 v4 M58 90 v4" stroke="#ff9a3c" stroke-width="2.5" stroke-linecap="round"/>` },
  { id:'cat', tier:'rare', name:{th:'แมวเชฟ',en:'Chef Cat'},
    desc:{th:'เชฟผู้ปิดครัวตรงเวลาทุกวัน ไม่รับออเดอร์หลังปิดเด็ดขาด',en:'Closes the kitchen on time, every time. No orders after hours.'},
    art:()=>`<path d="M24 46 L28 20 L46 34 Z M76 46 L72 20 L54 34 Z" fill="#ffb066" stroke="#df8a3a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M29 38 L31 26 L40 33 Z M71 38 L69 26 L60 33 Z" fill="#ffd1d9"/>
      <ellipse cx="50" cy="62" rx="31" ry="27" fill="#ffb066" stroke="#df8a3a" stroke-width="2"/>
      <path d="M43 40 q7 4 14 0 M41 46 q9 4 18 0" stroke="#e5913f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="20" r="9" fill="#fff" stroke="#e5dcd2" stroke-width="1.2"/><circle cx="62" cy="20" r="9" fill="#fff" stroke="#e5dcd2" stroke-width="1.2"/><circle cx="50" cy="14" r="11" fill="#fff" stroke="#e5dcd2" stroke-width="1.2"/>
      <rect x="34" y="23" width="32" height="10" rx="4" fill="#fff" stroke="#e5dcd2" stroke-width="1.2"/><rect x="34.6" y="28" width="30.8" height="3" fill="#ff6a2b"/>
      <path d="M18 64 h12 M18 70 l12 -2 M82 64 h-12 M82 70 l-12 -2" stroke="#b86b25" stroke-width="1.6" stroke-linecap="round"/>
      ${F(50,58,1,'happy','smile')}<path d="M48 60.5 h4 l-2 2.4z" fill="#ff7a8a"/>` },
  { id:'bunny', tier:'rare', name:{th:'กระต่ายจันทร์',en:'Moon Bunny'},
    desc:{th:'ตำข้าวอยู่บนดวงจันทร์ แต่ไม่เคยกินตอนดึกเลย',en:'Pounds rice cakes on the moon — but never eats them after dark.'},
    art:()=>`<path d="M70 8 a28 28 0 1 0 22 44 a22 22 0 1 1 -22 -44z" fill="#ffe28a"/>
      <path d="${starPath(16,18,4.5)}" fill="#ffe28a"/><path d="${starPath(26,8,2.5)}" fill="#ffe28a"/>
      <ellipse cx="38" cy="28" rx="8" ry="21" fill="#fff" stroke="#e2dbe6" stroke-width="2" transform="rotate(-8 38 28)"/><ellipse cx="38" cy="30" rx="3.8" ry="14" fill="#ffc6d3" transform="rotate(-8 38 30)"/>
      <ellipse cx="62" cy="28" rx="8" ry="21" fill="#fff" stroke="#e2dbe6" stroke-width="2" transform="rotate(8 62 28)"/><ellipse cx="62" cy="30" rx="3.8" ry="14" fill="#ffc6d3" transform="rotate(8 62 30)"/>
      <ellipse cx="50" cy="68" rx="27" ry="24" fill="#fff" stroke="#e2dbe6" stroke-width="2"/>
      <ellipse cx="76" cy="88" rx="8" ry="5" fill="#fff6e0" stroke="#efd9a6" stroke-width="1.5"/>${F(50,66,1,'open','smile')}` },
  { id:'firefly', tier:'rare', name:{th:'หิ่งห้อย',en:'Firefly'},
    desc:{th:'แสงเล็กๆ ที่คอยส่องทางในคืนที่หิวที่สุด',en:'A tiny light to guide you through the hungriest nights.'},
    art:()=>`<circle cx="50" cy="74" r="26" fill="#eaff7a" opacity=".16"/><circle cx="50" cy="74" r="17" fill="#eaff7a" opacity=".28"/>
      <ellipse cx="33" cy="44" rx="14" ry="9" fill="#d6ecff" opacity=".9" stroke="#a9cdf0" stroke-width="1.5" transform="rotate(-25 33 44)"/>
      <ellipse cx="67" cy="44" rx="14" ry="9" fill="#d6ecff" opacity=".9" stroke="#a9cdf0" stroke-width="1.5" transform="rotate(25 67 44)"/>
      <ellipse cx="50" cy="72" rx="13" ry="11" fill="#e8ff6e" stroke="#bcd63a" stroke-width="2"/>
      <ellipse cx="50" cy="57" rx="15" ry="12" fill="#7c72d8" stroke="#5a50b8" stroke-width="2"/>
      <path d="M44 27 q-4 -10 -10 -12 M56 27 q4 -10 10 -12" stroke="#5a50b8" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="34" cy="15" r="3" fill="#e8ff6e"/><circle cx="66" cy="15" r="3" fill="#e8ff6e"/>
      <circle cx="50" cy="40" r="15" fill="#958cec" stroke="#5a50b8" stroke-width="2"/>${F(50,40,.85,'happy','smile')}` },

  { id:'fox', tier:'sr', name:{th:'จิ้งจอกดาวตก',en:'Comet Fox'},
    desc:{th:'พุ่งผ่านฟ้ามาเฉพาะคืนที่มีวินัยสุดๆ เท่านั้น',en:'Streaks across the sky only on nights of true discipline.'},
    art:()=>`<path d="M54 76 q26 4 40 -40 q-8 20 -26 22 q10 -10 12 -24 q-10 18 -28 20 z" fill="#ffd35c" opacity=".95"/>
      <path d="${starPath(88,20,9)}" fill="#fff3a8" stroke="#ffcf3d" stroke-width="1.5"/><circle cx="76" cy="10" r="1.6" fill="#fff3a8"/><circle cx="96" cy="40" r="1.4" fill="#fff3a8"/>
      <path d="M26 44 L24 16 L44 32 Z M66 44 L68 16 L48 32 Z" fill="#ff8a3d" stroke="#d8641c" stroke-width="2" stroke-linejoin="round"/>
      <path d="M29 36 L28 24 L38 31Z M63 36 L64 24 L54 31Z" fill="#fff0de"/>
      <path d="M18 52 q0 -22 28 -22 q28 0 28 22 q0 16 -28 30 q-28 -14 -28 -30z" fill="#ff8a3d" stroke="#d8641c" stroke-width="2" stroke-linejoin="round"/>
      <path d="M30 60 q16 6 32 0 q-4 14 -16 20 q-12 -6 -16 -20z" fill="#fff4e8"/>
      ${F(46,51,1,'happy','none')}<ellipse cx="46" cy="66" rx="3" ry="2.2" fill="${INK}"/>
      <path d="M43 70 q3 3 6 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { id:'whale', tier:'sr', name:{th:'วาฬเมฆ',en:'Cloud Whale'},
    desc:{th:'ว่ายอยู่บนฟ้ายามค่ำ คอยร้องเพลงกล่อมให้หลับสบาย',en:'Swims across the night sky, singing you to sleep.'},
    art:()=>`<path d="${starPath(12,14,4)}" fill="#ffe28a"/><path d="${starPath(88,10,3)}" fill="#ffe28a"/>
      <path d="M50 30 v-7" stroke="#9fd8ff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="17" r="7" fill="#fff" stroke="#dfe8f2"/><circle cx="60" cy="17" r="7" fill="#fff" stroke="#dfe8f2"/><circle cx="50" cy="12" r="9" fill="#fff" stroke="#dfe8f2"/>
      <path d="M14 60 L2 46 L6 62 L2 78 Z" fill="#6fb8ff" stroke="#4b95e0" stroke-width="2" stroke-linejoin="round"/>
      <path d="M10 62 q0 -30 40 -30 q36 0 38 30 q1 18 -14 22 H26 q-16 -4 -16 -22z" fill="#78bfff" stroke="#4b95e0" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M24 74 q26 10 56 0 q-4 10 -8 10 H30 q-5 -2 -6 -10z" fill="#d4ecff"/>
      <path d="M34 78 v5 M42 79 v5 M50 79 v5 M58 79 v5 M66 78 v5" stroke="#a9d4fb" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M40 66 q-8 10 4 13" fill="#5aa7f2" stroke="#4b95e0" stroke-width="1.5"/>
      <circle cx="22" cy="93" r="6" fill="#fff" opacity=".9"/><circle cx="33" cy="95" r="7" fill="#fff" opacity=".9"/><circle cx="80" cy="93" r="6" fill="#fff" opacity=".9"/>
      ${F(64,56,1,'happy','smile')}` },
  { id:'ninja', tier:'sr', name:{th:'นินจาตะเกียบ',en:'Chopstick Ninja'},
    desc:{th:'ปัดป้องขนมทุกชิ้นด้วยวิชาตะเกียบไร้เงา',en:'Deflects every late-night snack with the shadowless chopstick art.'},
    art:()=>`<rect x="47" y="0" width="6" height="100" rx="3" fill="#c98a4b" stroke="#9b6330" stroke-width="1.2" transform="rotate(32 50 50)"/>
      <rect x="47" y="0" width="6" height="100" rx="3" fill="#c98a4b" stroke="#9b6330" stroke-width="1.2" transform="rotate(-32 50 50)"/>
      <circle cx="50" cy="56" r="29" fill="#2c2c3a" stroke="#18181f" stroke-width="2"/>
      <rect x="25" y="47" width="50" height="17" rx="8.5" fill="#f6d3b3"/>
      <rect x="21" y="35" width="58" height="7" rx="3.5" fill="#ff3d3d"/>
      <path d="M78 38 q10 -2 14 -10 M78 40 q12 2 16 -4" stroke="#ff3d3d" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M33 50 l9 2.5 M67 50 l-9 2.5" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="40" cy="56" rx="3" ry="3.6" fill="${INK}"/><ellipse cx="60" cy="56" rx="3" ry="3.6" fill="${INK}"/>
      <circle cx="41" cy="54.6" r="1" fill="#fff"/><circle cx="61" cy="54.6" r="1" fill="#fff"/>` },

  { id:'goldmoon', tier:'legend', name:{th:'มูนนี่ทองคำ',en:'Golden Moonie'},
    desc:{th:'ตำนานแห่งครัวปิด ปรากฏตัวเฉพาะกับคนที่ไม่ยอมแพ้',en:'Legend of the closed kitchen. Appears only to those who never give up.'},
    art:()=>`<path d="${starPath(12,42,5)}" fill="#fff3a8"/><path d="${starPath(89,38,6)}" fill="#fff3a8"/><path d="${starPath(86,86,4)}" fill="#fff3a8"/>
      <circle cx="50" cy="58" r="34" fill="#ffd34d" stroke="#d99a00" stroke-width="2.5"/>
      <ellipse cx="37" cy="44" rx="10" ry="6" fill="#fff3b8" opacity=".7" transform="rotate(-30 37 44)"/>
      <circle cx="68" cy="74" r="5" fill="#f2b81f" opacity=".7"/><circle cx="33" cy="78" r="3.4" fill="#f2b81f" opacity=".7"/><circle cx="73" cy="50" r="2.8" fill="#f2b81f" opacity=".7"/>
      <path d="M30 30 L34 10 L42 20 L50 6 L58 20 L66 10 L70 30 Z" fill="#ffe680" stroke="#d99a00" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="19" r="2.6" fill="#ff4d6d"/><circle cx="38" cy="24" r="2" fill="#4dc3ff"/><circle cx="62" cy="24" r="2" fill="#4dc3ff"/>
      ${F(50,58,1.1,'happy','open')}` },

  /* ----- added with collections ----- */
  { id:'fridge', set:'kitchen', tier:'common', name:{th:'ตู้เย็นล็อกแน่น',en:'Locked Fridge'},
    desc:{th:'ถึงเวลาปิดครัวปุ๊บ ล็อกตัวเองปั๊บ ไว้เจอกันตอนเช้านะ',en:'Locks itself the moment the kitchen closes. See you at breakfast!'},
    art:()=>`<rect x="26" y="8" width="48" height="86" rx="9" fill="#eef3f8" stroke="#b9c6d4" stroke-width="2.5"/>
      <path d="M26 38 H74" stroke="#b9c6d4" stroke-width="2.5"/>
      <rect x="64" y="15" width="4" height="15" rx="2" fill="#b9c6d4"/><rect x="64" y="45" width="4" height="10" rx="2" fill="#b9c6d4"/>
      <path d="M20 60 q30 -10 60 0" stroke="#9aa3ad" stroke-width="3.5" fill="none" stroke-dasharray="5 3" stroke-linecap="round"/>
      <path d="M44 63 v-5 a6 6 0 0 1 12 0 v5" stroke="#d99a00" stroke-width="3" fill="none"/>
      <rect x="41" y="62" width="18" height="15" rx="3.5" fill="#ffc83d" stroke="#d99a00" stroke-width="2"/><circle cx="50" cy="69" r="2" fill="#a06a00"/>
      ${F(45,22,.85,'open','flat')}` },
  { id:'mask', set:'bedtime', tier:'rare', name:{th:'ผ้าปิดตาฝันดี',en:'Dream Mask'},
    desc:{th:'ใส่แล้วหลับปุ๊บ ไม่เห็นแม้แต่แสงจากตู้เย็น',en:'Put it on and you are out — not even the fridge light gets through.'},
    art:()=>`<path d="M30 80 a8 8 0 1 0 8 10 a6 6 0 1 1 -8 -10z" fill="#ffe28a"/>
      <path d="${starPath(18,20,5)}" fill="#ffe28a"/><path d="${starPath(84,24,4)}" fill="#ffe28a"/><path d="${starPath(74,86,3.5)}" fill="#ffe28a"/>
      <path d="M6 50 q14 -6 20 -2 M94 50 q-14 -6 -20 -2" stroke="#9b8cf0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M22 40 q28 -14 56 0 q10 6 6 18 q-4 12 -18 10 q-10 -2 -16 -8 q-6 6 -16 8 q-14 2 -18 -10 q-4 -12 6 -18z" fill="#7c6ae6" stroke="#5a48c8" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M30 40 q20 -8 40 0" stroke="#a99cf5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M31 51 q7 6 14 0 M55 51 q7 6 14 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M32 55 l-2 3 M37 57 v3 M42 55 l2 3 M56 55 l-2 3 M61 57 v3 M66 55 l2 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      <text x="80" y="14" font-size="12" font-weight="800" fill="#c4b0fb" font-family="sans-serif">z</text>` },
  { id:'bat', set:'critters', tier:'common', name:{th:'ค้างคาวง่วงนอน',en:'Sleepy Bat'},
    desc:{th:'ตื่นตอนกลางคืนก็จริง แต่ไม่เคยแวะครัวสักครั้ง',en:'Up all night, yet never once visits the kitchen.'},
    art:()=>`<path d="M80 72 a10 10 0 1 0 10 14 a8 8 0 1 1 -10 -14z" fill="#ffe08a"/>
      <path d="M36 50 q-14 -14 -30 -6 q6 4 4 10 q8 -2 10 6 q8 -4 16 4z" fill="#5b4a78" stroke="#3e3158" stroke-width="2" stroke-linejoin="round"/>
      <path d="M64 50 q14 -14 30 -6 q-6 4 -4 10 q-8 -2 -10 6 q-8 -4 -16 4z" fill="#5b4a78" stroke="#3e3158" stroke-width="2" stroke-linejoin="round"/>
      <path d="M38 30 L35 14 L47 25Z M62 30 L65 14 L53 25Z" fill="#6e5b90" stroke="#3e3158" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="50" cy="52" rx="20" ry="24" fill="#6e5b90" stroke="#3e3158" stroke-width="2"/>
      <ellipse cx="50" cy="64" rx="11" ry="10" fill="#a594c4"/>
      ${F(50,46,.85,'sleepy','smile')}` },

  { id:'crumb', set:'cravings', tier:'salt', name:{th:'เศษขนมปัง',en:'Bread Crumb'},
    desc:{th:'เหลืออยู่แค่นี้แหละ… ไม่พอให้ใครหิวหรอก',en:'This is all that is left. Not enough to tempt anyone.'},
    art:()=>`<path d="M28 74 q-4 -32 22 -34 q26 -2 24 30 q0 10 -10 12 H38 q-10 0 -10 -8z" fill="#e8b46a" stroke="#b9823b" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M35 68 q0 -19 15 -20 q17 -1 16 19 q0 7 -7 8 H42 q-7 0 -7 -7z" fill="#fbe3b8"/>
      <circle cx="20" cy="86" r="2.5" fill="#e8b46a"/><circle cx="82" cy="88" r="2" fill="#e8b46a"/><circle cx="76" cy="80" r="1.6" fill="#e8b46a"/>
      ${F(51,62,.8,'open','o')}` },
  { id:'chips', set:'cravings', tier:'common', name:{th:'ถุงมันฝรั่ง',en:'Chip Bag'},
    desc:{th:'เสียงกรอบแกรบตอนดึกคือกับดัก! ตอนนี้กลับใจมาเชียร์คุณแล้ว',en:'That midnight crunch is a trap! Now reformed and cheering you on.'},
    art:()=>`<path d="M58 8 q8 -6 14 2 q-8 4 -14 -2z" fill="#f7d26b" stroke="#d9a63a" stroke-width="1.2"/><path d="M30 6 q6 -4 10 2 q-6 3 -10 -2z" fill="#f7d26b" stroke="#d9a63a" stroke-width="1.2"/>
      <path d="M26 14 H74 L70 52 L74 90 H26 L30 52 Z" fill="#ffcf33" stroke="#e0a400" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M26 14 H74 L73.4 20 H26.6Z M26.6 84 H73.4 L74 90 H26Z" fill="#ff5a3c"/>
      <ellipse cx="50" cy="72" rx="16" ry="7" fill="#fff3c4"/>
      <text x="50" y="74.5" text-anchor="middle" font-size="7" font-weight="900" fill="#ff5a3c" font-family="sans-serif">CRUNCH</text>
      ${F(50,44,1,'open','open')}` },
  { id:'boba', set:'cravings', tier:'common', name:{th:'ชานมไข่มุก',en:'Boba Buddy'},
    desc:{th:'หวานเกินไปสำหรับตอนดึก ขอเป็นแค่เพื่อนกันนะ',en:'Too sweet for late nights. Let us just be friends.'},
    art:()=>`<rect x="55" y="0" width="7" height="34" rx="3.5" fill="#ff7aa8" transform="rotate(12 58 17)"/>
      <path d="M28 30 H72 L66 92 H34 Z" fill="#f3d9b8" stroke="#c99e6e" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="25" y="23" width="50" height="9" rx="4" fill="#fff" stroke="#d8c9b5" stroke-width="2"/>
      <g fill="#3b2418"><circle cx="40" cy="84" r="3.6"/><circle cx="48" cy="86.5" r="3.6"/><circle cx="56" cy="84" r="3.6"/><circle cx="61" cy="78" r="3.4"/><circle cx="43" cy="77" r="3.4"/><circle cx="52" cy="79" r="3.4"/></g>
      ${F(50,52,1,'happy','smile')}` },
  { id:'noodle', set:'cravings', tier:'rare', name:{th:'บะหมี่เที่ยงคืน',en:'Midnight Noodles'},
    desc:{th:'แค่ 3 นาทีก็พังวินัยได้… แต่คืนนี้ขอนอนอยู่ในตู้เฉยๆ',en:'Three minutes to wreck a streak… tonight it stays in the cupboard.'},
    art:()=>`<path d="M38 22 q-5 -6 0 -12 M50 20 q-5 -6 0 -12 M62 22 q-5 -6 0 -12" stroke="#d4dad6" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M74 6 L64 34" stroke="#bfc6d0" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 34 H78 L72 90 H28 Z" fill="#fff" stroke="#d6d0c8" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M23.6 34 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q4 -6 4.8 0" stroke="#f4c95d" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M24.8 62 H75.2 L73.8 76 H26.2 Z" fill="#ff4d3d"/>
      <text x="50" y="72.5" text-anchor="middle" font-size="8" font-weight="900" fill="#fff" font-family="sans-serif">3 MIN</text>
      ${F(50,48,.9,'happy','smile')}` },
  { id:'donut', set:'cravings', tier:'rare', name:{th:'โดนัทยั่วใจ',en:'Tempting Donut'},
    desc:{th:'ส่งสายตาหวานๆ มาทุกคืน แต่ตอนนี้ใจคุณแข็งพอแล้ว',en:'Makes sweet eyes at you every night. Your willpower is strong enough now.'},
    art:()=>`<circle cx="50" cy="54" r="36" fill="#e9b26a" stroke="#c98a3e" stroke-width="2.5"/>
      <path d="M16 52 q2 -32 34 -33 q32 1 34 33 q-4 6 -8 2 q-4 8 -10 2 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -10 -2 q-6 4 -12 -2z" fill="#ff8ab8" stroke="#e5689a" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="50" cy="44" rx="9" ry="6.5" fill="#1d1d23" stroke="#e5689a" stroke-width="2"/>
      <g stroke-width="2.6" stroke-linecap="round"><path d="M28 38 l4 -2" stroke="#4dc3ff"/><path d="M38 28 l3 3" stroke="#fff35c"/><path d="M62 28 l4 1" stroke="#4dff88"/><path d="M72 40 l2 4" stroke="#fff"/><path d="M24 48 l3 3" stroke="#9b5cff"/><path d="M68 50 l4 -2" stroke="#4dc3ff"/></g>
      ${F(50,72,.9,'happy','open')}` },
  { id:'pizza', set:'cravings', tier:'sr', name:{th:'พิซซ่าจอมยั่ว',en:'Pizza Fiend'},
    desc:{th:'บอสใหญ่แห่งของกินดึก! เอาชนะได้แล้วก็กลายเป็นเพื่อนซี้',en:'The final boss of late-night food! Beat it and it becomes your best friend.'},
    art:()=>`<path d="M24 20 L17 3 L33 15Z M76 20 L83 3 L67 15Z" fill="#ff4d4d" stroke="#c42f2f" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M50 94 L14 24 Q50 8 86 24 Z" fill="#ffd36b" stroke="#e0a43a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M14 24 Q50 8 86 24 L82 32 Q50 17 18 32 Z" fill="#d98c3a" stroke="#b86e25" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="34" cy="40" r="6" fill="#e0443a"/><circle cx="66" cy="38" r="5.5" fill="#e0443a"/><circle cx="51" cy="76" r="4.5" fill="#e0443a"/>
      <path d="M38 64 q2 10 0 14 q-3 -2 -2 -14z M62 60 q2 8 0 11 q-3 -2 -2 -11z" fill="#ffe08a"/>
      ${F(50,52,1,'happy','open')}` },

  { id:'cucumber', set:'fresh', tier:'salt', name:{th:'แตงกวาใจเย็น',en:'Chill Cucumber'},
    desc:{th:'เย็นสบาย ใจเย็น หิวเมื่อไหร่เคี้ยวเราแทนได้',en:'Cool as can be. Crunch me instead of a snack.'},
    art:()=>`<circle cx="79" cy="79" r="12" fill="#c8f0b4" stroke="#4caf50" stroke-width="3"/><g fill="#f5fff0"><circle cx="79" cy="73" r="2"/><circle cx="73" cy="81" r="2"/><circle cx="85" cy="81" r="2"/></g>
      <rect x="35" y="8" width="30" height="84" rx="15" fill="#4caf50" stroke="#2f8a35" stroke-width="2.5"/>
      <g fill="#7fd081"><circle cx="42" cy="22" r="1.8"/><circle cx="58" cy="30" r="1.8"/><circle cx="43" cy="76" r="1.8"/><circle cx="57" cy="83" r="1.8"/><circle cx="56" cy="68" r="1.6"/></g>
      ${F(50,48,.8,'flat','smile')}` },
  { id:'apple', set:'fresh', tier:'common', name:{th:'แอปเปิ้ลแดง',en:'Apple Pal'},
    desc:{th:'กินวันละผล หมอไม่ต้องมา ความหิวตอนดึกก็ไม่ต้องมาเหมือนกัน',en:'An apple a day keeps the late-night cravings away.'},
    art:()=>`<path d="M50 30 q-4 -12 4 -22" stroke="#7a4b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M54 18 q14 -10 22 0 q-12 8 -22 0z" fill="#5cc85c" stroke="#3a9a3a" stroke-width="1.5"/>
      <path d="M50 30 q-12 -8 -24 -2 q-16 10 -10 34 q6 24 22 28 q6 2 12 -2 q6 4 12 2 q16 -4 22 -28 q6 -24 -10 -34 q-12 -6 -24 2z" fill="#ff5252" stroke="#d63030" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="31" cy="46" rx="5" ry="9" fill="#fff" opacity=".35" transform="rotate(20 31 46)"/>
      ${F(50,58,1,'open','smile')}` },
  { id:'banana', set:'fresh', tier:'common', name:{th:'กล้วยหอม',en:'Banana Buddy'},
    desc:{th:'พลังงานพอดีๆ ช่วยให้อิ่มถึงเวลาปิดครัว',en:'Just the right energy to keep you full until closing time.'},
    art:()=>`<path d="M20 30 q-8 44 32 58 q32 10 46 -12 q-30 12 -48 -12 q-14 -18 -10 -38z" fill="#ffe14d" stroke="#d9b200" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M30 32 q-2 26 14 42" stroke="#fff3a0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M19 30 l-3 -10 8 3z" fill="#6b4a2a" stroke="#6b4a2a" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="97" cy="76" r="2.6" fill="#6b4a2a"/>
      ${F(37,60,.72,'happy','smile')}` },
  { id:'carrot', set:'fresh', tier:'rare', name:{th:'แครอทตาดี',en:'Sharp-eyed Carrot'},
    desc:{th:'มองเห็นชัดแม้ในที่มืด เห็นแม้กระทั่งมือที่แอบเอื้อมไปหาขนม',en:'Sees clearly in the dark — even the hand sneaking toward the snacks.'},
    art:()=>`<path d="M50 28 q-14 -14 -8 -24 q8 8 8 24z M50 28 q2 -18 14 -22 q0 14 -14 22z M50 28 q-18 -6 -24 -2 q10 8 24 2z" fill="#4caf50" stroke="#2f8a35" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M26 32 q24 -10 48 0 q-6 34 -24 64 q-18 -30 -24 -64z" fill="#ff8a2b" stroke="#d9651a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M36 60 h6 M58 68 h-6 M45 80 h5" stroke="#d9651a" stroke-width="2" stroke-linecap="round"/>
      ${F(50,42,.8,'open','smile')}
      <g fill="none" stroke="${INK}" stroke-width="2"><circle cx="43.2" cy="42" r="6"/><circle cx="56.8" cy="42" r="6"/><path d="M49.2 42 h1.6 M37.2 41 l-5 -2 M62.8 41 l5 -2"/></g>` },
  { id:'broccoli', set:'fresh', tier:'rare', name:{th:'บร็อคโคลี่ฮีโร่',en:'Broccoli Hero'},
    desc:{th:'ฮีโร่ผู้ปกป้องท้องอิ่มนาน กินมื้อกลางวันดีๆ ตกเย็นก็ไม่หิว',en:'Guardian of the full tummy. Eat a good lunch and evening hunger fades.'},
    art:()=>`<path d="M36 56 L16 94 H84 L64 56 Z" fill="#ff3d3d" stroke="#c42f2f" stroke-width="2" stroke-linejoin="round"/>
      <path d="M37 52 H63 L59 90 H41 Z" fill="#9bd36a" stroke="#5f9e35" stroke-width="2.5" stroke-linejoin="round"/>
      <g fill="#3fae49" stroke="#2a8a33" stroke-width="2"><circle cx="29" cy="40" r="14"/><circle cx="71" cy="40" r="14"/><circle cx="50" cy="28" r="18"/><circle cx="40" cy="48" r="11"/><circle cx="60" cy="48" r="11"/></g>
      <g fill="#6fd06f"><circle cx="44" cy="22" r="2"/><circle cx="58" cy="26" r="2"/><circle cx="26" cy="36" r="2"/><circle cx="73" cy="36" r="2"/><circle cx="50" cy="40" r="1.8"/></g>
      ${F(50,70,.7,'open','smile')}` },
  { id:'melon', set:'fresh', tier:'sr', name:{th:'แตงโมซัมเมอร์',en:'Summer Melon'},
    desc:{th:'เป็นน้ำ 92% เท่สุดในแก๊ง ดื่มน้ำเยอะๆ แล้วจะเจอเรา',en:'92% water, 100% cool. Stay hydrated and you will find me.'},
    art:()=>`<path d="${starPath(16,16,5)}" fill="#fff3a8"/><path d="${starPath(86,14,4)}" fill="#fff3a8"/><path d="${starPath(90,34,2.5)}" fill="#fff3a8"/>
      <path d="M6 36 A44 44 0 0 0 94 36 Z" fill="#3fae49"/>
      <path d="M11 36 A39 39 0 0 0 89 36 Z" fill="#e8ffd8"/>
      <path d="M15 36 A35 35 0 0 0 85 36 Z" fill="#ff5d6c"/>
      <g fill="${INK}"><ellipse cx="26" cy="50" rx="1.8" ry="3" transform="rotate(-25 26 50)"/><ellipse cx="74" cy="50" rx="1.8" ry="3" transform="rotate(25 74 50)"/><ellipse cx="36" cy="63" rx="1.8" ry="3" transform="rotate(-12 36 63)"/><ellipse cx="64" cy="63" rx="1.8" ry="3" transform="rotate(12 64 63)"/><ellipse cx="50" cy="68" rx="1.8" ry="3"/></g>
      <path d="M33 40 h15 v3 a7 6 0 0 1 -15 0z M52 40 h15 v3 a7 6 0 0 1 -15 0z" fill="${INK}"/><path d="M47 41 h6" stroke="${INK}" stroke-width="2"/>
      <path d="M36 41.5 l4 -1 M55 41.5 l4 -1" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
      <path d="M44 53 q6 6 12 0" stroke="${INK}" stroke-width="2.3" fill="none" stroke-linecap="round"/>` },

  { id:'star', set:'sky', tier:'salt', name:{th:'ดาวจิ๋ว',en:'Tiny Star'},
    desc:{th:'ดวงเล็กที่สุดบนฟ้า แต่ส่องแสงทุกคืนไม่เคยขาด',en:'The smallest star in the sky, shining every single night.'},
    art:()=>`<path d="${starPath(50,54,40)}" fill="#ffe26b" stroke="#e0b300" stroke-width="2.5" stroke-linejoin="round"/>
      ${F(50,58,.85,'open','smile')}` },
  { id:'cloud', set:'sky', tier:'common', name:{th:'เมฆฝันดี',en:'Dream Cloud'},
    desc:{th:'ลอยมาห่มให้ตอนหลับ จะฝันถึงอาหารก็ให้อยู่แค่ในฝันพอ',en:'Floats over to tuck you in. Dream about food — but only in dreams.'},
    art:()=>`<path d="${starPath(82,22,5)}" fill="#ffe26b"/><path d="M16 24 a7 7 0 1 0 7 9 a5 5 0 1 1 -7 -9z" fill="#ffe26b"/>
      <g fill="#fff" stroke="#d5dcef" stroke-width="5"><circle cx="30" cy="60" r="16"/><circle cx="50" cy="48" r="20"/><circle cx="70" cy="60" r="16"/><rect x="20" y="58" width="60" height="20" rx="10"/></g>
      <g fill="#fff"><circle cx="30" cy="60" r="16"/><circle cx="50" cy="48" r="20"/><circle cx="70" cy="60" r="16"/><rect x="20" y="58" width="60" height="20" rx="10"/></g>
      ${F(50,60,1,'sleepy','smile')}` },
  { id:'saturn', set:'sky', tier:'rare', name:{th:'ดาวเสาร์วงแหวน',en:'Ringed Saturn'},
    desc:{th:'วงแหวนคือนาฬิกา หมุนครบรอบเมื่อไหร่ ก็ถึงเวลาปิดครัว',en:'Its ring is a clock. One full turn and the kitchen closes.'},
    art:()=>`<path d="${starPath(14,18,4)}" fill="#ffe26b"/><path d="${starPath(86,86,3.5)}" fill="#ffe26b"/>
      <ellipse cx="50" cy="54" rx="44" ry="12" fill="none" stroke="#b58cf5" stroke-width="5" transform="rotate(-14 50 54)"/>
      <circle cx="50" cy="52" r="26" fill="#ffb86b" stroke="#e08a3a" stroke-width="2.5"/>
      <path d="M28 40 q22 5 44 0 M29 66 q21 5 42 0" stroke="#ffd29a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M6 54 A44 12 0 0 0 94 54" fill="none" stroke="#c9a2ff" stroke-width="5" stroke-linecap="round" transform="rotate(-14 50 54)"/>
      ${F(50,51,.9,'happy','smile')}` },
  { id:'ufo', set:'sky', tier:'rare', name:{th:'จานบินดูดขนม',en:'Snack-napper UFO'},
    desc:{th:'ดูดขนมทุกชิ้นในบ้านขึ้นยานไปหมด คุณจะได้ไม่ต้องกิน',en:'Beams up every snack in the house so you do not have to eat them.'},
    art:()=>`<defs><linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4ffb0" stop-opacity=".75"/><stop offset="1" stop-color="#b8ff6b" stop-opacity=".08"/></linearGradient></defs>
      <path d="M38 56 L20 96 H80 L62 56 Z" fill="url(#gBeam)"/>
      <circle cx="50" cy="84" r="7" fill="#d99a4e" stroke="#a86a2a" stroke-width="1.5"/><g fill="#5a3a1a"><circle cx="47" cy="82" r="1.2"/><circle cx="53" cy="86" r="1.2"/><circle cx="52" cy="81" r="1"/></g>
      <path d="M32 46 a18 18 0 0 1 36 0 z" fill="#bfe8ff" stroke="#7cc3ea" stroke-width="2" opacity=".95"/>
      <path d="M46 31 l-3 -6 M54 31 l3 -6" stroke="#5fbf45" stroke-width="1.6" stroke-linecap="round"/><circle cx="43" cy="24" r="1.8" fill="#8de36b"/><circle cx="57" cy="24" r="1.8" fill="#8de36b"/>
      <circle cx="50" cy="39" r="9" fill="#8de36b"/>${F(50,39,.5,'open','smile')}
      <ellipse cx="50" cy="50" rx="40" ry="11" fill="#a7b3c6" stroke="#6e7a8e" stroke-width="2.5"/><ellipse cx="50" cy="47" rx="30" ry="5" fill="#c9d3e2"/>
      <g fill="#ffe26b"><circle cx="22" cy="52" r="2.6"/><circle cx="36" cy="56" r="2.6"/><circle cx="50" cy="57.5" r="2.6"/><circle cx="64" cy="56" r="2.6"/><circle cx="78" cy="52" r="2.6"/></g>` },
  { id:'aurora', set:'sky', tier:'sr', name:{th:'แมงกะพรุนแสงเหนือ',en:'Aurora Jelly'},
    desc:{th:'ล่องลอยในทะเลแสงเหนือ เรืองแสงทุกครั้งที่คุณผ่านคืนที่ยากไปได้',en:'Drifts through aurora seas, glowing every time you beat a tough night.'},
    art:()=>`<defs><linearGradient id="gAur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dffd8"/><stop offset=".5" stop-color="#8ab4ff"/><stop offset="1" stop-color="#d48aff"/></linearGradient></defs>
      <path d="${starPath(10,12,4)}" fill="#fff3a8"/><path d="${starPath(90,20,3)}" fill="#fff3a8"/><path d="${starPath(88,76,3.5)}" fill="#fff3a8"/>
      <circle cx="50" cy="40" r="36" fill="#7dffd8" opacity=".12"/>
      <path d="M32 50 q-6 14 2 24 q6 10 -2 20 M44 52 q-4 14 2 22 q4 10 0 18 M56 52 q4 14 -2 22 q-4 10 0 18 M68 50 q6 14 -2 24 q-6 10 2 20" stroke="url(#gAur)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M18 50 q0 -36 32 -36 q32 0 32 36 q-5 5 -10.6 0 q-5.3 5 -10.7 0 q-5.4 5 -10.7 0 q-5.3 5 -10.7 0 q-5.4 5 -10.7 0 q-4.6 5 -10.6 0z" fill="url(#gAur)" stroke="#9fe0ff" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="34" cy="28" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 34 28)"/>
      ${F(50,38,1,'happy','smile')}` },
  { id:'dragon', set:'sky', tier:'legend', name:{th:'มังกรจันทรา',en:'Moon Dragon'},
    desc:{th:'ตำนานผู้เฝ้าดวงจันทร์ พ่นแสงดาวแทนไฟ และไม่เคยกินอะไรหลังพระอาทิตย์ตก',en:'Legendary guardian of the moon. Breathes starlight, not fire, and never eats after sunset.'},
    art:()=>`<path d="${starPath(16,20,5)}" fill="#fff3a8"/><path d="${starPath(30,46,3)}" fill="#fff3a8"/><path d="${starPath(88,90,3)}" fill="#fff3a8"/>
      <circle cx="56" cy="44" r="38" fill="#5fe0b4" opacity=".12"/>
      <path d="M14 84 q-8 2 -8 10 q6 -2 10 -6z" fill="#ffd34d"/>
      <path d="M14 84 q10 -22 30 -14 q20 8 30 -10 q6 -12 -4 -22" stroke="#2fa57e" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M14 84 q10 -22 30 -14 q20 8 30 -10 q6 -12 -4 -22" stroke="#4dd6a8" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M14 84 q10 -22 30 -14 q20 8 30 -10 q6 -12 -4 -22" stroke="#c8ffe9" stroke-width="3" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/>
      <path d="M52 22 L45 5 L59 17Z M68 20 L72 3 L77 19Z" fill="#ffd34d" stroke="#d99a00" stroke-width="1.5" stroke-linejoin="round"/>
      <ellipse cx="62" cy="34" rx="20" ry="16" fill="#5fe0b4" stroke="#2fa57e" stroke-width="2.5"/>
      <ellipse cx="76" cy="40" rx="8" ry="6" fill="#8ff0cc" stroke="#2fa57e" stroke-width="1.5"/><circle cx="74" cy="39" r="1.2" fill="${INK}"/><circle cx="79" cy="39" r="1.2" fill="${INK}"/>
      <path d="M83 43 q8 2 12 10 M83 37 q8 -4 14 -1" stroke="#ffd34d" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${F(58,32,.8,'happy','none')}` },
  { id:'krathong', set:'festival', tier:'sr', limited:true, name:{th:'น้องกระทง',en:'Krathong Kid'},
    desc:{th:'ลอยมาพร้อมคำอธิษฐาน: ปีนี้ขอให้งดมื้อเย็นได้ทุกคืน',en:'Floats in with a wish: skip dinner every night this year.'},
    art:()=>`<ellipse cx="50" cy="88" rx="42" ry="6" fill="#4aa5ff" opacity=".3"/><path d="M20 88 q8 -3 16 0 M62 90 q8 -3 16 0" stroke="#9fd8ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="18" r="11" fill="#ffd36b" opacity=".3"/><path d="M50 7 q6.5 8 0 13.5 q-6.5 -5.5 0 -13.5z" fill="#ffb84d"/><rect x="46" y="20" width="8" height="24" rx="2" fill="#fff3d6" stroke="#e8d7b0"/>
      <path d="M38 46 l-4 -22 M62 46 l4 -22" stroke="#8a5a2b" stroke-width="1.6"/><circle cx="34" cy="23" r="1.6" fill="#ff4d4d"/><circle cx="66" cy="23" r="1.6" fill="#ff4d4d"/>
      <path d="M16 58 l5 -12 5 12 5 -12 5 12 5 -12 5 12 5 -12 5 12 5 -12 5 12 5 -12 5 12 5 -12 4 12z" fill="#5cb85c" stroke="#3f8f3f" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="30" cy="48" r="5" fill="#ff8fb8"/><circle cx="30" cy="48" r="2" fill="#ffd36b"/><circle cx="70" cy="48" r="5" fill="#ffd36b"/><circle cx="70" cy="48" r="2" fill="#ff8a5c"/>
      <path d="M12 60 q38 20 76 0 l-5 -4 h-66z" fill="#3f8f3f" stroke="#2c6e2c" stroke-width="2" stroke-linejoin="round"/>
      ${F(50,67,.85,'happy','smile')}` },
];
/* collections: every character belongs to exactly one set (the first 18 are mapped here) */
const SETS = [
  { id:'kitchen',  icon:'utensils-crossed', color:'#ff7a45', name:{th:'ครัวปิดแล้ว',en:'Closed Kitchen'},     reward:{tickets:3} },
  { id:'bedtime',  icon:'moon-star',        color:'#8b7cf6', name:{th:'แก๊งก่อนนอน',en:'Bedtime Crew'},       reward:{tickets:2} },
  { id:'critters', icon:'heart',            color:'#e86aa8', name:{th:'สัตว์ราตรี',en:'Night Critters'},      reward:{tickets:4, gold:1} },
  { id:'cravings', icon:'flame',            color:'#ff4d3d', name:{th:'ปีศาจของกินดึก',en:'Midnight Cravings'}, reward:{tickets:3} },
  { id:'fresh',    icon:'sprout',           color:'#3fae49', name:{th:'ผักผลไม้สดใส',en:'Fresh Friends'},     reward:{tickets:3} },
  { id:'sky',      icon:'sparkles',         color:'#4aa5ff', name:{th:'ท้องฟ้ายามค่ำ',en:'Night Sky'},         reward:{tickets:5, gold:2} },
  { id:'festival', icon:'lotus',            color:'#ff8fb8', name:{th:'ของสะสมเทศกาล',en:'Festival Specials'}, reward:{tickets:2} },
];
const SET_BY_ID = Object.fromEntries(SETS.map(s=>[s.id,s]));
const FIRST_SETS = { salt:'kitchen', soy:'kitchen', pick:'kitchen', spoon:'kitchen', cat:'kitchen', ninja:'kitchen',
  tissue:'bedtime', glass:'bedtime', tea:'bedtime', brush:'bedtime', pillow:'bedtime', shoe:'bedtime',
  owl:'critters', bunny:'critters', firefly:'critters', fox:'critters', whale:'critters', goldmoon:'sky' };
CHARS.forEach(c=>{ c.set ||= FIRST_SETS[c.id]; });
CHARS.sort((a,b)=> SETS.indexOf(SET_BY_ID[a.set]) - SETS.indexOf(SET_BY_ID[b.set]) || tierIdx(a.tier) - tierIdx(b.tier));
CHARS.forEach((c,i)=>c.no=i+1);
const CHAR_BY_ID = Object.fromEntries(CHARS.map(c=>[c.id,c]));
const _artCache = {};
let _artUid = 0;
function charSVG(ch){
  let s = charArt(ch);
  // gradients need ids unique per copy: a copy inside a hidden tab would otherwise win and render nothing
  if(s.includes(' id="')){ const u = ++_artUid; s = s.replace(/ id="(\w+)"/g, ` id="$1_${u}"`).replace(/url\(#(\w+)\)/g, `url(#$1_${u})`); }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}
const ownedCount = () => CHARS.filter(c=>S.gacha.owned[c.id]).length;
const _faceCache = {};
const FACE_DEFAULT = { owl:{cx:50,cy:47,s:1.15}, ninja:{cx:50,cy:56,s:1}, mask:{cx:50,cy:51,s:1.1}, melon:{cx:50,cy:43,s:1} };
function charArt(ch){
  if(!_artCache[ch.id]){ _faceRec={}; _artCache[ch.id]=ch.art(); _faceCache[ch.id]=_faceRec.v || FACE_DEFAULT[ch.id] || {cx:50,cy:50,s:1}; _faceRec=null; }
  return _artCache[ch.id];
}
/* buddy outfits, drawn around the face: hats sit above the eyes, glasses on them */
const ACC = {
  hat_party:`<path d="M-12 2 L0 -28 L12 2Z" fill="#ff5a8a" stroke="#d63a6b" stroke-width="1.2" stroke-linejoin="round"/><path d="M-8 -8 L8 -8 M-4.5 -18 L4.5 -18" stroke="#ffe066" stroke-width="2.6" stroke-linecap="round"/><circle cy="-29" r="3.6" fill="#ffe066"/>`,
  hat_beanie:`<path d="M-17 2 q0 -24 17 -24 q17 0 17 24z" fill="#4aa5ff"/><path d="M-9 -16 v14 M0 -21 v18 M9 -16 v14" stroke="#79c0ff" stroke-width="2"/><rect x="-18.5" y="-3" width="37" height="7" rx="3.5" fill="#2c83de"/><circle cy="-24" r="4.6" fill="#fff"/>`,
  hat_crown:`<path d="M-15 2 L-17 -16 L-8 -8 L0 -21 L8 -8 L17 -16 L15 2Z" fill="#ffd34d" stroke="#d99a00" stroke-width="1.4" stroke-linejoin="round"/><circle cy="-6" r="2.4" fill="#ff4d6d"/><circle cx="-9" cy="-3" r="1.6" fill="#4dc3ff"/><circle cx="9" cy="-3" r="1.6" fill="#4dc3ff"/>`,
  face_sun:`<path d="M-15.5 -3.5 h12.5 v2.5 a6.25 5 0 0 1 -12.5 0z M3 -3.5 h12.5 v2.5 a6.25 5 0 0 1 -12.5 0z" fill="#1d1d23"/><path d="M-3 -2.5 h6" stroke="#1d1d23" stroke-width="2"/><path d="M-13 -1.6 l3 -.8 M5.5 -1.6 l3 -.8" stroke="#fff" stroke-width="1" opacity=".6" stroke-linecap="round"/>`,
  hat_chada:`<path d="M-13 2 L-11 -8 L-7 -12 L-5 -22 L-2 -30 L0 -42 L2 -30 L5 -22 L7 -12 L11 -8 L13 2Z" fill="#ffd34d" stroke="#c98a00" stroke-width="1.1" stroke-linejoin="round"/><path d="M-11 -4 h22 M-8 -13 h16 M-5 -22 h10" stroke="#c98a00" stroke-width="1.4"/><circle cy="-8" r="2.3" fill="#ff4d6d"/><circle cx="-7" cy="-2" r="1.4" fill="#3fae5f"/><circle cx="7" cy="-2" r="1.4" fill="#3fae5f"/>`,
  face_heart:`<path d="M-13 7.5 l-2.6 -2.5 a1.6 1.6 0 0 1 2.6 -1.9 a1.6 1.6 0 0 1 2.6 1.9z M13 7.5 l-2.6 -2.5 a1.6 1.6 0 0 1 2.6 -1.9 a1.6 1.6 0 0 1 2.6 1.9z" fill="#ff4d6d"/>`,
};
function accessorize(svg, id, eq=S.shop.equip){
  const f=_faceCache[id] || {cx:50,cy:50,s:1}; let add='';
  if(eq.face && ACC[eq.face]) add += `<g transform="translate(${f.cx} ${f.cy}) scale(${f.s})">${ACC[eq.face]}</g>`;
  if(eq.hat && ACC[eq.hat]) add += `<g transform="translate(${f.cx} ${f.cy-21*f.s}) scale(${f.s})">${ACC[eq.hat]}</g>`;
  return add ? svg.replace('<svg ', '<svg style="overflow:visible" ').replace(/<\/svg>$/, add+'</svg>') : svg;
}
function buddySVG(b){ return accessorize(charSVG(b), b.id); }
function avatarHTML(){
  const b = S.gacha.buddy && CHAR_BY_ID[S.gacha.buddy];
  return b ? buddySVG(b) : escapeHtml((S.settings.name||'?').trim().charAt(0).toUpperCase() || '?');
}

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
function setQuest(s){
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
function allQuests(){
  const k=questNight(), add=l=>l.map(q=>({...q, reward:{...q.reward, coins:coinValue(q.id)}}));
  return { k, daily:add(dailyQuests(k)), weekly:add(weeklyQuests(k)), milestones:add(milestoneQuests()) };
}
function coinValue(id){ if(id==='m:welcome') return 50; return ({d:10, w:30, m:50, set:100})[id.split(':')[0]] || 0; }
const isClaimable = q => q.cur>=q.goal && !S.quests.claimed[q.id];
function claimableCount(){ const a=allQuests(); return [...a.daily,...a.weekly,...a.milestones].filter(isClaimable).length; }

function rewardChips(r){
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
let questIndex = {};
function claimQuest(id, btn){
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

/* ---------- gacha pulls ---------- */
let gBusy=false;
function rollTier(force){
  if(force) return Math.random()<.85 ? 'sr' : 'legend';
  let r=Math.random()*100;
  for(const k of TIER_ORDER){ r-=TIERS[k].rate; if(r<0) return k; }
  return 'salt';
}
function grant(tier){
  const g=S.gacha, pool=CHARS.filter(c=>c.tier===tier && !c.limited), ch=pool[Math.floor(Math.random()*pool.length)];
  const isNew=!g.owned[ch.id];
  g.owned[ch.id]=(g.owned[ch.id]||0)+1; g.pulls++;
  const shards=isNew?0:TIERS[tier].shard; g.shards+=shards;
  return { ch, tier, isNew, shards };
}
function pullOne(gold){
  const g=S.gacha, tier=rollTier(gold || g.pity>=PITY-1);
  g.pity = tierIdx(tier)>=3 ? 0 : g.pity+1;
  return grant(tier);
}
function pullTen(){
  const res=[]; for(let i=0;i<10;i++) res.push(pullOne(false));
  if(!res.some(r=>tierIdx(r.tier)>=2)){
    const last=res[9], g=S.gacha;
    g.owned[last.ch.id]--; if(!g.owned[last.ch.id]) delete g.owned[last.ch.id];
    g.shards-=last.shards; g.pulls--;
    res[9]=grant('rare');
  }
  return res;
}
async function startPull(kind){
  if(gBusy) return;
  const g=S.gacha, cost = kind==='ten' ? 10 : 1, fromStage=$('stage').classList.contains('open');
  if(kind==='gold'){ if(g.gold<1) return; g.gold--; }
  else if(g.tickets<cost){ toast(t('noTickets')); if(HAS_GSAP) gsap.fromTo('#machineSvg',{x:-6},{x:0,duration:.4,ease:'elastic.out(1,.3)'}); return; }
  else g.tickets-=cost;
  gBusy=true;
  const results = kind==='ten' ? pullTen() : [pullOne(kind==='gold')];
  checkBadges(); save(); renderRewards();
  if(!fromStage) await machineAnim();
  openStage(results);
}
function machineAnim(){
  if(!HAS_GSAP) return Promise.resolve();
  return new Promise(res=>{
    const tl=gsap.timeline({onComplete:res});
    tl.to('#knob',{rotation:'+=360', svgOrigin:'72 206', duration:.85, ease:'power2.inOut'},0)
      .to('#machineSvg',{x:'random(-4,4)', duration:.05, repeat:12, yoyo:true, repeatRefresh:true},0)
      .to('#domeCaps .cj',{y:'random(-10,4)', x:'random(-5,5)', rotation:'random(-30,30)', duration:.12, repeat:5, yoyo:true, repeatRefresh:true, stagger:.01},0)
      .set('#machineSvg',{x:0})
      .set('#domeCaps .cj',{x:0,y:0,rotation:0});
  });
}
function renderMachine(){
  const box=$('domeCaps'); if(box.childElementCount) return;
  const cols=['#f0f1f5','#f0f1f5','#5fd3e2','#5fd3e2','#a98bff','#ffd24d','#ff7a3d','#f0f1f5','#5fd3e2','#a98bff','#ff9fc8','#ffd24d','#5fd3e2','#f0f1f5','#a98bff','#ff7a3d'];
  let h='';
  for(let i=0;i<16;i++){
    const row=Math.floor(i/5), x=46+((i%5)*27)+(row%2?13:0), y=142-row*22-(Math.random()*4), a=Math.round(Math.random()*360);
    h+=`<g transform="translate(${x} ${y})"><g class="cj"><g transform="rotate(${a})"><circle r="12" fill="${cols[i]}"/><path d="M-12 0 a12 12 0 0 0 24 0z" fill="#fff"/><circle r="12" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/><ellipse cx="-4" cy="-6" rx="3.5" ry="2" fill="rgba(255,255,255,.7)"/></g></g></g>`;
  }
  box.innerHTML=h;
}

/* ---------- stage (capsule → card reveal) ---------- */
function stageReset(){
  $('reveal').innerHTML=''; $('multi').innerHTML=''; $('stageActions').innerHTML=''; $('stageHint').textContent='';
  $('burst').className='burst'; const cap=$('capsule');
  if(HAS_GSAP) gsap.set(cap,{clearProps:'all'});
  cap.querySelectorAll('.cap-top,.cap-bot').forEach(e=>e.removeAttribute('style'));
  cap.style.display='none'; cap.onclick=null;
}
function stageOpen(){
  stageReset();
  const st=$('stage');
  if(!st.classList.contains('open')){ st.classList.add('open'); document.body.style.overflow='hidden'; if(HAS_GSAP) gsap.fromTo(st,{opacity:0},{opacity:1,duration:.3}); }
}
function closeStage(){
  gBusy=false;
  const done=()=>{ $('stage').classList.remove('open'); stageReset(); document.body.style.overflow=''; renderAll(); };
  if(HAS_GSAP) gsap.to('#stage',{opacity:0,duration:.25,onComplete:()=>{ done(); gsap.set('#stage',{clearProps:'opacity'}); }}); else done();
}
function openStage(results){
  stageOpen();
  if(results.length===1) showCapsule(results[0]); else showMulti(results);
}
function flash(){ if(HAS_GSAP) gsap.fromTo('#stageFlash',{opacity:.85},{opacity:0,duration:.7,ease:'power2.out'}); }
function showCapsule(r){
  const real=r.tier, cap=$('capsule');
  let shown=real;
  if(tierIdx(real)>=3 && Math.random()<.5) shown = Math.random()<.5 ? 'common' : 'rare';
  else if(real==='legend' && Math.random()<.6) shown='sr';
  cap.dataset.tier=shown; cap.style.display='';
  $('stageHint').textContent=t('tapToOpen');
  if(HAS_GSAP) gsap.fromTo(cap,{y:-innerHeight*.7,rotation:-240,scale:.8},{y:0,rotation:0,scale:1,duration:1.1,ease:'bounce.out'});
  let busy=false;
  cap.onclick = async ()=>{
    if(busy) return; busy=true;
    if(cap.dataset.tier!==real){
      $('stageHint').textContent=t('tapAgain');
      if(HAS_GSAP){ await gsap.to(cap,{x:'random(-14,14)',rotation:'random(-18,18)',duration:.06,repeat:11,yoyo:true,repeatRefresh:true}); gsap.set(cap,{x:0,rotation:0}); }
      flash();
      const next = TIER_ORDER[Math.min(tierIdx(real), Math.max(tierIdx(cap.dataset.tier)+1, 3))];
      cap.dataset.tier=next;
      if(HAS_GSAP) gsap.fromTo(cap,{scale:1.4},{scale:1,duration:.6,ease:'back.out(3)'});
      if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(40); }catch(e){}
      if(next===real) $('stageHint').textContent=t('tapToOpen');
      busy=false; return;
    }
    await openCapsule(cap, r);
  };
}
async function openCapsule(cap, r){
  $('stageHint').textContent='';
  if(HAS_GSAP){
    await gsap.to(cap,{rotation:14,duration:.07,repeat:5,yoyo:true,ease:'power1.inOut'});
    gsap.set(cap,{rotation:0});
    gsap.to(cap.querySelector('.cap-top'),{y:-160,rotation:-50,opacity:0,duration:.6,ease:'power2.out'});
    gsap.to(cap.querySelector('.cap-bot'),{y:160,rotation:35,opacity:0,duration:.6,ease:'power2.out'});
    flash();
    await new Promise(res=>setTimeout(res,220));
  }
  cap.style.display='none';
  revealCard(r);
}
function quipFor(tier){
  if(tier==='salt'){ const q=L().saltQuips; return q[Math.floor(Math.random()*q.length)]; }
  return t('quip_'+tier);
}
function revealCard(r){
  const b=$('burst'); b.dataset.tier=r.tier; b.className='burst on';
  $('reveal').innerHTML = cardHTML(r.ch, { isNew:r.isNew, shards:r.shards, count:S.gacha.owned[r.ch.id], quip:quipFor(r.tier) });
  const card=$('reveal').querySelector('.gcard');
  if(HAS_GSAP){
    gsap.fromTo(card,{rotationY:180,scale:.4,opacity:0},{rotationY:0,scale:1,opacity:1,duration:.9,ease:'back.out(1.4)'});
    gsap.fromTo('#reveal .gc-under',{opacity:0,y:10},{opacity:1,y:0,duration:.4,delay:.6});
  }
  const ti=tierIdx(r.tier);
  if(ti>=3) celebrate(ti===4?2.2:1.3); else if(ti===2) celebrate(.6);
  if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(ti>=3?[50,40,120]:25); }catch(e){}
  const again = S.gacha.tickets>=1 ? `<button class="st-btn ghost press" id="stAgain">${icon('sparkles')}${t('again')}</button>` : '';
  $('stageActions').innerHTML = again + `<button class="st-btn press" id="stKeep">${t('keep')}</button>`;
  if($('stAgain')) $('stAgain').onclick=()=>{ gBusy=false; startPull('one'); };
  $('stKeep').onclick=closeStage;
}
function showMulti(res){
  const m=$('multi');
  m.innerHTML=res.map(r=>`<div class="mslot"><div class="capsule sm" data-tier="${r.tier}"><div class="cap-top"></div><div class="cap-bot"></div><div class="cap-shine"></div></div></div>`).join('');
  if(HAS_GSAP) gsap.fromTo('#multi .capsule',{y:-innerHeight,rotation:-180},{y:0,rotation:0,duration:.9,stagger:.06,ease:'bounce.out'});
  $('stageActions').innerHTML=`<button class="st-btn press" id="stOpenAll">${t('openAll')}</button>`;
  $('stOpenAll').onclick=()=>openAll(res);
}
async function openAll(res){
  $('stageActions').innerHTML='';
  const slots=[...document.querySelectorAll('#multi .mslot')];
  for(let i=0;i<slots.length;i++){
    const r=res[i];
    slots[i].innerHTML=miniCardHTML(r.ch,{isNew:r.isNew, tiny:true});
    if(HAS_GSAP){
      gsap.fromTo(slots[i].firstElementChild,{rotationY:180,scale:.5,opacity:0},{rotationY:0,scale:1,opacity:1,duration:.45,ease:'back.out(1.7)'});
      if(tierIdx(r.tier)>=3){ flash(); await new Promise(x=>setTimeout(x,420)); } else await new Promise(x=>setTimeout(x,130));
    }
  }
  const best=Math.max(...res.map(r=>tierIdx(r.tier)));
  const b=$('burst'); b.dataset.tier=TIER_ORDER[best]; b.className='burst on';
  celebrate(best>=4?2.2:best>=3?1.3:.7);
  $('stageHint').textContent=t('multiSummary',{n:res.filter(r=>r.isNew).length, s:res.reduce((a,r)=>a+r.shards,0)});
  $('stageActions').innerHTML=`<button class="st-btn press" id="stKeep">${t('keep')}</button>`;
  $('stKeep').onclick=closeStage;
}
function showDetail(id){
  const ch=CHAR_BY_ID[id], cnt=S.gacha.owned[id]; if(!ch || !cnt) return;
  stageOpen();
  const b=$('burst'); b.dataset.tier=ch.tier; b.className='burst on';
  $('reveal').innerHTML=cardHTML(ch,{count:cnt});
  if(HAS_GSAP) gsap.fromTo('#reveal .gcard',{scale:.7,opacity:0,rotationY:-30},{scale:1,opacity:1,rotationY:0,duration:.55,ease:'back.out(1.6)'});
  const isB=S.gacha.buddy===id;
  $('stageActions').innerHTML=`<button class="st-btn ghost press" id="stBuddy" ${isB?'disabled':''}>${icon('heart')}${isB?t('isBuddy'):t('setBuddy')}</button><button class="st-btn press" id="stKeep">${t('close')}</button>`;
  $('stBuddy').onclick=()=>{ S.gacha.buddy=id; save(); renderAll(); toast(t('buddySet',{name:ch.name[lang]})); closeStage(); };
  $('stKeep').onclick=closeStage;
}

/* ---------- card markup ---------- */
function cardHTML(ch,o={}){
  const under = o.isNew===false && o.shards ? t('dupe',{n:o.shards}) : o.count ? t('owned',{n:o.count}) : '';
  return `<div class="gcard t-${ch.tier}"><div class="gcard-in">
      <div class="gc-top"><span class="tier-pill">${t('tier_'+ch.tier)}</span><span class="gc-no">#${String(ch.no).padStart(2,'0')}</span></div>
      <div class="gc-art">${charSVG(ch)}</div>
      <div class="gc-meta"><div class="gc-stars">${'★'.repeat(TIERS[ch.tier].stars)}</div><div class="gc-set" style="--sc:${SET_BY_ID[ch.set].color}">${icon(SET_BY_ID[ch.set].icon)}${SET_BY_ID[ch.set].name[lang]}</div><div class="gc-name">${ch.name[lang]}</div><div class="gc-desc">${ch.desc[lang]}</div></div>
      ${o.isNew?`<span class="gc-new">${t('newTag')}</span>`:''}
    </div></div>
    <div class="gc-under">${under}${o.quip?`<div class="gc-quip">${o.quip}</div>`:''}</div>`;
}
function miniCardHTML(ch,o={}){
  if(o.locked) return `<div class="mcard locked"><div class="mcard-in"><div class="mc-art">${charSVG(ch)}</div><div class="mc-name">???</div></div></div>`;
  return `<div class="mcard t-${ch.tier} ${o.tiny?'tiny':''}"><div class="mcard-in">
      ${o.count>1?`<span class="mc-cnt">×${o.count}</span>`:''}${o.buddy?`<span class="mc-buddy">${icon('heart')}</span>`:''}${o.isNew?`<span class="mc-new">${t('newTag')}</span>`:''}
      <div class="mc-art">${charSVG(ch)}</div><div class="mc-stars">${'★'.repeat(TIERS[ch.tier].stars)}</div><div class="mc-name">${ch.name[lang]}</div>
    </div></div>`;
}

/* ---------- render rewards tab ---------- */
function renderRewards(){
  const g=S.gacha;
  renderMachine();
  countTo($('wTickets'), g.tickets); countTo($('wGold'), g.gold); countTo($('wShards'), g.shards);
  countTo($('wCoins'), coinsLeft());
  if($('shop').classList.contains('open')) $('shopCoins').textContent = coinsLeft().toLocaleString(L().locale);
  $('exBtn').disabled = g.shards<10;
  $('pityText').innerHTML = t('pity',{n:`<b>${PITY-g.pity}</b>`});
  $('pull1').disabled = g.tickets<1; $('pull10').disabled = g.tickets<10;
  $('pullGold').hidden = g.gold<1;

  // quests
  const a=allQuests(); questIndex={};
  [...a.daily,...a.weekly,...a.milestones].forEach(q=>questIndex[q.id]=q);
  const d=fromKey(a.k), mon=mondayOf(d);
  const group=(ic,title,aside,list)=> list.length ? `<div class="q-group"><div class="q-head">${icon(ic)}<b>${title}</b><span>${aside}</span></div><div class="list">${list.map(questRow).join('')}</div></div>` : '';
  $('questList').innerHTML =
    group('sun', t('qDaily'), t('nightOf',{d:`${L().daysShort[d.getDay()]} ${fmtDate(d)}`}), a.daily) +
    group('calendar-check', t('qWeekly'), `${fmtDate(mon)} – ${fmtDate(addDays(mon,6))}`, a.weekly) +
    group('medal', t('qMilestone'), '', a.milestones);
  const ready=[...a.daily,...a.weekly,...a.milestones].filter(isClaimable).length;
  $('questCount').textContent = ready ? t('readyCount',{n:ready}) : '';

  // collection
  const own=ownedCount();
  $('collCount').textContent = t('collected',{n:own, m:CHARS.length});
  $('tierProg').innerHTML = TIER_ORDER.map(k=>{
    const all=CHARS.filter(c=>c.tier===k), got=all.filter(c=>g.owned[c.id]).length;
    return `<span class="tp t-${k}"><i></i>${t('tier_'+k)} ${got}/${all.length}</span>`;
  }).join('');
  $('collGrid').innerHTML = SETS.map(s=>{
    const q=setQuest(s), done=q.cur>=q.goal, claimed=!!S.quests.claimed[q.id], pct=Math.round(q.cur/q.goal*100);
    const side = claimed ? `<span class="cset-done">${icon('check')}${t('setDone')}</span>`
      : done ? `<button class="q-claim cset-claim press" data-q="${q.id}">${t('claim')}</button>`
      : `<span class="q-rw">${rewardChips(s.reward)}</span>`;
    const cards = CHARS.filter(c=>c.set===s.id).map(c=>`<button class="cslot press" data-id="${c.id}" aria-label="${g.owned[c.id]?escapeHtml(c.name[lang]):'???'}">${miniCardHTML(c,{locked:!g.owned[c.id], count:g.owned[c.id], buddy:g.buddy===c.id})}</button>`).join('');
    return `<section class="cset ${done?'is-done':''} ${done&&!claimed?'is-ready':''}" style="--sc:${s.color}">
      <div class="cset-head"><div class="cset-ic">${icon(s.icon)}</div>
        <div class="cset-t"><b>${s.name[lang]}</b><div class="cset-sub"><div class="cset-bar"><i style="width:${pct}%"></i></div><span>${q.cur}/${q.goal}</span></div></div>
        <div class="cset-side">${side}</div></div>
      <div class="coll-grid">${cards}</div></section>`;
  }).join('');

  // badges / strip
  const dot = ready>0 || g.tickets>0 || g.gold>0;
  $('rwDot').hidden = !dot;
  $('rwStripText').textContent = t('homeRewards',{t:g.tickets, q:ready});
  $('rwStrip').classList.toggle('hot', dot);
}
function questRow(q){
  const claimed=!!S.quests.claimed[q.id], ready=isClaimable(q), pct=Math.min(100,q.cur/q.goal*100);
  const btn = claimed ? `<span class="q-done">${icon('check')}${t('claimed')}</span>`
    : `<button class="q-claim press" data-q="${q.id}" ${ready?'':'disabled'}>${ready?t('claim'):`${Math.min(q.cur,q.goal)}/${q.goal}`}</button>`;
  return `<div class="q-row ${claimed?'is-claimed':''} ${ready?'is-ready':''}"><div class="q-ic">${icon(q.icon)}</div>
    <div class="q-main"><b>${q.title}</b><div class="q-bar"><i style="width:${pct}%"></i></div></div>
    <div class="q-side"><span class="q-rw">${rewardChips(q.reward)}</span>${btn}</div></div>`;
}
function showRates(){
  const rows = TIER_ORDER.slice().reverse().map(k=>`<div class="rate-row"><span class="tp t-${k}"><i></i>${t('tier_'+k)}</span><span class="stars">${'★'.repeat(TIERS[k].stars)}</span><span class="pct">${TIERS[k].rate}%</span></div>`).join('');
  $('ratesBody').innerHTML = rows + `<ul class="rate-notes"><li>${t('ratePity')}</li><li>${t('rate10')}</li><li>${t('rateGold')}</li><li>${t('rateDupe')}</li></ul>`;
  $('rates').classList.add('open');
  if(HAS_GSAP) gsap.fromTo('#rates .rm-panel',{y:'100%'},{y:0,duration:.45,ease:'power4.out'});
}

$('questList').addEventListener('click', e=>{ const b=e.target.closest('.q-claim'); if(b && !b.disabled) claimQuest(b.dataset.q, b); });
$('collGrid').addEventListener('click', e=>{
  const c=e.target.closest('.cset-claim'); if(c){ questIndex[c.dataset.q] ||= setQuest(SET_BY_ID[c.dataset.q.slice(4)]); claimQuest(c.dataset.q, c); return; }
  const b=e.target.closest('.cslot'); if(b) showDetail(b.dataset.id);
});
$('pull1').onclick=()=>startPull('one');
$('pull10').onclick=()=>startPull('ten');
$('pullGold').onclick=()=>startPull('gold');
$('exBtn').onclick=()=>{ const g=S.gacha; if(g.shards<10) return; g.shards-=10; g.tickets++; save(); renderRewards(); pop($('wallet')); toast(t('exchanged')); };
$('ratesBtn').onclick=showRates;
$('ratesClose').onclick=$('ratesBg').onclick=()=>$('rates').classList.remove('open');
$('rwStrip').onclick=()=>showTab('rewards');
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('stage').classList.contains('open') && !$('capsule').offsetParent) closeStage(); });

/* ---------- onboarding tour (NPC guide "Moonie") ---------- */
const STEPS = [
  { key:'t_welcome', mood:'excited', wave:true },
  { key:'t_name',    mood:'happy',   type:'name', top:true },
  { key:'t_hero',    mood:'happy',   tab:'home', target:'#hero' },
  { key:'t_cutoff',  mood:'think',   tab:'home', target:'#hero .hero-metrics', type:'cutoff' },
  { key:'t_sos',     mood:'wink',    tab:'home', target:'#sosBtn' },
  { key:'t_checkin', mood:'happy',   tab:'home', target:'#ciCard' },
  { key:'t_week',    mood:'excited', tab:'home', target:'#week' },
  { key:'t_charts',  mood:'think',   tab:'progress', target:'#weekCard' },
  { key:'t_cal',     mood:'wink',    tab:'progress', target:'#calCard' },
  { key:'t_badges',  mood:'excited', tab:'profile', target:'#badges' },
  { key:'t_run',     mood:'excited', tab:'run', target:'#runCta' },
  { key:'t_gacha',   mood:'excited', tab:'rewards', target:'#machineCard' },
  { key:'t_help',    mood:'happy',   tab:'home', target:'#helpBtn', round:true },
  { key:'t_done',    mood:'excited', wave:true, final:true },
];
let tour = null;
const hole = { x:0, y:0, w:0, h:0, r:26 };
function drawHole(){
  const W=innerWidth, H=innerHeight, {x,y,w,h}=hole, r=Math.max(0,Math.min(hole.r, w/2, h/2));
  let p = `M0 0H${W}V${H}H0Z`;
  if(w>2 && h>2) p += ` M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
  $('shade').style.clipPath = `path(evenodd, "${p}")`;
  Object.assign($('spot').style, { left:x+'px', top:y+'px', width:w+'px', height:h+'px', borderRadius:r+'px' });
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const escapeHtml = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function graphemes(s){ try{ return [...new Intl.Segmenter(lang,{granularity:'grapheme'}).segment(s)].map(x=>x.segment); }catch(e){ return Array.from(s); } }
function tourVars(){
  const n=S.settings.name;
  return lang==='th'
    ? { hi: n ? `ยินดีที่ได้รู้จักนะ คุณ${n}!\n` : '', nm: n ? ` คุณ${n}` : '' }
    : { hi: n ? `Nice to meet you, ${n}!\n` : '',      nm: n ? `, ${n}` : '' };
}

function startTour(){
  if(tour || $('sos').classList.contains('open')) return;
  tour = { i:-1, typing:null, run:0, firstTime:!S.tourDone };
  $('tour').classList.add('open'); document.body.style.overflow='hidden';
  Object.assign(hole,{ x:innerWidth/2, y:innerHeight*0.38, w:0, h:0 }); drawHole(); $('spot').style.opacity=0;
  if(HAS_GSAP){
    gsap.fromTo('#tour',{opacity:0},{opacity:1,duration:.35});
    gsap.fromTo('#dlg',{y:60,opacity:0},{y:0,opacity:1,duration:.6,ease:'back.out(1.5)',delay:.1});
    gsap.fromTo('#mascot',{scale:.3,rotate:-25},{scale:1,rotate:0,duration:.8,ease:'elastic.out(1,.55)',delay:.25});
  }
  goStep(0);
}

function endTour(completed){
  if(!tour) return;
  clearInterval(tour.typing);
  const first = tour.firstTime;
  S.tourDone = true;
  if(completed && first) gainXP(20);
  save();
  const fin = ()=>{
    $('tour').classList.remove('open'); document.body.style.overflow=''; tour=null;
    showTab('home'); renderAll();
    if(completed){ celebrate(1); if(first) toast(t('tourGift')); }
  };
  if(HAS_GSAP) gsap.to('#tour',{opacity:0,duration:.3,onComplete:()=>{ fin(); gsap.set('#tour',{clearProps:'opacity'}); }});
  else fin();
}

async function goStep(i){
  const run = ++tour.run, st = STEPS[i];
  tour.i = i;
  clearInterval(tour.typing); tour.typing=null; tour.onTyped=null;
  $('dlgBox').classList.remove('ready');
  $('tourDots').innerHTML = STEPS.map((_,k)=>`<i class="${k===i?'on':k<i?'done':''}"></i>`).join('');
  $('tourNext').textContent = st.final ? t('tourStart') : st.type==='name' ? t('tourNoName') : t('tourNext');
  $('tourSkip').style.visibility = st.final ? 'hidden' : 'visible';
  $('dlgExtra').innerHTML=''; $('dlgText').textContent='';
  const m=$('moonie'); m.dataset.mood=st.mood; m.classList.toggle('wave', !!st.wave);
  if(HAS_GSAP && i>0) gsap.fromTo('#mascot',{y:0},{y:-12,duration:.18,yoyo:true,repeat:1,ease:'power2.out'});
  if(st.tab && st.tab!==tab){ showTab(st.tab); await sleep(650); } else await sleep(40);
  if(!tour || run!==tour.run) return;
  await layoutStep(true);
  if(!tour || run!==tour.run) return;
  typeText(t(st.final && !tour.firstTime ? 't_doneAgain' : st.key, tourVars()), ()=>renderExtra(st));
}

async function layoutStep(scroll){
  if(!tour) return;
  const st=STEPS[tour.i], el=st.target && document.querySelector(st.target);
  let rect=null;
  if(el){
    if(scroll){ const r=el.getBoundingClientRect(); window.scrollTo(0, Math.max(0, window.scrollY + r.top - 96)); await sleep(70); }
    rect = el.getBoundingClientRect();
  }
  const need = $('dlgBox').offsetHeight + 110;
  const top = st.top || (rect && rect.bottom > innerHeight - need && rect.top > need);
  $('dlg').classList.toggle('top', !!top);
  const pad = 8;
  const box = rect
    ? { x:rect.left-pad, y:rect.top-pad, w:rect.width+pad*2, h:rect.height+pad*2, r: st.round ? 999 : 26 }
    : { x:innerWidth/2, y:innerHeight*0.38, w:0, h:0, r:26 };
  if(HAS_GSAP){
    gsap.to(hole,{...box, duration:.55, ease:'power3.inOut', onUpdate:drawHole});
    gsap.to('#spot',{opacity: rect ? 1 : 0, duration:.3, delay: rect ? .35 : 0});
  }else{ Object.assign(hole, box); drawHole(); $('spot').style.opacity = rect ? 1 : 0; }
}

function typeText(str, done){
  const g=graphemes(str), el=$('dlgText');
  let k=0;
  tour.full=str; tour.onTyped=done;
  $('moonie').classList.add('talking');
  if(REDUCE){ finishTyping(); return; }
  tour.typing = setInterval(()=>{ k++; el.textContent=g.slice(0,k).join(''); if(k>=g.length) finishTyping(); }, 24);
}
function finishTyping(){
  if(!tour) return;
  clearInterval(tour.typing); tour.typing=null;
  $('dlgText').textContent = tour.full;
  $('moonie').classList.remove('talking');
  $('dlgBox').classList.add('ready');
  const cb=tour.onTyped; tour.onTyped=null; if(cb) cb();
}
function advance(){
  if(!tour) return;
  if(tour.typing){ finishTyping(); return; }
  const st=STEPS[tour.i];
  if(st.final) endTour(true); else goStep(tour.i+1);
}

function renderExtra(st){
  const x=$('dlgExtra');
  if(st.type==='name'){
    x.innerHTML = `<form class="dlg-input" id="nameForm"><input id="tourName" maxlength="20" autocomplete="nickname" enterkeyhint="done" placeholder="${escapeHtml(t('fNamePh'))}" value="${escapeHtml(S.settings.name)}"><button type="submit">${escapeHtml(t('tourOk'))}</button></form>`;
    $('nameForm').onsubmit = e=>{
      e.preventDefault();
      const v=$('tourName').value.trim();
      if(v){ S.settings.name=v; save(); renderAll(); }
      $('tourName').blur(); goStep(tour.i+1);
    };
  }else if(st.type==='cutoff'){
    const opts=['16:00','17:00','18:00','19:00'];
    x.innerHTML = `<div class="dlg-choices">${opts.map(o=>`<button data-v="${o}" class="${o===S.settings.cutoff?'sel':''}">${o}</button>`).join('')}</div>`;
    x.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const v=b.dataset.v;
      if(v<=S.settings.breakfast){ toast(t('errCut')); return; }
      S.settings.cutoff=v; save(); renderAll();
      x.querySelectorAll('button').forEach(o=>o.classList.toggle('sel', o===b)); pop(b);
      setTimeout(()=>{ if(tour && STEPS[tour.i]===st) goStep(tour.i+1); }, 450);
    });
  }
  if(HAS_GSAP && x.innerHTML) gsap.fromTo(x,{opacity:0,y:8},{opacity:1,y:0,duration:.35});
}

$('dlgBox').addEventListener('click', e=>{ if(e.target.closest('button,input,form')) return; advance(); });
$('tour').addEventListener('click', e=>{ if(e.target===$('tour')) advance(); });
$('tourNext').onclick = e=>{ e.stopPropagation(); advance(); };
$('tourSkip').onclick = e=>{ e.stopPropagation(); endTour(false); };
$('mascot').onclick = e=>{
  e.stopPropagation();
  const m=$('moonie'); m.dataset.mood='wink'; pop($('mascot'));
  setTimeout(()=>{ if(tour) m.dataset.mood=STEPS[tour.i].mood; }, 800);
};
document.addEventListener('keydown', e=>{
  if(!tour || e.target.tagName==='INPUT') return;
  if(e.key==='Enter' || e.key===' ' || e.key==='ArrowRight'){ e.preventDefault(); advance(); }
  else if(e.key==='Escape') endTour(false);
});
window.addEventListener('resize', ()=>{ if(tour) layoutStep(false); });
$('helpBtn').onclick = ()=>startTour();
$('replayTour').onclick = ()=>{ showTab('home'); setTimeout(startTour, 350); };

/* ---------- treadmill runs ----------
   No GPS on a treadmill, so a run is the console settings over time: segments [t, km/h, incline%],
   each holding until the next one (t = seconds of moving time). Distance, pace, climb and calories
   are all derived from them, and fixing the totals after a run just rescales the segments. */
const RUN_KEY = 'skipdinner.run';          // the run in progress, kept on this device only
const RUN_PREFS = 'skipdinner.runPrefs';   // last speed/incline used, to start the next run there
const SPEED_CHIPS = [4,5,6,8,10,12], INCLINE_CHIPS = [0,1,2,4,6,8];
const r1 = v => Math.round(v*10)/10;
const runKg = () => Math.min(250, Math.max(25, Number(S.settings.weight)||60));
function runPrefs(){ try{ return JSON.parse(localStorage.getItem(RUN_PREFS)) || {}; }catch(e){ return {}; } }
function totalKm(){ return (S.runs||[]).reduce((a,r)=>a+r.dist,0); }
function dayStart(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function runsBetween(from, days){ const a=from.getTime(), b=addDays(from,days).getTime(); return S.runs.filter(r=>r.at>=a && r.at<b); }
function runTitle(r){ const d=new Date(r.at); return L().runTitle(d.getHours(), L().days[d.getDay()]); }
function runWhen(r){ const d=new Date(r.at); return `${fmtDate(d)} · ${d.toLocaleTimeString(L().locale,{hour:'2-digit',minute:'2-digit'})}`; }
/* started within an hour before closing time up to 4 hours after: running instead of dinner */
function isDinnerRun(r){ const d=new Date(r.at), [h,m]=S.settings.cutoff.split(':').map(Number), x=d.getHours()*60+d.getMinutes(), c=h*60+m; return x>=c-60 && x<=c+240; }

/* stepped speed line (+ incline) for a run, drawn in a w×h box */
function profileSVG(r, w, h, withInc){
  const T=r.dur||1, speeds=r.segs.map(s=>s[1]), maxS=Math.max(...speeds, 1), maxI=Math.max(...r.segs.map(s=>s[2]), 0);
  const lo=Math.min(...speeds)*.6;   // start the speed axis below the slowest speed so changes are visible
  const y = (v,a,b) => (h - (v-a)/((b-a)||1)*h*.86).toFixed(1);
  let line='', inc='';
  r.segs.forEach(([ts,sp,ic],k)=>{
    const x1=(ts/T*w).toFixed(1), x2=((k+1<r.segs.length ? r.segs[k+1][0] : T)/T*w).toFixed(1);
    line += `${k?'L':'M'}${x1} ${y(sp,lo,maxS)}H${x2}`;
    inc  += `${k?'L':'M'}${x1} ${y(Math.max(0,ic),0,maxI*1.25||1)}H${x2}`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="sp-area" d="${line}V${h}H0Z"/><path class="sp-line" d="${line}"/>${withInc && maxI>0 ? `<path class="inc-line" d="${inc}"/>` : ''}</svg>`;
}
/* saved runs use this device's body weight for calories */
const buildRun = o => buildRunCore(o, runKg());
function commitRun(run){
  S.runs = S.runs.filter(r=>r.id!==run.id); S.runs.push(run); S.runs.sort((a,b)=>a.at-b.at);
  const xp=runXP(run.dist), sh=Math.floor(run.dist);
  gainXP(xp); S.gacha.shards += sh;
  checkBadges(); save(); renderAll();
  return { xp, sh };
}
function deleteRun(id){
  const r=S.runs.find(x=>x.id===id);
  if(!r || !confirm(t('runDeleteConfirm'))) return;
  S.runs = S.runs.filter(x=>x.id!==id); S.runDel[id]=Date.now();
  gainXP(-runXP(r.dist)); S.gacha.shards = Math.max(0, S.gacha.shards - Math.floor(r.dist));
  save(); renderAll(); closeModal('runSheet'); toast(t('runDeleted'));
}
/* vibrate only after a real tap, as browsers require */
function buzz(p){ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try{ navigator.vibrate(p); }catch(e){} }
const newRunId = () => 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---- live run ---- */
function loadRun(){ try{ const r=JSON.parse(localStorage.getItem(RUN_KEY)); return r && Array.isArray(r.segs) && r.segs.length ? r : null; }catch(e){ return null; } }
function keepRun(){ try{ R ? localStorage.setItem(RUN_KEY, JSON.stringify(R)) : localStorage.removeItem(RUN_KEY); }catch(e){} }
let R = loadRun(), wakeLock = null, runShow = 10, sumFeel = 0, logFeel = 0, kcalTouched = false;
const runT = (now=Date.now()) => R ? R.acc + (R.since ? (now-R.since)/1000 : 0) : 0;
const runNow = () => { const T=runT(); return { T, ...segTotals(R.segs, T, runKg()) }; };
const liveOpen = () => $('runLive').classList.contains('open');
async function wake(on){
  try{
    if(on && !wakeLock && 'wakeLock' in navigator){ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', ()=>{ wakeLock=null; }); }
    else if(!on && wakeLock){ const w=wakeLock; wakeLock=null; await w.release(); }
  }catch(e){}
}
function runSet(speed, incline){
  if(!R) return;
  speed = r1(Math.min(25, Math.max(0, speed))); incline = r1(Math.min(15, Math.max(-3, incline)));
  if(speed===R.speed && incline===R.incline) return;
  R.speed=speed; R.incline=incline;
  const now=Math.round(runT()), segs=R.segs, last=segs[segs.length-1];
  if(now-last[0] < 2){
    last[1]=speed; last[2]=incline;
    const prev=segs[segs.length-2]; if(prev && prev[1]===speed && prev[2]===incline) segs.pop();
  } else segs.push([now, speed, incline]);
  keepRun(); drawLive();
  try{ localStorage.setItem(RUN_PREFS, JSON.stringify({speed, incline})); }catch(e){}
}
function startRun(){
  if(R){ openLive(); return; }
  const p=runPrefs(), sp=r1(p.speed ?? 6), inc=r1(p.incline ?? 1);
  R = { id:newRunId(), at:Date.now(), segs:[[0,sp,inc]], speed:sp, incline:inc, acc:0, since:null, km:0, kmT:0 };
  openLive();
  countdown(()=>{ if(!R) return; R.at=Date.now(); R.since=Date.now(); keepRun(); wake(true); drawLive(); });
}
function countdown(done){
  const el=$('rlCount');
  if(REDUCE){ done(); return; }
  const seq=[3,2,1,t('runGo')]; let i=0;
  el.classList.add('on');
  const step=()=>{
    if(i===seq.length){ el.classList.remove('on'); el.innerHTML=''; return; }
    el.innerHTML=`<span>${seq[i]}</span>`;
    if(HAS_GSAP) gsap.fromTo(el.firstChild,{scale:1.8,opacity:0},{scale:1,opacity:1,duration:.45,ease:'back.out(2)'});
    buzz(i===3?120:30);
    if(i===3) done();
    i++; setTimeout(step, i===4 ? 600 : 800);
  };
  step();
}
function openLive(){
  if(!R) return;
  const el=$('runLive'); el.classList.remove('sum'); el.classList.add('open'); document.body.style.overflow='hidden';
  drawLive(); drawPill();
  if(HAS_GSAP) gsap.fromTo(el,{opacity:0,y:28},{opacity:1,y:0,duration:.4,ease:'power3.out',clearProps:'opacity,transform'});
  if(R.since) wake(true);
}
function closeLive(){ $('runLive').classList.remove('open','sum'); document.body.style.overflow=''; wake(false); renderRun(); drawPill(); }
function drawLive(){
  if(!R) return;
  const n=runNow(), paused=!R.since;
  $('rlTime').textContent = hms(n.T*1000);
  $('rlDist').textContent = kmStr(n.dist);
  $('rlPace').textContent = paceStr(R.speed>0 ? 3600/R.speed : NaN);
  $('rlKcal').textContent = Math.round(n.kcal);
  $('rlElev').textContent = Math.round(n.elev);
  $('rlSpeed').textContent = R.speed.toFixed(1);
  $('rlInc').textContent = R.incline.toFixed(1);
  document.querySelectorAll('#rlSpeedChips button').forEach(b=>b.classList.toggle('sel', Number(b.dataset.v)===R.speed));
  document.querySelectorAll('#rlIncChips button').forEach(b=>b.classList.toggle('sel', Number(b.dataset.v)===R.incline));
  $('runLive').classList.toggle('paused', paused);
  $('rlState').textContent = t(paused ? 'runPaused' : 'runOn');
}
function drawPill(){
  const p=$('runPill'), on=!!R && !liveOpen();
  p.classList.toggle('on', on);
  if(!on) return;
  p.classList.toggle('paused', !R.since);
  const n=runNow(); $('runPillText').textContent = `${hms(n.T*1000)} · ${kmStr(n.dist)} km`;
}
/* a toast + buzz at every full kilometre, like a running watch */
function checkSplit(){
  if(!R?.since) return;
  const n=runNow(), km=Math.floor(n.dist+1e-9), was=R.km||0;
  if(km<=was) return;
  const sec=n.T-(R.kmT||0);
  R.km=km; R.kmT=n.T; keepRun();
  if(km!==was+1) return;
  toast(t('runSplit',{n:km, p:paceStr(sec)}));
  buzz([60,40,60]);
  if(liveOpen()) pop($('rlDist').parentElement);
}
setInterval(()=>{ if(!R) return; checkSplit(); if(liveOpen()) drawLive(); drawPill(); }, 500);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && R?.since && liveOpen()) wake(true); });

$('rlSpeedChips').innerHTML = SPEED_CHIPS.map(v=>`<button type="button" class="press" data-v="${v}">${v}</button>`).join('');
$('rlIncChips').innerHTML = INCLINE_CHIPS.map(v=>`<button type="button" class="press" data-v="${v}">${v}</button>`).join('');
$('rlSpeedChips').onclick = e=>{ const b=e.target.closest('button'); if(b && R) runSet(Number(b.dataset.v), R.incline); };
$('rlIncChips').onclick = e=>{ const b=e.target.closest('button'); if(b && R) runSet(R.speed, Number(b.dataset.v)); };
/* −/+ step once on tap and keep stepping while held, like the console buttons */
document.querySelectorAll('#runLive [data-adj]').forEach(b=>{
  let hold=null, rep=null;
  const step=()=>{ if(!R) return; const d=Number(b.dataset.d); b.dataset.adj==='speed' ? runSet(R.speed+d, R.incline) : runSet(R.speed, R.incline+d); };
  const stop=()=>{ clearTimeout(hold); clearInterval(rep); hold=rep=null; };
  b.addEventListener('pointerdown', e=>{ e.preventDefault(); stop(); step(); hold=setTimeout(()=>{ rep=setInterval(step, 85); }, 420); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev, stop));
  b.addEventListener('click', e=>{ if(e.detail===0) step(); });   // keyboard
  b.addEventListener('contextmenu', e=>e.preventDefault());
});
$('rlPause').onclick = ()=>{ if(!R?.since) return; R.acc=runT(); R.since=null; keepRun(); wake(false); drawLive(); };
$('rlResume').onclick = ()=>{ if(!R || R.since) return; R.since=Date.now(); keepRun(); wake(true); drawLive(); };
$('rlMin').onclick = closeLive;
$('runPill').onclick = openLive;

/* ---- finish: confirm the numbers against the treadmill screen, then save ---- */
function drawFeel(id, val){ $(id).innerHTML = [1,2,3].map(v=>`<button type="button" class="press ${v===val?'sel':''}" data-v="${v}">${t('feel'+v)}</button>`).join(''); }
function sumDraft(){
  const dist=Number($('rsDist').value), dur=parseDur($('rsTime').value);
  return dist>0 && dur>0 ? buildRun({ id:R.id, at:R.at, segs:R.segs, rawDur:runT(), dur, dist, feel:sumFeel }) : null;
}
function drawSum(){
  const d = R && sumDraft();
  if(d && !kcalTouched) $('rsKcal').value = d.kcal;
  $('rsPace').textContent = d ? paceStr(runPace(d)) : '–:––';
  $('rsElev').innerHTML = d ? `${d.elev}<span class="u">m</span>` : '0';
  $('rsXP').textContent = '+' + (d ? runXP(d.dist) : 0);
}
function openSummary(){
  if(!R) return;
  if(R.since){ R.acc=runT(); R.since=null; keepRun(); }
  wake(false);
  const n=runNow();
  $('rsDist').value = kmStr(n.dist); $('rsTime').value = durStr(n.T); $('rsKcal').value = Math.round(n.kcal);
  sumFeel=0; kcalTouched=false; drawFeel('rsFeel', 0); drawSum();
  $('runLive').classList.add('sum'); $('runLive').scrollTop=0;
  if(HAS_GSAP) gsap.fromTo('#rlSum > *',{opacity:0,y:16},{opacity:1,y:0,duration:.45,stagger:.04,ease:'power3.out',clearProps:'opacity,transform'});
}
$('rlFinish').onclick = openSummary;
['rsDist','rsTime'].forEach(id=>$(id).addEventListener('input', drawSum));
$('rsKcal').addEventListener('input', ()=>{ kcalTouched = true; });
$('rsFeel').onclick = e=>{ const b=e.target.closest('button'); if(!b) return; sumFeel = sumFeel===Number(b.dataset.v) ? 0 : Number(b.dataset.v); drawFeel('rsFeel', sumFeel); };
$('rsSave').onclick = ()=>{
  if(!R) return;
  const dist=Number($('rsDist').value), dur=parseDur($('rsTime').value);
  if(!(dur>=60)) return toast(t('runTooShort'));
  if(!(dist>=0.01 && dist<=100 && dist/(dur/3600) <= 30)) return toast(t('runBadInput'));
  const kcal = kcalTouched ? Math.max(0, Math.round(Number($('rsKcal').value)||0)) : undefined;
  const run = buildRun({ id:R.id, at:R.at, segs:R.segs, rawDur:runT(), dur, dist, kcal, feel:sumFeel });
  R=null; keepRun();
  const rw = commitRun(run);
  closeLive(); showTab('run');
  toast(t('runSaved',{xp:rw.xp, s:rw.sh})); celebrate(1.1);
};
$('rsDiscard').onclick = ()=>{ if(!confirm(t('runDiscardConfirm'))) return; R=null; keepRun(); closeLive(); };

/* ---- bottom sheets (run detail, manual log, city, postcard, festival) ----
   Named openModal/closeModal so they do not clash with the calendar day sheet (openSheet/closeSheet). */
function openModal(id){ $(id).classList.add('open'); $(id).querySelector('.rm-panel').scrollTop=0; if(HAS_GSAP) gsap.fromTo(`#${id} .rm-panel`,{y:'100%'},{y:0,duration:.45,ease:'power4.out'}); }
function closeModal(id){
  if(!HAS_GSAP){ $(id).classList.remove('open'); return; }
  gsap.to(`#${id} .rm-panel`,{y:'100%',duration:.28,ease:'power3.in',onComplete:()=>{ $(id).classList.remove('open'); gsap.set(`#${id} .rm-panel`,{clearProps:'transform'}); }});
}
function openRunDetail(id){
  const r=S.runs.find(x=>x.id===id); if(!r) return;
  const sp=splits(r), whole=sp.filter(s=>!s.part), fast=Math.min(...whole.map(s=>s.sec));
  const cell=(k,v,u='')=>`<div><span class="k">${t(k)}</span><b class="num">${v}${u?`<small>${u}</small>`:''}</b></div>`;
  const splitRows = sp.map(s=>{ const pace=s.sec/(s.part||1); return `<div class="split ${!s.part && s.sec===fast && whole.length>1?'best':''}"><span class="km num">${s.km}</span><b class="num">${paceStr(pace)}</b><div class="bar"><i style="width:${Math.max(8, Math.min(100, (fast/pace)*100 || 100))}%"></i></div></div>`; }).join('');
  $('rdBody').innerHTML =
    `<h3 class="rd-title">${escHTML(runTitle(r))}</h3>
     <p class="rd-date">${L().days[new Date(r.at).getDay()]} · ${runWhen(r)}${r.manual?' · '+t('runManual'):''}${r.feel?' · '+t('feel'+r.feel):''}</p>
     <div class="rd-grid">
       ${cell('runDist', kmStr(r.dist), 'km')}${cell('runTime', durStr(r.dur))}${cell('runAvgPace', paceStr(runPace(r)), '/km')}
       ${cell('runAvgSpeed', (r.dist/(r.dur/3600)).toFixed(1), 'km/h')}${cell('runElev', r.elev||0, 'm')}${cell('runKcal', r.kcal||0, 'kcal')}
     </div>
     ${r.manual ? '' : `<div class="rd-h">${t('runProfile')}<span><span><i></i>${t('runSpeed')}</span>${Math.max(...r.segs.map(s=>s[2]))>0?`<span><i class="inc"></i>${t('runIncline')}</span>`:''}</span></div>
       <div class="rd-chart">${profileSVG(r, 320, 120, true)}</div><div class="rd-axis"><span>0:00</span><span>${durStr(r.dur)}</span></div>`}
     ${sp.length ? `<div class="rd-h">${t('runSplits')}<span>km · /km</span></div>${splitRows}` : ''}`;
  $('rdDel').onclick = ()=>deleteRun(id);
  openModal('runSheet');
}
$('rdClose').onclick = $('runSheetBg').onclick = ()=>closeModal('runSheet');
function openLog(){
  const d=new Date(); d.setSeconds(0,0);
  $('lgWhen').value = new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('lgWhen').max = $('lgWhen').value;
  ['lgMin','lgDist','lgKcal'].forEach(id=>$(id).value='');
  $('lgInc').value = runPrefs().incline ?? '';
  logFeel=0; drawFeel('lgFeel', 0);
  openModal('runLog');
}
$('lgFeel').onclick = e=>{ const b=e.target.closest('button'); if(!b) return; logFeel = logFeel===Number(b.dataset.v) ? 0 : Number(b.dataset.v); drawFeel('lgFeel', logFeel); };
$('lgSave').onclick = ()=>{
  const at=new Date($('lgWhen').value).getTime(), dur=Number($('lgMin').value)*60, dist=Number($('lgDist').value);
  const inc=Math.min(15, Math.max(-3, Number($('lgInc').value)||0)), kc=$('lgKcal').value.trim();
  if(!isFinite(at)) return toast(t('runBadInput'));
  if(at > Date.now()+60000) return toast(t('runFuture'));
  if(!(dur>=60)) return toast(t('runTooShort'));
  if(!(dist>=0.01 && dist<=100 && dist/(dur/3600) <= 30)) return toast(t('runBadInput'));
  const run = buildRun({ id:newRunId(), at, segs:[[0, dist/(dur/3600), r1(inc)]], rawDur:dur, dur, dist, kcal: kc==='' ? undefined : Math.max(0, Math.round(Number(kc)||0)), feel:logFeel, manual:true });
  const rw = commitRun(run);
  closeModal('runLog'); toast(t('runSaved',{xp:rw.xp, s:rw.sh})); celebrate(.8);
};
$('lgCancel').onclick = $('runLogBg').onclick = ()=>closeModal('runLog');

/* ---- Run tab ---- */
function runCard(r){
  const tags = (r.manual ? `<span class="rc-tag">${icon('pencil')}${t('runManual')}</span>` : '') + (isDinnerRun(r) ? `<span class="rc-tag dinner">${icon('moon-star')}${t('runDinner')}</span>` : '');
  return `<button class="card rcard press" data-run="${r.id}">
    <div class="rc-head"><div class="rc-ic">${icon('footprints')}</div><div class="t"><b>${escHTML(runTitle(r))}</b><span>${runWhen(r)}</span></div></div>
    ${tags ? `<div class="rc-tags">${tags}</div>` : ''}
    <div class="rc-stats">
      <div><span class="k">${t('runDist')}</span><b class="num">${kmStr(r.dist)}<small>km</small></b></div>
      <div><span class="k">${t('runPace')}</span><b class="num">${paceStr(runPace(r))}<small>/km</small></b></div>
      <div><span class="k">${t('runTime')}</span><b class="num">${durStr(r.dur)}</b></div>
    </div>
    ${r.manual ? '' : `<div class="rc-spark">${profileSVG(r, 300, 36, false)}</div>`}
  </button>`;
}
function renderRun(){
  const now=new Date(), mon=dayStart(mondayOf(now)), week=runsBetween(mon, 7);
  const sum=(list,f)=>list.reduce((a,r)=>a+(f(r)||0),0);
  countTo($('rwKm'), sum(week,r=>r.dist), v=>v.toFixed(1));
  $('rwSub').textContent = t('runWeekSub',{ n:week.length, time:hrsMin(sum(week,r=>r.dur)*1000), m:Math.round(sum(week,r=>r.elev)) });
  const days=[...Array(7)].map((_,i)=>sum(runsBetween(addDays(mon,i),1), r=>r.dist)), dmax=Math.max(...days,1), today=(now.getDay()+6)%7;
  $('rwBars').innerHTML = days.map((km,i)=>`<div class="${i===today?'today':''}"><div class="bar"><i class="${km?'on':''}" style="height:${Math.max(5, Math.round(km/dmax*70))}px"></i></div><span>${L().daysShort[(i+1)%7]}</span></div>`).join('');

  $('runCta').classList.toggle('live', !!R);
  $('runCtaText').textContent = t(R ? 'runBack' : 'runStart');

  const wks=[...Array(12)].map((_,k)=>{ const a=addDays(mon,-7*(11-k)); return { a, km:sum(runsBetween(a,7), r=>r.dist) }; });
  const wmax=Math.max(...wks.map(w=>w.km),1);
  $('wk12').innerHTML = wks.map((w,k)=>`<div class="${k===11?'cur':''}"><div class="bar"><i class="${w.km?'on':''}" style="height:${Math.max(4, Math.round(w.km/wmax*84))}px"></i></div><span>${k%4===0 ? `${w.a.getDate()}/${w.a.getMonth()+1}` : ''}</span></div>`).join('');
  $('wk12Avg').textContent = t('runWeeksAvg',{ km:(sum(wks,w=>w.km)/12).toFixed(1) });

  const recs=[];
  if(S.runs.length){
    const top=f=>S.runs.reduce((b,r)=>f(r)>f(b)?r:b);
    const lg=top(r=>r.dist); recs.push({ ic:'footprints', k:'recLongest', v:`${kmStr(lg.dist)} km`, r:lg });
    for(const [m,k] of [[1000,'rec1k'],[5000,'rec5k'],[10000,'rec10k']]){
      let best=Infinity, br=null; S.runs.forEach(r=>{ const s=bestTime(r,m); if(s<best){ best=s; br=r; } });
      if(br) recs.push({ ic:'timer', k, v:durStr(best), r:br });
    }
    const cl=top(r=>r.elev||0); if(cl.elev>0) recs.push({ ic:'mountain', k:'recClimb', v:`${cl.elev} m`, r:cl });
    const ln=top(r=>r.dur); recs.push({ ic:'activity', k:'recLong', v:durStr(ln.dur), r:ln });
  }
  $('runRecs').innerHTML = recs.length
    ? recs.map(x=>`<div class="row press" data-run="${x.r.id}" role="button" tabindex="0"><div class="ic">${icon(x.ic)}</div><div class="t"><b>${t(x.k)}</b><span>${fmtDate(new Date(x.r.at))}</span></div><div class="r num">${x.v}</div></div>`).join('')
    : `<div class="empty">${t('recNone')}</div>`;

  countTo($('rtCount'), S.runs.length);
  countTo($('rtKm'), totalKm(), v=>v.toFixed(1));
  countTo($('rtHrs'), sum(S.runs,r=>r.dur)/3600, v=>v.toFixed(1));

  const list=S.runs.slice().sort((a,b)=>b.at-a.at);
  $('runCountAside').textContent = list.length ? t('runCountN',{n:list.length}) : '';
  $('runFeed').innerHTML = list.length
    ? list.slice(0,runShow).map(runCard).join('') + (list.length>runShow ? `<button class="more-btn press" id="runMore">${t('runMore')}</button>` : '')
    : `<div class="card empty">${t('runEmpty')}</div>`;
}
$('runCta').onclick = startRun;
$('runLogBtn').onclick = openLog;
$('runFeed').onclick = e=>{ if(e.target.closest('#runMore')){ runShow+=10; renderRun(); return; } const c=e.target.closest('[data-run]'); if(c) openRunDetail(c.dataset.run); };
$('runRecs').onclick = e=>{ const c=e.target.closest('[data-run]'); if(c) openRunDetail(c.dataset.run); };
$('runRecs').addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.dataset.run){ e.preventDefault(); openRunDetail(e.target.dataset.run); } });

/* ---------- cloud sync (Supabase) ----------
   Local-first: the app always runs from localStorage. When signed in, the whole
   state is mirrored to one row per user in public.user_state (see supabase/schema.sql). */
var sb = null, cloudUser = null, syncState = 'wait', syncAt = 0, syncT = null, syncBusy = false, syncAgain = false, cloudLoading = null;
/* settles once the launch-time sync is over (or there is nothing to sync), so the splash can wait for fresh data */
let cloudFirstSettled = false, cloudFirstDone;
const cloudFirst = new Promise(r => { cloudFirstDone = () => { cloudFirstSettled = true; r(); }; });
const syncWaiters = [];   // resolved after the next sync attempt finishes
const nextSync = (cap=4000) => Promise.race([new Promise(r=>syncWaiters.push(r)), sleep(cap)]);
const cloudOn = () => !!(CLOUD.url && CLOUD.key);
const escHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function syncMeta(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }catch(e){ return {}; } }
function setSyncMeta(m){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify(m)); }catch(e){} }


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
      S = next; lastSnap = snapOf(S); persist();
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

function renderAccount(){
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
function cloudInit(){
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
function needGate(){
  if(!cloudOn() || hasSession()) return false;
  try{ return !localStorage.getItem(GATE_SKIP); }catch(e){ return false; }
}
function openGate(){
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
function maybeTour(){ if(!S.tourDone) setTimeout(startTour, 450); }
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

/* ---------- splash (loading screen) ----------
   Stays up for at least ~1.3s from launch, until the fonts are in, and — when signed
   in — until the launch sync has pulled fresh data (capped at 3s so offline never blocks). */
function splashMsg(text){ window.__spStop = true; clearInterval(window.__spTick); const m = $('spMsg'); if(m){ m.classList.remove('swap'); m.textContent = text; } }
function splashGate(){
  window.__spArmed = true;
  const sm = $('spMoonie');   // keep a copy of Moonie for the sign-in page before the splash is removed
  if(sm) moonieHTML = sm.outerHTML.replace(' id="spMoonie"', '').replace(/spFace/g, 'gtFace');
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

/* ---------- boot ---------- */
applyStatic(); checkBadges(); save(); renderAll(); showTab('home');
setInterval(()=>{ if(tab==='home') renderTimer(); }, 1000);
cloudInit();
splashGate();
let lastNight = nightKey();
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ renderAll(); } });
setInterval(()=>{ const n=nightKey(); if(n!==lastNight){ lastNight=n; renderAll(); } }, 60000);

/* debugging hook for local development only */
if(import.meta.env.DEV || ['localhost','127.0.0.1'].includes(location.hostname)){
  window.__app = { get S(){ return S; }, set S(v){ S=v; }, save, renderAll, setStatus, mergeState, shape, cityWallet, coinsLeft, lotusLeft, festActive, buildRun, splits, bestTime, segTotals, showTab, openShop, openFest, openCitySheet, openPostcard, startRun, R:()=>R };
}
