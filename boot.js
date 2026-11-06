const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './' + src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(src));
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
        console.error('Load Error:', error.message);
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#05070d;color:#eef2ff;text-align:center;padding:20px;direction:rtl;">
                <h2 style="color:#ff2d78;margin-bottom:20px;font-size:24px;">⛔️ خطای بارگذاری فایل</h2>
                <p style="font-size:16px;color:#fff;margin-bottom:15px;">فایل زیر در گیت‌هاب پیدا نشد:</p>
                <div style="background:#1e293b;padding:15px 25px;border-radius:10px;font-family:monospace;font-size:18px;color:#00e5ff;letter-spacing:1px;border:1px solid #334155;">
                    ${error.message}
                </div>
                <p style="font-size:14px;color:#94a3b8;margin-top:25px;max-width:400px;line-height:1.6;">
                    لطفاً مطمئن شوید این فایل دقیقاً با همین نام و در <b>همان پوشه‌ای که index.html قرار دارد</b> آپلود شده است.
                </p>
                <button onclick="location.reload()" style="margin-top:30px;padding:12px 30px;border-radius:12px;border:none;background:#00e5ff;color:#000;font-weight:bold;font-size:16px;cursor:pointer;">رفرش صفحه</button>
            </div>`;
    }
};

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
