/**
 * EA Fair Sale - ใบสั่งจองสินค้า (มัดจำ + นัดวันรับ)
 *
 *  - สร้างใบจอง: ลูกค้า, สินค้า, มัดจำ (สด/โอน), วันนัดรับ, จุดรับ (บูธ / ร้าน-โกดัง), การเบิกของ
 *  - ใบรับมัดจำเป็นรูป → แชร์ LINE ให้ลูกค้า
 *  - ของจองขึ้นในใบเบิกอัตโนมัติ (ก่อนวันนัด 1 วัน / ทันที / ไม่ต้องเบิก)
 *  - ลูกค้ามารับที่บูธ → เปิดบิลขาย หักมัดจำ ตัดสต็อก • รับที่ร้าน → บันทึกว่ารับแล้ว
 *  - ยกเลิก → คืน/ไม่คืนมัดจำ
 *  - มัดจำเงินสดเข้ากล่องเงินของวันนั้น
 *
 * ต้องรัน database/migrations/migration_v15_reservations.sql (ถ้ายังไม่รัน จะเก็บใบจองไว้ในเครื่องนี้ชั่วคราว)
 */
(function () {
  const LOCAL_KEY = 'ea_reservations_local';
  let list = [];
  let ready = null;          // null = ยังไม่รู้, true = มีตารางในฐานข้อมูล, false = ใช้ในเครื่อง
  let loading = false;
  let lastLoad = 0;
  let tab = 'today';
  let search = '';
  let form = null;           // ข้อมูลฟอร์มที่กำลังกรอก
  let slip = null;           // { blob, url, file }
  let formOpts = null;       // มือถือ: { items, onSaved(row), onClose() }

  const st = () => window.getEaAppState?.() || null;
  const sb = () => window.getEaSupabaseClient?.() || null;
  const r2 = n => Math.round(Number(n || 0) * 100) / 100;
  const isQr = pm => ['promptpay', 'qr', 'transfer'].includes(String(pm || '').toLowerCase());
  const todayIso = () => (typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10));
  function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function thDate(iso) { if (!iso) return '-'; const d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function staff() { return window.getStaffName?.() || ''; }
  function terminal() { return String(st()?.terminal || 'POS-01'); }
  function shopName() { return 'เอิร์นนี่ แอดวานซ์'; }   // หัวกระดาษใบจอง

  // ---------- ข้อมูล ----------
  function localList() { try { return JSON.parse(lsGet(LOCAL_KEY, '[]')) || []; } catch (_) { return []; } }
  function saveLocalList(a) { lsSet(LOCAL_KEY, JSON.stringify(a)); }

  async function load(force) {
    if (loading || (!force && Date.now() - lastLoad < 4000)) return list;
    loading = true;
    try {
      const c = sb();
      if (c && navigator.onLine && ready !== false) {
        const since = new Date(Date.now() - 120 * 86400000).toISOString();
        const r = await c.from('ea_reservations').select('*').gte('created_at', since).order('pickup_date', { ascending: true }).limit(2000);
        if (!r.error) { ready = true; list = r.data || []; lastLoad = Date.now(); return list; }
        if (r.status === 404 || /ea_reservations|PGRST205|does not exist|schema cache/i.test(`${r.error.code || ''} ${r.error.message || ''}`)) ready = false;
      }
      if (ready !== true) list = localList();
      lastLoad = Date.now();
      return list;
    } catch (_) { return list; } finally { loading = false; }
  }

  async function save(obj) {
    const c = sb();
    if (ready !== false && c) {
      if (!navigator.onLine || st()?.isOffline) throw new Error('ออฟไลน์อยู่ • บันทึกใบจองต้องใช้อินเทอร์เน็ต');
      const { data, error } = await c.rpc('ea_save_reservation', { p: obj });
      if (!error) {
        ready = true;
        const i = list.findIndex(x => x.id === data.id);
        if (i >= 0) list[i] = data; else list.push(data);
        return data;
      }
      if (!/PGRST202|could not find the function|schema cache|404/i.test(`${error.code || ''} ${error.message || ''} ${error.status || ''}`)) throw new Error(error.message || 'บันทึกไม่สำเร็จ');
      ready = false;
    }
    // ยังไม่ได้รัน V15: เก็บไว้ในเครื่องนี้
    const a = localList();
    let row;
    if (obj.id) {
      row = a.find(x => x.id === obj.id);
      if (!row) throw new Error('ไม่พบใบจอง');
      Object.assign(row, obj, { updated_at: new Date().toISOString() });
      if (obj.status === 'picked_up') row.picked_up_at = new Date().toISOString();
      if (obj.status === 'cancelled') row.cancelled_at = new Date().toISOString();
      if ('requisitioned' in obj) row.requisitioned_at = obj.requisitioned ? new Date().toISOString() : null;
    } else {
      row = { id: 'local-' + Date.now(), status: 'booked', deposit_date: todayIso(), created_at: new Date().toISOString(), refund_amount: 0, ...obj };
      a.push(row);
    }
    saveLocalList(a);
    list = a;
    return row;
  }

  function lineSum(items) { return r2((items || []).reduce((a, i) => a + Number(i.qty || 0) * Number(i.unit_price || 0), 0)); }
  function isDeal(r) { return Math.abs(lineSum(r.items) - Number(r.total_amount || 0)) > 0.009; }
  function itemTxt(i) { return Number(i.unit_price) > 0 ? `${Number(i.qty)} ${i.unit || ''} × ${money(i.unit_price)}` : `${Number(i.qty)} ${i.unit || ''}`; }
  function remaining(r) { return r2(Number(r.total_amount || 0) - Number(r.deposit_amount || 0)); }
  function needsRequisition(r, onDate) {
    if (r.status !== 'booked' || r.requisitioned_at || r.requisition_mode === 'none') return false;
    if (r.requisition_mode === 'now') return true;
    return String(r.pickup_date) <= addDays(onDate || todayIso(), 1);   // ก่อนวันนัด 1 วัน (หรือเลยมาแล้ว)
  }
  // สถานะการเบิกของ (แสดงตอนสแกนใบจอง / ในรายการ)
  function thDateTime(iso) { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${p(d.getHours())}:${p(d.getMinutes())}`; }
  // รับของเข้าบูธแล้ว = ทุกรายการมี recv_at (เก็บใน items ของใบจอง → ทุกเครื่องเห็นตรงกัน ไม่ต้องรัน SQL เพิ่ม)
  function receivedAt(r) {
    const its = Array.isArray(r?.items) ? r.items : [];
    if (!its.length || !its.every(i => i.recv_at)) return '';
    return its.map(i => String(i.recv_at)).sort().pop();
  }
  // ยังไม่เบิก → กำลังเบิกสินค้า (ยังไม่มีของที่หน้าร้าน) → มีของแล้ว (รับเข้าบูธแล้ว)
  function reqState(r) {
    if (!r || r.status !== 'booked') return null;
    const got = receivedAt(r);
    if (got) return { k: 'ready', short: 'มีของแล้ว', text: `มีของแล้ว • รับเข้าบูธ ${thDateTime(got)}` };
    if (r.requisition_mode === 'none') return { k: 'none', short: 'ไม่ต้องเบิก', text: 'ไม่ต้องเบิกของ (ใช้ของในบูธ / รับที่ร้าน)' };
    if (r.requisitioned_at) return { k: 'transit', short: 'กำลังเบิกสินค้า', text: 'กำลังเบิกสินค้า • ยังไม่มีของที่หน้าร้าน', sub: `ส่งใบเบิกแล้ว ${thDateTime(r.requisitioned_at)} • ของมาถึงแล้วกด "รับของเข้าบูธ"` };
    if (needsRequisition(r)) return { k: 'due', short: 'ยังไม่เบิก', text: 'ยังไม่ได้เบิกสินค้า • ไม่มีของที่หน้าร้าน', sub: 'อยู่ในรายการใบเบิกรอบนี้ • ส่งใบเบิกแล้วจะเปลี่ยนเป็น "กำลังเบิกสินค้า"' };
    return { k: 'later', short: 'รอรอบเบิก', text: 'ยังไม่ได้เบิกสินค้า • ยังไม่ถึงรอบเบิก', sub: `จะขึ้นในใบเบิกวัน ${thDate(addDays(r.pickup_date, -1))}` };
  }
  async function markReceived(r, on) {
    const at = new Date().toISOString();
    const items = (Array.isArray(r.items) ? r.items : []).map(i => { const x = { ...i }; if (on) x.recv_at = at; else delete x.recv_at; return x; });
    return save({ id: r.id, items });
  }
  // รับของเข้าสต็อก (📥 รับตามใบเบิก) → ใบจองที่เบิกแล้วและของที่รับมาครบ → "มีของแล้ว" อัตโนมัติ
  // แบ่งของให้ใบจองที่นัดรับก่อนได้ก่อน • ใบจองที่มีของสั่งพิเศษ (ไม่มีในระบบ) ต้องกดเองในหน้าใบจอง
  async function autoReceive(lines) {
    const avail = new Map();
    for (const l of (lines || [])) if (l?.pid) avail.set(l.pid, (avail.get(l.pid) || 0) + Number(l.qty || 0));
    if (!avail.size) return [];
    const cands = list.filter(r => r.status === 'booked' && r.requisition_mode !== 'none' && r.requisitioned_at && !receivedAt(r)
      && (r.items || []).length && r.items.every(i => i.product_id))
      .sort((a, b) => String(a.pickup_date).localeCompare(String(b.pickup_date)) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
    const done = [];
    for (const r of cands) {
      const need = new Map();
      for (const i of r.items) need.set(i.product_id, (need.get(i.product_id) || 0) + Number(i.qty || 0));
      if (![...need].every(([pid, q]) => (avail.get(pid) || 0) >= q - 1e-9)) continue;
      try { await markReceived(r, true); need.forEach((q, pid) => avail.set(pid, avail.get(pid) - q)); done.push(r.res_no); }
      catch (e) { console.warn('[reservations] auto receive', e); }
    }
    if (done.length) afterChange();
    return done;
  }
  function all() { return list.slice(); }
  function requisitionList() { return list.filter(r => needsRequisition(r)); }
  async function markRequisitioned(ids, on = true) {
    for (const id of ids) { try { await save({ id, requisitioned: on }); } catch (e) { console.warn('mark requisition', e); } }
    if (st()?.page === 'reservations') render();
  }

  // ---------- หน้ารายการ ----------
  function counts() {
    const t = todayIso();
    const booked = list.filter(r => r.status === 'booked');
    return {
      today: booked.filter(r => r.pickup_date === t).length,
      booked: booked.length,
      overdue: booked.filter(r => r.pickup_date < t).length,
      picked: list.filter(r => r.status === 'picked_up').length,
      cancelled: list.filter(r => r.status === 'cancelled').length
    };
  }
  function filtered() {
    const t = todayIso();
    let a = list.slice();
    if (tab === 'today') a = a.filter(r => r.status === 'booked' && r.pickup_date === t);
    else if (tab === 'booked') a = a.filter(r => r.status === 'booked');
    else if (tab === 'overdue') a = a.filter(r => r.status === 'booked' && r.pickup_date < t);
    else if (tab === 'picked') a = a.filter(r => r.status === 'picked_up').reverse();
    else if (tab === 'cancelled') a = a.filter(r => r.status === 'cancelled').reverse();
    const q = search.trim().toLowerCase();
    if (q) a = a.filter(r => `${r.res_no} ${r.customer_name} ${r.customer_phone}`.toLowerCase().includes(q));
    return a;
  }

  function render() {
    const s = st(); if (!s) return;
    if (typeof setHeader === 'function') setHeader('ใบสั่งจอง', ready === false ? 'ยังไม่ได้รัน Migration V15 • เก็บไว้ในเครื่องนี้ชั่วคราว' : 'มัดจำ • นัดวันรับ • เบิกของ');
    const c = counts();
    const rows = filtered();
    const tabs = [['today', 'วันนี้ต้องรับ', c.today], ['booked', 'รอรับทั้งหมด', c.booked], ['overdue', 'เลยกำหนด', c.overdue], ['picked', 'รับแล้ว', c.picked], ['cancelled', 'ยกเลิก', c.cancelled]];
    document.getElementById('content').innerHTML = `
      <div class="rsv">
        ${ready === false ? '<div class="rsv-warn">ยังไม่ได้รัน <b>migration_v15_reservations.sql</b> ใน Supabase • ใบจองเก็บในแท็บเล็ตเครื่องนี้เท่านั้น (เครื่องอื่นไม่เห็น)</div>' : ''}
        <div class="rsv-top">
          <div class="rsv-tabs">${tabs.map(([k, t, n]) => `<button type="button" class="${tab === k ? 'is-on' : ''} ${k === 'overdue' && n ? 'is-warn' : ''}" onclick="rsvTab('${k}')">${t} <b>${n}</b></button>`).join('')}</div>
          <input class="rsv-search" type="search" placeholder="ค้นหา ชื่อ / เบอร์ / เลขใบจอง" value="${escapeHtml(search)}" oninput="rsvSearch(this.value)">
          <button type="button" class="rsv-btn rsv-main" onclick="openReservationForm()">＋ สร้างใบจอง</button>
        </div>
        <div class="rsv-list">
          ${rows.length ? rows.map(card).join('') : `<div class="rsv-empty">${tab === 'today' ? 'วันนี้ไม่มีลูกค้านัดรับของ' : 'ไม่มีใบจองในหมวดนี้'}</div>`}
        </div>
      </div>`;
  }

  function reqBadge(r) {
    if (r.status === 'booked' && receivedAt(r)) return '<span class="rsv-tag ok">📦 มีของแล้ว</span>';
    if (r.requisition_mode === 'none') return '<span class="rsv-tag">ไม่ต้องเบิก</span>';
    if (r.requisitioned_at) return r.status === 'booked' ? '<span class="rsv-tag warn">🚚 กำลังเบิกสินค้า</span>' : '<span class="rsv-tag ok">เบิกแล้ว</span>';
    if (r.status !== 'booked') return '';
    if (needsRequisition(r)) return '<span class="rsv-tag warn">อยู่ในใบเบิกวันนี้</span>';
    return `<span class="rsv-tag">จะขึ้นใบเบิก ${thDate(addDays(r.pickup_date, -1))}</span>`;
  }
  function card(r) {
    const t = todayIso();
    const overdue = r.status === 'booked' && r.pickup_date < t;
    const isToday = r.status === 'booked' && r.pickup_date === t;
    const items = Array.isArray(r.items) ? r.items : [];
    return `
      <article class="rsv-card ${overdue ? 'is-overdue' : ''} ${isToday ? 'is-today' : ''} is-${r.status}">
        <header>
          <span class="rsv-no">${escapeHtml(r.res_no)}</span>
          <strong class="rsv-cust">${escapeHtml(r.customer_name)}</strong>
          ${r.customer_phone ? `<a class="rsv-phone" href="tel:${escapeHtml(r.customer_phone)}">📞 ${escapeHtml(r.customer_phone)}</a>` : ''}
          <span class="rsv-date ${overdue ? 'bad' : isToday ? 'today' : ''}">นัดรับ ${thDate(r.pickup_date)}${overdue ? ' (เลยกำหนด)' : isToday ? ' (วันนี้)' : ''}</span>
          <span class="rsv-tag ${r.pickup_place === 'shop' ? 'shop' : ''}">${r.pickup_place === 'shop' ? 'รับที่ร้าน/โกดัง' : 'รับที่บูธ'}</span>
          ${reqBadge(r)}
        </header>
        <div class="rsv-items">
          ${items.map(i => `<div class="rsv-item"><span>${escapeHtml(i.name)}${i.product_id ? '' : ' <small class="rsv-x-tag">สั่งพิเศษ</small>'}</span><span class="q">${escapeHtml(itemTxt(i))}</span><span class="s">${Number(i.unit_price) > 0 ? money(i.qty * i.unit_price) : ''}</span></div>`).join('')}
        </div>
        ${r.note ? `<div class="rsv-note">📝 ${escapeHtml(r.note)}</div>` : ''}
        <footer>
          <div class="rsv-money">
            <span>${isDeal(r) ? 'ราคาตกลง' : 'ยอดเต็ม'} <b>฿${money(r.total_amount)}</b></span>
            <span>มัดจำ <b>฿${money(r.deposit_amount)}</b> <small>${isQr(r.deposit_method) ? 'โอน' : 'สด'} ${thDate(r.deposit_date)}</small></span>
            ${r.status === 'booked' ? `<span class="due">คงค้าง <b>฿${money(remaining(r))}</b></span>` : ''}
            ${r.status === 'picked_up' ? `<span class="ok">รับแล้ว ${r.picked_up_at ? new Date(r.picked_up_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}${r.sale_no ? ` • บิล ${escapeHtml(r.sale_no)}` : ''}${Number(r.final_amount) > 0 ? ` • รับคงค้าง ฿${money(r.final_amount)} (${r.final_method === 'shop' ? 'จ่ายที่ร้าน' : isQr(r.final_method) ? 'โอน' : 'สด'})` : ''}</span>` : ''}
            ${r.status === 'cancelled' ? `<span class="bad">ยกเลิก • คืนมัดจำ ฿${money(r.refund_amount)}</span>` : ''}
          </div>
          <div class="rsv-actions">
            ${r.status === 'booked' ? `
              <button type="button" class="rsv-btn rsv-main" onclick="reservationPickup('${r.id}')">✅ ลูกค้ามารับ</button>
              <button type="button" class="rsv-btn" onclick="reservationSlip('${r.id}')">🧾 ใบรับมัดจำ</button>
              <button type="button" class="rsv-btn" onclick="eaMiniPrintReservation('${r.id}')">🖨️ พิมพ์เครื่องเล็ก</button>
              <button type="button" class="rsv-btn" onclick="reservationStickers('${r.id}')">🏷️ ป้ายสินค้าสั่งจอง</button>
              <button type="button" class="rsv-btn" onclick="openReservationForm('${r.id}')">แก้ไข</button>
              ${r.requisition_mode !== 'none' ? `<button type="button" class="rsv-btn" onclick="reservationToggleReq('${r.id}')">${r.requisitioned_at ? 'ยังไม่เบิก' : 'เบิกแล้ว'}</button>` : ''}
              <button type="button" class="rsv-btn rsv-danger" onclick="reservationCancel('${r.id}')">ยกเลิก</button>` : `
              <button type="button" class="rsv-btn" onclick="reservationSlip('${r.id}')">🧾 ใบจอง</button>`}
          </div>
        </footer>
      </article>`;
  }

  function rsvTab(t) { tab = t; render(); }
  let searchTimer = null;
  function rsvSearch(v) {
    search = String(v || '');
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const pos = document.querySelector('.rsv-search')?.selectionStart;
      render();
      const n = document.querySelector('.rsv-search'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
    }, 300);
  }

  // ---------- ฟอร์มสร้าง/แก้ไข ----------
  function products() { return (st()?.products || []).filter(p => p.is_active !== false); }
  function formLineSum() { return lineSum(form.items); }
  function formTotal() { const d = r2(Number(form.deal_total || 0)); return d > 0 ? d : formLineSum(); }
  function newResNo() {
    const d = new Date(); const p = x => String(x).padStart(2, '0');
    return `R${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${Math.floor(Math.random() * 90 + 10)}`;
  }
  function openReservationForm(id, opts) {
    const r = id ? list.find(x => x.id === id) : null;
    formOpts = opts && typeof opts === 'object' ? opts : null;
    form = r ? {
      id: r.id, res_no: r.res_no, customer_name: r.customer_name, customer_phone: r.customer_phone || '',
      items: (r.items || []).map(i => ({ ...i })), deal_total: isDeal(r) ? String(Number(r.total_amount)) : '', deposit_amount: Number(r.deposit_amount || 0), deposit_method: r.deposit_method || 'cash',
      pickup_date: r.pickup_date, pickup_place: r.pickup_place || 'booth', requisition_mode: r.requisition_mode || 'day_before', note: r.note || '', editing: true
    } : {
      res_no: newResNo(), customer_name: '', customer_phone: '', items: [], deal_total: '', deposit_amount: '', deposit_method: 'cash',
      pickup_date: addDays(todayIso(), 1), pickup_place: 'booth', requisition_mode: 'day_before', note: '', q: ''
    };
    // สินค้าที่สแกนไว้ในมือถือ → เป็นรายการจองทันที
    if (!r && Array.isArray(formOpts?.items)) {
      form.items = formOpts.items.filter(i => i && String(i.name || '').trim()).map(i => ({
        product_id: i.product_id || null, name: String(i.name), unit: i.unit || 'ชิ้น', qty: Number(i.qty) || 1, unit_price: r2(i.unit_price)
      }));
    }
    let dlg = document.getElementById('rsvFormDialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'rsvFormDialog'; dlg.className = 'rsv-dialog'; document.body.appendChild(dlg);
      // ปิดฟอร์มโดยไม่บันทึก (ปุ่มยกเลิก / ✕ / ปุ่มย้อนกลับ)
      dlg.addEventListener('close', () => { const o = formOpts; formOpts = null; form = null; try { o?.onClose?.(); } catch (_) {} });
    }
    dlg.classList.toggle('is-phone', phoneMode());
    renderForm();
    if (!dlg.open) dlg.showModal();
    // มือถือ: ไม่เด้งคีย์บอร์ดทันที (ให้เห็นรายการที่สแกนมาก่อน)
    if (!phoneMode()) setTimeout(() => document.getElementById('rsvName')?.focus(), 60);
  }
  function seg(name, value, opts) {
    return `<div class="rsv-seg">${opts.map(([v, t]) => `<button type="button" class="${value === v ? 'is-on' : ''}" onclick="rsvSet('${name}','${v}')">${t}</button>`).join('')}</div>`;
  }
  function renderForm(focusId) {
    const dlg = document.getElementById('rsvFormDialog'); if (!dlg || !form) return;
    const total = formTotal();
    const dep = Number(form.deposit_amount || 0);
    const q = String(form.q || '').trim().toLowerCase();
    const sugg = q ? products().filter(p => `${p.product_name} ${p.product_code || ''} ${p.barcode || ''}`.toLowerCase().includes(q)).slice(0, 8) : [];
    dlg.innerHTML = `
      <div class="rsv-dlg-head"><strong>${form.editing ? 'แก้ไขใบจอง' : 'สร้างใบสั่งจอง'} <span>${escapeHtml(form.res_no)}</span></strong>
        <button type="button" class="rsv-x" onclick="closeReservationForm()" aria-label="ปิด">✕</button></div>
      <div class="rsv-dlg-body">
        <div class="rsv-grid2">
          <label class="rsv-f"><span>ชื่อลูกค้า *</span><input id="rsvName" value="${escapeHtml(form.customer_name)}" oninput="rsvField('customer_name', this.value)" placeholder="เช่น คุณสมชาย"></label>
          <label class="rsv-f"><span>เบอร์โทร</span><input id="rsvPhone" type="tel" inputmode="tel" value="${escapeHtml(form.customer_phone)}" oninput="rsvField('customer_phone', this.value)" placeholder="08x-xxx-xxxx"></label>
        </div>

        <div class="rsv-f"><span>สินค้าที่จอง *</span>
          <div class="rsv-pick">
            <input id="rsvQ" type="search" value="${escapeHtml(form.q || '')}" placeholder="พิมพ์ชื่อสินค้าอะไรก็ได้ แล้วกด Enter • หรือค้นจากสินค้าในบูธ" oninput="rsvQuery(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();rsvAddFirst();}">
            ${q ? `<div class="rsv-sugg">
              <button type="button" class="rsv-sugg-custom" onclick="rsvAddCustom()"><span>＋ เพิ่ม "${escapeHtml(String(form.q).trim())}"</span><small>สินค้าสั่งพิเศษ (ไม่มีในบูธ) • ใส่ราคาที่ตกลงเอง</small></button>
              ${sugg.map(p => `<button type="button" onclick="rsvAdd('${p.id}')"><span>${escapeHtml(p.product_name)}</span><small>ในบูธ ฿${money(p.sale_price)} • เหลือ ${Number(p.stock_qty || 0)} ${escapeHtml(p.unit || 'ชิ้น')}</small></button>`).join('')}</div>` : ''}
          </div>
          <div class="rsv-lines">
            ${form.items.length ? form.items.map((i, k) => `
              <div class="rsv-line ${i.product_id ? '' : 'is-custom'}">
                ${i.product_id ? `<span class="n">${escapeHtml(i.name)}</span>` : `<input class="n" value="${escapeHtml(i.name)}" maxlength="120" oninput="rsvText(${k},'name',this.value)" aria-label="ชื่อสินค้า">`}
                <span class="rsv-step"><button type="button" onclick="rsvQty(${k},-1)">−</button><input type="number" inputmode="decimal" min="0" step="any" value="${i.qty}" onchange="rsvLine(${k},'qty',this.value)"><button type="button" onclick="rsvQty(${k},1)">+</button></span>
                ${i.product_id ? `<span class="u">${escapeHtml(i.unit || '')} ×</span>` : `<input class="u" value="${escapeHtml(i.unit || '')}" maxlength="20" oninput="rsvText(${k},'unit',this.value)" aria-label="หน่วย" placeholder="หน่วย">`}
                <input class="p" type="number" inputmode="decimal" min="0" step="any" value="${Number(i.unit_price) || ''}" placeholder="ราคา/หน่วย" onchange="rsvLine(${k},'unit_price',this.value)" aria-label="ราคาต่อหน่วย">
                <b class="s">${Number(i.unit_price) > 0 ? `฿${money(i.qty * i.unit_price)}` : '—'}</b>
                <button type="button" class="rsv-del" onclick="rsvRemove(${k})" aria-label="ลบ">✕</button>
              </div>`).join('') : '<div class="rsv-empty small">ยังไม่มีสินค้า • พิมพ์ชื่อสินค้าด้านบนแล้วกด Enter (ของที่ไม่มีในบูธก็ได้) • ใส่ราคาที่ตกลงกับฝ่ายขาย</div>'}
          </div>
          <button type="button" class="rsv-addline" onclick="rsvAddCustom('')">＋ เพิ่มรายการพิมพ์เอง</button>
        </div>

        <div class="rsv-grid2 rsv-deal">
          <div class="rsv-sum"><span>รวมตามรายการ</span><strong>฿${money(formLineSum())}</strong></div>
          <label class="rsv-f"><span>ราคาตกลงรวม (ถ้าตกลงเป็นก้อน)</span><input id="rsvDeal" type="number" inputmode="decimal" min="0" step="any" value="${form.deal_total}" oninput="rsvField('deal_total', this.value, true)" placeholder="ไม่ใส่ = ใช้รวมตามรายการ"></label>
        </div>
        <div class="rsv-sum is-total" id="rsvTotal"><span>ยอดที่ลูกค้าต้องจ่ายทั้งหมด</span><strong>฿${money(total)}</strong></div>

        <div class="rsv-grid2">
          <div class="rsv-f"><span>เงินมัดจำ ${form.editing ? '(แก้ไม่ได้หลังบันทึก)' : ''}</span>
            <input id="rsvDep" type="number" inputmode="decimal" min="0" step="any" value="${form.deposit_amount}" ${form.editing ? 'disabled' : ''} oninput="rsvField('deposit_amount', this.value, true)" placeholder="0">
            ${form.editing ? '' : `<div class="rsv-chips">${[[0.3, '30%'], [0.5, '50%'], [1, 'จ่ายเต็ม']].map(([f, t]) => `<button type="button" onclick="rsvDepPct(${f})">${t}</button>`).join('')}</div>`}
          </div>
          <div class="rsv-f"><span>มัดจำจ่ายด้วย</span>${form.editing ? `<div class="rsv-ro">${isQr(form.deposit_method) ? 'โอน/QR' : 'เงินสด'}</div>` : seg('deposit_method', form.deposit_method, [['cash', 'เงินสด'], ['promptpay', 'โอน/QR']])}
            ${!form.editing && isQr(form.deposit_method) ? `<div id="rsvDepQr" class="rsv-depqr">${depQrInline()}</div>` : ''}</div>
        </div>
        <div class="rsv-sum is-due" id="rsvDue"><span>คงค้าง (จ่ายวันรับของ)</span><strong>฿${money(Math.max(0, total - dep))}</strong></div>

        <div class="rsv-grid2">
          <label class="rsv-f"><span>วันนัดรับ *</span><input type="date" value="${form.pickup_date}" min="${todayIso()}" onchange="rsvField('pickup_date', this.value)"></label>
          <div class="rsv-f"><span>รับของที่</span>${seg('pickup_place', form.pickup_place, [['booth', 'บูธ (ในงาน)'], ['shop', 'ร้าน / โกดัง']])}</div>
        </div>
        <div class="rsv-f"><span>เบิกของมาเตรียม</span>${seg('requisition_mode', form.requisition_mode, [['day_before', 'ก่อนวันนัด 1 วัน'], ['now', 'เบิกทันที'], ['none', 'ไม่ต้องเบิก']])}
          <div class="rsv-hint">${form.requisition_mode === 'none' ? 'ของจะไม่ขึ้นในใบเบิก' : form.requisition_mode === 'now' ? 'ของจะขึ้นในใบเบิกรอบถัดไปทันที' : `ของจะขึ้นในใบเบิกวัน ${thDate(addDays(form.pickup_date, -1))}`}</div></div>
        <label class="rsv-f"><span>หมายเหตุ</span><input value="${escapeHtml(form.note)}" maxlength="200" oninput="rsvField('note', this.value)" placeholder="เช่น สีเขียวเข้ม, ตัดยาว 15 เมตร, ส่งทางรถลูกค้า"></label>
      </div>
      <div class="rsv-dlg-foot">
        <button type="button" class="rsv-btn" onclick="closeReservationForm()">ยกเลิก</button>
        <button type="button" class="rsv-btn rsv-main" id="rsvSaveBtn" onclick="saveReservationForm()">${form.editing ? 'บันทึกการแก้ไข' : 'บันทึกใบจอง + ออกใบรับมัดจำ'}</button>
      </div>`;
    if (focusId) { const n = document.getElementById(focusId); if (n) { n.focus(); const l = String(n.value).length; try { n.setSelectionRange(l, l); } catch (_) {} } }
  }
  function closeReservationForm() { const d = document.getElementById('rsvFormDialog'); if (d?.open) d.close(); else { formOpts = null; form = null; } }
  // ---------- QR พร้อมเพย์ยอดมัดจำ ----------
  function ppTarget() { const s = st()?.settings || {}; const raw = s.promptPayId || s.shopPhone || ''; return { raw, clean: String(raw).replace(/[^0-9]/g, '') }; }
  function depositQr(amt) {
    const pp = ppTarget();
    if (!pp.clean) return { raw: pp.raw, html: '' };
    let html = '';
    try {
      if (typeof window.qrcode === 'function' && typeof window.eaPromptPayPayload === 'function') {
        const q = window.qrcode(0, 'M'); q.addData(window.eaPromptPayPayload(pp.clean, r2(amt))); q.make(); html = q.createSvgTag(8, 4);
      }
    } catch (_) { html = ''; }
    // ตัวสร้าง QR ในเครื่องโหลดไม่ได้ → ใช้รูปจาก promptpay.io (ต้องมีเน็ต)
    if (!html) html = `<img src="https://promptpay.io/${pp.clean}/${r2(amt).toFixed(2)}.png" alt="PromptPay QR">`;
    return { raw: pp.raw, html };
  }
  // QR ในฟอร์ม (ขึ้นทันทีเมื่อเลือก โอน/QR และอัปเดตตามยอดมัดจำ)
  function depQrInline() {
    if (!form) return '';
    const amt = r2(Number(form.deposit_amount || 0));
    const pp = ppTarget();
    if (!pp.clean) return '<div class="rsv-depqr-warn">ยังไม่ได้ตั้งเบอร์พร้อมเพย์ • ตั้งที่ แอปเต็ม → ตั้งค่า → พร้อมเพย์</div>';
    if (amt <= 0) return '<div class="rsv-depqr-hint">ใส่ยอดเงินมัดจำ (หรือกด 30% / 50%) แล้ว QR จะขึ้นตรงนี้</div>';
    return `<button type="button" class="rsv-depqr-tap" onclick="rsvDepositQr()" aria-label="แสดง QR เต็มจอ">${depositQr(amt).html}</button>
      <div class="rsv-depqr-cap">พร้อมเพย์ ${escapeHtml(pp.raw)} • <b>฿${money(amt)}</b></div>
      <button type="button" class="rsv-btn rsv-qr-btn" onclick="rsvDepositQr()">⛶ แสดง QR เต็มจอให้ลูกค้าสแกน</button>`;
  }
  function refreshDepQr() { const b = document.getElementById('rsvDepQr'); if (b) b.innerHTML = depQrInline(); }
  // QR พร้อมเพย์ยอดมัดจำ (เต็มจอ ในหน้าฟอร์ม)
  function rsvDepositQr() {
    if (!form) return;
    const amt = r2(Number(form.deposit_amount || 0));
    if (amt <= 0) { toast('กรุณาใส่ยอดเงินมัดจำก่อน'); document.getElementById('rsvDep')?.focus(); return; }
    const q = depositQr(amt); q.svg = q.html;
    if (!q.svg) { toast('ยังไม่ได้ตั้งเบอร์พร้อมเพย์ (แอปเต็ม → ตั้งค่า)', 4000); return; }
    const dlg = document.getElementById('rsvFormDialog'); if (!dlg) return;
    let box = document.getElementById('rsvQrFull');
    if (!box) { box = document.createElement('div'); box.id = 'rsvQrFull'; box.className = 'rsv-qrfull'; box.onclick = () => box.remove(); }
    box.innerHTML = `<div class="rsv-qrfull-t">สแกนจ่ายมัดจำ • พร้อมเพย์</div>
      <div class="rsv-qrfull-amt">฿${money(amt)}</div>
      <div class="rsv-qrfull-code">${q.svg}</div>
      <div class="rsv-qrfull-id">พร้อมเพย์ ${escapeHtml(q.raw || '')}${form.customer_name ? ` • ${escapeHtml(form.customer_name)}` : ''}</div>
      <button type="button" class="rsv-qrfull-x">แตะเพื่อกลับ • ตรวจว่าเงินเข้าแล้วจึงกดบันทึก</button>`;
    dlg.appendChild(box);
  }
  let qrTimer = null;
  function rsvField(k, v, soft) {
    if (!form) return;
    form[k] = v;
    if (soft) {
      const t = formTotal();
      const tot = document.getElementById('rsvTotal'); if (tot) tot.querySelector('strong').textContent = `฿${money(t)}`;
      const due = document.getElementById('rsvDue'); if (due) due.querySelector('strong').textContent = `฿${money(Math.max(0, t - Number(form.deposit_amount || 0)))}`;
      if (k === 'deposit_amount') { clearTimeout(qrTimer); qrTimer = setTimeout(refreshDepQr, 250); }
      return;
    }
    if (k === 'pickup_date') renderForm();
  }
  function rsvSet(k, v) {
    if (!form) return;
    form[k] = v;
    if (k === 'pickup_place' && !form.editing) form.requisition_mode = v === 'shop' ? 'none' : 'day_before';
    renderForm();
    // เลือก โอน/QR แล้วมียอดมัดจำ → เปิด QR เต็มจอให้ลูกค้าสแกนทันที
    if (k === 'deposit_method' && isQr(v) && Number(form.deposit_amount) > 0 && ppTarget().clean) rsvDepositQr();
  }
  let qTimer = null;
  function rsvQuery(v) { form.q = v; clearTimeout(qTimer); qTimer = setTimeout(() => renderForm('rsvQ'), 200); }
  function rsvAdd(id) {
    const p = products().find(x => x.id === id); if (!p || !form) return;
    const ex = form.items.find(i => i.product_id === id);
    if (ex) ex.qty = r2(Number(ex.qty) + 1);
    else form.items.push({ product_id: p.id, name: p.product_name, unit: p.unit || p.unit_name || 'ชิ้น', qty: 1, unit_price: Number(p.sale_price || 0) });
    form.q = '';
    renderForm('rsvQ');
  }
  function rsvAddFirst() {
    const q = String(form?.q || '').trim().toLowerCase(); if (!q) return;
    // ตรงรหัส/บาร์โค้ดสินค้าในบูธ → ใช้สินค้านั้น • ไม่ตรง → เป็นสินค้าสั่งพิเศษ
    const p = products().find(x => String(x.barcode || '').toLowerCase() === q || String(x.product_code || '').toLowerCase() === q);
    if (p) rsvAdd(p.id); else rsvAddCustom();
  }
  function rsvAddCustom(name) {
    if (!form) return;
    const n = String(name === undefined ? form.q || '' : name).trim();
    form.items.push({ product_id: null, custom: true, name: n, unit: 'ชิ้น', qty: 1, unit_price: 0 });
    form.q = '';
    renderForm();
    const rows = document.querySelectorAll('#rsvFormDialog .rsv-line');
    const last = rows[rows.length - 1];
    const target = last && (n ? last.querySelector('input.p') : last.querySelector('input.n'));
    if (target) { target.focus(); try { target.select(); } catch (_) {} }
  }
  function rsvText(k, f, v) { const i = form?.items[k]; if (i) i[f] = String(v); }
  function rsvQty(k, d) { const i = form.items[k]; if (!i) return; i.qty = Math.max(0, r2(Number(i.qty) + d)); if (!i.qty) form.items.splice(k, 1); renderForm(); }
  function rsvLine(k, f, v) { const i = form.items[k]; if (!i) return; i[f] = Math.max(0, r2(Number(v) || 0)); if (f === 'qty' && !i.qty) form.items.splice(k, 1); renderForm(); }
  function rsvRemove(k) { form.items.splice(k, 1); renderForm(); }
  function rsvDepPct(f) { form.deposit_amount = String(Math.round(formTotal() * f)); renderForm(); }

  async function saveReservationForm() {
    if (!form) return;
    const total = formTotal();
    const dep = r2(Number(form.deposit_amount || 0));
    if (!String(form.customer_name).trim()) { toast('กรุณาใส่ชื่อลูกค้า'); document.getElementById('rsvName')?.focus(); return; }
    form.items = form.items.filter(i => String(i.name || '').trim() || Number(i.unit_price) > 0);
    if (!form.items.length) { toast('กรุณาเพิ่มสินค้าที่จอง'); document.getElementById('rsvQ')?.focus(); return; }
    if (form.items.some(i => !String(i.name || '').trim())) { toast('กรุณาใส่ชื่อสินค้าให้ครบทุกรายการ'); return; }
    if (total <= 0) { toast('กรุณาใส่ราคาต่อหน่วย หรือ "ราคาตกลงรวม"'); document.getElementById('rsvDeal')?.focus(); return; }
    if (!form.pickup_date) { toast('กรุณาเลือกวันนัดรับ'); return; }
    if (!form.editing && dep > total) { toast('มัดจำมากกว่ายอดเต็ม'); return; }
    if (!form.editing && dep <= 0 && !window.confirm('ยังไม่ได้ใส่เงินมัดจำ บันทึกใบจองแบบไม่มีมัดจำ?')) return;
    const btn = document.getElementById('rsvSaveBtn'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    const payload = {
      customer_name: String(form.customer_name).trim(), customer_phone: String(form.customer_phone || '').trim(),
      items: form.items.map(i => ({ product_id: i.product_id || null, name: String(i.name).trim(), unit: String(i.unit || '').trim(), qty: Number(i.qty), unit_price: Number(i.unit_price || 0), ...(i.recv_at ? { recv_at: i.recv_at } : {}) })),
      total_amount: total, pickup_date: form.pickup_date, pickup_place: form.pickup_place, requisition_mode: form.requisition_mode, note: form.note || ''
    };
    if (form.editing) payload.id = form.id;
    else Object.assign(payload, { res_no: form.res_no, deposit_amount: dep, deposit_method: form.deposit_method, deposit_date: todayIso(), deposit_terminal: terminal(), staff_name: staff() });
    try {
      const row = await save(payload);
      const wasEdit = form.editing;
      const opts = formOpts; formOpts = null;   // บันทึกแล้ว: ไม่เรียก onClose
      closeReservationForm();
      try { opts?.onSaved?.(row); } catch (_) {}
      toast(wasEdit ? `บันทึกการแก้ไข ${row.res_no} แล้ว` : `บันทึกใบจอง ${row.res_no} แล้ว • มัดจำ ฿${money(row.deposit_amount)}`, 4000);
      if (!wasEdit) { tab = 'booked'; window.dispatchEvent(new Event('ea:reservations-changed')); }
      if (st()?.page === 'reservations') render();
      if (!wasEdit) reservationSlip(row.id);
    } catch (e) {
      toast(`❌ บันทึกใบจองไม่สำเร็จ: ${e.message || e}`, 6000);
      if (btn) { btn.disabled = false; btn.textContent = 'ลองอีกครั้ง'; }
    }
  }

  // ---------- ใบรับมัดจำ (รูป) ----------
  function wrap(ctx, text, maxW) {
    const out = []; let cur = '';
    for (const ch of Array.from(String(text || ''))) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
    if (cur) out.push(cur); return out;
  }
  function drawSlip(r) {
    const W = 1080, P = 52;
    const FONT = window.getAppFontStack?.() || '"Sarabun","Noto Sans Thai",sans-serif';
    const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
    ctx.font = `600 32px ${FONT}`;
    const items = (r.items || []).map(i => ({ ...i, lines: wrap(ctx, i.name, W - 2 * P - 330) }));
    const noteLines = r.note ? wrap(ctx, '📝 ' + r.note, W - 2 * P) : [];
    const H = 330 + 60 + 430 + (isDeal(r) ? 54 : 0) + (Number(r.final_amount) > 0 ? 54 : 0) + items.reduce((a, i) => a + 26 + i.lines.length * 40, 0) + 300 + noteLines.length * 42 + 150;
    cv.width = W; cv.height = H;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#2563eb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 210);
    ctx.fillStyle = '#fff'; ctx.font = `800 54px ${FONT}`; ctx.fillText(r.status === 'booked' ? 'ใบรับมัดจำ / ใบสั่งจอง' : 'ใบสั่งจอง', P, 86);
    ctx.font = `600 32px ${FONT}`; ctx.fillText(shopName(), P, 136);
    ctx.font = `500 27px ${FONT}`; ctx.fillText(`เลขที่ ${r.res_no}  •  วันที่จอง ${thDate(r.deposit_date || todayIso())}`, P, 182);
    let y = 270;
    ctx.fillStyle = '#0f172a'; ctx.font = `800 38px ${FONT}`; ctx.fillText(`ลูกค้า: ${r.customer_name}`, P, y);
    if (r.customer_phone) { ctx.font = `600 30px ${FONT}`; ctx.fillStyle = '#475569'; ctx.textAlign = 'right'; ctx.fillText(`โทร ${r.customer_phone}`, W - P, y); ctx.textAlign = 'left'; }
    y += 40;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke(); y += 46;
    for (const i of items) {
      ctx.fillStyle = '#0f172a'; ctx.font = `600 32px ${FONT}`;
      i.lines.forEach((ln, k) => ctx.fillText(ln, P, y + k * 40));
      ctx.textAlign = 'right'; ctx.fillStyle = '#475569'; ctx.font = `500 28px ${FONT}`;
      ctx.fillText(itemTxt(i), W - P - 190, y);
      ctx.fillStyle = '#0f172a'; ctx.font = `700 32px ${FONT}`; if (Number(i.unit_price) > 0) ctx.fillText(money(i.qty * i.unit_price), W - P, y);
      ctx.textAlign = 'left';
      y += i.lines.length * 40 + 26;
    }
    ctx.beginPath(); ctx.moveTo(P, y - 10); ctx.lineTo(W - P, y - 10); ctx.stroke(); y += 36;
    const row = (label, val, color, size) => { ctx.font = `600 ${size || 32}px ${FONT}`; ctx.fillStyle = '#475569'; ctx.fillText(label, P, y); ctx.textAlign = 'right'; ctx.fillStyle = color || '#0f172a'; ctx.font = `800 ${size || 32}px ${FONT}`; ctx.fillText(val, W - P, y); ctx.textAlign = 'left'; y += (size || 32) + 22; };
    if (isDeal(r) && lineSum(r.items) > 0) row('รวมตามรายการ', `฿${money(lineSum(r.items))}`, '#94a3b8');
    row(isDeal(r) ? 'ราคาตกลง' : 'ยอดเต็ม', `฿${money(r.total_amount)}`);
    row(`มัดจำแล้ว (${isQr(r.deposit_method) ? 'โอน' : 'เงินสด'})`, `฿${money(r.deposit_amount)}`, '#047857');
    if (Number(r.final_amount) > 0) row(`รับคงค้าง (${r.final_method === 'shop' ? 'ที่ร้าน' : isQr(r.final_method) ? 'โอน' : 'เงินสด'})`, `฿${money(r.final_amount)}`, '#047857');
    row(r.status === 'picked_up' ? 'ชำระครบแล้ว' : 'คงค้าง จ่ายวันรับของ', r.status === 'picked_up' ? '✓' : `฿${money(remaining(r))}`, '#b45309', 40);
    y += 8;
    ctx.fillStyle = '#eff6ff'; ctx.fillRect(P - 16, y - 6, W - 2 * P + 32, 92);
    ctx.fillStyle = '#1d4ed8'; ctx.font = `800 36px ${FONT}`;
    ctx.fillText(`นัดรับ ${thDate(r.pickup_date)} • ${r.pickup_place === 'shop' ? 'ที่ร้าน / โกดัง' : 'ที่บูธในงาน'}`, P, y + 54);
    y += 130;
    ctx.fillStyle = '#334155'; ctx.font = `500 30px ${FONT}`; noteLines.forEach(l => { ctx.fillText(l, P, y); y += 42; });
    // บาร์โค้ดใบจอง (สแกนได้เฉพาะในแอป) ตรงกลาง
    const bh = 170;
    if (drawBarcode(ctx, barcodeText(r), P, y, W - 2 * P, bh)) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a'; ctx.font = `800 32px ${FONT}`; ctx.fillText(r.res_no, W / 2, y + bh + 42);
      ctx.fillStyle = '#475569'; ctx.font = `500 27px ${FONT}`; ctx.fillText('แสดงบาร์โค้ดนี้ให้พนักงานสแกน เมื่อมารับสินค้า', W / 2, y + bh + 84);
      ctx.textAlign = 'left';
    }
    y += bh + 110;
    ctx.fillStyle = '#94a3b8'; ctx.font = `500 24px ${FONT}`;
    ctx.fillText('กรุณาแสดงใบนี้เมื่อมารับสินค้า', P, H - 40);
    return cv;
  }
  async function reservationSlip(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    try { await document.fonts?.ready; } catch (_) {}
    const cv = drawSlip(r);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (slip?.url) URL.revokeObjectURL(slip.url);
    const file = new File([blob], `ใบจอง-${r.res_no}.png`, { type: 'image/png' });
    slip = { blob, url: URL.createObjectURL(blob), file };
    let dlg = document.getElementById('rsvSlipDialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'rsvSlipDialog'; dlg.className = 'restock-img-dialog'; document.body.appendChild(dlg);
      dlg.addEventListener('close', () => window.dispatchEvent(new Event('ea:rsv-slip-closed')));
    }
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    const canCopy = !!(window.ClipboardItem && navigator.clipboard?.write);
    dlg.innerHTML = `
      <div class="rid-head"><strong>🧾 ${escapeHtml(r.res_no)} • ${escapeHtml(r.customer_name)}</strong>
        <button type="button" class="rid-close" onclick="document.getElementById('rsvSlipDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rid-body"><img src="${slip.url}" alt="ใบรับมัดจำ"></div>
      <div class="rid-actions">
        ${canShare ? '<button type="button" class="rid-btn rid-primary" onclick="rsvSlipShare()">📤 ส่งให้ลูกค้า (LINE)</button>' : ''}
        <button type="button" class="rid-btn ${canShare ? '' : 'rid-primary'}" onclick="rsvSlipSave()">💾 บันทึกรูป</button>
        ${canCopy ? '<button type="button" class="rid-btn" onclick="rsvSlipCopy()">📋 คัดลอกรูป</button>' : ''}
        <button type="button" class="rid-btn" onclick="eaMiniPrintReservation('${r.id}')">🖨️ พิมพ์เครื่องเล็ก</button>
      </div>
      <div class="rid-hint">ส่งรูปนี้ให้ลูกค้าเก็บไว้ เป็นหลักฐานการจองและมัดจำ</div>`;
    if (!dlg.open) dlg.showModal();
  }
  async function rsvSlipShare() { try { await navigator.share({ files: [slip.file], title: 'ใบสั่งจอง' }); } catch (e) { if (e?.name !== 'AbortError') toast('แชร์ไม่สำเร็จ — ใช้ "บันทึกรูป" แทน'); } }
  function rsvSlipSave() { const a = document.createElement('a'); a.href = slip.url; a.download = slip.file.name; document.body.appendChild(a); a.click(); a.remove(); toast('💾 บันทึกรูปแล้ว'); }
  async function rsvSlipCopy() { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': slip.blob })]); toast('📋 คัดลอกรูปแล้ว'); } catch (_) { toast('คัดลอกไม่สำเร็จ'); } }

  // ---------- บาร์โค้ดใบจอง (CODE128) ----------
  // เก็บเลขใบจองแบบไม่มีขีด (R261105111212) ให้แท่งบาร์กว้าง อ่านง่าย • ไม่ใช่ลิงก์ → สแกนได้เฉพาะในแอป
  function barcodeText(r) { return String(r.res_no || '').replace(/-/g, ''); }
  function barcodeCanvas(text, moduleW, h) {
    if (typeof window.JsBarcode !== 'function') return null;
    try { const c = document.createElement('canvas'); window.JsBarcode(c, text, { format: 'CODE128', width: moduleW, height: h, margin: 0, displayValue: false, background: '#ffffff', lineColor: '#000000' }); return c; } catch (_) { return null; }
  }
  // วาดบาร์โค้ดกึ่งกลางพื้นที่ (x..x+w) • ขนาดแท่งเป็นจำนวนเต็ม พิกเซลคมชัด เว้นขอบเงียบ ≥ 10 แท่ง
  function drawBarcode(ctx, text, x, y, w, h) {
    const one = barcodeCanvas(text, 1, 10); if (!one) return false;
    const mods = one.width;
    const scale = Math.max(1, Math.floor(w / (mods + 20)));
    const c = barcodeCanvas(text, scale, h); if (!c) return false;
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    ctx.drawImage(c, Math.round(x + (w - c.width) / 2), y);
    return true;
  }
  function barcodeSvg(text) {
    if (typeof window.JsBarcode !== 'function') return '';
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      window.JsBarcode(svg, text, { format: 'CODE128', width: 2, height: 60, margin: 0, displayValue: false });
      const w = svg.getAttribute('width').replace('px', ''), h = svg.getAttribute('height').replace('px', '');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'none');
      svg.removeAttribute('width'); svg.removeAttribute('height'); svg.removeAttribute('style');
      return svg.outerHTML;
    } catch (_) { return ''; }
  }
  function codeOf(raw) {
    const t = String(raw || '').trim();
    let m = /^RSV:(\S+)$/i.exec(t); if (m) return m[1];
    m = /^R(\d{6})-?(\d{4,})$/.exec(t); if (m) return `R${m[1]}-${m[2]}`;
    return null;
  }
  // เรียกจากตัวสแกนทุกจุด: เป็น QR ใบจอง → เปิดหน้าใบจอง แล้วคืนค่า true
  function reservationScan(raw) {
    const no = codeOf(raw); if (!no) return false;
    openByNo(no);
    return true;
  }
  async function openByNo(no) {
    let r = list.find(x => x.res_no === no);
    if (!r) { await load(true); r = list.find(x => x.res_no === no); }
    if (!r) { toast(`ไม่พบใบจอง ${no}`, 4000); window.dispatchEvent(new Event('ea:rsv-scan-closed')); return; }
    openScanView(r.id);
  }
  let scanId = null;
  function phoneMode() { return !!document.getElementById('phoneScanDialog')?.open; }
  function openScanView(id) {
    scanId = id;
    let dlg = document.getElementById('rsvScanDialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'rsvScanDialog'; dlg.className = 'rsv-dialog rsv-scan-dialog'; document.body.appendChild(dlg);
      dlg.addEventListener('close', () => { scanId = null; window.dispatchEvent(new Event('ea:rsv-scan-closed')); });
    }
    renderScanView();
    if (!dlg.open) dlg.showModal();
    try { window.beepSuccess?.(); } catch (_) {}
  }
  function renderScanView() {
    const dlg = document.getElementById('rsvScanDialog'); const r = scanId && list.find(x => x.id === scanId);
    if (!dlg || !r) return;
    const items = Array.isArray(r.items) ? r.items : [];
    const rq = reqState(r);
    const prods = st()?.products || [];
    // ของในบูธพอส่งไหม (เฉพาะสินค้าที่มีในระบบ)
    const stockOf = i => { const p = i.product_id && prods.find(x => x.id === i.product_id); return p ? Number(p.stock_qty || 0) : null; };
    const short = r.status === 'booked' ? items.filter(i => { const s = stockOf(i); return s !== null && s < Number(i.qty || 0); }) : [];
    const reqBox = rq ? `
        <div class="rsv-req-box is-${rq.k}">
          <div class="rsv-req-main">${{ ready: '✅', transit: '🚚', due: '⚠️', later: '🕒', none: '➖' }[rq.k] || ''} ${escapeHtml(rq.text)}</div>
          ${rq.sub ? `<div class="rsv-req-sub">${escapeHtml(rq.sub)}</div>` : ''}
          <div class="rsv-req-acts">
            ${rq.k === 'transit' ? `<button type="button" class="rsv-btn rsv-req-toggle is-main" onclick="rsvScanReceive('${r.id}')">📥 รับของเข้าบูธ</button>` : ''}
            ${rq.k === 'ready' ? `<button type="button" class="rsv-btn rsv-req-toggle" onclick="rsvScanUnreceive('${r.id}')">↩ ยังไม่ได้รับของ</button>` : ''}
            ${rq.k === 'due' || rq.k === 'later' ? `<button type="button" class="rsv-btn rsv-req-toggle" onclick="rsvScanToggleReq('${r.id}')">✓ ส่งเบิกแล้ว</button>` : ''}
            ${rq.k === 'transit' ? `<button type="button" class="rsv-btn rsv-req-toggle" onclick="rsvScanToggleReq('${r.id}')">↩ ยังไม่ได้เบิก</button>` : ''}
          </div>
          ${short.length ? `<div class="rsv-req-short">ของในบูธยังไม่พอ: ${short.map(i => `${escapeHtml(i.name)} มี ${stockOf(i)} / ต้องใช้ ${Number(i.qty)}`).join(' • ')}</div>` : ''}
        </div>` : '';
    const t = todayIso();
    const allBooth = items.length && items.every(i => i.product_id && (st()?.products || []).some(p => p.id === i.product_id));
    const posFlow = r.pickup_place !== 'shop' && allBooth && !isDeal(r);
    const status = r.status === 'picked_up' ? '<div class="rsv-scan-status ok">✅ ลูกค้ารับของแล้ว</div>'
      : r.status === 'cancelled' ? '<div class="rsv-scan-status bad">⛔ ใบจองนี้ถูกยกเลิกแล้ว — ห้ามส่งของ</div>'
      : r.pickup_date > t ? `<div class="rsv-scan-status warn">ยังไม่ถึงวันนัดรับ (${thDate(r.pickup_date)})</div>` : '';
    dlg.innerHTML = `
      <div class="rsv-dlg-head"><strong>📌 ใบจอง <span>${escapeHtml(r.res_no)}</span></strong>
        <button type="button" class="rsv-x" onclick="document.getElementById('rsvScanDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rsv-dlg-body">
        ${status}
        ${reqBox}
        <div class="rsv-scan-cust"><b>${escapeHtml(r.customer_name)}</b>${r.customer_phone ? ` <a href="tel:${escapeHtml(r.customer_phone)}">📞 ${escapeHtml(r.customer_phone)}</a>` : ''}
          <span>นัดรับ ${thDate(r.pickup_date)} • ${r.pickup_place === 'shop' ? 'ร้าน/โกดัง' : 'บูธ'}</span></div>
        <div class="rsv-scan-h">สินค้าที่ต้องส่งให้ลูกค้า</div>
        <div class="rsv-scan-items">${items.map(i => { const s = r.status === 'booked' ? stockOf(i) : null; return `<div class="rsv-scan-item"><span>${escapeHtml(i.name)}${s !== null ? `<small class="rsv-stock ${s >= Number(i.qty || 0) ? 'ok' : 'bad'}">ในบูธมี ${s}</small>` : ''}</span><b>${Number(i.qty)} ${escapeHtml(i.unit || '')}</b></div>`; }).join('')}</div>
        ${r.note ? `<div class="rsv-note">📝 ${escapeHtml(r.note)}</div>` : ''}
        <div class="rsv-sum"><span>${isDeal(r) ? 'ราคาตกลง' : 'ยอดเต็ม'}</span><strong>฿${money(r.total_amount)}</strong></div>
        <div class="rsv-sum"><span>มัดจำแล้ว (${isQr(r.deposit_method) ? 'โอน' : 'สด'})</span><strong>−฿${money(r.deposit_amount)}</strong></div>
        ${r.status === 'booked' ? `<div class="rsv-scan-due"><span>ต้องชำระอีก</span><strong>฿${money(remaining(r))}</strong></div>`
          : r.status === 'picked_up' ? `<div class="rsv-sum"><span>รับเงินแล้ว</span><strong>${Number(r.final_amount) > 0 ? '฿' + money(r.final_amount) : r.sale_no ? 'บิล ' + escapeHtml(r.sale_no) : 'ครบ'}</strong></div>` : ''}
        ${r.status === 'booked' && posFlow && phoneMode() ? '<div class="rsv-hint">กด "ลูกค้ามารับ" → สินค้าเข้าบิลในมือถือ หักมัดจำให้อัตโนมัติ แล้วรับเงินคงค้างตามปกติ (ตัดสต็อกให้)</div>' : ''}
      </div>
      <div class="rsv-dlg-foot">
        <button type="button" class="rsv-btn" onclick="reservationStickers('${r.id}')">🏷️ ป้ายของจอง</button>
        <button type="button" class="rsv-btn" onclick="eaMiniPrintReservation('${r.id}')">🖨️ พิมพ์ใบจอง</button>
        ${r.status === 'booked' && !(posFlow && phoneMode()) ? `<button type="button" class="rsv-btn rsv-main" onclick="rsvScanPickup('${r.id}')">✅ ส่งของ + รับเงิน ฿${money(remaining(r))}</button>` : ''}
        ${r.status === 'booked' && posFlow && phoneMode() && typeof window.eaPhoneLoadReservation === 'function' ? `<button type="button" class="rsv-btn rsv-main" onclick="rsvPhonePickup('${r.id}')">✅ ลูกค้ามารับ • เก็บอีก ฿${money(remaining(r))}</button>` : ''}
        ${r.status === 'booked' && phoneMode() ? `<button type="button" class="rsv-btn" onclick="reservationSlip('${r.id}')">🧾 ใบรับมัดจำ</button>` : ''}
      </div>`;
  }
  // 📥 รับของเข้าบูธ: ของมาตามใบเบิก → รับเข้าสต็อก (ใบจองเปลี่ยนเป็น "มีของแล้ว" ให้เอง) หรือแค่ทำเครื่องหมาย
  function rsvScanReceive(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    let dlg = document.getElementById('rsvRecvAsk');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'rsvRecvAsk'; dlg.className = 'rsv-dialog rsv-recv-ask'; document.body.appendChild(dlg); }
    const its = (r.items || []).map(i => `${escapeHtml(i.name)} ×${Number(i.qty)}`).join(', ');
    dlg.innerHTML = `
      <div class="rsv-dlg-head"><strong>📥 รับของเข้าบูธ <span>${escapeHtml(r.res_no)}</span></strong>
        <button type="button" class="rsv-x" onclick="this.closest('dialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rsv-dlg-body">
        <div class="rsv-note">${escapeHtml(r.customer_name)} • ${its}</div>
        ${typeof window.eaOpenReceive === 'function' ? `<button type="button" class="rsv-btn rsv-main rsv-recv-opt" onclick="rsvRecvVia('stock','${r.id}')">📥 รับตามใบเบิก (เพิ่มสต็อกบูธ)<small>ของมากับใบเบิก ยังไม่ได้รับเข้าสต็อก → รับเข้าสต็อก แล้วใบจองนี้ขึ้น "มีของแล้ว" ให้เอง</small></button>` : ''}
        <button type="button" class="rsv-btn rsv-recv-opt" onclick="rsvRecvVia('mark','${r.id}')">✓ ของอยู่ในบูธแล้ว (ไม่เพิ่มสต็อก)<small>รับเข้าสต็อกไปแล้ว หรือแยกของจองไว้แล้ว → ทำเครื่องหมาย "มีของแล้ว" อย่างเดียว</small></button>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  async function rsvRecvVia(how, id) {
    document.getElementById('rsvRecvAsk')?.close();
    const r = list.find(x => x.id === id); if (!r) return;
    if (how === 'stock') { window.eaOpenReceive?.(); return; }
    try { await markReceived(r, true); toast(`📦 ใบจอง ${r.res_no}: มีของแล้ว`); afterChange(); }
    catch (e) { toast(`❌ ${e.message || e}`); }
  }
  async function rsvScanUnreceive(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    if (!confirm(`เปลี่ยนใบจอง ${r.res_no} เป็น "ยังไม่ได้รับของ"? (สต็อกไม่เปลี่ยน)`)) return;
    try { await markReceived(r, false); toast('เปลี่ยนเป็นยังไม่ได้รับของแล้ว'); afterChange(); }
    catch (e) { toast(`❌ ${e.message || e}`); }
  }
  async function rsvScanToggleReq(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    const on = !r.requisitioned_at;
    if (!confirm(on ? `ยืนยัน: ส่งเบิกของสำหรับใบจอง ${r.res_no} แล้ว? (สถานะจะเป็น "กำลังเบิกสินค้า")` : `เปลี่ยนใบจอง ${r.res_no} เป็น "ยังไม่ได้เบิก"? (ของจะกลับไปขึ้นในใบเบิก)`)) return;
    try { await save({ id, requisitioned: on }); toast(on ? '🚚 กำลังเบิกสินค้า • ของมาถึงแล้วกด "รับของเข้าบูธ"' : 'เปลี่ยนเป็นยังไม่ได้เบิกแล้ว'); renderScanView(); if (st()?.page === 'reservations') render(); }
    catch (e) { toast(`❌ ${e.message || e}`); }
  }
  // มือถือ: ใส่สินค้าในบิลมือถือ + หักมัดจำ → รับเงิน → checkoutCart (hookCheckout บันทึกว่ารับของแล้ว)
  function notReadyOk(r) {
    const q = reqState(r);
    if (!q || q.k === 'ready' || q.k === 'none') return true;
    return confirm(`ใบจอง ${r.res_no}: ${q.text}\n\nยังไม่ได้รับของเข้าบูธ • ตรวจว่ามีของครบจริงก่อน\nส่งของให้ลูกค้าต่อหรือไม่?`);
  }
  function rsvPhonePickup(id) {
    const r = list.find(x => x.id === id); if (!r || r.status !== 'booked') return;
    if (!notReadyOk(r)) return;
    if (window.eaPhoneLoadReservation?.(r) === false) return;
    document.getElementById('rsvScanDialog')?.close();
  }
  function rsvScanPickup(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    if (r.status === 'booked' && !notReadyOk(r)) return;
    const allBooth = (r.items || []).length && r.items.every(i => i.product_id && (st()?.products || []).some(p => p.id === i.product_id));
    if (r.pickup_place !== 'shop' && allBooth && !isDeal(r)) document.getElementById('rsvScanDialog')?.close();
    reservationPickup(id);
  }

  // ---------- สติ๊กเกอร์บาร์โค้ด (ติดม้วน/ของจอง) A4 4 คอลัมน์ ดวงละ 4.2×3 ซม. ----------
  // เลือกจำนวนดวง + พิมพ์แบบ A4 (4.2×3) หรือเครื่องเล็ก (57×30)
  function reservationStickers(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    const items = Array.isArray(r.items) ? r.items : [];
    const def = Math.max(1, Math.min(36, items.reduce((a, i) => a + Math.max(1, Math.ceil(Number(i.qty) || 1)), 0)));
    let dlg = document.getElementById('rsvStkDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'rsvStkDialog'; dlg.className = 'rsv-stk-dialog'; document.body.appendChild(dlg); }
    dlg.innerHTML = `
      <div class="rsv-stk-head"><strong>🏷️ ป้ายสินค้าสั่งจอง ${escapeHtml(r.res_no)}</strong><button type="button" class="rsv-x" onclick="document.getElementById('rsvStkDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rsv-stk-body">
        <label>จำนวนดวง (ติดที่ม้วน/ของแต่ละชิ้น)</label>
        <input id="rsvStkN" type="number" inputmode="numeric" min="1" max="72" value="${def}">
        <label>ความยาวป้าย (ตามกระดาษสติ๊กเกอร์)</label>
        <div class="rsv-chips rsv-stk-len">${[30, 40, 50, 100].map(m => `<button type="button" class="${stkMm() === m ? 'is-on' : ''}" onclick="rsvStkLen(${m}, this)">${m === 100 ? 'แนวนอน 100 มม.' : `57×${m} มม.`}</button>`).join('')}</div>
        <div class="rsv-stk-act">
          <div class="rsv-hint">ป้ายสินค้าสั่งจอง: แถบดำ "สินค้าสั่งจอง • ห้ามขาย" + ชื่อลูกค้า • <b>ไม่พิมพ์ราคา</b> (ราคาตามที่ตกลงในใบจอง) • บาร์โค้ดเป็นเลขใบจอง สแกนแล้วเปิดใบจอง</div>
          ${window.eaMiniPrintReservationLabels ? `<button type="button" class="rsv-btn rsv-main" onclick="rsvStkGo('${r.id}','mini')">🖨️ เครื่องเล็ก (สติ๊กเกอร์ม้วน)</button>` : ''}
          <button type="button" class="rsv-btn" onclick="rsvStkGo('${r.id}','a4')">📄 กระดาษ A4 (ดวงกว้าง 4.2 ซม.)</button>
        </div>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  // ความยาวป้ายของจอง (จำไว้ในเครื่อง) ค่าเริ่มต้น 40 มม.
  const STK_MM_KEY = 'ea_rsv_label_mm';
  function stkMm() { const v = Number(lsGet(STK_MM_KEY, '40')); return [30, 40, 50, 100].includes(v) ? v : 40; }
  function rsvStkLen(m, btn) {
    lsSet(STK_MM_KEY, String(m));
    btn?.parentNode?.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === btn));
  }
  function rsvStkGo(id, mode) {
    const n = Math.max(1, Math.min(72, parseInt(document.getElementById('rsvStkN')?.value, 10) || 1));
    document.getElementById('rsvStkDialog')?.close();
    if (mode === 'mini') window.eaMiniPrintReservationLabels?.(id, n, stkMm());
    else reservationStickersA4(id, n);
  }
  function reservationStickersA4(id, n) {
    const r = list.find(x => x.id === id); if (!r) return;
    const items = Array.isArray(r.items) ? r.items : [];
    // ไล่ชื่อสินค้าให้แต่ละดวง ตามจำนวนชิ้น
    const names = [];
    items.forEach(i => { const c = Math.max(1, Math.ceil(Number(i.qty) || 1)); for (let k = 0; k < c; k++) names.push(i.name); });
    const svg = barcodeSvg(barcodeText(r));
    if (!svg) { toast('โหลดตัวสร้างบาร์โค้ดไม่สำเร็จ'); return; }
    const ph = String(r.customer_phone || '').replace(/\D/g, '').slice(-4);
    const pd = new Date(String(r.pickup_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    // ป้ายสินค้าสั่งจอง: กรอบดำหนา + แถบ "สินค้าสั่งจอง ห้ามขาย" • ไม่มีราคา • บาร์โค้ด = เลขใบจอง
    const land = stkMm() === 100;   // แนวนอน 10×4.5 ซม. (2 ดวงต่อแถว)
    const IC_CART = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/><circle cx="17.5" cy="6.5" r="4.6" fill="#fff" stroke="#000" stroke-width=".6"/><path d="M15.4 6.6l1.5 1.5 2.9-3" fill="none" stroke="#000" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const IC_PHONE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/><path fill="#fff" transform="translate(4.6 4.6) scale(.62)" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
    const IC_BOX = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.5l9 4.5v10l-9 4.5-9-4.5V7z"/><path d="M3 7l9 4.5L21 7M12 11.5v10"/></svg>';
    const IC_CLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="18" rx="2"/><rect x="8.5" y="2" width="7" height="4" rx="1" fill="#fff"/><path d="M8.5 13.5l2.5 2.5 5-5"/></svg>';
    const cells = land ? Array.from({ length: n }, (_, k) => {
      const item = names[k % (names.length || 1)] || '';
      const fs = item.length > 70 ? 7 : item.length > 45 ? 8 : item.length > 28 ? 9.5 : 11;
      return `
      <div class="st land">
        <div class="band"><i class="hz"></i>★ สินค้าสั่งจอง • ห้ามขาย ★<i class="hz"></i></div>
        <div class="r1"><div class="c">${escapeHtml(r.customer_name)}</div>${ph ? `<div class="pp">${IC_PHONE}โทร. …${escapeHtml(ph)}</div>` : ''}</div>
        <div class="r2"><div class="ib">${IC_CART}</div><div class="bcw"><div class="bc">${svg}</div><div class="cp">${escapeHtml(r.res_no)}${n > 1 ? `<small>${k + 1}/${n}</small>` : ''}</div></div></div>
        <div class="r3"><div class="ip">${IC_BOX}<span style="font-size:${fs}pt">${escapeHtml(item)}</span></div><div class="dt">${IC_CLIP}<span class="lb">รับสินค้า :</span><b>${escapeHtml(pd)}</b></div></div>
      </div>`; }).join('') : Array.from({ length: n }, (_, k) => `
      <div class="st">
        <div class="band">★ สินค้าสั่งจอง • ห้ามขาย ★</div>
        <div class="top"><span class="c">${escapeHtml(r.customer_name)}</span>${ph ? `<span class="ph">โทร …${escapeHtml(ph)}</span>` : ''}</div>
        <div class="i">${escapeHtml(names[k % (names.length || 1)] || '')}</div>
        <div class="bc">${svg}</div>
        <div class="no">${escapeHtml(r.res_no)}</div>
        <div class="bot"><span class="d">รับ ${escapeHtml(pd)}</span><span class="np">ราคาตามใบจอง</span><span>${n > 1 ? `${k + 1}/${n}` : ''}</span></div>
      </div>`).join('');
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>สติ๊กเกอร์ ${escapeHtml(r.res_no)}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;800&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 5mm 0 0 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html { background: #e5e7eb; } body { margin: 0; font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif; color: #000; }
        .bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; justify-content: center; padding: 10px; background: #1f2937; }
        .bar button { height: 44px; padding: 0 18px; border-radius: 4px; border: 0; font: 700 15px "Sarabun", sans-serif; cursor: pointer; }
        .bar .p { background: #10b981; color: #fff; } .bar .x { background: #4b5563; color: #fff; }
        .page { width: 210mm; min-height: 297mm; margin: 16px auto; padding-top: 5mm; background: #fff; }
        .sheet { width: 177mm; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 42mm); grid-auto-rows: ${stkMm()}mm; gap: 2mm 3mm; }
        .st { width: 42mm; height: ${stkMm()}mm; overflow: hidden; display: flex; flex-direction: column; padding: 0 1.4mm .8mm; border: .7mm solid #000; page-break-inside: avoid; line-height: 1.12; }
        .band { margin: 0 -1.4mm; padding: .5mm 0 .6mm; background: #000; color: #fff; text-align: center; font-size: 6.3pt; font-weight: 800; white-space: nowrap; letter-spacing: .1pt; }
        .top { display: flex; align-items: baseline; justify-content: space-between; gap: 1mm; min-width: 0; margin-top: .5mm; }
        .c { font-size: 7.5pt; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph { flex: none; font-size: 5.5pt; font-weight: 700; }
        .i { font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 2.6mm; }
        .bc { flex: 1; display: flex; align-items: center; padding: .3mm .5mm 0; min-height: 0; } .bc svg { width: 100%; height: ${stkMm() === 50 ? 22 : stkMm() === 40 ? 15 : 8.6}mm; display: block; }
        ${stkMm() >= 40 ? '.band { font-size: 7pt; padding: .9mm 0 1mm; } .c { font-size: 8.5pt; } .i { font-size: 6.6pt; height: auto; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; } .bot { font-size: 6.6pt; }' : ''}
        .no { text-align: center; font-family: ui-monospace, monospace; font-size: 5pt; font-weight: 700; }
        .bot { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm; font-size: 6pt; font-weight: 800; white-space: nowrap; }
        .np { font-size: 5pt; font-weight: 600; }
        ${land ? `.sheet { width: 203mm; grid-template-columns: repeat(2, 100mm); grid-auto-rows: 48mm; }
        .st.land { width: 100mm; height: 48mm; display: flex; flex-direction: column; padding: 0 2mm 1.4mm; border: .8mm solid #000; border-radius: 3mm; }
        .st.land .band { display: flex; align-items: center; justify-content: center; gap: 3mm; margin: 0 -2mm; padding: 1.2mm 0 1.4mm; font-size: 12.5pt; border-radius: 2mm 2mm 0 0; }
        .st.land .hz { width: 12mm; height: 3.2mm; background: repeating-linear-gradient(-60deg, #fff 0 .9mm, #000 .9mm 2.2mm); }
        .st.land .r1 { display: flex; align-items: center; gap: 2mm; padding: 1mm 0; border-bottom: .35mm solid #000; min-height: 9mm; }
        .st.land .r1 .c { flex: 1; font-size: 13pt; white-space: normal; line-height: 1.05; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .st.land .pp { flex: none; display: flex; align-items: center; gap: 1.2mm; padding: .6mm 2.4mm .6mm .8mm; border: .35mm solid #000; border-radius: 9mm; font-size: 10pt; font-weight: 800; border-left: .35mm solid #000; }
        .st.land .pp svg { width: 5mm; height: 5mm; }
        .st.land .r2 { display: flex; align-items: stretch; gap: 2mm; padding: 1.2mm 0; border-bottom: .35mm solid #000; }
        .st.land .ib { flex: none; width: 15mm; height: 15mm; background: #000; border-radius: 2.4mm; display: grid; place-items: center; }
        .st.land .ib svg { width: 11.5mm; height: 11.5mm; }
        .st.land .bcw { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .8mm; padding-left: 2mm; border-left: .5mm solid #000; }
        .st.land .bc { padding: 0; } .st.land .bc svg { height: 8.5mm; }
        .st.land .cp { position: relative; text-align: center; border: .35mm solid #000; border-radius: 5mm; font: 800 10pt ui-monospace, monospace; padding: .3mm 0; }
        .st.land .cp small { position: absolute; right: 2.5mm; top: .5mm; font: 800 8pt "Sarabun", sans-serif; }
        .st.land .r3 { flex: 1; min-height: 0; display: flex; align-items: stretch; gap: 2mm; padding-top: 1.2mm; }
        .st.land .ip { flex: 1; min-width: 0; display: flex; align-items: center; gap: 1.5mm; padding: .6mm 1.6mm; border: .35mm solid #000; border-radius: 2mm; }
        .st.land .ip svg { flex: none; width: 5.5mm; height: 5.5mm; }
        .st.land .ip span { font-weight: 700; line-height: 1.12; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
        .st.land .dt { flex: none; display: flex; align-items: center; gap: 1.2mm; padding-left: 2mm; border-left: .5mm solid #000; }
        .st.land .dt svg { width: 5.5mm; height: 5.5mm; } .st.land .dt .lb { font-size: 8.5pt; font-weight: 800; }
        .st.land .dt b { background: #000; color: #fff; border-radius: 1.6mm; padding: .8mm 2mm; font-size: 12pt; }` : ''}
        @media print { html { background: #fff; } .bar { display: none; } .page { margin: 0; padding: 0; min-height: 0; width: auto; } }
        @media screen and (max-width: 820px) { .page { zoom: .5; } }
      </style></head><body>
      <div class="bar"><button class="p" onclick="window.print()">🖨️ พิมพ์สติ๊กเกอร์บาร์โค้ด (A4 • ${land ? 'แนวนอน 10×4.8' : `4.2×${stkMm() / 10}`} ซม.)</button><button class="x" onclick="window.close()">ปิด</button></div>
      <div class="page"><div class="sheet">${cells}</div></div>
      <script>(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { if (window.__eaAutoPrint) setTimeout(function () { window.focus(); window.print(); }, 200); });<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.__eaAutoPrint = true; w.document.open(); w.document.write(html); w.document.close(); return; }
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(fr);
    fr.contentWindow.__eaAutoPrint = true;
    fr.contentDocument.open(); fr.contentDocument.write(html); fr.contentDocument.close();
    setTimeout(() => fr.remove(), 60000);
  }

  // ---------- รับของ / ยกเลิก / เบิก ----------
  async function reservationPickup(id) {
    const r = list.find(x => x.id === id); if (!r || r.status !== 'booked') return;
    const s = st(); if (!s) return;
    const prods0 = s.products || [];
    const allBooth = (r.items || []).length && (r.items || []).every(i => i.product_id && prods0.some(p => p.id === i.product_id));
    // ของสั่งพิเศษ / ราคาตกลงเป็นก้อน / รับที่ร้าน → รับเงินคงค้างอย่างเดียว ไม่เปิดบิลขาย ไม่ตัดสต็อกบูธ
    if (r.pickup_place === 'shop' || !allBooth || isDeal(r)) { openFinalPay(r); return; }
    if (s.cart?.length && !window.confirm('ตะกร้าขายมีสินค้าค้างอยู่ จะล้างแล้วใช้รายการจากใบจองนี้?')) return;
    const prods = s.products || [];
    const cart = [];
    for (const i of (r.items || [])) {
      const p = prods.find(x => x.id === i.product_id);
      if (!p) { toast(`ไม่พบสินค้า "${i.name}" ในระบบแล้ว`, 5000); return; }
      cart.push({
        product_id: p.id, name: p.product_name, barcode: p.barcode || '', unit: p.unit || 'ชิ้น',
        qty: Number(i.qty), unit_price: Number(i.unit_price), original_price: Number(p.sale_price || i.unit_price),
        stock: Number(p.stock_qty || 0), is_discounted: Number(i.unit_price) < Number(p.sale_price || 0),
        price_note: `ใบจอง ${r.res_no}`, discount_note: `ใบจอง ${r.res_no}`
      });
    }
    s.cart = cart;
    s.billDiscount = Number(r.deposit_amount) > 0 ? { type: 'baht', value: Number(r.deposit_amount), note: `หักมัดจำ ใบจอง ${r.res_no}` } : { type: 'none', value: 0, note: '' };
    s.pendingReservation = { id: r.id, res_no: r.res_no, customer: r.customer_name, deposit: Number(r.deposit_amount), deposit_amount: Number(r.deposit_amount), deposit_method: r.deposit_method };
    s.receivedCash = '';
    try { window.saveCartLocal?.(); } catch (_) {}
    if (typeof go === 'function') go('sale');
    toast(`ใบจอง ${r.res_no}: หักมัดจำ ฿${money(r.deposit_amount)} แล้ว • เก็บเงินเพิ่ม ฿${money(remaining(r))}`, 5000);
  }
  let payForm = null;
  function openFinalPay(r) {
    payForm = { id: r.id, amount: String(remaining(r)), method: r.pickup_place === 'shop' ? 'shop' : 'cash' };
    let dlg = document.getElementById('rsvPayDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'rsvPayDialog'; dlg.className = 'rsv-dialog rsv-pay-dialog'; document.body.appendChild(dlg); }
    renderFinalPay();
    if (!dlg.open) dlg.showModal();
    setTimeout(() => { const n = document.getElementById('rsvPayAmt'); if (n) { n.focus(); try { n.select(); } catch (_) {} } }, 60);
  }
  function renderFinalPay() {
    const dlg = document.getElementById('rsvPayDialog'); const r = payForm && list.find(x => x.id === payForm.id); if (!dlg || !r) return;
    const items = Array.isArray(r.items) ? r.items : [];
    const hasBooth = items.some(i => i.product_id);
    dlg.innerHTML = `
      <div class="rsv-dlg-head"><strong>ลูกค้ามารับของ <span>${escapeHtml(r.res_no)}</span></strong>
        <button type="button" class="rsv-x" onclick="rsvPayClose()" aria-label="ปิด">✕</button></div>
      <div class="rsv-dlg-body">
        <div class="rsv-pay-cust"><b>${escapeHtml(r.customer_name)}</b>${r.customer_phone ? ` • ${escapeHtml(r.customer_phone)}` : ''} • ${r.pickup_place === 'shop' ? 'รับที่ร้าน/โกดัง' : 'รับที่บูธ'}</div>
        <div class="rsv-items">${items.map(i => `<div class="rsv-item"><span>${escapeHtml(i.name)}</span><span class="q">${escapeHtml(itemTxt(i))}</span><span class="s"></span></div>`).join('')}</div>
        <div class="rsv-sum"><span>${isDeal(r) ? 'ราคาตกลง' : 'ยอดเต็ม'}</span><strong>฿${money(r.total_amount)}</strong></div>
        <div class="rsv-sum"><span>มัดจำแล้ว</span><strong>−฿${money(r.deposit_amount)}</strong></div>
        <div class="rsv-sum is-due"><span>คงค้าง</span><strong>฿${money(remaining(r))}</strong></div>
        <div class="rsv-grid2">
          <label class="rsv-f"><span>รับเงินคงค้างจริง</span><input id="rsvPayAmt" type="number" inputmode="decimal" min="0" step="any" value="${payForm.amount}" oninput="rsvPaySet('amount', this.value, true)"></label>
          <div class="rsv-f"><span>จ่ายด้วย</span>${`<div class="rsv-seg">${[['cash', 'เงินสด (เข้ากล่อง)'], ['promptpay', 'โอน/QR'], ['shop', 'จ่ายที่ร้าน']].map(([v, t]) => `<button type="button" class="${payForm.method === v ? 'is-on' : ''}" onclick="rsvPaySet('method','${v}')">${t}</button>`).join('')}</div>`}</div>
        </div>
        ${!isQr(r.deposit_method) && Number(r.deposit_amount) > 0 ? `<div class="rsv-move">💵 หยิบเงินมัดจำ <b>฿${money(r.deposit_amount)}</b> ออกจากซองมัดจำ ใส่กล่องเงิน (นับเป็นยอดวันนี้)</div>` : ''}
        <div class="rsv-hint">${payForm.method === 'shop' ? 'เงินไม่เข้ากล่องเงินบูธ (ร้าน/ฝ่ายขายรับเงินเอง)' : payForm.method === 'cash' ? 'เงินสดจะรวมใน "กล่องเงิน" และรายงานวันนี้' : 'บันทึกเป็นยอดโอนในรายงานวันนี้'}${hasBooth ? ' • ไม่ตัดสต็อกบูธ' : ''}</div>
      </div>
      <div class="rsv-dlg-foot">
        <button type="button" class="rsv-btn" onclick="rsvPayClose()">ยกเลิก</button>
        <button type="button" class="rsv-btn rsv-main" id="rsvPayBtn" onclick="rsvPayConfirm()">✅ บันทึกรับของ + รับเงิน</button>
      </div>`;
  }
  function rsvPaySet(k, v, soft) { if (!payForm) return; payForm[k] = v; if (!soft) renderFinalPay(); }
  function rsvPayClose() { document.getElementById('rsvPayDialog')?.close(); payForm = null; }
  async function rsvPayConfirm() {
    const r = payForm && list.find(x => x.id === payForm.id); if (!r) return;
    const amt = r2(Math.max(0, Number(payForm.amount) || 0));
    const btn = document.getElementById('rsvPayBtn'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    try {
      await save({ id: r.id, status: 'picked_up', final_amount: amt, final_method: amt > 0 ? payForm.method : '', final_terminal: terminal() });
      rsvPayClose();
      toast(`✅ ${r.res_no} รับของแล้ว${amt ? ` • รับเงิน ฿${money(amt)}` : ''}`, 4000);
      window.dispatchEvent(new Event('ea:reservations-changed'));
      if (st()?.page === 'reservations') render();
      renderScanView();
    } catch (e) { toast(`❌ ${e.message || e}`, 6000); if (btn) { btn.disabled = false; btn.textContent = 'ลองอีกครั้ง'; } }
  }

  function posBanner() {
    const p = st()?.pendingReservation; if (!p) return '';
    return `<div class="rsv-posbar">📌 กำลังส่งของใบจอง <b>${escapeHtml(p.res_no)}</b> • ${escapeHtml(p.customer)} • หักมัดจำ ฿${money(p.deposit)} แล้ว
      <button type="button" onclick="reservationPickupCancel()">ยกเลิก</button></div>`;
  }
  function reservationPickupCancel() {
    const s = st(); if (!s) return;
    s.pendingReservation = null; s.cart = []; s.billDiscount = { type: 'none', value: 0, note: '' };
    try { window.saveCartLocal?.(); } catch (_) {}
    if (typeof renderSale === 'function') renderSale();
  }
  // หลังชำระเงินสำเร็จ → บันทึกว่าใบจองรับของแล้ว
  function hookCheckout() {
    const orig = window.checkoutCart;
    if (typeof orig !== 'function' || orig.__rsvHooked) return;
    const wrapped = async function (...args) {
      const s = st(); const pend = s?.pendingReservation; const prev = s?.lastBill;
      const out = await orig.apply(this, args);
      if (pend && s.lastBill && s.lastBill !== prev && !s.cart.length) {
        s.pendingReservation = null;
        try { await save({ id: pend.id, status: 'picked_up', sale_no: String(s.lastBill.saleNo || '') }); toast(`✅ ใบจอง ${pend.res_no} รับของเรียบร้อย${!isQr(pend.deposit_method) && Number(pend.deposit_amount) > 0 ? ` • หยิบมัดจำ ฿${money(pend.deposit_amount)} จากซองใส่กล่องเงิน` : ''}`, 6000); }
        catch (e) { toast(`ขายแล้ว แต่บันทึกสถานะใบจองไม่สำเร็จ: ${e.message || e} • กด "ลูกค้ามารับ" ซ้ำไม่ได้ ให้แก้สถานะในหน้าใบจอง`, 7000); }
      }
      return out;
    };
    wrapped.__rsvHooked = true;
    window.checkoutCart = wrapped;
  }
  async function reservationCancel(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    if (!window.confirm(`ยกเลิกใบจอง ${r.res_no} (${r.customer_name})?`)) return;
    const v = window.prompt(`คืนเงินมัดจำให้ลูกค้ากี่บาท? (มัดจำ ฿${money(r.deposit_amount)} • ใส่ 0 = ไม่คืน)`, String(Number(r.deposit_amount || 0)));
    if (v === null) return;
    const refund = Math.min(Number(r.deposit_amount || 0), Math.max(0, Number(String(v).replace(/[^0-9.]/g, '')) || 0));
    let method = '';
    if (refund > 0) method = window.confirm('คืนเป็นเงินสดจากกล่องเงิน? (Cancel = คืนด้วยการโอน)') ? 'cash' : 'promptpay';
    try {
      await save({ id, status: 'cancelled', refund_amount: refund, refund_method: method, refund_terminal: terminal() });
      toast(`ยกเลิก ${r.res_no} แล้ว${refund ? ` • คืนมัดจำ ฿${money(refund)} (${method === 'cash' ? 'เงินสด' : 'โอน'})` : ' • ไม่คืนมัดจำ'}`, 5000);
      render();
    } catch (e) { toast(`❌ ${e.message || e}`, 6000); }
  }
  async function reservationToggleReq(id) {
    const r = list.find(x => x.id === id); if (!r) return;
    try { await save({ id, requisitioned: !r.requisitioned_at }); render(); } catch (e) { toast(`❌ ${e.message || e}`); }
  }

  // ---------- สรุปสำหรับกล่องเงิน / รายงาน ----------
  // หลักการ: มัดจำ "แยกเก็บ" (ซองมัดจำ) ไม่นับเป็นยอดของวันที่รับ
  //   → นับเข้ายอดขาย/เงินนำส่ง ในวันที่ส่งของ (หรือวันที่ยกเลิก: ส่วนที่ไม่คืน = ริบมัดจำ)
  function moneyToday(date) {
    const d = date || todayIso();
    const dep = list.filter(r => r.deposit_date === d && Number(r.deposit_amount) > 0);
    const cancelled = list.filter(r => r.status === 'cancelled' && r.cancelled_at && localDate(r.cancelled_at) === d);
    const ref = cancelled.filter(r => Number(r.refund_amount) > 0);
    const picked = list.filter(r => r.status === 'picked_up' && r.picked_up_at && localDate(r.picked_up_at) === d);
    const held = list.filter(r => r.status === 'booked' && Number(r.deposit_amount) > 0);
    const sum = (a, f) => r2(a.reduce((x, r) => x + Number(f(r) || 0), 0));
    const cashDep = r => isQr(r.deposit_method) ? 0 : Number(r.deposit_amount || 0);
    const qrDep = r => isQr(r.deposit_method) ? Number(r.deposit_amount || 0) : 0;
    const m = {
      deposits: dep, refunds: ref, cancelled, picked, held,
      depositCash: sum(dep, cashDep), depositQr: sum(dep, qrDep),
      refundCash: sum(ref.filter(r => r.refund_method === 'cash'), r => r.refund_amount),
      refundQr: sum(ref.filter(r => r.refund_method !== 'cash'), r => r.refund_amount),
      pickedDeposit: sum(picked.filter(r => r.sale_no), r => r.deposit_amount),
      pickedDepCash: sum(picked, cashDep), pickedDepQr: sum(picked, qrDep),
      cancelDepCash: sum(cancelled, cashDep), cancelDepQr: sum(cancelled, qrDep),
      forfeit: sum(cancelled, r => Math.max(0, Number(r.deposit_amount || 0) - Number(r.refund_amount || 0))),
      finals: picked.filter(r => Number(r.final_amount) > 0),
      finalCash: sum(picked.filter(r => r.final_method === 'cash'), r => r.final_amount),
      finalQr: sum(picked.filter(r => isQr(r.final_method)), r => r.final_amount),
      finalShop: sum(picked.filter(r => r.final_method === 'shop'), r => r.final_amount),
      heldCash: sum(held, cashDep), heldQr: sum(held, qrDep)
    };
    // ดึงจากซองมัดจำ เข้ายอดวันนี้ (คืนเงินสดจ่ายจากซอง)
    m.inCash = r2(m.pickedDepCash + m.cancelDepCash - m.refundCash);
    m.inQr = r2(m.pickedDepQr + m.cancelDepQr - m.refundQr);
    // ยอดขายจากใบจองที่นับเป็นของวันนี้ (นอกเหนือจากยอดในบิลขาย)
    m.sales = r2(sum(picked, r => Number(r.deposit_amount || 0) + (r.sale_no ? 0 : Number(r.final_amount || 0))) + m.forfeit);
    m.todayCash = r2(m.inCash + m.finalCash);
    m.todayQr = r2(m.inQr + m.finalQr);
    m.envelopeNow = r2(m.heldCash + m.inCash);   // เงินในซองตอนนี้ (ก่อนเคลียร์วันนี้)
    m.any = !!(dep.length || cancelled.length || picked.length || held.length);
    return m;
  }
  function localDate(ts) { const d = new Date(ts); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

  // ---------- เริ่มทำงาน ----------
  function openReservations() { if (typeof go === 'function') go('reservations'); load(true).then(() => { if (st()?.page === 'reservations') render(); }); }
  function renderPage() { render(); if (Date.now() - lastLoad > 4000) load().then(() => { if (st()?.page === 'reservations' && !document.getElementById('rsvFormDialog')?.open) render(); }); }
  function startLive() {
    const c = sb(); if (!c) return;
    try { c.channel('ea-reservations-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ea_reservations' }, () => load(true).then(afterChange)).subscribe(); } catch (_) {}
  }
  function afterChange() {
    window.dispatchEvent(new Event('ea:reservations-changed'));
    const p = st()?.page;
    if (p === 'reservations' && !document.getElementById('rsvFormDialog')?.open) render();
    if (scanId) renderScanView();
  }
  window.addEventListener('ea:data-refreshed', () => load().then(afterChange));
  function init() {
    hookCheckout();
    setTimeout(() => { hookCheckout(); load(true).then(afterChange); startLive(); }, 3500);
  }

  Object.assign(window, {
    renderReservations: renderPage, openReservations, openReservationForm, closeReservationForm, saveReservationForm,
    rsvTab, rsvSearch, rsvField, rsvSet, rsvQuery, rsvAdd, rsvAddFirst, rsvAddCustom, rsvText,
    rsvPaySet, rsvPayClose, rsvPayConfirm, rsvQty, rsvLine, rsvRemove, rsvDepPct,
    reservationSlip, rsvSlipShare, rsvSlipSave, rsvSlipCopy, reservationPickup, reservationPickupCancel,
    reservationCancel, reservationToggleReq, reservationStickers, rsvStkGo, rsvStkLen, rsvScanPickup, rsvPhonePickup, rsvDepositQr, rsvScanToggleReq,
    eaReservationReqState: reqState, eaReservationsAutoReceive: autoReceive, rsvScanReceive, rsvRecvVia, rsvScanUnreceive,
    eaOpenReservationView: openScanView, eaReservationRemaining: remaining,
    eaReservationScan: reservationScan, eaReservationBarcode: barcodeText, eaDrawReservationBarcode: drawBarcode, eaOpenReservationByNo: openByNo,
    eaReservations: all, eaReservationRequisitions: requisitionList, eaMarkReservationsRequisitioned: markRequisitioned,
    eaReservationMoney: moneyToday, eaReservationPosBanner: posBanner, eaReservationsLoad: load
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
