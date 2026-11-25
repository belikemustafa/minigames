function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const GENRE_QUERIES = {
  bollywood: ['Arijit Singh', 'A R Rahman Hindi', 'Pritam Bollywood', 'Sonu Nigam', 'Shreya Ghoshal', 'Atif Aslam Bollywood', 'Vishal Shekhar'],
  south: ['Anirudh Ravichander', 'A R Rahman Tamil', 'Devi Sri Prasad', 'Thaman S', 'Ravi Basrur', 'Ilaiyaraaja', 'Yuvan Shankar Raja', 'Sid Sriram'],
  global: ['The Weeknd', 'Taylor Swift', 'Ed Sheeran', 'Queen', 'Coldplay', 'Imagine Dragons', 'Eminem', 'Dua Lipa', 'Linkin Park', 'Michael Jackson', 'Bruno Mars', 'Billie Eilish'],
  anime: ['LiSA anime', 'YOASOBI', 'Kenshi Yonezu', 'KANA-BOON', 'Aimer', 'Eve anime', 'Creepy Nuts', 'Official HIGE DANdism', 'RADWIMPS'],
  hiphop: ['Kendrick Lamar', 'Drake', 'Travis Scott', 'Eminem', 'Kanye West', 'Post Malone', '2Pac', 'J Cole'],
  kpop: ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'TWICE', 'SEVENTEEN', 'Jung Kook', 'EXO', 'IVE'],
  rock: ['Queen', 'Linkin Park', 'Nirvana', 'Coldplay', 'AC DC', 'Metallica', 'Green Day', 'Arctic Monkeys'],
  edm: ['Avicii', 'Alan Walker', 'Calvin Harris', 'Martin Garrix', 'Daft Punk', 'David Guetta', 'Marshmello'],
};

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const cat = reqUrl.searchParams.get('cat') || 'all';
    const keys = cat === 'all' ? Object.keys(GENRE_QUERIES) : (GENRE_QUERIES[cat] ? [cat] : ['global']);

    // Pick 2 random artist/genre seeds for fresh variety every batch
    const picks = [];
    for (let i = 0; i < 2; i++) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      const arr = GENRE_QUERIES[k];
      picks.push({ cat: k, term: arr[Math.floor(Math.random() * arr.length)] });
    }

    const results = await Promise.allSettled(
      picks.map(async (p) => {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(p.term)}&media=music&entity=song&limit=25`);
        if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
        const json = await res.json();
        return (json.results || []).map((r) => ({ ...r, _cat: p.cat }));
      })
    );

    const seen = new Set();
    const tracks = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const item of r.value) {
        if (!item.trackName || !item.artistName || !item.previewUrl || !item.artworkUrl100) continue;
        const cleanTitle = item.trackName.replace(/\s*\(From\s+"[^"]+"\)/i, '').trim();
        const key = `${cleanTitle.toLowerCase()}|${item.artistName.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tracks.push({
          title: cleanTitle,
          artist: item.artistName,
          movie: item.collectionName || item.primaryGenreName || 'Single',
          cat: item._cat,
          year: item.releaseDate ? Number(item.releaseDate.slice(0, 4)) : 2020,
          previewUrl: item.previewUrl,
          artwork: item.artworkUrl100.replace('100x100bb', '600x600bb'),
        });
      }
    }

    return jsonResponse({ tracks });
  } catch (err) {
    return jsonResponse({ error: `Live music pool error: ${err.message}` }, 502);
  }
}
