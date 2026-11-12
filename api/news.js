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
  { name: 'Google News', category: "US News", url: google("Trump press conference") },
  { name: 'Google News', category: "US News", url: google("Trump executive order") },
  { name: 'Google News', category: "US News", url: google("White House press briefing") },
  { name: 'Google News', category: "US News", url: google("Trump Federal Reserve") },
  { name: 'Google News', category: "US News", url: google("Trump China tariffs") },
  { name: 'Google News', category: "US News", url: google("US Congress government shutdown debt ceiling") },
  { name: 'Google News', category: "US News", url: google("US Treasury sanctions OFAC breaking") },
  { name: 'Google News', category: "Geopolitics", url: google("Iran Israel Middle East conflict ceasefire") },
  { name: 'Google News', category: "Geopolitics", url: google("Ukraine Russia war sanctions peace talks") },
  { name: 'Google News', category: "Geopolitics", url: google("China Taiwan military geopolitical tensions") },
  { name: 'Google News', category: "Geopolitics", url: google("Strait of Hormuz shipping oil sanctions") },
  { name: 'Google News', category: "Geopolitics", url: google("NATO tensions security geopolitical") },
  { name: 'Google News', category: "Forex", url: google("EURUSD ECB") },
  { name: 'Google News', category: "Forex", url: google("GBPUSD BoE") },
  { name: 'Google News', category: "Forex", url: google("USDJPY BOJ") },
  { name: 'Google News', category: "Forex", url: google("AUDUSD RBA") },
  { name: 'Google News', category: "Forex", url: google("USDCAD BOC") },
  { name: 'Google News', category: "Forex", url: google("NZDUSD RBNZ") },
  { name: 'Google News', category: "Forex", url: google("Swiss franc USDCHF SNB rate decision") },
  { name: 'Google News', category: "Gold", url: google("spot gold prices") },
  { name: 'Google News', category: "Gold", url: google("gold bullion Treasury yields USD") },
  { name: 'Google News', category: "Gold", url: google("silver XAGUSD precious metals") },
  { name: 'Google News', category: "Markets", url: google("crude oil WTI Brent OPEC price") },
  { name: 'Google News', category: "Markets", url: google("EIA weekly oil inventory report") },
  { name: 'Google News', category: "Macro", url: google("US CPI inflation") },
  { name: 'Google News', category: "Macro", url: google("US PPI") },
  { name: 'Google News', category: "Macro", url: google("nonfarm payrolls") },
  { name: 'Google News', category: "Macro", url: google("US core PCE") },
  { name: 'Google News', category: "Macro", url: google("US retail sales GDP report") },
  { name: 'Google News', category: "Macro", url: google("US jobless claims") },
  { name: 'Google News', category: "Central Banks", url: google("FOMC Powell") },
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
  { name: 'Google News', category: 'US News', url: google("Trump White House speech") },
  { name: 'Google News', category: 'US News', url: google('site:whitehouse.gov President Trump remarks live speech briefing') },
  { name: 'Google News', category: 'Central Banks', url: google("FOMC press conference") }
);
// Dedicated published coverage of major calendar-type MARKET NEWS, not artificial upcoming events.
// These are source-linked articles with actual publisher timestamps.
TARGETED_GOOGLE_FEEDS.push(
  { name: 'Google News', category: "Central Banks", url: google("FOMC press conference") },
  { name: 'Google News', category: "Central Banks", url: google("FOMC statement") },
  { name: 'Google News', category: "Central Banks", url: google("Powell press conference") },
  { name: 'Google News', category: "Central Banks", url: google("FOMC minutes") },
  { name: 'Google News', category: "Central Banks", url: google("Fed official speech") },
  { name: 'Google News', category: "Central Banks", url: google("ECB press conference") },
  { name: 'Google News', category: "Central Banks", url: google("BOE interest rate decision") },
  { name: 'Google News', category: "Central Banks", url: google("BOJ press conference") },
  { name: 'Google News', category: "Macro", url: google("US CPI released") },
  { name: 'Google News', category: "Macro", url: google("core PCE released") },
  { name: 'Google News', category: "Macro", url: google("US PPI released") },
  { name: 'Google News', category: "Macro", url: google("US jobs report") },
  { name: 'Google News', category: "Macro", url: google("US unemployment rate") },
  { name: 'Google News', category: "Macro", url: google("US GDP report") },
  { name: 'Google News', category: "Macro", url: google("US retail sales") },
  { name: 'Google News', category: "Macro", url: google("jobless claims") },
  { name: 'Google News', category: "Macro", url: google("ISM PMI") },
  { name: 'Google News', category: "Macro", url: google("JOLTS job openings") },
  { name: 'Google News', category: "Markets", url: google("EIA crude oil inventories weekly figures released") },
  { name: 'Google News', category: "US News", url: google("Trump speech") },
  { name: 'Google News', category: "US News", url: google("Trump White House remarks") },
  { name: 'Google News', category: "US News", url: google("White House statement") },
  { name: 'Google News', category: "US News", url: google("Trump tariff announcement") },
  { name: 'Google News', category: "US News", url: google("Treasury Secretary remarks") },
  { name: 'Google News', category: "Gold", url: google("gold Fed Powell") },
  { name: 'Google News', category: "Forex", url: google("forex FOMC") },
  { name: 'Google News', category: "Forex", url: google("dollar CPI NFP") },
  { name: 'Google News', category: "Markets", url: google("site:bls.gov/news.release/ CPI jobs report") },
  { name: 'Google News', category: "Markets", url: google("site:bea.gov/news/ GDP PCE economic reports") }
);
TARGETED_GOOGLE_FEEDS.push(
  { name:'Google News', category:"Forex", url:google("Japan finance minister yen intervention") },
  { name:'Google News', category:"Forex", url:google("Katayama foreign exchange market intervention") },
  { name:'Google News', category:"Forex", url:google("BOJ governor Japan yen live remarks") },
  { name:'Google News', category:"Central Banks", url:google("FOMC statement Fed press conference") },
  { name:'Google News', category:"Central Banks", url:google("Powell Federal Reserve officials remarks") },
  { name:'Google News', category:"Geopolitics", url:google("Russia Ukraine cargo ship Black Sea strikes") },
  { name:'Google News', category:"Geopolitics", url:google("Iran Israel ceasefire strike breaking") },
  { name:'Google News', category:"Geopolitics", url:google("shipping Strait of Hormuz oil tanker attacks") },
  { name:'Google News', category:"US News", url:google("Trump announces tariffs sanctions") },
  { name:'Google News', category:"US News", url:google("White House official tariff trade policy announcements") },
  { name:'Google News', category:"Markets", url:google("OPEC oil production output decision") },
  { name:'Google News', category:"Macro", url:google("CPI data released inflation actual forecast") },
  { name:'Google News', category:"Macro", url:google("NFP nonfarm payroll jobs released") },
  { name:'Google News', category:"Forex", url:google("site:forexlive.com Japan forex yen intervention") },
  { name:'Google News', category:"Forex", url:google("site:fxstreet.com/news Fed Powell USDJPY EURUSD") }
);
FEEDS.push(...TARGETED_GOOGLE_FEEDS, ...PUBLIC_RSS_FEEDS);
// Curated Gold/Forex research and central-bank policy coverage.
// Google News indexes the publisher's *public headlines* and links visitors to
// originals; we neither reproduce paywalled bodies nor claim official approval.
const GOLD_FOREX_PRIORITY_GOOGLE_FEEDS = [
  // XAUUSD: physical/ETF flows, positioning, yields and currency-driven repricing.
  { name:'Google News', category:'Gold', url:google('spot gold XAUUSD dollar Treasury yields real yields') },
  { name:'Google News', category:'Gold', url:google('COMEX gold futures institutional positioning open interest') },
  { name:'Google News', category:'Gold', url:google('gold ETF flows inflows outflows central bank purchases') },
  { name:'Google News', category:'Gold', url:google('World Gold Council central bank gold demand ETF flows') },
  { name:'Google News', category:'Gold', url:google('site:gold.org/goldhub gold market commentary ETF demand') },
  { name:'Google News', category:'Gold', url:google('site:kitco.com/news gold silver spot price Fed dollar') },
  { name:'Google News', category:'Gold', url:google('site:fxstreet.com/news gold XAUUSD Treasury yields') },
  { name:'Google News', category:'Gold', url:google('site:reuters.com gold bullion precious metals dollar Fed') },
  { name:'Google News', category:'Gold', url:google('LBMA gold precious metals London fix market') },
  // Major pairs and central-bank policy shifts.
  { name:'Google News', category:'Forex', url:google('EURUSD GBPUSD USDJPY currency pair market moves') },
  { name:'Google News', category:'Forex', url:google('GBPJPY EURJPY cross currency exchange rate moves') },
  { name:'Google News', category:'Forex', url:google('AUDUSD NZDUSD RBA RBNZ rates currency') },
  { name:'Google News', category:'Forex', url:google('USDCAD USDCHF Bank of Canada SNB forex policy') },
  { name:'Google News', category:'Forex', url:google('USDCNH yuan renminbi PBOC yuan fixing currency') },
  { name:'Google News', category:'Forex', url:google('US dollar index DXY euro yen sterling forex reaction') },
  { name:'Google News', category:'Forex', url:google('site:forexlive.com gold forex currencies yield market news') },
  { name:'Google News', category:'Forex', url:google('site:fxstreet.com/news GBPJPY EURJPY AUDUSD USDCAD') },
  // Disclosed research and weekly reports: CFTC RSS is presently disabled;
  // these are dated news articles, NOT a substitute for verified COT figures.
  { name:'Google News', category:'Gold', url:google('CFTC COT gold futures net long speculative positioning') },
  { name:'Google News', category:'Forex', url:google('CFTC commitments of traders dollar euro yen futures positioning') },
  // Important cross-asset catalysts for XAUUSD and FX.
  { name:'Google News', category:'Macro', url:google('US CPI PPI PCE NFP payroll inflation dollar gold reaction') },
  { name:'Google News', category:'Macro', url:google('US Treasury 10 year real yields TIPS dollar gold moves') },
  { name:'Google News', category:'Central Banks', url:google('Fed FOMC statement minutes Powell rates gold dollar') },
  { name:'Google News', category:'Central Banks', url:google('ECB BoE BOJ RBA RBNZ BOC SNB interest rate decision currency') },
  { name:'Google News', category:'Geopolitics', url:google('safe haven gold geopolitical oil supply Hormuz sanctions') }
];
// Direct RSS sources listed by the institutions themselves; when blocked or
// outside the freshness window they simply contribute zero items.
const GOLD_FOREX_OFFICIAL_RSS_FEEDS = [
  { name:'European Central Bank', category:'Central Banks', url:'https://www.ecb.europa.eu/rss/press.html' },
  { name:'European Central Bank', category:'Macro', url:'https://www.ecb.europa.eu/rss/statpress.html' },
  { name:'Bank of England', category:'Central Banks', url:'https://www.bankofengland.co.uk/rss/news' }
];
FEEDS.push(...GOLD_FOREX_PRIORITY_GOOGLE_FEEDS, ...GOLD_FOREX_OFFICIAL_RSS_FEEDS);


