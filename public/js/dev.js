import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, animateNumber, triggerFlash, loadJson,
} from './core.js';
const {
  FALLBACK_GITHUB_REPOS, BUG_SNIPPETS, OUTPUT_QUIZZES,
  LANG_SNIPPETS, BIGO_QUESTIONS, HTTP_GIT_QUESTIONS, OUTAGE_SCENARIOS,
} = await loadJson('./data/dev/dev.json');

initChrome('dev');

function renderStaticCode(el, codeStr) {
  const lines = String(codeStr).split('\n');
  el.innerHTML = lines
    .map((l, i) => `<div class="code-line"><span class="ln">${i + 1}</span><span>${escapeHtml(l)}</span></div>`)
    .join('');
}

// ---------- 1. GITHUB STARS DUEL (Ecosystem Filter + Live API + 42 Curated) ----------
function initGithubStars() {
  let pool = [], left = null, right = null, run = 0, locked = true, timer = null;

  const catSel = document.getElementById('gh-cat');
  const loader = document.getElementById('gh-loader');
  const runEl = document.getElementById('gh-run');
  const lLang = document.getElementById('gh-l-lang'), lName = document.getElementById('gh-l-name'), lDesc = document.getElementById('gh-l-desc'), lVal = document.getElementById('gh-l-val');
  const rLang = document.getElementById('gh-r-lang'), rName = document.getElementById('gh-r-name'), rDesc = document.getElementById('gh-r-desc'), rVal = document.getElementById('gh-r-val');
  const controls = document.getElementById('gh-controls');
  const btnHi = document.getElementById('gh-higher'), btnLo = document.getElementById('gh-lower');
  const statusEl = document.getElementById('gh-status');
  const restartBtn = document.getElementById('gh-restart');

  function getCurated() {
    const c = catSel.value;
    return c === 'all' ? FALLBACK_GITHUB_REPOS : FALLBACK_GITHUB_REPOS.filter((r) => r.cat === c);
  }

  async function loadRepos() {
    if (catSel.value === 'all') {
      try {
        const res = await fetch('https://api.github.com/search/repositories?q=stars:>35000&sort=stars&order=desc&per_page=60');
        if (res.ok) {
          const json = await res.json();
          const mapped = (json.items || [])
            .filter((r) => r.full_name && r.stargazers_count)
            .map((r) => ({
              name: r.full_name,
              lang: r.language || 'Multi',
              stars: r.stargazers_count,
              desc: (r.description || 'Popular open-source repository').slice(0, 95),
            }));
          if (mapped.length >= 12) return shuffle(mapped);
        }
      } catch {}
    }
    return shuffle(getCurated());
  }

  const fmt = (n) => `${Number(n).toLocaleString()} ★`;
  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getCurated());
    const i = pool.findIndex((r) => r.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    lLang.textContent = left.lang; lName.textContent = left.name; lDesc.textContent = left.desc; lVal.textContent = fmt(left.stars);
    rLang.textContent = right.lang; rName.textContent = right.name; rDesc.textContent = right.desc;
    rVal.classList.toggle('mystery', !showR);
    if (showR) animateNumber(rVal, 0, right.stars, { duration: 480, locale: true, suffix: ' ★' });
    else rVal.textContent = '???';
  }

  async function startDuel() {
    clearTimeout(timer);
    locked = true; run = 0; runEl.textContent = '0';
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = true; btnLo.disabled = true;
    loader.classList.remove('hidden');

    pool = await loadRepos();
    left = draw(null); right = draw(left.name);
    render(false);
    loader.classList.add('hidden');
    btnHi.disabled = false; btnLo.disabled = false;
    locked = false;
  }

  function pick(dir) {
    if (locked) return;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    render(true);
    const ok = (dir === 'higher' && right.stars >= left.stars) || (dir === 'lower' && right.stars <= left.stars);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('devStars', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Correct! ${right.name} has ${fmt(right.stars)}`;
      timer = setTimeout(() => {
        left = right; right = draw(left.name);
        statusEl.classList.add('hidden');
        btnHi.disabled = false; btnLo.disabled = false;
        locked = false;
        render(false);
        triggerFlash(rVal.closest('.duel-arena'), 'duel-shift');
      }, 1150);
    } else {
      playSfx('wrong');
      resetStreak();
      statusEl.classList.add('bad');
      statusEl.textContent = `Run ended! ${right.name} has ${fmt(right.stars)}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  catSel.addEventListener('change', () => { playSfx('click'); startDuel(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startDuel(); });
  startDuel();
}

// ---------- 2. SPOT THE BUG (22 Snippets + Language Filter!) ----------
function initSpotBug() {
  let pool = [], current = null, locked = false;
  const filterSel = document.getElementById('bug-filter');
  const langEl = document.getElementById('bug-lang');
  const titleEl = document.getElementById('bug-title');
  const codeEl = document.getElementById('bug-code');
  const feedbackEl = document.getElementById('bug-feedback');
  const nextBtn = document.getElementById('bug-next');

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? BUG_SNIPPETS : BUG_SNIPPETS.filter((b) => b.lang === f);
  }

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    langEl.textContent = current.lang;
    titleEl.textContent = `Task: ${current.title} — Tap the exact line with the bug.`;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    codeEl.innerHTML = '';

    current.lines.forEach((line, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-line tappable';
      btn.dataset.idx = idx;
      btn.innerHTML = `<span class="ln">${idx + 1}</span><span>${escapeHtml(line || ' ')}</span>`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        codeEl.querySelectorAll('.code-line').forEach((b) => {
          b.disabled = true;
          if (Number(b.dataset.idx) === current.bugLine) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (idx === current.bugLine) {
          playSfx('correct');
          const earned = recordWin('devBug', 220);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Bug squashed (+${earned} pts)! ${current.explanation}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Bug was on Line ${current.bugLine + 1}. ${current.explanation}`;
        }
        nextBtn.classList.remove('hidden');
      });
      codeEl.appendChild(btn);
    });
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 3. WHAT'S THE OUTPUT? (22 Quizzes + Language Filter!) ----------
function initOutput() {
  let pool = [], current = null, locked = false;
  const filterSel = document.getElementById('out-filter');
  const langEl = document.getElementById('out-lang');
  const codeEl = document.getElementById('out-code');
  const optionsEl = document.getElementById('out-options');
  const feedbackEl = document.getElementById('out-feedback');
  const nextBtn = document.getElementById('out-next');

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? OUTPUT_QUIZZES : OUTPUT_QUIZZES.filter((q) => q.lang === f);
  }

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    langEl.textContent = current.lang;
    renderStaticCode(codeEl, current.code);
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    shuffle(current.options).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.style.fontFamily = 'ui-monospace, monospace';
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
          const earned = recordWin('devOutput', 200);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Correct (+${earned} pts)! ${current.note}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Output is ${current.answer}. ${current.note}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 4. GUESS THE LANGUAGE (20 Languages + 4/6 Options!) ----------
function initLang() {
  let pool = [], current = null, hintUsed = false, locked = false, choiceCount = 4;
  const ALL_LANGS = LANG_SNIPPETS.map((l) => l.answer);
  const btnOpt4 = document.getElementById('lang-opt-4');
  const btnOpt6 = document.getElementById('lang-opt-6');
  const ptsEl = document.getElementById('lang-pts');
  const codeEl = document.getElementById('lang-code');
  const hintBtn = document.getElementById('lang-hint-btn');
  const hintBox = document.getElementById('lang-hint-box');
  const optionsEl = document.getElementById('lang-options');
  const feedbackEl = document.getElementById('lang-feedback');
  const nextBtn = document.getElementById('lang-next');

  function nextRound() {
    locked = false; hintUsed = false;
    if (!pool.length) pool = shuffle(LANG_SNIPPETS);
    current = pool.pop();
    const basePts = choiceCount === 6 ? 260 : 200;
    ptsEl.textContent = `+${basePts} PTS`;
    hintBtn.disabled = false;
    hintBox.classList.add('hidden');
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    renderStaticCode(codeEl, current.code);
    optionsEl.innerHTML = '';

    const decoys = shuffle(ALL_LANGS.filter((l) => l !== current.answer)).slice(0, choiceCount - 1);
    shuffle([current.answer, ...decoys]).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === current.answer) {
          playSfx('correct');
          const earned = recordWin('devLang', hintUsed ? basePts - 50 : basePts);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Sharp syntax radar! It's ${current.answer} — +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That snippet is ${current.answer}.`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  btnOpt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; btnOpt4.classList.add('active'); btnOpt6.classList.remove('active'); nextRound(); });
  btnOpt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; btnOpt6.classList.add('active'); btnOpt4.classList.remove('active'); nextRound(); });
  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed || !current) return;
    playSfx('click'); hintUsed = true; hintBtn.disabled = true;
    ptsEl.textContent = `+${choiceCount === 6 ? 210 : 150} PTS`;
    hintBox.textContent = current.hint;
    hintBox.classList.remove('hidden');
  });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 5. BIG-O BLITZ (24 Questions, Dynamic 6-Button Complexity Pad!) ----------
