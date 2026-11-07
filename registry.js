window.CATEGORIES = [
    { id: 'all', name: 'همه', icon: '🎮' },
    { id: 'arcade', name: 'آرکید', icon: '⚡' },
    { id: 'puzzle', name: 'فکری', icon: '🧠' },
    { id: 'action', name: 'اکشن', icon: '💥' },
    { id: 'strategy', name: 'استراتژی', icon: '♟️' },
    { id: 'skill', name: 'مهارتی', icon: '🎯' }
];

window.GAME_REGISTRY = [
    { id: 'runner', icon: '🏃', cat: 'arcade', fa: 'دونده نئونی', en: 'Neon Runner', desc: 'بپر، جمع کن، زنده بمان' },
    { id: 'tetris', icon: '🟦', cat: 'puzzle', fa: 'تتریس', en: 'Neon Tetris', desc: 'ردیف‌ها را پر کن' },
    { id: 'blocks', icon: '🧩', cat: 'puzzle', fa: 'پازل بلوکی', en: 'Block Puzzle', desc: 'بلوک‌ها را بچین' },
    { id: 'flappy', icon: '🐦', cat: 'arcade', fa: 'پرنده', en: 'Flappy Neon', desc: 'پرواز کن، مانع را رد کن' },
    { id: 'snake', icon: '🐍', cat: 'arcade', fa: 'مار نئونی', en: 'Snake Neon', desc: 'بخور و بلند شو' },
    { id: 'breakout', icon: '🎯', cat: 'arcade', fa: 'آجرشکن', en: 'Breakout', desc: 'آجرها را بشکن' },
    { id: 'memory', icon: '🧠', cat: 'puzzle', fa: 'حافظه', en: 'Memory Match', desc: 'جفت‌ها را پیدا کن' },
    { id: '2048', icon: '🔢', cat: 'puzzle', fa: '۲۰۴۸', en: '2048', desc: 'اعداد را ترکیب کن' },
    { id: 'minesweeper', icon: '💣', cat: 'puzzle', fa: 'مین‌یاب', en: 'Minesweeper', desc: 'مین‌ها را علامت بزن' },
    { id: 'math', icon: '🧮', cat: 'action', fa: 'ریاضی سریع', en: 'Speed Math', desc: 'سریع حساب کن' },
    { id: 'match3', icon: '💎', cat: 'puzzle', fa: 'جورچین', en: 'Match 3', desc: 'سه‌تایی‌ها را جور کن' },
    { id: 'shooter', icon: '🚀', cat: 'action', fa: 'فضایی', en: 'Space Shooter', desc: 'دشمن‌ها را نابود کن' },
    { id: 'clicker', icon: '💰', cat: 'strategy', fa: 'کلیکر', en: 'Idle Clicker', desc: 'کلیک کن، ارتقا بده' },
    { id: 'tower', icon: '🏰', cat: 'strategy', fa: 'دفاع', en: 'Tower Defense', desc: 'از پایگاهت دفاع کن' },
    { id: 'solitaire', icon: '🃏', cat: 'strategy', fa: 'پاسور', en: 'Solitaire', desc: 'کارت‌ها را مرتب کن' },
    { id: 'stack', icon: '🏗️', cat: 'skill', fa: 'برج‌ساز', en: 'Tower Stack', desc: 'برج بساز' },
    { id: 'color', icon: '🎨', cat: 'skill', fa: 'تعویض رنگ', en: 'Color Switch', desc: 'رنگ را تطبیق بده' },
    { id: 'word', icon: '📝', cat: 'skill', fa: 'کلمات', en: 'Word Puzzle', desc: 'کلمات را مرتب کن' },
    { id: 'physics', icon: '⚪', cat: 'skill', fa: 'توپ فیزیکی', en: 'Physics Ball', desc: 'توپ را به هدف برسان' },
    { id: 'reaction', icon: '⚡', cat: 'action', fa: 'تست واکنش', en: 'Reaction', desc: 'واکنش سریع' },
    { id: 'timberman', icon: '🪓', cat: 'arcade', fa: 'چوب‌بر', en: 'Timberman', desc: 'شاخه‌ها را قطع کن' }
].map(g => ({ ...g, available: true }));
