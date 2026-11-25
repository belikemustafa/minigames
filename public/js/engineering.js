import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, loadJson, animateNumber, triggerFlash,
} from './core.js';

initChrome('engineering');

// ---------- 1. MATERIAL & LANDMARK CLASH ----------
async function initClash() {
  const data = await loadJson('./data/engineering/materials-landmarks.json');
  const METRICS = {
    materials: [
      { key: 'tensile', label: 'Tensile (MPa)', suf: ' MPa', dec: 0 },
      { key: 'modulus', label: 'Stiffness (GPa)', suf: ' GPa', dec: 1 },
      { key: 'density', label: 'Density (kg/m³)', suf: ' kg/m³', dec: 0 },
      { key: 'melt',    label: 'Melt/Max °C', suf: '°C', dec: 0 },
    ],
    landmarks: [
      { key: 'height', label: 'Height (m)', suf: ' m', dec: 0 },
      { key: 'year',   label: 'Year Built', suf: '', dec: 0 },
      { key: 'floors', label: 'Floors', suf: ' floors', dec: 0 },
    ],
  };

  let pack = 'materials', metricIdx = 0, pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const packSel = document.getElementById('eng-pack'), metricsEl = document.getElementById('eng-metrics');
  const runEl = document.getElementById('eng-run'), tipEl = document.getElementById('eng-clash-tip');
  const lEmoji = document.getElementById('eng-l-emoji'), lName = document.getElementById('eng-l-name'), lNote = document.getElementById('eng-l-note'), lLabel = document.getElementById('eng-l-label'), lVal = document.getElementById('eng-l-val');
  const rEmoji = document.getElementById('eng-r-emoji'), rName = document.getElementById('eng-r-name'), rNote = document.getElementById('eng-r-note'), rLabel = document.getElementById('eng-r-label'), rVal = document.getElementById('eng-r-val');
  const controls = document.getElementById('eng-controls'), btnHi = document.getElementById('eng-hi'), btnLo = document.getElementById('eng-lo');
  const statusEl = document.getElementById('eng-status'), restartBtn = document.getElementById('eng-restart');

  const curMetric = () => METRICS[pack][metricIdx] || METRICS[pack][0];
  const getList = () => (pack === 'landmarks' ? data.landmarks : data.materials);

  function renderMetricBtns() {
    metricsEl.innerHTML = '';
    METRICS[pack].forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${i === metricIdx ? ' active' : ''}`;
      b.textContent = m.label;
      b.addEventListener('click', () => { playSfx('click'); metricIdx = i; renderMetricBtns(); startRun(); });
      metricsEl.appendChild(b);
    });
  }

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getList());
    const i = pool.findIndex((x) => x.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function fmt(v, m) {
    if (m.key === 'year') return v < 0 ? `${Math.abs(v)} BCE` : String(v);
    const num = m.dec && !Number.isInteger(v) ? v.toFixed(m.dec) : Number(v).toLocaleString();
    return `${num}${m.suf}`;
  }

  function render(showR = false) {
    const m = curMetric();
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lNote.textContent = left.note;
    lLabel.textContent = m.label.toUpperCase(); lVal.textContent = fmt(left[m.key], m);
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rNote.textContent = right.note;
    rLabel.textContent = m.label.toUpperCase();
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      if (m.key === 'year' && right[m.key] < 0) rVal.textContent = fmt(right[m.key], m);
      else animateNumber(rVal, 0, right[m.key], { duration: 450, decimals: m.dec && !Number.isInteger(right[m.key]) ? m.dec : 0, locale: m.key !== 'year' && !m.dec, suffix: m.suf });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand item have higher or lower ${curMetric().label}?`;
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
      recordBestValue('engClash', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Accurate! ${right.name}: ${fmt(right[m.key], m)}`;
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
      statusEl.textContent = `Structural failure! ${right.name}: ${fmt(right[m.key], m)}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  packSel.addEventListener('change', () => { playSfx('click'); pack = packSel.value; metricIdx = 0; renderMetricBtns(); startRun(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  renderMetricBtns();
  startRun();
}

// ---------- SHARED QUIZ RUNNER FOR MECH & ARCH ----------
async function initTopicQuiz({ jsonPath, bestKey, filterId, badgeId, qId, optionsId, feedbackId, nextId }) {
  const all = await loadJson(jsonPath);
  let pool = [], current = null, locked = false;

  const filterSel = document.getElementById(filterId);
  const badgeEl = document.getElementById(badgeId);
  const qEl = document.getElementById(qId);
  const optionsEl = document.getElementById(optionsId);
  const feedbackEl = document.getElementById(feedbackId);
  const nextBtn = document.getElementById(nextId);

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? all : all.filter((x) => x.topic === f);
  }

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    badgeEl.textContent = current.topic.toUpperCase();
    qEl.textContent = current.q;
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
          if (b.textContent === current.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.answer) {
          playSfx('correct');
          const earned = recordWin(bestKey, 200);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Spot on (+${earned} pts)! ${current.note}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Answer: ${current.answer}. ${current.note}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 4. UNITS, CODES & TOOLS MATCH ----------
async function initCodes() {
  const all = await loadJson('./data/engineering/codes-units.json');
  let pool = [], current = null, locked = false, choiceCount = 4;

  const filterSel = document.getElementById('codes-filter');
  const opt4 = document.getElementById('cd-opt-4'), opt6 = document.getElementById('cd-opt-6');
  const badgeEl = document.getElementById('cd-cat-badge'), promptEl = document.getElementById('cd-prompt');
  const optionsEl = document.getElementById('cd-options'), feedbackEl = document.getElementById('cd-feedback'), nextBtn = document.getElementById('cd-next');

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? all : all.filter((x) => x.cat === f);
  }

  function nextRound() {
    locked = false;
    const list = getFiltered();
    if (!pool.length) pool = shuffle(list);
    current = pool.pop();
    badgeEl.textContent = current.cat.toUpperCase();
    promptEl.textContent = current.prompt;
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    const decoyPool = list.length >= choiceCount ? list : all;
    const decoys = shuffle(decoyPool.filter((x) => x.answer !== current.answer)).slice(0, choiceCount - 1).map((x) => x.answer);
    shuffle([current.answer, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.answer) {
          playSfx('correct');
          const earned = recordWin('engCodes', choiceCount === 6 ? 250 : 190);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Exact match (+${earned} pts)! ${current.note}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Correct: ${current.answer}. ${current.note}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); nextRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'clash') initClash();
  if (mode === 'mech') initTopicQuiz({
    jsonPath: './data/engineering/mech-questions.json', bestKey: 'engMech',
    filterId: 'mech-filter', badgeId: 'mc-topic-badge', qId: 'mech-q',
    optionsId: 'mech-options', feedbackId: 'mech-feedback', nextId: 'mech-next',
  });
  if (mode === 'arch') initTopicQuiz({
    jsonPath: './data/engineering/arch-questions.json', bestKey: 'engArch',
    filterId: 'arch-filter', badgeId: 'ar-topic-badge', qId: 'arch-q',
    optionsId: 'arch-options', feedbackId: 'arch-feedback', nextId: 'arch-next',
  });
  if (mode === 'codes') initCodes();
});
