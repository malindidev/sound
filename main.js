import { sounds } from './sounds.js';
import { initGifPanel, destroyGifPanel, isGifMode } from './gifs.js';

const RECENT_KEY   = 'sb_recent';
const FAV_KEY      = 'sb_favorites';
const MAX_RECENT   = 8;
const CDN          = 'https://cdn.jsdelivr.net/gh/genizy/soundboard@main/';

let allowOverlap   = false;
let currentAudios  = [];
let playingMap     = new Map();
let activeCategory = 'all';
let activeMobView  = 'all';

const dedupe = list => {
    const seen = new Set();
    return list.filter(s => seen.has(s.mp3) ? false : (seen.add(s.mp3), true));
};

const allSounds = dedupe(sounds);

const getFavs    = () => JSON.parse(localStorage.getItem(FAV_KEY)  || '[]');
const getRecent  = () => JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
const saveFavs   = v => localStorage.setItem(FAV_KEY, JSON.stringify(v));
const saveRecent = v => localStorage.setItem(RECENT_KEY, JSON.stringify(v));

function addRecent(sound) {
    let r = getRecent().filter(s => s.mp3 !== sound.mp3);
    r.unshift(sound);
    if (r.length > MAX_RECENT) r = r.slice(0, MAX_RECENT);
    saveRecent(r);
}

const CATEGORIES = {
    'FNAF':     s => /fnaf|freddy|foxy|bonnie|chica|springtrap|balloon boy/i.test(s.name),
    'Fart':     s => /fart|perdezh|poop|nuclear diarrhea/i.test(s.name),
    'Discord':  s => /discord/i.test(s.name),
    'Minecraft':s => /minecraft|creeper|roblox|oof/i.test(s.name),
    'Vine':     s => /vine|boom|bruh/i.test(s.name),
    'Spongebob':s => /spongebob|patrick|squidward|plankton/i.test(s.name),
    'Mario':    s => /mario|luigi|koopa|bowser|yoshi/i.test(s.name),
    'Sonic':    s => /sonic|tails|knuckles/i.test(s.name),
    'Fah':      s => /fa+h+|faa+/i.test(s.name),
    'Scream':   s => /scream|yell|aaaa|rahh|raaaa/i.test(s.name),
    'Meme':     s => /meme/i.test(s.name),
};

function buildCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn active';
    allBtn.dataset.cat = 'all';
    const allCount = document.createElement('span');
    allCount.className = 'cat-count';
    allCount.textContent = allSounds.length;
    allBtn.append('🔊 All', allCount);
    allBtn.onclick = () => setCategory('all');
    list.appendChild(allBtn);

    const favBtn = document.createElement('button');
    favBtn.className = 'cat-btn';
    favBtn.dataset.cat = 'favorites';
    const favCount = document.createElement('span');
    favCount.className = 'cat-count';
    favCount.textContent = getFavs().length;
    favBtn.append('⭐ Favorites', favCount);
    favBtn.onclick = () => setCategory('favorites');
    list.appendChild(favBtn);

    const gifBtn = document.createElement('button');
    gifBtn.className = 'cat-btn cat-btn--gif';
    gifBtn.dataset.cat = 'gifs';
    const gifBadge = document.createElement('span');
    gifBadge.className = 'cat-count cat-count--gif';
    gifBadge.textContent = 'GIF';
    gifBtn.append('🎭 Meme GIFs', gifBadge);
    gifBtn.onclick = () => setCategory('gifs');
    list.appendChild(gifBtn);

    Object.entries(CATEGORIES).forEach(([name, test]) => {
        const matches = allSounds.filter(test);
        if (matches.length < 3) return;
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.dataset.cat = name;
        const cnt = document.createElement('span');
        cnt.className = 'cat-count';
        cnt.textContent = matches.length;
        btn.append(name, cnt);
        btn.onclick = () => setCategory(name);
        list.appendChild(btn);
    });
}

function setCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    document.getElementById('searchInput').value = '';

    if (cat === 'gifs') {
        // Hide sound sections, show GIF panel
        document.getElementById('recent-section').classList.add('hidden');
        document.getElementById('main-section').classList.add('hidden');
        const content = document.getElementById('content');
        let gifWrap = document.getElementById('gif-wrap');
        if (!gifWrap) {
            gifWrap = document.createElement('div');
            gifWrap.id = 'gif-wrap';
            content.appendChild(gifWrap);
        }
        gifWrap.style.display = '';
        initGifPanel(gifWrap, () => setCategory('all'));
    } else {
        // Tear down GIF panel if leaving
        const gifWrap = document.getElementById('gif-wrap');
        if (gifWrap) gifWrap.style.display = 'none';
        destroyGifPanel();
        document.getElementById('main-section').classList.remove('hidden');
        renderMain();
        renderRecent();
    }
}

function getPool(filter = '') {
    let pool = allSounds;
    if (activeCategory === 'favorites') {
        pool = getFavs();
    } else if (activeCategory !== 'all' && CATEGORIES[activeCategory]) {
        pool = allSounds.filter(CATEGORIES[activeCategory]);
    }
    if (filter) pool = pool.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
    return pool;
}

function makeBtn(sound, small = false) {
    const btn = document.createElement('button');
    btn.className = 'sound-btn';
    btn.style.setProperty('--btn-color', sound.color);
    if (small) btn.style.fontSize = '0.62rem';

    const favs = getFavs();
    const isFav = favs.some(f => f.mp3 === sound.mp3);
    if (isFav) {
        const dot = document.createElement('span');
        dot.className = 'fav-dot';
        dot.textContent = '⭐';
        btn.appendChild(dot);
    }

    const label = document.createElement('span');
    label.textContent = sound.name;
    btn.appendChild(label);

    btn.addEventListener('click', () => playSound(sound, btn));
    btn.addEventListener('contextmenu', e => showCtxMenu(e, sound, btn));

    return btn;
}

function playSound(sound, btn) {
    if (!allowOverlap) {
        currentAudios.forEach(a => a.pause());
        currentAudios = [];
        playingMap.forEach(b => b.classList.remove('playing'));
        playingMap.clear();
    }

    const audio = new Audio(CDN + sound.mp3);
    audio.play();
    currentAudios.push(audio);
    playingMap.set(audio, btn);

    btn.classList.add('pressed', 'playing');
    setTimeout(() => btn.classList.remove('pressed'), 120);

    audio.addEventListener('ended', () => {
        const mappedBtn = playingMap.get(audio);
        if (mappedBtn) mappedBtn.classList.remove('playing');
        playingMap.delete(audio);
        currentAudios = currentAudios.filter(a => a !== audio);
    });

    addRecent(sound);
    renderRecent();
}

