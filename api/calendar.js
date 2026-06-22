// api/calendar.js
// PipSePaisa — Forex Factory economic calendar proxy
// FIX: Forex Factory limits the weekly file to ~2 downloads / 5 min (all formats combined).
// So we CACHE the result in memory (~30 min) and send a browser User-Agent header.
// Returns array of: { date, title, country, impact, forecast, previous, actual }

let CACHE = { data: null, time: 0 };
const TTL = 30 * 60 * 1000; // 30 minutes

const FEEDS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json'
];

async function fetchFeed() {
  for (const url of FEEDS) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      const text = await r.text();
      // FF returns an HTML "Request Denied" page when rate-limited
      if (!r.ok || text.trim().startsWith('<')) continue;
      const data = JSON.parse(text);
      if (Array.isArray(data) && data.length) return data;
    } catch (e) { /* try next feed */ }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const now = Date.now();
    // serve fresh cache
    if (CACHE.data && (now - CACHE.time) < TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(CACHE.data);
    }

    const raw = await fetchFeed();

    if (!raw) {
      // rate-limited / failed: serve stale cache if we have it
      if (CACHE.data) {
        res.setHeader('X-Cache', 'STALE');
        return res.status(200).json(CACHE.data);
      }
      return res.status(502).json({ error: 'Calendar source unavailable (rate limited). Try again shortly.' });
    }

    // map to the shape the website expects
    const events = raw.map(e => ({
      date: e.date,                      // ISO datetime
      title: e.title || '',
      country: e.country || '',          // currency code (USD, EUR, ...)
      impact: e.impact || 'Low',         // High / Medium / Low / Holiday
      forecast: e.forecast || '',
      previous: e.previous || '',
      actual: e.actual || ''
    }));

    CACHE = { data: events, time: now };
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(events);
  } catch (err) {
    if (CACHE.data) return res.status(200).json(CACHE.data);
    return res.status(500).json({ error: String(err && err.message || err) });
  }
}
