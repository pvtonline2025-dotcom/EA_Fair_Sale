-- EA Fair Sale V12: บันทึกการตั้งค่าร้าน (ชื่อร้าน, พร้อมเพย์, ท้ายสลิป, VAT ฯลฯ)
--
-- ปัญหา: ตาราง ea_settings ไม่อนุญาตให้แอป (anon key) เขียนตรงๆ → POST ได้ 401 Unauthorized
--        ทำให้บันทึกเบอร์พร้อมเพย์/ข้อมูลร้านไม่ได้
-- แก้:  ฟังก์ชัน ea_save_settings บันทึกเฉพาะคีย์การตั้งค่าที่อนุญาต (ไม่เปิดสิทธิ์เขียนทั้งตาราง)
--
-- สำรองฐานข้อมูลก่อนรัน • รันซ้ำได้

BEGIN;

CREATE OR REPLACE FUNCTION public.ea_save_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'shop_name', 'shop_branch', 'shop_address', 'shop_phone', 'prompt_pay_id',
    'shop_tax_id', 'shop_line', 'receipt_footer_note', 'enable_vat', 'vat_rate',
    'daily_target', 'low_stock_default', 'theme', 'color_mode'
  ];
  v_key text;
  v_value text;
  v_saved integer := 0;
BEGIN
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings must be a JSON object';
  END IF;

  FOR v_key, v_value IN SELECT key, value #>> '{}' FROM jsonb_each(p_settings) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION 'Setting % is not allowed', v_key;
    END IF;
    v_value := left(coalesce(v_value, ''), 500);

    UPDATE public.ea_settings SET setting_value = v_value WHERE setting_key = v_key;
    IF NOT FOUND THEN
      INSERT INTO public.ea_settings(setting_key, setting_value) VALUES (v_key, v_value);
    END IF;
    v_saved := v_saved + 1;
  END LOOP;

  RETURN jsonb_build_object('saved', v_saved);
END;
$$;

REVOKE ALL ON FUNCTION public.ea_save_settings(jsonb) FROM PUBLIC;
-- สิทธิ์เดียวกับ V7–V11 (แอปใช้ anon key) — ควรเปลี่ยนเป็น authenticated เมื่อมีระบบล็อกอินพนักงาน
GRANT EXECUTE ON FUNCTION public.ea_save_settings(jsonb) TO anon, authenticated;

COMMIT;
