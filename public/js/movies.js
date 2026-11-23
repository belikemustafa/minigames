import { playSfx, recordWin, resetStreak, shuffle, escapeHtml, preloadImage } from './app.js';

let moviePool = [];
const seenIds = new Set();
let currentTarget = null;
let hintsUsed = 0;
let potentialPoints = 300;
let locked = true;
let roundToken = 0;

const imgEl = document.getElementById('movie-img');
const loaderEl = document.getElementById('movie-loader');
const pointsBadge = document.getElementById('movie-points-badge');
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
        ? 'Backend function not running. Deploy on Cloudflare Pages or run "npx wrangler pages dev public".'
        : data.error || 'Could not load movie pool.'
    );
  }
  const fresh = (data.movies || []).filter((m) => !seenIds.has(m.id));
  moviePool = shuffle(fresh.length >= 6 ? fresh : data.movies || []);
}

function redactTitle(overview, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return overview.replace(new RegExp(escaped, 'gi'), '[REDACTED]');
}

async function startRound() {
  const token = ++roundToken;
  locked = true;
  hintsUsed = 0;
  potentialPoints = 300;

  pointsBadge.textContent = `+${potentialPoints} PTS`;
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
    if (moviePool.length < 6) await loadPool();
    if (token !== roundToken) return;
    if (moviePool.length < 4) throw new Error('Not enough movies returned.');

    currentTarget = moviePool.pop();
    seenIds.add(currentTarget.id);
    if (seenIds.size > 120) seenIds.clear();

    const decoys = shuffle(moviePool.filter((m) => m.id !== currentTarget.id)).slice(0, 3);
    const choices = shuffle([currentTarget, ...decoys]);

    await preloadImage(currentTarget.image);
    if (token !== roundToken) return;

    imgEl.src = currentTarget.image;
    imgEl.classList.add('ready');
    loaderEl.classList.add('hidden');

    choices.forEach((movie) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.id = movie.id;
      btn.textContent = movie.title;
      btn.addEventListener('click', () => handleGuess(movie, btn));
      optionsEl.appendChild(btn);
    });

    locked = false;
    hintBtn.disabled = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = err.message || 'Could not load movies. Tap Retry.';
    nextBtn.textContent = 'Retry ↻';
    nextBtn.classList.remove('hidden');
    console.error(err);
  }
}

function revealHint() {
  if (locked || !currentTarget || hintsUsed >= 2) return;
  playSfx('click');
  hintsUsed += 1;
  potentialPoints = Math.max(100, potentialPoints - 75);
  pointsBadge.textContent = `+${potentialPoints} PTS`;
  hintsBox.classList.remove('hidden');

  if (hintsUsed === 1) {
    imgEl.className = 'movie-img ready blur-2';
    const genreText = currentTarget.genres?.length
      ? ` • ${escapeHtml(currentTarget.genres.join(', '))}`
      : '';
    hintsBox.innerHTML = `<strong>Clue 1:</strong> ${escapeHtml(currentTarget.year)} • ★ ${escapeHtml(
      currentTarget.rating
    )}${genreText}`;
    hintBtn.textContent = '💡 Plot Clue & Unblur (-75 pts)';
  } else {
    imgEl.className = 'movie-img ready blur-1';
    const snippet = escapeHtml(redactTitle(currentTarget.overview, currentTarget.title).slice(0, 155));
    hintsBox.innerHTML += `<br/><strong>Clue 2:</strong> "${snippet}..."`;
    hintBtn.disabled = true;
    hintBtn.textContent = 'All Hints Used';
  }
}

function handleGuess(selected, btnEl) {
  if (locked || !currentTarget) return;
  locked = true;
  hintBtn.disabled = true;
  imgEl.className = 'movie-img ready blur-0';

  optionsEl.querySelectorAll('.option-btn').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.id) === currentTarget.id) b.classList.add('correct');
  });

  feedbackEl.classList.remove('hidden', 'good', 'bad');
  if (selected.id === currentTarget.id) {
    playSfx('correct');
    const earned = recordWin('movies', potentialPoints);
    feedbackEl.classList.add('good');
    feedbackEl.textContent = `Spot on! "${currentTarget.title}" (${currentTarget.year}) — +${earned} pts`;
  } else {
    playSfx('wrong');
    btnEl.classList.add('wrong');
    resetStreak();
    feedbackEl.classList.add('bad');
    feedbackEl.textContent = `Close call! That frame was "${currentTarget.title}" (${currentTarget.year}).`;
  }

  nextBtn.textContent = 'Next Movie →';
  nextBtn.classList.remove('hidden');
}

export function initMoviesGame() {
  hintBtn.addEventListener('click', revealHint);
  nextBtn.addEventListener('click', () => {
    playSfx('click');
    startRound();
  });
  startRound();
}
