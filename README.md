# ปิดครัวสู้หิว 🍽️🚫

Webapp เล็กๆ ช่วยงดมื้อเย็นแบบสนุกขึ้น — สัตว์เลี้ยงที่โตตาม XP, สตรีค, ปุ่ม "หิวแล้ว!" พร้อมมินิเกมตีมอนสเตอร์อาหาร, ภารกิจสุ่ม, ปฏิทิน และเหรียญรางวัล

- สร้างด้วย [Vite](https://vite.dev) + TypeScript (ส่วนที่เป็นตรรกะล้วน) และทดสอบด้วย [Vitest](https://vitest.dev)
- ข้อมูลเก็บใน `localStorage` ของเบราว์เซอร์แต่ละเครื่องเป็นหลัก ถ้าผู้ใช้ล็อกอิน จะซิงก์ขึ้น Supabase ด้วย (ดูด้านล่าง)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าตาแอปทั้งหมด (markup), หน้าโหลด (splash) และ SVG ไอคอน |
| `src/styles.css` | สไตล์ทั้งหมด |
| `src/main.js` | ตัวแอป: หน้าจอ, เมือง, กาชา, ร้านค้า, เทศกาล, การวิ่ง, ซิงก์ |
| `src/lib/state.ts` | โครงสร้างข้อมูลที่บันทึก และการรวมข้อมูลจากหลายเครื่อง (`mergeState`) |
| `src/lib/run-math.ts` | คำนวณการวิ่งบนลู่: ระยะ, เพซ, แคลอรี่, สปลิต, สถิติส่วนตัว |
| `tests/` | เทสต์ของ `src/lib` |
| `public/` | ไฟล์ที่ก๊อปไปตรงๆ: ไอคอน, manifest, ไลบรารีใน `vendor/` |

## พัฒนาในเครื่อง

```sh
npm install
npm run dev        # http://localhost:8788
npm test           # เทสต์
npm run build      # ตรวจ type แล้ว build ไปที่ dist/
npm run preview    # เปิดดู build จริงที่ http://localhost:8790
```

## Cloud sync ด้วย Supabase

แอปทำงานแบบ local-first ถ้า `CLOUD` ใน `src/main.js` ว่างอยู่ ส่วนบัญชีจะถูกซ่อนและไม่โหลด Supabase เลย

ตั้งค่าครั้งเดียว:

1. supabase.com → **New project** → Region: **Southeast Asia (Singapore)**
2. **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → **Run**
   (สร้างตาราง `user_state` แบบ 1 แถวต่อผู้ใช้ เปิด Row Level Security และสร้างฟังก์ชันให้ผู้ใช้ลบบัญชีตัวเองได้)
3. **Authentication → Emails → Templates**: ในเทมเพลต **Magic Link** และ **Confirm signup** ใส่ `{{ .Token }}` ลงในเนื้ออีเมล
   (แอปให้ผู้ใช้กรอกรหัสในแอป เพราะลิงก์ในอีเมลจะเปิดใน Safari ไม่ใช่แอปที่ Add to Home Screen ไว้) ตัวอย่าง:
   ```html
   <h2>รหัสเข้าสู่ระบบ ปิดครัว</h2>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>หรือ <a href="{{ .ConfirmationURL }}">แตะที่นี่เพื่อเข้าสู่ระบบ</a></p>
   ```
4. **Authentication → URL Configuration**: Site URL = `https://skipd.koralab.work`
   และเพิ่มใน Redirect URLs: `https://skipd.koralab.work/**`, `https://skip-d.chankrit9.workers.dev/**`, `http://localhost:8788/**` (ไว้ทดสอบในเครื่อง)
5. **Project Settings → API Keys**: คัดลอก **Project URL** กับ **publishable / anon key** ไปใส่ใน `CLOUD` ที่ `src/main.js`
   คีย์นี้ใส่ในหน้าเว็บได้ เพราะ RLS กันไม่ให้ใครอ่านข้อมูลคนอื่น — **ห้ามใส่ secret / service_role key**

หมายเหตุ: อีเมลในตัวของ Supabase ส่งได้เฉพาะอีเมลของสมาชิกทีมในโปรเจกต์ และส่งได้ไม่กี่ฉบับต่อชั่วโมง
ถ้าจะเปิดให้คนอื่นใช้ ให้ตั้ง custom SMTP (เช่น Resend) ที่ **Authentication → SMTP**

การรวมข้อมูลเมื่อใช้หลายเครื่อง (`mergeState` ใน `src/lib/state.ts` มีเทสต์ครบ): แต่ละคืนใช้ค่าที่แก้ล่าสุด, ของที่สะสมเพิ่มอย่างเดียว
(เหรียญ, เควสที่รับแล้ว, ตัวละคร, XP, ของที่ซื้อ, สิ่งก่อสร้างในเมือง, กระทงที่ลอย) รวมกัน, การวิ่งรวมตาม id และจำรอบที่ลบไว้,
ส่วนกระเป๋าตั๋ว/การตั้งค่า/ชุดแต่งมาจากเครื่องที่แก้ล่าสุด และการ "ล้างข้อมูลทั้งหมด" จะมีผลกับทุกเครื่อง

## Deploy บน Cloudflare Workers (static assets)

ตั้งค่าไว้ใน `wrangler.jsonc` แล้ว — `wrangler deploy` จะรัน `npm run build` ก่อน แล้ว deploy โฟลเดอร์ `dist/`

- Build command: *(เว้นว่างได้ เพราะ wrangler รัน build ให้เอง)*
- Deploy command: `npx wrangler deploy`

## ไลบรารีที่ใช้ (เก็บไว้ใน `public/vendor/` ไม่โหลดจาก CDN ตอนใช้งาน)

- [GSAP 3.12.5](https://gsap.com) — แอนิเมชัน (ตัวเลขนับขึ้น, เปลี่ยนหน้า, action sheet)
- [Chart.js 4.4.1](https://www.chartjs.org) — กราฟรายสัปดาห์และเงินที่ประหยัดสะสม
- [canvas-confetti 1.9.3](https://github.com/catdad/canvas-confetti) — เอฟเฟกต์ฉลอง
- [Lucide 0.460.0](https://lucide.dev) — ไอคอน (ฝังเป็น SVG sprite ใน `index.html`)
- [supabase-js 2.118.0](https://supabase.com/docs/reference/javascript) — ล็อกอินและซิงก์ (โหลดเฉพาะเมื่อตั้งค่า `CLOUD` แล้ว)
