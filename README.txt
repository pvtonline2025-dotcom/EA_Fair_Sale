EA Fair Sale V5 - Supabase Edition

ไฟล์:
1. index.html
2. index.css
3. index.js
4. supabase.sql

ขั้นตอน:
1) สร้าง Supabase Project สำหรับ EA Fair Sale
2) ไป SQL Editor แล้ววาง supabase.sql -> Run
3) ไป Project Settings / API
4) เอา Project URL และ Publishable key (หรือ anon key)
5) เปิด index.js แล้วแก้ด้านบน:
   const SUPABASE_URL = "...";
   const SUPABASE_KEY = "...";
6) เปิด index.html หรือ Deploy ขึ้น Cloudflare Pages

หมายเหตุ:
- ห้ามใช้ service_role key ใน index.js
- V5 ยังไม่ได้ทำ Login จึงใช้ RLS แบบ anon ชั่วคราว
- เมื่อต่อ Login ควรแก้ RLS ให้เฉพาะ authenticated users
- การขายและการตัด Stock ทำผ่าน PostgreSQL RPC เพื่อให้ทำใน transaction เดียว
