'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const bind = k => $$(`[data-bind="${k}"]`);
const BAD_WORDS = ['کص','کس','ممه','کیر','کون','جنده','حروم','کسننت','ناموس','ننه','خر','ننت','مادرت','خار','fuck','pussy','sex','porn','bitch'];
const REGISTRY_MAP = new Map();

const state = {
  tab: 'home',
  cat: 'all',
  lobby: null,
  lbFilter: 'global',
  game: null,
  gameId: null,
  raf: 0,
  last: 0,
  hasChangedName: localStorage.getItem('nexus-name-changed') === 'true'
};

const setScreen = id => {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
  $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.nav === id));
  state.tab = id;
};

const go = id => {
  if (state.tab === 'play' && id !== 'play') quit();
  setScreen(id);
  if (id === 'leaderboard') drawLeaderboard();
  if (id === 'profile') drawProfile();
};

const toast = msg => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('on'), 2200);
};

const theme = {
  get: () => localStorage.getItem('nexus-theme') || 'dark',
  set: v => { localStorage.setItem('nexus-theme', v); theme.apply(); },
  apply: () => {
    const t = theme.get();
    document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
    bind('theme-icon').forEach(el => el.textContent = t === 'light' ? '☀' : '☾');
  },
  toggle: () => theme.set(theme.get() === 'light' ? 'dark' : 'light')
};