function initBigO() {
  const ALL_BIGO = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];
  let pool = [], current = null, locked = false;
  const promptEl = document.getElementById('bigo-prompt');
  const optionsEl = document.getElementById('bigo-options');
  const feedbackEl = document.getElementById('bigo-feedback');
  const nextBtn = document.getElementById('bigo-next');

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(BIGO_QUESTIONS);
    current = pool.pop();
    promptEl.textContent = current.prompt;
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    const decoys = shuffle(ALL_BIGO.filter((x) => x !== current.answer)).slice(0, 5);
    const ordered = [current.answer, ...decoys].sort((a, b) => ALL_BIGO.indexOf(a) - ALL_BIGO.indexOf(b));

    ordered.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.style.fontFamily = 'ui-monospace, monospace';
      btn.textContent = c;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === current.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (c === current.answer) {
          playSfx('correct');
          const earned = recordWin('devBigO', 160);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Exact! ${current.answer} (+${earned} pts) — ${current.note}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Answer: ${current.answer}. ${current.note}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 6. HTTP, GIT, LINUX & DOCKER SURVIVAL (30 Cards + Topic Filter!) ----------
function initHttpGit() {
  let pool = [], current = null, locked = false;
  const filterSel = document.getElementById('http-filter');
  const tagEl = document.getElementById('http-tag');
  const promptEl = document.getElementById('http-prompt');
  const optionsEl = document.getElementById('http-options');
  const feedbackEl = document.getElementById('http-feedback');
  const nextBtn = document.getElementById('http-next');

  function getFiltered() {
    const f = filterSel.value;
    return f === 'all' ? HTTP_GIT_QUESTIONS : HTTP_GIT_QUESTIONS.filter((q) => q.tag === f);
  }

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    tagEl.textContent = current.tag;
    promptEl.textContent = current.prompt;
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
          const earned = recordWin('devHttp', 180);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Survived! +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Correct meaning: ${current.answer}`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  filterSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

// ---------- 7. PROD OUTAGE SIMULATOR (14 Incidents!) ----------
function initOutage() {
  let scenarios = [], idx = 0, uptime = 99.9, latency = 140, locked = false;
  const stepEl = document.getElementById('outage-step');
  const upEl = document.getElementById('outage-uptime');
  const latEl = document.getElementById('outage-latency');
  const titleEl = document.getElementById('outage-title');
  const descEl = document.getElementById('outage-desc');
  const choicesEl = document.getElementById('outage-choices');
  const feedbackEl = document.getElementById('outage-feedback');
  const nextBtn = document.getElementById('outage-next');

  function syncMeters() {
    uptime = Math.max(60, Math.min(99.99, uptime));
    latency = Math.max(45, latency);
    upEl.textContent = `${uptime.toFixed(1)}%`;
    latEl.textContent = `${Math.round(latency)} ms`;
  }

  function startShift() {
    scenarios = shuffle(OUTAGE_SCENARIOS);
    idx = 0; uptime = 99.9; latency = 140;
    syncMeters();
    renderScenario();
  }

  function renderScenario() {
    locked = false;
    const sc = scenarios[idx];
    stepEl.textContent = `Incident ${idx + 1} / ${scenarios.length}`;
    titleEl.textContent = `🚨 ${sc.title}`;
    descEl.textContent = sc.situation;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    choicesEl.innerHTML = '';

    shuffle(sc.choices).forEach((ch) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = ch.text;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        uptime += ch.uptimeDelta;
        latency += ch.latencyDelta;
        syncMeters();

        choicesEl.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true));
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (ch.good) {
          playSfx('correct');
          btn.classList.add('correct');
          const earned = recordWin('devOutage', 220);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Incident mitigated (+${earned} pts)! ${ch.outcome}`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `SEV-1 Escalation! ${ch.outcome}`;
        }
        nextBtn.textContent = idx + 1 >= scenarios.length ? 'Start New On-Call Shift ↻' : 'Next Incident →';
        nextBtn.classList.remove('hidden');
      });
      choicesEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => {
    playSfx('click');
    idx += 1;
    if (idx >= scenarios.length) startShift();
    else renderScenario();
  });
  startShift();
}

