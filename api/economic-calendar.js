// PipSePaisa Economic Calendar. Source: Forex Factory public weekly export.
// Cache responsibly: the publisher recommends no more than hourly access.
// These are SCHEDULED events, not published news articles or actual release results.
const UPSTREAM = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const SOURCE_PAGE = 'https://www.forexfactory.com/calendar';
const CACHE_MS = 70 * 60 * 1000;
const MAX_EVENTS = 200;
let cache = { at:0, events:[], error:null };
let refreshing = null;

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title || '').trim().slice(0,180);
  const country = String(raw.country || '').toUpperCase().replace(/[^A-Z]/g,'').slice(0,5);
  const impactRaw = String(raw.impact || '').toLowerCase();
  const impact = impactRaw === 'high' ? 'High' : impactRaw === 'medium' ? 'Medium' :
    impactRaw === 'low' ? 'Low' : impactRaw === 'holiday' ? 'Holiday' : 'Other';
  const dateMs = Date.parse(raw.date);
  if (title.length < 3 || !Number.isFinite(dateMs) || !country ||
      dateMs > Date.now() + 45 * 86400000 || dateMs < Date.now() - 10 * 86400000) return null;
  const forecast = String(raw.forecast ?? '').trim().slice(0,50);
  const previous = String(raw.previous ?? '').trim().slice(0,50);
  const speech = /\b(?:speak|speaks|speech|remarks|address|press conference|press briefing|testimon|statement)\b/i.test(title);
  const eventType = /press conference|press briefing/i.test(title) ? 'Press Conference' :
    /\b(?:fomc|interest rate|policy rate|federal funds rate|monetary policy)\b/i.test(title) ? 'Central Bank' :
    speech ? 'Speech / Remarks' : 'Economic Release';
  return { title, country, currency:country, impact, date:new Date(dateMs).toISOString(),
    forecast, previous, eventType, isSpeech:speech, source:'Forex Factory',
    sourceUrl:SOURCE_PAGE, isScheduledEvent:true };
}
function prune(rows) {
  const seen = new Set();
  return rows.map(normalize).filter(v=>{
    if(!v) return false;
    const key=v.date+'|'+v.country+'|'+v.title.toLowerCase();
    if(seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,MAX_EVENTS);
}
async function refresh() {
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(),8500);
  try {
    const r = await fetch(UPSTREAM,{signal:ctrl.signal,headers:{
      'Accept':'application/json', 'User-Agent':'PipSePaisa-Calendar/1.0 (+https://pipsepaisa.com)'
    }});
    if(!r.ok) throw new Error('Calendar source HTTP '+r.status);
    const raw = await r.text();
    if(raw.length > 1200000 || !raw.trim().startsWith('[')) throw new Error('Calendar export is not valid JSON');
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) throw new Error('Calendar is not an array');
    const parsed=prune(data);
    if(parsed.length === 0) throw new Error('No valid scheduled events received');
    cache={at:Date.now(),events:parsed,error:null};
  } catch(e) {
    // Keep historical last-good timestamps. Never fabricate future events.
    cache={...cache,at:Date.now(),error:String(e?.message||e).slice(0,100)};
  } finally { clearTimeout(timer); }
}
module.exports = async function handler(req,res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=1800');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method && req.method !== 'GET')return res.status(405).json({success:false,events:[],error:'Method not allowed'});
  if(!cache.at || Date.now()-cache.at>CACHE_MS) {
    if(!refreshing) refreshing=refresh().finally(()=>{refreshing=null});
    await refreshing;
  }
  const now = Date.now();
  // Show recently released events (last 12 hours) and future events within the weekly export.
  const available=cache.events.filter(e=>{
    const time=Date.parse(e.date);
    return time>=now-12*3600000 && time<=now+7*86400000;
  });
  const impactful = available.filter(e=>e.impact==='High' || e.impact==='Medium');
  return res.status(200).json({
    success:cache.events.length>0, events:available,
    important:impactful.length, total:available.length,
    fetchedAt:cache.at?new Date(cache.at).toISOString():null,
    provider:'Forex Factory weekly export', sourceUrl:SOURCE_PAGE,
    timezone:'UTC in ISO; display converts to viewer local timezone',
    actualsProvided:false, error:cache.error,
    note:'Calendar times are approximate and may change. No released actual figures are provided by this feed. Scheduled events are not news outcomes.'
  });
};
