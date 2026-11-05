-- EA Fair Sale V15: ใบสั่งจองสินค้า + เงินมัดจำ + นัดวันรับ (รันซ้ำได้)
--
-- - ตาราง ea_reservations: ลูกค้า, รายการสินค้า, ยอดเต็ม, มัดจำ, วันนัดรับ, จุดรับของ,
--   การเบิกของ, สถานะ (booked / picked_up / cancelled)
-- - แอปอ่านได้ทุกเครื่อง • เขียนผ่านฟังก์ชัน ea_save_reservation เท่านั้น (ไม่เปิดสิทธิ์เขียนทั้งตาราง)
-- - เปิด Realtime ให้ทุกเครื่องเห็นใบจองใหม่ทันที
--
-- สำรองฐานข้อมูลก่อนรัน • รันหลัง V10

BEGIN;

CREATE TABLE IF NOT EXISTS public.ea_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  res_no text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,          -- [{product_id, name, unit, qty, unit_price}]
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  deposit_method text NOT NULL DEFAULT 'cash',       -- cash | promptpay
  deposit_date date NOT NULL DEFAULT current_date,
  deposit_terminal text NOT NULL DEFAULT '',
  pickup_date date NOT NULL,
  pickup_place text NOT NULL DEFAULT 'booth',        -- booth (บูธ) | shop (ร้าน/โกดัง)
  requisition_mode text NOT NULL DEFAULT 'day_before', -- day_before | now | none
  requisitioned_at timestamptz,
  status text NOT NULL DEFAULT 'booked',             -- booked | picked_up | cancelled
  picked_up_at timestamptz,
  sale_no text NOT NULL DEFAULT '',
  cancelled_at timestamptz,
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  refund_method text NOT NULL DEFAULT '',
  refund_terminal text NOT NULL DEFAULT '',
  final_amount numeric(12,2) NOT NULL DEFAULT 0,     -- เงินคงค้างที่รับตอนลูกค้ามารับ (กรณีไม่เปิดบิลขาย)
  final_method text NOT NULL DEFAULT '',
  final_terminal text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  staff_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- เผื่อเคยรัน V15 รุ่นแรก
ALTER TABLE public.ea_reservations ADD COLUMN IF NOT EXISTS final_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ea_reservations ADD COLUMN IF NOT EXISTS final_method text NOT NULL DEFAULT '';
ALTER TABLE public.ea_reservations ADD COLUMN IF NOT EXISTS final_terminal text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ea_reservations_pickup ON public.ea_reservations (status, pickup_date);

ALTER TABLE public.ea_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ea_reservations FROM anon, authenticated;
GRANT SELECT ON public.ea_reservations TO anon, authenticated;

DROP POLICY IF EXISTS ea_reservations_read ON public.ea_reservations;
CREATE POLICY ea_reservations_read ON public.ea_reservations
  FOR SELECT TO anon, authenticated
  USING (created_at > now() - interval '400 days');

