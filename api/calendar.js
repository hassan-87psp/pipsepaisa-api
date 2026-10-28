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
let blsDeniedUntil=new Map();
function nonempty(v,max=80){return v===null||v===undefined?'':String(v).trim().slice(0,max);}
function isoDate(d){return new Date(d).toISOString().slice(0,10);}
function releaseInstant(row){
  const explicit=row.release_at_utc||row.time_utc;
  if(typeof explicit==='string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(explicit)){
    const ms=Date.parse(explicit);if(Number.isFinite(ms))return ms;
  }
  return NaN; // No fabricated midnight for date-only or uncertain releases.
}
// Show the provider's units as reported; never confuse m/m with y/y.
function formatRecordedValue(value,unit){
 const raw=nonempty(value,80);
 if(!raw)return '';
 const u=nonempty(unit,25).toLowerCase();
 if(u==='jobs' && /^[-+]?\d+(?:\.\d+)?$/.test(raw)){
  const n=Number(raw)/1000;
  return Number.isInteger(n)?n+'K':(Math.round(n*10)/10)+'K';
 }
 if(u.startsWith('%') && /^[-+]?\d+(?:\.\d+)?$/.test(raw))return raw+'%';
 return raw;
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
  const unit=nonempty(row.unit,30);
  const actual=formatRecordedValue(row.actual,unit);
  return {date:new Date(timestamp).toISOString(),title,country:currency,
    impact:impact==='high'?'High':impact==='medium'?'Medium':'Low',
    forecast:formatRecordedValue(row.consensus??row.forecast,unit),
    previous:formatRecordedValue(row.prior??row.previous,unit),
    actual,unit,source:'Finance Calendar',sourceUrl:nonempty(row.source_url||row.url,500),
    status:nonempty(row.status,30),actualSource:actual?'Finance Calendar':null,
    seriesCode:nonempty(row.series_code,90),eventId:nonempty(row.id,140),
    releaseStage:nonempty(row.release_stage,40),period:nonempty(row.period,60),
    timeRole:nonempty(row.time_role,40),lastVerifiedAt:nonempty(row.last_verified_at,60)};
}
// Recurring automatic labels + confirmed accompanying metrics. No fixed dates.
// Rules are conditional on known source series and confirmed release timestamp.
function utcDay(iso){return iso.slice(0,10).replace(/-/g,'');}
function isRate(e){return e.country==='USD'&&(e.seriesCode==='fomc'||
 /^FOMC Rate Decision\b|^Federal Funds Rate\b/i.test(e.title))&&
 !/\b(minutes|conference|speech|statement)\b/i.test(e.title);}
