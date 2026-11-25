import {
  initFx, isFxEnabled, setFxEnabled, burstWin, burstMilestone,
  pulseWrong, animateNumber, triggerFlash,
} from './fx.js';

export { animateNumber, burstMilestone, triggerFlash };

const BESTS_KEY = 'fandom_arcade_suite_bests_v7';
const SESSION_KEY = 'fandom_arcade_suite_session_v7';

const DEFAULT_BESTS = {
  moviesUnblur: 0, moviesCast: 0,
  animeDuel: 0, animeChars: 0,
  pokeWho: 0, pokeClash: 0,
  foodCompass: 0, foodIng: 0, foodMacro: 0, foodBracket: 0,
  cartoonUnblur: 0, cartoonDuel: 0,
  devStars: 0, devBug: 0, devOutput: 0, devLang: 0, devBigO: 0, devHttp: 0, devOutage: 0,
  autoSpecs: 0, autoUnblur: 0, autoSound: 0,
  sportsClash: 0, sportsPath: 0, sportsTiming: 0,
  musicHook: 0, musicCover: 0, musicLyric: 0,
  tvUnblur: 0, tvDuel: 0, tvCast: 0,
  gameDuel: 0, gameId: 0, gameStudio: 0,
  engClash: 0, engMech: 0, engArch: 0, engCodes: 0,
  arcStack: 0, arcDrift: 0, arcDash: 0,
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

let displayedScore = state.score;

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


const _jsonCache = new Map();
export async function loadJson(path) {
  if (_jsonCache.has(path)) return _jsonCache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  const data = await res.json();
  _jsonCache.set(path, data);
  return data;
}

export function haptic(pattern = 12) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

let audioCtx = null;
export function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playNote(ctx, freq, startOffset, duration, type = 'triangle', vol = 0.1) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSfx(type) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (type === 'correct') {
      // Streak-scaled warm triad arpeggio
      const semis = Math.min(state.streak, 7);
      const mult = Math.pow(2, semis / 12);
      playNote(ctx, 523.25 * mult, 0, 0.16, 'triangle', 0.11);
      playNote(ctx, 659.25 * mult, 0.055, 0.18, 'triangle', 0.11);
      playNote(ctx, 783.99 * mult, 0.11, 0.24, 'sine', 0.12);
      playNote(ctx, 261.63 * mult, 0, 0.22, 'sine', 0.05);
    } else if (type === 'fanfare') {
      playNote(ctx, 523.25, 0, 0.16, 'triangle', 0.11);
      playNote(ctx, 659.25, 0.08, 0.16, 'triangle', 0.11);
      playNote(ctx, 783.99, 0.16, 0.18, 'triangle', 0.12);
      playNote(ctx, 1046.5, 0.24, 0.36, 'sine', 0.13);
    } else if (type === 'reveal') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'wrong') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(98, now + 0.22);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      playNote(ctx, 520, 0, 0.055, 'sine', 0.045);
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
  burstWin(earned, state.streak);

  if (state.streak === 3) showToast('🔥 3 Streak! Bonus points active');
  else if (state.streak === 5) {
    showToast('🔥 5 Streak! Locked in');
    burstMilestone('🔥 5 STREAK!');
    setTimeout(() => playSfx('fanfare'), 140);
  } else if (state.streak === 10) {
    showToast('🏆 10 Streak! Arcade Legend');
    burstMilestone('🏆 10 STREAK!');
    setTimeout(() => playSfx('fanfare'), 140);
  }

  if (gameKey) {
    state.sessionScores[gameKey] = (state.sessionScores[gameKey] || 0) + earned;
    if (state.sessionScores[gameKey] > (state.bests[gameKey] || 0)) {
      state.bests[gameKey] = state.sessionScores[gameKey];
      persistBests();
    }
  }
  persistSession();
  syncHud(true);
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
  pulseWrong();
  persistSession();
  syncHud(false);
}

