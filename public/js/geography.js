import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, animateNumber, triggerFlash,
} from './core.js';
import { WORLD_COUNTRIES, WORLD_CITIES } from './data/worldData.js';

initChrome('geography');

const flagUrl = (code) => `https://flagcdn.com/w320/${code}.png`;

// ---------- 1. FLAG, CAPITAL & CURRENCY BLITZ (103 Countries, Region Filter, 4/6 Options!) ----------
function initFlags() {
  let fMode = 'flag', choiceCount = 4, pool = [], target = null, qType = 'flag', locked = false;

  const regSel = document.getElementById('geo-flag-region');
  const btnOpt4 = document.getElementById('geo-opt-4');
  const btnOpt6 = document.getElementById('geo-opt-6');
  const tipEl = document.getElementById('geo-flag-tip');
  const imgEl = document.getElementById('geo-flag-img');
  const capPrompt = document.getElementById('geo-cap-prompt');
  const optionsEl = document.getElementById('geo-flag-options');
  const feedbackEl = document.getElementById('geo-flag-feedback');
  const nextBtn = document.getElementById('geo-flag-next');

  function getRegionPool() {
    const r = regSel.value;
    return r === 'All' ? WORLD_COUNTRIES : WORLD_COUNTRIES.filter((c) => c.region === r);
  }

  function startRound() {
    locked = false;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    imgEl.classList.add('hidden');
    capPrompt.classList.add('hidden');
    optionsEl.innerHTML = '';

    const regPool = getRegionPool();
    if (pool.length < 2) pool = shuffle(regPool);
    target = pool.pop();

    const actualChoices = Math.min(choiceCount, WORLD_COUNTRIES.length);
    const poolForDecoys = regPool.length >= actualChoices ? regPool : WORLD_COUNTRIES;
    qType = fMode === 'mixed' ? ['flag', 'capital', 'currency'][Math.floor(Math.random() * 3)] : fMode;

    // For currency mode, avoid duplicate Euro/USD decoys
    let decoyCandidates = poolForDecoys.filter((c) => c.code !== target.code);
    if (qType === 'currency') {
      const seenCur = new Set([target.currency]);
      decoyCandidates = shuffle(WORLD_COUNTRIES.filter((c) => c.code !== target.code)).filter((c) => {
        if (seenCur.has(c.currency)) return false;
        seenCur.add(c.currency);
        return true;
      });
    } else {
      decoyCandidates = shuffle(decoyCandidates);
    }

    const choices = shuffle([target, ...decoyCandidates.slice(0, actualChoices - 1)]);

    if (qType === 'flag') {
      tipEl.textContent = 'Which country does this national flag belong to?';
      imgEl.src = flagUrl(target.code);
      imgEl.alt = `National flag`;
      imgEl.classList.remove('hidden');
      triggerFlash(imgEl, 'fx-pop');
    } else if (qType === 'capital') {
      tipEl.textContent = 'Pick the capital city of this country.';
      capPrompt.innerHTML = `<div style="font-size:0.78rem; color:var(--muted); margin-bottom:4px;">CAPITAL OF (${escapeHtml(target.region)})</div><strong style="font-size:1.35rem; font-family:'Space Grotesk',sans-serif;">${escapeHtml(target.name)}</strong>`;
      capPrompt.classList.remove('hidden');
    } else {
      tipEl.textContent = 'Pick the official currency used in this country.';
      capPrompt.innerHTML = `<div style="font-size:0.78rem; color:var(--muted); margin-bottom:4px;">CURRENCY OF (${escapeHtml(target.region)})</div><strong style="font-size:1.35rem; font-family:'Space Grotesk',sans-serif;">${escapeHtml(target.name)}</strong>`;
      capPrompt.classList.remove('hidden');
    }

    choices.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.code = c.code;
      btn.textContent = qType === 'flag' ? c.name : qType === 'capital' ? c.capital : c.currency;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.code === target.code) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (c.code === target.code) {
          playSfx('correct');
          const earned = recordWin('geoFlags', choiceCount === 6 ? 240 : 180);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Spot on! ${target.name} • Capital: ${target.capital} • ${target.currency} (+${earned} pts)`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Answer: ${target.name} — Capital: ${target.capital} (${target.currency})`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  regSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); startRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); startRound(); });
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

