window.Game_math = class extends GameBase {
    constructor() {
        super();
        Particles.init(300);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        this.btnW = (this.w - 80) / 2;
        this.btnH = 80;
        this.gridX = 40;
        this.gridY = this.h * 0.55;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
            if (this.state !== 'playing') return;
            
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;
            
            for (let i = 0; i < 4; i++) {
                const bx = this.gridX + (i % 2) * (this.btnW + 20);
                const by = this.gridY + Math.floor(i / 2) * (this.btnH + 20);
                if (x >= bx && x <= bx + this.btnW && y >= by && y <= by + this.btnH) {
                    this.checkAnswer(this.options[i], i);
                    return;
                }
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.combo = 0;
        this.lives = 3;
        this.timeLeft = 30;
        this.newQuestion();
        this.updateHud();
    }

    newQuestion() {
        const max = 10 + this.score * 2;
        let a = randInt(1, max), b = randInt(1, max);
        const op = Math.random() < 0.5 ? '+' : '-';
        if (op === '-' && a < b) { const t = a; a = b; b = t; }
        
        this.answer = op === '+' ? a + b : a - b;
        this.question = `${a} ${op} ${b} = ?`;
        
        this.options = [this.answer];
        while (this.options.length < 4) {
            const w = this.answer + randInt(-10, 10);
            if (w !== this.answer && !this.options.includes(w) && w > 0) this.options.push(w);
        }
        this.options.sort(() => Math.random() - 0.5);
    }

    checkAnswer(val, index) {
        if (val === this.answer) {
            this.score += 15 + (this.combo * 5);
            this.combo++;
            AudioEngine.win();
            Haptics.light();
            Camera.add(0.2);
            this.timeLeft = Math.min(30, this.timeLeft + 2);
            
            const bx = this.gridX + (index % 2) * (this.btnW + 20) + this.btnW / 2;
            const by = this.gridY + Math.floor(index / 2) * (this.btnH + 20) + this.btnH / 2;
            Particles.burst(bx, by, 25, { color: '#2bff88', minSpeed: 100, maxSpeed: 350, gravity: 300 });
            
            this.newQuestion();
        } else {
            this.combo = 0;
            this.lives--;
            this.timeLeft = Math.max(0, this.timeLeft - 5);
            AudioEngine.hit();
            Haptics.heavy();
            Camera.add(1);
            
            const bx = this.gridX + (index % 2) * (this.btnW + 20) + this.btnW / 2;
            const by = this.gridY + Math.floor(index / 2) * (this.btnH + 20) + this.btnH / 2;
            Particles.burst(bx, by, 25, { color: '#ff2d78', minSpeed: 100, maxSpeed: 350, gravity: 300 });
            
            if (this.lives <= 0) this.gameOver();
        }
        this.updateHud();
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">⏱ <b>${Math.ceil(this.timeLeft)}s</b> · ❤️ ${this.lives}</div>`);
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        setTimeout(() => App.gameOver('math', this.score), 800);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state !== 'playing') return;
        
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.gameOver();
        }
        this.updateHud();
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
            ctx.fillText('SPEED MATH', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 60, this.w, 6);
        ctx.fillStyle = this.timeLeft < 10 ? '#ff2d78' : '#00e5ff'; ctx.fillRect(0, 60, (this.timeLeft / 30) * this.w, 6);

        ctx.fillStyle = '#fff'; ctx.font = 'bold 54px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
        ctx.fillText(this.question, this.w / 2, this.h * 0.3); ctx.shadowBlur = 0;

        if (this.combo > 1) {
            ctx.fillStyle = '#ffc531'; ctx.font = 'bold 28px Tahoma';
            ctx.fillText(`کمبو ×${this.combo}`, this.w / 2, this.h * 0.4);
        }

        for (let i = 0; i < 4; i++) {
            const bx = this.gridX + (i % 2) * (this.btnW + 20);
            const by = this.gridY + Math.floor(i / 2) * (this.btnH + 20);
            
            const g = ctx.createLinearGradient(bx, by, bx, by + this.btnH);
            g.addColorStop(0, 'rgba(0,229,255,0.15)'); g.addColorStop(1, 'rgba(0,229,255,0.05)');
            ctx.fillStyle = g; ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 2;
            
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, this.btnW, this.btnH, 16); else ctx.rect(bx, by, this.btnW, this.btnH);
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.options[i], bx + this.btnW / 2, by + this.btnH / 2);
        }
        Particles.render(ctx); Camera.reset(ctx);
    }

    stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); }
};

