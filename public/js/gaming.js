import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, animateNumber, triggerFlash,
} from './core.js';
import { VIDEO_GAMES, GAME_IDS, STUDIO_MATCHES } from './data/gamingData.js';

initChrome('gaming');

// ---------- 1. SALES & SCORE SHOWDOWN ----------
function initGameDuel() {
  const META = {
    sales: { label: 'COPIES SOLD', tip: 'sell MORE or FEWER copies worldwide?', suf: 'M', dec: 1 },
    score: { label: 'METACRITIC',  tip: 'earn a higher or lower critic score?', suf: '/100', dec: 0 },
    year:  { label: 'RELEASED',    tip: 'launch NEWER (higher year) or OLDER?', suf: '', dec: 0 },
  };
  let metric = 'sales', pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const runEl = document.getElementById('gm-run'), tipEl = document.getElementById('gm-tip');
  const lEmoji = document.getElementById('gm-l-emoji'), lName = document.getElementById('gm-l-name'), lMeta = document.getElementById('gm-l-meta'), lLabel = document.getElementById('gm-l-label'), lVal = document.getElementById('gm-l-val');
  const rEmoji = document.getElementById('gm-r-emoji'), rName = document.getElementById('gm-r-name'), rMeta = document.getElementById('gm-r-meta'), rLabel = document.getElementById('gm-r-label'), rVal = document.getElementById('gm-r-val');
  const controls = document.getElementById('gm-controls'), btnHi = document.getElementById('gm-hi'), btnLo = document.getElementById('gm-lo');
  const statusEl = document.getElementById('gm-status'), restartBtn = document.getElementById('gm-restart');

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(VIDEO_GAMES);
    const i = pool.findIndex((g) => g.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    const m = META[metric];
    const fmt = (v) => `${m.dec && !Number.isInteger(v) ? v.toFixed(1) : v}${m.suf}`;
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lMeta.textContent = `${left.studio} • ${left.platform}`;
    lLabel.textContent = m.label; lVal.textContent = fmt(left[metric]);
    rEmoji.textContent = right.emoji; rName.textContent = right.name; rMeta.textContent = `${right.studio} • ${right.platform}`;
    rLabel.textContent = m.label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      const dec = m.dec && !Number.isInteger(right[metric]) ? 1 : 0;
      animateNumber(rVal, metric === 'year' ? 1984 : 0, right[metric], { duration: 450, decimals: dec, suffix: m.suf });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Did the right-hand game ${META[metric].tip}`;
    pool = shuffle(VIDEO_GAMES);
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
      recordBestValue('gameDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `GG! ${right.name}: ${right[metric]}${META[metric].suf}`;
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
      statusEl.textContent = `Game Over! ${right.name}: ${right[metric]}${META[metric].suf}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  document.querySelectorAll('[data-gmmetric]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      metric = b.dataset.gmmetric;
      document.querySelectorAll('[data-gmmetric]').forEach((x) => x.classList.toggle('active', x === b));
      startRun();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  startRun();
}

// ---------- 2. MAP, WEAPON & BOSS ID ----------
function initGameId() {
  const ALL_TITLES = [...new Set(GAME_IDS.map((x) => x.answer))];
  let pool = [], current = null, hintUsed = false, locked = false, choiceCount = 4;

  const kindSel = document.getElementById('gi-kind');
  const opt4 = document.getElementById('gi-opt-4'), opt6 = document.getElementById('gi-opt-6');
  const ptsEl = document.getElementById('gi-pts'), badgeEl = document.getElementById('gi-badge'), clueEl = document.getElementById('gi-clue');
  const hintBtn = document.getElementById('gi-hint-btn'), hintBox = document.getElementById('gi-hint-box');
  const optionsEl = document.getElementById('gi-options'), feedbackEl = document.getElementById('gi-feedback'), nextBtn = document.getElementById('gi-next');

  function getFiltered() {
    const k = kindSel.value;
    return k === 'all' ? GAME_IDS : GAME_IDS.filter((g) => g.kind === k);
  }

  function nextRound() {
    locked = false; hintUsed = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    const base = choiceCount === 6 ? 280 : 220;
    ptsEl.textContent = `+${base} PTS`;
    badgeEl.textContent = current.kind.toUpperCase();
    clueEl.textContent = current.clue;
    hintBtn.disabled = false;
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    optionsEl.innerHTML = '';

    const decoys = shuffle(ALL_TITLES.filter((t) => t !== current.answer)).slice(0, choiceCount - 1);
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
          const earned = recordWin('gameId', hintUsed ? base - 60 : base);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Achievement unlocked! ${current.clue} is from ${current.answer} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `${current.clue} belongs to ${current.answer}.`;
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
  kindSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); nextRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 3. STUDIO MATCH ----------
function initStudio() {
  const ALL_STUDIOS = [...new Set(STUDIO_MATCHES.map((s) => s.studio))];
  let pool = [], current = null, locked = false, choiceCount = 4;

  const opt4 = document.getElementById('gs-opt-4'), opt6 = document.getElementById('gs-opt-6');
  const gameEl = document.getElementById('gs-game'), optionsEl = document.getElementById('gs-options');
  const feedbackEl = document.getElementById('gs-feedback'), nextBtn = document.getElementById('gs-next');

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(STUDIO_MATCHES);
    current = pool.pop();
    gameEl.textContent = current.game;
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    const decoys = shuffle(ALL_STUDIOS.filter((s) => s !== current.studio)).slice(0, choiceCount - 1);
    shuffle([current.studio, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.studio) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.studio) {
          playSfx('correct');
          const earned = recordWin('gameStudio', choiceCount === 6 ? 250 : 190);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Correct! ${current.game} was built by ${current.studio} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `${current.game} was developed by ${current.studio}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); nextRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'duel') initGameDuel();
  if (mode === 'id') initGameId();
  if (mode === 'studio') initStudio();
});
