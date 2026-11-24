import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, preloadImage,
} from './core.js';
import { VOICE_ACTORS } from './data/cartoonsData.js';

initChrome('cartoons');

let sharedCartoonPool = [];

async function fetchCartoonPool() {
  if (sharedCartoonPool.length >= 10) return sharedCartoonPool;
  const res = await fetch('/api/cartoons/pool');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY) or run "npx wrangler pages dev public" to load TMDB cartoon frames.'
        : data.error || 'Could not load cartoons.'
    );
  }
  sharedCartoonPool = shuffle(data.cartoons || []);
  return sharedCartoonPool;
}

function initCartoonUnblur() {
  let pool = [], target = null, hintsUsed = 0, pts = 300, locked = true, token = 0;

  const imgEl = document.getElementById('ct-img');
  const loader = document.getElementById('ct-loader');
  const ptsEl = document.getElementById('ct-pts');
  const hintBtn = document.getElementById('ct-hint-btn');
  const hintBox = document.getElementById('ct-hint-box');
  const optionsEl = document.getElementById('ct-options');
  const feedbackEl = document.getElementById('ct-feedback');
  const nextBtn = document.getElementById('ct-next');

  function redact(text, title) {
    const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(esc, 'gi'), '[REDACTED]');
  }

  async function startRound() {
    const t = ++token;
    locked = true; hintsUsed = 0; pts = 300;
    ptsEl.textContent = '+300 PTS';
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Unblur & Premiere Year (-75 pts)';
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Loading cartoon frame...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'movie-img blur-3';

    try {
      if (pool.length < 6) {
        sharedCartoonPool = [];
        pool = shuffle([...await fetchCartoonPool()]);
      }
      if (t !== token) return;
      target = pool.pop();
      const decoys = shuffle(pool.filter((c) => c.id !== target.id)).slice(0, 3);
      await preloadImage(target.image);
      if (t !== token) return;

      imgEl.src = target.image;
      imgEl.className = 'movie-img blur-3 ready';
      loader.classList.add('hidden');

      shuffle([target, ...decoys]).forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = c.id;
        btn.textContent = c.title;
        btn.addEventListener('click', () => handleGuess(c, btn));
        optionsEl.appendChild(btn);
      });
      locked = false; hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = err.message || 'Could not load cartoons. Tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function handleGuess(sel, btnEl) {
    if (locked || !target) return;
    locked = true; hintBtn.disabled = true;
    imgEl.className = 'movie-img blur-0 ready';
    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === target.id) b.classList.add('correct');
    });
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (sel.id === target.id) {
      playSfx('correct');
      const earned = recordWin('cartoonUnblur', pts);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Spot on! "${target.title}" (${target.year}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `That frame is from "${target.title}" (${target.year}).`;
    }
    nextBtn.textContent = 'Next Cartoon →';
    nextBtn.classList.remove('hidden');
  }

  hintBtn.addEventListener('click', () => {
    if (locked || !target || hintsUsed >= 2) return;
    playSfx('click');
    hintsUsed += 1;
    pts = Math.max(100, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    hintBox.classList.remove('hidden');
    if (hintsUsed === 1) {
      imgEl.className = 'movie-img blur-2 ready';
      hintBox.innerHTML = `<strong>Clue 1:</strong> Premiered in <strong>${target.year}</strong> • ★ ${target.rating}`;
      hintBtn.textContent = '💡 Synopsis Clue & Unblur (-75 pts)';
    } else {
      imgEl.className = 'movie-img blur-1 ready';
      hintBox.innerHTML += `<br/><strong>Clue 2:</strong> "${escapeHtml(redact(target.overview, target.title).slice(0, 150))}..."`;
      hintBtn.disabled = true;
    }
  });

  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

function initCartoonDuel() {
  let mode = 'rating';
  let pool = [], left = null, right = null, run = 0, locked = true, token = 0, timer = null;

  const btnRate = document.getElementById('ct-duel-rating'), btnYear = document.getElementById('ct-duel-year');
  const tipEl = document.getElementById('ct-duel-tip');
  const runEl = document.getElementById('ct-duel-run');
  const loader = document.getElementById('ct-duel-loader');
  const lImg = document.getElementById('ct-l-img'), lMeta = document.getElementById('ct-l-meta'), lTitle = document.getElementById('ct-l-title'), lLabel = document.getElementById('ct-l-label'), lVal = document.getElementById('ct-l-val');
  const rImg = document.getElementById('ct-r-img'), rMeta = document.getElementById('ct-r-meta'), rTitle = document.getElementById('ct-r-title'), rLabel = document.getElementById('ct-r-label'), rVal = document.getElementById('ct-r-val');
  const controls = document.getElementById('ct-duel-controls');
  const btnHi = document.getElementById('ct-btn-higher'), btnLo = document.getElementById('ct-btn-lower');
  const statusEl = document.getElementById('ct-duel-status');
  const restartBtn = document.getElementById('ct-duel-restart');

  function draw(excludeId) {
    const i = pool.findIndex((c) => c.id !== excludeId);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showRight = false) {
    const label = mode === 'rating' ? 'RATING' : 'PREMIERED';
    lImg.src = left.image; lTitle.textContent = left.title; lMeta.textContent = mode === 'rating' ? `Premiered ${left.year}` : `★ ${left.rating}`;
    lLabel.textContent = label; lVal.textContent = mode === 'rating' ? left.rating.toFixed(1) : left.year;

    rImg.src = right.image; rTitle.textContent = right.title; rMeta.textContent = mode === 'rating' ? `Premiered ${right.year}` : `★ ${right.rating}`;
    rLabel.textContent = label;
    rVal.textContent = showRight ? (mode === 'rating' ? right.rating.toFixed(1) : right.year) : '???';
    rVal.classList.toggle('mystery', !showRight);
  }

  async function startDuel() {
    clearTimeout(timer);
    const t = ++token;
    locked = true; run = 0; runEl.textContent = '0';
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.textContent = 'Loading cartoons...';
    loader.classList.remove('hidden');
    tipEl.textContent = mode === 'rating'
      ? 'Does the right-hand cartoon have a higher or lower viewer rating?'
      : 'Did the right-hand cartoon premiere NEWER (higher year) or OLDER (lower year)?';

    try {
      if (pool.length < 8) pool = shuffle([...await fetchCartoonPool()]);
      if (t !== token) return;
      left = draw(null); right = draw(left?.id);
      if (!left || !right) throw new Error('Pool empty');
      await Promise.all([preloadImage(left.image, 6000), preloadImage(right.image, 6000)]);
      if (t !== token) return;
      render(false);
      loader.classList.add('hidden');
      btnHi.disabled = false; btnLo.disabled = false;
      locked = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = err.message || 'Could not load cartoons.';
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(dir) {
    if (locked || !left || !right) return;
    const t = token;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const lv = left[mode], rv = right[mode];
    const ok = (dir === 'higher' && rv >= lv) || (dir === 'lower' && rv <= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('cartoonDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Nice! ${right.title}: ${rv}`;
      timer = setTimeout(async () => {
        if (t !== token) return;
        left = right;
        if (pool.length < 2) { try { sharedCartoonPool = []; pool = shuffle([...await fetchCartoonPool()]); } catch {} }
        right = draw(left.id);
        if (!right) return startDuel();
        await preloadImage(right.image, 5000);
        if (t !== token) return;
        render(false);
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${right.title}: ${rv}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  btnRate.addEventListener('click', () => { playSfx('click'); mode = 'rating'; btnRate.classList.add('active'); btnYear.classList.remove('active'); startDuel(); });
  btnYear.addEventListener('click', () => { playSfx('click'); mode = 'year'; btnYear.classList.add('active'); btnRate.classList.remove('active'); startDuel(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

function initVoiceLink() {
  let pool = [], current = null, locked = false;

  const actorEl = document.getElementById('va-actor');
  const qEl = document.getElementById('va-question');
  const rolesEl = document.getElementById('va-roles');
  const optionsEl = document.getElementById('va-options');
  const feedbackEl = document.getElementById('va-feedback');
  const nextBtn = document.getElementById('va-next');

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(VOICE_ACTORS);
    current = pool.pop();
    actorEl.textContent = `🎙️ Voice Actor: ${current.actor}`;
    qEl.textContent = current.question;
    rolesEl.innerHTML = current.roles.map((r) => `<span class="tool-chip">${escapeHtml(r)}</span>`).join('');
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
          const earned = recordWin('cartoonVoice', 200);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Correct! ${current.answer} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `The answer was: ${current.answer}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'unblur') initCartoonUnblur();
  if (mode === 'duel') initCartoonDuel();
  if (mode === 'voice') initVoiceLink();
});
