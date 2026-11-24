import {
  initChrome, setupModeTabs, playSfx, recordWin, recordBestValue,
  resetStreak, state, burstMilestone,
} from './core.js';

initChrome('arcade');

let activeGame = 'stack';

// ---------- 1. STACK TOWER (60 FPS Slice Physics) ----------
function initStack() {
  const canvas = document.getElementById('st-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('st-score');
  const comboEl = document.getElementById('st-combo');
  const bestEl = document.getElementById('st-best');
  const btn = document.getElementById('st-btn');

  let w = 360, h = 400;
  let stack = [], moving = null, debris = [], heightScore = 0, combo = 0, camY = 0, gameOver = false, lastT = 0;
  const BH = 24;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.parentElement.clientWidth || 360;
    h = 400;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function blockColor(level) {
    const hue = (155 + level * 9) % 360;
    return `hsl(${hue}, 68%, 52%)`;
  }

  function reset() {
    resize();
    heightScore = 0; combo = 0; camY = 0; gameOver = false; debris = [];
    const bw = Math.min(180, w * 0.5);
    stack = [{ x: (w - bw) / 2, w: bw, y: h - 46, color: blockColor(0) }];
    spawnNext();
    scoreEl.textContent = 'Height: 0';
    comboEl.textContent = 'Combo: 0';
    bestEl.textContent = state.bests.arcStack || 0;
    btn.textContent = 'DROP BLOCK';
  }

  function spawnNext() {
    const top = stack[stack.length - 1];
    const level = stack.length;
    const spd = Math.min(360, 145 + level * 9);
    moving = {
      x: level % 2 === 0 ? 12 : w - top.w - 12,
      w: top.w,
      y: top.y - BH,
      vx: level % 2 === 0 ? spd : -spd,
      color: blockColor(level),
    };
  }

  function drop() {
    if (gameOver) { playSfx('click'); reset(); return; }
    if (!moving) return;
    const top = stack[stack.length - 1];
    const overlapLeft = Math.max(moving.x, top.x);
    const overlapRight = Math.min(moving.x + moving.w, top.x + top.w);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 2) {
      gameOver = true;
      debris.push({ x: moving.x, y: moving.y, w: moving.w, vy: 20, rot: 0, vrot: 2.2, color: moving.color, alpha: 1 });
      moving = null;
      playSfx('wrong');
      resetStreak();
      btn.textContent = `Tower Fell at ${heightScore}! Tap to Restart ↻`;
      return;
    }

    const perfect = Math.abs(moving.x - top.x) <= 6;
    if (perfect) {
      combo += 1;
      const grownW = Math.min(w * 0.55, top.w + (combo >= 3 ? 6 : 0));
      stack.push({ x: top.x - (grownW - top.w) / 2, w: grownW, y: moving.y, color: moving.color });
      playSfx('correct');
      recordWin(null, 40 + combo * 10);
      if (combo === 5) burstMilestone('🧱 5x PERFECT!');
    } else {
      combo = 0;
      const cutLeft = moving.x < top.x;
      const cutW = moving.w - overlap;
      const cutX = cutLeft ? moving.x : overlapRight;
      debris.push({ x: cutX, y: moving.y, w: cutW, vy: 10, rot: 0, vrot: cutLeft ? -2.8 : 2.8, color: moving.color, alpha: 1 });
      stack.push({ x: overlapLeft, w: overlap, y: moving.y, color: moving.color });
      playSfx('click');
      recordWin(null, 25);
    }

    heightScore += 1;
    scoreEl.textContent = `Height: ${heightScore}`;
    comboEl.textContent = `Combo: ${combo}`;
    if (heightScore > (state.bests.arcStack || 0)) {
      recordBestValue('arcStack', heightScore);
      bestEl.textContent = heightScore;
    }
    spawnNext();
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (activeGame !== 'stack') { lastT = now; return; }
    const dt = Math.min((now - (lastT || now)) / 1000, 0.05);
    lastT = now;

    if (moving && !gameOver) {
      moving.x += moving.vx * dt;
      if (moving.x <= 6) { moving.x = 6; moving.vx = Math.abs(moving.vx); }
      if (moving.x + moving.w >= w - 6) { moving.x = w - 6 - moving.w; moving.vx = -Math.abs(moving.vx); }
    }

    const targetCam = Math.max(0, (stack.length - 7) * BH);
    camY += (targetCam - camY) * Math.min(1, dt * 8);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(0, camY);

    stack.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, BH - 2, 5); ctx.fill();
    });

    if (moving) {
      ctx.fillStyle = moving.color;
      ctx.shadowColor = moving.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.roundRect(moving.x, moving.y, moving.w, BH - 2, 5); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.vy += 650 * dt;
      d.y += d.vy * dt;
      d.rot += d.vrot * dt;
      d.alpha -= dt * 1.1;
      if (d.alpha <= 0) { debris.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.translate(d.x + d.w / 2, d.y + BH / 2);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.w / 2, -BH / 2, d.w, BH - 2);
      ctx.restore();
    }

    ctx.restore();
  }

  btn.addEventListener('click', drop);
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
  window.addEventListener('keydown', (e) => { if (activeGame === 'stack' && e.code === 'Space') { e.preventDefault(); drop(); } });
  window.addEventListener('resize', resize, { passive: true });
  reset();
  requestAnimationFrame(loop);
}

