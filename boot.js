const load = src => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src + '?t=' + Date.now();
    script.async = false;
    script.onload = resolve;
    script.onerror = () => {
        console.warn('[Boot] File not found:', src);
        resolve();
    };
    document.head.appendChild(script);
});

const init = async () => {
    try {
        await load('platform.js');
        await load('registry.js');
        
        const packs = ['pack-01', 'pack-02', 'pack-03', 'pack-04', 'pack-05', 'pack-06', 'pack-07'];
        for (const p of packs) {
            await load(`./games/${p}.js`);
        }
        
        await load('app.js');
        
        if (window.Nexus && typeof window.Nexus.init === 'function') {
            window.Nexus.init();
        }
    } catch (e) {
        console.error('[Boot] Critical Failure:', e);
        const errDiv = document.getElementById('error-display');
        if (errDiv) {
            errDiv.style.display = 'block';
            errDiv.textContent = `Boot Error: ${e.message}`;
        }
    } finally {
        const bootEl = document.getElementById('boot-screen');
        if (bootEl) {
            bootEl.classList.add('hidden');
            setTimeout(() => bootEl.remove(), 300);
        }
    }
};

document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init) 
    : init();
