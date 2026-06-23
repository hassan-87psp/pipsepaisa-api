// api/candles.js
// PipSePaisa — OHLC candle proxy via Yahoo Finance v8 (free, no API key).
// Query: /api/candles?symbol=OANDA:XAUUSD&interval=60
// Returns: { symbol, interval, candles: [{t,o,h,l,c}, ...] }

const CACHE = {}; // key -> { data, time }
const TTL = 60 * 1000; // 60s

// map website symbol keys -> Yahoo tickers
const SYM = {
  'OANDA:XAUUSD': 'GC=F',        // gold futures
  'BITSTAMP:BTCUSD': 'BTC-USD',
  'BITSTAMP:ETHUSD': 'ETH-USD',
  'FX:EURUSD': 'EURUSD=X',
  'FX:GBPUSD': 'GBPUSD=X',
  'FX:USDJPY': 'USDJPY=X',
  'FX:AUDUSD': 'AUDUSD=X',
  'FX:USDCAD': 'USDCAD=X',
  'FX:USDCHF': 'USDCHF=X',
  'FX:NZDUSD': 'NZDUSD=X'
};

// website tf -> Yahoo {interval, range}
const TF = {
  '15': { interval: '15m', range: '5d' },
  '60': { interval: '60m', range: '1mo' },
  '240': { interval: '60m', range: '3mo' },
  'D': { interval: '1d', range: '1y' },
  'W': { interval: '1wk', range: '5y' }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const symbolKey = req.query.symbol || 'OANDA:XAUUSD';
    const tfKey = req.query.interval || '60';
    const ticker = SYM[symbolKey] || 'GC=F';
    const tf = TF[tfKey] || TF['60'];

    const cacheKey = ticker + '|' + tf.interval + '|' + tf.range;
    const now = Date.now();
    if (CACHE[cacheKey] && (now - CACHE[cacheKey].time) < TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(CACHE[cacheKey].data);
    }

    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(ticker) + '?interval=' + tf.interval + '&range=' + tf.range;

    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
    });
    if (!r.ok) return res.status(502).json({ error: 'Yahoo fetch failed: ' + r.status });
    const j = await r.json();
    const result = j && j.chart && j.chart.result && j.chart.result[0];
    if (!result) return res.status(502).json({ error: 'No candle data' });

    const ts = result.timestamp || [];
    const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open ? q.open[i] : null, h = q.high ? q.high[i] : null,
            l = q.low ? q.low[i] : null, c = q.close ? q.close[i] : null;
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ t: ts[i], o: +o.toFixed(5), h: +h.toFixed(5), l: +l.toFixed(5), c: +c.toFixed(5) });
    }
    // keep last 160 candles
    const trimmed = candles.slice(-160);
    const out = { symbol: symbolKey, interval: tfKey, candles: trimmed };

    CACHE[cacheKey] = { data: out, time: now };
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message || err) });
  }
}
