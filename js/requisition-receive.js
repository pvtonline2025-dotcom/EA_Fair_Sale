/**
 * EA Fair Sale - รับของเข้าสต็อกตามใบเบิก
 *
 * - ทุกครั้งที่ส่ง/บันทึก/คัดลอกรูปใบเบิก → เก็บเป็น "ใบเบิก" (รายการ + จำนวนที่เบิก) ไว้ในเครื่อง
 * - ของมาถึงบูธ → เปิด "📥 รับตามใบเบิก" เลือกใบเบิก → จำนวนรับใส่ให้ตามที่เบิก (หักที่รับไปแล้ว)
 *   แก้จำนวนได้ทุกรายการ, ลบรายการ, เพิ่มสินค้าที่ไม่มีในใบเบิก, ใส่หมายเหตุ → กดรับเข้าสต็อก
 * - รับไม่ครบ → ใบเบิกเป็น "รับบางส่วน" (รับเพิ่มทีหลังได้) • รับครบ → "รับครบแล้ว" • ปิดใบเบิกเองได้
 * - รับของโดยไม่มีใบเบิกก็ได้ (เพิ่มสินค้าเอง)
 */
(function () {
  const KEY = 'ea_requisitions';
  const st = () => window.getEaAppState?.() || null;
  const sb = () => window.getEaSupabaseClient?.() || null;
  const esc = s => (typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s ?? ''));
  const toast = (m, ms) => (typeof window.toast === 'function' ? window.toast(m, ms) : console.log(m));
  const fmt = n => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 });
  const r3 = n => Math.round(Number(n || 0) * 1000) / 1000;
  const $ = id => document.getElementById(id);

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (_) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 80))); } catch (_) {} }
  function thDT(iso) { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getDate()}/${d.getMonth() + 1} ${p(d.getHours())}:${p(d.getMinutes())}`; }
  function product(pid) { return (st()?.products || []).find(p => p.id === pid) || null; }
  const isOpen = r => r.status === 'sent' || r.status === 'partial';
  function pendingCount() { return load().filter(isOpen).length; }

  // ---------- บันทึกใบเบิก (เรียกจากหน้าใบเบิกตอนส่ง) ----------
  function saveRequisition(items, note) {
    const now = new Date(); const p = n => String(n).padStart(2, '0');
    const no = `REQ-${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
    const a = load();
    a.unshift({ id: 'rq' + Date.now().toString(36), no, createdAt: now.toISOString(), by: window.getStaffName?.() || st()?.terminal || '',
      note: String(note || ''), items: (items || []).filter(i => i.pid && i.qty > 0).map(i => ({ pid: i.pid, name: i.name, unit: i.unit || 'ชิ้น', qty: r3(i.qty), got: 0 })),
      status: 'sent', receipts: [] });
    save(a);
  }

  // ---------- หน้ารับของ ----------
  let form = null;   // { reqId|null, rows:[{pid,name,unit,req,got,qty}], note, q }
  function openReceive(reqId) {
    const reqs = load();
    const pick = reqId ? reqs.find(r => r.id === reqId) : reqs.find(isOpen);
    form = { reqId: pick?.id || null, rows: pick ? rowsFrom(pick) : [], note: '', q: '' };
    let dlg = $('reqRecvDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'reqRecvDialog'; dlg.className = 'rqv-dialog'; document.body.appendChild(dlg); }
    render();
    if (!dlg.open) dlg.showModal();
  }
  function rowsFrom(r) {
    return r.items.map(i => ({ pid: i.pid, name: i.name, unit: i.unit, req: i.qty, got: i.got || 0, qty: Math.max(0, r3(i.qty - (i.got || 0))) }));
  }
  function pickReq(id) {
    const r = load().find(x => x.id === id);
    form.reqId = r ? r.id : null; form.rows = r ? rowsFrom(r) : []; form.note = '';
    render();
  }
  function render() {
    const dlg = $('reqRecvDialog'); if (!dlg || !form) return;
    const reqs = load();
    const open = reqs.filter(isOpen), done = reqs.filter(r => !isOpen(r)).slice(0, 6);
    const cur = reqs.find(r => r.id === form.reqId);
    const totalQty = form.rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const nRows = form.rows.filter(r => Number(r.qty) > 0).length;
    const q = String(form.q || '').trim().toLowerCase();
    const sugg = q ? (st()?.products || []).filter(p => `${p.product_name} ${p.product_code || ''} ${p.barcode || ''}`.toLowerCase().includes(q)).slice(0, 8) : [];
    const chip = r => `<button type="button" class="rqv-chip ${r.id === form.reqId ? 'on' : ''}" onclick="rqvPick('${r.id}')">
        <b>${esc(r.no)}</b><span>${thDT(r.createdAt)} • ${r.items.length} รายการ</span>
        <em class="${r.status}">${r.status === 'partial' ? 'รับบางส่วน' : r.status === 'received' ? 'รับครบแล้ว' : r.status === 'closed' ? 'ปิดแล้ว' : 'รอรับของ'}</em></button>`;
    dlg.innerHTML = `
      <div class="rqv-head"><strong>📥 รับของเข้าสต็อกตามใบเบิก</strong><button type="button" class="rqv-x" onclick="document.getElementById('reqRecvDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="rqv-body">
        <div class="rqv-reqs">
          ${open.map(chip).join('')}
          <button type="button" class="rqv-chip ${!form.reqId ? 'on' : ''}" onclick="rqvPick('')"><b>＋ รับของไม่มีใบเบิก</b><span>เพิ่มสินค้าเอง</span></button>
          ${done.length ? `<details class="rqv-old"><summary>ใบเบิกที่รับแล้ว (${done.length})</summary>${done.map(chip).join('')}</details>` : ''}
        </div>
        ${!open.length && !cur ? '<div class="rqv-empty">ยังไม่มีใบเบิกที่รอรับ • ใบเบิกจะถูกเก็บอัตโนมัติเมื่อกด "แชร์ไป LINE / บันทึกรูป" ในหน้าใบเบิก</div>' : ''}
        ${cur ? `<div class="rqv-info">${esc(cur.no)} • ส่งเมื่อ ${thDT(cur.createdAt)}${cur.by ? ` • ${esc(cur.by)}` : ''}${cur.note ? `<br>📝 ${esc(cur.note)}` : ''}</div>` : ''}
        <table class="rqv-table">
          <thead><tr><th>สินค้า</th><th>เบิก</th><th>รับแล้ว</th><th>รับครั้งนี้</th><th></th></tr></thead>
          <tbody>
            ${form.rows.map((r, k) => {
              const left = r.req ? r3(r.req - r.got) : null;
              const diff = r.req ? r3(r.got + (Number(r.qty) || 0) - r.req) : 0;
              return `<tr class="${r.req ? '' : 'extra'}">
                <td><div class="n">${esc(r.name)}</div>${!r.req ? '<small>เพิ่มเอง (ไม่อยู่ในใบเบิก)</small>' : left > 0 ? `<small>ค้างรับ ${fmt(left)} ${esc(r.unit)}</small>` : '<small class="ok">รับครบแล้ว</small>'}</td>
                <td class="c">${r.req ? `${fmt(r.req)} <small>${esc(r.unit)}</small>` : '–'}</td>
                <td class="c">${r.got ? fmt(r.got) : '–'}</td>
                <td class="c"><div class="rqv-step">
                  <button type="button" onclick="rqvStep(${k},-1)">−</button>
                  <input type="text" inputmode="tel" value="${r.qty}" onchange="rqvQty(${k}, this.value)" onfocus="this.select()">
                  <button type="button" onclick="rqvStep(${k},1)">+</button>
                </div>${r.req && diff ? `<small class="${diff > 0 ? 'plus' : 'minus'}">${diff > 0 ? `เกินใบเบิก +${fmt(diff)}` : `ขาด ${fmt(diff)}`}</small>` : ''}</td>
                <td class="c"><button type="button" class="rqv-del" onclick="rqvRemove(${k})" title="ลบรายการ">✕</button></td>
              </tr>`;
            }).join('') || '<tr><td colspan="5" class="rqv-none">ยังไม่มีรายการ • ค้นหาสินค้าด้านล่างเพื่อเพิ่ม</td></tr>'}
          </tbody>
        </table>
        <div class="rqv-add">
          <input id="rqvQ" type="search" autocomplete="off" placeholder="＋ เพิ่มสินค้าที่ไม่มีในใบเบิก: พิมพ์ชื่อ / รหัส / สแกนบาร์โค้ด" value="${esc(form.q)}" oninput="rqvSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();rqvAddFirst()}">
          ${sugg.length ? `<div class="rqv-sugg">${sugg.map(p => `<button type="button" onclick="rqvAdd('${p.id}')"><span>${esc(p.product_name)}</span><small>${esc(p.product_code || '')} • คงเหลือ ${fmt(p.stock_qty)}</small></button>`).join('')}</div>` : ''}
        </div>
        <label class="rqv-note">หมายเหตุการรับ <input id="rqvNote" value="${esc(form.note)}" placeholder="เช่น ตาข่ายเขียวมาไม่ครบ ขาด 2 ผืน" oninput="rqvNoteSet(this.value)"></label>
      </div>
      <div class="rqv-foot">
        ${cur && isOpen(cur) ? `<button type="button" class="rqv-btn" onclick="rqvClose('${cur.id}')">ปิดใบเบิก (ไม่รับที่เหลือ)</button>` : '<span></span>'}
        <button type="button" class="rqv-btn rqv-main" id="rqvGo" onclick="rqvConfirm()" ${nRows ? '' : 'disabled'}>✅ รับเข้าสต็อก ${nRows} รายการ (รวม ${fmt(totalQty)})</button>
      </div>`;
    if (q) setTimeout(() => { const i = $('rqvQ'); if (i) { i.focus(); const v = i.value; i.value = ''; i.value = v; } }, 0);
  }
  function rqvQty(k, v) {
    const r = form?.rows[k]; if (!r) return;
    const n = window.eaParseCountExpr ? window.eaParseCountExpr(v) : Number(v);
    r.qty = isNaN(n) ? 0 : Math.max(0, r3(n)); render();
  }
  function rqvStep(k, d) { const r = form?.rows[k]; if (!r) return; r.qty = Math.max(0, r3((Number(r.qty) || 0) + d)); render(); }
  function rqvRemove(k) { form.rows.splice(k, 1); render(); }
  function rqvSearch(v) { form.q = v; render(); }
  function rqvAdd(pid) {
    const p = product(pid); if (!p) return;
    const ex = form.rows.find(r => r.pid === pid);
    if (ex) ex.qty = r3((Number(ex.qty) || 0) + 1);
    else form.rows.push({ pid, name: p.product_name, unit: p.unit || 'ชิ้น', req: 0, got: 0, qty: 1 });
    form.q = ''; render();
  }
  function rqvAddFirst() {
    const q = String(form.q || '').trim(); if (!q) return;
    const p = window.productByBarcode?.(q) || (st()?.products || []).find(x => String(x.product_code || '').toLowerCase() === q.toLowerCase())
      || (st()?.products || []).find(x => x.product_name.toLowerCase().includes(q.toLowerCase()));
    if (p) rqvAdd(p.id); else toast('ไม่พบสินค้า');
  }
  function rqvNoteSet(v) { if (form) form.note = v; }
  function rqvClose(id) {
    if (!window.confirm('ปิดใบเบิกนี้? (รายการที่ยังไม่มา จะไม่ค้างรับต่อ)')) return;
    const a = load(); const r = a.find(x => x.id === id); if (!r) return;
    r.status = 'closed'; r.closedAt = new Date().toISOString(); save(a);
    toast(`ปิดใบเบิก ${r.no} แล้ว`); openReceive();
  }

  async function rqvConfirm() {
    const rows = form.rows.filter(r => Number(r.qty) > 0);
    if (!rows.length) return;
    const c = sb(), s = st();
    if (!c || s?.isOffline || !navigator.onLine) { toast('ออฟไลน์อยู่ • รับของเข้าสต็อกต้องใช้อินเทอร์เน็ต', 5000); return; }
    const a = load(); const req = a.find(r => r.id === form.reqId);
    const lines = rows.map(r => `• ${r.name}: ${fmt(r.qty)} ${r.unit}${r.req && r3(r.got + r.qty - r.req) ? ` (เบิก ${fmt(r.req)})` : ''}`).join('\n');
    if (!window.confirm(`รับเข้าสต็อก ${rows.length} รายการ${req ? ` ตามใบเบิก ${req.no}` : ''}\n\n${lines}`)) return;
    const btn = $('rqvGo'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    const note = `รับตามใบเบิก${req ? ` ${req.no}` : ' (ไม่มีใบเบิก)'}${form.note ? ` • ${form.note}` : ''}`;
    const ok = [], fail = [];
    for (const r of rows) {
      try {
        const { error } = await c.rpc('ea_update_stock', { p_product_id: r.pid, p_type: 'IN', p_qty: Number(r.qty), p_note: note });
        if (error) throw new Error(error.message);
        const p = product(r.pid);
        if (p) p.stock_qty = r3(Number(p.stock_qty || 0) + Number(r.qty));
        const now = new Date();
        if (Array.isArray(s.movements)) s.movements.unshift({ id: 'rq-move-' + Date.now() + Math.random().toString(36).slice(2, 5), product_id: r.pid, product_name: r.name, movement_type: 'IN', qty_change: Number(r.qty), note, movement_date: window.todayISO ? window.todayISO() : now.toISOString().slice(0, 10), movement_time: now.toTimeString().slice(0, 8), created_at: now.toISOString() });
        ok.push(r);
      } catch (e) { fail.push({ r, e }); }
    }
    if (req) {
      for (const r of ok) {
        const it = req.items.find(i => i.pid === r.pid);
        if (it) it.got = r3((it.got || 0) + Number(r.qty));
        else req.items.push({ pid: r.pid, name: r.name, unit: r.unit, qty: 0, got: Number(r.qty), extra: true });
      }
      req.receipts.push({ at: new Date().toISOString(), by: window.getStaffName?.() || s?.terminal || '', note: form.note, lines: ok.map(r => ({ pid: r.pid, name: r.name, qty: Number(r.qty) })) });
      const allIn = req.items.filter(i => i.qty > 0).every(i => (i.got || 0) >= i.qty);
      req.status = allIn ? 'received' : 'partial';
      save(a);
    }
    window.saveLocalState?.();
    try { window.eaQuietRefresh?.(); } catch (_) {}
    if (fail.length) {
      toast(`⚠️ รับเข้าแล้ว ${ok.length} • ไม่สำเร็จ ${fail.length} (${fail[0].e.message})`, 7000);
      form.rows = form.rows.filter(r => !ok.includes(r)); render();
    } else {
      toast(`✅ รับเข้าสต็อกแล้ว ${ok.length} รายการ${req ? ` • ${req.status === 'received' ? 'ใบเบิกรับครบแล้ว' : 'ใบเบิกยังค้างรับบางรายการ'}` : ''}`, 5000);
      $('reqRecvDialog')?.close();
      if (s?.page === 'stock' || s?.page === 'lowStock') window.render?.();
    }
  }

  Object.assign(window, {
    eaSaveRequisition: saveRequisition, eaOpenReceive: openReceive, eaPendingReqCount: pendingCount,
    rqvPick: pickReq, rqvQty, rqvStep, rqvRemove, rqvSearch, rqvAdd, rqvAddFirst, rqvNoteSet, rqvClose, rqvConfirm
  });
})();
