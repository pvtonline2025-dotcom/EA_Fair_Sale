-- EA Fair Sale V7: replay-safe offline POS transactions.
-- BACK UP the database before applying. Requires migration_v6_pos_barcode.sql.
-- IMPORTANT: This function inherits V6's direct-client permission model. Before any
-- public deployment, restrict anonymous access and introduce proper staff authentication/RLS.

BEGIN;

ALTER TABLE public.ea_sales
  ADD COLUMN IF NOT EXISTS client_sale_id text;
ALTER TABLE public.ea_sales
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ea_sales_client_sale_id
  ON public.ea_sales (client_sale_id)
  WHERE client_sale_id IS NOT NULL;

-- A separate function name avoids conflicts with any customized online RPC.
-- Offline sync calls this version with a stable, unique client sale ID.
CREATE OR REPLACE FUNCTION public.ea_record_offline_cart_sale(
  p_terminal_code text,
  p_items jsonb,
  p_note text,
  p_client_sale_id text,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.ea_sales%rowtype;
  v_product public.ea_products%rowtype;
  v_item record;
  v_result jsonb;
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

  -- Serialize retries for the same client ID, including simultaneous browsers.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_sale_id, 0));

  SELECT * INTO v_existing FROM public.ea_sales
  WHERE client_sale_id = p_client_sale_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'sale_id', v_existing.id,
      'sale_no', v_existing.sale_no,
      'terminal_code', v_existing.terminal_code,
      'total_amount', v_existing.total_amount,
      'already_synced', true
    );
  END IF;

  -- Reject malformed line items before calling the legacy RPC.
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric)
    WHERE product_id IS NULL OR qty IS NULL OR qty <= 0 OR qty > 1000000 OR
          unit_price IS NULL OR unit_price < 0 OR unit_price > 100000000
  ) THEN
    RAISE EXCEPTION 'Invalid cart item';
  END IF;

  -- Validate total requested quantity per product (not per cart line).
  -- Lock rows in deterministic order, matching V6's locking order.
  FOR v_item IN
    SELECT product_id, SUM(qty) AS qty
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, qty numeric, unit_price numeric)
    GROUP BY product_id
    ORDER BY product_id
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

  -- Nested call participates in the same transaction. If UPDATE fails, all
  -- inserted sale lines / inventory changes roll back atomically.
  v_result := public.ea_record_cart_sale(p_terminal_code, p_items, p_note);

  UPDATE public.ea_sales
  SET client_sale_id = p_client_sale_id,
      payment_method = p_payment_method
  WHERE id = (v_result->>'sale_id')::uuid;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found after recording'; END IF;
  RETURN v_result || jsonb_build_object('already_synced', false);
END;
$$;

REVOKE ALL ON FUNCTION public.ea_record_offline_cart_sale(text,jsonb,text,text,text) FROM PUBLIC;
-- This grant is for compatibility with existing browser-only POS auth.
-- Restrict to authenticated staff after implementing a proper access policy.
GRANT EXECUTE ON FUNCTION public.ea_record_offline_cart_sale(text,jsonb,text,text,text) TO anon, authenticated;

COMMIT;
