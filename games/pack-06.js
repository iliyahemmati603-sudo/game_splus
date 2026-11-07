window.Game_stack = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() {
        return {
            type: 'custom',
            buttons: [
                { label: '▼<span>رهاشدن</span>', action: () => this.dropBlock() }
            ]
        };
    }

    recalc() {
        this.baseW = Math.min(this.w * 0.65, 280);
        this.baseH = 40;
        this.cameraY = 0;
        this.targetCameraY = 0;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') this.startGame();
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.combo = 0;
        this.tower = [];
        this.cameraY = 0;
        this.targetCameraY = 0;
        const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88'];
        
        this.tower.push({ x: (this.w - this.baseW) / 2, y: this.h - 120, w: this.baseW, color: colors[0] });
        this.currentBlock = { x: 0, w: this.baseW, color: colors[1], dir: 1, speed: 300 };
        this.updateHud();
    }

    spawnBlock() {
        const last = this.tower[this.tower.length - 1];
        const colors = ['#00e5ff', '#ff2d78', '#ffc531', '#a855f7', '#2bff88'];
        this.currentBlock = {
            x: Math.random() < 0.5 ? 0 : this.w - last.w,
            w: last.w,
            color: colors[this.tower.length % colors.length],
            dir: Math.random() < 0.5 ? 1 : -1,
            speed: 300 + this.tower.length * 20
        };
    }

    dropBlock() {
        if (this.state !== 'playing') return;
        const last = this.tower[this.tower.length - 1];
        const cb = this.currentBlock;

        const overlapLeft = Math.max(cb.x, last.x);
        const overlapRight = Math.min(cb.x + cb.w, last.x + last.w);
        const overlap = overlapRight - overlapLeft;

        if (overlap <= 0) return this.gameOver();

        const isPerfect = Math.abs(cb.x - last.x) < 8;
        let finalX = cb.x, finalW = cb.w;

        if (isPerfect) {
            finalX = last.x;
            finalW = last.w;
            this.combo++;
            AudioEngine.win();
            Haptics.success();
            Camera.add(0.3);
            for (let i = 0; i < 25; i++) {
                Particles.burst(finalX + finalW / 2, last.y - this.baseH, 3, { color: '#fff', minSpeed: 120, maxSpeed: 350, gravity: 200 });
            }
        } else {
            this.combo = 0;
            finalX = overlapLeft;
            finalW = overlap;
            AudioEngine.tone(400, 0.1, 'square', 0.1);
            Haptics.medium();
            Camera.add(0.5);
        }

        this.score += 10 + (this.combo * 10);
        const newY = last.y - this.baseH;
        this.tower.push({ x: finalX, y: newY, w: finalW, color: cb.color });

        const chop = cb.w - finalW;
        if (chop > 0) {
            const fallingX = cb.x > finalX ? finalX + finalW : finalX - chop;
            Particles.burst(fallingX + chop / 2, newY, 30, { color: cb.color, minSpeed: 150, maxSpeed: 500, gravity: 900, minSize: 6, maxSize: 14 });
        }

        this.targetCameraY = Math.max(0, (this.tower.length - 6) * this.baseH);

        if (finalW <= 8) return this.gameOver();

        this.spawnBlock();
        this.updateHud();
    }

    updateHud() {
        this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div><div class="hud-pill">ارتفاع <b>${this.tower.length}</b></div>`);
    }

    gameOver() {
        this.state = 'dead';
        AudioEngine.lose();
        Haptics.heavy();
        Camera.add(2);
        if (this.currentBlock) {
            Particles.burst(this.currentBlock.x + this.currentBlock.w / 2, 100, 60, { color: this.currentBlock.color, minSpeed: 200, maxSpeed: 700, gravity: 700 });
        }
        setTimeout(() => App.gameOver('stack', this.score, { height: this.tower.length }), 800);
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        this.cameraY = lerp(this.cameraY, this.targetCameraY, dt * 6);
        
        if (this.state !== 'playing') return;

        const cb = this.currentBlock;
        cb.x += cb.speed * cb.dir * dt;
        if (cb.x < 0) { cb.x = 0; cb.dir = 1; }
        if (cb.x + cb.w > this.w) { cb.x = this.w - cb.w; cb.dir = -1; }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
        bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#ffc531'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 30;
            ctx.fillText('TOWER STACK', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        ctx.translate(0, this.cameraY);

        for (let i = 0; i < this.tower.length; i++) {
            const b = this.tower[i];
            const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + this.baseH);
            g.addColorStop(0, b.color); g.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = g; ctx.shadowColor = b.color; ctx.shadowBlur = i === this.tower.length - 1 ? 30 : 5;
            ctx.fillRect(b.x, b.y, b.w, this.baseH);
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(b.x, b.y, b.w, 5);
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, this.baseH);
        }

        if (this.state === 'playing' && this.currentBlock) {
            const cb = this.currentBlock;
            const nextY = this.tower[this.tower.length - 1].y - this.baseH;
            ctx.fillStyle = cb.color; ctx.shadowColor = cb.color; ctx.shadowBlur = 25;
            ctx.fillRect(cb.x, nextY, cb.w, this.baseH);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(cb.x, nextY, cb.w, 5);
            ctx.shadowBlur = 0;
            if (this.combo > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center'; ctx.fillText(`کمبو ×${this.combo}`, this.w / 2, nextY - 25); }
        }

        Particles.render(ctx);
        ctx.translate(0, -this.cameraY);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_color = class extends GameBase {
    constructor() {
        super();
        Particles.init(500);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() {
        return {
            type: 'custom',
            buttons: [
                { label: '▲<span>پرش</span>', action: () => this.jump() }
            ]
        };
    }

    recalc() {
        this.ballR = 14;
        this.gravity = 1800;
        this.jumpForce = -650;
        this.scrollSpeed = 220;
        this.ringRadius = Math.min(this.w * 0.38, 160);
        this.ringThick = 18;
        this.colors = ['#00e5ff', '#ff2d78', '#ffc531', '#2bff88'];
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') this.startGame();
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.ball = { x: this.w / 2, y: this.h * 0.7, vy: 0, colorIndex: 0, trail: [] };
        this.obstacles = []; 
        this.swappers = []; 
        this.spawnTimer = 0;
        this.spawnObstacle(this.h * 0.3);
        this.updateHud();
    }

    jump() {
        if (this.state !== 'playing') return;
        this.ball.vy = this.jumpForce;
        AudioEngine.tone(600, 0.08, 'sine', 0.12, 850);
        Haptics.light();
        for (let i = 0; i < 10; i++) Particles.burst(this.ball.x, this.ball.y + this.ballR, 2, { color: this.colors[this.ball.colorIndex], minSpeed: 50, maxSpeed: 150, angle: Math.PI / 2 });
    }

    spawnObstacle(y) {
        const type = Math.random();
        if (type < 0.7) {
            const segments = 4, colors = [];
            for (let i = 0; i < segments; i++) colors.push(randInt(0, 3));
            colors[randInt(0, 3)] = -1;
            this.obstacles.push({ x: this.w / 2, y: y, r: this.ringRadius, thick: this.ringThick, rot: Math.random() * 6.28, rotSpeed: (Math.random() < 0.5 ? 1 : -1) * rand(1, 2.5), segments: segments, colors: colors, passed: false });
        } else {
            this.swappers.push({ x: this.w / 2, y: y, r: 18, rot: Math.random() * 6.28, rotSpeed: rand(2, 4), passed: false });
        }
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`); }
    
    gameOver() { 
        this.state = 'dead'; 
        AudioEngine.hit(); 
        Haptics.heavy(); 
        Camera.add(1.5); 
        Particles.burst(this.ball.x, this.ball.y, 60, { color: this.colors[this.ball.colorIndex], minSpeed: 200, maxSpeed: 600, gravity: 400 }); 
        setTimeout(() => App.gameOver('color', this.score), 800); 
    }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state !== 'playing') return;

        const b = this.ball;
        b.vy += this.gravity * dt;
        b.y += b.vy * dt;
        
        b.trail.push({ x: b.x, y: b.y, color: this.colors[b.colorIndex], life: 0.35 });
        for (const t of b.trail) t.life -= dt;
        b.trail = b.trail.filter(t => t.life > 0);

        for (const o of this.obstacles) { o.y -= this.scrollSpeed * dt; o.rot += o.rotSpeed * dt; }
        for (const s of this.swappers) { s.y -= this.scrollSpeed * dt; s.rot += s.rotSpeed * dt; }
        
        this.obstacles = this.obstacles.filter(o => o.y > -o.r - 60);
        this.swappers = this.swappers.filter(s => s.y > -60);

        const topObs = Math.min(this.obstacles.length ? this.obstacles[this.obstacles.length - 1].y : 9999, this.swappers.length ? this.swappers[this.swappers.length - 1].y : 9999);
        if (topObs > 60 && topObs < this.h * 0.4) this.spawnObstacle(topObs - rand(280, 380));
        else if (this.obstacles.length === 0 && this.swappers.length === 0) this.spawnObstacle(this.h * 0.3);

        if (b.y > this.h + 60) return this.gameOver();

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            const d = Math.hypot(b.x - o.x, b.y - o.y);
            if (d > o.r - o.thick / 2 - this.ballR && d < o.r + o.thick / 2 + this.ballR) {
                let angle = Math.atan2(b.y - o.y, b.x - o.x) - o.rot;
                while (angle < 0) angle += Math.PI * 2;
                while (angle >= Math.PI * 2) angle -= Math.PI * 2;
                const segIndex = Math.floor(angle / (Math.PI * 2 / o.segments));
                const segColor = o.colors[segIndex];
                if (segColor !== -1 && segColor !== b.colorIndex) return this.gameOver();
            }
            if (!o.passed && b.y < o.y) { o.passed = true; this.score += 15; AudioEngine.coin(); this.updateHud(); }
        }

        for (let i = this.swappers.length - 1; i >= 0; i--) {
            const s = this.swappers[i];
            const d = Math.hypot(b.x - s.x, b.y - s.y);
            if (!s.passed && d < this.ballR + s.r) {
                s.passed = true;
                b.colorIndex = (b.colorIndex + randInt(1, 3)) % 4;
                AudioEngine.tone(950, 0.1, 'sine', 0.15);
                Haptics.medium();
                Camera.add(0.3);
                Particles.burst(s.x, s.y, 25, { color: this.colors[b.colorIndex], minSpeed: 120, maxSpeed: 350 });
            }
            if (!s.passed && b.y < s.y) s.passed = true;
        }
    }

    render() {
        const ctx = this.ctx;
        Camera.apply(ctx);
        const bg = ctx.createLinearGradient(0, 0, 0, this.h); 
        bg.addColorStop(0, '#05070d'); bg.addColorStop(1, '#0f1423');
        ctx.fillStyle = bg; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);

        if (this.state === 'menu') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
            ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
            ctx.fillText('COLOR SWITCH', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '20px Tahoma'; ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        for (const o of this.obstacles) {
            ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.lineWidth = o.thick; ctx.lineCap = 'butt';
            const segAngle = (Math.PI * 2) / o.segments;
            for (let i = 0; i < o.segments; i++) {
                const cIdx = o.colors[i];
                if (cIdx === -1) continue;
                ctx.strokeStyle = this.colors[cIdx]; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(0, 0, o.r, i * segAngle, (i + 1) * segAngle); ctx.stroke();
            }
            ctx.shadowBlur = 0; ctx.restore();
        }

        for (const s of this.swappers) {
            ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = this.colors[i]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s.r, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.fill();
            }
            ctx.shadowBlur = 0; ctx.restore();
        }

        for (const t of this.ball.trail) {
            ctx.globalAlpha = t.life * 3; ctx.fillStyle = t.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, this.ballR * 0.8, 0, 6.28); ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = this.colors[this.ball.colorIndex]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ballR, 0, 6.28); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        Particles.render(ctx);
        Camera.reset(ctx);
    }

    stop() {
        super.stop();
        if (this._touch) this.canvas.removeEventListener('pointerdown', this._touch);
    }
};

