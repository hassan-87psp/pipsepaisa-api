// World / Forex news for PipSePaisa News Hub
// Returns: { success: true, items: [{ title, desc, date, url, source }] }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const FEEDS = [
    'https://news.google.com/rss/search?q=forex%20OR%20gold%20OR%20%22central%20bank%22%20OR%20geopolitics%20when:2d&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=war%20OR%20conflict%20OR%20sanctions%20OR%20%22interest%20rate%22%20when:2d&hl=en-US&gl=US&ceid=US:en'
  ];
  const strip = (s) => (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const between = (block, tag) => {
    const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
    return m ? strip(m[1]) : '';
  };

  try {
    const items = [];
    for (const feed of FEEDS) {
      try {
        const r = await fetch(feed, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const xml = await r.text();
        const blocks = xml.split('<item>').slice(1);
        for (const b of blocks.slice(0, 30)) {
          const title = between(b, 'title');
          if (!title) continue;
          items.push({
            title,
            desc: between(b, 'description'),
            date: between(b, 'pubDate') || new Date().toISOString(),
            url: between(b, 'link'),
            source: (title.split(' - ').pop() || 'News')
          });
        }
      } catch (e) { /* skip feed */ }
    }
    // dedupe by title
    const seen = new Set();
    const uniq = items.filter(n => { const k = n.title.slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; });
    uniq.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!uniq.length) return res.status(200).json({ success: false, error: 'No news', items: [] });
    return res.status(200).json({ success: true, items: uniq.slice(0, 50) });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message, items: [] });
  }
};
