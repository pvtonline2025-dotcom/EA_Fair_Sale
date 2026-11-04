/**
 * EA Fair Sale - ข้อความหน้าจอแบบเรียบ (Clean UI text)
 *
 * ทำให้หน้าจออ่านง่าย ไม่รก โดยอัตโนมัติ (ไม่ต้องแก้ทุกหน้า):
 *  - ตัดวงเล็บภาษาอังกฤษท้ายข้อความไทย เช่น "หมดสต็อกแล้ว (Out of Stock)" → "หมดสต็อกแล้ว"
 *  - แปลป้ายที่เป็นภาษาอังกฤษล้วน เช่น "In Stock" → "พร้อมขาย"
 *  - คำอธิบายใต้ชื่อหน้าที่เป็นภาษาอังกฤษล้วน → ซ่อน
 * ใช้เฉพาะ "ส่วนหัว/ปุ่ม/ป้าย" ของแอป — ไม่แตะชื่อสินค้า ข้อมูลที่ผู้ใช้กรอก หรือหน้าพิมพ์
 * ยกเว้นจุดใดๆ ได้ด้วย data-keep-text
 */
(function () {
  const THAI = /[฀-๿]/;
  // วงเล็บที่ข้างในเป็นอังกฤษ/ตัวเลข/สัญลักษณ์ล้วน และมีตัวอักษรอังกฤษอย่างน้อย 2 ตัว
  const EN_PAREN = /\s*\((?=[^()]*[A-Za-z]{2})[A-Za-z0-9\s&/:+\-.,'’%≤≥<>×!?#*]+\)/g;

  // ป้ายอังกฤษล้วน → ไทย (ตรงทั้งข้อความ ไม่สนตัวพิมพ์เล็ก/ใหญ่)
  const DICT = new Map(Object.entries({
    'in stock': 'พร้อมขาย',
    'low stock': 'ใกล้หมด',
    'out of stock': 'หมดแล้ว',
    'ทั้งหมด / all': 'ทั้งหมด',
    'menu': 'เมนูทั้งหมด',
    'status': 'สถานะ',
    'dashboard today': 'ภาพรวมวันนี้',
    'export to pdf': 'ส่งออก PDF',
    'undo': 'ย้อนกลับ'
  }));

  // องค์ประกอบ "ส่วนหัว/ปุ่ม/ป้าย" ที่ทำความสะอาดได้
  const SCOPE = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'th', 'legend', 'summary',
    '.kpi-label', '.kpi-lbl', '.l-lbl', '.tdd-panel-title', '.replenish-tab-btn', '.card-title',
    '.section-title', '.audit-pill-btn', '.badge', '.chip', '.mini-btn', '.btn', '.tab', '[role="tab"]',
    '.panel-title', '.stat-label', '.metric-label', '.low-banner-stat', '.hub-h', '.field > label'
  ].join(',');
  // ห้ามแตะ: ชื่อสินค้า ข้อมูลผู้ใช้ ช่องกรอก หน้าพิมพ์
  const SKIP = '[data-keep-text], input, textarea, select, option, script, style, svg, [contenteditable], ' +
    '[class*="name"], [class*="prod"], [class*="item-title"], [class*="title-wrap"], [class*="receipt"], [class*="print"], ' +
    '[class*="cart"], [class*="bill"], .lbl-name, code, pre, td';

  function cleanString(t) {
    if (!t) return t;
    const trimmed = t.trim();
    if (!trimmed) return t;
    const hit = DICT.get(trimmed.toLowerCase());
    if (hit) return t.replace(trimmed, hit);
    // "ทั้งหมด / All (8)" → "ทั้งหมด (8)"
    let out = t.replace(/\s*\/\s*All\b/g, '');
    const m = /^(\s*)(In Stock|Low Stock|Out of Stock)(\s*\(\d+\)\s*)$/i.exec(out);
    if (m) return m[1] + DICT.get(m[2].toLowerCase()) + m[3];
    if (THAI.test(out.replace(EN_PAREN, ''))) out = out.replace(EN_PAREN, '');
    return out;
  }

  function okNode(node) {
    const p = node.parentElement;
    if (!p) return false;
    if (p.closest(SKIP)) return false;
    return !!p.closest(SCOPE);
  }

  function cleanTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (okNode(root)) { const v = cleanString(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
    if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!/[A-Za-z]/.test(n.nodeValue)) continue;
      if (!okNode(n)) continue;
      const v = cleanString(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  }

  function cleanHeader() {
    const t = document.getElementById('pageTitle');
    const s = document.getElementById('pageSubtitle');
    if (t) { const v = cleanString(t.textContent); if (v !== t.textContent) t.textContent = v; }
    if (s) {
      const txt = s.textContent || '';
      s.style.display = THAI.test(txt) ? '' : 'none';
      const v = txt.replace(EN_PAREN, '');
      if (v !== txt) s.textContent = v;
    }
  }

  let queued = new Set(), timer = null;
  function flush() {
    timer = null;
    const list = [...queued]; queued = new Set();
    for (const n of list) if (n.isConnected) cleanTree(n);
    cleanHeader();
  }
  function queue(n) { queued.add(n); if (!timer) timer = requestAnimationFrame(flush); }

  function start() {
    cleanTree(document.body);
    cleanHeader();
    new MutationObserver(recs => {
      for (const r of recs) {
        if (r.type === 'characterData') queue(r.target);
        else r.addedNodes.forEach(queue);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.eaCleanText = cleanString;
})();
