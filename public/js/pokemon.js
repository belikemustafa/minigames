import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue, resetStreak,
  shuffle, state, showToast, preloadImage,
} from './core.js';

initChrome('pokemon');

const pokeCache = new Map();
let allPokemonNames = null; // [{ id, name }] text-only list for Hard Mode dropdown

function formatName(raw) {
  return raw.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function fetchPokemon(id) {
  if (pokeCache.has(id)) return pokeCache.get(id);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error(`PokéAPI HTTP ${res.status}`);
  const d = await res.json();
  const stats = {};
  let bst = 0;
  for (const s of d.stats) { stats[s.stat.name] = s.base_stat; bst += s.base_stat; }
  stats.bst = bst;
  const obj = {
    id: d.id,
    name: formatName(d.name),
    image: d.sprites.other?.['official-artwork']?.front_default || d.sprites.front_default,
    cry: d.cries?.latest || d.cries?.legacy || null,
    types: d.types.map((t) => t.type.name),
    stats,
  };
  pokeCache.set(id, obj);
  return obj;
}

async function ensureNameIndex() {
  if (allPokemonNames) return allPokemonNames;
  try {
    const cached = sessionStorage.getItem('poke_names_1025');
    if (cached) { allPokemonNames = JSON.parse(cached); return allPokemonNames; }
  } catch {}
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
  if (!res.ok) throw new Error('Could not load Pokémon name list');
  const json = await res.json();
  allPokemonNames = (json.results || []).map((item, idx) => ({
    id: idx + 1,
    name: formatName(item.name),
  }));
  try { sessionStorage.setItem('poke_names_1025', JSON.stringify(allPokemonNames)); } catch {}
  return allPokemonNames;
}

// ---------- 1. WHO'S THAT POKÉMON? (Easy 4-Options + Hard Text-Only Dropdown!) ----------
function initWho() {
  let difficulty = 'easy'; // 'easy' | 'hard'
  let current = null;
  let hintUsed = false;
  let locked = true;
  let cryAudio = null;
  let token = 0;
  let selectedHardEntry = null;

  const btnEasy = document.getElementById('poke-diff-easy');
  const btnHard = document.getElementById('poke-diff-hard');
  const genSelect = document.getElementById('poke-gen-select');
  const tipEl = document.getElementById('poke-tip');
  const imgEl = document.getElementById('poke-img');
  const loaderEl = document.getElementById('poke-loader');
  const cryBtn = document.getElementById('poke-cry-btn');
  const hintBtn = document.getElementById('poke-hint-btn');
  const hintBox = document.getElementById('poke-hint-box');
  const statsEl = document.getElementById('poke-stats');
  const optionsEl = document.getElementById('poke-options');
  const hardWrap = document.getElementById('poke-hard-wrap');
  const hardInput = document.getElementById('poke-hard-input');
  const hardSubmit = document.getElementById('poke-hard-submit');
  const hardDropdown = document.getElementById('poke-hard-dropdown');
  const feedbackEl = document.getElementById('poke-feedback');
  const nextBtn = document.getElementById('poke-next-btn');

  function pickIds(maxId, n) {
    const s = new Set();
    while (s.size < n) s.add(Math.floor(Math.random() * maxId) + 1);
    return Array.from(s);
  }

  function renderTypes(types) {
    hintBox.innerHTML = types.map((t) => `<span class="type-pill type-${t}">${t}</span>`).join('');
    hintBox.classList.remove('hidden');
  }

  function playCry() {
    if (!current?.cry) return showToast('No audio cry available for this Pokémon');
    if (cryAudio) cryAudio.pause();
    cryAudio = new Audio(current.cry);
    cryAudio.volume = 0.45;
    cryAudio.play().catch(() => {});
  }

  function renderDropdown(query) {
    hardDropdown.innerHTML = '';
    if (!allPokemonNames || locked) { hardDropdown.classList.add('hidden'); return; }
    const q = query.trim().toLowerCase();
    if (!q) { hardDropdown.classList.add('hidden'); return; }

    const maxId = Number(genSelect.value) || 493;
    const matches = allPokemonNames
      .filter((p) => p.id <= maxId && p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 12);

    if (!matches.length) { hardDropdown.classList.add('hidden'); return; }

    // STRICTLY TEXT-ONLY DROPDOWN ITEMS — NO IMAGES!
    matches.forEach((entry) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dropdown-item';
      item.role = 'option';
      item.textContent = entry.name;
      item.addEventListener('click', () => {
        selectedHardEntry = entry;
        hardInput.value = entry.name;
        hardDropdown.classList.add('hidden');
        hardSubmit.focus();
      });
      hardDropdown.appendChild(item);
    });
    hardDropdown.classList.remove('hidden');
  }

  function syncDifficultyUI() {
    btnEasy.classList.toggle('active', difficulty === 'easy');
    btnHard.classList.toggle('active', difficulty === 'hard');
    optionsEl.classList.toggle('hidden', difficulty !== 'easy');
    hardWrap.classList.toggle('hidden', difficulty !== 'hard');
    tipEl.textContent = difficulty === 'easy'
      ? 'Easy Mode: Pick from 4 options (+200 pts).'
      : 'Hard Mode: Type the Pokémon name and pick from the text-only dropdown (+300 pts).';
  }

  async function startRound() {
    const t = ++token;
    locked = true;
    hintUsed = false;
    selectedHardEntry = null;

    hintBtn.disabled = true;
    hintBox.classList.add('hidden');
    hintBox.innerHTML = '';
    statsEl.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    hardInput.value = '';
    hardInput.disabled = true;
    hardSubmit.disabled = true;
    hardDropdown.classList.add('hidden');
    loaderEl.textContent = 'Scanning tall grass...';
    loaderEl.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'poke-img silhouette';
    syncDifficultyUI();

    try {
      const maxId = Number(genSelect.value) || 493;
      if (difficulty === 'hard') {
        await ensureNameIndex();
        const id = Math.floor(Math.random() * maxId) + 1;
        current = await fetchPokemon(id);
      } else {
        const ids = pickIds(maxId, 4);
        const group = await Promise.all(ids.map(fetchPokemon));
        if (t !== token) return;
        current = group[0];
        shuffle(group).forEach((p) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'option-btn';
          btn.dataset.id = p.id;
          btn.textContent = p.name;
          btn.addEventListener('click', () => finishGuess(p.id, btn));
          optionsEl.appendChild(btn);
        });
      }
      if (t !== token) return;

      await preloadImage(current.image);
      if (t !== token) return;

      imgEl.src = current.image;
      imgEl.classList.add('ready');
      loaderEl.classList.add('hidden');
      locked = false;
      hintBtn.disabled = false;
      hardInput.disabled = false;
      hardSubmit.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loaderEl.textContent = 'PokéAPI connection hiccup — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function finishGuess(guessedId, clickedBtn = null) {
    if (locked || !current) return;
    locked = true;
    hintBtn.disabled = true;
    hardInput.disabled = true;
    hardSubmit.disabled = true;
    hardDropdown.classList.add('hidden');
    imgEl.className = 'poke-img ready revealed';

    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === current.id) b.classList.add('correct');
    });

    const s = current.stats;
    statsEl.innerHTML = `
      <div class="stat-chip"><span>HP</span><strong>${s.hp ?? '?'}</strong></div>
      <div class="stat-chip"><span>ATK</span><strong>${s.attack ?? '?'}</strong></div>
      <div class="stat-chip"><span>DEF</span><strong>${s.defense ?? '?'}</strong></div>
      <div class="stat-chip"><span>SP.ATK</span><strong>${s['special-attack'] ?? '?'}</strong></div>
      <div class="stat-chip"><span>SP.DEF</span><strong>${s['special-defense'] ?? '?'}</strong></div>
      <div class="stat-chip"><span>SPD</span><strong>${s.speed ?? '?'}</strong></div>
      <div class="stat-chip bst-chip"><span>BASE STAT TOTAL (BST)</span><strong>${s.bst}</strong></div>`;
    statsEl.classList.remove('hidden');
    if (!hintUsed) renderTypes(current.types);

    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (guessedId === current.id) {
      playSfx('correct');
      if (state.soundEnabled) setTimeout(playCry, 240);
      const base = difficulty === 'hard' ? (hintUsed ? 250 : 300) : (hintUsed ? 150 : 200);
      const earned = recordWin('pokeWho', base);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Gotcha! It's ${current.name} (#${current.id}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      if (clickedBtn) clickedBtn.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `It's ${current.name} (#${current.id})!`;
    }
    nextBtn.textContent = 'Next Encounter →';
    nextBtn.classList.remove('hidden');
  }

  function submitHardGuess() {
    if (locked || !current || !allPokemonNames) return;
    const raw = hardInput.value.trim().toLowerCase();
    if (!raw) return showToast('Type and select a Pokémon from the dropdown');
    const maxId = Number(genSelect.value) || 493;
    const exact =
      (selectedHardEntry && selectedHardEntry.name.toLowerCase() === raw ? selectedHardEntry : null) ||
      allPokemonNames.find((p) => p.id <= maxId && p.name.toLowerCase() === raw);

    if (!exact) {
      return showToast('Please select a valid Pokémon from the dropdown list');
    }
    finishGuess(exact.id);
  }

  hardInput.addEventListener('input', () => {
    selectedHardEntry = null;
    renderDropdown(hardInput.value);
  });
  hardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitHardGuess(); }
  });
  document.addEventListener('click', (e) => {
    if (!hardWrap.contains(e.target)) hardDropdown.classList.add('hidden');
  });
  hardSubmit.addEventListener('click', submitHardGuess);

  btnEasy.addEventListener('click', () => {
    if (difficulty === 'easy') return;
    playSfx('click');
    difficulty = 'easy';
    startRound();
  });
  btnHard.addEventListener('click', () => {
    if (difficulty === 'hard') return;
    playSfx('click');
    difficulty = 'hard';
    startRound();
  });
  cryBtn.addEventListener('click', playCry);
  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed || !current) return;
    playSfx('click');
    hintUsed = true;
    hintBtn.disabled = true;
    renderTypes(current.types);
  });
  genSelect.addEventListener('change', () => { playSfx('click'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });

  startRound();
}

