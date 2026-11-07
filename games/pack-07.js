window.Game_physics = class extends GameBase {
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
        this.ballR = 16;
        this.gravity = 900;
        this.friction = 0.99;
        this.bounce = 0.7;
    }

    bindInputs() {
        this._down = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') {
                this.startGame();
                return;
            }
            if (this.state !== 'playing' || this.ball.launched) return;
            
            this.aiming = true;
            const r = this.canvas.getBoundingClientRect();
            this.startPos = { x: e.clientX - r.left, y: e.clientY - r.top };
            this.endPos = { x: this.startPos.x, y: this.startPos.y };
        };

        this._move = (e) => {
            if (!this.aiming) return;
            const r = this.canvas.getBoundingClientRect();
            this.endPos = { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        this._up = () => {
            if (!this.aiming) return;
            this.aiming = false;
            this.ball.launched = true;
            
            const dx = this.startPos.x - this.endPos.x;
            const dy = this.startPos.y - this.endPos.y;
            
            this.ball.vx = dx * 5;
            this.ball.vy = dy * 5;
            
            AudioEngine.tone(400, 0.1, 'sine', 0.1, 800);
            Haptics.light();
            Camera.add(0.3);
            
            Particles.burst(this.ball.x, this.ball.y, 20, { color: '#00e5ff', minSpeed: 80, maxSpeed: 250, gravity: 0 });
        };

        this.canvas.addEventListener('pointerdown', this._down, { passive: false });
        window.addEventListener('pointermove', this._move);
        window.addEventListener('pointerup', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.ball = { x: 60, y: this.h - 60, vx: 0, vy: 0, r: this.ballR, launched: false, trail: [] };
        this.targets = [];
        this.walls = [];
        this.aiming = false;
        this.startPos = null;
        this.endPos = null;
        this.generateLevel();
        this.updateHud();
    }

    generateLevel() {
        this.targets = [];
        this.walls = [];
        
        const targetX = rand(this.w * 0.5, this.w - 80);
        const targetY = rand(100, this.h * 0.5);
        
        this.targets.push({ x: targetX, y: targetY, w: 60, h: 60, hit: false, pulse: 0 });

        if (this.level > 1) this.walls.push({ x: this.w * 0.4, y: 0, w: 24, h: this.h * 0.6 });
        if (this.level > 2) this.walls.push({ x: 0, y: this.h * 0.4, w: this.w * 0.6, h: 24 });
        if (this.level > 3) this.walls.push({ x: this.w * 0.7, y: this.h * 0.3, w: 24, h: this.h * 0.4 });
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">مرحله ${this.level}</div>`);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);

        if (this.state !== 'playing') return;

        for (const t of this.targets) {
            if (t.pulse > 0) t.pulse -= dt * 4;
        }

        const b = this.ball;
        
        if (b.launched) {
            b.vy += this.gravity * dt;
            b.vx *= this.friction;
            
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            b.trail.push({ x: b.x, y: b.y, life: 0.35 });
            for (const t of b.trail) t.life -= dt;
            b.trail = b.trail.filter(t => t.life > 0);

            if (b.x - b.r < 0) { b.x = b.r; b.vx *= -this.bounce; this.bounceEffect(b.x, b.y); }
            if (b.x + b.r > this.w) { b.x = this.w - b.r; b.vx *= -this.bounce; this.bounceEffect(b.x, b.y); }
            if (b.y - b.r < 60) { b.y = b.r + 60; b.vy *= -this.bounce; this.bounceEffect(b.x, b.y); }
            if (b.y + b.r > this.h) { b.y = this.h - b.r; b.vy *= -this.bounce; b.vx *= 0.95; this.bounceEffect(b.x, b.y); }

            for (const wall of this.walls) {
                if (b.x + b.r > wall.x && b.x - b.r < wall.x + wall.w && b.y + b.r > wall.y && b.y - b.r < wall.y + wall.h) {
                    if (b.x < wall.x + wall.w / 2) b.x = wall.x - b.r;
                    else if (b.x > wall.x + wall.w / 2) b.x = wall.x + wall.w + b.r;
                    b.vx *= -this.bounce;
                    this.bounceEffect(b.x, b.y);
                }
            }

            for (const t of this.targets) {
                if (t.hit) continue;
                if (b.x + b.r > t.x && b.x - b.r < t.x + t.w && b.y + b.r > t.y && b.y - b.r < t.y + t.h) {
                    t.hit = true;
                    t.pulse = 1;
                    this.score += 100;
                    this.updateHud();
                    
                    AudioEngine.win();
                    Haptics.success();
                    Camera.add(0.6);
                    
                    Particles.burst(t.x + t.w / 2, t.y + t.h / 2, 50, { color: '#ffc531', minSpeed: 150, maxSpeed: 500, gravity: 300 });

                    this.level++;
                    setTimeout(() => {
                        if (this.state === 'playing') {
                            this.ball = { x: 60, y: this.h - 60, vx: 0, vy: 0, r: this.ballR, launched: false, trail: [] };
                            this.generateLevel();
                            this.updateHud();
                        }
                    }, 1000);
                }
            }
        }
    }

    bounceEffect(x, y) {
        AudioEngine.tone(300, 0.05, 'square', 0.05);
        Haptics.light();
        Particles.burst(x, y, 6, { color: '#00e5ff', minSpeed: 30, maxSpeed: 100 });
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
            ctx.fillText('PHYSICS BALL', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        for (const t of this.targets) {
            if (t.hit) continue;
            const scale = 1 + Math.sin(t.pulse * Math.PI) * 0.2;
            ctx.save();
            ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
            ctx.scale(scale, scale);
            
            ctx.fillStyle = '#ffc531';
            ctx.shadowColor = '#ffc531';
            ctx.shadowBlur = 30;
            
            ctx.beginPath();
            ctx.arc(0, 0, t.w / 2, 0, 6.28);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, t.w / 4, 0, 6.28);
            ctx.fill();
            
            ctx.restore();
            ctx.shadowBlur = 0;
        }

        for (const w of this.walls) {
            ctx.fillStyle = '#ff2d78';
            ctx.shadowColor = '#ff2d78';
            ctx.shadowBlur = 20;
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.shadowBlur = 0;
        }

        const b = this.ball;

        for (const t of b.trail) {
            ctx.globalAlpha = t.life * 3;
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, b.r * 0.8, 0, 6.28);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this.aiming && this.startPos && this.endPos) {
            const dx = this.startPos.x - this.endPos.x;
            const dy = this.startPos.y - this.endPos.y;
            
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + dx * 3, b.y + dy * 3);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(b.x + dx * 3, b.y + dy * 3, 8, 0, 6.28);
            ctx.fill();
        }

        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 6.28);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, 6.28);
        ctx.fill();

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
        if (this._move) window.removeEventListener('pointermove', this._move);
        if (this._up) window.removeEventListener('pointerup', this._up);
    }
};

