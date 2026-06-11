import { sounds } from './sounds.js';

let allowOverlap  = false;
let showFavorites = false;
let currentAudios = [];
let playingImages = new Map();

const toggleButton  = document.getElementById('toggleButton');
const stopButton    = document.getElementById('stopButton');
const searchInput   = document.getElementById('searchInput');
const searchCount   = document.getElementById('searchCount');
const favoriteButton = document.getElementById('toggleFavorites');
const soundBoard    = document.getElementById('soundboard');

const savedVolume = localStorage.getItem('masterVolume');
let masterVolume = savedVolume !== null ? parseFloat(savedVolume) : 1;

function deduped(list) {
    const seen = new Set();
    return list.filter(s => {
        if (seen.has(s.mp3)) return false;
        seen.add(s.mp3);
        return true;
    });
}

toggleButton.onclick = () => {
    allowOverlap = !allowOverlap;
    toggleButton.textContent = allowOverlap ? '🔊 Overlap: ON' : '🔇 Overlap: OFF';
};

stopButton.onclick = () => {
    currentAudios.forEach(a => a.pause());
    currentAudios = [];
    playingImages.forEach(img => img.classList.remove('playing'));
    playingImages.clear();
};

favoriteButton.onclick = () => {
    showFavorites = !showFavorites;
    favoriteButton.textContent = showFavorites ? '🌟 Favorites: ON' : '⭐ Favorites: OFF';
    renderSounds(showFavorites ? 'filter:favorite ' + searchInput.value : searchInput.value);
};

function renderSounds(filter = '') {
    soundBoard.innerHTML = '';
    playingImages.clear();

    let pool;
    if (filter.startsWith('filter:favorite ')) {
        const term = filter.replace('filter:favorite ', '').toLowerCase();
        const favs = localStorage.getItem('favorites') ? JSON.parse(localStorage.getItem('favorites')) : [];
        pool = deduped(favs).filter(s => s.name.toLowerCase().includes(term));
    } else {
        pool = deduped(sounds).filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
    }

    searchCount.textContent = pool.length > 0 ? `${pool.length} sounds` : '';

    pool.forEach(sound => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sound-wrapper';

        const button = document.createElement('button');
        button.className = 'sound-button-img';
        button.style.setProperty('--btn-color', sound.color);

        const image = document.createElement('div');
        image.className = 'sound-image';
        button.appendChild(image);

        button.onclick = () => {
            if (!allowOverlap) {
                currentAudios.forEach(a => a.pause());
                currentAudios = [];
                playingImages.forEach(img => img.classList.remove('playing'));
                playingImages.clear();
            }

            const audio = new Audio('https://cdn.jsdelivr.net/gh/genizy/soundboard@main/' + sound.mp3);
            audio.volume = masterVolume;
            audio.play();
            currentAudios.push(audio);

            image.classList.add('pressed', 'playing');
            playingImages.set(audio, image);
            setTimeout(() => image.classList.remove('pressed'), 150);

            audio.addEventListener('ended', () => {
                image.classList.remove('playing');
                playingImages.delete(audio);
                currentAudios = currentAudios.filter(a => a !== audio);
            });
        };

        const label = document.createElement('div');
        label.className = 'sound-label';
        label.textContent = sound.name;

        wrapper.addEventListener('contextmenu', (e) => {
            rightClickPanel(e, sound, image);
        });

        wrapper.appendChild(button);
        wrapper.appendChild(label);
        soundBoard.appendChild(wrapper);
    });
}

renderSounds();

searchInput.addEventListener('input', () => {
    renderSounds((showFavorites ? 'filter:favorite ' : '') + searchInput.value);
});

