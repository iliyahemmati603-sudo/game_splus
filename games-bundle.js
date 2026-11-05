'use strict';

window.Game_runner = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.highScore = Storage.data.best['runner'] || 0;
        this.bindInputs();
    }

    recalc() {
        this.groundY = this.h * 0.82;
        this.scale = clamp(Math.min(this.w, this.h) / 600, 0.6, 1.5);
        this.playerW = 34 * this.scale;
        this.playerH = 50 * this.scale;
        this.gravity = 2500 * this.scale;
        this.jumpForce = -900 * this.scale;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
            } else if (this.state === 'playing') {
                this.jump();
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._key = (e) => {
            const k = e.key.toLowerCase();
            if (k === ' ' || k === 'arrowup' || k === 'w') {
                e.preventDefault();
                if (this.state === 'menu' || this.state === 'dead') {
                    this.startGame();
                } else {
                    this.jump();
                }
            }
            if (k === 'arrowdown' || k === 's') {
                e.preventDefault();
                this.slide();
            }
        };
        window.addEventListener('keydown', this._key);
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.coins = 0;
        this.gems = 0;
        this.speed = 400 * this.scale;
        this.baseSpeed = 400 * this.scale;
        this.spawnTimer = 0;
        this.spawnInterval = 1.4;
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.combo = 0;
        this.comboTimer = 0;
        this.multiplier = 1;
        this.shieldActive = false;
        this.magnetTimer = 0;
        this.deathTimer = 0;
        this.trail = [];
        this.time = 0;
        this.sliding = false;
        this.slideTimer = 0;
        this.invulnTimer = 0;
        
        this.player = {
            x: this.w * 0.2,
            y: this.groundY - this.playerH,
            vy: 0,
            w: this.playerW,
            h: this.playerH,
            grounded: true,
            jumpsUsed: 0,
            squash: 1,
            stretch: 1,
            runFrame: 0
        };

        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * this.w,
                y: Math.random() * this.h * 0.7,
                size: Math.random() * 2.5 + 0.5,
                speed: Math.random() * 4 + 1,
                alpha: Math.random()
            });
        }

        this.bgMountains = [];
        for (let i = 0; i < 10; i++) {
            this.bgMountains.push({
                x: i * (this.w / 4),
                w: rand(150, 300),
                h: rand(80, 220),
                color: `rgba(25, 15, 45, ${rand(0.5, 0.9)})`
            });
        }

        this.updateHud();
    }

    jump() {
        if (this.state !== 'playing') {
            return;
        }
        const p = this.player;
        if (p.grounded) {
            p.vy = this.jumpForce;
            p.grounded = false;
            p.jumpsUsed = 1;
            p.squash = 0.65;
            p.stretch = 1.35;
            AudioEngine.jump();
            Haptics.light();
            Particles.burst(p.x + p.w / 2, p.y + p.h, 15, {
                color: '#00e5ff',
                minSpeed: 60,
                maxSpeed: 220,
                gravity: 400
            });
        } else if (p.jumpsUsed < 2) {
            p.vy = this.jumpForce * 0.85;
            p.jumpsUsed = 2;
            p.squash = 0.8;
            p.stretch = 1.2;
            AudioEngine.tone(650, 0.1, 'sine', 0.15, 850);
            Haptics.light();
            Particles.burst(p.x + p.w / 2, p.y + p.h, 25, {
                color: '#ff2d78',
                minSpeed: 100,
                maxSpeed: 300,
                gravity: 200
            });
        }
    }

    slide() {
        if (this.state === 'playing' && this.player.grounded && !this.sliding) {
            this.sliding = true;
            this.slideTimer = 0.7;
            AudioEngine.tone(300, 0.1, 'sawtooth', 0.1);
            Haptics.light();
        }
    }

    spawnObstacle() {
        const r = Math.random();
        const w = rand(30, 50) * this.scale;
        const h = rand(40, 80) * this.scale;
        
        if (r < 0.6) {
            this.obstacles.push({
                x: this.w + 50,
                y: this.groundY - h,
                w: w,
                h: h,
                type: 'block',
                scored: false
            });
        } else if (r < 0.85) {
            this.obstacles.push({
                x: this.w + 50,
                y: this.groundY - 140 * this.scale,
                w: w,
                h: h,
                type: 'drone',
                scored: false,
                phase: Math.random() * 6.28,
                baseY: this.groundY - 140 * this.scale
            });
        } else {
            this.obstacles.push({
                x: this.w + 50,
                y: this.groundY - h,
                w: w * 1.5,
                h: h,
                type: 'spike',
                scored: false
            });
        }
    }

    spawnCollectible() {
        const y = this.groundY - rand(60, 200) * this.scale;
        const isGem = Math.random() < 0.25;
        this.collectibles.push({
            x: this.w + 50,
            y: y,
            r: 14 * this.scale,
            type: isGem ? 'gem' : 'coin',
            taken: false,
            bob: Math.random() * 6.28,
            value: isGem ? 50 : 10
        });
    }

    spawnPowerup() {
        if (Math.random() < 0.1) {
            const types = ['shield', 'magnet'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerups.push({
                x: this.w + 50,
                y: this.groundY - rand(100, 180) * this.scale,
                r: 18 * this.scale,
                type: type,
                taken: false,
                bob: Math.random() * 6.28
            });
        }
    }

    updateHud() {
        const mult = this.multiplier > 1 ? ` ×${this.multiplier}` : '';
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${Math.floor(this.score)}${mult}</b></div>
            <div class="hud-pill">🪙 ${this.coins} · 💎 ${this.gems}</div>
        `);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        this.time += dt;

        for (const s of this.stars) {
            s.x -= this.speed * 0.05 * dt * s.speed;
            if (s.x < 0) {
                s.x = this.w;
            }
            s.alpha = 0.3 + Math.sin(this.time * 3 + s.x) * 0.4;
        }

        if (this.state === 'dead') {
            this.deathTimer += dt;
            return;
        }
        
        if (this.state !== 'playing') {
            return;
        }

        this.speed = this.baseSpeed + (this.score * 0.08);
        this.score += dt * 20 * this.multiplier;

        if (this.sliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.sliding = false;
            }
        }

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.multiplier = 1;
            }
        }

        if (this.magnetTimer > 0) {
            this.magnetTimer -= dt;
        }
        
        if (this.invulnTimer > 0) {
            this.invulnTimer -= dt;
        }

        const p = this.player;
        p.vy += this.gravity * dt;
        p.y += p.vy * dt;

        if (p.y >= this.groundY - p.h) {
            if (!p.grounded) {
                AudioEngine.tone(180, 0.08, 'sine', 0.08);
                Particles.burst(p.x + p.w / 2, p.y + p.h, 10, {
                    color: '#fff',
                    minSpeed: 50,
                    maxSpeed: 150,
                    gravity: 500
                });
                p.squash = 1.35;
                p.stretch = 0.65;
            }
            p.y = this.groundY - p.h;
            p.vy = 0;
            p.grounded = true;
            p.jumpsUsed = 0;
        }

        p.squash = lerp(p.squash, 1, dt * 12);
        p.stretch = lerp(p.stretch, 1, dt * 12);
        p.runFrame += dt * (p.grounded ? this.speed / 25 : 8);

        this.trail.push({
            x: p.x + p.w / 2,
            y: p.y + p.h / 2,
            life: 0.35
        });
        for (const t of this.trail) {
            t.life -= dt;
        }
        this.trail = this.trail.filter(t => t.life > 0);

        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
            if (Math.random() < 0.8) {
                this.spawnCollectible();
            }
            this.spawnPowerup();
        }

        for (const o of this.obstacles) {
            o.x -= this.speed * dt;
            
            if (o.type === 'drone') {
                o.phase += dt * 5;
                o.y = o.baseY + Math.sin(o.phase) * 40 * this.scale;
            }

            const px = p.x;
            const py = this.sliding ? p.y + p.h * 0.5 : p.y;
            const pw = p.w;
            const ph = this.sliding ? p.h * 0.5 : p.h;

            if (px + pw > o.x && px < o.x + o.w && py + ph > o.y && py < o.y + o.h) {
                if (this.invulnTimer <= 0) {
                    if (this.shieldActive) {
                        this.shieldActive = false;
                        this.invulnTimer = 1.5;
                        o.dead = true;
                        AudioEngine.win();
                        Haptics.heavy();
                        Camera.add(0.8);
                        Particles.burst(o.x + o.w/2, o.y + o.h/2, 40, {
                            color: '#00e5ff',
                            minSpeed: 150,
                            maxSpeed: 450,
                            gravity: 200
                        });
                    } else {
                        this.die();
                    }
                }
            }

            if (!o.scored && o.x + o.w < px) {
                o.scored = true;
                this.score += 15;
            }
        }
        this.obstacles = this.obstacles.filter(o => o.x > -150 && !o.dead);

        for (const c of this.collectibles) {
            c.x -= this.speed * dt;
            c.bob += dt * 6;
            const cy = c.y + Math.sin(c.bob) * 8;
            
            if (this.magnetTimer > 0) {
                const dx = (p.x + p.w/2) - c.x;
                const dy = (p.y + p.h/2) - cy;
                if (Math.hypot(dx, dy) < 250 * this.scale) {
                    c.x += dx * dt * 6;
                    c.y += dy * dt * 6;
                }
            }

            if (!c.taken && dist(p.x + p.w / 2, p.y + p.h / 2, c.x, cy) < 40 * this.scale) {
                c.taken = true;
                this.combo++;
                this.comboTimer = 3;
                this.multiplier = 1 + Math.floor(this.combo / 4) * 0.5;
                
                if (c.type === 'coin') {
                    this.coins++;
                    this.score += 20 * this.multiplier;
                    AudioEngine.coin();
                    Particles.burst(c.x, cy, 12, {
                        color: '#ffc531',
                        minSpeed: 80,
                        maxSpeed: 220,
                        gravity: 300
                    });
                } else {
                    this.gems++;
                    this.score += 75 * this.multiplier;
                    AudioEngine.gem();
                    Camera.add(0.15);
                    Particles.burst(c.x, cy, 25, {
                        color: '#a855f7',
                        minSpeed: 120,
                        maxSpeed: 350,
                        gravity: 200
                    });
                }
                this.updateHud();
            }
        }
        this.collectibles = this.collectibles.filter(c => c.x > -60 && !c.taken);

        for (const pu of this.powerups) {
            pu.x -= this.speed * dt;
            pu.bob += dt * 5;
            const py2 = pu.y + Math.sin(pu.bob) * 10;
            
            if (!pu.taken && dist(p.x + p.w / 2, p.y + p.h / 2, pu.x, py2) < 45 * this.scale) {
                pu.taken = true;
                AudioEngine.win();
                Haptics.success();
                Camera.add(0.4);
                
                if (pu.type === 'shield') {
                    this.shieldActive = true;
                } else if (pu.type === 'magnet') {
                    this.magnetTimer = 10;
                }
                
                Particles.burst(pu.x, py2, 30, {
                    color: pu.type === 'shield' ? '#00e5ff' : '#ff2d78',
                    minSpeed: 100,
                    maxSpeed: 300,
                    gravity: 100
                });
            }
        }
        this.powerups = this.powerups.filter(pu => pu.x > -60 && !pu.taken);
    }

    die() {
        this.state = 'dead';
        AudioEngine.hit();
        AudioEngine.lose();
        Haptics.heavy();
        Camera.add(1.5);
        
        Particles.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 60, {
            color: '#ff2d78',
            minSpeed: 200,
            maxSpeed: 700,
            gravity: 800,
            minSize: 3,
            maxSize: 8
        });
        
        Particles.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 40, {
            color: '#00e5ff',
            minSpeed: 150,
            maxSpeed: 500,
            gravity: 600,
            minSize: 2,
            maxSize: 6
        });

        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            Storage.setBest('runner', this.highScore);
        }

        setTimeout(() => {
            App.gameOver('runner', Math.floor(this.score), {
                coins: this.coins,
                gems: this.gems
            });
        }, 1000);
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#05070d');
        bg.addColorStop(0.4, '#0f1423');
        bg.addColorStop(1, '#2a0f3a');
        ctx.fillStyle = bg;
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        for (const s of this.stars) {
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;

        for (const m of this.bgMountains) {
            m.x -= this.speed * 0.1 * (this.state === 'playing' ? 1 : 0.2);
            if (m.x + m.w < 0) {
                m.x = this.w + 200;
            }
            ctx.fillStyle = m.color;
            ctx.beginPath();
            ctx.moveTo(m.x, this.groundY);
            ctx.lineTo(m.x + m.w / 2, this.groundY - m.h);
            ctx.lineTo(m.x + m.w, this.groundY);
            ctx.closePath();
            ctx.fill();
        }

        if (this.state === 'menu') {
            this.renderMenu(ctx);
            Camera.reset(ctx);
            return;
        }

        const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h);
        gg.addColorStop(0, '#1a0a35');
        gg.addColorStop(1, '#000');
        ctx.fillStyle = gg;
        ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.w, this.groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (const o of this.obstacles) {
            if (o.type === 'block') {
                const og = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
                og.addColorStop(0, '#ff2d78');
                og.addColorStop(1, '#8a0040');
                ctx.fillStyle = og;
                ctx.shadowColor = '#ff2d78';
                ctx.shadowBlur = 18;
                ctx.fillRect(o.x, o.y, o.w, o.h);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 6);
                ctx.shadowBlur = 0;
            } else if (o.type === 'drone') {
                ctx.fillStyle = '#a855f7';
                ctx.shadowColor = '#a855f7';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.ellipse(o.x + o.w/2, o.y + o.h/2, o.w/2, o.h/2, 0, 0, 6.28);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(o.x + o.w/2, o.y + o.h/2, 6, 0, 6.28);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#ff7a00';
                ctx.shadowColor = '#ff7a00';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(o.x, o.y + o.h);
                ctx.lineTo(o.x + o.w/2, o.y);
                ctx.lineTo(o.x + o.w, o.y + o.h);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        for (const c of this.collectibles) {
            const cy = c.y + Math.sin(c.bob) * 8;
            ctx.save();
            ctx.translate(c.x, cy);
            ctx.rotate(this.time * 4);
            ctx.fillStyle = c.type === 'coin' ? '#ffc531' : '#a855f7';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 25;
            
            if (c.type === 'coin') {
                ctx.beginPath();
                ctx.arc(0, 0, c.r, 0, 6.28);
                ctx.fill();
            } else {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const ang = i * Math.PI * 2 / 5 - Math.PI / 2;
                    ctx.lineTo(Math.cos(ang) * c.r, Math.sin(ang) * c.r);
                }
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            ctx.shadowBlur = 0;
        }

        for (const pu of this.powerups) {
            const py = pu.y + Math.sin(pu.bob) * 10;
            ctx.fillStyle = pu.type === 'shield' ? '#00e5ff' : '#ff2d78';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(pu.x, py, pu.r + 4, 0, 6.28);
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = `${pu.r}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pu.type === 'shield' ? '🛡' : '🧲', pu.x, py + 2);
        }

        Particles.render(ctx);

        if (this.state === 'playing' || this.state === 'dead') {
            const p = this.player;
            const bw = p.w * p.stretch;
            const bh = p.h * p.squash * (this.sliding ? 0.5 : 1);
            const px = p.x + p.w / 2;
            const py = p.y + p.h - bh;

            for (const t of this.trail) {
                ctx.globalAlpha = t.life * 2.5;
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.arc(t.x, t.y, 10 * this.scale, 0, 6.28);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            if (this.invulnTimer > 0 && Math.floor(this.time * 20) % 2 === 0) {
                ctx.globalAlpha = 0.4;
            }

            if (p.grounded && !this.sliding) {
                const lo = Math.sin(p.runFrame) * 12 * this.scale;
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(px - bw/4, py + bh, 8 * this.scale, 14 * this.scale + lo);
                ctx.fillRect(px + bw/4 - 8 * this.scale, py + bh, 8 * this.scale, 14 * this.scale - lo);
            }

            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(px - bw/2, py, bw, bh, 10);
            } else {
                ctx.rect(px - bw/2, py, bw, bh);
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fff';
            const eyeY = py + bh * 0.25;
            const eyeSize = 5 * this.scale;
            ctx.fillRect(px - bw/4, eyeY, eyeSize, eyeSize);
            ctx.fillRect(px + bw/4 - eyeSize, eyeY, eyeSize, eyeSize);

            if (this.shieldActive) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(px, py + bh / 2, bw, 0, 6.28);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
        }

        Camera.reset(ctx);
    }

    renderMenu(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 42px Tahoma';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 40;
        ctx.fillText('NEON RUNNER', this.w / 2, this.h / 2 - 50);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = '18px Tahoma';
        ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);

        ctx.fillStyle = '#ffc531';
        ctx.font = 'bold 18px Tahoma';
        ctx.fillText('رکورد شما: ' + this.highScore, this.w / 2, this.h / 2 + 80);
    }

    stop() {
        super.stop();
        if (this._touch) {
            this.canvas.removeEventListener('pointerdown', this._touch);
        }
        if (this._key) {
            window.removeEventListener('keydown', this._key);
        }
    }
};

