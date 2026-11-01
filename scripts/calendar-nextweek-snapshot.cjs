// Collect a safe date-scoped copy of published Forex Factory next-week data.
// Do not write anything if the public page is blocked or cannot be verified.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const c=require('../api/calendar.js')._test;
(async function(){
 const now=Date.now(),weekStart=c.ffWeekStart(now,1),url=c.ffDatedWeekURL(now,1);
 try{
  const res=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{
   Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; PipSePaisaCalendar/1.0)'}});
  if(!res.ok)throw Error('Forex Factory dated page HTTP '+res.status);
  const html=await res.text();
  const parsed=c.parseFFWeekHTML(html,now,'nextweek');
  if(parsed.length<5)throw Error('Fewer than 5 confirmed dated rows; refuse snapshot');
  const events=parsed.map(e=>({date:e.date,country:e.country,title:e.title,
   impact:e.impact,forecast:e.forecast||'',previous:e.previous||'',actual:e.actual||''}));
  const file=path.resolve(__dirname,'../data/ff-nextweek-snapshot.json');
  let previous=null;
  try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){}
  const snapshot={weekStartET:weekStart,source:url,verifiedAt:new Date(now).toISOString(),events};
  if(previous?.weekStartET===weekStart&&JSON.stringify(previous.events)===JSON.stringify(events)){
   console.log('FF_WEEK_SNAPSHOT_UNCHANGED '+JSON.stringify({weekStart,events:events.length}));
   return;
  }
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n');
  console.log('FF_WEEK_SNAPSHOT_UPDATED '+JSON.stringify({weekStart,events:events.length,source:url}));
 }catch(e){
  console.log('FF_WEEK_SNAPSHOT_UNAVAILABLE '+String(e.message||e).slice(0,200));
 }
})();
