# 📜 ประวัติการพัฒนาและอัปเดตเวอร์ชัน (Version Changelog) — EA Fair Sale

บันทึกประวัติการปรับปรุงและคุณสมบัติของระบบ EA Fair Sale ในแต่ละเวอร์ชัน

---

## 🚀 เวอร์ชันล่าสุด: Modular Architecture & Physical Audit Pro
- แยกโครงสร้างโค้ด HTML, CSS, JS เป็นระดับโมดูลอย่างละเอียด
- เพิ่มสถานีตรวจนับสต็อกจริง (Physical Inventory Audit) รองรับ Single Add (1x) และ Bulk Add (+5, +10, +12, +24, +50, +100 หรือระบุเอง)
- เพิ่มระบบคำนวณและแนะนำสั่งเติมสต็อกอัตโนมัติ (Auto-Suggest Refill) อิงตาม Sales Velocity
- รายงานสรุปยอดขายมาตรฐาน A4 พิมพ์ออกเครื่องพิมพ์หรือดาวน์โหลด PDF
- รองรับการคำนวณเงินทอนแยกชนิดธนบัตรและเหรียญ
- เพิ่มเอกสารคู่มือ [PAGE_GUIDE.md](PAGE_GUIDE.md) ภาษาไทยอย่างละเอียด

---

## 📌 V11 — Separate Supabase Config
- แยกการตั้งค่าเชื่อมต่อฐานข้อมูลเป็นไฟล์ `supabase-config.js` และ `supabase-config.example.js`
- ป้องกันข้อมูล Key รั่วไหล และรองรับการตั้งค่าผ่าน Local Storage ในหน้าตั้งค่า

---

## 📌 V10 — Image Menu Buttons & Custom Icons
- รองรับรูปภาพไอคอนเมนูสวยงามบนหน้าแรก
- ปรับแต่งการจัดวาง Grid แบบ Responsive: Tablet แนวนอน 3 คอลัมน์, แนวตั้ง 2 คอลัมน์, Mobile 2 คอลัมน์

---

## 📌 V9 — Fixed UI & Performance Tuning
- ปรับปรุงการจัดวางหน้าตา Layout และการแสดงผลให้ราบรื่นยิ่งขึ้น
- ปรับขนาดปุ่มสัมผัสให้รองรับการกดบนแท็บเล็ตและมือถือ

---

## 📌 V8 — Dual Dashboards & Real-time Chart
- เพิ่มแดชบอร์ด 2 รูปแบบ: แดชบอร์ดสรุปยอดวันนี้ (Today) และ แดชบอร์ดภาพรวมสะสม (All-Time)
- ใช้งาน D3.js แสดงกราฟแท่งยอดขายรายชั่วโมงและ 7 วันย้อนหลัง

---

## 📌 V7 — Responsive App UI & Mobile-First
- รองรับการใช้งานแบบ Mobile-First บนแท็บเล็ตและมือถือทุกรุ่น
- แถบเมนูด้านล่าง (Bottom Navigation) สลับหน้าได้รวดเร็ว

---

## 📌 V6 — POS + Barcode Scanner + Multi-Terminal
- ระบบขายหน้าร้าน POS รองรับการยิงบาร์โค้ดผ่านปืนสแกนเนอร์ USB/Bluetooth และกล้องเว็บแคม
- รองรับ Multi-Terminal (POS-01, POS-02 ฯลฯ) ป้องกันรหัสบิลซ้ำซ้อน
