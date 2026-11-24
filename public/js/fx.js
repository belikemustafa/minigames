// 60 FPS Canvas Particle, Shockwave, Floating Score & Tactile Motion Engine

const reducedMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let fxEnabled = !reducedMedia?.matches;
try {
  const saved = sessionStorage.getItem('fandom_arcade_fx');
  if (saved === 'off') fxEnabled = false;
  else if (saved === 'on') fxEnabled = true;
} catch {}

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let dpr = 1;
let rafId = null;
let lastFrameTime = 0;
let paused = false;

const ambients = [];
const sparks = [];
const rings = [];
const floaters = [];

const lastPointer = { x: null, y: null, ts: 0 };

function getAccentRgb() {
  const raw = getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim();
  const parts = raw.split(',').map((n) => parseInt(n.trim(), 10));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return parts;
  return [45, 212, 191];
}

function getTapOrigin() {
  if (lastPointer.x !== null && Date.now() - lastPointer.ts < 1500) {
    return { x: lastPointer.x, y: lastPointer.y };
  }
  return { x: width * 0.5, y: height * 0.42 };
}

function resizeCanvas() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedAmbient() {
  ambients.length = 0;
  const count = width < 560 ? 18 : 30;
  for (let i = 0; i < count; i++) {
    ambients.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 14,
      vy: -(6 + Math.random() * 16),
      alpha: 0.08 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function stepAndDraw(now) {
  rafId = requestAnimationFrame(stepAndDraw);
  if (paused || !ctx) return;

  const dt = Math.min((now - (lastFrameTime || now)) / 1000, 0.05);
  lastFrameTime = now;

  ctx.clearRect(0, 0, width, height);
  if (!fxEnabled) return;

  const [ar, ag, ab] = getAccentRgb();

  // 1. Subtle drifting ambient motes
  for (let i = 0; i < ambients.length; i++) {
    const m = ambients[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.phase += dt * 1.4;
    if (m.y < -12) { m.y = height + 12; m.x = Math.random() * width; }
    if (m.x < -12) m.x = width + 12;
    if (m.x > width + 12) m.x = -12;

    const a = m.alpha * (0.65 + 0.35 * Math.sin(m.phase));
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${a.toFixed(3)})`;
    ctx.fill();
  }

  // 2. Expanding shockwave rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    const p = r.age / r.life;
    if (p >= 1) { rings.splice(i, 1); continue; }
    const ease = 1 - Math.pow(1 - p, 3);
    const radius = r.r0 + (r.r1 - r.r0) * ease;
    const alpha = (1 - p) * r.alpha;

    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r.rgb[0]}, ${r.rgb[1]}, ${r.rgb[2]}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, r.lineWidth * (1 - p));
    ctx.stroke();
  }

  // 3. Burst sparks / confetti motes
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.age += dt;
    const p = s.age / s.life;
    if (p >= 1) { sparks.splice(i, 1); continue; }

    s.vx *= Math.pow(0.92, dt * 60);
    s.vy = s.vy * Math.pow(0.94, dt * 60) + s.gravity * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.rot += s.vrot * dt;

    const alpha = p < 0.7 ? 1 : (1 - p) / 0.3;
    const size = s.size * (1 - p * 0.35);

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fillStyle = `rgba(${s.rgb[0]}, ${s.rgb[1]}, ${s.rgb[2]}, ${alpha.toFixed(3)})`;
    if (s.shape === 'rect') {
      ctx.fillRect(-size, -size * 0.45, size * 2, size * 0.9);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Floating "+PTS" score popups
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.age += dt;
    const p = f.age / f.life;
    if (p >= 1) { floaters.splice(i, 1); continue; }
    const ease = 1 - Math.pow(1 - p, 3);
    const y = f.y - ease * 58;
    const alpha = p < 0.2 ? p / 0.2 : p > 0.72 ? (1 - p) / 0.28 : 1;
    const scale = p < 0.18 ? 0.78 + (p / 0.18) * 0.3 : 1.08 - Math.min(0.08, p * 0.12);

    ctx.save();
    ctx.translate(f.x, y);
    ctx.scale(scale, scale);
    ctx.font = `700 ${f.fontSize}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(${f.rgb[0]}, ${f.rgb[1]}, ${f.rgb[2]}, ${alpha.toFixed(3)})`;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
}

function pulseVignette(type) {
  const vig = document.getElementById('fx-vignette');
  if (!vig || !fxEnabled) return;
  vig.classList.remove('vig-good', 'vig-bad');
  void vig.offsetWidth;
  vig.classList.add(type === 'good' ? 'vig-good' : 'vig-bad');
}

export function isFxEnabled() {
  return fxEnabled;
}

export function setFxEnabled(on) {
  fxEnabled = Boolean(on);
  document.body.classList.toggle('reduced-fx', !fxEnabled);
  try { sessionStorage.setItem('fandom_arcade_fx', fxEnabled ? 'on' : 'off'); } catch {}
  if (!fxEnabled && ctx) ctx.clearRect(0, 0, width, height);
  return fxEnabled;
}

export function burstWin(earnedPoints = 0, streak = 1) {
  if (!fxEnabled) return;
  const { x, y } = getTapOrigin();
  const accent = getAccentRgb();
  const palette = [accent, [16, 185, 129], [212, 175, 55], [243, 245, 249]];
  const count = Math.min(38, 18 + streak * 3);

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const speed = 95 + Math.random() * 230;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 65,
      gravity: 340,
      size: 2.2 + Math.random() * 2.8,
      rgb: palette[i % palette.length],
      shape: i % 3 === 0 ? 'rect' : 'dot',
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 9,
      age: 0,
      life: 0.55 + Math.random() * 0.35,
    });
  }

  rings.push({ x, y, r0: 10, r1: 86, lineWidth: 3, alpha: 0.65, rgb: accent, age: 0, life: 0.46 });
  if (streak >= 3) {
    rings.push({ x, y, r0: 16, r1: 122, lineWidth: 2, alpha: 0.45, rgb: [212, 175, 55], age: 0, life: 0.62 });
  }

  if (earnedPoints > 0) {
    const label = streak >= 3 ? `+${earnedPoints} 🔥` : `+${earnedPoints} PTS`;
    floaters.push({
      x: Math.max(70, Math.min(width - 70, x)),
      y: Math.max(80, y - 16),
      text: label,
      fontSize: streak >= 5 ? 19 : 16,
      rgb: streak >= 3 ? [230, 198, 92] : [110, 231, 183],
      age: 0,
      life: 0.95,
    });
  }

  pulseVignette('good');
}

export function burstMilestone(label = '🏆 STREAK!') {
  if (!fxEnabled) return;
  const accent = getAccentRgb();
  const palette = [accent, [212, 175, 55], [52, 211, 153], [243, 245, 249]];
  const origins = [
    { x: width * 0.14, y: height * 0.68, baseAngle: -Math.PI * 0.32 },
    { x: width * 0.86, y: height * 0.68, baseAngle: -Math.PI * 0.68 },
  ];
  origins.forEach((o) => {
    for (let i = 0; i < 24; i++) {
      const angle = o.baseAngle + (Math.random() - 0.5) * 0.85;
      const speed = 220 + Math.random() * 280;
      sparks.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 390,
        size: 2.8 + Math.random() * 3.2,
        rgb: palette[i % palette.length],
        shape: i % 2 === 0 ? 'rect' : 'dot',
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 11,
        age: 0,
        life: 0.9 + Math.random() * 0.55,
      });
    }
  });
  floaters.push({
    x: width * 0.5,
    y: height * 0.36,
    text: label,
    fontSize: 22,
    rgb: [230, 198, 92],
    age: 0,
    life: 1.25,
  });
}

export function pulseWrong() {
  if (!fxEnabled) return;
  pulseVignette('bad');
  const main = document.querySelector('main.container');
  if (main) {
    main.classList.remove('fx-shake');
    void main.offsetWidth;
    main.classList.add('fx-shake');
  }
}

export function animateNumber(el, from, to, { duration = 420, decimals = 0, prefix = '', suffix = '', locale = false } = {}) {
  if (!el) return;
  if (el._numRaf) cancelAnimationFrame(el._numRaf);

  const format = (v) => {
    const val = decimals > 0 ? v.toFixed(decimals) : (locale ? Math.round(v).toLocaleString() : String(Math.round(v)));
    return `${prefix}${val}${suffix}`;
  };

  if (!fxEnabled || duration <= 0 || from === to) {
    el.textContent = format(to);
    return;
  }

  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const cur = from + (to - from) * ease;
    el.textContent = format(cur);
    if (p < 1) {
      el._numRaf = requestAnimationFrame(tick);
    } else {
      el.textContent = format(to);
      el._numRaf = null;
    }
  }
  el._numRaf = requestAnimationFrame(tick);
}

export function triggerFlash(el, cls = 'fx-pop') {
  if (!el || !fxEnabled) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function attachCardTilt(selector = '.hub-card') {
  if (!window.matchMedia?.('(pointer: fine)').matches) return;
  document.querySelectorAll(selector).forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = '1';
    let raf = null;
    let tx = 0, ty = 0;

    card.addEventListener('pointermove', (e) => {
      if (!fxEnabled) return;
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      tx = (0.5 - py) * 7;
      ty = (px - 0.5) * 7;
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      if (!raf) {
        raf = requestAnimationFrame(() => {
          card.style.transform = `perspective(700px) rotateX(${tx.toFixed(2)}deg) rotateY(${ty.toFixed(2)}deg) translateY(-2px)`;
          raf = null;
        });
      }
    });

    card.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      card.style.transform = '';
    });
  });
}

function setupRipples() {
  document.addEventListener('pointerdown', (e) => {
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
    lastPointer.ts = Date.now();

    if (!fxEnabled) return;
    const target = e.target.closest('.btn, .option-btn, .clash-card, .bracket-tile, .hub-card, .mode-tab');
    if (!target || target.disabled) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'fx-ripple';
    const size = Math.max(rect.width, rect.height) * 1.4;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 520);
  }, { passive: true });
}

function setupAutoStagger() {
  const STAGGER_SELECTORS = '.options-grid, .cast-grid, .ing-grid, .hub-grid, .poke-stats, .clue-list';
  const observer = new MutationObserver((mutations) => {
    if (!fxEnabled) return;
    for (const m of mutations) {
      if (m.type !== 'childList' || !m.addedNodes.length) continue;
      if (!m.target.matches?.(STAGGER_SELECTORS)) continue;
      const children = Array.from(m.target.children);
      children.forEach((child, i) => {
        if (child.nodeType !== 1 || child.dataset.fxEntered) return;
        child.dataset.fxEntered = '1';
        child.style.setProperty('--stagger', `${Math.min(i * 42, 260)}ms`);
        child.classList.add('fx-enter');
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Stagger initial Hub cards if present
  document.querySelectorAll('.hub-grid > .hub-card').forEach((card, i) => {
    card.style.setProperty('--stagger', `${Math.min(i * 45, 360)}ms`);
    card.classList.add('fx-enter');
  });
}

export function initFx() {
  if (canvas) return;
  document.body.classList.toggle('reduced-fx', !fxEnabled);

  // Inject dark, animated, smooth, lightly blurred category background stage
  if (!document.getElementById('bg-stage')) {
    const bgStage = document.createElement('div');
    bgStage.id = 'bg-stage';
    bgStage.setAttribute('aria-hidden', 'true');
    bgStage.innerHTML = '<div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div><div id="bg-pattern"></div><div id="bg-scrim"></div>';
    document.body.prepend(bgStage);
  }

  // Inject edge-vignette layer
  const vig = document.createElement('div');
  vig.id = 'fx-vignette';
  vig.setAttribute('aria-hidden', 'true');
  document.body.appendChild(vig);

  // Inject 60 FPS overlay canvas (pointer-events: none)
  canvas = document.createElement('canvas');
  canvas.id = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d', { alpha: true });

  resizeCanvas();
  seedAmbient();

  window.addEventListener('resize', () => {
    resizeCanvas();
    seedAmbient();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) lastFrameTime = performance.now();
  });

  setupRipples();
  setupAutoStagger();
  attachCardTilt('.hub-card, .clash-card');

  lastFrameTime = performance.now();
  rafId = requestAnimationFrame(stepAndDraw);
}
