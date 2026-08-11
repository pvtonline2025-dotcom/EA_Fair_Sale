
const STORAGE_KEY = "ea_fairsale_v3";

const seed = {
  page: "home",
  settings: {
    target: 5000,
    shopName: "EA Fair Sale",
    lowStockDefault: 5
  },
  products: [
    {id:1,code:"P001",name:"ตาข่าย 80% เขียว 2 x 10 m.",price:1200,qty:8,min:5},
    {id:2,code:"P002",name:"ผ้าปูพื้น 120 ซม.",price:450,qty:11,min:5},
    {id:3,code:"P003",name:"สายยาง PVC สีฟ้า",price:850,qty:4,min:5},
    {id:4,code:"P004",name:"ท่อดำ LD 20 mm.",price:290,qty:2,min:5},
    {id:5,code:"P005",name:"ตาข่าย 70% เขียว 2 x 10 m.",price:980,qty:0,min:5}
  ],
  sales: [
    {id:101,date:todayISO(),time:"09:18",productId:1,product:"ตาข่าย 80% เขียว 2 x 10 m.",qty:2,price:1200,total:2400},
    {id:102,date:todayISO(),time:"11:42",productId:2,product:"ผ้าปูพื้น 120 ซม.",qty:3,price:450,total:1350},
    {id:103,date:todayISO(),time:"13:10",productId:3,product:"สายยาง PVC สีฟ้า",qty:1,price:850,total:850}
  ],
  movements: []
};

function todayISO(){
  return new Date().toISOString().slice(0,10);
}
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      parsed.page = "home";
      return parsed;
    }
  }catch(e){}
  return deepClone(seed);
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const el = id => document.getElementById(id);
const money = n => Number(n || 0).toLocaleString("th-TH",{minimumFractionDigits:2});
const todaySales = () => state.sales.filter(x=>x.date===todayISO());
const todayTotal = () => todaySales().reduce((sum,x)=>sum+x.total,0);
const lowProducts = () => state.products.filter(x=>x.qty<=x.min);
const productById = id => state.products.find(x=>x.id===Number(id));


el("searchInput").addEventListener("input",render);

function toast(text){
  const t=el("toast");
  t.textContent=text;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1800);
}
function card(title,body,action=""){
  return `<section class="card">
    <div class="card-head"><h2>${title}</h2>${action}</div>
    <div class="card-body">${body}</div>
  </section>`;
}
function setHeader(title,sub){
  el("pageTitle").textContent=title;
  el("pageSubtitle").textContent=sub;
}
function statusForProduct(p){
  if(p.qty<=0) return `<span class="status out">หมด</span>`;
  if(p.qty<=p.min) return `<span class="status low">ใกล้หมด</span>`;
  return `<span class="status ok">ปกติ</span>`;
}

function renderHome(){
  setHeader("เมนูหลัก","เลือกเมนูที่ต้องการใช้งาน");
  const sales = todayTotal();
  const pct = Math.min(100, Math.round(sales / Math.max(1,state.settings.target) * 100));

  el("content").innerHTML = `
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
        <span>ขายวันนี้ ${todaySales().length} รายการ</span>
      </div>
    </section>`;
}

