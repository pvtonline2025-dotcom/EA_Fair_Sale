-- EA Fair Sale V11: ราคาโปร / ของแถม / น้ำหนักรายชิ้น (เช่น สายยางขายเป็นม้วน ลงน้ำหนักทุกม้วน)
--
-- - ea_products.promotions  : รายการโปร เช่น [{"label":"3 กิโล 100","qty":3,"price":100}]
-- - ea_products.track_weight: ต้องลงน้ำหนักทุกชิ้นที่ขาย (เช่น สายยางรายม้วน)
-- - ea_sale_items.price_note: ป้ายราคาของบรรทัด เช่น "3 กิโล 100", "แถมลูกค้ามียอดสูง"
-- - ea_sale_items.weights   : น้ำหนักแต่ละชิ้น เช่น [3.7, 3.5, 3.6]
-- - ea_sale_items.unit_price: เพิ่มทศนิยมเป็น 4 ตำแหน่ง (โป 3 กิโล 100 = 33.3333/กิโล → 3 กิโล = 100.00 พอดี)
-- - ea_record_pos_sale      : รับ price_note + weights และบันทึกลงรายการขาย
--
-- สำรองฐานข้อมูลก่อนรัน • รันหลัง V10 • รันซ้ำได้

BEGIN;

ALTER TABLE public.ea_products ADD COLUMN IF NOT EXISTS promotions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ea_products ADD COLUMN IF NOT EXISTS track_weight boolean NOT NULL DEFAULT false;
ALTER TABLE public.ea_sale_items ADD COLUMN IF NOT EXISTS price_note text NOT NULL DEFAULT '';
ALTER TABLE public.ea_sale_items ADD COLUMN IF NOT EXISTS weights jsonb;

-- unit_price ต้องเก็บทศนิยมได้ 4 ตำแหน่ง
DO $$
DECLARE
  v_type text;
  v_scale integer;
BEGIN
  SELECT data_type, numeric_scale INTO v_type, v_scale
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ea_sale_items' AND column_name = 'unit_price';
  IF v_type = 'numeric' AND v_scale IS NOT NULL AND v_scale < 4 THEN
    BEGIN
      ALTER TABLE public.ea_sale_items ALTER COLUMN unit_price TYPE numeric(14,4);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not widen ea_sale_items.unit_price (%). Promo prices will be rounded to 2 decimals.', SQLERRM;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ea_record_pos_sale(
  p_terminal_code text,
  p_items jsonb,
  p_note text,
  p_client_sale_id text,
  p_payment_method text,
  p_bill_discount numeric DEFAULT 0,
  p_received_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.ea_sales%rowtype;
  v_item record;
  v_product public.ea_products%rowtype;
  v_gross numeric(12,2);
  v_discount numeric(12,2) := round(coalesce(p_bill_discount, 0), 2);
  v_net numeric(12,2);
  v_received numeric(12,2);
  v_change numeric(12,2);
  v_terminal text;
  v_sale public.ea_sales%rowtype;
  v_sale_no text;
  v_after numeric(12,2);
