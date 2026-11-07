'use strict';

const App = (() => {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const bind = k => $$(`[data-bind="${k}"]`);
    const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    const BAD_WORDS = ['کص', 'کس', 'ممه', 'کیر', 'کون', 'جنده', 'حروم', 'کسننت', 'ناموس', 'ننه', 'خر', 'ننت', 'مادرت', 'خار', 'ادمین', 'پشتیبانی', 'ساپورت', 'fuck', 'pussy', 'sex', 'porn', 'bitch'];
    
    const State = {
        activeScreen: 'home',
        category: 'all',
        lobbyGame: null,
        leaderboardFilter: 'global',
        activeGame: null,
        gameId: null,
        reqId: null,
        lastTime: 0,
        nameChanged: localStorage.getItem('nexus-name-changed') === 'true'
    };

    const RegistryMap = new Map();

    const Router = {
        navigate(id) {
            if (State.activeScreen === 'play' && id !== 'play') {
                this.cleanupGame();
            }
            $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
            $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
            State.activeScreen = id;
            
            if (id === 'leaderboard') Leaderboard.render();
            if (id === 'profile') Profile.render();
        },
        cleanupGame() {
            if (State.activeGame && State.activeGame.stop) State.activeGame.stop();
            if (State.reqId) cancelAnimationFrame(State.reqId);
            
            State.reqId = null;
            State.activeGame = null;
            State.lobbyGame = null;
            
            $('#game-canvas').classList.remove('active');
            $('#game-overlay').classList.remove('active');
            $('#game-controls').innerHTML = '';
            
            const ctx = $('#game-canvas').getContext('2d');
            ctx.clearRect(0, 0, $('#game-canvas').width, $('#game-canvas').height);
        }
    };

    const UI = {
        toast(msg) {
            const el = document.createElement('div');
            el.className = 'toast-msg';
            el.textContent = msg;
            $('#toast-container').appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2200);
        },
        theme() {
            const get = () => localStorage.getItem('nexus-theme') || 'dark';
            const set = v => { localStorage.setItem('nexus-theme', v); apply(); };
            const apply = () => {
                const t = get();
                document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
                bind('theme-icon').forEach(el => el.textContent = t === 'light' ? '☀' : '🌙');
            };
            const toggle = () => set(get() === 'light' ? 'dark' : 'light');
            return { apply, toggle };
        }
    };

    const Engine = {
        init() {
            $$('.screen').forEach(s => s.classList.remove('active'));
            $('#screen-home').classList.add('active');
            $('#app').classList.remove('app-hidden');
            const boot = $('#boot-screen');
            if (boot) { boot.classList.add('hidden'); setTimeout(() => boot.remove(), 400); }
        },
        startGame(id) {
            const meta = RegistryMap.get(id);
            const Ctor = window[`Game_${id}`];
            
            if (!meta || typeof Ctor !== 'function') {
                UI.toast('بازی بارگذاری نشد');
                return;
            }
            
            State.gameId = id;
            State.activeGame = new Ctor();
            
            bind('play-title').forEach(el => el.textContent = meta.fa);
            bind('hud')[0].innerHTML = '';
            
            $('#game-overlay').classList.remove('active');
            $('#game-overlay').innerHTML = '';
            
            Router.navigate('play');
            $('#game-canvas').classList.add('active');
            
            this.renderControls();
            
            setTimeout(() => {
                if (State.activeGame.resize) State.activeGame.resize();
                try {
                    if (typeof State.activeGame.startGame === 'function') State.activeGame.startGame();
                    else if (typeof State.activeGame.start === 'function') State.activeGame.start();
                } catch (e) {
                    console.error(e);
                    UI.toast('خطا در اجرای بازی');
                    Router.navigate('home');
                    return;
                }
                State.lastTime = performance.now();
                this.loop(State.lastTime);
                if (window.AudioEngine && window.AudioEngine.resume) window.AudioEngine.resume();
            }, 50);
        },
        loop(now) {
            if (!State.activeGame) return;
            const dt = Math.min(0.05, (now - State.lastTime) / 1000);
            State.lastTime = now;
            try {
                State.activeGame.update(dt);
                State.activeGame.render();
            } catch (e) {
                console.error(e);
                Router.navigate('home');
                return;
            }
            State.reqId = requestAnimationFrame(t => this.loop(t));
        },
        renderControls() {
            const box = $('#game-controls');
            box.innerHTML = '';
            
            if (!State.activeGame || typeof State.activeGame.getControls !== 'function') return;
            const ctrls = State.activeGame.getControls();
            if (!ctrls) return;

            if (ctrls.type === 'dpad') {
                const dpad = document.createElement('div');
                dpad.className = 'dpad-layout';
                const createBtn = (dir, label, cls) => {
                    const b = document.createElement('button');
                    b.className = `ctrl-btn ${cls}`;
                    b.innerHTML = label;
                    b.addEventListener('pointerdown', (e) => { e.preventDefault(); ctrls.actions[dir](); });
                    return b;
                };
                dpad.appendChild(createBtn('up', '▲', 'c-up'));
                dpad.appendChild(createBtn('left', '◀', 'c-left'));
                dpad.appendChild(createBtn('down', '▼', 'c-down'));
                dpad.appendChild(createBtn('right', '▶', 'c-right'));
                box.appendChild(dpad);
            } else if (ctrls.type === 'custom') {
                ctrls.buttons.forEach(c => {
                    const b = document.createElement('button');
                    b.className = 'ctrl-btn';
                    b.innerHTML = c.label;
                    b.addEventListener('pointerdown', (e) => { e.preventDefault(); c.action(); });
                    box.appendChild(b);
                });
            }
        }
    };

    const Storage = window.Storage;

    const Profile = {
        render() {
            const d = Storage.data;
            bind('avatar').forEach(el => el.textContent = d.name.charAt(0).toUpperCase());
            bind('name').forEach(el => el.textContent = d.name);
            bind('coins').forEach(el => el.textContent = d.coins);
            bind('games-count').forEach(el => el.textContent = d.gamesPlayed);
            bind('best').forEach(el => el.textContent = d.totalBest);
            
            const inp = $('#username-input');
            if (inp) inp.value = d.name;
            
            const rec = bind('profile-records')[0];
            if (rec) {
                const items = window.GAME_REGISTRY.filter(g => (d.best[g.id] || 0) > 0).map(g => 
                    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px"><span>${g.icon} ${g.fa}</span><b style="color:var(--accent)">${esc(d.best[g.id])}</b></div>`
                );
                rec.innerHTML = items.length ? items.join('') : '<p style="text-align:center;color:var(--text-muted);font-size:13px;">هنوز رکوردی ثبت نشده</p>';
            }
        },
        saveName() {
            const inp = $('#username-input');
            if (!inp) return;
            const clean = inp.value.trim().replace(/[<>&"']/g, '');
            if (clean.length < 3 || clean.length > 15) return UI.toast('نام باید ۳ تا ۱۵ کاراکتر باشد');
            if (BAD_WORDS.some(w => clean.toLowerCase().includes(w))) return UI.toast('این نام مجاز نیست');
            if (State.nameChanged) return UI.toast('شما قبلاً نام خود را تغییر داده‌اید');
            if (clean === Storage.data.name) return UI.toast('نام جدید یکسان است');
            
            Storage.data.name = clean;
            localStorage.setItem('nexus-name-changed', 'true');
            State.nameChanged = true;
            Storage.save();
            this.render();
            UI.toast('نام با موفقیت ذخیره شد');
        }
    };

    const Leaderboard = {
        async render() {
            const box = bind('lb-filters')[0];
            if (!box) return;
            const isGlobal = State.leaderboardFilter === 'global';
            box.innerHTML = `<button class="cat-chip ${isGlobal ? 'active' : ''}" data-lb="global">🌟 رتبه کل</button>` + 
                window.GAME_REGISTRY.map(g => `<button class="cat-chip ${g.id === State.leaderboardFilter ? 'active' : ''}" data-lb="${g.id}">${g.icon} ${g.fa}</button>`).join('');
            
            const listBox = bind('lb-list')[0];
            listBox.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">در حال دریافت...</div>';
            
            const list = isGlobal ? await Net.getGlobal() : await Net.get(State.leaderboardFilter);
            
            if (!list || !list.length) {
                listBox.innerHTML = '<div class="content-card center-text"><p style="font-size:40px;margin-bottom:10px;">👻</p><p style="color:var(--text-muted)">هنوز رکوردی ثبت نشده است</p></div>';
                return;
            }
            
            listBox.innerHTML = list.map((e, i) => {
                let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                let rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
                const val = isGlobal ? e.totalScore : e.score;
                return `<div class="lb-item">
                    <div class="lb-rank ${rankClass}">${medal}</div>
                    <div class="lb-name">${esc(e.name)}</div>
                    <div class="lb-score">${esc(val)}</div>
                </div>`;
            }).join('');
        }
    };

    const Home = {
        renderCategories() {
            const box = bind('categories')[0];
            if (!box) return;
            const counts = new Map();
            counts.set('all', window.GAME_REGISTRY.length);
            window.GAME_REGISTRY.forEach(g => counts.set(g.cat, (counts.get(g.cat) || 0) + 1));
            
            box.innerHTML = window.CATEGORIES.map(c => 
                `<button class="cat-chip ${c.id === State.category ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name} · ${counts.get(c.id) || 0}</button>`
            ).join('');
        },
        renderGames() {
            const box = bind('games')[0];
            if (!box) return;
            const list = State.category === 'all' ? window.GAME_REGISTRY : window.GAME_REGISTRY.filter(g => g.cat === State.category);
            
            bind('section-title').forEach(el => el.textContent = `همه بازی‌ها · ${list.length}`);
            
            box.innerHTML = list.map(g => {
                const best = Storage.data.best[g.id] || 0;
                return `<div class="game-card" data-game="${g.id}">
                    <div class="game-icon">${g.icon}</div>
                    <div class="game-info">
                        <div class="game-name">${g.fa}</div>
                        <div class="game-en">${g.en}</div>
                        <div class="game-desc">${g.desc}</div>
                        ${best ? `<div class="game-best">رکورد: ${esc(best)}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
        }
    };

    const Lobby = {
        open(id) {
            const meta = RegistryMap.get(id);
            if (!meta) return Router.navigate('home');
            
            State.lobbyGame = meta;
            bind('lobby-title').forEach(el => el.textContent = meta.fa);
            bind('lobby-icon').forEach(el => el.textContent = meta.icon);
            bind('lobby-name').forEach(el => el.textContent = meta.fa);
            bind('lobby-desc').forEach(el => el.textContent = meta.desc);
            bind('lobby-extra')[0].innerHTML = '';
            
            Router.navigate('lobby');
        },
        showAbout() {
            const m = State.lobbyGame;
            if (!m) return;
            bind('lobby-extra')[0].innerHTML = `<h4 class="card-title">نحوه بازی</h4><p style="font-size:14px;line-height:1.8;color:var(--text-muted)">${m.desc}. هدف شما شکستن رکورد قبلی (${esc(Storage.data.best[m.id] || 0)}) است.</p>`;
        },
        async showLeaderboard() {
            const m = State.lobbyGame;
            if (!m) return;
            const box = bind('lobby-extra')[0];
            box.innerHTML = '<h4 class="card-title">جدول امتیازات</h4><p style="color:var(--text-muted)">در حال دریافت...</p>';
            const list = await Net.get(m.id);
            if (!list || !list.length) {
                box.innerHTML += '<p style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:10px;">هنوز رکوردی ثبت نشده</p>';
                return;
            }
            box.innerHTML += list.slice(0, 5).map((e, i) => 
                `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px">
                    <span style="color:var(--text-muted)">${i + 1}. ${esc(e.name)}</span>
                    <b style="color:var(--accent)">${esc(e.score)}</b>
                </div>`
            ).join('');
        }
    };

    const Sync = {
        settings() {
            ['sound', 'haptics'].forEach(k => {
                $$(`[data-toggle="${k}"]`).forEach(el => el.classList.toggle('on', Storage.data.settings[k]));
            });
        }
    };

    const EventDelegation = e => {
        const nav = e.target.closest('[data-nav]');
        if (nav) { e.preventDefault(); return Router.navigate(nav.dataset.nav); }
        
        const act = e.target.closest('[data-action]');
        if (act) {
            e.preventDefault();
            const action = act.dataset.action;
            if (action === 'toggle-theme') UI.theme().toggle();
            else if (action === 'save-name') Profile.saveName();
            else if (action === 'reset') { if (confirm('آیا از حذف تمام داده‌ها مطمئن هستید؟')) { localStorage.removeItem(Storage.key); localStorage.removeItem('nexus-name-changed'); location.reload(); } }
            else if (action === 'play') Engine.startGame(State.lobbyGame.id);
            else if (action === 'about-game') Lobby.showAbout();
            else if (action === 'game-lb') Lobby.showLeaderboard();
            else if (action === 'quit') Router.navigate('home');
            return;
        }
        
        const cat = e.target.closest('[data-cat]');
        if (cat) { State.category = cat.dataset.cat; Home.renderCategories(); Home.renderGames(); return; }
        
        const lb = e.target.closest('[data-lb]');
        if (lb) { State.leaderboardFilter = lb.dataset.lb; Leaderboard.render(); return; }
        
        const game = e.target.closest('[data-game]');
        if (game) return Lobby.open(game.dataset.game);
        
        const toggle = e.target.closest('[data-toggle]');
        if (toggle) {
            const k = toggle.dataset.toggle;
            Storage.data.settings[k] = !Storage.data.settings[k];
            Storage.save();
            if (k === 'sound' && window.AudioEngine) window.AudioEngine.enabled = Storage.data.settings.sound;
            if (k === 'haptics' && window.Haptics) window.Haptics.enabled = Storage.data.settings.haptics;
            Sync.settings();
            return;
        }
    };

    const Init = () => {
        UI.theme().apply();
        Storage.load();
        if (window.Net) window.Net.init();
        
        window.GAME_REGISTRY.forEach(g => RegistryMap.set(g.id, g));
        
        Home.renderCategories();
        Home.renderGames();
        Profile.render();
        Sync.settings();
        
        document.addEventListener('click', EventDelegation);
        
        Engine.init();
    };

    window.App = {
        gameOver: (id, score, extras) => {
            if (State.activeGame && State.activeGame.stop) State.activeGame.stop();
            if (State.reqId) cancelAnimationFrame(State.reqId);
            State.reqId = null;
            
            const prev = Storage.data.best[id] || 0;
            const isNew = Storage.setBest(id, score);
            Storage.incGames();
            
            const reward = Math.floor(score / 15) + (extras?.coins || 0) * 2;
            if (reward) Storage.addCoins(reward);
            
            if (window.Net) window.Net.submit(id, score, Storage.data.name);
            
            const ov = $('#game-overlay');
            ov.innerHTML = `
                <h2 style="color:${isNew ? 'var(--success)' : 'var(--secondary)'}">${isNew ? '🎉 رکورد جدید!' : 'بازی تمام شد'}</h2>
                <div class="final-score">${esc(score)}</div>
                <div class="sub-text">رکورد قبلی: ${esc(prev)} · سکه: ${esc(reward)} 💎</div>
                <button class="btn primary" onclick="App.restart()">بازی مجدد</button>
                <button class="btn secondary" style="margin-top:10px;" onclick="App.quit()">بازگشت به خانه</button>
            `;
            ov.classList.add('active');
            
            if (window.AudioEngine) window.AudioEngine[isNew ? 'win' : 'lose']?.();
            if (window.Haptics) window.Haptics[isNew ? 'success' : 'heavy']?.();
            
            $('#game-controls').innerHTML = '';
            State.activeGame = null;
        },
        restart: () => {
            $('#game-overlay').classList.remove('active');
            Engine.startGame(State.gameId);
        },
        quit: () => {
            Router.navigate('home');
        }
    };

    document.addEventListener('DOMContentLoaded', Init);
    return { init: Init };
})();

window.Nexus = App;