window.Game_word = class extends GameBase {
    constructor() {
        super();
        Particles.init(400);
        Input.bind(this.canvas);
        this.recalc();
        this.onResize = () => this.recalc();
        this.state = 'menu';
        this.bindInputs();
    }

    getControls() {
        return {
            type: 'custom',
            buttons: [
                { label: '🔄<span>پاک کردن</span>', action: () => this.resetSelection() }
            ]
        };
    }

    recalc() {
        this.btnSize = Math.min(60, (this.w - 80) / 5);
        this.btnGap = 12;
    }

    bindInputs() {
        this._touch = (e) => {
            e.preventDefault();
            if (this.state === 'menu' || this.state === 'dead') { this.startGame(); return; }
            if (this.state !== 'playing') return;
            
            const r = this.canvas.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;
            
            for (let i = 0; i < this.letters.length; i++) {
                const bx = this.btnXs[i], by = this.btnYs[i];
                if (x >= bx && x <= bx + this.btnSize && y >= by && y <= by + this.btnSize) {
                    if (!this.selected.includes(i)) {
                        this.selected.push(i);
                        AudioEngine.tone(600 + (this.selected.length * 50), 0.05, 'sine', 0.1);
                        Haptics.light();
                        Particles.burst(bx + this.btnSize / 2, by + this.btnSize / 2, 8, { color: '#00e5ff', minSpeed: 40, maxSpeed: 150 });
                    }
                    break;
                }
            }
        };
        this.canvas.addEventListener('pointerdown', this._touch, { passive: false });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.words = [
            'برنامه', 'گوشی', 'اینترنت', 'بازی', 'دوست', 'کامپیوتر', 'تلگرام', 'هوش', 'کهکشان', 'ستاره',
            'فضا', 'موشک', 'سیاره', 'خورشید', 'ماه', 'زمین', 'آسمان', 'ابر', 'باران', 'برف',
            'دریا', 'اقیانوس', 'موج', 'ساحل', 'ماهی', 'کوسه', 'نهنگ', 'قایق', 'کشتی', 'هواپیما',
            'قطار', 'ماشین', 'دوچرخه', 'موتور', 'خیابان', 'جاده', 'شهر', 'روستا', 'خانه', 'مدرسه',
            'دانشگاه', 'کتاب', 'دفتر', 'قلم', 'مداد', 'پاککن', 'تخته', 'کلاس', 'معلم', 'دانشآموز',
            'دکتر', 'مهندس', 'خلبان', 'راننده', 'پلیس', 'آتشنشان', 'سرباز', 'کشاورز', 'نجار', 'آهنگر',
            'نانوا', 'قصاب', 'بقال', 'میوه', 'سیب', 'پرتقال', 'موز', 'انگور', 'هندوانه', 'توتفرنگی',
            'گیلاس', 'انار', 'خیار', 'گوجه', 'سیبزمینی', 'پیاز', 'سیر', 'هویج', 'کاهو', 'کلم',
            'برنج', 'ماکارونی', 'نان', 'پنیر', 'شیر', 'ماست', 'کره', 'عسل', 'مربا', 'شکلات',
            'بستنی', 'کیک', 'شیرینی', 'آب', 'چای', 'قهوه', 'شربت', 'آبمیوه', 'نوشابه', 'سوپ',
            'کباب', 'پلو', 'خورش', 'سالاد', 'ساندویچ', 'پیتزا', 'همبرگر', 'سوسیس', 'تخممرغ', 'مرغ',
            'گوشت', 'ماهی', 'میگو', 'خرچنگ', 'لاکپشت', 'قورباغه', 'مار', 'مارمولک', 'سوسمار', 'دایناسور',
            'شیر', 'ببر', 'پلنگ', 'یوزپلنگ', 'گرگ', 'روباه', 'شغال', 'خرس', 'خرگوش', 'آهو',
            'گوزن', 'بز', 'گوسفند', 'اسب', 'الاغ', 'شتر', 'فیل', 'زرافه', 'میمون', 'کانگورو',
            'موش', 'گربه', 'سگ', 'پرنده', 'عقاب', 'شاهین', 'جغد', 'طوطی', 'کبوتر', 'زنبور',
            'پروانه', 'مورچه', 'عنکبوت', 'عقرب', 'ماهی', 'کرم', 'حلزون', 'ستاره', 'ماه', 'خورشید'
        ];
        this.newWord();
    }

    newWord() {
        this.targetWord = this.words[Math.floor(Math.random() * this.words.length)];
        this.letters = this.targetWord.split('');
        this.letters.sort(() => Math.random() - 0.5);
        this.selected = [];
        
        this.btnXs = []; this.btnYs = [];
        const totalW = this.letters.length * this.btnSize + (this.letters.length - 1) * this.btnGap;
        const startX = (this.w - totalW) / 2;
        const startY = this.h * 0.65;
        
        for (let i = 0; i < this.letters.length; i++) {
            this.btnXs.push(startX + i * (this.btnSize + this.btnGap));
            this.btnYs.push(startY);
        }
        this.updateHud();
    }

    resetSelection() {
        if (this.state !== 'playing') return;
        this.selected = [];
        AudioEngine.tone(300, 0.1, 'sawtooth', 0.1);
        Haptics.light();
    }

    checkWord() {
        const built = this.selected.map(i => this.letters[i]).join('');
        if (built === this.targetWord) {
            this.score += 150;
            AudioEngine.win(); 
            Haptics.success(); 
            Camera.add(0.4);
            Particles.burst(this.w / 2, this.h * 0.4, 50, { color: '#2bff88', minSpeed: 150, maxSpeed: 500 });
            this.newWord();
        } else {
            AudioEngine.hit(); 
            Haptics.heavy(); 
            Camera.add(0.6);
            this.resetSelection();
        }
        this.updateHud();
    }

    updateHud() { this.setHud(`<div class="hud-pill">امتیاز <b>${this.score}</b></div>`); }

    update(dt) {
        Particles.update(dt);
        Camera.update(dt);
        if (this.state === 'playing' && this.selected.length === this.letters.length) this.checkWord();
    }

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
            ctx.shadowColor = '#00e5ff'; 
            ctx.shadowBlur = 30;
            ctx.fillText('WORD PUZZLE', this.w / 2, this.h / 2 - 30);
            ctx.shadowBlur = 0; 
            ctx.fillStyle = '#fff'; 
            ctx.font = '20px Tahoma'; 
            ctx.fillText('برای شروع ضربه بزنید', this.w / 2, this.h / 2 + 20);
            Camera.reset(ctx); return;
        }

        const slotW = this.btnSize;
        const totalSlotW = this.targetWord.length * slotW;
        const startSlotX = (this.w - totalSlotW) / 2;
        
        for (let i = 0; i < this.targetWord.length; i++) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)'; 
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; 
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            if (ctx.roundRect) ctx.roundRect(startSlotX + i * slotW + 2, this.h * 0.25, slotW - 4, slotW + 10, 10); 
            else ctx.rect(startSlotX + i * slotW + 2, this.h * 0.25, slotW - 4, slotW + 10);
            ctx.fill(); 
            ctx.stroke();
        }

        for (let i = 0; i < this.selected.length; i++) {
            const idx = this.selected[i];
            ctx.fillStyle = '#00e5ff'; 
            ctx.font = `bold ${slotW * 0.6}px Tahoma`; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.fillText(this.letters[idx], startSlotX + i * slotW + slotW / 2, this.h * 0.25 + slotW / 2 + 5);
        }

        for (let i = 0; i < this.letters.length; i++) {
            const bx = this.btnXs[i], by = this.btnYs[i], isSel = this.selected.includes(i);
            
            ctx.fillStyle = isSel ? 'rgba(0,229,255,0.15)' : '#111a2e';
            ctx.strokeStyle = isSel ? '#00e5ff' : 'rgba(255,255,255,0.2)'; 
            ctx.lineWidth = 2;
            
            ctx.beginPath(); 
            if (ctx.roundRect) ctx.roundRect(bx, by, this.btnSize, this.btnSize, 14); 
            else ctx.rect(bx, by, this.btnSize, this.btnSize);
            ctx.fill(); 
            ctx.stroke();
            
            if (!isSel) {
                ctx.fillStyle = '#fff'; 
                ctx.font = `bold ${this.btnSize * 0.5}px Tahoma`; 
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                ctx.fillText(this.letters[i], bx + this.btnSize / 2, by + this.btnSize / 2 + 2);
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