const drawProfile = () => {
  const d = Storage.data;
  bind('avatar').forEach(el => el.textContent = d.name.charAt(0).toUpperCase());
  bind('name').forEach(el => el.textContent = d.name);
  bind('coins').forEach(el => el.textContent = d.coins);
  bind('games-count').forEach(el => el.textContent = d.gamesPlayed);
  bind('best').forEach(el => el.textContent = d.totalBest);
  const field = $('#username-field');
  if (field) field.value = d.name;
  
  const records = bind('profile-records')[0];
  if (records) {
    const items = window.GAME_REGISTRY
      .filter(g => (d.best[g.id] || 0) > 0)
      .map(g => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px"><span>${g.icon} ${g.fa}</span><b style="color:var(--gold)">${d.best[g.id]}</b></div>`);
    records.innerHTML = items.length ? items.join('') : '<p style="text-align:center;font-size:12px">هنوز رکوردی ثبت نشده</p>';
  }
};

const saveName = () => {
  const input = $('#username-field');
  const raw = input.value.trim();
  const clean = raw.replace(/[<>&"']/g, '');

  if (clean.length < 3 || clean.length > 15) return toast('نام باید ۳ تا ۱۵ کاراکتر باشد');
  if (BAD_WORDS.some(w => clean.toLowerCase().includes(w))) return toast('این نام مجاز نیست');
  if (state.hasChangedName) return toast('شما قبلاً نام خود را تغییر داده‌اید');
  if (clean === Storage.data.name) return toast('نام جدید با نام فعلی یکسان است');

  Storage.data.name = clean;
  localStorage.setItem('nexus-name-changed', 'true');
  state.hasChangedName = true;
  Storage.save();
  drawProfile();
  toast('نام با موفقیت ذخیره شد ✅');
};

const drawCategories = () => {
  const box = bind('categories')[0];
  const counts = new Map();
  counts.set('all', window.GAME_REGISTRY.length);
  window.GAME_REGISTRY.forEach(g => counts.set(g.cat, (counts.get(g.cat) || 0) + 1));
  box.innerHTML = window.CATEGORIES.map(c =>
    `<button class="cat ${c.id === state.cat ? 'on' : ''}" data-cat="${c.id}">${c.icon} ${c.name} · ${counts.get(c.id) || 0}</button>`
  ).join('');
};

const drawGames = () => {
  const box = bind('games')[0];
  const list = state.cat === 'all' ? window.GAME_REGISTRY : window.GAME_REGISTRY.filter(g => g.cat === state.cat);
  bind('section-title').forEach(el => el.textContent = `همه بازی‌ها · ${list.length}`);
  box.innerHTML = list.map(g => {
    const best = Storage.data.best[g.id] || 0;
    return `<div class="item" data-game="${g.id}">
      <span class="item-icon">${g.icon}</span>
      <div class="item-body">
        <div class="item-name">${g.fa}</div>
        <div class="item-en">${g.en}</div>
        <div class="item-desc">${g.desc}</div>
        ${best ? `<span class="item-best">رکورد شما: ${best}</span>` : ''}
      </div>
    </div>`;
  }).join('');
};

const drawLobby = id => {
  const meta = REGISTRY_MAP.get(id);
  if (!meta) return go('home');
  state.lobby = meta;
  bind('lobby-title').forEach(el => el.textContent = meta.fa);
  bind('lobby-icon').forEach(el => el.textContent = meta.icon);
  bind('lobby-name').forEach(el => el.textContent = meta.fa);
  bind('lobby-desc').forEach(el => el.textContent = meta.desc);
  bind('lobby-extra')[0].innerHTML = '';
  go('lobby');
};

const lobbyAbout = () => {
  const meta = state.lobby;
  if (!meta) return;
  bind('lobby-extra')[0].innerHTML = `<h4>📖 نحوه بازی</h4><p>${meta.desc}. با ضربه، کیبورد یا دکمه‌ها بازی را کنترل کنید. هدف شکستن رکورد شما (${Storage.data.best[meta.id] || 0}) است.</p>`;
};

const lobbyLeaderboard = async () => {
  const meta = state.lobby;
  if (!meta) return;
  const box = bind('lobby-extra')[0];
  box.innerHTML = '<h4>🏆 جدول امتیازات</h4><p>در حال دریافت...</p>';
  const list = await Net.get(meta.id);
  if (!list.length) return box.innerHTML += '<p style="text-align:center; margin-top:10px;">هنوز رکوردی ثبت نشده است.</p>';
  box.innerHTML += list.slice(0, 5).map((e, i) =>
    `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px">
       <span style="color:var(--muted)">${i + 1}. ${e.name}</span>
       <b style="color:var(--accent)">${e.score}</b>
     </div>`
  ).join('');
};

const playGame = () => {
  const meta = state.lobby;
  if (!meta) return;
  const Ctor = window['Game_' + meta.id];
  if (typeof Ctor !== 'function') return toast('بازی بارگذاری نشد');
  state.gameId = meta.id;
  state.game = new Ctor();
  bind('play-title').forEach(el => el.textContent = meta.fa);
  bind('hud')[0].innerHTML = '';
  $('#game-overlay').classList.remove('on');
  bind('dpad')[0].hidden = meta.id !== 'snake';
  setScreen('play');
  $('#game-canvas').classList.add('on');
  try { state.game.start(); } catch (e) { console.error(e); return quit(); }
  state.last = performance.now();
  loop(state.last);
  AudioEngine.resume?.();
};

const loop = now => {
  if (!state.game) return;
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  try { state.game.update(dt); state.game.render(); }
  catch (e) { console.error(e); return quit(); }
  state.raf = requestAnimationFrame(loop);
};

const quit = () => {
  try { state.game?.stop?.(); } catch {}
  cancelAnimationFrame(state.raf);
  state.raf = 0;
  state.game = null;
  $('#game-canvas').classList.remove('on');
  $('#game-overlay').classList.remove('on');
  bind('dpad')[0].hidden = true;
  const ctx = $('#game-canvas').getContext('2d');
  ctx.clearRect(0, 0, $('#game-canvas').width, $('#game-canvas').height);
  state.lobby = null;
  go('home');
};

const drawLeaderboard = async () => {
  const isGlobal = state.lbFilter === 'global';
  
  const filtersHTML = `<button class="cat ${isGlobal ? 'on' : ''}" data-lb="global">🌟 رتبه کل</button>` + 
    window.GAME_REGISTRY.map(g =>
      `<button class="cat ${g.id === state.lbFilter ? 'on' : ''}" data-lb="${g.id}">${g.icon} ${g.fa}</button>`
    ).join('');
    
  bind('lb-filters')[0].innerHTML = filtersHTML;

  const box = bind('lb-list')[0];
  box.innerHTML = '<div style="text-align:center; padding:30px; color:var(--muted);">⏳ در حال دریافت اطلاعات...</div>';
  
  let list = [];
  if (isGlobal) list = await Net.getGlobal();
  else list = await Net.get(state.lbFilter);

  if (!list.length) {
    box.innerHTML = '<div class="card center"><p style="font-size:32px; margin-bottom:10px;">👻</p><p>هنوز رکوردی در دیتابیس ثبت نشده است.</p></div>';
    return;
  }
  
  box.innerHTML = list.map((e, i) => {
    let medal = '';
    if (i === 0) medal = '🥇 ';
    else if (i === 1) medal = '🥈 ';
    else if (i === 2) medal = '🥉 ';
    else medal = `<span style="display:inline-block; width:24px; text-align:center; color:var(--muted); font-size:12px;">${i+1}</span> `;

    const scoreVal = isGlobal ? e.totalScore : e.score;
    return `<div class="item">
      <div class="item-body" style="flex-direction:row; align-items:center; gap:10px;">
        <div style="font-size:18px;">${medal}</div>
        <div class="item-name" style="margin:0; font-size:15px;">${e.name}</div>
      </div>
      <b style="color:var(--accent); font-size:16px;">${scoreVal}</b>
    </div>`;
  }).join('');
};

const handleAction = action => {
  const map = {
    'toggle-theme': theme.toggle,
    'save-name': saveName,
    'reset': () => { if (confirm('آیا از حذف تمام داده‌ها مطمئن هستید؟')) { localStorage.removeItem(Storage.key); localStorage.removeItem('nexus-name-changed'); location.reload(); } },
    'play': playGame,
    'about-game': lobbyAbout,
    'game-lb': lobbyLeaderboard,
    'quit': quit
  };
  map[action]?.();
};

const delegate = e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); return go(nav.dataset.nav); }
  const action = e.target.closest('[data-action]');
  if (action) { e.preventDefault(); return handleAction(action.dataset.action); }
  const cat = e.target.closest('[data-cat]');
  if (cat) { state.cat = cat.dataset.cat; drawCategories(); drawGames(); return; }
  const lb = e.target.closest('[data-lb]');
  if (lb) { state.lbFilter = lb.dataset.lb; return drawLeaderboard(); }
  const game = e.target.closest('[data-game]');
  if (game) return drawLobby(game.dataset.game);
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const k = toggle.dataset.toggle;
    Storage.data.settings[k] = !Storage.data.settings[k];
    Storage.save();
    if (k === 'sound') AudioEngine.enabled = Storage.data.settings.sound;
    if (k === 'haptics') Haptics.enabled = Storage.data.settings.haptics;
    syncSettings();
    return;
  }
  const dir = e.target.closest('[data-dir]');
  if (dir && state.gameId === 'snake') state.game?.setDirection?.(dir.dataset.dir);
};

