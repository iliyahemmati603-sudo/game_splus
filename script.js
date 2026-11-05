const AudioEngine = {
    ctx: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
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
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + dur);
        } catch (e) {}
    }
};

const StateManager = {
    key: 'GalacticArcadePro_V1',
    data: {
        coins: 0,
        gamesPlayed: 0,
        username: 'کاوشگر',
        userId: '0000'
    },
    load() {
        try {
            const saved = localStorage.getItem(this.key);
            if (saved) {
                const decoded = atob(saved);
                this.data = JSON.parse(decoded);
            }
        } catch (e) {
            console.error('Data corrupted');
        }
    },
    save() {
        try {
            const encoded = btoa(JSON.stringify(this.data));
            localStorage.setItem(this.key, encoded);
            UIManager.updateStats();
        } catch (e) {}
    },
    addCoins(amount) {
        this.data.coins += amount;
        this.save();
    },
    addGame() {
        this.data.gamesPlayed++;
        this.save();
    }
};

const UIManager = {
    init() {
        StateManager.load();
        this.initTelegram();
        this.updateStats();
        this.renderGamesList();
        this.renderLeaderboard();
    },
    initTelegram() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready();
                tg.expand();
                if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
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
        document.getElementById('prof-games').textContent = StateManager.data.gamesPlayed;
    },
    switchTab(id, btn) {
        document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        btn.classList.add('active');
        if (id === 'leaderboard') this.renderLeaderboard();
    },
    toast(msg) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        container.appendChild(el);
        AudioEngine.play(800, 'triangle', 0.1);
        setTimeout(() => {
            el.classList.add('hiding');
            setTimeout(() => el.remove(), 300);
        }, 2500);
    },
    renderGamesList() {
        const games = [
            { id: 'lumberjack', icon: '🪓', title: 'چوب‌بر', desc: 'با سرعت درخت‌ها را قطع کن' },
            { id: 'rocket', icon: '🚀', title: 'سفر موشک', desc: 'از سیارک‌ها فرار کن' },
            { id: 'minesweeper', icon: '💣', title: 'مین‌یاب', desc: 'الماس پیدا کن، مراقب بمب باش' },
            { id: 'crash', icon: '📈', title: 'Crash', desc: 'قبل از سقوط خارج شو' },
            { id: 'dice', icon: '🎲', title: 'تاس', desc: 'بالاتر یا پایین‌تر از ۵۰' },
            { id: 'tictactoe', icon: '⭕', title: 'دوز PvP', desc: 'مبارزه با هوش مصنوعی' },
            { id: 'memory', icon: '🧠', title: 'حافظه', desc: 'کارت‌های همسان را پیدا کن' },
            { id: 'reaction', icon: '⚡', title: 'واکنش', desc: 'به محض سبز شدن کلیک کن' },
            { id: 'aim', icon: '🎯', title: 'هدف‌زنی', desc: 'در ۱۵ ثانیه بیشترین هدف را بزن' },
            { id: 'wheel', icon: '🎡', title: 'گردونه', desc: 'شانست رو امتحان کن' },
            { id: 'higher', icon: '🃏', title: 'بالا/پایین', desc: 'عدد بعدی را حدس بزن' },
            { id: 'color', icon: '🎨', title: 'تطبیق رنگ', desc: 'رنگ نوشته را تشخیص بده' }
        ];
        const container = document.getElementById('games-list');
        container.innerHTML = games.map(g => `
            <div class="game-card" onclick="GameManager.open('${g.id}')">
                <div class="game-icon">${g.icon}</div>
                <div class="game-title">${g.title}</div>
                <div class="game-desc">${g.desc}</div>
            </div>
        `).join('');
    },
    renderLeaderboard() {
        const bots = [
            { name: 'Rex', score: 12500 },
            { name: 'Nova', score: 9800 },
            { name: 'Zed', score: 8400 },
            { name: 'Kira', score: 7200 },
            { name: 'Jax', score: 6100 }
        ].sort((a, b) => b.score - a.score);
        
        let html = bots.map((b, i) => `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">${i + 1}</span>
                <span class="leaderboard-name">${b.name}</span>
                <span class="leaderboard-score">${b.score.toLocaleString()}</span>
            </div>
        `).join('');
        
        html += `
            <div class="leaderboard-row" style="background:rgba(0,229,255,0.05);">
                <span class="leaderboard-rank">-</span>
                <span class="leaderboard-name" style="color:var(--primary);">شما</span>
                <span class="leaderboard-score" style="color:var(--primary);">${StateManager.data.coins.toLocaleString()}</span>
            </div>
        `;
        document.getElementById('leaderboard-list').innerHTML = html;
    }
};

