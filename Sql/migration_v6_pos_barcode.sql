-- EA Fair Sale V6 - POS + Barcode + Multi Terminal
-- รันหลัง supabase.sql ของ V5

alter table public.ea_products add column if not exists barcode text;
create unique index if not exists uq_ea_products_barcode
  on public.ea_products (barcode)
  where barcode is not null and barcode <> '';

alter table public.ea_sales add column if not exists terminal_code text not null default 'POS-01';
create index if not exists idx_ea_sales_terminal_date on public.ea_sales (terminal_code, sale_date);

create or replace function public.ea_record_cart_sale(
  p_terminal_code text,
  p_items jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.ea_sales%rowtype;
  v_sale_no text;
  v_total numeric(12,2) := 0;
  v_terminal text;
  v_item record;
  v_product public.ea_products%rowtype;
  v_after numeric(12,2);
begin
  v_terminal := upper(trim(coalesce(p_terminal_code,'POS-01')));
  if v_terminal = '' then v_terminal := 'POS-01'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Cart is empty';
  end if;

  -- Lock สินค้าที่อยู่ในตะกร้าตามลำดับ UUID เพื่อรองรับหลาย POS พร้อมกัน
  for v_product in
    select p.*
    from public.ea_products p
    join (
      select distinct product_id
      from jsonb_to_recordset(p_items) as x(product_id uuid, qty numeric, unit_price numeric)
    ) i on i.product_id = p.id
    where p.is_active = true
    order by p.id::text
    for update
  loop
    null;
  end loop;

  -- ตรวจ stock และรวมยอด หลังจาก lock แล้ว
  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty numeric, unit_price numeric)
  loop
    if v_item.qty is null or v_item.qty <= 0 then raise exception 'Quantity must be greater than 0'; end if;
    if v_item.unit_price is null or v_item.unit_price < 0 then raise exception 'Unit price cannot be negative'; end if;

    select * into v_product
    from public.ea_products
    where id=v_item.product_id and is_active=true;

    if not found then raise exception 'Product not found'; end if;
    if v_product.stock_qty < v_item.qty then
      raise exception 'Insufficient stock for %. Available: %', v_product.product_name, v_product.stock_qty;
    end if;

    v_total := v_total + (v_item.qty * v_item.unit_price);
  end loop;

  v_sale_no := 'FS-' || to_char(clock_timestamp(),'YYYYMMDD-HH24MISSMS') || '-' || replace(v_terminal,' ','');

  insert into public.ea_sales(sale_no,sale_date,sale_time,total_amount,note,terminal_code)
  values(v_sale_no,current_date,localtime,v_total,p_note,v_terminal)
  returning * into v_sale;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty numeric, unit_price numeric)
  loop
    select * into v_product from public.ea_products where id=v_item.product_id;
    v_after := v_product.stock_qty - v_item.qty;

    insert into public.ea_sale_items(sale_id,product_id,product_code,product_name,qty,unit_price)
    values(v_sale.id,v_product.id,v_product.product_code,v_product.product_name,v_item.qty,v_item.unit_price);

    update public.ea_products set stock_qty=v_after where id=v_product.id;

    insert into public.ea_stock_movements(
      movement_type,product_id,product_code,product_name,
      qty_change,stock_before,stock_after,reference_id,note
    ) values(
      'SALE',v_product.id,v_product.product_code,v_product.product_name,
      -v_item.qty,v_product.stock_qty,v_after,v_sale.id,coalesce(p_note,'ขายสินค้า '||v_terminal)
    );
  end loop;

  return jsonb_build_object(
    'sale_id',v_sale.id,
    'sale_no',v_sale.sale_no,
    'terminal_code',v_terminal,
    'total_amount',v_total
  );
end;
$$;

grant execute on function public.ea_record_cart_sale(text,jsonb,text) to anon;
