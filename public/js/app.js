import { initMoviesGame } from './movies.js';
import { initMovieCastGame } from './movieCast.js';
import { initAnimeGame } from './anime.js';
import { initAnimeCharsGame } from './animeChars.js';
import { initPokemonGame } from './pokemon.js';
import { initPokeClashGame } from './pokeClash.js';

const STORAGE_KEY = 'fandom_arcade_bests_v2';
const DEFAULT_BESTS = {
  movies: 0,
  movieCast: 0,
  anime: 0,
  animeChars: 0,
  pokemon: 0,
  pokeClash: 0,
};

let savedBests = {};
try {
  savedBests = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
} catch {
  savedBests = {};
}

export const state = {
  score: 0,
  streak: 0,
  soundEnabled: true,
  currentView: 'hub',
  activeModes: { movies: 'unblur', anime: 'duel', pokemon: 'silhouette' },
  initialized: {
    movies: false,
    movieCast: false,
    anime: false,
    animeChars: false,
    pokemon: false,
    pokeClash: false,
  },
  bests: { ...DEFAULT_BESTS, ...savedBests },
  sessionGameScores: { movies: 0, movieCast: 0, animeChars: 0, pokemon: 0 },
};

/* ---------- Shared Utilities ---------- */

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

/* ---------- Serialized Jikan API Queue (Prevents 429 Rate Limits) ---------- */

let jikanQueue = Promise.resolve();
let lastJikanCall = 0;
const jikanCache = new Map();

export function fetchJikan(url, { cache = false, retries = 2 } = {}) {
  if (cache && jikanCache.has(url)) {
    return Promise.resolve(jikanCache.get(url));
  }

  const run = async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const wait = Math.max(0, 420 - (Date.now() - lastJikanCall));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastJikanCall = Date.now();

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (cache) jikanCache.set(url, data);
        return data;
      }
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 950 * (attempt + 1)));
        continue;
      }
      throw new Error(`Jikan HTTP ${res.status}`);
    }
  };

  const task = jikanQueue.then(run, run);
  jikanQueue = task.catch(() => {});
  return task;
}

/* ---------- Shared Pokémon Cache ---------- */

const pokeCache = new Map();

export function formatPokemonName(raw) {
  return raw
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function fetchPokemonById(id) {
  if (pokeCache.has(id)) return pokeCache.get(id);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error(`PokéAPI HTTP ${res.status}`);
  const d = await res.json();

  const stats = {};
  let bst = 0;
  for (const s of d.stats) {
    stats[s.stat.name] = s.base_stat;
    bst += s.base_stat;
  }
  stats.bst = bst;

  const parsed = {
    id: d.id,
    name: formatPokemonName(d.name),
    image: d.sprites.other?.['official-artwork']?.front_default || d.sprites.front_default,
    cry: d.cries?.latest || d.cries?.legacy || null,
    types: d.types.map((t) => t.type.name),
    stats,
  };

  pokeCache.set(id, parsed);
  return parsed;
}

/* ---------- Web Audio SFX ---------- */

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
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(115, now + 0.24);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch {}
}

/* ---------- Score, Streak, Rank & Toast ---------- */

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function recordWin(game, points) {
  state.streak += 1;
  const bonus = Math.min(state.streak * 15, 150);
  const earned = points + bonus;
  state.score += earned;
  haptic(15);

  if (state.streak === 3) showToast('🔥 3 Streak! Bonus points active');
  else if (state.streak === 5) showToast('🔥 5 Streak! Unstoppable');
  else if (state.streak === 10) showToast('🏆 10 Streak! Arcade Legend');

  if (game in state.sessionGameScores) {
    state.sessionGameScores[game] += earned;
    if (state.sessionGameScores[game] > state.bests[game]) {
      state.bests[game] = state.sessionGameScores[game];
      saveBests();
    }
  }
  syncHud();
  return earned;
}

export function recordBestStreak(game, value) {
  if (value > state.bests[game]) {
    state.bests[game] = value;
    saveBests();
    syncHud();
  }
}

export function resetStreak() {
  state.streak = 0;
  haptic([25, 40, 25]);
  syncHud();
}

function saveBests() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bests));
  } catch {}
}

function getArcadeRank() {
  const totalBest =
    state.bests.movies +
    state.bests.movieCast +
    state.bests.animeChars +
    state.bests.pokemon +
    (state.bests.anime + state.bests.pokeClash) * 150 +
    state.score;

  if (totalBest >= 8000) return 'Grandmaster';
  if (totalBest >= 4000) return 'Veteran';
  if (totalBest >= 1800) return 'Challenger';
  if (totalBest >= 500) return 'Rising Star';
  return 'Newcomer';
}

