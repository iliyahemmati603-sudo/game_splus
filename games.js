'use strict';
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a),randInt=(a,b)=>Math.floor(rand(a,b+1)),TAU=Math.PI*2,nw=()=>performance.now();

const GAME_LIST=[
{id:'snake',icon:'🐍',name:'مار نئونی',desc:'بخور و رشد کن',color:'#00e5ff'},
{id:'lumberjack',icon:'🪓',name:'چوب‌بر',desc:'شاخه‌ها را قطع کن',color:'#2bff88'},
{id:'pong',icon:'🏓',name:'پنگ',desc:'با حریف بازی کن',color:'#ff2d78'},
{id:'tetris',icon:'🧱',name:'تتریس',desc:'خط‌ها را پر کن',color:'#a855f7'},
{id:'flappy',icon:'🐦',name:'پرنده',desc:'پرواز کن',color:'#ffc531'},
{id:'breakout',icon:'🧨',name:'آجرشکن',desc:'آجرها را بشکن',color:'#00e5ff'},
{id:'2048',icon:'🔢',name:'۲۰۴۸',desc:'اعداد را ادغام کن',color:'#ffc531'},
{id:'memory',icon:'🃏',name:'حافظه',desc:'جفت‌ها را پیدا کن',color:'#2bff88'},
{id:'minesweeper',icon:'💣',name:'مین‌یاب',desc:'از مین‌ها دوری کن',color:'#ff2d78'},
{id:'tictactoe',icon:'⭕',name:'دوز',desc:'سه‌تایی بچین',color:'#00e5ff'},
{id:'connect4',icon:'🔴',name:'چهارتایی',desc:'چهار مهره کنار هم',color:'#ffc531'},
{id:'reaction',icon:'⚡',name:'واکنش',desc:'سریع بزن',color:'#2bff88'},
{id:'math',icon:'➗',name:'ریاضی',desc:'سریع حساب کن',color:'#00e5ff'},
{id:'match3',icon:'💎',name:'سه‌تایی',desc:'کریستال‌ها را جور کن',color:'#a855f7'},
{id:'solitaire',icon:'🃏',name:'سالیتر',desc:'کارت‌ها را مرتب کن',color:'#2bff88'},
{id:'stack',icon:'🏗️',name:'برج',desc:'بلوک‌ها را روی هم بچین',color:'#ffc531'},
{id:'color',icon:'🎨',name:'رنگ',desc:'رنگ توپ را عوض کن',color:'#ff2d78'},
{id:'word',icon:'🔤',name:'کلمات',desc:'کلمه را بساز',color:'#00e5ff'},
{id:'physics',icon:'🎯',name:'فیزیک',desc:'توپ را پرتاب کن',color:'#ffc531'},
{id:'clicker',icon:'👆',name:'کلیکر',desc:'سکه جمع کن',color:'#ffc531'},
{id:'invaders',icon:'👾',name:'مهاجم',desc:'فضایی‌ها را بزن',color:'#2bff88'}];

const GameEngine={
games:{},current:null,gameId:null,raf:0,last:0,
db:null,lb:null,callbacks:null,

init(cfg){
this.db=cfg.db;this.lb=cfg.lb;this.callbacks=cfg;
const Snd={ctx:null,
e(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(A)this.ctx=new A();}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();return this.ctx;},
t(f,d=0.08,tp='sine',v=0.1,ef=null){if(!this.db.get('settings').sound)return;const c=this.e();if(!c)return;
try{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=tp;o.frequency.setValueAtTime(Math.max(30,f),t);
if(ef)o.frequency.exponentialRampToValueAtTime(Math.max(30,ef),t+d);g.gain.setValueAtTime(v,t);
g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d);}catch(e){}},
jump(){this.t(380,0.12,'sine',0.1,760)},coin(){this.t(980,0.06,'sine',0.1,1400)},
hit(){this.t(190,0.15,'sawtooth',0.12,55)},win(){this.t(620,0.08,'sine',0.1,900);setTimeout(()=>this.t(920,0.13,'sine',0.1,1240),85)},
lose(){this.t(280,0.28,'sawtooth',0.1,75)},ui(){this.t(680,0.035,'sine',0.055)},chop(){this.t(320,0.05,'square',0.08,180)}};
this.Snd=Snd;

const Hap={ok(){if(this.db.get('settings').haptics&&navigator.vibrate)navigator.vibrate(12)},
med(){if(this.db.get('settings').haptics&&navigator.vibrate)navigator.vibrate(26)},
heavy(){if(this.db.get('settings').haptics&&navigator.vibrate)navigator.vibrate([32,22,50])},
success(){if(this.db.get('settings').haptics&&navigator.vibrate)navigator.vibrate([14,30,14])}};
this.Hap=Hap;

const Par={pool:[],
init(n=700){this.pool=new Array(n);for(let i=0;i<n;i++)this.pool[i]={on:false,x:0,y:0,vx:0,vy:0,life:0,max:1,color:'#fff',size:2,grav:0};},
spawn(x,y,c,o={}){const{color='#00e5ff',minSpeed=60,maxSpeed=220,gravity=200,minSize=1,maxSize=4,angle=null,spread=TAU}=o;
let n=0;for(let i=0;i<this.pool.length&&n<c;i++){const p=this.pool[i];if(p.on)continue;
const a=angle!==null?angle+rand(-spread/2,spread/2):rand(0,TAU),sp=rand(minSpeed,maxSpeed);
p.on=true;p.x=x;p.y=y;p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;p.life=p.max=rand(0.3,0.8);
p.color=color;p.size=rand(minSize,maxSize);p.grav=gravity;n++;}},
update(dt){for(let i=0;i<this.pool.length;i++){const p=this.pool[i];if(!p.on)continue;
p.life-=dt;if(p.life<=0){p.on=false;continue;}p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}},
render(ctx){for(let i=0;i<this.pool.length;i++){const p=this.pool[i];if(!p.on)continue;
ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}ctx.globalAlpha=1;}};
Par.init();this.Par=Par;

const Cam={shake:0,add(v){this.shake=Math.min(2,this.shake+v)},update(dt){if(this.shake>0)this.shake=Math.max(0,this.shake-dt*3.5)},
apply(ctx){if(this.shake>0.01){const s=this.shake*8;ctx.translate(rand(-s,s),rand(-s,s))}}};
this.Cam=Cam;
this.registerAll();
},

buildMenu(){this.callbacks.renderMenu();},

play(id){this.halt();
const C=this.games[id];if(!C)return;
this.gameId=id;
document.getElementById('menu').style.display='none';
document.getElementById('game').classList.add('on');
document.getElementById('over').classList.remove('show');
document.getElementById('dpad').classList.remove('on');
this.current=new C(this);
this.current.init();
this.last=nw();
this.raf=requestAnimationFrame(t=>this.tick(t));},

tick(t){if(!this.current)return;
const dt=Math.min(0.05,(t-this.last)/1000);this.last=t;
if(this.current.state!=='over'&&this.current.update)this.current.update(dt);
this.Par.update(dt);this.Cam.update(dt);
const ctx=this.current.ctx;
ctx.setTransform(ctx._dpr||1,0,0,ctx._dpr||1,0,0);
ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#060912';
ctx.fillRect(0,0,this.current.w,this.current.h);
this.current.render();
this.raf=requestAnimationFrame(t2=>this.tick(t2));},

halt(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;
if(this.current){this.current.destroy();this.current=null;}},

showOver(score,isRecord,title,sub){
document.getElementById('o-title').textContent=title||'بازی تمام شد';
document.getElementById('o-score').textContent=score;
let ex='';if(isRecord)ex='<b style="color:var(--green)">رکورد جدید!</b> · ';
const b=this.db.get('best')||{};ex+='رکورد: <b>'+(b[this.gameId]||0)+'</b>';
if(sub)ex+='<br>'+sub;
document.getElementById('o-sub').innerHTML=ex;
document.getElementById('over').classList.add('show');
this.halt();},

toMenu(){this.halt();
document.getElementById('game').classList.remove('on');
document.getElementById('menu').style.display='flex';
document.getElementById('over').classList.remove('show');
document.getElementById('dpad').classList.remove('on');
this.callbacks.renderStats();},

retry(){if(this.gameId)this.play(this.gameId);},

