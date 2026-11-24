import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, preloadImage, animateNumber, triggerFlash,
} from './core.js';

initChrome('cartoons');

async function fetchCartoonPool(era = 'all') {
  const res = await fetch(`/api/cartoons/pool?era=${encodeURIComponent(era)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY) or run "npx wrangler pages dev public" to load TMDB cartoon frames.'
        : data.error || 'Could not load cartoons.'
    );
  }
  return shuffle(data.cartoons || []);
}

// ---------- 1. CARTOON FRAME UNBLUR (Era Filter + 4/6 Options!) ----------
function initCartoonUnblur() {
  let pool = [], target = null, hintsUsed = 0, pts = 300, locked = true, token = 0, choiceCount = 4;

  const eraSel = document.getElementById('ct-era');
  const btnOpt4 = document.getElementById('ct-opt-4');
  const btnOpt6 = document.getElementById('ct-opt-6');
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
    locked = true; hintsUsed = 0;
    pts = choiceCount === 6 ? 360 : 300;
    ptsEl.textContent = `+${pts} PTS`;
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
      if (pool.length < choiceCount + 2) pool = await fetchCartoonPool(eraSel.value);
      if (t !== token) return;
      if (pool.length < choiceCount) throw new Error('Not enough cartoons returned.');

      target = pool.pop();
      const decoys = shuffle(pool.filter((c) => c.id !== target.id)).slice(0, choiceCount - 1);
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
    triggerFlash(imgEl.parentElement, 'lens-sweep');
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

  eraSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); startRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); startRound(); });
  hintBtn.addEventListener('click', () => {
    if (locked || !target || hintsUsed >= 2) return;
    playSfx('reveal');
    triggerFlash(imgEl.parentElement, 'lens-sweep');
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

// ---------- 2. CARTOON SCORE / ERA / POPULARITY DUEL ----------
function initCartoonDuel() {
  const META = {
    rating:     { label: 'RATING',     tip: 'higher or lower viewer rating?', fmt: (v) => v.toFixed(1) },
    year:       { label: 'PREMIERED',  tip: 'newer (higher year) or older (lower year) premiere?', fmt: (v) => String(v) },
    popularity: { label: 'POPULARITY', tip: 'higher or lower TMDB popularity score?', fmt: (v) => String(v) },
  };
  let metric = 'rating', pool = [], left = null, right = null, run = 0, locked = true, token = 0, timer = null;

  const eraSel = document.getElementById('ct-duel-era');
  const tipEl = document.getElementById('ct-duel-tip');
  const runEl = document.getElementById('ct-duel-run');
  const loader = document.getElementById('ct-duel-loader');
  const lImg = document.getElementById('ct-l-img'), lMeta = document.getElementById('ct-l-meta'), lTitle = document.getElementById('ct-l-title'), lLabel = document.getElementById('ct-l-label'), lVal = document.getElementById('ct-l-val');
  const rImg = document.getElementById('ct-r-img'), rMeta = document.getElementById('ct-r-meta'), rTitle = document.getElementById('ct-r-title'), rLabel = document.getElementById('ct-r-label'), rVal = document.getElementById('ct-r-val');
  const controls = document.getElementById('ct-duel-controls');
  const btnHi = document.getElementById('ct-btn-higher'), btnLo = document.getElementById('ct-btn-lower');
  const statusEl = document.getElementById('ct-duel-status');
  const restartBtn = document.getElementById('ct-duel-restart');

  function draw(ex) {
    const i = pool.findIndex((c) => c.id !== ex);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showR = false) {
    const m = META[metric];
    lImg.src = left.image; lTitle.textContent = left.title; lMeta.textContent = metric === 'year' ? `★ ${left.rating}` : `Premiered ${left.year}`;
    lLabel.textContent = m.label; lVal.textContent = m.fmt(left[metric]);
    rImg.src = right.image; rTitle.textContent = right.title; rMeta.textContent = metric === 'year' ? `★ ${right.rating}` : `Premiered ${right.year}`;
    rLabel.textContent = m.label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      if (metric === 'rating') animateNumber(rVal, 0, right.rating, { duration: 450, decimals: 1 });
      else if (metric === 'year') animateNumber(rVal, 1970, right.year, { duration: 450 });
      else animateNumber(rVal, 0, right.popularity, { duration: 450, locale: true });
    } else {
      rVal.textContent = '???';
    }
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
    tipEl.textContent = `Does the right-hand cartoon have a ${META[metric].tip}`;

    try {
      if (pool.length < 8) pool = await fetchCartoonPool(eraSel.value);
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
    const lv = left[metric], rv = right[metric];
    const ok = (dir === 'higher' && rv >= lv) || (dir === 'lower' && rv <= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('cartoonDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Nice! ${right.title}: ${META[metric].fmt(rv)}`;
      timer = setTimeout(async () => {
        if (t !== token) return;
        left = right;
        if (pool.length < 2) { try { pool = await fetchCartoonPool(eraSel.value); } catch {} }
        right = draw(left.id);
        if (!right) return startDuel();
        await preloadImage(right.image, 5000);
        if (t !== token) return;
        render(false);
        triggerFlash(rVal.closest('.duel-arena'), 'duel-shift');
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${right.title}: ${META[metric].fmt(rv)}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  eraSel.addEventListener('change', () => { playSfx('click'); pool = []; startDuel(); });
  document.querySelectorAll('[data-ctmetric]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      metric = b.dataset.ctmetric;
      document.querySelectorAll('[data-ctmetric]').forEach((x) => x.classList.toggle('active', x === b));
      startDuel();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

setupModeTabs((mode) => {
  if (mode === 'unblur') initCartoonUnblur();
  if (mode === 'duel') initCartoonDuel();
});
