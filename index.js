// =========================================================
// EA Fair Sale V5 - Supabase Edition
// Tablet App / No Sidebar
// =========================================================

// ใส่ Project URL และ Publishable/Anon key ของ EA Fair Sale ที่นี่
const SUPABASE_URL = "PUT_YOUR_SUPABASE_URL_HERE";
const SUPABASE_KEY = "PUT_YOUR_PUBLISHABLE_OR_ANON_KEY_HERE";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PUT_YOUR") &&
  !SUPABASE_KEY.includes("PUT_YOUR");

const sb = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const state = {
  page: "home",
  settings: {
    shopName: "EA Fair Sale",
    target: 5000,
    lowStockDefault: 5
  },
  products: [],
  sales: [],
  saleItems: [],
  movements: [],
  loading: false
};

const el = id => document.getElementById(id);
const money = n => Number(n || 0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};

function toast(text){
  const t = el("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function card(title,body,action=""){
  return `<section class="card">
    <div class="card-head"><h2>${title}</h2>${action}</div>
    <div class="card-body">${body}</div>
  </section>`;
}

function setHeader(title,sub){
  el("pageTitle").textContent = title;
  el("pageSubtitle").textContent = sub;
}

function setLoading(flag){
  state.loading = flag;
  if(flag){
    el("content").innerHTML = `
      <div class="card">
        <div class="empty">กำลังโหลดข้อมูล...</div>
      </div>`;
  }
}

function connectionNotice(){
  if(configured) return "";
  return `
    <div class="connection-warning">
      <strong>ยังไม่ได้เชื่อม Supabase</strong>
      <span>ใส่ SUPABASE_URL และ SUPABASE_KEY ที่ด้านบนของไฟล์ index.js ก่อนใช้งานจริง</span>
    </div>`;
}

function statusForProduct(p){
  if(Number(p.stock_qty) <= 0) return `<span class="status out">หมด</span>`;
  if(Number(p.stock_qty) <= Number(p.min_stock)) return `<span class="status low">ใกล้หมด</span>`;
  return `<span class="status ok">ปกติ</span>`;
}

function todaySales(){
  return state.sales.filter(x => x.sale_date === todayISO());
}

function todayTotal(){
  return todaySales().reduce((sum,x)=>sum + Number(x.total_amount || 0),0);
}

function lowProducts(){
  return state.products.filter(x => Number(x.stock_qty) <= Number(x.min_stock));
}

async function loadAll(){
  if(!sb){
    render();
    return;
  }

  setLoading(true);

  const [productsRes,salesRes,itemsRes,movesRes,settingsRes] = await Promise.all([
    sb.from("ea_products")
      .select("*")
      .eq("is_active",true)
      .order("product_name",{ascending:true}),

    sb.from("ea_sales")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(500),

    sb.from("ea_sale_items")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(1000),

    sb.from("ea_stock_movements")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(500),

    sb.from("ea_settings")
      .select("*")
  ]);

  const errors = [productsRes.error,salesRes.error,itemsRes.error,movesRes.error,settingsRes.error].filter(Boolean);

  if(errors.length){
    console.error(errors);
    state.loading = false;
    render();
    toast("โหลดข้อมูลไม่สำเร็จ ตรวจสอบ Supabase");
    return;
  }

  state.products = productsRes.data || [];
  state.sales = salesRes.data || [];
  state.saleItems = itemsRes.data || [];
  state.movements = movesRes.data || [];

  for(const row of settingsRes.data || []){
    if(row.setting_key === "shop_name") state.settings.shopName = row.setting_value || "EA Fair Sale";
    if(row.setting_key === "daily_target") state.settings.target = Number(row.setting_value || 5000);
    if(row.setting_key === "low_stock_default") state.settings.lowStockDefault = Number(row.setting_value || 5);
  }

  state.loading = false;
  render();
}

function renderHome(){
  setHeader("เมนูหลัก","เลือกเมนูที่ต้องการใช้งาน");
  const sales = todayTotal();
  const pct = Math.min(100,Math.round(sales / Math.max(1,state.settings.target) * 100));

  el("content").innerHTML = `
    ${connectionNotice()}
    <section class="app-home">
      <div class="welcome-strip">
        <div>
          <div class="eyebrow">EA FAIR SALE</div>
          <h2>วันนี้ต้องการทำอะไร?</h2>
          <p>แตะเมนูด้านล่างเพื่อเริ่มใช้งาน</p>
        </div>
        <div class="today-summary">
          <span>ยอดขายวันนี้</span>
          <strong>฿${money(sales)}</strong>
          <small>${pct}% ของเป้าหมาย</small>
        </div>
      </div>

      <div class="app-menu-grid">
        <button class="app-tile tile-sale" onclick="go('sale')">
          <span class="tile-icon">🛒</span>
          <span class="tile-text"><strong>ขายสินค้า</strong><small>บันทึกการขาย / ตัดสต็อก</small></span>
          <span class="tile-arrow">›</span>
        </button>

        <button class="app-tile tile-dashboard" onclick="go('dashboard')">
          <span class="tile-icon">📈</span>
          <span class="tile-text"><strong>Dashboard</strong><small>ดูยอดขายและภาพรวมวันนี้</small></span>
          <span class="tile-arrow">›</span>
        </button>

        <button class="app-tile tile-movement" onclick="go('movement')">
          <span class="tile-icon">📥</span>
          <span class="tile-text"><strong>รับเข้า / เบิกสินค้า</strong><small>เพิ่ม ลด หรือปรับยอดสต็อก</small></span>
          <span class="tile-arrow">›</span>
        </button>

        <button class="app-tile tile-stock" onclick="go('stock')">
          <span class="tile-icon">📦</span>
          <span class="tile-text"><strong>สต็อกสินค้า</strong><small>เช็กของคงเหลือและราคา</small></span>
          <span class="tile-badge">${lowProducts().length} ใกล้หมด</span>
        </button>

        <button class="app-tile tile-report" onclick="go('report')">
          <span class="tile-icon">📊</span>
          <span class="tile-text"><strong>รายงาน</strong><small>สรุปยอดขาย / Export CSV</small></span>
          <span class="tile-arrow">›</span>
        </button>

        <button class="app-tile tile-settings" onclick="go('settings')">
          <span class="tile-icon">⚙️</span>
          <span class="tile-text"><strong>ตั้งค่า</strong><small>เป้าหมายและค่าพื้นฐาน</small></span>
          <span class="tile-arrow">›</span>
        </button>
      </div>

      <div class="home-footer">
        <span>สินค้า ${state.products.length} รายการ</span>
        <span>•</span>
        <span>สินค้าใกล้หมด ${lowProducts().length} รายการ</span>
        <span>•</span>
        <span>ขายวันนี้ ${todaySales().length} บิล</span>
      </div>
    </section>`;
}

function renderDashboard(){
  setHeader("Dashboard","สรุปยอดขายและสต็อกวันนี้");

  const sales = todayTotal();
  const pct = Math.min(100,Math.round(sales / Math.max(1,state.settings.target) * 100));
  const today = todaySales();
  const recentItems = state.saleItems
    .filter(item => today.some(s => s.id === item.sale_id))
    .slice(0,8);

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="kpi-grid">
      <div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(sales)}</div><div class="hint">${today.length} บิล</div></div>
      <div class="kpi success"><div class="label">เป้าหมายวันนี้</div><div class="value">${pct}%</div><div class="hint">เป้าหมาย ฿${money(state.settings.target)}</div></div>
      <div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div><div class="hint">ควรตรวจสอบสต็อก</div></div>
      <div class="kpi info"><div class="label">จำนวนสินค้า</div><div class="value">${state.products.length}</div><div class="hint">สินค้าใช้งานอยู่</div></div>
    </div>

    <div class="panel-grid">
      ${card("รายการขายล่าสุด",`
        <div class="table-wrap">
          <table>
            <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ยอดขาย</th></tr></thead>
            <tbody>
              ${recentItems.length ? recentItems.map(x=>`
                <tr>
                  <td>${escapeHtml(x.product_name)}</td>
                  <td>${x.qty}</td>
                  <td>฿${money(x.unit_price)}</td>
                  <td>฿${money(x.line_total)}</td>
                </tr>`).join("") : `<tr><td colspan="4" class="empty">ยังไม่มีรายการขายวันนี้</td></tr>`}
            </tbody>
          </table>
        </div>
      `,`<button class="btn btn-light" onclick="go('sale')">ขายสินค้า</button>`)}

      <div style="display:grid;gap:18px">
        ${card("เป้าหมายยอดขาย",`
          <div class="summary-row"><strong>฿${money(sales)}</strong><span class="badge">${pct}%</span></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <div style="margin-top:10px;color:var(--muted);font-size:12px">
            เหลืออีก ฿${money(Math.max(0,state.settings.target-sales))}
          </div>
        `)}

        ${card("สินค้าใกล้หมด",`
          <div class="list">
            ${lowProducts().slice(0,6).map(x=>`
              <div class="list-item">
                <div><strong>${escapeHtml(x.product_name)}</strong><small>${escapeHtml(x.product_code)} • ขั้นต่ำ ${x.min_stock}</small></div>
                ${statusForProduct(x)}
              </div>`).join("") || `<div class="empty">สต็อกปกติ</div>`}
          </div>
        `,`<button class="btn btn-light" onclick="go('stock')">ดูสต็อก</button>`)}
      </div>
    </div>`;
}

function renderSale(){
  setHeader("ขายสินค้า","บันทึกการขายและตัดสต็อกอัตโนมัติ");

  const options = state.products
    .filter(x => Number(x.stock_qty) > 0)
    .map(x=>`<option value="${x.id}">${escapeHtml(x.product_name)} — เหลือ ${x.stock_qty}</option>`)
    .join("");

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="panel-grid">
      ${card("เพิ่มรายการขาย",`
        <div class="form-grid">
          <div class="field">
            <label>สินค้า</label>
            <select id="saleProduct" onchange="fillPrice()">
              <option value="">เลือกสินค้า</option>
              ${options}
            </select>
          </div>
          <div class="field"><label>จำนวน</label><input id="saleQty" type="number" min="1" step="1" value="1"></div>
          <div class="field"><label>ราคาต่อหน่วย</label><input id="salePrice" type="number" min="0" step="0.01"></div>
          <div class="field"><label>หมายเหตุ</label><input id="saleNote" placeholder="ไม่บังคับ"></div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" onclick="saveSale()">บันทึกการขาย</button>
        </div>
      `)}
      ${card("ทางลัด",`
        <div class="quick-grid">
          <button class="quick" onclick="go('movement')"><div class="icon">📥</div><strong>รับสินค้าเข้า</strong></button>
          <button class="quick" onclick="go('stock')"><div class="icon">📦</div><strong>เช็กสต็อก</strong></button>
        </div>
      `)}
    </div>`;
}