export function getArcadeRank() {
  const total = Object.values(state.bests).reduce((a, b) => a + (Number(b) || 0), 0) + state.score;
  if (total >= 14000) return 'Grandmaster';
  if (total >= 7000) return 'Veteran';
  if (total >= 3000) return 'Challenger';
  if (total >= 800) return 'Rising Star';
  return 'Newcomer';
}

export function syncHud(animate = false) {
  const s = document.getElementById('hud-score');
  const st = document.getElementById('hud-streak');
  const streakPill = document.querySelector('.streak-pill');
  const btn = document.getElementById('sound-toggle');

  if (s) {
    if (animate && displayedScore !== state.score) {
      animateNumber(s, displayedScore, state.score, { duration: 420 });
      triggerFlash(s.closest('.pill'), 'fx-pill-bump');
    } else {
      s.textContent = state.score;
    }
    displayedScore = state.score;
  }

  if (st) {
    st.textContent = state.streak;
    if (streakPill) {
      const tier = state.streak >= 10 ? '3' : state.streak >= 5 ? '2' : state.streak >= 3 ? '1' : '0';
      streakPill.dataset.streakTier = tier;
      if (animate && state.streak > 0) triggerFlash(streakPill, 'fx-pill-bump');
    }
  }

  if (btn) btn.textContent = state.soundEnabled ? '🔊' : '🔇';
}

export function initChrome(activePage) {
  const navItems = [
    { id: 'hub', href: 'index.html', label: '⌂ Hub' },
    { id: 'engineering', href: 'engineering.html', label: '📐 Mech & Arch' },
    { id: 'movies', href: 'movies.html', label: '🎬 Movies' },
    { id: 'tv', href: 'tv.html', label: '📺 TV' },
    { id: 'anime', href: 'anime.html', label: '⚡ Anime' },
    { id: 'pokemon', href: 'pokemon.html', label: '◓ Pokémon' },
    { id: 'sports', href: 'sports.html', label: '🏏 Sports' },
    { id: 'music', href: 'music.html', label: '🎵 Music' },
    { id: 'gaming', href: 'gaming.html', label: '🎮 Gaming' },
    { id: 'arcade', href: 'arcade.html', label: '🕹️ Arcade' },
    { id: 'food', href: 'food.html', label: '🍜 Food' },
    { id: 'cartoons', href: 'cartoons.html', label: '🎨 Cartoons' },
    { id: 'dev', href: 'dev.html', label: '💻 Dev' },
    { id: 'auto', href: 'auto.html', label: '🏍️ Auto' },
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

  const hudStats = document.querySelector('.hud-stats');
  const soundBtn = document.getElementById('sound-toggle');

  // Inject crisp FX / Motion toggle right beside sound button
  if (hudStats && soundBtn && !document.getElementById('fx-toggle')) {
    const fxBtn = document.createElement('button');
    fxBtn.id = 'fx-toggle';
    fxBtn.type = 'button';
    fxBtn.className = 'icon-btn';
    fxBtn.title = 'Toggle 60 FPS Visual Effects';
    fxBtn.setAttribute('aria-label', 'Toggle Visual Effects');
    fxBtn.textContent = isFxEnabled() ? '✨' : '○';
    fxBtn.addEventListener('click', () => {
      const next = setFxEnabled(!isFxEnabled());
      fxBtn.textContent = next ? '✨' : '○';
      playSfx('click');
      showToast(next ? '60 FPS FX On' : 'Reduced Motion Mode');
    });
    hudStats.insertBefore(fxBtn, soundBtn);
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      persistSession();
      syncHud(false);
      showToast(state.soundEnabled ? 'Sound On' : 'Sound Muted');
    });
  }

  initFx();
  syncHud(false);
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

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('mode');
  const firstMode = tabs[0]?.dataset.mode;
  const startMode = Array.from(tabs).some((t) => t.dataset.mode === requested) ? requested : firstMode;
  if (startMode) activate(startMode);
}
