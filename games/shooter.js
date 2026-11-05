'use strict';

window.Game_shooter = class extends GameBase {
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
    this.shipW = 40;
    this.shipH = 40;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') {
        this.startGame();
        return;
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._move = e => {
      if (this.state !== 'playing' || !e.buttons) return;
      const r = this.canvas.getBoundingClientRect();
      this.player.x = clamp(e.clientX - r.left - this.shipW / 2, 0, this.w - this.shipW);
      this.player.y = clamp(e.clientY - r.top - this.shipH / 2 - 30, 60, this.h - this.shipH);
    };
    this.canvas.addEventListener('pointermove', this._move);

    this._key = e => {
      if (this.state === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = true;
      }
    };
    this._keyUp = e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = false;
    };
    window.addEventListener('keydown', this._key);
    window.addEventListener('keyup', this._keyUp);
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.lives = 3;
    this.time = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.fireTimer = 0;
    
    this.player = { x: this.w / 2 - this.shipW / 2, y: this.h - 100, w: this.shipW, h: this.shipH };
    this.bullets = [];
    this.enemies = [];
    this.stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * this.w, y: Math.random() * this.h,
      s: Math.random() * 2 + 1, speed: Math.random() * 200 + 100
    }));
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives}</div>`);
  }

  spawnEnemy() {
    const w = rand(30, 50);
    const h = rand(30, 50);
    const hp = Math.random() < 0.2 ? 3 : 1;
    this.enemies.push({
      x: rand(10, this.w - w - 10), y: -h - 10, w, h,
      hp, maxHp: hp,
      vy: rand(80, 150) + this.time * 2,
      vx: rand(-50, 50)
    });
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    setTimeout(() => App.gameOver('shooter', this.score), 800);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    this.time += dt;

    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.h) { s.y = 0; s.x = Math.random() * this.w; }
    }

    if (this.state !== 'playing') return;

    if (this.keyLeft) this.player.x = clamp(this.player.x - 350 * dt, 0, this.w - this.shipW);
    if (this.keyRight) this.player.x = clamp(this.player.x + 350 * dt, 0, this.w - this.shipW);

    this.fireTimer += dt;
    if (this.fireTimer > 0.15) {
      this.fireTimer = 0;
      this.bullets.push({ x: this.player.x + this.shipW / 2, y: this.player.y, vy: -800 });
      AudioEngine.tone(900, 0.03, 'square', 0.05);
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy * dt;
      if (b.y < 0) this.bullets.splice(i, 1);
    }

    this.spawnTimer += dt;
    this.spawnInterval = Math.max(0.2, 1.0 - this.time * 0.02);
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.y += e.vy * dt;
      e.x += e.vx * dt;

      if (e.x < 0 || e.x + e.w > this.w) e.vx *= -1;

      if (e.y > this.h) {
        this.enemies.splice(i, 1);
        this.lives--;
        this.updateHud();
        Camera.add(0.5);
        if (this.lives <= 0) return this.gameOver();
        continue;
      }

      const cx = this.player.x + this.player.w / 2;
      const cy = this.player.y + this.player.h / 2;
      if (e.x < cx + 15 && e.x + e.w > cx - 15 && e.y < cy + 15 && e.y + e.h > cy - 15) {
        this.enemies.splice(i, 1);
        this.lives--;
        this.updateHud();
        Camera.add(1);
        Haptics.heavy();
        AudioEngine.hit();
        Particles.burst(cx, cy, 30, { color: '#ff2d78', minSpeed: 150, maxSpeed: 400, gravity: 300 });
        if (this.lives <= 0) return this.gameOver();
        continue;
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          this.bullets.splice(j, 1);
          e.hp--;
          Particles.burst(b.x, b.y, 4, { color: '#fff', minSpeed: 50, maxSpeed: 150 });
          if (e.hp <= 0) {
            this.enemies.splice(i, 1);
            this.score += 20;
            this.updateHud();
            AudioEngine.tone(300, 0.1, 'sawtooth', 0.1);
            Haptics.light();
            Camera.add(0.2);
            Particles.burst(e.x + e.w/2, e.y + e.h/2, 20, { color: '#ffc531', minSpeed: 100, maxSpeed: 300, gravity: 200 });
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
    bg.addColorStop(0, '#05070d');
    bg.addColorStop(1, '#0f1423');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.s / 3})`;
      ctx.fillRect(s.x, s.y, s.s, s.s * 2);
    }

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#ff2d78';
      ctx.font = 'bold 32px Tahoma';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 20;
      ctx.fillText('SPACE SHOOTER', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx);
      return;
    }

    for (const b of this.bullets) {
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(b.x - 2, b.y, 4, 15);
    }
    ctx.shadowBlur = 0;

    for (const e of this.enemies) {
      ctx.fillStyle = e.maxHp > 1 ? '#a855f7' : '#ff2d78';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y + e.h);
      ctx.lineTo(e.x + e.w, e.y);
      ctx.lineTo(e.x, e.y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      
      if (e.maxHp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(e.x, e.y + e.h + 4, e.w * (e.hp / e.maxHp), 3);
      }
    }

    Particles.render(ctx);

    const p = this.player;
    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h/2);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, -p.h/2);
    ctx.lineTo(p.w/2, p.h/2);
    ctx.lineTo(0, p.h/4);
    ctx.lineTo(-p.w/2, p.h/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#ffc531';
    ctx.beginPath();
    ctx.moveTo(-5, p.h/4);
    ctx.lineTo(0, p.h/2 + Math.random() * 15);
    ctx.lineTo(5, p.h/4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

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
