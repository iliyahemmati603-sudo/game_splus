const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(freq, type, dur) {
        try {
            this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(); osc.stop(this.ctx.currentTime + dur);
        } catch (e) {}
    }
};

const StateManager = {
    key: 'GalacticNexus_Final',
    data: {
        coins: 3000, username: 'کاوشگر', userId: '0000',
        clan: null, clanChat: [], pvpWins: 0, gamesPlayed: 0,
        army: { atk: 10, def: 5 }
    },
    clansDB: {},
    load() {
        try {
            const s = localStorage.getItem(this.key);
            if (s) this.data = JSON.parse(s);
            const c = localStorage.getItem(this.key + '_clans');
            if (c) this.clansDB = JSON.parse(c);
        } catch (e) {}
    },
    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.data));
            localStorage.setItem(this.key + '_clans', JSON.stringify(this.clansDB));
            UIManager.updateStats();
        } catch (e) {}
    },
    addCoins(a) { this.data.coins += a; this.save(); },
    addGame() { this.data.gamesPlayed++; this.save(); }
};

const UIManager = {
    currentFilter: 'all',
    init() {
        StateManager.load();
        this.initTelegram();
        this.updateStats();
        this.renderGames();
        ClanManager.updateUI();
        if (StateManager.data.clan) ClanManager.renderChat();
    },
    initTelegram() {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready(); tg.expand();
                if (tg.initDataUnsafe?.user) {
                    StateManager.data.username = tg.initDataUnsafe.user.first_name || 'کاربر';
                    StateManager.data.userId = tg.initDataUnsafe.user.id.toString();
                }
            }
        } catch (e) {}
        document.getElementById('ui-name').textContent = StateManager.data.username;
        document.getElementById('ui-avatar').textContent = StateManager.data.username.charAt(0).toUpperCase();
        document.getElementById('ui-tag').textContent = '@' + StateManager.data.userId;
        document.getElementById('prof-name').textContent = StateManager.data.username;
        document.getElementById('prof-avatar').textContent = StateManager.data.username.charAt(0).toUpperCase();
    },
    updateStats() {
        document.getElementById('ui-coins').textContent = StateManager.data.coins;
        document.getElementById('prof-coins').textContent = StateManager.data.coins;
        document.getElementById('prof-wins').textContent = StateManager.data.pvpWins;
        document.getElementById('prof-games').textContent = StateManager.data.gamesPlayed;
        document.getElementById('prof-clan-name').textContent = StateManager.data.clan ? StateManager.data.clan : 'بدون اتحادیه';
    },
    switchTab(id, btn) {
        document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + id)?.classList.add('active');
        if (btn) btn.classList.add('active');
    },
    toast(msg) {
        const c = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast'; el.textContent = msg;
        c.appendChild(el);
        AudioEngine.play(800, 'triangle', 0.1);
        setTimeout(() => { el.classList.add('hiding'); setTimeout(() => el.remove(), 300); }, 2500);
    },
    filterGames(cat, el) {
        this.currentFilter = cat;
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        this.renderGames();
    },
    renderGames() {
        const games = [
            { id: 'lumberjack', icon: '🪓', title: 'چوب‌بر', desc: 'شاخه‌ها را قطع کن', cat: 'arcade' },
            { id: 'rocket', icon: '🚀', title: 'نبرد موشک', desc: 'سیارک‌ها را منفجر کن', cat: 'arcade' },
            { id: 'minesweeper', icon: '💣', title: 'مین‌یاب', desc: 'الماس پیدا کن', cat: 'puzzle' },
            { id: 'memory', icon: '🧠', title: 'حافظه تصویری', desc: 'جفت‌ها را پیدا کن', cat: 'puzzle' },
            { id: 'math', icon: '🧮', title: 'چالش ریاضی', desc: 'محاسبات ذهنی', cat: 'puzzle' },
            { id: 'duel', icon: '⚔️', title: 'دوز PvP', desc: 'مبارزه با هوش مصنوعی', cat: 'puzzle' },
            { id: 'stories', icon: '📖', title: 'داستان‌های تعاملی', desc: 'ماجراجویی متنی', cat: 'story' },
            { id: 'pvp', icon: '⚔️', title: 'نبرد PvP', desc: 'حمله به رقبا', cat: 'social' },
            { id: 'tod', icon: '🍾', title: 'جرئت یا حقیقت', desc: 'بازی گروهی', cat: 'social' }
        ];
        const filtered = this.currentFilter === 'all' ? games : games.filter(g => g.cat === this.currentFilter);
        document.getElementById('games-list').innerHTML = filtered.map(g => `
            <div class="game-card" onclick="GameManager.open('${g.id}')">
                <div class="game-icon">${g.icon}</div>
                <div class="game-title">${g.title}</div>
                <div class="game-desc">${g.desc}</div>
            </div>
        `).join('');
    }
};