BEGIN
  IF p_client_sale_id IS NULL OR
     p_client_sale_id !~ '^off-sale-[0-9]+-[0-9]+$' OR
     length(p_client_sale_id) > 100 THEN
    RAISE EXCEPTION 'Invalid offline transaction id';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'promptpay') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR
     jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Cart must contain 1-200 items';
  END IF;

  -- กันการส่งซ้ำของบิลเดียวกัน (กดซ้ำ / เน็ตหลุดกลางทาง / หลายแท็บ)
  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_sale_id, 0));

  SELECT * INTO v_existing FROM public.ea_sales WHERE client_sale_id = p_client_sale_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'sale_id', v_existing.id,
      'sale_no', v_existing.sale_no,
      'terminal_code', v_existing.terminal_code,
      'total_amount', v_existing.total_amount,
      'discount_amount', v_existing.discount_amount,
      'already_synced', true
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric, price_note text, weights jsonb)
    WHERE product_id IS NULL OR qty IS NULL OR qty <= 0 OR qty > 1000000 OR
          unit_price IS NULL OR unit_price < 0 OR unit_price > 100000000
  ) THEN
    RAISE EXCEPTION 'Invalid cart item';
  END IF;

  -- V11: ป้ายราคา/โปร (เช่น "3 กิโล 100", "แถม") และน้ำหนักรายชิ้น (เช่น สายยางรายม้วน)
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric, price_note text, weights jsonb)
    WHERE length(coalesce(price_note, '')) > 100
       OR CASE
            WHEN weights IS NULL OR jsonb_typeof(weights) = 'null' THEN false
            WHEN jsonb_typeof(weights) <> 'array' THEN true
            WHEN jsonb_array_length(weights) > 1000 THEN true
            ELSE EXISTS (SELECT 1 FROM jsonb_array_elements(weights) w
                         WHERE jsonb_typeof(w) <> 'number' OR (w #>> '{}')::numeric <= 0 OR (w #>> '{}')::numeric > 100000)
          END
  ) THEN
    RAISE EXCEPTION 'Invalid price note or weights';
  END IF;

  SELECT round(sum(qty * unit_price), 2) INTO v_gross
  FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric, price_note text, weights jsonb);

  IF v_discount < 0 OR v_discount > v_gross THEN
    RAISE EXCEPTION 'Bill discount out of range';
  END IF;
  v_net := v_gross - v_discount;

  IF p_payment_method = 'cash' THEN
    v_received := coalesce(round(p_received_amount, 2), v_net);
    IF v_received < v_net THEN
      RAISE EXCEPTION 'Received amount is less than total';
    END IF;
  ELSE
    v_received := v_net;
  END IF;
  v_change := v_received - v_net;

  -- ล็อกสินค้าตามลำดับเดียวกับ V6/V7 และตรวจจำนวนรวมต่อสินค้า
  FOR v_item IN
    SELECT product_id, SUM(qty) AS qty
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric, price_note text, weights jsonb)
    GROUP BY product_id
    ORDER BY product_id::text
  LOOP
    SELECT * INTO v_product FROM public.ea_products
    WHERE id = v_item.product_id AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    IF v_product.stock_qty < v_item.qty THEN
      RAISE EXCEPTION 'Insufficient stock for %. Available: %',
        v_product.product_name, v_product.stock_qty;
    END IF;
  END LOOP;

  -- บันทึกบิล + รายการ + ตัดสต็อก + movement ในฟังก์ชันนี้เอง (ไม่พึ่ง V6)
  v_terminal := upper(trim(coalesce(p_terminal_code, 'POS-01')));
  IF v_terminal = '' THEN v_terminal := 'POS-01'; END IF;
  v_sale_no := 'FS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISSMS') || '-' || replace(v_terminal, ' ', '');

  INSERT INTO public.ea_sales(
    sale_no, sale_date, sale_time, total_amount, note, terminal_code,
    client_sale_id, payment_method, discount_amount, received_amount, change_amount
  ) VALUES (
    v_sale_no, current_date, localtime, v_net, p_note, v_terminal,
    p_client_sale_id, p_payment_method, v_discount, v_received, v_change
  )
  RETURNING * INTO v_sale;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric, price_note text, weights jsonb)
  LOOP
    SELECT * INTO v_product FROM public.ea_products WHERE id = v_item.product_id;
    v_after := v_product.stock_qty - v_item.qty;

    INSERT INTO public.ea_sale_items(sale_id, product_id, product_code, product_name, qty, unit_price, price_note, weights)
    VALUES (v_sale.id, v_product.id, v_product.product_code, v_product.product_name, v_item.qty, v_item.unit_price,
            coalesce(trim(v_item.price_note), ''),
            CASE WHEN jsonb_typeof(v_item.weights) = 'array' AND jsonb_array_length(v_item.weights) > 0 THEN v_item.weights END);

    UPDATE public.ea_products SET stock_qty = v_after WHERE id = v_product.id;

    INSERT INTO public.ea_stock_movements(
      movement_type, product_id, product_code, product_name,
      qty_change, stock_before, stock_after, reference_id, note
    ) VALUES (
      'SALE', v_product.id, v_product.product_code, v_product.product_name,
      -v_item.qty, v_product.stock_qty, v_after, v_sale.id, coalesce(p_note, 'ขายสินค้า ' || v_terminal)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sale_id', v_sale.id,
    'sale_no', v_sale.sale_no,
    'terminal_code', v_terminal,
    'total_amount', v_net,
    'gross_amount', v_gross,
    'discount_amount', v_discount,
    'received_amount', v_received,
    'change_amount', v_change,
    'already_synced', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ea_record_pos_sale(text,jsonb,text,text,text,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ea_record_pos_sale(text,jsonb,text,text,text,numeric,numeric) TO anon, authenticated;

COMMIT;