registerAll(){
const self=this;
class Base{
constructor(engine){this.engine=engine;this.Snd=engine.Snd;this.Hap=engine.Hap;this.Par=engine.Par;this.Cam=engine.Cam;
this.canvas=document.getElementById('cv');this.ctx=this.canvas.getContext('2d',{alpha:false});
this.w=0;this.h=0;this.state='playing';this.score=0;this.hudEl=document.getElementById('hud');
this._r=()=>this.resize();window.addEventListener('resize',this._r);this.resize();}
resize(){const d=Math.min(window.devicePixelRatio||1,2.5);
this.canvas.width=Math.floor(window.innerWidth*d);this.canvas.height=Math.floor(window.innerHeight*d);
this.canvas.style.width=window.innerWidth+'px';this.canvas.style.height=window.innerHeight+'px';
this.ctx.setTransform(d,0,0,d,0,0);this.ctx._dpr=d;this.w=window.innerWidth;this.h=window.innerHeight;
if(this.layout)this.layout();}
setHud(h){if(this.hudEl.innerHTML!==h)this.hudEl.innerHTML=h;}
finish(title,sub){if(this.state==='over')return;this.state='over';
const r=this.engine.lb.submit(this.engine.gameId,Math.floor(this.score));
this.engine.db.set('plays',this.engine.db.get('plays')+1);
this.engine.showOver(Math.floor(this.score),r,title,sub);}
destroy(){window.removeEventListener('resize',this._r);this.hudEl.innerHTML='';}
}

this.games.snake=class extends Base{
init(){this.cols=20;this.rows=24;this.layout();this.reset();
const keyMap={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
this._k=e=>{const d=keyMap[e.key.toLowerCase()];if(!d)return;e.preventDefault();this.applyDir(d[0],d[1]);};
window.addEventListener('keydown',this._k);
const dpad=document.getElementById('dpad');dpad.classList.add('on');
this._dpHandler=e=>{e.preventDefault();const btn=e.target.closest('button');if(!btn)return;
const dirMap={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};const d=dirMap[btn.dataset.dir];if(d)this.applyDir(d[0],d[1]);};
dpad.addEventListener('pointerdown',this._dpHandler);this._dpEl=dpad;
let sx=0,sy=0;this._d=e=>{sx=e.clientX;sy=e.clientY;};
this._u=e=>{const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
if(Math.abs(dx)>Math.abs(dy))this.applyDir(dx>0?1:-1,0);else this.applyDir(0,dy>0?1:-1);};
this.canvas.addEventListener('pointerdown',this._d);window.addEventListener('pointerup',this._u);}
applyDir(dx,dy){if(dx===-this.dir.x&&dy===-this.dir.y)return;this.nextDir={x:dx,y:dy};}
layout(){this.cell=Math.floor(Math.min((this.w-20)/20,(this.h-190)/24));this.ox=(this.w-this.cols*this.cell)/2;this.oy=60+(this.h-190-this.rows*this.cell)/2;}
reset(){this.snake=[{x:9,y:12},{x:8,y:12},{x:7,y:12}];this.dir={x:1,y:0};this.nextDir={x:1,y:0};
this.acc=0;this.step=0.14;this.score=0;this.food=this.newFood();this.grow=0;this.hue=0;
this.setHud('<div class="pill">امتیاز <b>0</b></div><div class="pill">طول <b>3</b></div>');}
newFood(){let f,g=0;do{f={x:randInt(0,this.cols-1),y:randInt(0,this.rows-1)};g++;}while(g<400&&this.snake.some(s=>s.x===f.x&&s.y===f.y));return f;}
update(dt){if(this.state!=='playing')return;this.hue=(this.hue+dt*28)%360;this.acc+=dt;
if(this.acc<this.step)return;this.acc=0;this.dir={...this.nextDir};
const h={x:this.snake[0].x+this.dir.x,y:this.snake[0].y+this.dir.y};
if(h.x<0||h.x>=this.cols||h.y<0||h.y>=this.rows||this.snake.some((s,i)=>i>0&&s.x===h.x&&s.y===h.y)){
this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.3);
const px=this.ox+this.snake[0].x*this.cell+this.cell/2,py=this.oy+this.snake[0].y*this.cell+this.cell/2;
this.Par.spawn(px,py,45,{color:'#ff2d78',minSpeed:110,maxSpeed:440,gravity:480});
setTimeout(()=>this.finish(),500);return;}
this.snake.unshift(h);
if(h.x===this.food.x&&h.y===this.food.y){this.score+=15;this.grow+=2;this.Snd.coin();this.Hap.ok();
this.food=this.newFood();this.step=Math.max(0.05,this.step-0.004);
const fx=this.ox+h.x*this.cell+this.cell/2,fy=this.oy+h.y*this.cell+this.cell/2;
this.Par.spawn(fx,fy,16,{color:'#2bff88',minSpeed:55,maxSpeed:190,gravity:250});}
if(this.grow>0)this.grow--;else this.snake.pop();
this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">طول <b>${this.snake.length}</b></div>`);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a2e1a');bg.addColorStop(1,'#0a1628');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.strokeStyle='rgba(43,255,136,0.04)';c.lineWidth=1;
for(let i=0;i<=this.cols;i++){const x=this.ox+i*this.cell;c.beginPath();c.moveTo(x,this.oy);c.lineTo(x,this.oy+this.rows*this.cell);c.stroke();}
for(let j=0;j<=this.rows;j++){const y=this.oy+j*this.cell;c.beginPath();c.moveTo(this.ox,y);c.lineTo(this.ox+this.cols*this.cell,y);c.stroke();}
const fx=this.ox+this.food.x*this.cell+this.cell/2,fy=this.oy+this.food.y*this.cell+this.cell/2;
const pl=0.85+Math.sin(nw()/180)*0.15;
c.fillStyle='#2bff88';c.shadowColor='#2bff88';c.shadowBlur=20;
c.beginPath();c.arc(fx,fy,this.cell*0.34*pl,0,TAU);c.fill();c.shadowBlur=0;
for(let i=this.snake.length-1;i>=0;i--){const s=this.snake[i];
const x=this.ox+s.x*this.cell+1.5,y=this.oy+s.y*this.cell+1.5,w=this.cell-3,t=i/Math.max(1,this.snake.length);
if(i===0){c.fillStyle='#00e5ff';c.shadowColor='#00e5ff';c.shadowBlur=14;}
else c.fillStyle=`hsl(${(this.hue+i*5)%360},90%,${60-t*22}%)`;
c.beginPath();if(c.roundRect)c.roundRect(x,y,w,w,w*0.3);else c.rect(x,y,w,w);
c.fill();c.shadowBlur=0;
if(i===0){const es=Math.max(2,w*0.16);c.fillStyle='#03121a';
if(this.dir.x===1){c.fillRect(x+w*0.58,y+w*0.22,es,es);c.fillRect(x+w*0.58,y+w*0.58,es,es);}
else if(this.dir.x===-1){c.fillRect(x+w*0.24,y+w*0.22,es,es);c.fillRect(x+w*0.24,y+w*0.58,es,es);}
else if(this.dir.y===1){c.fillRect(x+w*0.22,y+w*0.58,es,es);c.fillRect(x+w*0.58,y+w*0.58,es,es);}
else{c.fillRect(x+w*0.22,y+w*0.22,es,es);c.fillRect(x+w*0.58,y+w*0.22,es,es);}}}}
destroy(){super.destroy();window.removeEventListener('keydown',this._k);
this.canvas.removeEventListener('pointerdown',this._d);window.removeEventListener('pointerup',this._u);
if(this._dpEl)this._dpEl.removeEventListener('pointerdown',this._dpHandler);}
};

this.games.lumberjack=class extends Base{
init(){this.tx=this.w/2;this.tw=Math.min(this.w*0.18,70);this.trunkTop=this.h*0.2;this.groundY=this.h*0.78;
this.bh=Math.min(50,this.h*0.07);this.side=0;this.chopT=0;this.timer=1;this.drain=0.25;this.score=0;
this.branches=[];this.initB();
this.setHud('<div class="pill">امتیاز <b>0</b></div><div class="pill">⏱ <b>100%</b></div>');
const dp=document.getElementById('dpad');dp.classList.add('on');
this._dpHandler=e=>{e.preventDefault();const b=e.target.closest('button');if(!b)return;
if(b.dataset.dir==='left')this.chop(-1);if(b.dataset.dir==='right')this.chop(1);};
dp.addEventListener('pointerdown',this._dpHandler);this._dpEl=dp;
this._k=e=>{if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();this.chop(-1);}
if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();this.chop(1);}};
window.addEventListener('keydown',this._k);}
initB(){this.branches=[];for(let i=0;i<20;i++){const r=Math.random();let s=0;
if(r<0.4)s=Math.random()<0.5?-1:1;this.branches.push({side:s,y:this.trunkTop+i*this.bh,life:1});}
this.branches[0].side=0;this.branches[1].side=0;}
chop(side){if(this.state!=='playing')return;this.side=side;this.chopT=0.12;const nb=this.branches[1];
if(nb&&nb.side===side){this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.4);
setTimeout(()=>this.finish('شاخه خوردی!',`امتیاز: ${this.score}`),600);return;}
this.score++;this.timer=Math.min(1,this.timer+0.1);this.drain=Math.min(0.7,0.25+this.score*0.003);
this.branches.shift();const lastY=this.branches.length?this.branches[this.branches.length-1].y:this.trunkTop;
const r=Math.random();let ns=0;if(r<0.4)ns=Math.random()<0.5?-1:1;
this.branches.push({side:ns,y:lastY+this.bh,life:1});
this.Snd.chop();this.Hap.med();this.Cam.add(0.06);
this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">⏱ <b>${Math.ceil(this.timer*100)}%</b></div>`);}
update(dt){if(this.state!=='playing')return;if(this.chopT>0)this.chopT=Math.max(0,this.chopT-dt);
this.timer-=this.drain*dt;if(this.timer<=0){this.timer=0;this.state='over';this.Snd.lose();this.Hap.heavy();
setTimeout(()=>this.finish('زمان تمام شد!',`امتیاز: ${this.score}`),600);}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0d2e0d');bg.addColorStop(0.5,'#1a3a1a');bg.addColorStop(1,'#2a1a0a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.fillStyle='#2b1a0e';c.fillRect(this.tx-this.tw/2,this.trunkTop,this.tw,this.groundY-this.trunkTop);
c.fillStyle='#3d2814';c.fillRect(this.tx-this.tw/2,this.trunkTop,this.tw*0.3,this.groundY-this.trunkTop);
for(const b of this.branches){if(b.y>this.groundY||b.y<this.trunkTop-this.bh)continue;if(b.side===0)continue;
const bx=b.side===-1?this.tx-this.tw/2-this.tw*0.6:this.tx+this.tw/2;
c.fillStyle='#4a7c3f';c.shadowColor='#2bff88';c.shadowBlur=6;
c.fillRect(bx,b.y,this.tw*0.6,this.bh*0.35);c.shadowBlur=0;
c.fillStyle='#3d6b33';c.beginPath();c.arc(bx+(b.side===-1?0:this.tw*0.6),b.y+this.bh*0.15,8,0,TAU);c.fill();}
const px=this.side===-1?this.tx-this.tw/2-this.tw*0.4:this.tx+this.tw/2+this.tw*0.4;const py=this.groundY-20;
c.fillStyle='#ffc531';c.beginPath();c.arc(px,py-12,10,0,TAU);c.fill();
c.fillStyle='#2b1a0e';c.fillRect(px-5,py-2,10,18);
c.fillStyle='#c0c8d4';c.fillRect(px+5,py+2,3,14);
c.fillStyle='#8b5a2b';c.fillRect(px+5,py+14,9,3);
c.fillStyle='rgba(0,0,0,0.45)';c.fillRect(this.w*0.1,55,this.w*0.8,8);
c.fillStyle=this.timer<0.3?'#ff2d78':'#2bff88';c.fillRect(this.w*0.1,55,this.w*0.8*this.timer,8);}
destroy(){super.destroy();document.getElementById('dpad').classList.remove('on');
if(this._dpEl)this._dpEl.removeEventListener('pointerdown',this._dpHandler);
window.removeEventListener('keydown',this._k);}
};

this.games.pong=class extends Base{
init(){this.ph=52;this.pw=9;this.p1={x:15,y:this.h/2-this.ph/2};this.p2={x:this.w-24,y:this.h/2-this.ph/2};
this.s1=0;this.s2=0;this.ball={x:this.w/2,y:this.h/2,vx:280,vy:rand(-125,125),r:7};this.ai=3.8;
this.setHud('<div class="pill">شما <b>0</b></div><div class="pill">حریف <b>0</b></div>');
this._m=e=>{const r=this.canvas.getBoundingClientRect();this.p1.y=clamp(e.clientY-r.top-this.ph/2,55,this.h-this.ph);};
this._k=e=>{if(e.key==='ArrowUp'||e.key==='w'){e.preventDefault();this.p1.y=clamp(this.p1.y-30,55,this.h-this.ph);}
if(e.key==='ArrowDown'||e.key==='s'){e.preventDefault();this.p1.y=clamp(this.p1.y+30,55,this.h-this.ph);}};
this.canvas.addEventListener('pointermove',this._m);window.addEventListener('keydown',this._k);}
setHud(h){if(this.hudEl.innerHTML!==h)this.hudEl.innerHTML=h;}
reset(){this.ball.x=this.w/2;this.ball.y=this.h/2;this.ball.vx=rand([-300,300]);this.ball.vy=rand(-135,135);this.Snd.t(300,0.06,'sine',0.06);}
update(dt){if(this.state!=='playing')return;const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
if(b.y-b.r<55){b.y=b.r+55;b.vy*=-1;}
if(b.y+b.r>this.h){b.y=this.h-b.r;b.vy*=-1;}
if(b.x-b.r<this.p1.x+this.pw&&b.y>this.p1.y&&b.y<this.p1.y+this.ph){b.vx=Math.abs(b.vx);this.Snd.t(620,0.035,'square',0.06);}
if(b.x+b.r>this.p2.x&&b.y>this.p2.y&&b.y<this.p2.y+this.ph){b.vx=-Math.abs(b.vx);this.Snd.t(620,0.035,'square',0.06);}
const predY=b.y+(b.vy*Math.abs((this.p2.x-b.x)/Math.max(1,Math.abs(b.vx))));
this.p2.y=lerp(this.p2.y,predY-this.ph/2,dt*this.ai);this.p2.y=clamp(this.p2.y,55,this.h-this.ph);
if(b.x<0){this.s2++;this.setHud(`<div class="pill">شما <b>${this.s1}</b></div><div class="pill">حریف <b>${this.s2}</b></div>`);this.reset();}
if(b.x>this.w){this.s1++;this.setHud(`<div class="pill">شما <b>${this.s1}</b></div><div class="pill">حریف <b>${this.s2}</b></div>`);this.reset();}
if(this.s1>=5||this.s2>=5){this.state='over';this.Snd.lose();this.Hap.heavy();setTimeout(()=>this.finish(),550);}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,0);
bg.addColorStop(0,'#0a1628');bg.addColorStop(0.5,'#1a0a2e');bg.addColorStop(1,'#0a1628');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.fillStyle='#00e5ff';c.fillRect(this.p1.x,this.p1.y,this.pw,this.ph);
c.fillStyle='#ff2d78';c.fillRect(this.p2.x,this.p2.y,this.pw,this.ph);
c.fillStyle='#fff';c.shadowColor='#ffc531';c.shadowBlur=14;
c.beginPath();c.arc(this.ball.x,this.ball.y,this.ball.r,0,TAU);c.fill();c.shadowBlur=0;
c.strokeStyle='rgba(255,255,255,0.06)';c.setLineDash([8,10]);
c.beginPath();c.moveTo(this.w/2,55);c.lineTo(this.w/2,this.h);c.stroke();c.setLineDash([]);}
destroy(){super.destroy();this.canvas.removeEventListener('pointermove',this._m);window.removeEventListener('keydown',this._k);}
};

