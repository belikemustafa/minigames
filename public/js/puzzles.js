import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, showToast,
} from './core.js';
import { CONNECTIONS_PUZZLES, TIMELINE_SETS, SLIDER_ITEMS } from './data/puzzlesData.js';

initChrome('puzzles');

// ---------- 1. CONNECTIONS (4x4 Grouping) ----------
function initConnections() {
  let puzzle = null, remaining = [], solvedGroups = [], selected = new Set(), mistakes = 4, done = false;

  const packSel = document.getElementById('conn-pack');
  const dotsEl = document.getElementById('conn-dots');
  const solvedEl = document.getElementById('conn-solved');
  const gridEl = document.getElementById('conn-grid');
  const shuffleBtn = document.getElementById('conn-shuffle');
  const submitBtn = document.getElementById('conn-submit');
  const feedbackEl = document.getElementById('conn-feedback');
  const resetBtn = document.getElementById('conn-reset');

  function renderDots() {
    dotsEl.innerHTML = Array.from({ length: 4 }, (_, i) =>
      `<span class="mistake-dot${i >= mistakes ? ' used' : ''}"></span>`
    ).join('');
  }

  function renderBoard() {
    solvedEl.innerHTML = solvedGroups
      .map((g) => `<div class="conn-solved-bar conn-tier-${g.tier}">${escapeHtml(g.name)}<span>${escapeHtml(g.words.join(' • '))}</span></div>`)
      .join('');

    gridEl.innerHTML = '';
    remaining.forEach((word) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `conn-tile${selected.has(word) ? ' selected' : ''}`;
      btn.textContent = word;
      btn.disabled = done;
      btn.addEventListener('click', () => {
        if (done) return;
        playSfx('click');
        if (selected.has(word)) selected.delete(word);
        else if (selected.size < 4) selected.add(word);
        renderBoard();
      });
      gridEl.appendChild(btn);
    });

    submitBtn.textContent = `Submit Group (${selected.size}/4)`;
    submitBtn.disabled = done || selected.size !== 4;
    renderDots();
  }

  function loadPuzzle(idx) {
    puzzle = CONNECTIONS_PUZZLES[idx] || CONNECTIONS_PUZZLES[0];
    solvedGroups = [];
    selected.clear();
    mistakes = 4;
    done = false;
    remaining = shuffle(puzzle.groups.flatMap((g) => g.words));
    feedbackEl.classList.add('hidden');
    resetBtn.classList.add('hidden');
    renderBoard();
  }

  submitBtn.addEventListener('click', () => {
    if (done || selected.size !== 4) return;
    const picked = Array.from(selected);

    let matched = null;
    let oneAway = false;
    puzzle.groups.forEach((g, tier) => {
      const overlap = picked.filter((w) => g.words.includes(w)).length;
      if (overlap === 4) matched = { ...g, tier };
      else if (overlap === 3) oneAway = true;
    });

    if (matched) {
      playSfx('correct');
      solvedGroups.push(matched);
      remaining = remaining.filter((w) => !matched.words.includes(w));
      selected.clear();
      if (solvedGroups.length === 4) {
        done = true;
        const earned = recordWin('puzConn', 320);
        feedbackEl.classList.remove('hidden', 'bad');
        feedbackEl.classList.add('good');
        feedbackEl.textContent = `Puzzle solved with ${mistakes} lives left! +${earned} pts`;
        resetBtn.classList.remove('hidden');
      }
      renderBoard();
    } else {
      playSfx('wrong');
      mistakes -= 1;
      if (mistakes <= 0) {
        done = true;
        resetStreak();
        puzzle.groups.forEach((g, tier) => {
          if (!solvedGroups.some((s) => s.name === g.name)) solvedGroups.push({ ...g, tier });
        });
        remaining = [];
        selected.clear();
        feedbackEl.classList.remove('hidden', 'good');
        feedbackEl.classList.add('bad');
        feedbackEl.textContent = 'Out of lives! All 4 groups revealed above.';
        resetBtn.classList.remove('hidden');
      } else {
        showToast(oneAway ? 'So close — 1 word away!' : 'Not a matching group');
      }
      renderBoard();
    }
  });

  shuffleBtn.addEventListener('click', () => { playSfx('click'); remaining = shuffle(remaining); renderBoard(); });
  packSel.addEventListener('change', () => { playSfx('click'); loadPuzzle(Number(packSel.value)); });
  resetBtn.addEventListener('click', () => { playSfx('click'); loadPuzzle(Number(packSel.value)); });
  loadPuzzle(0);
}