const ClanManager = {
    create() {
        const name = document.getElementById('clan-input').value.trim();
        if (!name) return UIManager.toast('نام اتحادیه را وارد کنید');
        if (StateManager.data.coins < 3000) return UIManager.toast('3000 سکه نیاز است');
        if (StateManager.clansDB[name]) return UIManager.toast('این نام وجود دارد');
        StateManager.data.coins -= 3000;
        StateManager.clansDB[name] = { leader: StateManager.data.username, members: [StateManager.data.username] };
        StateManager.data.clan = name;
        StateManager.data.clanChat = [{ author: 'سیستم', text: `اتحادیه ${name} ساخته شد.`, mine: false }];
        StateManager.save(); this.updateUI(); UIManager.toast('اتحادیه ساخته شد!'); this.renderChat();
    },
    searchAndJoin() {
        const name = document.getElementById('clan-input').value.trim();
        if (!name) return UIManager.toast('نام را وارد کنید');
        if (StateManager.clansDB[name]) {
            StateManager.data.clan = name;
            if (!StateManager.clansDB[name].members.includes(StateManager.data.username)) StateManager.clansDB[name].members.push(StateManager.data.username);
            StateManager.data.clanChat = [{ author: 'سیستم', text: `به اتحادیه ${name} پیوستید.`, mine: false }];
            StateManager.save(); this.updateUI(); UIManager.toast('پیوستید!'); this.renderChat();
        } else UIManager.toast('اتحادیه یافت نشد!');
    },
    leave() { StateManager.data.clan = null; StateManager.save(); this.updateUI(); },
    updateUI() {
        if (StateManager.data.clan) {
            document.getElementById('clan-lobby').style.display = 'none';
            document.getElementById('clan-room').style.display = 'block';
            document.getElementById('c-name').textContent = StateManager.data.clan;
        } else {
            document.getElementById('clan-lobby').style.display = 'block';
            document.getElementById('clan-room').style.display = 'none';
        }
    },
    sendMsg() {
        const input = document.getElementById('clan-chat-input'); const text = input.value.trim(); if (!text) return;
        this.addMsg(StateManager.data.username, text, true); input.value = '';
    },
    addMsg(author, text, mine = false) {
        StateManager.data.clanChat.push({ author, text, mine }); StateManager.save(); this.renderChat();
    },
    renderChat() {
        const box = document.getElementById('clan-chat'); if (!box) return;
        box.innerHTML = StateManager.data.clanChat.map(m => `
            <div class="msg-bubble ${m.mine ? 'msg-mine' : 'msg-other'}">
                <span class="msg-author">${m.author}</span><div>${m.text}</div>
            </div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    }
};

const GameManager = {
    open(id) {
        document.getElementById('game-modal').classList.add('active');
        const title = document.getElementById('m-title');
        const desc = document.getElementById('m-desc');
        const content = document.getElementById('m-content');
        content.innerHTML = '';
        const info = {
            lumberjack: { t: '🪓 چوب‌بر', d: 'شاخه‌های چپ و راست را قطع کنید!' },
            rocket: { t: '🚀 نبرد موشک', d: 'با دکمه‌ها حرکت کنید و شلیک کنید!' },
            minesweeper: { t: '💣 مین‌یاب', d: 'الماس پیدا کنید و از بمب دوری کنید.' },
            memory: { t: '🧠 حافظه تصویری', d: 'تصاویر را حفظ کنید و جفت‌ها را پیدا کنید.' },
            math: { t: '🧮 چالش ریاضی', d: 'سوالات سخت‌تر می‌شوند!' },
            duel: { t: '⚔️ دوز PvP', d: 'در برابر هوش مصنوعی بازی کنید.' },
            stories: { t: '📖 داستان‌های تعاملی', d: 'انتخاب کنید و داستان را پیش ببرید.' },
            pvp: { t: '⚔️ نبرد PvP', d: 'به رقبا حمله کنید و سکه بگیرید.' },
            tod: { t: '🍾 جرئت یا حقیقت', d: 'بازی گروهی با چرخاندن بطری.' }
        };
        title.textContent = info[id].t;
        desc.textContent = info[id].d;
        GameCore.stop();
        if (id === 'lumberjack') Games.Lumberjack.start(content);
        else if (id === 'rocket') Games.Rocket.start(content);
        else if (id === 'minesweeper') Games.Minesweeper.start(content);
        else if (id === 'memory') Games.Memory.start(content);
        else if (id === 'math') Games.Math.start(content);
        else if (id === 'duel') Games.Duel.start(content);
        else if (id === 'stories') Games.Stories.start(content);
        else if (id === 'pvp') Games.PvP.start(content);
        else if (id === 'tod') Games.ToD.start(content);
    },
    close() {
        document.getElementById('game-modal').classList.remove('active');
        GameCore.stop();
        StateManager.addGame();
    }
};

const GameCore = {
    intervals: [], anims: [], timeouts: [],
    setInterval(fn, ms) { const id = window.setInterval(fn, ms); this.intervals.push(id); return id; },
    rAF(fn) { const id = window.requestAnimationFrame(fn); this.anims.push(id); return id; },
    setTimeout(fn, ms) { const id = window.setTimeout(fn, ms); this.timeouts.push(id); return id; },
    stop() {
        this.intervals.forEach(window.clearInterval);
        this.anims.forEach(window.cancelAnimationFrame);
        this.timeouts.forEach(window.clearTimeout);
        this.intervals = []; this.anims = []; this.timeouts = [];
    }
};

const Games = {
    Lumberjack: {
        start(c) {
            c.innerHTML = `
                <div style="flex:1; position:relative; background:#222; overflow:hidden;" id="lj-canvas-container">
                    <canvas id="lj-canvas" style="width:100%; height:100%;"></canvas>
                </div>
                <div style="text-align:center; font-weight:bold; padding:10px; background:#000; color:#fff;">امتیاز: <span id="lj-score" style="color:var(--gold)">0</span></div>
                <div class="game-controls">
                    <button class="game-btn" onmousedown="Games.Lumberjack.chop('left')" ontouchstart="Games.Lumberjack.chop('left')">⬅️</button>
                    <button class="game-btn" onmousedown="Games.Lumberjack.chop('right')" ontouchstart="Games.Lumberjack.chop('right')">➡️</button>
                </div>
            `;
            const canvas = document.getElementById('lj-canvas');
            const ctx = canvas.getContext('2d');
            const resize = () => { canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; };
            window.addEventListener('resize', resize); resize();
            let branches = [], score = 0, active = true, spawnTimer = 0, charPos = canvas.width / 2;
            const loop = () => {
                if (!active) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#8B4513'; ctx.fillRect(canvas.width / 2 - 20, 0, 40, canvas.height);
                ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(canvas.width / 2, 30, 60, 0, Math.PI * 2); ctx.fill();
                ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.fillText('🧑‍🌾', charPos, canvas.height - 10);
                spawnTimer++;
                if (spawnTimer > 60) { spawnTimer = 0; branches.push({ side: Math.random() > 0.5 ? 'right' : 'left', y: 60 }); }
                for (let i = branches.length - 1; i >= 0; i--) {
                    let b = branches[i]; b.y += 3;
                    ctx.fillStyle = '#8B4513';
                    if (b.side === 'right') ctx.fillRect(canvas.width / 2 + 20, b.y, 60, 15);
                    else ctx.fillRect(canvas.width / 2 - 80, b.y, 60, 15);
                    if (b.y > canvas.height) { branches.splice(i, 1); score++; document.getElementById('lj-score').textContent = score; StateManager.addCoins(1); }
                }
                GameCore.rAF(loop);
            };
            loop();
            this.chop = (dir) => {
                if (!active) return;
                let chopped = false;
                for (let i = branches.length - 1; i >= 0; i--) {
                    let b = branches[i];
                    if (b.side === dir && b.y > canvas.height - 80 && b.y < canvas.height - 20) {
                        branches.splice(i, 1); chopped = true; score += 5;
                        document.getElementById('lj-score').textContent = score; StateManager.addCoins(5);
                        AudioEngine.play(800, 'square', 0.05);
                        charPos = dir === 'left' ? canvas.width / 2 - 50 : canvas.width / 2 + 50;
                        GameCore.setTimeout(() => { charPos = canvas.width / 2; }, 150);
                        break;
                    }
                }
                if (!chopped) {
                    active = false; AudioEngine.play(150, 'sawtooth', 0.5);
                    UIManager.toast(`باختی! امتیاز: ${score}`);
                    GameCore.setTimeout(() => GameManager.close(), 1500);
                }
            };
        }
    },
    Rocket: {
        start(c) {
            c.innerHTML = `
                <div style="flex:1; position:relative; background:#000; overflow:hidden;" id="rk-canvas-container">
                    <canvas id="rk-canvas" style="width:100%; height:100%;"></canvas>
                </div>
                <div style="text-align:center; font-weight:bold; padding:10px; background:#000; color:#fff;">امتیاز: <span id="rk-score" style="color:var(--gold)">0</span></div>
                <div class="game-controls">
                    <button class="game-btn" onmousedown="Games.Rocket.move('left')" ontouchstart="Games.Rocket.move('left')">⬅️</button>
                    <button class="game-btn fire" onmousedown="Games.Rocket.shoot()" ontouchstart="Games.Rocket.shoot()">🔥 شلیک</button>
                    <button class="game-btn" onmousedown="Games.Rocket.move('right')" ontouchstart="Games.Rocket.move('right')">➡️</button>
                </div>
            `;
            const canvas = document.getElementById('rk-canvas');
            const ctx = canvas.getContext('2d');
            const resize = () => { canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; };
            window.addEventListener('resize', resize); resize();
            let p = { x: canvas.width / 2 - 15, y: canvas.height - 40, w: 30, h: 30 };
            let asteroids = [], bullets = [], score = 0, active = true, spawnTimer = 0;
            const loop = () => {
                if (!active) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.moveTo(p.x + 15, p.y); ctx.lineTo(p.x, p.y + 30); ctx.lineTo(p.x + 30, p.y + 30); ctx.fill();
                ctx.fillStyle = '#ffcc00';
                for (let i = bullets.length - 1; i >= 0; i--) { let b = bullets[i]; b.y -= 8; ctx.fillRect(b.x, b.y, 4, 10); if (b.y < 0) bullets.splice(i, 1); }
                spawnTimer++;
                if (spawnTimer > 40) { spawnTimer = 0; asteroids.push({ x: Math.random() * (canvas.width - 30), y: -30, s: Math.random() * 15 + 15 }); }
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    let a = asteroids[i]; a.y += 3;
                    ctx.fillStyle = '#ff0055'; ctx.beginPath(); ctx.arc(a.x + a.s/2, a.y + a.s/2, a.s/2, 0, Math.PI * 2); ctx.fill();
                    for (let j = bullets.length - 1; j >= 0; j--) {
                        let b = bullets[j];
                        if (b.x > a.x && b.x < a.x + a.s && b.y > a.y && b.y < a.y + a.s) {
                            asteroids.splice(i, 1); bullets.splice(j, 1); score += 10;
                            document.getElementById('rk-score').textContent = score; StateManager.addCoins(10);
                            AudioEngine.play(600, 'square', 0.05); break;
                        }
                    }
                    if (a.y + a.s > p.y && a.y < p.y + 30 && a.x + a.s > p.x && a.x < p.x + 30) {
                        active = false; AudioEngine.play(150, 'sawtooth', 0.5);
                        UIManager.toast(`سقوط! امتیاز: ${score}`);
                        GameCore.setTimeout(() => GameManager.close(), 1500); return;
                    }
                    if (a.y > canvas.height) asteroids.splice(i, 1);
                }
                GameCore.rAF(loop);
            };
            loop();
            this.move = (dir) => { if (dir === 'left' && p.x > 0) p.x -= 30; if (dir === 'right' && p.x < canvas.width - 30) p.x += 30; };
            this.shoot = () => { if (!active) return; bullets.push({ x: p.x + 13, y: p.y - 10 }); AudioEngine.play(400, 'sine', 0.05); };
        }
    },
    Minesweeper: {
        start(c) {
            c.innerHTML = `<div class="mine-grid" id="mg"></div><div style="text-align:center;font-weight:bold;margin-bottom:10px;">امتیاز: <span id="m-sc" style="color:var(--gold)">0</span></div>`;
            const g = document.getElementById('mg');
            let sc = 0, active = true, boms = new Set();
            while (boms.size < 5) boms.add(Math.floor(Math.random() * 25));
            for (let i = 0; i < 25; i++) {
                const cell = document.createElement('div'); cell.className = 'mine-cell';
                cell.onclick = () => {
                    if (!active || cell.classList.contains('diamond') || cell.classList.contains('bomb')) return;
                    if (boms.has(i)) {
                        cell.classList.add('bomb'); cell.textContent = '💥'; active = false;
                        AudioEngine.play(150, 'sawtooth', 0.5); StateManager.addCoins(sc);
                        UIManager.toast(`باختی! ${sc} سکه`); GameCore.setTimeout(() => GameManager.close(), 1500);
                    } else { cell.classList.add('diamond'); cell.textContent = '💎'; sc += 20; AudioEngine.play(800, 'sine', 0.1); document.getElementById('m-sc').textContent = sc; }
                };
                g.appendChild(cell);
            }
        }
    },
    Memory: {
        start(c) {
            c.innerHTML = `<div style="text-align:center; padding:10px; font-weight:bold; color:var(--primary);" id="mem-status">آماده...</div><div id="mg" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:10px;"></div><div style="text-align:center;font-weight:bold;">جفت‌ها: <span id="ms" style="color:var(--gold)">0</span></div>`;
            const em = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒'];
            this.cards = [...em, ...em].sort(() => Math.random() - 0.5);
            this.op = []; this.mt = 0; this.lock = true;
            this.render();
            document.getElementById('mem-status').textContent = 'حفظ کردن... ۵';
            let time = 5;
            GameCore.setInterval(() => {
                time--; document.getElementById('mem-status').textContent = `حفظ کردن... ${time}`;
                if (time <= 0) {
                    document.getElementById('mem-status').textContent = 'شروع!';
                    this.cards.forEach((_, i) => { const el = document.getElementById('m-' + i); if (el) { el.textContent = ''; el.classList.remove('diamond'); } });
                    this.lock = false;
                }
            }, 1000);
            this.cards.forEach((card, i) => { const el = document.getElementById('m-' + i); if (el) { el.textContent = card; el.classList.add('diamond'); } });
        },
        render() {
            const g = document.getElementById('mg'); g.innerHTML = '';
            this.cards.forEach((card, i) => { const cell = document.createElement('div'); cell.className = 'mine-cell'; cell.id = 'm-' + i; cell.onclick = () => this.flip(i, card); g.appendChild(cell); });
        },
        flip(i, card) {
            if (this.lock || this.op.length === 2) return;
            const el = document.getElementById('m-' + i); if (el.textContent) return;
            el.textContent = card; el.classList.add('diamond'); AudioEngine.play(600, 'sine', 0.05);
            this.op.push({ i, card });
            if (this.op.length === 2) {
                this.lock = true;
                if (this.op[0].card === this.op[1].card) {
                    this.mt++; document.getElementById('ms').textContent = this.mt; StateManager.addCoins(20); this.op = []; this.lock = false;
                    if (this.mt === 6) { UIManager.toast('آفرین!'); GameCore.setTimeout(() => GameManager.close(), 1500); }
                } else {
                    GameCore.setTimeout(() => {
                        document.getElementById('m-' + this.op[0].i).textContent = ''; document.getElementById('m-' + this.op[0].i).classList.remove('diamond');
                        document.getElementById('m-' + this.op[1].i).textContent = ''; document.getElementById('m-' + this.op[1].i).classList.remove('diamond');
                        this.op = []; this.lock = false;
                    }, 800);
                }
            }
        }
    },
    Math: {
        start(c) {
            c.innerHTML = `<div style="padding:20px; text-align:center;"><h2 id="math-q" style="font-size:36px; margin-bottom:20px; color:var(--primary);">?</h2><input type="number" id="math-ans" class="input-box" placeholder="پاسخ..."><button class="btn btn-primary" onclick="Games.Math.check()">تایید</button><div id="math-msg" style="margin-top:15px; font-weight:bold; height:20px;"></div></div>`;
            this.score = 0; this.newQuestion();
        },
        newQuestion() {
            let max = 10 + (this.score * 2); let a = Math.floor(Math.random() * max) + 1; let b = Math.floor(Math.random() * max) + 1;
            let op = Math.random() > 0.5 ? '+' : '-';
            if (op === '-' && a < b) { let t = a; a = b; b = t; }
            this.ans = op === '+' ? a + b : a - b;
            document.getElementById('math-q').textContent = `${a} ${op} ${b} = ?`; document.getElementById('math-ans').value = '';
        },
        check() {
            const val = parseInt(document.getElementById('math-ans').value); const msg = document.getElementById('math-msg');
            if (val === this.ans) { this.score += 10; StateManager.addCoins(10); msg.textContent = 'درست!'; msg.style.color = 'var(--success)'; AudioEngine.play(800, 'sine', 0.1); this.newQuestion(); }
            else { msg.textContent = 'اشتباه!'; msg.style.color = 'var(--secondary)'; AudioEngine.play(150, 'sawtooth', 0.1); }
        }
    },
    Duel: {
        start(c) {
            c.innerHTML = `<div id="dg" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:15px;"></div><div id="ds" style="text-align:center;font-weight:bold;color:var(--primary);">نوبت شما (X)</div><button class="btn btn-danger" onclick="GameManager.close()">انصراف</button>`;
            this.b = Array(9).fill(''); this.active = true; this.render();
        },
        render() {
            const g = document.getElementById('dg'); g.innerHTML = '';
            this.b.forEach((v, i) => {
                const cell = document.createElement('div');
                cell.style.cssText = 'aspect-ratio:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:10px;display:flex;justify-content:center;align-items:center;font-size:32px;font-weight:900;cursor:pointer;';
                cell.textContent = v; cell.style.color = v === 'X' ? 'var(--primary)' : 'var(--secondary)';
                cell.onclick = () => this.play(i); g.appendChild(cell);
            });
        },
        check(b) {
            const w = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
            for (let i of w) if (b[i[0]] && b[i[0]] === b[i[1]] && b[i[1]] === b[i[2]]) return b[i[0]];
            return b.includes('') ? null : 'draw';
        },
        minimax(b, d, isMax) {
            let res = this.check(b);
            if (res === 'X') return -10 + d; if (res === 'O') return 10 - d; if (res === 'draw') return 0;
            if (isMax) { let best = -Infinity; for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = 'O'; best = Math.max(best, this.minimax(b, d + 1, false)); b[i] = ''; } return best; }
            else { let best = Infinity; for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = 'X'; best = Math.min(best, this.minimax(b, d + 1, true)); b[i] = ''; } return best; }
        },
        play(i) {
            if (!this.active || this.b[i]) return;
            this.b[i] = 'X'; this.render(); AudioEngine.play(600, 'sine', 0.1);
            let res = this.check(this.b); if (res) return this.finish(res);
            document.getElementById('ds').textContent = 'ربات در حال فکر...';
            GameCore.setTimeout(() => {
                let best = -Infinity, mv = -1;
                for (let j = 0; j < 9; j++) if (!this.b[j]) { this.b[j] = 'O'; let sc = this.minimax(this.b, 0, false); this.b[j] = ''; if (sc > best) { best = sc; mv = j; } }
                this.b[mv] = 'O'; this.render(); AudioEngine.play(300, 'sine', 0.1);
                res = this.check(this.b); if (res) return this.finish(res);
                document.getElementById('ds').textContent = 'نوبت شما (X)';
            }, 400);
        },
        finish(res) {
            this.active = false; const s = document.getElementById('ds');
            if (res === 'X') { s.textContent = 'شما بردید! +100 سکه'; StateManager.addCoins(100); AudioEngine.play(1000, 'triangle', 0.3); }
            else if (res === 'O') { s.textContent = 'ربات برد!'; AudioEngine.play(150, 'sawtooth', 0.3); }
            else { s.textContent = 'مساوی!'; }
        }
    },
    Stories: {
        start(c) {
            c.innerHTML = `<div id="story-view" style="padding:20px;"></div>`;
            StoryEngine.open('intro');
        }
    },
    PvP: {
        start(c) {
            c.innerHTML = `<div style="padding:20px;"><div style="display:flex;justify-content:space-between;margin-bottom:15px;font-size:13px;"><span>⚔️ حمله: <b id="pvp-atk">10</b></span><span>🛡️ دفاع: <b id="pvp-def">5</b></span></div><button class="btn btn-primary" onclick="PvPManager.findMatch()">جستجوی حریف</button><div id="pvp-log" style="background:rgba(0,0,0,0.5);border-radius:10px;padding:12px;height:150px;overflow-y:auto;font-size:12px;margin-top:15px;display:flex;flex-direction:column;gap:5px;"></div></div>`;
            document.getElementById('pvp-atk').textContent = StateManager.data.army.atk;
            document.getElementById('pvp-def').textContent = StateManager.data.army.def;
        }
    },
    ToD: {
        start(c) {
            c.innerHTML = `<div id="tod-container" class="tod-container"></div>`;
            TruthOrDare.init();
        }
    }
};

