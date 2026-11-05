 types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    this.bag = types.sort(() => Math.random() - 0.5);
  }

  getNextFromBag() {
    if (this.bag.length === 0) this.refillBag();
    return this.bag.pop();
  }

  spawnPiece() {
    const type = this.nextQueue.shift();
    this.nextQueue.push(this.getNextFromBag());
    const def = this.shapes[type];
    this.piece = {
      type, shape: def.shape.map(r => r.slice()), color: def.color,
      x: Math.floor((10 - def.shape[0].length) / 2), y: 0
    };
    this.canHold = true;
    if (this.collides(this.piece.shape, this.piece.x, this.piece.y)) this.gameOver();
  }

  holdPiece() {
    if (!this.canHold || this.state !== 'playing') return;
    const currentType = this.piece.type;
    if (this.hold) {
      const temp = this.hold;
      this.hold = currentType;
      const def = this.shapes[temp];
      this.piece = { type: temp, shape: def.shape.map(r => r.slice()), color: def.color, x: Math.floor((10 - def.shape[0].length) / 2), y: 0 };
    } else {
      this.hold = currentType;
      this.spawnPiece();
    }
    this.canHold = false;
    AudioEngine.tone(600, 0.1, 'sine', 0.1);
  }

  collides(shape, px, py) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = px + c, y = py + r;
        if (x < 0 || x >= 10 || y >= 20) return true;
        if (y >= 0 && this.board[y][x]) return true;
      }
    }
    return false;
  }

  move(dx) {
    if (!this.collides(this.piece.shape, this.piece.x + dx, this.piece.y)) {
      this.piece.x += dx;
      AudioEngine.tone(300, 0.03, 'sine', 0.05);
    }
  }

  rotate() {
    const s = this.piece.shape;
    const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!this.collides(rotated, this.piece.x + k, this.piece.y)) {
        this.piece.shape = rotated;
        this.piece.x += k;
        AudioEngine.tone(500, 0.04, 'sine', 0.08);
        return;
      }
    }
  }

  hardDrop() {
    let d = 0;
    while (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) {
      this.piece.y++; d++;
    }
    this.score += d * 2;
    AudioEngine.tone(200, 0.1, 'square', 0.1);
    Haptics.medium();
    
    for (let r = 0; r < this.piece.shape.length; r++) {
      for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (this.piece.shape[r][c]) {
          this.dropTrail.push({ x: this.boardX + (this.piece.x + c) * this.cell, y: this.boardY + (this.piece.y + r) * this.cell, life: 0.3 });
        }
      }
    }
    this.lockPiece();
  }

  softDropStep() {
    if (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) this.piece.y++;
    else this.lockPiece();
  }

  lockPiece() {
    for (let r = 0; r < this.piece.shape.length; r++) {
      for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (this.piece.shape[r][c]) {
          const x = this.piece.x + c, y = this.piece.y + r;
          if (y >= 0) this.board[y][x] = this.piece.color;
        }
      }
    }
    this.piece = null;
    this.checkLines();
    if (this.state === 'playing') this.spawnPiece();
  }

  checkLines() {
    const fullRows = [];
    for (let r = 0; r < 20; r++) {
      if (this.board[r].every(c => c)) fullRows.push(r);
    }
    if (fullRows.length === 0) { this.combo = 0; return; }
    this.clearing = fullRows;
    this.clearTimer = 0.3;
    AudioEngine.lineClear();
    Haptics.success();
    Camera.add(0.3);

    const pts = [0, 100, 300, 500, 800][fullRows.length] || 800;
    this.score += pts * this.level;
    this.lines += fullRows.length;
    this.combo++;

    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.dropInterval = Math.max(0.1, 0.8 - (this.level - 1) * 0.08);
    }
    this.updateHud();
  }

  applyClear() {
    for (const r of this.clearing) {
      for (let c = 0; c < 10; c++) {
        Particles.burst(this.boardX + c * this.cell + this.cell / 2, this.boardY + r * this.cell + this.cell / 2, 10, { color: this.board[r][c], minSpeed: 80, maxSpeed: 300, gravity: 400 });
      }
    }
    this.clearing.sort((a, b) => a - b);
    for (const r of this.clearing) {
      this.board.splice(r, 1);
      this.board.unshift(Array(10).fill(0));
    }
    this.clearing = [];
    this.clearTimer = 0;
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">خط ${this.lines} · سطح ${this.level}</div>`);
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    Camera.add(1.5);
    setTimeout(() => App.gameOver('tetris', this.score, { lines: this.lines, level: this.level }), 600);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    
    for (let i = this.dropTrail.length - 1; i >= 0; i--) {
      this.dropTrail[i].life -= dt;
      if (this.dropTrail[i].life <= 0) this.dropTrail.splice(i, 1);
    }

    if (this.state !== 'playing') return;
    if (this.clearing.length > 0) {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.applyClear();
      return;
    }
    this.dropTimer += dt;
    const interval = this.softDrop ? 0.05 : this.dropInterval;
    if (this.dropTimer >= interval) { this.dropTimer = 0; this.softDropStep(); }
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    ctx.fillStyle = '#05070d';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 32px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('NEON TETRIS', this.w / 2, this.h / 2 - 30);
      ctx.fillStyle = '#fff'; ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx); return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.boardX - 4, this.boardY - 4, this.gridW + 8, this.gridH + 8);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(this.boardX - 4, this.boardY - 4, this.gridW + 8, this.gridH + 8);

    for (const t of this.dropTrail) {
      ctx.fillStyle = `rgba(255,255,255,${t.life * 3})`;
      ctx.fillRect(t.x, t.y, this.cell, this.cell);
    }

    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const x = this.boardX + c * this.cell, y = this.boardY + r * this.cell;
        if (this.board[r][c]) this.drawCell(ctx, x, y, this.board[r][c]);
        else {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);
        }
      }
    }

    for (const r of this.clearing) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
      ctx.fillRect(this.boardX, this.boardY + r * this.cell, this.gridW, this.cell);
    }

    if (this.piece) {
      let ghostY = this.piece.y;
      while (!this.collides(this.piece.shape, this.piece.x, ghostY + 1)) ghostY++;
      
      for (let r = 0; r < this.piece.shape.length; r++) {
        for (let c = 0; c < this.piece.shape[r].length; c++) {
          if (this.piece.shape[r][c]) {
            const gx = this.boardX + (this.piece.x + c) * this.cell, gy = this.boardY + (ghostY + r) * this.cell;
            ctx.strokeStyle = this.piece.color; ctx.lineWidth = 2;
            ctx.strokeRect(gx + 2, gy + 2, this.cell - 4, this.cell - 4);
          }
        }
      }
      for (let r = 0; r < this.piece.shape.length; r++) {
        for (let c = 0; c < this.piece.shape[r].length; c++) {
          if (this.piece.shape[r][c]) {
            const x = this.boardX + (this.piece.x + c) * this.cell, y = this.boardY + (this.piece.y + r) * this.cell;
            this.drawCell(ctx, x, y, this.piece.color);
          }
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const type = this.nextQueue[i], def = this.shapes[type];
      const nx = this.nextX, ny = this.nextY + i * this.cell * 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(nx, ny, this.cell * 4, this.cell * 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.strokeRect(nx, ny, this.cell * 4, this.cell * 4);
      
      const ox = nx + (this.cell * 4 - def.shape[0].length * this.cell) / 2;
      const oy = ny + (this.cell * 4 - def.shape.length * this.cell) / 2;
      for (let r = 0; r < def.shape.length; r++) {
        for (let c = 0; c < def.shape[r].length; c++) {
          if (def.shape[r][c]) this.drawCell(ctx, ox + c * this.cell, oy + r * this.cell, def.color);
        }
      }
    }

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  drawCell(ctx, x, y, color) {
    const grad = ctx.createLinearGradient(x, y, x + this.cell, y + this.cell);
    grad.addColorStop(0, this.lighten(color, 40));
    grad.addColorStop(1, this.darken(color, 40));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
  }

  lighten(hex, amt) {
    const h = hex.replace('#', '');
    return '#' + [0, 2, 4].map(i => Math.min(255, parseInt(h.substr(i, 2), 16) + amt).toString(16).padStart(2, '0')).join('');
  }

  darken(hex, amt) {
    const h = hex.replace('#', '');
    return '#' + [0, 2, 4].map(i => Math.max(0, parseInt(h.substr(i, 2), 16) - amt).toString(16).padStart(2, '0')).join('');
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
    if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
    if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
    if (this._up) this.canvas.removeEventListener('pointerup', this._up);
  }
};
