const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w780';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function fetchTvDetails(apiKey, show) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${show.id}?api_key=${encodeURIComponent(apiKey)}&language=en-US`);
    if (!res.ok) return show;
    const d = await res.json();
    return {
      ...show,
      seasons: d.number_of_seasons || 1,
      episodes: d.number_of_episodes || 10,
      genres: (d.genres || []).map((g) => g.name).slice(0, 3),
    };
  } catch {
    return show;
  }
}

export async function onRequestGet(context) {
  const apiKey = context.env.TMDB_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'TMDB_API_KEY missing in Cloudflare Pages Environment Variables.' }, 500);
  }
  try {
    const reqUrl = new URL(context.request.url);
    const region = reqUrl.searchParams.get('region') || 'all';
    const mode = reqUrl.searchParams.get('mode') || 'unblur';
    const maxPage = region === 'all' ? 14 : 8;
    const p1 = Math.floor(Math.random() * maxPage) + 1;

    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'en-US',
      sort_by: 'popularity.desc',
      without_genres: '16,10767,10763', // Exclude animation, talk shows, news
      page: String(p1),
    });

    if (region === 'hollywood') {
      params.set('with_original_language', 'en');
      params.set('vote_count.gte', '350');
    } else if (region === 'indian') {
      params.set('with_origin_country', 'IN');
      params.set('vote_count.gte', '25');
    } else if (region === 'kdrama') {
      params.set('with_origin_country', 'KR');
      params.set('vote_count.gte', '80');
    } else if (region === 'classic') {
      params.set('first_air_date.lte', '2012-12-31');
      params.set('vote_count.gte', '300');
    } else {
      params.set('vote_count.gte', '200');
    }

    const res = await fetch(`https://api.themoviedb.org/3/discover/tv?${params.toString()}`);
    if (!res.ok) throw new Error(`TMDB TV HTTP ${res.status}`);
    const json = await res.json();

    let shows = (json.results || [])
      .filter((s) => s.name && (s.backdrop_path || s.poster_path) && s.first_air_date)
      .map((s) => ({
        id: s.id,
        title: s.name,
        year: Number(s.first_air_date.slice(0, 4)) || 2015,
        rating: s.vote_average ? Number(Number(s.vote_average).toFixed(1)) : 7.5,
        overview: s.overview || 'Acclaimed television series.',
        image: `${TMDB_IMG_BASE}${s.backdrop_path || s.poster_path}`,
        seasons: 1,
        episodes: 10,
        genres: [],
      }));

    if (mode === 'duel') {
      // Enrich up to 12 shows in parallel with real seasons & episode counts
      const subset = shows.sort(() => Math.random() - 0.5).slice(0, 12);
      shows = await Promise.all(subset.map((s) => fetchTvDetails(apiKey, s)));
    }

    return jsonResponse({ shows });
  } catch (err) {
    return jsonResponse({ error: `Unable to load TV series: ${err.message}` }, 502);
  }
}