const GameManager = {
    currentGame: null,
    open(id) {
        document.getElementById('game-modal').classList.add('active');
        const title = document.getElementById('m-title');
        const desc = document.getElementById('m-desc');
        const content = document.getElementById('m-content');
        content.innerHTML = '';
        
        const gameInfo = {
            lumberjack: { t: '🪓 چوب‌بر', d: 'درخت را از سمت درست بزن تا قطع شود. یک اشتباه مساوی با باخت است!' },
            rocket: { t: '🚀 سفر موشک', d: 'با کشیدن انگشت، سفینه را هدایت کن و از سیارک‌ها دوری کن.' },
            minesweeper: { t: '💣 مین‌یاب', d: 'الماس‌ها را پیدا کن. اگر روی بمب کلیک کنی، بازی تمام می‌شود.' },
            crash: { t: '📈 Crash', d: 'ضریب بالا می‌رود. قبل از اینکه سقوط کند، خارج شو!' },
            dice: { t: '🎲 تاس', d: 'حدس بزن عدد رول شده بالاتر از ۵۰ است یا پایین‌تر.' },
            tictactoe: { t: '⭕ دوز PvP', d: 'در برابر هوش مصنوعی سطح سخت بازی کن.' },
            memory: { t: '🧠 حافظه', d: 'کارت‌های همسان را با کمترین تلاش پیدا کن.' },
            reaction: { t: '⚡ واکنش', d: 'به محض سبز شدن صفحه، سریع کلیک کن!' },
            aim: { t: '🎯 هدف‌زنی', d: 'در ۱۵ ثانیه به بیشترین تعداد هدف ممکن ضربه بزن.' },
            wheel: { t: '🎡 گردونه شانس', d: 'گردونه را بچرخان و جایزه بگیر.' },
            higher: { t: '🃏 بالا/پایین', d: 'حدس بزن عدد بعدی بزرگ‌تر است یا کوچک‌تر.' },
            color: { t: '🎨 تطبیق رنگ', d: 'رنگ نوشته را تشخیص بده، نه خود کلمه!' }
        };
        
        title.textContent = gameInfo[id].t;
        desc.textContent = gameInfo[id].d;
        
        GameCore.stopCurrent();
        
        if (id === 'lumberjack') Games.Lumberjack.start(content);
        else if (id === 'rocket') Games.Rocket.start(content);
        else if (id === 'minesweeper') Games.Minesweeper.start(content);
        else if (id === 'crash') Games.Crash.start(content);
        else if (id === 'dice') Games.Dice.start(content);
        else if (id === 'tictactoe') Games.TicTacToe.start(content);
        else if (id === 'memory') Games.Memory.start(content);
        else if (id === 'reaction') Games.Reaction.start(content);
        else if (id === 'aim') Games.Aim.start(content);
        else if (id === 'wheel') Games.Wheel.start(content);
        else if (id === 'higher') Games.Higher.start(content);
        else if (id === 'color') Games.Color.start(content);
    },
    close() {
        document.getElementById('game-modal').classList.remove('active');
        GameCore.stopCurrent();
        StateManager.addGame();
    }
};

const GameCore = {
    intervals: [],
    animations: [],
    timeouts: [],
    setInterval(fn, ms) {
        const id = window.setInterval(fn, ms);
        this.intervals.push(id);
        return id;
    },
    requestAnimationFrame(fn) {
        const id = window.requestAnimationFrame(fn);
        this.animations.push(id);
        return id;
    },
    setTimeout(fn, ms) {
        const id = window.setTimeout(fn, ms);
        this.timeouts.push(id);
        return id;
    },
    stopCurrent() {
        this.intervals.forEach(window.clearInterval);
        this.animations.forEach(window.cancelAnimationFrame);
        this.timeouts.forEach(window.clearTimeout);
        this.intervals = [];
        this.animations = [];
        this.timeouts = [];
    }
};