// Some targeted topics overlap older feeds. Avoid duplicate outbound fetches.
const FEED_URLS=new Set();
const ACTIVE_FEEDS=FEEDS.filter(feed=>{
  if(FEED_URLS.has(feed.url))return false;
  FEED_URLS.add(feed.url);
  return true;
});

const MAX_ITEMS = 500;
const CACHE_MS = 2 * 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
let cache = { at: 0, items: [], tradingItems: [], sourcesOk: 0, feedHealth: [], totalParsed: 0 };
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
  // Remove CDATA delimiters before stripping HTML tags. Publisher RSS feeds
  // (including Bloomberg) wrap entire headlines in CDATA; stripping tags first
  // incorrectly deleted those titles and made otherwise healthy feeds empty.
  const withoutCdata=String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'');
  return decode(withoutCdata.replace(/<[^>]*>/g,' ')).replace(/<[^>]*>/g,' ')
    .replace(/\s+/g,' ').trim();
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
  // A named currency pair takes precedence over generic central-bank keywords.
  if (/\b(?:eurusd|gbpusd|usdjpy|gbpjpy|eurjpy|audusd|nzdusd|usdcad|usdchf|eurgbp|usdcnh|cadjpy|eur\/usd|gbp\/usd|usd\/jpy|gbp\/jpy|aud\/usd|nzd\/usd|usd\/cad|usd\/chf)\b/.test(t)) return 'Forex';
  if (/\b(war|conflict|missile|sanctions|ceasefire|tariffs|geopolitic)\b/.test(t)) return 'Geopolitics';
  if (/\b(fed|fomc|ecb|boe|boj|rba|rbnz|snb|boc|bank of canada|bank of japan|bank of england|central bank|powell|lagarde|rate decision|rate cut|rate hike|monetary policy)\b/.test(t)) return 'Central Banks';
  if (/\b(forex|currency|currencies|dollar|yen|euro|sterling|pound|dxy|usd|eurusd|gbpusd|usdjpy|gbpjpy|eurjpy|audusd|nzdusd|usdcad|usdchf|eurusd|eurgbp|usdcnh|cnh|cadjpy|eur\/usd|gbp\/usd|usd\/jpy|gbp\/jpy|aud\/usd|nzd\/usd|usd\/cad|usd\/chf)\b/.test(t)) return 'Forex';
  if (/\b(cpi|ppi|pce|jolts|nonfarm|payroll|nfp|gdp|inflation|employment|unemployment|retail sales|consumer confidence|ism pmi|jobless claims|real yields|treasury yields|tips yields)\b/.test(t)) return 'Macro';
  if (/\b(stocks|nasdaq|s&p|dow jones|shares|treasury|oil|bond|yields)\b/.test(t)) return 'Markets';
  return fallback;
}

