/**
 * EA Fair Sale - ศูนย์กลาง (Hub) + อัปเดตข้อมูลอัตโนมัติ
 *
 * 1) ทุกเครื่อง: ดึงยอดขายวันนี้ / สต็อก / การรับเงิน ใหม่แบบเงียบๆ
 *    - ทันทีเมื่อมีบิลใหม่ (Supabase Realtime) • สำรองด้วยการเช็กทุก 30 วินาที
 * 2) แท็บเล็ต: หน้า "ศูนย์กลาง" แสดงยอดแยกเครื่อง, รับเงินสดจากแต่ละเครื่อง (ขาด/เกิน),
 *    สต็อกใกล้หมด และบิลล่าสุดจากทุกเครื่อง
 *
 * ต้องรัน database/migrations/migration_v10_hub_cash_handover.sql (ส่วนรับเงินสด + Realtime)
 * Uses globals from app.js: state, money, escapeHtml, el, toast, todayISO, setHeader, go,
 *   lowProducts, saveLocalState, mergePendingOfflineSalesIntoState, checkoutInProgress
 */
(function () {
  const POLL_MS = 30000;
  const RECEIVER_KEY = 'ea_hub_received_by';

  let refreshing = false;
  let lastRefreshAt = 0;
  let debounceTimer = null;
  let channel = null;
  let openForm = null;          // terminal code whose handover form is open
  let pendingRender = false;
  let savingHandover = false;
  let handoverReady = true;     // false when migration V10 is missing

  function client() { return window.getEaSupabaseClient?.() || null; }
  function st() { return window.getEaAppState?.() || null; }
  function isQr(pm) { const v = String(pm || '').toLowerCase(); return v === 'promptpay' || v === 'qr' || v === 'transfer'; }
  function norm(code) { return String(code || 'POS-01').trim().toUpperCase(); }
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function timeHM(s) {
    if (s.sale_time) return String(s.sale_time).slice(0, 5);
    if (s.created_at) return new Date(s.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return '-';
  }

  // =========================================================
  // Quiet refresh (no loading screen, keeps the cashier's work intact)
  // =========================================================
  async function quietRefresh() {
    const s = st();
    const sb = client();
    if (!s || !sb || refreshing || !navigator.onLine || s.loading) return;
    if (typeof checkoutInProgress !== 'undefined' && checkoutInProgress) return;
    refreshing = true;
    try {
      const today = todayISO();
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const [p, sales, items, h] = await Promise.all([
        sb.from('ea_products').select('*').eq('is_active', true).order('product_name'),
        sb.from('ea_sales').select('*').eq('sale_date', today).order('created_at', { ascending: false }).limit(2000),
        sb.from('ea_sale_items').select('*').gte('created_at', startOfToday.toISOString()).limit(5000),
        handoverReady
          ? sb.from('ea_cash_handovers').select('*').eq('handover_date', today).order('created_at', { ascending: true })
          : Promise.resolve({ data: null, error: { message: 'skipped' } })
      ]);
      if (p.error || sales.error || items.error) return;

      const todayIds = new Set((sales.data || []).map(x => x.id));
      const keepSales = (s.sales || []).filter(x => x.sale_date !== today && !x.is_pending_sync && !todayIds.has(x.id));
      const fetchedItemIds = new Set((items.data || []).map(x => x.id));
      const keepItems = (s.saleItems || []).filter(x =>
        !todayIds.has(x.sale_id) && !fetchedItemIds.has(x.id) && !String(x.sale_id || '').startsWith('off-sale-'));

      s.products = p.data || [];
      s.sales = [...(sales.data || []), ...keepSales];
      s.saleItems = [...(items.data || []), ...keepItems];
      if (h.error) {
        if (h.error.message !== 'skipped') {
          // 404 = migration V10 not installed: stop asking until the app is reloaded
          handoverReady = !(h.status === 404 || /ea_cash_handovers|PGRST205|does not exist|schema cache|not found/i.test(`${h.error.code || ''} ${h.error.message || ''}`));
        }
      } else {
        handoverReady = true;
        s.handovers = h.data || [];
      }
      s.isOffline = false;

      if (typeof mergePendingOfflineSalesIntoState === 'function') await mergePendingOfflineSalesIntoState();
      else if (typeof saveLocalState === 'function') saveLocalState();
      lastRefreshAt = Date.now();

      const typing = document.activeElement && document.activeElement.closest?.('.hub') && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (s.page === 'hub') {
        if (openForm || typing) pendingRender = true; else renderHub();
      } else if (s.page === 'home' && typeof renderHome === 'function') {
        renderHome();
      }
      window.dispatchEvent(new Event('ea:data-refreshed'));
    } catch (e) {
      // network hiccup: try again next tick
    } finally {
      refreshing = false;
    }
  }

  function scheduleRefresh(delay = 1200) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(quietRefresh, delay);
  }

  function startLive() {
    const sb = client();
    if (!sb) return;
    try {
      if (channel) sb.removeChannel(channel);
      channel = sb.channel('ea-hub-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ea_sales' }, () => scheduleRefresh())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ea_products' }, () => scheduleRefresh(2000))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ea_cash_handovers' }, () => scheduleRefresh(500))
        .subscribe();
    } catch (e) { channel = null; }
    setInterval(() => {
      if (!document.hidden && Date.now() - lastRefreshAt > POLL_MS - 1000) quietRefresh();
    }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRefresh(300); });
    window.addEventListener('online', () => scheduleRefresh(2000));
  }

  // =========================================================
  // Per-device figures
  // =========================================================
  function handoversFor(code, date) {
    return (st()?.handovers || []).filter(h => norm(h.terminal_code) === norm(code) && h.handover_date === (date || todayISO()));
  }

  function deviceStats() {
    const s = st();
    const today = todayISO();
    const map = new Map();
    const get = (code) => {
      const k = norm(code);
      if (!map.has(k)) map.set(k, { code: k, bills: 0, total: 0, cash: 0, qr: 0, cashBills: 0, qrBills: 0, pending: 0, last: null, received: 0, handovers: [] });
      return map.get(k);
    };
    for (const sale of (s?.sales || [])) {
      if (sale.sale_date !== today || sale.is_cancelled) continue;
      const d = get(sale.terminal_code);
      const amt = Number(sale.total_amount || 0);
      d.bills += 1;
      d.total += amt;
      if (isQr(sale.payment_method)) { d.qr += amt; d.qrBills += 1; } else { d.cash += amt; d.cashBills += 1; }
      if (sale.is_pending_sync) d.pending += 1;
      const t = sale.created_at || `${sale.sale_date}T${sale.sale_time || '00:00:00'}`;
      if (!d.last || String(t) > String(d.last.t)) { d.last = { t, label: timeHM(sale) }; d.staff = window.saleStaffName?.(sale) || d.staff || ''; }
      const sn = window.saleStaffName?.(sale); if (sn) { d.staffSet = d.staffSet || new Set(); d.staffSet.add(sn); }
    }
    for (const h of (s?.handovers || [])) {
      if (h.handover_date !== today) continue;
      const d = get(h.terminal_code);
      d.received += Number(h.received_amount || 0);
      d.handovers.push(h);
    }
    for (const d of map.values()) d.outstanding = Math.round((d.cash - d.received) * 100) / 100;
    return [...map.values()].sort((a, b) => b.total - a.total);
  }

  // For the phone summary: what this device already handed over today
  function getHandoverInfo(code) {
    const list = handoversFor(code);
    return { received: list.reduce((a, h) => a + Number(h.received_amount || 0), 0), count: list.length, ready: handoverReady };
  }

  // =========================================================
  // Hub page
  // =========================================================
  function renderHub() {
    const s = st();
    if (!s) return;
    pendingRender = false;
    setHeader('ศูนย์กลาง', 'ยอดขายทุกเครื่องวันนี้ • อัปเดตอัตโนมัติ');
    const devices = deviceStats();
    const g = devices.reduce((a, d) => ({
      total: a.total + d.total, bills: a.bills + d.bills, cash: a.cash + d.cash, qr: a.qr + d.qr,
      received: a.received + d.received, pending: a.pending + d.pending
    }), { total: 0, bills: 0, cash: 0, qr: 0, received: 0, pending: 0 });
    const outstanding = g.cash - g.received;
    // ใบจองที่ส่งของวันนี้: มัดจำ + เงินคงค้าง นับเป็นยอดของวันนี้
    const rm = window.eaReservationMoney?.() || null;
    const rs = rm ? rm.sales : 0, rc = rm ? rm.todayCash : 0, rq = rm ? rm.todayQr : 0;
    const low = (typeof lowProducts === 'function' ? lowProducts() : [])
      .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty));
    const outCount = low.filter(p => Number(p.stock_qty) <= 0).length;
    const recent = (s.sales || []).filter(x => x.sale_date === todayISO() && !x.is_cancelled)
      .sort((a, b) => String(b.created_at || b.sale_time).localeCompare(String(a.created_at || a.sale_time)))
      .slice(0, 12);
    const updated = lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

    el('content').innerHTML = `
      <section class="hub">
        <div class="hub-top">
          <div class="hub-live ${s.isOffline ? 'is-off' : ''}">
            <span class="hub-dot"></span>${s.isOffline ? 'ออฟไลน์ • ข้อมูลอาจไม่ล่าสุด' : `อัปเดตล่าสุด ${updated}`}
          </div>
          <button type="button" class="hub-btn-ghost" onclick="hubRefreshNow()">↻ อัปเดตตอนนี้</button>
        </div>

        ${window.renderHubToolbar ? window.renderHubToolbar() : ''}

        <div class="hub-kpis">
          <div class="hub-kpi hub-kpi-main">
            <span>ยอดขายรวมวันนี้ (ทุกเครื่อง)</span>
            <strong>฿${money(g.total + rs)}</strong>
            <small>${g.bills} บิล · ${devices.filter(d => d.bills).length} เครื่อง${rs ? ` · รวมใบจองส่งของ ฿${money(rs)}` : ''}</small>
          </div>
          <div class="hub-kpi"><span>💵 เงินสด</span><strong>฿${money(g.cash + rc)}</strong>${rc ? `<small>ใบจอง ฿${money(rc)}</small>` : ''}</div>
          <div class="hub-kpi"><span>📱 โอน / QR</span><strong>฿${money(g.qr + rq)}</strong>${rq ? `<small>ใบจอง ฿${money(rq)}</small>` : ''}</div>
          <div class="hub-kpi ${outstanding > 0.009 ? 'is-warn' : 'is-ok'}">
            <span>เงินสดที่ยังไม่ได้รับจากเครื่อง</span>
            <strong>฿${money(Math.max(0, outstanding))}</strong>
            <small>รับแล้ว ฿${money(g.received)}</small>
          </div>
        </div>
        ${g.pending ? `<div class="hub-alert">⏳ มี ${g.pending} บิลที่ขายตอนออฟไลน์และยังไม่ซิงค์ (เห็นเฉพาะในเครื่องที่ขาย) • ยอดจะครบเมื่อเครื่องนั้นต่ออินเทอร์เน็ต</div>` : ''}
        ${!handoverReady ? `<div class="hub-alert">ยังไม่ได้ติดตั้งระบบรับเงินสด • รัน <b>migration_v10_hub_cash_handover.sql</b> ใน Supabase</div>` : ''}

        <h2 class="hub-h">ยอดแยกตามเครื่อง</h2>
        <div class="hub-devices">
          ${devices.length ? devices.map(renderDevice).join('') : '<div class="hub-empty">ยังไม่มีบิลวันนี้</div>'}
        </div>

        ${window.renderHubRestockPanel ? window.renderHubRestockPanel() : ''}

        <div class="hub-cols">
          <div class="hub-panel">
            <div class="hub-panel-head">
              <h2 class="hub-h">สต็อกใกล้หมด <span class="hub-badge ${outCount ? 'is-bad' : ''}">${low.length}</span></h2>
              <button type="button" class="hub-btn-ghost" onclick="go('stock')">จัดการสต็อก →</button>
            </div>
            ${low.length ? `<div class="hub-list">${low.slice(0, 10).map(p => `
              <div class="hub-list-row">
                <span class="hub-list-name">${escapeHtml(p.product_name)}</span>
                <span class="hub-stock ${Number(p.stock_qty) <= 0 ? 'is-out' : 'is-low'}">${Number(p.stock_qty) <= 0 ? 'หมด' : `เหลือ ${Number(p.stock_qty)}`}</span>
              </div>`).join('')}
              ${low.length > 10 ? `<div class="hub-more">และอีก ${low.length - 10} รายการ</div>` : ''}</div>`
            : '<div class="hub-empty">สต็อกปกติทุกรายการ ✓</div>'}
          </div>

          <div class="hub-panel">
            <div class="hub-panel-head">
              <h2 class="hub-h">บิลล่าสุด (ทุกเครื่อง)</h2>
              <button type="button" class="hub-btn-ghost" onclick="go('salesHistory')">ประวัติทั้งหมด →</button>
            </div>
            ${recent.length ? `<div class="hub-list">${recent.map(x => `
              <div class="hub-list-row hub-bill">
                <span class="hub-bill-time">${escapeHtml(timeHM(x))}</span>
                <span class="hub-bill-dev">${escapeHtml(norm(x.terminal_code))}</span>
                <span class="hub-pm ${isQr(x.payment_method) ? 'is-qr' : ''}">${isQr(x.payment_method) ? 'QR' : 'สด'}</span>
                <strong>฿${money(x.total_amount)}</strong>
              </div>`).join('')}</div>`
            : '<div class="hub-empty">ยังไม่มีบิลวันนี้</div>'}
          </div>
        </div>
      </section>
    `;
  }

  function renderDevice(d) {
    const formOpen = openForm === d.code;
    const out = d.outstanding;
    const status = d.cash <= 0 && d.received <= 0 ? ''
      : Math.abs(out) < 0.01 ? '<span class="hub-tag is-ok">ส่งเงินครบ ✓</span>'
      : out > 0 ? `<span class="hub-tag is-warn">ค้างส่ง ฿${money(out)}</span>`
      : `<span class="hub-tag is-info">รับเกิน ฿${money(-out)}</span>`;
    const lastH = d.handovers[d.handovers.length - 1];
    return `
      <article class="hub-device">
        <header class="hub-device-head">
          <div>
            <div class="hub-device-name">${escapeHtml(d.code)}${d.staffSet && d.staffSet.size ? ` <span class="hub-device-staff">👤 ${escapeHtml([...d.staffSet].join(', '))}</span>` : ''}</div>
            <div class="hub-device-sub">${d.bills} บิล${d.last ? ` · ล่าสุด ${escapeHtml(d.last.label)} น.` : ''}${d.pending ? ` · <b class="hub-pending">${d.pending} รอซิงค์</b>` : ''}</div>
          </div>
          <div class="hub-device-total">฿${money(d.total)}</div>
        </header>
        <div class="hub-device-grid">
          <div><span>💵 เงินสด</span><strong>฿${money(d.cash)}</strong><small>${d.cashBills} บิล</small></div>
          <div><span>📱 QR/โอน</span><strong>฿${money(d.qr)}</strong><small>${d.qrBills} บิล</small></div>
          <div><span>รับเงินแล้ว</span><strong>฿${money(d.received)}</strong><small>${d.handovers.length} ครั้ง</small></div>
        </div>
        <div class="hub-device-foot">
          ${status}
          ${lastH ? `<span class="hub-device-lasth">ล่าสุด: ${escapeHtml(new Date(lastH.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))} น. ${lastH.received_by ? 'โดย ' + escapeHtml(lastH.received_by) : ''}${Math.abs(Number(lastH.difference)) >= 0.01 ? ` (${Number(lastH.difference) > 0 ? 'เกิน' : 'ขาด'} ฿${money(Math.abs(Number(lastH.difference)))})` : ''}</span>` : ''}
          ${handoverReady && !formOpen ? `<button type="button" class="hub-btn" onclick="openHubHandover('${escapeHtml(d.code)}')">💵 รับเงินสดจากเครื่องนี้</button>` : ''}
        </div>
        ${formOpen ? renderHandoverForm(d) : ''}
      </article>`;
  }

  function renderHandoverForm(d) {
    const expected = Math.max(0, d.outstanding);
    return `
      <div class="hub-form">
        <div class="hub-form-expected">
          <span>ควรได้รับ (เงินสดขายได้ ฿${money(d.cash)} − รับแล้ว ฿${money(d.received)})</span>
          <strong>฿${money(expected)}</strong>
        </div>
        <label class="hub-field"><span>นับเงินได้จริง (บาท)</span>
          <input id="hubCounted" type="number" inputmode="decimal" min="0" step="any" value="${expected}" oninput="hubHandoverDiff(${d.outstanding})">
        </label>
        <div id="hubDiff" class="hub-diff is-ok">ตรงยอด ✓</div>
        <div class="hub-form-row">
          <label class="hub-field"><span>ผู้รับเงิน</span>
            <input id="hubReceivedBy" type="text" maxlength="60" value="${escapeHtml(lsGet(RECEIVER_KEY, ''))}" placeholder="ชื่อผู้รับ">
          </label>
          <label class="hub-field"><span>หมายเหตุ</span>
            <input id="hubNote" type="text" maxlength="200" placeholder="เช่น ส่งเงินรอบเที่ยง">
          </label>
        </div>
        <div class="hub-form-actions">
          <button type="button" class="hub-btn-ghost" onclick="closeHubHandover()">ยกเลิก</button>
          <button type="button" class="hub-btn" id="hubSaveBtn" onclick="saveHubHandover('${escapeHtml(d.code)}')">บันทึกรับเงิน</button>
        </div>
      </div>`;
  }

  function hubHandoverDiff(outstanding) {
    const counted = Number(el('hubCounted')?.value || 0);
    const diff = Math.round((counted - outstanding) * 100) / 100; // (รับแล้ว + ครั้งนี้) − เงินสดที่ขายได้
    const box = el('hubDiff');
    if (!box) return;
    if (Math.abs(diff) < 0.01) { box.className = 'hub-diff is-ok'; box.textContent = 'ตรงยอด ✓'; }
    else if (diff < 0) { box.className = 'hub-diff is-bad'; box.textContent = `ขาด ฿${money(-diff)}`; }
    else { box.className = 'hub-diff is-warn'; box.textContent = `เกิน ฿${money(diff)}`; }
  }

  function openHubHandover(code) {
    openForm = code;
    renderHub();
    setTimeout(() => { const i = el('hubCounted'); if (i) { i.focus(); i.select(); } }, 30);
  }
  function closeHubHandover() {
    openForm = null;
    renderHub();
  }

  async function saveHubHandover(code) {
    if (savingHandover) return;
    const sb = client();
    if (!sb || !navigator.onLine) { toast('ต้องต่ออินเทอร์เน็ตเพื่อบันทึกการรับเงิน'); return; }
    const d = deviceStats().find(x => x.code === code);
    if (!d) return;
    const counted = Number(el('hubCounted')?.value);
    if (!Number.isFinite(counted) || counted < 0) { toast('กรุณาใส่จำนวนเงินที่นับได้'); return; }
    const receivedBy = String(el('hubReceivedBy')?.value || '').trim();
    const note = String(el('hubNote')?.value || '').trim();
    lsSet(RECEIVER_KEY, receivedBy);

    savingHandover = true;
    const btn = el('hubSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    try {
      const { data, error } = await sb.rpc('ea_record_cash_handover', {
        p_terminal_code: code,
        p_handover_date: todayISO(),
        p_cash_sales_total: Math.round(d.cash * 100) / 100,
        p_received_amount: counted,
        p_received_by: receivedBy,
        p_note: note
      });
      if (error) throw error;
      const s = st();
      s.handovers = [...(s.handovers || []), data];
      openForm = null;
      const diff = Number(data.difference || 0);
      toast(Math.abs(diff) < 0.01
        ? `✅ รับเงินจาก ${code} ฿${money(counted)} • ยอดตรง`
        : `⚠️ รับเงินจาก ${code} ฿${money(counted)} • ${diff < 0 ? 'ขาด' : 'เกิน'} ฿${money(Math.abs(diff))}`, 5000);
      renderHub();
      scheduleRefresh(300);
    } catch (err) {
      const msg = err?.message || String(err);
      toast('บันทึกไม่สำเร็จ: ' + (/ea_record_cash_handover|PGRST202|schema cache/i.test(msg) ? 'ยังไม่ได้รัน migration V10' : msg), 5000);
      if (btn) { btn.disabled = false; btn.textContent = 'บันทึกรับเงิน'; }
    } finally {
      savingHandover = false;
    }
  }

  function hubRefreshNow() {
    toast('กำลังอัปเดต...');
    quietRefresh().then(() => { if (st()?.page === 'hub') renderHub(); });
    window.addEventListener('ea:reservations-changed', () => { if (st()?.page === 'hub') renderHub(); });
  }

  function init() {
    // Start after app.js has done its first full load
    setTimeout(() => { startLive(); quietRefresh(); }, 3000);
  }

  Object.assign(window, {
    renderHub,
    hubRefreshNow,
    openHubHandover,
    closeHubHandover,
    saveHubHandover,
    hubHandoverDiff,
    getHandoverInfo,
    hubDeviceStats: deviceStats,
    eaQuietRefresh: quietRefresh
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