function fillPrice(){
  const id = el("saleProduct")?.value;
  const p = state.products.find(x=>x.id === id);
  if(p && el("salePrice")) el("salePrice").value = Number(p.sale_price);
}

async function saveSale(){
  if(!sb){ toast("ยังไม่ได้ตั้งค่า Supabase"); return; }

  const productId = el("saleProduct").value;
  const qty = Number(el("saleQty").value);
  const price = Number(el("salePrice").value);
  const note = el("saleNote").value.trim();

  if(!productId){ toast("กรุณาเลือกสินค้า"); return; }
  if(qty <= 0){ toast("จำนวนต้องมากกว่า 0"); return; }
  if(price < 0){ toast("ราคาไม่ถูกต้อง"); return; }

  const btn = event?.currentTarget;
  if(btn) btn.disabled = true;

  const {data,error} = await sb.rpc("ea_record_sale",{
    p_product_id: productId,
    p_qty: qty,
    p_unit_price: price,
    p_note: note || null
  });

  if(btn) btn.disabled = false;

  if(error){
    console.error(error);
    toast(error.message.includes("Insufficient stock") ? "สต็อกไม่พอ" : "บันทึกการขายไม่สำเร็จ");
    return;
  }

  toast(`ขายสินค้าแล้ว ฿${money(data?.total_amount || qty*price)}`);
  await loadAll();
  go("sale");
}

