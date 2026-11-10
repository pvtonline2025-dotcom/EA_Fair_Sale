/* EA Fair Sale – tablet / mobile PWA installation helper.
 * The app can only be installed when the browser supports it; this helper
 * never simulates an install or modifies POS transactions.
 */
(function () {
  'use strict';

  let deferredInstallPrompt = null;
  let installed = false;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isAppleTouch = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // เปิดลิงก์จากในแอปแชท (LINE / Facebook / Messenger / Instagram) → ติดตั้งไม่ได้ ต้องเปิดใน Safari / Chrome ก่อน
  const inAppBrowser = () => /\bLine\/|FBAN|FBAV|FB_IAB|Messenger|Instagram|MicroMessenger|KAKAOTALK/i.test(navigator.userAgent);
  const isPhone = () => Math.min(window.screen?.width || 9999, window.screen?.height || 9999, window.innerWidth) < 600;

  const isMobileOrTablet = () =>
    isAppleTouch() || /Android|Mobile|Tablet/i.test(navigator.userAgent) ||
    (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1400);

  function refreshButton() {
    const button = document.getElementById('installAppBtn');
    if (!button) return;
    button.hidden = installed || isStandalone() || !(isMobileOrTablet() || deferredInstallPrompt);
  }

  function updateDialog() {
    const steps = document.getElementById('installAppSteps');
    const nativeButton = document.getElementById('installNativeBtn');
    if (!steps || !nativeButton) return;

    nativeButton.hidden = !deferredInstallPrompt;
    const device = isPhone() ? 'มือถือ' : 'แท็บเล็ต';
    const cashierApp = document.documentElement.classList.contains('ea-cashier-app');
    const icon = document.querySelector('#appInstallDialog .ea-install-icon');
    if (icon) icon.src = cashierApp ? 'assets/icons/cashier-192.png?v=20261110' : 'assets/icons/logo-192.png?v=20261110';
    const title = document.getElementById('appInstallTitle');
    if (title) title.textContent = cashierApp ? 'ติดตั้งแอป EA คิดเงิน' : 'ติดตั้ง EA Fair Sale';
    const desc = document.querySelector('#appInstallDialog .ea-install-desc');
    if (desc) desc.textContent = cashierApp ? 'ไอคอนสีเขียวสำหรับสแกนคิดเงิน แยกจากแอปหลัก' : `เพิ่มไอคอนแอปไว้บนหน้าจอหลักของ${device}`;
    const message = inAppBrowser()
      ? `ตอนนี้เปิดอยู่ในแอป${/\bLine\//i.test(navigator.userAgent) ? ' LINE' : 'แชท'} ซึ่งติดตั้งแอปไม่ได้: แตะเมนู ⋯ (มุมขวา) → “เปิดในเบราว์เซอร์” ${isAppleTouch() ? '(Safari)' : '(Chrome)'} แล้วกดปุ่มติดตั้งแอปอีกครั้ง`
      : isAppleTouch()
        ? `บน ${isPhone() ? 'iPhone' : 'iPad'}: เปิดด้วย Safari แล้วแตะปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น ${isPhone() ? 'ด้านล่างจอ' : 'มุมขวาบน'}) → เลื่อนลงแตะ “เพิ่มไปยังหน้าจอโฮม” → “เพิ่ม”`
        : /Android/i.test(navigator.userAgent)
          ? `บน${device} Android: เปิดด้วย Chrome แล้วแตะเมนู ⋮ (มุมขวาบน) → “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก” → “ติดตั้ง”`
          : 'เปิดเมนูของเบราว์เซอร์ แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก” (หากเบราว์เซอร์รองรับ)';
    steps.textContent = message;

    const hint = document.getElementById('installAppHint');
    if (hint) {
      hint.textContent = !window.isSecureContext
        ? 'ต้องเปิดจากเว็บไซต์ HTTPS จึงจะติดตั้งเป็นแอปได้'
        : deferredInstallPrompt
          ? 'เบราว์เซอร์รองรับการติดตั้งโดยตรง กด “ติดตั้งทันที” ได้เลย'
          : cashierApp
            ? 'เมื่อติดตั้งแล้ว จะมีไอคอน “EA คิดเงิน” สีเขียวบนหน้าจอหลัก แตะแล้วเข้าหน้าสแกนคิดเงินทันที ไม่ต้องพิมพ์ URL'
            : 'เมื่อติดตั้งแล้ว จะมีไอคอน EA Fair Sale บนหน้าจอหลัก เปิดได้โดยไม่ต้องพิมพ์ URL';
    }
  }

  // เปิดหน้าต่างติดตั้ง (เรียกจากปุ่มบนหัวแอป และจากหน้าสแกนคิดเงินมือถือ)
  function openInstall() {
    const dialog = document.getElementById('appInstallDialog');
    if (!dialog) return;
    if (isStandalone() || installed) { window.toast?.('ติดตั้งแอปบนเครื่องนี้แล้ว'); return; }
    updateDialog();
    if (!dialog.open) dialog.showModal();
  }
  // แสดงทางติดตั้งได้ไหม (ยังไม่ได้ติดตั้ง / ไม่ได้เปิดจากไอคอนแอป)
  const canInstall = () => !installed && !isStandalone();
  function notifyChange() { try { window.dispatchEvent(new Event('ea:install-state')); } catch (_) {} }

  function closeDialog() {
    const dialog = document.getElementById('appInstallDialog');
    if (dialog && dialog.open) dialog.close();
  }

  // Capture the actual browser install prompt; it must be invoked from a user gesture.
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    refreshButton();
    updateDialog();
    notifyChange();
  });

  window.addEventListener('appinstalled', function () {
    installed = true;
    deferredInstallPrompt = null;
    refreshButton();
    closeDialog();
    notifyChange();
    window.toast?.(`✅ ติดตั้งแอปแล้ว • เปิดจากไอคอน ${document.documentElement.classList.contains('ea-cashier-app') ? 'EA คิดเงิน' : 'EA Fair Sale'} บนหน้าจอหลักได้เลย`, 5000);
  });

  window.eaOpenInstallApp = openInstall;
  window.eaCanInstallApp = canInstall;

  document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('installAppBtn');
    const dialog = document.getElementById('appInstallDialog');
    const nativeButton = document.getElementById('installNativeBtn');
    const closeButton = document.getElementById('closeInstallAppBtn');
    if (!button || !dialog || !nativeButton || !closeButton) return;

    button.addEventListener('click', openInstall);

    nativeButton.addEventListener('click', async function () {
      if (!deferredInstallPrompt) return;
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null; // A prompt event may only be used once.
      nativeButton.disabled = true;
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (error) {
        console.warn('[PWA] Installation prompt failed:', error);
      } finally {
        nativeButton.disabled = false;
        updateDialog();
        refreshButton();
        closeDialog();
      }
    });

    closeButton.addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog();
    });
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', refreshButton);
    refreshButton();
  });
})();