// ---------- 2. WORLD SCALE DUEL (Instant, 103 Countries, Region Filter!) ----------
function initGeoDuel() {
  const META = {
    pop:     { label: 'POPULATION', tip: 'higher or lower population?', fmt: (v) => v.toLocaleString() },
    area:    { label: 'AREA (KM²)', tip: 'larger or smaller land area?', fmt: (v) => `${v.toLocaleString()} km²` },
    borders: { label: 'NEIGHBORS',  tip: 'more or fewer bordering countries?', fmt: (v) => `${v} borders` },
  };
  let stat = 'pop', pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const regSel = document.getElementById('geo-duel-region');
  const tipEl = document.getElementById('geo-duel-tip');
  const runEl = document.getElementById('geo-duel-run');
  const lFlag = document.getElementById('geo-l-flag'), lName = document.getElementById('geo-l-name'), lReg = document.getElementById('geo-l-reg'), lLabel = document.getElementById('geo-l-label'), lVal = document.getElementById('geo-l-val');
  const rFlag = document.getElementById('geo-r-flag'), rName = document.getElementById('geo-r-name'), rReg = document.getElementById('geo-r-reg'), rLabel = document.getElementById('geo-r-label'), rVal = document.getElementById('geo-r-val');
  const controls = document.getElementById('geo-duel-controls');
  const btnHi = document.getElementById('geo-btn-hi'), btnLo = document.getElementById('geo-btn-lo');
  const statusEl = document.getElementById('geo-duel-status');
  const restartBtn = document.getElementById('geo-duel-restart');

  function getFiltered() {
    const r = regSel.value;
    return r === 'All' ? WORLD_COUNTRIES : WORLD_COUNTRIES.filter((c) => c.region === r);
  }

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getFiltered());
    const i = pool.findIndex((c) => c.code !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    const m = META[stat];
    lFlag.src = flagUrl(left.code); lName.textContent = left.name; lReg.textContent = `${left.region} • ${left.capital}`;
    lLabel.textContent = m.label; lVal.textContent = m.fmt(left[stat]);

    rFlag.src = flagUrl(right.code); rName.textContent = right.name; rReg.textContent = `${right.region} • ${right.capital}`;
    rLabel.textContent = m.label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      if (stat === 'pop') animateNumber(rVal, 0, right.pop, { duration: 500, locale: true });
      else if (stat === 'area') animateNumber(rVal, 0, right.area, { duration: 500, locale: true, suffix: ' km²' });
      else animateNumber(rVal, 0, right.borders, { duration: 420, suffix: ' borders' });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand country have a ${META[stat].tip}`;
    pool = shuffle(getFiltered());
    left = draw(null); right = draw(left.code);
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = false; btnLo.disabled = false;
    render(false);
  }

  function pick(dir) {
    if (locked) return;
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
        left = right; right = draw(left.code);
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
      statusEl.textContent = `Run ended! ${right.name}: ${META[stat].fmt(right[stat])}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  regSel.addEventListener('change', () => { playSfx('click'); startRun(); });
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

// ---------- 3. LIVE WEATHER BET (Open-Meteo Live + Automatic Smart Fallback!) ----------
function initWeather() {
  let wxMode = 'duel', leftC = null, rightC = null, exactC = null, locked = true, token = 0;

  const regSel = document.getElementById('wx-region');
  const srcBadge = document.getElementById('wx-source-badge');
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

  function getCityPool() {
    const r = regSel.value;
    return r === 'All' ? WORLD_CITIES : WORLD_CITIES.filter((c) => c.region === r);
  }

  async function fetchTemp(cityObj) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityObj.lat}&longitude=${cityObj.lon}&current=temperature_2m`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (typeof json?.current?.temperature_2m === 'number') {
          return { temp: Math.round(json.current.temperature_2m), live: true };
        }
      }
    } catch {}
    // Fallback to realistic baseline temperature so the game NEVER breaks
    return { temp: cityObj.fallbackTemp, live: false };
  }

  function renderDuelCard(el, obj, show) {
    el.querySelector('h3').textContent = obj.city;
    el.querySelector('.clash-types').textContent = obj.country;
    const v = el.querySelector('.clash-stat-val');
    v.classList.toggle('mystery', !show);
    if (show) animateNumber(v, 0, obj.temp, { duration: 440, suffix: '°C' });
    else v.textContent = '??°C';
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

    const pool = getCityPool();
    if (wxMode === 'duel') {
      tipEl.textContent = 'Tap whichever city is warmer right now.';
      loader.textContent = 'Checking thermometers...';
      loader.classList.remove('hidden');
      const pair = shuffle(pool).slice(0, 2);
      const [r1, r2] = await Promise.all([fetchTemp(pair[0]), fetchTemp(pair[1])]);
      if (t !== token) return;
      srcBadge.textContent = r1.live && r2.live ? 'Live API' : 'Climate Avg';
      leftC = { ...pair[0], temp: r1.temp };
      rightC = { ...pair[1], temp: r2.temp };
      renderDuelCard(cardL, leftC, false);
      renderDuelCard(cardR, rightC, false);
      loader.classList.add('hidden');
      locked = false;
    } else {
      tipEl.textContent = 'Drag the slider to guess the current temperature (within ±3°C wins!).';
      exactLoader.textContent = 'Reading temperature...';
      exactLoader.classList.remove('hidden');
      exactSubmit.disabled = true;
      const c = pool[Math.floor(Math.random() * pool.length)];
      const r = await fetchTemp(c);
      if (t !== token) return;
      srcBadge.textContent = r.live ? 'Live API' : 'Climate Avg';
      exactC = { ...c, temp: r.temp };
      exactCity.textContent = c.city;
      exactCountry.textContent = c.country;
      slider.value = 18;
      sliderVal.textContent = '18°C';
      exactLoader.classList.add('hidden');
      exactSubmit.disabled = false;
      locked = false;
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
    nextBtn.classList.remove('hidden');
  }

  exactSubmit.addEventListener('click', () => {
    if (locked || !exactC) return;
    locked = true; exactSubmit.disabled = true;
    const guess = Number(slider.value);
    const diff = Math.abs(guess - exactC.temp);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (diff <= 3) {
      playSfx('correct');
      const pts = diff === 0 ? 300 : diff === 1 ? 240 : 180;
      const earned = recordWin('geoWeather', pts);
      statusEl.classList.add('good');
      statusEl.textContent = `Bullseye! ${exactC.city} is ${exactC.temp}°C (off by ${diff}°C) — +${earned} pts`;
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `${exactC.city} is ${exactC.temp}°C (you guessed ${guess}°C, off by ${diff}°C).`;
    }
    nextBtn.classList.remove('hidden');
  });

  regSel.addEventListener('change', () => { playSfx('click'); startRound(); });
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
