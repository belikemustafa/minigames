const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
query ($page: Int, $perPage: Int, $genre: String, $endYear: FuzzyDateInt) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME,
      sort: POPULARITY_DESC,
      isAdult: false,
      averageScore_greater: 50,
      genre: $genre,
      startDate_lesser: $endYear
    ) {
      id
      title { romaji english }
      averageScore
      popularity
      seasonYear
      episodes
      format
      coverImage { extraLarge large }
      characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 4) {
        nodes {
          id
          name { full }
          image { large }
        }
      }
    }
  }
}
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const filter = reqUrl.searchParams.get('filter') || 'all';
    const maxPage = filter === 'all' ? 16 : 8;
    const page = Number(reqUrl.searchParams.get('page')) || Math.floor(Math.random() * maxPage) + 1;

    const variables = { page, perPage: 25 };
    if (filter === 'action') variables.genre = 'Action';
    else if (filter === 'romance') variables.genre = 'Romance';
    else if (filter === 'fantasy') variables.genre = 'Fantasy';
    else if (filter === 'classic') variables.endYear = 20100101;

    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables }),
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const json = await res.json();
    const media = json?.data?.Page?.media || [];

    const anime = media
      .filter((a) => typeof a.averageScore === 'number' && (a.coverImage?.extraLarge || a.coverImage?.large))
      .map((a) => ({
        id: a.id,
        title: a.title?.english || a.title?.romaji || 'Unknown Anime',
        score: Number((a.averageScore / 10).toFixed(1)),
        popularity: a.popularity || 10000,
        year: a.seasonYear || 2005,
        episodes: a.episodes ? `${a.episodes} eps` : a.format || 'Series',
        image: a.coverImage.extraLarge || a.coverImage.large,
        characters: (a.characters?.nodes || [])
          .filter((c) => c.name?.full && c.image?.large && !c.image.large.includes('default.jpg'))
          .map((c) => ({ id: c.id, name: c.name.full, image: c.image.large })),
      }));

    return jsonResponse({ anime });
  } catch (err) {
    return jsonResponse({ error: `Unable to load anime: ${err.message}` }, 502);
  }
}
