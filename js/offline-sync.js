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

  // Add pending transaction to IndexedDB
  async function addPendingSale(sale) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id: sale.id || ('off-sale-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
        saleNo: sale.saleNo || ('S' + Date.now().toString().slice(-6)),
        terminal: sale.terminal || 'POS-01',
        items: sale.items || [],
        payment_method: sale.payment_method || 'cash',
        received_amount: Number(sale.received_amount || 0),
        change_amount: Number(sale.change_amount || 0),
        total_amount: Number(sale.total_amount || 0),
        note: sale.note || `ขายออฟไลน์`,
        created_at: sale.created_at || new Date().toISOString(),
        status: 'pending',
        retry_count: 0
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

  // Main Sync Execution: Transfers pending sales from IndexedDB to Supabase
  async function syncPendingTransactions(manualTrigger = false) {
    if (isSyncing) {
      console.log('⏳ Sync is already in progress, skipping duplicate call.');
      return;
    }
    isSyncing = true; // Acquire lock before the first async operation.
    let pending = [];
    try {
      pending = await getPendingSales();
    } catch (err) {
      console.error('Failed to read offline queue:', err);
      isSyncing = false;
      return;
    }
    if (pending.length === 0) {
      if (manualTrigger && typeof window.toast === 'function') {
        window.toast('ไม่มีรายการค้างซิงค์ ข้อมูลเป็นปัจจุบันแล้ว ☁️');
      }
      isSyncing = false;
      updateSyncUI();
      return;
    }

    // Verify online connectivity
    const online = await checkSupabaseConnection();
    if (!online) {
      console.log('📡 System still offline or Supabase unreachable. Sync deferred.');
      if (manualTrigger && typeof window.toast === 'function') {
        window.toast('⚠️ ยังไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
      }
      isSyncing = false;
      updateSyncUI();
      return;
    }

    updateSyncUI();

    if (typeof window.toast === 'function') {
      window.toast(`🔄 กำลังซิงค์รายการขายค้าง ${pending.length} รายการไปยัง Supabase...`, 3000);
    }

    let successCount = 0;
    let failCount = 0;

    for (const sale of pending) {
      try {
        let syncedSuccessfully = false;
        let remoteSaleNo = '';

        const client = window.getEaSupabaseClient?.();
        if (client) {
          // Use replay-safe, idempotent RPC (migration V7 required).
          const { data, error } = await client.rpc('ea_record_offline_cart_sale', {
            p_terminal_code: sale.terminal || 'POS-01',
            p_items: sale.items || [],
            p_note: sale.note || `ขายออฟไลน์ (Auto-Synced)`,
            p_client_sale_id: sale.id,
            p_payment_method: sale.payment_method || 'cash'
          });

          if (!error) {
            syncedSuccessfully = true;
            remoteSaleNo = data?.sale_no || sale.saleNo;

            // V7 saves payment_method atomically with the sale and the client_sale_id.
          } else {
            console.warn(`Supabase RPC error on sale ${sale.id}:`, error.message);
            if (/function.*does not exist|schema cache|PGRST202/i.test(error.message || '')) {
              console.error('Offline sync requires Sql/migration_v7_idempotent_offline_sales.sql');
            }
          }
        }

        if (syncedSuccessfully) {
          const removed = await removePendingSale(sale.id);
          if (removed) {
            successCount++;
            console.log(`✅ Synced offline sale ${sale.id} -> ${remoteSaleNo}`);
          } else {
            // The server might already have the sale. V7 idempotency makes a retry safe.
            failCount++;
            console.error(`Sale ${sale.id} synced remotely but is still queued locally.`);
          }
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error processing pending sale ${sale.id}:`, err);
        failCount++;
      }
    }

    isSyncing = false;
    updateSyncUI();

    if (successCount > 0) {
      if (typeof window.beepSuccess === 'function') {
        window.beepSuccess();
      }
      if (typeof window.toast === 'function') {
        window.toast(`✅ ซิงค์ยอดขายออฟไลน์สำเร็จ ${successCount} รายการเรียบร้อย ☁️`, 5000);
      }
      // Refresh app data so stock levels and sales tables match Supabase
      if (typeof window.loadAll === 'function') {
        window.loadAll();
      }
    } else if (failCount > 0 && manualTrigger) {
      if (typeof window.toast === 'function') {
        window.toast(`⚠️ ไม่สามารถซิงค์ได้ ${failCount} รายการ กรุณาลองใหม่อีกครั้ง`);
      }
    }

    // Trigger registered listeners
    syncListeners.forEach(fn => fn({ successCount, failCount, remaining: pending.length - successCount }));
  }

  // Update UI Elements (Header Badge, POS Banner, etc.)
  async function updateSyncUI() {
    const count = await getPendingCount();
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
          headerText.textContent = `รอซิงค์ ${count} บิล`;
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
            <span><strong>เชื่อมต่อเน็ตแล้ว:</strong> มีรายการขายออฟไลน์ค้างซิงค์ <strong>${count} รายการ</strong></span>
          </div>
          <button type="button" class="pos-net-btn" onclick="EaOfflineSync.syncPendingTransactions(true)">⚡ ซิงค์ทันที</button>
        `;
        posBanner.style.display = 'flex';
      } else {
        posBanner.className = 'pos-net-banner online';
        posBanner.innerHTML = `
          <div class="pos-net-info">
            <span class="pos-net-dot green"></span>
            <span><strong>ออนไลน์:</strong> เชื่อมต่อฐานข้อมูล Supabase เรียบร้อย ข้อมูลเป็นปัจจุบัน</span>
          </div>
        `;
        posBanner.style.display = 'flex';
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
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('✅ Service Worker registered successfully with scope:', registration.scope);

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
        getPendingCount().then((count) => {
          if (count > 0 && !isSyncing) {
            syncPendingTransactions();
          }
        });
      }
    });

    // 4. Periodic background check every 25 seconds
    setInterval(async () => {
      if (navigator.onLine && !isSyncing) {
        const count = await getPendingCount();
        if (count > 0) {
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
