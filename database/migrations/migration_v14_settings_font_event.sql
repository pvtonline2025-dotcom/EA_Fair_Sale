-- EA Fair Sale V14: อนุญาตให้บันทึก "ฟอนต์" และ "ช่วงวันงาน" ผ่าน ea_save_settings (รันซ้ำได้)
--
-- อาการก่อนรัน: Console ขึ้น "Setting app_font is not allowed" (400 Bad Request)
--   → ฟอนต์/ช่วงวันงานที่เลือก ใช้ได้แค่เครื่องเดียว ไม่ส่งต่อไปเครื่องอื่น
--
-- เพิ่มคีย์: app_font, event_start_date, event_end_date
-- (ต้องรัน V12 มาก่อน • ไฟล์นี้แทนที่ฟังก์ชันเดิมทั้งตัว ไม่แตะข้อมูล)

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
    'daily_target', 'low_stock_default', 'theme', 'color_mode',
    'app_font', 'event_start_date', 'event_end_date'
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

    -- วันที่งานต้องเป็นรูปแบบ YYYY-MM-DD หรือค่าว่าง
    IF v_key IN ('event_start_date', 'event_end_date') AND v_value <> '' AND v_value !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Invalid date for %: %', v_key, v_value;
    END IF;

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
GRANT EXECUTE ON FUNCTION public.ea_save_settings(jsonb) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ตรวจผล: ควรได้ {"saved": 1}
SELECT public.ea_save_settings('{"app_font":"default"}'::jsonb);