window.Game_match3 = class extends GameBase {
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
        const t = 60, avail = Math.min(this.w - 20, this.h - t - 100);
        this.cols = 8; this.rows = 8;
        this.cellSize = Math.floor(avail / 8);
        this.gridW = this.cols * this.cellSize;
        this.gridH = this.rows * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = t + (this.h - t - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
            if (this.state !== 'playing' || this.lock) return;
            
            const r = this.canvas.getBoundingClientRect();
            const c = Math.floor((e.clientX - r.left - this.gridX) / this.cellSize);
            const rr = Math.floor((e.clientY - r.top - this.gridY) / this.cellSize);
            if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) this.handleClick(rr, c);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.moves = 35;
        this.lock = true;
        this.selected = null;
        this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        
        const colors = [1, 2, 3, 4, 5];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let color;
                do {
                    color = colors[Math.floor(Math.random() * colors.length)];
                } while (
                    (c >= 2 && this.board[r][c - 1] === color && this.board[r][c - 2] === color) ||
                    (r >= 2 && this.board[r - 1][c] === color && this.board[r - 2][c] === color)
                );
                this.board[r][c] = color;
            }
        }
        this.updateHud();
        this.lock = false;
    }

    handleClick(r, c) {
        if (!this.selected) {
            this.selected = { r, c };
            AudioEngine.tone(600, 0.05, 'sine', 0.1);
        } else {
            const dr = Math.abs(this.selected.r - r);
            const dc = Math.abs(this.selected.c - c);
            if (dr + dc === 1) {
                this.swap(this.selected.r, this.selected.c, r, c);
                this.selected = null;
            } else if (dr === 0 && dc === 0) {
                this.selected = null;
            } else {
                this.selected = { r, c };
            }
        }
    }

    swap(r1, c1, r2, c2) {
        this.lock = true;
        const temp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp;
        AudioEngine.tone(400, 0.05, 'sine', 0.1);
        
        if (this.checkMatches()) {
            this.moves--;
            this.updateHud();
            setTimeout(() => this.processMatches(), 300);
        } else {
            setTimeout(() => {
                const temp2 = this.board[r1][c1];
                this.board[r1][c1] = this.board[r2][c2];
                this.board[r2][c2] = temp2;
                AudioEngine.tone(200, 0.1, 'sawtooth', 0.1);
                Haptics.light();
                this.lock = false;
            }, 300);
        }
    }

    checkMatches() {
        let found = false;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 2; c++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r][c + 1] && this.board[r][c] === this.board[r][c + 2]) found = true;
            }
        }
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) found = true;
            }
        }
        return found;
    }

    processMatches() {
        let matched = false;
        const toClear = new Set();
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 2; c++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r][c + 1] && this.board[r][c] === this.board[r][c + 2]) {
                    toClear.add(r + ',' + c); toClear.add(r + ',' + (c + 1)); toClear.add(r + ',' + (c + 2)); matched = true;
                }
            }
        }
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) {
                    toClear.add(r + ',' + c); toClear.add((r + 1) + ',' + c); toClear.add((r + 2) + ',' + c); matched = true;
                }
            }
        }

        if (matched) {
            this.score += toClear.size * 15;
            AudioEngine.coin(); Haptics.medium(); Camera.add(0.2);
            this.updateHud();
            
            toClear.forEach(pos => {
                const [r, c] = pos.split(',').map(Number);
                const x = this.gridX + c * this.cellSize + this.cellSize / 2;
                const y = this.gridY + r * this.cellSize + this.cellSize / 2;
                Particles.burst(x, y, 10, { color: this.getColor(this.board[r][c]), minSpeed: 100, maxSpeed: 250, gravity: 300 });
                this.board[r][c] = 0;
            });
            
            this.applyGravity();
            setTimeout(() => this.processMatches(), 350);
        } else {
            this.lock = false;
            if (this.moves <= 0) this.gameOver();
        }
    }

    applyGravity() {
        for (let c = 0; c < this.cols; c++) {
            let empty = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.board[r][c] === 0) empty++;
                else if (empty > 0) {
                    this.board[r + empty][c] = this.board[r][c];
                    this.board[r][c] = 0;
                }
            }
            for (let r = empty - 1; r >= 0; r--) this.board[r][c] = randInt(1, 5);
        }
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">حرکت ${this.moves}</div>`); }
    gameOver() { this.state = 'dead'; AudioEngine.lose(); Haptics.heavy(); setTimeout(() => App.gameOver('match3', this.score), 800); }
    update(dt) { Particles.update(dt); Camera.update(dt); }
    getColor(id) { return ['#000', '#00e5ff', '#ff2d78', '#ffc531', '#2bff88', '#a855f7'][id] || '#fff'; }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        ctx.fillStyle = '#05070d'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        
        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#a855f7'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center';
            ctx.fillText('MATCH 3', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)'; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12, 14);
        else ctx.rect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12);
        ctx.fill();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const val = this.board[r][c];
                if (val === 0) continue;
                
                const x = this.gridX + c * this.cellSize + 4, y = this.gridY + r * this.cellSize + 4, w = this.cellSize - 8;
                const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
                
                ctx.fillStyle = this.getColor(val);
                if (isSelected) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 25; }
                else { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; }
                
                ctx.beginPath();
                if (val === 1) ctx.arc(x + w / 2, y + w / 2, w / 2, 0, 6.28);
                else if (val === 2) { if (ctx.roundRect) ctx.roundRect(x, y, w, w, 10); else ctx.rect(x, y, w, w); }
                else if (val === 3) { ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + w / 2); ctx.lineTo(x + w / 2, y + w); ctx.lineTo(x, y + w / 2); ctx.closePath(); }
                else if (val === 4) { ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + w); ctx.lineTo(x, y + w); ctx.closePath(); }
                else { ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + w / 3); ctx.lineTo(x + w * 0.8, y + w); ctx.lineTo(x + w * 0.2, y + w); ctx.lineTo(x, y + w / 3); ctx.closePath(); }
                ctx.fill(); ctx.shadowBlur = 0;
            }
        }
        Particles.render(ctx); Camera.reset(ctx);
    }

    stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); }
};

