// Live provider health audit. No credentials, no fabricated market data.
'use strict';
const base='https://pipsepaisa-api.vercel.app/api';
async function get(path){
 const response=await fetch(base+path,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/json'}});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error(path+' HTTP '+response.status+' '+JSON.stringify(body).slice(0,180));
 return body;
}
async function main(){
 const report={checkedAt:new Date().toISOString(),endpoint:base,warnings:[]};
 try {
  const events=await get('/calendar');
  if(!Array.isArray(events))throw Error('Calendar response is not an event array');
  const malformed=events.filter(x=>!x||!Number.isFinite(Date.parse(x.date))||!x.title||!x.country);
  if(malformed.length)throw Error(malformed.length+' calendar events have invalid structure');
  const past=events.filter(x=>Date.parse(x.date)<Date.now());
  const highPast=past.filter(x=>x.impact==='High');
  report.calendar={total:events.length,highImpact:events.filter(x=>x.impact==='High').length,
    pastEvents:past.length,pastWithActual:past.filter(x=>x.actual).length,
    highPastEvents:highPast.length,highPastWithActual:highPast.filter(x=>x.actual).length,
    pastMissingActualHighSamples:highPast.filter(x=>!x.actual).slice(0,10).map(x=>({date:x.date,
      country:x.country,title:x.title,source:x.source,status:x.status})),
    eventsWithForecast:events.filter(x=>x.forecast).length,
    eventsWithPrevious:events.filter(x=>x.previous).length};
  if(!events.length)report.warnings.push('Calendar has zero verified entries');
  if(past.length&&!past.some(x=>x.actual))report.warnings.push('Past releases have no published Actual data');
 } catch(e){report.calendarError=String(e.message||e);report.warnings.push('Calendar endpoint verification failed');}
 try {
  const health=await get('/news?health=1');
  const feeds=Array.isArray(health.feeds)?health.feeds:[];
  const bloomberg=feeds.filter(x=>x.name==='Bloomberg');
  report.news={configured:health.configured,working:health.working,uniqueHeadlines:health.uniqueHeadlines,
   bloombergConfigured:bloomberg.length,bloombergWorking:bloomberg.filter(x=>x.ok).length,
   bloombergHeadlines:bloomberg.reduce((n,x)=>n+(Number(x.count)||0),0)};
  if(!report.news.working||!report.news.uniqueHeadlines)report.warnings.push('News feed returned no live sources or headlines');
  if(bloomberg.length&&!report.news.bloombergWorking)report.warnings.push('Bloomberg publisher RSS currently unavailable; Google News mirrors may still appear');
 } catch(e){report.newsError=String(e.message||e);report.warnings.push('News health verification failed');}
 try {
  const data=await get('/news?limit=500');
  if(!Array.isArray(data.items))throw Error('News items response is not an array');
  const unique=new Set(data.items.map(x=>x.heat));
  report.headlines={count:data.items.length,hot:data.items.filter(x=>x.heat==='hot').length,
   warm:data.items.filter(x=>x.heat==='warm').length,cold:data.items.filter(x=>x.heat==='cold').length,
   bloombergArticles:data.items.filter(x=>/bloomberg/i.test(x.source||'')).length,
   bloombergSources:[...new Set(data.items.filter(x=>/bloomberg/i.test(x.source||'')).map(x=>x.source))].slice(0,5)};
  if(report.news?.bloombergConfigured && !report.news.bloombergHeadlines && !report.headlines.bloombergArticles)
   report.warnings.push('No Bloomberg headlines from publisher RSS or Google News fallback');
  if(data.items.length&&!data.items.every(x=>Number.isFinite(Date.parse(x.date))&&x.title&&x.link))
   report.warnings.push('Some news articles have invalid dates or missing source links');
  if(data.items.length&&!unique.size)report.warnings.push('Headline impact labels unavailable');
  const candidate=data.items.find(x=>['gold','silver','bitcoin','btc','oil','wti','brent','eur/usd'].some(term=>String(x.title||'').toLowerCase().includes(term)) &&
    Date.now()-Date.parse(x.date)>55*60000 && Date.now()-Date.parse(x.date)<4*86400000);
  if(candidate){
   const q=new URLSearchParams({title:candidate.title,at:candidate.date});
   const reaction=await get('/news-reaction?'+q.toString());
   report.articleReaction={status:reaction.status,observations:(reaction.observations||[]).length,
     observedInstruments:(reaction.observations||[]).map(x=>x.instrument)};
   if(reaction.status==='unavailable')report.warnings.push('Historical observed price reaction unavailable for sampled article');
  }else report.articleReaction={status:'no eligible timestamped article'};

 }catch(e){report.headlinesError=String(e.message||e);report.warnings.push('News article verification failed');}
 // Compare source-published Actual availability; do not infer or fabricate missing values.
 try{
  const res=await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json',{signal:AbortSignal.timeout(12000)});
  if(res.ok){
   const rows=await res.json();
   report.forexFactoryWeekly={total:rows.length,withActual:rows.filter(x=>String(x.actual||'').trim()!=='').length,
      highImpactPast:rows.filter(x=>String(x.impact).toLowerCase()==='high'&&Date.parse(x.date)<Date.now()).length};
  }else report.forexFactoryWeekly={http:res.status};
 }catch(e){report.forexFactoryWeekly={error:String(e.message||e)};}
 // Diagnose publisher RSS availability separately from Google News attribution.
 try{
  const r=await fetch('https://www.bloomberg.com/feeds/news.rss',{signal:AbortSignal.timeout(12000)});
  const xml=await r.text();
  const first=(xml.split('<item>')[1]||'').split('</item>')[0]||'';
  const rawDate=(first.split('<pubDate>')[1]||'').split('</pubDate>')[0]||'';
  report.bloombergPublisherDiagnostic={http:r.status,xmlBytes:xml.length,
   rawItems:Math.max(0,xml.split('<item>').length-1),
   firstDate:rawDate.slice(0,90),firstDateValid:Number.isFinite(Date.parse(rawDate)),
   firstItemSnippet:first.slice(0,650)};
 }catch(e){report.bloombergPublisherDiagnostic={error:String(e.message||e)};}
 console.log('PIPSEPAISA_LIVE_MARKET_AUDIT '+JSON.stringify(report,null,2));
 // A daily audit must fail for material regressions, not only HTTP errors.
 // Missing individual Actuals and unobservable price reactions are warnings,
 // because free/official sources legitimately have gaps.
 const critical=[];
 if(report.calendarError||report.newsError||report.headlinesError)
  critical.push('Market-data endpoint failed');
 if(report.calendar && report.calendar.total===0)
  critical.push('Verified calendar contains no events');
 if(report.calendar && report.calendar.pastEvents>0 && report.calendar.pastWithActual===0)
  critical.push('All recorded historical Actual values disappeared');
 if(report.news && (report.news.working===0||report.news.uniqueHeadlines===0))
  critical.push('All live news sources or headlines disappeared');
 if(report.news && report.news.bloombergConfigured>0 && report.news.bloombergHeadlines===0)
  critical.push('Bloomberg direct RSS headlines are missing again');
 if(critical.length){console.error('PIPSEPAISA_CRITICAL_DATA_REGRESSION '+JSON.stringify(critical));process.exitCode=1;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});