const Games = {
    Lumberjack: {
        start(c) {
            c.innerHTML = `
                <div class="lj-tree" id="lj-tree">🌳</div>
                <div style="text-align:center; font-weight:bold; margin-bottom:10px;">امتیاز: <span id="lj-score" style="color:var(--gold)">0</span></div>
                <div class="lj-controls">
                    <button class="btn lj-btn" onclick="Games.Lumberjack.hit('left')">◀</button>
                    <button class="btn lj-btn" onclick="Games.Lumberjack.hit('right')">▶</button>
                </div>
            `;
            this.score = 0;
            this.active = true;
        },
        hit(dir) {
            if (!this.active) return;
            const tree = document.getElementById('lj-tree');
            if (Math.random() > 0.25) {
                this.score++;
                document.getElementById('lj-score').textContent = this.score;
                tree.style.transform = `rotate(${dir === 'left' ? '-10' : '10'}deg)`;
                setTimeout(() => tree.style.transform = 'rotate(0deg)', 100);
                AudioEngine.play(600 + Math.random() * 200, 'square', 0.05);
                StateManager.addCoins(1);
            } else {
                this.active = false;
                tree.textContent = '🪵';
                AudioEngine.play(150, 'sawtooth', 0.3);
                UIManager.toast(`باختی! امتیاز شما: ${this.score}`);
                setTimeout(() => GameManager.close(), 1500);
            }
        }
    },

    Rocket: {
        start(c) {
            c.innerHTML = `<div class="canvas-container"><canvas id="rocket-canvas"></canvas></div><div style="text-align:center;font-weight:bold;">امتیاز: <span id="r-score" style="color:var(--gold)">0</span></div>`;
            const canvas = document.getElementById('rocket-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            let player = { x: canvas.width / 2 - 15, y: canvas.height - 40, w: 30, h: 30 };
            let asteroids = [];
            let score = 0;
            let frame = 0;
            let active = true;

            const move = (e) => {
                const rect = canvas.getBoundingClientRect();
                let cx = e.clientX || (e.touches && e.touches[0].clientX);
                if (cx) player.x = Math.max(0, Math.min(canvas.width - player.w, cx - rect.left - 15));
            };
            canvas.addEventListener('mousemove', move);
            canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });

            const loop = () => {
                if (!active) return;
                frame++;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (frame % 30 === 0) asteroids.push({ x: Math.random() * canvas.width, y: -20, size: Math.random() * 15 + 10 });

                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.moveTo(player.x + 15, player.y);
                ctx.lineTo(player.x, player.y + 30);
                ctx.lineTo(player.x + 30, player.y + 30);
                ctx.fill();

                for (let i = asteroids.length - 1; i >= 0; i--) {
                    let a = asteroids[i];
                    a.y += 4;
                    ctx.fillStyle = '#ff0055';
                    ctx.beginPath();
                    ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
                    ctx.fill();

                    if (a.y + a.size > player.y && a.y - a.size < player.y + 30 && a.x > player.x && a.x < player.x + 30) {
                        active = false;
                        AudioEngine.play(150, 'sawtooth', 0.5);
                        StateManager.addCoins(score);
                        UIManager.toast(`سقوط کردی! ${score} سکه گرفتی.`);
                        setTimeout(() => GameManager.close(), 1500);
                        return;
                    }
                    if (a.y > canvas.height) {
                        asteroids.splice(i, 1);
                        score++;
                        document.getElementById('r-score').textContent = score;
                    }
                }
                GameCore.requestAnimationFrame(loop);
            };
            loop();
        }
    },

    Minesweeper: {
        start(c) {
            c.innerHTML = `
                <div class="mine-grid" id="mine-grid"></div>
                <div style="text-align:center;font-weight:bold; margin-bottom:10px;">امتیاز: <span id="mine-score" style="color:var(--gold)">0</span></div>
            `;
            const grid = document.getElementById('mine-grid');
            let score = 0;
            let active = true;
            let bombs = new Set();
            while (bombs.size < 5) bombs.add(Math.floor(Math.random() * 25));

            for (let i = 0; i < 25; i++) {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.onclick = () => {
                    if (!active || cell.classList.contains('diamond') || cell.classList.contains('bomb')) return;
                    if (bombs.has(i)) {
                        cell.classList.add('bomb');
                        cell.textContent = '💥';
                        active = false;
                        AudioEngine.play(150, 'sawtooth', 0.5);
                        StateManager.addCoins(score);
                        UIManager.toast(`باختی! ${score} سکه گرفتی.`);
                        setTimeout(() => GameManager.close(), 1500);
                    } else {
                        cell.classList.add('diamond');
                        cell.textContent = '💎';
                        score += 20;
                        AudioEngine.play(800, 'sine', 0.1);
                        document.getElementById('mine-score').textContent = score;
                    }
                };
                grid.appendChild(cell);
            }
        }
    },

    Crash: {
        start(c) {
            c.innerHTML = `
                <div style="text-align:center; font-size:50px; font-weight:900; color:var(--primary); margin:20px 0;" id="crash-mult">1.00x</div>
                <button class="btn btn-gold" id="crash-cashout" style="display:none;">خروج (Cashout)</button>
                <button class="btn" id="crash-start">شروع با 100 سکه</button>
                <div id="crash-msg" style="text-align:center; margin-top:15px; font-weight:bold;"></div>
            `;
            let mult = 1.0;
            let isCrashed = false;
            let isPlaying = false;
            let interval = null;
            
            const startBtn = document.getElementById('crash-start');
            const cashoutBtn = document.getElementById('crash-cashout');
            const multText = document.getElementById('crash-mult');
            const msg = document.getElementById('crash-msg');

            startBtn.onclick = () => {
                if (StateManager.data.coins < 100) return UIManager.toast('سکه کافی نیست!');
                StateManager.data.coins -= 100;
                StateManager.save();
                mult = 1.0;
                isCrashed = false;
                isPlaying = true;
                multText.textContent = '1.00x';
                multText.style.color = 'var(--primary)';
                msg.textContent = '';
                startBtn.style.display = 'none';
                cashoutBtn.style.display = 'block';
                
                const crashPoint = Math.max(1.01, 0.99 / Math.random());
                
                interval = GameCore.setInterval(() => {
                    if (isCrashed) return;
                    mult += 0.05 * mult;
                    multText.textContent = mult.toFixed(2) + 'x';
                    
                    if (mult >= crashPoint) {
                        isCrashed = true;
                        GameCore.intervals = GameCore.intervals.filter(id => id !== interval);
                        window.clearInterval(interval);
                        multText.textContent = 'CRASHED!';
                        multText.style.color = 'var(--secondary)';
                        cashoutBtn.style.display = 'none';
                        startBtn.style.display = 'block';
                        msg.textContent = 'باختی!';
                        msg.style.color = 'var(--secondary)';
                        isPlaying = false;
                    }
                }, 100);
            };

            cashoutBtn.onclick = () => {
                if (!isPlaying || isCrashed) return;
                isPlaying = false;
                GameCore.intervals = GameCore.intervals.filter(id => id !== interval);
                window.clearInterval(interval);
                const win = Math.floor(100 * mult);
                StateManager.addCoins(win);
                cashoutBtn.style.display = 'none';
                startBtn.style.display = 'block';
                msg.textContent = `بردی! +${win} سکه`;
                msg.style.color = 'var(--success)';
            };
        }
    },

    Dice: {
        start(c) {
            c.innerHTML = `
                <div style="text-align:center; font-size:60px; margin:20px 0;" id="dice-visual">🎲</div>
                <div style="text-align:center; font-weight:bold; margin-bottom:15px;">عدد: <span id="dice-num" style="color:var(--gold)">-</span></div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-gold" onclick="Games.Dice.play('over')">بالاتر از 50</button>
                    <button class="btn btn-danger" onclick="Games.Dice.play('under')">پایین‌تر از 50</button>
                </div>
                <div id="dice-res" style="text-align:center; margin-top:15px; font-weight:bold;"></div>
            `;
        },
        play(type) {
            if (StateManager.data.coins < 100) return UIManager.toast('سکه کافی نیست!');
            StateManager.data.coins -= 100;
            StateManager.save();
            const roll = Math.floor(Math.random() * 100) + 1;
            document.getElementById('dice-num').textContent = roll;
            const res = document.getElementById('dice-res');
            AudioEngine.play(400, 'sine', 0.1);
            
            setTimeout(() => {
                if ((type === 'over' && roll > 50) || (type === 'under' && roll < 50)) {
                    StateManager.addCoins(198);
                    res.textContent = 'بردی! +198 سکه';
                    res.style.color = 'var(--success)';
                    AudioEngine.play(1000, 'sine', 0.2);
                } else {
                    res.textContent = 'باختی!';
                    res.style.color = 'var(--secondary)';
                    AudioEngine.play(150, 'sawtooth', 0.2);
                }
            }, 500);
        }
    },

    TicTacToe: {
        start(c) {
            c.innerHTML = `
                <div id="ttt-grid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:15px;"></div>
                <div id="ttt-status" style="text-align:center; font-weight:bold; color:var(--primary);">نوبت شما (X)</div>
                <button class="btn btn-danger" onclick="GameManager.close()">انصراف</button>
            `;
            this.board = Array(9).fill('');
            this.active = true;
            this.render();
        },
        render() {
            const g = document.getElementById('ttt-grid');
            g.innerHTML = '';
            this.board.forEach((v, i) => {
                const cell = document.createElement('div');
                cell.style.cssText = 'aspect-ratio:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:10px; display:flex; justify-content:center; align-items:center; font-size:32px; font-weight:900; cursor:pointer;';
                cell.textContent = v;
                cell.style.color = v === 'X' ? 'var(--primary)' : 'var(--secondary)';
                cell.onclick = () => this.play(i);
                g.appendChild(cell);
            });
        },
        checkWin(b) {
            const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (let w of wins) {
                if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) return b[w[0]];
            }
            return b.includes('') ? null : 'draw';
        },
        minimax(b, depth, isMax) {
            let res = this.checkWin(b);
            if (res === 'X') return -10 + depth;
            if (res === 'O') return 10 - depth;
            if (res === 'draw') return 0;
            
            if (isMax) {
                let best = -Infinity;
                for (let i = 0; i < 9; i++) if (!b[i]) {
                    b[i] = 'O';
                    best = Math.max(best, this.minimax(b, depth + 1, false));
                    b[i] = '';
                }
                return best;
            } else {
                let best = Infinity;
                for (let i = 0; i < 9; i++) if (!b[i]) {
                    b[i] = 'X';
                    best = Math.min(best, this.minimax(b, depth + 1, true));
                    b[i] = '';
                }
                return best;
            }
        },
        play(i) {
            if (!this.active || this.board[i]) return;
            this.board[i] = 'X';
            this.render();
            AudioEngine.play(600, 'sine', 0.1);
            
            let res = this.checkWin(this.board);
            if (res) return this.finish(res);
            
            document.getElementById('ttt-status').textContent = 'ربات در حال فکر کردن...';
            GameCore.setTimeout(() => {
                let bestScore = -Infinity, move = -1;
                for (let j = 0; j < 9; j++) if (!this.board[j]) {
                    this.board[j] = 'O';
                    let score = this.minimax(this.board, 0, false);
                    this.board[j] = '';
                    if (score > bestScore) { bestScore = score; move = j; }
                }
                this.board[move] = 'O';
                this.render();
                AudioEngine.play(300, 'sine', 0.1);
                
                res = this.checkWin(this.board);
                if (res) return this.finish(res);
                document.getElementById('ttt-status').textContent = 'نوبت شما (X)';
            }, 400);
        },
        finish(res) {
            this.active = false;
            const s = document.getElementById('ttt-status');
            if (res === 'X') {
                s.textContent = 'شما بردید! +100 سکه';
                StateManager.addCoins(100);
                AudioEngine.play(1000, 'triangle', 0.3);
            } else if (res === 'O') {
                s.textContent = 'ربات برد!';
                AudioEngine.play(150, 'sawtooth', 0.3);
            } else {
                s.textContent = 'مساوی!';
            }
        }
    },

    Memory: {
        start(c) {
            c.innerHTML = `
                <div id="mem-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:15px;"></div>
                <div style="text-align:center; font-weight:bold;">جفت‌های پیدا شده: <span id="mem-score" style="color:var(--gold)">0</span></div>
            `;
            const emojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒'];
            this.cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
            this.opened = [];
            this.matched = 0;
            this.locked = false;
            this.render();
        },
        render() {
            const g = document.getElementById('mem-grid');
            g.innerHTML = '';
            this.cards.forEach((card, i) => {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.id = 'mem-' + i;
                cell.onclick = () => this.flip(i, card);
                g.appendChild(cell);
            });
        },
        flip(i, card) {
            if (this.locked || this.opened.length === 2) return;
            const el = document.getElementById('mem-' + i);
            if (el.textContent) return;
            
            el.textContent = card;
            el.classList.add('diamond');
            AudioEngine.play(600, 'sine', 0.05);
            this.opened.push({ i, card });
            
            if (this.opened.length === 2) {
                this.locked = true;
                if (this.opened[0].card === this.opened[1].card) {
                    this.matched++;
                    document.getElementById('mem-score').textContent = this.matched;
                    StateManager.addCoins(20);
                    this.opened = [];
                    this.locked = false;
                    if (this.matched === 6) {
                        UIManager.toast('آفرین! بردی.');
                        GameCore.setTimeout(() => GameManager.close(), 1500);
                    }
                } else {
                    GameCore.setTimeout(() => {
                        document.getElementById('mem-' + this.opened[0].i).textContent = '';
                        document.getElementById('mem-' + this.opened[0].i).classList.remove('diamond');
                        document.getElementById('mem-' + this.opened[1].i).textContent = '';
                        document.getElementById('mem-' + this.opened[1].i).classList.remove('diamond');
                        this.opened = [];
                        this.locked = false;
                    }, 800);
                }
            }
        }
    },

    Reaction: {
        start(c) {
            c.innerHTML = `
                <div id="reaction-box" style="width:100%; height:200px; background:var(--secondary); border-radius:16px; display:flex; justify-content:center; align-items:center; font-size:20px; font-weight:900; cursor:pointer; color:#fff;">منتظر بمان...</div>
                <div id="reaction-res" style="text-align:center; margin-top:15px; font-weight:bold;"></div>
            `;
            const box = document.getElementById('reaction-box');
            let start = 0;
            
            GameCore.setTimeout(() => {
                box.style.background = 'var(--success)';
                box.textContent = 'کلیک کن!';
                AudioEngine.play(900, 'sine', 0.1);
                start = Date.now();
            }, Math.random() * 3000 + 1500);
            
            box.onclick = () => {
                if (!start) {
                    box.textContent = 'خیلی زود زدی!';
                    box.style.background = 'var(--secondary)';
                    AudioEngine.play(150, 'sawtooth', 0.2);
                } else {
                    const t = Date.now() - start;
                    box.textContent = t + ' میلی‌ثانیه';
                    box.style.background = 'var(--primary)';
                    const pts = Math.max(1, Math.floor(1000 / t) * 5);
                    StateManager.addCoins(pts);
                    document.getElementById('reaction-res').textContent = 'امتیاز: ' + pts;
                    AudioEngine.play(1000, 'sine', 0.2);
                    GameCore.setTimeout(() => GameManager.close(), 2000);
                }
            };
        }
    },

    Aim: {
        start(c) {
            c.innerHTML = `
                <div style="font-weight:bold; color:var(--secondary); margin-bottom:10px; text-align:center;">زمان: <span id="aim-time">15</span></div>
                <div id="aim-area" style="width:100%; height:250px; background:rgba(0,0,0,0.5); border-radius:16px; border:1px solid var(--primary); position:relative; overflow:hidden;"></div>
                <div id="aim-score" style="text-align:center; margin-top:10px; font-weight:bold;">امتیاز: 0</div>
            `;
            const area = document.getElementById('aim-area');
            let time = 15;
            let score = 0;
            
            const spawn = () => {
                if (time <= 0) return;
                const el = document.createElement('div');
                el.textContent = '🎯';
                el.style.cssText = 'position:absolute; font-size:36px; cursor:pointer; left:' + (Math.random() * 80) + '%; top:' + (Math.random() * 80) + '%; filter: drop-shadow(0 0 5px var(--primary));';
                el.onclick = () => {
                    el.remove();
                    score += 10;
                    StateManager.addCoins(10);
                    document.getElementById('aim-score').textContent = 'امتیاز: ' + score;
                    AudioEngine.play(850, 'square', 0.05);
                    spawn();
                };
                area.appendChild(el);
                GameCore.setTimeout(() => { if (el.parentNode) el.remove(); }, 800);
            };
            
            spawn();
            GameCore.setInterval(() => {
                time--;
                document.getElementById('aim-time').textContent = time;
                if (time <= 0) {
                    UIManager.toast('پایان بازی!');
                    GameCore.setTimeout(() => GameManager.close(), 1000);
                }
            }, 1000);
        }
    },

    Wheel: {
        start(c) {
            c.innerHTML = `
                <div style="font-size:80px; margin:20px 0; text-align:center; transition:transform 1s;" id="wheel-icon">🎡</div>
                <button class="btn btn-gold" onclick="Games.Wheel.spin()">چرخاندن (هزینه: 50)</button>
                <div id="wheel-res" style="text-align:center; margin-top:15px; font-weight:bold;"></div>
            `;
        },
        spin() {
            if (StateManager.data.coins < 50) return UIManager.toast('سکه کافی نیست!');
            StateManager.data.coins -= 50;
            StateManager.save();
            
            const icon = document.getElementById('wheel-icon');
            icon.style.transform = `rotate(${Math.random() * 720 + 720}deg)`;
            AudioEngine.play(400, 'triangle', 0.4);
            
            GameCore.setTimeout(() => {
                const w = Math.floor(Math.random() * 200) + 10;
                StateManager.addCoins(w);
                document.getElementById('wheel-res').textContent = 'بردی! +' + w;
                AudioEngine.play(900, 'sine', 0.3);
            }, 1000);
        }
    },

    Higher: {
        start(c) {
            c.innerHTML = `
                <h1 id="higher-num" style="font-size:50px; margin:20px 0; color:var(--primary); text-align:center;">?</h1>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-gold" onclick="Games.Higher.guess(true)">بالاتر</button>
                    <button class="btn btn-danger" onclick="Games.Higher.guess(false)">پایین‌تر</button>
                </div>
                <div id="higher-res" style="text-align:center; margin-top:15px; font-weight:bold;"></div>
            `;
            this.cur = Math.floor(Math.random() * 100);
            document.getElementById('higher-num').textContent = this.cur;
        },
        guess(up) {
            const next = Math.floor(Math.random() * 100);
            const res = document.getElementById('higher-res');
            if ((up && next > this.cur) || (!up && next < this.cur)) {
                res.textContent = 'بردی! +15';
                res.style.color = 'var(--success)';
                StateManager.addCoins(15);
                AudioEngine.play(900, 'sine', 0.1);
            } else {
                res.textContent = 'باختی!';
                res.style.color = 'var(--secondary)';
                AudioEngine.play(150, 'sawtooth', 0.1);
            }
            this.cur = next;
            document.getElementById('higher-num').textContent = this.cur;
        }
    },

    Color: {
        start(c) {
            const colors = ['قرمز', 'آبی', 'سبز', 'زرد'];
            const cHex = { 'قرمز': '#ff0055', 'آبی': '#00e5ff', 'سبز': '#00ff88', 'زرد': '#ffcc00' };
            const word = colors[Math.floor(Math.random() * 4)];
            const color = colors[Math.floor(Math.random() * 4)];
            
            c.innerHTML = `
                <h1 style="font-size:40px; color:${cHex[color]}; margin:20px 0; text-align:center; text-shadow:0 0 20px ${cHex[color]};">${word}</h1>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;" id="color-grid"></div>
            `;
            
            document.getElementById('color-grid').innerHTML = colors.map(cl => `
                <button class="btn" style="border-color:${cHex[cl]}; color:${cHex[cl]};" onclick="Games.Color.pick('${cl}', '${color}')">${cl}</button>
            `).join('');
        },
        pick(picked, correct) {
            if (picked === correct) {
                StateManager.addCoins(15);
                UIManager.toast('درست! +15');
                AudioEngine.play(900, 'sine', 0.1);
                GameCore.setTimeout(() => GameManager.close(), 800);
            } else {
                UIManager.toast('اشتباه!');
                AudioEngine.play(150, 'sawtooth', 0.1);
            }
        }
    }
};

window.onload = () => {
    UIManager.init();
};
