window.Game_runner = class extends GameBase {
    constructor() {
        super();
        Particles.init(300);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
    }

    getControls() {
        return { type: 'custom', buttons: [{ label: '▲<span>پرش</span>', action: () => this.jump() }, { label: '▼<span>سر خوردن</span>', action: () => this.slide() }] };
    }

    recalc() {
        this.groundY = this.h * 0.82;
        this.scale = clamp(Math.min(this.w, this.h) / 600, 0.6, 1.5);
        this.playerW = 35 * this.scale;
        this.playerH = 50 * this.scale;
        this.gravity = 2600 * this.scale;
        this.jumpForce = -950 * this.scale;
    }

    startGame() {
        this.state = 'playing'; this.score = 0; this.coins = 0; this.gems = 0;
        this.speed = 450 * this.scale; this.baseSpeed = 450 * this.scale;
        this.spawnTimer = 0; this.spawnInterval = 1.3; this.obstacles = []; this.collectibles = [];
        this.combo = 0; this.comboTimer = 0; this.multiplier = 1; this.trail = []; this.time = 0; this.sliding = false; this.slideTimer = 0;
        this.player = { x: this.w * 0.2, y: this.groundY - this.playerH, vy: 0, w: this.playerW, h: this.playerH, grounded: true, jumpsUsed: 0, squash: 1, stretch: 1, runFrame: 0 };
        this.stars = Array.from({ length: 100 }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h * 0.7, size: Math.random() * 2.5 + 0.5, speed: Math.random() * 4 + 1, alpha: Math.random() }));
        this.mountains = []; for (let i = 0; i < 8; i++) this.mountains.push({ x: i * (this.w / 3), w: rand(150, 300), h: rand(80, 250), color: `rgba(25, 15, 45, ${rand(0.6, 0.9)})` });
        this.updateHud();
    }

    jump() {
        if (this.state !== 'playing') return;
        const p = this.player;
        if (p.grounded) {
            p.vy = this.jumpForce; p.grounded = false; p.jumpsUsed = 1; p.squash = 0.6; p.stretch = 1.4;
            AudioEngine.jump(); Haptics.light();
            Particles.burst(p.x + p.w / 2, p.y + p.h, 15, { color: '#00e5ff', minSpeed: 80, maxSpeed: 250, gravity: 400 });
        } else if (p.jumpsUsed < 2) {
            p.vy = this.jumpForce * 0.85; p.jumpsUsed = 2; p.squash = 0.8; p.stretch = 1.2;
            AudioEngine.tone(650, 0.1, 'sine', 0.15, 850); Haptics.light();
            Particles.burst(p.x + p.w / 2, p.y + p.h, 25, { color: '#ff2d78', minSpeed: 120, maxSpeed: 350, gravity: 200 });
        }
    }

    slide() { if (this.state === 'playing' && this.player.grounded && !this.sliding) { this.sliding = true; this.slideTimer = 0.7; AudioEngine.tone(300, 0.1, 'sawtooth', 0.1); Haptics.light(); } }

    spawnObstacle() {
        const type = Math.random(); const w = rand(35, 55) * this.scale; const h = rand(45, 85) * this.scale;
        if (type < 0.65) this.obstacles.push({ x: this.w + 50, y: this.groundY - h, w: w, h: h, type: 'block', scored: false });
        else if (type < 0.9) this.obstacles.push({ x: this.w + 50, y: this.groundY - 140 * this.scale, w: w, h: h, type: 'drone', scored: false, phase: Math.random() * 6.28, baseY: this.groundY - 140 * this.scale });
        else this.obstacles.push({ x: this.w + 50, y: this.groundY - h, w: w * 1.5, h: h, type: 'spike', scored: false });
    }

    spawnCollectible() {
        const y = this.groundY - rand(70, 220) * this.scale; const isGem = Math.random() < 0.2;
        this.collectibles.push({ x: this.w + 50, y: y, r: 14 * this.scale, type: isGem ? 'gem' : 'coin', taken: false, bob: Math.random() * 6.28 });
    }

    updateHud() {
        const mult = this.multiplier > 1 ? ` ×${this.multiplier}` : '';
        this.setHud(`<div class="hud-pill">امتیاز <b>${Math.floor(this.score)}${mult}</b></div><div class="hud-pill">🪙 ${this.coins} · 💎 ${this.gems}</div>`);
    }

    update(dt) {
        Particles.update(dt); Camera.update(dt); this.time += dt;
        for (const s of this.stars) { s.x -= this.speed * 0.05 * dt * s.speed; if (s.x < 0) s.x = this.w; s.alpha = 0.3 + Math.sin(this.time * 3 + s.x) * 0.4; }
        if (this.state === 'dead') return;
        if (this.state !== 'playing') return;

        this.speed = this.baseSpeed + (this.score * 0.1); this.score += dt * 25 * this.multiplier;
        if (this.sliding) { this.slideTimer -= dt; if (this.slideTimer <= 0) this.sliding = false; }
        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) { this.combo = 0; this.multiplier = 1; } }

        const p = this.player; p.vy += this.gravity * dt; p.y += p.vy * dt;
        if (p.y >= this.groundY - p.h) {
            if (!p.grounded) { AudioEngine.tone(180, 0.08, 'sine', 0.08); Particles.burst(p.x + p.w / 2, p.y + p.h, 10, { color: '#fff', minSpeed: 60, maxSpeed: 180, gravity: 500 }); p.squash = 1.4; p.stretch = 0.6; }
            p.y = this.groundY - p.h; p.vy = 0; p.grounded = true; p.jumpsUsed = 0;
        }

        p.squash = lerp(p.squash, 1, dt * 15); p.stretch = lerp(p.stretch, 1, dt * 15); p.runFrame += dt * (p.grounded ? this.speed / 25 : 8);
        this.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, life: 0.4 });
        for (const t of this.trail) t.life -= dt;
        this.trail = this.trail.filter(t => t.life > 0);

        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnInterval) { this.spawnTimer = 0; this.spawnObstacle(); if (Math.random() < 0.85) this.spawnCollectible(); }

        for (const o of this.obstacles) {
            o.x -= this.speed * dt;
            if (o.type === 'drone') { o.phase += dt * 5; o.y = o.baseY + Math.sin(o.phase) * 45 * this.scale; }
            const px = p.x, py = this.sliding ? p.y + p.h * 0.5 : p.y, pw = p.w, ph = this.sliding ? p.h * 0.5 : p.h;
            if (px + pw > o.x && px < o.x + o.w && py + ph > o.y && py < o.y + o.h) this.die();
            if (!o.scored && o.x + o.w < px) { o.scored = true; this.score += 20; }
        }
        this.obstacles = this.obstacles.filter(o => o.x > -150);

        for (const c of this.collectibles) {
            c.x -= this.speed * dt; c.bob += dt * 6; const cy = c.y + Math.sin(c.bob) * 8;
            if (!c.taken && dist(p.x + p.w / 2, p.y + p.h / 2, c.x, cy) < 45 * this.scale) {
                c.taken = true; this.combo++; this.comboTimer = 3; this.multiplier = 1 + Math.floor(this.combo / 4) * 0.5;
                if (c.type === 'coin') { this.coins++; this.score += 25 * this.multiplier; AudioEngine.coin(); Particles.burst(c.x, cy, 15, { color: '#ffc531', minSpeed: 100, maxSpeed: 250, gravity: 300 }); }
                else { this.gems++; this.score += 100 * this.multiplier; AudioEngine.tone(1320, 0.1, 'triangle', 0.1); Camera.add(0.2); Particles.burst(c.x, cy, 30, { color: '#a855f7', minSpeed: 150, maxSpeed: 400, gravity: 200 }); }
                this.updateHud();
            }
        }
        this.collectibles = this.collectibles.filter(c => c.x > -60 && !c.taken);
    }

    die() {
        this.state = 'dead'; AudioEngine.hit(); AudioEngine.lose(); Haptics.heavy(); Camera.add(2);
        Particles.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 80, { color: '#ff2d78', minSpeed: 200, maxSpeed: 800, gravity: 800, minSize: 4, maxSize: 10 });
        setTimeout(() => App.gameOver('runner', Math.floor(this.score), { coins: this.coins, gems: this.gems }), 800);
    }

    render() {
        const ctx = this.ctx; Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); bg.addColorStop(0, '#05070d'); bg.addColorStop(0.5, '#0f1423'); bg.addColorStop(1, '#2a0f3a');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        for (const s of this.stars) { ctx.globalAlpha = s.alpha; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.size, s.size); }
        ctx.globalAlpha = 1;
        for (const m of this.mountains) { m.x -= this.speed * 0.1 * (this.state === 'playing' ? 1 : 0.2); if (m.x + m.w < 0) m.x = this.w + 200; ctx.fillStyle = m.color; ctx.beginPath(); ctx.moveTo(m.x, this.groundY); ctx.lineTo(m.x + m.w / 2, this.groundY - m.h); ctx.lineTo(m.x + m.w, this.groundY); ctx.closePath(); ctx.fill(); }
        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 44px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('NEON RUNNER', this.w / 2, this.h / 2 - 40); ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 30); Camera.reset(ctx); return; }
        
        const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h); gg.addColorStop(0, '#1a0a35'); gg.addColorStop(1, '#000');
        ctx.fillStyle = gg; ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.moveTo(0, this.groundY); ctx.lineTo(this.w, this.groundY); ctx.stroke(); ctx.shadowBlur = 0;

        for (const o of this.obstacles) {
            if (o.type === 'block') {
                const og = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h); og.addColorStop(0, '#ff2d78'); og.addColorStop(1, '#8a0040');
                ctx.fillStyle = og; ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 20; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.shadowBlur = 0;
            } else if (o.type === 'drone') {
                ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 25;
                ctx.beginPath(); ctx.ellipse(o.x + o.w/2, o.y + o.h/2, o.w/2, o.h/2, 0, 0, 6.28); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x + o.w/2, o.y + o.h/2, 8, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#ff7a00'; ctx.shadowColor = '#ff7a00'; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w/2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
            }
        }

        for (const c of this.collectibles) {
            const cy = c.y + Math.sin(c.bob) * 8; ctx.save(); ctx.translate(c.x, cy); ctx.rotate(this.time * 4);
            ctx.fillStyle = c.type === 'coin' ? '#ffc531' : '#a855f7'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25;
            if (c.type === 'coin') { ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.28); ctx.fill(); }
            else { ctx.beginPath(); for (let i = 0; i < 5; i++) { const ang = i * Math.PI * 2 / 5 - Math.PI / 2; ctx.lineTo(Math.cos(ang) * c.r, Math.sin(ang) * c.r); } ctx.closePath(); ctx.fill(); }
            ctx.restore(); ctx.shadowBlur = 0;
        }

        Particles.render(ctx);

        if (this.state === 'playing' || this.state === 'dead') {
            const p = this.player; const bw = p.w * p.stretch; const bh = p.h * p.squash * (this.sliding ? 0.5 : 1); const px = p.x + p.w / 2; const py = p.y + p.h - bh;
            for (const t of this.trail) { ctx.globalAlpha = t.life * 2.5; ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(t.x, t.y, 12 * this.scale, 0, 6.28); ctx.fill(); }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 35;
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px - bw/2, py, bw, bh, 12); else ctx.rect(px - bw/2, py, bw, bh); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; const eyeY = py + bh * 0.25; const eyeSize = 6 * this.scale; ctx.fillRect(px - bw/4, eyeY, eyeSize, eyeSize); ctx.fillRect(px + bw/4 - eyeSize, eyeY, eyeSize, eyeSize);
        }
        Camera.reset(ctx);
    }

    stop() { super.stop(); }
};

