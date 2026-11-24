import { initChrome, setupModeTabs, playSfx, recordWin, recordBestValue, resetStreak, shuffle, preloadImage, animateNumber, triggerFlash } from './core.js';

initChrome('anime');

const ANILIST_QUERY = `
query ($page: Int, $perPage: Int, $genre: String, $endYear: FuzzyDateInt) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, averageScore_greater: 50, genre: $genre, startDate_lesser: $endYear) {
      id
      title { romaji english }
      averageScore
      popularity
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

async function fetchAnimeBatch(filter = 'all') {
  const maxPage = filter === 'all' ? 16 : 8;
  const page = Math.floor(Math.random() * maxPage) + 1;

  try {
    const proxyRes = await fetch(`/api/anime/pool?filter=${encodeURIComponent(filter)}&page=${page}`);
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (Array.isArray(json.anime) && json.anime.length >= 6) return json.anime;
    }
  } catch {}

  const variables = { page, perPage: 25 };
  if (filter === 'action') variables.genre = 'Action';
  else if (filter === 'romance') variables.genre = 'Romance';
  else if (filter === 'fantasy') variables.genre = 'Fantasy';
  else if (filter === 'classic') variables.endYear = 20100101;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_QUERY, variables }),
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
      popularity: a.popularity || 10000,
      year: a.seasonYear || 2005,
      episodes: a.episodes ? `${a.episodes} eps` : a.format || 'Series',
      image: a.coverImage.extraLarge || a.coverImage.large,
      characters: (a.characters?.nodes || [])
        .filter((c) => c.name?.full && c.image?.large && !c.image.large.includes('default.jpg'))
        .map((c) => ({ id: c.id, name: c.name.full, image: c.image.large })),
    }));
}

// ---------- 1. SCORE / POPULARITY / YEAR DUEL ----------
function initScoreDuel() {
  const METRICS = {
    score:      { label: 'SCORE', tip: 'higher or lower AniList rating?', fmt: (v) => v.toFixed(1) },
    popularity: { label: 'FANS',  tip: 'more or fewer AniList members?', fmt: (v) => `${Math.round(v / 1000)}k` },
    year:       { label: 'YEAR',  tip: 'newer (higher year) or older (lower year) release?', fmt: (v) => String(v) },
  };
  let metric = 'score', pool = [], champ = null, chal = null, run = 0, locked = true, token = 0, timer = null;

  const filterSel = document.getElementById('anime-duel-filter');
  const tipEl = document.getElementById('anime-duel-tip');
  const loader = document.getElementById('anime-loader');
  const runEl = document.getElementById('anime-run-score');
  const cImg = document.getElementById('anime-champ-img'), cTitle = document.getElementById('anime-champ-title'), cMeta = document.getElementById('anime-champ-meta'), cLabel = document.getElementById('anime-champ-label'), cScore = document.getElementById('anime-champ-score');
  const rImg = document.getElementById('anime-chal-img'), rTitle = document.getElementById('anime-chal-title'), rMeta = document.getElementById('anime-chal-meta'), rLabel = document.getElementById('anime-chal-label'), rScore = document.getElementById('anime-chal-score');
  const controls = document.getElementById('anime-controls');
  const btnHi = document.getElementById('btn-higher'), btnLo = document.getElementById('btn-lower');
  const statusEl = document.getElementById('anime-status');
  const restartBtn = document.getElementById('anime-restart-btn');

  function draw(ex) {
    const i = pool.findIndex((a) => a.id !== ex);
    return i === -1 ? null : pool.splice(i, 1)[0];
  }

  function render(showR = false) {
    const m = METRICS[metric];
    cImg.src = champ.image; cTitle.textContent = champ.title; cMeta.textContent = `${champ.year} • ${champ.episodes}`;
    cLabel.textContent = m.label; cScore.textContent = m.fmt(champ[metric]);

    rImg.src = chal.image; rTitle.textContent = chal.title; rMeta.textContent = `${metric === 'year' ? '' : chal.year + ' • '}${chal.episodes}`;
    rLabel.textContent = m.label;
    rScore.classList.toggle('mystery', !showR);
    if (showR) {
      if (metric === 'score') animateNumber(rScore, 0, chal.score, { duration: 460, decimals: 1 });
      else if (metric === 'popularity') animateNumber(rScore, 0, Math.round(chal.popularity / 1000), { duration: 480, suffix: 'k' });
      else animateNumber(rScore, 1980, chal.year, { duration: 480 });
    } else {
      rScore.textContent = '???';
    }
  }

  async function startDuel() {
    clearTimeout(timer);
    const t = ++token;
    locked = true; run = 0; runEl.textContent = '0';
    tipEl.textContent = `Does the right-hand challenger have a ${METRICS[metric].tip}`;
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.textContent = 'Loading anime matchup...';
    loader.classList.remove('hidden');

    try {
      if (pool.length < 8) pool = shuffle(await fetchAnimeBatch(filterSel.value));
      if (t !== token) return;
      champ = draw(null); chal = draw(champ?.id);
      if (!champ || !chal) throw new Error('Pool empty');
      await Promise.all([preloadImage(champ.image, 6000), preloadImage(chal.image, 6000)]);
      if (t !== token) return;
      render(false);
      loader.classList.add('hidden');
      btnHi.disabled = false; btnLo.disabled = false;
      locked = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'AniList API hiccup — tap Start New Duel.';
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  function pick(dir) {
    if (locked || !champ || !chal) return;
    const t = token;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const lv = champ[metric], rv = chal[metric];
    const ok = (dir === 'higher' && rv >= lv) || (dir === 'lower' && rv <= lv);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('animeDuel', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Nice! ${chal.title}: ${METRICS[metric].fmt(rv)} — next challenger up...`;
      timer = setTimeout(async () => {
        if (t !== token) return;
        if (pool.length < 4) { try { pool = shuffle([...pool, ...await fetchAnimeBatch(filterSel.value)]); } catch {} }
        champ = chal; chal = draw(champ.id);
        if (!chal) return startDuel();
        await preloadImage(chal.image, 5000);
        if (t !== token) return;
        render(false);
        triggerFlash(document.querySelector('#anime-loader')?.parentElement, 'duel-shift');
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${chal.title}: ${METRICS[metric].fmt(rv)}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; startDuel(); });
  document.querySelectorAll('[data-amode]').forEach((b) => {
    b.addEventListener('click', () => {
      playSfx('click');
      metric = b.dataset.amode;
      document.querySelectorAll('[data-amode]').forEach((x) => x.classList.toggle('active', x === b));
      startDuel();
    });
  });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