this.games.tetris=class extends Base{
init(){this.layout();
this.shapes={I:[[1,1,1,1]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1]],S:[[0,1,1],[1,1,0]],Z:[[1,1,0],[0,1,1]],J:[[1,0,0],[1,1,1]],L:[[0,0,1],[1,1,1]]};
this.colors={I:'#00e5ff',O:'#ffc531',T:'#a855f7',S:'#2bff88',Z:'#ff2d78',J:'#0088cc',L:'#ff7a00'};
this.board=Array.from({length:20},()=>Array(10).fill(0));
this.score=0;this.dropAcc=0;this.dropInt=0.85;this.bag=[];this.next=[];this.piece=null;
this.soft=false;this.clearRows=[];this.clearT=0;this.lines=0;this.spawn();
this.setHud('<div class="pill">امتیاز <b>0</b></div><div class="pill">خط <b>0</b></div>');
this._k=e=>{if(this.state!=='playing')return;const k=e.key.toLowerCase();
if(k==='arrowleft'||k==='a'){e.preventDefault();this.move(-1);}
if(k==='arrowright'||k==='d'){e.preventDefault();this.move(1);}
if(k==='arrowup'||k==='w'){e.preventDefault();this.rotate();}
if(k==='arrowdown'||k==='s'){e.preventDefault();this.soft=true;}
if(k===' '){e.preventDefault();this.hardDrop();}};
this._ku=e=>{const k=e.key.toLowerCase();if(k==='arrowdown'||k==='s')this.soft=false;};
window.addEventListener('keydown',this._k);window.addEventListener('keyup',this._ku);}
layout(){this.cell=Math.floor(Math.min((this.w-140)/10,(this.h-130)/20));this.gw=this.cell*10;this.gh=this.cell*20;
this.bx=(this.w-this.gw)/2-28;this.by=60+(this.h-130-this.gh)/2;}
refill(){this.bag=Object.keys(this.shapes).sort(()=>Math.random()-0.5);}
pull(){if(!this.bag.length)this.refill();return this.bag.pop();}
spawn(){while(this.next.length<3)this.next.push(this.pull());const tp=this.next.shift();this.next.push(this.pull());
const sh=this.shapes[tp];this.piece={type:tp,shape:sh.map(r=>r.slice()),x:Math.floor((10-sh[0].length)/2),y:0};
if(this.collide(this.piece.shape,this.piece.x,this.piece.y)){this.state='over';this.Snd.lose();this.Hap.heavy();setTimeout(()=>this.finish(),550);}}
collide(sh,px,py){for(let r=0;r<sh.length;r++)for(let c=0;c<sh[r].length;c++){
if(!sh[r][c])continue;const x=px+c,y=py+r;if(x<0||x>=10||y>=20)return true;if(y>=0&&this.board[y][x])return true;}return false;}
move(dx){if(!this.piece)return;if(!this.collide(this.piece.shape,this.piece.x+dx,this.piece.y)){this.piece.x+=dx;this.Snd.ui();}}
rotate(){if(!this.piece)return;const s=this.piece.shape;const r=s[0].map((_,i)=>s.map(row=>row[i]).reverse());
for(const k of[0,-1,1,-2,2])if(!this.collide(r,this.piece.x+k,this.piece.y)){this.piece.shape=r;this.piece.x+=k;this.Snd.ui();return;}}
hardDrop(){if(!this.piece)return;let d=0;while(!this.collide(this.piece.shape,this.piece.x,this.piece.y+1)){this.piece.y++;d++;}
this.score+=d*2;this.Snd.t(240,0.09,'square',0.07);this.Hap.med();this.lock();}
lock(){if(!this.piece)return;
for(let r=0;r<this.piece.shape.length;r++)for(let c=0;c<this.piece.shape[r].length;c++){
if(this.piece.shape[r][c]){const x=this.piece.x+c,y=this.piece.y+r;if(y>=0)this.board[y][x]=this.colors[this.piece.type];}}
this.piece=null;const full=[];for(let r=0;r<20;r++)if(this.board[r].every(v=>v))full.push(r);
if(full.length){this.clearRows=full;this.clearT=0.26;this.Snd.win();this.Hap.success();this.Cam.add(0.3);
this.score+=[0,100,300,500,800][full.length]||800;this.lines+=full.length;
this.dropInt=Math.max(0.1,0.85-this.lines*0.02);
this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">خط <b>${this.lines}</b></div>`);}
else this.spawn();}
applyClear(){for(const r of this.clearRows)for(let c=0;c<10;c++){const x=this.bx+c*this.cell+this.cell/2,y=this.by+r*this.cell+this.cell/2;
this.Par.spawn(x,y,7,{color:this.board[r][c],minSpeed:65,maxSpeed:220,gravity:380});}
this.clearRows.sort((a,b)=>a-b);for(const r of this.clearRows){this.board.splice(r,1);this.board.unshift(Array(10).fill(0));}
this.clearRows=[];this.clearT=0;this.spawn();}
update(dt){if(this.state!=='playing')return;
if(this.clearRows.length){this.clearT-=dt;if(this.clearT<=0)this.applyClear();return;}
if(!this.piece)return;this.dropAcc+=dt;const iv=this.soft?0.042:this.dropInt;
if(this.dropAcc>=iv){this.dropAcc=0;if(!this.collide(this.piece.shape,this.piece.x,this.piece.y+1))this.piece.y++;else this.lock();}}
db(c,x,y,s,col){const g=c.createLinearGradient(x,y,x+s,y+s);g.addColorStop(0,this.lt(col,40));g.addColorStop(1,this.dk(col,45));
c.fillStyle=g;c.beginPath();if(c.roundRect)c.roundRect(x+1,y+1,s-2,s-2,4);else c.rect(x+1,y+1,s-2,s-2);
c.fill();c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=1;c.stroke();}
lt(h,a){const x=h.replace('#','');return'#'+[0,2,4].map(i=>Math.min(255,parseInt(x.substr(i,2),16)+a).toString(16).padStart(2,'0')).join('');}
dk(h,a){const x=h.replace('#','');return'#'+[0,2,4].map(i=>Math.max(0,parseInt(x.substr(i,2),16)-a).toString(16).padStart(2,'0')).join('');}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#1a0a2e');bg.addColorStop(1,'#0a0a1a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.fillStyle='rgba(0,0,0,0.55)';c.fillRect(this.bx-5,this.by-5,this.gw+10,this.gh+10);
c.strokeStyle='rgba(168,85,247,0.4)';c.lineWidth=2;c.strokeRect(this.bx-5,this.by-5,this.gw+10,this.gh+10);
for(let r=0;r<20;r++)for(let cc=0;cc<10;cc++){const x=this.bx+cc*this.cell,y=this.by+r*this.cell;
if(this.board[r][cc])this.db(c,x,y,this.cell,this.board[r][cc]);
else{c.strokeStyle='rgba(255,255,255,0.03)';c.lineWidth=1;c.strokeRect(x+0.5,y+0.5,this.cell-1,this.cell-1);}}
for(const r of this.clearRows){c.fillStyle=`rgba(255,255,255,${0.5+Math.random()*0.4})`;c.fillRect(this.bx,this.by+r*this.cell,this.gw,this.cell);}
if(this.piece){let gy=this.piece.y;while(!this.collide(this.piece.shape,this.piece.x,gy+1))gy++;
for(let r=0;r<this.piece.shape.length;r++)for(let cc=0;cc<this.piece.shape[r].length;cc++){
if(!this.piece.shape[r][cc])continue;const x=this.bx+(this.piece.x+cc)*this.cell,y=this.by+(gy+r)*this.cell;
c.strokeStyle=this.colors[this.piece.type];c.lineWidth=2;c.strokeRect(x+3,y+3,this.cell-6,this.cell-6);}
for(let r=0;r<this.piece.shape.length;r++)for(let cc=0;cc<this.piece.shape[r].length;cc++){
if(this.piece.shape[r][cc]){const x=this.bx+(this.piece.x+cc)*this.cell,y=this.by+(this.piece.y+r)*this.cell;this.db(c,x,y,this.cell,this.colors[this.piece.type]);}}}}
destroy(){super.destroy();window.removeEventListener('keydown',this._k);window.removeEventListener('keyup',this._ku);}
};

this.games.flappy=class extends Base{
init(){this.groundY=this.h-70;this.bx=this.w*0.28;this.by=this.h/2;this.bvy=0;
this.br=Math.min(16,this.w*0.035);this.pipes=[];this.st=0;this.score=0;
this.gapH=Math.max(145,this.h*0.29);this.pw=Math.max(56,this.w*0.15);this.spawnInt=1.45;
this.hud();
this._j=()=>{if(this.state!=='playing')return;this.bvy=-510;this.Snd.t(540,0.06,'sine',0.095,760);this.Hap.ok();
this.Par.spawn(this.bx-this.br,this.by+4,5,{color:'#00e5ff',minSpeed:30,maxSpeed:100,angle:Math.PI,spread:1,gravity:100});};
this.canvas.addEventListener('pointerdown',this._j);
this._k=e=>{if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();this._j();}};
window.addEventListener('keydown',this._k);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
spawn(){const m=52;const gy=rand(this.gapH/2+m,this.groundY-this.gapH/2-m);this.pipes.push({x:this.w+26,gy,sc:false});}
update(dt){if(this.state!=='playing')return;this.bvy+=1600*dt;this.by+=this.bvy*dt;
if(this.by-this.br<55){this.by=this.br+55;this.bvy=0;}
if(this.by+this.br>this.groundY)return this.die();
this.st+=dt;if(this.st>this.spawnInt){this.st=0;this.spawn();}
for(const p of this.pipes){p.x-=228*dt;
if(!p.sc&&p.x+this.pw<this.bx-this.br){p.sc=true;this.score++;this.Snd.coin();this.Hap.ok();this.hud();
this.spawnInt=Math.max(1.0,1.45-this.score*0.02);}
if(this.bx+this.br>p.x&&this.bx-this.br<p.x+this.pw){
if(this.by-this.br<p.gy-this.gapH/2||this.by+this.br>p.gy+this.gapH/2)return this.die();}}
this.pipes=this.pipes.filter(p=>p.x>-this.pw-32);}
die(){if(this.state!=='playing')return;this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.2);
this.Par.spawn(this.bx,this.by,34,{color:'#ffc531',minSpeed:100,maxSpeed:360,gravity:460});setTimeout(()=>this.finish(),600);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a2e4a');bg.addColorStop(1,'#1a3a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(const p of this.pipes){const th=p.gy-this.gapH/2,by=p.gy+this.gapH/2;
const g=c.createLinearGradient(p.x,0,p.x+this.pw,0);
g.addColorStop(0,'#1fae6a');g.addColorStop(0.5,'#2bff88');g.addColorStop(1,'#1a8a55');
c.fillStyle=g;c.shadowColor='#2bff88';c.shadowBlur=12;
c.fillRect(p.x,55,this.pw,th-55);c.fillRect(p.x,by,this.pw,this.groundY-by);
c.shadowBlur=0;c.fillStyle='#23c977';c.fillRect(p.x-3,th-15,this.pw+6,15);c.fillRect(p.x-3,by,this.pw+6,15);}
c.fillStyle='#ffc531';c.shadowColor='#ffc531';c.shadowBlur=16;
c.beginPath();c.ellipse(this.bx,this.by,this.br*1.24,this.br,0,0,TAU);c.fill();c.shadowBlur=0;
c.fillStyle='#fff';c.beginPath();c.arc(this.bx+this.br*0.36,this.by-this.br*0.15,this.br*0.29,0,TAU);c.fill();
c.fillStyle='#04101a';c.beginPath();c.arc(this.bx+this.br*0.46,this.by-this.br*0.15,this.br*0.11,0,TAU);c.fill();
c.fillStyle='#ff7a00';c.beginPath();c.moveTo(this.bx+this.br,this.by);
c.lineTo(this.bx+this.br*1.46,this.by+this.br*0.13);c.lineTo(this.bx+this.br,this.by+this.br*0.26);c.closePath();c.fill();}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._j);window.removeEventListener('keydown',this._k);}
};

