'use strict';

window.Game_2048 = class extends GameBase {
  constructor() {
    super();
    Particles.init(400);
    Input.bind(this.canvas);
    this.recalc();
    this.onResize = () => this.recalc();
    this.state = 'menu';
    this.bindInputs();
  }

  recalc() {
    const topOff = 60;
    const avail = Math.min(this.w - 40, this.h - topOff - 100);
    this.cellSize = Math.floor(avail / 4);
    this.gridW = 4 * this.cellSize;
    this.gridH = 4 * this.cellSize;
    this.gridX = (this.w - this.gridW) / 2;
    this.gridY = topOff + (this.h - topOff - 100 - this.gridH) / 2;
    this.gap = Math.max(6, this.cellSize * 0.08);
  }

  bindInputs() {
    this._touch = e => {
      e.preventDefault();
      if (this.state === 'menu' || this.state === 'dead' || this.state === 'won') {
        this.startGame();
      }
    };
    this.canvas.addEventListener('pointerdown', this._touch, { passive: false });

    this._key = e => {
      if (this.state === 'menu' && (e.key === ' ' || e.key === 'Enter')) {
        this.startGame();
        return;
      }
      if (this.state !== 'playing') return;
      
      const m = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down'
      };
      if (m[e.key]) {
        e.preventDefault();
        this.move(m[e.key]);
      }
    };
    window.addEventListener('keydown', this._key);

    this._start = null;
    this._down = e => { this._start = { x: e.clientX, y: e.clientY }; };
    this._up = e => {
      if (this.state !== 'playing' || !this._start) return;
      const dx = e.clientX - this._start.x;
      const dy = e.clientY - this._start.y;
      if (Math.abs(dx) < 25 && Math.abs(dy) < 25) { this._start = null; return; }
      if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 'right' : 'left');
      else this.move(dy > 0 ? 'down' : 'up');
      this._start = null;
    };
    this.canvas.addEventListener('pointerdown', this._down);
    this.canvas.addEventListener('pointerup', this._up);
  }

  startGame() {
    this.state = 'playing';
    this.board = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.tiles = []; 
    this.score = 0;
    this.won = false;
    this.moves = 0;
    this.animations = [];
    this.addTile();
    this.addTile();
    this.updateHud();
  }

  addTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) 
      for (let c = 0; c < 4; c++) 
        if (this.board[r][c] === 0) empty.push({ r, c });
        
    if (!empty.length) return;
    const spot = empty[randInt(0, empty.length - 1)];
    const val = Math.random() < 0.9 ? 2 : 4;
    this.board[spot.r][spot.c] = val;
    
    this.animations.push({
      r: spot.r, c: spot.c, val: val, type: 'spawn', progress: 0, duration: 0.2
    });
  }

  updateHud() {
    this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">حرکت ${this.moves}</div>`);
  }

  move(dir) {
    if (this.state !== 'playing') return;
    let moved = false;
    const b = this.board.map(r => r.slice());

    const merge = (line, r, c, dr, dc) => {
      const arr = line.filter(v => v !== 0);
      const out = [];
      for (let i = 0; i < arr.length; i++) {
        if (i < arr.length - 1 && arr[i] === arr[i + 1]) {
          const m = arr[i] * 2;
          out.push(m);
          this.score += m;
          i++;
          moved = true;
          
          const tr = r + out.length * dr;
          const tc = c + out.length * dc;
          this.animations.push({
            r: tr, c: tc, val: m, type: 'merge', progress: 0, duration: 0.3
          });
          
          AudioEngine.tone(500 + Math.log2(m) * 60, 0.1, 'triangle', 0.1);
          Haptics.light();
        } else {
          out.push(arr[i]);
        }
      }
      while (out.length < 4) out.push(0);
      return out;
    };

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = b[r].slice();
        if (dir === 'right') row.reverse();
        row = merge(row, r, dir === 'right' ? 3 : 0, 0, dir === 'right' ? -1 : 1);
        if (dir === 'right') row.reverse();
        if (row.join() !== b[r].join()) moved = true;
        b[r] = row;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let col = b.map(r => r[c]);
        if (dir === 'down') col.reverse();
        col = merge(col, dir === 'down' ? 3 : 0, c, dir === 'down' ? -1 : 1, 0);
        if (dir === 'down') col.reverse();
        for (let r = 0; r < 4; r++) {
          if (b[r][c] !== col[r]) moved = true;
          b[r][c] = col[r];
        }
      }
    }

    if (moved) {
      this.board = b;
      this.moves++;
      this.addTile();
      this.updateHud();
      
      if (this.checkWin() && !this.won) {
        this.won = true;
        AudioEngine.win();
        Haptics.success();
        Camera.add(0.5);
      }
      if (this.checkLose()) {
        this.gameOver(false);
      }
    }
  }

  checkWin() {
    for (const r of this.board) for (const v of r) if (v >= 2048) return true;
    return false;
  }

  checkLose() {
    for (let r = 0; r < 4; r++) 
      for (let c = 0; c < 4; c++) {
        if (this.board[r][c] === 0) return false;
        if (c < 3 && this.board[r][c] === this.board[r][c + 1]) return false;
        if (r < 3 && this.board[r][c] === this.board[r + 1][c]) return false;
      }
    return true;
  }

  gameOver(win) {
    this.state = win ? 'won' : 'dead';
    AudioEngine[win ? 'win' : 'lose']();
    Haptics[win ? 'success' : 'heavy']();
    Camera.add(win ? 0.5 : 1);
    setTimeout(() => App.gameOver('2048', this.score, { moves: this.moves }), 600);
  }

  update(dt) {
    Particles.update(dt);
    Camera.update(dt);

    for (let i = this.animations.length - 1; i >= 0; i--) {
      this.animations[i].progress += dt;
      if (this.animations[i].progress >= this.animations[i].duration) {
        if (this.animations[i].type === 'merge') {
          const x = this.gridX + this.animations[i].c * (this.cellSize + this.gap * 0.5) + this.cellSize / 2;
          const y = this.gridY + this.animations[i].r * (this.cellSize + this.gap * 0.5) + this.cellSize / 2;
          Particles.burst(x, y, 10, { color: '#ffc531', minSpeed: 60, maxSpeed: 200, gravity: 300 });
        }
        this.animations.splice(i, 1);
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
    if (ctx.roundRect) ctx.roundRect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16, 16);
    else ctx.rect(this.gridX - 8, this.gridY - 8, this.gridW + 16, this.gridH + 16);
    ctx.fill();

    const colors = {
      2: '#1a2a4a', 4: '#1f3a5a', 8: '#2a5a6a', 16: '#2a7a6a', 32: '#3a9a5a',
      64: '#5aba3a', 128: '#9aca2a', 256: '#daca2a', 512: '#eaaa2a', 1024: '#ea7a2a', 2048: '#ea3a5a'
    };

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = this.gridX + c * (this.cellSize + this.gap * 0.5);
        const y = this.gridY + r * (this.cellSize + this.gap * 0.5);
        const v = this.board[r][c];

        ctx.fillStyle = v === 0 ? 'rgba(255,255,255,0.04)' : (colors[v] || '#ff2d78');
        
        let scale = 1;
        const anim = this.animations.find(a => a.r === r && a.c === c);
        if (anim) {
          if (anim.type === 'spawn') scale = anim.progress / anim.duration;
          else if (anim.type === 'merge') {
            const t = anim.progress / anim.duration;
            scale = 1 + Math.sin(t * Math.PI) * 0.2;
          }
        }

        ctx.save();
        ctx.translate(x + this.cellSize / 2, y + this.cellSize / 2);
        ctx.scale(scale, scale);
        ctx.translate(-x - this.cellSize / 2, -y - this.cellSize / 2);

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, this.cellSize, this.cellSize, 10);
        else ctx.rect(x, y, this.cellSize, this.cellSize);
        ctx.fill();
        
        if (v !== 0) {
          if (v >= 8) {
            ctx.shadowColor = colors[v];
            ctx.shadowBlur = 15;
          }
          ctx.fillStyle = v >= 8 ? '#fff' : '#c5cee0';
          ctx.font = `900 ${Math.max(16, this.cellSize * 0.35)}px Tahoma`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(v, x + this.cellSize / 2, y + this.cellSize / 2);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    }
    Particles.render(ctx);
    Camera.reset(ctx);
  }

  renderMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
    ctx.fillStyle = '#ffc531';
    ctx.font = 'bold 36px Tahoma';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffc531';
    ctx.shadowBlur = 25;
    ctx.fillText('2048 MERGE', this.w / 2, this.h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Tahoma';
    ctx.fillText('برای شروع ضربه بزن', this.w / 2, this.h / 2 + 20);
  }

  stop() {
    super.stop();
    if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    if (this._key) window.removeEventListener('keydown', this._key);
    if (this._down) this.canvas.removeEventListener('pointerdown', this._down);
    if (this._up) this.canvas.removeEventListener('pointerup', this._up);
  }
};
