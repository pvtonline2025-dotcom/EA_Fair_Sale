// =========================================================
// EA Fair Sale V6 - POS + Barcode + Multi Terminal
// =========================================================

const SUPABASE_URL = window.EA_SUPABASE_CONFIG?.url || "";
const SUPABASE_KEY = window.EA_SUPABASE_CONFIG?.key || "";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PUT_YOUR") && !SUPABASE_KEY.includes("PUT_YOUR");
const sb = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TERMINAL_KEY = "ea_fairsale_terminal";
const CART_KEY = "ea_fairsale_cart";
const state = {
  page:"home",
  terminal:localStorage.getItem(TERMINAL_KEY)||"POS-01",
  settings:{shopName:"EA Fair Sale",target:5000,lowStockDefault:5},
  products:[],sales:[],saleItems:[],movements:[],
  cart:loadCart(),loading:false
};

let scannerControls=null;
let scannerReader=null;
let lastScannedCode="";
let lastScannedAt=0;

const el=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};

function loadCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []}}
function saveCartLocal(){localStorage.setItem(CART_KEY,JSON.stringify(state.cart))}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function toast(t){const x=el("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2100)}
function card(title,body,action=""){return `<section class="card"><div class="card-head"><h2>${title}</h2>${action}</div><div class="card-body">${body}</div></section>`}
function setHeader(t,s){el("pageTitle").textContent=t;el("pageSubtitle").textContent=s}
function connectionNotice(){return configured?"":`<div class="connection-warning"><strong>ยังไม่ได้เชื่อม Supabase</strong><span>ใส่ SUPABASE_URL และ SUPABASE_KEY ใน index.js</span></div>`}
function statusForProduct(p){if(Number(p.stock_qty)<=0)return `<span class="status out">หมด</span>`;if(Number(p.stock_qty)<=Number(p.min_stock))return `<span class="status low">ใกล้หมด</span>`;return `<span class="status ok">ปกติ</span>`}
function todaySales(){return state.sales.filter(x=>x.sale_date===todayISO())}
function todayTotal(){return todaySales().reduce((s,x)=>s+Number(x.total_amount||0),0)}
function lowProducts(){return state.products.filter(x=>Number(x.stock_qty)<=Number(x.min_stock))}
function productById(id){return state.products.find(x=>x.id===id)}
function productByBarcode(code){return state.products.find(x=>String(x.barcode||"").trim()===String(code||"").trim())}
function cartCount(){return state.cart.reduce((s,x)=>s+Number(x.qty||0),0)}
function cartTotal(){return state.cart.reduce((s,x)=>s+Number(x.qty)*Number(x.unit_price),0)}

async function loadAll(){
  if(!sb){render();return}
  state.loading=true;el("content").innerHTML=`<div class="card"><div class="empty">กำลังโหลดข้อมูล...</div></div>`;
  const [p,s,i,m,g]=await Promise.all([
    sb.from("ea_products").select("*").eq("is_active",true).order("product_name"),
    sb.from("ea_sales").select("*").order("created_at",{ascending:false}).limit(500),
    sb.from("ea_sale_items").select("*").order("created_at",{ascending:false}).limit(1200),
    sb.from("ea_stock_movements").select("*").order("created_at",{ascending:false}).limit(600),
    sb.from("ea_settings").select("*")
  ]);
  const err=[p.error,s.error,i.error,m.error,g.error].find(Boolean);
  if(err){console.error(err);state.loading=false;render();toast("โหลดข้อมูลไม่สำเร็จ");return}
  state.products=p.data||[];state.sales=s.data||[];state.saleItems=i.data||[];state.movements=m.data||[];
  for(const r of g.data||[]){if(r.setting_key==="shop_name")state.settings.shopName=r.setting_value||"EA Fair Sale";if(r.setting_key==="daily_target")state.settings.target=Number(r.setting_value||5000);if(r.setting_key==="low_stock_default")state.settings.lowStockDefault=Number(r.setting_value||5)}
  state.cart=state.cart.map(c=>{const pr=productById(c.product_id);return pr?{...c,name:pr.product_name,barcode:pr.barcode,stock:Number(pr.stock_qty)}:null}).filter(Boolean);saveCartLocal();
  state.loading=false;render();
}


function getTodayItemStats(){
  const salesToday = todaySales();
  const saleIds = new Set(salesToday.map(s=>s.id));
  const stats = {};

  for(const item of state.saleItems){
    if(!saleIds.has(item.sale_id)) continue;

    const key = item.product_id || item.product_name;
    if(!stats[key]){
      stats[key] = {
        product_id:item.product_id,
        product_name:item.product_name || "ไม่ระบุ",
        qty:0,
        revenue:0
      };
    }

    stats[key].qty += Number(item.qty || 0);
    stats[key].revenue += Number(item.line_total || 0);
  }

  return Object.values(stats);
}

function getHourlySales(){
  const buckets = {};
  for(let h=8; h<=20; h++) buckets[h] = 0;

  for(const sale of todaySales()){
    const h = Number(String(sale.sale_time || "00:00").slice(0,2));
    if(Number.isFinite(h)){
      if(!(h in buckets)) buckets[h] = 0;
      buckets[h] += Number(sale.total_amount || 0);
    }
  }

  return Object.entries(buckets)
    .map(([hour,total])=>({hour:Number(hour), total:Number(total)}))
    .sort((a,b)=>a.hour-b.hour);
}

function buildReorderRecommendations(){
  const todayStats = getTodayItemStats();
  const soldMap = new Map(todayStats.map(x=>[x.product_id, x.qty]));

  return state.products
    .map(p=>{
      const stock = Number(p.stock_qty || 0);
      const min = Number(p.min_stock || 0);
      const sold = Number(soldMap.get(p.id) || 0);

      // คะแนนแนวโน้ม: ของต่ำกว่ากำหนด + ขายเร็วในวันนี้
      const lowRatio = min > 0 ? Math.max(0, (min - stock) / min) : 0;
      const velocity = sold / Math.max(stock, 1);
      const score = lowRatio * 2 + velocity;

      const targetStock = Math.max(min * 2, sold * 2);
      const suggested = Math.max(0, Math.ceil(targetStock - stock));

      let level = "ปกติ";
      let className = "ok";

      if(stock <= 0 || score >= 2){
        level = "ควรสั่งด่วน";
        className = "out";
      }else if(stock <= min || score >= 0.8){
        level = "ควรสั่งเพิ่ม";
        className = "low";
      }else if(sold > 0 && stock <= min * 1.5){
        level = "เฝ้าระวัง";
        className = "sale";
      }

      return {
        ...p,
        soldToday:sold,
        score,
        suggested,
        level,
        className
      };
    })
    .filter(x=>x.level !== "ปกติ")
    .sort((a,b)=>b.score-a.score)
    .slice(0,8);
}

function renderHourlyChart(){
  const data = getHourlySales();
  const max = Math.max(...data.map(x=>x.total), 1);

  return `
    <div class="daily-chart">
      ${data.map(x=>{
        const height = Math.max(3, Math.round((x.total/max)*100));
        return `
          <div class="daily-bar-wrap" title="${String(x.hour).padStart(2,"0")}:00 • ฿${money(x.total)}">
            <div class="daily-bar-value">${x.total ? "฿"+money(x.total) : ""}</div>
            <div class="daily-bar-track">
              <div class="daily-bar" style="height:${height}%"></div>
            </div>
            <div class="daily-bar-label">${String(x.hour).padStart(2,"0")}</div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderHome(){
  setHeader("HOME","Dashboard รายวัน");

  const total = todayTotal();
  const bills = todaySales().length;
  const todayStats = getTodayItemStats();
  const units = todayStats.reduce((s,x)=>s+x.qty,0);
  const target = Number(state.settings.target || 0);
  const targetPct = target > 0 ? Math.min(100, Math.round(total/target*100)) : 0;

  const topQty = [...todayStats].sort((a,b)=>b.qty-a.qty).slice(0,5);
  const topRevenue = [...todayStats].sort((a,b)=>b.revenue-a.revenue).slice(0,5);
  const low = lowProducts().sort((a,b)=>Number(a.stock_qty)-Number(b.stock_qty)).slice(0,8);
  const reorder = buildReorderRecommendations();

  const todayMoves = state.movements
    .filter(m=>m.movement_date===todayISO())
    .slice(0,12);

  el("content").innerHTML = `
    ${connectionNotice()}

    <section class="daily-home">
      <div class="daily-status-head">
        <div>
          <div class="eyebrow">EA FAIR SALE • ${state.terminal}</div>
          <h2>สถานะวันนี้</h2>
          <p>${new Date().toLocaleDateString("th-TH",{dateStyle:"full"})}</p>
        </div>
        <button class="btn btn-light" onclick="go('menu')">☰ เมนูทั้งหมด</button>
      </div>

      <div class="kpi-grid daily-kpi-grid">
        <div class="kpi primary">
          <div class="label">ยอดขายวันนี้</div>
          <div class="value">฿${money(total)}</div>
          <div class="hint">${bills} บิล</div>
        </div>

        <div class="kpi success">
          <div class="label">จำนวนสินค้าที่ขาย</div>
          <div class="value">${units}</div>
          <div class="hint">${todayStats.length} รายการสินค้า</div>
        </div>

        <div class="kpi info">
          <div class="label">เป้าหมายวันนี้</div>
          <div class="value">${targetPct}%</div>
          <div class="hint">เป้าหมาย ฿${money(target)}</div>
        </div>

        <div class="kpi warning">
          <div class="label">สินค้า Stock ต่ำ</div>
          <div class="value">${lowProducts().length}</div>
          <div class="hint">${reorder.length} รายการควรพิจารณาสั่งเพิ่ม</div>
        </div>
      </div>

      <div class="dashboard-grid dashboard-grid-main">
        ${card("กราฟยอดขายระหว่างวัน",`
          ${renderHourlyChart()}
        `)}

        ${card("ความเคลื่อนไหวล่าสุดวันนี้",`
          <div class="activity-list">
            ${todayMoves.length ? todayMoves.map(m=>`
              <div class="activity-row">
                <span class="activity-time">${String(m.movement_time||"").slice(0,5)}</span>
                <div class="activity-info">
                  <strong>${escapeHtml(m.product_name)}</strong>
                  <small>${escapeHtml(m.note||m.movement_type||"")}</small>
                </div>
                <span class="activity-change ${Number(m.qty_change)>=0?"plus":"minus"}">
                  ${Number(m.qty_change)>0?"+":""}${m.qty_change}
                </span>
              </div>`).join("") :
              `<div class="empty">ยังไม่มีความเคลื่อนไหววันนี้</div>`}
          </div>
        `)}
      </div>

      <div class="dashboard-grid">
        ${card("ขายจำนวนมากที่สุด",`
          <div class="rank-list">
            ${topQty.length ? topQty.map((x,i)=>`
              <div class="rank-row">
                <span class="rank-no">${i+1}</span>
                <div class="rank-info">
                  <strong>${escapeHtml(x.product_name)}</strong>
                  <small>ยอดขาย ฿${money(x.revenue)}</small>
                </div>
                <span class="rank-value">${x.qty} ชิ้น</span>
              </div>`).join("") :
              `<div class="empty">ยังไม่มีรายการขายวันนี้</div>`}
          </div>
        `)}

        ${card("ยอดขายสูงที่สุด",`
          <div class="rank-list">
            ${topRevenue.length ? topRevenue.map((x,i)=>`
              <div class="rank-row">
                <span class="rank-no">${i+1}</span>
                <div class="rank-info">
                  <strong>${escapeHtml(x.product_name)}</strong>
                  <small>ขาย ${x.qty} ชิ้น</small>
                </div>
                <span class="rank-value">฿${money(x.revenue)}</span>
              </div>`).join("") :
              `<div class="empty">ยังไม่มีรายการขายวันนี้</div>`}
          </div>
        `)}
      </div>

      <div class="dashboard-grid">
        ${card("สินค้าเหลือต่ำกว่ากำหนด",`
          <div class="low-stock-cards">
            ${low.length ? low.map(p=>`
              <button class="low-stock-row" onclick="quickReceive('${p.id}')">
                <div>
                  <strong>${escapeHtml(p.product_name)}</strong>
                  <small>${escapeHtml(p.product_code)} • ขั้นต่ำ ${p.min_stock}</small>
                </div>
                <div class="low-stock-right">
                  <span class="stock-number">${p.stock_qty}</span>
                  ${statusForProduct(p)}
                </div>
              </button>`).join("") :
              `<div class="empty">Stock อยู่ในระดับปกติ</div>`}
          </div>
        `)}

        ${card("แนวโน้มควรสั่งสินค้าเพิ่ม",`
          <div class="reorder-list">
            ${reorder.length ? reorder.map(p=>`
              <div class="reorder-row">
                <div>
                  <strong>${escapeHtml(p.product_name)}</strong>
                  <small>เหลือ ${p.stock_qty} • ขายวันนี้ ${p.soldToday} • ขั้นต่ำ ${p.min_stock}</small>
                </div>
                <div class="reorder-action">
                  <span class="status ${p.className}">${p.level}</span>
                  <strong>${p.suggested>0 ? "แนะนำ +"+p.suggested : "ติดตาม"}</strong>
                </div>
              </div>`).join("") :
              `<div class="empty">ยังไม่มีรายการที่ต้องสั่งเพิ่มในขณะนี้</div>`}
          </div>
          <p class="trend-note">* คำแนะนำคำนวณจาก Stock ปัจจุบัน, จุดแจ้งเตือนขั้นต่ำ และอัตราการขายของวันนี้</p>
        `)}
      </div>
    </section>`;
}

function renderMenu(){
  setHeader("MENU","เลือกเมนูที่ต้องการใช้งาน");
  const sales=todayTotal();
  const pct=Math.min(100,Math.round(sales/Math.max(1,state.settings.target)*100));

  el("content").innerHTML=`
    ${connectionNotice()}
    <section class="app-home image-menu-home">
      <div class="welcome-strip compact-welcome">
        <div>
          <div class="eyebrow">EA FAIR SALE • ${state.terminal}</div>
          <h2>วันนี้ต้องการทำอะไร?</h2>
          <p>แตะรูปเมนูเพื่อเริ่มใช้งาน</p>
        </div>
        <div class="today-summary">
          <span>ยอดขายวันนี้</span>
          <strong>฿${money(sales)}</strong>
          <small>${pct}% ของเป้าหมาย</small>
        </div>
      </div>

      <div class="image-menu-grid">
        <button class="image-menu-btn" onclick="go('sale')" aria-label="POS ขายสินค้า">
          <img src="./images/btn-sale.png" alt="Sale Products">
        </button>
        <button class="image-menu-btn" onclick="go('dashboardToday')" aria-label="Dashboard วันนี้">
          <img src="./images/btn-dashboard-today.png" alt="Report Today">
        </button>
        <button class="image-menu-btn" onclick="go('dashboardAll')" aria-label="Dashboard รวมทั้งงาน">
          <img src="./images/btn-dashboard-all.png" alt="Home Dashboard">
        </button>
        <button class="image-menu-btn" onclick="goMovement('IN')" aria-label="รับสินค้าเข้า">
          <img src="./images/btn-add-stock.png" alt="Add Stock">
        </button>
        <button class="image-menu-btn" onclick="goMovement('OUT')" aria-label="เบิกสินค้าออก">
          <img src="./images/btn-out-stock.png" alt="Out Stock">
        </button>
        <button class="image-menu-btn" onclick="openNewProductFromHome()" aria-label="เพิ่มสินค้าใหม่">
          <img src="./images/btn-new-product.png" alt="New Products">
        </button>
        <button class="image-menu-btn" onclick="go('stock')" aria-label="สต็อกสินค้า">
          <img src="./images/btn-stock.png" alt="Stock Products">
        </button>
        <button class="image-menu-btn menu-with-badge" onclick="go('lowStock')" aria-label="สินค้าใกล้หมด">
          <img src="./images/btn-low-stock.png" alt="Low Stock">
          <span class="menu-count-badge">${lowProducts().length}</span>
        </button>
        <button class="image-menu-btn" onclick="go('report')" aria-label="ส่งออกรายงาน">
          <img src="./images/btn-export.png" alt="Export Report">
        </button>
        <button class="image-menu-btn" onclick="go('settings')" aria-label="ตั้งค่า">
          <img src="./images/btn-setting.png" alt="Setting">
        </button>
      </div>
    </section>`;
}

function goMovement(type){
  go("movement");
  setTimeout(()=>{
    const moveType=el("moveType");
    if(moveType) moveType.value=type;
  },40);
}

function openNewProductFromHome(){
  openProductModal();
}

function renderLowStock(){
  setHeader("LOW STOCK","สินค้าใกล้หมด / สินค้าหมด");
  const rows=lowProducts();

  el("content").innerHTML=`
    ${connectionNotice()}
    ${card("สินค้าใกล้หมด",`
      <div class="table-wrap">
        <table>
          <thead><tr><th>รหัส</th><th>Barcode</th><th>สินค้า</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(p=>`
              <tr>
                <td>${escapeHtml(p.product_code)}</td>
                <td class="barcode-value">${escapeHtml(p.barcode||"-")}</td>
                <td>${escapeHtml(p.product_name)}</td>
                <td>${p.stock_qty}</td>
                <td>${p.min_stock}</td>
                <td>${statusForProduct(p)}</td>
                <td><button class="mini-btn" onclick="quickReceive('${p.id}')">รับเข้า</button></td>
              </tr>`).join("") : `<tr><td colspan="7" class="empty">ไม่มีสินค้าใกล้หมด</td></tr>`}
          </tbody>
        </table>
      </div>
    `)}
  `;
}

function renderSale(){
  setHeader("POS ขายสินค้า",`จุดขาย ${state.terminal} • สแกนสินค้าแล้วค่อยยืนยันทั้งตะกร้า`);
  const opts=state.products.filter(p=>Number(p.stock_qty)>0).map(p=>`<option value="${p.id}">${escapeHtml(p.product_name)} — เหลือ ${p.stock_qty}</option>`).join("");
  el("content").innerHTML=`${connectionNotice()}<div class="pos-layout"><div class="pos-panel">${card("สแกน / เลือกสินค้า",`<div class="scan-zone"><div class="scan-icon">▥</div><h3>สแกนบาร์โค้ดด้วยกล้องหลัง</h3><p>กล้องเปิดค้างเพื่อสแกนสินค้าได้ต่อเนื่อง</p><div class="scan-actions"><button class="btn btn-primary" onclick="startScanner()">📷 เปิดกล้องสแกน</button></div><div class="barcode-manual"><input id="manualBarcode" inputmode="numeric" placeholder="หรือพิมพ์เลขบาร์โค้ด"><button class="btn btn-light" onclick="addBarcodeFromInput()">เพิ่ม</button></div></div><div style="height:14px"></div><div class="product-picker"><select id="manualProduct"><option value="">เลือกสินค้าด้วยชื่อ</option>${opts}</select><button class="btn btn-light" onclick="addSelectedProduct()">+ เพิ่ม</button></div>`,`<span class="pos-terminal">${state.terminal}</span>`)}${card("สินค้าใกล้หมด",`<div class="list">${lowProducts().slice(0,5).map(p=>`<div class="list-item"><div><strong>${escapeHtml(p.product_name)}</strong><small>${p.stock_qty} คงเหลือ</small></div>${statusForProduct(p)}</div>`).join("")||`<div class="empty">ไม่มีสินค้าใกล้หมด</div>`}</div>`)}</div><div class="pos-panel">${card(`ตะกร้า • ${cartCount()} ชิ้น`,`${renderCartRows()}<div class="cart-total-box"><div class="line"><span>รวมสุทธิ</span><strong>฿${money(cartTotal())}</strong></div><button class="btn btn-primary checkout-btn" onclick="checkoutCart()" ${state.cart.length?"":"disabled"}>✓ ยืนยันการขาย</button>${state.cart.length?`<button class="btn btn-light" style="width:100%;margin-top:8px" onclick="clearCart()">ล้างตะกร้า</button>`:""}</div>`)}</div></div>`;
}

function renderCartRows(){if(!state.cart.length)return `<div class="empty">ยังไม่มีสินค้า<br><small>สแกนบาร์โค้ดเพื่อเพิ่มลงตะกร้า</small></div>`;return `<div class="cart-list">${state.cart.map((c,i)=>`<div class="cart-row"><div><div class="cart-name">${escapeHtml(c.name)}</div><div class="cart-meta">${c.barcode?`Barcode: <span class="barcode-value">${escapeHtml(c.barcode)}</span> • `:""}฿${money(c.unit_price)} / ชิ้น • Stock ${c.stock}</div></div><div class="cart-side"><strong>฿${money(c.qty*c.unit_price)}</strong><div class="qty-control"><button onclick="changeCartQty(${i},-1)">−</button><strong>${c.qty}</strong><button onclick="changeCartQty(${i},1)">+</button><button onclick="removeCartItem(${i})">✕</button></div></div></div>`).join("")}</div>`}
function addProductToCart(p){if(!p){toast("ไม่พบสินค้า");return false}if(Number(p.stock_qty)<=0){toast("สินค้าหมด");return false}const row=state.cart.find(x=>x.product_id===p.id);if(row){if(row.qty+1>Number(p.stock_qty)){toast("จำนวนในตะกร้าเกิน Stock");return false}row.qty++}else state.cart.push({product_id:p.id,name:p.product_name,barcode:p.barcode||"",qty:1,unit_price:Number(p.sale_price),stock:Number(p.stock_qty)});saveCartLocal();beepSuccess();if(state.page==="sale")renderSale();return true}
function addBarcode(code){const clean=String(code||"").trim();if(!clean)return;const p=productByBarcode(clean);if(!p){toast(`ไม่พบบาร์โค้ด ${clean}`);return}addProductToCart(p)}
function addBarcodeFromInput(){const i=el("manualBarcode");addBarcode(i.value);i.value="";i.focus()}
function addSelectedProduct(){const p=productById(el("manualProduct").value);if(p)addProductToCart(p)}
function changeCartQty(i,d){const r=state.cart[i];if(!r)return;const n=r.qty+d;if(n<=0)state.cart.splice(i,1);else if(n>r.stock){toast("จำนวนเกิน Stock");return}else r.qty=n;saveCartLocal();renderSale()}
function removeCartItem(i){state.cart.splice(i,1);saveCartLocal();renderSale()}
function clearCart(){if(!confirm("ล้างสินค้าในตะกร้าทั้งหมด?"))return;state.cart=[];saveCartLocal();renderSale()}

async function checkoutCart(){
  if(!sb){toast("ยังไม่ได้ตั้งค่า Supabase");return}if(!state.cart.length){toast("ตะกร้าว่าง");return}
  const items=state.cart.map(c=>({product_id:c.product_id,qty:Number(c.qty),unit_price:Number(c.unit_price)}));
  const {data,error}=await sb.rpc("ea_record_cart_sale",{p_terminal_code:state.terminal,p_items:items,p_note:`ขายจาก ${state.terminal}`});
  if(error){console.error(error);toast(error.message.includes("Insufficient stock")?"Stock เปลี่ยนระหว่างขาย กรุณาตรวจตะกร้าอีกครั้ง":"บันทึกการขายไม่สำเร็จ");await loadAll();go("sale");return}
  state.cart=[];saveCartLocal();toast(`ขายสำเร็จ ฿${money(data?.total_amount)} • ${state.terminal}`);await loadAll();go("sale");
}

async function startScanner(){
  if(!window.ZXingBrowser){toast("โหลด Barcode Scanner ไม่สำเร็จ");return}
  const dialog=el("scannerDialog"),video=el("scannerVideo"),status=el("scannerStatus");dialog.showModal();status.textContent="กำลังขอสิทธิ์กล้อง...";
  try{
    scannerReader=new ZXingBrowser.BrowserMultiFormatReader();
    scannerControls=await scannerReader.decodeFromConstraints({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false},video,(result)=>{
      if(!result)return;const code=result.getText(),now=Date.now();if(code===lastScannedCode&&now-lastScannedAt<1200)return;lastScannedCode=code;lastScannedAt=now;status.textContent=`พบ: ${code}`;const p=productByBarcode(code);if(p){addProductToCart(p);navigator.vibrate?.(80)}else{toast(`ไม่พบบาร์โค้ด ${code}`);navigator.vibrate?.([50,60,50])}
    });
    status.textContent="พร้อมสแกน • ใช้กล้องหลัง";
  }catch(e){console.error(e);status.textContent="เปิดกล้องไม่สำเร็จ";toast("กรุณาอนุญาตใช้กล้อง และเปิดเว็บผ่าน HTTPS")}
}
function stopScanner(){try{scannerControls?.stop()}catch{}scannerControls=null;scannerReader=null;const d=el("scannerDialog");if(d?.open)d.close()}
function beepSuccess(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.07);setTimeout(()=>c.close(),150)}catch{}}

