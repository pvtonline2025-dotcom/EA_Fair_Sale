/**
 * EA Fair Sale - ตรวจนับสต็อก: ผลต่าง "รอตรวจสอบ" ก่อนปรับสต็อก
 *
 * กดบันทึกผลนับ:
 *   - ตรงกับระบบ → บันทึกว่า "ตรง" (ไม่แตะสต็อก)
 *   - ขาด / เกิน → เข้ารายการ "รอตรวจสอบ" (ยังไม่ปรับสต็อก)
 *     เพราะอาจนับพลาด / แพ็คผิด / กระสอบยังไม่แกะ → ตรวจสอบแล้วค่อยยืนยัน (ข้ามวันได้)
 * ตรวจสอบแล้ว:
 *   ✅ ยืนยันปรับสต็อก (สต็อกปัจจุบัน ± ผลต่าง → ยอดขายหลังวันนับยังถูกต้อง)
 *   ✏️ แก้ผลต่าง (เช่น แกะกระสอบแล้วขาดจริง 1 ไม่ใช่ 2)
 *   🔁 นับใหม่ตอนนี้ (ใส่ยอดนับจริง → คำนวณผลต่างกับสต็อกตอนนี้)
 *   ✖ นับพลาด (ปิดรายการ ไม่ปรับสต็อก)
 * เก็บรายการไว้ในเครื่องแท็บเล็ตหลัก (localStorage) • ยอดนับพิมพ์เป็นสูตรได้ เช่น 10+10+6 หรือ 2x10+6
 */
