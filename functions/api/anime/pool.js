// Uses AniList GraphQL API (reliable, keyless, no Jikan 504 outages)
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, averageScore_greater: 50) {
      id
      title { romaji english }
      averageScore
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
    const url = new URL(context.request.url);
    const page = Number(url.searchParams.get('page')) || Math.floor(Math.random() * 10) + 1;

    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { page, perPage: 25 } }),
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
        rawScore: a.averageScore,
        year: a.seasonYear || 'Classic',
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
