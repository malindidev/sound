/**
 * gifs.js — Meme GIFs via Tenor v1 (public demo key, zero setup)
 * Tenor shuts down June 2026 — swap key for KLIPY then if needed
 */

const TENOR_KEY  = 'LIVDSRZULELA';
const BASE       = 'https://g.tenor.com/v1';

let nextPos     = null;
let currentQ    = '';
let loading     = false;
let gifMode     = false;

export function isGifMode()     { return gifMode; }
export function destroyGifPanel() { gifMode = false; nextPos = null; currentQ = ''; }

export function initGifPanel(container) {
    gifMode = true;
    container.innerHTML = '';
    container.appendChild(buildPanel());
    fetchGifs('');
}

// ── Fetch ─────────────────────────────────────────────────

async function fetchGifs(query, append = false) {
    if (loading) return;
    loading = true;

    const grid    = document.getElementById('gif-grid');
    const spinner = document.getElementById('gif-spinner');
    const errEl   = document.getElementById('gif-error');

    if (errEl) errEl.textContent = '';
    if (!append) { nextPos = null; currentQ = query; grid.innerHTML = ''; }
    if (spinner) spinner.hidden = false;

    const q      = query.trim();
    const pos    = append && nextPos ? `&pos=${encodeURIComponent(nextPos)}` : '';
    const url    = q
        ? `${BASE}/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=24&media_filter=minimal${pos}`
        : `${BASE}/trending?key=${TENOR_KEY}&limit=24&media_filter=minimal${pos}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();

        (data.results || []).forEach(item => grid.appendChild(makeCard(item)));
        nextPos = data.next || null;

        const more = document.getElementById('gif-load-more');
        if (more) more.classList.toggle('hidden', !nextPos);

    } catch (err) {
        if (errEl) errEl.textContent = `⚠️ ${err.message}`;
    } finally {
        loading = false;
        if (spinner) spinner.hidden = true;
    }
}

// ── DOM ───────────────────────────────────────────────────

function buildPanel() {
    const wrap = document.createElement('div');
    wrap.id = 'gif-panel';

    const input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = '🔍 Search meme GIFs…';
    input.className   = 'gif-search-input';
    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => fetchGifs(input.value), 360);
    });
    wrap.appendChild(input);

    const err = document.createElement('div');
    err.id = 'gif-error'; err.className = 'gif-error';
    wrap.appendChild(err);

    const spinner = document.createElement('div');
    spinner.id = 'gif-spinner'; spinner.className = 'gif-spinner'; spinner.hidden = true;
    spinner.textContent = 'Loading…';
    wrap.appendChild(spinner);

    const grid = document.createElement('div');
    grid.id = 'gif-grid'; grid.className = 'gif-grid';
    wrap.appendChild(grid);

    const more = document.createElement('button');
    more.id = 'gif-load-more'; more.className = 'gif-load-more hidden';
    more.textContent = 'Load more';
    more.onclick = () => fetchGifs(currentQ, true);
    wrap.appendChild(more);

    return wrap;
}

function makeCard(item) {
    // Tenor v1 media object
    const media   = item.media?.[0] || {};
    const preview = media.tinygif?.url || media.mediumgif?.url || media.gif?.url || '';
    const full    = media.gif?.url || preview;
    const title   = item.title || '';

    const card = document.createElement('div');
    card.className = 'gif-card';
    card.title     = title;

    const img = document.createElement('img');
    img.className = 'gif-img';
    img.loading   = 'lazy';
    img.src       = preview;
    img.alt       = title;
    img.addEventListener('mouseenter', () => { if (full !== preview) img.src = full; });
    img.addEventListener('mouseleave', () => { img.src = preview; });

    card.addEventListener('click', () => window.open(full, '_blank'));
    card.addEventListener('contextmenu', e => showCtx(e, full, title));
    card.appendChild(img);
    return card;
}

function showCtx(event, url, title) {
    event.preventDefault();
    const menu = document.getElementById('ctx-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');

    const lbl = document.createElement('span');
    lbl.className = 'ctx-label';
    lbl.textContent = title || 'GIF';
    menu.appendChild(lbl);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'ctx-item';
    copyBtn.textContent = '🔗 Copy GIF link';
    copyBtn.onclick = () => { navigator.clipboard.writeText(url).catch(() => {}); menu.classList.add('hidden'); };

    const openBtn = document.createElement('button');
    openBtn.className = 'ctx-item';
    openBtn.textContent = '↗ Open in new tab';
    openBtn.onclick = () => { window.open(url, '_blank'); menu.classList.add('hidden'); };

    menu.append(copyBtn, openBtn);

    menu.style.visibility = 'hidden';
    menu.style.left = '0'; menu.style.top = '0';
    requestAnimationFrame(() => {
        let x = event.clientX + (window.scrollX || 0);
        let y = event.clientY + (window.scrollY || 0);
        if (event.clientX + menu.offsetWidth  > window.innerWidth)  x -= menu.offsetWidth;
        if (event.clientY + menu.offsetHeight > window.innerHeight) y -= menu.offsetHeight;
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';
        menu.style.visibility = '';
    });
}
