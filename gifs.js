/**
 * gifs.js — Meme GIF library via KLIPY API
 * Plug your free API key from https://klipy.com/developers
 * Endpoints: https://api.klipy.com/v1/memes/trending  |  /search?q=...
 */

const KLIPY_BASE  = 'https://api.klipy.com/v1';
const KEY_STORAGE = 'sb_klipy_key';

let gifApiKey     = localStorage.getItem(KEY_STORAGE) || '';
let gifNextPos    = null;   // pagination cursor
let gifCurrentQ   = '';     // '' = trending
let gifLoading    = false;
let gifMode       = false;  // whether GIF panel is active

// ─── Public API ─────────────────────────────────────────────────────────────

export function isGifMode() { return gifMode; }

export function initGifPanel(container, onClose) {
    gifMode = true;
    container.innerHTML = '';
    container.appendChild(buildPanel(onClose));
    if (gifApiKey) {
        fetchGifs('');
    } else {
        showKeyPrompt(container);
    }
}

export function destroyGifPanel() {
    gifMode    = false;
    gifNextPos = null;
    gifCurrentQ = '';
}

// ─── Key management ─────────────────────────────────────────────────────────

function saveKey(key) {
    gifApiKey = key.trim();
    localStorage.setItem(KEY_STORAGE, gifApiKey);
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchGifs(query, append = false) {
    if (gifLoading) return;
    gifLoading = true;

    const grid    = document.getElementById('gif-grid');
    const spinner = document.getElementById('gif-spinner');
    const errEl   = document.getElementById('gif-error');
    if (errEl) errEl.textContent = '';

    if (!append) {
        gifNextPos  = null;
        gifCurrentQ = query;
        grid.innerHTML = '';
    }
    if (spinner) spinner.hidden = false;

    const isSearch = query.trim().length > 0;
    let url;
    if (isSearch) {
        url = `${KLIPY_BASE}/memes/search?q=${encodeURIComponent(query)}&limit=24&api_key=${gifApiKey}`;
    } else {
        url = `${KLIPY_BASE}/memes/trending?limit=24&api_key=${gifApiKey}`;
    }
    if (append && gifNextPos) {
        url += `&pos=${encodeURIComponent(gifNextPos)}`;
    }

    try {
        const res  = await fetch(url);
        const data = await res.json();

        if (!res.ok || data.status === 'error') {
            throw new Error(data.message || `HTTP ${res.status}`);
        }

        const results = data.data?.results || data.results || [];
        gifNextPos    = data.data?.next || data.next || null;

        results.forEach(item => grid.appendChild(makeGifCard(item)));
        updateLoadMoreBtn();

    } catch (err) {
        if (errEl) errEl.textContent = `⚠️ ${err.message}`;
    } finally {
        gifLoading = false;
        if (spinner) spinner.hidden = true;
    }
}

// ─── DOM builders ────────────────────────────────────────────────────────────

function buildPanel(onClose) {
    const wrap = document.createElement('div');
    wrap.id = 'gif-panel';

    // Search bar
    const searchRow = document.createElement('div');
    searchRow.className = 'gif-search-row';

    const input = document.createElement('input');
    input.id          = 'gif-search-input';
    input.type        = 'text';
    input.placeholder = '🔍 Search meme GIFs…';
    input.className   = 'gif-search-input';

    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => fetchGifs(input.value), 380);
    });

    searchRow.appendChild(input);
    wrap.appendChild(searchRow);

    // Error + spinner
    const err = document.createElement('div');
    err.id        = 'gif-error';
    err.className = 'gif-error';
    wrap.appendChild(err);

    const spinner = document.createElement('div');
    spinner.id      = 'gif-spinner';
    spinner.className = 'gif-spinner';
    spinner.hidden  = true;
    spinner.textContent = 'Loading…';
    wrap.appendChild(spinner);

    // Grid
    const grid = document.createElement('div');
    grid.id        = 'gif-grid';
    grid.className = 'gif-grid';
    wrap.appendChild(grid);

    // Load more
    const more = document.createElement('button');
    more.id        = 'gif-load-more';
    more.className = 'gif-load-more hidden';
    more.textContent = 'Load more';
    more.onclick   = () => fetchGifs(gifCurrentQ, true);
    wrap.appendChild(more);

    // Key settings footer
    const footer = document.createElement('div');
    footer.className = 'gif-footer';
    footer.innerHTML = `<span class="gif-footer-label">KLIPY API key</span>`;
    const keyInput = document.createElement('input');
    keyInput.type        = 'text';
    keyInput.className   = 'gif-key-input';
    keyInput.placeholder = 'Paste your key…';
    keyInput.value       = gifApiKey;
    keyInput.addEventListener('change', () => {
        saveKey(keyInput.value);
        fetchGifs('');
    });
    footer.appendChild(keyInput);

    const getKeyLink = document.createElement('a');
    getKeyLink.href        = 'https://klipy.com/developers';
    getKeyLink.target      = '_blank';
    getKeyLink.rel         = 'noopener';
    getKeyLink.textContent = 'Get free key ↗';
    getKeyLink.className   = 'gif-get-key-link';
    footer.appendChild(getKeyLink);
    wrap.appendChild(footer);

    return wrap;
}