-- บันทึกใบจอง: ไม่มี id = สร้างใหม่ • มี id = แก้ไขเฉพาะช่องที่ส่งมา
CREATE OR REPLACE FUNCTION public.ea_save_reservation(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ea_reservations%rowtype;
  v_id uuid := nullif(p->>'id', '')::uuid;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RAISE EXCEPTION 'Invalid reservation'; END IF;
  IF p ? 'status' AND p->>'status' NOT IN ('booked', 'picked_up', 'cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p ? 'items' AND jsonb_typeof(p->'items') <> 'array' THEN RAISE EXCEPTION 'Invalid items'; END IF;
  IF coalesce((p->>'deposit_amount')::numeric, 0) < 0 OR coalesce((p->>'total_amount')::numeric, 0) < 0 OR coalesce((p->>'final_amount')::numeric, 0) < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  IF v_id IS NULL THEN
    IF coalesce(trim(p->>'customer_name'), '') = '' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
    IF coalesce(p->>'pickup_date', '') = '' THEN RAISE EXCEPTION 'Pickup date is required'; END IF;
    INSERT INTO public.ea_reservations(
      res_no, customer_name, customer_phone, items, total_amount, deposit_amount, deposit_method,
      deposit_date, deposit_terminal, pickup_date, pickup_place, requisition_mode, note, staff_name
    ) VALUES (
      left(p->>'res_no', 40), left(trim(p->>'customer_name'), 80), left(coalesce(p->>'customer_phone', ''), 30),
      coalesce(p->'items', '[]'::jsonb), round(coalesce((p->>'total_amount')::numeric, 0), 2),
      round(coalesce((p->>'deposit_amount')::numeric, 0), 2), coalesce(nullif(p->>'deposit_method', ''), 'cash'),
      coalesce(nullif(p->>'deposit_date', '')::date, current_date), left(coalesce(p->>'deposit_terminal', ''), 40),
      (p->>'pickup_date')::date, coalesce(nullif(p->>'pickup_place', ''), 'booth'),
      coalesce(nullif(p->>'requisition_mode', ''), 'day_before'),
      left(coalesce(p->>'note', ''), 300), left(coalesce(p->>'staff_name', ''), 60)
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.ea_reservations r SET
      customer_name    = CASE WHEN p ? 'customer_name' THEN left(trim(p->>'customer_name'), 80) ELSE r.customer_name END,
      customer_phone   = CASE WHEN p ? 'customer_phone' THEN left(p->>'customer_phone', 30) ELSE r.customer_phone END,
      items            = CASE WHEN p ? 'items' THEN p->'items' ELSE r.items END,
      total_amount     = CASE WHEN p ? 'total_amount' THEN round((p->>'total_amount')::numeric, 2) ELSE r.total_amount END,
      pickup_date      = CASE WHEN p ? 'pickup_date' THEN (p->>'pickup_date')::date ELSE r.pickup_date END,
      pickup_place     = CASE WHEN p ? 'pickup_place' THEN p->>'pickup_place' ELSE r.pickup_place END,
      requisition_mode = CASE WHEN p ? 'requisition_mode' THEN p->>'requisition_mode' ELSE r.requisition_mode END,
      requisitioned_at = CASE WHEN p ? 'requisitioned' THEN (CASE WHEN (p->>'requisitioned')::boolean THEN now() ELSE NULL END) ELSE r.requisitioned_at END,
      status           = CASE WHEN p ? 'status' THEN p->>'status' ELSE r.status END,
      picked_up_at     = CASE WHEN p->>'status' = 'picked_up' THEN now() ELSE r.picked_up_at END,
      sale_no          = CASE WHEN p ? 'sale_no' THEN left(p->>'sale_no', 60) ELSE r.sale_no END,
      cancelled_at     = CASE WHEN p->>'status' = 'cancelled' THEN now() ELSE r.cancelled_at END,
      refund_amount    = CASE WHEN p ? 'refund_amount' THEN round((p->>'refund_amount')::numeric, 2) ELSE r.refund_amount END,
      refund_method    = CASE WHEN p ? 'refund_method' THEN p->>'refund_method' ELSE r.refund_method END,
      refund_terminal  = CASE WHEN p ? 'refund_terminal' THEN left(p->>'refund_terminal', 40) ELSE r.refund_terminal END,
      final_amount     = CASE WHEN p ? 'final_amount' THEN round((p->>'final_amount')::numeric, 2) ELSE r.final_amount END,
      final_method     = CASE WHEN p ? 'final_method' THEN p->>'final_method' ELSE r.final_method END,
      final_terminal   = CASE WHEN p ? 'final_terminal' THEN left(p->>'final_terminal', 40) ELSE r.final_terminal END,
      note             = CASE WHEN p ? 'note' THEN left(p->>'note', 300) ELSE r.note END,
      updated_at       = now()
    WHERE r.id = v_id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.ea_save_reservation(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ea_save_reservation(jsonb) TO anon, authenticated;

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ea_reservations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ea_reservations;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ตรวจผล: ควรได้ 1 แถว (ชื่อตาราง)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ea_reservations';