function renderDashboard(){
  setHeader("หน้าหลัก","สรุปยอดขายและสต็อกวันนี้");
  const sales=todayTotal();
  const pct=Math.min(100,Math.round(sales/state.settings.target*100));
  const q=el("searchInput").value.trim().toLowerCase();
  const recent=todaySales().filter(x=>!q||x.product.toLowerCase().includes(q)).slice(0,6);
  const low=lowProducts().slice(0,6);

  el("content").innerHTML=`
    <div class="kpi-grid">
      <div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(sales)}</div><div class="hint">${todaySales().length} รายการขาย</div></div>
      <div class="kpi success"><div class="label">เป้าหมายวันนี้</div><div class="value">${pct}%</div><div class="hint">เป้าหมาย ฿${money(state.settings.target)}</div></div>
      <div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div><div class="hint">ควรตรวจสอบสต็อก</div></div>
      <div class="kpi info"><div class="label">จำนวนสินค้า</div><div class="value">${state.products.length}</div><div class="hint">สินค้าในระบบ</div></div>
    </div>

    <div class="panel-grid">
      ${card("ยอดขายล่าสุด",`
        <div class="table-wrap">
          <table>
            <thead><tr><th>เวลา</th><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th></tr></thead>
            <tbody>${recent.length ? recent.map(x=>`<tr><td>${x.time}</td><td>${x.product}</td><td>${x.qty}</td><td>฿${money(x.total)}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">ยังไม่มีรายการขายวันนี้</td></tr>`}</tbody>
          </table>
        </div>
      `,`<button class="btn btn-light" onclick="go('sale')">ขายสินค้า</button>`)}

      <div style="display:grid;gap:18px">
        ${card("เป้าหมายยอดขาย",`
          <div class="summary-row"><strong>฿${money(sales)}</strong><span class="badge">${pct}%</span></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <div style="margin-top:10px;color:var(--muted);font-size:12px">เหลืออีก ฿${money(Math.max(0,state.settings.target-sales))}</div>
        `)}
        ${card("สินค้าใกล้หมด",`
          <div class="list">
            ${low.length ? low.map(x=>`<div class="list-item"><div><strong>${x.name}</strong><small>${x.code} • ขั้นต่ำ ${x.min}</small></div>${statusForProduct(x)}</div>`).join("") : `<div class="empty">สต็อกอยู่ในระดับปกติ</div>`}
          </div>
        `,`<button class="btn btn-light" onclick="go('stock')">ดูสต็อก</button>`)}
      </div>
    </div>`;
}

function renderSale(){
  setHeader("ขายสินค้า","บันทึกรายการขายและตัดสต็อกอัตโนมัติ");
  const options = state.products.map(x=>`<option value="${x.id}" ${x.qty<=0?"disabled":""}>${x.name} — เหลือ ${x.qty}</option>`).join("");
  el("content").innerHTML=`
    <div class="panel-grid">
      ${card("เพิ่มรายการขาย",`
        <div class="form-grid">
          <div class="field"><label>สินค้า</label><select id="saleProduct" onchange="fillPrice()">${options}</select></div>
          <div class="field"><label>จำนวน</label><input id="saleQty" type="number" min="1" value="1"></div>
          <div class="field"><label>ราคาต่อหน่วย</label><input id="salePrice" type="number" min="0"></div>
          <div class="field"><label>เวลา</label><input id="saleTime" type="time"></div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveSale()">บันทึกการขาย</button></div>
      `)}
      ${card("ทางลัด",`
        <div class="quick-grid">
          <button class="quick" onclick="go('movement')"><div class="icon">📥</div><strong>รับสินค้าเข้า</strong></button>
          <button class="quick" onclick="go('report')"><div class="icon">📊</div><strong>ดูรายงาน</strong></button>
        </div>
      `)}
    </div>
    <div style="height:18px"></div>
    ${card("รายการขายวันนี้",`
      <div class="table-wrap">
        <table><thead><tr><th>เวลา</th><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ยอดขาย</th></tr></thead>
        <tbody>${todaySales().length ? todaySales().map(x=>`<tr><td>${x.time}</td><td>${x.product}</td><td>${x.qty}</td><td>฿${money(x.price)}</td><td>฿${money(x.total)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">ยังไม่มีรายการขาย</td></tr>`}</tbody></table>
      </div>
    `)}`;
  const now=new Date();
  el("saleTime").value=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  fillPrice();
}
function fillPrice(){
  const p = productById(el("saleProduct")?.value);
  if(p && el("salePrice")) el("salePrice").value = p.price;
}
function saveSale(){
  const product=productById(el("saleProduct").value);
  const qty=Number(el("saleQty").value);
  const price=Number(el("salePrice").value);
  const time=el("saleTime").value;
  if(!product){toast("กรุณาเลือกสินค้า");return}
  if(qty<=0){toast("จำนวนต้องมากกว่า 0");return}
  if(qty>product.qty){toast(`สต็อกไม่พอ เหลือ ${product.qty}`);return}
  if(price<0){toast("ราคาต้องไม่ติดลบ");return}

  product.qty -= qty;
  state.sales.unshift({
    id:Date.now(),
    date:todayISO(),
    time,
    productId:product.id,
    product:product.name,
    qty,price,total:qty*price
  });
  state.movements.unshift({
    id:Date.now()+1,
    date:todayISO(),
    time,
    type:"sale",
    productId:product.id,
    product:product.name,
    qty:-qty,
    note:"ขายสินค้า"
  });
  saveState();
  toast("บันทึกการขายแล้ว");
  renderSale();
}

function renderStock(){
  setHeader("สต็อกสินค้า","จัดการสินค้า ราคา และจำนวนคงเหลือ");
  const q=el("searchInput").value.trim().toLowerCase();
  const rows=state.products.filter(x=>!q||x.name.toLowerCase().includes(q)||x.code.toLowerCase().includes(q));
  el("content").innerHTML=`
    ${card("รายการสินค้า",`
      <div class="table-wrap">
        <table><thead><tr><th>รหัส</th><th>สินค้า</th><th>ราคา</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map(x=>`<tr>
          <td>${x.code}</td><td>${x.name}</td><td>฿${money(x.price)}</td><td>${x.qty}</td><td>${x.min}</td><td>${statusForProduct(x)}</td>
          <td><div class="mini-actions"><button class="mini-btn" onclick="editProduct(${x.id})">แก้ไข</button><button class="mini-btn" onclick="quickReceive(${x.id})">รับเข้า</button></div></td>
        </tr>`).join("") : `<tr><td colspan="7" class="empty">ไม่พบสินค้า</td></tr>`}</tbody></table>
      </div>
    `,`<button class="btn btn-primary" onclick="openProductModal()">+ เพิ่มสินค้า</button>`)}
  `;
}

function openProductModal(productId=null){
  const p = productId ? productById(productId) : null;
  el("modalTitle").textContent = p ? "แก้ไขสินค้า" : "เพิ่มสินค้า";
  el("modalBody").innerHTML = `
    <div class="form-grid">
      <div class="field"><label>รหัสสินค้า</label><input id="pCode" value="${p?.code||""}"></div>
      <div class="field"><label>ชื่อสินค้า</label><input id="pName" value="${p?.name||""}"></div>
      <div class="field"><label>ราคาขาย</label><input id="pPrice" type="number" min="0" value="${p?.price??0}"></div>
      <div class="field"><label>จำนวนคงเหลือ</label><input id="pQty" type="number" min="0" value="${p?.qty??0}"></div>
      <div class="field"><label>แจ้งเตือนเมื่อเหลือ</label><input id="pMin" type="number" min="0" value="${p?.min??state.settings.lowStockDefault}"></div>
    </div>
    <div class="actions"><button type="button" class="btn btn-primary" onclick="saveProduct(${productId||"null"})">${p?"บันทึกการแก้ไข":"เพิ่มสินค้า"}</button></div>
  `;
  el("modal").showModal();
}
function editProduct(id){ openProductModal(id); }
function saveProduct(id){
  const code=el("pCode").value.trim();
  const name=el("pName").value.trim();
  const price=Number(el("pPrice").value);
  const qty=Number(el("pQty").value);
  const min=Number(el("pMin").value);
  if(!code||!name){toast("กรุณากรอกรหัสและชื่อสินค้า");return}
  if(id){
    const p=productById(id);
    Object.assign(p,{code,name,price,qty,min});
  }else{
    state.products.push({id:Date.now(),code,name,price,qty,min});
  }
  saveState();
  el("modal").close();
  toast(id?"แก้ไขสินค้าแล้ว":"เพิ่มสินค้าแล้ว");
  renderStock();
}
function quickReceive(id){
  go("movement");
  setTimeout(()=>{
    const sel=el("moveProduct");
    if(sel){sel.value=id; el("moveType").value="in";}
  },0);
}

function renderMovement(){
  setHeader("รับเข้า / เบิกสินค้า","บันทึกการเคลื่อนไหวของสต็อก");
  el("content").innerHTML=`
    <div class="panel-grid">
      ${card("บันทึกสต็อก",`
        <div class="form-grid">
          <div class="field"><label>ประเภท</label><select id="moveType"><option value="in">รับเข้า</option><option value="out">เบิกออก</option><option value="adjust">ปรับยอด</option></select></div>
          <div class="field"><label>สินค้า</label><select id="moveProduct">${state.products.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></div>
          <div class="field"><label>จำนวน</label><input id="moveQty" type="number" min="0" value="1"></div>
          <div class="field"><label>หมายเหตุ</label><input id="moveNote" placeholder="เช่น รับจากคลัง / เบิกไปบูท"></div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveMovement()">บันทึก</button></div>
      `)}
      ${card("คำอธิบาย",`
        <div class="list">
          <div class="list-item"><div><strong>รับเข้า</strong><small>เพิ่มจำนวนสินค้าเข้าสต็อก</small></div><span class="status in">+</span></div>
          <div class="list-item"><div><strong>เบิกออก</strong><small>ลดจำนวนสินค้าออกจากสต็อก</small></div><span class="status low">−</span></div>
          <div class="list-item"><div><strong>ปรับยอด</strong><small>กำหนดจำนวนคงเหลือใหม่</small></div><span class="status adjust">=</span></div>
        </div>
      `)}
    </div>
    <div style="height:18px"></div>
    ${card("ประวัติการเคลื่อนไหว",`
      <div class="table-wrap"><table><thead><tr><th>วันที่</th><th>เวลา</th><th>ประเภท</th><th>สินค้า</th><th>จำนวน</th><th>หมายเหตุ</th></tr></thead>
      <tbody>${state.movements.length ? state.movements.slice(0,30).map(m=>`<tr>
        <td>${m.date}</td><td>${m.time}</td><td>${movementBadge(m.type)}</td><td>${m.product}</td><td>${m.qty>0?"+":""}${m.qty}</td><td>${m.note||""}</td>
      </tr>`).join("") : `<tr><td colspan="6" class="empty">ยังไม่มีประวัติ</td></tr>`}</tbody></table></div>
    `)}
  `;
}
function movementBadge(type){
  if(type==="in") return `<span class="status in">รับเข้า</span>`;
  if(type==="out") return `<span class="status low">เบิกออก</span>`;
  if(type==="sale") return `<span class="status sale">ขาย</span>`;
  return `<span class="status adjust">ปรับยอด</span>`;
}
function saveMovement(){
  const type=el("moveType").value;
  const product=productById(el("moveProduct").value);
  const qty=Number(el("moveQty").value);
  const note=el("moveNote").value.trim();
  if(!product){toast("กรุณาเลือกสินค้า");return}
  if(qty<0){toast("จำนวนต้องไม่ติดลบ");return}

  let delta=0;
  if(type==="in"){ delta=qty; product.qty += qty; }
  else if(type==="out"){
    if(qty>product.qty){toast(`สต็อกไม่พอ เหลือ ${product.qty}`);return}
    delta=-qty; product.qty -= qty;
  }else{
    delta=qty-product.qty;
    product.qty=qty;
  }
  const now=new Date();
  state.movements.unshift({
    id:Date.now(),date:todayISO(),
    time:`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
    type,productId:product.id,product:product.name,qty:delta,note
  });
  saveState();
  toast("บันทึกสต็อกแล้ว");
  renderMovement();
}

function renderReport(){
  setHeader("รายงาน","ดูภาพรวมยอดขายและส่งออกข้อมูล");
  const total=todayTotal();
  const sales=todaySales();
  const avg=sales.length?total/sales.length:0;
  const units=sales.reduce((s,x)=>s+x.qty,0);
  el("content").innerHTML=`
    <div class="kpi-grid">
      <div class="kpi primary"><div class="label">ยอดขายวันนี้</div><div class="value">฿${money(total)}</div></div>
      <div class="kpi"><div class="label">จำนวนบิล</div><div class="value">${sales.length}</div></div>
      <div class="kpi success"><div class="label">จำนวนชิ้นที่ขาย</div><div class="value">${units}</div></div>
      <div class="kpi warning"><div class="label">สินค้าใกล้หมด</div><div class="value">${lowProducts().length}</div></div>
    </div>
    ${card("รายการขายวันนี้",`
      <div class="table-wrap"><table><thead><tr><th>เวลา</th><th>สินค้า</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ยอดขาย</th></tr></thead>
      <tbody>${sales.length ? sales.map(x=>`<tr><td>${x.time}</td><td>${x.product}</td><td>${x.qty}</td><td>฿${money(x.price)}</td><td>฿${money(x.total)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">ยังไม่มีข้อมูล</td></tr>`}</tbody></table></div>
    `,`<div class="mini-actions"><button class="btn btn-light" onclick="exportSalesCSV()">Export Sales CSV</button><button class="btn btn-light" onclick="exportStockCSV()">Export Stock CSV</button></div>`)}
  `;
}
function downloadCSV(filename, rows){
  const csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}
function exportSalesCSV(){
  downloadCSV(`EA_FairSale_Sales_${todayISO()}.csv`,[
    ["วันที่","เวลา","สินค้า","จำนวน","ราคาต่อหน่วย","ยอดขาย"],
    ...todaySales().map(x=>[x.date,x.time,x.product,x.qty,x.price,x.total])
  ]);
  toast("สร้างไฟล์ยอดขายแล้ว");
}
function exportStockCSV(){
  downloadCSV(`EA_FairSale_Stock_${todayISO()}.csv`,[
    ["รหัสสินค้า","สินค้า","ราคา","คงเหลือ","ขั้นต่ำ","สถานะ"],
    ...state.products.map(x=>[x.code,x.name,x.price,x.qty,x.min,x.qty<=0?"หมด":x.qty<=x.min?"ใกล้หมด":"ปกติ"])
  ]);
  toast("สร้างไฟล์สต็อกแล้ว");
}

function renderSettings(){
  setHeader("ตั้งค่า","กำหนดค่าพื้นฐานและสำรองข้อมูล");
  el("content").innerHTML=`
    <div class="panel-grid">
      ${card("ตั้งค่าทั่วไป",`
        <div class="form-grid">
          <div class="field"><label>ชื่อระบบ</label><input id="shopName" value="${state.settings.shopName}"></div>
          <div class="field"><label>เป้าหมายยอดขายต่อวัน</label><input id="targetInput" type="number" min="0" value="${state.settings.target}"></div>
          <div class="field"><label>ค่าแจ้งเตือนสต็อกเริ่มต้น</label><input id="lowDefault" type="number" min="0" value="${state.settings.lowStockDefault}"></div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveSettings()">บันทึก</button></div>
      `)}
      ${card("ข้อมูลระบบ",`
        <div class="list">
          <div class="list-item"><div><strong>สินค้า</strong><small>จำนวนรายการสินค้า</small></div><span>${state.products.length}</span></div>
          <div class="list-item"><div><strong>รายการขายทั้งหมด</strong><small>เก็บใน Browser เครื่องนี้</small></div><span>${state.sales.length}</span></div>
          <div class="list-item"><div><strong>ประวัติสต็อก</strong><small>รับเข้า / เบิก / ขาย</small></div><span>${state.movements.length}</span></div>
        </div>
        <div class="actions"><button class="btn btn-light" onclick="backupJSON()">สำรองข้อมูล JSON</button><button class="btn btn-danger" onclick="resetDemo()">รีเซ็ต Demo</button></div>
      `)}
    </div>
  `;
}
function saveSettings(){
  state.settings.shopName=el("shopName").value.trim()||"EA Fair Sale";
  state.settings.target=Number(el("targetInput").value)||0;
  state.settings.lowStockDefault=Number(el("lowDefault").value)||0;
  saveState();
  toast("บันทึกการตั้งค่าแล้ว");
}
function backupJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`EA_FairSale_Backup_${todayISO()}.json`;a.click();
  URL.revokeObjectURL(url);
  toast("สำรองข้อมูลแล้ว");
}
function resetDemo(){
  if(!confirm("ต้องการรีเซ็ตข้อมูล Demo ทั้งหมดใช่ไหม?")) return;
  state=deepClone(seed);
  saveState();
  toast("รีเซ็ตข้อมูลแล้ว");
  renderSettings();
}

function go(page){
  state.page=page;
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

window.go=go;
window.fillPrice=fillPrice;
window.saveSale=saveSale;
window.openProductModal=openProductModal;
window.editProduct=editProduct;
window.saveProduct=saveProduct;
window.quickReceive=quickReceive;
window.saveMovement=saveMovement;
window.exportSalesCSV=exportSalesCSV;
window.exportStockCSV=exportStockCSV;
window.saveSettings=saveSettings;
window.backupJSON=backupJSON;
window.resetDemo=resetDemo;

function render(){
  const backBtn = el("homeBackBtn");
  if(backBtn) backBtn.classList.toggle("hidden", state.page==="home");

  if(state.page==="home")renderHome();
  else if(state.page==="dashboard")renderDashboard();
  else if(state.page==="sale")renderSale();
  else if(state.page==="stock")renderStock();
  else if(state.page==="movement")renderMovement();
  else if(state.page==="report")renderReport();
  else renderSettings();
}
render();
