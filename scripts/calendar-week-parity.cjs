// Autonomous comparison with published Forex Factory weekly exports.
// Missing nextweek export is unavailable (not a successful empty week).
'use strict';
const calendar=require('../api/calendar.js')._test;
const API=process.env.PSP_CALENDAR_AUDIT_API||'https://pipsepaisa-api.vercel.app/api/calendar';
const EXPORTS={
 thisweek:'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
 nextweek:'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
};
async function audit(){
 const now=Date.now(),report={
  checkedAt:new Date(now).toISOString(),api:API,calendarCount:0,
  weeks:{},errors:[],warnings:[],
  summary:{published:0,matched:0,missing:0,wrongName:0,wrongImpact:0,wrongForecast:0,wrongPrevious:0,wrongActual:0}
 };
 const production=await fetch(API,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/json'}});
 if(!production.ok)throw Error('Production calendar HTTP '+production.status);
 const data=await production.json();
 if(!Array.isArray(data)||!data.length)throw Error('Production calendar returned no events');
 report.calendarCount=data.length;
 report.deployment={
  thisweek:production.headers.get('x-calendar-ff-thisweek-status'),
  nextweek:production.headers.get('x-calendar-ff-nextweek-status'),
  feedCheckedAt:production.headers.get('x-calendar-feed-checked-at')
 };
 if(!report.deployment.thisweek||!report.deployment.nextweek)
  report.errors.push('Production API does not expose dual-week Forex Factory sync; verify deployment');
 if(!report.deployment.feedCheckedAt||!Number.isFinite(Date.parse(report.deployment.feedCheckedAt)))
  report.errors.push('Production calendar lacks a verified source timestamp');
 for(const [week,url] of Object.entries(EXPORTS)){
  const output={source:url,weekStartET:calendar.ffWeekStart(now,week==='nextweek'?1:0),
    status:'unavailable',sourceRows:0,matched:0,cases:[]};
  report.weeks[week]=output;
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(16000),headers:{Accept:'application/json'}});
   if(!r.ok){output.httpStatus=r.status;throw Error('FF HTTP '+r.status);}
   const raw=await r.json();
   if(!Array.isArray(raw))throw Error('FF export is not JSON array');
   const normalized=raw.map(x=>calendar.normalizeFF(x,now)).filter(Boolean)
     .filter(x=>calendar.ffRowInWeek(x,week,now));
   if(!normalized.length)throw Error('FF export is empty or belongs to another week');
   const seen=new Set(),sourceRows=normalized.filter(x=>{
    const key=x.country+'|'+x.title.toLowerCase()+'|'+x.date;
    if(seen.has(key))return false;
    seen.add(key);return true;
   });
   output.status='published';output.sourceRows=sourceRows.length;
   report.summary.published+=sourceRows.length;
   for(const ff of sourceRows){
    const matches=data.filter(e=>calendar.sameFF(e,ff));
    const match=matches.find(e=>e.title===ff.title)||matches[0];
    if(!match){
     report.summary.missing++;
     output.cases.push({type:'missing',title:ff.title,country:ff.country,date:ff.date});
     continue;
    }
    output.matched++;report.summary.matched++;
    for(const [key,errorKey] of [['title','wrongName'],['impact','wrongImpact'],
      ['forecast','wrongForecast'],['previous','wrongPrevious'],['actual','wrongActual']]){
     if(['forecast','previous','actual'].includes(key)&&!ff[key])continue;
     if(String(match[key]||'')!==String(ff[key]||'')){
      report.summary[errorKey]++;
      output.cases.push({type:errorKey,title:ff.title,country:ff.country,
       date:ff.date,sourceValue:ff[key]||'',websiteValue:match[key]||''});
     }
    }
   }
   if(output.cases.length)report.errors.push(week+' event/value mismatches: '+output.cases.length);
  }catch(e){
   output.note=String(e.message||e).slice(0,180);
   report.warnings.push('Forex Factory '+week+' unavailable: '+output.note);
  }
 }
 if(report.summary.published===0)
  report.warnings.push('No Forex Factory weekly export verified: parity NOT confirmed');
 if(data.some(e=>Date.parse(e.date)>now&&e.actual))
  report.errors.push('Future event has Actual before release');
 if(data.some(e=>!e||!e.title||!e.country||!Number.isFinite(Date.parse(e.date))))
  report.errors.push('Malformed calendar row');
 for(const value of Object.values(report.weeks))value.cases=value.cases.slice(0,35);
 console.log('PIPSEPAISA_CALENDAR_WEEK_PARITY '+JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const fs=require('node:fs');
  let rows='';
  for(const [week,v] of Object.entries(report.weeks))
   rows+='| '+week+' | '+v.sourceRows+' | '+v.matched+' | '+v.status+' |\n';
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## Forex Factory ↔ PipSePaisa weekly parity\n\n'+
   '| Week | FF rows | Matched | Status |\n|---|---:|---:|---|\n'+rows+
   '\nMismatches: '+report.errors.length+'; warnings: '+report.warnings.length+'\n');
 }
 if(report.errors.length)process.exitCode=1;
}
audit().catch(e=>{console.error('PIPSEPAISA_WEEK_PARITY_UNAVAILABLE',e.message);process.exitCode=1;});
