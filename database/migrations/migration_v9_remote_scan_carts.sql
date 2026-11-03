-- EA Fair Sale V9: มือถือสแกนสินค้า → ส่งรายการไปเครื่องคิดเงิน (แท็บเล็ต)
--
-- ขั้นตอน: มือถือสแกนเป็นชุด → กด "ส่งไปเครื่องคิดเงิน" → แท็บเล็ตเห็นบิลทันที
--          → แคชเชียร์กด "รับเข้าตะกร้า" → รับเงิน → บันทึกบิล/ตัดสต็อกด้วย ea_record_pos_sale (V8)
--
-- ตารางนี้เป็นแค่ "ตะกร้ารอคิดเงิน" ยังไม่ตัดสต็อกจนกว่าแท็บเล็ตจะปิดบิล
-- ราคาใช้ราคาปัจจุบันของสินค้าตอนแท็บเล็ตรับเข้าตะกร้า (มือถือไม่ได้กำหนดราคา)
--
-- สำรองฐานข้อมูลก่อนรัน • รันหลัง V8

BEGIN;

CREATE TABLE IF NOT EXISTS public.ea_remote_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL,
  sender text NOT NULL DEFAULT '',
  sender_device text NOT NULL DEFAULT '',
  target_terminal text NOT NULL DEFAULT 'ALL',
  items jsonb NOT NULL,
  item_count integer NOT NULL DEFAULT 0,
  total_qty numeric(12,2) NOT NULL DEFAULT 0,
  est_total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'cancelled')),
  claimed_by text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ea_remote_carts_status_created
  ON public.ea_remote_carts (status, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS public.ea_remote_cart_ticket_seq;

-- อ่านได้อย่างเดียว (ใช้ทั้ง query และ Realtime) • เขียนผ่านฟังก์ชันด้านล่างเท่านั้น
ALTER TABLE public.ea_remote_carts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ea_remote_carts FROM anon, authenticated;
GRANT SELECT ON public.ea_remote_carts TO anon, authenticated;

DROP POLICY IF EXISTS ea_remote_carts_read_recent ON public.ea_remote_carts;
CREATE POLICY ea_remote_carts_read_recent ON public.ea_remote_carts
  FOR SELECT TO anon, authenticated
  USING (created_at > now() - interval '1 day');

-- ส่งตะกร้าจากมือถือ
CREATE OR REPLACE FUNCTION public.ea_send_remote_cart(
  p_items jsonb,
  p_sender text,
  p_sender_device text,
  p_target_terminal text DEFAULT 'ALL'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_count integer;
  v_qty numeric;
  v_total numeric;
  v_target text := upper(trim(coalesce(p_target_terminal, 'ALL')));
  v_ticket text;
  v_row public.ea_remote_carts%rowtype;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR
     jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Cart must contain 1-200 items';
  END IF;
  IF v_target = '' OR length(v_target) > 40 THEN v_target := 'ALL'; END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric)
    WHERE product_id IS NULL OR qty IS NULL OR qty <= 0 OR qty > 100000
  ) THEN
    RAISE EXCEPTION 'Invalid cart item';
  END IF;

  -- รวมบรรทัดซ้ำ และเก็บเฉพาะสินค้าที่มีอยู่จริง (ชื่อ/ราคา ณ ตอนส่ง ไว้แสดงผลเท่านั้น)
  SELECT jsonb_agg(jsonb_build_object(
           'product_id', p.id,
           'product_name', p.product_name,
           'qty', q.qty,
           'unit_price', p.sale_price
         ) ORDER BY p.product_name),
         count(*), sum(q.qty), sum(q.qty * coalesce(p.sale_price, 0))
    INTO v_items, v_count, v_qty, v_total
  FROM (
    SELECT product_id, sum(qty) AS qty
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric)
    GROUP BY product_id
  ) q
  JOIN public.ea_products p ON p.id = q.product_id AND p.is_active = true;

  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'Product not found or inactive';
  END IF;

  v_ticket := 'M' || lpad((nextval('public.ea_remote_cart_ticket_seq') % 1000)::text, 3, '0');

  INSERT INTO public.ea_remote_carts(
    ticket_no, sender, sender_device, target_terminal, items, item_count, total_qty, est_total
  ) VALUES (
    v_ticket, left(coalesce(p_sender, ''), 60), left(coalesce(p_sender_device, ''), 60),
    v_target, v_items, v_count, v_qty, round(v_total, 2)
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'ticket_no', v_row.ticket_no,
    'item_count', v_row.item_count,
    'total_qty', v_row.total_qty,
    'est_total', v_row.est_total
  );
END;
$$;

-- แท็บเล็ตรับตะกร้า (ป้องกันสองเครื่องรับบิลเดียวกัน)
CREATE OR REPLACE FUNCTION public.ea_claim_remote_cart(p_id uuid, p_terminal text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ea_remote_carts%rowtype;
  v_terminal text := upper(trim(coalesce(p_terminal, 'POS-01')));
BEGIN
  UPDATE public.ea_remote_carts
  SET status = 'claimed', claimed_by = v_terminal, claimed_at = now()
  WHERE id = p_id
    AND status = 'pending'
    AND created_at > now() - interval '1 day'
    AND (target_terminal = 'ALL' OR target_terminal = v_terminal)
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Remote cart already claimed or not found';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'ticket_no', v_row.ticket_no, 'items', v_row.items);
END;
$$;

-- ยกเลิกบิลที่ยังไม่มีใครรับ
CREATE OR REPLACE FUNCTION public.ea_cancel_remote_cart(p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ea_remote_carts SET status = 'cancelled'
  WHERE id = p_id AND status = 'pending'
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.ea_send_remote_cart(jsonb,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ea_claim_remote_cart(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ea_cancel_remote_cart(uuid) FROM PUBLIC;
-- สิทธิ์เดียวกับ V7/V8 (แอปใช้ anon key) — ควรเปลี่ยนเป็น authenticated เมื่อมีระบบล็อกอินพนักงาน
GRANT EXECUTE ON FUNCTION public.ea_send_remote_cart(jsonb,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ea_claim_remote_cart(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ea_cancel_remote_cart(uuid) TO anon, authenticated;

-- เปิด Realtime ให้ตารางนี้ (แท็บเล็ตเห็นบิลใหม่ทันที) • ถ้าไม่มี publication แอปจะใช้การเช็กทุก 10 วินาทีแทน
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ea_remote_carts'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ea_remote_carts;
  END IF;
END $$;

COMMIT;