function renderStock(){
  setHeader("สต็อกสินค้า","จัดการสินค้า ราคา และจำนวนคงเหลือ");

  const q = el("searchInput").value.trim().toLowerCase();
  const rows = state.products.filter(x =>
    !q ||
    x.product_name.toLowerCase().includes(q) ||
    x.product_code.toLowerCase().includes(q)
  );

  el("content").innerHTML = `
    ${connectionNotice()}
    ${card("รายการสินค้า",`
      <div class="table-wrap">
        <table>
          <thead><tr><th>รหัส</th><th>สินค้า</th><th>ราคา</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            ${rows.map(x=>`
              <tr>
                <td>${escapeHtml(x.product_code)}</td>
                <td>${escapeHtml(x.product_name)}</td>
                <td>฿${money(x.sale_price)}</td>
                <td>${x.stock_qty}</td>
                <td>${x.min_stock}</td>
                <td>${statusForProduct(x)}</td>
                <td>
                  <div class="mini-actions">
                    <button class="mini-btn" onclick="editProduct('${x.id}')">แก้ไข</button>
                    <button class="mini-btn" onclick="quickReceive('${x.id}')">รับเข้า</button>
                  </div>
                </td>
              </tr>`).join("") || `<tr><td colspan="7" class="empty">ไม่พบสินค้า</td></tr>`}
          </tbody>
        </table>
      </div>
    `,`<button class="btn btn-primary" onclick="openProductModal()">+ เพิ่มสินค้า</button>`)}
  `;
}

