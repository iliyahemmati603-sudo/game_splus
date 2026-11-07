window.Game_memory = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        const t = 60, avail = Math.min(this.w - 40, this.h - t - 100);
        this.cellSize = Math.floor(avail / 4);
        this.gridW = 4 * this.cellSize;
        this.gridH = 4 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = t + (this.h - t - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') { this.startGame(); return; }
            if (this.state !== 'playing' || this.lock) return;
            const r = this.canvas.getBoundingClientRect();
            const c = Math.floor((e.clientX - r.left - this.gridX) / this.cellSize);
            const rr = Math.floor((e.clientY - r.top - this.gridY) / this.cellSize);
            if (c >= 0 && c < 4 && rr >= 0 && rr < 4) this.flip(rr * 4 + c);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        const decks = [
            ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🥝', '🍍'],
            ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
            ['🚀', '👽', '🌍', '🌙', '⭐', '☄️', '🛸', '🌌'],
            ['😀', '😎', '😍', '🤔', '😴', '😭', '😡', '🤯']
        ];
        const d = decks[Math.floor(Math.random() * decks.length)];
        const gameEmojis = [...d, ...d].sort(() => Math.random() - 0.5);
        this.cards = gameEmojis.map(e => ({ emoji: e, flipped: true, matched: false, flipAnim: 1, pulseAnim: 0, errorAnim: 0 }));
        this.opened = [];
        this.matched = 0;
        this.moves = 0;
        this.score = 0;
        this.combo = 0;
        this.bestCombo = 0;
        this.lock = true;
        this.timeElapsed = 0;
        this.startTime = performance.now();
        this.revealTimer = 2.5;
        this.updateHud();
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">⏱ ${Math.floor(this.timeElapsed)}s · جفت ${this.matched}/8</div>`);
    }

    flip(idx) {
        const c = this.cards[idx];
        if (c.flipped || c.matched) return;
        c.flipped = true;
        c.flipAnim = 1;
        AudioEngine.tone(600, 0.08, 'sine', 0.1);
        Haptics.light();
        this.opened.push(idx);

        if (this.opened.length === 2) {
            this.lock = true;
            this.moves++;
            const [a, b] = this.opened;
            if (this.cards[a].emoji === this.cards[b].emoji) {
                this.combo++;
                this.bestCombo = Math.max(this.bestCombo, this.combo);
                const pts = 100 * (1 + Math.floor(this.combo / 2) * 0.5);
                setTimeout(() => {
                    this.cards[a].matched = true;
                    this.cards[b].matched = true;
                    this.cards[a].pulseAnim = 1;
                    this.cards[b].pulseAnim = 1;
                    this.matched++;
                    this.score += pts;
                    AudioEngine.win();
                    Haptics.success();
                    Camera.add(0.2);
                    const ax = this.gridX + (a % 4) * this.cellSize + this.cellSize / 2;
                    const ay = this.gridY + Math.floor(a / 4) * this.cellSize + this.cellSize / 2;
                    const bx = this.gridX + (b % 4) * this.cellSize + this.cellSize / 2;
                    const by = this.gridY + Math.floor(b / 4) * this.cellSize + this.cellSize / 2;
                    Particles.burst(ax, ay, 20, { color: '#2bff88', minSpeed: 100, maxSpeed: 300, gravity: 300 });
                    Particles.burst(bx, by, 20, { color: '#2bff88', minSpeed: 100, maxSpeed: 300, gravity: 300 });
                    this.opened = [];
                    this.lock = false;
                    this.updateHud();
                    if (this.matched === 8) this.gameOver(true);
                }, 500);
            } else {
                this.combo = 0;
                this.score = Math.max(0, this.score - 15);
                this.cards[a].errorAnim = 1;
                this.cards[b].errorAnim = 1;
                AudioEngine.hit();
                Haptics.heavy();
                Camera.add(0.4);
                setTimeout(() => {
                    this.cards[a].flipped = false;
                    this.cards[b].flipped = false;
                    this.cards[a].errorAnim = 0;
                    this.cards[b].errorAnim = 0;
                    this.opened = [];
                    this.lock = false;
                    this.updateHud();
                }, 900);
            }
        }
    }

    gameOver(win) {
        this.state = win ? 'won' : 'dead';
        if (win) {
            const tb = Math.max(0, 1000 - Math.floor(this.timeElapsed) * 10);
            const cb = this.bestCombo * 50;
            this.score += tb + cb;
            AudioEngine.win();
            Haptics.success();
            Camera.add(1);
        } else {
            AudioEngine.lose();
            Haptics.heavy();
        }
        setTimeout(() => App.gameOver('memory', this.score, { time: Math.floor(this.timeElapsed), combo: this.bestCombo }), 1000);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state === 'playing') {
            this.timeElapsed = (performance.now() - this.startTime) / 1000;
            this.updateHud();
            if (this.revealTimer > 0) {
                this.revealTimer -= dt;
                if (this.revealTimer <= 0) {
                    this.cards.forEach(c => { if (!c.matched) c.flipped = false; });
                    this.lock = false;
                    AudioEngine.tone(400, 0.2, 'triangle', 0.1);
                }
            }
        }
        for (const c of this.cards) {
            if (c.flipAnim > 0) c.flipAnim = Math.max(0, c.flipAnim - dt * 5);
            if (c.pulseAnim > 0) c.pulseAnim = Math.max(0, c.pulseAnim - dt * 4);
            if (c.errorAnim > 0) c.errorAnim = Math.max(0, c.errorAnim - dt * 3);
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#05070d');
        bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg;
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 40px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText('MEMORY MATCH', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Tahoma';
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        for (let i = 0; i < 16; i++) {
            const c = this.cards[i];
            let x = this.gridX + (i % 4) * this.cellSize + 5;
            let y = this.gridY + Math.floor(i / 4) * this.cellSize + 5;
            const w = this.cellSize - 10;
            
            let sx = 1;
            let sy = 1;
            if (c.flipAnim > 0) sx = Math.abs(Math.cos(c.flipAnim * Math.PI));
            if (c.pulseAnim > 0) {
                const s = 1 + Math.sin(c.pulseAnim * Math.PI) * 0.2;
                sx *= s;
                sy *= s;
            }
            if (c.errorAnim > 0) x += Math.sin(c.errorAnim * 50) * 8;

            ctx.save();
            ctx.translate(x + w / 2, y + w / 2);
            ctx.scale(sx, sy);
            ctx.translate(-x - w / 2, -y - w / 2);

            if (c.matched) {
                ctx.fillStyle = 'rgba(43,255,136,0.15)';
                ctx.shadowColor = '#2bff88';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
                else ctx.rect(x, y, w, w);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#2bff88';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (c.errorAnim > 0) {
                ctx.fillStyle = 'rgba(255,45,120,0.15)';
                ctx.shadowColor = '#ff2d78';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
                else ctx.rect(x, y, w, w);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ff2d78';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (c.flipped || c.flipAnim > 0.5) {
                ctx.fillStyle = 'rgba(0,229,255,0.15)';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
                else ctx.rect(x, y, w, w);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                const g = ctx.createLinearGradient(x, y, x + w, y + w);
                g.addColorStop(0, '#111a2e');
                g.addColorStop(1, '#0c1120');
                ctx.fillStyle = g;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
                else ctx.rect(x, y, w, w);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,229,255,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = 'rgba(0,229,255,0.4)';
                ctx.font = `bold ${w * 0.4}px Tahoma`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + w / 2, y + w / 2);
            }

            if (c.flipped || c.matched) {
                ctx.font = `${w * 0.55}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.emoji, x + w / 2, y + w / 2);
            }
            ctx.restore();
        }
        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_2048 = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        const t = 60, avail = Math.min(this.w - 40, this.h - t - 100);
        this.cellSize = Math.floor(avail / 4);
        this.gridW = 4 * this.cellSize;
        this.gridH = 4 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = t + (this.h - t - 100 - this.gridH) / 2;
        this.gap = Math.max(6, this.cellSize * 0.08);
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') this.startGame();
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._key = (e) => {
            if (this.state === 'menu' && (e.key === ' ' || e.key === 'Enter')) { this.startGame(); return; }
            if (this.state !== 'playing') return;
            const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
            if (m[e.key]) { e.preventDefault(); this.move(m[e.key]); }
        };
        window.addEventListener('keydown', this._key);

        this._start = null;
        this._down = (e) => { this._start = { x: e.clientX, y: e.clientY }; };
        this._up = (e) => {
            if (this.state !== 'playing' || !this._start) return;
            const dx = e.clientX - this._start.x, dy = e.clientY - this._start.y;
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) { this._start = null; return; }
            if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 'right' : 'left');
            else this.move(dy > 0 ? 'down' : 'up');
            this._start = null;
        };
        this.canvas.addEventListener('pointerdown', this._down);
        this.canvas.addEventListener('pointerup', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.board = Array.from({ length: 4 }, () => Array(4).fill(0));
        this.score = 0;
        this.won = false;
        this.moves = 0;
        this.animations = [];
        this.addTile();
        this.addTile();
        this.updateHud();
    }

    addTile() {
        const empty = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) empty.push({ r, c });
            }
        }
        if (!empty.length) return;
        const s = empty[Math.floor(Math.random() * empty.length)];
        const v = Math.random() < 0.9 ? 2 : 4;
        this.board[s.r][s.c] = v;
        this.animations.push({ r: s.r, c: s.c, val: v, type: 'spawn', progress: 0, duration: 0.2 });
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">حرکت ${this.moves}</div>`);
    }

    move(dir) {
        if (this.state !== 'playing') return;
        let moved = false;
        const b = this.board.map(r => r.slice());
        
        const merge = (line, r, c, dr, dc) => {
            const arr = line.filter(v => v !== 0);
            const out = [];
            for (let i = 0; i < arr.length; i++) {
                if (i < arr.length - 1 && arr[i] === arr[i + 1]) {
                    const m = arr[i] * 2;
                    out.push(m);
                    this.score += m;
                    i++;
                    moved = true;
                    const tr = r + out.length * dr;
                    const tc = c + out.length * dc;
                    this.animations.push({ r: tr, c: tc, val: m, type: 'merge', progress: 0, duration: 0.3 });
                    AudioEngine.tone(500 + Math.log2(m) * 60, 0.1, 'triangle', 0.1);
                    Haptics.light();
                } else {
                    out.push(arr[i]);
                }
            }
            while (out.length < 4) out.push(0);
            return out;
        };

        if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < 4; r++) {
                let row = b[r].slice();
                if (dir === 'right') row.reverse();
                row = merge(row, r, dir === 'right' ? 3 : 0, 0, dir === 'right' ? -1 : 1);
                if (dir === 'right') row.reverse();
                if (row.join() !== b[r].join()) moved = true;
                b[r] = row;
            }
        } else {
            for (let c = 0; c < 4; c++) {
                let col = b.map(r => r[c]);
                if (dir === 'down') col.reverse();
                col = merge(col, dir === 'down' ? 3 : 0, c, dir === 'down' ? -1 : 1, 0);
                if (dir === 'down') col.reverse();
                for (let r = 0; r < 4; r++) {
                    if (b[r][c] !== col[r]) moved = true;
                    b[r][c] = col[r];
                }
            }
        }

        if (moved) {
            this.board = b;
            this.moves++;
            this.addTile();
            this.updateHud();
            if (this.checkWin() && !this.won) {
                this.won = true;
                AudioEngine.win();
                Haptics.success();
                Camera.add(0.5);
            }
            if (this.checkLose()) this.gameOver(false);
        }
    }

    checkWin() {
        for (const r of this.board) for (const v of r) if (v >= 2048) return true;
        return false;
    }

    checkLose() {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) return false;
                if (c < 3 && this.board[r][c] === this.board[r][c + 1]) return false;
                if (r < 3 && this.board[r][c] === this.board[r + 1][c]) return false;
            }
        }
        return true;
    }

    gameOver(win) {
        this.state = win ? 'won' : 'dead';
        AudioEngine[win ? 'win' : 'lose']();
        Haptics[win ? 'success' : 'heavy']();
        Camera.add(win ? 0.5 : 1.5);
        setTimeout(() => App.gameOver('2048', this.score, { moves: this.moves }), 800);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        for (let i = this.animations.length - 1; i >= 0; i--) {
            this.animations[i].progress += dt;
            if (this.animations[i].progress >= this.animations[i].duration) {
                if (this.animations[i].type === 'merge') {
                    const x = this.gridX + this.animations[i].c * (this.cellSize + this.gap * 0.5) + this.cellSize / 2;
                    const y = this.gridY + this.animations[i].r * (this.cellSize + this.gap * 0.5) + this.cellSize / 2;
                    Particles.burst(x, y, 10, { color: '#ffc531', minSpeed: 60, maxSpeed: 200, gravity: 300 });
                }
                this.animations.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ffc531';
            ctx.font = 'bold 44px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText('2048 MERGE', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Tahoma';
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(this.gridX - 10, this.gridY - 10, this.gridW + 20, this.gridH + 20, 16);
        else ctx.rect(this.gridX - 10, this.gridY - 10, this.gridW + 20, this.gridH + 20);
        ctx.fill();

        const colors = { 2: '#1a2a4a', 4: '#1f3a5a', 8: '#2a5a6a', 16: '#2a7a6a', 32: '#3a9a5a', 64: '#5aba3a', 128: '#9aca2a', 256: '#daca2a', 512: '#eaaa2a', 1024: '#ea7a2a', 2048: '#ea3a5a' };

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const x = this.gridX + c * (this.cellSize + this.gap * 0.5);
                const y = this.gridY + r * (this.cellSize + this.gap * 0.5);
                const v = this.board[r][c];
                ctx.fillStyle = v === 0 ? 'rgba(255,255,255,0.04)' : (colors[v] || '#ff2d78');
                
                let sc = 1;
                const a = this.animations.find(a => a.r === r && a.c === c);
                if (a) {
                    if (a.type === 'spawn') sc = a.progress / a.duration;
                    else if (a.type === 'merge') {
                        const t = a.progress / a.duration;
                        sc = 1 + Math.sin(t * Math.PI) * 0.2;
                    }
                }

                ctx.save();
                ctx.translate(x + this.cellSize / 2, y + this.cellSize / 2);
                ctx.scale(sc, sc);
                ctx.translate(-x - this.cellSize / 2, -y - this.cellSize / 2);

                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, this.cellSize, this.cellSize, 10);
                else ctx.rect(x, y, this.cellSize, this.cellSize);
                ctx.fill();
                
                if (v !== 0) {
                    if (v >= 8) { ctx.shadowColor = colors[v]; ctx.shadowBlur = 15; }
                    ctx.fillStyle = v >= 8 ? '#fff' : '#c5cee0';
                    ctx.font = `900 ${Math.max(18, this.cellSize * 0.38)}px Tahoma`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(v, x + this.cellSize / 2, y + this.cellSize / 2);
                    ctx.shadowBlur = 0;
                }
                ctx.restore();
            }
        }
        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
        if (this._key) window.removeEventListener('keydown', this._key);
        if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
        if (this._up) this.canvas.removeEventListener('pointerup', this._up);
    }
};