function clearUnverifiedMetricValues(e){
 // A broad report package is not an individual m/m, y/y or core series.
 // Keep the release/time but wait for a source that names the precise metric.
 e.forecast=''; e.previous=''; e.actual=''; e.actualSource=null;
 delete e.forecastSource; delete e.previousSource;
}
function nameEvent(row){
 const e={...row};
 if(isRate(e)){e.sourceTitle=e.title;e.title='Federal Funds Rate';}
 else if(e.country==='USD'&&(e.seriesCode==='us-pce'||/US Personal Income and Outlays \(PCE\)/i.test(e.title))){
   e.sourceTitle=e.title;e.title='Core PCE Price Index m/m';
   // Monthly BEA package figures must never masquerade as core PCE actuals.
   if(!/^Core PCE Price Index m\/m$/i.test(row.title))clearUnverifiedMetricValues(e);
   e.metricLabel='Core PCE excluding food and energy, monthly';
 }
 else if(e.country==='USD'&&(e.seriesCode==='us-nfp'||/US Employment Situation \(Non-Farm Payrolls\)/i.test(e.title))){
   e.sourceTitle=e.title;e.title='Non-Farm Employment Change';
   if(!/^Non-Farm Employment Change$/i.test(row.title)&&
     !/^(jobs|thousand jobs)$/i.test(row.unit||''))clearUnverifiedMetricValues(e);
 }
 else if(e.country==='USD'&&(e.seriesCode==='us-cpi'||/US CPI Report/i.test(e.title))){
   e.sourceTitle=e.title;
   // CPI y/y reported in a calendar row is NOT the CPI m/m figure.
   const annual=/(?:%\s*y\/y|year.over.year|annual)/i.test(e.unit||'');
   e.title=annual?'CPI y/y':'CPI m/m';
   if(!annual&&!/^CPI m\/m$/i.test(row.title))clearUnverifiedMetricValues(e);
 }
 else if(e.country==='USD'&&(e.seriesCode==='us-gdp'||/US Gross Domestic Product/i.test(e.title))){
   e.sourceTitle=e.title;
   const stage=String(e.releaseStage||'').toLowerCase();
   // Never call GDP 'Advance' unless stage is explicitly provided.
   e.title=stage==='advance'?'Advance GDP q/q':stage==='second'?'Prelim GDP q/q':
    stage==='third'?'Final GDP q/q':'GDP q/q';
   if(!/\bGDP q\/q$/i.test(row.title))clearUnverifiedMetricValues(e);
 }
 return e;
}
function appendMetric(rows,parent,title,id,date=parent.date){
 if(rows.some(e=>e.country===parent.country&&e.date===date&&e.title.toLowerCase()===title.toLowerCase()))
  return;
 rows.push({date,title,eventId:id,country:parent.country,impact:'High',
  forecast:'',previous:'',actual:'',source:parent.source,sourceUrl:parent.sourceUrl,
  status:'confirmed',actualSource:null,derivedMetric:true});
}
function addRecurringCompanions(rows){
 const merged=rows.map(nameEvent);
 for(const e of merged.slice()){
  if(e.status!=='confirmed'&&e.status!=='released')continue;
  const day=utcDay(e.date);
  if(isRate(e)){
   const et=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(e.date));
   if(et==='14:00'&&(e.seriesCode==='fomc'||/^https:\/\/www\.federalreserve\.gov\//.test(e.sourceUrl||''))){
    appendMetric(merged,e,'FOMC Statement','us-fomc-statement-'+day);
    appendMetric(merged,e,'FOMC Press Conference','us-fomc-presser-'+day,
      new Date(Date.parse(e.date)+30*60000).toISOString());
   }
  }
  if(e.country==='USD'&&e.seriesCode==='us-nfp'&&
    /^https:\/\/www\.bls\.gov\//.test(e.sourceUrl||'')){
   appendMetric(merged,e,'Unemployment Rate','us-unemployment-'+day);
  }
  if(e.country==='USD'&&e.seriesCode==='us-cpi'&&
    /^https:\/\/www\.bls\.gov\//.test(e.sourceUrl||'')){
   appendMetric(merged,e,'CPI m/m','us-cpi-mm-'+day);
   appendMetric(merged,e,'Core CPI m/m','us-core-cpi-mm-'+day);
   appendMetric(merged,e,'CPI y/y','us-cpi-yy-'+day);
  }
 }
 return sortUnique(merged);
}
function addVerifiedFedEvents(rows){return addRecurringCompanions(rows);}
// Trading-calendar names identify SPECIFIC metrics, not the broad release package.
// Match the official Oct 2026 Fed/BEA times; never infer a Core PCE reading
// from an unqualified headline PCE result.
// These mappings only distinguish specific metrics in official release packages.
// Forecasts and previous values must come from a published source, never this table.
const TRADING_OCT_2026=[
 {time:"2026-10-28T18:00:00.000Z",test:/\b(?:fomc|fed)\b.*rate decision|federal funds rate/i,
  name:"Federal Funds Rate",id:"us-fed-rate-20261028"},
 {time:"2026-10-29T12:30:00.000Z",test:/\bus gross domestic product october 2026\b|^advance gdp q\/q$/i,
  name:"Advance GDP q/q",id:"us-gdp-advance-2026q3"},
 {time:"2026-10-29T12:30:00.000Z",test:/\bus personal income and outlays \(pce\) october 2026\b|^core pce price index m\/m$/i,
  name:"Core PCE Price Index m/m",id:"us-core-pce-mm-2026sep",
  beaMetric:true}
];
function alignTradingCalendarNames(event){
 if(event.country!=="USD")return event;
 const match=TRADING_OCT_2026.find(x=>x.time===event.date&&x.test.test(event.sourceTitle||event.title));
 if(!match)return event;
 const result={...event,title:match.name,eventId:match.id,
  sourceTitle:event.sourceTitle||event.title,
  // Explicitly record what is mapped: a BEA package contains many series.
  metricLabel:match.beaMetric?"Core PCE ex-food-and-energy m/m":match.name};
 if(match.beaMetric){
  // A package-level PCE actual cannot be displayed as Core PCE.
  // Generic release-package consensus and results cannot be assigned to core PCE.
  if(!/^core pce price index m\/m$/i.test(event.sourceTitle||event.title))clearUnverifiedMetricValues(result);
  result.sourceUrl="https://www.bea.gov/data/personal-consumption-expenditures-price-index-excluding-food-and-energy";
 }else if(match.name==="Advance GDP q/q"){
  result.sourceUrl="https://www.bea.gov/news/schedule/full";
 }
 return result;
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
   const from=isoDate(now-30*DAY),to=isoDate(now+21*DAY);
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
 // BLS restricts automated fetching; respect 403/429 instead of retrying
 // every 15 seconds. Calendar provider remains the verified fallback.
 if((blsDeniedUntil.get(kind)||0)>now)return cached||{at:now,date:'',text:''};
 if(cached&&now-cached.at<(rapid?15000:300000))return cached;
 try{
  const response=await timedFetch(BLS[kind]+'?psp_check='+Math.floor(now/15000),6500);
  if(response.status===403||response.status===429)
    blsDeniedUntil.set(kind,now+3600000);
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
  // BLS publishes a dated report, which may be the last release in our 30-day
  // archive. The exact release date is checked below before assigning Actual.
  // Enrich only genuinely missing values, never overwrite provider figures.
  return e.country==='USD'&&k&&!e.actual&&t>=now-30*DAY&&t<=now+10*60000;
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

const FF_EXPORT='https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const FF_CREDIT='https://www.forexfactory.com/calendar';
const FF_CACHE_MS=60*60*1000; // Forex Factory's weekly export is updated hourly and rate-limited.
let ffWeeklyCache={at:0,rows:[]},ffWeeklyPending=null;
function normalizeFF(x){
 if(!x||typeof x!=='object')return null;
 const ts=Date.parse(x.date||''),country=nonempty(x.country,3).toUpperCase(),title=nonempty(x.title,180);
 if(!Number.isFinite(ts)||!title||!/^[A-Z]{3}$/.test(country))return null;
 const impact=String(x.impact||'').toLowerCase();
 // Use only Forex Factory's published Actual field after the release timestamp.
 // Never infer a result from forecast/previous or show future placeholders as Actual.
 const rawActual=nonempty(x.actual);
 const actual=ts<=Date.now() && rawActual && !/^(?:-|--|—|n\/a|pending|tbd)$/i.test(rawActual)?rawActual:'';
 return {date:new Date(ts).toISOString(),country,title,impact:impact==='high'?'High':impact==='medium'?'Medium':impact==='holiday'?'Holiday':'Low',
  forecast:nonempty(x.forecast),previous:nonempty(x.previous),actual,
  source:'Forex Factory',sourceUrl:FF_CREDIT,forecastSource:FF_CREDIT,previousSource:FF_CREDIT,
  actualSource:actual?FF_CREDIT:null,
  status:actual?'released':'confirmed',eventId:'ff-'+country+'-'+ts+'-'+title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,50)};
}
async function getFFWeekly(){
 if(ffWeeklyCache.at&&Date.now()-ffWeeklyCache.at<FF_CACHE_MS)return ffWeeklyCache.rows;
 if(ffWeeklyPending)return ffWeeklyPending;
 ffWeeklyPending=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4800);
  try{
   const response=await fetch(FF_EXPORT,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('FF export HTTP '+response.status);
   const raw=await response.json();
   if(!Array.isArray(raw))throw Error('Invalid FF JSON');
   const rows=raw.slice(0,220).map(normalizeFF).filter(Boolean);
   if(!rows.length)throw Error('Empty FF export');
   ffWeeklyCache={at:Date.now(),rows};
  }catch(_){
   // Do not repeatedly hammer Forex Factory (2 export requests / 5 minutes).
   ffWeeklyCache={at:Date.now(),rows:ffWeeklyCache.rows};
  }finally{clearTimeout(timer);}
  return ffWeeklyCache.rows;
 })().finally(()=>{ffWeeklyPending=null});
 return ffWeeklyPending;
}
function sameFF(a,b){
 if(a.country!==b.country||Math.abs(Date.parse(a.date)-Date.parse(b.date))>4*60000)return false;
 const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const aa=norm(a.title),bb=norm(b.title),orig=norm(a.sourceTitle);
 if(aa===bb||orig===bb)return true;
 const synonyms=[['federalfundsrate','fomcratedecision'],['unemploymentclaims','initialjoblessclaims'],
 ['officialcashrate','rbnzratedecision'],['overnightrate','bocratedecision'],
 ['mainrefinancingrate','ecbratedecision'],['nonfarmemploymentchange','nonfarmpayrolls']];
 return synonyms.some(([x,y])=>((aa===x||orig===x)&&bb===y)||((aa===y||orig===y)&&bb===x));
}
// Forex Factory publishes the precise central-bank rate event. Some generic
// provider schedule rows are outdated (e.g., ECB Oct 29 at 12:45 UTC, while
// the ECB's official decision and FF Main Refinancing Rate are at 13:15 UTC).
// Suppress ONLY an empty, broad duplicate when FF carries the exact rate
// release for the same country/day and within a one-hour schedule discrepancy.
// Never suppress a generic row containing its own verified data.
const GENERIC_RATE_EQUIVALENTS=[
 {country:'EUR',generic:/^ECB Rate Decision\b/i,precise:/^Main Refinancing Rate$/i},
 {country:'CAD',generic:/^Bank of Canada Rate Decision\b/i,precise:/^Overnight Rate$/i},
 {country:'AUD',generic:/^RBA Rate Decision\b/i,precise:/^Cash Rate$/i},
 {country:'NZD',generic:/^RBNZ Rate Decision\b/i,precise:/^Official Cash Rate$/i}
];
function redundantGenericRate(generic,precise){
 if(!generic||!precise||generic.country!==precise.country||
    generic.actual||generic.forecast||generic.previous)return false;
 const a=Date.parse(generic.date),b=Date.parse(precise.date);
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>60*60000||
    generic.date.slice(0,10)!==precise.date.slice(0,10))return false;
 return GENERIC_RATE_EQUIVALENTS.some(x=>x.country===generic.country&&
   x.generic.test(generic.title)&&x.precise.test(precise.title));
}
function applyFFWeekly(events,weekly){
 const out=events.map(e=>({...e}));
 for(const row of weekly){
  // Remove the unvalued generic placeholder only after its precise release
  // has been supplied by Forex Factory. Otherwise preserve the fallback row.
  for(let i=out.length-1;i>=0;i--)
   if(redundantGenericRate(out[i],row))out.splice(i,1);
  const match=out.find(x=>sameFF(x,row));
  if(!match){out.push(row);continue;}
  // Forex Factory is authoritative for its published Forecast/Previous on the
  // SAME date, country and precise event title (or an explicit safe alias).
  // The generic schedule feed can hold an older consensus; do not preserve it.
  // Blank FF values must never erase another verified source's field.
  if(row.forecast&&match.forecast!==row.forecast){
   match.forecast=row.forecast;match.forecastSource=FF_CREDIT;
  }else if(row.forecast&&!match.forecastSource){
   match.forecastSource=FF_CREDIT;
  }
  if(row.previous&&match.previous!==row.previous){
   match.previous=row.previous;match.previousSource=FF_CREDIT;
  }else if(row.previous&&!match.previousSource){
   match.previousSource=FF_CREDIT;
  }
  if(!match.actual&&row.actual){match.actual=row.actual;match.actualSource=FF_CREDIT;}
 }
 return sortUnique(out);
}

