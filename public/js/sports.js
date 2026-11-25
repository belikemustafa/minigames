import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, shuffle, escapeHtml, showToast, animateNumber, triggerFlash, burstMilestone, loadJson,
} from './core.js';
const { CRICKET_INTL, CRICKET_IPL, FOOTBALL_STARS, CAREER_PATHS } = await loadJson('./data/sports/sports.json');

initChrome('sports');

// ---------- 1. STAT CLASH (Intl Cricket, IPL, Football) ----------
function initStatClash() {
  const PACK_METRICS = {
    intl: [
      { key: 'runs', label: 'Runs', unit: '' },
      { key: 'wickets', label: 'Wickets', unit: '' },
      { key: 'centuries', label: '100s', unit: '' },
      { key: 'trophies', label: 'ICC Trophies', unit: '' },
    ],
    ipl: [
      { key: 'runs', label: 'IPL Runs', unit: '' },
      { key: 'wickets', label: 'IPL Wickets', unit: '' },
      { key: 'sr', label: 'Strike Rate', unit: '', dec: 1 },
      { key: 'trophies', label: 'IPL Titles', unit: '' },
    ],
    football: [
      { key: 'goals', label: 'Career Goals', unit: '' },
      { key: 'assists', label: 'Assists', unit: '' },
      { key: 'trophies', label: 'Major Trophies', unit: '' },
      { key: 'caps', label: 'Intl Caps', unit: '' },
    ],
  };

  let pack = 'intl', metricIdx = 0, pool = [], left = null, right = null, run = 0, locked = false, timer = null;

  const packSel = document.getElementById('sp-pack');
  const metricsEl = document.getElementById('sp-metrics');
  const runEl = document.getElementById('sp-run');
  const tipEl = document.getElementById('sp-tip');
  const lEmoji = document.getElementById('sp-l-emoji'), lName = document.getElementById('sp-l-name'), lMeta = document.getElementById('sp-l-meta'), lLabel = document.getElementById('sp-l-label'), lVal = document.getElementById('sp-l-val');
  const rEmoji = document.getElementById('sp-r-emoji'), rName = document.getElementById('sp-r-name'), rMeta = document.getElementById('sp-r-meta'), rLabel = document.getElementById('sp-r-label'), rVal = document.getElementById('sp-r-val');
  const controls = document.getElementById('sp-controls');
  const btnHi = document.getElementById('sp-hi'), btnLo = document.getElementById('sp-lo');
  const statusEl = document.getElementById('sp-status');
  const restartBtn = document.getElementById('sp-restart');

  function getList() {
    if (pack === 'ipl') return CRICKET_IPL;
    if (pack === 'football') return FOOTBALL_STARS;
    return CRICKET_INTL;
  }

  function currentMetric() { return PACK_METRICS[pack][metricIdx] || PACK_METRICS[pack][0]; }

  function renderMetricButtons() {
    metricsEl.innerHTML = '';
    PACK_METRICS[pack].forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${i === metricIdx ? ' active' : ''}`;
      b.textContent = m.label;
      b.addEventListener('click', () => {
        playSfx('click');
        metricIdx = i;
        renderMetricButtons();
        startRun();
      });
      metricsEl.appendChild(b);
    });
  }

  function draw(ex) {
    if (pool.length < 3) pool = shuffle(getList());
    const i = pool.findIndex((p) => p.name !== ex);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  }

  function render(showR = false) {
    const m = currentMetric();
    const metaOf = (p) => `${p.country || p.team} • ${p.role}`;
    lEmoji.textContent = left.emoji; lName.textContent = left.name; lMeta.textContent = metaOf(left);
    lLabel.textContent = m.label.toUpperCase();
    lVal.textContent = m.dec ? left[m.key].toFixed(m.dec) : Number(left[m.key]).toLocaleString();

    rEmoji.textContent = right.emoji; rName.textContent = right.name; rMeta.textContent = metaOf(right);
    rLabel.textContent = m.label.toUpperCase();
    rVal.classList.toggle('mystery', !showR);
    if (showR) {
      animateNumber(rVal, 0, right[m.key], { duration: 450, decimals: m.dec || 0, locale: !m.dec });
    } else {
      rVal.textContent = '???';
    }
  }

  function startRun() {
    clearTimeout(timer);
    run = 0; runEl.textContent = '0'; locked = false;
    tipEl.textContent = `Does the right-hand star have MORE or FEWER ${currentMetric().label}?`;
    pool = shuffle(getList());
    left = draw(null); right = draw(left.name);
    statusEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    controls.classList.remove('hidden');
    btnHi.disabled = false; btnLo.disabled = false;
    render(false);
  }

  function pick(dir) {
    if (locked) return;
    locked = true; btnHi.disabled = true; btnLo.disabled = true;
    const m = currentMetric();
    render(true);
    const ok = (dir === 'higher' && right[m.key] >= left[m.key]) || (dir === 'lower' && right[m.key] <= left[m.key]);
    statusEl.classList.remove('hidden', 'good', 'bad');
    if (ok) {
      playSfx('correct');
      run += 1; runEl.textContent = run;
      recordWin(null, 120);
      recordBestValue('sportsClash', run);
      statusEl.classList.add('good');
      statusEl.textContent = `Spot on! ${right.name}: ${m.dec ? right[m.key].toFixed(m.dec) : right[m.key].toLocaleString()} ${m.label}`;
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
      statusEl.textContent = `Run ended! ${right.name}: ${m.dec ? right[m.key].toFixed(m.dec) : right[m.key].toLocaleString()} ${m.label}. Final run: ${run}`;
      controls.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  }

  packSel.addEventListener('change', () => { playSfx('click'); pack = packSel.value; metricIdx = 0; renderMetricButtons(); startRun(); });
  btnHi.addEventListener('click', () => pick('higher'));
  btnLo.addEventListener('click', () => pick('lower'));
  restartBtn.addEventListener('click', () => { playSfx('click'); startRun(); });
  renderMetricButtons();
  startRun();
}

// ---------- 2. CAREER PATH / JERSEY GUESS (Easy 4 / Med 6 / Hard Text-Only Dropdown) ----------
function initCareerPath() {
  let diff = 'easy', pool = [], target = null, hintUsed = false, locked = false, selectedHard = null;

  const sportSel = document.getElementById('cp-sport');
  const btnEasy = document.getElementById('cp-easy'), btnMed = document.getElementById('cp-med'), btnHard = document.getElementById('cp-hard');
  const ptsEl = document.getElementById('cp-pts'), tipEl = document.getElementById('cp-tip');
  const metaEl = document.getElementById('cp-meta'), clubsEl = document.getElementById('cp-clubs');
  const hintBtn = document.getElementById('cp-hint-btn');
  const optionsEl = document.getElementById('cp-options');
  const hardWrap = document.getElementById('cp-hard-wrap'), hardInput = document.getElementById('cp-hard-input'), hardSubmit = document.getElementById('cp-hard-submit'), hardDrop = document.getElementById('cp-hard-dropdown');
  const feedbackEl = document.getElementById('cp-feedback'), nextBtn = document.getElementById('cp-next');

  function getFiltered() {
    const s = sportSel.value;
    return s === 'all' ? CAREER_PATHS : CAREER_PATHS.filter((p) => p.sport === s);
  }

  function renderDropdown(q) {
    hardDrop.innerHTML = '';
    const clean = q.trim().toLowerCase();
    if (!clean || locked) { hardDrop.classList.add('hidden'); return; }
    const hits = getFiltered().filter((p) => p.name.toLowerCase().includes(clean)).slice(0, 10);
    if (!hits.length) { hardDrop.classList.add('hidden'); return; }
    hits.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dropdown-item';
      b.textContent = p.name;
      b.addEventListener('click', () => {
        selectedHard = p;
        hardInput.value = p.name;
        hardDrop.classList.add('hidden');
      });
      hardDrop.appendChild(b);
    });
    hardDrop.classList.remove('hidden');
  }

  function startRound() {
    locked = false; hintUsed = false; selectedHard = null;
    const list = getFiltered();
    if (pool.length < 2) pool = shuffle(list);
    target = pool.pop();

    const basePts = diff === 'hard' ? 320 : diff === 'med' ? 270 : 220;
    ptsEl.textContent = `+${basePts} PTS`;
    btnEasy.classList.toggle('active', diff === 'easy');
    btnMed.classList.toggle('active', diff === 'med');
    btnHard.classList.toggle('active', diff === 'hard');
    optionsEl.classList.toggle('hidden', diff === 'hard');
    hardWrap.classList.toggle('hidden', diff !== 'hard');
    tipEl.textContent = diff === 'hard'
      ? 'Hard Mode: Type the player name and pick from the text-only dropdown.'
      : 'Identify the player from their franchise / club journey.';

    metaEl.textContent = `${target.sport === 'ipl' ? '🏏 IPL' : '⚽ Football'} • ${target.country} • ${target.role}`;
    clubsEl.innerHTML = target.clubs
      .map((c, idx) => `<span class="club-chip">${escapeHtml(c)}</span>${idx < target.clubs.length - 1 ? '<span class="club-arrow">→</span>' : ''}`)
      .join('');

    hintBtn.disabled = false;
    hintBtn.textContent = '👕 Reveal Jersey Number (-50 pts)';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    hardInput.value = ''; hardInput.disabled = false; hardSubmit.disabled = false;
    hardDrop.classList.add('hidden');
    optionsEl.innerHTML = '';

    if (diff !== 'hard') {
      const count = diff === 'med' ? 6 : 4;
      const decoys = shuffle(list.filter((p) => p.name !== target.name)).slice(0, count - 1);
      shuffle([target, ...decoys]).forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.name = p.name;
        btn.textContent = p.name;
        btn.addEventListener('click', () => finish(p.name, btn));
        optionsEl.appendChild(btn);
      });
    }
  }

  function finish(guessedName, btnEl = null) {
    if (locked || !target) return;
    locked = true; hintBtn.disabled = true;
    hardInput.disabled = true; hardSubmit.disabled = true;
    hardDrop.classList.add('hidden');

    optionsEl.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
      if (b.dataset.name === target.name) b.classList.add('correct');
    });

    feedbackEl.classList.remove('hidden', 'good', 'bad');
    if (guessedName === target.name) {
      playSfx('correct');
      const base = diff === 'hard' ? 320 : diff === 'med' ? 270 : 220;
      const earned = recordWin('sportsPath', hintUsed ? base - 50 : base);
      feedbackEl.classList.add('good');
      feedbackEl.textContent = `Nailed it! ${target.name} (${target.jersey}) — +${earned} pts`;
    } else {
      playSfx('wrong');
      if (btnEl) btnEl.classList.add('wrong');
      resetStreak();
      feedbackEl.classList.add('bad');
      feedbackEl.textContent = `That journey belongs to ${target.name} (${target.jersey}).`;
    }
    nextBtn.classList.remove('hidden');
  }

  hardInput.addEventListener('input', () => { selectedHard = null; renderDropdown(hardInput.value); });
  hardInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hardSubmit.click(); } });
  hardSubmit.addEventListener('click', () => {
    if (locked) return;
    const raw = hardInput.value.trim().toLowerCase();
    const hit = (selectedHard && selectedHard.name.toLowerCase() === raw ? selectedHard : null)
      || getFiltered().find((p) => p.name.toLowerCase() === raw);
    if (!hit) return showToast('Select a player from the dropdown list');
    finish(hit.name);
  });
  hintBtn.addEventListener('click', () => {
    if (locked || hintUsed || !target) return;
    playSfx('reveal'); hintUsed = true; hintBtn.disabled = true;
    metaEl.textContent += ` • Jersey ${target.jersey}`;
    const base = diff === 'hard' ? 320 : diff === 'med' ? 270 : 220;
    ptsEl.textContent = `+${base - 50} PTS`;
  });
  sportSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  btnEasy.addEventListener('click', () => { playSfx('click'); diff = 'easy'; startRound(); });
  btnMed.addEventListener('click', () => { playSfx('click'); diff = 'med'; startRound(); });
  btnHard.addEventListener('click', () => { playSfx('click'); diff = 'hard'; startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 3. 60 FPS SUPER OVER & PENALTY SHOOTOUT ----------
function initTimingGame() {
  const canvas = document.getElementById('tm-canvas');
  const ctx = canvas.getContext('2d');
  const btnCricket = document.getElementById('tm-cricket');
  const btnFootball = document.getElementById('tm-football');
  const tipEl = document.getElementById('tm-tip');
  const scoreBadge = document.getElementById('tm-score-badge');
  const leftBadge = document.getElementById('tm-left-badge');
  const actionBtn = document.getElementById('tm-action-btn');
  const feedbackEl = document.getElementById('tm-feedback');

  let mode = 'cricket'; // 'cricket' | 'football'
  let runs = 0, wickets = 0, ballsLeft = 6, goals = 0, kicksLeft = 5;
  let cursor = 0.5, dir = 1, speed = 1.45, targetCenter = 0.5, sweetWidth = 0.11;
  let ballAnim = null, lastResult = '', finished = false, lastTime = 0, raf = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.parentElement.clientWidth || 360;
    const h = 260;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetMatch() {
    runs = 0; wickets = 0; ballsLeft = 6; goals = 0; kicksLeft = 5;
    cursor = 0.2; dir = 1; finished = false; ballAnim = null; lastResult = '';
    speed = mode === 'cricket' ? 1.45 : 1.55;
    targetCenter = 0.35 + Math.random() * 0.3;
    sweetWidth = mode === 'cricket' ? 0.11 : 0.14;
    feedbackEl.classList.add('hidden');
    syncUI();
  }

  function syncUI() {
    btnCricket.classList.toggle('active', mode === 'cricket');
    btnFootball.classList.toggle('active', mode === 'football');
    if (mode === 'cricket') {
      tipEl.textContent = 'Super Over (6 balls, 2 wickets): Tap SWING in the emerald sweet spot for a SIX!';
      scoreBadge.textContent = `${runs}/${wickets}`;
      leftBadge.textContent = `Balls: ${ballsLeft}`;
      actionBtn.textContent = finished ? 'Play New Super Over ↻' : '🏏 SWING NOW!';
    } else {
      tipEl.textContent = 'Penalty Shootout (5 kicks): Time your tap inside the target zone to beat the keeper!';
      scoreBadge.textContent = `Goals: ${goals}`;
      leftBadge.textContent = `Kicks: ${kicksLeft}`;
      actionBtn.textContent = finished ? 'Play New Shootout ↻' : '⚽ SHOOT NOW!';
    }
  }

  function triggerShot() {
    if (finished) { playSfx('click'); resetMatch(); return; }
    if (ballAnim) return;

    const dist = Math.abs(cursor - targetCenter);
    if (mode === 'cricket') {
      ballsLeft -= 1;
      if (dist <= sweetWidth * 0.52) {
        runs += 6; lastResult = '💥 MASSIVE SIX! +6'; playSfx('correct'); recordWin('sportsTiming', 90);
        ballAnim = { t: 0, dur: 0.55, hit: true, power: 1.0, angle: (Math.random() - 0.5) * 0.7 };
      } else if (dist <= sweetWidth * 1.15) {
        runs += 4; lastResult = '🔥 CRACKING FOUR! +4'; playSfx('correct'); recordWin('sportsTiming', 60);
        ballAnim = { t: 0, dur: 0.5, hit: true, power: 0.78, angle: (Math.random() - 0.5) * 0.9 };
      } else if (dist <= sweetWidth * 1.9) {
        const r = Math.random() < 0.5 ? 1 : 2;
        runs += r; lastResult = `✓ Quick ${r} run${r > 1 ? 's' : ''}`; playSfx('click');
        ballAnim = { t: 0, dur: 0.45, hit: true, power: 0.45, angle: (Math.random() - 0.5) * 1.1 };
      } else {
        wickets += 1; lastResult = '💥 BOWLED / CAUGHT! OUT!'; playSfx('wrong'); resetStreak();
        ballAnim = { t: 0, dur: 0.5, hit: false, power: 0.2, angle: 0 };
      }
      speed = Math.min(2.35, speed + 0.14);
      targetCenter = 0.22 + Math.random() * 0.56;

      if (ballsLeft <= 0 || wickets >= 2) {
        finished = true;
        recordBestValue('sportsTiming', runs * 10);
        if (runs >= 18) { playSfx('fanfare'); burstMilestone(`🏏 ${runs} RUNS!`); }
        feedbackEl.classList.remove('hidden', 'bad', 'good');
        feedbackEl.classList.add(runs >= 12 ? 'good' : 'bad');
        feedbackEl.textContent = `Super Over Complete! Final Score: ${runs}/${wickets}`;
      }
    } else {
      kicksLeft -= 1;
      const scored = dist <= sweetWidth * 0.85;
      if (scored) {
        goals += 1; lastResult = dist <= sweetWidth * 0.4 ? '🚀 TOP BINS GOAL!' : '⚽ GOAL!';
        playSfx('correct'); recordWin('sportsTiming', 100);
        ballAnim = { t: 0, dur: 0.55, hit: true, xTo: 0.2 + Math.random() * 0.6 };
      } else {
        lastResult = dist <= sweetWidth * 1.4 ? '🧤 SAVED BY KEEPER!' : '💨 OVER THE BAR!';
        playSfx('wrong'); resetStreak();
        ballAnim = { t: 0, dur: 0.55, hit: false, xTo: 0.5 };
      }
      speed = Math.min(2.4, speed + 0.16);
      targetCenter = 0.22 + Math.random() * 0.56;

      if (kicksLeft <= 0) {
        finished = true;
        recordBestValue('sportsTiming', goals * 50);
        if (goals >= 4) { playSfx('fanfare'); burstMilestone(`⚽ ${goals}/5 GOALS!`); }
        feedbackEl.classList.remove('hidden', 'bad', 'good');
        feedbackEl.classList.add(goals >= 3 ? 'good' : 'bad');
        feedbackEl.textContent = `Shootout Finished! You scored ${goals} / 5 penalties.`;
      }
    }
    syncUI();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;

    const w = canvas.parentElement.clientWidth || 360;
    const h = 260;

    if (!finished && !ballAnim) {
      cursor += dir * speed * dt;
      if (cursor >= 0.96) { cursor = 0.96; dir = -1; }
      if (cursor <= 0.04) { cursor = 0.04; dir = 1; }
    }
    if (ballAnim) {
      ballAnim.t += dt;
      if (ballAnim.t >= ballAnim.dur) ballAnim = null;
    }

    // Draw dark stadium canvas at 60 FPS
    ctx.clearRect(0, 0, w, h);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#091118');
    bgGrad.addColorStop(1, '#0c2419');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Pitch / Goal visual
    if (mode === 'cricket') {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
      ctx.beginPath();
      ctx.moveTo(w * 0.42, 48); ctx.lineTo(w * 0.58, 48);
      ctx.lineTo(w * 0.68, 178); ctx.lineTo(w * 0.32, 178);
      ctx.closePath(); ctx.fill();
      // Stumps
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
      [-8, 0, 8].forEach((dx) => { ctx.beginPath(); ctx.moveTo(w * 0.5 + dx, 152); ctx.lineTo(w * 0.5 + dx, 176); ctx.stroke(); });
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.22, 46, w * 0.56, 76);
      // Keeper
      const kx = w * 0.5 + Math.sin(now * 0.004) * (w * 0.14);
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(kx, 102, 10, 0, Math.PI * 2); ctx.fill();
    }

    // Ball trajectory animation
    if (ballAnim) {
      const p = ballAnim.t / ballAnim.dur;
      const bx = mode === 'cricket'
        ? w * 0.5 + Math.sin(ballAnim.angle || 0) * p * w * 0.42
        : w * 0.5 + ((ballAnim.xTo || 0.5) - 0.5) * w * 0.5 * p;
      const by = 165 - Math.sin(p * Math.PI * (ballAnim.hit ? 0.72 : 1)) * (ballAnim.hit ? 115 : 65);
      ctx.fillStyle = mode === 'cricket' ? '#ef4444' : '#ffffff';
      ctx.beginPath(); ctx.arc(bx, by, 8 * (1 - p * 0.35), 0, Math.PI * 2); ctx.fill();
    }

    // Result flash text
    if (lastResult) {
      ctx.font = '700 16px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3f5f9';
      ctx.fillText(lastResult, w * 0.5, 142);
    }

    // 60 FPS Timing Meter Bar at bottom
    const mx = 24, mw = w - 48, my = 204, mh = 22;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 11); ctx.fill();

    // Outer good zone
    const ox = mx + (targetCenter - sweetWidth * 1.15) * mw;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.36)';
    ctx.fillRect(Math.max(mx, ox), my, Math.min(mw, sweetWidth * 2.3 * mw), mh);

    // Emerald sweet spot
    const sx = mx + (targetCenter - sweetWidth * 0.55) * mw;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(Math.max(mx, sx), my, sweetWidth * 1.1 * mw, mh);

    // Moving indicator needle
    const cx = mx + cursor * mw;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.roundRect(cx - 4, my - 5, 8, mh + 10, 4); ctx.fill();
    ctx.shadowBlur = 0;
  }

  btnCricket.addEventListener('click', () => { playSfx('click'); mode = 'cricket'; resetMatch(); });
  btnFootball.addEventListener('click', () => { playSfx('click'); mode = 'football'; resetMatch(); });
  actionBtn.addEventListener('click', triggerShot);
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerShot(); });
  window.addEventListener('resize', resize, { passive: true });

  resize();
  resetMatch();
  raf = requestAnimationFrame(loop);
}

setupModeTabs((mode) => {
  if (mode === 'clash') initStatClash();
  if (mode === 'path') initCareerPath();
  if (mode === 'timing') initTimingGame();
});
