'use strict';
const CATEGORIES=[
  {id:'all',name:'همه',icon:'🎮'},
  {id:'arcade',name:'آرکید',icon:'⚡'},
  {id:'puzzle',name:'فکری',icon:'🧠'},
  {id:'action',name:'اکشن',icon:'💥'},
  {id:'strategy',name:'استراتژی',icon:'♟️'},
  {id:'skill',name:'مهارتی',icon:'🎯'}
];
const GAME_REGISTRY=[
  {id:'runner',name:'Neon Runner',icon:'🏃',cat:'arcade',desc:'بپر، جمع کن',available:true},
  {id:'tetris',name:'Neon Tetris',icon:'🟦',cat:'puzzle',desc:'ردیف‌ها را پر کن',available:true},
  {id:'blocks',name:'Block Puzzle',icon:'🧩',cat:'puzzle',desc:'بلوک‌ها را بچین',available:true},
  {id:'flappy',name:'Flappy Neon',icon:'🐦',cat:'arcade',desc:'پرواز کن',available:true},
  {id:'snake',name:'Snake Neon',icon:'🐍',cat:'arcade',desc:'بخور و بلند شو',available:true},
  {id:'breakout',name:'Breakout',icon:'🎯',cat:'arcade',desc:'آجرها را بشکن',available:true},
  {id:'memory',name:'Memory Match',icon:'🧠',cat:'puzzle',desc:'جفت‌ها را پیدا کن',available:true},
  {id:'2048',name:'2048',icon:'🔢',cat:'puzzle',desc:'اعداد را ترکیب کن',available:true},
  {id:'minesweeper',name:'Minesweeper',icon:'💣',cat:'puzzle',desc:'مین‌ها را علامت بزن',available:true},
  {id:'math',name:'Speed Math',icon:'🧮',cat:'action',desc:'سریع حساب کن',available:true},
  {id:'match3',name:'Match 3',icon:'💎',cat:'puzzle',desc:'سه‌تایی‌ها را جور کن',available:true},
  {id:'shooter',name:'Space Shooter',icon:'🚀',cat:'action',desc:'دشمن‌ها را نابود کن',available:true},
  {id:'clicker',name:'Idle Clicker',icon:'💰',cat:'strategy',desc:'کلیک کن، ارتقا بده',available:true},
  {id:'tower',name:'Tower Defense',icon:'🏰',cat:'strategy',desc:'از پایگاه دفاع کن',available:true},
  {id:'solitaire',name:'Solitaire',icon:'🃏',cat:'strategy',desc:'کارت‌ها را مرتب کن',available:true},
  {id:'stack',name:'Tower Stack',icon:'🏗️',cat:'skill',desc:'برج بساز',available:true},
  {id:'color',name:'Color Switch',icon:'🎨',cat:'skill',desc:'رنگ را تطبیق بده',available:true},
  {id:'word',name:'Word Puzzle',icon:'📝',cat:'skill',desc:'کلمات را مرتب کن',available:true},
  {id:'physics',name:'Physics Ball',icon:'⚪',cat:'skill',desc:'توپ را به هدف برسان',available:true},
  {id:'reaction',name:'Reaction Test',icon:'⚡',cat:'action',desc:'واکنش سریع',available:true}
];
window.CATEGORIES=CATEGORIES;window.GAME_REGISTRY=GAME_REGISTRY;
