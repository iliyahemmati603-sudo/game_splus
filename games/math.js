'use strict';

window.Game_math = class extends GameBase {
  constructor() {
    super();
    Particles.init(200);
    Input.bind(this.canvas);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'menu';
    this.bindInputs();
  }

  recalc() {
    this.btnW = (this.w - 60) / 2;
    this.btnH = 70;
    this.gridX = 30;
    this.gridY = this.h * 0.55;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') {
        this.startGame();
        return;
      }
      if (this.state !== 'playing') return;

      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      for (let i = 0; i < 4; i++) {
        const bx = this.gridX + (i % 2) * (this.btnW + 15);
        const by = this.gridY + Math.floor(i / 2) * (this.btnH + 15);
        
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
    this.animTimer = 0;
    this.newQuestion();
    this.updateHud();
  }

  newQuestion() {
    let max = 10 + (this.score * 2);
    let a = randInt(1, max);
    let b = randInt(1, max);
    const op = Math.random() < 0.5 ? '+' : '-';
    
    if (op === '-' && a < b) [a, b] = [b, a];
    
    this.answer = op === '+' ? a + b : a - b;
    this.question = `${a} ${op} ${b} = ?`;
    
    this.options = [this.answer];
    while (this.options.length < 4) {
      const wrong = this.answer + randInt(-10, 10);
      if (wrong !== this.answer && !this.options.includes(wrong) && wrong > 0) {
        this.options.push(wrong);
      }
    }
    this.options.sort(() => Math.random() - 0.5);
  }

  checkAnswer(val, index) {
    if (val === this.answer) {
      this.score += 10 + (this.combo * 2);
      this.combo++;
      AudioEngine.win();
      Haptics.light();
      Camera.add(0.1);
      this.timeLeft = Math.min(30, this.timeLeft + 2);
      
      const bx = this.gridX + (index % 2) * (this.btnW + 15) + this.btnW / 2;
      const by = this.gridY + Math.floor(index / 2) * (this.btnH + 15) + this.btnH / 2;
      Particles.burst(bx, by, 15, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });
      
      this.newQuestion();
    } else {
      this.combo = 0;
      this.lives--;
      this.timeLeft = Math.max(0, this.timeLeft - 5);
      AudioEngine.hit();
      Haptics.heavy();
      Camera.add(0.6);
      
      const bx = this.gridX + (index % 2) * (this.btnW + 15) + this.btnW / 2;
      const by = this.gridY + Math.floor(index / 2) * (this.btnH + 15) + this.btnH / 2;
      Particles.burst(bx, by, 15, { color: '#ff2d78', minSpeed: 80, maxSpeed: 250, gravity: 300 });
      
      if (this.lives <= 0) this.gameOver();
    }
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">⏱ <b>${Math.ceil(this.timeLeft)}s</b> · ❤️ ${this.lives}</div>`);
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    setTimeout(() => App.gameOver('math', this.score), 800);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    this.animTimer += dt;

    if (this.state !== 'playing') return;

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
      ctx.font = 'bold 32px Tahoma';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.fillText('SPEED MATH', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx);
      return;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 60, this.w, 4);
    ctx.fillStyle = this.timeLeft < 10 ? '#ff2d78' : '#00e5ff';
    ctx.fillRect(0, 60, (this.timeLeft / 30) * this.w, 4);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 25;
    ctx.fillText(this.question, this.w / 2, this.h * 0.3);
    ctx.shadowBlur = 0;

    if (this.combo > 1) {
      ctx.fillStyle = '#ffc531';
      ctx.font = 'bold 24px Tahoma';
      ctx.fillText(`کمبو ×${this.combo}`, this.w / 2, this.h * 0.4);
    }

    for (let i = 0; i < 4; i++) {
      const bx = this.gridX + (i % 2) * (this.btnW + 15);
      const by = this.gridY + Math.floor(i / 2) * (this.btnH + 15);

      const g = ctx.createLinearGradient(bx, by, bx, by + this.btnH);
      g.addColorStop(0, 'rgba(0,229,255,0.15)');
      g.addColorStop(1, 'rgba(0,229,255,0.05)');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, this.btnW, this.btnH, 12);
      else ctx.rect(bx, by, this.btnW, this.btnH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Tahoma';
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