this.games.breakout=class extends Base{
init(){this.pw=this.w*0.23;this.ph=13;this.py=this.h-75;this.px=(this.w-this.pw)/2;this.br=8;
this.ball={x:this.w/2,y:this.py-20,vx:0,vy:0,sp:430};this.ln=false;this.bricks=[];this.score=0;this.lives=3;
this.build();this.hud();
this._m=e=>{const r=this.canvas.getBoundingClientRect();this.px=clamp(e.clientX-r.left-this.pw/2,0,this.w-this.pw);};
this._t=e=>{this._m(e);if(!this.ln&&this.state==='playing'){this.ln=true;this.ball.vx=rand(-195,195);this.ball.vy=-this.ball.sp;this.Snd.t(600,0.06,'sine',0.095);}};
this.canvas.addEventListener('pointerdown',this._t);this.canvas.addEventListener('pointermove',this._m);}
build(){const cols=9,bw=(this.w-42)/cols,bh=21;const pal=['#00e5ff','#ff2d78','#ffc531','#a855f7','#2bff88'];
for(let r=0;r<5;r++)for(let c=0;c<cols;c++)this.bricks.push({x:21+c*bw+2,y:76+r*(bh+5),w:bw-4,h:bh,color:pal[r],alive:true});}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">❤️ ${this.lives}</div>`);}
update(dt){if(this.state!=='playing')return;if(!this.ln){this.ball.x=this.px+this.pw/2;this.ball.y=this.py-20;return;}
const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
if(b.x-this.br<0){b.x=this.br;b.vx*=-1;this.Snd.t(400,0.03,'square',0.04);}
if(b.x+this.br>this.w){b.x=this.w-this.br;b.vx*=-1;this.Snd.t(400,0.03,'square',0.04);}
if(b.y-this.br<55){b.y=this.br+55;b.vy*=-1;this.Snd.t(400,0.03,'square',0.04);}
if(b.y+this.br>this.py&&b.x>this.px&&b.x<this.px+this.pw&&b.vy>0){
const hit=(b.x-this.px)/this.pw,ang=(hit-0.5)*Math.PI*0.85,sp=Math.hypot(b.vx,b.vy);
b.vx=Math.sin(ang)*sp;b.vy=-Math.abs(Math.cos(ang)*sp);b.y=this.py-this.br;
this.Snd.t(700,0.05,'sine',0.08);this.Hap.ok();}
for(const br of this.bricks){if(!br.alive)continue;
if(b.x+this.br>br.x&&b.x-this.br<br.x+br.w&&b.y+this.br>br.y&&b.y-this.br<br.y+br.h){
br.alive=false;this.score+=25;this.Snd.t(820,0.035,'square',0.075);this.Hap.ok();this.Cam.add(0.08);
this.Par.spawn(br.x+br.w/2,br.y+br.h/2,10,{color:br.color,minSpeed:60,maxSpeed:220,gravity:360});
if(Math.abs(b.x-(br.x+br.w/2))/br.w>Math.abs(b.y-(br.y+br.h/2))/br.h)b.vx*=-1;else b.vy*=-1;
this.ball.sp=Math.min(700,this.ball.sp+8);this.hud();break;}}
if(b.y-this.br>this.h){this.lives--;this.Snd.hit();this.Hap.heavy();this.Cam.add(0.8);this.hud();
if(this.lives<=0){this.state='over';setTimeout(()=>this.finish(),550);}
else{this.ln=false;this.ball.x=this.w/2;this.ball.y=this.py-20;this.ball.vx=0;this.ball.vy=0;this.px=(this.w-this.pw)/2;}}
if(this.bricks.every(br=>!br.alive)){this.Snd.win();this.Hap.success();this.finish('مرحله تمام!','+۲۰۰ امتیاز');}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a0a2e');bg.addColorStop(1,'#2e0a1a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(const br of this.bricks){if(!br.alive)continue;
const g=c.createLinearGradient(br.x,br.y,br.x,br.y+br.h);
g.addColorStop(0,br.color);g.addColorStop(1,'rgba(0,0,0,0.5)');
c.fillStyle=g;c.shadowColor=br.color;c.shadowBlur=5;
c.beginPath();if(c.roundRect)c.roundRect(br.x,br.y,br.w,br.h,4);else c.rect(br.x,br.y,br.w,br.h);
c.fill();c.shadowBlur=0;}
c.fillStyle='#00e5ff';c.shadowColor='#00e5ff';c.shadowBlur=14;
c.beginPath();if(c.roundRect)c.roundRect(this.px,this.py,this.pw,this.ph,6);else c.rect(this.px,this.py,this.pw,this.ph);
c.fill();c.shadowBlur=0;
c.fillStyle='#fff';c.shadowColor='#ffc531';c.shadowBlur=12;
c.beginPath();c.arc(this.ball.x,this.ball.y,this.br,0,TAU);c.fill();c.shadowBlur=0;
if(!this.ln){c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(this.w/2-100,this.h/2-20,200,36);
c.fillStyle='#fff';c.font='bold 13px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText('برای شلیک ضربه بزن',this.w/2,this.h/2);}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._t);this.canvas.removeEventListener('pointermove',this._m);}
};

this.games['2048']=class extends Base{
init(){this.layout();this.grid=Array.from({length:4},()=>Array(4).fill(0));
this.score=0;this.add();this.add();this.hud();
this._k=e=>{const m={arrowleft:'L',arrowright:'R',arrowup:'U',arrowdown:'D',a:'L',d:'R',w:'U',s:'D'};
const d=m[e.key.toLowerCase()];if(!d)return;e.preventDefault();this.slide(d);};
window.addEventListener('keydown',this._k);
this._sx=0;this._sy=0;
this._d=e=>{this._sx=e.clientX;this._sy=e.clientY;};
this._u=e=>{const dx=e.clientX-this._sx,dy=e.clientY-this._sy;
if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
if(Math.abs(dx)>Math.abs(dy))this.slide(dx>0?'R':'L');else this.slide(dy>0?'D':'U');};
this.canvas.addEventListener('pointerdown',this._d);this.canvas.addEventListener('pointerup',this._u);}
layout(){this.cell=Math.floor(Math.min((this.w-40)/4,(this.h-170)/4));this.gap=Math.max(4,this.cell*0.07);
this.gx=(this.w-(this.cell*4+this.gap*3))/2;this.gy=80;}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
add(){const em=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!this.grid[r][c])em.push([r,c]);
if(!em.length)return;const[r,c]=em[randInt(0,em.length-1)];this.grid[r][c]=Math.random()<0.9?2:4;}
slide(dir){if(this.state!=='playing')return;let moved=false;const b=this.grid.map(r=>r.slice());
const comb=line=>{const a=line.filter(v=>v),out=[];
for(let i=0;i<a.length;i++){if(i<a.length-1&&a[i]===a[i+1]){const v=a[i]*2;out.push(v);this.score+=v;i++;moved=true;}
else out.push(a[i]);}while(out.length<4)out.push(0);return out;};
if(dir==='L'||dir==='R'){for(let r=0;r<4;r++){let row=b[r].slice();if(dir==='R')row.reverse();
row=comb(row);if(dir==='R')row.reverse();if(row.join()!==b[r].join())moved=true;b[r]=row;}}
else{for(let c=0;c<4;c++){let col=b.map(r=>r[c]);if(dir==='D')col.reverse();
col=comb(col);if(dir==='D')col.reverse();
for(let r=0;r<4;r++){if(b[r][c]!==col[r])moved=true;b[r][c]=col[r];}}}
if(!moved)return;this.grid=b;this.add();this.hud();this.Snd.t(500,0.06,'triangle',0.06);this.Hap.ok();
if(this.grid.flat().includes(2048)){this.finish('برنده!','به ۲۰۴۸ رسیدی');return;}
if(this.dead()){this.state='over';this.Snd.lose();this.Hap.heavy();setTimeout(()=>this.finish(),550);}}
dead(){for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(!this.grid[r][c])return false;
if(c<3&&this.grid[r][c]===this.grid[r][c+1])return false;
if(r<3&&this.grid[r][c]===this.grid[r+1][c])return false;}return true;}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#0a2e1a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
const cols={2:'#1a2a4a',4:'#1f3a5a',8:'#2a5a6a',16:'#2a7a6a',32:'#3a9a5a',64:'#5aba3a',128:'#9aca2a',256:'#daca2a',512:'#eaaa2a',1024:'#ea7a2a',2048:'#ea3a5a'};
for(let r=0;r<4;r++)for(let cc=0;cc<4;cc++){const v=this.grid[r][cc];
const x=this.gx+cc*(this.cell+this.gap),y=this.gy+r*(this.cell+this.gap);
c.fillStyle=v?(cols[v]||'#ff2d78'):'rgba(255,255,255,0.03)';
c.beginPath();if(c.roundRect)c.roundRect(x,y,this.cell,this.cell,8);else c.rect(x,y,this.cell,this.cell);
c.fill();
if(v){if(v>=8){c.shadowColor=cols[v];c.shadowBlur=10;}
c.fillStyle=v>=8?'#fff':'#c5d5e8';c.font=`900 ${Math.max(13,this.cell*0.32)}px Tahoma`;
c.textAlign='center';c.textBaseline='middle';c.fillText(v,x+this.cell/2,y+this.cell/2);c.shadowBlur=0;}}}
destroy(){super.destroy();window.removeEventListener('keydown',this._k);
this.canvas.removeEventListener('pointerdown',this._d);this.canvas.removeEventListener('pointerup',this._u);}
};

