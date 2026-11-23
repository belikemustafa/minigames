import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, showToast,
} from './core.js';
import { CAREERS } from './data/careersData.js';

initChrome('careers');

// ---------- 1. SALARY SHOWDOWN (India / US toggle) ----------
function initSalary() {
  let region = 'in'; // 'in' | 'us'
  let pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const btnIn = document.getElementById('sal-reg-in'), btnUs = document.getElementById('sal-reg-us');
  const runEl = document.getElementById('sal-run');
  const lEmoji = document.getElementById('sal-l-emoji'), lName = document.getElementById('sal-l-name'), lSec = document.getElementById('sal-l-sector'), lVal = document.getElementById('sal-l-val');
  const rEmoji = document.getElementById('sal-r-emoji'), rName = document.getElementById('sal-r-name'), rSec = document.getElementById('sal-r-sector'), rVal = document.getElementById('sal-r-val');
  const controls = document.getElementById('sal-controls');
  const btnHi = document.getElementById('sal-btn-higher'), btnLo = document.getElementById('sal-btn-lower');
  const statusEl = document.getElementById('sal-status');
  const restartBtn = document.getElementById('sal-restart');

  const getVal = (c) => (region === 'in' ? c.inSalary : c.usSalary);
  const fmtVal = (v) => (region === 'in' ? `₹${v} LPA` : `$${v}k/yr`);

  function draw(exclude) {
    if (pool.length < 3) pool = shuffle(CAREERS);
    const i = pool.findIndex((c) => c.name !== exclude);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showRight = false) {
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lSec.textContent = `${left.sector} • ${left.setting}`;
    lVal.textContent = fmtVal(getVal(left));
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rSec.textContent = `${right.sector} • ${right.setting}`;
    rVal.textContent = showRight ? fmtVal(getVal(right)) : '???';
    rVal.classList.toggle('mystery', !showRight);
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    pool = shuffle(CAREERS);
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
    const lv = getVal(left), rv = getVal(right);
    const ok = (dir === 'higher' && rv >= lv) || (dir === 'lower' && rv <= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('careerSalary', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Right! ${right.name} averages ${fmtVal(rv)}.`;
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
      statusEl.textContent = `Run ended! ${right.name} averages ${fmtVal(rv)}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  btnIn.addEventListener('click', () => { playSfx('click'); region = 'in'; btnIn.classList.add('active'); btnUs.classList.remove('active'); startRun(); });
  btnUs.addEventListener('click', () => { playSfx('click'); region = 'us'; btnUs.classList.add('active'); btnIn.classList.remove('active'); startRun(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

// ---------- 2. TOOLS OF THE TRADE ----------
function initTools() {
  let pool = [], target = null, locked = false;
  const chipsEl = document.getElementById('tools-chips');
  const optionsEl = document.getElementById('tools-options');
  const feedbackEl = document.getElementById('tools-feedback');
  const nextBtn = document.getElementById('tools-next');

  function nextRound() {
    locked = false;
    if (pool.length < 4) pool = shuffle(CAREERS);
    target = pool.pop();
    const decoys = shuffle(CAREERS.filter((c) => c.name !== target.name)).slice(0, 3);
    chipsEl.innerHTML = target.tools.map((t) => `<span class="tool-chip">${escapeHtml(t)}</span>`).join('');
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    shuffle([target, ...decoys]).forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = `${c.emoji} ${c.name}`;
      btn.dataset.name = c.name;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.name === target.name) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (c.name === target.name) {
          playSfx('correct');
          const earned = recordWin('careerTools', 200);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Nailed it! That's the ${target.name} toolkit — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Those tools belong to a ${target.name} (${target.sector}).`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 3. CAREER SPOTLE ----------
function initSpotle() {
  const PAY_RANK = ['Mid', 'Mid-High', 'High', 'Very High'];
  let target = null, tries = 0, guessed = new Set(), done = false, selectedCareer = null;

  const triesEl = document.getElementById('spotle-tries');
  const input = document.getElementById('spotle-input');
  const submit = document.getElementById('spotle-submit');
  const dropdown = document.getElementById('spotle-dropdown');
  const rowsEl = document.getElementById('spotle-rows');
  const feedbackEl = document.getElementById('spotle-feedback');
  const newBtn = document.getElementById('spotle-new');

  function startNew() {
    target = CAREERS[Math.floor(Math.random() * CAREERS.length)];
    tries = 0; guessed.clear(); done = false; selectedCareer = null;
    triesEl.textContent = 'Tries: 0 / 6';
    rowsEl.innerHTML = '';
    input.value = ''; input.disabled = false; submit.disabled = false;
    dropdown.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    newBtn.classList.add('hidden');
  }

  function renderDropdown(q) {
    dropdown.innerHTML = '';
    const clean = q.trim().toLowerCase();
    if (!clean || done) { dropdown.classList.add('hidden'); return; }
    const hits = CAREERS.filter((c) => !guessed.has(c.name) && c.name.toLowerCase().includes(clean));
    if (!hits.length) { dropdown.classList.add('hidden'); return; }
    hits.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dropdown-item';
      b.textContent = c.name;
      b.addEventListener('click', () => {
        selectedCareer = c;
        input.value = c.name;
        dropdown.classList.add('hidden');
      });
      dropdown.appendChild(b);
    });
    dropdown.classList.remove('hidden');
  }

  function submitGuess() {
    if (done) return;
    const raw = input.value.trim().toLowerCase();
    const pick = (selectedCareer && selectedCareer.name.toLowerCase() === raw ? selectedCareer : null)
      || CAREERS.find((c) => c.name.toLowerCase() === raw);
    if (!pick) return showToast('Pick a career from the dropdown list');
    if (guessed.has(pick.name)) return showToast('Already guessed that career');

    guessed.add(pick.name);
    tries += 1;
    triesEl.textContent = `Tries: ${tries} / 6`;
    input.value = ''; selectedCareer = null; dropdown.classList.add('hidden');

    const payDiff = Math.abs(PAY_RANK.indexOf(pick.payTier) - PAY_RANK.indexOf(target.payTier));
    const payClass = payDiff === 0 ? 'match' : payDiff === 1 ? 'close' : 'miss';
    const payArrow = PAY_RANK.indexOf(pick.payTier) < PAY_RANK.indexOf(target.payTier) ? ' ↑' : PAY_RANK.indexOf(pick.payTier) > PAY_RANK.indexOf(target.payTier) ? ' ↓' : '';

    const row = document.createElement('div');
    row.className = 'spotle-row';
    row.innerHTML = `
      <div class="spotle-cell ${pick.name === target.name ? 'match' : ''}">${escapeHtml(pick.name)}</div>
      <div class="spotle-cell ${pick.sector === target.sector ? 'match' : 'miss'}">${escapeHtml(pick.sector)}</div>
      <div class="spotle-cell ${pick.setting === target.setting ? 'match' : 'miss'}">${escapeHtml(pick.setting)}</div>
      <div class="spotle-cell ${pick.degree === target.degree ? 'match' : 'miss'}">${escapeHtml(pick.degree)}</div>
      <div class="spotle-cell ${payClass}">${escapeHtml(pick.payTier)}${payArrow}</div>
      <div class="spotle-cell ${pick.teamSize === target.teamSize ? 'match' : 'miss'}">${escapeHtml(pick.teamSize)}</div>`;
    rowsEl.appendChild(row);

    if (pick.name === target.name) {
      done = true; input.disabled = true; submit.disabled = true;
      playSfx('correct');
      const earned = recordWin('careerSpotle', Math.max(150, 420 - (tries - 1) * 50));
      feedbackEl.classList.remove('hidden', 'bad'); feedbackEl.classList.add('good');
      feedbackEl.textContent = `Solved in ${tries}/6! It's ${target.name} — +${earned} pts`;
      newBtn.classList.remove('hidden');
    } else if (tries >= 6) {
      done = true; input.disabled = true; submit.disabled = true;
      playSfx('wrong');
      resetStreak();
      feedbackEl.classList.remove('hidden', 'good'); feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Out of tries! The hidden career was ${target.name} (${target.sector}).`;
      newBtn.classList.remove('hidden');
    } else {
      playSfx('click');
    }
  }

  input.addEventListener('input', () => { selectedCareer = null; renderDropdown(input.value); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitGuess(); } });
  submit.addEventListener('click', submitGuess);
  newBtn.addEventListener('click', () => { playSfx('click'); startNew(); });
  startNew();
}

// ---------- 4. DAY-IN-THE-LIFE DETECTIVE ----------
function initDayInLife() {
  let pool = [], target = null, clueIdx = 0, pts = 300, locked = false;

  const ptsEl = document.getElementById('day-pts');
  const cluesEl = document.getElementById('day-clues');
  const hintBtn = document.getElementById('day-hint-btn');
  const optionsEl = document.getElementById('day-options');
  const feedbackEl = document.getElementById('day-feedback');
  const nextBtn = document.getElementById('day-next');

  function renderClues() {
    const labels = ['Workplace Problem', 'Stakeholders', 'Daily Deliverable'];
    cluesEl.innerHTML = target.clues
      .slice(0, clueIdx + 1)
      .map((text, i) => `<div class="quote-block"><strong>Clue ${i + 1} (${labels[i]}):</strong> ${escapeHtml(text)}</div>`)
      .join('');
  }

  function nextRound() {
    locked = false; clueIdx = 0; pts = 300;
    if (pool.length < 4) pool = shuffle(CAREERS);
    target = pool.pop();
    const decoys = shuffle(CAREERS.filter((c) => c.name !== target.name)).slice(0, 3);

    ptsEl.textContent = '+300 PTS';
    hintBtn.disabled = false;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    optionsEl.innerHTML = '';
    renderClues();

    shuffle([target, ...decoys]).forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = `${c.emoji} ${c.name}`;
      btn.dataset.name = c.name;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        clueIdx = 2; renderClues();
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.name === target.name) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (c.name === target.name) {
          playSfx('correct');
          const earned = recordWin('careerDay', pts);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Case closed! That's a ${target.name} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That workday belongs to a ${target.name}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  hintBtn.addEventListener('click', () => {
    if (locked || clueIdx >= 2) return;
    playSfx('click');
    clueIdx += 1;
    pts = Math.max(150, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    renderClues();
    if (clueIdx >= 2) hintBtn.disabled = true;
  });

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'salary') initSalary();
  if (mode === 'tools') initTools();
  if (mode === 'spotle') initSpotle();
  if (mode === 'day') initDayInLife();
});
