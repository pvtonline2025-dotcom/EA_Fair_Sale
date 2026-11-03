/**
 * EA Fair Sale - Phone Scan screen (หน้าสแกนสำหรับมือถือ)
 *
 * หน้าจอเต็มจอสำหรับมือถือ: กล้องด้านบน • รายการสินค้าปุ่มใหญ่ • ปุ่มส่งบิลติดด้านล่าง
 * ส่งไปเครื่องคิดเงินผ่าน sendRemoteCartItems() (js/remote-cart.js)
 *
 * Uses globals from app.js: state, money, escapeHtml, productByBarcode, beepBatchAdd,
 *   beepSuccess, beepError, stopScanner
 */
(function () {
  const STORE_KEY = 'ea_phone_scan_items';
  const SAME_CODE_MS = 1500;   // ignore the same barcode seen again within this time
  const ANY_CODE_MS = 600;     // minimum gap between two accepted scans

  let items = loadItems();     // [{product_id, product_name, barcode, unit, price, stock, qty}]
  let reader = null;
  let controls = null;
  let paused = false;
  let torchOn = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let lastAcceptAt = 0;
  let sending = false;
  let lastSent = null;
  let wakeLock = null;
  let noticeTimer = null;
  let feedbackTimer = null;

  const $ = (id) => document.getElementById(id);

  function loadItems() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]').filter(x => x && x.product_id); }
    catch (e) { return []; }
  }
  function saveItems() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function appState() { return window.getEaAppState?.() || null; }
  function products() { return appState()?.products || []; }
  function vibrate(p) { try { navigator.vibrate?.(p); } catch (e) {} }
  function sound(fn) { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {} }

  // ---------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------
  async function openPhoneScan() {
    const dlg = $('phoneScanDialog');
    if (!dlg) return;
    try { if (typeof stopScanner === 'function') stopScanner(); } catch (e) {}
    renderTarget();
    renderList();
    hideDone();
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

  // ---------------------------------------------------------
  // Camera
  // ---------------------------------------------------------
  async function startCamera() {
    const video = $('psVideo');
    const msg = $('psCamMsg');
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
      if (msg) msg.hidden = true;
      const torchBtn = $('psTorchBtn');
      if (torchBtn) torchBtn.hidden = !canTorch();
      torchOn = false;
      updateTorchBtn();
    } catch (err) {
      console.warn('Phone scan camera error:', err);
      const name = err?.name || '';
      showCamMsg(name === 'NotAllowedError'
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
      items = [it, ...items.filter(x => x !== it)]; // move to top
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
    noticeTimer = setTimeout(() => { n.hidden = true; }, 3500);
  }

  // ---------------------------------------------------------
  // Manual entry (when the barcode will not scan)
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

  function totals() {
    return {
      lines: items.length,
      qty: items.reduce((s, x) => s + x.qty, 0),
      amount: items.reduce((s, x) => s + x.qty * x.price, 0)
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
    const send = $('psSendBtn');
    const clear = $('psClearBtn');
    if (count) count.textContent = t.qty ? `${t.lines} รายการ · ${t.qty} ชิ้น` : 'ยังไม่มีสินค้า';
    if (total) total.textContent = `฿${money(t.amount)}`;
    if (send) send.disabled = !t.qty || sending;
    if (clear) clear.hidden = !t.qty;
  }

  function renderTarget() {
    const sel = $('psTarget');
    if (!sel) return;
    const target = window.getRemoteTarget?.() || 'ALL';
    const choices = window.remoteTerminalChoices?.() || ['ALL'];
    if (!choices.includes(target)) choices.push(target);
    sel.innerHTML = choices.map(c => `<option value="${escapeHtml(c)}" ${c === target ? 'selected' : ''}>${c === 'ALL' ? 'ส่งทุกเครื่อง' : 'ส่ง ' + escapeHtml(c)}</option>`).join('');
  }

  // ---------------------------------------------------------
  // Send
  // ---------------------------------------------------------
  async function sendPhoneScan() {
    if (sending || !items.length) return;
    sending = true;
    const btn = $('psSendBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังส่ง...'; }
    paused = true;
    try {
      const sentTotal = totals();
      const data = await window.sendRemoteCartItems(items);
      lastSent = data;
      items = [];
      saveItems();
      renderList();
      sound('beepSuccess');
      vibrate([60, 60, 160]);
      showDone(data, sentTotal);
    } catch (err) {
      paused = false;
      notice('ส่งไม่สำเร็จ: ' + (err?.message || err), 'error');
      sound('beepError');
    } finally {
      sending = false;
      if (btn) btn.textContent = '📤 ส่งไปเครื่องคิดเงิน';
      renderList();
    }
  }

  function showDone(data, t) {
    const d = $('psDone');
    if (!d) return;
    const target = window.getRemoteTarget?.() || 'ALL';
    $('psDoneTicket').textContent = data.ticket_no;
    $('psDoneMeta').textContent = `${data.item_count} รายการ · ${Number(data.total_qty)} ชิ้น · ประมาณ ฿${money(data.est_total ?? t.amount)}`;
    $('psDoneTarget').textContent = target === 'ALL' ? 'ส่งไปทุกเครื่องคิดเงินแล้ว' : `ส่งไปเครื่อง ${target} แล้ว`;
    d.hidden = false;
  }

  function hideDone() {
    const d = $('psDone');
    if (d) d.hidden = true;
  }

  function newPhoneScanBill() {
    hideDone();
    lastSent = null;
    paused = false;
    lastCode = '';
  }

  async function cancelLastPhoneScanBill() {
    if (!lastSent) return;
    if (!confirm(`ยกเลิกบิล ${lastSent.ticket_no}?`)) return;
    try {
      const ok = await window.cancelRemoteCartRaw(lastSent.id);
      if (ok) {
        notice(`ยกเลิกบิล ${lastSent.ticket_no} แล้ว`, 'info');
        newPhoneScanBill();
      } else {
        notice('ยกเลิกไม่ได้ เครื่องคิดเงินรับบิลไปแล้ว', 'warn');
      }
    } catch (err) {
      notice('ยกเลิกไม่สำเร็จ: ' + (err?.message || err), 'error');
    }
  }

  // ---------------------------------------------------------
  function init() {
    const dlg = $('phoneScanDialog');
    if (!dlg) return;
    // Esc / Android back button closes the dialog: make sure the camera stops.
    dlg.addEventListener('close', () => { stopCamera(); releaseWakeLock(); document.documentElement.classList.remove('ps-open'); });
    document.addEventListener('visibilitychange', () => {
      if (!dlg.open) return;
      if (document.hidden) stopCamera();
      else { requestWakeLock(); startCamera(); }
    });
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
    sendPhoneScan,
    newPhoneScanBill,
    cancelLastPhoneScanBill
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
