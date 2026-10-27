// PipSePaisa News Hub — multi-source market headlines.
// Backward-compatible response: { success, items: [{title, desc, date, link, url, source}] }
// Added optional fields: category and sourceUrl; no article bodies are syndicated.
// Upstream publisher terms apply; link through to original articles.

const google = (q) =>
  'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:2d') + '&hl=en-US&gl=US&ceid=US:en';

const FEEDS = [
  { name: 'Google News', category: 'Forex', url: google('forex OR currencies OR DXY OR EURUSD OR GBPUSD OR USDJPY') },
  { name: 'Google News', category: 'Gold', url: google('gold OR XAUUSD OR precious metals OR silver price') },
  { name: 'Google News', category: 'Central Banks', url: google('Federal Reserve OR FOMC OR ECB OR BOE OR BOJ OR Powell') },
  { name: 'Google News', category: 'Macro', url: google('inflation OR CPI OR PCE OR NFP OR unemployment OR GDP') },
  { name: 'Google News', category: 'Geopolitics', url: google('war OR conflict OR sanctions OR geopolitics OR tariffs') },
  { name: 'Google News', category: 'Markets', url: google('Wall Street OR S&P 500 OR Nasdaq OR Treasury yields OR crude oil') },
  { name: 'Google News', category: 'Crypto', url: google('Bitcoin OR BTC OR Ethereum OR cryptocurrency') },
  { name: 'CNBC', category: 'Markets', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'CNBC', category: 'Macro', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { name: 'CNBC', category: 'Geopolitics', url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html' },
  { name: 'Investing.com', category: 'Forex', url: 'https://www.investing.com/rss/news_1.rss' },
  { name: 'Investing.com', category: 'Macro', url: 'https://www.investing.com/rss/news_14.rss' },
  { name: 'Investing.com', category: 'Gold', url: 'https://www.investing.com/rss/news_11.rss' },
  { name: 'Investing.com', category: 'Markets', url: 'https://www.investing.com/rss/news_25.rss' },
  { name: 'MarketWatch', category: 'Markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  // Bloomberg's publicly published RSS headlines (not its paid news terminal feed).
  { name: 'Bloomberg', category: 'Markets', url: 'https://www.bloomberg.com/feeds/news.rss' },
  { name: 'Bloomberg', category: 'Markets', url: 'https://www.bloomberg.com/feeds/markets/news.rss' },
  { name: 'Bloomberg', category: 'Macro', url: 'https://www.bloomberg.com/feeds/economics/news.rss' },
  { name: 'Bloomberg', category: 'Markets', url: 'https://www.bloomberg.com/feeds/business/news.rss' },
  { name: 'Bloomberg', category: 'Geopolitics', url: 'https://www.bloomberg.com/feeds/politics/news.rss' },
  { name: 'Bloomberg', category: 'Markets', url: 'https://www.bloomberg.com/feeds/industries/news.rss' },
  { name: 'Bloomberg', category: 'Crypto', url: 'https://www.bloomberg.com/feeds/crypto/news.rss' },
  { name: 'Bloomberg', category: 'Markets', url: 'https://www.bloomberg.com/feeds/technology/news.rss' },
  // Google News coverage helps catch Bloomberg stories absent from its short official RSS lists.
  { name: 'Google News', category: 'Markets', url: google('site:bloomberg.com') },
  { name: 'Google News', category: 'Forex', url: google('site:bloomberg.com dollar OR yen OR forex OR gold') },
  { name: 'Google News', category: 'Macro', url: google('site:bloomberg.com interest rates OR inflation OR jobs') },
  { name: 'Google News', category: 'Markets', url: google('site:reuters.com commodities OR currencies OR global markets') },
  { name: 'Google News', category: 'Forex', url: google('forex live market reaction gold Fed Treasury currencies') }
];

const MAX_ITEMS = 500;
const CACHE_MS = 90 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5500;
let cache = { at: 0, items: [], sourcesOk: 0 };
let loading = null;

function decode(s) {
  return String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const num = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return num > 0 && num <= 0x10ffff ? String.fromCodePoint(num) : '';
    })
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/gi, e => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&#39;': "'"
    }[e.toLowerCase()] || e));
}
function clean(s) {
  return decode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  return m ? m[1] : '';
}
function validUrl(raw) {
  try {
    const u = new URL(decode(raw).trim());
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}
function classify(title, fallback) {
  const t = title.toLowerCase();
  if (/\b(bitcoin|btc|crypto|ethereum|eth|blockchain)\b/.test(t)) return 'Crypto';
  if (/\b(gold|xauusd|silver|bullion|precious metals)\b/.test(t)) return 'Gold';
  if (/\b(war|conflict|missile|sanctions|ceasefire|tariffs|geopolitic)\b/.test(t)) return 'Geopolitics';
  if (/\b(fed|fomc|ecb|boe|boj|central bank|powell|rate decision|rate cut|rate hike)\b/.test(t)) return 'Central Banks';
  if (/\b(forex|currency|currencies|dollar|yen|euro|sterling|pound|dxy|usd|eurusd|gbpusd|usdjpy)\b/.test(t)) return 'Forex';
  if (/\b(cpi|pce|inflation|payroll|nfp|gdp|employment|unemployment|retail sales|consumer confidence)\b/.test(t)) return 'Macro';
  if (/\b(stocks|nasdaq|s&p|dow jones|shares|treasury|oil|bond|yields)\b/.test(t)) return 'Markets';
  return fallback;
}
function parseFeed(xml, feed, now) {
  const entries = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  const results = [];
  for (const block of entries.slice(0, 100)) {
    const title = clean(tag(block, 'title'));
    const link = validUrl(tag(block, 'link'));
    const rawDate = clean(tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published'));
    const time = Date.parse(rawDate);
    if (title.length < 8 || !link || !Number.isFinite(time) || time > now + 10 * 60 * 1000 || now - time > MAX_AGE_MS) continue;
    const origin = clean(tag(block, 'source'));
    const suffix = title.match(/\s+-\s+([^–-]{2,55})$/);
    const source = feed.name === 'Google News' ? (origin || (suffix && suffix[1]) || 'Google News') : feed.name;
    const desc = clean(tag(block, 'description')).slice(0, 220);
    results.push({ title, desc, date: new Date(time).toISOString(), link, url: link, source,
      category: classify(title, feed.category), sourceUrl: feed.url });
  }
  return results;
}
function dedupe(items) {
  const seen = new Set();
  const output = [];
  for (const item of items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    const key = item.title.toLowerCase()
      .replace(/\s+-\s+[^–-]{2,55}$/, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length === MAX_ITEMS) break;
  }
  return output;
}
async function readFeed(feed, now) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feed.url, { signal: controller.signal, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PipSePaisaNewsHub/2.0; +https://pipsepaisa.com)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    } });
    if (!response.ok) throw new Error('Feed HTTP ' + response.status);
    const xml = await response.text();
    if (!/<rss\b|<item\b/i.test(xml)) throw new Error('Invalid RSS');
    return { ok: true, items: parseFeed(xml, feed, now) };
  } catch (e) {
    return { ok: false, items: [] };
  } finally { clearTimeout(timeout); }
}
async function refresh() {
  const now = Date.now();
  const results = await Promise.all(FEEDS.map(f => readFeed(f, now)));
  const sourcesOk = results.filter(r => r.ok).length;
  const items = dedupe(results.flatMap(r => r.items));
  if (items.length) cache = { at: Date.now(), items, sourcesOk };
  return { items: items.length ? items : cache.items, sourcesOk, fresh: Boolean(items.length) };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=180');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed', items: [] });

  try {
    const now = Date.now();
    if (!cache.items.length || now - cache.at >= CACHE_MS) {
      if (!loading) loading = refresh().finally(() => { loading = null; });
      await loading;
    }
    const category = typeof req.query?.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.trunc(limitRaw), MAX_ITEMS) : MAX_ITEMS;
    const filtered = category ? cache.items.filter(x => x.category.toLowerCase() === category) : cache.items;
    res.setHeader('X-News-Sources-OK', String(cache.sourcesOk));
    res.setHeader('X-News-Cache', now - cache.at < CACHE_MS ? 'FRESH' : 'STALE');
    return res.status(200).json({ success: filtered.length > 0, items: filtered.slice(0, limit),
      total: filtered.length, sources: cache.sourcesOk, updatedAt: cache.at ? new Date(cache.at).toISOString() : null,
      ...(filtered.length ? {} : { error: 'News feeds temporarily unavailable' }) });
  } catch (e) {
    return res.status(200).json({ success: cache.items.length > 0, items: cache.items,
      error: String(e && e.message || e) });
  }
};
