import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, createSeededRng, showToast, burstMilestone, triggerFlash, loadJson,
} from './core.js';

initChrome('blitz');

const [foodData, autoData, devData, sportsData, musicData, gamingData, mechQ, archQ, codesQ] = await Promise.all([
  loadJson('./data/food/food.json'),
  loadJson('./data/auto/auto.json'),
  loadJson('./data/dev/dev.json'),
  loadJson('./data/sports/sports.json'),
  loadJson('./data/music/music.json'),
  loadJson('./data/gaming/gaming.json'),
  loadJson('./data/engineering/mech-questions.json'),
  loadJson('./data/engineering/arch-questions.json'),
  loadJson('./data/engineering/codes-units.json'),
]);

function buildQuestionBank() {
  const bank = [];

  // 1. Engineering (Mech + Arch + Codes: 204 questions!)
  mechQ.forEach((m) => bank.push({ group: 'engineering', cat: `Mech: ${m.topic}`, q: m.q, answer: m.answer, options: m.options }));
  archQ.forEach((a) => bank.push({ group: 'engineering', cat: `Arch: ${a.topic}`, q: a.q, answer: a.answer, options: a.options }));
  codesQ.forEach((c, idx) => {
    const decoys = codesQ.filter((x) => x.answer !== c.answer).slice((idx * 5) % 45, ((idx * 5) % 45) + 3).map((x) => x.answer);
    bank.push({ group: 'engineering', cat: `Eng ${c.cat}`, q: `What is "${c.prompt}"?`, answer: c.answer, options: [c.answer, ...decoys] });
  });

  // 2. Food Calories & Protein
  const foods = foodData.MACRO_FOODS;
  for (let i = 0; i + 1 < foods.length; i += 2) {
    const a = foods[i], b = foods[i + 1];
    bank.push({ group: 'food', cat: 'Food Calories', q: `Per 100g, which has MORE calories: ${a.name} or ${b.name}?`, answer: a.calories >= b.calories ? a.name : b.name, options: [a.name, b.name] });
    bank.push({ group: 'food', cat: 'Food Protein', q: `Per 100g, which has MORE protein: ${a.name} or ${b.name}?`, answer: a.protein >= b.protein ? a.name : b.name, options: [a.name, b.name] });
  }

  // 3. Auto Power & 0-100
  const allVehicles = Object.values(autoData.AUTO_SPECS).flat();
  for (let i = 0; i + 1 < allVehicles.length; i += 2) {
    const a = allVehicles[i], b = allVehicles[i + 1];
    bank.push({ group: 'auto', cat: 'Bikes & Cars', q: `Which machine makes MORE horsepower (BHP): ${a.name} or ${b.name}?`, answer: a.bhp >= b.bhp ? a.name : b.name, options: [a.name, b.name] });
    bank.push({ group: 'auto', cat: 'Bikes & Cars', q: `Which reaches 0–100 km/h FASTER: ${a.name} or ${b.name}?`, answer: a.zeroTo100 <= b.zeroTo100 ? a.name : b.name, options: [a.name, b.name] });
  }

  // 4. Dev Output, Big-O, HTTP/Git
  devData.OUTPUT_QUIZZES.forEach((o) => {
    bank.push({ group: 'dev', cat: 'Dev Output', q: `[${o.lang}] What prints? → ${o.code.replace(/\n/g, ' ; ')}`, answer: o.answer, options: o.options });
  });
  devData.BIGO_QUESTIONS.forEach((b) => {
    const baseOpts = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'];
    const opts = baseOpts.includes(b.answer) ? baseOpts : ['O(1)', 'O(n)', 'O(n²)', b.answer];
    bank.push({ group: 'dev', cat: 'Dev Big-O', q: `Time complexity of: ${b.prompt}`, answer: b.answer, options: [...new Set(opts)] });
  });
  devData.HTTP_GIT_QUESTIONS.forEach((h) => {
    bank.push({ group: 'dev', cat: `Dev ${h.tag}`, q: `What does "${h.prompt}" mean?`, answer: h.answer, options: h.options });
  });

  // 5. Sports (Cricket & Football)
  for (let i = 0; i + 1 < sportsData.CRICKET_INTL.length; i += 2) {
    const a = sportsData.CRICKET_INTL[i], b = sportsData.CRICKET_INTL[i + 1];
    bank.push({ group: 'sports', cat: 'Cricket', q: `Who scored MORE international runs: ${a.name} or ${b.name}?`, answer: a.runs >= b.runs ? a.name : b.name, options: [a.name, b.name] });
  }
  for (let i = 0; i + 1 < sportsData.FOOTBALL_STARS.length; i += 2) {
    const a = sportsData.FOOTBALL_STARS[i], b = sportsData.FOOTBALL_STARS[i + 1];
    bank.push({ group: 'sports', cat: 'Football', q: `Who scored MORE career goals: ${a.name} or ${b.name}?`, answer: a.goals >= b.goals ? a.name : b.name, options: [a.name, b.name] });
  }

  // 6. Music Lyrics
  musicData.LYRIC_QUIZZES.forEach((l) => {
    bank.push({ group: 'music', cat: 'Finish the Lyric', q: `[${l.song}] "${l.lines}..."`, answer: l.answer, options: l.options });
  });

  // 7. Gaming IDs & Studios
  const allTitles = [...new Set(gamingData.GAME_IDS.map((x) => x.answer))];
  gamingData.GAME_IDS.forEach((g, idx) => {
    const decoys = allTitles.filter((t) => t !== g.answer).slice(idx % 16, (idx % 16) + 3);
    bank.push({ group: 'gaming', cat: `Gaming ${g.kind}`, q: `Which video game features "${g.clue}"?`, answer: g.answer, options: [g.answer, ...decoys] });
  });
  const allStudios = [...new Set(gamingData.STUDIO_MATCHES.map((x) => x.studio))];
  gamingData.STUDIO_MATCHES.forEach((s, idx) => {
    const decoys = allStudios.filter((st) => st !== s.studio).slice(idx % 12, (idx % 12) + 3);
    bank.push({ group: 'gaming', cat: 'Game Studio', q: `Which studio developed ${s.game}?`, answer: s.studio, options: [s.studio, ...decoys] });
  });

  return bank;
}