window.Game_reaction = class extends GameBase {
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
        this.btnW = 220;
        this.btnH = 70;
        this.btnX = (this.w - this.btnW) / 2;
        this.btnY = this.h * 0.7;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            const r = this.canvas.getBoundingClientRect();
            this.handleInput({ x: e.clientX - r.left, y: e.clientY - r.top });
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    handleInput(pt) {
        if (this.state === 'menu') { this.startGame(); return; }
        if (this.state === 'gameover') {
            if (pt.x >= this.btnX && pt.x <= this.btnX + this.btnW && pt.y >= this.btnY && pt.y <= this.btnY + this.btnH) {
                this.startGame();
            }
            return;
        }
        if (this.state === 'countdown' || this.state === 'result') return;

        if (this.state === 'wait') this.penalty();
        else if (this.state === 'tap') this.recordTime();
    }

    startGame() {
        this.round = 1;
        this.maxRounds = 5;
        this.times = [];
        this.score = 0;
        this.waitTimer = 0;
        this.countdownTimer = 3.0;
        this.resultTimer = 0;
        this.state = 'countdown';
        this.color = '#05070d';
        this.currentText = 'آماده باش';
        this.lastTick = 4;
        this.updateHud();
        AudioEngine.tone(400, 0.1, 'sine', 0.1);
    }

    startRound() {
        this.state = 'countdown';
        this.countdownTimer = 3.0;
        this.lastTick = 4;
        this.color = '#05070d';
    }

    penalty() {
        this.times.push(1.0);
        AudioEngine.hit(); Haptics.heavy(); Camera.add(1.5);
        Particles.burst(this.w / 2, this.h / 2, 50, { color: '#ff2d78', minSpeed: 200, maxSpeed: 600 });
        this.state = 'result';
        this.resultTimer = 1.5;
        this.currentText = 'خیلی زود بود!';
        this.updateHud();
    }

    recordTime() {
        const time = (performance.now() - this.startTime) / 1000;
        this.times.push(time);
        
        AudioEngine.win(); Haptics.success(); Camera.add(0.4);
        Particles.burst(this.w / 2, this.h / 2, 40, { color: '#2bff88', minSpeed: 150, maxSpeed: 500 });
        
        this.state = 'result';
        this.resultTimer = 1.5;
        this.currentText = Math.floor(time * 1000) + ' ms';
        this.updateHud();
    }

    nextRound() {
        this.round++;
        if (this.round > this.maxRounds) {
            this.state = 'gameover';
            const avg = this.times.reduce((a, b) => a + b, 0) / this.maxRounds;
            this.score = Math.max(0, 10000 - Math.floor(avg * 10000));
            AudioEngine.win(); Haptics.success();
        } else {
            this.startRound();
        }
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">دور <b>${Math.min(this.round, this.maxRounds)}/${this.maxRounds}</b></div><div class="hud-pill">امتیاز <b>${this.score}</b></div>`);
    }

    update(dt) {
        Particles.update(dt); Camera.update(dt);

        if (this.state === 'countdown') {
            this.countdownTimer -= dt;
            const currentTick = Math.ceil(this.countdownTimer);
            if (currentTick !== this.lastTick && currentTick > 0) {
                this.lastTick = currentTick;
                AudioEngine.tone(600, 0.1, 'square', 0.1);
                Camera.add(0.15);
            }
            if (this.countdownTimer <= 0) {
                this.state = 'wait';
                this.waitTimer = rand(1.5, 4.0);
                this.color = '#ff2d78';
                this.currentText = 'منتظر بمان...';
                AudioEngine.tone(300, 0.1, 'sine', 0.1);
            }
        } else if (this.state === 'wait') {
            this.waitTimer -= dt;
            if (this.waitTimer <= 0) {
                this.state = 'tap';
                this.color = '#2bff88';
                this.currentText = 'بزن!';
                this.startTime = performance.now();
                AudioEngine.tone(1000, 0.15, 'sine', 0.25);
                Camera.add(0.3);
            }
        } else if (this.state === 'result') {
            this.resultTimer -= dt;
            if (this.resultTimer <= 0) this.nextRound();
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        if (this.state === 'menu') {
            const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
            bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
            ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
            ctx.fillText('REACTION TEST', this.w / 2, this.h / 2 - 40);
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('واکنش خود را بسنجید', this.w / 2, this.h / 2 + 10);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '16px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 50);
            Camera.reset(ctx); return;
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'countdown') {
            const text = Math.ceil(this.countdownTimer) > 0 ? Math.ceil(this.countdownTimer).toString() : 'برو!';
            const scale = 1 + Math.sin((this.countdownTimer % 1) * Math.PI) * 0.25;
            ctx.save(); 
            ctx.translate(this.w / 2, this.h / 2); 
            ctx.scale(scale, scale);
            ctx.fillStyle = text === 'برو!' ? '#2bff88' : '#fff'; 
            ctx.font = 'bold 100px Tahoma'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle'; 
            ctx.shadowColor = ctx.fillStyle; 
            ctx.shadowBlur = 40;
            ctx.fillText(text, 0, 0);
            ctx.restore();
            ctx.shadowBlur = 0;
        } else if (this.state === 'wait' || this.state === 'tap') {
            ctx.fillStyle = '#fff'; 
            ctx.font = 'bold 40px Tahoma'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            if (this.state === 'tap') { ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; }
            ctx.fillText(this.currentText, this.w / 2, this.h / 2);
            ctx.shadowBlur = 0;
        } else if (this.state === 'result') {
            ctx.fillStyle = this.currentText === 'خیلی زود بود!' ? '#ff2d78' : '#00e5ff';
            ctx.font = 'bold 56px Tahoma'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.shadowColor = ctx.fillStyle; 
            ctx.shadowBlur = 30;
            ctx.fillText(this.currentText, this.w / 2, this.h / 2);
            ctx.shadowBlur = 0;
        } else if (this.state === 'gameover') {
            const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
            bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
            ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ffc531'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
            ctx.fillText('پایان بازی!', this.w / 2, this.h * 0.25);
            const avg = this.times.reduce((a, b) => a + b, 0) / this.maxRounds;
            ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('میانگین واکنش:', this.w / 2, this.h * 0.4);
            ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 36px Tahoma'; ctx.fillText(Math.floor(avg * 1000) + ' ms', this.w / 2, this.h * 0.48);
            ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('امتیاز نهایی: ' + this.score, this.w / 2, this.h * 0.58);

            ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(this.btnX, this.btnY, this.btnW, this.btnH, 16); else ctx.rect(this.btnX, this.btnY, this.btnW, this.btnH);
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#04101a'; ctx.font = 'bold 22px Tahoma'; ctx.fillText('شروع مجدد', this.w / 2, this.btnY + this.btnH / 2 + 2);
        }

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_timberman = class extends GameBase {
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
        return {
            type: 'custom',
            buttons: [
                { label: '◀<span>چپ</span>', action: () => this.chop('left') },
                { label: '▶<span>راست</span>', action: () => this.chop('right') }
            ]
        };
    }

    recalc() {
        this.treeX = this.w / 2;
        this.treeW = Math.min(this.w * 0.4, 160);
        this.groundY = this.h - 100;
        this.playerY = this.groundY - 45;
        this.branchH = 24;
        this.baseSpeed = 200;
        this.currentSide = 'left';
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
    }

    bindInputs() {
        this._key = (e) => {
            if (this.state === 'menu' || this.state === 'dead') {
                if (e.key === ' ' || e.key === 'Enter') this.startGame();
                return;
            }
            if (this.state !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); this.chop('left'); }
            if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); this.chop('right'); }
        };
        window.addEventListener('keydown', this._key);
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.branches = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.currentSide = 'left';
        this.hitFlash = 0;
        this.shakeTimer = 0;
        this.time = 0;
        this.updateHud();
    }

    chop(side) {
        if (this.state !== 'playing') return;
        if (side !== this.currentSide) {
            this.currentSide = side;
            AudioEngine.tone(350, 0.06, 'triangle', 0.1);
            Haptics.light();
        }
        this.score += 2;
        AudioEngine.chop();
        Haptics.light();
        Camera.add(0.2);
        this.shakeTimer = 0.15;

        const px = this.treeX + (side === 'left' ? -this.treeW / 2 - 25 : this.treeW / 2 + 25);
        const py = this.playerY;
        Particles.burst(px, py, 15, { color: '#c8a878', minSpeed: 100, maxSpeed: 300, gravity: 500, angle: side === 'left' ? Math.PI : 0 });

        for (let i = this.branches.length - 1; i >= 0; i--) {
            const b = this.branches[i];
            if (!b.dead && Math.abs(b.y - this.playerY) < 35) {
                if (b.side === side) {
                    b.dead = true;
                    this.combo++;
                    this.score += 5 + (this.combo * 2);
                    AudioEngine.coin();
                    Haptics.success();
                    Camera.add(0.4);
                    Particles.burst(this.treeX, b.y, 25, { color: '#8B5A2B', minSpeed: 150, maxSpeed: 400, gravity: 600 });
                } else {
                    this.hitFlash = 0.4;
                    this.combo = 0;
                }
            }
        }
        this.updateHud();
    }

    spawnBranch() {
        const lastBranch = this.branches[this.branches.length - 1];
        let side;
        if (lastBranch && Math.random() < 0.65) side = lastBranch.side === 'left' ? 'right' : 'left';
        else side = Math.random() < 0.5 ? 'left' : 'right';
        
        this.branches.push({
            x: this.treeX + (side === 'left' ? -this.treeW / 2 - 60 : this.treeW / 2),
            y: 80,
            side: side,
            dead: false
        });
    }

    die() {
        if (this.state !== 'playing') return;
        this.state = 'dead';
        AudioEngine.hit();
        AudioEngine.lose();
        Haptics.heavy();
        Camera.add(2);
        Particles.burst(this.treeX, this.playerY, 60, { color: '#ff2d78', minSpeed: 200, maxSpeed: 600, gravity: 600 });
        setTimeout(() => App.gameOver('timberman', this.score, { combo: this.combo }), 900);
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives}</div><div class="hud-pill">🔥 کمبو ${this.combo}</div>`);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        this.time += dt;
        if (this.shakeTimer > 0) this.shakeTimer -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.state !== 'playing') return;

        this.spawnTimer += dt;
        const speedMul = 1 + this.score * 0.002;
        if (this.spawnTimer >= this.spawnInterval / speedMul) {
            this.spawnTimer = 0;
            this.spawnBranch();
        }

        const speed = this.baseSpeed * speedMul;
        for (let i = this.branches.length - 1; i >= 0; i--) {
            const b = this.branches[i];
            if (b.dead) continue;
            b.y += speed * dt;
            if (Math.abs(b.y - this.playerY) < 32) {
                if (b.side === this.currentSide) {
                    b.dead = true;
                    this.lives--;
                    this.combo = 0;
                    this.hitFlash = 0.5;
                    Camera.add(1.5);
                    Haptics.heavy();
                    AudioEngine.hit();
                    Particles.burst(this.treeX, b.y, 30, { color: '#ff2d78', minSpeed: 150, maxSpeed: 400 });
                    if (this.lives <= 0) return this.die();
                }
            }
            if (b.y > this.h + 60) this.branches.splice(i, 1);
        }
        this.branches = this.branches.filter(b => !b.dead || b.y < this.h + 60);
        this.updateHud();
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
        bg.addColorStop(0, '#0a0e1a'); bg.addColorStop(1, '#1a1235');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        for (let i = 0; i < 6; i++) {
            const my = 100 + i * 120;
            ctx.fillStyle = `rgba(45,35,70,${0.4 + i * 0.05})`;
            ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(this.w * 0.3, my - 60); ctx.lineTo(this.w * 0.6, my); ctx.fill();
        }

        ctx.fillStyle = '#2a1055'; ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.moveTo(0, this.groundY); ctx.lineTo(this.w, this.groundY); ctx.stroke(); ctx.shadowBlur = 0;

        const trunkGrad = ctx.createLinearGradient(this.treeX - this.treeW / 2, 0, this.treeX + this.treeW / 2, 0);
        trunkGrad.addColorStop(0, '#5a3a1a'); trunkGrad.addColorStop(0.5, '#8B5A2B'); trunkGrad.addColorStop(1, '#5a3a1a');
        ctx.fillStyle = trunkGrad; ctx.fillRect(this.treeX - this.treeW / 2, 40, this.treeW, this.groundY - 40);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 5; i++) {
            const lx = this.treeX - this.treeW / 2 + (i + 0.5) * (this.treeW / 5);
            ctx.beginPath(); ctx.moveTo(lx, 40); ctx.lineTo(lx + Math.sin(this.time + i) * 4, this.groundY); ctx.stroke();
        }

        for (const b of this.branches) {
            if (b.dead) continue;
            const dir = b.side === 'left' ? -1 : 1;
            const baseX = b.side === 'left' ? this.treeX - this.treeW / 2 : this.treeX + this.treeW / 2;
            ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(baseX, b.y); ctx.lineTo(baseX + dir * 60, b.y); ctx.stroke();
            ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(baseX + dir * 60, b.y, 15, 0, 6.28); ctx.fill();
        }

        Particles.render(ctx);

        const px = this.treeX + (this.currentSide === 'left' ? -this.treeW / 2 - 25 : this.treeW / 2 + 25);
        const py = this.playerY;
        ctx.fillStyle = '#e0b090'; ctx.beginPath(); ctx.ellipse(px, py, 12, 18, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(px, py - 25, 13, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#c83030'; ctx.beginPath(); ctx.moveTo(px - 14, py - 30); ctx.lineTo(px + 14, py - 30); ctx.lineTo(px + 12, py - 40); ctx.lineTo(px - 12, py - 40); ctx.closePath(); ctx.fill();

        ctx.save(); ctx.translate(px, py); ctx.rotate(this.currentSide === 'left' ? -0.6 : 0.6);
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -35); ctx.stroke();
        ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(this.currentSide === 'left' ? -15 : 15, -40); ctx.lineTo(0, -45); ctx.closePath(); ctx.fill();
        ctx.restore();

        if (this.hitFlash > 0) { ctx.fillStyle = `rgba(255,45,120,${this.hitFlash * 0.6})`; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); }
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._key) window.removeEventListener('keydown', this._key);
    }
};
