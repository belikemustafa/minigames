import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, createSeededRng, showToast, burstMilestone, triggerFlash,
} from './core.js';
import { WORLD_COUNTRIES } from './data/worldData.js';
import { MACRO_FOODS } from './data/foodData.js';
import { AUTO_SPECS } from './data/autoData.js';
import { OUTPUT_QUIZZES, BIGO_QUESTIONS, HTTP_GIT_QUESTIONS } from './data/devData.js';
import { CRICKET_INTL, FOOTBALL_STARS } from './data/sportsData.js';
import { LYRIC_QUIZZES } from './data/musicData.js';
import { GAME_IDS, STUDIO_MATCHES } from './data/gamingData.js';
import { JUTSU_POWERS, SPACE_BODIES } from './data/cosmosData.js';

initChrome('blitz');

function buildQuestionBank() {
  const bank = [];

  // 1. World Capitals (70)
  WORLD_COUNTRIES.slice(0, 70).forEach((c, idx) => {
    const decoys = WORLD_COUNTRIES.filter((x) => x.code !== c.code)
      .slice((idx * 3) % 45, ((idx * 3) % 45) + 3)
      .map((x) => x.capital);
    bank.push({ group: 'world', cat: 'World Capitals', q: `What is the capital city of ${c.name}?`, answer: c.capital, options: [c.capital, ...decoys] });
  });

  // 2. Food Calories & Protein (80)
  for (let i = 0; i + 1 < MACRO_FOODS.length; i += 2) {
    const a = MACRO_FOODS[i], b = MACRO_FOODS[i + 1];
    bank.push({ group: 'food', cat: 'Food Calories', q: `Per 100g, which has MORE calories: ${a.name} or ${b.name}?`, answer: a.calories >= b.calories ? a.name : b.name, options: [a.name, b.name] });
    bank.push({ group: 'food', cat: 'Food Protein', q: `Per 100g, which has MORE protein: ${a.name} or ${b.name}?`, answer: a.protein >= b.protein ? a.name : b.name, options: [a.name, b.name] });
  }

  // 3. Auto Power & 0-100 (78)
  const allVehicles = [...AUTO_SPECS.bikes, ...AUTO_SPECS.suvs, ...AUTO_SPECS.supercars, ...AUTO_SPECS.jdm];
  for (let i = 0; i + 1 < allVehicles.length; i += 2) {
    const a = allVehicles[i], b = allVehicles[i + 1];
    bank.push({ group: 'auto', cat: 'Bikes & Cars', q: `Which machine makes MORE horsepower (BHP): ${a.name} or ${b.name}?`, answer: a.bhp >= b.bhp ? a.name : b.name, options: [a.name, b.name] });
    bank.push({ group: 'auto', cat: 'Bikes & Cars', q: `Which reaches 0–100 km/h FASTER: ${a.name} or ${b.name}?`, answer: a.zeroTo100 <= b.zeroTo100 ? a.name : b.name, options: [a.name, b.name] });
  }

  // 4. Dev Output, Big-O, HTTP/Git (102)
  OUTPUT_QUIZZES.forEach((o) => {
    bank.push({ group: 'dev', cat: 'Dev Output', q: `[${o.lang}] What prints? → ${o.code.replace(/\n/g, ' ; ')}`, answer: o.answer, options: o.options });
  });
  BIGO_QUESTIONS.forEach((b) => {
    const baseOpts = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'];
    const opts = baseOpts.includes(b.answer) ? baseOpts : ['O(1)', 'O(n)', 'O(n²)', b.answer];
    bank.push({ group: 'dev', cat: 'Dev Big-O', q: `Time complexity of: ${b.prompt}`, answer: b.answer, options: [...new Set(opts)] });
  });
  HTTP_GIT_QUESTIONS.forEach((h) => {
    bank.push({ group: 'dev', cat: `Dev ${h.tag}`, q: `What does "${h.prompt}" mean?`, answer: h.answer, options: h.options });
  });

  // 5. Sports (Cricket & Football Duels)
  for (let i = 0; i + 1 < CRICKET_INTL.length; i += 2) {
    const a = CRICKET_INTL[i], b = CRICKET_INTL[i + 1];
    bank.push({ group: 'sports', cat: 'Cricket', q: `Who scored MORE international runs: ${a.name} or ${b.name}?`, answer: a.runs >= b.runs ? a.name : b.name, options: [a.name, b.name] });
  }
  for (let i = 0; i + 1 < FOOTBALL_STARS.length; i += 2) {
    const a = FOOTBALL_STARS[i], b = FOOTBALL_STARS[i + 1];
    bank.push({ group: 'sports', cat: 'Football', q: `Who scored MORE career goals: ${a.name} or ${b.name}?`, answer: a.goals >= b.goals ? a.name : b.name, options: [a.name, b.name] });
  }

  // 6. Music Lyrics
  LYRIC_QUIZZES.forEach((l) => {
    bank.push({ group: 'music', cat: 'Finish the Lyric', q: `[${l.song}] "${l.lines}..."`, answer: l.answer, options: l.options });
  });

  // 7. Gaming IDs & Studios
  const allTitles = [...new Set(GAME_IDS.map((x) => x.answer))];
  GAME_IDS.forEach((g, idx) => {
    const decoys = allTitles.filter((t) => t !== g.answer).slice(idx % 12, (idx % 12) + 3);
    bank.push({ group: 'gaming', cat: `Gaming ${g.kind}`, q: `Which video game features "${g.clue}"?`, answer: g.answer, options: [g.answer, ...decoys] });
  });
  const allStudios = [...new Set(STUDIO_MATCHES.map((x) => x.studio))];
  STUDIO_MATCHES.forEach((s, idx) => {
    const decoys = allStudios.filter((st) => st !== s.studio).slice(idx % 10, (idx % 10) + 3);
    bank.push({ group: 'gaming', cat: 'Game Studio', q: `Which studio developed ${s.game}?`, answer: s.studio, options: [s.studio, ...decoys] });
  });

  // 8. Battles & Space
  JUTSU_POWERS.forEach((j, idx) => {
    const decoys = JUTSU_POWERS.filter((x) => x.answer !== j.answer).slice(idx % 20, (idx % 20) + 3).map((x) => x.answer);
    bank.push({ group: 'cosmos', cat: j.universe, q: `Who uses "${j.ability}"?`, answer: j.answer, options: [j.answer, ...decoys] });
  });
  for (let i = 0; i + 1 < SPACE_BODIES.length; i += 2) {
    const a = SPACE_BODIES[i], b = SPACE_BODIES[i + 1];
    bank.push({ group: 'cosmos', cat: 'Space', q: `Which has STRONGER surface gravity: ${a.name} or ${b.name}?`, answer: a.gravity >= b.gravity ? a.name : b.name, options: [a.name, b.name] });
  }

  return bank;
}

const QUESTION_BANK = buildQuestionBank();

function initBlitz() {
  let duration = 60, endTime = 0, timerRaf = null, blitzScore = 0, blitzStreak = 0, pool = [], current = null, running = false;
  const activeGroups = new Set(['world', 'food', 'auto', 'dev', 'sports', 'music', 'gaming', 'cosmos']);

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

  const getActivePool = () => QUESTION_BANK.filter((q) => activeGroups.has(q.group));

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
