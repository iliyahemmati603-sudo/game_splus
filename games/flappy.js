'use strict';

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

  recalc() {
    this.groundY = this.h - 70;
    this.birdX = this.w * 0.28;
    this.birdR = 16 * clamp(Math.min(this.w, this.h) / 500, 0.7, 1.3);
    this.pipeW = Math.max(60, this.w * 0.16);
    this.gapH = Math.max(150, this.h * 0.28);
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') this.startGame();
      else if (this.state === 'playing') this.flap();
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
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
    this.pipes = [];
    this.score = 0;
    this.spawnT = 0;
    this.spawnI = 1.7;
    this.gravity = 1600;
    this.flapV = -480;
    this.time = 0;
    this.deathTimer = 0;
    
    this.stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * this.w, y: Math.random() * this.groundY,
      s: Math.random() * 1.5 + 0.3, p: Math.random() * 6.28
    }));
    
    this.clouds = Array.from({ length: 6 }, () => ({
      x: Math.random() * this.w, y: rand(40, this.groundY - 250),
      w: rand(100, 200), speed: rand(10, 30)
    }));

    this.mountains = [];
    for (let i = 0; i < 5; i++) {
      this.mountains.push({ x: i * (this.w / 2), w: rand(150, 250), h: rand(100, 250) });
    }

    this.updateHud();
  }

  flap() {
    if (this.state !== 'playing') return;
    this.bird.vy = this.flapV;
    this.bird.wing = 1;
    AudioEngine.tone(550, 0.08, 'sine', 0.1, 750);
    Haptics.light();
    Particles.burst(this.birdX - this.birdR, this.bird.y + this.birdR * 0.5, 6, {
      color: '#00e5ff', minSpeed: 40, maxSpeed: 120, angle: Math.PI, gravity: 150
    });
  }

  spawnPipe() {
    const margin = 60;
    const gapY = rand(this.gapH / 2 + margin, this.groundY - this.gapH / 2 - margin);
    this.pipes.push({ x: this.w + 30, gapY, scored: false, color: pick(['#00e5ff', '#2bff88', '#a855f7']) });
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    this.time += dt;

    for (const s of this.stars) { s.x -= dt * 10; if (s.x < 0) s.x = this.w; }
    for (const c of this.clouds) { c.x -= c.speed * dt * 4; if (c.x + c.w < 0) c.x = this.w + 50; }
    for (const m of this.mountains) { m.x -= dt * 40; if (m.x + m.w < 0) m.x = this.w + 50; }

    this.bird.wing = Math.max(0, this.bird.wing - dt * 5);

    if (this.state === 'menu') {
      this.bird.y = this.h / 2 + Math.sin(this.time * 3) * 10;
      this.bird.rot = Math.sin(this.time * 3) * 0.1;
      return;
    }

    if (this.state === 'dead') {
      this.deathTimer += dt;
      this.bird.vy += this.gravity * dt;
      this.bird.y += this.bird.vy * dt;
      if (this.bird.y > this.groundY - this.birdR) this.bird.y = this.groundY - this.birdR;
      return;
    }

    this.bird.vy += this.gravity * dt;
    this.bird.y += this.bird.vy * dt;
    this.bird.rot = clamp(this.bird.vy / 800, -0.8, 1.5);

    if (this.bird.y - this.birdR < 60) {
      this.bird.y = this.birdR + 60;
      this.bird.vy = 0;
    }
    if (this.bird.y + this.birdR > this.groundY) return this.die();

    this.spawnT += dt;
    if (this.spawnT >= this.spawnI) {
      this.spawnT = 0;
      this.spawnPipe();
    }

    for (const p of this.pipes) {
      p.x -= 230 * dt;
      if (!p.scored && p.x + this.pipeW < this.birdX - this.birdR) {
        p.scored = true;
        this.score++;
        AudioEngine.coin();
        Haptics.light();
        this.updateHud();
      }

      const bx = this.birdX, by = this.bird.y, br = this.birdR;
      if (bx + br > p.x && bx - br < p.x + this.pipeW) {
        if (by - br < p.gapY - this.gapH / 2 || by + br > p.gapY + this.gapH / 2) {
          return this.die();
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 30);
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1.2);
    Particles.burst(this.birdX, this.bird.y, 40, { color: '#ff2d78', minSpeed: 100, maxSpeed: 400, gravity: 600 });
    setTimeout(() => App.gameOver('flappy', this.score), 800);
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
      ctx.fillStyle = 'rgba(20, 10, 40, 0.8)';
      ctx.beginPath();
      ctx.moveTo(m.x, this.groundY);
      ctx.lineTo(m.x + m.w / 2, this.groundY - m.h);
      ctx.lineTo(m.x + m.w, this.groundY);
      ctx.closePath();
      ctx.fill();
    }

    for (const c of this.clouds) {
      ctx.fillStyle = 'rgba(0,229,255,0.05)';
      ctx.beginPath();
      ctx.arc(c.x + c.w/2, c.y, c.w/3, 0, 6.28);
      ctx.arc(c.x + c.w*0.3, c.y + 15, c.w/4, 0, 6.28);
      ctx.arc(c.x + c.w*0.7, c.y + 15, c.w/4, 0, 6.28);
      ctx.fill();
    }

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    for (const p of this.pipes) {
      const topH = p.gapY - this.gapH / 2;
      const botY = p.gapY + this.gapH / 2;
      const botH = this.groundY - botY;

      const pg = ctx.createLinearGradient(p.x, 0, p.x + this.pipeW, 0);
      pg.addColorStop(0, p.color);
      pg.addColorStop(0.5, this.lighten(p.color, 50));
      pg.addColorStop(1, this.darken(p.color, 50));
      
      ctx.fillStyle = pg;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      
      ctx.fillRect(p.x, 60, this.pipeW, topH - 60);
      ctx.fillRect(p.x, botY, this.pipeW, botH);
      
      const capH = 25;
      ctx.fillRect(p.x - 5, topH - capH, this.pipeW + 10, capH);
      ctx.fillRect(p.x - 5, botY, this.pipeW + 10, capH);
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(p.x, 60, this.pipeW, topH - 60);
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
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    Particles.render(ctx);

    const bx = this.birdX, by = this.bird.y, br = this.birdR;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(this.bird.rot);

    ctx.fillStyle = '#ffc531';
    ctx.shadowColor = '#ffc531';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(0, 0, br * 1.3, br, 0, 0, 6.28);
    ctx.fill();
    ctx.shadowBlur = 0;

    const wingY = this.bird.wing * 12;
    ctx.fillStyle = '#ff9a00';
    ctx.beginPath();
    ctx.ellipse(-br * 0.2, wingY * 0.5, br * 0.7, br * 0.4, 0, 0, 6.28);
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

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 34px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 25;
    ctx.fillText('FLAPPY NEON', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
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
  }
};
