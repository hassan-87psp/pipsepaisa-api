// World / Forex news for PipSePaisa News Hub
// Returns: { success: true, items: [{ title, desc, date, link, url, source }] }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const FEEDS = [
    'https://news.google.com/rss/search?q=forex%20OR%20gold%20OR%20%22central%20bank%22%20OR%20geopolitics%20when:2d&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=war%20OR%20conflict%20OR%20sanctions%20OR%20%22interest%20rate%22%20when:2d&hl=en-US&gl=US&ceid=US:en'
  ];
  const decode = (s) => (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  const clean = (s) => decode(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  const tag = (block, t) => {
    const m = block.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)<\\/' + t + '>', 'i'));
    return m ? m[1] : '';
  };

  try {
    const items = [];
    for (const feed of FEEDS) {
      try {
        const r = await fetch(feed, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const xml = await r.text();
        const blocks = xml.split('<item>').slice(1);
        for (const b of blocks.slice(0, 30)) {
          const title = clean(tag(b, 'title'));
          if (!title) continue;
          const link = decode(tag(b, 'link')).replace(/<[^>]*>/g, '').trim();
          items.push({
            title,
            desc: clean(tag(b, 'description')).slice(0, 220),
            date: clean(tag(b, 'pubDate')) || new Date().toISOString(),
            link: link,
            url: link,
            source: (title.split(' - ').pop() || 'News')
          });
        }
      } catch (e) { /* skip feed */ }
    }
    const seen = new Set();
    const uniq = items.filter(n => { const k = n.title.slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; });
    uniq.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!uniq.length) return res.status(200).json({ success: false, error: 'No news', items: [] });
    return res.status(200).json({ success: true, items: uniq.slice(0, 50) });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message, items: [] });
  }
};