const QUESTION_BANK = buildQuestionBank();

function initBlitz() {
  let duration = 60, endTime = 0, timerRaf = null, blitzScore = 0, blitzStreak = 0, pool = [], current = null, running = false;
  const activeGroups = new Set(['engineering', 'food', 'auto', 'dev', 'sports', 'music', 'gaming', 'live']);
  let liveQuestions = [];

  const timerEl = document.getElementById('blitz-timer');
  const scoreEl = document.getElementById('blitz-score');
  const barEl = document.getElementById('blitz-bar');
  const introEl = document.getElementById('blitz-intro');
  const playEl = document.getElementById('blitz-play');
  const startBtn = document.getElementById('blitz-start-btn');
  const catEl = document.getElementById('blitz-cat');
  const qEl = document.getElementById('blitz-q');
  const optionsEl = document.getElementById('blitz-options');
  const resultEl = document.getElementById('blitz-result');

  async function prefetchLive() {
    try {
      const r = await fetch('/api/trivia/live?cat=all&amount=20');
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.questions)) {
          liveQuestions = j.questions.map((q) => ({ ...q, group: 'live', cat: `🌐 ${q.cat}` }));
          return;
        }
      }
    } catch {}
    try {
      const r2 = await fetch('https://opentdb.com/api.php?amount=20&type=multiple');
      if (r2.ok) {
        const j2 = await r2.json();
        const dec = (s) => { const el = document.createElement('textarea'); el.innerHTML = s || ''; return el.value; };
        liveQuestions = (j2.results || []).map((q) => {
          const ans = dec(q.correct_answer);
          return { group: 'live', cat: `🌐 ${dec(q.category)}`, q: dec(q.question), answer: ans, options: [ans, ...(q.incorrect_answers || []).map(dec)] };
        });
      }
    } catch {}
  }
  prefetchLive();

  const getActivePool = () => {
    const local = QUESTION_BANK.filter((q) => activeGroups.has(q.group));
    return activeGroups.has('live') && liveQuestions.length ? [...local, ...liveQuestions] : local;
  };

  function nextQuestion() {
    if (!pool.length) pool = shuffle(getActivePool());
    current = pool.pop();
    catEl.textContent = current.cat;
    qEl.textContent = current.q;
    triggerFlash(qEl.parentElement, 'fx-pop');
    optionsEl.innerHTML = '';

    shuffle(current.options).forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (!running) return;
        if (opt === current.answer) {
          playSfx('correct');
          blitzStreak += 1;
          const pts = 100 + Math.min(blitzStreak * 20, 100);
          blitzScore += pts;
          scoreEl.textContent = blitzScore;
          recordWin(null, pts);
        } else {
          playSfx('wrong');
          blitzStreak = 0;
          resetStreak();
        }
        nextQuestion();
      });
      optionsEl.appendChild(btn);
    });
  }

  function endBlitz() {
    running = false;
    if (timerRaf) cancelAnimationFrame(timerRaf);
    timerRaf = null;
    barEl.style.transform = 'scaleX(0)';
    barEl.classList.remove('warn', 'danger');
    playEl.classList.add('hidden');
    introEl.classList.remove('hidden');
    recordBestValue('blitz', blitzScore);
    playSfx('fanfare');
    burstMilestone(`⚡ ${blitzScore} PTS!`);
    resultEl.classList.remove('hidden', 'bad');
    resultEl.classList.add('good');
    resultEl.textContent = `⏱️ Time's up! Final ${duration}s Blitz Score: ${blitzScore} pts`;
    startBtn.textContent = 'Play Again ⚡';
  }

  function tickTimer(now) {
    if (!running) return;
    const remMs = Math.max(0, endTime - now);
    const ratio = remMs / (duration * 1000);
    const secs = Math.ceil(remMs / 1000);
    if (timerEl.textContent !== String(secs)) timerEl.textContent = String(secs);
    barEl.style.transform = `scaleX(${ratio.toFixed(4)})`;
    barEl.classList.toggle('warn', secs <= 20 && secs > 10);
    barEl.classList.toggle('danger', secs <= 10);
    if (remMs <= 0) endBlitz();
    else timerRaf = requestAnimationFrame(tickTimer);
  }

  function startBlitz() {
    if (!activeGroups.size) return showToast('Select at least 1 category first!');
    playSfx('click');
    running = true; blitzScore = 0; blitzStreak = 0;
    endTime = performance.now() + duration * 1000;
    timerEl.textContent = String(duration);
    scoreEl.textContent = '0';
    barEl.classList.remove('warn', 'danger');
    barEl.style.transform = 'scaleX(1)';
    introEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    playEl.classList.remove('hidden');
    pool = shuffle(getActivePool());
    if (activeGroups.has('live')) prefetchLive();
    nextQuestion();
    if (timerRaf) cancelAnimationFrame(timerRaf);
    timerRaf = requestAnimationFrame(tickTimer);
  }

  document.querySelectorAll('[data-btime]').forEach((b) => {
    b.addEventListener('click', () => {
      if (running) return;
      playSfx('click');
      duration = Number(b.dataset.btime) || 60;
      timerEl.textContent = String(duration);
      document.querySelectorAll('[data-btime]').forEach((x) => x.classList.toggle('active', x === b));
    });
  });

  document.querySelectorAll('[data-bcat]').forEach((b) => {
    b.addEventListener('click', () => {
      if (running) return;
      playSfx('click');
      const g = b.dataset.bcat;
      if (activeGroups.has(g) && activeGroups.size === 1) return showToast('Keep at least 1 category active');
      if (activeGroups.has(g)) activeGroups.delete(g);
      else activeGroups.add(g);
      b.classList.toggle('active', activeGroups.has(g));
    });
  });

  startBtn.addEventListener('click', startBlitz);
}

