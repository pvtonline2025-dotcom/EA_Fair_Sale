/**
 * EA Fair Sale - หน้า "กล่องเงิน" (เรียลไทม์) สำหรับแท็บเล็ต
 *
 *  - ซ้าย: บิลล่าสุดจากทุกเครื่อง (รายการสินค้า ยอด รับมา เงินทอน) เด้งขึ้นทันทีที่มีบิลใหม่
 *  - ขวา: เงินในกล่อง = เงินทอนตั้งต้น (ค่าเริ่มต้น 1,000) + ขายเงินสด ± นำออก/เติม
 *  - นับเงินตรวจทานเป็นระยะ (นับตามชนิดธนบัตร/เหรียญ) → แสดงตรง/เกิน/ขาด และเก็บประวัติรายวัน
 *
 * ข้อมูลกล่องเงิน (เงินตั้งต้น การนับ การนำเงินออก) เก็บในแท็บเล็ตเครื่องนี้ แยกรายวัน
 * Uses globals: money, escapeHtml, el, toast, todayISO, setHeader, go, getEaAppState, eaQuietRefresh
 */
(function () {
  const DENOMS = [
    { v: 1000, t: 'แบงก์' }, { v: 500, t: 'แบงก์' }, { v: 100, t: 'แบงก์' }, { v: 50, t: 'แบงก์' }, { v: 20, t: 'แบงก์' },
    { v: 10, t: 'เหรียญ' }, { v: 5, t: 'เหรียญ' }, { v: 2, t: 'เหรียญ' }, { v: 1, t: 'เหรียญ' }
  ];
  const FLOAT_DEFAULT_KEY = 'ea_cashbox_default_float';
  const DEVICES_KEY = 'ea_cashbox_devices';

  let filter = 'all';          // all | cash | qr
  let seenIds = null;          // บิลที่เคยเห็นแล้ว (ไว้ไฮไลต์บิลใหม่)
  const freshUntil = new Map(); // saleId -> timestamp ที่หยุดไฮไลต์
  let pollTimer = null;
  let countDraft = null;

  const st = () => window.getEaAppState?.() || null;
  const r2 = n => Math.round(Number(n || 0) * 100) / 100;
  const isQr = pm => ['promptpay', 'qr', 'transfer'].includes(String(pm || '').toLowerCase());
  const norm = c => String(c || 'POS-01').trim().toUpperCase();
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function nowHM() { return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }
  function saleTime(s) {
    if (s.created_at) return new Date(s.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return String(s.sale_time || '').slice(0, 8) || '-';
  }
  function saleTs(s) { return s.created_at ? new Date(s.created_at).getTime() : 0; }

  // ---------- ข้อมูลกล่องเงินรายวัน (เก็บในเครื่อง) ----------
  function boxKey() { return 'ea_cashbox_' + todayISO(); }
  function loadBox() {
    let b = null;
    try { b = JSON.parse(lsGet(boxKey(), 'null')); } catch (_) {}
    if (!b || typeof b !== 'object') b = {};
    if (!(Number(b.float) >= 0)) b.float = Number(lsGet(FLOAT_DEFAULT_KEY, '1000')) || 0;
    if (!Array.isArray(b.adjust)) b.adjust = [];
    if (!Array.isArray(b.counts)) b.counts = [];
    return b;
  }
  function saveBox(b) { lsSet(boxKey(), JSON.stringify(b)); }

  // ---------- ข้อมูลยอดขาย ----------
  function todaySalesAll() {
    const s = st(); const today = todayISO();
    return (s?.sales || []).filter(x => (x.sale_date || String(x.created_at || '').slice(0, 10)) === today && x.status !== 'void' && x.status !== 'cancelled');
  }
  function devicesToday() { return [...new Set(todaySalesAll().map(x => norm(x.terminal_code)))].sort(); }
  function selectedDevices() {
    const saved = lsGet(DEVICES_KEY, '');
    return saved ? saved.split(',').filter(Boolean) : null; // null = ทุกเครื่อง
  }
  function inBox(sale) { const sel = selectedDevices(); return !sel || sel.includes(norm(sale.terminal_code)); }
  function itemsOf(saleId) { return (st()?.saleItems || []).filter(i => i.sale_id === saleId); }

  function summary() {
    const b = loadBox();
    const sales = todaySalesAll();
    const cash = sales.filter(x => !isQr(x.payment_method) && inBox(x));
    const qr = sales.filter(x => isQr(x.payment_method));
    const cashTotal = r2(cash.reduce((a, x) => a + Number(x.total_amount || 0), 0));
    const qrTotal = r2(qr.reduce((a, x) => a + Number(x.total_amount || 0), 0));
    const adjIn = r2(b.adjust.filter(a => a.amount > 0).reduce((s, a) => s + a.amount, 0));
    const adjOut = r2(b.adjust.filter(a => a.amount < 0).reduce((s, a) => s - a.amount, 0));
    const rm = window.eaReservationMoney?.() || null;
    const devOk = code => { const sel = selectedDevices(); return !sel || sel.includes(norm(code)); };
    // มัดจำแยกเก็บในซองมัดจำ (ไม่อยู่ในกล่องเงินทอน) • คืนมัดจำจ่ายจากซอง
    const depCash = rm ? rm.depositCash : 0;
    const refCash = 0;
    const finCash = rm ? r2((rm.finals || []).filter(r => r.final_method === 'cash' && devOk(r.final_terminal)).reduce((a, r) => a + Number(r.final_amount), 0)) : 0;
    const expected = r2(b.float + cashTotal + finCash + adjIn - adjOut);
    return { b, cash, qr, cashTotal, qrTotal, adjIn, adjOut, depCash, finCash, refCash, rm, expected, bills: sales.length };
  }

  // ---------- หน้าจอ ----------
  function renderCashbox() {
    const s = st(); if (!s) return;
    setHeader('กล่องเงิน', `เรียลไทม์ • อัปเดต ${nowHM()} น.`);
    const sum = summary();
    const sales = todaySalesAll().slice().sort((a, b) => saleTs(b) - saleTs(a));

    // บิลใหม่ที่เพิ่งเข้ามา → ไฮไลต์ 15 วินาที + เสียง
    const ids = new Set(sales.map(x => x.id));
    if (seenIds) {
      let fresh = 0;
      for (const x of sales) if (!seenIds.has(x.id)) { freshUntil.set(x.id, Date.now() + 15000); fresh++; }
      if (fresh) { try { window.beepSuccess?.(); } catch (_) {} }
    }
    seenIds = ids;

    const list = sales.filter(x => filter === 'all' || (filter === 'qr' ? isQr(x.payment_method) : !isQr(x.payment_method)));
    const last = sum.b.counts[sum.b.counts.length - 1];
    const devs = devicesToday(); const sel = selectedDevices();

    el('content').innerHTML = `
      <div class="cbx">
        <section class="cbx-feed">
          <div class="cbx-feed-head">
            <h3>บิลล่าสุด <span class="cbx-count">${sales.length}</span></h3>
            <div class="cbx-seg">
              ${[['all', 'ทั้งหมด'], ['cash', 'เงินสด'], ['qr', 'โอน/QR']].map(([k, t]) => `<button type="button" class="${filter === k ? 'is-on' : ''}" onclick="cashboxFilter('${k}')">${t}</button>`).join('')}
            </div>
          </div>
          <div class="cbx-list">
            ${(() => {
              const dep = filter === 'all' || filter === (filter === 'qr' ? 'qr' : 'cash') ? (sum.rm?.deposits || []).filter(r => filter === 'all' || (filter === 'qr') === isQr(r.deposit_method)) : [];
              const fin = (sum.rm?.finals || []).filter(r => r.final_method !== 'shop' && (filter === 'all' || (filter === 'qr') === isQr(r.final_method)));
              const feed = [...list.map(x => ({ t: saleTs(x), html: () => billCard(x) })), ...dep.map(r => ({ t: new Date(r.created_at).getTime(), html: () => depositCard(r) })), ...fin.map(r => ({ t: new Date(r.picked_up_at).getTime(), html: () => finalCard(r) }))].sort((a, b) => b.t - a.t);
              return feed.length ? feed.slice(0, 60).map(f => f.html()).join('') : '<div class="cbx-empty">ยังไม่มีบิลวันนี้ • บิลใหม่จะขึ้นที่นี่ทันที</div>';
            })()}
          </div>
        </section>

        <aside class="cbx-box">
          <div class="cbx-panel">
            <h3>เงินในกล่อง</h3>
            <div class="cbx-line"><span>เงินทอนตั้งต้น</span>
              <button type="button" class="cbx-link" onclick="cashboxEditFloat()">฿${money(sum.b.float)} ✏️</button></div>
            <div class="cbx-line"><span>+ ขายเงินสด <small>${sum.cash.length} บิล</small></span><b>฿${money(sum.cashTotal)}</b></div>
            ${sum.finCash ? `<div class="cbx-line"><span>+ รับเงินคงค้างใบจอง (สด)</span><b>฿${money(sum.finCash)}</b></div>` : ''}
            ${sum.adjIn ? `<div class="cbx-line"><span>+ เติมเงินเข้า</span><b>฿${money(sum.adjIn)}</b></div>` : ''}
            ${sum.adjOut ? `<div class="cbx-line"><span>− นำเงินออก</span><b>฿${money(sum.adjOut)}</b></div>` : ''}
            <div class="cbx-expected"><span>ควรมีในกล่อง</span><strong>฿${money(sum.expected)}</strong></div>
            <div class="cbx-line cbx-muted"><span>โอน/QR (ไม่อยู่ในกล่อง) <small>${sum.qr.length} บิล</small></span><span>฿${money(sum.qrTotal)}</span></div>
            <button type="button" class="cbx-btn cbx-btn-main" onclick="openCashCount()">🧮 นับเงินตรวจ</button>
            <div class="cbx-btn-row">
              <button type="button" class="cbx-btn" onclick="cashboxAdjust(-1)">นำเงินออก</button>
              <button type="button" class="cbx-btn" onclick="cashboxAdjust(1)">เติมเงินทอน</button>
            </div>
          </div>

          ${envelopeHtml(sum.rm)}

          <div class="cbx-panel">
            <h3>ผลการนับวันนี้</h3>
            ${last ? lastCountHtml(last, sum.expected) : '<div class="cbx-empty small">ยังไม่ได้นับเงินวันนี้</div>'}
            ${sum.b.counts.length > 1 || sum.b.adjust.length ? `
              <div class="cbx-history">
                ${[...sum.b.counts.map(c => ({ ...c, kind: 'count' })), ...sum.b.adjust.map(a => ({ ...a, kind: 'adj' }))]
                  .sort((a, b) => b.ts - a.ts).map(h => h.kind === 'count'
                    ? `<div class="cbx-h"><span>${h.time} นับได้ ฿${money(h.counted)}</span>${diffBadge(h.counted - h.expected)}</div>`
                    : `<div class="cbx-h"><span>${h.time} ${h.amount < 0 ? 'นำออก' : 'เติม'} ฿${money(Math.abs(h.amount))}${h.note ? ` • ${escapeHtml(h.note)}` : ''}</span></div>`).join('')}
              </div>` : ''}
          </div>

          ${devs.length > 1 ? `
            <div class="cbx-panel">
              <h3>เครื่องที่ส่งเงินสดเข้ากล่องนี้</h3>
              <div class="cbx-devs">
                <button type="button" class="${!sel ? 'is-on' : ''}" onclick="cashboxDevices('all')">ทุกเครื่อง</button>
                ${devs.map(d => `<button type="button" class="${sel && sel.includes(d) ? 'is-on' : ''}" onclick="cashboxDevices('${escapeHtml(d)}')">${escapeHtml(d)}</button>`).join('')}
              </div>
              <div class="cbx-hint">มือถือที่เก็บเงินเอง แล้วค่อยส่งเงินทีหลัง ให้ไม่ต้องเลือก</div>
            </div>` : ''}
        </aside>
      </div>`;
  }

  // ซองเงินมัดจำ: แยกจากกล่องเงินทอน ไม่ส่งรวมยอดรายวัน จนกว่าจะส่งของ
  function envelopeHtml(m) {
    if (!m || !m.any) return '';
    return `
      <div class="cbx-panel cbx-env">
        <h3>ซองเงินมัดจำ (แยกเก็บ)</h3>
        <div class="cbx-line"><span>ใบจองรอรับ <small>${m.held.length} ใบ</small></span><b>฿${money(m.heldCash)}</b></div>
        ${m.depositCash ? `<div class="cbx-line cbx-muted"><span>• รวมมัดจำสดที่รับวันนี้</span><span>฿${money(m.depositCash)}</span></div>` : ''}
        ${m.inCash ? `<div class="cbx-line"><span>+ ใบจองที่ส่งของ/ยกเลิกวันนี้</span><b>฿${money(m.inCash)}</b></div>` : ''}
        <div class="cbx-expected"><span>ในซองควรมีตอนนี้</span><strong>฿${money(m.envelopeNow)}</strong></div>
        ${m.inCash ? `<div class="cbx-env-move">ปิดยอดวันนี้: นำออกจากซอง <b>฿${money(m.inCash)}</b> ไปรวมเงินนำส่งวันนี้ • เหลือในซอง ฿${money(m.heldCash)}</div>` : ''}
        ${m.refundCash ? `<div class="cbx-line cbx-muted"><span>คืนมัดจำเงินสดจากซองแล้ว</span><span>฿${money(m.refundCash)}</span></div>` : ''}
        ${m.heldQr ? `<div class="cbx-line cbx-muted"><span>มัดจำโอน (อยู่ในบัญชี)</span><span>฿${money(m.heldQr)}</span></div>` : ''}
      </div>`;
  }

  function diffBadge(d) {
    d = r2(d);
    if (Math.abs(d) < 0.01) return '<span class="cbx-badge ok">ตรง ✓</span>';
    return d > 0 ? `<span class="cbx-badge over">เกิน ฿${money(d)}</span>` : `<span class="cbx-badge short">ขาด ฿${money(-d)}</span>`;
  }
  function lastCountHtml(c, expectedNow) {
    return `
      <div class="cbx-last">
        <div class="cbx-line"><span>นับล่าสุด ${c.time} น.</span>${diffBadge(c.counted - c.expected)}</div>
        <div class="cbx-line"><span>นับได้</span><b>฿${money(c.counted)}</b></div>
        <div class="cbx-line cbx-muted"><span>ตอนนั้นควรมี</span><span>฿${money(c.expected)}</span></div>
        ${Math.abs(expectedNow - c.expected) >= 0.01 ? `<div class="cbx-hint">หลังนับ เงินในกล่อง${expectedNow > c.expected ? 'เพิ่มขึ้น' : 'ลดลง'} ฿${money(Math.abs(expectedNow - c.expected))}</div>` : ''}
        ${c.note ? `<div class="cbx-hint">หมายเหตุ: ${escapeHtml(c.note)}</div>` : ''}
      </div>`;
  }

  function depositCard(r) {
    const qr = isQr(r.deposit_method);
    return `
      <article class="cbx-bill cbx-dep ${qr ? 'is-qr' : 'is-cash'}">
        <header>
          <span class="cbx-time">${new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span class="cbx-dev">${escapeHtml(norm(r.deposit_terminal))}${r.staff_name ? ` <span class="cbx-staff">👤 ${escapeHtml(r.staff_name)}</span>` : ''}</span>
          <span class="cbx-no">${escapeHtml(r.res_no)}</span>
          <span class="cbx-tag dep">มัดจำ → ${qr ? 'แยกยอด' : 'ซองมัดจำ'}</span>
          <span class="cbx-pay ${qr ? 'qr' : 'cash'}">${qr ? 'โอน/QR' : 'เงินสด'}</span>
        </header>
        <div class="cbx-items"><div class="cbx-item"><span class="cbx-iname">${escapeHtml(r.customer_name)} • นัดรับ ${new Date(r.pickup_date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span><span class="cbx-iqty">ยอดเต็ม ${money(r.total_amount)}</span><span class="cbx-isum"></span></div></div>
        <footer><div class="cbx-f"><span>รับมัดจำ</span><b class="total">฿${money(r.deposit_amount)}</b></div></footer>
      </article>`;
  }

  function finalCard(r) {
    const qr = isQr(r.final_method);
    return `
      <article class="cbx-bill cbx-dep ${qr ? 'is-qr' : 'is-cash'}">
        <header>
          <span class="cbx-time">${new Date(r.picked_up_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span class="cbx-dev">${escapeHtml(norm(r.final_terminal))}</span>
          <span class="cbx-no">${escapeHtml(r.res_no)}</span>
          <span class="cbx-tag dep">รับของใบจอง</span>
          <span class="cbx-pay ${qr ? 'qr' : 'cash'}">${qr ? 'โอน/QR' : 'เงินสด'}</span>
        </header>
        <div class="cbx-items"><div class="cbx-item"><span class="cbx-iname">${escapeHtml(r.customer_name)} • ${(r.items || []).map(i => escapeHtml(i.name)).join(', ')}</span><span class="cbx-iqty">มัดจำแล้ว ${money(r.deposit_amount)}</span><span class="cbx-isum"></span></div></div>
        <footer><div class="cbx-f"><span>รับเงินคงค้าง</span><b class="total">฿${money(r.final_amount)}</b></div></footer>
      </article>`;
  }

  function billCard(x) {
    const items = itemsOf(x.id);
    const qr = isQr(x.payment_method);
    const total = Number(x.total_amount || 0);
    const rec = Number(x.received_amount || (qr ? total : 0));
    const change = Number(x.change_amount || 0);
    const disc = Number(x.discount_amount || 0);
    const fresh = (freshUntil.get(x.id) || 0) > Date.now();
    return `
      <article class="cbx-bill ${fresh ? 'is-fresh' : ''} ${qr ? 'is-qr' : 'is-cash'}">
        <header>
          <span class="cbx-time">${saleTime(x)}</span>
          <span class="cbx-dev">${escapeHtml(norm(x.terminal_code))}${window.saleStaffName?.(x) ? ` <span class="cbx-staff">👤 ${escapeHtml(window.saleStaffName(x))}</span>` : ''}</span>
          <span class="cbx-no">${escapeHtml(String(x.sale_no || '').slice(-12))}</span>
          ${x.is_pending_sync ? '<span class="cbx-tag warn">รอซิงค์</span>' : ''}
          <span class="cbx-pay ${qr ? 'qr' : 'cash'}">${qr ? 'โอน/QR' : 'เงินสด'}</span>
        </header>
        <div class="cbx-items">
          ${items.length ? items.map(i => `
            <div class="cbx-item"><span class="cbx-iname">${escapeHtml(i.product_name || '-')}${i.price_note ? ` <em>${escapeHtml(i.price_note)}</em>` : ''}</span>
              <span class="cbx-iqty">${Number(i.qty)} × ${money(i.unit_price)}</span>
              <span class="cbx-isum">${money(i.line_total ?? (i.qty * i.unit_price))}</span></div>`).join('')
            : '<div class="cbx-item cbx-muted"><span>กำลังโหลดรายการ…</span></div>'}
        </div>
        <footer>
          ${disc > 0 ? `<div class="cbx-f"><span>ส่วนลด</span><b class="disc">−฿${money(disc)}</b></div>` : ''}
          <div class="cbx-f"><span>ยอดบิล</span><b class="total">฿${money(total)}</b></div>
          ${qr ? '' : `
            <div class="cbx-f"><span>รับมา</span><b>฿${money(rec)}</b></div>
            <div class="cbx-f"><span>ทอน</span><b class="change">฿${money(change)}</b></div>`}
        </footer>
      </article>`;
  }

  // ---------- การทำงาน ----------
  function cashboxFilter(f) { filter = f; renderCashbox(); }
  function cashboxDevices(d) {
    if (d === 'all') { lsSet(DEVICES_KEY, ''); }
    else {
      const cur = selectedDevices() || [];
      const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
      lsSet(DEVICES_KEY, next.join(','));
    }
    renderCashbox();
  }
  function cashboxEditFloat() {
    const b = loadBox();
    const v = window.prompt('เงินทอนตั้งต้นในกล่องวันนี้ (บาท)', String(b.float));
    if (v === null) return;
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    if (!(n >= 0)) { toast('จำนวนเงินไม่ถูกต้อง'); return; }
    b.float = r2(n); saveBox(b);
    if (window.confirm(`ใช้ ฿${money(n)} เป็นเงินทอนตั้งต้นของวันต่อๆ ไปด้วยไหม?`)) lsSet(FLOAT_DEFAULT_KEY, String(r2(n)));
    renderCashbox();
  }
  function cashboxAdjust(sign) {
    const label = sign < 0 ? 'นำเงินออกจากกล่อง' : 'เติมเงินทอนเข้ากล่อง';
    const v = window.prompt(`${label} กี่บาท?`, '');
    if (v === null) return;
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    if (!(n > 0)) { toast('จำนวนเงินไม่ถูกต้อง'); return; }
    const note = window.prompt('หมายเหตุ (ไม่ใส่ก็ได้) เช่น ส่งเจ้าของ, แลกแบงก์ย่อย', '') || '';
    const b = loadBox();
    b.adjust.push({ ts: Date.now(), time: nowHM(), amount: r2(sign * n), note: note.slice(0, 80) });
    saveBox(b);
    toast(`${label} ฿${money(n)} แล้ว`);
    renderCashbox();
  }

  // ---------- นับเงิน ----------
  function openCashCount() {
    countDraft = Object.fromEntries(DENOMS.map(d => [d.v, '']));
    countDraft.note = '';
    let dlg = document.getElementById('cashCountDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'cashCountDialog';
      dlg.className = 'cbx-dialog';
      document.body.appendChild(dlg);
    }
    renderCountDialog();
    if (!dlg.open) dlg.showModal();
    setTimeout(() => document.querySelector('#cashCountDialog input[data-d="1000"]')?.focus(), 60);
  }
  function countedTotal() { return r2(DENOMS.reduce((a, d) => a + d.v * (Number(countDraft[d.v]) || 0), 0)); }
  function renderCountDialog() {
    const dlg = document.getElementById('cashCountDialog'); if (!dlg) return;
    const exp = summary().expected;
    dlg.innerHTML = `
      <div class="cbx-dlg-head"><strong>🧮 นับเงินในกล่อง</strong>
        <button type="button" class="cbx-x" onclick="document.getElementById('cashCountDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="cbx-dlg-body">
        <div class="cbx-denoms">
          ${DENOMS.map(d => `
            <label class="cbx-denom">
              <span class="cbx-dv ${d.t === 'เหรียญ' ? 'coin' : ''}">${d.v.toLocaleString('th-TH')}</span>
              <span class="cbx-dt">${d.t}</span>
              <span class="cbx-step">
                <button type="button" onclick="cashCountStep(${d.v},-1)">−</button>
                <input type="number" inputmode="numeric" min="0" data-d="${d.v}" value="${countDraft[d.v]}" placeholder="0" oninput="cashCountInput(${d.v}, this.value)">
                <button type="button" onclick="cashCountStep(${d.v},1)">+</button>
              </span>
              <span class="cbx-dsum" id="cbxSum${d.v}">${countDraft[d.v] ? '฿' + money(d.v * Number(countDraft[d.v])) : ''}</span>
            </label>`).join('')}
        </div>
        <div class="cbx-result" id="cbxResult">${countResultHtml(exp)}</div>
        <input class="cbx-note" type="text" maxlength="80" placeholder="หมายเหตุ (ถ้ามี) เช่น ผู้นับ, เหตุผลที่ขาด/เกิน" value="${escapeHtml(countDraft.note)}" oninput="cashCountNote(this.value)">
      </div>
      <div class="cbx-dlg-foot">
        <button type="button" class="cbx-btn" onclick="document.getElementById('cashCountDialog').close()">ยกเลิก</button>
        <button type="button" class="cbx-btn cbx-btn-main" onclick="saveCashCount()">บันทึกผลนับ</button>
      </div>`;
  }
  function countResultHtml(exp) {
    const c = countedTotal();
    return `
      <div class="cbx-line"><span>นับได้</span><strong>฿${money(c)}</strong></div>
      <div class="cbx-line cbx-muted"><span>ควรมีในกล่อง</span><span>฿${money(exp)}</span></div>
      <div class="cbx-line"><span>ผลต่าง</span>${diffBadge(c - exp)}</div>`;
  }
  function refreshCountUi(v) {
    const el2 = document.getElementById('cbxSum' + v);
    if (el2) el2.textContent = countDraft[v] ? '฿' + money(v * Number(countDraft[v])) : '';
    const r = document.getElementById('cbxResult'); if (r) r.innerHTML = countResultHtml(summary().expected);
  }
  function cashCountInput(v, val) { countDraft[v] = val === '' ? '' : Math.max(0, Math.floor(Number(val) || 0)); refreshCountUi(v); }
  function cashCountStep(v, d) {
    countDraft[v] = Math.max(0, (Number(countDraft[v]) || 0) + d);
    const inp = document.querySelector(`#cashCountDialog input[data-d="${v}"]`); if (inp) inp.value = countDraft[v] || '';
    refreshCountUi(v);
  }
  function cashCountNote(v) { countDraft.note = String(v || ''); }
  function saveCashCount() {
    const counted = countedTotal();
    const expected = summary().expected;
    if (counted <= 0 && !window.confirm('ยอดที่นับได้เป็น 0 บาท บันทึกต่อไหม?')) return;
    const b = loadBox();
    b.counts.push({
      ts: Date.now(), time: nowHM(), counted, expected,
      detail: Object.fromEntries(DENOMS.filter(d => Number(countDraft[d.v])).map(d => [d.v, Number(countDraft[d.v])])),
      note: (countDraft.note || '').slice(0, 80)
    });
    saveBox(b);
    document.getElementById('cashCountDialog')?.close();
    const d = r2(counted - expected);
    toast(Math.abs(d) < 0.01 ? 'บันทึกผลนับแล้ว • เงินตรงกับระบบ ✓' : `บันทึกผลนับแล้ว • ${d > 0 ? 'เกิน' : 'ขาด'} ฿${money(Math.abs(d))}`, 5000);
    renderCashbox();
  }

  // ---------- อัปเดตอัตโนมัติ ----------
  function onPage() { return st()?.page === 'cashbox'; }
  function busyTyping() {
    const a = document.activeElement;
    return document.getElementById('cashCountDialog')?.open || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('.cbx'));
  }
  window.addEventListener('ea:data-refreshed', () => { if (onPage() && !busyTyping()) renderCashbox(); });
  window.addEventListener('ea:reservations-changed', () => { if (onPage() && !busyTyping()) renderCashbox(); });
  setInterval(() => {
    if (!onPage() || document.hidden) return;
    window.eaQuietRefresh?.();                         // ดึงบิลใหม่ทุก 15 วินาที (Realtime จะเร็วกว่านี้ถ้าเปิดไว้)
    if (!busyTyping() && [...freshUntil.values()].some(t => t < Date.now() && t > Date.now() - 16000)) renderCashbox();
  }, 15000);

  function openCashbox() {
    seenIds = null;
    if (typeof go === 'function') go('cashbox');
    window.eaQuietRefresh?.();
  }

  Object.assign(window, {
    renderCashbox, openCashbox, cashboxFilter, cashboxDevices, cashboxEditFloat, cashboxAdjust,
    openCashCount, cashCountInput, cashCountStep, cashCountNote, saveCashCount,
    eaCashboxSummary: summary
  });
})();
