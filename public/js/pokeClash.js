import {
  playSfx,
  recordWin,
  recordBestStreak,
  resetStreak,
  preloadImage,
  fetchPokemonById,
} from './app.js';

const STAT_CATEGORIES = [
  { key: 'hp', label: 'Base HP' },
  { key: 'attack', label: 'Base Attack' },
  { key: 'defense', label: 'Base Defense' },
  { key: 'special-attack', label: 'Special Attack' },
  { key: 'special-defense', label: 'Special Defense' },
  { key: 'speed', label: 'Base Speed' },
  { key: 'bst', label: 'Total Base Stats (BST)' },
];

let leftMon = null;
let rightMon = null;
let activeStat = null;
let runScore = 0;
let locked = true;
let roundToken = 0;
let advanceTimer = null;

const genSelect = document.getElementById('clash-gen-select');
const loaderEl = document.getElementById('clash-loader');
const runScoreEl = document.getElementById('clash-run-score');
const statBannerEl = document.getElementById('clash-stat-banner');
const cardLeft = document.getElementById('clash-left');
const cardRight = document.getElementById('clash-right');
const statusEl = document.getElementById('clash-status');
const restartBtn = document.getElementById('clash-restart-btn');

function renderCard(el, mon, showVal = false) {
  el.querySelector('img').src = mon.image;
  el.querySelector('h3').textContent = mon.name;
  el.querySelector('.clash-types').textContent = mon.types.join(' / ');
  const valEl = el.querySelector('.clash-stat-val');
  valEl.textContent = showVal ? mon.stats[activeStat.key] : '???';
  valEl.classList.toggle('mystery', !showVal);
}

async function nextMatchup() {
  clearTimeout(advanceTimer);
  const token = ++roundToken;
  locked = true;

  cardLeft.classList.remove('win', 'lose');
  cardRight.classList.remove('win', 'lose');
  statusEl.classList.add('hidden');
  restartBtn.classList.add('hidden');
  loaderEl.textContent = 'Preparing battle...';
  loaderEl.classList.remove('hidden');

  try {
    const maxId = Number(genSelect.value) || 493;
    const id1 = Math.floor(Math.random() * maxId) + 1;
    let id2 = Math.floor(Math.random() * maxId) + 1;
    while (id2 === id1) id2 = Math.floor(Math.random() * maxId) + 1;

    const [monA, monB] = await Promise.all([fetchPokemonById(id1), fetchPokemonById(id2)]);
    if (token !== roundToken) return;

    await Promise.all([preloadImage(monA.image, 6000), preloadImage(monB.image, 6000)]);
    if (token !== roundToken) return;

    leftMon = monA;
    rightMon = monB;
    activeStat = STAT_CATEGORIES[Math.floor(Math.random() * STAT_CATEGORIES.length)];

    statBannerEl.textContent = `Who has higher ${activeStat.label}?`;
    renderCard(cardLeft, leftMon, false);
    renderCard(cardRight, rightMon, false);
    loaderEl.classList.add('hidden');
    locked = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = 'PokéAPI hiccup — tap New Battle Streak to retry.';
    restartBtn.classList.remove('hidden');
    console.error(err);
  }
}

function handlePick(side) {
  if (locked || !leftMon || !rightMon) return;
  const token = roundToken;
  locked = true;

  const leftVal = leftMon.stats[activeStat.key];
  const rightVal = rightMon.stats[activeStat.key];

  renderCard(cardLeft, leftMon, true);
  renderCard(cardRight, rightMon, true);

  const won =
    (side === 'left' && leftVal >= rightVal) ||
    (side === 'right' && rightVal >= leftVal);

  statusEl.classList.remove('hidden', 'good', 'bad');
  if (won) {
    playSfx('correct');
    runScore += 1;
    runScoreEl.textContent = runScore;
    recordWin('pokeClash', 130);
    recordBestStreak('pokeClash', runScore);
    (side === 'left' ? cardLeft : cardRight).classList.add('win');
    statusEl.classList.add('good');
    statusEl.textContent = `Super effective! ${leftMon.name} (${leftVal}) vs ${rightMon.name} (${rightVal})`;

    advanceTimer = setTimeout(() => {
      if (token === roundToken) nextMatchup();
    }, 1300);
  } else {
    playSfx('wrong');
    resetStreak();
    (side === 'left' ? cardLeft : cardRight).classList.add('lose');
    (side === 'left' ? cardRight : cardLeft).classList.add('win');
    statusEl.classList.add('bad');
    statusEl.textContent = `KO! ${leftMon.name} (${leftVal}) vs ${rightMon.name} (${rightVal}). Final run: ${runScore}`;
    restartBtn.classList.remove('hidden');
  }
}

export function initPokeClashGame() {
  cardLeft.addEventListener('click', () => handlePick('left'));
  cardRight.addEventListener('click', () => handlePick('right'));
  genSelect.addEventListener('change', () => {
    playSfx('click');
    runScore = 0;
    runScoreEl.textContent = '0';
    nextMatchup();
  });
  restartBtn.addEventListener('click', () => {
    playSfx('click');
    runScore = 0;
    runScoreEl.textContent = '0';
    nextMatchup();
  });
  nextMatchup();
}
