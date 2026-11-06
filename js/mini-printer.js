/**
 * EA Fair Sale - พิมพ์ใบเสร็จ / ใบจอง ด้วยเครื่องพิมพ์ความร้อนขนาดเล็ก (เช่น PeriPage A6)
 *
 * เครื่องพวกนี้พิมพ์ผ่านแอปของยี่ห้อเอง (บลูทูธ) → แอปเราสร้าง "รูปใบเสร็จ" กว้าง 384 จุด
 * (= หน้ากว้างพิมพ์ 48 มม. ของกระดาษ 57/58 มม. ที่ 203 dpi) ขาวดำ ตัวหนังสือใหญ่ชัด
 * แล้ว "แชร์" ไปที่แอป PeriPage ให้พิมพ์ (Android / iPad / iPhone)
 * อุปกรณ์ที่แชร์ไม่ได้ (เช่นคอมพิวเตอร์) → บันทึกรูปแล้วเปิดในแอปเอง
 */
(function () {
  const W = 384, PAD = 10;
  const st = () => window.getEaAppState?.();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const qtyTxt = n => { const v = Number(n || 0); return Number.isInteger(v) ? String(v) : v.toLocaleString('th-TH', { maximumFractionDigits: 3 }); };
  const isQr = pm => ['promptpay', 'qr', 'transfer'].includes(String(pm || '').toLowerCase());
  // ข้อความแจ้ง: ถ้ามีหน้าต่างซ้อนอยู่ (toast จะถูกบังมองไม่เห็น) → แสดงเป็นกล่องเตือนแทน
  const toast = (m, ms) => {
    if (document.querySelector('dialog[open]') && !document.getElementById('miniPrintDialog')?.open) { try { window.alert(m); } catch (_) {} return; }
    return typeof window.toast === 'function' ? window.toast(m, ms) : console.log(m);
  };
  // รอฟอนต์ไม่เกิน 1.5 วินาที (เน็ตงานแฟร์ช้า โหลดฟอนต์ไม่เสร็จ → เดิมกดแล้วเงียบ)
  const fontsReady = () => Promise.race([Promise.resolve(document.fonts?.ready).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
  let busy = false;
  async function run(fn) {
    if (busy) return; busy = true;
    const btns = [...document.querySelectorAll('.mini-print-btn, .ps-done-print, [onclick^="eaMiniPrint"]')];
    btns.forEach(b => { b.dataset.t = b.textContent; b.textContent = 'กำลังสร้างรูป...'; b.disabled = true; });
    try { await fn(); }
    catch (e) { console.error('[mini-printer]', e); try { window.alert(`สร้างรูปใบเสร็จไม่สำเร็จ: ${e?.message || e}`); } catch (_) {} }
    finally { busy = false; btns.forEach(b => { if (b.dataset.t) b.textContent = b.dataset.t; b.disabled = false; }); }
  }
  const font = () => (window.getAppFontStack?.() || '"Sarabun","Noto Sans Thai",sans-serif');

  // ---------- ตัววาดแบบเรียงบรรทัด (กว้างคงที่ สูงตามเนื้อหา) ----------
  function makeDoc() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = 6000;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, cv.height);
    ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
    let y = 14;
    const setFont = (size, bold) => { ctx.font = `${bold ? 800 : 500} ${size}px ${font()}`; };
    const wrap = (text, maxW) => {
      const out = []; let cur = '';
      for (const ch of Array.from(String(text || ''))) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur.trimEnd()); cur = ch === ' ' ? '' : ch; } else cur += ch; }
      if (cur) out.push(cur); return out.length ? out : [''];
    };
    const api = {
      text(t, o = {}) {
        const size = o.size || 22; setFont(size, o.bold);
        const lines = wrap(t, W - PAD * 2);
        for (const ln of lines) {
          y += Math.round(size * 1.18);
          ctx.textAlign = o.align || 'left';
          ctx.fillText(ln, o.align === 'center' ? W / 2 : o.align === 'right' ? W - PAD : PAD, y);
        }
        ctx.textAlign = 'left'; y += o.after ?? 4;
      },
      row(l, r, o = {}) {
        const size = o.size || 22; setFont(size, o.bold);
        const rw = ctx.measureText(r).width;
        const lines = wrap(l, W - PAD * 2 - rw - 10);
        lines.forEach((ln, i) => {
          y += Math.round(size * 1.18);
          ctx.fillText(ln, PAD, y);
          if (i === 0) { ctx.textAlign = 'right'; ctx.fillText(r, W - PAD, y); ctx.textAlign = 'left'; }
        });
        y += o.after ?? 4;
      },
      hr(dashed = true) {
        y += 8; ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); ctx.restore(); y += 8;
      },
      box(t, o = {}) {   // แถบดำ ตัวหนังสือขาว (เด่นบนกระดาษความร้อน)
        const size = o.size || 26; setFont(size, true);
        const h = Math.round(size * 1.6);
        y += 6; ctx.fillRect(PAD, y, W - PAD * 2, h);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(t, W / 2, y + Math.round(h * 0.7));
        ctx.fillStyle = '#000'; ctx.textAlign = 'left'; y += h + 6;
      },
      qr(text, size = 240) {
        if (typeof window.qrcode !== 'function') return false;
        const q = window.qrcode(0, 'M'); q.addData(text); q.make();
        const n = q.getModuleCount(); const cell = Math.floor(size / n); const s = cell * n;
        const x0 = Math.round((W - s) / 2); y += 10;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x0 + c * cell, y + r * cell, cell, cell);
        y += s + 6; return true;
      },
      barcode(text, h = 90) {
        y += 12;
        const ok = window.eaDrawReservationBarcode?.(ctx, text, 0, y, W, h);
        ctx.fillStyle = '#000';
        if (ok) y += h + 4;
        return !!ok;
      },
      space(h = 10) { y += h; },
      finish() {
        y += 40;   // เผื่อขอบตัดกระดาษ
        const out = document.createElement('canvas'); out.width = W; out.height = y;
        out.getContext('2d').drawImage(cv, 0, 0); return out;
      }
    };
    return api;
  }

  function shopHeader(d) {
    const s = st()?.settings || {};
    d.text('เอิร์นนี่ แอดวานซ์', { size: 32, bold: true, align: 'center', after: 2 });   // หัวกระดาษ
    if (s.shopBranch) d.text(s.shopBranch, { size: 20, align: 'center', after: 0 });
    if (s.shopAddress) d.text(s.shopAddress, { size: 18, align: 'center', after: 0 });
    const contact = [s.shopPhone ? `โทร ${s.shopPhone}` : '', s.shopLine ? `LINE ${s.shopLine}` : ''].filter(Boolean).join('  ');
    if (contact) d.text(contact, { size: 18, align: 'center', after: 0 });
    if (s.shopTaxId) d.text(`เลขผู้เสียภาษี ${s.shopTaxId}`, { size: 18, align: 'center', after: 0 });
  }
  function nowTxt(ts) {
    const d = ts ? new Date(ts) : new Date();
    return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // ---------- ใบเสร็จขาย ----------
  function drawBill(bill) {
    const d = makeDoc();
    shopHeader(d);
    d.box('ใบเสร็จรับเงิน', { size: 24 });
    d.row(`บิล ${bill.saleNo || ''}`, nowTxt(bill.createdAt || bill.created_at), { size: 20 });
    const staff = window.getStaffName?.() || '';
    d.text(`จุดขาย ${st()?.terminal || ''}${staff ? ` • ${staff}` : ''}`, { size: 20, after: 0 });
    d.hr();
    (bill.items || []).forEach(i => {
      const unit = i.unit || 'ชิ้น'; const up = Number(i.unit_price || 0);
      d.text(i.name, { size: 23, bold: true, after: 0 });
      const orig = Number(i.original_price || up);
      d.row(`  ${qtyTxt(i.qty)} ${unit} × ${up === 0 ? 'แถม' : money(up)}${orig > up && up > 0 ? ` (ปกติ ${money(orig)})` : ''}`, money(up * Number(i.qty || 0)), { size: 21, after: 6 });
    });
    d.hr();
    const sub = Number(bill.subtotal || bill.itemsTotal || bill.total || 0);
    const itemDisc = Number(bill.itemsDiscount || 0), billDisc = Number(bill.billDiscount || 0);
    if (itemDisc > 0 || billDisc > 0) {
      d.row('รวมเป็นเงิน', money(sub), { size: 22 });
      if (itemDisc > 0) d.row('ส่วนลดรายการ', `-${money(itemDisc)}`, { size: 22 });
      if (billDisc > 0) d.row(`ส่วนลด${bill.billDiscountDetail?.note ? ` (${bill.billDiscountDetail.note})` : 'ท้ายบิล'}`, `-${money(billDisc)}`, { size: 22 });
    }
    d.row('ยอดสุทธิ', `฿${money(bill.total)}`, { size: 32, bold: true, after: 6 });
    if (bill.paymentMethod === 'cash' || !isQr(bill.paymentMethod)) {
      if (Number(bill.received) > 0) {
        d.row('รับเงินสด', money(bill.received), { size: 22 });
        d.row('เงินทอน', money(bill.change), { size: 24, bold: true });
      } else d.text('ชำระด้วยเงินสด', { size: 22 });
    } else d.text('ชำระด้วยการโอน / QR', { size: 22 });
    d.hr();
    const foot = st()?.settings?.receiptFooterNote;
    if (foot) d.text(foot, { size: 20, align: 'center' });
    d.text('ขอบคุณที่อุดหนุนค่ะ', { size: 24, bold: true, align: 'center' });
    return d.finish();
  }

  // ---------- ใบรับมัดจำ / ใบจอง (QR ตรงกลาง) ----------
  function drawReservation(r) {
    const d = makeDoc();
    const items = Array.isArray(r.items) ? r.items : [];
    const lineSum = items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.unit_price || 0), 0);
    const deal = Math.abs(lineSum - Number(r.total_amount || 0)) > 0.009;
    const remain = Math.max(0, Number(r.total_amount || 0) - Number(r.deposit_amount || 0));
    shopHeader(d);
    d.box(r.status === 'booked' ? 'ใบรับมัดจำ / ใบสั่งจอง' : 'ใบสั่งจอง', { size: 24 });
    d.row(`เลขที่ ${r.res_no}`, nowTxt(r.created_at), { size: 20 });
    d.text(`ลูกค้า: ${r.customer_name}`, { size: 25, bold: true, after: 0 });
    if (r.customer_phone) d.text(`โทร ${r.customer_phone}`, { size: 21, after: 0 });
    d.hr();
    items.forEach(i => {
      d.text(i.name, { size: 23, bold: true, after: 0 });
      const up = Number(i.unit_price || 0);
      d.row(`  ${qtyTxt(i.qty)} ${i.unit || ''}${up > 0 ? ` × ${money(up)}` : ''}`, up > 0 ? money(up * Number(i.qty || 0)) : '', { size: 21, after: 6 });
    });
    d.hr();
    if (deal && lineSum > 0) d.row('รวมตามรายการ', money(lineSum), { size: 21 });
    d.row(deal ? 'ราคาตกลง' : 'ยอดเต็ม', money(r.total_amount), { size: 24, bold: true });
    d.row(`มัดจำแล้ว (${isQr(r.deposit_method) ? 'โอน' : 'เงินสด'})`, money(r.deposit_amount), { size: 22 });
    if (Number(r.final_amount) > 0) d.row('รับเงินคงค้างแล้ว', money(r.final_amount), { size: 22 });
    if (r.status === 'booked') d.row('ต้องชำระอีก', `฿${money(remain)}`, { size: 28, bold: true, after: 6 });
    else if (r.status === 'picked_up') d.text('✓ ชำระครบ / รับของแล้ว', { size: 24, bold: true });
    else d.text('ยกเลิกแล้ว', { size: 24, bold: true });
    const pd = new Date(String(r.pickup_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
    d.box(`นัดรับ ${pd} • ${r.pickup_place === 'shop' ? 'ร้าน/โกดัง' : 'ที่บูธ'}`, { size: 22 });
    if (r.note) d.text(`หมายเหตุ: ${r.note}`, { size: 20 });
    d.barcode(window.eaReservationBarcode?.(r) || String(r.res_no).replace(/-/g, ''), 100);
    d.text(r.res_no, { size: 22, bold: true, align: 'center', after: 0 });
    d.text('แสดงบาร์โค้ดนี้เมื่อมารับสินค้า', { size: 21, align: 'center' });
    return d.finish();
  }

  // ---------- หน้าตัวอย่าง + ส่งไปแอปเครื่องพิมพ์ ----------
  let cur = null;
  async function preview(cv, name, title) {
    // JPEG พื้นขาวทึบ + ชื่อไฟล์ภาษาอังกฤษ (แอป PeriPage นำเข้า PNG/ชื่อไทยแล้วขึ้นหน้าว่าง)
    const flat = document.createElement('canvas'); flat.width = cv.width; flat.height = cv.height;
    const fx = flat.getContext('2d'); fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, flat.width, flat.height); fx.drawImage(cv, 0, 0);
    // ทำเป็นขาว-ดำล้วน (เครื่องพิมพ์ความร้อนพิมพ์สีเทาอ่อนไม่ออก)
    try {
      const im = fx.getImageData(0, 0, flat.width, flat.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) < 170 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      fx.putImageData(im, 0, 0);
    } catch (_) {}
    const blob = await new Promise(res => flat.toBlob(res, 'image/jpeg', 0.95));
    if (cur?.url) URL.revokeObjectURL(cur.url);
    const file = new File([blob], `${String(name).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'receipt'}.jpg`, { type: 'image/jpeg' });
    cur = { blob, file, url: URL.createObjectURL(blob) };
    let dlg = document.getElementById('miniPrintDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'miniPrintDialog'; dlg.className = 'restock-img-dialog mini-print-dialog'; document.body.appendChild(dlg); }
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    dlg.innerHTML = `
      <div class="rid-head"><strong>🖨️ ${esc(title)}</strong>
        <button type="button" class="rid-close" onclick="document.getElementById('miniPrintDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rid-body mini-print-body"><img src="${cur.url}" alt="${esc(title)}"></div>
      <div class="rid-actions">
        ${canShare ? '<button type="button" class="rid-btn rid-primary" onclick="eaMiniPrintShare()">🖨️ ส่งไปแอป PeriPage</button>' : ''}
        <button type="button" class="rid-btn ${canShare ? '' : 'rid-primary'}" onclick="eaMiniPrintSave()">💾 บันทึกรูป</button>
      </div>
      <div class="rid-hint">${canShare
        ? 'กด "ส่งไปแอป PeriPage" → เลือกแอป PeriPage → กดพิมพ์ • ใช้กระดาษม้วนต่อเนื่อง 57 มม. (สติ๊กเกอร์ 57×30 บิลยาวจะพิมพ์ข้ามดวง)'
        : 'เครื่องนี้ส่งรูปไปแอปโดยตรงไม่ได้ • บันทึกรูปแล้วเปิดในแอป PeriPage เพื่อพิมพ์ (แนะนำใช้จากแท็บเล็ต/มือถือ)'}</div>`;
    if (!dlg.open) dlg.showModal();
  }
  async function share() {
    if (!cur) return;
    try { await navigator.share({ files: [cur.file] }); }
    catch (e) { if (e?.name !== 'AbortError') { toast('ส่งไม่สำเร็จ — บันทึกรูปแล้วเปิดในแอป PeriPage แทน'); save(); } }
  }
  function save() {
    if (!cur) return;
    const a = document.createElement('a'); a.href = cur.url; a.download = cur.file.name;
    document.body.appendChild(a); a.click(); a.remove(); toast('💾 บันทึกรูปแล้ว • เปิดแอป PeriPage แล้วเลือกรูปนี้เพื่อพิมพ์', 4000);
  }

  function printBill(bill) { return run(() => printBillInner(bill)); }
  function printReservation(id) { return run(() => printReservationInner(id)); }
  async function printBillInner(bill) {
    bill = (bill && bill.items) ? bill : st()?.lastBill;
    if (!bill) { toast('ยังไม่มีบิลล่าสุด'); return; }
    await fontsReady();
    await preview(drawBill(bill), `receipt-${bill.saleNo || Date.now()}`, `ใบเสร็จ ${bill.saleNo || ''}`);
  }
  async function printReservationInner(id) {
    const r = (window.eaReservations?.() || []).find(x => x.id === id);
    if (!r) { toast('ไม่พบใบจอง'); return; }
    await fontsReady();
    await preview(drawReservation(r), `booking-${r.res_no}`, `ใบจอง ${r.res_no}`);
  }

  // ปุ่มในหน้าต่าง "ขายสินค้าสำเร็จ"
  function addReceiptButton() {
    const row = document.querySelector('#receiptDialog .receipt-action-row');
    if (!row || row.querySelector('.mini-print-btn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-secondary mini-print-btn';
    b.textContent = '🧾 พิมพ์เครื่องเล็ก';
    b.onclick = () => printBill();
    b.setAttribute('data-mini', '1');
    row.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addReceiptButton); else addReceiptButton();

  Object.assign(window, {
    eaMiniPrintBill: printBill, eaMiniPrintReservation: printReservation,
    eaMiniPrintShare: share, eaMiniPrintSave: save,
    eaDrawThermalBill: drawBill, eaDrawThermalReservation: drawReservation
  });
})();
