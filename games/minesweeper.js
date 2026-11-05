Y - r.top;
      const c = Math.floor((x - this.gridX) / this.cellSize);
      const rr = Math.floor((y - this.gridY) / this.cellSize);
      
      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
        this.clickCell(rr, c, false);
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._ctx = e => {
      e.preventDefault();
      if (this.state !== 'playing') return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const c = Math.floor((x - this.gridX) / this.cellSize);
      const rr = Math.floor((y - this.gridY) / this.cellSize);
      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
        this.clickCell(rr, c, true);
      }
    };
    this.canvas.addEventListener('contextmenu', this._ctx);

    this.longPressTimer = null;
    this._down = e => {
      if (this.state !== 'playing') return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const c = Math.floor((x - this.gridX) / this.cellSize);
      const rr = Math.floor((y - this.gridY) / this.cellSize);
      
      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
        this.longPressTimer = setTimeout(() => {
          this.clickCell(rr, c, true);
          Haptics.medium();
          this.longPressTimer = null;
        }, 400);
      }
    };
    this._up = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointerup', this._up);
  }

  startGame() {
    this.state = 'playing';
    this.board = [];
    this.minesCount = 10;
    this.flagged = 0;
    this.revealed = 0;
    this.explosionAnim = 0;

    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ mine: false, revealed: false, flagged: false, adj: 0, anim: 0 });
      }
      this.board.push(row);
    }

    let placed = 0;
    while (placed < this.minesCount) {
      const r = randInt(0, this.rows - 1);
      const c = randInt(0, this.cols - 1);
      if (!this.board[r][c].mine) {
        this.board[r][c].mine = true;
        placed++;
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].mine) count++;
          }
        }
        this.board[r][c].adj = count;
      }
    }
    this.updateHud();
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">🚩 <b>${this.minesCount - this.flagged}</b></div><div class="hud-pill">کشف <b>${this.revealed}/${this.rows * this.cols - this.minesCount}</b></div>`);
  }

  clickCell(r, c, isFlag) {
    const cell = this.board[r][c];
    if (cell.revealed) return;

    if (isFlag) {
      if (!cell.flagged && this.flagged < this.minesCount) {
        cell.flagged = true;
        this.flagged++;
        AudioEngine.tone(600, 0.05, 'square', 0.1);
        Haptics.light();
      } else if (cell.flagged) {
        cell.flagged = false;
        this.flagged--;
        AudioEngine.tone(300, 0.05, 'square', 0.1);
      }
      this.updateHud();
      return;
    }

    if (cell.flagged) return;

    if (cell.mine) {
      cell.revealed = true;
      this.state = 'dead';
      this.explosionAnim = 0.5;
      AudioEngine.hit();
      AudioEngine.lose();
      Haptics.heavy();
      Camera.add(1.5);
      
      const hx = this.gridX + c * this.cellSize + this.cellSize / 2;
      const hy = this.gridY + r * this.cellSize + this.cellSize / 2;
      Particles.burst(hx, hy, 60, { color: '#ff2d78', minSpeed: 200, maxSpeed: 600, gravity: 800 });
      
      for (let rr = 0; rr < this.rows; rr++) {
        for (let cc = 0; cc < this.cols; cc++) {
          if (this.board[rr][cc].mine && !this.board[rr][cc].revealed) this.board[rr][cc].revealed = true;
        }
      }
      setTimeout(() => App.gameOver('minesweeper', 0, { result: 'باختی' }), 1200);
      return;
    }

    this.floodFill(r, c);

    if (this.revealed === this.rows * this.cols - this.minesCount) {
      this.state = 'won';
      AudioEngine.win();
      Haptics.success();
      Camera.add(0.5);
      setTimeout(() => App.gameOver('minesweeper', (this.rows * this.cols - this.minesCount) * 50, { result: 'بردی' }), 800);
    }
    this.updateHud();
  }

  floodFill(r, c) {
    const stack = [{ r, c }];
    while (stack.length > 0) {
      const { r, c } = stack.pop();
      const cell = this.board[r][c];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      
      cell.revealed = true;
      cell.anim = 1;
      this.revealed++;
      AudioEngine.tone(600 + cell.adj * 60, 0.04, 'sine', 0.05);
      
      if (cell.adj === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this.board[nr][nc].revealed) {
              stack.push({ r: nr, c: nc });
            }
          }
        }
      }
    }
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
    if (this.explosionAnim > 0) this.explosionAnim -= dt;
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c].anim > 0) this.board[r][c].anim = Math.max(0, this.board[r][c].anim - dt * 5);
      }
    }
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

    ctx.fillStyle = 'rgba(0,229,255,0.04)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12, 12);
    else ctx.rect(this.gridX - 6, this.gridY - 6, this.gridW + 12, this.gridH + 12);
    ctx.fill();

    const colors = ['', '#00e5ff', '#2bff88', '#ffc531', '#ff7a00', '#ff2d78', '#a855f7', '#fff', '#ff0055'];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.board[r][c];
        const x = this.gridX + c * this.cellSize + 2;
        const y = this.gridY + r * this.cellSize + 2;
        const w = this.cellSize - 4;
        
        const scale = 1 + Math.sin(cell.anim * Math.PI) * 0.1;
        
        ctx.save();
        ctx.translate(x + w / 2, y + w / 2);
        ctx.scale(scale, scale);
        ctx.translate(-x - w / 2, -y - w / 2);

        if (cell.revealed) {
          if (cell.mine) {
            ctx.fillStyle = 'rgba(255,0,85,0.3)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
            else ctx.rect(x, y, w, w);
            ctx.fill();
            ctx.font = `${w * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', x + w / 2, y + w / 2);
          } else {
            ctx.fillStyle = 'rgba(0,229,255,0.05)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
            else ctx.rect(x, y, w, w);
            ctx.fill();
            
            if (cell.adj > 0) {
              ctx.fillStyle = colors[cell.adj];
              ctx.font = `bold ${w * 0.5}px Tahoma`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(cell.adj, x + w / 2, y + w / 2);
            }
          }
        } else {
          const g = ctx.createLinearGradient(x, y, x + w, y + w);
          g.addColorStop(0, '#1a2a4a');
          g.addColorStop(1, '#0c1120');
          ctx.fillStyle = g;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
          else ctx.rect(x, y, w, w);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,229,255,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          if (cell.flagged) {
            ctx.font = `${w * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚩', x + w / 2, y + w / 2);
          }
        }
        ctx.restore();
      }
    }

    Particles.render(ctx);

    if (this.explosionAnim > 0) {
      ctx.fillStyle = `rgba(255,45,120,${this.explosionAnim * 0.6})`;
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    }

    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#ff2d78';
    ctx.font = 'bold 32px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 25;
    ctx.fillText('MINESWEEPER', this.w / 2, this.h / 2 - 50);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 10);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Tahoma';
    ctx.fillText('برای پرچم‌گذاری نگه دارید', this.w / 2, this.h / 2 + 40);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._ctx) this.canvas.removeEventListener('contextmenu', this._ctx);
    if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
    if (this._up) window.removeEventListener('pointerup', this._up);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
  }
};
