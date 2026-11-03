/**
 * EA Fair Sale - Phone Cashier (มือถือเป็นเครื่องสแกนคิดเงิน)
 *
 * หน้าจอเต็มจอสำหรับมือถือ:
 *   สแกน → รายการปุ่มใหญ่ → 💰 คิดเงิน → รับเงินสด/QR → บันทึกบิล + ตัดสต็อก (checkoutCart → V8)
 *   หัวจอแสดงยอดของเครื่องนี้วันนี้ เช่น "เครื่อง A · 3 บิล · ฿1,250"
 *   หน้าสรุปยอด: เงินสด / โอน-QR / เงินสดที่ต้องส่ง / บิลที่ยังไม่ซิงค์ / รายการบิล
 *   ทางเลือกรอง: 📤 ส่งรายการไปแท็บเล็ตให้แคชเชียร์คิดเงิน (js/remote-cart.js)
 *
 * Uses globals from app.js: state, money, escapeHtml, todayISO, productByBarcode, checkoutCart,
 *   beepBatchAdd, beepSuccess, beepError, stopScanner, TERMINAL_KEY
 */
(function () {
  const STORE_KEY = 'ea_phone_scan_items';
  const MODE_KEY = 'ea_phone_cashier_mode';      // open this screen automatically on app start
  const SAME_CODE_MS = 1500;
  const ANY_CODE_MS = 600;

  let items = loadItems();     // [{product_id, product_name, barcode, unit, price, stock, qty}]
  let reader = null;
  let controls = null;
  let paused = false;
  let torchOn = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let lastAcceptAt = 0;
  let busy = false;
  let lastSent = null;
  let wakeLock = null;
  let noticeTimer = null;
  let feedbackTimer = null;
  let pay = { method: 'cash', received: '' };

  const $ = (id) => document.getElementById(id);

  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function loadItems() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]').filter(x => x && x.product_id); }
    catch (e) { return []; }
  }
  function saveItems() { lsSet(STORE_KEY, JSON.stringify(items)); }
  function appState() { return window.getEaAppState?.() || null; }
  function products() { return appState()?.products || []; }
  function terminalName() { return String(appState()?.terminal || 'POS-01'); }
  function vibrate(p) { try { navigator.vibrate?.(p); } catch (e) {} }
  function sound(fn) { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {} }
  function isQr(pm) { const v = String(pm || '').toLowerCase(); return v === 'promptpay' || v === 'qr' || v === 'transfer'; }

  // ---------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------
  async function openPhoneScan() {
    const dlg = $('phoneScanDialog');
    if (!dlg) return;
    try { if (typeof stopScanner === 'function') stopScanner(); } catch (e) {}
    hideSheet('psPay'); hideSheet('psSummary'); hideSheet('psDone');
    renderList();
    renderTally();
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add('ps-open');
    paused = false;
    requestWakeLock();
    await startCamera();
  }

  function closePhoneScan() {
    stopCamera();
    releaseWakeLock();
    const dlg = $('phoneScanDialog');
    if (dlg?.open) dlg.close();
    document.documentElement.classList.remove('ps-open');
  }

  async function requestWakeLock() {
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (e) { wakeLock = null; }
  }
  function releaseWakeLock() {
    try { wakeLock?.release(); } catch (e) {}
    wakeLock = null;
  }

  function showSheet(id) { const s = $(id); if (s) s.hidden = false; paused = true; }
  function hideSheet(id) { const s = $(id); if (s) s.hidden = true; }
  function anySheetOpen() { return ['psPay', 'psSummary', 'psDone'].some(id => $(id) && !$(id).hidden); }
  function resumeIfIdle() { if (!anySheetOpen()) paused = false; }

  // ---------------------------------------------------------
  // Camera
  // ---------------------------------------------------------
  async function startCamera() {
    const video = $('psVideo');
    stopCamera();
    if (!window.ZXingBrowser) {
      showCamMsg('โหลดตัวสแกนไม่สำเร็จ • พิมพ์บาร์โค้ดในช่องด้านล่างแทนได้');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showCamMsg('กล้องใช้ได้เฉพาะเว็บ HTTPS • พิมพ์บาร์โค้ดในช่องด้านล่างแทนได้');
      return;
    }
    showCamMsg('กำลังเปิดกล้อง...');
    try {
      reader = new ZXingBrowser.BrowserMultiFormatReader();
      controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        video,
        (result) => { if (result) onCode(result.getText()); }
      );
      const msg = $('psCamMsg');
      if (msg) msg.hidden = true;
      const torchBtn = $('psTorchBtn');
      if (torchBtn) torchBtn.hidden = !canTorch();
      torchOn = false;
      updateTorchBtn();
    } catch (err) {
      console.warn('Phone scan camera error:', err);
      showCamMsg(err?.name === 'NotAllowedError'
        ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง • เปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์ แล้วกด "เปิดกล้องอีกครั้ง"'
        : 'เปิดกล้องไม่ได้ • กด "เปิดกล้องอีกครั้ง" หรือพิมพ์บาร์โค้ดด้านล่าง', true);
    }
  }

  function stopCamera() {
    try { controls?.stop(); } catch (e) {}
    controls = null;
    reader = null;
    const video = $('psVideo');
    try { video?.srcObject?.getTracks?.().forEach(t => t.stop()); } catch (e) {}
    if (video) video.srcObject = null;
  }

  function showCamMsg(text, withRetry) {
    const msg = $('psCamMsg');
    if (!msg) return;
    msg.hidden = false;
    msg.innerHTML = `<span>${escapeHtml(text)}</span>${withRetry ? '<button type="button" class="ps-retry" onclick="restartPhoneScanCamera()">เปิดกล้องอีกครั้ง</button>' : ''}`;
  }

  function videoTrack() {
    try { return $('psVideo')?.srcObject?.getVideoTracks?.()[0] || null; } catch (e) { return null; }
  }
  function canTorch() {
    if (typeof controls?.switchTorch === 'function') return true;
    try { return Boolean(videoTrack()?.getCapabilities?.().torch); } catch (e) { return false; }
  }
  async function togglePhoneScanTorch() {
    torchOn = !torchOn;
    try {
      if (typeof controls?.switchTorch === 'function') await controls.switchTorch(torchOn);
      else await videoTrack()?.applyConstraints({ advanced: [{ torch: torchOn }] });
    } catch (e) {
      torchOn = false;
      notice('อุปกรณ์นี้เปิดไฟฉายไม่ได้', 'warn');
    }
    updateTorchBtn();
  }
  function updateTorchBtn() {
    const b = $('psTorchBtn');
    if (b) b.classList.toggle('is-on', torchOn);
  }

  // ---------------------------------------------------------
  // Scanning
  // ---------------------------------------------------------
  function onCode(raw) {
    if (paused) return;
    const code = String(raw || '').trim();
    if (!code) return;
    const now = Date.now();
    if (code === lastCode && now - lastCodeAt < SAME_CODE_MS) { lastCodeAt = now; return; }
    if (now - lastAcceptAt < ANY_CODE_MS) return;
    lastCode = code; lastCodeAt = now; lastAcceptAt = now;

    const p = productByBarcode(code) || products().find(x => String(x.product_code || '').trim() === code);
    if (!p) {
      sound('beepError');
      vibrate([80, 60, 80]);
      feedback(`ไม่พบสินค้า: ${code}`, 'error');
      return;
    }
    addProduct(p, 1);
  }

  function addProduct(p, qty) {
    const stock = Number(p.stock_qty || 0);
    let it = items.find(x => x.product_id === p.id);
    const current = it ? it.qty : 0;
    if (current + qty > stock) {
      sound('beepError');
      vibrate([80, 60, 80]);
      feedback(stock <= 0 ? `${p.product_name} • สินค้าหมด` : `${p.product_name} • เหลือแค่ ${stock}`, 'warn');
      return false;
    }
    if (it) {
      it.qty += qty;
      items = [it, ...items.filter(x => x !== it)];
    } else {
      it = {
        product_id: p.id,
        product_name: p.product_name,
        barcode: p.barcode || '',
        unit: p.unit || p.unit_name || 'ชิ้น',
        price: Number(p.sale_price || 0),
        stock,
        qty
      };
      items.unshift(it);
    }
    saveItems();
    renderList(p.id);
    sound('beepBatchAdd');
    vibrate(40);
    feedback(`${p.product_name}  ×${it.qty}`, 'ok');
    return true;
  }

  function feedback(text, type) {
    const f = $('psFeedback');
    if (!f) return;
    f.textContent = text;
    f.className = `ps-feedback is-${type} is-show`;
    const cam = $('psCamera');
    if (cam) { cam.classList.remove('flash-ok', 'flash-error', 'flash-warn'); void cam.offsetWidth; cam.classList.add(`flash-${type}`); }
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => f.classList.remove('is-show'), 1600);
  }

  function notice(text, type) {
    const n = $('psNotice');
    if (!n) return;
    n.textContent = text;
    n.className = `ps-notice is-${type || 'info'}`;
    n.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { n.hidden = true; }, 4000);
  }

  // ---------------------------------------------------------
  // Manual entry
  // ---------------------------------------------------------
  function searchProducts(q) {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const exact = products().filter(p => String(p.barcode || '').toLowerCase() === t || String(p.product_code || '').toLowerCase() === t);
    if (exact.length) return exact;
    return products().filter(p =>
      String(p.product_name || '').toLowerCase().includes(t) ||
      String(p.barcode || '').toLowerCase().includes(t) ||
      String(p.product_code || '').toLowerCase().includes(t)
    ).slice(0, 6);
  }

  function phoneScanSearchInput(value) {
    const box = $('psSuggest');
    if (!box) return;
    const list = value.trim().length >= 1 ? searchProducts(value) : [];
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = list.map(p => `
      <button type="button" class="ps-suggest-item" onclick="phoneScanPick('${escapeHtml(p.id)}')">
        <span class="ps-suggest-name">${escapeHtml(p.product_name)}</span>
        <span class="ps-suggest-meta">฿${money(p.sale_price)} · เหลือ ${Number(p.stock_qty || 0)}</span>
      </button>`).join('');
  }

  function phoneScanManual() {
    const input = $('psManualInput');
    const list = searchProducts(input?.value || '');
    if (list.length === 1) { phoneScanPick(list[0].id); return; }
    if (!list.length) { feedback('ไม่พบสินค้า', 'error'); sound('beepError'); return; }
    phoneScanSearchInput(input.value);
  }

  function phoneScanPick(id) {
    const p = products().find(x => x.id === id);
    if (!p) return;
    if (addProduct(p, 1)) {
      const input = $('psManualInput');
      if (input) { input.value = ''; input.blur(); }
      phoneScanSearchInput('');
    }
  }

  // ---------------------------------------------------------
  // List
  // ---------------------------------------------------------
  function changePhoneScanQty(id, delta) {
    const it = items.find(x => x.product_id === id);
    if (!it) return;
    const next = it.qty + delta;
    if (next <= 0) {
      items = items.filter(x => x !== it);
    } else {
      const p = products().find(x => x.id === id);
      const stock = p ? Number(p.stock_qty || 0) : it.stock;
      if (next > stock) { notice(`${it.product_name} เหลือแค่ ${stock}`, 'warn'); vibrate([80, 60, 80]); return; }
      it.qty = next;
    }
    vibrate(20);
    saveItems();
    renderList();
  }

  function clearPhoneScan() {
    if (!items.length) return;
    if (!confirm('ล้างรายการทั้งหมดในบิลนี้?')) return;
    items = [];
    saveItems();
    renderList();
  }

  // Use the latest product price/name before charging
  function syncPrices() {
    for (const it of items) {
      const p = products().find(x => x.id === it.product_id);
      if (p) {
        it.price = Number(p.sale_price || 0);
        it.product_name = p.product_name;
        it.stock = Number(p.stock_qty || 0);
      }
    }
    saveItems();
  }

  function totals() {
    return {
      lines: items.length,
      qty: items.reduce((s, x) => s + x.qty, 0),
      amount: Math.round(items.reduce((s, x) => s + x.qty * x.price, 0) * 100) / 100
    };
  }

  function renderList(highlightId) {
    const list = $('psList');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `
        <div class="ps-empty">
          <div class="ps-empty-icon">📷</div>
          <div>ส่องกล้องไปที่บาร์โค้ดสินค้า</div>
          <small>สแกนชิ้นเดิมซ้ำ = เพิ่มจำนวน</small>
        </div>`;
    } else {
      list.innerHTML = items.map(it => `
        <div class="ps-row ${it.product_id === highlightId ? 'is-new' : ''}">
          <div class="ps-row-info">
            <div class="ps-row-name">${escapeHtml(it.product_name)}</div>
            <div class="ps-row-price">฿${money(it.price)} × ${it.qty} = <strong>฿${money(it.price * it.qty)}</strong></div>
          </div>
          <div class="ps-qty">
            <button type="button" class="ps-qty-btn" aria-label="ลด" onclick="changePhoneScanQty('${escapeHtml(it.product_id)}',-1)">${it.qty === 1 ? '🗑' : '−'}</button>
            <span class="ps-qty-val">${it.qty}</span>
            <button type="button" class="ps-qty-btn" aria-label="เพิ่ม" onclick="changePhoneScanQty('${escapeHtml(it.product_id)}',1)">+</button>
          </div>
        </div>`).join('');
    }
    const t = totals();
    const count = $('psCount');
    const total = $('psTotal');
    const payBtn = $('psPayBtn');
    const sendBtn = $('psSendBtn');
    const clear = $('psClearBtn');
    if (count) count.textContent = t.qty ? `${t.lines} รายการ · ${t.qty} ชิ้น` : 'ยังไม่มีสินค้า';
    if (total) total.textContent = `฿${money(t.amount)}`;
    if (payBtn) { payBtn.disabled = !t.qty || busy; payBtn.textContent = t.qty ? `💰 คิดเงิน ฿${money(t.amount)}` : '💰 คิดเงิน'; }
    if (sendBtn) sendBtn.disabled = !t.qty || busy;
    if (clear) clear.hidden = !t.qty;
  }

  // ---------------------------------------------------------
  // Device tally: "เครื่อง A · วันนี้ 3 บิล · ฿1,250"
  // ---------------------------------------------------------
  function mySalesToday() {
    const st = appState();
    const me = terminalName().trim().toUpperCase();
    const today = todayISO();
    return (st?.sales || []).filter(s =>
      s.sale_date === today &&
      String(s.terminal_code || '').trim().toUpperCase() === me &&
      !s.is_cancelled
    );
  }

  function tally() {
    const sales = mySalesToday();
    const cash = sales.filter(s => !isQr(s.payment_method));
    const qr = sales.filter(s => isQr(s.payment_method));
    const sum = (arr) => arr.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    return {
      sales,
      bills: sales.length,
      total: sum(sales),
      cashBills: cash.length, cashTotal: sum(cash),
      qrBills: qr.length, qrTotal: sum(qr),
      pending: sales.filter(s => s.is_pending_sync).length
    };
  }

  function renderTally() {
    const t = tally();
    const name = $('psDeviceName');
    const line = $('psTally');
    if (name) name.textContent = terminalName();
    if (line) line.textContent = `วันนี้ ${t.bills} บิล · ฿${money(t.total)}`;
    if (!$('psSummary')?.hidden) renderSummary();
  }

  function openPhoneSummary() {
    renderSummary();
    showSheet('psSummary');
  }
  function closePhoneSummary() {
    hideSheet('psSummary');
    resumeIfIdle();
  }

  function renderSummary() {
    const box = $('psSummaryBody');
    if (!box) return;
    const t = tally();
    const target = window.getRemoteTarget?.() || 'ALL';
    const choices = window.remoteTerminalChoices?.() || ['ALL'];
    if (!choices.includes(target)) choices.push(target);
    const autoOpen = lsGet(MODE_KEY, 'false') === 'true';
    const dateTh = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    box.innerHTML = `
      <div class="ps-sum-hero">
        <div class="ps-sum-device">${escapeHtml(terminalName())}</div>
        <div class="ps-sum-date">ยอดขายวันนี้ • ${escapeHtml(dateTh)}</div>
        <div class="ps-sum-total">฿${money(t.total)}</div>
        <div class="ps-sum-bills">${t.bills} บิล</div>
      </div>

      <div class="ps-sum-grid">
        <div class="ps-sum-cell">
          <span>💵 เงินสด</span>
          <strong>฿${money(t.cashTotal)}</strong>
          <small>${t.cashBills} บิล</small>
        </div>
        <div class="ps-sum-cell">
          <span>📱 โอน / QR</span>
          <strong>฿${money(t.qrTotal)}</strong>
          <small>${t.qrBills} บิล</small>
        </div>
      </div>

      ${(() => {
        const h = window.getHandoverInfo?.(terminalName()) || { received: 0, count: 0 };
        const left = Math.round((t.cashTotal - h.received) * 100) / 100;
        return `
      <div class="ps-sum-handover">
        <span>เงินสดที่ต้องส่งศูนย์กลาง${h.count ? '' : ' (ไม่รวมเงินทอนตั้งต้น)'}</span>
        <strong>฿${money(Math.max(0, left))}</strong>
      </div>
      ${h.count ? `<div class="ps-sum-sent">ขายเงินสดได้ ฿${money(t.cashTotal)} · ส่งศูนย์กลางแล้ว ${h.count} ครั้ง ฿${money(h.received)}${left < -0.009 ? ` · <b>ส่งเกิน ฿${money(-left)}</b>` : ''}</div>` : ''}`;
      })()}
      ${t.pending ? `<div class="ps-notice is-warn">⏳ ${t.pending} บิลยังไม่ซิงค์ขึ้นระบบ • ต่ออินเทอร์เน็ตแล้วระบบจะส่งเอง</div>` : ''}

      <h3 class="ps-sum-h">บิลของเครื่องนี้วันนี้</h3>
      <div class="ps-sum-list">
        ${t.sales.length ? t.sales.slice(0, 60).map(s => `
          <div class="ps-sum-bill">
            <span class="ps-sum-time">${escapeHtml(String(s.sale_time || '').slice(0, 5))}</span>
            <span class="ps-sum-no">${escapeHtml(s.sale_no || '')}${s.is_pending_sync ? ' <em>รอซิงค์</em>' : ''}</span>
            <span class="ps-sum-pm ${isQr(s.payment_method) ? 'is-qr' : ''}">${isQr(s.payment_method) ? 'QR' : 'เงินสด'}</span>
            <strong>฿${money(s.total_amount)}</strong>
          </div>`).join('') : '<div class="ps-empty-small">ยังไม่มีบิลวันนี้</div>'}
      </div>

      <h3 class="ps-sum-h">ตั้งค่าเครื่องนี้</h3>
      <label class="ps-field">
        <span>ชื่อเครื่อง (แสดงในรายงานแยกเครื่อง)</span>
        <span class="ps-field-row">
          <input id="psDeviceInput" type="text" maxlength="20" value="${escapeHtml(terminalName())}" placeholder="เช่น เครื่อง A">
          <button type="button" class="ps-btn-secondary" onclick="savePhoneDeviceName()">บันทึก</button>
        </span>
      </label>
      <label class="ps-field">
        <span>ปุ่ม 📤 ส่งบิลไปเครื่องคิดเงิน (แท็บเล็ต)</span>
        <select class="ps-select" onchange="setRemoteTarget(this.value)">
          ${choices.map(c => `<option value="${escapeHtml(c)}" ${c === target ? 'selected' : ''}>${c === 'ALL' ? 'ส่งทุกเครื่องคิดเงิน' : 'ส่งไป ' + escapeHtml(c)}</option>`).join('')}
        </select>
      </label>
      <label class="ps-switch-row">
        <span>เปิดหน้านี้ทันทีเมื่อเปิดแอป (ใช้มือถือเป็นเครื่องคิดเงิน)</span>
        <input type="checkbox" ${autoOpen ? 'checked' : ''} onchange="setPhoneCashierMode(this.checked)">
      </label>
      <button type="button" class="ps-btn-secondary ps-btn-block" onclick="closePhoneScan()">เปิดแอปเต็ม (สต็อก / รายงาน / ตั้งค่า)</button>
    `;
  }

  function savePhoneDeviceName() {
    const v = String($('psDeviceInput')?.value || '').trim().slice(0, 20);
    if (!v) { notice('กรุณาใส่ชื่อเครื่อง', 'warn'); return; }
    const st = appState();
    if (st) st.terminal = v;
    try { localStorage.setItem(typeof TERMINAL_KEY !== 'undefined' ? TERMINAL_KEY : 'ea_fairsale_terminal', v); } catch (e) {}
    window.refreshRemoteInbox?.();
    renderTally();
    notice(`ตั้งชื่อเครื่องเป็น "${v}" แล้ว • บิลใหม่จะบันทึกในชื่อนี้`, 'info');
  }

  function setPhoneCashierMode(on) {
    lsSet(MODE_KEY, on ? 'true' : 'false');
    notice(on ? 'เปิดแอปครั้งถัดไปจะเข้าหน้านี้ทันที' : 'ปิดการเปิดหน้านี้อัตโนมัติแล้ว', 'info');
  }

  // ---------------------------------------------------------
  // Payment (คิดเงิน)
  // ---------------------------------------------------------
  function quickAmounts(total) {
    const set = new Set([total]);
    [20, 50, 100, 500, 1000].forEach(n => { const v = Math.ceil(total / n) * n; if (v >= total) set.add(v); });
    return [...set].sort((a, b) => a - b).slice(0, 6);
  }

  function openPhonePay() {
    if (!items.length || busy) return;
    syncPrices();
    renderList();
    pay = { method: 'cash', received: '' };
    renderPay();
    showSheet('psPay');
  }
  function closePhonePay() {
    hideSheet('psPay');
    resumeIfIdle();
  }

  function setPhonePayMethod(m) {
    pay.method = m === 'promptpay' ? 'promptpay' : 'cash';
    renderPay();
  }
  function setPhonePayReceived(v) {
    pay.received = v === '' ? '' : Number(v);
    renderPay(true);
  }

  function renderPay(keepInput) {
    const body = $('psPayBody');
    if (!body) return;
    const t = totals();
    const total = t.amount;
    const rec = Number(pay.received || 0);
    const change = rec >= total ? rec - total : 0;
    const short = pay.method === 'cash' && rec > 0 && rec < total;
    const missing = pay.method === 'cash' && pay.received === '';   // cashier must enter what was received
    const blocked = short || missing;
    const changeHtml = missing ? 'กดยอดเงินที่รับมา หรือพิมพ์จำนวน'
      : short ? `ยังขาด <strong>฿${money(total - rec)}</strong>` : `เงินทอน <strong>฿${money(change)}</strong>`;
    const changeCls = `ps-pay-change ${short ? 'is-short' : ''} ${missing ? 'is-missing' : ''}`;

    if (keepInput) {
      // Update only the parts that change while typing (keep focus in the input)
      const ch = $('psPayChange');
      if (ch) {
        ch.className = changeCls;
        ch.innerHTML = changeHtml;
      }
      document.querySelectorAll('.ps-quick-btn').forEach(b => b.classList.toggle('is-active', Number(b.dataset.v) === rec));
      const c = $('psPayConfirm');
      if (c) c.disabled = blocked || busy;
      return;
    }

    const promptPayRaw = appState()?.settings?.promptPayId || appState()?.settings?.shopPhone || '';
    const promptPayClean = String(promptPayRaw).replace(/[^0-9]/g, '');

    body.innerHTML = `
      <div class="ps-pay-total">
        <span>ยอดที่ต้องรับ · ${t.lines} รายการ ${t.qty} ชิ้น</span>
        <strong>฿${money(total)}</strong>
      </div>
      <div class="ps-seg">
        <button type="button" class="${pay.method === 'cash' ? 'is-active' : ''}" onclick="setPhonePayMethod('cash')">💵 เงินสด</button>
        <button type="button" class="${pay.method === 'promptpay' ? 'is-active' : ''}" onclick="setPhonePayMethod('promptpay')">📱 โอน / QR</button>
      </div>
      ${pay.method === 'cash' ? `
        <div class="ps-quick">
          ${quickAmounts(total).map((v, i) => `<button type="button" class="ps-quick-btn ${rec === v ? 'is-active' : ''}" data-v="${v}" onclick="setPhonePayReceived(${v}); document.getElementById('psPayInput').value='${v}'">${i === 0 ? 'พอดี' : '฿' + money(v).replace('.00', '')}</button>`).join('')}
        </div>
        <label class="ps-pay-input">
          <span>รับเงินมา</span>
          <input id="psPayInput" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${pay.received === '' ? '' : pay.received}" oninput="setPhonePayReceived(this.value)">
        </label>
        <div id="psPayChange" class="${changeCls}">${changeHtml}</div>
      ` : `
        <div class="ps-qr">
          ${promptPayClean ? `
            <img src="https://promptpay.io/${promptPayClean}/${total.toFixed(2)}.png" alt="PromptPay QR" width="200" height="200"
                 onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ps-qr-fallback',textContent:'พร้อมเพย์ ${promptPayClean}'}))">
            <div class="ps-qr-id">พร้อมเพย์ ${escapeHtml(promptPayRaw)}</div>
          ` : `<div class="ps-notice is-warn">ยังไม่ได้ตั้งเบอร์พร้อมเพย์ (ตั้งค่าในแอปเต็ม → ตั้งค่า)</div>`}
          <div class="ps-qr-hint">ตรวจว่าเงินเข้าแล้ว จึงกดยืนยัน</div>
        </div>
      `}
      <button type="button" id="psPayConfirm" class="ps-pay-confirm" onclick="confirmPhonePay()" ${blocked ? 'disabled' : ''}>
        ✅ ยืนยันรับเงิน ฿${money(total)}
      </button>
    `;
  }

  async function confirmPhonePay() {
    if (busy || !items.length) return;
    const st = appState();
    if (!st || typeof checkoutCart !== 'function') return;

    syncPrices();
    const total = totals().amount;
    const rec = Number(pay.received || 0);
    if (pay.method === 'cash' && (pay.received === '' || rec < total)) { renderPay(true); return; }

    // Build the POS cart from this bill (current product prices)
    const cart = [];
    for (const it of items) {
      const p = products().find(x => x.id === it.product_id);
      if (!p) { notice(`ไม่พบสินค้า ${it.product_name} ในระบบ • กดรีเฟรชข้อมูลในแอปเต็ม`, 'error'); return; }
      cart.push({
        product_id: p.id,
        name: p.product_name,
        barcode: p.barcode || '',
        unit: p.unit || p.unit_name || 'ชิ้น',
        qty: it.qty,
        unit_price: Number(p.sale_price || 0),
        original_price: Number(p.sale_price || 0),
        stock: Number(p.stock_qty || 0),
        discount_note: '',
        is_discounted: false
      });
    }

    busy = true;
    const btn = $('psPayConfirm');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    const prevBill = st.lastBill;
    const prevCart = st.cart;
    st.cart = cart;
    st.billDiscount = { type: 'none', value: 0, note: '' };
    st.paymentMethod = pay.method;
    st.receivedCash = pay.method === 'cash' ? (rec || total) : 0;

    try {
      await checkoutCart();
    } catch (e) {
      console.error('Phone checkout error:', e);
    }

    // checkoutCart opens the desktop receipt dialog; the phone shows its own result.
    const receipt = $('receiptDialog');
    if (receipt?.open) receipt.close();

    const ok = st.cart.length === 0 && st.lastBill && st.lastBill !== prevBill;
    busy = false;
    if (!ok) {
      st.cart = prevCart || [];
      try { saveCartLocal(); } catch (e) {}
      if (btn) { btn.disabled = false; btn.textContent = `✅ ยืนยันรับเงิน ฿${money(total)}`; }
      notice('บันทึกบิลไม่สำเร็จ • ตรวจข้อความแจ้งเตือน แล้วลองใหม่', 'error');
      return;
    }

    const bill = st.lastBill;
    items = [];
    saveItems();
    renderList();
    hideSheet('psPay');
    sound('beepSuccess');
    vibrate([60, 60, 160]);
    showDone({
      icon: '✓',
      title: pay.method === 'cash' ? 'รับเงินสดแล้ว' : 'รับเงินโอน/QR แล้ว',
      label: pay.method === 'cash' ? 'เงินทอน' : 'ยอดที่รับ',
      big: `฿${money(pay.method === 'cash' ? bill.change : bill.total)}`,
      meta: `บิล ${bill.saleNo} · ยอด ฿${money(bill.total)}${pay.method === 'cash' ? ` · รับมา ฿${money(bill.received)}` : ''}`,
      offline: /^S\d/.test(String(bill.saleNo || '')),
      canCancel: false
    });
    renderTally();
  }

  // ---------------------------------------------------------
  // Send to tablet (secondary)
  // ---------------------------------------------------------
  async function sendPhoneScan() {
    if (busy || !items.length) return;
    const target = window.getRemoteTarget?.() || 'ALL';
    if (!confirm(`ส่งรายการนี้ไปให้${target === 'ALL' ? 'เครื่องคิดเงิน (แท็บเล็ต)' : ' ' + target} คิดเงินแทน?`)) return;
    busy = true;
    renderList();
    paused = true;
    try {
      const t = totals();
      const data = await window.sendRemoteCartItems(items);
      lastSent = data;
      items = [];
      saveItems();
      sound('beepSuccess');
      vibrate([60, 60, 160]);
      showDone({
        icon: '📤',
        title: target === 'ALL' ? 'ส่งไปเครื่องคิดเงินแล้ว' : `ส่งไป ${target} แล้ว`,
        label: 'เลขบิล • บอกลูกค้า',
        big: data.ticket_no,
        meta: `${data.item_count} รายการ · ${Number(data.total_qty)} ชิ้น · ประมาณ ฿${money(data.est_total ?? t.amount)}`,
        canCancel: true
      });
    } catch (err) {
      paused = false;
      notice('ส่งไม่สำเร็จ: ' + (err?.message || err), 'error');
      sound('beepError');
    } finally {
      busy = false;
      renderList();
    }
  }

  function showDone(o) {
    const d = $('psDone');
    if (!d) return;
    $('psDoneBody').innerHTML = `
      <div class="ps-done-check">${escapeHtml(o.icon)}</div>
      <div class="ps-done-target">${escapeHtml(o.title)}</div>
      <div class="ps-done-label">${escapeHtml(o.label)}</div>
      <div class="ps-done-ticket">${escapeHtml(o.big)}</div>
      <div class="ps-done-meta">${escapeHtml(o.meta)}</div>
      ${o.offline ? '<div class="ps-notice is-warn">ออฟไลน์อยู่ • บิลเก็บในเครื่องแล้ว จะซิงค์เองเมื่อมีเน็ต</div>' : ''}
      <button type="button" class="ps-done-next" onclick="newPhoneScanBill()">เริ่มบิลถัดไป</button>
      ${o.canCancel ? '<button type="button" class="ps-done-cancel" onclick="cancelLastPhoneScanBill()">ยกเลิกบิลที่ส่ง</button>' : ''}
    `;
    showSheet('psDone');
  }

  function newPhoneScanBill() {
    hideSheet('psDone');
    lastSent = null;
    lastCode = '';
    resumeIfIdle();
  }

  async function cancelLastPhoneScanBill() {
    if (!lastSent) return;
    if (!confirm(`ยกเลิกบิล ${lastSent.ticket_no}?`)) return;
    try {
      const ok = await window.cancelRemoteCartRaw(lastSent.id);
      if (ok) { newPhoneScanBill(); notice(`ยกเลิกบิล ${lastSent?.ticket_no || ''} แล้ว`, 'info'); }
      else notice('ยกเลิกไม่ได้ เครื่องคิดเงินรับบิลไปแล้ว', 'warn');
    } catch (err) {
      notice('ยกเลิกไม่สำเร็จ: ' + (err?.message || err), 'error');
    }
  }

  // ---------------------------------------------------------
  function init() {
    const dlg = $('phoneScanDialog');
    if (!dlg) return;
    dlg.addEventListener('close', () => { stopCamera(); releaseWakeLock(); document.documentElement.classList.remove('ps-open'); });
    // Android back / Esc: close sheets first instead of leaving the cashier screen
    dlg.addEventListener('cancel', (e) => {
      if (anySheetOpen()) {
        e.preventDefault();
        hideSheet('psPay'); hideSheet('psSummary'); hideSheet('psDone');
        resumeIfIdle();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!dlg.open) return;
      if (document.hidden) stopCamera();
      else { requestWakeLock(); startCamera(); renderTally(); }
    });
    window.EaOfflineSync?.onSyncComplete?.(() => setTimeout(renderTally, 1500));
    window.addEventListener('ea:data-refreshed', () => { if (dlg.open) renderTally(); });

    // Opened from the hub QR code: ?cashier=<station name>
    let fromQr = false;
    try {
      const params = new URLSearchParams(location.search);
      const station = String(params.get('cashier') || '').trim().slice(0, 20);
      if (station) {
        fromQr = true;
        const st = appState();
        if (st) st.terminal = station;
        try { localStorage.setItem(typeof TERMINAL_KEY !== 'undefined' ? TERMINAL_KEY : 'ea_fairsale_terminal', station); } catch (e) {}
        lsSet(MODE_KEY, 'true');
        params.delete('cashier');
        const q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
      }
    } catch (e) {}

    // Phone cashier mode: open this screen when the app starts
    if (fromQr || lsGet(MODE_KEY, 'false') === 'true') {
      const started = Date.now();
      const wait = setInterval(() => {
        const st = appState();
        if ((st && !st.loading && st.products?.length) || Date.now() - started > 8000) {
          clearInterval(wait);
          openPhoneScan().then(() => { if (fromQr) notice(`พร้อมคิดเงินที่จุด "${terminalName()}" • ยอดของจุดนี้จะส่งเข้าศูนย์กลาง`, 'info'); });
        }
      }, 300);
    }
    setInterval(() => { if (dlg.open) renderTally(); }, 15000);
  }

  Object.assign(window, {
    openPhoneScan,
    closePhoneScan,
    restartPhoneScanCamera: startCamera,
    togglePhoneScanTorch,
    phoneScanManual,
    phoneScanSearchInput,
    phoneScanPick,
    changePhoneScanQty,
    clearPhoneScan,
    openPhonePay,
    closePhonePay,
    setPhonePayMethod,
    setPhonePayReceived,
    confirmPhonePay,
    openPhoneSummary,
    closePhoneSummary,
    savePhoneDeviceName,
    setPhoneCashierMode,
    sendPhoneScan,
    newPhoneScanBill,
    cancelLastPhoneScanBill
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
