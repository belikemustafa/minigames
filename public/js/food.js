import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, preloadImage, animateNumber, triggerFlash, burstMilestone, loadJson,
} from './core.js';
const { MACRO_FOODS, BRACKET_PACKS } = await loadJson('./data/food/food.json');

initChrome('food');

const AREAS = [
  'Indian', 'Italian', 'Japanese', 'Mexican', 'Chinese', 'Thai', 'French',
  'American', 'British', 'Greek', 'Turkish', 'Spanish', 'Moroccan', 'Canadian',
  'Vietnamese', 'Malaysian', 'Jamaican', 'Egyptian', 'Russian', 'Polish', 'Portuguese', 'Tunisian',
];

function extractIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const val = (meal[`strIngredient${i}`] || '').trim();
    if (val && !list.includes(val)) list.push(val);
  }
  return list;
}

async function fetchRandomMeal() {
  const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
  if (!res.ok) throw new Error(`TheMealDB HTTP ${res.status}`);
  const json = await res.json();
  const meal = json?.meals?.[0];
  if (!meal) throw new Error('No meal returned');
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    area: meal.strArea && meal.strArea !== 'Unknown' ? meal.strArea : 'International',
    image: meal.strMealThumb,
    ingredients: extractIngredients(meal),
  };
}

// ---------- 1. CUISINE COMPASS (4/6 Options!) ----------
function initCompass() {
  let target = null, hintUsed = false, locked = true, token = 0, choiceCount = 4;

  const btnOpt4 = document.getElementById('compass-opt-4');
  const btnOpt6 = document.getElementById('compass-opt-6');
  const imgEl = document.getElementById('compass-img');
  const loader = document.getElementById('compass-loader');
  const ptsEl = document.getElementById('compass-pts');
  const hintBtn = document.getElementById('compass-hint-btn');
  const hintBox = document.getElementById('compass-hint-box');
  const optionsEl = document.getElementById('compass-options');
  const feedbackEl = document.getElementById('compass-feedback');
  const nextBtn = document.getElementById('compass-next-btn');

  async function startRound() {
    const t = ++token;
    locked = true; hintUsed = false;
    ptsEl.textContent = `+${choiceCount === 6 ? 310 : 250} PTS`;
    hintBtn.disabled = true;
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Plating dish...';
    loader.classList.remove('hidden');
    imgEl.className = '';
    optionsEl.innerHTML = '';

    try {
      let meal = await fetchRandomMeal();
      if (meal.area === 'International') meal = await fetchRandomMeal();
      if (t !== token) return;
      target = meal;

      await preloadImage(target.image);
      if (t !== token) return;
      imgEl.src = target.image;
      imgEl.classList.add('ready');
      loader.classList.add('hidden');

      const decoys = shuffle(AREAS.filter((a) => a.toLowerCase() !== target.area.toLowerCase())).slice(0, choiceCount - 1);
      shuffle([target.area, ...decoys]).forEach((area) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.textContent = area;
        btn.addEventListener('click', () => handleGuess(area, btn));
        optionsEl.appendChild(btn);
      });
      locked = false; hintBtn.disabled = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'TheMealDB hiccup — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function handleGuess(sel, btnEl) {
    if (locked || !target) return;
    locked = true; hintBtn.disabled = true;
    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (b.textContent === target.area) b.classList.add('correct');
    });
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (sel === target.area) {
      playSfx('correct');
      const base = choiceCount === 6 ? (hintUsed ? 235 : 310) : (hintUsed ? 175 : 250);
      const earned = recordWin('foodCompass', base);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Delicious! "${target.name}" is ${target.area} — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `That dish is "${target.name}" (${target.area}).`;
    }
    nextBtn.textContent = 'Next Dish →';
    nextBtn.classList.remove('hidden');
  }

  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); startRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); startRound(); });
  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed || !target) return;
    playSfx('click'); hintUsed = true; hintBtn.disabled = true;
    ptsEl.textContent = `+${choiceCount === 6 ? 235 : 175} PTS`;
    const top3 = target.ingredients.slice(0, 3).join(', ') || 'House spices';
    hintBox.innerHTML = `<strong>Key Ingredients:</strong> ${escapeHtml(top3)}`;
    hintBox.classList.remove('hidden');
  });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 2. INGREDIENT DETECTIVE ----------
