/**
 * EA Fair Sale - เงินสำรองจ่าย (เงินทดรองจ่ายหน้างาน)
 *
 * แทนหน้า "ค่าใช้จ่าย & กำไร" เดิม (ไม่มีต้นทุนสินค้า ไม่คำนวณกำไร)
 *  - รับเงินสำรอง (เบิกมาจากบริษัท / เติมเงิน)
 *  - จ่าย: เบี้ยเลี้ยงรายวัน (คน × บาท), ค่าน้ำแข็ง, น้ำดื่มในบูธ, ซื้อของใช้, ค่าเดินทาง, อาหาร, อื่นๆ
 *  - คืนเงินสำรอง (เหลือส่งคืน)
 *  - คงเหลือในมือ = เบิก − จ่าย − คืน • มีบิล/ไม่มีบิล • สรุปเคลียร์เงิน (พิมพ์ A4 / ส่ง LINE)
 * เก็บใน state.expenses (บันทึกในเครื่อง) • แยกจากเงินขายในกล่องเงิน
 */
(function () {
  const st = () => window.getEaAppState?.() || null;
  const esc = s => (typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s ?? ''));
  const toast = (m, ms) => (typeof window.toast === 'function' ? window.toast(m, ms) : console.log(m));
  const money = n => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r2 = n => Math.round(Number(n || 0) * 100) / 100;
  const $ = id => document.getElementById(id);
  const today = () => (window.todayISO ? window.todayISO() : new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10));
  const thD = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : String(iso || ''); };
  const thDay = iso => new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });

  const CATS = [
    { id: 'allowance', icon: '👥', name: 'เบี้ยเลี้ยงรายวัน', title: 'เบี้ยเลี้ยงรายวัน' },
    { id: 'ice', icon: '🧊', name: 'ค่าน้ำแข็ง', title: 'ค่าน้ำแข็ง' },
    { id: 'water', icon: '💧', name: 'น้ำดื่มในบูธ', title: 'ค่าน้ำดื่มในบูธ' },
    { id: 'supplies', icon: '🛒', name: 'ซื้อของใช้', title: 'ซื้อของใช้ในบูธ' },
    { id: 'transport', icon: '🚚', name: 'เดินทาง/ขนส่ง', title: 'ค่าเดินทาง' },
    { id: 'food', icon: '🍱', name: 'อาหาร', title: 'ค่าอาหาร' },
    { id: 'other', icon: '🧾', name: 'อื่นๆ', title: '' }
  ];
  // หมวดเดิมของหน้าเก่า → หมวดใหม่
  const OLD = { staff: 'allowance', packaging: 'supplies', marketing: 'other', booth_rent: 'other' };
  const cat = id => CATS.find(c => c.id === (OLD[id] || id)) || CATS[CATS.length - 1];
  const kindOf = e => e.kind || 'out';

  function list() {
    const s = st(); if (!s) return [];
    if (!Array.isArray(s.expenses)) s.expenses = [];
    return s.expenses;
  }
  // ลบข้อมูลตัวอย่างของระบบเดิม (ค่าเช่าบูธ/ข้าวกล่อง/ค่าน้ำมัน ที่แอปใส่ให้เอง)
  function dropDemo() {
    const s = st(); if (!s || !Array.isArray(s.expenses)) return;
    const n = s.expenses.length;
    s.expenses = s.expenses.filter(e => !(/^exp-[123]$/.test(String(e.id)) && !e.kind));
    if (s.expenses.length !== n) window.saveLocalState?.();
  }
  function sorted() {
    return list().slice().sort((a, b) => `${a.expense_date} ${a.expense_time || ''} ${a.created_at || ''}`.localeCompare(`${b.expense_date} ${b.expense_time || ''} ${b.created_at || ''}`));
  }
  function totals(rows) {
    const t = { in: 0, out: 0, ret: 0, noBill: 0, byCat: {} };
    rows.forEach(e => {
      const a = Number(e.amount || 0), k = kindOf(e);
      if (k === 'in') t.in += a; else if (k === 'return') t.ret += a;
      else { t.out += a; const c = cat(e.category).id; t.byCat[c] = (t.byCat[c] || 0) + a; if (!e.has_receipt) t.noBill++; }
    });
    t.in = r2(t.in); t.out = r2(t.out); t.ret = r2(t.ret); t.left = r2(t.in - t.out - t.ret);
    return t;
  }

  let range = 'all';   // all | today
  function render() {
    const s = st(); if (!s) return;
    dropDemo();
    window.setHeader?.('เงินสำรองจ่าย', 'เบิกเงินสำรอง • บันทึกค่าใช้จ่ายหน้างาน • คงเหลือในมือ • สรุปเคลียร์เงิน');
    const all = sorted();
    // คงเหลือสะสม (ตามลำดับเวลา)
    let bal = 0; const balById = {};
    all.forEach(e => { const a = Number(e.amount || 0), k = kindOf(e); bal = r2(bal + (k === 'in' ? a : -a)); balById[e.id] = bal; });
    const T = totals(all);
    const rows = range === 'today' ? all.filter(e => e.expense_date === today()) : all;
    const Tr = totals(rows);
    const days = [...new Set(rows.map(e => e.expense_date))].sort().reverse();
    const content = $('content'); if (!content) return;
    content.innerHTML = `
      <section class="ptc">
        <div class="ptc-kpis">
          <div class="ptc-kpi"><span>เบิกเงินสำรองมา</span><b>฿${money(T.in)}</b></div>
          <div class="ptc-kpi out"><span>ใช้จ่ายไป</span><b>฿${money(T.out)}</b></div>
          ${T.ret ? `<div class="ptc-kpi"><span>คืนแล้ว</span><b>฿${money(T.ret)}</b></div>` : ''}
          <div class="ptc-kpi left ${T.left < 0 ? 'neg' : ''}"><span>คงเหลือในมือ</span><b>฿${money(T.left)}</b>${T.left < 0 ? '<small>จ่ายเกินเงินสำรอง (ทดจ่ายไปก่อน)</small>' : ''}</div>
          ${T.noBill ? `<div class="ptc-kpi warn"><span>ไม่มีบิล</span><b>${T.noBill} รายการ</b></div>` : ''}
        </div>

        <div class="ptc-actions">
          <button type="button" class="ptc-in" onclick="ptcOpen('in')">💰 รับเงินสำรอง (เบิก)</button>
          ${CATS.map(c => `<button type="button" class="ptc-cat" onclick="ptcOpen('out','${c.id}')"><i>${c.icon}</i>${c.name}</button>`).join('')}
          <button type="button" class="ptc-ret" onclick="ptcOpen('return')">↩️ คืนเงินสำรอง</button>
        </div>

        <div class="ptc-bar">
          <div class="ptc-range">
            <button type="button" class="${range === 'all' ? 'on' : ''}" onclick="ptcRange('all')">ทั้งงาน</button>
            <button type="button" class="${range === 'today' ? 'on' : ''}" onclick="ptcRange('today')">วันนี้</button>
          </div>
          <div class="ptc-cats">${CATS.filter(c => Tr.byCat[c.id]).map(c => `<span>${c.icon} ${c.name} <b>฿${money(Tr.byCat[c.id])}</b></span>`).join('') || '<span class="muted">ยังไม่มีค่าใช้จ่าย</span>'}</div>
          <div class="ptc-tools">
            <button type="button" onclick="ptcCopy()">📋 คัดลอกส่ง LINE</button>
            <button type="button" onclick="ptcPrint()">🖨️ สรุปเคลียร์เงิน (A4)</button>
          </div>
        </div>

        ${days.length ? days.map(d => {
          const dr = rows.filter(e => e.expense_date === d).slice().reverse();
          const dt = totals(dr);
          return `
          <div class="ptc-day">
            <div class="ptc-day-h"><b>${thDay(d)}</b><span>${dt.in ? `เบิก ฿${money(dt.in)} • ` : ''}ใช้ ฿${money(dt.out)}${dt.ret ? ` • คืน ฿${money(dt.ret)}` : ''}</span></div>
            <table class="ptc-table">
              <thead><tr><th>เวลา</th><th>รายการ</th><th class="r">รับ</th><th class="r">จ่าย</th><th class="r">คงเหลือ</th><th>บิล</th><th></th></tr></thead>
              <tbody>${dr.map(e => {
                const k = kindOf(e), c = cat(e.category), a = Number(e.amount || 0);
                return `<tr class="k-${k}">
                  <td class="t">${esc(e.expense_time || '')}</td>
                  <td><div class="n">${k === 'in' ? '💰' : k === 'return' ? '↩️' : c.icon} ${esc(e.title || c.name)}</div>
                    <small>${k === 'out' ? esc(c.name) : k === 'in' ? 'รับเงินสำรอง' : 'คืนเงินสำรอง'}${e.people ? ` • ${e.people} คน × ฿${money(e.rate)}` : ''}${e.recorder ? ` • ${esc(e.recorder)}` : ''}${e.note ? ` • ${esc(e.note)}` : ''}</small></td>
                  <td class="r in">${k === 'in' ? money(a) : ''}</td>
                  <td class="r out">${k !== 'in' ? money(a) : ''}</td>
                  <td class="r bal ${balById[e.id] < 0 ? 'neg' : ''}">${money(balById[e.id])}</td>
                  <td class="c">${k === 'out' ? `<button type="button" class="ptc-bill ${e.has_receipt ? 'yes' : 'no'}" onclick="ptcToggleBill('${e.id}')" title="แตะเพื่อสลับ">${e.has_receipt ? '✓ มีบิล' : 'ไม่มีบิล'}</button>` : ''}</td>
                  <td class="c act"><button type="button" onclick="ptcEdit('${e.id}')">แก้ไข</button><button type="button" class="del" onclick="ptcDelete('${e.id}')">ลบ</button></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>`;
        }).join('') : `<div class="ptc-empty">ยังไม่มีรายการ${range === 'today' ? 'วันนี้' : ''} • เริ่มจากกด <b>💰 รับเงินสำรอง</b> เมื่อเบิกเงินมา แล้วบันทึกค่าใช้จ่ายด้วยปุ่มหมวดด้านบน</div>`}
      </section>`;
  }
  function ptcRange(r) { range = r; render(); }

  // ---------- ฟอร์ม ----------
  let form = null;
  function ptcOpen(kind, catId, editId) {
    const s = st();
    const e = editId ? list().find(x => x.id === editId) : null;
    const c = cat(e ? e.category : catId || 'other');
    const now = new Date();
    form = e ? { ...e, kind: kindOf(e), category: c.id } : {
      kind, category: c.id, title: kind === 'in' ? 'เบิกเงินสำรองจ่าย' : kind === 'return' ? 'คืนเงินสำรองจ่าย' : c.title,
      amount: '', expense_date: today(), expense_time: now.toTimeString().slice(0, 5),
      has_receipt: kind === 'out' && c.id !== 'allowance', people: c.id === 'allowance' ? '' : 0, rate: '', recorder: window.getStaffName?.() || s?.terminal || '', note: ''
    };
    let dlg = $('ptcDialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'ptcDialog'; dlg.className = 'ptc-dialog'; document.body.appendChild(dlg); }
    renderForm();
    if (!dlg.open) dlg.showModal();
    const focusId = form.category === 'allowance' && form.kind === 'out' ? 'ptcPeople' : 'ptcAmount';
    setTimeout(() => $(focusId)?.focus(), 80);
  }
  function renderForm() {
    const dlg = $('ptcDialog'); if (!dlg || !form) return;
    const k = form.kind, isAllow = k === 'out' && form.category === 'allowance';
    const head = k === 'in' ? '💰 รับเงินสำรอง (เบิกมา)' : k === 'return' ? '↩️ คืนเงินสำรอง' : `${cat(form.category).icon} บันทึกค่าใช้จ่าย`;
    dlg.innerHTML = `
      <div class="ptc-dh"><strong>${head}${form.id ? ' • แก้ไข' : ''}</strong><button type="button" class="ptc-x" onclick="document.getElementById('ptcDialog').close()" aria-label="ปิด">✕</button></div>
      <div class="ptc-db">
        ${k === 'out' ? `<div class="ptc-catpick">${CATS.map(c => `<button type="button" class="${form.category === c.id ? 'on' : ''}" onclick="ptcSetCat('${c.id}')">${c.icon} ${c.name}</button>`).join('')}</div>` : ''}
        <label>รายการ<input id="ptcTitle" value="${esc(form.title)}" maxlength="80" placeholder="เช่น ค่าน้ำแข็ง 2 กระสอบ" oninput="ptcF('title', this.value)"></label>
        ${isAllow ? `<div class="ptc-2">
          <label>จำนวนคน<input id="ptcPeople" type="number" inputmode="numeric" min="0" value="${esc(form.people)}" oninput="ptcAllow('people', this.value)"></label>
          <label>บาท / คน<input id="ptcRate" type="number" inputmode="decimal" min="0" value="${esc(form.rate)}" oninput="ptcAllow('rate', this.value)"></label></div>` : ''}
        <label>จำนวนเงิน (บาท)<input id="ptcAmount" class="big" type="number" inputmode="decimal" min="0" step="any" value="${esc(form.amount)}" oninput="ptcF('amount', this.value)"></label>
        <div class="ptc-2">
          <label>วันที่<input type="date" value="${esc(form.expense_date)}" onchange="ptcF('expense_date', this.value)"></label>
          <label>เวลา<input type="time" value="${esc(form.expense_time || '')}" onchange="ptcF('expense_time', this.value)"></label>
        </div>
        ${k === 'out' ? `<label class="ptc-chk"><input type="checkbox" ${form.has_receipt ? 'checked' : ''} onchange="ptcF('has_receipt', this.checked)"> มีบิล / ใบเสร็จ (ไว้แนบตอนเคลียร์เงิน)</label>` : ''}
        <label>${isAllow ? 'ชื่อคนรับเบี้ยเลี้ยง / หมายเหตุ' : 'หมายเหตุ'}<input value="${esc(form.note)}" maxlength="160" placeholder="${isAllow ? 'เช่น น้องเอ, น้องบี, น้องซี' : 'ร้านที่ซื้อ, รายละเอียด'}" oninput="ptcF('note', this.value)"></label>
        <label>ผู้บันทึก<input value="${esc(form.recorder)}" maxlength="40" oninput="ptcF('recorder', this.value)"></label>
      </div>
      <div class="ptc-df">
        <button type="button" onclick="document.getElementById('ptcDialog').close()">ยกเลิก</button>
        <button type="button" class="main" onclick="ptcSave()">บันทึก</button>
      </div>`;
  }
  function ptcF(k, v) { if (form) form[k] = v; }
  function ptcSetCat(id) {
    const old = cat(form.category), c = cat(id);
    if (!form.title || form.title === old.title) form.title = c.title;
    form.category = c.id;
    if (!form.id) form.has_receipt = c.id !== 'allowance';
    renderForm();
  }
  function ptcAllow(k, v) {
    form[k] = v;
    const n = Number(form.people) || 0, r = Number(form.rate) || 0;
    if (n && r) { form.amount = String(r2(n * r)); const a = $('ptcAmount'); if (a) a.value = form.amount; }
  }
  function ptcSave() {
    const s = st(); if (!s || !form) return;
    const amount = r2(Number(form.amount));
    if (!(amount > 0)) { toast('กรุณาใส่จำนวนเงิน'); $('ptcAmount')?.focus(); return; }
    const c = cat(form.category);
    const rec = {
      kind: form.kind, category: form.kind === 'out' ? c.id : form.kind, title: String(form.title || c.name).trim() || c.name,
      amount, expense_date: form.expense_date || today(), expense_time: form.expense_time || '',
      has_receipt: form.kind === 'out' ? !!form.has_receipt : true,
      people: form.kind === 'out' && c.id === 'allowance' ? Number(form.people) || 0 : 0,
      rate: form.kind === 'out' && c.id === 'allowance' ? Number(form.rate) || 0 : 0,
      recorder: String(form.recorder || '').trim(), note: String(form.note || '').trim(),
      payment_method: 'cash'
    };
    const arr = list();
    if (form.id) { const i = arr.findIndex(e => e.id === form.id); if (i >= 0) arr[i] = { ...arr[i], ...rec, updated_at: new Date().toISOString() }; }
    else arr.unshift({ id: 'ptc-' + Date.now().toString(36), ...rec, created_at: new Date().toISOString() });
    window.saveLocalState?.();
    $('ptcDialog')?.close();
    toast(`${form.kind === 'in' ? '💰 รับเงินสำรอง' : form.kind === 'return' ? '↩️ คืนเงินสำรอง' : '✅ บันทึกค่าใช้จ่าย'} ฿${money(amount)}`);
    form = null;
    if (s.page === 'expenses') render();
  }
  function ptcEdit(id) { ptcOpen(null, null, id); }
  function ptcDelete(id) {
    const s = st(); const e = list().find(x => x.id === id); if (!e) return;
    if (!window.confirm(`ลบรายการ "${e.title}" ฿${money(e.amount)} ?`)) return;
    s.expenses = list().filter(x => x.id !== id);
    window.saveLocalState?.(); render();
  }
  function ptcToggleBill(id) { const e = list().find(x => x.id === id); if (!e) return; e.has_receipt = !e.has_receipt; window.saveLocalState?.(); render(); }

  // ---------- สรุปเคลียร์เงิน ----------
  function summaryText() {
    const all = sorted(), T = totals(all);
    const shop = 'เอิร์นนี่ แอดวานซ์';
    let t = `💼 สรุปเงินสำรองจ่าย • ${shop}\n${st()?.settings?.shopBranch ? st().settings.shopBranch + '\n' : ''}`;
    t += `เบิกมา ฿${money(T.in)}\nใช้จ่าย ฿${money(T.out)}\n${T.ret ? `คืนแล้ว ฿${money(T.ret)}\n` : ''}คงเหลือในมือ ฿${money(T.left)}\n`;
    t += `\n— แยกตามหมวด —\n`;
    CATS.forEach(c => { if (T.byCat[c.id]) t += `${c.icon} ${c.name} ฿${money(T.byCat[c.id])}\n`; });
    const days = [...new Set(all.map(e => e.expense_date))].sort();
    days.forEach(d => {
      t += `\n📅 ${thD(d)}\n`;
      all.filter(e => e.expense_date === d).forEach(e => {
        const k = kindOf(e);
        t += `${k === 'in' ? '+' : '−'} ${e.title}${e.people ? ` (${e.people}×${money(e.rate)})` : ''} ฿${money(e.amount)}${k === 'out' && !e.has_receipt ? ' (ไม่มีบิล)' : ''}\n`;
      });
    });
    if (T.noBill) t += `\n⚠️ ไม่มีบิล ${T.noBill} รายการ`;
    return t;
  }
  async function ptcCopy() {
    const t = summaryText();
    try { await navigator.clipboard.writeText(t); toast('📋 คัดลอกสรุปแล้ว • วางใน LINE ได้เลย'); }
    catch (_) { window.prompt('คัดลอกข้อความนี้', t); }
  }
  function ptcPrint() {
    const all = sorted(), T = totals(all);
    let bal = 0;
    const rowsHtml = all.map((e, i) => {
      const k = kindOf(e), a = Number(e.amount || 0); bal = r2(bal + (k === 'in' ? a : -a));
      return `<tr><td class="c">${i + 1}</td><td>${thD(e.expense_date)} ${esc(e.expense_time || '')}</td>
        <td>${esc(e.title)}${e.people ? ` (${e.people} คน × ${money(e.rate)})` : ''}${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</td>
        <td>${k === 'out' ? esc(cat(e.category).name) : k === 'in' ? 'รับเงินสำรอง' : 'คืนเงิน'}</td>
        <td class="r">${k === 'in' ? money(a) : ''}</td><td class="r">${k !== 'in' ? money(a) : ''}</td><td class="r">${money(bal)}</td>
        <td class="c">${k === 'out' ? (e.has_receipt ? '✓' : '<b>ไม่มี</b>') : ''}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>สรุปเงินสำรองจ่าย</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;800&display=swap" rel="stylesheet">
      <style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:"Sarabun",Tahoma,sans-serif;color:#000;margin:0;font-size:10.5pt}
      .bar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#1f2937}.bar button{height:40px;padding:0 16px;border:0;border-radius:4px;font:700 14px "Sarabun";cursor:pointer}
      .p{max-width:186mm;margin:12px auto;background:#fff;padding:4mm}h1{font-size:16pt;margin:0}.sub{color:#334155;margin:2px 0 10px}
      .k{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.k div{border:1px solid #94a3b8;padding:6px 8px}.k span{display:block;font-size:9pt;color:#334155}.k b{font-size:13pt}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:4px 6px;vertical-align:top}th{background:#f1f5f9;font-size:9.5pt}.r{text-align:right;white-space:nowrap}.c{text-align:center}small{color:#475569}
      .cat{margin:8px 0;font-size:10pt}.sig{display:grid;grid-template-columns:1fr 1fr;gap:20mm;margin-top:16mm;text-align:center}.sig div{border-top:1px dotted #000;padding-top:4px}
      @media print{.bar{display:none}.p{margin:0;padding:0}}</style></head><body>
      <div class="bar"><button onclick="print()" style="background:#10b981;color:#fff">🖨️ พิมพ์</button><button onclick="close()">ปิด</button></div>
      <div class="p"><h1>สรุปเงินสำรองจ่าย (เคลียร์เงินทดรอง)</h1>
      <div class="sub">เอิร์นนี่ แอดวานซ์${st()?.settings?.shopBranch ? ` • ${esc(st().settings.shopBranch)}` : ''} • พิมพ์ ${thD(today())}</div>
      <div class="k"><div><span>เบิกมา</span><b>${money(T.in)}</b></div><div><span>ใช้จ่าย</span><b>${money(T.out)}</b></div><div><span>คืนแล้ว</span><b>${money(T.ret)}</b></div><div><span>คงเหลือ</span><b>${money(T.left)}</b></div></div>
      <div class="cat">${CATS.filter(c => T.byCat[c.id]).map(c => `${c.name} ${money(T.byCat[c.id])}`).join(' • ')}${T.noBill ? ` • <b>ไม่มีบิล ${T.noBill} รายการ</b>` : ''}</div>
      <table><thead><tr><th>#</th><th>วันที่</th><th>รายการ</th><th>หมวด</th><th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>บิล</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="8" class="c">ไม่มีรายการ</td></tr>'}</tbody></table>
      <div class="sig"><div>ผู้เบิก / ผู้ใช้จ่าย</div><div>ผู้ตรวจสอบ / ผู้รับเคลียร์</div></div></div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast('เบราว์เซอร์บล็อกหน้าต่างใหม่'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  window.renderExpenses = render;
  Object.assign(window, { ptcOpen, ptcRange, ptcF, ptcSetCat, ptcAllow, ptcSave, ptcEdit, ptcDelete, ptcToggleBill, ptcCopy, ptcPrint, eaPettyCashTotals: () => totals(sorted()) });
})();
