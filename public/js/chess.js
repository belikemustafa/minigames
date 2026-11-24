import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, animateNumber, triggerFlash, burstMilestone,
} from './core.js';
import { CHESS_PUZZLES, CHESS_GMS } from './data/chessData.js';

initChrome('chess');

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function parseFen(fen) {
  const board = [];
  fen.split('/').forEach((row) => {
    const r = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) r.push('');
      } else {
        r.push(ch);
      }
    }
    board.push(r);
  });
  return board;
}

function sqName(r, c) { return `${FILES[c]}${8 - r}`; }
function sqCoords(name) { return { r: 8 - Number(name[1]), c: FILES.indexOf(name[0]) }; }

// ---------- 1. MATE-IN-1 & TACTICAL FORK BLITZ (Interactive 8x8 Board) ----------
function initTactics() {
  let pool = [], current = null, board = [], selectedSq = null, locked = false, hintShown = false;

  const filterSel = document.getElementById('ch-filter');
  const typeEl = document.getElementById('ch-type'), titleEl = document.getElementById('ch-title'), turnEl = document.getElementById('ch-turn');
  const hintBtn = document.getElementById('ch-hint-btn');
  const boardEl = document.getElementById('ch-board');
  const feedbackEl = document.getElementById('ch-feedback');
  const nextBtn = document.getElementById('ch-next');

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? CHESS_PUZZLES : CHESS_PUZZLES.filter((p) => p.type === f);
  }

  function renderBoard(mark = {}) {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = sqName(r, c);
        const piece = board[r][c];
        const btn = document.createElement('button');
        btn.type = 'button';
        let cls = `chess-sq ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        if (selectedSq === sq) cls += ' selected';
        if (hintShown && sq === current.from && !locked) cls += ' hint-from';
        if (mark.good === sq) cls += ' good-sq';
        if (mark.bad === sq) cls += ' bad-sq';
        btn.className = cls;
        btn.dataset.sq = sq;
        btn.textContent = PIECE_UNICODE[piece] || '';
        if (r === 7 || c === 7) {
          const coord = document.createElement('span');
          coord.className = 'chess-coord';
          coord.textContent = r === 7 && c === 7 ? 'h1' : r === 7 ? FILES[c] : String(8 - r);
          btn.appendChild(coord);
        }
        btn.addEventListener('click', () => onSquareTap(sq, piece));
        boardEl.appendChild(btn);
      }
    }
  }

  function isOwnPiece(piece) {
    if (!piece) return false;
    return current.turn === 'White' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
  }

  function onSquareTap(sq, piece) {
    if (locked || !current) return;
    if (!selectedSq) {
      if (isOwnPiece(piece)) {
        playSfx('click');
        selectedSq = sq;
        renderBoard();
      }
      return;
    }
    if (sq === selectedSq) {
      selectedSq = null;
      renderBoard();
      return;
    }
    if (isOwnPiece(piece)) {
      playSfx('click');
      selectedSq = sq;
      renderBoard();
      return;
    }

    // Attempt move from selectedSq -> sq
    if (selectedSq === current.from && sq === current.to) {
      locked = true;
      hintBtn.disabled = true;
      const fromC = sqCoords(selectedSq), toC = sqCoords(sq);
      board[toC.r][toC.c] = board[fromC.r][fromC.c];
      board[fromC.r][fromC.c] = '';
      selectedSq = null;
      renderBoard({ good: sq });
      playSfx('correct');
      const earned = recordWin('chessTactics', hintShown ? 180 : 250);
      feedbackEl.classList.remove('hidden', 'bad');
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Brilliant! ${current.note} (+${earned} pts)`;
      nextBtn.classList.remove('hidden');
    } else {
      playSfx('wrong');
      resetStreak();
      renderBoard({ bad: sq });
      feedbackEl.classList.remove('hidden', 'good');
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Not quite (${selectedSq} → ${sq}). Try another move or tap Highlight Piece!`;
      selectedSq = null;
    }
  }

  function nextPuzzle() {
    locked = false; selectedSq = null; hintShown = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    board = parseFen(current.fen);
    typeEl.textContent = current.type;
    titleEl.textContent = current.title;
    turnEl.textContent = `${current.turn} to Move`;
    hintBtn.disabled = false;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    renderBoard();
  }

  hintBtn.addEventListener('click', () => {
    if (locked || hintShown) return;
    playSfx('reveal');
    hintShown = true;
    hintBtn.disabled = true;
    renderBoard();
  });
  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextPuzzle(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextPuzzle(); });
  nextPuzzle();
}

// ---------- 2. COORDINATE & KNIGHT SPRINT ----------
function initSprint() {
  let sMode = 'coord'; // 'coord' | 'knight'
  let running = false, hits = 0, timeLeft = 30, timer = null, targetSq = '';
  let knightPos = null, movesTaken = 0;

  const btnCoord = document.getElementById('sp-mode-coord');
  const btnKnight = document.getElementById('sp-mode-knight');
  const labelEl = document.getElementById('cs-prompt-label');
  const targetEl = document.getElementById('cs-target');
  const statA = document.getElementById('cs-stat-a');
  const statB = document.getElementById('cs-stat-b');
  const boardEl = document.getElementById('cs-board');
  const startBtn = document.getElementById('cs-start');
  const feedbackEl = document.getElementById('cs-feedback');

  function randSq(exclude = '') {
    let s = '';
    do { s = FILES[Math.floor(Math.random() * 8)] + (Math.floor(Math.random() * 8) + 1); } while (s === exclude);
    return s;
  }

  function isKnightMove(a, b) {
    const c1 = sqCoords(a), c2 = sqCoords(b);
    const dr = Math.abs(c1.r - c2.r), dc = Math.abs(c1.c - c2.c);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  }

  function renderBoard(flashSq = '', flashType = '') {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = sqName(r, c);
        const btn = document.createElement('button');
        btn.type = 'button';
        let cls = `chess-sq ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        if (sMode === 'knight' && sq === targetSq) cls += ' target-sq';
        if (sMode === 'knight' && knightPos && isKnightMove(knightPos, sq) && running) cls += ' legal';
        if (sq === flashSq && flashType) cls += ` ${flashType}`;
        btn.className = cls;

        if (sMode === 'knight' && sq === knightPos) btn.textContent = '♘';
        else if (sMode === 'knight' && sq === targetSq) btn.textContent = '★';

        // Show subtle coordinates only in Knight mode (hidden in Coordinate sprint!)
        if (sMode === 'knight' && (r === 7 || c === 7)) {
          const coord = document.createElement('span');
          coord.className = 'chess-coord';
          coord.textContent = r === 7 && c === 7 ? 'h1' : r === 7 ? FILES[c] : String(8 - r);
          btn.appendChild(coord);
        }
        btn.addEventListener('click', () => handleTap(sq));
        boardEl.appendChild(btn);
      }
    }
  }

  function handleTap(sq) {
    if (!running) return;
    if (sMode === 'coord') {
      if (sq === targetSq) {
        hits += 1;
        playSfx('correct');
        recordWin(null, 40);
        statA.textContent = `Hits: ${hits}`;
        targetSq = randSq(targetSq);
        targetEl.textContent = targetSq;
        renderBoard(sq, 'good-sq');
      } else {
        playSfx('wrong');
        renderBoard(sq, 'bad-sq');
      }
    } else {
      if (!isKnightMove(knightPos, sq)) return;
      playSfx('click');
      knightPos = sq;
      movesTaken += 1;
      statB.textContent = `Moves: ${movesTaken}`;
      if (knightPos === targetSq) {
        hits += 1;
        playSfx('correct');
        const earned = recordWin('chessSprint', Math.max(60, 180 - movesTaken * 20));
        statA.textContent = `Stars: ${hits}`;
        feedbackEl.classList.remove('hidden', 'bad');
        feedbackEl.classList.add('good');
        feedbackEl.textContent = `Captured ★ on ${targetSq} in ${movesTaken} hop${movesTaken > 1 ? 's' : ''}! (+${earned} pts)`;
        movesTaken = 0;
        statB.textContent = 'Moves: 0';
        targetSq = randSq(knightPos);
        targetEl.textContent = `Hop to ${targetSq}`;
        renderBoard(sq, 'good-sq');
      } else {
        renderBoard();
      }
    }
  }

  function startSprint() {
    clearInterval(timer);
    running = true; hits = 0; movesTaken = 0;
    feedbackEl.classList.add('hidden');
    if (sMode === 'coord') {
      timeLeft = 30;
      labelEl.textContent = 'TAP SQUARE';
      targetSq = randSq();
      targetEl.textContent = targetSq;
      statA.textContent = 'Hits: 0';
      statB.textContent = '30s';
      startBtn.disabled = true;
      renderBoard();
      timer = setInterval(() => {
        timeLeft -= 1;
        statB.textContent = `${Math.max(0, timeLeft)}s`;
        if (timeLeft <= 0) {
          clearInterval(timer);
          running = false;
          startBtn.disabled = false;
          startBtn.textContent = 'Run 30s Sprint Again ⚡';
          recordBestValue('chessSprint', hits * 20);
          playSfx('fanfare');
          if (hits >= 12) burstMilestone(`♟️ ${hits} HITS!`);
          feedbackEl.classList.remove('hidden', 'bad');
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Time's up! You nailed ${hits} board coordinates in 30 seconds.`;
        }
      }, 1000);
    } else {
      labelEl.textContent = 'KNIGHT HOP';
      knightPos = 'b1';
      targetSq = randSq(knightPos);
      targetEl.textContent = `Hop to ${targetSq}`;
      statA.textContent = 'Stars: 0';
      statB.textContent = 'Moves: 0';
      startBtn.textContent = 'Reset Knight Board ↻';
      startBtn.disabled = false;
      renderBoard();
    }
  }

  btnCoord.addEventListener('click', () => {
    playSfx('click'); clearInterval(timer); running = false; sMode = 'coord';
    btnCoord.classList.add('active'); btnKnight.classList.remove('active');
    startBtn.disabled = false; startBtn.textContent = 'Start 30s Coordinate Sprint ⚡';
    targetEl.textContent = 'Ready'; statA.textContent = 'Hits: 0'; statB.textContent = '30s';
    feedbackEl.classList.add('hidden');
    renderBoard();
  });
  btnKnight.addEventListener('click', () => {
    playSfx('click'); clearInterval(timer); sMode = 'knight';
    btnKnight.classList.add('active'); btnCoord.classList.remove('active');
    startSprint();
  });
  startBtn.addEventListener('click', () => { playSfx('click'); startSprint(); });
  renderBoard();
}

