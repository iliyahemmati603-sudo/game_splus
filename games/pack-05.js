window.Game_clicker = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'playing';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        this.coreX = this.w / 2;
        this.coreY = this.h * 0.35;
        this.coreR = Math.min(this.w, this.h) * 0.16;
        
        this.btnW = (this.w - 60) / 2;
        this.btnH = 80;
        this.btnY = this.h - 180;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;

            if (y >= this.btnY && y <= this.btnY + this.btnH) {
                if (x >= 30 && x <= 30 + this.btnW) this.buyClick();
                else if (x >= 30 + this.btnW + 20 && x <= this.w - 30) this.buyAuto();
                return;
            }

            const d = Math.hypot(x - this.coreX, y - this.coreY);
            if (d < this.coreR + 40) this.clickCore(x, y);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    start() {
        this.coins = 0;
        this.clickPower = 1;
        this.autoPower = 0;
        this.clickCost = 15;
        this.autoCost = 50;
        this.pulse = 0;
        this.floatingTexts = [];
        this.autoTimer = 0;
        this.updateHud();
    }

    clickCore(x, y) {
        this.coins += this.clickPower;
        this.pulse = 1;
        AudioEngine.tone(600 + Math.random() * 150, 0.05, 'sine', 0.1);
        Haptics.light();
        Camera.add(0.05);

        const colors = ['#00e5ff', '#ffc531', '#2bff88', '#ff2d78'];
        Particles.burst(x, y, 15, { color: colors[Math.floor(Math.random() * colors.length)], minSpeed: 100, maxSpeed: 300, gravity: 300 });

        this.floatingTexts.push({ x: x + rand(-20, 20), y: y - 20, text: '+' + this.clickPower, life: 1.2, max: 1.2, vy: -120 });
        this.updateHud();
    }

    buyClick() {
        if (this.coins < this.clickCost) { AudioEngine.tone(200, 0.1, 'sawtooth', 0.1); Haptics.heavy(); return; }
        this.coins -= this.clickCost;
        this.clickPower++;
        this.clickCost = Math.floor(this.clickCost * 1.6);
        AudioEngine.win(); Haptics.success(); Camera.add(0.3);
        Particles.burst(30 + this.btnW / 2, this.btnY + this.btnH / 2, 30, { color: '#00e5ff', minSpeed: 100, maxSpeed: 400 });
        this.updateHud();
    }

    buyAuto() {
        if (this.coins < this.autoCost) { AudioEngine.tone(200, 0.1, 'sawtooth', 0.1); Haptics.heavy(); return; }
        this.coins -= this.autoCost;
        this.autoPower++;
        this.autoCost = Math.floor(this.autoCost * 1.8);
        AudioEngine.win(); Haptics.success(); Camera.add(0.3);
        Particles.burst(30 + this.btnW + 20 + this.btnW / 2, this.btnY + this.btnH / 2, 30, { color: '#ff2d78', minSpeed: 100, maxSpeed: 400 });
        this.updateHud();
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">سکه <b>${Math.floor(this.coins)}</b></div><div class="hud-pill">💰 ${Math.floor(this.autoPower)}/s</div>`);
    }

    update(dt) {
        Particles.update(dt); Camera.update(dt);
        this.pulse = Math.max(0, this.pulse - dt * 6);

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt; ft.y += ft.vy * dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        if (this.autoPower > 0) {
            this.autoTimer += dt;
            if (this.autoTimer >= 0.1) {
                this.autoTimer = 0;
                this.coins += this.autoPower * 0.1;
                Particles.burst(this.coreX + rand(-this.coreR, this.coreR), this.coreY + rand(-this.coreR, this.coreR), 1, { color: '#ffc531', minSpeed: 20, maxSpeed: 80, gravity: -150 });
                this.updateHud();
            }
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
        bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        const scale = 1 + this.pulse * 0.15;
        ctx.save(); 
        ctx.translate(this.coreX, this.coreY); 
        ctx.scale(scale, scale);
        
        const cg = ctx.createRadialGradient(0, 0, 10, 0, 0, this.coreR);
        cg.addColorStop(0, '#fff'); 
        cg.addColorStop(0.3, '#00e5ff'); 
        cg.addColorStop(1, '#0088cc');
        ctx.fillStyle = cg; 
        ctx.shadowColor = '#00e5ff'; 
        ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.arc(0, 0, this.coreR, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#05070d'; 
        ctx.beginPath(); ctx.arc(0, 0, this.coreR * 0.75, 0, 6.28); ctx.fill();
        
        ctx.fillStyle = '#ffc531'; 
        ctx.font = `bold ${this.coreR * 0.45}px Tahoma`; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.fillText('💰', 0, 0);
        ctx.restore();

        Particles.render(ctx);

        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = ft.life / ft.max; 
            ctx.fillStyle = '#ffc531'; 
            ctx.font = 'bold 24px Tahoma'; 
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y); 
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = 'rgba(0,229,255,0.08)'; 
        ctx.strokeStyle = 'rgba(0,229,255,0.4)'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(30, this.btnY, this.btnW, this.btnH, 16); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 16px Tahoma'; ctx.textAlign = 'center';
        ctx.fillText('ارتقای کلیک', 30 + this.btnW / 2, this.btnY + 25);
        ctx.font = '14px Tahoma'; ctx.fillStyle = '#fff'; 
        ctx.fillText('توان: ' + this.clickPower, 30 + this.btnW / 2, this.btnY + 50);
        ctx.fillStyle = '#ffc531'; 
        ctx.fillText('قیمت: ' + this.clickCost, 30 + this.btnW / 2, this.btnY + 70);

        ctx.fillStyle = 'rgba(255,45,120,0.08)'; 
        ctx.strokeStyle = 'rgba(255,45,120,0.4)';
        ctx.beginPath(); ctx.roundRect(30 + this.btnW + 20, this.btnY, this.btnW, this.btnH, 16); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#ff2d78'; ctx.font = 'bold 16px Tahoma';
        ctx.fillText('کلیکر خودکار', 30 + this.btnW + 20 + this.btnW / 2, this.btnY + 25);
        ctx.font = '14px Tahoma'; ctx.fillStyle = '#fff'; 
        ctx.fillText('سرعت: ' + this.autoPower + '/s', 30 + this.btnW + 20 + this.btnW / 2, this.btnY + 50);
        ctx.fillStyle = '#ffc531'; 
        ctx.fillText('قیمت: ' + this.autoCost, 30 + this.btnW + 20 + this.btnW / 2, this.btnY + 70);

        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_tower = class extends GameBase {
    constructor() {
        super();
        Particles.init(600);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        this.path = [
            { x: 0, y: this.h * 0.25 }, 
            { x: this.w * 0.5, y: this.h * 0.25 },
            { x: this.w * 0.5, y: this.h * 0.75 }, 
            { x: this.w, y: this.h * 0.75 }
        ];
        this.pathLength = 0;
        for (let i = 0; i < this.path.length - 1; i++) {
            this.pathLength += dist(this.path[i].x, this.path[i].y, this.path[i+1].x, this.path[i+1].y);
        }
        
        this.btnW = 200;
        this.btnH = 60;
        this.btnX = (this.w - this.btnW) / 2;
        this.btnY = this.h - 90;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
            
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;

            if (this.placingTower) {
                if (y < this.btnY - 20) {
                    this.towers.push({ x, y, range: 110, dmg: 15, cooldown: 0, fireRate: 0.6 });
                    this.gold -= 50; 
                    this.placingTower = false; 
                    this.updateHud();
                    AudioEngine.win(); Haptics.success();
                }
                return;
            }

            if (x >= this.btnX && x <= this.btnX + this.btnW && y >= this.btnY && y <= this.btnY + this.btnH) {
                if (this.gold >= 50) this.placingTower = true;
                else { AudioEngine.tone(200, 0.1, 'sawtooth', 0.1); Haptics.heavy(); }
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.enemies = []; 
        this.towers = []; 
        this.bullets = [];
        this.gold = 150; 
        this.lives = 10; 
        this.wave = 1;
        this.spawnTimer = 0; 
        this.spawnInterval = 2.5; 
        this.spawnCount = 0; 
        this.enemiesThisWave = 5;
        this.placingTower = false;
        this.updateHud();
    }

    updateHud() { 
        this.setHud(`<div class="hud-pill">💰 ${this.gold}</div><div class="hud-pill">❤️ ${this.lives}</div><div class="hud-pill">موج ${this.wave}</div>`); 
    }

    getPathPos(progress) {
        let remain = progress;
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i], p2 = this.path[i+1], d = dist(p1.x, p1.y, p2.x, p2.y);
            if (remain <= d) {
                return { x: p1.x + (p2.x - p1.x) * (remain / d), y: p1.y + (p2.y - p1.y) * (remain / d) };
            }
            remain -= d;
        }
        return this.path[this.path.length - 1];
    }

    gameOver() { 
        this.state = 'dead'; 
        AudioEngine.lose(); 
        Haptics.heavy(); 
        Camera.add(2); 
        setTimeout(() => App.gameOver('tower', this.wave * 150), 1000); 
    }

    update(dt) {
        Particles.update(dt); 
        Camera.update(dt);
        if (this.state !== 'playing') return;

        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnInterval && this.spawnCount < this.enemiesThisWave) {
            this.spawnTimer = 0; 
            this.spawnCount++;
            this.enemies.push({ progress: 0, speed: 80 + this.wave * 15, hp: 20 + this.wave * 20, maxHp: 20 + this.wave * 20 });
        }

        if (this.spawnCount >= this.enemiesThisWave && this.enemies.length === 0) {
            this.wave++; 
            this.spawnCount = 0; 
            this.enemiesThisWave += 2; 
            this.gold += 75;
            this.updateHud(); 
            AudioEngine.win();
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.progress += e.speed * dt;
            if (e.progress >= this.pathLength) {
                this.enemies.splice(i, 1); 
                this.lives--; 
                this.updateHud(); 
                Camera.add(1); 
                Haptics.heavy();
                if (this.lives <= 0) return this.gameOver();
            }
        }

        for (const t of this.towers) {
            t.cooldown -= dt;
            if (t.cooldown <= 0) {
                let target = null, maxProg = -1;
                for (const e of this.enemies) {
                    const pos = this.getPathPos(e.progress);
                    if (dist(t.x, t.y, pos.x, pos.y) < t.range && e.progress > maxProg) { 
                        target = e; 
                        maxProg = e.progress; 
                    }
                }
                if (target) {
                    t.cooldown = t.fireRate;
                    const pos = this.getPathPos(target.progress);
                    this.bullets.push({ x: t.x, y: t.y, targetX: pos.x, targetY: pos.y, dmg: t.dmg, speed: 700 });
                    AudioEngine.tone(900, 0.05, 'square', 0.05);
                }
            }
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            const dx = b.targetX - b.x, dy = b.targetY - b.y, d = Math.hypot(dx, dy);
            if (d < 20) {
                this.bullets.splice(i, 1);
                for (const e of this.enemies) {
                    const pos = this.getPathPos(e.progress);
                    if (dist(pos.x, pos.y, b.targetX, b.targetY) < 30) {
                        e.hp -= b.dmg;
                        Particles.burst(b.targetX, b.targetY, 6, { color: '#ffc531', minSpeed: 50, maxSpeed: 150 });
                        if (e.hp <= 0) {
                            this.enemies.splice(this.enemies.indexOf(e), 1);
                            this.gold += 25; 
                            this.updateHud();
                            Particles.burst(pos.x, pos.y, 30, { color: '#ff2d78', minSpeed: 100, maxSpeed: 350 });
                            AudioEngine.hit(); 
                            Haptics.light(); 
                            Camera.add(0.1);
                        }
                        break;
                    }
                }
            } else { 
                b.x += (dx / d) * b.speed * dt; 
                b.y += (dy / d) * b.speed * dt; 
            }
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
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#2bff88'; 
            ctx.font = 'bold 40px Tahoma'; 
            ctx.textAlign = 'center';
            ctx.fillText('TOWER DEFENSE', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff'; 
            ctx.font = '20px Tahoma'; 
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); 
            return;
        }

        ctx.strokeStyle = 'rgba(0,229,255,0.12)'; 
        ctx.lineWidth = 50; 
        ctx.lineCap = 'round'; 
        ctx.lineJoin = 'round';
        ctx.beginPath(); 
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) ctx.lineTo(this.path[i].x, this.path[i].y);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(0,229,255,0.04)'; 
        ctx.lineWidth = 35; 
        ctx.stroke();

        for (const t of this.towers) {
            ctx.fillStyle = 'rgba(43,255,136,0.15)'; 
            ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, 6.28); ctx.fill();
            ctx.fillStyle = '#2bff88'; 
            ctx.shadowColor = '#2bff88'; 
            ctx.shadowBlur = 20; 
            ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, 6.28); ctx.fill(); 
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#04101a'; 
            ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, 6.28); ctx.fill();
        }

        for (const e of this.enemies) {
            const pos = this.getPathPos(e.progress);
            ctx.fillStyle = '#ff2d78'; 
            ctx.shadowColor = '#ff2d78'; 
            ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 16, 0, 6.28); ctx.fill(); 
            ctx.shadowBlur = 0;
            
            const ratio = e.hp / e.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
            ctx.fillRect(pos.x - 16, pos.y - 28, 32, 5);
            ctx.fillStyle = '#2bff88'; 
            ctx.fillRect(pos.x - 16, pos.y - 28, 32 * ratio, 5);
        }

        for (const b of this.bullets) {
            ctx.fillStyle = '#ffc531'; 
            ctx.shadowColor = '#ffc531'; 
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 6.28); ctx.fill(); 
            ctx.shadowBlur = 0;
        }

        Particles.render(ctx);

        if (this.placingTower) {
            ctx.fillStyle = 'rgba(43,255,136,0.15)'; 
            ctx.strokeStyle = '#2bff88'; 
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(Input.pointer.x, Input.pointer.y, 110, 0, 6.28); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#2bff88'; 
            ctx.beginPath(); ctx.arc(Input.pointer.x, Input.pointer.y, 20, 0, 6.28); ctx.fill();
        }

        ctx.fillStyle = this.gold >= 50 ? 'rgba(0,229,255,0.1)' : 'rgba(255,45,120,0.1)'; 
        ctx.strokeStyle = this.gold >= 50 ? 'rgba(0,229,255,0.5)' : 'rgba(255,45,120,0.5)'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(this.btnX, this.btnY, this.btnW, this.btnH, 16); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = this.gold >= 50 ? '#00e5ff' : '#ff2d78'; 
        ctx.font = 'bold 18px Tahoma'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.fillText('ساخت برج (50 💰)', this.w / 2, this.btnY + this.btnH / 2);

        Camera.reset(ctx);
    }

    stop() { 
        super.stop(); 
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); 
    }
};

