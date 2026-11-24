import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, animateNumber, triggerFlash,
} from './core.js';
import { JUTSU_POWERS, POWER_FIGHTERS, SPACE_BODIES, SPACE_ROCKETS } from './data/cosmosData.js';

initChrome('cosmos');

// ---------- 1. JUTSU & SUPERPOWER MATCH ----------
function initJutsu() {
  let pool = [], current = null, hintUsed = false, locked = false, choiceCount = 4;

  const uniSel = document.getElementById('jp-uni');
  const opt4 = document.getElementById('jp-opt-4'), opt6 = document.getElementById('jp-opt-6');
  const ptsEl = document.getElementById('jp-pts'), badgeEl = document.getElementById('jp-badge'), abEl = document.getElementById('jp-ability');
  const hintBtn = document.getElementById('jp-hint-btn'), hintBox = document.getElementById('jp-hint-box');
  const optionsEl = document.getElementById('jp-options'), feedbackEl = document.getElementById('jp-feedback'), nextBtn = document.getElementById('jp-next');

  function getFiltered() {
    const u = uniSel.value;
    return u === 'all' ? JUTSU_POWERS : JUTSU_POWERS.filter((x) => x.universe === u);
  }

  function nextRound() {
    locked = false; hintUsed = false;
    const list = getFiltered();
    if (!pool.length) pool = shuffle(list);
    current = pool.pop();
    const base = choiceCount === 6 ? 280 : 220;
    ptsEl.textContent = `+${base} PTS`;
    badgeEl.textContent = current.universe.toUpperCase();
    abEl.textContent = current.ability;
    hintBtn.disabled = false;
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    optionsEl.innerHTML = '';

    const decoySource = list.length >= choiceCount ? list : JUTSU_POWERS;
    const decoys = shuffle(decoySource.filter((x) => x.answer !== current.answer)).slice(0, choiceCount - 1).map((x) => x.answer);
    shuffle([current.answer, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.answer) {
          playSfx('correct');
          const earned = recordWin('cosmosJutsu', hintUsed ? base - 60 : base);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Direct hit! ${current.answer} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That signature power belongs to ${current.answer}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed || !current) return;
    playSfx('reveal'); hintUsed = true; hintBtn.disabled = true;
    ptsEl.textContent = `+${choiceCount === 6 ? 220 : 160} PTS`;
    hintBox.textContent = current.hint;
    hintBox.classList.remove('hidden');
  });
  uniSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); nextRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 2. POWER SCALE CLASH ----------
function initPowerClash() {
  const ATTRS = [
    { key: 'strength', label: 'Strength' },
    { key: 'speed', label: 'Speed' },
    { key: 'iq', label: 'Battle IQ' },
    { key: 'durability', label: 'Durability' },
    { key: 'overall', label: 'Overall Power' },
  ];
  let left = null, right = null, attr = null, run = 0, locked = false, timer = null;

  const statSel = document.getElementById('pw-stat-sel');
  const runEl = document.getElementById('pw-run'), banner = document.getElementById('pw-banner');
  const cardL = document.getElementById('pw-left'), cardR = document.getElementById('pw-right');
  const statusEl = document.getElementById('pw-status'), restartBtn = document.getElementById('pw-restart');

  function renderCard(el, f, show) {
    el.querySelector('.emoji-big').textContent = f.emoji;
    el.querySelector('h3').textContent = f.name;
    el.querySelector('.clash-types').textContent = f.uni;
    const v = el.querySelector('.clash-stat-val');
    v.classList.toggle('mystery', !show);
    if (show) animateNumber(v, 0, f[attr.key], { duration: 420 });
    else v.textContent = '???';
  }

  function nextMatch() {
    clearTimeout(timer);
    locked = false;
    cardL.classList.remove('win', 'lose');
    cardR.classList.remove('win', 'lose');
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');

    const pair = shuffle(POWER_FIGHTERS).slice(0, 2);
    left = pair[0]; right = pair[1];
    const mode = statSel.value;
    attr = mode === 'random' ? ATTRS[Math.floor(Math.random() * ATTRS.length)] : (ATTRS.find((a) => a.key === mode) || ATTRS[0]);
    banner.textContent = `Who has higher ${attr.label}?`;
    renderCard(cardL, left, false);
    renderCard(cardR, right, false);
  }

  function pick(side) {
    if (locked) return;
    locked = true;
    const lv = left[attr.key], rv = right[attr.key];
    renderCard(cardL, left, true);
    renderCard(cardR, right, true);
    const won = (side === 'left' && lv >= rv) || (side === 'right' && rv >= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (won) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 130);
      recordBestValue('cosmosPower', run);
      (side === 'left' ? cardL : cardR).classList.add('win');
      statusEl.classList.add('good');
      statusEl.textContent = `Victory! ${left.name} (${lv}) vs ${right.name} (${rv})`;
      timer = setTimeout(nextMatch, 1200);
    } else {
      playSfx('wrong');
      resetStreak();
      (side === 'left' ? cardL : cardR).classList.add('lose');
      (side === 'left' ? cardR : cardL).classList.add('win');
      statusEl.classList.add('bad');
      statusEl.textContent = `Defeated! ${left.name} (${lv}) vs ${right.name} (${rv}). Final run: ${run}`;
      restartBtn.classList.remove('hidden');
    }
  }

  cardL.addEventListener('click', () => pick('left'));
  cardR.addEventListener('click', () => pick('right'));
  statSel.addEventListener('change', () => { playSfx('click'); run = 0; runEl.textContent = '0'; nextMatch(); });
  restartBtn.addEventListener('click', () => { playSfx('click'); run = 0; runEl.textContent = '0'; nextMatch(); });
  nextMatch();
}