function getTerminalStats(){const a={};for(const s of todaySales()){const c=s.terminal_code||"POS-01";if(!a[c])a[c]={bills:0,total:0};a[c].bills++;a[c].total+=Number(s.total_amount||0)}return a}
function renderDashboardToday(){const total=todayTotal(),pct=Math.min(100,Math.round(total/Math.max(1,state.settings.target)*100)),stats=getTerminalStats();setHeader("Dashboard วันนี้","สรุปยอดขายและ Stock ประจำวัน");el("content").innerHTML=`${connectionNotice()}<div class="kpi-grid"><div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(total)}</div><div class="hint">${todaySales().length} บิล</div></div><div class="kpi success"><div class="label">เป้าหมายวันนี้</div><div class="value">${pct}%</div></div><div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div></div><div class="kpi info"><div class="label">จุดขายที่มีรายการ</div><div class="value">${Object.keys(stats).length}</div></div></div>${card("ยอดขายแยกตามจุดขาย",`<div class="terminal-report">${Object.entries(stats).map(([c,v])=>`<div class="terminal-stat"><span>${escapeHtml(c)}</span><strong>฿${money(v.total)}</strong><small>${v.bills} บิล</small></div>`).join("")||`<div class="empty">ยังไม่มีรายการวันนี้</div>`}</div>`)}<div style="height:18px"></div>${card("สินค้าใกล้หมด",`<div class="table-wrap"><table><thead><tr><th>สินค้า</th><th>Barcode</th><th>คงเหลือ</th><th>สถานะ</th></tr></thead><tbody>${lowProducts().map(p=>`<tr><td>${escapeHtml(p.product_name)}</td><td>${escapeHtml(p.barcode||"-")}</td><td>${p.stock_qty}</td><td>${statusForProduct(p)}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">Stock ปกติ</td></tr>`}</tbody></table></div>`)}`}


function renderDashboardAll(){
  setHeader("Dashboard รวมทั้งงาน","สรุปยอดขายสะสมตั้งแต่เริ่มงาน");

  const total = state.sales.reduce((s,x)=>s+Number(x.total_amount||0),0);
  const bills = state.sales.length;
  const avg = bills ? total / bills : 0;

  const byTerminal = {};
  for(const sale of state.sales){
    const code = sale.terminal_code || "POS-01";
    if(!byTerminal[code]) byTerminal[code] = {bills:0,total:0};
    byTerminal[code].bills += 1;
    byTerminal[code].total += Number(sale.total_amount||0);
  }

  const byDate = {};
  for(const sale of state.sales){
    const d = sale.sale_date || "-";
    if(!byDate[d]) byDate[d] = {bills:0,total:0};
    byDate[d].bills += 1;
    byDate[d].total += Number(sale.total_amount||0);
  }

  const dateRows = Object.entries(byDate)
    .sort((a,b)=>String(b[0]).localeCompare(String(a[0])))
    .slice(0,30);

  const productTotals = {};
  for(const item of state.saleItems){
    const key = item.product_name || "ไม่ระบุ";
    if(!productTotals[key]) productTotals[key] = {qty:0,total:0};
    productTotals[key].qty += Number(item.qty||0);
    productTotals[key].total += Number(item.line_total||0);
  }

  const topProducts = Object.entries(productTotals)
    .sort((a,b)=>b[1].qty-a[1].qty)
    .slice(0,5);

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="kpi-grid">
      <div class="kpi primary">
        <div class="label">ยอดขายรวมทั้งงาน</div>
        <div class="value">฿${money(total)}</div>
        <div class="hint">${bills} บิล</div>
      </div>

      <div class="kpi success">
        <div class="label">ยอดเฉลี่ย / บิล</div>
        <div class="value">฿${money(avg)}</div>
        <div class="hint">เฉลี่ยทุกจุดขาย</div>
      </div>

      <div class="kpi info">
        <div class="label">จำนวนวันที่มีการขาย</div>
        <div class="value">${Object.keys(byDate).length}</div>
        <div class="hint">ตั้งแต่เริ่มบันทึก</div>
      </div>

      <div class="kpi warning">
        <div class="label">สินค้าใกล้หมด</div>
        <div class="value">${lowProducts().length}</div>
        <div class="hint">Stock ปัจจุบัน</div>
      </div>
    </div>

    <div class="panel-grid">
      ${card("ยอดขายแยกตามจุดขาย",`
        <div class="terminal-report">
          ${Object.entries(byTerminal).map(([code,v])=>`
            <div class="terminal-stat">
              <span>${escapeHtml(code)}</span>
              <strong>฿${money(v.total)}</strong>
              <small>${v.bills} บิล</small>
            </div>
          `).join("") || `<div class="empty">ยังไม่มีข้อมูล</div>`}
        </div>
      `)}

      ${card("สินค้าขายดี",`
        <div class="list">
          ${topProducts.map(([name,v],i)=>`
            <div class="list-item">
              <div>
                <strong>${i+1}. ${escapeHtml(name)}</strong>
                <small>ยอดขาย ฿${money(v.total)}</small>
              </div>
              <span>${v.qty} ชิ้น</span>
            </div>
          `).join("") || `<div class="empty">ยังไม่มีข้อมูล</div>`}
        </div>
      `)}
    </div>

    <div style="height:18px"></div>

    ${card("ยอดขายรายวัน",`
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>วันที่</th><th>จำนวนบิล</th><th>ยอดขาย</th></tr>
          </thead>
          <tbody>
            ${dateRows.map(([date,v])=>`
              <tr>
                <td>${escapeHtml(date)}</td>
                <td>${v.bills}</td>
                <td>฿${money(v.total)}</td>
              </tr>
            `).join("") || `<tr><td colspan="3" class="empty">ยังไม่มีข้อมูล</td></tr>`}
          </tbody>
        </table>
      </div>
    `)}
  `;
}

function renderStock(){setHeader("สต็อกสินค้า","จัดการ Barcode ราคา และ Stock");const q=el("searchInput").value.trim().toLowerCase(),rows=state.products.filter(p=>!q||p.product_name.toLowerCase().includes(q)||p.product_code.toLowerCase().includes(q)||String(p.barcode||"").includes(q));el("content").innerHTML=`${connectionNotice()}${card("รายการสินค้า",`<div class="table-wrap"><table><thead><tr><th>รหัส</th><th>Barcode</th><th>สินค้า</th><th>ราคา</th><th>คงเหลือ</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td>${escapeHtml(p.product_code)}</td><td class="barcode-value">${escapeHtml(p.barcode||"-")}</td><td>${escapeHtml(p.product_name)}</td><td>฿${money(p.sale_price)}</td><td>${p.stock_qty}</td><td>${statusForProduct(p)}</td><td><button class="mini-btn" onclick="editProduct('${p.id}')">แก้ไข</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">ไม่พบสินค้า</td></tr>`}</tbody></table></div>`,`<button class="btn btn-primary" onclick="openProductModal()">+ เพิ่มสินค้า</button>`)}`}
function openProductModal(id=null){const p=id?productById(id):null;el("modalTitle").textContent=p?"แก้ไขสินค้า":"เพิ่มสินค้า";el("modalBody").innerHTML=`<div class="form-grid"><div class="field"><label>รหัสสินค้า</label><input id="pCode" value="${escapeHtml(p?.product_code||"")}"></div><div class="field"><label>Barcode</label><input id="pBarcode" inputmode="numeric" value="${escapeHtml(p?.barcode||"")}" placeholder="เช่น 8851234567890"></div><div class="field"><label>ชื่อสินค้า</label><input id="pName" value="${escapeHtml(p?.product_name||"")}"></div><div class="field"><label>ราคาขาย</label><input id="pPrice" type="number" min="0" value="${p?.sale_price??0}"></div><div class="field"><label>จำนวนคงเหลือ</label><input id="pQty" type="number" min="0" value="${p?.stock_qty??0}" ${p?"disabled":""}></div><div class="field"><label>แจ้งเตือนเมื่อเหลือ</label><input id="pMin" type="number" min="0" value="${p?.min_stock??state.settings.lowStockDefault}"></div></div><div class="actions"><button type="button" class="btn btn-primary" onclick="saveProduct(${id?`'${id}'`:"null"})">${p?"บันทึก":"เพิ่มสินค้า"}</button></div>`;el("modal").showModal()}
function editProduct(id){openProductModal(id)}
async function saveProduct(id){if(!sb){toast("ยังไม่ได้ตั้งค่า Supabase");return}const payload={product_code:el("pCode").value.trim(),barcode:el("pBarcode").value.trim()||null,product_name:el("pName").value.trim(),sale_price:Number(el("pPrice").value),min_stock:Number(el("pMin").value),is_active:true};if(!payload.product_code||!payload.product_name){toast("กรุณากรอกรหัสและชื่อสินค้า");return}let r;if(id)r=await sb.from("ea_products").update(payload).eq("id",id);else{payload.stock_qty=Number(el("pQty").value||0);r=await sb.from("ea_products").insert(payload)}if(r.error){console.error(r.error);toast(r.error.code==="23505"?"Barcode หรือรหัสสินค้านี้มีอยู่แล้ว":"บันทึกไม่สำเร็จ");return}el("modal").close();toast("บันทึกสินค้าแล้ว");await loadAll();go("stock")}

function renderMovement(){setHeader("รับเข้า / เบิกสินค้า","Stock กลางใช้ร่วมกันทุกเครื่อง");el("content").innerHTML=`${connectionNotice()}${card("บันทึก Stock",`<div class="form-grid"><div class="field"><label>ประเภท</label><select id="moveType"><option value="IN">รับเข้า</option><option value="OUT">เบิกออก</option><option value="ADJUST">ปรับยอด</option></select></div><div class="field"><label>สินค้า</label><select id="moveProduct">${state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.product_name)} — ${p.stock_qty}</option>`).join("")}</select></div><div class="field"><label>จำนวน</label><input id="moveQty" type="number" min="0" value="1"></div><div class="field"><label>หมายเหตุ</label><input id="moveNote" placeholder="เช่น รับจากคลัง"></div></div><div class="actions"><button class="btn btn-primary" onclick="saveMovement()">บันทึก</button></div>`)}`}
async function saveMovement(){if(!sb){toast("ยังไม่ได้ตั้งค่า Supabase");return}const {error}=await sb.rpc("ea_update_stock",{p_product_id:el("moveProduct").value,p_type:el("moveType").value,p_qty:Number(el("moveQty").value),p_note:el("moveNote").value.trim()||null});if(error){console.error(error);toast(error.message.includes("Insufficient stock")?"Stock ไม่พอ":"บันทึกไม่สำเร็จ");return}toast("บันทึก Stock แล้ว");await loadAll();go("movement")}

function renderReport(){setHeader("รายงาน","ยอดขายรวมและแยกตาม POS");const stats=getTerminalStats();el("content").innerHTML=`${connectionNotice()}<div class="kpi-grid"><div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(todayTotal())}</div></div><div class="kpi"><div class="label">จำนวนบิล</div><div class="value">${todaySales().length}</div></div><div class="kpi success"><div class="label">POS ที่ขายวันนี้</div><div class="value">${Object.keys(stats).length}</div></div><div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div></div></div>${card("ยอดขายตามจุดขาย",`<div class="terminal-report">${Object.entries(stats).map(([c,v])=>`<div class="terminal-stat"><span>${escapeHtml(c)}</span><strong>฿${money(v.total)}</strong><small>${v.bills} บิล</small></div>`).join("")||`<div class="empty">ยังไม่มีรายการ</div>`}</div>`,`<button class="btn btn-light" onclick="exportSalesCSV()">Export CSV</button>`)}`}
function downloadCSV(name,rows){const csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const b=new Blob([csv],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function exportSalesCSV(){downloadCSV(`EA_FairSale_Sales_${todayISO()}.csv`,[["วันที่","เวลา","POS","เลขที่ขาย","ยอดขาย"],...todaySales().map(s=>[s.sale_date,String(s.sale_time||"").slice(0,5),s.terminal_code||"POS-01",s.sale_no,s.total_amount])])}

function renderSettings(){setHeader("ตั้งค่า","เลือกจุดขายของแท็บเล็ตเครื่องนี้");el("content").innerHTML=`${connectionNotice()}<div class="panel-grid">${card("จุดขายของเครื่องนี้",`<p style="margin-top:0;color:var(--muted);font-size:12px">ตั้งคนละ POS ในแต่ละแท็บเล็ต เช่น เครื่องแรก POS-01 เครื่องสอง POS-02</p><div class="terminal-options">${["POS-01","POS-02","POS-03","POS-04"].map(c=>`<button class="terminal-btn ${state.terminal===c?"active":""}" onclick="setTerminal('${c}')">${c}</button>`).join("")}</div>`)}${card("ตั้งค่าระบบ",`<div class="form-grid"><div class="field"><label>ชื่อระบบ</label><input id="shopName" value="${escapeHtml(state.settings.shopName)}"></div><div class="field"><label>เป้าหมายยอดขาย/วัน</label><input id="targetInput" type="number" value="${state.settings.target}"></div><div class="field"><label>แจ้งเตือน Stock เริ่มต้น</label><input id="lowDefault" type="number" value="${state.settings.lowStockDefault}"></div></div><div class="actions"><button class="btn btn-primary" onclick="saveSettings()">บันทึก</button></div>`)}</div>`}
function setTerminal(code){state.terminal=code;localStorage.setItem(TERMINAL_KEY,code);toast(`เครื่องนี้เป็น ${code}`);renderSettings()}
async function upsertSetting(k,v){return sb.from("ea_settings").upsert({setting_key:k,setting_value:String(v)},{onConflict:"setting_key"})}
async function saveSettings(){if(!sb){toast("ยังไม่ได้ตั้งค่า Supabase");return}const shopName=el("shopName").value.trim()||"EA Fair Sale",target=Number(el("targetInput").value||0),low=Number(el("lowDefault").value||0),rs=await Promise.all([upsertSetting("shop_name",shopName),upsertSetting("daily_target",target),upsertSetting("low_stock_default",low)]);if(rs.find(x=>x.error)){toast("บันทึกไม่สำเร็จ");return}state.settings={shopName,target,lowStockDefault:low};toast("บันทึกแล้ว");renderSettings()}


function updateBottomNav(){
  document.querySelectorAll(".bottom-nav-item").forEach(btn=>{
    const target=btn.dataset.nav;
    let active=false;

    if(state.page==="home") active=target==="home";
    else if(state.page==="menu" || state.page==="dashboardToday" || state.page==="dashboardAll" || state.page==="report" || state.page==="settings") active=target==="menu";
    else if(state.page==="sale") active=target==="sale";
    else if(state.page==="stock" || state.page==="movement" || state.page==="lowStock") active=target==="stock";

    btn.classList.toggle("active",active);
  });
}

function toggleSearch(){
  const panel = el("searchPanel");
  if(!panel) return;
  panel.classList.toggle("hidden");
  if(!panel.classList.contains("hidden")){
    setTimeout(()=>el("searchInput")?.focus(),50);
  }
}

async function refreshData(){
  if(!configured){
    toast("ยังไม่ได้เชื่อม Supabase");
    return;
  }
  toast("กำลังรีเฟรช...");
  await loadAll();
  toast("อัปเดตข้อมูลแล้ว");
}

function go(page){if(state.page==="sale"&&page!=="sale")stopScanner();state.page=page;render();window.scrollTo({top:0,behavior:"smooth"})}
el("searchInput").addEventListener("input",()=>{if(state.page==="stock")renderStock()});
el("scannerDialog").addEventListener("close",()=>{try{scannerControls?.stop()}catch{}scannerControls=null});
Object.assign(window,{go,startScanner,stopScanner,addBarcodeFromInput,addSelectedProduct,changeCartQty,removeCartItem,clearCart,checkoutCart,openProductModal,editProduct,saveProduct,saveMovement,exportSalesCSV,setTerminal,saveSettings});
function render(){
  const backBtn=el("homeBackBtn");
  if(backBtn) backBtn.classList.toggle("hidden",state.page==="home");

  updateBottomNav();
  if(state.loading)return;

  if(state.page==="home")renderHome();
  else if(state.page==="menu")renderMenu();
  else if(state.page==="sale")renderSale();
  else if(state.page==="dashboardToday")renderDashboardToday();
  else if(state.page==="dashboardAll")renderDashboardAll();
  else if(state.page==="stock")renderStock();
  else if(state.page==="lowStock")renderLowStock();
  else if(state.page==="movement")renderMovement();
  else if(state.page==="report")renderReport();
  else renderSettings();
}
loadAll();
