import {
  initChrome, setupModeTabs, playSfx, recordWin, resetStreak,
  shuffle, escapeHtml, preloadImage, showToast, triggerFlash,
} from './core.js';
import { MUSIC_TRACKS, LYRIC_QUIZZES } from './data/musicData.js';

initChrome('music');

const itunesCache = new Map();

async function lookupTrackMedia(track) {
  if (itunesCache.has(track.query)) return itunesCache.get(track.query);
  let result = null;
  // 1) Try Cloudflare Pages proxy
  try {
    const r = await fetch(`/api/music/search?term=${encodeURIComponent(track.query)}`);
    if (r.ok) {
      const j = await r.json();
      if (j.track) result = j.track;
    }
  } catch {}
  // 2) Direct iTunes fallback if testing locally without Pages Functions
  if (!result) {
    try {
      const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.query)}&media=music&entity=song&limit=5`);
      if (r.ok) {
        const j = await r.json();
        const t = (j.results || []).find((x) => x.previewUrl) || (j.results || [])[0];
        if (t) {
          result = {
            previewUrl: t.previewUrl || null,
            artwork: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
          };
        }
      }
    } catch {}
  }
  itunesCache.set(track.query, result);
  return result;
}

// ---------- 1. 5-SECOND AUDIO HOOK ----------
function initAudioHook() {
  let pool = [], target = null, media = null, clipSecs = 5, pts = 300, locked = true, token = 0, choiceCount = 4;
  let audio = null, stopTimer = null;

  const catSel = document.getElementById('mh-cat');
  const opt4 = document.getElementById('mh-opt-4'), opt6 = document.getElementById('mh-opt-6');
  const ptsEl = document.getElementById('mh-pts');
  const loader = document.getElementById('mh-loader');
  const bars = document.getElementById('mh-bars');
  const playBtn = document.getElementById('mh-play-btn');
  const clipInfo = document.getElementById('mh-clip-info');
  const extBtn = document.getElementById('mh-extend-btn');
  const hintBox = document.getElementById('mh-hint-box');
  const optionsEl = document.getElementById('mh-options');
  const feedbackEl = document.getElementById('mh-feedback');
  const nextBtn = document.getElementById('mh-next');

  function stopAudio() {
    clearTimeout(stopTimer);
    if (audio) { audio.pause(); audio.currentTime = 0; }
    bars.classList.remove('playing');
  }

  function getFiltered() {
    const c = catSel.value;
    return c === 'all' ? MUSIC_TRACKS : MUSIC_TRACKS.filter((t) => t.cat === c);
  }

  function playClip() {
    if (!media?.previewUrl) return showToast('Preview audio unavailable — use Artist/Movie clue!');
    stopAudio();
    audio = new Audio(media.previewUrl);
    audio.volume = 0.65;
    audio.play().then(() => {
      bars.classList.add('playing');
      stopTimer = setTimeout(() => stopAudio(), clipSecs * 1000);
    }).catch(() => showToast('Tap Play again to start audio'));
  }

  async function startRound() {
    stopAudio();
    const t = ++token;
    locked = true; clipSecs = 5;
    pts = choiceCount === 6 ? 360 : 300;
    ptsEl.textContent = `+${pts} PTS`;
    playBtn.textContent = '▶ Play 5s Clip';
    clipInfo.textContent = 'Clip length: 5 seconds';
    extBtn.disabled = true;
    extBtn.textContent = '⏱️ Extend Clip to 10s + Artist Clue (-75 pts)';
    hintBox.classList.add('hidden');
    hintBox.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Cueing track preview...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';

    const list = getFiltered();
    if (pool.length < 2) pool = shuffle(list);
    target = pool.pop();

    media = await lookupTrackMedia(target);
    if (t !== token) return;

    loader.classList.add('hidden');
    if (!media?.previewUrl) {
      hintBox.innerHTML = `<strong>Audio preview unavailable for this region.</strong> Clue: ${escapeHtml(target.artist)} (${target.year})`;
      hintBox.classList.remove('hidden');
    }

    const decoys = shuffle(list.filter((x) => x.title !== target.title)).slice(0, choiceCount - 1);
    shuffle([target, ...decoys]).forEach((tr) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.title = tr.title;
      btn.textContent = tr.title;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; extBtn.disabled = true; stopAudio();
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.title === target.title) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (tr.title === target.title) {
          playSfx('correct');
          const earned = recordWin('musicHook', pts);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Spot on! "${target.title}" — ${target.artist} (${target.movie}, ${target.year}) +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That track was "${target.title}" by ${target.artist} (${target.movie}).`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });

    locked = false;
    extBtn.disabled = false;
  }

  extBtn.addEventListener('click', () => {
    if (locked || !target || clipSecs >= 15) return;
    playSfx('reveal');
    clipSecs += 5;
    pts = Math.max(120, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    playBtn.textContent = `▶ Play ${clipSecs}s Clip`;
    clipInfo.textContent = `Clip length: ${clipSecs} seconds`;
    hintBox.classList.remove('hidden');
    if (clipSecs === 10) {
      hintBox.innerHTML = `<strong>Clue 1:</strong> Artist: <strong>${escapeHtml(target.artist)}</strong> • Year: ${target.year}`;
      extBtn.textContent = '⏱️ Extend Clip to 15s + Album/Movie (-75 pts)';
    } else {
      hintBox.innerHTML += `<br/><strong>Clue 2:</strong> From: <strong>${escapeHtml(target.movie)}</strong>`;
      extBtn.disabled = true;
    }
  });

  playBtn.addEventListener('click', playClip);
  catSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); startRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 2. ALBUM & OST COVER UNBLUR ----------