function rightClickPanel(event, sound, image) {
    event.preventDefault();
    document.querySelectorAll('.right-click-panel').forEach(p => p.remove());

    const panel = document.createElement('div');
    panel.className = 'right-click-panel';
    panel.style.position = 'absolute';
    panel.style.left = `${event.pageX}px`;
    panel.style.top  = `${event.pageY}px`;

    const nameLabel = document.createElement('div');
    nameLabel.className = 'right-click-panel-label';
    nameLabel.textContent = sound.name;
    panel.appendChild(nameLabel);

    let favoriteJson = localStorage.getItem('favorites') ? JSON.parse(localStorage.getItem('favorites')) : [];
    const isFav = favoriteJson.some(item => item.mp3 === sound.mp3);

    const favBtn = document.createElement('button');
    favBtn.className = 'right-click-panel-button';
    favBtn.textContent = isFav ? '⭐ Unfavorite' : '🌟 Favorite';
    favBtn.onclick = () => {
        let favs = localStorage.getItem('favorites') ? JSON.parse(localStorage.getItem('favorites')) : [];
        const already = favs.some(item => item.mp3 === sound.mp3);
        if (already) {
            favs = favs.filter(item => item.mp3 !== sound.mp3);
            if (showFavorites) renderSounds('filter:favorite ' + searchInput.value);
        } else {
            favs.push(sound);
        }
        localStorage.setItem('favorites', JSON.stringify(favs));
        panel.remove();
    };

    const dlBtn = document.createElement('button');
    dlBtn.className = 'right-click-panel-button';
    dlBtn.textContent = '💾 Download';
    dlBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = 'https://cdn.jsdelivr.net/gh/genizy/soundboard@main/' + sound.mp3;
        link.download = sound.mp3.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        panel.remove();
    };

    panel.appendChild(favBtn);
    panel.appendChild(dlBtn);
    document.body.appendChild(panel);

    setTimeout(() => {
        const handleOutside = (e) => {
            if (!panel.contains(e.target)) {
                panel.remove();
                document.removeEventListener('click', handleOutside);
            }
        };
        document.addEventListener('click', handleOutside);
    }, 0);
}

// tts

const ttsToggle      = document.getElementById('ttsToggle');
const ttsPanel       = document.getElementById('ttsPanel');
const ttsClose       = document.getElementById('ttsClose');
const ttsText        = document.getElementById('ttsText');
const ttsVoice       = document.getElementById('ttsVoice');
const ttsLangFilter  = document.getElementById('ttsLangFilter');
const ttsVolume      = document.getElementById('ttsVolume');
const ttsRate        = document.getElementById('ttsRate');
const ttsPitch       = document.getElementById('ttsPitch');
const ttsVolumeVal   = document.getElementById('ttsVolumeVal');
const ttsRateVal     = document.getElementById('ttsRateVal');
const ttsPitchVal    = document.getElementById('ttsPitchVal');
const ttsSpeak       = document.getElementById('ttsSpeak');
const ttsPauseBtn    = document.getElementById('ttsPause');
const ttsResumeBtn   = document.getElementById('ttsResume');
const ttsStopBtn     = document.getElementById('ttsStop');
const ttsResetBtn    = document.getElementById('ttsReset');
const ttsStatus      = document.getElementById('ttsStatus');
const ttsSpeaking    = document.getElementById('ttsSpeaking');
const ttsCurrentWord = document.getElementById('ttsCurrentWord');

const synth = window.speechSynthesis;
let allVoices = [];
let currentUtterance = null;

ttsToggle.onclick = () => {
    ttsPanel.classList.toggle('hidden');
    ttsToggle.classList.toggle('tts-toggle-active');
};
ttsClose.onclick = () => {
    ttsPanel.classList.add('hidden');
    ttsToggle.classList.remove('tts-toggle-active');
};

function loadVoices() {
    allVoices = synth.getVoices();
    if (!allVoices.length) return;

    const langs = [...new Set(allVoices.map(v => v.lang))].sort();
    ttsLangFilter.innerHTML = '<option value="">All Languages</option>';
    langs.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = lang;
        ttsLangFilter.appendChild(opt);
    });

    populateVoiceList('');
}