window.Game_tetris = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
    }

    getControls() {
        return { type: 'custom', buttons: [{ label: '◀', action: () => this.move(-1) }, { label: '▶', action: () => this.move(1) }, { label: '🔄<span>چرخش</span>', action: () => this.rotate() }, { label: '▼<span>سقوط</span>', action: () => { this.softDrop = true; setTimeout(() => this.softDrop = false, 100); } }] };
    }

    recalc() {
        const topOff = 60, botOff = 40; const availH = this.h - topOff - botOff; const availW = this.w - 140; 
        this.cell = Math.floor(Math.min(availW / 10, availH / 20)); this.gridW = this.cell * 10; this.gridH = this.cell * 20;
        this.boardX = (this.w - this.gridW) / 2 - 30; this.boardY = topOff + (availH - this.gridH) / 2;
        this.nextX = this.boardX + this.gridW + 10; this.nextY = this.boardY;
    }

    startGame() {
        this.state = 'playing'; this.board = Array.from({ length: 20 }, () => Array(10).fill(0));
        this.score = 0; this.lines = 0; this.level = 1; this.dropTimer = 0; this.dropInterval = 0.8; this.softDrop = false;
        this.piece = null; this.nextQueue = []; this.clearing = []; this.clearTimer = 0;
        this.shapes = {
            I: { shape: [[1,1,1,1]], color: '#00e5ff' }, O: { shape: [[1,1],[1,1]], color: '#ffc531' },
            T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7' }, S: { shape: [[0,1,1],[1,1,0]], color: '#2bff88' },
            Z: { shape: [[1,1,0],[0,1,1]], color: '#ff2d78' }, J: { shape: [[1,0,0],[1,1,1]], color: '#0088cc' },
            L: { shape: [[0,0,1],[1,1,1]], color: '#ff7a00' }
        };
        this.refillBag(); this.nextQueue.push(this.getNext(), this.getNext(), this.getNext()); this.spawnPiece(); this.updateHud();
    }

    refillBag() { this.bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'].sort(() => Math.random() - 0.5); }
    getNext() { if (this.bag.length === 0) this.refillBag(); return this.bag.pop(); }
    spawnPiece() {
        const type = this.nextQueue.shift(); this.nextQueue.push(this.getNext()); const def = this.shapes[type];
        this.piece = { type, shape: def.shape.map(r => r.slice()), color: def.color, x: Math.floor((10 - def.shape[0].length) / 2), y: 0 };
        if (this.collides(this.piece.shape, this.piece.x, this.piece.y)) this.gameOver();
    }

    collides(s, px, py) {
        for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) {
            if (!s[r][c]) continue; const x = px + c, y = py + r;
            if (x < 0 || x >= 10 || y >= 20) return true; if (y >= 0 && this.board[y][x]) return true;
        }
        return false;
    }

    move(dx) { if (!this.collides(this.piece.shape, this.piece.x + dx, this.piece.y)) { this.piece.x += dx; AudioEngine.tone(300, 0.03, 'sine', 0.05); } }
    rotate() {
        const s = this.piece.shape; const rot = s[0].map((_, i) => s.map(r => r[i]).reverse());
        for (const k of [0, -1, 1, -2, 2]) { if (!this.collides(rot, this.piece.x + k, this.piece.y)) { this.piece.shape = rot; this.piece.x += k; AudioEngine.tone(500, 0.04, 'sine', 0.08); return; } }
    }
    hardDrop() {
        let d = 0; while (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) { this.piece.y++; d++; }
        this.score += d * 2; AudioEngine.tone(200, 0.1, 'square', 0.1); Haptics.medium(); this.lockPiece();
    }
    softDropStep() { if (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) this.piece.y++; else this.lockPiece(); }

    lockPiece() {
        for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
            if (this.piece.shape[r][c]) { const x = this.piece.x + c, y = this.piece.y + r; if (y >= 0) this.board[y][x] = this.piece.color; }
        }
        this.piece = null; this.checkLines(); if (this.state === 'playing') this.spawnPiece();
    }

    checkLines() {
        const full = []; for (let r = 0; r < 20; r++) if (this.board[r].every(c => c)) full.push(r);
        if (!full.length) return;
        this.clearing = full; this.clearTimer = 0.3; AudioEngine.win(); Haptics.success(); Camera.add(0.4);
        const pts = [0, 100, 300, 500, 800][full.length] || 800; this.score += pts * this.level; this.lines += full.length;
        const nl = Math.floor(this.lines / 10) + 1; if (nl > this.level) { this.level = nl; this.dropInterval = Math.max(0.1, 0.8 - (this.level - 1) * 0.08); }
        this.updateHud();
    }

    applyClear() {
        for (const r of this.clearing) for (let c = 0; c < 10; c++) Particles.burst(this.boardX + c * this.cell + this.cell/2, this.boardY + r * this.cell + this.cell/2, 15, { color: this.board[r][c], minSpeed: 100, maxSpeed: 350, gravity: 400 });
        this.clearing.sort((a, b) => a - b); for (const r of this.clearing) { this.board.splice(r, 1); this.board.unshift(Array(10).fill(0)); }
        this.clearing = []; this.clearTimer = 0;
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">خط ${this.lines} · سطح ${this.level}</div>`); }
    gameOver() { this.state = 'dead'; AudioEngine.lose(); Haptics.heavy(); Camera.add(1.5); setTimeout(() => App.gameOver('tetris', this.score, { lines: this.lines, level: this.level }), 600); }

    update(dt) {
        Particles.update(dt); Camera.update(dt);
        if (this.state !== 'playing') return;
        if (this.clearing.length > 0) { this.clearTimer -= dt; if (this.clearTimer <= 0) this.applyClear(); return; }
        this.dropTimer += dt; const iv = this.softDrop ? 0.05 : this.dropInterval;
        if (this.dropTimer >= iv) { this.dropTimer = 0; this.softDropStep(); }
    }

    render() {
        const ctx = this.ctx; Camera.apply(ctx);
        ctx.fillStyle = '#05070d'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('NEON TETRIS', this.w / 2, this.h / 2 - 30); ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20); Camera.reset(ctx); return; }
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.boardX - 8, this.boardY - 8, this.gridW + 16, this.gridH + 16);
        ctx.strokeStyle = 'rgba(0,229,255,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(this.boardX - 8, this.boardY - 8, this.gridW + 16, this.gridH + 16);

        for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) {
            const x = this.boardX + c * this.cell, y = this.boardY + r * this.cell;
            if (this.board[r][c]) this.drawCell(ctx, x, y, this.board[r][c]);
            else { ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1); }
        }

        for (const r of this.clearing) { ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`; ctx.fillRect(this.boardX, this.boardY + r * this.cell, this.gridW, this.cell); }

        if (this.piece) {
            let gy = this.piece.y; while (!this.collides(this.piece.shape, this.piece.x, gy + 1)) gy++;
            for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
                if (this.piece.shape[r][c]) { const gx = this.boardX + (this.piece.x + c) * this.cell, gyy = this.boardY + (gy + r) * this.cell; ctx.strokeStyle = this.piece.color; ctx.lineWidth = 2; ctx.strokeRect(gx + 2, gyy + 2, this.cell - 4, this.cell - 4); }
            }
            for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
                if (this.piece.shape[r][c]) { const x = this.boardX + (this.piece.x + c) * this.cell, y = this.boardY + (this.piece.y + r) * this.cell; this.drawCell(ctx, x, y, this.piece.color); }
            }
        }

        for (let i = 0; i < 3; i++) {
            const type = this.nextQueue[i], def = this.shapes[type]; const nx = this.nextX, ny = this.nextY + i * this.cell * 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(nx, ny, this.cell * 4, this.cell * 4); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.strokeRect(nx, ny, this.cell * 4, this.cell * 4);
            const ox = nx + (this.cell * 4 - def.shape[0].length * this.cell) / 2, oy = ny + (this.cell * 4 - def.shape.length * this.cell) / 2;
            for (let r = 0; r < def.shape.length; r++) for (let c = 0; c < def.shape[r].length; c++) if (def.shape[r][c]) this.drawCell(ctx, ox + c * this.cell, oy + r * this.cell, def.color);
        }
        Particles.render(ctx); Camera.reset(ctx);
    }

    drawCell(ctx, x, y, color) {
        const g = ctx.createLinearGradient(x, y, x + this.cell, y + this.cell); g.addColorStop(0, this.lighten(color, 50)); g.addColorStop(1, this.darken(color, 50));
        ctx.fillStyle = g; ctx.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
    }
    lighten(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.min(255, parseInt(h.substr(i,2),16) + a).toString(16).padStart(2,'0')).join(''); }
    darken(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.max(0, parseInt(h.substr(i,2),16) - a).toString(16).padStart(2,'0')).join(''); }
    stop() { super.stop(); }
};

window.Game_blocks = class extends GameBase {
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
        const t = 60, th = 140; const ah = this.h - th - t - 20, aw = this.w - 40;
        this.cellSize = Math.floor(Math.min(aw / 8, ah / 8)); this.gridW = 8 * this.cellSize; this.gridH = 8 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2; this.gridY = t + (ah - this.gridH) / 2; this.trayY = this.gridY + this.gridH + 30; this.trayH = th;
        if (this.pieces) this.layoutTray();
    }

    bindInputs() {
        this._touch = (e) => { e.preventDefault(); if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; } const r = this.canvas.getBoundingClientRect(); this.pickup(e.clientX - r.left, e.clientY - r.top); };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
        this._move = (e) => { if (!this.dragging) return; const r = this.canvas.getBoundingClientRect(); this.dragging.x = e.clientX - r.left - this.dragging.w / 2; this.dragging.y = e.clientY - r.top - this.dragging.h / 2; this.updatePreview(); };
        this.canvas.addEventListener('pointermove', this._move);
        this._up = () => { if (this.dragging) this.drop(); };
        window.addEventListener('pointerup', this._up); window.addEventListener('pointercancel', this._up);
    }

    startGame() {
        this.state = 'playing'; this.grid = Array.from({ length: 8 }, () => Array(8).fill(0));
        this.score = 0; this.combo = 0; this.linesCleared = 0; this.dragging = null; this.preview = null; this.floatingTexts = [];
        this.generatePieces(); this.updateHud();
    }

    updateHud() { const ct = this.combo > 1 ? ` · کمبو ×${this.combo}` : ''; this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">خط ${this.linesCleared}${ct}</div>`); }

    generatePieces() {
        const sh = [[[1]],[[1,1]],[[1],[1]],[[1,1,1]],[[1],[1],[1]],[[1,1],[1,1]],[[1,1,1],[1,1,1],[1,1,1]],[[1,0],[1,0],[1,1]],[[0,1],[0,1],[1,1]],[[1,1],[1,0]],[[1,1],[0,1]],[[1,0],[1,1]],[[0,1],[1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,0],[1,1,1]],[[1,0],[1,1],[0,1]],[[0,1],[1,1],[1,0]],[[1,1,1,1]],[[1],[1],[1],[1]]];
        const cols = ['#00e5ff','#ff2d78','#ffc531','#a855f7','#2bff88','#ff7a00'];
        this.pieces = []; for (let i = 0; i < 3; i++) { const s = sh[Math.floor(Math.random() * sh.length)]; this.pieces.push({ shape: s.map(r => r.slice()), color: cols[Math.floor(Math.random() * cols.length)], used: false }); }
        this.layoutTray();
    }

    layoutTray() {
        const tw = this.w - 40, pw = tw / 3;
        for (let i = 0; i < 3; i++) {
            const p = this.pieces[i]; if (!p) continue;
            const rs = p.shape.length, cs = p.shape[0].length, md = Math.max(rs, cs); const c = Math.min(32, (pw - 30) / md);
            p.baseCell = c; p.baseW = cs * c; p.baseH = rs * c; p.trayX = 20 + i * pw + (pw - p.baseW) / 2; p.trayY = this.trayY + (this.trayH - p.baseH) / 2;
        }
    }

    pickup(x, y) {
        if (this.state !== 'playing') return;
        for (let i = 0; i < 3; i++) {
            const p = this.pieces[i]; if (!p || p.used) continue; const pad = 15;
            if (x >= p.trayX - pad && x <= p.trayX + p.baseW + pad && y >= p.trayY - pad && y <= p.trayY + p.baseH + pad) {
                const c = this.cellSize, w = p.shape[0].length * c, h = p.shape.length * c;
                this.dragging = { index: i, shape: p.shape, color: p.color, cell: c, w, h, x: x - w / 2, y: y - h / 2 };
                AudioEngine.tone(500, 0.05, 'sine', 0.1); Haptics.light(); return;
            }
        }
    }

    updatePreview() {
        if (!this.dragging) { this.preview = null; return; }
        const d = this.dragging; const gc = Math.round((d.x - this.gridX) / this.cellSize); const gr = Math.round((d.y - this.gridY) / this.cellSize);
        if (gc < 0 || gr < 0 || gc + d.shape[0].length > 8 || gr + d.shape.length > 8) { this.preview = null; return; }
        for (let r = 0; r < d.shape.length; r++) for (let c = 0; c < d.shape[r].length; c++) if (d.shape[r][c] && this.grid[gr + r][gc + c]) { this.preview = null; return; }
        this.preview = { row: gr, col: gc, shape: d.shape, color: d.color };
    }

    drop() {
        if (!this.dragging) { this.preview = null; return; }
        const d = this.dragging;
        if (this.preview) {
            for (let r = 0; r < d.shape.length; r++) for (let c = 0; c < d.shape[r].length; c++) if (d.shape[r][c]) this.grid[this.preview.row + r][this.preview.col + c] = d.color;
            this.score += 15; this.pieces[d.index].used = true;
            AudioEngine.tone(700, 0.08, 'sine', 0.12); Haptics.medium(); this.checkClears();
            if (this.pieces.every(p => p.used)) this.generatePieces();
            if (this.isGameOver()) this.gameOver();
        }
        this.dragging = null; this.preview = null; this.updateHud();
    }

    checkClears() {
        const rows = [], cols = [];
        for (let r = 0; r < 8; r++) if (this.grid[r].every(c => c)) rows.push(r);
        for (let c = 0; c < 8; c++) { let f = true; for (let r = 0; r < 8; r++) if (!this.grid[r][c]) { f = false; break; } if (f) cols.push(c); }
        const total = rows.length + cols.length;
        if (total > 0) {
            this.combo++; const pts = total * 150 * this.combo; this.score += pts; this.linesCleared += total;
            AudioEngine.win(); Haptics.success(); Camera.add(0.5);
            for (const r of rows) for (let c = 0; c < 8; c++) Particles.burst(this.gridX + c*this.cellSize + this.cellSize/2, this.gridY + r*this.cellSize + this.cellSize/2, 10, { color: this.grid[r][c], minSpeed: 100, maxSpeed: 350, gravity: 400 });
            for (const c of cols) for (let r = 0; r < 8; r++) Particles.burst(this.gridX + c*this.cellSize + this.cellSize/2, this.gridY + r*this.cellSize + this.cellSize/2, 10, { color: this.grid[r][c], minSpeed: 100, maxSpeed: 350, gravity: 400 });
            for (const r of rows) for (let c = 0; c < 8; c++) this.grid[r][c] = 0;
            for (const c of cols) for (let r = 0; r < 8; r++) this.grid[r][c] = 0;
            this.floatingTexts.push({ x: this.gridX + this.gridW/2, y: this.gridY + this.gridH/2, text: '+' + pts, sub: this.combo > 1 ? 'کمبو ×' + this.combo : '', life: 1.5, max: 1.5 });
        } else this.combo = 0;
    }

    isGameOver() {
        for (const p of this.pieces) { if (p.used) continue; if (this.canPlace(p.shape)) return false; }
        return true;
    }

    canPlace(shape) {
        const rs = shape.length, cs = shape[0].length;
        for (let r = 0; r <= 8 - rs; r++) for (let c = 0; c <= 8 - cs; c++) {
            let f = true; for (let dr = 0; dr < rs; dr++) { for (let dc = 0; dc < cs; dc++) if (shape[dr][dc] && this.grid[r + dr][c + dc]) { f = false; break; } if (!f) break; }
            if (f) return true;
        }
        return false;
    }

    gameOver() { this.state = 'dead'; AudioEngine.lose(); Haptics.heavy(); Camera.add(1); setTimeout(() => App.gameOver('blocks', this.score, { lines: this.linesCleared }), 600); }
    update(dt) { Particles.update(dt); Camera.update(dt); for (const f of this.floatingTexts) { f.life -= dt; f.y -= dt * 60; } this.floatingTexts = this.floatingTexts.filter(f => f.life > 0); }

    render() {
        const ctx = this.ctx; Camera.apply(ctx); ctx.fillStyle = '#05070d'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('BLOCK PUZZLE', this.w / 2, this.h / 2 - 30); ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20); Camera.reset(ctx); return; }
        
        ctx.fillStyle = 'rgba(0,229,255,0.04)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16, 16); else ctx.rect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16); ctx.fill();
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const x = this.gridX + c * this.cellSize, y = this.gridY + r * this.cellSize;
            ctx.strokeStyle = 'rgba(0,229,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
            if (this.grid[r][c]) this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.grid[r][c]);
        }

        if (this.preview) for (let r = 0; r < this.preview.shape.length; r++) for (let c = 0; c < this.preview.shape[r].length; c++) if (this.preview.shape[r][c]) { const x = this.gridX + (this.preview.col + c) * this.cellSize, y = this.gridY + (this.preview.row + r) * this.cellSize; ctx.globalAlpha = 0.4; this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.preview.color); ctx.globalAlpha = 1; }
        
        for (const p of this.pieces) { if (!p || p.used) continue; for (let r = 0; r < p.shape.length; r++) for (let c = 0; c < p.shape[r].length; c++) if (p.shape[r][c]) { const x = p.trayX + c * p.baseCell, y = p.trayY + r * p.baseCell; this.drawBlock(ctx, x + 1, y + 1, p.baseCell - 2, p.color); } }
        if (this.dragging) { const d = this.dragging; for (let r = 0; r < d.shape.length; r++) for (let c = 0; c < d.shape[r].length; c++) if (d.shape[r][c]) { const x = d.x + c * d.cell, y = d.y + r * d.cell; this.drawBlock(ctx, x + 1, y + 1, d.cell - 2, d.color, 1.3); } }
        
        Particles.render(ctx);
        for (const ft of this.floatingTexts) { ctx.globalAlpha = Math.min(1, ft.life / ft.max * 1.5); ctx.fillStyle = '#ffc531'; ctx.font = 'bold 36px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ft.text, ft.x, ft.y); if (ft.sub) { ctx.font = 'bold 20px Tahoma'; ctx.fillStyle = '#00e5ff'; ctx.fillText(ft.sub, ft.x, ft.y + 35); } ctx.globalAlpha = 1; }
        Camera.reset(ctx);
    }

    drawBlock(ctx, x, y, size, color, scale) {
        const s = scale || 1; const g = ctx.createLinearGradient(x, y, x + size, y + size); g.addColorStop(0, this.lighten(color, 40 * s)); g.addColorStop(1, this.darken(color, 50 * s));
        ctx.fillStyle = g; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, size, size, Math.max(4, size * 0.15)); else ctx.rect(x, y, size, size); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + size * 0.15, y + size * 0.1, size * 0.7, size * 0.15);
    }
    lighten(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.min(255, parseInt(h.substr(i,2),16) + a).toString(16).padStart(2,'0')).join(''); }
    darken(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.max(0, parseInt(h.substr(i,2),16) - a).toString(16).padStart(2,'0')).join(''); }
    stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); if (this._move) this.canvas.removeEventListener('pointermove', this._move); if (this._up) { window.removeEventListener('pointerup', this._up); window.removeEventListener('pointercancel', this._up); } }
};

