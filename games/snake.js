'use strict';

window.Game_snake = class extends GameBase {
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
    this.cell = Math.floor(Math.min((this.w - 20) / 20, (this.h - 140) / 24));
    this.cols = Math.floor((this.w - 20) / this.cell);
    this.rows = Math.floor((this.h - 140) / this.cell);
    this.offX = (this.w - this.cols * this.cell) / 2;
    this.offY = (this.h - this.rows * this.cell) / 2 + 30;
  }

  bindInputs() {
    this._key = e => {
      if (this.state === 'menu' || this.state === 'dead') {
        if (e.key === ' ' || e.key === 'Enter') this.startGame();
        return;
      }
      if (this.state !== 'playing') return;
      
      const m = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
      };
      const nd = m[e.key];
      if (nd) {
        e.preventDefault();
        if (nd.x !== -this.dir.x || nd.y !== -this.dir.y) this.nextDir = nd;
      }
    };
    window.addEventListener('keydown', this._key);

    this._start = null;
    this._down = e => { this._start = { x: e.clientX, y: e.clientY }; };
    this._up = e => {
      if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
      if (!this._start) return;
      
      const dx = e.clientX - this._start.x;
      const dy = e.clientY - this._start.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx > 0 && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
        else if (dx < 0 && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
      } else if (Math.abs(dy) > 30) {
        if (dy > 0 && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
        else if (dy < 0 && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
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
    Camera.update(dt);
    this.time += dt;
    this.foodPulse += dt * 5;
    
    if (this.deathFlash > 0) this.deathFlash -= dt;
    if (this.state === 'menu') return;

    if (this.state === 'playing') {
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
          this.score += 10;
          AudioEngine.coin();
          Haptics.light();
          const fx = this.offX + head.x * this.cell + this.cell / 2;
          const fy = this.offY + head.y * this.cell + this.cell / 2;
          Particles.burst(fx, fy, 15, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });
          this.food = this.spawnFood();
          this.foodPulse = 0;
          this.speed = Math.max(0.06, this.speed - 0.004);
          this.updateHud();
        } else {
          this.snake.pop();
        }
      }
    }
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.deathFlash = 0.6;
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1);
    const hx = this.offX + this.snake[0].x * this.cell + this.cell / 2;
    const hy = this.offY + this.snake[0].y * this.cell + this.cell / 2;
    Particles.burst(hx, hy, 40, { color: '#ff2d78', minSpeed: 150, maxSpeed: 400, gravity: 500 });
    setTimeout(() => App.gameOver('snake', this.score), 800);
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    ctx.fillStyle = '#05070d';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    ctx.fillStyle = 'rgba(0,229,255,0.03)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16, 14);
    else ctx.rect(this.offX - 8, this.offY - 8, this.cols * this.cell + 16, this.rows * this.cell + 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,229,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.cols; i++) {
      const x = this.offX + i * this.cell;
      ctx.beginPath(); ctx.moveTo(x, this.offY); ctx.lineTo(x, this.offY + this.rows * this.cell); ctx.stroke();
    }
    for (let j = 0; j <= this.rows; j++) {
      const y = this.offY + j * this.cell;
      ctx.beginPath(); ctx.moveTo(this.offX, y); ctx.lineTo(this.offX + this.cols * this.cell, y); ctx.stroke();
    }

    const fx = this.offX + this.food.x * this.cell + this.cell / 2;
    const fy = this.offY + this.food.y * this.cell + this.cell / 2;
    const fPulse = 1 + Math.sin(this.foodPulse) * 0.2;
    
    ctx.fillStyle = '#2bff88';
    ctx.shadowColor = '#2bff88';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(fx, fy, this.cell * 0.32 * fPulse, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = 'rgba(43,255,136,0.3)';
    ctx.beginPath();
    ctx.arc(fx, fy, this.cell * 0.5 * fPulse, 0, 6.28);
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
        ctx.shadowBlur = 20;
      } else {
        const g = ctx.createLinearGradient(x, y, x + w, y + w);
        g.addColorStop(0, `rgba(0,229,255,${alpha})`);
        g.addColorStop(1, `rgba(0,150,180,${alpha * 0.7})`);
        ctx.fillStyle = g;
      }

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, w, w * 0.3);
      else ctx.rect(x, y, w, w);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (i === 0) {
        const eyeSize = Math.max(3, w * 0.18);
        ctx.fillStyle = '#04101a';
        if (this.dir.x === 1) {
          ctx.fillRect(x + w * 0.6, y + w * 0.25, eyeSize, eyeSize);
          ctx.fillRect(x + w * 0.6, y + w * 0.6, eyeSize, eyeSize);
        } else if (this.dir.x === -1) {
          ctx.fillRect(x + w * 0.25, y + w * 0.25, eyeSize, eyeSize);
          ctx.fillRect(x + w * 0.25, y + w * 0.6, eyeSize, eyeSize);
        } else if (this.dir.y === 1) {
          ctx.fillRect(x + w * 0.25, y + w * 0.6, eyeSize, eyeSize);
          ctx.fillRect(x + w * 0.6, y + w * 0.6, eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + w * 0.25, y + w * 0.25, eyeSize, eyeSize);
          ctx.fillRect(x + w * 0.6, y + w * 0.25, eyeSize, eyeSize);
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

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#2bff88';
    ctx.font = 'bold 34px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#2bff88';
    ctx.shadowBlur = 25;
    ctx.fillText('SNAKE NEON', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);
  }

  stop() {
    super.stop();
    if (this._key) window.removeEventListener('keydown', this._key);
    if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
    if (this._up) this.canvas.removeEventListener('pointerup', this._up);
  }
};
