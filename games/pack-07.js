window.Game_timberman = class extends GameBase {
  constructor() {
    super();
    Particles.init(300);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'menu';
    this.bindInputs();
  }

  recalc() {
    this.treeX = this.w / 2;
    this.treeW = Math.min(this.w * 0.35, 140);
    this.groundY = this.h - 80;
    this.playerY = this.groundY - 40;
    this.branchH = 22;
    this.branchSpacing = 55;
    this.baseSpeed = 180;
    this.currentSide = 'left';
    this.score = 0;
    this.lives = 3;
    this.chopCount = 0;
    this.branches = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.time = 0;
    this.shakeTimer = 0;
    this.hitFlash = 0;
    this.combo = 0;
    this.bestCombo = 0;
  }

  bindInputs() {
    this._key = (e) => {
      if (this.state === 'menu' || this.state === 'dead') {
        if (e.key === ' ' || e.key === 'Enter') this.startGame();
        return;
      }
      if (this.state !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); this.chop('left'); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); this.chop('right'); }
    };
    window.addEventListener('keydown', this._key);

    this._touch = (e) => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
      if (this.state !== 'playing') return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      this.chop(x < this.w / 2 ? 'left' : 'right');
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.lives = 3;
    this.chopCount = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.branches = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.currentSide = 'left';
    this.hitFlash = 0;
    this.shakeTimer = 0;
    this.time = 0;
    this.updateHud();
  }

  chop(side) {
    if (this.state !== 'playing') return;
    if (side !== this.currentSide) {
      this.currentSide = side;
      AudioEngine.tone(300, 0.06, 'triangle', 0.08);
      Haptics.light();
    }
    this.chopCount++;
    this.score += 1;
    AudioEngine.chop();
    Haptics.light();
    Camera.add(0.15);
    this.shakeTimer = 0.15;

    const px = this.treeX + (side === 'left' ? -this.treeW / 2 - 20 : this.treeW / 2 + 20);
    const py = this.playerY;
    Particles.burst(px, py, 12, {
      color: '#c8a878', minSpeed: 80, maxSpeed: 220, gravity: 400, angle: side === 'left' ? Math.PI : 0
    });

    for (let i = this.branches.length - 1; i >= 0; i--) {
      const b = this.branches[i];
      if (!b.dead && Math.abs(b.y - this.playerY) < 30) {
        if (b.side === side) {
          b.dead = true;
          this.combo++;
          this.bestCombo = Math.max(this.bestCombo, this.combo);
          this.score += 5 + this.combo;
          AudioEngine.coin();
          Haptics.success();
          Camera.add(0.3);
          Particles.burst(this.treeX, b.y, 20, { color: '#8B5A2B', minSpeed: 100, maxSpeed: 300, gravity: 500 });
        } else {
          this.hitFlash = 0.3;
          this.combo = 0;
        }
      }
    }

    this.updateHud();
  }

  spawnBranch() {
    const lastBranch = this.branches[this.branches.length - 1];
    let side;
    if (lastBranch && Math.random() < 0.6) {
      side = lastBranch.side === 'left' ? 'right' : 'left';
    } else {
      side = Math.random() < 0.5 ? 'left' : 'right';
    }
    this.branches.push({
      x: this.treeX + (side === 'left' ? -this.treeW / 2 - 55 : this.treeW / 2),
      y: 70,
      side: side,
      dead: false
    });
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    AudioEngine.hit();
    AudioEngine.lose();
    Haptics.heavy();
    Camera.add(1.5);
    Particles.burst(this.treeX, this.playerY, 50, { color: '#ff2d78', minSpeed: 150, maxSpeed: 500, gravity: 500 });
    setTimeout(() => App.gameOver('timberman', this.score, { combo: this.bestCombo }), 900);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    this.time += dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.state !== 'playing') return;

    this.spawnTimer += dt;
    const speedMul = 1 + this.score * 0.003;
    if (this.spawnTimer >= this.spawnInterval / speedMul) {
      this.spawnTimer = 0;
      this.spawnBranch();
    }

    const speed = this.baseSpeed * speedMul;
    for (let i = this.branches.length - 1; i >= 0; i--) {
      const b = this.branches[i];
      if (b.dead) continue;
      b.y += speed * dt;
      if (Math.abs(b.y - this.playerY) < 28) {
        if (b.side === this.currentSide) {
          b.dead = true;
          this.lives--;
          this.combo = 0;
          this.hitFlash = 0.4;
          Camera.add(1);
          Haptics.heavy();
          AudioEngine.hit();
          Particles.burst(this.treeX, b.y, 25, { color: '#ff2d78', minSpeed: 100, maxSpeed: 300 });
          if (this.lives <= 0) return this.die();
        }
      }
      if (b.y > this.h + 50) this.branches.splice(i, 1);
    }
    this.branches = this.branches.filter(b => !b.dead || b.y < this.h + 50);
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives}</div><div class="hud-pill">🔥 کمبو ${this.combo}</div>`);
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#0a0e1a');
    bg.addColorStop(1, '#1a1235');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    for (let i = 0; i < 6; i++) {
      const my = 100 + i * 120;
      ctx.fillStyle = `rgba(45,35,70,${0.4 + i * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(this.w * 0.3, my - 60);
      ctx.lineTo(this.w * 0.6, my);
      ctx.fill();
    }

    ctx.fillStyle = '#2a1055';
    ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const trunkGrad = ctx.createLinearGradient(this.treeX - this.treeW / 2, 0, this.treeX + this.treeW / 2, 0);
    trunkGrad.addColorStop(0, '#5a3a1a');
    trunkGrad.addColorStop(0.5, '#8B5A2B');
    trunkGrad.addColorStop(1, '#5a3a1a');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(this.treeX - this.treeW / 2, 40, this.treeW, this.groundY - 40);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < 5; i++) {
      const lx = this.treeX - this.treeW / 2 + (i + 0.5) * (this.treeW / 5);
      ctx.beginPath();
      ctx.moveTo(lx, 40);
      ctx.lineTo(lx + Math.sin(this.time + i) * 4, this.groundY);
      ctx.stroke();
    }

    for (const b of this.branches) {
      if (b.dead) continue;
      const dir = b.side === 'left' ? -1 : 1;
      const baseX = b.side === 'left' ? this.treeX - this.treeW / 2 : this.treeX + this.treeW / 2;
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, b.y);
      ctx.lineTo(baseX + dir * 55, b.y);
      ctx.stroke();
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(baseX + dir * 55, b.y, 12, 0, 6.28);
      ctx.fill();
    }

    Particles.render(ctx);

    const px = this.treeX + (this.currentSide === 'left' ? -this.treeW / 2 - 25 : this.treeW / 2 + 25);
    const py = this.playerY;
    ctx.fillStyle = '#e0b090';
    ctx.beginPath();
    ctx.ellipse(px, py, 10, 16, 0, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(px, py - 22, 11, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#c83030';
    ctx.beginPath();
    ctx.moveTo(px - 12, py - 26);
    ctx.lineTo(px + 12, py - 26);
    ctx.lineTo(px + 10, py - 34);
    ctx.lineTo(px - 10, py - 34);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.currentSide === 'left' ? -0.5 : 0.5);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -28);
    ctx.stroke();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(this.currentSide === 'left' ? -12 : 12, -32);
    ctx.lineTo(0, -36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,45,120,${this.hitFlash * 0.5})`;
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    }

    Camera.reset(ctx);
  }

  stop() {
    super.stop();
    if (this._key) window.removeEventListener('keydown', this._key);
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
  }
};