function initIngredients() {
  let target = null, shownCount = 3, pts = 300, locked = true, token = 0;

  const loader = document.getElementById('ing-loader');
  const gridEl = document.getElementById('ing-grid');
  const ptsEl = document.getElementById('ing-pts');
  const hintBtn = document.getElementById('ing-hint-btn');
  const optionsEl = document.getElementById('ing-options');
  const feedbackEl = document.getElementById('ing-feedback');
  const nextBtn = document.getElementById('ing-next-btn');

  function renderIngredients() {
    gridEl.innerHTML = '';
    target.ingredients.slice(0, shownCount).forEach((ing) => {
      const tile = document.createElement('div');
      tile.className = 'ing-tile';
      const slug = encodeURIComponent(ing.replace(/\s+/g, '_'));
      tile.innerHTML = `
        <img src="https://www.themealdb.com/images/ingredients/${slug}-medium.png" alt="${escapeHtml(ing)}" onerror="this.style.display='none'" />
        <span>${escapeHtml(ing)}</span>`;
      gridEl.appendChild(tile);
    });
  }

  async function startRound() {
    const t = ++token;
    locked = true; shownCount = 3; pts = 300;
    ptsEl.textContent = '+300 PTS';
    hintBtn.disabled = true;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Chopping ingredients...';
    loader.classList.remove('hidden');
    gridEl.innerHTML = '';
    optionsEl.innerHTML = '';

    try {
      const batch = await Promise.all([fetchRandomMeal(), fetchRandomMeal(), fetchRandomMeal(), fetchRandomMeal()]);
      if (t !== token) return;
      const unique = [], seen = new Set();
      batch.forEach((m) => { if (!seen.has(m.id)) { seen.add(m.id); unique.push(m); } });
      if (unique.length < 3) throw new Error('Duplicate meals returned');

      target = unique[0];
      renderIngredients();
      loader.classList.add('hidden');

      shuffle(unique).forEach((m) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = m.id;
        btn.textContent = m.name;
        btn.addEventListener('click', () => handleGuess(m, btn));
        optionsEl.appendChild(btn);
      });
      locked = false;
      hintBtn.disabled = target.ingredients.length <= 3;
    } catch {
      if (t !== token) return;
      loader.textContent = 'TheMealDB hiccup — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function handleGuess(sel, btnEl) {
    if (locked || !target) return;
    locked = true; hintBtn.disabled = true;
    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === target.id) b.classList.add('correct');
    });
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (sel.id === target.id) {
      playSfx('correct');
      const earned = recordWin('foodIng', pts);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Chef's kiss! It's "${target.name}" (${target.area}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Those ingredients make "${target.name}" (${target.area}).`;
    }
    nextBtn.textContent = 'Next Recipe →';
    nextBtn.classList.remove('hidden');
  }

  hintBtn.addEventListener('click', () => {
    if (locked || !target || shownCount >= Math.min(target.ingredients.length, 6)) return;
    playSfx('click');
    shownCount += 1;
    pts = Math.max(120, pts - 60);
    ptsEl.textContent = `+${pts} PTS`;
    renderIngredients();
    if (shownCount >= Math.min(target.ingredients.length, 6)) hintBtn.disabled = true;
  });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 3. CALORIE & MACRO DUEL (64 Foods, 5 Macros, 4 Categories!) ----------
function initMacroDuel() {
  const META = {
    calories: { label: 'KCAL / 100G', unit: ' kcal' },
    protein:  { label: 'PROTEIN / 100G', unit: 'g' },
    carbs:    { label: 'CARBS / 100G', unit: 'g' },
    fat:      { label: 'FAT / 100G', unit: 'g' },
    sugar:    { label: 'SUGAR / 100G', unit: 'g' },
  };
  let metric = 'calories', pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const catSel = document.getElementById('macro-cat');
  const runEl = document.getElementById('macro-run');
  const lEmoji = document.getElementById('macro-l-emoji'), lName = document.getElementById('macro-l-name'), lDesc = document.getElementById('macro-l-desc'), lLabel = document.getElementById('macro-l-label'), lVal = document.getElementById('macro-l-val');
  const rEmoji = document.getElementById('macro-r-emoji'), rName = document.getElementById('macro-r-name'), rDesc = document.getElementById('macro-r-desc'), rLabel = document.getElementById('macro-r-label'), rVal = document.getElementById('macro-r-val');
  const controls = document.getElementById('macro-controls');
  const btnHi = document.getElementById('macro-btn-higher'), btnLo = document.getElementById('macro-btn-lower');
  const statusEl = document.getElementById('macro-status');
  const restartBtn = document.getElementById('macro-restart-btn');

  function getFiltered() {
    const c = catSel.value;
    return c === 'all' ? MACRO_FOODS : MACRO_FOODS.filter((f) => f.cat === c);
  }

  function draw(exclude) {
    if (pool.length < 3) pool = shuffle(getFiltered());
    const idx = pool.findIndex((f) => f.name !== exclude);
    return pool.splice(idx === -1 ? 0 : idx, 1)[0];
  }

  function render(showRight = false) {
    const m = META[metric];
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lDesc.textContent = left.desc;
    lLabel.textContent = m.label; lVal.textContent = `${left[metric]}${m.unit}`;
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rDesc.textContent = right.desc;
    rLabel.textContent = m.label;
    rVal.classList.toggle('mystery', !showRight);
    if (showRight) {
      const dec = metric === 'calories' ? 0 : 1;
      animateNumber(rVal, 0, right[metric], { duration: 440, decimals: dec, suffix: m.unit });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    pool = shuffle(getFiltered());
    left = draw(null); right = draw(left.name);
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = false; btnLo.disabled = false;
    render(false);
  }

  function guess(dir) {
    if (locked) return;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const ok = (dir === 'higher' && right[metric] >= left[metric]) || (dir === 'lower' && right[metric] <= left[metric]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('foodMacro', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Spot on! ${right.name}: ${right[metric]}${META[metric].unit} per 100g`;
      timer = setTimeout(() => {
        left = right; right = draw(left.name);
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
        render(false);
        triggerFlash(rVal.closest('.duel-arena'), 'duel-shift');
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Missed! ${right.name} has ${right[metric]}${META[metric].unit}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  catSel.addEventListener('change', () => { playSfx('click'); startRun(); });
  document.querySelectorAll('[data-macro]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playSfx('click');
      metric = btn.dataset.macro;
      document.querySelectorAll('[data-macro]').forEach((b) => b.classList.toggle('active', b === btn));
      startRun();
    });
  });
  btnHi.addEventListener('click', () => guess('higher'));
  btnLo.addEventListener('click', () => guess('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

// ---------- 4. FOOD KNOCKOUT BRACKET (5 Packs + 8/16 Toggle!) ----------
function initBracket() {
  let bracketSize = 16, currentRound = [], nextRound = [], idx = 0;

  const packSel = document.getElementById('bracket-pack');
  const sz8 = document.getElementById('bracket-sz-8'), sz16 = document.getElementById('bracket-sz-16');
  const labelEl = document.getElementById('bracket-round-label');
  const matchBox = document.getElementById('bracket-match');
  const winBox = document.getElementById('bracket-winner');
  const btnTop = document.getElementById('bracket-top'), btnBot = document.getElementById('bracket-bot');
  const topName = document.getElementById('b-top-name'), topNote = document.getElementById('b-top-note'), topEmoji = document.getElementById('b-top-emoji');
  const botName = document.getElementById('b-bot-name'), botNote = document.getElementById('b-bot-note'), botEmoji = document.getElementById('b-bot-emoji');
  const winEmoji = document.getElementById('b-win-emoji'), winName = document.getElementById('b-win-name'), winNote = document.getElementById('b-win-note');
  const restartBtn = document.getElementById('bracket-restart');

  function roundTitle(n) {
    if (n === 16) return 'Round of 16';
    if (n === 8) return 'Quarterfinals';
    if (n === 4) return 'Semifinals';
    return 'Grand Final';
  }

  function renderPair() {
    const a = currentRound[idx], b = currentRound[idx + 1];
    labelEl.textContent = `${roundTitle(currentRound.length)} • Match ${idx / 2 + 1} of ${currentRound.length / 2}`;
    topName.textContent = a.name; topNote.textContent = a.note; topEmoji.textContent = a.emoji;
    botName.textContent = b.name; botNote.textContent = b.note; botEmoji.textContent = b.emoji;
    triggerFlash(matchBox, 'fx-pop');
  }

  function startBracket() {
    const pack = BRACKET_PACKS[packSel.value] || BRACKET_PACKS.global;
    currentRound = shuffle(pack).slice(0, bracketSize);
    nextRound = []; idx = 0;
    matchBox.classList.remove('hidden');
    winBox.classList.add('hidden');
    renderPair();
  }

  function choose(offset) {
    playSfx('click');
    nextRound.push(currentRound[idx + offset]);
    idx += 2;
    if (idx >= currentRound.length) {
      if (nextRound.length === 1) {
        const champ = nextRound[0];
        playSfx('fanfare');
        burstMilestone(`🏆 ${champ.name.toUpperCase()}`);
        recordWin('foodBracket', bracketSize === 16 ? 220 : 140);
        matchBox.classList.add('hidden');
        winBox.classList.remove('hidden');
        labelEl.textContent = 'Tournament Complete!';
        winEmoji.textContent = champ.emoji;
        winName.textContent = `🏆 ${champ.name}`;
        winNote.textContent = champ.note;
        return;
      }
      currentRound = nextRound; nextRound = []; idx = 0;
    }
    renderPair();
  }

  sz8.addEventListener('click', () => { playSfx('click'); bracketSize = 8; sz8.classList.add('active'); sz16.classList.remove('active'); startBracket(); });
  sz16.addEventListener('click', () => { playSfx('click'); bracketSize = 16; sz16.classList.add('active'); sz8.classList.remove('active'); startBracket(); });
  btnTop.addEventListener('click', () => choose(0));
  btnBot.addEventListener('click', () => choose(1));
  packSel.addEventListener('change', () => { playSfx('click'); startBracket(); });
  restartBtn.addEventListener('click', () => { playSfx('click'); startBracket(); });
  startBracket();
}

setupModeTabs((mode) => {
  if (mode === 'compass') initCompass();
  if (mode === 'ingredients') initIngredients();
  if (mode === 'macro') initMacroDuel();
  if (mode === 'bracket') initBracket();
});
