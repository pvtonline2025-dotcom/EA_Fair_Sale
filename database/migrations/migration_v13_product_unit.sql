-- EA Fair Sale V13: คอลัมน์ "หน่วย" ของสินค้า + คอลัมน์สินค้าที่แอปใช้ (รันซ้ำได้)
--
-- อาการก่อนรัน: แก้ไข/เพิ่มสินค้าไม่ได้ Console ขึ้น
--   "Could not find the 'unit' column of 'ea_products' in the schema cache" (400 Bad Request)
--
-- - ea_products.unit         : หน่วยขาย เช่น ชิ้น, ม้วน, เส้น, กก.
-- - ea_products.promotions   : (จาก V11) รายการราคาโปร — เพิ่มให้ด้วยเผื่อยังไม่ได้รัน V11
-- - ea_products.track_weight : (จาก V11) ต้องลงน้ำหนักทุกชิ้นที่ขาย
--
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run
-- ไม่ลบหรือแก้ข้อมูลเดิม เพิ่มเฉพาะคอลัมน์ที่ยังไม่มี

BEGIN;

ALTER TABLE public.ea_products ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'ชิ้น';
ALTER TABLE public.ea_products ADD COLUMN IF NOT EXISTS promotions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ea_products ADD COLUMN IF NOT EXISTS track_weight boolean NOT NULL DEFAULT false;

-- ค่าว่างเดิม (ถ้ามี) ให้เป็น "ชิ้น"
UPDATE public.ea_products SET unit = 'ชิ้น' WHERE unit IS NULL OR btrim(unit) = '';

COMMIT;

-- ให้ API (PostgREST) รู้จักคอลัมน์ใหม่ทันที ไม่ต้องรอ
NOTIFY pgrst, 'reload schema';

-- ตรวจผล: ควรได้ 3 แถว (unit, promotions, track_weight)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ea_products'
  AND column_name IN ('unit', 'promotions', 'track_weight')
ORDER BY column_name;
