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
    this.pipes = [];
    this.score = 0;
    this.spawnT = 0;
    this.spawnI = 1.7;
    this.gravity = 1600;
    this.flapV = -480;
    this.time = 0;
    this.stars = Array.from({ length: 80 }, () => ({ x: Math.random() * this.w, y: Math.random() * this.groundY, s: Math.random() * 1.5 + 0.3, p: Math.random() * 6.28 }));
    this.clouds = Array.from({ length: 6 }, () => ({ x: Math.random() * this.w, y: rand(40, this.groundY - 250), w: rand(100, 200), speed: rand(10, 30) }));
    this.mountains = [];
    for (let i = 0; i < 5; i++) this.mountains.push({ x: i * (this.w / 2), w: rand(150, 250), h: rand(100, 250) });
    this.updateHud();
  }

  flap() {
    if (this.state !== 'playing') return;
    this.bird.vy = this.flapV;
    this.bird.wing = 1;
    AudioEngine.tone(550, 0.08, 'sine', 0.1, 750);
    Haptics.light();
    Particles.burst(this.birdX - this.birdR, this.bird.y + this.birdR * 0.5, 6, { color: '#00e5ff', minSpeed: 40, maxSpeed: 120, angle: Math.PI, gravity: 150 });
  }

  spawnPipe() {
    const m = 60, gy = rand(this.gapH / 2 + m, this.groundY - this.gapH / 2 - m);
    this.pipes.push({ x: this.w + 30, gapY: gy, scored: false, color: pick(['#00e5ff', '#2bff88', '#a855f7']) });
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
      this.bird.vy += this.gravity * dt;
      this.bird.y += this.bird.vy * dt;
      if (this.bird.y > this.groundY - this.birdR) this.bird.y = this.groundY - this.birdR;
      return;
    }

    this.bird.vy += this.gravity * dt;
    this.bird.y += this.bird.vy * dt;
    this.bird.rot = clamp(this.bird.vy / 800, -0.8, 1.5);

    if (this.bird.y - this.birdR < 60) { this.bird.y = this.birdR + 60; this.bird.vy = 0; }
    if (this.bird.y + this.birdR > this.groundY) return this.die();

    this.spawnT += dt;
    if (this.spawnT >= this.spawnI) { this.spawnT = 0; this.spawnPipe(); }

    for (const p of this.pipes) {
      p.x -= 230 * dt;
      if (!p.scored && p.x + this.pipeW < this.birdX - this.birdR) {
        p.scored = true; this.score++; AudioEngine.coin(); Haptics.light(); this.updateHud();
      }
      if (this.birdX + this.birdR > p.x && this.birdX - this.birdR < p.x + this.pipeW) {
        if (this.bird.y - this.birdR < p.gapY - this.gapH / 2 || this.bird.y + this.birdR > p.gapY + this.gapH / 2) return this.die();
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 30);
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    AudioEngine.hit(); Haptics.heavy(); Camera.add(1.2);
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

    for (const s of this.stars) { ctx.globalAlpha = 0.3 + Math.sin(this.time * 2 + s.p) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
    ctx.globalAlpha = 1;

    for (const m of this.mountains) { ctx.fillStyle = 'rgba(20, 10, 40, 0.8)'; ctx.beginPath(); ctx.moveTo(m.x, this.groundY); ctx.lineTo(m.x + m.w / 2, this.groundY - m.h); ctx.lineTo(m.x + m.w, this.groundY); ctx.closePath(); ctx.fill(); }
    for (const c of this.clouds) { ctx.fillStyle = 'rgba(0,229,255,0.05)'; ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y, c.w/3, 0, 6.28); ctx.arc(c.x + c.w*0.3, c.y + 15, c.w/4, 0, 6.28); ctx.arc(c.x + c.w*0.7, c.y + 15, c.w/4, 0, 6.28); ctx.fill(); }

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 34px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
      ctx.fillText('FLAPPY NEON', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '18px Tahoma'; ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
      Camera.reset(ctx); return;
    }

    for (const p of this.pipes) {
      const topH = p.gapY - this.gapH / 2, botY = p.gapY + this.gapH / 2, botH = this.groundY - botY;
      const pg = ctx.createLinearGradient(p.x, 0, p.x + this.pipeW, 0);
      pg.addColorStop(0, p.color); pg.addColorStop(0.5, this.lighten(p.color, 50)); pg.addColorStop(1, this.darken(p.color, 50));
      ctx.fillStyle = pg; ctx.shadowColor = p.color; ctx.shadowBlur = 15;
      ctx.fillRect(p.x, 60, this.pipeW, topH - 60);
      ctx.fillRect(p.x, botY, this.pipeW, botH);
      const cap = 25; ctx.fillRect(p.x - 5, topH - cap, this.pipeW + 10, cap); ctx.fillRect(p.x - 5, botY, this.pipeW + 10, cap);
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.strokeRect(p.x, 60, this.pipeW, topH - 60); ctx.strokeRect(p.x, botY, this.pipeW, botH);
    }

    const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h); gg.addColorStop(0, '#1a0a35'); gg.addColorStop(1, '#000');
    ctx.fillStyle = gg; ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.moveTo(0, this.groundY); ctx.lineTo(this.w, this.groundY); ctx.stroke(); ctx.shadowBlur = 0;

    Particles.render(ctx);

    const bx = this.birdX, by = this.bird.y, br = this.birdR;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(this.bird.rot);
    ctx.fillStyle = '#ffc531'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(0, 0, br * 1.3, br, 0, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
    const wy = this.bird.wing * 12; ctx.fillStyle = '#ff9a00'; ctx.beginPath(); ctx.ellipse(-br * 0.2, wy * 0.5, br * 0.7, br * 0.4, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(br * 0.4, -br * 0.2, br * 0.35, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#04101a'; ctx.beginPath(); ctx.arc(br * 0.5, -br * 0.2, br * 0.15, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.moveTo(br, 0); ctx.lineTo(br * 1.5, br * 0.15); ctx.lineTo(br, br * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
    Camera.reset(ctx);
  }

  lighten(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.min(255, parseInt(h.substr(i,2),16) + a).toString(16).padStart(2,'0')).join(''); }
  darken(hex, a) { const h = hex.replace('#',''); return '#' + [0,2,4].map(i => Math.max(0, parseInt(h.substr(i,2),16) - a).toString(16).padStart(2,'0')).join(''); }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
  }
};