// Editorial triage, NOT verified price impact or a guaranteed market move.
// HOT = concrete potentially high-volatility macro, geopolitical, trade or intervention story.
// WARM = relevant preview, commentary or market developments.
// COLD = unrelated corporate or routine local news. Published headline text is the only input.
function gradeHeadline(title) {
  const t=String(title||'').toLowerCase().replace(/\s+/g,' ').trim();
  const out=(level,topic,reason)=>({level,topic,reason});
  if(!t)return out('cold',null,'No headline');
  if(/\b(?:22k|24k|18k|jewell?ery|per gram|per tola|gold rate in (?:hyderabad|delhi|mumbai|chennai))\b/.test(t))
    return out('cold',null,'Retail jewellery news');
  const preview=/\b(?:ahead of|preview|survey|poll|week ahead|next week|this week|expected to|expects? (?:to|one more|another)|likely to|may |might |could |before the|analysts? (?:say|expect)|due next|set to)\b/.test(t);
  const exOfficial=/\b(?:former|ex-|retired)\b/.test(t);
  const actor=/\b(?:fed|fomc|federal reserve|powell|ecb|lagarde|bank of england|boe|boj|bank of japan|rba|rbnz|snb|boc|bank of canada)\b/.test(t);
  const rate=/\b(?:rates?|interest rate|policy rate|federal funds|monetary policy)\b/.test(t);
  const intervention=/\b(?:yen|jpy|fx market|forex market|finance minister|fin min|katayama|japan|boj)\b/.test(t) &&
    /\b(?:interven(?:e|es|tion)|decisive steps|prepared to take decisive|ready to act|emergency measures|buy yen|sell yen)\b/.test(t);
  const talks=/\b(?:negotiat\w*|peace talks|in talks|peace effort|diplomatic efforts|proposed|proposal|draft ceasefire|discuss\w*)\b/.test(t);
  const war=/\b(?:iran|israel|russia|ukraine|taiwan|middle east|red sea|black sea|hormuz|yemen|houthi|military|defen[cs]e minister|defen[cs]e ministry)\b/.test(t);
  const attack=/\b(?:strikes?|attack(?:s|ed)?|missiles?|airstrikes?|drones?|invasion|cargo ship|bombs?|blockade|escalat\w*|sinks?|sunk|shot down|ceasefire|war)\b/.test(t);
  const oil=/\b(?:oil|crude|brent|wti|opec|refiner|refinery|hormuz|oil tanker)\b/.test(t);
  const oilDisruption=/\b(?:cuts? (?:production|output|exports|supply)|raises? (?:production|output)|halts? (?:exports|shipping|production)|disrupt\w*|blockade|sanction|attack(?:s|ed)?|strikes?|explosion|output decision)\b/.test(t);
  const policy=/\b(?:trump|white house|us treasury|u\.s\. treasury|treasury secretary|us president)\b/.test(t);
  const trade=/\b(?:tariffs?|sanctions?|trade deal|import duties|export controls?|trade restriction|trade ban)\b/.test(t);
  const enacted=/\b(?:announces?|announced|orders?|ordered|imposes?|imposed|signed|signs?|effective|approved|approves?|halts?|halted|suspends?|suspended|cuts?|raises?|lifts?|deal reached|agrees? to)\b/.test(t);
  const macro=/\b(?:cpi|consumer price index|ppi|producer price index|core pce|nonfarm payrolls?|nfp|unemployment rate|jobless claims|us gdp|u\.s\. gdp|us retail sales|u\.s\. retail sales|federal funds rate)\b/.test(t);
  const outcome=/\b(?:rises?|rose|falls?|fell|drops?|jump(?:s|ed)?|surges?|released?|report(?:s|ed)?|printed|prints?|surpris(?:e|es|ed)|beats?|misses?|unexpectedly|to \d|at \d)\b/.test(t) &&
    (/\d/.test(t)||/\b(?:released|surpris\w*|unexpectedly|beats?|misses?)\b/.test(t));
  const rateAction=/\b(?:cuts?|hikes?|raises?|holds?|held|leaves?|left|unchanged|decides?|decision|votes?|emergency|unexpectedly)\b/.test(t);
  const market=/\b(?:fx|forex|currency|currencies|dollar|usd|dxy|yen|jpy|eurusd|gbpusd|usdjpy|gbpjpy|eurjpy|usdcad|audusd|nzdusd|usdchf|usdcnh|eurgbp|eur\/usd|gbp\/usd|gold|bullion|silver|xauusd|xagusd|gold etfs?|futures positioning|cot|cftc|oil|crude|brent|wti|opec|bond yields?|real yields?|treasury yields?|stock markets?)\b/.test(t);
  const moves=/\b(?:rises?|falls?|climbs?|drops?|surges?|slumps?|jumps?|slides?|weakens?|strengthens?|rebounds?|trades?|hits?|holds?|eases?|retreats?|rall(?:y|ies)|plunges?|sinks?|gains?|outlook|pressure|volatility|prices?)\b/.test(t);
  if(intervention&&!preview)return out('hot','FX Intervention','Official FX market intervention warning');
  if(war&&attack&&!preview&&!talks)return out('hot','Geopolitics','Reported war or shipping-security development');
  if(oil&&oilDisruption&&!preview)return out('hot','Oil Supply','Reported supply disruption or oil-policy action');
  if(/\bopec\b/.test(t)&&/\b(?:agrees?|announces?|decides?)\b/.test(t)&&/\b(?:increase|decrease|output|production|supply)\b/.test(t)&&!preview)return out('hot','Oil Supply','Reported OPEC production decision');
  if(policy&&trade&&enacted&&!preview)return out('hot','US Policy','Reported enacted or announced trade measure');
  if(actor&&rate&&rateAction&&!preview&&!exOfficial)return out('hot','Central Banks','Reported monetary policy rate decision');
  if(macro&&outcome&&!preview)return out('hot','Economic Data','Major economic data reported');
  if(actor&&/\b(?:emergency decision|unscheduled intervention|surprise announcement)\b/.test(t))
    return out('hot','Central Banks','Reported unexpected central bank action');
  if(policy&&trade)return out('warm','US Policy','Trade negotiations or policy commentary');
  if(actor&&(rate||/\b(?:statement|press conference|remarks|speaks?|speech|warning|meeting|minutes|inflation|policy)\b/.test(t)))
    return out('warm','Central Banks','Central bank comments or meeting preview');
  if(/\b(?:cftc|commitments of traders|cot report|net long|net short|futures positioning|open interest|gold etf(?:s)?|gold-backed etf|central bank gold (?:purchases|buying)|world gold council)\b/.test(t)
     && /\b(?:gold|silver|bullion|dollar|currency|currencies|fx|forex|futures|etf|cftc|cot report)\b/.test(t))
    return out('warm','Positioning & Gold Flows','Published market positioning or ETF research, not live price impact');
  if(macro)return out('warm','Economic Data','Economic calendar/report coverage');
  if(intervention)return out('warm','FX Intervention','Currency intervention commentary');
  if(/\b(?:katayama|finance minister|fin min|japan)\b/.test(t)&&/\b(?:yen|jpy|fx market|currency market)\b/.test(t))return out('warm','FX Policy','Official currency-market comments');
  if(war&&/\b(?:war|strik|conflict|sanction|diplomatic|ceasefire|negotiat|peace|missile|attack|security)\w*\b/.test(t))
    return out('warm','Geopolitics','Geopolitical reports or negotiations');
  if(oil&&/\b(?:supply|output|production|oil price|inventory|crude|refin|shipping|opec|exports?|imports?|demand)\w*\b/.test(t))
    return out('warm','Oil & Energy','Energy supply or pricing report');
  if(market&&(moves||/\b(?:fed|ecb|boj|boe|rba|rbnz|inflation|policy|cpi|rate|intervention|bond yields?)\b/.test(t)))
    return out('warm','Forex & Commodities','Market pricing, commentary or preview');
  return out('cold',null,'Routine or unrelated news');
}
function marketFocusTopic(title) {
  const g=gradeHeadline(title);
  return g.level==='cold'?null:g.topic;
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
    const grade=gradeHeadline(title);
    results.push({ title, desc, date: new Date(time).toISOString(), link, url: link, source,
      category: classify(title, feed.category), sourceUrl: feed.url,
      marketFocus:grade.level!=='cold', focusTopic:grade.topic,
      heat:grade.level, heatReason:grade.reason });
  }
  return results;
}
// Cross-feed headline matching. Avoid collapsing related but genuinely different
// updates: only very similar title language with the same leading subject is merged.
const HEADLINE_NOISE = new Set('a an the and or for of in on at to by from with as is are was were has have had be this that its their into over amid after ahead before says said via analysis'.split(' '));
const HEADLINE_DISTINCTIONS = new Set('range prediction forecast south north east west hike hikes cut cuts approval rejection approve rejects rise rises rising fall falls falling higher lower up down above below surge surges slips gain gains lose loses jumps drops climbs tumbles record'.split(' '));
function headlineFingerprint(title, source) {
  let headline=String(title||'').toLowerCase().trim();
  const publisher=String(source||'').toLowerCase().trim();
  // Match the feed's actual publisher attribution, including regional editions,
  // without stripping genuine subtitles from the article itself.
  if(publisher) {
    for(const separator of [' - ',' – ',' — ']) {
      if(headline.endsWith(separator+publisher)) {
        headline=headline.slice(0,-(separator.length+publisher.length)).trim();
        break;
      }
    }
  }
  const raw = headline
    .replace(/^\s*(?:analysis|opinion)\s*[-:]\s*/,'')
    .replace(/\s+[-–—]\s+(?:[\w.-]+\.(?:com|co\.uk|net|org)(?:\s+\w+){0,3}|bloomberg|reuters|fxstreet|marketwatch|yahoo finance|the business times)\s*$/i,'')
    .replace(/\s+(?:by|via)\s+(?:investing\.com|reuters|bloomberg|associated press)\s*$/i,'');
  const key = raw.replace(/[^a-z0-9]+/g,' ').trim();
  const terms = [...new Set(key.split(' ').filter(w=>w.length>2&&!HEADLINE_NOISE.has(w)))];
  return {key,terms,lead:terms.slice(0,2).join('|'),termsSet:new Set(terms)};
}
function isNearDuplicateHeadline(a,b) {
  if(a.key===b.key)return true;
  if(a.lead!==b.lead || a.terms.length<6 || b.terms.length<6)return false;
  for(const term of HEADLINE_DISTINCTIONS) {
    if(a.termsSet.has(term)!==b.termsSet.has(term))return false;
  }
  let shared=0;
  for(const term of a.termsSet)if(b.termsSet.has(term))shared++;
  const union=a.terms.length+b.terms.length-shared;
  return shared>=6 && shared/union>=0.76 &&
    shared/Math.min(a.terms.length,b.terms.length)>=0.86;
}
// Reserve room in the 500-headline digest for what traders came to read.
// No fake headlines, stale-data labels or impact predictions are introduced.
function selectPriorityHeadlines(all,max=MAX_ITEMS,now=Date.now()) {
  if(all.length<=max)return all;
  const selected=new Set();
  const fresh=all.filter(item=>now-Date.parse(item.date)<=72*60*60*1000);
  const take=(items,limit)=>{
    for(const item of items) {
      if(selected.size>=max || limit<=0)break;
      if(selected.has(item))continue;
      selected.add(item);limit--;
    }
  };
  const focused=fresh.filter(x=>x.marketFocus===true);
  // Separate minimum allocations prevent a busy Gold cycle hiding Forex news.
  take(focused.filter(x=>x.category==='Gold'),Math.round(max*.24));
  take(focused.filter(x=>x.category==='Forex'),Math.round(max*.16));
  take(focused.filter(x=>x.category==='Macro'||x.category==='Central Banks'),Math.round(max*.26));
  take(focused.filter(x=>['Geopolitics','US News','Markets'].includes(x.category)),Math.round(max*.18));
  take(focused.filter(x=>x.category==='Crypto'),Math.round(max*.08));
  // Fill unused reserved slots with the freshest remaining trading headlines.
  take(focused,max);
  // Preserve general/all-news discovery when fewer verified trading items exist.
  take(all,max);
  return [...selected].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
// The public World News Hub keeps its established mixed-topic feed.
// AI Studio opts into the specialist Gold/Forex digest via focus=trading.
function selectGeneralHeadlines(all,max=MAX_ITEMS){
  if(all.length<=max)return all;
  const high=all.filter(x=>x.heat==='hot');
  const medium=all.filter(x=>x.heat==='warm');
  const routine=all.filter(x=>x.heat==='cold');
  const selected=new Set(high.slice(0,Math.round(max*.44)));
  for(const item of medium.slice(0,Math.max(0,Math.round(max*.70)-selected.size)))selected.add(item);
  // Keep public World News Hub broad; Gold/Forex specialization is opt-in.
  for(const item of routine.slice(0,Math.round(max*.20)))selected.add(item);
  for(const item of all) {
    if(selected.size>=max)break;
    selected.add(item);
  }
  return [...selected].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function dedupe(items) {
  const seen = new Set(), all = [], prefixIndex=new Map();
  for (const item of items.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))) {
    const fingerprint=headlineFingerprint(item.title,item.source);
    if(!fingerprint.key||seen.has(fingerprint.key))continue;
    const candidates=prefixIndex.get(fingerprint.lead)||[];
    if(candidates.some(prev=>isNearDuplicateHeadline(fingerprint,prev)))continue;
    seen.add(fingerprint.key);
    candidates.push(fingerprint);
    prefixIndex.set(fingerprint.lead,candidates);
    all.push(item);
  }
  return all;
}
async function readFeed(feed, now) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers={ 'Accept': 'application/rss+xml, application/xml, text/xml, */*' };
    // Bloomberg's public RSS can return an empty feed to identifiable crawler UAs.
    // Use the runtime default agent for its public publisher feed; retain the
    // attributed bot UA for the other publishers.
    if(feed.name!=='Bloomberg')
      headers['User-Agent']='Mozilla/5.0 (compatible; PipSePaisaNewsHub/3.0; +https://pipsepaisa.com)';
    const response = await fetch(feed.url, { signal: controller.signal, headers });
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
  const results = await Promise.all(ACTIVE_FEEDS.map(f => readFeed(f, now)));
  const sourceHealth = results.map(r=>r.health);
  const sourcesOk = sourceHealth.filter(s=>s.ok).length;
  const allItems = results.flatMap(r=>r.items);
  const unique=dedupe(allItems);
  const items=selectGeneralHeadlines(unique);
  const tradingItems=selectPriorityHeadlines(unique);
  // Even on upstream failure, back off instead of hammering every provider on every request.
  cache = {at:Date.now(), items:items.length?items:cache.items,
    tradingItems:tradingItems.length?tradingItems:cache.tradingItems,
    sourcesOk, feedHealth:sourceHealth, totalParsed:allItems.length};
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
      return res.status(200).json({ success:true, configured:ACTIVE_FEEDS.length,
        working:cache.feedHealth.filter(s=>s.ok).length,
        withItems:cache.feedHealth.filter(s=>s.count>0).length,
        totalParsed:cache.totalParsed, uniqueHeadlines:cache.items.length,
        updatedAt:cache.at?new Date(cache.at).toISOString():null, feeds:cache.feedHealth });
    }
    const category = typeof req.query?.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.trunc(limitRaw), MAX_ITEMS) : MAX_ITEMS;
    const available=req.query?.focus==='trading' ? cache.tradingItems : cache.items;
    const filtered = category ? available.filter(x => x.category.toLowerCase() === category) : available;
    res.setHeader('X-News-Sources-OK', String(cache.sourcesOk));
    res.setHeader('X-News-Cache', now - cache.at < CACHE_MS ? 'FRESH' : 'STALE');
    // Compact mode is opt-in for mobile Studio; the regular API contract stays unchanged.
    // Avoid shipping duplicate Google News redirect URLs and source feed URLs on every item.
    const selected=filtered.slice(0,limit);
    const compact=req.query?.compact==='1';
    const items=compact ? selected.map(({title,desc,date,link,source,category,heat,marketFocus})=>
      ({title,desc,date,link,source,category,heat,marketFocus})) : selected;
    return res.status(200).json({ success: filtered.length > 0, items,
      total: filtered.length, focusCount: filtered.filter(x=>x.marketFocus).length,
      configured: FEEDS.length, sources: cache.sourcesOk, updatedAt: cache.at ? new Date(cache.at).toISOString() : null,
      ...(filtered.length ? {} : { error: 'News feeds temporarily unavailable' }) });
  } catch (e) {
    return res.status(200).json({ success: cache.items.length > 0, items: cache.items,
      error: String(e && e.message || e) });
  }
};

// Pure RSS helpers for regression tests: no network traffic on import.
module.exports._test={clean,decode,tag,parseFeed,dedupe,headlineFingerprint,isNearDuplicateHeadline,gradeHeadline,classify,selectPriorityHeadlines,selectGeneralHeadlines,activeFeeds:ACTIVE_FEEDS};