const StoryEngine = {
    currentStory: null,
    stories: {
        stardust: {
            start: 'intro', beats: {
                intro: { img: '🚀', text: 'سال ۲۱۸۹. سفینه شما به یک ایستگاه فضایی متروکه برخورد کرده است. سیستم پشتیبان در حال از کار افتادن است. باید سریع تصمیم بگیرید.', choices: [{ text: 'به سمت اتاق کنترل بروید', target: 'control' }, { text: 'به سمت محفظه نمونه‌ها بروید', target: 'sample' }] },
                control: { img: '🖥️', text: 'اتاق کنترل پر از صفحه‌نمایش‌های شکسته است. یک پیام ضبط‌شده از کاپیتان قبلی پیدا می‌کنید.', choices: [{ text: 'پیام را گوش کنید', target: 'listen' }, { text: 'سیستم را ریبوت کنید', target: 'reboot' }] },
                sample: { img: '🧪', text: 'محفظه نمونه‌ها باز است. یک موجود عجیب در تاریکی حرکت می‌کند.', choices: [{ text: 'فرار کنید', target: 'flee' }, { text: 'با آن ارتباط برقرار کنید', target: 'communicate' }] },
                listen: { img: '👾', text: 'پیام ادامه می‌دهد: "آن‌ها از سیاره‌ای آمده‌اند که ما نباید کشف می‌کردیم."', ending: true, textEnd: 'شما پیام را شنیدید و فرار کردید. پایان.' },
                reboot: { img: '⚡', text: 'سیستم ریبوت می‌شود. درها قفل می‌شوند.', ending: true, textEnd: 'شما گیر افتادید. پایان تلخ.' },
                flee: { img: '🏃', text: 'به سمت سفینه فرار می‌کنید. اما سفینه آسیب دیده.', ending: true, textEnd: 'شما در ایستگاه گرفتار شده‌اید. پایان.' },
                communicate: { img: '👽', text: 'موجود می‌گوید: "ما صلح می‌خواهیم."', ending: true, textEnd: 'شما به موجود کمک کردید. پایان جدید!' }
            }
        },
        shadow: {
            start: 'intro', beats: {
                intro: { img: '🏰', text: 'شما ولیعهد قلمروی سایه هستید. عموی شما تاج و تخت را غصب کرده است.', choices: [{ text: 'به دهکده بروید', target: 'village' }, { text: 'به سمت قلعه بروید', target: 'castle' }] },
                village: { img: '🏘️', text: 'مردم از ظلم خسته شده‌اند. اما می‌ترسند.', choices: [{ text: 'قول آزادی بدهید', target: 'promise' }, { text: 'از آن‌ها بخواهید بجنگند', target: 'fight' }] },
                castle: { img: '🗡️', text: 'عمویتان شما را به شام دعوت می‌کند. این یک تله است.', choices: [{ text: 'قبول کنید', target: 'trap' }, { text: 'رد کنید و حمله کنید', target: 'attack' }] },
                promise: { img: '🤝', text: 'مردم قبول می‌کنند. با هم به قلعه حمله می‌کنید.', ending: true, textEnd: 'شما پادشاه عادل شدید. پایان خوش!' },
                fight: { img: '⚔️', text: 'مردم می‌جنگند اما شکست می‌خورند.', ending: true, textEnd: 'شما کشته شدید. پایان تلخ.' },
                trap: { img: '🍷', text: 'شما نقشه را می‌فهمید و فرار می‌کنید.', ending: true, textEnd: 'تاج و تخت را پس گرفتید. پایان باز.' },
                attack: { img: '💥', text: 'حمله سختی است.', ending: true, textEnd: 'شما پیروز شدید اما قلمرو ویران شد. پایان bittersweet.' }
            }
        },
        cyber: {
            start: 'intro', beats: {
                intro: { img: '🌃', text: 'شهر نئون. یک برنامه‌نویس مشهور به قتل رسیده است. شما کارآگاه سایبری هستید.', choices: [{ text: 'صحنه جرم را بررسی کنید', target: 'scene' }, { text: 'با شاهدان صحبت کنید', target: 'witness' }] },
                scene: { img: '💻', text: 'در لپ‌تاپ قربانی یک فایل مخفی پیدا می‌کنید.', choices: [{ text: 'فایل را باز کنید', target: 'file' }, { text: 'لپ‌تاپ را به آزمایشگاه ببرید', target: 'lab' }] },
                witness: { img: '👥', text: 'یک شاهد می‌گوید شخصی با کاپشن قرمز دیده است.', choices: [{ text: 'به دنبال کاپشن قرمز بگردید', target: 'red' }, { text: 'شاهد را بازجویی کنید', target: 'interrogate' }] },
                file: { img: '📂', text: 'فایل حاوی یک ویروس است.', ending: true, textEnd: 'شما هک شدید. پایان تلخ.' },
                lab: { img: '🔬', text: 'آزمایشگاه یک اثر انگشت دیجیتال پیدا می‌کند.', ending: true, textEnd: 'شما قاتل را دستگیر کردید. پایان خوش!' },
                red: { img: '🧥', text: 'کاپشن قرمز متعلق به رقیب تجاری است.', ending: true, textEnd: 'شما انگیزه را پیدا کردید. پایان.' },
                interrogate: { img: '🔦', text: 'شاهد اعتراف می‌کند که خودش قاتل است.', ending: true, textEnd: 'پرونده حل شد! پایان غیرمنتظره.' }
            }
        }
    },
    open(storyId) {
        this.currentStory = this.stories[storyId] || this.stories.stardust;
        this.render('intro');
    },
    render(beatId) {
        const beat = this.currentStory.beats[beatId];
        const view = document.getElementById('story-view');
        if (!view) return;
        let html = `<div style="width:100%;height:120px;background:#111;border-radius:12px;margin-bottom:20px;display:flex;justify-content:center;align-items:center;font-size:50px;">${beat.img || '📖'}</div><div style="font-size:15px;line-height:1.8;margin-bottom:20px;color:#ddd;">${beat.text}</div>`;
        if (beat.ending) {
            html += `<div style="text-align:center;padding:20px;color:var(--gold);font-weight:bold;">${beat.textEnd}</div><button class="btn btn-primary" onclick="GameManager.close()">پایان</button>`;
        } else {
            beat.choices.forEach(c => { html += `<button class="story-choice-btn" style="display:block;width:100%;padding:14px;margin-bottom:10px;background:rgba(0,229,255,0.05);border:1px solid var(--border);border-radius:12px;color:var(--text);text-align:right;font-size:14px;cursor:pointer;" onclick="StoryEngine.render('${c.target}')">${c.text}</button>`; });
        }
        view.innerHTML = html;
        AudioEngine.play(400, 'sine', 0.1);
    }
};