// ---------- 2. TIMELINE SORT ----------
function initTimeline() {
  let setIdx = 0, order = [], selectedIdx = null, locked = false;
  const labelEl = document.getElementById('tl-pack-label');
  const listEl = document.getElementById('tl-list');
  const checkBtn = document.getElementById('tl-check');
  const feedbackEl = document.getElementById('tl-feedback');
  const nextBtn = document.getElementById('tl-next');

  function render(reveal = false) {
    listEl.innerHTML = '';
    const sortedYears = [...order].map((x) => x.year).sort((a, b) => a - b);
    order.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      let cls = 'timeline-item';
      if (!reveal && selectedIdx === i) cls += ' selected';
      if (reveal) cls += item.year === sortedYears[i] ? ' correct' : ' wrong';
      btn.className = cls;
      btn.disabled = locked;
      btn.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="timeline-rank">${i + 1}</span>
          <span>${escapeHtml(item.name)}</span>
        </div>
        <span class="timeline-year">${reveal ? item.year : '↕'}</span>`;
      btn.addEventListener('click', () => {
        if (locked) return;
        playSfx('click');
        if (selectedIdx === null) selectedIdx = i;
        else if (selectedIdx === i) selectedIdx = null;
        else {
          [order[selectedIdx], order[i]] = [order[i], order[selectedIdx]];
          selectedIdx = null;
        }
        render(false);
      });
      listEl.appendChild(btn);
    });
  }

  function loadSet() {
    const cur = TIMELINE_SETS[setIdx % TIMELINE_SETS.length];
    labelEl.textContent = cur.title;
    order = shuffle(cur.items);
    selectedIdx = null; locked = false;
    checkBtn.disabled = false;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    render(false);
  }

  checkBtn.addEventListener('click', () => {
    if (locked) return;
    locked = true; checkBtn.disabled = true;
    const sortedYears = [...order].map((x) => x.year).sort((a, b) => a - b);
    const exact = order.filter((item, i) => item.year === sortedYears[i]).length;
    render(true);
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (exact === order.length) {
      playSfx('correct');
      const earned = recordWin('puzTime', 280);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Perfect timeline (5/5)! +${earned} pts`;
    } else {
      playSfx('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `You placed ${exact}/5 in the exact spot. Years revealed above!`;
    }
    nextBtn.classList.remove('hidden');
  });

  nextBtn.addEventListener('click', () => { playSfx('click'); setIdx += 1; loadSet(); });
  loadSet();
}

