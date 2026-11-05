'use strict';

window.Game_clicker = class extends GameBase {
  constructor() {
    super();
    Particles.init(300);
    Input.bind(this.canvas);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'playing';
    this.bindInputs();
  }

  recalc() {
    this.coreX = this.w / 2;
    this.coreY = this.h * 0.35;
    this.coreR = 60;
    this.btnW = (this.w - 60) / 2;
    this.btnH = 70;
    this.btnY = this.h - 160;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      if (y >= this.btnY) {
        if (x >= 30 && x <= 30 + this.btnW) this.buyClick();
        else if (x >= 30 + this.btnW + 20 && x <= this.w - 30) this.buyAuto();
        return;
      }

      const d = Math.hypot(x - this.coreX, y - this.coreY);
      if (d < this.coreR + 20) {
        this.clickCore(x, y);
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
      if (e.key === ' ') {
        e.preventDefault();
        this.clickCore(this.coreX, this.coreY);
      }
    };
    window.addEventListener('keydown', this._key);
  }

  start() {
    this.coins = 0;
    this.clickPower = 1;
    this.autoPower = 0;
    this.clickCost = 10;
    this.autoCost = 25;
    this.pulse = 0;
    this.floatingTexts = [];
    this.autoTimer = 0;
    this.updateHud();
  }

  clickCore(x, y) {
    this.coins += this.clickPower;
    this.pulse = 1;
    AudioEngine.tone(600 + Math.random() * 100, 0.05, 'sine', 0.1);
    Haptics.light();
    Camera.add(0.05);

    const colors = ['#00e5ff', '#ffc531', '#2bff88'];
    Particles.burst(x, y, 10, { color: colors[randInt(0, 2)], minSpeed: 80, maxSpeed: 250, gravity: 300 });

    this.floatingTexts.push({
      x, y, text: '+' + this.clickPower, life: 1, max: 1, vy: -100
    });
    this.updateHud();
  }

  buyClick() {
    if (this.coins < this.clickCost) {
      AudioEngine.tone(200, 0.1, 'sawtooth', 0.1);
      Haptics.heavy();
      return;
    }
    this.coins -= this.clickCost;
    this.clickPower++;
    this.clickCost = Math.floor(this.clickCost * 1.5);
    AudioEngine.win();
    Haptics.success();
    Camera.add(0.3);
    Particles.burst(this.w / 4, this.btnY + this.btnH / 2, 20, { color: '#00e5ff', minSpeed: 100, maxSpeed: 300 });
    this.updateHud();
  }

  buyAuto() {
    if (this.coins < this.autoCost) {
      AudioEngine.tone(200, 0.1, 'sawtooth', 0.1);
      Haptics.heavy();
      return;
    }
    this.coins -= this.autoCost;
    this.autoPower++;
    this.autoCost = Math.floor(this.autoCost * 1.8);
    AudioEngine.win();
    Haptics.success();
    Camera.add(0.3);
    Particles.burst(this.w * 3 / 4, this.btnY + this.btnH / 2, 20, { color: '#ff2d78', minSpeed: 100, maxSpeed: 300 });
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">سکه <b>${Math.floor(this.coins)}</b></div><div class="hud-pill">💰 ${Math.floor(this.autoPower)}/s</div>`);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    this.pulse = Math.max(0, this.pulse - dt * 5);

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    if (this.autoPower > 0) {
      this.autoTimer += dt;
      if (this.autoTimer >= 0.1) {
        this.autoTimer = 0;
        this.coins += this.autoPower * 0.1;
        this.updateHud();
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

    const scale = 1 + this.pulse * 0.1;
    
    ctx.save();
    ctx.translate(this.coreX, this.coreY);
    ctx.scale(scale, scale);
    
    const cg = ctx.createRadialGradient(0, 0, 10, 0, 0, this.coreR);
    cg.addColorStop(0, '#fff');
    cg.addColorStop(0.3, '#00e5ff');
    cg.addColorStop(1, '#0088cc');
    
    ctx.fillStyle = cg;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, this.coreR, 0, 6.28);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#05070d';
    ctx.beginPath();
    ctx.arc(0, 0, this.coreR * 0.6, 0, 6.28);
    ctx.fill();
    
    ctx.fillStyle = '#ffc531';
    ctx.font = 'bold 20px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', 0, 0);
    
    ctx.restore();

    Particles.render(ctx);

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = '#ffc531';
      ctx.font = 'bold 20px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(0,229,255,0.1)';
    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(30, this.btnY, this.btnW, this.btnH, 12);
    else ctx.rect(30, this.btnY, this.btnW, this.btnH);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 14px Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('ارتقای کلیک', 30 + this.btnW / 2, this.btnY + 25);
    ctx.font = '12px Tahoma';
    ctx.fillStyle = '#fff';
    ctx.fillText('توان: ' + this.clickPower, 30 + this.btnW / 2, this.btnY + 45);
    ctx.fillStyle = '#ffc531';
    ctx.fillText('قیمت: ' + this.clickCost, 30 + this.btnW / 2, this.btnY + 60);

    ctx.fillStyle = 'rgba(255,45,120,0.1)';
    ctx.strokeStyle = 'rgba(255,45,120,0.3)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50 + this.btnW, this.btnY, this.btnW, this.btnH, 12);
    else ctx.rect(50 + this.btnW, this.btnY, this.btnW, this.btnH);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ff2d78';
    ctx.font = 'bold 14px Tahoma';
    ctx.fillText('کلیکر خودکار', 50 + this.btnW + this.btnW / 2, this.btnY + 25);
    ctx.font = '12px Tahoma';
    ctx.fillStyle = '#fff';
    ctx.fillText('سرعت: ' + this.autoPower + '/s', 50 + this.btnW + this.btnW / 2, this.btnY + 45);
    ctx.fillStyle = '#ffc531';
    ctx.fillText('قیمت: ' + this.autoCost, 50 + this.btnW + this.btnW / 2, this.btnY + 60);

    Camera.reset(ctx);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
  }
};