window.Game_snake = class extends GameBase {
    constructor() {
        super();
        Particles.init(300);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
    }

    getControls() { return { type: 'dpad', actions: { up: () => this.setDirection('up'), down: () => this.setDirection('down'), left: () => this.setDirection('left'), right: () => this.setDirection('right') } }; }

    recalc() { this.cell = Math.floor(Math.min((this.w - 20) / 20, (this.h - 180) / 24)); this.cols = Math.floor((this.w - 20) / this.cell); this.rows = Math.floor((this.h - 180) / this.cell); this.offX = (this.w - this.cols * this.cell) / 2; this.offY = (this.h - this.rows * this.cell) / 2 + 30; }

    setDirection(dir) {
        if (this.state !== 'playing') return;
        const m = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; const nd = m[dir];
        if (nd && (nd.x !== -this.dir.x || nd.y !== -this.dir.y)) this.nextDir = nd;
    }

    startGame() {
        this.state = 'playing'; this.snake = [{ x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) }];
        this.dir = { x: 1, y: 0 }; this.nextDir = { x: 1, y: 0 }; this.food = this.spawnFood();
        this.foodPulse = 0; this.score = 0; this.tick = 0; this.speed = 0.15; this.time = 0; this.deathFlash = 0;
        this.updateHud();
    }

    spawnFood() {
        let guard = 0; while (guard++ < 200) { const f = { x: randInt(0, this.cols - 1), y: randInt(0, this.rows - 1) }; if (!this.snake.some(s => s.x === f.x && s.y === f.y)) return f; }
        return { x: 0, y: 0 };
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">طول <b>${this.snake.length}</b></div>`); }

    update(dt) {
        Particles.update(dt); this.time += dt; this.foodPulse += dt * 5; if (this.deathFlash > 0) this.deathFlash -= dt;
        if (this.state !== 'playing') return;
        this.tick += dt;
        if (this.tick >= this.speed) {
            this.tick = 0; this.dir = { ...this.nextDir }; const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
            if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) return this.die();
            for (let i = 0; i < this.snake.length; i++) if (this.snake[i].x === head.x && this.snake[i].y === head.y) return this.die();
            this.snake.unshift(head);
            if (head.x === this.food.x && head.y === this.food.y) {
                this.score += 15; AudioEngine.coin(); Haptics.light(); const fx = this.offX + head.x * this.cell + this.cell / 2, fy = this.offY + head.y * this.cell + this.cell / 2;
                Particles.burst(fx, fy, 25, { color: '#2bff88', minSpeed: 100, maxSpeed: 350, gravity: 300 });
                this.food = this.spawnFood(); this.foodPulse = 0; this.speed = Math.max(0.06, this.speed - 0.005); this.updateHud();
            } else this.snake.pop();
        }
    }

    die() {
        if (this.state !== 'playing') return;
        this.state = 'dead'; this.deathFlash = 0.6; AudioEngine.hit(); Haptics.heavy(); Camera.add(1.2);
        const hx = this.offX + this.snake[0].x * this.cell + this.cell / 2, hy = this.offY + this.snake[0].y * this.cell + this.cell / 2;
        Particles.burst(hx, hy, 60, { color: '#ff2d78', minSpeed: 150, maxSpeed: 600, gravity: 500 });
        setTimeout(() => App.gameOver('snake', this.score), 900);
    }

    render() {
        const ctx = this.ctx; ctx.fillStyle = '#05070d'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#2bff88'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('SNAKE NEON', this.w / 2, this.h / 2 - 30); ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 30); return; }

        ctx.fillStyle = 'rgba(0,229,255,0.03)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16, 16); else ctx.rect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16); ctx.fill();
        ctx.strokeStyle = 'rgba(0,229,255,0.06)'; ctx.lineWidth = 1;
        for (let i = 0; i <= this.cols; i++) { const x = this.offX + i * this.cell; ctx.beginPath(); ctx.moveTo(x, this.offY); ctx.lineTo(x, this.offY + this.rows * this.cell); ctx.stroke(); }
        for (let j = 0; j <= this.rows; j++) { const y = this.offY + j * this.cell; ctx.beginPath(); ctx.moveTo(this.offX, y); ctx.lineTo(this.offX + this.cols * this.cell, y); ctx.stroke(); }

        const fx = this.offX + this.food.x * this.cell + this.cell / 2, fy = this.offY + this.food.y * this.cell + this.cell / 2, fP = 1 + Math.sin(this.foodPulse) * 0.2;
        ctx.fillStyle = '#2bff88'; ctx.shadowColor = '#2bff88'; ctx.shadowBlur = 25; ctx.beginPath(); ctx.arc(fx, fy, this.cell * 0.35 * fP, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;

        for (let i = this.snake.length - 1; i >= 0; i--) {
            const s = this.snake[i]; const x = this.offX + s.x * this.cell + 2, y = this.offY + s.y * this.cell + 2, w = this.cell - 4; const alpha = i === 0 ? 1 : 0.9 - (i / this.snake.length) * 0.5;
            if (i === 0) { ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25; }
            else { const g = ctx.createLinearGradient(x, y, x + w, y + w); g.addColorStop(0, `rgba(0,229,255,${alpha})`); g.addColorStop(1, `rgba(0,150,180,${alpha * 0.8})`); ctx.fillStyle = g; }
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, w, w * 0.35); else ctx.rect(x, y, w, w); ctx.fill(); ctx.shadowBlur = 0;
        }
        Particles.render(ctx); if (this.deathFlash > 0) { ctx.fillStyle = `rgba(255,45,120,${this.deathFlash})`; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); }
    }
    stop() { super.stop(); }
};

