-- EA Fair Sale V16: มือถือช่วยตรวจนับสต็อก → ส่งยอดเข้าแท็บเล็ตหลัก (รันซ้ำได้)
--
-- - ตาราง ea_stock_counts: ยอดนับแต่ละครั้งจากมือถือ (สินค้า, จำนวน, เครื่อง, ผู้นับ, สถานะ)
--   สถานะ: pending = รอแท็บเล็ตบันทึก • applied = ปรับสต็อกแล้ว • void = ยกเลิก
-- - แอปอ่านได้ทุกเครื่อง • เขียนผ่านฟังก์ชัน ea_stock_count เท่านั้น
-- - เปิด Realtime ให้แท็บเล็ตเห็นยอดนับทันที
--
-- สำรองฐานข้อมูลก่อนรัน • รันหลัง V15

BEGIN;

CREATE TABLE IF NOT EXISTS public.ea_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text NOT NULL DEFAULT '',
  qty numeric(12,3) NOT NULL DEFAULT 0,
  device text NOT NULL DEFAULT '',
  staff_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',       -- pending | applied | void
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ea_stock_counts_status ON public.ea_stock_counts (status, created_at);

ALTER TABLE public.ea_stock_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ea_stock_counts FROM anon, authenticated;
GRANT SELECT ON public.ea_stock_counts TO anon, authenticated;

DROP POLICY IF EXISTS ea_stock_counts_read ON public.ea_stock_counts;
CREATE POLICY ea_stock_counts_read ON public.ea_stock_counts
  FOR SELECT TO anon, authenticated
  USING (created_at > now() - interval '30 days');

-- p: { action: 'add', product_id, product_name, qty, device, staff_name }
--    { action: 'void', id }
--    { action: 'apply', ids: [uuid, ...] }
CREATE OR REPLACE FUNCTION public.ea_stock_count(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ea_stock_counts%rowtype;
  v_act text := coalesce(p->>'action', '');
  v_n int;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RAISE EXCEPTION 'Invalid request'; END IF;

  IF v_act = 'add' THEN
    IF coalesce(p->>'product_id', '') = '' THEN RAISE EXCEPTION 'Product is required'; END IF;
    IF coalesce((p->>'qty')::numeric, -1) < 0 THEN RAISE EXCEPTION 'Invalid qty'; END IF;
    INSERT INTO public.ea_stock_counts(product_id, product_name, qty, device, staff_name)
    VALUES ((p->>'product_id')::uuid, left(coalesce(p->>'product_name', ''), 160), round((p->>'qty')::numeric, 3),
            left(coalesce(p->>'device', ''), 40), left(coalesce(p->>'staff_name', ''), 60))
    RETURNING * INTO v_row;
    RETURN to_jsonb(v_row);

  ELSIF v_act = 'void' THEN
    UPDATE public.ea_stock_counts SET status = 'void', updated_at = now()
    WHERE id = (p->>'id')::uuid AND status = 'pending'
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'Count not found or already applied'; END IF;
    RETURN to_jsonb(v_row);

  ELSIF v_act = 'apply' THEN
    IF jsonb_typeof(p->'ids') <> 'array' THEN RAISE EXCEPTION 'Invalid ids'; END IF;
    UPDATE public.ea_stock_counts SET status = 'applied', updated_at = now()
    WHERE status = 'pending' AND id IN (SELECT (x)::uuid FROM jsonb_array_elements_text(p->'ids') AS x);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN jsonb_build_object('applied', v_n);
  END IF;

  RAISE EXCEPTION 'Unknown action';
END;
$$;

REVOKE ALL ON FUNCTION public.ea_stock_count(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ea_stock_count(jsonb) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ea_stock_counts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ea_stock_counts;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ตรวจผล: ควรได้ 1 แถว
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ea_stock_counts';
