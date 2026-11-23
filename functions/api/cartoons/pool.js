const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w780';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function fetchCartoonPage(apiKey, page) {
  // Genre 16 = Animation; exclude Japanese anime (without_original_language=ja) for Western/global cartoons
  const url = `https://api.themoviedb.org/3/discover/tv?api_key=${encodeURIComponent(apiKey)}&language=en-US&with_genres=16&without_original_language=ja&sort_by=popularity.desc&vote_count.gte=120&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB TV HTTP ${res.status}`);
  const json = await res.json();

  return (json.results || [])
    .filter((s) => s.name && (s.backdrop_path || s.poster_path) && s.first_air_date)
    .map((s) => ({
      id: s.id,
      title: s.name,
      year: Number(s.first_air_date.slice(0, 4)) || 2000,
      rating: s.vote_average ? Number(Number(s.vote_average).toFixed(1)) : 7.0,
      overview: s.overview || 'Animated television series.',
      image: `${TMDB_IMG_BASE}${s.backdrop_path || s.poster_path}`,
    }));
}

export async function onRequestGet(context) {
  const apiKey = context.env.TMDB_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'TMDB_API_KEY missing in Cloudflare Pages Environment Variables.' }, 500);
  }
  try {
    const p1 = Math.floor(Math.random() * 8) + 1;
    let p2 = Math.floor(Math.random() * 8) + 1;
    if (p2 === p1) p2 = (p1 % 8) + 1;
    const [list1, list2] = await Promise.all([fetchCartoonPage(apiKey, p1), fetchCartoonPage(apiKey, p2)]);
    const map = new Map();
    [...list1, ...list2].forEach((s) => map.set(s.id, s));
    return jsonResponse({ cartoons: Array.from(map.values()) });
  } catch (err) {
    return jsonResponse({ error: `Unable to load cartoons: ${err.message}` }, 502);
  }
}
