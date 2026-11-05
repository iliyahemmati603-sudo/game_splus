'use strict';
const App={
  currentGame:null,currentGameId:null,rafId:null,lastTime:0,currentCat:'all',lbFilter:'runner',
  init(){
    Storage.load();Net.init();this.bindTelegram();this.bindNav();
    this.renderCategories();this.renderGames();this.updateProfileUI();this.updateSettingsUI();
    window.addEventListener('hashchange',()=>this.handleHash());
    AudioEngine.resume();
  },
  bindTelegram(){
    try{if(window.Telegram?.WebApp){const tg=Telegram.WebApp;tg.ready();tg.expand();if(tg.initDataUnsafe?.user){Storage.data.name=tg.initDataUnsafe.user.first_name||'بازیکن';Storage.data.uid='tg_'+tg.initDataUnsafe.user.id;Storage.save();}tg.setBackgroundColor?.('#05070d');tg.setHeaderColor?.('#05070d');}}catch(e){}
    $('#home-name').textContent=Storage.data.name;
    $('#home-avatar').textContent=Storage.data.name.charAt(0).toUpperCase();
  },
  bindNav(){
    $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const t=btn.dataset.screen;location.hash=t;AudioEngine.click();
    }));
  },
  handleHash(){
    const h=location.hash.slice(1)||'home';
    if(h.startsWith('play/')){this.startGame(h.slice(5));}
    else{$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===h));this.go(h);}
  },
  go(screen){
    $$('.screen').forEach(s=>s.classList.remove('active'));
    const el=$('#screen-'+screen);if(el)el.classList.add('active');
    if(screen==='leaderboard')this.renderLeaderboard();
    if(screen==='profile')this.updateProfileUI();
    if(screen==='settings')this.updateSettingsUI();
  },
  renderCategories(){
    const scroll=$('#category-scroll');
    scroll.innerHTML=CATEGORIES.map(c=>{
      const count=c.id==='all'?GAME_REGISTRY.length:GAME_REGISTRY.filter(g=>g.cat===c.id).length;
      const active=c.id===this.currentCat?'active':'';
      return `<button class="cat-chip ${active}" data-cat="${c.id}">${c.icon} ${c.name} <span class="cat-count">${count}</span></button>`;
    }).join('');
    $$('.cat-chip').forEach(chip=>{
      chip.addEventListener('click',()=>{
        this.currentCat=chip.dataset.cat;this.renderCategories();this.renderGames();AudioEngine.click();
      });
    });
  },
  renderGames(){
    const grid=$('#game-grid');
    const filtered=this.currentCat==='all'?GAME_REGISTRY:GAME_REGISTRY.filter(g=>g.cat===this.currentCat);
    const catName=CATEGORIES.find(c=>c.id===this.currentCat)?.name||'همه';
    $('#section-title').textContent=`${catName} — ${filtered.length} بازی`;
    grid.innerHTML=filtered.map(g=>{
      const best=Storage.data.best[g.id]||0;
      return `<div class="game-tile" data-game="${g.id}">
        <span class="g-icon">${g.icon}</span>
        <div class="g-name">${g.name}</div>
        <div class="g-desc">${g.desc}</div>
        <div class="g-best">رکورد: ${best}</div>
      </div>`;
    }).join('');
    $$('.game-tile').forEach(tile=>{
      tile.addEventListener('click',()=>{AudioEngine.click();location.hash='play/'+tile.dataset.game;});
    });
  },
  async startGame(id){
    const meta=GAME_REGISTRY.find(g=>g.id===id);
    if(!meta||!meta.available){this.toast('بازی موجود نیست');location.hash='home';return;}
    const GameClass=window['Game_'+id];
    if(!GameClass){this.toast('بازی لود نشده');location.hash='home';return;}
    this.currentGameId=id;
    this.currentGame=new GameClass();
    $('#game-title').textContent=meta.name;
    $('#game-hud').innerHTML='';
    $('#game-overlay').classList.remove('show');
    $('#game-overlay').innerHTML='';
    $$('.screen').forEach(s=>s.classList.remove('active'));
    $('#screen-game').classList.add('active');
    $('#game-canvas').classList.add('active');
    this.currentGame.start();
    this.lastTime=performance.now();
    this.gameLoop(this.lastTime);
    AudioEngine.resume();
  },
  gameLoop(now){
    if(!this.currentGame)return;
    const dt=Math.min(0.05,(now-this.lastTime)/1000);
    this.lastTime=now;
    try{this.currentGame.update(dt);this.currentGame.render();}
    catch(e){console.error(e);this.quitGame();return;}
    this.rafId=requestAnimationFrame(t=>this.gameLoop(t));
  },
  quitGame(){
    if(this.currentGame&&this.currentGame.stop)this.currentGame.stop();
    if(this.rafId)cancelAnimationFrame(this.rafId);
    this.rafId=null;this.currentGame=null;
    $('#game-canvas').classList.remove('active');
    const ctx=$('#game-canvas').getContext('2d');
    ctx.clearRect(0,0,$('#game-canvas').width,$('#game-canvas').height);
    $('#game-overlay').classList.remove('show');
    location.hash='home';
    this.renderGames();this.updateProfileUI();
  },
  gameOver(gameId,score,extras){
    if(this.rafId)cancelAnimationFrame(this.rafId);
    this.rafId=null;
    const prevBest=Storage.data.best[gameId]||0;
    const isNewBest=Storage.setBest(gameId,score);
    Storage.incGames();
    const reward=Math.floor(score/15)+(extras?.coins||0)*2;
    if(reward>0)Storage.addCoins(reward);
    Net.submit(gameId,score,Storage.data.name);
    const ov=$('#game-overlay');
    ov.innerHTML=`
      <h2 class="${isNewBest?'win':'lose'}">${isNewBest?'رکورد جدید!':'بازی تمام شد'}</h2>
      ${isNewBest?'<div class="new-best">🎉 بهترین رکورد تو</div>':''}
      <div class="final">${score}</div>
      <div class="sub">رکورد قبلی: ${prevBest}</div>
      <div class="sub">سکه: ${reward} 💎</div>
      <button class="btn btn-primary" onclick="App.restartGame()">بازی مجدد</button>
      <button class="btn btn-secondary" onclick="App.quitGame()">بازگشت به خانه</button>
      <button class="btn btn-secondary" onclick="App.goLeaderboard('${gameId}')">رتبه‌بندی</button>
    `;
    ov.classList.add('show');
    AudioEngine[isNewBest?'win':'lose']();
    Haptics[isNewBest?'success':'heavy']();
    this.currentGame=null;
  },
  restartGame(){const id=this.currentGameId;$('#game-overlay').classList.remove('show');this.startGame(id);},
  goLeaderboard(gameId){this.lbFilter=gameId;$('#game-overlay').classList.remove('show');this.quitGame();location.hash='leaderboard';},
  updateProfileUI(){
    $('#home-coins').textContent=Storage.data.coins;
    $('#prof-avatar').textContent=Storage.data.name.charAt(0).toUpperCase();
    $('#prof-name').textContent=Storage.data.name;
    $('#prof-games').textContent=Storage.data.gamesPlayed;
    $('#prof-best').textContent=Storage.data.totalBest;
    $('#prof-coins').textContent=Storage.data.coins;
    const list=$('#profile-games-list');
    if(list)list.innerHTML=GAME_REGISTRY.map(g=>{
      const b=Storage.data.best[g.id]||0;
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>${g.icon} ${g.name}</span><b style="color:var(--gold)">${b}</b></div>`;
    }).join('');
  },
  updateSettingsUI(){
    const s=Storage.data.settings;
    $('#toggle-sound').classList.toggle('on',s.sound);
    $('#toggle-haptics').classList.toggle('on',s.haptics);
  },
  toggleSetting(k){
    Storage.data.settings[k]=!Storage.data.settings[k];Storage.save();
    if(k==='sound')AudioEngine.enabled=Storage.data.settings.sound;
    if(k==='haptics')Haptics.enabled=Storage.data.settings.haptics;
    this.updateSettingsUI();AudioEngine.click();
  },
  resetProgress(){if(!confirm('همه پیشرفت حذف شود؟'))return;localStorage.removeItem(Storage.key);location.reload();},
  renderLeaderboard(){
    const filters=$('#lb-filters');
    filters.innerHTML=GAME_REGISTRY.map(g=>`<button class="lb-filter ${g.id===this.lbFilter?'active':''}" data-lb="${g.id}">${g.icon} ${g.name}</button>`).join('');
    $$('[data-lb]').forEach(b=>b.addEventListener('click',()=>{this.lbFilter=b.dataset.lb;this.renderLeaderboard();}));
    const list=$('#lb-list');
    list.innerHTML='<div class="lb-empty">در حال بارگذاری...</div>';
    Net.get(this.lbFilter).then(arr=>{
      if(arr.length===0){
        const lb=Storage.data.best[this.lbFilter]||0;
        if(lb>0&&!Net.ready){
          list.innerHTML=`<div class="lb-row"><div class="lb-rank top1">1</div><div class="lb-name">${Storage.data.name} (تو)</div><div class="lb-score">${lb}</div></div><div class="lb-empty" style="padding:20px;font-size:12px">جدول آنلاین غیرفعال است</div>`;
        }else{list.innerHTML='<div class="lb-empty">هنوز رکوردی ثبت نشده</div>';}
        return;
      }
      list.innerHTML=arr.map((e,i)=>`<div class="lb-row"><div class="lb-rank ${i===0?'top1':i===1?'top2':i===2?'top3':''}">${i+1}</div><div class="lb-name">${e.name||'ناشناس'}${e.uid===Storage.data.uid?' (تو)':''}</div><div class="lb-score">${e.score}</div></div>`).join('');
    });
  },
  toast(msg){
    const t=$('#toast');t.textContent=msg;t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
  }
};
document.addEventListener('DOMContentLoaded',()=>App.init());
window.App=App;