window.Game_snake = class extends GameBase {
  constructor() {
    super();
    Particles.init(300);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'menu';
  }

  recalc() {
    this.cell = Math.floor(Math.min((this.w - 20) / 20, (this.h - 180) / 24));
    this.cols = Math.floor((this.w - 20) / this.cell);
    this.rows = Math.floor((this.h - 180) / this.cell);
    this.offX = (this.w - this.cols * this.cell) / 2;
    this.offY = (this.h - this.rows * this.cell) / 2 + 30;
  }

  setDirection(dir) {
    if (this.state !== 'playing') return;
    const m = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const nd = m[dir];
    if (nd) {
      if (nd.x !== -this.dir.x || nd.y !== -this.dir.y) this.nextDir = nd;
    }
  }

  start() {
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
      const f = { x: randInt(0, this.cols - 1), y: randInt(0, this.rows - 1) };
      if (!this.snake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
    return { x: 0, y: 0 };
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">طول <b>${this.snake.length}</b></div>`);
  }

  update(dt) {
    Particles.update(dt);
    this.time += dt;
    this.foodPulse += dt * 5;
    if (this.deathFlash > 0) this.deathFlash -= dt;
    if (this.state !== 'playing') return;

    this.tick += dt;
    if (this.tick >= this.speed) {
      this.tick = 0;
      this.dir = { ...this.nextDir };
      const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

      if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) return this.die();
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === head.x && this.snake[i].y === head.y) return this.die();
      }

      this.snake.unshift(head);

      if (head.x === this.food.x && head.y === this.food.y) {
        this.score += 15;
        AudioEngine.coin();
        Haptics.light();
        const fx = this.offX + head.x * this.cell + this.cell / 2;
        const fy = this.offY + head.y * this.cell + this.cell / 2;
        Particles.burst(fx, fy, 20, { color: '#2bff88', minSpeed: 100, maxSpeed: 300, gravity: 300 });
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
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.deathFlash = 0.6;
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1.2);
    const hx = this.offX + this.snake[0].x * this.cell + this.cell / 2;
    const hy = this.offY + this.snake[0].y * this.cell + this.cell / 2;
    Particles.burst(hx, hy, 50, { color: '#ff2d78', minSpeed: 150, maxSpeed: 500, gravity: 500 });
    setTimeout(() => App.gameOver('snake', this.score), 900);
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#2bff88'; ctx.font = 'bold 38px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#2bff88'; ctx.shadowBlur = 30;
      ctx.fillText('SNAKE NEON', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '18px Tahoma'; ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
      return;
    }

    ctx.fillStyle = 'rgba(0,229,255,0.03)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16, 16);
    else ctx.rect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,229,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.cols; i++) { const x = this.offX + i * this.cell; ctx.beginPath(); ctx.moveTo(x, this.offY); ctx.lineTo(x, this.offY + this.rows * this.cell); ctx.stroke(); }
    for (let j = 0; j <= this.rows; j++) { const y = this.offY + j * this.cell; ctx.beginPath(); ctx.moveTo(this.offX, y); ctx.lineTo(this.offX + this.cols * this.cell, y); ctx.stroke(); }

    const fx = this.offX + this.food.x * this.cell + this.cell / 2;
    const fy = this.offY + this.food.y * this.cell + this.cell / 2;
    const fP = 1 + Math.sin(this.foodPulse) * 0.2;
    ctx.fillStyle = '#2bff88'; ctx.shadowColor = '#2bff88'; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(fx, fy, this.cell * 0.35 * fP, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(43,255,136,0.3)'; ctx.beginPath(); ctx.arc(fx, fy, this.cell * 0.55 * fP, 0, 6.28); ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = this.snake.length - 1; i >= 0; i--) {
      const s = this.snake[i];
      const x = this.offX + s.x * this.cell + 2, y = this.offY + s.y * this.cell + 2, w = this.cell - 4;
      const alpha = i === 0 ? 1 : 0.9 - (i / this.snake.length) * 0.5;
      if (i === 0) { ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25; }
      else { const g = ctx.createLinearGradient(x, y, x + w, y + w); g.addColorStop(0, `rgba(0,229,255,${alpha})`); g.addColorStop(1, `rgba(0,150,180,${alpha * 0.8})`); ctx.fillStyle = g; }
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, w, w * 0.35); else ctx.rect(x, y, w, w);
      ctx.fill(); ctx.shadowBlur = 0;
      if (i === 0) {
        const es = Math.max(3, w * 0.2); ctx.fillStyle = '#04101a';
        if (this.dir.x === 1) { ctx.fillRect(x + w * 0.6, y + w * 0.25, es, es); ctx.fillRect(x + w * 0.6, y + w * 0.6, es, es); }
        else if (this.dir.x === -1) { ctx.fillRect(x + w * 0.25, y + w * 0.25, es, es); ctx.fillRect(x + w * 0.25, y + w * 0.6, es, es); }
        else if (this.dir.y === 1) { ctx.fillRect(x + w * 0.25, y + w * 0.6, es, es); ctx.fillRect(x + w * 0.6, y + w * 0.6, es, es); }
        else { ctx.fillRect(x + w * 0.25, y + w * 0.25, es, es); ctx.fillRect(x + w * 0.6, y + w * 0.25, es, es); }
      }
    }
    Particles.render(ctx);
    if (this.deathFlash > 0) { ctx.fillStyle = `rgba(255,45,120,${this.deathFlash})`; ctx.fillRect(-30, -30, this.w + 60, this.h + 60); }
  }

  stop() {
    super.stop();
  }
};

