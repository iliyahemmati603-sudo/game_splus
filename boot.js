const load = src => new Promise((res, rej) => {
  console.log(`⏳ در حال لود فایل: ${src}`);
  const s = document.createElement('script');
  s.src = src;
  s.async = false;
  s.onload = () => {
      console.log(`✅ فایل لود شد: ${src}`);
      res();
  };
  s.onerror = () => {
      console.error(`❌ خطا در لود فایل (احتمالاً وجود ندارد): ${src}`);
      rej(new Error(`فایل پیدا نشد: ${src}`));
  };
  document.head.appendChild(s);
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
    window.Nexus?.init?.();
    console.log('🚀 تمام فایل‌ها با موفقیت بارگذاری و اجرا شدند.');
  } catch (e) {
    console.error('❌ خطای جدی در بارگذاری:', e);
    document.body.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif;background:#05070d;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column"><h2 style="color:#ff2d78">خطا در بارگذاری فایل‌ها</h2><p dir="ltr" style="font-family:monospace;color:#00e5ff;background:#1e293b;padding:10px 20px;border-radius:8px">${e.message}</p><p style="font-size:14px;color:#6b7a99;margin-top:10px">لطفاً پنل کنسول را باز کنید تا جزئیات را ببینید.</p></div>`;
    return;
  }
  
  const b = document.getElementById('boot');
  if (b) { b.classList.add('hide'); setTimeout(() => b.remove(), 320); }
};

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