const PvPManager = {
    findMatch() {
        const log = document.getElementById('pvp-log');
        log.innerHTML = '<div style="color:var(--primary)">در حال جستجوی حریف...</div>';
        GameCore.setTimeout(() => {
            const enemyAtk = Math.floor(Math.random() * 20) + 5;
            const enemyDef = Math.floor(Math.random() * 10) + 2;
            let playerHp = 50, enemyHp = 50;
            log.innerHTML = '';
            const battleInterval = GameCore.setInterval(() => {
                const playerDmg = Math.max(1, StateManager.data.army.atk - enemyDef);
                const enemyDmg = Math.max(1, enemyAtk - StateManager.data.army.def);
                enemyHp -= playerDmg; playerHp -= enemyDmg;
                log.innerHTML += `<div>شما ${playerDmg} آسیب زدید. (HP حریف: ${Math.max(0, enemyHp)})</div>`;
                log.innerHTML += `<div style="color:var(--secondary)">حریف ${enemyDmg} آسیب زد. (HP شما: ${Math.max(0, playerHp)})</div>`;
                log.scrollTop = log.scrollHeight;
                if (playerHp <= 0 || enemyHp <= 0) {
                    GameCore.intervals = GameCore.intervals.filter(id => id !== battleInterval);
                    window.clearInterval(battleInterval);
                    if (enemyHp <= 0) { StateManager.data.pvpWins++; StateManager.addCoins(100); log.innerHTML += '<div style="color:var(--success); font-weight:bold;">شما پیروز شدید! +100 سکه</div>'; }
                    else { log.innerHTML += '<div style="color:var(--secondary); font-weight:bold;">شما شکست خوردید.</div>'; }
                    StateManager.save();
                }
            }, 800);
        }, 1000);
    }
};

