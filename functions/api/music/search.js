// Cloudflare proxy for keyless iTunes Search API (avoids CORS & enriches audio previewUrl + HD artwork)
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const term = (reqUrl.searchParams.get('term') || '').trim();
    if (!term) return jsonResponse({ error: 'Missing search term' }, 400);

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    const res = await fetch(itunesUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const json = await res.json();

    const track = (json.results || []).find((r) => r.previewUrl) || (json.results || [])[0];
    if (!track) return jsonResponse({ track: null });

    return jsonResponse({
      track: {
        title: track.trackName || '',
        artist: track.artistName || '',
        album: track.collectionName || '',
        year: track.releaseDate ? track.releaseDate.slice(0, 4) : '',
        previewUrl: track.previewUrl || null,
        artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null,
      },
    });
  } catch (err) {
    return jsonResponse({ error: `Music lookup failed: ${err.message}` }, 502);
  }
}
