# EA Fair Sale – POS / สต็อก / แอปแท็บเล็ต

โครงสร้างนี้ **ไม่มีโฟลเดอร์ `public`**: วาง `js`, `css`, `images`, `assets`, `manifest.json` และ `sw.js` ไว้ระดับเดียวกับ `index.html` แล้ว

## โครงสร้างไฟล์

```text
EA-Fair-Sale/
├── index.html               # หน้าแรกของแอป
├── package.json             # คำสั่ง npm
├── vite.config.mjs          # ตั้งค่า Vite และคัดลอกไฟล์ไป dist
├── .gitignore
├── js/
│   ├── app.js               # POS / สต็อก / รายงาน
│   ├── offline-sync.js      # จัดการรายการขายออฟไลน์
│   ├── fetch-wrapper.js
│   ├── install-app.js       # ปุ่มติดตั้งแอปบนแท็บเล็ต
│   └── supabase-config.js   # Supabase URL + anon / publishable key
├── css/
│   ├── app.css
│   ├── tablet.css
│   ├── tablet-enhancements.css
│   ├── components/
│   └── pages/
├── images/                  # ภาพปุ่มในระบบ
├── assets/icons/            # ไอคอน PWA
├── manifest.json            # การติดตั้ง PWA
├── sw.js                    # Service Worker
├── database/migrations/     # SQL เดิม ไม่รันอัตโนมัติ
└── docs/                    # คู่มือ
```

## เปิดโปรเจกต์บนเครื่อง

1. แตก ZIP แล้วเปิดโฟลเดอร์นั้นใน VS Code (`index.html` อยู่ระดับบนสุดทันที)
2. ติดตั้ง Node.js **20.19+** และรัน `npm install`
3. รัน `npm run dev` แล้วเปิด `http://localhost:3000`
4. ตรวจโค้ด JavaScript: `npm run check:js`
5. ทดสอบไฟล์ deploy: `npm run build` ซึ่งสร้าง `dist/`

> การเปิดด้วย `file://` ไม่เหมาะกับ Service Worker / PWA; ใช้ localhost หรือ HTTPS แทน

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (หรือที่อยู่โฟลเดอร์โปรเจกต์ใน Git)
- Production branch: `main`; Preview branch: `dev` ตามการตั้งค่า Pages
- ไม่ต้องสร้างโฟลเดอร์ `public` และ **อย่า** ตั้ง output directory เป็น `.` เพราะ `docs` และ SQL ไม่ควรเผยแพร่บนเว็บไซต์

`vite.config.mjs` จะคัดลอก `js/`, `css/`, `images/`, `assets/`, `manifest.json` และ `sw.js` จาก root ไปยัง `dist/` หลัง Vite build เพื่อคง URL ของแอปและ Service Worker ให้ทำงานเหมือนเดิม (ส่วนเอกสาร, SQL, config สำหรับพัฒนา ไม่ถูกคัดลอก)

## การติดตั้งบนแท็บเล็ต

- Android: เปิดเว็บด้วย Chrome ผ่าน HTTPS แล้วเลือกเมนู **ติดตั้งแอป** / **เพิ่มลงในหน้าจอหลัก**
- iPad: เปิดเว็บด้วย Safari แล้วเลือก **แชร์** → **เพิ่มไปยังหน้าจอโฮม**
- ปุ่มติดตั้งแอปในแถบด้านบนจะแนะนำขั้นตอนตามอุปกรณ์

## Supabase

- แก้ URL และ anon/publishable key ที่ `js/supabase-config.js` เท่านั้น
- ห้ามใส่ `service_role`, secret key หรือรหัสผ่านในไฟล์ของหน้าเว็บ
- ตรวจสิทธิ์ RLS และทดสอบระบบขายจริงบน DEV ก่อนขึ้น Production
- ตัวอย่างไฟล์ตั้งค่าอยู่ที่ `docs/supabase-config.example.js`
- การย้ายโฟลเดอร์ครั้งนี้ไม่เปลี่ยนตาราง/ข้อมูลฐานข้อมูลหรือการทำงานหลัก POS

คู่มือหน้าระบบอยู่ใน `docs/PAGE_GUIDE.md` และขั้นตอน deploy อยู่ใน `docs/DEPLOY_GUIDE_TH.md`
