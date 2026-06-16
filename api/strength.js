// Currency strength meter for PipSePaisa (8 majors), based on ~3-day % change vs USD
// Returns: { strengths: [{ currency, strength }], latest_date }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TO = 'USD,GBP,JPY,CHF,AUD,CAD,NZD'; // base is EUR (frankfurter default)
  const others = ['GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

  async function usdValues(dateStr) {
    const url = dateStr
      ? `https://api.frankfurter.app/${dateStr}?to=${TO}`
      : `https://api.frankfurter.app/latest?to=${TO}`;
    const j = await (await fetch(url)).json();
    const rt = j.rates || {};
    const eurUsd = rt.USD;
    if (!eurUsd) throw new Error('No rates');
    const val = { EUR: eurUsd, USD: 1 };          // value of 1 unit in USD
    others.forEach(c => { if (rt[c]) val[c] = eurUsd / rt[c]; });
    return { date: j.date, val };
  }

  try {
    const past = new Date();
    past.setDate(past.getDate() - 4); // ~4 days back (covers weekend)
    const pastStr = past.toISOString().split('T')[0];

    const [now, then] = await Promise.all([usdValues(''), usdValues(pastStr)]);

    const strengths = Object.keys(now.val).map(cur => {
      const a = then.val[cur], b = now.val[cur];
      const pct = (a && b) ? ((b - a) / a) * 100 : 0;
      return { currency: cur, strength: Math.round(pct * 1000) / 1000 };
    }).sort((a, b) => b.strength - a.strength);

    return res.status(200).json({ strengths, latest_date: now.date });
  } catch (e) {
    return res.status(200).json({ strengths: [], latest_date: null, error: e.message });
  }
};
