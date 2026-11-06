const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
});

const init = async () => {
    const isMiniApp = Boolean(window.Telegram?.WebApp || window.Soroush?.WebApp);

    if (isMiniApp) {
        try {
            await load('https://telegram.org/js/telegram-web-app.js');
        } catch (e) {
            console.warn('Mini app SDK not loaded, falling back to web mode.', e);
        }
    }

    try {
        await load('platform.js');
        await load('registry.js');
        await load('games-bundle.js');
        await load('app.js');

        if (typeof window.Nexus?.init === 'function') {
            window.Nexus.init();
        }
    } catch (error) {
        console.error('[Nexus Boot] Critical failure:', error);
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#05070d;color:#eef2ff;text-align:center;padding:20px;">
                <h2 style="color:#ff2d78;margin-bottom:10px;">خطا در بارگذاری</h2>
                <p style="font-size:14px;color:#6b7a99;">اتصال خود را بررسی کنید و صفحه را رفرش نمایید.</p>
                <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:none;background:#00e5ff;color:#000;font-weight:bold;cursor:pointer;">تلاش مجدد</button>
            </div>`;
        return;
    }

    const bootScreen = document.getElementById('boot');
    if (bootScreen) {
        bootScreen.classList.add('hide');
        setTimeout(() => bootScreen.remove(), 320);
    }
};

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
