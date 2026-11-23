import { initChrome, setupModeTabs, playSfx, recordWin, resetStreak, shuffle, escapeHtml, preloadImage } from './core.js';

initChrome('movies');

// ---------- 1. SCENE UNBLUR (Fixed CSS Blur!) ----------
function initUnblur() {
  let pool = [];
  const seen = new Set();
  let target = null;
  let hintsUsed = 0;
  let pts = 300;
  let locked = true;
  let token = 0;

  const imgEl = document.getElementById('movie-img');
  const loaderEl = document.getElementById('movie-loader');
  const ptsBadge = document.getElementById('movie-points-badge');
  const hintBtn = document.getElementById('movie-hint-btn');
  const hintsBox = document.getElementById('movie-hints-box');
  const optionsEl = document.getElementById('movie-options');
  const feedbackEl = document.getElementById('movie-feedback');
  const nextBtn = document.getElementById('movie-next-btn');

  async function loadPool() {
    const res = await fetch('/api/movies/pool');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY) or run "npx wrangler pages dev public" to load movies.'
          : data.error || 'Could not load movies.'
      );
    }
    const fresh = (data.movies || []).filter((m) => !seen.has(m.id));
    pool = shuffle(fresh.length >= 6 ? fresh : data.movies || []);
  }

  function redact(text, title) {
    const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(esc, 'gi'), '[REDACTED]');
  }

  async function startRound() {
    const t = ++token;
    locked = true;
    hintsUsed = 0;
    pts = 300;
    ptsBadge.textContent = `+${pts} PTS`;
    hintsBox.classList.add('hidden');
    hintsBox.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Unblur & Genre Clue (-75 pts)';
    loaderEl.textContent = 'Loading reel...';
    loaderEl.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'movie-img blur-3';

    try {
      if (pool.length < 6) await loadPool();
      if (t !== token) return;
      if (pool.length < 4) throw new Error('Not enough movies returned.');

      target = pool.pop();
      seen.add(target.id);
      if (seen.size > 120) seen.clear();

      const decoys = shuffle(pool.filter((m) => m.id !== target.id)).slice(0, 3);
      const choices = shuffle([target, ...decoys]);

      await preloadImage(target.image);
      if (t !== token) return;

      imgEl.src = target.image;
      imgEl.className = 'movie-img blur-3 ready';
      loaderEl.classList.add('hidden');

      choices.forEach((m) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = m.id;
        btn.textContent = m.title;
        btn.addEventListener('click', () => handleGuess(m, btn));
        optionsEl.appendChild(btn);
      });

      locked = false;
      hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loaderEl.textContent = err.message || 'Could not load movies. Tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function revealHint() {
    if (locked || !target || hintsUsed >= 2) return;
    playSfx('click');
    hintsUsed += 1;
    pts = Math.max(100, pts - 75);
    ptsBadge.textContent = `+${pts} PTS`;
    hintsBox.classList.remove('hidden');

    if (hintsUsed === 1) {
      imgEl.className = 'movie-img blur-2 ready';
      const genres = target.genres?.length ? ` • ${escapeHtml(target.genres.join(', '))}` : '';
      hintsBox.innerHTML = `<strong>Clue 1:</strong> ${escapeHtml(target.year)} • ★ ${escapeHtml(target.rating)}${genres}`;
      hintBtn.textContent = '💡 Plot Clue & Unblur (-75 pts)';
    } else {
      imgEl.className = 'movie-img blur-1 ready';
      const snippet = escapeHtml(redact(target.overview, target.title).slice(0, 155));
      hintsBox.innerHTML += `<br/><strong>Clue 2:</strong> "${snippet}..."`;
      hintBtn.disabled = true;
      hintBtn.textContent = 'All Hints Used';
    }
  }

  function handleGuess(selected, btnEl) {
    if (locked || !target) return;
    locked = true;
    hintBtn.disabled = true;
    imgEl.className = 'movie-img blur-0 ready';

    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === target.id) b.classList.add('correct');
    });

    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (selected.id === target.id) {
      playSfx('correct');
      const earned = recordWin('moviesUnblur', pts);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Spot on! "${target.title}" (${target.year}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Close call! That scene was "${target.title}" (${target.year}).`;
    }
    nextBtn.textContent = 'Next Movie →';
    nextBtn.classList.remove('hidden');
  }

  hintBtn.addEventListener('click', revealHint);
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 2. CAST MATCH ----------
function initCast() {
  let round = null;
  let hintUsed = false;
  let locked = true;
  let token = 0;

  const loaderEl = document.getElementById('cast-loader');
  const bannerEl = document.getElementById('cast-reveal-banner');
  const gridEl = document.getElementById('cast-grid');
  const hintBtn = document.getElementById('cast-hint-btn');
  const ptsBadge = document.getElementById('cast-points-badge');
  const optionsEl = document.getElementById('cast-options');
  const feedbackEl = document.getElementById('cast-feedback');
  const nextBtn = document.getElementById('cast-next-btn');

  async function startRound() {
    const t = ++token;
    locked = true;
    hintUsed = false;
    ptsBadge.textContent = '+250 PTS';
    hintBtn.disabled = true;
    bannerEl.classList.add('hidden');
    bannerEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loaderEl.textContent = 'Assembling cast...';
    loaderEl.classList.remove('hidden');
    gridEl.innerHTML = '';
    optionsEl.innerHTML = '';

    try {
      const res = await fetch('/api/movies/cast-round');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? 'Deploy on Cloudflare Pages (with TMDB_API_KEY) or run "npx wrangler pages dev public".'
            : data.error || 'Could not load cast round.'
        );
      }
      if (t !== token) return;
      round = data;
      await Promise.all(round.cast.map((a) => preloadImage(a.photo, 5000)));
      if (t !== token) return;

      round.cast.forEach((a) => {
        const card = document.createElement('div');
        card.className = 'cast-card';
        card.innerHTML = `
          <img src="${escapeHtml(a.photo)}" alt="${escapeHtml(a.name)}" />
          <div class="cast-info">
            <strong>${escapeHtml(a.name)}</strong>
            <span class="cast-role hidden">as ${escapeHtml(a.character)}</span>
          </div>`;
        gridEl.appendChild(card);
      });

      round.options.forEach((m) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = m.id;
        btn.textContent = m.title;
        btn.addEventListener('click', () => handleGuess(m, btn));
        optionsEl.appendChild(btn);
      });

      loaderEl.classList.add('hidden');
      locked = false;
      hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loaderEl.textContent = err.message || 'Could not load cast. Tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function revealRoles() {
    if (locked || hintUsed) return;
    playSfx('click');
    hintUsed = true;
    hintBtn.disabled = true;
    ptsBadge.textContent = '+175 PTS';
    gridEl.querySelectorAll('.cast-role').forEach((el) => el.classList.remove('hidden'));
  }

  function handleGuess(selected, btnEl) {
    if (locked || !round) return;
    locked = true;
    hintBtn.disabled = true;
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
    if (selected.id === target.id) {
      playSfx('correct');
      const earned = recordWin('moviesCast', hintUsed ? 175 : 250);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Nice eye! "${target.title}" (${target.year}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `Good try! They starred in "${target.title}" (${target.year}).`;
    }
    nextBtn.textContent = 'Next Cast →';
    nextBtn.classList.remove('hidden');
  }

  hintBtn.addEventListener('click', revealRoles);
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

setupModeTabs((mode) => {
  if (mode === 'unblur') initUnblur();
  if (mode === 'cast') initCast();
});
