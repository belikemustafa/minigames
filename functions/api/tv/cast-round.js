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

async function fetchShowCast(apiKey, show) {
  const url = `https://api.themoviedb.org/3/tv/${show.id}/credits?api_key=${encodeURIComponent(apiKey)}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TV Credits HTTP ${res.status}`);
  const json = await res.json();
  const cast = (json.cast || [])
    .filter((c) => c.name && c.profile_path)
    .slice(0, 4)
    .map((c) => ({
      name: c.name,
      character: c.character || 'Main Cast',
      photo: `${TMDB_PROFILE_BASE}${c.profile_path}`,
    }));
  return { show, cast };
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
    const page = Math.floor(Math.random() * (region === 'all' ? 12 : 6)) + 1;

    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'en-US',
      sort_by: 'popularity.desc',
      without_genres: '16,10767,10763',
      page: String(page),
    });
    if (region === 'hollywood') { params.set('with_original_language', 'en'); params.set('vote_count.gte', '350'); }
    else if (region === 'indian') { params.set('with_origin_country', 'IN'); params.set('vote_count.gte', '25'); }
    else if (region === 'kdrama') { params.set('with_origin_country', 'KR'); params.set('vote_count.gte', '80'); }
    else { params.set('vote_count.gte', '200'); }

    const res = await fetch(`https://api.themoviedb.org/3/discover/tv?${params.toString()}`);
    if (!res.ok) throw new Error(`TMDB TV HTTP ${res.status}`);
    const json = await res.json();

    const pool = (json.results || [])
      .filter((s) => s.name)
      .map((s) => ({
        id: s.id,
        title: s.name,
        year: s.first_air_date ? s.first_air_date.slice(0, 4) : 'Unknown',
        rating: s.vote_average ? Number(s.vote_average).toFixed(1) : 'N/A',
        image: s.backdrop_path || s.poster_path ? `${TMDB_IMG_BASE}${s.backdrop_path || s.poster_path}` : '',
      }));

    if (pool.length < choiceCount) throw new Error('Not enough TV shows');
    const shuffled = shuffle(pool);
    const results = await Promise.allSettled(shuffled.slice(0, 6).map((s) => fetchShowCast(apiKey, s)));
    const fulfilled = results
      .filter((r) => r.status === 'fulfilled' && r.value.cast.length >= 2)
      .map((r) => r.value)
      .sort((a, b) => b.cast.length - a.cast.length);

    const best = fulfilled[0];
    if (!best) throw new Error('No TV show with cast photos found');

    const decoys = shuffled
      .filter((s) => s.id !== best.show.id)
      .slice(0, choiceCount - 1)
      .map((s) => ({ id: s.id, title: s.title, year: s.year }));

    const options = shuffle([{ id: best.show.id, title: best.show.title, year: best.show.year }, ...decoys]);
    return jsonResponse({ target: best.show, cast: best.cast, options });
  } catch (err) {
    return jsonResponse({ error: `Unable to load TV cast: ${err.message}` }, 502);
  }
}
