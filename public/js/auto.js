import {
  initChrome, setupModeTabs, playSfx, getAudioCtx, recordWin,
  recordBestValue, resetStreak, shuffle, escapeHtml, animateNumber, triggerFlash, loadJson,
} from './core.js';
const { AUTO_SPECS, HEADLIGHT_CLUES, EXHAUST_SOUNDS } = await loadJson('./data/auto/auto.json');

initChrome('auto');

// ---------- 1. SPEC SHEET SHOWDOWN (66 Vehicles, 5 Packs, 5 Metrics incl 0-100!) ----------
function initSpecs() {
  const META = {
    bhp:       { label: 'POWER',  unit: ' BHP', tip: 'higher or lower horsepower (BHP)?' },
    torque:    { label: 'TORQUE', unit: ' Nm',  tip: 'more or less peak torque (Nm)?' },
    zeroTo100: { label: '0–100',  unit: 's',    tip: 'higher (slower) or lower (faster) 0–100 km/h time?' },
    weight:    { label: 'WEIGHT', unit: ' kg',  tip: 'heavier or lighter kerb weight?' },
    price:     { label: 'PRICE',  unit: 'L',    tip: 'higher or lower ex-showroom price (₹ Lakhs)?', prefix: '₹' },
  };
  let pack = 'bikes', metric = 'bhp', pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const packSel = document.getElementById('auto-pack');
  const runEl = document.getElementById('auto-run');
  const tipEl = document.getElementById('auto-spec-tip');
  const lEmoji = document.getElementById('auto-l-emoji'), lName = document.getElementById('auto-l-name'), lBrand = document.getElementById('auto-l-brand'), lLabel = document.getElementById('auto-l-label'), lVal = document.getElementById('auto-l-val');
  const rEmoji = document.getElementById('auto-r-emoji'), rName = document.getElementById('auto-r-name'), rBrand = document.getElementById('auto-r-brand'), rLabel = document.getElementById('auto-r-label'), rVal = document.getElementById('auto-r-val');
  const controls = document.getElementById('auto-controls');
  const btnHi = document.getElementById('auto-btn-hi'), btnLo = document.getElementById('auto-btn-lo');
  const statusEl = document.getElementById('auto-status');
  const restartBtn = document.getElementById('auto-restart');

  const fmt = (v) => `${META[metric].prefix || ''}${v}${META[metric].unit}`;
  function getPackList() {
    if (pack === 'all') return Object.values(AUTO_SPECS).flat();
    return AUTO_SPECS[pack] || AUTO_SPECS.bikes;
  }

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getPackList());
    const i = pool.findIndex((x) => x.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lBrand.textContent = left.brand;
    lLabel.textContent = META[metric].label; lVal.textContent = fmt(left[metric]);
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rBrand.textContent = right.brand;
    rLabel.textContent = META[metric].label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      const dec = (metric === 'weight') ? 0 : (Number.isInteger(right[metric]) ? 0 : 1);
      animateNumber(rVal, 0, right[metric], { duration: 450, decimals: dec, prefix: META[metric].prefix || '', suffix: META[metric].unit });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand machine have a ${META[metric].tip}`;
    pool = shuffle(getPackList());
    left = draw(null); right = draw(left.name);
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
    const ok = (dir === 'higher' && right[metric] >= left[metric]) || (dir === 'lower' && right[metric] <= left[metric]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('autoSpecs', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Spot on! ${right.name}: ${fmt(right[metric])}`;
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
      statusEl.textContent = `Run ended! ${right.name}: ${fmt(right[metric])}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  packSel.addEventListener('change', () => { playSfx('click'); pack = packSel.value; startRun(); });
  document.querySelectorAll('[data-ametric]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      metric = b.dataset.ametric;
      document.querySelectorAll('[data-ametric]').forEach((x) => x.classList.toggle('active', x === b));
      startRun();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

// ---------- 2. HEADLIGHT / TAILLIGHT UNBLUR (16 SVGs + 4/6 Options!) ----------
function initHeadlight() {
  let pool = [], target = null, hints = 0, pts = 300, locked = false, choiceCount = 4;
  const ALL_NAMES = HEADLIGHT_CLUES.map((h) => h.name);
  const btnOpt4 = document.getElementById('hl-opt-4'), btnOpt6 = document.getElementById('hl-opt-6');
  const wrapEl = document.getElementById('hl-svg-wrap');
  const ptsEl = document.getElementById('hl-pts');
  const hintBtn = document.getElementById('hl-hint-btn');
  const hintBox = document.getElementById('hl-hint-box');
  const optionsEl = document.getElementById('hl-options');
  const feedbackEl = document.getElementById('hl-feedback');
  const nextBtn = document.getElementById('hl-next');

  function nextRound() {
    locked = false; hints = 0;
    pts = choiceCount === 6 ? 360 : 300;
    if (!pool.length) pool = shuffle(HEADLIGHT_CLUES);
    target = pool.pop();
    ptsEl.textContent = `+${pts} PTS`;
    hintBtn.disabled = false;
    hintBtn.textContent = '💡 Unblur & Country Clue (-75 pts)';
    hintBox.classList.add('hidden');
    hintBox.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    wrapEl.className = 'svg-vehicle-wrap blur-3';
    wrapEl.innerHTML = target.svg;
    optionsEl.innerHTML = '';

    const decoys = shuffle(ALL_NAMES.filter((n) => n !== target.name)).slice(0, choiceCount - 1);
    shuffle([target.name, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        wrapEl.className = 'svg-vehicle-wrap blur-0';
        triggerFlash(wrapEl.parentElement, 'lens-sweep');
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === target.name) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === target.name) {
          playSfx('correct');
          const earned = recordWin('autoUnblur', pts);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Clean ID! ${target.name} (${target.engine}) — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That signature belongs to ${target.name}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); nextRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); nextRound(); });
  hintBtn.addEventListener('click', () => {
    if (locked || hints >= 2) return;
    playSfx('reveal');
    triggerFlash(wrapEl.parentElement, 'lens-sweep');
    hints += 1;
    pts = Math.max(100, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    hintBox.classList.remove('hidden');
    if (hints === 1) {
      wrapEl.className = 'svg-vehicle-wrap blur-2';
      hintBox.innerHTML = `<strong>Clue 1:</strong> Origin: <strong>${escapeHtml(target.country)}</strong> • Era: ${escapeHtml(target.year)}`;
      hintBtn.textContent = '💡 Engine Clue & Unblur (-75 pts)';
    } else {
      wrapEl.className = 'svg-vehicle-wrap blur-1';
      hintBox.innerHTML += `<br/><strong>Clue 2:</strong> Powertrain: <strong>${escapeHtml(target.engine)}</strong>`;
      hintBtn.disabled = true;
    }
  });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 3. SOUND / EXHAUST GUESS (10 Procedural Engine Synths + 4/6 Options!) ----------
function initExhaust() {
  let pool = [], current = null, locked = false, playingTimer = null, choiceCount = 4;
  const ALL_SOUNDS = EXHAUST_SOUNDS.map((s) => s.name);
  const btnOpt4 = document.getElementById('ex-opt-4'), btnOpt6 = document.getElementById('ex-opt-6');
  const barsEl = document.getElementById('ex-bars');
  const playBtn = document.getElementById('ex-play-btn');
  const optionsEl = document.getElementById('ex-options');
  const feedbackEl = document.getElementById('ex-feedback');
  const nextBtn = document.getElementById('ex-next');

  function synthEngine(type) {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const dur = 3.2;

      const osc = ctx.createOscillator(), sub = ctx.createOscillator();
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter(), master = ctx.createGain();
      filter.type = 'lowpass';
      osc.connect(filter); sub.connect(filter);
      filter.connect(master); master.connect(ctx.destination);
      lfo.connect(lfoGain); lfoGain.connect(master.gain);

      if (type === 'thumper') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(52, now); osc.frequency.linearRampToValueAtTime(78, now + 1.8); osc.frequency.linearRampToValueAtTime(50, now + dur);
        sub.frequency.setValueAtTime(26, now); lfo.frequency.setValueAtTime(7.5, now); lfo.frequency.linearRampToValueAtTime(14, now + 1.8);
        lfoGain.gain.setValueAtTime(0.12, now); filter.frequency.setValueAtTime(240, now);
      } else if (type === 'inline4') {
        osc.type = 'sawtooth'; sub.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now); osc.frequency.exponentialRampToValueAtTime(620, now + 2.0); osc.frequency.exponentialRampToValueAtTime(360, now + 2.2); osc.frequency.exponentialRampToValueAtTime(740, now + dur);
        sub.frequency.setValueAtTime(320, now); sub.frequency.exponentialRampToValueAtTime(1240, now + 2.0);
        lfo.frequency.setValueAtTime(28, now); lfoGain.gain.setValueAtTime(0.03, now); filter.frequency.setValueAtTime(1600, now);
      } else if (type === 'v8') {
        osc.type = 'sawtooth'; sub.type = 'square';
        osc.frequency.setValueAtTime(68, now); osc.frequency.exponentialRampToValueAtTime(165, now + 2.2); osc.frequency.linearRampToValueAtTime(80, now + dur);
        sub.frequency.setValueAtTime(34, now); sub.frequency.exponentialRampToValueAtTime(82, now + 2.2);
        lfo.frequency.setValueAtTime(12, now); lfoGain.gain.setValueAtTime(0.09, now); filter.frequency.setValueAtTime(380, now);
      } else if (type === 'f1v10') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(420, now); osc.frequency.exponentialRampToValueAtTime(1250, now + 1.1); osc.frequency.setValueAtTime(880, now + 1.18); osc.frequency.exponentialRampToValueAtTime(1450, now + 2.2); osc.frequency.setValueAtTime(980, now + 2.28); osc.frequency.exponentialRampToValueAtTime(1600, now + dur);
        sub.frequency.setValueAtTime(210, now); lfo.frequency.setValueAtTime(40, now); lfoGain.gain.setValueAtTime(0.02, now); filter.frequency.setValueAtTime(2800, now);
      } else if (type === 'ev') {
        osc.type = 'sine'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(260, now); osc.frequency.exponentialRampToValueAtTime(1350, now + 2.6); osc.frequency.exponentialRampToValueAtTime(420, now + dur);
        sub.frequency.setValueAtTime(520, now); sub.frequency.exponentialRampToValueAtTime(2100, now + 2.6);
        lfo.frequency.setValueAtTime(2, now); lfoGain.gain.setValueAtTime(0.005, now); filter.frequency.setValueAtTime(2400, now);
      } else if (type === 'boxer') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(84, now); osc.frequency.linearRampToValueAtTime(210, now + 2.2); osc.frequency.linearRampToValueAtTime(95, now + dur);
        sub.frequency.setValueAtTime(42, now); lfo.frequency.setValueAtTime(16, now); lfo.frequency.linearRampToValueAtTime(26, now + 2.2);
        lfoGain.gain.setValueAtTime(0.11, now); filter.frequency.setValueAtTime(520, now);
      } else if (type === 'twin270') {
        osc.type = 'sawtooth'; sub.type = 'square';
        osc.frequency.setValueAtTime(92, now); osc.frequency.exponentialRampToValueAtTime(280, now + 2.1); osc.frequency.linearRampToValueAtTime(110, now + dur);
        sub.frequency.setValueAtTime(61, now); lfo.frequency.setValueAtTime(14, now); lfo.frequency.linearRampToValueAtTime(28, now + 2.1);
        lfoGain.gain.setValueAtTime(0.08, now); filter.frequency.setValueAtTime(680, now);
      } else if (type === 'v12') {
        osc.type = 'sawtooth'; sub.type = 'sine';
        osc.frequency.setValueAtTime(240, now); osc.frequency.exponentialRampToValueAtTime(920, now + 2.2); osc.frequency.exponentialRampToValueAtTime(440, now + dur);
        sub.frequency.setValueAtTime(360, now); sub.frequency.exponentialRampToValueAtTime(1380, now + 2.2);
        lfo.frequency.setValueAtTime(34, now); lfoGain.gain.setValueAtTime(0.02, now); filter.frequency.setValueAtTime(2100, now);
      } else if (type === 'rotary') {
        osc.type = 'square'; sub.type = 'sawtooth';
        osc.frequency.setValueAtTime(195, now); osc.frequency.exponentialRampToValueAtTime(760, now + 2.1); osc.frequency.exponentialRampToValueAtTime(210, now + dur);
        sub.frequency.setValueAtTime(97, now); lfo.frequency.setValueAtTime(22, now); lfoGain.gain.setValueAtTime(0.09, now); filter.frequency.setValueAtTime(1300, now);
      } else if (type === 'flat6') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(840, now + 2.2); osc.frequency.linearRampToValueAtTime(310, now + dur);
        sub.frequency.setValueAtTime(330, now); sub.frequency.exponentialRampToValueAtTime(1260, now + 2.2);
        lfo.frequency.setValueAtTime(30, now); lfoGain.gain.setValueAtTime(0.03, now); filter.frequency.setValueAtTime(1950, now);
      } else if (type === 'inline3') {
        osc.type = 'sawtooth'; sub.type = 'sine';
        osc.frequency.setValueAtTime(135, now); osc.frequency.exponentialRampToValueAtTime(510, now + 2.1); osc.frequency.linearRampToValueAtTime(180, now + dur);
        sub.frequency.setValueAtTime(850, now); sub.frequency.exponentialRampToValueAtTime(1900, now + 2.1);
        lfo.frequency.setValueAtTime(19, now); lfoGain.gain.setValueAtTime(0.06, now); filter.frequency.setValueAtTime(1400, now);
      } else {
        // diesel clatter + turbo whistle
        osc.type = 'square'; sub.type = 'sine';
        osc.frequency.setValueAtTime(44, now); osc.frequency.linearRampToValueAtTime(110, now + 2.2); osc.frequency.linearRampToValueAtTime(46, now + dur);
        sub.frequency.setValueAtTime(900, now); sub.frequency.exponentialRampToValueAtTime(1850, now + 2.2);
        lfo.frequency.setValueAtTime(18, now); lfoGain.gain.setValueAtTime(0.11, now); filter.frequency.setValueAtTime(950, now);
      }

      master.gain.setValueAtTime(0.01, now);
      master.gain.linearRampToValueAtTime(0.17, now + 0.14);
      master.gain.setValueAtTime(0.17, now + dur - 0.3);
      master.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.start(now); sub.start(now); lfo.start(now);
      osc.stop(now + dur); sub.stop(now + dur); lfo.stop(now + dur);

      barsEl.classList.add('playing');
      clearTimeout(playingTimer);
      playingTimer = setTimeout(() => barsEl.classList.remove('playing'), dur * 1000);
    } catch {}
  }

  function nextRound() {
    locked = false;
    barsEl.classList.remove('playing');
    if (!pool.length) pool = shuffle(EXHAUST_SOUNDS);
    current = pool.pop();
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    const decoys = shuffle(ALL_SOUNDS.filter((n) => n !== current.name)).slice(0, choiceCount - 1);
    shuffle([current.name, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.name) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.name) {
          playSfx('correct');
          const earned = recordWin('autoSound', choiceCount === 6 ? 280 : 220);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Petrolhead ears! ${current.name} (e.g., ${current.example}) — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That was a ${current.name} (${current.example}) — ${current.desc}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); nextRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); nextRound(); });
  playBtn.addEventListener('click', () => { if (current) synthEngine(current.id); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'specs') initSpecs();
  if (mode === 'unblur') initHeadlight();
  if (mode === 'sound') initExhaust();
});