this.games.memory=class extends Base{
init(){this.layout();
const ico=['🍎','🍌','🍇','🍉','🍓','🍒','🥝','🍍'];
this.cards=[...ico,...ico].sort(()=>Math.random()-0.5).map(e=>({e,f:false,m:false,fa:0,ea:0}));
this.op=[];this.lock=true;this.score=0;this.mv=0;this.rev=2;
this.setHud('<div class="pill">امتیاز <b>0</b></div><div class="pill">جفت <b>0/8</b></div>');
this._c=e=>{if(this.state!=='playing'||this.lock)return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const c=Math.floor((x-this.gx)/this.cell),rr=Math.floor((y-this.gy)/this.cell);
if(c>=0&&c<4&&rr>=0&&rr<4)this.flip(rr*4+c);};
this.canvas.addEventListener('pointerdown',this._c);}
layout(){this.cell=Math.floor(Math.min((this.w-28)/4,(this.h-160)/4));
this.gx=(this.w-this.cell*4)/2;this.gy=90;}
flip(i){const cr=this.cards[i];if(cr.f||cr.m)return;
cr.f=true;cr.fa=1;this.op.push(i);this.Snd.t(620,0.04,'sine',0.07);this.Hap.ok();
if(this.op.length===2){this.lock=true;this.mv++;
const[a,b]=this.op;
if(this.cards[a].e===this.cards[b].e){
setTimeout(()=>{this.cards[a].m=this.cards[b].m=true;this.score+=100;
this.Snd.win();this.Hap.success();this.Cam.add(0.15);
const ax=this.gx+(a%4)*this.cell+this.cell/2,ay=this.gy+Math.floor(a/4)*this.cell+this.cell/2;
const bx=this.gx+(b%4)*this.cell+this.cell/2,by=this.gy+Math.floor(b/4)*this.cell+this.cell/2;
this.Par.spawn(ax,ay,14,{color:'#2bff88',minSpeed:60,maxSpeed:190,gravity:260});
this.Par.spawn(bx,by,14,{color:'#2bff88',minSpeed:60,maxSpeed:190,gravity:260});
this.op=[];this.lock=false;
this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">جفت <b>${this.cards.filter(c=>c.m).length/2}/8</b></div>`);
if(this.cards.every(c=>c.m))this.finish('آفرین!',`در ${this.mv} حرکت`);},380);}
else{this.cards[a].ea=this.cards[b].ea=1;
this.Snd.hit();this.Hap.med();this.score=Math.max(0,this.score-15);
setTimeout(()=>{this.cards[a].f=this.cards[b].f=false;
this.cards[a].ea=this.cards[b].ea=0;this.op=[];this.lock=false;},750);}}}
update(dt){if(this.state!=='playing')return;
if(this.rev>0){this.rev-=dt;
if(this.rev<=0){this.cards.forEach(c=>{if(!c.m)c.f=false;});
this.lock=false;this.Snd.t(380,0.12,'triangle',0.07);}}
for(const c of this.cards){if(c.fa>0)c.fa=Math.max(0,c.fa-dt*4);
if(c.ea>0)c.ea=Math.max(0,c.ea-dt*2.5);}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1a2e');bg.addColorStop(1,'#2a0a1a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(let i=0;i<16;i++){const cd=this.cards[i];
let x=this.gx+(i%4)*this.cell+4,y=this.gy+Math.floor(i/4)*this.cell+4;
const w=this.cell-8;let sx=1;
if(cd.fa>0)sx=Math.abs(Math.cos(cd.fa*Math.PI));
if(cd.ea>0)x+=Math.sin(cd.ea*55)*5;
c.save();c.translate(x+w/2,y+w/2);c.scale(sx,1);c.translate(-x-w/2,-y-w/2);
if(cd.m){c.fillStyle='rgba(43,255,136,0.1)';c.strokeStyle='#2bff88';c.lineWidth=2;}
else if(cd.ea>0){c.fillStyle='rgba(255,45,120,0.1)';c.strokeStyle='#ff2d78';c.lineWidth=2;}
else if(cd.f||cd.fa>0.45){c.fillStyle='rgba(0,229,255,0.08)';c.strokeStyle='#00e5ff';c.lineWidth=2;}
else{const g=c.createLinearGradient(x,y,x+w,y+w);
g.addColorStop(0,'#131f36');g.addColorStop(1,'#0a0f1c');
c.fillStyle=g;c.strokeStyle='rgba(0,229,255,0.12)';c.lineWidth=1;}
c.beginPath();if(c.roundRect)c.roundRect(x,y,w,w,10);else c.rect(x,y,w,w);
c.fill();c.stroke();
if(cd.f||cd.m){c.font=`${w*0.48}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(cd.e,x+w/2,y+w/2);}
else{c.fillStyle='rgba(0,229,255,0.28)';c.font=`bold ${w*0.34}px Tahoma`;
c.textAlign='center';c.textBaseline='middle';c.fillText('?',x+w/2,y+w/2);}c.restore();}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.minesweeper=class extends Base{
init(){this.cols=8;this.rows=8;this.mines=10;this.layout();
this.board=Array.from({length:8},()=>Array.from({length:8},()=>({mine:false,o:false,f:false,adj:0,an:0})));
let p=0;while(p<this.mines){const r=randInt(0,7),c=randInt(0,7);
if(!this.board[r][c].mine){this.board[r][c].mine=true;p++;}}
for(let r=0;r<8;r++)for(let c=0;c<8;c++){
if(this.board[r][c].mine)continue;let n=0;
for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
const nr=r+dr,nc=c+dc;
if(nr>=0&&nr<8&&nc>=0&&nc<8&&this.board[nr][nc].mine)n++;}
this.board[r][c].adj=n;}
this.opened=0;this.flags=0;this.st=Date.now();this.hud();
this._c=e=>{if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const c=Math.floor((x-this.gx)/this.cell),rr=Math.floor((y-this.gy)/this.cell);
if(c>=0&&c<8&&rr>=0&&rr<8)this.open(rr,c);};
this._ctx=e=>{e.preventDefault();if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const c=Math.floor((x-this.gx)/this.cell),rr=Math.floor((y-this.gy)/this.cell);
if(c>=0&&c<8&&rr>=0&&rr<8)this.flag(rr,c);};
this.canvas.addEventListener('pointerdown',this._c);
this.canvas.addEventListener('contextmenu',this._ctx);}
layout(){this.cell=Math.floor(Math.min((this.w-28)/8,(this.h-140)/8));
this.gx=(this.w-this.cell*8)/2;this.gy=90;}
hud(){this.setHud(`<div class="pill">🚩 <b>${this.mines-this.flags}</b></div><div class="pill">⏱ <b>${Math.floor((Date.now()-this.st)/1000)}s</b></div><div class="pill">کشف <b>${this.opened}/${64-this.mines}</b></div>`);}
flag(r,c){const cl=this.board[r][c];if(cl.o)return;
if(!cl.f&&this.flags>=this.mines)return;
cl.f=!cl.f;this.flags+=cl.f?1:-1;this.Snd.t(420,0.04,'square',0.06);this.hud();}
open(r,c){const cl=this.board[r][c];if(cl.o||cl.f)return;
if(cl.mine){cl.o=true;this.state='over';this.Snd.hit();this.Snd.lose();this.Hap.heavy();this.Cam.add(1.6);
this.board.forEach(row=>row.forEach(cc=>{if(cc.mine)cc.o=true;}));
const hx=this.gx+c*this.cell+this.cell/2,hy=this.gy+r*this.cell+this.cell/2;
this.Par.spawn(hx,hy,50,{color:'#ff2d78',minSpeed:140,maxSpeed:550,gravity:650,minSize:3,maxSize:7});
setTimeout(()=>this.finish('باختی!','روی مین کلیک کردی'),950);return;}
this.flood(r,c);this.hud();
if(this.opened===64-this.mines){this.state='over';this.Snd.win();this.Hap.success();this.Cam.add(0.4);
setTimeout(()=>this.finish('بردی!','همه خانه‌های امن باز شدند'),600);}}
flood(r,c){const st=[[r,c]];
while(st.length){const[rr,cc]=st.pop();const cl=this.board[rr][cc];
if(cl.o||cl.f||cl.mine)continue;
cl.o=true;cl.an=1;this.opened++;
if(cl.adj===0){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
if(!dr&&!dc)continue;const nr=rr+dr,nc=cc+dc;
if(nr>=0&&nr<8&&nc>=0&&nc<8&&!this.board[nr][nc].o)st.push([nr,nc]);}}}}
update(dt){if(this.state!=='playing')return;this.hud();
for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(this.board[r][c].an>0)this.board[r][c].an=Math.max(0,this.board[r][c].an-dt*5);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#1a0a2e');bg.addColorStop(1,'#0a1628');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
const cols=['','#00e5ff','#2bff88','#ffc531','#ff7a00','#ff2d78','#a855f7','#fff','#ff0055'];
for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++){const cl=this.board[r][cc];
const x=this.gx+cc*this.cell+2,y=this.gy+r*this.cell+2,w=this.cell-4;
const sc=1+Math.sin(cl.an*Math.PI)*0.1;
c.save();c.translate(x+w/2,y+w/2);c.scale(sc,sc);c.translate(-x-w/2,-y-w/2);
if(cl.o){if(cl.mine){c.fillStyle='rgba(255,0,85,0.22)';c.beginPath();
if(c.roundRect)c.roundRect(x,y,w,w,6);else c.rect(x,y,w,w);c.fill();
c.font=`${w*0.54}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText('💣',x+w/2,y+w/2);}
else{c.fillStyle='rgba(0,229,255,0.03)';c.beginPath();
if(c.roundRect)c.roundRect(x,y,w,w,6);else c.rect(x,y,w,w);c.fill();
if(cl.adj>0){c.fillStyle=cols[cl.adj];c.font=`bold ${w*0.44}px Tahoma`;
c.textAlign='center';c.textBaseline='middle';c.fillText(cl.adj,x+w/2,y+w/2);}}}
else{const g=c.createLinearGradient(x,y,x+w,y+w);
g.addColorStop(0,'#131f36');g.addColorStop(1,'#0a0f1c');
c.fillStyle=g;c.beginPath();
if(c.roundRect)c.roundRect(x,y,w,w,6);else c.rect(x,y,w,w);c.fill();
c.strokeStyle='rgba(0,229,255,0.08)';c.lineWidth=1;c.stroke();
if(cl.f){c.font=`${w*0.44}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText('🚩',x+w/2,y+w/2);}}
c.restore();}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);
this.canvas.removeEventListener('contextmenu',this._ctx);}
};

this.games.tictactoe=class extends Base{
init(){this.cell=Math.min(this.w,this.h)*0.21;this.gx=(this.w-this.cell*3)/2;this.gy=(this.h-this.cell*3)/2;
this.b=Array(9).fill('');this.turn='X';this.done=false;
this.setHud('<div class="pill">نوبت: <b>X</b></div>');
this._c=e=>{if(this.done||this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const c=Math.floor((x-this.gx)/this.cell),rr=Math.floor((y-this.gy)/this.cell);
if(c>=0&&c<3&&rr>=0&&rr<3)this.play(rr*3+c);};
this.canvas.addEventListener('pointerdown',this._c);}
play(i){if(this.b[i]||this.done)return;this.b[i]=this.turn;this.Snd.t(620,0.035,'sine',0.07);this.Hap.ok();
if(this.win(this.turn)){this.done=true;this.setHud(`<div class="pill">برنده: <b>${this.turn}</b></div>`);
this.Snd.win();this.Hap.success();this.Cam.add(0.22);
setTimeout(()=>this.finish(this.turn==='X'?'بردی!':'باختی!'),600);return;}
if(this.b.every(v=>v)){this.done=true;setTimeout(()=>this.finish('مساوی!','حرکتی نماند'),500);return;}
this.turn=this.turn==='X'?'O':'X';this.setHud(`<div class="pill">نوبت: <b>${this.turn}</b></div>`);
if(this.turn==='O')setTimeout(()=>this.ai(),270);}
win(p){const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
return w.some(([a,b,c])=>this.b[a]===p&&this.b[b]===p&&this.b[c]===p);}
ai(){if(this.done)return;const em=this.b.map((v,i)=>v?-1:i).filter(i=>i>=0);
const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
for(const[a,b,c]of w){
if(this.b[a]==='O'&&this.b[b]==='O'&&!this.b[c])return this.play(c);
if(this.b[a]==='X'&&this.b[b]==='X'&&!this.b[c])return this.play(c);}
if(!this.b[4])return this.play(4);
const co=[0,2,6,8].filter(i=>!this.b[i]);
if(co.length)return this.play(co[randInt(0,co.length-1)]);
this.play(em[randInt(0,em.length-1)]);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a1a0a');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.strokeStyle='rgba(0,229,255,0.26)';c.lineWidth=3;
for(let i=1;i<3;i++){c.beginPath();c.moveTo(this.gx+i*this.cell,this.gy);
c.lineTo(this.gx+i*this.cell,this.gy+this.cell*3);c.stroke();
c.beginPath();c.moveTo(this.gx,this.gy+i*this.cell);
c.lineTo(this.gx+this.cell*3,this.gy+i*this.cell);c.stroke();}
for(let i=0;i<9;i++){if(!this.b[i])continue;
const x=this.gx+(i%3)*this.cell+this.cell/2,y=this.gy+Math.floor(i/3)*this.cell+this.cell/2;
c.fillStyle=this.b[i]==='X'?'#00e5ff':'#ff2d78';
c.shadowColor=c.fillStyle;c.shadowBlur=14;
c.font=`bold ${this.cell*0.42}px Tahoma`;c.textAlign='center';c.textBaseline='middle';
c.fillText(this.b[i],x,y);c.shadowBlur=0;}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.connect4=class extends Base{
init(){this.cols=7;this.rows=6;this.cell=Math.floor(Math.min((this.w-28)/7,(this.h-130)/6));
this.gx=(this.w-this.cell*7)/2;this.gy=90;this.b=Array.from({length:6},()=>Array(7).fill(0));
this.turn=1;this.done=false;this.setHud('<div class="pill">نوبت: <b>قرمز</b></div>');
this._c=e=>{if(this.done||this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,c=Math.floor((x-this.gx)/this.cell);
if(c>=0&&c<7)this.drop(c);};
this.canvas.addEventListener('pointerdown',this._c);}
drop(c){let row=-1;for(let r=5;r>=0;r--)if(!this.b[r][c]){row=r;break;}
if(row<0)return;this.b[row][c]=this.turn;this.Snd.t(420,0.05,'sine',0.08);this.Hap.ok();
if(this.win(row,c)){this.done=true;this.setHud(`<div class="pill">برنده: <b>${this.turn===1?'قرمز':'زرد'}</b></div>`);
this.Snd.win();this.Hap.success();this.Cam.add(0.3);
setTimeout(()=>this.finish(this.turn===1?'بردی!':'باختی!'),600);return;}
if(this.b.every(r=>r.every(v=>v))){this.done=true;setTimeout(()=>this.finish('مساوی!'),500);return;}
this.turn=this.turn===1?2:1;this.setHud(`<div class="pill">نوبت: <b>${this.turn===1?'قرمز':'زرد'}</b></div>`);
if(this.turn===2)setTimeout(()=>this.ai(),270);}
win(r,c){const d=[[0,1],[1,0],[1,1],[1,-1]];
for(const[dr,dc]of d){let n=1;
for(const s of[1,-1]){for(let i=1;i<4;i++){
const nr=r+dr*i*s,nc=c+dc*i*s;
if(nr>=0&&nr<6&&nc>=0&&nc<7&&this.b[nr][nc]===this.turn)n++;else break;}}
if(n>=4)return true;}return false;}
ai(){if(this.done)return;const val=[];for(let c=0;c<7;c++)if(!this.b[0][c])val.push(c);
if(!val.length)return;
for(const c of val){let row=-1;for(let r=5;r>=0;r--)if(!this.b[r][c]){row=r;break;}
this.b[row][c]=2;if(this.win(row,c)){this.b[row][c]=0;return this.drop(c);}this.b[row][c]=0;}
for(const c of val){let row=-1;for(let r=5;r>=0;r--)if(!this.b[r][c]){row=r;break;}
this.b[row][c]=1;if(this.win(row,c)){this.b[row][c]=0;return this.drop(c);}this.b[row][c]=0;}
this.drop(val[randInt(0,val.length-1)]);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#1a0a2e');bg.addColorStop(1,'#0a1628');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(let r=0;r<6;r++)for(let cc=0;cc<7;cc++){
const x=this.gx+cc*this.cell+this.cell/2,y=this.gy+r*this.cell+this.cell/2;
const v=this.b[r][cc];c.fillStyle=v===1?'#ff2d78':v===2?'#ffc531':'rgba(255,255,255,0.03)';
if(v){c.shadowColor=c.fillStyle;c.shadowBlur=9;}
c.beginPath();c.arc(x,y,this.cell*0.37,0,TAU);c.fill();c.shadowBlur=0;}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.reaction=class extends Base{
init(){this.ph='wait';this.wait=rand(1.2,3.4);this.t=0;this.startT=0;this.score=0;
this.hud();
this._t=()=>{if(this.state!=='playing')return;
if(this.ph==='wait'){this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.2);
setTimeout(()=>this.finish('خیلی زود!','صبر کن چراغ سبز بشه'),500);}
else if(this.ph==='go'){const ms=nw()-this.startT;
this.score=Math.max(0,1000-Math.floor(ms/10));
this.state='over';this.Snd.win();this.Hap.success();this.Cam.add(0.3);
setTimeout(()=>this.finish('واکنش شما',`${ms.toFixed(0)} میلی‌ثانیه`),500);}};
this.canvas.addEventListener('pointerdown',this._t);
this._k=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();this._t();}};
window.addEventListener('keydown',this._k);}
hud(){this.setHud('<div class="pill">آماده؟</div>');}
update(dt){if(this.state!=='playing')return;
if(this.ph==='wait'){this.t+=dt;
if(this.t>=this.wait){this.ph='go';this.startT=nw();
this.Snd.t(1050,0.08,'sine',0.12);this.Hap.med();}}}
render(){const c=this.ctx;
if(this.ph==='wait'){c.fillStyle='#ff2d78';c.fillRect(0,0,this.w,this.h);
c.fillStyle='#fff';c.font='bold 24px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText('منتظر بمان...',this.w/2,this.h/2);}
else{c.fillStyle='#2bff88';c.fillRect(0,0,this.w,this.h);
c.fillStyle='#031018';c.font='bold 36px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText('بزن!',this.w/2,this.h/2);}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._t);window.removeEventListener('keydown',this._k);}
};

this.games.math=class extends Base{
init(){this.score=0;this.lives=3;this.time=30;this.layout();this.newQ();this.hud();
this._c=e=>{if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const bw=(this.w-54)/2,bh=68,gx=27,gy=this.h*0.52;
for(let i=0;i<4;i++){const bx=gx+(i%2)*(bw+16),by=gy+Math.floor(i/2)*(bh+14);
if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh){this.ans(i);return;}}};
this.canvas.addEventListener('pointerdown',this._c);}
layout(){this.bw=(this.w-54)/2;this.bh=68;this.gx=27;this.gy=this.h*0.52;}
newQ(){const max=10+this.score*2;let a=randInt(1,max),b=randInt(1,max);
const op=Math.random()<0.5?'+':'-';if(op==='-'&&a<b)[a,b]=[b,a];
this.correct=op==='+'?a+b:a-b;this.q=`${a} ${op} ${b} = ?`;
this.opts=[this.correct];
while(this.opts.length<4){const w=this.correct+randInt(-9,9);
if(w!==this.correct&&!this.opts.includes(w)&&w>0)this.opts.push(w);}
this.opts.sort(()=>Math.random()-0.5);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">⏱ <b>${Math.ceil(this.time)}s</b></div><div class="pill">❤️ ${this.lives}</div>`);}
ans(i){if(this.opts[i]===this.correct){this.score+=15;this.time=Math.min(30,this.time+2);
this.Snd.win();this.Hap.ok();this.newQ();}
else{this.lives--;this.Snd.hit();this.Hap.heavy();this.time=Math.max(0,this.time-5);
if(this.lives<=0){this.state='over';setTimeout(()=>this.finish(),500);}}this.hud();}
update(dt){if(this.state!=='playing')return;this.time-=dt;
if(this.time<=0){this.time=0;this.state='over';this.Snd.lose();setTimeout(()=>this.finish(),500);}this.hud();}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.fillStyle='rgba(255,255,255,0.04)';c.fillRect(0,50,this.w,4);
c.fillStyle=this.time<10?'#ff2d78':'#00e5ff';c.fillRect(0,50,(this.time/30)*this.w,4);
c.fillStyle='#fff';c.font='bold 40px Tahoma';c.textAlign='center';c.shadowColor='#00e5ff';c.shadowBlur=14;
c.fillText(this.q,this.w/2,this.h*0.28);c.shadowBlur=0;
for(let i=0;i<4;i++){const bx=this.gx+(i%2)*(this.bw+16);const by=this.gy+Math.floor(i/2)*(this.bh+14);
c.fillStyle='rgba(0,229,255,0.06)';c.strokeStyle='rgba(0,229,255,0.3)';c.lineWidth=2;
c.beginPath();if(c.roundRect)c.roundRect(bx,by,this.bw,this.bh,12);else c.rect(bx,by,this.bw,this.bh);
c.fill();c.stroke();
c.fillStyle='#fff';c.font='bold 24px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText(this.opts[i],bx+this.bw/2,by+this.bh/2);}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.match3=class extends Base{
init(){this.cols=8;this.rows=8;this.cell=Math.floor(Math.min((this.w-16)/8,(this.h-140)/8));
this.gx=(this.w-this.cell*8)/2;this.gy=90;this.grid=[];
for(let r=0;r<8;r++){const row=[];
for(let c=0;c<8;c++){let v;
do{v=randInt(1,5);}while((c>=2&&row[c-1]===v&&row[c-2]===v)||(r>=2&&this.grid[r-1][c]===v&&this.grid[r-2][c]===v));
row.push(v);}this.grid.push(row);}
this.score=0;this.mv=35;this.sel=null;this.lock=false;this.hud();
this._c=e=>{if(this.lock||this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
const x=e.clientX-r.left,y=e.clientY-r.top;
const c=Math.floor((x-this.gx)/this.cell),rr=Math.floor((y-this.gy)/this.cell);
if(c>=0&&c<8&&rr>=0&&rr<8)this.tap(rr,c);};
this.canvas.addEventListener('pointerdown',this._c);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">حرکت <b>${this.mv}</b></div>`);}
tap(r,c){if(!this.sel){this.sel={r,c};this.Snd.t(580,0.03,'sine',0.05);return;}
const dr=Math.abs(this.sel.r-r),dc=Math.abs(this.sel.c-c);
if(dr+dc===1){const a=this.sel;this.sel=null;this.swap(a.r,a.c,r,c);}
else if(dr===0&&dc===0)this.sel=null;else this.sel={r,c};}
swap(r1,c1,r2,c2){this.lock=true;const t=this.grid[r1][c1];this.grid[r1][c1]=this.grid[r2][c2];this.grid[r2][c2]=t;
this.Snd.t(420,0.035,'sine',0.06);
if(this.hasMatch()){this.mv--;this.hud();setTimeout(()=>this.resolve(),210);}
else{setTimeout(()=>{const t2=this.grid[r1][c1];this.grid[r1][c1]=this.grid[r2][c2];this.grid[r2][c2]=t2;
this.Snd.t(220,0.06,'sawtooth',0.05);this.Hap.ok();this.lock=false;},210);}}
hasMatch(){for(let r=0;r<8;r++)for(let c=0;c<6;c++)
if(this.grid[r][c]&&this.grid[r][c]===this.grid[r][c+1]&&this.grid[r][c]===this.grid[r][c+2])return true;
for(let c=0;c<8;c++)for(let r=0;r<6;r++)
if(this.grid[r][c]&&this.grid[r][c]===this.grid[r+1][c]&&this.grid[r][c]===this.grid[r+2][c])return true;
return false;}
resolve(){const cl=new Set();
for(let r=0;r<8;r++)for(let c=0;c<6;c++){
if(this.grid[r][c]&&this.grid[r][c]===this.grid[r][c+1]&&this.grid[r][c]===this.grid[r][c+2]){
cl.add(`${r},${c}`);cl.add(`${r},${c+1}`);cl.add(`${r},${c+2}`);}}
for(let c=0;c<8;c++)for(let r=0;r<6;r++){
if(this.grid[r][c]&&this.grid[r][c]===this.grid[r+1][c]&&this.grid[r][c]===this.grid[r+2][c]){
cl.add(`${r},${c}`);cl.add(`${r+1},${c}`);cl.add(`${r+2},${c}`);}}
if(cl.size){this.score+=cl.size*15;this.Snd.coin();this.Hap.med();this.Cam.add(0.08);
cl.forEach(p=>{const[r,c]=p.split(',').map(Number);
const x=this.gx+c*this.cell+this.cell/2,y=this.gy+r*this.cell+this.cell/2;
this.Par.spawn(x,y,5,{color:this.co(this.grid[r][c]),minSpeed:50,maxSpeed:160,gravity:260});
this.grid[r][c]=0;});
for(let c=0;c<8;c++){let e=0;
for(let r=7;r>=0;r--){if(!this.grid[r][c])e++;
else if(e){this.grid[r+e][c]=this.grid[r][c];this.grid[r][c]=0;}}
for(let r=e-1;r>=0;r--)this.grid[r][c]=randInt(1,5);}
this.hud();setTimeout(()=>this.resolve(),240);}
else{this.lock=false;
if(this.mv<=0){this.state='over';this.Snd.lose();setTimeout(()=>this.finish(),500);}}}
co(v){return['','#00e5ff','#ff2d78','#ffc531','#2bff88','#a855f7'][v]||'#fff';}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++){const v=this.grid[r][cc];if(!v)continue;
const x=this.gx+cc*this.cell+3,y=this.gy+r*this.cell+3,w=this.cell-6;
const isSel=this.sel&&this.sel.r===r&&this.sel.c===cc;
c.fillStyle=this.co(v);c.shadowColor=isSel?'#fff':this.co(v);c.shadowBlur=isSel?16:6;
c.beginPath();
if(v===1)c.arc(x+w/2,y+w/2,w/2,0,TAU);
else if(v===2)c.roundRect?c.roundRect(x,y,w,w,8):c.rect(x,y,w,w);
else if(v===3){c.moveTo(x+w/2,y);c.lineTo(x+w,y+w/2);c.lineTo(x+w/2,y+w);c.lineTo(x,y+w/2);c.closePath();}
else if(v===4){c.moveTo(x+w/2,y);c.lineTo(x+w,y+w);c.lineTo(x,y+w);c.closePath();}
else{for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2;
c.lineTo(x+w/2+Math.cos(a)*w/2,y+w/2+Math.sin(a)*w/2);}c.closePath();}
c.fill();c.shadowBlur=0;}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.solitaire=class extends Base{
init(){this.cw=Math.floor((this.w-80)/7);this.ch=Math.floor(this.cw*1.38);
this.gap=6;this.ty=56;this.tabY=this.ty+this.ch+18;
this.suits=['♠','♥','♦','♣'];this.ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
this.stock=[];this.waste=[];this.found=[[],[],[],[]];this.tab=[[],[],[],[],[],[],[]];
this.sel=null;this.score=0;
const deck=[];for(let s=0;s<4;s++)for(let r=0;r<13;r++)deck.push({s,r,up:false});
deck.sort(()=>Math.random()-0.5);let i=0;
for(let col=0;col<7;col++){for(let row=0;row<=col;row++){
const cd=deck[i++];cd.up=row===col;this.tab[col].push(cd);}}
while(i<deck.length)this.stock.push(deck[i++]);
this.hud();
this._c=e=>{if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();
this.handle(e.clientX-r.left,e.clientY-r.top);};
this.canvas.addEventListener('pointerdown',this._c);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">سالیتر</div>`);}
handle(x,y){const sx=16,sy=this.ty;
if(x>=sx&&x<=sx+this.cw&&y>=sy&&y<=sy+this.ch){
if(this.stock.length){const c=this.stock.pop();c.up=true;this.waste.push(c);this.Snd.t(720,0.03,'sine',0.05);}
else if(this.waste.length){this.stock=this.waste.reverse();this.stock.forEach(c=>c.up=false);this.waste=[];this.Snd.t(350,0.05,'triangle',0.05);}return;}
const wx=16+this.cw+this.gap;
if(x>=wx&&x<=wx+this.cw&&y>=sy&&y<=sy+this.ch){
if(this.waste.length)this.sel={type:'waste',cards:[this.waste[this.waste.length-1]]};return;}
for(let i=0;i<7;i++){const tx=16+i*(this.cw+this.gap);let ty=this.tabY;
for(let j=0;j<this.tab[i].length;j++){const cd=this.tab[i][j];
if(x>=tx&&x<=tx+this.cw&&y>=ty&&y<=ty+this.ch){
if(cd.up)this.sel={type:'tab',pile:i,idx:j,cards:this.tab[i].slice(j)};return;}
ty+=cd.up?22:8;}}
for(let i=0;i<4;i++){const fx=this.w-16-(4-i)*(this.cw+this.gap)+this.gap;
if(x>=fx&&x<=fx+this.cw&&y>=this.ty&&y<=this.ty+this.ch){
if(this.sel&&this.sel.cards.length===1){const cd=this.sel.cards[0],pile=this.found[i];
let ok=false;if(!pile.length){if(cd.r===0)ok=true;}
else{const top=pile[pile.length-1];if(top.s===cd.s&&top.r===cd.r-1)ok=true;}
if(ok){pile.push(cd);this.remSel();this.score+=15;this.Snd.win();this.Hap.success();this.hud();this.checkWin();}}return;}}
if(this.sel){for(let i=0;i<7;i++){const tx=16+i*(this.cw+this.gap);let ty=this.tabY;
for(let j=0;j<this.tab[i].length;j++)ty+=this.tab[i][j].up?22:8;
if(x>=tx-16&&x<=tx+this.cw+16&&y>=ty-16){
const pile=this.tab[i],cd=this.sel.cards[0];let ok=false;
if(!pile.length){if(cd.r===12)ok=true;}
else{const top=pile[pile.length-1];if(top.up){const red=c=>c.s===1||c.s===2;
if(red(cd)!==red(top)&&top.r===cd.r+1)ok=true;}}
if(ok){pile.push(...this.sel.cards);this.remSel();this.score+=5;this.Snd.t(520,0.04,'sine',0.05);this.hud();return;}}}
this.sel=null;}}
remSel(){if(!this.sel)return;
if(this.sel.type==='waste')this.waste.pop();
else if(this.sel.type==='tab'){this.tab[this.sel.pile].splice(this.sel.idx);
const p=this.tab[this.sel.pile];if(p.length&&!p[p.length-1].up)p[p.length-1].up=true;}
this.sel=null;}
checkWin(){if(this.found.every(f=>f.length===13)){this.state='over';this.Snd.win();this.Hap.success();this.Cam.add(0.6);
setTimeout(()=>this.finish('بردی!','+۱۰۰۰ پاداش'),700);}}
drawCard(c,cd,x,y){if(!cd.up){const g=c.createLinearGradient(x,y,x+this.cw,y+this.ch);
g.addColorStop(0,'#131f36');g.addColorStop(1,'#0a0f1c');c.fillStyle=g;c.beginPath();
if(c.roundRect)c.roundRect(x,y,this.cw,this.ch,4);else c.rect(x,y,this.cw,this.ch);
c.fill();c.strokeStyle='rgba(0,229,255,0.2)';c.lineWidth=1.5;c.stroke();return;}
c.fillStyle='#f0f4fa';c.beginPath();
if(c.roundRect)c.roundRect(x,y,this.cw,this.ch,4);else c.rect(x,y,this.cw,this.ch);c.fill();
const red=cd.s===1||cd.s===2;c.fillStyle=red?'#ff2d78':'#111';
c.font=`bold ${this.cw*0.22}px Tahoma`;c.textAlign='left';c.textBaseline='top';
c.fillText(this.ranks[cd.r],x+3,y+3);c.font=`${this.cw*0.22}px Arial`;
c.fillText(this.suits[cd.s],x+3,y+3+this.cw*0.22);}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a1a0a');bg.addColorStop(1,'#0a1628');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
const slot=(x,y)=>{c.strokeStyle='rgba(0,229,255,0.14)';c.lineWidth=2;c.beginPath();
if(c.roundRect)c.roundRect(x,y,this.cw,this.ch,4);else c.rect(x,y,this.cw,this.ch);c.stroke();};
slot(16,this.ty);for(let i=0;i<4;i++)slot(this.w-16-(4-i)*(this.cw+this.gap)+this.gap,this.ty);
for(let i=0;i<7;i++)slot(16+i*(this.cw+this.gap),this.tabY);
if(this.stock.length)this.drawCard(c,this.stock[this.stock.length-1],16,this.ty);
if(this.waste.length)this.drawCard(c,this.waste[this.waste.length-1],16+this.cw+this.gap,this.ty);
for(let i=0;i<4;i++)if(this.found[i].length)this.drawCard(c,this.found[i][this.found[i].length-1],this.w-16-(4-i)*(this.cw+this.gap)+this.gap,this.ty);
for(let i=0;i<7;i++){const tx=16+i*(this.cw+this.gap);let ty=this.tabY;
for(const cd of this.tab[i]){this.drawCard(c,cd,tx,ty);ty+=cd.up?22:8;}}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.stack=class extends Base{
init(){this.bw=Math.min(this.w*0.56,240);this.bh=28;
this.tower=[{x:(this.w-this.bw)/2,y:this.h-80,w:this.bw,color:'#00e5ff'}];
this.score=0;this.combo=0;this.camY=0;this.tcam=0;
this.pal=['#00e5ff','#ff2d78','#ffc531','#a855f7','#2bff88'];
this.cur={x:0,w:this.bw,color:this.pal[1],dir:1,speed:260};this.hud();
this._d=()=>{if(this.state!=='playing')return;this.drop();};
this.canvas.addEventListener('pointerdown',this._d);
this._k=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();this._d();}};
window.addEventListener('keydown',this._k);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div><div class="pill">ارتفاع <b>${this.tower.length}</b></div>`);}
drop(){const last=this.tower[this.tower.length-1],c=this.cur;
const l=Math.max(c.x,last.x),r=Math.min(c.x+c.w,last.x+last.w),ov=r-l;
if(ov<=0){this.state='over';this.Snd.lose();this.Hap.heavy();this.Cam.add(1.2);setTimeout(()=>this.finish(),550);return;}
const per=Math.abs(c.x-last.x)<6;const fx=per?last.x:l,fw=per?last.w:ov;
if(per){this.combo++;this.Snd.t(1400,0.09,'sine',0.1,2000);this.Hap.success();this.Cam.add(0.14);}
else{this.combo=0;this.Snd.t(420,0.06,'square',0.06);this.Hap.med();this.Cam.add(0.24);}
this.score+=10+this.combo*5;
this.tower.push({x:fx,y:last.y-this.bh,w:fw,color:c.color});
this.tcam=Math.max(0,(this.tower.length-6)*this.bh);
if(fw<=3){this.state='over';this.Snd.lose();this.Hap.heavy();setTimeout(()=>this.finish(),550);return;}
this.cur={x:Math.random()<0.5?0:this.w-fw,w:fw,color:this.pal[this.tower.length%this.pal.length],dir:Math.random()<0.5?1:-1,speed:260+this.tower.length*15};
this.hud();}
update(dt){if(this.state!=='playing')return;this.camY=lerp(this.camY,this.tcam,dt*5);
this.cur.x+=this.cur.speed*this.cur.dir*dt;
if(this.cur.x<0){this.cur.x=0;this.cur.dir=1;}
if(this.cur.x+this.cur.w>this.w){this.cur.x=this.w-this.cur.w;this.cur.dir=-1;}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
c.save();c.translate(0,this.camY);
for(let i=0;i<this.tower.length;i++){const b=this.tower[i];
const g=c.createLinearGradient(b.x,b.y,b.x+b.w,b.y+this.bh);
g.addColorStop(0,b.color);g.addColorStop(1,'rgba(0,0,0,0.5)');
c.fillStyle=g;c.shadowColor=b.color;c.shadowBlur=i===this.tower.length-1?18:3;
c.fillRect(b.x,b.y,b.w,this.bh);c.fillStyle='rgba(255,255,255,0.14)';
c.fillRect(b.x,b.y,b.w,2.5);c.shadowBlur=0;}
if(this.state==='playing'){const ny=this.tower[this.tower.length-1].y-this.bh;
c.fillStyle=this.cur.color;c.shadowColor=this.cur.color;c.shadowBlur=16;
c.fillRect(this.cur.x,ny,this.cur.w,this.bh);c.fillStyle='rgba(255,255,255,0.3)';
c.fillRect(this.cur.x,ny,this.cur.w,2.5);c.shadowBlur=0;
if(this.combo>1){c.fillStyle='#fff';c.font='bold 15px Tahoma';
c.textAlign='center';c.fillText(`کمبو ×${this.combo}`,this.w/2,ny-12);}}
c.restore();}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._d);window.removeEventListener('keydown',this._k);}
};

this.games.color=class extends Base{
init(){this.colors=['#00e5ff','#ff2d78','#ffc531','#2bff88'];
this.ball={x:this.w/2,y:this.h*0.7,vy:0,ci:0};this.obs=[];this.score=0;this.st=0;this.hud();
this._j=()=>{if(this.state!=='playing')return;this.ball.vy=-580;this.Snd.t(620,0.05,'sine',0.095,820);this.Hap.ok();};
this.canvas.addEventListener('pointerdown',this._j);
this._k=e=>{if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();this._j();}};
window.addEventListener('keydown',this._k);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
spawn(){const ring=Math.random()<0.7;
if(ring){this.obs.push({type:'ring',y:-100,rot:rand(0,TAU),sp:rand(1,2.4),cols:Array.from({length:4},()=>randInt(0,3)),done:false});}
else{this.obs.push({type:'swap',y:-100,rot:rand(0,TAU),sp:rand(2,4),done:false});}}
update(dt){if(this.state!=='playing')return;const b=this.ball;b.vy+=1530*dt;b.y+=b.vy*dt;
if(b.y>this.h+40){this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.3);setTimeout(()=>this.finish(),550);return;}
this.st+=dt;if(this.st>1.8){this.st=0;this.spawn();}
for(let i=this.obs.length-1;i>=0;i--){const o=this.obs[i];
o.y+=188*dt;o.rot+=o.sp*dt;
if(o.y>this.h+100){this.obs.splice(i,1);continue;}
const d=Math.hypot(b.x-this.w/2,b.y-o.y);
if(o.type==='ring'&&d>64&&d<88){let a=Math.atan2(b.y-o.y,b.x-this.w/2)-o.rot;
while(a<0)a+=TAU;a%=TAU;const seg=Math.floor(a/(Math.PI/2));
if(o.cols[seg]!==b.ci){this.state='over';this.Snd.hit();this.Hap.heavy();this.Cam.add(1.2);setTimeout(()=>this.finish(),550);return;}}
if(o.type==='swap'&&!o.done&&d<24){o.done=true;b.ci=(b.ci+1)%4;this.score+=10;
this.Snd.t(900,0.06,'sine',0.08);this.Hap.med();this.hud();}
if(!o.done&&b.y<o.y-16){o.done=true;this.score+=15;this.Snd.coin();this.hud();}}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(const o of this.obs){if(o.done&&o.type==='ring')continue;
c.save();c.translate(this.w/2,o.y);c.rotate(o.rot);
if(o.type==='ring'){for(let i=0;i<4;i++){
c.strokeStyle=this.colors[o.cols[i]];c.lineWidth=13;c.shadowColor=c.strokeStyle;c.shadowBlur=8;
c.beginPath();c.arc(0,0,76,i*Math.PI/2,(i+1)*Math.PI/2);c.stroke();}}
else if(!o.done){for(let i=0;i<4;i++){
c.fillStyle=this.colors[i];c.beginPath();c.moveTo(0,0);
c.arc(0,0,22,i*Math.PI/2,(i+1)*Math.PI/2);c.fill();}}
c.shadowBlur=0;c.restore();}
c.fillStyle=this.colors[this.ball.ci];c.shadowColor=c.fillStyle;c.shadowBlur=18;
c.beginPath();c.arc(this.ball.x,this.ball.y,12,0,TAU);c.fill();c.shadowBlur=0;
c.strokeStyle='#fff';c.lineWidth=2;c.stroke();}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._j);window.removeEventListener('keydown',this._k);}
};

this.games.word=class extends Base{
init(){this.words=['برنامه','گوشی','اینترنت','بازی','دوست','کامپیوتر','تلگرام','هوش','کهکشان','ستاره','فضا','موشک','سیاره','خورشید','ماه','کتاب','مدرسه','دانشجو'];
this.score=0;this.newWord();this.hud();
this._c=e=>{if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
for(let i=0;i<this.letters.length;i++){
if(x>=this.bx[i]&&x<=this.bx[i]+this.bs&&y>=this.by[i]&&y<=this.by[i]+this.bs){
if(!this.picked.includes(i)){this.picked.push(i);this.Snd.t(600+this.picked.length*36,0.03,'sine',0.06);this.Hap.ok();}return;}}};
this.canvas.addEventListener('pointerdown',this._c);}
newWord(){this.target=this.words[randInt(0,this.words.length-1)];this.letters=this.target.split('').sort(()=>Math.random()-0.5);
this.picked=[];this.bs=Math.min(42,(this.w-32)/Math.max(4,this.letters.length));this.bx=[];this.by=[];
const total=this.letters.length*this.bs+(this.letters.length-1)*5;const sx=(this.w-total)/2,sy=this.h*0.6;
for(let i=0;i<this.letters.length;i++){this.bx.push(sx+i*(this.bs+5));this.by.push(sy);}}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
update(dt){if(this.state!=='playing')return;
if(this.picked.length===this.letters.length){const built=this.picked.map(i=>this.letters[i]).join('');
if(built===this.target){this.score+=100;this.Snd.win();this.Hap.success();this.Cam.add(0.16);
this.Par.spawn(this.w/2,this.h*0.4,26,{color:'#2bff88',minSpeed:70,maxSpeed:260,gravity:170});
this.newWord();this.hud();}
else{this.Snd.hit();this.Hap.med();this.picked=[];}}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
const sw=34,total=this.target.length*sw,sx=(this.w-total)/2;
for(let i=0;i<this.target.length;i++){c.strokeStyle='rgba(255,255,255,0.12)';c.lineWidth=2;c.beginPath();
if(c.roundRect)c.roundRect(sx+i*sw+2,this.h*0.26,sw-4,38,6);else c.rect(sx+i*sw+2,this.h*0.26,sw-4,38);c.stroke();}
for(let i=0;i<this.picked.length;i++){c.fillStyle='#00e5ff';c.font='bold 22px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText(this.letters[this.picked[i]],sx+i*sw+sw/2,this.h*0.26+19);}
for(let i=0;i<this.letters.length;i++){const x=this.bx[i],y=this.by[i],sel=this.picked.includes(i);
c.fillStyle=sel?'rgba(0,229,255,0.1)':'#131f36';c.strokeStyle=sel?'#00e5ff':'rgba(255,255,255,0.12)';c.lineWidth=2;
c.beginPath();if(c.roundRect)c.roundRect(x,y,this.bs,this.bs,9);else c.rect(x,y,this.bs,this.bs);c.fill();c.stroke();
if(!sel){c.fillStyle='#fff';c.font='bold 18px Tahoma';c.textAlign='center';c.textBaseline='middle';
c.fillText(this.letters[i],x+this.bs/2,y+this.bs/2+2);}}}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);}
};

this.games.physics=class extends Base{
init(){this.ball={x:46,y:this.h-46,vx:0,vy:0,r:12,on:false};
this.targets=[{x:rand(this.w*0.5,this.w-50),y:rand(90,this.h*0.5),w:42,h:42,hit:false}];
this.score=0;this.aim=false;this.hud();
this._d=e=>{if(this.state!=='playing'||this.ball.on)return;this.aim=true;
const r=this.canvas.getBoundingClientRect();this.sx=e.clientX-r.left;this.sy=e.clientY-r.top;this.ex=this.sx;this.ey=this.sy;};
this._m=e=>{if(!this.aim)return;const r=this.canvas.getBoundingClientRect();this.ex=e.clientX-r.left;this.ey=e.clientY-r.top;};
this._u=()=>{if(!this.aim)return;this.aim=false;this.ball.on=true;
this.ball.vx=(this.sx-this.ex)*5;this.ball.vy=(this.sy-this.ey)*5;
this.Snd.t(420,0.07,'sine',0.1,840);this.Hap.ok();};
this.canvas.addEventListener('pointerdown',this._d);window.addEventListener('pointermove',this._m);window.addEventListener('pointerup',this._u);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
update(dt){if(this.state!=='playing')return;const b=this.ball;if(!b.on)return;
b.vy+=740*dt;b.vx*=0.99;b.x+=b.vx*dt;b.y+=b.vy*dt;
if(b.x-b.r<0){b.x=b.r;b.vx*=-0.7;}if(b.x+b.r>this.w){b.x=this.w-b.r;b.vx*=-0.7;}
if(b.y-b.r<0){b.y=b.r;b.vy*=-0.7;}if(b.y+b.r>this.h){b.y=this.h-b.r;b.vy*=-0.7;b.vx*=0.92;}
for(const t of this.targets){if(t.hit)continue;
if(b.x+b.r>t.x&&b.x-b.r<t.x+t.w&&b.y+b.r>t.y&&b.y-b.r<t.y+t.h){
t.hit=true;this.score+=100;this.Snd.win();this.Hap.success();this.Cam.add(0.24);
this.Par.spawn(t.x+t.w/2,t.y+t.h/2,24,{color:'#ffc531',minSpeed:80,maxSpeed:320,gravity:260});
this.hud();setTimeout(()=>{if(this.state!=='playing')return;
this.ball={x:46,y:this.h-46,vx:0,vy:0,r:12,on:false};
this.targets=[{x:rand(this.w*0.5,this.w-50),y:rand(90,this.h*0.5),w:42,h:42,hit:false}];},650);}}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(const t of this.targets){if(t.hit)continue;
c.fillStyle='#ffc531';c.shadowColor='#ffc531';c.shadowBlur=16;
c.beginPath();c.arc(t.x+t.w/2,t.y+t.h/2,t.w/2,0,TAU);c.fill();
c.fillStyle='#fff';c.beginPath();c.arc(t.x+t.w/2,t.y+t.h/2,t.w/4,0,TAU);c.fill();c.shadowBlur=0;}
if(this.aim){c.strokeStyle='rgba(255,255,255,0.38)';c.lineWidth=2;c.setLineDash([4,4]);
c.beginPath();c.moveTo(this.ball.x,this.ball.y);
c.lineTo(this.ball.x+(this.sx-this.ex)*3,this.ball.y+(this.sy-this.ey)*3);c.stroke();c.setLineDash([]);}
c.fillStyle='#00e5ff';c.shadowColor='#00e5ff';c.shadowBlur=16;
c.beginPath();c.arc(this.ball.x,this.ball.y,this.ball.r,0,TAU);c.fill();c.shadowBlur=0;}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._d);window.removeEventListener('pointermove',this._m);window.removeEventListener('pointerup',this._u);}
};

this.games.clicker=class extends Base{
init(){this.coins=0;this.cp=1;this.ap=0;this.at=0;this.cc=15;this.ac=50;
this.cx=this.w/2;this.cy=this.h*0.3;this.cr=Math.min(this.w,this.h)*0.12;this.pu=0;this.hud();
this._c=e=>{if(this.state!=='playing')return;
const r=this.canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
const bw=(this.w-54)/2,bh=68,by=this.h-150;
if(y>=by&&y<=by+bh){
if(x>=27&&x<=27+bw){if(this.coins>=this.cc){this.coins-=this.cc;this.cp++;this.cc=Math.floor(this.cc*1.58);
this.Snd.win();this.Hap.success();this.Cam.add(0.2);}
else{this.Snd.t(200,0.06,'sawtooth',0.07);this.Hap.heavy();}}
else if(x>=27+bw+16&&x<=this.w-27){if(this.coins>=this.ac){this.coins-=this.ac;this.ap++;this.ac=Math.floor(this.ac*1.74);
this.Snd.win();this.Hap.success();this.Cam.add(0.2);}
else{this.Snd.t(200,0.06,'sawtooth',0.07);this.Hap.heavy();}}
this.hud();return;}
if(Math.hypot(x-this.cx,y-this.cy)<this.cr+14){this.coins+=this.cp;this.pu=1;
this.Snd.t(620+Math.random()*80,0.03,'sine',0.06);this.Hap.ok();
this.Par.spawn(x,y,3,{color:'#ffc531',minSpeed:40,maxSpeed:140,gravity:240});this.hud();}};
this.canvas.addEventListener('pointerdown',this._c);
this._k=e=>{if(e.key===' '){e.preventDefault();this.coins+=this.cp;this.pu=1;this.hud();}};
window.addEventListener('keydown',this._k);}
hud(){this.setHud(`<div class="pill">سکه <b>${Math.floor(this.coins)}</b></div><div class="pill">💰 ${this.ap}/s</div>`);}
update(dt){if(this.state!=='playing')return;
if(this.pu>0)this.pu=Math.max(0,this.pu-dt*6);
if(this.ap>0){this.at+=dt;if(this.at>=0.1){this.at=0;this.coins+=this.ap*0.1;this.hud();}}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,this.w,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
const s=1+this.pu*0.1;c.save();c.translate(this.cx,this.cy);c.scale(s,s);
const g=c.createRadialGradient(0,0,6,0,0,this.cr);
g.addColorStop(0,'#fff');g.addColorStop(0.3,'#00e5ff');g.addColorStop(1,'#0088cc');
c.fillStyle=g;c.shadowColor='#00e5ff';c.shadowBlur=34;
c.beginPath();c.arc(0,0,this.cr,0,TAU);c.fill();
c.fillStyle='#060912';c.beginPath();c.arc(0,0,this.cr*0.62,0,TAU);c.fill();
c.fillStyle='#ffc531';c.font=`bold ${this.cr*0.38}px Tahoma`;
c.textAlign='center';c.textBaseline='middle';c.fillText('💰',0,1);c.restore();
const bw=(this.w-54)/2,bh=68,by=this.h-150;
const d=(x,color,title,l1,l2)=>{c.fillStyle=color+'10';c.strokeStyle=color+'55';c.lineWidth=2;
c.beginPath();if(c.roundRect)c.roundRect(x,by,bw,bh,12);else c.rect(x,by,bw,bh);c.fill();c.stroke();
c.fillStyle=color;c.font='bold 11px Tahoma';c.textAlign='center';c.fillText(title,x+bw/2,by+19);
c.fillStyle='#fff';c.font='10px Tahoma';c.fillText(l1,x+bw/2,by+38);
c.fillStyle='#ffc531';c.fillText(l2,x+bw/2,by+55);};
d(27,'#00e5ff','ارتقای کلیک','توان: '+this.cp,'قیمت: '+this.cc);
d(27+bw+16,'#ff2d78','کلیکر خودکار','سرعت: '+this.ap+'/s','قیمت: '+this.ac);}
destroy(){super.destroy();this.canvas.removeEventListener('pointerdown',this._c);window.removeEventListener('keydown',this._k);}
};

this.games.invaders=class extends Base{
init(){this.p={x:this.w/2-17,y:this.h-64,w:34,h:24};this.bullets=[];this.enemies=[];this.score=0;this.ft=0;
for(let r=0;r<3;r++)for(let c=0;c<6;c++)this.enemies.push({x:46+c*62,y:100+r*52,w:34,h:24,alive:true});
this.hud();
this._m=e=>{const r=this.canvas.getBoundingClientRect();this.p.x=clamp(e.clientX-r.left-this.p.w/2,0,this.w-this.p.w);};
this._d=e=>{this._m(e);this.fire();};
this._k=e=>{if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();this.p.x=clamp(this.p.x-28,0,this.w-this.p.w);}
if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();this.p.x=clamp(this.p.x+28,0,this.w-this.p.w);}
if(e.key===' '){e.preventDefault();this.fire();}};
this.canvas.addEventListener('pointermove',this._m);this.canvas.addEventListener('pointerdown',this._d);window.addEventListener('keydown',this._k);}
hud(){this.setHud(`<div class="pill">امتیاز <b>${this.score}</b></div>`);}
fire(){if(this.state!=='playing')return;this.bullets.push({x:this.p.x+this.p.w/2,y:this.p.y});this.Snd.t(920,0.02,'square',0.03);}
update(dt){if(this.state!=='playing')return;this.ft+=dt;if(this.ft>0.24){this.ft=0;this.fire();}
for(let i=this.bullets.length-1;i>=0;i--){this.bullets[i].y-=580*dt;if(this.bullets[i].y<0)this.bullets.splice(i,1);}
for(const en of this.enemies){if(!en.alive)continue;en.y+=24*dt;
for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i];
if(b.x>en.x&&b.x<en.x+en.w&&b.y>en.y&&b.y<en.y+en.h){
en.alive=false;this.bullets.splice(i,1);this.score+=20;
this.Snd.t(300,0.06,'sawtooth',0.07);this.Hap.ok();this.Cam.add(0.06);
this.Par.spawn(en.x+en.w/2,en.y+en.h/2,9,{color:'#ff2d78',minSpeed:55,maxSpeed:200,gravity:160});
this.hud();break;}}
if(en.y+en.h>this.h-52){this.state='over';this.Snd.lose();this.Hap.heavy();this.Cam.add(1.2);setTimeout(()=>this.finish(),550);return;}}
if(this.enemies.every(e=>!e.alive)){this.Snd.win();this.Hap.success();setTimeout(()=>this.finish('بردی!','امتیاز پاداش +۲۰۰'),420);}}
render(){const c=this.ctx;const bg=c.createLinearGradient(0,0,0,this.h);
bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1a0a2e');
c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
for(const en of this.enemies){if(!en.alive)continue;
c.fillStyle='#ff2d78';c.shadowColor='#ff2d78';c.shadowBlur=8;
c.fillRect(en.x,en.y,en.w,en.h);c.fillStyle='#fff';c.fillRect(en.x+6,en.y+6,4,4);
c.fillRect(en.x+en.w-10,en.y+6,4,4);c.shadowBlur=0;}
for(const b of this.bullets){c.fillStyle='#00e5ff';c.shadowColor='#00e5ff';c.shadowBlur=8;
c.fillRect(b.x-2,b.y,4,11);c.shadowBlur=0;}
c.fillStyle='#2bff88';c.shadowColor='#2bff88';c.shadowBlur=14;
c.beginPath();c.moveTo(this.p.x+this.p.w/2,this.p.y);
c.lineTo(this.p.x+this.p.w,this.p.y+this.p.h);
c.lineTo(this.p.x,this.p.y+this.p.h);c.closePath();c.fill();c.shadowBlur=0;}
destroy(){super.destroy();this.canvas.removeEventListener('pointermove',this._m);this.canvas.removeEventListener('pointerdown',this._d);window.removeEventListener('keydown',this._k);}
};

this.games.match3=this.games.match3||this.games['2048'];
this.games.solitaire=this.games.solitaire||this.games.stack;
this.games.word=this.games.word||this.games.physics;
this.games.clicker=this.games.clicker||this.games.invaders;
}
};
