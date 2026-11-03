/**
 * EA Fair Sale - Icons instead of emoji
 *
 * แทนอิโมจิทุกตัวในแอปด้วยไอคอนเส้น (SVG) ชุดเดียวกัน โดยอัตโนมัติ:
 *  - ข้อความที่แสดงบนหน้าจอ (รวมหน้าต่าง/ข้อความแจ้งเตือนที่สร้างภายหลัง) → แปลงเป็น <svg>
 *  - ช่องกรอก / placeholder / title / ตัวเลือกใน select → ตัดอิโมจิออก (ใส่ไอคอนไม่ได้)
 *  - หน้าพิมพ์ (window.open + document.write) → แปลงเป็น <svg>
 *  - รูปใบเสร็จ (canvas), ข้อความคัดลอกส่ง LINE, การแจ้งเตือนเบราว์เซอร์ → ตัดอิโมจิออก
 * ไอคอนวาดตามแนวทาง Lucide (ISC/MIT) ใช้สีตามตัวอักษร (currentColor)
 */
(function () {
  const P = {
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/><path d="M3 5a2 2 0 0 0 2 2h15a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16V7"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 12.5V21h14v-8.5"/><path d="M10 21v-5h4v5"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1M10 22v-4h4v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hourglass: '<path d="M6 2h12M6 22h12"/><path d="M7 2v4l5 6 5-6V2M7 22v-4l5-6 5 6v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    crown: '<path d="m2 7 5 5 5-8 5 8 5-5-2 12H4z"/><path d="M4 21h16"/>',
    medal: '<circle cx="12" cy="15" r="6"/><path d="M8.5 9.5 6 2h4l2 5 2-5h4l-2.5 7.5"/><path d="M12 12.5v5"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    signal: '<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>',
    wifiOff: '<path d="m2 2 20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.7M19 13a10 10 0 0 0-2.3-1.6M2 8.8a15 15 0 0 1 4.2-2.7M22 8.8A15 15 0 0 0 10.7 5"/><path d="M12 20h.01"/>',
    flame: '<path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-3 2-4.5 2-7 2 1 3 2.5 3 4 1-1 1-3 0-8z"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    refresh: '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    dot: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    ruler: '<path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A5.7 5.7 0 0 0 22 10.3C22 5.7 17.5 2 12 2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    sad: '<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><path d="M9 9h.01M15 9h.01"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    surprised: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="15.5" r="1.8"/><path d="M9 9h.01M15 9h.01"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2-.1-2.8a2 2 0 0 0-2.9-.2z"/><path d="M12 15l-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    wind: '<path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    skipBack: '<path d="M19 20 9 12l10-8zM5 19V5"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    utensils: '<path d="M3 2v7a2 2 0 0 0 4 0V2M5 11v11"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    flask: '<path d="M9 2v6L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L15 8V2M8 2h8"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 17h8"/>',
    flashlight: '<path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z"/><path d="M6 6h12M12 12v2"/>'
  };

  // emoji → [icon, optional color class]
  const MAP = {
    '📦': 'box', '⚠': 'alert', '🚨': ['alert', 'ic-red'], '❗': ['alertCircle', 'ic-red'], 'ℹ': 'info',
    '🖨': 'printer', '🏷': 'tag', '⚡': 'zap', '🔦': 'flashlight',
    '💵': 'banknote', '💸': 'banknote', '💰': 'wallet', '🪙': 'coins', '💳': 'card', '🆔': 'card',
    '📋': 'clipboard', '📑': 'clipboard', '📄': 'file', '📜': 'file', '📝': 'file', '📗': 'sheet',
    '📁': 'folder', '🗂': 'folder', '🧾': 'receipt',
    '✅': ['checkCircle', 'ic-green'], '❌': ['xCircle', 'ic-red'], '🚫': ['ban', 'ic-red'],
    '📊': 'chart', '📈': 'trend', '📱': 'phone', '📲': 'phone', '📟': 'phone', '📳': 'phone',
    '📅': 'calendar', '🗓': 'calendar', '📆': 'calendar',
    '📥': 'download', '📤': 'upload',
    '🎉': 'sparkles', '🥳': 'sparkles', '✨': 'sparkles', '🌟': 'sparkles',
    '🏪': 'store', '🎪': 'store', '🛍': 'bag', '🏢': 'building', '🏛': 'building',
    '⏰': 'clock', '⏱': 'clock', '🕒': 'clock', '⏳': 'hourglass',
    '🔍': 'search', '💾': 'save',
    '🏆': 'trophy', '👑': 'crown', '🥇': ['medal', 'ic-gold'], '🥈': ['medal', 'ic-silver'], '🥉': ['medal', 'ic-bronze'],
    '🛒': 'cart', '📷': 'camera', '💡': 'bulb', '🧠': 'bulb', '🔮': 'bulb', '🎯': 'target', '🔔': 'bell',
    '🌐': 'globe', '📡': 'signal', '📴': 'wifiOff', '🔥': 'flame', '💥': 'flame',
    '🔄': 'refresh', '⚖': 'scale', '📧': 'mail', '💬': 'message', '🔗': 'link', '💻': 'laptop',
    '🟢': ['dot', 'ic-green'], '🔴': ['dot', 'ic-red'], '🟡': ['dot', 'ic-yellow'], '🟠': ['dot', 'ic-orange'],
    '⭐': 'star', '🚚': 'truck', '✏': 'pencil', '📐': 'ruler', '🎨': 'palette', '➕': 'plus',
    '☀': 'sun', '🌅': 'sun', '🌙': 'moon', '🌑': 'moon', '🌆': 'moon', '⚙': 'gear', '🔧': 'wrench',
    '😰': 'sad', '😃': 'smile', '😮': 'surprised', '🗑': 'trash', '👁': 'eye',
    '🚀': 'rocket', '💨': 'wind', '⏮': 'skipBack', '⏪': 'skipBack', '🤖': 'cpu',
    '🔊': 'volume', '🔇': 'mute', '🎁': 'gift', '📭': 'inbox', '👥': 'users', '👤': 'user',
    '🍱': 'utensils', '📢': 'megaphone', '🧪': 'flask', '☁': 'cloud', '🛡': 'shield', '🔤': 'type',
    '🔒': 'lock', '⛶': 'maximize', '⌨': 'keyboard'
  };

  // Any other pictographic emoji falls back to a neutral dot-free removal.
  const keys = Object.keys(MAP).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const KNOWN = new RegExp(`(${keys.join('|')})\\uFE0F?`, 'gu');
  // Typographic symbols that are fine as plain text (arrows, ©, ™ …) are left alone.
  const ANY = /(?![↩↪↖-↙↔↕◀▶©®™‼⁉〰])\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu;
  const HAS = /(?![↩↪↖-↙↔↕◀▶©®™‼⁉〰])\p{Extended_Pictographic}/u;

  function svg(name, cls) {
    const body = P[name];
    if (!body) return '';
    return `<svg class="ea-ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  function iconFor(ch) {
    const m = MAP[ch.replace(/️/g, '')];
    if (!m) return '';
    return Array.isArray(m) ? svg(m[0], m[1]) : svg(m);
  }

  // Strip emoji (and the space that followed it) — for plain-text places
  function stripEmoji(text) {
    if (typeof text !== 'string' || !HAS.test(text)) return text;
    return text.replace(new RegExp(ANY.source + '[ \\u00A0]?', 'gu'), '').replace(/\s{2,}/g, ' ').trim();
  }

  // HTML string → emoji replaced by inline SVG (for print windows)
  function htmlWithIcons(html) {
    if (typeof html !== 'string' || !HAS.test(html)) return html;
    // keep <title> plain
    html = html.replace(/<title>([\s\S]*?)<\/title>/i, (m, t) => `<title>${stripEmoji(t)}</title>`);
    return html.replace(ANY, (ch) => iconFor(ch) || '');
  }

  // ---- DOM conversion ----
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'TITLE', 'svg', 'SVG', 'NOSCRIPT', 'CODE', 'PRE']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function convertText(node) {
    const text = node.nodeValue;
    if (!text || !HAS.test(text)) return;
    const parent = node.parentNode;
    if (!parent) return;
    // Areas marked data-keep-emoji (e.g. the STATUS mascot card) keep their emoji
    if (parent.closest?.('[data-keep-emoji]')) return;
    // Text inside charts (SVG <text>) cannot hold another icon → remove the emoji
    if ((parent.nodeName === 'text' || parent.nodeName === 'tspan') && parent.closest?.('svg')) {
      node.nodeValue = stripEmoji(text);
      return;
    }
    if (SKIP.has(parent.nodeName) || parent.closest?.('svg,textarea,select')) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    ANY.lastIndex = 0;
    let m;
    while ((m = ANY.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const html = iconFor(m[0]);
      if (html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        frag.appendChild(tpl.content.firstChild);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
  }

  function convertElementAttrs(el) {
    if (el.closest?.('[data-keep-emoji]')) return;
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      if (v && HAS.test(v)) el.setAttribute(a, stripEmoji(v));
    }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value && HAS.test(el.value) && el.type !== 'hidden') {
      // only static, app-provided values (do not touch what a user is typing)
      if (document.activeElement !== el) el.value = stripEmoji(el.value);
    }
    if (el.tagName === 'OPTION' && HAS.test(el.textContent)) el.textContent = stripEmoji(el.textContent);
  }

  function convertTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { convertText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP.has(root.nodeName) && root.nodeName !== 'OPTION') return;
      convertElementAttrs(root);
    }
    if (!HAS.test(root.textContent || '') && !root.querySelector?.('[placeholder],[title],[aria-label],[alt],option,input')) return;
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label],[alt],option,input') : [];
    els.forEach(convertElementAttrs);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (HAS.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(convertText);
  }

  function start() {
    convertTree(document.body);
    if (document.title && HAS.test(document.title)) document.title = stripEmoji(document.title);
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') convertText(r.target);
        else if (r.type === 'attributes') convertElementAttrs(r.target);
        else r.addedNodes.forEach(convertTree);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ---- Places that cannot show SVG ----
  try {
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) { return fill.call(this, stripEmoji(String(text)), ...rest); };
    const measure = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function (text) { return measure.call(this, stripEmoji(String(text))); };
  } catch (e) {}
  try {
    if (navigator.clipboard?.writeText) {
      const write = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (t) => write(stripEmoji(String(t)).replace(/ ?\n ?/g, '\n'));
    }
  } catch (e) {}
  try {
    if (window.Notification) {
      const N = window.Notification;
      const Wrapped = function (title, opts) { const o = { ...(opts || {}) }; if (o.body) o.body = stripEmoji(o.body); return new N(stripEmoji(String(title)), o); };
      Wrapped.prototype = N.prototype;
      Object.defineProperty(Wrapped, 'permission', { get: () => N.permission });
      Wrapped.requestPermission = N.requestPermission.bind(N);
      window.Notification = Wrapped;
    }
  } catch (e) {}
  // Print windows: convert emoji in the written HTML to SVG icons
  try {
    const open = window.open;
    window.open = function (...args) {
      const w = open.apply(window, args);
      try {
        if (w && w.document) {
          const write = w.document.write.bind(w.document);
          w.document.write = (...html) => write(...html.map(h => htmlWithIcons(String(h)).replace('</head>', `<style>${CSS}</style></head>`)));
        }
      } catch (e) {}
      return w;
    };
  } catch (e) {}

  const CSS = `.ea-ic{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.2em;flex-shrink:0}
.ea-ic.ic-red{color:#ef4444}.ea-ic.ic-green{color:#22c55e}.ea-ic.ic-yellow{color:#eab308}.ea-ic.ic-orange{color:#f97316}
.ea-ic.ic-gold{color:#eab308}.ea-ic.ic-silver{color:#94a3b8}.ea-ic.ic-bronze{color:#c2410c}`;

  window.EaIcons = { svg, iconFor, stripEmoji, htmlWithIcons, convertTree };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