window.Game_solitaire = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() { return null; }

    recalc() {
        const padding = 15, availW = this.w - padding * 2;
        this.cardW = Math.floor((availW - 6 * 10) / 7);
        this.cardH = Math.floor(this.cardW * 1.5);
        this.gapX = 10; 
        this.topY = 80; 
        this.tableauY = this.topY + this.cardH + 40;
        this.suits = ['♠', '♥', '♦', '♣'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'won') { this.startGame(); return; }
            if (this.state !== 'playing') return;
            
            const r = this.canvas.getBoundingClientRect();
            this.handleClick(e.clientX - r.left, e.clientY - r.top);
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.deck = []; this.stock = []; this.waste = [];
        this.foundations = [[], [], [], []]; 
        this.tableau = [[], [], [], [], [], [], []];
        this.selected = null; 
        this.score = 0; 
        this.moves = 0;

        for (let s = 0; s < 4; s++) {
            for (let r = 0; r < 13; r++) this.deck.push({ suit: s, rank: r, faceUp: false });
        }
        this.deck.sort(() => Math.random() - 0.5);

        let idx = 0;
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck[idx++];
                card.faceUp = (j === i);
                this.tableau[i].push(card);
            }
        }
        while (idx < this.deck.length) this.stock.push(this.deck[idx++]);
        this.updateHud();
    }

    updateHud() { 
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">حرکت ${this.moves}</div>`); 
    }

    handleClick(x, y) {
        if (this.selected) {
            if (this.tryMove(x, y)) { 
                this.selected = null; 
                this.moves++; 
                this.checkWin(); 
                this.updateHud(); 
                return; 
            }
            this.selected = null;
        }

        for (let i = 0; i < 7; i++) {
            const pile = this.tableau[i];
            for (let j = pile.length - 1; j >= 0; j--) {
                const card = pile[j];
                if (!card.faceUp) continue;
                
                const cx = 15 + i * (this.cardW + this.gapX);
                let cy = this.tableauY;
                for (let k = 0; k < j; k++) cy += pile[k].faceUp ? 35 : 15;
                
                if (x >= cx && x <= cx + this.cardW && y >= cy && y <= cy + this.cardH) {
                    this.selected = { type: 'tableau', pIndex: i, cIndex: j };
                    AudioEngine.tone(600, 0.05, 'sine', 0.1); 
                    return;
                }
            }
        }

        for (let i = 0; i < this.waste.length; i++) {
            const cx = 15 + (this.cardW + this.gapX), cy = this.topY;
            if (x >= cx && x <= cx + this.cardW && y >= cy && y <= cy + this.cardH) {
                this.selected = { type: 'waste', cIndex: i };
                AudioEngine.tone(600, 0.05, 'sine', 0.1); 
                return;
            }
        }

        const stockX = 15, stockY = this.topY;
        if (x >= stockX && x <= stockX + this.cardW && y >= stockY && y <= stockY + this.cardH) {
            if (this.stock.length === 0) {
                if (this.waste.length > 0) {
                    this.stock = this.waste.reverse(); 
                    this.waste = [];
                    this.stock.forEach(c => c.faceUp = false);
                    AudioEngine.tone(300, 0.1, 'triangle', 0.1);
                }
            } else {
                const card = this.stock.pop(); 
                card.faceUp = true; 
                this.waste.push(card);
                AudioEngine.tone(700, 0.05, 'sine', 0.1);
            }
        }
    }

    tryMove(x, y) {
        let movingCards = [], sourceType = '', sourceIdx = 0, sourceCardIdx = 0;
        if (this.selected.type === 'waste') { 
            movingCards = [this.waste[this.selected.cIndex]]; 
            sourceType = 'waste'; 
        }
        else if (this.selected.type === 'tableau') {
            movingCards = this.tableau[this.selected.pIndex].slice(this.selected.cIndex);
            sourceType = 'tableau'; 
            sourceIdx = this.selected.pIndex; 
            sourceCardIdx = this.selected.cIndex;
        }

        const firstCard = movingCards[0];

        for (let i = 0; i < 4; i++) {
            const fX = this.w - 15 - (4 - i) * (this.cardW + this.gapX) + this.gapX;
            const fY = this.topY;
            if (x >= fX - 20 && x <= fX + this.cardW + 20 && y >= fY - 20 && y <= fY + this.cardH + 20) {
                if (movingCards.length > 1) return false;
                const pile = this.foundations[i];
                let valid = false;
                if (pile.length === 0) valid = (firstCard.rank === 0);
                else { 
                    const top = pile[pile.length - 1]; 
                    if (top.suit === firstCard.suit && top.rank === firstCard.rank - 1) valid = true; 
                }

                if (valid) {
                    pile.push(firstCard);
                    this.removeCards(sourceType, sourceIdx, sourceCardIdx);
                    this.score += 15; 
                    AudioEngine.win(); 
                    Haptics.success();
                    Particles.burst(fX + this.cardW / 2, fY + this.cardH / 2, 20, { color: '#2bff88', minSpeed: 50, maxSpeed: 250 });
                    return true;
                }
            }
        }

        for (let i = 0; i < 7; i++) {
            const tX = 15 + i * (this.cardW + this.gapX), pile = this.tableau[i];
            let tY = this.tableauY;
            for (let k = 0; k < pile.length; k++) tY += pile[k].faceUp ? 35 : 15;
            
            if (x >= tX - 30 && x <= tX + this.cardW + 30 && y >= tY - 40) {
                let valid = false;
                if (pile.length === 0) valid = (firstCard.rank === 12);
                else {
                    const top = pile[pile.length - 1];
                    if (top.faceUp) {
                        const isRed = (firstCard.suit === 1 || firstCard.suit === 2);
                        const isTopRed = (top.suit === 1 || top.suit === 2);
                        if (isRed !== isTopRed && top.rank === firstCard.rank + 1) valid = true;
                    }
                }
                if (valid) {
                    pile.push(...movingCards);
                    this.removeCards(sourceType, sourceIdx, sourceCardIdx);
                    this.score += 5; 
                    AudioEngine.tone(500, 0.08, 'sine', 0.1); 
                    Haptics.light();
                    return true;
                }
            }
        }
        return false;
    }

    removeCards(type, pIdx, cIdx) {
        if (type === 'waste') this.waste.pop();
        else if (type === 'tableau') {
            this.tableau[pIdx].splice(cIdx);
            if (this.tableau[pIdx].length > 0) {
                const last = this.tableau[pIdx][this.tableau[pIdx].length - 1];
                if (!last.faceUp) { 
                    last.faceUp = true; 
                    AudioEngine.tone(800, 0.05, 'sine', 0.1); 
                }
            }
        }
    }

    checkWin() {
        if (this.foundations.every(f => f.length === 13)) {
            this.state = 'won'; 
            AudioEngine.win(); 
            Haptics.success(); 
            Camera.add(1.5);
            setTimeout(() => App.gameOver('solitaire', this.score + 1000), 1500);
        }
    }

    update(dt) { Particles.update(dt); Camera.update(dt); }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        ctx.fillStyle = '#05070d'; 
        ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
            ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff'; 
            ctx.font = 'bold 40px Tahoma'; 
            ctx.textAlign = 'center';
            ctx.fillText('SOLITAIRE', this.w / 2, this.h / 2 - 30);
            ctx.fillStyle = '#fff'; 
            ctx.font = '20px Tahoma'; 
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); 
            return;
        }

        const drawSlot = (x, y, sym) => {
            ctx.fillStyle = 'rgba(0,229,255,0.05)'; 
            ctx.strokeStyle = 'rgba(0,229,255,0.2)'; 
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            if (ctx.roundRect) ctx.roundRect(x, y, this.cardW, this.cardH, 8); 
            else ctx.rect(x, y, this.cardW, this.cardH);
            ctx.fill(); 
            ctx.stroke();
            if (sym) { 
                ctx.fillStyle = 'rgba(0,229,255,0.2)'; 
                ctx.font = '30px Arial'; 
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle'; 
                ctx.fillText(sym, x + this.cardW / 2, y + this.cardH / 2); 
            }
        };

        drawSlot(15, this.topY, '↻');
        for (let i = 0; i < 4; i++) drawSlot(this.w - 15 - (4 - i) * (this.cardW + this.gapX) + this.gapX, this.topY, '♠');
        for (let i = 0; i < 7; i++) drawSlot(15 + i * (this.cardW + this.gapX), this.tableauY, 'K');

        if (this.stock.length > 0) this.drawCard(ctx, this.stock[this.stock.length - 1], 15, this.topY, false);
        for (let i = 0; i < this.waste.length; i++) {
            const isSel = this.selected && this.selected.type === 'waste' && this.selected.cIndex === i;
            this.drawCard(ctx, this.waste[i], 15 + (this.cardW + this.gapX), this.topY, isSel);
        }

        for (let i = 0; i < 4; i++) {
            const pile = this.foundations[i];
            if (pile.length > 0) {
                this.drawCard(ctx, pile[pile.length - 1], this.w - 15 - (4 - i) * (this.cardW + this.gapX) + this.gapX, this.topY, false);
            }
        }

        for (let i = 0; i < 7; i++) {
            const pile = this.tableau[i];
            const tX = 15 + i * (this.cardW + this.gapX);
            let tY = this.tableauY;
            for (let j = 0; j < pile.length; j++) {
                const card = pile[j];
                const isSel = this.selected && this.selected.type === 'tableau' && this.selected.pIndex === i && j >= this.selected.cIndex;
                this.drawCard(ctx, card, tX, tY, isSel);
                tY += card.faceUp ? 35 : 15;
            }
        }
        Particles.render(ctx); 
        Camera.reset(ctx);
    }

    drawCard(ctx, card, x, y, isSelected) {
        ctx.save();
        if (isSelected) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 25; y -= 15; }
        else { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3; }

        if (!card.faceUp) {
            const g = ctx.createLinearGradient(x, y, x + this.cardW, y + this.cardH); 
            g.addColorStop(0, '#111a2e'); 
            g.addColorStop(1, '#0c1120');
            ctx.fillStyle = g; 
            ctx.beginPath(); 
            if (ctx.roundRect) ctx.roundRect(x, y, this.cardW, this.cardH, 8); 
            else ctx.rect(x, y, this.cardW, this.cardH);
            ctx.fill(); 
            ctx.shadowBlur = 0; 
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = 'rgba(0,229,255,0.3)'; 
            ctx.lineWidth = 1.5; 
            ctx.stroke();
            ctx.fillStyle = 'rgba(0,229,255,0.1)'; 
            ctx.beginPath(); 
            ctx.arc(x + this.cardW / 2, y + this.cardH / 2, this.cardW / 4, 0, 6.28); 
            ctx.fill();
        } else {
            const g = ctx.createLinearGradient(x, y, x, y + this.cardH); 
            g.addColorStop(0, '#ffffff'); 
            g.addColorStop(1, '#e0e5ec');
            ctx.fillStyle = g; 
            ctx.beginPath(); 
            if (ctx.roundRect) ctx.roundRect(x, y, this.cardW, this.cardH, 8); 
            else ctx.rect(x, y, this.cardW, this.cardH);
            ctx.fill(); 
            ctx.shadowBlur = 0; 
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();

            const isRed = card.suit === 1 || card.suit === 2;
            ctx.fillStyle = isRed ? '#ff2d78' : '#111';
            
            ctx.font = `bold ${Math.floor(this.cardW * 0.3)}px Tahoma`; 
            ctx.textAlign = 'left'; 
            ctx.textBaseline = 'top';
            ctx.fillText(this.ranks[card.rank], x + 6, y + 6);
            
            ctx.font = `${Math.floor(this.cardW * 0.3)}px Arial`; 
            ctx.fillText(this.suits[card.suit], x + 6, y + 6 + this.cardW * 0.3);

            ctx.textAlign = 'right'; 
            ctx.textBaseline = 'bottom';
            ctx.font = `bold ${Math.floor(this.cardW * 0.3)}px Tahoma`; 
            ctx.fillText(this.ranks[card.rank], x + this.cardW - 6, y + this.cardH - 6);
            
            ctx.font = `${Math.floor(this.cardW * 0.3)}px Arial`; 
            ctx.fillText(this.suits[card.suit], x + this.cardW - 6, y + this.cardH - 6 - this.cardW * 0.3);

            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.font = `${Math.floor(this.cardW * 0.55)}px Arial`; 
            ctx.globalAlpha = 0.8;
            ctx.fillText(this.suits[card.suit], x + this.cardW / 2, y + this.cardH / 2); 
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    stop() { 
        super.stop(); 
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch); 
    }
};
