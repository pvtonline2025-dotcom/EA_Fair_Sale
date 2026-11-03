-- EA Fair Sale V10: ศูนย์กลาง (แท็บเล็ต) รับเงินสดจากแต่ละเครื่อง + อัปเดตยอด/สต็อกแบบสด
--
-- - ตาราง ea_cash_handovers: บันทึกการส่งเงินสดจากเครื่องขาย (มือถือ) ให้ศูนย์กลาง
--   เก็บยอดเงินสดที่ขายได้ ณ ตอนรับ, ยอดที่นับได้จริง, ส่วนต่าง (ขาด/เกิน)
-- - เปิด Realtime ให้ ea_sales / ea_products / ea_cash_handovers เพื่อให้ทุกเครื่องเห็นยอดและสต็อกล่าสุด
--
-- สำรองฐานข้อมูลก่อนรัน • รันหลัง V9

BEGIN;

CREATE TABLE IF NOT EXISTS public.ea_cash_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_code text NOT NULL,
  handover_date date NOT NULL,
  cash_sales_total numeric(12,2) NOT NULL DEFAULT 0,   -- เงินสดที่เครื่องนี้ขายได้ทั้งวัน ณ ตอนรับ
  previously_received numeric(12,2) NOT NULL DEFAULT 0,-- รับไปแล้วก่อนหน้า (วันเดียวกัน)
  received_amount numeric(12,2) NOT NULL,              -- เงินที่นับได้ครั้งนี้
  difference numeric(12,2) NOT NULL DEFAULT 0,         -- (รับก่อนหน้า + ครั้งนี้) − เงินสดที่ขายได้  (+ เกิน / − ขาด)
  received_by text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ea_cash_handovers_date_terminal
  ON public.ea_cash_handovers (handover_date, terminal_code);

ALTER TABLE public.ea_cash_handovers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ea_cash_handovers FROM anon, authenticated;
GRANT SELECT ON public.ea_cash_handovers TO anon, authenticated;

DROP POLICY IF EXISTS ea_cash_handovers_read ON public.ea_cash_handovers;
CREATE POLICY ea_cash_handovers_read ON public.ea_cash_handovers
  FOR SELECT TO anon, authenticated
  USING (handover_date > current_date - 400);

CREATE OR REPLACE FUNCTION public.ea_record_cash_handover(
  p_terminal_code text,
  p_handover_date date,
  p_cash_sales_total numeric,
  p_received_amount numeric,
  p_received_by text DEFAULT '',
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terminal text := upper(trim(coalesce(p_terminal_code, '')));
  v_prev numeric(12,2);
  v_row public.ea_cash_handovers%rowtype;
BEGIN
  IF v_terminal = '' OR length(v_terminal) > 40 THEN RAISE EXCEPTION 'Invalid terminal'; END IF;
  IF p_handover_date IS NULL OR p_handover_date > current_date + 1 OR p_handover_date < current_date - 31 THEN
    RAISE EXCEPTION 'Invalid date';
  END IF;
  IF p_received_amount IS NULL OR p_received_amount < 0 OR p_received_amount > 100000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_cash_sales_total IS NULL OR p_cash_sales_total < 0 THEN RAISE EXCEPTION 'Invalid cash total'; END IF;

  -- กันสองคนกดบันทึกพร้อมกันสำหรับเครื่องเดียวกัน
  PERFORM pg_advisory_xact_lock(hashtextextended('handover:' || v_terminal || ':' || p_handover_date::text, 0));

  SELECT coalesce(sum(received_amount), 0) INTO v_prev
  FROM public.ea_cash_handovers
  WHERE terminal_code = v_terminal AND handover_date = p_handover_date;

  INSERT INTO public.ea_cash_handovers(
    terminal_code, handover_date, cash_sales_total, previously_received,
    received_amount, difference, received_by, note
  ) VALUES (
    v_terminal, p_handover_date, round(p_cash_sales_total, 2), v_prev,
    round(p_received_amount, 2), round(v_prev + p_received_amount - p_cash_sales_total, 2),
    left(coalesce(p_received_by, ''), 60), left(coalesce(p_note, ''), 200)
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.ea_record_cash_handover(text,date,numeric,numeric,text,text) FROM PUBLIC;
-- สิทธิ์เดียวกับ V7–V9 (แอปใช้ anon key) — ควรเปลี่ยนเป็น authenticated เมื่อมีระบบล็อกอินพนักงาน
GRANT EXECUTE ON FUNCTION public.ea_record_cash_handover(text,date,numeric,numeric,text,text) TO anon, authenticated;

-- Realtime: ให้ทุกเครื่องเห็นบิลใหม่ / สต็อก / การรับเงิน ทันที
-- (ถ้ายังไม่เปิด แอปจะดึงข้อมูลใหม่ทุก 30 วินาทีแทน)
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['ea_sales', 'ea_products', 'ea_cash_handovers'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
