

  recalc() {
    this.cols = 4;
    this.rows = 4;
    const topOff = 60;
    const avail = Math.min(this.w - 40, this.h - topOff - 100);
    this.cellSize = Math.floor(avail / 4);
    this.gridW = this.cols * this.cellSize;
    this.gridH = this.rows * this.cellSize;
    this.gridX = (this.w - this.gridW) / 2;
    this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') {
        this.startGame();
        return;
      }
      if (this.state !== 'playing' || this.lock) return;
      
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const c = Math.floor((x - this.gridX) / this.cellSize);
      const rr = Math.floor((y - this.gridY) / this.cellSize);
      
      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
        this.flip(rr * this.cols + c);
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
  }

  startGame() {
    this.state = 'playing';
    
    const decks = [
      ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🥝', '🍍'], 
      ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'], 
      ['🚀', '👽', '🌍', '🌙', '⭐', '☄️', '🛸', '🌌'], 
      ['😀', '😎', '😍', '🤔', '😴', '😭', '😡', '🤯']  
    ];
    
    const activeDeck = decks[randInt(0, decks.length - 1)];
    const gameEmojis = [...activeDeck, ...activeDeck].sort(() => Math.random() - 0.5);
    
    this.cards = gameEmojis.map((e, i) => ({
      emoji: e,
      flipped: true, 
      matched: false,
      flipAnim: 1,   
      pulseAnim: 0,
      errorAnim: 0
    }));
    
    this.opened = [];
    this.matched = 0;
    this.moves = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lock = true;
    this.timeElapsed = 0;
    this.startTime = performance.now();
    this.revealTimer = 2.5; 
    
    this.updateHud();
  }

  updateHud() {
    this.setHud(`
      <div class="hud-pill">امتیاز <b>${this.score}</b></div>
      <div class="hud-pill">⏱ ${Math.floor(this.timeElapsed)}s · جفت ${this.matched}/8</div>
    `);
  }

  flip(idx) {
    const card = this.cards[idx];
    if (card.flipped || card.matched) return;

    card.flipped = true;
    card.flipAnim = 1;
    AudioEngine.tone(600, 0.08, 'sine', 0.1);
    Haptics.light();
    
    this.opened.push(idx);

    if (this.opened.length === 2) {
      this.lock = true;
      this.moves++;
      const [a, b] = this.opened;

      if (this.cards[a].emoji === this.cards[b].emoji) {
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const points = 100 * (1 + Math.floor(this.combo / 2) * 0.5);
        
        setTimeout(() => {
          this.cards[a].matched = true;
          this.cards[b].matched = true;
          this.cards[a].pulseAnim = 1;
          this.cards[b].pulseAnim = 1;
          this.matched++;
          this.score += points;
          
          AudioEngine.win();
          Haptics.success();
          Camera.add(0.15);

          const ax = this.gridX + (a % 4) * this.cellSize + this.cellSize / 2;
          const ay = this.gridY + Math.floor(a / 4) * this.cellSize + this.cellSize / 2;
          const bx = this.gridX + (b % 4) * this.cellSize + this.cellSize / 2;
          const by = this.gridY + Math.floor(b / 4) * this.cellSize + this.cellSize / 2;
          
          Particles.burst(ax, ay, 20, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });
          Particles.burst(bx, by, 20, { color: '#2bff88', minSpeed: 80, maxSpeed: 250, gravity: 300 });

          this.opened = [];
          this.lock = false;
          this.updateHud();
          
          if (this.matched === 8) this.gameOver(true);
        }, 500);
      } else {
        this.combo = 0;
        this.score = Math.max(0, this.score - 15);
        this.cards[a].errorAnim = 1;
        this.cards[b].errorAnim = 1;
        
        AudioEngine.hit();
        Haptics.heavy();
        Camera.add(0.3);

        setTimeout(() => {
          this.cards[a].flipped = false;
          this.cards[b].flipped = false;
          this.cards[a].errorAnim = 0;
          this.cards[b].errorAnim = 0;
          this.opened = [];
          this.lock = false;
          this.updateHud();
        }, 900);
      }
    }
  }

  gameOver(win) {
    this.state = win ? 'won' : 'dead';
    if (win) {
      const timeBonus = Math.max(0, 1000 - Math.floor(this.timeElapsed) * 10);
      const comboBonus = this.bestCombo * 50;
      this.score += timeBonus + comboBonus;
      
      AudioEngine.win();
      Haptics.success();
      Camera.add(0.8);
      
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          Particles.burst(this.w / 2, this.h / 2, 30, { color: '#ffc531', minSpeed: 150, maxSpeed: 500, gravity: 300 });
        }, i * 200);
      }
    } else {
      AudioEngine.lose();
      Haptics.heavy();
    }
    
    setTimeout(() => App.gameOver('memory', this.score, { 
      time: Math.floor(this.timeElapsed), 
      combo: this.bestCombo 
    }), 1000);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    if (this.state === 'playing') {
      this.timeElapsed = (performance.now() - this.startTime) / 1000;
      this.updateHud();
      
      if (this.revealTimer > 0) {
        this.revealTimer -= dt;
        if (this.revealTimer <= 0) {
          this.cards.forEach(c => { if (!c.matched) c.flipped = false; });
          this.lock = false;
          AudioEngine.tone(400, 0.2, 'triangle', 0.1);
        }
      }
    }

    for (const c of this.cards) {
      if (c.flipAnim > 0) c.flipAnim = Math.max(0, c.flipAnim - dt * 4);
      if (c.pulseAnim > 0) c.pulseAnim = Math.max(0, c.pulseAnim - dt * 3);
      if (c.errorAnim > 0) c.errorAnim = Math.max(0, c.errorAnim - dt * 2);
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

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    for (let i = 0; i < 16; i++) {
      const c = this.cards[i];
      const x = this.gridX + (i % 4) * this.cellSize + 4;
      const y = this.gridY + Math.floor(i / 4) * this.cellSize + 4;
      const w = this.cellSize - 8;
      
      let scaleX = 1;
      let scaleY = 1;
      
      if (c.flipAnim > 0) {
        scaleX = Math.abs(Math.cos(c.flipAnim * Math.PI));
      }
      if (c.pulseAnim > 0) {
        const s = 1 + Math.sin(c.pulseAnim * Math.PI) * 0.15;
        scaleX *= s;
        scaleY *= s;
      }
      if (c.errorAnim > 0) {
        x += Math.sin(c.errorAnim * 50) * 5;
      }

      ctx.save();
      ctx.translate(x + w / 2, y + w / 2);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-x - w / 2, -y - w / 2);

      if (c.matched) {
        ctx.fillStyle = 'rgba(43,255,136,0.15)';
        ctx.shadowColor = '#2bff88';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
        else ctx.rect(x, y, w, w);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#2bff88';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (c.errorAnim > 0) {
        ctx.fillStyle = 'rgba(255,45,120,0.15)';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
        else ctx.rect(x, y, w, w);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (c.flipped || c.flipAnim > 0.5) {
        ctx.fillStyle = 'rgba(0,229,255,0.15)';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
        else ctx.rect(x, y, w, w);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const g = ctx.createLinearGradient(x, y, x + w, y + w);
        g.addColorStop(0, '#111a2e');
        g.addColorStop(1, '#0c1120');
        ctx.fillStyle = g;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, w, 12);
        else ctx.rect(x, y, w, w);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,229,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0,229,255,0.4)';
        ctx.font = `bold ${w * 0.4}px Tahoma`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + w / 2, y + w / 2);
      }

      if (c.flipped || c.matched) {
        ctx.font = `${w * 0.55}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.emoji, x + w / 2, y + w / 2);
      }
      ctx.restore();
    }

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 32px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.fillText('MEMORY MATCH', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Tahoma';
    ctx.fillText('جفت‌های یکسان را پیدا کنید', this.w / 2, this.h / 2 + 50);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
  }
};