window.Game_shooter = class extends GameBase {
    constructor() {
        super();
        Particles.init(600);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() { 
        this.shipW = 44; 
        this.shipH = 44; 
    }

    bindInputs() {
        this._touch = (e) => { 
            e.preventDefault(); 
            if (this.state === 'menu' || this.state === 'dead') this.startGame(); 
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
        
        this._move = (e) => {
            if (this.state !== 'playing') return;
            const r = this.canvas.getBoundingClientRect();
            const tx = e.clientX - r.left;
            const ty = e.clientY - r.top;
            
            this.player.x = clamp(tx - this.shipW / 2, 0, this.w - this.shipW);
            this.player.y = clamp(ty - this.shipH / 2 - 20, 60, this.h - this.shipH);
        };
        this.canvas.addEventListener('pointermove', this._move);
        
        this._key = (e) => {
            if (this.state === 'playing') {
                if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = true;
                if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = true;
                if (e.key === 'ArrowUp' || e.key === 'w') this.keyUp = true;
                if (e.key === 'ArrowDown' || e.key === 's') this.keyDown = true;
            }
        };
        this._keyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = false;
            if (e.key === 'ArrowUp' || e.key === 'w') this.keyUp = false;
            if (e.key === 'ArrowDown' || e.key === 's') this.keyDown = false;
        };
        window.addEventListener('keydown', this._key);
        window.addEventListener('keyup', this._keyUp);
    }

    startGame() {
        this.state = 'playing';
        this.score = 0; this.lives = 3; this.time = 0;
        this.spawnTimer = 0; this.spawnInterval = 1.2; this.fireTimer = 0;
        this.player = { x: this.w / 2 - this.shipW / 2, y: this.h - 120, w: this.shipW, h: this.shipH, invuln: 0 };
        this.bullets = []; this.enemies = [];
        this.stars = Array.from({ length: 150 }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, s: Math.random() * 2 + 1, speed: Math.random() * 300 + 100 }));
        this.updateHud();
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives}</div>`); }

    spawnEnemy() {
        const w = rand(35, 65), h = rand(35, 65);
        const hp = Math.random() < 0.2 ? 3 + Math.floor(this.score / 500) : 1;
        this.enemies.push({ x: rand(20, this.w - w - 20), y: -h - 20, w, h, hp, maxHp: hp, vy: rand(120, 220) + (this.score * 0.1), vx: rand(-80, 80), type: hp > 1 ? 'tank' : 'basic' });
    }

    gameOver() {
        this.state = 'dead'; AudioEngine.lose(); Haptics.heavy(); Camera.add(2);
        setTimeout(() => App.gameOver('shooter', this.score), 1000);
    }

    update(dt) {
        Particles.update(dt); Camera.update(dt); this.time += dt;
        
        for (const s of this.stars) { 
            s.y += s.speed * dt; 
            if (s.y > this.h) { s.y = 0; s.x = Math.random() * this.w; } 
        }
        
        if (this.state !== 'playing') return;

        if (this.keyLeft) this.player.x = clamp(this.player.x - 500 * dt, 0, this.w - this.player.w);
        if (this.keyRight) this.player.x = clamp(this.player.x + 500 * dt, 0, this.w - this.player.w);
        if (this.keyUp) this.player.y = clamp(this.player.y - 500 * dt, 60, this.h - this.player.h);
        if (this.keyDown) this.player.y = clamp(this.player.y + 500 * dt, 60, this.h - this.player.h);
        
        if (this.player.invuln > 0) this.player.invuln -= dt;

        this.fireTimer += dt;
        if (this.fireTimer > 0.15) {
            this.fireTimer = 0;
            this.bullets.push({ x: this.player.x + this.player.w / 2, y: this.player.y, vy: -1000 });
            AudioEngine.tone(900, 0.02, 'square', 0.03);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y += b.vy * dt;
            if (b.y < 0) this.bullets.splice(i, 1);
        }

        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnInterval) { 
            this.spawnTimer = 0; 
            this.spawnEnemy(); 
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.y += e.vy * dt; e.x += e.vx * dt;
            if (e.x < 0 || e.x + e.w > this.w) e.vx *= -1;

            if (e.y > this.h) {
                this.enemies.splice(i, 1); this.lives--; this.updateHud(); Camera.add(1); Haptics.heavy();
                if (this.lives <= 0) return this.gameOver();
                continue;
            }

            const cx = this.player.x + this.player.w / 2, cy = this.player.y + this.player.h / 2;
            if (e.x < cx + 15 && e.x + e.w > cx - 15 && e.y < cy + 15 && e.y + e.h > cy - 15) {
                if (this.player.invuln <= 0) {
                    this.enemies.splice(i, 1); this.lives--; this.player.invuln = 2;
                    this.updateHud(); Camera.add(1.5); Haptics.heavy(); AudioEngine.hit();
                    Particles.burst(cx, cy, 40, { color: '#ff2d78', minSpeed: 150, maxSpeed: 500, gravity: 300 });
                    if (this.lives <= 0) return this.gameOver();
                }
                continue;
            }

            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                    this.bullets.splice(j, 1); e.hp--;
                    Particles.burst(b.x, b.y, 5, { color: '#fff', minSpeed: 50, maxSpeed: 150 });
                    
                    if (e.hp <= 0) {
                        this.enemies.splice(i, 1);
                        this.score += e.type === 'tank' ? 50 : 20;
                        this.updateHud();
                        AudioEngine.tone(300, 0.1, 'sawtooth', 0.1); Haptics.light(); Camera.add(0.2);
                        Particles.burst(e.x + e.w / 2, e.y + e.h / 2, 30, { color: e.type === 'tank' ? '#a855f7' : '#ffc531', minSpeed: 100, maxSpeed: 400, gravity: 200 });
                        break;
                    }
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
        bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        for (const s of this.stars) { 
            ctx.fillStyle = `rgba(255,255,255,${s.s / 3})`; 
            ctx.fillRect(s.x, s.y, s.s, s.s * 2); 
        }

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ff2d78'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center';
            ctx.fillText('SPACE SHOOTER', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        for (const b of this.bullets) { 
            ctx.fillStyle = '#00e5ff'; 
            ctx.shadowColor = '#00e5ff'; 
            ctx.shadowBlur = 15; 
            ctx.fillRect(b.x - 3, b.y, 6, 22); 
        }
        ctx.shadowBlur = 0;

        for (const e of this.enemies) {
            ctx.fillStyle = e.type === 'tank' ? '#a855f7' : '#ff2d78';
            ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
            ctx.beginPath();
            if (e.type === 'tank') { if (ctx.roundRect) ctx.roundRect(e.x, e.y, e.w, e.h, 10); else ctx.rect(e.x, e.y, e.w, e.h); }
            else { ctx.moveTo(e.x + e.w / 2, e.y + e.h); ctx.lineTo(e.x + e.w, e.y); ctx.lineTo(e.x, e.y); ctx.closePath(); }
            ctx.fill(); ctx.shadowBlur = 0;
            
            if (e.maxHp > 1) {
                const ratio = e.hp / e.maxHp;
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y + e.h + 5, e.w, 4);
                ctx.fillStyle = '#2bff88'; ctx.fillRect(e.x, e.y + e.h + 5, e.w * ratio, 4);
            }
        }

        Particles.render(ctx);

        const p = this.player;
        ctx.save(); 
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        if (p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0) ctx.globalAlpha = 0.3;
        
        ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
        ctx.beginPath(); 
        ctx.moveTo(0, -p.h / 2); 
        ctx.lineTo(p.w / 2, p.h / 2); 
        ctx.lineTo(0, p.h / 4); 
        ctx.lineTo(-p.w / 2, p.h / 2); 
        ctx.closePath(); 
        ctx.fill();
        
        ctx.fillStyle = '#ffc531'; 
        ctx.beginPath(); 
        ctx.moveTo(-6, p.h / 4); 
        ctx.lineTo(0, p.h / 2 + Math.random() * 20); 
        ctx.lineTo(6, p.h / 4); 
        ctx.closePath(); 
        ctx.fill();
        
        ctx.restore(); 
        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 1;
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
        if (this._move) this.canvas.removeEventListener('pointermove', this._move);
        if (this._key) window.removeEventListener('keydown', this._key);
        if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
    }
};
