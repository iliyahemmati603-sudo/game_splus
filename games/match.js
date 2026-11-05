'use strict';

window.Game_match3 = class extends GameBase {
  constructor() {
    super();
    Particles.init(300);
    Input.bind(this.canvas);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'menu';
    this.bindInputs();
  }

  recalc() {
    this.cols = 8;
    this.rows = 8;
    const topOff = 60;
    const avail = Math.min(this.w - 20, this.h - topOff - 80);
    this.cellSize = Math.floor(avail / 8);
    this.gridW = this.cols * this.cellSize;
    this.gridH = this.rows * this.cellSize;
    this.gridX = (this.w - this.gridW) / 2;
    this.gridY = topOff + (this.h - topOff - 80 - this.gridH) / 2;
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
      if (this.state !== 'playing' || this.lock) return;

      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const c = Math.floor((x - this.gridX) / this.cellSize);
      const rr = Math.floor((y - this.gridY) / this.cellSize);

      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) {
        this.handleClick(rr, c);
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.moves = 30;
    this.lock = true;
    this.selected = null;
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    
    const colors = [1, 2, 3, 4, 5];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let color;
        do {
          color = colors[randInt(0, colors.length - 1)];
        } while (
          (c >= 2 && this.board[r][c - 1] === color && this.board[r][c - 2] === color) ||
          (r >= 2 && this.board[r - 1][c] === color && this.board[r - 2][c] === color)
        );
        this.board[r][c] = color;
      }
    }
    this.updateHud();
    this.lock = false;
  }

  handleClick(r, c) {
    if (!this.selected) {
      this.selected = { r, c };
      AudioEngine.tone(600, 0.05, 'sine', 0.1);
    } else {
      const dr = Math.abs(this.selected.r - r);
      const dc = Math.abs(this.selected.c - c);
      
      if (dr + dc === 1) {
        this.swap(this.selected.r, this.selected.c, r, c);
        this.selected = null;
      } else if (dr === 0 && dc === 0) {
        this.selected = null;
      } else {
        this.selected = { r, c };
      }
    }
  }

  swap(r1, c1, r2, c2) {
    this.lock = true;
    const temp = this.board[r1][c1];
    this.board[r1][c1] = this.board[r2][c2];
    this.board[r2][c2] = temp;

    AudioEngine.tone(400, 0.05, 'sine', 0.1);
    
    if (this.checkMatches()) {
      this.moves--;
      this.updateHud();
      setTimeout(() => this.processMatches(), 300);
    } else {
      setTimeout(() => {
        const temp2 = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp2;
        AudioEngine.tone(200, 0.1, 'sawtooth', 0.1);
        Haptics.light();
        this.lock = false;
      }, 300);
    }
  }

  checkMatches() {
    let found = false;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        if (this.board[r][c] && this.board[r][c] === this.board[r][c + 1] && this.board[r][c] === this.board[r][c + 2]) {
          found = true;
        }
      }
    }
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) {
          found = true;
        }
      }
    }
    return found;
  }

  processMatches() {
    let matched = false;
    const toClear = new Set();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        if (this.board[r][c] && this.board[r][c] === this.board[r][c + 1] && this.board[r][c] === this.board[r][c + 2]) {
          toClear.add(r + ',' + c);
          toClear.add(r + ',' + (c + 1));
          toClear.add(r + ',' + (c + 2));
          matched = true;
        }
      }
    }
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        if (this.board[r][c] && this.board[r][c] === this.board[r + 1][c] && this.board[r][c] === this.board[r + 2][c]) {
          toClear.add(r + ',' + c);
          toClear.add((r + 1) + ',' + c);
          toClear.add((r + 2) + ',' + c);
          matched = true;
        }
      }
    }

    if (matched) {
      this.score += toClear.size * 10;
      AudioEngine.coin();
      Haptics.medium();
      Camera.add(0.1);
      this.updateHud();

      toClear.forEach(pos => {
        const [r, c] = pos.split(',').map(Number);
        const x = this.gridX + c * this.cellSize + this.cellSize / 2;
        const y = this.gridY + r * this.cellSize + this.cellSize / 2;
        Particles.burst(x, y, 5, { color: this.getColor(this.board[r][c]), minSpeed: 50, maxSpeed: 150 });
        this.board[r][c] = 0;
      });

      this.applyGravity();
      setTimeout(() => this.processMatches(), 300);
    } else {
      this.lock = false;
      if (this.moves <= 0) this.gameOver();
    }
  }

  applyGravity() {
    for (let c = 0; c < this.cols; c++) {
      let empty = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.board[r][c] === 0) {
          empty++;
        } else if (empty > 0) {
          this.board[r + empty][c] = this.board[r][c];
          this.board[r][c] = 0;
        }
      }
      for (let r = empty - 1; r >= 0; r--) {
        this.board[r][c] = randInt(1, 5);
      }
    }
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">حرکت ${this.moves}</div>`);
  }

  gameOver() {
    this.state = 'dead';
    AudioEngine.lose();
    Haptics.heavy();
    setTimeout(() => App.gameOver('match3', this.score), 600);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);
  }

  getColor(id) {
    return ['#000', '#00e5ff', '#ff2d78', '#ffc531', '#2bff88', '#a855f7'][id] || '#fff';
  }

  render() {
    const ctx = this.ctx;
    Camera.apply(ctx);

    ctx.fillStyle = '#05070d';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 32px Tahoma';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 20;
      ctx.fillText('MATCH 3', this.w / 2, this.h / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '16px Tahoma';
      ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
      Camera.reset(ctx);
      return;
    }

    ctx.fillStyle = 'rgba(0,229,255,0.04)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(this.gridX - 4, this.gridY - 4, this.gridW + 8, this.gridH + 8, 12);
    else ctx.rect(this.gridX - 4, this.gridY - 4, this.gridW + 8, this.gridH + 8);
    ctx.fill();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.board[r][c];
        if (val === 0) continue;

        const x = this.gridX + c * this.cellSize + 3;
        const y = this.gridY + r * this.cellSize + 3;
        const w = this.cellSize - 6;

        const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
        
        ctx.fillStyle = this.getColor(val);
        if (isSelected) {
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 20;
        } else {
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
        }

        ctx.beginPath();
        if (val === 1) {
          ctx.arc(x + w/2, y + w/2, w/2, 0, 6.28);
        } else if (val === 2) {
          if (ctx.roundRect) ctx.roundRect(x, y, w, w, 8);
          else ctx.rect(x, y, w, w);
        } else if (val === 3) {
          ctx.moveTo(x + w/2, y);
          ctx.lineTo(x + w, y + w/2);
          ctx.lineTo(x + w/2, y + w);
          ctx.lineTo(x, y + w/2);
          ctx.closePath();
        } else if (val === 4) {
          ctx.moveTo(x + w/2, y);
          ctx.lineTo(x + w, y + w);
          ctx.lineTo(x, y + w);
          ctx.closePath();
        } else {
          ctx.moveTo(x + w/2, y);
          ctx.lineTo(x + w, y + w/3);
          ctx.lineTo(x + w*0.8, y + w);
          ctx.lineTo(x + w*0.2, y + w);
          ctx.lineTo(x, y + w/3);
          ctx.closePath();
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    Particles.render(ctx);
    Camera.reset(ctx);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
  }
};
