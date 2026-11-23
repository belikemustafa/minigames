import { initChrome, setupModeTabs, playSfx, recordWin, recordBestValue, resetStreak, shuffle, preloadImage } from './core.js';

initChrome('anime');

// Reliable AniList GraphQL fetcher (Cloudflare proxy first, direct browser GraphQL fallback!)
const ANILIST_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, averageScore_greater: 50) {
      id
      title { romaji english }
      averageScore
      seasonYear
      episodes
      format
      coverImage { extraLarge large }
      characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 4) {
        nodes {
          id
          name { full }
          image { large }
        }
      }
    }
  }
}
`;

let sharedAnimeCache = [];

async function fetchAnimeBatch() {
  const page = Math.floor(Math.random() * 10) + 1;

  // 1) Try Cloudflare Pages Function proxy
  try {
    const proxyRes = await fetch(`/api/anime/pool?page=${page}`);
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (Array.isArray(json.anime) && json.anime.length >= 6) {
        return json.anime;
      }
    }
  } catch {}

  // 2) Direct fallback to official AniList GraphQL API (CORS-enabled, keyless, 90 req/min)
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { page, perPage: 25 } }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  const media = json?.data?.Page?.media || [];

  return media
    .filter((a) => typeof a.averageScore === 'number' && (a.coverImage?.extraLarge || a.coverImage?.large))
    .map((a) => ({
      id: a.id,
      title: a.title?.english || a.title?.romaji || 'Unknown Anime',
      score: Number((a.averageScore / 10).toFixed(1)),
      year: a.seasonYear || 'Classic',
      episodes: a.episodes ? `${a.episodes} eps` : a.format || 'Series',
      image: a.coverImage.extraLarge || a.coverImage.large,
      characters: (a.characters?.nodes || [])
        .filter((c) => c.name?.full && c.image?.large && !c.image.large.includes('default.jpg'))
        .map((c) => ({ id: c.id, name: c.name.full, image: c.image.large })),
    }));
}

async function getAnimePool(minSize = 10) {
  if (sharedAnimeCache.length < minSize) {
    const fresh = await fetchAnimeBatch();
    const seen = new Set(sharedAnimeCache.map((a) => a.id));
    sharedAnimeCache = shuffle([...sharedAnimeCache, ...fresh.filter((a) => !seen.has(a.id))]);
  }
  return sharedAnimeCache;
}

// ---------- 1. SCORE DUEL ----------
function initScoreDuel() {
  let pool = [];
  let champ = null;
  let chal = null;
  let run = 0;
  let locked = true;
  let token = 0;
  let timer = null;
  let animId = null;

  const loader = document.getElementById('anime-loader');
  const runEl = document.getElementById('anime-run-score');
  const cImg = document.getElementById('anime-champ-img');
  const cTitle = document.getElementById('anime-champ-title');
  const cMeta = document.getElementById('anime-champ-meta');
  const cScore = document.getElementById('anime-champ-score');
  const rImg = document.getElementById('anime-chal-img');
  const rTitle = document.getElementById('anime-chal-title');
  const rMeta = document.getElementById('anime-chal-meta');
  const rScore = document.getElementById('anime-chal-score');
  const controls = document.getElementById('anime-controls');
  const btnHi = document.getElementById('btn-higher');
  const btnLo = document.getElementById('btn-lower');
  const statusEl = document.getElementById('anime-status');
  const restartBtn = document.getElementById('anime-restart-btn');

  function draw(excludeId) {
    const i = pool.findIndex((a) => a.id !== excludeId);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render() {
    cImg.src = champ.image;
    cTitle.textContent = champ.title;
    cMeta.textContent = `${champ.year} • ${champ.episodes}`;
    cScore.textContent = champ.score.toFixed(1);

    rImg.src = chal.image;
    rTitle.textContent = chal.title;
    rMeta.textContent = `${chal.year} • ${chal.episodes}`;
    rScore.textContent = '?.?';
    rScore.classList.add('mystery');
  }

  function animateVal(target, t, done) {
    const start = performance.now();
    rScore.classList.remove('mystery');
    function tick(now) {
      if (t !== token) return;
      const p = Math.min((now - start) / 480, 1);
      rScore.textContent = (target * p).toFixed(1);
      if (p < 1) animId = requestAnimationFrame(tick);
      else { rScore.textContent = target.toFixed(1); done(); }
    }
    animId = requestAnimationFrame(tick);
  }

  async function startDuel() {
    clearTimeout(timer);
    cancelAnimationFrame(animId);
    const t = ++token;
    locked = true;
    run = 0;
    runEl.textContent = '0';
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.textContent = 'Loading anime matchup...';
    loader.classList.remove('hidden');

    try {
      if (pool.length < 8) pool = shuffle([...await getAnimePool(12)]);
      if (t !== token) return;
      champ = draw(null);
      chal = draw(champ?.id);
      if (!champ || !chal) throw new Error('Could not draw anime pair');

      await Promise.all([preloadImage(champ.image, 6000), preloadImage(chal.image, 6000)]);
      if (t !== token) return;

      render();
      loader.classList.add('hidden');
      btnHi.disabled = false; btnLo.disabled = false;
      locked = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = 'Could not reach AniList right now — tap Start New Duel.';
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(dir) {
    if (locked || !champ || !chal) return;
    const t = token;
    locked = true;
    btnHi.disabled = true; btnLo.disabled = true;

    const ok = (dir === 'higher' && chal.score >= champ.score) || (dir === 'lower' && chal.score <= champ.score);
    animateVal(chal.score, t, () => {
      if (t !== token) return;
      statusEl.classList.remove('hidden', 'good', 'bad');
      if (ok) {
        playSfx('correct');
        run += 1;
        runEl.textContent = run;
        recordWin(null, 120);
        recordBestValue('animeDuel', run);
        statusEl.classList.add('good');
        statusEl.textContent = `Nice! ${chal.title} scores ${chal.score.toFixed(1)} — next challenger up...`;

        timer = setTimeout(async () => {
          if (t !== token) return;
          if (pool.length < 4) {
            try { pool = shuffle([...pool, ...await fetchAnimeBatch()]); } catch {}
          }
          champ = chal;
          chal = draw(champ.id);
          if (!chal) return startDuel();
          await preloadImage(chal.image, 5000);
          if (t !== token) return;
          render();
          statusEl.classList.add('hidden');
          btnHi.disabled = false; btnLo.disabled = false;
          locked = false;
        }, 1150);
      } else {
        playSfx('wrong');
        resetStreak();
        statusEl.classList.add('bad');
        statusEl.textContent = `Run ended! ${chal.title} has a ${chal.score.toFixed(1)} rating. Final run: ${run}`;
        controls.classList.add('hidden');
        restartBtn.classList.remove('hidden');
      }
    });
  }

  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

// ---------- 2. CHARACTER MATCH ----------
function initCharMatch() {
  let pool = [];
  let target = null;
  let charObj = null;
  let hintUsed = false;
  let locked = true;
  let token = 0;

  const loader = document.getElementById('char-loader');
  const imgEl = document.getElementById('char-img');
  const nameEl = document.getElementById('char-name');
  const ptsBadge = document.getElementById('char-points-badge');
  const hintBtn = document.getElementById('char-hint-btn');
  const optionsEl = document.getElementById('char-options');
  const feedbackEl = document.getElementById('char-feedback');
  const nextBtn = document.getElementById('char-next-btn');

  async function startRound() {
    const t = ++token;
    locked = true;
    hintUsed = false;
    ptsBadge.textContent = '+250 PTS';
    hintBtn.disabled = true;
    nameEl.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Loading character...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'char-img';

    try {
      if (pool.length < 6) {
        const fetched = await getAnimePool(12);
        pool = shuffle(fetched.filter((a) => a.characters && a.characters.length > 0));
        if (pool.length < 4) {
          const fresh = await fetchAnimeBatch();
          pool = shuffle(fresh.filter((a) => a.characters && a.characters.length > 0));
        }
      }
      if (t !== token) return;
      if (pool.length < 4) throw new Error('Not enough characters found');

      target = pool.pop();
      charObj = target.characters[Math.floor(Math.random() * target.characters.length)];
      const decoys = shuffle(pool.filter((a) => a.id !== target.id)).slice(0, 3);
      const choices = shuffle([target, ...decoys]);

      await preloadImage(charObj.image);
      if (t !== token) return;

      imgEl.src = charObj.image;
      imgEl.classList.add('ready');
      nameEl.textContent = charObj.name;
      loader.classList.add('hidden');

      choices.forEach((a) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.id = a.id;
        btn.textContent = a.title;
        btn.addEventListener('click', () => handleGuess(a, btn));
        optionsEl.appendChild(btn);
      });

      locked = false;
      hintBtn.disabled = false;
    } catch (err) {
      if (t !== token) return;
      loader.textContent = 'Could not load character right now — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function revealName() {
    if (locked || hintUsed) return;
    playSfx('click');
    hintUsed = true;
    hintBtn.disabled = true;
    ptsBadge.textContent = '+175 PTS';
    nameEl.classList.remove('hidden');
  }

  function handleGuess(sel, btnEl) {
    if (locked || !target) return;
    locked = true;
    hintBtn.disabled = true;
    nameEl.classList.remove('hidden');

    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === target.id) b.classList.add('correct');
    });

    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (sel.id === target.id) {
      playSfx('correct');
      const earned = recordWin('animeChars', hintUsed ? 175 : 250);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Spot on! ${charObj.name} is from ${target.title} — +${earned} pts`;
    } else {
      playSfx('wrong');
      btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `That's ${charObj.name} from ${target.title}.`;
    }
    nextBtn.textContent = 'Next Character →';
    nextBtn.classList.remove('hidden');
  }

  hintBtn.addEventListener('click', revealName);
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

setupModeTabs((mode) => {
  if (mode === 'duel') initScoreDuel();
  if (mode === 'chars') initCharMatch();
});
