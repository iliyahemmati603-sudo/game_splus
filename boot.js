(function() {
    'use strict';

    const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = resolve;
        s.onerror = () => {
            console.error("Failed to load script: " + src);
            resolve();
        };
        document.head.appendChild(s);
    });

    async function boot() {
        const tgPromise = new Promise((resolve) => {
            if (window.Telegram) return resolve();
            const s = document.createElement('script');
            s.src = 'https://telegram.org/js/telegram-web-app.js';
            s.async = true;
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
            setTimeout(resolve, 1500);
        });

        const fbNeeded = window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL && window.FIREBASE_CONFIG.apiKey;
        const fbPromise = fbNeeded
            ? Promise.all([
                loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
                loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js')
            ]).catch(() => {})
            : Promise.resolve();

        try {
            await Promise.all([tgPromise, fbPromise]);
            
            await loadScript('platform.js');
            await loadScript('registry.js');
            await loadScript('games-bundle.js');
            await loadScript('app.js');

            if (window.App && typeof window.App.init === 'function') {
                window.App.init();
            }

        } catch (e) {
            console.error('Boot sequence error:', e);
        }

        const bootScreen = document.getElementById('boot');
        if (bootScreen) {
            bootScreen.classList.add('hidden');
            setTimeout(() => {
                if (bootScreen.parentNode) {
                    bootScreen.parentNode.removeChild(bootScreen);
                }
            }, 450);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
