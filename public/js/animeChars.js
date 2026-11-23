import {
  playSfx,
  recordWin,
  resetStreak,
  shuffle,
  fetchJikan,
  preloadImage,
} from './app.js';

let animeList = [];
const seenAnimeIds = new Set();
let currentTarget = null;
let currentChar = null;
let hintUsed = false;
let locked = true;
let roundToken = 0;

const loaderEl = document.getElementById('char-loader');
const imgEl = document.getElementById('char-img');
const nameEl = document.getElementById('char-name');
const pointsBadge = document.getElementById('char-points-badge');
const hintBtn = document.getElementById('char-hint-btn');
const optionsEl = document.getElementById('char-options');
const feedbackEl = document.getElementById('char-feedback');
const nextBtn = document.getElementById('char-next-btn');

async function loadAnimeList() {
  const page = Math.floor(Math.random() * 6) + 1;
  const json = await fetchJikan(`https://api.jikan.moe/v4/top/anime?sfw=true&page=${page}`, {
    cache: true,
  });
  const mapped = (json.data || []).map((a) => ({
    id: a.mal_id,
    title: a.title_english || a.title,
  }));
  const fresh = mapped.filter((a) => !seenAnimeIds.has(a.id));
  animeList = shuffle(fresh.length >= 6 ? fresh : mapped);
}

async function startRound(attempt = 0) {
  const token = attempt === 0 ? ++roundToken : roundToken;
  locked = true;
  hintUsed = false;

  pointsBadge.textContent = '+250 PTS';
  hintBtn.disabled = true;
  nameEl.classList.add('hidden');
  feedbackEl.classList.add('hidden');
  nextBtn.classList.add('hidden');
  loaderEl.textContent = 'Loading character...';
  loaderEl.classList.remove('hidden');
  optionsEl.innerHTML = '';
  imgEl.className = 'char-img';

  try {
    if (animeList.length < 6) await loadAnimeList();
    if (token !== roundToken) return;

    currentTarget = animeList.pop();
    seenAnimeIds.add(currentTarget.id);
    if (seenAnimeIds.size > 100) seenAnimeIds.clear();

    const json = await fetchJikan(
      `https://api.jikan.moe/v4/anime/${currentTarget.id}/characters`,
      { cache: true }
    );
    if (token !== roundToken) return;

    const mains = (json.data || []).filter(
      (c) => c.role === 'Main' && c.character?.images?.jpg?.image_url
    );
    const pool = mains.length
      ? mains
      : (json.data || []).filter((c) => c.character?.images?.jpg?.image_url);

    if (!pool.length) {
      if (attempt < 3) return startRound(attempt + 1);
      throw new Error('No character portrait available');
    }

    const picked = pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
    currentChar = {
      name: picked.character.name.split(', ').reverse().join(' '),
      image: picked.character.images.webp?.image_url || picked.character.images.jpg.image_url,
    };

    const decoys = shuffle(animeList.filter((a) => a.id !== currentTarget.id)).slice(0, 3);
    const choices = shuffle([currentTarget, ...decoys]);

    await preloadImage(currentChar.image);
    if (token !== roundToken) return;

    imgEl.src = currentChar.image;
    imgEl.classList.add('ready');
    nameEl.textContent = currentChar.name;
    loaderEl.classList.add('hidden');

    choices.forEach((anime) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.id = anime.id;
      btn.textContent = anime.title;
      btn.addEventListener('click', () => handleGuess(anime, btn));
      optionsEl.appendChild(btn);
    });

    locked = false;
    hintBtn.disabled = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = 'Jikan API is busy — tap Retry in a moment.';
    nextBtn.textContent = 'Retry ↻';
    nextBtn.classList.remove('hidden');
    console.error(err);
  }
}

function revealName() {
  if (locked || hintUsed) return;
  playSfx('click');
  hintUsed = true;
  hintBtn.disabled = true;
  pointsBadge.textContent = '+175 PTS';
  nameEl.classList.remove('hidden');
}

function handleGuess(selected, btnEl) {
  if (locked || !currentTarget) return;
  locked = true;
  hintBtn.disabled = true;
  nameEl.classList.remove('hidden');

  optionsEl.querySelectorAll('.option-btn').forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.id) === currentTarget.id) b.classList.add('correct');
  });

  feedbackEl.classList.remove('hidden', 'good', 'bad');
  if (selected.id === currentTarget.id) {
    playSfx('correct');
    const earned = recordWin('animeChars', hintUsed ? 175 : 250);
    feedbackEl.classList.add('good');
    feedbackEl.textContent = `Spot on! ${currentChar.name} is from ${currentTarget.title} — +${earned} pts`;
  } else {
    playSfx('wrong');
    btnEl.classList.add('wrong');
    resetStreak();
    feedbackEl.classList.add('bad');
    feedbackEl.textContent = `That's ${currentChar.name} from ${currentTarget.title}.`;
  }

  nextBtn.textContent = 'Next Character →';
  nextBtn.classList.remove('hidden');
}

export function initAnimeCharsGame() {
  hintBtn.addEventListener('click', revealName);
  nextBtn.addEventListener('click', () => {
    playSfx('click');
    startRound();
  });
  startRound();
}
