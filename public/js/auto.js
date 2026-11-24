import {
  initChrome, setupModeTabs, playSfx, getAudioCtx, recordWin,
  recordBestValue, resetStreak, shuffle, escapeHtml,
} from './core.js';
import { AUTO_SPECS, HEADLIGHT_CLUES, EXHAUST_SOUNDS } from './data/autoData.js';

initChrome('auto');

// ---------- 1. SPEC SHEET SHOWDOWN ----------
function initSpecs() {
  const META = {
    bhp:    { label: 'POWER',  unit: ' BHP', tip: 'higher or lower horsepower (BHP)?' },
    torque: { label: 'TORQUE', unit: ' Nm',  tip: 'more or less peak torque (Nm)?' },
    weight: { label: 'WEIGHT', unit: ' kg',  tip: 'heavier or lighter kerb weight?' },
    price:  { label: 'PRICE',  unit: 'L',    tip: 'higher or lower ex-showroom price (₹ Lakhs)?', prefix: '₹' },
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

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(AUTO_SPECS[pack]);
    const i = pool.findIndex((x) => x.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lBrand.textContent = left.brand;
    lLabel.textContent = META[metric].label; lVal.textContent = fmt(left[metric]);
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rBrand.textContent = right.brand;
    rLabel.textContent = META[metric].label;
    rVal.textContent = showR ? fmt(right[metric]) : '???';
    rVal.classList.toggle('mystery', !showR);
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand machine have ${META[metric].tip}`;
    pool = shuffle(AUTO_SPECS[pack]);
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

// ---------- 2. HEADLIGHT / SILHOUETTE UNBLUR ----------
function initHeadlight() {
  let pool = [], target = null, hints = 0, pts = 300, locked = false;
  const wrapEl = document.getElementById('hl-svg-wrap');
  const ptsEl = document.getElementById('hl-pts');
  const hintBtn = document.getElementById('hl-hint-btn');
  const hintBox = document.getElementById('hl-hint-box');
  const optionsEl = document.getElementById('hl-options');
  const feedbackEl = document.getElementById('hl-feedback');
  const nextBtn = document.getElementById('hl-next');

  function nextRound() {
    locked = false; hints = 0; pts = 300;
    if (!pool.length) pool = shuffle(HEADLIGHT_CLUES);
    target = pool.pop();
    ptsEl.textContent = '+300 PTS';
    hintBtn.disabled = false;
    hintBtn.textContent = '💡 Unblur & Country Clue (-75 pts)';
    hintBox.classList.add('hidden');
    hintBox.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    wrapEl.className = 'svg-vehicle-wrap blur-3';
    wrapEl.innerHTML = target.svg;
    optionsEl.innerHTML = '';

    shuffle(target.options).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        wrapEl.className = 'svg-vehicle-wrap blur-0';
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

  hintBtn.addEventListener('click', () => {
    if (locked || hints >= 2) return;
    playSfx('click');
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

// ---------- 3. SOUND / EXHAUST GUESS (Procedural Web Audio Engine Synth) ----------
function initExhaust() {
  let pool = [], current = null, locked = false, playingTimer = null;
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

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const master = ctx.createGain();

      filter.type = 'lowpass';
      osc.connect(filter);
      sub.connect(filter);
      filter.connect(master);
      master.connect(ctx.destination);

      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);

      if (type === 'thumper') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(52, now);
        osc.frequency.linearRampToValueAtTime(78, now + 1.8);
        osc.frequency.linearRampToValueAtTime(50, now + dur);
        sub.frequency.setValueAtTime(26, now);
        lfo.frequency.setValueAtTime(7.5, now);
        lfo.frequency.linearRampToValueAtTime(14, now + 1.8);
        lfoGain.gain.setValueAtTime(0.12, now);
        filter.frequency.setValueAtTime(240, now);
      } else if (type === 'inline4') {
        osc.type = 'sawtooth'; sub.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 2.0);
        osc.frequency.exponentialRampToValueAtTime(360, now + 2.2);
        osc.frequency.exponentialRampToValueAtTime(740, now + dur);
        sub.frequency.setValueAtTime(320, now);
        sub.frequency.exponentialRampToValueAtTime(1240, now + 2.0);
        lfo.frequency.setValueAtTime(28, now);
        lfoGain.gain.setValueAtTime(0.03, now);
        filter.frequency.setValueAtTime(1600, now);
      } else if (type === 'v8') {
        osc.type = 'sawtooth'; sub.type = 'square';
        osc.frequency.setValueAtTime(68, now);
        osc.frequency.exponentialRampToValueAtTime(165, now + 2.2);
        osc.frequency.linearRampToValueAtTime(80, now + dur);
        sub.frequency.setValueAtTime(34, now);
        sub.frequency.exponentialRampToValueAtTime(82, now + 2.2);
        lfo.frequency.setValueAtTime(12, now);
        lfoGain.gain.setValueAtTime(0.09, now);
        filter.frequency.setValueAtTime(380, now);
      } else if (type === 'f1v10') {
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(1250, now + 1.1);
        osc.frequency.setValueAtTime(880, now + 1.18);
        osc.frequency.exponentialRampToValueAtTime(1450, now + 2.2);
        osc.frequency.setValueAtTime(980, now + 2.28);
        osc.frequency.exponentialRampToValueAtTime(1600, now + dur);
        sub.frequency.setValueAtTime(210, now);
        lfo.frequency.setValueAtTime(40, now);
        lfoGain.gain.setValueAtTime(0.02, now);
        filter.frequency.setValueAtTime(2800, now);
      } else if (type === 'ev') {
        osc.type = 'sine'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(1350, now + 2.6);
        osc.frequency.exponentialRampToValueAtTime(420, now + dur);
        sub.frequency.setValueAtTime(520, now);
        sub.frequency.exponentialRampToValueAtTime(2100, now + 2.6);
        lfo.frequency.setValueAtTime(2, now);
        lfoGain.gain.setValueAtTime(0.005, now);
        filter.frequency.setValueAtTime(2400, now);
      } else {
        // Boxer flat-4 warble
        osc.type = 'sawtooth'; sub.type = 'triangle';
        osc.frequency.setValueAtTime(84, now);
        osc.frequency.linearRampToValueAtTime(210, now + 2.2);
        osc.frequency.linearRampToValueAtTime(95, now + dur);
        sub.frequency.setValueAtTime(42, now);
        lfo.frequency.setValueAtTime(16, now);
        lfo.frequency.linearRampToValueAtTime(26, now + 2.2);
        lfoGain.gain.setValueAtTime(0.11, now);
        filter.frequency.setValueAtTime(520, now);
      }

      master.gain.setValueAtTime(0.01, now);
      master.gain.linearRampToValueAtTime(0.18, now + 0.15);
      master.gain.setValueAtTime(0.18, now + dur - 0.3);
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

    shuffle(current.options).forEach((opt) => {
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
          const earned = recordWin('autoSound', 220);
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

  playBtn.addEventListener('click', () => { if (current) synthEngine(current.id); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'specs') initSpecs();
  if (mode === 'unblur') initHeadlight();
  if (mode === 'sound') initExhaust();
});
