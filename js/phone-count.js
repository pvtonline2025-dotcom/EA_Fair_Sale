/**
 * EA Fair Sale - มือถือช่วยตรวจนับสต็อก
 *
 * มือถือ: สแกน QR จากแท็บเล็ต (?count=1) → เปิดหน้า "ตรวจนับสต็อก"
 *   สแกนบาร์โค้ด/ค้นหาสินค้า → ใส่จำนวนที่นับได้ → ยืนยันส่ง
 * แท็บเล็ตหลัก (หน้าตรวจนับสต็อก): ยอดจากมือถือเข้ามาทันที (Realtime)
 *   รวมเข้า "ยอดนับจริง" ของสินค้านั้น • กดบันทึกปรับสต็อกที่แท็บเล็ตเหมือนเดิม
 *
 * ต้องรัน database/migrations/migration_v16_stock_counts.sql ก่อน
 * Uses globals: getEaAppState, getEaSupabaseClient, toast, escapeHtml, getStaffName, setStaffName,
 *   productByBarcode, initPhysicalAuditState, rerenderAuditView, applyStockAuditAdjustments, ZXingBrowser, qrcode
 */
// เปิดจาก QR ตรวจนับ: บอกหน้าขายมือถือไม่ต้องเปิดเอง
try { window.__eaCountMode = /[?&]count=/.test(location.search); } catch (_) {}
(function () {
  const st = () => window.getEaAppState?.() || null;
  const sb = () => window.getEaSupabaseClient?.() || null;
  const esc = s => (typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const toast = (m, ms) => (typeof window.toast === 'function' ? window.toast(m, ms) : console.log(m));
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 });
  const IGNORE_KEY = 'ea_count_ignore';
  const isMissing = e => /PGRST202|PGRST205|could not find|schema cache|does not exist|404/i.test(`${e?.code || ''} ${e?.message || ''} ${e?.status || ''}`);

  let pending = [];          // ยอดนับที่รอแท็บเล็ตบันทึก (ทุกเครื่อง)
  let ready = null;          // null = ยังไม่รู้ • false = ยังไม่ได้รัน V16
  let loadingP = null;

  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function ignored() { try { return new Set(JSON.parse(lsGet(IGNORE_KEY, '[]'))); } catch (_) { return new Set(); } }
  function addIgnored(ids) { const s = ignored(); ids.forEach(i => s.add(i)); lsSet(IGNORE_KEY, JSON.stringify([...s].slice(-500))); }

  async function rpc(p) {
    const c = sb();
    if (!c) throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล');
    if (!navigator.onLine) throw new Error('ออฟไลน์อยู่ • ส่งยอดนับต้องใช้อินเทอร์เน็ต');
    const { data, error } = await c.rpc('ea_stock_count', { p });
    if (error) {
      if (isMissing(error)) { ready = false; throw new Error('ยังไม่ได้รัน V16 (migration_v16_stock_counts.sql) ใน Supabase'); }
      throw new Error(error.message || 'ส่งไม่สำเร็จ');
    }
    ready = true;
    return data;
  }

  async function loadPending() {
    if (loadingP) return loadingP;
    loadingP = (async () => {
      const c = sb(); if (!c || !navigator.onLine || ready === false) return pending;
      const since = new Date(Date.now() - 2 * 86400000).toISOString();
      const r = await c.from('ea_stock_counts').select('*').gte('created_at', since).order('created_at', { ascending: true }).limit(3000);
      if (r.error) { if (isMissing(r.error) || r.status === 404) ready = false; return pending; }
      ready = true;
      allRows = r.data || [];
      pending = allRows.filter(x => x.status === 'pending');
      return pending;
    })().finally(() => { loadingP = null; });
    return loadingP;
  }
  let allRows = [];

  // =========================================================
  // แท็บเล็ต: รวมยอดจากมือถือเข้าหน้าตรวจนับ
  // =========================================================
  function mergeRemoteCounts() {
    const s = st(); if (!s || !s.auditCounts) return;
    if (s._remoteFor !== s.auditCounts) { s._remoteFor = s.auditCounts; s.auditRemoteMerged = {}; s.auditRemoteTouched = {}; }
    const merged = s.auditRemoteMerged || (s.auditRemoteMerged = {});
    const ign = ignored();
    const live = new Map(pending.filter(e => !ign.has(e.id)).map(e => [e.id, e]));
    let changed = false;
    // ยอดที่ถูกยกเลิก/บันทึกไปแล้ว → เอาออก
    for (const [id, m] of Object.entries(merged)) {
      if (live.has(id)) continue;
      const applied = allRows.find(x => x.id === id && x.status === 'applied');
      if (!applied && s.auditTouched[m.pid]) s.auditCounts[m.pid] = Math.max(0, Number(s.auditCounts[m.pid] || 0) - m.qty);
      delete merged[id]; changed = true;
      // นับจากมือถืออย่างเดียว แล้วยกเลิกหมด → กลับเป็น "ยังไม่นับ" (ไม่ไปตั้งสต็อกเป็น 0)
      const rt = s.auditRemoteTouched || {};
      if (!applied && rt[m.pid] && !Object.values(merged).some(x => x.pid === m.pid) && !Number(s.auditCounts[m.pid] || 0)) {
        delete s.auditTouched[m.pid]; delete rt[m.pid];
        const p = (s.products || []).find(x => x.id === m.pid); if (p) s.auditCounts[m.pid] = Number(p.stock_qty || 0);
      }
    }
    // ยอดใหม่ → บวกเข้า "ยอดนับจริง"
    for (const e of live.values()) {
      if (merged[e.id]) continue;
      const p = (s.products || []).find(x => x.id === e.product_id); if (!p) continue;
      if (!s.auditTouched[p.id]) { s.auditCounts[p.id] = 0; s.auditTouched[p.id] = true; (s.auditRemoteTouched || (s.auditRemoteTouched = {}))[p.id] = true; }
      s.auditCounts[p.id] = Number(s.auditCounts[p.id] || 0) + Number(e.qty || 0);
      window.markAuditCounted?.(p.id, Date.parse(e.created_at) || Date.now());   // ขายหลังเวลานับในมือถือ → หักให้
      merged[e.id] = { pid: p.id, qty: Number(e.qty || 0), who: e.staff_name || e.device || 'มือถือ', at: e.created_at };
      changed = true;
    }
    return changed;
  }
  function remoteLine(p) {
    const s = st(); const merged = s?.auditRemoteMerged; if (!merged) return '';
    const rows = Object.values(merged).filter(m => m.pid === p.id);
    if (!rows.length) return '';
    return `<div class="audit-remote-line">📱 ${rows.map(m => `${fmt(m.qty)} (${esc(m.who)})`).join(' + ')}</div>`;
  }
  function remoteBadge() {
    const n = Object.keys(st()?.auditRemoteMerged || {}).length;
    return n ? `<span class="audit-remote-badge">${n}</span>` : '';
  }

  // บันทึกปรับสต็อกสำเร็จ → ทำเครื่องหมายยอดจากมือถือว่า "ปรับแล้ว"
  function hookAudit() {
    const origApply = window.applyStockAuditAdjustments;
    if (typeof origApply === 'function' && !origApply.__eaCount) {
      const wrapped = async function () {
        const s = st();
        const before = Object.entries(s?.auditRemoteMerged || {});
        const r = await origApply.apply(this, arguments);
        const done = before.filter(([, m]) => !st()?.auditTouched?.[m.pid]).map(([id]) => id);
        if (done.length) {
          try { await rpc({ action: 'apply', ids: done }); } catch (e) { console.warn('[count] apply mark', e); addIgnored(done); }
          done.forEach(id => { delete st()?.auditRemoteMerged?.[id]; });
          pending = pending.filter(e => !done.includes(e.id));
          allRows.forEach(x => { if (done.includes(x.id)) x.status = 'applied'; });
        }
        return r;
      };
      wrapped.__eaCount = true;
      window.applyStockAuditAdjustments = wrapped;
    }
    const origReset = window.setAllAuditToSystem;
    if (typeof origReset === 'function' && !origReset.__eaCount) {
      const w = function () { addIgnored(pending.map(e => e.id)); const s = st(); if (s) s.auditRemoteMerged = {}; return origReset.apply(this, arguments); };
      w.__eaCount = true; window.setAllAuditToSystem = w;
    }
    const origOne = window.resetAuditProductToSystem;
    if (typeof origOne === 'function' && !origOne.__eaCount) {
      const w = function (pid) {
        const s = st(); const merged = s?.auditRemoteMerged || {};
        const ids = Object.keys(merged).filter(id => merged[id].pid === pid);
        addIgnored(ids); ids.forEach(id => delete merged[id]);
        return origOne.apply(this, arguments);
      };
      w.__eaCount = true; window.resetAuditProductToSystem = w;
    }
    const origZero = window.setAllAuditToZero;
    if (typeof origZero === 'function' && !origZero.__eaCount) {
      const w = function () {
        const r = origZero.apply(this, arguments);
        const s = st();
        Object.values(s?.auditRemoteMerged || {}).forEach(m => { s.auditCounts[m.pid] = Number(s.auditCounts[m.pid] || 0) + m.qty; });
        window.rerenderAuditView?.();
        return r;
      };
      w.__eaCount = true; window.setAllAuditToZero = w;
    }
  }

  let seenToast = new Set();
  async function onRemoteChange() {
    await loadPending();
    const s = st(); if (!s) return;
    if (countOpen() || $('phoneScanDialog')?.open) return;     // มือถือ: ไม่ต้องรวม
    const fresh = pending.filter(e => !seenToast.has(e.id) && !ignored().has(e.id));
    fresh.forEach(e => seenToast.add(e.id));
    if (s.page === 'audit') {
      window.initPhysicalAuditState?.(false);
      const a = document.activeElement;
      const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !(a.id === 'auditBarcodeInput' && !a.value);
      if (!typing) window.rerenderAuditView?.();
    }
    if (fresh.length && boot) {
      const e = fresh[fresh.length - 1];
      toast(`📱 ${e.staff_name || e.device || 'มือถือ'} นับ ${e.product_name} = ${fmt(e.qty)}${fresh.length > 1 ? ` (+${fresh.length - 1} รายการ)` : ''}${s.page === 'audit' ? '' : ' • เปิดหน้าตรวจนับเพื่อบันทึก'}`, 4500);
      try { window.beepSuccess?.(); } catch (_) {}
    }
  }

  // QR ให้มือถือสแกนเข้าหน้าตรวจนับ
  function countUrl() { return `${location.origin}${location.pathname}?count=1`; }
  function showCountQr() {
    let dlg = $('countQrDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'countQrDialog'; dlg.className = 'count-qr-dialog'; document.body.appendChild(dlg); }
    let svg = '';
    try { const q = window.qrcode(0, 'M'); q.addData(countUrl()); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (_) {}
    const n = pending.filter(e => !ignored().has(e.id)).length;
    dlg.innerHTML = `
      <div class="cqr-head"><strong>📱 มือถือช่วยนับสต็อก</strong><button type="button" class="cqr-x" onclick="document.getElementById('countQrDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="cqr-body">
        <div class="cqr-qr">${svg || '<p>โหลดตัวสร้าง QR ไม่สำเร็จ</p>'}</div>
        <ol class="cqr-steps">
          <li>ใช้กล้องมือถือสแกน QR นี้ → เปิดหน้า <b>ตรวจนับสต็อก</b></li>
          <li>ใส่ชื่อผู้นับ แล้วสแกนบาร์โค้ด/ค้นหาสินค้า</li>
          <li>ใส่จำนวนที่นับได้ → <b>ยืนยันส่ง</b></li>
          <li>ยอดเข้าหน้านี้ทันที → ตรวจแล้วกด <b>บันทึกปรับสต็อก</b> ที่แท็บเล็ต</li>
        </ol>
        ${ready === false ? '<div class="cqr-warn">⚠️ ยังไม่ได้รัน V16 ใน Supabase • มือถือจะส่งยอดไม่ได้</div>' : `<div class="cqr-note">ยอดจากมือถือที่รอบันทึก: <b>${n}</b> รายการ • สินค้าเดียวกันนับหลายครั้ง (คนละจุด) ระบบจะบวกรวมให้</div>`}
      </div>`;
    if (!dlg.open) dlg.showModal();
  }

  // =========================================================
  // มือถือ: หน้าตรวจนับ
  // =========================================================
  let reader = null, controls = null, paused = false, sel = null, lastCode = '', lastAt = 0, mine = [];
  function countOpen() { return !!$('phoneCountDialog')?.open; }
  function device() { return String(window.getStaffName?.() || st()?.terminal || 'มือถือ'); }

  function buildDialog() {
    let dlg = $('phoneCountDialog');
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'phoneCountDialog'; dlg.className = 'pc-dialog';
    dlg.innerHTML = `
      <div class="pc-head">
        <div><strong>📦 ตรวจนับสต็อก</strong><small id="pcWho"></small></div>
        <button type="button" class="pc-name" onclick="phoneCountName()">เปลี่ยนชื่อ</button>
        <button type="button" class="pc-x" onclick="closePhoneCount()" aria-label="ปิด">✕</button>
      </div>
      <div class="pc-cam"><video id="pcVideo" playsinline muted></video><div id="pcCamMsg" class="pc-cam-msg" hidden></div><div class="pc-aim"></div></div>
      <div class="pc-find">
        <input id="pcQ" type="search" autocomplete="off" placeholder="พิมพ์ชื่อ / รหัส / บาร์โค้ด" oninput="phoneCountSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();phoneCountEnter(this.value)}">
        <div id="pcSugg" class="pc-sugg"></div>
      </div>
      <div class="pc-list-h">ที่เครื่องนี้นับแล้ว <span id="pcMineN"></span></div>
      <div id="pcMine" class="pc-mine"></div>
      <div id="pcSheet" class="pc-sheet" hidden></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => { stopCam(); document.documentElement.classList.remove('pc-open'); });
    dlg.addEventListener('cancel', e => { if (sel) { e.preventDefault(); closeSheet(); } });
    return dlg;
  }

  async function openPhoneCount() {
    const dlg = buildDialog();
    const closePs = () => { try { if ($('phoneScanDialog')?.open) { $('phoneScanDialog').close(); if (!dlg.open) dlg.showModal(); } } catch (_) {} };
    closePs(); [500, 1500, 3000].forEach(ms => setTimeout(closePs, ms));
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add('pc-open');
    if (!window.getStaffName?.()) setTimeout(phoneCountName, 300);
    renderWho(); renderMine();
    startCam();
    await loadPending(); renderMine();
    if (ready === false) toast('⚠️ ยังไม่ได้รัน V16 ใน Supabase • ส่งยอดนับไม่ได้', 6000);
  }
  function closePhoneCount() { $('phoneCountDialog')?.close(); }
  function phoneCountName() {
    const v = window.prompt('ชื่อผู้นับ (จะแสดงที่แท็บเล็ต)', window.getStaffName?.() || '');
    if (v !== null && v.trim()) window.setStaffName?.(v.trim().slice(0, 30));
    renderWho();
  }
  function renderWho() { const w = $('pcWho'); if (w) w.textContent = ` • ${device()}`; }

  async function startCam() {
    stopCam();
    const msg = $('pcCamMsg');
    const show = t => { if (msg) { msg.hidden = false; msg.innerHTML = t; } };
    if (!window.ZXingBrowser) { show('โหลดตัวสแกนไม่สำเร็จ • พิมพ์ค้นหาด้านล่างแทนได้'); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { show('กล้องใช้ได้เฉพาะเว็บ HTTPS • พิมพ์ค้นหาด้านล่างแทนได้'); return; }
    show('กำลังเปิดกล้อง...');
    try {
      reader = new ZXingBrowser.BrowserMultiFormatReader();
      controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        $('pcVideo'), (res) => { if (res) onCode(res.getText()); });
      if (msg) msg.hidden = true;
    } catch (err) {
      show(`${err?.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง' : 'เปิดกล้องไม่ได้'} <button type="button" onclick="phoneCountCamera()">เปิดกล้องอีกครั้ง</button>`);
    }
  }
  function stopCam() {
    try { controls?.stop(); } catch (_) {}
    controls = null; reader = null;
    const v = $('pcVideo'); try { v?.srcObject?.getTracks?.().forEach(t => t.stop()); } catch (_) {} if (v) v.srcObject = null;
  }

  function findProduct(code) {
    const c = String(code || '').trim(); if (!c) return null;
    const ps = st()?.products || [];
    return (window.productByBarcode?.(c)) || ps.find(p => String(p.product_code || '').toLowerCase() === c.toLowerCase()) || null;
  }
  function onCode(code) {
    if (paused || sel) return;
    const now = Date.now();
    if (code === lastCode && now - lastAt < 2500) return;
    lastCode = code; lastAt = now;
    const p = findProduct(code);
    if (!p) { toast(`ไม่พบสินค้า ${code}`); try { navigator.vibrate?.([60, 40, 60]); } catch (_) {} return; }
    try { navigator.vibrate?.(40); window.beepSuccess?.(); } catch (_) {}
    pick(p.id);
  }
  function phoneCountSearch(q) {
    const box = $('pcSugg'); if (!box) return;
    const t = String(q || '').trim().toLowerCase();
    if (!t) { box.innerHTML = ''; return; }
    const hits = (st()?.products || []).filter(p => `${p.product_name} ${p.product_code || ''} ${p.barcode || ''}`.toLowerCase().includes(t)).slice(0, 8);
    box.innerHTML = hits.length ? hits.map(p => `<button type="button" onclick="phoneCountPick('${p.id}')"><span>${esc(p.product_name)}</span><small>${esc(p.product_code || '')}</small></button>`).join('') : '<div class="pc-none">ไม่พบสินค้า</div>';
  }
  function phoneCountEnter(q) {
    const p = findProduct(q) || (() => { const t = String(q || '').trim().toLowerCase(); const h = (st()?.products || []).filter(p => p.product_name.toLowerCase().includes(t)); return h.length === 1 ? h[0] : null; })();
    if (p) pick(p.id); else phoneCountSearch(q);
  }

  function myTotal(pid) { return mine.filter(m => m.product_id === pid && m.status !== 'void').reduce((a, m) => a + Number(m.qty || 0), 0); }
  function pick(pid) {
    const p = (st()?.products || []).find(x => x.id === pid); if (!p) return;
    sel = { p, qty: '' };
    const q = $('pcQ'); if (q) q.value = ''; const sg = $('pcSugg'); if (sg) sg.innerHTML = '';
    renderSheet();
    setTimeout(() => { const n = $('pcQty'); if (n) n.focus(); }, 80);
  }
  function renderSheet() {
    const sh = $('pcSheet'); if (!sh) return;
    if (!sel) { sh.hidden = true; sh.innerHTML = ''; return; }
    const p = sel.p; const unit = p.unit || p.unit_name || 'ชิ้น'; const before = myTotal(p.id);
    sh.hidden = false;
    sh.innerHTML = `
      <div class="pc-sheet-in">
        <div class="pc-p-name">${esc(p.product_name)}</div>
        <div class="pc-p-meta">${esc(p.product_code || '')}${p.barcode ? ` • ${esc(p.barcode)}` : ''}</div>
        ${before ? `<div class="pc-p-before">เครื่องนี้นับไปแล้ว ${fmt(before)} ${esc(unit)} • ยอดใหม่จะ<b>บวกเพิ่ม</b> (นับคนละจุด)</div>` : ''}
        <label class="pc-lbl">นับได้ (${esc(unit)})</label>
        <div class="pc-qty">
          <button type="button" onclick="phoneCountStep(-1)">−</button>
          <input id="pcQty" type="text" inputmode="tel" value="${esc(sel.qty)}" placeholder="0" oninput="phoneCountQty(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();phoneCountSend()}">
          <button type="button" onclick="phoneCountStep(1)">+</button>
        </div>
        <div class="pc-hint">นับเป็นกระสอบ/แพ็ค พิมพ์สูตรได้ เช่น <b>10+10+6</b> หรือ <b>2*10+6</b></div>
        <div class="pc-quick">${[5, 10, 12, 20, 24, 50].map(n => `<button type="button" onclick="phoneCountStep(${n})">+${n}</button>`).join('')}</div>
        <div class="pc-act">
          <button type="button" class="pc-cancel" onclick="phoneCountCancel()">ยกเลิก</button>
          <button type="button" class="pc-send" id="pcSend" onclick="phoneCountSend()">ยืนยันส่ง</button>
        </div>
      </div>`;
  }
  function phoneCountQty(v) { if (sel) sel.qty = v; }
  function phoneCountStep(d) {
    if (!sel) return;
    const cur = window.eaParseCountExpr ? window.eaParseCountExpr($('pcQty')?.value ?? sel.qty) : Number(sel.qty);
    sel.qty = String(Math.max(0, (isNaN(cur) ? 0 : cur) + d));
    const n = $('pcQty'); if (n) n.value = sel.qty;
  }
  function closeSheet() { sel = null; renderSheet(); lastCode = ''; }
  function phoneCountCancel() { closeSheet(); }
  async function phoneCountSend() {
    if (!sel) return;
    const raw = String($('pcQty')?.value ?? sel.qty).trim();
    const val = window.eaParseCountExpr ? window.eaParseCountExpr(raw) : Number(raw);
    if (raw === '' || isNaN(val) || val < 0) { toast('ใส่จำนวนที่นับได้ก่อน เช่น 26 หรือ 10+10+6'); $('pcQty')?.focus(); return; }
    const qty = Math.round(val * 1000) / 1000;
    const p = sel.p;
    const btn = $('pcSend'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังส่ง...'; }
    try {
      const row = await rpc({ action: 'add', product_id: p.id, product_name: p.product_name, qty, device: String(st()?.terminal || ''), staff_name: device() });
      mine.unshift(row); saveMine();
      toast(`✅ ส่งแล้ว: ${p.product_name} = ${fmt(qty)} ${p.unit || ''}`, 2500);
      closeSheet(); renderMine();
    } catch (e) {
      toast(`❌ ${e.message || e}`, 6000);
      if (btn) { btn.disabled = false; btn.textContent = 'ลองส่งอีกครั้ง'; }
    }
  }
  async function phoneCountVoid(id) {
    const m = mine.find(x => x.id === id); if (!m) return;
    if (!window.confirm(`ยกเลิกยอดนับ "${m.product_name}" = ${fmt(m.qty)} ?`)) return;
    try { await rpc({ action: 'void', id }); m.status = 'void'; saveMine(); renderMine(); toast('ยกเลิกแล้ว'); }
    catch (e) { toast(`❌ ${e.message || e}`, 5000); }
  }

  // รายการของเครื่องนี้ (เก็บในเครื่อง + อัปเดตสถานะจากเซิร์ฟเวอร์)
  const MINE_KEY = () => `ea_count_mine_${new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)}`;
  function loadMine() { try { mine = JSON.parse(lsGet(MINE_KEY(), '[]')) || []; } catch (_) { mine = []; } }
  function saveMine() { lsSet(MINE_KEY(), JSON.stringify(mine.slice(0, 300))); }
  function renderMine() {
    const box = $('pcMine'); if (!box) return;
    mine.forEach(m => { const r = allRows.find(x => x.id === m.id); if (r) m.status = r.status; });
    const live = mine.filter(m => m.status !== 'void');
    const n = $('pcMineN'); if (n) n.textContent = live.length ? `(${live.length})` : '';
    box.innerHTML = mine.length ? mine.map(m => `
      <div class="pc-row ${m.status}">
        <span class="t">${new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
        <span class="n">${esc(m.product_name)}</span>
        <b>${fmt(m.qty)}</b>
        ${m.status === 'pending' ? `<span class="s">รอบันทึก</span><button type="button" onclick="phoneCountVoid('${m.id}')">ยกเลิก</button>`
          : m.status === 'applied' ? '<span class="s ok">ปรับสต็อกแล้ว</span>' : '<span class="s x">ยกเลิกแล้ว</span>'}
      </div>`).join('') : '<div class="pc-empty">ยังไม่ได้นับ • สแกนบาร์โค้ดสินค้าที่กล้องด้านบน</div>';
  }

  // =========================================================
  let boot = false;
  function init() {
    hookAudit();
    loadMine();
    let fromQr = false;
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('count')) {
        fromQr = true;
        const staff = String(params.get('staff') || '').trim().slice(0, 30);
        if (staff) window.setStaffName?.(staff);
        params.delete('count'); params.delete('staff');
        const q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
      }
    } catch (_) {}
    if (fromQr) {
      // รอโหลดรายการสินค้าก่อน แล้วเปิดหน้าตรวจนับ (ปิดหน้าขายมือถือถ้าเปิดค้าง)
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        if ((st()?.products || []).length || tries > 40) { clearInterval(t); openPhoneCount(); }
      }, 250);
    }
    const c = sb();
    try { c?.channel('ea-stock-counts-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ea_stock_counts' }, () => { onRemoteChange().then(() => { if (countOpen()) renderMine(); }); }).subscribe(); } catch (_) {}
    loadPending().then(() => { pending.forEach(e => seenToast.add(e.id)); boot = true; if (st()?.page === 'audit') { window.initPhysicalAuditState?.(false); window.rerenderAuditView?.(); } });
    setInterval(() => { if (document.hidden) return; if (st()?.page === 'audit' || countOpen()) onRemoteChange().then(() => { if (countOpen()) renderMine(); }); }, 20000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);

  Object.assign(window, {
    eaCountRefresh: onRemoteChange, eaMergeRemoteCounts: mergeRemoteCounts, eaAuditRemoteLine: remoteLine, eaRemoteCountBadge: remoteBadge, eaShowCountQr: showCountQr,
    openPhoneCount, closePhoneCount, phoneCountName, phoneCountSearch, phoneCountEnter, phoneCountPick: pick,
    phoneCountQty, phoneCountStep, phoneCountCancel, phoneCountSend, phoneCountVoid, phoneCountCamera: startCam
  });
})();
