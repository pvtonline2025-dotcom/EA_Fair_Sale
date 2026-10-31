# EA Fair Sale - GitHub ครั้งแรก (โครงสร้างแฟ้มเดิม ไม่ย้ายไฟล์)

โครงสร้างเว็บอยู่ระดับบนสุด (index.html อยู่ข้าง package.json และ scripts/)

## 1. เปิดโฟลเดอร์ใน VS Code
เปิดโฟลเดอร์ที่มี index.html / index.js / package.json

## 2. สร้าง Repository ว่างชื่อ ea-fair-sale บน GitHub
เลือก Private; ไม่ติ๊กสร้าง README/.gitignore ที่ GitHub

## 3. รันคำสั่งใน VS Code Terminal
```
git init -b main
git add .
git commit -m "Initial EA Fair Sale"
git remote add origin https://github.com/YOUR_USERNAME/ea-fair-sale.git
git push -u origin main
git switch -c dev
git push -u origin dev
```

## 4. Cloudflare Pages
เลือก Connect to Git > Repo ea-fair-sale
- Production branch: main
- Build command: npm run build
- Output directory: dist
- Root directory: ว่าง/Repository root
- กำหนด Environment Variables Production เป็น Supabase PROD
- กำหนด Environment Variables Preview เป็น Supabase DEV
  - SUPABASE_URL (https://...supabase.co)
  - SUPABASE_PUBLISHABLE_KEY (sb_publishable_... หรือ anon JWT ที่ถูกต้อง)

## 5. Supabase
ฐานใหม่ต้องมี SQL V5 (supabase.sql) สร้างตารางตั้งต้นก่อน
แล้วจึงรัน Sql/migration_v6_pos_barcode.sql และ Sql/migration_v7_idempotent_offline_sales.sql
**ZIP นี้ไม่มี SQL V5** ห้ามรัน V6/V7 บนฐานว่าง

## 6. ทดสอบบนคอม
- ใช้ Live Server เปิด index.html
- ถ้าจะต่อ DEV ให้คัดลอก supabase-config.example.js เป็น supabase-config.js
  แล้วใส่ URL / Publishable Key ของ DEV
- สำหรับการทดสอบ Build: กำหนด env SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY
  แล้วเรียก npm run build
- ไฟล์ supabase-config.js ถูก gitignore และจะไม่ขึ้น GitHub
- Cloudflare Build จะสร้างไฟล์ config ใน dist/ แยก main/dev อัตโนมัติ

## ข้อควรระวัง
ระบบเว็บนี้ยังไม่มี Server สำหรับ API อีเมล; Cloudflare Pages แบบนี้ Deploy เว็บอย่างเดียว
RLS / Auth และ RPC Permissions ของ Supabase ต้องทดสอบและล็อกสิทธิ์ก่อนเปิดใช้งานจริง