// ---------- 2. ASTEROID DRIFT (60 FPS Touch Steering + Near-Miss Bonuses) ----------
function initDrift() {
  const canvas = document.getElementById('dr-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('dr-score');
  const speedEl = document.getElementById('dr-speed');
  const bestEl = document.getElementById('dr-best');
  const btn = document.getElementById('dr-btn');

  let w = 360, h = 400, running = false, shipX = 180, targetX = 180;
  let rocks = [], stars = [], score = 0, mult = 1, spawnAcc = 0, lastT = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.parentElement.clientWidth || 360;
    h = 400;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length) {
      for (let i = 0; i < 36; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, s: 1 + Math.random() * 1.8 });
    }
  }

  function start() {
    resize();
    running = true; rocks = []; score = 0; mult = 1; spawnAcc = 0;
    shipX = w / 2; targetX = w / 2;
    bestEl.textContent = state.bests.arcDrift || 0;
    btn.textContent = 'Drag Canvas to Steer';
    btn.disabled = true;
  }

  function steer(e) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    targetX = Math.max(22, Math.min(w - 22, e.clientX - rect.left));
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (activeGame !== 'drift') { lastT = now; return; }
    const dt = Math.min((now - (lastT || now)) / 1000, 0.05);
    lastT = now;

    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, w, h);

    // Starfield
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    stars.forEach((s) => {
      s.y += (running ? 90 * mult : 25) * dt;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    if (running) {
      mult = Math.min(3.0, 1 + score / 450);
      score += dt * 18 * mult;
      shipX += (targetX - shipX) * Math.min(1, dt * 16);

      spawnAcc += dt * mult;
      if (spawnAcc >= 0.42) {
        spawnAcc = 0;
        rocks.push({
          x: 20 + Math.random() * (w - 40),
          y: -24,
          r: 13 + Math.random() * 16,
          vy: 155 + Math.random() * 110 * mult,
          grazed: false,
        });
      }

      const shipY = h - 56;
      for (let i = rocks.length - 1; i >= 0; i--) {
        const rk = rocks[i];
        rk.y += rk.vy * dt;
        const dist = Math.hypot(rk.x - shipX, rk.y - shipY);
        if (dist < rk.r + 11) {
          running = false;
          playSfx('wrong');
          resetStreak();
          const finalS = Math.floor(score);
          if (finalS > (state.bests.arcDrift || 0)) {
            recordBestValue('arcDrift', finalS);
            bestEl.textContent = finalS;
          }
          btn.disabled = false;
          btn.textContent = `Crashed! Score: ${finalS} — Restart ↻`;
          break;
        } else if (!rk.grazed && dist < rk.r + 30 && rk.y > shipY - 12) {
          rk.grazed = true;
          score += 25;
          playSfx('click');
        }
        if (rk.y > h + 30) rocks.splice(i, 1);
      }

      scoreEl.textContent = `Score: ${Math.floor(score)}`;
      speedEl.textContent = `${mult.toFixed(1)}x`;
    }

    // Draw asteroids
    rocks.forEach((rk) => {
      ctx.fillStyle = rk.grazed ? '#f59e0b' : '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rk.x, rk.y, rk.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // Draw ship
    const shipY = h - 56;
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(shipX, shipY - 18);
    ctx.lineTo(shipX - 14, shipY + 14);
    ctx.lineTo(shipX, shipY + 8);
    ctx.lineTo(shipX + 14, shipY + 14);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  }

  canvas.addEventListener('pointerdown', (e) => { if (!running) start(); steer(e); });
  canvas.addEventListener('pointermove', steer);
  btn.addEventListener('click', () => { playSfx('click'); start(); });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  bestEl.textContent = state.bests.arcDrift || 0;
  requestAnimationFrame(loop);
}

// ---------- 3. GRAVITY DASH (One-Thumb Floor/Ceiling Flip) ----------
function initDash() {
  const canvas = document.getElementById('gd-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('gd-score');
  const orbsEl = document.getElementById('gd-orbs');
  const bestEl = document.getElementById('gd-best');
  const btn = document.getElementById('gd-btn');

  let w = 360, h = 360, running = false, grav = 1, py = 280, vy = 0;
  let obstacles = [], orbs = [], score = 0, orbCount = 0, spawnAcc = 0, lastT = 0;
  const PAD = 38, SIZE = 24;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.parentElement.clientWidth || 360;
    h = 360;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reset() {
    resize();
    running = true; grav = 1; py = h - PAD - SIZE; vy = 0;
    obstacles = []; orbs = []; score = 0; orbCount = 0; spawnAcc = 0;
    bestEl.textContent = state.bests.arcDash || 0;
    btn.textContent = 'FLIP GRAVITY ⚡';
  }

  function flip() {
    if (!running) { playSfx('click'); reset(); return; }
    grav *= -1;
    vy = grav * 260;
    playSfx('click');
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (activeGame !== 'dash') { lastT = now; return; }
    const dt = Math.min((now - (lastT || now)) / 1000, 0.05);
    lastT = now;

    ctx.fillStyle = '#070a11';
    ctx.fillRect(0, 0, w, h);

    // Ceiling & floor rails
    ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
    ctx.fillRect(0, 0, w, PAD);
    ctx.fillRect(0, h - PAD, w, PAD);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(0, PAD - 2, w, 2);
    ctx.fillRect(0, h - PAD, w, 2);

    const px = 64;
    if (running) {
      const spd = Math.min(460, 225 + score * 0.35);
      vy += grav * 1750 * dt;
      py += vy * dt;
      if (py < PAD) { py = PAD; vy = 0; }
      if (py > h - PAD - SIZE) { py = h - PAD - SIZE; vy = 0; }

      score += dt * 16;
      spawnAcc += dt;
      if (spawnAcc >= Math.max(0.62, 1.18 - score * 0.0012)) {
        spawnAcc = 0;
        const onTop = Math.random() < 0.5;
        const bh = 68 + Math.random() * 58;
        obstacles.push({ x: w + 24, y: onTop ? PAD : h - PAD - bh, w: 22, h: bh });
        if (Math.random() < 0.65) {
          orbs.push({ x: w + 35, y: onTop ? h - PAD - 24 : PAD + 24, r: 9 });
        }
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        ob.x -= spd * dt;
        if (px + SIZE - 4 > ob.x && px + 4 < ob.x + ob.w && py + SIZE - 4 > ob.y && py + 4 < ob.y + ob.h) {
          running = false;
          playSfx('wrong');
          resetStreak();
          const finalS = Math.floor(score);
          if (finalS > (state.bests.arcDash || 0)) {
            recordBestValue('arcDash', finalS);
            bestEl.textContent = finalS;
          }
          btn.textContent = `Hit Barrier! Score: ${finalS} — Restart ↻`;
          break;
        }
        if (ob.x + ob.w < -10) obstacles.splice(i, 1);
      }

      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.x -= spd * dt;
        if (Math.hypot(o.x - (px + SIZE / 2), o.y - (py + SIZE / 2)) < o.r + SIZE * 0.55) {
          orbCount += 1;
          score += 35;
          playSfx('correct');
          recordWin(null, 30);
          orbs.splice(i, 1);
          continue;
        }
        if (o.x < -15) orbs.splice(i, 1);
      }

      scoreEl.textContent = `Score: ${Math.floor(score)}`;
      orbsEl.textContent = `Orbs: ${orbCount}`;
    }

    // Draw obstacles
    ctx.fillStyle = '#ef4444';
    obstacles.forEach((ob) => {
      ctx.beginPath(); ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 5); ctx.fill();
    });

    // Draw orbs
    ctx.fillStyle = '#facc15';
    orbs.forEach((o) => {
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
    });

    // Draw runner cube
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(px, py, SIZE, SIZE, 6); ctx.fill();
    ctx.shadowBlur = 0;
  }

  btn.addEventListener('click', flip);
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); flip(); });
  window.addEventListener('keydown', (e) => { if (activeGame === 'dash' && e.code === 'Space') { e.preventDefault(); flip(); } });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  bestEl.textContent = state.bests.arcDash || 0;
  requestAnimationFrame(loop);
}

setupModeTabs((mode) => {
  activeGame = mode;
  if (mode === 'stack') initStack();
  if (mode === 'drift') initDrift();
  if (mode === 'dash') initDash();
});

// Keep activeGame synced even when returning to already-initialized tabs
document.querySelectorAll('.mode-tab').forEach((t) => {
  t.addEventListener('click', () => { activeGame = t.dataset.mode; });
});
