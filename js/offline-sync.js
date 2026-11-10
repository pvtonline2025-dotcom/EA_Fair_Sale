/**
 * EA Fair Sale - Offline Sync & Background Service Worker Coordinator
 * Manages IndexedDB persistent queue, connectivity transitions, and auto-sync to Supabase.
 */

(function () {
  const DB_NAME = 'EaFairSaleOfflineDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'pending_pos_sales';

  let dbInstance = null;
  let isSyncing = false;
  let syncListeners = [];

  // Open IndexedDB
  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };
      req.onsuccess = () => {
        dbInstance = req.result;
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Client-side sale id. Format must match the server regex: ^off-sale-[0-9]+-[0-9]+$
  function newClientSaleId() {
    let rand;
    try {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      rand = buf[0];
    } catch (e) {
      rand = Math.floor(Math.random() * 4294967295);
    }
    return 'off-sale-' + Date.now() + '-' + rand;
  }

  // ---- Remote recording (shared by online checkout and offline replay) ----

  function isMissingFunctionError(error) {
    const msg = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
    return /PGRST202|42883|could not find the function|function .* does not exist|schema cache/i.test(msg);
  }

  // Network trouble: the request may or may not have reached the server.
  // Safe to retry ONLY with an idempotent RPC (same client_sale_id).
  function isTransientError(error, status) {
    if (!error) return false;
    if (status === 0 || status === 408 || status === 429 || status >= 500) return true;
    const msg = `${error.message || ''} ${error.details || ''} ${error.error || ''}`;
    return /Failed to fetch|NetworkError|Network connection failed|Network request failed|timeout|Service Unavailable|Load failed|ECONN|offline/i.test(msg);
  }

  function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ data: null, error: { message: 'timeout' }, status: 0 }), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function receivedForServer(sale) {
    const total = Number(sale.total_amount || 0);
    const rec = Number(sale.received_amount || 0);
    if (sale.payment_method !== 'cash') return null;
    return rec >= total && rec > 0 ? rec : null; // null = exact amount
  }

  /**
   * Record a sale in Supabase using the newest idempotent RPC available.
   * Returns { ok, data, error, transient, missingFunction, rpc }.
   *  - V8 ea_record_pos_sale: atomic (discount, payment, received/change, idempotent)
   *  - V7 ea_record_offline_cart_sale: idempotent; discount patched afterwards (best effort)
   */
  async function recordSaleRemote(sale) {
    const client = window.getEaSupabaseClient?.();
    if (!client) return { ok: false, transient: true, error: { message: 'Supabase client not ready' } };

    const items = (sale.items || []).map(it => {
      const row = { product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.unit_price) };
      if (it.price_note) row.price_note = String(it.price_note).slice(0, 100);
      if (Array.isArray(it.weights) && it.weights.length) row.weights = it.weights.map(Number).filter(w => w > 0);
      return row;
    });
    const paymentMethod = sale.payment_method === 'promptpay' ? 'promptpay' : 'cash';
    const billDiscount = Math.max(0, Number(sale.bill_discount || 0));
    const note = sale.note || 'ขายออฟไลน์ (Auto-Synced)';

    try {
      // --- V8 ---
      let res = await withTimeout(client.rpc('ea_record_pos_sale', {
        p_terminal_code: sale.terminal || 'POS-01',
        p_items: items,
        p_note: note,
        p_client_sale_id: sale.id,
        p_payment_method: paymentMethod,
        p_bill_discount: billDiscount,
        p_received_amount: receivedForServer(sale)
      }), 15000);

      if (!res.error) return { ok: true, data: res.data, rpc: 'v8' };
      if (!isMissingFunctionError(res.error)) {
        return { ok: false, error: res.error, transient: isTransientError(res.error, res.status), rpc: 'v8' };
      }

      // --- V7 fallback ---
      res = await withTimeout(client.rpc('ea_record_offline_cart_sale', {
        p_terminal_code: sale.terminal || 'POS-01',
        p_items: items,
        p_note: note,
        p_client_sale_id: sale.id,
        p_payment_method: paymentMethod
      }), 15000);

      if (res.error) {
        return {
          ok: false,
          error: res.error,
          transient: isTransientError(res.error, res.status),
          missingFunction: isMissingFunctionError(res.error),
          rpc: 'v7'
        };
      }

      const data = res.data || {};
      // V7 stores the gross total. Patch the net total when a bill discount exists.
      if (billDiscount > 0 && data.sale_id && !data.already_synced) {
        const net = Math.max(0, Number(data.total_amount || 0) - billDiscount);
        try {
          await client.from('ea_sales').update({ total_amount: net }).eq('id', data.sale_id);
          await client.from('ea_sales').update({ discount_amount: billDiscount }).eq('id', data.sale_id);
        } catch (e) { /* column may not exist before V8 */ }
        data.total_amount = net;
      }
      console.warn('[EA] Using V7 RPC. Run migration_v8_pos_sale_with_discount.sql to store bill discounts atomically.');
      return { ok: true, data, rpc: 'v7' };
    } catch (err) {
      return { ok: false, error: { message: err?.message || String(err) }, transient: true };
    }
  }

  // Add pending transaction to IndexedDB
  async function addPendingSale(sale) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id: sale.id || newClientSaleId(),
        saleNo: sale.saleNo || ('S' + Date.now().toString().slice(-6)),
        terminal: sale.terminal || 'POS-01',
        items: sale.items || [],
        payment_method: sale.payment_method || 'cash',
        received_amount: Number(sale.received_amount || 0),
        change_amount: Number(sale.change_amount || 0),
        total_amount: Number(sale.total_amount || 0),
        bill_discount: Number(sale.bill_discount || 0),
        sale_date: sale.sale_date || '',
        sale_time: sale.sale_time || '',
        item_details: Array.isArray(sale.item_details) ? sale.item_details : [],
        note: sale.note || `ขายออฟไลน์`,
        created_at: sale.created_at || new Date().toISOString(),
        status: 'pending',
        retry_count: 0,
        last_error: ''
      };

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
        store.put(record);
      });

      console.log('📦 Stored pending POS transaction into IndexedDB:', record.saleNo);
      updateSyncUI();

      // Request background sync from Service Worker
      requestBackgroundSync();

      return record;
    } catch (err) {
      console.error('Failed to add pending sale to IndexedDB:', err);
      return null;
    }
  }

  // Get all pending transactions
  async function getPendingSales() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.filter(x => x.status === 'pending' || x.status === 'failed'));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to fetch pending sales from IndexedDB:', err);
      return [];
    }
  }

  // Get count of pending transactions
  async function getPendingCount() {
    const list = await getPendingSales();
    return list.length;
  }

  // Update fields of a queued record (status, retry_count, last_error ...)
  async function updatePendingSale(id, patch) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) store.put({ ...req.result, ...patch });
        };
        tx.oncomplete = () => resolve(true);
        tx.onabort = () => reject(tx.error || new Error('IndexedDB update aborted'));
        tx.onerror = () => reject(tx.error || new Error('IndexedDB update failed'));
      });
      return true;
    } catch (err) {
      console.error('Failed to update pending sale:', err);
      return false;
    }
  }

  // Remove or mark a transaction as synced
  async function removePendingSale(id) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onabort = () => reject(tx.error || new Error('IndexedDB deletion aborted'));
        tx.onerror = () => reject(tx.error || new Error('IndexedDB deletion failed'));
        store.delete(id);
      });
      updateSyncUI();
      return true;
    } catch (err) {
      console.error('Failed to remove pending sale from IndexedDB:', err);
      return false;
    }
  }

  // Request Service Worker Background Sync
  async function requestBackgroundSync() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await registration.sync.register('sync-pos-transactions');
          console.log('🔄 Registered Service Worker Background Sync: sync-pos-transactions');
        } else {
          // Fallback message to active worker
          registration.active?.postMessage({ type: 'TRIGGER_SYNC' });
        }
      } catch (e) {
        console.warn('Background sync registration notice:', e);
      }
    }
  }

  // Test real Supabase connectivity
  async function checkSupabaseConnection() {
    if (!navigator.onLine) return false;
    try {
      const client = window.getEaSupabaseClient?.();
      if (client) {
        // Quick query with 4-second timeout
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
        const checkPromise = client.from('ea_settings').select('setting_key').limit(1);
        const { error } = await Promise.race([checkPromise, timeoutPromise]);
        return !error;
      }
      return false; // Internet reachability is not enough to prove database availability.
    } catch (e) {
      return false;
    }
  }

  // Main Sync Execution: Transfers pending sales from IndexedDB to Supabase.
  // Auto runs retry only 'pending' records; records rejected by the server
  // (e.g. insufficient stock) become 'failed' and are retried only manually.
  async function syncPendingTransactions(manualTrigger = false) {
    if (isSyncing) {
      console.log('⏳ Sync is already in progress, skipping duplicate call.');
      return;
    }
    isSyncing = true; // Acquire lock before the first async operation.
    let successCount = 0;
    let failCount = 0;
    let rejected = [];
    let queue = [];
    try {
      const all = await getPendingSales();
      queue = all
        .filter(x => manualTrigger || x.status !== 'failed')
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

      if (queue.length === 0) {
        if (manualTrigger && typeof window.toast === 'function') {
          window.toast('ไม่มีรายการค้างซิงค์ ข้อมูลเป็นปัจจุบันแล้ว ☁️');
        }
        return;
      }

      const online = await checkSupabaseConnection();
      if (!online) {
        console.log('📡 System still offline or Supabase unreachable. Sync deferred.');
        if (manualTrigger && typeof window.toast === 'function') {
          window.toast('⚠️ ยังไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
        }
        return;
      }

      updateSyncUI();
      if (typeof window.toast === 'function') {
        window.toast(`🔄 กำลังซิงค์รายการขายค้าง ${queue.length} รายการไปยัง Supabase...`, 3000);
      }

      for (const sale of queue) {
        const result = await recordSaleRemote(sale);

        if (result.ok) {
          const removed = await removePendingSale(sale.id);
          if (removed) {
            successCount++;
            console.log(`✅ Synced offline sale ${sale.id} -> ${result.data?.sale_no || sale.saleNo}`);
          } else {
            // Server already has it; the idempotent RPC makes the next retry harmless.
            failCount++;
          }
          continue;
        }

        failCount++;
        const message = result.error?.message || 'Unknown error';
        console.warn(`Sync failed for ${sale.id}:`, message);

        if (result.missingFunction) {
          console.error('Offline sync requires database/migrations/migration_v7 (or v8).');
          await updatePendingSale(sale.id, { last_error: 'ฐานข้อมูลยังไม่ได้ติดตั้ง migration V7/V8' });
          break;
        }
        if (result.transient) {
          await updatePendingSale(sale.id, { retry_count: (sale.retry_count || 0) + 1, last_error: message });
          break; // Connection is unstable: stop and retry later, keeping order.
        }
        // Permanent rejection (stock, inactive product, invalid data ...)
        await updatePendingSale(sale.id, {
          status: 'failed',
          retry_count: (sale.retry_count || 0) + 1,
          last_error: message
        });
        rejected.push({ saleNo: sale.saleNo, message });
      }
    } catch (err) {
      console.error('Offline sync error:', err);
    } finally {
      isSyncing = false;
      updateSyncUI();
    }

    if (successCount > 0) {
      if (typeof window.beepSuccess === 'function') window.beepSuccess();
      if (typeof window.toast === 'function') {
        window.toast(`✅ ซิงค์ยอดขายออฟไลน์สำเร็จ ${successCount} รายการเรียบร้อย ☁️`, 5000);
      }
      if (typeof window.loadAll === 'function') window.loadAll();
    }
    if (rejected.length > 0 && typeof window.toast === 'function') {
      const first = rejected[0];
      const reason = /Insufficient stock/i.test(first.message) ? 'สต็อกบนเซิร์ฟเวอร์ไม่พอ'
        : /Product not found/i.test(first.message) ? 'สินค้าถูกปิดหรือลบไปแล้ว'
        : first.message;
      window.toast(`⚠️ บิล ${first.saleNo} ซิงค์ไม่ผ่าน (${reason}) • เติมสต็อกแล้วกดป้าย "รอซิงค์" ด้านบนเพื่อลองใหม่`, 7000);
    } else if (failCount > 0 && successCount === 0 && manualTrigger && typeof window.toast === 'function') {
      window.toast(`⚠️ ไม่สามารถซิงค์ได้ ${failCount} รายการ กรุณาลองใหม่อีกครั้ง`);
    }

    syncListeners.forEach(fn => {
      try { fn({ successCount, failCount, remaining: queue.length - successCount }); } catch (e) {}
    });
  }

  // Update UI Elements (Header Badge, POS Banner, etc.)
  async function updateSyncUI() {
    const list = await getPendingSales();
    const count = list.length;
    const failedCount = list.filter(x => x.status === 'failed').length;
    const appState = window.getEaAppState?.();
    const isOnline = navigator.onLine && !(appState?.isOffline);

    // Header Sync Badge
    const headerPill = document.getElementById('posSyncHeaderBadge');
    const headerText = document.getElementById('posSyncHeaderText');
    if (headerPill && headerText) {
      if (count > 0 || isSyncing) {
        headerPill.classList.remove('hidden');
        if (isSyncing) {
          headerPill.className = 'sync-header-pill syncing';
          headerText.textContent = 'กำลังซิงค์...';
        } else {
          headerPill.className = 'sync-header-pill pending';
          headerText.textContent = failedCount > 0
            ? `รอซิงค์ ${count} บิล (มีปัญหา ${failedCount})`
            : `รอซิงค์ ${count} บิล`;
        }
      } else {
        headerPill.classList.add('hidden');
      }
    }

    // Header Offline Badge
    const offlineBadge = document.getElementById('offlineHeaderBadge');
    if (offlineBadge) {
      offlineBadge.classList.toggle('hidden', isOnline);
    }

    // POS Screen Dedicated Network Status Banner
    const posBanner = document.getElementById('posNetworkSyncBanner');
    if (posBanner) {
      if (isSyncing) {
        posBanner.className = 'pos-net-banner syncing';
        posBanner.innerHTML = `
          <div class="pos-net-info">
            <span class="pos-net-spinner"></span>
            <span>กำลังซิงค์ข้อมูลกับ Supabase... (เหลือ ${count} รายการ)</span>
          </div>
        `;
        posBanner.style.display = 'flex';
      } else if (!isOnline) {
        posBanner.className = 'pos-net-banner offline';
        posBanner.innerHTML = `
          <div class="pos-net-info">
            <span class="pos-net-dot red"></span>
            <span><strong>โหมดออฟไลน์:</strong> ขายสินค้าได้ต่อเนื่อง • บันทึกลงเครื่องทันที</span>
          </div>
          ${count > 0 ? `<button type="button" class="pos-net-btn" onclick="EaOfflineSync.syncPendingTransactions(true)">⚡ รอซิงค์ ${count} บิล</button>` : ''}
        `;
        posBanner.style.display = 'flex';
      } else if (count > 0) {
        posBanner.className = 'pos-net-banner pending';
        posBanner.innerHTML = `
          <div class="pos-net-info">
            <span class="pos-net-dot amber"></span>
            <span><strong>เชื่อมต่อเน็ตแล้ว:</strong> มีรายการขายออฟไลน์ค้างซิงค์ <strong>${count} รายการ</strong>${failedCount > 0 ? ` • <strong>${failedCount} บิลถูกปฏิเสธ</strong> (เช่น สต็อกไม่พอ) ต้องตรวจสอบ` : ''}</span>
          </div>
          <button type="button" class="pos-net-btn" onclick="EaOfflineSync.syncPendingTransactions(true)">⚡ ซิงค์ทันที</button>
        `;
        posBanner.style.display = 'flex';
      } else {
        // ปกติ (ออนไลน์ ไม่มีค้าง) ไม่ต้องแสดงแถบ — ลดสิ่งรบกวนหน้าขาย
        posBanner.className = 'pos-net-banner online';
        posBanner.innerHTML = '';
        posBanner.style.display = 'none';
      }
    }
  }

  // Connectivity change handler
  async function handleConnectivityChange(online) {
    // Browser's online flag does not guarantee that Supabase can be reached.
    const connected = online && await checkSupabaseConnection();
    console.log(`🌐 Connectivity transition: ${connected ? 'DATABASE ONLINE' : 'OFFLINE'}`);
    const state = window.getEaAppState?.();
    if (state) state.isOffline = !connected;
    updateSyncUI();

    if (connected) {
      if (typeof window.toast === 'function') {
        window.toast('🌐 กลับมาเชื่อมต่อฐานข้อมูลแล้ว! กำลังตรวจสอบคิวซิงค์...');
      }
      setTimeout(() => syncPendingTransactions(), 1000);
    } else if (typeof window.toast === 'function') {
      window.toast('📴 ยังเชื่อมต่อฐานข้อมูลไม่ได้ • ใช้โหมดออฟไลน์');
    }
  }

  // Initialize Service Worker and Connectivity Listeners
  async function init() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const hadController = !!navigator.serviceWorker.controller;
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        console.log('✅ Service Worker registered successfully with scope:', registration.scope);
        try { registration.update(); } catch (_) {}

        // ไม่รีโหลดหน้าเองเมื่อ Service Worker เวอร์ชันใหม่เข้ามาแทน:
        // หน้าเว็บ/JS/CSS/โลโก้ โหลดจากเน็ตก่อนเสมอ (network-first) จึงเป็นเวอร์ชันล่าสุดตั้งแต่โหลดแรกแล้ว
        // การ reload ตอน controllerchange ทำให้แอปโหลดซ้ำ 2 รอบ (เห็นหน้าโหลด/สแปลชสองครั้ง)
        void hadController;

        // Listen for messages from Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          const msg = event.data;
          if (!msg) return;

          if (msg.type === 'EXECUTE_PENDING_SYNC') {
            console.log('📥 Received EXECUTE_PENDING_SYNC request from Service Worker');
            syncPendingTransactions();
          } else if (msg.type === 'POS_SYNC_COMPLETED') {
            console.log('📥 Service Worker completed background sync:', msg);
            updateSyncUI();
            if (typeof window.loadAll === 'function') {
              window.loadAll();
            }
          }
        });
      } catch (err) {
        console.warn('Service Worker registration failed:', err);
      }
    }

    // 2. Window online/offline event listeners
    window.addEventListener('online', () => handleConnectivityChange(true));
    window.addEventListener('offline', () => handleConnectivityChange(false));

    // 3. Page visibility change: when cashier returns to tab, check if online & sync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        getPendingSales().then((list) => {
          if (list.some(x => x.status !== 'failed') && !isSyncing) {
            syncPendingTransactions();
          }
        });
      }
    });

    // 4. Periodic background check every 25 seconds
    setInterval(async () => {
      if (navigator.onLine && !isSyncing) {
        const list = await getPendingSales();
        if (list.some(x => x.status !== 'failed')) {
          syncPendingTransactions();
        }
      }
    }, 25000);

    // Initial check
    setTimeout(() => {
      updateSyncUI();
      if (navigator.onLine) {
        syncPendingTransactions();
      }
    }, 2000);
  }

  // Export public API
  window.EaOfflineSync = {
    init,
    addPendingSale,
    getPendingSales,
    getPendingCount,
    removePendingSale,
    updatePendingSale,
    recordSaleRemote,
    newClientSaleId,
    isTransientError,
    isMissingFunctionError,
    syncPendingTransactions,
    updateSyncUI,
    onSyncComplete: (fn) => syncListeners.push(fn),
    get isSyncing() { return isSyncing; },
    get isOnline() { return navigator.onLine; }
  };

  // Auto-init on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
