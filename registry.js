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
{id:'runner',name:'Neon Runner',icon:'🏃',cat:'arcade',desc:'بپر، جمع کن، زنده بمان',available:true},
{id:'tetris',name:'Neon Tetris',icon:'🟦',cat:'puzzle',desc:'ردیف‌ها را پر کن',available:true},
{id:'blocks',name:'Block Puzzle',icon:'🧩',cat:'puzzle',desc:'بلوک‌ها را بچین',available:false},
{id:'flappy',name:'Flappy Neon',icon:'🐦',cat:'arcade',desc:'پرواز کن',available:false},
{id:'snake',name:'Snake Neon',icon:'🐍',cat:'arcade',desc:'بخور و بلند شو',available:false},
{id:'breakout',name:'Breakout',icon:'🎯',cat:'arcade',desc:'آجرها را بشکن',available:false},
{id:'memory',name:'Memory Match',icon:'🧠',cat:'puzzle',desc:'جفت‌ها را پیدا کن',available:false},
{id:'2048',name:'2048',icon:'🔢',cat:'puzzle',desc:'اعداد را ترکیب کن',available:false},
{id:'minesweeper',name:'Minesweeper',icon:'💣',cat:'puzzle',desc:'مین‌ها را علامت بزن',available:false},
{id:'match3',name:'Match 3',icon:'💎',cat:'puzzle',desc:'سه‌تایی‌ها را جور کن',available:false},
{id:'math',name:'Speed Math',icon:'🧮',cat:'action',desc:'سریع حساب کن',available:false},
{id:'reaction',name:'Reaction Test',icon:'⚡',cat:'action',desc:'واکنش سریع',available:false},
{id:'shooter',name:'Space Shooter',icon:'🚀',cat:'action',desc:'دشمن‌ها را نابود کن',available:false},
{id:'clicker',name:'Idle Clicker',icon:'💰',cat:'strategy',desc:'کلیک کن، ارتقا بده',available:false},
{id:'tower',name:'Tower Defense',icon:'🏰',cat:'strategy',desc:'از پایگاهت دفاع کن',available:false},
{id:'solitaire',name:'Solitaire',icon:'🃏',cat:'strategy',desc:'کارت‌ها را مرتب کن',available:false},
{id:'stack',name:'Tower Stack',icon:'🏗️',cat:'skill',desc:'برج بساز',available:false},
{id:'color',name:'Color Switch',icon:'🎨',cat:'skill',desc:'رنگ را تطبیق بده',available:false},
{id:'word',name:'Word Puzzle',icon:'📝',cat:'skill',desc:'کلمات را پیدا کن',available:false},
{id:'physics',name:'Physics Ball',icon:'⚪',cat:'skill',desc:'توپ را به هدف برسان',available:false}
];
window.CATEGORIES=CATEGORIES;window.GAME_REGISTRY=GAME_REGISTRY;
