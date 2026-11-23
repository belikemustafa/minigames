import { playSfx, recordWin, resetStreak, escapeHtml, preloadImage } from './app.js';

let currentRound = null;
let hintUsed = false;
let locked = true;
let roundToken = 0;

const loaderEl = document.getElementById('cast-loader');
const bannerEl = document.getElementById('cast-reveal-banner');
const gridEl = document.getElementById('cast-grid');
const hintBtn = document.getElementById('cast-hint-btn');
const pointsBadge = document.getElementById('cast-points-badge');
const optionsEl = document.getElementById('cast-options');
const feedbackEl = document.getElementById('cast-feedback');
const nextBtn = document.getElementById('cast-next-btn');

async function startRound() {
  const token = ++roundToken;
  locked = true;
  hintUsed = false;

  pointsBadge.textContent = '+250 PTS';
  hintBtn.disabled = true;
  hintBtn.textContent = '🎭 Reveal Character Names (-75 pts)';
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
          ? 'Backend function not running. Deploy on Cloudflare Pages or run "npx wrangler pages dev public".'
          : data.error || 'Could not load cast round.'
      );
    }
    if (token !== roundToken) return;

    currentRound = data;
    await Promise.all(currentRound.cast.map((actor) => preloadImage(actor.photo, 5000)));
    if (token !== roundToken) return;

    currentRound.cast.forEach((actor) => {
      const card = document.createElement('div');
      card.className = 'cast-card';
      card.innerHTML = `
        <img src="${escapeHtml(actor.photo)}" alt="${escapeHtml(actor.name)}" />
        <div class="cast-info">
          <strong>${escapeHtml(actor.name)}</strong>
          <span class="cast-role hidden">as ${escapeHtml(actor.character)}</span>
        </div>
      `;
      gridEl.appendChild(card);
    });

    currentRound.options.forEach((movie) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.id = movie.id;
      btn.textContent = movie.title;
      btn.addEventListener('click', () => handleGuess(movie, btn));
      optionsEl.appendChild(btn);
    });

    loaderEl.classList.add('hidden');
    locked = false;
    hintBtn.disabled = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = err.message || 'Could not load cast round. Tap Retry.';
    nextBtn.textContent = 'Retry ↻';
    nextBtn.classList.remove('hidden');
    console.error(err);
  }
}

function revealRoles() {
  if (locked || hintUsed) return;
  playSfx('click');
  hintUsed = true;
  hintBtn.disabled = true;
  pointsBadge.textContent = '+175 PTS';
  gridEl.querySelectorAll('.cast-role').forEach((el) => el.classList.remove('hidden'));
}

function handleGuess(selected, btnEl) {
  if (locked || !currentRound) return;
  locked = true;
  hintBtn.disabled = true;
  gridEl.querySelectorAll('.cast-role').forEach((el) => el.classList.remove('hidden'));

  const target = currentRound.target;
  if (target.image) {
    bannerEl.innerHTML = `
      <img src="${escapeHtml(target.image)}" alt="${escapeHtml(target.title)}" />
      <div>
        <strong>${escapeHtml(target.title)}</strong>
        <span>${escapeHtml(target.year)} • ★ ${escapeHtml(target.rating)}</span>
      </div>
    `;
    bannerEl.classList.remove('hidden');
  }

  optionsEl.querySelectorAll('.option-btn').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.id) === target.id) b.classList.add('correct');
  });

  feedbackEl.classList.remove('hidden', 'good', 'bad');
  if (selected.id === target.id) {
    playSfx('correct');
    const earned = recordWin('movieCast', hintUsed ? 175 : 250);
    feedbackEl.classList.add('good');
    feedbackEl.textContent = `Nice eye! That's the cast of "${target.title}" (${target.year}) — +${earned} pts`;
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

export function initMovieCastGame() {
  hintBtn.addEventListener('click', revealRoles);
  nextBtn.addEventListener('click', () => {
    playSfx('click');
    startRound();
  });
  startRound();
}
