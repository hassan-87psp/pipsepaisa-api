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
  report.calendar={total:events.length,highImpact:events.filter(x=>x.impact==='High').length,
    pastEvents:past.length,pastWithActual:past.filter(x=>x.actual).length,
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
 }catch(e){report.headlinesError=String(e.message||e);report.warnings.push('News article verification failed');}
 // Diagnose publisher RSS availability separately from Google News attribution.
 try{
  const r=await fetch('https://www.bloomberg.com/feeds/news.rss',{signal:AbortSignal.timeout(12000)});
  const xml=await r.text();
  const first=(xml.split('<item>')[1]||'').split('</item>')[0]||'';
  const rawDate=(first.split('<pubDate>')[1]||'').split('</pubDate>')[0]||'';
  report.bloombergPublisherDiagnostic={http:r.status,xmlBytes:xml.length,
   rawItems:Math.max(0,xml.split('<item>').length-1),
   firstDate:rawDate.slice(0,90),firstDateValid:Number.isFinite(Date.parse(rawDate))};
 }catch(e){report.bloombergPublisherDiagnostic={error:String(e.message||e)};}
 console.log('PIPSEPAISA_LIVE_MARKET_AUDIT '+JSON.stringify(report,null,2));
 if(report.calendarError||report.newsError||report.headlinesError)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});