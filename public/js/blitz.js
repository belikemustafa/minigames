import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, createSeededRng, showToast,
} from './core.js';
import { MACRO_FOODS } from './data/foodData.js';
import { CAREERS } from './data/careersData.js';
import { VOICE_ACTORS } from './data/cartoonsData.js';
import { OUTPUT_QUIZZES, BIGO_QUESTIONS, HTTP_GIT_QUESTIONS } from './data/devData.js';
import { AUTO_SPECS } from './data/autoData.js';

initChrome('blitz');

function buildQuestionBank() {
  const bank = [];

  // Careers: Salary comparison (India LPA)
  for (let i = 0; i + 1 < CAREERS.length; i += 2) {
    const a = CAREERS[i], b = CAREERS[i + 1];
    const winner = a.inSalary >= b.inSalary ? a.name : b.name;
    bank.push({
      cat: 'Careers',
      q: `Which role typically has a higher average mid-career salary in India: ${a.name} or ${b.name}?`,
      answer: winner,
      options: [a.name, b.name],
    });
  }

  // Food: Calorie comparison
  for (let i = 0; i + 1 < MACRO_FOODS.length; i += 2) {
    const a = MACRO_FOODS[i], b = MACRO_FOODS[i + 1];
    const winner = a.calories >= b.calories ? a.name : b.name;
    bank.push({
      cat: 'Food Nutrition',
      q: `Per 100g, which has MORE calories: ${a.name} or ${b.name}?`,
      answer: winner,
      options: [a.name, b.name],
    });
  }

  // Auto: Horsepower comparison
  const allVehicles = [...AUTO_SPECS.bikes, ...AUTO_SPECS.suvs, ...AUTO_SPECS.supercars];
  for (let i = 0; i + 1 < allVehicles.length; i += 2) {
    const a = allVehicles[i], b = allVehicles[i + 1];
    const winner = a.bhp >= b.bhp ? a.name : b.name;
    bank.push({
      cat: 'Bikes & Cars',
      q: `Which machine makes MORE horsepower (BHP): ${a.name} or ${b.name}?`,
      answer: winner,
      options: [a.name, b.name],
    });
  }

  // Cartoons: Voice Actors
  VOICE_ACTORS.forEach((v) => {
    bank.push({ cat: 'Cartoons', q: `${v.actor}: ${v.question}`, answer: v.answer, options: v.options });
  });

  // Dev: Output, Big-O, HTTP/Git
  OUTPUT_QUIZZES.forEach((o) => {
    bank.push({ cat: 'Dev Output', q: `[${o.lang}] What prints? → ${o.code.replace(/\n/g, ' ; ')}`, answer: o.answer, options: o.options });
  });
  BIGO_QUESTIONS.forEach((b) => {
    const opts = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'].includes(b.answer)
      ? ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)']
      : ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'];
    bank.push({ cat: 'Dev Big-O', q: `Time complexity of: ${b.prompt}`, answer: b.answer, options: opts });
  });
  HTTP_GIT_QUESTIONS.forEach((h) => {
    bank.push({ cat: `Dev ${h.tag}`, q: `What does "${h.prompt}" mean?`, answer: h.answer, options: h.options });
  });

  return bank;
}

const QUESTION_BANK = buildQuestionBank();

function initBlitz() {
  let timeLeft = 60, blitzScore = 0, blitzStreak = 0, interval = null, pool = [], current = null, running = false;

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

  function nextQuestion() {
    if (!pool.length) pool = shuffle(QUESTION_BANK);
    current = pool.pop();
    catEl.textContent = current.cat;
    qEl.textContent = current.q;
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
    clearInterval(interval);
    playEl.classList.add('hidden');
    introEl.classList.remove('hidden');
    recordBestValue('blitz', blitzScore);
    resultEl.classList.remove('hidden', 'bad');
    resultEl.classList.add('good');
    resultEl.textContent = `⏱️ Time's up! Final 60s Blitz Score: ${blitzScore} pts`;
    startBtn.textContent = 'Play Again ⚡';
  }

  function startBlitz() {
    playSfx('click');
    running = true;
    timeLeft = 60; blitzScore = 0; blitzStreak = 0;
    timerEl.textContent = '60';
    scoreEl.textContent = '0';
    barEl.style.width = '100%';
    introEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    playEl.classList.remove('hidden');
    pool = shuffle(QUESTION_BANK);
    nextQuestion();

    clearInterval(interval);
    interval = setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = Math.max(0, timeLeft);
      barEl.style.width = `${(Math.max(0, timeLeft) / 60) * 100}%`;
      if (timeLeft <= 0) endBlitz();
    }, 1000);
  }

  startBtn.addEventListener('click', startBlitz);
}

function initChallenge() {
  let seed = '', questions = [], idx = 0, score = 0, locked = false;

  const progressEl = document.getElementById('chal-progress');
  const seedBadge = document.getElementById('chal-seed-badge');
  const copyBtn = document.getElementById('chal-copy-btn');
  const newBtn = document.getElementById('chal-new-btn');
  const catEl = document.getElementById('chal-cat');
  const qEl = document.getElementById('chal-q');
  const optionsEl = document.getElementById('chal-options');
  const feedbackEl = document.getElementById('chal-feedback');
  const nextBtn = document.getElementById('chal-next');

  function randomSeed() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

  function loadSeed(s) {
    seed = s;
    const rng = createSeededRng(seed);
    questions = shuffle(QUESTION_BANK, rng).slice(0, 5).map((q) => ({
      ...q,
      shuffledOptions: shuffle(q.options, rng),
    }));
    idx = 0; score = 0;
    seedBadge.textContent = `SEED: ${seed}`;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'challenge');
    url.searchParams.set('seed', seed);
    window.history.replaceState({}, '', url.toString());
    renderQ();
  }

  function renderQ() {
    locked = false;
    const cur = questions[idx];
    progressEl.textContent = `Q ${idx + 1} / 5 • ${score}/5`;
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
        progressEl.textContent = `Q ${idx + 1} / 5 • ${score}/5`;
        nextBtn.textContent = idx === 4 ? 'Finish & Copy Result 📋' : 'Next Question →';
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  nextBtn.addEventListener('click', () => {
    playSfx('click');
    if (idx < 4) { idx += 1; renderQ(); }
    else {
      const shareText = `Fandom Arcade Challenge (${seed}) — I scored ${score}/5! Play the exact same 5 rounds: ${window.location.href}`;
      navigator.clipboard?.writeText(shareText).then(
        () => showToast('Challenge result & link copied!'),
        () => showToast(`Finished! You scored ${score}/5 on seed ${seed}`)
      );
      feedbackEl.classList.remove('bad');
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `🏆 Final Score: ${score}/5 on Seed ${seed}! Send the link to a friend.`;
    }
  });

  copyBtn.addEventListener('click', () => {
    playSfx('click');
    navigator.clipboard?.writeText(window.location.href).then(
      () => showToast('Challenge link copied!'),
      () => showToast('Copy the URL from your browser bar')
    );
  });

  newBtn.addEventListener('click', () => { playSfx('click'); loadSeed(randomSeed()); });
  const params = new URLSearchParams(window.location.search);
  loadSeed((params.get('seed') || randomSeed()).toUpperCase());
}

setupModeTabs((mode) => {
  if (mode === 'blitz') initBlitz();
  if (mode === 'challenge') initChallenge();
});
