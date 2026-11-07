'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const lerp = (a, b, t) => a + (b - a) * t;
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const AudioEngine = {
    ctx: null, enabled: true,
    init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; } } },
    resume() { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone(f, d, t, v, s) {
        if (!this.enabled) return; this.init(); if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = t || 'sine'; o.frequency.setValueAtTime(f, now);
        if (s) o.frequency.exponentialRampToValueAtTime(s, now + d);
        const vol = v || 0.1;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.005);
        g.gain.setValueAtTime(vol, now + Math.max(0.01, d - 0.03));
        g.gain.exponentialRampToValueAtTime(0.001, now + d);
        o.connect(g).connect(this.ctx.destination); o.start(now); o.stop(now + d + 0.02);
    },
    noise(d, v) {
        if (!this.enabled) return; this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * d, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(v || 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        src.connect(g).connect(this.ctx.destination); src.start(t);
    },
    click() { this.tone(680, 0.04, 'sine', 0.08); },
    chop() { this.tone(380, 0.06, 'square', 0.18); this.noise(0.08, 0.1); },
    jump() { this.tone(420, 0.12, 'sine', 0.12, 720); },
    hit() { this.noise(0.15, 0.12); this.tone(220, 0.15, 'sawtooth', 0.14, 90); },
    coin() { this.tone(1040, 0.07, 'sine', 0.09); setTimeout(() => this.tone(1560, 0.08, 'sine', 0.08), 50); },
    gem() { this.tone(1320, 0.08, 'triangle', 0.1); setTimeout(() => this.tone(1760, 0.1, 'sine', 0.09), 60); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'sine', 0.12), i * 90)); },
    lose() { this.tone(330, 0.2, 'sawtooth', 0.13, 180); setTimeout(() => this.tone(200, 0.3, 'triangle', 0.13, 100), 150); }
};

const Haptics = { enabled: true, light() { if (this.enabled && navigator.vibrate) navigator.vibrate(8); }, medium() { if (this.enabled && navigator.vibrate) navigator.vibrate(20); }, heavy() { if (this.enabled && navigator.vibrate) navigator.vibrate([30, 20, 40]); }, success() { if (this.enabled && navigator.vibrate) navigator.vibrate([15, 30, 15]); } };

const Storage = {
    key: 'nexus_arcade_v9',
    data: { uid: null, name: 'بازیکن', coins: 0, gamesPlayed: 0, best: {}, totalBest: 0, settings: { sound: true, haptics: true } },
    load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (raw) {
                const p = JSON.parse(raw);
                this.data = { ...this.data, ...p };
                this.data.settings = { ...this.data.settings, ...(p.settings || {}) };
            }
        } catch (e) {}
        if (!this.data.uid) { this.data.uid = 'u_' + Math.random().toString(36).slice(2, 11); this.save(); }
        AudioEngine.enabled = this.data.settings.sound;
        Haptics.enabled = this.data.settings.haptics;
    },
    save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
    addCoins(n) { this.data.coins = Math.max(0, this.data.coins + n); this.save(); },
    setBest(id, s) {
        const p = this.data.best[id] || 0;
        if (s > p) {
            this.data.best[id] = s;
            this.data.totalBest = Object.values(this.data.best).reduce((a, b) => a + b, 0);
            this.save();
            return true;
        }
        return false;
    },
    incGames() { this.data.gamesPlayed++; this.save(); }
};

const Net = {
    db: null, ready: false,
    init() { if (!window.FIREBASE_CONFIG?.databaseURL) return; try { firebase.initializeApp(window.FIREBASE_CONFIG); this.db = firebase.database(); this.ready = true; } catch (e) { console.warn('DB Init', e); } },
    submit(gameId, score, name) {
        if (!this.ready || !this.db) return Promise.resolve(false);
        const uid = Storage.data.uid;
        const safeName = esc(name).slice(0, 20);
        const gameRef = this.db.ref(`leaderboards/${gameId}`);
        
        return gameRef.orderByChild('uid').equalTo(uid).once('value').then(snap => {
            let existingKey = null, existingScore = 0;
            snap.forEach(c => { existingKey = c.key; existingScore = c.val().score || 0; });
            if (score <= existingScore) return false;
            const entry = { uid, name: safeName, score, ts: Date.now() };
            if (existingKey) return gameRef.child(existingKey).update(entry);
            return gameRef.push(entry);
        }).then(() => {
            return this.db.ref('global_leaderboard').orderByChild('uid').equalTo(uid).once('value');
        }).then(snap => {
            let existingKey = null;
            snap.forEach(c => { existingKey = c.key; });
            const totalScore = Object.values(Storage.data.best).reduce((a, b) => a + b, 0);
            const entry = { uid, name: safeName, totalScore, ts: Date.now() };
            if (existingKey) return this.db.ref(`global_leaderboard/${existingKey}`).update(entry);
            return this.db.ref('global_leaderboard').push(entry);
        }).catch(() => false);
    },
    get(gameId) {
        if (!this.ready || !this.db) return Promise.resolve([]);
        return this.db.ref(`leaderboards/${gameId}`).orderByChild('score').limitToLast(50).once('value')
            .then(snap => { const a = []; snap.forEach(c => a.push(c.val())); return a.reverse(); }).catch(() => []);
    },
    getGlobal() {
        if (!this.ready || !this.db) return Promise.resolve([]);
        return this.db.ref('global_leaderboard').orderByChild('totalScore').limitToLast(50).once('value')
            .then(snap => { const a = []; snap.forEach(c => a.push(c.val())); return a.reverse(); }).catch(() => []);
    }
};

