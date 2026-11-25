function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const CATEGORY_MAP = {
  dev: 18,       // Science: Computers
  gaming: 15,    // Entertainment: Video Games
  sports: 21,    // Sports
  music: 12,     // Entertainment: Music
  movies: 11,    // Entertainment: Film
  tv: 14,        // Entertainment: Television
  anime: 31,     // Entertainment: Japanese Anime & Manga
  engineering: 17, // Science & Nature
  all: 0,
};

function decodeHtml(str) {
  return String(str || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g, 'ü')
    .replace(/&pi;/g, 'π');
}

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const catKey = reqUrl.searchParams.get('cat') || 'all';
    const amount = Math.min(25, Math.max(5, Number(reqUrl.searchParams.get('amount')) || 15));
    const catId = CATEGORY_MAP[catKey] ?? 0;

    const params = new URLSearchParams({ amount: String(amount), type: 'multiple' });
    if (catId > 0) params.set('category', String(catId));

    const res = await fetch(`https://opentdb.com/api.php?${params.toString()}`);
    if (!res.ok) throw new Error(`OpenTDB HTTP ${res.status}`);
    const json = await res.json();

    const questions = (json.results || []).map((q) => {
      const answer = decodeHtml(q.correct_answer);
      const incorrect = (q.incorrect_answers || []).map(decodeHtml);
      return {
        group: catKey,
        cat: decodeHtml(q.category).replace(/^Entertainment:\s*|^Science:\s*/i, ''),
        difficulty: q.difficulty || 'medium',
        q: decodeHtml(q.question),
        answer,
        options: [answer, ...incorrect],
      };
    });

    return jsonResponse({ questions });
  } catch (err) {
    return jsonResponse({ error: `Live trivia unavailable: ${err.message}` }, 502);
  }
}
