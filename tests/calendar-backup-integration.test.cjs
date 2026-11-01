'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const src=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../api/calendar.js'),'utf8');
function load(mock,env={}){
 class Abort{constructor(){this.signal={}}abort(){}}
 const mod={exports:{}};
 const Query=URLSearchParams;
 new Function('module','fetch','AbortController','URLSearchParams','setTimeout','clearTimeout','process',src)
  (mod,mock,Abort,Query,setTimeout,clearTimeout,{env});
 return mod.exports;
}
const day=86400000;
test('When nextweek FF is inaccessible, an authorized TE feed enriches only matching forecast/previous',async()=>{
 const clock=Date.now();
 const first=load(async()=>{throw Error('not used')})._test.ffWeekStart(clock);
 const next=load(async()=>{throw Error('not used')})._test.ffWeekStart(clock,1);
 const event=(week,dayOffset)=>new Date(Date.parse(week+'T12:00:00Z')+dayOffset*day+90*60000).toISOString();
 const currentISO=event(first,2),nextISO=event(next,2);
 let teCalls=0;
 const fetch=async url=>{
  const u=String(url);
  if(u.includes('financecalendar.com')){
   return {ok:true,status:200,json:async()=>({events:[{
     release_at_utc:nextISO,country:'US',title:'Unemployment Claims',impact:'medium',
     consensus:'199K',prior:'206K',status:'confirmed'
   }],total:1})};
  }
  if(u.includes('ff_calendar_thisweek.json'))
   return {ok:true,status:200,json:async()=>[{date:currentISO,country:'USD',
    title:'ISM Manufacturing PMI',impact:'High',forecast:'50.3',previous:'50.8'}]};
  if(u.includes('calendar?week=')||u.includes('raw.githubusercontent.com'))
   return {ok:false,status:403,json:async()=>({}),text:async()=>''};
  if(u.includes('ff_calendar_nextweek.json'))
   return {ok:false,status:404,json:async()=>({})};
  if(u.includes('api.tradingeconomics.com/calendar/')){
   teCalls++;
   return {ok:true,status:200,json:async()=>[{
    Date:nextISO.replace('.000Z',''),Country:'United States',
    Event:'Initial Jobless Claims',DateSpan:'0',Importance:2,CalendarId:'10111',
    Forecast:'203K',Previous:'209K',Actual:'999K'
   }]};
  }
  throw Error('Unexpected URL category');
 };
 const handler=load(fetch,{TRADING_ECONOMICS_API_KEY:'TEST-ONLY-KEY'});
 const headers={};
 const res={setHeader(k,v){headers[k]=v},status(c){this.code=c;return this},
  json(data){this.body=data;return this},end(){return this}};
 await handler({method:'GET'},res);
 assert.equal(res.code,200);
 assert.equal(teCalls,1);
 assert.equal(headers['X-Calendar-FF-NextWeek-Status'],'unavailable');
 assert.equal(headers['X-Calendar-NextWeek-Backup'],'tradingeconomics');
 assert.equal(headers['X-Calendar-TE-Status'],'available');
 const jobless=res.body.find(x=>x.forecast==='203K');
 assert.ok(jobless,'TE consensus matched expected event');
 assert.equal(jobless.previous,'209K');
 assert.equal(jobless.actual,'','Future Actual cannot be surfaced');
 assert.equal(jobless.forecastSource,'https://tradingeconomics.com/calendar');
 assert.ok(!JSON.stringify(res.body).includes('TEST-ONLY-KEY'),'Never leak API key');
 assert.ok(res.body.some(x=>x.title==='ISM Manufacturing PMI'));
});