window.Game_flappy = class extends GameBase {
    constructor() {
        super();
        Particles.init(300);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() {
        return { type: 'custom', buttons: [{ label: '▲<span>پرواز</span>', action: () => this.flap() }] };
    }

    recalc() {
        this.groundY = this.h - 80;
        this.birdX = this.w * 0.28;
        this.birdR = 18 * clamp(Math.min(this.w, this.h) / 500, 0.7, 1.4);
        this.pipeW = Math.max(65, this.w * 0.18);
        this.gapH = Math.max(160, this.h * 0.30);
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') this.startGame();
            else if (this.state === 'playing') this.flap();
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
        this._key = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                if (this.state === 'menu' || this.state === 'dead') this.startGame();
                else if (this.state === 'playing') this.flap();
            }
        };
        window.addEventListener('keydown', this._key);
    }

    startGame() {
        this.state = 'playing';
        this.bird = { y: this.h / 2, vy: 0, rot: 0, wing: 0 };
        this.pipes = []; this.score = 0; this.spawnT = 0; this.spawnI = 1.6; this.gravity = 1800; this.flapV = -550; this.time = 0;
        this.stars = []; for (let i = 0; i < 100; i++) this.stars.push({ x: Math.random() * this.w, y: Math.random() * this.groundY, s: Math.random() * 2 + 0.5, p: Math.random() * 6.28 });
        this.clouds = []; for (let i = 0; i < 8; i++) this.clouds.push({ x: Math.random() * this.w, y: rand(50, this.groundY - 300), w: rand(120, 250), speed: rand(15, 40) });
        this.mountains = []; for (let i = 0; i < 6; i++) this.mountains.push({ x: i * (this.w / 1.5), w: rand(200, 350), h: rand(150, 350) });
        this.updateHud();
    }

    flap() {
        if (this.state !== 'playing') return;
        this.bird.vy = this.flapV; this.bird.wing = 1;
        AudioEngine.tone(550, 0.08, 'sine', 0.1, 750); Haptics.light();
        Particles.burst(this.birdX - this.birdR, this.bird.y + this.birdR * 0.5, 8, { color: '#00e5ff', minSpeed: 50, maxSpeed: 150, angle: Math.PI, gravity: 150 });
    }

    spawnPipe() {
        const margin = 70; const gapY = rand(this.gapH / 2 + margin, this.groundY - this.gapH / 2 - margin);
        const colors = ['#00e5ff', '#2bff88', '#a855f7'];
        this.pipes.push({ x: this.w + 40, gapY: gapY, scored: false, color: colors[Math.floor(Math.random() * colors.length)] });
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`); }

    update(dt) {
        Particles.update(dt); Camera.update(dt); this.time += dt;
        for (const s of this.stars) { s.x -= dt * 15; if (s.x < 0) s.x = this.w; }
        for (const c of this.clouds) { c.x -= c.speed * dt * 4; if (c.x + c.w < 0) c.x = this.w + 100; }
        for (const m of this.mountains) { m.x -= dt * 50; if (m.x + m.w < 0) m.x = this.w + 100; }
        this.bird.wing = Math.max(0, this.bird.wing - dt * 6);

        if (this.state === 'menu') { this.bird.y = this.h / 2 + Math.sin(this.time * 3) * 12; this.bird.rot = Math.sin(this.time * 3) * 0.1; return; }
        if (this.state === 'dead') { this.bird.vy += this.gravity * dt; this.bird.y += this.bird.vy * dt; if (this.bird.y > this.groundY - this.birdR) this.bird.y = this.groundY - this.birdR; return; }

        this.bird.vy += this.gravity * dt; this.bird.y += this.bird.vy * dt; this.bird.rot = clamp(this.bird.vy / 700, -0.8, 1.6);
        if (this.bird.y - this.birdR < 70) { this.bird.y = this.birdR + 70; this.bird.vy = 0; }
        if (this.bird.y + this.birdR > this.groundY) return this.die();

        this.spawnT += dt;
        if (this.spawnT >= this.spawnI) { this.spawnT = 0; this.spawnPipe(); }

        for (const p of this.pipes) {
            p.x -= 250 * dt;
            if (!p.scored && p.x + this.pipeW < this.birdX - this.birdR) { p.scored = true; this.score++; AudioEngine.coin(); Haptics.light(); this.updateHud(); }
            if (this.birdX + this.birdR > p.x && this.birdX - this.birdR < p.x + this.pipeW) {
                if (this.bird.y - this.birdR < p.gapY - this.gapH / 2 || this.bird.y + this.birdR > p.gapY + this.gapH / 2) return this.die();
            }
        }
        this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 50);
    }

    die() {
        if (this.state !== 'playing') return;
        this.state = 'dead'; AudioEngine.hit(); Haptics.heavy(); Camera.add(1.5);
        Particles.burst(this.birdX, this.bird.y, 50, { color: '#ff2d78', minSpeed: 150, maxSpeed: 500, gravity: 600 });
        setTimeout(() => App.gameOver('flappy', this.score), 1000);
    }

    render() {
        const ctx = this.ctx; Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.groundY); bg.addColorStop(0, '#05070d'); bg.addColorStop(0.5, '#0f1423'); bg.addColorStop(1, '#2a0f3a');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        for (const s of this.stars) { ctx.globalAlpha = 0.3 + Math.sin(this.time * 2 + s.p) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
        ctx.globalAlpha = 1;
        for (const m of this.mountains) { ctx.fillStyle = 'rgba(20, 10, 40, 0.85)'; ctx.beginPath(); ctx.moveTo(m.x, this.groundY); ctx.lineTo(m.x + m.w / 2, this.groundY - m.h); ctx.lineTo(m.x + m.w, this.groundY); ctx.closePath(); ctx.fill(); }
        for (const c of this.clouds) { ctx.fillStyle = 'rgba(0,229,255,0.06)'; ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y, c.w / 3, 0, 6.28); ctx.arc(c.x + c.w * 0.3, c.y + 15, c.w / 4, 0, 6.28); ctx.arc(c.x + c.w * 0.7, c.y + 15, c.w / 4, 0, 6.28); ctx.fill(); }

        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30; ctx.fillText('FLAPPY NEON', this.w / 2, this.h / 2 - 30); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 30); Camera.reset(ctx); return; }

        for (const p of this.pipes) {
            const topH = p.gapY - this.gapH / 2; const botY = p.gapY + this.gapH / 2; const botH = this.groundY - botY;
            const pg = ctx.createLinearGradient(p.x, 0, p.x + this.pipeW, 0); pg.addColorStop(0, p.color); pg.addColorStop(0.5, this.lighten(p.color, 60)); pg.addColorStop(1, this.darken(p.color, 60));
            ctx.fillStyle = pg; ctx.shadowColor = p.color; ctx.shadowBlur = 20;
            ctx.fillRect(p.x, 70, this.pipeW, topH - 70); ctx.fillRect(p.x, botY, this.pipeW, botH);
            const cap = 30; ctx.fillRect(p.x - 6, topH - cap, this.pipeW + 12, cap); ctx.fillRect(p.x - 6, botY, this.pipeW + 12, cap);
            ctx.shadowBlur = 0;
        }

        const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h); gg.addColorStop(0, '#1a0a35'); gg.addColorStop(1, '#000');
        ctx.fillStyle = gg; ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(0, this.groundY); ctx.lineTo(this.w, this.groundY); ctx.stroke(); ctx.shadowBlur = 0;

        Particles.render(ctx);
        const bx = this.birdX, by = this.bird.y, br = this.birdR;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(this.bird.rot);
        ctx.fillStyle = '#ffc531'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 25; ctx.beginPath(); ctx.ellipse(0, 0, br * 1.3, br, 0, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
        const wy = this.bird.wing * 18; ctx.fillStyle = '#ff9a00'; ctx.beginPath(); ctx.ellipse(-br * 0.2, wy * 0.5, br * 0.7, br * 0.4, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(br * 0.4, -br * 0.2, br * 0.35, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#04101a'; ctx.beginPath(); ctx.arc(br * 0.5, -br * 0.2, br * 0.15, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.moveTo(br, 0); ctx.lineTo(br * 1.5, br * 0.15); ctx.lineTo(br, br * 0.3); ctx.closePath(); ctx.fill();
        ctx.restore(); Camera.reset(ctx);
    }

    lighten(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.min(255, parseInt(h.substr(i,2),16) + a).toString(16).padStart(2,'0')).join(''); }
    darken(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.max(0, parseInt(h.substr(i,2),16) - a).toString(16).padStart(2,'0')).join(''); }
    stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); if (this._key) window.removeEventListener('keydown', this._key); }
};

window.Game_breakout = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() {
        return { type: 'custom', buttons: [{ label: '◀', action: () => { this.paddleX = clamp(this.paddleX - 50, 0, this.w - this.paddleW); } }, { label: '▶', action: () => { this.paddleX = clamp(this.paddleX + 50, 0, this.w - this.paddleW); } }] };
    }

    recalc() { this.paddleW = this.w * 0.25; this.paddleH = 18; this.paddleY = this.h - 90; this.ballR = 10 * clamp(Math.min(this.w, this.h) / 500, 0.7, 1.3); }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu') { this.startGame(); return; }
            if (this.state === 'ready') { this.launch(); return; }
            const r = this.canvas.getBoundingClientRect();
            this.paddleX = clamp(e.clientX - r.left - this.paddleW / 2, 0, this.w - this.paddleW);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
        this._move = (e) => {
            if (!e.buttons && this.state !== 'ready') return;
            const r = this.canvas.getBoundingClientRect();
            this.paddleX = clamp(e.clientX - r.left - this.paddleW / 2, 0, this.w - this.paddleW);
        };
        this.canvas.addEventListener('pointermove', this._move);
        this._key = (e) => {
            if (e.key === ' ') { e.preventDefault(); if (this.state === 'menu') this.startGame(); else if (this.state === 'ready') this.launch(); }
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = true;
        };
        window.addEventListener('keydown', this._key);
        this._keyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = false;
        };
        window.addEventListener('keyup', this._keyUp);
    }

    startGame() {
        this.state = 'ready'; this.paddleX = (this.w - this.paddleW) / 2; this.score = 0; this.lives = 3; this.level = 1;
        this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450, trail: [] }]; this.bricks = []; this.buildLevel(); this.updateHud();
    }

    buildLevel() {
        this.bricks = []; const rows = Math.min(4 + this.level, 8), cols = 9, bw = (this.w - 60) / cols, bh = 26;
        const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88', '#ff7a00'];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.1) continue;
            const isHard = Math.random() < 0.3;
            this.bricks.push({ x: 30 + c * bw + 3, y: 90 + r * (bh + 8), w: bw - 6, h: bh, color: colors[r % colors.length], hp: isHard ? 2 : 1, alive: true });
        }
    }

    launch() { this.state = 'playing'; for (const b of this.balls) { b.vx = rand(-280, 280); b.vy = -b.speed; } AudioEngine.tone(600, 0.1, 'sine', 0.1); }
    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives} · موج ${this.level}</div>`); }

    update(dt) {
        Particles.update(dt); Camera.update(dt);
        if (this.keyLeft) this.paddleX = clamp(this.paddleX - 800 * dt, 0, this.w - this.paddleW);
        if (this.keyRight) this.paddleX = clamp(this.paddleX + 800 * dt, 0, this.w - this.paddleW);

        if (this.state !== 'playing') {
            if (this.state === 'ready') { this.balls[0].x = this.paddleX + this.paddleW / 2; this.balls[0].y = this.paddleY - 25; }
            return;
        }

        for (const b of this.balls) {
            b.x += b.vx * dt; b.y += b.vy * dt;
            b.trail.push({ x: b.x, y: b.y, life: 0.25 }); for (const t of b.trail) t.life -= dt; b.trail = b.trail.filter(t => t.life > 0);
            if (b.x - this.ballR < 0) { b.x = this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }
            if (b.x + this.ballR > this.w) { b.x = this.w - this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }
            if (b.y - this.ballR < 70) { b.y = this.ballR + 70; b.vy *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }
            if (b.y + this.ballR > this.paddleY && b.y - this.ballR < this.paddleY + this.paddleH && b.x > this.paddleX && b.x < this.paddleX + this.paddleW && b.vy > 0) {
                const hp = (b.x - this.paddleX) / this.paddleW; const angle = (hp - 0.5) * Math.PI * 0.85; const sp = Math.hypot(b.vx, b.vy);
                b.vx = Math.sin(angle) * sp; b.vy = -Math.abs(Math.cos(angle) * sp); b.y = this.paddleY - this.ballR;
                AudioEngine.tone(700, 0.08, 'sine', 0.1); Haptics.light();
                Particles.burst(b.x, b.y, 8, { color: '#ffc531', minSpeed: 60, maxSpeed: 180, angle: -Math.PI / 2 });
            }
        }

        this.balls = this.balls.filter(b => b.y - this.ballR <= this.h);
        if (this.balls.length === 0) this.loseLife();

        for (const b of this.balls) for (const br of this.bricks) {
            if (!br.alive) continue;
            if (b.x + this.ballR > br.x && b.x - this.ballR < br.x + br.w && b.y + this.ballR > br.y && b.y - this.ballR < br.y + br.h) {
                br.hp--; AudioEngine.tone(800, 0.05, 'square', 0.1); Haptics.light(); Camera.add(0.08);
                Particles.burst(b.x, b.y, 6, { color: br.color, minSpeed: 60, maxSpeed: 200, gravity: 200 });
                if (br.hp <= 0) {
                    br.alive = false; this.score += 25 * this.level; Camera.add(0.15);
                    Particles.burst(br.x + br.w / 2, br.y + br.h / 2, 20, { color: br.color, minSpeed: 120, maxSpeed: 400, gravity: 500 });
                }
                const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
                if (Math.abs(b.x - cx) / br.w > Math.abs(b.y - cy) / br.h) b.vx *= -1; else b.vy *= -1;
                break;
            }
        }

        if (this.bricks.every(br => !br.alive)) {
            this.level++; this.buildLevel(); this.state = 'ready';
            this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450 + this.level * 30, trail: [] }];
            AudioEngine.win(); Haptics.success(); this.updateHud();
        }
    }

    loseLife() {
        this.lives--; this.state = 'ready'; this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450, trail: [] }]; this.paddleX = (this.w - this.paddleW) / 2;
        AudioEngine.hit(); Haptics.heavy(); Camera.add(1.2); this.updateHud();
        if (this.lives <= 0) { this.state = 'dead'; setTimeout(() => App.gameOver('breakout', this.score, { level: this.level }), 600); }
    }

    render() {
        const ctx = this.ctx; Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#1a0a2a');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        if (this.state === 'menu') { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('BREAKOUT PRO', this.w / 2, this.h / 2 - 30); ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20); Camera.reset(ctx); return; }
        
        for (const br of this.bricks) {
            if (!br.alive) continue;
            const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h); g.addColorStop(0, br.color); g.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = g; ctx.shadowColor = br.color; ctx.shadowBlur = br.hp > 1 ? 18 : 8;
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(br.x, br.y, br.w, br.h, 8); else ctx.rect(br.x, br.y, br.w, br.h); ctx.fill(); ctx.shadowBlur = 0;
            if (br.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        }
        Particles.render(ctx);
        ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, 10); else ctx.rect(this.paddleX, this.paddleY, this.paddleW, this.paddleH); ctx.fill(); ctx.shadowBlur = 0;
        for (const b of this.balls) {
            for (const t of b.trail) { ctx.globalAlpha = t.life * 4; ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(b.x, b.y, this.ballR, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
        }
        if (this.state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.w / 2 - 130, this.h / 2 - 30, 260, 50); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('برای شلیک ضربه بزنید', this.w / 2, this.h / 2); }
        Camera.reset(ctx);
    }
    stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); if (this._move) this.canvas.removeEventListener('pointermove', this._move); if (this._key) window.removeEventListener('keydown', this._key); if (this._keyUp) window.removeEventListener('keyup', this._keyUp); }
};
