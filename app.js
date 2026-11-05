'use strict';

const App = {
    currentGame: null,
    currentGameId: null,
    rafId: null,
    lastTime: 0,
    currentCat: 'all',
    lbFilter: 'runner',

    init() {
        try {
            Storage.load();
            Net.init();
            this.bindTelegram();
            this.bindNavigation(); 
            this.bindHashChange();
            this.loadHomeUI();
            
            if (!location.hash || location.hash === '#') {
                location.hash = 'home';
            } else {
                this.handleHash();
            }
            
            AudioEngine.resume();
        } catch (e) {
            console.error("Critical Init Error:", e);
        }
    },

    bindTelegram() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready();
                tg.expand();
                if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                    Storage.data.name = tg.initDataUnsafe.user.first_name || 'بازیکن';
                    Storage.data.uid = 'tg_' + tg.initDataUnsafe.user.id;
                    Storage.save();
                }
                if (tg.setBackgroundColor) tg.setBackgroundColor('#05070d');
                if (tg.setHeaderColor) tg.setHeaderColor('#05070d');
            }
        } catch (e) {}
        
        const nameEl = document.getElementById('home-name');
        const avatarEl = document.getElementById('home-avatar');
        if (nameEl) nameEl.textContent = Storage.data.name;
        if (avatarEl) avatarEl.textContent = Storage.data.name.charAt(0).toUpperCase();
    },

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.dataset.screen;
                if (target) {
                    location.hash = target;
                    AudioEngine.click();
                }
            });
        });
    },

    bindHashChange() {
        window.addEventListener('hashchange', () => this.handleHash());
    },

    handleHash() {
        const hash = location.hash.slice(1) || 'home';
        
        if (hash.startsWith('play/')) {
            const gameId = hash.slice(5);
            this.startGame(gameId);
        } else {
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.screen === hash);
            });
            this.go(hash);
        }
    },

    go(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('screen-' + screenId);
        if (target) target.classList.add('active');

        if (screenId === 'leaderboard') this.renderLeaderboard();
        if (screenId === 'profile') this.updateProfileUI();
        if (screenId === 'settings') this.updateSettingsUI();
    },

    loadHomeUI() {
        if (!window.CATEGORIES || !window.GAME_REGISTRY) {
            console.error("Registry data missing!");
            return;
        }
        this.renderCategories();
        this.renderGames();
        this.updateProfileUI();
        this.updateSettingsUI();
    },

    renderCategories() {
        const scroll = document.getElementById('category-scroll');
        if (!scroll) return;

        scroll.innerHTML = window.CATEGORIES.map(c => {
            const count = c.id === 'all' 
                ? window.GAME_REGISTRY.length 
                : window.GAME_REGISTRY.filter(g => g.cat === c.id).length;
            const active = c.id === this.currentCat ? 'active' : '';
            return `<button class="cat-chip ${active}" data-cat="${c.id}">
                ${c.icon} ${c.name} <span class="cat-count">${count}</span>
            </button>`;
        }).join('');

        scroll.querySelectorAll('.cat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.currentCat = chip.dataset.cat;
                this.renderCategories();
                this.renderGames();
                AudioEngine.click();
            });
        });
    },

    renderGames() {
        const grid = document.getElementById('game-grid');
        if (!grid || !window.GAME_REGISTRY) return;

        const filtered = this.currentCat === 'all' 
            ? window.GAME_REGISTRY 
            : window.GAME_REGISTRY.filter(g => g.cat === this.currentCat);
            
        const catName = window.CATEGORIES.find(c => c.id === this.currentCat)?.name || 'همه';
        const titleEl = document.getElementById('section-title');
        if (titleEl) titleEl.textContent = `${catName} — ${filtered.length} بازی`;

        grid.innerHTML = filtered.map(g => {
            const best = Storage.data.best[g.id] || 0;
            return `<div class="game-tile" data-game="${g.id}">
                <span class="g-icon">${g.icon}</span>
                <div class="g-name">${g.name}</div>
                <div class="g-desc">${g.desc}</div>
                <div class="g-best">رکورد: ${best}</div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                AudioEngine.click();
                location.hash = 'play/' + tile.dataset.game;
            });
        });
    },

    startGame(id) {
        const meta = window.GAME_REGISTRY.find(g => g.id === id);
        const GameClass = window['Game_' + id];
        
        if (!meta || !GameClass) {
            this.toast('بازی در دسترس نیست');
            location.hash = 'home';
            return;
        }

        this.currentGameId = id;
        this.currentGame = new GameClass();
        
        document.getElementById('game-title').textContent = meta.name;
        document.getElementById('game-hud').innerHTML = '';
        document.getElementById('game-overlay').classList.remove('show');
        document.getElementById('game-overlay').innerHTML = '';
        
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-game').classList.add('active');
        document.getElementById('game-canvas').classList.add('active');
        
        this.currentGame.start();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
        AudioEngine.resume();
    },

    gameLoop(now) {
        if (!this.currentGame) return;
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        try {
            this.currentGame.update(dt);
            this.currentGame.render();
        } catch (e) {
            console.error("Game Loop Error:", e);
            this.quitGame();
            return;
        }
        this.rafId = requestAnimationFrame(t => this.gameLoop(t));
    },

    quitGame() {
        if (this.currentGame && this.currentGame.stop) {
            this.currentGame.stop();
        }
        if (this.rafId) cancelAnimationFrame(this.rafId);
        
        this.rafId = null;
        this.currentGame = null;
        
        document.getElementById('game-canvas').classList.remove('active');
        const ctx = document.getElementById('game-canvas').getContext('2d');
        if (ctx) ctx.clearRect(0, 0, document.getElementById('game-canvas').width, document.getElementById('game-canvas').height);
        
        document.getElementById('game-overlay').classList.remove('show');
        location.hash = 'home';
    },

    gameOver(gameId, score, extras) {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        
        const prevBest = Storage.data.best[gameId] || 0;
        const isNewBest = Storage.setBest(gameId, score);
        
        Storage.incGames();
        const reward = Math.floor(score / 15) + (extras?.coins || 0) * 2;
        if (reward > 0) Storage.addCoins(reward);
        
        Net.submit(gameId, score, Storage.data.name);
        
        const ov = document.getElementById('game-overlay');
        ov.innerHTML = `
            <h2 class="${isNewBest ? 'win' : 'lose'}">${isNewBest ? 'رکورد جدید!' : 'بازی تمام شد'}</h2>
            ${isNewBest ? '<div class="new-best">🎉 بهترین رکورد تو</div>' : ''}
            <div class="final">${score}</div>
            <div class="sub">رکورد قبلی: ${prevBest}</div>
            <div class="sub">سکه: ${reward} 💎</div>
            <button class="btn btn-primary" onclick="App.restartGame()">بازی مجدد</button>
            <button class="btn btn-secondary" onclick="App.quitGame()">بازگشت به خانه</button>
        `;
        ov.classList.add('show');
        
        AudioEngine[isNewBest ? 'win' : 'lose']();
        Haptics[isNewBest ? 'success' : 'heavy']();
        this.currentGame = null;
    },

    restartGame() {
        const id = this.currentGameId;
        document.getElementById('game-overlay').classList.remove('show');
        this.startGame(id);
    },

    updateProfileUI() {
        const coinsEl = document.getElementById('home-coins');
        const profCoinsEl = document.getElementById('prof-coins');
        const profAvatar = document.getElementById('prof-avatar');
        const profName = document.getElementById('prof-name');
        const profGames = document.getElementById('prof-games');
        const profBest = document.getElementById('prof-best');
        const list = document.getElementById('profile-games-list');

        if (coinsEl) coinsEl.textContent = Storage.data.coins;
        if (profCoinsEl) profCoinsEl.textContent = Storage.data.coins;
        if (profAvatar) profAvatar.textContent = Storage.data.name.charAt(0).toUpperCase();
        if (profName) profName.textContent = Storage.data.name;
        if (profGames) profGames.textContent = Storage.data.gamesPlayed;
        if (profBest) profBest.textContent = Storage.data.totalBest;

        if (list && window.GAME_REGISTRY) {
            list.innerHTML = window.GAME_REGISTRY.map(g => {
                const b = Storage.data.best[g.id] || 0;
                return `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">
                    <span>${g.icon} ${g.name}</span><b style="color:var(--gold)">${b}</b>
                </div>`;
            }).join('');
        }
    },

    updateSettingsUI() {
        const s = Storage.data.settings;
        const soundT = document.getElementById('toggle-sound');
        const hapticT = document.getElementById('toggle-haptics');
        if (soundT) soundT.classList.toggle('on', s.sound);
        if (hapticT) hapticT.classList.toggle('on', s.haptics);
    },

    toggleSetting(k) {
        Storage.data.settings[k] = !Storage.data.settings[k];
        Storage.save();
        if (k === 'sound') AudioEngine.enabled = Storage.data.settings.sound;
        if (k === 'haptics') Haptics.enabled = Storage.data.settings.haptics;
        this.updateSettingsUI();
        AudioEngine.click();
    },

    resetProgress() {
        if (!confirm('همه پیشرفت حذف شود؟')) return;
        localStorage.removeItem(Storage.key);
        location.reload();
    },

    renderLeaderboard() {
        const filters = document.getElementById('lb-filters');
        if (!filters || !window.GAME_REGISTRY) return;

        filters.innerHTML = window.GAME_REGISTRY.map(g => 
            `<button class="lb-filter ${g.id === this.lbFilter ? 'active' : ''}" data-lb="${g.id}">${g.icon} ${g.name}</button>`
        ).join('');

        filters.querySelectorAll('[data-lb]').forEach(b => {
            b.addEventListener('click', () => {
                this.lbFilter = b.dataset.lb;
                this.renderLeaderboard();
            });
        });

        const list = document.getElementById('lb-list');
        if (!list) return;
        
        list.innerHTML = '<div class="lb-empty">در حال بارگذاری...</div>';
        
        Net.get(this.lbFilter).then(arr => {
            if (arr.length === 0) {
                const lb = Storage.data.best[this.lbFilter] || 0;
                if (lb > 0 && !Net.ready) {
                    list.innerHTML = `
                        <div class="lb-row">
                            <div class="lb-rank top1">1</div>
                            <div class="lb-name">${Storage.data.name} (تو)</div>
                            <div class="lb-score">${lb}</div>
                        </div>
                        <div class="lb-empty" style="padding:20px;font-size:12px">جدول آنلاین غیرفعال است</div>`;
                } else {
                    list.innerHTML = '<div class="lb-empty">هنوز رکوردی ثبت نشده. اولین نفر باش!</div>';
                }
                return;
            }
            
            list.innerHTML = arr.map((e, i) => `
                <div class="lb-row">
                    <div class="lb-rank ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${i + 1}</div>
                    <div class="lb-name">${e.name || 'ناشناس'}${e.uid === Storage.data.uid ? ' (تو)' : ''}</div>
                    <div class="lb-score">${e.score}</div>
                </div>
            `).join('');
        });
    },

    toast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }
};

window.App = App;
