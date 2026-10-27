// PipSePaisa News Hub: observed market prices, NOT predicted news impact.
// Prices and previous close come from Yahoo Finance chart metadata.
// Missing / unavailable prices are omitted, never filled with estimates.

const INSTRUMENTS = [
  { label: 'EUR/USD', symbol: 'EURUSD=X', decimals: 5 },
  { label: 'USD/JPY', symbol: 'USDJPY=X', decimals: 3 },
  { label: 'USD Index', symbol: 'DX-Y.NYB', decimals: 2 },
  { label: 'Gold Futures', symbol: 'GC=F', decimals: 2 },
  { label: 'WTI Futures', symbol: 'CL=F', decimals: 2 }
];
const TTL_MS = 90 * 1000;
let cache = { at: 0, prices: [] };
let loading = null;

async function fetchInstrument(item) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5500);
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(item.symbol) + '?interval=5m&range=1d';
    const r = await fetch(url, { signal: ctrl.signal, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PipSePaisa/1.0)',
      Accept: 'application/json'
    } });
    if (!r.ok) return null;
    const response = await r.json();
    const chart = response && response.chart && response.chart.result && response.chart.result[0];
    if (!chart || !chart.meta) return null;
    const meta = chart.meta;
    const close = chart.indicators && chart.indicators.quote && chart.indicators.quote[0] &&
      chart.indicators.quote[0].close;
    const timestamps = chart.timestamp || [];
    let last = null, atSeconds = null;
    if (Array.isArray(close)) {
      for (let i = close.length - 1; i >= 0; i--) {
        if (Number.isFinite(close[i]) && close[i] > 0 && Number.isFinite(timestamps[i])) {
          last = close[i]; atSeconds = timestamps[i]; break;
        }
      }
    }
    if (last === null && Number.isFinite(meta.regularMarketPrice) && meta.regularMarketPrice > 0) {
      last = meta.regularMarketPrice;
      atSeconds = meta.regularMarketTime;
    }
    const previousClose = Number.isFinite(meta.chartPreviousClose) && meta.chartPreviousClose > 0
      ? meta.chartPreviousClose : meta.previousClose;
    if (!Number.isFinite(last) || last <= 0 ||
        !Number.isFinite(previousClose) || previousClose <= 0 ||
        !Number.isFinite(atSeconds)) return null;
    const asOf = new Date(atSeconds * 1000);
    if (!Number.isFinite(asOf.getTime()) || asOf.getTime() > Date.now() + 600000) return null;
    const move = (last - previousClose) / previousClose * 100;
    const round = (x, n) => Number(x.toFixed(n));
    return {
      label: item.label, symbol: item.symbol, price: round(last, item.decimals),
      previousClose: round(previousClose, item.decimals),
      change: round(last - previousClose, item.decimals),
      changePercent: round(move, 3), asOf: asOf.toISOString(),
      source: 'Yahoo Finance',
      sourceUrl: 'https://finance.yahoo.com/quote/' + encodeURIComponent(item.symbol) + '/'
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function refresh() {
  const results = await Promise.all(INSTRUMENTS.map(fetchInstrument));
  const prices = results.filter(Boolean);
  // Never keep an old price silently: every price carries its own original timestamp.
  cache = { at: Date.now(), prices };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=180');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, prices: [], error: 'Method not allowed' });
  try {
    if (!cache.at || Date.now() - cache.at > TTL_MS) {
      if (!loading) loading = refresh().finally(() => { loading = null; });
      await loading;
    }
    return res.status(200).json({
      success: cache.prices.length > 0, prices: cache.prices,
      updatedAt: cache.at ? new Date(cache.at).toISOString() : null,
      changeBasis: 'versus Yahoo Finance previous close',
      disclaimer: 'Observed prices, not a prediction or a verified impact caused by a specific news story.'
    });
  } catch (_) {
    return res.status(200).json({
      success: false, prices: [], error: 'Verified market data temporarily unavailable.'
    });
  }
};