function openProductModal(productId=null){
  const p = productId ? state.products.find(x=>x.id===productId) : null;

  el("modalTitle").textContent = p ? "แก้ไขสินค้า" : "เพิ่มสินค้า";
  el("modalBody").innerHTML = `
    <div class="form-grid">
      <div class="field"><label>รหัสสินค้า</label><input id="pCode" value="${escapeHtml(p?.product_code||"")}"></div>
      <div class="field"><label>ชื่อสินค้า</label><input id="pName" value="${escapeHtml(p?.product_name||"")}"></div>
      <div class="field"><label>ราคาขาย</label><input id="pPrice" type="number" min="0" step="0.01" value="${p?.sale_price??0}"></div>
      <div class="field"><label>จำนวนคงเหลือ</label><input id="pQty" type="number" min="0" step="1" value="${p?.stock_qty??0}" ${p ? "disabled" : ""}></div>
      <div class="field"><label>แจ้งเตือนเมื่อเหลือ</label><input id="pMin" type="number" min="0" step="1" value="${p?.min_stock??state.settings.lowStockDefault}"></div>
    </div>
    ${p ? `<div style="margin-top:10px;color:var(--muted);font-size:12px">การเปลี่ยนจำนวนคงเหลือ ให้ใช้เมนู “รับเข้า / เบิกสินค้า” เพื่อเก็บประวัติ</div>` : ""}
    <div class="actions">
      <button type="button" class="btn btn-primary" onclick="saveProduct(${productId ? `'${productId}'` : "null"})">
        ${p ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
      </button>
    </div>`;

  el("modal").showModal();
}

function editProduct(id){ openProductModal(id); }

async function saveProduct(id){
  if(!sb){ toast("ยังไม่ได้ตั้งค่า Supabase"); return; }

  const payload = {
    product_code: el("pCode").value.trim(),
    product_name: el("pName").value.trim(),
    sale_price: Number(el("pPrice").value),
    min_stock: Number(el("pMin").value),
    is_active: true
  };

  if(!payload.product_code || !payload.product_name){
    toast("กรุณากรอกรหัสและชื่อสินค้า");
    return;
  }

  let result;

  if(id){
    result = await sb.from("ea_products").update(payload).eq("id",id);
  }else{
    payload.stock_qty = Number(el("pQty").value || 0);
    result = await sb.from("ea_products").insert(payload);
  }

  if(result.error){
    console.error(result.error);
    toast(result.error.code === "23505" ? "รหัสสินค้านี้มีอยู่แล้ว" : "บันทึกสินค้าไม่สำเร็จ");
    return;
  }

  el("modal").close();
  toast(id ? "แก้ไขสินค้าแล้ว" : "เพิ่มสินค้าแล้ว");
  await loadAll();
  go("stock");
}

function quickReceive(id){
  go("movement");
  setTimeout(()=>{
    if(el("moveProduct")) el("moveProduct").value = id;
    if(el("moveType")) el("moveType").value = "IN";
  },20);
}

