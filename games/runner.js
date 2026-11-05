rand(50, 180) * this.scale;
    const isGem = Math.random() < 0.2;
    this.collectibles.push({
      x: this.w + 50, y, r: 12 * this.scale, type: isGem ? 'gem' : 'coin', taken: false, bob: Math.random() * 6
    });
  }

  updateHud() {
    const mult = this.multiplier > 1 ? ` ×${this.multiplier}` : '';
    this.setHud(`<div class="hud-pill">امتیاز <b>${Math.floor(this.score)}${mult}</b></div><div class="hud-pill">🪙 ${this.coins} · 💎 ${this.gems}</div>`);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    this.time += dt;

    for (const s of this.stars) {
      s.x -= this.speed * 0.05 * dt * s.speed;
      if (s.x < 0) s.x = this.w;
      s.alpha = 0.3 + Math.sin(this.time * 3 + s.x) * 0.3;
    }

    if (this.state === 'dead') {
      this.deathTimer += dt;
      return;
    }
    if (this.state !== 'playing') return;

    this.speed = this.baseSpeed + (this.score * 0.05);
    this.score += dt * 20 * this.multiplier;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.multiplier = 1; }
    }
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    const p = this.player;
    p.vy += this.gravity * dt;
    p.y += p.vy * dt;

    if (p.y >= this.groundY - p.h) {
      if (!p.grounded) {
        AudioEngine.land();
        Particles.burst(p.x + p.w / 2, p.y + p.h, 8, { color: '#fff', minSpeed: 40, maxSpeed: 120, gravity: 500 });
        p.squash = 1.3;
        p.stretch = 0.7;
      }
      p.y = this.groundY - p.h;
      p.vy = 0;
      p.grounded = true;
      p.jumpsUsed = 0;
    }

    p.squash = lerp(p.squash, 1, dt * 12);
    p.stretch = lerp(p.stretch, 1, dt * 12);
    p.runFrame += dt * (p.grounded ? this.speed / 25 : 8);

    this.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, life: 0.3 });
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);

    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
      if (Math.random() < 0.7) this.spawnCollectible();
    }

    for (const o of this.obstacles) {
      o.x -= this.speed * dt;
      if (o.type === 'drone') {
        o.phase += dt * 4;
        o.y += Math.sin(o.phase) * 80 * dt;
      }
      
      const px = p.x, py = p.y, pw = p.w, ph = p.h;

      if (px + pw > o.x && px < o.x + o.w && py + ph > o.y && py < o.y + o.h) {
        if (this.shieldActive) {
          this.shieldActive = false;
          o.dead = true;
          AudioEngine.win();
          Haptics.heavy();
          Camera.add(0.8);
          Particles.burst(o.x, o.y, 40, { color: '#00e5ff', minSpeed: 150, maxSpeed: 400 });
        } else {
          this.die();
        }
      }
      if (!o.scored && o.x + o.w < px) { o.scored = true; this.score += 15; }
    }
    this.obstacles = this.obstacles.filter(o => o.x > -100 && !o.dead);

    for (const c of this.collectibles) {
      c.x -= this.speed * dt;
      c.bob += dt * 6;
      const cy = c.y + Math.sin(c.bob) * 6;
      
      if (this.magnetTimer > 0) {
        const dx = (p.x + p.w/2) - c.x;
        const dy = (p.y + p.h/2) - cy;
        if (Math.hypot(dx, dy) < 200 * this.scale) {
          c.x += dx * dt * 8;
          c.y += dy * dt * 8;
        }
      }

      if (!c.taken && dist(p.x + p.w / 2, p.y + p.h / 2, c.x, cy) < 35 * this.scale) {
        c.taken = true;
        this.combo++;
        this.comboTimer = 2.5;
        this.multiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        
        if (c.type === 'coin') {
          this.coins++;
          this.score += 25 * this.multiplier;
          AudioEngine.coin();
          Particles.burst(c.x, cy, 10, { color: '#ffc531', minSpeed: 60, maxSpeed: 200 });
        } else {
          this.gems++;
          this.score += 75 * this.multiplier;
          AudioEngine.gem();
          Camera.add(0.2);
          Particles.burst(c.x, cy, 20, { color: '#a855f7', minSpeed: 100, maxSpeed: 300 });
        }
        this.updateHud();
      }
    }
    this.collectibles = this.collectibles.filter(c => c.x > -50 && !c.taken);
  }

  die() {
    this.state = 'dead';
    AudioEngine.hit();
    AudioEngine.lose();
    Haptics.heavy();
    Camera.add(1.5);
    Particles.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 60, { color: '#ff2d78', minSpeed: 200, maxSpeed: 600, gravity: 800 });
    
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      Storage.setBest('runner', this.highScore);
    }
    setTimeout(() => App.gameOver('runner', Math.floor(this.score), { coins: this.coins, gems: this.gems }), 1000);
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#05070d');
    bg.addColorStop(0.5, '#0f1423');
    bg.addColorStop(1, '#2a0f3a');
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    for (const s of this.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    for (const m of this.bgMountains) {
      m.x -= this.speed * 0.1 * (this.state === 'playing' ? 1 : 0.2);
      if (m.x + m.w < 0) m.x = this.w + 100;
      ctx.fillStyle = 'rgba(25, 15, 45, 0.8)';
      ctx.beginPath();
      ctx.moveTo(m.x, this.groundY);
      ctx.lineTo(m.x + m.w / 2, this.groundY - m.h);
      ctx.lineTo(m.x + m.w, this.groundY);
      ctx.closePath();
      ctx.fill();
    }

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    const gg = ctx.createLinearGradient(0, this.groundY, 0, this.h);
    gg.addColorStop(0, '#1a0a35');
    gg.addColorStop(1, '#000');
    ctx.fillStyle = gg;
    ctx.fillRect(0, this.groundY, this.w, this.h - this.groundY);
    
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const o of this.obstacles) {
      if (o.type === 'block') {
        ctx.fillStyle = '#ff2d78';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 15;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 6);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(o.x + o.w/2, o.y + o.h/2, o.w/2, o.h/2, 0, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(o.x + o.w/2, o.y + o.h/2, 5, 0, 6.28);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    for (const c of this.collectibles) {
      const cy = c.y + Math.sin(c.bob) * 6;
      ctx.save();
      ctx.translate(c.x, cy);
      ctx.rotate(this.time * 3);
      ctx.fillStyle = c.type === 'coin' ? '#ffc531' : '#a855f7';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      if (c.type === 'coin') {
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.28); ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const ang = i * Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * c.r, Math.sin(ang) * c.r);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    Particles.render(ctx);

    if (this.state === 'playing' || this.state === 'dead') {
      const p = this.player;
      const bw = p.w * p.stretch;
      const bh = p.h * p.squash;
      const px = p.x + p.w / 2;
      const py = p.y + p.h - bh;

      if (this.trail.length > 0 && this.state === 'playing') {
        for (const t of this.trail) {
          ctx.globalAlpha = t.life * 2;
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, 8 * this.scale, 0, 6.28);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (p.grounded) {
        const legOffset = Math.sin(p.runFrame) * 10 * this.scale;
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(px - bw/4, py + bh, 6 * this.scale, 12 * this.scale + legOffset);
        ctx.fillRect(px + bw/4 - 6 * this.scale, py + bh, 6 * this.scale, 12 * this.scale - legOffset);
      }

      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px - bw / 2, py, bw, bh, 8);
      else ctx.rect(px - bw / 2, py, bw, bh);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.fillRect(px - bw/4, py + bh*0.2, 4 * this.scale, 4 * this.scale);
      ctx.fillRect(px + bw/4 - 4 * this.scale, py + bh*0.2, 4 * this.scale, 4 * this.scale);

      if (this.shieldActive) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py + bh / 2, bw, 0, 6.28);
        ctx.stroke();
      }
    }

    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 38px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 30;
    ctx.fillText('NEON RUNNER', this.w / 2, this.h / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = '18px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 30);

    ctx.fillStyle = '#ffc531';
    ctx.font = 'bold 16px Tahoma';
    ctx.fillText('رکورد: ' + this.highScore, this.w / 2, this.h / 2 + 80);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
  }
};
