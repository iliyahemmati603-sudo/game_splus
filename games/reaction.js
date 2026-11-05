'use strict';

window.Game_reaction = class extends GameBase {
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
    this.btnW = 220;
    this.btnH = 60;
    this.btnX = (this.w - this.btnW) / 2;
    this.btnY = this.h * 0.7;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.handleInput(pt);
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleInput({ x: this.w / 2, y: this.h / 2 });
      }
    };
    window.addEventListener('keydown', this._key);
  }

  handleInput(pt) {
    if (this.state === 'menu') {
      this.startGame();
      return;
    }

    if (this.state === 'gameover') {
      if (pt.x >= this.btnX && pt.x <= this.btnX + this.btnW && pt.y >= this.btnY && pt.y <= this.btnY + this.btnH) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'countdown' || this.state === 'result') return;

    if (this.state === 'wait') {
      this.penalty();
    } else if (this.state === 'tap') {
      this.recordTime();
    }
  }

  startGame() {
    this.round = 1;
    this.maxRounds = 5;
    this.times = [];
    this.score = 0;
    this.waitTimer = 0;
    this.countdownTimer = 3.0;
    this.resultTimer = 0;
    this.state = 'countdown';
    this.color = '#05070d';
    this.currentText = 'آماده باش';
    this.lastTick = 4;
    this.updateHud();
    AudioEngine.tone(400, 0.1, 'sine', 0.1);
  }

  startRound() {
    this.state = 'countdown';
    this.countdownTimer = 3.0;
    this.lastTick = 4;
    this.color = '#05070d';
  }

  penalty() {
    this.times.push(1.0);
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1.5);
    Particles.burst(this.w / 2, this.h / 2, 40, { color: '#ff2d78', minSpeed: 150, maxSpeed: 500 });
    this.state = 'result';
    this.resultTimer = 1.5;
    this.currentText = 'خیلی زود بود!';
    this.updateHud();
  }

  recordTime() {
    const time = (performance.now() - this.startTime) / 1000;
    this.times.push(time);
    
    AudioEngine.win();
    Haptics.success();
    Camera.add(0.3);
    
    Particles.burst(this.w / 2, this.h / 2, 30, { color: '#2bff88', minSpeed: 100, maxSpeed: 400 });
    
    this.state = 'result';
    this.resultTimer = 1.5;
    this.currentText = Math.floor(time * 1000) + ' ms';
    this.updateHud();
  }

  nextRound() {
    this.round++;
    if (this.round > this.maxRounds) {
      this.state = 'gameover';
      const avg = this.times.reduce((a, b) => a + b, 0) / this.maxRounds;
      this.score = Math.max(0, 10000 - Math.floor(avg * 10000));
      AudioEngine.win();
      Haptics.success();
    } else {
      this.startRound();
    }
  }

  updateHud() {
    this.setHud(`
      <div class="hud-pill">دور <b>${Math.min(this.round, this.maxRounds)}/${this.maxRounds}</b></div>
      <div class="hud-pill">امتیاز <b>${this.score}</b></div>
    `);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    if (this.state === 'countdown') {
      this.countdownTimer -= dt;
      const currentTick = Math.ceil(this.countdownTimer);
      
      if (currentTick !== this.lastTick && currentTick > 0) {
        this.lastTick = currentTick;
        AudioEngine.tone(600, 0.1, 'square', 0.1);
        Camera.add(0.1);
      }
      
      if (this.countdownTimer <= 0) {
        this.state = 'wait';
        this.waitTimer = rand(1.5, 4.0);
        this.color = '#ff2d78';
        this.currentText = 'منتظر بمان...';
        AudioEngine.tone(300, 0.1, 'sine', 0.1);
      }
    } 
    else if (this.state === 'wait') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.state = 'tap';
        this.color = '#2bff88';
        this.currentText = 'بزن!';
        this.startTime = performance.now();
        AudioEngine.tone(1000, 0.1, 'sine', 0.2);
        Camera.add(0.2);
      }
    } 
    else if (this.state === 'result') {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) {
        this.nextRound();
      }
    }
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    if (this.state === 'menu') {
      const bg = ctx.createLinearGradient(0, 0, 0, this.h);
      bg.addColorStop(0, '#05070d');
      bg.addColorStop(1, '#0f1423');
      ctx.fillStyle = bg;
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 34px Tahoma';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 25;
      ctx.fillText('REACTION TEST', this.w / 2, this.h / 2 - 40);
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('واکنش خود را بسنجید', this.w / 2, this.h / 2 + 10);
      
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px Tahoma';
      ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 50);
      
      Camera.reset(ctx);
      return;
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'countdown') {
      const text = Math.ceil(this.countdownTimer) > 0 ? Math.ceil(this.countdownTimer).toString() : 'برو!';
      const scale = 1 + Math.sin((this.countdownTimer % 1) * Math.PI) * 0.2;
      
      ctx.save();
      ctx.translate(this.w / 2, this.h / 2);
      ctx.scale(scale, scale);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 80px Tahoma';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 30;
      
      if (text === 'برو!') {
        ctx.fillStyle = '#2bff88';
        ctx.shadowColor = '#2bff88';
      }
      
      ctx.fillText(text, 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '18px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText('آماده باش...', this.w / 2, this.h * 0.25);
    } 
    else if (this.state === 'wait' || this.state === 'tap') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Tahoma';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (this.state === 'tap') {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
      }
      
      ctx.fillText(this.currentText, this.w / 2, this.h / 2);
      ctx.shadowBlur = 0;
    } 
    else if (this.state === 'result') {
      ctx.fillStyle = this.currentText === 'خیلی زود بود!' ? '#ff2d78' : '#00e5ff';
      ctx.font = 'bold 42px Tahoma';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      
      ctx.fillText(this.currentText, this.w / 2, this.h / 2);
      ctx.shadowBlur = 0;
      
      if (this.currentText !== 'خیلی زود بود!') {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Tahoma';
        ctx.fillText('زمان واکنش شما', this.w / 2, this.h / 2 - 50);
      }
    } 
    else if (this.state === 'gameover') {
      const bg = ctx.createLinearGradient(0, 0, 0, this.h);
      bg.addColorStop(0, '#05070d');
      bg.addColorStop(1, '#0f1423');
      ctx.fillStyle = bg;
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

      ctx.fillStyle = '#ffc531';
      ctx.font = 'bold 36px Tahoma';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffc531';
      ctx.shadowBlur = 25;
      ctx.fillText('پایان بازی!', this.w / 2, this.h * 0.25);
      ctx.shadowBlur = 0;

      const avg = this.times.reduce((a, b) => a + b, 0) / this.maxRounds;
      ctx.fillStyle = '#fff';
      ctx.font = '18px Tahoma';
      ctx.fillText('میانگین واکنش:', this.w / 2, this.h * 0.4);
      
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 28px Tahoma';
      ctx.fillText(Math.floor(avg * 1000) + ' ms', this.w / 2, this.h * 0.48);
      
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('امتیاز نهایی: ' + this.score, this.w / 2, this.h * 0.58);

      const g = ctx.createLinearGradient(this.btnX, this.btnY, this.btnX + this.btnW, this.btnY + this.btnH);
      g.addColorStop(0, '#00e5ff');
      g.addColorStop(1, '#0088cc');
      
      ctx.fillStyle = g;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(this.btnX, this.btnY, this.btnW, this.btnH, 15);
      else ctx.rect(this.btnX, this.btnY, this.btnW, this.btnH);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#04101a';
      ctx.font = 'bold 18px Tahoma';
      ctx.fillText('شروع مجدد', this.w / 2, this.btnY + this.btnH / 2 + 2);
    }

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
  }
};
