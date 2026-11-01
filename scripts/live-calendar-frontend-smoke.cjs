// Read-only production Economic Calendar route and deployed asset smoke checks.
'use strict';
(async()=>{
 const origin='https://www.pipsepaisa.com';
 const routes=['/dashboard/','/eaindicator/','/economic-news/','/world-news/'];
 const report={at:new Date().toISOString(),routes:[],issues:[]};
 for(const path of routes){
  try{
   const r=await fetch(origin+path,{signal:AbortSignal.timeout(14000),headers:{Accept:'text/html'}});
   const html=await r.text();
   const checks={
    today:html.includes("setNewsTime('today', this)"),
    nextWeek:html.includes("setNewsTime('nextweek', this)"),
    upcoming:html.includes("setNewsTime('upcoming', this)"),
    version:html.includes('v537-nextweek-source-status'),
    noFakeLive:html.includes('Checking source…'),
    calendarPanel:html.includes('id="page-news"')
   };
   report.routes.push({path,http:r.status,bytes:html.length,checks});
   if(!r.ok||Object.values(checks).some(x=>!x))
    report.issues.push('Calendar markup mismatch '+path);
  }catch(e){report.issues.push(path+': '+String(e.message||e));}
 }
 try{
  const r=await fetch(origin+'/user-app-core-v29.js?v=20261101-v537-nextweek-source-status',
   {signal:AbortSignal.timeout(14000),headers:{Accept:'application/javascript'}});
  const js=await r.text();
  report.asset={http:r.status,bytes:js.length,filter:js.includes('pspCalendarMatchesImpact'),
   nextWeek:js.includes("newsState.time === 'nextweek'"),source:js.includes('X-Calendar-FF-NextWeek-Status')};
  if(!r.ok||Object.values(report.asset).some((v,k)=>k!=='http'&&k!=='bytes'&&v===false))
   report.issues.push('Deployed calendar script is stale or missing');
 }catch(e){report.issues.push('Core script: '+String(e.message||e));}
 console.log('PIPSEPAISA_FRONTEND_LIVE_SMOKE '+JSON.stringify(report,null,2));
 if(report.issues.length)process.exitCode=1;
})();
