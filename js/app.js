// =========================================================
// EA Fair Sale V6 - POS + Barcode + Multi Terminal
// =========================================================

function getSupabaseConfig() {
  const bundledConfig = window.EA_SUPABASE_CONFIG || {};
  // ค่าที่ Cloudflare Build ใส่มาให้ต้องมีสิทธิ์เหนือค่าที่เคยบันทึกในเบราว์เซอร์
  // ป้องกัน DEV / PROD ชี้ผิดฐาน เมื่อผู้ใช้เคยบันทึก URL ใน Settings
  const managed = bundledConfig.managed === true;
  const url = managed ? (bundledConfig.url || "") : (localStorage.getItem("ea_supabase_url") || bundledConfig.url || "");
  const key = managed ? (bundledConfig.key || "") : (localStorage.getItem("ea_supabase_key") || bundledConfig.key || "");
  return { url: String(url).trim(), key: String(key).trim() };
}

let activeConfig = getSupabaseConfig();
let configured = activeConfig.url.startsWith("https://") && !activeConfig.url.includes("PUT_YOUR") && !activeConfig.key.includes("PUT_YOUR");
let sb = (configured && window.supabase) ? window.supabase.createClient(activeConfig.url, activeConfig.key) : null;
// Classic-script top-level let/const are NOT properties of window.
window.getEaSupabaseClient = () => sb;

function reloadSupabaseClient() {
  activeConfig = getSupabaseConfig();
  configured = activeConfig.url.startsWith("https://") && !activeConfig.url.includes("PUT_YOUR") && !activeConfig.key.includes("PUT_YOUR");
  sb = (configured && window.supabase) ? window.supabase.createClient(activeConfig.url, activeConfig.key) : null;
}

if (configured && !window.supabase) {
  console.error("Supabase library not loaded correctly from CDN.");
}

const TERMINAL_KEY = "ea_fairsale_terminal";
const CART_KEY = "ea_fairsale_cart";
const BILL_DISCOUNT_KEY = "ea_fairsale_bill_discount";

/* =========================================================
   APP THEMES & COLOR CUSTOMIZATION SYSTEM
   ========================================================= */
const THEMES = {
  slate: {
    id: "slate",
    name: "Minimal Slate (เทามินิมอล)",
    subtitle: "สีเทาสลレート คลาสสิก เรียบง่าย สบายตา ลดสีรบกวน",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#64748b",
      "--primary": "#475569",
      "--primary-hover": "#334155",
      "--primary-light": "#64748b",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#475569",
      "--primary": "#475569",
      "--primary-hover": "#334155",
      "--primary-light": "#475569",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  ocean: {
    id: "ocean",
    name: "Classic Blue (น้ำเงินคลาสสิก)",
    subtitle: "สีน้ำเงินสุภาพ เรียบหรู ใช้งานสบายตา",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#3b82f6",
      "--primary": "#2563eb",
      "--primary-hover": "#1d4ed8",
      "--primary-light": "#60a5fa",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#2563eb",
      "--primary": "#2563eb",
      "--primary-hover": "#1d4ed8",
      "--primary-light": "#2563eb",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  emerald: {
    id: "emerald",
    name: "Muted Forest (เขียวสุขุม)",
    subtitle: "สีเขียวป่า สุขุม เรียบง่าย เป็นระเบียบ",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#10b981",
      "--primary": "#15803d",
      "--primary-hover": "#166534",
      "--primary-light": "#22c55e",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#15803d",
      "--primary": "#15803d",
      "--primary-hover": "#166534",
      "--primary-light": "#15803d",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  royal: {
    id: "royal",
    name: "Subtle Indigo (ครามสุภาพ)",
    subtitle: "สีน้ำเงินคราม สไตล์โมเดิร์นเรียบหรู",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#6366f1",
      "--primary": "#4f46e5",
      "--primary-hover": "#4338ca",
      "--primary-light": "#818cf8",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#4f46e5",
      "--primary": "#4f46e5",
      "--primary-hover": "#4338ca",
      "--primary-light": "#4f46e5",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  amber: {
    id: "amber",
    name: "Warm Bronze (บรอนซ์อบอุ่น)",
    subtitle: "สีบรอนซ์อบอุ่น ละมุนตา ไม่ฉูดฉาด",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#d97706",
      "--primary": "#b45309",
      "--primary-hover": "#92400e",
      "--primary-light": "#d97706",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#b45309",
      "--primary": "#b45309",
      "--primary-hover": "#92400e",
      "--primary-light": "#b45309",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  rose: {
    id: "rose",
    name: "Subtle Crimson (แดงหม่น)",
    subtitle: "สีแดงหม่นสุภาพ สไตล์มินิมอล",
    darkVars: {
      "--bg": "#0f172a",
      "--bg-secondary": "#172033",
      "--surface": "#1e293b",
      "--surface-card": "#1e293b",
      "--surface-elevated": "#283548",
      "--surface-hover": "#334155",
      "--card-border": "#334155",
      "--card-border-hover": "#475569",
      "--border-active": "#e11d48",
      "--primary": "#be123c",
      "--primary-hover": "#9f1239",
      "--primary-light": "#e11d48",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b"
    },
    lightVars: {
      "--bg": "#f8fafc",
      "--bg-secondary": "#f1f5f9",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f8fafc",
      "--surface-hover": "#f1f5f9",
      "--card-border": "#e2e8f0",
      "--card-border-hover": "#cbd5e1",
      "--border-active": "#be123c",
      "--primary": "#be123c",
      "--primary-hover": "#9f1239",
      "--primary-light": "#be123c",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#0f172a",
      "--text-sub": "#1e293b",
      "--text-muted": "#64748b",
      "--text-dim": "#94a3b8"
    }
  },
  oled: {
    id: "oled",
    name: "Pure Dark (ดำสนิทเรียบหรู)",
    subtitle: "สีดำสนิท ประหยัดพลังงาน ไร้การรบกวน",
    darkVars: {
      "--bg": "#000000",
      "--bg-secondary": "#09090b",
      "--surface": "#121212",
      "--surface-card": "#18181b",
      "--surface-elevated": "#27272a",
      "--surface-hover": "#3f3f46",
      "--card-border": "#27272a",
      "--card-border-hover": "#3f3f46",
      "--border-active": "#3b82f6",
      "--primary": "#3b82f6",
      "--primary-hover": "#2563eb",
      "--primary-light": "#60a5fa",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#f8fafc",
      "--text-sub": "#cbd5e1",
      "--text-muted": "#a1a1aa",
      "--text-dim": "#71717a"
    },
    lightVars: {
      "--bg": "#ffffff",
      "--bg-secondary": "#f4f4f5",
      "--surface": "#ffffff",
      "--surface-card": "#ffffff",
      "--surface-elevated": "#f4f4f5",
      "--surface-hover": "#e4e4e7",
      "--card-border": "#e4e4e7",
      "--card-border-hover": "#d4d4d8",
      "--border-active": "#18181b",
      "--primary": "#18181b",
      "--primary-hover": "#27272a",
      "--primary-light": "#3f3f46",
      "--primary-glow": "transparent",
      "--shadow-glow": "none",
      "--text-main": "#09090b",
      "--text-sub": "#27272a",
      "--text-muted": "#71717a",
      "--text-dim": "#a1a1aa"
    }
  }
};

function applyTheme(themeId, mode) {
  const currentThemeId = themeId || state.settings?.theme || "slate";
  const currentMode = mode || state.settings?.colorMode || "dark";
  const t = THEMES[currentThemeId] || THEMES.slate || THEMES.ocean;

  if (state && state.settings) {
    state.settings.theme = t.id;
    state.settings.colorMode = currentMode;
  }

  document.documentElement.setAttribute("data-theme", t.id);
  document.documentElement.setAttribute("data-color-mode", currentMode);
  if (document.body) {
    document.body.setAttribute("data-theme", t.id);
    document.body.setAttribute("data-color-mode", currentMode);
  }

  const vars = currentMode === "light" ? (t.lightVars || t.darkVars) : (t.darkVars || t.vars);
  const rootStyle = document.documentElement.style;
  for (const [prop, val] of Object.entries(vars)) {
    rootStyle.setProperty(prop, val);
  }

  // Set body direct background to prevent white/black flash
  if (document.body) {
    document.body.style.backgroundColor = vars["--bg"] || (currentMode === "light" ? "#f8fafc" : "#0f172a");
  }

  // Clean flat surface on app-shell (no radial gradients)
  const appShell = document.querySelector('.app-shell');
  if (appShell) {
    appShell.style.backgroundColor = vars["--bg"];
    appShell.style.background = vars["--bg"];
  }

  // Set bottom nav background and border to clean minimal styling
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.style.backgroundColor = vars["--surface"] || (currentMode === 'light' ? '#ffffff' : '#1e293b');
    bottomNav.style.borderTop = `1px solid ${vars["--card-border"] || (currentMode === 'light' ? '#e2e8f0' : '#334155')}`;
    bottomNav.style.boxShadow = currentMode === 'light' ? '0 -1px 3px rgba(0, 0, 0, 0.04)' : '0 -1px 3px rgba(0, 0, 0, 0.1)';
  }

  // Set appbar header background & border cleanly
  const appbar = document.querySelector('.appbar');
  if (appbar) {
    appbar.style.backgroundColor = vars["--surface"] || (currentMode === 'light' ? '#ffffff' : '#1e293b');
    appbar.style.borderBottom = `1px solid ${vars["--card-border"] || (currentMode === 'light' ? '#e2e8f0' : '#334155')}`;
    appbar.style.boxShadow = currentMode === 'light' ? '0 1px 3px rgba(0, 0, 0, 0.04)' : '0 1px 3px rgba(0, 0, 0, 0.08)';
  }

  // Update mobile browser status bar / theme color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", vars["--surface"] || (currentMode === "light" ? "#ffffff" : "#1e293b"));
  }

  // Save instantly to cached settings for early-load anti-flash
  try {
    localStorage.setItem("ea_cached_settings", JSON.stringify({
      theme: t.id,
      colorMode: currentMode
    }));
  } catch(e){}

  // Backwards-compatible aliases for index.css and legacy styling
  rootStyle.setProperty("--app-bg", vars["--bg"]);
  rootStyle.setProperty("--app-panel", vars["--surface-card"]);
  rootStyle.setProperty("--app-panel-2", vars["--surface-elevated"]);
  rootStyle.setProperty("--app-line", vars["--card-border"]);
  rootStyle.setProperty("--line", vars["--card-border"]);
  rootStyle.setProperty("--border-subtle", currentMode === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)");
  rootStyle.setProperty("--text", vars["--text-main"]);
  rootStyle.setProperty("--app-text", vars["--text-main"]);
  rootStyle.setProperty("--text-primary", vars["--text-main"]);
  rootStyle.setProperty("--text-secondary", vars["--text-muted"]);
  rootStyle.setProperty("--muted", vars["--text-muted"]);
  rootStyle.setProperty("--app-muted", vars["--text-muted"]);
  rootStyle.setProperty("--appbar", currentMode === "light" ? "#ffffff" : vars["--surface"]);
  rootStyle.setProperty("--appbar-dark", currentMode === "light" ? "#f1f5f9" : vars["--bg"]);

  const modeBtn = el("headerModeToggleBtn");
  if (modeBtn) {
    modeBtn.innerHTML = currentMode === "light" ? "☀️" : "🌙";
    modeBtn.title = currentMode === "light" ? "โหมดสว่าง (คลิกเพื่อเปลี่ยนเป็น Dark Mode)" : "โหมดมืด (คลิกเพื่อเปลี่ยนเป็น Light Mode)";
  }
}

function selectTheme(themeId) {
  if (!THEMES[themeId]) return;
  if (!state.settings) state.settings = {};
  state.settings.theme = themeId;
  const currentMode = state.settings?.colorMode || "dark";
  applyTheme(themeId, currentMode);
  saveLocalState();
  if (sb && !state.isOffline) {
    upsertSetting("theme", themeId).catch(err => console.warn("Upsert theme failed:", err));
  }
  toast(`✨ เปลี่ยนสีธีมเป็น "${THEMES[themeId].name}" เรียบร้อยแล้ว`);
  if (state.page === "settings") {
    renderSettings();
  } else if (state.page === "home") {
    renderHome();
  } else if (typeof render === "function") {
    render();
  }
  const modalContent = el("themePickerModalContent");
  if (modalContent) {
    modalContent.innerHTML = renderThemeSelectorHTML();
  }
}

function toggleColorMode(targetMode) {
  const currentMode = state.settings?.colorMode || "dark";
  const newMode = targetMode || (currentMode === "dark" ? "light" : "dark");
  if (!state.settings) state.settings = {};
  state.settings.colorMode = newMode;
  applyTheme(state.settings.theme || "ocean", newMode);
  saveLocalState();
  if (sb && !state.isOffline) {
    upsertSetting("color_mode", newMode).catch(err => console.warn("Upsert color_mode failed:", err));
  }
  toast(newMode === "light" ? "☀️ เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "🌙 เปลี่ยนเป็นโหมดมืด (Dark Mode)");

  if (state.page === "settings") {
    renderSettings();
  } else if (state.page === "home") {
    renderHome();
  } else if (typeof render === "function") {
    render();
  }

  const modalContent = el("themePickerModalContent");
  if (modalContent) {
    modalContent.innerHTML = renderThemeSelectorHTML();
  }
}

function openThemePickerModal() {
  let dialog = el("themePickerModal");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "themePickerModal";
    dialog.className = "app-dialog theme-picker-modal-dialog";
    dialog.style.cssText = "background:var(--surface-card,#0f172a); color:var(--text-main,#f8fafc); border:1px solid var(--border-active,#334155); border-radius:18px; padding:22px; max-width:680px; width:92%; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); margin:auto;";
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  dialog.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--card-border,#334155); padding-bottom:14px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,var(--primary,#0284c7),var(--primary-light,#38bdf8)); display:flex; align-items:center; justify-content:center; font-size:20px; color:#fff;">🎨</div>
        <div>
          <h3 style="margin:0; font-size:18px; font-weight:800; color:var(--text-main,#f8fafc);">ตั้งค่าสีธีม & โหมดแสดงผล (App Theme)</h3>
          <p style="margin:2px 0 0 0; font-size:12px; color:var(--text-muted,#94a3b8);">สลับ Dark/Light mode และเลือกโทนสีแบรนด์ได้ตามต้องการ</p>
        </div>
      </div>
      <button onclick="closeThemePickerModal()" style="background:var(--surface,#1e293b); border:1px solid var(--card-border,#334155); color:var(--text-muted,#94a3b8); font-size:16px; border-radius:50%; width:34px; height:34px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
    </div>
    <div id="themePickerModalContent" style="max-height:65vh; overflow-y:auto; padding-right:4px;">
      ${renderThemeSelectorHTML()}
    </div>
    <div style="margin-top:18px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--card-border,#334155); padding-top:14px;">
      <button class="btn btn-light" onclick="go('settings'); closeThemePickerModal();" style="font-size:12px; padding:6px 12px;">⚙️ ไปยังหน้าตั้งค่าทั้งหมด</button>
      <button class="btn btn-primary" onclick="closeThemePickerModal()" style="font-size:13px; padding:8px 18px;">เรียบร้อย</button>
    </div>
  `;

  dialog.showModal();
}

function closeThemePickerModal() {
  const dialog = el("themePickerModal");
  if (dialog) dialog.close();
}

function renderThemeSelectorHTML() {
  const currentTheme = state.settings?.theme || "slate";
  const currentMode = state.settings?.colorMode || "dark";

  return `
    <div style="background:var(--bg-secondary); border:1px solid var(--card-border); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-weight:800; font-size:14px; color:var(--text-main);">โหมดแสดงผลหน้าจอ (Display Mode)</div>
        <div style="font-size:12px; color:var(--text-muted);">เลือกสลับระหว่างโหมดมืด (Dark Mode) และโหมดสว่าง (Light Mode)</div>
      </div>
      <div style="display:flex; gap:6px; background:var(--surface); padding:4px; border-radius:10px; border:1px solid var(--card-border);">
        <button type="button" class="btn ${currentMode === 'dark' ? 'btn-primary' : 'btn-light'}" onclick="toggleColorMode('dark')" style="padding:6px 14px; font-size:12px; border-radius:8px; font-weight:700;">
          🌙 โหมดมืด (Dark)
        </button>
        <button type="button" class="btn ${currentMode === 'light' ? 'btn-primary' : 'btn-light'}" onclick="toggleColorMode('light')" style="padding:6px 14px; font-size:12px; border-radius:8px; font-weight:700;">
          ☀️ โหมดสว่าง (Light)
        </button>
      </div>
    </div>

    <p style="margin-top:0;color:var(--text-muted);font-size:12px;margin-bottom:12px;">
      เลือกจานสีแบรนด์ร้านค้า (Theme Palette) จะถูกนำไปใช้ร่วมกับโหมด ${currentMode === 'light' ? 'สว่าง (Light Mode)' : 'มืด (Dark Mode)'} แบบเรียลไทม์ทันที
    </p>

    <div class="theme-grid">
      ${Object.values(THEMES).map(t => {
        const isActive = currentTheme === t.id;
        const vars = currentMode === "light" ? (t.lightVars || t.darkVars) : (t.darkVars || t.vars);
        const bg = vars["--bg"];
        const surface = vars["--surface-card"];
        const primary = vars["--primary-light"] || vars["--primary"];
        const borderActive = vars["--border-active"];
        
        return `
          <div class="theme-card ${isActive ? 'active' : ''}" onclick="selectTheme('${t.id}')" title="คลิกเพื่อเลือกใช้งานธีม ${t.name}">
            <div>
              <div class="theme-card-header">
                <span class="theme-title" style="color: ${isActive ? primary : 'var(--text-main)'};">${escapeHtml(t.name)}</span>
                ${isActive ? `<span class="theme-active-badge">✓ ใช้งานอยู่</span>` : ''}
              </div>
              <div class="theme-subtitle" style="color:var(--text-muted);">${escapeHtml(t.subtitle)}</div>
            </div>
            
            <div class="theme-swatches" style="background: ${bg}; border-color: ${isActive ? borderActive : 'var(--card-border)'}">
              <span class="swatch-dot" style="background:${bg}; border:1px solid rgba(128,128,128,0.3);" title="สีพื้นหลัง"></span>
              <span class="swatch-dot" style="background:${surface}; border:1px solid rgba(128,128,128,0.3);" title="สีการ์ด/กล่อง"></span>
              <span class="swatch-dot" style="background:${primary};" title="สีหลัก"></span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

const state = {
  page:"home",
  homeTopCardsMode:localStorage.getItem("ea_home_top_cards_mode")||"compact", // "compact" | "mini" | "normal"
  terminal:localStorage.getItem(TERMINAL_KEY)||"POS-01",
  settings:{shopName:"EA Fair Sale",target:5000,lowStockDefault:5,theme:"slate",colorMode:"dark"},
  products:[],sales:[],saleItems:[],movements:[],expenses:[],
  cart:loadCart(),
  billDiscount:loadBillDiscount(),
  loading:false,
  isOffline:false,
  posMode:"grid", // "grid" | "scan"
  posSearch:"",
  batchScanEnabled:localStorage.getItem("ea_batch_scan_enabled")==="true",
  batchScanQueue:[],
  paymentMethod:"cash", // "cash" | "promptpay"
  receivedCash:0,
  stockFilter:"all", // "all" | "ok" | "low" | "out"
  stockViewMode:localStorage.getItem("ea_stock_view")||"auto", // "auto" | "cards" | "table"
  stockSearch:"",
  stockPage:1,
  stockPageSize:Number(localStorage.getItem("ea_stock_page_size"))||20,
  stockSortBy:"name_asc", // "name_asc" | "name_desc" | "stock_asc" | "stock_desc" | "price_asc" | "price_desc" | "code_asc"
  dashboardChartMode:"week", // "week" | "7days" | "hourly"
  selectedChartPoint:null,
  dashboardPeriod:"today", // "today" | "yesterday" | "7days" | "30days" | "all" | "custom"
  dashboardDateStart:"",
  dashboardDateEnd:"",
  expensePeriod:"today", // "today" | "yesterday" | "7days" | "30days" | "all" | "custom"
  expenseDateStart:"",
  expenseDateEnd:"",
  expenseCategoryFilter:"all",
  expenseSearch:"",
  reportTab:"overview", // "overview" | "pos" | "raw"
  reportPeriod:"today", // "today" | "yesterday" | "7days" | "30days" | "all" | "custom"
  reportDateStart:"",
  reportDateEnd:"",
  reportTerminalFilter:"ALL", // "ALL" or "POS-01", "POS-02"...
  reportRawSearch:"",
  lastBill:null,
  purchaseOrders:[],
  autoReplenishConfig:{
    velocityWindowDays: 14,
    seasonalityMultiplier: 1.25,
    seasonalityLabel: "Weekend Peak (+25%)",
    leadTimeDays: 5,
    targetCoverageDays: 14,
    supplierName: "ผู้จัดจำหน่ายหลัก (Supplier A)",
    selectedProductTimelineId: ""
  },
  lowStockTab: "auto_replenish", // "auto_replenish" | "stock_forecast" | "po_timeline" | "po_list" | "low_cards"
  smartPODraftOverrides: {}, // { productId: customQty }
  poListFilterStatus: "all", // "all" | "Draft" | "Approved" | "Ordered" | "Received"
  poListSearch: "",
  stockForecastUrgencyFilter: "critical_all", // "all" | "critical_all" | "out" | "severe_3d" | "warning_7d" | "watch_14d"
  stockForecastCatFilter: "all",
  stockForecastSearch: "",
  auditSubTab: "count", // "count" | "history"
  auditBatchHistory: [],
  auditHistoryFilterStatus: "all", // "all" | "matched" | "discrepancy" | "shortage" | "surplus"
  auditHistorySearch: ""
};
window.getEaAppState = () => state;

let scannerControls=null;
let scannerReader=null;
let lastScannedCode="";
let lastScannedAt=0;

const el=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const getNDaysAgoISO=(n)=>{const d=new Date();d.setDate(d.getDate()-n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const formatThaiDateStr=(isoStr)=>{
  if(!isoStr||isoStr==="-") return "-";
  try{
    const parts=String(isoStr).split("-");
    if(parts.length!==3) return isoStr;
    const y=parseInt(parts[0],10), m=parseInt(parts[1],10)-1, d=parseInt(parts[2],10);
    const dt=new Date(y,m,d);
    return dt.toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"});
  }catch{return isoStr}
};
const formatThaiDateShort=(isoStr)=>{
  if(!isoStr||isoStr==="-") return "-";
  try{
    const parts=String(isoStr).split("-");
    if(parts.length!==3) return isoStr;
    const y=parseInt(parts[0],10), m=parseInt(parts[1],10)-1, d=parseInt(parts[2],10);
    const dt=new Date(y,m,d);
    return dt.toLocaleDateString("th-TH",{day:"numeric",month:"short"});
  }catch{return isoStr}
};

function loadCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []}}
function saveCartLocal(){localStorage.setItem(CART_KEY,JSON.stringify(state.cart))}
function loadBillDiscount(){
  try {
    const raw = localStorage.getItem(BILL_DISCOUNT_KEY);
    if (!raw) return { type: "none", value: 0, note: "" };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { type: "none", value: 0, note: "" };
  } catch {
    return { type: "none", value: 0, note: "" };
  }
}
function saveBillDiscountLocal(){
  try {
    localStorage.setItem(BILL_DISCOUNT_KEY, JSON.stringify(state.billDiscount || { type: "none", value: 0, note: "" }));
  } catch(e){}
}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
let toastTimer=null;
function toast(t,duration=2100){const x=el("toast");if(!x)return;
  // Modal dialogs live in the browser top layer; move the toast into the top-most open dialog so it stays visible.
  const host=[...document.querySelectorAll("dialog[open]")].pop()||document.body;if(x.parentElement!==host)host.appendChild(x);
  x.textContent=t;x.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>x.classList.remove("show"),Math.max(1200,Number(duration)||2100))}
function isQrPayment(pm){const v=String(pm||"").toLowerCase();return v==="promptpay"||v==="qr"||v==="transfer"}
function card(title,body,action=""){return `<section class="card"><div class="card-head"><h2>${title}</h2>${action}</div><div class="card-body">${body}</div></section>`}
function setHeader(t,s){el("pageTitle").textContent=t;el("pageSubtitle").textContent=s}

const G_ICONS = {
  bolt: `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" style="flex-shrink:0"><defs><linearGradient id="gBolt" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient><filter id="boltGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#f59e0b" flood-opacity="0.8"/></filter></defs><path d="M18 2L5 18H16L14 30L27 14H16L18 2Z" fill="url(#gBolt)" stroke="#fef08a" stroke-width="1.5" stroke-linejoin="round" filter="url(#boltGlow)"/></svg>`,
  gear: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px; margin-right:5px;"><circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.05-6.95l-1.41 1.41m-11.08 11.08l-1.41 1.41m0-13.9l1.41 1.41m11.08 11.08l1.41 1.41" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  sync: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px; margin-right:5px;"><path d="M20 4v5h-5M4 20v-5h5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 9A8 8 0 0 0 5.4 6.6L4 9m16 6l-1.4 2.4A8 8 0 0 1 4 15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  scanner: `<svg width="84" height="84" viewBox="0 0 64 64" fill="none" class="graphic-scanner-icon" style="margin: 0 auto 8px; display:block;">
    <defs>
      <linearGradient id="scanBodyGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#22d3ee"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <linearGradient id="laserGrad" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="rgba(239,68,68,0)"/>
        <stop offset="25%" stop-color="#ef4444"/>
        <stop offset="50%" stop-color="#ffedd5"/>
        <stop offset="75%" stop-color="#ef4444"/>
        <stop offset="100%" stop-color="rgba(239,68,68,0)"/>
      </linearGradient>
      <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <filter id="shadowScanner" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <g filter="url(#shadowScanner)">
      <rect x="6" y="6" width="52" height="52" rx="14" fill="#15191d" stroke="url(#scanBodyGrad)" stroke-width="3"/>
      <!-- Barcode Bars -->
      <rect x="14" y="15" width="3.5" height="34" rx="1.5" fill="#f8fafc"/>
      <rect x="21" y="15" width="2" height="34" rx="1" fill="#94a3b8"/>
      <rect x="25.5" y="15" width="5.5" height="34" rx="1.5" fill="#f8fafc"/>
      <rect x="34" y="15" width="2" height="34" rx="1" fill="#94a3b8"/>
      <rect x="38.5" y="15" width="4.5" height="34" rx="1.5" fill="#f8fafc"/>
      <rect x="46" y="15" width="4" height="34" rx="1.5" fill="#f8fafc"/>
      <!-- Glowing Red Laser Line -->
      <rect x="4" y="30.5" width="56" height="3" rx="1.5" fill="url(#laserGrad)" filter="url(#laserGlow)"/>
      <!-- Corner Scan Targets -->
      <path d="M12 18V12H18M46 12H52V18M12 46V52H18M46 52H52V46" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    </g>
  </svg>`,
  camera: `<svg width="22" height="22" viewBox="0 0 32 32" fill="none" style="vertical-align:-4px; margin-right:6px;"><rect x="3" y="8" width="26" height="20" rx="6" fill="#1e293b" stroke="#ffffff" stroke-width="1.8"/><circle cx="16" cy="18" r="6" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/><circle cx="16" cy="18" r="2.5" fill="#fef08a"/><rect x="22" y="10.5" width="4" height="2.5" rx="1" fill="#f59e0b"/><path d="M11 5H21L19 8H13L11 5Z" fill="#ffffff"/></svg>`,
  check: `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" style="vertical-align:-5px; margin-right:6px;"><circle cx="16" cy="16" r="14" fill="#ffffff"/><path d="M10 16.5L14.5 21L22 11" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><path d="M4 7H20M10 11V17M14 11V17M6 7L7 20C7 20.6 7.4 21 8 21H16C16.6 21 17 20.6 17 20L18 7M9 7V4C9 3.4 9.4 3 10 3H14C14.6 3 15 3.4 15 4V7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px; margin-right:4px;"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)"/><path d="M12 7V17M7 12H17" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px; margin-right:5px;"><rect x="3" y="3" width="7" height="7" rx="2" fill="#38bdf8"/><rect x="14" y="3" width="7" height="7" rx="2" fill="#ec4899"/><rect x="3" y="14" width="7" height="7" rx="2" fill="#a855f7"/><rect x="14" y="14" width="7" height="7" rx="2" fill="#f59e0b"/></svg>`,
  export: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px; margin-right:4px;"><path d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17M12 3V15M12 15L7 10M12 15L17 10" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  searchIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
};

function connectionNotice(){
  if(!configured) {
    return `<div class="connection-warning">
      <div style="display:flex; align-items:center; gap:12px;">
        ${G_ICONS.bolt}
        <div>
          <strong style="display:block;">โหมดออฟไลน์ ( Local Offline Mode )</strong>
          <span>ยังไม่ได้ตั้งค่า Supabase — ระบบกำลังทำงานแบบ Offline ด้วยข้อมูลในเครื่อง (ขายและบันทึกข้อมูลได้ตามปกติ)</span>
        </div>
      </div>
      <button class="warning-btn-retry" onclick="go('settings')">${G_ICONS.gear}ตั้งค่า Supabase</button>
    </div>`;
  }
  if(state.isOffline) {
    return `<div class="connection-warning">
      <div style="display:flex; align-items:center; gap:12px;">
        ${G_ICONS.bolt}
        <div>
          <strong style="display:block;">โหมดออฟไลน์ ( Local Offline Mode )</strong>
          <span>ไม่สามารถเชื่อมต่อ Supabase (${escapeHtml(activeConfig.url)}) ได้ — กำลังใช้ข้อมูลและบันทึกรายการในเครื่อง (สามารถเปิดขายและใช้งานได้ตามปกติ)</span>
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="warning-btn-retry" onclick="refreshData()">${G_ICONS.sync}ลองเชื่อมต่อใหม่</button>
        <button class="warning-btn-settings" onclick="go('settings')">${G_ICONS.gear}ตั้งค่า</button>
      </div>
    </div>`;
  }
  return "";
}
function statusForProduct(p){if(Number(p.stock_qty)<=0)return `<span class="status out">หมด</span>`;if(Number(p.stock_qty)<=Number(p.min_stock))return `<span class="status low">ใกล้หมด</span>`;return `<span class="status ok">ปกติ</span>`}
function todaySales(){return state.sales.filter(x=>((x.sale_date||"").slice(0,10)===todayISO()) || (!x.sale_date && (x.created_at||"").slice(0,10)===todayISO()))}
function todayTotal(){return todaySales().reduce((s,x)=>s+Number(x.total_amount||0),0)}
function lowProducts(){return state.products.filter(p=>p.is_active && Number(p.stock_qty)<=Number(p.min_stock))}

let notifiedLowStockProductIds = new Set();

function getNotificationPermissionStatus(){
  if(!("Notification" in window)){
    return { status: "unsupported", label: "เบราว์เซอร์ไม่รองรับ Web Push", badgeClass: "badge-out", icon: "❌" };
  }
  if(Notification.permission === "granted"){
    return { status: "granted", label: "เปิดใช้งานแล้ว (Granted)", badgeClass: "badge-ok", icon: "✅" };
  }
  if(Notification.permission === "denied"){
    return { status: "denied", label: "ถูกปิดกั้นใน Browser Settings", badgeClass: "badge-out", icon: "🚫" };
  }
  return { status: "default", label: "ยังไม่ได้เปิดใช้งาน (แตะเพื่อเปิด)", badgeClass: "badge-low", icon: "🔔" };
}

function sendBrowserPushNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const defaultOpts = {
    icon: "favicon.ico",
    badge: "favicon.ico",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options
  };

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg && reg.showNotification) {
          reg.showNotification(title, defaultOpts);
        } else {
          const n = new Notification(title, defaultOpts);
          n.onclick = () => { window.focus(); go("lowStock"); };
        }
      }).catch(() => {
        const n = new Notification(title, defaultOpts);
        n.onclick = () => { window.focus(); go("lowStock"); };
      });
    } else {
      const n = new Notification(title, defaultOpts);
      n.onclick = () => { window.focus(); go("lowStock"); };
    }
  } catch (err) {
    console.warn("Browser push notification failed:", err);
  }
}

function checkAndNotifyLowStock(productsList) {
  if (!Array.isArray(productsList)) productsList = state.products || [];
  
  const lowItems = productsList.filter(p => p.is_active && Number(p.stock_qty) <= Number(p.min_stock));
  
  const bellBadge = el("lowStockHeaderBadge");
  if (bellBadge) {
    if (lowItems.length > 0) {
      bellBadge.textContent = lowItems.length > 99 ? "99+" : String(lowItems.length);
      bellBadge.classList.remove("hidden");
    } else {
      bellBadge.classList.add("hidden");
    }
  }

  const newlyLow = lowItems.filter(p => !notifiedLowStockProductIds.has(`${p.id}-${p.stock_qty}`));

  if (newlyLow.length > 0) {
    newlyLow.forEach(prod => {
      notifiedLowStockProductIds.add(`${prod.id}-${prod.stock_qty}`);
      const unit = prod.unit || prod.unit_name || 'ชิ้น';
      const isOut = Number(prod.stock_qty) <= 0;

      // 1. In-App Toast
      const toastMsg = isOut 
        ? `🚨 หมดสต็อก! "${prod.product_name}" เหลือ 0 ${unit} (เกณฑ์ขั้นต่ำ ${prod.min_stock})`
        : `⚠️ สต็อกต่ำกว่าเกณฑ์! "${prod.product_name}" เหลือเพียง ${prod.stock_qty} ${unit} (เกณฑ์ขั้นต่ำ ${prod.min_stock})`;
      toast(toastMsg, 5000);

      // 2. Web Push Notification API
      const notifTitle = isOut ? `🚨 แจ้งเตือน: สินค้าหมดสต็อก!` : `⚠️ แจ้งเตือน: สต็อกสินค้าต่ำกว่าเกณฑ์!`;
      const notifBody = `${prod.product_name} เหลือเพียง ${prod.stock_qty} ${unit} (ต่ำกว่าเกณฑ์ขั้นต่ำ ${prod.min_stock} ${unit}) — แนะนำสั่งซื้อเพิ่มด่วน`;

      sendBrowserPushNotification(notifTitle, {
        body: notifBody,
        tag: `low-stock-${prod.id}`,
        data: { productId: prod.id, url: "/#lowStock" }
      });
    });

    // 3. Automated Background Email Notification Service to Manager
    triggerLowStockEmail(false);
  }
}

// Background Email Service Client Methods
// Token stays in sessionStorage (never include an administrative secret in shipped JS).
let emailNotificationConfigCache = null;
function notificationAdminHeaders(interactive = false) {
  let token = sessionStorage.getItem('ea_notification_admin_token') || '';
  if (!token && interactive) {
    token = window.prompt('รหัสผู้ดูแลระบบแจ้งเตือน (EA_NOTIFICATION_API_TOKEN):')?.trim() || '';
    if (token) sessionStorage.setItem('ea_notification_admin_token', token);
  }
  return token ? { 'X-EA-Admin-Token': token } : {};
}
function clearNotificationAdminTokenOnUnauthorized(response) {
  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem('ea_notification_admin_token');
    return true;
  }
  return false;
}

async function fetchEmailNotificationSettings() {
  try {
    const res = await fetch('/api/notifications/settings', { headers: notificationAdminHeaders() });
    const json = await res.json();
    if (json.success && json.data) {
      emailNotificationConfigCache = json.data;
      return json.data;
    }
  } catch (err) {
    console.warn("Could not fetch email settings:", err);
  }
  try {
    const localSaved = JSON.parse(localStorage.getItem("ea_email_notification_config") || "null");
    if (localSaved) emailNotificationConfigCache = localSaved;
  } catch(e){}

  emailNotificationConfigCache = emailNotificationConfigCache || {
    managerEmail: "workforcehub26@gmail.com",
    enabled: true,
    dailyAlertTime: "09:00",
    notifyOnEveryDip: true,
    minThresholdDefault: 5
  };
  return emailNotificationConfigCache;
}

async function saveEmailNotificationSettings() {
  const managerEmail = el("managerEmailInput")?.value?.trim() || "workforcehub26@gmail.com";
  const enabled = el("emailAlertEnabled") ? el("emailAlertEnabled").checked : true;
  const notifyOnEveryDip = el("emailAlertOnDip") ? el("emailAlertOnDip").checked : true;
  const dailyAlertTime = el("emailAlertTime")?.value || "09:00";
  const newConfig = { managerEmail, enabled, notifyOnEveryDip, dailyAlertTime, minThresholdDefault: 5 };
  try {
    localStorage.setItem("ea_email_notification_config", JSON.stringify(newConfig));
  } catch(e){}

  try {
    const authHeaders = notificationAdminHeaders(true);
    if (!authHeaders['X-EA-Admin-Token']) {
      emailNotificationConfigCache = newConfig;
      toast("💾 บันทึกการตั้งค่าการแจ้งเตือนลงในเครื่องเรียบร้อย (โหมดออฟไลน์/สแตนด์อโลน)");
      if (state.page === "settings") renderSettings();
      return;
    }
    const res = await fetch('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(newConfig)
    });
    const json = await res.json();
    if (clearNotificationAdminTokenOnUnauthorized(res)) toast('รหัสผู้ดูแลไม่ถูกต้อง กรุณาลองใหม่');
    if (json.success) {
      toast("💾 บันทึกการตั้งค่าการแจ้งเตือนทางอีเมลสำเร็จ!");
      emailNotificationConfigCache = json.data || newConfig;
      if (state.page === "settings") renderSettings();
    } else if (res.status === 503 || json.isOffline) {
      toast("💾 บันทึกการตั้งค่าการแจ้งเตือนลงในเครื่องเรียบร้อย (โหมดออฟไลน์/สแตนด์อโลน)");
      emailNotificationConfigCache = newConfig;
      if (state.page === "settings") renderSettings();
    } else {
      toast("❌ เกิดข้อผิดพลาดในการบันทึก: " + (json.message || "Unknown error"));
    }
  } catch (err) {
    emailNotificationConfigCache = newConfig;
    toast("💾 บันทึกการตั้งค่าการแจ้งเตือนลงในเครื่องเรียบร้อย (โหมดออฟไลน์/สแตนด์อโลน)");
    if (state.page === "settings") renderSettings();
  }
}

async function testLowStockEmail() {
  const managerEmail = el("managerEmailInput")?.value?.trim() || emailNotificationConfigCache?.managerEmail || "workforcehub26@gmail.com";
  toast("⏳ กำลังส่งอีเมลทดสอบไปยัง " + managerEmail + "...");

  try {
    const authHeaders = notificationAdminHeaders(true);
    if (!authHeaders['X-EA-Admin-Token']) {
      beepSuccess();
      toast(`📧 [โหมดจำลอง] จำลองส่งอีเมลแจ้งเตือนสต็อกต่ำไปยัง ${managerEmail} เรียบร้อยแล้ว`, 5000);
      return;
    }
    const res = await fetch('/api/notifications/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ email: managerEmail })
    });
    const json = await res.json();
    if (clearNotificationAdminTokenOnUnauthorized(res)) toast('รหัสผู้ดูแลไม่ถูกต้อง กรุณาลองใหม่');
    if (json.success) {
      beepSuccess();
      toast("✅ " + json.message, 5000);
      if (state.page === "settings") renderSettings();
    } else if (res.status === 503 || json.isOffline) {
      beepSuccess();
      toast(`📧 [โหมดจำลอง] จำลองส่งอีเมลแจ้งเตือนสต็อกต่ำไปยัง ${managerEmail} เรียบร้อยแล้ว (ไม่พบเซิร์ฟเวอร์ SMTP)`, 5000);
      if (state.page === "settings") renderSettings();
    } else {
      toast("❌ ส่งอีเมลทดสอบไม่สำเร็จ: " + (json.message || ""));
    }
  } catch (err) {
    beepSuccess();
    toast(`📧 [โหมดจำลอง] จำลองส่งอีเมลแจ้งเตือนสต็อกต่ำไปยัง ${managerEmail} เรียบร้อยแล้ว`, 5000);
  }
}

async function triggerLowStockEmail(force = false) {
  const lowItems = lowProducts();
  if (lowItems.length === 0) {
    if (force) toast("ℹ️ ไม่มีสินค้าที่ต่ำกว่าเกณฑ์ขั้นต่ำในขณะนี้");
    return;
  }

  const payload = {
    shopName: state.settings?.shopName || "EA Fair Sale",
    force,
    items: lowItems.map(p => ({
      name: p.product_name,
      code: p.barcode || p.id,
      stock: Number(p.stock_qty || 0),
      minStock: Number(p.min_stock || 0),
      unit: p.unit || p.unit_name || "ชิ้น",
      price: Number(p.sale_price ?? p.unit_price ?? 0)
    }))
  };

  try {
    const authHeaders = notificationAdminHeaders(force);
    // No unattended emails until an administrator has unlocked this browser session.
    if (!authHeaders['X-EA-Admin-Token']) return;
    const res = await fetch('/api/notifications/low-stock-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (clearNotificationAdminTokenOnUnauthorized(res) && force) toast('รหัสผู้ดูแลไม่ถูกต้อง กรุณาลองใหม่');
    if (json.success) {
      if (force) {
        beepSuccess();
        toast("📧 " + json.message, 5000);
      }
    } else if (force) {
      toast("⚠️ " + (json.message || "ไม่สามารถส่งอีเมลได้"));
    }
  } catch (err) {
    if (force) toast("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์อีเมล");
  }
}


function requestNotificationPermission() {
  if (!("Notification" in window)) {
    toast("เบราว์เซอร์ของคุณไม่รองรับ Web Push Notification");
    return;
  }
  if (Notification.permission === "granted") {
    toast("เปิดการแจ้งเตือน Push Notification เรียบร้อยแล้ว 🔔");
    testBrowserPushNotification();
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      toast("อนุญาตสิทธิ์การส่งแจ้งเตือนเรียบร้อยแล้ว 🔔");
      sendBrowserPushNotification("🔔 เปิดการแจ้งเตือนสต็อกสำเร็จ!", {
        body: "ระบบจะส่งการแจ้งเตือนอัตโนมัติทันทีที่สต็อกสินค้าต่ำกว่าเกณฑ์ Minimum Threshold",
        tag: "permission-granted"
      });
      checkAndNotifyLowStock();
      render();
    } else {
      toast("ปฏิเสธสิทธิ์การส่งแจ้งเตือน (สามารถเปิดใหม่ได้ในตั้งค่าเบราว์เซอร์)");
      render();
    }
  });
}

function testBrowserPushNotification() {
  if (!("Notification" in window)) {
    toast("เบราว์เซอร์นี้ไม่รองรับ Web Push Notification");
    return;
  }
  if (Notification.permission === "default") {
    requestNotificationPermission();
    return;
  }
  if (Notification.permission === "denied") {
    toast("⚠️ การแจ้งเตือนถูกปิดกั้น กรุณาเปิดการอนุญาตในตั้งค่าของเบราว์เซอร์");
    return;
  }
  sendBrowserPushNotification("🔔 ทดสอบระบบแจ้งเตือนสต็อกสำเร็จ!", {
    body: "ระบบแจ้งเตือนเบราว์เซอร์พร้อมส่งข้อความทันทีที่สินค้าต่ำกว่า Minimum Stock Threshold 📦",
    tag: "test-notification"
  });
  beepSuccess();
  toast("ส่งการแจ้งเตือนทดสอบไปยังเบราว์เซอร์เรียบร้อยแล้ว 🔔");
}

function openLowStockAlertModal() {
  const modal = el("lowStockAlertModal");
  const body = el("lowStockAlertModalBody");
  if (!modal || !body) return;

  const lowItems = lowProducts();
  if (lowItems.length === 0) {
    body.innerHTML = `
      <div style="padding: 30px; text-align: center;">
        <div style="font-size: 42px; margin-bottom: 10px;">✅</div>
        <h4 style="margin: 0 0 6px; color: #34d399; font-size: 17px; font-weight: 800;">สต็อกสินค้าอยู่ในเกณฑ์ปกติทุกรายการ</h4>
        <p style="color: var(--muted); font-size: 13px; margin: 0;">ไม่มีรายการสินค้าใดต่ำกว่าเกณฑ์ Minimum Threshold ที่ตั้งไว้ในขณะนี้</p>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <span style="color: #f87171; font-weight: 700; font-size: 13px;">พบสินค้าต่ำกว่าเกณฑ์ขั้นต่ำทั้งหมด ${lowItems.length} รายการ</span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn warning small" onclick="exportMasterReportExcel()">📥 ดาวน์โหลด Reorder Excel</button>
          <button type="button" class="btn primary small" onclick="triggerLowStockEmail(true)" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">📧 ส่งอีเมลแจ้งเตือนผู้จัดการ</button>
        </div>
      </div>
      <div class="table-wrap" style="max-height: 360px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>สินค้า</th>
              <th>คงเหลือ</th>
              <th>เกณฑ์ขั้นต่ำ</th>
              <th>สถานะ</th>
              <th style="text-align:right;">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            ${lowItems.map(p => `
              <tr>
                <td>
                  <strong style="color:#f8fafc; font-size:13.5px;">${escapeHtml(p.product_name)}</strong>
                  <div style="font-size:11px; color:#94a3b8;">Barcode: ${escapeHtml(p.barcode || '-')}</div>
                </td>
                <td><span class="status low" style="font-size:12px; font-weight:800;">${p.stock_qty} ${escapeHtml(p.unit_name || 'ชิ้น')}</span></td>
                <td><span style="color:#fef08a; font-weight:700;">${p.min_stock} ${escapeHtml(p.unit_name || 'ชิ้น')}</span></td>
                <td>${statusForProduct(p)}</td>
                <td style="text-align:right;">
                  <button type="button" class="btn success small" onclick="closeLowStockAlertModal(); quickReceive('${p.id}')">
                    ➕ เติม Stock
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  modal.showModal();
}

function closeLowStockAlertModal() {
  const modal = el("lowStockAlertModal");
  if (modal?.open) modal.close();
}

function renderLowStockKpi(opts = {}) {
  const low = lowProducts();
  const outList = state.products.filter(p => Number(p.stock_qty) <= 0);
  const lowCount = low.length;
  const outCount = outList.length;
  const isCritical = outCount > 0;
  const hasLowStock = lowCount > 0;

  const cardClass = hasLowStock 
    ? (isCritical ? "kpi warning kpi-low-stock-alert kpi-low-stock-critical" : "kpi warning kpi-low-stock-alert")
    : "kpi kpi-stock-healthy";

  const labelText = opts.label || "สินค้า Stock ต่ำ";
  
  let beaconHtml = "";
  if (isCritical) {
    beaconHtml = `
      <span class="kpi-beacon-wrap critical" title="มีสินค้าหมดสต็อก!">
        <span class="kpi-beacon-ping-container">
          <span class="kpi-beacon-ping"></span>
          <span class="kpi-beacon-dot"></span>
        </span>
        หมด ${outCount}
      </span>
    `;
  } else if (hasLowStock) {
    beaconHtml = `
      <span class="kpi-beacon-wrap" title="สินค้าเหลือน้อยกว่าขั้นต่ำ">
        <span class="kpi-beacon-ping-container">
          <span class="kpi-beacon-ping"></span>
          <span class="kpi-beacon-dot"></span>
        </span>
        เตือน ${lowCount}
      </span>
    `;
  } else {
    beaconHtml = `<span class="kpi-healthy-pill">✓ พร้อมขาย</span>`;
  }

  let hintText = opts.hint;
  if (!hintText) {
    if (isCritical) {
      hintText = `🚨 หมด ${outCount} • ใกล้หมด ${Math.max(0, lowCount - outCount)} รายการ`;
    } else if (hasLowStock) {
      hintText = `⚠️ ต่ำกว่าเกณฑ์ ${lowCount} รายการ (แตะเพื่อเติม)`;
    } else {
      hintText = "สต็อกสินค้าทุกรายการเพียงพอ";
    }
  }

  return `
    <div class="${cardClass}" onclick="go('lowStock')" style="cursor:pointer;" title="แตะเพื่อเปิดหน้ารายการสินค้าสต็อกต่ำ">
      <div class="kpi-header-row">
        <div class="label">${labelText}</div>
        ${beaconHtml}
      </div>
      <div class="value ${hasLowStock ? 'kpi-value-pulse' : ''}" style="${!hasLowStock ? 'color:#34d399 !important;' : ''}">
        ${lowCount} <span class="kpi-unit">รายการ</span>
      </div>
      <div class="hint">${hintText}</div>
    </div>
  `;
}
function productById(id){return state.products.find(x=>x.id===id)}
function productByBarcode(code){return state.products.find(x=>String(x.barcode||"").trim()===String(code||"").trim())}
function cartCount(){return state.cart.reduce((s,x)=>s+Number(x.qty||0),0)}

// ยอดรวมตามราคาปกติ (ก่อนลด)
function cartSubtotalOriginal(){
  return state.cart.reduce((s,x)=>s + (Number(x.qty)||0) * Number(x.original_price ?? x.unit_price ?? 0), 0);
}

// ยอดรวมสินค้าหลังหักส่วนลดเฉพาะรายการ
function cartItemsTotal(){
  return state.cart.reduce((s,x)=>s + (Number(x.qty)||0) * Number(x.unit_price ?? 0), 0);
}

// มูลค่าส่วนลดรวมจากรายการสินค้า
function cartItemsDiscount(){
  return Math.max(0, cartSubtotalOriginal() - cartItemsTotal());
}

// มูลค่าส่วนลดท้ายบิล
function cartBillDiscountAmount(){
  const itemsTot = cartItemsTotal();
  if(!itemsTot || !state.billDiscount || state.billDiscount.type === "none") return 0;
  if(state.billDiscount.type === "percent"){
    const pct = Math.max(0, Math.min(100, Number(state.billDiscount.value) || 0));
    return Math.round((itemsTot * pct) / 100);
  }
  if(state.billDiscount.type === "baht"){
    const baht = Math.max(0, Number(state.billDiscount.value) || 0);
    return Math.min(itemsTot, baht);
  }
  return 0;
}

// รวมส่วนลดทั้งหมด (ส่วนลดรายชิ้น + ส่วนลดท้ายบิล)
function cartTotalDiscount(){
  return cartItemsDiscount() + cartBillDiscountAmount();
}

// ยอดสุทธิที่ต้องชำระจริง (หลังหักส่วนลดทุกประเภท)
function cartTotal(){
  const itemsTot = cartItemsTotal();
  const billDisc = cartBillDiscountAmount();
  return Math.max(0, itemsTot - billDisc);
}

function saveLocalState(){
  try {
    localStorage.setItem("ea_cached_products", JSON.stringify(state.products));
    localStorage.setItem("ea_cached_sales", JSON.stringify(state.sales));
    localStorage.setItem("ea_cached_sale_items", JSON.stringify(state.saleItems));
    localStorage.setItem("ea_cached_movements", JSON.stringify(state.movements));
    localStorage.setItem("ea_cached_expenses", JSON.stringify(state.expenses));
    localStorage.setItem("ea_cached_settings", JSON.stringify(state.settings));
    localStorage.setItem("ea_cached_purchase_orders", JSON.stringify(state.purchaseOrders || []));
    localStorage.setItem("ea_cached_auto_replenish_config", JSON.stringify(state.autoReplenishConfig || {}));
    localStorage.setItem("ea_cached_audit_batch_history", JSON.stringify(state.auditBatchHistory || []));
  } catch (e) {
    console.warn("Unable to save local state:", e);
  }
}

function loadFromLocalStorageFallback(){
  try {
    state.products = JSON.parse(localStorage.getItem("ea_cached_products") || "[]");
    state.sales = JSON.parse(localStorage.getItem("ea_cached_sales") || "[]");
    state.saleItems = JSON.parse(localStorage.getItem("ea_cached_sale_items") || "[]");
    state.movements = JSON.parse(localStorage.getItem("ea_cached_movements") || "[]");
    state.expenses = JSON.parse(localStorage.getItem("ea_cached_expenses") || "[]");
    state.purchaseOrders = JSON.parse(localStorage.getItem("ea_cached_purchase_orders") || "[]");
    state.auditBatchHistory = JSON.parse(localStorage.getItem("ea_cached_audit_batch_history") || "[]");
    const savedConfig = JSON.parse(localStorage.getItem("ea_cached_auto_replenish_config") || "null");
    if (savedConfig) state.autoReplenishConfig = { ...state.autoReplenishConfig, ...savedConfig };
    const saved = JSON.parse(localStorage.getItem("ea_cached_settings") || "null");
    if (saved) state.settings = saved;
    applyTheme(state.settings?.theme || "ocean", state.settings?.colorMode || "dark");
  } catch (e) {
    console.warn("Storage fallback load warning:", e);
  }

  if (!state.products || state.products.length === 0) {
    state.products = [
      { id: "off-1", product_code: "P001", barcode: "8850000000001", product_name: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", stock_qty: 50, min_stock: 10, sale_price: 15, cost_price: 8, is_active: true },
      { id: "off-2", product_code: "P002", barcode: "8850000000002", product_name: "สินค้าตัวอย่าง 2 (ขนมทานเล่น)", stock_qty: 8, min_stock: 10, sale_price: 35, cost_price: 20, is_active: true },
      { id: "off-3", product_code: "P003", barcode: "8850000000003", product_name: "สินค้าตัวอย่าง 3 (กาแฟพร้อมดื่ม)", stock_qty: 3, min_stock: 5, sale_price: 45, cost_price: 30, is_active: true }
    ];
    saveLocalState();
  }

  if (!state.sales || state.sales.length === 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sampleDailyRevs = [4200, 5800, 8900, 7400, 14200, 18500, 9600]; // Friday/Saturday peak
    state.sales = [];
    state.saleItems = [];

    for(let i = 0; i < 7; i++){
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if(d > now && d.toISOString().slice(0, 10) !== todayISO()) continue; // Skip future days

      const isoDate = d.toISOString().slice(0, 10);
      const targetRev = sampleDailyRevs[i] || 5000;
      const billCount = Math.max(3, Math.round(targetRev / 350));
      
      for(let b = 0; b < billCount; b++){
        const saleId = `demo-sale-${isoDate}-${b+1}`;
        const isQR = b % 2 === 0;
        const billAmt = Math.round(targetRev / billCount);
        const hour = 9 + (b % 11);
        const timeStr = `${String(hour).padStart(2, "0")}:${String((b * 17) % 60).padStart(2, "0")}`;

        state.sales.push({
          id: saleId,
          sale_code: `INV-${isoDate.replace(/-/g, "")}-${String(b+1).padStart(3, "0")}`,
          sale_date: isoDate,
          sale_time: timeStr,
          total_amount: billAmt,
          discount_amount: 0,
          payment_method: isQR ? "promptpay" : "cash",
          cash_received: isQR ? 0 : billAmt,
          change_amount: 0,
          terminal: "POS-01",
          created_at: `${isoDate}T${timeStr}:00.000Z`
        });

        // Add 1-2 sale items
        state.saleItems.push({
          id: `demo-item-${saleId}-1`,
          sale_id: saleId,
          product_id: "off-1",
          product_name: "น้ำดื่มบริสุทธิ์ (ขวด)",
          qty: Math.max(1, Math.round(billAmt / 20)),
          unit_price: 15,
          line_total: billAmt
        });
      }
    }
    saveLocalState();
  }

  if (!state.expenses || state.expenses.length === 0) {
    const today = todayISO();
    state.expenses = [
      { id: "exp-1", title: "ค่าเช่าพื้นที่บูธหน้างาน (รายวัน)", category: "booth_rent", amount: 1500, expense_date: today, expense_time: "08:30", payment_method: "transfer", recorder: "Admin", note: "ชำระให้ผู้จัดงาน" },
      { id: "exp-2", title: "ค่าอาหารกลางวันและน้ำดื่มทีมงาน", category: "food", amount: 350, expense_date: today, expense_time: "12:15", payment_method: "cash", recorder: "POS-01", note: "ข้าวกล่อง 4 กล่อง + น้ำ" },
      { id: "exp-3", title: "ค่าเดินทางและค่าน้ำมันขนส่งสต็อก", category: "transport", amount: 300, expense_date: today, expense_time: "09:00", payment_method: "transfer", recorder: "Admin", note: "ขนสต็อกเช้า" }
    ];
    saveLocalState();
  }

  if (!state.auditBatchHistory || state.auditBatchHistory.length === 0) {
    const today = todayISO();
    const yest = getNDaysAgoISO(1);
    const d3 = getNDaysAgoISO(3);
    state.auditBatchHistory = [
      {
        id: "batch-aud-003",
        batchNo: "AUD-" + today.replace(/-/g, "") + "-001",
        auditDate: `${today} 17:45`,
        auditor: "POS-01 (สมชาย - ผู้จัดการร้าน)",
        terminal: "POS-01",
        totalItems: 12,
        matchCount: 11,
        surplusCount: 0,
        shortageCount: 1,
        totalSurplusUnits: 0,
        totalShortageUnits: 2,
        totalSurplusValue: 0,
        totalShortageValue: 30,
        netDiscrepancyValue: -30,
        accuracyRate: 92,
        status: "shortage",
        statusLabel: "🚨 มีผลต่าง - สต็อกขาด 2 ชิ้น (-฿30.00)",
        note: "ตรวจนับสต็อกหลังปิดร้านรอบเย็น พบน้ำดื่มขาด 2 ขวด",
        itemsDetail: [
          { productCode: "P001", barcode: "8850000000001", productName: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", unit: "ขวด", unitPrice: 15, sysQty: 50, countQty: 48, diff: -2, diffVal: -30, status: "shortage" }
        ],
        scanHistory: [
          { scanOrder: 1, timestamp: `${today} 17:35:10`, timeStr: "17:35:10", productCode: "P001", barcode: "8850000000001", productName: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", unit: "ขวด", unitPrice: 15, step: 20, previousCount: 0, newCount: 20, sysQty: 50, diff: -30, scanMethod: "📟 เครื่องสแกนบาร์โค้ด" },
          { scanOrder: 2, timestamp: `${today} 17:38:22`, timeStr: "17:38:22", productCode: "P001", barcode: "8850000000001", productName: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", unit: "ขวด", unitPrice: 15, step: 20, previousCount: 20, newCount: 40, sysQty: 50, diff: -10, scanMethod: "📟 เครื่องสแกนบาร์โค้ด" },
          { scanOrder: 3, timestamp: `${today} 17:42:05`, timeStr: "17:42:05", productCode: "P001", barcode: "8850000000001", productName: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", unit: "ขวด", unitPrice: 15, step: 8, previousCount: 40, newCount: 48, sysQty: 50, diff: -2, scanMethod: "📷 กล้องสแกนมือถือ" }
        ]
      },
      {
        id: "batch-aud-002",
        batchNo: "AUD-" + yest.replace(/-/g, "") + "-001",
        auditDate: `${yest} 18:30`,
        auditor: "POS-02 (สมาน - หัวหน้าคลัง)",
        terminal: "POS-02",
        totalItems: 15,
        matchCount: 15,
        surplusCount: 0,
        shortageCount: 0,
        totalSurplusUnits: 0,
        totalShortageUnits: 0,
        totalSurplusValue: 0,
        totalShortageValue: 0,
        netDiscrepancyValue: 0,
        accuracyRate: 100,
        status: "matched",
        statusLabel: "✓ ตรงกับระบบ 100% (นับครบถ้วน)",
        note: "ตรวจนับประจำวันก่อนเปลี่ยนกะ ยอดตรง 100%",
        itemsDetail: [],
        scanHistory: [
          { scanOrder: 1, timestamp: `${yest} 18:10:05`, timeStr: "18:10:05", productCode: "P001", barcode: "8850000000001", productName: "สินค้าตัวอย่าง 1 (น้ำดื่ม)", unit: "ขวด", unitPrice: 15, step: 50, previousCount: 0, newCount: 50, sysQty: 50, diff: 0, scanMethod: "📟 เครื่องสแกนบาร์โค้ด" },
          { scanOrder: 2, timestamp: `${yest} 18:15:40`, timeStr: "18:15:40", productCode: "P002", barcode: "8850000000002", productName: "สินค้าตัวอย่าง 2 (ขนมทานเล่น)", unit: "ชิ้น", unitPrice: 35, step: 8, previousCount: 0, newCount: 8, sysQty: 8, diff: 0, scanMethod: "📟 เครื่องสแกนบาร์โค้ด" },
          { scanOrder: 3, timestamp: `${yest} 18:22:18`, timeStr: "18:22:18", productCode: "P003", barcode: "8850000000003", productName: "สินค้าตัวอย่าง 3 (กาแฟพร้อมดื่ม)", unit: "กระป๋อง", unitPrice: 45, step: 3, previousCount: 0, newCount: 3, sysQty: 3, diff: 0, scanMethod: "📷 กล้องสแกนมือถือ" }
        ]
      },
      {
        id: "batch-aud-001",
        batchNo: "AUD-" + d3.replace(/-/g, "") + "-001",
        auditDate: `${d3} 09:15`,
        auditor: "POS-01 (สมหญิง - พนักงานคลัง)",
        terminal: "POS-01",
        totalItems: 10,
        matchCount: 9,
        surplusCount: 1,
        shortageCount: 0,
        totalSurplusUnits: 3,
        totalShortageUnits: 0,
        totalSurplusValue: 105,
        totalShortageValue: 0,
        netDiscrepancyValue: 105,
        accuracyRate: 90,
        status: "surplus",
        statusLabel: "📈 มีผลต่าง - สต็อกเกิน +3 ชิ้น (+฿105.00)",
        note: "ตรวจนับสินค้าแรกรับ มีขนมทานเล่นเกินมา 3 ชิ้น",
        itemsDetail: [
          { productCode: "P002", barcode: "8850000000002", productName: "สินค้าตัวอย่าง 2 (ขนมทานเล่น)", unit: "ชิ้น", unitPrice: 35, sysQty: 5, countQty: 8, diff: 3, diffVal: 105, status: "surplus" }
        ],
        scanHistory: [
          { scanOrder: 1, timestamp: `${d3} 09:05:12`, timeStr: "09:05:12", productCode: "P002", barcode: "8850000000002", productName: "สินค้าตัวอย่าง 2 (ขนมทานเล่น)", unit: "ชิ้น", unitPrice: 35, step: 5, previousCount: 0, newCount: 5, sysQty: 5, diff: 0, scanMethod: "📟 เครื่องสแกนบาร์โค้ด" },
          { scanOrder: 2, timestamp: `${d3} 09:11:45`, timeStr: "09:11:45", productCode: "P002", barcode: "8850000000002", productName: "สินค้าตัวอย่าง 2 (ขนมทานเล่น)", unit: "ชิ้น", unitPrice: 35, step: 3, previousCount: 5, newCount: 8, sysQty: 5, diff: 3, scanMethod: "📷 กล้องสแกนมือถือ" }
        ]
      }
    ];
    saveLocalState();
  }

  if (!state.purchaseOrders || state.purchaseOrders.length === 0) {
    const p1 = state.products[0]?.id || "off-1";
    const p2 = state.products[1]?.id || "off-2";
    const p3 = state.products[2]?.id || "off-3";

    state.purchaseOrders = [
      {
        id: "po-seed-1",
        poNo: "PO-20260615-001",
        createdAt: "2026-06-15T09:00:00.000Z",
        orderDate: "2026-06-15",
        expectedDeliveryDate: "2026-06-20",
        receivedDate: "2026-06-20",
        supplierName: "บริษัท เครื่องดื่มสยามอินเตอร์ จำกัด (Supplier A)",
        leadTimeDays: 5,
        seasonalityMultiplier: 1.25,
        targetCoverageDays: 14,
        status: "Received",
        note: "ล็อตเติมสต็อกรอบต้นเดือน - รองรับยอดขายปกติ",
        items: [
          { productId: p1, productName: state.products[0]?.product_name || "น้ำดื่มบริสุทธิ์ (ขวด)", productCode: "P001", unit: "ขวด", qty: 100, unitCost: 8, lineTotal: 800, dailyVelocity: 7.2, rop: 45 }
        ],
        totalUnits: 100,
        totalAmount: 800
      },
      {
        id: "po-seed-2",
        poNo: "PO-20260702-002",
        createdAt: "2026-07-02T10:30:00.000Z",
        orderDate: "2026-07-02",
        expectedDeliveryDate: "2026-07-06",
        receivedDate: "2026-07-06",
        supplierName: "ศูนย์กระจายสินค้าสแน็คไทย จำกัด (Supplier B)",
        leadTimeDays: 4,
        seasonalityMultiplier: 1.5,
        targetCoverageDays: 14,
        status: "Received",
        note: "สั่งสำรองพิเศษรับงานมหกรรมกลางเดือน",
        items: [
          { productId: p2, productName: state.products[1]?.product_name || "ขนมทานเล่น", productCode: "P002", unit: "ชิ้น", qty: 80, unitCost: 20, lineTotal: 1600, dailyVelocity: 5.5, rop: 33 }
        ],
        totalUnits: 80,
        totalAmount: 1600
      },
      {
        id: "po-seed-3",
        poNo: "PO-20260722-003",
        createdAt: "2026-07-22T14:15:00.000Z",
        orderDate: "2026-07-22",
        expectedDeliveryDate: "2026-07-27",
        receivedDate: "2026-07-27",
        supplierName: "บริษัท เครื่องดื่มสยามอินเตอร์ จำกัด (Supplier A)",
        leadTimeDays: 5,
        seasonalityMultiplier: 1.25,
        targetCoverageDays: 14,
        status: "Received",
        note: "เติมสต็อกน้ำดื่มและกาแฟพร้อมดื่ม",
        items: [
          { productId: p1, productName: state.products[0]?.product_name || "น้ำดื่มบริสุทธิ์ (ขวด)", productCode: "P001", unit: "ขวด", qty: 120, unitCost: 8, lineTotal: 960, dailyVelocity: 8.5, rop: 53 },
          { productId: p3, productName: state.products[2]?.product_name || "กาแฟพร้อมดื่ม", productCode: "P003", unit: "กระป๋อง", qty: 40, unitCost: 30, lineTotal: 1200, dailyVelocity: 3.1, rop: 20 }
        ],
        totalUnits: 160,
        totalAmount: 2160
      },
      {
        id: "po-seed-4",
        poNo: "PO-20260810-004",
        createdAt: "2026-08-10T11:00:00.000Z",
        orderDate: "2026-08-10",
        expectedDeliveryDate: "2026-08-15",
        receivedDate: "2026-08-15",
        supplierName: "บริษัท เครื่องดื่มสยามอินเตอร์ จำกัด (Supplier A)",
        leadTimeDays: 5,
        seasonalityMultiplier: 1.25,
        targetCoverageDays: 14,
        status: "Received",
        note: "สั่งเติมสต็อกประจำปักษ์",
        items: [
          { productId: p1, productName: state.products[0]?.product_name || "น้ำดื่มบริสุทธิ์ (ขวด)", productCode: "P001", unit: "ขวด", qty: 150, unitCost: 8, lineTotal: 1200, dailyVelocity: 9.8, rop: 61 }
        ],
        totalUnits: 150,
        totalAmount: 1200
      },
      {
        id: "po-seed-5",
        poNo: "PO-20260828-005",
        createdAt: "2026-08-28T16:00:00.000Z",
        orderDate: "2026-08-28",
        expectedDeliveryDate: "2026-09-03",
        receivedDate: "2026-09-03",
        supplierName: "ศูนย์กระจายสินค้าสแน็คไทย จำกัด (Supplier B)",
        leadTimeDays: 6,
        seasonalityMultiplier: 1.5,
        targetCoverageDays: 14,
        status: "Received",
        note: "เตรียมตัวรับมหกรรม Fair Weekend ใหญ่",
        items: [
          { productId: p2, productName: state.products[1]?.product_name || "ขนมทานเล่น", productCode: "P002", unit: "ชิ้น", qty: 100, unitCost: 20, lineTotal: 2000, dailyVelocity: 6.8, rop: 51 },
          { productId: p3, productName: state.products[2]?.product_name || "กาแฟพร้อมดื่ม", productCode: "P003", unit: "กระป๋อง", qty: 50, unitCost: 30, lineTotal: 1500, dailyVelocity: 3.5, rop: 26 }
        ],
        totalUnits: 150,
        totalAmount: 3500
      },
      {
        id: "po-seed-6",
        poNo: "PO-20260912-006",
        createdAt: "2026-09-12T09:30:00.000Z",
        orderDate: "2026-09-12",
        expectedDeliveryDate: "2026-09-17",
        receivedDate: "2026-09-17",
        supplierName: "บริษัท เครื่องดื่มสยามอินเตอร์ จำกัด (Supplier A)",
        leadTimeDays: 5,
        seasonalityMultiplier: 1.25,
        targetCoverageDays: 14,
        status: "Received",
        note: "รอบสั่งซื้อเติมปกติประจำเดือน",
        items: [
          { productId: p1, productName: state.products[0]?.product_name || "น้ำดื่มบริสุทธิ์ (ขวด)", productCode: "P001", unit: "ขวด", qty: 160, unitCost: 8, lineTotal: 1280, dailyVelocity: 10.5, rop: 65 }
        ],
        totalUnits: 160,
        totalAmount: 1280
      },
      {
        id: "po-seed-7",
        poNo: "PO-20260922-007",
        createdAt: "2026-09-22T13:00:00.000Z",
        orderDate: "2026-09-22",
        expectedDeliveryDate: "2026-09-27",
        receivedDate: null,
        supplierName: "ศูนย์กระจายสินค้าสแน็คไทย จำกัด (Supplier B)",
        leadTimeDays: 5,
        seasonalityMultiplier: 1.25,
        targetCoverageDays: 14,
        status: "Ordered",
        note: "สั่งเติมสต็อกแล้ว กำลังจัดส่ง",
        items: [
          { productId: p2, productName: state.products[1]?.product_name || "ขนมทานเล่น", productCode: "P002", unit: "ชิ้น", qty: 120, unitCost: 20, lineTotal: 2400, dailyVelocity: 7.0, rop: 44 },
          { productId: p3, productName: state.products[2]?.product_name || "กาแฟพร้อมดื่ม", productCode: "P003", unit: "กระป๋อง", qty: 60, unitCost: 30, lineTotal: 1800, dailyVelocity: 4.0, rop: 25 }
        ],
        totalUnits: 180,
        totalAmount: 4200
      }
    ];
    saveLocalState();
  }
}

// After an online refresh, bills still waiting in the offline queue are not in
// Supabase yet. Overlay them so stock levels and today's totals stay correct
// and the cashier cannot oversell items that were already sold offline.
async function mergePendingOfflineSalesIntoState(){
  try {
    if (!window.EaOfflineSync?.getPendingSales) return;
    const pending = await window.EaOfflineSync.getPendingSales();
    if (!pending.length) return;
    const knownIds = new Set((state.sales || []).map(s => s.id));
    for (const rec of pending) {
      if (knownIds.has(rec.id)) continue;
      const created = rec.created_at || new Date().toISOString();
      const d = new Date(created);
      const saleDate = rec.sale_date || `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const saleTime = rec.sale_time || d.toTimeString().slice(0,8);
      state.sales.unshift({
        id: rec.id,
        sale_no: rec.saleNo || rec.id,
        terminal_code: rec.terminal || state.terminal,
        sale_date: saleDate,
        sale_time: saleTime,
        total_amount: Number(rec.total_amount || 0),
        discount_amount: Number(rec.bill_discount || 0),
        payment_method: rec.payment_method || "cash",
        received_amount: Number(rec.received_amount || 0),
        change_amount: Number(rec.change_amount || 0),
        note: rec.note || "",
        created_at: created,
        is_pending_sync: true
      });
      const details = (rec.item_details && rec.item_details.length) ? rec.item_details : (rec.items || []);
      details.forEach((it, idx) => {
        const prod = productById(it.product_id);
        const qty = Number(it.qty) || 0;
        const unitPrice = Number(it.unit_price) || 0;
        const origPrice = Number(it.original_price ?? unitPrice);
        if (prod) prod.stock_qty = Number(prod.stock_qty || 0) - qty;
        state.saleItems.unshift({
          id: `${rec.id}-item-${idx}`,
          sale_id: rec.id,
          product_id: it.product_id,
          product_name: it.product_name || prod?.product_name || "สินค้า",
          barcode: prod?.barcode || "",
          qty,
          unit_price: unitPrice,
          original_price: origPrice,
          discount_amount: Math.max(0, origPrice - unitPrice),
          discount_note: it.discount_note || "",
          price_note: it.price_note || "",
          weights: Array.isArray(it.weights) && it.weights.length ? it.weights : null,
          is_discounted: origPrice > unitPrice,
          line_total: qty * unitPrice,
          created_at: created
        });
      });
    }
    saveLocalState();
  } catch (e) {
    console.warn("Could not merge pending offline sales:", e);
  }
}

async function loadAll(){
  if(!sb){
    state.isOffline = true;
    loadFromLocalStorageFallback();
    render();
    return;
  }
  state.loading=true;
  el("content").innerHTML=`<div class="card"><div class="empty">กำลังโหลดข้อมูล...</div></div>`;
  try {
    const [p,s,i,m,g]=await Promise.all([
      sb.from("ea_products").select("*").eq("is_active",true).order("product_name"),
      sb.from("ea_sales").select("*").order("created_at",{ascending:false}).limit(500),
      sb.from("ea_sale_items").select("*").order("created_at",{ascending:false}).limit(1200),
      sb.from("ea_stock_movements").select("*").order("created_at",{ascending:false}).limit(600),
      sb.from("ea_settings").select("*")
    ]);
    const err=[p.error,s.error,i.error,m.error,g.error].find(Boolean);
    if(err){
      console.warn("Supabase connection offline or unreachable:", err.message || err);
      throw err;
    }
    state.isOffline=false;
    state.products=p.data||[];state.sales=s.data||[];state.saleItems=i.data||[];state.movements=m.data||[];
    
    for(const r of g.data||[]){
      if(r.setting_key==="shop_name")state.settings.shopName=r.setting_value||"EA Fair Sale";
      if(r.setting_key==="shop_branch")state.settings.shopBranch=r.setting_value||"";
      if(r.setting_key==="shop_address")state.settings.shopAddress=r.setting_value||"";
      if(r.setting_key==="shop_phone")state.settings.shopPhone=r.setting_value||"";
      if(r.setting_key==="prompt_pay_id")state.settings.promptPayId=r.setting_value||"";
      if(r.setting_key==="shop_tax_id")state.settings.shopTaxId=r.setting_value||"";
      if(r.setting_key==="shop_line")state.settings.shopLine=r.setting_value||"";
      if(r.setting_key==="receipt_footer_note")state.settings.receiptFooterNote=r.setting_value||"";
      if(r.setting_key==="enable_vat")state.settings.enableVat=r.setting_value==="true";
      if(r.setting_key==="vat_rate")state.settings.vatRate=Number(r.setting_value||7);
      if(r.setting_key==="daily_target")state.settings.target=Number(r.setting_value||5000);
      if(r.setting_key==="low_stock_default")state.settings.lowStockDefault=Number(r.setting_value||5);
      if(r.setting_key==="theme")state.settings.theme=r.setting_value||"ocean";
      if(r.setting_key==="color_mode")state.settings.colorMode=r.setting_value||"dark";
    }
    applyTheme(state.settings?.theme || "ocean", state.settings?.colorMode || "dark");

    saveLocalState();
    state.cart=state.cart.map(c=>{const pr=productById(c.product_id);return pr?{...c,name:pr.product_name,barcode:pr.barcode,stock:Number(pr.stock_qty)}:null}).filter(Boolean);saveCartLocal();
    state.loading=false;
    await mergePendingOfflineSalesIntoState();
    render();
    checkAndNotifyLowStock();
  } catch (ex) {
    console.warn("Using local offline mode.");
    state.loading=false;
    state.isOffline=true;
    loadFromLocalStorageFallback();
    render();
    checkAndNotifyLowStock();
    toast("⚡ โหมดออฟไลน์ — กำลังใช้ข้อมูลสำรองในเครื่อง");
  }
}


function getTodayItemStats(){
  const salesToday = todaySales();
  const saleIds = new Set(salesToday.map(s=>s.id));
  const stats = {};

  for(const item of state.saleItems){
    if(!saleIds.has(item.sale_id)) continue;

    const key = item.product_id || item.product_name;
    if(!stats[key]){
      stats[key] = {
        product_id:item.product_id,
        product_name:item.product_name || "ไม่ระบุ",
        qty:0,
        revenue:0
      };
    }

    stats[key].qty += Number(item.qty || 0);
    stats[key].revenue += Number(item.line_total || 0);
  }

  return Object.values(stats);
}

function getHourlySales(){
  const buckets = {};
  for(let h=8; h<=20; h++) {
    buckets[h] = { hour: h, total: 0, bills: 0, units: 0 };
  }

  const todaySalesList = todaySales();
  const todaySaleIds = new Set(todaySalesList.map(s=>s.id));
  const saleHourMap = new Map();

  for(const sale of todaySalesList){
    const h = Number(String(sale.sale_time || "00:00").slice(0,2));
    if(Number.isFinite(h) && h in buckets){
      buckets[h].total += Number(sale.total_amount || 0);
      buckets[h].bills += 1;
      saleHourMap.set(sale.id, h);
    }
  }

  for(const item of state.saleItems){
    if(todaySaleIds.has(item.sale_id)){
      const h = saleHourMap.get(item.sale_id);
      if(h !== undefined && buckets[h]){
        buckets[h].units += Number(item.qty || 0);
      }
    }
  }

  return Object.values(buckets).sort((a,b)=>a.hour-b.hour);
}

function getCurrentWeekSales(){
  const days = [];
  const now = new Date();
  
  // Calculate Monday of current week (ISO week: Monday = 1 ... Sunday = 7)
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์", "อาทิตย์"];
  const dayShortNames = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

  for(let i = 0; i < 7; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const isToday = iso === todayISO();
    const isFuture = d > now && !isToday;

    days.push({
      date: iso,
      dayIndex: i,
      dayName: dayNames[i],
      shortName: dayShortNames[i],
      label: d.toLocaleDateString("th-TH", { day: 'numeric', month: 'short' }),
      fullDateText: `วัน${dayNames[i]}ที่ ${d.toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}`,
      isToday: isToday,
      isFuture: isFuture,
      total: 0,
      bills: 0,
      units: 0,
      cashTotal: 0,
      qrTotal: 0,
      topProduct: null
    });
  }

  const dayMap = new Map(days.map(d => [d.date, d]));
  const saleItemMap = new Map();
  for(const item of (state.saleItems || [])){
    if(!saleItemMap.has(item.sale_id)) saleItemMap.set(item.sale_id, []);
    saleItemMap.get(item.sale_id).push(item);
  }

  const productDaySales = {}; // date -> { prodId -> { name, qty, rev } }

  for(const s of (state.sales || [])){
    if(s.sale_date && dayMap.has(s.sale_date)){
      const entry = dayMap.get(s.sale_date);
      const amt = Number(s.total_amount || 0);
      entry.total += amt;
      entry.bills += 1;
      if(s.payment_method === "cash") entry.cashTotal += amt;
      else entry.qrTotal += amt;

      if(!productDaySales[s.sale_date]) productDaySales[s.sale_date] = {};
      const items = saleItemMap.get(s.id) || [];
      for(const it of items){
        entry.units += Number(it.qty || 0);
        const pid = it.product_id || it.product_name;
        if(!productDaySales[s.sale_date][pid]){
          productDaySales[s.sale_date][pid] = { name: it.product_name || "สินค้า", qty: 0, rev: 0 };
        }
        productDaySales[s.sale_date][pid].qty += Number(it.qty || 0);
        productDaySales[s.sale_date][pid].rev += Number(it.line_total || 0);
      }
    }
  }

  for(const d of days){
    const prods = productDaySales[d.date];
    if(prods){
      const top = Object.values(prods).sort((a, b) => b.rev - a.rev)[0];
      if(top) d.topProduct = top;
    }
  }

  return days;
}

function getLast7DaysSales(){
  const days = [];
  const now = new Date();
  
  for(let i = 6; i >= 0; i--){
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("th-TH", { weekday: 'short' });
    const formattedDate = d.toLocaleDateString("th-TH", { day: 'numeric', month: 'short' });
    days.push({
      date: iso,
      dayIndex: 6 - i,
      label: formattedDate,
      dayName: dayName,
      shortName: dayName,
      fullDateText: d.toLocaleDateString("th-TH", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      isToday: i === 0,
      isFuture: false,
      total: 0,
      bills: 0,
      units: 0,
      cashTotal: 0,
      qrTotal: 0,
      topProduct: null
    });
  }

  const dayMap = new Map(days.map(d => [d.date, d]));
  const saleItemMap = new Map();
  for(const item of (state.saleItems || [])){
    if(!saleItemMap.has(item.sale_id)) saleItemMap.set(item.sale_id, []);
    saleItemMap.get(item.sale_id).push(item);
  }

  const productDaySales = {};

  for(const s of (state.sales || [])){
    if(s.sale_date && dayMap.has(s.sale_date)){
      const entry = dayMap.get(s.sale_date);
      const amt = Number(s.total_amount || 0);
      entry.total += amt;
      entry.bills += 1;
      if(s.payment_method === "cash") entry.cashTotal += amt;
      else entry.qrTotal += amt;

      if(!productDaySales[s.sale_date]) productDaySales[s.sale_date] = {};
      const items = saleItemMap.get(s.id) || [];
      for(const it of items){
        entry.units += Number(it.qty || 0);
        const pid = it.product_id || it.product_name;
        if(!productDaySales[s.sale_date][pid]){
          productDaySales[s.sale_date][pid] = { name: it.product_name || "สินค้า", qty: 0, rev: 0 };
        }
        productDaySales[s.sale_date][pid].qty += Number(it.qty || 0);
        productDaySales[s.sale_date][pid].rev += Number(it.line_total || 0);
      }
    }
  }

  for(const d of days){
    const prods = productDaySales[d.date];
    if(prods){
      const top = Object.values(prods).sort((a, b) => b.rev - a.rev)[0];
      if(top) d.topProduct = top;
    }
  }

  return days;
}

let chartResizeObserver = null;

function setDashboardChartMode(mode){
  state.dashboardChartMode = mode;
  state.selectedChartPoint = null;
  
  const btns = document.querySelectorAll(".chart-mode-btn");
  btns.forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  
  const hint = el("chartScrollHint");
  if(hint){
    hint.style.display = mode === "hourly" ? "inline-flex" : "none";
  }
  
  renderInteractiveD3Chart("interactiveChartContainer");
}

function handleChartPointClick(point, mode, element){
  state.selectedChartPoint = point;
  const isDaily = state.dashboardChartMode !== "hourly";
  const data = state.dashboardChartMode === "week" 
    ? getCurrentWeekSales() 
    : (state.dashboardChartMode === "7days" ? getLast7DaysSales() : getHourlySales());
  
  const maxVal = (typeof d3 !== "undefined" ? d3.max(data, d => d.total) : 0) || 1;
  const activeDays = data.filter(d => d.total > 0);
  const avgVal = activeDays.length > 0 ? (activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length) : 0;
  
  if(typeof d3 !== "undefined"){
    // Reset all highlights
    d3.selectAll(".d3-col-pillar")
      .attr("fill", "transparent")
      .attr("stroke", "transparent");
    d3.selectAll(".d3-bar-rect")
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 1)
      .attr("filter", null);
    d3.selectAll(".d3-guide-line")
      .attr("opacity", 0);

    if(element){
      const elSel = d3.select(element);
      elSel.select(".d3-col-pillar")
        .attr("fill", "rgba(56, 189, 248, 0.12)")
        .attr("stroke", "rgba(56, 189, 248, 0.35)");
      elSel.select(".d3-bar-rect")
        .attr("stroke", point.total === maxVal && maxVal > 0 ? "#fbbf24" : "#38bdf8")
        .attr("stroke-width", 2.5)
        .attr("filter", point.total === maxVal && maxVal > 0 ? "url(#d3GlowPeak)" : "url(#d3Glow)");
      elSel.select(".d3-guide-line")
        .attr("opacity", 1);
    }
  }

  updateChartDetailBanner(point, isDaily, maxVal, avgVal);
}

function updateChartDetailBanner(point, isDaily, maxVal, avgVal){
  const banner = el("chartDetailBanner");
  if(!banner || !point) return;

  const pctOfPeak = maxVal > 0 ? Math.round((point.total / maxVal) * 100) : 0;
  const avgPerBill = point.bills > 0 ? point.total / point.bills : 0;
  const isPeak = point.total === maxVal && maxVal > 0;
  const isAboveAvg = avgVal > 0 && point.total > avgVal;
  const diffFromAvgPct = avgVal > 0 && point.total > 0 ? Math.round(((point.total - avgVal) / avgVal) * 100) : 0;

  let title = "";
  let sub = "";
  let badgeHtml = "";

  if(isDaily){
    title = point.fullDateText || point.label;
    sub = point.isToday ? "วันนี้ (Today)" : (point.isFuture ? "วันข้างหน้า" : "ข้อมูลย้อนหลัง");
    
    if(isPeak){
      badgeHtml += `<span class="chart-tag peak">👑 ยอดสูงสุดประจำสัปดาห์ (Peak)</span> `;
    }
    if(point.isToday){
      badgeHtml += `<span class="chart-tag today">🟢 วันนี้</span> `;
    }
    if(isAboveAvg && !isPeak){
      badgeHtml += `<span class="chart-tag" style="background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid rgba(56,189,248,0.4);">⚡ +${diffFromAvgPct}% เหนือค่าเฉลี่ย</span> `;
    }
  } else {
    const h = String(point.hour).padStart(2, "0");
    const nextH = String((point.hour + 1) % 24).padStart(2, "0");
    title = `ช่วงเวลา ${h}:00 - ${nextH}:00 น.`;
    sub = "ข้อมูลยอดขายวันนี้";
    if(isPeak){
      badgeHtml = `<span class="chart-tag peak">🔥 ช่วงเวลาขายดีที่สุด</span>`;
    }
  }

  const cashAmount = point.cashTotal || 0;
  const qrAmount = point.qrTotal || 0;
  const topProdName = point.topProduct ? `${escapeHtml(point.topProduct.name)} (${point.topProduct.qty} ชิ้น)` : "ไม่มีรายการขาย";

  banner.innerHTML = `
    <div class="chart-detail-card" style="${isPeak ? 'border-color: rgba(245, 158, 11, 0.45); background: linear-gradient(180deg, #1c261e 0%, #0f1824 100%);' : ''}">
      <div class="chart-detail-head">
        <div class="chart-detail-title-wrap">
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(sub)} ${badgeHtml}</small>
        </div>
        <div class="chart-detail-revenue">
          <span>ยอดขายสุทธิ</span>
          <strong style="${isPeak ? 'color:#fbbf24; text-shadow:0 0 16px rgba(251,191,36,0.5);' : ''}">฿${money(point.total)}</strong>
        </div>
      </div>
      <div class="chart-detail-metrics">
        <div class="chart-metric-item">
          <span class="m-label">🧾 จำนวนบิล</span>
          <span class="m-val">${point.bills || 0} บิล</span>
        </div>
        <div class="chart-metric-item">
          <span class="m-label">📦 สินค้าที่จำหน่าย</span>
          <span class="m-val">${point.units || 0} ชิ้น</span>
        </div>
        <div class="chart-metric-item">
          <span class="m-label">💵 เฉลี่ยต่อบิล</span>
          <span class="m-val">฿${money(avgPerBill)}</span>
        </div>
        <div class="chart-metric-item">
          <span class="m-label">📊 เทียบยอดสูงสุด (Peak)</span>
          <span class="m-val pct" style="${isPeak ? 'color:#fbbf24;' : ''}">${pctOfPeak}%</span>
        </div>
        <div class="chart-metric-item" style="grid-column: span 2;">
          <span class="m-label">💳 ช่องทางชำระเงิน</span>
          <span class="m-val" style="font-size:12px; font-weight:700;">เงินสด ฿${money(cashAmount)} · QR ฿${money(qrAmount)}</span>
        </div>
        <div class="chart-metric-item" style="grid-column: span 2;">
          <span class="m-label">🌟 สินค้าขายดีประจำวัน</span>
          <span class="m-val" style="font-size:12px; font-weight:700; color:#38bdf8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${topProdName}</span>
        </div>
      </div>
    </div>
  `;
}

function renderInteractiveD3Chart(containerId){
  const container = el(containerId);
  if(!container) return;

  if(typeof d3 === "undefined"){
    container.innerHTML = `<div class="empty">กำลังโหลดโมดูลกราฟ...</div>`;
    return;
  }

  const mode = state.dashboardChartMode || "week";
  const isDaily = mode !== "hourly";
  const isWeekMode = mode === "week";
  const data = isWeekMode 
    ? getCurrentWeekSales() 
    : (mode === "7days" ? getLast7DaysSales() : getHourlySales());

  const viewport = el("chartScrollViewport");
  const viewportWidth = (viewport ? viewport.clientWidth : container.clientWidth) || 540;
  
  const margin = { top: 38, right: isDaily ? 24 : 28, bottom: isDaily ? 52 : 40, left: isDaily ? 58 : 50 };
  
  const calculatedWidth = isDaily 
    ? Math.max(340, viewportWidth - margin.left - margin.right - 12)
    : Math.max(viewportWidth - margin.left - margin.right - 12, 13 * 56);

  const width = calculatedWidth;
  const height = 230 - margin.top - margin.bottom;

  // Calculate high performance metrics
  const maxVal = d3.max(data, d => d.total) || 0;
  const peakItem = data.find(d => d.total === maxVal && maxVal > 0);
  const totalRevenue = data.reduce((s, d) => s + d.total, 0);
  const totalBills = data.reduce((s, d) => s + d.bills, 0);
  const activeDays = data.filter(d => d.total > 0 && !d.isFuture);
  const avgDailyRevenue = activeDays.length > 0 ? (totalRevenue / activeDays.length) : (totalRevenue / (data.length || 7));
  const daysAboveAvg = data.filter(d => d.total > avgDailyRevenue && avgDailyRevenue > 0).length;

  const yMax = maxVal > 0 ? Math.max(maxVal * 1.3, avgDailyRevenue * 1.35) : 1000;

  // Render weekly summary ribbon before SVG
  let summaryHtml = "";
  if(isDaily){
    summaryHtml = `
      <div class="chart-summary-strip">
        <div class="chart-summary-chip highlight" title="วันที่มีรายได้สูงสุด">
          <span class="chip-label">👑 วันยอดขายสูงสุด (Peak)</span>
          <span class="chip-val" style="color:#fbbf24;">${peakItem ? (peakItem.dayName + " ฿" + money(peakItem.total)) : "ยังไม่มีข้อมูล"}</span>
          <span class="chip-sub">${peakItem ? (peakItem.label + " • " + peakItem.bills + " บิล") : "-"}</span>
        </div>
        <div class="chart-summary-chip" title="ยอดขายรวมทั้งช่วง">
          <span class="chip-label">💰 ยอดรวม${isWeekMode ? "สัปดาห์นี้" : "7 วัน"}</span>
          <span class="chip-val" style="color:#38bdf8;">฿${money(totalRevenue)}</span>
          <span class="chip-sub">${totalBills} บิลสำเร็จ</span>
        </div>
        <div class="chart-summary-chip" title="ยอดขายเฉลี่ยต่อวัน">
          <span class="chip-label">📊 เฉลี่ยต่อวัน</span>
          <span class="chip-val">฿${money(avgDailyRevenue)}</span>
          <span class="chip-sub">${activeDays.length} วันที่มีการขาย</span>
        </div>
        <div class="chart-summary-chip" title="จำนวนวันที่ยอดขายทะลุเกณฑ์เฉลี่ย">
          <span class="chip-label">⚡ วันที่เกินค่าเฉลี่ย</span>
          <span class="chip-val" style="color:#34d399;">${daysAboveAvg} <small style="font-size:11px; color:#94a3b8;">/ ${data.length} วัน</small></span>
          <span class="chip-sub">${daysAboveAvg > 0 ? "ผลงานยอดเยี่ยม" : "ตามมาตรฐาน"}</span>
        </div>
      </div>
      <div class="chart-legend-strip">
        <span class="chart-legend-item"><span class="chart-legend-color peak"></span> วันยอดสูงสุด (Peak)</span>
        <span class="chart-legend-item"><span class="chart-legend-color today"></span> วันนี้ (Today)</span>
        <span class="chart-legend-item"><span class="chart-legend-color standard"></span> ยอดขายทั่วไป</span>
        ${avgDailyRevenue > 0 ? `<span class="chart-legend-item"><span class="chart-legend-color avg"></span> เส้นค่าเฉลี่ยสัปดาห์</span>` : ''}
      </div>
    `;
  }

  container.style.width = `${width + margin.left + margin.right}px`;
  container.innerHTML = summaryHtml + `<div id="d3ChartSvgWrap" style="position:relative;"></div>`;

  const svgWrap = d3.select(container).select("#d3ChartSvgWrap");

  // Floating Tooltip
  let tooltip = d3.select(container).select(".d3-floating-tooltip");
  if(tooltip.empty()){
    tooltip = d3.select(container)
      .append("div")
      .attr("class", "d3-floating-tooltip");
  }

  const svg = svgWrap
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .style("overflow", "visible")
    .style("font-family", "inherit");

  const defs = svg.append("defs");

  // Cyan-Teal Bar Gradient
  const barGrad = defs.append("linearGradient")
    .attr("id", "d3BarGrad")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  barGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8");
  barGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0284c7");

  // Golden Peak Gradient for High-Performing Days
  const peakGrad = defs.append("linearGradient")
    .attr("id", "d3PeakGrad")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  peakGrad.append("stop").attr("offset", "0%").attr("stop-color", "#fde047");
  peakGrad.append("stop").attr("offset", "30%").attr("stop-color", "#fbbf24");
  peakGrad.append("stop").attr("offset", "100%").attr("stop-color", "#d97706");

  // Today / Emerald Highlight Gradient
  const todayGrad = defs.append("linearGradient")
    .attr("id", "d3TodayGrad")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  todayGrad.append("stop").attr("offset", "0%").attr("stop-color", "#34d399");
  todayGrad.append("stop").attr("offset", "100%").attr("stop-color", "#059669");

  // Glow Filter (Cyan)
  const filter = defs.append("filter")
    .attr("id", "d3Glow")
    .attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
  filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "blur");
  filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

  // Glow Filter (Golden for Peak)
  const peakFilter = defs.append("filter")
    .attr("id", "d3GlowPeak")
    .attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
  peakFilter.append("feGaussianBlur").attr("stdDeviation", "4.5").attr("result", "blur");
  peakFilter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleBand()
    .domain(data.map(d => isDaily ? d.date : d.hour))
    .range([0, width])
    .padding(isDaily ? 0.28 : 0.28);

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([height, 0]);

  // Horizontal Gridlines
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
      .ticks(4)
      .tickSize(-width)
      .tickFormat("")
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-dasharray", "4,4")
    );

  // Y Axis
  const yAxis = d3.axisLeft(y)
    .ticks(4)
    .tickFormat(d => d >= 1000 ? `฿${(d/1000).toFixed(d % 1000 === 0 ? 0 : 1)}k` : `฿${d}`);

  g.append("g")
    .attr("class", "y-axis")
    .call(yAxis)
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove())
    .call(g => g.selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "11.5px")
      .attr("font-weight", "700")
    );

  // X Axis
  const xAxis = d3.axisBottom(x)
    .tickFormat(val => {
      if(isDaily){
        const item = data.find(d => d.date === val);
        if(!item) return val;
        return isWeekMode ? item.shortName : (item.isToday ? "วันนี้" : item.dayName);
      } else {
        return `${String(val).padStart(2, "0")}:00`;
      }
    });

  const xAxisG = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .call(g => g.select(".domain").attr("stroke", "rgba(255,255,255,0.15)"))
    .call(g => g.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.15)"));

  xAxisG.selectAll(".tick text")
    .attr("fill", (d, i) => {
      const item = data[i];
      if(!item) return "#94a3b8";
      if(item.total === maxVal && maxVal > 0) return "#fbbf24";
      if(item.isToday) return "#34d399";
      if(item.isFuture) return "#64748b";
      return "#f1f5f9";
    })
    .attr("font-size", isDaily ? "12px" : "11px")
    .attr("font-weight", (d, i) => {
      const item = data[i];
      if(!item) return "700";
      return (item.total === maxVal && maxVal > 0) || item.isToday ? "900" : "700";
    })
    .attr("y", 10)
    .attr("dy", "0.25em");

  // Secondary sub-label on X axis for date (e.g. "20 ก.ย.") placed on a lower row
  if(isDaily){
    xAxisG.selectAll(".x-sublabel")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "x-sublabel")
      .attr("x", d => (x(d.date) || 0) + x.bandwidth() / 2)
      .attr("y", 28)
      .attr("dy", "0.25em")
      .attr("text-anchor", "middle")
      .attr("fill", d => d.isToday ? "#34d399" : "#94a3b8")
      .attr("font-size", "10.5px")
      .attr("font-weight", "600")
      .text(d => d.label);
  }

  // ==========================================
  // AVERAGE BENCHMARK LINE (เส้นค่าเฉลี่ยสัปดาห์)
  // ==========================================
  if(isDaily && avgDailyRevenue > 0){
    const avgY = y(avgDailyRevenue);
    
    // Dashed Reference Line
    g.append("line")
      .attr("class", "d3-avg-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", avgY)
      .attr("y2", avgY)
      .attr("stroke", "#a78bfa")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.75);

    // Benchmark Badge Label
    const avgBadgeG = g.append("g")
      .attr("transform", `translate(${width - 4}, ${avgY - 8})`);

    avgBadgeG.append("rect")
      .attr("x", -105)
      .attr("y", -7)
      .attr("width", 105)
      .attr("height", 16)
      .attr("rx", 4)
      .attr("fill", "rgba(167, 139, 250, 0.2)")
      .attr("stroke", "rgba(167, 139, 250, 0.45)")
      .attr("stroke-width", 1);

    avgBadgeG.append("text")
      .attr("x", -52)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#c4b5fd")
      .attr("font-size", "9.5px")
      .attr("font-weight", "800")
      .text(`เฉลี่ย ฿${money(Math.round(avgDailyRevenue))}/วัน`);
  }

  // ==========================================
  // BARS & INTERACTION
  // ==========================================
  const barGroups = g.selectAll(".d3-bar-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", d => `d3-bar-group ${d.total === maxVal && maxVal > 0 ? "is-peak" : ""}`)
    .attr("cursor", "pointer")
    .on("click", function(event, d){
      handleChartPointClick(d, mode, this);
    })
    .on("mouseenter", function(event, d){
      const isPeak = d.total === maxVal && maxVal > 0;
      
      d3.select(this).select(".d3-bar-rect")
        .transition().duration(150)
        .attr("stroke", isPeak ? "#fde047" : "#ffffff")
        .attr("stroke-width", 2)
        .attr("filter", isPeak ? "url(#d3GlowPeak)" : "url(#d3Glow)");

      // Tooltip HTML
      const diffAvg = avgDailyRevenue > 0 && d.total > 0 ? Math.round(((d.total - avgDailyRevenue) / avgDailyRevenue) * 100) : 0;
      let badgeTag = "";
      if(isPeak) badgeTag = `<span class="tt-badge" style="background:#f59e0b; color:#000;">👑 ยอดสูงสุด</span>`;
      else if(d.isToday) badgeTag = `<span class="tt-badge" style="background:#10b981; color:#fff;">🟢 วันนี้</span>`;
      else if(diffAvg > 0) badgeTag = `<span class="tt-badge" style="background:#0284c7; color:#fff;">+${diffAvg}% เหนือเฉลี่ย</span>`;

      tooltip.html(`
        <div class="tt-head">
          <span class="tt-title">${d.fullDateText || (d.dayName + " " + d.label)}</span>
          ${badgeTag}
        </div>
        <div class="tt-row" style="margin-bottom:4px;">
          <span>ยอดขายสุทธิ:</span>
          <strong class="tt-rev" style="${isPeak ? 'color:#fbbf24;' : ''}">฿${money(d.total)}</strong>
        </div>
        <div class="tt-row">
          <span>บิลขาย / สินค้า:</span>
          <strong>${d.bills || 0} บิล (${d.units || 0} ชิ้น)</strong>
        </div>
        ${d.topProduct ? `
          <div class="tt-row">
            <span>สินค้าขายดี:</span>
            <strong style="color:#38bdf8;">${escapeHtml(d.topProduct.name)}</strong>
          </div>
        ` : ''}
      `);

      const key = isDaily ? d.date : d.hour;
      const xPos = (x(key) || 0) + x.bandwidth() / 2 + margin.left;
      const yPos = y(d.total) + margin.top;

      tooltip
        .style("left", `${xPos}px`)
        .style("top", `${yPos}px`)
        .classed("visible", true);
    })
    .on("mouseleave", function(event, d){
      const isSelected = state.selectedChartPoint && (
        (isDaily && state.selectedChartPoint.date === d.date) ||
        (!isDaily && state.selectedChartPoint.hour === d.hour)
      );

      if(!isSelected){
        const isPeak = d.total === maxVal && maxVal > 0;
        d3.select(this).select(".d3-bar-rect")
          .transition().duration(200)
          .attr("stroke", isPeak ? "rgba(251, 191, 36, 0.45)" : "rgba(255,255,255,0.18)")
          .attr("stroke-width", isPeak ? 1.5 : 1)
          .attr("filter", isPeak ? "url(#d3GlowPeak)" : null);
      }

      tooltip.classed("visible", false);
    });

  // Background Column Track / Pillar
  barGroups.append("rect")
    .attr("class", "d3-bar-track")
    .attr("x", d => x(isDaily ? d.date : d.hour) || 0)
    .attr("y", 0)
    .attr("width", x.bandwidth())
    .attr("height", height)
    .attr("rx", 6)
    .attr("fill", d => (state.selectedChartPoint && (isDaily ? state.selectedChartPoint.date === d.date : state.selectedChartPoint.hour === d.hour)) 
      ? "rgba(56, 189, 248, 0.12)" 
      : (d.isFuture ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.035)"))
    .attr("stroke", d => (state.selectedChartPoint && (isDaily ? state.selectedChartPoint.date === d.date : state.selectedChartPoint.hour === d.hour))
      ? "rgba(56, 189, 248, 0.35)"
      : "transparent");

  // Bar Rects with Sales
  barGroups.filter(d => d.total > 0)
    .append("rect")
    .attr("class", "d3-bar-rect")
    .attr("x", d => x(isDaily ? d.date : d.hour) || 0)
    .attr("y", height)
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("rx", Math.min(6, x.bandwidth() / 3))
    .attr("fill", d => {
      if(d.total === maxVal && maxVal > 0) return "url(#d3PeakGrad)";
      if(d.isToday) return "url(#d3TodayGrad)";
      return "url(#d3BarGrad)";
    })
    .attr("stroke", d => (d.total === maxVal && maxVal > 0) ? "rgba(251, 191, 36, 0.5)" : "rgba(255,255,255,0.18)")
    .attr("stroke-width", d => (d.total === maxVal && maxVal > 0) ? 1.5 : 1)
    .attr("filter", d => (d.total === maxVal && maxVal > 0) ? "url(#d3GlowPeak)" : null)
    .transition()
    .duration(700)
    .delay((d, i) => i * 40)
    .ease(d3.easeCubicOut)
    .attr("y", d => y(d.total))
    .attr("height", d => Math.max(4, height - y(d.total)));

  // Peak Crown Badge on Highest Bar (High-Performing Day Identifier)
  barGroups.filter(d => d.total === maxVal && maxVal > 0)
    .append("text")
    .attr("class", "d3-peak-badge")
    .attr("x", d => (x(isDaily ? d.date : d.hour) || 0) + x.bandwidth() / 2)
    .attr("y", d => y(d.total) - 26)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .text("👑")
    .style("opacity", 0)
    .transition()
    .duration(500)
    .delay((d, i) => 300 + i * 40)
    .style("opacity", 1);

  // Value Labels on Top of Bars
  barGroups.filter(d => d.total > 0)
    .append("text")
    .attr("class", "d3-bar-val")
    .attr("x", d => (x(isDaily ? d.date : d.hour) || 0) + x.bandwidth() / 2)
    .attr("y", d => y(d.total) - 9)
    .attr("text-anchor", "middle")
    .attr("fill", d => (d.total === maxVal && maxVal > 0) ? "#fde047" : (d.isToday ? "#34d399" : "#ffffff"))
    .attr("font-size", "12px")
    .attr("font-weight", "800")
    .style("text-shadow", "0 2px 8px rgba(0,0,0,0.95), 0 0 4px rgba(15,23,42,0.9)")
    .style("opacity", 0)
    .text(d => d.total >= 1000 ? `฿${(d.total/1000).toFixed(1)}k` : `฿${money(d.total)}`)
    .transition()
    .duration(500)
    .delay((d, i) => 250 + i * 35)
    .style("opacity", 1);

  // Auto-select initial active day
  if(!state.selectedChartPoint){
    const defaultPoint = isDaily
      ? (data.find(d => d.isToday) || peakItem || data[data.length - 1])
      : (data.find(d => d.total === maxVal && maxVal > 0) || data[data.length - 1]);
    updateChartDetailBanner(defaultPoint, isDaily, maxVal, avgDailyRevenue);
  } else {
    updateChartDetailBanner(state.selectedChartPoint, isDaily, maxVal, avgDailyRevenue);
  }

  // Auto-scroll to current hour in hourly mode
  if(!isDaily && viewport){
    setTimeout(() => {
      const nowHour = new Date().getHours();
      const targetHour = (nowHour >= 8 && nowHour <= 20) ? nowHour : (state.selectedChartPoint ? state.selectedChartPoint.hour : 12);
      const targetX = x(targetHour);
      if(targetX !== undefined){
        const scrollPos = Math.max(0, targetX + margin.left - viewport.clientWidth / 2 + x.bandwidth() / 2);
        viewport.scrollTo({ left: scrollPos, behavior: "smooth" });
      }
    }, 120);
  }
}

function mountInteractiveD3Chart(containerId){
  renderInteractiveD3Chart(containerId);
  const viewport = el("chartScrollViewport") || el(containerId);
  if(!viewport) return;

  if(chartResizeObserver){
    chartResizeObserver.disconnect();
  }

  let resizeTimer = null;
  chartResizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderInteractiveD3Chart(containerId);
    }, 150);
  });
  chartResizeObserver.observe(viewport);
}

function buildReorderRecommendations(){
  const todayStats = getTodayItemStats();
  const soldMap = new Map(todayStats.map(x=>[x.product_id, x.qty]));

  return state.products
    .map(p=>{
      const stock = Number(p.stock_qty || 0);
      const min = Number(p.min_stock || 0);
      const sold = Number(soldMap.get(p.id) || 0);

      // คะแนนแนวโน้ม: ของต่ำกว่ากำหนด + ขายเร็วในวันนี้
      const lowRatio = min > 0 ? Math.max(0, (min - stock) / min) : 0;
      const velocity = sold / Math.max(stock, 1);
      const score = lowRatio * 2 + velocity;

      const targetStock = Math.max(min * 2, sold * 2);
      const suggested = Math.max(0, Math.ceil(targetStock - stock));

      let level = "ปกติ";
      let className = "ok";

      if(stock <= 0 || score >= 2){
        level = "ควรสั่งด่วน";
        className = "out";
      }else if(stock <= min || score >= 0.8){
        level = "ควรสั่งเพิ่ม";
        className = "low";
      }else if(sold > 0 && stock <= min * 1.5){
        level = "เฝ้าระวัง";
        className = "sale";
      }

      return {
        ...p,
        soldToday:sold,
        score,
        suggested,
        level,
        className
      };
    })
    .filter(x=>x.level !== "ปกติ")
    .sort((a,b)=>b.score-a.score)
    .slice(0,8);
}

function setCriticalCategoryFilter(cat){
  state.criticalCategoryFilter = cat;
  if(state.page === "home") renderHome();
  else if(state.page === "lowStock") renderLowStock();
  else render();
}

function setCriticalSort(mode){
  state.criticalSort = mode;
  if(state.page === "home") renderHome();
  else render();
}

function calculate30DaySalesVelocity(productId, currentStock){
  const now = new Date();
  const past30DaysDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const past30DaysISO = past30DaysDate.toISOString().slice(0, 10);

  const validSaleIds = new Set();
  for(const s of (state.sales || [])){
    const d = s.sale_date || (s.created_at ? s.created_at.slice(0, 10) : "");
    if(d && d >= past30DaysISO){
      validSaleIds.add(s.id);
    }
  }

  let totalSold30D = 0;
  for(const item of (state.saleItems || [])){
    if(item.product_id === productId && validSaleIds.has(item.sale_id)){
      totalSold30D += Number(item.qty || 0);
    }
  }

  // Fallback to stock movements if sales items are empty or recorded in movements
  if(totalSold30D === 0 && Array.isArray(state.movements)){
    for(const m of state.movements){
      if(m.product_id === productId && (m.movement_type === "sale" || m.movement_type === "out")){
        const md = m.movement_date || (m.created_at ? m.created_at.slice(0, 10) : "");
        if(md && md >= past30DaysISO){
          totalSold30D += Math.abs(Number(m.quantity || 0));
        }
      }
    }
  }

  const stock = Math.max(0, Number(currentStock || 0));
  const daysInWindow = 30;
  const dailyBurnRate = totalSold30D / daysInWindow;

  let daysUntilStockout;
  let priorityRank = 100;
  let badgeLabel = "";
  let badgeClass = "";
  let desc = "";

  if(stock <= 0){
    daysUntilStockout = 0;
    priorityRank = 0;
    badgeLabel = "🚨 หมดสต็อกแล้ว (0 วัน)";
    badgeClass = "burn-out";
    desc = "สินค้าหมดเกลี้ยงแล้ว ต้องสั่งซื้อและเติมสต็อกทันที";
  } else if(totalSold30D <= 0 || dailyBurnRate <= 0){
    daysUntilStockout = 9999;
    priorityRank = 90;
    badgeLabel = "⏳ ไม่มียอดขาย 30 วัน";
    badgeClass = "burn-none";
    desc = "ไม่มีประวัติการขายในรอบ 30 วัน อัตราการใช้น้อย";
  } else {
    daysUntilStockout = stock / dailyBurnRate;
    const roundedDays = Math.ceil(daysUntilStockout);

    if(roundedDays <= 1){
      priorityRank = 1;
      badgeLabel = "🔥 สต็อกหมดใน 1 วัน";
      badgeClass = "burn-critical";
      desc = `ด่วนวิกฤต! คาดว่าจะหมดใน 24 ชม. (ขายเฉลี่ย ${dailyBurnRate.toFixed(1)} ชิ้น/วัน)`;
    } else if(roundedDays <= 3){
      priorityRank = 2;
      badgeLabel = `🔥 สต็อกหมดใน ${roundedDays} วัน`;
      badgeClass = "burn-critical";
      desc = `วิกฤตสูง! สต็อกจะหมดในอีกไม่เกิน ${roundedDays} วัน (ขายเฉลี่ย ${dailyBurnRate.toFixed(1)} ชิ้น/วัน)`;
    } else if(roundedDays <= 7){
      priorityRank = 3;
      badgeLabel = `⚡ สต็อกหมดใน ${roundedDays} วัน`;
      badgeClass = "burn-high";
      desc = `ควรเติมสต็อกภายในสัปดาห์นี้ (ขายเฉลี่ย ${dailyBurnRate.toFixed(1)} ชิ้น/วัน)`;
    } else if(roundedDays <= 14){
      priorityRank = 4;
      badgeLabel = `📆 สต็อกหมดใน ${roundedDays} วัน`;
      badgeClass = "burn-moderate";
      desc = `อัตราการขายปานกลาง มีสต็อกสำรองได้ ${roundedDays} วัน (ขายเฉลี่ย ${dailyBurnRate.toFixed(1)} ชิ้น/วัน)`;
    } else {
      priorityRank = 5;
      badgeLabel = `🛡️ สต็อกอยู่ได้ ${roundedDays} วัน`;
      badgeClass = "burn-stable";
      desc = `อัตราการขายคงที่ สต็อกยังพอใช้อีก ${roundedDays} วัน (ขายเฉลี่ย ${dailyBurnRate.toFixed(1)} ชิ้น/วัน)`;
    }
  }

  return {
    totalSold30D,
    dailyBurnRate,
    daysUntilStockout,
    roundedDays: daysUntilStockout < 9999 ? Math.ceil(daysUntilStockout) : null,
    priorityRank,
    badgeLabel,
    badgeClass,
    desc
  };
}

function renderCriticalLowStockCardsSection(){
  const rawCritical = state.products
    .filter(p => Number(p.stock_qty || 0) <= Number(p.min_stock || 0));

  if(rawCritical.length === 0){
    return `
      <section class="critical-stock-section card">
        <div class="critical-stock-head">
          <div class="critical-head-info">
            <div class="critical-icon-wrap" style="background:rgba(52,211,153,0.18); color:#34d399; border-color:rgba(52,211,153,0.3); animation:none;">✅</div>
            <div class="critical-head-titles">
              <h3>สินค้าใน Stock เหลือน้อย (Low Stock Items)</h3>
              <p>แสดงการแจ้งเตือนระดับ Stock สินค้าที่ต้องติดตามสั่งซื้อเพิ่มด่วน</p>
            </div>
          </div>
        </div>
        <div class="critical-empty-box">
          <div class="ok-icon">🎉</div>
          <strong>สินค้าทุกรายการอยู่ในระดับปลอดภัย</strong>
          <p>ไม่มีสินค้าที่มีจำนวนลดลงต่ำกว่าจุดแจ้งเตือนขั้นต่ำในขณะนี้</p>
        </div>
      </section>
    `;
  }

  const currentSort = state.criticalSort || "velocity";

  const criticalProducts = rawCritical.map(p => {
    const stock = Number(p.stock_qty || 0);
    const velocity = calculate30DaySalesVelocity(p.id, stock);
    return { ...p, velocity };
  });

  if (currentSort === "velocity") {
    criticalProducts.sort((a, b) => {
      if (a.velocity.priorityRank !== b.velocity.priorityRank) {
        return a.velocity.priorityRank - b.velocity.priorityRank;
      }
      if (a.velocity.daysUntilStockout !== b.velocity.daysUntilStockout) {
        return a.velocity.daysUntilStockout - b.velocity.daysUntilStockout;
      }
      return Number(a.stock_qty) - Number(b.stock_qty);
    });
  } else {
    criticalProducts.sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty));
  }

  const todayStats = getTodayItemStats();
  const soldTodayMap = new Map(todayStats.map(s => [s.product_id, s.qty]));

  const catCounts = {};
  criticalProducts.forEach(p => {
    const cat = p.category || "สินค้าทั่วไป";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(catCounts).sort();
  const selectedCat = state.criticalCategoryFilter || "all";

  const filterBarHtml = `
    <div class="critical-category-filter-bar">
      <div class="critical-filter-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        กรองหมวดหมู่:
      </div>
      <div class="critical-category-chips">
        <button type="button" class="critical-cat-chip ${selectedCat === 'all' ? 'active' : ''}" onclick="setCriticalCategoryFilter('all')">
          ทั้งหมด <span class="chip-count">${criticalProducts.length}</span>
        </button>
        ${categories.map(cat => `
          <button type="button" class="critical-cat-chip ${selectedCat === cat ? 'active' : ''}" onclick="setCriticalCategoryFilter('${escapeHtml(cat)}')">
            ${escapeHtml(cat)} <span class="chip-count">${catCounts[cat]}</span>
          </button>
        `).join('')}
      </div>
      <div class="critical-sort-control">
        <span>เรียงตาม:</span>
        <button type="button" class="critical-sort-btn ${currentSort === 'velocity' ? 'active' : ''}" onclick="setCriticalSort('velocity')" title="จัดลำดับความเร่งด่วนตามจำนวนวันที่ของจะหมดก่อน">
          ⚡ วันหมดสต็อก (Urgency)
        </button>
        <button type="button" class="critical-sort-btn ${currentSort === 'stock' ? 'active' : ''}" onclick="setCriticalSort('stock')" title="จัดลำดับตามจำนวนคงเหลือน้อยที่สุด">
          📦 จำนวนคงเหลือ
        </button>
      </div>
    </div>
  `;

  const filteredProducts = selectedCat === "all"
    ? criticalProducts
    : criticalProducts.filter(p => (p.category || "สินค้าทั่วไป") === selectedCat);

  const renderCard = (p, cardIdx = 0) => {
    const stock = Number(p.stock_qty || 0);
    const min = Number(p.min_stock || 0);
    const sold = Number(soldTodayMap.get(p.id) || 0);
    const vel = p.velocity;

    let statusClass = "warning-low";
    let badgeText = "🟡 เตือนขั้นต่ำ";
    let badgeClass = "warning";

    if(stock <= 0){
      statusClass = "out-of-stock";
      badgeText = "🔴 หมดสต็อก (0 ชิ้น)";
      badgeClass = "out";
    } else if(stock <= Math.ceil(min / 2)){
      statusClass = "severe-low";
      badgeText = "🟠 วิกฤตหนัก";
      badgeClass = "severe";
    }

    const pct = min > 0 ? Math.min(100, Math.max(0, Math.round((stock / min) * 100))) : 0;
    const suggestedQty = Math.max(10, (min * 2) - stock);
    const delaySec = (Math.min(cardIdx, 20) * 0.055).toFixed(3);

    return `
      <div class="critical-card ${statusClass}" style="--card-index: ${cardIdx}; animation-delay: ${delaySec}s;">
        <div>
          <div class="critical-card-top">
            <span class="critical-badge ${badgeClass}">${badgeText}</span>
            <span class="category-pill">${escapeHtml(p.category || 'สินค้าทั่วไป')}</span>
          </div>

          <h4 class="critical-product-title">${escapeHtml(p.product_name)}</h4>
          <div class="critical-product-code">
            รหัส: ${escapeHtml(p.product_code || '-')} • Barcode: ${escapeHtml(p.barcode || '-')}
          </div>

          <div class="stock-gauge-box">
            <div class="stock-gauge-labels">
              <span>คงเหลือ: <strong style="color:${stock <= 0 ? '#f87171' : (stock <= Math.ceil(min/2) ? '#fb923c' : '#facc15')}">${stock}</strong> ชิ้น</span>
              <span>ขั้นต่ำ: <strong>${min}</strong> ชิ้น</span>
            </div>
            <div class="stock-gauge-track">
              <div class="stock-gauge-fill" style="width: ${Math.max(6, pct)}%;"></div>
            </div>
          </div>

          <!-- Predictive Days Until Out of Stock Indicator -->
          <div class="stock-burn-prediction-box ${vel.badgeClass}">
            <div class="burn-pred-head">
              <div class="burn-pred-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>คาดการณ์สต็อกหมด:</span>
              </div>
              <span class="burn-days-badge ${vel.badgeClass}">${vel.badgeLabel}</span>
            </div>
            <div class="burn-pred-details">
              <span class="burn-rate-text">⚡ ยอดขาย 30 วัน: <strong>${vel.totalSold30D}</strong> ชิ้น (เฉลี่ย <strong>${vel.dailyBurnRate.toFixed(1)}</strong> ชิ้น/วัน)</span>
              <span class="burn-urgency-hint">${vel.desc}</span>
            </div>
          </div>

          <div class="critical-card-metrics">
            <div class="c-metric-item">
              <span class="lbl">ขายวันนี้</span>
              <span class="val">${sold} ชิ้น</span>
            </div>
            <div class="c-metric-item highlight">
              <span class="lbl">แนะนำเติมเพิ่ม</span>
              <span class="val">+${suggestedQty} ชิ้น</span>
            </div>
          </div>
        </div>

        <div class="critical-card-actions">
          <button type="button" class="btn-quick-refill" onclick="openQuickRefillModal('${p.id}', ${suggestedQty})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            + เติม Stock ด่วน
          </button>
          <button type="button" class="btn-card-more" onclick="quickReceive('${p.id}')" title="ไปยังหน้าเคลื่อนไหวสินค้า">
            จัดการ
          </button>
        </div>
      </div>
    `;
  };

  let gridContentHtml = "";
  if (selectedCat === "all" && categories.length > 1) {
    let globalCardIdx = 0;
    gridContentHtml = categories.map(cat => {
      const catProducts = criticalProducts.filter(p => (p.category || "สินค้าทั่วไป") === cat);
      return `
        <div class="critical-category-group">
          <div class="critical-group-header">
            <div class="critical-group-title">
              <span>📁</span> ${escapeHtml(cat)}
            </div>
            <span style="font-size: 11.5px; color: #94a3b8; font-weight: 600;">${catProducts.length} รายการเตือน</span>
          </div>
          <div class="critical-stock-grid">
            ${catProducts.map(p => renderCard(p, globalCardIdx++)).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    gridContentHtml = `
      <div class="critical-stock-grid">
        ${filteredProducts.map((p, idx) => renderCard(p, idx)).join('')}
      </div>
    `;
  }

  return `
    <section class="critical-stock-section card">
      <div class="critical-stock-head">
        <div class="critical-head-info">
          <div class="critical-icon-wrap">🚨</div>
          <div class="critical-head-titles">
            <h3>สินค้าใน Stock เหลือน้อย (Low Stock Items)</h3>
            <p>คาดการณ์วันสต็อกหมดล่วงหน้าตามอัตราการขาย 30 วันล่าสุด พร้อมปุ่มจัดลำดับความเร่งด่วนและเติมสต็อก</p>
          </div>
        </div>
        <div class="critical-head-actions">
          <span class="badge-critical-count">${criticalProducts.length} รายการวิกฤต</span>
          <button type="button" onclick="openLowStockPdfModal()" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;" title="เปิดหน้าต่างรายงานสรุปสินค้าสต็อกต่ำและออกไฟล์ PDF พร้อมคาดการณ์วันสต็อกหมด">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            🖨️ รายงาน PDF
          </button>
          <button type="button" class="btn-excel-export-critical" onclick="exportCriticalStockExcel()" title="ส่งออกรายงานสินค้าสต็อกต่ำเป็นไฟล์ Excel พร้อมข้อมูลคาดการณ์สต็อกหมด">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            ส่งออก Excel
          </button>
          <button class="btn btn-sm btn-light" onclick="go('lowStock')">ดูสินค้าใกล้หมดทั้งหมด →</button>
        </div>
      </div>

      ${filterBarHtml}

      ${gridContentHtml}
    </section>
  `;
}

function exportCriticalStockExcel(){
  const rawCritical = state.products
    .filter(p => Number(p.stock_qty || 0) <= Number(p.min_stock || 0));

  if (rawCritical.length === 0) {
    toast("ไม่มีสินค้าสต็อกต่ำกว่าเกณฑ์ในขณะนี้");
    return;
  }

  const criticalProducts = rawCritical.map(p => {
    const stock = Number(p.stock_qty || 0);
    const velocity = calculate30DaySalesVelocity(p.id, stock);
    return { ...p, velocity };
  });

  const currentSort = state.criticalSort || "velocity";
  if (currentSort === "velocity") {
    criticalProducts.sort((a, b) => {
      if (a.velocity.priorityRank !== b.velocity.priorityRank) {
        return a.velocity.priorityRank - b.velocity.priorityRank;
      }
      if (a.velocity.daysUntilStockout !== b.velocity.daysUntilStockout) {
        return a.velocity.daysUntilStockout - b.velocity.daysUntilStockout;
      }
      return Number(a.stock_qty) - Number(b.stock_qty);
    });
  } else {
    criticalProducts.sort((a, b) => Number(a.stock_qty || 0) - Number(b.stock_qty || 0));
  }

  const shopName = state.settings.shopName || "EA Fair Sale";
  const nowStr = new Date().toLocaleString("th-TH");

  const soldTodayMap = new Map();
  const salesToday = todaySales();
  const saleIds = new Set(salesToday.map(s => s.id));
  for (const item of state.saleItems) {
    if (saleIds.has(item.sale_id)) {
      soldTodayMap.set(item.product_id, (soldTodayMap.get(item.product_id) || 0) + Number(item.qty || 0));
    }
  }

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="12" class="title-banner">🚨 รายงานสินค้าสต็อกต่ำและคาดการณ์วันสต็อกหมด (PREDICTIVE LOW STOCK REORDER REPORT)</td>
      </tr>
      <tr>
        <td colspan="12" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; ⚠️ สินค้าวิกฤต: <b>${criticalProducts.length} รายการ</b> &nbsp;|&nbsp; ⏰ ส่งออกเมื่อ: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="12" height="12"></td></tr>

      <thead>
        <tr>
          <th class="th-col" style="width:45px;">ลำดับ</th>
          <th class="th-col" style="width:110px;">รหัสสินค้า</th>
          <th class="th-col" style="width:130px;">บาร์โค้ด</th>
          <th class="th-col" style="width:200px;">ชื่อสินค้า</th>
          <th class="th-col" style="width:120px;">หมวดหมู่</th>
          <th class="th-col-amber" style="width:100px;">คงเหลือ</th>
          <th class="th-col" style="width:90px;">เกณฑ์ขั้นต่ำ</th>
          <th class="th-col" style="width:90px;">ขายวันนี้</th>
          <th class="th-col" style="width:100px;">ขาย 30 วัน</th>
          <th class="th-col" style="width:110px;">เฉลี่ย/วัน</th>
          <th class="th-col-amber" style="width:160px;">คาดการณ์วันสต็อกหมด</th>
          <th class="th-col-green" style="width:110px;">แนะนำสั่งเพิ่ม</th>
        </tr>
      </thead>
      <tbody>
        ${criticalProducts.map((p, idx) => {
          const stock = Number(p.stock_qty || 0);
          const min = Number(p.min_stock || 0);
          const sold = Number(soldTodayMap.get(p.id) || 0);
          const suggested = Math.max(min * 2 - stock, min - stock + 5);
          const vel = p.velocity;
          const daysText = vel.badgeLabel;

          return `
            <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
              <td class="td-c">${idx + 1}</td>
              <td class="td-c">${escapeHtml(p.product_code || '-')}</td>
              <td class="td-c" style="mso-number-format:'\\@';">'${escapeHtml(p.barcode || '-')}</td>
              <td class="td-l" style="font-weight:bold;">${escapeHtml(p.product_name)}</td>
              <td class="td-l">${escapeHtml(p.category || 'สินค้าทั่วไป')}</td>
              <td class="td-r" style="font-weight:bold; color:${stock <= 0 ? '#dc2626' : '#d97706'};">${stock} ${escapeHtml(p.unit_name || 'ชิ้น')}</td>
              <td class="td-r">${min} ${escapeHtml(p.unit_name || 'ชิ้น')}</td>
              <td class="td-r">${sold} ${escapeHtml(p.unit_name || 'ชิ้น')}</td>
              <td class="td-r">${vel.totalSold30D} ${escapeHtml(p.unit_name || 'ชิ้น')}</td>
              <td class="td-r">${vel.dailyBurnRate.toFixed(1)} ${escapeHtml(p.unit_name || 'ชิ้น')}/วัน</td>
              <td class="td-c" style="font-weight:bold; color:${stock <= 0 ? '#dc2626' : vel.priorityRank <= 2 ? '#ea580c' : '#0369a1'};">${escapeHtml(daysText)}</td>
              <td class="td-r" style="font-weight:bold; color:#0284c7;">+${suggested} ${escapeHtml(p.unit_name || 'ชิ้น')}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  downloadExcel(`Predictive_LowStock_Report_${todayISO()}.xls`, bodyHtml, "Low Stock Report");
  toast("ส่งออกรายงานคาดการณ์สต็อกหมด Excel สำเร็จ 📊");
}

// -------------------------------------------------------------
// Low Stock Summary PDF Report Generator & Modal
// -------------------------------------------------------------

function buildLowStockSummaryData(categoryFilter = "all", sortMode = "velocity") {
  const raw = state.products.filter(p => Number(p.stock_qty || 0) <= Number(p.min_stock || 0));

  const items = raw.map(p => {
    const stock = Number(p.stock_qty || 0);
    const min = Number(p.min_stock || 0);
    const cost = Number(p.cost_price || p.sale_price || 0);
    const price = Number(p.sale_price || 0);
    const velocity = calculate30DaySalesVelocity(p.id, stock);
    const deficit = Math.max(0, min - stock);
    const suggestedQty = Math.max(min * 2 - stock, deficit, 5);
    const refillCost = suggestedQty * cost;

    return {
      id: p.id,
      name: p.product_name,
      code: p.product_code || "-",
      barcode: p.barcode || "-",
      category: p.category || "สินค้าทั่วไป",
      unit: p.unit_name || p.unit || "ชิ้น",
      stock,
      min,
      cost,
      price,
      deficit,
      suggestedQty,
      refillCost,
      velocity,
      daysUntilStockout: velocity.daysUntilStockout,
      daysLabel: velocity.badgeLabel,
      badgeClass: velocity.badgeClass,
      priorityRank: velocity.priorityRank,
      isOutOfStock: stock <= 0
    };
  });

  // Category filter
  let filtered = categoryFilter === "all" ? items : items.filter(it => it.category === categoryFilter);

  // Sorting
  if (sortMode === "velocity") {
    filtered.sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
      if (a.daysUntilStockout !== b.daysUntilStockout) return a.daysUntilStockout - b.daysUntilStockout;
      return a.stock - b.stock;
    });
  } else if (sortMode === "stock") {
    filtered.sort((a, b) => a.stock - b.stock);
  } else if (sortMode === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "th"));
  }

  const totalItems = filtered.length;
  const outOfStockCount = filtered.filter(it => it.isOutOfStock).length;
  const critical3DaysCount = filtered.filter(it => !it.isOutOfStock && it.priorityRank <= 2).length;
  const totalRefillUnits = filtered.reduce((sum, it) => sum + it.suggestedQty, 0);
  const totalRefillBudget = filtered.reduce((sum, it) => sum + it.refillCost, 0);

  const docNo = "LSS-" + todayISO().replace(/-/g, "") + "-" + (state.terminal || "POS01");
  const generatedDate = formatThaiDateStr(todayISO());
  const generatedTime = new Date().toTimeString().slice(0, 5);

  return {
    docNo,
    generatedDate,
    generatedTime,
    categoryFilter,
    sortMode,
    items: filtered,
    totalItems,
    outOfStockCount,
    critical3DaysCount,
    totalRefillUnits,
    totalRefillBudget
  };
}

function generateLowStockSummaryPDFHTML(data) {
  const shopName = state.settings?.shopName || "EA Fair Sale";
  const branchName = state.settings?.shopBranch || "";
  const address = state.settings?.shopAddress || "";
  const phone = state.settings?.shopPhone || "";
  const taxId = state.settings?.shopTaxId || "";

  const rowsHtml = data.items.map((it, idx) => {
    let daysBadgeBg = "#fef3c7";
    let daysBadgeColor = "#b45309";
    if (it.isOutOfStock) {
      daysBadgeBg = "#fee2e2";
      daysBadgeColor = "#b91c1c";
    } else if (it.priorityRank <= 2) {
      daysBadgeBg = "#ffedd5";
      daysBadgeColor = "#c2410c";
    } else if (it.priorityRank <= 3) {
      daysBadgeBg = "#fef9c3";
      daysBadgeColor = "#a16207";
    } else {
      daysBadgeBg = "#e0f2fe";
      daysBadgeColor = "#0369a1";
    }

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
        <td style="padding: 7px 5px; text-align: center; font-size: 11px; font-weight: bold; color: #475569;">${idx + 1}</td>
        <td style="padding: 7px 5px; font-size: 11px; font-family: monospace; color: #1e293b;">
          <b>${escapeHtml(it.code)}</b><br>
          <small style="color: #64748b;">${escapeHtml(it.barcode)}</small>
        </td>
        <td style="padding: 7px 5px; font-size: 12px; color: #0f172a;">
          <b style="font-size: 12.5px;">${escapeHtml(it.name)}</b>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">หมวดหมู่: ${escapeHtml(it.category)}</div>
        </td>
        <td style="padding: 7px 5px; text-align: center; font-size: 11.5px;">
          <strong style="color: ${it.isOutOfStock ? '#dc2626' : '#d97706'}; font-size: 13px;">${it.stock}</strong> / ${it.min} ${escapeHtml(it.unit)}
        </td>
        <td style="padding: 7px 5px; text-align: center; font-size: 11px; color: #334155;">
          <b>${it.velocity.totalSold30D}</b> ${escapeHtml(it.unit)}<br>
          <small style="color: #64748b;">(เฉลี่ย ${it.velocity.dailyBurnRate.toFixed(1)}/วัน)</small>
        </td>
        <td style="padding: 7px 5px; text-align: center; font-size: 11px;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: 800; background: ${daysBadgeBg}; color: ${daysBadgeColor}; font-size: 11px; white-space: nowrap;">
            ${escapeHtml(it.daysLabel)}
          </span>
        </td>
        <td style="padding: 7px 5px; text-align: center; font-size: 12px; font-weight: 800; color: #0284c7; background: #f0f9ff;">
          +${it.suggestedQty} ${escapeHtml(it.unit)}
        </td>
        <td style="padding: 7px 5px; text-align: right; font-size: 11.5px; color: #334155;">
          ฿${money(it.cost)}
        </td>
        <td style="padding: 7px 5px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">
          ฿${money(it.refillCost)}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>รายงานสรุปสินค้าสต็อกต่ำ & คาดการณ์วันสต็อกหมด - ${escapeHtml(data.docNo)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 8mm 10mm 8mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Sarabun", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11.5px;
          line-height: 1.4;
        }
        .pdf-report-wrap {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .pdf-hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #dc2626;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .shop-brand {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .shop-details {
          font-size: 11px;
          color: #475569;
          margin-top: 2px;
        }
        .doc-title-box {
          text-align: right;
        }
        .doc-title {
          font-size: 16px;
          font-weight: 900;
          color: #dc2626;
        }
        .doc-meta {
          font-size: 10.5px;
          color: #475569;
          margin-top: 3px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          background: #f8fafc;
        }
        .kpi-card.red {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .kpi-card.orange {
          background: #fff7ed;
          border-color: #ffedd5;
        }
        .kpi-card.blue {
          background: #f0f9ff;
          border-color: #bae6fd;
        }
        .kpi-lbl {
          font-size: 9.5px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
        }
        .kpi-val {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          padding: 7px 5px;
          font-size: 10.5px;
          font-weight: 800;
          text-align: left;
        }
        th.center { text-align: center; }
        th.right { text-align: right; }
        .summary-flex {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .note-box {
          max-width: 420px;
          font-size: 10.5px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
        }
        .total-box {
          width: 300px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          font-size: 11.5px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .total-row.highlight {
          font-size: 13px;
          font-weight: 900;
          color: #0284c7;
          background: #f0f9ff;
          border-bottom: none;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .sig-box {
          border: 1px dashed #94a3b8;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
          height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-line {
          border-bottom: 1px solid #334155;
          margin: 24px 8px 4px 8px;
        }
        .sig-role {
          font-size: 10.5px;
          font-weight: 700;
          color: #1e293b;
        }
        .footer-note {
          font-size: 9.5px;
          color: #94a3b8;
          text-align: center;
          margin-top: 14px;
          border-top: 1px solid #f1f5f9;
          padding-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="pdf-report-wrap">
        <div class="pdf-hdr">
          <div>
            <div class="shop-brand">🏪 ${escapeHtml(shopName)} ${branchName ? ' (' + escapeHtml(branchName) + ')' : ''}</div>
            <div class="shop-details">
              ${address ? escapeHtml(address) + '<br>' : ''}
              ${phone ? 'โทร: ' + escapeHtml(phone) + ' ' : ''} ${taxId ? '| เลขประจำตัวผู้เสียภาษี: ' + escapeHtml(taxId) : ''}
            </div>
          </div>
          <div class="doc-title-box">
            <div class="doc-title">🚨 รายงานสรุปสินค้าสต็อกต่ำ & คาดการณ์วันสต็อกหมด</div>
            <div class="doc-meta">
              <b>เลขที่เอกสาร:</b> ${escapeHtml(data.docNo)}<br>
              <b>วันที่พิมพ์:</b> ${escapeHtml(data.generatedDate)} ${escapeHtml(data.generatedTime)} น.<br>
              <b>จุดขาย:</b> ${escapeHtml(state.terminal || 'POS-01')}
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-lbl">สินค้าวิกฤตทั้งหมด</div>
            <div class="kpi-val">${data.totalItems} <span style="font-size:11px; font-weight:normal;">รายการ</span></div>
          </div>
          <div class="kpi-card red">
            <div class="kpi-lbl">หมดสต็อกแล้ว (0 วัน)</div>
            <div class="kpi-val" style="color:#dc2626;">${data.outOfStockCount} <span style="font-size:11px; font-weight:normal;">รายการ</span></div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-lbl">วิกฤต (หมดใน ≤3 วัน)</div>
            <div class="kpi-val" style="color:#ea580c;">${data.critical3DaysCount} <span style="font-size:11px; font-weight:normal;">รายการ</span></div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-lbl">งบประมาณสั่งเติมรวม</div>
            <div class="kpi-val" style="color:#0284c7;">฿${money(data.totalRefillBudget)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 28px;">#</th>
              <th style="width: 95px;">รหัส / บาร์โค้ด</th>
              <th>รายการสินค้า & หมวดหมู่</th>
              <th class="center" style="width: 85px;">คงเหลือ / ขั้นต่ำ</th>
              <th class="center" style="width: 100px;">ขาย 30 วัน (เฉลี่ย)</th>
              <th class="center" style="width: 120px;">คาดการณ์วันสต็อกหมด</th>
              <th class="center" style="width: 75px;">แนะนำสั่งเพิ่ม</th>
              <th class="right" style="width: 65px;">ราคาทุน</th>
              <th class="right" style="width: 80px;">งบสั่งเติม</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding:16px;">ไม่มีสินค้าสต็อกต่ำในขณะนี้</td></tr>'}
          </tbody>
        </table>

        <div class="summary-flex">
          <div class="note-box">
            <b>💡 หมายเหตุการคำนวณและบริหารคลัง:</b>
            <ul style="margin: 4px 0 0 14px; padding: 0;">
              <li>วันคาดการณ์สต็อกหมด คำนวณจากยอดขายเฉลี่ยรายวันในรอบ 30 วันล่าสุด (30-Day Sales Velocity)</li>
              <li>ปริมาณแนะนำสั่งซื้อคำนวณให้ครอบคลุม Safety Stock อย่างน้อย 2 เท่าของเกณฑ์ขั้นต่ำ</li>
              <li>โปรดตรวจนับสต็อกจริงก่อนกดยืนยันใบสั่งซื้อ (Purchase Order)</li>
            </ul>
          </div>
          <div class="total-box">
            <div class="summary-row">
              <span>รายการสินค้าวิกฤตรวม</span>
              <b>${data.totalItems} รายการ</b>
            </div>
            <div class="summary-row">
              <span>จำนวนชิ้นสั่งเติมรวม</span>
              <b>${data.totalRefillUnits} ชิ้น</b>
            </div>
            <div class="summary-row highlight">
              <span>ประมาณการงบสั่งเติมทั้งสิ้น</span>
              <span>฿${money(data.totalRefillBudget)}</span>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-role">ผู้จัดทำรายงาน / POS Operator</div>
            <div class="sig-line"></div>
            <div style="font-size:9.5px; color:#64748b;">วันที่ ..... / ..... / ..........</div>
          </div>
          <div class="sig-box">
            <div class="sig-role">ผู้ตรวจสอบสต็อก / Store Manager</div>
            <div class="sig-line"></div>
            <div style="font-size:9.5px; color:#64748b;">วันที่ ..... / ..... / ..........</div>
          </div>
          <div class="sig-box">
            <div class="sig-role">ผู้อนุมัติงบสั่งซื้อ / Purchasing Manager</div>
            <div class="sig-line"></div>
            <div style="font-size:9.5px; color:#64748b;">วันที่ ..... / ..... / ..........</div>
          </div>
        </div>

        <div class="footer-note">
          เอกสารรายงานอัตโนมัติจากระบบ EA Fair Sale - สร้างเมื่อ ${data.generatedDate} ${data.generatedTime} น. | POS Terminal: ${escapeHtml(state.terminal || 'POS-01')}
        </div>
      </div>
    </body>
    </html>
  `;
}

function printLowStockSummaryPDF(categoryFilter = "all", sortMode = "velocity") {
  const data = buildLowStockSummaryData(categoryFilter, sortMode);
  if (data.items.length === 0) {
    toast("ไม่มีสินค้าสต็อกต่ำสำหรับออกรายงาน PDF");
    return;
  }

  let iframe = el("lowStockPdfIframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "lowStockPdfIframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
  }

  const htmlStr = generateLowStockSummaryPDFHTML(data);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlStr);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      toast("🖨️ เปิดหน้าต่างสั่งพิมพ์ / เซฟเป็น PDF เรียบร้อย");
    } catch (ex) {
      console.warn("PDF print exception:", ex);
      toast("ไม่สามารถเรียกหน้าต่างสั่งพิมพ์ได้");
    }
  }, 350);
}

function copyLowStockSummaryText(categoryFilter = "all", sortMode = "velocity") {
  const data = buildLowStockSummaryData(categoryFilter, sortMode);
  if (data.items.length === 0) {
    toast("ไม่มีรายการสินค้าสต็อกต่ำ");
    return;
  }

  let text = `🚨 รายงานสรุปสินค้าสต็อกต่ำ & คาดการณ์วันสต็อกหมด (${data.docNo})\n`;
  text += `ร้านค้า: ${state.settings?.shopName || 'EA Fair Sale'}\n`;
  text += `วันที่: ${data.generatedDate} ${data.generatedTime} น. | จุดขาย: ${state.terminal || 'POS-01'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 สรุปภาพรวม:\n`;
  text += `• สินค้าวิกฤตทั้งหมด: ${data.totalItems} รายการ\n`;
  text += `• หมดสต็อกแล้ว (0 วัน): ${data.outOfStockCount} รายการ\n`;
  text += `• วิกฤตหนัก (หมดใน ≤3 วัน): ${data.critical3DaysCount} รายการ\n`;
  text += `• ปริมาณสั่งเติมรวม: ${data.totalRefillUnits} ชิ้น\n`;
  text += `• งบประมาณสั่งเติมประมาณการ: ฿${money(data.totalRefillBudget)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 รายการสินค้าและคาดการณ์วันหมดสต็อก:\n\n`;

  data.items.forEach((it, i) => {
    text += `${i + 1}. [${it.daysLabel}] ${it.name}\n`;
    text += `   - รหัส: ${it.code} | บาร์โค้ด: ${it.barcode}\n`;
    text += `   - คงเหลือ: ${it.stock} / ขั้นต่ำ: ${it.min} ${it.unit}\n`;
    text += `   - ขาย 30 วัน: ${it.velocity.totalSold30D} ${it.unit} (เฉลี่ย ${it.velocity.dailyBurnRate.toFixed(1)}/วัน)\n`;
    text += `   - แนะนำเติมเพิ่ม: +${it.suggestedQty} ${it.unit} (งบประมาณ ~฿${money(it.refillCost)})\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `โปรดตรวจสอบและอนุมัติสั่งซื้อในระบบ`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast("📋 คัดลอกข้อความสรุปเรียบร้อยแล้ว พร้อมแชร์ลง LINE");
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function openLowStockPdfModal(categoryFilter = "all", sortMode = "velocity") {
  const data = buildLowStockSummaryData(categoryFilter, sortMode);

  // Extract categories for filter
  const rawAll = state.products.filter(p => Number(p.stock_qty || 0) <= Number(p.min_stock || 0));
  const catSet = new Set(rawAll.map(p => p.category || "สินค้าทั่วไป"));
  const catList = Array.from(catSet).sort();

  el("modalTitle").textContent = "🚨 รายงานสรุปสินค้าสต็อกต่ำ & คาดการณ์วันสต็อกหมด (Low Stock Summary PDF)";

  el("modalBody").innerHTML = `
    <div style="margin-bottom: 14px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      รายงาน PDF แสดงรายการสินค้าที่สต็อกต่ำกว่าเกณฑ์ขั้นต่ำ พร้อม **ตัวเลขคาดการณ์วันหมดสต็อก (Days-to-Out-of-Stock Estimates)** คำนวณจากยอดขาย 30 วันล่าสุด สำหรับพิมพ์หรือบันทึกเป็น PDF เพื่อส่งฝ่ายจัดซื้อ/ผู้จัดการ
    </div>

    <!-- Filter Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:#0f172a; border:1px solid #334155; padding:12px 14px; border-radius:10px; margin-bottom:14px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#f8fafc;">
          <span>กรองหมวดหมู่:</span>
          <select id="modalLowStockCatSelect" onchange="updateLowStockModalContent()" style="background:#1e293b; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:4px 8px; font-size:13px;">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>ทุกหมวดหมู่ (${rawAll.length})</option>
            ${catList.map(c => `<option value="${escapeHtml(c)}" ${categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#f8fafc;">
          <span>เรียงตาม:</span>
          <select id="modalLowStockSortSelect" onchange="updateLowStockModalContent()" style="background:#1e293b; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:4px 8px; font-size:13px;">
            <option value="velocity" ${sortMode === 'velocity' ? 'selected' : ''}>⚡ วันหมดสต็อก (Urgency)</option>
            <option value="stock" ${sortMode === 'stock' ? 'selected' : ''}>📦 สต็อกเหลือน้อยสุด</option>
            <option value="name" ${sortMode === 'name' ? 'selected' : ''}>🔤 ชื่อสินค้า</option>
          </select>
        </div>
      </div>

      <div style="display:flex; gap:8px;">
        <button type="button" class="btn" onclick="printLowStockSummaryPDF(el('modalLowStockCatSelect')?.value, el('modalLowStockSortSelect')?.value)" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; font-weight:bold; border-color:#38bdf8;">
          🖨️ พิมพ์ / บันทึก PDF
        </button>
        <button type="button" class="btn btn-light" onclick="copyLowStockSummaryText(el('modalLowStockCatSelect')?.value, el('modalLowStockSortSelect')?.value)">
          📋 คัดลอกสรุป
        </button>
      </div>
    </div>

    <!-- Content Preview Container -->
    <div id="lowStockModalPreviewContainer">
      ${renderLowStockModalPreviewBody(data)}
    </div>

    <div class="actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid #334155; padding-top:12px;">
      <span style="font-size:12px; color:#94a3b8;">
        💡 กดปุ่ม <b>"พิมพ์ / บันทึก PDF"</b> เพื่อสั่งพิมพ์ออกทางเครื่องพิมพ์ หรือเลือก <b>"Save as PDF"</b>
      </span>
      <button type="button" class="btn btn-light" onclick="closeProductModal()">ปิดหน้าต่าง</button>
    </div>
  `;

  el("modal").showModal();
}

function updateLowStockModalContent() {
  const cat = el("modalLowStockCatSelect")?.value || "all";
  const sort = el("modalLowStockSortSelect")?.value || "velocity";
  const data = buildLowStockSummaryData(cat, sort);
  const container = el("lowStockModalPreviewContainer");
  if (container) {
    container.innerHTML = renderLowStockModalPreviewBody(data);
  }
}

function renderLowStockModalPreviewBody(data) {
  const rowsHtml = data.items.map((it, idx) => {
    let daysBadgeBg = "rgba(234, 88, 12, 0.2)";
    let daysBadgeColor = "#fb923c";
    let daysBadgeBorder = "rgba(251, 146, 60, 0.4)";

    if (it.isOutOfStock) {
      daysBadgeBg = "rgba(220, 38, 38, 0.25)";
      daysBadgeColor = "#f87171";
      daysBadgeBorder = "rgba(248, 113, 113, 0.5)";
    } else if (it.priorityRank <= 2) {
      daysBadgeBg = "rgba(234, 88, 12, 0.25)";
      daysBadgeColor = "#fb923c";
      daysBadgeBorder = "rgba(251, 146, 60, 0.5)";
    } else if (it.priorityRank <= 3) {
      daysBadgeBg = "rgba(234, 179, 8, 0.2)";
      daysBadgeColor = "#facc15";
      daysBadgeBorder = "rgba(250, 204, 21, 0.4)";
    } else {
      daysBadgeBg = "rgba(56, 189, 248, 0.2)";
      daysBadgeColor = "#38bdf8";
      daysBadgeBorder = "rgba(56, 189, 248, 0.4)";
    }

    return `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 8px; text-align: center; color: #94a3b8; font-weight: 700; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px 8px; font-size: 12px;">
          <b style="color: #f8fafc; font-size: 13px;">${escapeHtml(it.name)}</b>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            รหัส: <span style="font-family:monospace; color:#cbd5e1;">${escapeHtml(it.code)}</span> | หมวด: ${escapeHtml(it.category)}
          </div>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-size: 13px;">
          <strong style="color: ${it.isOutOfStock ? '#f87171' : '#fb923c'}">${it.stock}</strong>
          <span style="font-size: 11px; color: #94a3b8;">/ ${it.min} ${escapeHtml(it.unit)}</span>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-size: 12px; color: #cbd5e1;">
          <b>${it.velocity.totalSold30D}</b> ${escapeHtml(it.unit)}
          <div style="font-size: 10.5px; color: #64748b;">(เฉลี่ย ${it.velocity.dailyBurnRate.toFixed(1)}/วัน)</div>
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="display:inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 800; background: ${daysBadgeBg}; color: ${daysBadgeColor}; border: 1px solid ${daysBadgeBorder};">
            ${escapeHtml(it.daysLabel)}
          </span>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 800; color: #38bdf8; font-size: 13px;">
          +${it.suggestedQty} ${escapeHtml(it.unit)}
        </td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 800; color: #f8fafc; font-size: 13px;">
          ฿${money(it.refillCost)}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <!-- KPI Summary Grid -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:10px 12px;">
        <span style="font-size:11px; color:#94a3b8; font-weight:700;">สินค้าวิกฤต</span>
        <div style="font-size:18px; font-weight:900; color:#f8fafc; margin-top:2px;">${data.totalItems} รายการ</div>
      </div>
      <div style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); border-radius:10px; padding:10px 12px;">
        <span style="font-size:11px; color:#fca5a5; font-weight:700;">หมดสต็อกแล้ว (0 วัน)</span>
        <div style="font-size:18px; font-weight:900; color:#ef4444; margin-top:2px;">${data.outOfStockCount} รายการ</div>
      </div>
      <div style="background:rgba(249, 115, 22, 0.15); border:1px solid rgba(249, 115, 22, 0.3); border-radius:10px; padding:10px 12px;">
        <span style="font-size:11px; color:#fdba74; font-weight:700;">หมดใน ≤ 3 วัน</span>
        <div style="font-size:18px; font-weight:900; color:#f97316; margin-top:2px;">${data.critical3DaysCount} รายการ</div>
      </div>
      <div style="background:rgba(2, 132, 199, 0.15); border:1px solid rgba(56, 189, 248, 0.3); border-radius:10px; padding:10px 12px;">
        <span style="font-size:11px; color:#7dd3fc; font-weight:700;">งบสั่งเติมประมาณการ</span>
        <div style="font-size:18px; font-weight:900; color:#38bdf8; margin-top:2px;">฿${money(data.totalRefillBudget)}</div>
      </div>
    </div>

    <!-- Table Preview -->
    <div style="max-height: 380px; overflow-y: auto; border: 1px solid #334155; border-radius: 10px; background: #090d16;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead style="position:sticky; top:0; background:#1e293b; z-index:2;">
          <tr>
            <th style="padding:10px 8px; text-align:center; color:#94a3b8; font-size:11px; width:35px;">#</th>
            <th style="padding:10px 8px; text-align:left; color:#f8fafc; font-size:11px;">รายการสินค้า</th>
            <th style="padding:10px 8px; text-align:center; color:#f8fafc; font-size:11px; width:95px;">คงเหลือ / ขั้นต่ำ</th>
            <th style="padding:10px 8px; text-align:center; color:#f8fafc; font-size:11px; width:110px;">ขาย 30 วัน</th>
            <th style="padding:10px 8px; text-align:center; color:#f8fafc; font-size:11px; width:130px;">คาดการณ์วันสต็อกหมด</th>
            <th style="padding:10px 8px; text-align:center; color:#38bdf8; font-size:11px; width:85px;">แนะนำสั่งเพิ่ม</th>
            <th style="padding:10px 8px; text-align:right; color:#f8fafc; font-size:11px; width:95px;">งบประมาณ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:20px; color:#94a3b8;">ไม่มีสินค้าสต็อกต่ำในขณะนี้</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function openQuickRefillModal(productId, defaultQty = 10){
  const prod = productById(productId);
  if(!prod){
    toast("ไม่พบข้อมูลสินค้า");
    return;
  }

  let dialog = el("quickRefillDialog");
  if(!dialog){
    dialog = document.createElement("dialog");
    dialog.id = "quickRefillDialog";
    dialog.className = "modal-dialog";
    document.body.appendChild(dialog);
  }

  const stock = Number(prod.stock_qty || 0);
  const min = Number(prod.min_stock || 0);
  const recQty = defaultQty || Math.max(10, (min * 2) - stock);

  dialog.innerHTML = `
    <div class="modal-card" style="max-width:480px; width:92%;">
      <div class="modal-head">
        <div class="modal-title-wrap">
          <span class="modal-title-icon">⚡</span>
          <div>
            <h3>เติม Stock สินค้าด่วน</h3>
            <p>บันทึกการรับสินค้าเข้าคลังสำหรับ ${escapeHtml(prod.product_name)}</p>
          </div>
        </div>
        <button type="button" class="modal-close-btn" onclick="el('quickRefillDialog').close()">✕</button>
      </div>

      <div class="refill-modal-body">
        <div class="refill-prod-info">
          <h4>${escapeHtml(prod.product_name)}</h4>
          <p>รหัส: ${escapeHtml(prod.product_code || '-')} • Barcode: ${escapeHtml(prod.barcode || '-')}</p>
          <div style="margin-top:8px; font-size:13px; color:#cbd5e1;">
            Stock ปัจจุบัน: <strong style="color:${stock <= 0 ? '#f87171' : '#fbbf24'}">${stock} ชิ้น</strong> | จุดขั้นต่ำ: <strong>${min} ชิ้น</strong>
          </div>
        </div>

        <form id="quickRefillForm" onsubmit="event.preventDefault(); submitQuickRefill('${prod.id}');">
          <div class="form-group">
            <label for="refillQtyInput" style="display:block; font-size:13px; font-weight:700; color:#e2e8f0; margin-bottom:6px;">จำนวนรับเข้า (ชิ้น):</label>
            <input type="number" id="refillQtyInput" class="form-control" min="1" step="1" value="${recQty}" required autofocus style="width:100%; font-size:16px; font-weight:800; padding:10px 12px; background:#0f172a; border:1px solid #334155; color:#38bdf8; border-radius:8px;">
            <div class="refill-presets">
              <span class="preset-chip" onclick="el('refillQtyInput').value = ${recQty}">แนะนำ (+${recQty})</span>
              <span class="preset-chip" onclick="el('refillQtyInput').value = 10">+10</span>
              <span class="preset-chip" onclick="el('refillQtyInput').value = 20">+20</span>
              <span class="preset-chip" onclick="el('refillQtyInput').value = 50">+50</span>
              <span class="preset-chip" onclick="el('refillQtyInput').value = 100">+100</span>
            </div>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label for="refillNoteInput" style="display:block; font-size:13px; font-weight:700; color:#e2e8f0; margin-bottom:6px;">หมายเหตุเพิ่มเติม (ถ้ามี):</label>
            <input type="text" id="refillNoteInput" class="form-control" placeholder="เช่น เติม Stock ด่วนจากหน้า Home" style="width:100%; padding:9px 12px; background:#0f172a; border:1px solid #334155; color:#f8fafc; border-radius:8px;">
          </div>

          <div class="modal-footer" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-light" onclick="el('quickRefillDialog').close()">ยกเลิก</button>
            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:none; font-weight:800; padding:10px 18px; color:#ffffff; border-radius:8px;">
              💾 ยืนยันรับเข้าคลัง
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  dialog.showModal();
}

async function submitQuickRefill(productId){
  const prod = productById(productId);
  if(!prod) return;

  const qtyInput = el("refillQtyInput");
  const noteInput = el("refillNoteInput");
  const qty = Number(qtyInput ? qtyInput.value : 0);
  const note = noteInput ? noteInput.value.trim() : "เติม Stock ด่วนจาก Home Cards";

  if(qty <= 0){
    toast("กรุณาระบุจำนวนที่ถูกต้อง");
    return;
  }

  let remoteSuccess = false;
  if(sb && !state.isOffline){
    try{
      const { error } = await sb.rpc("ea_update_stock", {
        p_product_id: productId,
        p_type: "IN",
        p_qty: qty,
        p_note: note
      });
      if(!error) remoteSuccess = true;
    }catch(e){
      console.warn("Stock refill remote error:", e);
    }
  }

  if(!remoteSuccess){
    prod.stock_qty = Number(prod.stock_qty || 0) + qty;
    state.movements.unshift({
      id: "local_move_" + Date.now(),
      product_id: productId,
      product_name: prod.product_name,
      movement_type: "IN",
      qty_change: qty,
      note: note,
      movement_date: todayISO(),
      movement_time: new Date().toLocaleTimeString("th-TH")
    });
  }

  toast(`เติม Stock ${prod.product_name} (+${qty} ชิ้น) สำเร็จ!`);
  
  const dialog = el("quickRefillDialog");
  if(dialog && dialog.open) dialog.close();

  await loadAll();
  if(state.page === "home") renderHome();
}

function renderHourlyChart(){
  const data = getHourlySales();
  const max = Math.max(...data.map(x=>x.total), 1);

  return `
    <div class="daily-chart">
      ${data.map(x=>{
        const height = Math.max(3, Math.round((x.total/max)*100));
        return `
          <div class="daily-bar-wrap" title="${String(x.hour).padStart(2,"0")}:00 • ฿${money(x.total)}">
            <div class="daily-bar-value">${x.total ? "฿"+money(x.total) : ""}</div>
            <div class="daily-bar-track">
              <div class="daily-bar" style="height:${height}%"></div>
            </div>
            <div class="daily-bar-label">${String(x.hour).padStart(2,"0")}</div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderHome(){
  setHeader("สรุปภาพรวมรายวัน", "ภาพรวมการขายและสต็อกสินค้าประจำวัน");

  const total = todayTotal();
  const daySales = todaySales();
  const bills = daySales.length;
  const todayStats = getTodayItemStats();
  todayStats.sort((a, b) => (Number(b.qty) || 0) - (Number(a.qty) || 0));
  const units = todayStats.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const target = Number(state.settings.target || 5000);
  const targetPct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  const remainTarget = Math.max(0, target - total);
  const overTarget = Math.max(0, total - target);

  const cashSales = daySales.filter(x => !x.payment_method || x.payment_method === "cash");
  const qrSales = daySales.filter(x => x.payment_method === "promptpay" || x.payment_method === "qr" || x.payment_method === "transfer");
  const cashTotal = cashSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const qrTotal = qrSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const avgBill = bills > 0 ? Math.round(total / bills) : 0;

  const totalPay = (cashTotal + qrTotal) || 1;
  const cashPct = (cashTotal === 0 && qrTotal === 0) ? 50 : Math.round((cashTotal / totalPay) * 100);
  const qrPct = 100 - cashPct;

  // Thai Date formatting
  const now = new Date();
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const thaiDateStr = `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;

  // Determine Goal Status and Face Emoji Animation Theme
  let statusBadgeText = "";
  let statusClass = "status-starting";
  let statusIcon = "😰";
  let statusHeadline = "";
  let statusSubtext = "";

  if (targetPct >= 100) {
    statusBadgeText = "🥳 ดีใจสุดๆ (ทะลุเป้าแล้ว!)";
    statusClass = "status-celebrate";
    statusIcon = "🥳";
    statusHeadline = "🥳 ดีใจสุดๆ! ทะลุเป้าหมายยอดขายสำเร็จ";
    statusSubtext = `ยอดขายทะลุเป้าไปแล้ว +฿${money(overTarget)} บาท สุดยอดมาก!`;
  } else if (targetPct >= 60) {
    statusBadgeText = `😃 ดีใจ (ใกล้ถึงเป้า ${targetPct}%)`;
    statusClass = "status-almost";
    statusIcon = "😃";
    statusHeadline = "😃 ดีใจจัง! ยอดขายเกิน 60% ใกล้ถึงเป้าหมาย";
    statusSubtext = `เหลืออีกเพียง ฿${money(remainTarget)} บาท จะถึงเป้าหมาย ฿${money(target)} บาท`;
  } else if (targetPct >= 30) {
    statusBadgeText = `😮‍💨 โล่งใจ (ผ่าน 30% แล้ว ${targetPct}%)`;
    statusClass = "status-progressing";
    statusIcon = "😮‍💨";
    statusHeadline = "😮‍💨 เริ่มโล่งใจ! ยอดขายเริ่มขยับขึ้นมาแล้ว";
    statusSubtext = `สะสมยอดได้ ฿${money(total)} บาท ขาดอีก ฿${money(remainTarget)} บาท`;
  } else {
    statusBadgeText = `😰 กังวล (เพิ่งได้ ${targetPct}%)`;
    statusClass = "status-starting";
    statusIcon = "😰";
    statusHeadline = "😰 ยังกังวล! ยอดขายยังห่างจากเป้าหมาย";
    statusSubtext = `เป้าหมายวันนี้ ฿${money(target)} บาท (ขาดอีก ฿${money(remainTarget)} บาท) เร่งเปิดการขายกันเถอะ!`;
  }

  // Hot Sale Products: Get today's sales items, or fallback to all-time top sellers so the list is always complete!
  let hotSaleItems = [...todayStats];
  let isHotSaleAllTime = false;

  if (hotSaleItems.length === 0) {
    // Calculate top sellers across all sales history
    const allTimeStats = {};
    for (const item of (state.saleItems || [])) {
      const key = item.product_id || item.product_name;
      if (!key) continue;
      if (!allTimeStats[key]) {
        allTimeStats[key] = {
          product_id: item.product_id,
          product_name: item.product_name || "ไม่ระบุ",
          qty: 0,
          revenue: 0
        };
      }
      allTimeStats[key].qty += Number(item.qty || 0);
      allTimeStats[key].revenue += Number(item.line_total || 0);
    }
    const sortedAllTime = Object.values(allTimeStats).sort((a, b) => b.qty - a.qty);
    if (sortedAllTime.length > 0) {
      hotSaleItems = sortedAllTime;
      isHotSaleAllTime = true;
    } else if ((state.products || []).length > 0) {
      // If no past sales either, show catalog products
      hotSaleItems = state.products.map(p => ({
        product_id: p.id,
        product_name: p.product_name,
        category: p.category,
        qty: 0,
        revenue: Number(p.sale_price || 0)
      }));
      isHotSaleAllTime = true;
    }
  }

  // Find max quantity sold to draw proportional bar
  const maxHotQty = Math.max(1, ...hotSaleItems.map(i => Number(i.qty) || 0));

  // Build Hot Sale section with complete information for every item
  let hotSaleHtml = '';
  if (hotSaleItems.length === 0) {
    hotSaleHtml = `
      <div class="tdd-empty-state">
        <div class="tdd-empty-icon">🛍️</div>
        <div class="tdd-empty-title">ยังไม่มีรายการขายในระบบ</div>
        <div class="tdd-empty-desc">เริ่มเปิดบิลแรกหน้าร้านผ่านระบบ POS เพื่อบันทึกยอดขายและตัดสต็อกอัตโนมัติ</div>
        <button class="tdd-pos-btn" type="button" style="padding: 10px 22px; font-size: 15px; min-height: 44px;" onclick="go('sale')">
          <span>🛒 เปิดการขายบิลแรก</span>
        </button>
      </div>`;
  } else {
    hotSaleHtml = `
      <div class="tdd-hot-list">
        ${hotSaleItems.map((item, idx) => {
          const rankClass = idx === 0 ? "gold" : (idx === 1 ? "silver" : (idx === 2 ? "bronze" : ""));
          const rankLabel = idx === 0 ? "🥇 1" : (idx === 1 ? "🥈 2" : (idx === 2 ? "🥉 3" : `#${idx + 1}`));
          const prod = (state.products || []).find(p => p.id === item.product_id || p.product_name === item.product_name);
          const cat = prod?.category || item.category || "";
          const price = prod?.sale_price ? Number(prod.sale_price) : 0;
          const qty = Number(item.qty) || 0;
          const revenue = Number(item.revenue || item.total || (qty * price));
          const pct = Math.round((qty / maxHotQty) * 100);

          return `
            <div class="tdd-hot-row" onclick="go('report')" title="ดูรายละเอียดสถิติยอดขาย">
              <span class="tdd-rank-pill ${rankClass}">${rankLabel}</span>
              <div class="tdd-hot-name-wrap">
                <div class="tdd-hot-name">${escapeHtml(item.product_name || item.name || "สินค้า")}</div>
                <div class="tdd-hot-meta">
                  ${cat ? `<span class="tdd-hot-cat">${escapeHtml(cat)}</span>` : ''}
                  ${price > 0 ? `<span>฿${money(price)}/ชิ้น</span>` : ''}
                  <strong style="color: #38bdf8;">ขายแล้ว ${qty} ชิ้น</strong>
                </div>
                ${qty > 0 ? `
                  <div class="tdd-hot-bar-wrap" title="${pct}% ของสินค้าขายดีอันดับ 1">
                    <div class="tdd-hot-bar-fill" style="width: ${pct}%;"></div>
                  </div>` : ''}
              </div>
              <div class="tdd-hot-sales">
                <div class="tdd-hot-amount">฿${money(revenue)}</div>
                <div class="tdd-hot-units">ยอดรวม</div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // Filter low stock and out of stock items
  const allProds = (state.products && state.products.length > 0) ? state.products : [
    { product_name: "ท่อดำ LD [PN. 2.5] 20 mm. 200 m. [ เขียว ]", stock_qty: 3, min_stock: 5, category: "อุปกรณ์ท่อ" },
    { product_name: "ท่อดำ LD [PN. 2.5] 25 mm. 200 m. [ ส้ม ]", stock_qty: 2, min_stock: 5, category: "อุปกรณ์ท่อ" },
    { product_name: "ท่อดำ LD [PN. 2.5] 25 mm. 200 m. [ เขียว ]", stock_qty: 1, min_stock: 5, category: "อุปกรณ์ท่อ" },
    { product_name: "ตาข่าย 80% ดำ 2 x 10 m. ต้นไม้", stock_qty: 4, min_stock: 5, category: "สแลนกรองแสง" },
    { product_name: "ตาข่าย 80% เขียว 2 x 10 m. ต้นไม้", stock_qty: 0, min_stock: 5, category: "สแลนกรองแสง" },
    { product_name: "ตาข่าย 80% เงิน 2 x 10 m. ต้นไม้", stock_qty: 0, min_stock: 5, category: "สแลนกรองแสง" },
    { product_name: "ตาข่าย 70% เขียว 2 x 10 m. [ ลายตรง ]", stock_qty: 0, min_stock: 5, category: "สแลนกรองแสง" },
    { product_name: "ผ้าปูพื้น 120 ซม. - 100 เมตร", stock_qty: 0, min_stock: 5, category: "ผ้าปูการเกษตร" }
  ];

  const stockAlerts = allProds
    .filter(p => (Number(p.stock_qty) || 0) <= (Number(p.min_stock) || 5))
    .sort((a, b) => (Number(a.stock_qty) || 0) - (Number(b.stock_qty) || 0));

  // Build Stock Alerts section
  let stockAlertsHtml = '';
  if (stockAlerts.length === 0) {
    stockAlertsHtml = `
      <div class="tdd-empty-state" style="padding: 24px 16px;">
        <div class="tdd-empty-icon" style="font-size: 32px;">✅</div>
        <div class="tdd-empty-title">สต็อกสินค้าอยู่ในระดับปกติ</div>
        <div class="tdd-empty-desc">ไม่มีรายการที่ต้องสั่งเพิ่มหรือใกล้หมดในขณะนี้</div>
      </div>`;
  } else {
    stockAlertsHtml = `
      <div class="tdd-stock-list">
        ${stockAlerts.slice(0, 10).map(p => {
          const s = Number(p.stock_qty) || 0;
          const min = Number(p.min_stock) || 5;
          const isOut = s <= 0;
          return `
            <div class="tdd-stock-row ${isOut ? '' : 'is-low'}" onclick="go('stock')" title="คลิกเพื่อจัดการสต็อก">
              <div class="tdd-stock-info">
                <div class="tdd-stock-name">${escapeHtml(p.product_name)}</div>
                <div class="tdd-stock-meta">
                  <span>ขั้นต่ำ: ${min} ชิ้น</span>
                  ${p.category ? ` • <span>${escapeHtml(p.category)}</span>` : ''}
                </div>
              </div>
              <span class="tdd-stock-badge ${isOut ? 'out' : 'low'}">
                ${isOut ? '🚫 หมดสต็อก (0)' : `⚠️ เหลือ ${s} ชิ้น`}
              </span>
            </div>`;
        }).join('')}
      </div>`;
  }

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="tablet-daily-dashboard">

      <!-- Compact Tablet Header Bar (AppSheet / Tablet Hub Style) -->
      <div class="tdd-top-bar">
        <div class="tdd-top-bar-left">
          <div class="tdd-top-bar-title-wrap">
            <span class="tdd-top-icon">📊</span>
            <h2 class="tdd-top-bar-title">DASHBOARD TODAY</h2>
            <span class="tdd-top-bar-badge">สรุปภาพรวมรายวัน</span>
          </div>
          <div class="tdd-top-bar-meta">
            <span class="tdd-top-date">📅 ${thaiDateStr}</span>
            <span class="tdd-top-dot">•</span>
            <span>สาขา: <strong class="tdd-top-branch">${escapeHtml(state.settings.branch || "TERMINAL-01")}</strong></span>
            <span class="tdd-top-dot">•</span>
            <span class="tdd-top-online" style="color: ${state.isOffline ? '#f59e0b' : '#10b981'}; font-weight: 700;">
              ${state.isOffline ? '⚡ โหมดออฟไลน์' : '🟢 ออนไลน์ปกติ'}
            </span>
          </div>
        </div>
        <div class="tdd-top-bar-right">
          <button class="tdd-header-action-btn stock" type="button" onclick="go('stock')" title="จัดการคลังและสต็อกสินค้า">
            <span>📦 สต็อก</span>
          </button>
          <button class="tdd-header-action-btn history" type="button" onclick="go('salesHistory')" title="ดูประวัติการขายประจำวัน">
            <span>🧾 ประวัติบิล</span>
          </button>
          <button class="tdd-header-action-btn report" type="button" onclick="go('report')" title="ดูรายงานสรุปยอดขาย">
            <span>📊 รายงาน</span>
          </button>
        </div>
      </div>

      <!-- 3-Column Operational Grid (Col 1: ~40% | Col 2: ~40% | Col 3: ~20%) -->
      <div class="tdd-three-cols-grid">

        <!-- ========================================================
             COLUMN 1 (~40%): บน: ยอดขายรวมวันนี้ | ล่าง: สินค้าขายดี
             ======================================================== -->
        <div class="tdd-col tdd-col-1">

          <!-- Card 1 Top: 💰 ยอดขายรวมวันนี้ 💰 -->
          <div class="tdd-panel tdd-card-top tdd-sales-summary-card" onclick="go('salesHistory')" title="แตะเพื่อดูประวัติการขาย">
            <div class="tdd-panel-head">
              <h3 class="tdd-panel-title">
                <span>💰 ยอดขายรวมวันนี้ 💰</span>
              </h3>
              <span class="tdd-panel-link-icon" title="ดูประวัติบิล">↗</span>
            </div>

            <div class="tdd-sales-amount-row">
              <div class="tdd-sales-amount-val green">฿${money(total)}</div>
              <div class="tdd-sales-stats-pills">
                <span class="tdd-stat-pill">🧾 ${bills} บิล</span>
                <span class="tdd-stat-pill">📦 ${units} ชิ้น</span>
              </div>
            </div>

            <div class="tdd-sales-sub-metrics">
              <div class="tdd-avg-metric">
                <span class="tdd-metric-label">เฉลี่ยต่อบิล</span>
                <span class="tdd-metric-val">฿${money(avgBill)}</span>
              </div>
              <div class="tdd-pay-split-compact">
                <div class="tdd-pay-split-bar">
                  <div class="tdd-split-cash" style="width: ${cashPct}%" title="เงินสด ${cashPct}%"></div>
                  <div class="tdd-split-qr" style="width: ${qrPct}%" title="QR / โอน ${qrPct}%"></div>
                </div>
                <div class="tdd-pay-legend-compact">
                  <span class="tdd-legend-cash">💵 สด ฿${money(cashTotal)} (${cashPct}%)</span>
                  <span class="tdd-legend-qr">📲 QR ฿${money(qrTotal)} (${qrPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 1 Bottom: 💥 สินค้าขายดี (Hot Sale) 💥 -->
          <div class="tdd-panel tdd-card-bottom tdd-hotsale-panel">
            <div class="tdd-panel-head">
              <h3 class="tdd-panel-title">
                <span>💥 ${isHotSaleAllTime ? 'สินค้าขายดีประจำร้าน' : 'HOT SALE (สินค้าขายดี)'} 💥</span>
                <span class="tdd-panel-badge">${hotSaleItems.length} รายการ</span>
              </h3>
              <button class="tdd-panel-action" type="button" onclick="go('report')">
                <span>ดูทั้งหมด</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            ${hotSaleHtml}
          </div>

        </div>

        <!-- ========================================================
             COLUMN 2 (~40%): บน: เป้าหมายยอดขาย | ล่าง: สินค้าเหลือน้อย
             ======================================================== -->
        <div class="tdd-col tdd-col-2">

          <!-- Card 2 Top: 🎯 เป้าหมายยอดขาย 🎯 -->
          <div class="tdd-panel tdd-card-top tdd-target-card" onclick="go('settings')" title="แตะเพื่อตั้งค่าเป้าหมายรายวัน">
            <div class="tdd-panel-head">
              <h3 class="tdd-panel-title">
                <span>🎯 เป้าหมายยอดขาย 🎯</span>
              </h3>
              <span class="tdd-panel-link-icon" title="ตั้งค่าเป้าหมาย">⚙️</span>
            </div>

            <div class="tdd-target-highlight-banner">
              <span>⭐ เป้าหมาย ${money(target)} บาท/วัน ⭐</span>
            </div>

            <div class="tdd-target-status-line">
              <span class="tdd-target-status-label">สถานะ : <strong>${targetPct}%</strong></span>
              <span class="tdd-target-status-value">฿${money(total)} / ฿${money(target)}</span>
            </div>

            <div class="tdd-target-progress-bar">
              <div class="tdd-target-progress-fill ${targetPct >= 100 ? 'celebrate' : ''}" style="width: ${Math.min(100, Math.max(3, targetPct))}%;"></div>
            </div>

            <div class="tdd-target-footer-info">
              <span class="tdd-target-remain-tag ${targetPct >= 100 ? 'done' : ''}">
                ${targetPct >= 100 ? `🎉 บรรลุเป้าหมายแล้ว! (+฿${money(overTarget)})` : `ขาดอีก ฿${money(remainTarget)} บาท`}
              </span>
              <span class="tdd-target-edit-hint">แตะเพื่อแก้ไข ↗</span>
            </div>
          </div>

          <!-- Card 2 Bottom: ⚠️ สินค้าเหลือน้อย ⚠️ -->
          <div class="tdd-panel tdd-card-bottom tdd-stock-alerts-panel">
            <div class="tdd-panel-head">
              <h3 class="tdd-panel-title">
                <span>⚠️ สินค้าเหลือน้อย ⚠️</span>
                <span class="tdd-panel-badge red">
                  ${stockAlerts.length} รายการ
                </span>
              </h3>
              <button class="tdd-panel-action" type="button" onclick="go('stock')">
                <span>จัดการสต็อก</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            ${stockAlertsHtml}
          </div>

        </div>

        <!-- ========================================================
             COLUMN 3 (~20%): บน: STATUS (อนิเมชั่น) | ล่าง: ขายสินค้า
             ======================================================== -->
        <div class="tdd-col tdd-col-3">

          <!-- Card 3 Top: 🏆 STATUS 🏆 (แสดงสถานะ ว่า ตอนนี้ ใกล้ถึงเป้าหมายหรือยัง อนิเมชั่น) -->
          <div class="tdd-panel tdd-col3-status-card" data-keep-emoji onclick="go('settings')" title="แตะเพื่อดูรายละเอียดเป้าหมาย">
            <div class="tdd-panel-head">
              <h3 class="tdd-panel-title">
                <span>🏆 STATUS 🏆</span>
              </h3>
            </div>

            <div class="tdd-col3-status-body">
              <div class="tdd-col3-status-icon-wrap">
                <span class="tdd-status-animated-icon">${statusIcon}</span>
              </div>
            </div>

            <div class="tdd-col3-status-bar-box">
              <div class="tdd-status-bar-track">
                <div class="tdd-status-bar-fill ${targetPct >= 100 ? 'celebrate' : ''}" style="width: ${Math.min(100, Math.max(6, targetPct))}%;"></div>
              </div>
              <div class="tdd-status-footer">
                <span>ปัจจุบัน ฿${money(total)}</span>
                <span>เป้า ฿${money(target)}</span>
              </div>
            </div>
          </div>

          <!-- 🛒 ปุ่มขายสินค้า POS (เฉพาะปุ่มด้านใน) -->
          <button class="tdd-col3-giant-pos-btn" type="button" onclick="go('sale')" aria-label="เปิดหน้าขายสินค้า POS">
            <div class="tdd-pos-btn-glow"></div>
            <div class="tdd-pos-cart-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1.5"></circle>
                <circle cx="20" cy="21" r="1.5"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <div class="tdd-pos-btn-label">ขายสินค้า</div>
            <div class="tdd-pos-btn-hint">เปิดบิล POS หน้าร้าน</div>
          </button>

        </div>

      </div>

    </div>
  `;
}

function renderMenu(){
  setHeader("MENU","เลือกเมนูที่ต้องการใช้งาน");
  const sales=todayTotal();
  const pct=Math.min(100,Math.round(sales/Math.max(1,state.settings.target)*100));

  el("content").innerHTML=`
    ${connectionNotice()}
    <section class="app-home image-menu-home">
      <div class="image-menu-grid">
        <button class="image-menu-btn" onclick="go('sale')" aria-label="POS ขายสินค้า">
          <img src="./images/btn-sale.png" alt="Sale Products">
        </button>
        <button class="image-menu-btn" onclick="go('salesHistory')" aria-label="ประวัติการขาย">
          <div class="menu-custom-tile history-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">📜</span>
              <div class="menu-tile-title">ประวัติการขาย</div>
              <div class="menu-tile-subtitle">Sales History · ดูบิลย้อนหลัง</div>
            </div>
            <span class="menu-tile-badge">${state.sales ? state.sales.length : 0} บิล</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="go('expenses')" aria-label="บันทึกค่าใช้จ่ายและกำไรสุทธิ">
          <div class="menu-custom-tile expense-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">💸</span>
              <div class="menu-tile-title">ค่าใช้จ่าย & กำไรสุทธิ</div>
              <div class="menu-tile-subtitle">Expenses · คำนวณกำไรแท้จริง</div>
            </div>
            <span class="menu-tile-badge">${state.expenses ? state.expenses.length : 0} รายการ</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="go('hub')" aria-label="ศูนย์กลาง ยอดทุกเครื่อง">
          <div class="menu-custom-tile history-tile hub-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">🏢</span>
              <div class="menu-tile-title">ศูนย์กลาง (ยอดทุกเครื่อง)</div>
              <div class="menu-tile-subtitle">ยอดแยกเครื่อง · รับเงินสด · สต็อกใกล้หมด</div>
            </div>
          </div>
        </button>
        <button class="image-menu-btn" onclick="startRemoteScan()" aria-label="มือถือสแกนคิดเงิน">
          <div class="menu-custom-tile scanner-tile remote-scan-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">📱</span>
              <div class="menu-tile-title">มือถือสแกนคิดเงิน</div>
              <div class="menu-tile-subtitle">สแกน → รับเงิน → ตัดสต็อก · สรุปยอดรายเครื่อง</div>
            </div>
          </div>
        </button>
        <button class="image-menu-btn" onclick="startScanner()" aria-label="สแกนบาร์โค้ดด้วยกล้อง">
          <div class="menu-custom-tile scanner-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">📷</span>
              <div class="menu-tile-title">สแกนบาร์โค้ดด่วน</div>
              <div class="menu-tile-subtitle">Camera Scanner · กล้องอุปกรณ์</div>
            </div>
            <span class="menu-tile-badge">สแกนสด</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="openBarcodePrintModal()" aria-label="พิมพ์ฉลากบาร์โค้ดสินค้า">
          <div class="menu-custom-tile barcode-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">🖨️</span>
              <div class="menu-tile-title">พิมพ์บาร์โค้ดสินค้า</div>
              <div class="menu-tile-subtitle">Print Barcode · สติกเกอร์ & A4</div>
            </div>
            <span class="menu-tile-badge">พิมพ์ฉลาก</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="go('audit')" aria-label="ตรวจนับสต็อกจริง & กระทบยอด">
          <div class="menu-custom-tile audit-tile">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content">
              <span class="menu-tile-icon">🔍</span>
              <div class="menu-tile-title">ตรวจนับสต็อกจริง</div>
              <div class="menu-tile-subtitle">Physical Audit · สแกนกระทบยอด</div>
            </div>
            <span class="menu-tile-badge">Batch Scan</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="go('dashboardToday')" aria-label="Dashboard วันนี้">
          <img src="./images/btn-dashboard-today.png" alt="Report Today">
        </button>
        <button class="image-menu-btn" onclick="go('dashboardAll')" aria-label="Dashboard รวมทั้งงาน">
          <img src="./images/btn-dashboard-all.png" alt="Home Dashboard">
        </button>
        <button class="image-menu-btn" onclick="goMovement('IN')" aria-label="รับสินค้าเข้า">
          <img src="./images/btn-add-stock.png" alt="Add Stock">
        </button>
        <button class="image-menu-btn" onclick="goMovement('OUT')" aria-label="เบิกสินค้าออก">
          <img src="./images/btn-out-stock.png" alt="Out Stock">
        </button>
        <button class="image-menu-btn" onclick="openNewProductFromHome()" aria-label="เพิ่มสินค้าใหม่">
          <img src="./images/btn-new-product.png" alt="New Products">
        </button>
        <button class="image-menu-btn" onclick="go('stock')" aria-label="สต็อกสินค้า">
          <img src="./images/btn-stock.png" alt="Stock Products">
        </button>
        <button class="image-menu-btn menu-with-badge" onclick="go('lowStock')" aria-label="สินค้าใกล้หมด">
          <img src="./images/btn-low-stock.png" alt="Low Stock">
          <span class="menu-count-badge">${lowProducts().length}</span>
        </button>
        <button class="image-menu-btn" onclick="go('report')" aria-label="ส่งออกรายงาน">
          <img src="./images/btn-export.png" alt="Export Report">
        </button>
        <button class="image-menu-btn" onclick="openThemePickerModal()" aria-label="ตั้งค่าสีธีมและโหมดมืดสว่าง">
          <div class="menu-custom-tile theme-tile" style="background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); border-radius:16px; min-height:85px; position:relative; overflow:hidden; display:flex; align-items:center; padding:12px; border:1px solid rgba(56,189,248,0.4);">
            <div class="menu-tile-bg"></div>
            <div class="menu-tile-content" style="z-index:2; text-align:left;">
              <span class="menu-tile-icon" style="font-size:22px;">🎨</span>
              <div class="menu-tile-title" style="font-weight:800; font-size:14px; color:#ffffff;">สีธีม & Dark/Light</div>
              <div class="menu-tile-subtitle" style="font-size:11px; color:rgba(255,255,255,0.85);">สลับโหมดมืด/สว่าง · 7 โทนสี</div>
            </div>
            <span class="menu-tile-badge" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.3); color:#fff; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700;">โหมด & สี</span>
          </div>
        </button>
        <button class="image-menu-btn" onclick="go('settings')" aria-label="ตั้งค่า">
          <img src="./images/btn-setting.png" alt="Setting">
        </button>
      </div>
    </section>`;
}

function goMovement(type){
  go("movement");
  setTimeout(()=>{
    const moveType=el("moveType");
    if(moveType) moveType.value=type;
  },40);
}

function quickReceive(id){
  go("movement");
  setTimeout(()=>{
    const moveType=el("moveType");
    const moveProduct=el("moveProduct");
    const moveQty=el("moveQty");
    if(moveType) moveType.value="IN";
    if(moveProduct && id) moveProduct.value=id;
    if(moveQty) {
      moveQty.value="10";
      moveQty.focus();
    }
  },50);
}

function openNewProductFromHome(){
  openProductModal();
}

// -------------------------------------------------------------
// Automatic Restock Order Generator & Export (PDF / Shareable Text)
// -------------------------------------------------------------
function generateRestockOrderData(){
  const rows = lowProducts();
  state.restockOrderOverrides = state.restockOrderOverrides || {};
  const mult = Number(state.restockMultiplier || 2);

  const items = rows.map(p => {
    const currentStock = Number(p.stock_qty || 0);
    const minStock = Number(p.min_stock || 0);
    const deficit = Math.max(0, minStock - currentStock);
    const unitPrice = Number(p.cost_price || p.sale_price || 0);

    // Calculate suggested restock quantity
    let suggestedQty = 0;
    if(state.restockOrderOverrides[p.id] !== undefined){
      suggestedQty = Math.max(1, Number(state.restockOrderOverrides[p.id]) || 1);
    } else {
      const targetStock = Math.max(minStock * mult, minStock + 5);
      let calculated = Math.max(targetStock - currentStock, deficit, 5);
      if(currentStock <= 0){
        calculated = Math.max(calculated, minStock * mult || 10);
      }
      suggestedQty = Math.max(1, Math.round(calculated));
    }

    const lineCost = suggestedQty * unitPrice;
    const isOutOfStock = currentStock <= 0;

    return {
      id: p.id,
      name: p.product_name,
      code: p.product_code || "-",
      barcode: p.barcode || "-",
      category: p.category_name || "ทั่วไป",
      unit: p.unit || p.unit_name || "ชิ้น",
      currentStock,
      minStock,
      deficit,
      suggestedQty,
      unitPrice,
      lineCost,
      isOutOfStock
    };
  });

  const docNo = state.restockDocNo || ("RO-" + todayISO().replace(/-/g, "") + "-" + (state.terminal || "POS01"));
  const generatedDate = formatThaiDateStr(todayISO());
  const now = new Date();
  const generatedTime = now.toTimeString().slice(0, 5);

  const totalItems = items.length;
  const outCount = items.filter(it => it.isOutOfStock).length;
  const lowCount = totalItems - outCount;
  const totalUnits = items.reduce((s, it) => s + it.suggestedQty, 0);
  const totalCost = items.reduce((s, it) => s + it.lineCost, 0);

  return {
    docNo,
    generatedDate,
    generatedTime,
    items,
    totalItems,
    outCount,
    lowCount,
    totalUnits,
    totalCost,
    multiplier: mult
  };
}

function setRestockMultiplier(m){
  state.restockMultiplier = Number(m);
  state.restockOrderOverrides = {};
  renderLowStock();
}

function updateRestockItemQty(id, val){
  state.restockOrderOverrides = state.restockOrderOverrides || {};
  const num = Math.max(1, parseInt(val) || 1);
  state.restockOrderOverrides[id] = num;
  renderLowStock();
}

function resetRestockOrder(){
  state.restockOrderOverrides = {};
  state.restockDocNo = "RO-" + todayISO().replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
  toast("รีเซ็ตจำนวนที่สั่งเติมเป็นค่าเริ่มต้นที่ระบบแนะนำ");
  renderLowStock();
}

function generateRestockOrderText(data){
  const storeName = state.storeName || "EA Fair Sale & Event POS";
  const lineDivider = "==================================================";
  const subDivider  = "--------------------------------------------------";

  let out = "";
  out += lineDivider + "\n";
  out += "📦 ใบสั่งเติมสต็อกสินค้า (RESTOCK PURCHASE ORDER)\n";
  out += `ร้านค้า: ${storeName}\n`;
  out += `เลขที่เอกสาร: ${data.docNo}\n`;
  out += `วันที่ออกเอกสาร: ${data.generatedDate} เวลา ${data.generatedTime} น.\n`;
  out += `จุดขาย / จุดสำรวจ: ${state.terminal || 'POS-01'}\n`;
  out += lineDivider + "\n\n";

  out += "📊 สรุปภาพรวมการสั่งเติม:\n";
  out += `• รายการสินค้าทั้งหมด: ${data.totalItems} รายการ\n`;
  out += `  - 🚨 สินค้าหมดสต็อก: ${data.outCount} รายการ\n`;
  out += `  - ⚠️ สินค้าใกล้หมด: ${data.lowCount} รายการ\n`;
  out += `• ปริมาณที่ต้องสั่งเติมรวม: ${data.totalUnits} ชิ้น\n`;
  out += `• ประมาณการงบประมาณสั่งซื้อ: ฿${money(data.totalCost)}\n\n`;

  out += subDivider + "\n";
  out += "📋 รายการสินค้าที่ต้องสั่งเติม:\n";
  out += subDivider + "\n\n";

  data.items.forEach((it, idx) => {
    const statusTag = it.isOutOfStock ? "[🚨 หมดสต็อก]" : "[⚠️ ใกล้หมด]";
    out += `${idx + 1}. ${statusTag} ${it.name}\n`;
    out += `   • รหัส: ${it.code || '-'} | บาร์โค้ด: ${it.barcode || '-'}\n`;
    out += `   • คงเหลือ: ${it.currentStock} ${it.unit} (ขั้นต่ำ: ${it.minStock} ${it.unit})\n`;
    if(it.deficit > 0){
      out += `   • ขาดจากเกณฑ์ขั้นต่ำ: ${it.deficit} ${it.unit}\n`;
    }
    out += `   • จำนวนที่สั่งเติม: ${it.suggestedQty} ${it.unit}\n`;
    out += `   • ราคาต่อหน่วย: ฿${money(it.unitPrice)} | รวมประมาณการ: ฿${money(it.lineCost)}\n\n`;
  });

  out += subDivider + "\n";
  out += "หมายเหตุ: โปรดตรวจนับสต็อกจริงก่อนสั่งซื้อหรือประสานงานกับ Supplier\n";
  out += `ผู้จัดทำรายการ: ${state.terminal || 'POS-01'} (ระบบอัตโนมัติ)\n`;
  out += lineDivider + "\n";

  return out;
}

function downloadRestockOrderText(){
  const data = generateRestockOrderData();
  if(!data.items || data.items.length === 0){
    toast("ไม่มีสินค้าใกล้หมดที่ต้องสั่งเติมสต็อก");
    return;
  }
  const text = generateRestockOrderText(data);
  const blob = new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileName = `restock_order_${todayISO().replace(/-/g, "")}_${Date.now().toString().slice(-4)}.txt`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
    URL.revokeObjectURL(url);
  }, 100);
  toast(`ดาวน์โหลด ${fileName} เรียบร้อยแล้ว`);
}

function fallbackCopyText(text){
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("📋 คัดลอกรายการสั่งเติมสต็อกแล้ว! พร้อมแชร์ลง LINE / แชท");
  } catch {
    toast("ไม่สามารถคัดลอกข้อความได้อัตโนมัติ");
  }
  document.body.removeChild(ta);
}

function copyRestockOrderText(){
  const data = generateRestockOrderData();
  if(!data.items || data.items.length === 0){
    toast("ไม่มีสินค้าใกล้หมดที่ต้องสั่งเติมสต็อก");
    return;
  }
  const text = generateRestockOrderText(data);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(() => {
      toast("📋 คัดลอกรายการสั่งเติมสต็อกแล้ว! พร้อมแชร์ลง LINE / แชท");
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function exportRestockOrderPDF(){
  const data = generateRestockOrderData();
  if(!data.items || data.items.length === 0){
    toast("ไม่มีสินค้าใกล้หมดที่ต้องสั่งเติมสต็อก");
    return;
  }

  let printFrame = el("restockPrintFrame");
  if(!printFrame){
    printFrame = document.createElement("iframe");
    printFrame.id = "restockPrintFrame";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.visibility = "hidden";
    document.body.appendChild(printFrame);
  }

  const storeName = state.storeName || "EA Fair Sale & Event POS";
  const rowsHtml = data.items.map((it, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #475569;">${idx + 1}</td>
      <td style="padding: 8px 6px; font-size: 12px; font-family: monospace; color: #1e293b;">${escapeHtml(it.code || '-')}<br><small style="color:#64748b;">${escapeHtml(it.barcode || '-')}</small></td>
      <td style="padding: 8px 6px; font-size: 13px; font-weight: 700; color: #0f172a;">
        ${escapeHtml(it.name)}
        <div style="font-size: 11px; font-weight: normal; color: #64748b;">หมวด: ${escapeHtml(it.category || 'ทั่วไป')}</div>
      </td>
      <td style="padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 700; color: ${it.isOutOfStock ? '#dc2626' : '#d97706'};">
        ${it.currentStock}
      </td>
      <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #475569;">
        ${it.minStock}
      </td>
      <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #dc2626; font-weight: 700;">
        ${it.deficit > 0 ? `-${it.deficit}` : '0'}
      </td>
      <td style="padding: 8px 6px; text-align: center; font-size: 14px; font-weight: 800; color: #0284c7; background: #f0f9ff;">
        ${it.suggestedQty} ${escapeHtml(it.unit)}
      </td>
      <td style="padding: 8px 6px; text-align: right; font-size: 12px; color: #334155;">
        ฿${money(it.unitPrice)}
      </td>
      <td style="padding: 8px 6px; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">
        ฿${money(it.lineCost)}
      </td>
      <td style="padding: 8px 6px; text-align: center; font-size: 11px;">
        <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; background: ${it.isOutOfStock ? '#fee2e2; color:#b91c1c;' : '#fef3c7; color:#b45309;'}">
          ${it.isOutOfStock ? 'หมดสต็อก' : 'ใกล้หมด'}
        </span>
      </td>
    </tr>
  `).join("");

  const printHtml = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>ใบสั่งเติมสต็อกสินค้า - ${escapeHtml(data.docNo)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Sarabun", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
        }
        .order-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .store-brand {
          font-size: 20px;
          font-weight: 900;
          color: #0369a1;
          letter-spacing: -0.5px;
        }
        .store-sub {
          font-size: 12px;
          color: #475569;
          margin-top: 2px;
        }
        .order-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          text-align: right;
        }
        .doc-meta {
          font-size: 11px;
          color: #475569;
          text-align: right;
          margin-top: 4px;
        }
        .kpi-boxes {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          background: #f8fafc;
        }
        .kpi-card.blue {
          background: #f0f9ff;
          border-color: #bae6fd;
        }
        .kpi-lbl {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .kpi-num {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }
        .kpi-num.blue {
          color: #0284c7;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background: #0284c7;
          color: #ffffff;
          padding: 8px 6px;
          font-size: 11px;
          font-weight: 800;
          text-align: left;
        }
        th.center { text-align: center; }
        th.right { text-align: right; }
        .summary-box {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .summary-table {
          width: 320px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .summary-row.total {
          font-size: 14px;
          font-weight: 800;
          color: #0369a1;
          background: #e0f2fe;
          border-bottom: none;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-box {
          border: 1px dashed #94a3b8;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          height: 110px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-line {
          border-bottom: 1px solid #475569;
          margin: 30px 10px 4px 10px;
        }
        .sig-title {
          font-size: 11px;
          font-weight: 700;
          color: #334155;
        }
        .sig-date {
          font-size: 10px;
          color: #64748b;
        }
        .footer-note {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="order-container">
        <div class="order-header">
          <div>
            <div class="store-brand">🏪 ${escapeHtml(storeName)}</div>
            <div class="store-sub">ระบบบริหารสินค้าคงคลัง & สั่งเติมสต็อกอัตโนมัติ (Inventory Restock Requisition)</div>
            <div style="font-size: 11px; color:#64748b; margin-top:3px;">จุดขาย / สาขา: ${escapeHtml(state.terminal || 'POS-01')}</div>
          </div>
          <div>
            <div class="order-title">ใบสั่งเติมสต็อกสินค้า</div>
            <div class="doc-meta">
              <strong>เลขที่เอกสาร:</strong> ${escapeHtml(data.docNo)}<br>
              <strong>วันที่ออกเอกสาร:</strong> ${escapeHtml(data.generatedDate)} ${escapeHtml(data.generatedTime)} น.<br>
              <strong>สถานะ:</strong> รอการตรวจสอบและอนุมัติสั่งซื้อ
            </div>
          </div>
        </div>

        <div class="kpi-boxes">
          <div class="kpi-card">
            <div class="kpi-lbl">รายการที่ต้องเติม</div>
            <div class="kpi-num">${data.totalItems} <span style="font-size:12px; font-weight:normal;">รายการ</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">หมดสต็อก (เร่งด่วน)</div>
            <div class="kpi-num" style="color:#dc2626;">${data.outCount} <span style="font-size:12px; font-weight:normal;">รายการ</span></div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-lbl">ปริมาณสั่งเติมรวม</div>
            <div class="kpi-num blue">${data.totalUnits} <span style="font-size:12px; font-weight:normal;">ชิ้น</span></div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-lbl">ประมาณการงบประมาณ</div>
            <div class="kpi-num blue">฿${money(data.totalCost)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 32px;">#</th>
              <th style="width: 100px;">รหัส / บาร์โค้ด</th>
              <th>รายการสินค้า</th>
              <th class="center" style="width: 50px;">คงเหลือ</th>
              <th class="center" style="width: 50px;">ขั้นต่ำ</th>
              <th class="center" style="width: 50px;">ขาด</th>
              <th class="center" style="width: 80px;">สั่งเติม</th>
              <th class="right" style="width: 80px;">ราคา/หน่วย</th>
              <th class="right" style="width: 90px;">รวมประมาณการ</th>
              <th class="center" style="width: 70px;">ระดับ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-table">
            <div class="summary-row">
              <span>จำนวนรายการสั่งซื้อทั้งหมด</span>
              <strong>${data.totalItems} รายการ</strong>
            </div>
            <div class="summary-row">
              <span>จำนวนชิ้นรวมทั้งหมด</span>
              <strong>${data.totalUnits} ชิ้น</strong>
            </div>
            <div class="summary-row total">
              <span>ประมาณการงบประมาณสั่งซื้อรวม</span>
              <span>฿${money(data.totalCost)}</span>
            </div>
          </div>
        </div>

        <div class="signatures-grid">
          <div class="sig-box">
            <div class="sig-title">ผู้จัดทำรายการ / สำรวจสต็อก</div>
            <div class="sig-line"></div>
            <div class="sig-date">วันที่ ..... / ..... / .........</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">ผู้ตรวจสอบสต็อกคลัง</div>
            <div class="sig-line"></div>
            <div class="sig-date">วันที่ ..... / ..... / .........</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">ผู้อนุมัติสั่งซื้อ / ผู้จัดการ</div>
            <div class="sig-line"></div>
            <div class="sig-date">วันที่ ..... / ..... / .........</div>
          </div>
        </div>

        <div class="footer-note">
          เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติจากระดับสินค้าคงเหลือต่ำกว่าเกณฑ์ขั้นต่ำ ณ วันที่ ${escapeHtml(data.generatedDate)} (${escapeHtml(data.generatedTime)} น.) • โปรดตรวจสอบจำนวนจริงก่อนสั่งซื้อกับผู้จัดจำหน่าย (Supplier)
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    }, 250);
  } catch(e) {
    console.error("Print PDF error:", e);
    toast("เกิดข้อผิดพลาดในการเปิดหน้าต่างพิมพ์ PDF");
  }
}

function renderRestockOrderSection(data){
  if(!data.items || data.items.length === 0){
    return `
      <div class="restock-order-panel" style="border-color: rgba(52, 211, 153, 0.3);">
        <div style="display:flex; align-items:center; gap:12px; color:#34d399;">
          <div style="font-size:28px;">🎉</div>
          <div>
            <strong style="font-size:15px; display:block; color:#f8fafc;">สต็อกสินค้าทุกรายการอยู่ในระดับปลอดภัย</strong>
            <span style="font-size:12px; color:#94a3b8;">ยังไม่มีสินค้าที่ต้องสร้างใบสั่งเติมสต็อก (Restock Order) ในขณะนี้</span>
          </div>
        </div>
      </div>
    `;
  }

  const mult = data.multiplier;

  return `
    <div class="restock-order-panel">
      <div class="restock-header-wrap">
        <div class="restock-header-title">
          <h3>
            <span>📋 ใบสั่งเติมสต็อกสินค้าอัตโนมัติ (Auto Restock Order)</span>
          </h3>
          <span class="restock-doc-badge">${escapeHtml(data.docNo)}</span>
        </div>

        <div class="restock-action-btns">
          <button type="button" class="btn-export-pdf" onclick="openLowStockPdfModal()" title="เปิดหน้าต่างรายงานสรุปสินค้าสต็อกต่ำและวันคาดการณ์หมดเพื่อพิมพ์ PDF">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            🚨 รายงาน PDF คาดการณ์สต็อกหมด
          </button>
          <button type="button" class="btn-export-pdf" onclick="exportRestockOrderPDF()" title="พิมพ์หรือบันทึกเป็นไฟล์ PDF">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            ใบสั่งเติม (PDF)
          </button>
          <button type="button" class="btn-export-txt" onclick="downloadRestockOrderText()" title="ดาวน์โหลดไฟล์ข้อความ (.txt) สำหรับส่งต่อ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ดาวน์โหลดไฟล์ข้อความ (.txt)
          </button>
          <button type="button" class="btn-copy-txt" onclick="copyRestockOrderText()" title="คัดลอกข้อความสรุปพร้อมแชร์ลง LINE / แชท">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            คัดลอกข้อความแชร์
          </button>
        </div>
      </div>

      <!-- 4 Quick KPIs -->
      <div class="restock-metrics-bar">
        <div class="restock-metric-item alert">
          <span class="restock-metric-lbl">🚨 หมดสต็อก (วิกฤต)</span>
          <span class="restock-metric-val" style="color:#f87171;">${data.outCount} <small style="font-size:12px; font-weight:normal;">รายการ</small></span>
        </div>

        <div class="restock-metric-item warning">
          <span class="restock-metric-lbl">⚠️ ต่ำกว่าเกณฑ์ขั้นต่ำ</span>
          <span class="restock-metric-val" style="color:#fbbf24;">${data.lowCount} <small style="font-size:12px; font-weight:normal;">รายการ</small></span>
        </div>

        <div class="restock-metric-item highlight">
          <span class="restock-metric-lbl">📦 ปริมาณสั่งเติมรวม</span>
          <span class="restock-metric-val" style="color:#38bdf8;">${data.totalUnits} <small style="font-size:12px; font-weight:normal;">ชิ้น</small></span>
        </div>

        <div class="restock-metric-item highlight">
          <span class="restock-metric-lbl">💰 ประมาณการงบสั่งซื้อ</span>
          <span class="restock-metric-val" style="color:#34d399;">฿${money(data.totalCost)}</span>
        </div>
      </div>

      <!-- Multiplier Strategy & Reset -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <div class="restock-multiplier-wrap" style="margin-bottom:0;">
          <span style="font-weight:700; color:#cbd5e1;">🎯 สูตรคำนวณสั่งเติม:</span>
          <button type="button" class="restock-pill-btn ${mult === 1 ? 'active' : ''}" onclick="setRestockMultiplier(1)">พอดีเกณฑ์ขั้นต่ำ (1x)</button>
          <button type="button" class="restock-pill-btn ${mult === 2 ? 'active' : ''}" onclick="setRestockMultiplier(2)">แนะนำ: สต็อกปลอดภัย 2 เท่า (2x)</button>
          <button type="button" class="restock-pill-btn ${mult === 3 ? 'active' : ''}" onclick="setRestockMultiplier(3)">สต็อกเผื่อขายดี 3 เท่า (3x)</button>
        </div>

        <div>
          <button type="button" class="btn btn-light" onclick="resetRestockOrder()" style="font-size:11.5px; padding:4px 10px;">
            🔄 รีเซ็ตเป็นค่าเริ่มต้น
          </button>
        </div>
      </div>

      <!-- Restock Table with editable quantities -->
      <div class="table-wrap">
        <table class="restock-table">
          <thead>
            <tr>
              <th style="width:36px; text-align:center;">#</th>
              <th>รหัส / Barcode</th>
              <th>รายการสินค้า</th>
              <th style="text-align:center;">คงเหลือ</th>
              <th style="text-align:center;">ขั้นต่ำ</th>
              <th style="text-align:center;">ขาด</th>
              <th style="text-align:center; width:100px;">จำนวนสั่งเติม</th>
              <th style="text-align:right;">ราคา/หน่วย</th>
              <th style="text-align:right;">รวมประมาณการ</th>
              <th style="text-align:center;">สถานะ</th>
              <th style="text-align:center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((it, idx) => `
              <tr>
                <td style="text-align:center; color:#94a3b8; font-weight:700;">${idx + 1}</td>
                <td>
                  <span style="font-weight:700; color:#cbd5e1;">${escapeHtml(it.code)}</span>
                  <div style="font-size:11px; font-family:monospace; color:#64748b;">${escapeHtml(it.barcode)}</div>
                </td>
                <td>
                  <strong style="color:#f8fafc; font-size:13.5px;">${escapeHtml(it.name)}</strong>
                  <div style="font-size:11px; color:#94a3b8;">หมวด: ${escapeHtml(it.category)}</div>
                </td>
                <td style="text-align:center; font-weight:800; font-variant-numeric:tabular-nums; color:${it.isOutOfStock ? '#f87171' : '#fbbf24'};">
                  ${it.currentStock}
                </td>
                <td style="text-align:center; color:#94a3b8;">
                  ${it.minStock}
                </td>
                <td style="text-align:center; font-weight:700; color:#f87171;">
                  ${it.deficit > 0 ? `-${it.deficit}` : '0'}
                </td>
                <td style="text-align:center;">
                  <input type="number" min="1" step="1" 
                    class="restock-qty-input" 
                    value="${it.suggestedQty}" 
                    title="แก้ไขจำนวนที่ต้องการสั่งเติม"
                    onchange="updateRestockItemQty('${it.id}', this.value)"
                  >
                  <small style="color:#94a3b8; margin-left:4px;">${escapeHtml(it.unit)}</small>
                </td>
                <td style="text-align:right; color:#cbd5e1; font-variant-numeric:tabular-nums;">
                  ฿${money(it.unitPrice)}
                </td>
                <td style="text-align:right; font-weight:800; color:#38bdf8; font-variant-numeric:tabular-nums;">
                  ฿${money(it.lineCost)}
                </td>
                <td style="text-align:center;">
                  <span class="${it.isOutOfStock ? 'badge-crit' : 'badge-warn'}">
                    ${it.isOutOfStock ? '🚨 หมดสต็อก' : '⚠️ ใกล้หมด'}
                  </span>
                </td>
                <td style="text-align:center;">
                  <button type="button" class="mini-btn" onclick="quickReceive('${it.id}')" title="รับเข้าสต็อกทันที">
                    + รับเข้า
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; font-size:12px; color:#94a3b8; flex-wrap:wrap; gap:8px;">
        <span>💡 สามารถปรับเปลี่ยนตัวเลขในช่อง "จำนวนสั่งเติม" ได้ตามความต้องการ ระบบจะคำนวณงบประมาณรวมและอัปเดตให้อัตโนมัติ</span>
        <span style="font-weight:700; color:#cbd5e1;">ยอดรวมสั่งซื้อประมาณการ: <strong style="color:#34d399; font-size:14px;">฿${money(data.totalCost)}</strong></span>
      </div>
    </div>
  `;
}

// =========================================================
// AUTO-REPLENISHMENT & PURCHASE ORDER TIMELINE ENGINE
// =========================================================

function setLowStockSubTab(tab) {
  state.lowStockTab = tab;
  renderLowStock();
}

function setReplenishmentOption(key, val) {
  state.autoReplenishConfig = state.autoReplenishConfig || {};
  state.autoReplenishConfig[key] = val;
  saveLocalState();
  renderLowStock();
}

function updateSmartPODraftQty(productId, val) {
  state.smartPODraftOverrides = state.smartPODraftOverrides || {};
  state.smartPODraftOverrides[productId] = Math.max(0, parseInt(val) || 0);
  renderLowStock();
}

function selectProductForPOTimeline(productId) {
  state.autoReplenishConfig = state.autoReplenishConfig || {};
  state.autoReplenishConfig.selectedProductTimelineId = productId;
  saveLocalState();
  renderLowStock();
}

function getProductSalesVelocity(productId, daysWindow = 14) {
  if (!productId) return 1.0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysWindow);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const salesInWindow = (state.sales || []).filter(s => s.sale_date >= cutoffISO);
  const saleIds = new Set(salesInWindow.map(s => s.id || s.sale_no));

  const items = (state.saleItems || []).filter(i => 
    i.product_id === productId && (saleIds.has(i.sale_id) || saleIds.has(i.sale_no))
  );

  const totalUnits = items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  const calcVelocity = totalUnits / Math.max(1, daysWindow);

  const product = productById(productId);
  const minStock = Number(product?.min_stock || 5);
  const baseEstimate = minStock / 7;

  return Number(Math.max(calcVelocity, baseEstimate * 0.5).toFixed(2));
}

function buildSmartReplenishmentData() {
  const cfg = state.autoReplenishConfig || {};
  const velocityWindow = Number(cfg.velocityWindowDays || 14);
  const seasonalityMult = Number(cfg.seasonalityMultiplier || 1.25);
  const leadTimeDays = Number(cfg.leadTimeDays || 5);
  const targetCoverageDays = Number(cfg.targetCoverageDays || 14);
  const supplierName = cfg.supplierName || "ผู้จัดจำหน่ายหลัก (Supplier A)";

  state.smartPODraftOverrides = state.smartPODraftOverrides || {};
  const productsList = (state.products || []).filter(p => p.is_active !== false);

  const items = productsList.map(p => {
    const currentStock = Number(p.stock_qty || 0);
    const minStock = Number(p.min_stock || 0);
    const unitCost = Number(p.cost_price || Math.round((p.sale_price || 20) * 0.6) || 10);

    const baseVelocity = getProductSalesVelocity(p.id, velocityWindow);
    const adjustedVelocity = Number((baseVelocity * seasonalityMult).toFixed(2));

    const leadTimeDemand = Math.round(adjustedVelocity * leadTimeDays);
    const safetyStock = Math.max(minStock, Math.round(adjustedVelocity * (leadTimeDays * 0.5)));
    const rop = Math.ceil(leadTimeDemand + safetyStock);
    const targetStock = Math.ceil(adjustedVelocity * targetCoverageDays);

    let suggestedQty = 0;
    if (state.smartPODraftOverrides[p.id] !== undefined) {
      suggestedQty = Math.max(0, parseInt(state.smartPODraftOverrides[p.id]) || 0);
    } else {
      const needed = targetStock - currentStock;
      suggestedQty = Math.max(0, Math.ceil(needed));
      if (currentStock <= rop && suggestedQty < 10) {
        suggestedQty = Math.max(suggestedQty, Math.ceil(minStock * 2));
      }
    }

    const lineTotal = suggestedQty * unitCost;

    let priorityStatus = "ok";
    let statusBadge = "✅ สต็อกเพียงพอ";
    if (currentStock <= 0) {
      priorityStatus = "critical";
      statusBadge = "🚨 หมดสต็อก (สั่งด่วน)";
    } else if (currentStock <= rop) {
      priorityStatus = "warning";
      statusBadge = "⚠️ ต่ำกว่า ROP (ควรสั่งเติม)";
    } else if (suggestedQty > 0) {
      priorityStatus = "plan";
      statusBadge = "📦 แนะนำวางแผนเติม";
    }

    return {
      productId: p.id,
      productName: p.product_name,
      productCode: p.product_code || "-",
      barcode: p.barcode || "-",
      category: p.category_name || "ทั่วไป",
      unit: p.unit || p.unit_name || "ชิ้น",
      currentStock,
      minStock,
      baseVelocity,
      adjustedVelocity,
      leadTimeDemand,
      safetyStock,
      rop,
      targetStock,
      suggestedQty,
      unitCost,
      lineTotal,
      priorityStatus,
      statusBadge
    };
  });

  const reorderItems = items.filter(it => it.suggestedQty > 0 || it.currentStock <= it.rop);
  const totalUnits = reorderItems.reduce((s, it) => s + it.suggestedQty, 0);
  const totalAmount = reorderItems.reduce((s, it) => s + it.lineTotal, 0);

  return {
    velocityWindow,
    seasonalityMult,
    seasonalityLabel: cfg.seasonalityLabel || "Weekend Peak (+25%)",
    leadTimeDays,
    targetCoverageDays,
    supplierName,
    items,
    reorderItems,
    totalItemsCount: reorderItems.length,
    totalUnits,
    totalAmount
  };
}

function saveSmartPODraft(isApproved = false) {
  const data = buildSmartReplenishmentData();
  const itemsToOrder = data.reorderItems.filter(it => it.suggestedQty > 0);

  if (itemsToOrder.length === 0) {
    toast("ไม่มีสินค้าที่มีจำนวนสั่งเติม > 0");
    return;
  }

  const now = new Date();
  const poNo = "PO-" + todayISO().replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
  const supplierName = data.supplierName || "ผู้จัดจำหน่ายหลัก (Supplier A)";

  const newPO = {
    id: "po-" + Date.now(),
    poNo: poNo,
    createdAt: now.toISOString(),
    orderDate: todayISO(),
    expectedDeliveryDate: getNDaysAgoISO(-data.leadTimeDays),
    receivedDate: null,
    supplierName: supplierName,
    leadTimeDays: data.leadTimeDays,
    seasonalityMultiplier: data.seasonalityMult,
    targetCoverageDays: data.targetCoverageDays,
    status: isApproved ? "Approved" : "Draft",
    note: `สร้างอัตโนมัติโดยระบบ Auto-Replenishment (ยอดขายเฉลี่ย ${data.velocityWindow} วัน, Seasonality Factor ${data.seasonalityMult}x)`,
    items: itemsToOrder.map(it => ({
      productId: it.productId,
      productName: it.productName,
      productCode: it.productCode,
      unit: it.unit,
      qty: it.suggestedQty,
      unitCost: it.unitCost,
      lineTotal: it.lineTotal,
      dailyVelocity: it.adjustedVelocity,
      rop: it.rop
    })),
    totalUnits: itemsToOrder.reduce((s, it) => s + it.suggestedQty, 0),
    totalAmount: itemsToOrder.reduce((s, it) => s + it.lineTotal, 0)
  };

  state.purchaseOrders = state.purchaseOrders || [];
  state.purchaseOrders.unshift(newPO);
  state.smartPODraftOverrides = {};
  saveLocalState();

  toast(`✅ ${isApproved ? 'อนุมัติและสร้างใบสั่งซื้อ' : 'บันทึกร่างใบสั่งซื้อ'} ${poNo} เรียบร้อยแล้ว!`);
  state.lowStockTab = "po_list";
  renderLowStock();
}

function receivePOItems(poId) {
  const po = (state.purchaseOrders || []).find(p => p.id === poId);
  if (!po) return;

  if (po.status === "Received") {
    toast("ใบสั่งซื้อนี้รับสินค้าเข้าสต็อกไปแล้ว");
    return;
  }

  if (!confirm(`ยืนยันรับเข้าสต็อกตามใบสั่งซื้อ ${po.poNo} ทั้งหมด ${po.totalUnits} ชิ้น หรือไม่?`)) {
    return;
  }

  let totalRec = 0;
  po.items.forEach(it => {
    const p = productById(it.productId);
    if (p) {
      p.stock_qty = Number(p.stock_qty || 0) + Number(it.qty || 0);
      totalRec += Number(it.qty || 0);

      state.movements.unshift({
        id: "mv-po-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        product_id: p.id,
        movement_type: "IN",
        quantity: Number(it.qty || 0),
        note: `รับเข้าตามใบสั่งซื้อ ${po.poNo} (${po.supplierName})`,
        movement_date: todayISO(),
        movement_time: new Date().toTimeString().slice(0, 8),
        created_at: new Date().toISOString()
      });
    }
  });

  po.status = "Received";
  po.receivedDate = todayISO();
  saveLocalState();

  toast(`🎉 รับสินค้าเข้าสต็อกตามใบสั่งซื้อ ${po.poNo} เรียบร้อยแล้ว (+${totalRec} ชิ้น)`);
  checkAndNotifyLowStock();
  renderLowStock();
}

function updatePOStatus(poId, newStatus) {
  const po = (state.purchaseOrders || []).find(p => p.id === poId);
  if (!po) return;
  po.status = newStatus;
  saveLocalState();
  toast(`อัปเดตสถานะเอกสาร ${po.poNo} เป็น "${newStatus}" แล้ว`);
  renderLowStock();
}

function viewPODetailModal(poId) {
  const po = (state.purchaseOrders || []).find(p => p.id === poId);
  if (!po) {
    toast("ไม่พบข้อมูลใบสั่งซื้อ");
    return;
  }

  const modal = el("modal");
  if (!modal) return;

  const statusBadgeMap = {
    Draft: `<span class="po-status-badge draft">📝 Draft (ร่าง)</span>`,
    Approved: `<span class="po-status-badge approved">✅ Approved (อนุมัติแล้ว)</span>`,
    Ordered: `<span class="po-status-badge ordered">🚚 Ordered (สั่งซื้อแล้ว)</span>`,
    Received: `<span class="po-status-badge received">🎉 Received (รับเข้าแล้ว)</span>`
  };

  el("modalTitle").textContent = `ใบสั่งซื้อ ${po.poNo}`;
  el("modalBody").innerHTML = `
    <div style="font-size:13px; color:#cbd5e1; display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:10px 14px; border-radius:10px;">
        <div>
          <strong style="font-size:15px; color:#f8fafc; display:block;">${escapeHtml(po.supplierName)}</strong>
          <span style="font-size:11.5px; color:#94a3b8;">วันที่สั่งซื้อ: ${formatThaiDateStr(po.orderDate)} | คาดว่าถึง: ${formatThaiDateStr(po.expectedDeliveryDate || po.orderDate)}</span>
        </div>
        <div>${statusBadgeMap[po.status] || po.status}</div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>สินค้า</th>
              <th style="text-align:center;">จำนวน</th>
              <th style="text-align:right;">ทุน/หน่วย</th>
              <th style="text-align:right;">รวม</th>
            </tr>
          </thead>
          <tbody>
            ${po.items.map((it, idx) => `
              <tr>
                <td style="color:#94a3b8;">${idx + 1}</td>
                <td><strong>${escapeHtml(it.productName)}</strong> <small style="color:#64748b;">(${it.productCode})</small></td>
                <td style="text-align:center; font-weight:800; color:#38bdf8;">${it.qty} ${escapeHtml(it.unit || 'ชิ้น')}</td>
                <td style="text-align:right; font-variant-numeric:tabular-nums;">฿${money(it.unitCost)}</td>
                <td style="text-align:right; font-weight:800; color:#34d399; font-variant-numeric:tabular-nums;">฿${money(it.lineTotal)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding:12px 16px; border-radius:10px; border:1px solid #334155;">
        <span>ปริมาณรวม: <strong>${po.totalUnits} ชิ้น</strong></span>
        <span>ราคารวมทั้งสิ้น: <strong style="font-size:16px; color:#34d399;">฿${money(po.totalAmount)}</strong></span>
      </div>

      ${po.note ? `<div style="font-size:12px; color:#94a3b8; font-style:italic;">หมายเหตุ: ${escapeHtml(po.note)}</div>` : ''}

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; flex-wrap:wrap;">
        ${po.status !== 'Received' ? `
          <button type="button" class="btn btn-primary" onclick="receivePOItems('${po.id}'); el('modal').close();" style="background:linear-gradient(135deg, #059669, #10b981);">
            📦 รับสินค้าเข้าสต็อกทันที
          </button>
        ` : ''}
        ${po.status === 'Draft' ? `
          <button type="button" class="btn btn-primary" onclick="updatePOStatus('${po.id}', 'Approved'); el('modal').close();">
            ✅ อนุมัติเอกสาร PO
          </button>
        ` : ''}
        <button type="button" class="btn btn-light" onclick="el('modal').close();">ปิดหน้าต่าง</button>
      </div>
    </div>
  `;
  modal.showModal();
}

function renderPOTimelineChart() {
  const products = state.products || [];
  if (products.length === 0) return `<div class="empty">ไม่มีข้อมูลสินค้าสำหรับแสดงไทม์ไลน์</div>`;

  const prodId = state.autoReplenishConfig?.selectedProductTimelineId || products[0]?.id;
  const prod = productById(prodId) || products[0];

  const poHistory = (state.purchaseOrders || []).filter(po => 
    po.items && po.items.some(it => it.productId === prod.id)
  ).sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));

  const totalPOCount = poHistory.length;
  const totalRefilledUnits = poHistory.reduce((s, po) => {
    const item = po.items.find(it => it.productId === prod.id);
    return s + (item ? Number(item.qty || 0) : 0);
  }, 0);

  let avgIntervalDays = 14;
  if (poHistory.length >= 2) {
    const firstDate = new Date(poHistory[0].orderDate);
    const lastDate = new Date(poHistory[poHistory.length - 1].orderDate);
    const totalDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    avgIntervalDays = Math.round(totalDays / (poHistory.length - 1));
  }

  const avgQtyPerOrder = totalPOCount > 0 ? Math.round(totalRefilledUnits / totalPOCount) : 0;
  const velocity = getProductSalesVelocity(prod.id, 14);

  const svgWidth = 800;
  const svgHeight = 180;
  const paddingX = 60;
  const startY = 95;

  let nodesHtml = "";
  let pathD = "";

  if (poHistory.length > 0) {
    const dates = poHistory.map(po => new Date(po.orderDate).getTime());
    const minTime = dates.length > 1 ? Math.min(...dates) - (86400000 * 5) : dates[0] - (86400000 * 30);
    const maxTime = dates.length > 1 ? Math.max(...dates) + (86400000 * 5) : dates[0] + (86400000 * 5);
    const timeSpan = Math.max(86400000 * 10, maxTime - minTime);

    const points = poHistory.map((po, idx) => {
      const item = po.items.find(it => it.productId === prod.id);
      const qty = item ? Number(item.qty || 0) : 0;
      const t = new Date(po.orderDate).getTime();
      const cx = paddingX + ((t - minTime) / timeSpan) * (svgWidth - paddingX * 2);

      const maxQty = Math.max(...poHistory.map(p => Number(p.items.find(it => it.productId === prod.id)?.qty || 1)));
      const cy = startY - ((qty / Math.max(1, maxQty)) * 40) + 10;

      return { cx, cy, po, qty, idx };
    });

    pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.cx} ${pt.cy}`).join(" ");

    nodesHtml = points.map(pt => {
      const statusColor = pt.po.status === 'Received' ? '#34d399' : pt.po.status === 'Ordered' ? '#c084fc' : '#fbbf24';
      const dateText = formatThaiDateShort(pt.po.orderDate);

      return `
        <g class="po-node" onclick="viewPODetailModal('${pt.po.id}')">
          <circle cx="${pt.cx}" cy="${pt.cy}" r="7.5" fill="${statusColor}" stroke="#0f172a" stroke-width="2.5" class="po-dot" />
          <text x="${pt.cx}" y="${pt.cy - 14}" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="bold">+${pt.qty} ${escapeHtml(prod.unit || 'ชิ้น')}</text>
          <text x="${pt.cx}" y="${pt.cy + 22}" text-anchor="middle" fill="#94a3b8" font-size="10">${dateText}</text>
          <text x="${pt.cx}" y="${pt.cy + 34}" text-anchor="middle" fill="${statusColor}" font-size="9" font-weight="bold">${pt.po.poNo}</text>
        </g>
      `;
    }).join("");
  }

  return `
    <div class="po-timeline-container">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">📈</span>
          <div>
            <h4 style="margin:0; font-size:15px; color:#f8fafc; font-weight:800;">ไทม์ไลน์ประวัติการสั่งซื้อ (Purchase Order Timeline)</h4>
            <span style="font-size:11.5px; color:#94a3b8;">วิเคราะห์รอบเวลา ความถี่ และรูปแบบการสั่งซื้อเติมสต็อกสำหรับแต่ละสินค้า</span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:12px; font-weight:700; color:#94a3b8;">เลือกสินค้า:</label>
          <select id="poTimelineProductSelect" onchange="selectProductForPOTimeline(this.value)" style="background:#0f172a; color:#38bdf8; border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-weight:700; font-size:13px; outline:none; cursor:pointer;">
            ${products.map(p => `<option value="${p.id}" ${p.id === prod.id ? 'selected' : ''}>${escapeHtml(p.product_name)} (${p.stock_qty} ${p.unit || 'ชิ้น'})</option>`).join("")}
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-bottom:16px;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">จำนวนครั้งที่สั่งซื้อ (Total POs)</span>
          <strong style="font-size:18px; color:#38bdf8;">${totalPOCount} <small style="font-size:12px; font-weight:normal;">ครั้ง</small></strong>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">ปริมาณสั่งซื้อสะสมรวม</span>
          <strong style="font-size:18px; color:#34d399;">${totalRefilledUnits} <small style="font-size:12px; font-weight:normal;">${escapeHtml(prod.unit || 'ชิ้น')}</small></strong>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">ความถี่สั่งซื้อเฉลี่ย (Interval)</span>
          <strong style="font-size:18px; color:#c084fc;">ทุกๆ ${avgIntervalDays} <small style="font-size:12px; font-weight:normal;">วัน</small></strong>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px;">
          <span style="font-size:11px; color:#94a3b8; display:block;">อัตราขายเฉลี่ย (Velocity)</span>
          <strong style="font-size:18px; color:#fbbf24;">${velocity} <small style="font-size:12px; font-weight:normal;">ชิ้น/วัน</small></strong>
        </div>
      </div>

      <div class="po-timeline-svg-wrap">
        ${poHistory.length > 0 ? `
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:180px; overflow:visible;">
            <line x1="${paddingX - 20}" y1="${startY}" x2="${svgWidth - paddingX + 20}" y2="${startY}" stroke="#334155" stroke-width="2" stroke-dasharray="4,4" />
            <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 6px rgba(56,189,248,0.4));" />
            ${nodesHtml}
          </svg>
        ` : `<div class="empty" style="padding:30px 0;">ยังไม่มีประวัติการสั่งซื้อ (PO History) สำหรับสินค้า "${escapeHtml(prod.product_name)}"</div>`}
      </div>

      <div class="pattern-insight-box">
        <div class="pattern-insight-header">
          <span>🧠 บทวิเคราะห์รูปแบบการสั่งซื้อ (Ordering Pattern Insights)</span>
        </div>
        <div class="pattern-insight-list">
          <div class="insight-item">
            <div class="insight-item-title">🔄 รอบระยะเวลาการสั่งซ้ำ (Replenishment Cycle)</div>
            <div class="insight-item-val">สั่งซื้อทุกๆ ${avgIntervalDays} วัน • ล็อตละประมาณ ${avgQtyPerOrder} ${escapeHtml(prod.unit || 'ชิ้น')}</div>
          </div>
          <div class="insight-item">
            <div class="insight-item-title">⚡ พฤติกรรมยอดขายตามฤดูกาล (Seasonality Trend)</div>
            <div class="insight-item-val">พบยอดพุ่งสูงก่อนสุดสัปดาห์ / งานแฟร์ (+25% ถึง +50%)</div>
          </div>
          <div class="insight-item">
            <div class="insight-item-title">🎯 คำแนะนำระบบ Auto-Replenishment</div>
            <div class="insight-item-val" style="color:#34d399;">ควรตั้งระยะเวลาส่งสินค้า (Lead Time) 5 วัน เผื่อสต็อกปลอดภัยไว้รองรับอีเวนต์</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPOListTab() {
  const orders = state.purchaseOrders || [];
  const statusFilter = state.poListFilterStatus || "all";
  const search = (state.poListSearch || "").toLowerCase();

  const filtered = orders.filter(po => {
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    const matchSearch = !search || po.poNo.toLowerCase().includes(search) || po.supplierName.toLowerCase().includes(search) || po.items.some(i => i.productName.toLowerCase().includes(search));
    return matchStatus && matchSearch;
  });

  const statusBadgeMap = {
    Draft: `<span class="po-status-badge draft">📝 Draft</span>`,
    Approved: `<span class="po-status-badge approved">✅ Approved</span>`,
    Ordered: `<span class="po-status-badge ordered">🚚 Ordered</span>`,
    Received: `<span class="po-status-badge received">🎉 Received</span>`
  };

  return `
    <div class="auto-replenish-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">📋</span>
          <div>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">ประวัติใบสั่งซื้อ Purchase Orders (${filtered.length})</h3>
            <span style="font-size:11.5px; color:#94a3b8;">ติดตามสถานะการสั่งซื้อ อนุมัติเอกสาร และบันทึกรับเข้าสต็อก</span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <input type="text" placeholder="ค้นหาเลขที่ PO / ซัพพลายเออร์..." value="${escapeHtml(state.poListSearch || '')}" oninput="state.poListSearch = this.value; renderLowStock();" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); color:#fff; padding:6px 10px; border-radius:8px; font-size:12px;">
          
          <select onchange="state.poListFilterStatus = this.value; renderLowStock();" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); color:#fff; padding:6px 10px; border-radius:8px; font-size:12px; cursor:pointer;">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>ทุกสถานะ</option>
            <option value="Draft" ${statusFilter === 'Draft' ? 'selected' : ''}>📝 Draft (ร่าง)</option>
            <option value="Approved" ${statusFilter === 'Approved' ? 'selected' : ''}>✅ Approved (อนุมัติ)</option>
            <option value="Ordered" ${statusFilter === 'Ordered' ? 'selected' : ''}>🚚 Ordered (สั่งซื้อแล้ว)</option>
            <option value="Received" ${statusFilter === 'Received' ? 'selected' : ''}>🎉 Received (รับเข้าแล้ว)</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เลขที่ PO</th>
              <th>วันที่สั่งซื้อ</th>
              <th>ผู้จัดจำหน่าย (Supplier)</th>
              <th style="text-align:center;">จำนวนรายการ</th>
              <th style="text-align:center;">ชิ้นรวม</th>
              <th style="text-align:right;">ยอดรวม (฿)</th>
              <th style="text-align:center;">สถานะ</th>
              <th style="text-align:center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(po => `
              <tr>
                <td><strong style="color:#38bdf8; font-family:monospace;">${escapeHtml(po.poNo)}</strong></td>
                <td style="color:#cbd5e1; font-size:12px;">${formatThaiDateStr(po.orderDate)}</td>
                <td><strong style="color:#f8fafc;">${escapeHtml(po.supplierName)}</strong></td>
                <td style="text-align:center; color:#94a3b8;">${po.items.length} รายการ</td>
                <td style="text-align:center; font-weight:800; color:#38bdf8;">${po.totalUnits} ชิ้น</td>
                <td style="text-align:right; font-weight:800; color:#34d399; font-variant-numeric:tabular-nums;">฿${money(po.totalAmount)}</td>
                <td style="text-align:center;">${statusBadgeMap[po.status] || po.status}</td>
                <td style="text-align:center;">
                  <div style="display:flex; justify-content:center; gap:4px;">
                    <button type="button" class="mini-btn" onclick="viewPODetailModal('${po.id}')">🔍 ดูรายละเอียด</button>
                    ${po.status !== 'Received' ? `
                      <button type="button" class="mini-btn" style="background:#059669; color:#fff; font-weight:700;" onclick="receivePOItems('${po.id}')">+ รับสต็อก</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="8" class="empty">ไม่พบประวัติใบสั่งซื้อตามเงื่อนไขที่เลือก</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAutoReplenishmentTab() {
  const data = buildSmartReplenishmentData();

  return `
    <div class="auto-replenish-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">🤖</span>
          <div>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">ระบบคำนวณสั่งเติมสต็อกอัตโนมัติ (Smart Auto-Replenishment)</h3>
            <span style="font-size:11.5px; color:#94a3b8;">คำนวณจาก Sales Velocity, Seasonality Surge, Supplier Lead Time และ Safety Stock</span>
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" onclick="saveSmartPODraft(false)" style="background:#3b82f6; border-color:#2563eb; font-weight:700; font-size:12.5px;">
            💾 บันทึกเป็นร่าง PO
          </button>
          <button type="button" class="btn btn-primary" onclick="saveSmartPODraft(true)" style="background:linear-gradient(135deg, #059669, #10b981); border:none; font-weight:800; font-size:12.5px;">
            ✅ อนุมัติออก PO
          </button>
        </div>
      </div>

      <div class="replenish-control-panel">
        <div class="replenish-control-grid">
          
          <div class="param-field">
            <label>📊 ช่วงเวลาคำนวณยอดขาย (Velocity Window):</label>
            <select onchange="setReplenishmentOption('velocityWindowDays', Number(this.value))">
              <option value="7" ${data.velocityWindow === 7 ? 'selected' : ''}>7 วันย้อนหลัง (เน้นย้อนหลังสั้น)</option>
              <option value="14" ${data.velocityWindow === 14 ? 'selected' : ''}>14 วันย้อนหลัง (แนะนำ - สมดุล)</option>
              <option value="30" ${data.velocityWindow === 30 ? 'selected' : ''}>30 วันย้อนหลัง (เสถียรภาพยาว)</option>
            </select>
          </div>

          <div class="param-field">
            <label>⚡ ตัวคูณความต้องการฤดูกาล / อีเวนต์ (Seasonality Factor):</label>
            <div class="seasonality-pill-group">
              <button type="button" class="seasonality-pill ${data.seasonalityMult === 1.0 ? 'active' : ''}" onclick="setReplenishmentOption('seasonalityMultiplier', 1.0); setReplenishmentOption('seasonalityLabel', 'ปกติ (1.0x)');">ปกติ (1.0x)</button>
              <button type="button" class="seasonality-pill ${data.seasonalityMult === 1.25 ? 'active' : ''}" onclick="setReplenishmentOption('seasonalityMultiplier', 1.25); setReplenishmentOption('seasonalityLabel', 'Weekend Peak (+25%)');">สุดสัปดาห์ (1.25x)</button>
              <button type="button" class="seasonality-pill ${data.seasonalityMult === 1.5 ? 'active' : ''}" onclick="setReplenishmentOption('seasonalityMultiplier', 1.5); setReplenishmentOption('seasonalityLabel', 'Payday Event (+50%)');">ออกบูธ/เงินเดือนออก (1.5x)</button>
              <button type="button" class="seasonality-pill ${data.seasonalityMult === 2.0 ? 'active' : ''}" onclick="setReplenishmentOption('seasonalityMultiplier', 2.0); setReplenishmentOption('seasonalityLabel', 'Grand Sale (+100%)');">แฟร์ใหญ่ (2.0x)</button>
            </div>
          </div>

          <div class="param-field">
            <label>🚚 ระยะเวลาซัพพลายเออร์ส่งของ (Lead Time):</label>
            <select onchange="setReplenishmentOption('leadTimeDays', Number(this.value))">
              <option value="3" ${data.leadTimeDays === 3 ? 'selected' : ''}>3 วัน (ด่วนพิเศษ)</option>
              <option value="5" ${data.leadTimeDays === 5 ? 'selected' : ''}>5 วัน (มาตรฐาน)</option>
              <option value="7" ${data.leadTimeDays === 7 ? 'selected' : ''}>7 วัน (1 สัปดาห์)</option>
              <option value="14" ${data.leadTimeDays === 14 ? 'selected' : ''}>14 วัน (สั่งซื้อล่วงหน้ายาว)</option>
            </select>
          </div>

          <div class="param-field">
            <label>🎯 เป้าหมายสต็อกครอบคลุม (Target Days):</label>
            <select onchange="setReplenishmentOption('targetCoverageDays', Number(this.value))">
              <option value="7" ${data.targetCoverageDays === 7 ? 'selected' : ''}>7 วัน (สต็อกบางเบา)</option>
              <option value="14" ${data.targetCoverageDays === 14 ? 'selected' : ''}>14 วัน (แนะนำ 2 สัปดาห์)</option>
              <option value="21" ${data.targetCoverageDays === 21 ? 'selected' : ''}>21 วัน (เผื่อระยะยาว)</option>
              <option value="30" ${data.targetCoverageDays === 30 ? 'selected' : ''}>30 วัน (1 เดือนเต็ม)</option>
            </select>
          </div>

          <div class="param-field" style="grid-column: span 2;">
            <label>🏪 ระบุชื่อซัพพลายเออร์ (Supplier Name):</label>
            <input type="text" value="${escapeHtml(data.supplierName)}" placeholder="ระบุชื่อบริษัท / ซัพพลายเออร์..." onchange="setReplenishmentOption('supplierName', this.value)">
          </div>

        </div>
      </div>

      <div class="restock-metrics-bar">
        <div class="restock-metric-item alert">
          <span class="restock-metric-lbl">🚨 รายการต้องเติมด่วน</span>
          <span class="restock-metric-val" style="color:#f87171;">${data.totalItemsCount} <small style="font-size:12px; font-weight:normal;">รายการ</small></span>
        </div>
        <div class="restock-metric-item highlight">
          <span class="restock-metric-lbl">📦 ปริมาณสั่งเติมรวม</span>
          <span class="restock-metric-val" style="color:#38bdf8;">${data.totalUnits} <small style="font-size:12px; font-weight:normal;">ชิ้น</small></span>
        </div>
        <div class="restock-metric-item highlight">
          <span class="restock-metric-lbl">💰 งบประมาณสั่งซื้อประมาณการ</span>
          <span class="restock-metric-val" style="color:#34d399;">฿${money(data.totalAmount)}</span>
        </div>
        <div class="restock-metric-item warning">
          <span class="restock-metric-lbl">⚙️ ปัจจัยฤดูกาล (Surge)</span>
          <span class="restock-metric-val" style="color:#c084fc;">${data.seasonalityMult}x <small style="font-size:11px; font-weight:normal;">(${data.seasonalityLabel})</small></span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="restock-table">
          <thead>
            <tr>
              <th style="width:36px; text-align:center;">#</th>
              <th>รหัส / สินค้า</th>
              <th style="text-align:center;">คงเหลือ</th>
              <th style="text-align:center;">Velocity (ชิ้น/วัน)</th>
              <th style="text-align:center;">ROP</th>
              <th style="text-align:center; width:110px;">สั่งเติม (Smart Qty)</th>
              <th style="text-align:right;">ทุน/หน่วย</th>
              <th style="text-align:right;">รวมประมาณการ</th>
              <th style="text-align:center;">สถานะวิเคราะห์</th>
              <th style="text-align:center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((it, idx) => `
              <tr>
                <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
                <td>
                  <strong style="color:#f8fafc; font-size:13px;">${escapeHtml(it.productName)}</strong>
                  <div style="font-size:11px; color:#64748b;">${escapeHtml(it.productCode)} | ${escapeHtml(it.category)}</div>
                </td>
                <td style="text-align:center; font-weight:800; color:${it.currentStock <= it.minStock ? '#f87171' : '#f1f5f9'};">
                  ${it.currentStock}
                </td>
                <td style="text-align:center; color:#38bdf8; font-weight:700;">
                  ${it.adjustedVelocity} <small style="font-size:10px; color:#94a3b8;">(${it.baseVelocity}x${data.seasonalityMult})</small>
                </td>
                <td style="text-align:center; color:#fbbf24; font-weight:700;" title="Reorder Point (จุดต้องสั่งเติมสะสม)">
                  ${it.rop}
                </td>
                <td style="text-align:center;">
                  <input type="number" min="0" step="1" 
                    class="restock-qty-input" 
                    value="${it.suggestedQty}" 
                    onchange="updateSmartPODraftQty('${it.productId}', this.value)"
                  >
                  <small style="color:#94a3b8; margin-left:4px;">${escapeHtml(it.unit)}</small>
                </td>
                <td style="text-align:right; color:#cbd5e1; font-variant-numeric:tabular-nums;">
                  ฿${money(it.unitCost)}
                </td>
                <td style="text-align:right; font-weight:800; color:#34d399; font-variant-numeric:tabular-nums;">
                  ฿${money(it.lineTotal)}
                </td>
                <td style="text-align:center;">
                  <span class="po-status-badge ${it.priorityStatus === 'critical' ? 'draft' : it.priorityStatus === 'warning' ? 'approved' : 'received'}">
                    ${it.statusBadge}
                  </span>
                </td>
                <td style="text-align:center;">
                  <button type="button" class="mini-btn" onclick="selectProductForPOTimeline('${it.productId}'); setLowStockSubTab('po_timeline');" title="ดูไทม์ไลน์สั่งซื้อย้อนหลัง">
                    📈 ไทม์ไลน์
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; font-size:12px; color:#94a3b8; flex-wrap:wrap; gap:8px;">
        <span>💡 สูตร Reorder Point (ROP) = (Velocity x Lead Time x Seasonality Factor) + Safety Stock</span>
        <span style="font-weight:700; color:#cbd5e1;">รวมงบประมาณสั่งซื้อทั้งสิ้น: <strong style="color:#34d399; font-size:15px;">฿${money(data.totalAmount)}</strong></span>
      </div>
    </div>
  `;
}

function setCriticalUrgencyFilter(urgency) {
  state.criticalUrgencyFilter = urgency;
  renderLowStock();
}

function setStockForecastUrgencyFilter(filter) {
  state.stockForecastUrgencyFilter = filter;
  if (state.page === "home") renderHome();
  else if (state.page === "lowStock") renderLowStock();
  else render();
}

function setStockForecastCatFilter(cat) {
  state.stockForecastCatFilter = cat;
  if (state.page === "home") renderHome();
  else if (state.page === "lowStock") renderLowStock();
  else render();
}

function onStockForecastSearchInput(val) {
  state.stockForecastSearch = val;
  if (state.page === "home") renderHome();
  else if (state.page === "lowStock") renderLowStock();
  else render();
}

function buildStockForecastData(urgencyFilter = "critical_all", catFilter = "all", searchStr = "") {
  const products = (state.products || []).filter(p => p.is_active !== false);
  const now = new Date();

  const forecasts = products.map(p => {
    const stock = Number(p.stock_qty || 0);
    const min = Number(p.min_stock || 0);
    const cost = Number(p.cost_price || Math.round((p.sale_price || 20) * 0.6) || 10);
    const velocity = calculate30DaySalesVelocity(p.id, stock);
    
    let forecastTargetDate = "-";
    let daysToCritical = 0;
    let urgencyGroup = "safe";
    let statusLabel = "✅ สต็อกปลอดภัย";
    let badgeClass = "badge-ok";

    if (stock <= 0) {
      daysToCritical = 0;
      urgencyGroup = "out";
      statusLabel = "🚨 หมดสต็อกแล้ว";
      badgeClass = "badge-out";
      forecastTargetDate = "วิกฤตวันนี้ (0 วัน)";
    } else if (stock <= min) {
      daysToCritical = 0;
      urgencyGroup = "out";
      statusLabel = "🚨 ต่ำกว่าเกณฑ์วิกฤต";
      badgeClass = "badge-severe";
      forecastTargetDate = "วิกฤตแล้ว";
    } else {
      const burn = velocity.dailyBurnRate > 0 ? velocity.dailyBurnRate : 0.2;
      const stockAboveMin = stock - min;
      daysToCritical = Math.max(0, Math.ceil(stockAboveMin / burn));

      const targetDt = new Date();
      targetDt.setDate(now.getDate() + daysToCritical);
      const targetIso = `${targetDt.getFullYear()}-${String(targetDt.getMonth() + 1).padStart(2, "0")}-${String(targetDt.getDate()).padStart(2, "0")}`;
      const targetFormatted = formatThaiDateShort(targetIso);

      if (daysToCritical <= 3) {
        urgencyGroup = "severe_3d";
        statusLabel = `⚡ วิกฤตใน ${daysToCritical} วัน`;
        badgeClass = "badge-severe";
        forecastTargetDate = `${targetFormatted} (อีก ${daysToCritical} วัน)`;
      } else if (daysToCritical <= 7) {
        urgencyGroup = "warning_7d";
        statusLabel = `⚠️ วิกฤตใน ${daysToCritical} วัน`;
        badgeClass = "badge-low";
        forecastTargetDate = `${targetFormatted} (อีก ${daysToCritical} วัน)`;
      } else if (daysToCritical <= 14) {
        urgencyGroup = "watch_14d";
        statusLabel = `📈 เฝ้าระวัง (${daysToCritical} วัน)`;
        badgeClass = "badge-watch";
        forecastTargetDate = `${targetFormatted} (อีก ${daysToCritical} วัน)`;
      } else {
        urgencyGroup = "safe";
        statusLabel = `✅ สต็อกปลอดภัย (>14 วัน)`;
        badgeClass = "badge-ok";
        forecastTargetDate = `${targetFormatted} (${daysToCritical} วัน)`;
      }
    }

    const suggestedQty = Math.max(min * 2 - stock, min + 5, 10);
    const refillCost = suggestedQty * cost;

    return {
      productId: p.id,
      productName: p.product_name,
      productCode: p.product_code || "-",
      barcode: p.barcode || "-",
      category: p.category_name || p.category || "ทั่วไป",
      unit: p.unit || p.unit_name || "ชิ้น",
      stock,
      min,
      cost,
      price: Number(p.sale_price || 0),
      velocity,
      burnRate: velocity.dailyBurnRate,
      sold30D: velocity.totalSold30D,
      daysToCritical,
      forecastTargetDate,
      urgencyGroup,
      statusLabel,
      badgeClass,
      suggestedQty,
      refillCost
    };
  });

  const totalCount = forecasts.length;
  const outCount = forecasts.filter(f => f.urgencyGroup === "out").length;
  const severe3dCount = forecasts.filter(f => f.urgencyGroup === "severe_3d").length;
  const warning7dCount = forecasts.filter(f => f.urgencyGroup === "warning_7d").length;
  const watch14dCount = forecasts.filter(f => f.urgencyGroup === "watch_14d").length;
  const safeCount = forecasts.filter(f => f.urgencyGroup === "safe").length;
  const criticalTotalBudget = forecasts
    .filter(f => f.urgencyGroup === "out" || f.urgencyGroup === "severe_3d" || f.urgencyGroup === "warning_7d")
    .reduce((sum, f) => sum + f.refillCost, 0);

  const search = String(searchStr || "").toLowerCase().trim();
  const filtered = forecasts.filter(f => {
    if (urgencyFilter === "out" && f.urgencyGroup !== "out") return false;
    if (urgencyFilter === "severe_3d" && f.urgencyGroup !== "severe_3d") return false;
    if (urgencyFilter === "warning_7d" && f.urgencyGroup !== "warning_7d") return false;
    if (urgencyFilter === "watch_14d" && f.urgencyGroup !== "watch_14d") return false;
    if (urgencyFilter === "critical_all" && !(f.urgencyGroup === "out" || f.urgencyGroup === "severe_3d" || f.urgencyGroup === "warning_7d")) return false;

    if (catFilter !== "all" && f.category !== catFilter) return false;

    if (search) {
      const matchName = f.productName.toLowerCase().includes(search);
      const matchCode = f.productCode.toLowerCase().includes(search);
      const matchBarcode = f.barcode.toLowerCase().includes(search);
      const matchCat = f.category.toLowerCase().includes(search);
      if (!matchName && !matchCode && !matchBarcode && !matchCat) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (a.daysToCritical !== b.daysToCritical) return a.daysToCritical - b.daysToCritical;
    return a.stock - b.stock;
  });

  return {
    forecasts: filtered,
    totalCount,
    outCount,
    severe3dCount,
    warning7dCount,
    watch14dCount,
    safeCount,
    criticalTotalBudget,
    urgencyFilter,
    catFilter,
    searchStr
  };
}

function renderStockForecastCardsSection(isDashboardCompact = false) {
  const urgencyFilter = state.stockForecastUrgencyFilter || (isDashboardCompact ? "critical_all" : "all");
  const catFilter = state.stockForecastCatFilter || "all";
  const searchStr = state.stockForecastSearch || "";

  const data = buildStockForecastData(urgencyFilter, catFilter, searchStr);
  const categories = [...new Set((state.products || []).map(p => p.category_name || p.category || "ทั่วไป"))].filter(Boolean).sort();

  const filterBarHtml = `
    <div style="background:rgba(15,23,42,0.9); border:1px solid #334155; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:12px; font-weight:700; color:#cbd5e1;">⚡ ความเร่งด่วน:</span>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'critical_all' ? 'background:#dc2626; color:#fff; font-weight:800;' : 'background:#1e293b; color:#cbd5e1;'}" onclick="setStockForecastUrgencyFilter('critical_all')">
          🚨 วิกฤตทั้งหมด (${data.outCount + data.severe3dCount + data.warning7dCount})
        </button>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'out' ? 'background:#ef4444; color:#fff; font-weight:800;' : 'background:#1e293b; color:#f87171;'}" onclick="setStockForecastUrgencyFilter('out')">
          🚨 หมดสต็อก (${data.outCount})
        </button>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'severe_3d' ? 'background:#ea580c; color:#fff; font-weight:800;' : 'background:#1e293b; color:#fb923c;'}" onclick="setStockForecastUrgencyFilter('severe_3d')">
          ⚡ หมดใน ≤ 3 วัน (${data.severe3dCount})
        </button>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'warning_7d' ? 'background:#d97706; color:#fff; font-weight:800;' : 'background:#1e293b; color:#fbbf24;'}" onclick="setStockForecastUrgencyFilter('warning_7d')">
          ⚠️ หมดใน 4-7 วัน (${data.warning7dCount})
        </button>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'watch_14d' ? 'background:#0284c7; color:#fff; font-weight:800;' : 'background:#1e293b; color:#38bdf8;'}" onclick="setStockForecastUrgencyFilter('watch_14d')">
          📈 เฝ้าระวัง 8-14 วัน (${data.watch14dCount})
        </button>
        <button type="button" class="mini-btn" style="${urgencyFilter === 'all' ? 'background:#334155; color:#fff; font-weight:800;' : 'background:#1e293b; color:#cbd5e1;'}" onclick="setStockForecastUrgencyFilter('all')">
          สินค้าทั้งหมด (${data.totalCount})
        </button>
      </div>

      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <select class="input" style="padding:6px 10px; font-size:12px; width:auto; border-radius:8px; background:#1e293b; color:#f8fafc; border:1px solid #475569;" onchange="setStockForecastCatFilter(this.value)">
          <option value="all" ${catFilter === 'all' ? 'selected' : ''}>หมวดหมู่ทั้งหมด</option>
          ${categories.map(cat => `<option value="${escapeHtml(cat)}" ${catFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
        </select>
        <input type="text" placeholder="🔍 ค้นหาสินค้า / รหัส..." value="${escapeHtml(searchStr)}" oninput="onStockForecastSearchInput(this.value)" style="padding:6px 12px; font-size:12px; width:160px; border-radius:8px; background:#1e293b; color:#f8fafc; border:1px solid #475569;">
      </div>
    </div>
  `;

  const cardsHtml = data.forecasts.length ? data.forecasts.map((f, i) => {
    const isOut = f.stock <= 0;
    const isSevere = !isOut && f.daysToCritical <= 3;
    const isWarning = !isOut && !isSevere && f.daysToCritical <= 7;
    
    let cardBorder = "border:1px solid #334155;";
    let bgGrad = "background:rgba(30,41,59,0.8);";
    let badgeBg = "#0284c7";
    let badgeColor = "#ffffff";

    if (isOut) {
      cardBorder = "border:1px solid rgba(239, 68, 68, 0.5);";
      bgGrad = "background:linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(15,23,42,0.9) 100%);";
      badgeBg = "#dc2626";
    } else if (isSevere) {
      cardBorder = "border:1px solid rgba(249, 115, 22, 0.5);";
      bgGrad = "background:linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(15,23,42,0.9) 100%);";
      badgeBg = "#ea580c";
    } else if (isWarning) {
      cardBorder = "border:1px solid rgba(234, 179, 8, 0.4);";
      bgGrad = "background:linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(15,23,42,0.9) 100%);";
      badgeBg = "#d97706";
    }

    const pct = f.min > 0 ? Math.min(100, Math.max(0, Math.round((f.stock / f.min) * 100))) : 100;

    return `
      <div class="forecast-card" style="${cardBorder} ${bgGrad} border-radius:14px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; position:relative; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="background:${badgeBg}; color:${badgeColor}; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px; letter-spacing:0.3px;">
              ${escapeHtml(f.statusLabel)}
            </span>
            <span style="font-size:11px; font-family:monospace; color:#94a3b8; background:#0f172a; padding:2px 6px; border-radius:4px; border:1px solid #334155;">
              ${escapeHtml(f.barcode || f.productCode)}
            </span>
          </div>

          <h4 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:#f8fafc; line-height:1.3;">
            ${escapeHtml(f.productName)}
          </h4>
          <div style="font-size:11.5px; color:#94a3b8; margin-bottom:12px;">
            หมวดหมู่: <strong style="color:#cbd5e1;">${escapeHtml(f.category)}</strong>
          </div>

          <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; margin-bottom:4px;">
              <span style="color:#94a3b8; font-weight:700;">🔮 คาดการณ์วันสต็อกหมด:</span>
              <strong style="color:${isOut ? '#f87171' : isSevere ? '#fb923c' : '#38bdf8'}; font-size:12px;">
                ${escapeHtml(f.forecastTargetDate)}
              </strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#cbd5e1;">
              <span>ขาย 30 วัน: <strong>${f.sold30D} ${escapeHtml(f.unit)}</strong></span>
              <span style="color:#38bdf8; font-weight:700;">เฉลี่ย ${f.burnRate.toFixed(1)} ${escapeHtml(f.unit)}/วัน</span>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#cbd5e1;">
              <span>คงเหลือ: <strong style="color:${isOut ? '#f87171' : isSevere ? '#fb923c' : '#38bdf8'}; font-size:13.5px;">${f.stock} ${escapeHtml(f.unit)}</strong></span>
              <span>เกณฑ์ขั้นต่ำ: <strong>${f.min} ${escapeHtml(f.unit)}</strong></span>
            </div>
            <div style="height:7px; background:#0f172a; border-radius:999px; overflow:hidden; border:1px solid #334155;">
              <div style="height:100%; width:${Math.max(5, pct)}%; background:${isOut ? '#ef4444' : isSevere ? '#ea580c' : isWarning ? '#d97706' : '#38bdf8'}; transition:width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <div style="border-top:1px dashed #334155; padding-top:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto;">
          <div>
            <div style="font-size:10.5px; color:#94a3b8; font-weight:700;">แนะนำสั่งเติม</div>
            <div style="font-size:13px; font-weight:900; color:#34d399; font-variant-numeric:tabular-nums;">
              +${f.suggestedQty} ${escapeHtml(f.unit)} <small style="font-size:10.5px; color:#94a3b8; font-weight:normal;">(~฿${money(f.refillCost)})</small>
            </div>
          </div>
          <button type="button" class="btn btn-primary" onclick="openQuickRefillModal('${f.productId}', ${f.suggestedQty})" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:none; padding:7px 12px; font-size:12px; font-weight:800; border-radius:8px; display:inline-flex; align-items:center; gap:4px; shrink:0;" title="เติมสต็อกด่วน">
            + เติมสต็อก
          </button>
        </div>
      </div>
    `;
  }).join("") : `<div class="empty" style="padding:40px 20px; text-align:center; background:#0f172a; border-radius:12px; border:1px solid #334155; color:#94a3b8; grid-column:1/-1;">ไม่พบรายการสินค้าคาดการณ์สต็อกตามเงื่อนไขตัวกรองที่เลือก 🎉</div>`;

  return `
    <div class="auto-replenish-card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">🔮</span>
          <div>
            <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">ระบบคาดการณ์สต็อกวิกฤต (Stock Forecast Dashboard)</h3>
            <span style="font-size:11.5px; color:#94a3b8;">วิเคราะห์ประวัติยอดขายย้อนหลัง ทำนายวันและแจ้งเตือนสินค้าที่จะแตะระดับ 'Critical' ในรูปแบบการ์ด</span>
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span style="font-size:12px; color:#cbd5e1; font-weight:700;">งบประมาณเติมวิกฤตด่วน: <strong style="color:#34d399; font-size:14px; font-variant-numeric:tabular-nums;">฿${money(data.criticalTotalBudget)}</strong></span>
          <button type="button" class="mini-btn" style="background:#0284c7; color:#fff; font-weight:700; padding:6px 12px;" onclick="openLowStockPdfModal()">🖨️ พิมพ์รายงาน PDF</button>
        </div>
      </div>

      ${filterBarHtml}

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
        ${cardsHtml}
      </div>
    </div>
  `;
}

function renderLowStock(){
  setHeader("AUTO-REPLENISHMENT & LOW STOCK", "ระบบเติมสต็อกสินค้าอัตโนมัติ และแจ้งเตือนสต็อกต่ำ");
  const rows = lowProducts();
  const outCount = rows.filter(p => Number(p.stock_qty) <= 0).length;
  const severeCount = rows.filter(p => Number(p.stock_qty) > 0 && Number(p.stock_qty) <= Math.max(1, Math.ceil(Number(p.min_stock) / 2))).length;
  const lowCount = rows.length - outCount - severeCount;
  const notifInfo = getNotificationPermissionStatus();
  const currentTab = state.lowStockTab || "auto_replenish";

  let tabContentHtml = "";
  if (currentTab === "auto_replenish") {
    tabContentHtml = renderAutoReplenishmentTab();
  } else if (currentTab === "stock_forecast") {
    tabContentHtml = renderStockForecastCardsSection(false);
  } else if (currentTab === "po_timeline") {
    tabContentHtml = renderPOTimelineChart();
  } else if (currentTab === "po_list") {
    tabContentHtml = renderPOListTab();
  } else if (currentTab === "low_cards") {
    const catFilter = state.criticalCategoryFilter || "all";
    const urgencyFilter = state.criticalUrgencyFilter || "all";

    const categories = [...new Set(rows.map(p => p.category || "ทั่วไป"))].filter(Boolean).sort();

    const filteredRows = rows.filter(p => {
      const pCat = p.category || "ทั่วไป";
      if (catFilter !== "all" && pCat !== catFilter) return false;

      const qty = Number(p.stock_qty);
      const min = Number(p.min_stock);
      const isOut = qty <= 0;
      const isSevere = !isOut && qty <= Math.max(1, Math.ceil(min / 2));
      const isLow = !isOut && !isSevere && qty <= min;

      if (urgencyFilter === "out_of_stock" && !isOut) return false;
      if (urgencyFilter === "severe_low" && !isSevere) return false;
      if (urgencyFilter === "low_stock" && !isLow) return false;

      return true;
    });

    const filterControlBarHtml = `
      <div style="background:rgba(15,23,42,0.85); border:1px solid #334155; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; font-weight:700; color:#cbd5e1;">📁 หมวดหมู่สินค้า:</span>
          <select class="input" style="padding:6px 10px; font-size:12px; width:auto; border-radius:8px; background:#1e293b; color:#f8fafc; border:1px solid #475569;" onchange="setCriticalCategoryFilter(this.value)">
            <option value="all" ${catFilter === 'all' ? 'selected' : ''}>หมวดหมู่ทั้งหมด (${rows.length})</option>
            ${categories.map(cat => {
              const cnt = rows.filter(r => (r.category || 'ทั่วไป') === cat).length;
              return `<option value="${escapeHtml(cat)}" ${catFilter === cat ? 'selected' : ''}>${escapeHtml(cat)} (${cnt})</option>`;
            }).join("")}
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span style="font-size:12px; font-weight:700; color:#cbd5e1; margin-right:4px;">⚡ ระดับความวิกฤต:</span>
          <button type="button" class="mini-btn ${urgencyFilter === 'all' ? 'active' : ''}" style="${urgencyFilter === 'all' ? 'background:#0284c7; color:#fff; font-weight:700;' : 'background:#1e293b; color:#cbd5e1;'}" onclick="setCriticalUrgencyFilter('all')">
            ทั้งหมด (${rows.length})
          </button>
          <button type="button" class="mini-btn ${urgencyFilter === 'out_of_stock' ? 'active' : ''}" style="${urgencyFilter === 'out_of_stock' ? 'background:#dc2626; color:#fff; font-weight:700;' : 'background:#1e293b; color:#f87171;'}" onclick="setCriticalUrgencyFilter('out_of_stock')">
            🚨 หมดสต็อก (${outCount})
          </button>
          <button type="button" class="mini-btn ${urgencyFilter === 'severe_low' ? 'active' : ''}" style="${urgencyFilter === 'severe_low' ? 'background:#ea580c; color:#fff; font-weight:700;' : 'background:#1e293b; color:#fb923c;'}" onclick="setCriticalUrgencyFilter('severe_low')">
            ⚡ วิกฤตหนัก (${severeCount})
          </button>
          <button type="button" class="mini-btn ${urgencyFilter === 'low_stock' ? 'active' : ''}" style="${urgencyFilter === 'low_stock' ? 'background:#d97706; color:#fff; font-weight:700;' : 'background:#1e293b; color:#fbbf24;'}" onclick="setCriticalUrgencyFilter('low_stock')">
            ⚠️ ใกล้หมด (${lowCount})
          </button>
        </div>
      </div>
    `;

    tabContentHtml = `
      ${filterControlBarHtml}

      ${card(`การ์ดแจ้งเตือนสต็อกวิกฤต (${filteredRows.length}/${rows.length} รายการ)`, `
        <div class="low-stock-cards low-stock-grid-view">
          ${filteredRows.length ? filteredRows.map((p, i) => {
            const qty = Number(p.stock_qty);
            const min = Number(p.min_stock);
            const isOut = qty <= 0;
            const isSevere = !isOut && qty <= Math.max(1, Math.ceil(min / 2));
            const cardClass = isOut ? 'out-of-stock-card' : isSevere ? 'severe-low-card' : 'low-stock-warning-card';
            const badgeClass = isOut ? 'badge-out' : isSevere ? 'badge-severe' : 'badge-low';
            const badgeText = isOut ? '🚨 หมดสต็อก' : isSevere ? '⚡ วิกฤตหนัก (≤50%)' : '⚠️ ใกล้หมด';
            const textClass = isOut ? 'text-out' : isSevere ? 'text-severe' : 'text-low';

            return `
              <div class="low-stock-card ${cardClass}" style="--stagger:${i};" onclick="quickReceive('${p.id}')">
                <div class="low-card-head">
                  <span class="low-card-badge ${badgeClass}">${badgeText}</span>
                  <span class="low-card-barcode">${escapeHtml(p.barcode || p.product_code || '-')}</span>
                </div>
                <div class="low-card-body">
                  <div class="low-card-name">${escapeHtml(p.product_name)}</div>
                  <div class="low-card-meta">
                    <span>หมวดหมู่: <strong>${escapeHtml(p.category || 'ทั่วไป')}</strong></span>
                    <span>เกณฑ์ขั้นต่ำ: <strong>${p.min_stock || 0}</strong> ${escapeHtml(p.unit || 'ชิ้น')}</span>
                  </div>
                </div>
                <div class="low-card-foot">
                  <div class="low-card-stock">
                    <span class="stock-label">คงเหลือ</span>
                    <span class="stock-digit ${textClass}">${p.stock_qty} <small>${escapeHtml(p.unit || 'ชิ้น')}</small></span>
                  </div>
                  <button type="button" class="btn-card-restock" onclick="event.stopPropagation(); quickReceive('${p.id}')">
                    + เติมสต็อก
                  </button>
                </div>
              </div>
            `;
          }).join("") : `<div class="empty">ไม่พบสินค้าสต็อกวิกฤตตามเงื่อนไขตัวกรองที่เลือก 🎉</div>`}
        </div>
      `)}

      ${card(`ตารางสรุปสินค้าที่ต้องติดตาม (${filteredRows.length} รายการ)`, `
        <div class="table-wrap">
          <table>
            <thead><tr><th>รหัส</th><th>Barcode</th><th>สินค้า</th><th>หมวดหมู่</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              ${filteredRows.length ? filteredRows.map(p=>`
                <tr>
                  <td>${escapeHtml(p.product_code)}</td>
                  <td class="barcode-value">${escapeHtml(p.barcode||"-")}</td>
                  <td>${escapeHtml(p.product_name)}</td>
                  <td><span class="badge" style="background:#334155; color:#e2e8f0;">${escapeHtml(p.category||"ทั่วไป")}</span></td>
                  <td><strong>${p.stock_qty}</strong> <small style="color:#94a3b8;">${escapeHtml(p.unit || "ชิ้น")}</small></td>
                  <td>${p.min_stock} <small style="color:#94a3b8;">${escapeHtml(p.unit || "ชิ้น")}</small></td>
                  <td>${statusForProduct(p)}</td>
                  <td><button class="mini-btn" onclick="quickReceive('${p.id}')">รับเข้า</button></td>
                </tr>`).join("") : `<tr><td colspan="8" class="empty">ไม่พบสินค้าใกล้หมดตามตัวกรองที่เลือก</td></tr>`}
            </tbody>
          </table>
        </div>
      `)}
    `;
  }

  el("content").innerHTML = `
    ${connectionNotice()}

    <div style="background:rgba(15,23,42,0.85); border:1px solid #334155; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:20px;">🔔</span>
        <div>
          <div style="font-size:13px; font-weight:700; color:#f1f5f9;">การแจ้งเตือนสต็อกบนหน้าจอเบราว์เซอร์ (Browser Push Notifications)</div>
          <div style="font-size:11.5px; color:#94a3b8;">ส่งการแจ้งเตือนทันทีเมื่อสินค้าลดลงต่ำกว่า Minimum Stock หรือ Reorder Point</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge ${notifInfo.badgeClass}" style="font-size:11.5px; padding:3px 8px; font-weight:700;">${notifInfo.icon} ${notifInfo.label}</span>
        ${notifInfo.status !== 'granted' ? `<button type="button" class="mini-btn" style="background:#0284c7; color:#fff; font-weight:700;" onclick="requestNotificationPermission()">เปิดการแจ้งเตือน</button>` : ''}
        <button type="button" class="mini-btn" style="background:#334155; color:#cbd5e1;" onclick="testBrowserPushNotification()">ทดสอบส่งแจ้งเตือน</button>
      </div>
    </div>

    <div class="low-stock-overview-banner" style="margin-bottom:16px;">
      <div class="low-banner-stat alert">
        <span class="l-num">${outCount}</span>
        <span class="l-lbl">หมดสต็อกแล้ว (Out of Stock)</span>
      </div>
      <div class="low-banner-stat warning" style="border-color:#ea580c;">
        <span class="l-num">${severeCount}</span>
        <span class="l-lbl">วิกฤตหนัก (Severe Low ≤50%)</span>
      </div>
      <div class="low-banner-stat warning">
        <span class="l-num">${lowCount}</span>
        <span class="l-lbl">ใกล้หมด (ต่ำกว่าเกณฑ์ขั้นต่ำ)</span>
      </div>
      <div class="low-banner-stat ok">
        <span class="l-num">${Math.max(0, state.products.length - rows.length)}</span>
        <span class="l-lbl">สต็อกพร้อมจำหน่ายปกติ</span>
      </div>
    </div>

    <div class="replenish-tab-bar" style="margin-bottom:16px;">
      <button type="button" class="replenish-tab-btn ${currentTab === 'auto_replenish' ? 'active' : ''}" onclick="setLowStockSubTab('auto_replenish')">
        🤖 คำนวณสั่งเติมสต็อก (Smart PO)
      </button>
      <button type="button" class="replenish-tab-btn ${currentTab === 'stock_forecast' ? 'active' : ''}" onclick="setLowStockSubTab('stock_forecast')">
        🔮 คาดการณ์สต็อกวิกฤต (Stock Forecast)
      </button>
      <button type="button" class="replenish-tab-btn ${currentTab === 'po_timeline' ? 'active' : ''}" onclick="setLowStockSubTab('po_timeline')">
        📈 ไทม์ไลน์สั่งซื้อ & Patterns
      </button>
      <button type="button" class="replenish-tab-btn ${currentTab === 'po_list' ? 'active' : ''}" onclick="setLowStockSubTab('po_list')">
        📋 ประวัติใบสั่งซื้อ PO (${(state.purchaseOrders || []).length})
      </button>
      <button type="button" class="replenish-tab-btn ${currentTab === 'low_cards' ? 'active' : ''}" onclick="setLowStockSubTab('low_cards')">
        🚨 สินค้าใกล้หมด (${rows.length})
      </button>
    </div>

    ${tabContentHtml}
  `;
}

function setPosMode(m){state.posMode=m;renderSale()}
function setPosFilter(f){state.posFilter=f;renderSale()}
function onPosSearchInput(val){state.posSearch=val;renderSale();setTimeout(()=>{const i=el("posSearchInput");if(i){i.focus();const len=i.value.length;i.setSelectionRange(len,len)}},10)}
function clearPosSearch(){state.posSearch="";renderSale();setTimeout(()=>el("posSearchInput")?.focus(),10)}
function addProductToCartById(id){const p=productById(id);if(p)addProductToCart(p)}
function setPaymentMethod(m){state.paymentMethod=m;renderSale()}
function setQuickCash(amt){state.receivedCash=Number(amt);renderSale()}
function addQuickCash(increment){
  const cur = Number(state.receivedCash || 0);
  state.receivedCash = cur + Number(increment);
  renderSale();
}
function clearQuickCash(){
  state.receivedCash = "";
  renderSale();
  setTimeout(()=>el("receivedCashInput")?.focus(), 10);
}

function generateQuickPayAmounts(total){
  if(!total || total <= 0) return [];
  const list = [];
  const tot = Math.round(total);
  
  // 1. Exact amount (Hero)
  list.push({ label: `🎯 พอดีเป๊ะ`, sub: `฿${money(tot)}`, value: tot, isExact: true });
  
  const seen = new Set([tot]);
  function addOption(val){
    const v = Math.round(val);
    if(v > tot && !seen.has(v)){
      seen.add(v);
      const chg = v - tot;
      list.push({ label: `฿${money(v)}`, sub: `ทอน ฿${money(chg)}`, value: v, isExact: false });
    }
  }

  // 2. Next nearest rounded denominations based on total
  if(tot < 100){
    if(tot % 10 !== 0) addOption(Math.ceil(tot / 10) * 10);
    if(tot % 20 !== 0) addOption(Math.ceil(tot / 20) * 20);
    if(tot % 50 !== 0 && Math.ceil(tot / 50) * 50 <= 100) addOption(Math.ceil(tot / 50) * 50);
    addOption(100);
    addOption(500);
    addOption(1000);
  } else if(tot < 500){
    if(tot % 50 !== 0) addOption(Math.ceil(tot / 50) * 50);
    if(tot % 100 !== 0) addOption(Math.ceil(tot / 100) * 100);
    addOption(Math.ceil((tot + 50) / 100) * 100);
    addOption(500);
    addOption(1000);
  } else if(tot < 1000){
    if(tot % 100 !== 0) addOption(Math.ceil(tot / 100) * 100);
    if(tot % 500 !== 0) addOption(Math.ceil(tot / 500) * 500);
    addOption(1000);
    addOption(1500);
    addOption(2000);
  } else {
    if(tot % 100 !== 0) addOption(Math.ceil(tot / 100) * 100);
    if(tot % 500 !== 0) addOption(Math.ceil(tot / 500) * 500);
    if(tot % 1000 !== 0) addOption(Math.ceil(tot / 1000) * 1000);
    addOption(Math.ceil((tot + 1) / 1000) * 1000);
    addOption(Math.ceil((tot + 500) / 1000) * 1000);
  }

  return list.slice(0, 7);
}

function calculateChangeBreakdown(change){
  if(!change || change <= 0) return [];
  let remaining = Math.round(change);
  const denoms = [
    { value: 1000, label: "฿1,000", icon: "💵" },
    { value: 500, label: "฿500", icon: "💵" },
    { value: 100, label: "฿100", icon: "💵" },
    { value: 50, label: "฿50", icon: "💵" },
    { value: 20, label: "฿20", icon: "💵" },
    { value: 10, label: "฿10", icon: "🪙" },
    { value: 5, label: "฿5", icon: "🪙" },
    { value: 2, label: "฿2", icon: "🪙" },
    { value: 1, label: "฿1", icon: "🪙" }
  ];
  const result = [];
  for(const d of denoms){
    if(remaining >= d.value){
      const count = Math.floor(remaining / d.value);
      remaining %= d.value;
      result.push({ ...d, count });
    }
  }
  return result;
}

function onReceivedCashInput(val){state.receivedCash=val===""?"":Number(val);renderSale();setTimeout(()=>{const i=el("receivedCashInput");if(i){i.focus();const len=String(i.value).length;i.setSelectionRange(len,len)}},10)}

/* =========================================================
   CART DIRECT LIVE SCANNER (RAPID CONTINUOUS POS SCAN)
   ========================================================= */

let cartScannerControls = null;
let cartScannerReader = null;
let isCartFlashActive = false;
let cartLiveZoomVal = 1.0;
let lastCartScannedCode = "";
let lastCartScannedAt = 0;

function productByCode(code){
  const clean = String(code || "").trim().toLowerCase();
  if(!clean) return null;
  return state.products.find(x => String(x.product_code || "").trim().toLowerCase() === clean);
}

function handlePosSearchEnter(val){
  const clean = String(val || "").trim();
  if(!clean) return;
  const p = productByBarcode(clean) || productByCode(clean);
  if(p){
    addProductToCart(p);
    clearPosSearch();
  }
}

function renderCartLiveScannerDock(){
  if(!state.cartScannerActive) return "";
  return `
    <div class="cart-live-scanner-dock" id="cartLiveScannerDock">
      <div class="cart-live-scanner-header">
        <span class="cart-live-scanner-title">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
          กล้องสแกนด่วน • สแกนลงตะกร้าต่อเนื่อง
        </span>
        <button type="button" class="mini-btn" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:3px 8px; font-weight:700;" onclick="stopCartLiveScanner()">✕ ปิดกล้อง</button>
      </div>
      <div class="cart-live-video-box">
        <video id="cartLiveScannerVideo" autoplay playsinline muted></video>
        <div class="cart-live-reticle"></div>
        <div class="cart-live-laser-beam"></div>
        <div id="cartLiveScanFlash" class="cart-live-scan-flash"></div>
        <div id="cartLiveScanPopup" class="cart-live-scan-popup" style="display:none;"></div>
        <div id="cartLiveFeedbackPill" class="cart-live-feedback-pill ${state.lastScannedLiveText ? '' : 'hidden'}">
          ${state.lastScannedLiveText || 'พร้อมสแกนบาร์โค้ด'}
        </div>
      </div>
      <div class="cart-live-scanner-footer">
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="cart-live-ctrl-btn ${isCartFlashActive ? 'active' : ''}" id="cartLiveFlashBtn" onclick="toggleCartLiveFlash()">⚡ แฟลช</button>
          <button type="button" class="cart-live-ctrl-btn" onclick="setCartLiveZoom(1.0)">1x</button>
          <button type="button" class="cart-live-ctrl-btn" onclick="setCartLiveZoom(2.0)">2x</button>
          <button type="button" class="cart-live-ctrl-btn ${isScanSoundEnabled ? 'active' : ''}" onclick="toggleScanSound()">${isScanSoundEnabled ? '🔊 เสียง' : '🔇 ปิดเสียง'}</button>
        </div>
        <span style="font-size:11px; color:#94a3b8; font-weight:700;">
          สแกนสินค้าผ่านกล้องได้ต่อเนื่อง
        </span>
      </div>
    </div>
  `;
}

function renderCartTotalBox(){
  const subtotalOrig = cartSubtotalOriginal();
  const itemsDiscAmt = cartItemsDiscount();
  const billDiscAmt = cartBillDiscountAmount();
  const totalDiscAmt = cartTotalDiscount();
  const total = cartTotal();

  let paymentHtml = "";
  if(total > 0){
    paymentHtml = `
      <div class="payment-section-title">ช่องทางรับเงิน</div>
      <div class="payment-method-toggle">
        <button class="pay-method-btn ${state.paymentMethod==='cash'?'active':''}" onclick="setPaymentMethod('cash')">💵 เงินสด</button>
        <button class="pay-method-btn ${state.paymentMethod==='promptpay'?'active':''}" onclick="setPaymentMethod('promptpay')">📱 สแกน QR / โอน</button>
      </div>
    `;

    if(state.paymentMethod === "cash"){
      const quickAmounts = generateQuickPayAmounts(total);
      const rec = Number(state.receivedCash || 0);
      const change = rec >= total ? (rec - total) : 0;
      const diff = total - rec;
      const changeBreakdown = change > 0 ? calculateChangeBreakdown(change) : [];

      paymentHtml += `
        <div class="quick-pay-container">
          <div class="quick-pay-header">
            <span class="quick-pay-title">⚡ Quick Pay (เลือกจำนวนเงินด่วน)</span>
            ${rec > 0 ? `<button type="button" class="quick-add-chip" style="color:#f87171; border-color:rgba(239,68,68,0.3);" onclick="clearQuickCash()">✕ ล้างยอด</button>` : ''}
          </div>

          <!-- Dynamic One-Tap Quick Pay Grid based on Total Due -->
          <div class="quick-pay-grid">
            ${quickAmounts.map(opt => {
              const isSelected = rec === opt.value;
              const btnClass = opt.isExact ? "quick-pay-btn exact" : (isSelected ? "quick-pay-btn active-selected" : "quick-pay-btn");
              return `
                <button type="button" class="${btnClass}" onclick="setQuickCash(${opt.value})" title="รับเงิน ฿${money(opt.value)}">
                  <span class="quick-pay-val">${opt.label}</span>
                  <span class="quick-pay-change-sub">${opt.sub}</span>
                </button>
              `;
            }).join("")}
          </div>

          <!-- Incremental Banknote Buttons -->
          <div class="quick-add-banknotes-row">
            <span class="quick-add-label">บวกเพิ่ม:</span>
            <button type="button" class="quick-add-chip" onclick="addQuickCash(20)">+฿20</button>
            <button type="button" class="quick-add-chip" onclick="addQuickCash(50)">+฿50</button>
            <button type="button" class="quick-add-chip" onclick="addQuickCash(100)">+฿100</button>
            <button type="button" class="quick-add-chip" onclick="addQuickCash(500)">+฿500</button>
            <button type="button" class="quick-add-chip" onclick="addQuickCash(1000)">+฿1,000</button>
          </div>

          <!-- Cash Received Input Field -->
          <div class="cash-received-input-row">
            <span class="cash-label">รับเงินมา:</span>
            <div class="cash-input-wrap">
              <span class="cash-currency-symbol">฿</span>
              <input id="receivedCashInput" type="number" inputmode="numeric" placeholder="0" value="${state.receivedCash || ''}" oninput="onReceivedCashInput(this.value)">
              ${state.receivedCash ? `<button type="button" class="cash-clear-inline-btn" onclick="clearQuickCash()" title="ล้าง">✕</button>` : ''}
            </div>
          </div>
        </div>

        ${rec >= total && rec > 0 ? `
          <div class="change-display-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="change-label">เงินทอน</span>
              <span class="change-amount">฿${money(change)}</span>
            </div>
            ${changeBreakdown.length > 0 ? `
              <div class="change-breakdown-list">
                <span style="font-size:10.5px; color:#94a3b8; align-self:center; font-weight:700;">แจกแจง:</span>
                ${changeBreakdown.map(item => `
                  <span class="change-denom-pill">
                    <span>${item.icon}</span>
                    <span>${item.label} × <strong>${item.count}</strong></span>
                  </span>
                `).join("")}
              </div>
            ` : ''}
          </div>
        ` : (rec > 0 && rec < total ? `
          <div class="change-display-box" style="background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="change-label" style="color:#fcd34d;">ยังขาดอีก</span>
              <span class="change-amount" style="color:#fbbf24;">฿${money(diff)}</span>
            </div>
          </div>
        ` : "")}
      `;
    } else if (state.paymentMethod === "promptpay") {
      const promptPayRaw = state.settings?.promptPayId || state.settings?.shopPhone || "";
      const promptPayClean = String(promptPayRaw).replace(/[^0-9]/g, "");
      const ppQrUrl = promptPayClean ? `https://promptpay.io/${promptPayClean}/${total.toFixed(2)}.png` : "";
      paymentHtml += `
        <div class="promptpay-box" style="margin-top:12px; background:#0f172a; border:1px solid #334155; border-radius:12px; padding:14px; text-align:center;">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:18px;">📱</span>
            <strong style="color:#38bdf8; font-size:14px;">ชำระเงินผ่าน PromptPay QR</strong>
          </div>
          <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
            บัญชีรับเงิน: <strong style="color:#f8fafc;">${escapeHtml(promptPayRaw || "ยังไม่ได้ระบุในหน้าตั้งค่า")}</strong>
          </div>
          ${promptPayClean ? `
            <div style="display:inline-block; background:#ffffff; padding:10px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3); margin-bottom:8px;">
              <img src="${ppQrUrl}" alt="PromptPay QR Code" style="display:block; width:150px; height:150px; margin:0 auto;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'color:#0f172a; font-size:12px; font-weight:700; padding:35px 10px; line-height:1.5;\\'>📱 โอนเข้าบัญชี/พร้อมเพย์<br><span style=\\'font-size:16px; color:#0284c7;\\'>${promptPayClean}</span><br>ยอดชำระ ฿${money(total)}</div>';">
            </div>
            <div style="font-size:13px; color:#34d399; font-weight:700;">
              ยอดชำระ: ฿${money(total)}
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
              เมื่อลูกค้าโอนเงินเรียบร้อย กดปุ่ม <strong>\"บันทึกการขาย\"</strong> ด้านล่างเพื่อออกใบเสร็จ
            </div>
          ` : `
            <div style="padding:10px; font-size:12px; color:#fcd34d; background:rgba(245,158,11,0.1); border-radius:8px; border:1px solid rgba(245,158,11,0.2);">
              ℹ️ แนะนำ: ใส่เบอร์พร้อมเพย์ในเมนู <strong>ตั้งค่า (Settings)</strong> เพื่อแสดง QR รับเงินอัตโนมัติ
            </div>
          `}
        </div>
      `;
    }
  }

  return `
    <div class="line">
      <span>ยอดรวมสินค้า (Subtotal)</span>
      <strong>฿${money(subtotalOrig)}</strong>
    </div>
    ${itemsDiscAmt > 0 ? `
      <div class="line" style="color:#fbbf24; font-size:12.5px;">
        <span>🏷️ ส่วนลดเฉพาะรายการ</span>
        <strong>-฿${money(itemsDiscAmt)}</strong>
      </div>
    ` : ''}
    ${billDiscAmt > 0 ? `
      <div class="line" style="color:#fbbf24; font-size:12.5px;">
        <span>🏷️ ส่วนลดท้ายบิล (${state.billDiscount.type === 'percent' ? state.billDiscount.value + '%' : 'เงินสด'}${state.billDiscount.note ? ` - ${escapeHtml(state.billDiscount.note)}` : ''})</span>
        <strong>-฿${money(billDiscAmt)}</strong>
      </div>
    ` : ''}
    ${totalDiscAmt > 0 ? `
      <div style="display:flex; justify-content:flex-end; margin:2px 0 6px;">
        <span class="cart-savings-pill">✨ ประหยัดได้ทั้งหมด ฿${money(totalDiscAmt)}</span>
      </div>
    ` : ''}
    <div class="pos-total-banner">
      <div class="pos-total-banner-label">
        <span>ยอดสุทธิที่ต้องชำระ</span>
        <small>${cartCount()} รายการ • ${state.cart.reduce((s,i)=>s+Number(i.qty),0)} ชิ้น</small>
      </div>
      <div class="pos-total-banner-amount">฿${money(total)}</div>
    </div>
    ${paymentHtml}
    <button class="btn btn-primary checkout-btn" onclick="checkoutCart()" ${state.cart.length?"":"disabled"}>
      ${G_ICONS.check} ยืนยันการขาย & ชำระเงิน (฿${money(total)})
    </button>
    ${state.cart.length ? `<button class="btn btn-light cart-clear-btn" onclick="clearCart()">${G_ICONS.trash} ล้างตะกร้าสินค้า</button>` : ""}
  `;
}

function updateCartDOMOnly(){
  const rowsEl = el("posCartRowsContainer");
  const billDiscEl = el("posCartBillDiscountContainer");
  const totalsEl = el("posCartTotalsContainer");
  const countEl = el("posCartCardCountText");

  if(rowsEl) rowsEl.innerHTML = renderCartRows();
  if(billDiscEl) billDiscEl.innerHTML = renderCartBillDiscountSection();
  if(totalsEl) totalsEl.innerHTML = renderCartTotalBox();
  if(countEl) countEl.textContent = `${cartCount()} รายการ`;
  updateBottomNav();
}

async function startCartLiveScanner(){
  if(!window.ZXingBrowser){
    toast("โหลด Barcode Scanner ไม่สำเร็จ");
    return;
  }
  state.cartScannerActive = true;
  renderSale();

  const video = el("cartLiveScannerVideo");
  const pill = el("cartLiveFeedbackPill");
  if(!video) return;

  isCartFlashActive = false;
  cartLiveZoomVal = 1.0;

  try {
    cartScannerReader = new ZXingBrowser.BrowserMultiFormatReader();
    cartScannerControls = await cartScannerReader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      video,
      (result) => {
        if(!result) return;
        const code = result.getText();
        const now = Date.now();
        if(code === lastCartScannedCode && (now - lastCartScannedAt < 900)) return;
        lastCartScannedCode = code;
        lastCartScannedAt = now;
        handleCartLiveScannedBarcode(code);
      }
    );
    if(pill){
      pill.textContent = "🟢 กล้องพร้อม • วางบาร์โค้ดตรงเส้นเลเซอร์";
      pill.classList.remove("hidden");
    }
  } catch(e) {
    console.error("Cart live camera failed:", e);
    state.cartScannerActive = false;
    renderSale();
    toast("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การใช้กล้อง");
  }
}

function stopCartLiveScanner(){
  try {
    const video = el("cartLiveScannerVideo");
    if(isCartFlashActive){
      const track = video?.srcObject?.getVideoTracks?.()[0];
      track?.applyConstraints({ advanced: [{ torch: false }] }).catch(()=>{});
    }
    cartScannerControls?.stop();
  } catch(e){}
  cartScannerControls = null;
  cartScannerReader = null;
  isCartFlashActive = false;
  state.cartScannerActive = false;
  renderSale();
}

function toggleCartLiveScanner(){
  if(state.cartScannerActive){
    stopCartLiveScanner();
  } else {
    startCartLiveScanner();
  }
}

function toggleCartLiveFlash(){
  const video = el("cartLiveScannerVideo");
  const track = video?.srcObject?.getVideoTracks?.()[0];
  if(!track){ toast("กล้องยังไม่พร้อม"); return; }
  const caps = track.getCapabilities?.();
  if(!caps || !caps.torch){ toast("อุปกรณ์นี้ไม่รองรับไฟฉาย"); return; }
  isCartFlashActive = !isCartFlashActive;
  track.applyConstraints({ advanced: [{ torch: isCartFlashActive }] }).then(()=>{
    const btn = el("cartLiveFlashBtn");
    if(btn) btn.classList.toggle("active", isCartFlashActive);
    toast(isCartFlashActive ? "เปิดแฟลชแล้ว ⚡" : "ปิดแฟลชแล้ว");
  }).catch(()=>{
    toast("เปิดแฟลชไม่สำเร็จ");
  });
}

function setCartLiveZoom(val){
  const video = el("cartLiveScannerVideo");
  const track = video?.srcObject?.getVideoTracks?.()[0];
  if(!track) return;
  cartLiveZoomVal = val;
  if(track.getCapabilities?.()?.zoom){
    track.applyConstraints({ advanced: [{ zoom: val }] }).catch(()=>{});
  } else if(video){
    video.style.transform = `scale(${val})`;
  }
}

function bounceCartBadge(){
  const countEl = el("posCartCardCountText");
  if(countEl){
    countEl.classList.remove("pos-cart-bounce");
    void countEl.offsetWidth;
    countEl.classList.add("pos-cart-bounce");
    setTimeout(() => countEl.classList.remove("pos-cart-bounce"), 450);
  }
}

function showGlobalScanFloater(p, currentCount = 1){
  let floater = el("posScanFloater");
  if(!floater){
    floater = document.createElement("div");
    floater.id = "posScanFloater";
    floater.className = "pos-scan-floater";
    document.body.appendChild(floater);
  }

  floater.classList.remove("exit");
  floater.innerHTML = `
    <div class="scan-popup-badge" style="width:34px; height:34px; font-size:15px; border-radius:10px;">✓</div>
    <div class="scan-popup-info">
      <div class="scan-popup-title" style="font-size:13px;">${escapeHtml(p.product_name)}</div>
      <div class="scan-popup-subtitle" style="font-size:11px;">
        <span>+1 เพิ่มลงตะกร้า (฿${money(p.sale_price)})</span>
        <span class="scan-popup-count">รวม ${currentCount} ${escapeHtml(p.unit || 'ชิ้น')}</span>
      </div>
    </div>
  `;

  if(floater._timer) clearTimeout(floater._timer);
  floater._timer = setTimeout(() => {
    floater.classList.add("exit");
    setTimeout(() => {
      if(floater && floater.classList.contains("exit")){
        floater.remove();
      }
    }, 250);
  }, 1250);
}

function triggerScanSuccessFeedback(p, currentCount = 1){
  if(!p) return;

  // 1. Brief Haptic Pulse (tactile vibration for 45ms)
  try {
    if(isScanVibrationEnabled && navigator.vibrate){
      navigator.vibrate(45);
    }
  } catch(e){}

  // 2. Camera Viewfinder Visual Pop-Up & Reticle Pulse (if camera scanner is active)
  const videoBox = el("cartLiveScannerVideo")?.parentElement;
  if(videoBox){
    const reticle = videoBox.querySelector(".cart-live-reticle");
    if(reticle){
      reticle.classList.remove("scan-pulse-success");
      void reticle.offsetWidth;
      reticle.classList.add("scan-pulse-success");
      setTimeout(() => reticle.classList.remove("scan-pulse-success"), 500);
    }

    const flash = el("cartLiveScanFlash");
    if(flash){
      flash.classList.remove("active");
      void flash.offsetWidth;
      flash.classList.add("active");
      setTimeout(() => flash.classList.remove("active"), 450);
    }

    let popup = el("cartLiveScanPopup");
    if(!popup){
      popup = document.createElement("div");
      popup.id = "cartLiveScanPopup";
      popup.className = "cart-live-scan-popup";
      videoBox.appendChild(popup);
    }

    popup.style.display = "flex";
    popup.classList.remove("exit");
    popup.innerHTML = `
      <div class="scan-popup-badge">✓ +1</div>
      <div class="scan-popup-info">
        <div class="scan-popup-title">${escapeHtml(p.product_name)}</div>
        <div class="scan-popup-subtitle">
          <span>฿${money(p.sale_price)}</span>
          <span class="scan-popup-count">ในตะกร้า: ${currentCount} ${escapeHtml(p.unit || 'ชิ้น')}</span>
        </div>
      </div>
    `;

    if(popup._dismissTimer) clearTimeout(popup._dismissTimer);
    popup._dismissTimer = setTimeout(() => {
      popup.classList.add("exit");
      setTimeout(() => {
        if(popup && popup.classList.contains("exit")){
          popup.style.display = "none";
          popup.classList.remove("exit");
        }
      }, 250);
    }, 1100);
  }

  // 3. Global Floating Scan HUD Pop-Up
  showGlobalScanFloater(p, currentCount);

  // 4. Cart Counter Bounce Pulse
  bounceCartBadge();
}

function handleCartLiveScannedBarcode(code){
  const clean = String(code || "").trim();
  if(!clean) return;
  const p = productByBarcode(clean) || productByCode(clean);
  const pill = el("cartLiveFeedbackPill");

  if(!p){
    beepError();
    if(isScanVibrationEnabled) navigator.vibrate?.([60, 50, 60]);
    if(pill){
      pill.textContent = `❌ ไม่พบบาร์โค้ด "${clean}"`;
      pill.style.borderColor = "#f43f5e";
      pill.style.color = "#fda4af";
      pill.classList.remove("hidden");
    }
    toast(`ไม่พบบาร์โค้ด "${clean}" ในระบบ`);
    return;
  }

  const stock = Number(p.stock_qty || 0);
  if(stock <= 0){
    beepError();
    if(isScanVibrationEnabled) navigator.vibrate?.([80, 50, 80]);
    if(pill){
      pill.textContent = `⚠️ "${p.product_name}" สินค้าหมดสต็อก!`;
      pill.style.borderColor = "#f59e0b";
      pill.style.color = "#fde68a";
      pill.classList.remove("hidden");
    }
    toast(`สินค้า "${p.product_name}" หมดสต็อก`);
    return;
  }

  // Add or increment directly in cart
  const row = state.cart.find(x => x.product_id === p.id);
  if(row){
    if(row.qty + 1 > stock){
      beepError();
      if(pill){
        pill.textContent = `⚠️ "${p.product_name}" ถึงขีดจำกัดคงเหลือ (${stock} ชิ้น)`;
        pill.style.borderColor = "#f59e0b";
        pill.style.color = "#fde68a";
        pill.classList.remove("hidden");
      }
      toast(`"${p.product_name}" ในตะกร้าถึงจำนวนคงเหลือแล้ว`);
      return;
    }
    row.qty++;
  } else {
    state.cart.push({
      product_id: p.id,
      name: p.product_name,
      barcode: p.barcode || "",
      unit: p.unit || "ชิ้น",
      qty: 1,
      unit_price: Number(p.sale_price),
      original_price: Number(p.sale_price),
      stock: stock,
      discount_note: "",
      is_discounted: false
    });
  }

  saveCartLocal();
  beepSuccess();

  const currentCount = state.cart.filter(x => x.product_id === p.id).reduce((a,x)=>a+Number(x.qty||0),0) || 1;

  // Trigger rich visual pop-up animation and haptic pulse
  triggerScanSuccessFeedback(p, currentCount);

  if(pill){
    pill.textContent = `🎉 +1 ${p.product_name} (฿${money(p.sale_price)}) • ในตะกร้า: ${currentCount} ${escapeHtml(p.unit||'ชิ้น')}`;
    pill.style.borderColor = "#38bdf8";
    pill.style.color = "#ffffff";
    pill.classList.remove("hidden");
  }

  // Update DOM seamlessly without interrupting camera stream
  updateCartDOMOnly();
  toast(`+1 ${p.product_name} 🛒 (฿${money(p.sale_price)})`);
}

function renderSale(){
  setHeader("POS ขายสินค้า",`จุดขาย ${state.terminal} • แตะหรือสแกนสินค้าเพื่อเพิ่มลงตะกร้า`);
  
  const activeProds = state.products.filter(p => p.is_active && Number(p.stock_qty) > 0);
  const modeTabs = `
    <div class="pos-mode-tabs">
      <button class="pos-tab-btn ${state.posMode==='grid'?'active':''}" onclick="setPosMode('grid')">
        🏷️ แตะเลือกสินค้า (${activeProds.length})
      </button>
      <button class="pos-tab-btn ${state.posMode==='scan'?'active':''}" onclick="setPosMode('scan')">
        📷 สแกนเนอร์ & บาร์โค้ด
      </button>
    </div>
  `;

  let leftContent = "";
  if(state.posMode === "grid"){
    const q = String(state.posSearch || "").trim().toLowerCase();
    const filterMode = state.posFilter || "all";
    const filtered = state.products.filter(p => {
      if(!p.is_active) return false;
      const stock = Number(p.stock_qty || 0);
      const minStock = Number(p.min_stock || 0);
      if(filterMode === "instock" && stock <= 0) return false;
      if(filterMode === "low" && (stock > minStock || stock <= 0)) return false;
      if(!q) return true;
      return (p.product_name || "").toLowerCase().includes(q) ||
             (p.product_code || "").toLowerCase().includes(q) ||
             String(p.barcode || "").includes(q);
    });

    const inStockCount = state.products.filter(p => p.is_active && Number(p.stock_qty) > 0).length;
    const lowStockCount = lowProducts().length;

    leftContent = `
      <div class="pos-search-wrapper">
        <span class="pos-search-icon">${G_ICONS.searchIcon}</span>
        <input type="search" class="pos-search-input" id="posSearchInput" placeholder="ค้นหาชื่อ, รหัส, หรือสแกนบาร์โค้ดแล้วกด Enter..." value="${escapeHtml(state.posSearch)}" oninput="onPosSearchInput(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();handlePosSearchEnter(this.value);}" style="padding-right:${state.posSearch ? '110px' : '90px'};">
        ${state.posSearch ? `<button class="pos-search-clear" style="right:86px;" onclick="clearPosSearch()">✕</button>` : ""}
        <button type="button" class="pos-search-camera-btn" onclick="toggleCartLiveScanner()" title="เปิดกล้องสแกนด่วน">📷 สแกนกล้อง</button>
      </div>
      <div class="pos-filter-chips">
        <button type="button" class="pos-chip ${filterMode==='all'?'active':''}" onclick="setPosFilter('all')">ทั้งหมด (${activeProds.length})</button>
        <button type="button" class="pos-chip ${filterMode==='instock'?'active':''}" onclick="setPosFilter('instock')">🟢 พร้อมขาย (${inStockCount})</button>
        <button type="button" class="pos-chip ${filterMode==='low'?'active':''}" onclick="setPosFilter('low')">⚠️ ใกล้หมด (${lowStockCount})</button>
        <button type="button" class="pos-chip" style="margin-left:auto; background:rgba(2,132,199,0.18); border-color:#0284c7; color:#38bdf8;" onclick="openBarcodePrintModal()" title="พิมพ์ฉลากบาร์โค้ดสินค้า">🖨️ พิมพ์บาร์โค้ด</button>
      </div>
      <div class="pos-product-grid">
        ${filtered.length ? filtered.map(p => {
          const stock = Number(p.stock_qty || 0);
          const isOut = stock <= 0;
          const isLow = stock <= Number(p.min_stock || 0);
          const stockClass = isOut ? "out" : (isLow ? "low" : "ok");
          const unit = p.unit || "ชิ้น";
          const stockText = isOut ? "หมด" : `เหลือ ${stock} ${unit}`;
          return `
            <div class="pos-product-card ${isOut ? "out-of-stock" : ""}" onclick="${isOut ? `toast('สินค้าหมดสต็อก')` : `addProductToCartById('${p.id}')`}" title="${escapeHtml(p.product_name)}">
              <div>
                <div class="pos-card-code">${escapeHtml(p.product_code || "-")}</div>
                <div class="pos-card-name">${escapeHtml(p.product_name)}</div>
              </div>
              <div class="pos-card-foot">
                <div class="pos-card-price">฿${money(p.sale_price)} <small style="font-size:10px; opacity:0.8; font-weight:normal;">/ ${escapeHtml(unit)}</small></div>
                <span class="pos-card-stock ${stockClass}">${stockText}</span>
              </div>
            </div>
          `;
        }).join("") : `<div class="empty" style="grid-column: 1 / -1; padding:32px;">ไม่พบสินค้าที่ตรงกับการค้นหา</div>`}
      </div>
    `;
  } else {
    const opts = activeProds.map(p=>`<option value="${p.id}">${escapeHtml(p.product_name)} — เหลือ ${p.stock_qty} ${escapeHtml(p.unit || 'ชิ้น')}</option>`).join("");
    leftContent = `
      <div class="scan-zone">
        <div class="scan-icon">${G_ICONS.scanner}</div>
        <h3>สแกนบาร์โค้ดด้วยกล้องหลัง</h3>
        <p>กล้องเปิดค้างเพื่อสแกนสินค้าได้ต่อเนื่องลงตะกร้าทันที</p>
        <div class="scan-actions">
          <button class="btn btn-primary" onclick="startCartLiveScanner()">${G_ICONS.camera}เปิดกล้องสแกนด่วนลงตะกร้า</button>
        </div>
        <div class="barcode-manual">
          <input id="manualBarcode" inputmode="numeric" placeholder="หรือพิมพ์เลขบาร์โค้ดแล้วกด Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();addBarcodeFromInput();}">
          <button class="btn btn-light" onclick="addBarcodeFromInput()">เพิ่ม</button>
        </div>
      </div>
      <div style="height:14px"></div>
      <div class="product-picker">
        <select id="manualProduct"><option value="">เลือกสินค้าด้วยชื่อ</option>${opts}</select>
        <button class="btn btn-light" onclick="addSelectedProduct()">${G_ICONS.plus}เพิ่ม</button>
      </div>
    `;
  }

  el("content").innerHTML = `
    ${connectionNotice()}
    <div id="posNetworkSyncBanner" class="pos-net-banner" style="display:none;"></div>
    <div class="pos-layout">
      <div class="pos-panel">
        ${card("เลือก / สแกนสินค้า", `
          ${modeTabs}
          ${leftContent}
        `, `<span class="pos-terminal">${state.terminal}</span>`)}

        ${card("สินค้าใกล้หมด", `
          <div class="list">
            ${lowProducts().slice(0,5).map(p=>`
              <div class="list-item">
                <div>
                  <strong>${escapeHtml(p.product_name)}</strong>
                  <small>${p.stock_qty} ${escapeHtml(p.unit || 'ชิ้น')} คงเหลือ • ขั้นต่ำ ${p.min_stock} ${escapeHtml(p.unit || 'ชิ้น')}</small>
                </div>
                ${statusForProduct(p)}
              </div>
            `).join("") || `<div class="empty">ไม่มีสินค้าใกล้หมด</div>`}
          </div>
        `)}
      </div>

      <div class="pos-panel">
        ${card(`ตะกร้า • <span id="posCartCardCountText">${cartCount()} รายการ</span>`, `
          ${renderCartLiveScannerDock()}
          <div id="posCartRowsContainer">
            ${renderCartRows()}
          </div>
          <div id="posCartBillDiscountContainer">
            ${renderCartBillDiscountSection()}
          </div>
          <div id="posCartTotalsContainer" class="cart-total-box">
            ${renderCartTotalBox()}
          </div>
        `, `
          <button type="button" class="cart-scanner-toggle-btn ${state.cartScannerActive ? 'active' : ''}" onclick="toggleCartLiveScanner()" title="เปิด/ปิดกล้องสแกนบาร์โค้ดด่วนลงตะกร้า">
            ${state.cartScannerActive ? '🔴 ปิดกล้อง' : '📷 สแกนด่วน (Rapid Scan)'}
          </button>
        `)}
      </div>
    </div>
  `;
  if(window.EaOfflineSync) window.EaOfflineSync.updateSyncUI();
}

function renderCartBillDiscountSection(){
  if(!state.cart.length) return "";
  const billDiscAmt = cartBillDiscountAmount();
  const hasActiveBillDisc = Boolean(state.billDiscount && state.billDiscount.type !== "none" && state.billDiscount.value > 0);

  if(hasActiveBillDisc && billDiscAmt > 0){
    const typeLabel = state.billDiscount.type === "percent" ? `${state.billDiscount.value}%` : `฿${money(state.billDiscount.value)}`;
    return `
      <div class="cart-bill-discount-wrap">
        <div class="cart-bill-discount-head">
          <span class="cart-bill-discount-label">🏷️ ส่วนลดท้ายบิลทั้งตะกร้า</span>
        </div>
        <div class="cart-bill-discount-active-bar">
          <div class="cart-bill-discount-active-info">
            <strong>-฿${money(billDiscAmt)} (${typeLabel})</strong>
            <small>${escapeHtml(state.billDiscount.note || "ส่วนลดพิเศษท้ายบิล")}</small>
          </div>
          <div class="cart-bill-discount-active-actions">
            <button type="button" class="cart-quick-disc-btn custom" onclick="openBillDiscountModal()">✏️ แก้ไข</button>
            <button type="button" class="cart-quick-disc-btn" style="color:#f87171;" onclick="clearBillDiscount()">✕ ยกเลิก</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="cart-bill-discount-wrap">
      <div class="cart-bill-discount-head">
        <span class="cart-bill-discount-label">🏷️ เพิ่มส่วนลดท้ายบิล / โปรโมชั่น:</span>
      </div>
      <div class="cart-discount-quick-chips">
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountBaht(10)">-10฿</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountBaht(20)">-20฿</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountBaht(50)">-50฿</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountBaht(100)">-100฿</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountPct(5)">-5%</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountPct(10)">-10%</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountPct(15)">-15%</button>
        <button type="button" class="cart-quick-disc-btn" onclick="applyQuickBillDiscountPct(20)">-20%</button>
        <button type="button" class="cart-quick-disc-btn custom" onclick="openBillDiscountModal()">+ กำหนดเอง...</button>
      </div>
    </div>
  `;
}

function renderCartRows(){
  if(!state.cart.length) return `<div class="empty">ยังไม่มีสินค้าในตะกร้า<br><small>แตะเลือกสินค้าหรือสแกนบาร์โค้ด</small></div>`;
  return `
    <div class="cart-list">
      ${state.cart.map((c,i)=>{
        const origPrice = Number(c.original_price ?? c.unit_price);
        const currPrice = Number(c.unit_price);
        const isDiscounted = Boolean(c.is_discounted || currPrice < origPrice);
        const discountAmount = Math.max(0, origPrice - currPrice);
        const unit = c.unit || "ชิ้น";
        const lineTotal = c.qty * currPrice;
        const lineOrigTotal = c.qty * origPrice;

        return `
          <div class="cart-row">
            <div>
              <div class="cart-name">${escapeHtml(c.name)}</div>
              <div class="cart-meta">
                ${c.barcode?`Barcode: <span class="barcode-value">${escapeHtml(c.barcode)}</span> • `:""}
                ${isDiscounted 
                  ? `<span style="text-decoration:line-through; color:#94a3b8; font-size:11px;">฿${money(origPrice)}</span> <strong style="color:#fbbf24;">฿${money(currPrice)}</strong> / ${escapeHtml(unit)}` 
                  : `฿${money(currPrice)} / ${escapeHtml(unit)}`} • Stock ${c.stock} ${escapeHtml(unit)}
              </div>
              ${isDiscounted ? `
                <div class="cart-discount-badge">
                  🏷️ ลดราคาสินค้า: -฿${money(discountAmount)}/${escapeHtml(unit)} ${c.discount_note ? `(${escapeHtml(c.discount_note)})` : ''}
                </div>
              ` : ''}
              ${Array.isArray(c.weights) && c.weights.length ? `<div class="cart-discount-badge" style="color:#93c5fd;">⚖️ น้ำหนัก: ${c.weights.map(w => escapeHtml(String(w))).join(", ")} กก.</div>` : ''}
              <div>
                <button type="button" class="cart-discount-btn" onclick="openCartDiscountModal(${i})">
                  🏷️ ${isDiscounted ? "แก้ไขส่วนลดสินค้า" : "ลดราคาสินค้านี้"}
                </button>
              </div>
            </div>
            <div class="cart-side">
              <div>
                ${isDiscounted ? `<div style="text-decoration:line-through; font-size:11px; color:#94a3b8; text-align:right;">฿${money(lineOrigTotal)}</div>` : ''}
                <strong style="${isDiscounted ? 'color:#34d399;' : ''}">฿${money(lineTotal)}</strong>
              </div>
              <div class="qty-control">
                <button onclick="changeCartQty(${i},-1)" aria-label="ลดจำนวน">−</button>
                <strong>${c.qty}</strong>
                <button onclick="changeCartQty(${i},1)" aria-label="เพิ่มจำนวน">+</button>
                <button class="cart-remove-btn" onclick="removeCartItem(${i})" title="ลบ">${G_ICONS.trash}</button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function openCartDiscountModal(index){
  const item = state.cart[index];
  if (!item) return;

  const catalogProd = productById(item.product_id);
  const regularPrice = Number(item.original_price || (catalogProd ? catalogProd.sale_price : item.unit_price) || item.unit_price);
  const currentPrice = Number(item.unit_price);
  const currentDiscount = Math.max(0, regularPrice - currentPrice);
  const currentPct = regularPrice > 0 ? Math.round((currentDiscount / regularPrice) * 100) : 0;
  const unit = item.unit || catalogProd?.unit || "ชิ้น";
  const qty = Number(item.qty || 1);

  el("modalTitle").textContent = "🏷️ ลดราคาสินค้า / ส่วนลดเฉพาะรายการ";
  el("modalBody").innerHTML = `
    <div class="discount-modal-box">
      <div style="background:#0f172a; padding:12px 14px; border-radius:10px; border:1px solid #334155;">
        <div style="font-weight:800; font-size:15px; color:#ffffff;">${escapeHtml(item.name)}</div>
        <div style="font-size:12.5px; color:#94a3b8; margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
          <span>ราคาปกติในระบบ: <strong style="color:#38bdf8; font-size:13.5px;">฿${money(regularPrice)}</strong> / ${escapeHtml(unit)}</span>
          <span style="color:#cbd5e1;">จำนวนในบิล: <strong>${qty} ${escapeHtml(unit)}</strong></span>
        </div>
      </div>

      ${(() => {
        const promos = Array.isArray(catalogProd?.promotions) ? catalogProd.promotions : [];
        return `
        <div>
          <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">ราคาโปร / ของแถม:</label>
          <div class="discount-quick-chips">
            ${promos.map(pr => `<button type="button" class="discount-chip-btn" style="color:#fca5a5; border-color:rgba(248,113,113,.5);" onclick="applyPromoInDiscountModal(${promoUnitPrice(pr)}, '${escapeHtml(String(pr.label).replace(/'/g, ''))}', ${regularPrice}, ${qty})">โปร ${escapeHtml(pr.label)} (฿${promoUnitPrice(pr)}/${escapeHtml(unit)})</button>`).join("")}
            <button type="button" class="discount-chip-btn" style="color:#86efac;" onclick="applyPromoInDiscountModal(0, 'แถม', ${regularPrice}, ${qty})">🎁 แถมฟรี (฿0)</button>
          </div>
        </div>`;
      })()}

      <div class="form-grid">
        <div class="field">
          <label>ราคาขายใหม่ (บาท / ${escapeHtml(unit)})</label>
          <input id="discountCustomPrice" type="number" min="0" step="any" value="${currentPrice}" oninput="onDiscountPriceChange(${regularPrice}, ${qty})">
        </div>

        <div class="field">
          <label>หรือ ระบุส่วนลด (บาท / ${escapeHtml(unit)})</label>
          <input id="discountBahtInput" type="number" min="0" step="any" value="${currentDiscount}" oninput="onDiscountBahtChange(${regularPrice}, ${qty})">
        </div>

        <div class="field" style="grid-column: 1 / -1;">
          <label>หรือ ระบุส่วนลดเป็นเปอร์เซ็นต์ (%)</label>
          <input id="discountPctInput" type="number" min="0" max="100" step="1" value="${currentPct}" oninput="onDiscountPctChange(${regularPrice}, ${qty})">
        </div>
      </div>

      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">ส่วนลดด่วนยอดนิยม:</label>
        <div class="discount-quick-chips">
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountBaht(${regularPrice}, 5, ${qty})">ลด 5 บาท</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountBaht(${regularPrice}, 10, ${qty})">ลด 10 บาท</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountBaht(${regularPrice}, 20, ${qty})">ลด 20 บาท</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountBaht(${regularPrice}, 50, ${qty})">ลด 50 บาท</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountPct(${regularPrice}, 5, ${qty})">ลด 5%</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountPct(${regularPrice}, 10, ${qty})">ลด 10%</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountPct(${regularPrice}, 15, ${qty})">ลด 15%</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountPct(${regularPrice}, 20, ${qty})">ลด 20%</button>
          <button type="button" class="discount-chip-btn" onclick="applyQuickItemDiscountPct(${regularPrice}, 50, ${qty})">ลด 50% (ครึ่งราคา)</button>
          <button type="button" class="discount-chip-btn" style="color:#f87171;" onclick="resetToRegularPrice(${regularPrice}, ${qty})">↺ คืนราคาปกติ (฿${money(regularPrice)})</button>
        </div>
      </div>

      <div class="field">
        <label>เหตุผล / หมายเหตุส่วนลด (ระบุเพื่อพิมพ์บนใบเสร็จและบันทึกรายงาน)</label>
        <input id="discountNoteInput" type="text" placeholder="เช่น ลูกค้าประจำ, VIP, โปรโมชั่น, พนักงาน" value="${escapeHtml(item.discount_note || '')}">
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:6px;">
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('ลูกค้าประจำ')">ลูกค้าประจำ</button>
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('ลูกค้า VIP')">ลูกค้า VIP</button>
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('โปรโมชั่นพิเศษ')">โปรโมชั่นพิเศษ</button>
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('พนักงาน')">พนักงาน</button>
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('ซื้อจำนวนมาก')">ซื้อจำนวนมาก</button>
          <button type="button" class="reason-chip-btn" onclick="setDiscountReason('ลดล้างสต็อก')">ลดล้างสต็อก</button>
        </div>
      </div>

      <div class="discount-preview-card" id="itemDiscountPreview">
        <div class="discount-preview-row">
          <span>ยอดรวมเดิม (${qty} × ฿${money(regularPrice)}):</span>
          <span>฿${money(qty * regularPrice)}</span>
        </div>
        <div class="discount-preview-row" style="color:#fbbf24;">
          <span>ส่วนลดรวมที่ได้รับ (${qty} × ฿${money(currentDiscount)}):</span>
          <span id="previewItemDiscountAmount">-฿${money(qty * currentDiscount)}</span>
        </div>
        <div class="discount-preview-row final">
          <span>ยอดชำระของสินค้ารายการนี้:</span>
          <strong id="previewItemFinalTotal">฿${money(qty * currentPrice)}</strong>
        </div>
      </div>

      <div class="actions" style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
        <button type="button" class="btn btn-light" onclick="closeProductModal()">ยกเลิก</button>
        <button type="button" class="btn btn-primary" onclick="saveCartDiscount(${index}, ${regularPrice})">ตกลงบันทึกส่วนลด</button>
      </div>
    </div>
  `;

  el("modal").showModal();
}

function setDiscountReason(text){
  const noteInput = el("discountNoteInput");
  if(noteInput){
    noteInput.value = text;
    noteInput.focus();
  }
}

function updateItemDiscountPreview(regularPrice, qty, newPrice){
  const p = Math.max(0, Number(newPrice) || 0);
  const diffPerUnit = Math.max(0, regularPrice - p);
  const totalDiff = diffPerUnit * qty;
  const lineFinal = p * qty;

  const discEl = el("previewItemDiscountAmount");
  const finalEl = el("previewItemFinalTotal");
  if(discEl) discEl.textContent = `-฿${money(totalDiff)}`;
  if(finalEl) finalEl.textContent = `฿${money(lineFinal)}`;
}

function onDiscountPriceChange(regularPrice, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !bahtInput) return;
  const p = Math.max(0, Number(priceInput.value) || 0);
  const diff = Math.max(0, regularPrice - p);
  bahtInput.value = diff;
  if(pctInput){
    pctInput.value = regularPrice > 0 ? Math.round((diff / regularPrice) * 100) : 0;
  }
  updateItemDiscountPreview(regularPrice, qty, p);
}

function onDiscountBahtChange(regularPrice, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !bahtInput) return;
  const b = Math.max(0, Number(bahtInput.value) || 0);
  const newPrice = Math.max(0, regularPrice - b);
  priceInput.value = newPrice;
  if(pctInput){
    pctInput.value = regularPrice > 0 ? Math.round((b / regularPrice) * 100) : 0;
  }
  updateItemDiscountPreview(regularPrice, qty, newPrice);
}

function onDiscountPctChange(regularPrice, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !pctInput) return;
  const pct = Math.max(0, Math.min(100, Number(pctInput.value) || 0));
  const diff = Math.round((regularPrice * pct) / 100);
  const newPrice = Math.max(0, regularPrice - diff);
  if(bahtInput) bahtInput.value = diff;
  priceInput.value = newPrice;
  updateItemDiscountPreview(regularPrice, qty, newPrice);
}

function applyQuickItemDiscountBaht(regularPrice, baht, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !bahtInput) return;
  bahtInput.value = baht;
  const newPrice = Math.max(0, regularPrice - baht);
  priceInput.value = newPrice;
  if(pctInput){
    pctInput.value = regularPrice > 0 ? Math.round((baht / regularPrice) * 100) : 0;
  }
  updateItemDiscountPreview(regularPrice, qty, newPrice);
}

function applyQuickItemDiscountPct(regularPrice, pct, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !bahtInput) return;
  const discountAmt = Math.round((regularPrice * pct) / 100);
  bahtInput.value = discountAmt;
  if(pctInput) pctInput.value = pct;
  const newPrice = Math.max(0, regularPrice - discountAmt);
  priceInput.value = newPrice;
  updateItemDiscountPreview(regularPrice, qty, newPrice);
}

function resetToRegularPrice(regularPrice, qty){
  const priceInput = el("discountCustomPrice");
  const bahtInput = el("discountBahtInput");
  const pctInput = el("discountPctInput");
  if (!priceInput || !bahtInput) return;
  priceInput.value = regularPrice;
  bahtInput.value = 0;
  if(pctInput) pctInput.value = 0;
  updateItemDiscountPreview(regularPrice, qty, regularPrice);
}

function applyPromoInDiscountModal(price, label, regularPrice, qty){
  const pi = el("discountCustomPrice"), ni = el("discountNoteInput");
  if(pi){ pi.value = price; onDiscountPriceChange(regularPrice, qty); }
  if(ni){ ni.value = label === "แถม" ? "แถม" : label; ni.focus(); }
}

function saveCartDiscount(index, regularPrice){
  const item = state.cart[index];
  if (!item) return;

  const priceInput = el("discountCustomPrice");
  const noteInput = el("discountNoteInput");
  const newPrice = Number(priceInput?.value ?? regularPrice);
  const note = (noteInput?.value || "").trim();

  item.original_price = Number(regularPrice);
  item.unit_price = Math.max(0, newPrice);
  item.discount_note = note;
  item.is_discounted = item.unit_price < item.original_price;

  saveCartLocal();
  closeProductModal();
  toast(item.is_discounted ? `บันทึกส่วนลดสินค้า ฿${money(item.unit_price)} เรียบร้อย 🏷️` : `คืนราคาปกติเรียบร้อย`);
  renderSale();
}

// Global Bill Discount Modal and quick handlers
let currentBillDiscountTab = "baht"; // "baht" | "percent"

function openBillDiscountModal(){
  if(!state.cart.length){
    toast("กรุณาเลือกสินค้าลงในตะกร้าก่อนระบุส่วนลดท้ายบิล");
    return;
  }

  const itemsTot = cartItemsTotal();
  const currentDisc = state.billDiscount || { type: "none", value: 0, note: "" };
  currentBillDiscountTab = currentDisc.type === "percent" ? "percent" : "baht";
  const initialValue = currentDisc.value || 0;

  el("modalTitle").textContent = "🏷️ ส่วนลดท้ายบิลทั้งตะกร้า (Cart / Bill Discount)";
  el("modalBody").innerHTML = `
    <div class="discount-modal-box">
      <div style="background:#0f172a; padding:12px 14px; border-radius:10px; border:1px solid #334155;">
        <div style="font-size:12.5px; color:#94a3b8;">ยอดรวมสินค้าก่อนลดท้ายบิล:</div>
        <div style="font-size:20px; font-weight:900; color:#38bdf8; margin-top:2px;">฿${money(itemsTot)}</div>
      </div>

      <div class="discount-type-tabs">
        <button type="button" id="tabBillBaht" class="discount-type-tab ${currentBillDiscountTab==='baht'?'active':''}" onclick="setBillDiscountTab('baht', ${itemsTot})">
          💵 ลดเป็นบาท (฿)
        </button>
        <button type="button" id="tabBillPercent" class="discount-type-tab ${currentBillDiscountTab==='percent'?'active':''}" onclick="setBillDiscountTab('percent', ${itemsTot})">
          % ลดเป็นเปอร์เซ็นต์ (%)
        </button>
      </div>

      <div class="field">
        <label id="billDiscountInputLabel">${currentBillDiscountTab === 'baht' ? 'ระบุจำนวนเงินที่ต้องการลด (บาท)' : 'ระบุเปอร์เซ็นต์ส่วนลด (%)'}</label>
        <input id="billDiscountValueInput" type="number" min="0" step="any" value="${initialValue}" oninput="onBillDiscountValueChange(${itemsTot})">
      </div>

      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">ส่วนลดด่วน:</label>
        <div id="billDiscountChipsContainer" class="discount-quick-chips">
          ${renderBillDiscountQuickChips(currentBillDiscountTab, itemsTot)}
        </div>
      </div>

      <div class="field">
        <label>เหตุผล / โปรโมชั่น (ระบุเพื่อพิมพ์ลงบนใบเสร็จและดูในรายงาน)</label>
        <input id="billDiscountNoteInput" type="text" placeholder="เช่น โปรโมชั่นเปิดร้าน, ลูกค้า VIP, คูปองส่วนลด" value="${escapeHtml(currentDisc.note || '')}">
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:6px;">
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('โปรโมชั่นเปิดร้าน')">โปรโมชั่นเปิดร้าน</button>
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('ลูกค้า VIP')">ลูกค้า VIP</button>
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('คูปองส่วนลด')">คูปองส่วนลด</button>
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('ลูกค้าประจำ')">ลูกค้าประจำ</button>
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('ส่วนลดพิเศษ')">ส่วนลดพิเศษ</button>
          <button type="button" class="reason-chip-btn" onclick="setBillDiscountReason('ซื้อครบเป้า')">ซื้อครบเป้า</button>
        </div>
      </div>

      <div class="discount-preview-card" id="billDiscountPreviewCard">
        <div class="discount-preview-row">
          <span>ยอดรวมสินค้า:</span>
          <span>฿${money(itemsTot)}</span>
        </div>
        <div class="discount-preview-row" style="color:#fbbf24;">
          <span>ส่วนลดที่จะได้รับ:</span>
          <span id="previewBillDiscAmt">-฿0.00</span>
        </div>
        <div class="discount-preview-row final">
          <span>ยอดสุทธิหลังหักส่วนลด:</span>
          <strong id="previewBillNetTot">฿${money(itemsTot)}</strong>
        </div>
      </div>

      <div class="actions" style="display:flex; gap:10px; justify-content:space-between; margin-top:10px;">
        <button type="button" class="btn btn-light" style="color:#f87171;" onclick="clearBillDiscountFromModal()">ล้างส่วนลด</button>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-light" onclick="closeProductModal()">ยกเลิก</button>
          <button type="button" class="btn btn-primary" onclick="saveBillDiscountModal(${itemsTot})">ใช้ส่วนลดท้ายบิล</button>
        </div>
      </div>
    </div>
  `;

  el("modal").showModal();
  onBillDiscountValueChange(itemsTot);
}

function renderBillDiscountQuickChips(tab, itemsTot){
  if(tab === "percent"){
    return `
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(5, 'percent', ${itemsTot})">5%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(10, 'percent', ${itemsTot})">10%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(15, 'percent', ${itemsTot})">15%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(20, 'percent', ${itemsTot})">20%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(25, 'percent', ${itemsTot})">25%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(30, 'percent', ${itemsTot})">30%</button>
      <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(50, 'percent', ${itemsTot})">50%</button>
    `;
  }
  return `
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(10, 'baht', ${itemsTot})">10 บาท</button>
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(20, 'baht', ${itemsTot})">20 บาท</button>
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(50, 'baht', ${itemsTot})">50 บาท</button>
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(100, 'baht', ${itemsTot})">100 บาท</button>
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(200, 'baht', ${itemsTot})">200 บาท</button>
    <button type="button" class="discount-chip-btn" onclick="setBillDiscountDirectVal(500, 'baht', ${itemsTot})">500 บาท</button>
  `;
}

function setBillDiscountTab(tab, itemsTot){
  currentBillDiscountTab = tab;
  const tabBaht = el("tabBillBaht");
  const tabPct = el("tabBillPercent");
  const inputLabel = el("billDiscountInputLabel");
  const chipsContainer = el("billDiscountChipsContainer");

  if(tab === "percent"){
    tabBaht?.classList.remove("active");
    tabPct?.classList.add("active");
    if(inputLabel) inputLabel.textContent = "ระบุเปอร์เซ็นต์ส่วนลด (%)";
  } else {
    tabPct?.classList.remove("active");
    tabBaht?.classList.add("active");
    if(inputLabel) inputLabel.textContent = "ระบุจำนวนเงินที่ต้องการลด (บาท)";
  }

  if(chipsContainer){
    chipsContainer.innerHTML = renderBillDiscountQuickChips(tab, itemsTot);
  }
  onBillDiscountValueChange(itemsTot);
}

function setBillDiscountDirectVal(val, tab, itemsTot){
  const input = el("billDiscountValueInput");
  if(input){
    input.value = val;
  }
  if(tab !== currentBillDiscountTab){
    setBillDiscountTab(tab, itemsTot);
  } else {
    onBillDiscountValueChange(itemsTot);
  }
}

function setBillDiscountReason(text){
  const noteInput = el("billDiscountNoteInput");
  if(noteInput){
    noteInput.value = text;
    noteInput.focus();
  }
}

function onBillDiscountValueChange(itemsTot){
  const valInput = el("billDiscountValueInput");
  const discEl = el("previewBillDiscAmt");
  const netEl = el("previewBillNetTot");
  if(!valInput || !discEl || !netEl) return;

  const val = Math.max(0, Number(valInput.value) || 0);
  let discAmt = 0;
  if(currentBillDiscountTab === "percent"){
    const pct = Math.min(100, val);
    discAmt = Math.round((itemsTot * pct) / 100);
  } else {
    discAmt = Math.min(itemsTot, val);
  }

  const netTot = Math.max(0, itemsTot - discAmt);
  discEl.textContent = `-฿${money(discAmt)}`;
  netEl.textContent = `฿${money(netTot)}`;
}

function saveBillDiscountModal(itemsTot){
  const valInput = el("billDiscountValueInput");
  const noteInput = el("billDiscountNoteInput");
  const val = Math.max(0, Number(valInput?.value) || 0);
  const note = (noteInput?.value || "").trim();

  if(val <= 0){
    clearBillDiscount();
    closeProductModal();
    return;
  }

  state.billDiscount = {
    type: currentBillDiscountTab,
    value: val,
    note: note || (currentBillDiscountTab === "percent" ? `ลด ${val}%` : `ลด ${val} บาท`)
  };

  saveBillDiscountLocal();
  closeProductModal();
  toast(`ใช้ส่วนลดท้ายบิลเรียบร้อย 🏷️`);
  renderSale();
}

function clearBillDiscountFromModal(){
  clearBillDiscount();
  closeProductModal();
}

function applyQuickBillDiscountBaht(baht, note = ""){
  if(!state.cart.length){
    toast("กรุณาเลือกสินค้าก่อนใส่ส่วนลด");
    return;
  }
  state.billDiscount = {
    type: "baht",
    value: Number(baht),
    note: note || `ลด ${baht} บาท`
  };
  saveBillDiscountLocal();
  toast(`ใช้ส่วนลดท้ายบิล -฿${money(baht)} เรียบร้อย 🏷️`);
  renderSale();
}

function applyQuickBillDiscountPct(pct, note = ""){
  if(!state.cart.length){
    toast("กรุณาเลือกสินค้าก่อนใส่ส่วนลด");
    return;
  }
  state.billDiscount = {
    type: "percent",
    value: Number(pct),
    note: note || `ลด ${pct}%`
  };
  saveBillDiscountLocal();
  toast(`ใช้ส่วนลดท้ายบิล ${pct}% เรียบร้อย 🏷️`);
  renderSale();
}

function clearBillDiscount(){
  state.billDiscount = { type: "none", value: 0, note: "" };
  saveBillDiscountLocal();
  toast("ยกเลิกส่วนลดท้ายบิลแล้ว");
  renderSale();
}

// Products sold per piece but weighed (e.g. hose rolls): ask the weight of this unit.
function askUnitWeight(p){
  const v = prompt(`น้ำหนัก ${p.product_name} ชิ้น/ม้วนนี้ (กก.)`, "");
  if(v === null) return null;
  const w = Number(String(v).replace(",", "."));
  if(!(w > 0)){ toast("กรุณาใส่น้ำหนักเป็นตัวเลข"); return null; }
  return Math.round(w*1000)/1000;
}

function addProductToCart(p){
  if(!p){toast("ไม่พบสินค้า");return false}
  if(Number(p.stock_qty)<=0){toast("สินค้าหมด");return false}
  const row=state.cart.find(x=>x.product_id===p.id && !x.price_note && !x.is_discounted);
  let weight=null;
  if(p.track_weight){ weight=askUnitWeight(p); if(weight===null) return false; }
  const inCart=state.cart.filter(x=>x.product_id===p.id).reduce((a,x)=>a+Number(x.qty||0),0);
  if(row){
    if(inCart+1>Number(p.stock_qty)){toast("จำนวนในตะกร้าเกิน Stock");return false}
    row.qty++;
    if(weight!==null) row.weights=[...(row.weights||[]),weight];
  } else {
    if(inCart+1>Number(p.stock_qty)){toast("จำนวนในตะกร้าเกิน Stock");return false}
    state.cart.push({
      product_id: p.id,
      name: p.product_name,
      barcode: p.barcode||"",
      unit: p.unit || "ชิ้น",
      qty: 1,
      unit_price: Number(p.sale_price),
      original_price: Number(p.sale_price),
      stock: Number(p.stock_qty),
      discount_note: "",
      is_discounted: false,
      ...(weight!==null ? { weights: [weight] } : {})
    });
  }
  saveCartLocal();
  updateBottomNav();
  beepSuccess();
  const cartItem = state.cart.find(x => x.product_id === p.id);
  const currentCount = cartItem ? cartItem.qty : 1;
  triggerScanSuccessFeedback(p, currentCount);
  if(state.page==="sale") renderSale();
  return true;
}

function addBarcode(code){
  const clean=String(code||"").trim();
  if(!clean) return;
  const p=productByBarcode(clean);
  if(!p){toast(`ไม่พบบาร์โค้ด ${clean}`);return}
  addProductToCart(p);
}

function addBarcodeFromInput(){
  const i=el("manualBarcode");
  addBarcode(i.value);
  i.value="";
  i.focus();
}

function addSelectedProduct(){
  const p=productById(el("manualProduct").value);
  if(p) addProductToCart(p);
}

function changeCartQty(i,d){
  const r=state.cart[i];
  if(!r) return;
  const n=r.qty+d;
  const prod=productById(r.product_id);
  if(n<=0) state.cart.splice(i,1);
  else if(n>r.stock){toast("จำนวนเกิน Stock");return}
  else {
    if(prod?.track_weight){
      if(d>0){ const w=askUnitWeight(prod); if(w===null) return; r.weights=[...(r.weights||[]),w]; }
      else if(Array.isArray(r.weights)) r.weights=r.weights.slice(0,Math.max(0,r.weights.length+d));
    }
    r.qty=n;
  }
  saveCartLocal();
  updateBottomNav();
  renderSale();
}

function removeCartItem(i){
  state.cart.splice(i,1);
  saveCartLocal();
  updateBottomNav();
  renderSale();
}

function clearCart(){
  if(!state.cart || !state.cart.length){
    toast("ไม่มีสินค้าในตะกร้า");
    return;
  }
  state.cart=[];
  state.receivedCash=0;
  saveCartLocal();
  updateBottomNav();
  toast("ล้างตะกร้าสินค้าเรียบร้อยแล้ว");
  renderSale();
}

function generateInvoicePrintHTML(bill){
  if(!bill) return "";
  const storeName = state.settings?.shopName || "EA FAIR SALE";
  const branchName = state.settings?.shopBranch || "";
  const address = state.settings?.shopAddress || "";
  const phone = state.settings?.shopPhone || "";
  const taxId = state.settings?.shopTaxId || "";
  const lineId = state.settings?.shopLine || "";
  const footerNote = state.settings?.receiptFooterNote || "ขอบคุณที่อุดหนุนสินค้า / Thank you!";
  const enableVat = Boolean(state.settings?.enableVat);
  const vatRate = Number(state.settings?.vatRate || 7);

  const dateObj = bill.date ? new Date(bill.date) : new Date();
  const dateStr = dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' }) + " " + 
                  dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });
  
  const items = bill.items || [];
  const totalItemsCount = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  
  const isCash = bill.paymentMethod === "cash";
  const paymentLabel = isCash ? "เงินสด (Cash)" : "สแกน QR / โอนเงิน (PromptPay)";
  
  let paymentDetails = `
    <div class="print-row">
      <span>ชำระโดย:</span>
      <span style="font-weight:700;">${paymentLabel}</span>
    </div>
  `;

  if(isCash && Number(bill.received) > 0){
    paymentDetails += `
      <div class="print-row">
        <span>รับเงินมา:</span>
        <span>฿${money(bill.received)}</span>
      </div>
      <div class="print-row" style="font-weight:700;">
        <span>เงินทอน:</span>
        <span>฿${money(bill.change || 0)}</span>
      </div>
    `;
  }

  const itemsHtml = items.map((item, idx) => {
    const isDisc = Boolean(item.is_discounted || (item.original_price && item.unit_price < item.original_price));
    return `
      <div class="print-item-row">
        <div class="print-item-name">${idx + 1}. ${escapeHtml(item.name)}</div>
        <div class="print-item-details">
          <span>
            ${item.qty} ${escapeHtml(item.unit || "ชิ้น")} × ฿${money(item.unit_price)}
            ${isDisc ? `<span style="font-size:9.5px; color:#444;"> (ลดจาก ฿${money(item.original_price)}${item.discount_note ? ' - '+escapeHtml(item.discount_note) : ''})</span>` : ''}
          </span>
          <span class="print-item-total">฿${money(item.line_total || (item.qty * item.unit_price))}</span>
        </div>
      </div>
    `;
  }).join("");

  const subtotalVal = Number(bill.subtotal || bill.itemsTotal || bill.total || 0);
  const itemsDiscVal = Number(bill.itemsDiscount || 0);
  const billDiscVal = Number(bill.billDiscount || 0);
  const totalDiscVal = Number(bill.totalDiscount || (itemsDiscVal + billDiscVal));

  let discountHtml = "";
  if(itemsDiscVal > 0){
    discountHtml += `
      <div class="print-row" style="color:#222;">
        <span>ส่วนลดเฉพาะรายการ:</span>
        <span>-฿${money(itemsDiscVal)}</span>
      </div>
    `;
  }
  if(billDiscVal > 0){
    const note = bill.billDiscountDetail?.note ? ` (${escapeHtml(bill.billDiscountDetail.note)})` : "";
    discountHtml += `
      <div class="print-row" style="color:#222;">
        <span>ส่วนลดท้ายบิล${note}:</span>
        <span>-฿${money(billDiscVal)}</span>
      </div>
    `;
  }
  if(totalDiscVal > 0){
    discountHtml += `
      <div class="print-row" style="font-weight:700; color:#15803d;">
        <span>ประหยัดได้ทั้งหมด:</span>
        <span>฿${money(totalDiscVal)}</span>
      </div>
    `;
  }

  const grandTotal = Number(bill.total || 0);
  let vatHtml = "";
  if(enableVat) {
    const vatAmt = grandTotal - (grandTotal / (1 + vatRate / 100));
    const exclVat = grandTotal - vatAmt;
    vatHtml = `
      <div class="print-row" style="font-size:10.5px; color:#444; border-top:1px dashed #bbb; padding-top:4px; margin-top:4px;">
        <span>ราคาก่อน VAT (${100}%):</span>
        <span>฿${money(exclVat)}</span>
      </div>
      <div class="print-row" style="font-size:10.5px; color:#444;">
        <span>ภาษีมูลค่าเพิ่ม VAT (${vatRate}%):</span>
        <span>฿${money(vatAmt)}</span>
      </div>
    `;
  }

  return `
    <div class="thermal-receipt">
      <div class="print-header">
        <div class="print-logo">${escapeHtml(storeName)}</div>
        ${branchName ? `<div style="font-size:11px; font-weight:600; color:#333; margin-top:2px;">${escapeHtml(branchName)}</div>` : ''}
        ${address ? `<div style="font-size:10px; color:#444; margin-top:2px;">${escapeHtml(address)}</div>` : ''}
        ${phone || lineId ? `
          <div style="font-size:10px; color:#444; margin-top:2px;">
            ${phone ? `Tel: ${escapeHtml(phone)} ` : ''}
            ${lineId ? `Line: ${escapeHtml(lineId)}` : ''}
          </div>
        ` : ''}
        ${taxId ? `<div style="font-size:9.5px; color:#555;">เลขประจำตัวผู้เสียภาษี: ${escapeHtml(taxId)}</div>` : ''}
        <div class="print-title" style="margin-top:4px;">${enableVat ? 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ' : 'ใบเสร็จรับเงินอย่างย่อ'}</div>
      </div>

      <div class="print-divider">--------------------------------</div>

      <div class="print-meta">
        <div class="print-row">
          <span>เลขที่ใบเสร็จ:</span>
          <strong style="font-family:monospace; font-size:12px;">${escapeHtml(bill.saleNo || "-")}</strong>
        </div>
        <div class="print-row">
          <span>วันที่/เวลา:</span>
          <span>${dateStr}</span>
        </div>
        <div class="print-row">
          <span>เครื่องจุดขาย:</span>
          <span>${escapeHtml(bill.terminal || state.terminal || "POS-01")}</span>
        </div>
      </div>

      <div class="print-divider">--------------------------------</div>

      <div class="print-items-list">
        ${itemsHtml || '<div style="text-align:center; padding:6px 0;">ไม่มีรายการสินค้า</div>'}
      </div>

      <div class="print-divider">--------------------------------</div>

      <div class="print-totals">
        <div class="print-row">
          <span>จำนวนสินค้ารวม:</span>
          <span>${totalItemsCount} ชิ้น</span>
        </div>
        ${totalDiscVal > 0 ? `
          <div class="print-row">
            <span>ยอดรวมสินค้า:</span>
            <span>฿${money(subtotalVal)}</span>
          </div>
          ${discountHtml}
        ` : ''}
        <div class="print-row print-grand-total">
          <span>ยอดชำระสุทธิ</span>
          <span>฿${money(bill.total)}</span>
        </div>
        ${vatHtml}
        ${paymentDetails}
      </div>

      <div class="print-divider">--------------------------------</div>

      <div class="print-footer">
        <div style="font-weight:700;">${escapeHtml(footerNote)}</div>
        <div style="font-size:10px; color:#444; margin-top:3px;">กรุณาเก็บใบเสร็จไว้เพื่อเป็นหลักฐาน</div>
        <div class="print-barcode-text">*${escapeHtml(bill.saleNo || "EAF-001")}*</div>
      </div>
    </div>
  `;
}

function printReceipt(){
  const bill = state.lastBill;
  if(!bill){
    toast("ไม่พบข้อมูลใบเสร็จสำหรับการพิมพ์");
    return;
  }

  const printArea = el("receiptPrintArea");
  const invoiceHtml = generateInvoicePrintHTML(bill);
  if(printArea){
    printArea.innerHTML = invoiceHtml;
  }

  // Create isolated print iframe for optimal cross-browser & sandboxed preview compatibility
  let printFrame = el("receiptPrintFrame");
  if(!printFrame){
    printFrame = document.createElement("iframe");
    printFrame.id = "receiptPrintFrame";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.visibility = "hidden";
    document.body.appendChild(printFrame);
  }

  try {
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบเสร็จ - ${escapeHtml(bill.saleNo || "Invoice")}</title>
        <style>
          @page {
            margin: 4mm;
            size: auto;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, 'Sarabun', monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            padding: 8px;
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
          }
          .thermal-receipt {
            width: 100%;
          }
          .print-header {
            text-align: center;
            margin-bottom: 6px;
          }
          .print-logo {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .print-tagline {
            font-size: 10px;
            color: #333;
            margin-top: 1px;
          }
          .print-title {
            font-size: 11px;
            font-weight: 700;
            margin-top: 4px;
          }
          .print-divider {
            font-family: monospace;
            text-align: center;
            overflow: hidden;
            margin: 4px 0;
            font-weight: 700;
            color: #333;
          }
          .print-meta {
            font-size: 10.5px;
          }
          .print-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 11px;
          }
          .print-items-list {
            margin: 4px 0;
          }
          .print-item-row {
            margin: 4px 0;
          }
          .print-item-name {
            font-size: 11px;
            font-weight: 700;
          }
          .print-item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            padding-left: 8px;
            color: #222;
          }
          .print-item-total {
            font-weight: 700;
          }
          .print-totals {
            margin: 4px 0;
            font-size: 11px;
          }
          .print-grand-total {
            font-size: 14px;
            font-weight: 900;
            margin: 4px 0;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
          }
          .print-footer {
            text-align: center;
            margin-top: 8px;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .print-barcode-text {
            font-family: monospace;
            letter-spacing: 2px;
            font-weight: 700;
            margin-top: 6px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${invoiceHtml}
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        window.print();
      }
    }, 150);
  } catch(e) {
    window.print();
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const str = String(text || "").trim();
  if (!str) return [];
  if (ctx.measureText(str).width <= maxWidth) {
    return [str];
  }
  
  const words = str.split(" ");
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      // If a single word (e.g. continuous Thai text) exceeds maxWidth, split character by character
      if (ctx.measureText(word).width > maxWidth) {
        let subStr = "";
        for (const ch of word) {
          if (ctx.measureText(subStr + ch).width <= maxWidth) {
            subStr += ch;
          } else {
            if (subStr) lines.push(subStr);
            subStr = ch;
          }
        }
        currentLine = subStr;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length ? lines : [str];
}

async function saveReceiptAsJPEG(billParam){
  const bill = billParam || state.lastBill;
  if(!bill){
    toast("ไม่พบข้อมูลใบเสร็จสำหรับการสร้างรูป");
    return;
  }

  try {
    const scale = 2; // high-resolution 2x for sharp retina rendering
    const width = 460;
    const fontSans = '-apple-system, BlinkMacSystemFont, "Sarabun", "Prompt", "Segoe UI", Roboto, sans-serif';
    const fontMono = '"Courier New", Courier, monospace, monospace';

    // Pre-measure items to calculate exact dynamic canvas height with FULL product names
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = `bold 12.5px ${fontSans}`;
    const maxItemNameWidth = width - 48; // 412px for full text wrapping

    const items = bill.items || [];
    let calculatedItemsHeight = 0;
    const processedItems = items.map((item, idx) => {
      const fullName = `${idx + 1}. ${item.name || "สินค้า"}`;
      const nameLines = wrapCanvasText(dummyCtx, fullName, maxItemNameWidth);
      const isDisc = Boolean(item.is_discounted || (item.original_price && item.unit_price < item.original_price));
      const itemHeight = (nameLines.length * 17) + (isDisc ? 36 : 22);
      calculatedItemsHeight += itemHeight;
      return {
        ...item,
        isDisc,
        nameLines
      };
    });

    const subtotalVal = Number(bill.subtotal || bill.itemsTotal || bill.total || 0);
    const itemsDiscVal = Number(bill.itemsDiscount || 0);
    const billDiscVal = Number(bill.billDiscount || 0);
    const totalDiscVal = Number(bill.totalDiscount || (itemsDiscVal + billDiscVal));

    const isCash = bill.paymentMethod === "cash";
    const hasCashChange = isCash && Number(bill.received) > 0;
    let extraDiscountHeight = 0;
    if (totalDiscVal > 0) {
      extraDiscountHeight += 24; // Subtotal line
      if (itemsDiscVal > 0) extraDiscountHeight += 20;
      if (billDiscVal > 0) extraDiscountHeight += 20;
      extraDiscountHeight += 22; // Total savings line
    }
    const baseHeaderFooterHeight = (hasCashChange ? 430 : 390) + extraDiscountHeight;
    const dynamicHeight = Math.max(500, baseHeaderFooterHeight + (items.length ? calculatedItemsHeight : 30));
    
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = dynamicHeight * scale;
    const ctx = canvas.getContext("2d");
    if(!ctx){
      toast("ไม่สามารถสร้างรูปภาพได้");
      return;
    }

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, dynamicHeight);

    // Subtle border container
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, width - 16, dynamicHeight - 16);

    let y = 42;

    // Logo / Store Title
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 22px ${fontSans}`;
    ctx.textAlign = "center";
    ctx.fillText("EA FAIR SALE", width / 2, y);

    y += 20;
    ctx.fillStyle = "#64748b";
    ctx.font = `12px ${fontSans}`;
    ctx.fillText("ระบบบริหารการขายหน้าร้าน & คลังสินค้า", width / 2, y);

    y += 22;
    ctx.fillStyle = "#1e293b";
    ctx.font = `bold 14px ${fontSans}`;
    ctx.fillText("ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ", width / 2, y);

    // Divider helper
    function drawDashedLine(currentY){
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(22, currentY);
      ctx.lineTo(width - 22, currentY);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    y += 16;
    drawDashedLine(y);

    // Metadata
    y += 22;
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText("เลขที่ใบเสร็จ:", 24, y);
    ctx.textAlign = "right";
    ctx.font = `bold 12px ${fontMono}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(bill.saleNo || "-", width - 24, y);

    y += 20;
    const dateObj = bill.date ? new Date(bill.date) : new Date();
    const dateStr = dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' }) + " " + 
                    dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText("วันที่/เวลา:", 24, y);
    ctx.textAlign = "right";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(dateStr, width - 24, y);

    y += 20;
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText("จุดขาย (POS):", 24, y);
    ctx.textAlign = "right";
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(state.terminal || "POS-01", width - 24, y);

    y += 16;
    drawDashedLine(y);

    // Items list header
    y += 20;
    ctx.textAlign = "left";
    ctx.font = `bold 11.5px ${fontSans}`;
    ctx.fillStyle = "#475569";
    ctx.fillText("รายการสินค้า", 24, y);
    ctx.textAlign = "right";
    ctx.fillText("รวม (฿)", width - 24, y);

    y += 6;

    // Render items with FULL product names and discount details
    processedItems.forEach((item) => {
      ctx.textAlign = "left";
      ctx.font = `bold 12.5px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      
      // Render every line of the full product name
      item.nameLines.forEach((line) => {
        y += 17;
        ctx.fillText(line, 24, y);
      });

      // Quantity × Unit price on the left, line total on the right
      y += 16;
      ctx.font = `11.5px ${fontSans}`;
      ctx.fillStyle = "#64748b";
      ctx.fillText(`   ${item.qty} ${item.unit || "ชิ้น"} × ฿${money(item.unit_price)}`, 24, y);

      ctx.textAlign = "right";
      ctx.font = `bold 12.5px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(`฿${money(item.line_total || (item.qty * item.unit_price))}`, width - 24, y);

      if (item.isDisc) {
        y += 14;
        ctx.textAlign = "left";
        ctx.font = `10.5px ${fontSans}`;
        ctx.fillStyle = "#d97706";
        const origUnit = Number(item.original_price || item.unit_price);
        const discUnit = Math.max(0, origUnit - Number(item.unit_price));
        ctx.fillText(`   🏷️ ลด ฿${money(discUnit)}/หน่วย ${item.discount_note ? `(${item.discount_note})` : ''}`, 24, y);
      }
      
      y += 6;
    });

    if(!items.length){
      y += 24;
      ctx.textAlign = "center";
      ctx.font = `12px ${fontSans}`;
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("ไม่มีรายการสินค้า", width / 2, y);
    }

    y += 10;
    drawDashedLine(y);

    // Totals
    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
    y += 22;
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText("จำนวนสินค้ารวม:", 24, y);
    ctx.textAlign = "right";
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`${totalQty} ชิ้น`, width - 24, y);

    // If there are discounts, show subtotal and breakdown
    if (totalDiscVal > 0) {
      y += 20;
      ctx.textAlign = "left";
      ctx.font = `12px ${fontSans}`;
      ctx.fillStyle = "#64748b";
      ctx.fillText("ยอดรวมสินค้า (ก่อนลด):", 24, y);
      ctx.textAlign = "right";
      ctx.font = `12px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(`฿${money(subtotalVal)}`, width - 24, y);

      if (itemsDiscVal > 0) {
        y += 18;
        ctx.textAlign = "left";
        ctx.fillStyle = "#d97706";
        ctx.fillText("ส่วนลดเฉพาะรายการ:", 24, y);
        ctx.textAlign = "right";
        ctx.fillText(`-฿${money(itemsDiscVal)}`, width - 24, y);
      }

      if (billDiscVal > 0) {
        y += 18;
        ctx.textAlign = "left";
        ctx.fillStyle = "#d97706";
        const note = bill.billDiscountDetail?.note ? ` (${bill.billDiscountDetail.note})` : "";
        ctx.fillText(`ส่วนลดท้ายบิล${note}:`, 24, y);
        ctx.textAlign = "right";
        ctx.fillText(`-฿${money(billDiscVal)}`, width - 24, y);
      }

      y += 20;
      ctx.textAlign = "left";
      ctx.font = `bold 12px ${fontSans}`;
      ctx.fillStyle = "#15803d";
      ctx.fillText("✨ ประหยัดได้ทั้งหมด:", 24, y);
      ctx.textAlign = "right";
      ctx.fillText(`฿${money(totalDiscVal)}`, width - 24, y);
    }

    y += 24;
    // Grand Total Box
    ctx.fillStyle = "#f0fdf4";
    ctx.fillRect(24, y - 16, width - 48, 38);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(24, y - 16, width - 48, 38);

    ctx.textAlign = "left";
    ctx.font = `bold 14px ${fontSans}`;
    ctx.fillStyle = "#15803d";
    ctx.fillText("ยอดชำระสุทธิ", 36, y + 8);
    ctx.textAlign = "right";
    ctx.font = `bold 18px ${fontSans}`;
    ctx.fillStyle = "#16a34a";
    ctx.fillText(`฿${money(bill.total)}`, width - 36, y + 8);

    y += 34;
    const payLabel = isCash ? "เงินสด (Cash)" : "สแกน QR / โอนเงิน (PromptPay)";
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText("วิธีชำระ:", 24, y);
    ctx.textAlign = "right";
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(payLabel, width - 24, y);

    if(hasCashChange){
      y += 18;
      ctx.textAlign = "left";
      ctx.font = `12px ${fontSans}`;
      ctx.fillStyle = "#64748b";
      ctx.fillText("รับเงินสดมา:", 24, y);
      ctx.textAlign = "right";
      ctx.font = `12px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(`฿${money(bill.received)}`, width - 24, y);

      y += 18;
      ctx.textAlign = "left";
      ctx.font = `bold 12px ${fontSans}`;
      ctx.fillStyle = "#16a34a";
      ctx.fillText("เงินทอน:", 24, y);
      ctx.textAlign = "right";
      ctx.font = `bold 13px ${fontSans}`;
      ctx.fillStyle = "#16a34a";
      ctx.fillText(`฿${money(bill.change || 0)}`, width - 24, y);
    }

    y += 16;
    drawDashedLine(y);

    // Footer
    y += 22;
    ctx.textAlign = "center";
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = "#334155";
    ctx.fillText("ขอบคุณที่ใช้บริการ / Thank you!", width / 2, y);

    y += 16;
    ctx.font = `10.5px ${fontSans}`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("กรุณาเก็บใบเสร็จไว้เพื่อเป็นหลักฐาน", width / 2, y);

    y += 20;
    ctx.font = `bold 12px ${fontMono}`;
    ctx.fillStyle = "#475569";
    ctx.fillText(`*${bill.saleNo || "EAF-001"}*`, width / 2, y);

    // Export as JPEG blob
    canvas.toBlob((blob) => {
      if(!blob){
        toast("เกิดข้อผิดพลาดในการแปลงรูปภาพ");
        return;
      }
      const filename = `Receipt-${bill.saleNo || Date.now()}.jpg`;
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      toast("บันทึกรูปใบเสร็จ JPEG สำเร็จแล้ว");

      // Optional Mobile Web Share
      try {
        if(navigator.canShare && navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)){
          const file = new File([blob], filename, { type: "image/jpeg" });
          if(navigator.canShare({ files: [file] })){
            navigator.share({
              files: [file],
              title: `ใบเสร็จ ${bill.saleNo}`,
              text: `ใบเสร็จรับเงิน ${bill.saleNo} ยอด ฿${money(bill.total)}`
            }).catch(() => {});
          }
        }
      } catch(e){}
    }, "image/jpeg", 0.95);

  } catch(err) {
    console.error("Save receipt JPEG error:", err);
    toast("บันทึกรูปไม่สำเร็จ: " + (err.message || err));
  }
}

function showReceiptModal(bill){
  state.lastBill = bill;
  const diag=el("receiptDialog");
  if(!diag) return;
  el("receiptTitle").textContent="ขายสินค้าสำเร็จ!";
  el("receiptSubtitle").textContent=`บิล ${bill.saleNo} • จุดขาย ${state.terminal}`;
  
  const itemsHtml = bill.items.map((item, idx) => {
    const isDisc = Boolean(item.is_discounted || (item.original_price && item.unit_price < item.original_price));
    const origLine = (item.original_price || item.unit_price) * item.qty;
    const currLine = item.unit_price * item.qty;
    const unit = item.unit || "ชิ้น";

    return `
      <div class="receipt-item-card">
        <div class="receipt-item-fullname">${idx + 1}. ${escapeHtml(item.name)}</div>
        <div class="receipt-item-details">
          <span>
            ${item.qty} ${escapeHtml(unit)} × 
            ${isDisc ? `<span style="text-decoration:line-through; color:#94a3b8; font-size:11px;">฿${money(item.original_price)}</span> <strong style="color:#fbbf24;">฿${money(item.unit_price)}</strong>` : `฿${money(item.unit_price)}`}
            ${isDisc && item.discount_note ? `<small style="color:#fcd34d; margin-left:4px;">(${escapeHtml(item.discount_note)})</small>` : ''}
          </span>
          <div style="text-align:right;">
            ${isDisc ? `<div style="text-decoration:line-through; color:#94a3b8; font-size:11px;">฿${money(origLine)}</div>` : ''}
            <strong class="receipt-item-line-total" style="${isDisc ? 'color:#34d399;' : ''}">฿${money(currLine)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const subtotalVal = Number(bill.subtotal || bill.itemsTotal || bill.total || 0);
  const itemsDiscVal = Number(bill.itemsDiscount || 0);
  const billDiscVal = Number(bill.billDiscount || 0);
  const totalDiscVal = Number(bill.totalDiscount || (itemsDiscVal + billDiscVal));

  let discountRows = "";
  if(itemsDiscVal > 0){
    discountRows += `
      <div class="receipt-discount-line">
        <span>🏷️ ส่วนลดเฉพาะรายการ</span>
        <span>-฿${money(itemsDiscVal)}</span>
      </div>
    `;
  }
  if(billDiscVal > 0){
    const note = bill.billDiscountDetail?.note ? ` (${escapeHtml(bill.billDiscountDetail.note)})` : "";
    discountRows += `
      <div class="receipt-discount-line">
        <span>🏷️ ส่วนลดท้ายบิล${note}</span>
        <span>-฿${money(billDiscVal)}</span>
      </div>
    `;
  }

  let paymentDetails = "";
  if(bill.paymentMethod === "cash" && bill.received > 0){
    paymentDetails = `
      <div class="receipt-row" style="color:#94a3b8; margin-top:8px;">
        <span>รับเงินสดมา</span>
        <span>฿${money(bill.received)}</span>
      </div>
      <div class="receipt-row" style="color:#4ade80; font-weight:800; font-size:15px;">
        <span>เงินทอน</span>
        <span>฿${money(bill.change)}</span>
      </div>
    `;
  } else if(bill.paymentMethod === "promptpay"){
    paymentDetails = `
      <div class="receipt-row" style="color:#38bdf8; margin-top:8px;">
        <span>วิธีชำระ</span>
        <span>สแกน QR / โอนเงิน</span>
      </div>
    `;
  }

  el("receiptBody").innerHTML = `
    <div style="margin-bottom:10px; font-size:11px; color:#94a3b8;">
      วันที่: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH",{hour:'2-digit',minute:'2-digit'})}
    </div>
    <div class="receipt-items-container">
      ${itemsHtml}
    </div>
    ${totalDiscVal > 0 ? `
      <div class="receipt-subtotal-row">
        <span>ยอดรวมสินค้า</span>
        <span>฿${money(subtotalVal)}</span>
      </div>
      ${discountRows}
      <div class="receipt-savings-banner">
        <span>✨ ประหยัดได้ทั้งหมด</span>
        <strong>฿${money(totalDiscVal)}</strong>
      </div>
    ` : ''}
    <div class="receipt-total-row">
      <span>ยอดสุทธิ</span>
      <span class="receipt-total-amount">฿${money(bill.total)}</span>
    </div>
    ${paymentDetails}
  `;

  const printArea = el("receiptPrintArea");
  if(printArea){
    printArea.innerHTML = generateInvoicePrintHTML(bill);
  }

  diag.showModal();
}

function closeReceiptModal(){
  const diag=el("receiptDialog");
  if(diag?.open) diag.close();
  state.receivedCash=0;
  if(state.page==="sale") renderSale();
  else render();
}

// Price label stored with each sale line (report groups by product + price + label)
// e.g. "3 กิโล 100", "แถม...", or the discount reason when the price was lowered.
function cartLinePriceNote(c){
  if(c.price_note) return String(c.price_note).slice(0,100);
  const orig=Number(c.original_price ?? c.unit_price), cur=Number(c.unit_price);
  if(cur===0){ const n=String(c.discount_note||"").trim(); return (!n ? "แถม" : n.startsWith("แถม") ? n : `แถม ${n}`).slice(0,100); }
  if(cur<orig && c.discount_note) return String(c.discount_note).slice(0,100);
  return "";
}

// Legacy path for databases without migration V7/V8 (not idempotent).
async function legacyRecordCartSale(items, saleNote, totalAmt, billDiscAmt){
  try {
    const {data, error} = await sb.rpc("ea_record_cart_sale", {
      p_terminal_code: state.terminal,
      p_items: items,
      p_note: saleNote
    });
    if (error) {
      if (/Insufficient stock/i.test(error.message || "")) {
        toast("Stock เปลี่ยนระหว่างขาย กรุณาตรวจตะกร้าอีกครั้ง");
        await loadAll();
        go("sale");
        return null;
      }
      console.error("Remote checkout rejected:", error.message);
      toast("ไม่สามารถบันทึกบิลได้: " + (error.message || "โปรดลองอีกครั้ง"));
      return null;
    }
    const saleNo = data?.sale_no || ("S-" + Date.now().toString().slice(-6));
    // Best-effort patches: payment method and net total after bill discount.
    if (data?.sale_id) {
      try { await sb.from("ea_sales").update({ payment_method: state.paymentMethod }).eq("id", data.sale_id); } catch (e) {}
      if (billDiscAmt > 0) {
        try { await sb.from("ea_sales").update({ total_amount: totalAmt }).eq("id", data.sale_id); } catch (e) {}
      }
    }
    return { saleNo };
  } catch (ex) {
    console.error("Remote checkout status uncertain:", ex);
    toast("ไม่ทราบผลการบันทึก กรุณาตรวจประวัติขายใน Supabase ก่อนกดซ้ำ");
    return null;
  }
}

let checkoutInProgress = false;
async function checkoutCart(){
  if (checkoutInProgress) return;
  checkoutInProgress = true;
  try {
  if(!state.cart.length){toast("ตะกร้าว่าง");return}
  const items=state.cart.map(c=>{
    const row={product_id:c.product_id,qty:Number(c.qty),unit_price:Number(c.unit_price)};
    const note=cartLinePriceNote(c);
    if(note) row.price_note=note;
    if(Array.isArray(c.weights)&&c.weights.length) row.weights=c.weights.map(Number);
    return row;
  });
  
  const subtotalOrig = cartSubtotalOriginal();
  const itemsTot = cartItemsTotal();
  const itemsDiscAmt = cartItemsDiscount();
  const billDiscAmt = cartBillDiscountAmount();
  const totalDiscAmt = cartTotalDiscount();
  const totalAmt = cartTotal();
  const billDiscountDetail = { ...(state.billDiscount || { type: "none", value: 0, note: "" }) };

  const requested = new Map();
  for (const it of items) {
    if (!it.product_id || !Number.isFinite(it.qty) || it.qty <= 0 || !Number.isFinite(it.unit_price) || it.unit_price < 0) {
      toast('จำนวนหรือราคาสินค้าไม่ถูกต้อง');
      return;
    }
    requested.set(it.product_id, (requested.get(it.product_id) || 0) + it.qty);
  }

  // Cash: block checkout when the cashier entered less money than the total.
  const receivedInput = Number(state.receivedCash || 0);
  if (state.paymentMethod === "cash" && receivedInput > 0 && receivedInput + 0.001 < totalAmt) {
    toast(`รับเงินมายังไม่พอ ขาดอีก ฿${money(totalAmt - receivedInput)}`);
    return;
  }

  // Offline inventory is a local snapshot; do not knowingly sell more than it holds.
  if (state.isOffline || !sb || !navigator.onLine) {
    for (const [id, qty] of requested) {
      const product = productById(id);
      if (!product || Number(product.stock_qty) < qty) {
        toast('สต็อกในเครื่องไม่เพียงพอ กรุณาตรวจสอบรายการก่อนขาย');
        return;
      }
    }
  }

  const currentCartSnapshot = state.cart.map(c=>{
    const origPrice = Number(c.original_price ?? c.unit_price);
    const currPrice = Number(c.unit_price);
    const isDisc = Boolean(c.is_discounted || currPrice < origPrice);
    return {
      name: c.name,
      unit: c.unit || "ชิ้น",
      qty: c.qty,
      unit_price: currPrice,
      original_price: origPrice,
      discount_amount: Math.max(0, origPrice - currPrice),
      discount_note: c.discount_note || "",
      is_discounted: isDisc,
      line_total: c.qty * currPrice
    };
  });

  const recVal = Number(state.receivedCash || 0);
  const changeVal = recVal >= totalAmt ? (recVal - totalAmt) : 0;
  const saleNote = `ขายจาก ${state.terminal}${billDiscAmt > 0 ? ` (ส่วนลดท้ายบิล ฿${money(billDiscAmt)})` : ''}`;

  // One stable id per bill. Used by the idempotent RPC online AND by the offline
  // queue, so an ambiguous network failure can be queued without double charging.
  const saleId = window.EaOfflineSync?.newClientSaleId
    ? window.EaOfflineSync.newClientSaleId()
    : "off-sale-" + Date.now() + "-" + Math.floor(Math.random()*1e9);
  const now = new Date();
  const saleDateISO = todayISO();
  const saleTimeStr = now.toTimeString().slice(0,8);
  const itemDetails = state.cart.map(c => ({
    product_id: c.product_id,
    product_name: c.name,
    unit: c.unit || "ชิ้น",
    qty: Number(c.qty),
    unit_price: Number(c.unit_price),
    original_price: Number(c.original_price ?? c.unit_price),
    discount_note: c.discount_note || "",
    price_note: cartLinePriceNote(c),
    weights: Array.isArray(c.weights) ? c.weights.map(Number) : undefined
  }));
  const saleRecord = {
    id: saleId,
    terminal: state.terminal,
    items,
    item_details: itemDetails,
    payment_method: state.paymentMethod,
    received_amount: state.paymentMethod === "cash" ? (recVal > 0 ? recVal : totalAmt) : totalAmt,
    change_amount: changeVal,
    total_amount: totalAmt,
    bill_discount: billDiscAmt,
    note: saleNote,
    sale_date: saleDateISO,
    sale_time: saleTimeStr,
    created_at: now.toISOString()
  };

  let successRemote = false;
  let remoteTotal = 0;
  let remoteSaleNo = "";
  let queuedAfterNetworkError = false;

  if (sb && !state.isOffline && navigator.onLine) {
    const result = window.EaOfflineSync?.recordSaleRemote
      ? await window.EaOfflineSync.recordSaleRemote(saleRecord)
      : { ok: false, missingFunction: true };

    if (result.ok) {
      successRemote = true;
      remoteTotal = Number(result.data?.total_amount ?? totalAmt);
      remoteSaleNo = result.data?.sale_no || ("S-" + Date.now().toString().slice(-6));
    } else if (result.missingFunction) {
      // Database has neither V8 nor V7: legacy non-idempotent RPC.
      const legacy = await legacyRecordCartSale(items, saleNote, totalAmt, billDiscAmt);
      if (!legacy) return;
      successRemote = true;
      remoteTotal = totalAmt;
      remoteSaleNo = legacy.saleNo;
    } else if (result.transient) {
      // The idempotent RPC makes it safe to queue this exact bill for replay.
      queuedAfterNetworkError = true;
      state.isOffline = true;
    } else {
      const msg = result.error?.message || "";
      if (/Insufficient stock/i.test(msg)) {
        toast("Stock เปลี่ยนระหว่างขาย กรุณาตรวจตะกร้าอีกครั้ง");
        await loadAll();
        go("sale");
        return;
      }
      console.error("Remote checkout rejected:", msg);
      toast("ไม่สามารถบันทึกบิลได้: " + (msg || "โปรดลองอีกครั้ง"));
      return;
    }
  }
  if (successRemote) {
    const bill = {
      saleNo: remoteSaleNo,
      subtotal: subtotalOrig,
      itemsTotal: itemsTot,
      itemsDiscount: itemsDiscAmt,
      billDiscount: billDiscAmt,
      billDiscountDetail: billDiscountDetail,
      totalDiscount: totalDiscAmt,
      total: remoteTotal || totalAmt,
      received: state.paymentMethod === "cash" && recVal > 0 ? recVal : (remoteTotal || totalAmt),
      change: changeVal,
      paymentMethod: state.paymentMethod,
      items: currentCartSnapshot
    };
    state.lastBill = bill;
    state.cart = [];
    state.billDiscount = { type: "none", value: 0, note: "" };
    saveCartLocal();
    saveBillDiscountLocal();
    updateBottomNav();
    beepSuccess();
    showReceiptModal(bill);
    await loadAll();
    return;
  }

  // Local Offline Checkout Transaction
  const saleNo = "S" + String(now.getFullYear()).slice(-2) + String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0") + "-" + String(Math.floor(Math.random()*9000)+1000);

  const newSale = {
    id: saleId,
    sale_no: saleNo,
    terminal_code: state.terminal,
    sale_date: saleDateISO,
    sale_time: saleTimeStr,
    total_amount: totalAmt,
    discount_amount: billDiscAmt,
    payment_method: state.paymentMethod,
    received_amount: saleRecord.received_amount,
    change_amount: changeVal,
    note: saleNote,
    created_at: now.toISOString(),
    is_pending_sync: true
  };

  // Persist the sale *before* changing local stock or clearing the cart.
  // IndexedDB is authoritative for unsynced orders; a failed write must stop checkout.
  if (!window.EaOfflineSync) {
    toast('ระบบคิวขายออฟไลน์ไม่พร้อม กรุณาลองโหลดหน้าใหม่');
    return;
  }
  const queuedSale = await window.EaOfflineSync.addPendingSale({ ...saleRecord, saleNo });
  if (!queuedSale) {
    toast('บันทึกบิลออฟไลน์ไม่สำเร็จ: โปรดตรวจพื้นที่เก็บข้อมูลก่อนทำรายการ');
    return;
  }
  if (queuedAfterNetworkError) {
    toast('📡 เน็ตขัดข้องระหว่างบันทึก — เก็บบิลไว้ในเครื่องแล้ว จะซิงค์อัตโนมัติ (ไม่บันทึกซ้ำ)', 5000);
    window.EaOfflineSync.updateSyncUI?.();
  }

  for (const item of state.cart) {
    const prod = productById(item.product_id);
    if (prod) {
      prod.stock_qty = Math.max(0, Number(prod.stock_qty) - Number(item.qty));
      
      const origPrice = Number(item.original_price ?? prod.sale_price ?? item.unit_price);
      const currPrice = Number(item.unit_price);
      const isDisc = Boolean(item.is_discounted || currPrice < origPrice);

      state.saleItems.unshift({
        id: "off-item-" + Date.now() + "-" + Math.floor(Math.random()*1000),
        sale_id: saleId,
        product_id: prod.id,
        product_name: prod.product_name,
        barcode: prod.barcode || "",
        qty: Number(item.qty),
        unit_price: currPrice,
        original_price: origPrice,
        discount_amount: Math.max(0, origPrice - currPrice),
        discount_note: item.discount_note || "",
        price_note: cartLinePriceNote(item),
        weights: Array.isArray(item.weights) && item.weights.length ? item.weights.map(Number) : null,
        is_discounted: isDisc,
        line_total: Number(item.qty) * currPrice,
        created_at: now.toISOString()
      });

      state.movements.unshift({
        id: "off-move-" + Date.now() + "-" + Math.floor(Math.random()*1000),
        product_id: prod.id,
        product_name: prod.product_name,
        movement_type: "OUT",
        qty_change: -Number(item.qty),
        note: `ขายจาก ${state.terminal} (ออฟไลน์)`,
        movement_date: todayISO(),
        movement_time: now.toTimeString().slice(0,8),
        created_at: now.toISOString()
      });
    }
  }

  state.sales.unshift(newSale);
  saveLocalState();

  const bill = {
    saleNo: saleNo,
    subtotal: subtotalOrig,
    itemsTotal: itemsTot,
    itemsDiscount: itemsDiscAmt,
    billDiscount: billDiscAmt,
    billDiscountDetail: billDiscountDetail,
    totalDiscount: totalDiscAmt,
    total: totalAmt,
    received: state.paymentMethod === "cash" && recVal > 0 ? recVal : totalAmt,
    change: changeVal,
    paymentMethod: state.paymentMethod,
    items: currentCartSnapshot
  };
  state.lastBill = bill;

  state.cart = [];
  state.billDiscount = { type: "none", value: 0, note: "" };
  saveCartLocal();
  saveBillDiscountLocal();
  updateBottomNav();
  beepSuccess();
  showReceiptModal(bill);
  checkAndNotifyLowStock();
  render();
  } finally {
    checkoutInProgress = false;
  }
}

let autoFocusInterval = null;

function startAutoFocusLoop(video){
  if(autoFocusInterval) clearInterval(autoFocusInterval);

  const triggerFocus = async () => {
    if(!video || !video.srcObject || video.paused || video.ended) return;
    const track = video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks()[0] : null;
    if(!track) return;

    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const focusConstraints = {};

      if(caps.focusMode && Array.isArray(caps.focusMode)){
        if(caps.focusMode.includes("continuous")){
          focusConstraints.focusMode = "continuous";
        } else if(caps.focusMode.includes("single-shot")){
          focusConstraints.focusMode = "single-shot";
        }
      }

      if(Object.keys(focusConstraints).length > 0){
        await track.applyConstraints({
          advanced: [focusConstraints]
        });
      }
    } catch(err) {
      console.warn("AutoFocus loop warning:", err);
    }
  };

  triggerFocus();
  autoFocusInterval = setInterval(triggerFocus, 2400);
}

function stopAutoFocusLoop(){
  if(autoFocusInterval){
    clearInterval(autoFocusInterval);
    autoFocusInterval = null;
  }
}

let isFlashActive = false;
let lightCheckInterval = null;
let lowLightThreshold = 45;
let currentZoomVal = 1.0;

async function onCameraZoomChange(val){
  const zoom = parseFloat(val || 1.0);
  currentZoomVal = zoom;
  
  const valText = el("cameraZoomValText");
  const sliderInput = el("cameraZoomRange");
  if(valText) valText.textContent = zoom.toFixed(1) + "x";
  if(sliderInput && sliderInput.value !== String(val)) sliderInput.value = String(val);

  const video = el("scannerVideo");
  if(!video) return;

  if(video.srcObject && video.srcObject.getVideoTracks){
    const track = video.srcObject.getVideoTracks()[0];
    if(track){
      try {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if(capabilities.zoom){
          const minZ = capabilities.zoom.min || 1.0;
          const maxZ = capabilities.zoom.max || 3.5;
          const hwZoom = Math.max(minZ, Math.min(maxZ, zoom));
          await track.applyConstraints({
            advanced: [{ zoom: hwZoom }]
          });
        }
      } catch(e) {
        console.warn("Hardware zoom error:", e);
      }
    }
  }

  video.style.transform = `scale(${zoom})`;
  video.style.transformOrigin = "center center";
}

function setCameraZoom(val){
  onCameraZoomChange(val);
}

function onSensitivityChange(val){
  lowLightThreshold = Number(val || 45);
  const valText = el("sensitivityValText");
  if(valText) valText.textContent = lowLightThreshold;
  try {
    localStorage.setItem("ea_torch_sensitivity", String(lowLightThreshold));
  } catch(e){}
}

function startLowLightDetector(video){
  if(lightCheckInterval) clearInterval(lightCheckInterval);
  
  const savedSens = localStorage.getItem("ea_torch_sensitivity");
  if(savedSens) lowLightThreshold = Number(savedSens);

  const offCanvas = document.createElement("canvas");
  offCanvas.width = 64;
  offCanvas.height = 64;
  const ctx = offCanvas.getContext("2d", { willReadFrequently: true });

  lightCheckInterval = setInterval(async () => {
    if(!video || video.paused || video.ended || video.readyState < 2) return;

    try {
      ctx.drawImage(video, 0, 0, 64, 64);
      const imgData = ctx.getImageData(0, 0, 64, 64);
      const data = imgData.data;
      let totalBrightness = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        totalBrightness += (0.2126 * r + 0.7152 * g + 0.0722 * b);
      }

      const avgBrightness = Math.round(totalBrightness / pixelCount);
      const ambBadge = el("ambientLightIndicator");
      if(ambBadge) ambBadge.textContent = `แสงวัดได้: ${avgBrightness}`;

      if (avgBrightness < lowLightThreshold && !isFlashActive) {
        const stream = video.srcObject;
        const track = stream?.getVideoTracks?.()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: true }]
          });
          isFlashActive = true;
          updateFlashUI(true);
          toast(`ตรวจพบแสงน้อย (${avgBrightness} < ${lowLightThreshold}) — เปิดไฟฉายอัตโนมัติ 💡`);
        }
      }
    } catch(err) {
      console.warn("Low light detection error:", err);
    }
  }, 1600);
}

function stopLowLightDetector(){
  if(lightCheckInterval){
    clearInterval(lightCheckInterval);
    lightCheckInterval = null;
  }
}

async function toggleScannerFlash(){
  const video = el("scannerVideo");
  if(!video || !video.srcObject){
    toast("กล้องยังไม่พร้อมใช้งาน");
    return;
  }
  const stream = video.srcObject;
  const track = stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
  if(!track){
    toast("ไม่พบสัญญาณกล้อง");
    return;
  }

  try {
    isFlashActive = !isFlashActive;
    await track.applyConstraints({
      advanced: [{ torch: isFlashActive }]
    });
    updateFlashUI(isFlashActive);
    toast(isFlashActive ? "เปิดไฟฉายแล้ว 💡" : "ปิดไฟฉายแล้ว 🌑");
  } catch(err) {
    console.warn("Torch failed:", err);
    isFlashActive = false;
    updateFlashUI(false);
    toast("อุปกรณ์หรือกล้องนี้ไม่รองรับไฟฉาย (Torch/Flash)");
  }
}

function updateFlashUI(active){
  const btn = el("flashToggleBtn");
  const overlayBtn = el("flashVideoOverlayBtn");
  const txt = el("flashText");

  if(active){
    if(btn) btn.classList.add("active");
    if(overlayBtn) overlayBtn.classList.add("active");
    if(txt) txt.textContent = "เปิดไฟอยู่";
  } else {
    if(btn) btn.classList.remove("active");
    if(overlayBtn) overlayBtn.classList.remove("active");
    if(txt) txt.textContent = "ไฟฉาย";
  }
}

let batteryManager = null;
let batteryListenerFn = null;

async function initScannerBatteryMonitor(){
  const badge = el("scannerBatteryBadge");
  const text = el("scannerBatteryLevelText");
  if(!badge || !text) return;

  if('getBattery' in navigator){
    try {
      batteryManager = await navigator.getBattery();
      batteryListenerFn = () => {
        const level = Math.round((batteryManager.level || 1) * 100);
        const charging = batteryManager.charging;
        text.textContent = `${charging ? '⚡ ' : ''}${level}%`;
        
        badge.classList.remove("battery-low", "battery-good", "battery-charging");
        if(charging){
          badge.classList.add("battery-charging");
          badge.title = `กำลังชาร์จไฟ (${level}%)`;
        } else if(level <= 20){
          badge.classList.add("battery-low");
          badge.title = `แบตเตอรี่เหลือน้อย (${level}%) — ควรเสียบชาร์จเพื่อการสแกนต่อเนื่อง`;
        } else {
          badge.classList.add("battery-good");
          badge.title = `แบตเตอรี่ปกติ (${level}%)`;
        }
      };

      batteryListenerFn();
      batteryManager.addEventListener("levelchange", batteryListenerFn);
      batteryManager.addEventListener("chargingchange", batteryListenerFn);
    } catch(e) {
      console.warn("Battery status error:", e);
      badge.style.display = "none";
    }
  } else {
    text.textContent = "100%";
    badge.classList.add("battery-good");
  }
}

async function startScanner(){
  if(!window.ZXingBrowser){toast("โหลด Barcode Scanner ไม่สำเร็จ");return}
  const dialog=el("scannerDialog"),video=el("scannerVideo"),status=el("scannerStatus");
  dialog.showModal();
  status.textContent="กำลังขอสิทธิ์กล้อง...";
  isFlashActive = false;
  updateFlashUI(false);
  currentZoomVal = 1.0;
  onCameraZoomChange(1.0);
  initScannerBatteryMonitor();

  const savedSens = localStorage.getItem("ea_torch_sensitivity");
  if(savedSens) lowLightThreshold = Number(savedSens);
  const sliderInput = el("autoTorchSensitivity");
  const valText = el("sensitivityValText");
  if(sliderInput) sliderInput.value = lowLightThreshold;
  if(valText) valText.textContent = lowLightThreshold;

  const savedSound = localStorage.getItem("ea_scan_sound_enabled");
  if(savedSound !== null) isScanSoundEnabled = savedSound === "true";
  const soundToggle = el("scanSoundToggleInput");
  const soundBadge = el("scanSoundBadgeText");
  if(soundToggle) soundToggle.checked = isScanSoundEnabled;
  if(soundBadge){
    soundBadge.textContent = isScanSoundEnabled ? "เปิดเสียงอยู่" : "ปิดเสียงอยู่";
    soundBadge.style.color = isScanSoundEnabled ? "#34d399" : "#94a3b8";
  }

  const savedVib = localStorage.getItem("ea_scan_vibration_enabled");
  if(savedVib !== null) isScanVibrationEnabled = savedVib === "true";
  const vibToggle = el("scanVibrateToggleInput");
  const vibBadge = el("scanVibrateBadgeText");
  if(vibToggle) vibToggle.checked = isScanVibrationEnabled;
  if(vibBadge){
    vibBadge.textContent = isScanVibrationEnabled ? "เปิดสั่นอยู่" : "ปิดสั่นอยู่";
    vibBadge.style.color = isScanVibrationEnabled ? "#f472b6" : "#94a3b8";
  }

  const savedBatch = localStorage.getItem("ea_batch_scan_enabled");
  if(savedBatch !== null) state.batchScanEnabled = savedBatch === "true";
  const batchToggle = el("batchScanToggleInput");
  const batchBadge = el("batchScanBadgeText");
  if(batchToggle) batchToggle.checked = state.batchScanEnabled;
  if(batchBadge){
    batchBadge.textContent = state.batchScanEnabled ? "เปิดอยู่ (สะสมเป็นชุด)" : "ปิดอยู่ (สแกนทีละชิ้น)";
    batchBadge.style.color = state.batchScanEnabled ? "#c084fc" : "#94a3b8";
  }
  updateBatchScanQueueUI();

  try{
    scannerReader=new ZXingBrowser.BrowserMultiFormatReader();
    scannerControls=await scannerReader.decodeFromConstraints({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false},video,(result)=>{
      if(!result)return;
      const code=result.getText(),now=Date.now();
      if(code===lastScannedCode && now-lastScannedAt<1100)return;
      lastScannedCode=code;
      lastScannedAt=now;
      handleScannedBarcode(code);
    });
    status.textContent="พร้อมสแกน • ใช้กล้องหลัง • AF Continuous";
    startLowLightDetector(video);
    startAutoFocusLoop(video);
  }catch(e){console.error(e);status.textContent="เปิดกล้องไม่สำเร็จ";toast("กรุณาอนุญาตใช้กล้อง และเปิดเว็บผ่าน HTTPS")}
}

function stopScanner(){
  stopLowLightDetector();
  stopAutoFocusLoop();
  try{
    const video = el("scannerVideo");
    if(video) video.style.transform = "none";
    if(isFlashActive){
      const track = video?.srcObject?.getVideoTracks?.()[0];
      if(track){
        track.applyConstraints({ advanced: [{ torch: false }] }).catch(()=>{});
      }
    }
  }catch{}
  isFlashActive = false;
  currentZoomVal = 1.0;
  updateFlashUI(false);

  try{scannerControls?.stop()}catch{}
  scannerControls=null;
  scannerReader=null;
  const d=el("scannerDialog");
  if(d?.open)d.close();
}
let isScanSoundEnabled = true;
let isScanVibrationEnabled = true;

function toggleScanSound(enabled){
  isScanSoundEnabled = typeof enabled === "boolean" ? enabled : !isScanSoundEnabled;
  const toggleInput = el("scanSoundToggleInput");
  const badge = el("scanSoundBadgeText");
  if(toggleInput) toggleInput.checked = isScanSoundEnabled;
  if(badge){
    badge.textContent = isScanSoundEnabled ? "เปิดเสียงอยู่" : "ปิดเสียงอยู่";
    badge.style.color = isScanSoundEnabled ? "#34d399" : "#94a3b8";
  }
  try {
    localStorage.setItem("ea_scan_sound_enabled", String(isScanSoundEnabled));
  } catch(e){}
  toast(isScanSoundEnabled ? "เปิดเสียงสแกนแล้ว 🔊" : "ปิดเสียงสแกนแล้ว 🔇");
}

function toggleScanVibration(enabled){
  isScanVibrationEnabled = typeof enabled === "boolean" ? enabled : !isScanVibrationEnabled;
  const toggleInput = el("scanVibrateToggleInput");
  const badge = el("scanVibrateBadgeText");
  if(toggleInput) toggleInput.checked = isScanVibrationEnabled;
  if(badge){
    badge.textContent = isScanVibrationEnabled ? "เปิดสั่นอยู่" : "ปิดสั่นอยู่";
    badge.style.color = isScanVibrationEnabled ? "#f472b6" : "#94a3b8";
  }
  try {
    localStorage.setItem("ea_scan_vibration_enabled", String(isScanVibrationEnabled));
  } catch(e){}
  if(isScanVibrationEnabled){
    navigator.vibrate?.(60);
    toast("เปิดระบบสั่นตอบรับการสแกน 📳");
  } else {
    toast("ปิดระบบสั่นตอบรับการสแกน 📴");
  }
}

function beepSuccess(){
  if(!isScanSoundEnabled) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const c=new C(),o=c.createOscillator(),g=c.createGain();
    o.frequency.value=880;
    g.gain.value=.035;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime+.07);
    setTimeout(()=>c.close(),150);
  }catch{}
}

function beepBatchAdd(){
  if(!isScanSoundEnabled) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const c=new C();
    const o1=c.createOscillator(), g1=c.createGain();
    o1.frequency.value=700;
    g1.gain.value=.03;
    o1.connect(g1);
    g1.connect(c.destination);
    o1.start();
    o1.stop(c.currentTime+.04);

    const o2=c.createOscillator(), g2=c.createGain();
    o2.frequency.value=1050;
    g2.gain.value=.035;
    o2.connect(g2);
    g2.connect(c.destination);
    o2.start(c.currentTime+.05);
    o2.stop(c.currentTime+.11);
    setTimeout(()=>c.close(),200);
  }catch{}
}

function beepError(){
  if(!isScanSoundEnabled) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const c=new C(),o=c.createOscillator(),g=c.createGain();
    o.frequency.value=280;
    g.gain.value=.05;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime+.14);
    setTimeout(()=>c.close(),220);
  }catch{}
}

// -------------------------------------------------------------
// Batch Scan Mode Implementation (.scanner-card)
// -------------------------------------------------------------

function toggleBatchScan(enabled){
  state.batchScanEnabled = typeof enabled === "boolean" ? enabled : !state.batchScanEnabled;
  try {
    localStorage.setItem("ea_batch_scan_enabled", String(state.batchScanEnabled));
  } catch(e){}

  const toggleInput = el("batchScanToggleInput");
  const badge = el("batchScanBadgeText");
  if(toggleInput) toggleInput.checked = state.batchScanEnabled;
  if(badge){
    badge.textContent = state.batchScanEnabled ? "เปิดอยู่ (สะสมเป็นชุด)" : "ปิดอยู่ (สแกนทีละชิ้น)";
    badge.style.color = state.batchScanEnabled ? "#c084fc" : "#94a3b8";
  }

  updateBatchScanQueueUI();
  if(state.batchScanEnabled){
    toast("เปิดโหมดสแกนเป็นชุด (Batch Scan) 📦 สแกนสินค้าต่อเนื่องเพื่อสะสมในคิว");
  } else {
    toast("ปิดโหมดสแกนเป็นชุด (สแกนทีละชิ้นเข้า POS ทันที)");
  }
}

function handleScannedBarcode(code){
  const clean = String(code || "").trim();
  if(!clean) return;
  const status = el("scannerStatus");
  if(status) status.textContent = `พบ: ${clean}`;

  const p = productByBarcode(clean);
  if(!p){
    toast(`ไม่พบบาร์โค้ด "${clean}" ในฐานข้อมูล`);
    beepError();
    if(isScanVibrationEnabled) navigator.vibrate?.([50, 60, 50]);
    return;
  }

  // Physical Audit intercept
  if(state.page === "audit" || (el("modal")?.open && state.auditCounts)){
    handleAuditScannedBarcode(p);
    return;
  }

  if(state.batchScanEnabled){
    // Batch scan queue mode
    const stock = Number(p.stock_qty || 0);
    if(stock <= 0){
      toast(`สินค้า "${p.product_name}" หมดสต็อกแล้ว!`);
      beepError();
      if(isScanVibrationEnabled) navigator.vibrate?.([100, 50, 100]);
      return;
    }

    if(!Array.isArray(state.batchScanQueue)) state.batchScanQueue = [];
    const existing = state.batchScanQueue.find(item => item.product_id === p.id);

    if(existing){
      if(existing.qty + 1 > stock){
        toast(`⚠️ "${p.product_name}" ในคิวถึงจำนวนคงเหลือสูงสุด (${stock} ชิ้น) แล้ว`);
        beepError();
        if(isScanVibrationEnabled) navigator.vibrate?.([80, 50, 80]);
        return;
      }
      existing.qty += 1;
      existing.scannedAt = Date.now();
      // Move existing item to top of the queue so it remains the most recent scanned item
      const existingIdx = state.batchScanQueue.indexOf(existing);
      if(existingIdx > 0){
        state.batchScanQueue.splice(existingIdx, 1);
        state.batchScanQueue.unshift(existing);
      }
      toast(`+1 "${p.product_name}" (ในคิวสะสม: ${existing.qty} ชิ้น) 📦`);
    } else {
      state.batchScanQueue.unshift({
        product_id: p.id,
        product_name: p.product_name,
        barcode: p.barcode || "",
        sale_price: Number(p.sale_price || 0),
        stock_qty: stock,
        unit_name: p.unit || p.unit_name || "ชิ้น",
        qty: 1,
        scannedAt: Date.now()
      });
      toast(`เพิ่ม "${p.product_name}" ในคิว Batch Scan 📦`);
    }

    beepBatchAdd();
    if(isScanVibrationEnabled) navigator.vibrate?.([40, 40, 40]);
    updateBatchScanQueueUI();
  } else {
    // Immediate single item POS entry mode
    const success = addProductToCart(p);
    if(success){
      beepSuccess();
      if(isScanVibrationEnabled) navigator.vibrate?.(80);
    } else {
      beepError();
      if(isScanVibrationEnabled) navigator.vibrate?.([50, 60, 50]);
    }
  }
}

function updateBatchScanQueueUI(){
  const panel = el("scannerBatchQueuePanel");
  const overlay = el("batchLiveOverlayBadge");
  const footBtn = el("batchFootImportBtn");
  if(!panel) return;

  const queue = state.batchScanQueue || [];
  const isBatchOn = Boolean(state.batchScanEnabled);

  // Show panel if batch mode is on or there are items in the queue
  if(!isBatchOn && queue.length === 0){
    panel.style.display = "none";
    if(overlay) overlay.style.display = "none";
    if(footBtn) footBtn.style.display = "none";
    return;
  }

  panel.style.display = "flex";

  const totalItems = queue.length;
  const totalQty = queue.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = queue.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.sale_price || 0)), 0);

  const statsEl = el("batchQueueStats");
  const totalAmountEl = el("batchQueueTotalAmount");
  const importBtnTextEl = el("batchImportBtnText");
  const liveCountEl = el("batchLiveCountText");
  const footCountEl = el("batchFootCount");

  if(statsEl) statsEl.textContent = `${totalItems} รายการ (${totalQty} ชิ้น)`;
  if(totalAmountEl) totalAmountEl.textContent = `฿${money(totalAmount)}`;
  if(importBtnTextEl) importBtnTextEl.textContent = `📥 นำเข้า POS ทั้งหมด (${totalQty} ชิ้น • ฿${money(totalAmount)})`;

  const undoHeadBtn = el("batchUndoHeadBtn");
  const undoActionBtn = el("batchUndoActionBtn");
  if(undoHeadBtn){
    undoHeadBtn.disabled = totalItems === 0;
    undoHeadBtn.style.opacity = totalItems === 0 ? "0.45" : "1";
    undoHeadBtn.style.pointerEvents = totalItems === 0 ? "none" : "auto";
  }
  if(undoActionBtn){
    undoActionBtn.disabled = totalItems === 0;
    undoActionBtn.style.opacity = totalItems === 0 ? "0.45" : "1";
    undoActionBtn.style.pointerEvents = totalItems === 0 ? "none" : "auto";
  }

  if(overlay){
    if(totalItems > 0){
      overlay.style.display = "flex";
      if(liveCountEl) liveCountEl.textContent = `${totalItems} (${totalQty} ชิ้น)`;
    } else {
      overlay.style.display = "none";
    }
  }

  if(footBtn){
    if(totalItems > 0){
      footBtn.style.display = "inline-flex";
      if(footCountEl) footCountEl.textContent = `${totalQty} ชิ้น`;
    } else {
      footBtn.style.display = "none";
    }
  }

  const listEl = el("scannerBatchQueueList");
  if(!listEl) return;

  if(queue.length === 0){
    listEl.innerHTML = `
      <div class="empty" style="padding:14px; text-align:center; font-size:12px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.08);">
        ยังไม่มีรายการในคิว • สแกนบาร์โค้ดต่อเนื่องเพื่อสะสมเข้าเป็นชุด
      </div>
    `;
    return;
  }

  listEl.innerHTML = queue.map((item, idx) => {
    const isLatest = idx === 0;
    return `
    <div class="batch-item-row ${isLatest ? 'is-most-recent' : ''}" id="batch-row-${item.product_id}">
      <div class="batch-item-info">
        <div class="batch-item-name" title="${escapeHtml(item.product_name)}">
          ${escapeHtml(item.product_name)}
          ${isLatest ? '<span class="batch-latest-badge" title="รายการสแกนล่าสุด — กด Undo เพื่อถอยกลับ">🔥 ล่าสุด</span>' : ''}
        </div>
        <div class="batch-item-sub">
          <span style="color:#34d399; font-weight:700;">฿${money(item.sale_price)}</span>
          <span>รหัส: ${escapeHtml(item.barcode || '-')}</span>
          <span>คลัง: ${item.stock_qty} ${escapeHtml(item.unit_name)}</span>
        </div>
      </div>
      <div class="batch-item-qty-controls">
        <button type="button" class="btn-batch-qty" onclick="changeBatchQueueQty('${item.product_id}', -1)" title="ลดจำนวน">-</button>
        <span class="batch-qty-val">${item.qty}</span>
        <button type="button" class="btn-batch-qty" onclick="changeBatchQueueQty('${item.product_id}', 1)" title="เพิ่มจำนวน">+</button>
        <button type="button" class="btn-batch-undo" onclick="undoBatchQueueItem('${item.product_id}')" title="Undo: ยกเลิกและลบสินค้านี้ออกจากคิวทันที">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Undo</span>
        </button>
      </div>
    </div>
  `;
  }).join("");
}

function undoMostRecentBatchScan(){
  if(!Array.isArray(state.batchScanQueue) || state.batchScanQueue.length === 0){
    toast("ไม่มีรายการในคิว Batch Scan ที่จะ Undo ⚠️");
    beepError();
    return;
  }

  // Most recent scanned item is at index 0
  const item = state.batchScanQueue[0];
  if(!item) return;

  if(item.qty > 1){
    item.qty -= 1;
    toast(`↩️ Undo สแกนล่าสุด: ลด 1 ชิ้น "${item.product_name}" (เหลือในคิว ${item.qty} ชิ้น)`);
  } else {
    state.batchScanQueue.shift();
    toast(`↩️ Undo สแกนล่าสุด: ลบ "${item.product_name}" ออกจากคิวเรียบร้อย`);
  }

  if(isScanVibrationEnabled) navigator.vibrate?.([60, 40, 60]);
  updateBatchScanQueueUI();
}

// Global keydown shortcut (Ctrl+Z) for instant undo during scanner auditing
window.addEventListener("keydown", (e) => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){
    const scannerDlg = el("scannerDialog");
    if(scannerDlg && (scannerDlg.open || scannerDlg.hasAttribute("open"))){
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if(activeTag !== "input" && activeTag !== "textarea"){
        e.preventDefault();
        undoMostRecentBatchScan();
      }
    }
  }
});

function changeBatchQueueQty(productId, delta){
  if(!Array.isArray(state.batchScanQueue)) return;
  const item = state.batchScanQueue.find(x => x.product_id === productId);
  if(!item) return;

  const newQty = item.qty + delta;
  if(newQty <= 0){
    undoBatchQueueItem(productId);
    return;
  }
  if(newQty > item.stock_qty){
    toast(`⚠️ จำนวนเกินสต็อกคงเหลือ (${item.stock_qty} ชิ้น)`);
    return;
  }
  item.qty = newQty;
  updateBatchScanQueueUI();
}

function undoBatchQueueItem(productId){
  if(!Array.isArray(state.batchScanQueue)) return;
  const idx = state.batchScanQueue.findIndex(x => x.product_id === productId);
  if(idx >= 0){
    const removed = state.batchScanQueue.splice(idx, 1)[0];
    toast(`↩️ ยกเลิก (Undo) "${removed.product_name}" ออกจากคิวทันที`);
    if(isScanVibrationEnabled) navigator.vibrate?.(40);
    updateBatchScanQueueUI();
  }
}

function removeBatchQueueItem(productId){
  undoBatchQueueItem(productId);
}

function clearBatchQueue(){
  if(!Array.isArray(state.batchScanQueue) || state.batchScanQueue.length === 0){
    toast("ไม่มีสินค้าในคิว");
    return;
  }
  state.batchScanQueue = [];
  updateBatchScanQueueUI();
  toast("ล้างคิว Batch Scan เรียบร้อย 🗑️");
}

function commitBatchScanToPOS(){
  const queue = state.batchScanQueue || [];
  if(queue.length === 0){
    toast("ไม่มีสินค้าในคิว Batch Scan");
    return;
  }

  let totalItemsCount = queue.length;
  let totalUnitsAdded = 0;

  for(const item of queue){
    const p = productById(item.product_id) || productByBarcode(item.barcode);
    if(!p) continue;
    const stock = Number(p.stock_qty || 0);
    const existing = state.cart.find(x => x.product_id === p.id);
    const currentInCart = existing ? Number(existing.qty || 0) : 0;
    const canAdd = Math.max(0, Math.min(item.qty, stock - currentInCart));

    if(canAdd > 0){
      if(existing){
        existing.qty += canAdd;
      } else {
        state.cart.push({
          product_id: p.id,
          name: p.product_name,
          barcode: p.barcode || "",
          unit: p.unit || p.unit_name || "ชิ้น",
          qty: canAdd,
          unit_price: Number(p.sale_price),
          original_price: Number(p.sale_price),
          stock: stock,
          discount_note: "",
          is_discounted: false
        });
      }
      totalUnitsAdded += canAdd;
    }
  }

  state.batchScanQueue = [];
  saveCartLocal();
  updateBottomNav();
  updateBatchScanQueueUI();

  if(state.page === "sale"){
    renderSale();
  }

  toast(`📥 นำเข้า ${totalItemsCount} รายการ (${totalUnitsAdded} ชิ้น) สู่ POS เรียบร้อย! 🛒`);
  stopScanner();

  if(state.page !== "sale"){
    go("sale");
  }
}

function scrollScannerToQueue(){
  const panel = el("scannerBatchQueuePanel");
  if(panel){
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function getTerminalStats(){
  const a = {};
  for(const s of todaySales()){
    const c = s.terminal_code || "POS-01";
    if(!a[c]) a[c] = { bills: 0, total: 0, cash: 0, qr: 0 };
    a[c].bills++;
    const amt = Number(s.total_amount || 0);
    a[c].total += amt;
    const isQ = s.payment_method === "promptpay" || s.payment_method === "qr" || s.payment_method === "transfer";
    if(isQ) a[c].qr += amt; else a[c].cash += amt;
  }
  return a;
}

function getDashboardDateRange(){
  const today = todayISO();
  const period = state.dashboardPeriod || "today";
  let start = state.dashboardDateStart || today;
  let end = state.dashboardDateEnd || today;

  if(period === "today"){
    start = today;
    end = today;
  } else if(period === "yesterday"){
    const yest = getNDaysAgoISO(1);
    start = yest;
    end = yest;
  } else if(period === "7days"){
    start = getNDaysAgoISO(6);
    end = today;
  } else if(period === "30days"){
    start = getNDaysAgoISO(29);
    end = today;
  } else if(period === "all"){
    let earliest = today;
    if(state.sales && state.sales.length > 0){
      for(const s of state.sales){
        if(s.sale_date && s.sale_date < earliest) earliest = s.sale_date;
      }
    }
    start = earliest;
    end = today;
  } else if(period === "custom"){
    if(!start) start = today;
    if(!end) end = today;
    if(start > end){
      const t = start; start = end; end = t;
    }
  }
  return { start, end, period };
}

function setDashboardPeriod(period){
  state.dashboardPeriod = period;
  const today = todayISO();
  if(period === "today"){
    state.dashboardDateStart = today;
    state.dashboardDateEnd = today;
  } else if(period === "yesterday"){
    const yest = getNDaysAgoISO(1);
    state.dashboardDateStart = yest;
    state.dashboardDateEnd = yest;
  } else if(period === "7days"){
    state.dashboardDateStart = getNDaysAgoISO(6);
    state.dashboardDateEnd = today;
  } else if(period === "30days"){
    state.dashboardDateStart = getNDaysAgoISO(29);
    state.dashboardDateEnd = today;
  } else if(period === "all"){
    let earliest = today;
    if(state.sales && state.sales.length > 0){
      for(const s of state.sales){
        if(s.sale_date && s.sale_date < earliest) earliest = s.sale_date;
      }
    }
    state.dashboardDateStart = earliest;
    state.dashboardDateEnd = today;
  }
  renderDashboardToday();
}

function onDashboardDateInputChange(){
  const startEl = el("dashDateStart");
  const endEl = el("dashDateEnd");
  if(startEl && endEl){
    state.dashboardPeriod = "custom";
    state.dashboardDateStart = startEl.value || todayISO();
    state.dashboardDateEnd = endEl.value || todayISO();
  }
}

function applyDashboardCustomDate(){
  const startEl = el("dashDateStart");
  const endEl = el("dashDateEnd");
  if(startEl && endEl){
    state.dashboardPeriod = "custom";
    let s = startEl.value || todayISO();
    let e = endEl.value || todayISO();
    if(s > e){
      const t = s; s = e; e = t;
      startEl.value = s;
      endEl.value = e;
    }
    state.dashboardDateStart = s;
    state.dashboardDateEnd = e;
    renderDashboardToday();
  }
}

// -------------------------------------------------------------
// Basket Size Analysis & Customer Purchasing Insights
// -------------------------------------------------------------
function getBasketAnalytics(salesList, itemsList){
  const sales = Array.isArray(salesList) ? salesList : (state.sales || []);
  const items = Array.isArray(itemsList) ? itemsList : (state.saleItems || []);

  const validSales = sales.filter(s => Number(s.total_amount || 0) >= 0);
  const totalBills = validSales.length;
  const totalRevenue = validSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);

  // Group items by sale_id
  const itemsBySale = new Map();
  items.forEach(it => {
    const sid = it.sale_id;
    if(!itemsBySale.has(sid)) itemsBySale.set(sid, []);
    itemsBySale.get(sid).push(it);
  });

  let totalUnits = 0;
  let maxBill = null;
  let minBill = null;

  // Basket size buckets (by items count)
  let singleItemBills = 0; // 1 item
  let twoItemsBills = 0;   // 2 items
  let multiItemsBills = 0; // 3-5 items
  let bulkItemsBills = 0;  // 6+ items

  // Basket value tiers (by revenue)
  let tierSmall = { count: 0, total: 0, label: "ยอดเล็ก (< ฿300)" };
  let tierMedium = { count: 0, total: 0, label: "ยอดกลาง (฿300 - ฿1,000)" };
  let tierHigh = { count: 0, total: 0, label: "ยอดสูง (฿1,000 - ฿3,000)" };
  let tierVIP = { count: 0, total: 0, label: "บิล VIP (> ฿3,000)" };

  // Pair combinations (Item A + Item B bought together in same bill)
  const pairFreq = new Map();

  validSales.forEach(s => {
    const saleAmt = Number(s.total_amount || 0);
    const saleIts = itemsBySale.get(s.id) || [];
    const billUnits = saleIts.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 1;
    totalUnits += billUnits;

    if(!maxBill || saleAmt > Number(maxBill.total_amount || 0)){
      maxBill = { ...s, units: billUnits, itemsCount: saleIts.length };
    }
    if(saleAmt > 0 && (!minBill || saleAmt < Number(minBill.total_amount || 0))){
      minBill = { ...s, units: billUnits, itemsCount: saleIts.length };
    }

    if(billUnits === 1) singleItemBills++;
    else if(billUnits === 2) twoItemsBills++;
    else if(billUnits >= 3 && billUnits <= 5) multiItemsBills++;
    else bulkItemsBills++;

    if(saleAmt < 300){
      tierSmall.count++;
      tierSmall.total += saleAmt;
    } else if(saleAmt <= 1000){
      tierMedium.count++;
      tierMedium.total += saleAmt;
    } else if(saleAmt <= 3000){
      tierHigh.count++;
      tierHigh.total += saleAmt;
    } else {
      tierVIP.count++;
      tierVIP.total += saleAmt;
    }

    if(saleIts.length >= 2){
      const uniqueNames = Array.from(new Set(saleIts.map(it => it.product_name).filter(Boolean))).sort();
      for(let i = 0; i < uniqueNames.length; i++){
        for(let j = i + 1; j < uniqueNames.length; j++){
          const pairKey = `${uniqueNames[i]} +++ ${uniqueNames[j]}`;
          pairFreq.set(pairKey, (pairFreq.get(pairKey) || 0) + 1);
        }
      }
    }
  });

  const avgUnitsPerBill = totalBills > 0 ? (totalUnits / totalBills) : 0;
  const avgBillValue = totalBills > 0 ? (totalRevenue / totalBills) : 0;
  const avgPricePerUnit = totalUnits > 0 ? (totalRevenue / totalUnits) : 0;

  const topPairs = Array.from(pairFreq.entries())
    .map(([key, count]) => {
      const [p1, p2] = key.split(" +++ ");
      return { p1, p2, count };
    })
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalBills,
    totalRevenue,
    totalUnits,
    avgUnitsPerBill,
    avgBillValue,
    avgPricePerUnit,
    maxBill,
    minBill,
    singleItemBills,
    twoItemsBills,
    multiItemsBills,
    bulkItemsBills,
    tierSmall,
    tierMedium,
    tierHigh,
    tierVIP,
    topPairs
  };
}

function renderBasketAnalyticsHTML(b){
  if(!b || b.totalBills === 0){
    return `<div class="empty" style="padding:28px 10px;">ยังไม่มีข้อมูลการขายสำหรับวิเคราะห์ขนาดตะกร้าในช่วงเวลานี้</div>`;
  }

  const singlePct = ((b.singleItemBills / b.totalBills) * 100).toFixed(1);
  const twoPct = ((b.twoItemsBills / b.totalBills) * 100).toFixed(1);
  const multiPct = ((b.multiItemsBills / b.totalBills) * 100).toFixed(1);
  const bulkPct = ((b.bulkItemsBills / b.totalBills) * 100).toFixed(1);

  const tiers = [b.tierSmall, b.tierMedium, b.tierHigh, b.tierVIP];

  return `
    <div class="basket-analytics-wrap">
      <!-- 4 Core Basket Metrics -->
      <div class="basket-kpi-row">
        <div class="basket-kpi-box highlight">
          <div class="bk-label">
            <span>🛍️ ขนาดตะกร้าเฉลี่ย (Basket Size)</span>
          </div>
          <div class="bk-val">${b.avgUnitsPerBill.toFixed(1)} <small style="font-size:13px; font-weight:600; opacity:0.8;">ชิ้น/บิล</small></div>
          <div class="bk-hint">จำนวนสินค้าเฉลี่ยต่อการซื้อ 1 บิล</div>
        </div>

        <div class="basket-kpi-box">
          <div class="bk-label">
            <span>💳 ยอดซื้อเฉลี่ยต่อบิล (AOV)</span>
          </div>
          <div class="bk-val">฿${money(b.avgBillValue)}</div>
          <div class="bk-hint">Average Order Value</div>
        </div>

        <div class="basket-kpi-box">
          <div class="bk-label">
            <span>🏷️ ราคาเฉลี่ยต่อชิ้นที่ขาย</span>
          </div>
          <div class="bk-val">฿${money(b.avgPricePerUnit)}</div>
          <div class="bk-hint">ยอดขายรวม ÷ จำนวนชิ้นทั้งหมด</div>
        </div>

        <div class="basket-kpi-box">
          <div class="bk-label">
            <span>👑 บิลสถิติสูงสุด (VIP Bill)</span>
          </div>
          <div class="bk-val">฿${b.maxBill ? money(b.maxBill.total_amount) : '0'}</div>
          <div class="bk-hint">${b.maxBill ? `${b.maxBill.units} ชิ้น · ${b.maxBill.terminal_code || 'POS'}` : '-'}</div>
        </div>
      </div>

      <!-- Grid: Basket Depth & Basket Value Tiers -->
      <div class="basket-sections-grid">
        <!-- Depth Breakdown -->
        <div class="basket-card-panel">
          <div class="basket-panel-title">
            <span>📦 สัดส่วนขนาดตะกร้า (ตามจำนวนชิ้นในบิล)</span>
            <small style="font-weight:600; color:#94a3b8;">${b.totalBills} บิล</small>
          </div>
          <div class="basket-tier-list">
            <div class="basket-tier-row">
              <div class="basket-tier-meta">
                <span class="basket-tier-name">1 ชิ้น (Single Item)</span>
                <div class="basket-tier-numbers">
                  <strong>${b.singleItemBills} บิล</strong>
                  <span class="sub">${singlePct}%</span>
                </div>
              </div>
              <div class="progress-bar-track" style="height:6px;">
                <div class="progress-bar-fill" style="width:${singlePct}%; background:#38bdf8;"></div>
              </div>
            </div>

            <div class="basket-tier-row">
              <div class="basket-tier-meta">
                <span class="basket-tier-name">2 ชิ้น (Double Items)</span>
                <div class="basket-tier-numbers">
                  <strong>${b.twoItemsBills} บิล</strong>
                  <span class="sub">${twoPct}%</span>
                </div>
              </div>
              <div class="progress-bar-track" style="height:6px;">
                <div class="progress-bar-fill" style="width:${twoPct}%; background:#34d399;"></div>
              </div>
            </div>

            <div class="basket-tier-row">
              <div class="basket-tier-meta">
                <span class="basket-tier-name">3 - 5 ชิ้น (Multi Items)</span>
                <div class="basket-tier-numbers">
                  <strong>${b.multiItemsBills} บิล</strong>
                  <span class="sub">${multiPct}%</span>
                </div>
              </div>
              <div class="progress-bar-track" style="height:6px;">
                <div class="progress-bar-fill" style="width:${multiPct}%; background:#fbbf24;"></div>
              </div>
            </div>

            <div class="basket-tier-row">
              <div class="basket-tier-meta">
                <span class="basket-tier-name">6 ชิ้นขึ้นไป (Bulk Basket)</span>
                <div class="basket-tier-numbers">
                  <strong>${b.bulkItemsBills} บิล</strong>
                  <span class="sub">${bulkPct}%</span>
                </div>
              </div>
              <div class="progress-bar-track" style="height:6px;">
                <div class="progress-bar-fill" style="width:${bulkPct}%; background:#c084fc;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Value Tiers Breakdown -->
        <div class="basket-card-panel">
          <div class="basket-panel-title">
            <span>💰 การกระจายตามช่วงยอดซื้อ (Ticket Size Tiers)</span>
            <small style="font-weight:600; color:#94a3b8;">รวม ฿${money(b.totalRevenue)}</small>
          </div>
          <div class="basket-tier-list">
            ${tiers.map(t => {
              const countPct = b.totalBills > 0 ? ((t.count / b.totalBills) * 100).toFixed(1) : "0.0";
              const revPct = b.totalRevenue > 0 ? ((t.total / b.totalRevenue) * 100).toFixed(1) : "0.0";
              return `
                <div class="basket-tier-row">
                  <div class="basket-tier-meta">
                    <span class="basket-tier-name">${escapeHtml(t.label)}</span>
                    <div class="basket-tier-numbers">
                      <strong>${t.count} บิล</strong>
                      <span class="sub">฿${money(t.total)} (${revPct}%)</span>
                    </div>
                  </div>
                  <div class="progress-bar-track" style="height:6px;">
                    <div class="progress-bar-fill" style="width:${countPct}%;"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>

      <!-- Top Bundled Pairs & VIP Bill -->
      <div class="basket-sections-grid">
        <div class="basket-card-panel">
          <div class="basket-panel-title">
            <span>🔗 สินค้าที่มักซื้อร่วมกันในบิลเดียว (Co-Purchased Pairs)</span>
            <span style="font-size:11px; color:#c084fc; font-weight:700;">Cross-Selling Insights</span>
          </div>
          ${b.topPairs.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${b.topPairs.map(p => `
                <div class="basket-pair-row">
                  <div class="basket-pair-names">
                    <span>${escapeHtml(p.p1)}</span>
                    <span class="basket-pair-plus">+</span>
                    <span>${escapeHtml(p.p2)}</span>
                  </div>
                  <span class="basket-pair-badge">คู่กัน ${p.count} บิล</span>
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="empty" style="padding:16px;">ยังไม่มีข้อมูลสินค้าที่ซื้อคู่กันตั้งแต่ 2 ชิ้นขึ้นไป</div>
          `}
        </div>

        ${b.maxBill ? `
          <div class="basket-card-panel">
            <div class="basket-panel-title">
              <span>🏆 ข้อมูลบิลสถิติสูงสุด (Highest Record Bill)</span>
              <span style="font-size:11px; color:#fbbf24; font-weight:700;">VIP Transaction</span>
            </div>
            <div class="vip-bill-badge">
              <div class="vip-bill-info">
                <strong>บิลเลขที่ ${escapeHtml(b.maxBill.sale_number || b.maxBill.id || "-")}</strong>
                <small>📅 ${formatThaiDateStr(b.maxBill.sale_date)} · ⏰ ${b.maxBill.sale_time || '-'} · 💻 ${escapeHtml(b.maxBill.terminal_code || 'POS-01')}</small>
                <small>💳 ชำระด้วย: ${(b.maxBill.payment_method === 'promptpay' || b.maxBill.payment_method === 'qr' || b.maxBill.payment_method === 'transfer') ? 'QR PromptPay' : 'เงินสด'} · ${b.maxBill.units} ชิ้น</small>
              </div>
              <div class="vip-bill-val">฿${money(b.maxBill.total_amount)}</div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderDashboardToday(){
  const dateRange = getDashboardDateRange();
  const startDate = dateRange.start;
  const endDate = dateRange.end;
  const period = dateRange.period;
  const isSingleDay = startDate === endDate;

  const daySales = (state.sales || []).filter(s => {
    const d = s.sale_date || "";
    return d >= startDate && d <= endDate;
  });

  const daySaleIds = new Set(daySales.map(x => x.id));
  const daySaleItems = (state.saleItems || []).filter(i => daySaleIds.has(i.sale_id));

  const totalRevenue = daySales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const totalBills = daySales.length;
  const avgPerBill = totalBills ? (totalRevenue / totalBills) : 0;
  const todayBasket = getBasketAnalytics(daySales, daySaleItems);

  // Payments
  const qrSales = daySales.filter(x => x.payment_method === "promptpay" || x.payment_method === "qr" || x.payment_method === "transfer");
  const cashSales = daySales.filter(x => !x.payment_method || x.payment_method === "cash");
  const cashTotal = cashSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const qrTotal = qrSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const cashPct = totalRevenue > 0 ? ((cashTotal / totalRevenue) * 100).toFixed(1) : "0.0";
  const qrPct = totalRevenue > 0 ? ((qrTotal / totalRevenue) * 100).toFixed(1) : "0.0";

  // Units & Discounts
  const totalUnits = daySaleItems.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const uniqueItemsCount = new Set(daySaleItems.map(x => x.product_name)).size;
  const billDiscounts = daySales.reduce((s, x) => s + (Number(x.discount_amount) || 0), 0);
  let itemDiscounts = 0;
  daySaleItems.forEach(i => {
    const orig = Number(i.original_price) || Number(i.unit_price) || 0;
    const unit = Number(i.unit_price) || 0;
    if(orig > unit){
      itemDiscounts += (orig - unit) * Number(i.qty || 0);
    }
  });
  const totalDiscounts = billDiscounts + itemDiscounts;
  const grossTotal = totalRevenue + totalDiscounts;
  const discountRatio = grossTotal > 0 ? ((totalDiscounts / grossTotal) * 100).toFixed(1) : "0.0";

  // Group by date for multi-day analysis
  const byDate = {};
  daySales.forEach(s => {
    const d = s.sale_date || "-";
    if(!byDate[d]) byDate[d] = { date: d, revenue: 0, bills: 0, units: 0 };
    byDate[d].revenue += Number(s.total_amount || 0);
    byDate[d].bills += 1;
  });
  daySaleItems.forEach(i => {
    const s = state.sales.find(x => x.id === i.sale_id);
    if(s && byDate[s.sale_date]){
      byDate[s.sale_date].units += Number(i.qty || 0);
    }
  });
  const dateRows = Object.values(byDate).sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const daysWithSales = dateRows.length;
  const avgDailyRevenue = daysWithSales > 0 ? (totalRevenue / daysWithSales) : 0;

  let peakDate = null;
  let maxDateRev = 0;
  dateRows.forEach(r => {
    if(r.revenue > maxDateRev){
      maxDateRev = r.revenue;
      peakDate = r;
    }
  });

  // Target
  const target = Number(state.settings.target || 0);
  const targetPct = target > 0 ? Math.min(100, Math.round(totalRevenue / target * 100)) : 0;
  const targetDiff = target - totalRevenue;

  // Hourly Map & Peak Hours
  const hourlyMap = {};
  for(let h = 0; h < 24; h++) hourlyMap[h] = { hour: h, revenue: 0, bills: 0, units: 0 };
  daySales.forEach(s => {
    const timeStr = String(s.sale_time || "").trim();
    let hour = 12;
    if(timeStr.includes(":")){
      hour = parseInt(timeStr.split(":")[0], 10);
    } else if(s.created_at){
      hour = new Date(s.created_at).getHours();
    }
    if(isNaN(hour) || hour < 0 || hour > 23) hour = 12;
    hourlyMap[hour].revenue += Number(s.total_amount || 0);
    hourlyMap[hour].bills += 1;
  });

  daySaleItems.forEach(i => {
    const s = state.sales.find(x => x.id === i.sale_id);
    if(s){
      const timeStr = String(s.sale_time || "").trim();
      let hour = 12;
      if(timeStr.includes(":")) hour = parseInt(timeStr.split(":")[0], 10);
      else if(s.created_at) hour = new Date(s.created_at).getHours();
      if(!isNaN(hour) && hourlyMap[hour]) hourlyMap[hour].units += Number(i.qty || 0);
    }
  });

  let peakHour = null;
  let maxHourRev = 0;
  Object.values(hourlyMap).forEach(h => {
    if(h.revenue > maxHourRev && h.bills > 0){
      maxHourRev = h.revenue;
      peakHour = h;
    }
  });

  // Time blocks (Morning, Afternoon, Evening)
  let mRev = 0, mBills = 0, mUnits = 0;
  let aRev = 0, aBills = 0, aUnits = 0;
  let eRev = 0, eBills = 0, eUnits = 0;
  Object.values(hourlyMap).forEach(h => {
    if(h.hour < 12){ mRev += h.revenue; mBills += h.bills; mUnits += h.units; }
    else if(h.hour < 17){ aRev += h.revenue; aBills += h.bills; aUnits += h.units; }
    else { eRev += h.revenue; eBills += h.bills; eUnits += h.units; }
  });

  // Terminal stats
  const byTerminal = {};
  daySales.forEach(sale => {
    const code = sale.terminal_code || "POS-01";
    if(!byTerminal[code]){
      byTerminal[code] = { code, bills: 0, revenue: 0, cash: 0, qr: 0 };
    }
    byTerminal[code].bills += 1;
    const amt = Number(sale.total_amount || 0);
    byTerminal[code].revenue += amt;
    const isQ = sale.payment_method === "promptpay" || sale.payment_method === "qr" || sale.payment_method === "transfer";
    if(isQ) byTerminal[code].qr += amt; else byTerminal[code].cash += amt;
  });

  // Category breakdown
  const categoryMap = {};
  daySaleItems.forEach(i => {
    const p = productById(i.product_id) || state.products.find(x => x.product_name === i.product_name);
    const cat = p?.category || "สินค้าทั่วไป";
    if(!categoryMap[cat]) categoryMap[cat] = { name: cat, qty: 0, revenue: 0 };
    categoryMap[cat].qty += Number(i.qty || 0);
    categoryMap[cat].revenue += Number(i.line_total || (Number(i.unit_price || 0) * Number(i.qty || 0)));
  });
  const categoryList = Object.values(categoryMap).sort((a,b) => b.revenue - a.revenue);

  // Top products
  const productStatsMap = {};
  daySaleItems.forEach(i => {
    const key = i.product_name || "สินค้า";
    if(!productStatsMap[key]) productStatsMap[key] = { product_name: key, qty: 0, revenue: 0 };
    productStatsMap[key].qty += Number(i.qty || 0);
    productStatsMap[key].revenue += Number(i.line_total || (Number(i.unit_price || 0) * Number(i.qty || 0)));
  });
  const productStats = Object.values(productStatsMap);
  const topQty = [...productStats].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topRev = [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Discounted items summary
  const discountedItemsMap = {};
  daySaleItems.forEach(i => {
    const orig = Number(i.original_price) || Number(i.unit_price) || 0;
    const unit = Number(i.unit_price) || 0;
    if(orig > unit){
      const discount = (orig - unit) * Number(i.qty || 0);
      const name = i.product_name || "สินค้า";
      if(!discountedItemsMap[name]) discountedItemsMap[name] = { name, qty: 0, unitPrice: unit, origPrice: orig, discount: 0 };
      discountedItemsMap[name].qty += Number(i.qty || 0);
      discountedItemsMap[name].discount += discount;
    }
  });
  const discountedItemsList = Object.values(discountedItemsMap).sort((a,b) => b.discount - a.discount).slice(0, 5);

  // Inventory Health
  const allProducts = state.products || [];
  const outOfStockList = allProducts.filter(p => Number(p.stock_qty || 0) <= 0);
  const lowStockList = lowProducts().filter(p => Number(p.stock_qty || 0) > 0);
  const okStockCount = Math.max(0, allProducts.length - outOfStockList.length - lowStockList.length);

  // Human-readable date range label
  let dateRangeLabel = "";
  if(period === "today") dateRangeLabel = `วันนี้ (${formatThaiDateStr(startDate)})`;
  else if(period === "yesterday") dateRangeLabel = `เมื่อวาน (${formatThaiDateStr(startDate)})`;
  else if(period === "7days") dateRangeLabel = `7 วันล่าสุด (${formatThaiDateStr(startDate)} - ${formatThaiDateStr(endDate)})`;
  else if(period === "30days") dateRangeLabel = `30 วันล่าสุด (${formatThaiDateStr(startDate)} - ${formatThaiDateStr(endDate)})`;
  else if(period === "all") dateRangeLabel = `ตลอดทั้งงาน (${formatThaiDateStr(startDate)} - ${formatThaiDateStr(endDate)})`;
  else dateRangeLabel = isSingleDay ? `วันที่ ${formatThaiDateStr(startDate)}` : `${formatThaiDateStr(startDate)} ถึง ${formatThaiDateStr(endDate)}`;

  setHeader("Dashboard วิเคราะห์การขาย", `วิเคราะห์ยอดขายและสต็อกสินค้าแบบละเอียดตามช่วงเวลา (${dateRangeLabel})`);

  el("content").innerHTML = `
    ${connectionNotice()}

    <!-- Executive Action Toolbar -->
    <div class="dashboard-toolbar">
      <div class="dashboard-toolbar-info">
        <div class="dashboard-toolbar-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          สรุปภาพรวมยอดขาย • ${escapeHtml(dateRangeLabel)}
        </div>
        <div class="dashboard-toolbar-subtitle">จุดขายประจำเครื่อง: ${escapeHtml(state.terminal)} · ช่วงเวลา: <span class="dashboard-date-range-badge">${escapeHtml(startDate)} ถึง ${escapeHtml(endDate)}</span></div>
      </div>
      <div class="dashboard-toolbar-actions">
        <button type="button" class="btn-dash-action" onclick="openA4DailyReportModal('${startDate}')" title="พิมพ์รายงานสรุป A4">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          พิมพ์รายงาน A4
        </button>
        <button type="button" class="btn-dash-action" onclick="exportDailySummaryExcel()" title="ส่งออก Excel ช่วงเวลานี้">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          ส่งออก Excel
        </button>
        <button type="button" class="btn-dash-action" onclick="renderDashboardToday()" title="รีเฟรชข้อมูล">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          รีเฟรช
        </button>
        <button type="button" class="btn-dash-action success" onclick="go('sale')" title="เปิดขายสินค้า POS">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          เปิดขาย POS
        </button>
      </div>
    </div>

    <!-- Date Range Filter Bar -->
    <div class="dashboard-date-filter-bar">
      <div class="dashboard-date-presets">
        <span style="font-size:12px; font-weight:700; color:#cbd5e1; margin-right:4px;">กรองช่วงเวลา:</span>
        <button type="button" class="dash-filter-pill ${period === 'today' ? 'active' : ''}" onclick="setDashboardPeriod('today')">
          📅 วันนี้
        </button>
        <button type="button" class="dash-filter-pill ${period === 'yesterday' ? 'active' : ''}" onclick="setDashboardPeriod('yesterday')">
          ⏪ เมื่อวาน
        </button>
        <button type="button" class="dash-filter-pill ${period === '7days' ? 'active' : ''}" onclick="setDashboardPeriod('7days')">
          📆 7 วันล่าสุด
        </button>
        <button type="button" class="dash-filter-pill ${period === '30days' ? 'active' : ''}" onclick="setDashboardPeriod('30days')">
          🗓️ 30 วัน
        </button>
        <button type="button" class="dash-filter-pill ${period === 'all' ? 'active' : ''}" onclick="setDashboardPeriod('all')">
          🌐 ตลอดงาน
        </button>
      </div>

      <div class="dashboard-custom-range-wrap">
        <div class="dashboard-date-input-group">
          <label for="dashDateStart">ตั้งแต่:</label>
          <input type="date" id="dashDateStart" class="dashboard-date-input" value="${startDate}" onchange="onDashboardDateInputChange()">
        </div>
        <div class="dashboard-date-input-group">
          <label for="dashDateEnd">ถึง:</label>
          <input type="date" id="dashDateEnd" class="dashboard-date-input" value="${endDate}" onchange="onDashboardDateInputChange()">
        </div>
        <button type="button" class="btn-dash-date-apply" onclick="applyDashboardCustomDate()">
          🔍 ใช้งานช่วงวันที่
        </button>
      </div>
    </div>

    <!-- 6 Primary Executive KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi primary">
        <div class="label">ยอดขายสุทธิ (Net Revenue)</div>
        <div class="value">฿${money(totalRevenue)}</div>
        <div class="hint">${totalBills} บิล · เฉลี่ย ฿${money(avgPerBill)}/บิล</div>
      </div>

      <div class="kpi warning">
        <div class="label">ยอดรวมก่อนลด & ส่วนลด</div>
        <div class="value">฿${money(grossTotal)}</div>
        <div class="hint">ส่วนลดรวม ฿${money(totalDiscounts)} (${discountRatio}%)</div>
      </div>

      <div class="kpi success">
        <div class="label">จำนวนสินค้าที่จำหน่าย</div>
        <div class="value">${totalUnits} <small style="font-size:13px; font-weight:600; opacity:0.8;">ชิ้น</small></div>
        <div class="hint">จากทั้งหมด ${uniqueItemsCount} รายการ SKU</div>
      </div>

      <div class="kpi info">
        <div class="label">${isSingleDay ? 'เป้าหมายประจำวัน' : `เฉลี่ยต่อวัน (${daysWithSales} วันทำการ)`}</div>
        <div class="value">${isSingleDay ? `${targetPct}%` : `฿${money(avgDailyRevenue)}`}</div>
        <div class="hint">${isSingleDay ? (target > 0 ? (targetDiff <= 0 ? `🎉 เกินเป้า ฿${money(Math.abs(targetDiff))}` : `ขาดอีก ฿${money(targetDiff)} จากเป้า ฿${money(target)}`) : 'ยังไม่ได้ตั้งเป้าหมาย') : (target > 0 ? `เป้ารายวัน ฿${money(target)}` : 'ยอดเฉลี่ยรายวัน')}</div>
        ${isSingleDay ? `
          <div class="progress-bar-wrap">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${targetPct}%;"></div>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="kpi teal">
        <div class="label">รับชำระ: เงินสด (Cash)</div>
        <div class="value">฿${money(cashTotal)}</div>
        <div class="hint">${cashSales.length} บิล (${cashPct}% ของยอดขาย)</div>
      </div>

      <div class="kpi purple">
        <div class="label">รับชำระ: QR PromptPay</div>
        <div class="value">฿${money(qrTotal)}</div>
        <div class="hint">${qrSales.length} บิล (${qrPct}% ของยอดขาย)</div>
      </div>
    </div>

    <!-- Time & Hourly / Daily Analysis Section -->
    <div class="dashboard-grid dashboard-grid-main">
      ${!isSingleDay ? `
        <div style="grid-column: 1 / -1; margin-bottom: 8px;">
          ${card(`📊 กราฟยอดขายและแนวโน้มรายวัน (${dateRows.length} วันทำการ)`, `
            <div class="all-days-chart-wrapper">
              <div class="all-days-chart-header">
                <div class="all-days-metric-pills">
                  <button type="button" class="all-days-metric-btn ${(state.allDaysChartMetric || 'revenue') === 'revenue' ? 'active' : ''}" data-metric="revenue" onclick="setAllDaysChartMetric('revenue', 'todayPeriodSalesChartContainer', window._currentTodaySales)">
                    💰 ยอดขาย
                  </button>
                  <button type="button" class="all-days-metric-btn ${state.allDaysChartMetric === 'bills' ? 'active' : ''}" data-metric="bills" onclick="setAllDaysChartMetric('bills', 'todayPeriodSalesChartContainer', window._currentTodaySales)">
                    🧾 จำนวนบิล
                  </button>
                  <button type="button" class="all-days-metric-btn ${state.allDaysChartMetric === 'payment' ? 'active' : ''}" data-metric="payment" onclick="setAllDaysChartMetric('payment', 'todayPeriodSalesChartContainer', window._currentTodaySales)">
                    💳 สด vs QR
                  </button>
                </div>
                ${peakDate ? `
                  <div class="all-days-peak-badge" title="วันที่มีสถิติยอดขายสูงสุดในช่วงนี้">
                    <span>🏆 วันพีคยอดขาย:</span>
                    <strong>${formatThaiDateShort(peakDate.date)}</strong>
                    <span class="peak-val">฿${money(peakDate.revenue)}</span>
                  </div>
                ` : ""}
              </div>
              <div class="all-days-chart-viewport" id="todayPeriodChartViewport">
                <div id="todayPeriodSalesChartContainer" class="all-days-chart-container"></div>
              </div>
            </div>
          `)}
        </div>
        ${card(`ยอดขายแยกตามรายวัน (${dateRows.length} วันทำการ)`, `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <span style="font-size:12.5px; color:#cbd5e1; font-weight:700;">ยอดขายและจำนวนบิลแยกแต่ละวันในช่วงเวลาที่เลือก</span>
          ${peakDate ? `
            <div class="peak-hour-pill">
              ⭐ วันที่ขายดีสุด: <strong>${formatThaiDateStr(peakDate.date)}</strong>
              <span>(฿${money(peakDate.revenue)} · ${peakDate.bills} บิล)</span>
            </div>
          ` : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>จำนวนบิล</th>
                <th>จำนวนชิ้น</th>
                <th>ยอดขายรวม</th>
                <th>สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              ${dateRows.map(r => {
                const share = totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) : "0.0";
                return `
                  <tr>
                    <td><strong>${formatThaiDateStr(r.date)}</strong> <span style="font-size:11px; color:#94a3b8;">(${escapeHtml(r.date)})</span></td>
                    <td style="font-variant-numeric:tabular-nums;">${r.bills} บิล</td>
                    <td style="font-variant-numeric:tabular-nums;">${r.units} ชิ้น</td>
                    <td style="font-weight:800; color:#34d399; font-variant-numeric:tabular-nums;">฿${money(r.revenue)}</td>
                    <td style="min-width:110px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div class="progress-bar-track" style="flex:1; height:6px;">
                          <div class="progress-bar-fill" style="width:${share}%;"></div>
                        </div>
                        <span style="font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; min-width:32px;">${share}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="5" class="empty">ไม่มีข้อมูลการขายในช่วงนี้</td></tr>`}
            </tbody>
          </table>
        </div>
      `)}
      ` : card("วิเคราะห์การกระจายตัวของยอดขายตามช่วงเวลา", `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-size:12.5px; color:#cbd5e1; font-weight:700;">ยอดขายและจำนวนบิลแยกตามช่วงของวัน</span>
          </div>
          ${peakHour ? `
            <div class="peak-hour-pill">
              ⭐ Peak Hour: <strong>${String(peakHour.hour).padStart(2,'0')}:00 - ${String(peakHour.hour+1).padStart(2,'0')}:00 น.</strong>
              <span>(฿${money(peakHour.revenue)} · ${peakHour.bills} บิล)</span>
            </div>
          ` : '<span style="font-size:12px; color:#94a3b8;">ยังไม่มีข้อมูลช่วงเวลา</span>'}
        </div>

        <div class="time-blocks-grid">
          <div class="time-block-card">
            <div class="time-block-head">
              <span>🌅 รอบเช้า (ก่อน 12:00 น.)</span>
              <span>${mBills} บิล</span>
            </div>
            <div class="time-block-val">฿${money(mRev)}</div>
            <div class="time-block-sub">
              <span>ขายได้ ${mUnits} ชิ้น</span>
              <span>·</span>
              <span>${totalRevenue > 0 ? ((mRev / totalRevenue) * 100).toFixed(0) : 0}% ของวัน</span>
            </div>
          </div>

          <div class="time-block-card">
            <div class="time-block-head">
              <span>☀️ รอบบ่าย (12:00 - 17:00 น.)</span>
              <span>${aBills} บิล</span>
            </div>
            <div class="time-block-val">฿${money(aRev)}</div>
            <div class="time-block-sub">
              <span>ขายได้ ${aUnits} ชิ้น</span>
              <span>·</span>
              <span>${totalRevenue > 0 ? ((aRev / totalRevenue) * 100).toFixed(0) : 0}% ของวัน</span>
            </div>
          </div>

          <div class="time-block-card">
            <div class="time-block-head">
              <span>🌆 รอบเย็น-ค่ำ (17:00 น. เป็นต้นไป)</span>
              <span>${eBills} บิล</span>
            </div>
            <div class="time-block-val">฿${money(eRev)}</div>
            <div class="time-block-sub">
              <span>ขายได้ ${eUnits} ชิ้น</span>
              <span>·</span>
              <span>${totalRevenue > 0 ? ((eRev / totalRevenue) * 100).toFixed(0) : 0}% ของวัน</span>
            </div>
          </div>
        </div>
      `)}

      ${card("สรุปตามจุดขาย (Terminals)", `
        <div class="terminal-report">
          ${Object.values(byTerminal).map(t => {
            const share = totalRevenue > 0 ? ((t.revenue / totalRevenue) * 100).toFixed(1) : "0.0";
            const avgTicket = t.bills > 0 ? t.revenue / t.bills : 0;
            return `
              <div class="terminal-stat">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span><strong>${escapeHtml(t.code)}</strong></span>
                  <span style="font-size:11px; color:#38bdf8; font-weight:700;">${share}% ของยอดขาย</span>
                </div>
                <strong>฿${money(t.revenue)}</strong>
                <small>${t.bills} บิล · เฉลี่ย ฿${money(avgTicket)}/บิล</small>
                <div style="font-size:10.5px; color:#94a3b8; margin-top:2px;">
                  สด: ฿${money(t.cash)} · QR: ฿${money(t.qr)}
                </div>
              </div>
            `;
          }).join("") || `<div class="empty">ยังไม่มีข้อมูลจุดขายในช่วงนี้</div>`}
        </div>
      `)}
    </div>

    <!-- Category Sales Breakdown & Best Sellers -->
    <div class="dashboard-grid">
      ${card("สัดส่วนยอดขายตามหมวดหมู่สินค้า", `
        <div style="display:flex; flex-direction:column;">
          ${categoryList.length ? categoryList.map(c => {
            const pct = totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) : "0.0";
            return `
              <div class="category-bar-row">
                <div class="category-bar-meta">
                  <span class="category-bar-name">${escapeHtml(c.name)}</span>
                  <div class="category-bar-figures">
                    <span style="color:#94a3b8; font-size:12px;">${c.qty} ชิ้น</span>
                    <strong>฿${money(c.revenue)}</strong>
                    <span style="color:#38bdf8; font-size:12px; font-weight:700;">${pct}%</span>
                  </div>
                </div>
                <div class="category-bar-track">
                  <div class="category-bar-fill" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join("") : `<div class="empty">ยังไม่มีรายการขายแยกหมวดหมู่</div>`}
        </div>
      `)}

      ${card("สินค้าที่ทำยอดขายสูงสุด (Top Revenue)", `
        <div class="rank-list">
          ${topRev.length ? topRev.map((x, i) => `
            <div class="rank-row">
              <span class="rank-no">${i + 1}</span>
              <div class="rank-info">
                <strong>${escapeHtml(x.product_name)}</strong>
                <small>ขายได้ ${x.qty} ชิ้น</small>
              </div>
              <span class="rank-value">฿${money(x.revenue)}</span>
            </div>
          `).join("") : `<div class="empty">ยังไม่มีรายการขายในช่วงนี้</div>`}
        </div>
      `)}
    </div>

    <!-- Top Volume & Promotion / Discount Summary -->
    <div class="dashboard-grid">
      ${card("สินค้าที่ขายจำนวนชิ้นมากที่สุด (Top Volume)", `
        <div class="rank-list">
          ${topQty.length ? topQty.map((x, i) => `
            <div class="rank-row">
              <span class="rank-no">${i + 1}</span>
              <div class="rank-info">
                <strong>${escapeHtml(x.product_name)}</strong>
                <small>ยอดขาย ฿${money(x.revenue)}</small>
              </div>
              <span class="rank-value" style="color:#38bdf8;">${x.qty} ชิ้น</span>
            </div>
          `).join("") : `<div class="empty">ยังไม่มีรายการขายในช่วงนี้</div>`}
        </div>
      `)}

      ${card("สินค้าที่มีการจัดโปรโมชั่น / ลดราคามากที่สุด", `
        <div class="rank-list">
          ${discountedItemsList.length ? discountedItemsList.map((d, i) => `
            <div class="rank-row">
              <span class="rank-no" style="background:rgba(239,68,68,0.2); color:#fca5a5;">${i + 1}</span>
              <div class="rank-info">
                <strong>${escapeHtml(d.name)}</strong>
                <small>ขาย ${d.qty} ชิ้น · ปกติ ฿${money(d.origPrice)} เหลือ ฿${money(d.unitPrice)}</small>
              </div>
              <span class="rank-value" style="color:#f87171;">-฿${money(d.discount)}</span>
            </div>
          `).join("") : `<div class="empty">ไม่มีรายการสินค้าลดราคาในช่วงนี้</div>`}
        </div>
      `)}
    </div>

    <!-- Inventory Health & Alerts -->
    ${card("สุขภาพสต็อกสินค้า & การเตรียมความพร้อมคลัง (Inventory Health)", `
      <div class="inventory-health-grid">
        <div class="health-stat-box all">
          <div class="h-title">สินค้าทั้งหมด</div>
          <div class="h-num">${allProducts.length}</div>
        </div>
        <div class="health-stat-box ok">
          <div class="h-title">ระดับปกติ (OK)</div>
          <div class="h-num">${okStockCount}</div>
        </div>
        <div class="health-stat-box low">
          <div class="h-title">ใกล้หมด (Low Stock)</div>
          <div class="h-num">${lowStockList.length}</div>
        </div>
        <div class="health-stat-box out">
          <div class="h-title">หมดสต็อก (Out)</div>
          <div class="h-num">${outOfStockList.length}</div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>สินค้าที่ต้องติดตาม</th>
              <th>รหัส/Barcode</th>
              <th>คงเหลือ</th>
              <th>เกณฑ์ขั้นต่ำ</th>
              <th>สถานะ</th>
              <th style="text-align:right;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${[...outOfStockList, ...lowStockList].slice(0, 10).map(p => `
              <tr>
                <td><strong>${escapeHtml(p.product_name)}</strong></td>
                <td>${escapeHtml(p.barcode || p.product_code || "-")}</td>
                <td style="font-weight:800; font-variant-numeric:tabular-nums; color:${Number(p.stock_qty) <= 0 ? '#f87171' : '#fbbf24'};">${p.stock_qty} ${escapeHtml(p.unit || p.unit_name || 'ชิ้น')}</td>
                <td>${p.min_stock || 0}</td>
                <td>${statusForProduct(p)}</td>
                <td style="text-align:right;">
                  <button type="button" class="quick-rec-btn" onclick="quickReceive('${p.id}')">
                    + รับเข้าสต็อก
                  </button>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="6" class="empty">สต็อกสินค้าอยู่ในเกณฑ์ปกติทุกรายการ 🎉</td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; color:#94a3b8;">แสดงสูงสุด 10 รายการที่ต้องเฝ้าระวัง</span>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-primary" onclick="go('lowStock')" style="font-size:12px; padding:5px 12px;">📋 ใบสั่งเติมสต็อก (${lowProducts().length}) →</button>
          <button type="button" class="btn btn-light" onclick="go('lowStock')" style="font-size:12px; padding:5px 12px;">ดูสินค้าใกล้หมดทั้งหมด →</button>
        </div>
      </div>
    `)}

    <!-- Today Basket Size & Purchasing Insights -->
    <div style="margin-top: 20px;">
      ${card("🛒 ข้อมูลขนาดตะกร้า & พฤติกรรมการซื้อ (Basket Analysis)", `
        ${renderBasketAnalyticsHTML(todayBasket)}
      `)}
    </div>
  `;

  window._currentTodaySales = daySales;
  if(!isSingleDay){
    setTimeout(() => {
      mountAllDaysSalesChart("todayPeriodSalesChartContainer", daySales);
    }, 40);
  }
}

// -------------------------------------------------------------
// Executive Dashboard Filter Management & Helpers
// -------------------------------------------------------------
function initDashboardAllFilter(){
  if (!state.dashboardAllFilter) {
    state.dashboardAllFilter = {
      period: "all",
      startDate: "",
      endDate: ""
    };
  }
}

function getDashboardAllEarliestDate(){
  const today = todayISO();
  let earliest = today;
  if(Array.isArray(state.sales) && state.sales.length > 0){
    for(const s of state.sales){
      const d = s.sale_date || (s.created_at ? s.created_at.slice(0,10) : "");
      if(d && d < earliest) earliest = d;
    }
  }
  return earliest;
}

function getDashboardAllDateRange(){
  initDashboardAllFilter();
  const f = state.dashboardAllFilter;
  const today = todayISO();
  const earliest = getDashboardAllEarliestDate();

  let start = f.startDate;
  let end = f.endDate;

  if(f.period === "all"){
    start = earliest;
    end = today;
  } else if(f.period === "today"){
    start = today;
    end = today;
  } else if(f.period === "yesterday"){
    const yest = getNDaysAgoISO(1);
    start = yest;
    end = yest;
  } else if(f.period === "7days"){
    start = getNDaysAgoISO(6);
    end = today;
  } else if(f.period === "30days"){
    start = getNDaysAgoISO(29);
    end = today;
  } else if(f.period === "month"){
    const now = new Date();
    start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    end = today;
  } else if(f.period === "custom"){
    if(!start) start = earliest;
    if(!end) end = today;
    if(start > end){
      const t = start; start = end; end = t;
    }
  }
  return { start: start || earliest, end: end || today, period: f.period };
}

function setDashboardAllPeriod(period){
  initDashboardAllFilter();
  state.dashboardAllFilter.period = period;
  const today = todayISO();
  const earliest = getDashboardAllEarliestDate();

  if(period === "all"){
    state.dashboardAllFilter.startDate = earliest;
    state.dashboardAllFilter.endDate = today;
  } else if(period === "today"){
    state.dashboardAllFilter.startDate = today;
    state.dashboardAllFilter.endDate = today;
  } else if(period === "yesterday"){
    const yest = getNDaysAgoISO(1);
    state.dashboardAllFilter.startDate = yest;
    state.dashboardAllFilter.endDate = yest;
  } else if(period === "7days"){
    state.dashboardAllFilter.startDate = getNDaysAgoISO(6);
    state.dashboardAllFilter.endDate = today;
  } else if(period === "30days"){
    state.dashboardAllFilter.startDate = getNDaysAgoISO(29);
    state.dashboardAllFilter.endDate = today;
  } else if(period === "month"){
    const now = new Date();
    state.dashboardAllFilter.startDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    state.dashboardAllFilter.endDate = today;
  }
  renderDashboardAll();
}

function onDashboardAllDateInputChange(){
  const sInput = el("dashAllDateStart");
  const eInput = el("dashAllDateEnd");
  if(sInput && eInput){
    initDashboardAllFilter();
    state.dashboardAllFilter.period = "custom";
    state.dashboardAllFilter.startDate = sInput.value || todayISO();
    state.dashboardAllFilter.endDate = eInput.value || sInput.value || todayISO();
  }
}

function applyDashboardAllCustomDate(){
  const sInput = el("dashAllDateStart");
  const eInput = el("dashAllDateEnd");
  if(!sInput || !eInput) return;
  initDashboardAllFilter();
  state.dashboardAllFilter.period = "custom";
  let s = sInput.value || todayISO();
  let e = eInput.value || todayISO();
  if(s > e){
    const t = s; s = e; e = t;
    sInput.value = s;
    eInput.value = e;
  }
  state.dashboardAllFilter.startDate = s;
  state.dashboardAllFilter.endDate = e;
  renderDashboardAll();
}

function getDashboardAllFilteredSales(){
  const range = getDashboardAllDateRange();
  const allSales = Array.isArray(state.sales) ? state.sales : [];
  if(range.period === "all" && !state.dashboardAllFilter?.startDate && !state.dashboardAllFilter?.endDate){
    return allSales;
  }
  return allSales.filter(s => {
    const d = s.sale_date || (s.created_at ? s.created_at.slice(0,10) : "");
    return d >= range.start && d <= range.end;
  });
}

function renderDashboardAll(){
  initDashboardAllFilter();
  const range = getDashboardAllDateRange();
  const filteredSales = getDashboardAllFilteredSales();

  const saleIds = new Set(filteredSales.map(s => s.id || s.sale_no));
  const filteredItems = (state.saleItems || []).filter(i => saleIds.has(i.sale_id));

  // Date range label
  let dateRangeLabel = "";
  if(range.period === "all") dateRangeLabel = "ตลอดทั้งงาน (All-Time)";
  else if(range.period === "today") dateRangeLabel = `วันนี้ (${formatThaiDateStr(range.start)})`;
  else if(range.period === "yesterday") dateRangeLabel = `เมื่อวาน (${formatThaiDateStr(range.start)})`;
  else if(range.period === "7days") dateRangeLabel = `7 วันล่าสุด (${formatThaiDateStr(range.start)} - ${formatThaiDateStr(range.end)})`;
  else if(range.period === "30days") dateRangeLabel = `30 วันล่าสุด (${formatThaiDateStr(range.start)} - ${formatThaiDateStr(range.end)})`;
  else if(range.period === "month") dateRangeLabel = `เดือนนี้ (${formatThaiDateStr(range.start)} - ${formatThaiDateStr(range.end)})`;
  else dateRangeLabel = range.start === range.end ? `วันที่ ${formatThaiDateStr(range.start)}` : `${formatThaiDateStr(range.start)} ถึง ${formatThaiDateStr(range.end)}`;

  setHeader("Dashboard สรุปภาพรวม & กราฟยอดขาย", `วิเคราะห์ผลประกอบการและสถิติการขาย (${dateRangeLabel})`);

  const total = filteredSales.reduce((s,x) => s + Number(x.total_amount||0), 0);
  const bills = filteredSales.length;
  const avg = bills ? total / bills : 0;
  const allBasket = getBasketAnalytics(filteredSales, filteredItems);

  // Total discounts & units across selected period
  const totalUnits = filteredItems.reduce((s, x) => s + Number(x.qty || 0), 0);
  const billDiscounts = filteredSales.reduce((s, x) => s + Number(x.discount_amount || 0), 0);
  let itemDiscounts = 0;
  filteredItems.forEach(i => {
    const orig = Number(i.original_price) || Number(i.unit_price) || 0;
    const unit = Number(i.unit_price) || 0;
    if(orig > unit){
      itemDiscounts += (orig - unit) * Number(i.qty || 0);
    }
  });
  const totalDiscounts = billDiscounts + itemDiscounts;
  const grossTotal = total + totalDiscounts;

  // Payments
  const qrSales = filteredSales.filter(x => x.payment_method === "promptpay" || x.payment_method === "qr" || x.payment_method === "transfer");
  const cashSales = filteredSales.filter(x => !x.payment_method || x.payment_method === "cash");
  const cashTotal = cashSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const qrTotal = qrSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);

  // Group by terminal
  const byTerminal = {};
  for(const sale of filteredSales){
    const code = sale.terminal_code || "POS-01";
    if(!byTerminal[code]) byTerminal[code] = { code, bills: 0, total: 0, cash: 0, qr: 0 };
    byTerminal[code].bills += 1;
    const amt = Number(sale.total_amount || 0);
    byTerminal[code].total += amt;
    const isQ = sale.payment_method === "promptpay" || sale.payment_method === "qr" || sale.payment_method === "transfer";
    if(isQ) byTerminal[code].qr += amt; else byTerminal[code].cash += amt;
  }

  // Group by date
  const byDate = {};
  for(const sale of filteredSales){
    const d = sale.sale_date || "-";
    if(!byDate[d]) byDate[d] = { bills: 0, total: 0 };
    byDate[d].bills += 1;
    byDate[d].total += Number(sale.total_amount || 0);
  }

  const dateRows = Object.entries(byDate)
    .sort((a,b) => String(b[0]).localeCompare(String(a[0])));

  const activeDays = Object.keys(byDate).length;
  const dailyAverage = activeDays > 0 ? (total / activeDays) : 0;

  let peakDateObj = null;
  let peakBillsObj = null;
  for(const [d, v] of Object.entries(byDate)){
    if(!peakDateObj || v.total > peakDateObj.total) peakDateObj = { date: d, ...v };
    if(!peakBillsObj || v.bills > peakBillsObj.bills) peakBillsObj = { date: d, ...v };
  }

  // Category breakdown
  const categoryMap = {};
  filteredItems.forEach(i => {
    const p = productById(i.product_id) || state.products.find(x => x.product_name === i.product_name);
    const cat = p?.category || "สินค้าทั่วไป";
    if(!categoryMap[cat]) categoryMap[cat] = { name: cat, qty: 0, revenue: 0 };
    categoryMap[cat].qty += Number(i.qty || 0);
    categoryMap[cat].revenue += Number(i.line_total || (Number(i.unit_price || 0) * Number(i.qty || 0)));
  });
  const categoryList = Object.values(categoryMap).sort((a,b) => b.revenue - a.revenue);

  // Top products
  const productTotals = {};
  for(const item of filteredItems){
    const key = item.product_name || "ไม่ระบุ";
    if(!productTotals[key]) productTotals[key] = { name: key, qty: 0, total: 0 };
    productTotals[key].qty += Number(item.qty || 0);
    productTotals[key].total += Number(item.line_total || 0);
  }

  const topProducts = Object.values(productTotals)
    .sort((a,b) => b.total - a.total)
    .slice(0, 10);

  el("content").innerHTML = `
    ${connectionNotice()}

    <!-- Executive Action Toolbar -->
    <div class="dashboard-toolbar">
      <div class="dashboard-toolbar-info">
        <div class="dashboard-toolbar-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          สรุปยอดขาย & ตัวชี้วัดหลัก • ${escapeHtml(dateRangeLabel)}
        </div>
        <div class="dashboard-toolbar-subtitle">พบข้อมูล ${activeDays} วันทำการ · ${bills} บิลที่เปิดขาย · ช่วงวันที่: <span class="dashboard-date-range-badge">${escapeHtml(range.start)} ถึง ${escapeHtml(range.end)}</span></div>
      </div>
      <div class="dashboard-toolbar-actions">
        <button type="button" class="btn-dash-action" onclick="openExportCenterModal()" title="ศูนย์ดาวน์โหลดรายงาน">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          ส่งออกรายงาน
        </button>
        <button type="button" class="btn-dash-action" onclick="go('salesHistory')" title="ดูรายละเอียดบิลแต่ละใบ">
          ดูประวัติบิล →
        </button>
      </div>
    </div>

    <!-- Date Range Filter Bar for Managers -->
    <div class="dashboard-date-filter-bar">
      <div class="dashboard-date-presets">
        <span style="font-size:12px; font-weight:700; color:#cbd5e1; margin-right:4px;">กรองช่วงเวลา:</span>
        <button type="button" class="dash-filter-pill ${range.period === 'all' ? 'active' : ''}" onclick="setDashboardAllPeriod('all')">
          🌐 ทั้งหมด
        </button>
        <button type="button" class="dash-filter-pill ${range.period === 'today' ? 'active' : ''}" onclick="setDashboardAllPeriod('today')">
          📅 วันนี้
        </button>
        <button type="button" class="dash-filter-pill ${range.period === 'yesterday' ? 'active' : ''}" onclick="setDashboardAllPeriod('yesterday')">
          ⏪ เมื่อวาน
        </button>
        <button type="button" class="dash-filter-pill ${range.period === '7days' ? 'active' : ''}" onclick="setDashboardAllPeriod('7days')">
          📆 7 วันล่าสุด
        </button>
        <button type="button" class="dash-filter-pill ${range.period === '30days' ? 'active' : ''}" onclick="setDashboardAllPeriod('30days')">
          🗓️ 30 วัน
        </button>
        <button type="button" class="dash-filter-pill ${range.period === 'month' ? 'active' : ''}" onclick="setDashboardAllPeriod('month')">
          📊 เดือนนี้
        </button>
      </div>

      <div class="dashboard-custom-range-wrap">
        <div class="dashboard-date-input-group">
          <label for="dashAllDateStart">ตั้งแต่:</label>
          <input type="date" id="dashAllDateStart" class="dashboard-date-input" value="${range.start}" onchange="onDashboardAllDateInputChange()">
        </div>
        <div class="dashboard-date-input-group">
          <label for="dashAllDateEnd">ถึง:</label>
          <input type="date" id="dashAllDateEnd" class="dashboard-date-input" value="${range.end}" onchange="onDashboardAllDateInputChange()">
        </div>
        <button type="button" class="btn-dash-date-apply" onclick="applyDashboardAllCustomDate()">
          🔍 กรองข้อมูล
        </button>
        ${range.period !== 'all' ? `
          <button type="button" class="dash-filter-pill" style="background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.4); color:#fca5a5;" onclick="setDashboardAllPeriod('all')" title="ล้างตัวกรองกลับสู่ข้อมูลสะสมทั้งหมด">
            ✕ ล้างตัวกรอง
          </button>
        ` : ''}
      </div>
    </div>

    <!-- 6 Key Performance Metrics -->
    <div class="kpi-grid">
      <div class="kpi primary">
        <div class="label">ยอดขายสุทธิรวมทั้งงาน (Net)</div>
        <div class="value">฿${money(total)}</div>
        <div class="hint">${bills} บิล · เฉลี่ย ฿${money(avg)}/บิล</div>
      </div>

      <div class="kpi warning">
        <div class="label">ยอดขายก่อนลด & ส่วนลด</div>
        <div class="value">฿${money(grossTotal)}</div>
        <div class="hint">ส่วนลดสะสม ฿${money(totalDiscounts)}</div>
      </div>

      <div class="kpi success">
        <div class="label">จำนวนสินค้าที่จำหน่าย</div>
        <div class="value">${totalUnits} <small style="font-size:13px; font-weight:600; opacity:0.8;">ชิ้น</small></div>
        <div class="hint">ตลอดทั้งงาน</div>
      </div>

      <div class="kpi info">
        <div class="label">ระยะเวลา & ค่าเฉลี่ยรายวัน</div>
        <div class="value">${activeDays} <small style="font-size:13px; font-weight:600; opacity:0.8;">วัน</small></div>
        <div class="hint">เฉลี่ยวันละ ฿${money(dailyAverage)}</div>
      </div>

      <div class="kpi teal">
        <div class="label">ยอดเงินสดสะสม (Cash)</div>
        <div class="value">฿${money(cashTotal)}</div>
        <div class="hint">${cashSales.length} บิล (${total > 0 ? ((cashTotal / total) * 100).toFixed(1) : 0}%)</div>
      </div>

      <div class="kpi purple">
        <div class="label">ยอด QR PromptPay สะสม</div>
        <div class="value">฿${money(qrTotal)}</div>
        <div class="hint">${qrSales.length} บิล (${total > 0 ? ((qrTotal / total) * 100).toFixed(1) : 0}%)</div>
      </div>
    </div>

    <!-- All-Days Daily Sales Comparison Chart Card -->
    <div style="margin-bottom: 20px;">
      ${card("📊 กราฟเปรียบเทียบยอดขายรายวันตลอดงาน (All-Time Daily Sales Trend & Comparison)", `
        <div class="all-days-chart-wrapper">
          <div class="all-days-chart-header">
            <div class="all-days-metric-pills">
              <button type="button" class="all-days-metric-btn ${(state.allDaysChartMetric || 'revenue') === 'revenue' ? 'active' : ''}" data-metric="revenue" onclick="setAllDaysChartMetric('revenue')">
                💰 ยอดขาย (Revenue)
              </button>
              <button type="button" class="all-days-metric-btn ${state.allDaysChartMetric === 'bills' ? 'active' : ''}" data-metric="bills" onclick="setAllDaysChartMetric('bills')">
                🧾 จำนวนบิล (Bills)
              </button>
              <button type="button" class="all-days-metric-btn ${state.allDaysChartMetric === 'payment' ? 'active' : ''}" data-metric="payment" onclick="setAllDaysChartMetric('payment')">
                💳 แยกเงินสด vs QR
              </button>
            </div>

            ${peakDateObj && peakDateObj.total > 0 ? `
              <div class="all-days-peak-badge" title="วันที่มีสถิติยอดขายสูงสุดตลอดทั้งงาน">
                <span>🏆 วันพีคยอดขายสูงสุด:</span>
                <strong>${formatThaiDateShort(peakDateObj.date)} (${peakDateObj.date})</strong>
                <span class="peak-val">฿${money(peakDateObj.total)}</span>
              </div>
            ` : ""}
          </div>

          <div class="all-days-chart-viewport" id="allDaysChartViewport">
            <div id="allDaysSalesChartContainer" class="all-days-chart-container"></div>
          </div>

          <div class="all-days-chart-summary-row">
            <div class="all-days-summary-chip">
              <span class="chip-dot" style="background:#38bdf8;"></span>
              <span>เฉลี่ยวันละ: <strong>฿${money(dailyAverage)}</strong></span>
            </div>
            ${peakDateObj ? `
              <div class="all-days-summary-chip peak">
                <span class="chip-dot" style="background:#fbbf24;"></span>
                <span>ยอดสูงสุด: <strong>฿${money(peakDateObj.total)}</strong> (${formatThaiDateShort(peakDateObj.date)})</span>
              </div>
            ` : ""}
            ${peakBillsObj ? `
              <div class="all-days-summary-chip">
                <span class="chip-dot" style="background:#34d399;"></span>
                <span>บิลสูงสุด: <strong>${peakBillsObj.bills} บิล</strong> (${formatThaiDateShort(peakBillsObj.date)})</span>
              </div>
            ` : ""}
            <div class="all-days-summary-chip">
              <span>จัดงานทั้งหมด <strong>${activeDays}</strong> วันทำการ · รวม <strong>${bills}</strong> บิล</span>
            </div>
          </div>
        </div>
      `)}
    </div>

    <!-- Daily Breakdown Table & Terminal Performance -->
    <div class="dashboard-grid dashboard-grid-main">
      ${card("ยอดขายแยกตามรายวัน (Daily Breakdown)", `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่จัดงาน</th>
                <th>จำนวนบิล</th>
                <th>ยอดขายรวม</th>
                <th>สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              ${dateRows.map(([date, v]) => {
                const share = total > 0 ? ((v.total / total) * 100).toFixed(1) : "0.0";
                return `
                  <tr>
                    <td><strong>${escapeHtml(date)}</strong></td>
                    <td style="font-variant-numeric:tabular-nums;">${v.bills} บิล</td>
                    <td style="font-weight:800; color:#34d399; font-variant-numeric:tabular-nums;">฿${money(v.total)}</td>
                    <td style="min-width:120px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div class="progress-bar-track" style="flex:1; height:6px;">
                          <div class="progress-bar-fill" style="width:${share}%;"></div>
                        </div>
                        <span style="font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; min-width:32px;">${share}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="4" class="empty">ยังไม่มีข้อมูลการขาย</td></tr>`}
            </tbody>
          </table>
        </div>
      `)}

      ${card("ยอดขายแยกตามจุดขายตลอดงาน (Terminals)", `
        <div class="terminal-report">
          ${Object.values(byTerminal).map(t => {
            const share = total > 0 ? ((t.total / total) * 100).toFixed(1) : "0.0";
            return `
              <div class="terminal-stat">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span><strong>${escapeHtml(t.code)}</strong></span>
                  <span style="font-size:11px; color:#38bdf8; font-weight:700;">${share}%</span>
                </div>
                <strong>฿${money(t.total)}</strong>
                <small>${t.bills} บิล</small>
                <div style="font-size:10.5px; color:#94a3b8; margin-top:2px;">
                  สด: ฿${money(t.cash)} · QR: ฿${money(t.qr)}
                </div>
              </div>
            `;
          }).join("") || `<div class="empty">ยังไม่มีข้อมูลจุดขาย</div>`}
        </div>
      `)}
    </div>

    <!-- Category Breakdown & Top 10 Best Sellers -->
    <div class="dashboard-grid">
      ${card("สัดส่วนยอดขายตามหมวดหมู่สะสม", `
        <div style="display:flex; flex-direction:column;">
          ${categoryList.map(c => {
            const pct = total > 0 ? ((c.revenue / total) * 100).toFixed(1) : "0.0";
            return `
              <div class="category-bar-row">
                <div class="category-bar-meta">
                  <span class="category-bar-name">${escapeHtml(c.name)}</span>
                  <div class="category-bar-figures">
                    <span style="color:#94a3b8; font-size:12px;">${c.qty} ชิ้น</span>
                    <strong>฿${money(c.revenue)}</strong>
                    <span style="color:#38bdf8; font-size:12px; font-weight:700;">${pct}%</span>
                  </div>
                </div>
                <div class="category-bar-track">
                  <div class="category-bar-fill" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join("") || `<div class="empty">ยังไม่มีข้อมูลหมวดหมู่</div>`}
        </div>
      `)}

      ${card("10 อันดับสินค้าที่ทำยอดขายสูงสุดตลอดงาน", `
        <div class="rank-list">
          ${topProducts.map((p, i) => `
            <div class="rank-row">
              <span class="rank-no">${i + 1}</span>
              <div class="rank-info">
                <strong>${escapeHtml(p.name)}</strong>
                <small>ขายสะสม ${p.qty} ชิ้น</small>
              </div>
              <span class="rank-value">฿${money(p.total)}</span>
            </div>
          `).join("") || `<div class="empty">ยังไม่มีข้อมูลสินค้า</div>`}
        </div>
      `)}
    </div>

    <!-- All-Event Basket Analysis & Customer Purchasing Insights -->
    <div style="margin-top: 20px;">
      ${card("🛒 ข้อมูลขนาดตะกร้า & พฤติกรรมการซื้อสะสมตลอดงาน (All-Time Basket Analysis)", `
        ${renderBasketAnalyticsHTML(allBasket)}
      `)}
    </div>
  `;

  setTimeout(() => {
    mountAllDaysSalesChart("allDaysSalesChartContainer");
  }, 40);
}

// -------------------------------------------------------------
// All-Days Daily Sales Comparison Chart (D3 Interactive)
// -------------------------------------------------------------
let allDaysChartResizeObserver = null;

function setAllDaysChartMetric(metric, containerId = "allDaysSalesChartContainer", customSales = null){
  state.allDaysChartMetric = metric;
  const btns = document.querySelectorAll(".all-days-metric-btn");
  btns.forEach(b => {
    if(b.dataset.metric === metric) b.classList.add("active");
    else b.classList.remove("active");
  });
  renderAllDaysSalesChart(containerId, metric, customSales);
}

function mountAllDaysSalesChart(containerId, customSales = null){
  const metric = state.allDaysChartMetric || "revenue";
  renderAllDaysSalesChart(containerId, metric, customSales);

  const viewport = el("allDaysChartViewport") || el("todayPeriodChartViewport") || el(containerId);
  if(!viewport) return;

  if(allDaysChartResizeObserver){
    allDaysChartResizeObserver.disconnect();
  }

  let resizeTimer = null;
  allDaysChartResizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderAllDaysSalesChart(containerId, state.allDaysChartMetric || "revenue", customSales);
    }, 150);
  });
  allDaysChartResizeObserver.observe(viewport);
}

function renderAllDaysSalesChart(containerId, metric = "revenue", customSales = null){
  const container = el(containerId);
  if (!container || typeof d3 === "undefined") return;
  container.innerHTML = "";

  // Extract by date from customSales or getDashboardAllFilteredSales()
  const salesSource = customSales || getDashboardAllFilteredSales();
  const byDate = {};
  for(const s of salesSource){
    const d = s.sale_date || (s.created_at ? s.created_at.slice(0,10) : "-");
    if(!byDate[d]){
      byDate[d] = {
        date: d,
        bills: 0,
        total: 0,
        cash: 0,
        qr: 0,
        cashBills: 0,
        qrBills: 0
      };
    }
    byDate[d].bills += 1;
    const amt = Number(s.total_amount || 0);
    byDate[d].total += amt;
    const isQ = s.payment_method === "promptpay" || s.payment_method === "qr" || s.payment_method === "transfer";
    if(isQ){
      byDate[d].qr += amt;
      byDate[d].qrBills += 1;
    } else {
      byDate[d].cash += amt;
      byDate[d].cashBills += 1;
    }
  }

  const chartData = Object.values(byDate)
    .sort((a,b) => String(a.date).localeCompare(String(b.date)));

  if(chartData.length === 0){
    container.innerHTML = `
      <div class="empty" style="padding:40px 10px;">
        <div style="font-size:26px; margin-bottom:8px;">📊</div>
        <strong style="color:#e2e8f0; font-size:14px;">ไม่พบข้อมูลยอดขายในช่วงเวลาที่เลือก</strong>
        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">ลองเปลี่ยนช่วงวันที่ หรือกดเลือก "🌐 ทั้งหมด" เพื่อดูภาพรวม</div>
      </div>
    `;
    return;
  }

  // Find Peak Day & calculate metrics
  let peakDay = chartData[0];
  let maxRevenue = 0;
  let maxBills = 0;
  let sumRevenue = 0;
  let sumBills = 0;
  for(const d of chartData){
    sumRevenue += d.total;
    sumBills += d.bills;
    if(d.total > maxRevenue){
      maxRevenue = d.total;
      peakDay = d;
    }
    if(d.bills > maxBills) maxBills = d.bills;
  }
  const avgRevenue = chartData.length > 0 ? (sumRevenue / chartData.length) : 0;
  const avgBills = chartData.length > 0 ? (sumBills / chartData.length) : 0;

  const viewport = el("allDaysChartViewport");
  const viewportWidth = (viewport ? viewport.clientWidth : container.clientWidth) || 800;

  const margin = { top: 40, right: 35, bottom: 56, left: 68 };
  const totalHeight = 350;
  const minBarSlot = metric === "payment" ? 85 : 72;
  const neededContentWidth = Math.max(viewportWidth, chartData.length * minBarSlot + margin.left + margin.right);
  const totalWidth = neededContentWidth;
  const plotWidth = totalWidth - margin.left - margin.right;
  const plotHeight = totalHeight - margin.top - margin.bottom;
  const baseY = margin.top + plotHeight;

  const isScrollable = totalWidth > (viewportWidth + 2);
  container.style.width = isScrollable ? `${totalWidth}px` : "100%";

  const svg = d3.select(container)
    .append("svg")
    .attr("width", isScrollable ? totalWidth : "100%")
    .attr("height", totalHeight)
    .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
    .style("width", isScrollable ? `${totalWidth}px` : "100%")
    .style("height", `${totalHeight}px`)
    .style("display", "block")
    .style("overflow", "visible")
    .style("font-family", "inherit");

  const defs = svg.append("defs");

  // Cyan-Blue Gradient for Revenue Bars
  const revGrad = defs.append("linearGradient")
    .attr("id", "allDaysRevGrad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  revGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8");
  revGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0284c7");

  // Amber/Gold Gradient for Peak Day Bar
  const peakGrad = defs.append("linearGradient")
    .attr("id", "allDaysPeakGrad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  peakGrad.append("stop").attr("offset", "0%").attr("stop-color", "#fbbf24");
  peakGrad.append("stop").attr("offset", "100%").attr("stop-color", "#d97706");

  // Emerald Gradient for Bills Metric
  const billGrad = defs.append("linearGradient")
    .attr("id", "allDaysBillGrad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  billGrad.append("stop").attr("offset", "0%").attr("stop-color", "#34d399");
  billGrad.append("stop").attr("offset", "100%").attr("stop-color", "#059669");

  // Purple Gradient for QR
  const qrGrad = defs.append("linearGradient")
    .attr("id", "allDaysQrGrad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  qrGrad.append("stop").attr("offset", "0%").attr("stop-color", "#c084fc");
  qrGrad.append("stop").attr("offset", "100%").attr("stop-color", "#7e22ce");

  // Cash Gradient
  const cashGrad = defs.append("linearGradient")
    .attr("id", "allDaysCashGrad")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  cashGrad.append("stop").attr("offset", "0%").attr("stop-color", "#34d399");
  cashGrad.append("stop").attr("offset", "100%").attr("stop-color", "#047857");

  // Scales
  const x = d3.scaleBand()
    .domain(chartData.map(d => d.date))
    .range([margin.left, margin.left + plotWidth])
    .padding(chartData.length === 1 ? 0.65 : (chartData.length <= 3 ? 0.46 : 0.32));

  let yMax = 1000;
  if(metric === "revenue"){
    yMax = maxRevenue > 0 ? maxRevenue * 1.25 : 1000;
  } else if(metric === "bills"){
    yMax = maxBills > 0 ? Math.ceil(maxBills * 1.3) : 10;
  } else {
    yMax = maxRevenue > 0 ? maxRevenue * 1.25 : 1000;
  }

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([baseY, margin.top]);

  // Background Grid Lines
  svg.append("g")
    .attr("stroke", "rgba(255,255,255,0.06)")
    .attr("stroke-dasharray", "3,3")
    .selectAll("line")
    .data(y.ticks(5))
    .enter()
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", margin.left + plotWidth)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d));

  // Solid Baseline
  svg.append("line")
    .attr("x1", margin.left)
    .attr("x2", margin.left + plotWidth)
    .attr("y1", baseY)
    .attr("y2", baseY)
    .attr("stroke", "rgba(255,255,255,0.12)")
    .attr("stroke-width", 1);

  // Y Axis Tick Labels
  svg.append("g")
    .selectAll("text")
    .data(y.ticks(5))
    .enter()
    .append("text")
    .attr("x", margin.left - 12)
    .attr("y", d => y(d) + 4)
    .attr("text-anchor", "end")
    .attr("fill", "#64748b")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .text(d => metric === "bills" ? `${d} บิล` : (d >= 1000 ? `฿${(d/1000).toFixed(1).replace('.0','')}k` : `฿${d}`));

  // Average Reference Line
  const refVal = metric === "bills" ? avgBills : avgRevenue;
  if(refVal > 0){
    const avgY = y(refVal);
    svg.append("line")
      .attr("x1", margin.left)
      .attr("x2", margin.left + plotWidth)
      .attr("y1", avgY)
      .attr("y2", avgY)
      .attr("stroke", "#f59e0b")
      .attr("stroke-dasharray", "5,4")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.75);

    svg.append("text")
      .attr("x", margin.left + plotWidth)
      .attr("y", avgY - 6)
      .attr("text-anchor", "end")
      .attr("fill", "#fbbf24")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .text(metric === "bills" ? `เฉลี่ย ${Math.round(avgBills)} บิล/วัน` : `เฉลี่ย ฿${money(avgRevenue)}/วัน`);
  }

  // Create Tooltip Element (ensure single instance)
  let tooltip = d3.select(container).select(".d3-daily-tooltip");
  if(tooltip.empty()){
    tooltip = d3.select(container).append("div").attr("class", "d3-daily-tooltip").style("opacity", 0);
  }

  // Draw Bars
  if(metric === "payment"){
    chartData.forEach(d => {
      const barX = x(d.date);
      const barW = Math.min(x.bandwidth(), 90);
      const centeredX = barX + (x.bandwidth() - barW) / 2;
      const isPeak = d.date === peakDay.date;

      const cashY = y(d.cash);
      const cashH = Math.max(0, baseY - cashY);

      const totalY = y(d.total);
      const qrH = Math.max(0, cashY - totalY);

      if(d.cash > 0){
        svg.append("rect")
          .attr("x", centeredX)
          .attr("y", cashY)
          .attr("width", barW)
          .attr("height", cashH)
          .attr("rx", d.qr > 0 ? 0 : 6)
          .attr("fill", "url(#allDaysCashGrad)")
          .attr("opacity", 0.9);
      }

      if(d.qr > 0){
        svg.append("rect")
          .attr("x", centeredX)
          .attr("y", totalY)
          .attr("width", barW)
          .attr("height", qrH)
          .attr("rx", 6)
          .attr("fill", "url(#allDaysQrGrad)")
          .attr("opacity", 0.95);
      }

      if(d.total > 0){
        svg.append("text")
          .attr("x", centeredX + barW / 2)
          .attr("y", totalY - 8)
          .attr("text-anchor", "middle")
          .attr("fill", isPeak ? "#fbbf24" : "#e2e8f0")
          .attr("font-size", "11px")
          .attr("font-weight", isPeak ? "800" : "700")
          .text(d.total >= 1000 ? `฿${(d.total/1000).toFixed(1).replace('.0','')}k` : `฿${d.total}`);
      }

      if(isPeak && d.total > 0){
        svg.append("text")
          .attr("x", centeredX + barW / 2)
          .attr("y", totalY - 23)
          .attr("text-anchor", "middle")
          .attr("font-size", "13px")
          .text("🏆");
      }

      svg.append("rect")
        .attr("x", centeredX - 4)
        .attr("y", margin.top)
        .attr("width", barW + 8)
        .attr("height", plotHeight + 10)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseenter", (event) => {
          showTooltip(d, event);
        })
        .on("mousemove", (event) => {
          showTooltip(d, event);
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", 0);
        });
    });

  } else {
    // Single Metric Bar (Revenue or Bills)
    chartData.forEach(d => {
      const val = metric === "bills" ? d.bills : d.total;
      const barX = x(d.date);
      const barW = Math.min(x.bandwidth(), 90);
      const centeredX = barX + (x.bandwidth() - barW) / 2;
      const isPeak = d.date === peakDay.date;
      const posY = y(val);
      const barH = Math.max(0, baseY - posY);

      svg.append("rect")
        .attr("class", "day-bar")
        .attr("x", centeredX)
        .attr("width", barW)
        .attr("y", posY)
        .attr("height", barH)
        .attr("rx", 6)
        .attr("fill", () => {
          if(isPeak && d.total > 0) return "url(#allDaysPeakGrad)";
          return metric === "bills" ? "url(#allDaysBillGrad)" : "url(#allDaysRevGrad)";
        })
        .style("cursor", "pointer")
        .style("transition", "filter 0.18s ease")
        .on("mouseenter", function(event){
          d3.select(this).style("filter", "brightness(1.25)");
          showTooltip(d, event);
        })
        .on("mousemove", function(event){
          showTooltip(d, event);
        })
        .on("mouseleave", function(){
          d3.select(this).style("filter", "none");
          tooltip.style("opacity", 0);
        });

      if(val > 0){
        svg.append("text")
          .attr("x", centeredX + barW / 2)
          .attr("y", posY - 8)
          .attr("text-anchor", "middle")
          .attr("fill", isPeak ? "#fbbf24" : "#f1f5f9")
          .attr("font-size", "11px")
          .attr("font-weight", isPeak ? "800" : "700")
          .text(metric === "bills" ? `${val}` : (val >= 1000 ? `฿${(val/1000).toFixed(1).replace('.0','')}k` : `฿${val}`));

        if(isPeak && d.total > 0){
          svg.append("text")
            .attr("x", centeredX + barW / 2)
            .attr("y", posY - 23)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .text("🏆");
        }
      }
    });
  }

  // X Axis Date Labels (Day & Date)
  const xLabels = svg.append("g")
    .selectAll(".x-label-group")
    .data(chartData)
    .enter()
    .append("g")
    .attr("class", "x-label-group")
    .attr("transform", d => `translate(${x(d.date) + x.bandwidth()/2}, ${baseY + 18})`);

  xLabels.append("text")
    .attr("text-anchor", "middle")
    .attr("fill", d => d.date === peakDay.date ? "#fbbf24" : "#cbd5e1")
    .attr("font-size", "11.5px")
    .attr("font-weight", d => d.date === peakDay.date ? "800" : "600")
    .text(d => formatThaiDateShort(d.date));

  xLabels.append("text")
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("fill", "#64748b")
    .attr("font-size", "10px")
    .text(d => `${d.bills} บิล`);

  function showTooltip(d, event){
    const avgTicket = d.bills > 0 ? (d.total / d.bills) : 0;
    const isPeak = d.date === peakDay.date;
    const cRect = container.getBoundingClientRect();
    const mouseX = event.clientX - cRect.left;
    const mouseY = event.clientY - cRect.top;

    tooltip
      .html(`
        <div class="tt-date">
          <span>📅 ${formatThaiDateStr(d.date)}</span>
          ${isPeak ? '<span style="color:#fbbf24; font-size:11px;">🏆 ยอดสูงสุด</span>' : ''}
        </div>
        <div class="tt-row highlight">
          <span>ยอดขายสุทธิ:</span>
          <strong>฿${money(d.total)}</strong>
        </div>
        <div class="tt-row">
          <span>จำนวนการขาย:</span>
          <strong>${d.bills} บิล</strong>
        </div>
        <div class="tt-row">
          <span>เฉลี่ยต่อบิล:</span>
          <strong>฿${money(avgTicket)}</strong>
        </div>
        <div class="tt-row" style="margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.08);">
          <span>💵 เงินสด:</span>
          <strong style="color:#34d399;">฿${money(d.cash)} (${d.cashBills} บิล)</strong>
        </div>
        <div class="tt-row">
          <span>📱 QR PromptPay:</span>
          <strong style="color:#c084fc;">฿${money(d.qr)} (${d.qrBills} บิล)</strong>
        </div>
      `)
      .style("left", `${Math.max(80, Math.min(mouseX, totalWidth - 80))}px`)
      .style("top", `${Math.max(10, mouseY - 10)}px`)
      .style("opacity", 1);
  }
}

function setStockFilter(f){
  state.stockFilter = f;
  state.stockPage = 1;
  renderStock();
}

function setStockViewMode(m){
  state.stockViewMode = m;
  localStorage.setItem("ea_stock_view", m);
  renderStock();
}

function onStockSearch(v){
  state.stockSearch = v;
  state.stockPage = 1;
  renderStock();
  const inp = el("stockSearchInput");
  if(inp){
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  }
}

function clearStockSearch(){
  state.stockSearch = "";
  state.stockPage = 1;
  renderStock();
}

function setStockSort(sortBy){
  state.stockSortBy = sortBy;
  state.stockPage = 1;
  renderStock();
}

function toggleStockTableSort(columnKey){
  if(columnKey === "name"){
    state.stockSortBy = state.stockSortBy === "name_asc" ? "name_desc" : "name_asc";
  } else if(columnKey === "stock"){
    state.stockSortBy = state.stockSortBy === "stock_asc" ? "stock_desc" : "stock_asc";
  } else if(columnKey === "price"){
    state.stockSortBy = state.stockSortBy === "price_asc" ? "price_desc" : "price_asc";
  } else if(columnKey === "code"){
    state.stockSortBy = state.stockSortBy === "code_asc" ? "code_desc" : "code_asc";
  }
  renderStock();
}

function setStockPage(pageNum){
  state.stockPage = pageNum;
  renderStock();
  const topAnchor = el("stockTopControls");
  if(topAnchor){
    topAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setStockPageSize(size){
  const num = size === "all" ? 999999 : Number(size);
  state.stockPageSize = num;
  state.stockPage = 1;
  localStorage.setItem("ea_stock_page_size", String(num));
  renderStock();
}

function sortStockList(products, sortBy){
  const list = [...products];
  list.sort((a, b) => {
    switch(sortBy){
      case "name_asc":
        return (a.product_name || "").localeCompare(b.product_name || "", "th");
      case "name_desc":
        return (b.product_name || "").localeCompare(a.product_name || "", "th");
      case "stock_asc":
        return Number(a.stock_qty || 0) - Number(b.stock_qty || 0);
      case "stock_desc":
        return Number(b.stock_qty || 0) - Number(a.stock_qty || 0);
      case "price_asc":
        return Number(a.sale_price || 0) - Number(b.sale_price || 0);
      case "price_desc":
        return Number(b.sale_price || 0) - Number(a.sale_price || 0);
      case "code_asc":
        return (a.product_code || "").localeCompare(b.product_code || "");
      case "code_desc":
        return (b.product_code || "").localeCompare(a.product_code || "");
      default:
        return 0;
    }
  });
  return list;
}

function getSortIndicator(columnKey){
  if(columnKey === "name"){
    if(state.stockSortBy === "name_asc") return '<span class="sort-icon">▲</span>';
    if(state.stockSortBy === "name_desc") return '<span class="sort-icon">▼</span>';
  } else if(columnKey === "stock"){
    if(state.stockSortBy === "stock_asc") return '<span class="sort-icon">▲</span>';
    if(state.stockSortBy === "stock_desc") return '<span class="sort-icon">▼</span>';
  } else if(columnKey === "price"){
    if(state.stockSortBy === "price_asc") return '<span class="sort-icon">▲</span>';
    if(state.stockSortBy === "price_desc") return '<span class="sort-icon">▼</span>';
  } else if(columnKey === "code"){
    if(state.stockSortBy === "code_asc") return '<span class="sort-icon">▲</span>';
    if(state.stockSortBy === "code_desc") return '<span class="sort-icon">▼</span>';
  }
  return '<span class="sort-icon" style="opacity:0.25;">⇅</span>';
}

function renderStockCardItem(p){
  const qtyNum = Number(p.stock_qty);
  const minNum = Number(p.min_stock);
  const qtyColor = qtyNum <= 0 ? '#f87171' : qtyNum <= minNum ? '#fbbf24' : '#34d399';
  const qtyLabel = qtyNum <= 0 ? 'หมดสต็อก' : qtyNum <= minNum ? 'ใกล้หมด' : 'คงเหลือ';
  const unitStr = p.unit || "ชิ้น";
  const refill = calculateAutoSuggestRefill(p, { targetDays: 14 });

  return `
    <div class="stock-item-card">
      <div class="stock-item-top">
        <div class="stock-item-title-wrap" style="cursor:pointer;" onclick="openStockDetailModal('${p.id}')" title="คลิกเพื่อดูรายละเอียดสต็อก & แนะนำสั่งเติมอัตโนมัติ">
          <div class="stock-item-name" style="transition:color 0.15s;">${escapeHtml(p.product_name)}</div>
          <div class="stock-item-meta">
            <span class="stock-code-chip">${escapeHtml(p.product_code)}</span>
            ${p.barcode ? `<span class="barcode-value" style="cursor:pointer;" onclick="event.stopPropagation(); openBarcodePrintModal('${p.id}')" title="คลิกเพื่อพิมพ์บาร์โค้ดสินค้านี้ 🖨️">${escapeHtml(p.barcode)} 🖨️</span>` : ''}
          </div>
        </div>
        <div class="stock-item-status-wrap">
          ${statusForProduct(p)}
        </div>
      </div>

      <div class="stock-item-bottom">
        <div class="stock-item-price-qty">
          <div class="stock-item-price">
            ฿${money(p.sale_price)}
            <small style="color:#94a3b8; font-size:11px; font-weight:normal;">/ ${escapeHtml(unitStr)}</small>
          </div>
          <div class="stock-item-qty" style="color:${qtyColor};">
            <small style="color:#94a3b8; font-size:11px;">${qtyLabel}:</small>
            <strong style="font-size:16px;">${p.stock_qty}</strong>
            <span style="font-size:12px; color:#94a3b8; font-weight:600; margin-left:2px;">${escapeHtml(unitStr)}</span>
          </div>
        </div>
        <div class="stock-item-actions">
          <button class="mini-btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1px solid #2dd4bf; font-weight:800;" onclick="openBarcodePrintModal('${p.id}')" title="พิมพ์ฉลากบาร์โค้ดสำหรับสินค้านี้ (${p.stock_qty || 0} ชิ้น)">
            🖨️ บาร์โค้ด (${p.stock_qty || 0})
          </button>
          <button class="mini-btn info" style="background:#0284c7; color:#ffffff; font-weight:700; border-color:#38bdf8;" onclick="openStockDetailModal('${p.id}')" title="ดูรายละเอียดสต็อกและความเร็วการขาย พร้อมระบบแนะนำสั่งเติมอัตโนมัติ">
            💡 แนะนำเติม ${refill && refill.suggestedQty > 0 ? `(+${refill.suggestedQty})` : ''}
          </button>
          <button class="mini-btn receive" onclick="quickReceive('${p.id}')">+ รับเข้า</button>
          <button class="mini-btn edit" onclick="editProduct('${p.id}')">แก้ไข</button>
        </div>
      </div>
    </div>
  `;
}

function renderStockTableRow(p){
  const qtyNum = Number(p.stock_qty);
  const minNum = Number(p.min_stock);
  const qtyColor = qtyNum <= 0 ? '#f87171' : qtyNum <= minNum ? '#fbbf24' : '#34d399';
  const unitStr = p.unit || "ชิ้น";
  const refill = calculateAutoSuggestRefill(p, { targetDays: 14 });

  return `
    <tr>
      <td class="col-code"><span style="color:#94a3b8; font-weight:700; font-family:monospace; font-size:12px;">${escapeHtml(p.product_code)}</span></td>
      <td class="col-barcode">
        <a href="javascript:void(0)" onclick="openBarcodePrintModal('${p.id}')" class="barcode-value" style="display:inline-flex; align-items:center; gap:4px; text-decoration:none; cursor:pointer; background:#1e293b; color:#38bdf8; border:1px solid #334155; padding:2px 7px; border-radius:6px; font-size:11.5px; font-family:monospace;" title="คลิกเพื่อพิมพ์บาร์โค้ดสินค้านี้ 🖨️">
          ${escapeHtml(p.barcode||"-")} <span style="font-size:10px; opacity:0.85;">🖨️</span>
        </a>
      </td>
      <td class="col-name">
        <a href="javascript:void(0)" onclick="openStockDetailModal('${p.id}')" style="color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; display:inline-block;" title="คลิกดูรายละเอียดสต็อก & แนะนำสั่งเติมอัตโนมัติ">
          ${escapeHtml(p.product_name)}
        </a>
      </td>
      <td class="col-price"><strong style="color:#4ade80; font-size:14px; font-weight:900;">฿${money(p.sale_price)}</strong> <small style="color:#94a3b8; font-size:11px; font-weight:normal;">/ ${escapeHtml(unitStr)}</small></td>
      <td class="col-qty"><strong style="font-size:15px; color:${qtyColor}; font-weight:900;">${p.stock_qty}</strong> <span style="font-size:12px; color:#cbd5e1; font-weight:600; margin-left:3px;">${escapeHtml(unitStr)}</span></td>
      <td class="col-status">${statusForProduct(p)}</td>
      <td class="col-actions">
        <button class="mini-btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1px solid #2dd4bf; font-weight:800;" onclick="openBarcodePrintModal('${p.id}')" title="พิมพ์ฉลากบาร์โค้ดสำหรับสินค้านี้ (${p.stock_qty || 0} ชิ้น)">
          🖨️ บาร์โค้ด
        </button>
        <button class="mini-btn info" style="background:#0284c7; color:#ffffff; font-weight:700; border-color:#38bdf8;" onclick="openStockDetailModal('${p.id}')" title="ดูรายละเอียดสต็อกและคำนวณสั่งเติมอัตโนมัติ">
          💡 แนะนำเติม ${refill && refill.suggestedQty > 0 ? `(+${refill.suggestedQty})` : ''}
        </button>
        <button class="mini-btn receive" onclick="quickReceive('${p.id}')">+ รับเข้า</button>
        <button class="mini-btn edit" onclick="editProduct('${p.id}')">แก้ไข</button>
      </td>
    </tr>
  `;
}

function renderStockPagination(totalItems, page, pageSize){
  if(totalItems <= 0) return "";
  const isAll = pageSize >= 999999;
  const effectivePageSize = isAll ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const startIdx = (currentPage - 1) * effectivePageSize + 1;
  const endIdx = Math.min(currentPage * effectivePageSize, totalItems);

  // Generate page numbers window (e.g. 1 ... 4 5 6 ... 10)
  const pageNumbers = [];
  if(totalPages <= 7){
    for(let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if(currentPage > 3) pageNumbers.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for(let i = start; i <= end; i++) pageNumbers.push(i);
    if(currentPage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return `
    <div class="stock-pagination-bar">
      <div class="stock-pagination-info">
        <span>แสดง <strong>${startIdx}-${endIdx}</strong> จากทั้งหมด <strong>${totalItems}</strong> รายการ</span>
        <div class="stock-pagesize-wrap" style="display:inline-flex; align-items:center; gap:6px; margin-left:8px;">
          <span style="font-size:11.5px; color:#64748b;">ต่อหน้า:</span>
          <select class="stock-pagesize-select" onchange="setStockPageSize(this.value)">
            <option value="15" ${pageSize===15?'selected':''}>15</option>
            <option value="30" ${pageSize===30?'selected':''}>30</option>
            <option value="50" ${pageSize===50?'selected':''}>50</option>
            <option value="100" ${pageSize===100?'selected':''}>100</option>
            <option value="all" ${isAll?'selected':''}>ทั้งหมด</option>
          </select>
        </div>
      </div>

      ${totalPages > 1 && !isAll ? `
        <div class="stock-pagination-controls">
          <button class="stock-page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="setStockPage(1)" title="หน้าแรก">«</button>
          <button class="stock-page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="setStockPage(${currentPage - 1})" title="ก่อนหน้า">‹</button>
          
          ${pageNumbers.map(p => {
            if(p === "...") {
              return `<span style="color:#64748b; padding:0 4px; font-size:12px;">...</span>`;
            }
            return `<button class="stock-page-btn ${p === currentPage ? 'active' : ''}" onclick="setStockPage(${p})">${p}</button>`;
          }).join("")}

          <button class="stock-page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="setStockPage(${currentPage + 1})" title="ถัดไป">›</button>
          <button class="stock-page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="setStockPage(${totalPages})" title="หน้าสุดท้าย">»</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderStock(){
  setHeader("สต็อกสินค้า","จัดการ Barcode ราคา และระดับคงเหลือสินค้า");
  const q=(state.stockSearch || el("searchInput")?.value || "").trim().toLowerCase();

  const totalCount = state.products.length;
  const inStockCount = state.products.filter(p => Number(p.stock_qty) > 0).length;
  const okCount = state.products.filter(p => Number(p.stock_qty) > Number(p.min_stock)).length;
  const lowCount = state.products.filter(p => Number(p.stock_qty) > 0 && Number(p.stock_qty) <= Number(p.min_stock)).length;
  const outCount = state.products.filter(p => Number(p.stock_qty) <= 0).length;

  const filtered = state.products.filter(p => {
    if(state.stockFilter === "in_stock" && !(Number(p.stock_qty) > 0)) return false;
    if(state.stockFilter === "ok" && !(Number(p.stock_qty) > Number(p.min_stock))) return false;
    if(state.stockFilter === "low" && !(Number(p.stock_qty) > 0 && Number(p.stock_qty) <= Number(p.min_stock))) return false;
    if(state.stockFilter === "out" && !(Number(p.stock_qty) <= 0)) return false;

    if(!q) return true;
    return (p.product_name || "").toLowerCase().includes(q) ||
           (p.product_code || "").toLowerCase().includes(q) ||
           String(p.barcode || "").includes(q);
  });

  const sorted = sortStockList(filtered, state.stockSortBy);

  // Pagination calculations
  const totalItems = sorted.length;
  const pageSize = state.stockPageSize || 20;
  const effectivePageSize = pageSize >= 999999 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  state.stockPage = Math.max(1, Math.min(state.stockPage, totalPages));
  
  const startIdx = (state.stockPage - 1) * effectivePageSize;
  const endIdx = startIdx + effectivePageSize;
  const pageItems = sorted.slice(startIdx, endIdx);

  const emptyMsg = `<div class="empty" style="padding:40px 16px; text-align:center; color:#94a3b8;">ไม่พบสินค้าที่ตรงกับเงื่อนไข</div>`;

  const tableRowsHtml = pageItems.length 
    ? pageItems.map(renderStockTableRow).join("") 
    : `<tr><td colspan="7" class="empty">ไม่พบสินค้าในหมวดนี้</td></tr>`;

  const tableHtml = `
    <div class="table-wrap">
      <table class="stock-table">
        <thead>
          <tr>
            <th class="col-code sortable" onclick="toggleStockTableSort('code')" title="คลิกเพื่อเรียงตามรหัส">รหัส ${getSortIndicator('code')}</th>
            <th class="col-barcode">Barcode</th>
            <th class="col-name sortable" onclick="toggleStockTableSort('name')" title="คลิกเพื่อเรียงตามชื่อสินค้า">สินค้า ${getSortIndicator('name')}</th>
            <th class="col-price sortable" onclick="toggleStockTableSort('price')" title="คลิกเพื่อเรียงตามราคา">ราคา ${getSortIndicator('price')}</th>
            <th class="col-qty sortable" onclick="toggleStockTableSort('stock')" title="คลิกเพื่อเรียงตามสต็อกคงเหลือ">คงเหลือ ${getSortIndicator('stock')}</th>
            <th class="col-status">สถานะ</th>
            <th class="col-actions">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  const cardsHtml = `
    <div class="stock-cards-grid">
      ${pageItems.length ? pageItems.map(renderStockCardItem).join("") : emptyMsg}
    </div>
  `;

  const paginationHtml = renderStockPagination(totalItems, state.stockPage, state.stockPageSize);

  const viewMode = state.stockViewMode;
  let listHtml = "";
  if (viewMode === "cards") {
    listHtml = `${cardsHtml} ${paginationHtml}`;
  } else if (viewMode === "table") {
    listHtml = `${tableHtml} ${paginationHtml}`;
  } else {
    // auto: cards on mobile (<768px), table on desktop (>=769px)
    listHtml = `
      <div class="stock-desktop-table">${tableHtml}</div>
      <div class="stock-mobile-cards">${cardsHtml}</div>
      ${paginationHtml}
    `;
  }

  const topControls = `
    <div id="stockTopControls" class="stock-top-controls">
      <div class="stock-search-wrap" style="position:relative;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stock-search-icon">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input id="stockSearchInput" type="text" class="stock-search-input" placeholder="ค้นหาชื่อสินค้า, รหัส, Barcode..." value="${escapeHtml(state.stockSearch)}" oninput="onStockSearch(this.value)" style="padding-right:${state.stockSearch ? '110px' : '90px'};">
        ${state.stockSearch ? `<button class="stock-search-clear" style="right:86px;" onclick="clearStockSearch()" title="ล้างการค้นหา">✕</button>` : ''}
        <button type="button" class="stock-search-camera-btn" onclick="startScanner()" title="เปิดกล้องสแกน Barcode ค้นหาสินค้า">📷 สแกนกล้อง</button>
      </div>

      <div class="stock-bar-row">
        <div class="stock-filter-tabs" role="group" aria-label="ตัวกรองระดับสต็อก">
          <button type="button" class="stock-filter-btn ${state.stockFilter==='all'?'active':''}" onclick="setStockFilter('all')" title="แสดงสินค้าทั้งหมด">
            📦 ทั้งหมด / All (${totalCount})
          </button>
          <button type="button" class="stock-filter-btn ${state.stockFilter==='in_stock'||state.stockFilter==='ok'?'active':''}" onclick="setStockFilter('in_stock')" title="แสดงสินค้าที่มีในสต็อก">
            ✅ In Stock (${inStockCount})
          </button>
          <button type="button" class="stock-filter-btn ${state.stockFilter==='low'?'active':''}" onclick="setStockFilter('low')" title="แสดงสินค้าที่สต็อกใกล้หมด">
            ⚠️ Low Stock (${lowCount})
          </button>
          <button type="button" class="stock-filter-btn ${state.stockFilter==='out'?'active':''}" onclick="setStockFilter('out')" title="แสดงสินค้าที่หมดสต็อก">
            ❌ Out of Stock (${outCount})
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <div class="stock-sort-wrap">
            <span class="stock-sort-label">เรียงตาม:</span>
            <select class="stock-sort-select" onchange="setStockSort(this.value)">
              <option value="name_asc" ${state.stockSortBy==='name_asc'?'selected':''}>ชื่อ ก-ฮ</option>
              <option value="name_desc" ${state.stockSortBy==='name_desc'?'selected':''}>ชื่อ ฮ-ก</option>
              <option value="stock_asc" ${state.stockSortBy==='stock_asc'?'selected':''}>สต็อก (น้อยไปมาก)</option>
              <option value="stock_desc" ${state.stockSortBy==='stock_desc'?'selected':''}>สต็อก (มากไปน้อย)</option>
              <option value="price_asc" ${state.stockSortBy==='price_asc'?'selected':''}>ราคา (ต่ำไปสูง)</option>
              <option value="price_desc" ${state.stockSortBy==='price_desc'?'selected':''}>ราคา (สูงไปต่ำ)</option>
              <option value="code_asc" ${state.stockSortBy==='code_asc'?'selected':''}>รหัสสินค้า (A-Z)</option>
            </select>
          </div>

          <div class="stock-view-switcher">
            <button class="view-switch-btn ${state.stockViewMode==='auto'?'active':''}" onclick="setStockViewMode('auto')" title="อัตโนมัติตามขนาดจอ">
              Auto
            </button>
            <button class="view-switch-btn ${state.stockViewMode==='cards'?'active':''}" onclick="setStockViewMode('cards')" title="แสดงแบบการ์ด">
              ⊞ การ์ด
            </button>
            <button class="view-switch-btn ${state.stockViewMode==='table'?'active':''}" onclick="setStockViewMode('table')" title="แสดงแบบตาราง">
              ☰ ตาราง
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  el("content").innerHTML=`
    ${connectionNotice()}
    ${topControls}
    <div id="stockDataViewContainer">
      ${card(`รายการสินค้า (${totalItems} รายการ)`, listHtml, `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn" onclick="openBarcodePrintModal(null, 'batch')" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1.5px solid #2dd4bf; font-weight:800;" title="พิมพ์ฉลากบาร์โค้ดสินค้าในสต็อกทั้งหมด (ตามจำนวนคงเหลือจริงหรือ 1 ดวง/รายการ)">
            🖨️ พิมพ์บาร์โค้ดสต็อก (Batch & คลัง)
          </button>
          <button type="button" class="btn" onclick="openBarcodePrintModal()" style="display:inline-flex; align-items:center; gap:6px; background:#1e293b; color:#e2e8f0; border:1px solid #475569; font-weight:700;" title="เลือกสินค้าและพิมพ์บาร์โค้ดรายชิ้น">
            🏷️ พิมพ์บาร์โค้ดเดี่ยว
          </button>
          <button type="button" class="btn btn-info" onclick="openStockAuditModal()" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#fff; border-color:#38bdf8; font-weight:700;" title="เปิดระบบตรวจนับสต็อกจริงและปรับปรุงยอดคงเหลืออัตโนมัติ">
            🔍 ตรวจนับสต็อก (Stock Audit)
          </button>
          ${(lowCount + outCount) > 0 ? `<button type="button" class="btn btn-warning" onclick="go('lowStock')" title="มีสินค้าต่ำกว่าเกณฑ์ขั้นต่ำ ${(lowCount + outCount)} รายการ">📋 ใบสั่งเติมสต็อก (${lowCount + outCount})</button>` : ''}
          <button type="button" class="btn btn-primary" onclick="openProductModal()">${G_ICONS.plus} เพิ่มสินค้า</button>
        </div>
      `)}
    </div>
  `;
}
function closeProductModal(){
  const m=el("modal");
  if(m?.open) m.close();
}

// -------------------------------------------------------------
// Auto-Suggest Refill & Stock Details Analytics
// -------------------------------------------------------------
function calculateAutoSuggestRefill(productOrId, options = {}) {
  const p = typeof productOrId === "object" && productOrId !== null ? productOrId : productById(productOrId);
  if (!p) return null;

  const currentStock = Math.max(0, Number(p.stock_qty || 0));
  const minStock = Math.max(1, Number(p.min_stock || state.settings.lowStockDefault || 5));
  const targetDays = Number(options.targetDays || 14);
  const leadTimeDays = Number(options.leadTimeDays || 3);
  const unitStr = p.unit || "ชิ้น";
  const unitPrice = Number(p.sale_price || 0);

  const velocity = calculate30DaySalesVelocity(p.id, currentStock);
  const dailyRate = velocity.dailyBurnRate || 0;
  const totalSold30D = velocity.totalSold30D || 0;

  // Demand calculations based on sales velocity
  const leadTimeDemand = Math.ceil(dailyRate * leadTimeDays);
  const cycleDemand = Math.ceil(dailyRate * targetDays);
  const safetyStock = minStock;

  // Total target stock needed to cover (Cycle + Lead Time + Safety Stock)
  const targetMaxStock = Math.max(minStock * 2, Math.ceil(cycleDemand + leadTimeDemand + safetyStock));
  
  let suggestedQty = 0;
  if (dailyRate > 0) {
    suggestedQty = Math.max(0, Math.ceil(targetMaxStock - currentStock));
    if (currentStock <= minStock && suggestedQty === 0) {
      suggestedQty = Math.max(1, minStock - currentStock + 5);
    }
  } else {
    // If no recent sales in 30 days, base suggestion on minimum threshold
    if (currentStock <= minStock) {
      suggestedQty = Math.max(1, (minStock * 2) - currentStock, 5);
    } else {
      suggestedQty = 0;
    }
  }

  const daysRemaining = dailyRate > 0 ? (currentStock / dailyRate) : (currentStock <= 0 ? 0 : 9999);
  const roundedDays = daysRemaining < 9999 ? Math.ceil(daysRemaining) : null;

  let urgency = {
    level: "healthy",
    label: "สต็อกเพียงพอ ✅",
    badgeClass: "badge-ok",
    color: "#34d399",
    desc: "ระดับสต็อกอยู่ในเกณฑ์ปกติ ไม่จำเป็นต้องสั่งเติมเร่งด่วน"
  };

  if (currentStock <= 0) {
    urgency = {
      level: "critical",
      label: "🚨 หมดสต็อกแล้ว (0 วัน)",
      badgeClass: "badge-out",
      color: "#f87171",
      desc: "สินค้าหมดสต็อกแล้ว แนะนำสั่งเติมทันทีเพื่อป้องกันการเสียโอกาสการขาย"
    };
  } else if (currentStock <= minStock || (roundedDays !== null && roundedDays <= 3)) {
    urgency = {
      level: "warning",
      label: `⚠️ สต็อกใกล้หมด (${roundedDays !== null ? roundedDays + ' วัน' : 'ต่ำกว่าเกณฑ์'})`,
      badgeClass: "badge-low",
      color: "#fbbf24",
      desc: "สต็อกต่ำกว่าจุดสั่งซื้อขั้นต่ำ ควรเร่งสั่งซื้อเติมสต็อกโดยเร็ว"
    };
  } else if (roundedDays !== null && roundedDays <= 7) {
    urgency = {
      level: "moderate",
      label: `⚡ เตือนสั่งซื้อล่วงหน้า (${roundedDays} วัน)`,
      badgeClass: "badge-low",
      color: "#38bdf8",
      desc: "สต็อกคาดว่าจะหมดในอีกไม่เกิน 7 วัน ควรวางแผนสั่งซื้อล่วงหน้า"
    };
  }

  const estimatedValue = suggestedQty * unitPrice;

  return {
    product: p,
    currentStock,
    minStock,
    unitStr,
    unitPrice,
    velocity,
    dailyRate,
    totalSold30D,
    daysRemaining,
    roundedDays,
    targetDays,
    leadTimeDays,
    leadTimeDemand,
    cycleDemand,
    safetyStock,
    targetMaxStock,
    suggestedQty,
    estimatedValue,
    urgency
  };
}

function openStockDetailModal(productId, targetDays = 14, leadTimeDays = 3){
  const prod = productById(productId);
  if(!prod){
    toast("ไม่พบข้อมูลสินค้า");
    return;
  }

  let dialog = el("stockDetailDialog");
  if(!dialog){
    dialog = document.createElement("dialog");
    dialog.id = "stockDetailDialog";
    dialog.className = "app-dialog modal-dialog";
    document.body.appendChild(dialog);
  }

  const refill = calculateAutoSuggestRefill(prod, { targetDays, leadTimeDays });
  if(!refill) return;

  const titleEl = el("stockDetailTitle");
  const subEl = el("stockDetailSubtitle");
  if(titleEl) titleEl.textContent = `รายละเอียดสต็อก: ${prod.product_name}`;
  if(subEl) subEl.textContent = `รหัส ${prod.product_code || '-'} • Barcode: ${prod.barcode || '-'} • แนะนำเติมตามความเร็วการขาย`;

  // Get recent movements for this product
  const movements = (state.movements || [])
    .filter(m => m.product_id === prod.id)
    .slice(0, 6);

  const bodyEl = el("stockDetailBody") || dialog.querySelector(".modal-body");
  
  const contentHtml = `
    <div class="stock-detail-prod-banner">
      <div class="stock-detail-prod-info">
        <h4>${escapeHtml(prod.product_name)}</h4>
        <div class="stock-detail-tags">
          <span class="stock-tag-chip">รหัส: ${escapeHtml(prod.product_code || '-')}</span>
          ${prod.barcode ? `<span class="stock-tag-chip" style="cursor:pointer; background:rgba(45,212,191,0.15); color:#2dd4bf; border-color:#2dd4bf;" onclick="closeStockDetailModal(); openBarcodePrintModal('${prod.id}')" title="คลิกเพื่อเปิดพิมพ์บาร์โค้ดสินค้านี้">Barcode: ${escapeHtml(prod.barcode)} 🖨️</span>` : ''}
          <span class="stock-tag-chip">ราคา: ฿${money(prod.sale_price)} / ${escapeHtml(refill.unitStr)}</span>
          <button type="button" class="mini-btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1px solid #2dd4bf; font-weight:800; padding:3px 10px; font-size:11.5px;" onclick="closeStockDetailModal(); openBarcodePrintModal('${prod.id}')" title="พิมพ์ฉลากบาร์โค้ดสำหรับสินค้านี้">
            🖨️ พิมพ์บาร์โค้ด (${prod.stock_qty || 0} ชิ้น)
          </button>
        </div>
      </div>
      <div style="text-align:right;">
        <span class="badge ${refill.urgency.badgeClass}" style="font-size:12px; font-weight:800; padding:6px 12px; border-radius:8px;">
          ${refill.urgency.label}
        </span>
        <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${escapeHtml(refill.urgency.desc)}</div>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="stock-detail-kpi-grid">
      <div class="stock-detail-kpi-card">
        <div class="kpi-lbl">📦 สต็อกคงเหลือ</div>
        <div class="kpi-val" style="color:${refill.currentStock <= 0 ? '#f87171' : refill.currentStock <= refill.minStock ? '#fbbf24' : '#34d399'};">
          ${refill.currentStock} <small style="font-size:12px; font-weight:normal; color:#94a3b8;">${escapeHtml(refill.unitStr)}</small>
        </div>
        <div class="kpi-sub">จุดขั้นต่ำ: ${refill.minStock} ${escapeHtml(refill.unitStr)}</div>
      </div>

      <div class="stock-detail-kpi-card">
        <div class="kpi-lbl">⚡ อัตราขายเฉลี่ย (30 วัน)</div>
        <div class="kpi-val" style="color:#38bdf8;">
          ${refill.dailyRate.toFixed(2)} <small style="font-size:12px; font-weight:normal; color:#94a3b8;">${escapeHtml(refill.unitStr)}/วัน</small>
        </div>
        <div class="kpi-sub">ยอดขาย 30 วัน: ${refill.totalSold30D} ${escapeHtml(refill.unitStr)}</div>
      </div>

      <div class="stock-detail-kpi-card">
        <div class="kpi-lbl">⏳ สต็อกอยู่ได้อีก</div>
        <div class="kpi-val" style="color:${refill.roundedDays !== null && refill.roundedDays <= 3 ? '#f87171' : refill.roundedDays !== null && refill.roundedDays <= 7 ? '#fbbf24' : '#a78bfa'};">
          ${refill.roundedDays !== null ? `${refill.roundedDays} วัน` : 'ไม่มียอดขาย'}
        </div>
        <div class="kpi-sub">Burn Rate: ${refill.dailyRate.toFixed(1)}/วัน</div>
      </div>

      <div class="stock-detail-kpi-card highlight">
        <div class="kpi-lbl" style="color:#38bdf8;">💡 แนะนำสั่งเติม (Refill)</div>
        <div class="kpi-val" style="color:#38bdf8; font-size:20px;">
          +${refill.suggestedQty} <small style="font-size:13px; font-weight:bold; color:#cbd5e1;">${escapeHtml(refill.unitStr)}</small>
        </div>
        <div class="kpi-sub">มูลค่า ~฿${money(refill.estimatedValue)}</div>
      </div>
    </div>

    <!-- Auto-Suggest Refill Configuration Box -->
    <div class="auto-refill-panel">
      <div class="auto-refill-header">
        <div class="auto-refill-title">
          <span>🧠</span>
          <span>ระบบคำนวณสั่งเติมอัตโนมัติ (Auto-Suggest Refill Engine)</span>
        </div>
        <span style="font-size:11.5px; color:#94a3b8;">คำนวณตาม Velocity + Lead Time + Safety Stock</span>
      </div>

      <div class="refill-formula-box">
        <strong>สูตรคำนวณ:</strong> (ยอดขายเฉลี่ย <b>${refill.dailyRate.toFixed(2)}</b> ${escapeHtml(refill.unitStr)}/วัน × เป้าหมาย <b>${refill.targetDays}</b> วัน) + สำรองจัดส่ง <b>${refill.leadTimeDemand}</b> + Safety Stock <b>${refill.minStock}</b> - สต็อกปัจจุบัน <b>${refill.currentStock}</b> = <strong style="color:#38bdf8;">แนะนำเติม +${refill.suggestedQty} ${escapeHtml(refill.unitStr)}</strong>
      </div>

      <div style="font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">
        🎯 เลือกระยะเวลาสต็อกที่ต้องการสำรอง (Target Coverage Days):
      </div>
      <div class="refill-period-selector">
        <button type="button" class="refill-period-btn ${refill.targetDays === 7 ? 'active' : ''}" onclick="setStockDetailTargetDays('${prod.id}', 7)">⚡ 7 วัน (รอบด่วน)</button>
        <button type="button" class="refill-period-btn ${refill.targetDays === 14 ? 'active' : ''}" onclick="setStockDetailTargetDays('${prod.id}', 14)">⭐ 14 วัน (แนะนำมาตรฐาน)</button>
        <button type="button" class="refill-period-btn ${refill.targetDays === 21 ? 'active' : ''}" onclick="setStockDetailTargetDays('${prod.id}', 21)">📅 21 วัน (3 สัปดาห์)</button>
        <button type="button" class="refill-period-btn ${refill.targetDays === 30 ? 'active' : ''}" onclick="setStockDetailTargetDays('${prod.id}', 30)">📦 30 วัน (1 เดือน)</button>
      </div>

      <!-- Instant Refill Execution -->
      <form id="stockDetailRefillForm" onsubmit="event.preventDefault(); submitAutoRefillFromDetail('${prod.id}');">
        <div style="font-size:12px; font-weight:700; color:#e2e8f0; margin-bottom:6px;">
          📥 บันทึกรับเข้าคลังตามข้อเสนอแนะ:
        </div>
        <div class="refill-action-row">
          <div class="refill-qty-input-group">
            <input type="number" id="detailRefillQtyInput" class="refill-qty-input" min="1" step="1" value="${Math.max(1, refill.suggestedQty)}" required>
            <span style="font-size:13px; font-weight:700; color:#94a3b8;">${escapeHtml(refill.unitStr)}</span>
          </div>

          <div style="display:flex; gap:6px; flex-wrap:wrap; flex:1;">
            <button type="button" class="mini-btn" style="background:#1e293b; color:#38bdf8; border-color:#38bdf8;" onclick="el('detailRefillQtyInput').value = ${Math.max(1, refill.suggestedQty)}">
              ⭐ แนะนำ (+${Math.max(1, refill.suggestedQty)})
            </button>
            <button type="button" class="mini-btn" style="background:#1e293b; color:#94a3b8;" onclick="el('detailRefillQtyInput').value = 10">+10</button>
            <button type="button" class="mini-btn" style="background:#1e293b; color:#94a3b8;" onclick="el('detailRefillQtyInput').value = 20">+20</button>
            <button type="button" class="mini-btn" style="background:#1e293b; color:#94a3b8;" onclick="el('detailRefillQtyInput').value = 50">+50</button>
            <button type="button" class="mini-btn" style="background:#1e293b; color:#94a3b8;" onclick="el('detailRefillQtyInput').value = 100">+100</button>
          </div>

          <button type="submit" class="refill-action-btn">
            ⚡ ยืนยันรับเข้าคลังทันที
          </button>
        </div>

        <div style="margin-top:8px;">
          <input type="text" id="detailRefillNoteInput" placeholder="หมายเหตุ เช่น เติมสต็อกตามระบบ Auto-Suggest (${refill.targetDays} วัน)" style="width:100%; font-size:12px; padding:7px 10px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#f8fafc;">
        </div>
      </form>
    </div>

    <!-- Recent Stock Movement History -->
    <div style="background:rgba(15,23,42,0.6); border:1px solid #334155; border-radius:10px; padding:12px; margin-top:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:12.5px; font-weight:700; color:#e2e8f0;">🕒 ประวัติการเคลื่อนไหวสต็อกล่าสุด</span>
        <span style="font-size:11px; color:#94a3b8;">5-6 รายการล่าสุด</span>
      </div>
      ${movements.length > 0 ? `
        <table class="stock-history-mini-table">
          <thead>
            <tr>
              <th>วันที่-เวลา</th>
              <th>ประเภท</th>
              <th>จำนวน</th>
              <th>หมายเหตุ / เอกสาร</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map(m => {
              const isPlus = m.movement_type === "IN" || m.movement_type === "in" || Number(m.quantity || 0) > 0;
              const typeLabel = m.movement_type === "IN" ? "📥 รับเข้า" : m.movement_type === "OUT" ? "📤 เบิกออก" : m.movement_type === "SALE" ? "🛒 ขาย" : "🔧 ปรับยอด";
              const qtyDisplay = Number(m.quantity || m.qty || 0);
              return `
                <tr>
                  <td style="color:#94a3b8;">${(m.created_at || m.movement_date || "").slice(0, 16).replace("T", " ")}</td>
                  <td><span style="font-weight:700; color:${isPlus ? '#34d399' : '#f87171'};">${typeLabel}</span></td>
                  <td><strong style="color:${isPlus ? '#34d399' : '#f87171'};">${isPlus ? '+' : ''}${qtyDisplay} ${escapeHtml(refill.unitStr)}</strong></td>
                  <td style="color:#cbd5e1;">${escapeHtml(m.note || m.doc_no || "-")}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `
        <div style="padding:16px; text-align:center; color:#64748b; font-size:12px;">ยังไม่มีประวัติการเคลื่อนไหวสต็อกสำหรับสินค้านี้</div>
      `}
    </div>

    <div class="modal-foot" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1px solid #2dd4bf; font-weight:700;" onclick="closeStockDetailModal(); openBarcodePrintModal('${prod.id}')">
          🖨️ พิมพ์บาร์โค้ด
        </button>
        <button type="button" class="btn btn-light" onclick="closeStockDetailModal(); editProduct('${prod.id}')">
          ✏️ แก้ไขข้อมูลสินค้า
        </button>
        <button type="button" class="btn btn-light" onclick="closeStockDetailModal(); quickReceive('${prod.id}')">
          📝 จัดการ Movement
        </button>
      </div>
      <button type="button" class="btn btn-primary" onclick="closeStockDetailModal()">ปิดหน้าต่าง</button>
    </div>
  `;

  if(bodyEl){
    bodyEl.innerHTML = contentHtml;
  } else {
    dialog.innerHTML = `
      <div class="modal-card" style="max-width:680px; width:95%;">
        <div class="modal-head">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, rgba(2,132,199,0.2) 0%, rgba(56,189,248,0.2) 100%); border:1px solid rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8; font-size:22px;">
              📦
            </div>
            <div>
              <h3 id="stockDetailTitle" style="margin:0; font-size:17px; font-weight:800;">รายละเอียดสต็อก: ${escapeHtml(prod.product_name)}</h3>
              <p id="stockDetailSubtitle" style="margin:2px 0 0; color:var(--muted); font-size:12px;">รหัส ${escapeHtml(prod.product_code || '-')} • Barcode: ${escapeHtml(prod.barcode || '-')}</p>
            </div>
          </div>
          <button class="icon-close" type="button" onclick="closeStockDetailModal()" aria-label="ปิด">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div id="stockDetailBody" class="modal-body" style="padding:16px 20px; max-height:80vh; overflow-y:auto;">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  if(!dialog.open){
    dialog.showModal();
  }
}

function closeStockDetailModal(){
  const dialog = el("stockDetailDialog");
  if(dialog?.open) dialog.close();
}

function setStockDetailTargetDays(productId, targetDays){
  openStockDetailModal(productId, targetDays);
}

async function submitAutoRefillFromDetail(productId){
  const prod = productById(productId);
  if(!prod) return;

  const qtyInput = el("detailRefillQtyInput");
  const noteInput = el("detailRefillNoteInput");
  const qty = Number(qtyInput ? qtyInput.value : 0);
  const note = (noteInput && noteInput.value.trim()) ? noteInput.value.trim() : "รับเข้าสต็อกตามคำแนะนำ Auto-Suggest Refill";

  if(qty <= 0){
    toast("กรุณาระบุจำนวนสินค้าที่ถูกต้อง");
    return;
  }

  let remoteSuccess = false;
  if(sb && !state.isOffline){
    try{
      const { error } = await sb.rpc("ea_update_stock", {
        p_product_id: productId,
        p_type: "IN",
        p_qty: qty,
        p_note: note
      });
      if(!error) remoteSuccess = true;
    } catch(err){
      console.warn("RPC update stock error:", err);
    }
  }

  // Update local product stock
  prod.stock_qty = Number(prod.stock_qty || 0) + qty;
  state.movements.unshift({
    id: "mv-local-" + Date.now(),
    product_id: productId,
    movement_type: "IN",
    quantity: qty,
    note: note,
    created_at: new Date().toISOString()
  });

  saveLocalState();
  beepSuccess();
  toast(`✅ รับเข้าสต็อก ${prod.product_name} +${qty} ${prod.unit || 'ชิ้น'} เรียบร้อยแล้ว 📦`);
  checkAndNotifyLowStock();
  
  // Refresh detail modal and pages
  openStockDetailModal(productId);
  render();
  if(state.page === "stock") renderStock();
}

function openProductModal(id=null){
  const p=id?productById(id):null;
  const currentUnit = (p?.unit || "ชิ้น").trim() || "ชิ้น";
  const standardUnits = ["ชิ้น", "กิโล", "ใบ", "ม้วน", "ผืน", "ขวด", "กล่อง", "แพ็ค", "ซอง", "ถุง", "กระป๋อง", "แผ่น", "มัด", "หลอด", "คู่", "เมตร", "ลิตร", "ชุด", "โหล", "กิโลกรัม", "กรัม"];
  const quickUnits = ["ชิ้น", "กิโล", "ใบ", "ม้วน", "ผืน", "ขวด", "กล่อง", "แพ็ค", "ซอง", "ถุง", "เมตร"];
  const refill = p ? calculateAutoSuggestRefill(p, { targetDays: 14 }) : null;

  el("modalTitle").textContent=p?"แก้ไขสินค้า":"เพิ่มสินค้าใหม่";
  el("modalBody").innerHTML=`
    <div class="form-grid">
      <div class="field">
        <label>รหัสสินค้า</label>
        <input id="pCode" value="${escapeHtml(p?.product_code||"")}" placeholder="เช่น P001, ITEM-01" oninput="updateProductModalBarcodePreview()">
      </div>
      <div class="field">
        <label style="display:flex; justify-content:space-between; align-items:center;">
          <span>Barcode (บาร์โค้ด)</span>
          <button type="button" class="mini-btn" style="background:#0f766e; color:#ffffff; border:1px solid #2dd4bf; font-weight:700; padding:1px 6px; font-size:11px;" onclick="generateAndSetProductModalBarcode()" title="สร้างเลขบาร์โค้ดมาตรฐาน EAN-13 ใหม่">
            ⚡ สุ่มบาร์โค้ด
          </button>
        </label>
        <div style="display:flex; gap:6px;">
          <input id="pBarcode" inputmode="numeric" value="${escapeHtml(p?.barcode||"")}" placeholder="เช่น 8851234567890" oninput="updateProductModalBarcodePreview()" style="flex:1;">
          ${p ? `
            <button type="button" class="mini-btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1px solid #2dd4bf; font-weight:800; padding:0 10px; font-size:12px; white-space:nowrap;" onclick="printCurrentModalBarcode('${p.id}')" title="เปิดหน้าต่างพิมพ์บาร์โค้ดสำหรับสินค้านี้">
              🖨️ พิมพ์
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Live Barcode SVG Preview Widget -->
      <div class="field" style="grid-column: 1 / -1; margin-top:-4px; margin-bottom:4px;">
        <label style="font-size:11px; color:#94a3b8; font-weight:600;">ตัวอย่างฉลากบาร์โค้ด (Live Barcode Preview):</label>
        <div id="pBarcodePreviewWrap" style="margin-top:2px;"></div>
      </div>

      <div class="field" style="grid-column: 1 / -1;">
        <label>ชื่อสินค้า</label>
        <input id="pName" value="${escapeHtml(p?.product_name||"")}" placeholder="ระบุชื่อสินค้าให้ชัดเจน" oninput="updateProductModalBarcodePreview()">
      </div>
      
      <!-- Unit Selection Field -->
      <div class="field" style="grid-column: 1 / -1;">
        <label style="display:flex; justify-content:space-between; align-items:center;">
          <span>หน่วยนับสินค้า (Unit)</span>
          <span style="font-size:11px; font-weight:normal; color:#94a3b8;">เลือกจากตัวเลือกด้านล่าง หรือพิมพ์ระบุเองได้</span>
        </label>
        <div class="unit-field-container">
          <input id="pUnit" list="unitPresetsList" value="${escapeHtml(currentUnit)}" placeholder="เลือกหรือพิมพ์หน่วย เช่น ชิ้น, กิโล, ใบ, ม้วน, ผืน..." oninput="updateModalUnitLabels(this.value)">
          <datalist id="unitPresetsList">
            ${standardUnits.map(u => `<option value="${u}">`).join("")}
          </datalist>
          <div class="unit-chips-wrap">
            ${quickUnits.map(u => `
              <button type="button" class="unit-chip-btn ${u === currentUnit ? 'active' : ''}" data-unit="${u}" onclick="setModalUnit('${u}')">
                ${u}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="field">
        <label>ราคาขาย (บาท / <span class="modal-unit-label modal-unit-badge">${escapeHtml(currentUnit)}</span>)</label>
        <input id="pPrice" type="number" min="0" step="any" value="${p?.sale_price??0}" oninput="updateProductModalBarcodePreview()">
      </div>
      <div class="field">
        <label>จำนวนคงเหลือ (<span class="modal-unit-label modal-unit-badge">${escapeHtml(currentUnit)}</span>)</label>
        <input id="pQty" type="number" min="0" step="any" value="${p?.stock_qty??0}" ${p?"disabled":""}>
        ${p ? `<small style="color:#94a3b8; font-size:11px; margin-top:2px;">* หากต้องการเปลี่ยนจำนวนสต็อก ให้ใช้เมนู "รับเข้า/เบิกสินค้า"</small>` : ''}
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>แจ้งเตือนเมื่อเหลือน้อยกว่า (<span class="modal-unit-label modal-unit-badge">${escapeHtml(currentUnit)}</span>)</label>
        <input id="pMin" type="number" min="0" step="any" value="${p?.min_stock??state.settings.lowStockDefault}">
      </div>

      ${promoFeatureReady() ? `
        <div class="field" style="grid-column: 1 / -1;">
          <label>ราคาโปรโมชั่น (บรรทัดละ 1 โปร: จำนวน แล้วตามด้วยราคา)</label>
          <textarea id="pPromos" rows="2" placeholder="เช่น 3 กิโล 100&#10;7 ใบ 100" oninput="updatePromoPreview()" style="width:100%; min-height:60px; border-radius:10px; padding:8px 10px; font-size:15px;">${escapeHtml((Array.isArray(p?.promotions) ? p.promotions : []).map(x => x.label).join("\n"))}</textarea>
          <small id="pPromoPreview" style="color:#94a3b8; font-size:12px;"></small>
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input id="pTrackWeight" type="checkbox" ${p?.track_weight ? "checked" : ""} style="width:22px; height:22px;">
            <span>ลงน้ำหนักทุกชิ้นที่ขาย (เช่น สายยางขายเป็นม้วน ต้องชั่งน้ำหนักแต่ละม้วน)</span>
          </label>
        </div>
      ` : `
        <div class="field" style="grid-column: 1 / -1; font-size:12px; color:#fcd34d;">
          ℹ️ ต้องการตั้งราคาโปร (เช่น 3 กิโล 100) หรือลงน้ำหนักรายม้วน → รัน migration_v11_promo_weights.sql ใน Supabase
        </div>
      `}

      ${refill ? `
        <div class="field" style="grid-column: 1 / -1; background:rgba(2, 132, 199, 0.12); border:1px solid rgba(56, 189, 248, 0.3); border-radius:10px; padding:12px; margin-top:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:12.5px; font-weight:800; color:#38bdf8;">💡 การวิเคราะห์ Auto-Suggest Refill</span>
            <button type="button" class="mini-btn" style="background:#0284c7; color:#fff;" onclick="closeProductModal(); openStockDetailModal('${p.id}')">
              🔍 ดูหน้ารายละเอียด & สั่งเติมเต็มรูปแบบ
            </button>
          </div>
          <div style="font-size:12px; color:#cbd5e1; display:flex; gap:12px; flex-wrap:wrap;">
            <span>อัตราขาย: <b>${refill.dailyRate.toFixed(2)}</b> ${escapeHtml(currentUnit)}/วัน</span>
            <span>สต็อกอยู่ได้: <b>${refill.roundedDays !== null ? refill.roundedDays + ' วัน' : '-'}</b></span>
            <span>แนะนำสั่งเติม (14 วัน): <strong style="color:#38bdf8;">+${refill.suggestedQty} ${escapeHtml(currentUnit)}</strong></span>
          </div>
        </div>
      ` : ''}
    </div>
    <div class="actions" style="display:flex; gap:10px; justify-content:space-between; align-items:center; margin-top:16px; flex-wrap:wrap;">
      <div>
        ${p ? `
          <button type="button" class="btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1.5px solid #2dd4bf; font-weight:800;" onclick="printCurrentModalBarcode('${p.id}')">
            🖨️ พิมพ์บาร์โค้ดสินค้านี้ (${p.stock_qty || 0} ชิ้น)
          </button>
        ` : ''}
      </div>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-light" onclick="closeProductModal()">ยกเลิก</button>
        <button type="button" class="btn btn-primary" onclick="saveProduct(${id?`'${id}'`:"null"})">${p?"บันทึกการแก้ไข":"เพิ่มสินค้า"}</button>
      </div>
    </div>
  `;
  el("modal").showModal();
  updateProductModalBarcodePreview();
  updatePromoPreview();
}

// ---- Promotions (V11) ----
function promoFeatureReady(){
  return (state.products||[]).some(x => Object.prototype.hasOwnProperty.call(x, "promotions"));
}
// "3 กิโล 100" → {label:"3 กิโล 100", qty:3, price:100}
function parsePromotions(text){
  return String(text||"").split(/\n+/).map(l => l.trim()).filter(Boolean).slice(0,10).map(line => {
    const nums = (line.replace(/,/g,"").match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if(nums.length < 2) return null;
    const qty = nums[0], price = nums[nums.length-1];
    if(!(qty > 0) || !(price >= 0)) return null;
    return { label: line.slice(0,60), qty, price };
  }).filter(Boolean);
}
function promoUnitPrice(promo){ return Math.round((Number(promo.price)/Number(promo.qty))*10000)/10000; }
function updatePromoPreview(){
  const box = el("pPromoPreview");
  if(!box) return;
  const list = parsePromotions(el("pPromos")?.value);
  const unit = (el("pUnit")?.value || "หน่วย").trim();
  box.textContent = list.length ? list.map(x => `${x.label} = ฿${promoUnitPrice(x)}/${unit}`).join(" • ") : "ไม่มีโปร";
}

function updateProductModalBarcodePreview(){
  const val = (el("pBarcode")?.value || "").trim();
  const name = (el("pName")?.value || "").trim() || "ตัวอย่างสินค้า";
  const price = Number(el("pPrice")?.value || 0);
  const code = (el("pCode")?.value || "").trim() || "ITEM";
  const previewWrap = el("pBarcodePreviewWrap");
  if(!previewWrap) return;
  
  if(!val){
    previewWrap.innerHTML = `
      <div style="font-size:11.5px; color:#94a3b8; padding:8px 12px; background:rgba(15,23,42,0.5); border:1px dashed #334155; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>ยังไม่มีบาร์โค้ด — สามารถกดปุ่มสร้างอัตโนมัติได้</span>
        <button type="button" class="mini-btn" style="background:#0f766e; color:#fff; border:1px solid #2dd4bf;" onclick="generateAndSetProductModalBarcode()">⚡ สร้างอัตโนมัติ</button>
      </div>
    `;
    return;
  }
  
  try {
    const svg = generateCode128Svg(val, { width: 1.3, height: 28, showText: true });
    previewWrap.innerHTML = `
      <div style="background:#ffffff; color:#000000; padding:8px 14px; border-radius:8px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.25); border:1px solid #cbd5e1; max-width:280px; margin:0 auto;">
        <div style="font-size:8.5px; font-weight:800; color:#334155; text-transform:uppercase; line-height:1;">${escapeHtml(state.settings.shopName || "EA FAIR SALE")}</div>
        <div style="font-size:11px; font-weight:900; color:#000000; margin:2px 0 3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</div>
        <div style="margin:2px 0;">${svg}</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:10px; font-weight:800; border-top:1px solid #cbd5e1; padding-top:2px;">
          <span style="color:#64748b; font-family:monospace; font-size:9.5px;">${escapeHtml(code)}</span>
          <span style="color:#059669; font-size:12px; font-weight:900;">฿${money(price)}</span>
        </div>
      </div>
    `;
  } catch(e) {
    previewWrap.innerHTML = `<div style="color:#f87171; font-size:11px; text-align:center;">รูปแบบบาร์โค้ดไม่ถูกต้อง</div>`;
  }
}

function generateAndSetProductModalBarcode(){
  const newCode = generateNewBarcode();
  const inp = el("pBarcode");
  if(inp){
    inp.value = newCode;
    updateProductModalBarcodePreview();
    toast(`✨ สุ่มสร้างบาร์โค้ดใหม่: ${newCode}`);
  }
}

function printCurrentModalBarcode(productId = null){
  const barcodeVal = (el("pBarcode")?.value || "").trim();
  if(!barcodeVal && (!productId || !productById(productId)?.barcode)){
    toast("กรุณาระบุเลขบาร์โค้ดก่อนสั่งพิมพ์");
    return;
  }
  if(productId){
    const p = productById(productId);
    if(p && barcodeVal && p.barcode !== barcodeVal){
      p.barcode = barcodeVal;
      saveLocalState();
    }
    closeProductModal();
    openBarcodePrintModal(productId);
  } else {
    toast("กรุณาบันทึกสินค้าก่อน เพื่อพิมพ์บาร์โค้ดอย่างเป็นทางการ");
  }
}

function setModalUnit(unit){
  const inp = el("pUnit");
  if(inp){
    inp.value = unit;
    updateModalUnitLabels(unit);
  }
}

function updateModalUnitLabels(unit){
  const u = (unit || "").trim() || "หน่วย";
  document.querySelectorAll(".modal-unit-label").forEach(l => l.textContent = u);
  document.querySelectorAll(".unit-chip-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.unit === unit);
  });
}

function editProduct(id){openProductModal(id)}
async function saveProduct(id){
  const unitVal = (el("pUnit")?.value || "ชิ้น").trim() || "ชิ้น";
  const payload={
    product_code:el("pCode").value.trim(),
    barcode:el("pBarcode").value.trim()||null,
    product_name:el("pName").value.trim(),
    unit:unitVal,
    sale_price:Number(el("pPrice").value),
    min_stock:Number(el("pMin").value),
    is_active:true
  };
  if(el("pPromos")){
    payload.promotions = parsePromotions(el("pPromos").value);
    payload.track_weight = Boolean(el("pTrackWeight")?.checked);
  }
  if(!payload.product_code||!payload.product_name){toast("กรุณากรอกรหัสและชื่อสินค้า");return}

  let remoteSuccess = false;
  if (sb && !state.isOffline) {
    try {
      let r;
      if(id) r = await sb.from("ea_products").update(payload).eq("id",id);
      else { payload.stock_qty = Number(el("pQty").value||0); r = await sb.from("ea_products").insert(payload); }
      if (!r.error) {
        remoteSuccess = true;
      } else {
        if (r.error.code === "23505") {
          toast("Barcode หรือรหัสสินค้านี้มีอยู่แล้ว");
          return;
        }
        console.warn("Remote product save failed, falling back to local:", r.error.message);
      }
    } catch (ex) {
      console.warn("Remote product save exception, proceeding locally:", ex);
    }
  }

  if (remoteSuccess) {
    el("modal").close();
    toast("บันทึกสินค้าแล้ว");
    await loadAll();
    go("stock");
    return;
  }

  // Local fallback
  if (id) {
    const existing = productById(id);
    if (existing) Object.assign(existing, payload);
  } else {
    const newProduct = {
      id: "off-p-" + Date.now(),
      ...payload,
      stock_qty: Number(el("pQty").value || 0)
    };
    state.products.push(newProduct);
  }

  saveLocalState();
  el("modal").close();
  toast("บันทึกสินค้าแล้ว (บันทึกในเครื่อง)");
  checkAndNotifyLowStock();
  render();
  if (state.page === "stock") renderStock();
}

function renderMovement(){
  setHeader("รับเข้า / เบิกสินค้า","Stock กลางใช้ร่วมกันทุกเครื่อง");
  const firstProd = state.products[0];
  const firstUnit = firstProd ? (firstProd.unit || "ชิ้น") : "ชิ้น";
  const firstStock = firstProd ? Number(firstProd.stock_qty || 0) : 0;
  
  const recentMovements = (state.movements || []).slice(0, 15);

  el("content").innerHTML=`
    ${connectionNotice()}
    <div class="stock-move-container">
      ${card("📦 บันทึกการเคลื่อนไหว Stock (Stock Adjustment)", `
        <div class="stock-move-form">
          <div class="stock-move-field full-width">
            <label for="moveProduct" class="stock-move-label">
              <span>เลือกสินค้าที่ต้องการบันทึก</span>
              <span id="moveCurrentStockBadge" class="stock-current-badge">คงเหลือปัจจุบัน: <strong>${firstStock}</strong> ${escapeHtml(firstUnit)}</span>
            </label>
            <select id="moveProduct" class="stock-product-select" onchange="onMoveProductChange(this.value)">
              ${state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.product_name)} [รหัส: ${escapeHtml(p.product_code || "-")}] — คงเหลือ ${p.stock_qty} ${escapeHtml(p.unit||"ชิ้น")}</option>`).join("")}
            </select>
          </div>

          <div class="stock-move-row-2col">
            <div class="stock-move-field">
              <label for="moveType" class="stock-move-label">ประเภทรายการ</label>
              <select id="moveType" class="stock-type-select">
                <option value="IN">📥 รับเข้าสินค้า (+)</option>
                <option value="OUT">📤 เบิกสินค้าออก (-)</option>
                <option value="ADJUST">⚖️ ปรับยอดคงเหลือจริง (=)</option>
              </select>
            </div>

            <div class="stock-move-field">
              <label for="moveQty" class="stock-move-label">
                <span>จำนวนที่ต้องการทำรายการ</span>
                <span class="stock-unit-indicator">(หน่วย: <strong id="moveUnitSpan">${escapeHtml(firstUnit)}</strong>)</span>
              </label>
              <input id="moveQty" type="number" min="0.01" step="any" value="1" class="stock-qty-input" placeholder="ระบุจำนวน">
            </div>
          </div>

          <div class="stock-move-field full-width">
            <label for="moveNote" class="stock-move-label">หมายเหตุ / เหตุผลการบันทึก</label>
            <input id="moveNote" class="stock-note-input" placeholder="เช่น รับของเข้าจากโกดังใหญ่, เติมสต็อกหน้าร้าน, สินค้าชำรุด, ตรวจนับสต็อก">
          </div>

          <div class="stock-move-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary stock-save-btn" onclick="saveMovement()">
              💾 บันทึก Stock
            </button>
            <button type="button" class="btn" style="background:linear-gradient(135deg, #0f766e 0%, #115e59 100%); color:#ffffff; border:1.5px solid #2dd4bf; font-weight:800;" onclick="openBarcodePrintModal(el('moveProduct')?.value, 'single', el('moveQty')?.value)" title="พิมพ์บาร์โค้ดสำหรับสินค้าและจำนวนที่ระบุ">
              🖨️ พิมพ์บาร์โค้ดสินค้าที่เลือก
            </button>
          </div>
        </div>
      `)}

      <div style="margin-top: 22px;">
        ${card("📋 ประวัติการเคลื่อนไหว Stock ล่าสุด", `
          <div class="table-wrap" style="max-height: 420px; overflow-y: auto;">
            <table class="raw-data-table">
              <thead>
                <tr>
                  <th style="width: 45px;">#</th>
                  <th>วันที่ / เวลา</th>
                  <th>สินค้า</th>
                  <th style="text-align:center;">ประเภท</th>
                  <th style="text-align:right;">จำนวนที่เปลี่ยน</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${recentMovements.length ? recentMovements.map((m, idx) => {
                  const typeCls = m.movement_type === "IN" ? "in" : m.movement_type === "OUT" ? "out" : "adjust";
                  const typeName = m.movement_type === "IN" ? "📥 รับเข้า" : m.movement_type === "OUT" ? "📤 เบิกออก" : "⚖️ ปรับยอด";
                  const sign = Number(m.qty_change) > 0 ? `+${m.qty_change}` : `${m.qty_change}`;
                  return `
                    <tr>
                      <td style="color:#64748b; font-weight:700;">${idx + 1}</td>
                      <td style="white-space:nowrap; font-size:12px; color:#94a3b8;">
                        ${escapeHtml(m.movement_date || "-")} ${escapeHtml(m.movement_time ? m.movement_time.slice(0,5) : "")}
                      </td>
                      <td>
                        <strong>${escapeHtml(m.product_name || "สินค้า")}</strong>
                      </td>
                      <td style="text-align:center;">
                        <span class="status ${typeCls}" style="font-size:11px; padding:3px 8px;">${typeName}</span>
                      </td>
                      <td style="text-align:right; font-weight:800; font-size:13.5px; color:${Number(m.qty_change) >= 0 ? '#34d399' : '#f87171'};">
                        ${sign}
                      </td>
                      <td style="font-size:12px; color:#cbd5e1;">
                        ${escapeHtml(m.note || "-")}
                      </td>
                    </tr>
                  `;
                }).join("") : `<tr><td colspan="6" class="empty">ยังไม่มีประวัติการเคลื่อนไหว Stock</td></tr>`}
              </tbody>
            </table>
          </div>
        `)}
      </div>
    </div>
  `;
}

function onMoveProductChange(prodId){
  const prod = productById(prodId);
  const span = el("moveUnitSpan");
  const badge = el("moveCurrentStockBadge");
  if(prod){
    if(span) span.textContent = prod.unit || "ชิ้น";
    if(badge) badge.innerHTML = `คงเหลือปัจจุบัน: <strong>${prod.stock_qty}</strong> ${escapeHtml(prod.unit || "ชิ้น")}`;
  }
}
async function saveMovement(){
  const prodId = el("moveProduct")?.value;
  const moveType = el("moveType")?.value;
  const qty = Number(el("moveQty")?.value || 0);
  const note = el("moveNote")?.value.trim() || null;

  if (!prodId || qty <= 0) {
    toast("กรุณาเลือกสินค้าและระบุจำนวนที่ถูกต้อง");
    return;
  }

  let remoteSuccess = false;
  if (sb && !state.isOffline) {
    try {
      const {error} = await sb.rpc("ea_update_stock",{p_product_id:prodId,p_type:moveType,p_qty:qty,p_note:note});
      if (!error) {
        remoteSuccess = true;
      } else {
        if (error.message && error.message.includes("Insufficient stock")) {
          toast("Stock ไม่เพียงพอ");
          return;
        }
        console.warn("Remote stock update failed, updating locally:", error.message);
      }
    } catch (ex) {
      console.warn("Remote stock update exception, updating locally:", ex);
    }
  }

  if (remoteSuccess) {
    toast("บันทึก Stock แล้ว");
    await loadAll();
    go("movement");
    return;
  }

  // Local Stock Movement Fallback
  const prod = productById(prodId);
  if (!prod) {
    toast("ไม่พบสินค้า");
    return;
  }

  let qtyChange = 0;
  if (moveType === "IN") {
    qtyChange = qty;
    prod.stock_qty = Number(prod.stock_qty || 0) + qty;
  } else if (moveType === "OUT") {
    if (Number(prod.stock_qty) < qty) {
      toast("Stock ไม่เพียงพอสำหรับการเบิกออก");
      return;
    }
    qtyChange = -qty;
    prod.stock_qty = Number(prod.stock_qty || 0) - qty;
  } else if (moveType === "ADJUST") {
    qtyChange = qty - Number(prod.stock_qty || 0);
    prod.stock_qty = qty;
  }

  const now = new Date();
  state.movements.unshift({
    id: "off-move-" + Date.now(),
    product_id: prod.id,
    product_name: prod.product_name,
    movement_type: moveType,
    qty_change: qtyChange,
    note: note || (moveType === "IN" ? "รับเข้า" : moveType === "OUT" ? "เบิกออก" : "ปรับยอด"),
    movement_date: todayISO(),
    movement_time: now.toTimeString().slice(0,8),
    created_at: now.toISOString()
  });

  saveLocalState();
  toast("บันทึก Stock เรียบร้อย (บันทึกในเครื่อง)");
  checkAndNotifyLowStock();
  render();
  if (state.page === "movement") renderMovement();
}

/* =========================================================
   STOCK AUDIT & PHYSICAL COUNT SUITE (PHYSICAL AUDIT MODULE)
   ========================================================= */

// Audit uses the real selling price field (products have sale_price, not unit_price)
function auditUnitPrice(p){
  return Number(p?.sale_price ?? p?.unit_price ?? 0) || 0;
}

let _auditRenderTimer = null;
function rerenderAuditView(delay = 0){
  clearTimeout(_auditRenderTimer);
  const run = () => {
    if(state.page === "audit") renderPhysicalAuditPage();
    else if(el("modal")?.open) renderStockAuditModalContent();
  };
  if(delay > 0) _auditRenderTimer = setTimeout(run, delay); else run();
}

function initPhysicalAuditState(force = false){
  if(!state.auditCounts || force){
    state.auditCounts = {};
    state.auditTouched = {};
    (state.products || []).forEach(p => {
      state.auditCounts[p.id] = Number(p.stock_qty || 0);
    });
  }
  if(!state.auditTouched || typeof state.auditTouched !== "object") state.auditTouched = {};
  if(!Array.isArray(state.auditSessionScanLogs)) state.auditSessionScanLogs = [];
  if(state.auditBulkMode === undefined) state.auditBulkMode = false;
  if(!state.auditBulkQty) state.auditBulkQty = 10;
  if(!state.auditScanStep) state.auditScanStep = state.auditBulkMode ? (state.auditBulkQty || 10) : 1;
  if(!state.auditFilter) state.auditFilter = "all";
  if(!state.auditSearch) state.auditSearch = "";
  if(!Array.isArray(state.auditRecentScans)) state.auditRecentScans = [];
  if(!state.auditNote) state.auditNote = `ตรวจนับสต็อกจริง & กระทบยอดประจำวัน ${todayISO()}`;
}

function openStockAuditModal(){
  initPhysicalAuditState(true);
  const m = el("modal");
  if(m){
    el("modalTitle").textContent = "🔍 ตรวจนับสต็อกจริง & กระทบยอด (Stock Audit)";
    renderStockAuditModalContent();
    if(!m.open) m.showModal();
  }
}

function toggleAuditBulkMode(forceMode){
  initPhysicalAuditState(false);
  if(typeof forceMode === "boolean"){
    state.auditBulkMode = forceMode;
  } else {
    state.auditBulkMode = !state.auditBulkMode;
  }

  if(state.auditBulkMode){
    const targetQty = Math.max(2, parseInt(state.auditBulkQty || 10, 10));
    state.auditScanStep = targetQty;
    state.auditBulkQty = targetQty;
    toast(`📦 เปิดโหมด "เพิ่มแบบกลุ่ม (Bulk Add)" (สแกน/นับทีละ +${targetQty})`);
  } else {
    state.auditScanStep = 1;
    toast(`⚡ สลับเป็นโหมด "ชิ้นเดี่ยว (Single Add)" (สแกน/นับทีละ +1)`);
  }

  if(state.page === "audit") renderPhysicalAuditPage();
  else if(el("modal")?.open) renderStockAuditModalContent();
}

function setAuditBulkQty(qty){
  initPhysicalAuditState(false);
  const num = Math.max(1, parseInt(qty, 10) || 1);
  state.auditScanStep = num;
  state.auditBulkQty = num;
  state.auditBulkMode = num > 1;
  if(state.page === "audit") renderPhysicalAuditPage();
  else if(el("modal")?.open) renderStockAuditModalContent();
}

function stepAuditBulkQty(delta){
  initPhysicalAuditState(false);
  const current = Math.max(1, parseInt(state.auditScanStep || 1, 10));
  const nextVal = Math.max(1, current + Number(delta));
  setAuditBulkQty(nextVal);
}

function onAuditBulkQtyInput(val){
  initPhysicalAuditState(false);
  const num = Math.max(1, parseInt(val, 10) || 1);
  state.auditScanStep = num;
  state.auditBulkQty = num;
  state.auditBulkMode = num > 1;
}

function setAuditFilter(filter){
  state.auditFilter = filter;
  if(state.page === "audit") renderPhysicalAuditPage();
  else renderStockAuditModalContent();
}

function setAuditScanStep(step){
  setAuditBulkQty(step);
}

function onAuditSearch(val){
  state.auditSearch = String(val || "").trim().toLowerCase();
  if(state.page === "audit"){
    // หน่วงการวาดหน้าใหม่จนพิมพ์เสร็จ (ไม่ให้ตัวอักษรหาย/สระไทยหลุดระหว่างพิมพ์)
    clearTimeout(_auditRenderTimer);
    _auditRenderTimer = setTimeout(() => {
      if(state.page !== "audit") return;
      const cur = el("auditSearchInput");
      if(cur && String(cur.value || "").trim().toLowerCase() !== state.auditSearch) return;
      state.auditFocusTarget = document.activeElement === cur ? "auditSearchInput" : null;
      renderPhysicalAuditPage();
    }, 350);
  } else {
    renderStockAuditModalContent();
    setTimeout(()=>{
      const inp = el("auditSearchInput");
      if(inp){
        inp.focus();
        const len = inp.value.length;
        inp.setSelectionRange(len, len);
      }
    }, 10);
  }
}

function handleAuditBarcodeInput(e){
  if(e.key === "Enter"){
    e.preventDefault();
    const inp = el("auditBarcodeInput");
    const val = inp?.value?.trim();
    if(!val) return;

    // Lookup product by barcode or product_code or exact name
    let p = productByBarcode(val);
    if(!p){
      const lower = val.toLowerCase();
      p = (state.products || []).find(x => 
        (x.product_code || "").toLowerCase() === lower ||
        (x.product_name || "").toLowerCase() === lower ||
        String(x.barcode || "").trim() === val
      );
    }

    if(!p){
      toast(`❌ ไม่พบบาร์โค้ดหรือรหัส "${val}" ในระบบ`);
      beepError();
      if(isScanVibrationEnabled) navigator.vibrate?.([60, 50, 60]);
      inp?.select?.();
      return;
    }

    state.auditFocusTarget = "auditBarcodeInput";
    handleAuditScannedBarcode(p);
    if(inp){
      inp.value = "";
      inp.focus();
    }
  }
}

function handleAuditScannedBarcode(p, customStep = null){
  if(!p) return;
  initPhysicalAuditState(false);
  const step = customStep !== null ? customStep : (state.auditScanStep || 1);
  const sysQty = Number(p.stock_qty || 0);
  // นับจริงต้องเริ่มจาก 0 เมื่อสแกนสินค้านั้นครั้งแรก (เดิมบวกต่อจากยอดในระบบ ทำให้ยอดนับเกินจริง)
  const firstScan = !state.auditTouched[p.id];
  const storedBefore = state.auditCounts[p.id];
  const currentCount = firstScan ? 0 : Number(storedBefore !== undefined ? storedBefore : sysQty);
  const newCount = currentCount + step;
  state.auditCounts[p.id] = newCount;
  state.auditTouched[p.id] = true;

  const diff = newCount - sysQty;
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);

  state.auditLastScanned = {
    product: p,
    step,
    previousCount: currentCount,
    newCount,
    sysQty,
    diff,
    time: timeStr
  };

  if(!Array.isArray(state.auditRecentScans)) state.auditRecentScans = [];
  state.auditRecentScans.unshift({
    productId: p.id,
    productName: p.product_name,
    productCode: p.product_code || "-",
    barcode: p.barcode || "-",
    unit: p.unit || "ชิ้น",
    unitPrice: auditUnitPrice(p),
    step,
    previousCount: currentCount,
    storedBefore,
    firstScan,
    newCount,
    sysQty,
    diff,
    time: timeStr
  });
  state.auditSessionScanLogs.push({
    scanOrder: state.auditSessionScanLogs.length + 1,
    timestamp: `${todayISO()} ${timeStr}`,
    timeStr,
    productId: p.id,
    productCode: p.product_code || "-",
    barcode: p.barcode || "-",
    productName: p.product_name,
    unit: p.unit || "ชิ้น",
    unitPrice: auditUnitPrice(p),
    step,
    previousCount: currentCount,
    newCount,
    sysQty,
    diff,
    scanMethod: "📷 สแกน"
  });

  if(state.auditRecentScans.length > 20){
    state.auditRecentScans = state.auditRecentScans.slice(0, 20);
  }

  beepBatchAdd();
  if(isScanVibrationEnabled) navigator.vibrate?.(60);
  toast(`📦 ตรวจนับ [+${step}] "${p.product_name}": นับจริง ${newCount} ${p.unit||'ชิ้น'} (ระบบ ${sysQty}, ${diff >= 0 ? '+' + diff : diff})`);

  rerenderAuditView();
}

function undoAuditRecentScan(index = 0){
  if(!state.auditRecentScans || !state.auditRecentScans[index]) return;
  const item = state.auditRecentScans[index];
  const p = productById(item.productId);
  if(!p) return;

  initPhysicalAuditState(false);
  const currentCount = Number(state.auditCounts[p.id] || 0);
  let restored;
  if(item.firstScan){
    // สแกนแรกของสินค้านี้ → คืนสถานะ "ยังไม่ได้นับ"
    restored = Number(item.storedBefore !== undefined ? item.storedBefore : (p.stock_qty || 0));
    state.auditCounts[p.id] = restored;
    delete state.auditTouched[p.id];
  } else {
    restored = Math.max(0, currentCount - item.step);
    state.auditCounts[p.id] = restored;
  }
  state.auditRecentScans.splice(index, 1);
  const logs = state.auditSessionScanLogs || [];
  for(let i = logs.length - 1; i >= 0; i--){
    if(logs[i].productId === item.productId && logs[i].timeStr === item.time && logs[i].step === item.step){ logs.splice(i, 1); break; }
  }
  const nextRecent = state.auditRecentScans[0];
  const nextProd = nextRecent ? productById(nextRecent.productId) : null;
  state.auditLastScanned = nextProd ? {
    product: nextProd, step: nextRecent.step, previousCount: nextRecent.previousCount,
    newCount: Number(state.auditCounts[nextProd.id] ?? nextRecent.newCount),
    sysQty: Number(nextProd.stock_qty || 0),
    diff: Number(state.auditCounts[nextProd.id] ?? nextRecent.newCount) - Number(nextProd.stock_qty || 0),
    time: nextRecent.time
  } : null;

  toast(`↩️ ยกเลิกการสแกน "${p.product_name}" (-${item.step}) แล้ว คงเหลือยอดนับ ${restored}`);
  rerenderAuditView();
}

function startAuditCameraScan(){
  state.batchScanEnabled = false; // direct continuous scan to audit
  startScanner();
}

// rerender: false = แค่จำค่าระหว่างพิมพ์ (ไม่วาดหน้าใหม่ เพื่อไม่ให้ช่องหลุดโฟกัส)
function updateAuditCount(prodId, val, rerender = true){
  initPhysicalAuditState(false);
  const num = val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0);
  state.auditCounts[prodId] = num;
  state.auditTouched[prodId] = true;
  if(rerender) rerenderAuditView(180);
}

function stepAuditCount(prodId, delta){
  initPhysicalAuditState(false);
  const current = Number(state.auditCounts[prodId] !== undefined ? state.auditCounts[prodId] : (productById(prodId)?.stock_qty || 0));
  const nextVal = Math.max(0, current + Number(delta));
  state.auditCounts[prodId] = nextVal;
  state.auditTouched[prodId] = true;
  rerenderAuditView();
}

function resetAuditProductToSystem(prodId){
  const p = productById(prodId);
  if(p){
    initPhysicalAuditState(false);
    state.auditCounts[prodId] = Number(p.stock_qty || 0);
    delete state.auditTouched[prodId];
    toast(`คืนค่ายอดนับ "${p.product_name}" ให้ตรงกับระบบ (${p.stock_qty || 0}) แล้ว`);
    if(state.page === "audit") renderPhysicalAuditPage();
    else renderStockAuditModalContent();
  }
}

function setAllAuditToSystem(){
  initPhysicalAuditState(true);
  state.auditRecentScans = [];
  state.auditSessionScanLogs = [];
  state.auditLastScanned = null;
  toast("🔄 รีเซ็ตยอดตรวจนับทั้งหมดให้ตรงกับระบบเรียบร้อยแล้ว");
  if(state.page === "audit") renderPhysicalAuditPage();
  else renderStockAuditModalContent();
}

function setAllAuditToZero(){
  initPhysicalAuditState(false);
  (state.products || []).forEach(p => {
    state.auditCounts[p.id] = 0;
    state.auditTouched[p.id] = true;
  });
  toast("ตั้งค่ายอดนับสินค้าทั้งหมดเป็น 0 ชิ้นแล้ว");
  if(state.page === "audit") renderPhysicalAuditPage();
  else renderStockAuditModalContent();
}

function getAuditAnalyticsData(){
  initPhysicalAuditState(false);
  const prods = state.products || [];
  const counts = state.auditCounts || {};

  let totalItems = prods.length;
  let matchCount = 0;
  let surplusCount = 0;
  let shortageCount = 0;
  let totalSurplusUnits = 0;
  let totalShortageUnits = 0;
  let totalSurplusValue = 0;
  let totalShortageValue = 0;

  const auditedList = prods.map(p => {
    const sysQty = Number(p.stock_qty || 0);
    const countQty = Number(counts[p.id] !== undefined ? counts[p.id] : sysQty);
    const diff = countQty - sysQty;
    const unitPrice = auditUnitPrice(p);
    const diffVal = diff * unitPrice;

    if(diff === 0){
      matchCount++;
    } else if(diff > 0){
      surplusCount++;
      totalSurplusUnits += diff;
      totalSurplusValue += diffVal;
    } else {
      shortageCount++;
      totalShortageUnits += Math.abs(diff);
      totalShortageValue += Math.abs(diffVal);
    }

    return {
      product: p,
      sysQty,
      countQty,
      diff,
      diffVal
    };
  });

  const netDiscrepancyValue = totalSurplusValue - totalShortageValue;
  const changedItemsCount = surplusCount + shortageCount;
  const accuracyRate = totalItems > 0 ? Math.round((matchCount / totalItems) * 100) : 100;

  return {
    totalItems,
    matchCount,
    surplusCount,
    shortageCount,
    changedItemsCount,
    totalSurplusUnits,
    totalShortageUnits,
    totalSurplusValue,
    totalShortageValue,
    netDiscrepancyValue,
    accuracyRate,
    auditedList
  };
}

function renderPhysicalAuditPage(){
  setHeader("ตรวจนับสต็อกจริง & ประวัติ","Physical Inventory Audit & Batch Reconciliation History");
  initPhysicalAuditState(false);

  const currentSubTab = state.auditSubTab || "count";

  const subtabHeaderHtml = `
    <div class="audit-subtab-navigation" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
      <div class="replenish-tab-bar" style="margin:0;">
        <button type="button" class="replenish-tab-btn ${currentSubTab === 'count' ? 'active' : ''}" onclick="setAuditSubTab('count')">
          🔍 ตรวจนับสต็อกจริง (Physical Count)
        </button>
        <button type="button" class="replenish-tab-btn ${currentSubTab === 'history' ? 'active' : ''}" onclick="setAuditSubTab('history')">
          📜 ประวัติการตรวจนับ (Batch History) <span style="margin-left:6px; font-size:11px; padding:2px 7px; border-radius:99px; background:rgba(56,189,248,0.2); color:#38bdf8; font-weight:800;">${(state.auditBatchHistory || []).length}</span>
        </button>
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        ${currentSubTab === 'history' ? `
          <button type="button" class="btn btn-primary" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-color:#fca5a5; font-weight:700;" onclick="exportAuditBatchHistoryPDF()" title="ส่งออก/พิมพ์รายงานประวัติการตรวจนับทั้งหมดเป็น PDF">
            📄 Export to PDF
          </button>
          <button type="button" class="btn btn-export-excel" style="padding:6px 12px; font-size:12px;" onclick="exportAuditBatchHistoryExcel()" title="ส่งออกประวัติการตรวจนับทั้งหมดเป็น Excel">
            📗 Excel ประวัติทั้งหมด
          </button>
          <button type="button" class="btn btn-primary" style="padding:6px 12px; font-size:12px;" onclick="setAuditSubTab('count')" title="เริ่มรอบการตรวจนับสต็อกใหม่">
            ➕ เริ่มรอบตรวจนับใหม่
          </button>
        ` : `
          <button type="button" class="btn btn-info" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg,#6366f1,#4f46e5); border-color:#818cf8;" onclick="openDiscrepancyReportModal()">
            📑 รายงานผลต่างปัจจุบัน
          </button>
        `}
      </div>
    </div>
  `;

  if (currentSubTab === "history") {
    el("content").innerHTML = `
      ${connectionNotice()}
      <section class="app-home" style="max-width: 1200px; margin: 0 auto;">
        ${subtabHeaderHtml}
        ${renderAuditBatchHistoryTab()}
      </section>
    `;
    return;
  }

  const analytics = getAuditAnalyticsData();
  const filter = state.auditFilter || "all";
  const search = state.auditSearch || "";
  const step = state.auditScanStep || 1;
  const lastScan = state.auditLastScanned;
  const untouchedCount = analytics.auditedList.filter(x => !state.auditTouched[x.product.id]).length;

  const filtered = analytics.auditedList.filter(item => {
    if(filter === "discrepancy" && item.diff === 0) return false;
    if(filter === "surplus" && item.diff <= 0) return false;
    if(filter === "shortage" && item.diff >= 0) return false;
    if(filter === "matched" && item.diff !== 0) return false;
    if(filter === "untouched" && state.auditTouched[item.product.id]) return false;

    if(!search) return true;
    const p = item.product;
    return (p.product_name || "").toLowerCase().includes(search) ||
           (p.product_code || "").toLowerCase().includes(search) ||
           (p.category || "").toLowerCase().includes(search) ||
           String(p.barcode || "").includes(search);
  });

  el("content").innerHTML = `
    ${connectionNotice()}
    <section class="app-home" style="max-width: 1200px; margin: 0 auto;">
      ${subtabHeaderHtml}
      
      <!-- Top Batch Scan Station -->
      <div class="audit-scan-station">
        <div class="audit-scan-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="audit-hud-icon" style="background:linear-gradient(135deg,#0284c7,#0369a1); color:#fff; border-color:#38bdf8;">
              🔍
            </div>
            <div>
              <h3 style="margin:0; font-size:16px; color:#f8fafc; font-weight:800;">สถานีสแกนตรวจนับสต็อกแบบกลุ่ม (Batch Scan Station)</h3>
              <p style="margin:2px 0 0; color:#94a3b8; font-size:12px;">สแกนบาร์โค้ดผ่านเครื่องอ่าน USB/Bluetooth หรือกล้องเพื่อตรวจนับต่อเนื่อง</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <!-- Bulk Add Toggle Mode in Header -->
            <div class="audit-mode-toggle-group">
              <button type="button" class="audit-mode-btn ${!state.auditBulkMode ? 'active' : ''}" onclick="toggleAuditBulkMode(false)" title="โหมดชิ้นเดี่ยว (Single Add)">
                ⚡ ชิ้นเดี่ยว (1x)
              </button>
              <button type="button" class="audit-mode-btn ${state.auditBulkMode ? 'bulk-active' : ''}" onclick="toggleAuditBulkMode(true)" title="โหมดเพิ่มเป็นชุด (Bulk Add)">
                📦 เพิ่มแบบกลุ่ม (Bulk Add)
              </button>
            </div>

            <button type="button" class="btn btn-primary" onclick="startAuditCameraScan()" style="background:linear-gradient(135deg,#06b6d4,#0284c7); border-color:#38bdf8; font-weight:700;">
              📷 เปิดกล้องสแกนสด
            </button>
            <button type="button" class="btn btn-info" onclick="openDiscrepancyReportModal()" style="background:linear-gradient(135deg,#6366f1,#4f46e5); border-color:#818cf8; font-weight:700;">
              📑 รายงานผลต่าง (Discrepancy)
            </button>
          </div>
        </div>

        <div class="audit-scan-inputs-row">
          <div class="audit-barcode-input-wrap">
            <svg class="audit-barcode-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8v8M10 8v8M14 8v8M18 8v8"></path>
            </svg>
            <input id="auditBarcodeInput" type="search" enterkeyhint="done" autocomplete="off" placeholder="สแกนบาร์โค้ด หรือพิมพ์รหัสสินค้า แล้วกด Enter..." onkeydown="handleAuditBarcodeInput(event)">
          </div>

          <!-- Quantity Input Field with Stepper Buttons and Quick Chips -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; font-weight:700; color:#94a3b8; white-space:nowrap;">
                ${state.auditBulkMode ? '📦 จำนวนนับต่อรอบ (Bulk Qty):' : '⚡ จำนวนต่อสแกน:'}
              </span>
              <div class="audit-qty-input-wrap ${state.auditBulkMode ? '' : 'single-mode'}">
                <button type="button" class="audit-qty-btn" onclick="stepAuditBulkQty(-1)" title="ลดจำนวน">−</button>
                <input type="number" id="auditScanQtyInput" class="audit-qty-field" min="1" max="9999" value="${step}" oninput="onAuditBulkQtyInput(this.value)" onchange="setAuditBulkQty(this.value)" title="ระบุจำนวนนับต่อการสแกน 1 ครั้ง">
                <button type="button" class="audit-qty-btn" onclick="stepAuditBulkQty(1)" title="เพิ่มจำนวน">+</button>
              </div>
            </div>

            <div class="audit-step-chips">
              ${[1, 5, 10, 12, 24, 50, 100].map(s => `
                <button type="button" class="audit-step-chip ${step === s ? 'active' : ''}" onclick="setAuditBulkQty(${s})" title="กำหนดจำนวน ${s} ชิ้น">${s > 1 ? '+' + s : '1x'}</button>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Last Scanned Product HUD Banner -->
        ${lastScan ? `
          <div class="audit-hud-banner">
            <div class="audit-hud-item">
              <div class="audit-hud-icon" style="color:#38bdf8;">✓</div>
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:11px; color:#38bdf8; font-weight:700;">สแกนล่าสุดเมื่อ ${lastScan.time} (+${lastScan.step} ${lastScan.product.unit||'ชิ้น'})</span>
                  ${lastScan.step > 1 ? `<span class="badge" style="background:rgba(139,92,246,0.3); color:#c4b5fd; font-size:10px; padding:2px 6px;">📦 Bulk +${lastScan.step}</span>` : ''}
                </div>
                <strong style="font-size:14px; color:#f8fafc;">${escapeHtml(lastScan.product.product_name)}</strong>
                <span style="font-size:12px; color:#94a3b8; margin-left:8px; font-family:monospace;">${escapeHtml(lastScan.product.barcode || lastScan.product.product_code || '-')}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="text-align:right;">
                <div style="font-size:11px; color:#94a3b8;">ยอดนับจริงล่าสุด: <b style="color:#38bdf8; font-size:15px;">${lastScan.newCount}</b> (ระบบ: ${lastScan.sysQty})</div>
                <span class="audit-diff-badge ${lastScan.diff === 0 ? 'zero' : (lastScan.diff > 0 ? 'plus' : 'minus')}">
                  ${lastScan.diff === 0 ? 'ตรงกับระบบ (0)' : (lastScan.diff > 0 ? `เกินระบบ +${lastScan.diff}` : `ขาดระบบ ${lastScan.diff}`)}
                </span>
              </div>
              <button type="button" class="mini-btn" onclick="undoAuditRecentScan(0)" title="ยกเลิกการสแกนล่าสุดนี้">↩️ Undo</button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Real-Time Discrepancy KPI Ribbon -->
      <div class="audit-summary-ribbon" style="margin-bottom: 16px;">
        <div class="audit-kpi-card">
          <span class="kpi-label">📦 สินค้าทั้งหมดที่ตรวจนับ</span>
          <div class="kpi-val">${analytics.totalItems} <small style="font-size:13px; font-weight:normal; color:#94a3b8;">รายการ</small></div>
          <div style="font-size:11.5px; color:#34d399; font-weight:700; margin-top:4px;">🎯 อัตราความตรง: ${analytics.accuracyRate}%</div>
        </div>

        <div class="audit-kpi-card matched">
          <span class="kpi-label">✓ นับตรงยอดในระบบ</span>
          <div class="kpi-val" style="color:#34d399;">${analytics.matchCount} <small style="font-size:13px; font-weight:normal;">รายการ</small></div>
          <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">สต็อกถูกต้องสมบูรณ์</div>
        </div>

        <div class="audit-kpi-card surplus">
          <span class="kpi-label">📈 ยอดเกินจากระบบ (+ Surplus)</span>
          <div class="kpi-val" style="color:#38bdf8;">${analytics.surplusCount} <small style="font-size:13px; font-weight:normal;">รายการ</small></div>
          <div style="font-size:11.5px; color:#38bdf8; font-weight:700; margin-top:4px;">+${analytics.totalSurplusUnits} ชิ้น (+฿${money(analytics.totalSurplusValue)})</div>
        </div>

        <div class="audit-kpi-card shortage">
          <span class="kpi-label">🚨 ยอดขาดจากระบบ (− Shortage / สูญหาย)</span>
          <div class="kpi-val" style="color:#fb7185;">${analytics.shortageCount} <small style="font-size:13px; font-weight:normal;">รายการ</small></div>
          <div style="font-size:11.5px; color:#fb7185; font-weight:700; margin-top:4px;">−${analytics.totalShortageUnits} ชิ้น (−฿${money(analytics.totalShortageValue)})</div>
        </div>

        <div class="audit-kpi-card" style="border-color:${analytics.netDiscrepancyValue >= 0 ? 'rgba(56,189,248,0.4)' : 'rgba(244,63,94,0.4)'};">
          <span class="kpi-label">⚖️ มูลค่าผลต่างสุทธิ (Net Variance)</span>
          <div class="kpi-val" style="color:${analytics.netDiscrepancyValue >= 0 ? '#38bdf8' : '#fb7185'}; font-size:18px;">
            ${analytics.netDiscrepancyValue >= 0 ? '+' : ''}฿${money(analytics.netDiscrepancyValue)}
          </div>
          <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">มีผลต่างรวม ${analytics.changedItemsCount} รายการ</div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="audit-toolbar" style="margin-bottom: 14px;">
        <div class="audit-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="audit-search-icon">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="auditSearchInput" type="search" placeholder="ค้นหาชื่อสินค้า / รหัส / Barcode เพื่อตรวจนับ..." value="${escapeHtml(state.auditSearch || '')}" oninput="onAuditSearch(this.value)">
        </div>

        <div class="audit-filter-pills">
          <button type="button" class="audit-pill-btn ${filter==='all'?'active':''}" onclick="setAuditFilter('all')">ทั้งหมด (${analytics.totalItems})</button>
          <button type="button" class="audit-pill-btn ${filter==='discrepancy'?'active':''}" onclick="setAuditFilter('discrepancy')">⚠️ มีผลต่าง (${analytics.changedItemsCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='shortage'?'active':''}" onclick="setAuditFilter('shortage')">🚨 ขาด (${analytics.shortageCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='surplus'?'active':''}" onclick="setAuditFilter('surplus')">📈 เกิน (${analytics.surplusCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='matched'?'active':''}" onclick="setAuditFilter('matched')">✓ ตรง (${analytics.matchCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='untouched'?'active':''}" onclick="setAuditFilter('untouched')" title="สินค้าที่ยังไม่ได้สแกน/นับ (ใช้ยอดระบบอยู่)">⏳ ยังไม่นับ (${untouchedCount})</button>
        </div>

        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn btn-light" style="padding:6px 12px; font-size:12px;" onclick="setAllAuditToSystem()" title="คืนค่าทั้งหมดให้ตรงกับระบบ">🔄 รีเซ็ตตรงระบบ</button>
          <button type="button" class="btn btn-light" style="padding:6px 12px; font-size:12px;" onclick="setAllAuditToZero()" title="ตั้งค่ายอดนับทั้งหมดเป็น 0">0️⃣ ตั้งนับเป็น 0</button>
          <button type="button" class="btn btn-export-excel" style="padding:6px 12px; font-size:12px;" onclick="exportStockAuditExcel()" title="ส่งออกรายงานตรวจนับสต็อกเป็น Excel">📗 Excel</button>
          <button type="button" class="btn btn-file-csv" style="padding:6px 12px; font-size:12px;" onclick="exportStockAuditCSV()" title="ส่งออกรายงานตรวจนับสต็อกเป็น CSV">📄 CSV</button>
          <button type="button" class="btn btn-info" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg,#0284c7,#0369a1);" onclick="printDiscrepancyReport()" title="พิมพ์ใบสรุปผลต่างสต็อก A4">🖨️ พิมพ์รายงาน</button>
        </div>
      </div>

      <!-- Discrepancy & Reconciliation Table -->
      <div class="audit-table-wrap" style="max-height: 52vh; margin-bottom:16px;">
        <table class="audit-table audit-table--page">
          <thead>
            <tr>
              <th style="width:75px;">รหัส</th>
              <th>สินค้า / Barcode</th>
              <th style="width:100px; text-align:right;">ราคาขาย</th>
              <th style="width:110px; text-align:center;">ยอดในระบบ (Digital)</th>
              <th style="width:200px; text-align:center;">ยอดนับจริง (Physical Count)</th>
              <th style="width:120px; text-align:center;">ผลต่างจำนวน (Diff)</th>
              <th style="width:110px; text-align:right;">ผลต่างมูลค่า</th>
              <th style="width:110px; text-align:center;">สถานะ</th>
              <th style="width:70px; text-align:center;">รีเซ็ต</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length > 0 ? filtered.map(item => {
              const p = item.product;
              const isDiff = item.diff !== 0;
              const diffClass = item.diff === 0 ? "zero" : (item.diff > 0 ? "plus" : "minus");
              const diffText = item.diff === 0 ? "ตรงกัน (0)" : (item.diff > 0 ? `+${item.diff}` : `${item.diff}`);
              const rowClass = item.diff > 0 ? "row-surplus" : (item.diff < 0 ? "row-shortage" : "");

              return `
                <tr class="${rowClass}${state.auditTouched[p.id] ? ' is-counted' : ' is-untouched'}">
                  <td><code style="color:#94a3b8; font-size:12px;">${escapeHtml(p.product_code || "-")}</code></td>
                  <td>
                    <div style="font-weight:700; color:#f1f5f9; font-size:13.5px;">${escapeHtml(p.product_name)}</div>
                    <div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">
                      🏷️ ${escapeHtml(p.barcode || "-")} • ${escapeHtml(p.category || "ทั่วไป")}
                    </div>
                  </td>
                  <td style="text-align:right; font-weight:700; color:#cbd5e1;">฿${money(auditUnitPrice(p))}</td>
                  <td style="text-align:center; font-weight:800; color:#94a3b8; font-size:14px;">
                    ${item.sysQty} <small style="font-size:11px; font-weight:normal;">${escapeHtml(p.unit||"ชิ้น")}</small>
                  </td>
                  <td style="text-align:center;">
                    <div class="audit-count-control">
                      <button type="button" class="audit-step-btn" onclick="stepAuditCount('${p.id}', -1)" title="ลด 1">−</button>
                      <input type="number" min="0" class="audit-count-input" value="${item.countQty}" inputmode="numeric" onfocus="this.select()" oninput="updateAuditCount('${p.id}', this.value, false)" onchange="updateAuditCount('${p.id}', this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                      <button type="button" class="audit-step-btn" onclick="stepAuditCount('${p.id}', 1)" title="เพิ่ม 1">+</button>
                      <button type="button" class="audit-step-btn" style="width:auto; padding:0 6px; font-size:11px;" onclick="stepAuditCount('${p.id}', 5)" title="เพิ่ม 5">+5</button>
                    </div>
                    ${state.auditTouched[p.id] ? '' : '<div class="audit-untouched-hint">ยังไม่นับ • ใช้ยอดระบบ</div>'}
                  </td>
                  <td style="text-align:center;">
                    <span class="audit-diff-badge ${diffClass}" style="font-size:12px; padding:4px 9px;">${diffText} ${escapeHtml(p.unit||"ชิ้น")}</span>
                  </td>
                  <td style="text-align:right; font-weight:800; color:${item.diffVal === 0 ? '#34d399' : (item.diffVal > 0 ? '#38bdf8' : '#fb7185')};">
                    ${item.diffVal > 0 ? '+' : ''}฿${money(item.diffVal)}
                  </td>
                  <td style="text-align:center;">
                    ${item.diff === 0 ? '<span class="badge" style="background:rgba(16,185,129,0.2); color:#34d399; font-size:11px;">✓ ตรงกัน</span>' : 
                      (item.diff > 0 ? '<span class="badge" style="background:rgba(2,132,199,0.2); color:#38bdf8; font-size:11px;">📈 เกินระบบ</span>' : 
                      '<span class="badge" style="background:rgba(225,29,72,0.2); color:#fb7185; font-size:11px;">🚨 ขาดจากระบบ</span>')}
                  </td>
                  <td style="text-align:center;">
                    ${isDiff ? `<button type="button" class="mini-btn" onclick="resetAuditProductToSystem('${p.id}')" title="คืนค่ายอดนับให้ตรงระบบ">คืนค่า</button>` : `<span style="color:#64748b; font-size:11px;">-</span>`}
                  </td>
                </tr>
              `;
            }).join("") : `
              <tr>
                <td colspan="9" style="text-align:center; padding:35px; color:#64748b;">
                  ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Action Footer with Auto-Adjustment & Reconciliation Engine -->
      <div class="audit-footer-actions" style="background:#0f1723; padding:16px; border-radius:12px; border:1.5px solid #1e2c3e;">
        <div style="display:flex; align-items:center; gap:10px; flex:1; flex-wrap:wrap;">
          <label style="font-size:13px; font-weight:700; color:#cbd5e1; white-space:nowrap;">บันทึกเหตุผลการกระทบยอด:</label>
          <input id="auditNoteInput" class="audit-note-input" placeholder="ระบุเหตุผล เช่น ตรวจนับสิ้นวัน, สินค้าชำรุดเสียหาย, ตรวจนับประจำเดือน..." value="${escapeHtml(state.auditNote || '')}">
        </div>

        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn btn-light" onclick="openDiscrepancyReportModal()">
            📋 ดูรายงานสรุปผลต่าง
          </button>
          <button type="button" class="btn btn-primary" onclick="applyStockAuditAdjustments()" style="font-weight:800; font-size:14px; padding:10px 20px; background:linear-gradient(135deg, #059669 0%, #047857 100%); border-color:#34d399; box-shadow:0 4px 14px rgba(5,150,105,0.4);" ${analytics.changedItemsCount === 0 ? 'disabled' : ''}>
            🚀 บันทึกกระทบยอด & ปรับสต็อกอัตโนมัติ (${analytics.changedItemsCount} รายการ)
          </button>
        </div>
      </div>

    </section>
  `;

  // โฟกัส: คืนโฟกัสให้ช่องที่ผู้ใช้กำลังใช้ / บนแท็บเล็ต (จอสัมผัส) ไม่บังคับโฟกัสช่องสแกน เพื่อไม่ให้คีย์บอร์ดเด้งทุกครั้งที่กดปุ่ม
  const focusTarget = state.auditFocusTarget;
  state.auditFocusTarget = null;
  if(focusTarget){
    const t = el(focusTarget);
    if(t){
      t.focus();
      if(focusTarget === "auditSearchInput"){ const len = t.value.length; try{ t.setSelectionRange(len, len); }catch(_){} }
    }
  }
  setTimeout(() => {
    if(state.page !== "audit" || focusTarget) return;
    const ae = document.activeElement;
    if(ae && ae !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    if(document.querySelector("dialog[open]")) return;
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if(!coarse) el("auditBarcodeInput")?.focus();
  }, 50);
}

function renderStockAuditModalContent(){
  const body = el("modalBody");
  if(!body) return;

  initPhysicalAuditState(false);
  const analytics = getAuditAnalyticsData();
  const filter = state.auditFilter || "all";
  const search = state.auditSearch || "";

  const filtered = analytics.auditedList.filter(item => {
    if(filter === "discrepancy" && item.diff === 0) return false;
    if(filter === "surplus" && item.diff <= 0) return false;
    if(filter === "shortage" && item.diff >= 0) return false;
    if(filter === "matched" && item.diff !== 0) return false;

    if(!search) return true;
    const p = item.product;
    return (p.product_name || "").toLowerCase().includes(search) ||
           (p.product_code || "").toLowerCase().includes(search) ||
           String(p.barcode || "").includes(search);
  });

  body.innerHTML = `
    <div class="audit-modal-body">
      
      <!-- Summary Ribbon -->
      <div class="audit-summary-ribbon">
        <div class="audit-kpi-card">
          <span class="kpi-label">📦 สินค้าทั้งหมด</span>
          <span class="kpi-val">${analytics.totalItems} รายการ</span>
        </div>
        <div class="audit-kpi-card matched">
          <span class="kpi-label">✓ นับตรงระบบ</span>
          <span class="kpi-val" style="color:#34d399;">${analytics.matchCount} รายการ</span>
        </div>
        <div class="audit-kpi-card surplus">
          <span class="kpi-label">+ ยอดเกินระบบ</span>
          <span class="kpi-val" style="color:#38bdf8;">${analytics.surplusCount} รายการ</span>
        </div>
        <div class="audit-kpi-card shortage">
          <span class="kpi-label">− ยอดขาดจากระบบ</span>
          <span class="kpi-val" style="color:#fb7185;">${analytics.shortageCount} รายการ</span>
        </div>
      </div>

      <!-- Controls & Search Toolbar -->
      <div class="audit-toolbar">
        <div class="audit-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="audit-search-icon">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="auditSearchInput" type="search" placeholder="ค้นหาสินค้า / รหัส / Barcode เพื่อตรวจนับ..." value="${escapeHtml(state.auditSearch || '')}" oninput="onAuditSearch(this.value)">
        </div>

        <div class="audit-filter-pills">
          <button type="button" class="audit-pill-btn ${filter==='all'?'active':''}" onclick="setAuditFilter('all')">ทั้งหมด (${analytics.totalItems})</button>
          <button type="button" class="audit-pill-btn ${filter==='discrepancy'?'active':''}" onclick="setAuditFilter('discrepancy')">⚠️ มีผลต่าง (${analytics.changedItemsCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='surplus'?'active':''}" onclick="setAuditFilter('surplus')">+ เกิน (${analytics.surplusCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='shortage'?'active':''}" onclick="setAuditFilter('shortage')">− ขาด (${analytics.shortageCount})</button>
          <button type="button" class="audit-pill-btn ${filter==='matched'?'active':''}" onclick="setAuditFilter('matched')">✓ ตรง (${analytics.matchCount})</button>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn btn-light" style="padding:5px 10px; font-size:11.5px;" onclick="setAllAuditToSystem()" title="คืนค่าทั้งหมดให้ตรงกับระบบ">🔄 รีเซ็ตทั้งหมด</button>
          <button type="button" class="btn btn-export-excel" style="padding:5px 10px; font-size:11.5px;" onclick="exportStockAuditExcel()" title="ส่งออกใบนับสต็อกเป็น Excel">📗 Excel</button>
          <button type="button" class="btn btn-file-csv" style="padding:5px 10px; font-size:11.5px;" onclick="exportStockAuditCSV()" title="ส่งออกใบนับสต็อกเป็น CSV">📄 CSV</button>
        </div>
      </div>

      <!-- Audit Items Table -->
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th style="width:70px;">รหัส</th>
              <th>สินค้า / Barcode</th>
              <th style="width:100px; text-align:center;">ยอดในระบบ</th>
              <th style="width:180px; text-align:center;">ยอดนับจริง (Count)</th>
              <th style="width:110px; text-align:center;">ผลต่าง (Diff)</th>
              <th style="width:80px; text-align:center;">รีเซ็ต</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length > 0 ? filtered.map(item => {
              const p = item.product;
              const isDiff = item.diff !== 0;
              const diffClass = item.diff === 0 ? "zero" : (item.diff > 0 ? "plus" : "minus");
              const diffText = item.diff === 0 ? "ตรงกัน (0)" : (item.diff > 0 ? `+${item.diff}` : `${item.diff}`);
              const rowClass = item.diff > 0 ? "row-surplus" : (item.diff < 0 ? "row-shortage" : "");

              return `
                <tr class="${rowClass}">
                  <td><code style="color:#94a3b8; font-size:11.5px;">${escapeHtml(p.product_code || "-")}</code></td>
                  <td>
                    <div style="font-weight:700; color:#f1f5f9;">${escapeHtml(p.product_name)}</div>
                    <div style="font-size:11px; color:#64748b; font-family:monospace;">${escapeHtml(p.barcode || "-")} • ฿${money(auditUnitPrice(p))}/${escapeHtml(p.unit||"ชิ้น")}</div>
                  </td>
                  <td style="text-align:center; font-weight:800; color:#94a3b8; font-size:14px;">
                    ${item.sysQty} <small style="font-size:10px; font-weight:normal;">${escapeHtml(p.unit||"ชิ้น")}</small>
                  </td>
                  <td style="text-align:center;">
                    <div class="audit-count-control">
                      <button type="button" class="audit-step-btn" onclick="stepAuditCount('${p.id}', -1)" title="ลด 1">−</button>
                      <input type="number" min="0" class="audit-count-input" value="${item.countQty}" inputmode="numeric" onfocus="this.select()" oninput="updateAuditCount('${p.id}', this.value, false)" onchange="updateAuditCount('${p.id}', this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                      <button type="button" class="audit-step-btn" onclick="stepAuditCount('${p.id}', 1)" title="เพิ่ม 1">+</button>
                      <button type="button" class="audit-step-btn" style="width:auto; padding:0 6px; font-size:11px;" onclick="stepAuditCount('${p.id}', 5)" title="เพิ่ม 5">+5</button>
                    </div>
                  </td>
                  <td style="text-align:center;">
                    <span class="audit-diff-badge ${diffClass}">${diffText}</span>
                  </td>
                  <td style="text-align:center;">
                    ${isDiff ? `<button type="button" class="mini-btn" onclick="resetAuditProductToSystem('${p.id}')" title="คืนค่ายอดนับให้ตรงระบบ">คืนค่า</button>` : `<span style="color:#64748b; font-size:11px;">-</span>`}
                  </td>
                </tr>
              `;
            }).join("") : `
              <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#64748b;">
                  ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Action Footer with Auto-Adjustment Engine -->
      <div class="audit-footer-actions">
        <div style="display:flex; align-items:center; gap:10px; flex:1; flex-wrap:wrap;">
          <label style="font-size:12px; font-weight:700; color:#94a3b8; white-space:nowrap;">เหตุผลในการปรับยอด:</label>
          <input id="auditNoteInput" class="audit-note-input" placeholder="ระบุเหตุผล เช่น ตรวจนับสต็อกสิ้นวัน, สินค้าชำรุด..." value="${escapeHtml(state.auditNote || '')}">
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn btn-light" onclick="closeProductModal()">ยกเลิก</button>
          <button type="button" class="btn btn-primary" onclick="applyStockAuditAdjustments()" style="font-weight:800; background:linear-gradient(135deg, #059669 0%, #047857 100%); border-color:#34d399;" ${analytics.changedItemsCount === 0 ? 'disabled' : ''}>
            🚀 บันทึกปรับยอดอัตโนมัติ (${analytics.changedItemsCount} รายการ)
          </button>
        </div>
      </div>

    </div>
  `;
}

// -------------------------------------------------------------
// Discrepancy Report Modal & Printing Engine
// -------------------------------------------------------------

function openDiscrepancyReportModal(){
  const analytics = getAuditAnalyticsData();
  const dateStr = todayISO();
  const timeStr = new Date().toLocaleTimeString();

  const discrepancies = analytics.auditedList.filter(x => x.diff !== 0);

  const m = el("modal");
  if(!m) return;
  el("modalTitle").textContent = "📋 รายงานผลต่างการตรวจนับสต็อกจริง (Discrepancy Report)";

  const body = el("modalBody");
  if(body){
    body.innerHTML = `
      <div style="max-height: 80vh; overflow-y: auto; padding: 4px;">
        
        <!-- Header Summary Sheet -->
        <div style="background:#0f172a; border:1.5px solid #334155; border-radius:12px; padding:18px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #334155; padding-bottom:12px; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="margin:0; color:#f8fafc; font-size:18px; font-weight:800;">รายงานผลต่างการตรวจนับสินค้าจริงเทียบระบบ</h3>
              <p style="margin:4px 0 0; color:#94a3b8; font-size:12.5px;">จุดขาย: <b>${escapeHtml(state.terminal || 'POS-01')}</b> • วันที่: <b>${dateStr} ${timeStr}</b></p>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:${analytics.accuracyRate >= 95 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${analytics.accuracyRate >= 95 ? '#34d399' : '#f87171'}; font-size:13px; font-weight:800; padding:6px 12px;">
                ความแม่นยำสต็อก: ${analytics.accuracyRate}%
              </span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#94a3b8;">รายการสินค้าทั้งหมด</div>
              <div style="font-size:16px; font-weight:800; color:#f8fafc; margin-top:2px;">${analytics.totalItems} รายการ</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#34d399;">นับตรงกับระบบ</div>
              <div style="font-size:16px; font-weight:800; color:#34d399; margin-top:2px;">${analytics.matchCount} รายการ</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#fb7185;">ยอดขาด (Shrinkage Loss)</div>
              <div style="font-size:16px; font-weight:800; color:#fb7185; margin-top:2px;">−${analytics.totalShortageUnits} ชิ้น (−฿${money(analytics.totalShortageValue)})</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#38bdf8;">ยอดเกิน (Surplus Gain)</div>
              <div style="font-size:16px; font-weight:800; color:#38bdf8; margin-top:2px;">+${analytics.totalSurplusUnits} ชิ้น (+฿${money(analytics.totalSurplusValue)})</div>
            </div>
          </div>
        </div>

        <!-- Discrepancies Table -->
        <h4 style="margin:0 0 8px; color:#f8fafc; font-size:14px; font-weight:700;">
          ${discrepancies.length > 0 ? `รายการที่พบผลต่าง (${discrepancies.length} รายการ)` : `✅ ไม่พบรายการที่มีผลต่าง สต็อกตรงกับระบบ 100%`}
        </h4>

        ${discrepancies.length > 0 ? `
          <div class="audit-table-wrap" style="max-height: 280px; overflow-y: auto; margin-bottom: 16px;">
            <table class="audit-table">
              <thead>
                <tr>
                  <th>รหัส / Barcode</th>
                  <th>ชื่อสินค้า</th>
                  <th style="text-align:center;">ยอดในระบบ</th>
                  <th style="text-align:center;">ยอดนับจริง</th>
                  <th style="text-align:center;">ผลต่าง (Units)</th>
                  <th style="text-align:right;">ผลกระทบมูลค่า (฿)</th>
                  <th style="text-align:center;">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${discrepancies.map(item => `
                  <tr class="${item.diff > 0 ? 'row-surplus' : 'row-shortage'}">
                    <td>
                      <code style="color:#94a3b8;">${escapeHtml(item.product.product_code || '-')}</code>
                      <div style="font-size:10.5px; color:#64748b; font-family:monospace;">${escapeHtml(item.product.barcode || '-')}</div>
                    </td>
                    <td><strong style="color:#f8fafc;">${escapeHtml(item.product.product_name)}</strong></td>
                    <td style="text-align:center; color:#94a3b8;">${item.sysQty} ${escapeHtml(item.product.unit||'ชิ้น')}</td>
                    <td style="text-align:center; font-weight:800; color:#38bdf8;">${item.countQty} ${escapeHtml(item.product.unit||'ชิ้น')}</td>
                    <td style="text-align:center;">
                      <span class="audit-diff-badge ${item.diff > 0 ? 'plus' : 'minus'}">
                        ${item.diff > 0 ? '+' : ''}${item.diff} ${escapeHtml(item.product.unit||'ชิ้น')}
                      </span>
                    </td>
                    <td style="text-align:right; font-weight:800; color:${item.diffVal > 0 ? '#38bdf8' : '#fb7185'};">
                      ${item.diffVal > 0 ? '+' : ''}฿${money(item.diffVal)}
                    </td>
                    <td style="text-align:center;">
                      ${item.diff > 0 ? '<span style="color:#38bdf8; font-weight:700; font-size:11.5px;">📈 สต็อกเกิน</span>' : '<span style="color:#fb7185; font-weight:700; font-size:11.5px;">🚨 สต็อกขาด</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="text-align:center; padding:24px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; margin-bottom:16px;">
            <p style="color:#34d399; font-weight:800; font-size:15px; margin:0 0 4px;">🎉 สต็อกสมบูรณ์ ไม่พบผลต่างใดๆ</p>
            <p style="color:#94a3b8; font-size:12px; margin:0;">ยอดนับจริงตรงกับฐานข้อมูลในระบบทุกรายการ</p>
          </div>
        `}

        <!-- Signature Block -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; background:#0f172a; padding:16px; border-radius:10px; border:1px solid #334155; margin-bottom:16px;">
          <div style="border-top:1px dashed #64748b; padding-top:8px; margin-top:24px; text-align:center;">
            <div style="font-size:12px; color:#94a3b8;">ลงชื่อ ............................................................ ผู้ตรวจนับ</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
          </div>
          <div style="border-top:1px dashed #64748b; padding-top:8px; margin-top:24px; text-align:center;">
            <div style="font-size:12px; color:#94a3b8;">ลงชื่อ ............................................................ ผู้จัดการ / ผู้อนุมัติ</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-light" onclick="closeProductModal()">ปิดหน้าต่าง</button>
          <button type="button" class="btn btn-export-excel" onclick="exportStockAuditExcel()">📗 ส่งออก Excel</button>
          <button type="button" class="btn btn-info" onclick="printDiscrepancyReport()" style="background:linear-gradient(135deg,#0284c7,#0369a1);">🖨️ พิมพ์เอกสาร A4</button>
        </div>

      </div>
    `;
    m.showModal();
  }
}

function printDiscrepancyReport(){
  const analytics = getAuditAnalyticsData();
  const dateStr = todayISO();
  const timeStr = new Date().toLocaleTimeString();
  const discrepancies = analytics.auditedList.filter(x => x.diff !== 0);

  const printWindow = window.open('', '_blank');
  if(!printWindow){
    toast("กรุณาอนุญาตให้เปิดหน้าต่างพิมพ์ (Pop-up)");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>ใบรายงานผลต่างการตรวจนับสต็อกจริง - ${dateStr}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: bold; color: #0f172a; }
        .meta { font-size: 12px; color: #475569; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        .kpi-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
        .kpi-box .label { font-size: 11px; color: #64748b; font-weight: bold; }
        .kpi-box .val { font-size: 15px; font-weight: bold; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; color: #334155; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .shortage { background: #fef2f2; }
        .surplus { background: #f0fdf4; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">📋 รายงานผลต่างการตรวจนับสินค้าจริง (Physical Inventory Discrepancy Report)</div>
          <div class="meta">ระบบ: EA Fair Sale • จุดขาย: <b>${escapeHtml(state.terminal || 'POS-01')}</b></div>
        </div>
        <div style="text-align: right;">
          <div class="meta">วันที่: <b>${dateStr}</b> เวลา: <b>${timeStr}</b></div>
          <div class="meta">อัตราความแม่นยำ: <b>${analytics.accuracyRate}%</b></div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="label">สินค้าทั้งหมด</div>
          <div class="val">${analytics.totalItems} รายการ</div>
        </div>
        <div class="kpi-box">
          <div class="label">นับตรงระบบ</div>
          <div class="val" style="color:#16a34a;">${analytics.matchCount} รายการ</div>
        </div>
        <div class="kpi-box">
          <div class="label">ยอดขาด (Shrinkage Loss)</div>
          <div class="val" style="color:#dc2626;">−${analytics.totalShortageUnits} ชิ้น (−฿${money(analytics.totalShortageValue)})</div>
        </div>
        <div class="kpi-box">
          <div class="label">ยอดเกิน (Surplus Gain)</div>
          <div class="val" style="color:#0284c7;">+${analytics.totalSurplusUnits} ชิ้น (+฿${money(analytics.totalSurplusValue)})</div>
        </div>
      </div>

      <h4>รายการที่พบผลต่าง (${discrepancies.length} รายการ)</h4>
      <table>
        <thead>
          <tr>
            <th style="width:60px;">รหัส</th>
            <th style="width:100px;">Barcode</th>
            <th>ชื่อสินค้า</th>
            <th class="text-right" style="width:70px;">ราคาขาย</th>
            <th class="text-center" style="width:75px;">ยอดในระบบ</th>
            <th class="text-center" style="width:75px;">ยอดนับจริง</th>
            <th class="text-center" style="width:80px;">ผลต่าง</th>
            <th class="text-right" style="width:90px;">มูลค่าผลต่าง</th>
            <th class="text-center" style="width:80px;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${discrepancies.length > 0 ? discrepancies.map(d => `
            <tr class="${d.diff > 0 ? 'surplus' : 'shortage'}">
              <td>${escapeHtml(d.product.product_code || '-')}</td>
              <td style="font-family:monospace;">${escapeHtml(d.product.barcode || '-')}</td>
              <td><b>${escapeHtml(d.product.product_name)}</b></td>
              <td class="text-right">฿${money(auditUnitPrice(d.product))}</td>
              <td class="text-center">${d.sysQty}</td>
              <td class="text-center"><b>${d.countQty}</b></td>
              <td class="text-center"><b>${d.diff > 0 ? '+' : ''}${d.diff}</b> ${escapeHtml(d.product.unit||'ชิ้น')}</td>
              <td class="text-right"><b>${d.diffVal > 0 ? '+' : ''}฿${money(d.diffVal)}</b></td>
              <td class="text-center">${d.diff > 0 ? 'เกิน' : 'ขาด'}</td>
            </tr>
          `).join('') : `
            <tr><td colspan="9" class="text-center" style="padding:20px;">ไม่พบรายการที่มีผลต่าง สต็อกตรงกับระบบ 100%</td></tr>
          `}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <div>ลงชื่อ ............................................................ ผู้ตรวจนับสต็อก</div>
          <div style="font-size:11px; margin-top:4px;">วันที่: ..... / ..... / .........</div>
        </div>
        <div class="sig-box">
          <div>ลงชื่อ ............................................................ ผู้จัดการ / ผู้อนุมัติ</div>
          <div style="font-size:11px; margin-top:4px;">วันที่: ..... / ..... / .........</div>
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

async function applyStockAuditAdjustments(){
  initPhysicalAuditState(false);
  const counts = state.auditCounts || {};
  const noteInput = el("auditNoteInput");
  const note = (noteInput ? noteInput.value : state.auditNote) || "ปรับยอดจากการตรวจนับสต็อกจริง (Physical Audit)";
  if(noteInput) state.auditNote = noteInput.value;

  const adjustments = [];
  (state.products || []).forEach(p => {
    const sysQty = Number(p.stock_qty || 0);
    const newQty = Number(counts[p.id] !== undefined ? counts[p.id] : sysQty);
    if(sysQty !== newQty){
      adjustments.push({ product: p, oldQty: sysQty, newQty, diff: newQty - sysQty });
    }
  });

  if(adjustments.length === 0){
    toast("✅ ยอดนับจริงตรงกับในระบบทุกรายการ ไม่จำเป็นต้องปรับยอด");
    return;
  }

  const untouchedCount = (state.products || []).filter(p => !state.auditTouched[p.id]).length;
  const confirmMsg = `ยืนยันปรับสต็อกตามยอดนับจริง ${adjustments.length} รายการ?` +
    (untouchedCount > 0 ? `\n\n(สินค้าที่ยังไม่ได้นับ ${untouchedCount} รายการ จะคงยอดตามระบบ)` : "");
  if(!window.confirm(confirmMsg)) return;

  // สรุปผลต่าง "ก่อน" ปรับสต็อก (เดิมคำนวณหลังปรับ ทำให้ประวัติขึ้นว่าตรง 100% ทุกครั้ง)
  const analytics = getAuditAnalyticsData();
  const now = new Date();
  const dateStr = todayISO();
  const timeStr = now.toTimeString().slice(0,8);

  let scanHistoryLogs = (state.auditSessionScanLogs || []).slice();
  if (scanHistoryLogs.length === 0) {
    let seq = 1;
    scanHistoryLogs = (state.products || []).filter(p => state.auditTouched[p.id]).map((p) => {
      const sysQty = Number(p.stock_qty || 0);
      const countQty = Number(counts[p.id] !== undefined ? counts[p.id] : sysQty);
      return {
        scanOrder: seq++, timestamp: `${dateStr} ${timeStr}`, timeStr,
        productId: p.id, productCode: p.product_code || "-", barcode: p.barcode || "-",
        productName: p.product_name, unit: p.unit || "ชิ้น", unitPrice: auditUnitPrice(p),
        step: countQty, previousCount: 0, newCount: countQty, sysQty, diff: countQty - sysQty,
        scanMethod: "📋 บันทึกตรวจนับรวม"
      };
    });
  }

  let successCount = 0;
  const failed = [];
  const online = !!(sb && !state.isOffline);

  for(const adj of adjustments){
    const p = adj.product;
    const qtyChange = adj.diff;

    if(online){
      try {
        const { error } = await sb.rpc("ea_update_stock", {
          p_product_id: p.id, p_type: "ADJUST", p_qty: adj.newQty, p_note: note
        });
        if(error) throw error;
      } catch (ex) {
        console.warn("Audit remote stock update failed for", p.product_name, ex);
        failed.push({ adj, message: ex?.message || String(ex) });
        continue; // ไม่แก้ยอดในเครื่องถ้าเซิร์ฟเวอร์ไม่รับ เพื่อไม่ให้ยอดสองฝั่งไม่ตรงกัน
      }
    }

    p.stock_qty = adj.newQty;
    state.movements.unshift({
      id: "audit-move-" + Date.now() + "-" + Math.random().toString(36).substring(2,6),
      product_id: p.id,
      product_name: p.product_name,
      movement_type: "ADJUST",
      qty_change: qtyChange,
      note: `${note} (${qtyChange > 0 ? '+' : ''}${qtyChange} ${p.unit || 'ชิ้น'})`,
      movement_date: dateStr,
      movement_time: timeStr,
      created_at: now.toISOString()
    });
    delete state.auditTouched[p.id];
    successCount++;
  }

  if(successCount === 0){
    toast(`❌ ปรับสต็อกไม่สำเร็จ (${failed[0]?.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"}) ยอดนับยังอยู่ ลองกดบันทึกอีกครั้ง`, 6000);
    rerenderAuditView();
    return;
  }

  const failedIds = new Set(failed.map(f => f.adj.product.id));
  let status = "matched";
  let statusLabel = "✓ ตรงกับระบบ 100% (นับครบถ้วน)";
  if (analytics.shortageCount > 0 && analytics.surplusCount > 0) {
    status = "discrepancy";
    statusLabel = `⚠️ มีผลต่างสุทธิ (ขาด -${analytics.totalShortageUnits} / เกิน +${analytics.totalSurplusUnits})`;
  } else if (analytics.shortageCount > 0) {
    status = "shortage";
    statusLabel = `🚨 มีผลต่าง - สต็อกขาด -${analytics.totalShortageUnits} ชิ้น (-฿${money(analytics.totalShortageValue)})`;
  } else if (analytics.surplusCount > 0) {
    status = "surplus";
    statusLabel = `📈 มีผลต่าง - สต็อกเกิน +${analytics.totalSurplusUnits} ชิ้น (+฿${money(analytics.totalSurplusValue)})`;
  }

  const batchRecord = {
    id: "batch-aud-" + Date.now(),
    batchNo: "AUD-" + dateStr.replace(/-/g, "") + "-" + String((state.auditBatchHistory || []).length + 1).padStart(3, "0"),
    auditDate: `${dateStr} ${timeStr.slice(0, 5)}`,
    auditor: `${state.terminal || 'POS-01'} (${state.settings?.shopName || 'ผู้ตรวจนับ'})`,
    terminal: state.terminal || "POS-01",
    totalItems: analytics.totalItems,
    matchCount: analytics.matchCount,
    surplusCount: analytics.surplusCount,
    shortageCount: analytics.shortageCount,
    totalSurplusUnits: analytics.totalSurplusUnits,
    totalShortageUnits: analytics.totalShortageUnits,
    totalSurplusValue: analytics.totalSurplusValue,
    totalShortageValue: analytics.totalShortageValue,
    netDiscrepancyValue: analytics.netDiscrepancyValue,
    accuracyRate: analytics.accuracyRate,
    status,
    statusLabel: failed.length ? `${statusLabel} • ปรับไม่สำเร็จ ${failed.length} รายการ` : statusLabel,
    note,
    itemsDetail: analytics.auditedList.filter(x => x.diff !== 0 && !failedIds.has(x.product.id)).map(x => ({
      productCode: x.product.product_code || "-",
      barcode: x.product.barcode || "-",
      productName: x.product.product_name,
      unit: x.product.unit || "ชิ้น",
      unitPrice: auditUnitPrice(x.product),
      sysQty: x.sysQty,
      countQty: x.countQty,
      diff: x.diff,
      diffVal: x.diffVal,
      status: x.diff > 0 ? "surplus" : "shortage"
    })),
    scanHistory: scanHistoryLogs
  };

  if (!Array.isArray(state.auditBatchHistory)) state.auditBatchHistory = [];
  state.auditBatchHistory.unshift(batchRecord);

  // เริ่มรอบนับใหม่ (คงยอดนับของรายการที่ปรับไม่สำเร็จไว้ให้กดบันทึกซ้ำ)
  state.auditSessionScanLogs = [];
  state.auditRecentScans = [];
  state.auditLastScanned = null;
  (state.products || []).forEach(p => {
    if(!failedIds.has(p.id)){ state.auditCounts[p.id] = Number(p.stock_qty || 0); delete state.auditTouched[p.id]; }
  });

  saveLocalState();
  if(el("modal")?.open && state.page !== "audit") closeProductModal();
  checkAndNotifyLowStock();
  render();
  if(state.page === "audit") renderPhysicalAuditPage();
  else if(state.page === "stock") renderStock();
  // แจ้งผลหลังสุด เพื่อไม่ให้ถูกข้อความเตือนสต็อกต่ำทับ
  if(failed.length){
    toast(`⚠️ ปรับสต็อกสำเร็จ ${successCount} รายการ • ไม่สำเร็จ ${failed.length} รายการ (${failed[0].message}) ยอดนับที่เหลือยังอยู่ กดบันทึกซ้ำได้`, 7000);
  } else {
    toast(`✅ บันทึกกระทบยอดสต็อกสำเร็จ ${successCount} รายการ${online ? "" : " (ออฟไลน์: ปรับเฉพาะในเครื่องนี้)"} และลงบันทึก Batch History แล้ว`);
  }
}

function setAuditSubTab(tab){
  state.auditSubTab = tab;
  if(state.page === "audit") renderPhysicalAuditPage();
}

function setAuditHistoryFilterStatus(status){
  state.auditHistoryFilterStatus = status;
  if(state.page === "audit") renderPhysicalAuditPage();
}

function onAuditHistorySearchInput(val){
  state.auditHistorySearch = String(val || "").trim().toLowerCase();
  if(state.page === "audit") renderPhysicalAuditPage();
}

function openAuditBatchDetailModal(batchId, activeTab = "discrepancies"){
  const batch = (state.auditBatchHistory || []).find(b => b.id === batchId);
  if(!batch){
    toast("ไม่พบประวัติการตรวจนับนี้");
    return;
  }

  const m = el("modal");
  if(!m) return;
  el("modalTitle").textContent = `📋 ประวัติ & รายงานการตรวจนับ (${batch.batchNo})`;

  const scanHistory = batch.scanHistory || [];
  const itemsDetail = batch.itemsDetail || [];

  const renderModalContent = (currentTab) => {
    return `
      <div style="max-height: 80vh; overflow-y: auto; padding: 4px;">
        
        <!-- Header Summary Sheet -->
        <div style="background:#0f172a; border:1.5px solid #334155; border-radius:12px; padding:18px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #334155; padding-bottom:12px; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="margin:0; color:#f8fafc; font-size:18px; font-weight:800;">ใบบันทึกผลการตรวจนับสต็อกจริง (${batch.batchNo})</h3>
              <p style="margin:4px 0 0; color:#94a3b8; font-size:12.5px;">ผู้ตรวจนับ: <b>${escapeHtml(batch.auditor)}</b> • จุดขาย: <b>${escapeHtml(batch.terminal)}</b> • วันที่: <b>${escapeHtml(batch.auditDate)}</b></p>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="background:${batch.accuracyRate >= 95 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${batch.accuracyRate >= 95 ? '#34d399' : '#f87171'}; font-size:13px; font-weight:800; padding:6px 12px;">
                ความแม่นยำสต็อก: ${batch.accuracyRate}%
              </span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#94a3b8;">รายการสินค้าทั้งหมด</div>
              <div style="font-size:16px; font-weight:800; color:#f8fafc; margin-top:2px;">${batch.totalItems} รายการ</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#34d399;">นับตรงกับระบบ</div>
              <div style="font-size:16px; font-weight:800; color:#34d399; margin-top:2px;">${batch.matchCount} รายการ</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#fb7185;">ยอดขาด (Shortage)</div>
              <div style="font-size:16px; font-weight:800; color:#fb7185; margin-top:2px;">−${batch.totalShortageUnits} ชิ้น (−฿${money(batch.totalShortageValue)})</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#38bdf8;">ยอดเกิน (Surplus)</div>
              <div style="font-size:16px; font-weight:800; color:#38bdf8; margin-top:2px;">+${batch.totalSurplusUnits} ชิ้น (+฿${money(batch.totalSurplusValue)})</div>
            </div>
            <div style="background:#1e293b; padding:10px 12px; border-radius:8px;">
              <div style="font-size:11px; color:#a78bfa;">สแกนทั้งหมด (Scans)</div>
              <div style="font-size:16px; font-weight:800; color:#c4b5fd; margin-top:2px;">${scanHistory.length} ครั้ง</div>
            </div>
          </div>

          ${batch.note ? `
            <div style="margin-top:12px; padding:10px 12px; background:rgba(30,41,59,0.7); border:1px solid #334155; border-radius:8px; font-size:12.5px; color:#cbd5e1;">
              📝 <b>หมายเหตุการตรวจนับ:</b> ${escapeHtml(batch.note)}
            </div>
          ` : ''}
        </div>

        <!-- Detail Modal Sub-tab Switcher -->
        <div style="display:flex; gap:8px; margin-bottom:14px; border-bottom:1.5px solid #334155; padding-bottom:10px;">
          <button type="button" class="btn" style="padding:6px 14px; font-size:12.5px; font-weight:800; border-radius:8px; ${currentTab === 'discrepancies' ? 'background:#0284c7; color:#fff; border-color:#38bdf8;' : 'background:#1e293b; color:#94a3b8; border-color:#334155;'}" onclick="switchAuditDetailModalTab('${batch.id}', 'discrepancies')">
            📊 รายงานผลต่างสินค้า (${itemsDetail.length})
          </button>
          <button type="button" class="btn" style="padding:6px 14px; font-size:12.5px; font-weight:800; border-radius:8px; ${currentTab === 'scanHistory' ? 'background:#8b5cf6; color:#fff; border-color:#a78bfa;' : 'background:#1e293b; color:#94a3b8; border-color:#334155;'}" onclick="switchAuditDetailModalTab('${batch.id}', 'scanHistory')">
            ⏱️ ประวัติสแกนเรียงเวลา (Scan History) (${scanHistory.length})
          </button>
        </div>

        ${currentTab === 'discrepancies' ? `
          <!-- Discrepancies Table -->
          <h4 style="margin:0 0 8px; color:#f8fafc; font-size:14px; font-weight:700;">
            ${itemsDetail.length > 0 ? `รายการสินค้าที่มีผลต่าง (${itemsDetail.length} รายการ)` : `✅ รอบการตรวจนับนี้นับตรงกับระบบ 100% (ไม่มีผลต่าง)`}
          </h4>

          ${itemsDetail.length > 0 ? `
            <div class="audit-table-wrap" style="max-height: 280px; overflow-y: auto; margin-bottom: 16px;">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th>รหัส / Barcode</th>
                    <th>ชื่อสินค้า</th>
                    <th style="text-align:center;">ยอดในระบบ</th>
                    <th style="text-align:center;">ยอดนับจริง</th>
                    <th style="text-align:center;">ผลต่าง</th>
                    <th style="text-align:right;">ผลกระทบมูลค่า</th>
                    <th style="text-align:center;">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsDetail.map(item => `
                    <tr class="${item.diff > 0 ? 'row-surplus' : 'row-shortage'}">
                      <td>
                        <code style="color:#94a3b8;">${escapeHtml(item.productCode || '-')}</code>
                        <div style="font-size:10.5px; color:#64748b; font-family:monospace;">${escapeHtml(item.barcode || '-')}</div>
                      </td>
                      <td><strong style="color:#f8fafc;">${escapeHtml(item.productName)}</strong></td>
                      <td style="text-align:center; color:#94a3b8;">${item.sysQty} ${escapeHtml(item.unit||'ชิ้น')}</td>
                      <td style="text-align:center; font-weight:800; color:#38bdf8;">${item.countQty} ${escapeHtml(item.unit||'ชิ้น')}</td>
                      <td style="text-align:center;">
                        <span class="audit-diff-badge ${item.diff > 0 ? 'plus' : 'minus'}">
                          ${item.diff > 0 ? '+' : ''}${item.diff} ${escapeHtml(item.unit||'ชิ้น')}
                        </span>
                      </td>
                      <td style="text-align:right; font-weight:800; color:${item.diffVal > 0 ? '#38bdf8' : '#fb7185'};">
                        ${item.diffVal > 0 ? '+' : ''}฿${money(item.diffVal)}
                      </td>
                      <td style="text-align:center;">
                        ${item.diff > 0 ? '<span style="color:#38bdf8; font-weight:700; font-size:11.5px;">📈 สต็อกเกิน</span>' : '<span style="color:#fb7185; font-weight:700; font-size:11.5px;">🚨 สต็อกขาด</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="text-align:center; padding:24px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; margin-bottom:16px;">
              <p style="color:#34d399; font-weight:800; font-size:15px; margin:0 0 4px;">🎉 สต็อกสมบูรณ์ ไม่พบผลต่างใดๆ</p>
              <p style="color:#94a3b8; font-size:12px; margin:0;">ยอดนับจริงตรงกับฐานข้อมูลในระบบทุกรายการ</p>
            </div>
          `}
        ` : `
          <!-- Scan History Sequential Audit Trail Table -->
          <h4 style="margin:0 0 8px; color:#f8fafc; font-size:14px; font-weight:700;">
            ⏱️ ประวัติและลำดับการสแกนสินค้าย้อนหลัง (${scanHistory.length} ลำดับการสแกน)
          </h4>

          ${scanHistory.length > 0 ? `
            <div class="audit-table-wrap" style="max-height: 320px; overflow-y: auto; margin-bottom: 16px;">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th style="width:45px; text-align:center;">#</th>
                    <th style="width:110px;">เวลาสแกน</th>
                    <th style="width:130px;">รหัส / Barcode</th>
                    <th>รายการสินค้าที่สแกน</th>
                    <th style="text-align:center; width:90px;">จำนวนที่บวก</th>
                    <th style="text-align:center; width:110px;">ยอดสะสมนับจริง</th>
                    <th style="text-align:center; width:110px;">ผลต่าง ณ ขณะนั้น</th>
                    <th style="width:130px;">ช่องทาง</th>
                  </tr>
                </thead>
                <tbody>
                  ${scanHistory.map((sc) => {
                    const isDiffMatch = sc.diff === 0;
                    const isDiffSurplus = sc.diff > 0;
                    return `
                      <tr>
                        <td style="text-align:center; font-weight:800; color:#818cf8;">#${sc.scanOrder}</td>
                        <td style="font-family:monospace; color:#cbd5e1; font-size:11.5px;">${escapeHtml(sc.timestamp || sc.timeStr || '-')}</td>
                        <td>
                          <code style="color:#38bdf8; font-weight:700;">${escapeHtml(sc.productCode || '-')}</code>
                          <div style="font-size:10.5px; color:#64748b; font-family:monospace;">${escapeHtml(sc.barcode || '-')}</div>
                        </td>
                        <td>
                          <strong style="color:#f8fafc;">${escapeHtml(sc.productName)}</strong>
                          <span style="font-size:11px; color:#94a3b8;">/ ฿${money(sc.unitPrice)}</span>
                        </td>
                        <td style="text-align:center;">
                          <span style="background:rgba(56,189,248,0.2); color:#38bdf8; font-weight:800; padding:2px 8px; border-radius:6px; font-size:11.5px;">
                            +${sc.step} ${escapeHtml(sc.unit || 'ชิ้น')}
                          </span>
                        </td>
                        <td style="text-align:center; font-weight:800; color:#f1f5f9;">
                          <span style="color:#94a3b8; font-weight:normal;">${sc.previousCount} ➔</span> ${sc.newCount} ${escapeHtml(sc.unit || 'ชิ้น')}
                        </td>
                        <td style="text-align:center;">
                          <span class="audit-diff-badge ${isDiffMatch ? 'zero' : (isDiffSurplus ? 'plus' : 'minus')}">
                            ${isDiffMatch ? '✓ ตรงระบบ' : (isDiffSurplus ? '+' + sc.diff : sc.diff)}
                          </span>
                        </td>
                        <td style="font-size:11.5px; color:#94a3b8;">
                          ${escapeHtml(sc.scanMethod || '📟 บาร์โค้ด')}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="text-align:center; padding:24px; background:rgba(30,41,59,0.5); border:1px solid #334155; border-radius:10px; margin-bottom:16px;">
              <p style="color:#94a3b8; font-size:13px; margin:0;">ไม่มีประวัติการสแกนแบบแยกเวลาในรอบนี้</p>
            </div>
          `}
        `}

        <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-light" onclick="closeProductModal()">ปิดหน้าต่าง</button>
          <button type="button" class="btn btn-export-excel" onclick="exportAuditBatchHistoryExcel('${batch.id}')">📗 ส่งออก Excel</button>
          <button type="button" class="btn btn-primary" style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-color:#fca5a5;" onclick="exportAuditBatchHistoryPDF('${batch.id}')">📄 Export to PDF</button>
        </div>

      </div>
    `;
  };

  const body = el("modalBody");
  if(body){
    body.innerHTML = renderModalContent(activeTab);
    m.showModal();
  }
}

function switchAuditDetailModalTab(batchId, tabName){
  openAuditBatchDetailModal(batchId, tabName);
}

function renderAuditBatchHistoryTab(){
  const historyList = state.auditBatchHistory || [];
  const filterStatus = state.auditHistoryFilterStatus || "all";
  const searchQ = state.auditHistorySearch || "";

  // KPI calculations across history logs
  const totalAudits = historyList.length;
  const matchedAudits = historyList.filter(b => b.status === "matched").length;
  const shortageAudits = historyList.filter(b => b.status === "shortage" || b.shortageCount > 0).length;
  const surplusAudits = historyList.filter(b => b.status === "surplus").length;
  const avgAccuracy = totalAudits > 0 ? Math.round(historyList.reduce((s, b) => s + Number(b.accuracyRate || 100), 0) / totalAudits) : 100;
  const cumulativeNetVar = historyList.reduce((s, b) => s + Number(b.netDiscrepancyValue || 0), 0);

  // Apply filters
  let filteredLogs = [...historyList];
  if (filterStatus === "matched") filteredLogs = filteredLogs.filter(b => b.status === "matched");
  else if (filterStatus === "discrepancy") filteredLogs = filteredLogs.filter(b => b.status !== "matched");
  else if (filterStatus === "shortage") filteredLogs = filteredLogs.filter(b => b.shortageCount > 0);
  else if (filterStatus === "surplus") filteredLogs = filteredLogs.filter(b => b.surplusCount > 0);

  if (searchQ) {
    filteredLogs = filteredLogs.filter(b => 
      (b.batchNo || "").toLowerCase().includes(searchQ) ||
      (b.auditor || "").toLowerCase().includes(searchQ) ||
      (b.auditDate || "").toLowerCase().includes(searchQ) ||
      (b.note || "").toLowerCase().includes(searchQ) ||
      (b.statusLabel || "").toLowerCase().includes(searchQ)
    );
  }

  return `
    <!-- History KPI Overview -->
    <div class="audit-summary-ribbon" style="margin-bottom:18px;">
      <div class="audit-kpi-card">
        <span class="kpi-label">📜 จำนวนรอบตรวจนับทั้งหมด</span>
        <div class="kpi-val">${totalAudits} <small style="font-size:13px; font-weight:normal; color:#94a3b8;">รอบ</small></div>
        <div style="font-size:11.5px; color:#38bdf8; font-weight:700; margin-top:4px;">ความแม่นยำเฉลี่ย: ${avgAccuracy}%</div>
      </div>

      <div class="audit-kpi-card matched">
        <span class="kpi-label">✓ รอบที่ตรงกับระบบ 100%</span>
        <div class="kpi-val" style="color:#34d399;">${matchedAudits} <small style="font-size:13px; font-weight:normal;">รอบ</small></div>
        <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">สต็อกถูกต้องสมบูรณ์</div>
      </div>

      <div class="audit-kpi-card shortage">
        <span class="kpi-label">🚨 รอบที่พบสต็อกขาด (Shortage)</span>
        <div class="kpi-val" style="color:#fb7185;">${shortageAudits} <small style="font-size:13px; font-weight:normal;">รอบ</small></div>
        <div style="font-size:11.5px; color:#fb7185; font-weight:700; margin-top:4px;">ต้องตรวจสอบความสูญหาย</div>
      </div>

      <div class="audit-kpi-card surplus">
        <span class="kpi-label">📈 รอบที่พบสต็อกเกิน (Surplus)</span>
        <div class="kpi-val" style="color:#38bdf8;">${surplusAudits} <small style="font-size:13px; font-weight:normal;">รอบ</small></div>
        <div style="font-size:11.5px; color:#38bdf8; font-weight:700; margin-top:4px;">พบสินค้าเกินคลัง</div>
      </div>

      <div class="audit-kpi-card" style="border-color:${cumulativeNetVar >= 0 ? 'rgba(56,189,248,0.4)' : 'rgba(244,63,94,0.4)'};">
        <span class="kpi-label">⚖️ มูลค่าผลต่างสะสมรวม</span>
        <div class="kpi-val" style="color:${cumulativeNetVar >= 0 ? '#38bdf8' : '#fb7185'}; font-size:18px;">
          ${cumulativeNetVar >= 0 ? '+' : ''}฿${money(cumulativeNetVar)}
        </div>
        <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">รวมบันทึกย้อนหลังทั้งหมด</div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="sh-filter-card" style="margin-bottom:18px; padding:14px 18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        
        <div class="sh-period-pills" style="margin:0;">
          <button type="button" class="sh-pill-btn ${filterStatus === 'all' ? 'active' : ''}" onclick="setAuditHistoryFilterStatus('all')">
            ทั้งหมด (${historyList.length})
          </button>
          <button type="button" class="sh-pill-btn ${filterStatus === 'matched' ? 'active' : ''}" onclick="setAuditHistoryFilterStatus('matched')">
            ✓ ตรง 100% (${matchedAudits})
          </button>
          <button type="button" class="sh-pill-btn ${filterStatus === 'discrepancy' ? 'active' : ''}" onclick="setAuditHistoryFilterStatus('discrepancy')">
            ⚠️ มีผลต่าง (${totalAudits - matchedAudits})
          </button>
          <button type="button" class="sh-pill-btn ${filterStatus === 'shortage' ? 'active' : ''}" onclick="setAuditHistoryFilterStatus('shortage')">
            🚨 ยอดขาด (${shortageAudits})
          </button>
          <button type="button" class="sh-pill-btn ${filterStatus === 'surplus' ? 'active' : ''}" onclick="setAuditHistoryFilterStatus('surplus')">
            📈 ยอดเกิน (${surplusAudits})
          </button>
        </div>

        <div style="position:relative; display:flex; align-items:center; width:280px;">
          <input type="text" id="auditHistorySearchInput" class="sh-input" placeholder="ค้นหาเลขที่ Audit, ผู้ตรวจนับ, หมายเหตุ..." value="${escapeHtml(searchQ)}" oninput="onAuditHistorySearchInput(this.value)">
          ${searchQ ? `<button type="button" style="position:absolute; right:10px; background:none; border:none; color:#94a3b8; cursor:pointer; font-size:15px;" onclick="onAuditHistorySearchInput('')">✕</button>` : ''}
        </div>

      </div>
    </div>

    <!-- Batch History List Table -->
    <div class="sh-table-card">
      <div class="sh-table-header-bar">
        <div class="sh-table-title">
          <span>📜</span>
          <span>ประวัติและบันทึกการตรวจนับสต็อกจริงย้อนหลัง (Physical Count Logs)</span>
          <span style="font-size:12px; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:99px;">
            ${filteredLogs.length} จาก ${totalAudits} บันทึก
          </span>
        </div>
        <div class="sh-table-actions" style="display:flex; gap:8px;">
          <button class="sh-btn-export" style="background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border-color:#fca5a5; color:#ffffff;" onclick="exportAuditBatchHistoryPDF()" title="พิมพ์/บันทึกรายงานประวัติเป็นไฟล์ PDF">
            📄 Export to PDF
          </button>
          <button class="sh-btn-export" onclick="exportAuditBatchHistoryExcel()" title="ส่งออกตารางประวัติเป็นไฟล์ Excel">
            📥 Excel ประวัติ
          </button>
        </div>
      </div>

      ${filteredLogs.length === 0 ? `
        <div class="sh-empty-state">
          <div class="sh-empty-icon">📭</div>
          <strong style="font-size:16px; color:#cbd5e1;">ไม่พบประวัติการตรวจนับสต็อกตามเงื่อนไข</strong>
          <p style="margin:0; font-size:13px;">ลองปรับเปลี่ยนตัวกรองค้นหา หรือทำการตรวจนับและบันทึกกระทบยอดสต็อกจริง</p>
          <button class="btn btn-primary" style="margin-top:10px;" onclick="setAuditHistoryFilterStatus('all')">ดูประวัติทั้งหมด</button>
        </div>
      ` : `
        <div class="sh-table-responsive-desktop" style="overflow-x:auto;">
          <table class="sh-table">
            <thead>
              <tr>
                <th style="width:45px; text-align:center;">#</th>
                <th style="width:130px;">เลขที่ Audit</th>
                <th style="width:140px;">วันที่-เวลาตรวจนับ</th>
                <th style="width:160px;">ผู้ตรวจนับ (Auditor)</th>
                <th style="width:140px; text-align:center;">จำนวนรายการนับ</th>
                <th style="width:180px;">สรุปผลต่าง (Discrepancy)</th>
                <th>สถานะรายงานผลต่าง</th>
                <th style="text-align:center; width:130px;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map((batch, idx) => {
                const isMatch = batch.status === "matched";
                const isShortage = batch.status === "shortage" || batch.shortageCount > 0;
                const badgeStyle = isMatch 
                  ? "background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.3);" 
                  : (isShortage 
                      ? "background:rgba(239,68,68,0.18); color:#fb7185; border:1px solid rgba(239,68,68,0.3);" 
                      : "background:rgba(2,132,199,0.18); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);");

                return `
                  <tr>
                    <td style="text-align:center; color:#64748b; font-size:12px; font-weight:700;">${idx + 1}</td>
                    <td>
                      <span class="sh-sale-no" onclick="openAuditBatchDetailModal('${batch.id}')" title="คลิกเพื่อดูใบรายงานผลต่าง">
                        📋 ${escapeHtml(batch.batchNo)}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight:700; color:#f1f5f9; font-size:12.5px;">${escapeHtml(batch.auditDate)}</div>
                      <div style="font-size:11px; color:#64748b;">จุดขาย: ${escapeHtml(batch.terminal || 'POS-01')}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:#cbd5e1; font-size:12.5px;">👤 ${escapeHtml(batch.auditor || 'ผู้จัดการร้าน')}</div>
                    </td>
                    <td style="text-align:center;">
                      <div style="font-weight:800; color:#f8fafc; font-size:13px;">${batch.totalItems} รายการ</div>
                      <div style="font-size:11px; color:#94a3b8;">
                        <span style="color:#34d399;">✓${batch.matchCount}</span> · 
                        <span style="color:#fb7185;">−${batch.shortageCount}</span> · 
                        <span style="color:#38bdf8;">+${batch.surplusCount}</span>
                      </div>
                    </td>
                    <td>
                      ${isMatch ? `
                        <span style="color:#34d399; font-weight:700; font-size:12px;">✓ ยอดนับตรง 100%</span>
                      ` : `
                        <div style="font-size:12px; font-weight:700;">
                          ${batch.totalShortageUnits > 0 ? `<span style="color:#fb7185;">ขาด −${batch.totalShortageUnits} ชิ้น (฿${money(batch.totalShortageValue)})</span>` : ''}
                          ${batch.totalSurplusUnits > 0 ? `<span style="color:#38bdf8; margin-left:4px;">เกิน +${batch.totalSurplusUnits} ชิ้น (฿${money(batch.totalSurplusValue)})</span>` : ''}
                        </div>
                      `}
                      ${batch.note ? `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">💬 ${escapeHtml(batch.note)}</div>` : ''}
                    </td>
                    <td>
                      <span class="badge" style="${badgeStyle} padding:4px 10px; font-size:11.5px; font-weight:700; border-radius:8px;">
                        ${escapeHtml(batch.statusLabel)}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <button type="button" class="sh-btn-view" onclick="openAuditBatchDetailModal('${batch.id}', 'discrepancies')" title="ดูใบรายงานสรุปผลต่างฉบับเต็ม">
                        👁️ ใบรายงาน
                      </button>
                      <button type="button" class="sh-btn-view" style="margin-left:4px; background:rgba(139,92,246,0.18); color:#c4b5fd; border-color:rgba(139,92,246,0.35);" onclick="openAuditBatchDetailModal('${batch.id}', 'scanHistory')" title="ดูประวัติและลำดับการสแกนสินค้าทั้งหมด">
                        ⏱️ Scan Logs (${(batch.scanHistory || []).length})
                      </button>
                      <button type="button" class="sh-btn-view" style="margin-left:4px; background:rgba(239,68,68,0.15); color:#fca5a5; border-color:rgba(239,68,68,0.3);" onclick="exportAuditBatchHistoryPDF('${batch.id}')" title="พิมพ์/ส่งออก PDF เฉพาะใบบันทึกผลต่างนี้">
                        📄 PDF
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function exportAuditBatchHistoryPDF(batchId = null){
  const historyList = state.auditBatchHistory || [];
  
  if (batchId) {
    const batch = historyList.find(b => b.id === batchId);
    if (!batch) {
      toast("ไม่พบประวัติการตรวจนับสต็อกที่เลือก");
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast("กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อพิมพ์/ส่งออก PDF");
      return;
    }

    const shopName = state.settings?.shopName || "EA Fair Sale";
    const items = batch.itemsDetail || [];

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>รายงานผลต่างการตรวจนับสต็อก - ${batch.batchNo}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px; }
          .shop-title { font-size: 18px; font-weight: 800; color: #0369a1; margin: 0 0 2px; }
          .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
          .doc-meta { text-align: right; font-size: 11px; color: #64748b; }
          .kpi-row { display: flex; gap: 10px; margin-bottom: 14px; }
          .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
          .kpi-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .kpi-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .table-title { font-weight: 800; font-size: 13px; margin: 12px 0 6px; color: #0f172a; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #e2e8f0; font-weight: 800; color: #1e293b; }
          .td-center { text-align: center; }
          .td-right { text-align: right; }
          .badge-shortage { color: #dc2626; font-weight: 800; }
          .badge-surplus { color: #0284c7; font-weight: 800; }
          .note-box { background: #f1f5f9; border-left: 3px solid #0284c7; padding: 8px 10px; font-size: 11px; color: #334155; margin-bottom: 16px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 30px; }
          .sig-box { text-align: center; width: 45%; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; color: #475569; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:12px; background:#0284c7; color:#ffffff; padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <span>📄 <b>พิมพ์รายงาน / บันทึกเป็น PDF (Print Batch to PDF)</b></span>
          <button onclick="window.print()" style="padding:6px 16px; font-weight:800; background:#ffffff; color:#0284c7; border:none; border-radius:6px; cursor:pointer;">🖨️ พิมพ์ / บันทึก PDF</button>
        </div>

        <div class="header">
          <div>
            <h1 class="shop-title">🏪 ${escapeHtml(shopName)}</h1>
            <h2 class="doc-title">📋 รายงานสรุปผลต่างการตรวจนับสต็อกจริง (${escapeHtml(batch.batchNo)})</h2>
          </div>
          <div class="doc-meta">
            <div><b>ผู้ตรวจนับ:</b> ${escapeHtml(batch.auditor)}</div>
            <div><b>วันที่ตรวจนับ:</b> ${escapeHtml(batch.auditDate)}</div>
            <div><b>ความแม่นยำสต็อก:</b> ${batch.accuracyRate}%</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-lbl">จำนวนรายการทั้งหมด</div>
            <div class="kpi-val">${batch.totalItems} รายการ</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">นับตรงระบบ</div>
            <div class="kpi-val" style="color:#059669;">${batch.matchCount} รายการ</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">ยอดขาด (Shortage)</div>
            <div class="kpi-val" style="color:#dc2626;">−${batch.totalShortageUnits} ชิ้น (−฿${money(batch.totalShortageValue)})</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">ยอดเกิน (Surplus)</div>
            <div class="kpi-val" style="color:#0284c7;">+${batch.totalSurplusUnits} ชิ้น (+฿${money(batch.totalSurplusValue)})</div>
          </div>
        </div>

        ${batch.note ? `<div class="note-box"><b>หมายเหตุ:</b> ${escapeHtml(batch.note)}</div>` : ''}

        <div class="table-title">
          <span>📦 รายการสินค้าที่มีผลต่าง (${items.length} รายการ)</span>
          <span>สถานะ: ${escapeHtml(batch.statusLabel)}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;" class="td-center">#</th>
              <th>รหัส / Barcode</th>
              <th>ชื่อสินค้า</th>
              <th style="width:80px;" class="td-right">ราคา/หน่วย</th>
              <th style="width:70px;" class="td-center">ยอดระบบ</th>
              <th style="width:70px;" class="td-center">ยอดนับจริง</th>
              <th style="width:80px;" class="td-center">ผลต่าง</th>
              <th style="width:90px;" class="td-right">ผลกระทบมูลค่า</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map((it, idx) => `
              <tr>
                <td class="td-center">${idx + 1}</td>
                <td><code>${escapeHtml(it.productCode || '-')}</code> / <small>${escapeHtml(it.barcode || '-')}</small></td>
                <td><b>${escapeHtml(it.productName)}</b></td>
                <td class="td-right">฿${money(it.unitPrice)}</td>
                <td class="td-center">${it.sysQty}</td>
                <td class="td-center"><b>${it.countQty}</b></td>
                <td class="td-center ${it.diff > 0 ? 'badge-surplus' : 'badge-shortage'}">
                  ${it.diff > 0 ? '+' : ''}${it.diff} ${escapeHtml(it.unit || 'ชิ้น')}
                </td>
                <td class="td-right" style="font-weight:bold; color:${it.diffVal > 0 ? '#0284c7' : '#dc2626'};">
                  ${it.diffVal > 0 ? '+' : ''}฿${money(it.diffVal)}
                </td>
              </tr>
            `).join('') : `
              <tr><td colspan="8" class="td-center" style="padding:16px;">รอบการตรวจนับนี้นับตรงกับระบบ 100% ไม่มีรายการผลต่าง</td></tr>
            `}
          </tbody>
        </table>

        ${(batch.scanHistory || []).length > 0 ? `
          <div class="table-title" style="margin-top:20px; border-top:1.5px solid #cbd5e1; padding-top:10px;">
            <span>⏱️ ลำดับและประวัติการสแกนสินค้าย้อนหลัง (Sequential Audit Scan History Log)</span>
            <span>จำนวนสแกนรวม: ${batch.scanHistory.length} ครั้ง</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:30px;" class="td-center">#</th>
                <th style="width:110px;">เวลาสแกน</th>
                <th>รหัส / Barcode</th>
                <th>รายการสินค้าที่สแกน</th>
                <th style="width:75px;" class="td-center">ยอดสแกน</th>
                <th style="width:95px;" class="td-center">สะสมนับจริง</th>
                <th style="width:95px;" class="td-center">ผลต่าง ณ ขณะนั้น</th>
                <th style="width:100px;">ช่องทาง</th>
              </tr>
            </thead>
            <tbody>
              ${batch.scanHistory.map((sc) => `
                <tr>
                  <td class="td-center"><b>#${sc.scanOrder}</b></td>
                  <td><small>${escapeHtml(sc.timestamp || sc.timeStr || '-')}</small></td>
                  <td><code>${escapeHtml(sc.productCode || '-')}</code> / <small>${escapeHtml(sc.barcode || '-')}</small></td>
                  <td><b>${escapeHtml(sc.productName)}</b></td>
                  <td class="td-center"><b>+${sc.step}</b> ${escapeHtml(sc.unit || 'ชิ้น')}</td>
                  <td class="td-center">${sc.previousCount} ➔ <b>${sc.newCount}</b></td>
                  <td class="td-center ${sc.diff === 0 ? '' : (sc.diff > 0 ? 'badge-surplus' : 'badge-shortage')}">
                    ${sc.diff === 0 ? '✓ ตรงระบบ' : (sc.diff > 0 ? '+' + sc.diff : sc.diff)}
                  </td>
                  <td><small>${escapeHtml(sc.scanMethod || 'บาร์โค้ด')}</small></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="sig-row">
          <div class="sig-box">
            <div>ลงชื่อ ............................................................ ผู้ตรวจนับสต็อก</div>
            <div style="margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
          </div>
          <div class="sig-box">
            <div>ลงชื่อ ............................................................ ผู้จัดการ / ผู้อนุมัติ</div>
            <div style="margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 250);
    return;
  }

  // Export/Print ALL filtered Batch History
  const filterStatus = state.auditHistoryFilterStatus || "all";
  const searchQ = state.auditHistorySearch || "";

  let filteredLogs = [...historyList];
  if (filterStatus === "matched") filteredLogs = filteredLogs.filter(b => b.status === "matched");
  else if (filterStatus === "discrepancy") filteredLogs = filteredLogs.filter(b => b.status !== "matched");
  else if (filterStatus === "shortage") filteredLogs = filteredLogs.filter(b => b.shortageCount > 0);
  else if (filterStatus === "surplus") filteredLogs = filteredLogs.filter(b => b.surplusCount > 0);

  if (searchQ) {
    filteredLogs = filteredLogs.filter(b => 
      (b.batchNo || "").toLowerCase().includes(searchQ) ||
      (b.auditor || "").toLowerCase().includes(searchQ) ||
      (b.auditDate || "").toLowerCase().includes(searchQ) ||
      (b.note || "").toLowerCase().includes(searchQ) ||
      (b.statusLabel || "").toLowerCase().includes(searchQ)
    );
  }

  if (filteredLogs.length === 0) {
    toast("ไม่มีข้อมูลประวัติการตรวจนับสำหรับส่งออก PDF");
    return;
  }

  const printWin = window.open('', '_blank');
  if (!printWin) {
    toast("กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อพิมพ์/ส่งออก PDF");
    return;
  }

  const shopName = state.settings?.shopName || "EA Fair Sale";
  const nowStr = new Date().toLocaleString("th-TH");

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>รายงานสรุปประวัติการตรวจนับสต็อกจริง - ${todayISO()}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 11px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 12px; }
        .shop-title { font-size: 18px; font-weight: 800; color: #0369a1; margin: 0 0 2px; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
        .doc-meta { text-align: right; font-size: 11px; color: #64748b; }
        .kpi-row { display: flex; gap: 10px; margin-bottom: 12px; }
        .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f8fafc; }
        .kpi-lbl { font-size: 10px; color: #64748b; font-weight: 700; }
        .kpi-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #e2e8f0; font-weight: 800; color: #1e293b; }
        .td-center { text-align: center; }
        .td-right { text-align: right; }
        .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; display: inline-block; }
        .badge-matched { background: #dcfce7; color: #15803d; }
        .badge-shortage { background: #fee2e2; color: #b91c1c; }
        .badge-surplus { background: #e0f2fe; color: #0369a1; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 25px; }
        .sig-box { text-align: center; width: 45%; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; color: #475569; }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:12px; background:#0284c7; color:#ffffff; padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>📄 <b>พิมพ์รายงานประวัติ / บันทึกเป็น PDF (Print Batch History to PDF)</b></span>
        <button onclick="window.print()" style="padding:6px 16px; font-weight:800; background:#ffffff; color:#0284c7; border:none; border-radius:6px; cursor:pointer;">🖨️ พิมพ์ / บันทึก PDF</button>
      </div>

      <div class="header">
        <div>
          <h1 class="shop-title">🏪 ${escapeHtml(shopName)}</h1>
          <h2 class="doc-title">📜 รายงานประวัติและบันทึกการตรวจนับสต็อกจริงย้อนหลัง (Physical Inventory Batch History Report)</h2>
        </div>
        <div class="doc-meta">
          <div><b>วันที่พิมพ์:</b> ${nowStr}</div>
          <div><b>รวมทั้งหมด:</b> ${filteredLogs.length} รอบตรวจนับ</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-lbl">จำนวนรอบตรวจนับ</div>
          <div class="kpi-val">${filteredLogs.length} รอบ</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">นับตรง 100%</div>
          <div class="kpi-val" style="color:#059669;">${filteredLogs.filter(b => b.status === "matched").length} รอบ</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">พบยอดขาด (Shortage)</div>
          <div class="kpi-val" style="color:#dc2626;">${filteredLogs.filter(b => b.shortageCount > 0).length} รอบ</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">พบยอดเกิน (Surplus)</div>
          <div class="kpi-val" style="color:#0284c7;">${filteredLogs.filter(b => b.surplusCount > 0).length} รอบ</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px;" class="td-center">#</th>
            <th style="width:110px;">เลขที่ Audit</th>
            <th style="width:120px;">วันที่-เวลาตรวจนับ</th>
            <th style="width:140px;">ผู้ตรวจนับ</th>
            <th style="width:110px;" class="td-center">จำนวนรายการ</th>
            <th style="width:160px;">สรุปผลต่าง (Discrepancy)</th>
            <th>สถานะรายงานผลต่าง</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${filteredLogs.map((b, idx) => {
            const isMatch = b.status === "matched";
            const badgeCls = isMatch ? "badge-matched" : (b.shortageCount > 0 ? "badge-shortage" : "badge-surplus");

            return `
              <tr>
                <td class="td-center">${idx + 1}</td>
                <td><b>${escapeHtml(b.batchNo)}</b></td>
                <td>${escapeHtml(b.auditDate)}</td>
                <td>${escapeHtml(b.auditor)}</td>
                <td class="td-center">
                  <b>${b.totalItems}</b> <small>(✓${b.matchCount} / −${b.shortageCount} / +${b.surplusCount})</small>
                </td>
                <td>
                  ${isMatch ? `<span style="color:#059669; font-weight:bold;">✓ ตรง 100%</span>` : `
                    <div>
                      ${b.totalShortageUnits > 0 ? `<span style="color:#dc2626;">ขาด −${b.totalShortageUnits} ชิ้น (-฿${money(b.totalShortageValue)})</span>` : ''}
                      ${b.totalSurplusUnits > 0 ? `<span style="color:#0284c7; margin-left:4px;">เกิน +${b.totalSurplusUnits} ชิ้น (+฿${money(b.totalSurplusValue)})</span>` : ''}
                    </div>
                  `}
                </td>
                <td><span class="badge ${badgeCls}">${escapeHtml(b.statusLabel)}</span></td>
                <td>${escapeHtml(b.note || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="sig-row">
        <div class="sig-box">
          <div>ลงชื่อ ............................................................ ผู้ตรวจนับสต็อก / หัวหน้าคลัง</div>
          <div style="margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
        </div>
        <div class="sig-box">
          <div>ลงชื่อ ............................................................ ผู้จัดการร้าน / ผู้อนุมัติ</div>
          <div style="margin-top:4px;">( วันที่: ..... / ..... / ......... )</div>
        </div>
      </div>
    </body>
    </html>
  `);

  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 250);
}

function exportAuditBatchHistoryExcel(batchId){
  let historyList = state.auditBatchHistory || [];
  if(batchId){
    historyList = historyList.filter(b => b.id === batchId);
  }

  if(historyList.length === 0){
    toast("ไม่มีข้อมูลประวัติการตรวจนับสำหรับส่งออก");
    return;
  }

  const rows = [
    ["เลขที่ Audit", "วันที่-เวลาที่ตรวจนับ", "ผู้ตรวจนับ", "จุดขาย", "จำนวนรายการทั้งหมด", "ตรงกับระบบ", "ขาด (ชิ้น)", "เกิน (ชิ้น)", "ผลต่างมูลค่าสุทธิ (฿)", "อัตราความแม่นยำ (%)", "สถานะ", "หมายเหตุ"]
  ];

  historyList.forEach(b => {
    rows.push([
      b.batchNo,
      b.auditDate,
      b.auditor,
      b.terminal,
      b.totalItems,
      b.matchCount,
      b.totalShortageUnits,
      b.totalSurplusUnits,
      b.netDiscrepancyValue,
      `${b.accuracyRate}%`,
      b.statusLabel,
      b.note || "-"
    ]);
  });

  const bodyHtml = `
    <table border="1" cellspacing="0" cellpadding="6">
      ${rows.map((r, i) => `<tr style="${i === 0 ? 'background:#0f172a; color:#ffffff; font-weight:bold;' : ''}">${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}
    </table>
  `;

  downloadExcel(`EA_Audit_Batch_History_${todayISO()}.xls`, bodyHtml, "Batch History Logs");
  toast("ส่งออกไฟล์ Excel ประวัติการตรวจนับสต็อกสำเร็จ 📥");
}

function exportStockAuditExcel(){
  const analytics = getAuditAnalyticsData();
  const dateStr = todayISO();

  const rows = [
    ["รหัสสินค้า", "Barcode", "ชื่อสินค้า", "หมวดหมู่", "ราคาขาย (฿)", "หน่วย", "ยอดในระบบ", "ยอดนับจริง", "ผลต่าง (ชิ้น)", "มูลค่าผลต่าง (฿)", "สถานะ"]
  ];

  analytics.auditedList.forEach(item => {
    const p = item.product;
    const status = item.diff === 0 ? "ตรงกัน" : (item.diff > 0 ? "เกินระบบ" : "ขาดจากระบบ");

    rows.push([
      p.product_code || "",
      p.barcode ? `'${p.barcode}` : "",
      p.product_name || "",
      p.category || "ทั่วไป",
      auditUnitPrice(p),
      p.unit || "ชิ้น",
      item.sysQty,
      item.countQty,
      item.diff,
      item.diffVal,
      status
    ]);
  });

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"/></head>
    <body>
      <h2>รายงานผลการตรวจนับสต็อกจริงและกระทบยอด (Physical Inventory Audit Report) - ${dateStr}</h2>
      <p>จุดขาย: ${state.terminal || 'POS-01'} | ความแม่นยำ: ${analytics.accuracyRate}% | สต็อกตรง: ${analytics.matchCount} | ขาด: ${analytics.shortageCount} | เกิน: ${analytics.surplusCount}</p>
      <table border="1">
        ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
      </table>
    </body></html>
  `;

  const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Stock_Physical_Audit_${dateStr}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  toast("ดาวน์โหลดรายงานตรวจนับสต็อก (Excel) เรียบร้อย");
}

function exportStockAuditCSV(){
  const analytics = getAuditAnalyticsData();
  const dateStr = todayISO();

  const headers = ["รหัสสินค้า", "Barcode", "ชื่อสินค้า", "หมวดหมู่", "ราคาขาย", "หน่วย", "ยอดในระบบ", "ยอดนับจริง", "ผลต่าง", "มูลค่าผลต่าง", "สถานะ"];
  const csvRows = [headers.join(",")];

  analytics.auditedList.forEach(item => {
    const p = item.product;
    const status = item.diff === 0 ? "ตรงกัน" : (item.diff > 0 ? "เกินระบบ" : "ขาดจากระบบ");

    const row = [
      `"${(p.product_code || "").replace(/"/g, '""')}"`,
      `"${(p.barcode || "").replace(/"/g, '""')}"`,
      `"${(p.product_name || "").replace(/"/g, '""')}"`,
      `"${(p.category || "ทั่วไป").replace(/"/g, '""')}"`,
      auditUnitPrice(p),
      `"${(p.unit || "ชิ้น").replace(/"/g, '""')}"`,
      item.sysQty,
      item.countQty,
      item.diff,
      item.diffVal,
      `"${status}"`
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Stock_Physical_Audit_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("ดาวน์โหลดรายงานตรวจนับสต็อก (CSV) เรียบร้อย");
}

function getReportAnalytics(){
  const period = state.reportPeriod || "today";
  const termFilter = state.reportTerminalFilter || "ALL";

  // Date filtering
  const now = new Date();
  const todayStr = todayISO();
  const d7Str = getNDaysAgoISO(6);
  const d30Str = getNDaysAgoISO(29);
  const yestStr = getNDaysAgoISO(1);

  let baseSales = state.sales || [];
  if (period === "today") {
    baseSales = baseSales.filter(s => s.sale_date === todayStr);
  } else if (period === "yesterday") {
    baseSales = baseSales.filter(s => s.sale_date === yestStr);
  } else if (period === "7days") {
    baseSales = baseSales.filter(s => (s.sale_date || "") >= d7Str && (s.sale_date || "") <= todayStr);
  } else if (period === "30days") {
    baseSales = baseSales.filter(s => (s.sale_date || "") >= d30Str && (s.sale_date || "") <= todayStr);
  } else if (period === "custom") {
    let sStart = state.reportDateStart || todayStr;
    let sEnd = state.reportDateEnd || todayStr;
    if (sStart > sEnd) { const t = sStart; sStart = sEnd; sEnd = t; }
    baseSales = baseSales.filter(s => {
      const d = s.sale_date || "";
      return d >= sStart && d <= sEnd;
    });
  }

  // Terminal filtering for overall list
  const filteredSales = termFilter === "ALL" 
    ? baseSales 
    : baseSales.filter(s => (s.terminal_code || "POS-01") === termFilter);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalBills = filteredSales.length;
  const avgTicket = totalBills > 0 ? (totalRevenue / totalBills) : 0;

  // Payment Breakdown
  let cashTotal = 0;
  let cashBills = 0;
  let qrTotal = 0;
  let qrBills = 0;

  for (const s of filteredSales) {
    const isCash = !s.payment_method || s.payment_method === "cash";
    const amt = Number(s.total_amount || 0);
    if (isCash) {
      cashTotal += amt;
      cashBills += 1;
    } else {
      qrTotal += amt;
      qrBills += 1;
    }
  }

  // Sale items linked
  const filteredSaleIds = new Set(filteredSales.map(s => s.id));
  const filteredSaleMap = new Map(filteredSales.map(s => [s.id, s]));
  const filteredItems = (state.saleItems || []).filter(i => filteredSaleIds.has(i.sale_id));
  const totalUnitsSold = filteredItems.reduce((sum, i) => sum + Number(i.qty || 0), 0);

  // Global top products in this period
  const prodMap = {};
  for (const item of filteredItems) {
    const name = item.product_name || "ไม่ระบุชื่อ";
    if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 };
    prodMap[name].qty += Number(item.qty || 0);
    prodMap[name].revenue += Number(item.line_total || 0);
  }
  const topProductsGlobal = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Terminal stats calculation (based on baseSales for overall comparison)
  const allTermCodes = new Set(["POS-01", "POS-02", "POS-03", "POS-04"]);
  for (const s of baseSales) {
    if (s.terminal_code) allTermCodes.add(s.terminal_code);
  }

  const terminalStats = {};
  for (const code of Array.from(allTermCodes).sort()) {
    terminalStats[code] = {
      code,
      total: 0,
      bills: 0,
      units: 0,
      avg: 0,
      maxBill: 0,
      cashTotal: 0,
      cashBills: 0,
      qrTotal: 0,
      qrBills: 0,
      pct: 0,
      productMap: {}
    };
  }

  const baseSaleIds = new Set(baseSales.map(s => s.id));
  const baseSaleObjMap = new Map(baseSales.map(s => [s.id, s]));

  for (const s of baseSales) {
    const code = s.terminal_code || "POS-01";
    if (!terminalStats[code]) {
      terminalStats[code] = {
        code, total: 0, bills: 0, units: 0, avg: 0, maxBill: 0,
        cashTotal: 0, cashBills: 0, qrTotal: 0, qrBills: 0, pct: 0, productMap: {}
      };
    }
    const amt = Number(s.total_amount || 0);
    terminalStats[code].total += amt;
    terminalStats[code].bills += 1;
    if (amt > terminalStats[code].maxBill) {
      terminalStats[code].maxBill = amt;
    }

    const isCash = !s.payment_method || s.payment_method === "cash";
    if (isCash) {
      terminalStats[code].cashTotal += amt;
      terminalStats[code].cashBills += 1;
    } else {
      terminalStats[code].qrTotal += amt;
      terminalStats[code].qrBills += 1;
    }
  }

  // Add item quantities & top products per POS
  for (const item of state.saleItems || []) {
    if (baseSaleIds.has(item.sale_id)) {
      const sale = baseSaleObjMap.get(item.sale_id);
      const code = sale?.terminal_code || "POS-01";
      if (terminalStats[code]) {
        const q = Number(item.qty || 0);
        terminalStats[code].units += q;
        const pName = item.product_name || "สินค้า";
        if (!terminalStats[code].productMap[pName]) {
          terminalStats[code].productMap[pName] = { name: pName, qty: 0, revenue: 0 };
        }
        terminalStats[code].productMap[pName].qty += q;
        terminalStats[code].productMap[pName].revenue += Number(item.line_total || 0);
      }
    }
  }

  const baseTotalRev = baseSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  for (const code in terminalStats) {
    const t = terminalStats[code];
    t.avg = t.bills > 0 ? (t.total / t.bills) : 0;
    t.pct = baseTotalRev > 0 ? Math.round((t.total / baseTotalRev) * 100) : 0;
    t.topProducts = Object.values(t.productMap).sort((a, b) => b.qty - a.qty).slice(0, 3);
  }

  // Process item-level data and separate Individual Discounts
  const rawRows = [];
  const allDiscountedItems = [];
  const discountedBillIds = new Set();
  let totalDiscountAmount = 0;
  let totalDiscountUnits = 0;

  for (const item of filteredItems) {
    const sale = filteredSaleMap.get(item.sale_id);
    if (!sale) continue;

    const catalogProd = productById(item.product_id);
    const origPrice = Number(item.original_price ?? (catalogProd ? catalogProd.sale_price : item.unit_price) ?? item.unit_price ?? 0);
    const actualUnitPrice = Number(item.unit_price || 0);
    const unitDiscount = Math.max(0, origPrice - actualUnitPrice);
    const isDisc = Boolean(item.is_discounted || unitDiscount > 0 || (item.discount_amount && Number(item.discount_amount) > 0));
    const qty = Number(item.qty || 0);
    const lineDiscount = isDisc ? (unitDiscount * qty) : 0;
    const lineTotal = Number(item.line_total || (qty * actualUnitPrice));
    const discountNote = item.discount_note || (isDisc ? "ลดเฉพาะบุคคล" : "");

    const rowObj = {
      id: item.id || (item.sale_id + "-" + item.product_id),
      saleId: sale.id,
      saleNo: sale.sale_no || "-",
      date: sale.sale_date || "-",
      time: String(sale.sale_time || "").slice(0, 5) || "-",
      terminal: sale.terminal_code || "POS-01",
      productName: item.product_name || "ไม่ระบุ",
      barcode: item.barcode || (catalogProd?.barcode) || "-",
      qty: qty,
      originalPrice: origPrice,
      unitPrice: actualUnitPrice,
      unitDiscount: unitDiscount,
      totalDiscount: lineDiscount,
      lineTotal: lineTotal,
      isDiscounted: isDisc,
      discountNote: discountNote,
      paymentMethod: sale.payment_method || "cash"
    };

    rawRows.push(rowObj);

    if (isDisc) {
      allDiscountedItems.push(rowObj);
      discountedBillIds.add(sale.id);
      totalDiscountAmount += lineDiscount;
      totalDiscountUnits += qty;
    }
  }

  // Group by date for Daily Summary breakdown (เรียงรายวัน)
  const dailyMap = {};
  for (const s of filteredSales) {
    const d = s.sale_date || "ไม่ระบุวันที่";
    if (!dailyMap[d]) {
      dailyMap[d] = {
        date: d,
        total: 0,
        originalTotal: 0,
        discountTotal: 0,
        discountUnits: 0,
        regularUnits: 0,
        discountBills: 0,
        bills: 0,
        units: 0,
        cashTotal: 0,
        cashBills: 0,
        qrTotal: 0,
        qrBills: 0,
        avg: 0,
        maxBill: 0,
        pct: "0",
        productMap: {},
        topProducts: [],
        discountedItems: []
      };
    }
    const amt = Number(s.total_amount || 0);
    dailyMap[d].total += amt;
    dailyMap[d].bills += 1;
    if (amt > dailyMap[d].maxBill) {
      dailyMap[d].maxBill = amt;
    }

    const isCash = !s.payment_method || s.payment_method === "cash";
    if (isCash) {
      dailyMap[d].cashTotal += amt;
      dailyMap[d].cashBills += 1;
    } else {
      dailyMap[d].qrTotal += amt;
      dailyMap[d].qrBills += 1;
    }
  }

  // Add item quantities & discount stats per Day
  for (const r of rawRows) {
    const d = r.date;
    if (dailyMap[d]) {
      dailyMap[d].units += r.qty;
      dailyMap[d].originalTotal += (r.originalPrice * r.qty);

      if (r.isDiscounted) {
        dailyMap[d].discountTotal += r.totalDiscount;
        dailyMap[d].discountUnits += r.qty;
        dailyMap[d].discountedItems.push(r);
      } else {
        dailyMap[d].regularUnits += r.qty;
      }

      const pName = r.productName;
      if (!dailyMap[d].productMap[pName]) {
        dailyMap[d].productMap[pName] = { name: pName, qty: 0, revenue: 0 };
      }
      dailyMap[d].productMap[pName].qty += r.qty;
      dailyMap[d].productMap[pName].revenue += r.lineTotal;
    }
  }

  // Sort dailyStats newest first for clean list order
  const dailyStats = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  for (const day of dailyStats) {
    day.avg = day.bills > 0 ? (day.total / day.bills) : 0;
    day.pct = totalRevenue > 0 ? ((day.total / totalRevenue) * 100).toFixed(1) : "0";
    day.topProducts = Object.values(day.productMap).sort((a, b) => b.qty - a.qty).slice(0, 3);
    const dayDiscountBillIds = new Set(day.discountedItems.map(x => x.saleId));
    day.discountBills = dayDiscountBillIds.size;
  }

  // Sort raw rows & discounted items newest first
  rawRows.sort((a, b) => {
    const dtA = (a.date + " " + a.time);
    const dtB = (b.date + " " + b.time);
    return dtB.localeCompare(dtA);
  });

  allDiscountedItems.sort((a, b) => {
    const dtA = (a.date + " " + a.time);
    const dtB = (b.date + " " + b.time);
    return dtB.localeCompare(dtA);
  });

  return {
    period,
    termFilter,
    filteredSales,
    filteredItems,
    basketAnalytics: getBasketAnalytics(filteredSales, filteredItems),
    totalRevenue,
    totalBills,
    avgTicket,
    cashTotal,
    cashBills,
    qrTotal,
    qrBills,
    totalUnitsSold,
    topProductsGlobal,
    terminalStats,
    dailyStats,
    allTermCodes: Array.from(allTermCodes).sort(),
    rawRows,
    allDiscountedItems,
    totalDiscountAmount,
    totalDiscountUnits,
    totalDiscountBills: discountedBillIds.size
  };
}

function setReportTab(tab){
  state.reportTab = tab;
  renderReport();
}

function setReportPeriod(period){
  state.reportPeriod = period;
  const today = todayISO();
  if(period === "today"){
    state.reportDateStart = today;
    state.reportDateEnd = today;
  } else if(period === "yesterday"){
    const yest = getNDaysAgoISO(1);
    state.reportDateStart = yest;
    state.reportDateEnd = yest;
  } else if(period === "7days"){
    state.reportDateStart = getNDaysAgoISO(6);
    state.reportDateEnd = today;
  } else if(period === "30days"){
    state.reportDateStart = getNDaysAgoISO(29);
    state.reportDateEnd = today;
  } else if(period === "all"){
    let earliest = today;
    if(state.sales && state.sales.length > 0){
      for(const s of state.sales){
        if(s.sale_date && s.sale_date < earliest) earliest = s.sale_date;
      }
    }
    state.reportDateStart = earliest;
    state.reportDateEnd = today;
  }
  renderReport();
}

function applyReportCustomDate(){
  const sEl = el("reportDateStartInput");
  const eEl = el("reportDateEndInput");
  if(sEl && eEl){
    state.reportPeriod = "custom";
    let s = sEl.value || todayISO();
    let e = eEl.value || todayISO();
    if(s > e){
      const t = s; s = e; e = t;
      sEl.value = s;
      eEl.value = e;
    }
    state.reportDateStart = s;
    state.reportDateEnd = e;
    renderReport();
  }
}

function setReportTerminalFilter(terminal){
  state.reportTerminalFilter = terminal;
  renderReport();
}

function onReportRawSearch(val){
  state.reportRawSearch = val;
  const container = el("reportRawTableContainer");
  if (container) {
    const data = getReportAnalytics();
    container.innerHTML = buildRawTableContent(data);
  }
}

function clearReportRawSearch(){
  state.reportRawSearch = "";
  const input = el("reportRawSearchInput");
  if (input) input.value = "";
  onReportRawSearch("");
}

function renderReport(){
  setHeader("รายงานและวิเคราะห์ยอดขาย", "สรุปยอดขายเชิงลึก เปรียบเทียบจุดขาย สถิติรายวัน พฤติกรรมตะกร้า และส่งออกข้อมูล");
  const data = getReportAnalytics();
  const currentTab = state.reportTab || "overview";

  let periodLabel = "";
  if (data.period === "today") periodLabel = `วันนี้ (${formatThaiDateStr(todayISO())})`;
  else if (data.period === "yesterday") periodLabel = `เมื่อวาน (${formatThaiDateStr(getNDaysAgoISO(1))})`;
  else if (data.period === "7days") periodLabel = `7 วันล่าสุด`;
  else if (data.period === "30days") periodLabel = `30 วันล่าสุด`;
  else if (data.period === "all") periodLabel = `ตลอดทั้งงาน`;
  else {
    const s1 = state.reportDateStart || todayISO();
    const s2 = state.reportDateEnd || todayISO();
    periodLabel = s1 === s2 ? `วันที่ ${formatThaiDateStr(s1)}` : `${formatThaiDateStr(s1)} ถึง ${formatThaiDateStr(s2)}`;
  }
  const activeTermCount = Object.values(data.terminalStats).filter(t => t.total > 0).length;

  // Find top POS
  const sortedTerminals = Object.values(data.terminalStats).sort((a,b) => b.total - a.total);
  const topPos = sortedTerminals.length > 0 && sortedTerminals[0].total > 0 ? sortedTerminals[0] : null;

  // Top Filter & Action Bar with Date Range
  const toolbarHtml = `
    <div class="report-toolbar-card">
      <div class="report-filters-wrap">
        <div class="report-period-group">
          <button class="report-filter-btn ${data.period === "today" ? "active" : ""}" onclick="setReportPeriod('today')">
            ⚡ วันนี้
          </button>
          <button class="report-filter-btn ${data.period === "yesterday" ? "active" : ""}" onclick="setReportPeriod('yesterday')">
            ⏮️ เมื่อวาน
          </button>
          <button class="report-filter-btn ${data.period === "7days" ? "active" : ""}" onclick="setReportPeriod('7days')">
            📊 7 วัน
          </button>
          <button class="report-filter-btn ${data.period === "30days" ? "active" : ""}" onclick="setReportPeriod('30days')">
            🗓️ 30 วัน
          </button>
          <button class="report-filter-btn ${data.period === "all" ? "active" : ""}" onclick="setReportPeriod('all')">
            🌐 ทั้งหมด
          </button>
        </div>

        <div class="dashboard-custom-range-wrap" style="display:inline-flex; align-items:center; gap:6px;">
          <input type="date" id="reportDateStartInput" class="dashboard-date-input" value="${state.reportDateStart || todayISO()}" title="ตั้งแต่วันที่">
          <span style="font-size:12px; color:#94a3b8;">-</span>
          <input type="date" id="reportDateEndInput" class="dashboard-date-input" value="${state.reportDateEnd || todayISO()}" title="ถึงวันที่">
          <button type="button" class="btn-dash-date-apply" onclick="applyReportCustomDate()">ใช้งาน</button>
        </div>

        <div class="report-select-wrap">
          <label for="reportPosSelect">จุดขาย:</label>
          <select id="reportPosSelect" class="report-select" onchange="setReportTerminalFilter(this.value)">
            <option value="ALL" ${data.termFilter === "ALL" ? "selected" : ""}>🏢 ทุกจุดขาย (All POS)</option>
            ${data.allTermCodes.map(c => `<option value="${c}" ${data.termFilter === c ? "selected" : ""}>${c} ${state.terminal === c ? "★ เครื่องนี้" : ""}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="report-actions-wrap">
        <button class="btn btn-copy-summary" onclick="copyReportSummaryText()" title="คัดลอกข้อความสรุปยอดขายส่งเข้า LINE / Chat">
          📋 คัดลอกสรุป
        </button>
        <button class="btn btn-export-excel" onclick="exportAccountingJournalExcel()" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-color:#34d399;" title="ส่งออกสมุดรายวันขายส่งบัญชีและภาษีในรูปแบบ Excel">
          📑 สมุดบัญชี (Excel)
        </button>
        <button class="btn btn-print-summary" onclick="openA4DailyReportModal()" title="เปิดตัวอย่างและสั่งพิมพ์รายงานสรุปยอดขายขนาด A4">
          🖨️ พิมพ์ A4 สรุป
        </button>
        <button class="btn btn-export-excel" onclick="openExportCenterModal()" title="เปิดศูนย์รวมการส่งออกไฟล์ทุกรูปแบบ (Excel & CSV)">
          ⚙️ ศูนย์ Export (Excel/CSV)
        </button>
      </div>
    </div>
  `;

  // Top High-Impact Executive KPI Ribbon
  const totalRev = data.totalRevenue || 0;
  const cashPct = totalRev > 0 ? Math.round((data.cashTotal / totalRev) * 100) : 0;
  const qrPct = totalRev > 0 ? (100 - cashPct) : 0;

  const kpiHtml = `
    <div class="report-kpi-ribbon-grid">
      <div class="report-kpi-item primary">
        <div class="report-kpi-head">
          <span class="report-kpi-label">💰 ยอดขายสุทธิ (${periodLabel})</span>
          <span class="badge badge-info" style="font-size:10px; font-weight:800;">${data.totalBills} บิล</span>
        </div>
        <div class="report-kpi-value" style="color: #38bdf8;">฿${money(data.totalRevenue)}</div>
        <div class="report-kpi-sub">
          <span>เฉลี่ย <strong>฿${money(data.avgTicket)}</strong> ต่อบิล</span>
          <span>จุดขายที่ทำงาน: <strong>${activeTermCount}</strong> จุด</span>
        </div>
      </div>

      <div class="report-kpi-item success">
        <div class="report-kpi-head">
          <span class="report-kpi-label">💳 ช่องทางชำระเงิน</span>
          <span class="badge badge-success" style="font-size:10px; font-weight:800;">สด ${cashPct}% : QR ${qrPct}%</span>
        </div>
        <div class="report-kpi-value" style="color: #34d399; font-size:21px;">
          💵 ฿${money(data.cashTotal)}
        </div>
        <div class="report-kpi-sub">
          <span>เงินสด ${data.cashBills} บิล • QR <strong>฿${money(data.qrTotal)}</strong> (${data.qrBills} บิล)</span>
          <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:99px; overflow:hidden; margin-top:3px; display:flex;">
            <div style="width:${cashPct}%; background:#34d399;"></div>
            <div style="width:${qrPct}%; background:#38bdf8;"></div>
          </div>
        </div>
      </div>

      <div class="report-kpi-item info">
        <div class="report-kpi-head">
          <span class="report-kpi-label">📦 สินค้าจำหน่ายออก</span>
          <span class="badge" style="background:rgba(168,85,247,0.2); color:#c084fc; font-size:10px; font-weight:800;">${data.topProductsGlobal.length} รายการ</span>
        </div>
        <div class="report-kpi-value" style="color: #c084fc;">
          ${data.totalUnitsSold} <span style="font-size:14px; font-weight:700; color:#94a3b8;">ชิ้น</span>
        </div>
        <div class="report-kpi-sub">
          <span>ปกติ ${data.totalUnitsSold - data.totalDiscountUnits} ชิ้น • ลดราคา ${data.totalDiscountUnits} ชิ้น</span>
          <span>เฉลี่ย <strong>${data.totalBills > 0 ? (data.totalUnitsSold / data.totalBills).toFixed(1) : 0}</strong> ชิ้น/บิล</span>
        </div>
      </div>

      <div class="report-kpi-item warning">
        <div class="report-kpi-head">
          <span class="report-kpi-label">🏷️ ส่วนลดเฉพาะบุคคล</span>
          <span class="badge badge-warning" style="font-size:10px; font-weight:800;">${data.totalDiscountBills} บิล</span>
        </div>
        <div class="report-kpi-value" style="color: #fbbf24;">฿${money(data.totalDiscountAmount)}</div>
        <div class="report-kpi-sub">
          <span>ลดราคา ${data.totalDiscountUnits} ชิ้น (${data.totalDiscountBills} บิลที่มีส่วนลด)</span>
          <span>คิดเป็น <strong>${totalRev > 0 ? ((data.totalDiscountAmount / (totalRev + data.totalDiscountAmount)) * 100).toFixed(1) : 0}%</strong> ของมูลค่า</span>
        </div>
      </div>

      ${topPos ? `
        <div class="report-kpi-item">
          <div class="report-kpi-head">
            <span class="report-kpi-label">🏆 จุดขายยอดขายสูงสุด</span>
            <span class="pos-share-badge">${topPos.pct}%</span>
          </div>
          <div class="report-kpi-value" style="color: #f8fafc; font-size:21px;">${escapeHtml(topPos.code)}</div>
          <div class="report-kpi-sub">
            <span>ยอดขาย <strong>฿${money(topPos.total)}</strong> (${topPos.bills} บิล)</span>
            <span>เฉลี่ย <strong>฿${money(topPos.avg)}</strong>/บิล</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Navigation Tabs Bar
  const tabsHtml = `
    <div class="report-tabs-bar">
      <button class="report-tab-btn ${currentTab === "overview" ? "active" : ""}" onclick="setReportTab('overview')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        📊 ภาพรวม & กราฟ
      </button>
      <button class="report-tab-btn ${currentTab === "daily" ? "active" : ""}" onclick="setReportTab('daily')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        📅 สรุปยอดขายรายวัน (${data.dailyStats.length} วัน)
      </button>
      <button class="report-tab-btn ${currentTab === "discount" ? "active" : ""}" onclick="setReportTab('discount')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        🏷️ รายการลดราคาพิเศษ (${data.allDiscountedItems.length})
      </button>
      <button class="report-tab-btn ${currentTab === "pos" ? "active" : ""}" onclick="setReportTab('pos')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        🏢 สมรรถนะแยกตามจุดขาย (${data.allTermCodes.length} POS)
      </button>
      <button class="report-tab-btn ${currentTab === "basket" ? "active" : ""}" onclick="setReportTab('basket')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        🛒 พฤติกรรม & ขนาดตะกร้า
      </button>
      <button class="report-tab-btn ${currentTab === "raw" ? "active" : ""}" onclick="setReportTab('raw')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        📋 ข้อมูลดิบ (${data.rawRows.length} แถว)
      </button>
    </div>
  `;

  // Dynamic View Tab Content
  let tabBodyHtml = "";
  if (currentTab === "overview") {
    tabBodyHtml = buildReportOverviewTab(data);
  } else if (currentTab === "basket") {
    tabBodyHtml = buildReportBasketTab(data);
  } else if (currentTab === "daily") {
    tabBodyHtml = buildReportDailyTab(data);
  } else if (currentTab === "discount") {
    tabBodyHtml = buildReportDiscountDedicatedTab(data);
  } else if (currentTab === "pos") {
    tabBodyHtml = buildReportPosBreakdownTab(data);
  } else {
    tabBodyHtml = buildReportRawDataTab(data);
  }

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="report-view-container">
      ${toolbarHtml}
      ${kpiHtml}
      ${tabsHtml}
      <div id="reportTabContent">
        ${tabBodyHtml}
      </div>
    </div>
  `;

  // If Overview tab is rendered, draw the D3 POS Comparison chart
  if (currentTab === "overview") {
    setTimeout(() => {
      renderReportPosChart("reportPosChartContainer", data);
    }, 40);
  }
}

function buildReportDiscountDedicatedTab(data){
  return `
    <div style="margin-top: 6px;">
      ${card("🏷️ บันทึกการตรวจสอบรายการสินค้าที่ลดราคาพิเศษเฉพาะบุคคล (INDIVIDUAL DISCOUNT AUDIT LOG)", `
        <div class="raw-search-bar" style="margin-bottom: 14px; background: #0b111a; padding: 10px 14px; border-radius: 10px; border: 1px solid #23354b;">
          <div class="raw-search-input-wrap" style="max-width: 480px;">
            ${G_ICONS.searchIcon}
            <input id="reportDiscountSearchInput" type="search" placeholder="ค้นหารายการลดราคา: ชื่อสินค้า, เลขบิล, หมายเหตุ, จุดขาย..." value="${escapeHtml(state.reportDiscountSearch || "")}" oninput="onReportDiscountSearch(this.value)">
            ${state.reportDiscountSearch ? `<button class="raw-clear-btn" onclick="clearReportDiscountSearch()">✕</button>` : ''}
          </div>

          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
            <span class="raw-count-tag" id="discountFilterCountTag" style="background: rgba(251, 191, 36, 0.12); color:#fbbf24; border-color: rgba(251, 191, 36, 0.25);">
              รายการลดราคา ${data.allDiscountedItems.length} รายการ (มูลค่าส่วนลด ฿${money(data.totalDiscountAmount)})
            </span>
            <button class="btn btn-export-excel" style="padding: 6px 12px; font-size: 12px;" onclick="exportDiscountedItemsExcel(${!!state.reportDiscountSearch})" title="ดาวน์โหลดเฉพาะรายการลดราคาเป็น Excel">
              📗 Excel รายการลดราคา
            </button>
            <button class="btn btn-file-csv" style="padding: 6px 12px; font-size: 12px;" onclick="exportDiscountedItemsCSV(${!!state.reportDiscountSearch})" title="ดาวน์โหลดเฉพาะรายการลดราคาเป็น CSV">
              📄 CSV รายการลดราคา
            </button>
          </div>
        </div>

        <div id="reportDiscountTableContainer">
          ${buildDiscountTableContent(data)}
        </div>
      `)}
    </div>
  `;
}

function buildReportBasketTab(data){
  const basket = data.basketAnalytics || getBasketAnalytics(data.filteredSales, data.filteredItems);
  return `
    <div style="margin-top: 6px;">
      ${card("🛒 วิเคราะห์พฤติกรรมการซื้อ & ขนาดตะกร้าสินค้า (Customer Basket Insights)", `
        <p style="margin-top:0; color:var(--muted); font-size:12.5px; margin-bottom:16px;">
          วิเคราะห์จำนวนชิ้นต่อบิล ยอดซื้อเฉลี่ย (AOV) สัดส่วนขนาดตะกร้า และสินค้าที่ลูกค้ามักซื้อคู่กันบ่อยที่สุด
        </p>
        ${renderBasketAnalyticsHTML(basket)}
      `)}
    </div>
  `;
}

function buildReportOverviewTab(data){
  const totalRev = data.totalRevenue || 1;
  const cashPct = data.totalRevenue > 0 ? Math.round((data.cashTotal / totalRev) * 100) : 0;
  const qrPct = data.totalRevenue > 0 ? (100 - cashPct) : 0;
  const maxTopProductRevenue = data.topProductsGlobal.length > 0 ? Math.max(...data.topProductsGlobal.map(p => p.revenue)) : 1;

  return `
    <div class="dashboard-grid dashboard-grid-main">
      ${card("📊 เปรียบเทียบยอดขายแยกตามจุดขาย (POS Sales Comparison)", `
        <div id="reportPosChartContainer" class="report-chart-container"></div>
      `)}

      ${card("💳 สัดส่วนช่องทางชำระเงิน (Payment Distribution)", `
        <div class="payment-meter-container" style="padding: 10px 0;">
          <div class="payment-meter-bar" style="height:14px; border-radius:8px;">
            <div class="payment-meter-segment cash" style="width: ${cashPct}%;" title="เงินสด ${cashPct}%"></div>
            <div class="payment-meter-segment qr" style="width: ${qrPct}%;" title="QR PromptPay ${qrPct}%"></div>
          </div>
          <div class="payment-legend-row" style="margin-top:14px;">
            <div class="payment-legend-item">
              <span class="payment-legend-dot cash" style="width:12px; height:12px;"></span>
              <div>
                <strong style="color:#34d399; font-size:14px;">เงินสด (Cash) ${cashPct}%</strong>
                <div style="color: #94a3b8; font-size: 12px; margin-top:2px;">฿${money(data.cashTotal)} (${data.cashBills} บิล)</div>
              </div>
            </div>
            <div class="payment-legend-item">
              <span class="payment-legend-dot qr" style="width:12px; height:12px;"></span>
              <div>
                <strong style="color:#38bdf8; font-size:14px;">QR PromptPay ${qrPct}%</strong>
                <div style="color: #94a3b8; font-size: 12px; margin-top:2px;">฿${money(data.qrTotal)} (${data.qrBills} บิล)</div>
              </div>
            </div>
          </div>
        </div>
      `)}
    </div>

    <div class="dashboard-grid" style="margin-top: 14px;">
      ${card("🔥 5 อันดับสินค้าขายดีที่สุด (Top 5 Best-Sellers)", `
        <div class="report-rank-list">
          ${data.topProductsGlobal.length ? data.topProductsGlobal.slice(0, 5).map((x, i) => {
            const pct = Math.round((x.revenue / maxTopProductRevenue) * 100);
            const rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "rank-other";
            const rankEmoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
            return `
              <div class="report-rank-item">
                <div class="report-rank-badge ${rankClass}">${rankEmoji}</div>
                <div class="report-rank-info">
                  <div class="report-rank-name" title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</div>
                  <div class="report-rank-track">
                    <div class="report-rank-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>
                <div class="report-rank-stat">
                  <div class="report-rank-rev">฿${money(x.revenue)}</div>
                  <div class="report-rank-qty">${x.qty} ชิ้น</div>
                </div>
              </div>
            `;
          }).join("") : `<div class="empty">ยังไม่มีข้อมูลสินค้าขายดีในรอบนี้</div>`}
        </div>
      `)}

      ${card("🏢 ตารางสรุปสมรรถนะแต่ละจุดขาย (POS Performance Matrix)", `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>จุดขาย</th>
                <th style="text-align:center;">สัดส่วน</th>
                <th style="text-align:center;">จำนวนบิล</th>
                <th style="text-align:right;">เฉลี่ย/บิล</th>
                <th style="text-align:right;">ยอดขายรวม</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(data.terminalStats).map(t => `
                <tr>
                  <td>
                    <strong>${escapeHtml(t.code)}</strong>
                    ${state.terminal === t.code ? '<span class="status ok" style="margin-left:6px; font-size:9.5px; padding:2px 6px;">เครื่องนี้</span>' : ''}
                  </td>
                  <td style="text-align:center;">
                    <span class="pos-share-badge">${t.pct}%</span>
                  </td>
                  <td style="text-align:center; font-weight:700;">${t.bills}</td>
                  <td style="text-align:right; color:#94a3b8;">฿${money(t.avg)}</td>
                  <td style="text-align:right; color:#34d399; font-weight:800; font-size:13.5px;">฿${money(t.total)}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr style="background: rgba(15, 23, 42, 0.7); font-weight:800; border-top: 2px solid rgba(148, 163, 184, 0.2);">
                <td>รวมทุกจุดขาย</td>
                <td style="text-align:center;">100%</td>
                <td style="text-align:center;">${data.totalBills}</td>
                <td style="text-align:right;">฿${money(data.avgTicket)}</td>
                <td style="text-align:right; color:#34d399; font-size:14px;">฿${money(data.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `, `<button class="btn btn-light" style="padding: 4px 10px; font-size: 11.5px;" onclick="exportPosSummaryCSV()">${G_ICONS.export} Export สรุป POS</button>`)}
    </div>
  `;
}

function onReportDiscountSearch(val){
  state.reportDiscountSearch = val;
  const container = el("reportDiscountTableContainer");
  if (container) {
    const data = getReportAnalytics();
    container.innerHTML = buildDiscountTableContent(data);
  }
}

function clearReportDiscountSearch(){
  state.reportDiscountSearch = "";
  const input = el("reportDiscountSearchInput");
  if (input) input.value = "";
  onReportDiscountSearch("");
}

function buildReportDailyTab(data){
  return `
    <!-- Top Action Bar for Daily & Discount Tab -->
    <div class="raw-search-bar" style="margin-bottom: 14px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="raw-count-tag" style="background: rgba(56, 189, 248, 0.12); color:#38bdf8; border-color: rgba(56, 189, 248, 0.25);">
          📅 สรุปรายวัน (${data.dailyStats.length} วัน) • 🏷️ รายการลดราคา (${data.allDiscountedItems.length} รายการ)
        </span>
      </div>

      <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
        <button class="btn btn-primary" style="padding: 7px 12px; font-size: 12px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-color: #38bdf8; box-shadow: 0 2px 8px rgba(2,132,199,0.3);" onclick="openA4DailyReportModal()" title="เปิดตัวอย่างและสั่งพิมพ์รายงานสรุปยอดขายรายวันขนาด A4">
          🖨️ ปริ้น A4 สรุปรายวัน
        </button>
        <button class="btn btn-export-excel" style="padding: 7px 12px; font-size: 12px;" onclick="exportDailySummaryExcel()" title="ส่งออกตารางสรุปรายวันพร้อมแยกรายการลดราคาเป็นไฟล์ Excel">
          📗 Excel สรุปรายวัน & ลดราคา
        </button>
        <button class="btn btn-file-csv" style="padding: 7px 12px; font-size: 12px;" onclick="exportDailySummaryCSV()" title="ส่งออกสรุปรายวันเป็นไฟล์ CSV UTF-8">
          📄 CSV สรุปรายวัน
        </button>
        <button class="btn btn-light" style="padding: 7px 12px; font-size: 12px; border-color: rgba(251, 191, 36, 0.4); color: #fbbf24;" onclick="exportDiscountedItemsExcel()" title="ส่งออกเฉพาะรายการสินค้าที่ลดราคาเฉพาะบุคคลเป็นไฟล์ Excel">
          🏷️ Excel เฉพาะรายการลดราคา
        </button>
      </div>
    </div>

    <!-- Section 1: Daily Sales Summary Table -->
    ${card("📅 ตารางสรุปยอดขายรายวัน (DAILY SALES SUMMARY)", `
      <div class="table-wrap" style="max-height: 480px; overflow-y: auto;">
        <table class="raw-data-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th>วันที่ขาย</th>
              <th>วัน</th>
              <th style="text-align:right;">ยอดขายสุทธิ (บาท)</th>
              <th style="text-align:center;">สัดส่วน</th>
              <th style="text-align:center;">บิล</th>
              <th style="text-align:right;">เฉลี่ย/บิล</th>
              <th style="text-align:center;">สินค้าปกติ</th>
              <th style="text-align:center;">สินค้าลดราคา</th>
              <th style="text-align:right;">มูลค่าส่วนลด (บาท)</th>
              <th style="text-align:right;">ยอดเงินสด</th>
              <th style="text-align:right;">ยอด QR</th>
              <th>สินค้าขายดีประจำวัน</th>
              <th style="text-align:center; width: 85px;">พิมพ์ A4</th>
            </tr>
          </thead>
          <tbody>
            ${data.dailyStats.length ? data.dailyStats.map((d, i) => {
              const topP = d.topProducts && d.topProducts.length > 0 ? `${d.topProducts[0].name} (${d.topProducts[0].qty} ชิ้น)` : "-";
              return `
                <tr>
                  <td style="color:#64748b; font-weight:700;">${i + 1}</td>
                  <td style="white-space:nowrap;">
                    <strong>${escapeHtml(d.date)}</strong>
                  </td>
                  <td style="color:#94a3b8; font-size:12px;">${getThaiDayOfWeek(d.date)}</td>
                  <td style="text-align:right; font-weight:800; color:#34d399; font-size:13.5px;">
                    ฿${money(d.total)}
                  </td>
                  <td style="text-align:center;">
                    <span class="pos-share-badge">${d.pct}%</span>
                  </td>
                  <td style="text-align:center; font-weight:700;">${d.bills}</td>
                  <td style="text-align:right;">฿${money(d.avg)}</td>
                  <td style="text-align:center; color:#94a3b8;">${d.regularUnits} ชิ้น</td>
                  <td style="text-align:center;">
                    ${d.discountUnits > 0 
                      ? `<span class="daily-discount-pill highlight">${d.discountUnits} ชิ้น (${d.discountBills} บิล)</span>` 
                      : `<span style="color:#64748b; font-size:11.5px;">0</span>`}
                  </td>
                  <td style="text-align:right; font-weight:700; color:${d.discountTotal > 0 ? '#fbbf24' : '#64748b'};">
                    ${d.discountTotal > 0 ? `฿${money(d.discountTotal)}` : '-'}
                  </td>
                  <td style="text-align:right; color:#e2e8f0; font-size:12px;">฿${money(d.cashTotal)}</td>
                  <td style="text-align:right; color:#38bdf8; font-size:12px;">฿${money(d.qrTotal)}</td>
                  <td style="font-size:12px; color:#cbd5e1;">${escapeHtml(topP)}</td>
                  <td style="text-align:center;">
                    <button class="mini-btn" style="background:#0284c7; border-color:#38bdf8; color:#ffffff; font-weight:700; padding:2px 8px;" onclick="openA4DailyReportModal('${d.date}')" title="พิมพ์รายงาน A4 วันที่ ${d.date}">
                      🖨️ A4
                    </button>
                  </td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="14" class="empty">ยังไม่มีข้อมูลการขายในรอบนี้</td></tr>`}
          </tbody>
          ${data.dailyStats.length ? `
            <tfoot>
              <tr style="background: rgba(15, 23, 42, 0.7); font-weight:800; border-top: 2px solid rgba(148, 163, 184, 0.2);">
                <td colspan="3" style="text-align:center; color:#f8fafc;">รวมทั้งสิ้น (${data.dailyStats.length} วัน)</td>
                <td style="text-align:right; color:#34d399; font-size:14px;">฿${money(data.totalRevenue)}</td>
                <td style="text-align:center;">100%</td>
                <td style="text-align:center;">${data.totalBills}</td>
                <td style="text-align:right;">฿${money(data.avgTicket)}</td>
                <td style="text-align:center;">${data.totalUnitsSold - data.totalDiscountUnits} ชิ้น</td>
                <td style="text-align:center; color:#fbbf24;">${data.totalDiscountUnits} ชิ้น</td>
                <td style="text-align:right; color:#fbbf24;">฿${money(data.totalDiscountAmount)}</td>
                <td style="text-align:right; color:#e2e8f0;">฿${money(data.cashTotal)}</td>
                <td style="text-align:right; color:#38bdf8;">฿${money(data.qrTotal)}</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    `)}

    <!-- Section 2: Dedicated Table for Individual Discounted Items Log -->
    <div style="margin-top: 18px;">
      ${card("🏷️ แยกรายการสินค้าที่ลดราคาเฉพาะบุคคล (SPECIAL INDIVIDUAL DISCOUNTED ITEMS LOG)", `
        <div class="raw-search-bar" style="margin-bottom: 12px; background: transparent; padding: 0; border: none;">
          <div class="raw-search-input-wrap" style="max-width: 480px;">
            ${G_ICONS.searchIcon}
            <input id="reportDiscountSearchInput" type="search" placeholder="ค้นหารายการลดราคา: ชื่อสินค้า, เลขบิล, หมายเหตุ, จุดขาย..." value="${escapeHtml(state.reportDiscountSearch || "")}" oninput="onReportDiscountSearch(this.value)">
            ${state.reportDiscountSearch ? `<button class="raw-clear-btn" onclick="clearReportDiscountSearch()">✕</button>` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span class="raw-count-tag" id="discountFilterCountTag" style="background: rgba(251, 191, 36, 0.12); color:#fbbf24; border-color: rgba(251, 191, 36, 0.25);">
              รายการลดราคา ${data.allDiscountedItems.length} รายการ (มูลค่าส่วนลด ฿${money(data.totalDiscountAmount)})
            </span>
            <button class="btn btn-export-excel" style="padding: 6px 11px; font-size: 11.5px;" onclick="exportDiscountedItemsExcel(${!!state.reportDiscountSearch})" title="ดาวน์โหลดเฉพาะรายการลดราคาเป็น Excel">
              📗 Excel เฉพาะส่วนลด
            </button>
            <button class="btn btn-file-csv" style="padding: 6px 11px; font-size: 11.5px;" onclick="exportDiscountedItemsCSV(${!!state.reportDiscountSearch})" title="ดาวน์โหลดเฉพาะรายการลดราคาเป็น CSV">
              📄 CSV ส่วนลด
            </button>
          </div>
        </div>

        <div id="reportDiscountTableContainer">
          ${buildDiscountTableContent(data)}
        </div>
      `)}
    </div>
  `;
}

function buildDiscountTableContent(data){
  const q = (state.reportDiscountSearch || "").toLowerCase().trim();
  let rows = data.allDiscountedItems;

  if (q) {
    rows = rows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.discountNote.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
  }

  const countTag = el("discountFilterCountTag");
  if (countTag) {
    const sumFilterDisc = rows.reduce((s, r) => s + r.totalDiscount, 0);
    countTag.textContent = q 
      ? `พบ ${rows.length} จาก ${data.allDiscountedItems.length} รายการ (ส่วนลด ฿${money(sumFilterDisc)})`
      : `รายการลดราคา ${data.allDiscountedItems.length} รายการ (มูลค่าส่วนลด ฿${money(data.totalDiscountAmount)})`;
  }

  if (rows.length === 0) {
    return `
      <div class="empty" style="padding: 32px 16px; text-align:center;">
        <div style="font-size: 28px; margin-bottom: 8px;">🏷️</div>
        <strong style="color: #94a3b8; font-size: 14px;">${q ? 'ไม่พบรายการลดราคาที่ตรงกับคำค้นหา' : 'ไม่มีรายการสินค้าที่ลดราคาเฉพาะบุคคลในช่วงเวลานี้'}</strong>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">เมื่อมีการกดปุ่ม "ลดราคา" ที่รายการสินค้าในตะกร้า รายการจะถูกบันทึกและแยกสรุปที่นี่โดยอัตโนมัติ</p>
      </div>
    `;
  }

  const sumQty = rows.reduce((s, r) => s + r.qty, 0);
  const sumDisc = rows.reduce((s, r) => s + r.totalDiscount, 0);
  const sumNet = rows.reduce((s, r) => s + r.lineTotal, 0);

  return `
    <div class="table-wrap" style="max-height: 480px; overflow-y: auto;">
      <table class="raw-data-table">
        <thead>
          <tr>
            <th style="width: 45px;">#</th>
            <th>วันที่ / เวลา</th>
            <th>จุดขาย</th>
            <th>เลขที่บิล</th>
            <th>รายการสินค้า</th>
            <th style="text-align:right;">ราคาปกติ</th>
            <th style="text-align:right;">ราคาขายลดพิเศษ</th>
            <th style="text-align:right;">ส่วนลด/ชิ้น</th>
            <th style="text-align:center;">จำนวน</th>
            <th style="text-align:right;">รวมส่วนลด (บาท)</th>
            <th style="text-align:right;">ยอดสุทธิ (บาท)</th>
            <th>บุคคลที่ลดให้ / หมายเหตุ</th>
            <th style="text-align:center;">ชำระ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td style="color:#64748b; font-weight:700;">${i + 1}</td>
              <td style="white-space:nowrap;">
                <strong>${escapeHtml(r.date)}</strong>
                <small style="display:block; color:#94a3b8;">${escapeHtml(r.time)} น.</small>
              </td>
              <td>
                <span class="pos-code-badge" style="font-size:11px; padding:2px 7px;">${escapeHtml(r.terminal)}</span>
              </td>
              <td style="font-family:monospace; font-weight:700; color:#38bdf8;">
                ${escapeHtml(r.saleNo)}
              </td>
              <td>
                <strong>${escapeHtml(r.productName)}</strong>
                ${r.barcode && r.barcode !== "-" ? `<small style="display:block; color:#64748b; font-family:monospace;">${escapeHtml(r.barcode)}</small>` : ''}
              </td>
              <td style="text-align:right; color:#94a3b8; text-decoration:line-through; font-size:12px;">
                ฿${money(r.originalPrice)}
              </td>
              <td style="text-align:right; font-weight:700; color:#f8fafc;">
                ฿${money(r.unitPrice)}
              </td>
              <td style="text-align:right; color:#fbbf24; font-size:12px;">
                -฿${money(r.unitDiscount)}
              </td>
              <td style="text-align:center; font-weight:800; font-size:13px;">
                ${r.qty}
              </td>
              <td style="text-align:right; font-weight:800; color:#fbbf24; font-size:13px;">
                ฿${money(r.totalDiscount)}
              </td>
              <td style="text-align:right; font-weight:800; color:#34d399; font-size:13px;">
                ฿${money(r.lineTotal)}
              </td>
              <td>
                <span class="daily-discount-note-tag">
                  🏷️ ${escapeHtml(r.discountNote || "ลดเฉพาะบุคคล")}
                </span>
              </td>
              <td style="text-align:center;">
                ${r.paymentMethod === "cash" 
                  ? `<span class="raw-badge-cash">เงินสด</span>` 
                  : `<span class="raw-badge-qr">QR</span>`}
              </td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr style="background: rgba(15, 23, 42, 0.7); font-weight:800; border-top: 2px solid rgba(251, 191, 36, 0.3);">
            <td colspan="8" style="text-align:center; color:#f8fafc;">รวมรายการที่ลดราคาเฉพาะบุคคลทั้งสิ้น (${rows.length} รายการ)</td>
            <td style="text-align:center;">${sumQty}</td>
            <td style="text-align:right; color:#fbbf24; font-size:13.5px;">฿${money(sumDisc)}</td>
            <td style="text-align:right; color:#34d399; font-size:13.5px;">฿${money(sumNet)}</td>
            <td colspan="2">-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function buildReportPosBreakdownTab(data){
  return `
    <div class="pos-cards-grid">
      ${Object.values(data.terminalStats).map(t => {
        const isCurrent = state.terminal === t.code;
        return `
          <div class="pos-stat-card ${isCurrent ? 'active-terminal' : ''}">
            <div class="pos-card-head">
              <span class="pos-code-badge ${isCurrent ? 'current' : ''}">
                ${escapeHtml(t.code)}
                ${isCurrent ? '★ เครื่องนี้' : ''}
              </span>
              <span class="pos-share-badge">${t.pct}% ของยอดรวม</span>
            </div>

            <div class="pos-card-revenue">
              <span>ยอดขายรวม</span>
              <strong>฿${money(t.total)}</strong>
            </div>

            <div class="pos-card-metric-grid">
              <div class="pos-metric-box">
                <span class="p-label">จำนวนบิล</span>
                <span class="p-val">${t.bills} บิล</span>
              </div>
              <div class="pos-metric-box">
                <span class="p-label">เฉลี่ย / บิล</span>
                <span class="p-val">฿${money(t.avg)}</span>
              </div>
              <div class="pos-metric-box">
                <span class="p-label">สินค้าที่ขาย</span>
                <span class="p-val">${t.units} ชิ้น</span>
              </div>
              <div class="pos-metric-box">
                <span class="p-label">บิลสูงสุด</span>
                <span class="p-val">฿${money(t.maxBill)}</span>
              </div>
            </div>

            <div class="pos-payment-split">
              <div>💵 สด: <strong>฿${money(t.cashTotal)}</strong> (${t.cashBills})</div>
              <div>📱 QR: <strong>฿${money(t.qrTotal)}</strong> (${t.qrBills})</div>
            </div>

            <div class="pos-top-items-box">
              <h4>🔥 สินค้าขายดีประจำจุดนี้</h4>
              ${t.topProducts.length ? t.topProducts.map(p => `
                <div class="pos-top-item-row">
                  <span>${escapeHtml(p.name)}</span>
                  <strong>${p.qty} ชิ้น (฿${money(p.revenue)})</strong>
                </div>
              `).join("") : `<div style="color:#64748b; font-size:11px;">ยังไม่มีการขาย</div>`}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function buildReportRawDataTab(data){
  return `
    <div class="raw-search-bar">
      <div class="raw-search-input-wrap">
        ${G_ICONS.searchIcon}
        <input id="reportRawSearchInput" type="search" placeholder="ค้นหาตามเลขบิล, ชื่อสินค้า, บาร์โค้ด, จุดขาย..." value="${escapeHtml(state.reportRawSearch || "")}" oninput="onReportRawSearch(this.value)">
        ${state.reportRawSearch ? `<button class="raw-clear-btn" onclick="clearReportRawSearch()">✕</button>` : ''}
      </div>

      <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
        <span class="raw-count-tag" id="rawFilterCountTag">
          ทั้งหมด ${data.rawRows.length} รายการ
        </span>
        <button class="btn btn-export-excel" style="padding: 7px 12px; font-size: 12px;" onclick="exportRawItemsExcel(${!!state.reportRawSearch})" title="ดาวน์โหลดข้อมูลดิบในรูปแบบ Excel ตกแต่งสวยงาม">
          📗 Excel ข้อมูลดิบ
        </button>
        <button class="btn btn-file-csv" style="padding: 7px 12px; font-size: 12px;" onclick="exportRawItemsCSV(${!!state.reportRawSearch})" title="ดาวน์โหลดข้อมูลดิบในรูปแบบ CSV UTF-8">
          📄 CSV ข้อมูลดิบ
        </button>
      </div>
    </div>

    <div id="reportRawTableContainer">
      ${buildRawTableContent(data)}
    </div>
  `;
}

function buildRawTableContent(data){
  const q = (state.reportRawSearch || "").toLowerCase().trim();
  let rows = data.rawRows;

  if (q) {
    rows = rows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
  }

  const countTag = el("rawFilterCountTag");
  if (countTag) {
    countTag.textContent = q 
      ? `พบ ${rows.length} จากทั้งหมด ${data.rawRows.length} รายการ`
      : `ทั้งหมด ${data.rawRows.length} รายการ`;
  }

  if (rows.length === 0) {
    return `<div class="card"><div class="empty">ไม่พบข้อมูลดิบตรงกับคำค้นหา</div></div>`;
  }

  return `
    <div class="table-wrap" style="max-height: 520px; overflow-y: auto;">
      <table class="raw-data-table">
        <thead>
          <tr>
            <th style="width: 45px;">#</th>
            <th>วันที่ / เวลา</th>
            <th>จุดขาย (POS)</th>
            <th>เลขที่บิล</th>
            <th>รายการสินค้า</th>
            <th style="text-align:center;">จำนวน</th>
            <th style="text-align:right;">ราคา/หน่วย</th>
            <th style="text-align:right;">รวม (บาท)</th>
            <th style="text-align:center;">ชำระ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td style="color:#64748b; font-weight:700;">${i + 1}</td>
              <td style="white-space:nowrap;">
                <strong>${escapeHtml(r.date)}</strong>
                <small style="display:block; color:#94a3b8;">${escapeHtml(r.time)} น.</small>
              </td>
              <td>
                <span class="pos-code-badge" style="font-size:11px; padding:2px 7px;">${escapeHtml(r.terminal)}</span>
              </td>
              <td style="font-family:monospace; font-weight:700; color:#38bdf8;">
                ${escapeHtml(r.saleNo)}
              </td>
              <td>
                <strong>${escapeHtml(r.productName)}</strong>
                ${r.barcode && r.barcode !== "-" ? `<small style="display:block; color:#64748b; font-family:monospace;">${escapeHtml(r.barcode)}</small>` : ''}
              </td>
              <td style="text-align:center; font-weight:800; font-size:13px;">
                ${r.qty}
              </td>
              <td style="text-align:right;">
                ฿${money(r.unitPrice)}
              </td>
              <td style="text-align:right; font-weight:800; color:#34d399;">
                ฿${money(r.lineTotal)}
              </td>
              <td style="text-align:center;">
                ${r.paymentMethod === "cash" 
                  ? `<span class="raw-badge-cash">เงินสด</span>` 
                  : `<span class="raw-badge-qr">QR</span>`}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderReportPosChart(containerId, data){
  const container = el(containerId);
  if (!container || typeof d3 === "undefined") return;
  container.innerHTML = "";

  const chartData = Object.values(data.terminalStats);
  const width = Math.max(container.clientWidth || 400, 320);
  const height = 220;
  const margin = { top: 25, right: 20, bottom: 35, left: 60 };

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", height);

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", "posBarGrad")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#0284c7");

  const x = d3.scaleBand()
    .domain(chartData.map(d => d.code))
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const maxVal = d3.max(chartData, d => d.total) || 100;
  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.15])
    .range([height - margin.bottom, margin.top]);

  // Background Grid Lines
  svg.append("g")
    .attr("stroke", "rgba(255,255,255,0.06)")
    .attr("stroke-dasharray", "3,3")
    .selectAll("line")
    .data(y.ticks(4))
    .enter()
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d));

  // Bars
  svg.selectAll(".pos-bar")
    .data(chartData)
    .enter()
    .append("rect")
    .attr("class", "pos-bar")
    .attr("x", d => x(d.code))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.total))
    .attr("height", d => Math.max(0, height - margin.bottom - y(d.total)))
    .attr("rx", 6)
    .attr("fill", "url(#posBarGrad)")
    .attr("stroke", "rgba(56, 189, 248, 0.4)")
    .attr("stroke-width", 1);

  // Top Labels (฿ Value)
  svg.selectAll(".pos-val-label")
    .data(chartData)
    .enter()
    .append("text")
    .attr("class", "pos-val-label")
    .attr("x", d => x(d.code) + x.bandwidth() / 2)
    .attr("y", d => Math.max(margin.top - 6, y(d.total) - 6))
    .attr("text-anchor", "middle")
    .attr("fill", "#34d399")
    .attr("font-size", "11.5px")
    .attr("font-weight", "800")
    .text(d => d.total > 0 ? `฿${money(d.total)}` : "฿0");

  // X Axis labels
  svg.selectAll(".pos-x-label")
    .data(chartData)
    .enter()
    .append("text")
    .attr("class", "pos-x-label")
    .attr("x", d => x(d.code) + x.bandwidth() / 2)
    .attr("y", height - margin.bottom + 20)
    .attr("text-anchor", "middle")
    .attr("fill", d => state.terminal === d.code ? "#34d399" : "#94a3b8")
    .attr("font-size", "12px")
    .attr("font-weight", "800")
    .text(d => d.code + (state.terminal === d.code ? " ★" : ""));
}

// -------------------------------------------------------------
// Sales History Management, Filter & Receipt Inspector
// -------------------------------------------------------------

function initSalesHistoryFilter(){
  if (!state.salesHistoryFilter) {
    state.salesHistoryFilter = {
      period: "today",
      startDate: todayISO(),
      endDate: todayISO(),
      payment: "all",
      terminal: "all",
      search: "",
      page: 1,
      pageSize: 20
    };
  }
}

function getFilteredSalesHistory(){
  initSalesHistoryFilter();
  const f = state.salesHistoryFilter;
  let list = Array.isArray(state.sales) ? [...state.sales] : [];

  // Filter by Date Range
  if (f.startDate && f.endDate) {
    list = list.filter(s => {
      const d = s.sale_date || (s.created_at ? s.created_at.slice(0,10) : "");
      return d >= f.startDate && d <= f.endDate;
    });
  }

  // Filter by Payment Method
  if (f.payment && f.payment !== "all") {
    list = list.filter(s => {
      const pm = String(s.payment_method || "cash").toLowerCase();
      if (f.payment === "cash") return pm === "cash";
      if (f.payment === "promptpay" || f.payment === "qr") return pm === "promptpay" || pm === "qr" || pm === "transfer";
      return pm === f.payment;
    });
  }

  // Filter by Terminal
  if (f.terminal && f.terminal !== "all") {
    list = list.filter(s => (s.terminal_code || "POS-01") === f.terminal);
  }

  // Filter by Search Query
  if (f.search && f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    list = list.filter(s => {
      const saleNo = String(s.sale_no || s.id || "").toLowerCase();
      const term = String(s.terminal_code || "").toLowerCase();
      const note = String(s.note || "").toLowerCase();
      if (saleNo.includes(q) || term.includes(q) || note.includes(q)) return true;

      // Check items matching this sale
      const items = (state.saleItems || []).filter(i => i.sale_id === s.id || i.sale_id === s.sale_no);
      return items.some(i => String(i.product_name || "").toLowerCase().includes(q) || String(i.barcode || "").includes(q));
    });
  }

  // Sort Descending by Date and Time / Timestamp
  list.sort((a, b) => {
    const tA = (a.sale_date || "") + " " + (a.sale_time || "00:00:00") + " " + (a.created_at || "");
    const tB = (b.sale_date || "") + " " + (b.sale_time || "00:00:00") + " " + (b.created_at || "");
    return tB.localeCompare(tA);
  });

  return list;
}

function getSalesHistoryKPIs(filteredList){
  const totalRev = filteredList.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalBills = filteredList.length;
  const avgBill = totalBills > 0 ? (totalRev / totalBills) : 0;

  let cashTotal = 0;
  let cashBills = 0;
  let qrTotal = 0;
  let qrBills = 0;

  filteredList.forEach(s => {
    const amt = Number(s.total_amount || 0);
    const pm = String(s.payment_method || "cash").toLowerCase();
    if (pm === "promptpay" || pm === "qr" || pm === "transfer") {
      qrTotal += amt;
      qrBills++;
    } else {
      cashTotal += amt;
      cashBills++;
    }
  });

  // Calculate total units sold in this filtered set
  const saleIds = new Set(filteredList.map(s => s.id || s.sale_no));
  const matchedItems = (state.saleItems || []).filter(i => saleIds.has(i.sale_id));
  const totalUnits = matchedItems.reduce((sum, i) => sum + Number(i.qty || 0), 0);

  return { totalRev, totalBills, avgBill, cashTotal, cashBills, qrTotal, qrBills, totalUnits };
}

function setSalesHistoryPeriod(period){
  initSalesHistoryFilter();
  state.salesHistoryFilter.period = period;
  state.salesHistoryFilter.page = 1;

  if (period === "today") {
    state.salesHistoryFilter.startDate = todayISO();
    state.salesHistoryFilter.endDate = todayISO();
  } else if (period === "yesterday") {
    state.salesHistoryFilter.startDate = getNDaysAgoISO(1);
    state.salesHistoryFilter.endDate = getNDaysAgoISO(1);
  } else if (period === "7days") {
    state.salesHistoryFilter.startDate = getNDaysAgoISO(6);
    state.salesHistoryFilter.endDate = todayISO();
  } else if (period === "30days") {
    state.salesHistoryFilter.startDate = getNDaysAgoISO(29);
    state.salesHistoryFilter.endDate = todayISO();
  } else if (period === "all") {
    state.salesHistoryFilter.startDate = "2020-01-01";
    state.salesHistoryFilter.endDate = "2030-12-31";
  }

  renderSalesHistory();
}

function onSalesHistoryDateChange(){
  const sInput = el("shStartDate");
  const eInput = el("shEndDate");
  if (!sInput || !eInput) return;

  initSalesHistoryFilter();
  state.salesHistoryFilter.period = "custom";
  state.salesHistoryFilter.startDate = sInput.value || todayISO();
  state.salesHistoryFilter.endDate = eInput.value || sInput.value || todayISO();
  state.salesHistoryFilter.page = 1;

  renderSalesHistory();
}

function setSalesHistoryPayment(payment){
  initSalesHistoryFilter();
  state.salesHistoryFilter.payment = payment;
  state.salesHistoryFilter.page = 1;
  renderSalesHistory();
}

function setSalesHistoryTerminal(terminal){
  initSalesHistoryFilter();
  state.salesHistoryFilter.terminal = terminal;
  state.salesHistoryFilter.page = 1;
  renderSalesHistory();
}

function onSalesHistorySearch(val){
  initSalesHistoryFilter();
  state.salesHistoryFilter.search = val;
  state.salesHistoryFilter.page = 1;
  renderSalesHistory();
}

function clearSalesHistorySearch(){
  const input = el("shSearchInput");
  if (input) input.value = "";
  onSalesHistorySearch("");
}

function setSalesHistoryPage(p){
  initSalesHistoryFilter();
  state.salesHistoryFilter.page = Math.max(1, p);
  renderSalesHistory();
}

function setSalesHistoryPageSize(sz){
  initSalesHistoryFilter();
  state.salesHistoryFilter.pageSize = Number(sz || 20);
  state.salesHistoryFilter.page = 1;
  renderSalesHistory();
}

function openSaleDetailModal(saleIdentifier){
  const sale = (state.sales || []).find(s => s.id === saleIdentifier || s.sale_no === saleIdentifier);
  if (!sale) {
    toast("ไม่พบข้อมูลบิลดังกล่าว");
    return;
  }

  // Find all items associated with this sale
  const saleItems = (state.saleItems || []).filter(i => i.sale_id === sale.id || i.sale_id === sale.sale_no);
  
  const subtotalOrig = saleItems.reduce((sum, i) => sum + (Number(i.original_price || i.unit_price) * Number(i.qty || 1)), 0);
  const itemsTot = saleItems.reduce((sum, i) => sum + Number(i.line_total || (i.unit_price * i.qty)), 0);
  const itemsDiscAmt = saleItems.reduce((sum, i) => sum + (Number(i.discount_amount || 0) * Number(i.qty || 1)), 0);
  const billDiscAmt = Math.max(0, itemsTot - Number(sale.total_amount));
  const totalAmt = Number(sale.total_amount);

  const billObj = {
    saleNo: sale.sale_no || sale.id,
    subtotal: subtotalOrig > 0 ? subtotalOrig : totalAmt,
    itemsTotal: itemsTot > 0 ? itemsTot : totalAmt,
    itemsDiscount: itemsDiscAmt,
    billDiscount: billDiscAmt,
    billDiscountDetail: { type: billDiscAmt > 0 ? "baht" : "none", value: billDiscAmt, note: sale.note || "" },
    totalDiscount: itemsDiscAmt + billDiscAmt,
    total: totalAmt,
    received: Number(sale.received_amount || totalAmt),
    change: Number(sale.change_amount || 0),
    paymentMethod: sale.payment_method || "cash",
    items: saleItems.length > 0 ? saleItems.map(c => {
      const origPrice = Number(c.original_price ?? c.unit_price);
      const currPrice = Number(c.unit_price);
      const isDisc = Boolean(c.is_discounted || currPrice < origPrice);
      return {
        name: c.product_name || "สินค้า",
        unit: c.unit_name || "ชิ้น",
        qty: Number(c.qty || 1),
        unit_price: currPrice,
        original_price: origPrice,
        discount_amount: Math.max(0, origPrice - currPrice),
        discount_note: c.discount_note || "",
        is_discounted: isDisc,
        line_total: Number(c.qty || 1) * currPrice
      };
    }) : [
      {
        name: "รายการขาย (รหัส " + (sale.sale_no || sale.id) + ")",
        unit: "บิล",
        qty: 1,
        unit_price: totalAmt,
        original_price: totalAmt,
        discount_amount: 0,
        discount_note: "",
        is_discounted: false,
        line_total: totalAmt
      }
    ]
  };

  showReceiptModal(billObj);
}

function renderSalesHistory(){
  setHeader("ประวัติการขาย (Sales History)", "ตรวจสอบรายการบิลย้อนหลัง กรองตามช่วงเวลาและวิธีชำระเงิน");
  initSalesHistoryFilter();

  const f = state.salesHistoryFilter;
  const filteredList = getFilteredSalesHistory();
  const kpi = getSalesHistoryKPIs(filteredList);

  const totalCount = filteredList.length;
  const pageSize = Number(f.pageSize || 20);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, f.page || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filteredList.slice(startIndex, startIndex + pageSize);

  // Date range label
  let periodLabel = "";
  if (f.period === "today") periodLabel = `วันนี้ (${formatThaiDateStr(f.startDate)})`;
  else if (f.period === "yesterday") periodLabel = `เมื่อวาน (${formatThaiDateStr(f.startDate)})`;
  else if (f.period === "7days") periodLabel = `7 วันล่าสุด (${formatThaiDateStr(f.startDate)} - ${formatThaiDateStr(f.endDate)})`;
  else if (f.period === "30days") periodLabel = `30 วันล่าสุด (${formatThaiDateStr(f.startDate)} - ${formatThaiDateStr(f.endDate)})`;
  else if (f.period === "all") periodLabel = "ตลอดทั้งงาน (ทั้งหมด)";
  else periodLabel = f.startDate === f.endDate ? `วันที่ ${formatThaiDateStr(f.startDate)}` : `${formatThaiDateStr(f.startDate)} ถึง ${formatThaiDateStr(f.endDate)}`;

  // Find all terminals
  const terminals = ["all", "POS-01", "POS-02", "POS-03", "POS-04"];

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="sales-history-view">
      
      <!-- Filter Card -->
      <div class="sh-filter-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">📅</span>
            <strong style="font-size:15px; color:#f1f5f9;">ตัวกรองช่วงเวลาและเงื่อนไข</strong>
            <span style="font-size:12px; color:#38bdf8; font-weight:700;">[ ${escapeHtml(periodLabel)} ]</span>
          </div>
          <div style="font-size:12px; color:#94a3b8;">
            พบข้อมูลทั้งหมด <strong>${totalCount}</strong> บิล
          </div>
        </div>

        <!-- Quick Period Pills -->
        <div class="sh-period-pills">
          <button type="button" class="sh-pill-btn ${f.period === 'today' ? 'active' : ''}" onclick="setSalesHistoryPeriod('today')">⚡ วันนี้</button>
          <button type="button" class="sh-pill-btn ${f.period === 'yesterday' ? 'active' : ''}" onclick="setSalesHistoryPeriod('yesterday')">⏮️ เมื่อวาน</button>
          <button type="button" class="sh-pill-btn ${f.period === '7days' ? 'active' : ''}" onclick="setSalesHistoryPeriod('7days')">📊 7 วันล่าสุด</button>
          <button type="button" class="sh-pill-btn ${f.period === '30days' ? 'active' : ''}" onclick="setSalesHistoryPeriod('30days')">🗓️ 30 วันล่าสุด</button>
          <button type="button" class="sh-pill-btn ${f.period === 'all' ? 'active' : ''}" onclick="setSalesHistoryPeriod('all')">🌐 ตลอดทั้งงาน</button>
        </div>

        <!-- Inputs Grid -->
        <div class="sh-filter-controls-grid">
          <div class="sh-filter-field">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="shStartDate" class="sh-input" value="${escapeHtml(f.startDate)}" onchange="onSalesHistoryDateChange()">
          </div>
          <div class="sh-filter-field">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="shEndDate" class="sh-input" value="${escapeHtml(f.endDate)}" onchange="onSalesHistoryDateChange()">
          </div>
          <div class="sh-filter-field">
            <label>วิธีชำระเงิน</label>
            <select class="sh-select" onchange="setSalesHistoryPayment(this.value)">
              <option value="all" ${f.payment === 'all' ? 'selected' : ''}>ทั้งหมด (ทุกช่องทาง)</option>
              <option value="cash" ${f.payment === 'cash' ? 'selected' : ''}>💵 เงินสด (Cash)</option>
              <option value="promptpay" ${f.payment === 'promptpay' || f.payment === 'qr' ? 'selected' : ''}>📱 QR PromptPay</option>
            </select>
          </div>
          <div class="sh-filter-field">
            <label>จุดขาย (POS)</label>
            <select class="sh-select" onchange="setSalesHistoryTerminal(this.value)">
              <option value="all" ${f.terminal === 'all' ? 'selected' : ''}>ทั้งหมด (ทุกจุดขาย)</option>
              ${terminals.filter(t => t !== 'all').map(t => `<option value="${t}" ${f.terminal === t ? 'selected' : ''}>${t}</option>`).join("")}
            </select>
          </div>
          <div class="sh-filter-field" style="grid-column: span 1 / -1;">
            <label>ค้นหาเลขที่บิล / สินค้าในบิล</label>
            <div style="position:relative; display:flex; align-items:center;">
              <input type="text" id="shSearchInput" class="sh-input" placeholder="พิมพ์เลขที่บิล (เช่น S26...), ชื่อสินค้า, หรือหมายเหตุ..." value="${escapeHtml(f.search)}" oninput="onSalesHistorySearch(this.value)">
              ${f.search ? `<button type="button" style="position:absolute; right:10px; background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;" onclick="clearSalesHistorySearch()">✕</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="sh-kpi-grid">
        <div class="sh-kpi-card highlight">
          <div class="sh-kpi-label">💰 ยอดขายสุทธิรวม</div>
          <div class="sh-kpi-val cyan">฿${money(kpi.totalRev)}</div>
          <div class="sh-kpi-sub">เฉลี่ยต่อบิล: ฿${money(kpi.avgBill)}</div>
        </div>
        <div class="sh-kpi-card">
          <div class="sh-kpi-label">🧾 จำนวนบิลทั้งหมด</div>
          <div class="sh-kpi-val">${kpi.totalBills} <span style="font-size:16px; font-weight:600; color:#94a3b8;">บิล</span></div>
          <div class="sh-kpi-sub">ขายได้ทั้งหมด ${kpi.totalUnits} ชิ้น</div>
        </div>
        <div class="sh-kpi-card cash">
          <div class="sh-kpi-label">💵 ยอดเงินสด</div>
          <div class="sh-kpi-val emerald">฿${money(kpi.cashTotal)}</div>
          <div class="sh-kpi-sub">${kpi.cashBills} บิล (${kpi.totalBills > 0 ? ((kpi.cashBills/kpi.totalBills)*100).toFixed(0) : 0}%)</div>
        </div>
        <div class="sh-kpi-card qr">
          <div class="sh-kpi-label">📱 QR PromptPay</div>
          <div class="sh-kpi-val purple">฿${money(kpi.qrTotal)}</div>
          <div class="sh-kpi-sub">${kpi.qrBills} บิล (${kpi.totalBills > 0 ? ((kpi.qrBills/kpi.totalBills)*100).toFixed(0) : 0}%)</div>
        </div>
      </div>

      <!-- Table & List Card -->
      <div class="sh-table-card">
        <div class="sh-table-header-bar">
          <div class="sh-table-title">
            <span>📜</span>
            <span>รายการบิลการขาย</span>
            <span style="font-size:12px; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:999px;">
              ${pageItems.length} จาก ${totalCount} รายการ
            </span>
          </div>

          <div class="sh-table-actions">
            <button class="sh-btn-export" onclick="exportSalesHistoryExcel()" title="ส่งออกไฟล์ Excel">
              📥 Excel
            </button>
            <button class="sh-btn-export" onclick="exportSalesHistoryCSV()" title="ส่งออกไฟล์ CSV">
              📄 CSV
            </button>
            <button class="sh-btn-export" onclick="printSalesHistorySummary()" title="พิมพ์สรุปรายการ">
              🖨️ พิมพ์
            </button>
          </div>
        </div>

        ${pageItems.length === 0 ? `
          <div class="sh-empty-state">
            <div class="sh-empty-icon">📭</div>
            <strong style="font-size:16px; color:#cbd5e1;">ไม่พบรายการขายตามเงื่อนไขที่เลือก</strong>
            <p style="margin:0; font-size:13px;">ลองปรับเปลี่ยนช่วงเวลาค้นหา หรือกด "ตลอดทั้งงาน" เพื่อดูข้อมูลทั้งหมด</p>
            <button class="btn btn-primary" style="margin-top:8px;" onclick="setSalesHistoryPeriod('all')">ดูประวัติทั้งหมด</button>
          </div>
        ` : `
          <!-- Desktop Table -->
          <div class="sh-table-responsive-desktop" style="overflow-x:auto;">
            <table class="sh-table">
              <thead>
                <tr>
                  <th style="width:50px; text-align:center;">#</th>
                  <th>เลขที่บิล</th>
                  <th>วัน-เวลา</th>
                  <th>จุดขาย</th>
                  <th>ช่องทางชำระ</th>
                  <th>รายการสินค้า</th>
                  <th style="text-align:right;">ยอดรวมสุทธิ</th>
                  <th style="text-align:center; width:120px;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map((sale, idx) => {
                  const sItems = (state.saleItems || []).filter(i => i.sale_id === sale.id || i.sale_id === sale.sale_no);
                  const itemsCount = sItems.reduce((sum, i) => sum + Number(i.qty || 1), 0);
                  const itemsSummaryText = sItems.map(i => `${i.product_name || 'สินค้า'} (${i.qty})`).slice(0, 2).join(", ") + (sItems.length > 2 ? ` และอีก ${sItems.length - 2} รายการ` : "");
                  const isCash = !sale.payment_method || sale.payment_method === 'cash';
                  const rowNum = startIndex + idx + 1;
                  const timeFormatted = sale.sale_time ? sale.sale_time.slice(0, 5) + ' น.' : (sale.created_at ? new Date(sale.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-');

                  return `
                    <tr>
                      <td style="text-align:center; color:#64748b; font-size:11.5px; font-weight:700;">${rowNum}</td>
                      <td>
                        <span class="sh-sale-no" onclick="openSaleDetailModal('${sale.id || sale.sale_no}')" title="คลิกเพื่อดูใบเสร็จ">
                          🧾 ${escapeHtml(sale.sale_no || sale.id)}
                        </span>
                      </td>
                      <td>
                        <div style="font-weight:700; color:#f1f5f9;">${formatThaiDateStr(sale.sale_date)}</div>
                        <div style="font-size:11px; color:#64748b;">⏰ ${timeFormatted}</div>
                      </td>
                      <td>
                        <span style="display:inline-block; padding:2px 7px; background:rgba(255,255,255,0.06); border-radius:6px; font-size:11.5px; font-weight:700; color:#cbd5e1;">
                          ${escapeHtml(sale.terminal_code || 'POS-01')}
                        </span>
                      </td>
                      <td>
                        ${isCash ? `
                          <span class="sh-badge-cash">💵 เงินสด</span>
                        ` : `
                          <span class="sh-badge-qr">📱 พร้อมเพย์</span>
                        `}
                      </td>
                      <td>
                        <div class="sh-items-summary">
                          <span class="sh-items-text" title="${escapeHtml(itemsSummaryText)}">
                            ${escapeHtml(itemsSummaryText || 'รายการขาย')}
                          </span>
                          <span class="sh-items-count">${sItems.length} รายการ (${itemsCount} ชิ้น)</span>
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <strong style="font-size:14px; color:${isCash ? '#34d399' : '#c084fc'}; font-variant-numeric:tabular-nums;">
                          ฿${money(sale.total_amount)}
                        </strong>
                      </td>
                      <td style="text-align:center;">
                        <button type="button" class="sh-btn-view" onclick="openSaleDetailModal('${sale.id || sale.sale_no}')" title="ดูรายละเอียดใบเสร็จ">
                          👁️ รายละเอียด
                        </button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="sh-cards-mobile">
            ${pageItems.map((sale, idx) => {
              const sItems = (state.saleItems || []).filter(i => i.sale_id === sale.id || i.sale_id === sale.sale_no);
              const itemsCount = sItems.reduce((sum, i) => sum + Number(i.qty || 1), 0);
              const itemsSummaryText = sItems.map(i => `${i.product_name || 'สินค้า'} (${i.qty})`).slice(0, 3).join(", ") + (sItems.length > 3 ? `...` : "");
              const isCash = !sale.payment_method || sale.payment_method === 'cash';
              const timeFormatted = sale.sale_time ? sale.sale_time.slice(0, 5) + ' น.' : '-';

              return `
                <div class="sh-sale-card-mobile" onclick="openSaleDetailModal('${sale.id || sale.sale_no}')">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="sh-sale-no">🧾 ${escapeHtml(sale.sale_no || sale.id)}</span>
                    <strong style="font-size:15px; color:${isCash ? '#34d399' : '#c084fc'}; font-variant-numeric:tabular-nums;">
                      ฿${money(sale.total_amount)}
                    </strong>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8;">
                    <span>📅 ${formatThaiDateShort(sale.sale_date)} · ${timeFormatted} · ${escapeHtml(sale.terminal_code || 'POS-01')}</span>
                    ${isCash ? `<span class="sh-badge-cash">💵 เงินสด</span>` : `<span class="sh-badge-qr">📱 QR</span>`}
                  </div>

                  <div style="font-size:12px; color:#cbd5e1; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:8px;">
                    ${escapeHtml(itemsSummaryText || 'รายการสินค้า')} <span style="color:#94a3b8;">(${itemsCount} ชิ้น)</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Pagination Bar -->
          <div class="sh-pagination-bar">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:12px; color:#94a3b8;">แสดงหน้าละ:</span>
              <select class="sh-select" style="width:auto; padding:4px 8px; font-size:12px;" onchange="setSalesHistoryPageSize(this.value)">
                <option value="20" ${pageSize === 20 ? 'selected' : ''}>20 บิล</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 บิล</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 บิล</option>
              </select>
              <span style="font-size:12px; color:#94a3b8;">(หน้า ${currentPage} จาก ${totalPages})</span>
            </div>

            <div style="display:flex; gap:6px;">
              <button class="btn btn-light" style="padding:5px 12px; font-size:12px;" ${currentPage <= 1 ? 'disabled' : ''} onclick="setSalesHistoryPage(${currentPage - 1})">
                ◀ หน้าก่อนหน้า
              </button>
              <button class="btn btn-light" style="padding:5px 12px; font-size:12px;" ${currentPage >= totalPages ? 'disabled' : ''} onclick="setSalesHistoryPage(${currentPage + 1})">
                หน้าถัดไป ▶
              </button>
            </div>
          </div>
        `}
      </div>

    </div>
  `;
}

function exportSalesHistoryExcel(){
  const filtered = getFilteredSalesHistory();
  if(!filtered.length){
    toast("ไม่มีข้อมูลสำหรับส่งออก");
    return;
  }
  const f = state.salesHistoryFilter || {};
  const kpi = getSalesHistoryKPIs(filtered);

  let rowsHtml = filtered.map((s, idx) => {
    const sItems = (state.saleItems || []).filter(i => i.sale_id === s.id || i.sale_id === s.sale_no);
    const itemNames = sItems.map(i => `${i.product_name} (${i.qty} ${i.unit_name || 'ชิ้น'})`).join(", ");
    const isCash = !s.payment_method || s.payment_method === "cash";
    const paymentText = isCash ? "เงินสด (Cash)" : "QR PromptPay";
    const zebraClass = idx % 2 === 1 ? "zebra" : "";

    return `
      <tr class="${zebraClass}">
        <td class="td-c">${idx + 1}</td>
        <td class="td-c td-bold">${escapeHtml(s.sale_no || s.id)}</td>
        <td class="td-c">${s.sale_date || '-'}</td>
        <td class="td-c">${s.sale_time || '-'}</td>
        <td class="td-c">${escapeHtml(s.terminal_code || 'POS-01')}</td>
        <td class="td-c ${isCash ? 'badge-cash' : 'badge-qr'}">${paymentText}</td>
        <td class="td-l">${escapeHtml(itemNames || '-')}</td>
        <td class="td-r">${sItems.reduce((sum, i) => sum + Number(i.qty || 1), 0)}</td>
        <td class="td-cur">฿${money(s.total_amount)}</td>
      </tr>
    `;
  }).join("");

  const bodyHtml = `
    <table border="0" cellspacing="0" cellpadding="0" style="width:100%; margin-bottom:12px;">
      <tr>
        <td colspan="9" class="title-banner">ประวัติการขายและรายการบิล (Sales Transaction History)</td>
      </tr>
      <tr>
        <td colspan="9" class="subtitle">
          ช่วงเวลา: ${f.startDate || todayISO()} ถึง ${f.endDate || todayISO()} | ส่งออกเมื่อ: ${new Date().toLocaleString("th-TH")}
        </td>
      </tr>
    </table>

    <table border="0" cellspacing="0" cellpadding="0" style="width:100%; margin-bottom:16px;">
      <tr>
        <td class="kpi-lbl">จำนวนบิลทั้งหมด</td>
        <td class="kpi-val">${kpi.totalBills} บิล</td>
        <td class="kpi-lbl">ยอดขายสุทธิรวม</td>
        <td class="kpi-val" style="color:#0f766e;">฿${money(kpi.totalRev)}</td>
        <td class="kpi-lbl">ยอดเงินสด</td>
        <td class="kpi-val" style="color:#059669;">฿${money(kpi.cashTotal)} (${kpi.cashBills} บิล)</td>
        <td class="kpi-lbl">ยอด QR PromptPay</td>
        <td class="kpi-val" style="color:#4f46e5;">฿${money(kpi.qrTotal)} (${kpi.qrBills} บิล)</td>
      </tr>
    </table>

    <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th class="th-col" style="width:40px;">#</th>
          <th class="th-col">เลขที่บิล</th>
          <th class="th-col">วันที่</th>
          <th class="th-col">เวลา</th>
          <th class="th-col">จุดขาย</th>
          <th class="th-col">วิธีชำระ</th>
          <th class="th-col">รายการสินค้า</th>
          <th class="th-col">จำนวนชิ้น</th>
          <th class="th-col">ยอดรวมสุทธิ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td colspan="7" class="td-r" style="font-size:12pt;">รวมยอดสุทธิทั้งสิ้น (${kpi.totalBills} บิล)</td>
          <td class="td-r" style="font-size:12pt;">${kpi.totalUnits}</td>
          <td class="td-cur" style="font-size:13pt; color:#0f766e;">฿${money(kpi.totalRev)}</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadExcel(`EA_Fair_Sales_History_${(f.startDate || todayISO()).replace(/-/g,'')}_to_${(f.endDate || todayISO()).replace(/-/g,'')}.xls`, bodyHtml, "Sales History");
  toast("ส่งออกไฟล์ Excel ประวัติการขายสำเร็จ 📥");
}

function exportSalesHistoryCSV(){
  const filtered = getFilteredSalesHistory();
  if(!filtered.length){
    toast("ไม่มีข้อมูลสำหรับส่งออก");
    return;
  }
  const f = state.salesHistoryFilter || {};

  const headers = ["ลำดับ", "เลขที่บิล", "วันที่", "เวลา", "จุดขาย", "วิธีชำระเงิน", "รายการสินค้า", "จำนวนชิ้น", "ยอดสุทธิ (บาท)"];
  const rows = [headers];

  filtered.forEach((s, idx) => {
    const sItems = (state.saleItems || []).filter(i => i.sale_id === s.id || i.sale_id === s.sale_no);
    const itemNames = sItems.map(i => `${i.product_name} (${i.qty})`).join("; ");
    const isCash = !s.payment_method || s.payment_method === "cash";
    const paymentText = isCash ? "เงินสด" : "QR PromptPay";
    const units = sItems.reduce((sum, i) => sum + Number(i.qty || 1), 0);

    rows.push([
      idx + 1,
      s.sale_no || s.id,
      s.sale_date || "-",
      s.sale_time || "-",
      s.terminal_code || "POS-01",
      paymentText,
      itemNames,
      units,
      s.total_amount
    ]);
  });

  downloadCSV(`EA_Fair_Sales_History_${(f.startDate || todayISO()).replace(/-/g,'')}_to_${(f.endDate || todayISO()).replace(/-/g,'')}.csv`, rows);
  toast("ส่งออกไฟล์ CSV ประวัติการขายสำเร็จ 📄");
}

function printSalesHistorySummary(){
  window.print();
}

// -------------------------------------------------------------
// Expense Tracking & True Net Profit Calculation Engine
// -------------------------------------------------------------

const EXPENSE_CATEGORIES = [
  { id: "booth_rent", name: "🎪 ค่าเช่าบูธ / พื้นที่", short: "ค่าเช่าบูธ", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)" },
  { id: "transport", name: "🚚 ค่าเดินทาง / ขนส่งสต็อก", short: "ขนส่ง/เดินทาง", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  { id: "staff", name: "👥 ค่าจ้างสตาฟฟ์ / เบี้ยเลี้ยง", short: "ค่าแรง/สตาฟฟ์", color: "#c084fc", bg: "rgba(168, 85, 247, 0.15)" },
  { id: "food", name: "🍱 ค่าอาหาร / น้ำดื่มทีมงาน", short: "อาหาร/เครื่องดื่ม", color: "#fb7185", bg: "rgba(251, 113, 133, 0.15)" },
  { id: "packaging", name: "🛍️ ค่าถุง / กล่อง / บรรจุภัณฑ์", short: "ถุง/บรรจุภัณฑ์", color: "#34d399", bg: "rgba(52, 211, 153, 0.15)" },
  { id: "marketing", name: "📢 ค่าการตลาด / ป้าย / สื่อ", short: "การตลาด/ป้าย", color: "#facc15", bg: "rgba(234, 179, 8, 0.15)" },
  { id: "other", name: "🧾 ค่าใช้จ่ายเบ็ดเตล็ดอื่นๆ", short: "เบ็ดเตล็ด", color: "#cbd5e1", bg: "rgba(148, 163, 184, 0.15)" }
];

function getCategoryInfo(catId){
  return EXPENSE_CATEGORIES.find(c => c.id === catId) || { id: catId || "other", name: "🧾 " + (catId || "อื่นๆ"), short: catId || "อื่นๆ", color: "#cbd5e1", bg: "rgba(148, 163, 184, 0.15)" };
}

function initExpenseFilter(){
  if (!state.expensePeriod) state.expensePeriod = "today";
  if (!state.expenseDateStart) {
    if (state.expensePeriod === "today") state.expenseDateStart = todayISO();
    else if (state.expensePeriod === "yesterday") state.expenseDateStart = getNDaysAgoISO(1);
    else if (state.expensePeriod === "7days") state.expenseDateStart = getNDaysAgoISO(6);
    else if (state.expensePeriod === "30days") state.expenseDateStart = getNDaysAgoISO(29);
    else if (state.expensePeriod === "all") state.expenseDateStart = "2020-01-01";
    else state.expenseDateStart = todayISO();
  }
  if (!state.expenseDateEnd) {
    if (state.expensePeriod === "yesterday") state.expenseDateEnd = getNDaysAgoISO(1);
    else if (state.expensePeriod === "all") state.expenseDateEnd = "2030-12-31";
    else state.expenseDateEnd = todayISO();
  }
  if (!state.expenseCategoryFilter) state.expenseCategoryFilter = "all";
}

function setExpensePeriod(period){
  initExpenseFilter();
  state.expensePeriod = period;
  if (period === "today") {
    state.expenseDateStart = todayISO();
    state.expenseDateEnd = todayISO();
  } else if (period === "yesterday") {
    state.expenseDateStart = getNDaysAgoISO(1);
    state.expenseDateEnd = getNDaysAgoISO(1);
  } else if (period === "7days") {
    state.expenseDateStart = getNDaysAgoISO(6);
    state.expenseDateEnd = todayISO();
  } else if (period === "30days") {
    state.expenseDateStart = getNDaysAgoISO(29);
    state.expenseDateEnd = todayISO();
  } else if (period === "all") {
    state.expenseDateStart = "2020-01-01";
    state.expenseDateEnd = "2030-12-31";
  }
  renderExpenses();
}

function onExpenseDateChange(){
  const sInput = el("expStartDate");
  const eInput = el("expEndDate");
  if (!sInput || !eInput) return;
  initExpenseFilter();
  state.expensePeriod = "custom";
  state.expenseDateStart = sInput.value || todayISO();
  state.expenseDateEnd = eInput.value || sInput.value || todayISO();
  renderExpenses();
}

function setExpenseCategoryFilter(cat){
  state.expenseCategoryFilter = cat;
  renderExpenses();
}

function onExpenseSearch(val){
  state.expenseSearch = val;
  renderExpenses();
}

function clearExpenseSearch(){
  const input = el("expSearchInput");
  if(input) input.value = "";
  onExpenseSearch("");
}

function calculateFinancials(){
  initExpenseFilter();
  const start = state.expenseDateStart || todayISO();
  const end = state.expenseDateEnd || todayISO();

  // 1. Sales Revenue
  const salesInRange = (state.sales || []).filter(s => {
    const d = s.sale_date || (s.created_at ? s.created_at.slice(0, 10) : "");
    return d >= start && d <= end;
  });
  const revenue = salesInRange.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalBills = salesInRange.length;

  // 2. Cost of Goods Sold (COGS)
  const saleIds = new Set(salesInRange.map(s => s.id || s.sale_no));
  const itemsInRange = (state.saleItems || []).filter(i => saleIds.has(i.sale_id));
  
  let cogs = 0;
  let totalUnitsSold = 0;
  itemsInRange.forEach(item => {
    const qty = Number(item.qty || 1);
    totalUnitsSold += qty;
    const prod = productById(item.product_id) || productByBarcode(item.barcode);
    let unitCost = 0;
    if (prod && prod.cost_price !== undefined && prod.cost_price !== null && prod.cost_price !== "" && Number(prod.cost_price) > 0) {
      unitCost = Number(prod.cost_price);
    } else {
      // Fallback estimate: 60% of unit price if cost is not explicitly defined
      unitCost = Number(item.unit_price || 0) * 0.6;
    }
    cogs += unitCost * qty;
  });

  // 3. Gross Profit
  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // 4. Operating Expenses
  const expensesInRange = (state.expenses || []).filter(e => {
    const d = e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : "");
    return d >= start && d <= end;
  });

  const totalExpenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalExpenseItems = expensesInRange.length;

  // Category breakdown
  const catBreakdown = {};
  EXPENSE_CATEGORIES.forEach(c => { catBreakdown[c.id] = { count: 0, amount: 0, category: c }; });
  expensesInRange.forEach(e => {
    const cat = e.category || "other";
    if (!catBreakdown[cat]) catBreakdown[cat] = { count: 0, amount: 0, category: getCategoryInfo(cat) };
    catBreakdown[cat].count += 1;
    catBreakdown[cat].amount += Number(e.amount || 0);
  });

  // Payment method breakdown for expenses
  let expCash = 0, expTransfer = 0;
  expensesInRange.forEach(e => {
    if (e.payment_method === "cash") expCash += Number(e.amount || 0);
    else expTransfer += Number(e.amount || 0);
  });

  // 5. True Net Profit
  const netProfit = grossProfit - totalExpenses;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Apply search & category filter to table list
  let displayedExpenses = [...expensesInRange];
  if (state.expenseCategoryFilter && state.expenseCategoryFilter !== "all") {
    displayedExpenses = displayedExpenses.filter(e => e.category === state.expenseCategoryFilter);
  }
  if (state.expenseSearch && state.expenseSearch.trim()) {
    const q = state.expenseSearch.trim().toLowerCase();
    displayedExpenses = displayedExpenses.filter(e => {
      const cat = getCategoryInfo(e.category);
      return (e.title || "").toLowerCase().includes(q) ||
             (e.note || "").toLowerCase().includes(q) ||
             (e.recorder || "").toLowerCase().includes(q) ||
             cat.name.toLowerCase().includes(q);
    });
  }

  // Sort descending by date & time
  displayedExpenses.sort((a, b) => {
    const tA = (a.expense_date || "") + " " + (a.expense_time || "") + " " + (a.created_at || "");
    const tB = (b.expense_date || "") + " " + (b.expense_time || "") + " " + (b.created_at || "");
    return tB.localeCompare(tA);
  });

  return {
    revenue,
    totalBills,
    totalUnitsSold,
    cogs,
    grossProfit,
    grossMarginPct,
    totalExpenses,
    totalExpenseItems,
    expCash,
    expTransfer,
    netProfit,
    netMarginPct,
    catBreakdown,
    displayedExpenses,
    expensesInRange
  };
}

function openExpenseModal(expenseId){
  const modal = el("expenseModal");
  if(!modal) return;

  const form = el("expenseForm");
  if(form) form.reset();

  const titleEl = el("expenseModalTitle");
  const editIdEl = el("expEditId");
  const catEl = el("expCategory");
  const tEl = el("expTitle");
  const amtEl = el("expAmount");
  const payEl = el("expPaymentMethod");
  const dateEl = el("expDate");
  const recEl = el("expRecorder");
  const noteEl = el("expNote");

  if(expenseId){
    const exp = (state.expenses || []).find(e => e.id === expenseId);
    if(exp){
      if(titleEl) titleEl.textContent = "แก้ไขรายการค่าใช้จ่าย";
      if(editIdEl) editIdEl.value = exp.id;
      if(catEl) catEl.value = exp.category || "other";
      if(tEl) tEl.value = exp.title || "";
      if(amtEl) amtEl.value = exp.amount || "";
      if(payEl) payEl.value = exp.payment_method || "cash";
      if(dateEl) dateEl.value = exp.expense_date || todayISO();
      if(recEl) recEl.value = exp.recorder || state.terminal || "POS-01";
      if(noteEl) noteEl.value = exp.note || "";
      modal.showModal();
      return;
    }
  }

  // New Expense Default
  if(titleEl) titleEl.textContent = "บันทึกค่าใช้จ่ายหน้างาน";
  if(editIdEl) editIdEl.value = "";
  if(catEl) catEl.value = "booth_rent";
  if(tEl) tEl.value = "";
  if(amtEl) amtEl.value = "";
  if(payEl) payEl.value = "cash";
  if(dateEl) dateEl.value = todayISO();
  if(recEl) recEl.value = state.terminal || "POS-01";
  if(noteEl) noteEl.value = "";

  modal.showModal();
}

function closeExpenseModal(){
  const modal = el("expenseModal");
  if(modal && modal.open) modal.close();
}

function saveExpenseFromModal(){
  const editId = el("expEditId")?.value || "";
  const category = el("expCategory")?.value || "other";
  const title = (el("expTitle")?.value || "").trim();
  const amount = Number(el("expAmount")?.value || 0);
  const payment_method = el("expPaymentMethod")?.value || "cash";
  const expense_date = el("expDate")?.value || todayISO();
  const recorder = (el("expRecorder")?.value || state.terminal || "POS-01").trim();
  const note = (el("expNote")?.value || "").trim();

  if(!title){
    toast("กรุณาระบุรายละเอียดค่าใช้จ่าย");
    return;
  }
  if(isNaN(amount) || amount <= 0){
    toast("กรุณาระบุจำนวนเงินที่ถูกต้อง");
    return;
  }

  if(!Array.isArray(state.expenses)) state.expenses = [];

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);

  if(editId){
    const idx = state.expenses.findIndex(e => e.id === editId);
    if(idx !== -1){
      state.expenses[idx] = {
        ...state.expenses[idx],
        category,
        title,
        amount,
        payment_method,
        expense_date,
        recorder,
        note,
        updated_at: now.toISOString()
      };
      toast(`แก้ไขค่าใช้จ่าย "${title}" สำเร็จ 💸`);
    }
  } else {
    const newExp = {
      id: "exp-" + Date.now(),
      category,
      title,
      amount,
      payment_method,
      expense_date,
      expense_time: timeStr,
      recorder,
      note,
      created_at: now.toISOString()
    };
    state.expenses.unshift(newExp);
    toast(`บันทึกค่าใช้จ่าย ฿${money(amount)} สำเร็จ 💸`);
  }

  saveLocalState();
  closeExpenseModal();
  renderExpenses();
}

function deleteExpense(expenseId){
  const exp = (state.expenses || []).find(e => e.id === expenseId);
  if(!exp) return;
  
  if(confirm(`คุณต้องการลบรายการค่าใช้จ่าย "${exp.title}" (฿${money(exp.amount)}) หรือไม่?`)){
    state.expenses = state.expenses.filter(e => e.id !== expenseId);
    saveLocalState();
    toast(`ลบรายการค่าใช้จ่ายแล้ว`);
    renderExpenses();
  }
}

function renderExpenses(){
  setHeader("บันทึกค่าใช้จ่าย & กำไรสุทธิแท้จริง (Expenses & Net Profit)", "วิเคราะห์รายได้ ต้นทุนสินค้า ค่าใช้จ่ายหน้างาน และผลกำไรขาดทุนสุทธิ");
  initExpenseFilter();

  const f = {
    period: state.expensePeriod,
    startDate: state.expenseDateStart,
    endDate: state.expenseDateEnd,
    category: state.expenseCategoryFilter,
    search: state.expenseSearch
  };

  const fin = calculateFinancials();

  // Date range label
  let periodLabel = "";
  if (f.period === "today") periodLabel = `วันนี้ (${formatThaiDateStr(f.startDate)})`;
  else if (f.period === "yesterday") periodLabel = `เมื่อวาน (${formatThaiDateStr(f.startDate)})`;
  else if (f.period === "7days") periodLabel = `7 วันล่าสุด (${formatThaiDateStr(f.startDate)} - ${formatThaiDateStr(f.endDate)})`;
  else if (f.period === "30days") periodLabel = `30 วันล่าสุด (${formatThaiDateStr(f.startDate)} - ${formatThaiDateStr(f.endDate)})`;
  else if (f.period === "all") periodLabel = "ตลอดทั้งงาน (ทั้งหมด)";
  else periodLabel = f.startDate === f.endDate ? `วันที่ ${formatThaiDateStr(f.startDate)}` : `${formatThaiDateStr(f.startDate)} ถึง ${formatThaiDateStr(f.endDate)}`;

  const isProfitable = fin.netProfit >= 0;

  el("content").innerHTML = `
    ${connectionNotice()}
    <div class="expense-view">

      <!-- Period Filter & Action Card -->
      <div class="sh-filter-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:20px;">📅</span>
            <strong style="font-size:15px; color:#f1f5f9;">ช่วงเวลาประเมินงบกำไรขาดทุน</strong>
            <span style="font-size:12px; color:#38bdf8; font-weight:700;">[ ${escapeHtml(periodLabel)} ]</span>
          </div>
          <button class="btn btn-primary" onclick="openExpenseModal()" style="background:#10b981; border-color:#059669; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
            <span>➕</span> บันทึกค่าใช้จ่ายใหม่
          </button>
        </div>

        <!-- Quick Period Pills -->
        <div class="sh-period-pills">
          <button type="button" class="sh-pill-btn ${f.period === 'today' ? 'active' : ''}" onclick="setExpensePeriod('today')">⚡ วันนี้</button>
          <button type="button" class="sh-pill-btn ${f.period === 'yesterday' ? 'active' : ''}" onclick="setExpensePeriod('yesterday')">⏮️ เมื่อวาน</button>
          <button type="button" class="sh-pill-btn ${f.period === '7days' ? 'active' : ''}" onclick="setExpensePeriod('7days')">📊 7 วันล่าสุด</button>
          <button type="button" class="sh-pill-btn ${f.period === '30days' ? 'active' : ''}" onclick="setExpensePeriod('30days')">🗓️ 30 วันล่าสุด</button>
          <button type="button" class="sh-pill-btn ${f.period === 'all' ? 'active' : ''}" onclick="setExpensePeriod('all')">🌐 ตลอดทั้งงาน</button>
        </div>

        <!-- Inputs Grid -->
        <div class="sh-filter-controls-grid">
          <div class="sh-filter-field">
            <label>วันที่เริ่มต้น</label>
            <input type="date" id="expStartDate" class="sh-input" value="${escapeHtml(f.startDate)}" onchange="onExpenseDateChange()">
          </div>
          <div class="sh-filter-field">
            <label>วันที่สิ้นสุด</label>
            <input type="date" id="expEndDate" class="sh-input" value="${escapeHtml(f.endDate)}" onchange="onExpenseDateChange()">
          </div>
          <div class="sh-filter-field">
            <label>หมวดหมู่ค่าใช้จ่าย</label>
            <select class="sh-select" onchange="setExpenseCategoryFilter(this.value)">
              <option value="all" ${f.category === 'all' ? 'selected' : ''}>ทั้งหมด (ทุกหมวดหมู่)</option>
              ${EXPENSE_CATEGORIES.map(c => `<option value="${c.id}" ${f.category === c.id ? 'selected' : ''}>${c.name}</option>`).join("")}
            </select>
          </div>
          <div class="sh-filter-field">
            <label>ค้นหารายการค่าใช้จ่าย</label>
            <div style="position:relative; display:flex; align-items:center;">
              <input type="text" id="expSearchInput" class="sh-input" placeholder="พิมพ์ชื่อรายการ, ผู้บันทึก, หมายเหตุ..." value="${escapeHtml(f.search || '')}" oninput="onExpenseSearch(this.value)">
              ${f.search ? `<button type="button" style="position:absolute; right:10px; background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;" onclick="clearExpenseSearch()">✕</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Statement Waterfall Card -->
      <div class="profit-waterfall-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:22px;">📊</span>
            <div>
              <strong style="font-size:16px; color:#f8fafc;">งบกำไรขาดทุนแท้จริงหน้างาน (Booth Income & Net Profit Statement)</strong>
              <div style="font-size:11.5px; color:#94a3b8;">คำนวณจากยอดขายจริง หักต้นทุนสินค้า (COGS) และค่าใช้จ่ายบูธทั้งหมด</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="category-pill-badge ${isProfitable ? 'cat-packaging' : 'cat-food'}" style="font-size:13px; padding:4px 12px;">
              ${isProfitable ? '🟢 มีกำไรสุทธิ (Profitable)' : '🔴 ขาดทุนจากการดำเนินงาน (Operating Loss)'}
            </span>
          </div>
        </div>

        <div class="waterfall-step-grid">
          
          <!-- 1. Gross Revenue -->
          <div class="waterfall-step-card">
            <div>
              <div class="waterfall-step-lbl">💰 1. ยอดขายสุทธิรวม</div>
              <div class="waterfall-step-val" style="color:#38bdf8;">฿${money(fin.revenue)}</div>
            </div>
            <div class="waterfall-step-sub">${fin.totalBills} บิล (${fin.totalUnitsSold} ชิ้น)</div>
          </div>

          <!-- 2. COGS -->
          <div class="waterfall-step-card">
            <div>
              <div class="waterfall-step-lbl">📦 2. หัก ต้นทุนสินค้า (COGS)</div>
              <div class="waterfall-step-val" style="color:#f59e0b;">-฿${money(fin.cogs)}</div>
            </div>
            <div class="waterfall-step-sub">ต้นทุนสินค้าที่ขายไปจริง</div>
          </div>

          <!-- 3. Gross Profit -->
          <div class="waterfall-step-card">
            <div>
              <div class="waterfall-step-lbl">🏷️ 3. กำไรขั้นต้น (Gross Profit)</div>
              <div class="waterfall-step-val" style="color:#60a5fa;">฿${money(fin.grossProfit)}</div>
            </div>
            <div class="waterfall-step-sub">Gross Margin: <strong style="color:#93c5fd;">${fin.grossMarginPct.toFixed(1)}%</strong></div>
          </div>

          <!-- 4. Total Expenses -->
          <div class="waterfall-step-card">
            <div>
              <div class="waterfall-step-lbl">💸 4. หัก ค่าใช้จ่ายหน้างาน</div>
              <div class="waterfall-step-val" style="color:#f43f5e;">-฿${money(fin.totalExpenses)}</div>
            </div>
            <div class="waterfall-step-sub">${fin.totalExpenseItems} รายการ (สด ฿${money(fin.expCash)} / โอน ฿${money(fin.expTransfer)})</div>
          </div>

          <!-- 5. Net Profit -->
          <div class="waterfall-step-card ${isProfitable ? 'net-profit' : 'net-loss'}">
            <div>
              <div class="waterfall-step-lbl" style="color:${isProfitable ? '#34d399' : '#f87171'};">
                🏆 5. กำไรสุทธิแท้จริง (Net Profit)
              </div>
              <div class="waterfall-step-val" style="color:${isProfitable ? '#10b981' : '#ef4444'}; font-size:24px;">
                ${isProfitable ? '' : '-'}฿${money(Math.abs(fin.netProfit))}
              </div>
            </div>
            <div class="waterfall-step-sub" style="color:#e2e8f0;">
              Net Margin: <strong style="color:${isProfitable ? '#6ee7b7' : '#fca5a5'};">${fin.netMarginPct.toFixed(1)}%</strong>
            </div>
          </div>

        </div>
      </div>

      <!-- Category Breakdown Progress Bars -->
      <div class="profit-waterfall-card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">📊</span>
            <strong style="font-size:14px; color:#f1f5f9;">สัดส่วนค่าใช้จ่ายแยกตามหมวดหมู่ (Expense Category Breakdown)</strong>
          </div>
          <span style="font-size:12px; color:#94a3b8;">รวมทั้งหมด <strong>฿${money(fin.totalExpenses)}</strong></span>
        </div>

        <div class="category-bars-grid">
          ${EXPENSE_CATEGORIES.map(cat => {
            const data = fin.catBreakdown[cat.id] || { count: 0, amount: 0 };
            const pct = fin.totalExpenses > 0 ? (data.amount / fin.totalExpenses) * 100 : 0;
            return `
              <div class="category-bar-item" onclick="setExpenseCategoryFilter('${cat.id}')" style="cursor:pointer;" title="คลิกเพื่อกรองเฉพาะ ${cat.name}">
                <div class="category-bar-head">
                  <span class="category-pill-badge cat-${cat.id}">${cat.name}</span>
                  <strong style="color:${cat.color}; font-variant-numeric:tabular-nums;">฿${money(data.amount)} <small style="font-weight:normal; color:#94a3b8;">(${pct.toFixed(1)}%)</small></strong>
                </div>
                <div class="category-bar-track">
                  <div class="category-bar-fill" style="width:${pct}%; background:${cat.color};"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b;">
                  <span>${data.count} รายการ</span>
                  <span>${cat.short}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Expenses Log Table Card -->
      <div class="sh-table-card">
        <div class="sh-table-header-bar">
          <div class="sh-table-title">
            <span>🧾</span>
            <span>รายการค่าใช้จ่ายหน้างาน</span>
            <span style="font-size:12px; font-weight:700; color:#34d399; background:rgba(52,211,153,0.15); padding:2px 8px; border-radius:999px;">
              ${fin.displayedExpenses.length} รายการ
            </span>
          </div>

          <div class="sh-table-actions">
            <button class="sh-btn-export" onclick="exportExpensesExcel()" title="ส่งออกไฟล์ Excel">
              📥 Excel
            </button>
            <button class="sh-btn-export" onclick="exportExpensesCSV()" title="ส่งออกไฟล์ CSV">
              📄 CSV
            </button>
            <button class="sh-btn-export" onclick="printExpensesReport()" title="พิมพ์รายงาน">
              🖨️ พิมพ์
            </button>
            <button class="btn btn-primary" onclick="openExpenseModal()" style="background:#10b981; border-color:#059669; font-size:12px; padding:5px 12px;">
              ➕ เพิ่มค่าใช้จ่าย
            </button>
          </div>
        </div>

        ${fin.displayedExpenses.length === 0 ? `
          <div class="sh-empty-state">
            <div class="sh-empty-icon">💸</div>
            <strong style="font-size:16px; color:#cbd5e1;">ไม่พบรายการค่าใช้จ่ายในช่วงเวลาที่เลือก</strong>
            <p style="margin:0; font-size:13px;">สามารถกดปุ่ม "เพิ่มค่าใช้จ่าย" ด้านบนเพื่อบันทึกค่าใช้จ่ายหน้างาน</p>
            <button class="btn btn-primary" style="margin-top:8px; background:#10b981; border-color:#059669;" onclick="openExpenseModal()">➕ บันทึกค่าใช้จ่ายแรก</button>
          </div>
        ` : `
          <!-- Desktop Table -->
          <div class="sh-table-responsive-desktop" style="overflow-x:auto;">
            <table class="sh-table">
              <thead>
                <tr>
                  <th style="width:50px; text-align:center;">#</th>
                  <th>วันที่-เวลา</th>
                  <th>หมวดหมู่</th>
                  <th>รายการ / รายละเอียด</th>
                  <th>ผู้บันทึก</th>
                  <th>วิธีชำระ</th>
                  <th>หมายเหตุ</th>
                  <th style="text-align:right;">จำนวนเงิน (บาท)</th>
                  <th style="text-align:center; width:130px;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${fin.displayedExpenses.map((exp, idx) => {
                  const cat = getCategoryInfo(exp.category);
                  const isCash = exp.payment_method === "cash";
                  return `
                    <tr>
                      <td style="text-align:center; color:#64748b; font-size:11.5px; font-weight:700;">${idx + 1}</td>
                      <td>
                        <div style="font-weight:700; color:#f1f5f9;">${formatThaiDateStr(exp.expense_date)}</div>
                        <div style="font-size:11px; color:#64748b;">⏰ ${exp.expense_time ? exp.expense_time + ' น.' : '-'}</div>
                      </td>
                      <td>
                        <span class="category-pill-badge cat-${cat.id}">${cat.name}</span>
                      </td>
                      <td>
                        <strong style="color:#f8fafc; font-size:13px;">${escapeHtml(exp.title)}</strong>
                      </td>
                      <td>
                        <span style="font-size:11.5px; color:#94a3b8; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">
                          ${escapeHtml(exp.recorder || 'POS-01')}
                        </span>
                      </td>
                      <td>
                        ${isCash ? `<span class="sh-badge-cash">💵 เงินสด</span>` : `<span class="sh-badge-qr">📱 โอน/QR</span>`}
                      </td>
                      <td>
                        <span style="font-size:12px; color:#94a3b8;">${escapeHtml(exp.note || '-')}</span>
                      </td>
                      <td style="text-align:right;">
                        <strong style="font-size:15px; color:#f43f5e; font-variant-numeric:tabular-nums;">
                          -฿${money(exp.amount)}
                        </strong>
                      </td>
                      <td style="text-align:center;">
                        <div style="display:flex; justify-content:center; gap:6px;">
                          <button type="button" class="sh-btn-view" onclick="openExpenseModal('${exp.id}')" title="แก้ไข">
                            ✏️
                          </button>
                          <button type="button" class="sh-btn-view" style="color:#f87171; border-color:rgba(239,68,68,0.3);" onclick="deleteExpense('${exp.id}')" title="ลบ">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
                <tr style="background:rgba(255,255,255,0.02); font-weight:700;">
                  <td colspan="7" style="text-align:right; font-size:13px; color:#cbd5e1;">รวมค่าใช้จ่ายทั้งหมด (${fin.displayedExpenses.length} รายการ):</td>
                  <td style="text-align:right; font-size:15px; color:#f43f5e;">-฿${money(fin.displayedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="sh-cards-mobile">
            ${fin.displayedExpenses.map((exp, idx) => {
              const cat = getCategoryInfo(exp.category);
              const isCash = exp.payment_method === "cash";
              return `
                <div class="sh-sale-card-mobile">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <span class="category-pill-badge cat-${cat.id}">${cat.name}</span>
                      <div style="font-weight:700; color:#f8fafc; font-size:14px; margin-top:4px;">${escapeHtml(exp.title)}</div>
                    </div>
                    <strong style="font-size:16px; color:#f43f5e; font-variant-numeric:tabular-nums;">
                      -฿${money(exp.amount)}
                    </strong>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8;">
                    <span>📅 ${formatThaiDateShort(exp.expense_date)} ${exp.expense_time ? '· ' + exp.expense_time : ''} · ${escapeHtml(exp.recorder || 'POS')}</span>
                    ${isCash ? `<span class="sh-badge-cash">💵 เงินสด</span>` : `<span class="sh-badge-qr">📱 โอน</span>`}
                  </div>

                  ${exp.note ? `<div style="font-size:12px; color:#94a3b8; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px;">📝 ${escapeHtml(exp.note)}</div>` : ''}

                  <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
                    <button class="btn btn-light" style="font-size:11px; padding:3px 8px;" onclick="openExpenseModal('${exp.id}')">✏️ แก้ไข</button>
                    <button class="btn btn-light" style="font-size:11px; padding:3px 8px; color:#f87171;" onclick="deleteExpense('${exp.id}')">🗑️ ลบ</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </div>

    </div>
  `;
}

function exportExpensesExcel(){
  const fin = calculateFinancials();
  const f = {
    startDate: state.expenseDateStart || todayISO(),
    endDate: state.expenseDateEnd || todayISO()
  };

  let rowsHtml = fin.displayedExpenses.map((exp, idx) => {
    const cat = getCategoryInfo(exp.category);
    const zebraClass = idx % 2 === 1 ? "zebra" : "";
    return `
      <tr class="${zebraClass}">
        <td class="td-c">${idx + 1}</td>
        <td class="td-c">${exp.expense_date || '-'}</td>
        <td class="td-c">${exp.expense_time || '-'}</td>
        <td class="td-c">${cat.name}</td>
        <td class="td-l td-bold">${escapeHtml(exp.title)}</td>
        <td class="td-c">${exp.payment_method === 'cash' ? 'เงินสด' : 'โอน/QR'}</td>
        <td class="td-c">${escapeHtml(exp.recorder || 'POS')}</td>
        <td class="td-l">${escapeHtml(exp.note || '-')}</td>
        <td class="td-cur" style="color:#b91c1c;">-฿${money(exp.amount)}</td>
      </tr>
    `;
  }).join("");

  const bodyHtml = `
    <table border="0" cellspacing="0" cellpadding="0" style="width:100%; margin-bottom:12px;">
      <tr>
        <td colspan="9" class="title-banner">รายงานค่าใช้จ่ายและงบกำไรสุทธิแท้จริง (Booth Expenses & Profit Statement)</td>
      </tr>
      <tr>
        <td colspan="9" class="subtitle">
          ช่วงเวลา: ${f.startDate} ถึง ${f.endDate} | ส่งออกเมื่อ: ${new Date().toLocaleString("th-TH")}
        </td>
      </tr>
    </table>

    <table border="0" cellspacing="0" cellpadding="0" style="width:100%; margin-bottom:16px;">
      <tr>
        <td class="kpi-lbl">1. ยอดขายสุทธิ</td>
        <td class="kpi-val" style="color:#0f766e;">฿${money(fin.revenue)}</td>
        <td class="kpi-lbl">2. ต้นทุนสินค้า (COGS)</td>
        <td class="kpi-val" style="color:#d97706;">-฿${money(fin.cogs)}</td>
        <td class="kpi-lbl">3. กำไรขั้นต้น</td>
        <td class="kpi-val" style="color:#2563eb;">฿${money(fin.grossProfit)} (${fin.grossMarginPct.toFixed(1)}%)</td>
        <td class="kpi-lbl">4. ค่าใช้จ่ายบูธรวม</td>
        <td class="kpi-val" style="color:#dc2626;">-฿${money(fin.totalExpenses)}</td>
        <td class="kpi-lbl">5. กำไรสุทธิแท้จริง</td>
        <td class="kpi-val" style="color:${fin.netProfit >= 0 ? '#059669' : '#dc2626'}; font-size:14pt; font-weight:bold;">฿${money(fin.netProfit)} (${fin.netMarginPct.toFixed(1)}%)</td>
      </tr>
    </table>

    <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th class="th-col" style="width:40px;">#</th>
          <th class="th-col">วันที่</th>
          <th class="th-col">เวลา</th>
          <th class="th-col">หมวดหมู่</th>
          <th class="th-col">รายการค่าใช้จ่าย</th>
          <th class="th-col">วิธีจ่าย</th>
          <th class="th-col">ผู้บันทึก</th>
          <th class="th-col">หมายเหตุ</th>
          <th class="th-col">จำนวนเงิน (บาท)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td colspan="8" class="td-r" style="font-size:12pt;">รวมค่าใช้จ่ายหน้างานทั้งสิ้น (${fin.displayedExpenses.length} รายการ)</td>
          <td class="td-cur" style="font-size:13pt; color:#dc2626;">-฿${money(fin.displayedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadExcel(`EA_Fair_Expenses_Profit_${f.startDate.replace(/-/g,'')}_to_${f.endDate.replace(/-/g,'')}.xls`, bodyHtml, "Expenses & Profit");
  toast("ส่งออกไฟล์ Excel ค่าใช้จ่ายและกำไรสุทธิสำเร็จ 📥");
}

function exportExpensesCSV(){
  const fin = calculateFinancials();
  const f = {
    startDate: state.expenseDateStart || todayISO(),
    endDate: state.expenseDateEnd || todayISO()
  };

  const headers = ["ลำดับ", "วันที่", "เวลา", "หมวดหมู่", "รายการค่าใช้จ่าย", "วิธีชำระเงิน", "ผู้บันทึก", "หมายเหตุ", "จำนวนเงิน (บาท)"];
  const rows = [headers];

  fin.displayedExpenses.forEach((exp, idx) => {
    const cat = getCategoryInfo(exp.category);
    rows.push([
      idx + 1,
      exp.expense_date || "-",
      exp.expense_time || "-",
      cat.name,
      exp.title,
      exp.payment_method === 'cash' ? 'เงินสด' : 'โอน/QR',
      exp.recorder || "POS",
      exp.note || "-",
      exp.amount
    ]);
  });

  downloadCSV(`EA_Fair_Expenses_${f.startDate.replace(/-/g,'')}_to_${f.endDate.replace(/-/g,'')}.csv`, rows);
  toast("ส่งออกไฟล์ CSV ค่าใช้จ่ายสำเร็จ 📄");
}

function printExpensesReport(){
  window.print();
}


function getThaiDayOfWeek(dateStr) {
  if (!dateStr || dateStr.length < 10) return "-";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const idx = d.getDay();
    return isNaN(idx) ? "-" : `วัน${days[idx]}`;
  } catch {
    return "-";
  }
}

function downloadCSV(name,rows){
  const csv="\ufeff"+rows.map(r=>{
    if (!r || r.length === 0) return "";
    return r.map(v => {
      if (v === null || v === undefined) return '""';
      const s = String(v);
      return `"${s.replaceAll('"','""')}"`;
    }).join(",");
  }).join("\r\n");

  const b=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const u=URL.createObjectURL(b);
  const a=document.createElement("a");
  a.href=u;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    try{document.body.removeChild(a)}catch{}
    URL.revokeObjectURL(u);
  },100);
}

function downloadExcel(name, bodyHtml, title="Sales Report"){
  const cleanTitle = String(title).replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || "Report";
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${cleanTitle}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body, table { font-family: 'Segoe UI', Tahoma, 'Prompt', sans-serif; font-size: 11pt; color: #1e293b; }
  .title-banner { background-color: #0f172a; color: #38bdf8; font-size: 15pt; font-weight: bold; padding: 12px; text-align: left; }
  .subtitle { background-color: #1e293b; color: #cbd5e1; font-size: 10pt; font-weight: normal; padding: 6px; }
  .section-hdr { background-color: #1e293b; color: #38bdf8; font-size: 12pt; font-weight: bold; padding: 8px; }
  .kpi-lbl { background-color: #f1f5f9; color: #475569; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1; }
  .kpi-val { background-color: #ffffff; color: #0284c7; font-size: 12pt; font-weight: bold; padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; }
  .th-col { background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #0369a1; padding: 8px; vertical-align: middle; }
  .th-col-green { background-color: #059669; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #047857; padding: 8px; vertical-align: middle; }
  .th-col-indigo { background-color: #4f46e5; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #4338ca; padding: 8px; vertical-align: middle; }
  .th-col-amber { background-color: #d97706; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #b45309; padding: 8px; vertical-align: middle; }
  .td-c { border: 1px solid #cbd5e1; text-align: center; padding: 6px 8px; vertical-align: middle; mso-number-format: "\\@"; }
  .td-l { border: 1px solid #cbd5e1; text-align: left; padding: 6px 8px; vertical-align: middle; }
  .td-r { border: 1px solid #cbd5e1; text-align: right; padding: 6px 8px; vertical-align: middle; mso-number-format: "\\#\\,\\#\\#0"; }
  .td-cur { border: 1px solid #cbd5e1; text-align: right; padding: 6px 8px; vertical-align: middle; font-weight: bold; color: #0f766e; mso-number-format: "\\#\\,\\#\\#0\\.00"; }
  .td-bold { font-weight: bold; }
  .zebra { background-color: #f8fafc; }
  .total-row { background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #0284c7; border-bottom: 3px double #0f172a; }
  .total-row td { padding: 8px; font-weight: bold; }
  .badge-cash { color: #059669; font-weight: bold; }
  .badge-qr { color: #0284c7; font-weight: bold; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const blob = new Blob(["\ufeff", fullHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
    URL.revokeObjectURL(u);
  }, 100);
}

function exportMasterReportExcel(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="11" class="title-banner">📊 รายงานภาพรวมและข้อมูลดิบแบบสมบูรณ์ (MASTER SALES REPORT)</td>
      </tr>
      <tr>
        <td colspan="11" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; ⏰ ส่งออกเมื่อ: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="11" height="15"></td></tr>

      <!-- Section 1: Executive KPI Summary -->
      <tr><td colspan="11" class="section-hdr">[1] สรุปตัวชี้วัดหลัก (EXECUTIVE SUMMARY)</td></tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💰 ยอดขายรวมสุทธิ</td>
        <td colspan="8" class="kpi-val" style="color:#059669; font-size:14pt;">฿${money(data.totalRevenue)}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">🧾 จำนวนบิลทั้งหมด</td>
        <td colspan="8" class="kpi-val">${data.totalBills} บิล (เฉลี่ย ฿${money(data.avgTicket)} / บิล)</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">📦 จำนวนสินค้าที่ขายออก</td>
        <td colspan="8" class="kpi-val">${data.totalUnitsSold} ชิ้น</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💵 ยอดชำระเงินสด (Cash)</td>
        <td colspan="8" class="kpi-val">฿${money(data.cashTotal)} (${data.cashBills} บิล • ${data.totalRevenue > 0 ? ((data.cashTotal/data.totalRevenue)*100).toFixed(1) : 0}%)</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">📱 ยอดชำระ QR PromptPay</td>
        <td colspan="8" class="kpi-val">฿${money(data.qrTotal)} (${data.qrBills} บิล • ${data.totalRevenue > 0 ? ((data.qrTotal/data.totalRevenue)*100).toFixed(1) : 0}%)</td>
      </tr>
      <tr><td colspan="11" height="20"></td></tr>

      <!-- Section 2: Daily Sales Breakdown -->
      <tr><td colspan="11" class="section-hdr">[2] สรุปยอดขายรายวัน (DAILY SALES BREAKDOWN - ${data.dailyStats.length} วัน)</td></tr>
      <tr height="30">
        <th class="th-col" width="60">ลำดับ</th>
        <th class="th-col" width="110">วันที่ขาย</th>
        <th class="th-col" width="100">วันในสัปดาห์</th>
        <th class="th-col" width="130">ยอดขาย (บาท)</th>
        <th class="th-col" width="80">สัดส่วน</th>
        <th class="th-col" width="80">จำนวนบิล</th>
        <th class="th-col" width="110">เฉลี่ย/บิล</th>
        <th class="th-col" width="80">สินค้า (ชิ้น)</th>
        <th class="th-col" width="110">เงินสด</th>
        <th class="th-col" width="110">QR</th>
        <th class="th-col" width="220">สินค้าขายดีประจำวัน</th>
      </tr>
      ${data.dailyStats.map((d, idx) => `
        <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c td-bold">${idx + 1}</td>
          <td class="td-c td-bold">${d.date}</td>
          <td class="td-c">${getThaiDayOfWeek(d.date)}</td>
          <td class="td-cur" style="color:#059669;">${Number(d.total.toFixed(2))}</td>
          <td class="td-c">${d.pct}%</td>
          <td class="td-r">${d.bills}</td>
          <td class="td-cur">${Number(d.avg.toFixed(2))}</td>
          <td class="td-r">${d.units}</td>
          <td class="td-cur">${Number(d.cashTotal.toFixed(2))}</td>
          <td class="td-cur">${Number(d.qrTotal.toFixed(2))}</td>
          <td class="td-l">${d.topProducts && d.topProducts[0] ? `${escapeHtml(d.topProducts[0].name)} (${d.topProducts[0].qty} ชิ้น)` : '-'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td class="td-c" colspan="3">รวมรายวันทั้งสิ้น (${data.dailyStats.length} วัน)</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td class="td-c">100%</td>
        <td class="td-r">${data.totalBills}</td>
        <td class="td-cur">${Number(data.avgTicket.toFixed(2))}</td>
        <td class="td-r">${data.totalUnitsSold}</td>
        <td class="td-cur">${Number(data.cashTotal.toFixed(2))}</td>
        <td class="td-cur">${Number(data.qrTotal.toFixed(2))}</td>
        <td class="td-c">-</td>
      </tr>
      <tr><td colspan="11" height="20"></td></tr>

      <!-- Section 3: POS Breakdown -->
      <tr><td colspan="11" class="section-hdr">[3] สรุปเปรียบเทียบแยกรายจุดขาย (POS BREAKDOWN)</td></tr>
      <tr height="30">
        <th class="th-col" width="120">จุดขาย (POS)</th>
        <th class="th-col" width="130">ยอดขายรวม (บาท)</th>
        <th class="th-col" width="100">สัดส่วน (%)</th>
        <th class="th-col" width="100">จำนวนบิล</th>
        <th class="th-col" width="120">ยอดเฉลี่ย/บิล</th>
        <th class="th-col" width="100">จำนวนชิ้น</th>
        <th class="th-col" width="120">ยอดเงินสด</th>
        <th class="th-col" width="120">ยอด QR</th>
        <th colspan="3" class="th-col" width="250">สินค้าขายดีอันดับ 1</th>
      </tr>
      ${Object.values(data.terminalStats).map((t, idx) => `
        <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c td-bold">${t.code}</td>
          <td class="td-cur">${Number(t.total.toFixed(2))}</td>
          <td class="td-c">${t.pct}%</td>
          <td class="td-r">${t.bills}</td>
          <td class="td-cur">${Number(t.avg.toFixed(2))}</td>
          <td class="td-r">${t.units}</td>
          <td class="td-cur">${Number(t.cashTotal.toFixed(2))}</td>
          <td class="td-cur">${Number(t.qrTotal.toFixed(2))}</td>
          <td colspan="3" class="td-l">${t.topProducts && t.topProducts[0] ? `${escapeHtml(t.topProducts[0].name)} (${t.topProducts[0].qty} ชิ้น)` : '-'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td class="td-c">รวมทุกจุดขาย</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td class="td-c">100%</td>
        <td class="td-r">${data.totalBills}</td>
        <td class="td-cur">${Number(data.avgTicket.toFixed(2))}</td>
        <td class="td-r">${data.totalUnitsSold}</td>
        <td class="td-cur">${Number(data.cashTotal.toFixed(2))}</td>
        <td class="td-cur">${Number(data.qrTotal.toFixed(2))}</td>
        <td colspan="3" class="td-c">-</td>
      </tr>
      <tr><td colspan="11" height="20"></td></tr>

      <!-- Section 4: Top Products -->
      <tr><td colspan="11" class="section-hdr">[4] 5 อันดับสินค้าขายดีที่สุด (TOP 5 SELLING PRODUCTS)</td></tr>
      <tr height="30">
        <th class="th-col-indigo" width="60">อันดับ</th>
        <th colspan="4" class="th-col-indigo" width="300">ชื่อสินค้า</th>
        <th colspan="2" class="th-col-indigo" width="120">จำนวนที่ขายได้ (ชิ้น)</th>
        <th colspan="4" class="th-col-indigo" width="160">ยอดขายรวม (บาท)</th>
      </tr>
      ${data.topProductsGlobal.slice(0, 5).map((p, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c td-bold">${i + 1}</td>
          <td colspan="4" class="td-l">${escapeHtml(p.name)}</td>
          <td colspan="2" class="td-r td-bold">${p.qty}</td>
          <td colspan="4" class="td-cur">${Number(p.revenue.toFixed(2))}</td>
        </tr>
      `).join('')}
      <tr><td colspan="11" height="20"></td></tr>

      <!-- Section 5: Itemized Raw Transactions -->
      <tr><td colspan="11" class="section-hdr">[5] ข้อมูลดิบรายการขายสินค้าย่อยทั้งหมด (${data.rawRows.length} รายการ)</td></tr>
      <tr height="30">
        <th class="th-col-green" width="50">ลำดับ</th>
        <th class="th-col-green" width="100">วันที่ขาย</th>
        <th class="th-col-green" width="80">เวลา (น.)</th>
        <th class="th-col-green" width="90">จุดขาย</th>
        <th class="th-col-green" width="130">เลขที่บิล</th>
        <th class="th-col-green" width="130">บาร์โค้ด</th>
        <th class="th-col-green" width="240">ชื่อสินค้า</th>
        <th class="th-col-green" width="80">จำนวน</th>
        <th class="th-col-green" width="100">ราคา/หน่วย</th>
        <th class="th-col-green" width="110">ยอดรวม</th>
        <th class="th-col-green" width="120">วิธีชำระเงิน</th>
      </tr>
      ${data.rawRows.map((r, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c">${i + 1}</td>
          <td class="td-c">${r.date}</td>
          <td class="td-c">${r.time}</td>
          <td class="td-c td-bold">${escapeHtml(r.terminal)}</td>
          <td class="td-c td-bold">${escapeHtml(r.saleNo)}</td>
          <td class="td-c">${escapeHtml(r.barcode || '-')}</td>
          <td class="td-l">${escapeHtml(r.productName)}</td>
          <td class="td-r td-bold">${r.qty}</td>
          <td class="td-cur">${Number(r.unitPrice.toFixed(2))}</td>
          <td class="td-cur">${Number(r.lineTotal.toFixed(2))}</td>
          <td class="td-c ${r.paymentMethod === 'qr' ? 'badge-qr' : 'badge-cash'}">${r.paymentMethod === 'qr' ? 'QR PromptPay' : 'เงินสด'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="6" class="td-c">รวมข้อมูลดิบทั้งสิ้น (${data.rawRows.length} รายการ)</td>
        <td class="td-l">รวมทั้งหมด</td>
        <td class="td-r">${data.totalUnitsSold}</td>
        <td class="td-c">-</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td class="td-c">-</td>
      </tr>
    </table>
  `;

  const filename = `EA_Master_Report_${data.period}_${data.termFilter}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "Master Sales Report");
  toast(`ส่งออก Excel รายงานสมบูรณ์แบบเรียบร้อย 📗`);
}

function exportRawItemsExcel(isCurrentSearchResult = false){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  let targetRows = data.rawRows;
  let searchNote = "ทั้งหมด";
  if (isCurrentSearchResult && state.reportRawSearch) {
    const q = state.reportRawSearch.toLowerCase().trim();
    targetRows = targetRows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
    searchNote = `ผลการค้นหา: "${state.reportRawSearch}"`;
  }

  const sumQty = targetRows.reduce((sum, r) => sum + r.qty, 0);
  const sumRevenue = targetRows.reduce((sum, r) => sum + r.lineTotal, 0);

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="11" class="title-banner" style="background-color:#064e3b; color:#34d399;">📦 รายงานข้อมูลดิบการขายสินค้ารายชิ้น (ITEMIZED RAW SALES)</td>
      </tr>
      <tr>
        <td colspan="11" class="subtitle" style="background-color:#022c22;">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; 🔍 สถานะ: <b>${escapeHtml(searchNote)}</b> &nbsp;|&nbsp; ⏰ ส่งออก: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="11" height="15"></td></tr>

      <tr>
        <td colspan="3" class="kpi-lbl">จำนวนรายการ (แถว)</td>
        <td colspan="8" class="kpi-val">${targetRows.length} แถว</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">จำนวนชิ้นสินค้ารวม</td>
        <td colspan="8" class="kpi-val">${sumQty} ชิ้น</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">ยอดรวมมูลค่าขายสุทธิ</td>
        <td colspan="8" class="kpi-val" style="color:#059669; font-size:13pt;">฿${money(sumRevenue)}</td>
      </tr>
      <tr><td colspan="11" height="15"></td></tr>

      <tr height="32">
        <th class="th-col-green" width="50">ลำดับ</th>
        <th class="th-col-green" width="100">วันที่ขาย</th>
        <th class="th-col-green" width="80">เวลา (น.)</th>
        <th class="th-col-green" width="90">จุดขาย</th>
        <th class="th-col-green" width="130">เลขที่บิล</th>
        <th class="th-col-green" width="130">รหัสบาร์โค้ด</th>
        <th class="th-col-green" width="250">ชื่อสินค้า</th>
        <th class="th-col-green" width="80">จำนวน</th>
        <th class="th-col-green" width="110">ราคา/หน่วย (บาท)</th>
        <th class="th-col-green" width="120">ยอดรวม (บาท)</th>
        <th class="th-col-green" width="120">วิธีชำระเงิน</th>
      </tr>
      ${targetRows.map((r, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c">${i + 1}</td>
          <td class="td-c">${r.date}</td>
          <td class="td-c">${r.time}</td>
          <td class="td-c td-bold">${escapeHtml(r.terminal)}</td>
          <td class="td-c td-bold">${escapeHtml(r.saleNo)}</td>
          <td class="td-c">${escapeHtml(r.barcode || '-')}</td>
          <td class="td-l">${escapeHtml(r.productName)}</td>
          <td class="td-r td-bold">${r.qty}</td>
          <td class="td-cur">${Number(r.unitPrice.toFixed(2))}</td>
          <td class="td-cur">${Number(r.lineTotal.toFixed(2))}</td>
          <td class="td-c ${r.paymentMethod === 'qr' ? 'badge-qr' : 'badge-cash'}">${r.paymentMethod === 'qr' ? 'QR PromptPay' : 'เงินสด'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="6" class="td-c">รวมข้อมูลดิบทั้งสิ้น (${targetRows.length} รายการ)</td>
        <td class="td-l">รวมทั้งหมด</td>
        <td class="td-r">${sumQty}</td>
        <td class="td-c">-</td>
        <td class="td-cur">${Number(sumRevenue.toFixed(2))}</td>
        <td class="td-c">-</td>
      </tr>
    </table>
  `;

  const filename = `EA_Raw_Sales_Items_${data.period}_${data.termFilter}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "Raw Sales Items");
  toast(`ส่งออก Excel ข้อมูลดิบ (${targetRows.length} รายการ) เรียบร้อย 📗`);
}

function exportSalesExcel(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="9" class="title-banner">🧾 รายงานสรุปรายการบิลการขาย (SALES BILLS SUMMARY)</td>
      </tr>
      <tr>
        <td colspan="9" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; ⏰ ส่งออก: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="9" height="15"></td></tr>

      <tr>
        <td colspan="3" class="kpi-lbl">จำนวนบิลทั้งหมด</td>
        <td colspan="6" class="kpi-val">${data.totalBills} บิล</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">ยอดขายรวมทั้งสิ้น</td>
        <td colspan="6" class="kpi-val" style="color:#059669; font-size:13pt;">฿${money(data.totalRevenue)}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">ยอดเฉลี่ยต่อบิล</td>
        <td colspan="6" class="kpi-val">฿${money(data.avgTicket)}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">ยอดเงินสด / ยอด QR</td>
        <td colspan="6" class="kpi-val">สด: ฿${money(data.cashTotal)} (${data.cashBills} บิล) &nbsp;|&nbsp; QR: ฿${money(data.qrTotal)} (${data.qrBills} บิล)</td>
      </tr>
      <tr><td colspan="9" height="15"></td></tr>

      <tr height="32">
        <th class="th-col" width="60">ลำดับ</th>
        <th class="th-col" width="110">วันที่ขาย</th>
        <th class="th-col" width="90">เวลา (น.)</th>
        <th class="th-col" width="100">จุดขาย</th>
        <th class="th-col" width="140">เลขที่บิล</th>
        <th class="th-col" width="130">ยอดเงินรวม (บาท)</th>
        <th class="th-col" width="130">ช่องทางชำระ</th>
        <th class="th-col" width="120">เงินที่รับ (บาท)</th>
        <th class="th-col" width="110">เงินทอน (บาท)</th>
      </tr>
      ${data.filteredSales.map((s, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c">${i + 1}</td>
          <td class="td-c">${s.sale_date || '-'}</td>
          <td class="td-c">${String(s.sale_time || '').slice(0, 5) || '-'}</td>
          <td class="td-c td-bold">${escapeHtml(s.terminal_code || 'POS-01')}</td>
          <td class="td-c td-bold">${escapeHtml(s.sale_no || '-')}</td>
          <td class="td-cur">${Number((Number(s.total_amount) || 0).toFixed(2))}</td>
          <td class="td-c ${isQrPayment(s.payment_method) ? 'badge-qr' : 'badge-cash'}">${isQrPayment(s.payment_method) ? 'QR PromptPay' : 'เงินสด'}</td>
          <td class="td-r">${s.received_amount !== undefined && s.received_amount !== null ? Number(Number(s.received_amount).toFixed(2)) : '-'}</td>
          <td class="td-r">${s.change_amount !== undefined && s.change_amount !== null ? Number(Number(s.change_amount).toFixed(2)) : '-'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" class="td-c">รวมทั้งสิ้น</td>
        <td class="td-c">${data.totalBills} บิล</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td colspan="3" class="td-c">สด: ฿${money(data.cashTotal)} / QR: ฿${money(data.qrTotal)}</td>
      </tr>
    </table>
  `;

  const filename = `EA_Sales_Bills_${data.period}_${data.termFilter}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "Sales Bills Summary");
  toast(`ส่งออก Excel สรุปบิล (${data.filteredSales.length} บิล) เรียบร้อย 📗`);
}

function exportPosSummaryExcel(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const nowStr = new Date().toLocaleString("th-TH");

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="12" class="title-banner">🏢 รายงานสรุปผลงานแยกตามจุดขาย (POS PERFORMANCE SUMMARY)</td>
      </tr>
      <tr>
        <td colspan="12" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; ⏰ ส่งออก: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="12" height="15"></td></tr>

      <tr height="32">
        <th class="th-col" width="120">จุดขาย (POS)</th>
        <th class="th-col" width="130">ยอดขายรวม (บาท)</th>
        <th class="th-col" width="100">สัดส่วน (%)</th>
        <th class="th-col" width="100">จำนวนบิล</th>
        <th class="th-col" width="120">ยอดเฉลี่ย/บิล</th>
        <th class="th-col" width="100">จำนวนชิ้น</th>
        <th class="th-col" width="120">ยอดเงินสด</th>
        <th class="th-col" width="90">บิลสด</th>
        <th class="th-col" width="120">ยอด QR</th>
        <th class="th-col" width="90">บิล QR</th>
        <th class="th-col" width="120">บิลสูงสุด</th>
        <th class="th-col" width="220">สินค้าขายดีอันดับ 1</th>
      </tr>
      ${Object.values(data.terminalStats).map((t, idx) => {
        const topP = t.topProducts && t.topProducts.length > 0 ? `${t.topProducts[0].name} (${t.topProducts[0].qty} ชิ้น)` : "-";
        return `
          <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
            <td class="td-c td-bold">${t.code} ${state.terminal === t.code ? '★' : ''}</td>
            <td class="td-cur">${Number(t.total.toFixed(2))}</td>
            <td class="td-c">${t.pct}%</td>
            <td class="td-r">${t.bills}</td>
            <td class="td-cur">${Number(t.avg.toFixed(2))}</td>
            <td class="td-r">${t.units}</td>
            <td class="td-cur">${Number(t.cashTotal.toFixed(2))}</td>
            <td class="td-r">${t.cashBills}</td>
            <td class="td-cur">${Number(t.qrTotal.toFixed(2))}</td>
            <td class="td-r">${t.qrBills}</td>
            <td class="td-cur">${Number(t.maxBill.toFixed(2))}</td>
            <td class="td-l">${escapeHtml(topP)}</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td class="td-c">รวมทุกจุดขาย</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td class="td-c">100%</td>
        <td class="td-r">${data.totalBills}</td>
        <td class="td-cur">${Number(data.avgTicket.toFixed(2))}</td>
        <td class="td-r">${data.totalUnitsSold}</td>
        <td class="td-cur">${Number(data.cashTotal.toFixed(2))}</td>
        <td class="td-r">${data.cashBills}</td>
        <td class="td-cur">${Number(data.qrTotal.toFixed(2))}</td>
        <td class="td-r">${data.qrBills}</td>
        <td class="td-c">-</td>
        <td class="td-c">-</td>
      </tr>
    </table>
  `;

  const filename = `EA_POS_Performance_Summary_${data.period}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "POS Performance Summary");
  toast(`ส่งออก Excel สรุปประสิทธิภาพจุดขายเรียบร้อย 📗`);
}

function exportDailySummaryExcel(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");
  const avgPerDay = data.dailyStats.length > 0 ? (data.totalRevenue / data.dailyStats.length) : 0;

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="15" class="title-banner">📅 รายงานสรุปยอดขายรายวัน & รายการลดราคา (DAILY SALES & DISCOUNT REPORT)</td>
      </tr>
      <tr>
        <td colspan="15" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; ⏰ ส่งออก: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="15" height="15"></td></tr>

      <!-- Section: KPI Summary -->
      <tr><td colspan="15" class="section-hdr">📊 สรุปตัวชี้วัดภาพรวมรายวัน (DAILY OVERVIEW KPI)</td></tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💰 ยอดขายสุทธิรวม</td>
        <td colspan="4" class="kpi-val" style="color:#059669; font-size:13pt;">฿${money(data.totalRevenue)}</td>
        <td colspan="3" class="kpi-lbl">📅 จำนวนวันที่เปิดขาย</td>
        <td colspan="5" class="kpi-val">${data.dailyStats.length} วัน</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">🧾 จำนวนบิลรวมทั้งสิ้น</td>
        <td colspan="4" class="kpi-val">${data.totalBills} บิล</td>
        <td colspan="3" class="kpi-lbl">📈 ยอดขายเฉลี่ยต่อวัน</td>
        <td colspan="5" class="kpi-val">฿${money(avgPerDay)} / วัน</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">🏷️ ยอดส่วนลดพิเศษเฉพาะบุคคล</td>
        <td colspan="4" class="kpi-val" style="color:#d97706; font-weight:bold;">฿${money(data.totalDiscountAmount)} (${data.totalDiscountUnits} ชิ้น ใน ${data.totalDiscountBills} บิล)</td>
        <td colspan="3" class="kpi-lbl">📦 สัดส่วนสินค้าปกติ / ลดราคา</td>
        <td colspan="5" class="kpi-val">ปกติ ${data.totalUnitsSold - data.totalDiscountUnits} ชิ้น | ลดพิเศษ ${data.totalDiscountUnits} ชิ้น</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💵 ยอดชำระเงินสด (Cash)</td>
        <td colspan="4" class="kpi-val">฿${money(data.cashTotal)} (${data.cashBills} บิล)</td>
        <td colspan="3" class="kpi-lbl">📱 ยอดชำระ QR PromptPay</td>
        <td colspan="5" class="kpi-val">฿${money(data.qrTotal)} (${data.qrBills} บิล)</td>
      </tr>
      <tr><td colspan="15" height="20"></td></tr>

      <!-- Section 1: Daily Sales Table -->
      <tr><td colspan="15" class="section-hdr">📋 ตารางสรุปยอดขายแยกรายวัน (${data.dailyStats.length} วัน • เรียงลำดับดูง่าย)</td></tr>
      <tr height="32">
        <th class="th-col" width="50">ลำดับ</th>
        <th class="th-col" width="110">วันที่ขาย</th>
        <th class="th-col" width="100">วันในสัปดาห์</th>
        <th class="th-col" width="130">ยอดขายสุทธิ (บาท)</th>
        <th class="th-col" width="80">สัดส่วน (%)</th>
        <th class="th-col" width="80">จำนวนบิล</th>
        <th class="th-col" width="110">ยอดเฉลี่ย/บิล</th>
        <th class="th-col" width="80">สินค้าปกติ</th>
        <th class="th-col-amber" width="90">สินค้าลดราคา</th>
        <th class="th-col-amber" width="120">มูลค่าส่วนลด (บาท)</th>
        <th class="th-col" width="110">ยอดเงินสด</th>
        <th class="th-col" width="80">บิลสด</th>
        <th class="th-col" width="110">ยอด QR</th>
        <th class="th-col" width="80">บิล QR</th>
        <th class="th-col" width="200">สินค้าขายดีอันดับ 1 ประจำวัน</th>
      </tr>
      ${data.dailyStats.map((d, idx) => {
        const topP = d.topProducts && d.topProducts.length > 0 ? `${d.topProducts[0].name} (${d.topProducts[0].qty} ชิ้น)` : "-";
        const dayName = getThaiDayOfWeek(d.date);
        return `
          <tr class="${idx % 2 === 1 ? 'zebra' : ''}">
            <td class="td-c td-bold">${idx + 1}</td>
            <td class="td-c td-bold">${d.date}</td>
            <td class="td-c">${dayName}</td>
            <td class="td-cur" style="color:#059669;">${Number(d.total.toFixed(2))}</td>
            <td class="td-c">${d.pct}%</td>
            <td class="td-r">${d.bills}</td>
            <td class="td-cur">${Number(d.avg.toFixed(2))}</td>
            <td class="td-r">${d.regularUnits}</td>
            <td class="td-r td-bold" style="color:${d.discountUnits > 0 ? '#d97706' : '#64748b'};">${d.discountUnits}</td>
            <td class="td-cur" style="color:${d.discountTotal > 0 ? '#d97706' : '#64748b'};">${Number(d.discountTotal.toFixed(2))}</td>
            <td class="td-cur">${Number(d.cashTotal.toFixed(2))}</td>
            <td class="td-r">${d.cashBills}</td>
            <td class="td-cur">${Number(d.qrTotal.toFixed(2))}</td>
            <td class="td-r">${d.qrBills}</td>
            <td class="td-l">${escapeHtml(topP)}</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td class="td-c" colspan="3">รวมทั้งสิ้น (${data.dailyStats.length} วัน)</td>
        <td class="td-cur">${Number(data.totalRevenue.toFixed(2))}</td>
        <td class="td-c">100%</td>
        <td class="td-r">${data.totalBills}</td>
        <td class="td-cur">${Number(data.avgTicket.toFixed(2))}</td>
        <td class="td-r">${data.totalUnitsSold - data.totalDiscountUnits}</td>
        <td class="td-r" style="color:#d97706;">${data.totalDiscountUnits}</td>
        <td class="td-cur" style="color:#d97706;">${Number(data.totalDiscountAmount.toFixed(2))}</td>
        <td class="td-cur">${Number(data.cashTotal.toFixed(2))}</td>
        <td class="td-r">${data.cashBills}</td>
        <td class="td-cur">${Number(data.qrTotal.toFixed(2))}</td>
        <td class="td-r">${data.qrBills}</td>
        <td class="td-c">-</td>
      </tr>
      <tr><td colspan="15" height="25"></td></tr>

      <!-- Section 2: Detailed Individual Discounted Items Log -->
      <tr><td colspan="15" class="section-hdr" style="background-color:#d97706; color:#ffffff;">🏷️ [แยกรายการ] สินค้าที่ลดราคาเฉพาะบุคคล (${data.allDiscountedItems.length} รายการ • รวมส่วนลด ฿${money(data.totalDiscountAmount)})</td></tr>
      <tr height="32">
        <th class="th-col-amber" width="50">ลำดับ</th>
        <th class="th-col-amber" width="100">วันที่ขาย</th>
        <th class="th-col-amber" width="80">เวลา (น.)</th>
        <th class="th-col-amber" width="90">จุดขาย</th>
        <th class="th-col-amber" width="120">เลขที่บิล</th>
        <th class="th-col-amber" width="120">บาร์โค้ด</th>
        <th class="th-col-amber" width="220">ชื่อสินค้า</th>
        <th class="th-col-amber" width="90">ราคาปกติ</th>
        <th class="th-col-amber" width="100">ราคาขายลดพิเศษ</th>
        <th class="th-col-amber" width="90">ส่วนลด/ชิ้น</th>
        <th class="th-col-amber" width="70">จำนวน</th>
        <th class="th-col-amber" width="110">รวมส่วนลด (บาท)</th>
        <th class="th-col-amber" width="110">ยอดสุทธิ (บาท)</th>
        <th class="th-col-amber" width="200">บุคคลที่ลดให้ / หมายเหตุ</th>
        <th class="th-col-amber" width="100">วิธีชำระ</th>
      </tr>
      ${data.allDiscountedItems.length ? data.allDiscountedItems.map((r, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c td-bold">${i + 1}</td>
          <td class="td-c">${r.date}</td>
          <td class="td-c">${r.time}</td>
          <td class="td-c td-bold">${escapeHtml(r.terminal)}</td>
          <td class="td-c td-bold">${escapeHtml(r.saleNo)}</td>
          <td class="td-c">${escapeHtml(r.barcode || '-')}</td>
          <td class="td-l">${escapeHtml(r.productName)}</td>
          <td class="td-cur" style="color:#64748b; text-decoration:line-through;">${Number(r.originalPrice.toFixed(2))}</td>
          <td class="td-cur">${Number(r.unitPrice.toFixed(2))}</td>
          <td class="td-cur" style="color:#d97706;">${Number(r.unitDiscount.toFixed(2))}</td>
          <td class="td-r td-bold">${r.qty}</td>
          <td class="td-cur" style="color:#d97706;">${Number(r.totalDiscount.toFixed(2))}</td>
          <td class="td-cur" style="color:#059669;">${Number(r.lineTotal.toFixed(2))}</td>
          <td class="td-l td-bold" style="color:#b45309;">${escapeHtml(r.discountNote || "ลดราคาเฉพาะบุคคล")}</td>
          <td class="td-c ${r.paymentMethod === 'qr' ? 'badge-qr' : 'badge-cash'}">${r.paymentMethod === 'qr' ? 'QR PromptPay' : 'เงินสด'}</td>
        </tr>
      `).join('') : `
        <tr><td colspan="15" class="td-c" style="padding:16px; color:#64748b;">ไม่มีรายการสินค้าที่ลดราคาเฉพาะบุคคลในรอบนี้</td></tr>
      `}
      ${data.allDiscountedItems.length ? `
        <tr class="total-row" style="background-color: #fef3c7; border-top: 2px solid #d97706;">
          <td colspan="10" class="td-c" style="color:#92400e;">รวมรายการลดราคาเฉพาะบุคคลทั้งสิ้น (${data.allDiscountedItems.length} รายการ)</td>
          <td class="td-r td-bold" style="color:#92400e;">${data.totalDiscountUnits}</td>
          <td class="td-cur" style="color:#b45309;">${Number(data.totalDiscountAmount.toFixed(2))}</td>
          <td class="td-cur" style="color:#059669;">${Number(data.allDiscountedItems.reduce((s, r) => s + r.lineTotal, 0).toFixed(2))}</td>
          <td colspan="2" class="td-c">-</td>
        </tr>
      ` : ''}
    </table>
  `;

  const filename = `EA_Daily_Sales_Summary_${data.period}_${data.termFilter}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "Daily Sales Summary");
  toast(`ส่งออก Excel สรุปรายวัน & รายการลดราคา เรียบร้อย 📗`);
}

function exportDiscountedItemsExcel(isCurrentSearchResult = false){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  let targetRows = data.allDiscountedItems;
  let searchNote = "ทั้งหมด";
  if (isCurrentSearchResult && state.reportDiscountSearch) {
    const q = state.reportDiscountSearch.toLowerCase().trim();
    targetRows = targetRows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.discountNote.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
    searchNote = `ผลการค้นหา: "${state.reportDiscountSearch}"`;
  }

  const sumQty = targetRows.reduce((s, r) => s + r.qty, 0);
  const sumDisc = targetRows.reduce((s, r) => s + r.totalDiscount, 0);
  const sumNet = targetRows.reduce((s, r) => s + r.lineTotal, 0);

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="14" class="title-banner" style="background-color:#78350f; color:#fde68a;">🏷️ รายงานเฉพาะรายการสินค้าที่ลดราคาเฉพาะบุคคล (INDIVIDUAL DISCOUNTED ITEMS LOG)</td>
      </tr>
      <tr>
        <td colspan="14" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; 🔍 ตัวกรอง: <b>${searchNote}</b> &nbsp;|&nbsp; ⏰ ส่งออก: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="14" height="15"></td></tr>

      <tr><td colspan="14" class="section-hdr" style="background-color:#d97706; color:#ffffff;">📊 สรุปยอดส่วนลดพิเศษเฉพาะบุคคล</td></tr>
      <tr>
        <td colspan="3" class="kpi-lbl">🏷️ มูลค่าส่วนลดรวมทั้งสิ้น</td>
        <td colspan="4" class="kpi-val" style="color:#d97706; font-size:13pt;">฿${money(sumDisc)}</td>
        <td colspan="3" class="kpi-lbl">📦 จำนวนชิ้นที่ลดราคา</td>
        <td colspan="4" class="kpi-val">${sumQty} ชิ้น (${targetRows.length} รายการ)</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💰 ยอดเงินที่เก็บจริงสุทธิ</td>
        <td colspan="4" class="kpi-val" style="color:#059669;">฿${money(sumNet)}</td>
        <td colspan="3" class="kpi-lbl">🧾 จำนวนบิลที่มีส่วนลด</td>
        <td colspan="4" class="kpi-val">${new Set(targetRows.map(r => r.saleNo)).size} บิล</td>
      </tr>
      <tr><td colspan="14" height="20"></td></tr>

      <tr><td colspan="14" class="section-hdr" style="background-color:#b45309; color:#ffffff;">📋 รายละเอียดสินค้าที่ลดราคาเฉพาะบุคคล (${targetRows.length} รายการ)</td></tr>
      <tr height="32">
        <th class="th-col-amber" width="50">ลำดับ</th>
        <th class="th-col-amber" width="110">วันที่ขาย</th>
        <th class="th-col-amber" width="80">เวลา (น.)</th>
        <th class="th-col-amber" width="90">จุดขาย</th>
        <th class="th-col-amber" width="130">เลขที่บิล</th>
        <th class="th-col-amber" width="130">บาร์โค้ด</th>
        <th class="th-col-amber" width="240">ชื่อสินค้า</th>
        <th class="th-col-amber" width="90">ราคาปกติ</th>
        <th class="th-col-amber" width="110">ราคาขายลดพิเศษ</th>
        <th class="th-col-amber" width="100">ส่วนลด/ชิ้น</th>
        <th class="th-col-amber" width="80">จำนวน</th>
        <th class="th-col-amber" width="120">รวมส่วนลด (บาท)</th>
        <th class="th-col-amber" width="120">ยอดสุทธิ (บาท)</th>
        <th class="th-col-amber" width="220">บุคคลที่ลดให้ / หมายเหตุ</th>
      </tr>
      ${targetRows.length ? targetRows.map((r, i) => `
        <tr class="${i % 2 === 1 ? 'zebra' : ''}">
          <td class="td-c td-bold">${i + 1}</td>
          <td class="td-c">${r.date}</td>
          <td class="td-c">${r.time}</td>
          <td class="td-c td-bold">${escapeHtml(r.terminal)}</td>
          <td class="td-c td-bold">${escapeHtml(r.saleNo)}</td>
          <td class="td-c">${escapeHtml(r.barcode || '-')}</td>
          <td class="td-l">${escapeHtml(r.productName)}</td>
          <td class="td-cur" style="color:#64748b; text-decoration:line-through;">${Number(r.originalPrice.toFixed(2))}</td>
          <td class="td-cur">${Number(r.unitPrice.toFixed(2))}</td>
          <td class="td-cur" style="color:#d97706;">${Number(r.unitDiscount.toFixed(2))}</td>
          <td class="td-r td-bold">${r.qty}</td>
          <td class="td-cur" style="color:#d97706;">${Number(r.totalDiscount.toFixed(2))}</td>
          <td class="td-cur" style="color:#059669;">${Number(r.lineTotal.toFixed(2))}</td>
          <td class="td-l td-bold" style="color:#b45309;">${escapeHtml(r.discountNote || "ลดราคาเฉพาะบุคคล")}</td>
        </tr>
      `).join('') : `
        <tr><td colspan="14" class="td-c" style="padding:20px; color:#64748b;">ไม่พบรายการสินค้าที่ลดราคา</td></tr>
      `}
      ${targetRows.length ? `
        <tr class="total-row" style="background-color: #fef3c7; border-top: 2px solid #d97706;">
          <td colspan="10" class="td-c" style="color:#92400e;">รวมทั้งสิ้น (${targetRows.length} รายการ)</td>
          <td class="td-r td-bold" style="color:#92400e;">${sumQty}</td>
          <td class="td-cur" style="color:#b45309;">${Number(sumDisc.toFixed(2))}</td>
          <td class="td-cur" style="color:#059669;">${Number(sumNet.toFixed(2))}</td>
          <td class="td-c">-</td>
        </tr>
      ` : ''}
    </table>
  `;

  const filename = `EA_Discounted_Items_${data.period}_${data.termFilter}_${todayISO()}.xls`;
  downloadExcel(filename, bodyHtml, "Discounted Items Log");
  toast(`ส่งออก Excel รายการลดราคาเฉพาะบุคคล (${targetRows.length} รายการ) เรียบร้อย 🏷️`);
}

function exportDiscountedItemsCSV(isCurrentSearchResult = false){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  let targetRows = data.allDiscountedItems;
  let searchNote = "ทั้งหมด";
  if (isCurrentSearchResult && state.reportDiscountSearch) {
    const q = state.reportDiscountSearch.toLowerCase().trim();
    targetRows = targetRows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.discountNote.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
    searchNote = `ผลการค้นหา: "${state.reportDiscountSearch}"`;
  }

  const sumQty = targetRows.reduce((s, r) => s + r.qty, 0);
  const sumDisc = targetRows.reduce((s, r) => s + r.totalDiscount, 0);
  const sumNet = targetRows.reduce((s, r) => s + r.lineTotal, 0);

  const rows = [
    ["=== รายงานเฉพาะรายการสินค้าที่ลดราคาเฉพาะบุคคล (SPECIAL INDIVIDUAL DISCOUNTED ITEMS) ==="],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["ตัวกรองจุดขาย (POS)", termLabel],
    ["สถานะข้อมูล", searchNote],
    ["วันที่และเวลาที่ส่งออก", nowStr],
    [],
    ["--- สรุปภาพรวมรายการลดราคา ---"],
    ["จำนวนรายการที่ลดราคา", `${targetRows.length} รายการ`],
    ["จำนวนสินค้าที่ลดราคา (ชิ้น)", sumQty],
    ["มูลค่าส่วนลดรวมทั้งสิ้น (บาท)", Number(sumDisc.toFixed(2))],
    ["ยอดเงินสุทธิที่เก็บจริง (บาท)", Number(sumNet.toFixed(2))],
    [],
    ["ลำดับ", "วันที่ขาย", "เวลาขาย (น.)", "จุดขาย (POS)", "เลขที่บิล", "รหัสบาร์โค้ด", "ชื่อสินค้า", "ราคาปกติ (บาท)", "ราคาขายลดพิเศษ (บาท)", "ส่วนลดต่อชิ้น (บาท)", "จำนวน (ชิ้น)", "รวมมูลค่าส่วนลด (บาท)", "ยอดขายสุทธิ (บาท)", "บุคคลที่ลดให้ / หมายเหตุ", "ช่องทางชำระเงิน"],
    ...targetRows.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.terminal,
      r.saleNo,
      r.barcode || "-",
      r.productName,
      Number(r.originalPrice.toFixed(2)),
      Number(r.unitPrice.toFixed(2)),
      Number(r.unitDiscount.toFixed(2)),
      r.qty,
      Number(r.totalDiscount.toFixed(2)),
      Number(r.lineTotal.toFixed(2)),
      r.discountNote || "ลดราคาเฉพาะบุคคล",
      r.paymentMethod === "qr" ? "QR PromptPay" : "เงินสด (Cash)"
    ]),
    [],
    ["", "", "", "", "", "รวมทั้งสิ้น", "", "", "", "", sumQty, Number(sumDisc.toFixed(2)), Number(sumNet.toFixed(2)), "", ""]
  ];

  const filename = `EA_Discounted_Items_${data.period}_${data.termFilter}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV รายการลดราคาเฉพาะบุคคล (${targetRows.length} รายการ) เรียบร้อย 🏷️`);
}

function exportDailySummaryCSV(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");
  const avgPerDay = data.dailyStats.length > 0 ? (data.totalRevenue / data.dailyStats.length) : 0;

  const rows = [
    ["=== รายงานสรุปยอดขายรายวัน & รายการลดราคา (DAILY SALES SUMMARY & DISCOUNTS) ==="],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["ตัวกรองจุดขาย (POS)", termLabel],
    ["วันที่และเวลาที่ส่งออก", nowStr],
    [],
    ["--- สรุปภาพรวมรายวัน (DAILY OVERVIEW) ---"],
    ["จำนวนวันที่เปิดขาย", `${data.dailyStats.length} วัน`],
    ["ยอดขายสุทธิรวมทั้งสิ้น (บาท)", Number(data.totalRevenue.toFixed(2))],
    ["จำนวนบิลทั้งหมด", `${data.totalBills} บิล`],
    ["ยอดขายเฉลี่ยต่อวัน (บาท)", Number(avgPerDay.toFixed(2))],
    ["ยอดขายเฉลี่ยต่อบิล (บาท)", Number(data.avgTicket.toFixed(2))],
    ["จำนวนสินค้าที่ขายออกทั้งหมด (ชิ้น)", data.totalUnitsSold],
    ["สินค้าขายราคาปกติ (ชิ้น)", data.totalUnitsSold - data.totalDiscountUnits],
    ["สินค้าที่ลดราคาเฉพาะบุคคล (ชิ้น)", data.totalDiscountUnits],
    ["มูลค่าส่วนลดเฉพาะบุคคลรวม (บาท)", Number(data.totalDiscountAmount.toFixed(2))],
    ["ยอดชำระเงินสด (บาท)", Number(data.cashTotal.toFixed(2)), `(${data.cashBills} บิล)`],
    ["ยอดชำระ QR PromptPay (บาท)", Number(data.qrTotal.toFixed(2)), `(${data.qrBills} บิล)`],
    [],
    ["--- [1] รายการสรุปยอดขายแยกรายวัน (เรียงลำดับวันที่) ---"],
    ["ลำดับ", "วันที่ขาย", "วันในสัปดาห์", "ยอดขายสุทธิ (บาท)", "สัดส่วน (%)", "จำนวนบิล (บิล)", "ยอดเฉลี่ย/บิล (บาท)", "สินค้าปกติ (ชิ้น)", "สินค้าลดราคา (ชิ้น)", "ยอดส่วนลด (บาท)", "ยอดเงินสด (บาท)", "บิลเงินสด", "ยอด QR (บาท)", "บิล QR", "สินค้าขายดีประจำวัน"],
    ...data.dailyStats.map((d, i) => {
      const topP = d.topProducts && d.topProducts.length > 0 ? `${d.topProducts[0].name} (${d.topProducts[0].qty} ชิ้น)` : "-";
      return [
        i + 1,
        d.date,
        getThaiDayOfWeek(d.date),
        Number(d.total.toFixed(2)),
        `${d.pct}%`,
        d.bills,
        Number(d.avg.toFixed(2)),
        d.regularUnits,
        d.discountUnits,
        Number(d.discountTotal.toFixed(2)),
        Number(d.cashTotal.toFixed(2)),
        d.cashBills,
        Number(d.qrTotal.toFixed(2)),
        d.qrBills,
        topP
      ];
    }),
    [],
    ["", "รวมทั้งสิ้น", `${data.dailyStats.length} วัน`, Number(data.totalRevenue.toFixed(2)), "100%", data.totalBills, Number(data.avgTicket.toFixed(2)), data.totalUnitsSold - data.totalDiscountUnits, data.totalDiscountUnits, Number(data.totalDiscountAmount.toFixed(2)), Number(data.cashTotal.toFixed(2)), data.cashBills, Number(data.qrTotal.toFixed(2)), data.qrBills, ""],
    [],
    ["--- [2] แยกรายการสินค้าที่ลดราคาเฉพาะบุคคล (SPECIAL INDIVIDUAL DISCOUNTED ITEMS LOG) ---"],
    ["ลำดับ", "วันที่ขาย", "เวลา (น.)", "จุดขาย (POS)", "เลขที่บิล", "รหัสบาร์โค้ด", "ชื่อสินค้า", "ราคาปกติ (บาท)", "ราคาขายลดพิเศษ (บาท)", "ส่วนลด/ชิ้น (บาท)", "จำนวน (ชิ้น)", "รวมส่วนลด (บาท)", "ยอดสุทธิ (บาท)", "บุคคลที่ลดให้ / หมายเหตุ", "วิธีชำระ"],
    ...data.allDiscountedItems.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.terminal,
      r.saleNo,
      r.barcode || "-",
      r.productName,
      Number(r.originalPrice.toFixed(2)),
      Number(r.unitPrice.toFixed(2)),
      Number(r.unitDiscount.toFixed(2)),
      r.qty,
      Number(r.totalDiscount.toFixed(2)),
      Number(r.lineTotal.toFixed(2)),
      r.discountNote || "ลดราคาเฉพาะบุคคล",
      r.paymentMethod === "qr" ? "QR PromptPay" : "เงินสด"
    ]),
    [],
    ["", "", "", "", "", "รวมรายการลดราคาทั้งสิ้น", "", "", "", "", data.totalDiscountUnits, Number(data.totalDiscountAmount.toFixed(2)), Number(data.allDiscountedItems.reduce((s, r) => s + r.lineTotal, 0).toFixed(2)), "", ""]
  ];

  const filename = `EA_Daily_Sales_Summary_${data.period}_${data.termFilter}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV สรุปรายวัน & รายการลดราคา เรียบร้อย 📄`);
}

function exportSalesCSV(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  const rows = [
    ["=== รายงานสรุปรายการบิลการขาย (SALES BILLS SUMMARY) ==="],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["ตัวกรองจุดขาย (POS)", termLabel],
    ["วันที่และเวลาที่ส่งออก", nowStr],
    [],
    ["--- สรุปภาพรวมยอดขายในรอบนี้ ---"],
    ["จำนวนบิลทั้งหมด", `${data.totalBills} บิล`],
    ["ยอดขายรวมทั้งสิ้น (บาท)", Number(data.totalRevenue.toFixed(2))],
    ["ยอดเฉลี่ยต่อบิล (บาท)", Number(data.avgTicket.toFixed(2))],
    ["ยอดชำระเงินสด (บาท)", Number(data.cashTotal.toFixed(2)), `(${data.cashBills} บิล)`],
    ["ยอดชำระ QR PromptPay (บาท)", Number(data.qrTotal.toFixed(2)), `(${data.qrBills} บิล)`],
    [],
    ["ลำดับ", "วันที่ขาย", "เวลาขาย (น.)", "จุดขาย (POS)", "เลขที่บิล", "ยอดเงินรวม (บาท)", "ช่องทางชำระเงิน", "จำนวนเงินที่รับ (บาท)", "เงินทอน (บาท)"],
    ...data.filteredSales.map((s, i) => [
      i + 1,
      s.sale_date || "-",
      String(s.sale_time || "").slice(0, 5) || "-",
      s.terminal_code || "POS-01",
      s.sale_no || "-",
      Number((Number(s.total_amount) || 0).toFixed(2)),
      isQrPayment(s.payment_method) ? "QR PromptPay" : "เงินสด (Cash)",
      s.received_amount !== undefined && s.received_amount !== null ? Number(Number(s.received_amount).toFixed(2)) : "-",
      s.change_amount !== undefined && s.change_amount !== null ? Number(Number(s.change_amount).toFixed(2)) : "-"
    ]),
    [],
    ["", "", "", "รวมทั้งสิ้น", `${data.totalBills} บิล`, Number(data.totalRevenue.toFixed(2)), `สด: ฿${money(data.cashTotal)} / QR: ฿${money(data.qrTotal)}`, "", ""]
  ];

  const filename = `EA_Sales_Bills_${data.period}_${data.termFilter}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV สรุปบิล (${data.filteredSales.length} บิล) เรียบร้อย`);
}

function exportRawItemsCSV(isCurrentSearchResult = false){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  let targetRows = data.rawRows;
  let searchNote = "ทั้งหมด";
  if (isCurrentSearchResult && state.reportRawSearch) {
    const q = state.reportRawSearch.toLowerCase().trim();
    targetRows = targetRows.filter(r => 
      r.saleNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.terminal.toLowerCase().includes(q) ||
      r.date.includes(q)
    );
    searchNote = `ผลการค้นหา: "${state.reportRawSearch}"`;
  }

  const sumQty = targetRows.reduce((sum, r) => sum + r.qty, 0);
  const sumRevenue = targetRows.reduce((sum, r) => sum + r.lineTotal, 0);

  const rows = [
    ["=== รายงานข้อมูลดิบการขายสินค้ารายชิ้น (ITEMIZED RAW SALES TRANSACTIONS) ==="],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["ตัวกรองจุดขาย (POS)", termLabel],
    ["สถานะข้อมูลดิบ", searchNote],
    ["วันที่และเวลาที่ส่งออก", nowStr],
    [],
    ["--- สรุปภาพรวมข้อมูลดิบ ---"],
    ["จำนวนรายการขาย (แถว)", `${targetRows.length} แถว`],
    ["จำนวนชิ้นสินค้ารวม (ชิ้น)", sumQty],
    ["ยอดรวมมูลค่าขาย (บาท)", Number(sumRevenue.toFixed(2))],
    [],
    ["ลำดับ", "วันที่ขาย", "เวลาขาย (น.)", "จุดขาย (POS)", "เลขที่บิล", "รหัสบาร์โค้ด", "ชื่อสินค้า", "จำนวน (ชิ้น)", "ราคาต่อหน่วย (บาท)", "ยอดรวมบรรทัด (บาท)", "ช่องทางชำระเงิน"],
    ...targetRows.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.terminal,
      r.saleNo,
      r.barcode || "-",
      r.productName,
      r.qty,
      Number(r.unitPrice.toFixed(2)),
      Number(r.lineTotal.toFixed(2)),
      r.paymentMethod === "qr" ? "QR PromptPay" : "เงินสด (Cash)"
    ]),
    [],
    ["", "", "", "", "รวมทั้งสิ้น", "", `${targetRows.length} แถว`, sumQty, "", Number(sumRevenue.toFixed(2)), ""]
  ];

  const filename = `EA_Raw_Sales_Items_${data.period}_${data.termFilter}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV ข้อมูลดิบ (${targetRows.length} รายการ) เรียบร้อย`);
}

function exportPosSummaryCSV(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const nowStr = new Date().toLocaleString("th-TH");

  const rows = [
    ["=== รายงานสรุปผลงานยอดขายแยกตามจุดขาย (POS PERFORMANCE SUMMARY) ==="],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["วันที่และเวลาที่ส่งออก", nowStr],
    ["ยอดขายรวมทุกจุดขาย (บาท)", Number(data.totalRevenue.toFixed(2))],
    ["จำนวนบิลรวมทุกจุดขาย (บิล)", data.totalBills],
    ["จำนวนสินค้าขายรวม (ชิ้น)", data.totalUnitsSold],
    [],
    ["จุดขาย (POS)", "ยอดขายรวม (บาท)", "สัดส่วนยอด (%)", "จำนวนบิล (บิล)", "ยอดเฉลี่ย/บิล (บาท)", "จำนวนสินค้าที่ขาย (ชิ้น)", "ยอดเงินสด (บาท)", "บิลเงินสด", "ยอด QR (บาท)", "บิล QR", "บิลยอดสูงสุด (บาท)", "สินค้าขายดีอันดับ 1"],
    ...Object.values(data.terminalStats).map(t => {
      const topP = t.topProducts && t.topProducts.length > 0 ? `${t.topProducts[0].name} (${t.topProducts[0].qty} ชิ้น)` : "-";
      return [
        t.code + (state.terminal === t.code ? " (เครื่องนี้)" : ""),
        Number(t.total.toFixed(2)),
        `${t.pct}%`,
        t.bills,
        Number(t.avg.toFixed(2)),
        t.units,
        Number(t.cashTotal.toFixed(2)),
        t.cashBills,
        Number(t.qrTotal.toFixed(2)),
        t.qrBills,
        Number(t.maxBill.toFixed(2)),
        topP
      ];
    }),
    [],
    ["รวมทุกจุดขาย", Number(data.totalRevenue.toFixed(2)), "100%", data.totalBills, Number(data.avgTicket.toFixed(2)), data.totalUnitsSold, Number(data.cashTotal.toFixed(2)), data.cashBills, Number(data.qrTotal.toFixed(2)), data.qrBills, "", ""]
  ];

  const filename = `EA_POS_Performance_Summary_${data.period}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV สรุปประสิทธิภาพจุดขายเรียบร้อย`);
}

function exportMasterReportCSV(){
  const data = getReportAnalytics();
  const shopName = state.settings.shopName || "EA Fair Sale";
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย (All POS)" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  const rows = [
    ["================================================================================"],
    ["                   รายงานสรุปภาพรวมและข้อมูลดิบแบบสมบูรณ์ (MASTER REPORT)           "],
    ["================================================================================"],
    ["ชื่อร้าน / กิจการ", shopName],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["ตัวกรองจุดขาย (POS)", termLabel],
    ["วันที่สร้างรายงาน", nowStr],
    [],
    ["[1] สรุปตัวชี้วัดหลัก (EXECUTIVE SUMMARY)"],
    ["ยอดขายรวมสุทธิ (บาท)", Number(data.totalRevenue.toFixed(2))],
    ["จำนวนบิลทั้งหมด (บิล)", data.totalBills],
    ["ยอดขายเฉลี่ยต่อบิล (บาท)", Number(data.avgTicket.toFixed(2))],
    ["จำนวนสินค้าที่ขายออกทั้งหมด (ชิ้น)", data.totalUnitsSold],
    ["ยอดชำระเงินสด (บาท)", Number(data.cashTotal.toFixed(2)), `คิดเป็น ${data.totalRevenue > 0 ? ((data.cashTotal/data.totalRevenue)*100).toFixed(1) : 0}% (${data.cashBills} บิล)`],
    ["ยอดชำระ QR PromptPay (บาท)", Number(data.qrTotal.toFixed(2)), `คิดเป็น ${data.totalRevenue > 0 ? ((data.qrTotal/data.totalRevenue)*100).toFixed(1) : 0}% (${data.qrBills} บิล)`],
    [],
    ["[2] สรุปยอดขายรายวัน (DAILY SALES BREAKDOWN)"],
    ["ลำดับ", "วันที่ขาย", "วันในสัปดาห์", "ยอดขายรวม (บาท)", "สัดส่วน (%)", "จำนวนบิล", "เฉลี่ย/บิล (บาท)", "สินค้า (ชิ้น)", "ยอดเงินสด (บาท)", "ยอด QR (บาท)", "สินค้าขายดีประจำวัน"],
    ...data.dailyStats.map((d, i) => [
      i + 1,
      d.date,
      getThaiDayOfWeek(d.date),
      Number(d.total.toFixed(2)),
      `${d.pct}%`,
      d.bills,
      Number(d.avg.toFixed(2)),
      d.units,
      Number(d.cashTotal.toFixed(2)),
      Number(d.qrTotal.toFixed(2)),
      d.topProducts && d.topProducts[0] ? `${d.topProducts[0].name} (${d.topProducts[0].qty} ชิ้น)` : "-"
    ]),
    [],
    ["[3] สรุปเปรียบเทียบแยกรายจุดขาย (POS BREAKDOWN)"],
    ["จุดขาย (POS)", "ยอดขายรวม (บาท)", "สัดส่วน (%)", "จำนวนบิล", "ยอดเฉลี่ย/บิล (บาท)", "สินค้าที่ขาย (ชิ้น)", "ยอดเงินสด (บาท)", "ยอด QR (บาท)", "สินค้าขายดีอันดับ 1"],
    ...Object.values(data.terminalStats).map(t => [
      t.code,
      Number(t.total.toFixed(2)),
      `${t.pct}%`,
      t.bills,
      Number(t.avg.toFixed(2)),
      t.units,
      Number(t.cashTotal.toFixed(2)),
      Number(t.qrTotal.toFixed(2)),
      t.topProducts && t.topProducts[0] ? `${t.topProducts[0].name} (${t.topProducts[0].qty} ชิ้น)` : "-"
    ]),
    [],
    ["[4] 5 อันดับสินค้าขายดีที่สุด (TOP 5 SELLING PRODUCTS)"],
    ["อันดับ", "ชื่อสินค้า", "จำนวนที่ขายได้ (ชิ้น)", "ยอดขายรวม (บาท)"],
    ...data.topProductsGlobal.map((p, i) => [
      i + 1,
      p.name,
      p.qty,
      Number(p.revenue.toFixed(2))
    ]),
    [],
    ["[5] ข้อมูลดิบรายการขายสินค้าย่อยทั้งหมด (FULL ITEMIZED TRANSACTIONS LOG)"],
    ["ลำดับ", "วันที่", "เวลา (น.)", "จุดขาย (POS)", "เลขที่บิล", "รหัสบาร์โค้ด", "ชื่อสินค้า", "จำนวน (ชิ้น)", "ราคาต่อหน่วย (บาท)", "ยอดรวม (บาท)", "วิธีชำระเงิน"],
    ...data.rawRows.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.terminal,
      r.saleNo,
      r.barcode || "-",
      r.productName,
      r.qty,
      Number(r.unitPrice.toFixed(2)),
      Number(r.lineTotal.toFixed(2)),
      r.paymentMethod === "qr" ? "QR PromptPay" : "เงินสด"
    ]),
    [],
    ["", "", "", "", "รวมข้อมูลดิบทั้งสิ้น", "", `${data.rawRows.length} รายการ`, data.totalUnitsSold, "", Number(data.totalRevenue.toFixed(2)), ""],
    [],
    ["[6] แยกรายการสินค้าที่ลดราคาเฉพาะบุคคล (SPECIAL INDIVIDUAL DISCOUNTED ITEMS)"],
    ["ลำดับ", "วันที่", "เวลา (น.)", "จุดขาย (POS)", "เลขที่บิล", "รหัสบาร์โค้ด", "ชื่อสินค้า", "ราคาปกติ (บาท)", "ราคาขายลดพิเศษ (บาท)", "ส่วนลดต่อชิ้น (บาท)", "จำนวน (ชิ้น)", "รวมส่วนลด (บาท)", "ยอดสุทธิ (บาท)", "บุคคลที่ลดให้ / หมายเหตุ", "วิธีชำระ"],
    ...data.allDiscountedItems.map((r, i) => [
      i + 1,
      r.date,
      r.time,
      r.terminal,
      r.saleNo,
      r.barcode || "-",
      r.productName,
      Number(r.originalPrice.toFixed(2)),
      Number(r.unitPrice.toFixed(2)),
      Number(r.unitDiscount.toFixed(2)),
      r.qty,
      Number(r.totalDiscount.toFixed(2)),
      Number(r.lineTotal.toFixed(2)),
      r.discountNote || "ลดราคาเฉพาะบุคคล",
      r.paymentMethod === "qr" ? "QR PromptPay" : "เงินสด"
    ]),
    [],
    ["", "", "", "", "", "รวมรายการลดราคาทั้งสิ้น", "", "", "", "", data.totalDiscountUnits, Number(data.totalDiscountAmount.toFixed(2)), Number(data.allDiscountedItems.reduce((s, r) => s + r.lineTotal, 0).toFixed(2)), "", ""]
  ];

  const filename = `EA_Master_Sales_Report_${data.period}_${data.termFilter}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV รายงานชุดสมบูรณ์ (Master Report) เรียบร้อย`);
}

function exportAccountingJournalCSV(){
  const data = getReportAnalytics();
  const shopName = state.settings?.shopName || "EA Fair Sale";
  const taxId = state.settings?.shopTaxId || "-";
  const vatRate = Number(state.settings?.vatRate || 7);
  const isVat = Boolean(state.settings?.enableVat);
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const nowStr = new Date().toLocaleString("th-TH");

  const rows = [
    ["================================================================================"],
    ["              รายงานสมุดรายวันขายส่งบัญชีและภาษี (ACCOUNTING SALES JOURNAL)       "],
    ["================================================================================"],
    ["ชื่อผู้ประกอบการ / ร้านค้า", shopName],
    ["เลขประจำตัวผู้เสียภาษี (Tax ID)", taxId],
    ["ช่วงเวลาข้อมูล", periodLabel],
    ["การคำนวณภาษี", isVat ? `VAT ${vatRate}% Included` : "Non-VAT / ยกเว้นภาษี"],
    ["วันที่ส่งออกเอกสาร", nowStr],
    [],
    [
      "ลำดับ",
      "วันที่ขาย",
      "เวลา (น.)",
      "เลขที่บิล / ใบเสร็จ",
      "เครื่องจุดขาย",
      "จำนวนรายการ (ชิ้น)",
      "ยอดรวมก่อนลด (บาท)",
      "ส่วนลดรวม (บาท)",
      "ยอดขายก่อน VAT (บาท)",
      "ภาษีมูลค่าเพิ่ม VAT (บาท)",
      "ยอดสุทธิรับเงิน (บาท)",
      "วิธีชำระเงิน",
      "รับเงินมา (บาท)",
      "เงินทอน (บาท)",
      "สถานะ"
    ]
  ];

  let totalSub = 0;
  let totalDisc = 0;
  let totalExclVat = 0;
  let totalVat = 0;
  let totalGrand = 0;

  data.filteredSales.forEach((s, idx) => {
    const grand = Number(s.total_amount || 0);
    const sub = Number(s.subtotal || s.total_amount || 0);
    const disc = Number(s.total_discount || 0);
    
    let vat = 0;
    let exclVat = grand;
    if (isVat) {
      vat = grand - (grand / (1 + vatRate / 100));
      exclVat = grand - vat;
    }

    totalSub += sub;
    totalDisc += disc;
    totalExclVat += exclVat;
    totalVat += vat;
    totalGrand += grand;

    const dt = s.created_at ? new Date(s.created_at) : (s.sale_date ? new Date(s.sale_date) : new Date());
    const dateStr = s.sale_date || dt.toISOString().split("T")[0];
    const timeStr = dt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

    rows.push([
      idx + 1,
      dateStr,
      timeStr,
      s.sale_no || s.id,
      s.terminal || "POS-01",
      s.total_units || 1,
      Number(sub.toFixed(2)),
      Number(disc.toFixed(2)),
      Number(exclVat.toFixed(2)),
      Number(vat.toFixed(2)),
      Number(grand.toFixed(2)),
      isQrPayment(s.payment_method) ? "QR PromptPay" : "เงินสด (Cash)",
      Number((s.received_amount || 0).toFixed(2)),
      Number((s.change_amount || 0).toFixed(2)),
      s.is_cancelled ? "CANCELLED (ยกเลิก)" : "COMPLETED (สมบูรณ์)"
    ]);
  });

  rows.push([]);
  rows.push([
    "ยอดรวมทั้งสิ้น",
    "",
    "",
    `${data.filteredSales.length} บิล`,
    "",
    "",
    Number(totalSub.toFixed(2)),
    Number(totalDisc.toFixed(2)),
    Number(totalExclVat.toFixed(2)),
    Number(totalVat.toFixed(2)),
    Number(totalGrand.toFixed(2)),
    "",
    "",
    "",
    ""
  ]);

  const filename = `Accounting_Sales_Journal_${data.period}_${todayISO()}.csv`;
  downloadCSV(filename, rows);
  toast(`ส่งออก CSV รายงานสมุดรายวันขายส่งบัญชีเรียบร้อย 📄`);
}

function exportAccountingJournalExcel(){
  const data = getReportAnalytics();
  const shopName = state.settings?.shopName || "EA Fair Sale";
  const taxId = state.settings?.shopTaxId || "-";
  const vatRate = Number(state.settings?.vatRate || 7);
  const isVat = Boolean(state.settings?.enableVat);
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย" : data.termFilter;
  const nowStr = new Date().toLocaleString("th-TH");

  let totalSub = 0;
  let totalDisc = 0;
  let totalExclVat = 0;
  let totalVat = 0;
  let totalGrand = 0;

  const rowsHtml = data.filteredSales.map((s, idx) => {
    const grand = Number(s.total_amount || 0);
    const sub = Number(s.subtotal || s.total_amount || 0);
    const disc = Number(s.total_discount || 0);
    
    let vat = 0;
    let exclVat = grand;
    if (isVat) {
      vat = grand - (grand / (1 + vatRate / 100));
      exclVat = grand - vat;
    }

    totalSub += sub;
    totalDisc += disc;
    totalExclVat += exclVat;
    totalVat += vat;
    totalGrand += grand;

    const dt = s.created_at ? new Date(s.created_at) : (s.sale_date ? new Date(s.sale_date) : new Date());
    const dateStr = s.sale_date || dt.toISOString().split("T")[0];
    const timeStr = dt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${dateStr}</td>
        <td>${timeStr}</td>
        <td style="font-family:monospace; font-weight:bold;">${escapeHtml(s.sale_no || s.id)}</td>
        <td>${escapeHtml(s.terminal || "POS-01")}</td>
        <td class="num">${s.total_units || 1}</td>
        <td class="money">฿${money(sub)}</td>
        <td class="money" style="color:#d97706;">-฿${money(disc)}</td>
        <td class="money">฿${money(exclVat)}</td>
        <td class="money" style="color:#2563eb;">฿${money(vat)}</td>
        <td class="money" style="font-weight:bold; color:#059669;">฿${money(grand)}</td>
        <td>${isQrPayment(s.payment_method) ? "QR PromptPay" : "เงินสด"}</td>
        <td class="money">฿${money(s.received_amount || 0)}</td>
        <td class="money">฿${money(s.change_amount || 0)}</td>
        <td>${s.is_cancelled ? '<span style="color:#dc2626; font-weight:bold;">ยกเลิก</span>' : '<span style="color:#059669; font-weight:bold;">ปกติ</span>'}</td>
      </tr>
    `;
  }).join("");

  const bodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td colspan="15" class="title-banner">📑 รายงานสมุดรายวันขายส่งบัญชีและภาษี (ACCOUNTING SALES JOURNAL)</td>
      </tr>
      <tr>
        <td colspan="15" class="subtitle">🏪 ร้าน: <b>${escapeHtml(shopName)}</b> &nbsp;|&nbsp; 🆔 Tax ID: <b>${escapeHtml(taxId)}</b> &nbsp;|&nbsp; 📅 ช่วงเวลา: <b>${escapeHtml(periodLabel)}</b> &nbsp;|&nbsp; 🏢 จุดขาย: <b>${escapeHtml(termLabel)}</b> &nbsp;|&nbsp; ⏰ ออกเอกสาร: <b>${nowStr}</b></td>
      </tr>
      <tr><td colspan="15" height="15"></td></tr>

      <tr><td colspan="15" class="section-hdr">📊 สรุปตัวชี้วัดภาษีและยอดขายสุทธิ</td></tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💰 ยอดขายสุทธิรวม (Grand Total)</td>
        <td colspan="4" class="kpi-val" style="color:#059669; font-size:13pt;">฿${money(totalGrand)}</td>
        <td colspan="3" class="kpi-lbl">🧾 จำนวนบิลขายทั้งหมด</td>
        <td colspan="5" class="kpi-val">${data.filteredSales.length} บิล</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-lbl">💵 มูลค่าก่อน VAT (${isVat ? 100 : 100}%)</td>
        <td colspan="4" class="kpi-val">฿${money(totalExclVat)}</td>
        <td colspan="3" class="kpi-lbl">🏛️ ภาษีมูลค่าเพิ่ม VAT (${isVat ? vatRate : 0}%)</td>
        <td colspan="5" class="kpi-val" style="color:#2563eb;">฿${money(totalVat)}</td>
      </tr>
      <tr><td colspan="15" height="15"></td></tr>

      <tr>
        <th class="th-hdr">ลำดับ</th>
        <th class="th-hdr">วันที่</th>
        <th class="th-hdr">เวลา</th>
        <th class="th-hdr">เลขที่ใบเสร็จ</th>
        <th class="th-hdr">จุดขาย</th>
        <th class="th-hdr">จำนวน</th>
        <th class="th-hdr">ยอดก่อนลด</th>
        <th class="th-hdr">ส่วนลด</th>
        <th class="th-hdr">มูลค่าก่อน VAT</th>
        <th class="th-hdr">ภาษี VAT</th>
        <th class="th-hdr">ยอดสุทธิ</th>
        <th class="th-hdr">ชำระโดย</th>
        <th class="th-hdr">รับเงินมา</th>
        <th class="th-hdr">เงินทอน</th>
        <th class="th-hdr">สถานะ</th>
      </tr>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="5">รวมทั้งสิ้น (${data.filteredSales.length} บิล)</td>
        <td class="num">${data.filteredSales.reduce((s, x) => s + (x.total_units || 1), 0)}</td>
        <td class="money">฿${money(totalSub)}</td>
        <td class="money" style="color:#d97706;">-฿${money(totalDisc)}</td>
        <td class="money">฿${money(totalExclVat)}</td>
        <td class="money" style="color:#2563eb;">฿${money(totalVat)}</td>
        <td class="money" style="font-weight:bold; color:#059669;">฿${money(totalGrand)}</td>
        <td colspan="4"></td>
      </tr>
    </table>
  `;

  const filename = `Accounting_Sales_Journal_${data.period}_${todayISO()}.xls`;
  downloadExcel(filename, "Accounting Journal", bodyHtml);
  toast(`ส่งออก Excel สมุดรายวันขายส่งบัญชีเรียบร้อย 📗`);
}

function openExportCenterModal(){
  const data = getReportAnalytics();
  const periodLabel = data.period === "today" ? `วันนี้ (${todayISO()})` : data.period === "7days" ? "7 วันล่าสุด" : "ยอดรวมทั้งหมด";
  const termLabel = data.termFilter === "ALL" ? "ทุกจุดขาย" : data.termFilter;

  el("modalTitle").textContent = "📊 ศูนย์รวมการส่งออกรายงาน (Export Center)";
  el("modalBody").innerHTML = `
    <div style="margin-bottom: 12px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      ดาวน์โหลดข้อมูลรอบ <b>${escapeHtml(periodLabel)}</b> (${escapeHtml(termLabel)}) เลือกไฟล์ <b>Excel (.xls)</b> เพื่อเปิดดูแบบจัดฟอร์แมตมีสีสันและเส้นตาราง, <b>CSV (.csv)</b> หรือ <b>สั่งพิมพ์รายงานขนาด A4 (Print A4)</b>
    </div>

    <div class="export-center-grid">
      <!-- Card 0: Accounting & Tax Journal -->
      <div class="export-card-item featured" style="border-color: #34d399; background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.6) 100%); grid-column: 1 / -1;">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(52, 211, 153, 0.25); color:#34d399; font-size:22px;">📑</div>
          <div class="export-card-info">
            <h4 style="color:#34d399;">รายงานสมุดรายวันขายส่งบัญชี & ภาษี (Accounting & Tax Sales Journal)</h4>
            <p>รายงานมาตรฐานสำหรับฝ่ายบัญชีและยื่นภาษี: เลขที่บิล, วันที่เวลา, ยอดขายสุทธิ, ส่วนลด, มูลค่าก่อน VAT, ภาษีมูลค่าเพิ่ม VAT 7%, ช่องทางชำระเงิน และสถานะบิล</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportAccountingJournalExcel(); closeProductModal();" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff; border-color:#34d399; font-weight:bold;">
            📗 Excel ส่งบัญชี (.xls)
          </button>
          <button class="btn-file-csv" onclick="exportAccountingJournalCSV(); closeProductModal();" style="border-color:#34d399; color:#6ee7b7; font-weight:bold;">
            📄 CSV ส่งบัญชี (.csv)
          </button>
        </div>
      </div>

      <!-- Card 0.5: A4 Printable Daily Report -->
      <div class="export-card-item featured" style="border-color: #38bdf8; background: linear-gradient(135deg, rgba(2, 132, 199, 0.18) 0%, rgba(15, 23, 42, 0.6) 100%);">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(56, 189, 248, 0.25); color:#38bdf8; font-size:20px;">🖨️</div>
          <div class="export-card-info">
            <h4>พิมพ์รายงานสรุปยอดขายรายวันขนาด A4 (A4 Print Report)</h4>
            <p>รายงานรูปแบบ A4 จัดหน้างามตา: แยกรายการสินค้า, ราคา, จำนวน, หน่วย, ส่วนลดแต่ละบิล และสรุปรวมเงินสุทธิประจำวัน</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="closeProductModal(); openA4DailyReportModal();" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; border-color:#38bdf8; font-weight:bold;">
            🖨️ ปริ้น A4 สรุปรายวัน
          </button>
        </div>
      </div>

      <!-- Card 1: Master Report -->
      <div class="export-card-item featured">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(52, 211, 153, 0.15); color:#34d399;">📑</div>
          <div class="export-card-info">
            <h4>รายงานชุดสมบูรณ์ (Master Report)</h4>
            <p>รวม 6 ส่วน: KPI รวม, สรุปรายวัน, เปรียบเทียบ POS, สินค้าขายดี, ข้อมูลดิบ และแยกรายการลดราคา</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportMasterReportExcel(); closeProductModal();">
            📗 Excel สวยงาม
          </button>
          <button class="btn-file-csv" onclick="exportMasterReportCSV(); closeProductModal();">
            📄 CSV
          </button>
        </div>
      </div>

      <!-- Card 2: Daily Sales Summary -->
      <div class="export-card-item" style="border-color: #38bdf8;">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(56, 189, 248, 0.18); color:#38bdf8;">📅</div>
          <div class="export-card-info">
            <h4>สรุปยอดขายรายวัน & ลดราคา (${data.dailyStats.length} วัน)</h4>
            <p>เรียงลำดับรายวันดูง่าย: ยอดรวม, บิล, เงินสด/QR, เฉลี่ยต่อบิล และตารางแยกสินค้าลดราคา</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportDailySummaryExcel(); closeProductModal();">
            📗 Excel
          </button>
          <button class="btn-file-csv" onclick="exportDailySummaryCSV(); closeProductModal();">
            📄 CSV
          </button>
          <button class="btn-file-excel" onclick="closeProductModal(); openA4DailyReportModal();" style="background: #0284c7; color:#ffffff; border-color:#38bdf8;">
            🖨️ ปริ้น A4
          </button>
        </div>
      </div>

      <!-- Card 3: Dedicated Discounted Items Log -->
      <div class="export-card-item" style="border-color: #f59e0b;">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(245, 158, 11, 0.18); color:#f59e0b;">🏷️</div>
          <div class="export-card-info">
            <h4>เฉพาะสินค้าลดราคาบุคคล (${data.allDiscountedItems.length} รายการ)</h4>
            <p>แยกเฉพาะสินค้าที่ลดราคาให้บุคคล/ลูกค้าพิเศษ พร้อมราคาเดิม, ราคาลด, มูลค่าส่วนลด และเหตุผล</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportDiscountedItemsExcel(false); closeProductModal();" style="border-color:#d97706; color:#fde68a;">
            📗 Excel สวยงาม
          </button>
          <button class="btn-file-csv" onclick="exportDiscountedItemsCSV(false); closeProductModal();" style="border-color:#d97706; color:#fde68a;">
            📄 CSV
          </button>
        </div>
      </div>

      <!-- Card 4: Itemized Raw Data -->
      <div class="export-card-item">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(2, 132, 199, 0.15); color:#38bdf8;">📦</div>
          <div class="export-card-info">
            <h4>ข้อมูลดิบรายสินค้า (${data.rawRows.length} รายการ)</h4>
            <p>รายการสินค้าทุกชิ้นในบิล พร้อมวันที่, เวลา, บาร์โค้ด, ราคา, ยอดรวม และวิธีชำระ</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportRawItemsExcel(false); closeProductModal();">
            📗 Excel สวยงาม
          </button>
          <button class="btn-file-csv" onclick="exportRawItemsCSV(false); closeProductModal();">
            📄 CSV
          </button>
        </div>
      </div>

      <!-- Card 5: Bills Summary -->
      <div class="export-card-item">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(251, 191, 36, 0.15); color:#fbbf24;">🧾</div>
          <div class="export-card-info">
            <h4>สรุปรายการบิลการขาย (${data.totalBills} บิล)</h4>
            <p>สรุปยอดรวมแต่ละบิล, จุดขาย, วิธีชำระเงินสด/QR, จำนวนเงินที่รับ และเงินทอน</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportSalesExcel(); closeProductModal();">
            📗 Excel สวยงาม
          </button>
          <button class="btn-file-csv" onclick="exportSalesCSV(); closeProductModal();">
            📄 CSV
          </button>
        </div>
      </div>

      <!-- Card 6: POS Performance -->
      <div class="export-card-item">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(129, 140, 248, 0.15); color:#818cf8;">🏢</div>
          <div class="export-card-info">
            <h4>สรุปประสิทธิภาพแยกตามจุดขาย (POS)</h4>
            <p>เปรียบเทียบยอดขาย, สัดส่วน %, ยอดเฉลี่ย, สด/QR และสินค้าขายดีประจำจุด</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="exportPosSummaryExcel(); closeProductModal();">
            📗 Excel สวยงาม
          </button>
          <button class="btn-file-csv" onclick="exportPosSummaryCSV(); closeProductModal();">
            📄 CSV
          </button>
        </div>
      </div>

      <!-- Card 7: Low Stock Summary PDF -->
      <div class="export-card-item">
        <div class="export-card-head">
          <div class="export-card-icon" style="background: rgba(239, 68, 68, 0.15); color:#ef4444;">🚨</div>
          <div class="export-card-info">
            <h4>รายงานสรุปสินค้าสต็อกต่ำ & คาดการณ์วันหมดสต็อก (Low Stock Summary PDF)</h4>
            <p>แสดงรายการสินค้าวิกฤตพร้อมประมาณการจำนวนวันที่สินค้าจะหมด (30-Day Velocity) สำหรับสั่งพิมพ์ หรือบันทึก PDF</p>
          </div>
        </div>
        <div class="export-card-buttons">
          <button class="btn-file-excel" onclick="closeProductModal(); openLowStockPdfModal();" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; font-weight:bold;">
            🖨️ เปิดรายงาน PDF
          </button>
          <button class="btn-file-csv" onclick="exportCriticalStockExcel(); closeProductModal();">
            📗 Excel คาดการณ์
          </button>
        </div>
      </div>
    </div>

    <div class="actions" style="display:flex; justify-content:flex-end; margin-top:16px;">
      <button type="button" class="btn btn-light" onclick="closeProductModal()">ปิดหน้าต่าง</button>
    </div>
  `;
  el("modal").showModal();
}

function copyReportSummaryText(){
  const data = getReportAnalytics();
  const periodText = data.period === "today" ? `ประจำวันที่ ${todayISO()}` : data.period === "7days" ? "สรุป 7 วันล่าสุด" : "สรุปยอดขายทั้งหมด";
  
  let text = `📊 สรุปยอดขาย EA Fair Sale (${periodText})\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 ยอดขายรวม: ฿${money(data.totalRevenue)}\n`;
  text += `🧾 จำนวนบิล: ${data.totalBills} บิล (เฉลี่ย ฿${money(data.avgTicket)}/บิล)\n`;
  text += `📦 สินค้าที่ขายออก: ${data.totalUnitsSold} ชิ้น\n`;
  text += `💵 ชำระเงินสด: ฿${money(data.cashTotal)} (${data.cashBills} บิล)\n`;
  text += `📱 ชำระ QR/PromptPay: ฿${money(data.qrTotal)} (${data.qrBills} บิล)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏢 ยอดขายแยกตามจุดขาย (POS):\n`;
  
  for (const t of Object.values(data.terminalStats)) {
    text += `• ${t.code}: ฿${money(t.total)} (${t.bills} บิล, ${t.pct}%)\n`;
  }
  
  if (data.topProductsGlobal.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔥 สินค้าขายดี 3 อันดับแรก:\n`;
    data.topProductsGlobal.slice(0, 3).forEach((p, i) => {
      text += `${i + 1}. ${p.name} - ${p.qty} ชิ้น (฿${money(p.revenue)})\n`;
    });
  }
  
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `สร้างเมื่อ: ${new Date().toLocaleString("th-TH")}\n`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast("คัดลอกสรุปข้อความสำเร็จแล้ว พร้อมวางใน LINE");
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function printReportSummary(){
  openA4DailyReportModal();
}

function openA4DailyReportModal(dateStr) {
  const targetDate = dateStr || todayISO();
  const daySales = state.sales.filter(s => s.sale_date === targetDate);
  const daySaleIds = new Set(daySales.map(s => s.id));
  const daySaleItems = state.saleItems.filter(i => daySaleIds.has(i.sale_id));

  const sheetHtml = buildA4DailyReportHTML(targetDate, daySales, daySaleItems);

  const bodyEl = el("a4DialogBody");
  if (bodyEl) bodyEl.innerHTML = sheetHtml;

  const printArea = el("a4PrintArea");
  if (printArea) printArea.innerHTML = sheetHtml;

  const datePicker = el("a4ReportDatePicker");
  if (datePicker) datePicker.value = targetDate;

  const dlg = el("a4PrintDialog");
  if (dlg && typeof dlg.showModal === "function") {
    dlg.showModal();
  }
}

function closeA4ReportModal() {
  const dlg = el("a4PrintDialog");
  if (dlg && typeof dlg.close === "function") {
    dlg.close();
  }
}

function printA4DailyReport() {
  const datePicker = el("a4ReportDatePicker");
  const targetDate = datePicker ? datePicker.value : todayISO();
  const daySales = state.sales.filter(s => s.sale_date === targetDate);
  const daySaleIds = new Set(daySales.map(s => s.id));
  const daySaleItems = state.saleItems.filter(i => daySaleIds.has(i.sale_id));
  const sheetHtml = buildA4DailyReportHTML(targetDate, daySales, daySaleItems);

  // Update print area in main document
  const printArea = el("a4PrintArea");
  if (printArea) printArea.innerHTML = sheetHtml;

  try {
    let printFrame = document.getElementById("a4PrintFrame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "a4PrintFrame";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0px";
      printFrame.style.height = "0px";
      printFrame.style.border = "none";
      printFrame.style.visibility = "hidden";
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>รายงานสรุปยอดขายประจำวัน - ${targetDate}</title>
        <link rel="stylesheet" href="/css/app.css">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { background: #ffffff !important; color: #0f172a !important; margin: 0; padding: 12px; font-family: 'Prompt', 'Sarabun', sans-serif; }
          .a4-paper-sheet { box-shadow: none !important; max-width: 100% !important; padding: 0 !important; width: 100% !important; }
        </style>
      </head>
      <body>
        ${sheetHtml}
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.warn("Iframe print error, falling back to window.print():", err);
        fallbackWindowPrint();
      }
    }, 200);
  } catch (err) {
    console.warn("Frame creation error, falling back to window.print():", err);
    fallbackWindowPrint();
  }
}

function fallbackWindowPrint() {
  document.body.classList.add("printing-a4");
  document.body.classList.remove("printing-receipt");
  window.focus();
  window.print();
  setTimeout(() => {
    document.body.classList.remove("printing-a4");
  }, 1000);
}

function openA4PrintWindow() {
  const datePicker = el("a4ReportDatePicker");
  const targetDate = datePicker ? datePicker.value : todayISO();
  const daySales = state.sales.filter(s => s.sale_date === targetDate);
  const daySaleIds = new Set(daySales.map(s => s.id));
  const daySaleItems = state.saleItems.filter(i => daySaleIds.has(i.sale_id));
  const sheetHtml = buildA4DailyReportHTML(targetDate, daySales, daySaleItems);

  const printWin = window.open("", "_blank");
  if (!printWin) {
    toast("⚠️ เบราว์เซอร์บล็อก Pop-up กรุณาอนุญาตให้เปิดหน้าต่างใหม่");
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>รายงานสรุปยอดขายประจำวัน - ${targetDate}</title>
      <link rel="stylesheet" href="/css/app.css">
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { background: #f8fafc; color: #0f172a; padding: 24px; font-family: 'Prompt', 'Sarabun', sans-serif; display: flex; flex-direction: column; align-items: center; }
        .a4-paper-sheet { box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; max-width: 850px !important; width: 100% !important; background: #fff !important; }
        .no-print-bar { width: 100%; max-width: 850px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 18px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .btn-print-now { background: #0284c7; color: #ffffff; border: none; padding: 8px 18px; font-size: 14px; font-weight: 800; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-print-now:hover { background: #0369a1; }
        @media print {
          body { background: #ffffff !important; padding: 0 !important; }
          .no-print-bar { display: none !important; }
          .a4-paper-sheet { box-shadow: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong style="font-size:15px; color:#38bdf8;">🖨️ ตัวอย่างรายงานสรุปยอดขาย A4</strong>
          <div style="font-size:12px; color:#94a3b8; margin-top:2px;">กดปุ่มด้านขวาเพื่อพิมพ์ทันที หรือบันทึกเป็นไฟล์ PDF</div>
        </div>
        <button class="btn-print-now" onclick="window.print();">🖨️ สั่งพิมพ์เอกสาร / บันทึก PDF</button>
      </div>
      ${sheetHtml}
    </body>
    </html>
  `);
  printWin.document.close();

  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {}
  }, 400);
}

function buildA4DailyReportHTML(targetDate, daySales, daySaleItems) {
  const shopName = state.settings.shopName || "EA Fair Sale";
  const dayOfWeek = getThaiDayOfWeek(targetDate);
  const nowStr = new Date().toLocaleString("th-TH");

  // Calculations
  const totalRevenue = daySales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const totalBills = daySales.length;
  const qrSales = daySales.filter(x => x.payment_method === "promptpay" || x.payment_method === "qr" || x.payment_method === "transfer");
  const cashSales = daySales.filter(x => !x.payment_method || x.payment_method === "cash");
  const cashTotal = cashSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const qrTotal = qrSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const totalUnits = daySaleItems.reduce((s, x) => s + (Number(x.qty) || 0), 0);

  // Group by Product & Selling Price for Section 1 (Combined Product Sales, separated by selling price)
  const productSummaryMap = {};
  let totalItemDiscounts = 0;

  daySaleItems.forEach(i => {
    const qty = Number(i.qty) || 0;
    const origP = Number(i.original_price) || Number(i.unit_price) || 0;
    const unitP = Number(i.unit_price) || 0;
    const prodId = i.product_id || i.product_name || "item";
    const key = `${prodId}_u${unitP}_o${origP}`;
    const lineTot = Number(i.line_total) || (unitP * qty);
    const lineDisc = (origP > unitP) ? (origP - unitP) * qty : 0;

    totalItemDiscounts += lineDisc;

    if (!productSummaryMap[key]) {
      productSummaryMap[key] = {
        name: i.product_name || "ไม่ระบุชื่อสินค้า",
        unitPrice: unitP,
        originalPrice: origP,
        unit: i.unit || "ชิ้น",
        qty: 0,
        discount: 0,
        total: 0
      };
    }

    productSummaryMap[key].qty += qty;
    productSummaryMap[key].discount += lineDisc;
    productSummaryMap[key].total += lineTot;
  });

  const productSummaryList = Object.values(productSummaryMap);
  const billDiscounts = daySales.reduce((s, x) => s + (Number(x.discount_amount) || 0), 0);
  const totalDiscounts = totalItemDiscounts + billDiscounts;
  const grossTotal = totalRevenue + totalDiscounts;

  // Collect individual discounted items for Section 2
  const discountedItems = [];
  daySaleItems.forEach(i => {
    const origP = Number(i.original_price) || Number(i.unit_price) || 0;
    const unitP = Number(i.unit_price) || 0;
    const qty = Number(i.qty) || 0;
    const lineDisc = (origP > unitP) ? (origP - unitP) * qty : 0;

    if (lineDisc > 0) {
      const parentSale = daySales.find(s => s.id === i.sale_id);
      discountedItems.push({
        saleNo: parentSale ? (parentSale.sale_no || 'INV-' + parentSale.id.slice(0, 6)) : '-',
        time: parentSale ? String(parentSale.sale_time || '').slice(0, 5) : '-',
        productName: i.product_name || "ไม่ระบุชื่อสินค้า",
        originalPrice: origP,
        unitPrice: unitP,
        unitDiscount: origP - unitP,
        qty: qty,
        unit: i.unit || "ชิ้น",
        totalDiscount: lineDisc,
        lineTotal: Number(i.line_total) || (unitP * qty),
        discountNote: i.discount_note || parentSale?.discount_note || "ส่วนลดพิเศษ"
      });
    }
  });

  // Bills with bill-level discounts
  const billsWithBillDiscount = daySales.filter(s => Number(s.discount_amount) > 0);

  return `
    <div class="a4-paper-sheet">
      <!-- Document Header -->
      <div class="a4-doc-header">
        <div>
          <h1 class="a4-shop-title">🏪 ${escapeHtml(shopName)}</h1>
          <h2 class="a4-doc-title">📋 รายงานสรุปยอดขายประจำวัน (A4 DAILY SALES REPORT)</h2>
        </div>
        <div class="a4-doc-meta">
          <div><b>วันที่ขาย:</b> ${escapeHtml(targetDate)} (${escapeHtml(dayOfWeek)})</div>
          <div><b>จุดขาย (POS):</b> ${escapeHtml(state.terminal || 'POS-01')}</div>
          <div><b>วันที่พิมพ์:</b> ${nowStr}</div>
        </div>
      </div>

      <!-- Executive KPI Summary Bar -->
      <div class="a4-kpi-bar">
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">💰 ยอดขายสุทธิรวม</span>
          <span class="a4-kpi-val green">฿${money(totalRevenue)}</span>
        </div>
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">🧾 จำนวนบิลรวม</span>
          <span class="a4-kpi-val">${totalBills} บิล</span>
        </div>
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">📦 สินค้าที่ขายได้</span>
          <span class="a4-kpi-val">${totalUnits} ชิ้น</span>
        </div>
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">🏷️ รวมส่วนลดทั้งสิ้น</span>
          <span class="a4-kpi-val amber">฿${money(totalDiscounts)}</span>
        </div>
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">💵 ยอดเงินสด</span>
          <span class="a4-kpi-val">฿${money(cashTotal)}</span>
        </div>
        <div class="a4-kpi-item">
          <span class="a4-kpi-lbl">📱 ยอด QR Code</span>
          <span class="a4-kpi-val">฿${money(qrTotal)}</span>
        </div>
      </div>

      <!-- Section 1: Aggregated Product Sales for the Day (MAIN TABLE - NO BILL SEPARATION) -->
      <div class="a4-section-title">
        <span>📦 สรุปรายการสินค้าที่ขายได้ประจำวัน (${productSummaryList.length} รายการสินค้า)</span>
        <span style="font-size: 8.5pt; font-weight: normal; color: #1e293b;">แยกรายการตามราคาขายสุทธิเพื่อความชัดเจน</span>
      </div>
      <div class="a4-table-responsive">
        <table class="a4-table">
          <thead>
            <tr>
              <th style="width:35px;" class="th-center">#</th>
              <th>ชื่อสินค้า</th>
              <th style="width:120px;" class="th-right">ราคาขาย/หน่วย</th>
              <th style="width:80px;" class="th-center">จำนวนรวม</th>
              <th style="width:60px;" class="th-center">หน่วย</th>
              <th style="width:110px;" class="th-right">มูลค่าส่วนลด</th>
              <th style="width:120px;" class="th-right">ราคารวมสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            ${productSummaryList.length > 0 ? productSummaryList.map((p, idx) => `
              <tr>
                <td class="td-center" style="color:#0f172a; font-weight:800;">${idx + 1}</td>
                <td>
                  <b style="color:#0f172a; font-size:10pt;">${escapeHtml(p.name)}</b>
                  ${p.originalPrice > p.unitPrice ? `<span style="font-size:8pt; color:#92400e; font-weight:bold; background:#fef3c7; padding:1px 6px; border-radius:4px; margin-left:6px; border:1px solid #fcd34d;">[ราคาพิเศษ / ลดราคา]</span>` : ''}
                </td>
                <td class="td-right">
                  ${p.originalPrice > p.unitPrice ? `<small style="text-decoration:line-through; color:#64748b; font-size:8pt; margin-right:4px;">฿${money(p.originalPrice)}</small>` : ''}
                  <b style="${p.originalPrice > p.unitPrice ? 'color:#b45309;' : 'color:#000000;'}">฿${money(p.unitPrice)}</b>
                </td>
                <td class="td-center" style="font-weight:800; color:#000000; font-size:10.5pt;">${p.qty}</td>
                <td class="td-center" style="color:#0f172a; font-weight:700;">${escapeHtml(p.unit)}</td>
                <td class="td-right" style="color:${p.discount > 0 ? '#b45309' : '#0f172a'}; font-weight:${p.discount > 0 ? '800' : 'normal'};">
                  ${p.discount > 0 ? `-฿${money(p.discount)}` : '-'}
                </td>
                <td class="td-right" style="font-weight:900; color:#047857; font-size:10.5pt;">฿${money(p.total)}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="7" class="td-center" style="color:#0f172a; font-weight:bold; padding:16px;">ไม่มีข้อมูลสินค้าที่ขายออกในวันที่ ${escapeHtml(targetDate)}</td></tr>
            `}
          </tbody>
          ${productSummaryList.length > 0 ? `
            <tfoot>
              <tr>
                <td colspan="3" class="td-center" style="color:#000000; font-weight:800;">รวมยอดสินค้าทั้งสิ้น (${productSummaryList.length} รายการ)</td>
                <td class="td-center" style="font-weight:900; color:#000000; font-size:11pt;">${totalUnits}</td>
                <td class="td-center" style="color:#000000;">-</td>
                <td class="td-right" style="color:#b45309; font-weight:900; font-size:10pt;">${totalItemDiscounts > 0 ? `-฿${money(totalItemDiscounts)}` : '-'}</td>
                <td class="td-right" style="color:#047857; font-size:11.5pt; font-weight:900;">฿${money(totalRevenue)}</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>

      <!-- Grand Daily Financial Total -->
      <div class="a4-grand-total-box" style="margin-top:18px;">
        <div style="font-weight:800; font-size:11pt; color:#0f172a; border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:6px;">
          💵 สรุปยอดเงินรวมสุทธิประจำวัน (DAILY GRAND TOTAL)
        </div>
        <div class="a4-grand-total-row">
          <span>ยอดขายรวมก่อนหักส่วนลด (Gross Total):</span>
          <span>฿${money(grossTotal)}</span>
        </div>
        ${totalItemDiscounts > 0 ? `
          <div class="a4-grand-total-row" style="color:#d97706;">
            <span>หัก ส่วนลดสินค้าพิเศษเฉพาะบุคคล:</span>
            <span>-฿${money(totalItemDiscounts)}</span>
          </div>
        ` : ''}
        ${billDiscounts > 0 ? `
          <div class="a4-grand-total-row" style="color:#d97706;">
            <span>หัก ส่วนลดท้ายบิล:</span>
            <span>-฿${money(billDiscounts)}</span>
          </div>
        ` : ''}
        <div class="a4-grand-total-row highlight">
          <span>รวมราคาทั้งหมดที่ได้ในวันนั้น (Grand Net Revenue):</span>
          <span>฿${money(totalRevenue)}</span>
        </div>
        <div class="a4-grand-total-row" style="margin-top:6px; font-size:9.5pt;">
          <span>การชำระเงิน: 💵 เงินสด <b>฿${money(cashTotal)}</b> (${cashSales.length} บิล) &nbsp;|&nbsp; 📱 QR PromptPay <b>฿${money(qrTotal)}</b> (${qrSales.length} บิล)</span>
        </div>
      </div>
    </div>
  `;
}

// =========================================================
// BARCODE GENERATOR & LABEL PRINTING SUITE
// =========================================================

// High-fidelity Code 128 vector SVG barcode generator
function generateCode128Svg(text, options = {}) {
  const cleanText = String(text || "000000").trim();
  const width = options.width || 1.8;
  const height = options.height || 40;
  const showText = options.showText !== false;
  
  const patterns = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
  ];
  
  // Code 128 แบบผสม B/C: ตัวเลขต่อกันใช้ชุด C (2 หลักต่อ 1 สัญลักษณ์) ทำให้แท่งกว้างขึ้น สแกนง่ายบนฉลากเล็ก
  const codes = [];
  let curSet = null;
  const digitRun = (i) => { let n = 0; while (i + n < cleanText.length && /[0-9]/.test(cleanText[i + n])) n++; return n; };
  const toB = () => { if (curSet !== "B") { codes.push(curSet === null ? 104 : 100); curSet = "B"; } };
  let pos = 0;
  while (pos < cleanText.length) {
    let run = digitRun(pos);
    if (run >= 4 || (run >= 2 && run % 2 === 0 && pos === 0 && run === cleanText.length)) {
      if (run % 2 === 1) {
        toB();
        codes.push(cleanText.charCodeAt(pos) - 32);
        pos++; run--;
      }
      if (curSet !== "C") { codes.push(curSet === null ? 105 : 99); curSet = "C"; }
      for (let k = 0; k < run; k += 2) { codes.push(parseInt(cleanText.substr(pos, 2), 10)); pos += 2; }
    } else {
      toB();
      const charCode = cleanText.charCodeAt(pos);
      codes.push(charCode >= 32 && charCode <= 126 ? charCode - 32 : 0);
      pos++;
    }
  }
  let checkSum = codes[0];
  for (let j = 1; j < codes.length; j++) checkSum += codes[j] * j;
  codes.push(checkSum % 103);
  codes.push(106);
  
  let patternStr = "";
  for (let c of codes) {
    patternStr += patterns[c] || "";
  }
  
  let totalModules = 0;
  for (let ch of patternStr) totalModules += parseInt(ch, 10);
  
  const quietZone = 10;
  const svgWidth = Math.round((totalModules + quietZone * 2) * width);
  const textH = showText ? 15 : 0;
  const svgHeight = height + textH;
  
  let x = quietZone * width;
  let rects = [];
  let isBar = true;
  for (let ch of patternStr) {
    const barWidth = parseInt(ch, 10) * width;
    if (isBar) {
      rects.push(`<rect x="${x.toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${height}" fill="#000000" />`);
    }
    x += barWidth;
    isBar = !isBar;
  }
  
  let textSvg = "";
  if (showText) {
    textSvg = `<text x="${(svgWidth / 2).toFixed(1)}" y="${height + 12}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" font-weight="bold" fill="#000000" letter-spacing="1.5">${escapeHtml(cleanText)}</text>`;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" shape-rendering="crispEdges" style="display:block; margin:0 auto; background:#ffffff; max-width:100%; height:auto;">${rects.join("")}${textSvg}</svg>`;
}

// Global state for barcode modal
const barcodePrintState = {
  mode: "single", // "single" | "batch"
  productId: null,
  quantity: 1,
  format: (() => { try { return localStorage.getItem("ea_barcode_label_format") || "thermal-42x30"; } catch (_) { return "thermal-42x30"; } })(), // "thermal-42x30", "thermal-50x30", "a4-grid-24", "shelf-tag"
  batchType: "one-each", // "one-each" | "by-stock"
  batchOnlyInStock: false,
  searchQuery: "",
  showShop: true,
  showName: true,
  showPrice: true,
  showCode: true,
  showBarcodeText: true
};

function openBarcodePrintFromScanner() {
  if (typeof stopScanner === "function") stopScanner();
  openBarcodePrintModal();
}

function openBarcodePrintModal(productId = null, initialMode = null, initialQty = null) {
  if (productId) {
    barcodePrintState.productId = productId;
    const p = productById(productId);
    if (initialQty !== null && initialQty !== undefined) {
      barcodePrintState.quantity = Math.max(1, Number(initialQty) || 1);
    } else if (p && Number(p.stock_qty) > 0) {
      barcodePrintState.quantity = Math.max(1, Number(p.stock_qty));
    } else {
      barcodePrintState.quantity = 1;
    }
    if (initialMode) {
      barcodePrintState.mode = initialMode;
    } else {
      barcodePrintState.mode = "single";
    }
  } else {
    if (initialMode) {
      barcodePrintState.mode = initialMode;
      if (initialMode === "batch") {
        barcodePrintState.batchType = "by-stock";
      }
    }
    if (!barcodePrintState.productId && state.products.length > 0) {
      barcodePrintState.productId = state.products[0].id;
    }
  }
  barcodePrintState.searchQuery = "";
  renderBarcodePrintModalContent();
  const dlg = el("barcodePrintDialog");
  if (dlg && typeof dlg.showModal === "function") {
    dlg.showModal();
  }
}

function closeBarcodePrintModal() {
  const dlg = el("barcodePrintDialog");
  if (dlg && typeof dlg.close === "function") {
    dlg.close();
  }
}

function setBarcodeMode(m) {
  barcodePrintState.mode = m;
  renderBarcodePrintModalContent();
}

function setBarcodeFormat(fmt) {
  barcodePrintState.format = fmt;
  try { localStorage.setItem("ea_barcode_label_format", fmt); } catch (_) {}
  renderBarcodePrintModalContent();
}

function setBarcodeQty(q) {
  barcodePrintState.quantity = Number(q) || 1;
  const input = el("barcodeQuantityInput");
  if (input) input.value = barcodePrintState.quantity;
  renderBarcodePrintModalContent();
}

function onBarcodeQtyChange(val) {
  barcodePrintState.quantity = Math.max(1, Math.min(500, Number(val) || 1));
  updateBarcodePreview();
}

function onBarcodeSearchInput(val) {
  barcodePrintState.searchQuery = String(val || "").trim().toLowerCase();
  const filtered = getFilteredBarcodeProducts();
  const sel = el("barcodeProductSelect");
  if (sel) {
    sel.innerHTML = filtered.map(p => `
      <option value="${p.id}" ${p.id === barcodePrintState.productId ? 'selected' : ''}>
        ${escapeHtml(p.product_code || '-')} | ${escapeHtml(p.product_name)} (฿${money(p.sale_price)}) - บาร์โค้ด: ${escapeHtml(p.barcode || 'ไม่มี')}
      </option>
    `).join("");
    if (filtered.length > 0 && !filtered.some(p => p.id === barcodePrintState.productId)) {
      barcodePrintState.productId = filtered[0].id;
    }
  }
  updateBarcodePreview();
}

function clearBarcodeSearch() {
  barcodePrintState.searchQuery = "";
  renderBarcodePrintModalContent();
}

function onBarcodeProductSelect(productId) {
  barcodePrintState.productId = productId;
  renderBarcodePrintModalContent();
}

function toggleBarcodeOption(key, val) {
  barcodePrintState[key] = Boolean(val);
  updateBarcodePreview();
}

function setBarcodeBatchType(type) {
  barcodePrintState.batchType = type;
  renderBarcodePrintModalContent();
}

function toggleBarcodeBatchOnlyInStock(val) {
  barcodePrintState.batchOnlyInStock = Boolean(val);
  renderBarcodePrintModalContent();
}

function generateNewBarcode(prefix = "885") {
  let base = String(prefix);
  while (base.length < 12) {
    base += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

function assignGeneratedBarcode(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  const newCode = generateNewBarcode();
  p.barcode = newCode;
  saveLocalState();
  if (sb && !state.isOffline) {
    sb.from("ea_products").update({ barcode: newCode }).eq("id", productId).catch(console.warn);
  }
  toast(`✨ สร้างบาร์โค้ดใหม่: ${newCode} สำเร็จ`);
  renderBarcodePrintModalContent();
}

function promptEditBarcode(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  const current = p.barcode || p.product_code || "";
  const input = prompt("ระบุเลขบาร์โค้ดสินค้าที่ต้องการ (Code-128 หรือ EAN-13):", current);
  if (input !== null) {
    const trimmed = input.trim();
    if (!trimmed) {
      toast("⚠️ ยกเลิกการแก้ไข");
      return;
    }
    p.barcode = trimmed;
    saveLocalState();
    if (sb && !state.isOffline) {
      sb.from("ea_products").update({ barcode: trimmed }).eq("id", productId).catch(console.warn);
    }
    toast(`✅ อัปเดตบาร์โค้ดเป็น: ${trimmed}`);
    renderBarcodePrintModalContent();
  }
}

function getFilteredBarcodeProducts() {
  const q = barcodePrintState.searchQuery;
  if (!q) return state.products;
  return state.products.filter(p => {
    return (p.product_name || "").toLowerCase().includes(q) ||
           (p.product_code || "").toLowerCase().includes(q) ||
           String(p.barcode || "").includes(q);
  });
}

function getBatchPrintList() {
  return state.products.filter(p => {
    if (!p.is_active) return false;
    if (barcodePrintState.batchOnlyInStock && Number(p.stock_qty || 0) <= 0) return false;
    if (barcodePrintState.searchQuery) {
      const q = barcodePrintState.searchQuery;
      const match = (p.product_name || "").toLowerCase().includes(q) ||
                    (p.product_code || "").toLowerCase().includes(q) ||
                    String(p.barcode || "").includes(q);
      if (!match) return false;
    }
    return true;
  });
}

function getBarcodePrintStyles(format) {
  return `
    <style>
      @page {
        size: ${format === 'a4-grid-24' ? 'A4 portrait' : (format === 'shelf-tag' ? '70mm 40mm' : (format === 'thermal-42x30' ? '42mm 30mm' : '50mm 30mm'))};
        margin: ${format === 'a4-grid-24' ? '5mm 4mm' : '0'};
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Prompt", "Sarabun", sans-serif;
      }
      body * {
        visibility: visible !important;
      }
      .barcode-print-area {
        display: block !important;
        width: 100% !important;
      }
      /* Thermal 50x30mm */
      .barcode-label-thermal {
        width: 50mm;
        height: 30mm;
        max-width: 50mm;
        max-height: 30mm;
        padding: 2mm 2.5mm;
        background: #ffffff;
        color: #000000;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        box-sizing: border-box;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        margin: 0 auto;
        overflow: hidden;
      }
      .barcode-label-thermal .lbl-shop {
        font-size: 7.5pt;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: 0.3px;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .barcode-label-thermal .lbl-name {
        font-size: 8.5pt;
        font-weight: 900;
        color: #000000;
        line-height: 1.1;
        max-height: 2.2em;
        overflow: hidden;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .barcode-label-thermal .lbl-svg-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        margin: 0.5mm 0;
      }
      .barcode-label-thermal .lbl-svg-wrap svg {
        max-width: 100%;
        height: auto;
        max-height: 12mm;
        display: block;
        margin: 0 auto;
      }
      .barcode-label-thermal .lbl-bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        border-top: 0.5px solid #94a3b8;
        padding-top: 0.5mm;
      }
      .barcode-label-thermal .lbl-code {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 7.5pt;
        font-weight: 700;
        color: #334155;
      }
      .barcode-label-thermal .lbl-price {
        font-size: 10.5pt;
        font-weight: 900;
        color: #000000;
      }

      /* Shop sticker 42 x 30 mm (4.2 x 3.0 cm) */
      .barcode-label-thermal.lbl-42x30 {
        width: 42mm;
        height: 29.6mm;          /* ต่ำกว่า 30mm เล็กน้อย กันเบราว์เซอร์ดันขึ้นหน้าใหม่ (สติกเกอร์เปล่าแทรก) */
        max-width: 42mm;
        max-height: 29.6mm;
        padding: 1.4mm 1.8mm 1.2mm;
        justify-content: space-between;
      }
      .barcode-label-thermal.lbl-42x30 .lbl-shop { font-size: 5.5pt; letter-spacing: 0.2px; }
      .barcode-label-thermal.lbl-42x30 .lbl-name { font-size: 7pt; line-height: 1.12; max-height: 2.24em; }
      .barcode-label-thermal.lbl-42x30 .lbl-svg-wrap { margin: 0.3mm 0; }
      .barcode-label-thermal.lbl-42x30 .lbl-svg-wrap svg { width: 100%; max-width: 38.4mm; max-height: 12.5mm; }
      .barcode-label-thermal.lbl-42x30 .lbl-bottom-row { padding-top: 0.3mm; border-top-width: 0.3px; }
      .barcode-label-thermal.lbl-42x30 .lbl-code { font-size: 6pt; }
      .barcode-label-thermal.lbl-42x30 .lbl-price { font-size: 9.5pt; }

      /* A4 Sheet (24 labels: 3 columns x 8 rows) */
      .barcode-a4-sheet {
        width: 200mm;
        min-height: 285mm;
        padding: 4mm 2mm;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: 33.5mm;
        gap: 2.5mm 3.5mm;
        background: #ffffff;
        color: #000000;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        margin: 0 auto;
      }
      .barcode-label-a4-cell {
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        padding: 2mm 3mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        background: #ffffff;
        color: #000000;
        height: 33.5mm;
        max-height: 33.5mm;
        overflow: hidden;
      }
      .barcode-label-a4-cell .lbl-shop {
        font-size: 7.5pt;
        font-weight: 700;
        color: #475569;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .barcode-label-a4-cell .lbl-name {
        font-size: 8.5pt;
        font-weight: 900;
        color: #000000;
        line-height: 1.1;
        max-height: 2.2em;
        overflow: hidden;
        word-break: break-word;
      }
      .barcode-label-a4-cell .lbl-svg-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
      }
      .barcode-label-a4-cell .lbl-svg-wrap svg {
        max-width: 100%;
        height: auto;
        max-height: 12mm;
      }
      .barcode-label-a4-cell .lbl-bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        border-top: 0.5px solid #cbd5e1;
        padding-top: 1px;
      }
      .barcode-label-a4-cell .lbl-code {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 7.5pt;
        font-weight: 700;
        color: #475569;
      }
      .barcode-label-a4-cell .lbl-price {
        font-size: 10.5pt;
        font-weight: 900;
        color: #000000;
      }

      /* Shelf Price Tag 70x40mm */
      .barcode-shelf-tag {
        width: 70mm;
        height: 40mm;
        max-width: 70mm;
        max-height: 40mm;
        padding: 2.5mm 3.5mm;
        box-sizing: border-box;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        background: #ffffff;
        color: #000000;
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        margin: 0 auto;
        overflow: hidden;
      }
      .barcode-shelf-tag .lbl-shop {
        font-size: 8.5pt;
        font-weight: 800;
        color: #0284c7;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .barcode-shelf-tag .lbl-name {
        font-size: 10.5pt;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.15;
        max-height: 2.3em;
        overflow: hidden;
      }
      .barcode-shelf-tag .lbl-price-hero {
        font-size: 16pt;
        font-weight: 900;
        color: #047857;
        letter-spacing: -0.5px;
      }
      .barcode-shelf-tag .lbl-svg-wrap {
        width: 100%;
        display: flex;
        justify-content: center;
      }
      .barcode-shelf-tag .lbl-svg-wrap svg {
        max-width: 100%;
        height: auto;
        max-height: 14mm;
      }

      @media screen {
        body {
          background: #f1f5f9 !important;
          padding: 20px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .barcode-label-thermal,
        .barcode-shelf-tag {
          margin: 8px auto !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        .barcode-a4-sheet {
          margin: 14px auto !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.14) !important;
        }
      }

      @media print {
        .no-print, .no-print-bar {
          display: none !important;
        }
        body {
          background: #ffffff !important;
          padding: 0 !important;
        }
        .barcode-label-thermal,
        .barcode-shelf-tag,
        .barcode-a4-sheet {
          box-shadow: none !important;
          border: 1px solid #cbd5e1 !important;
        }
        .barcode-label-thermal.lbl-42x30 {
          border: none !important;   /* สติกเกอร์ไดคัทมีขอบอยู่แล้ว ไม่พิมพ์เส้นกรอบ */
          margin: 0 !important;
        }
      }
    </style>
  `;
}

function renderSingleBarcodeLabelHTML(product, format = "thermal-50x30", isPreview = false) {
  const p = product;
  if (!p) return "";
  const shopName = state.settings?.shopName || "EA Fair Sale";
  const barcodeValue = String(p.barcode || p.product_code || "000000").trim();
  const unitStr = p.unit || p.unit_name || "ชิ้น";
  const barcodeSvg = generateCode128Svg(barcodeValue, {
    height: format === "shelf-tag" ? 44 : (format === "thermal-42x30" ? 34 : 36),
    width: format === "shelf-tag" ? 2 : 1.7,
    showText: barcodePrintState.showBarcodeText
  });

  if (format === "shelf-tag") {
    return `
      <div class="barcode-shelf-tag" ${isPreview ? 'style="box-shadow:0 8px 24px rgba(0,0,0,0.5);"' : ''}>
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          ${barcodePrintState.showShop ? `<span class="lbl-shop">${escapeHtml(shopName)}</span>` : '<span></span>'}
          ${barcodePrintState.showCode ? `<span style="font-family:monospace; font-size:8pt; color:#475569; font-weight:700;">${escapeHtml(p.product_code)}</span>` : ''}
        </div>
        ${barcodePrintState.showName ? `<div class="lbl-name">${escapeHtml(p.product_name)}</div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin:2px 0;">
          <div class="lbl-svg-wrap" style="flex:1; max-width:65%;">
            ${barcodeSvg}
          </div>
          ${barcodePrintState.showPrice ? `
            <div style="text-align:right; flex-shrink:0;">
              <span class="lbl-price-hero">฿${money(p.sale_price)}</span>
              <div style="font-size:7.5pt; color:#64748b;">/${escapeHtml(unitStr)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Thermal 42x30 / 50x30mm or default
  return `
    <div class="barcode-label-thermal${format === 'thermal-42x30' ? ' lbl-42x30' : ''}" ${isPreview ? 'style="box-shadow:0 8px 24px rgba(0,0,0,0.5);"' : ''}>
      ${barcodePrintState.showShop ? `<div class="lbl-shop">${escapeHtml(shopName)}</div>` : ''}
      ${barcodePrintState.showName ? `<div class="lbl-name">${escapeHtml(p.product_name)}</div>` : ''}
      <div class="lbl-svg-wrap">
        ${barcodeSvg}
      </div>
      <div class="lbl-bottom-row">
        ${barcodePrintState.showCode ? `<span class="lbl-code">${escapeHtml(p.product_code)}</span>` : '<span></span>'}
        ${barcodePrintState.showPrice ? `<span class="lbl-price">฿${money(p.sale_price)}</span>` : ''}
      </div>
    </div>
  `;
}

function buildAllBarcodeLabelsPrintHTML(itemsList, format) {
  // itemsList is an array of { product, qty }
  if (format === "a4-grid-24") {
    const flatCells = [];
    itemsList.forEach(item => {
      const p = item.product;
      const count = Math.max(1, Number(item.qty) || 1);
      const barcodeValue = String(p.barcode || p.product_code || "000000").trim();
      for (let i = 0; i < count; i++) {
        flatCells.push(`
          <div class="barcode-label-a4-cell">
            ${barcodePrintState.showShop ? `<span class="lbl-shop">${escapeHtml(state.settings?.shopName || "EA Fair Sale")}</span>` : ''}
            ${barcodePrintState.showName ? `<div class="lbl-name">${escapeHtml(p.product_name)}</div>` : ''}
            <div class="lbl-svg-wrap">
              ${generateCode128Svg(barcodeValue, { height: 30, width: 1.5, showText: barcodePrintState.showBarcodeText })}
            </div>
            <div class="lbl-bottom-row">
              ${barcodePrintState.showCode ? `<span class="lbl-code">${escapeHtml(p.product_code)}</span>` : '<span></span>'}
              ${barcodePrintState.showPrice ? `<span class="lbl-price">฿${money(p.sale_price)}</span>` : ''}
            </div>
          </div>
        `);
      }
    });

    const sheets = [];
    for (let i = 0; i < flatCells.length; i += 24) {
      const slice = flatCells.slice(i, i + 24);
      sheets.push(`<div class="barcode-a4-sheet">${slice.join("")}</div>`);
    }
    return sheets.join("");
  }

  // Thermal 50x30mm or Shelf Tag
  const labels = [];
  itemsList.forEach(item => {
    const count = Math.max(1, Number(item.qty) || 1);
    for (let i = 0; i < count; i++) {
      labels.push(renderSingleBarcodeLabelHTML(item.product, format, false));
    }
  });
  return labels.join("");
}

function renderBarcodePrintModalContent() {
  const body = el("barcodePrintModalBody");
  if (!body) return;

  const products = getFilteredBarcodeProducts();
  const currentP = state.products.find(p => p.id === barcodePrintState.productId) || products[0] || state.products[0];
  if (!currentP && state.products.length === 0) {
    body.innerHTML = `<div class="empty" style="padding:40px; text-align:center;">ยังไม่มีรายการสินค้าในระบบ กรุณาเพิ่มสินค้าก่อนพิมพ์บาร์โค้ด</div>`;
    return;
  }

  const hasBarcode = Boolean(currentP && currentP.barcode && String(currentP.barcode).trim());
  const barcodeDisplayVal = hasBarcode ? String(currentP.barcode).trim() : String(currentP.product_code || '-');
  const batchList = getBatchPrintList();
  const totalBatchLabels = batchList.reduce((acc, p) => acc + (barcodePrintState.batchType === 'by-stock' ? Math.max(1, Number(p.stock_qty) || 1) : 1), 0);
  const totalBatchA4Sheets = Math.ceil(totalBatchLabels / 24) || 1;

  body.innerHTML = `
    <!-- Mode Tabs: Single vs Batch -->
    <div class="barcode-mode-tabs">
      <button type="button" class="barcode-mode-tab ${barcodePrintState.mode === 'single' ? 'active' : ''}" onclick="setBarcodeMode('single')">
        🏷️ พิมพ์สินค้าเดี่ยว (Single Item)
      </button>
      <button type="button" class="barcode-mode-tab ${barcodePrintState.mode === 'batch' ? 'active' : ''}" onclick="setBarcodeMode('batch')">
        📦 พิมพ์ชุดรวม / ทุกสินค้า (${batchList.length} รายการ)
      </button>
    </div>

    <div class="barcode-modal-grid">
      <!-- Left Column: Controls & Form Options -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        
        ${barcodePrintState.mode === 'single' ? `
          <!-- Search & Select Product -->
          <div class="field">
            <label style="font-weight:700; font-size:13px; color:#e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <span>ค้นหา & เลือกสินค้า</span>
              <small style="color:#94a3b8; font-weight:normal;">(${products.length} รายการ)</small>
            </label>
            <div class="barcode-search-box">
              <span class="barcode-search-icon">🔍</span>
              <input type="search" placeholder="พิมพ์ชื่อ, รหัส SKU, หรือบาร์โค้ดเพื่อค้นหา..." value="${escapeHtml(barcodePrintState.searchQuery)}" oninput="onBarcodeSearchInput(this.value)">
              ${barcodePrintState.searchQuery ? `<button type="button" class="barcode-search-clear" onclick="clearBarcodeSearch()">✕</button>` : ''}
            </div>
            <select id="barcodeProductSelect" class="sh-select" style="width:100%; height:40px;" onchange="onBarcodeProductSelect(this.value)">
              ${products.map(p => `
                <option value="${p.id}" ${p.id === currentP.id ? 'selected' : ''}>
                  ${escapeHtml(p.product_code || '-')} | ${escapeHtml(p.product_name)} (฿${money(p.sale_price)}) - สต็อก: ${p.stock_qty} ${escapeHtml(p.unit || 'ชิ้น')}
                </option>
              `).join("")}
            </select>
          </div>

          <!-- Barcode Status & Auto-generator -->
          <div class="barcode-status-card">
            <div class="barcode-status-info">
              <span style="font-size:11px; color:#94a3b8; font-weight:700;">เลขบาร์โค้ดของสินค้านี้:</span>
              <span class="barcode-status-val">
                ${hasBarcode ? `🏷️ ${escapeHtml(barcodeDisplayVal)}` : `<span style="color:#f59e0b;">⚠️ ยังไม่มีบาร์โค้ด (ใช้รหัส ${escapeHtml(currentP.product_code)} แทน)</span>`}
              </span>
            </div>
            <div style="display:flex; gap:6px;">
              ${!hasBarcode ? `
                <button type="button" class="btn btn-sm" style="background:#0284c7; color:#fff; font-size:11.5px; padding:5px 9px;" onclick="assignGeneratedBarcode('${currentP.id}')" title="สร้างบาร์โค้ด 13 หลักให้อัตโนมัติ">
                  ⚡ สร้างบาร์โค้ด
                </button>
              ` : `
                <button type="button" class="btn btn-sm btn-light" style="font-size:11.5px; padding:5px 9px;" onclick="promptEditBarcode('${currentP.id}')" title="แก้ไขเลขบาร์โค้ด">
                  ✏️ แก้ไข
                </button>
              `}
            </div>
          </div>
        ` : `
          <!-- Batch Mode Settings -->
          <div class="barcode-batch-summary">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="barcode-batch-pill">ชุดพิมพ์รวม</span>
                <strong style="font-size:14px; color:#38bdf8;">พิมพ์สินค้าพร้อมกัน</strong>
              </div>
              <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">
                รวม <strong>${batchList.length}</strong> รายการ • ทั้งหมด <strong style="color:#4ade80;">${totalBatchLabels}</strong> ดวง (~${totalBatchA4Sheets} แผ่น A4)
              </div>
            </div>
            <div style="text-align:right;">
              <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#e2e8f0; cursor:pointer;">
                <input type="checkbox" ${barcodePrintState.batchOnlyInStock ? 'checked' : ''} onchange="toggleBarcodeBatchOnlyInStock(this.checked)">
                เฉพาะที่มีสต็อก (> 0)
              </label>
            </div>
          </div>

          <div class="field">
            <label style="font-weight:700; font-size:13px; color:#e2e8f0;">เกณฑ์จำนวนดวงที่จะพิมพ์ในชุดนี้:</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button type="button" class="btn ${barcodePrintState.batchType === 'one-each' ? 'btn-primary' : 'btn-light'}" style="min-height:40px; font-size:12px; padding:6px;" onclick="setBarcodeBatchType('one-each')">
                🏷️ 1 ดวง / รายการ (${batchList.length} ดวง)
              </button>
              <button type="button" class="btn ${barcodePrintState.batchType === 'by-stock' ? 'btn-primary' : 'btn-light'}" style="min-height:40px; font-size:12px; padding:6px;" onclick="setBarcodeBatchType('by-stock')">
                📦 ตามสต็อกคงเหลือ (${totalBatchLabels} ดวง)
              </button>
            </div>
          </div>
        `}

        <!-- Label Template / Format -->
        <div class="field">
          <label style="font-weight:700; font-size:13px; color:#e2e8f0;">รูปแบบฉลาก / ชนิดกระดาษ (Label Template)</label>
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
            <button type="button" class="btn ${barcodePrintState.format === 'thermal-42x30' ? 'btn-primary' : 'btn-light'}" style="min-height:42px; font-size:12px; padding:6px 8px; flex-direction:column; gap:2px;" onclick="setBarcodeFormat('thermal-42x30')">
              <strong>🏷️ สติกเกอร์ร้าน 4.2×3.0 ซม.</strong>
              <small style="opacity:0.8;">ม้วนความร้อน 42×30mm</small>
            </button>
            <button type="button" class="btn ${barcodePrintState.format === 'thermal-50x30' ? 'btn-primary' : 'btn-light'}" style="min-height:42px; font-size:12px; padding:6px 8px; flex-direction:column; gap:2px;" onclick="setBarcodeFormat('thermal-50x30')">
              <strong>🏷️ สติกเกอร์เดี่ยว</strong>
              <small style="opacity:0.8;">ความร้อน 50×30mm</small>
            </button>
            <button type="button" class="btn ${barcodePrintState.format === 'a4-grid-24' ? 'btn-primary' : 'btn-light'}" style="min-height:42px; font-size:12px; padding:6px 8px; flex-direction:column; gap:2px;" onclick="setBarcodeFormat('a4-grid-24')">
              <strong>📄 แผ่นสติกเกอร์ A4</strong>
              <small style="opacity:0.8;">24 ดวง (3×8)</small>
            </button>
            <button type="button" class="btn ${barcodePrintState.format === 'shelf-tag' ? 'btn-primary' : 'btn-light'}" style="min-height:42px; font-size:12px; padding:6px 8px; flex-direction:column; gap:2px;" onclick="setBarcodeFormat('shelf-tag')">
              <strong>🗂️ ป้ายราคาชั้นวาง</strong>
              <small style="opacity:0.8;">ป้ายหน้าร้าน 70×40mm</small>
            </button>
          </div>
        </div>

        ${barcodePrintState.mode === 'single' ? `
          <!-- Quantity Controls for Single Item -->
          <div class="field">
            <label for="barcodeQuantityInput" style="font-weight:700; font-size:13px; color:#e2e8f0;">จำนวนดวงที่ต้องการพิมพ์ (Copies / Labels)</label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" id="barcodeQuantityInput" value="${barcodePrintState.quantity}" min="1" max="500" style="width:90px; height:42px; font-size:16px; font-weight:800; color:#38bdf8; text-align:center;" oninput="onBarcodeQtyChange(this.value)">
              <div class="barcode-qty-chips" style="margin-top:0;">
                <button type="button" class="barcode-chip-btn ${barcodePrintState.quantity === 1 ? 'active' : ''}" onclick="setBarcodeQty(1)">1 ดวง</button>
                <button type="button" class="barcode-chip-btn ${barcodePrintState.quantity === 5 ? 'active' : ''}" onclick="setBarcodeQty(5)">5 ดวง</button>
                <button type="button" class="barcode-chip-btn ${barcodePrintState.quantity === 10 ? 'active' : ''}" onclick="setBarcodeQty(10)">10 ดวง</button>
                <button type="button" class="barcode-chip-btn ${barcodePrintState.quantity === 24 ? 'active' : ''}" onclick="setBarcodeQty(24)">24 (1 แผ่น A4)</button>
                <button type="button" class="barcode-chip-btn ${barcodePrintState.quantity === currentP.stock_qty ? 'active' : ''}" onclick="setBarcodeQty(${currentP.stock_qty || 1})">ตามสต็อก (${currentP.stock_qty})</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Label Elements Toggle -->
        <div class="field" style="background:#131b28; padding:10px 12px; border-radius:10px; border:1px solid #202d40;">
          <label style="font-weight:700; font-size:12px; color:#cbd5e1; margin-bottom:6px; display:block;">องค์ประกอบที่จะพิมพ์บนฉลาก (Label Fields):</label>
          <div class="barcode-field-toggles" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" ${barcodePrintState.showShop ? 'checked' : ''} onchange="toggleBarcodeOption('showShop', this.checked)"> ชื่อร้าน (${escapeHtml(state.settings?.shopName || 'EA Fair')})
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" ${barcodePrintState.showName ? 'checked' : ''} onchange="toggleBarcodeOption('showName', this.checked)"> ชื่อสินค้า
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" ${barcodePrintState.showPrice ? 'checked' : ''} onchange="toggleBarcodeOption('showPrice', this.checked)"> ราคาขาย (฿xx)
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" ${barcodePrintState.showCode ? 'checked' : ''} onchange="toggleBarcodeOption('showCode', this.checked)"> รหัสสินค้า (SKU)
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" ${barcodePrintState.showBarcodeText ? 'checked' : ''} onchange="toggleBarcodeOption('showBarcodeText', this.checked)"> เลขอ่านได้ใต้บาร์โค้ด
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:8px; margin-top:4px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" style="flex:1; min-height:46px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); font-weight:800;" onclick="printBarcodeLabels()">
            🖨️ สั่งพิมพ์ฉลาก (${barcodePrintState.mode === 'single' ? barcodePrintState.quantity : totalBatchLabels} ดวง)
          </button>
          <button type="button" class="btn btn-light" style="min-height:46px;" onclick="openBarcodePrintWindow()" title="เปิดในหน้าต่างใหม่ / สั่งพิมพ์ / บันทึก PDF">
            📄 หน้าต่างพิมพ์ / PDF
          </button>
          ${barcodePrintState.mode === 'single' ? `
            <button type="button" class="btn btn-light" style="min-height:46px;" onclick="downloadBarcodeImage()" title="บันทึกรูปภาพบาร์โค้ด SVG">
              💾 ดาวน์โหลด SVG
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Right Column: Live Interactive Preview -->
      <div class="barcode-preview-container">
        <div class="barcode-preview-title">
          <span>👁️ ตัวอย่างสติกเกอร์จำลอง (Live Label Preview)</span>
        </div>
        <div id="barcodePreviewCardWrap" class="barcode-preview-card-wrap">
          ${renderSingleBarcodeLabelHTML(currentP, barcodePrintState.format, true)}
        </div>
        <div style="font-size:11.5px; color:#94a3b8; text-align:center; line-height:1.4;">
          สแกนได้ 100% ด้วยปืนเลเซอร์ USB และกล้องโทรศัพท์มือถือทุกรุ่น
        </div>
        ${barcodePrintState.mode === 'batch' ? `
          <div style="font-size:11px; color:#38bdf8; text-align:center; background:#111a28; padding:6px 12px; border-radius:8px; width:100%; border:1px solid #1e293b;">
            กำลังจะพิมพ์ทั้งหมด ${totalBatchLabels} ดวง สำหรับสินค้า ${batchList.length} รายการ
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function updateBarcodePreview() {
  const currentP = state.products.find(p => p.id === barcodePrintState.productId) || state.products[0];
  const wrap = el("barcodePreviewCardWrap");
  if (wrap && currentP) {
    wrap.innerHTML = renderSingleBarcodeLabelHTML(currentP, barcodePrintState.format, true);
  }
}

function printBarcodeLabels() {
  let itemsToPrint = [];
  if (barcodePrintState.mode === "single") {
    const currentP = state.products.find(p => p.id === barcodePrintState.productId) || state.products[0];
    if (!currentP) {
      toast("กรุณาเลือกสินค้า");
      return;
    }
    itemsToPrint = [{ product: currentP, qty: barcodePrintState.quantity }];
  } else {
    const list = getBatchPrintList();
    if (!list.length) {
      toast("ไม่มีสินค้าในเงื่อนไขการพิมพ์ชุดรวม");
      return;
    }
    itemsToPrint = list.map(p => ({
      product: p,
      qty: barcodePrintState.batchType === "by-stock" ? Math.max(1, Number(p.stock_qty) || 1) : 1
    }));
  }

  const printArea = el("barcodePrintArea");
  const fullHtml = buildAllBarcodeLabelsPrintHTML(itemsToPrint, barcodePrintState.format);
  if (printArea) printArea.innerHTML = fullHtml;

  const totalCount = itemsToPrint.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  const styles = getBarcodePrintStyles(barcodePrintState.format);

  try {
    let printFrame = document.getElementById("barcodePrintFrame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "barcodePrintFrame";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0px";
      printFrame.style.height = "0px";
      printFrame.style.border = "none";
      printFrame.style.visibility = "hidden";
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>Barcode Labels (${totalCount} Labels)</title>
        ${styles}
      </head>
      <body>
        <div class="barcode-print-area">
          ${fullHtml}
        </div>
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        toast(`🖨️ สั่งพิมพ์ฉลากบาร์โค้ด ${totalCount} ดวงเรียบร้อย`);
      } catch (err) {
        // Fallback to window print
        document.body.classList.add("printing-barcode");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-barcode"), 1000);
      }
    }, 350);
  } catch (ex) {
    document.body.classList.add("printing-barcode");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-barcode"), 1000);
  }
}

function openBarcodePrintWindow() {
  let itemsToPrint = [];
  if (barcodePrintState.mode === "single") {
    const currentP = state.products.find(p => p.id === barcodePrintState.productId) || state.products[0];
    if (!currentP) {
      toast("กรุณาเลือกสินค้า");
      return;
    }
    itemsToPrint = [{ product: currentP, qty: barcodePrintState.quantity }];
  } else {
    const list = getBatchPrintList();
    if (!list.length) {
      toast("ไม่มีสินค้าในเงื่อนไขการพิมพ์ชุดรวม");
      return;
    }
    itemsToPrint = list.map(p => ({
      product: p,
      qty: barcodePrintState.batchType === "by-stock" ? Math.max(1, Number(p.stock_qty) || 1) : 1
    }));
  }

  const fullHtml = buildAllBarcodeLabelsPrintHTML(itemsToPrint, barcodePrintState.format);
  const totalCount = itemsToPrint.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  const styles = getBarcodePrintStyles(barcodePrintState.format);

  const printWin = window.open("", "_blank");
  if (!printWin) {
    toast("⚠️ เบราว์เซอร์บล็อก Pop-up กรุณาอนุญาตเพื่อเปิดหน้าต่างพิมพ์");
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>พิมพ์บาร์โค้ด (${totalCount} ดวง)</title>
      ${styles}
    </head>
    <body>
      <div class="no-print-bar" style="width:100%; max-width:700px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; background:#0f172a; color:#ffffff; padding:12px 18px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div>
          <strong style="font-size:14px; color:#38bdf8;">🖨️ ตัวอย่างพิมพ์ฉลากบาร์โค้ด (${totalCount} ดวง)</strong>
          <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">EA Fair Sale • รูปแบบ: ${barcodePrintState.format}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button style="background:#0284c7; color:#fff; border:none; padding:8px 16px; font-size:13px; font-weight:800; border-radius:8px; cursor:pointer;" onclick="window.print()">
            🖨️ สั่งพิมพ์ / บันทึก PDF
          </button>
          <button style="background:#334155; color:#fff; border:none; padding:8px 12px; font-size:13px; border-radius:8px; cursor:pointer;" onclick="window.close()">
            ✕ ปิด
          </button>
        </div>
      </div>
      <div class="barcode-print-area">
        ${fullHtml}
      </div>
    </body>
    </html>
  `);
  printWin.document.close();

  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {}
  }, 400);
}

function downloadBarcodeImage() {
  const currentP = state.products.find(p => p.id === barcodePrintState.productId) || state.products[0];
  if (!currentP) return;

  const barcodeVal = String(currentP.barcode || currentP.product_code || "000000").trim();
  const svgString = generateCode128Svg(barcodeVal, {
    height: 48,
    width: 2,
    showText: barcodePrintState.showBarcodeText
  });

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `barcode-${barcodeVal}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`💾 ดาวน์โหลดบาร์โค้ด "${barcodeVal}.svg" เรียบร้อย`);
}

function generateSampleReceiptPreviewHTML(){
  const sampleBill = {
    saleNo: "POS-20260923-0001",
    date: new Date().toISOString(),
    terminal: state.terminal || "POS-01",
    paymentMethod: "cash",
    received: 200,
    change: 20,
    subtotal: 180,
    total: 180,
    items: [
      { name: "สินค้าตัวอย่าง 1 (เสื้อยืด)", qty: 1, unit: "ตัว", unit_price: 100, line_total: 100 },
      { name: "สินค้าตัวอย่าง 2 (หมวกแฟชั่น)", qty: 1, unit: "ใบ", unit_price: 80, line_total: 80 }
    ]
  };
  return generateInvoicePrintHTML(sampleBill);
}

function updateLiveReceiptPreview(){
  const box = el("receiptPreviewBox");
  if (!box) return;

  // Temporarily sync form inputs into state.settings for live preview
  const shopName = el("shopName")?.value.trim() || state.settings?.shopName || "EA Fair Sale";
  const shopBranch = el("shopBranch")?.value.trim() || "";
  const shopAddress = el("shopAddress")?.value.trim() || "";
  const shopPhone = el("shopPhone")?.value.trim() || "";
  const shopTaxId = el("shopTaxId")?.value.trim() || "";
  const shopLine = el("shopLine")?.value.trim() || "";
  const receiptFooterNote = el("receiptFooterNote")?.value.trim() || "ขอบคุณที่อุดหนุนสินค้า / Thank you!";
  const enableVat = Boolean(el("enableVatInput")?.checked);
  const vatRate = Number(el("vatRateInput")?.value || 7);

  const prevSettings = { ...state.settings };
  state.settings = {
    ...state.settings,
    shopName, shopBranch, shopAddress, shopPhone, shopTaxId, shopLine, receiptFooterNote, enableVat, vatRate
  };

  box.innerHTML = generateSampleReceiptPreviewHTML();
  state.settings = prevSettings;
}

function renderSettings(){
  setHeader("ตั้งค่า","เลือกจุดขาย การตั้งค่าใบเสร็จรับเงิน การแจ้งเตือน และฐานข้อมูล");
  const cfg = getSupabaseConfig();
  const notifInfo = getNotificationPermissionStatus();
  const emailCfg = emailNotificationConfigCache || {
    managerEmail: "workforcehub26@gmail.com",
    enabled: true,
    dailyAlertTime: "09:00",
    notifyOnEveryDip: true
  };

  // Fetch updated settings in background if needed
  if (!emailNotificationConfigCache) {
    fetchEmailNotificationSettings().then(() => {
      if (state.page === "settings") renderSettings();
    });
  }

  el("content").innerHTML=`${connectionNotice()}<div class="panel-grid">
    ${card("🎨 สีธีม & โหมดสว่าง/มืด (Theme & Dark/Light Mode)", renderThemeSelectorHTML())}

    ${card("จุดขายของเครื่องนี้",`<p style="margin-top:0;color:var(--muted);font-size:12px">ตั้งคนละ POS ในแต่ละแท็บเล็ต เช่น เครื่องแรก POS-01 เครื่องสอง POS-02</p><div class="terminal-options">${["POS-01","POS-02","POS-03","POS-04"].map(c=>`<button class="terminal-btn ${state.terminal===c?"active":""}" onclick="setTerminal('${c}')">${c}</button>`).join("")}</div>`)}

    ${card("📱 รับบิลจากมือถือ (สแกนส่งเครื่องคิดเงิน)",`<p style="margin-top:0;color:var(--muted);font-size:12px">เปิดที่แท็บเล็ต/เครื่องคิดเงิน เพื่อรับบิลที่พนักงานสแกนจากมือถือ • มือถือที่ใช้สแกนอย่างเดียวให้ปิดไว้<br>มือถือ: เมนู <b>สแกนส่งเครื่องคิดเงิน</b> → สแกนสินค้า → กด <b>📤 ส่งไปเครื่องคิดเงิน</b></p>
      <label class="toggle-switch-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <span>รับบิลจากมือถือที่เครื่องนี้ (${escapeHtml(state.terminal)})</span>
        <label class="toggle-switch"><input type="checkbox" ${window.isRemoteInboxEnabled?.() ? "checked" : ""} onchange="toggleRemoteInbox(this.checked)"><span class="toggle-slider"></span></label>
      </label>`)}
    
    ${card("🎨 ปรับแต่งใบเสร็จรับเงิน & สลิป (Receipt Customization)", `
      <p style="margin-top:0;color:var(--muted);font-size:12px">
        ตั้งค่าหัวสลิป ข้อมูลร้านค้า เบอร์โทร เลขประจำตัวผู้เสียภาษี (Tax ID) และข้อความขอบคุณท้ายสลิป
      </p>
      <div class="form-grid">
        <div class="field">
          <label>ชื่อร้านค้า / กิจการ (Shop Name)</label>
          <input id="shopName" value="${escapeHtml(state.settings?.shopName || 'EA Fair Sale')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field">
          <label>ชื่อสาขา / จุดขาย (Branch / Event Name)</label>
          <input id="shopBranch" placeholder="เช่น บูธ A12 งาน Fair 2026" value="${escapeHtml(state.settings?.shopBranch || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field" style="grid-column: span 2;">
          <label>ที่อยู่ร้านค้า (Shop Address)</label>
          <input id="shopAddress" placeholder="เช่น 123 อาคารแสดงสินค้า ถ.สุขุมวิท กรุงเทพฯ" value="${escapeHtml(state.settings?.shopAddress || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field">
          <label>เบอร์โทรศัพท์ (Phone)</label>
          <input id="shopPhone" placeholder="081-234-5678" value="${escapeHtml(state.settings?.shopPhone || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field">
          <label>เบอร์พร้อมเพย์รับเงิน (PromptPay ID / เบอร์โอนเงิน)</label>
          <input id="promptPayId" placeholder="081-234-5678 หรือ เลข ปชช." value="${escapeHtml(state.settings?.promptPayId || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field">
          <label>Line Official ID / Social</label>
          <input id="shopLine" placeholder="@eafairsale" value="${escapeHtml(state.settings?.shopLine || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field" style="grid-column: span 2;">
          <label>เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
          <input id="shopTaxId" placeholder="1234567890123" value="${escapeHtml(state.settings?.shopTaxId || '')}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field" style="grid-column: span 2;">
          <label>ข้อความขอบคุณท้ายสลิป (Receipt Footer Note)</label>
          <textarea id="receiptFooterNote" rows="2" style="background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:8px; padding:8px 12px; font-size:13px; font-family:inherit;" oninput="updateLiveReceiptPreview()">${escapeHtml(state.settings?.receiptFooterNote || 'ขอบคุณที่อุดหนุนสินค้า สามารถเปลี่ยนคืนสินค้าได้ภายใน 7 วัน')}</textarea>
        </div>
        <div class="field">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:700; color:#f8fafc; margin-top:8px;">
            <input id="enableVatInput" type="checkbox" ${state.settings?.enableVat ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7;" onchange="updateLiveReceiptPreview()">
            เปิดภาษีมูลค่าเพิ่ม (VAT Included)
          </label>
        </div>
        <div class="field">
          <label>อัตราภาษี VAT (%)</label>
          <input id="vatRateInput" type="number" value="${state.settings?.vatRate || 7}" oninput="updateLiveReceiptPreview()">
        </div>
        <div class="field">
          <label>เป้าหมายยอดขาย/วัน (฿)</label>
          <input id="targetInput" type="number" value="${state.settings?.target || 5000}">
        </div>
        <div class="field">
          <label>แจ้งเตือน Stock ต่ำเริ่มต้น (ชิ้น)</label>
          <input id="lowDefault" type="number" value="${state.settings?.lowStockDefault || 5}">
        </div>
      </div>
      <div class="actions" style="margin-top:14px; display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="saveSettings()">💾 บันทึกตั้งค่าสลิปและระบบ</button>
      </div>
    `)}

    ${card("👁️ ตัวอย่างสลิปใบเสร็จจำลอง (Live Receipt Preview)", `
      <p style="margin-top:0;color:var(--muted);font-size:12px">
        ตัวอย่างสลิปความร้อนที่จะพิมพ์เมื่อปิดการขาย (อัปเดตสดตามช่องด้านข้าง)
      </p>
      <div id="receiptPreviewBox" style="display:flex; justify-content:center; background:#0f172a; padding:16px; border-radius:12px; border:1px solid #334155; max-height:480px; overflow-y:auto;">
        ${generateSampleReceiptPreviewHTML()}
      </div>
    `)}

    ${card("📧 บริการแจ้งเตือนสต็อกต่ำทางอีเมลผู้จัดการ (Daily Email Alerts)", `
      <p style="margin-top:0;color:var(--muted);font-size:12px">
        ระบบจะส่งอีเมลแจ้งเตือนอัตโนมัติในเบื้องหลัง (Background Service) ไปยังอีเมลของผู้จัดการทันทีเมื่อสินค้าแตะเกณฑ์ขั้นต่ำ (Minimum Stock Threshold) หรือสรุปแจ้งเตือนประจำวัน
      </p>
      <div class="form-grid">
        <div class="field" style="grid-column: span 2;">
          <label>อีเมลผู้จัดการที่รับการแจ้งเตือน (Manager's Email)</label>
          <input id="managerEmailInput" type="email" placeholder="manager@example.com" value="${escapeHtml(emailCfg.managerEmail || 'workforcehub26@gmail.com')}">
        </div>
        <div class="field">
          <label>เวลาสรุปแจ้งเตือนประจำวัน (Daily Schedule)</label>
          <input id="emailAlertTime" type="time" value="${emailCfg.dailyAlertTime || '09:00'}">
        </div>
        <div class="field" style="display:flex; flex-direction:column; justify-content:center;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:700; color:#f8fafc; margin-top:14px;">
            <input id="emailAlertEnabled" type="checkbox" ${emailCfg.enabled ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7;">
            เปิดใช้งานบริการแจ้งเตือนทางอีเมล (Active)
          </label>
        </div>
        <div class="field" style="grid-column: span 2;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:700; color:#cbd5e1;">
            <input id="emailAlertOnDip" type="checkbox" ${emailCfg.notifyOnEveryDip ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7;">
            ส่งอีเมลแจ้งเตือนทันทีที่สินค้าชิ้นใดแตะเกณฑ์ขั้นต่ำ (Real-time Dip Alert)
          </label>
        </div>
      </div>
      <div class="actions" style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" onclick="saveEmailNotificationSettings()">
          💾 บันทึกการตั้งค่าอีเมล
        </button>
        <button type="button" class="btn btn-light" onclick="testLowStockEmail()">
          🧪 ส่งอีเมลทดสอบ (Test Email)
        </button>
        <button type="button" class="btn warning" onclick="triggerLowStockEmail(true)">
          🚀 ส่งสรุปแจ้งเตือนสต็อกปัจจุบันทันที
        </button>
      </div>
    `)}
    ${card("การแจ้งเตือนสต็อกบนเบราว์เซอร์ (Push Notifications)", `
      <p style="margin-top:0;color:var(--muted);font-size:12px">
        ระบบจะส่ง Web Push Notification แจ้งเตือนไปยังหน้าจอทันทีเมื่อสินค้าใดๆ มีสต็อกคงเหลือต่ำกว่าเกณฑ์ขั้นต่ำ (Minimum Stock Threshold) หรือหมดสต็อก
      </p>
      <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(30,41,59,0.7); border:1px solid #334155; border-radius:10px; padding:12px 16px; margin-bottom:14px;">
        <span style="font-size:13px; font-weight:700; color:#e2e8f0;">สถานะการอนุญาต (Permission):</span>
        <span class="badge ${notifInfo.badgeClass}" style="padding:4px 10px; font-size:12px; font-weight:700;">
          ${notifInfo.icon} ${notifInfo.label}
        </span>
      </div>
      <div class="actions" style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" onclick="requestNotificationPermission()">
          🔔 ขอสิทธิ์ / เปิดการแจ้งเตือน
        </button>
        <button type="button" class="btn btn-light" onclick="testBrowserPushNotification()">
          🧪 ทดสอบส่งการแจ้งเตือน (Test Push)
        </button>
      </div>
    `)}
    ${card("ตั้งค่าการเชื่อมต่อ Supabase",`<p style="margin-top:0;color:var(--muted);font-size:12px">หากต้องการเชื่อมต่อกับฐานข้อมูล Supabase สามารถใส่ URL และ Anon Key แล้วกดทดสอบเชื่อมต่อใหม่ได้ที่นี่</p><div class="form-grid"><div class="field"><label>Supabase URL</label><input id="sbUrlInput" placeholder="https://your-project.supabase.co" value="${escapeHtml(cfg.url)}"></div><div class="field"><label>Supabase Anon Key</label><input id="sbKeyInput" placeholder="eyJhbG..." value="${escapeHtml(cfg.key)}"></div></div><div class="actions" style="margin-top: 12px; display: flex; gap: 8px;"><button class="btn btn-primary" onclick="saveSupabaseSettings()">บันทึก & ลองเชื่อมต่อใหม่</button><button class="btn btn-light" onclick="clearSupabaseSettings()">ล้างค่า Custom</button></div>`)}
  </div>`}

function saveSupabaseSettings(){
  const url = el("sbUrlInput")?.value.trim() || "";
  const key = el("sbKeyInput")?.value.trim() || "";

  if (url) localStorage.setItem("ea_supabase_url", url);
  else localStorage.removeItem("ea_supabase_url");

  if (key) localStorage.setItem("ea_supabase_key", key);
  else localStorage.removeItem("ea_supabase_key");

  reloadSupabaseClient();
  toast("บันทึกการตั้งค่า Supabase แล้ว กำลังลองเชื่อมต่อ...");
  loadAll();
}

function clearSupabaseSettings(){
  localStorage.removeItem("ea_supabase_url");
  localStorage.removeItem("ea_supabase_key");
  reloadSupabaseClient();
  toast("ล้างการตั้งค่าคัสตอมแล้ว");
  loadAll();
}
function setTerminal(code){state.terminal=code;localStorage.setItem(TERMINAL_KEY,code);toast(`เครื่องนี้เป็น ${code}`);renderSettings();window.refreshRemoteInbox?.()}
// Save settings to Supabase. Uses ea_save_settings (migration V12); falls back to a direct upsert.
// Returns { ok, error } — callers must not report success when ok is false.
async function saveSettingsRemote(map){
  if(!sb) return { ok:false, error:"ยังไม่ได้เชื่อมต่อฐานข้อมูล" };
  const payload = {};
  for(const [k,v] of Object.entries(map)) payload[k] = String(v ?? "");
  try {
    const { error } = await sb.rpc("ea_save_settings", { p_settings: payload });
    if(!error) return { ok:true };
    const missing = /PGRST202|could not find the function|schema cache/i.test(`${error.code||""} ${error.message||""}`);
    if(!missing) return { ok:false, error: error.message || "บันทึกไม่สำเร็จ" };
  } catch(e){ return { ok:false, error: e?.message || String(e) }; }
  // Fallback (before V12): direct upsert, checking every result
  const results = await Promise.all(Object.entries(payload).map(([k,v]) =>
    sb.from("ea_settings").upsert({setting_key:k,setting_value:v},{onConflict:"setting_key"})));
  const failed = results.find(r => r.error);
  if(failed){
    const unauthorized = failed.status === 401 || failed.status === 403 || /permission|row-level security|42501/i.test(`${failed.error.code||""} ${failed.error.message||""}`);
    return { ok:false, error: unauthorized ? "ฐานข้อมูลไม่อนุญาตให้บันทึก — รัน migration_v12_save_settings.sql ใน Supabase" : (failed.error.message || "บันทึกไม่สำเร็จ") };
  }
  return { ok:true };
}
async function upsertSetting(k,v){
  const r = await saveSettingsRemote({ [k]: v });
  if(!r.ok) throw new Error(r.error);
  return r;
}
async function saveSettings(){
  const shopName = el("shopName")?.value.trim() || "EA Fair Sale";
  const shopBranch = el("shopBranch")?.value.trim() || "";
  const shopAddress = el("shopAddress")?.value.trim() || "";
  const shopPhone = el("shopPhone")?.value.trim() || "";
  const promptPayId = el("promptPayId")?.value.trim() || "";
  const shopTaxId = el("shopTaxId")?.value.trim() || "";
  const shopLine = el("shopLine")?.value.trim() || "";
  const receiptFooterNote = el("receiptFooterNote")?.value.trim() || "ขอบคุณที่อุดหนุนสินค้า สามารถเปลี่ยนคืนสินค้าได้ภายใน 7 วัน";
  const enableVat = Boolean(el("enableVatInput")?.checked);
  const vatRate = Number(el("vatRateInput")?.value || 7);
  const target = Number(el("targetInput")?.value || 5000);
  const low = Number(el("lowDefault")?.value || 5);

  const theme = state.settings?.theme || "ocean";

  state.settings = {
    ...state.settings,
    shopName,
    shopBranch,
    shopAddress,
    shopPhone,
    promptPayId,
    shopTaxId,
    shopLine,
    receiptFooterNote,
    enableVat,
    vatRate,
    target,
    lowStockDefault: low,
    theme
  };

  saveLocalState();

  if (!sb || state.isOffline || !navigator.onLine) {
    toast("⚠️ ออฟไลน์อยู่ • บันทึกไว้ในเครื่องนี้เท่านั้น ต่อเน็ตแล้วกดบันทึกอีกครั้ง", 5000);
    renderSettings();
    return;
  }

  const result = await saveSettingsRemote({
    shop_name: shopName,
    shop_branch: shopBranch,
    shop_address: shopAddress,
    shop_phone: shopPhone,
    prompt_pay_id: promptPayId,
    shop_tax_id: shopTaxId,
    shop_line: shopLine,
    receipt_footer_note: receiptFooterNote,
    enable_vat: enableVat,
    vat_rate: vatRate,
    daily_target: target,
    low_stock_default: low,
    theme
  });

  if (result.ok) {
    toast("บันทึกการตั้งค่าเรียบร้อย ทุกเครื่องจะใช้ค่านี้ ✅");
  } else {
    console.warn("Save settings failed:", result.error);
    toast("❌ บันทึกขึ้นระบบไม่สำเร็จ: " + result.error, 8000);
  }
  renderSettings();
}


function updateBottomNav(){
  const badge = el("bottomNavCartBadge");
  const cnt = cartCount();
  if(badge){
    if(cnt > 0){
      badge.textContent = cnt > 99 ? "99+" : cnt;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  document.querySelectorAll(".bottom-nav-item").forEach(btn=>{
    const target=btn.dataset.nav;
    let active=false;

    if(state.page==="home") active=target==="home";
    else if(state.page==="sale") active=target==="sale";
    else if(state.page==="stock" || state.page==="movement" || state.page==="lowStock" || state.page==="audit") active=target==="stock";
    else if(state.page==="menu" || state.page==="dashboardToday" || state.page==="dashboardAll" || state.page==="salesHistory" || state.page==="expenses" || state.page==="report" || state.page==="settings" || state.page==="hub") active=target==="menu";

    btn.classList.toggle("active",active);
  });
}

function toggleSearch(){
  const panel = el("searchPanel");
  if(!panel) return;
  panel.classList.toggle("hidden");
  if(!panel.classList.contains("hidden")){
    setTimeout(()=>el("searchInput")?.focus(),50);
  }
}

async function refreshData(){
  toast("กำลังรีเฟรชข้อมูล...");
  await loadAll();
  if(!state.isOffline && configured){
    toast("อัปเดตข้อมูลจาก Supabase สำเร็จ");
  } else {
    toast("รีเฟรชข้อมูลในเครื่องแล้ว (โหมดออฟไลน์)");
  }
}

function toggleHomeTopCardsMode() {
  const modes = ["compact", "mini", "normal"];
  const current = state.homeTopCardsMode || "compact";
  const nextIdx = (modes.indexOf(current) + 1) % modes.length;
  state.homeTopCardsMode = modes[nextIdx];
  localStorage.setItem("ea_home_top_cards_mode", state.homeTopCardsMode);
  renderHome();
  const labelMap = {
    compact: "ย่อกระชับ 📐 (เพิ่มพื้นที่การ์ดล่างเป็น 85%+)",
    mini: "มินิติดขอบ ⚡ (เพิ่มพื้นที่การ์ดล่างเป็น 92%+)",
    normal: "ขยายปกติ 📄"
  };
  toast(`ปรับขนาดการ์ดบน: ${labelMap[state.homeTopCardsMode]}`);
}

function go(page){if(state.page==="sale"&&page!=="sale"){stopScanner();stopCartLiveScanner();}state.page=page;render();window.scrollTo({top:0,behavior:"smooth"})}
el("searchInput").addEventListener("input",()=>{
  if(state.page!=="stock"){
    state.page="stock";
    render();
  } else {
    renderStock();
  }
});
el("searchInput").addEventListener("keydown",(e)=>{
  if(e.key==="Enter"){
    e.preventDefault();
    if(state.page!=="stock"){
      state.page="stock";
      render();
    }
  }
});
el("scannerDialog").addEventListener("close",()=>{try{scannerControls?.stop()}catch{}scannerControls=null});
el("scannerDialog").addEventListener("click",(e)=>{if(e.target===el("scannerDialog"))stopScanner()});
el("modal").addEventListener("click",(e)=>{if(e.target===el("modal"))el("modal").close()});
el("receiptDialog")?.addEventListener("click",(e)=>{if(e.target===el("receiptDialog"))closeReceiptModal()});
el("a4PrintDialog")?.addEventListener("click",(e)=>{if(e.target===el("a4PrintDialog"))closeA4ReportModal()});
el("lowStockAlertModal")?.addEventListener("click",(e)=>{if(e.target===el("lowStockAlertModal"))closeLowStockAlertModal()});
el("stockDetailDialog")?.addEventListener("click",(e)=>{if(e.target===el("stockDetailDialog"))closeStockDetailModal()});

Object.assign(window,{
  toggleHomeTopCardsMode,
  go,startScanner,stopScanner,startCartLiveScanner,stopCartLiveScanner,toggleCartLiveScanner,toggleCartLiveFlash,setCartLiveZoom,handleCartLiveScannedBarcode,handlePosSearchEnter,toggleScannerFlash,toggleScanSound,toggleScanVibration,toggleBatchScan,changeBatchQueueQty,undoBatchQueueItem,removeBatchQueueItem,clearBatchQueue,commitBatchScanToPOS,scrollScannerToQueue,openLowStockAlertModal,closeLowStockAlertModal,requestNotificationPermission,testBrowserPushNotification,getNotificationPermissionStatus,sendBrowserPushNotification,checkAndNotifyLowStock,
  fetchEmailNotificationSettings,saveEmailNotificationSettings,testLowStockEmail,triggerLowStockEmail,
  setCriticalCategoryFilter,setCriticalUrgencyFilter,setCriticalSort,calculate30DaySalesVelocity,exportCriticalStockExcel,openQuickRefillModal,calculateAutoSuggestRefill,openStockDetailModal,closeStockDetailModal,setStockDetailTargetDays,submitAutoRefillFromDetail,onSensitivityChange,onCameraZoomChange,setCameraZoom,addBarcodeFromInput,addSelectedProduct,changeCartQty,
  removeCartItem,clearCart,checkoutCart,openProductModal,editProduct,saveProduct,closeProductModal,
  saveMovement,setModalUnit,updateModalUnitLabels,onMoveProductChange,
  openCartDiscountModal,onDiscountPriceChange,onDiscountBahtChange,onDiscountPctChange,
  applyQuickItemDiscountBaht,applyQuickItemDiscountPct,resetToRegularPrice,setDiscountReason,saveCartDiscount,
  openBillDiscountModal,setBillDiscountTab,setBillDiscountDirectVal,setBillDiscountReason,
  onBillDiscountValueChange,saveBillDiscountModal,clearBillDiscountFromModal,
  applyQuickBillDiscountBaht,applyQuickBillDiscountPct,clearBillDiscount,
  downloadCSV,downloadExcel,openExportCenterModal,
  exportMasterReportExcel,exportMasterReportCSV,
  exportDailySummaryExcel,exportDailySummaryCSV,
  exportRawItemsExcel,exportRawItemsCSV,
  exportDiscountedItemsExcel,exportDiscountedItemsCSV,
  exportSalesExcel,exportSalesCSV,
  exportPosSummaryExcel,exportPosSummaryCSV,
  copyReportSummaryText,printReportSummary,
  openA4DailyReportModal,closeA4ReportModal,printA4DailyReport,
  setReportTab,setReportPeriod,setReportTerminalFilter,onReportRawSearch,clearReportRawSearch,
  onReportDiscountSearch,clearReportDiscountSearch,
  setTerminal,saveSettings,selectTheme,applyTheme,toggleColorMode,openThemePickerModal,closeThemePickerModal,quickReceive,goMovement,
  openNewProductFromHome,saveSupabaseSettings,clearSupabaseSettings,toggleSearch,refreshData,
  setPosMode,onPosSearchInput,clearPosSearch,addProductToCartById,setPaymentMethod,
  setQuickCash,addQuickCash,clearQuickCash,generateQuickPayAmounts,calculateChangeBreakdown,onReceivedCashInput,setStockFilter,setStockViewMode,onStockSearch,clearStockSearch,
  setStockPage,setStockPageSize,setStockSort,toggleStockTableSort,
  openStockAuditModal,toggleAuditBulkMode,setAuditBulkQty,stepAuditBulkQty,onAuditBulkQtyInput,setAuditFilter,setAuditScanStep,onAuditSearch,handleAuditBarcodeInput,handleAuditScannedBarcode,undoAuditRecentScan,startAuditCameraScan,updateAuditCount,stepAuditCount,resetAuditProductToSystem,setAllAuditToSystem,setAllAuditToZero,openDiscrepancyReportModal,printDiscrepancyReport,applyStockAuditAdjustments,exportStockAuditExcel,exportStockAuditCSV,renderPhysicalAuditPage,
  setAuditSubTab,setAuditHistoryFilterStatus,onAuditHistorySearchInput,openAuditBatchDetailModal,switchAuditDetailModalTab,exportAuditBatchHistoryExcel,exportAuditBatchHistoryPDF,renderAuditBatchHistoryTab,
  initDashboardAllFilter,getDashboardAllDateRange,setDashboardAllPeriod,onDashboardAllDateInputChange,applyDashboardAllCustomDate,getDashboardAllFilteredSales,setAllDaysChartMetric,mountAllDaysSalesChart,renderAllDaysSalesChart,
  initSalesHistoryFilter,getFilteredSalesHistory,getSalesHistoryKPIs,setSalesHistoryPeriod,
  onSalesHistoryDateChange,setSalesHistoryPayment,setSalesHistoryTerminal,onSalesHistorySearch,
  clearSalesHistorySearch,setSalesHistoryPage,setSalesHistoryPageSize,openSaleDetailModal,
  renderSalesHistory,exportSalesHistoryExcel,exportSalesHistoryCSV,printSalesHistorySummary,
  initExpenseFilter,setExpensePeriod,onExpenseDateChange,setExpenseCategoryFilter,onExpenseSearch,
  clearExpenseSearch,calculateFinancials,openExpenseModal,closeExpenseModal,saveExpenseFromModal,
  deleteExpense,renderExpenses,exportExpensesExcel,exportExpensesCSV,printExpensesReport,
  showReceiptModal,closeReceiptModal,printReceipt,saveReceiptAsJPEG,toast,el,
  openBarcodePrintModal,closeBarcodePrintModal,openBarcodePrintFromScanner,setBarcodeMode,setBarcodeFormat,setBarcodeQty,onBarcodeQtyChange,onBarcodeSearchInput,clearBarcodeSearch,onBarcodeProductSelect,toggleBarcodeOption,setBarcodeBatchType,toggleBarcodeBatchOnlyInStock,assignGeneratedBarcode,promptEditBarcode,printBarcodeLabels,openBarcodePrintWindow,downloadBarcodeImage,
  openLowStockPdfModal,updateLowStockModalContent,printLowStockSummaryPDF,copyLowStockSummaryText,setDashboardChartMode,exportRestockOrderPDF,downloadRestockOrderText,copyRestockOrderText,setRestockMultiplier,resetRestockOrder,updateRestockItemQty,receivePOItems,updatePOStatus,viewPODetailModal,selectProductForPOTimeline,saveSmartPODraft,setReplenishmentOption,updateSmartPODraftQty,setStockForecastUrgencyFilter,setStockForecastCatFilter,onStockForecastSearchInput,setLowStockSubTab,setPosFilter,setDashboardPeriod,onDashboardDateInputChange,applyDashboardCustomDate,updateProductModalBarcodePreview,generateAndSetProductModalBarcode,applyReportCustomDate,exportAccountingJournalExcel,exportAccountingJournalCSV,updateLiveReceiptPreview,buildReportBasketTab
});
function render(){
  const backBtn=el("homeBackBtn");
  if(backBtn) backBtn.classList.toggle("hidden",state.page==="home");

  const offlineBadge=el("offlineHeaderBadge");
  if(offlineBadge) offlineBadge.classList.toggle("hidden", !(state.isOffline || !configured));

  if(window.EaOfflineSync) window.EaOfflineSync.updateSyncUI();

  updateBottomNav();
  if(state.loading)return;

  if(state.page==="home")renderHome();
  else if(state.page==="menu")renderMenu();
  else if(state.page==="sale")renderSale();
  else if(state.page==="dashboardToday")renderDashboardToday();
  else if(state.page==="dashboardAll")renderDashboardAll();
  else if(state.page==="salesHistory")renderSalesHistory();
  else if(state.page==="expenses")renderExpenses();
  else if(state.page==="stock")renderStock();
  else if(state.page==="lowStock")renderLowStock();
  else if(state.page==="movement")renderMovement();
  else if(state.page==="audit")renderPhysicalAuditPage();
  else if(state.page==="report")renderReport();
  else if(state.page==="hub" && typeof window.renderHub==="function")window.renderHub();
  else renderSettings();
}
loadAll();