// ---------- 2. CHARACTER MATCH (Genre Filter + 4/6 Options!) ----------
function initCharMatch() {
  let pool = [], target = null, charObj = null, hintUsed = false, locked = true, token = 0, choiceCount = 4;

  const filterSel = document.getElementById('char-filter');
  const btnOpt4 = document.getElementById('char-opt-4');
  const btnOpt6 = document.getElementById('char-opt-6');
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
    locked = true; hintUsed = false;
    const basePts = choiceCount === 6 ? 310 : 250;
    ptsBadge.textContent = `+${basePts} PTS`;
    hintBtn.disabled = true;
    nameEl.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Loading character...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'char-img';

    try {
      if (pool.length < choiceCount + 2) {
        const fetched = await fetchAnimeBatch(filterSel.value);
        pool = shuffle(fetched.filter((a) => a.characters && a.characters.length > 0));
      }
      if (t !== token) return;
      if (pool.length < choiceCount) throw new Error('Not enough characters found');

      target = pool.pop();
      charObj = target.characters[Math.floor(Math.random() * target.characters.length)];
      const decoys = shuffle(pool.filter((a) => a.id !== target.id)).slice(0, choiceCount - 1);
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
      locked = false; hintBtn.disabled = false;
    } catch {
      if (t !== token) return;
      loader.textContent = 'Could not load character — tap Retry.';
      nextBtn.textContent = 'Retry ↻';
      nextBtn.classList.remove('hidden');
    }
  }

  function revealName() {
    if (locked || hintUsed) return;
    playSfx('click');
    hintUsed = true; hintBtn.disabled = true;
    ptsBadge.textContent = `+${choiceCount === 6 ? 235 : 175} PTS`;
    nameEl.classList.remove('hidden');
  }

  function handleGuess(sel, btnEl) {
    if (locked || !target) return;
    locked = true; hintBtn.disabled = true;
    nameEl.classList.remove('hidden');
    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === target.id) b.classList.add('correct');
    });
    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (sel.id === target.id) {
      playSfx('correct');
      const base = choiceCount === 6 ? (hintUsed ? 235 : 310) : (hintUsed ? 175 : 250);
      const earned = recordWin('animeChars', base);
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

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); startRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); startRound(); });
  hintBtn.addEventListener('click', revealName);
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

setupModeTabs((mode) => {
  if (mode === 'duel') initScoreDuel();
  if (mode === 'chars') initCharMatch();
});
