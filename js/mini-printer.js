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
      // ลายปิดท้าย ★ ★ ★ ★ ★ (วาดเป็นรูปดาว ไม่ต้องพึ่งฟอนต์)
      ornament() {
        y += 22;
        const n = 5, R = 11, r = 4.6, gap = 36, cx0 = W / 2 - gap * (n - 1) / 2;
        ctx.save(); ctx.fillStyle = '#000';
        for (let k = 0; k < n; k++) {
          const cx = cx0 + k * gap;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
            const px = cx + rr * Math.cos(a), py = y + rr * Math.sin(a);
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        y += 14;
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
    // ท้ายบิล: ขอบคุณ + ดาว 5 ดวง
    d.space(4);
    d.text('ขอบคุณที่อุดหนุนค่ะ', { size: 26, bold: true, align: 'center', after: 0 });
    d.ornament();
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
  // =========================================================
  // พิมพ์ตรงผ่านบลูทูธ (Web Bluetooth • Chrome บน Android/Windows)
  // โปรโตคอล PeriPage A6: ความเข้ม 10ff1000nn • รีเซ็ต 10fffe01+00×12 • ภาพ 1d763000 xL xH yL yH + แถวละ 48 ไบต์ • ป้อนกระดาษ 1b4a nn
  // =========================================================
  const U16 = x => `0000${x}-0000-1000-8000-00805f9b34fb`;
  const BLE_SERVICES = [U16('ff00'), U16('18f0'), U16('ae30'), U16('fff0'), U16('ffe0'), U16('fee7'),
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455', '6e400001-b5a3-f393-e0a9-e50e24dcca9e'];
  const BLE_WRITE = [U16('ff02'), U16('2af1'), U16('ae01'), U16('fff2'), U16('fff1'), U16('ffe1'),
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', '49535343-8841-43f4-a8d4-ecbe34729bb3', '6e400002-b5a3-f393-e0a9-e50e24dcca9e'];
  const GENERIC = [U16('1800'), U16('1801'), U16('180a'), U16('180f')];
  const BT_KEY = 'ea_bt_printer';
  // ใช้เครื่องพิมพ์ร่วมกันหลายมือถือ: พิมพ์เสร็จแล้วตัดบลูทูธ ให้เครื่องอื่นต่อได้ (ค่าเริ่มต้น = เปิด)
  const RELEASE_KEY = 'ea_bt_release';
  // ความเข้มการพิมพ์ (พิมพ์ตรงบลูทูธ): สติ๊กเกอร์แท่งบาร์โค้ดลาม/ตัน → "จาง" • ซีด ขาด → "เข้ม"
  const DENS_KEY = 'ea_print_density';
  const density = () => { try { const v = localStorage.getItem(DENS_KEY); return ['0', '1', '2'].includes(v) ? v : '1'; } catch (_) { return '1'; } };
  function setDensity(v, btn) {
    try { localStorage.setItem(DENS_KEY, String(v)); } catch (_) {}
    btn?.parentNode?.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === btn));
  }
  const releaseOn = () => { try { return localStorage.getItem(RELEASE_KEY) !== '0'; } catch (_) { return true; } };
  const bt = { device: null, ch: null, busy: false, svc: '', chr: '', listen: null, releaseTimer: null };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const hasBle = () => !!navigator.bluetooth;
  const btName = () => bt.device?.name || (() => { try { return JSON.parse(localStorage.getItem(BT_KEY) || '{}').name || ''; } catch (_) { return ''; } })();
  const btConnected = () => !!(bt.device?.gatt?.connected && bt.ch);

  async function gattSetup(dev) {
    const server = await dev.gatt.connect();
    // เคยต่อเครื่องนี้แล้ว → ไปที่ช่องพิมพ์เดิมเลย (เร็วกว่าไล่หาใหม่ทุกครั้ง)
    if (bt.device === dev && bt.svc && bt.chr) {
      try {
        bt.ch = await (await server.getPrimaryService(bt.svc)).getCharacteristic(bt.chr);
        return;
      } catch (_) { /* หาไม่เจอ → ไล่หาใหม่ด้านล่าง */ }
    }
    const svcs = await server.getPrimaryServices();
    const list = [];
    for (const sv of svcs) {
      let cs = []; try { cs = await sv.getCharacteristics(); } catch (_) { continue; }
      for (const c of cs) if (c.properties.write || c.properties.writeWithoutResponse) list.push({ c, svc: sv.uuid });
    }
    if (!list.length) throw new Error('เครื่องพิมพ์นี้ไม่รองรับการพิมพ์ตรงจากแอป (บลูทูธแบบเก่า) • ใช้วิธีบันทึกรูปแทน');
    const score = x => { const i = BLE_WRITE.indexOf(x.c.uuid); let n = i >= 0 ? 100 - i : 0; if (BLE_SERVICES.includes(x.svc)) n += 50; if (GENERIC.includes(x.svc)) n -= 200; if (x.c.properties.writeWithoutResponse) n += 5; return n; };
    list.sort((a, b) => score(b) - score(a));
    if (bt.device && bt.device !== dev && bt.listen) { try { bt.device.removeEventListener('gattserverdisconnected', bt.listen); } catch (_) {} bt.listen = null; }
    bt.device = dev; bt.ch = list[0].c; bt.svc = list[0].svc; bt.chr = list[0].c.uuid;
    if (!bt.listen) { bt.listen = () => { bt.ch = null; }; dev.addEventListener('gattserverdisconnected', bt.listen); }
    try { localStorage.setItem(BT_KEY, JSON.stringify({ id: dev.id, name: dev.name || '' })); } catch (_) {}
  }
  // เชื่อมต่ออัตโนมัติกับเครื่องที่เคยจับคู่ (ไม่ต้องเลือกใหม่ทุกครั้ง)
  async function btReconnect(onWait) {
    clearTimeout(bt.releaseTimer);
    if (btConnected()) return true;
    if (bt.device) {
      // เครื่องพิมพ์ต่อได้ทีละเครื่อง: มือถืออื่นกำลังพิมพ์อยู่ → รอแล้วลองใหม่ (รวม ~12 วินาที)
      for (let i = 0; i < 5; i++) {
        try { await gattSetup(bt.device); return true; }
        catch (_) { if (i < 4) { onWait?.(i + 1); await sleep(1500 + i * 500); } }
      }
      return false;
    }
    try {
      if (!navigator.bluetooth?.getDevices) return false;
      const saved = JSON.parse(localStorage.getItem(BT_KEY) || '{}');
      if (!saved.id) return false;
      const dev = (await navigator.bluetooth.getDevices()).find(d => d.id === saved.id);
      if (!dev) return false;
      await gattSetup(dev); return true;
    } catch (_) { return false; }
  }
  async function btChoose() {
    if (!hasBle()) throw new Error('เบราว์เซอร์นี้พิมพ์ผ่านบลูทูธไม่ได้ • ใช้ Chrome บน Android (เปิดบลูทูธ + ตำแหน่ง)');
    const dev = await navigator.bluetooth.requestDevice({
      filters: ['PeriPage', 'Peripage', 'PERIPAGE', 'PPG', 'A6', 'PP'].map(namePrefix => ({ namePrefix })),
      optionalServices: BLE_SERVICES
    });
    await gattSetup(dev);
  }
  async function btWrite(bytes) {
    const size = 100, delay = 12, noRsp = bt.ch.properties.writeWithoutResponse;
    for (let i = 0; i < bytes.length; i += size) {
      const part = bytes.subarray(i, Math.min(i + size, bytes.length));
      let tries = 0;
      for (;;) {
        try {
          if (noRsp && bt.ch.writeValueWithoutResponse) await bt.ch.writeValueWithoutResponse(part);
          else if (bt.ch.writeValueWithResponse) await bt.ch.writeValueWithResponse(part);
          else await bt.ch.writeValue(part);
          break;
        } catch (e) { if (++tries > 3) throw e; await sleep(120); }
      }
      await sleep(delay);
    }
  }
  const hexb = h => new Uint8Array(h.match(/../g).map(b => parseInt(b, 16)));
  async function btPrintCanvas(cv) {
    const w = cv.width, h = cv.height, bpr = Math.ceil(w / 8);
    const px = cv.getContext('2d').getImageData(0, 0, w, h).data;
    const data = new Uint8Array(bpr * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114 < 128) data[y * bpr + (x >> 3)] |= 0x80 >> (x & 7);
    }
    await btWrite(hexb('10ff10000' + density()));      // ความเข้ม 0 จาง / 1 ปกติ / 2 เข้ม
    await sleep(30);
    for (let y = 0; y < h; y += 255) {
      const rows = Math.min(255, h - y);
      await btWrite(hexb('10fffe01000000000000000000000000'));
      await sleep(20);
      await btWrite(new Uint8Array([0x1d, 0x76, 0x30, 0x00, bpr & 0xff, bpr >> 8, rows & 0xff, rows >> 8]));
      await btWrite(data.subarray(y * bpr, (y + rows) * bpr));
    }
    await btWrite(new Uint8Array([0x1b, 0x4a, 80]));   // ป้อนกระดาษเผื่อฉีก
  }
  // ตัดการเชื่อมต่อ → เครื่องพิมพ์ว่าง ให้มือถือเครื่องอื่นต่อได้ (จำเครื่องไว้ ครั้งหน้ากดพิมพ์ได้เลย)
  function btRelease(manual) {
    clearTimeout(bt.releaseTimer);
    const was = btConnected();
    try { if (bt.device?.gatt?.connected) bt.device.gatt.disconnect(); } catch (_) {}
    bt.ch = null;
    refreshBtUi();
    if (manual) toast(was ? `ปล่อยเครื่องพิมพ์แล้ว${btName() ? ` (${btName()})` : ''} • มือถือเครื่องอื่นต่อได้` : 'ตอนนี้ไม่ได้ต่อเครื่องพิมพ์อยู่', 3000);
  }
  function refreshBtUi() {
    const st = document.getElementById('mpBtState');
    if (st) st.textContent = btConnected() ? `🟢 ต่ออยู่กับ ${btName() || 'เครื่องพิมพ์'}` : (btName() ? `⚪ ว่าง • ${btName()}` : '');
  }
  function setRelease(on) {
    try { localStorage.setItem(RELEASE_KEY, on ? '1' : '0'); } catch (_) {}
    if (on && btConnected() && !bt.busy) btRelease(false);
    refreshBtUi();
  }
  // พิมพ์ตรง: เชื่อมเครื่องเดิมอัตโนมัติ • ยังไม่เคยเลือก → ให้เลือกเครื่อง
  async function btPrint(cv, choose) {
    if (bt.busy) return;
    bt.busy = true;
    const btn = document.getElementById('mpBtPrint');
    const setBtn = t => { if (btn) btn.textContent = t; };
    try {
      let saved = {}; try { saved = JSON.parse(localStorage.getItem(BT_KEY) || '{}'); } catch (_) {}
      // เบราว์เซอร์ที่จำเครื่องข้ามการเปิดแอปไม่ได้ (getDevices) → เลือกเครื่องตอนแตะเลย ไม่ต้องแตะ 2 รอบ
      if (choose || bt.nextChoose || (!bt.device && !(saved.id && navigator.bluetooth?.getDevices))) {
        bt.nextChoose = false;
        await btChoose();                       // ต้องเรียกทันทีจากการแตะ (ข้อกำหนดของเบราว์เซอร์)
      } else {
        setBtn('กำลังเชื่อมต่อ...');
        if (!(await btReconnect(n => setBtn(`⏳ เครื่องพิมพ์ไม่ว่าง รอคิว... (${n})`)))) {
          if (!bt.device) bt.nextChoose = true;
          toast(bt.device
            ? 'ต่อเครื่องพิมพ์ไม่ได้ • มือถือเครื่องอื่นอาจต่อค้างอยู่ (ให้เครื่องนั้นกด "ปล่อยเครื่องพิมพ์") หรือเครื่องพิมพ์ปิด/ไกลเกิน แล้วแตะพิมพ์อีกครั้ง'
            : 'เชื่อมเครื่องเดิมไม่ได้ • แตะ "พิมพ์ตรง" อีกครั้งเพื่อเลือกเครื่อง', 6000);
          return;
        }
      }
      setBtn('กำลังพิมพ์...');
      await btPrintCanvas(cv);
      toast(`✅ ส่งพิมพ์แล้ว (${btName() || 'เครื่องพิมพ์'})${releaseOn() ? ' • ปล่อยเครื่องพิมพ์ให้เครื่องอื่นแล้ว' : ''}`, 2500);
      // รอให้ข้อมูลถึงเครื่องพิมพ์ครบก่อนตัดการเชื่อมต่อ (ตัดเร็วไป บางรุ่นพิมพ์ไม่จบ)
      if (releaseOn()) { clearTimeout(bt.releaseTimer); bt.releaseTimer = setTimeout(() => { if (!bt.busy) btRelease(false); }, 2000); }
      document.getElementById('miniPrintDialog')?.close();
    } catch (e) {
      if (e?.name === 'NotFoundError') { setBtn('🔵 พิมพ์ตรง (บลูทูธ)'); return; }   // กดยกเลิกการเลือกเครื่อง
      try { window.alert(`พิมพ์ไม่สำเร็จ: ${e?.message || e}\n\n• เปิดบลูทูธ/ตำแหน่ง และเปิดเครื่องพิมพ์\n• ปิดแอป PeriPage ก่อน (เครื่องพิมพ์ต่อได้ทีละแอป)`); } catch (_) {}
    } finally { bt.busy = false; setBtn(bt.nextChoose ? '🔵 แตะเพื่อเลือกเครื่องพิมพ์' : `🔵 พิมพ์ตรง${btName() ? ` • ${btName()}` : ' (บลูทูธ)'}`); refreshBtUi(); }
  }

  async function preview(cv, name, title, labels) {
    // JPEG พื้นขาวทึบ + ชื่อไฟล์ภาษาอังกฤษ (แอป PeriPage นำเข้า PNG/ชื่อไทยแล้วขึ้นหน้าว่าง)
    const flat = document.createElement('canvas'); flat.width = cv.width; flat.height = cv.height;
    const fx = flat.getContext('2d'); fx.fillStyle = '#ffffff'; fx.fillRect(0, 0, flat.width, flat.height); fx.drawImage(cv, 0, 0);
    // ทำเป็นขาว-ดำล้วน (เครื่องพิมพ์ความร้อนพิมพ์สีเทาอ่อนไม่ออก)
    try {
      const im = fx.getImageData(0, 0, flat.width, flat.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) < 170 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      fx.putImageData(im, 0, 0);
    } catch (_) {}
    const blob = await new Promise(res => flat.toBlob(res, 'image/jpeg', 1));   // คุณภาพสูงสุด: ขอบแท่งบาร์โค้ดคม
    if (cur?.url) URL.revokeObjectURL(cur.url);
    const file = new File([blob], `${String(name).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'receipt'}.jpg`, { type: 'image/jpeg' });
    cur = { blob, file, url: URL.createObjectURL(blob), canvas: flat };
    let dlg = document.getElementById('miniPrintDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'miniPrintDialog'; dlg.className = 'restock-img-dialog mini-print-dialog'; document.body.appendChild(dlg); }
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    dlg.innerHTML = `
      <div class="rid-head"><strong>🖨️ ${esc(title)}</strong>
        <button type="button" class="rid-close" onclick="document.getElementById('miniPrintDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rid-body mini-print-body"><img src="${cur.url}" alt="${esc(title)}"></div>
      <div class="rid-actions">
        ${hasBle() ? `<button type="button" class="rid-btn rid-primary" id="mpBtPrint" onclick="eaMiniPrintBt()">🔵 พิมพ์ตรง${btName() ? ` • ${esc(btName())}` : ' (บลูทูธ)'}</button>` : ''}
        ${canShare ? `<button type="button" class="rid-btn ${hasBle() ? '' : 'rid-primary'}" onclick="eaMiniPrintShare()">📤 ส่งไปแอป PeriPage</button>` : ''}
        <button type="button" class="rid-btn ${canShare || hasBle() ? '' : 'rid-primary'}" onclick="eaMiniPrintSave()">💾 บันทึกรูป</button>
      </div>
      ${labels ? `<div class="rid-hint mp-gap">ใช้สติ๊กเกอร์ 57×${labels === true ? 30 : labels} มม. • วางกระดาษให้ดวงแรกอยู่ที่หัวพิมพ์ • ระยะห่างระหว่างดวง <input type="number" min="0" max="10" step="0.5" value="${gapMm()}" onchange="eaMiniLabelGap(this.value)"> มม. (ถ้าพิมพ์เลื่อนลงทีละนิด ให้ลด • เลื่อนขึ้น ให้เพิ่ม)</div>` : ''}
      ${hasBle() ? `<div class="rid-hint">พิมพ์ตรง: ครั้งแรกเลือกเครื่อง PeriPage จากรายการ (เปิดบลูทูธ + ตำแหน่ง และ <b>ปิดแอป PeriPage ก่อน</b>) • ครั้งต่อไปกดพิมพ์ได้เลย ${btName() ? `<a href="#" onclick="eaMiniPrintBt(true);return false;">เปลี่ยนเครื่อง</a>` : ''}</div>
      <div class="rid-hint mp-dens">ความเข้มการพิมพ์ <span class="mp-seg">${[['0', 'จาง'], ['1', 'ปกติ'], ['2', 'เข้ม']].map(([v, t]) => `<button type="button" class="${density() === v ? 'is-on' : ''}" onclick="eaMiniPrintDensity('${v}', this)">${t}</button>`).join('')}</span>
        <small>แท่งบาร์โค้ดลาม/ติดกัน → จาง • ซีด/ขาด → เข้ม</small></div>
      <div class="rid-hint mp-share">
        <label><input type="checkbox" ${releaseOn() ? 'checked' : ''} onchange="eaMiniPrintSetRelease(this.checked)"> ใช้เครื่องพิมพ์ร่วมกันหลายมือถือ (พิมพ์เสร็จปล่อยเครื่องพิมพ์ให้เครื่องอื่นทันที)</label>
        <span class="mp-bt-row"><span id="mpBtState"></span><button type="button" class="rid-btn mp-release" onclick="eaMiniPrintRelease()">⏏ ปล่อยเครื่องพิมพ์</button></span>
      </div>` : ''}
      <div class="rid-hint">${canShare
        ? 'กด "ส่งไปแอป PeriPage" → เลือกแอป PeriPage → กดพิมพ์ • ใช้กระดาษม้วนต่อเนื่อง 57 มม. (สติ๊กเกอร์ 57×30 บิลยาวจะพิมพ์ข้ามดวง)'
        : 'เครื่องนี้ส่งรูปไปแอปโดยตรงไม่ได้ • บันทึกรูปแล้วเปิดในแอป PeriPage เพื่อพิมพ์ (แนะนำใช้จากแท็บเล็ต/มือถือ)'}</div>`;
    if (!dlg.open) dlg.showModal();
    refreshBtUi();
  }
  function btPrintCurrent(choose) { if (cur?.canvas) return btPrint(cur.canvas, !!choose); }
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

  // =========================================================
  // สติ๊กเกอร์บาร์โค้ด 57×30 มม. (พื้นที่พิมพ์ 48×30 มม. = 384×240 จุด)
  // ต่อกันเป็นแถบยาว เว้นช่องว่างระหว่างดวงตามที่ตั้งไว้ (ค่าเริ่มต้น 2 มม.)
  // =========================================================
  const DOT = 8;                               // 8 จุด = 1 มม. (203 dpi)
  const LBL_H = 30 * DOT;
  const GAP_KEY = 'ea_label_gap_mm';
  const gapMm = () => { let raw = null; try { raw = localStorage.getItem(GAP_KEY); } catch (_) {} const v = Number(raw); return raw !== null && raw !== '' && v >= 0 && v <= 10 ? v : 2; };
  function fitText(ctx, text, maxW, size, bold, minSize) {
    let sz = size;
    do { ctx.font = `${bold ? 800 : 500} ${sz}px ${font()}`; if (ctx.measureText(text).width <= maxW) break; sz -= 1; } while (sz > (minSize || 14));
    let t = String(text || '');
    while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…';
    return t;
  }
  function wrap2(ctx, text, maxW) {
    const out = []; let cur = '';
    for (const ch of Array.from(String(text || ''))) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; if (out.length === 2) break; } else cur += ch; }
    if (out.length < 2 && cur) out.push(cur);
    if (out.length === 2 && Array.from(String(text)).join('').length > out.join('').length) { let l = out[1]; while (ctx.measureText(l + '…').width > maxW && l.length > 1) l = l.slice(0, -1); out[1] = l + '…'; }
    return out;
  }
  // ป้ายสินค้าสั่งจอง: กรอบดำหนา + แถบดำ "สินค้าสั่งจอง ห้ามขาย" + ชื่อลูกค้า • ไม่มีราคา (ราคาตามที่ตกลงในใบจอง)
  // บาร์โค้ด = เลขใบจอง (ไม่ใช่บาร์โค้ดสินค้า) → สแกนแล้วเปิดใบจอง ขายปนกับของหน้าร้านไม่ได้
  // ความยาวป้าย 30 / 40 / 50 มม. (o.h = จุด) • ป้ายยาว → ตัวหนังสือ/บาร์โค้ดใหญ่ขึ้น ชื่อสินค้า 2 บรรทัด
  // ---------- ตัดบรรทัดภาษาไทยตามคำ (ชื่อสินค้า/สเปคยาว) ----------
  let thSeg = null;
  try { thSeg = new Intl.Segmenter('th', { granularity: 'word' }); } catch (_) {}
  function words(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    if (thSeg) return Array.from(thSeg.segment(t), x => x.segment);
    return t.split(/(\s+)/);
  }
  // แบ่งเป็นบรรทัดไม่เกิน maxW (คำที่ยาวเกินบรรทัด → ตัดตามตัวอักษร โดยไม่แยกสระ/วรรณยุกต์ออกจากพยัญชนะ)
  function wrapLines(ctx, text, maxW) {
    const out = []; let cur = '';
    const pushChars = w => {
      const g = (() => { try { return Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(w), x => x.segment); } catch (_) { return Array.from(w); } })();
      for (const ch of g) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
    };
    for (const w of words(text)) {
      if (ctx.measureText(cur + w).width <= maxW) { cur += w; continue; }
      if (cur.trim()) { out.push(cur.trim()); cur = ''; }
      const ww = w.replace(/^\s+/, '');
      if (ctx.measureText(ww).width <= maxW) cur = ww; else pushChars(ww);
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  // หาขนาดตัวอักษรใหญ่สุดที่ใส่ข้อความครบในกล่อง w×h • ไม่พอจริง ๆ → ขนาดเล็กสุด + … ท้ายบรรทัดสุดท้าย
  function fitBlock(ctx, text, w, h, maxSize, minSize, weight, lineGap = 1.16) {
    for (let sz = maxSize; sz >= minSize; sz--) {
      ctx.font = `${weight} ${sz}px ${font()}`;
      const lines = wrapLines(ctx, text, w);
      if (lines.length * sz * lineGap <= h + 1) return { size: sz, lines, lh: sz * lineGap };
    }
    ctx.font = `${weight} ${minSize}px ${font()}`;
    const max = Math.max(1, Math.floor(h / (minSize * lineGap)));
    const lines = wrapLines(ctx, text, w);
    if (lines.length > max) {
      lines.length = max;
      let l = lines[max - 1];
      while (ctx.measureText(l + '…').width > w && l.length > 1) l = l.slice(0, -1);
      lines[max - 1] = l + '…';
    }
    return { size: minSize, lines, lh: minSize * lineGap };
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  }
  // ไอคอน (เส้น/พื้นดำล้วน พิมพ์ความร้อนชัด)
  const ICON_CART = 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z';
  const ICON_PHONE = 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z';
  function svgIcon(ctx, d, x, y, size, color) {
    try { ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24); ctx.fillStyle = color; ctx.fill(new Path2D(d)); ctx.restore(); } catch (_) { ctx.restore?.(); }
  }
  function checkMark(ctx, cx, cy, s, color, lw) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * .45, cy); ctx.lineTo(cx - s * .1, cy + s * .35); ctx.lineTo(cx + s * .5, cy - s * .35); ctx.stroke(); ctx.restore();
  }
  function boxIcon(ctx, x, y, s) {           // กล่องพัสดุ (เส้น)
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2.5, s * .07); ctx.lineJoin = 'round';
    const cx = x + s / 2, t = y + s * .12, m = y + s * .34, b = y + s * .9, l = x + s * .08, r = x + s * .92;
    ctx.beginPath(); ctx.moveTo(cx, t); ctx.lineTo(r, m - s * .06); ctx.lineTo(r, b - s * .22); ctx.lineTo(cx, b); ctx.lineTo(l, b - s * .22); ctx.lineTo(l, m - s * .06); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l, m - s * .06); ctx.lineTo(cx, m + s * .12); ctx.lineTo(r, m - s * .06); ctx.moveTo(cx, m + s * .12); ctx.lineTo(cx, b); ctx.stroke();
    ctx.restore();
  }
  function clipIcon(ctx, x, y, s) {          // คลิปบอร์ด + ✓
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(2.5, s * .08);
    rrect(ctx, x + s * .1, y + s * .14, s * .8, s * .84, s * .1); ctx.stroke();
    ctx.fillStyle = '#fff'; rrect(ctx, x + s * .3, y + s * .02, s * .4, s * .22, s * .06); ctx.fill(); ctx.stroke();
    ctx.restore();
    checkMark(ctx, x + s * .5, y + s * .6, s * .5, '#000', Math.max(3, s * .1));
  }

  // แนวนอน 100 มม. (แบบป้าย "สินค้าสั่งจอง • ห้ามขาย"): วาด 800×384 จุด แล้วหมุน 90° ให้พอดีหัวพิมพ์ 48 มม.
  // ช่องสีเทาในแบบ → กรอบเส้น (เครื่องพิมพ์ความร้อนพิมพ์สีเทาไม่ออก)
  function reservedLandscape(o) {
    const LW = o.h || 800, LH = W;
    const L = document.createElement('canvas'); L.width = LW; L.height = LH;
    const c = L.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, LW, LH); c.textBaseline = 'alphabetic';
    const IN = 4, R = 24;                                     // กรอบนอกมุมมน
    // แถบดำหัวป้าย (มุมบนมน)
    const bandH = 64;
    c.save(); rrect(c, IN, IN, LW - IN * 2, LH - IN * 2, R); c.clip();
    c.fillStyle = '#000'; c.fillRect(0, 0, LW, bandH);
    c.restore();
    c.lineWidth = 5; c.strokeStyle = '#000'; rrect(c, IN, IN, LW - IN * 2, LH - IN * 2, R); c.stroke();
    // ลายขีด ////
    c.fillStyle = '#fff';
    const hatch = (x0, n) => { for (let i = 0; i < n; i++) { const x = x0 + i * 19; c.beginPath(); c.moveTo(x + 12, 20); c.lineTo(x + 20, 20); c.lineTo(x + 8, 46); c.lineTo(x, 46); c.closePath(); c.fill(); } };
    c.font = `800 38px ${font()}`;
    const head = '★ สินค้าสั่งจอง • ห้ามขาย ★';
    const headW = Math.min(c.measureText(head).width, LW - 220);
    c.textAlign = 'center'; c.fillText(fitText(c, head, LW - 220, 38, true, 24), LW / 2, 47); c.textAlign = 'left';
    const hn = Math.max(0, Math.min(5, Math.floor(((LW - headW) / 2 - 40) / 19)));
    hatch(28, hn); hatch(LW - 28 - hn * 19 - 4, hn);
    c.fillStyle = '#000'; c.strokeStyle = '#000';
    const line = (y, x1 = 18, x2 = LW - 18, w = 2) => { c.fillRect(x1, y, x2 - x1, w); };
    const vline = (x, y1, y2, w = 3) => { c.fillRect(x, y1, w, y2 - y1); };

    // แถว 1: ชื่อลูกค้า | ☎ โทร …1234
    const r1t = bandH + 6, r1b = 132;
    const tail = o.phone ? String(o.phone).replace(/\D/g, '').slice(-4) : '';
    let nameW = LW - 44;
    if (tail) {
      c.font = `800 30px ${font()}`;
      const ptxt = `โทร. …${tail}`, tw = c.measureText(ptxt).width;
      const pw = tw + 72, px = LW - 20 - pw, py = r1t + 8, ph = r1b - r1t - 18;
      c.lineWidth = 2.5; rrect(c, px, py, pw, ph, ph / 2); c.stroke();
      const cr = ph / 2 - 6, ccx = px + 8 + cr, ccy = py + ph / 2;
      c.beginPath(); c.arc(ccx, ccy, cr, 0, Math.PI * 2); c.fill();
      svgIcon(c, ICON_PHONE, ccx - cr * .62, ccy - cr * .62, cr * 1.24, '#fff');
      c.fillStyle = '#000'; c.fillText(ptxt, px + 16 + cr * 2 + 6, ccy + 11);
      vline(px - 16, r1t + 10, r1b - 10);
      nameW = px - 16 - 24 - 22;
    }
    const nm = fitBlock(c, o.title, nameW, r1b - r1t - 4, 44, 22, 800, 1.08);
    c.font = `800 ${nm.size}px ${font()}`;
    const nLines = nm.lines.slice(0, Math.max(1, Math.floor((r1b - r1t - 4) / nm.lh)));
    const ny0 = r1t + (r1b - r1t - nLines.length * nm.lh) / 2 + nm.size * .92;
    nLines.forEach((l, i) => c.fillText(l, 24, ny0 + i * nm.lh));
    line(r1b + 2);

    // ชื่อสินค้า/สเปคยาว → โหมดกระชับ: บาร์โค้ดเตี้ยลง + "รับสินค้า" ซ้อนเหนือวันที่ → ช่องชื่อสินค้ากว้าง/สูงขึ้น
    c.font = `700 26px ${font()}`;
    const compact = c.measureText(String(o.sub || '')).width > 420 * 1.7;
    // แถว 2: [ไอคอนรถเข็น✓] | บาร์โค้ด + เลขใบจอง
    const r2t = r1b + 10, r2b = compact ? 246 : 270;
    const ib = r2b - r2t - 6, ix = 22, iy = r2t + 2;
    rrect(c, ix, iy, ib, ib, 18); c.fill();
    svgIcon(c, ICON_CART, ix + ib * .1, iy + ib * .2, ib * .72, '#fff');
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ix + ib * .7, iy + ib * .3, ib * .2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
    checkMark(c, ix + ib * .7, iy + ib * .3, ib * .22, '#000', Math.max(3, ib * .045));
    c.fillStyle = '#000';
    vline(ix + ib + 14, r2t + 6, r2b - 6);
    const bx = ix + ib + 32, bw = LW - 20 - bx, codeH = 46, bH = r2b - r2t - codeH - 8;
    const okBc = window.eaDrawReservationBarcode?.(c, o.barcode, bx, r2t, bw, bH);
    c.fillStyle = '#000';
    if (!okBc) { c.font = `800 30px ui-monospace, monospace`; c.textAlign = 'center'; c.fillText(o.barcode, bx + bw / 2, r2t + bH / 2 + 10); c.textAlign = 'left'; }
    const cpy = r2t + bH + 4;
    c.lineWidth = 2.5; c.strokeStyle = '#000'; rrect(c, bx, cpy, bw, codeH, codeH / 2); c.stroke();
    c.font = `800 34px ui-monospace, "Sarabun", monospace`; c.textAlign = 'center';
    c.fillText(fitText(c, o.code || '', bw - (o.right ? 120 : 30), 34, true, 20), bx + bw / 2 - (o.right ? 30 : 0), cpy + codeH / 2 + 12);
    if (o.right) { c.font = `800 24px ${font()}`; c.textAlign = 'right'; c.fillText(o.right, bx + bw - 18, cpy + codeH / 2 + 9); }
    c.textAlign = 'left';
    line(r2b + 4);

    // แถว 3: [📦 ชื่อสินค้า/สเปค (ตัดบรรทัด+ย่อให้พอดี)] | 📋 รับสินค้า : [วันที่]
    const r3t = r2b + 12, r3b = LH - 14;
    // ขวา: วันนัดรับ
    const dTxt = String(o.left || '').replace(/^รับ\s*/, '');
    c.font = `800 32px ${font()}`; const dW = Math.min(150, c.measureText(dTxt).width);
    let cx0;
    if (!compact) {
      const dpw = dW + 28, dph = 50, dpx = LW - 20 - dpw, dpy = r3t + (r3b - r3t - dph) / 2;
      rrect(c, dpx, dpy, dpw, dph, 12); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(fitText(c, dTxt, dW, 32, true, 20), dpx + dpw / 2, dpy + dph / 2 + 11); c.textAlign = 'left'; c.fillStyle = '#000';
      c.font = `800 24px ${font()}`; const lab = 'รับสินค้า :'; const lw = c.measureText(lab).width;
      const lx = dpx - 8 - lw; c.fillText(lab, lx, dpy + dph / 2 + 9);
      const cs = 40; cx0 = lx - 8 - cs; clipIcon(c, cx0, r3t + (r3b - r3t - cs) / 2, cs);
    } else {
      const dpw = dW + 24, dph = 48, dpx = LW - 20 - dpw, dpy = r3b - dph - 4;
      rrect(c, dpx, dpy, dpw, dph, 12); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(fitText(c, dTxt, dW, 32, true, 20), dpx + dpw / 2, dpy + dph / 2 + 11); c.fillStyle = '#000';
      c.font = `800 22px ${font()}`; c.fillText('รับสินค้า', dpx + dpw / 2, dpy - 12); c.textAlign = 'left';
      const cs = 38; cx0 = dpx - 8 - cs; clipIcon(c, cx0, r3t + (r3b - r3t - cs) / 2, cs);
    }
    vline(cx0 - 14, r3t + 6, r3b - 6);
    // ซ้าย: ชื่อสินค้า
    const ipx = 18, ipw = cx0 - 14 - 12 - ipx, iph = r3b - r3t;
    c.lineWidth = 2.5; rrect(c, ipx, r3t, ipw, iph, 16); c.stroke();
    boxIcon(c, ipx + 10, r3t + (iph - 40) / 2, 40);
    const tx = ipx + 58, tw2 = ipw - 58 - 10, th = iph - 10;
    const it = fitBlock(c, o.sub || '', tw2, th, 28, 15, 700, 1.12);
    c.font = `700 ${it.size}px ${font()}`; c.fillStyle = '#000';
    const iy0 = r3t + (iph - it.lines.length * it.lh) / 2 + it.size * .9;
    it.lines.forEach((l, i) => c.fillText(l, tx, iy0 + i * it.lh));

    // หมุนตามเข็มนาฬิกา 90° → แคนวาสกว้าง 384 (หัวพิมพ์) × ยาว 800
    const cv = document.createElement('canvas'); cv.width = W; cv.height = LW;
    const ctx = cv.getContext('2d');
    ctx.translate(W, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(L, 0, 0);
    return cv;
  }
  function reservedStickerCanvas(o) {
    if (o.land) return reservedLandscape(o);
    const H = o.h || LBL_H;
    const big = H >= 300, xl = H >= 380;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
    const F = big ? 6 : 5;                        // กรอบดำหนา (ป้ายปกติไม่มีกรอบ)
    ctx.fillRect(0, 0, W, F); ctx.fillRect(0, H - F, W, F); ctx.fillRect(0, 0, F, H); ctx.fillRect(W - F, 0, F, H);
    const P = F + 8, inner = W - P * 2;
    // แถบดำหัวป้าย
    const bandH = xl ? 56 : big ? 50 : 40;
    ctx.fillRect(0, 0, W, bandH);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    const bf = xl ? 32 : big ? 30 : 25;
    ctx.fillText(fitText(ctx, '★ สินค้าสั่งจอง • ห้ามขาย ★', inner, bf, true, 16), W / 2, Math.round(bandH / 2 + bf * 0.38));
    ctx.textAlign = 'left'; ctx.fillStyle = '#000';
    // ชื่อลูกค้า + เบอร์ท้าย
    let y = bandH + (big ? 6 : 4);
    const nf = xl ? 30 : big ? 27 : 22, pf = big ? 20 : 17;
    const ph = o.phone ? `โทร …${String(o.phone).replace(/\D/g, '').slice(-4)}` : '';
    ctx.font = `700 ${pf}px ${font()}`;
    const phW = ph ? ctx.measureText(ph).width + 8 : 0;
    ctx.fillText(fitText(ctx, o.title, inner - phW, nf, true, 15), P, y + nf - 2);
    if (ph) { ctx.font = `700 ${pf}px ${font()}`; ctx.textAlign = 'right'; ctx.fillText(ph, W - P, y + nf - 3); ctx.textAlign = 'left'; }
    y += nf + 2;
    // ชื่อสินค้า (ป้ายยาว: 2 บรรทัด)
    const itf = xl ? 23 : big ? 21 : 18;
    if (big) {
      // 40/50 มม.: ชื่อสินค้า/สเปคยาว ตัดบรรทัดตามคำ + ย่อขนาดให้พอดี (40 = 2 บรรทัด, 50 = 3 บรรทัด)
      const it = fitBlock(ctx, o.sub || '', inner, itf * (xl ? 3.4 : 2.3), itf, 13, 600, 1.1);
      ctx.font = `600 ${it.size}px ${font()}`;
      it.lines.forEach(l => { ctx.fillText(l, P, y + it.size - 1); y += it.lh; });
      y += 3;
    } else {
      ctx.fillText(fitText(ctx, o.sub || '', inner, itf, false, 13), P, y + itf - 1);
      y += itf + 3;
    }
    // บาร์โค้ดใบจอง
    const footH = big ? 30 : 24, codeH = big ? 19 : 16, bcTop = y + (big ? 6 : 2);
    const bcH = Math.max(40, H - F - footH - codeH - bcTop - (big ? 4 : 0));
    const okBc = window.eaDrawReservationBarcode?.(ctx, o.barcode, F + 4, bcTop, W - (F + 4) * 2, bcH);
    ctx.fillStyle = '#000';
    if (!okBc) { ctx.font = `800 24px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText(o.barcode, W / 2, bcTop + bcH / 2 + 8); ctx.textAlign = 'left'; }
    ctx.font = `700 ${big ? 17 : 14}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText(o.code || '', W / 2, bcTop + bcH + (big ? 16 : 13)); ctx.textAlign = 'left';
    // แถวล่าง: วันนัดรับ • (ไม่มีราคา) • ลำดับดวง
    const fy = H - F - (big ? 8 : 6), ff = big ? 22 : 18;
    ctx.font = `800 ${ff}px ${font()}`;
    ctx.fillText(fitText(ctx, o.left || '', inner * 0.42, ff, true, 13), P, fy);
    ctx.font = `600 ${big ? 16 : 14}px ${font()}`; ctx.textAlign = 'center'; ctx.fillText('ราคาตามใบจอง', W / 2 + 18, fy - 1);
    if (o.right) { ctx.font = `800 ${ff}px ${font()}`; ctx.textAlign = 'right'; ctx.fillText(o.right, W - P, fy); }
    ctx.textAlign = 'left';
    return cv;
  }
  function stickerCanvas(o) {
    if (o.kind === 'reserved') return reservedStickerCanvas(o);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = LBL_H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, LBL_H); ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
    const P = 10, inner = W - P * 2;
    let y = 6;
    if (o.tag) {           // แถบดำ "ของจอง" + ชื่อลูกค้า
      ctx.font = `800 20px ${font()}`; const tw = ctx.measureText(o.tag).width + 14;
      ctx.fillRect(P, y, tw, 28); ctx.fillStyle = '#fff'; ctx.fillText(o.tag, P + 7, y + 21); ctx.fillStyle = '#000';
      const t = fitText(ctx, o.title, inner - tw - 8, 26, true, 18); ctx.fillText(t, P + tw + 8, y + 23);
      y += 34;
      ctx.font = `600 20px ${font()}`;
      wrap2(ctx, o.sub || '', inner).slice(0, 1).forEach(l => { ctx.fillText(l, P, y + 18); y += 22; });
    } else {
      if (o.top) { ctx.font = `600 16px ${font()}`; ctx.textAlign = 'center'; ctx.fillText(fitText(ctx, o.top, inner, 16, false, 12), W / 2, y + 14); ctx.textAlign = 'left'; y += 18; }
      ctx.font = `800 23px ${font()}`;
      const lines = wrap2(ctx, o.title, inner);
      lines.forEach(l => { ctx.textAlign = 'center'; ctx.fillText(l, W / 2, y + 21); ctx.textAlign = 'left'; y += 25; });
      if (lines.length < 2) y += 4;
    }
    // บาร์โค้ด
    const bottomH = 26, bcTop = y + 4, bcH = Math.max(50, LBL_H - bcTop - bottomH - (o.code ? 18 : 2));
    const okBc = window.eaDrawReservationBarcode?.(ctx, o.barcode, 0, bcTop, W, bcH);
    ctx.fillStyle = '#000';
    let by = bcTop + bcH;
    if (o.code) { ctx.font = `600 16px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText(o.code, W / 2, by + 15); ctx.textAlign = 'left'; by += 18; }
    if (!okBc) { ctx.font = `800 26px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText(o.barcode, W / 2, bcTop + bcH / 2); ctx.textAlign = 'left'; }
    // แถวล่าง
    ctx.font = `800 20px ${font()}`;
    if (o.left) ctx.fillText(fitText(ctx, o.left, inner * 0.62, 20, true, 14), P, LBL_H - 7);
    if (o.right) { ctx.textAlign = 'right'; ctx.fillText(fitText(ctx, o.right, inner * 0.5, o.rightBig ? 26 : 20, true, 14), W - P, LBL_H - 6); ctx.textAlign = 'left'; }
    return cv;
  }
  function stripCanvas(stickers) {
    const gap = Math.round(gapMm() * DOT);
    const hs = stickers.map(o => o.h || LBL_H);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = hs.reduce((a, h) => a + h, 0) + (stickers.length - 1) * gap;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, cv.height);
    let yy = 0;
    stickers.forEach((o, i) => { ctx.drawImage(stickerCanvas(o), 0, yy); yy += hs[i] + gap; });
    return cv;
  }
  let stickerJob = null;
  async function printStickers(stickers, name, title) {
    if (!stickers.length) { toast('ไม่มีสติ๊กเกอร์ให้พิมพ์'); return; }
    if (stickers.length > 200) { toast('พิมพ์ได้ครั้งละไม่เกิน 200 ดวง'); stickers = stickers.slice(0, 200); }
    stickerJob = { stickers, name, title };
    await fontsReady();
    const mm = Math.round((stickers[0].h || LBL_H) / DOT);
    await preview(stripCanvas(stickers), name, `${title} • ${stickers.length} ดวง (${stickers[0].land ? `แนวนอน ${mm}×57` : `57×${mm}`} มม.)`, mm);
  }
  function setGap(v) {
    const n = Math.max(0, Math.min(10, Number(v)));
    try { localStorage.setItem(GAP_KEY, String(isNaN(n) ? 2 : n)); } catch (_) {}
    if (stickerJob) run(() => printStickers(stickerJob.stickers, stickerJob.name, stickerJob.title));
  }
  // สินค้า: [{product, qty}]
  function productStickers(items) {
    const shop = 'เอิร์นนี่ แอดวานซ์';   // หัวสติ๊กเกอร์ (เหมือนหัวกระดาษใบเสร็จ)
    const out = [];
    for (const it of items) {
      const p = it.product; const n = Math.max(1, Math.min(500, Number(it.qty) || 1));
      const code = String(p.barcode || p.product_code || '000000').trim();
      for (let k = 0; k < n; k++) out.push({ top: shop, title: p.product_name, barcode: code, code, left: p.product_code || '', right: `฿${money(p.sale_price)}`, rightBig: true });
    }
    return out;
  }
  function printProductStickers(items, title) { return run(() => printStickers(productStickers(items), `labels-${Date.now()}`, title || 'สติ๊กเกอร์บาร์โค้ดสินค้า')); }
  // ใบจอง: ดวงละชิ้น
  function printReservationStickers(id, n, mm) {
    const land = Number(mm) === 100;              // แนวนอน ยาว 100 มม.
    const h = land ? 100 * DOT : [30, 40, 50].includes(Number(mm)) ? Number(mm) * DOT : LBL_H;
    return run(async () => {
      const r = (window.eaReservations?.() || []).find(x => x.id === id); if (!r) { toast('ไม่พบใบจอง'); return; }
      const names = []; (r.items || []).forEach(i => { const c = Math.max(1, Math.ceil(Number(i.qty) || 1)); for (let k = 0; k < c; k++) names.push(i.name); });
      const total = Math.max(1, Math.min(200, Number(n) || names.length || 1));
      const pd = new Date(String(r.pickup_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const bc = window.eaReservationBarcode?.(r) || String(r.res_no).replace(/-/g, '');
      const list = Array.from({ length: total }, (_, k) => ({ kind: 'reserved', h, land, title: r.customer_name, phone: r.customer_phone || '', sub: names[k % (names.length || 1)] || '', barcode: bc, code: r.res_no, left: `รับ ${pd}`, right: total > 1 ? `${k + 1}/${total}` : '' }));
      await printStickers(list, `booking-label-${r.res_no}`, `ป้ายสินค้าสั่งจอง ${r.res_no}`);
    });
  }

  // ปุ่มในหน้าต่าง "ขายสินค้าสำเร็จ\"
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
  // พับแอป / ล็อกจอ / ปิดแอป → ปล่อยเครื่องพิมพ์ (กันมือถือที่วางไว้ต่อค้างจนเครื่องอื่นพิมพ์ไม่ได้)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && releaseOn() && !bt.busy) btRelease(false); });
  window.addEventListener('pagehide', () => { if (!bt.busy) btRelease(false); });

  Object.assign(window, {
    eaMiniPrintBill: printBill, eaMiniPrintReservation: printReservation,
    eaMiniPrintShare: share, eaMiniPrintSave: save, eaMiniPrintBt: btPrintCurrent,
    eaMiniPrintRelease: () => btRelease(true), eaMiniPrintSetRelease: setRelease, eaMiniPrintDensity: setDensity,
    eaMiniPrintProductLabels: printProductStickers, eaMiniPrintReservationLabels: printReservationStickers, eaMiniLabelGap: setGap,
    eaDrawThermalBill: drawBill, eaDrawThermalReservation: drawReservation
  });
})();
