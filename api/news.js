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


// Targeted priority topics; Google News finds openly indexed headlines rather than bypassing publisher licenses.
const TARGETED_GOOGLE_FEEDS = [
  { name: 'Google News', category: "US News", url: google("Donald Trump White House tariffs trade policy") },
  { name: 'Google News', category: "US News", url: google("Trump press conference remarks economy markets") },
  { name: 'Google News', category: "US News", url: google("President Trump executive orders new sanctions") },
  { name: 'Google News', category: "US News", url: google("White House briefing press secretary announcements") },
  { name: 'Google News', category: "US News", url: google("Trump Powell Federal Reserve rate decision") },
  { name: 'Google News', category: "US News", url: google("Trump China tariff trade negotiations") },
  { name: 'Google News', category: "US News", url: google("US Congress government shutdown debt ceiling") },
  { name: 'Google News', category: "US News", url: google("US Treasury sanctions OFAC breaking") },
  { name: 'Google News', category: "Geopolitics", url: google("Iran Israel Middle East conflict ceasefire") },
  { name: 'Google News', category: "Geopolitics", url: google("Ukraine Russia war sanctions peace talks") },
  { name: 'Google News', category: "Geopolitics", url: google("China Taiwan military geopolitical tensions") },
  { name: 'Google News', category: "Geopolitics", url: google("Strait of Hormuz shipping oil sanctions") },
  { name: 'Google News', category: "Geopolitics", url: google("NATO tensions security geopolitical") },
  { name: 'Google News', category: "Forex", url: google("EURUSD euro dollar ECB Fed exchange rates") },
  { name: 'Google News', category: "Forex", url: google("GBPUSD sterling Bank of England UK inflation") },
  { name: 'Google News', category: "Forex", url: google("USDJPY yen BOJ intervention Japan rates") },
  { name: 'Google News', category: "Forex", url: google("AUDUSD Australian dollar RBA policy") },
  { name: 'Google News', category: "Forex", url: google("USDCAD Canadian dollar Bank of Canada") },
  { name: 'Google News', category: "Forex", url: google("NZDUSD New Zealand dollar RBNZ") },
  { name: 'Google News', category: "Forex", url: google("Swiss franc USDCHF SNB rate decision") },
  { name: 'Google News', category: "Gold", url: google("spot gold XAUUSD breaking prices") },
  { name: 'Google News', category: "Gold", url: google("gold bullion Treasury yields USD") },
  { name: 'Google News', category: "Gold", url: google("silver XAGUSD precious metals") },
  { name: 'Google News', category: "Markets", url: google("crude oil WTI Brent OPEC price") },
  { name: 'Google News', category: "Markets", url: google("EIA weekly oil inventory report") },
  { name: 'Google News', category: "Macro", url: google("US CPI inflation consumer price index") },
  { name: 'Google News', category: "Macro", url: google("US PPI producer price inflation") },
  { name: 'Google News', category: "Macro", url: google("US nonfarm payrolls NFP unemployment") },
  { name: 'Google News', category: "Macro", url: google("US core PCE inflation data") },
  { name: 'Google News', category: "Macro", url: google("US retail sales GDP report") },
  { name: 'Google News', category: "Macro", url: google("US jobless claims JOLTS employment") },
  { name: 'Google News', category: "Central Banks", url: google("FOMC Fed Powell monetary policy") },
  { name: 'Google News', category: "Central Banks", url: google("ECB Lagarde rate decision") },
  { name: 'Google News', category: "Central Banks", url: google("Bank of England interest rate") },
  { name: 'Google News', category: "Central Banks", url: google("Bank of Japan Ueda yen intervention") },
  { name: 'Google News', category: "Central Banks", url: google("RBA RBNZ central bank policy") },
  { name: 'Google News', category: "Markets", url: google("US Treasury yields bond auction") },
  { name: 'Google News', category: "Markets", url: google("S&P 500 Nasdaq Wall Street stocks") },
  { name: 'Google News', category: "Crypto", url: google("bitcoin BTC ETF cryptocurrency") },
  { name: 'Google News', category: "Crypto", url: google("ethereum ETH SEC crypto") },
  { name: 'Google News', category: "Forex", url: google("site:forexlive.com currencies gold Fed") },
  { name: 'Google News', category: "Forex", url: google("site:fxstreet.com/news forex currencies") },
  { name: 'Google News', category: "Forex", url: google("site:forexfactory.com/news forex USD") },
  { name: 'Google News', category: "Forex", url: google("site:investing.com/news/forex-news") },
  { name: 'Google News', category: "Markets", url: google("site:reuters.com/markets/ currencies commodities") },
  { name: 'Google News', category: "US News", url: google("site:apnews.com/article Trump economy") },
  { name: 'Google News', category: "Markets", url: google("site:ft.com central bank currencies") },
  { name: 'Google News', category: "Markets", url: google("site:financialjuice.com breaking") },
  { name: 'Google News', category: "Markets", url: google("site:newsquawk.com breaking") },
  { name: 'Google News', category: "Markets", url: google("site:marketscreener.com markets") },
  { name: 'Google News', category: "US News", url: google("site:bloomberg.com Trump White House") },
  { name: 'Google News', category: "Gold", url: google("site:bloomberg.com gold XAUUSD") },
  { name: 'Google News', category: "Markets", url: google("site:cnbc.com market breaking news") }
];
// Official publicly documented government RSS and one general news RSS.
const PUBLIC_RSS_FEEDS = [
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/news/feed/" },
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/presidential-actions/feed/" },
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/presidential-actions/executive-orders/feed/" },
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/briefings-statements/feed/" },
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/fact-sheets/feed/" },
  { name: "White House", category: "US News", url: "https://www.whitehouse.gov/releases/feed/" },
  { name: "Federal Reserve", category: "Central Banks", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "Federal Reserve", category: "Central Banks", url: "https://www.federalreserve.gov/feeds/press_monetary.xml" },
  { name: "Federal Reserve", category: "Central Banks", url: "https://www.federalreserve.gov/feeds/speeches.xml" },
  { name: "Federal Reserve", category: "Central Banks", url: "https://www.federalreserve.gov/feeds/speeches_and_testimony.xml" },
  { name: "BLS", category: "Macro", url: "https://www.bls.gov/feed/bls_latest.rss" },
  { name: "BLS", category: "Macro", url: "https://www.bls.gov/feed/empsit.rss" },
  { name: "BLS", category: "Macro", url: "https://www.bls.gov/feed/cpi.rss" },
  { name: "BLS", category: "Macro", url: "https://www.bls.gov/feed/ppi.rss" },
  { name: "BLS", category: "Macro", url: "https://www.bls.gov/feed/jolts.rss" },
  { name: "EIA", category: "Markets", url: "https://www.eia.gov/rss/todayinenergy.xml" },
  { name: "EIA", category: "Markets", url: "https://www.eia.gov/rss/press_rss.xml" },
  { name: "ECB", category: "Central Banks", url: "https://www.ecb.int/rss/press.html" },
  { name: "Yahoo News", category: "US News", url: "https://news.yahoo.com/rss/topstories" }
];
// Specifically surface announced speeches and live policy events as news coverage.
// Search results are published articles, not independently verified event schedules.
TARGETED_GOOGLE_FEEDS.push(
  { name: 'Google News', category: 'US News', url: google('Donald Trump scheduled speech today tomorrow White House official remarks') },
  { name: 'Google News', category: 'US News', url: google('site:whitehouse.gov President Trump remarks live speech briefing') },
  { name: 'Google News', category: 'Central Banks', url: google('FOMC press conference Federal Reserve Chair Powell live remarks rate decision') }
);
// Dedicated published coverage of major calendar-type MARKET NEWS, not artificial upcoming events.
// These are source-linked articles with actual publisher timestamps.
TARGETED_GOOGLE_FEEDS.push(
  { name: 'Google News', category: "Central Banks", url: google("FOMC press conference Powell says Federal Reserve decisions live statement") },
  { name: 'Google News', category: "Central Banks", url: google("Federal Reserve FOMC statement released rate hold hike cut") },
  { name: 'Google News', category: "Central Banks", url: google("Jerome Powell press conference remarks dollar gold bond yields") },
  { name: 'Google News', category: "Central Banks", url: google("Fed FOMC meeting minutes published reaction") },
  { name: 'Google News', category: "Central Banks", url: google("Fed speakers Waller Bowman Williams Bostic monetary policy remarks") },
  { name: 'Google News', category: "Central Banks", url: google("ECB Lagarde press conference comments rates inflation") },
  { name: 'Google News', category: "Central Banks", url: google("Bank of England governor Bailey press conference rate decision") },
  { name: 'Google News', category: "Central Banks", url: google("Bank of Japan Ueda news conference monetary policy") },
  { name: 'Google News', category: "Macro", url: google("US CPI inflation report released actual vs forecast") },
  { name: 'Google News', category: "Macro", url: google("US core PCE price index report actual versus estimates") },
  { name: 'Google News', category: "Macro", url: google("US PPI producer price report released actual data") },
  { name: 'Google News', category: "Macro", url: google("US non farm payroll NFP jobs report released actual forecast") },
  { name: 'Google News', category: "Macro", url: google("US unemployment rate data report labor market") },
  { name: 'Google News', category: "Macro", url: google("US GDP advance estimate actual report BEA") },
  { name: 'Google News', category: "Macro", url: google("US retail sales data released forecast dollar") },
  { name: 'Google News', category: "Macro", url: google("weekly jobless claims release actual expected") },
  { name: 'Google News', category: "Macro", url: google("ISM manufacturing services PMI released actual results") },
  { name: 'Google News', category: "Macro", url: google("JOLTS job openings report released actual") },
  { name: 'Google News', category: "Markets", url: google("EIA crude oil inventories weekly figures released") },
  { name: 'Google News', category: "US News", url: google("President Donald Trump speech remarks today economy tariffs policy live") },
  { name: 'Google News', category: "US News", url: google("Trump press conference White House remarks markets dollar gold") },
  { name: 'Google News', category: "US News", url: google("White House press briefing statement today Trump tariffs") },
  { name: 'Google News', category: "US News", url: google("Trump announcement sanctions trade China market reaction") },
  { name: 'Google News', category: "US News", url: google("US Treasury Secretary speech economy tariff announcement") },
  { name: 'Google News', category: "Gold", url: google("gold reaction to Fed Powell press conference inflation data") },
  { name: 'Google News', category: "Forex", url: google("forex market moves after FOMC Powell rate decision") },
  { name: 'Google News', category: "Forex", url: google("USD dollar yen euro react CPI NFP unemployment economic data") },
  { name: 'Google News', category: "Markets", url: google("site:bls.gov/news.release/ CPI jobs report") },
  { name: 'Google News', category: "Markets", url: google("site:bea.gov/news/ GDP PCE economic reports") }
);
FEEDS.push(...TARGETED_GOOGLE_FEEDS, ...PUBLIC_RSS_FEEDS);

