const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w780';
const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchMovieCast(apiKey, movie) {
  const url = `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${encodeURIComponent(apiKey)}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Credits HTTP ${res.status}`);
  const json = await res.json();
  const cast = (json.cast || [])
    .filter((c) => c.name && c.profile_path)
    .slice(0, 4)
    .map((c) => ({
      name: c.name,
      character: c.character || 'Featured Role',
      photo: `${TMDB_PROFILE_BASE}${c.profile_path}`,
    }));
  return { movie, cast };
}

export async function onRequestGet(context) {
  const apiKey = context.env.TMDB_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'TMDB_API_KEY missing in Cloudflare Pages Environment Variables.' }, 500);
  }
  try {
    const reqUrl = new URL(context.request.url);
    const region = reqUrl.searchParams.get('region') || 'all';
    const choiceCount = Math.min(6, Math.max(4, Number(reqUrl.searchParams.get('choices')) || 4));
    const maxPage = region === 'indian' ? 10 : 16;
    const page = Math.floor(Math.random() * maxPage) + 1;

    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'en-US',
      include_adult: 'false',
      sort_by: 'popularity.desc',
      page: String(page),
    });
    if (region === 'hollywood') { params.set('with_original_language', 'en'); params.set('vote_count.gte', '500'); }
    else if (region === 'indian') { params.set('with_origin_country', 'IN'); params.set('vote_count.gte', '35'); }
    else if (region === 'intl') { params.set('without_original_language', 'en'); params.set('vote_count.gte', '120'); }
    else { params.set('vote_count.gte', '250'); }

    const popRes = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`);
    if (!popRes.ok) throw new Error(`TMDB HTTP ${popRes.status}`);
    const popJson = await popRes.json();

    const pool = (popJson.results || [])
      .filter((m) => m.title)
      .map((m) => ({
        id: m.id,
        title: m.title,
        year: m.release_date ? m.release_date.slice(0, 4) : 'Unknown',
        rating: m.vote_average ? Number(m.vote_average).toFixed(1) : 'N/A',
        image: m.backdrop_path || m.poster_path ? `${TMDB_IMG_BASE}${m.backdrop_path || m.poster_path}` : '',
      }));

    if (pool.length < choiceCount) throw new Error('Not enough movies returned');
    const shuffled = shuffle(pool);
    const results = await Promise.allSettled(shuffled.slice(0, 6).map((m) => fetchMovieCast(apiKey, m)));
    const fulfilled = results
      .filter((r) => r.status === 'fulfilled' && r.value.cast.length >= 2)
      .map((r) => r.value)
      .sort((a, b) => b.cast.length - a.cast.length);

    const best = fulfilled[0];
    if (!best) throw new Error('No movie with enough cast photos found');

    const decoys = shuffled
      .filter((m) => m.id !== best.movie.id)
      .slice(0, choiceCount - 1)
      .map((m) => ({ id: m.id, title: m.title, year: m.year }));

    const options = shuffle([{ id: best.movie.id, title: best.movie.title, year: best.movie.year }, ...decoys]);
    return jsonResponse({ target: best.movie, cast: best.cast, options });
  } catch (err) {
    return jsonResponse({ error: `Unable to load cast round: ${err.message}` }, 502);
  }
}
