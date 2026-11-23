-- EA Fair Sale: ล้างข้อมูลทดสอบ ก่อนเริ่มใช้งานจริง
-- รันใน Supabase > SQL Editor ทีละขั้น (เลือกข้อความขั้นนั้น แล้วกด Run)
--
-- ก่อนรัน:
--   • สำรองข้อมูลก่อน (Supabase > Database > Backups หรือ Export CSV ทุกตาราง)
--   • ให้ทุกเครื่องออนไลน์ เปิดแอปค้างไว้ 1 นาที เพื่อส่งบิลออฟไลน์ที่ค้าง แล้วค่อยรัน
--     (ไม่งั้นบิลทดสอบที่ค้างในเครื่องจะถูกส่งขึ้นมาใหม่หลังล้าง)
--   • หลังรันเสร็จ เปิดหน้า  /assets/reset-device.html  บนทุกเครื่อง เพื่อล้างข้อมูลทดสอบในเครื่อง
--
-- สิ่งที่ "ไม่" ถูกลบ: การตั้งค่าร้าน (ea_settings: ชื่อร้าน, พร้อมเพย์, VAT ฯลฯ) และรหัสเจ้าของร้าน (ea_owner_secret)


-- ============================================================
-- ขั้นที่ 0: ดูก่อนว่าแต่ละตารางมีข้อมูลกี่แถว (ไม่ลบอะไร)
-- ============================================================
SELECT t.name AS table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.name), false, true, '')))[1]::text::int AS row_count
FROM (VALUES ('ea_sales'), ('ea_sale_items'), ('ea_stock_movements'), ('ea_stock_counts'),
             ('ea_reservations'), ('ea_remote_carts'), ('ea_cash_handovers'),
             ('ea_products'), ('ea_settings')) AS t(name)
WHERE to_regclass('public.' || t.name) IS NOT NULL
ORDER BY 1;


-- ============================================================
-- ขั้นที่ 1: ล้างข้อมูลการขาย/สต็อก/ใบจอง/กล่องเงิน ทั้งหมด (สินค้ายังอยู่)
-- ============================================================
BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ea_sale_items', 'ea_sales',
    'ea_stock_movements', 'ea_stock_counts',
    'ea_reservations', 'ea_remote_carts', 'ea_cash_handovers'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'cleared: %', t;
    END IF;
  END LOOP;

  IF to_regclass('public.ea_remote_cart_ticket_seq') IS NOT NULL THEN
    PERFORM setval('public.ea_remote_cart_ticket_seq', 1, false);
  END IF;
END $$;

COMMIT;


-- ============================================================
-- ขั้นที่ 2: เลือกทำ "อย่างใดอย่างหนึ่ง" (2A หรือ 2B)
-- ============================================================

-- ---------- 2A: เก็บรายการสินค้าไว้ แต่ตั้งสต็อกทุกตัวเป็น 0 ----------
--   (เหมาะถ้าสินค้าที่ใส่ไว้เป็นของจริง แค่สต็อกเพี้ยนจากการทดสอบ
--    แล้วค่อยรับของเข้า/ปรับสต็อกจริงในแอป)
-- UPDATE public.ea_products SET stock_qty = 0;


-- ---------- 2B: ลบสินค้าทั้งหมด เพื่อใส่สินค้าจริงใหม่ ----------
--   (ลบถาวร กู้คืนไม่ได้ นอกจากจากไฟล์สำรอง)
-- TRUNCATE TABLE public.ea_products RESTART IDENTITY CASCADE;


-- ============================================================
-- ขั้นที่ 3: ตรวจผล (ควรเป็น 0 ทุกตาราง ยกเว้น ea_products / ea_settings)
-- ============================================================
-- รันคำสั่งในขั้นที่ 0 อีกครั้ง

NOTIFY pgrst, 'reload schema';