const MAX_ITEMS = 500;
const CACHE_MS = 2 * 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
let cache = { at: 0, items: [], sourcesOk: 0, feedHealth: [], totalParsed: 0 };
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

// Market Focus means editorial relevance for forex/macro trading. It is NOT
// verified price impact, a trading recommendation, or a severity prediction.
// Use the article headline only; never infer facts that the publisher didn't state.
function marketFocusTopic(title) {
  const t=String(title||'').toLowerCase();
  if (!t.trim()) return null;
  if (/\b(?:22k|24k|jewellery|jewelry|per gram|per tola|gold rate in hyderabad|gold rate in delhi|gold rate in mumbai)\b/.test(t)) return null;
  if (/\b(?:fomc|federal reserve|powell|fed chair|ecb|lagarde|boe|bank of england|boj|bank of japan|snb|rba|rbnz)\b/.test(t) &&
      /\b(?:rate|policy|hike|cut|hold|meeting|minutes|statement|press conference|speech|speaks|remarks|says|inflation|decision|outlook|testimony|warning)\b/.test(t)) return 'Central Banks';
  if (/\b(?:trump|white house|president of the united states|us treasury|treasury secretary)\b/.test(t) &&
      /\b(?:tariff|trade|sanction|econom|dollar|fed|rate|market|oil|export|import|china|speech|remarks|announce|executive order|address|policy|tax|budget)\w*\b/.test(t)) return 'US Policy';
  if (/\b(?:nfp|nonfarm|payrolls|jobless claims|unemployment|consumer price index|cpi|producer price index|ppi|pce|retail sales|job openings|jolts|ism|pmi|gdp)\b/.test(t) &&
      /\b(?:us|u\.s\.|united states|federal|american|jobs|data|report|released|inflation|fed|dollar|rate|economy|payroll|forecast|markets)\b/.test(t)) return 'Economic Data';
  if (/\b(?:xauusd|xau\/usd|gold|bullion|silver|precious metals|xagusd)\b/.test(t) &&
      /\b(?:spot|futures|prices?|rises?|falls?|jumps?|slips?|slides?|surges?|drops?|market|fed|dollar|yields?|rates?|inflation|trading|record|hits?|high|low|outlook)\b/.test(t)) return 'Gold & Silver';
  if (/\b(?:eurusd|gbpusd|usdjpy|usdcad|audusd|nzdusd|usdchf|eur\/usd|gbp\/usd|usd\/jpy|forex|fx market|currency|currencies|us dollar|dxy|yen|euro|pound sterling)\b/.test(t) &&
      /\b(?:rises?|falls?|climbs?|drops?|surges?|slips?|weakens?|strengthens?|hits?|trades?|rates?|fed|ecb|boj|boe|inflation|data|yields?|policy|market|tariff|decision|intervention|outlook)\b/.test(t)) return 'Forex';
  if (/\b(?:wti|brent|crude oil|opec|oil prices?|oil supply|strait of hormuz|oil inventories)\b/.test(t) &&
      /\b(?:rises?|falls?|surges?|slumps?|supply|output|production|sanction|inventory|market|price|war|exports?|shipping|cut|hike|record|demand|ceasefire)\b/.test(t)) return 'Oil & Energy';
  if (/\b(?:iran|israel|russia|ukraine|taiwan|middle east|red sea|hormuz)\b/.test(t) &&
      /\b(?:war|attack|missile|ceasefire|sanction|invasion|strike|shipping|conflict|oil|escalat|deal|nuclear|troops|peace talks|diplomatic)\w*\b/.test(t)) return 'Geopolitics';
  if (/\b(?:bitcoin|btc|ethereum|ether|crypto)\b/.test(t) &&
      /\b(?:price|futures|spot|etf|regulation|sec|market|rises?|falls?|surges?|drops?|record|fed|liquidation)\b/.test(t)) return 'Crypto';
  return null;
}

