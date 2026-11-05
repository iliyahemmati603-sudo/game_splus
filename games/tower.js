'use strict';
window.Game_tower = class extends GameBase {
  constructor() {
    super();
    Particles.init(400);
    Input.bind(this.canvas);
    this.recalc();
    this.state = 'menu';
  }
  recalc() { this.path = [{x:0, y:this.h*0.4}, {x:this.w*0.5, y:this.h*0.4}, {x:this.w*0.5, y:this.h*0.8}, {x:this.w, y:this.h*0.8}]; }
  startGame() {
    this.state = 'playing';
    this.enemies = []; this.towers = []; this.bullets = [];
    this.gold = 100; this.lives = 10; this.wave = 1; this.spawnTimer = 0; this.updateHud();
    this._touch = e => {
      if (this.gold >= 50) {
        const r = this.canvas.getBoundingClientRect();
        this.towers.push({ x: e.clientX - r.left, y: e.clientY - r.top, range: 100, fireTimer: 0 });
        this.gold -= 50; this.updateHud();
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch);
  }
  updateHud() { this.setHud(`<div class="hud-pill">💰 ${this.gold} · ❤️ ${this.lives} · موج ${this.wave}</div>`); }
  update(dt) {
    Particles.update(dt);
    if (this.state !== 'playing') return;
    this.spawnTimer += dt;
    if (this.spawnTimer > 2) {
      this.spawnTimer = 0;
      this.enemies.push({ progress: 0, speed: 60, hp: 10 + this.wave * 5, maxHp: 10 + this.wave * 5 });
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; e.progress += e.speed * dt;
      if (e.progress > 400) { this.lives--; this.enemies.splice(i, 1); this.updateHud(); if (this.lives <= 0) this.gameOver(); }
    }
    for (const t of this.towers) {
      t.fireTimer -= dt;
      if (t.fireTimer <= 0) {
        for (const e of this.enemies) {
          const ex = this.path[0].x + e.progress;
          if (Math.hypot(t.x - ex, t.y - this.h*0.4) < t.range) {
            this.bullets.push({ x: t.x, y: t.y, tx: ex, ty: this.h*0.4 });
            t.fireTimer = 0.5; break;
          }
        }
      }
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += (b.tx - b.x) * 5 * dt; b.y += (b.ty - b.y) * 5 * dt;
      if (Math.hypot(b.x - b.tx, b.y - b.ty) < 10) {
        Particles.burst(b.x, b.y, 5, { color: '#ff2d78', minSpeed: 50, maxSpeed: 100 });
        this.bullets.splice(i, 1);
      }
    }
  }
  gameOver() { this.state = 'menu'; setTimeout(() => App.gameOver('tower', this.wave * 100), 100); }
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05070d'; ctx.fillRect(0,0,this.w,this.h);
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 20; ctx.beginPath();
    ctx.moveTo(0, this.h*0.4); ctx.lineTo(this.w*0.5, this.h*0.4); ctx.lineTo(this.w*0.5, this.h*0.8); ctx.lineTo(this.w, this.h*0.8); ctx.stroke();
    for (const e of this.enemies) {
      const ex = e.progress; const ey = this.h*0.4;
      ctx.fillStyle = '#ff2d78'; ctx.fillRect(ex-10, ey-10, 20, 20);
    }
    for (const t of this.towers) { ctx.fillStyle = '#2bff88'; ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, 6.28); ctx.fill(); }
  }
  stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); }
};
