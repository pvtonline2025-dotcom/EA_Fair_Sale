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
    const message = isAppleTouch()
      ? 'บน iPad หรือ iPhone: เปิดเว็บไซต์นี้ด้วย Safari แล้วแตะปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น) → “เพิ่มไปยังหน้าจอโฮม” → “เพิ่ม”'
      : /Android/i.test(navigator.userAgent)
        ? 'บนแท็บเล็ต Android: เปิดเว็บไซต์ด้วย Chrome แล้วแตะเมนู ⋮ → “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก” และยืนยัน'
        : 'เปิดเมนูของเบราว์เซอร์ แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก” (หากเบราว์เซอร์รองรับ)';
    steps.textContent = message;

    const hint = document.getElementById('installAppHint');
    if (hint) {
      hint.textContent = !window.isSecureContext
        ? 'ต้องเปิดจากเว็บไซต์ HTTPS จึงจะติดตั้งเป็นแอปได้'
        : deferredInstallPrompt
          ? 'เบราว์เซอร์รองรับการติดตั้งโดยตรง กด “ติดตั้งทันที” ได้เลย'
          : 'เมื่อติดตั้งแล้ว จะมีไอคอน EA Fair Sale บนหน้าจอหลัก เปิดได้โดยไม่ต้องพิมพ์ URL';
    }
  }

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
  });

  window.addEventListener('appinstalled', function () {
    installed = true;
    deferredInstallPrompt = null;
    refreshButton();
    closeDialog();
  });

  document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('installAppBtn');
    const dialog = document.getElementById('appInstallDialog');
    const nativeButton = document.getElementById('installNativeBtn');
    const closeButton = document.getElementById('closeInstallAppBtn');
    if (!button || !dialog || !nativeButton || !closeButton) return;

    button.addEventListener('click', function () {
      if (isStandalone() || installed) return;
      updateDialog();
      if (!dialog.open) dialog.showModal();
    });

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
