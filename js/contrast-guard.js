/**
 * EA Fair Sale - Contrast guard (ทำให้ทุกหน้าอ่านง่ายในทุกธีม / โหมดสว่าง-มืด)
 *
 * โค้ดเดิมมีสีพื้นและสีตัวอักษรฝังตายตัวจำนวนมาก (inline style / CSS เก่าที่ออกแบบให้โหมดมืด)
 * ทำให้ในโหมดสว่างเกิด "ตัวหนังสือสีขาวบนพื้นขาว" หรือ "กล่องสีกรมท่าเข้ม" ปนอยู่
 *
 * ตัวช่วยนี้ตรวจหลังหน้าจอวาดเสร็จทุกครั้ง แล้ว:
 *  1) โหมดสว่าง: กล่องพื้นเข้มสีเทา/กรมท่า → ใช้สีพื้นของธีม (--surface-elevated)
 *  2) ทุกโหมด: ตัวหนังสือที่ contrast < 3.5 → ปรับความสว่างของสีเดิม (คงโทนสี) จนอ่านชัด (≥ 4.5)
 * เมื่อเปลี่ยนธีม/โหมด จะคืนค่าเดิมทั้งหมดแล้วตรวจใหม่
 */
(function () {
  const MIN_CONTRAST = 3.5;
  const TARGET_CONTRAST = 4.6;
  const SKIP_SELECTOR = [
    '[data-keep-emoji]', '.ps-dialog', '#toast', 'svg', 'video', 'canvas',
    '.scanner-video-wrap', '.scan-frame', '.receipt-print-area', '.a4-print-area', '.barcode-print-area',
    '.hub-qr-card', '.ps-qrfull', '[data-cg-skip]'
  ].join(',');

  // ---------- color math ----------
  function parse(s) {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function chan(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b); }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function over(top, base) {
    const a = top.a;
    return { r: top.r * a + base.r * (1 - a), g: top.g * a + base.g * (1 - a), b: top.b * a + base.b * (1 - a), a: 1 };
  }
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return { h, s, l };
  }
  function hslToRgb({ h, s, l }) {
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v, a: 1 }; }
    const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return { r: Math.round(hue(p, q, h + 1 / 3) * 255), g: Math.round(hue(p, q, h) * 255), b: Math.round(hue(p, q, h - 1 / 3) * 255), a: 1 };
  }
  // Same hue, adjusted lightness until readable on bg
  function readable(fg, bg) {
    const hsl = rgbToHsl(fg);
    const darker = lum(bg) > 0.3;
    for (let i = 0; i < 40; i++) {
      hsl.l = Math.min(1, Math.max(0, hsl.l + (darker ? -0.025 : 0.025)));
      const c = hslToRgb(hsl);
      if (contrast(c, bg) >= TARGET_CONTRAST) return c;
      if (hsl.l === 0 || hsl.l === 1) return c;
    }
    return hslToRgb(hsl);
  }
  const css = c => `rgb(${c.r | 0}, ${c.g | 0}, ${c.b | 0})`;

  // ---------- effective background ----------
  let bgCache = new Map();
  function pageBg() {
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  }
  // returns {c} or null when unknown (image background)
  function effectiveBg(el) {
    if (bgCache.has(el)) return bgCache.get(el);
    const cs = getComputedStyle(el);
    let res;
    const img = cs.backgroundImage;
    if (img && img !== 'none') {
      if (img.includes('url(')) { res = null; bgCache.set(el, res); return res; }
      const cols = [...img.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(Boolean);
      if (cols.length) {
        const parentRes0 = el.parentElement ? effectiveBg(el.parentElement) : { c: pageBg() };
        if (!parentRes0) { bgCache.set(el, null); return null; }
        let base = parentRes0.c;
        const ownColor = parse(cs.backgroundColor);
        if (ownColor && ownColor.a > 0.02) base = over(ownColor, base);
        const comp = cols.map(c => over(c, base));
        const avg = comp.reduce((a, c) => ({ r: a.r + c.r / comp.length, g: a.g + c.g / comp.length, b: a.b + c.b / comp.length, a: 1 }), { r: 0, g: 0, b: 0, a: 1 });
        res = { c: avg, grad: true };
        bgCache.set(el, res);
        return res;
      }
    }
    const own = parse(cs.backgroundColor);
    const parentRes = el.parentElement ? effectiveBg(el.parentElement) : { c: pageBg() };
    if (own && own.a > 0.02) {
      if (own.a >= 0.98) res = { c: own };
      else res = parentRes ? { c: over(own, parentRes.c) } : null;
    } else {
      res = parentRes;
    }
    bgCache.set(el, res);
    return res;
  }

  // ---------- fixing ----------
  function remember(el, prop) {
    const key = 'cgOrig' + prop;
    if (el.dataset[key] === undefined) el.dataset[key] = el.style.getPropertyValue(prop) + '|' + el.style.getPropertyPriority(prop);
  }
  function set(el, prop, value) {
    remember(el, prop.replace(/-/g, ''));
    el.style.setProperty(prop, value, 'important');
    el.setAttribute('data-cg', '1');
  }
  function resetAll() {
    document.querySelectorAll('[data-cg]').forEach(el => {
      for (const [k, v] of Object.entries(el.dataset)) {
        if (!k.startsWith('cgOrig')) continue;
        const prop = { color: 'color', backgroundcolor: 'background-color', backgroundimage: 'background-image', bordercolor: 'border-color' }[k.slice(6).toLowerCase()];
        if (!prop) continue;
        const [val, prio] = v.split('|');
        if (val) el.style.setProperty(prop, val, prio || ''); else el.style.removeProperty(prop);
        delete el.dataset[k];
      }
      el.removeAttribute('data-cg');
    });
  }

  function isLightMode() { return document.documentElement.getAttribute('data-color-mode') === 'light'; }

  function fixDarkBlocks(root, light) {
    if (!light) return;
    const rootCs = getComputedStyle(document.documentElement);
    const surfaceVar = rootCs.getPropertyValue('--surface-elevated').trim() || '#f8fafc';
    const cardVar = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const border = rootCs.getPropertyValue('--card-border').trim() || '#e2e8f0';
    root.querySelectorAll('*').forEach(el => {
      if (el.closest(SKIP_SELECTOR)) return;
      if (/^(OPTION|IMG)$/.test(el.tagName)) return;
      const isControl = /^(BUTTON|A|LABEL)$/.test(el.tagName) || !!el.closest('button,a,[role="button"],.btn');
      const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 900) return;
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage.includes('url(')) return;
      const own = parse(cs.backgroundColor);
      const hasGrad = cs.backgroundImage && cs.backgroundImage !== 'none' && /rgba?\(/.test(cs.backgroundImage);
      if (!hasGrad && (!own || own.a < 0.6)) return;
      // what this panel actually looks like
      bgCache.delete(el);
      const look = effectiveBg(el);
      if (!look) return;
      const c = look.c;
      let grey = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 40;
      // Gradients that fade into near-black (e.g. "colour → #111827") look heavy in light mode
      let accent = null;
      if (hasGrad) {
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(Boolean);
        const hasBlackStop = stops.some(x => x.a > 0.55 && lum(x) < 0.03);
        if (hasBlackStop) {
          accent = stops.filter(x => Math.max(x.r, x.g, x.b) - Math.min(x.r, x.g, x.b) >= 40)
            .sort((x, y) => (Math.max(y.r, y.g, y.b) - Math.min(y.r, y.g, y.b)) - (Math.max(x.r, x.g, x.b) - Math.min(x.r, x.g, x.b)))[0] || null;
          grey = !accent;
        }
      }
      // light mode: grey panels up to mid-grey, coloured panels only when really dark
      if (!accent && lum(c) >= (grey ? 0.22 : 0.08)) {
        if (!(hasGrad && grey && [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].some(m => { const x = parse(m[0]); return x && x.a > 0.55 && lum(x) < 0.03; }))) return;
      }
      if (accent) {
        if (isControl) return;
        const hsl = rgbToHsl(accent);
        const vivid = hslToRgb({ h: hsl.h, s: Math.max(hsl.s, 0.55), l: 0.5 });
        set(el, 'background-color', css({ r: vivid.r * 0.12 + cardVar.r * 0.88, g: vivid.g * 0.12 + cardVar.g * 0.88, b: vivid.b * 0.12 + cardVar.b * 0.88 }));
        set(el, 'border-color', css({ r: vivid.r * 0.35 + cardVar.r * 0.65, g: vivid.g * 0.35 + cardVar.g * 0.65, b: vivid.b * 0.35 + cardVar.b * 0.65 }));
        set(el, 'background-image', 'none');
        bgCache = new Map();
        return;
      }
      if (isControl && !grey) return;   // coloured buttons stay as designed
      if (grey) {
        set(el, 'background-color', surfaceVar);
        if (isField || isControl) set(el, 'color', rootCs.getPropertyValue('--text-main').trim() || '#0f172a');
      } else {
        // keep the hue: light tint of the panel colour
        const hsl = rgbToHsl(c);
        const vivid = hslToRgb({ h: hsl.h, s: Math.max(hsl.s, 0.55), l: 0.5 });
        const tint = { r: vivid.r * 0.12 + cardVar.r * 0.88, g: vivid.g * 0.12 + cardVar.g * 0.88, b: vivid.b * 0.12 + cardVar.b * 0.88 };
        set(el, 'background-color', css(tint));
        set(el, 'border-color', css({ r: vivid.r * 0.35 + cardVar.r * 0.65, g: vivid.g * 0.35 + cardVar.g * 0.65, b: vivid.b * 0.35 + cardVar.b * 0.65 }));
      }
      if (hasGrad) set(el, 'background-image', 'none');
      if (grey && parseFloat(cs.borderTopWidth) > 0) set(el, 'border-color', border);
      bgCache = new Map();
    });
  }

  function fixText(root) {
    const els = root.querySelectorAll('*');
    for (const el of els) {
      if (el.closest(SKIP_SELECTOR)) continue;
      const isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (!isField && ![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) continue;
      const bgRes = effectiveBg(el);
      if (!bgRes) continue;
      const bg = bgRes.c;
      const shown = fg.a < 1 ? over(fg, bg) : fg;
      if (contrast(shown, bg) >= MIN_CONTRAST) continue;
      set(el, 'color', css(readable(shown, bg)));
    }
  }

  let scheduled = false;
  function run() {
    scheduled = false;
    observer.disconnect();
    try {
      bgCache = new Map();
      const light = isLightMode();
      const roots = [document.getElementById('content'), document.querySelector('.appbar'), ...document.querySelectorAll('dialog[open]')].filter(Boolean);
      for (const root of roots) {
        if (root.closest(SKIP_SELECTOR) || root.matches(SKIP_SELECTOR)) continue;
        fixDarkBlocks(root, light);
      }
      bgCache = new Map();
      for (const root of roots) {
        if (root.closest(SKIP_SELECTOR) || root.matches(SKIP_SELECTOR)) continue;
        fixText(root);
      }
    } catch (e) {
      console.warn('[contrast-guard]', e);
    } finally {
      observe();
    }
  }
  let followUp = null;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    const go = () => { run(); clearTimeout(followUp); followUp = setTimeout(run, 700); };
    // โหมดสว่าง: แก้ทันทีก่อนจอวาด (กันกะพริบเป็นกล่องสีดำตอนหน้าโหลดข้อมูลใหม่)
    if (isLightMode()) { go(); return; }
    setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 250 }) : requestAnimationFrame(go)), 80);
  }

  const observer = new MutationObserver(schedule);
  function observe() {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class'] });
  }

  // Theme / mode change: restore originals, then check again
  // (เดิมรีเซ็ตทุกครั้งที่ style ของหน้าเปลี่ยน → ตอนโหลดข้อมูลใหม่จะกะพริบดำ) • รีเซ็ตเฉพาะตอนเปลี่ยนธีม/โหมดจริง
  let lastKey = '';
  const modeKey = () => `${document.documentElement.getAttribute('data-color-mode')}|${document.documentElement.getAttribute('data-theme')}`;
  lastKey = modeKey();
  new MutationObserver(() => { const k = modeKey(); if (k === lastKey) return; lastKey = k; resetAll(); bgCache = new Map(); scheduled = false; schedule(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode', 'data-theme'] });

  window.EaContrastGuard = { run, resetAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { observe(); schedule(); });
  else { observe(); schedule(); }
})();