function renderRecent() {
    const recent = getRecent();
    const section = document.getElementById('recent-section');
    const grid = document.getElementById('recent-grid');

    if (recent.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');
    grid.innerHTML = '';
    recent.forEach(s => grid.appendChild(makeBtn(s, true)));
}

function renderMain(filter = '') {
    const pool = getPool(filter);
    const grid = document.getElementById('soundboard');
    const label = document.getElementById('section-label');
    const countBadge = document.getElementById('sound-count');
    const searchCount = document.getElementById('searchCount');

    grid.innerHTML = '';
    playingMap.clear();

    const catName = activeCategory === 'all' ? 'All Sounds'
        : activeCategory === 'favorites' ? '⭐ Favorites'
        : activeCategory;

    // FIX: safely set the label text without assuming childNodes structure
    label.textContent = '';
    label.append(catName + ' ', countBadge);
    countBadge.textContent = pool.length;

    searchCount.textContent = filter ? `${pool.length} results` : '';

    pool.forEach(s => grid.appendChild(makeBtn(s)));
}

function showCtxMenu(event, sound, btn) {
    event.preventDefault();
    const menu = document.getElementById('ctx-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');

    const lbl = document.createElement('span');
    lbl.className = 'ctx-label';
    lbl.textContent = sound.name;
    menu.appendChild(lbl);

    const favs = getFavs();
    const isFav = favs.some(f => f.mp3 === sound.mp3);

    const favItem = document.createElement('button');
    favItem.className = 'ctx-item';
    favItem.textContent = isFav ? '⭐ Unfavorite' : '🌟 Favorite';
    favItem.onclick = () => {
        let f = getFavs();
        if (isFav) {
            f = f.filter(x => x.mp3 !== sound.mp3);
        } else {
            f.push(sound);
        }
        saveFavs(f);
        menu.classList.add('hidden');
        buildCategories();
        renderMain(document.getElementById('searchInput').value);
    };

    const dlItem = document.createElement('button');
    dlItem.className = 'ctx-item';
    dlItem.textContent = '💾 Download';
    dlItem.onclick = () => {
        const a = document.createElement('a');
        a.href = CDN + sound.mp3;
        a.download = sound.mp3.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        menu.classList.add('hidden');
    };

    menu.appendChild(favItem);
    menu.appendChild(dlItem);

    // FIX: clamp using viewport dimensions, not scrollHeight (unreliable)
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top  = '0px';
    requestAnimationFrame(() => {
        const menuW = menu.offsetWidth;
        const menuH = menu.offsetHeight;
        let x = event.clientX + (window.scrollX || window.pageXOffset);
        let y = event.clientY + (window.scrollY || window.pageYOffset);
        if (event.clientX + menuW > window.innerWidth)  x -= menuW;
        if (event.clientY + menuH > window.innerHeight) y -= menuH;
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';
        menu.style.visibility = '';
    });
}

document.addEventListener('click', e => {
    const menu = document.getElementById('ctx-menu');
    if (!menu.contains(e.target)) menu.classList.add('hidden');
});
document.addEventListener('scroll', () => {
    document.getElementById('ctx-menu').classList.add('hidden');
});

document.getElementById('toggleButton').onclick = () => {
    allowOverlap = !allowOverlap;
    document.getElementById('toggleButton').textContent = allowOverlap ? '🔊 Overlap: ON' : '🔇 Overlap: OFF';
};

document.getElementById('stopButton').onclick = stopAll;
document.getElementById('mob-stop').onclick   = stopAll;

function stopAll() {
    currentAudios.forEach(a => a.pause());
    currentAudios = [];
    playingMap.forEach(b => b.classList.remove('playing'));
    playingMap.clear();
}

document.getElementById('searchInput').addEventListener('input', e => {
    renderMain(e.target.value);
});

document.querySelectorAll('.mob-nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        activeMobView = view;
        if (view === 'favorites') setCategory('favorites');
        else if (view === 'recent') {
            setCategory('all');
            document.getElementById('recent-section').scrollIntoView({ behavior: 'smooth' });
        } else {
            setCategory('all');
        }
    });
});

document.getElementById('mob-tts').onclick = () => {
    document.getElementById('ttsPanel').classList.toggle('hidden');
};

const ttsToggle = document.getElementById('ttsToggle');
const ttsPanel  = document.getElementById('ttsPanel');
ttsToggle.onclick = () => {
    ttsPanel.classList.toggle('hidden');
    ttsToggle.classList.toggle('tts-toggle-active');
};
document.getElementById('ttsClose').onclick = () => {
    ttsPanel.classList.add('hidden');
    ttsToggle.classList.remove('tts-toggle-active');
};

const synth = window.speechSynthesis;
let allVoices = [];

function loadVoices() {
    allVoices = synth.getVoices();
    if (!allVoices.length) return;
    const langs = [...new Set(allVoices.map(v => v.lang))].sort();
    const lf = document.getElementById('ttsLangFilter');
    lf.innerHTML = '<option value="">All Languages</option>';
    langs.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; lf.appendChild(o); });
    populateVoices('');
}

function populateVoices(lang) {
    const filtered = lang ? allVoices.filter(v => v.lang === lang) : allVoices;
    const sel = document.getElementById('ttsVoice');
    sel.innerHTML = '';
    filtered.forEach((v, i) => {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = `${v.name} (${v.lang})${v.default ? ' ★' : ''}`;
        sel.appendChild(o);
    });
    const di = filtered.findIndex(v => v.default);
    if (di >= 0) sel.selectedIndex = di;
}