// ---------- 3. YEAR SLIDER ----------
function initSlider() {
  let pool = [], current = null, locked = false;
  const catEl = document.getElementById('sl-cat');
  const emojiEl = document.getElementById('sl-emoji');
  const nameEl = document.getElementById('sl-name');
  const valEl = document.getElementById('sl-val');
  const input = document.getElementById('sl-input');
  const minEl = document.getElementById('sl-min'), maxEl = document.getElementById('sl-max');
  const submitBtn = document.getElementById('sl-submit');
  const feedbackEl = document.getElementById('sl-feedback');
  const nextBtn = document.getElementById('sl-next');

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(SLIDER_ITEMS);
    current = pool.pop();
    catEl.textContent = current.cat;
    emojiEl.textContent = current.emoji;
    nameEl.textContent = current.name;
    input.min = current.min; input.max = current.max;
    const mid = Math.round((current.min + current.max) / 2);
    input.value = mid; input.disabled = false;
    valEl.textContent = mid;
    minEl.textContent = current.min; maxEl.textContent = current.max;
    submitBtn.disabled = false;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
  }

  input.addEventListener('input', () => { valEl.textContent = input.value; });
  submitBtn.addEventListener('click', () => {
    if (locked || !current) return;
    locked = true; input.disabled = true; submitBtn.disabled = true;
    const guess = Number(input.value);
    const diff = Math.abs(guess - current.answer);
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (diff <= 3) {
      playSfx('correct');
      const pts = diff === 0 ? 300 : diff === 1 ? 240 : diff === 2 ? 190 : 140;
      const earned = recordWin('puzSlider', pts);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `${diff === 0 ? 'Exact year!' : `Off by ${diff} yr(s)!`} Answer: ${current.answer} (+${earned} pts) — ${current.fact}`;
    } else {
      playSfx('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Answer: ${current.answer} (off by ${diff} years). ${current.fact}`;
    }
    nextBtn.classList.remove('hidden');
  });

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 4. REACTION & MEMORY GRID ----------
function initMemory() {
  let gridSize = 3, sequence = [], userStep = 0, level = 0, accepting = false, playing = false;
  const btn3 = document.getElementById('mem-size-3'), btn4 = document.getElementById('mem-size-4');
  const levelEl = document.getElementById('mem-level');
  const tipEl = document.getElementById('mem-tip');
  const gridEl = document.getElementById('mem-grid');
  const startBtn = document.getElementById('mem-start');
  const feedbackEl = document.getElementById('mem-feedback');

  function buildGrid() {
    gridEl.className = `mem-grid size-${gridSize}`;
    gridEl.innerHTML = '';
    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mem-cell';
      cell.dataset.idx = i;
      cell.addEventListener('click', () => handleTap(i, cell));
      gridEl.appendChild(cell);
    }
  }

  function flashCell(idx, ms) {
    return new Promise((resolve) => {
      const cell = gridEl.querySelector(`[data-idx="${idx}"]`);
      if (!cell) return resolve();
      cell.classList.add('lit');
      playSfx('click');
      setTimeout(() => {
        cell.classList.remove('lit');
        setTimeout(resolve, 130);
      }, ms);
    });
  }

  async function nextLevel() {
    accepting = false;
    userStep = 0;
    level += 1;
    levelEl.textContent = level;
    tipEl.textContent = `Level ${level} — Watch closely...`;
    sequence.push(Math.floor(Math.random() * (gridSize * gridSize)));

    const speed = Math.max(210, 520 - level * 28);
    await new Promise((r) => setTimeout(r, 420));
    for (const idx of sequence) {
      if (!playing) return;
      await flashCell(idx, speed);
    }
    if (!playing) return;
    tipEl.textContent = `Your turn! Repeat all ${sequence.length} tiles.`;
    accepting = true;
  }

  function handleTap(idx, cell) {
    if (!accepting || !playing) return;
    if (idx === sequence[userStep]) {
      cell.classList.add('lit');
      playSfx('click');
      setTimeout(() => cell.classList.remove('lit'), 180);
      userStep += 1;
      if (userStep === sequence.length) {
        accepting = false;
        playSfx('correct');
        recordWin(null, 80);
        recordBestValue('puzMem', level);
        nextLevel();
      }
    } else {
      accepting = false;
      playing = false;
      cell.classList.add('wrong');
      playSfx('wrong');
      resetStreak();
      setTimeout(() => cell.classList.remove('wrong'), 450);
      feedbackEl.classList.remove('hidden', 'good');
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Sequence broken at Level ${level}! Tap Start Sequence to beat your record.`;
      startBtn.disabled = false;
      startBtn.textContent = 'Play Again ⚡';
    }
  }

  function startGame() {
    playing = true;
    sequence = []; level = 0; userStep = 0;
    feedbackEl.classList.add('hidden');
    startBtn.disabled = true;
    nextLevel();
  }

  btn3.addEventListener('click', () => { playSfx('click'); playing = false; accepting = false; gridSize = 3; btn3.classList.add('active'); btn4.classList.remove('active'); startBtn.disabled = false; buildGrid(); });
  btn4.addEventListener('click', () => { playSfx('click'); playing = false; accepting = false; gridSize = 4; btn4.classList.add('active'); btn3.classList.remove('active'); startBtn.disabled = false; buildGrid(); });
  startBtn.addEventListener('click', startGame);
  buildGrid();
}

setupModeTabs((mode) => {
  if (mode === 'connections') initConnections();
  if (mode === 'timeline') initTimeline();
  if (mode === 'slider') initSlider();
  if (mode === 'memory') initMemory();
});
