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

    recalc() {
        const topOff = 60;
        const trayH = 150;
        const availH = this.h - trayH - topOff - 20;
        const availW = this.w - 40;
        
        this.cellSize = Math.floor(Math.min(availW / 8, availH / 8));
        this.gridW = 8 * this.cellSize;
        this.gridH = 8 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = topOff + (availH - this.gridH) / 2;
        this.trayY = this.gridY + this.gridH + 30;
        this.trayH = trayH;
        
        if (this.pieces) {
            this.layoutTray();
        }
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            this.pickup(e.clientX - r.left, e.clientY - r.top);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._move = (e) => {
            if (!this.dragging) {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            this.dragging.x = e.clientX - r.left - this.dragging.w / 2;
            this.dragging.y = e.clientY - r.top - this.dragging.h / 2;
            this.updatePreview();
        };
        this.canvas.addEventListener('pointermove', this._move);

        this._up = () => {
            if (this.dragging) {
                this.drop();
            }
        };
        window.addEventListener('pointerup', this._up);
        window.addEventListener('pointercancel', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.grid = Array.from({ length: 8 }, () => Array(8).fill(0));
        this.score = 0;
        this.combo = 0;
        this.linesCleared = 0;
        this.dragging = null;
        this.preview = null;
        this.floatingTexts = [];
        this.shakeTimer = 0;
        this.generatePieces();
        this.updateHud();
    }

    updateHud() {
        const ct = this.combo > 1 ? ` · کمبو ×${this.combo}` : '';
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">خط ${this.linesCleared}${ct}</div>
        `);
    }

    generatePieces() {
        const shapes = [
            [[1]],
            [[1,1]],
            [[1],[1]],
            [[1,1,1]],
            [[1],[1],[1]],
            [[1,1],[1,1]],
            [[1,1,1],[1,1,1],[1,1,1]],
            [[1,0],[1,0],[1,1]],
            [[0,1],[0,1],[1,1]],
            [[1,1],[1,0]],
            [[1,1],[0,1]],
            [[1,0],[1,1]],
            [[0,1],[1,1]],
            [[1,0,0],[1,1,1]],
            [[0,0,1],[1,1,1]],
            [[0,1,0],[1,1,1]],
            [[1,0],[1,1],[0,1]],
            [[0,1],[1,1],[1,0]],
            [[1,1,1,1]],
            [[1],[1],[1],[1]]
        ];
        const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88', '#ff7a00'];
        
        this.pieces = [];
        for (let i = 0; i < 3; i++) {
            const s = shapes[Math.floor(Math.random() * shapes.length)];
            this.pieces.push({
                shape: s.map(r => r.slice()),
                color: colors[Math.floor(Math.random() * colors.length)],
                used: false
            });
        }
        this.layoutTray();
    }

    layoutTray() {
        const trayW = this.w - 40;
        const pieceW = trayW / 3;
        
        for (let i = 0; i < 3; i++) {
            const p = this.pieces[i];
            if (!p) {
                continue;
            }
            const rows = p.shape.length;
            const cols = p.shape[0].length;
            const maxDim = Math.max(rows, cols);
            const cell = Math.min(34, (pieceW - 30) / maxDim);
            
            p.baseCell = cell;
            p.baseW = cols * cell;
            p.baseH = rows * cell;
            p.trayX = 20 + i * pieceW + (pieceW - p.baseW) / 2;
            p.trayY = this.trayY + (this.trayH - p.baseH) / 2;
        }
    }

    pickup(x, y) {
        if (this.state !== 'playing') {
            return;
        }
        
        for (let i = 0; i < 3; i++) {
            const p = this.pieces[i];
            if (!p || p.used) {
                continue;
            }
            
            const pad = 20;
            if (x >= p.trayX - pad && x <= p.trayX + p.baseW + pad && y >= p.trayY - pad && y <= p.trayY + p.baseH + pad) {
                const cell = this.cellSize;
                const w = p.shape[0].length * cell;
                const h = p.shape.length * cell;
                
                this.dragging = {
                    index: i,
                    shape: p.shape,
                    color: p.color,
                    cell: cell,
                    w: w,
                    h: h,
                    x: x - w / 2,
                    y: y - h / 2
                };
                
                AudioEngine.tone(500, 0.05, 'sine', 0.1);
                Haptics.light();
                return;
            }
        }
    }

    updatePreview() {
        if (!this.dragging) {
            this.preview = null;
            return;
        }
        
        const d = this.dragging;
        const gc = Math.round((d.x - this.gridX) / this.cellSize);
        const gr = Math.round((d.y - this.gridY) / this.cellSize);
        
        if (gc < 0 || gr < 0 || gc + d.shape[0].length > 8 || gr + d.shape.length > 8) {
            this.preview = null;
            return;
        }

        for (let r = 0; r < d.shape.length; r++) {
            for (let c = 0; c < d.shape[r].length; c++) {
                if (d.shape[r][c] && this.grid[gr + r][gc + c]) {
                    this.preview = null;
                    return;
                }
            }
        }
        
        this.preview = {
            row: gr,
            col: gc,
            shape: d.shape,
            color: d.color
        };
    }

    drop() {
        if (!this.dragging) {
            this.preview = null;
            return;
        }
        
        const d = this.dragging;

        if (this.preview) {
            for (let r = 0; r < d.shape.length; r++) {
                for (let c = 0; c < d.shape[r].length; c++) {
                    if (d.shape[r][c]) {
                        this.grid[this.preview.row + r][this.preview.col + c] = d.color;
                    }
                }
            }
            
            this.score += 10;
            this.pieces[d.index].used = true;
            
            AudioEngine.tone(700, 0.08, 'sine', 0.12);
            Haptics.medium();
            
            for (let r = 0; r < d.shape.length; r++) {
                for (let c = 0; c < d.shape[r].length; c++) {
                    if (d.shape[r][c]) {
                        const px = this.gridX + (this.preview.col + c) * this.cellSize + this.cellSize / 2;
                        const py = this.gridY + (this.preview.row + r) * this.cellSize + this.cellSize / 2;
                        Particles.burst(px, py, 4, {
                            color: d.color,
                            minSpeed: 40,
                            maxSpeed: 120,
                            gravity: 300
                        });
                    }
                }
            }

            this.checkClears();
            
            if (this.pieces.every(p => p.used)) {
                this.generatePieces();
            }
            
            if (this.isGameOver()) {
                this.gameOver();
            }
        } else {
            AudioEngine.tone(200, 0.1, 'sawtooth', 0.08);
            Haptics.light();
        }
        
        this.dragging = null;
        this.preview = null;
        this.updateHud();
    }

    checkClears() {
        const rows = [];
        const cols = [];
        
        for (let r = 0; r < 8; r++) {
            if (this.grid[r].every(c => c)) {
                rows.push(r);
            }
        }
        
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) {
                if (!this.grid[r][c]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                cols.push(c);
            }
        }

        const total = rows.length + cols.length;
        
        if (total > 0) {
            this.combo++;
            const pts = total * 150 * this.combo;
            this.score += pts;
            this.linesCleared += total;
            
            AudioEngine.win();
            Haptics.success();
            Camera.add(0.5);
            this.shakeTimer = 0.3;

            for (const r of rows) {
                for (let c = 0; c < 8; c++) {
                    const x = this.gridX + c * this.cellSize + this.cellSize / 2;
                    const y = this.gridY + r * this.cellSize + this.cellSize / 2;
                    Particles.burst(x, y, 10, {
                        color: this.grid[r][c],
                        minSpeed: 100,
                        maxSpeed: 300,
                        gravity: 400
                    });
                }
            }
            
            for (const c of cols) {
                for (let r = 0; r < 8; r++) {
                    const x = this.gridX + c * this.cellSize + this.cellSize / 2;
                    const y = this.gridY + r * this.cellSize + this.cellSize / 2;
                    Particles.burst(x, y, 10, {
                        color: this.grid[r][c],
                        minSpeed: 100,
                        maxSpeed: 300,
                        gravity: 400
                    });
                }
            }

            for (const r of rows) {
                for (let c = 0; c < 8; c++) {
                    this.grid[r][c] = 0;
                }
            }
            
            for (const c of cols) {
                for (let r = 0; r < 8; r++) {
                    this.grid[r][c] = 0;
                }
            }

            this.floatingTexts.push({
                x: this.gridX + this.gridW / 2,
                y: this.gridY + this.gridH / 2,
                text: '+' + pts,
                sub: this.combo > 1 ? 'کمبو ×' + this.combo : '',
                life: 1.8,
                max: 1.8
            });
        } else {
            this.combo = 0;
        }
    }

    isGameOver() {
        for (const p of this.pieces) {
            if (p.used) {
                continue;
            }
            if (this.canPlace(p.shape)) {
                return false;
            }
        }
        return true;
    }

    canPlace(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        
        for (let r = 0; r <= 8 - rows; r++) {
            for (let c = 0; c <= 8 - cols; c++) {
                let fits = true;
                for (let dr = 0; dr < rows; dr++) {
                    for (let dc = 0; dc < cols; dc++) {
                        if (shape[dr][dc] && this.grid[r + dr][c + dc]) {
                            fits = false;
                            break;
                        }
                    }
                    if (!fits) {
                        break;
                    }
                }
                if (fits) {
                    return true;
                }
            }
        }
        return false;
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        Camera.add(1);
        setTimeout(() => {
            App.gameOver('blocks', this.score, { lines: this.linesCleared });
        }, 600);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
        
        for (const ft of this.floatingTexts) {
            ft.life -= dt;
            ft.y -= dt * 60;
        }
        this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 38px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.fillText('BLOCK PUZZLE', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        const pulse = this.shakeTimer > 0 ? 1 + Math.sin(this.shakeTimer * 50) * 0.03 : 1;
        ctx.save();
        ctx.translate(this.gridX + this.gridW / 2, this.gridY + this.gridH / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-this.gridX - this.gridW / 2, -this.gridY - this.gridH / 2);

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16, 16);
        } else {
            ctx.rect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16);
        }
        ctx.fill();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const x = this.gridX + c * this.cellSize;
                const y = this.gridY + r * this.cellSize;
                
                ctx.strokeStyle = 'rgba(0,229,255,0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
                
                if (this.grid[r][c]) {
                    this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.grid[r][c]);
                }
            }
        }
        ctx.restore();

        if (this.preview) {
            for (let r = 0; r < this.preview.shape.length; r++) {
                for (let c = 0; c < this.preview.shape[r].length; c++) {
                    if (this.preview.shape[r][c]) {
                        const x = this.gridX + (this.preview.col + c) * this.cellSize;
                        const y = this.gridY + (this.preview.row + r) * this.cellSize;
                        ctx.globalAlpha = 0.5;
                        this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.preview.color);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        for (const p of this.pieces) {
            if (!p || p.used) {
                continue;
            }
            for (let r = 0; r < p.shape.length; r++) {
                for (let c = 0; c < p.shape[r].length; c++) {
                    if (p.shape[r][c]) {
                        const x = p.trayX + c * p.baseCell;
                        const y = p.trayY + r * p.baseCell;
                        this.drawBlock(ctx, x + 1, y + 1, p.baseCell - 2, p.color);
                    }
                }
            }
        }

        if (this.dragging) {
            const d = this.dragging;
            for (let r = 0; r < d.shape.length; r++) {
                for (let c = 0; c < d.shape[r].length; c++) {
                    if (d.shape[r][c]) {
                        const x = d.x + c * d.cell;
                        const y = d.y + r * d.cell;
                        this.drawBlock(ctx, x + 1, y + 1, d.cell - 2, d.color, 1.3);
                    }
                }
            }
        }

        Particles.render(ctx);

        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = Math.min(1, ft.life / ft.max * 1.5);
            ctx.fillStyle = '#ffc531';
            ctx.font = 'bold 36px Tahoma';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ffc531';
            ctx.shadowBlur = 25;
            ctx.fillText(ft.text, ft.x, ft.y);
            if (ft.sub) {
                ctx.font = 'bold 20px Tahoma';
                ctx.fillStyle = '#00e5ff';
                ctx.fillText(ft.sub, ft.x, ft.y + 35);
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        Camera.reset(ctx);
    }

    drawBlock(ctx, x, y, size, color, scale) {
        const s = scale || 1;
        const g = ctx.createLinearGradient(x, y, x + size, y + size);
        g.addColorStop(0, this.lighten(color, 40 * s));
        g.addColorStop(1, this.darken(color, 50 * s));
        
        ctx.fillStyle = g;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, size, size, Math.max(4, size * 0.15));
        } else {
            ctx.rect(x, y, size, size);
        }
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + size * 0.15, y + size * 0.1, size * 0.7, size * 0.15);
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
        if (this._move) this.canvas.removeEventListener('pointermove', this._move);
        if (this._up) {
            window.removeEventListener('pointerup', this._up);
            window.removeEventListener('pointercancel', this._up);
        }
    }
};

window.Game_flappy = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
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
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
            } else if (this.state === 'playing') {
                this.flap();
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._key = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                if (this.state === 'menu' || this.state === 'dead') {
                    this.startGame();
                } else if (this.state === 'playing') {
                    this.flap();
                }
            }
        };
        window.addEventListener('keydown', this._key);
    }

    startGame() {
        this.state = 'playing';
        this.bird = {
            y: this.h / 2,
            vy: 0,
            rot: 0,
            wing: 0
        };
        this.pipes = [];
        this.score = 0;
        this.spawnT = 0;
        this.spawnI = 1.6;
        this.gravity = 1700;
        this.flapV = -520;
        this.time = 0;
        
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.w,
                y: Math.random() * this.groundY,
                s: Math.random() * 2 + 0.5,
                p: Math.random() * 6.28
            });
        }
        
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * this.w,
                y: rand(50, this.groundY - 300),
                w: rand(120, 250),
                speed: rand(15, 40)
            });
        }

        this.mountains = [];
        for (let i = 0; i < 6; i++) {
            this.mountains.push({
                x: i * (this.w / 1.5),
                w: rand(200, 350),
                h: rand(150, 350)
            });
        }

        this.updateHud();
    }

    flap() {
        if (this.state !== 'playing') {
            return;
        }
        this.bird.vy = this.flapV;
        this.bird.wing = 1;
        
        AudioEngine.tone(550, 0.08, 'sine', 0.1, 750);
        Haptics.light();
        
        Particles.burst(this.birdX - this.birdR, this.bird.y + this.birdR * 0.5, 8, {
            color: '#00e5ff',
            minSpeed: 50,
            maxSpeed: 150,
            angle: Math.PI,
            gravity: 150
        });
    }

    spawnPipe() {
        const margin = 70;
        const gapY = rand(this.gapH / 2 + margin, this.groundY - this.gapH / 2 - margin);
        const colors = ['#00e5ff', '#2bff88', '#a855f7'];
        
        this.pipes.push({
            x: this.w + 40,
            gapY: gapY,
            scored: false,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        this.time += dt;

        for (const s of this.stars) {
            s.x -= dt * 15;
            if (s.x < 0) {
                s.x = this.w;
            }
        }
        
        for (const c of this.clouds) {
            c.x -= c.speed * dt * 4;
            if (c.x + c.w < 0) {
                c.x = this.w + 100;
            }
        }
        
        for (const m of this.mountains) {
            m.x -= dt * 50;
            if (m.x + m.w < 0) {
                m.x = this.w + 100;
            }
        }

        this.bird.wing = Math.max(0, this.bird.wing - dt * 6);

        if (this.state === 'menu') {
            this.bird.y = this.h / 2 + Math.sin(this.time * 3) * 12;
            this.bird.rot = Math.sin(this.time * 3) * 0.1;
            return;
        }

        if (this.state === 'dead') {
            this.bird.vy += this.gravity * dt;
            this.bird.y += this.bird.vy * dt;
            if (this.bird.y > this.groundY - this.birdR) {
                this.bird.y = this.groundY - this.birdR;
            }
            return;
        }

        this.bird.vy += this.gravity * dt;
        this.bird.y += this.bird.vy * dt;
        this.bird.rot = clamp(this.bird.vy / 700, -0.8, 1.6);

        if (this.bird.y - this.birdR < 70) {
            this.bird.y = this.birdR + 70;
            this.bird.vy = 0;
        }
        
        if (this.bird.y + this.birdR > this.groundY) {
            return this.die();
        }

        this.spawnT += dt;
        if (this.spawnT >= this.spawnI) {
            this.spawnT = 0;
            this.spawnPipe();
        }

        for (const p of this.pipes) {
            p.x -= 240 * dt;
            
            if (!p.scored && p.x + this.pipeW < this.birdX - this.birdR) {
                p.scored = true;
                this.score++;
                AudioEngine.coin();
                Haptics.light();
                this.updateHud();
            }

            if (this.birdX + this.birdR > p.x && this.birdX - this.birdR < p.x + this.pipeW) {
                if (this.bird.y - this.birdR < p.gapY - this.gapH / 2 || this.bird.y + this.birdR > p.gapY + this.gapH / 2) {
                    return this.die();
                }
            }
        }
        this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 50);
    }

    die() {
        if (this.state !== 'playing') {
            return;
        }
        this.state = 'dead';
        AudioEngine.hit();
        Haptics.heavy();
        Camera.add(1.5);
        
        Particles.burst(this.birdX, this.bird.y, 50, {
            color: '#ff2d78',
            minSpeed: 150,
            maxSpeed: 500,
            gravity: 600
        });
        
        Particles.burst(this.birdX, this.bird.y, 30, {
            color: '#ffc531',
            minSpeed: 100,
            maxSpeed: 350,
            gravity: 500
        });
        
        setTimeout(() => {
            App.gameOver('flappy', this.score);
        }, 1000);
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        const bg = ctx.createLinearGradient(0, 0, 0, this.groundY);
        bg.addColorStop(0, '#05070d');
        bg.addColorStop(0.5, '#0f1423');
        bg.addColorStop(1, '#2a0f3a');
        ctx.fillStyle = bg;
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        for (const s of this.stars) {
            ctx.globalAlpha = 0.3 + Math.sin(this.time * 2 + s.p) * 0.3;
            ctx.fillStyle = '#fff';
            ctx.fillRect(s.x, s.y, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        for (const m of this.mountains) {
            ctx.fillStyle = 'rgba(20, 10, 40, 0.85)';
            ctx.beginPath();
            ctx.moveTo(m.x, this.groundY);
            ctx.lineTo(m.x + m.w / 2, this.groundY - m.h);
            ctx.lineTo(m.x + m.w, this.groundY);
            ctx.closePath();
            ctx.fill();
        }

        for (const c of this.clouds) {
            ctx.fillStyle = 'rgba(0,229,255,0.06)';
            ctx.beginPath();
            ctx.arc(c.x + c.w / 2, c.y, c.w / 3, 0, 6.28);
            ctx.arc(c.x + c.w * 0.3, c.y + 15, c.w / 4, 0, 6.28);
            ctx.arc(c.x + c.w * 0.7, c.y + 15, c.w / 4, 0, 6.28);
            ctx.fill();
        }

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 38px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.fillText('FLAPPY NEON', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
            Camera.reset(ctx);
            return;
        }

        for (const p of this.pipes) {
            const topH = p.gapY - this.gapH / 2;
            const botY = p.gapY + this.gapH / 2;
            const botH = this.groundY - botY;
            
            const pg = ctx.createLinearGradient(p.x, 0, p.x + this.pipeW, 0);
            pg.addColorStop(0, p.color);
            pg.addColorStop(0.5, this.lighten(p.color, 60));
            pg.addColorStop(1, this.darken(p.color, 60));
            
            ctx.fillStyle = pg;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;
            
            ctx.fillRect(p.x, 70, this.pipeW, topH - 70);
            ctx.fillRect(p.x, botY, this.pipeW, botH);
            
            const cap = 30;
            ctx.fillRect(p.x - 6, topH - cap, this.pipeW + 12, cap);
            ctx.fillRect(p.x - 6, botY, this.pipeW + 12, cap);
            
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, 70, this.pipeW, topH - 70);
            ctx.strokeRect(p.x, botY, this.pipeW, botH);
        }

        const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h);
        gg.addColorStop(0, '#1a0a35');
        gg.addColorStop(1, '#000');
        ctx.fillStyle = gg;
        ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.w, this.groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        Particles.render(ctx);

        const bx = this.birdX;
        const by = this.bird.y;
        const br = this.birdR;
        
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(this.bird.rot);

        ctx.fillStyle = '#ffc531';
        ctx.shadowColor = '#ffc531';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.ellipse(0, 0, br * 1.3, br, 0, 0, 6.28);
        ctx.fill();
        ctx.shadowBlur = 0;

        const wy = this.bird.wing * 18;
        ctx.fillStyle = '#ff9a00';
        ctx.beginPath();
        ctx.ellipse(-br * 0.2, wy * 0.5, br * 0.7, br * 0.4, 0, 0, 6.28);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(br * 0.4, -br * 0.2, br * 0.35, 0, 6.28);
        ctx.fill();
        
        ctx.fillStyle = '#04101a';
        ctx.beginPath();
        ctx.arc(br * 0.5, -br * 0.2, br * 0.15, 0, 6.28);
        ctx.fill();

        ctx.fillStyle = '#ff7a00';
        ctx.beginPath();
        ctx.moveTo(br, 0);
        ctx.lineTo(br * 1.5, br * 0.15);
        ctx.lineTo(br, br * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();

        Camera.reset(ctx);
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
        if (this._touch) {
            this.canvas.removeEventListener('pointerdown', this._touch);
        }
        if (this._key) {
            window.removeEventListener('keydown', this._key);
        }
    }
};

window.Game_snake = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    recalc() {
        this.cell = Math.floor(Math.min((this.w - 20) / 20, (this.h - 160) / 24));
        this.cols = Math.floor((this.w - 20) / this.cell);
        this.rows = Math.floor((this.h - 160) / this.cell);
        this.offX = (this.w - this.cols * this.cell) / 2;
        this.offY = (this.h - this.rows * this.cell) / 2 + 30;
    }

    bindInputs() {
        this._key = (e) => {
            if (this.state === 'menu' || this.state === 'dead') {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.startGame();
                }
                return;
            }
            if (this.state !== 'playing') {
                return;
            }
            
            const m = {
                ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
                ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
                w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
            };
            const nd = m[e.key];
            if (nd) {
                e.preventDefault();
                if (nd.x !== -this.dir.x || nd.y !== -this.dir.y) {
                    this.nextDir = nd;
                }
            }
        };
        window.addEventListener('keydown', this._key);

        this._start = null;
        this._down = (e) => {
            this._start = { x: e.clientX, y: e.clientY };
        };
        
        this._up = (e) => {
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
                return;
            }
            if (!this._start) {
                return;
            }
            
            const dx = e.clientX - this._start.x;
            const dy = e.clientY - this._start.y;
            
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
                if (dx > 0 && this.dir.x !== -1) {
                    this.nextDir = { x: 1, y: 0 };
                } else if (dx < 0 && this.dir.x !== 1) {
                    this.nextDir = { x: -1, y: 0 };
                }
            } else if (Math.abs(dy) > 30) {
                if (dy > 0 && this.dir.y !== -1) {
                    this.nextDir = { x: 0, y: 1 };
                } else if (dy < 0 && this.dir.y !== 1) {
                    this.nextDir = { x: 0, y: -1 };
                }
            }
            this._start = null;
        };
        this.canvas.addEventListener('pointerdown', this._down);
        this.canvas.addEventListener('pointerup', this._up);
    }

    startGame() {
        this.state = 'playing';
        this.snake = [{ x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) }];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.food = this.spawnFood();
        this.foodPulse = 0;
        this.score = 0;
        this.tick = 0;
        this.speed = 0.15;
        this.time = 0;
        this.deathFlash = 0;
        this.updateHud();
    }

    spawnFood() {
        let guard = 0;
        while (guard++ < 200) {
            const f = {
                x: randInt(0, this.cols - 1),
                y: randInt(0, this.rows - 1)
            };
            if (!this.snake.some(s => s.x === f.x && s.y === f.y)) {
                return f;
            }
        }
        return { x: 0, y: 0 };
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">طول <b>${this.snake.length}</b></div>
        `);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        this.time += dt;
        this.foodPulse += dt * 5;
        
        if (this.deathFlash > 0) {
            this.deathFlash -= dt;
        }
        
        if (this.state !== 'playing') {
            return;
        }
        
        this.tick += dt;
        if (this.tick >= this.speed) {
            this.tick = 0;
            this.dir = { ...this.nextDir };
            
            const head = {
                x: this.snake[0].x + this.dir.x,
                y: this.snake[0].y + this.dir.y
            };

            if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
                return this.die();
            }
            
            for (let i = 0; i < this.snake.length; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    return this.die();
                }
            }

            this.snake.unshift(head);

            if (head.x === this.food.x && head.y === this.food.y) {
                this.score += 15;
                AudioEngine.coin();
                Haptics.light();
                
                const fx = this.offX + head.x * this.cell + this.cell / 2;
                const fy = this.offY + head.y * this.cell + this.cell / 2;
                
                Particles.burst(fx, fy, 20, {
                    color: '#2bff88',
                    minSpeed: 100,
                    maxSpeed: 300,
                    gravity: 300
                });
                
                this.food = this.spawnFood();
                this.foodPulse = 0;
                this.speed = Math.max(0.06, this.speed - 0.005);
                this.updateHud();
            } else {
                this.snake.pop();
            }
        }
    }

    die() {
        if (this.state !== 'playing') {
            return;
        }
        this.state = 'dead';
        this.deathFlash = 0.6;
        AudioEngine.hit();
        Haptics.heavy();
        Camera.add(1.2);
        
        const hx = this.offX + this.snake[0].x * this.cell + this.cell / 2;
        const hy = this.offY + this.snake[0].y * this.cell + this.cell / 2;
        
        Particles.burst(hx, hy, 50, {
            color: '#ff2d78',
            minSpeed: 150,
            maxSpeed: 500,
            gravity: 500
        });
        
        setTimeout(() => {
            App.gameOver('snake', this.score);
        }, 900);
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#2bff88';
            ctx.font = 'bold 38px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#2bff88';
            ctx.shadowBlur = 30;
            ctx.fillText('SNAKE NEON', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.03)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16, 16);
        } else {
            ctx.rect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,229,255,0.06)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.cols; i++) {
            const x = this.offX + i * this.cell;
            ctx.beginPath();
            ctx.moveTo(x, this.offY);
            ctx.lineTo(x, this.offY + this.rows * this.cell);
            ctx.stroke();
        }
        
        for (let j = 0; j <= this.rows; j++) {
            const y = this.offY + j * this.cell;
            ctx.beginPath();
            ctx.moveTo(this.offX, y);
            ctx.lineTo(this.offX + this.cols * this.cell, y);
            ctx.stroke();
        }

        const fx = this.offX + this.food.x * this.cell + this.cell / 2;
        const fy = this.offY + this.food.y * this.cell + this.cell / 2;
        const fP = 1 + Math.sin(this.foodPulse) * 0.2;
        
        ctx.fillStyle = '#2bff88';
        ctx.shadowColor = '#2bff88';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(fx, fy, this.cell * 0.35 * fP, 0, 6.28);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(43,255,136,0.3)';
        ctx.beginPath();
        ctx.arc(fx, fy, this.cell * 0.55 * fP, 0, 6.28);
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = this.snake.length - 1; i >= 0; i--) {
            const s = this.snake[i];
            const x = this.offX + s.x * this.cell + 2;
            const y = this.offY + s.y * this.cell + 2;
            const w = this.cell - 4;
            const alpha = i === 0 ? 1 : 0.9 - (i / this.snake.length) * 0.5;
            
            if (i === 0) {
                ctx.fillStyle = '#00e5ff';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 25;
            } else {
                const g = ctx.createLinearGradient(x, y, x + w, y + w);
                g.addColorStop(0, `rgba(0,229,255,${alpha})`);
                g.addColorStop(1, `rgba(0,150,180,${alpha * 0.8})`);
                ctx.fillStyle = g;
            }
            
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, w, w * 0.35);
            } else {
                ctx.rect(x, y, w, w);
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            if (i === 0) {
                const es = Math.max(3, w * 0.2);
                ctx.fillStyle = '#04101a';
                if (this.dir.x === 1) {
                    ctx.fillRect(x + w * 0.6, y + w * 0.25, es, es);
                    ctx.fillRect(x + w * 0.6, y + w * 0.6, es, es);
                } else if (this.dir.x === -1) {
                    ctx.fillRect(x + w * 0.25, y + w * 0.25, es, es);
                    ctx.fillRect(x + w * 0.25, y + w * 0.6, es, es);
                } else if (this.dir.y === 1) {
                    ctx.fillRect(x + w * 0.25, y + w * 0.6, es, es);
                    ctx.fillRect(x + w * 0.6, y + w * 0.6, es, es);
                } else {
                    ctx.fillRect(x + w * 0.25, y + w * 0.25, es, es);
                    ctx.fillRect(x + w * 0.6, y + w * 0.25, es, es);
                }
            }
        }

        Particles.render(ctx);
        
        if (this.deathFlash > 0) {
            ctx.fillStyle = `rgba(255,45,120,${this.deathFlash})`;
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
        }
        
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._key) {
            window.removeEventListener('keydown', this._key);
        }
        if (this._down) {
            this.canvas.removeEventListener('pointerdown', this._down);
        }
        if (this._up) {
            this.canvas.removeEventListener('pointerup', this._up);
        }
    }
};
window.Game_breakout = class extends GameBase {
    constructor() {
        super();
        Particles.init(600);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    recalc() {
        this.paddleW = this.w * 0.25;
        this.paddleH = 18;
        this.paddleY = this.h - 90;
        this.ballR = 10 * clamp(Math.min(this.w, this.h) / 500, 0.7, 1.4);
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu') {
                this.startGame();
                return;
            }
            if (this.state === 'ready') {
                this.launch();
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            this.paddleX = clamp(e.clientX - r.left - this.paddleW / 2, 0, this.w - this.paddleW);
            if (this.activePowerup === 'laser') {
                this.shootLaser();
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._move = (e) => {
            if (!e.buttons && this.state !== 'ready') {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            this.paddleX = clamp(e.clientX - r.left - this.paddleW / 2, 0, this.w - this.paddleW);
        };
        this.canvas.addEventListener('pointermove', this._move);

        this._key = (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                if (this.state === 'menu') {
                    this.startGame();
                } else if (this.state === 'ready') {
                    this.launch();
                } else if (this.activePowerup === 'laser') {
                    this.shootLaser();
                }
            }
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.keyLeft = true;
            }
            if (e.key === 'ArrowRight' || e.key === 'd') {
                this.keyRight = true;
            }
        };
        window.addEventListener('keydown', this._key);

        this._keyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.keyLeft = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd') {
                this.keyRight = false;
            }
        };
        window.addEventListener('keyup', this._keyUp);
    }

    startGame() {
        this.state = 'ready';
        this.paddleX = (this.w - this.paddleW) / 2;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.balls = [{
            x: this.w / 2,
            y: this.paddleY - 25,
            vx: 0,
            vy: 0,
            speed: 450,
            trail: []
        }];
        this.bricks = [];
        this.powerups = [];
        this.lasers = [];
        this.activePowerup = null;
        this.powerupTimer = 0;
        this.buildLevel();
        this.updateHud();
    }

    buildLevel() {
        this.bricks = [];
        const rows = Math.min(4 + this.level, 8);
        const cols = 9;
        const bw = (this.w - 60) / cols;
        const bh = 26;
        const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88', '#ff7a00'];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() < 0.1) {
                    continue;
                }
                const isHard = Math.random() < 0.3;
                this.bricks.push({
                    x: 30 + c * bw + 3,
                    y: 90 + r * (bh + 8),
                    w: bw - 6,
                    h: bh,
                    color: colors[r % colors.length],
                    hp: isHard ? 2 : 1,
                    maxHp: isHard ? 2 : 1,
                    alive: true
                });
            }
        }
    }

    launch() {
        this.state = 'playing';
        for (const b of this.balls) {
            b.vx = rand(-280, 280);
            b.vy = -b.speed;
        }
        AudioEngine.tone(600, 0.1, 'sine', 0.1);
    }

    shootLaser() {
        this.lasers.push({ x: this.paddleX + 8, y: this.paddleY, vy: -1200 });
        this.lasers.push({ x: this.paddleX + this.paddleW - 8, y: this.paddleY, vy: -1200 });
        AudioEngine.tone(900, 0.05, 'square', 0.1);
        Haptics.light();
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">❤️ ${this.lives} · موج ${this.level}</div>
        `);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);

        if (this.keyLeft) {
            this.paddleX = clamp(this.paddleX - 800 * dt, 0, this.w - this.paddleW);
        }
        if (this.keyRight) {
            this.paddleX = clamp(this.paddleX + 800 * dt, 0, this.w - this.paddleW);
        }

        if (this.powerupTimer > 0) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) {
                if (this.activePowerup === 'wide') {
                    this.paddleW = this.w * 0.25;
                }
                this.activePowerup = null;
            }
        }

        if (this.state !== 'playing') {
            if (this.state === 'ready') {
                this.balls[0].x = this.paddleX + this.paddleW / 2;
                this.balls[0].y = this.paddleY - 25;
            }
            return;
        }

        for (const b of this.balls) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            b.trail.push({ x: b.x, y: b.y, life: 0.25 });
            for (const t of b.trail) {
                t.life -= dt;
            }
            b.trail = b.trail.filter(t => t.life > 0);

            if (b.x - this.ballR < 0) {
                b.x = this.ballR;
                b.vx *= -1;
                AudioEngine.tone(400, 0.05, 'square', 0.06);
            }
            if (b.x + this.ballR > this.w) {
                b.x = this.w - this.ballR;
                b.vx *= -1;
                AudioEngine.tone(400, 0.05, 'square', 0.06);
            }
            if (b.y - this.ballR < 70) {
                b.y = this.ballR + 70;
                b.vy *= -1;
                AudioEngine.tone(400, 0.05, 'square', 0.06);
            }

            if (b.y + this.ballR > this.paddleY && b.y - this.ballR < this.paddleY + this.paddleH && b.x > this.paddleX && b.x < this.paddleX + this.paddleW && b.vy > 0) {
                const hitPos = (b.x - this.paddleX) / this.paddleW;
                const angle = (hitPos - 0.5) * Math.PI * 0.85;
                const sp = Math.hypot(b.vx, b.vy);
                b.vx = Math.sin(angle) * sp;
                b.vy = -Math.abs(Math.cos(angle) * sp);
                b.y = this.paddleY - this.ballR;
                
                AudioEngine.tone(700, 0.08, 'sine', 0.1);
                Haptics.light();
                
                Particles.burst(b.x, b.y, 8, {
                    color: '#ffc531',
                    minSpeed: 60,
                    maxSpeed: 180,
                    angle: -Math.PI / 2
                });
            }
        }

        this.balls = this.balls.filter(b => b.y - this.ballR <= this.h);
        
        if (this.balls.length === 0) {
            this.loseLife();
        }

        for (const l of this.lasers) {
            l.y += l.vy * dt;
        }
        this.lasers = this.lasers.filter(l => l.y > 60);

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            for (const br of this.bricks) {
                if (!br.alive) {
                    continue;
                }
                if (l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) {
                    this.hitBrick(br, l.x, l.y);
                    this.lasers.splice(i, 1);
                    break;
                }
            }
        }

        for (const b of this.balls) {
            for (const br of this.bricks) {
                if (!br.alive) {
                    continue;
                }
                if (b.x + this.ballR > br.x && b.x - this.ballR < br.x + br.w && b.y + this.ballR > br.y && b.y - this.ballR < br.y + br.h) {
                    this.hitBrick(br, b.x, b.y);
                    const cx = br.x + br.w / 2;
                    const cy = br.y + br.h / 2;
                    if (Math.abs(b.x - cx) / br.w > Math.abs(b.y - cy) / br.h) {
                        b.vx *= -1;
                    } else {
                        b.vy *= -1;
                    }
                    break;
                }
            }
        }

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            pu.y += 200 * dt;
            if (pu.y + pu.w > this.paddleY && pu.y < this.paddleY + this.paddleH && pu.x + pu.w > this.paddleX && pu.x < this.paddleX + this.paddleW) {
                this.activatePowerup(pu.type);
                this.powerups.splice(i, 1);
                continue;
            }
            if (pu.y > this.h) {
                this.powerups.splice(i, 1);
            }
        }

        if (this.bricks.every(br => !br.alive)) {
            this.nextLevel();
        }
    }

    hitBrick(br, hx, hy) {
        br.hp--;
        AudioEngine.tone(800, 0.05, 'square', 0.1);
        Haptics.light();
        Camera.add(0.08);
        
        Particles.burst(hx, hy, 6, {
            color: br.color,
            minSpeed: 60,
            maxSpeed: 200,
            gravity: 200
        });
        
        if (br.hp <= 0) {
            br.alive = false;
            this.score += 25 * this.level;
            Camera.add(0.15);
            Particles.burst(br.x + br.w / 2, br.y + br.h / 2, 20, {
                color: br.color,
                minSpeed: 120,
                maxSpeed: 400,
                gravity: 500
            });
            if (Math.random() < 0.2) {
                const types = ['multi', 'wide', 'laser'];
                this.powerups.push({
                    x: br.x + br.w / 2 - 14,
                    y: br.y + br.h / 2 - 14,
                    w: 28,
                    h: 28,
                    type: types[Math.floor(Math.random() * types.length)]
                });
            }
            this.updateHud();
        }
    }

    activatePowerup(type) {
        AudioEngine.win();
        Haptics.success();
        Camera.add(0.3);
        
        if (type === 'multi') {
            const base = this.balls[0];
            this.balls.push(
                { x: base.x, y: base.y, vx: base.vx + 250, vy: base.vy, speed: base.speed, trail: [] },
                { x: base.x, y: base.y, vx: base.vx - 250, vy: base.vy, speed: base.speed, trail: [] }
            );
        } else if (type === 'wide') {
            this.paddleW = this.w * 0.4;
            this.activePowerup = 'wide';
            this.powerupTimer = 12;
        } else if (type === 'laser') {
            this.activePowerup = 'laser';
            this.powerupTimer = 10;
        }
    }

    loseLife() {
        this.lives--;
        this.state = 'ready';
        this.balls = [{
            x: this.w / 2,
            y: this.paddleY - 25,
            vx: 0,
            vy: 0,
            speed: 450,
            trail: []
        }];
        this.paddleX = (this.w - this.paddleW) / 2;
        AudioEngine.hit();
        Haptics.heavy();
        Camera.add(1.2);
        this.updateHud();
        
        if (this.lives <= 0) {
            this.state = 'dead';
            setTimeout(() => {
                App.gameOver('breakout', this.score, { level: this.level });
            }, 600);
        }
    }

    nextLevel() {
        this.level++;
        this.buildLevel();
        this.state = 'ready';
        this.balls = [{
            x: this.w / 2,
            y: this.paddleY - 25,
            vx: 0,
            vy: 0,
            speed: 450 + this.level * 30,
            trail: []
        }];
        this.paddleX = (this.w - this.paddleW) / 2;
        AudioEngine.win();
        Haptics.success();
        this.updateHud();
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#05070d');
        bg.addColorStop(1, '#1a0a2a');
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
            ctx.fillText('BREAKOUT PRO', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        for (const br of this.bricks) {
            if (!br.alive) {
                continue;
            }
            const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
            g.addColorStop(0, br.color);
            g.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = g;
            ctx.shadowColor = br.color;
            ctx.shadowBlur = br.hp > 1 ? 18 : 8;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(br.x, br.y, br.w, br.h, 8);
            } else {
                ctx.rect(br.x, br.y, br.w, br.h);
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            if (br.hp > 1) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        for (const l of this.lasers) {
            ctx.fillStyle = '#ffc531';
            ctx.shadowColor = '#ffc531';
            ctx.shadowBlur = 15;
            ctx.fillRect(l.x - 3, l.y, 6, 25);
            ctx.shadowBlur = 0;
        }

        for (const pu of this.powerups) {
            const color = pu.type === 'multi' ? '#ff2d78' : pu.type === 'wide' ? '#00e5ff' : '#ffc531';
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(pu.x + pu.w / 2, pu.y + pu.h / 2, pu.w / 2, 0, 6.28);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        Particles.render(ctx);

        if (this.activePowerup === 'wide') {
            ctx.fillStyle = '#00e5ff';
        } else if (this.activePowerup === 'laser') {
            ctx.fillStyle = '#ffc531';
        } else {
            ctx.fillStyle = '#00e5ff';
        }
        
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, 10);
        } else {
            ctx.rect(this.paddleX, this.paddleY, this.paddleW, this.paddleH);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        for (const b of this.balls) {
            for (const t of b.trail) {
                ctx.globalAlpha = t.life * 4;
                ctx.fillStyle = '#ffc531';
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#ffc531';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.arc(b.x, b.y, this.ballR, 0, 6.28);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        if (this.state === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(this.w / 2 - 120, this.h / 2 - 30, 240, 50);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText('برای شلیک ضربه بزن', this.w / 2, this.h / 2);
        }

        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) {
            this.canvas.removeEventListener('pointerdown', this._touch);
        }
        if (this._move) {
            this.canvas.removeEventListener('pointermove', this._move);
        }
        if (this._key) {
            window.removeEventListener('keydown', this._key);
        }
        if (this._keyUp) {
            window.removeEventListener('keyup', this._keyUp);
        }
    }
};

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

    recalc() {
        const topOff = 60;
        const avail = Math.min(this.w - 40, this.h - topOff - 100);
        this.cellSize = Math.floor(avail / 4);
        this.gridW = 4 * this.cellSize;
        this.gridH = 4 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
                return;
            }
            if (this.state !== 'playing' || this.lock) {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const c = Math.floor((x - this.gridX) / this.cellSize);
            const rr = Math.floor((y - this.gridY) / this.cellSize);
            if (c >= 0 && c < 4 && rr >= 0 && rr < 4) {
                this.flip(rr * 4 + c);
            }
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
        
        this.cards = gameEmojis.map(e => ({
            emoji: e,
            flipped: true,
            matched: false,
            flipAnim: 1,
            pulseAnim: 0,
            errorAnim: 0
        }));
        
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
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">⏱ ${Math.floor(this.timeElapsed)}s · جفت ${this.matched}/8</div>
        `);
    }

    flip(idx) {
        const c = this.cards[idx];
        if (c.flipped || c.matched) {
            return;
        }
        
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
                    Camera.add(0.15);

                    const ax = this.gridX + (a % 4) * this.cellSize + this.cellSize / 2;
                    const ay = this.gridY + Math.floor(a / 4) * this.cellSize + this.cellSize / 2;
                    const bx = this.gridX + (b % 4) * this.cellSize + this.cellSize / 2;
                    const by = this.gridY + Math.floor(b / 4) * this.cellSize + this.cellSize / 2;
                    
                    Particles.burst(ax, ay, 20, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });
                    Particles.burst(bx, by, 20, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });

                    this.opened = [];
                    this.lock = false;
                    this.updateHud();
                    
                    if (this.matched === 8) {
                        this.gameOver(true);
                    }
                }, 500);
            } else {
                this.combo = 0;
                this.score = Math.max(0, this.score - 15);
                this.cards[a].errorAnim = 1;
                this.cards[b].errorAnim = 1;
                
                AudioEngine.hit();
                Haptics.heavy();
                Camera.add(0.3);

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
            Camera.add(0.8);
        } else {
            AudioEngine.lose();
            Haptics.heavy();
        }
        setTimeout(() => {
            App.gameOver('memory', this.score, { time: Math.floor(this.timeElapsed), combo: this.bestCombo });
        }, 1000);
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
                    this.cards.forEach(c => {
                        if (!c.matched) {
                            c.flipped = false;
                        }
                    });
                    this.lock = false;
                    AudioEngine.tone(400, 0.2, 'triangle', 0.1);
                }
            }
        }

        for (const c of this.cards) {
            if (c.flipAnim > 0) c.flipAnim = Math.max(0, c.flipAnim - dt * 4);
            if (c.pulseAnim > 0) c.pulseAnim = Math.max(0, c.pulseAnim - dt * 3);
            if (c.errorAnim > 0) c.errorAnim = Math.max(0, c.errorAnim - dt * 2);
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
            ctx.fillText('MEMORY MATCH', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
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
            
            if (c.flipAnim > 0) {
                sx = Math.abs(Math.cos(c.flipAnim * Math.PI));
            }
            if (c.pulseAnim > 0) {
                const s = 1 + Math.sin(c.pulseAnim * Math.PI) * 0.15;
                sx *= s;
                sy *= s;
            }
            if (c.errorAnim > 0) {
                x += Math.sin(c.errorAnim * 50) * 6;
            }

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
        if (this._touch) {
            this.canvas.removeEventListener('pointerdown', this._touch);
        }
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

    recalc() {
        const topOff = 60;
        const avail = Math.min(this.w - 40, this.h - topOff - 100);
        this.cellSize = Math.floor(avail / 4);
        this.gridW = 4 * this.cellSize;
        this.gridH = 4 * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
        this.gap = Math.max(6, this.cellSize * 0.08);
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') {
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
            const m = {
                ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                a: 'left', d: 'right', w: 'up', s: 'down'
            };
            if (m[e.key]) {
                e.preventDefault();
                this.move(m[e.key]);
            }
        };
        window.addEventListener('keydown', this._key);

        this._start = null;
        this._down = (e) => {
            this._start = { x: e.clientX, y: e.clientY };
        };
        
        this._up = (e) => {
            if (this.state !== 'playing' || !this._start) {
                return;
            }
            const dx = e.clientX - this._start.x;
            const dy = e.clientY - this._start.y;
            if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
                this._start = null;
                return;
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                this.move(dx > 0 ? 'right' : 'left');
            } else {
                this.move(dy > 0 ? 'down' : 'up');
            }
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
                if (this.board[r][c] === 0) {
                    empty.push({ r, c });
                }
            }
        }
        if (!empty.length) {
            return;
        }
        const s = empty[Math.floor(Math.random() * empty.length)];
        const v = Math.random() < 0.9 ? 2 : 4;
        this.board[s.r][s.c] = v;
        this.animations.push({
            r: s.r,
            c: s.c,
            val: v,
            type: 'spawn',
            progress: 0,
            duration: 0.2
        });
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">حرکت ${this.moves}</div>
        `);
    }

    move(dir) {
        if (this.state !== 'playing') {
            return;
        }
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
                    this.animations.push({
                        r: tr,
                        c: tc,
                        val: m,
                        type: 'merge',
                        progress: 0,
                        duration: 0.3
                    });
                    AudioEngine.tone(500 + Math.log2(m) * 60, 0.1, 'triangle', 0.1);
                    Haptics.light();
                } else {
                    out.push(arr[i]);
                }
            }
            while (out.length < 4) {
                out.push(0);
            }
            return out;
        };

        if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < 4; r++) {
                let row = b[r].slice();
                if (dir === 'right') {
                    row.reverse();
                }
                row = merge(row, r, dir === 'right' ? 3 : 0, 0, dir === 'right' ? -1 : 1);
                if (dir === 'right') {
                    row.reverse();
                }
                if (row.join() !== b[r].join()) {
                    moved = true;
                }
                b[r] = row;
            }
        } else {
            for (let c = 0; c < 4; c++) {
                let col = b.map(r => r[c]);
                if (dir === 'down') {
                    col.reverse();
                }
                col = merge(col, dir === 'down' ? 3 : 0, c, dir === 'down' ? -1 : 1, 0);
                if (dir === 'down') {
                    col.reverse();
                }
                for (let r = 0; r < 4; r++) {
                    if (b[r][c] !== col[r]) {
                        moved = true;
                    }
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
            if (this.checkLose()) {
                this.gameOver(false);
            }
        }
    }

    checkWin() {
        for (const r of this.board) {
            for (const v of r) {
                if (v >= 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    checkLose() {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) {
                    return false;
                }
                if (c < 3 && this.board[r][c] === this.board[r][c + 1]) {
                    return false;
                }
                if (r < 3 && this.board[r][c] === this.board[r + 1][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    gameOver(win) {
        this.state = win ? 'won' : 'dead';
        AudioEngine[win ? 'win' : 'lose']();
        Haptics[win ? 'success' : 'heavy']();
        Camera.add(win ? 0.5 : 1);
        setTimeout(() => {
            App.gameOver('2048', this.score, { moves: this.moves });
        }, 600);
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
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ffc531';
            ctx.font = 'bold 38px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffc531';
            ctx.shadowBlur = 30;
            ctx.fillText('2048 MERGE', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16, 16);
        } else {
            ctx.rect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16);
        }
        ctx.fill();

        const colors = {
            2: '#1a2a4a', 4: '#1f3a5a', 8: '#2a5a6a', 16: '#2a7a6a', 32: '#3a9a5a',
            64: '#5aba3a', 128: '#9aca2a', 256: '#daca2a', 512: '#eaaa2a', 1024: '#ea7a2a', 2048: '#ea3a5a'
        };

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const x = this.gridX + c * (this.cellSize + this.gap * 0.5);
                const y = this.gridY + r * (this.cellSize + this.gap * 0.5);
                const v = this.board[r][c];

                ctx.fillStyle = v === 0 ? 'rgba(255,255,255,0.04)' : (colors[v] || '#ff2d78');
                
                let sc = 1;
                const a = this.animations.find(a => a.r === r && a.c === c);
                if (a) {
                    if (a.type === 'spawn') {
                        sc = a.progress / a.duration;
                    } else if (a.type === 'merge') {
                        const t = a.progress / a.duration;
                        sc = 1 + Math.sin(t * Math.PI) * 0.2;
                    }
                }

                ctx.save();
                ctx.translate(x + this.cellSize / 2, y + this.cellSize / 2);
                ctx.scale(sc, sc);
                ctx.translate(-x - this.cellSize / 2, -y - this.cellSize / 2);

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, this.cellSize, this.cellSize, 10);
                } else {
                    ctx.rect(x, y, this.cellSize, this.cellSize);
                }
                ctx.fill();
                
                if (v !== 0) {
                    if (v >= 8) {
                        ctx.shadowColor = colors[v];
                        ctx.shadowBlur = 15;
                    }
                    ctx.fillStyle = v >= 8 ? '#fff' : '#c5cee0';
                    ctx.font = `900 ${Math.max(16, this.cellSize * 0.35)}px Tahoma`;
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
        if (this._touch) {
            this.canvas.removeEventListener('pointerdown', this._touch);
        }
        if (this._key) {
            window.removeEventListener('keydown', this._key);
        }
        if (this._down) {
            this.canvas.removeEventListener('pointerdown', this._down);
        }
        if (this._up) {
            this.canvas.removeEventListener('pointerup', this._up);
        }
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

    recalc() {
        const topOff = 60;
        const avail = Math.min(this.w - 40, this.h - topOff - 100);
        this.cols = 8;
        this.rows = 8;
        this.cellSize = Math.floor(avail / 8);
        this.gridW = this.cols * this.cellSize;
        this.gridH = this.rows * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') {
                this.startGame();
                return;
            }
            if (this.state !== 'playing') {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const c = Math.floor((x - this.gridX) / this.cellSize);
            const rr = Math.floor((y - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) {
                this.clickCell(rr, c, false);
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

        this._ctx = (e) => {
            e.preventDefault();
            if (this.state !== 'playing') {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const c = Math.floor((x - this.gridX) / this.cellSize);
            const rr = Math.floor((y - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) {
                this.clickCell(rr, c, true);
            }
        };
        this.canvas.addEventListener('contextmenu', this._ctx);

        this.longPressTimer = null;
        this._down = (e) => {
            if (this.state !== 'playing') {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const c = Math.floor((x - this.gridX) / this.cellSize);
            const rr = Math.floor((y - this.gridY) / this.cellSize);
            if (c >= 0 && c < 8 && rr >= 0 && rr < 8) {
                this.longPressTimer = setTimeout(() => {
                    this.clickCell(rr, c, true);
                    Haptics.medium();
                    this.longPressTimer = null;
                }, 400);
            }
        };
        this._up = () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        };
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
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    mine: false,
                    revealed: false,
                    flagged: false,
                    adj: 0,
                    anim: 0
                });
            }
            this.board.push(row);
        }

        let placed = 0;
        while (placed < this.minesCount) {
            const r = randInt(0, 7);
            const c = randInt(0, 7);
            if (!this.board[r][c].mine) {
                this.board[r][c].mine = true;
                placed++;
            }
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c].mine) {
                    continue;
                }
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.board[nr][nc].mine) {
                            count++;
                        }
                    }
                }
                this.board[r][c].adj = count;
            }
        }
        this.updateHud();
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">🚩 <b>${this.minesCount - this.flagged}</b></div>
            <div class="hud-pill">⏱ ${Math.floor(this.timeElapsed)}s</div>
            <div class="hud-pill">کشف <b>${this.revealed}/${64 - this.minesCount}</b></div>
        `);
    }

    clickCell(r, c, isFlag) {
        const cell = this.board[r][c];
        if (cell.revealed) {
            return;
        }
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
        if (cell.flagged) {
            return;
        }
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
            Particles.burst(hx, hy, 80, {
                color: '#ff2d78',
                minSpeed: 200,
                maxSpeed: 800,
                gravity: 1000,
                minSize: 4,
                maxSize: 10
            });
            Particles.burst(hx, hy, 50, {
                color: '#ffc531',
                minSpeed: 150,
                maxSpeed: 600,
                gravity: 800,
                minSize: 3,
                maxSize: 8
            });

            for (let rr = 0; rr < 8; rr++) {
                for (let cc = 0; cc < 8; cc++) {
                    if (this.board[rr][cc].mine && !this.board[rr][cc].revealed) {
                        this.board[rr][cc].revealed = true;
                    }
                }
            }
            setTimeout(() => {
                App.gameOver('minesweeper', 0, { result: 'باختی' });
            }, 1500);
            return;
        }

        this.floodFill(r, c);

        if (this.revealed === 64 - this.minesCount) {
            this.state = 'won';
            AudioEngine.win();
            Haptics.success();
            Camera.add(0.5);
            setTimeout(() => {
                App.gameOver('minesweeper', (64 - this.minesCount) * 50, { result: 'بردی' });
            }, 800);
        }
        this.updateHud();
    }

    floodFill(r, c) {
        const stack = [{ r, c }];
        while (stack.length > 0) {
            const { r, c } = stack.pop();
            const cell = this.board[r][c];
            if (cell.revealed || cell.flagged || cell.mine) {
                continue;
            }
            cell.revealed = true;
            cell.anim = 1;
            this.revealed++;
            AudioEngine.tone(600 + cell.adj * 60, 0.04, 'sine', 0.05);
            if (cell.adj === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) {
                            continue;
                        }
                        const nr = r + dr;
                        const nc = c + dc;
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

        if (this.explosionAnim > 0) {
            this.explosionAnim -= dt;
        }
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c].anim > 0) {
                    this.board[r][c].anim = Math.max(0, this.board[r][c].anim - dt * 5);
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ff2d78';
            ctx.font = 'bold 36px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ff2d78';
            ctx.shadowBlur = 30;
            ctx.fillText('MINESWEEPER', this.w / 2, this.h / 2 - 50);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 10);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '13px Tahoma';
            ctx.fillText('برای پرچم‌گذاری نگه دارید', this.w / 2, this.h / 2 + 40);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12, 12);
        } else {
            ctx.rect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12);
        }
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
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
                        else ctx.rect(x, y, w, w);
                        ctx.fill();
                        ctx.font = `${w * 0.6}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('💣', x + w / 2, y + w / 2);
                    } else {
                        ctx.fillStyle = 'rgba(0,229,255,0.05)';
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
                        else ctx.rect(x, y, w, w);
                        ctx.fill();
                        if (cell.adj > 0) {
                            ctx.fillStyle = colors[cell.adj];
                            ctx.font = `bold ${w * 0.5}px Tahoma`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(cell.adj, x + w / 2, y + w / 2);
                        }
                    }
                } else {
                    const g = ctx.createLinearGradient(x, y, x + w, y + w);
                    g.addColorStop(0, '#1a2a4a');
                    g.addColorStop(1, '#0c1120');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
                    else ctx.rect(x, y, w, w);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,229,255,0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    if (cell.flagged) {
                        ctx.font = `${w * 0.5}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
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

    recalc() {
        this.btnW = (this.w - 80) / 2;
        this.btnH = 75;
        this.gridX = 40;
        this.gridY = this.h * 0.55;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
                return;
            }
            if (this.state !== 'playing') {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;

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
        let a = randInt(1, max);
        let b = randInt(1, max);
        const op = Math.random() < 0.5 ? '+' : '-';
        if (op === '-' && a < b) {
            const temp = a;
            a = b;
            b = temp;
        }
        this.answer = op === '+' ? a + b : a - b;
        this.question = `${a} ${op} ${b} = ?`;
        this.options = [this.answer];
        while (this.options.length < 4) {
            const w = this.answer + randInt(-10, 10);
            if (w !== this.answer && !this.options.includes(w) && w > 0) {
                this.options.push(w);
            }
        }
        this.options.sort(() => Math.random() - 0.5);
    }

    checkAnswer(val, index) {
        if (val === this.answer) {
            this.score += 15 + (this.combo * 3);
            this.combo++;
            AudioEngine.win();
            Haptics.light();
            Camera.add(0.1);
            this.timeLeft = Math.min(30, this.timeLeft + 2);
            
            const bx = this.gridX + (index % 2) * (this.btnW + 20) + this.btnW / 2;
            const by = this.gridY + Math.floor(index / 2) * (this.btnH + 20) + this.btnH / 2;
            Particles.burst(bx, by, 20, {
                color: '#2bff88',
                minSpeed: 100,
                maxSpeed: 300,
                gravity: 300
            });
            
            this.newQuestion();
        } else {
            this.combo = 0;
            this.lives--;
            this.timeLeft = Math.max(0, this.timeLeft - 5);
            AudioEngine.hit();
            Haptics.heavy();
            Camera.add(0.8);
            
            const bx = this.gridX + (index % 2) * (this.btnW + 20) + this.btnW / 2;
            const by = this.gridY + Math.floor(index / 2) * (this.btnH + 20) + this.btnH / 2;
            Particles.burst(bx, by, 20, {
                color: '#ff2d78',
                minSpeed: 100,
                maxSpeed: 300,
                gravity: 300
            });
            
            if (this.lives <= 0) {
                this.gameOver();
            }
        }
        this.updateHud();
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">⏱ <b>${Math.ceil(this.timeLeft)}s</b> · ❤️ ${this.lives}</div>
        `);
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        setTimeout(() => {
            App.gameOver('math', this.score);
        }, 800);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state !== 'playing') {
            return;
        }
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

        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 36px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.fillText('SPEED MATH', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, 60, this.w, 6);
        ctx.fillStyle = this.timeLeft < 10 ? '#ff2d78' : '#00e5ff';
        ctx.fillRect(0, 60, (this.timeLeft / 30) * this.w, 6);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px Tahoma';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 30;
        ctx.fillText(this.question, this.w / 2, this.h * 0.3);
        ctx.shadowBlur = 0;

        if (this.combo > 1) {
            ctx.fillStyle = '#ffc531';
            ctx.font = 'bold 28px Tahoma';
            ctx.fillText(`کمبو ×${this.combo}`, this.w / 2, this.h * 0.4);
        }

        for (let i = 0; i < 4; i++) {
            const bx = this.gridX + (i % 2) * (this.btnW + 20);
            const by = this.gridY + Math.floor(i / 2) * (this.btnH + 20);
            const g = ctx.createLinearGradient(bx, by, bx, by + this.btnH);
            g.addColorStop(0, 'rgba(0,229,255,0.15)');
            g.addColorStop(1, 'rgba(0,229,255,0.05)');
            
            ctx.fillStyle = g;
            ctx.strokeStyle = 'rgba(0,229,255,0.4)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bx, by, this.btnW, this.btnH, 15);
            } else {
                ctx.rect(bx, by, this.btnW, this.btnH);
            }
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px Tahoma';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.options[i], bx + this.btnW / 2, by + this.btnH / 2);
        }

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_match3 = class extends GameBase {
    constructor() {
        super();
        Particles.init(600);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    recalc() {
        const topOff = 60;
        const avail = Math.min(this.w - 20, this.h - topOff - 100);
        this.cols = 8;
        this.rows = 8;
        this.cellSize = Math.floor(avail / 8);
        this.gridW = this.cols * this.cellSize;
        this.gridH = this.rows * this.cellSize;
        this.gridX = (this.w - this.gridW) / 2;
        this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') {
                this.startGame();
                return;
            }
            if (this.state !== 'playing' || this.lock) {
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            const c = Math.floor((x - this.gridX) / this.cellSize);
            const rr = Math.floor((y - this.gridY) / this.cellSize);
            if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
                this.handleClick(rr, c);
            }
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
                if (this.board[r][c] && this.board[r][c] === this.board[r][c + 1] && this.board[r][c] === this.board[r][c + 2]) {
                    found = true;
                }
            }
        }
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) {
                    found = true;
                }
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
                    toClear.add(r + ',' + c);
                    toClear.add(r + ',' + (c + 1));
                    toClear.add(r + ',' + (c + 2));
                    matched = true;
                }
            }
        }
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) {
                    toClear.add(r + ',' + c);
                    toClear.add((r + 1) + ',' + c);
                    toClear.add((r + 2) + ',' + c);
                    matched = true;
                }
            }
        }

        if (matched) {
            this.score += toClear.size * 15;
            AudioEngine.coin();
            Haptics.medium();
            Camera.add(0.15);
            this.updateHud();

            toClear.forEach(pos => {
                const [r, c] = pos.split(',').map(Number);
                const x = this.gridX + c * this.cellSize + this.cellSize / 2;
                const y = this.gridY + r * this.cellSize + this.cellSize / 2;
                Particles.burst(x, y, 8, {
                    color: this.getColor(this.board[r][c]),
                    minSpeed: 80,
                    maxSpeed: 200,
                    gravity: 300
                });
                this.board[r][c] = 0;
            });

            this.applyGravity();
            setTimeout(() => this.processMatches(), 350);
        } else {
            this.lock = false;
            if (this.moves <= 0) {
                this.gameOver();
            }
        }
    }

    applyGravity() {
        for (let c = 0; c < this.cols; c++) {
            let empty = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.board[r][c] === 0) {
                    empty++;
                } else if (empty > 0) {
                    this.board[r + empty][c] = this.board[r][c];
                    this.board[r][c] = 0;
                }
            }
            for (let r = empty - 1; r >= 0; r--) {
                this.board[r][c] = randInt(1, 5);
            }
        }
    }

    updateHud() {
        this.setHud(`
            <div class="hud-pill">امتیاز <b>${this.score}</b></div>
            <div class="hud-pill">حرکت ${this.moves}</div>
        `);
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        setTimeout(() => {
            App.gameOver('match3', this.score);
        }, 600);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
    }

    getColor(id) {
        return ['#000', '#00e5ff', '#ff2d78', '#ffc531', '#2bff88', '#a855f7'][id] || '#fff';
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);

        ctx.fillStyle = '#05070d';
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 36px Tahoma';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 30;
            ctx.fillText('MATCH 3', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '18px Tahoma';
            ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx);
            return;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12, 14);
        } else {
            ctx.rect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12);
        }
        ctx.fill();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const val = this.board[r][c];
                if (val === 0) {
                    continue;
                }

                const x = this.gridX + c * this.cellSize + 4;
                const y = this.gridY + r * this.cellSize + 4;
                const w = this.cellSize - 8;

                const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
                
                ctx.fillStyle = this.getColor(val);
                if (isSelected) {
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 25;
                } else {
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 10;
                }

                ctx.beginPath();
                if (val === 1) {
                    ctx.arc(x + w / 2, y + w / 2, w / 2, 0, 6.28);
                } else if (val === 2) {
                    if (ctx.roundRect) ctx.roundRect(x, y, w, w, 10);
                    else ctx.rect(x, y, w, w);
                } else if (val === 3) {
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + w / 2);
                    ctx.lineTo(x + w / 2, y + w);
                    ctx.lineTo(x, y + w / 2);
                    ctx.closePath();
                } else if (val === 4) {
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + w);
                    ctx.lineTo(x, y + w);
                    ctx.closePath();
                } else {
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + w / 3);
                    ctx.lineTo(x + w * 0.8, y + w);
                    ctx.lineTo(x + w * 0.2, y + w);
                    ctx.lineTo(x, y + w / 3);
                    ctx.closePath();
                }
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};