// ---------- 3. SPACE, PLANETS & ROCKETS SHOWDOWN ----------
function initSpace() {
  const METRICS = {
    bodies: [
      { key: 'gravity', label: 'Gravity', suf: ' m/s²', dec: 2 },
      { key: 'moons', label: 'Moons', suf: '', dec: 0 },
      { key: 'diameter', label: 'Diameter', suf: ' km', dec: 0 },
      { key: 'distanceAu', label: 'Sun Dist.', suf: ' AU', dec: 2 },
    ],
    rockets: [
      { key: 'thrust', label: 'Liftoff Thrust', suf: ' kN', dec: 0 },
      { key: 'payloadLeo', label: 'LEO Payload', suf: ' t', dec: 1 },
      { key: 'height', label: 'Height', suf: ' m', dec: 1 },
    ],
  };
  let pack = 'bodies', metricIdx = 0, pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const packSel = document.getElementById('spc-pack'), metricsEl = document.getElementById('spc-metrics');
  const runEl = document.getElementById('spc-run'), tipEl = document.getElementById('spc-tip');
  const lEmoji = document.getElementById('spc-l-emoji'), lName = document.getElementById('spc-l-name'), lFact = document.getElementById('spc-l-fact'), lLabel = document.getElementById('spc-l-label'), lVal = document.getElementById('spc-l-val');
  const rEmoji = document.getElementById('spc-r-emoji'), rName = document.getElementById('spc-r-name'), rFact = document.getElementById('spc-r-fact'), rLabel = document.getElementById('spc-r-label'), rVal = document.getElementById('spc-r-val');
  const controls = document.getElementById('spc-controls'), btnHi = document.getElementById('spc-hi'), btnLo = document.getElementById('spc-lo');
  const statusEl = document.getElementById('spc-status'), restartBtn = document.getElementById('spc-restart');

  const curMetric = () => METRICS[pack][metricIdx] || METRICS[pack][0];
  const getList = () => (pack === 'rockets' ? SPACE_ROCKETS : SPACE_BODIES);

  function renderMetricTabs() {
    metricsEl.innerHTML = '';
    METRICS[pack].forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${i === metricIdx ? ' active' : ''}`;
      b.textContent = m.label;
      b.addEventListener('click', () => { playSfx('click'); metricIdx = i; renderMetricTabs(); startRun(); });
      metricsEl.appendChild(b);
    });
  }

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getList());
    const i = pool.findIndex((x) => x.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    const m = curMetric();
    const fmt = (v) => `${m.dec ? v.toFixed(m.dec) : Number(v).toLocaleString()}${m.suf}`;
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lFact.textContent = left.fact;
    lLabel.textContent = m.label.toUpperCase(); lVal.textContent = fmt(left[m.key]);
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rFact.textContent = right.fact;
    rLabel.textContent = m.label.toUpperCase();
    rVal.classList.toggle('mystery', !showR);
    if (showR) animateNumber(rVal, 0, right[m.key], { duration: 450, decimals: m.dec, locale: !m.dec, suffix: m.suf });
    else rVal.textContent = '???';
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand object have higher or lower ${curMetric().label}?`;
    pool = shuffle(getList());
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
    const m = curMetric();
    render(true);
    const ok = (dir === 'higher' && right[m.key] >= left[m.key]) || (dir === 'lower' && right[m.key] <= left[m.key]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('cosmosSpace', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Orbital precision! ${right.name}: ${right[m.key]}${m.suf}`;
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
      statusEl.textContent = `Lost in space! ${right.name}: ${right[m.key]}${m.suf}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  packSel.addEventListener('change', () => { playSfx('click'); pack = packSel.value; metricIdx = 0; renderMetricTabs(); startRun(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  renderMetricTabs();
  startRun();
}

setupModeTabs((mode) => {
  if (mode === 'jutsu') initJutsu();
  if (mode === 'power') initPowerClash();
  if (mode === 'space') initSpace();
});