function initCoverUnblur() {
  let pool = [], target = null, hints = 0, pts = 300, locked = true, token = 0, choiceCount = 4;

  const catSel = document.getElementById('mc-cat');
  const opt4 = document.getElementById('mc-opt-4'), opt6 = document.getElementById('mc-opt-6');
  const ptsEl = document.getElementById('mc-pts');
  const loader = document.getElementById('mc-loader');
  const imgEl = document.getElementById('mc-img');
  const hintBtn = document.getElementById('mc-hint-btn');
  const hintBox = document.getElementById('mc-hint-box');
  const optionsEl = document.getElementById('mc-options');
  const feedbackEl = document.getElementById('mc-feedback');
  const nextBtn = document.getElementById('mc-next');

  function getFiltered() {
    const c = catSel.value;
    return c === 'all' ? MUSIC_TRACKS : MUSIC_TRACKS.filter((t) => t.cat === c);
  }

  async function startRound() {
    const t = ++token;
    locked = true; hints = 0;
    pts = choiceCount === 6 ? 360 : 300;
    ptsEl.textContent = `+${pts} PTS`;
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Unblur & Artist Clue (-75 pts)';
    hintBox.classList.add('hidden');
    hintBox.innerHTML = '';
    feedbackEl.classList.add('hidden');
    nextBtn.classList.add('hidden');
    loader.textContent = 'Loading HD cover art...';
    loader.classList.remove('hidden');
    optionsEl.innerHTML = '';
    imgEl.className = 'blur-3';

    const list = getFiltered();
    if (pool.length < 2) pool = shuffle(list);
    target = pool.pop();

    const media = await lookupTrackMedia(target);
    if (t !== token) return;

    if (!media?.artwork) {
      loader.textContent = 'Cover art unavailable — tap Retry for next album.';
      nextBtn.textContent = 'Next Cover ↻';
      nextBtn.classList.remove('hidden');
      return;
    }

    await preloadImage(media.artwork);
    if (t !== token) return;
    imgEl.src = media.artwork;
    imgEl.className = 'blur-3 ready';
    loader.classList.add('hidden');

    const decoys = shuffle(list.filter((x) => x.title !== target.title)).slice(0, choiceCount - 1);
    shuffle([target, ...decoys]).forEach((tr) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.title = tr.title;
      btn.textContent = `${tr.title} (${tr.movie})`;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true; hintBtn.disabled = true;
        imgEl.className = 'blur-0 ready';
        triggerFlash(imgEl.parentElement, 'lens-sweep');
        optionsEl.querySelectorAll('.option-btn').forEach((b) => {
          b.disabled = true;
          if (b.dataset.title === target.title) b.classList.add('correct');
        });
        feedbackEl.classList.remove('hidden', 'good', 'bad');
        if (tr.title === target.title) {
          playSfx('correct');
          const earned = recordWin('musicCover', pts);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Spot on! "${target.title}" — ${target.artist} (${target.year}) +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `That cover belongs to "${target.title}" (${target.movie}).`;
        }
        nextBtn.textContent = 'Next Cover →';
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
    locked = false; hintBtn.disabled = false;
  }

  hintBtn.addEventListener('click', () => {
    if (locked || !target || hints >= 2) return;
    playSfx('reveal');
    triggerFlash(imgEl.parentElement, 'lens-sweep');
    hints += 1;
    pts = Math.max(100, pts - 75);
    ptsEl.textContent = `+${pts} PTS`;
    hintBox.classList.remove('hidden');
    if (hints === 1) {
      imgEl.className = 'blur-2 ready';
      hintBox.innerHTML = `<strong>Clue 1:</strong> Artist: <strong>${escapeHtml(target.artist)}</strong>`;
      hintBtn.textContent = '💡 Year & Sharpen (-75 pts)';
    } else {
      imgEl.className = 'blur-1 ready';
      hintBox.innerHTML += `<br/><strong>Clue 2:</strong> Released in <strong>${target.year}</strong>`;
      hintBtn.disabled = true;
    }
  });

  catSel.addEventListener('change', () => { playSfx('click'); pool = []; startRound(); });
  opt4.addEventListener('click', () => { playSfx('click'); choiceCount = 4; opt4.classList.add('active'); opt6.classList.remove('active'); startRound(); });
  opt6.addEventListener('click', () => { playSfx('click'); choiceCount = 6; opt6.classList.add('active'); opt4.classList.remove('active'); startRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); startRound(); });
  startRound();
}