function renderMovement(){
  setHeader("รับเข้า / เบิกสินค้า","บันทึกการเคลื่อนไหวของสต็อก");

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="panel-grid">
      ${card("บันทึกสต็อก",`
        <div class="form-grid">
          <div class="field">
            <label>ประเภท</label>
            <select id="moveType">
              <option value="IN">รับเข้า</option>
              <option value="OUT">เบิกออก</option>
              <option value="ADJUST">ปรับยอด</option>
            </select>
          </div>
          <div class="field">
            <label>สินค้า</label>
            <select id="moveProduct">
              ${state.products.map(x=>`<option value="${x.id}">${escapeHtml(x.product_name)} — เหลือ ${x.stock_qty}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>จำนวน</label><input id="moveQty" type="number" min="0" step="1" value="1"></div>
          <div class="field"><label>หมายเหตุ</label><input id="moveNote" placeholder="เช่น รับจากคลัง / เบิกไปบูท"></div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveMovement()">บันทึก</button></div>
      `)}

      ${card("การใช้งาน",`
        <div class="list">
          <div class="list-item"><div><strong>รับเข้า</strong><small>เพิ่มสินค้าเข้าสต็อก</small></div><span class="status in">+</span></div>
          <div class="list-item"><div><strong>เบิกออก</strong><small>ลดสินค้าออกจากสต็อก</small></div><span class="status low">−</span></div>
          <div class="list-item"><div><strong>ปรับยอด</strong><small>ระบุยอดคงเหลือจริง</small></div><span class="status adjust">=</span></div>
        </div>
      `)}
    </div>

    <div style="height:18px"></div>

    ${card("ประวัติการเคลื่อนไหว",`
      <div class="table-wrap">
        <table>
          <thead><tr><th>วันที่</th><th>เวลา</th><th>ประเภท</th><th>สินค้า</th><th>เปลี่ยนแปลง</th><th>คงเหลือ</th><th>หมายเหตุ</th></tr></thead>
          <tbody>
            ${state.movements.slice(0,50).map(m=>`
              <tr>
                <td>${m.movement_date}</td>
                <td>${String(m.movement_time||"").slice(0,5)}</td>
                <td>${movementBadge(m.movement_type)}</td>
                <td>${escapeHtml(m.product_name)}</td>
                <td>${Number(m.qty_change)>0?"+":""}${m.qty_change}</td>
                <td>${m.stock_after}</td>
                <td>${escapeHtml(m.note||"")}</td>
              </tr>`).join("") || `<tr><td colspan="7" class="empty">ยังไม่มีประวัติ</td></tr>`}
          </tbody>
        </table>
      </div>
    `)}
  `;
}

function movementBadge(type){
  if(type==="IN") return `<span class="status in">รับเข้า</span>`;
  if(type==="OUT") return `<span class="status low">เบิกออก</span>`;
  if(type==="SALE") return `<span class="status sale">ขาย</span>`;
  return `<span class="status adjust">ปรับยอด</span>`;
}

async function saveMovement(){
  if(!sb){ toast("ยังไม่ได้ตั้งค่า Supabase"); return; }

  const type = el("moveType").value;
  const productId = el("moveProduct").value;
  const qty = Number(el("moveQty").value);
  const note = el("moveNote").value.trim();

  if(!productId){ toast("กรุณาเลือกสินค้า"); return; }
  if(qty < 0){ toast("จำนวนไม่ถูกต้อง"); return; }

  const {error} = await sb.rpc("ea_update_stock",{
    p_product_id: productId,
    p_type: type,
    p_qty: qty,
    p_note: note || null
  });

  if(error){
    console.error(error);
    toast(error.message.includes("Insufficient stock") ? "สต็อกไม่พอ" : "บันทึกสต็อกไม่สำเร็จ");
    return;
  }

  toast("บันทึกสต็อกแล้ว");
  await loadAll();
  go("movement");
}

function renderReport(){
  setHeader("รายงาน","สรุปยอดขายและส่งออกข้อมูล");

  const sales = todaySales();
  const total = todayTotal();
  const items = state.saleItems.filter(item => sales.some(s=>s.id===item.sale_id));
  const units = items.reduce((sum,x)=>sum+Number(x.qty||0),0);

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="kpi-grid">
      <div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(total)}</div></div>
      <div class="kpi"><div class="label">จำนวนบิล</div><div class="value">${sales.length}</div></div>
      <div class="kpi success"><div class="label">จำนวนชิ้นที่ขาย</div><div class="value">${units}</div></div>
      <div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div></div>
    </div>

    ${card("รายการขายวันนี้",`
      <div class="table-wrap">
        <table>
          <thead><tr><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ยอดขาย</th></tr></thead>
          <tbody>
            ${items.map(x=>`
              <tr>
                <td>${escapeHtml(x.product_name)}</td>
                <td>${x.qty}</td>
                <td>฿${money(x.unit_price)}</td>
                <td>฿${money(x.line_total)}</td>
              </tr>`).join("") || `<tr><td colspan="4" class="empty">ยังไม่มีข้อมูล</td></tr>`}
          </tbody>
        </table>
      </div>
    `,`
      <div class="mini-actions">
        <button class="btn btn-light" onclick="exportSalesCSV()">Export Sales CSV</button>
        <button class="btn btn-light" onclick="exportStockCSV()">Export Stock CSV</button>
      </div>`)}
  `;
}

function downloadCSV(filename,rows){
  const csv = "\ufeff" + rows.map(r =>
    r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSalesCSV(){
  const sales = todaySales();
  const items = state.saleItems.filter(item => sales.some(s=>s.id===item.sale_id));

  downloadCSV(`EA_FairSale_Sales_${todayISO()}.csv`,[
    ["สินค้า","จำนวน","ราคาต่อหน่วย","ยอดขาย"],
    ...items.map(x=>[x.product_name,x.qty,x.unit_price,x.line_total])
  ]);
}

function exportStockCSV(){
  downloadCSV(`EA_FairSale_Stock_${todayISO()}.csv`,[
    ["รหัสสินค้า","สินค้า","ราคาขาย","คงเหลือ","ขั้นต่ำ","สถานะ"],
    ...state.products.map(x=>[
      x.product_code,x.product_name,x.sale_price,x.stock_qty,x.min_stock,
      Number(x.stock_qty)<=0?"หมด":Number(x.stock_qty)<=Number(x.min_stock)?"ใกล้หมด":"ปกติ"
    ])
  ]);
}

function renderSettings(){
  setHeader("ตั้งค่า","กำหนดค่าพื้นฐานของ EA Fair Sale");

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="panel-grid">
      ${card("ตั้งค่าทั่วไป",`
        <div class="form-grid">
          <div class="field"><label>ชื่อระบบ</label><input id="shopName" value="${escapeHtml(state.settings.shopName)}"></div>
          <div class="field"><label>เป้าหมายยอดขายต่อวัน</label><input id="targetInput" type="number" min="0" value="${state.settings.target}"></div>
          <div class="field"><label>ค่าแจ้งเตือนสต็อกเริ่มต้น</label><input id="lowDefault" type="number" min="0" value="${state.settings.lowStockDefault}"></div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveSettings()">บันทึก</button></div>
      `)}

      ${card("สถานะฐานข้อมูล",`
        <div class="list">
          <div class="list-item"><div><strong>Supabase</strong><small>ฐานข้อมูลกลาง</small></div><span class="status ${configured?"ok":"out"}">${configured?"เชื่อมต่อแล้ว":"ยังไม่ตั้งค่า"}</span></div>
          <div class="list-item"><div><strong>สินค้า</strong><small>สินค้าใช้งานอยู่</small></div><span>${state.products.length}</span></div>
          <div class="list-item"><div><strong>ยอดขายทั้งหมดที่โหลด</strong><small>สูงสุด 500 รายการล่าสุด</small></div><span>${state.sales.length}</span></div>
          <div class="list-item"><div><strong>ประวัติ Stock</strong><small>สูงสุด 500 รายการล่าสุด</small></div><span>${state.movements.length}</span></div>
        </div>
      `)}
    </div>`;
}

async function upsertSetting(key,value){
  return sb.from("ea_settings").upsert({
    setting_key:key,
    setting_value:String(value)
  },{onConflict:"setting_key"});
}

async function saveSettings(){
  if(!sb){ toast("ยังไม่ได้ตั้งค่า Supabase"); return; }

  const shopName = el("shopName").value.trim() || "EA Fair Sale";
  const target = Number(el("targetInput").value || 0);
  const low = Number(el("lowDefault").value || 0);

  const results = await Promise.all([
    upsertSetting("shop_name",shopName),
    upsertSetting("daily_target",target),
    upsertSetting("low_stock_default",low)
  ]);

  const error = results.find(x=>x.error)?.error;
  if(error){
    console.error(error);
    toast("บันทึกการตั้งค่าไม่สำเร็จ");
    return;
  }

  state.settings = {shopName,target,lowStockDefault:low};
  toast("บันทึกการตั้งค่าแล้ว");
  renderSettings();
}

function go(page){
  state.page = page;
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

window.go = go;
window.fillPrice = fillPrice;
window.saveSale = saveSale;
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.quickReceive = quickReceive;
window.saveMovement = saveMovement;
window.exportSalesCSV = exportSalesCSV;
window.exportStockCSV = exportStockCSV;
window.saveSettings = saveSettings;

function render(){
  const backBtn = el("homeBackBtn");
  if(backBtn) backBtn.classList.toggle("hidden",state.page==="home");

  if(state.loading) return;

  if(state.page==="home") renderHome();
  else if(state.page==="dashboard") renderDashboard();
  else if(state.page==="sale") renderSale();
  else if(state.page==="stock") renderStock();
  else if(state.page==="movement") renderMovement();
  else if(state.page==="report") renderReport();
  else renderSettings();
}

loadAll();
