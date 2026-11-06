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
    // วันสุดท้ายของงาน: ไม่ต้องเผื่อขายพรุ่งนี้
    let lastEventDay = false;
    try { const ev = window.getEventPeriod?.(); lastEventDay = !!(ev && ev.started && ev.daysLeftAfterToday === 0); } catch (_) {}

    const rows = [];
    for (const p of (s?.products || [])) {
      if (p.is_active === false) continue;
      const soldQty = sold.get(p.id)?.qty || 0;
      const stock = Number(p.stock_qty || 0);
      const min = Number(p.min_stock || 0);
      const rate = soldQty / elapsed;                       // pieces per hour today
      const needToday = rate * left;
      const needTomorrow = (cfg.tomorrow && !lastEventDay) ? rate * dayLen : 0;
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
    return { rows, cfg, left, now, lastEventDay };
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
          <label class="hub-check"><input type="checkbox" ${cfg.tomorrow ? 'checked' : ''} onchange="hubSetCfg('tomorrow', this.checked)"> เผื่อขายพรุ่งนี้ทั้งวัน${f.lastEventDay ? ' <b style="color:#f59e0b">(วันนี้วันสุดท้ายของงาน — ไม่เผื่อ)</b>' : ''}</label>
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
            <button type="button" class="hub-btn hub-btn-img" onclick="openRestockImage()">📷 ใบเบิกเป็นรูป (ส่ง LINE)</button>
            <button type="button" class="hub-btn-ghost" onclick="copyRestockText()">📋 คัดลอกข้อความ</button>
            <button type="button" class="hub-btn-ghost" onclick="printRestock()">🖨️ พิมพ์</button>
          </div>
        ` : (resvLines().length ? `
          <div class="hub-actions">
            <button type="button" class="hub-btn hub-btn-img" onclick="openRestockImage()">📷 ใบเบิกเป็นรูป (ส่ง LINE)</button>
            <button type="button" class="hub-btn-ghost" onclick="copyRestockText()">📋 คัดลอกข้อความ</button>
          </div>` : '<div class="hub-empty">ยังไม่มีสินค้าที่ต้องเบิก ✓</div>')}
        ${resvLines().length ? `<div class="hub-resv-note">📌 มีของสั่งจองที่ต้องเบิก ${new Set(resvLines().map(x => x.resId)).size} ใบ (${resvLines().length} รายการ) • รวมอยู่ในใบเบิกแล้ว</div>` : ''}
      </div>`;
  }

  function hubSetCfg(key, value) {
    if (key === 'tomorrow') lsSet(K.tomorrow, value ? 'true' : 'false');
    else if (key === 'open') lsSet(K.open, value || '09:00');
    else if (key === 'close') lsSet(K.close, value || '21:00');
    const page = window.getEaAppState?.()?.page;
    if (page === 'lowStock') window.renderLowStock?.(); else window.renderHub?.();
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
    const resv = resvLines();
    if (!list.length && !resv.length) return t + 'ไม่มีรายการที่ต้องเบิก';
    list.forEach((r, i) => { t += `${i + 1}. ${r.name} — เบิก ${r.qty} ${r.unit}\n`; });
    if (resv.length) {
      t += `\n📌 ของสั่งจอง:\n`;
      resv.forEach(x => { t += `- ${x.name} — ${x.qty} ${x.unit} (${x.customer} ${x.res_no} รับ ${thShort(x.pickup_date)})\n`; });
    }
    const note = getRestockNote().trim();
    if (note) t += `\n📝 หมายเหตุ / สั่งพิเศษ:\n${note}`;
    return t.trim();
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

  // =========================================================
  // ใบเบิกเป็นรูปภาพ (PNG) — แชร์ไป LINE / บันทึกรูป / คัดลอกรูป
  // =========================================================
  function eventLine() {
    try {
      const ev = window.getEventPeriod?.();
      if (ev && ev.started && !ev.ended) return `งานวันที่ ${ev.dayNo}/${ev.totalDays}${ev.daysLeftAfterToday ? ` • เหลืออีก ${ev.daysLeftAfterToday} วัน` : ' • วันสุดท้าย'}`;
    } catch (_) {}
    return '';
  }
  function wrapLines(ctx, text, maxW, maxLines) {
    const chars = Array.from(String(text || ''));
    const lines = []; let cur = '';
    for (const ch of chars) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        // ตัดที่ช่องว่างล่าสุดถ้ามี
        const sp = cur.lastIndexOf(' ');
        if (sp > cur.length * 0.5) { lines.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; }
        else { lines.push(cur); cur = ch; }
        if (lines.length === maxLines) break;
      } else cur += ch;
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    const consumed = lines.join('').replace(/\s/g, '').length;
    if (consumed < String(text).replace(/\s/g, '').length) {
      let last = lines[lines.length - 1];
      while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[lines.length - 1] = last + '…';
    }
    return lines;
  }
  // หมายเหตุ / สั่งพิเศษ (จำไว้รายวันในเครื่อง)
  function noteKey() { const d = new Date(); return `ea_restock_note_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function getRestockNote() { try { return localStorage.getItem(noteKey()) || ''; } catch (_) { return ''; } }
  function setRestockNote(v) { try { localStorage.setItem(noteKey(), String(v || '')); } catch (_) {} }

  // ของสั่งจองที่ต้องเบิก (จากหน้าใบจอง)
  function resvLines() {
    const rs = window.eaReservationRequisitions?.() || [];
    const out = [];
    for (const r of rs) for (const i of (r.items || [])) out.push({ resId: r.id, res_no: r.res_no, customer: r.customer_name, pickup_date: r.pickup_date, name: i.name, qty: Number(i.qty), unit: i.unit || '' });
    return out;
  }
  function thShort(iso) { return iso ? new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''; }

  function drawRestockImage(list, note = getRestockNote(), resv = resvLines()) {
    const W = 1080, PAD = 48;
    const FONT = (window.getAppFontStack && window.getAppFontStack()) || '"Sarabun","Noto Sans Thai","Thonburi",-apple-system,"Segoe UI",sans-serif';
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    // คอลัมน์: # | สินค้า | เบิก | หน่วย
    const colNo = PAD, colName = PAD + 70, colQtyR = W - PAD - 150, colUnit = W - PAD - 125;
    const nameW = colQtyR - 110 - colName;
    ctx.font = `600 34px ${FONT}`;
    const rowsDraw = list.map(r => ({ ...r, lines: wrapLines(ctx, r.name, nameW, 2) }));
    const rowH = rowsDraw.map(r => r.lines.length > 1 ? 112 : 78);

    // หมายเหตุ: ตัดบรรทัดตามความกว้าง (สูงสุด 14 บรรทัด)
    const noteText = String(note || '').trim();
    ctx.font = `500 30px ${FONT}`;
    const noteLines = [];
    if (noteText) {
      for (const para of noteText.split(/\r?\n/)) {
        if (!para.trim()) { noteLines.push(''); continue; }
        noteLines.push(...wrapLines(ctx, para, W - 2 * PAD - 20, 6));
        if (noteLines.length >= 14) break;
      }
    }
    const noteH = noteLines.length ? 84 + noteLines.slice(0, 14).length * 44 : 0;

    const headH = 250, tableHead = list.length ? 70 : 0, footH = 70;
    ctx.font = `600 32px ${FONT}`;
    const resvDraw = resv.map(x => ({ ...x, lines: wrapLines(ctx, x.name, nameW, 2) }));
    const resvH = resvDraw.length ? 30 + 64 + resvDraw.reduce((a, x) => a + (x.lines.length > 1 ? 128 : 92), 0) : 0;
    const H = headH + tableHead + rowH.reduce((a, b) => a + b, 0) + resvH + (noteH ? noteH + 30 : 0) + footH;
    cv.width = W; cv.height = H;

    // พื้นหลัง + หัว
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#0f766e'); g.addColorStop(1, '#0369a1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, headH - 30);
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic';
    ctx.font = `800 58px ${FONT}`; ctx.fillText('📦 ใบเบิกสินค้า', PAD, 92);
    ctx.font = `600 32px ${FONT}`; ctx.fillText(shopName(), PAD, 142);
    ctx.font = `500 28px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.92)';
    const ev = eventLine();
    ctx.fillText(`${dateTh()} • ${timeTh()} น.${ev ? '   ' + ev : ''}`, PAD, 190);

    // หัวตาราง
    let y = headH;
    if (list.length) {
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(PAD - 16, y, W - 2 * PAD + 32, tableHead);
    ctx.fillStyle = '#475569'; ctx.font = `700 26px ${FONT}`;
    ctx.fillText('#', colNo, y + 45); ctx.fillText('สินค้า', colName, y + 45);
    ctx.textAlign = 'right'; ctx.fillText('เบิก', colQtyR, y + 45);
    ctx.textAlign = 'left'; ctx.fillText('หน่วย', colUnit, y + 45);
    y += tableHead;

    // แถวสินค้า
    rowsDraw.forEach((r, i) => {
      const h = rowH[i];
      if (i % 2 === 1) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(PAD - 16, y, W - 2 * PAD + 32, h); }
      const mid = y + h / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8'; ctx.font = `700 30px ${FONT}`; ctx.fillText(String(i + 1), colNo, mid + 11);
      ctx.fillStyle = '#0f172a'; ctx.font = `600 34px ${FONT}`;
      if (r.lines.length > 1) { ctx.fillText(r.lines[0], colName, mid - 8); ctx.fillText(r.lines[1], colName, mid + 34); }
      else ctx.fillText(r.lines[0] || '', colName, mid + 12);
      ctx.textAlign = 'right'; ctx.font = `800 46px ${FONT}`; ctx.fillStyle = '#0f766e';
      ctx.fillText(fmtQty(r.qty), colQtyR, mid + 16);
      ctx.textAlign = 'left'; ctx.font = `600 30px ${FONT}`; ctx.fillStyle = '#334155';
      const u = wrapLines(ctx, r.unit, W - PAD - colUnit, 1); ctx.fillText(u[0] || '', colUnit, mid + 11);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD - 16, y + h); ctx.lineTo(W - PAD + 16, y + h); ctx.stroke();
      y += h;
    });
    }

    // ของสั่งจอง (แยกหัวข้อ)
    if (resvDraw.length) {
      y += 30;
      ctx.fillStyle = '#f5f3ff'; ctx.fillRect(PAD - 16, y, W - 2 * PAD + 32, 64);
      ctx.textAlign = 'left'; ctx.fillStyle = '#5b21b6'; ctx.font = `800 30px ${FONT}`;
      ctx.fillText(`📌 ของสั่งจอง (${new Set(resvDraw.map(x => x.resId)).size} ใบ) — เตรียมให้ลูกค้า`, PAD, y + 43);
      y += 64;
      resvDraw.forEach((x, i) => {
        const h = x.lines.length > 1 ? 128 : 92;
        const top = y + 40;
        ctx.textAlign = 'left'; ctx.fillStyle = '#0f172a'; ctx.font = `600 32px ${FONT}`;
        x.lines.forEach((ln, k) => ctx.fillText(ln, colName, top + k * 38));
        ctx.fillStyle = '#6d28d9'; ctx.font = `600 24px ${FONT}`;
        ctx.fillText(`${x.customer} • ${x.res_no} • นัดรับ ${thShort(x.pickup_date)}`, colName, top + x.lines.length * 38 + 4);
        ctx.fillStyle = '#a78bfa'; ctx.font = `800 30px ${FONT}`; ctx.fillText('📌', colNo, top);
        ctx.textAlign = 'right'; ctx.font = `800 46px ${FONT}`; ctx.fillStyle = '#6d28d9'; ctx.fillText(fmtQty(x.qty), colQtyR, top + 8);
        ctx.textAlign = 'left'; ctx.font = `600 30px ${FONT}`; ctx.fillStyle = '#334155';
        const u = wrapLines(ctx, x.unit, W - PAD - colUnit, 1); ctx.fillText(u[0] || '', colUnit, top + 4);
        ctx.strokeStyle = '#ede9fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD - 16, y + h); ctx.lineTo(W - PAD + 16, y + h); ctx.stroke();
        y += h;
      });
    }

    // หมายเหตุ / สั่งพิเศษ
    if (noteH) {
      y += 30;
      ctx.fillStyle = '#fffbeb'; ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2;
      roundRect(ctx, PAD - 16, y, W - 2 * PAD + 32, noteH, 16); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#92400e'; ctx.font = `800 30px ${FONT}`;
      ctx.fillText('📝 หมายเหตุ / สั่งพิเศษ', PAD + 4, y + 52);
      ctx.fillStyle = '#1f2937'; ctx.font = `500 30px ${FONT}`;
      noteLines.slice(0, 14).forEach((ln, k) => ctx.fillText(ln, PAD + 4, y + 100 + k * 44));
      y += noteH;
    }

    ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8'; ctx.font = `500 22px ${FONT}`;
    ctx.fillText('สร้างจาก EA Fair Sale', PAD, H - 26);
    return cv;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  let restockImg = null; // { blob, url, file }
  function restockFileName() {
    const d = new Date(); const p = n => String(n).padStart(2, '0');
    return `restock-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
  }
  async function loadImageFonts() {
    try {
      const fam = (window.getAppFontStack?.() || '').split(',')[0];
      if (fam && document.fonts?.load) await Promise.race([
        Promise.all(['500 28px', '600 34px', '700 30px', '800 58px'].map(w => document.fonts.load(`${w} ${fam}`, 'ใบเบิก'))),
        new Promise(r => setTimeout(r, 2500))
      ]);
      await document.fonts?.ready;
    } catch (_) {}
  }
  async function buildRestockImage(list) {
    const resv = resvLines();
    const cv = drawRestockImage(list, getRestockNote(), resv);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) return null;
    if (restockImg?.url) URL.revokeObjectURL(restockImg.url);
    const file = new File([blob], restockFileName(), { type: 'image/png' });
    restockImg = { blob, url: URL.createObjectURL(blob), file, list, resIds: [...new Set(resv.map(x => x.resId))] };
    return restockImg;
  }
  let noteTimer = null;
  function onRestockNoteInput(v) {
    setRestockNote(v);
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      if (!restockImg) return;
      const img = await buildRestockImage(restockImg.list);
      const el = document.querySelector('#restockImgDialog .rid-body img');
      if (img && el) el.src = img.url;
    }, 350);
  }
  async function openRestockImage() {
    const list = restockList();
    const resvCount = resvLines().length;
    if (!list.length && !resvCount) { toast('ยังไม่มีรายการที่ต้องเบิก (จำนวนเบิกเป็น 0 ทั้งหมด)'); return; }
    await loadImageFonts();
    const img = await buildRestockImage(list);
    if (!img) { toast('สร้างรูปไม่สำเร็จ'); return; }
    let dlg = document.getElementById('restockImgDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'restockImgDialog';
      dlg.className = 'restock-img-dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('close', () => { if (restockImg?.url) { URL.revokeObjectURL(restockImg.url); restockImg = null; } });
    }
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [img.file] }));
    const canCopy = !!(window.ClipboardItem && navigator.clipboard?.write);
    dlg.innerHTML = `
      <div class="rid-head">
        <strong>📷 ใบเบิกสินค้า (${list.length} รายการ${img.resIds.length ? ` + ของจอง ${img.resIds.length} ใบ` : ''})</strong>
        <button type="button" class="rid-close" onclick="document.getElementById('restockImgDialog').close()" aria-label="ปิด">✕</button>
      </div>
      <div class="rid-body"><img src="${img.url}" alt="ใบเบิกสินค้า"></div>
      <div class="rid-note">
        <label for="restockNoteInput">📝 หมายเหตุ / สั่งพิเศษ <span>(ขึ้นในรูปทันที • เว้นว่างได้)</span></label>
        <textarea id="restockNoteInput" rows="2" placeholder="เช่น ขอถุงใส่ของ 2 แพ็ค, สายยางสีเขียวเพิ่ม 1 ม้วน, ส่งก่อน 9 โมง" oninput="onRestockNoteInput(this.value)">${escapeHtml(getRestockNote())}</textarea>
      </div>
      <div class="rid-actions">
        ${canShare ? '<button type="button" class="rid-btn rid-primary" onclick="shareRestockImage()">📤 แชร์ไป LINE</button>' : ''}
        <button type="button" class="rid-btn ${canShare ? '' : 'rid-primary'}" onclick="downloadRestockImage()">💾 บันทึกรูป</button>
        ${canCopy ? '<button type="button" class="rid-btn" onclick="copyRestockImage()">📋 คัดลอกรูป</button>' : ''}
      </div>
      <div class="rid-hint">${canShare ? 'กด "แชร์ไป LINE" แล้วเลือก LINE → เลือกกลุ่มภายใน' : 'บันทึกรูปแล้วส่งเข้า LINE หรือกด "คัดลอกรูป" แล้ววาง (Ctrl+V) ในแชท LINE'}</div>`;
    if (!dlg.open) dlg.showModal();
  }
  // ก่อนแชร์/บันทึก/คัดลอก: วาดรูปล่าสุดให้ตรงกับหมายเหตุที่เพิ่งพิมพ์
  async function ensureLatestImage() {
    clearTimeout(noteTimer);
    const ta = document.getElementById('restockNoteInput');
    if (ta) setRestockNote(ta.value);
    if (restockImg) {
      const img = await buildRestockImage(restockImg.list);
      const el = document.querySelector('#restockImgDialog .rid-body img');
      if (img && el) el.src = img.url;
    }
  }
  // ส่ง/บันทึกใบเบิกแล้ว → ทำเครื่องหมายว่าของจองเบิกแล้ว (ไม่ขึ้นซ้ำวันถัดไป)
  function markResvSent() {
    // เก็บใบเบิกที่ส่งแล้ว ไว้ใช้ "รับของตามใบเบิก" (ครั้งเดียวต่อการเปิดรูป)
    if (restockImg && !restockImg.reqSaved && restockImg.list?.length) {
      restockImg.reqSaved = true;
      window.eaSaveRequisition?.(restockImg.list.map(r => ({ pid: r.id, name: r.name, unit: r.unit, qty: Number(r.qty) })), getRestockNote());
    }
    const ids = restockImg?.resIds || [];
    if (!ids.length || restockImg.resMarked) return;
    restockImg.resMarked = true;
    window.eaMarkReservationsRequisitioned?.(ids, true);
    toast(`บันทึกว่าเบิกของจองแล้ว ${ids.length} ใบ`, 3000);
  }
  async function shareRestockImage() {
    if (!restockImg) return;
    await ensureLatestImage();
    try {
      await navigator.share({ files: [restockImg.file], title: 'ใบเบิกสินค้า', text: `ใบเบิกสินค้า ${shopName()} ${dateTh()}` });
      markResvSent();
    } catch (e) {
      if (e?.name !== 'AbortError') { toast('แชร์ไม่สำเร็จ — ลองกด "บันทึกรูป" แทน'); }
    }
  }
  async function downloadRestockImage() {
    if (!restockImg) return;
    await ensureLatestImage();
    const a = document.createElement('a');
    a.href = restockImg.url; a.download = restockImg.file.name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('💾 บันทึกรูปใบเบิกแล้ว');
    markResvSent();
  }
  async function copyRestockImage() {
    if (!restockImg) return;
    await ensureLatestImage();
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': restockImg.blob })]);
      toast('📋 คัดลอกรูปแล้ว • วางในแชท LINE ได้เลย');
      markResvSent();
    } catch (e) { toast('คัดลอกรูปไม่สำเร็จ — ใช้ "บันทึกรูป" แทน'); }
  }

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
        .ea-ic { display: inline-block; width: 1.15em; height: 1.15em; vertical-align: -0.2em; }
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
    const finalHtml = window.EaIcons ? window.EaIcons.htmlWithIcons(html) : html;
    const w = window.open('', '_blank');
    if (w) {
      w.__eaAutoPrint = true;
      w.document.open(); w.document.write(finalHtml); w.document.close();
      return;
    }
    // Popup blocked: print through a hidden iframe
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    f.contentWindow.__eaAutoPrint = true;
    f.contentDocument.open(); f.contentDocument.write(finalHtml); f.contentDocument.close();
    setTimeout(() => f.remove(), 60000);
  }

  function printRestock() {
    const list = restockList();
    printHtml('ใบเบิกสินค้า', `
      <h1>ใบเบิกสินค้า – ${escapeHtml(shopName())}</h1>
      <div class="sub">${escapeHtml(dateTh())} เวลา ${escapeHtml(timeTh())} น.</div>
      <table>
        <thead><tr><th>#</th><th>สินค้า</th><th class="r">เบิก</th><th>หน่วย</th><th>ได้รับจริง</th></tr></thead>
        <tbody>${list.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td class="r b">${r.qty}</td><td>${escapeHtml(r.unit)}</td><td></td></tr>`).join('')}
        ${resvLines().map(x => `<tr><td>📌</td><td>${escapeHtml(x.name)}<br><small>ของจอง ${escapeHtml(x.customer)} ${escapeHtml(x.res_no)} • รับ ${escapeHtml(thShort(x.pickup_date))}</small></td><td class="r b">${fmtQty(x.qty)}</td><td>${escapeHtml(x.unit)}</td><td></td></tr>`).join('')}
        </tbody>
      </table>
      ${getRestockNote().trim() ? `<div style="margin-top:12px;padding:10px 12px;border:1px solid #fcd34d;background:#fffbeb;border-radius:8px;white-space:pre-wrap;"><b>📝 หมายเหตุ / สั่งพิเศษ:</b>\n${escapeHtml(getRestockNote().trim())}</div>` : ''}
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
    // บิลส่งของใบจอง: ส่วนลดท้ายบิล = หักมัดจำ (ไม่ใช่ส่วนลดจริง)
    const depDeduct = sum(sales.filter(s => /หักมัดจำ/.test(String(s.note || ''))), s => s.discount_amount);
    const rm = window.eaReservationMoney?.() || null;
    return {
      sales, sold, devices, products, rm, depDeduct,
      bills: sales.length,
      total: sum(sales, s => s.total_amount),
      discount: sum(sales, s => s.discount_amount) - depDeduct,
      cashTotal: sum(cash, s => s.total_amount), cashBills: cash.length,
      qrTotal: sum(qr, s => s.total_amount), qrBills: qr.length,
      units: sum(sold, r => r.qty),
      received,
      pending: sales.filter(s => s.is_pending_sync).length,
      resvSales: rm ? rm.sales : 0, resvCash: rm ? rm.todayCash : 0, resvQr: rm ? rm.todayQr : 0,
      resvRows: rm ? resvSaleRows(rm) : []
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
          ${[...d.sold, ...d.resvRows].map((r, i) => `
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
      <div class="grand"><span>รวมทั้งหมด</span><strong>${money([...d.sold, ...d.resvRows].reduce((a, r) => a + r.amount, 0))}</strong></div>
      ${d.discount > 0 ? `<div class="sub">ส่วนลดท้ายบิล −${money(d.discount)}</div>` : ''}
      ${d.discount > 0 ? `<div class="grand"><span>ยอดขายสุทธิวันนี้</span><strong>${money(d.total + d.resvSales)}</strong></div>` : ''}
      ${d.resvSales ? `<div class="sub">รวมใบจองที่ส่งของวันนี้ ฿${money(d.resvSales)} (ดึงมัดจำเข้ายอดวันนี้แล้ว)</div>` : ''}
      ${resvSectionHtml(d)}`;

    printHtml('ยอดขายรายวัน', salesTable);
  }

  // แถวขายจากใบจองที่ส่งของวันนี้ (ไม่ได้เปิดบิลขาย) → ใส่ในตารางยอดขายรายวัน
  // ยอด = มัดจำ + เงินคงค้างที่รับ  • ใบที่ส่งผ่านบิลขาย มีสินค้าอยู่ในบิลแล้ว (มัดจำถูกหักเป็นส่วนลด) ไม่ต้องใส่ซ้ำ
  function resvSaleRows(m) {
    const rows = [];
    for (const r of m.picked) {
      if (r.sale_no) continue;
      const items = Array.isArray(r.items) ? r.items : [];
      const amt = Number(r.deposit_amount || 0) + Number(r.final_amount || 0);
      const lineSum = items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.unit_price || 0), 0);
      const note = `ใบจอง ${r.res_no} ${r.customer_name}`;
      if (items.length && Math.abs(lineSum - amt) < 0.01) {
        items.forEach(i => rows.push({ name: i.name, price: Number(i.unit_price || 0), qty: Number(i.qty || 0), unit: i.unit || '', amount: Number(i.qty || 0) * Number(i.unit_price || 0), note, weights: [] }));
      } else {
        rows.push({ name: items.map(i => `${i.name} ${fmtQty(Number(i.qty))} ${i.unit || ''}`.trim()).join(' + ') || 'สินค้าสั่งจอง', price: amt, qty: 1, unit: 'ชุด', amount: amt, note: `${note} ราคาตกลง`, weights: [] });
      }
    }
    for (const r of m.cancelled) {
      const f = Math.max(0, Number(r.deposit_amount || 0) - Number(r.refund_amount || 0));
      if (f > 0) rows.push({ name: `ริบมัดจำ (ยกเลิกใบจอง)`, price: f, qty: 1, unit: 'รายการ', amount: f, note: `ใบจอง ${r.res_no} ${r.customer_name}`, weights: [] });
    }
    return rows;
  }

  // ใบจอง: มัดจำแยกเก็บ → นับเป็นยอดของ "วันที่ส่งของ"
  function resvClosedRows(m) {
    const rows = [];
    for (const r of m.picked) {
      const amt = Number(r.deposit_amount || 0) + (r.sale_no ? 0 : Number(r.final_amount || 0));
      rows.push({ r, label: `ส่งของ ${r.res_no} ${r.customer_name}`, items: (r.items || []).map(i => `${i.name} ${fmtQty(Number(i.qty))} ${i.unit || ''}`).join(', '),
        detail: r.sale_no ? `มัดจำ ${money(r.deposit_amount)} (ส่วนที่เหลืออยู่ในบิล ${r.sale_no})` : `มัดจำ ${money(r.deposit_amount)} + รับวันนี้ ${money(r.final_amount)}${r.final_method === 'shop' ? ' (จ่ายที่ร้าน)' : isQr(r.final_method) ? ' (โอน)' : ' (สด)'}`, amt });
    }
    for (const r of m.cancelled) {
      const f = Math.max(0, Number(r.deposit_amount || 0) - Number(r.refund_amount || 0));
      if (f > 0) rows.push({ r, label: `ยกเลิก ${r.res_no} ${r.customer_name}`, items: '', detail: `ริบมัดจำ (คืน ${money(r.refund_amount)})`, amt: f });
    }
    return rows;
  }
  function resvSectionHtml(d, opts) {
    const m = d.rm; if (!m || !m.any) return '';
    const rows = resvClosedRows(m);
    return `<h2>ใบสั่งจอง (มัดจำแยกยอด • นับเป็นยอดขายวันที่ส่งของ)</h2>
      <table>
        ${rows.map(x => `<tr><td>${escapeHtml(x.label)}${x.items ? `<br><small>${escapeHtml(x.items)}</small>` : ''}<br><small>${escapeHtml(x.detail)}</small></td><td class="r b">฿${money(x.amt)}</td></tr>`).join('')}
        ${rows.length ? `<tr class="tot"><td>รวมยอดใบจองที่นับเป็นยอดวันนี้</td><td class="r">฿${money(m.sales)}</td></tr>` : ''}
        ${m.deposits.length ? `<tr><td>รับมัดจำใหม่ ${m.deposits.length} ใบ — <b>แยกเก็บ ไม่รวมยอดวันนี้</b></td><td class="r">สด ฿${money(m.depositCash)} • โอน ฿${money(m.depositQr)}</td></tr>` : ''}
        ${m.refunds.length ? `<tr><td>คืนมัดจำ ${m.refunds.length} ใบ (จ่ายจากซองมัดจำ)</td><td class="r">สด ฿${money(m.refundCash)} • โอน ฿${money(m.refundQr)}</td></tr>` : ''}
        <tr><td>มัดจำคงค้าง ใบจองรอรับ ${m.held.length} ใบ</td><td class="r">สด ฿${money(m.heldCash)} • โอน ฿${money(m.heldQr)}</td></tr>
      </table>`;
  }
  function resvText(d) {
    const m = d.rm; if (!m || !m.any) return '';
    let t = `\n— ใบจอง (มัดจำแยกยอด) —\n`;
    resvClosedRows(m).forEach(x => { t += `${x.label}: ฿${money(x.amt)} (${x.detail})\n`; });
    if (m.sales) t += `รวมยอดใบจองวันนี้ ฿${money(m.sales)}\n`;
    if (m.deposits.length) t += `รับมัดจำใหม่ ${m.deposits.length} ใบ: สด ฿${money(m.depositCash)} / โอน ฿${money(m.depositQr)} (แยกเก็บ ไม่รวมยอดวันนี้)\n`;
    if (m.refunds.length) t += `คืนมัดจำ ${m.refunds.length} ใบ: สด ฿${money(m.refundCash)} / โอน ฿${money(m.refundQr)}\n`;
    t += `มัดจำคงค้าง ${m.held.length} ใบ: สด ฿${money(m.heldCash)} / โอน ฿${money(m.heldQr)}\n`;
    return t;
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
        <div class="kpi"><span>ยอดขายรวม${d.resvSales ? ' (รวมใบจองที่ส่งของ)' : ''}</span><b>฿${money(d.total + d.resvSales)}</b></div>
        <div class="kpi"><span>จำนวนบิล / ชิ้น</span><b>${d.bills} / ${d.units}</b></div>
        <div class="kpi"><span>เงินสด (${d.cashBills} บิล)</span><b>฿${money(d.cashTotal)}</b></div>
        <div class="kpi"><span>โอน/QR (${d.qrBills} บิล)</span><b>฿${money(d.qrTotal)}</b></div>
      </div>
      ${d.discount > 0 ? `<div class="sub" style="margin-top:6px">ส่วนลดท้ายบิลรวม ฿${money(d.discount)}</div>` : ''}
      ${resvSectionHtml(d)}

      <h2>เงินสดแยกตามเครื่อง</h2>
      <table>
        <thead><tr><th>เครื่อง</th><th class="r">บิล</th><th class="r">ยอดขาย</th><th class="r">เงินสด</th><th class="r">โอน/QR</th><th class="r">รับเงินแล้ว</th><th class="r">ส่วนต่าง</th></tr></thead>
        <tbody>${d.devices.map(x => {
          const diff = x.received - x.cash;
          return `<tr><td class="b">${escapeHtml(x.code)}${x.staffSet && x.staffSet.size ? `<br><small>${escapeHtml([...x.staffSet].join(', '))}</small>` : ''}</td><td class="r">${x.bills}</td><td class="r">${money(x.total)}</td><td class="r">${money(x.cash)}</td><td class="r">${money(x.qr)}</td><td class="r">${money(x.received)}</td>
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
        <tr><td>เงินสดจากบิลขาย</td><td class="r b">฿${money(d.cashTotal)}</td></tr>
        ${d.rm && d.rm.finalCash ? `<tr><td>+ รับเงินคงค้างใบจอง (สด)</td><td class="r">฿${money(d.rm.finalCash)}</td></tr>` : ''}
        ${d.rm && d.rm.inCash ? `<tr><td>+ มัดจำสดของใบจองที่ส่งของ/ยกเลิกวันนี้ (ย้ายจากซองเข้ากล่อง)</td><td class="r">฿${money(d.rm.inCash)}</td></tr>` : ''}
        ${d.resvCash ? `<tr><td>รวมเงินสดนำส่งวันนี้</td><td class="r b">฿${money(d.cashTotal + d.resvCash)}</td></tr>` : ''}
        ${d.rm && d.rm.depositCash ? `<tr><td>มัดจำสดที่รับวันนี้ ฿${money(d.rm.depositCash)} — เก็บในซองมัดจำ <b>ไม่นำส่ง</b></td><td class="r"></td></tr>` : ''}
        ${d.rm && d.rm.held.length ? `<tr><td>ซองมัดจำคงเหลือหลังเคลียร์ (${d.rm.held.length} ใบรอรับ)</td><td class="r">฿${money(d.rm.heldCash)}</td></tr>` : ''}
        <tr><td>รับเงินจากเครื่องแล้ว</td><td class="r">฿${money(d.received)}</td></tr>
        <tr><td>ส่วนต่าง</td><td class="r ${Math.abs(outstanding) < 0.01 ? 'ok' : 'bad'}">${Math.abs(outstanding) < 0.01 ? 'ครบถ้วน' : (outstanding > 0 ? 'ค้างรับ ฿' : 'รับเกิน ฿') + money(Math.abs(outstanding))}</td></tr>
        <tr><td>เงินสดนำส่ง (นับจริง)</td><td class="r">฿ ......................</td></tr>
      </table>
      <div class="sign"><div>ผู้ส่งเงิน / ผู้สรุปยอด</div><div>ผู้รับเงิน</div></div>`);
  }

  function dailyReportText() {
    const d = reportData();
    let t = `📊 ยอดขายรายวัน ${shopName()}\n${dateTh()} (ณ ${timeTh()} น.)\n\n`;
    [...d.sold, ...d.resvRows].forEach((r, i) => {
      t += `${i + 1}. ${r.name}${r.note ? ` **${r.note}**` : ''}  ${r.price === 0 ? 'แถม' : fmtPrice(r.price)} × ${fmtQty(r.qty)} ${r.unit} = ${money(r.amount)}\n`;
      if (r.weights.length) t += `   ⚖️ ${r.weights.map(w => fmtQty(w)).join(', ')}\n`;
    });
    t += `\nรวมทั้งหมด ${money([...d.sold, ...d.resvRows].reduce((a, r) => a + r.amount, 0))}`;
    if (d.discount > 0) t += `\nส่วนลดท้ายบิล −${money(d.discount)}\nยอดขายสุทธิ ${money(d.total + d.resvSales)}`;
    if (d.resvSales) t += `\n(รวมใบจองที่ส่งของวันนี้ ฿${money(d.resvSales)} • ดึงมัดจำเข้ายอดแล้ว)`;
    t += resvText(d);
    if (d.pending) t += `\n⚠️ มี ${d.pending} บิลยังไม่ซิงค์`;
    return t;
  }
  function copyDailyReportText() { copyText(dailyReportText(), '📋 คัดลอกยอดขายรายวันแล้ว • วางในแชท LINE ได้เลย'); }

  function cashSummaryText() {
    const d = reportData();
    const outstanding = d.cashTotal - d.received;
    let t = `💵 สรุปเงินสดประจำวัน ${shopName()}\n${dateTh()} (ณ ${timeTh()} น.)\n\n`;
    t += `ยอดขายรวม ฿${money(d.total + d.resvSales)}${d.resvSales ? ` (รวมใบจองที่ส่งของ ฿${money(d.resvSales)})` : ''} • ${d.bills} บิล • ${d.units} ชิ้น\n`;
    t += `💵 เงินสด ฿${money(d.cashTotal)} (${d.cashBills} บิล)\n📱 โอน/QR ฿${money(d.qrTotal)} (${d.qrBills} บิล)\n`;
    if (d.discount > 0) t += `ส่วนลดท้ายบิล ฿${money(d.discount)}\n`;
    t += resvText(d);
    t += `\n— แยกเครื่อง —\n`;
    d.devices.forEach(x => {
      const diff = x.received - x.cash;
      t += `${x.code}${x.staffSet && x.staffSet.size ? ` (${[...x.staffSet].join(', ')})` : ''}: ${x.bills} บิล ฿${money(x.total)} (สด ${money(x.cash)} / QR ${money(x.qr)}) รับเงินแล้ว ${money(x.received)}${Math.abs(diff) < 0.01 ? ' ✓ครบ' : diff < 0 ? ` ❗ค้าง ${money(-diff)}` : ` เกิน ${money(diff)}`}\n`;
    });
    if (d.resvCash) t += `\nเงินสดใบจองนำส่ง ฿${money(d.resvCash)} (คงค้างสด + มัดจำของที่ส่งแล้ว)`;
    if (d.rm && d.rm.depositCash) t += `\nมัดจำสดรับวันนี้ ฿${money(d.rm.depositCash)} เก็บในซอง ไม่นำส่ง`;
    t += `\nเงินสดนำส่ง ฿${money(d.cashTotal + d.resvCash)}${Math.abs(outstanding) < 0.01 ? ' (รับครบแล้ว)' : outstanding > 0 ? ` (ยังค้างรับจากเครื่อง ฿${money(outstanding)})` : ` (รับเกิน ฿${money(-outstanding)})`}`;
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
  function stationUrl(name, staff) {
    return `${location.origin}${location.pathname}?cashier=${encodeURIComponent(name)}${staff ? `&staff=${encodeURIComponent(staff)}` : ''}`;
  }

  // =========================================================
  // หน้า "QR จุดขาย" : จุดขาย + ชื่อเจ้าหน้าที่ประจำวัน → สแกนด้วยมือถือของตัวเองได้เลย
  // =========================================================
  const QR_KEY = 'ea_qr_stations';
  const QR_DATE_KEY = 'ea_qr_stations_date';
  function qrStations() {
    let list = null;
    try { list = JSON.parse(lsGet(QR_KEY, 'null')); } catch (_) {}
    if (!Array.isArray(list) || !list.length) list = ['POS-02', 'POS-03', 'POS-04'].map(code => ({ code, name: '' }));
    return list.map(x => ({ code: String(x.code || '').trim().slice(0, 20), name: String(x.name || '').trim().slice(0, 30) })).filter(x => x.code);
  }
  function saveQrStations(list) { lsSet(QR_KEY, JSON.stringify(list)); lsSet(QR_DATE_KEY, todayStr()); }
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function rerenderQr(focusId) {
    const pos = document.getElementById(focusId)?.selectionStart;
    renderQrStations();
    const n = focusId && document.getElementById(focusId);
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
  }
  let qrTimer = null;
  function qrStationEdit(i, field, value) {
    const list = qrStations();
    if (!list[i]) return;
    list[i][field] = String(value || '').replace(/[,&?#]/g, ' ').slice(0, field === 'code' ? 20 : 30);
    saveQrStations(list);
    clearTimeout(qrTimer);
    qrTimer = setTimeout(() => rerenderQr(`qrs-${field}-${i}`), 400);  // อัปเดต QR หลังพิมพ์เสร็จ
  }
  function qrStationAdd() {
    const list = qrStations();
    const nums = list.map(x => Number((/(\d+)$/.exec(x.code) || [])[1]) || 0);
    list.push({ code: `POS-${String(Math.max(1, ...nums) + 1).padStart(2, '0')}`, name: '' });
    saveQrStations(list.slice(0, 12)); renderQrStations();
  }
  function qrStationRemove(i) {
    const list = qrStations(); list.splice(i, 1);
    saveQrStations(list.length ? list : [{ code: 'POS-02', name: '' }]); renderQrStations();
  }
  function qrStationsClearNames() {
    if (!window.confirm('ล้างชื่อเจ้าหน้าที่ทุกจุด (เริ่มวันใหม่)?')) return;
    saveQrStations(qrStations().map(x => ({ ...x, name: '' }))); renderQrStations();
  }
  function qrStationsFullscreen(on) {
    document.body.classList.toggle('qr-fs', !!on);
    const de = document.documentElement;
    try {
      if (on && !document.fullscreenElement) de.requestFullscreen?.()?.catch?.(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    } catch (_) {}
  }
  function renderQrStations() {
    if (typeof setHeader === 'function') setHeader('QR จุดขาย', 'เจ้าหน้าที่สแกนด้วยมือถือของตัวเอง → เข้าหน้าคิดเงินของจุดนั้นทันที');
    const list = qrStations();
    const local = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    const stale = lsGet(QR_DATE_KEY, '') && lsGet(QR_DATE_KEY, '') !== todayStr() && list.some(x => x.name);
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
      <div class="qrs-page">
        <div class="qrs-editor">
          <div class="qrs-editor-head">
            <h3>จุดขาย & เจ้าหน้าที่วันนี้</h3>
            <div class="qrs-actions">
              <button type="button" class="qrs-btn" onclick="qrStationsClearNames()">ล้างชื่อ (วันใหม่)</button>
              <button type="button" class="qrs-btn" onclick="qrStationsPrint()">🖨️ พิมพ์</button>
            </div>
          </div>
          ${stale ? '<div class="qrs-warn">ชื่อเจ้าหน้าที่เป็นของวันก่อน • แก้ชื่อให้ตรงคนที่มาวันนี้</div>' : ''}
          ${local ? '<div class="qrs-warn">ตอนนี้เปิดแอปจากที่อยู่ในเครื่อง (' + escapeHtml(location.host) + ') มือถือคนอื่นจะเปิดลิงก์ใน QR ไม่ได้ • ให้เปิดหน้านี้จากเว็บจริงของร้าน (ที่ deploy ไว้) แล้ว QR จะใช้ได้</div>' : ''}
          <div class="qrs-rows">
            ${list.map((x, i) => `
              <div class="qrs-row">
                <span class="qrs-no">QR${i + 1}</span>
                <input id="qrs-code-${i}" class="qrs-in qrs-code" value="${escapeHtml(x.code)}" placeholder="POS-02" oninput="qrStationEdit(${i},'code',this.value)" aria-label="ชื่อจุดขาย">
                <input id="qrs-name-${i}" class="qrs-in" value="${escapeHtml(x.name)}" placeholder="ชื่อเจ้าหน้าที่ (ไม่ใส่ก็ได้)" oninput="qrStationEdit(${i},'name',this.value)" aria-label="ชื่อเจ้าหน้าที่">
                <button type="button" class="qrs-del" onclick="qrStationRemove(${i})" aria-label="ลบ">✕</button>
              </div>`).join('')}
          </div>
          <button type="button" class="qrs-btn" onclick="qrStationAdd()">＋ เพิ่มจุดขาย</button>
        </div>

        <div class="qrs-tip">แตะที่ QR เพื่อขยายใหญ่ให้เจ้าหน้าที่สแกนได้ง่าย</div>
        <div class="qrs-grid">
          ${list.map((x, i) => `
            <button type="button" class="qrs-card" onclick="qrStationZoom(${i})" aria-label="ขยาย QR ${escapeHtml(x.code)}">
              <div class="qrs-card-no">QR${i + 1}</div>
              <div class="qrs-qr">${qrSvg(stationUrl(x.code, x.name), 6)}</div>
              <div class="qrs-code-big">${escapeHtml(x.code)}</div>
              <div class="qrs-name-big ${x.name ? '' : 'is-empty'}">${x.name ? escapeHtml(x.name) : 'ยังไม่ระบุชื่อ'}</div>
            </button>`).join('')}
        </div>
      </div>`;
  }
  // แตะ QR → ป๊อปอัปใหญ่เกือบเต็มจอ (แตะที่ไหนก็ได้เพื่อปิด / ปุ่มเลื่อนไปจุดถัดไป)
  function qrStationZoom(i) {
    const list = qrStations();
    if (!list.length) return;
    i = ((i % list.length) + list.length) % list.length;
    const x = list[i];
    let dlg = document.getElementById('qrZoomDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'qrZoomDialog';
      dlg.className = 'qrz-dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (!e.target.closest('.qrz-nav')) dlg.close(); });
    }
    dlg.innerHTML = `
      <div class="qrz-head"><span>QR${i + 1}</span><strong>${escapeHtml(x.code)}</strong>${x.name ? `<em>${escapeHtml(x.name)}</em>` : ''}</div>
      <div class="qrz-qr">${qrSvg(stationUrl(x.code, x.name), 10)}</div>
      <div class="qrz-foot">สแกนด้วยกล้องมือถือ เพื่อเริ่มคิดเงิน • แตะที่ว่างเพื่อปิด</div>
      ${list.length > 1 ? `
        <button type="button" class="qrz-nav prev" onclick="qrStationZoom(${i - 1})" aria-label="ก่อนหน้า">‹</button>
        <button type="button" class="qrz-nav next" onclick="qrStationZoom(${i + 1})" aria-label="ถัดไป">›</button>` : ''}`;
    if (!dlg.open) dlg.showModal();
  }
  function qrStationsPrint() {
    printHtml('QR จุดขาย', `
      <h1>QR จุดขาย – ${escapeHtml(shopName())}</h1>
      <div class="sub">${escapeHtml(dateTh())} • สแกนด้วยกล้องมือถือ → เข้าหน้าคิดเงินของจุดนั้นทันที</div>
      <div class="qrs">${qrStations().map((x, i) => `<div class="qrc">${qrSvg(stationUrl(x.code, x.name), 8)}<h3>QR${i + 1} = ${escapeHtml(x.code)}</h3><div style="font-size:15pt;font-weight:800">${x.name ? escapeHtml(x.name) : '&nbsp;'}</div></div>`).join('')}</div>`, { fit: false });
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
  function toggleHubQr() { if (typeof go === 'function') go('qrStations'); }
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
    openRestockImage,
    shareRestockImage,
    downloadRestockImage,
    copyRestockImage,
    onRestockNoteInput,
    hubRestockImageCanvas: () => drawRestockImage(restockList()),
    printDailyReport,
    copyDailyReportText,
    printCashSummary,
    copyCashSummaryText,
    hubCashSummaryText: cashSummaryText,
    toggleHubQr,
    renderQrStations,
    qrStationEdit,
    qrStationAdd,
    qrStationRemove,
    qrStationsClearNames,
    qrStationsFullscreen,
    qrStationZoom,
    qrStationsPrint,
    hubSetStations,
    printStationQr,
    hubDailyReportText: dailyReportText,
    hubForecast: forecast
  });
})();