window.Game_minesweeper = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        const t = 60, avail = Math.min(this.w - 40, this.h - t - 100);
        this.cols = 8;
        this.rows = 8;
        this.cellSize = Math.floor(avail / 8);
        this.gridW = this.cols * this.cellSize;
        this.gridH = this.rows * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = t + (this.h - t - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') { this.startGame(); return; }
            if (this.state !== 'playing') return;
            const r = this.canvas.getBoundingClientRect();
            const c = Math.floor((e.clientX - r.left - this.gridX) / this.cellSize);
            const rr = Math.floor((e.clientY - r.top - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) this.clickCell(rr, c, false);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._ctx = (e) => {
            e.preventDefault();
            if (this.state !== 'playing') return;
            const r = this.canvas.getBoundingClientRect();
            const c = Math.floor((e.clientX - r.left - this.gridX) / this.cellSize);
            const rr = Math.floor((e.clientY - r.top - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) this.clickCell(rr, c, true);
        };
        this.canvas.addEventListener('contextmenu', this._ctx);

        this.longPressTimer = null;
        this._down = (e) => {
            if (this.state !== 'playing') return;
            const r = this.canvas.getBoundingClientRect();
            const c = Math.floor((e.clientX - r.left - this.gridX) / this.cellSize);
            const rr = Math.floor((e.clientY - r.top - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) {
                this.longPressTimer = setTimeout(() => {
                    this.clickCell(rr, c, true);
                    Haptics.medium();
                    this.longPressTimer = null;
                }, 400);
            }
        };
        this._up = () => { if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; } };
        
        this.canvas.addEventListener('pointerdown', this._down);
        window.addEventListener('pointerup', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.board = [];
        this.minesCount = 10;
        this.flagged = 0;
        this.revealed = 0;
        this.explosionAnim = 0;
        this.startTime = performance.now();
        this.timeElapsed = 0;

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) row.push({ mine: false, revealed: false, flagged: false, adj: 0, anim: 0 });
            this.board.push(row);
        }

        let placed = 0;
        while (placed < this.minesCount) {
            const r = randInt(0, 7);
            const c = randInt(0, 7);
            if (!this.board[r][c].mine) { this.board[r][c].mine = true; placed++; }
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.board[nr][nc].mine) count++;
                    }
                }
                this.board[r][c].adj = count;
            }
        }
        this.updateHud();
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">🚩 <b>${this.minesCount - this.flagged}</b></div><div class="hud-pill">⏱ ${Math.floor(this.timeElapsed)}s</div><div class="hud-pill">کشف <b>${this.revealed}/${64 - this.minesCount}</b></div>`);
    }

    clickCell(r, c, isFlag) {
        const cell = this.board[r][c];
        if (cell.revealed) return;

        if (isFlag) {
            if (!cell.flagged && this.flagged < this.minesCount) {
                cell.flagged = true;
                this.flagged++;
                AudioEngine.tone(600, 0.05, 'square', 0.1);
                Haptics.light();
            } else if (cell.flagged) {
                cell.flagged = false;
                this.flagged--;
                AudioEngine.tone(300, 0.05, 'square', 0.1);
            }
            this.updateHud();
            return;
        }

        if (cell.flagged) return;

        if (cell.mine) {
            cell.revealed = true;
            this.state = 'dead';
            this.explosionAnim = 0.8;
            AudioEngine.hit();
            AudioEngine.lose();
            Haptics.heavy();
            Camera.add(2);
            
            const hx = this.gridX + c * this.cellSize + this.cellSize / 2;
            const hy = this.gridY + r * this.cellSize + this.cellSize / 2;
            Particles.burst(hx, hy, 80, { color: '#ff2d78', minSpeed: 200, maxSpeed: 800, gravity: 1000, minSize: 4, maxSize: 10 });
            Particles.burst(hx, hy, 50, { color: '#ffc531', minSpeed: 150, maxSpeed: 600, gravity: 800, minSize: 3, maxSize: 8 });

            for (let rr = 0; rr < 8; rr++) {
                for (let cc = 0; cc < 8; cc++) {
                    if (this.board[rr][cc].mine && !this.board[rr][cc].revealed) this.board[rr][cc].revealed = true;
                }
            }
            setTimeout(() => App.gameOver('minesweeper', 0, { result: 'باختی' }), 1500);
            return;
        }

        this.floodFill(r, c);

        if (this.revealed === 64 - this.minesCount) {
            this.state = 'won';
            AudioEngine.win();
            Haptics.success();
            Camera.add(0.8);
            setTimeout(() => App.gameOver('minesweeper', (64 - this.minesCount) * 50, { result: 'بردی' }), 1000);
        }
        this.updateHud();
    }

    floodFill(r, c) {
        const stack = [{ r, c }];
        while (stack.length > 0) {
            const { r, c } = stack.pop();
            const cell = this.board[r][c];
            if (cell.revealed || cell.flagged || cell.mine) continue;
            
            cell.revealed = true;
            cell.anim = 1;
            this.revealed++;
            AudioEngine.tone(600 + cell.adj * 60, 0.04, 'sine', 0.05);
            
            if (cell.adj === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !this.board[nr][nc].revealed) {
                            stack.push({ r: nr, c: nc });
                        }
                    }
                }
            }
        }
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state === 'playing') {
            this.timeElapsed = (performance.now() - this.startTime) / 1000;
            this.updateHud();
        }
        if (this.explosionAnim > 0) this.explosionAnim -= dt;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c].anim > 0) this.board[r][c].anim = Math.max(0, this.board[r][c].anim - dt * 6);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ff2d78';
            ctx.font = 'bold 40px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText('MINESWEEPER', this.w / 2, this.h / 2 - 50);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Tahoma';
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 10);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '14px Tahoma';
            ctx.fillText('برای پرچم‌گذاری نگه دارید', this.w / 2, this.h / 2 + 45);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12, 12);
        else ctx.rect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12);
        ctx.fill();

        const colors = ['', '#00e5ff', '#2bff88', '#ffc531', '#ff7a00', '#ff2d78', '#a855f7', '#fff', '#ff0055'];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = this.board[r][c];
                const x = this.gridX + c * this.cellSize + 2;
                const y = this.gridY + r * this.cellSize + 2;
                const w = this.cellSize - 4;
                const sc = 1 + Math.sin(cell.anim * Math.PI) * 0.15;

                ctx.save();
                ctx.translate(x + w / 2, y + w / 2);
                ctx.scale(sc, sc);
                ctx.translate(-x - w / 2, -y - w / 2);

                if (cell.revealed) {
                    if (cell.mine) {
                        ctx.fillStyle = 'rgba(255,0,85,0.3)';
                        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8); else ctx.rect(x, y, w, w); ctx.fill();
                        ctx.font = `${w * 0.6}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💣', x + w / 2, y + w / 2);
                    } else {
                        ctx.fillStyle = 'rgba(0,229,255,0.05)';
                        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8); else ctx.rect(x, y, w, w); ctx.fill();
                        if (cell.adj > 0) {
                            ctx.fillStyle = colors[cell.adj];
                            ctx.font = `bold ${w * 0.5}px Tahoma`;
                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText(cell.adj, x + w / 2, y + w / 2);
                        }
                    }
                } else {
                    const g = ctx.createLinearGradient(x, y, x + w, y + w);
                    g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#0c1120');
                    ctx.fillStyle = g;
                    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8); else ctx.rect(x, y, w, w); ctx.fill();
                    ctx.strokeStyle = 'rgba(0,229,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
                    if (cell.flagged) {
                        ctx.font = `${w * 0.5}px Arial`;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('🚩', x + w / 2, y + w / 2);
                    }
                }
                ctx.restore();
            }
        }

        Particles.render(ctx);
        if (this.explosionAnim > 0) {
            ctx.fillStyle = `rgba(255,45,120,${this.explosionAnim * 0.7})`;
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        }
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
        if (this._ctx) this.canvas.removeEventListener('contextmenu', this._ctx);
        if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
        if (this._up) window.removeEventListener('pointerup', this._up);
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
    }
};