function makeGifCard(item) {
    // KLIPY media object — try tinygif first, fall back to gif
    const media   = item.media_formats || item.media || {};
    const preview = media.tinygif?.url || media.gif?.url || media.mediumgif?.url || '';
    const full    = media.gif?.url || preview;
    const title   = item.title || item.id || '';

    const card = document.createElement('div');
    card.className = 'gif-card';
    card.title     = title;

    const img = document.createElement('img');
    img.className       = 'gif-img';
    img.loading         = 'lazy';
    img.src             = preview;
    img.alt             = title;
    img.dataset.full    = full;

    // On hover swap to full-res (if different)
    img.addEventListener('mouseenter', () => { if (full !== preview) img.src = full; });
    img.addEventListener('mouseleave', () => { img.src = preview; });

    // Click: open full gif in new tab
    card.addEventListener('click', () => window.open(full, '_blank'));

    // Right-click: copy link / download
    card.addEventListener('contextmenu', e => showGifCtx(e, item, full, title));

    card.appendChild(img);
    return card;
}

function showGifCtx(event, item, url, title) {
    event.preventDefault();
    const menu = document.getElementById('ctx-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');

    const lbl = document.createElement('span');
    lbl.className   = 'ctx-label';
    lbl.textContent = title || 'GIF';
    menu.appendChild(lbl);

    const copyItem = document.createElement('button');
    copyItem.className   = 'ctx-item';
    copyItem.textContent = '🔗 Copy GIF link';
    copyItem.onclick = () => {
        navigator.clipboard.writeText(url).catch(() => {});
        menu.classList.add('hidden');
    };

    const dlItem = document.createElement('button');
    dlItem.className   = 'ctx-item';
    dlItem.textContent = '💾 Open in new tab';
    dlItem.onclick = () => {
        window.open(url, '_blank');
        menu.classList.add('hidden');
    };

    menu.appendChild(copyItem);
    menu.appendChild(dlItem);

    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top  = '0px';
    requestAnimationFrame(() => {
        const menuW = menu.offsetWidth;
        const menuH = menu.offsetHeight;
        let x = event.clientX + (window.scrollX || 0);
        let y = event.clientY + (window.scrollY || 0);
        if (event.clientX + menuW > window.innerWidth)  x -= menuW;
        if (event.clientY + menuH > window.innerHeight) y -= menuH;
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';
        menu.style.visibility = '';
    });
}

function showKeyPrompt(container) {
    const err = document.getElementById('gif-error');
    if (err) err.textContent = 'Add your free KLIPY API key below to load meme GIFs.';
}

function updateLoadMoreBtn() {
    const btn = document.getElementById('gif-load-more');
    if (!btn) return;
    btn.classList.toggle('hidden', !gifNextPos);
}
