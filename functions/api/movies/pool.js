const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w780';

const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function fetchTmdbPage(apiKey, page) {
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${encodeURIComponent(
    apiKey
  )}&language=en-US&page=${page}&include_adult=false`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB returned HTTP ${res.status}`);
  }
  const json = await res.json();

  return (json.results || [])
    .filter((m) => m.title && (m.backdrop_path || m.poster_path))
    .map((m) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.slice(0, 4) : 'Unknown',
      rating: m.vote_average ? Number(m.vote_average).toFixed(1) : 'N/A',
      genres: (m.genre_ids || [])
        .map((id) => GENRE_MAP[id])
        .filter(Boolean)
        .slice(0, 3),
      overview: m.overview || 'No synopsis available.',
      image: `${TMDB_IMG_BASE}${m.backdrop_path || m.poster_path}`,
    }));
}

export async function onRequestGet(context) {
  const apiKey = context.env.TMDB_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: 'TMDB_API_KEY is not configured in Cloudflare Pages Environment Variables.' },
      500
    );
  }

  try {
    const p1 = Math.floor(Math.random() * 15) + 1;
    let p2 = Math.floor(Math.random() * 15) + 1;
    if (p2 === p1) p2 = (p1 % 15) + 1;

    const [list1, list2] = await Promise.all([
      fetchTmdbPage(apiKey, p1),
      fetchTmdbPage(apiKey, p2),
    ]);

    const uniqueMap = new Map();
    [...list1, ...list2].forEach((m) => uniqueMap.set(m.id, m));

    return jsonResponse({ movies: Array.from(uniqueMap.values()) });
  } catch (err) {
    return jsonResponse({ error: `Unable to load movies: ${err.message}` }, 502);
  }
}