export function syncHud() {
  document.getElementById('hud-score').textContent = state.score;
  document.getElementById('hud-streak').textContent = state.streak;

  const rankEl = document.getElementById('arcade-rank');
  if (rankEl) rankEl.textContent = `Rank: ${getArcadeRank()}`;

  Object.keys(DEFAULT_BESTS).forEach((key) => {
    const el = document.getElementById(`best-${key}`);
    if (el) el.textContent = state.bests[key];
  });
}

function setWelcomeGreeting() {
  const el = document.getElementById('welcome-greeting');
  if (!el) return;
  const hour = new Date().getHours();
  if (hour < 12) el.textContent = 'Good Morning — Ready to Play?';
  else if (hour < 17) el.textContent = 'Good Afternoon — Pick Your Arena';
  else el.textContent = 'Good Evening — Welcome to Fandom Arcade';
}

/* ---------- Navigation & Lazy Initialization ---------- */

function ensureInitialized(viewName, modeName) {
  if (viewName === 'movies') {
    if (modeName === 'unblur' && !state.initialized.movies) {
      state.initialized.movies = true;
      initMoviesGame();
    } else if (modeName === 'cast' && !state.initialized.movieCast) {
      state.initialized.movieCast = true;
      initMovieCastGame();
    }
  } else if (viewName === 'anime') {
    if (modeName === 'duel' && !state.initialized.anime) {
      state.initialized.anime = true;
      initAnimeGame();
    } else if (modeName === 'chars' && !state.initialized.animeChars) {
      state.initialized.animeChars = true;
      initAnimeCharsGame();
    }
  } else if (viewName === 'pokemon') {
    if (modeName === 'silhouette' && !state.initialized.pokemon) {
      state.initialized.pokemon = true;
      initPokemonGame();
    } else if (modeName === 'clash' && !state.initialized.pokeClash) {
      state.initialized.pokeClash = true;
      initPokeClashGame();
    }
  }
}

function switchMode(group, mode) {
  state.activeModes[group] = mode;

  const tabBar = document.querySelector(`.mode-tabs[data-group="${group}"]`);
  if (tabBar) {
    tabBar.querySelectorAll('.mode-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
  }

  document.querySelectorAll(`#view-${group} .mode-panel`).forEach((p) => {
    p.classList.toggle('active', p.id === `${group}-mode-${mode}`);
  });

  ensureInitialized(group, mode);
}

function switchView(viewName, requestedMode = null) {
  playSfx('click');
  state.currentView = viewName;
  document.body.dataset.theme = viewName;

  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName !== 'hub') {
    const mode = requestedMode || state.activeModes[viewName];
    switchMode(viewName, mode);
  }
}

document.querySelectorAll('[data-view]').forEach((el) => {
  el.addEventListener('click', () => switchView(el.dataset.view, el.dataset.mode || null));
});

document.querySelectorAll('.mode-tabs').forEach((bar) => {
  const group = bar.dataset.group;
  bar.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      playSfx('click');
      switchMode(group, tab.dataset.mode);
    });
  });
});

const soundBtn = document.getElementById('sound-toggle');
soundBtn.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  soundBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
  showToast(state.soundEnabled ? 'Sound On' : 'Sound Muted');
});

/* ---------- Desktop Keyboard Shortcuts ---------- */

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  const activePanel = document.querySelector(`#view-${state.currentView} .mode-panel.active`);
  if (!activePanel) return;

  if (['1', '2', '3', '4'].includes(e.key)) {
    const btns = activePanel.querySelectorAll('.options-grid .option-btn:not(:disabled)');
    const target = btns[Number(e.key) - 1];
    if (target) target.click();
  } else if (e.key === 'Enter') {
    const nextBtn = activePanel.querySelector('.btn-primary:not(.hidden)');
    if (nextBtn) nextBtn.click();
  } else if (state.currentView === 'anime' && state.activeModes.anime === 'duel') {
    if (e.key === 'ArrowUp') document.getElementById('btn-higher')?.click();
    if (e.key === 'ArrowDown') document.getElementById('btn-lower')?.click();
  } else if (state.currentView === 'pokemon' && state.activeModes.pokemon === 'clash') {
    if (e.key === 'ArrowLeft') document.getElementById('clash-left')?.click();
    if (e.key === 'ArrowRight') document.getElementById('clash-right')?.click();
  }
});

setWelcomeGreeting();
syncHud();