window.Game_tetris = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    recalc() {
        const topOff = 60;
        const botOff = 40;
        const availH = this.h - topOff - botOff;
        const availW = this.w - 140; 
        
        this.cell = Math.floor(Math.min(availW / 10, availH / 20));
        this.gridW = this.cell * 10;
        this.gridH = this.cell * 20;
        
        this.boardX = (this.w - this.gridW) / 2 - 30;
        this.boardY = topOff + (availH - this.gridH) / 2;
        
        this.holdX = this.boardX - this.cell * 4 - 10;
        this.holdY = this.boardY;
        
        this.nextX = this.boardX + this.gridW + 10;
        this.nextY = this.boardY;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu') {
                this.startGame();
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._key = (e) => {
            if (this.state === 'menu' && (e.key === ' ' || e.key === 'Enter')) {
                this.startGame();
                return;
            }
            if (this.state !== 'playing') {
                return;
            }
            
            const k = e.key.toLowerCase();
            
            if (k === 'arrowleft' || k === 'a') {
                e.preventDefault();
                this.move(-1);
            }
            if (k === 'arrowright' || k === 'd') {
                e.preventDefault();
                this.move(1);
            }
            if (k === 'arrowdown' || k === 's') {
                e.preventDefault();
                this.softDrop = true;
            }
            if (k === 'arrowup' || k === 'w') {
                e.preventDefault();
                this.rotate();
            }
            if (k === ' ') {
                e.preventDefault();
                this.hardDrop();
            }
            if (k === 'c' || k === 'shift') {
                e.preventDefault();
                this.holdPiece();
            }
        };
        window.addEventListener('keydown', this._key);

        this._keyUp = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowdown' || k === 's') {
                this.softDrop = false;
            }
        };
        window.addEventListener('keyup', this._keyUp);

        this.swipe = { x: 0, y: 0, time: 0 };
        
        this._down = (e) => {
            this.swipe = { x: e.clientX, y: e.clientY, time: Date.now() };
        };
        
        this._up = (e) => {
            if (this.state !== 'playing') {
                return;
            }
            const dx = e.clientX - this.swipe.x;
            const dy = e.clientY - this.swipe.y;
            const dt = Date.now() - this.swipe.time;
            
            if (dt < 250 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
                this.rotate();
            } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                this.move(dx > 0 ? 1 : -1);
            } else if (dy > 60) {
                this.hardDrop();
            }
        };
        
        this.canvas.addEventListener('pointerdown', this._down);
        this.canvas.addEventListener('pointerup', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.board = Array.from({ length: 20 }, () => Array(10).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.dropTimer = 0;
        this.dropInterval = 0.8;
        this.softDrop = false;
        this.piece = null;
        this.nextQueue = [];
        this.hold = null;
        this.canHold = true;
        this.clearing = [];
        this.clearTimer = 0;

        this.shapes = {
            I: { shape: [[1,1,1,1]], color: '#00e5ff' },
            O: { shape: [[1,1],[1,1]], color: '#ffc531' },
            T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
            S: { shape: [[0,1,1],[1,1,0]], color: '#2bff88' },
            Z: { shape: [[1,1,0],[0,1,1]], color: '#ff2d78' },
            J: { shape: [[1,0,0],[1,1,1]], color: '#0088cc' },
            L: { shape: [[0,0,1],[1,1,1]], color: '#ff7a00' }
        };

        this.refillBag();
        this.nextQueue.push(this.getNextFromBag(), this.getNextFromBag(), this.getNextFromBag());
        this.spawnPiece();
        this.updateHud();
    }

    refillBag() {
        const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        this.bag = types.sort(() => Math.random() - 0.5);
    }

    getNextFromBag() {
        if (this.bag.length === 0) {
            this.refillBag();
        }
        return this.bag.pop();
    }

    spawnPiece() {
        const type = this.nextQueue.shift();
        this.nextQueue.push(this.getNextFromBag());
        const def = this.shapes[type];
        
        this.piece = {
            type: type,
            shape: def.shape.map(r => r.slice()),
            color: def.color,
            x: Math.floor((10 - def.shape[0].length) / 2),
            y: 0
        };
        
        this.canHold = true;

        if (this.collides(this.piece.shape, this.piece.x, this.piece.y)) {
            this.gameOver();
        }
    }

    holdPiece() {
        if (!this.canHold || this.state !== 'playing') {
            return;
        }
        const currentType = this.piece.type;
        
        if (this.hold) {
            const temp = this.hold;
            this.hold = currentType;
            const def = this.shapes[temp];
            this.piece = {
                type: temp,
                shape: def.shape.map(r => r.slice()),
                color: def.color,
                x: Math.floor((10 - def.shape[0].length) / 2),
                y: 0
            };
        } else {
            this.hold = currentType;
            this.spawnPiece();
        }
        this.canHold = false;
        AudioEngine.tone(600, 0.1, 'sine', 0.1);
    }

    collides(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) {
                    continue;
                }
                const x = px + c;
                const y = py + r;
                
                if (x < 0 || x >= 10 || y >= 20) {
                    return true;
                }
                if (y >= 0 && this.board[y][x]) {
                    return true;
                }
            }
        }
        return false;
    }

    move(dx) {
        if (!this.collides(this.piece.shape, this.piece.x + dx, this.piece.y)) {
            this.piece.x += dx;
            AudioEngine.tone(300, 0.03, 'sine', 0.05);
        }
    }

    rotate() {
        const s = this.piece.shape;
        const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
        const kicks = [0, -1, 1, -2, 2];
        
        for (const k of kicks) {
            if (!this.collides(rotated, this.piece.x + k, this.piece.y)) {
                this.piece.shape = rotated;
                this.piece.x += k;
                AudioEngine.tone(500, 0.04, 'sine', 0.08);
                return;
            }
        }
    }

    hardDrop() {
        let d = 0;
        while (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) {
            this.piece.y++;
            d++;
        }
        this.score += d * 2;
        AudioEngine.tone(200, 0.1, 'square', 0.1);
        Haptics.medium();
        this.lockPiece();
    }

    softDropStep() {
        if (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) {
            this.piece.y++;
        } else {
            this.lockPiece();
        }
    }

    lockPiece() {
        for (let r = 0; r < this.piece.shape.length; r++) {
            for (let c = 0; c < this.piece.shape[r].length; c++) {
                if (this.piece.shape[r][c]) {
                    const x = this.piece.x + c;
                    const y = this.piece.y + r;
                    if (y >= 0) {
                        this.board[y][x] = this.piece.color;
                    }
                }
            }
        }
        this.piece = null;
        this.checkLines();
        if (this.state === 'playing') {
            this.spawnPiece();
        }
    }

    checkLines() {
        const fullRows = [];
        for (let r = 0; r < 20; r++) {
            if (this.board[r].every(c => c)) {
                fullRows.push(r);
            }
        }
        
        if (fullRows.length === 0) {
            this.combo = 0;
            return;
        }

        this.clearing = fullRows;
        this.clearTimer = 0.3;
        AudioEngine.lineClear();
        Haptics.success();
        Camera.add(0.3);

        const pts = [0, 100, 300, 500, 800][fullRows.length] || 800;
        this.score += pts * this.level;
        this.lines += fullRows.length;
        this.combo++;

        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(0.1, 0.8 - (this.level - 1) * 0.08);
            AudioEngine.win();
        }
        this.updateHud();
    }

    applyClear() {
        for (const r of this.clearing) {
            for (let c = 0; c < 10; c++) {
                Particles.burst(
                    this.boardX + c * this.cell + this.cell / 2,
                    this.boardY + r * this.cell + this.cell / 2,
                    10,
                    { color: this.board[r][c], minSpeed: 80, maxSpeed: 300, gravity: 400 }
                );
            }
        }
        
        this.clearing.sort((a, b) => a - b);
        for (const r of this.clearing) {
            this.board.splice(r, 1);
            this.board.unshift(Array(10).fill(0));
        }
        
        this.clearing = [];
        this.clearTimer = 0;
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">خط ${this.lines} · سطح ${this.level}</div>
        `);
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        Camera.add(1.5);
        setTimeout(() => {
            App.gameOver('tetris', this.score, {
                lines: this.lines,
                level: this.level
            });
        }, 600);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        
        if (this.state !== 'playing') {
            return;
        }
        
        if (this.clearing.length > 0) {
            this.clearTimer -= dt;
            if (this.clearTimer <= 0) {
                this.applyClear();
            }
            return;
        }
        
        this.dropTimer += dt;
        const interval = this.softDrop ? 0.05 : this.dropInterval;
        
        if (this.dropTimer >= interval) {
            this.dropTimer = 0;
            this.softDropStep();
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
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 36px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.fillText('NEON TETRIS', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(this.boardX - 6, this.boardY - 6, this.gridW + 12, this.gridH + 12);
        ctx.strokeStyle = 'rgba(0,229,255,0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.boardX - 6, this.boardY - 6, this.gridW + 12, this.gridH + 12);

        for (let r = 0; r < 20; r++) {
            for (let c = 0; c < 10; c++) {
                const x = this.boardX + c * this.cell;
                const y = this.boardY + r * this.cell;
                
                if (this.board[r][c]) {
                    this.drawCell(ctx, x, y, this.board[r][c]);
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);
                }
            }
        }

        for (const r of this.clearing) {
            ctx.fillStyle = `rgba(255,255,255,${0.6 + Math.random() * 0.4})`;
            ctx.fillRect(this.boardX, this.boardY + r * this.cell, this.gridW, this.cell);
        }

        if (this.piece) {
            let ghostY = this.piece.y;
            while (!this.collides(this.piece.shape, this.piece.x, ghostY + 1)) {
                ghostY++;
            }
            
            for (let r = 0; r < this.piece.shape.length; r++) {
                for (let c = 0; c < this.piece.shape[r].length; c++) {
                    if (this.piece.shape[r][c]) {
                        const gx = this.boardX + (this.piece.x + c) * this.cell;
                        const gy = this.boardY + (ghostY + r) * this.cell;
                        ctx.strokeStyle = this.piece.color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(gx + 3, gy + 3, this.cell - 6, this.cell - 6);
                    }
                }
            }
            
            for (let r = 0; r < this.piece.shape.length; r++) {
                for (let c = 0; c < this.piece.shape[r].length; c++) {
                    if (this.piece.shape[r][c]) {
                        const x = this.boardX + (this.piece.x + c) * this.cell;
                        const y = this.boardY + (this.piece.y + r) * this.cell;
                        this.drawCell(ctx, x, y, this.piece.color);
                    }
                }
            }
        }

        if (this.hold) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(this.holdX, this.holdY, this.cell * 4, this.cell * 4);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.holdX, this.holdY, this.cell * 4, this.cell * 4);
            
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 13px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText('HOLD', this.holdX + this.cell * 2, this.holdY - 12);
            
            const def = this.shapes[this.hold];
            const ox = this.holdX + (this.cell * 4 - def.shape[0].length * this.cell) / 2;
            const oy = this.holdY + (this.cell * 4 - def.shape.length * this.cell) / 2;
            
            for (let r = 0; r < def.shape.length; r++) {
                for (let c = 0; c < def.shape[r].length; c++) {
                    if (def.shape[r][c]) {
                        this.drawCell(ctx, ox + c * this.cell, oy + r * this.cell, def.color);
                    }
                }
            }
        }

        for (let i = 0; i < 3; i++) {
            const type = this.nextQueue[i];
            const def = this.shapes[type];
            const nx = this.nextX;
            const ny = this.nextY + i * this.cell * 4;
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(nx, ny, this.cell * 4, this.cell * 4);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            ctx.strokeRect(nx, ny, this.cell * 4, this.cell * 4);
            
            if (i === 0) {
                ctx.fillStyle = '#00e5ff';
                ctx.font = 'bold 13px Tahoma';
                ctx.textAlign = 'center';
                ctx.fillText('NEXT', nx + this.cell * 2, ny - 12);
            }

            const ox = nx + (this.cell * 4 - def.shape[0].length * this.cell) / 2;
            const oy = ny + (this.cell * 4 - def.shape.length * this.cell) / 2;
            
            for (let r = 0; r < def.shape.length; r++) {
                for (let c = 0; c < def.shape[r].length; c++) {
                    if (def.shape[r][c]) {
                        this.drawCell(ctx, ox + c * this.cell, oy + r * this.cell, def.color);
                    }
                }
            }
        }

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    drawCell(ctx, x, y, color) {
        const grad = ctx.createLinearGradient(x, y, x + this.cell, y + this.cell);
        grad.addColorStop(0, this.lighten(color, 40));
        grad.addColorStop(1, this.darken(color, 40));
        
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 3, y + 3, this.cell - 6, 4);
    }

    lighten(hex, amt) {
        const h = hex.replace('#', '');
        return '#' + [0, 2, 4].map(i => Math.min(255, parseInt(h.substr(i, 2), 16) + amt).toString(16).padStart(2, '0')).join('');
    }

    darken(hex, amt) {
        const h = hex.replace('#', '');
        return '#' + [0, 2, 4].map(i => Math.max(0, parseInt(h.substr(i, 2), 16) - amt).toString(16).padStart(2, '0')).join('');
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
        if (this._key) window.removeEventListener('keydown', this._key);
        if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
        if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
        if (this._up) this.canvas.removeEventListener('pointerup', this._up);
    }
};
