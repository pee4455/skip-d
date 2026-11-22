# ปิดครัวสู้หิว 🍽️🚫

Webapp เล็กๆ ช่วยงดมื้อเย็นแบบสนุกขึ้น — สัตว์เลี้ยงที่โตตาม XP, สตรีค, ปุ่ม "หิวแล้ว!" พร้อมมินิเกมตีมอนสเตอร์อาหาร, ภารกิจสุ่ม, ปฏิทิน และเหรียญรางวัล

- ไฟล์เดียว: `public/index.html` (HTML/CSS/JS ล้วน ไม่ต้อง build)
- ข้อมูลเก็บใน `localStorage` ของเบราว์เซอร์แต่ละเครื่อง

## Deploy บน Cloudflare Workers (static assets)

ตั้งค่าไว้ใน `wrangler.jsonc` แล้ว — ไฟล์ในโฟลเดอร์ `public/` จะถูก deploy

- Build command: *(เว้นว่าง)*
- Deploy command: `npx wrangler deploy`

## ไลบรารีที่ใช้ (เก็บไว้ใน `public/vendor/` ไม่โหลดจาก CDN ตอนใช้งาน)

- [GSAP 3.12.5](https://gsap.com) — แอนิเมชัน (ตัวเลขนับขึ้น, เปลี่ยนหน้า, action sheet)
- [Chart.js 4.4.1](https://www.chartjs.org) — กราฟรายสัปดาห์และเงินที่ประหยัดสะสม
- [canvas-confetti 1.9.3](https://github.com/catdad/canvas-confetti) — เอฟเฟกต์ฉลอง
- [Lucide 0.460.0](https://lucide.dev) — ไอคอน (ฝังเป็น SVG sprite ใน `index.html`)
