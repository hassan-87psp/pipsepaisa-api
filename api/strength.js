// Currency strength meter (8 majors) for PipSePaisa
// LIVE intraday data via Yahoo Finance (5-min prices), recentered vs basket.
// Fallback: frankfurter.app (~4-day change). Returns {strengths:[{currency,strength}], latest_date}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120'); // refresh ~5 min
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CUR = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
  const SYMS = { EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', AUDUSD: 'AUDUSD=X', NZDUSD: 'NZDUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X', USDCAD: 'USDCAD=X' };

  async function yq(sym) {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=5m&range=1d';
    const j = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).json();
    const r = j && j.chart && j.chart.result && j.chart.result[0];
    if (!r) throw new Error('no result ' + sym);
    const c = (r.indicators.quote[0].close || []).filter(x => typeof x === 'number');
    if (c.length < 2) throw new Error('thin ' + sym);
    const t = (r.meta && r.meta.regularMarketTime) ? r.meta.regularMarketTime * 1000 : Date.now();
    return { open: c[0], last: c[c.length - 1], date: new Date(t).toISOString().split('T')[0] };
  }

  // ---- primary: Yahoo intraday ----
  try {
    const keys = Object.keys(SYMS);
    const arr = await Promise.all(keys.map(k => yq(SYMS[k])));
    const q = {}; keys.forEach((k, i) => q[k] = arr[i]);
    const val = (side) => ({
      USD: 1,
      EUR: q.EURUSD[side], GBP: q.GBPUSD[side], AUD: q.AUDUSD[side], NZD: q.NZDUSD[side],
      JPY: 1 / q.USDJPY[side], CHF: 1 / q.USDCHF[side], CAD: 1 / q.USDCAD[side]
    });
    const vo = val('open'), vl = val('last');
    const chg = {}; CUR.forEach(c => { chg[c] = ((vl[c] - vo[c]) / vo[c]) * 100; });
    const mean = CUR.reduce((s, c) => s + chg[c], 0) / CUR.length;
    const strengths = CUR.map(c => ({ currency: c, strength: Math.round((chg[c] - mean) * 100) / 100 }))
      .sort((a, b) => b.strength - a.strength);
    return res.status(200).json({ strengths, latest_date: q.EURUSD.date, source: 'live' });
  } catch (e) {
    // ---- fallback: frankfurter ~4-day change ----
    try {
      const TO = 'USD,GBP,JPY,CHF,AUD,CAD,NZD';
      const others = ['GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
      async function usdVals(dateStr) {
        const u = dateStr ? `https://api.frankfurter.app/${dateStr}?to=${TO}` : `https://api.frankfurter.app/latest?to=${TO}`;
        const j = await (await fetch(u)).json();
        const rt = j.rates || {}; const eurUsd = rt.USD; if (!eurUsd) throw new Error('no rates');
        const v = { EUR: eurUsd, USD: 1 }; others.forEach(c => { if (rt[c]) v[c] = eurUsd / rt[c]; });
        return { date: j.date, v };
      }
      const past = new Date(); past.setDate(past.getDate() - 4);
      const [now, then] = await Promise.all([usdVals(''), usdVals(past.toISOString().split('T')[0])]);
      const strengths = Object.keys(now.v).map(c => {
        const a = then.v[c], b = now.v[c];
        return { currency: c, strength: (a && b) ? Math.round(((b - a) / a) * 10000) / 100 : 0 };
      }).sort((a, b) => b.strength - a.strength);
      return res.status(200).json({ strengths, latest_date: now.date, source: 'daily' });
    } catch (e2) {
      return res.status(200).json({ strengths: [], latest_date: null, error: e.message });
    }
  }
};
