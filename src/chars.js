/* Gacha tiers and character art. */
import { S } from './store';
import { escapeHtml } from './tour';

/* ---------- gacha: tiers & characters ---------- */
export const TIERS = {
  salt:   { rate:45, shard:1,  stars:1 },
  common: { rate:32, shard:2,  stars:2 },
  rare:   { rate:16, shard:4,  stars:3 },
  sr:     { rate:6,  shard:10, stars:4 },
  legend: { rate:1,  shard:25, stars:5 },
};
export const TIER_ORDER = ['salt','common','rare','sr','legend'];
export const PITY = 10;
export const tierIdx = k => TIER_ORDER.indexOf(k);

const INK = '#2b1d16';
let _faceRec = null;
export function F(cx,cy,s=1,e='open',mo='smile'){
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

export const CHARS = [
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
export const SETS = [
  { id:'kitchen',  icon:'utensils-crossed', color:'#ff7a45', name:{th:'ครัวปิดแล้ว',en:'Closed Kitchen'},     reward:{tickets:3} },
  { id:'bedtime',  icon:'moon-star',        color:'#8b7cf6', name:{th:'แก๊งก่อนนอน',en:'Bedtime Crew'},       reward:{tickets:2} },
  { id:'critters', icon:'heart',            color:'#e86aa8', name:{th:'สัตว์ราตรี',en:'Night Critters'},      reward:{tickets:4, gold:1} },
  { id:'cravings', icon:'flame',            color:'#ff4d3d', name:{th:'ปีศาจของกินดึก',en:'Midnight Cravings'}, reward:{tickets:3} },
  { id:'fresh',    icon:'sprout',           color:'#3fae49', name:{th:'ผักผลไม้สดใส',en:'Fresh Friends'},     reward:{tickets:3} },
  { id:'sky',      icon:'sparkles',         color:'#4aa5ff', name:{th:'ท้องฟ้ายามค่ำ',en:'Night Sky'},         reward:{tickets:5, gold:2} },
  { id:'festival', icon:'lotus',            color:'#ff8fb8', name:{th:'ของสะสมเทศกาล',en:'Festival Specials'}, reward:{tickets:2} },
];
export const SET_BY_ID = Object.fromEntries(SETS.map(s=>[s.id,s]));
const FIRST_SETS = { salt:'kitchen', soy:'kitchen', pick:'kitchen', spoon:'kitchen', cat:'kitchen', ninja:'kitchen',
  tissue:'bedtime', glass:'bedtime', tea:'bedtime', brush:'bedtime', pillow:'bedtime', shoe:'bedtime',
  owl:'critters', bunny:'critters', firefly:'critters', fox:'critters', whale:'critters', goldmoon:'sky' };
CHARS.forEach(c=>{ c.set ||= FIRST_SETS[c.id]; });
CHARS.sort((a,b)=> SETS.indexOf(SET_BY_ID[a.set]) - SETS.indexOf(SET_BY_ID[b.set]) || tierIdx(a.tier) - tierIdx(b.tier));
CHARS.forEach((c,i)=>c.no=i+1);
export const CHAR_BY_ID = Object.fromEntries(CHARS.map(c=>[c.id,c]));
const _artCache = {};
let _artUid = 0;
export function charSVG(ch){
  let s = charArt(ch);
  // gradients need ids unique per copy: a copy inside a hidden tab would otherwise win and render nothing
  if(s.includes(' id="')){ const u = ++_artUid; s = s.replace(/ id="(\w+)"/g, ` id="$1_${u}"`).replace(/url\(#(\w+)\)/g, `url(#$1_${u})`); }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}
export const ownedCount = () => CHARS.filter(c=>S.gacha.owned[c.id]).length;
export const _faceCache = {};
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
export function accessorize(svg, id, eq=S.shop.equip){
  const f=_faceCache[id] || {cx:50,cy:50,s:1}; let add='';
  if(eq.face && ACC[eq.face]) add += `<g transform="translate(${f.cx} ${f.cy}) scale(${f.s})">${ACC[eq.face]}</g>`;
  if(eq.hat && ACC[eq.hat]) add += `<g transform="translate(${f.cx} ${f.cy-21*f.s}) scale(${f.s})">${ACC[eq.hat]}</g>`;
  return add ? svg.replace('<svg ', '<svg style="overflow:visible" ').replace(/<\/svg>$/, add+'</svg>') : svg;
}
export function buddySVG(b){ return accessorize(charSVG(b), b.id); }
export function avatarHTML(){
  const b = S.gacha.buddy && CHAR_BY_ID[S.gacha.buddy];
  return b ? buddySVG(b) : escapeHtml((S.settings.name||'?').trim().charAt(0).toUpperCase() || '?');
}