(function () {
  const KEY = 'ea_audit_review';
  const st = () => window.getEaAppState?.() || null;
  const sb = () => window.getEaSupabaseClient?.() || null;
  const esc = s => (typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s ?? ''));
  const toast = (m, ms) => (typeof window.toast === 'function' ? window.toast(m, ms) : console.log(m));
  const money = n => (typeof window.money === 'function' ? window.money(n) : Number(n || 0).toFixed(2));
  const fmt = n => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 });
  const sign = n => (n > 0 ? `+${fmt(n)}` : fmt(n));
  const r3 = n => Math.round(Number(n || 0) * 1000) / 1000;

  // ---------- ยอดนับแบบสูตร: 10+10+6 • 2x10+6 • 2*10 ----------
  function parseCountExpr(v) {
    const t = String(v ?? '').replace(/[×xX]/g, '*').replace(/\s+/g, '');
    if (!t) return 0;
    if (!/^[0-9.+*]+$/.test(t)) return NaN;
    let total = 0;
    for (const term of t.split('+')) {
      if (!term) continue;
      let prod = 1;
      for (const f of term.split('*')) { const n = Number(f); if (!f || isNaN(n)) return NaN; prod *= n; }
      total += prod;
    }
    return r3(total);
  }

  // ---------- ที่เก็บรายการรอตรวจสอบ ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (_) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 600))); } catch (_) {} }
  // ผลนับล่าสุดของแต่ละสินค้า (ใช้แสดงสถานะในหน้าสต็อก)
  const LAST_KEY = 'ea_audit_last';
  function lastMap() { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}') || {}; } catch (_) { return {}; } }
  function setLast(pid, result) { const m = lastMap(); m[pid] = { at: new Date().toISOString(), result }; try { localStorage.setItem(LAST_KEY, JSON.stringify(m)); } catch (_) {} }
  function statusCell(pid) {
    const pend = pendingList().find(x => x.pid === pid);
    if (pend) return `<button type="button" class="stk-audit is-review" onclick="eaOpenAuditReview()" title="กดเพื่อไปตรวจสอบ">รอตรวจสอบ<small>${pend.diff > 0 ? 'เกิน' : 'ขาด'} ${sign(pend.diff).replace('+', '')}</small></button>`;
    const l = lastMap()[pid];
    if (l) { const d = new Date(l.at); return `<span class="stk-audit is-ok">ถูกต้อง<small>นับ ${d.getDate()}/${d.getMonth() + 1}</small></span>`; }
    return '<span class="stk-audit is-none">ยังไม่นับ</span>';
  }
  function openReview() { const s = st(); if (s) s.auditSubTab = 'review'; window.go?.('audit'); }
  function pendingList() { return load().filter(x => x.status === 'review'); }
  function count() { return pendingList().length; }
  function product(pid) { return (st()?.products || []).find(p => p.id === pid) || null; }
  function thDT(iso) {
    const d = new Date(iso); const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function who() { return window.getStaffName?.() || st()?.terminal || ''; }
  async function refresh() { try { if (window.eaQuietRefresh) await Promise.race([window.eaQuietRefresh(), new Promise(r => setTimeout(r, 5000))]); } catch (_) {} }

  // =========================================================
  // บันทึกผลนับ (แทนการปรับสต็อกทันที)
  // =========================================================
  async function saveCountResults() {
    const s = st(); if (!s) return;
    await refresh();
    window.initPhysicalAuditState?.(false);
    const noteInput = document.getElementById('auditNoteInput');
    if (noteInput) s.auditNote = noteInput.value;
    const note = s.auditNote || '';
    const rows = (s.products || []).filter(p => s.auditTouched?.[p.id]).map(p => {
      const sys = Number(p.stock_qty || 0), cnt = Number(s.auditCounts?.[p.id] ?? sys);
      return { p, sys, cnt, diff: r3(cnt - sys) };
    });
    if (!rows.length) { toast('ยังไม่ได้นับสินค้า • สแกนหรือใส่ยอดนับก่อน'); return; }
    const matched = rows.filter(r => r.diff === 0), diffs = rows.filter(r => r.diff !== 0);
    const msg = `บันทึกผลนับ ${rows.length} รายการ\n\n✓ ตรงกับระบบ ${matched.length} รายการ` +
      (diffs.length ? `\n⚠️ ขาด/เกิน ${diffs.length} รายการ → ไปที่ "รอตรวจสอบ"\n   (ยังไม่ปรับสต็อก • ตรวจสอบแล้วค่อยกดยืนยัน)` : '');
    if (!window.confirm(msg)) return;

    const now = new Date();
    const list = load();
    const merged = s.auditRemoteMerged || {};
    for (const r of diffs) {
      list.filter(x => x.status === 'review' && x.pid === r.p.id).forEach(x => { x.status = 'superseded'; x.resolvedAt = now.toISOString(); x.result = 'มีผลนับใหม่แทน'; });
      const phones = Object.values(merged).filter(m => m.pid === r.p.id).map(m => `${fmt(m.qty)} (${m.who})`).join(' + ');
      list.unshift({
        id: 'rv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        pid: r.p.id, code: r.p.product_code || '', name: r.p.product_name, unit: r.p.unit || 'ชิ้น',
        price: window.auditUnitPrice ? window.auditUnitPrice(r.p) : Number(r.p.sale_price || 0),
        countedAt: now.toISOString(), sysQty: r.sys, countQty: r.cnt, diff: r.diff, origDiff: r.diff,
        soldDuring: Number(s.auditSoldDuring?.[r.p.id] || 0), phones, by: who(), note: '', status: 'review'
      });
    }
    save(list);
    matched.forEach(r => setLast(r.p.id, 'ok'));
    diffs.forEach(r => setLast(r.p.id, 'review'));

    // ประวัติการตรวจนับ
    const short = diffs.filter(r => r.diff < 0), sur = diffs.filter(r => r.diff > 0);
    const price = p => (window.auditUnitPrice ? window.auditUnitPrice(p) : Number(p.sale_price || 0));
    const dateStr = window.todayISO ? window.todayISO() : now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const rec = {
      id: 'batch-aud-' + Date.now(),
      batchNo: 'AUD-' + dateStr.replace(/-/g, '') + '-' + String((s.auditBatchHistory || []).length + 1).padStart(3, '0'),
      auditDate: `${dateStr} ${timeStr.slice(0, 5)}`,
      auditor: `${s.terminal || 'POS-01'}${who() ? ` (${who()})` : ''}`,
      terminal: s.terminal || 'POS-01',
      totalItems: rows.length, matchCount: matched.length, surplusCount: sur.length, shortageCount: short.length,
      totalSurplusUnits: sur.reduce((a, r) => a + r.diff, 0), totalShortageUnits: short.reduce((a, r) => a - r.diff, 0),
      totalSurplusValue: sur.reduce((a, r) => a + r.diff * price(r.p), 0), totalShortageValue: short.reduce((a, r) => a - r.diff * price(r.p), 0),
      netDiscrepancyValue: diffs.reduce((a, r) => a + r.diff * price(r.p), 0),
      accuracyRate: rows.length ? Math.round(matched.length / rows.length * 1000) / 10 : 100,
      status: diffs.length ? (short.length && sur.length ? 'discrepancy' : short.length ? 'shortage' : 'surplus') : 'matched',
      statusLabel: diffs.length ? `⏳ รอตรวจสอบ ${diffs.length} รายการ (ขาด ${short.length} / เกิน ${sur.length}) • ยังไม่ปรับสต็อก` : `✓ ตรงกับระบบทุกรายการ (${matched.length})`,
      note,
      itemsDetail: diffs.map(r => ({ productCode: r.p.product_code || '-', barcode: r.p.barcode || '-', productName: r.p.product_name, unit: r.p.unit || 'ชิ้น', unitPrice: price(r.p), sysQty: r.sys, countQty: r.cnt, diff: r.diff, diffVal: r.diff * price(r.p), status: r.diff > 0 ? 'surplus' : 'shortage' })),
      scanHistory: (s.auditSessionScanLogs || []).slice()
    };
    if (!Array.isArray(s.auditBatchHistory)) s.auditBatchHistory = [];
    s.auditBatchHistory.unshift(rec);

    // เริ่มรอบนับใหม่
    s.auditSessionScanLogs = []; s.auditRecentScans = []; s.auditLastScanned = null;
    rows.forEach(r => {
      s.auditCounts[r.p.id] = Number(r.p.stock_qty || 0);
      delete s.auditTouched[r.p.id];
      if (s.auditSoldDuring) delete s.auditSoldDuring[r.p.id];
      if (s.auditCountedAt) delete s.auditCountedAt[r.p.id];
    });
    window.saveLocalState?.();
    if (diffs.length) s.auditSubTab = 'review';
    if (s.page === 'audit') window.renderPhysicalAuditPage?.();
    toast(diffs.length ? `บันทึกแล้ว • ตรง ${matched.length} • รอตรวจสอบ ${diffs.length} รายการ` : `✅ บันทึกแล้ว • ตรงกับระบบทั้ง ${matched.length} รายการ`, 5000);
  }

  // =========================================================
  // ปรับสต็อกจริง (ใช้ตอนยืนยันผลต่าง)
  // =========================================================
  async function adjustStock(p, diff, note) {
    const s = st();
    const c = sb();
    if (!c || s?.isOffline || !navigator.onLine) throw new Error('ออฟไลน์อยู่ • ยืนยันปรับสต็อกต้องใช้อินเทอร์เน็ต');
    const newQty = Math.max(0, r3(Number(p.stock_qty || 0) + diff));
    const { error } = await c.rpc('ea_update_stock', { p_product_id: p.id, p_type: 'ADJUST', p_qty: newQty, p_note: note });
    if (error) throw new Error(error.message || 'ปรับสต็อกไม่สำเร็จ');
    const change = r3(newQty - Number(p.stock_qty || 0));
    p.stock_qty = newQty;
    const now = new Date();
    if (Array.isArray(s.movements)) s.movements.unshift({
      id: 'audit-move-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      product_id: p.id, product_name: p.product_name, movement_type: 'ADJUST', qty_change: change,
      note: `${note} (${change > 0 ? '+' : ''}${fmt(change)} ${p.unit || 'ชิ้น'})`,
      movement_date: window.todayISO ? window.todayISO() : now.toISOString().slice(0, 10), movement_time: now.toTimeString().slice(0, 8), created_at: now.toISOString()
    });
    window.saveLocalState?.();
    return newQty;
  }

  function find(id) { const a = load(); return { a, x: a.find(i => i.id === id) }; }
  function rerender() { const s = st(); if (s?.page === 'audit') window.renderPhysicalAuditPage?.(); }
  function resolve(a, x, status, result) { setLast(x.pid, status); x.status = status; x.result = result; x.resolvedAt = new Date().toISOString(); x.resolvedBy = who(); save(a); rerender(); }

  async function reviewConfirm(id) {
    const { a, x } = find(id); if (!x) return;
    const p = product(x.pid); if (!p) { toast('ไม่พบสินค้านี้ในระบบแล้ว'); return; }
    await refresh();
    const p2 = product(x.pid) || p;
    const newQty = Math.max(0, r3(Number(p2.stock_qty || 0) + x.diff));
    if (!window.confirm(`ยืนยันปรับสต็อก "${x.name}"\n\nผลต่าง ${sign(x.diff)} ${x.unit}\nสต็อกตอนนี้ ${fmt(p2.stock_qty)} → ${fmt(newQty)} ${x.unit}`)) return;
    try {
      await adjustStock(p2, x.diff, `ยืนยันผลตรวจนับ ${thDT(x.countedAt).slice(0, 10)}${x.note ? ` • ${x.note}` : ''}`);
      resolve(a, x, 'adjusted', `ปรับสต็อก ${sign(x.diff)} → ${fmt(newQty)}`);
      toast(`✅ ปรับสต็อก ${x.name} ${sign(x.diff)} แล้ว`);
      window.checkAndNotifyLowStock?.();
    } catch (e) { toast(`❌ ${e.message || e}`, 6000); }
  }
  function reviewEditDiff(id) {
    const { a, x } = find(id); if (!x) return;
    const v = window.prompt(`แก้ผลต่าง "${x.name}" (หน่วย: ${x.unit})\nเช่น แกะกระสอบแล้วขาดจริง 1 → ใส่ -1 • เกิน 2 → ใส่ 2 • ตรง → ใส่ 0`, String(x.diff));
    if (v === null) return;
    const d = Number(String(v).replace(/[^\d.+-]/g, ''));
    if (isNaN(d)) { toast('ใส่ตัวเลข เช่น -1 หรือ 2'); return; }
    x.diff = r3(d);
    if (x.diff === 0) { resolve(a, x, 'ok', 'ตรวจแล้วตรง (ไม่ปรับสต็อก)'); toast('ปิดรายการแล้ว • ตรงกับระบบ'); return; }
    x.edited = true; save(a); rerender();
  }
  async function reviewRecount(id) {
    const { a, x } = find(id); if (!x) return;
    await refresh();
    const p = product(x.pid); if (!p) { toast('ไม่พบสินค้านี้ในระบบแล้ว'); return; }
    const v = window.prompt(`นับใหม่ตอนนี้ "${x.name}" (${x.unit})\nพิมพ์สูตรได้ เช่น 10+10+6 หรือ 2x10+6`, '');
    if (v === null) return;
    const cnt = parseCountExpr(v);
    if (isNaN(cnt)) { toast('ยอดนับไม่ถูกต้อง เช่น 26 หรือ 10+10+6'); return; }
    const d = r3(cnt - Number(p.stock_qty || 0));
    x.recount = { at: new Date().toISOString(), cnt, sys: Number(p.stock_qty || 0) };
    x.diff = d;
    if (d === 0) { resolve(a, x, 'ok', `นับใหม่ ${fmt(cnt)} ตรงกับระบบ`); toast(`✅ นับใหม่ ${fmt(cnt)} ตรงกับระบบ • ปิดรายการแล้ว`); return; }
    save(a); rerender();
    toast(`นับใหม่ ${fmt(cnt)} • ผลต่าง ${sign(d)} ${x.unit} • กด "ยืนยันปรับสต็อก" ถ้าถูกต้อง`, 5000);
  }
  function reviewDismiss(id) {
    const { a, x } = find(id); if (!x) return;
    if (!window.confirm(`ปิดรายการ "${x.name}" ว่านับพลาด/ตรงแล้ว?\n(ไม่ปรับสต็อก)`)) return;
    resolve(a, x, 'dismissed', 'นับพลาด • ไม่ปรับสต็อก');
  }
  function reviewNote(id, v) { const { a, x } = find(id); if (!x) return; x.note = String(v || '').slice(0, 200); save(a); }

  // =========================================================
  // หน้า "รอตรวจสอบ"
  // =========================================================
  function renderTab() {
    const all = load();
    const pend = all.filter(x => x.status === 'review');
    const done = all.filter(x => x.status !== 'review' && x.status !== 'superseded').slice(0, 30);
    const row = x => {
      const p = product(x.pid);
      const cls = x.diff > 0 ? 'plus' : 'minus';
      return `
        <div class="arv-item">
          <div class="arv-main">
            <div class="arv-name">${esc(x.name)} <small>${esc(x.code)}</small></div>
            <div class="arv-meta">นับเมื่อ ${thDT(x.countedAt)}${x.by ? ` • ${esc(x.by)}` : ''}${x.phones ? ` • 📱 ${esc(x.phones)}` : ''}</div>
            <div class="arv-nums">
              <span>ระบบตอนนับ <b>${fmt(x.sysQty)}</b></span>
              <span>นับได้ <b>${fmt(x.countQty)}</b></span>
              ${x.soldDuring ? `<span>ขายระหว่างนับ ${fmt(x.soldDuring)}</span>` : ''}
              ${x.recount ? `<span>นับใหม่ ${fmt(x.recount.cnt)} (ระบบ ${fmt(x.recount.sys)}) ${thDT(x.recount.at).slice(11)}</span>` : ''}
              ${x.edited ? `<span>แก้ผลต่างจาก ${sign(x.origDiff)}</span>` : ''}
              ${p ? `<span>สต็อกตอนนี้ <b>${fmt(p.stock_qty)}</b></span>` : ''}
            </div>
            <input class="arv-note" value="${esc(x.note || '')}" placeholder="หมายเหตุ เช่น กระสอบยังไม่แกะ / แพ็คผิด" onchange="auditReviewNote('${x.id}', this.value)">
          </div>
          <div class="arv-diff ${cls}">${sign(x.diff)}<small>${esc(x.unit)} • ${x.diff > 0 ? 'เกิน' : 'ขาด'}</small><small>฿${money(Math.abs(x.diff * (x.price || 0)))}</small></div>
          <div class="arv-act">
            <button type="button" class="arv-ok" onclick="auditReviewConfirm('${x.id}')">✅ ยืนยันปรับสต็อก ${sign(x.diff)}</button>
            <button type="button" onclick="auditReviewRecount('${x.id}')">🔁 นับใหม่</button>
            <button type="button" onclick="auditReviewEditDiff('${x.id}')">✏️ แก้ผลต่าง</button>
            <button type="button" class="arv-x" onclick="auditReviewDismiss('${x.id}')">✖ นับพลาด ไม่ปรับ</button>
          </div>
        </div>`;
    };
    const label = { adjusted: 'ปรับสต็อกแล้ว', ok: 'ตรวจแล้วตรง', dismissed: 'นับพลาด' };
    return `
      <div class="arv">
        <div class="arv-help">ผลนับที่ <b>ขาด/เกิน</b> จะรอตรงนี้ก่อน (ยังไม่ปรับสต็อก) • ตรวจสอบ เช่น แกะกระสอบนับใหม่ แล้วค่อยกดยืนยัน • ทำข้ามวันได้ ยอดขายหลังวันนับยังถูกต้อง</div>
        ${pend.length ? pend.map(row).join('') : '<div class="arv-empty">✓ ไม่มีรายการรอตรวจสอบ</div>'}
        ${done.length ? `<h3 class="arv-h">ตรวจสอบแล้วล่าสุด</h3>
          <div class="arv-done">${done.map(x => `<div class="arv-drow ${x.status}"><span>${thDT(x.resolvedAt)}</span><span class="n">${esc(x.name)}</span><span>${sign(x.origDiff ?? x.diff)}</span><span class="r">${esc(label[x.status] || x.status)} • ${esc(x.result || '')}</span></div>`).join('')}</div>` : ''}
      </div>`;
  }

  // แทนปุ่มบันทึกเดิม (ปรับสต็อกทันที) ด้วย "บันทึกผลนับ"
  window.applyStockAuditAdjustments = saveCountResults;
  Object.assign(window, {
    eaAuditReviewCount: count, eaAuditStatusCell: statusCell, eaOpenAuditReview: openReview, eaRenderAuditReviewTab: renderTab, eaParseCountExpr: parseCountExpr,
    auditReviewConfirm: reviewConfirm, auditReviewEditDiff: reviewEditDiff, auditReviewRecount: reviewRecount,
    auditReviewDismiss: reviewDismiss, auditReviewNote: reviewNote
  });
})();