// ---------- 2. STAT CLASH ----------
function initClash() {
  const CATS = [
    { key: 'hp', label: 'Base HP' }, { key: 'attack', label: 'Base Attack' },
    { key: 'defense', label: 'Base Defense' }, { key: 'special-attack', label: 'Special Attack' },
    { key: 'special-defense', label: 'Special Defense' }, { key: 'speed', label: 'Base Speed' },
    { key: 'bst', label: 'Total Base Stats (BST)' },
  ];
  let leftMon = null, rightMon = null, stat = null, run = 0, locked = true, token = 0, timer = null;

  const genSelect = document.getElementById('clash-gen-select');
  const loader = document.getElementById('clash-loader');
  const runEl = document.getElementById('clash-run-score');
  const banner = document.getElementById('clash-stat-banner');
  const cardL = document.getElementById('clash-left');
  const cardR = document.getElementById('clash-right');
  const statusEl = document.getElementById('clash-status');
  const restartBtn = document.getElementById('clash-restart-btn');

  function renderCard(el, mon, show) {
    el.querySelector('img').src = mon.image;
    el.querySelector('h3').textContent = mon.name;
    el.querySelector('.clash-types').textContent = mon.types.join(' / ');
    const v = el.querySelector('.clash-stat-val');
    v.textContent = show ? mon.stats[stat.key] : '???';
    v.classList.toggle('mystery', !show);
  }

  async function nextMatch() {
    clearTimeout(timer);
    const t = ++token;
    locked = true;
    cardL.classList.remove('win', 'lose');
    cardR.classList.remove('win', 'lose');
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    loader.textContent = 'Preparing battle...';
    loader.classList.remove('hidden');

    try {
      const maxId = Number(genSelect.value) || 493;
      const id1 = Math.floor(Math.random() * maxId) + 1;
      let id2 = Math.floor(Math.random() * maxId) + 1;
      while (id2 === id1) id2 = Math.floor(Math.random() * maxId) + 1;

      const [a, b] = await Promise.all([fetchPokemon(id1), fetchPokemon(id2)]);
      if (t !== token) return;
      await Promise.all([preloadImage(a.image, 6000), preloadImage(b.image, 6000)]);
      if (t !== token) return;

      leftMon = a; rightMon = b;
      stat = CATS[Math.floor(Math.random() * CATS.length)];
      banner.textContent = `Who has higher ${stat.label}?`;
      renderCard(cardL, leftMon, false);
      renderCard(cardR, rightMon, false);
      loader.classList.add('hidden');
      locked = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'PokéAPI hiccup — tap New Battle Streak.';
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(side) {
    if (locked || !leftMon || !rightMon) return;
    const t = token;
    locked = true;
    const lv = leftMon.stats[stat.key];
    const rv = rightMon.stats[stat.key];
    renderCard(cardL, leftMon, true);
    renderCard(cardR, rightMon, true);

    const won = (side === 'left' && lv >= rv) || (side === 'right' && rv >= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (won) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 130);
      recordBestValue('pokeClash', run);
      (side === 'left' ? cardL : cardR).classList.add('win');
      statusEl.classList.add('good');
      statusEl.textContent = `Super effective! ${leftMon.name} (${lv}) vs ${rightMon.name} (${rv})`;
      timer = setTimeout(() => { if (t === token) nextMatch(); }, 1250);
    } else {
      playSfx('wrong');
      resetStreak();
      (side === 'left' ? cardL : cardR).classList.add('lose');
      (side === 'left' ? cardR : cardL).classList.add('win');
      statusEl.classList.add('bad');
      statusEl.textContent = `KO! ${leftMon.name} (${lv}) vs ${rightMon.name} (${rv}). Final run: ${run}`;
      restartBtn.classList.remove('hidden');
    }
  }

  cardL.addEventListener('click', () => pick('left'));
  cardR.addEventListener('click', () => pick('right'));
  genSelect.addEventListener('change', () => { playSfx('click'); run = 0; runEl.textContent = '0'; nextMatch(); });
  restartBtn.addEventListener('click', () => { playSfx('click'); run = 0; runEl.textContent = '0'; nextMatch(); });
  nextMatch();
}

setupModeTabs((mode) => {
  if (mode === 'who') initWho();
  if (mode === 'clash') initClash();
});
