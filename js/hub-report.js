/**
 * EA Fair Sale - ศูนย์กลาง: เบิกสินค้า (15:00–16:00) • รายงานปิดวัน • QR เปิดจุดคิดเงิน
 *
 * Uses globals from app.js: state, money, escapeHtml, el, toast, todayISO, sendBrowserPushNotification, beepSuccess
 * Uses hub.js: hubDeviceStats(), renderHub()
 */
(function () {
  const K = {
    open: 'ea_hub_open_time',
    close: 'ea_hub_close_time',
    tomorrow: 'ea_hub_forecast_tomorrow',
    stations: 'ea_hub_stations',
    notified: 'ea_hub_restock_notified',
    winStart: 'ea_hub_restock_start',
    winEnd: 'ea_hub_restock_end'
  };
  const adjust = {};          // product_id -> qty edited by the user on the requisition list
  let showQr = false;

  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function st() { return window.getEaAppState?.() || null; }
  function isQr(pm) { const v = String(pm || '').toLowerCase(); return v === 'promptpay' || v === 'qr' || v === 'transfer'; }
  function hm(str, def) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || def));
    return m ? Number(m[1]) + Number(m[2]) / 60 : hm(def, '00:00');
  }
  function nowH() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function fmtH(h) {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${String(hh + (mm === 60 ? 1 : 0)).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
  }
  function settings() {
    return {
      open: lsGet(K.open, '09:00'),
      close: lsGet(K.close, '21:00'),
      tomorrow: lsGet(K.tomorrow, 'true') === 'true',
      winStart: lsGet(K.winStart, '15:00'),
      winEnd: lsGet(K.winEnd, '16:00')
    };
  }

  // =========================================================
  // Sales of the day
  // =========================================================
  function todaySales() {
    const today = todayISO();
    return (st()?.sales || []).filter(s => s.sale_date === today && !s.is_cancelled);
  }

  function todayItems() {
    const ids = new Set(todaySales().map(x => x.id));
    return (st()?.saleItems || []).filter(it => ids.has(it.sale_id));
  }

  // Quantity sold per product (all prices together) — used by the restock forecast
  function soldByProduct() {
    const byId = new Map();
    for (const it of todayItems()) {
      const key = it.product_id || it.product_name;
      if (!byId.has(key)) byId.set(key, { product_id: it.product_id, name: it.product_name || 'สินค้า', qty: 0, amount: 0 });
      const r = byId.get(key);
      r.qty += Number(it.qty || 0);
      r.amount += Number(it.qty || 0) * Number(it.unit_price || 0);
    }
    return byId;
  }

  // Report lines: one line per (product + selling price + price label), whole day
  function soldLines() {
    const products = st()?.products || [];
    const map = new Map();
    for (const it of todayItems()) {
      const price = Math.round(Number(it.unit_price || 0) * 10000) / 10000;
      const note = String(it.price_note || '').trim();
      const key = `${it.product_id || it.product_name}|${price}|${note}`;
      if (!map.has(key)) {
        const p = products.find(x => x.id === it.product_id);
        map.set(key, {
          product_id: it.product_id,
          name: it.product_name || p?.product_name || 'สินค้า',
          unit: p?.unit || p?.unit_name || it.unit || 'ชิ้น',
          price, note, qty: 0, amount: 0, weights: []
        });
      }
      const r = map.get(key);
      const qty = Number(it.qty || 0);
      r.qty += qty;
      r.amount += qty * price;
      let w = it.weights;
      if (typeof w === 'string') { try { w = JSON.parse(w); } catch (e) { w = null; } }
      if (Array.isArray(w)) r.weights.push(...w.map(Number).filter(x => x > 0));
    }
    const rank = (r) => (r.price === 0 ? 2 : r.note ? 1 : 0);
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'th') || rank(a) - rank(b) || b.price - a.price);
  }

  function fmtPrice(n) {
    const v = Number(n || 0);
    if (Number.isInteger(v)) return v.toLocaleString('th-TH');
    return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  function fmtQty(n) { const v = Number(n || 0); return Number.isInteger(v) ? String(v) : v.toLocaleString('th-TH', { maximumFractionDigits: 3 }); }
  function shortDateBE() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String((d.getFullYear() + 543) % 100).padStart(2, '0')}`;
  }

  // =========================================================
  // Restock forecast
  // =========================================================
  function forecast() {
    const s = st();
    const cfg = settings();
    const open = hm(cfg.open, '09:00');
    let close = hm(cfg.close, '21:00');
    if (close <= open) close += 24;
    const now = Math.min(Math.max(nowH(), open), close);
    const elapsed = Math.max(0.5, now - open);
    const left = Math.max(0, close - now);
    const dayLen = close - open;
    const sold = soldByProduct();

    const rows = [];
    for (const p of (s?.products || [])) {
      if (p.is_active === false) continue;
      const soldQty = sold.get(p.id)?.qty || 0;
      const stock = Number(p.stock_qty || 0);
      const min = Number(p.min_stock || 0);
      const rate = soldQty / elapsed;                       // pieces per hour today
      const needToday = rate * left;
      const needTomorrow = cfg.tomorrow ? rate * dayLen : 0;
      const suggest = Math.max(0, Math.ceil(needToday + needTomorrow + min - stock));
      const hoursToOut = rate > 0 ? stock / rate : Infinity;
      const outAt = rate > 0 && hoursToOut < left ? fmtH(now + hoursToOut) : '';
      if (suggest > 0 || stock <= min) {
        rows.push({
          id: p.id, name: p.product_name, unit: p.unit || p.unit_name || 'ชิ้น',
          stock, min, soldQty, rate, needToday, suggest, outAt, hoursToOut
        });
      }
    }
    rows.sort((a, b) => a.hoursToOut - b.hoursToOut || b.suggest - a.suggest);
    return { rows, cfg, left, now };
  }

  function qtyFor(r) { return adjust[r.id] ?? r.suggest; }

  function restockWindowState() {
    const cfg = settings();
    const n = nowH();
    const a = hm(cfg.winStart, '15:00'), b = hm(cfg.winEnd, '16:00');
    if (n < a) return { key: 'before', text: `เบิกสินค้าได้ ${cfg.winStart}–${cfg.winEnd} น.` };
    if (n < b) return { key: 'now', text: `⏰ ถึงเวลาเบิกสินค้าแล้ว (ถึง ${cfg.winEnd} น.)` };
    return { key: 'after', text: `เลยเวลาเบิกสินค้า (${cfg.winStart}–${cfg.winEnd} น.)` };
  }

  function renderRestockPanel() {
    const f = forecast();
    const w = restockWindowState();
    const cfg = f.cfg;
    return `
      <div class="hub-panel hub-restock ${w.key === 'now' ? 'is-now' : ''}">
        <div class="hub-panel-head">
          <h2 class="hub-h">📦 แนะนำเบิกสินค้า <span class="hub-badge ${f.rows.length ? 'is-bad' : ''}">${f.rows.length}</span></h2>
          <span class="hub-window hub-window-${w.key}">${escapeHtml(w.text)}</span>
        </div>
        <div class="hub-restock-cfg">
          <label>เปิดร้าน <input type="time" value="${escapeHtml(cfg.open)}" onchange="hubSetCfg('open', this.value)"></label>
          <label>ปิดร้าน <input type="time" value="${escapeHtml(cfg.close)}" onchange="hubSetCfg('close', this.value)"></label>
          <label class="hub-check"><input type="checkbox" ${cfg.tomorrow ? 'checked' : ''} onchange="hubSetCfg('tomorrow', this.checked)"> เผื่อขายพรุ่งนี้ทั้งวัน</label>
        </div>
        ${f.rows.length ? `
          <div class="hub-table-wrap">
            <table class="hub-table">
              <thead><tr><th>สินค้า</th><th>ขายวันนี้</th><th>เหลือ</th><th>จะหมดราว</th><th>เบิก</th></tr></thead>
              <tbody>
                ${f.rows.map(r => `
                  <tr>
                    <td class="hub-td-name">${escapeHtml(r.name)}</td>
                    <td class="hub-num">${r.soldQty}</td>
                    <td class="hub-num ${r.stock <= 0 ? 'is-out' : r.stock <= r.min ? 'is-low' : ''}">${r.stock}</td>
                    <td class="hub-num">${r.stock <= 0 ? '<b class="is-out">หมดแล้ว</b>' : r.outAt ? `<b class="is-low">${r.outAt} น.</b>` : '-'}</td>
                    <td class="hub-num"><input class="hub-qty" type="number" inputmode="numeric" min="0" value="${qtyFor(r)}" onchange="hubSetRestockQty('${escapeHtml(r.id)}', this.value)"></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="hub-hint">คำนวณจากความเร็วการขายวันนี้ × ชั่วโมงที่เหลือถึงปิดร้าน${cfg.tomorrow ? ' + ขายพรุ่งนี้ทั้งวัน' : ''} + สต็อกขั้นต่ำ − คงเหลือ • แก้จำนวนได้</div>
          <div class="hub-actions">
            <button type="button" class="hub-btn-ghost" onclick="copyRestockText()">📋 คัดลอกใบเบิก (LINE)</button>
            <button type="button" class="hub-btn" onclick="printRestock()">🖨️ พิมพ์ใบเบิก</button>
          </div>
        ` : '<div class="hub-empty">ยังไม่มีสินค้าที่ต้องเบิก ✓</div>'}
      </div>`;
  }

  function hubSetCfg(key, value) {
    if (key === 'tomorrow') lsSet(K.tomorrow, value ? 'true' : 'false');
    else if (key === 'open') lsSet(K.open, value || '09:00');
    else if (key === 'close') lsSet(K.close, value || '21:00');
    window.renderHub?.();
  }
  function hubSetRestockQty(id, v) {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    adjust[id] = n;
  }

  function restockList() {
    return forecast().rows.map(r => ({ ...r, qty: qtyFor(r) })).filter(r => r.qty > 0);
  }

  function shopName() { return st()?.settings?.shopName || 'EA Fair Sale'; }
  function dateTh() { return new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
  function timeTh() { return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }

  function restockText() {
    const list = restockList();
    let t = `📦 ใบเบิกสินค้า ${shopName()}\n${dateTh()} ${timeTh()} น.\n\n`;
    if (!list.length) return t + 'ไม่มีรายการที่ต้องเบิก';
    list.forEach((r, i) => { t += `${i + 1}. ${r.name} — เบิก ${r.qty} ${r.unit} (เหลือ ${r.stock}, ขายวันนี้ ${r.soldQty})\n`; });
    t += `\nรวม ${list.length} รายการ ${list.reduce((a, r) => a + r.qty, 0)} ชิ้น`;
    return t;
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e2) { toast('คัดลอกไม่สำเร็จ'); }
      ta.remove();
    }
  }
  function copyRestockText() { copyText(restockText(), '📋 คัดลอกใบเบิกแล้ว • วางในแชท LINE ได้เลย'); }

  // A4 document: on screen shows an A4 sheet preview; printing fits the content to one A4 page
  // when possible (fit=true shrinks up to 60%, longer reports continue on page 2).
  function printHtml(title, body, opts) {
    const fit = opts?.fit !== false;
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html { background: #e5e7eb; }
        body { font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif; color: #111; font-size: 13px; margin: 0; }
        .bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; justify-content: center; padding: 10px; background: #1f2937; }
        .bar button { height: 44px; padding: 0 18px; border-radius: 10px; border: 0; font: 700 15px "Sarabun", sans-serif; cursor: pointer; }
        .bar .p { background: #10b981; color: #fff; } .bar .x { background: #4b5563; color: #fff; }
        .sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 12mm; background: #fff; box-shadow: 0 4px 18px rgba(0,0,0,.18); }
        .content { width: 186mm; }
        table { table-layout: auto; } td { word-break: break-word; }
        thead { display: table-header-group; } tr { page-break-inside: avoid; }
        @media print {
          html { background: #fff; } .bar { display: none; }
          .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
          .content { width: 100%; }
        }
        @media screen and (max-width: 820px) { .sheet { zoom: .5; } }
        h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 15px; margin: 16px 0 6px; border-bottom: 2px solid #111; padding-bottom: 3px; }
        .sub { color: #444; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
        th { background: #eee; } .r { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
        .tot td { font-weight: 700; background: #f5f5f5; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .kpi { border: 1px solid #999; padding: 6px 8px; } .kpi span { display: block; color: #555; font-size: 11.5px; } .kpi b { font-size: 17px; }
        .warn { color: #b45309; font-weight: 700; } .bad { color: #b91c1c; font-weight: 700; } .ok { color: #047857; font-weight: 700; }
        .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; text-align: center; }
        .sign div { border-top: 1px solid #111; padding-top: 6px; }
        .daily-title { font-size: 30px; font-weight: 800; color: #e11d48; margin: 6px 0 2px; }
        .daily-shop { color: #555; padding-bottom: 8px; border-bottom: 3px solid #f97316; margin-bottom: 8px; display: inline-block; }
        table.daily { border: 0; } table.daily th, table.daily td { border: 0; border-bottom: 1px solid #e5e5e5; padding: 4px 6px; font-size: 13px; }
        table.daily th { background: none; border-bottom: 2px solid #999; font-size: 14px; }
        table.daily .c { text-align: center; white-space: nowrap; } table.daily th:first-child, table.daily td:first-child { width: 17mm; } table.daily tr.has-w td { border-bottom: 0; }
        table.daily tr.w td { font-size: 12px; color: #333; padding-top: 0; }
        .promo { color: #e11d48; font-weight: 700; } .muted { color: #777; }
        .grand { display: flex; justify-content: flex-end; align-items: baseline; gap: 24px; margin-top: 10px; padding-top: 8px; border-top: 2px solid #999; }
        .grand span { font-weight: 700; } .grand strong { font-size: 24px; }
        .qrs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .qrc { border: 2px dashed #555; padding: 16px; text-align: center; page-break-inside: avoid; }
        .qrc svg { width: 220px; height: 220px; } .qrc h3 { font-size: 26px; margin: 6px 0; }
      </style></head><body data-fit="${fit ? '1' : '0'}">
        <div class="bar"><button class="p" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF (A4)</button><button class="x" onclick="window.close()">ปิด</button></div>
        <div class="sheet"><div class="content">${body}</div></div>
        <script>
          (function () {
            var MM = 96 / 25.4;
            function fitPage() {
              var c = document.querySelector('.content');
              c.style.zoom = 1;
              if (document.body.getAttribute('data-fit') !== '1') return;
              var avail = (297 - 24) * MM - 4;          // printable height of one A4 page
              var h = c.scrollHeight;
              if (h > avail) c.style.zoom = Math.max(0.6, Math.floor((avail / h) * 1000) / 1000);
            }
            window.__eaFit = fitPage;
            var go = function () { fitPage(); if (window.__eaAutoPrint) setTimeout(function () { window.focus(); window.print(); }, 150); };
            (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go);
          })();
        <\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.__eaAutoPrint = true;
      w.document.open(); w.document.write(html); w.document.close();
      return;
    }
    // Popup blocked: print through a hidden iframe
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    f.contentWindow.__eaAutoPrint = true;
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => f.remove(), 60000);
  }

  function printRestock() {
    const list = restockList();
    printHtml('ใบเบิกสินค้า', `
      <h1>ใบเบิกสินค้า – ${escapeHtml(shopName())}</h1>
      <div class="sub">${escapeHtml(dateTh())} เวลา ${escapeHtml(timeTh())} น.</div>
      <table>
        <thead><tr><th>#</th><th>สินค้า</th><th class="r">ขายวันนี้</th><th class="r">คงเหลือ</th><th class="r">เบิก</th><th>หน่วย</th><th>ได้รับจริง</th></tr></thead>
        <tbody>${list.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td class="r">${r.soldQty}</td><td class="r">${r.stock}</td><td class="r b">${r.qty}</td><td>${escapeHtml(r.unit)}</td><td></td></tr>`).join('')}
          <tr class="tot"><td colspan="4">รวม ${list.length} รายการ</td><td class="r">${list.reduce((a, r) => a + r.qty, 0)}</td><td colspan="2"></td></tr>
        </tbody>
      </table>
      <div class="sign"><div>ผู้เบิก</div><div>ผู้จ่ายสินค้า</div></div>`);
  }

  // =========================================================
  // Daily closing report
  // =========================================================
  function reportData() {
    const sales = todaySales();
    const sold = soldLines();
    const products = st()?.products || [];
    const devices = (window.hubDeviceStats?.() || []).filter(d => d.bills || d.received);
    const sum = (arr, f) => arr.reduce((a, x) => a + Number(f(x) || 0), 0);
    const cash = sales.filter(s => !isQr(s.payment_method));
    const qr = sales.filter(s => isQr(s.payment_method));
    const received = sum(devices, d => d.received);
    return {
      sales, sold, devices, products,
      bills: sales.length,
      total: sum(sales, s => s.total_amount),
      discount: sum(sales, s => s.discount_amount),
      cashTotal: sum(cash, s => s.total_amount), cashBills: cash.length,
      qrTotal: sum(qr, s => s.total_amount), qrBills: qr.length,
      units: sum(sold, r => r.qty),
      received,
      pending: sales.filter(s => s.is_pending_sync).length
    };
  }

  // ยอดขายรายวัน: สินค้า / ราคา / จำนวน / หน่วย / ผลรวม เท่านั้น
  function printDailyReport() {
    const d = reportData();
    const salesTable = `
      <div class="daily-title">ยอดขายรายวัน</div>
      <div class="daily-shop">${escapeHtml(shopName())} • ${escapeHtml(dateTh())} • พิมพ์ ${escapeHtml(timeTh())} น.${d.pending ? ` • <span class="warn">มี ${d.pending} บิลยังไม่ซิงค์</span>` : ''}</div>
      <table class="daily">
        <thead><tr><th class="c">วันที่</th><th>สินค้า</th><th class="r">ราคา</th><th class="c">จำนวน</th><th class="c">หน่วย</th><th class="r">ผลรวม</th></tr></thead>
        <tbody>
          ${d.sold.map((r, i) => `
            <tr class="${r.weights.length ? 'has-w' : ''}">
              <td class="c b">${i === 0 ? shortDateBE() : ''}</td>
              <td>${escapeHtml(r.name)}${r.note ? ` <span class="promo">** ${escapeHtml(r.note)} **</span>` : ''}</td>
              <td class="r">${r.price === 0 ? '' : fmtPrice(r.price)}</td>
              <td class="c">${fmtQty(r.qty)}</td>
              <td class="c">${escapeHtml(r.unit)}</td>
              <td class="r b">${money(r.amount)}</td>
            </tr>
            ${r.weights.length ? `<tr class="w"><td></td><td colspan="5">${r.weights.map(w => fmtQty(w)).join(', ')} <span class="muted">(รวม ${fmtQty(Math.round(r.weights.reduce((a, x) => a + x, 0) * 1000) / 1000)} กก.)</span></td></tr>` : ''}`).join('')}
        </tbody>
      </table>
      <div class="grand"><span>รวมทั้งหมด</span><strong>${money(d.sold.reduce((a, r) => a + r.amount, 0))}</strong></div>
      ${d.discount > 0 ? `<div class="sub">ส่วนลดท้ายบิล −${money(d.discount)} • ยอดขายสุทธิ ${money(d.total)}</div>` : ''}`;

    printHtml('ยอดขายรายวัน', salesTable);
  }

  // สรุปเงินสดประจำวัน (แยกจากรายงานยอดขาย)
  function printCashSummary() {
    const d = reportData();
    const outstanding = d.cashTotal - d.received;
    const restock = restockList();
    printHtml('สรุปเงินสดประจำวัน', `
      <h1>สรุปเงินสดประจำวัน – ${escapeHtml(shopName())}</h1>
      <div class="sub">${escapeHtml(dateTh())} • พิมพ์เวลา ${escapeHtml(timeTh())} น.${d.pending ? ` • <span class="warn">มี ${d.pending} บิลยังไม่ซิงค์</span>` : ''}</div>
      <div class="kpis">
        <div class="kpi"><span>ยอดขายรวม</span><b>฿${money(d.total)}</b></div>
        <div class="kpi"><span>จำนวนบิล / ชิ้น</span><b>${d.bills} / ${d.units}</b></div>
        <div class="kpi"><span>เงินสด (${d.cashBills} บิล)</span><b>฿${money(d.cashTotal)}</b></div>
        <div class="kpi"><span>โอน/QR (${d.qrBills} บิล)</span><b>฿${money(d.qrTotal)}</b></div>
      </div>
      ${d.discount > 0 ? `<div class="sub" style="margin-top:6px">ส่วนลดท้ายบิลรวม ฿${money(d.discount)}</div>` : ''}

      <h2>เงินสดแยกตามเครื่อง</h2>
      <table>
        <thead><tr><th>เครื่อง</th><th class="r">บิล</th><th class="r">ยอดขาย</th><th class="r">เงินสด</th><th class="r">โอน/QR</th><th class="r">รับเงินแล้ว</th><th class="r">ส่วนต่าง</th></tr></thead>
        <tbody>${d.devices.map(x => {
          const diff = x.received - x.cash;
          return `<tr><td class="b">${escapeHtml(x.code)}</td><td class="r">${x.bills}</td><td class="r">${money(x.total)}</td><td class="r">${money(x.cash)}</td><td class="r">${money(x.qr)}</td><td class="r">${money(x.received)}</td>
            <td class="r ${Math.abs(diff) < 0.01 ? 'ok' : diff < 0 ? 'bad' : 'warn'}">${Math.abs(diff) < 0.01 ? 'ครบ' : (diff < 0 ? 'ค้าง ' : 'เกิน ') + money(Math.abs(diff))}</td></tr>`;
        }).join('')}
          <tr class="tot"><td>รวม</td><td class="r">${d.bills}</td><td class="r">${money(d.total)}</td><td class="r">${money(d.cashTotal)}</td><td class="r">${money(d.qrTotal)}</td><td class="r">${money(d.received)}</td>
            <td class="r">${Math.abs(outstanding) < 0.01 ? 'ครบ' : (outstanding > 0 ? 'ค้าง ' : 'เกิน ') + money(Math.abs(outstanding))}</td></tr>
        </tbody>
      </table>


      ${restock.length ? `<h2>สินค้าที่ต้องเบิก</h2>
      <table><thead><tr><th>สินค้า</th><th class="r">คงเหลือ</th><th class="r">เบิก</th></tr></thead>
        <tbody>${restock.map(r => `<tr><td>${escapeHtml(r.name)}</td><td class="r">${r.stock}</td><td class="r b">${r.qty} ${escapeHtml(r.unit)}</td></tr>`).join('')}</tbody></table>` : ''}

      <h2>นำส่งเงินสด</h2>
      <table>
        <tr><td>เงินสดจากการขาย</td><td class="r b">฿${money(d.cashTotal)}</td></tr>
        <tr><td>รับเงินจากเครื่องแล้ว</td><td class="r">฿${money(d.received)}</td></tr>
        <tr><td>ส่วนต่าง</td><td class="r ${Math.abs(outstanding) < 0.01 ? 'ok' : 'bad'}">${Math.abs(outstanding) < 0.01 ? 'ครบถ้วน' : (outstanding > 0 ? 'ค้างรับ ฿' : 'รับเกิน ฿') + money(Math.abs(outstanding))}</td></tr>
        <tr><td>เงินสดนำส่ง (นับจริง)</td><td class="r">฿ ......................</td></tr>
      </table>
      <div class="sign"><div>ผู้ส่งเงิน / ผู้สรุปยอด</div><div>ผู้รับเงิน</div></div>`);
  }

  function dailyReportText() {
    const d = reportData();
    let t = `📊 ยอดขายรายวัน ${shopName()}\n${dateTh()} (ณ ${timeTh()} น.)\n\n`;
    d.sold.forEach((r, i) => {
      t += `${i + 1}. ${r.name}${r.note ? ` **${r.note}**` : ''}  ${r.price === 0 ? 'แถม' : fmtPrice(r.price)} × ${fmtQty(r.qty)} ${r.unit} = ${money(r.amount)}\n`;
      if (r.weights.length) t += `   ⚖️ ${r.weights.map(w => fmtQty(w)).join(', ')}\n`;
    });
    t += `\nรวมทั้งหมด ${money(d.sold.reduce((a, r) => a + r.amount, 0))}`;
    if (d.discount > 0) t += `\nส่วนลดท้ายบิล −${money(d.discount)} • ยอดขายสุทธิ ${money(d.total)}`;
    if (d.pending) t += `\n⚠️ มี ${d.pending} บิลยังไม่ซิงค์`;
    return t;
  }
  function copyDailyReportText() { copyText(dailyReportText(), '📋 คัดลอกยอดขายรายวันแล้ว • วางในแชท LINE ได้เลย'); }

  function cashSummaryText() {
    const d = reportData();
    const outstanding = d.cashTotal - d.received;
    let t = `💵 สรุปเงินสดประจำวัน ${shopName()}\n${dateTh()} (ณ ${timeTh()} น.)\n\n`;
    t += `ยอดขายรวม ฿${money(d.total)} • ${d.bills} บิล • ${d.units} ชิ้น\n`;
    t += `💵 เงินสด ฿${money(d.cashTotal)} (${d.cashBills} บิล)\n📱 โอน/QR ฿${money(d.qrTotal)} (${d.qrBills} บิล)\n`;
    if (d.discount > 0) t += `ส่วนลดท้ายบิล ฿${money(d.discount)}\n`;
    t += `\n— แยกเครื่อง —\n`;
    d.devices.forEach(x => {
      const diff = x.received - x.cash;
      t += `${x.code}: ${x.bills} บิล ฿${money(x.total)} (สด ${money(x.cash)} / QR ${money(x.qr)}) รับเงินแล้ว ${money(x.received)}${Math.abs(diff) < 0.01 ? ' ✓ครบ' : diff < 0 ? ` ❗ค้าง ${money(-diff)}` : ` เกิน ${money(diff)}`}\n`;
    });
    t += `\nเงินสดนำส่ง ฿${money(d.cashTotal)}${Math.abs(outstanding) < 0.01 ? ' (รับครบแล้ว)' : outstanding > 0 ? ` (ยังค้างรับจากเครื่อง ฿${money(outstanding)})` : ` (รับเกิน ฿${money(-outstanding)})`}`;
    if (d.pending) t += `\n⚠️ มี ${d.pending} บิลยังไม่ซิงค์`;
    return t;
  }
  function copyCashSummaryText() { copyText(cashSummaryText(), '📋 คัดลอกสรุปเงินสดแล้ว • วางในแชท LINE ได้เลย'); }

  // =========================================================
  // QR: open a cashier station on any phone
  // =========================================================
  function stations() {
    return lsGet(K.stations, 'เครื่อง A,เครื่อง B,เครื่อง C')
      .split(',').map(x => x.trim().slice(0, 20)).filter(Boolean).slice(0, 12);
  }
  function stationUrl(name) {
    return `${location.origin}${location.pathname}?cashier=${encodeURIComponent(name)}`;
  }
  function qrSvg(text, cell) {
    if (typeof window.qrcode !== 'function') return '<div class="hub-empty">โหลดตัวสร้าง QR ไม่สำเร็จ</div>';
    const q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q.createSvgTag(cell || 5, 2);
  }

  function renderQrPanel() {
    if (!showQr) return '';
    const list = stations();
    return `
      <div class="hub-panel hub-qr-panel">
        <div class="hub-panel-head">
          <h2 class="hub-h">📲 เปิดจุดคิดเงินด้วยมือถือ</h2>
          <button type="button" class="hub-btn-ghost" onclick="toggleHubQr()">ปิด</button>
        </div>
        <div class="hub-hint">ให้พนักงานเปิดกล้องมือถือสแกน QR ของจุดที่รับผิดชอบ → มือถือเข้าหน้าคิดเงินทันที ยอดเข้าศูนย์กลางในชื่อจุดนั้น (ไม่ต้องติดตั้งหรือตั้งค่า)</div>
        <label class="hub-field"><span>ชื่อจุดคิดเงิน (คั่นด้วย ,)</span>
          <input type="text" value="${escapeHtml(list.join(', '))}" onchange="hubSetStations(this.value)">
        </label>
        <div class="hub-qr-grid">
          ${list.map(n => `
            <div class="hub-qr-card">
              <div class="hub-qr-img">${qrSvg(stationUrl(n), 5)}</div>
              <div class="hub-qr-name">${escapeHtml(n)}</div>
            </div>`).join('')}
        </div>
        <div class="hub-actions"><button type="button" class="hub-btn" onclick="printStationQr()">🖨️ พิมพ์ QR ไปติดที่จุดขาย</button></div>
      </div>`;
  }
  function toggleHubQr() { showQr = !showQr; window.renderHub?.(); }
  function hubSetStations(v) {
    const list = String(v || '').split(',').map(x => x.trim().slice(0, 20)).filter(Boolean);
    lsSet(K.stations, (list.length ? list : ['เครื่อง A']).join(','));
    window.renderHub?.();
  }
  function printStationQr() {
    printHtml('QR จุดคิดเงิน', `
      <h1>QR เปิดจุดคิดเงิน – ${escapeHtml(shopName())}</h1>
      <div class="sub">สแกนด้วยกล้องมือถือ → เข้าหน้าคิดเงินของจุดนั้นทันที</div>
      <div class="qrs">${stations().map(n => `<div class="qrc">${qrSvg(stationUrl(n), 8)}<h3>${escapeHtml(n)}</h3><div>สแกนเพื่อเริ่มคิดเงิน</div></div>`).join('')}</div>`, { fit: false });
  }

  // =========================================================
  // Toolbar + 15:00 reminder
  // =========================================================
  function renderToolbar() {
    return `
      <div class="hub-toolbar">
        <span class="hub-tool-group">
          <button type="button" class="hub-tool" onclick="printDailyReport()">📄 พิมพ์ยอดขายรายวัน</button>
          <button type="button" class="hub-tool hub-tool-sm" onclick="copyDailyReportText()" title="คัดลอกยอดขายรายวันส่ง LINE">📋 LINE</button>
        </span>
        <span class="hub-tool-group">
          <button type="button" class="hub-tool" onclick="printCashSummary()">💵 พิมพ์สรุปเงินสด</button>
          <button type="button" class="hub-tool hub-tool-sm" onclick="copyCashSummaryText()" title="คัดลอกสรุปเงินสดส่ง LINE">📋 LINE</button>
        </span>
        <button type="button" class="hub-tool" onclick="document.querySelector('.hub-restock')?.scrollIntoView({behavior:'smooth'})">📦 เบิกสินค้า</button>
        <button type="button" class="hub-tool ${showQr ? 'is-active' : ''}" onclick="toggleHubQr()">📲 QR เปิดจุดคิดเงิน</button>
      </div>
      ${renderQrPanel()}`;
  }

  function checkRestockReminder() {
    const w = restockWindowState();
    if (w.key !== 'now') return;
    if (!(window.isRemoteInboxEnabled?.() ?? true)) return;   // central device only
    const today = todayISO();
    if (lsGet(K.notified, '') === today) return;
    lsSet(K.notified, today);
    const n = forecast().rows.length;
    const msg = n ? `⏰ ถึงเวลาเบิกสินค้า • แนะนำเบิก ${n} รายการ (ถึง ${settings().winEnd} น.)` : '⏰ ถึงเวลาเบิกสินค้า • ตอนนี้สต็อกพอ';
    toast(msg, 8000);
    try { beepSuccess(); } catch (e) {}
    try { sendBrowserPushNotification?.('EA Fair Sale – เบิกสินค้า', { body: msg, tag: 'restock-' + today }); } catch (e) {}
    if (st()?.page === 'hub') window.renderHub?.();
  }

  setInterval(checkRestockReminder, 60000);
  setTimeout(checkRestockReminder, 8000);

  Object.assign(window, {
    renderHubToolbar: renderToolbar,
    renderHubRestockPanel: renderRestockPanel,
    hubSetCfg,
    hubSetRestockQty,
    copyRestockText,
    printRestock,
    printDailyReport,
    copyDailyReportText,
    printCashSummary,
    copyCashSummaryText,
    hubCashSummaryText: cashSummaryText,
    toggleHubQr,
    hubSetStations,
    printStationQr,
    hubDailyReportText: dailyReportText,
    hubForecast: forecast
  });
})();