function populateVoiceList(langFilter) {
    const filtered = langFilter ? allVoices.filter(v => v.lang === langFilter) : allVoices;
    ttsVoice.innerHTML = '';
    filtered.forEach((voice, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.dataset.voiceName = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})${voice.default ? ' ★' : ''}`;
        ttsVoice.appendChild(opt);
    });
    const defIdx = filtered.findIndex(v => v.default);
    if (defIdx >= 0) ttsVoice.selectedIndex = defIdx;
}

function getSelectedVoice() {
    const langFilter = ttsLangFilter.value;
    const filtered   = langFilter ? allVoices.filter(v => v.lang === langFilter) : allVoices;
    return filtered[ttsVoice.selectedIndex] || null;
}

loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

ttsLangFilter.addEventListener('change', () => populateVoiceList(ttsLangFilter.value));

ttsVolume.addEventListener('input', () => { ttsVolumeVal.textContent = parseFloat(ttsVolume.value).toFixed(2); });
ttsRate.addEventListener('input',   () => { ttsRateVal.textContent   = parseFloat(ttsRate.value).toFixed(1); });
ttsPitch.addEventListener('input',  () => { ttsPitchVal.textContent  = parseFloat(ttsPitch.value).toFixed(2); });

ttsSpeak.onclick = () => {
    const text = ttsText.value.trim();
    if (!text) { setStatus('Please enter some text first.', 'warn'); return; }
    synth.cancel();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.voice  = getSelectedVoice();
    currentUtterance.volume = parseFloat(ttsVolume.value);
    currentUtterance.rate   = parseFloat(ttsRate.value);
    currentUtterance.pitch  = parseFloat(ttsPitch.value);

    currentUtterance.onstart = () => { setStatus('Speaking...', 'speaking'); setBtns(true); ttsSpeaking.classList.remove('hidden'); };
    currentUtterance.onboundary = (e) => {
        if (e.name === 'word') {
            const word = text.substr(e.charIndex, e.charLength);
            ttsCurrentWord.textContent = word;
            ttsCurrentWord.classList.remove('word-pop');
            void ttsCurrentWord.offsetWidth;
            ttsCurrentWord.classList.add('word-pop');
        }
    };
    currentUtterance.onpause  = () => setStatus('Paused', 'paused');
    currentUtterance.onresume = () => setStatus('Resumed...', 'speaking');
    currentUtterance.onend    = () => { setStatus('Done', 'done'); setBtns(false); ttsSpeaking.classList.add('hidden'); ttsCurrentWord.textContent = ''; };
    currentUtterance.onerror  = (e) => { setStatus(`Error: ${e.error}`, 'error'); setBtns(false); ttsSpeaking.classList.add('hidden'); };

    synth.speak(currentUtterance);
};

ttsPauseBtn.onclick  = () => { if (synth.speaking && !synth.paused) synth.pause(); ttsPauseBtn.disabled = true; ttsResumeBtn.disabled = false; };
ttsResumeBtn.onclick = () => { if (synth.paused) synth.resume(); ttsPauseBtn.disabled = false; ttsResumeBtn.disabled = true; };
ttsStopBtn.onclick   = () => { synth.cancel(); setBtns(false); ttsSpeaking.classList.add('hidden'); ttsCurrentWord.textContent = ''; setStatus('Stopped', 'idle'); };
ttsResetBtn.onclick  = () => { ttsVolume.value = 1; ttsVolumeVal.textContent = '1.00'; ttsRate.value = 1; ttsRateVal.textContent = '1.0'; ttsPitch.value = 1; ttsPitchVal.textContent = '1.00'; ttsLangFilter.value = ''; populateVoiceList(''); setStatus('Settings reset', 'idle'); };

function setBtns(active) { ttsSpeak.disabled = active; ttsPauseBtn.disabled = !active; ttsStopBtn.disabled = !active; ttsResumeBtn.disabled = true; }
function setStatus(msg, state) { ttsStatus.textContent = msg; ttsStatus.className = `tts-status tts-status--${state}`; }
