(function() {
  'use strict';

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error('failed: ' + src));
    document.head.appendChild(s);
  });

  async function boot() {
    const t0 = performance.now();

    const telegramPromise = new Promise((resolve) => {
      if (window.Telegram) return resolve();
      const s = document.createElement('script');
      s.src = 'https://telegram.org/js/telegram-web-app.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
      setTimeout(resolve, 1500);
    });

    const firebaseNeeded = window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL && window.FIREBASE_CONFIG.apiKey;

    const firebasePromise = firebaseNeeded
      ? Promise.all([
          loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
          loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js')
        ]).catch((e) => { console.warn('Firebase failed:', e); })
      : Promise.resolve();

    try {
      await Promise.all([
        telegramPromise,
        firebasePromise,
        loadScript('platform.js'),
        loadScript('registry.js'),
        loadScript('app.js')
      ]);
    } catch (e) {
      console.error('Boot error:', e);
    }

    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) {
      bootScreen.classList.add('hidden');
      setTimeout(() => {
        if (bootScreen.parentNode) bootScreen.parentNode.removeChild(bootScreen);
      }, 450);
    }

    console.log('[Boot] Ready in ' + Math.round(performance.now() - t0) + 'ms');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
