import {
  playSfx,
  recordWin,
  recordBestStreak,
  resetStreak,
  shuffle,
  fetchJikan,
  preloadImage,
} from './app.js';

let animePool = [];
let champ = null;
let challenger = null;
let runScore = 0;
let locked = true;
let roundToken = 0;
let advanceTimer = null;
let animFrameId = null;

const loaderEl = document.getElementById('anime-loader');
const runScoreEl = document.getElementById('anime-run-score');
const champImg = document.getElementById('anime-champ-img');
const champTitle = document.getElementById('anime-champ-title');
const champMeta = document.getElementById('anime-champ-meta');
const champScore = document.getElementById('anime-champ-score');

const chalImg = document.getElementById('anime-chal-img');
const chalTitle = document.getElementById('anime-chal-title');
const chalMeta = document.getElementById('anime-chal-meta');
const chalScore = document.getElementById('anime-chal-score');

const controlsEl = document.getElementById('anime-controls');
const higherBtn = document.getElementById('btn-higher');
const lowerBtn = document.getElementById('btn-lower');
const statusEl = document.getElementById('anime-status');
const restartBtn = document.getElementById('anime-restart-btn');

async function refillPool() {
  const page = Math.floor(Math.random() * 8) + 1;
  const json = await fetchJikan(`https://api.jikan.moe/v4/top/anime?sfw=true&page=${page}`);

  const cleaned = (json.data || [])
    .filter((a) => typeof a.score === 'number' && a.images?.jpg?.large_image_url)
    .map((a) => ({
      id: a.mal_id,
      title: a.title_english || a.title,
      score: a.score,
      year: a.year || a.aired?.prop?.from?.year || 'Classic',
      episodes: a.episodes ? `${a.episodes} eps` : 'Movie/OVA',
      image: a.images.webp?.large_image_url || a.images.jpg.large_image_url,
    }));

  const seen = new Set(animePool.map((x) => x.id));
  const fresh = cleaned.filter((x) => !seen.has(x.id));
  animePool = shuffle([...animePool, ...fresh]);
}

function drawUnique(excludeId) {
  const idx = animePool.findIndex((a) => a.id !== excludeId);
  if (idx === -1) return null;
  return animePool.splice(idx, 1)[0];
}

function renderCards() {
  champImg.src = champ.image;
  champTitle.textContent = champ.title;
  champMeta.textContent = `${champ.year} • ${champ.episodes}`;
  champScore.textContent = champ.score.toFixed(2);

  chalImg.src = challenger.image;
  chalTitle.textContent = challenger.title;
  chalMeta.textContent = `${challenger.year} • ${challenger.episodes}`;
  chalScore.textContent = '?.??';
  chalScore.classList.add('mystery');
}

function animateScore(targetVal, token, callback) {
  const duration = 500;
  const start = performance.now();
  chalScore.classList.remove('mystery');

  function tick(now) {
    if (token !== roundToken) return;
    const progress = Math.min((now - start) / duration, 1);
    chalScore.textContent = (targetVal * progress).toFixed(2);
    if (progress < 1) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      chalScore.textContent = targetVal.toFixed(2);
      callback();
    }
  }
  animFrameId = requestAnimationFrame(tick);
}

async function startNewDuel() {
  clearTimeout(advanceTimer);
  cancelAnimationFrame(animFrameId);
  const token = ++roundToken;

  locked = true;
  runScore = 0;
  runScoreEl.textContent = '0';
  statusEl.classList.add('hidden');
  restartBtn.classList.add('hidden');
  controlsEl.classList.remove('hidden');
  higherBtn.disabled = true;
  lowerBtn.disabled = true;
  loaderEl.textContent = 'Loading anime matchup...';
  loaderEl.classList.remove('hidden');

  try {
    if (animePool.length < 10) await refillPool();
    if (token !== roundToken) return;

    champ = drawUnique(null);
    challenger = drawUnique(champ?.id);
    if (!champ || !challenger) throw new Error('Anime pool empty');

    await Promise.all([preloadImage(champ.image, 6000), preloadImage(challenger.image, 6000)]);
    if (token !== roundToken) return;

    renderCards();
    loaderEl.classList.add('hidden');
    higherBtn.disabled = false;
    lowerBtn.disabled = false;
    locked = false;
  } catch (err) {
    if (token !== roundToken) return;
    loaderEl.textContent = 'MyAnimeList API is catching its breath — tap Start New Duel.';
    controlsEl.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    console.error(err);
  }
}

function handleChoice(choice) {
  if (locked || !champ || !challenger) return;
  const token = roundToken;
  locked = true;
  higherBtn.disabled = true;
  lowerBtn.disabled = true;

  const isHigher = challenger.score >= champ.score;
  const isLower = challenger.score <= champ.score;
  const isTie = challenger.score === champ.score;
  const correct = (choice === 'higher' && isHigher) || (choice === 'lower' && isLower);

  animateScore(challenger.score, token, () => {
    if (token !== roundToken) return;
    statusEl.classList.remove('hidden', 'good', 'bad');

    if (correct) {
      playSfx('correct');
      runScore += 1;
      runScoreEl.textContent = runScore;
      recordWin('anime', 120);
      recordBestStreak('anime', runScore);
      statusEl.classList.add('good');
      statusEl.textContent = isTie
        ? `Exact tie (${challenger.score.toFixed(2)})! You stay alive — next challenger up...`
        : `Nice call! ${challenger.title} scores ${challenger.score.toFixed(2)} — next challenger up...`;

      advanceTimer = setTimeout(async () => {
        if (token !== roundToken) return;
        if (animePool.length < 5) {
          try { await refillPool(); } catch {}
        }
        if (token !== roundToken) return;

        champ = challenger;
        challenger = drawUnique(champ.id);
        if (!challenger) {
          await startNewDuel();
          return;
        }
        await preloadImage(challenger.image, 5000);
        if (token !== roundToken) return;

        renderCards();
        statusEl.classList.add('hidden');
        higherBtn.disabled = false;
        lowerBtn.disabled = false;
        locked = false;
      }, 1200);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${challenger.title} holds a ${challenger.score.toFixed(2)} score. Final run: ${runScore}`;
      controlsEl.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  });
}

export function initAnimeGame() {
  higherBtn.addEventListener('click', () => handleChoice('higher'));
  lowerBtn.addEventListener('click', () => handleChoice('lower'));
  restartBtn.addEventListener('click', () => {
    playSfx('click');
    startNewDuel();
  });
  startNewDuel();
}