const syncSettings = () => {
  ['sound', 'haptics'].forEach(k => {
    $$(`[data-toggle="${k}"]`).forEach(el => el.classList.toggle('on', Storage.data.settings[k]));
  });
};

const init = () => {
  theme.apply();
  Storage.load();
  Net.init();
  
  window.GAME_REGISTRY.forEach(g => REGISTRY_MAP.set(g.id, g));
  drawProfile();
  drawCategories();
  drawGames();
  syncSettings();
  document.addEventListener('click', delegate);
  AudioEngine.resume?.();
  go('home');
};

window.App = {
  gameOver: (id, score, extras) => {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    const prev = Storage.data.best[id] || 0;
    const isNew = Storage.setBest(id, score);
    Storage.incGames();
    const reward = Math.floor(score / 15) + (extras?.coins || 0) * 2;
    if (reward) Storage.addCoins(reward);
    
    Net.submit(id, score, Storage.data.name);
    
    const ov = $('#game-overlay');
    ov.innerHTML = `
      <h2 style="color:${isNew ? 'var(--ok)' : 'var(--accent-2)'}">${isNew ? '🎉 رکورد جدید!' : 'بازی تمام شد'}</h2>
      <div class="score">${score}</div>
      <div class="sub">رکورد قبلی: ${prev} · سکه: ${reward} 💎</div>
      <button class="btn primary" onclick="App.restart()">بازی مجدد</button>
      <button class="btn" onclick="App.quit()">بازگشت به خانه</button>`;
    ov.classList.add('on');
    AudioEngine[isNew ? 'win' : 'lose']?.();
    Haptics[isNew ? 'success' : 'heavy']?.();
    state.game = null;
  },
  restart: () => { $('#game-overlay').classList.remove('on'); playGame(); },
  quit,
  setDirection: d => state.game?.setDirection?.(d)
};

window.Nexus = { init };
})();
