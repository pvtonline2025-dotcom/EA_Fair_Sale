/**
 * EA Fair Sale - Remote Scan Carts (มือถือสแกน → ส่งไปเครื่องคิดเงิน)
 *
 * มือถือ:   สแกนเป็นชุด (Batch Scan) → กด "ส่งไปเครื่องคิดเงิน" → ได้เลขบิล เช่น M042
 * แท็บเล็ต: กล่อง "บิลจากมือถือ" ขึ้นทันที → กด "รับเข้าตะกร้า" → รับเงินและปิดบิลตามปกติ
 *           (ตัดสต็อกตอนปิดบิล ผ่าน ea_record_pos_sale)
 *
 * ต้องรัน database/migrations/migration_v9_remote_scan_carts.sql ก่อน
 * Uses globals from app.js (classic scripts share the global scope):
 *   state, money, escapeHtml, el, toast, productById, saveCartLocal, updateBottomNav,
 *   updateBatchScanQueueUI, renderSale, go, beepSuccess, stopScanner, startScanner
 */
(function () {
  const DEVICE_KEY = 'ea_device_id';
  const TARGET_KEY = 'ea_remote_target_terminal';
  const INBOX_KEY = 'ea_remote_inbox_enabled';
  const POLL_MS = 10000;
  const TERMINAL_CHOICES = ['POS-01', 'POS-02', 'POS-03', 'POS-04'];

  let inbox = [];               // pending carts visible to this device
  const hiddenIds = new Set();  // dismissed on this device only
  const seenIds = new Set();
  let channel = null;
  let pollTimer = null;
  let sending = false;
  let claiming = false;

  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function deviceId() {
    let id = lsGet(DEVICE_KEY, '');
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      lsSet(DEVICE_KEY, id);
    }
    return id;
  }

  function client() { return window.getEaSupabaseClient?.() || null; }
  function appState() { return window.getEaAppState?.() || null; }
  function terminal() { return String(appState()?.terminal || 'POS-01').toUpperCase(); }
  function getTarget() { return lsGet(TARGET_KEY, 'ALL'); }
  // Default: tablets/desktops receive, phones (narrow screens) only send
  function inboxEnabled() {
    const v = lsGet(INBOX_KEY, '');
    if (v === '') return Math.min(window.innerWidth, window.innerHeight) >= 600;
    return v !== 'false';
  }

  function friendlyError(error) {
    const msg = String(error?.message || error || '');
    if (/PGRST202|could not find the function|does not exist|schema cache|ea_remote_carts/i.test(msg)) {
      return 'ฐานข้อมูลยังไม่ได้ติดตั้งระบบส่งบิลจากมือถือ (รัน migration_v9_remote_scan_carts.sql)';
    }
    if (/already claimed/i.test(msg)) return 'บิลนี้ถูกเครื่องอื่นรับไปแล้ว';
    if (/Product not found/i.test(msg)) return 'ไม่พบสินค้าในระบบ (อาจถูกปิดใช้งาน)';
    if (/Failed to fetch|Network|Service Unavailable|timeout/i.test(msg)) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้';
    return msg || 'เกิดข้อผิดพลาด';
  }

  // =========================================================
  // PHONE: send the batch queue to the cashier
  // =========================================================

  // Send a list of {product_id, qty} as one bill. Throws a friendly Error on failure.
  async function sendRemoteCartItems(items) {
    const st = appState();
    const sb = client();
    if (!sb || st?.isOffline || !navigator.onLine) {
      throw new Error('ออฟไลน์อยู่ ส่งไปเครื่องคิดเงินไม่ได้ กรุณาต่ออินเทอร์เน็ต');
    }
    const clean = (items || []).filter(x => x.product_id && Number(x.qty) > 0)
      .map(x => ({ product_id: x.product_id, qty: Number(x.qty) }));
    if (!clean.length) throw new Error('ยังไม่มีสินค้าในบิล');
    const { data, error } = await sb.rpc('ea_send_remote_cart', {
      p_items: clean,
      p_sender: `${terminal()} • มือถือ`,
      p_sender_device: deviceId(),
      p_target_terminal: getTarget()
    });
    if (error) throw new Error(friendlyError(error));
    return data;
  }

  async function sendBatchQueueToCashier() {
    if (sending) return;
    const st = appState();
    const queue = (st?.batchScanQueue || []).filter(x => Number(x.qty) > 0);
    if (!queue.length) { toast('ยังไม่มีสินค้าในคิว สแกนสินค้าก่อนส่ง'); return; }

    sending = true;
    setSendButtonsBusy(true);
    try {
      const target = getTarget();
      const data = await sendRemoteCartItems(queue);
      st.batchScanQueue = [];
      updateBatchScanQueueUI();
      beepSuccess();
      navigator.vibrate?.([60, 60, 120]);
      showSentTicket(data, target);
      toast(`📤 ส่งบิล ${data.ticket_no} ไปเครื่องคิดเงินแล้ว (${data.item_count} รายการ ${Number(data.total_qty)} ชิ้น)`, 5000);
    } catch (err) {
      console.error('Send remote cart failed:', err);
      toast('ส่งไม่สำเร็จ: ' + friendlyError(err), 5000);
    } finally {
      sending = false;
      setSendButtonsBusy(false);
    }
  }

  function setSendButtonsBusy(busy) {
    document.querySelectorAll('.btn-remote-send').forEach(b => {
      b.disabled = busy;
      b.classList.toggle('is-busy', busy);
    });
  }

  function showSentTicket(data, target) {
    const box = el('remoteSentTicket');
    if (!box) return;
    box.innerHTML = `
      <div class="remote-ticket-label">ส่งแล้ว • บอกลูกค้าเลขบิล</div>
      <div class="remote-ticket-no">${escapeHtml(data.ticket_no)}</div>
      <div class="remote-ticket-meta">${data.item_count} รายการ · ${Number(data.total_qty)} ชิ้น · ประมาณ ฿${money(data.est_total)}
        → ${target === 'ALL' ? 'ทุกเครื่องคิดเงิน' : escapeHtml(target)}</div>
      <button type="button" class="remote-ticket-cancel" onclick="cancelRemoteCart('${escapeHtml(data.id)}')">ยกเลิกบิลนี้</button>
    `;
    box.hidden = false;
    clearTimeout(showSentTicket._t);
    showSentTicket._t = setTimeout(() => { box.hidden = true; }, 20000);
  }

  async function cancelRemoteCartRaw(id) {
    const sb = client();
    if (!sb) throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล');
    const { data, error } = await sb.rpc('ea_cancel_remote_cart', { p_id: id });
    if (error) throw new Error(friendlyError(error));
    return Boolean(data);
  }

  async function cancelRemoteCart(id) {
    const sb = client();
    if (!sb) return;
    if (!confirm('ยกเลิกบิลที่ส่งไปเครื่องคิดเงิน?')) return;
    const { data, error } = await sb.rpc('ea_cancel_remote_cart', { p_id: id });
    if (error) { toast('ยกเลิกไม่สำเร็จ: ' + friendlyError(error)); return; }
    toast(data ? 'ยกเลิกบิลแล้ว' : 'ยกเลิกไม่ได้ เครื่องคิดเงินรับบิลไปแล้ว');
    const box = el('remoteSentTicket');
    if (box) box.hidden = true;
  }

  function setRemoteTarget(value) {
    lsSet(TARGET_KEY, value || 'ALL');
    toast(value === 'ALL' ? 'ส่งไป: ทุกเครื่องคิดเงิน' : `ส่งไป: ${value}`);
  }

  // Render the target selector + send button inside the scanner batch panel
  function renderSenderControls() {
    const wrap = el('remoteSendControls');
    if (!wrap) return;
    const target = getTarget();
    const choices = ['ALL', ...TERMINAL_CHOICES];
    if (!choices.includes(target)) choices.push(target);
    wrap.innerHTML = `
      <label class="remote-target-label" for="remoteTargetSelect">ส่งไปเครื่อง</label>
      <select id="remoteTargetSelect" class="remote-target-select" onchange="setRemoteTarget(this.value)">
        ${choices.map(c => `<option value="${escapeHtml(c)}" ${c === target ? 'selected' : ''}>${c === 'ALL' ? 'ทุกเครื่องคิดเงิน' : escapeHtml(c)}</option>`).join('')}
      </select>
    `;
  }

  // Shortcut: open the camera in batch mode, ready to send to the cashier
  function startRemoteScan() {
    if (typeof window.openPhoneScan === 'function') { window.openPhoneScan(); return; }
    lsSet('ea_batch_scan_enabled', 'true');
    const st = appState();
    if (st) st.batchScanEnabled = true;
    renderSenderControls();
    startScanner();
  }

  // =========================================================
  // TABLET: inbox of carts sent from phones
  // =========================================================

  function visibleForMe(row) {
    if (!row || row.status !== 'pending') return false;
    if (row.sender_device && row.sender_device === deviceId()) return false;
    if (hiddenIds.has(row.id)) return false;
    return row.target_terminal === 'ALL' || row.target_terminal === terminal();
  }

  async function refreshInbox() {
    const sb = client();
    if (!sb || !inboxEnabled() || !navigator.onLine) { inbox = []; renderInbox(); return; }
    try {
      const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const { data, error } = await sb.from('ea_remote_carts')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) {
        if (/ea_remote_carts|PGRST205|does not exist|schema cache/i.test(error.message || '')) stopReceiver();
        return;
      }
      const next = (data || []).filter(visibleForMe);
      const fresh = next.filter(r => !seenIds.has(r.id));
      next.forEach(r => seenIds.add(r.id));
      inbox = next;
      renderInbox();
      if (fresh.length) {
        beepSuccess();
        navigator.vibrate?.(150);
        toast(`📱 มีบิลจากมือถือใหม่ ${fresh.map(r => r.ticket_no).join(', ')}`, 4000);
      }
    } catch (e) { /* offline: keep current list */ }
  }

  function renderInbox() {
    let box = el('remoteCartInbox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'remoteCartInbox';
      box.className = 'remote-inbox';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    if (!inbox.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `
      <div class="remote-inbox-head">📱 บิลจากมือถือ <span class="remote-inbox-count">${inbox.length}</span></div>
      ${inbox.slice(0, 4).map(r => {
        const names = (r.items || []).slice(0, 3).map(i => `${escapeHtml(i.product_name || 'สินค้า')} ×${Number(i.qty)}`).join(', ');
        const more = (r.items || []).length > 3 ? ` และอีก ${(r.items.length - 3)} รายการ` : '';
        const time = new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="remote-inbox-card">
            <div class="remote-inbox-top">
              <strong class="remote-inbox-ticket">${escapeHtml(r.ticket_no)}</strong>
              <span class="remote-inbox-meta">${escapeHtml(r.sender || 'มือถือ')} · ${time} น.</span>
            </div>
            <div class="remote-inbox-items">${names}${more}</div>
            <div class="remote-inbox-bottom">
              <span class="remote-inbox-total">${r.item_count} รายการ · ${Number(r.total_qty)} ชิ้น · ~฿${money(r.est_total)}</span>
              <span class="remote-inbox-actions">
                <button type="button" class="remote-inbox-hide" onclick="hideRemoteCart('${escapeHtml(r.id)}')" title="ซ่อนจากเครื่องนี้">✕</button>
                <button type="button" class="remote-inbox-claim" onclick="claimRemoteCart('${escapeHtml(r.id)}')">รับเข้าตะกร้า</button>
              </span>
            </div>
          </div>`;
      }).join('')}
      ${inbox.length > 4 ? `<div class="remote-inbox-more">อีก ${inbox.length - 4} บิลรอคิว</div>` : ''}
    `;
  }

  function hideRemoteCart(id) {
    hiddenIds.add(id);
    inbox = inbox.filter(r => r.id !== id);
    renderInbox();
  }

  async function claimRemoteCart(id) {
    if (claiming) return;
    const st = appState();
    const sb = client();
    if (!sb || !st) return;

    if (st.cart.length) {
      const merge = confirm('ตะกร้ามีสินค้าค้างอยู่\n\nตกลง = รวมบิลจากมือถือเข้ากับตะกร้าเดิม\nยกเลิก = ไม่รับตอนนี้ (ปิดบิลเดิมก่อน)');
      if (!merge) return;
    }

    claiming = true;
    try {
      const { data, error } = await sb.rpc('ea_claim_remote_cart', { p_id: id, p_terminal: terminal() });
      if (error) throw error;

      let added = 0;
      const missing = [];
      const short = [];
      for (const it of data.items || []) {
        const p = productById(it.product_id);
        if (!p) { missing.push(it.product_name || 'สินค้า'); continue; }
        const stock = Number(p.stock_qty || 0);
        const existing = st.cart.find(c => c.product_id === p.id);
        const inCart = existing ? Number(existing.qty || 0) : 0;
        const want = Number(it.qty) || 0;
        const canAdd = Math.max(0, Math.min(want, stock - inCart));
        if (canAdd < want) short.push(`${p.product_name} (ขาด ${want - canAdd})`);
        if (canAdd <= 0) continue;
        if (existing) {
          existing.qty += canAdd;
        } else {
          st.cart.push({
            product_id: p.id,
            name: p.product_name,
            barcode: p.barcode || '',
            unit: p.unit || p.unit_name || 'ชิ้น',
            qty: canAdd,
            unit_price: Number(p.sale_price),
            original_price: Number(p.sale_price),
            stock,
            discount_note: '',
            is_discounted: false
          });
        }
        added += canAdd;
      }

      saveCartLocal();
      updateBottomNav();
      inbox = inbox.filter(r => r.id !== id);
      renderInbox();
      if (st.page === 'sale') renderSale(); else go('sale');

      if (missing.length || short.length) {
        alert(`รับบิล ${data.ticket_no} แล้ว แต่มีบางรายการเข้าไม่ครบ:\n` +
          (short.length ? `\n• สต็อกไม่พอ: ${short.join(', ')}` : '') +
          (missing.length ? `\n• ไม่พบสินค้าในเครื่อง: ${missing.join(', ')} (กดรีเฟรชข้อมูล)` : ''));
      } else {
        toast(`🛒 รับบิล ${data.ticket_no} เข้าตะกร้าแล้ว (${added} ชิ้น) • รับเงินแล้วกดยืนยันการขาย`, 4000);
      }
    } catch (err) {
      toast('รับบิลไม่สำเร็จ: ' + friendlyError(err), 4000);
      refreshInbox();
    } finally {
      claiming = false;
    }
  }

  function toggleRemoteInbox(enabled) {
    lsSet(INBOX_KEY, enabled ? 'true' : 'false');
    if (enabled) startReceiver(); else { stopReceiver(); inbox = []; renderInbox(); }
  }

  function startReceiver() {
    stopReceiver();
    const sb = client();
    if (!sb || !inboxEnabled()) return;
    refreshInbox();
    pollTimer = setInterval(() => { if (!document.hidden) refreshInbox(); }, POLL_MS);
    try {
      channel = sb.channel('ea-remote-carts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ea_remote_carts' }, () => refreshInbox())
        .subscribe();
    } catch (e) { channel = null; /* polling still works */ }
  }

  function stopReceiver() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (channel) {
      try { client()?.removeChannel(channel); } catch (e) {}
      channel = null;
    }
  }

  function init() {
    deviceId();
    renderSenderControls();
    // Give app.js time to create the client and load products
    setTimeout(startReceiver, 1500);
    window.addEventListener('online', () => setTimeout(refreshInbox, 1500));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshInbox(); });
  }

  Object.assign(window, {
    sendBatchQueueToCashier,
    cancelRemoteCart,
    setRemoteTarget,
    startRemoteScan,
    claimRemoteCart,
    hideRemoteCart,
    toggleRemoteInbox,
    refreshRemoteInbox: refreshInbox,
    isRemoteInboxEnabled: inboxEnabled,
    sendRemoteCartItems,
    cancelRemoteCartRaw,
    getRemoteTarget: getTarget,
    remoteTerminalChoices: () => ['ALL', ...TERMINAL_CHOICES]
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
