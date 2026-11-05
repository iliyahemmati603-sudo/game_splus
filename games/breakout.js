    });
      }
    }
  }

  launch() {
    this.state = 'playing';
    for (const b of this.balls) {
      b.vx = rand(-250, 250);
      b.vy = -b.speed;
    }
    AudioEngine.tone(600, 0.1, 'sine', 0.1);
  }

  shootLaser() {
    this.lasers.push({ x: this.paddleX + 5, y: this.paddleY, vy: -1000 });
    this.lasers.push({ x: this.paddleX + this.paddleW - 5, y: this.paddleY, vy: -1000 });
    AudioEngine.tone(900, 0.05, 'square', 0.1);
    Haptics.light();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">❤️ ${this.lives} · موج ${this.level}</div>`);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    if (this.keyLeft) this.paddleX = clamp(this.paddleX - 700 * dt, 0, this.w - this.paddleW);
    if (this.keyRight) this.paddleX = clamp(this.paddleX + 700 * dt, 0, this.w - this.paddleW);

    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        if (this.activePowerup === 'wide') this.paddleW = this.w * 0.22;
        this.activePowerup = null;
      }
    }

    if (this.state !== 'playing') {
      if (this.state === 'ready') {
        this.balls[0].x = this.paddleX + this.paddleW / 2;
        this.balls[0].y = this.paddleY - 20;
      }
      return;
    }

    for (const b of this.balls) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.trail.push({ x: b.x, y: b.y, life: 0.2 });
      for (const t of b.trail) t.life -= dt;
      b.trail = b.trail.filter(t => t.life > 0);

      if (b.x - this.ballR < 0) { b.x = this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.05); }
      if (b.x + this.ballR > this.w) { b.x = this.w - this.ballR; b.vx *= -1; AudioEngine.tone(400, 0.05, 'square', 0.05); }
      if (b.y - this.ballR < 60) { b.y = this.ballR + 60; b.vy *= -1; AudioEngine.tone(400, 0.05, 'square', 0.05); }

      if (b.y + this.ballR > this.paddleY && b.y - this.ballR < this.paddleY + this.paddleH &&
          b.x > this.paddleX && b.x < this.paddleX + this.paddleW && b.vy > 0) {
        const hitPos = (b.x - this.paddleX) / this.paddleW;
        const angle = (hitPos - 0.5) * Math.PI * 0.8;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(angle) * sp;
        b.vy = -Math.abs(Math.cos(angle) * sp);
        b.y = this.paddleY - this.ballR;
        AudioEngine.tone(700, 0.08, 'sine', 0.1);
        Haptics.light();
        Particles.burst(b.x, b.y, 8, { color: '#fff', minSpeed: 50, maxSpeed: 150, angle: -Math.PI/2 });
      }
    }

    this.balls = this.balls.filter(b => b.y - this.ballR <= this.h);
    if (this.balls.length === 0) this.loseLife();

    for (const l of this.lasers) l.y += l.vy * dt;
    this.lasers = this.lasers.filter(l => l.y > 60);

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + br.h) {
          this.hitBrick(br, l.x, l.y);
          this.lasers.splice(i, 1);
          break;
        }
      }
    }

    for (const b of this.balls) {
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (b.x + this.ballR > br.x && b.x - this.ballR < br.x + br.w &&
            b.y + this.ballR > br.y && b.y - this.ballR < br.y + br.h) {
          this.hitBrick(br, b.x, b.y);
          const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
          if (Math.abs(b.x - cx) / br.w > Math.abs(b.y - cy) / br.h) b.vx *= -1;
          else b.vy *= -1;
          break;
        }
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.y += 180 * dt;
      if (pu.y + pu.w > this.paddleY && pu.y < this.paddleY + this.paddleH &&
          pu.x + pu.w > this.paddleX && pu.x < this.paddleX + this.paddleW) {
        this.activatePowerup(pu.type);
        this.powerups.splice(i, 1);
        continue;
      }
      if (pu.y > this.h) this.powerups.splice(i, 1);
    }

    if (this.bricks.every(br => !br.alive)) this.nextLevel();
  }

  hitBrick(br, hx, hy) {
    br.hp--;
    AudioEngine.tone(800, 0.05, 'square', 0.1);
    Haptics.light();
    Camera.add(0.05);
    Particles.burst(hx, hy, 5, { color: br.color, minSpeed: 50, maxSpeed: 150 });
    
    if (br.hp <= 0) {
      br.alive = false;
      this.score += 20 * this.level;
      Camera.add(0.15);
      Particles.burst(br.x + br.w/2, br.y + br.h/2, 20, { color: br.color, minSpeed: 100, maxSpeed: 350, gravity: 400 });
      if (Math.random() < 0.18) {
        const types = ['multi', 'wide', 'laser'];
        this.powerups.push({ x: br.x + br.w/2 - 12, y: br.y + br.h/2 - 12, w: 24, h: 24, type: pick(types) });
      }
      this.updateHud();
    }
  }

  activatePowerup(type) {
    AudioEngine.win();
    Haptics.success();
    if (type === 'multi') {
      const base = this.balls[0];
      this.balls.push(
        { x: base.x, y: base.y, vx: base.vx + 200, vy: base.vy, speed: base.speed, trail: [] },
        { x: base.x, y: base.y, vx: base.vx - 200, vy: base.vy, speed: base.speed, trail: [] }
      );
    } else if (type === 'wide') {
      this.paddleW = this.w * 0.35;
      this.activePowerup = 'wide';
      this.powerupTimer = 10;
    } else if (type === 'laser') {
      this.activePowerup = 'laser';
      this.powerupTimer = 8;
    }
  }

  loseLife() {
    this.lives--;
    this.state = 'ready';
    this.balls = [{ x: this.w / 2, y: this.paddleY - 20, vx: 0, vy: 0, speed: 400, trail: [] }];
    this.paddleX = (this.w - this.paddleW) / 2;
    AudioEngine.hit();
    Haptics.heavy();
    Camera.add(1);
    this.updateHud();
    if (this.lives <= 0) {
      this.state = 'dead';
      setTimeout(() => App.gameOver('breakout', this.score, { level: this.level }), 500);
    }
  }

  nextLevel() {
    this.level++;
    this.buildLevel();
    this.state = 'ready';
    this.balls = [{ x: this.w / 2, y: this.paddleY - 20, vx: 0, vy: 0, speed: 400 + this.level * 20, trail: [] }];
    this.paddleX = (this.w - this.paddleW) / 2;
    AudioEngine.win();
    Haptics.success();
    this.updateHud();
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#05070d');
    bg.addColorStop(1, '#150a25');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 32px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT PRO', this.w / 2, this.h / 2 - 30);
      ctx.fillStyle = '#fff'; ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx); return;
    }

    for (const br of this.bricks) {
      if (!br.alive) continue;
      br.pulse += 0.05;
      const scale = 1 + Math.sin(br.pulse) * 0.02;
      const cx = br.x + br.w/2, cy = br.y + br.h/2;
      
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
      
      const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
      g.addColorStop(0, br.color);
      g.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = g;
      ctx.shadowColor = br.color;
      ctx.shadowBlur = br.hp > 1 ? 15 : 5;
      
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(br.x, br.y, br.w, br.h, 6);
      else ctx.rect(br.x, br.y, br.w, br.h);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      if (br.hp > 1) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }

    for (const l of this.lasers) {
      ctx.fillStyle = '#ffc531';
      ctx.shadowColor = '#ffc531';
      ctx.shadowBlur = 10;
      ctx.fillRect(l.x - 2, l.y, 4, 20);
      ctx.shadowBlur = 0;
    }

    for (const pu of this.powerups) {
      const color = pu.type === 'multi' ? '#ff2d78' : pu.type === 'wide' ? '#00e5ff' : '#ffc531';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(pu.x + pu.w/2, pu.y + pu.h/2, pu.w/2, 0, 6.28);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    Particles.render(ctx);

    if (this.activePowerup === 'wide') ctx.fillStyle = '#00e5ff';
    else if (this.activePowerup === 'laser') ctx.fillStyle = '#ffc531';
    else ctx.fillStyle = '#00e5ff';
    
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, 8);
    else ctx.rect(this.paddleX, this.paddleY, this.paddleW, this.paddleH);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (const b of this.balls) {
      for (const t of b.trail) {
        ctx.globalAlpha = t.life * 4;
        ctx.fillStyle = '#ffc531';
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ffc531';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(b.x, b.y, this.ballR, 0, 6.28);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (this.state === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.w/2 - 100, this.h/2 - 30, 200, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('برای شلیک ضربه بزن', this.w / 2, this.h / 2 - 5);
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
