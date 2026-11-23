const BESTS_KEY = 'fandom_arcade_suite_bests_v3';
const SESSION_KEY = 'fandom_arcade_suite_session_v3';

const DEFAULT_BESTS = {
  moviesUnblur: 0, moviesCast: 0,
  animeDuel: 0, animeChars: 0,
  pokeWho: 0, pokeClash: 0,
  foodCompass: 0, foodIng: 0, foodMacro: 0, foodBracket: 0,
  careerSalary: 0, careerTools: 0, careerSpotle: 0, careerDay: 0,
  cartoonUnblur: 0, cartoonPlot: 0, cartoonDuel: 0, cartoonVoice: 0,
  devStars: 0, devBug: 0, devOutput: 0, devLang: 0, devBigO: 0, devHttp: 0, devOutage: 0,
  blitz: 0,
};

function readJSON(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

const savedBests = readJSON(localStorage, BESTS_KEY, {});
const savedSession = readJSON(sessionStorage, SESSION_KEY, { score: 0, streak: 0, soundEnabled: true });

export const state = {
  score: Number(savedSession.score) || 0,
  streak: Number(savedSession.streak) || 0,
  soundEnabled: savedSession.soundEnabled !== false,
  bests: { ...DEFAULT_BESTS, ...savedBests },
  sessionScores: {},
};

function persistSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      score: state.score,
      streak: state.streak,
      soundEnabled: state.soundEnabled,
    }));
  } catch {}
}

function persistBests() {
  try { localStorage.setItem(BESTS_KEY, JSON.stringify(state.bests)); } catch {}
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function shuffle(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSeededRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function preloadImage(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

export function haptic(pattern = 12) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

let audioCtx = null;
export function playSfx(type) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.07);
      osc.frequency.setValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(115, now + 0.24);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now); osc.stop(now + 0.26);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now); osc.stop(now + 0.06);
    }
  } catch {}
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function recordWin(gameKey, basePoints) {
  state.streak += 1;
  const bonus = Math.min(state.streak * 15, 150);
  const earned = basePoints + bonus;
  state.score += earned;
  haptic(14);

  if (state.streak === 3) showToast('🔥 3 Streak! Bonus points active');
  else if (state.streak === 5) showToast('🔥 5 Streak! Locked in');
  else if (state.streak === 10) showToast('🏆 10 Streak! Arcade Legend');

  if (gameKey) {
    state.sessionScores[gameKey] = (state.sessionScores[gameKey] || 0) + earned;
    if (state.sessionScores[gameKey] > (state.bests[gameKey] || 0)) {
      state.bests[gameKey] = state.sessionScores[gameKey];
      persistBests();
    }
  }
  persistSession();
  syncHud();
  return earned;
}

export function recordBestValue(gameKey, val) {
  if (val > (state.bests[gameKey] || 0)) {
    state.bests[gameKey] = val;
    persistBests();
  }
}

export function resetStreak() {
  state.streak = 0;
  haptic([24, 38, 24]);
  persistSession();
  syncHud();
}

export function getArcadeRank() {
  const total = Object.values(state.bests).reduce((a, b) => a + (Number(b) || 0), 0) + state.score;
  if (total >= 12000) return 'Grandmaster';
  if (total >= 6000) return 'Veteran';
  if (total >= 2500) return 'Challenger';
  if (total >= 700) return 'Rising Star';
  return 'Newcomer';
}

export function syncHud() {
  const s = document.getElementById('hud-score');
  const st = document.getElementById('hud-streak');
  const btn = document.getElementById('sound-toggle');
  if (s) s.textContent = state.score;
  if (st) st.textContent = state.streak;
  if (btn) btn.textContent = state.soundEnabled ? '🔊' : '🔇';
}

export function initChrome(activePage) {
  const navItems = [
    { id: 'hub', href: 'index.html', label: '⌂ Hub' },
    { id: 'movies', href: 'movies.html', label: '🎬 Movies' },
    { id: 'anime', href: 'anime.html', label: '⚡ Anime' },
    { id: 'pokemon', href: 'pokemon.html', label: '◓ Pokémon' },
    { id: 'food', href: 'food.html', label: '🍜 Food' },
    { id: 'careers', href: 'careers.html', label: '💼 Careers' },
    { id: 'cartoons', href: 'cartoons.html', label: '📺 Cartoons' },
    { id: 'dev', href: 'dev.html', label: '💻 Dev' },
    { id: 'blitz', href: 'blitz.html', label: '⏱️ Blitz' },
  ];

  const strip = document.getElementById('cat-strip');
  if (strip) {
    strip.innerHTML = navItems
      .map((item) => `<a class="cat-link${item.id === activePage ? ' active' : ''}" href="${item.href}">${item.label}</a>`)
      .join('');
    const activeEl = strip.querySelector('.cat-link.active');
    if (activeEl) activeEl.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      persistSession();
      syncHud();
      showToast(state.soundEnabled ? 'Sound On' : 'Sound Muted');
    });
  }
  syncHud();
}

export function setupModeTabs(onSwitch) {
  const tabs = document.querySelectorAll('.mode-tab');
  const panels = document.querySelectorAll('.mode-panel');
  const initialized = new Set();

  function activate(mode) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === mode));
    if (!initialized.has(mode)) {
      initialized.add(mode);
      onSwitch(mode);
    }
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      playSfx('click');
      activate(t.dataset.mode);
    });
  });

  // Support deep link ?mode=xyz from Hub cards
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('mode');
  const firstMode = tabs[0]?.dataset.mode;
  const startMode = Array.from(tabs).some((t) => t.dataset.mode === requested) ? requested : firstMode;
  if (startMode) activate(startMode);
}