// ---------- 3. GRANDMASTER RATING DUEL (Peak FIDE + Live Chess.com API Blitz) ----------
function initGmDuel() {
  let mode = 'peak', pool = [], left = null, right = null, run = 0, locked = false, timer = null;
  const liveBlitzCache = new Map();

  const btnPeak = document.getElementById('cgm-peak'), btnBlitz = document.getElementById('cgm-blitz');
  const tipEl = document.getElementById('cgm-tip'), runEl = document.getElementById('gm-ch-run'), loader = document.getElementById('cgm-loader');
  const lName = document.getElementById('cgm-l-name'), lNote = document.getElementById('cgm-l-note'), lLabel = document.getElementById('cgm-l-label'), lVal = document.getElementById('cgm-l-val');
  const rName = document.getElementById('cgm-r-name'), rNote = document.getElementById('cgm-r-note'), rLabel = document.getElementById('cgm-r-label'), rVal = document.getElementById('cgm-r-val');
  const controls = document.getElementById('cgm-controls'), btnHi = document.getElementById('cgm-hi'), btnLo = document.getElementById('cgm-lo');
  const statusEl = document.getElementById('cgm-status'), restartBtn = document.getElementById('cgm-restart');

  async function fetchLiveBlitz(gm) {
    if (!gm.username) return null;
    if (liveBlitzCache.has(gm.username)) return liveBlitzCache.get(gm.username);
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${gm.username}/stats`);
      if (res.ok) {
        const j = await res.json();
        const r = j?.chess_blitz?.last?.rating || j?.chess_blitz?.best?.rating || null;
        if (r) { liveBlitzCache.set(gm.username, r); return r; }
      }
    } catch {}
    return null;
  }

  async function buildPool() {
    if (mode === 'peak') return shuffle(CHESS_GMS.map((g) => ({ ...g, rating: g.peak })));
    loader.classList.remove('hidden');
    const online = CHESS_GMS.filter((g) => g.username);
    const enriched = await Promise.all(
      online.map(async (g) => {
        const live = await fetchLiveBlitz(g);
        return { ...g, rating: live || (g.peak + 280) };
      })
    );
    loader.classList.add('hidden');
    return shuffle(enriched);
  }

  function draw(ex) {
    const i = pool.findIndex((g) => g.name !== ex);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showR = false) {
    const label = mode === 'peak' ? 'PEAK FIDE' : 'CHESS.COM BLITZ';
    lName.textContent = left.name; lNote.textContent = `${left.country} — ${left.note}`;
    lLabel.textContent = label; lVal.textContent = left.rating;
    rName.textContent = right.name; rNote.textContent = `${right.country} — ${right.note}`;
    rLabel.textContent = label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) animateNumber(rVal, 2000, right.rating, { duration: 460 });
    else rVal.textContent = '???';
  }

  async function startRun() {
    clearTimeout(timer);
    locked = true; run = 0; runEl.textContent = '0';
    tipEl.textContent = mode === 'peak'
      ? 'Does the right-hand Grandmaster hold a higher or lower peak FIDE rating?'
      : 'Live Chess.com Blitz ratings — who is rated higher right now?';
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;

    pool = await buildPool();
    left = draw(null); right = draw(left.name);
    render(false);
    btnHi.disabled = false; btnLo.disabled = false;
    locked = false;
  }

  function pick(dir) {
    if (locked) return;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const ok = (dir === 'higher' && right.rating >= left.rating) || (dir === 'lower' && right.rating <= left.rating);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('chessGm', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Checkmate! ${right.name}: ${right.rating} Elo`;
      timer = setTimeout(async () => {
        if (pool.length < 2) pool = await buildPool();
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
      statusEl.textContent = `Blunder! ${right.name}: ${right.rating} Elo. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  btnPeak.addEventListener('click', () => { playSfx('click'); mode = 'peak'; btnPeak.classList.add('active'); btnBlitz.classList.remove('active'); startRun(); });
  btnBlitz.addEventListener('click', () => { playSfx('click'); mode = 'blitz'; btnBlitz.classList.add('active'); btnPeak.classList.remove('active'); startRun(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

setupModeTabs((mode) => {
  if (mode === 'tactics') initTactics();
  if (mode === 'sprint') initSprint();
  if (mode === 'gm') initGmDuel();
});
