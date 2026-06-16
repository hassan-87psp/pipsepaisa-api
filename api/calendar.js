// Forex Factory economic calendar (this week) for PipSePaisa Economic News
// Returns: [{ date, title, currency, impact, forecast, previous, actual, time }]
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const r = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!r.ok) throw new Error('Calendar source HTTP ' + r.status);
    const raw = await r.json();
    const events = (Array.isArray(raw) ? raw : []).map(e => ({
      date: e.date,
      title: e.title || '',
      currency: e.country || e.currency || '',
      impact: e.impact || '',
      forecast: e.forecast || '',
      previous: e.previous || '',
      actual: e.actual || '',
      time: e.date ? new Date(e.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
    }));
    return res.status(200).json(events);
  } catch (e) {
    return res.status(200).json([]);
  }
};
