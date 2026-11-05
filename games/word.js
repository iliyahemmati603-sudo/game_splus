'use strict';
window.Game_word = class extends GameBase {
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
    this.tileW = Math.min(50, (this.w - 60) / 6);
    this.tileH = this.tileW;
    this.startX = (this.w - (this.tileW + 10) * 5) / 2;
    this.startY = this.h * 0.6;
  }
  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i = 0; i < this.letters.length; i++) {
        const tx = this.startX + i * (this.tileW + 10);
        if (x >= tx && x <= tx + this.tileW && y >= this.startY && y <= this.startY + this.tileH) {
          if (!this.selected.includes(i)) {
            this.selected.push(i);
            AudioEngine.tone(600, 0.05, 'sine', 0.1); Haptics.light();
          }
          break;
        }
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
  }
  startGame() {
    this.state = 'playing';
    this.words = ['برنامه', 'گوشی', 'اینترنت', 'بازی', 'دوست', 'کامپیوتر', 'پیاز', 'هوش', 'کهکشان', 'وب', 'اپلیکیشن', 'رفیق', 'مادر', 'دشمن', 'کتاب', 'کتابخونه', 'کالاف', 'درس', 'دود', 'قلب', 'عقل'];
    this.score = 0;
    this.newWord();
  }
  newWord() {
    this.targetWord = this.words[randInt(0, this.words.length - 1)];
    this.letters = this.targetWord.split('');
    this.letters.sort(() => Math.random() - 0.5);
    this.selected = [];
    this.updateHud();
  }
  checkWord() {
    const built = this.selected.map(i => this.letters[i]).join('');
    if (built === this.targetWord) {
      this.score += 100;
      AudioEngine.win(); Haptics.success(); Camera.add(0.3);
      Particles.burst(this.w/2, this.h*0.4, 30, { color: '#2bff88', minSpeed: 100, maxSpeed: 300 });
      this.newWord();
    } else {
      AudioEngine.hit(); Haptics.heavy(); Camera.add(0.5);
      this.selected = [];
      this.updateHud();
    }
  }
  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`);
  }
  update(dt) {
    Particles.update(dt); Camera.update(dt);
    if (this.state === 'playing' && this.selected.length === this.letters.length) {
      this.checkWord();
    }
  }
  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);
    ctx.fillStyle = '#05070d'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    if (this.state === 'menu') {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('WORD PUZZLE', this.w/2, this.h/2); return;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < this.targetWord.length; i++) {
      const x = this.w/2 - (this.targetWord.length * 40)/2 + i * 40;
      ctx.fillRect(x, this.h*0.3, 35, 45);
    }
    this.selected.forEach((idx, i) => {
      const x = this.w/2 - (this.targetWord.length * 40)/2 + i * 40;
      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 24px Tahoma';
      ctx.fillText(this.letters[idx], x + 17, this.h*0.3 + 30);
    });
    for (let i = 0; i < this.letters.length; i++) {
      const tx = this.startX + i * (this.tileW + 10);
      const isSel = this.selected.includes(i);
      ctx.fillStyle = isSel ? 'rgba(0,229,255,0.2)' : '#111a2e';
      ctx.strokeStyle = isSel ? '#00e5ff' : 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.roundRect(tx, this.startY, this.tileW, this.tileH, 8); ctx.fill(); ctx.stroke();
      if (!isSel) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Tahoma';
        ctx.fillText(this.letters[i], tx + this.tileW/2, this.startY + this.tileH/2 + 8);
      }
    }
    Camera.reset(ctx);
  }
  stop() { super.stop(); if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); }
};
