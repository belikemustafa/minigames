import {
  playSfx,
  recordWin,
  resetStreak,
  shuffle,
  state,
  showToast,
  preloadImage,
  fetchPokemonById,
} from './app.js';

let currentPoke = null;
let hintUsed = false;
let locked = true;
let cryAudio = null;
let roundToken = 0;

const genSelect = document.getElementById('poke-gen-select');
const imgEl = document.getElementById('poke-img');
const loaderEl = document.getElementById('poke-loader');
const cryBtn = document.getElementById('poke-cry-btn');
const hintBtn = document.getElementById('poke-hint-btn');
const hintBox = document.getElementById('poke-hint-box');
const statsEl = document.getElementById('poke-stats');
const optionsEl = document.getElementById('poke-options');
const feedbackEl = document.getElementById('poke-feedback');
const nextBtn = document.getElementById('poke-next-btn');

function pickRandomIds(maxId, count = 4) {
  const set = new Set();
  while (set.size < count) {
    set.add(Math.floor(Math.random() * maxId) + 1);
  }
  return Array.from(set);
}

function renderTypeBadges(types) {
  hintBox.innerHTML = types
    .map((t) => `<span class="type-pill type-${t}">${t}</span>`)
    .join('');
  hintBox.classList.remove('hidden');
}

function playCry() {
  if (!currentPoke?.cry) {
    showToast('No audio cry available for this Pokémon');
    return;
  }
  if (cryAudio) cryAudio.pause();
  cryAudio = new Audio(currentPoke.cry);
  cryAudio.volume = 0.45;
  cryAudio.play().catch(() => {});
}

async function startRound() {
  const token = ++roundToken;
  locked = true;
  hintUsed = false;

  hintBtn.disabled = true;
  hintBox.classList.add('hidden');
  hintBox.innerHTML = '';
  statsEl.classList.add('hidden');
  feedbackEl.classList.add('hidden');
  nextBtn.classList.add('hidden');
  loaderEl.textContent = 'Scanning tall grass...';
  loaderEl.classList.remove('hidden');
  optionsEl.innerHTML = '';
  imgEl.className = 'poke-img silhouette';

  try {
    const maxId = Number(genSelect.value) || 493;
    const ids = pickRandomIds(maxId, 4);
    const group = await Promise.all(ids.map(fetchPokemonById));
    if (token !== roundToken) return;

    currentPoke = group[0];
    const choices = shuffle(group);

    await preloadImage(currentPoke.image);
    if (token !== roundToken) return;

    imgEl.src = currentPoke.image;
    imgEl.classList.add('ready');
    loaderEl.classList.add('hidden');

    choices.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.id = p.id;
      btn.textContent = p.name;
      btn.addEventListener('click', () => handleGuess(p, btn));
      optionsEl.appendChild(btn);
    });

    locked = false;
    hintBtn.disabled = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = 'PokéAPI connection hiccup — tap Retry.';
    nextBtn.textContent = 'Retry ↻';
    nextBtn.classList.remove('hidden');
    console.error(err);
  }
}

function revealTypeHint() {
  if (locked || hintUsed || !currentPoke) return;
  playSfx('click');
  hintUsed = true;
  hintBtn.disabled = true;
  renderTypeBadges(currentPoke.types);
}

function handleGuess(selected, btnEl) {
  if (locked || !currentPoke) return;
  locked = true;
  hintBtn.disabled = true;
  imgEl.className = 'poke-img ready revealed';

  optionsEl.querySelectorAll('.option-btn').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.id) === currentPoke.id) b.classList.add('correct');
  });

  const s = currentPoke.stats;
  statsEl.innerHTML = `
    <div class="stat-chip"><span>HP</span><strong>${s.hp ?? '?'}</strong></div>
    <div class="stat-chip"><span>ATK</span><strong>${s.attack ?? '?'}</strong></div>
    <div class="stat-chip"><span>DEF</span><strong>${s.defense ?? '?'}</strong></div>
    <div class="stat-chip"><span>SP.ATK</span><strong>${s['special-attack'] ?? '?'}</strong></div>
    <div class="stat-chip"><span>SP.DEF</span><strong>${s['special-defense'] ?? '?'}</strong></div>
    <div class="stat-chip"><span>SPD</span><strong>${s.speed ?? '?'}</strong></div>
    <div class="stat-chip bst-chip"><span>BASE STAT TOTAL (BST)</span><strong>${s.bst}</strong></div>
  `;
  statsEl.classList.remove('hidden');

  if (!hintUsed) renderTypeBadges(currentPoke.types);

  feedbackEl.classList.remove('hidden', 'good', 'bad');
  if (selected.id === currentPoke.id) {
    playSfx('correct');
    if (state.soundEnabled) setTimeout(playCry, 240);
    const pts = hintUsed ? 150 : 200;
    const earned = recordWin('pokemon', pts);
    feedbackEl.classList.add('good');
    feedbackEl.textContent = `Gotcha! It's ${currentPoke.name} (#${currentPoke.id}) — +${earned} pts`;
  } else {
    playSfx('wrong');
    btnEl.classList.add('wrong');
    resetStreak();
    feedbackEl.classList.add('bad');
    feedbackEl.textContent = `It's ${currentPoke.name} (#${currentPoke.id})!`;
  }

  nextBtn.textContent = 'Next Encounter →';
  nextBtn.classList.remove('hidden');
}

export function initPokemonGame() {
  cryBtn.addEventListener('click', playCry);
  hintBtn.addEventListener('click', revealTypeHint);
  genSelect.addEventListener('change', () => {
    playSfx('click');
    startRound();
  });
  nextBtn.addEventListener('click', () => {
    playSfx('click');
    startRound();
  });
  startRound();
}