function getVoice() {
    const lang = document.getElementById('ttsLangFilter').value;
    const filtered = lang ? allVoices.filter(v => v.lang === lang) : allVoices;
    return filtered[document.getElementById('ttsVoice').selectedIndex] || null;
}

loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;
document.getElementById('ttsLangFilter').onchange = () => populateVoices(document.getElementById('ttsLangFilter').value);

['ttsVolume','ttsRate','ttsPitch'].forEach(id => {
    const el  = document.getElementById(id);
    const val = document.getElementById(id + 'Val');
    const dp  = id === 'ttsRate' ? 1 : 2;
    el.addEventListener('input', () => { val.textContent = parseFloat(el.value).toFixed(dp); });
});

document.getElementById('ttsSpeak').onclick = () => {
    const text = document.getElementById('ttsText').value.trim();
    if (!text) { setTtsStatus('Enter some text first', 'warn'); return; }
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice  = getVoice();
    utt.volume = parseFloat(document.getElementById('ttsVolume').value);
    utt.rate   = parseFloat(document.getElementById('ttsRate').value);
    utt.pitch  = parseFloat(document.getElementById('ttsPitch').value);
    utt.onstart = () => { setTtsStatus('Speaking...', 'speaking'); setTtsBtns(true); document.getElementById('ttsSpeaking').classList.remove('hidden'); };
    utt.onboundary = e => {
        if (e.name === 'word') {
            const w = text.substr(e.charIndex, e.charLength);
            const cw = document.getElementById('ttsCurrentWord');
            cw.textContent = w;
            cw.classList.remove('word-pop');
            void cw.offsetWidth;
            cw.classList.add('word-pop');
        }
    };
    utt.onpause  = () => setTtsStatus('Paused', 'paused');
    utt.onresume = () => setTtsStatus('Resumed...', 'speaking');
    utt.onend    = () => { setTtsStatus('Done', 'done'); setTtsBtns(false); document.getElementById('ttsSpeaking').classList.add('hidden'); };
    utt.onerror  = e => { setTtsStatus('Error: ' + e.error, 'error'); setTtsBtns(false); };
    synth.speak(utt);
};

document.getElementById('ttsPause').onclick  = () => { if (synth.speaking && !synth.paused) synth.pause(); document.getElementById('ttsPause').disabled = true; document.getElementById('ttsResume').disabled = false; };
document.getElementById('ttsResume').onclick = () => { if (synth.paused) synth.resume(); document.getElementById('ttsPause').disabled = false; document.getElementById('ttsResume').disabled = true; };
document.getElementById('ttsStop').onclick   = () => { synth.cancel(); setTtsBtns(false); document.getElementById('ttsSpeaking').classList.add('hidden'); setTtsStatus('Stopped', 'idle'); };

// FIX: ttsReset now correctly resets each slider to its own default value
document.getElementById('ttsReset').onclick  = () => {
    const defaults = { ttsVolume: 1, ttsRate: 1, ttsPitch: 1 };
    const decimals = { ttsVolume: 2, ttsRate: 1, ttsPitch: 2 };
    Object.entries(defaults).forEach(([id, def]) => {
        const el = document.getElementById(id);
        const val = document.getElementById(id + 'Val');
        el.value = def;
        val.textContent = def.toFixed(decimals[id]);
    });
    document.getElementById('ttsLangFilter').value = '';
    populateVoices('');
    setTtsStatus('Reset', 'idle');
};

function setTtsBtns(active) {
    document.getElementById('ttsSpeak').disabled  = active;
    document.getElementById('ttsPause').disabled  = !active;
    document.getElementById('ttsStop').disabled   = !active;
    document.getElementById('ttsResume').disabled = true;
}

function setTtsStatus(msg, state) {
    const el = document.getElementById('ttsStatus');
    el.textContent = msg;
    el.className = `tts-status tts-status--${state}`;
}

buildCategories();
renderRecent();
renderMain();
