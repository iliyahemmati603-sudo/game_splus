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
    key: 'GalacticEmpire_V3',
    data: {
        coins: 1000,
        gamesPlayed: 0,
        username: 'کاوشگر',
        userId: '0000',
        clan: null,
        clanBossHp: 1000,
        clanTreasury: 0,
        clanChat: []
    },
    load() {
        try {
            const saved = localStorage.getItem(this.key);
            if (saved) this.data = JSON.parse(atob(saved));
        } catch (e) {}
    },
    save() {
        try {
            localStorage.setItem(this.key, btoa(JSON.stringify(this.data)));
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
        ClanManager.updateUI();
    },
    initTelegram() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready(); tg.expand();
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
        document.getElementById('prof-clan-name').textContent = StateManager.data.clan ? StateManager.data.clan : 'بدون اتحادیه';
    },
    switchTab(id, btn) {
        document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        if(btn) btn.classList.add('active');
    },
    toast(msg) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        container.appendChild(el);
        AudioEngine.play(800, 'triangle', 0.1);
        setTimeout(() => { el.classList.add('hiding'); setTimeout(() => el.remove(), 300); }, 2500);
    },
    renderGamesList() {
        const games = [
            { id: 'runner', icon: '🚀', title: 'فرار کهکشانی', desc: 'مهارت و سرعت' },
            { id: 'minesweeper', icon: '💣', title: 'مین‌یاب', desc: 'ریسک و استراتژی' },
            { id: 'duel', icon: '⚔️', title: 'نبرد PvP', desc: 'مبارزه با هوش مصنوعی' },
            { id: 'memory', icon: '🧠', title: 'ماتریس حافظه', desc: 'چالش ذهنی' }
        ];
        document.getElementById('games-list').innerHTML = games.map(g => `
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
        if (!name) return UIManager.toast('نام را وارد کنید');
        if (StateManager.data.coins < 5000) return UIManager.toast('5000 سکه نیاز است');
        StateManager.data.coins -= 5000;
        StateManager.data.clan = name;
        StateManager.data.clanBossHp = 1000;
        StateManager.data.clanChat = [{ author: 'سیستم', text: 'اتحادیه با موفقیت ساخته شد.', mine: false }];
        StateManager.save();
        this.updateUI();
        UIManager.toast('اتحادیه ساخته شد!');
        this.renderChat();
    },
    join() {
        const name = document.getElementById('clan-input').value.trim();
        if (!name) return UIManager.toast('نام را وارد کنید');
        StateManager.data.clan = name;
        StateManager.data.clanBossHp = 1000;
        StateManager.data.clanChat = [{ author: 'سیستم', text: 'شما به اتحادیه پیوستید.', mine: false }];
        StateManager.save();
        this.updateUI();
        UIManager.toast('به اتحادیه پیوستید!');
        this.renderChat();
    },
    leave() {
        StateManager.data.clan = null;
        StateManager.save();
        this.updateUI();
    },
    updateUI() {
        if (StateManager.data.clan) {
            document.getElementById('clan-lobby').style.display = 'none';
            document.getElementById('clan-room').style.display = 'block';
            document.getElementById('c-name').textContent = StateManager.data.clan;
            document.getElementById('c-leader').textContent = StateManager.data.username;
            document.getElementById('c-members').textContent = Math.floor(Math.random() * 20) + 5;
            this.updateBossUI();
        } else {
            document.getElementById('clan-lobby').style.display = 'block';
            document.getElementById('clan-room').style.display = 'none';
        }
    },
    updateBossUI() {
        let hp = StateManager.data.clanBossHp;
        document.getElementById('boss-hp-text').textContent = `${hp} / 1000`;
        document.getElementById('boss-health-bar').style.width = (hp / 1000 * 100) + '%';
    },
    attackBoss() {
        if (StateManager.data.coins < 10) return UIManager.toast('سکه کافی نیست');
        StateManager.data.coins -= 10;
        let dmg = Math.floor(Math.random() * 50) + 10;
        StateManager.data.clanBossHp -= dmg;
        if (StateManager.data.clanBossHp < 0) StateManager.data.clanBossHp = 0;
        StateManager.save();
        this.updateBossUI();
        UIManager.toast(`شما ${dmg} آسیب زدید!`);
        AudioEngine.play(400, 'sawtooth', 0.1);
        
        if (StateManager.data.clanBossHp === 0) {
            UIManager.toast('باس نابود شد! +500 سکه');
            StateManager.data.coins += 500;
            StateManager.data.clanBossHp = 1000;
            StateManager.save();
            this.updateBossUI();
            this.addMsg('سیستم', 'باس اتحادیه نابود شد! جایزه دریافت کردید.');
        } else {
            setTimeout(() => {
                let botDmg = Math.floor(Math.random() * 40) + 5;
                StateManager.data.clanBossHp -= botDmg;
                if (StateManager.data.clanBossHp < 0) StateManager.data.clanBossHp = 0;
                StateManager.save();
                this.updateBossUI();
                const bots = ['Nova', 'Rex', 'Zed'];
                this.addMsg(bots[Math.floor(Math.random()*3)], `حمله کردم! ${botDmg} آسیب زدم.`);
            }, 1000 + Math.random() * 2000);
        }
    },
    donate() {
        if (StateManager.data.coins < 100) return UIManager.toast('سکه کافی نیست');
        StateManager.data.coins -= 100;
        StateManager.data.clanTreasury += 100;
        StateManager.save();
        UIManager.toast('100 سکه به خزانه اضافه شد!');
        this.addMsg('سیستم', `${StateManager.data.username} 100 سکه به خزانه اهدا کرد.`);
    },
    sendMsg() {
        const input = document.getElementById('clan-chat-input');
        const text = input.value.trim();
        if (!text) return;
        this.addMsg(StateManager.data.username, text, true);
        input.value = '';
        
        setTimeout(() => {
            const bots = ['Nova', 'Rex', 'Zed'];
            const bot = bots[Math.floor(Math.random() * 3)];
            const replies = ['عالیه! بریم جلو.', 'منم دمج می‌زنم.', 'کلن ما قوی‌تر میشه!', 'کی باس رو می‌زنه؟'];
            this.addMsg(bot, replies[Math.floor(Math.random() * replies.length)]);
        }, 1500 + Math.random() * 2000);
    },
    addMsg(author, text, mine = false) {
        StateManager.data.clanChat.push({ author, text, mine });
        StateManager.save();
        this.renderChat();
    },
    renderChat() {
        const box = document.getElementById('clan-chat');
        if (!box) return;
        box.innerHTML = StateManager.data.clanChat.map(m => `
            <div class="msg-bubble ${m.mine ? 'msg-mine' : 'msg-other'}">
                <span class="msg-author">${m.author}</span>
                <div>${m.text}</div>
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
            runner: { t: '🚀 فرار کهکشانی', d: 'با کشیدن انگشت سفینه را هدایت کن و از سیارک‌ها دوری کن.' },
            minesweeper: { t: '💣 مین‌یاب', d: 'الماس پیدا کن و ضریب را بالا ببر. مراقب بمب‌ها باش.' },
            duel: { t: '⚔️ نبرد PvP', d: 'در برابر هوش مصنوعی سطح سخت بازی کن.' },
            memory: { t: '🧠 ماتریس حافظه', d: 'کارت‌های همسان را با کمترین تلاش پیدا کن.' }
        };
        
        title.textContent = info[id].t;
        desc.textContent = info[id].d;
        
        GameCore.stop();
        
        if (id === 'runner') Games.Runner.start(content);
        else if (id === 'minesweeper') Games.Minesweeper.start(content);
        else if (id === 'duel') Games.Duel.start(content);
        else if (id === 'memory') Games.Memory.start(content);
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
    Runner: {
        start(c) {
            c.innerHTML = `<div class="canvas-container"><canvas id="cvs"></canvas></div><div style="text-align:center;font-weight:bold;">امتیاز: <span id="r-sc" style="color:var(--gold)">0</span></div>`;
            const cvs = document.getElementById('cvs');
            const ctx = cvs.getContext('2d');
            cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight;
            
            let p = { x: cvs.width / 2 - 15, y: cvs.height - 40, w: 30, h: 30 };
            let ast = [], sc = 0, f = 0, active = true;

            const mv = (e) => {
                const rect = cvs.getBoundingClientRect();
                let cx = e.clientX || (e.touches && e.touches[0].clientX);
                if (cx) p.x = Math.max(0, Math.min(cvs.width - p.w, cx - rect.left - 15));
            };
            cvs.addEventListener('mousemove', mv);
            cvs.addEventListener('touchmove', (e) => { e.preventDefault(); mv(e); }, { passive: false });

            const loop = () => {
                if (!active) return;
                f++;
                ctx.clearRect(0, 0, cvs.width, cvs.height);
                
                if (f % 30 === 0) ast.push({ x: Math.random() * cvs.width, y: -20, s: Math.random() * 15 + 10 });
                
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath(); ctx.moveTo(p.x + 15, p.y); ctx.lineTo(p.x, p.y + 30); ctx.lineTo(p.x + 30, p.y + 30); ctx.fill();

                for (let i = ast.length - 1; i >= 0; i--) {
                    let a = ast[i];
                    a.y += 4;
                    ctx.fillStyle = '#ff0055';
                    ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, Math.PI * 2); ctx.fill();
                    
                    if (a.y + a.s > p.y && a.y - a.s < p.y + 30 && a.x > p.x && a.x < p.x + 30) {
                        active = false;
                        AudioEngine.play(150, 'sawtooth', 0.5);
                        StateManager.addCoins(sc);
                        UIManager.toast(`سقوط! ${sc} سکه گرفتید.`);
                        setTimeout(() => GameManager.close(), 1500);
                        return;
                    }
                    if (a.y > cvs.height) { ast.splice(i, 1); sc++; document.getElementById('r-sc').textContent = sc; }
                }
                GameCore.rAF(loop);
            };
            loop();
        }
    },

    Minesweeper: {
        start(c) {
            c.innerHTML = `<div class="mine-grid" id="mg"></div><div style="text-align:center;font-weight:bold;margin-bottom:10px;">امتیاز: <span id="m-sc" style="color:var(--gold)">0</span></div>`;
            const g = document.getElementById('mg');
            let sc = 0, active = true, boms = new Set();
            while(boms.size < 5) boms.add(Math.floor(Math.random() * 25));
            
            for(let i=0; i<25; i++) {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.onclick = () => {
                    if(!active || cell.classList.contains('diamond') || cell.classList.contains('bomb')) return;
                    if(boms.has(i)) {
                        cell.classList.add('bomb'); cell.textContent = '💥';
                        active = false;
                        AudioEngine.play(150, 'sawtooth', 0.5);
                        StateManager.addCoins(sc);
                        UIManager.toast(`باختی! ${sc} سکه گرفتید.`);
                        setTimeout(() => GameManager.close(), 1500);
                    } else {
                        cell.classList.add('diamond'); cell.textContent = '💎';
                        sc += 20; AudioEngine.play(800, 'sine', 0.1);
                        document.getElementById('m-sc').textContent = sc;
                    }
                };
                g.appendChild(cell);
            }
        }
    },

    Duel: {
        start(c) {
            c.innerHTML = `<div id="dg" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:15px;"></div><div id="ds" style="text-align:center;font-weight:bold;color:var(--primary);">نوبت شما (X)</div><button class="btn btn-danger" onclick="GameManager.close()">انصراف</button>`;
            this.b = Array(9).fill('');
            this.active = true;
            this.render();
        },
        render() {
            const g = document.getElementById('dg');
            g.innerHTML = '';
            this.b.forEach((v, i) => {
                const cell = document.createElement('div');
                cell.style.cssText = 'aspect-ratio:1;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:center;align-items:center;font-size:32px;font-weight:900;cursor:pointer;';
                cell.textContent = v;
                cell.style.color = v === 'X' ? 'var(--primary)' : 'var(--secondary)';
                cell.onclick = () => this.play(i);
                g.appendChild(cell);
            });
        },
        check(b) {
            const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for(let i of w) if(b[i[0]] && b[i[0]] === b[i[1]] && b[i[1]] === b[i[2]]) return b[i[0]];
            return b.includes('') ? null : 'draw';
        },
        minimax(b, d, isMax) {
            let res = this.check(b);
            if(res === 'X') return -10 + d;
            if(res === 'O') return 10 - d;
            if(res === 'draw') return 0;
            
            if(isMax) {
                let best = -Infinity;
                for(let i=0; i<9; i++) if(!b[i]) { b[i]='O'; best = Math.max(best, this.minimax(b, d+1, false)); b[i]=''; }
                return best;
            } else {
                let best = Infinity;
                for(let i=0; i<9; i++) if(!b[i]) { b[i]='X'; best = Math.min(best, this.minimax(b, d+1, true)); b[i]=''; }
                return best;
            }
        },
        play(i) {
            if(!this.active || this.b[i]) return;
            this.b[i] = 'X'; this.render(); AudioEngine.play(600, 'sine', 0.1);
            let res = this.check(this.b);
            if(res) return this.finish(res);
            
            document.getElementById('ds').textContent = 'ربات در حال فکر کردن...';
            GameCore.setTimeout(() => {
                let best = -Infinity, mv = -1;
                for(let j=0; j<9; j++) if(!this.b[j]) {
                    this.b[j] = 'O'; let sc = this.minimax(this.b, 0, false); this.b[j] = '';
                    if(sc > best) { best = sc; mv = j; }
                }
                this.b[mv] = 'O'; this.render(); AudioEngine.play(300, 'sine', 0.1);
                res = this.check(this.b);
                if(res) return this.finish(res);
                document.getElementById('ds').textContent = 'نوبت شما (X)';
            }, 400);
        },
        finish(res) {
            this.active = false;
            const s = document.getElementById('ds');
            if(res === 'X') { s.textContent = 'شما بردید! +100 سکه'; StateManager.addCoins(100); AudioEngine.play(1000, 'triangle', 0.3); }
            else if(res === 'O') { s.textContent = 'ربات برد!'; AudioEngine.play(150, 'sawtooth', 0.3); }
            else { s.textContent = 'مساوی!'; }
        }
    },

    Memory: {
        start(c) {
            c.innerHTML = `<div id="mg" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:15px;"></div><div style="text-align:center;font-weight:bold;">جفت‌ها: <span id="ms" style="color:var(--gold)">0</span></div>`;
            const em = ['🍎','🍌','🍇','🍉','🍓','🍒'];
            this.cards = [...em, ...em].sort(() => Math.random() - 0.5);
            this.op = []; this.mt = 0; this.lock = false;
            this.render();
        },
        render() {
            const g = document.getElementById('mg');
            g.innerHTML = '';
            this.cards.forEach((card, i) => {
                const cell = document.createElement('div');
                cell.className = 'mine-cell'; cell.id = 'm-' + i;
                cell.onclick = () => this.flip(i, card);
                g.appendChild(cell);
            });
        },
        flip(i, card) {
            if(this.lock || this.op.length === 2) return;
            const el = document.getElementById('m-' + i);
            if(el.textContent) return;
            el.textContent = card; el.classList.add('diamond'); AudioEngine.play(600, 'sine', 0.05);
            this.op.push({ i, card });
            
            if(this.op.length === 2) {
                this.lock = true;
                if(this.op[0].card === this.op[1].card) {
                    this.mt++; document.getElementById('ms').textContent = this.mt;
                    StateManager.addCoins(20); this.op = []; this.lock = false;
                    if(this.mt === 6) { UIManager.toast('آفرین!'); GameCore.setTimeout(() => GameManager.close(), 1500); }
                } else {
                    GameCore.setTimeout(() => {
                        document.getElementById('m-' + this.op[0].i).textContent = '';
                        document.getElementById('m-' + this.op[0].i).classList.remove('diamond');
                        document.getElementById('m-' + this.op[1].i).textContent = '';
                        document.getElementById('m-' + this.op[1].i).classList.remove('diamond');
                        this.op = []; this.lock = false;
                    }, 800);
                }
            }
        }
    }
};

window.onload = () => { UIManager.init(); };
