import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, preloadImage, animateNumber, triggerFlash,
} from './core.js';

initChrome('tv');

async function fetchTvPool(region = 'all', mode = 'unblur') {
  const res = await fetch(`/api/tv/pool?region=${encodeURIComponent(region)}&mode=${encodeURIComponent(mode)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY) or run "npx wrangler pages dev public" to load TV series.'
        : data.error || 'Could not load TV shows.'
    );
  }
  return shuffle(data.shows || []);
}

// ---------- 1. SERIES FRAME UNBLUR ----------
function initTvUnblur() {
  let pool = [], target = null, hints = 0, pts = 300, locked = true, token = 0, choiceCount = 4;

  const regSel = document.getElementById('tv-region');
  const opt4 = document.getElementById('tv-opt-4'), opt6 = document.getElementById('tv-opt-6');
  const ptsEl = document.getElementById('tv-pts');
  const loader = document.getElementById('tv-loader'), imgEl = document.getElementById('tv-img');
  const hintBtn = document.getElementById('tv-hint-btn'), hintBox = document.getElementById('tv-hint-box');
  const optionsEl = document.getElementById('tv-options'), feedbackEl = document.getElementById('tv-feedback'), nextBtn = document.getElementById('tv-next');

  function redact(text, title) {
    const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(esc, 'gi'), '[REDACTED]');
  }

  async function startRound() {
    const t = ++token;
    locked = true; hints = 0; pts = choiceCount === 6 ? 360 : 300;
    ptsEl.textContent = `+${pts} PTS`;
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Unblur & Premiere Clue (-75 pts)';
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Loading series frame...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'movie-img blur-3';

    try {
      if (pool.length < choiceCount + 2) pool = await fetchTvPool(regSel.value, 'unblur');
      if (t !== token) return;
      if (pool.length < choiceCount) throw new Error('Not enough TV shows returned.');
      target = pool.pop();
      const decoys = shuffle(pool.filter((s) => s.id !== target.id)).slice(0, choiceCount - 1);
      await preloadImage(target.image);
      if (t !== token) return;

      imgEl.src = target.image;
      imgEl.className = 'movie-img blur-3 ready';
      loader.classList.add('hidden');

      shuffle([target, ...decoys]).forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = s.id;
        btn.textContent = s.title;
        btn.addEventListener('click', () => {
          if (locked) return;
          locked = true; hintBtn.disabled = true;
          imgEl.className = 'movie-img blur-0 ready';
          triggerFlash(imgEl.parentElement, 'lens-sweep');
          optionsEl.querySelectorAll('.option-btn').forEach((b) => {
            b.disabled = true;
            if (Number(b.dataset.id) === target.id) b.classList.add('correct');
          });
          feedbackEl.classList.remove('hidden', 'good', 'bad');
          if (s.id === target.id) {
            playSfx('correct');
            const earned = recordWin('tvUnblur', pts);
            feedbackEl.classList.add('good');
            feedbackEl.textContent = `Binge-worthy eye! "${target.title}" (${target.year}) — +${earned} pts`;
          } else {
            playSfx('wrong');
            btn.classList.add('wrong');
            resetStreak();
            feedbackEl.classList.add('bad');
            feedbackEl.textContent = `That still is from "${target.title}" (${target.year}).`;
          }
          nextBtn.textContent = 'Next Series →';
          nextBtn.classList.remove('hidden');
        });
        optionsEl.appendChild(btn);
      });
      locked = false; hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = err.message || 'Could not load TV series.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  hintBtn.addEventListener('click', () => {
    if (locked || !target || hints >= 2) return;
    playSfx('reveal');
    triggerFlash(imgEl.parentElement, 'lens-sweep');
    hints += 1; pts = Math.max(100, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    hintBox.classList.remove('hidden');
    if (hints === 1) {
      imgEl.className = 'movie-img blur-2 ready';
      hintBox.innerHTML = `<strong>Clue 1:</strong> Premiered <strong>${target.year}</strong> • TMDB ★ ${target.rating}`;
      hintBtn.textContent = '💡 Plot Clue & Unblur (-75 pts)';
    } else {
      imgEl.className = 'movie-img blur-1 ready';
      hintBox.innerHTML += `<br/><strong>Clue 2:</strong> "${escapeHtml(redact(target.overview, target.title).slice(0, 155))}..."`;
      hintBtn.disabled = true;
    }
  });

  regSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); startRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 2. BINGE DUEL (Rating, Episodes, Seasons, Year) ----------
function initTvDuel() {
  const META = {
    rating:   { label: 'RATING',   tip: 'higher or lower viewer rating?', dec: 1, suf: '' },
    episodes: { label: 'EPISODES', tip: 'more or fewer total episodes?', dec: 0, suf: ' eps' },
    seasons:  { label: 'SEASONS',  tip: 'more or fewer seasons?', dec: 0, suf: ' seasons' },
    year:     { label: 'PREMIERED',tip: 'newer (higher year) or older premiere?', dec: 0, suf: '' },
  };
  let metric = 'rating', pool = [], left = null, right = null, run = 0, locked = true, token = 0, timer = null;

  const regSel = document.getElementById('tvd-region');
  const tipEl = document.getElementById('tvd-tip'), runEl = document.getElementById('tvd-run'), loader = document.getElementById('tvd-loader');
  const lImg = document.getElementById('tvd-l-img'), lMeta = document.getElementById('tvd-l-meta'), lTitle = document.getElementById('tvd-l-title'), lLabel = document.getElementById('tvd-l-label'), lVal = document.getElementById('tvd-l-val');
  const rImg = document.getElementById('tvd-r-img'), rMeta = document.getElementById('tvd-r-meta'), rTitle = document.getElementById('tvd-r-title'), rLabel = document.getElementById('tvd-r-label'), rVal = document.getElementById('tvd-r-val');
  const controls = document.getElementById('tvd-controls'), btnHi = document.getElementById('tvd-hi'), btnLo = document.getElementById('tvd-lo');
  const statusEl = document.getElementById('tvd-status'), restartBtn = document.getElementById('tvd-restart');

  function draw(ex) {
    const i = pool.findIndex((s) => s.id !== ex);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showR = false) {
    const m = META[metric];
    lImg.src = left.image; lTitle.textContent = left.title; lMeta.textContent = metric === 'year' ? `★ ${left.rating}` : `Premiered ${left.year}`;
    lLabel.textContent = m.label; lVal.textContent = `${m.dec ? left[metric].toFixed(m.dec) : left[metric]}${m.suf}`;
    rImg.src = right.image; rTitle.textContent = right.title; rMeta.textContent = metric === 'year' ? `★ ${right.rating}` : `Premiered ${right.year}`;
    rLabel.textContent = m.label;
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      animateNumber(rVal, metric === 'year' ? 1985 : 0, right[metric], { duration: 460, decimals: m.dec, suffix: m.suf });
    } else {
      rVal.textContent = '???';
    }
  }

  async function startDuel() {
    clearTimeout(timer);
    const t = ++token;
    locked = true; run = 0; runEl.textContent = '0';
    tipEl.textContent = `Does the right-hand show have a ${META[metric].tip}`;
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.textContent = 'Loading TV shows & episode counts...';
    loader.classList.remove('hidden');

    try {
      if (pool.length < 6) pool = await fetchTvPool(regSel.value, 'duel');
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
      loader.textContent = err.message || 'Could not load TV duel.';
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(dir) {
    if (locked || !left || !right) return;
    const t = token;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const m = META[metric];
    const ok = (dir === 'higher' && right[metric] >= left[metric]) || (dir === 'lower' && right[metric] <= left[metric]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('tvDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Nice! ${right.title}: ${right[metric]}${m.suf}`;
      timer = setTimeout(async () => {
        if (t !== token) return;
        left = right;
        if (pool.length < 2) { try { pool = await fetchTvPool(regSel.value, 'duel'); } catch {} }
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
      statusEl.textContent = `Run ended! ${right.title}: ${right[metric]}${m.suf}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  regSel.addEventListener('change', () => { playSfx('click'); pool = []; startDuel(); });
  document.querySelectorAll('[data-tvmetric]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      metric = b.dataset.tvmetric;
      document.querySelectorAll('[data-tvmetric]').forEach((x) => x.classList.toggle('active', x === b));
      startDuel();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

// ---------- 3. TV CAST MATCH ----------
function initTvCast() {
  let round = null, hintUsed = false, locked = true, token = 0, choiceCount = 4;

  const regSel = document.getElementById('tvc-region');
  const opt4 = document.getElementById('tvc-opt-4'), opt6 = document.getElementById('tvc-opt-6');
  const ptsEl = document.getElementById('tvc-pts');
  const loader = document.getElementById('tvc-loader'), bannerEl = document.getElementById('tvc-banner'), gridEl = document.getElementById('tvc-grid');
  const hintBtn = document.getElementById('tvc-hint-btn'), optionsEl = document.getElementById('tvc-options');
  const feedbackEl = document.getElementById('tvc-feedback'), nextBtn = document.getElementById('tvc-next');

  async function startRound() {
    const t = ++token;
    locked = true; hintUsed = false;
    ptsEl.textContent = `+${choiceCount === 6 ? 310 : 250} PTS`;
    hintBtn.disabled = true;
    bannerEl.classList.add('hidden'); bannerEl.innerHTML = '';
    feedbackEl.classList.add('hidden'); nextBtn.classList.add('hidden');
    loader.textContent = 'Calling TV cast...'; loader.classList.remove('hidden');
    gridEl.innerHTML = ''; optionsEl.innerHTML = '';

    try {
      const q = new URLSearchParams({ region: regSel.value, choices: String(choiceCount) });
      const res = await fetch(`/api/tv/cast-round?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 404 ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY).' : data.error || 'Failed to load TV cast.');
      if (t !== token) return;
      round = data;
      await Promise.all(round.cast.map((a) => preloadImage(a.photo, 5000)));
      if (t !== token) return;

      round.cast.forEach((a) => {
        const card = document.createElement('div');
        card.className = 'cast-card';
        card.innerHTML = `<img src="${escapeHtml(a.photo)}" alt="${escapeHtml(a.name)}" /><div class="cast-info"><strong>${escapeHtml(a.name)}</strong><span class="cast-role hidden">as ${escapeHtml(a.character)}</span></div>`;
        gridEl.appendChild(card);
      });

      round.options.forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = s.id;
        btn.textContent = s.title;
        btn.addEventListener('click', () => {
          if (locked) return;
          locked = true; hintBtn.disabled = true;
          gridEl.querySelectorAll('.cast-role').forEach((el) => el.classList.remove('hidden'));
          const target = round.target;
          if (target.image) {
            bannerEl.innerHTML = `<img src="${escapeHtml(target.image)}" alt="${escapeHtml(target.title)}" /><div><strong>${escapeHtml(target.title)}</strong><span>${escapeHtml(target.year)} • ★ ${escapeHtml(target.rating)}</span></div>`;
            bannerEl.classList.remove('hidden');
          }
          optionsEl.querySelectorAll('.option-btn').forEach((b) => {
            b.disabled = true;
            if (Number(b.dataset.id) === target.id) b.classList.add('correct');
          });
          feedbackEl.classList.remove('hidden', 'good', 'bad');
          if (s.id === target.id) {
            playSfx('correct');
            const base = choiceCount === 6 ? (hintUsed ? 235 : 310) : (hintUsed ? 175 : 250);
            const earned = recordWin('tvCast', base);
            feedbackEl.classList.add('good');
            feedbackEl.textContent = `Spot on! "${target.title}" (${target.year}) — +${earned} pts`;
          } else {
            playSfx('wrong');
            btn.classList.add('wrong');
            resetStreak();
            feedbackEl.classList.add('bad');
            feedbackEl.textContent = `That ensemble starred in "${target.title}" (${target.year}).`;
          }
          nextBtn.textContent = 'Next TV Cast →';
          nextBtn.classList.remove('hidden');
        });
        optionsEl.appendChild(btn);
      });
      loader.classList.add('hidden');
      locked = false; hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = err.message || 'Could not load TV cast.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed) return;
    playSfx('reveal'); hintUsed = true; hintBtn.disabled = true;
    ptsEl.textContent = `+${choiceCount === 6 ? 235 : 175} PTS`;
    gridEl.querySelectorAll('.cast-role').forEach((el) => el.classList.remove('hidden'));
  });
  regSel.addEventListener('change', () => { playSfx('click'); startRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); startRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

setupModeTabs((mode) => {
  if (mode === 'unblur') initTvUnblur();
  if (mode === 'duel') initTvDuel();
  if (mode === 'cast') initTvCast();
});