const TruthOrDare = {
    players: [], currentTarget: null, currentAsker: null, phase: 'setup',
    init() {
        this.players = ['شما'];
        this.phase = 'setup';
        this.render();
    },
    render() {
        const c = document.getElementById('tod-container');
        if (!c) return;
        if (this.phase === 'setup') {
            c.innerHTML = `
                <div style="text-align:center; margin-bottom:15px;">تعداد بازیکنان را انتخاب کنید (۳ تا ۱۰ نفر)</div>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;" id="tod-player-count"></div>
                <button class="btn btn-primary" style="margin-top:15px;" onclick="TruthOrDare.startGame()">شروع بازی</button>
            `;
            for (let i = 3; i <= 10; i++) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm';
                btn.style.width = '45px';
                btn.textContent = i;
                btn.onclick = () => { this.setPlayerCount(i); };
                document.getElementById('tod-player-count').appendChild(btn);
            }
        } else if (this.phase === 'spinTarget') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div class="tod-bottle" id="tod-bottle">🍾</div>
                <button class="btn btn-gold" onclick="TruthOrDare.spinTarget()">چرخاندن بطری (انتخاب فرد)</button>
                <div id="tod-log" class="tod-chat"></div>
            `;
            this.renderPlayers();
        } else if (this.phase === 'chooseAction') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div style="text-align:center; font-size:18px; font-weight:bold; margin:10px 0;">نوبت <span style="color:var(--secondary);">${this.currentTarget}</span> است</div>
                <div class="tod-actions">
                    <button class="btn" onclick="TruthOrDare.choose('truth')">حقیقت</button>
                    <button class="btn btn-danger" onclick="TruthOrDare.choose('dare')">جرئت</button>
                </div>
                <div id="tod-log" class="tod-chat"></div>
            `;
            this.renderPlayers();
        } else if (this.phase === 'spinAsker') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div class="tod-bottle" id="tod-bottle">🍾</div>
                <button class="btn btn-gold" onclick="TruthOrDare.spinAsker()">چرخاندن بطری (انتخاب پرسشگر)</button>
                <div id="tod-log" class="tod-chat"></div>
            `;
            this.renderPlayers();
        } else if (this.phase === 'askQuestion') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div style="text-align:center; margin:10px 0;"><span style="color:var(--primary);">${this.currentAsker}</span> باید از <span style="color:var(--secondary);">${this.currentTarget}</span> بپرسد:</div>
                <input type="text" id="tod-question-input" class="input-box" placeholder="سوال یا جرئت خود را بنویسید...">
                <button class="btn btn-primary" onclick="TruthOrDare.submitQuestion()">ارسال</button>
                <div id="tod-log" class="tod-chat"></div>
            `;
            this.renderPlayers();
        } else if (this.phase === 'answer') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div style="text-align:center; margin:10px 0;">سوال: <span style="color:var(--gold);">${this.currentQuestion}</span></div>
                <div style="text-align:center; margin:10px 0;">پاسخ <span style="color:var(--primary);">${this.currentTarget}</span>:</div>
                <input type="text" id="tod-answer-input" class="input-box" placeholder="پاسخ یا انجام جرئت...">
                <button class="btn btn-primary" onclick="TruthOrDare.submitAnswer()">ارسال پاسخ</button>
                <div id="tod-log" class="tod-chat"></div>
            `;
            this.renderPlayers();
        } else if (this.phase === 'result') {
            c.innerHTML = `
                <div class="tod-players" id="tod-players"></div>
                <div style="text-align:center; padding:15px; background:rgba(0,255,136,0.1); border:1px solid var(--success); border-radius:12px; margin:10px 0;">
                    <div style="font-weight:bold; color:var(--success); margin-bottom:8px;">نتیجه</div>
                    <div><b>${this.currentAsker}</b> پرسید: <span style="color:var(--gold);">${this.currentQuestion}</span></div>
                    <div style="margin-top:8px;"><b>${this.currentTarget}</b> پاسخ داد: <span style="color:var(--primary);">${this.currentAnswer}</span></div>
                </div>
                <button class="btn btn-gold" onclick="TruthOrDare.nextRound()">دور بعد</button>
            `;
            this.renderPlayers();
        }
    },
    setPlayerCount(n) {
        this.players = ['شما'];
        const names = ['آرش', 'سارا', 'رضا', 'مریم', 'علی', 'نگین', 'کیان', 'هستی', 'امیر'];
        for (let i = 1; i < n; i++) this.players.push(names[i - 1] || 'بازیکن ' + (i + 1));
        UIManager.toast(`تعداد بازیکنان: ${n}`);
        this.render();
    },
    startGame() {
        if (this.players.length < 3) return UIManager.toast('حداقل ۳ بازیکن نیاز است');
        this.phase = 'spinTarget';
        this.render();
    },
    spinTarget() {
        const bottle = document.getElementById('tod-bottle');
        if (bottle) bottle.style.transform = `rotate(${Math.random() * 720 + 1440}deg)`;
        AudioEngine.play(400, 'sine', 0.2);
        GameCore.setTimeout(() => {
            this.currentTarget = this.players[Math.floor(Math.random() * this.players.length)];
            this.phase = 'chooseAction';
            this.render();
            this.log(`بطری به سمت ${this.currentTarget} چرخید.`);
        }, 1500);
    },
    choose(action) {
        this.currentAction = action;
        this.phase = 'spinAsker';
        this.render();
        this.log(`${this.currentTarget} انتخاب کرد: ${action === 'truth' ? 'حقیقت' : 'جرئت'}`);
    },
    spinAsker() {
        const bottle = document.getElementById('tod-bottle');
        if (bottle) bottle.style.transform = `rotate(${Math.random() * 720 + 1440}deg)`;
        AudioEngine.play(400, 'sine', 0.2);
        GameCore.setTimeout(() => {
            let asker = this.players[Math.floor(Math.random() * this.players.length)];
            while (asker === this.currentTarget && this.players.length > 1) {
                asker = this.players[Math.floor(Math.random() * this.players.length)];
            }
            this.currentAsker = asker;
            this.phase = 'askQuestion';
            this.render();
            this.log(`بطری به سمت ${this.currentAsker} چرخید.`);
        }, 1500);
    },
    submitQuestion() {
        const val = document.getElementById('tod-question-input').value.trim();
        if (!val) return UIManager.toast('سوال را وارد کنید');
        this.currentQuestion = val;
        this.phase = 'answer';
        this.render();
        this.log(`${this.currentAsker} پرسید: ${val}`);
    },
    submitAnswer() {
        const val = document.getElementById('tod-answer-input').value.trim();
        if (!val) return UIManager.toast('پاسخ را وارد کنید');
        this.currentAnswer = val;
        this.phase = 'result';
        this.render();
        this.log(`${this.currentTarget} پاسخ داد: ${val}`);
    },
    nextRound() {
        this.currentTarget = null; this.currentAsker = null; this.currentQuestion = null; this.currentAnswer = null;
        this.phase = 'spinTarget';
        this.render();
    },
    renderPlayers() {
        const el = document.getElementById('tod-players');
        if (!el) return;
        el.innerHTML = this.players.map(p => `<span class="tod-player ${p === this.currentTarget || p === this.currentAsker ? 'active' : ''}">${p}</span>`).join('');
    },
    log(msg) {
        const el = document.getElementById('tod-log');
        if (el) { el.innerHTML += `<div style="color:var(--muted);">${msg}</div>`; el.scrollTop = el.scrollHeight; }
    }
};

document.addEventListener('DOMContentLoaded', () => { UIManager.init(); });