setupModeTabs((mode) => {
  if (mode === 'stars') initGithubStars();
  if (mode === 'bug') initSpotBug();
  if (mode === 'output') initOutput();
  if (mode === 'lang') initLang();
  if (mode === 'bigo') initBigO();
  if (mode === 'http') initHttpGit();
  if (mode === 'outage') initOutage();
  if (mode === 'livetrivia') initLiveCsTrivia();
});


// ---------- 8. LIVE CS TRIVIA (Open Trivia DB Proxy + Direct Fallback) ----------
function initLiveCsTrivia() {
  let pool = [], current = null, locked = true;
  const loader = document.getElementById('dev-lt-loader');
  const diffEl = document.getElementById('dev-lt-diff');
  const qEl = document.getElementById('dev-lt-q');
  const optionsEl = document.getElementById('dev-lt-options');
  const feedbackEl = document.getElementById('dev-lt-feedback');
  const nextBtn = document.getElementById('dev-lt-next');

  function decode(s) {
    const el = document.createElement('textarea');
    el.innerHTML = s || '';
    return el.value;
  }

  async function refill() {
    try {
      const r = await fetch('/api/trivia/live?cat=dev&amount=15');
      if (r.ok) { const j = await r.json(); if (j.questions?.length) return shuffle(j.questions); }
    } catch {}
    const r2 = await fetch('https://opentdb.com/api.php?amount=15&category=18&type=multiple');
    if (!r2.ok) throw new Error('OpenTDB unavailable');
    const j2 = await r2.json();
    return shuffle((j2.results || []).map((q) => {
      const ans = decode(q.correct_answer);
      return { difficulty: q.difficulty, q: decode(q.question), answer: ans, options: [ans, ...(q.incorrect_answers || []).map(decode)] };
    }));
  }

  async function nextRound() {
    locked = true;
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    optionsEl.innerHTML = '';
    if (!pool.length) {
      loader.textContent = 'Fetching live CS questions...';
      loader.classList.remove('hidden');
      try { pool = await refill(); } catch {
        loader.textContent = 'Open Trivia DB busy — tap Retry.';
        nextBtn.textContent = 'Retry ↻';
        nextBtn.classList.remove('hidden');
        return;
      }
    }
    loader.classList.add('hidden');
    current = pool.pop();
    diffEl.textContent = (current.difficulty || 'live').toUpperCase();
    qEl.textContent = current.q;

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
          const earned = recordWin('devHttp', 190);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Correct! +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Answer: ${current.answer}`;
        }
        nextBtn.textContent = 'Next Live Question →';
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
    locked = false;
  }

  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}
