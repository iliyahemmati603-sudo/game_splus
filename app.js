'use strict';

const App = {
    currentGame: null,
    currentGameId: null,
    rafId: null,
    lastTime: 0,
    currentCat: 'all',
    lbFilter: 'runner',
    currentInfoGame: null,
    snakeControlCallback: null, 

    init() {
        this.loadTheme();
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
    },

    loadTheme() {
        const theme = localStorage.getItem('nexus_theme') || 'dark';
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.getElementById('theme-btn').textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('theme-btn').textContent = '🌙';
        }
    },

    toggleTheme() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('nexus_theme', 'dark');
            document.getElementById('theme-btn').textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('nexus_theme', 'light');
            document.getElementById('theme-btn').textContent = '☀️';
        }
        AudioEngine.click();
    },

    bindTelegram() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = Telegram.WebApp;
                tg.ready(); tg.expand();
                if (tg.initDataUnsafe?.user) {
                    Storage.data.name = tg.initDataUnsafe.user.first_name || 'بازیکن';
                    Storage.data.uid = 'tg_' + tg.initDataUnsafe.user.id;
                    Storage.save();
                }
            }
        } catch (e) {}
        this.updateProfileUI();
    },

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.screen;
                if (target) { location.hash = target; AudioEngine.click(); }
            });
        });
    },

    bindHashChange() {
        window.addEventListener('hashchange', () => this.handleHash());
    },

    handleHash() {
        const hash = location.hash.slice(1) || 'home';
        
        if (hash.startsWith('play-info/')) {
            const gameId = hash.slice(10);
            this.showGameInfo(gameId);
        } else if (hash.startsWith('playing/')) {
            if (!this.currentInfoGame) { location.hash = 'home'; return; }
            this.startGame(this.currentInfoGame.id);
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
        this.renderCategories();
        this.renderGames();
        this.updateSettingsUI();
    },

    renderCategories() {
        const scroll = document.getElementById('category-scroll');
        scroll.innerHTML = window.CATEGORIES.map(c => {
            const count = c.id === 'all' ? window.GAME_REGISTRY.length : window.GAME_REGISTRY.filter(g => g.cat === c.id).length;
            const active = c.id === this.currentCat ? 'active' : '';
            return `<button class="cat-chip ${active}" data-cat="${c.id}">${c.icon} ${c.name} <span class="cat-count">${count}</span></button>`;
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
        const filtered = this.currentCat === 'all' ? window.GAME_REGISTRY : window.GAME_REGISTRY.filter(g => g.cat === this.currentCat);
        
        const faNames = {
            'runner': 'دونده نئونی', 'tetris': 'تتریس', 'blocks': 'پازل بلوکی', 'flappy': 'پرنده پرنده',
            'snake': 'مار نئونی', 'breakout': 'آجرشکن', 'memory': 'بازی حافظه', '2048': '۲۰۴۸',
            'minesweeper': 'مین‌یاب', 'math': 'ریاضی سریع', 'match3': 'جورچین', 'shooter': 'شبیه‌ساز فضایی',
            'clicker': 'کلیکر', 'tower': 'دفاع از پایگاه', 'solitaire': 'پاسور', 'stack': 'برج‌ساز',
            'color': 'تعویض رنگ', 'word': 'بازی کلمات', 'physics': 'توپ فیزیکی', 'reaction': 'تست واکنش'
        };

        grid.innerHTML = filtered.map(g => {
            const best = Storage.data.best[g.id] || 0;
            const faName = faNames[g.id] || g.name;
            return `<div class="game-tile" data-game="${g.id}">
                <div class="g-icon">${g.icon}</div>
                <div class="g-info">
                    <div class="g-name-fa">${faName}</div>
                    <div class="g-name-en">${g.name}</div>
                    <div class="g-desc">${g.desc}</div>
                    ${best > 0 ? `<div class="g-best">رکورد: ${best}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                AudioEngine.click();
                location.hash = 'play-info/' + tile.dataset.game;
            });
        });
    },

    showGameInfo(id) {
        const meta = window.GAME_REGISTRY.find(g => g.id === id);
        if (!meta) { location.hash = 'home'; return; }
        this.currentInfoGame = meta;
        
        document.getElementById('info-title').textContent = meta.name;
        document.getElementById('info-icon').textContent = meta.icon;
        document.getElementById('info-desc').textContent = meta.desc;
        document.getElementById('game-info-extra').style.display = 'none';
        
        this.go('game-info');
    },

    showGameAbout() {
        if (!this.currentInfoGame) return;
        const extra = document.getElementById('game-info-extra');
        extra.style.display = 'block';
        extra.innerHTML = `
            <h3>📖 نحوه بازی</h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.8;">
                این بازی برای کشف مهارت‌های شما طراحی شده است. 
                با استفاده از لمس صفحه، کیبورد (در صورت وجود) یا دکمه‌های روی صفحه، بازی را کنترل کنید. 
                سعی کنید رکورد قبلی خود (${Storage.data.best[this.currentInfoGame.id] || 0}) را بشکنید!
            </p>
        `;
    },

    showGameLeaderboard() {
        if (!this.currentInfoGame) return;
        const extra = document.getElementById('game-info-extra');
        extra.style.display = 'block';
        extra.innerHTML = `<h3>🏆 جدول امتیازات</h3><div style="text-align:center; padding:20px; color:var(--text-muted);">در حال دریافت...</div>`;
        
        Net.get(this.currentInfoGame.id).then(arr => {
            if (arr.length === 0) {
                extra.innerHTML += `<p style="text-align:center; font-size:13px; color:var(--text-muted);">هنوز رکوردی ثبت نشده است.</p>`;
                return;
            }
            let html = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">';
            arr.slice(0, 5).forEach((e, i) => {
                html += `<div style="display:flex; justify-content:space-between; padding:8px; background:var(--bg); border-radius:8px; font-size:13px;">
                    <span>${i+1}. ${e.name}</span>
                    <b style="color:var(--primary);">${e.score}</b>
                </div>`;
            });
            html += '</div>';
            extra.innerHTML += html;
        });
    },

    playCurrentGame() {
        if (!this.currentInfoGame) return;
        location.hash = 'playing/' + this.currentInfoGame.id;
    },

    startGame(id) {
        const meta = window.GAME_REGISTRY.find(g => g.id === id);
        const GameClass = window['Game_' + id];
        
        if (!meta || !GameClass) {
            this.toast('بازی یافت نشد!');
            location.hash = 'home';
            return;
        }

        this.currentGameId = id;
        this.currentGame = new GameClass();
        
        document.getElementById('game-title').textContent = meta.name;
        document.getElementById('game-hud').innerHTML = '';
        document.getElementById('game-overlay').classList.remove('show');
        
        this.go('game');
        document.getElementById('game-canvas').classList.add('active');
        
        const dpad = document.getElementById('snake-dpad');
        if (id === 'snake') {
            dpad.style.display = 'flex';
        } else {
            dpad.style.display = 'none';
        }

        this.currentGame.start();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
        AudioEngine.resume();
    },

    snakeControl(dir) {
        if (this.currentGame && this.currentGameId === 'snake' && this.currentGame.setDirection) {
            this.currentGame.setDirection(dir);
            AudioEngine.click();
        }
    },

    gameLoop(now) {
        if (!this.currentGame) return;
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        try {
            this.currentGame.update(dt);
            this.currentGame.render();
        } catch (e) {
            console.error(e);
            this.quitGame();
        }
        this.rafId = requestAnimationFrame(t => this.gameLoop(t));
    },

    quitGame() {
        if (this.currentGame && this.currentGame.stop) this.currentGame.stop();
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.currentGame = null;
        
        document.getElementById('game-canvas').classList.remove('active');
        document.getElementById('game-overlay').classList.remove('show');
        document.getElementById('snake-dpad').style.display = 'none';
        
        const ctx = document.getElementById('game-canvas').getContext('2d');
        if (ctx) ctx.clearRect(0, 0, document.getElementById('game-canvas').width, document.getElementById('game-canvas').height);
        
        this.currentInfoGame = null;
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
            <h2 class="${isNewBest ? 'win' : 'lose'}" style="color:${isNewBest ? 'var(--primary)' : 'var(--secondary)'}">${isNewBest ? 'رکورد جدید!' : 'بازی تمام شد'}</h2>
            <div style="font-size:46px; font-weight:900; color:var(--text-main); margin:14px 0;">${score}</div>
            <div style="font-size:14px; color:var(--text-muted); margin-bottom:20px;">رکورد قبلی: ${prevBest} | سکه: ${reward} 💎</div>
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
        document.getElementById('home-coins').textContent = Storage.data.coins;
        document.getElementById('prof-coins').textContent = Storage.data.coins;
        document.getElementById('prof-avatar').textContent = Storage.data.name.charAt(0).toUpperCase();
        document.getElementById('prof-name').textContent = Storage.data.name;
        document.getElementById('prof-games').textContent = Storage.data.gamesPlayed;
        document.getElementById('prof-best').textContent = Storage.data.totalBest;
        document.getElementById('username-input').value = Storage.data.name;
        
        const list = document.getElementById('profile-games-list');
        list.innerHTML = window.GAME_REGISTRY.filter(g => (Storage.data.best[g.id] || 0) > 0).map(g => {
            const b = Storage.data.best[g.id];
            return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                <span>${g.icon} ${g.name}</span><b style="color:var(--primary)">${b}</b>
            </div>`;
        }).join('') || '<div style="text-align:center; color:var(--text-muted); font-size:12px;">هنوز بازی نکرده‌اید.</div>';
    },

    saveUsername() {
        let newName = document.getElementById('username-input').value.trim();
        
        // فیلتر امنیتی و کلمات رکیک
        const badWords = ['کص', 'کیر', 'جنده', 'حرومی', 'fuck', 'shit', 'sex', 'porn', 'کون', 'شاش'];
        const isProfane = badWords.some(w => newName.toLowerCase().includes(w));
        
        if (newName.length < 3 || newName.length > 15) {
            this.toast('نام باید بین ۳ تا ۱۵ حرف باشد');
            return;
        }
        if (isProfane) {
            this.toast('استفاده از این نام مجاز نیست!');
            return;
        }

        newName = newName.replace(/[<>]/g, '');

        Storage.data.name = newName;
        Storage.save();
        this.updateProfileUI();
        this.toast('نام با موفقیت تغییر کرد ✅');
    },

    updateSettingsUI() {
        const s = Storage.data.settings;
        document.getElementById('toggle-sound').classList.toggle('on', s.sound);
        document.getElementById('toggle-haptics').classList.toggle('on', s.haptics);
    },

    toggleSetting(k) {
        Storage.data.settings[k] = !Storage.data.settings[k];
        Storage.save();
        if (k === 'sound') AudioEngine.enabled = Storage.data.settings.sound;
        if (k === 'haptics') Haptics.enabled = Storage.data.settings.haptics;
        this.updateSettingsUI();
    },

    resetProgress() {
        if (!confirm('همه پیشرفت حذف شود؟')) return;
        localStorage.removeItem(Storage.key);
        location.reload();
    },

    renderLeaderboard() {
        const filters = document.getElementById('lb-filters');
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
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">در حال بارگذاری...</div>';
        
        Net.get(this.lbFilter).then(arr => {
            if (arr.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">هنوز رکوردی ثبت نشده است.</div>';
                return;
            }
            list.innerHTML = arr.map((e, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--panel); border:1px solid var(--border); border-radius:12px; margin-bottom:8px;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="width:24px; height:24px; border-radius:6px; background:${i===0?'#ffc531':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--panel-light)'}; color:${i<3?'#000':'var(--text-main)'}; display:grid; place-items:center; font-size:12px; font-weight:900;">${i+1}</div>
                        <span style="font-size:14px; font-weight:700;">${e.name}</span>
                    </div>
                    <b style="color:var(--primary); font-size:15px;">${e.score}</b>
                </div>
            `).join('');
        });
    },

    toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
    }
};

window.App = App;
