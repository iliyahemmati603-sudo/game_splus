(function() {
  'use strict';
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(src));
    document.head.appendChild(s);
  });

  async function boot() {
    const tgP = new Promise(r => {
      if (window.Telegram) return r();
      const s = document.createElement('script');
      s.src = 'https://telegram.org/js/telegram-web-app.js';
      s.async = true;
      s.onload = r;
      s.onerror = r;
      document.head.appendChild(s);
      setTimeout(r, 1500);
    });

    const fbNeeded = window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL && window.FIREBASE_CONFIG.apiKey;
    const fbP = fbNeeded
      ? Promise.all([
          loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
          loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js')
        ]).catch(() => {})
      : Promise.resolve();

    try {
      await Promise.all([
        tgP, fbP,
        loadScript('platform.js'),
        loadScript('registry.js'),
        loadScript('app.js'),
        loadScript('games-bundle.js')
      ]);
    } catch (e) { console.error('Boot:', e); }

    const b = document.getElementById('boot');
    if (b) { b.classList.add('hidden'); setTimeout(() => b.remove(), 450); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
