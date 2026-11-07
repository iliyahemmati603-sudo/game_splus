'use strict';

window.onerror = function(msg, url, line, col, error) {
    if (msg.includes('Script error')) return;
    console.error(`[Global Error] ${msg} at ${url}:${line}`);
    return false;
};

const App = (() => {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const bind = k => $$(`[data-bind="${k}"]`);
    const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    const BAD_WORDS = ['کص', 'کس', 'کیر', 'کون', 'جنده', 'حروم', 'fuck', 'shit', 'sex', 'porn'];
    
    const State = {
        screen: 'home',
        cat: 'all',
        lobby: null,
        game: null,
        gameId: null,
        reqId: null,
        lastTime: 0
    };

    const RegistryMap = new Map();

    const Router = {
        go(id) {
            if (State.screen === 'play' && id !== 'play') {
                this.cleanup();
            }
            $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
            $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
            State.screen = id;
        },
        cleanup() {
            if (State.game && State.game.stop) {
                try { State.game.stop(); } catch (e) {}
            }
            if (State.reqId) cancelAnimationFrame(State.reqId);
            
            State.reqId = null;
            State.game = null;
            
            $('#game-canvas').classList.remove('active');
            $('#game-overlay').classList.remove('active');
            $('#game-controls').innerHTML = '';
            
            const ctx = $('#game-canvas').getContext('2d');
            if (ctx) ctx.clearRect(0, 0, $('#game-canvas').width, $('#game-canvas').height);
        }
    };

    const Toast = {
        show(msg) {
            const el = document.createElement('div');
            el.className = 'toast-msg';
            el.textContent = msg;
            $('#toast-container').appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
        }
    };

    const Home = {
        render() {
            const catBox = bind('categories')[0];
            if (catBox) {
                catBox.innerHTML = window.CATEGORIES.map(c => 
                    `<button class="cat-chip ${c.id === State.cat ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`
                ).join('');
            }

            const grid = bind('games')[0];
            if (!grid) return;
            
            const list = State.cat === 'all' ? window.GAME_REGISTRY : window.GAME_REGISTRY.filter(g => g.cat === State.cat);
            bind('section-title').forEach(el => el.textContent = `همه بازی‌ها · ${list.length}`);
            
            grid.innerHTML = list.map(g => {
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
            if (!meta) return Router.go('home');
            
            State.lobby = meta;
            bind('lobby-title').forEach(el => el.textContent = meta.fa);
            bind('lobby-icon').forEach(el => el.textContent = meta.icon);
            bind('lobby-name').forEach(el => el.textContent = meta.fa);
            bind('lobby-desc').forEach(el => el.textContent = meta.desc);
            
            Router.go('lobby');
        }
    };

    const Engine = {
        start(id) {
            const Ctor = window[`Game_${id}`];
            if (typeof Ctor !== 'function') {
                Toast.show('فایل بازی پیدا نشد یا ناقص است.');
                return;
            }
            
            State.gameId = id;
            State.game = new Ctor();
            const meta = RegistryMap.get(id);
            
            bind('play-title').forEach(el => el.textContent = meta.fa);
            bind('hud')[0].innerHTML = '';
            
            $('#game-overlay').classList.remove('active');
            $('#game-overlay').innerHTML = '';
            
            Router.go('play');
            $('#game-canvas').classList.add('active');
            
            this.renderControls();
            
            setTimeout(() => {
                if (State.game.resize) State.game.resize();
                
                try {
                    if (typeof State.game.startGame === 'function') State.game.startGame();
                    else if (typeof State.game.start === 'function') State.game.start();
                } catch (e) {
                    console.error(e);
                    Toast.show('خطا در شروع بازی');
                    Router.go('home');
                    return;
                }
                
                State.lastTime = performance.now();
                this.loop(State.lastTime);
                if (window.AudioEngine && window.AudioEngine.resume) window.AudioEngine.resume();
            }, 50);
        },
        
        loop(now) {
            if (!State.game) return;
            const dt = Math.min(0.05, (now - State.lastTime) / 1000);
            State.lastTime = now;
            
            try {
                State.game.update(dt);
                State.game.render();
            } catch (e) {
                console.error(e);
                Router.go('home');
                return;
            }
            State.reqId = requestAnimationFrame(t => this.loop(t));
        },
        
        renderControls() {
            const box = $('#game-controls');
            box.innerHTML = '';
            
            if (!State.game || typeof State.game.getControls !== 'function') return;
            const ctrls = State.game.getControls();
            if (!ctrls) return;

            if (ctrls.type === 'dpad') {
                const dpad = document.createElement('div');
                dpad.className = 'dpad-layout';
                const btn = (dir, txt, cls) => {
                    const b = document.createElement('button');
                    b.className = `ctrl-btn ${cls}`;
                    b.innerHTML = txt;
                    b.addEventListener('pointerdown', (e) => { e.preventDefault(); ctrls.actions[dir](); });
                    return b;
                };
                dpad.appendChild(btn('up', '▲', 'c-up'));
                dpad.appendChild(btn('left', '◀', 'c-left'));
                dpad.appendChild(btn('down', '▼', 'c-down'));
                dpad.appendChild(btn('right', '▶', 'c-right'));
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

    const System = {
        async forceUpdate() {
            Toast.show('در حال پاکسازی حافظه و بروزرسانی...');
            try {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let reg of regs) await reg.unregister();
                }
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (e) {
                console.warn('Cache clear error:', e);
            }
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('t', Date.now().toString());
                window.location.href = url.toString();
            }, 800);
        }
    };

    const EventDelegation = e => {
        const nav = e.target.closest('[data-nav]');
        if (nav) { e.preventDefault(); return Router.go(nav.dataset.nav); }
        
        const act = e.target.closest('[data-action]');
        if (act) {
            e.preventDefault();
            const a = act.dataset.action;
            if (a === 'play') Engine.start(State.lobby.id);
            if (a === 'quit') Router.go('home');
            if (a === 'force-update') System.forceUpdate();
            return;
        }
        
        const cat = e.target.closest('[data-cat]');
        if (cat) { 
            State.cat = cat.dataset.cat; 
            Home.render(); 
            return; 
        }
        
        const game = e.target.closest('[data-game]');
        if (game) return Lobby.open(game.dataset.game);
    };

    const Init = () => {
        if (window.Storage && window.Storage.load) window.Storage.load();
        if (window.Net && window.Net.init) window.Net.init();
        
        window.GAME_REGISTRY.forEach(g => RegistryMap.set(g.id, g));
        
        Home.render();
        
        $('#app').classList.remove('app-hidden');
        document.addEventListener('click', EventDelegation);
    };

    window.App = {
        gameOver: (id, score, extras) => {
            if (State.game && State.game.stop) State.game.stop();
            if (State.reqId) cancelAnimationFrame(State.reqId);
            State.reqId = null;
            
            const isNew = Storage.setBest(id, score);
            Storage.incGames();
            const reward = Math.floor(score / 15) + (extras?.coins || 0) * 2;
            if (reward) Storage.addCoins(reward);
            
            if (window.Net) window.Net.submit(id, score, Storage.data.name);
            
            const ov = $('#game-overlay');
            if (ov) {
                ov.innerHTML = `
                    <h2 style="color:${isNew ? 'var(--success)' : 'var(--secondary)'}">${isNew ? '🎉 رکورد جدید!' : 'بازی تمام شد'}</h2>
                    <div class="final-score">${esc(score)}</div>
                    <div class="sub-text">سکه: ${esc(reward)} 💎</div>
                    <button class="btn primary" onclick="App.restart()">بازی مجدد</button>
                    <button class="btn secondary" style="margin-top:10px;" onclick="App.quit()">بازگشت</button>
                `;
                ov.classList.add('active');
            }
            
            if (window.AudioEngine) window.AudioEngine[isNew ? 'win' : 'lose']?.();
            if (window.Haptics) Haptics[isNew ? 'success' : 'heavy']?.();
            
            $('#game-controls').innerHTML = '';
            State.game = null;
        },
        restart: () => {
            $('#game-overlay').classList.remove('active');
            Engine.start(State.gameId);
        },
        quit: () => {
            Router.go('home');
        }
    };

    return { init: Init };
})();

window.Nexus = App;
