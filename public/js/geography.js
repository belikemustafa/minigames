import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, preloadImage,
} from './core.js';

initChrome('geography');

let countriesCache = null;

const WORLD_CITIES = [
  { city: 'Bengaluru', country: 'India', lat: 12.97, lon: 77.59 },
  { city: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { city: 'New Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  { city: 'Swansea', country: 'United Kingdom', lat: 51.62, lon: -3.94 },
  { city: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.13 },
  { city: 'Helsinki', country: 'Finland', lat: 60.17, lon: 24.94 },
  { city: 'Rovaniemi', country: 'Finland', lat: 66.50, lon: 25.73 },
  { city: 'Reykjavik', country: 'Iceland', lat: 64.15, lon: -21.94 },
  { city: 'Dubai', country: 'UAE', lat: 25.20, lon: 55.27 },
  { city: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.65 },
  { city: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98 },
  { city: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { city: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
  { city: 'New York', country: 'USA', lat: 40.71, lon: -74.01 },
  { city: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.24 },
  { city: 'Miami', country: 'USA', lat: 25.76, lon: -80.19 },
  { city: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38 },
  { city: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lon: -43.17 },
  { city: 'Buenos Aires', country: 'Argentina', lat: -34.60, lon: -58.38 },
  { city: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24 },
  { city: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42 },
  { city: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
  { city: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
  { city: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70 },
  { city: 'Rome', country: 'Italy', lat: 41.90, lon: 12.50 },
  { city: 'Istanbul', country: 'Turkey', lat: 41.01, lon: 28.98 },
  { city: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.50 },
  { city: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13 },
  { city: 'Anchorage', country: 'USA (Alaska)', lat: 61.22, lon: -149.90 },
  { city: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.67 },
];

async function getCountries() {
  if (countriesCache) return countriesCache;
  const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,flags,population,area,borders,region');
  if (!res.ok) throw new Error(`REST Countries HTTP ${res.status}`);
  const data = await res.json();
  countriesCache = data
    .filter((c) => c.name?.common && c.flags?.png && Array.isArray(c.capital) && c.capital[0] && c.population > 100000)
    .map((c) => ({
      name: c.name.common,
      capital: c.capital[0],
      flag: c.flags.png,
      population: c.population || 0,
      area: Math.round(c.area || 0),
      borders: Array.isArray(c.borders) ? c.borders.length : 0,
      region: c.region || 'World',
    }));
  return countriesCache;
}

// ---------- 1. FLAG & CAPITAL BLITZ ----------
function initFlags() {
  let fMode = 'flag', pool = [], target = null, qType = 'flag', locked = true, token = 0;

  const tipEl = document.getElementById('geo-flag-tip');
  const loader = document.getElementById('geo-flag-loader');
  const imgEl = document.getElementById('geo-flag-img');
  const capPrompt = document.getElementById('geo-cap-prompt');
  const optionsEl = document.getElementById('geo-flag-options');
  const feedbackEl = document.getElementById('geo-flag-feedback');
  const nextBtn = document.getElementById('geo-flag-next');

  async function startRound() {
    const t = ++token;
    locked = true;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    imgEl.classList.add('hidden');
    capPrompt.classList.add('hidden');
    loader.textContent = 'Loading country...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';

    try {
      const all = await getCountries();
      if (t !== token) return;
      if (pool.length < 6) pool = shuffle(all);
      target = pool.pop();
      const decoys = shuffle(all.filter((c) => c.name !== target.name)).slice(0, 3);
      qType = fMode === 'mixed' ? (Math.random() < 0.5 ? 'flag' : 'capital') : fMode;

      if (qType === 'flag') {
        tipEl.textContent = 'Which country does this flag belong to?';
        await preloadImage(target.flag);
        if (t !== token) return;
        imgEl.src = target.flag;
        imgEl.classList.remove('hidden');
      } else {
        tipEl.textContent = 'Pick the capital city of this country.';
        capPrompt.innerHTML = `<div style="font-size:0.78rem; color:var(--muted); margin-bottom:4px;">CAPITAL OF</div><strong style="font-size:1.35rem; font-family:'Space Grotesk',sans-serif;">${target.name}</strong>`;
        capPrompt.classList.remove('hidden');
      }
      loader.classList.add('hidden');

      shuffle([target, ...decoys]).forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.textContent = qType === 'flag' ? c.name : c.capital;
        btn.dataset.country = c.name;
        btn.addEventListener('click', () => {
          if (locked) return;
          locked = true;
          optionsEl.querySelectorAll('.option-btn').forEach((b) => {
            b.disabled = true;
            if (b.dataset.country === target.name) b.classList.add('correct');
          });
          feedbackEl.classList.remove('hidden', 'good', 'bad');
          if (c.name === target.name) {
            playSfx('correct');
            const earned = recordWin('geoFlags', 180);
            feedbackEl.classList.add('good');
            feedbackEl.textContent = `Correct! ${target.name} (Capital: ${target.capital}) — +${earned} pts`;
          } else {
            playSfx('wrong');
            btn.classList.add('wrong');
            resetStreak();
            feedbackEl.classList.add('bad');
            feedbackEl.textContent = `Answer: ${target.name} — Capital: ${target.capital}`;
          }
          nextBtn.textContent = 'Next Country →';
          nextBtn.classList.remove('hidden');
        });
        optionsEl.appendChild(btn);
      });
      locked = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'REST Countries API hiccup — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  document.querySelectorAll('[data-fmode]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      fMode = b.dataset.fmode;
      document.querySelectorAll('[data-fmode]').forEach((x) => x.classList.toggle('active', x === b));
      startRound();
    });
  });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 2. POPULATION / AREA / BORDERS DUEL ----------
function initGeoDuel() {
  const META = {
    population: { label: 'POPULATION', tip: 'higher or lower population?', fmt: (v) => v.toLocaleString() },
    area:       { label: 'AREA (KM²)', tip: 'larger or smaller land area?', fmt: (v) => `${v.toLocaleString()} km²` },
    borders:    { label: 'NEIGHBORS',  tip: 'more or fewer bordering countries?', fmt: (v) => `${v} countries` },
  };
  let stat = 'population', pool = [], left = null, right = null, run = 0, locked = true, token = 0, timer = null;

  const tipEl = document.getElementById('geo-duel-tip');
  const runEl = document.getElementById('geo-duel-run');
  const loader = document.getElementById('geo-duel-loader');
  const lFlag = document.getElementById('geo-l-flag'), lName = document.getElementById('geo-l-name'), lReg = document.getElementById('geo-l-reg'), lLabel = document.getElementById('geo-l-label'), lVal = document.getElementById('geo-l-val');
  const rFlag = document.getElementById('geo-r-flag'), rName = document.getElementById('geo-r-name'), rReg = document.getElementById('geo-r-reg'), rLabel = document.getElementById('geo-r-label'), rVal = document.getElementById('geo-r-val');
  const controls = document.getElementById('geo-duel-controls');
  const btnHi = document.getElementById('geo-btn-hi'), btnLo = document.getElementById('geo-btn-lo');
  const statusEl = document.getElementById('geo-duel-status');
  const restartBtn = document.getElementById('geo-duel-restart');

  function draw(ex) {
    const i = pool.findIndex((c) => c.name !== ex);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showR = false) {
    const m = META[stat];
    lFlag.src = left.flag; lName.textContent = left.name; lReg.textContent = left.region;
    lLabel.textContent = m.label; lVal.textContent = m.fmt(left[stat]);

    rFlag.src = right.flag; rName.textContent = right.name; rReg.textContent = right.region;
    rLabel.textContent = m.label;
    rVal.textContent = showR ? m.fmt(right[stat]) : '???';
    rVal.classList.toggle('mystery', !showR);
  }

  async function startRun() {
    clearTimeout(timer);
    const t = ++token;
    locked = true; run = 0; runEl.textContent = '0';
    tipEl.textContent = `Does the right-hand country have a ${META[stat].tip}`;
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.classList.remove('hidden');

    try {
      const all = await getCountries();
      if (t !== token) return;
      pool = shuffle(all);
      left = draw(null); right = draw(left.name);
      render(false);
      loader.classList.add('hidden');
      btnHi.disabled = false; btnLo.disabled = false;
      locked = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'Could not load REST Countries — tap New World Run.';
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(dir) {
    if (locked) return;
    const t = token;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const ok = (dir === 'higher' && right[stat] >= left[stat]) || (dir === 'lower' && right[stat] <= left[stat]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('geoDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Correct! ${right.name}: ${META[stat].fmt(right[stat])}`;
      timer = setTimeout(() => {
        if (t !== token) return;
        left = right;
        if (pool.length < 3) pool = shuffle(countriesCache || []);
        right = draw(left.name);
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
        render(false);
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${right.name}: ${META[stat].fmt(right[stat])}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  document.querySelectorAll('[data-gstat]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      stat = b.dataset.gstat;
      document.querySelectorAll('[data-gstat]').forEach((x) => x.classList.toggle('active', x === b));
      startRun();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

// ---------- 3. LIVE WEATHER BET (Open-Meteo Keyless API) ----------
function initWeather() {
  let wxMode = 'duel', leftC = null, rightC = null, exactC = null, locked = true, token = 0;

  const btnDuel = document.getElementById('wx-mode-duel'), btnExact = document.getElementById('wx-mode-exact');
  const tipEl = document.getElementById('wx-tip');
  const duelBox = document.getElementById('wx-duel-box'), exactBox = document.getElementById('wx-exact-box');
  const loader = document.getElementById('wx-loader');
  const cardL = document.getElementById('wx-left'), cardR = document.getElementById('wx-right');
  const exactLoader = document.getElementById('wx-exact-loader');
  const exactCity = document.getElementById('wx-exact-city'), exactCountry = document.getElementById('wx-exact-country');
  const slider = document.getElementById('wx-slider'), sliderVal = document.getElementById('wx-slider-val');
  const exactSubmit = document.getElementById('wx-exact-submit');
  const statusEl = document.getElementById('wx-status');
  const nextBtn = document.getElementById('wx-next');

  async function fetchTemp(cityObj) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityObj.lat}&longitude=${cityObj.lon}&current=temperature_2m`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo error');
    const json = await res.json();
    return Math.round(json.current.temperature_2m);
  }

  function renderDuelCard(el, obj, show) {
    el.querySelector('h3').textContent = obj.city;
    el.querySelector('.clash-types').textContent = obj.country;
    const v = el.querySelector('.clash-stat-val');
    v.textContent = show ? `${obj.temp}°C` : '??°C';
    v.classList.toggle('mystery', !show);
  }

  async function startRound() {
    const t = ++token;
    locked = true;
    statusEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    cardL.classList.remove('win', 'lose');
    cardR.classList.remove('win', 'lose');

    duelBox.classList.toggle('hidden', wxMode !== 'duel');
    exactBox.classList.toggle('hidden', wxMode !== 'exact');

    try {
      if (wxMode === 'duel') {
        tipEl.textContent = 'Tap whichever city is warmer RIGHT NOW in real-time.';
        loader.textContent = 'Checking live thermometers...';
        loader.classList.remove('hidden');
        const pair = shuffle(WORLD_CITIES).slice(0, 2);
        const [t1, t2] = await Promise.all([fetchTemp(pair[0]), fetchTemp(pair[1])]);
        if (t !== token) return;
        leftC = { ...pair[0], temp: t1 };
        rightC = { ...pair[1], temp: t2 };
        renderDuelCard(cardL, leftC, false);
        renderDuelCard(cardR, rightC, false);
        loader.classList.add('hidden');
        locked = false;
      } else {
        tipEl.textContent = 'Drag the slider to guess the current live temperature (within ±3°C wins!).';
        exactLoader.textContent = 'Reading live temperature...';
        exactLoader.classList.remove('hidden');
        exactSubmit.disabled = true;
        const c = WORLD_CITIES[Math.floor(Math.random() * WORLD_CITIES.length)];
        const temp = await fetchTemp(c);
        if (t !== token) return;
        exactC = { ...c, temp };
        exactCity.textContent = c.city;
        exactCountry.textContent = c.country;
        slider.value = 18;
        sliderVal.textContent = '18°C';
        exactLoader.classList.add('hidden');
        exactSubmit.disabled = false;
        locked = false;
      }
    } catch {
      if (t !== token) return;
      loader.textContent = 'Open-Meteo hiccup — tap Retry.';
      exactLoader.textContent = 'Open-Meteo hiccup — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function pickCity(side) {
    if (locked || !leftC || !rightC) return;
    locked = true;
    renderDuelCard(cardL, leftC, true);
    renderDuelCard(cardR, rightC, true);
    const won = (side === 'left' && leftC.temp >= rightC.temp) || (side === 'right' && rightC.temp >= leftC.temp);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (won) {
      playSfx('correct');
      const earned = recordWin('geoWeather', 160);
      (side === 'left' ? cardL : cardR).classList.add('win');
      statusEl.classList.add('good');
      statusEl.textContent = `Warm call! ${leftC.city} (${leftC.temp}°C) vs ${rightC.city} (${rightC.temp}°C) — +${earned} pts`;
    } else {
      playSfx('wrong');
      resetStreak();
      (side === 'left' ? cardL : cardR).classList.add('lose');
      (side === 'left' ? cardR : cardL).classList.add('win');
      statusEl.classList.add('bad');
      statusEl.textContent = `Chilly miss! ${leftC.city} (${leftC.temp}°C) vs ${rightC.city} (${rightC.temp}°C).`;
    }
    nextBtn.textContent = 'Next Weather Bet →';
    nextBtn.classList.remove('hidden');
  }

  exactSubmit.addEventListener('click', () => {
    if (locked || !exactC) return;
    locked = true;
    exactSubmit.disabled = true;
    const guess = Number(slider.value);
    const diff = Math.abs(guess - exactC.temp);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (diff <= 3) {
      playSfx('correct');
      const pts = diff === 0 ? 300 : diff === 1 ? 240 : 180;
      const earned = recordWin('geoWeather', pts);
      statusEl.classList.add('good');
      statusEl.textContent = `Bullseye! ${exactC.city} is ${exactC.temp}°C right now (off by ${diff}°C) — +${earned} pts`;
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `${exactC.city} is currently ${exactC.temp}°C (you guessed ${guess}°C, off by ${diff}°C).`;
    }
    nextBtn.textContent = 'Next City →';
    nextBtn.classList.remove('hidden');
  });

  slider.addEventListener('input', () => { sliderVal.textContent = `${slider.value}°C`; });
  cardL.addEventListener('click', () => pickCity('left'));
  cardR.addEventListener('click', () => pickCity('right'));
  btnDuel.addEventListener('click', () => { playSfx('click'); wxMode = 'duel'; btnDuel.classList.add('active'); btnExact.classList.remove('active'); startRound(); });
  btnExact.addEventListener('click', () => { playSfx('click'); wxMode = 'exact'; btnExact.classList.add('active'); btnDuel.classList.remove('active'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

setupModeTabs((mode) => {
  if (mode === 'flags') initFlags();
  if (mode === 'duel') initGeoDuel();
  if (mode === 'weather') initWeather();
});
