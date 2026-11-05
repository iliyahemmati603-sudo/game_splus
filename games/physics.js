'use strict';
window.Game_physics = class extends GameBase {
  constructor() { super(); this.state = 'menu'; }
  startGame() {
    this.state = 'playing';
    this.ball = { x: 50, y: this.h-50, vx: 0, vy: 0, r: 15, launched: false };
    this.targets = [{ x: this.w-80, y: this.h*0.3, w: 40, h: 40 }];
    this.aiming = false; this.startPos = null; this.endPos = null;
    this.bindInputs();
  }
  bindInputs() {
    this._down = e => { if (this.state !== 'playing' || this.ball.launched) return; this.aiming = true; this.startPos = { x: e.clientX, y: e.clientY }; };
    this._up = e => { if (this.aiming) { this.aiming = false; this.ball.launched = true; this.ball.vx = (this.startPos.x - e.clientX)*3; this.ball.vy = (this.startPos.y - e.clientY)*3; } };
    this.canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointerup', this._up);
  }
  update(dt) {
    if (this.state !== 'playing' || !this.ball.launched) return;
    this.ball.vy += 600 * dt; 
    this.ball.x += this.ball.vx * dt; this.ball.y += this.ball.vy * dt;
    if (this.ball.y > this.h-15) { this.ball.y = this.h-15; this.ball.vy *= -0.6; this.ball.vx *= 0.8; }
    if (this.ball.x > this.w-15) { this.ball.x = this.w-15; this.ball.vx *= -0.6; }
    for (let t of this.targets) {
      if (this.ball.x > t.x && this.ball.x < t.x+t.w && this.ball.y > t.y && this.ball.y < t.y+t.h) {
        Particles.burst(t.x+20, t.y+20, 30, { color: '#ffc531', minSpeed: 100, maxSpeed: 300 });
        AudioEngine.win(); this.state='menu'; setTimeout(() => App.gameOver('physics', 100), 500);
      }
    }
  }
  render() {
    const ctx = this.ctx; ctx.fillStyle = '#05070d'; ctx.fillRect(0,0,this.w,this.h);
    if (this.state === 'menu') { ctx.fillStyle='#fff'; ctx.font='30px Tahoma'; ctx.textAlign='center'; ctx.fillText('PHYSICS BALL', this.w/2, this.h/2); return; }
    ctx.fillStyle = '#ffc531';
    for (let t of this.targets) ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, 6.28); ctx.fill();
  }
  stop() { super.stop(); if (this._down) this.canvas.removeEventListener('pointerdown', this._down); window.removeEventListener('pointerup', this._up); }
};