function parseFeed(xml, feed, now) {
  const entries = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];
  const results = [];
  for (const block of entries.slice(0, 100)) {
    const title = clean(tag(block, 'title'));
    const link = validUrl(tag(block, 'link') || ((block.match(/<link\s+[^>]*href=[\"']([^\"']+)[\"']/i)||[])[1]||''));
    const rawDate = clean(tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published') || tag(block, 'updated'));
    const time = Date.parse(rawDate);
    if (title.length < 8 || !link || !Number.isFinite(time) || time > now + 10 * 60 * 1000 || now - time > MAX_AGE_MS) continue;
    const origin = clean(tag(block, 'source'));
    const suffix = title.match(/\s+-\s+([^–-]{2,55})$/);
    const source = feed.name === 'Google News' ? (origin || (suffix && suffix[1]) || 'Google News') : feed.name;
    const desc = clean(tag(block, 'description')).slice(0, 220);
    const focusTopic=marketFocusTopic(title);
    results.push({ title, desc, date: new Date(time).toISOString(), link, url: link, source,
      category: classify(title, feed.category), sourceUrl: feed.url,
      marketFocus:Boolean(focusTopic), focusTopic:focusTopic||null });
  }
  return results;
}
function dedupe(items) {
  const seen = new Set(), all = [];
  for (const item of items.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))) {
    const key=item.title.toLowerCase().replace(/\s+-\s+[^–-]{2,55}$/, '')
      .replace(/[^a-z0-9]+/g,' ').trim();
    if(!key||seen.has(key))continue;
    seen.add(key);all.push(item);
  }
  if(all.length<=MAX_ITEMS)return all;
  // Reserve enough room so crowded generic news cannot displace fresh
  // trading-relevant headlines. The All tab retains the remaining newest items.
  const relevant=all.filter(x=>x.marketFocus);
  const selected=new Set(relevant.slice(0,Math.min(300,MAX_ITEMS)));
  for(const item of all) {
    if(selected.size>=MAX_ITEMS)break;
    selected.add(item);
  }
  return Array.from(selected).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
async function readFeed(feed, now) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feed.url, { signal: controller.signal, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PipSePaisaNewsHub/3.0; +https://pipsepaisa.com)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const xml = await response.text();
    if (!/<rss\b|<item\b|<feed\b|<entry\b/i.test(xml)) throw new Error('Invalid RSS/Atom');
    const items = parseFeed(xml, feed, now);
    return { ok: true, items, health: { name: feed.name, category: feed.category, url: feed.url,
      ok: true, count: items.length, durationMs: Date.now()-start } };
  } catch (e) {
    return { ok: false, items: [], health: {name: feed.name, category: feed.category, url: feed.url,
      ok:false, count:0, durationMs: Date.now()-start, error: String((e&&e.message)||e).slice(0,100)} };
  } finally { clearTimeout(timeout); }
}
async function refresh() {
  const now = Date.now();
  const results = await Promise.all(FEEDS.map(f => readFeed(f, now)));
  const sourceHealth = results.map(r=>r.health);
  const sourcesOk = sourceHealth.filter(s=>s.ok).length;
  const allItems = results.flatMap(r=>r.items);
  const items = dedupe(allItems);
  // Even on upstream failure, back off instead of hammering every provider on every request.
  cache = {at:Date.now(), items: items.length ? items : cache.items, sourcesOk,
    feedHealth: sourceHealth, totalParsed: allItems.length};
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
    if (req.query?.health === '1') {
      return res.status(200).json({ success:true, configured:FEEDS.length,
        working:cache.feedHealth.filter(s=>s.ok).length,
        withItems:cache.feedHealth.filter(s=>s.count>0).length,
        totalParsed:cache.totalParsed, uniqueHeadlines:cache.items.length,
        updatedAt:cache.at?new Date(cache.at).toISOString():null, feeds:cache.feedHealth });
    }
    const category = typeof req.query?.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.trunc(limitRaw), MAX_ITEMS) : MAX_ITEMS;
    const filtered = category ? cache.items.filter(x => x.category.toLowerCase() === category) : cache.items;
    res.setHeader('X-News-Sources-OK', String(cache.sourcesOk));
    res.setHeader('X-News-Cache', now - cache.at < CACHE_MS ? 'FRESH' : 'STALE');
    return res.status(200).json({ success: filtered.length > 0, items: filtered.slice(0, limit),
      total: filtered.length, focusCount: filtered.filter(x=>x.marketFocus).length,
      configured: FEEDS.length, sources: cache.sourcesOk, updatedAt: cache.at ? new Date(cache.at).toISOString() : null,
      ...(filtered.length ? {} : { error: 'News feeds temporarily unavailable' }) });
  } catch (e) {
    return res.status(200).json({ success: cache.items.length > 0, items: cache.items,
      error: String(e && e.message || e) });
  }
};