function initChallenge() {
  let seed = '', roundCount = 5, questions = [], idx = 0, score = 0, locked = false;

  const progressEl = document.getElementById('chal-progress');
  const seedBadge = document.getElementById('chal-seed-badge');
  const copyBtn = document.getElementById('chal-copy-btn');
  const newBtn = document.getElementById('chal-new-btn');
  const catEl = document.getElementById('chal-cat');
  const qEl = document.getElementById('chal-q');
  const optionsEl = document.getElementById('chal-options');
  const feedbackEl = document.getElementById('chal-feedback');
  const nextBtn = document.getElementById('chal-next');

  const randomSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  function loadSeed(s, len = roundCount) {
    seed = s; roundCount = len;
    document.querySelectorAll('[data-clen]').forEach((b) => b.classList.toggle('active', Number(b.dataset.clen) === roundCount));
    const rng = createSeededRng(`${seed}-${roundCount}`);
    questions = shuffle(QUESTION_BANK, rng).slice(0, roundCount).map((q) => ({
      ...q,
      shuffledOptions: shuffle(q.options, rng),
    }));
    idx = 0; score = 0;
    seedBadge.textContent = `SEED: ${seed}`;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'challenge');
    url.searchParams.set('seed', seed);
    url.searchParams.set('len', String(roundCount));
    window.history.replaceState({}, '', url.toString());
    renderQ();
  }

  function renderQ() {
    locked = false;
    const cur = questions[idx];
    progressEl.textContent = `Q ${idx + 1} / ${roundCount} • ${score}/${roundCount}`;
    catEl.textContent = cur.cat;
    qEl.textContent = cur.q;
    optionsEl.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');

    cur.shuffledOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === cur.answer) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (opt === cur.answer) {
          playSfx('correct');
          score += 1;
          recordWin(null, 150);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Correct! (${score}/${idx + 1})`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Answer: ${cur.answer}`;
        }
        progressEl.textContent = `Q ${idx + 1} / ${roundCount} • ${score}/${roundCount}`;
        nextBtn.textContent = idx === roundCount - 1 ? 'Finish & Copy Result 📋' : 'Next Question →';
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => {
    playSfx('click');
    if (idx < roundCount - 1) { idx += 1; renderQ(); }
    else {
      const shareText = `Fandom Arcade Challenge (${seed}) — I scored ${score}/${roundCount}! Play the exact same ${roundCount} rounds: ${window.location.href}`;
      navigator.clipboard?.writeText(shareText).then(
        () => showToast('Challenge result & link copied!'),
        () => showToast(`Finished! You scored ${score}/${roundCount} on seed ${seed}`)
      );
      feedbackEl.classList.remove('bad');
      feedbackEl.classList.add('good');
      playSfx('fanfare');
      burstMilestone(`🏆 ${score}/${roundCount}!`);
      feedbackEl.textContent = `🏆 Final Score: ${score}/${roundCount} on Seed ${seed}! Send the link to a friend.`;
    }
  });

  document.querySelectorAll('[data-clen]').forEach((b) => {
    b.addEventListener('click', () => { playSfx('click'); loadSeed(seed, Number(b.dataset.clen) || 5); });
  });
  copyBtn.addEventListener('click', () => {
    playSfx('click');
    navigator.clipboard?.writeText(window.location.href).then(
      () => showToast('Challenge link copied!'),
      () => showToast('Copy the URL from your browser bar')
    );
  });
  newBtn.addEventListener('click', () => { playSfx('click'); loadSeed(randomSeed(), roundCount); });

  const params = new URLSearchParams(window.location.search);
  const initLen = [5, 10, 15].includes(Number(params.get('len'))) ? Number(params.get('len')) : 5;
  loadSeed((params.get('seed') || randomSeed()).toUpperCase(), initLen);
}

setupModeTabs((mode) => {
  if (mode === 'blitz') initBlitz();
  if (mode === 'challenge') initChallenge();
});
