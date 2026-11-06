const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`فایل پیدا نشد: ${src}`));
    document.head.appendChild(script);
});

const init = async () => {
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
                <p style="font-size:16px;color:#fff;background:#1e293b;padding:10px;border-radius:8px;font-family:monospace;" dir="ltr">${error.message}</p>
                <p style="font-size:14px;color:#6b7a99;margin-top:10px;">لطفاً مطمئن شوید این فایل در ریشه پروژه گیت‌هاب شما وجود دارد</p>
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