const Particles = {
    pool: [], idx: 0,
    init(n) { this.pool = Array.from({ length: n }, () => ({ active: false })); this.idx = 0; },
    spawn(cfg) { const p = this.pool[this.idx]; this.idx = (this.idx + 1) % this.pool.length; Object.assign(p, { active: true, life: 0.5, max: 0.5, size: 3, color: '#fff', gravity: 400, fade: true }, cfg); p.max = p.life; },
    burst(x, y, n, o = {}) { for (let i = 0; i < n; i++) { const a = o.angle !== undefined ? o.angle + rand(-0.5, 0.5) : rand(0, Math.PI * 2); const sp = rand(o.minSpeed || 60, o.maxSpeed || 240); this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(o.minLife || 0.3, o.maxLife || 0.8), size: rand(o.minSize || 2, o.maxSize || 5), color: o.color || '#fff', gravity: o.gravity !== undefined ? o.gravity : 500 }); } },
    update(dt) { for (const p of this.pool) { if (!p.active) continue; p.life -= dt; if (p.life <= 0) { p.active = false; continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.vx *= 0.99; } },
    render(ctx) { for (const p of this.pool) { if (!p.active) continue; ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } ctx.globalAlpha = 1; },
    clear() { this.pool.forEach(p => p.active = false); }
};

const Camera = { shake: 0, ox: 0, oy: 0, add(a) { this.shake = Math.min(1, this.shake + a); }, update(dt) { this.shake = Math.max(0, this.shake - dt * 2.5); const s = this.shake * this.shake; this.ox = (Math.random() - 0.5) * 20 * s; this.oy = (Math.random() - 0.5) * 20 * s; }, apply(ctx) { ctx.save(); ctx.translate(this.ox, this.oy); }, reset(ctx) { ctx.restore(); } };

const Input = { 
    pointer: { x: 0, y: 0, down: false }, 
    keys: new Set(), 
    _handlers: [],
    bind(c) {
        this.unbind();
        const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        const onDown = e => { e.preventDefault(); const p = pos(e); this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.down = true; };
        const onMove = e => { const p = pos(e); this.pointer.x = p.x; this.pointer.y = p.y; };
        const onUp = () => { this.pointer.down = false; };
        const onKeyDown = e => { this.keys.add(e.key.toLowerCase()); };
        const onKeyUp = e => { this.keys.delete(e.key.toLowerCase()); };
        
        c.addEventListener('pointerdown', onDown, { passive: false }); this._handlers.push({ t: c, e: 'pointerdown', f: onDown });
        c.addEventListener('pointermove', onMove, { passive: true }); this._handlers.push({ t: c, e: 'pointermove', f: onMove });
        window.addEventListener('pointerup', onUp); this._handlers.push({ t: window, e: 'pointerup', f: onUp });
        window.addEventListener('pointercancel', onUp); this._handlers.push({ t: window, e: 'pointercancel', f: onUp });
        window.addEventListener('keydown', onKeyDown); this._handlers.push({ t: window, e: 'keydown', f: onKeyDown });
        window.addEventListener('keyup', onKeyUp); this._handlers.push({ t: window, e: 'keyup', f: onKeyUp });
    },
    unbind() {
        this._handlers.forEach(h => h.t.removeEventListener(h.e, h.f));
        this._handlers = [];
        this.keys.clear();
        this.pointer.down = false;
    },
    isDown(k) { return this.keys.has(k); } 
};

class GameBase {
    constructor() {
        this.canvas = $('#game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.canvas.parentElement);
        
        this.onResize = null;
    }
    resize() {
        const r = this.canvas.getBoundingClientRect();
        const parent = this.canvas.parentElement;
        const pRect = parent ? parent.getBoundingClientRect() : { width: 0, height: 0 };
        
        this.w = r.width || pRect.width || window.innerWidth || 360;
        this.h = r.height || pRect.height || window.innerHeight || 640;
        
        this.w = Math.max(this.w, 10);
        this.h = Math.max(this.h, 10);
        
        this.canvas.width = Math.round(this.w * this.dpr);
        this.canvas.height = Math.round(this.h * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        if (this.onResize) this.onResize();
    }
    setHud(html) { const el = $('[data-bind="hud"]'); if (el) el.innerHTML = html; }
    start() {}
    update(dt) {}
    render() {}
    stop() { 
        if (this.ro) this.ro.disconnect();
        Input.unbind();
        Particles.clear(); 
        Camera.shake = 0; 
        Camera.ox = 0; 
        Camera.oy = 0; 
    }
}

window.$ = $; window.$$ = $$; window.clamp = clamp; window.rand = rand; window.randInt = randInt; 
window.pick = pick; window.dist = dist; window.lerp = lerp; window.esc = esc;
window.AudioEngine = AudioEngine; window.Haptics = Haptics; window.Storage = Storage; window.Net = Net; 
window.Particles = Particles; window.Camera = Camera; window.Input = Input; window.GameBase = GameBase;
