h * cell;
        const h = p.shape.length * cell;
        this.dragging = { index: i, shape: p.shape, color: p.color, cell, w, h, x: x - w / 2, y: y - h / 2 };
        AudioEngine.tone(500, 0.05, 'sine', 0.1);
        Haptics.light();
        return;
      }
    }
  }

  updatePreview() {
    if (!this.dragging) { this.preview = null; return; }
    const d = this.dragging;
    const gc = Math.round((d.x - this.gridX) / this.cellSize);
    const gr = Math.round((d.y - this.gridY) / this.cellSize);
    
    if (gc < 0 || gr < 0 || gc + d.shape[0].length > 8 || gr + d.shape.length > 8) {
      this.preview = null;
      return;
    }

    for (let r = 0; r < d.shape.length; r++) {
      for (let c = 0; c < d.shape[r].length; c++) {
        if (d.shape[r][c] && this.grid[gr + r][gc + c]) {
          this.preview = null;
          return;
        }
      }
    }
    this.preview = { row: gr, col: gc, shape: d.shape, color: d.color };
  }

  drop() {
    if (!this.dragging) { this.preview = null; return; }
    const d = this.dragging;

    if (this.preview) {
      for (let r = 0; r < d.shape.length; r++) {
        for (let c = 0; c < d.shape[r].length; c++) {
          if (d.shape[r][c]) this.grid[this.preview.row + r][this.preview.col + c] = d.color;
        }
      }
      this.score += 10;
      this.pieces[d.index].used = true;
      AudioEngine.tone(700, 0.08, 'sine', 0.12);
      Haptics.medium();
      
      for (let r = 0; r < d.shape.length; r++) {
        for (let c = 0; c < d.shape[r].length; c++) {
          if (d.shape[r][c]) {
            const x = this.gridX + (this.preview.col + c) * this.cellSize + this.cellSize / 2;
            const y = this.gridY + (this.preview.row + r) * this.cellSize + this.cellSize / 2;
            Particles.burst(x, y, 4, { color: d.color, minSpeed: 30, maxSpeed: 100, gravity: 300 });
          }
        }
      }

      this.checkClears();
      if (this.pieces.every(p => p.used)) this.generatePieces();
      if (this.isGameOver()) this.gameOver();
    } else {
      AudioEngine.tone(200, 0.1, 'sawtooth', 0.08);
      Haptics.light();
    }
    this.dragging = null;
    this.preview = null;
    this.updateHud();
  }

  checkClears() {
    const rows = [], cols = [];
    for (let r = 0; r < 8; r++) if (this.grid[r].every(c => c)) rows.push(r);
    for (let c = 0; c < 8; c++) {
      let full = true;
      for (let r = 0; r < 8; r++) if (!this.grid[r][c]) { full = false; break; }
      if (full) cols.push(c);
    }

    const total = rows.length + cols.length;
    if (total > 0) {
      this.combo++;
      const pts = total * 100 * this.combo;
      this.score += pts;
      this.linesCleared += total;
      
      AudioEngine.win();
      Haptics.success();
      Camera.add(0.4);
      this.shakeTimer = 0.3;

      for (const r of rows) {
        for (let c = 0; c < 8; c++) {
          const x = this.gridX + c * this.cellSize + this.cellSize / 2;
          const y = this.gridY + r * this.cellSize + this.cellSize / 2;
          Particles.burst(x, y, 8, { color: this.grid[r][c], minSpeed: 80, maxSpeed: 250, gravity: 400 });
        }
      }
      for (const c of cols) {
        for (let r = 0; r < 8; r++) {
          const x = this.gridX + c * this.cellSize + this.cellSize / 2;
          const y = this.gridY + r * this.cellSize + this.cellSize / 2;
          Particles.burst(x, y, 8, { color: this.grid[r][c], minSpeed: 80, maxSpeed: 250, gravity: 400 });
        }
      }

      for (const r of rows) for (let c = 0; c < 8; c++) this.grid[r][c] = 0;
      for (const c of cols) for (let r = 0; r < 8; r++) this.grid[r][c] = 0;

      this.floatingTexts.push({
        x: this.gridX + this.gridW / 2,
        y: this.gridY + this.gridH / 2,
        text: '+' + pts,
        sub: this.combo > 1 ? 'کمبو ×' + this.combo : '',
        life: 1.5, max: 1.5
      });
    } else {
      this.combo = 0;
    }
  }

  isGameOver() {
    for (const p of this.pieces) {
      if (p.used) continue;
      if (this.canPlace(p.shape)) return false;
    }
    return true;
  }

  canPlace(shape) {
    const rows = shape.length, cols = shape[0].length;
    for (let r = 0; r <= 8 - rows; r++) {
      for (let c = 0; c <= 8 - cols; c++) {
        let fits = true;
        for (let dr = 0; dr < rows; dr++) {
          for (let dc = 0; dc < cols; dc++) {
            if (shape[dr][dc] && this.grid[r + dr][c + dc]) { fits = false; break; }
          }
          if (!fits) break;
        }
        if (fits) return true;
      }
    }
    return false;
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    Camera.add(1);
    setTimeout(() => App.gameOver('blocks', this.score, { lines: this.linesCleared }), 600);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    for (const ft of this.floatingTexts) { ft.life -= dt; ft.y -= dt * 50; }
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    ctx.fillStyle = '#05070d';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      this.renderMenu(ctx);
      Camera.reset(ctx);
      return;
    }

    const pulse = this.shakeTimer > 0 ? 1 + Math.sin(this.shakeTimer * 50) * 0.02 : 1;
    ctx.save();
    ctx.translate(this.gridX + this.gridW/2, this.gridY + this.gridH/2);
    ctx.scale(pulse, pulse);
    ctx.translate(-this.gridX - this.gridW/2, -this.gridY - this.gridH/2);

    ctx.fillStyle = 'rgba(0,229,255,0.04)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16, 16);
    else ctx.rect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16);
    ctx.fill();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = this.gridX + c * this.cellSize, y = this.gridY + r * this.cellSize;
        ctx.strokeStyle = 'rgba(0,229,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
        if (this.grid[r][c]) this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.grid[r][c]);
      }
    }
    ctx.restore();

    if (this.preview) {
      for (let r = 0; r < this.preview.shape.length; r++) {
        for (let c = 0; c < this.preview.shape[r].length; c++) {
          if (this.preview.shape[r][c]) {
            const x = this.gridX + (this.preview.col + c) * this.cellSize;
            const y = this.gridY + (this.preview.row + r) * this.cellSize;
            ctx.globalAlpha = 0.4;
            this.drawBlock(ctx, x + 2, y + 2, this.cellSize - 4, this.preview.color);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    for (const p of this.pieces) {
      if (!p || p.used) continue;
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (p.shape[r][c]) {
            const x = p.trayX + c * p.baseCell, y = p.trayY + r * p.baseCell;
            this.drawBlock(ctx, x + 1, y + 1, p.baseCell - 2, p.color);
          }
        }
      }
    }

    if (this.dragging) {
      const d = this.dragging;
      for (let r = 0; r < d.shape.length; r++) {
        for (let c = 0; c < d.shape[r].length; c++) {
          if (d.shape[r][c]) {
            const x = d.x + c * d.cell, y = d.y + r * d.cell;
            this.drawBlock(ctx, x + 1, y + 1, d.cell - 2, d.color, 1.3);
          }
        }
      }
    }

    Particles.render(ctx);

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life / ft.max * 1.5);
      ctx.fillStyle = '#ffc531';
      ctx.font = 'bold 34px Tahoma';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffc531';
      ctx.shadowBlur = 20;
      ctx.fillText(ft.text, ft.x, ft.y);
      if (ft.sub) {
        ctx.font = 'bold 18px Tahoma';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText(ft.sub, ft.x, ft.y + 30);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

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
    ctx.fillText('BLOCK PUZZLE', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
  }

  drawBlock(ctx, x, y, size, color, scale) {
    const s = scale || 1;
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, this.lighten(color, 30 * s));
    g.addColorStop(1, this.darken(color, 40 * s));
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, Math.max(4, size * 0.15));
    else ctx.rect(x, y, size, size);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + size * 0.15, y + size * 0.1, size * 0.7, size * 0.12);
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
    if (this._move) this.canvas.removeEventListener('pointermove', this._move);
    if (this._up) {
      window.removeEventListener('pointerup', this._up);
      window.removeEventListener('pointercancel', this._up);
    }
  }
};