module.exports=async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const now=Date.now();
 const [cache,ffRows]=await Promise.all([getSchedule(),getFFWeekly()]);
 const releaseWindow=cache.rows.some(e=>e.country==='USD'&&reportKind(e.title)
   &&Math.abs(Date.parse(e.date)-now)<90*60000);
 res.setHeader('Cache-Control',releaseWindow
    ?'public, s-maxage=10, stale-while-revalidate=10'
    :'public, s-maxage=90, stale-while-revalidate=60');
 res.setHeader('X-Calendar-Source',ffRows.length?'Finance-Calendar-ForexFactory-and-Official-BLS':'Finance-Calendar-and-Official-BLS');
 if(!cache.rows.length&&!ffRows.length)
   return res.status(503).json({error:'Verified calendar sources temporarily unavailable',events:[],source:'Finance Calendar / Forex Factory'});
 const events=applyFFWeekly(addVerifiedFedEvents(cache.rows.filter(e=>Date.parse(e.date)>=now-30*DAY&&Date.parse(e.date)<=now+21*DAY).map(e=>({...e}))).map(alignTradingCalendarNames),ffRows);
 await officialOverlay(events,now);
 // Existing site expects an array; these are verified provider rows, not demo data.
 return res.status(200).json(events);
};
// Export only pure helpers for local deterministic testing; no network requests during import.
module.exports._test={normalize,normalizeFF,applyFFWeekly,sameFF,redundantGenericRate,releaseInstant,reportKind,reportDate,officialActual,sortUnique,addVerifiedFedEvents,addRecurringCompanions,nameEvent,alignTradingCalendarNames,formatRecordedValue};