window.Game_breakout = class extends GameBase {
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
    this.paddleW = this.w * 0.25;
    this.paddleH = 18;
    this.paddleY = this.h - 90;
    this.ballR = 10 * clamp(Math.min(this.w, this.h) / 500, 0.7, 1.3);
  }

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
    this.state = 'ready';
    this.paddleX = (this.w - this.paddleW) / 2;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450, trail: [] }];
    this.bricks = [];
    this.buildLevel();
    this.updateHud();
  }

  buildLevel() {
    this.bricks = [];
    const rows = Math.min(4 + this.level, 8), cols = 9, bw = (this.w - 60) / cols, bh = 26;
    const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88', '#ff7a00'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.1) continue;
        const isHard = Math.random() < 0.3;
        this.bricks.push({ x: 30 + c * bw + 3, y: 90 + r * (bh + 8), w: bw - 6, h: bh, color: colors[r % colors.length], hp: isHard ? 2 : 1, alive: true });
      }
    }
  }

  launch() {
    this.state = 'playing';
    for (const b of this.balls) { b.vx = rand(-280, 280); b.vy = -b.speed; }
    AudioEngine.tone(600, 0.1, 'sine', 0.1);
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives} · موج ${this.level}</div>`);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    if (this.keyLeft) this.paddleX = clamp(this.paddleX - 800 * dt, 0, this.w - this.paddleW);
    if (this.keyRight) this.paddleX = clamp(this.paddleX + 800 * dt, 0, this.w - this.paddleW);

    if (this.state !== 'playing') {
      if (this.state === 'ready') {
        this.balls[0].x = this.paddleX + this.paddleW / 2;
        this.balls[0].y = this.paddleY - 25;
      }
      return;
    }

    for (const b of this.balls) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.trail.push({ x: b.x, y: b.y, life: 0.25 });
      for (const t of b.trail) t.life -= dt;
      b.trail = b.trail.filter(t => t.life > 0);

      if (b.x - this.ballR < 0) { b.x = this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }
      if (b.x + this.ballR > this.w) { b.x = this.w - this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }
      if (b.y - this.ballR < 70) { b.y = this.ballR + 70; b.vy *= -1; AudioEngine.tone(400, 0.05, 'square', 0.06); }

      if (b.y + this.ballR > this.paddleY && b.y - this.ballR < this.paddleY + this.paddleH && b.x > this.paddleX && b.x < this.paddleX + this.paddleW && b.vy > 0) {
        const hp = (b.x - this.paddleX) / this.paddleW;
        const angle = (hp - 0.5) * Math.PI * 0.85;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(angle) * sp; b.vy = -Math.abs(Math.cos(angle) * sp);
        b.y = this.paddleY - this.ballR;
        AudioEngine.tone(700, 0.08, 'sine', 0.1); Haptics.light();
        Particles.burst(b.x, b.y, 8, { color: '#ffc531', minSpeed: 60, maxSpeed: 180, angle: -Math.PI / 2 });
      }
    }

    this.balls = this.balls.filter(b => b.y - this.ballR <= this.h);
    if (this.balls.length === 0) this.loseLife();

    for (const b of this.balls) {
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (b.x + this.ballR > br.x && b.x - this.ballR < br.x + br.w && b.y + this.ballR > br.y && b.y - this.ballR < br.y + br.h) {
          br.hp--;
          AudioEngine.tone(800, 0.05, 'square', 0.1); Haptics.light(); Camera.add(0.08);
          Particles.burst(b.x, b.y, 6, { color: br.color, minSpeed: 60, maxSpeed: 200, gravity: 200 });
          if (br.hp <= 0) {
            br.alive = false;
            this.score += 25 * this.level;
            Camera.add(0.15);
            Particles.burst(br.x + br.w / 2, br.y + br.h / 2, 20, { color: br.color, minSpeed: 120, maxSpeed: 400, gravity: 500 });
          }
          const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
          if (Math.abs(b.x - cx) / br.w > Math.abs(b.y - cy) / br.h) b.vx *= -1;
          else b.vy *= -1;
          break;
        }
      }
    }

    if (this.bricks.every(br => !br.alive)) {
      this.level++;
      this.buildLevel();
      this.state = 'ready';
      this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450 + this.level * 30, trail: [] }];
      AudioEngine.win(); Haptics.success(); this.updateHud();
    }
  }

  loseLife() {
    this.lives--;
    this.state = 'ready';
    this.balls = [{ x: this.w / 2, y: this.paddleY - 25, vx: 0, vy: 0, speed: 450, trail: [] }];
    this.paddleX = (this.w - this.paddleW) / 2;
    AudioEngine.hit(); Haptics.heavy(); Camera.add(1.2); this.updateHud();
    if (this.lives <= 0) { this.state = 'dead'; setTimeout(() => App.gameOver('breakout', this.score, { level: this.level }), 600); }
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);
    const bg = ctx.createLinearGradient(0, 0, 0, this.h); bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 36px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT PRO', this.w / 2, this.h / 2 - 30);
      ctx.fillStyle = '#fff'; ctx.font = '18px Tahoma'; ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx); return;
    }

    for (const br of this.bricks) {
      if (!br.alive) continue;
      const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
      g.addColorStop(0, br.color); g.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = g; ctx.shadowColor = br.color; ctx.shadowBlur = br.hp > 1 ? 18 : 8;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(br.x, br.y, br.w, br.h, 8); else ctx.rect(br.x, br.y, br.w, br.h);
      ctx.fill(); ctx.shadowBlur = 0;
      if (br.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    }

    Particles.render(ctx);

    ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, 10); else ctx.rect(this.paddleX, this.paddleY, this.paddleW, this.paddleH);
    ctx.fill(); ctx.shadowBlur = 0;

    for (const b of this.balls) {
      for (const t of b.trail) { ctx.globalAlpha = t.life * 4; ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(b.x, b.y, this.ballR, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
    }

    if (this.state === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.w / 2 - 120, this.h / 2 - 30, 240, 50);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('برای شلیک ضربه بزن', this.w / 2, this.h / 2);
    }
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
