'use strict';

window.Game_stack = class extends GameBase {
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
    this.baseW = Math.min(this.w * 0.6, 300);
    this.baseH = 40;
    this.blockH = 30;
    this.cameraY = 0;
    this.targetCameraY = 0;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') this.startGame();
      else if (this.state === 'playing') this.dropBlock();
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (this.state === 'menu' || this.state === 'dead') this.startGame();
        else if (this.state === 'playing') this.dropBlock();
      }
    };
    window.addEventListener('keydown', this._key);
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.tower = [];
    this.cameraY = 0;
    this.targetCameraY = 0;

    const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88'];
    
    this.tower.push({
      x: (this.w - this.baseW) / 2,
      y: this.h - this.baseH,
      w: this.baseW,
      color: colors[0]
    });

    this.currentBlock = {
      x: 0,
      w: this.baseW,
      color: colors[1],
      dir: 1,
      speed: 250
    };

    this.updateHud();
  }

  spawnBlock() {
    const last = this.tower[this.tower.length - 1];
    const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88'];
    this.currentBlock = {
      x: Math.random() < 0.5 ? 0 : this.w - last.w,
      w: last.w,
      color: colors[this.tower.length % colors.length],
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 250 + this.tower.length * 15
    };
  }

  dropBlock() {
    if (this.state !== 'playing') return;
    const last = this.tower[this.tower.length - 1];
    const cb = this.currentBlock;

    const overlapLeft = Math.max(cb.x, last.x);
    const overlapRight = Math.min(cb.x + cb.w, last.x + last.w);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      return this.gameOver();
    }

    const isPerfect = Math.abs(cb.x - last.x) < 8;
    let finalX = cb.x;
    let finalW = cb.w;

    if (isPerfect) {
      finalX = last.x;
      finalW = last.w;
      this.combo++;
      AudioEngine.win();
      Haptics.success();
      Camera.add(0.2);
      
      for (let i = 0; i < 15; i++) {
        Particles.burst(finalX + finalW / 2, last.y - this.blockH / 2, 3, { color: '#fff', minSpeed: 100, maxSpeed: 300, gravity: 200 });
      }
    } else {
      this.combo = 0;
      finalX = overlapLeft;
      finalW = overlap;
      AudioEngine.tone(400, 0.1, 'square', 0.1);
      Haptics.medium();
      Camera.add(0.4);
    }

    this.score += Math.floor(10 + (this.combo * 5));

    const newY = last.y - this.blockH;
    this.tower.push({ x: finalX, y: newY, w: finalW, color: cb.color });

    const chop = cb.w - finalW;
    if (chop > 0) {
      const fallingX = cb.x > finalX ? finalX + finalW : finalX - chop;
      Particles.burst(fallingX + chop / 2, newY, 20, { color: cb.color, minSpeed: 100, maxSpeed: 400, gravity: 800, minSize: 4, maxSize: 10 });
    }

    this.targetCameraY = Math.max(0, (this.tower.length - 5) * this.blockH);

    if (finalW <= 5) return this.gameOver();

    this.spawnBlock();
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">ارتفاع <b>${this.tower.length}</b></div>`);
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    Camera.add(1.5);
    
    if (this.currentBlock) {
      Particles.burst(this.currentBlock.x + this.currentBlock.w / 2, 100, 40, { color: this.currentBlock.color, minSpeed: 150, maxSpeed: 500, gravity: 600 });
    }
    setTimeout(() => App.gameOver('stack', this.score, { height: this.tower.length }), 800);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    this.cameraY = lerp(this.cameraY, this.targetCameraY, dt * 5);

    if (this.state !== 'playing') return;

    const cb = this.currentBlock;
    cb.x += cb.speed * cb.dir * dt;

    if (cb.x < 0) { cb.x = 0; cb.dir = 1; }
    if (cb.x + cb.w > this.w) { cb.x = this.w - cb.w; cb.dir = -1; }
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

    ctx.translate(0, this.cameraY);

    for (let i = 0; i < this.tower.length; i++) {
      const b = this.tower[i];
      const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + this.blockH);
      g.addColorStop(0, b.color);
      g.addColorStop(1, 'rgba(0,0,0,0.6)');
      
      ctx.fillStyle = g;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = i === this.tower.length - 1 ? 25 : 5;
      
      ctx.fillRect(b.x, b.y, b.w, this.blockH);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(b.x, b.y, b.w, 4);
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, this.blockH);
    }

    if (this.state === 'playing' && this.currentBlock) {
      const cb = this.currentBlock;
      const nextY = this.tower[this.tower.length - 1].y - this.blockH;
      
      ctx.fillStyle = cb.color;
      ctx.shadowColor = cb.color;
      ctx.shadowBlur = 20;
      ctx.fillRect(cb.x, nextY, cb.w, this.blockH);
      
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cb.x, nextY, cb.w, 4);
      ctx.shadowBlur = 0;
      
      if (this.combo > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Tahoma';
        ctx.textAlign = 'center';
        ctx.fillText(`کمبو ×${this.combo}`, this.w / 2, nextY - 20);
      }
    }

    Particles.render(ctx);
    
    ctx.translate(0, -this.cameraY);
    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#ffc531';
    ctx.font = 'bold 32px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffc531';
    ctx.shadowBlur = 20;
    ctx.fillText('TOWER STACK', this.w / 2, this.h / 2 - 30);
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
