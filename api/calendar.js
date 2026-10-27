// PipSePaisa Economic Calendar — free, attributed data + official BLS release acceleration.
// Stable JSON array for existing website UI. Never manufacture forecasts or results.
// Finance Calendar: free commercial use with visible attribution https://www.financecalendar.com
// BLS: official US CPI, PPI and employment reports, queried only near scheduled releases.
const FC_BASE='https://www.financecalendar.com/wp-json/fc/v1/calendar';
const BLS={
 cpi:'https://www.bls.gov/news.release/cpi.nr0.htm',
 ppi:'https://www.bls.gov/news.release/ppi.nr0.htm',
 jobs:'https://www.bls.gov/news.release/empsit.nr0.htm'
};
const CURRENCY={US:'USD',GB:'GBP',UK:'GBP',EU:'EUR',DE:'EUR',FR:'EUR',IT:'EUR',JP:'JPY',CA:'CAD',AU:'AUD',CN:'CNY',CH:'CHF',NZ:'NZD',NO:'NOK',SE:'SEK',IN:'INR',HK:'HKD'};
const DAY=86400000;
let scheduleCache={at:0,rows:[],error:null};
let schedulePending=null;
let blsCache=new Map();
function nonempty(v,max=80){return v===null||v===undefined?'':String(v).trim().slice(0,max);}
function isoDate(d){return new Date(d).toISOString().slice(0,10);}
function releaseInstant(row){
  const explicit=row.release_at_utc||row.time_utc;
  if(typeof explicit==='string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(explicit)){
    const ms=Date.parse(explicit);if(Number.isFinite(ms))return ms;
  }
  return NaN; // No fabricated midnight for date-only or uncertain releases.
}
function normalize(row){
  if(!row||typeof row!=='object'||row.status==='cancelled')return null;
  const timestamp=releaseInstant(row);
  if(!Number.isFinite(timestamp))return null;
  const title=nonempty(row.title||row.name,180);
  const country=nonempty(row.country||row.country_code,8).toUpperCase();
  const currency=CURRENCY[country]||(/^([A-Z]{3})$/.test(country)?country:'');
  if(!title||!currency)return null;
  const impact=String(row.impact||'').toLowerCase();
  const actual=row.actual==null?'':nonempty(row.actual,50);
  return {date:new Date(timestamp).toISOString(),title,country:currency,
    impact:impact==='high'?'High':impact==='medium'?'Medium':'Low',
    forecast:nonempty(row.consensus??row.forecast,50),previous:nonempty(row.prior??row.previous,50),
    actual,source:'Finance Calendar',sourceUrl:nonempty(row.source_url||row.url,500),
    status:nonempty(row.status,30),actualSource:actual?'Finance Calendar':null};
}
function sortUnique(rows){
 const seen=new Set();return rows.filter(r=>{
  if(!r)return false;const key=r.date+'|'+r.country+'|'+r.title.toLowerCase();
  if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>a.date.localeCompare(b.date));
}
async function timedFetch(url,timeout=9000){
 const c=new AbortController(),tid=setTimeout(()=>c.abort(),timeout);
 try{return await fetch(url,{headers:{Accept:'application/json, text/html;q=0.9',
   'User-Agent':'PipSePaisa-EconomicCalendar/2.0 (+https://pipsepaisa.com)'},signal:c.signal});}
 finally{clearTimeout(tid);}
}
async function getSchedule(){
 const now=Date.now();
 if(scheduleCache.rows.length && now-scheduleCache.at<180000)return scheduleCache;
 if(schedulePending)return schedulePending;
 schedulePending=(async()=>{
  try{
   const from=isoDate(now-DAY),to=isoDate(now+21*DAY);
   const events=[];
   for(let offset=0;offset<1500;offset+=500){
    const params=new URLSearchParams({from,to,limit:'500',offset:String(offset)});
    const response=await timedFetch(FC_BASE+'?'+params,11000);
    if(!response.ok)throw new Error('Finance Calendar HTTP '+response.status);
    const obj=await response.json();
    if(!obj||!Array.isArray(obj.events))throw new Error('Invalid calendar payload');
    events.push(...obj.events);
    if(events.length>=Number(obj.total||0)||obj.events.length<500)break;
   }
   const normalized=sortUnique(events.map(normalize));
   if(!normalized.length)throw new Error('No timestamped events in feed');
   scheduleCache={at:Date.now(),rows:normalized,error:null};
  }catch(e){
   scheduleCache={...scheduleCache,at:Date.now(),error:String(e.message||e).slice(0,140)};
  }
  return scheduleCache;
 })().finally(()=>{schedulePending=null;});
 return schedulePending;
}
function reportKind(title){
 if(/\b(?:core\s+)?cpi\b|consumer price index/i.test(title))return 'cpi';
 if(/\b(?:core\s+)?ppi\b|producer price index/i.test(title))return 'ppi';
 if(/\b(?:nfp|non.?farm|unemployment rate|employment situation|employment change)\b/i.test(title))return 'jobs';
 return '';
}
function etDate(ms){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
   year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
 const pick=t=>parts.find(p=>p.type===t)?.value||'';
 return pick('year')+'-'+pick('month')+'-'+pick('day');
}
function reportDate(txt){
 const start=txt.toLowerCase().indexOf('embargoed until');
 if(start<0)return '';
 const snip=txt.slice(start,start+650);
 const m=snip.match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b/i);
 const ms=m?Date.parse(m[0]):NaN;
 return Number.isFinite(ms)?new Date(ms).toISOString().slice(0,10):'';
}
function signed(verb,number){
 if(/unchanged|flat|no change/i.test(verb))return '0.0%';
 const neg=/decreas|declin|fell|fall|dropp|down|lower|slipp/i.test(verb);
 return (neg?'-':'')+Number(number).toFixed(1)+'%';
}
function percent(text,pattern){
 const m=text.match(pattern);
 if(!m)return '';
 return signed(m[1],m[2]||'0');
}
function officialActual(title,kind,body){
 const t=title.toLowerCase();
 // Generic publisher titles often omit the metric's m/m versus y/y dimension.
 // Return both explicitly labelled rather than assigning the wrong Actual.
 if((kind==='cpi'||kind==='ppi')&&!/m\/m|y\/y|month.over.month|year.over.year|12.month|annual/.test(t)&&!/(?:core|ex.?food)/.test(t)){
  const mom=officialActual(title+' m/m',kind,body);
  const yoy=officialActual(title+' y/y',kind,body);
  return [mom&&'m/m '+mom,yoy&&'y/y '+yoy].filter(Boolean).join(' · ');
 }
 if(kind==='cpi'){
  if(/\bcore\b/.test(t)){
   if(/y\/y|year.over.year|annual|12.month/.test(t))
    return percent(body,/all items less food and energy index (rose|increased|decreased|fell)\s+(\d+(?:\.\d+)?)\s+percent over the year/i);
   return percent(body,/index for all items less food and energy (rose|increased|decreased|fell|was unchanged)\s*(?:by\s+)?(\d+(?:\.\d+)?)?\s*percent?/i);
  }
  if(/y\/y|year.over.year|annual|12.month/.test(t))
   return percent(body,/all items index (rose|increased|decreased|fell)\s+(\d+(?:\.\d+)?)\s+percent (?:before seasonal adjustment|for the 12 months|over the year)/i);
  return percent(body,/Consumer Price Index for All Urban Consumers\s*\(CPI-U\)\s*(rose|increased|decreased|fell|was unchanged)\s*(?:by\s+)?(\d+(?:\.\d+)?)?\s*percent/i);
 }
 if(kind==='ppi'){
  if(/\bcore\b/.test(t))return ''; // Core PPI has several definitions; fail closed.
  if(/y\/y|year.over.year|annual|12.month/.test(t))
   return percent(body,/index for final demand (rose|increased|decreased|fell|climbed)\s+(\d+(?:\.\d+)?)\s+percent for the 12 months/i);
  return percent(body,/Producer Price Index for final demand (rose|increased|decreased|fell|moved up|moved down|was unchanged)\s*(?:by\s+)?(\d+(?:\.\d+)?)?\s*percent/i);
 }
 if(kind==='jobs'){
  if(/unemployment rate/i.test(t)){
   const m=body.match(/unemployment rate\s*(?:was\s+unchanged\s+)?(?:was\s+|at\s+)?(\d+(?:\.\d+)?)\s+percent/i)
    ||body.match(/unemployment rate\s*\((\d+(?:\.\d+)?)\s+percent\)/i);
   return m?Number(m[1]).toFixed(1)+'%':'';
  }
  if(/non.?farm|nfp|employment change/i.test(t)){
   const m=body.match(/Total nonfarm payroll employment (?:rose|increased|fell|decreased)\s+by\s+(-?\d[\d,]*)\b/i)
    ||body.match(/nonfarm payroll employment\s*\(([+-]?\d[\d,]*)\)/i);
   return m?String(Math.round(Number(m[1].replace(/,/g,''))/1000))+'K':'';
  }
 }
 return '';
}
async function getBls(kind,rapid=false){
 const cached=blsCache.get(kind),now=Date.now();
 if(cached&&now-cached.at<(rapid?15000:300000))return cached;
 try{
  const response=await timedFetch(BLS[kind]+'?psp_check='+Math.floor(now/15000),6500);
  if(!response.ok)throw new Error('BLS HTTP '+response.status);
  let txt=await response.text();
  if(txt.length>1000000)throw new Error('Oversize BLS response');
  txt=txt.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/\s+/g,' ');
  const value={at:Date.now(),date:reportDate(txt),text:txt.slice(0,45000)};
  blsCache.set(kind,value);return value;
 }catch(_){
  const fallback=cached||{at:now,date:'',text:''};
  blsCache.set(kind,{...fallback,at:now});return fallback;
 }
}
async function officialOverlay(events,now){
 const relevant=events.filter(e=>{
  const k=reportKind(e.title),t=Date.parse(e.date);
  return e.country==='USD'&&k&&t>=now-24*3600000&&t<=now+10*60000;
 });
 if(!relevant.length)return false;
 const types=[...new Set(relevant.map(e=>reportKind(e.title)))];
 const rapid=events.some(e=>e.country==='USD'&&types.includes(reportKind(e.title))&&
   Math.abs(Date.parse(e.date)-now)<90*60000);
 const lookups=await Promise.all(types.map(t=>getBls(t,rapid)));
 const byType=Object.fromEntries(types.map((t,i)=>[t,lookups[i]]));
 let enhanced=false;
 for(const e of relevant){
  if(e.actual)continue;
  const info=byType[reportKind(e.title)];
  if(!info||!info.date||info.date!==etDate(Date.parse(e.date)))continue;
  const actual=officialActual(e.title,reportKind(e.title),info.text);
  if(!actual)continue;
  e.actual=actual;e.actualSource='US Bureau of Labor Statistics';
  e.sourceUrl=BLS[reportKind(e.title)];enhanced=true;
 }
 return enhanced;
}
module.exports=async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const now=Date.now();
 const cache=await getSchedule();
 const releaseWindow=cache.rows.some(e=>e.country==='USD'&&reportKind(e.title)
   &&Math.abs(Date.parse(e.date)-now)<90*60000);
 res.setHeader('Cache-Control',releaseWindow
    ?'public, s-maxage=10, stale-while-revalidate=10'
    :'public, s-maxage=90, stale-while-revalidate=60');
 res.setHeader('X-Calendar-Source','Finance-Calendar-and-Official-BLS');
 if(!cache.rows.length)
   return res.status(503).json({error:'Verified calendar source temporarily unavailable',events:[],source:'Finance Calendar'});
 const events=cache.rows.filter(e=>Date.parse(e.date)>=now-DAY&&Date.parse(e.date)<=now+21*DAY).map(e=>({...e}));
 await officialOverlay(events,now);
 // Existing site expects an array; these are verified provider rows, not demo data.
 return res.status(200).json(events);
};
// Export only pure helpers for local deterministic testing; no network requests during import.
module.exports._test={normalize,releaseInstant,reportKind,reportDate,officialActual,sortUnique};
