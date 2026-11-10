/**
 * EA Fair Sale - ตัวสแกนบาร์โค้ดด้วยกล้อง (ใช้ร่วมกัน: หน้าขายแท็บเล็ต / หน้าต่างสแกน / นับสต็อกมือถือ)
 *
 * ตัวอ่าน: ① ตัวอ่านในเครื่อง (BarcodeDetector – Android/Chrome) ② ZXing-C++ (WebAssembly ฝากในแอป assets/vendor)
 *          ③ ZXing JS เดิม (เปิด TRY_HARDER) เมื่อ ①② ใช้ไม่ได้
 * กล้อง:   Android เลือกกล้องหลังตัวหลัก (ไม่ใช้มุมกว้าง) • โฟกัสอัตโนมัติต่อเนื่อง • 1080p
 *
 * ใช้แทน ZXing แบบเดิม:  controls = await eaScanEngine.start(video, text => ..., { zoom: 1.5 })
 *                        controls.stop() • controls.switchTorch(true|false) • controls.track
 */
(function () {
  const BD_JS = 'assets/vendor/barcode-detector-3.0.8.js', BD_WASM = 'assets/vendor/zxing_reader-2.2.4.wasm';
  const FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'itf', 'qr_code'];
  const CAM_KEY = 'ea_phone_cam_id';        // ใช้คีย์เดียวกับหน้าสแกนคิดเงินมือถือ
  const isAndroid = /Android/i.test(navigator.userAgent);
  const HI = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } };

  let nativeDet = null, nativeTried = false, wasmDet = null, wasmFailed = false, wasmLoading = null;

  async function nativeDetector() {
    if (nativeTried) return nativeDet;
    nativeTried = true;
    if (!('BarcodeDetector' in window)) return null;
    try {
      const sup = await window.BarcodeDetector.getSupportedFormats();
      const want = FORMATS.filter(f => sup.includes(f));
      if (want.includes('code_128')) nativeDet = new window.BarcodeDetector({ formats: want });
    } catch (_) {}
    return nativeDet;
  }
  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  function wasmDetector() {
    if (wasmDet) return Promise.resolve(wasmDet);
    if (wasmFailed || typeof WebAssembly !== 'object') return Promise.resolve(null);
    if (wasmLoading) return wasmLoading;
    wasmLoading = (async () => {
      try {
        if (!window.BarcodeDetectionAPI) await loadScript(BD_JS);
        const API = window.BarcodeDetectionAPI;
        API.setZXingModuleOverrides({ locateFile: (path, prefix) => path.endsWith('.wasm') ? new URL(BD_WASM, location.href).href : prefix + path });
        const det = new API.BarcodeDetector({ formats: FORMATS });
        const c = document.createElement('canvas'); c.width = c.height = 8;
        await Promise.race([det.detect(c), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
        wasmDet = det; return det;
      } catch (e) { console.warn('[scan-engine] wasm detector', e); wasmFailed = true; return null; }
      finally { wasmLoading = null; }
    })();
    return wasmLoading;
  }

  async function backCams() {
    try {
      const all = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      const back = all.filter(d => !/front|user|selfie|หน้า/i.test(d.label));
      return back.length ? back : all;
    } catch (_) { return []; }
  }
  function bestCam(list) {
    const saved = lsGet(CAM_KEY, '');
    if (saved && list.some(d => d.deviceId === saved)) return saved;
    const main = list.find(d => /camera2 0\b|camera 0\b/i.test(d.label))
      || list.find(d => /back|rear|environment|หลัง/i.test(d.label) && !/wide|ultra|tele|depth|macro|infrared|\bir\b/i.test(d.label))
      || list[0];
    return main?.deviceId || '';
  }
  async function openStream() {
    let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, ...HI }, audio: false });
    if (isAndroid) {
      const want = bestCam(await backCams());
      const cur = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
      if (want && want !== cur) {
        try {
          const s2 = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: want }, ...HI }, audio: false });
          stream.getTracks().forEach(t => t.stop()); stream = s2;
        } catch (_) {}
      }
    }
    return stream;
  }
  async function tune(track, zoom) {
    if (!track?.getCapabilities) return;
    let caps = {}; try { caps = track.getCapabilities() || {}; } catch (_) {}
    const adv = {};
    if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
    if (zoom && caps.zoom && caps.zoom.max >= zoom) adv.zoom = Math.max(caps.zoom.min || 1, zoom);
    if (Object.keys(adv).length) { try { await track.applyConstraints({ advanced: [adv] }); } catch (_) {} }
  }

  // onText(text) ถูกเรียกเมื่ออ่านบาร์โค้ดได้ (ผู้เรียกกันอ่านซ้ำเอง)
  async function start(video, onText, opts = {}) {
    const stream = await openStream();
    let stopped = false, timer = null, zx = null;
    const track = stream.getVideoTracks()[0];
    video.setAttribute('playsinline', ''); video.muted = true;
    video.srcObject = stream;
    try { await video.play(); } catch (_) {}
    // ซูม: มือถือ Android ซูม 1.5 เท่า (ถือห่างได้) • แท็บเล็ตไม่ซูม เว้นแต่ผู้เรียกกำหนด
    const phone = Math.min(screen.width, screen.height) < 600;
    await tune(track, opts.zoom !== undefined ? opts.zoom : (isAndroid && phone ? 1.5 : 0));
    const controls = {
      track, engine: '',
      stop() {
        stopped = true; clearTimeout(timer);
        try { zx?.stop(); } catch (_) {}
        try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
        if (video.srcObject === stream) video.srcObject = null;
      },
      async switchTorch(on) { await track.applyConstraints({ advanced: [{ torch: !!on }] }); }
    };
    const det = (await nativeDetector()) || (await wasmDetector());
    if (stopped) return controls;
    if (det) {
      controls.engine = det === nativeDet ? 'native' : 'zxing-cpp';
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.videoWidth) {
          try {
            const k = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
            cv.width = Math.round(video.videoWidth * k); cv.height = Math.round(video.videoHeight * k);
            cx.drawImage(video, 0, 0, cv.width, cv.height);
            const r = await det.detect(cv);
            if (!stopped && r && r.length && r[0].rawValue) onText(String(r[0].rawValue));
          } catch (_) {}
        }
        if (!stopped) timer = setTimeout(tick, 100);
      };
      tick();
    } else if (window.ZXingBrowser) {
      controls.engine = 'zxing-js';
      let hints;
      try { const F = ZXingBrowser.BarcodeFormat; hints = new Map([[3, true], [2, [F.CODE_128, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_39, F.ITF, F.QR_CODE]]]); } catch (_) {}
      const reader = new ZXingBrowser.BrowserMultiFormatReader(hints);
      zx = await reader.decodeFromStream(stream, video, (res) => { if (res && !stopped) onText(res.getText()); });
    } else {
      controls.stop();
      throw new Error('โหลดตัวสแกนไม่สำเร็จ');
    }
    return controls;
  }
  // ใช้ได้ไหม (ไม่ต้องมี ZXing ก็สแกนได้ ถ้ามีตัวอ่านในเครื่อง/WebAssembly)
  const available = () => !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
  // โหลด WebAssembly ล่วงหน้าตอนว่าง (สแกนครั้งแรกเร็วขึ้น)
  setTimeout(() => { if (!('BarcodeDetector' in window)) wasmDetector(); }, 8000);

  window.eaScanEngine = { start, available, preload: wasmDetector };
})();