// ---------- 3. FINISH THE LYRIC ----------
function initLyrics() {
  let pool = [], current = null, locked = false;
  const catSel = document.getElementById('ml-cat');
  const songEl = document.getElementById('ml-song');
  const lineEl = document.getElementById('ml-line');
  const optionsEl = document.getElementById('ml-options');
  const feedbackEl = document.getElementById('ml-feedback');
  const nextBtn = document.getElementById('ml-next');

  function getFiltered() {
    const c = catSel.value;
    return c === 'all' ? LYRIC_QUIZZES : LYRIC_QUIZZES.filter((l) => l.cat === c);
  }

  function nextRound() {
    locked = false;
    if (!pool.length) pool = shuffle(getFiltered());
    current = pool.pop();
    songEl.textContent = `🎵 ${current.song} — ${current.artist}`;
    lineEl.textContent = `"${current.lines}..."`;
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
          const earned = recordWin('musicLyric', 200);
          feedbackEl.classList.add('good');
          feedbackEl.textContent = `Hit every note! +${earned} pts`;
        } else {
          playSfx('wrong');
          btn.classList.add('wrong');
          resetStreak();
          feedbackEl.classList.add('bad');
          feedbackEl.textContent = `Next line: "${current.answer}"`;
        }
        nextBtn.classList.remove('hidden');
      });
      optionsEl.appendChild(btn);
    });
  }

  catSel.addEventListener('change', () => { playSfx('click'); pool = []; nextRound(); });
  nextBtn.addEventListener('click', () => { playSfx('click'); nextRound(); });
  nextRound();
}

setupModeTabs((mode) => {
  if (mode === 'hook') initAudioHook();
  if (mode === 'cover') initCoverUnblur();
  if (mode === 'lyric') initLyrics();
});
