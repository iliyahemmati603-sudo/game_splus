'use strict';

window.Game_color = class extends GameBase {
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
    this.ballR = 12;
    this.gravity = 1500;
    this.jumpForce = -550;
    this.scrollSpeed = 180;
    this.ringRadius = Math.min(this.w * 0.35, 150);
    this.ringThick = 16;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') this.startGame();
      else if (this.state === 'playing') this.jump();
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.state === 'menu' || this.state === 'dead') this.startGame();
        else if (this.state === 'playing') this.jump();
      }
    };
    window.addEventListener('keydown', this._key);
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.ball = { x: this.w / 2, y: this.h * 0.7, vy: 0, colorIndex: 0, trail: [] };
    this.obstacles = [];
    this.swappers = [];
    this.spawnTimer = 0;
    this.colors = ['#00e5ff', '#ff2d78', '#ffc531', '#2bff88'];
    this.spawnObstacle(this.h * 0.3);
    this.updateHud();
  }

  jump() {
    if (this.state !== 'playing') return;
    this.ball.vy = this.jumpForce;
    AudioEngine.tone(600, 0.08, 'sine', 0.1, 800);
    Haptics.light();
    
    for (let i = 0; i < 6; i++) {
      Particles.burst(this.ball.x, this.ball.y + this.ballR, 2, { color: this.colors[this.ball.colorIndex], minSpeed: 30, maxSpeed: 100, angle: Math.PI / 2 });
    }
  }

  spawnObstacle(y) {
    const type = Math.random();
    if (type < 0.7) {
      const segments = 4;
      const colors = [];
      for (let i = 0; i < segments; i++) colors.push(randInt(0, 3));
      
      const starIndex = randInt(0, 3);
      colors[starIndex] = -1;

      this.obstacles.push({
        x: this.w / 2, y, r: this.ringRadius, thick: this.ringThick,
        rot: Math.random() * 6.28, rotSpeed: (Math.random() < 0.5 ? 1 : -1) * rand(1, 2),
        segments, colors, passed: false
      });
    } else {
      this.swappers.push({
        x: this.w / 2, y, r: 15, rot: Math.random() * 6.28, rotSpeed: rand(2, 4), passed: false
      });
    }
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`);
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1.5);
    Particles.burst(this.ball.x, this.ball.y, 40, { color: this.colors[this.ball.colorIndex], minSpeed: 150, maxSpeed: 500, gravity: 400 });
    setTimeout(() => App.gameOver('color', this.score), 800);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    if (this.state !== 'playing') return;

    const b = this.ball;
    b.vy += this.gravity * dt;
    b.y += b.vy * dt;

    b.trail.push({ x: b.x, y: b.y, color: this.colors[b.colorIndex], life: 0.3 });
    for (const t of b.trail) t.life -= dt;
    b.trail = b.trail.filter(t => t.life > 0);

    for (const o of this.obstacles) {
      o.y -= this.scrollSpeed * dt;
      o.rot += o.rotSpeed * dt;
    }
    for (const s of this.swappers) {
      s.y -= this.scrollSpeed * dt;
      s.rot += s.rotSpeed * dt;
    }

    this.obstacles = this.obstacles.filter(o => o.y > -o.r - 50);
    this.swappers = this.swappers.filter(s => s.y > -50);

    const topObs = Math.min(
      this.obstacles.length ? this.obstacles[this.obstacles.length - 1].y : 9999,
      this.swappers.length ? this.swappers[this.swappers.length - 1].y : 9999
    );
    if (topObs > 50 && topObs < this.h * 0.4) {
      this.spawnObstacle(topObs - rand(200, 300));
    } else if (this.obstacles.length === 0 && this.swappers.length === 0) {
      this.spawnObstacle(this.h * 0.3);
    }

    if (b.y > this.h + 50) return this.gameOver();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const d = Math.hypot(b.x - o.x, b.y - o.y);
      
      if (d > o.r - o.thick / 2 - this.ballR && d < o.r + o.thick / 2 + this.ballR) {
        let angle = Math.atan2(b.y - o.y, b.x - o.x) - o.rot;
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        
        const segIndex = Math.floor(angle / (Math.PI * 2 / o.segments));
        const segColor = o.colors[segIndex];
        
        if (segColor === -1) {
        } else if (segColor !== b.colorIndex) {
          return this.gameOver();
        }
      }

      if (!o.passed && b.y < o.y) {
        o.passed = true;
        this.score += 10;
        AudioEngine.coin();
        this.updateHud();
      }
    }

    for (let i = this.swappers.length - 1; i >= 0; i--) {
      const s = this.swappers[i];
      const d = Math.hypot(b.x - s.x, b.y - s.y);
      
      if (!s.passed && d < this.ballR + s.r) {
        s.passed = true;
        b.colorIndex = (b.colorIndex + randInt(1, 3)) % 4;
        AudioEngine.tone(900, 0.1, 'sine', 0.1);
        Haptics.medium();
        Camera.add(0.2);
        Particles.burst(s.x, s.y, 15, { color: this.colors[b.colorIndex], minSpeed: 100, maxSpeed: 250 });
      }

      if (!s.passed && b.y < s.y) {
        s.passed = true;
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

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    for (const o of this.obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      ctx.lineWidth = o.thick;
      ctx.lineCap = 'butt';
      
      const segAngle = (Math.PI * 2) / o.segments;
      
      for (let i = 0; i < o.segments; i++) {
        const cIdx = o.colors[i];
        if (cIdx === -1) continue;
        
        ctx.strokeStyle = this.colors[cIdx];
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(0, 0, o.r, i * segAngle, (i + 1) * segAngle);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    for (const s of this.swappers) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      
      const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#2bff88'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i];
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, s.r, i * Math.PI / 2, (i + 1) * Math.PI / 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    for (const t of this.ball.trail) {
      ctx.globalAlpha = t.life * 3;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = this.colors[this.ball.colorIndex];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ballR, 0, 6.28);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 32px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.fillText('COLOR SWITCH', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
  }
};
