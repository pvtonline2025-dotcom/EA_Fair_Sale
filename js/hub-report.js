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

  function soldByProduct() {
    const s = st();
    const sales = todaySales();
    const ids = new Set(sales.map(x => x.id));
    const byId = new Map();
    for (const it of (s?.saleItems || [])) {
      if (!ids.has(it.sale_id)) continue;
      const key = it.product_id || it.product_name;
      if (!byId.has(key)) byId.set(key, { product_id: it.product_id, name: it.product_name || 'สินค้า', qty: 0, amount: 0, prices: new Map() });
      const r = byId.get(key);
      const qty = Number(it.qty || 0);
      const price = Number(it.unit_price || 0);
      r.qty += qty;
      r.amount += qty * price;
      r.prices.set(price, (r.prices.get(price) || 0) + qty);
    }
    return byId;
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

  function printHtml(title, body) {
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif; color: #111; font-size: 13px; margin: 0; }
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
        .qrs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .qrc { border: 2px dashed #555; padding: 16px; text-align: center; page-break-inside: avoid; }
        .qrc svg { width: 220px; height: 220px; } .qrc h3 { font-size: 26px; margin: 6px 0; }
      </style></head><body>${body}</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open(); w.document.write(html); w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
      return;
    }
    // Popup blocked: print through a hidden iframe
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 2000); }, 400);
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
    const sold = [...soldByProduct().values()].sort((a, b) => b.amount - a.amount);
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

  function priceLabel(r) {
    const ps = [...r.prices.keys()].sort((a, b) => b - a);
    return ps.length === 1 ? money(ps[0]) : ps.map(p => `${money(p)}×${r.prices.get(p)}`).join(', ');
  }

  function printDailyReport() {
    const d = reportData();
    const stockOf = (id) => { const p = d.products.find(x => x.id === id); return p ? Number(p.stock_qty || 0) : '-'; };
    const outstanding = d.cashTotal - d.received;
    const restock = restockList();
    printHtml('รายงานปิดวัน', `
      <h1>รายงานสรุปยอดขายประจำวัน – ${escapeHtml(shopName())}</h1>
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

      <h2>สินค้าที่ขายวันนี้</h2>
      <table>
        <thead><tr><th>#</th><th>สินค้า</th><th class="r">ราคาขาย</th><th class="r">จำนวน</th><th class="r">ยอดเงิน</th><th class="r">คงเหลือ</th></tr></thead>
        <tbody>${d.sold.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td class="r">${priceLabel(r)}</td><td class="r">${r.qty}</td><td class="r">${money(r.amount)}</td><td class="r">${stockOf(r.product_id)}</td></tr>`).join('')}
          <tr class="tot"><td colspan="3">รวม ${d.sold.length} รายการ</td><td class="r">${d.units}</td><td class="r">${money(d.sold.reduce((a, r) => a + r.amount, 0))}</td><td></td></tr>
        </tbody>
      </table>
      ${d.discount > 0 ? '<div class="sub">* ยอดเงินรายสินค้าเป็นยอดก่อนหักส่วนลดท้ายบิล</div>' : ''}

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
    const outstanding = d.cashTotal - d.received;
    let t = `📊 สรุปยอดขาย ${shopName()}\n${dateTh()} (ณ ${timeTh()} น.)\n\n`;
    t += `ยอดขายรวม ฿${money(d.total)} • ${d.bills} บิล • ${d.units} ชิ้น\n`;
    t += `💵 เงินสด ฿${money(d.cashTotal)} (${d.cashBills} บิล)\n📱 โอน/QR ฿${money(d.qrTotal)} (${d.qrBills} บิล)\n`;
    if (d.discount > 0) t += `ส่วนลดท้ายบิล ฿${money(d.discount)}\n`;
    t += `\n— แยกเครื่อง —\n`;
    d.devices.forEach(x => {
      const diff = x.received - x.cash;
      t += `${x.code}: ${x.bills} บิล ฿${money(x.total)} (สด ${money(x.cash)} / QR ${money(x.qr)}) รับเงินแล้ว ${money(x.received)}${Math.abs(diff) < 0.01 ? ' ✓ครบ' : diff < 0 ? ` ❗ค้าง ${money(-diff)}` : ` เกิน ${money(diff)}`}\n`;
    });
    t += `\n— สินค้าที่ขาย —\n`;
    d.sold.forEach((r, i) => { t += `${i + 1}. ${r.name} ${r.qty} × ${priceLabel(r)} = ฿${money(r.amount)}\n`; });
    t += `\nเงินสดนำส่ง ฿${money(d.cashTotal)}${Math.abs(outstanding) < 0.01 ? ' (รับครบแล้ว)' : outstanding > 0 ? ` (ยังค้างรับจากเครื่อง ฿${money(outstanding)})` : ` (รับเกิน ฿${money(-outstanding)})`}`;
    if (d.pending) t += `\n⚠️ มี ${d.pending} บิลยังไม่ซิงค์`;
    return t;
  }
  function copyDailyReportText() { copyText(dailyReportText(), '📋 คัดลอกสรุปยอดแล้ว • วางในแชท LINE ได้เลย'); }

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
      <div class="qrs">${stations().map(n => `<div class="qrc">${qrSvg(stationUrl(n), 8)}<h3>${escapeHtml(n)}</h3><div>สแกนเพื่อเริ่มคิดเงิน</div></div>`).join('')}</div>`);
  }

  // =========================================================
  // Toolbar + 15:00 reminder
  // =========================================================
  function renderToolbar() {
    return `
      <div class="hub-toolbar">
        <button type="button" class="hub-tool" onclick="printDailyReport()">📄 พิมพ์รายงานปิดวัน</button>
        <button type="button" class="hub-tool" onclick="copyDailyReportText()">📋 คัดลอกสรุปยอด (LINE)</button>
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
    toggleHubQr,
    hubSetStations,
    printStationQr,
    hubDailyReportText: dailyReportText,
    hubForecast: forecast
  });
})();
