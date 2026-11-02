'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../api/calendar.js'),'utf8');

function mockResponse(status,data) {
 return {ok:status>=200&&status<300,status,
   json:async()=>data,text:async()=>typeof data==='string'?data:JSON.stringify(data)};
}
function buildHandler(fetchMock) {
 const mod={exports:{}};
 new Function('module','fetch','process',source)(mod,fetchMock,{env:{}});
 return mod.exports;
}
test('Calendar starts current-week and next-week FF requests without awaiting Finance Calendar',async()=>{
 const now=Date.now(),eventDate=new Date(now+2*3600000).toISOString();
 const calls=[];
 let finishFinance;
 const fetchMock=async url=>{
  const u=String(url);
  if(u.includes('financecalendar.com')){
   calls.push('finance');
   return new Promise(resolve=>{finishFinance=resolve;});
  }
  if(u.includes('ff_calendar_thisweek.json')){
   calls.push('thisweek');
   return mockResponse(200,[{date:eventDate,country:'USD',
      title:'ISM Manufacturing PMI',impact:'High',forecast:'54.7',previous:'54.5'}]);
  }
  if(u.includes('ff_calendar_nextweek.json'))calls.push('nextweek');
  else if(u.includes('calendar?week='))calls.push('dated-html');
  else if(u.includes('raw.githubusercontent.com'))calls.push('snapshot');
  else throw Error('Unrecognized calendar source: '+u);
  return mockResponse(404,{});
 };
 const handler=buildHandler(fetchMock),headers={};
 const res={setHeader(k,v){headers[k]=v},status(v){this.code=v;return this},
  json(v){this.body=v;return this},end(){return this}};
 const pending=handler({method:'GET'},res);
 try{
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(calls.includes('finance'),'finance request started');
  assert.ok(calls.includes('thisweek'),'FF current week started before finance completed');
  assert.ok(calls.includes('nextweek'),'FF next week started before finance completed');
  assert.ok(calls.includes('dated-html'),'FF dated page attempted');
  assert.ok(calls.includes('snapshot'),'verified FF snapshot attempted');
 }finally{
  if(finishFinance)finishFinance(mockResponse(200,{events:[{
   release_at_utc:eventDate,country:'US',title:'ISM Manufacturing PMI',
   impact:'high',consensus:'54.7',prior:'54.5',status:'confirmed'
  }],total:1}));
 }
 await pending;
 assert.equal(res.code,200);
 assert.ok(res.body.some(x=>x.title==='ISM Manufacturing PMI'));
 assert.equal(headers['X-Calendar-FF-ThisWeek-Status'],'available');
 assert.equal(headers['X-Calendar-FF-NextWeek-Status'],'unavailable');
 assert.equal(headers['X-Calendar-FF-NextWeek-Provider'],'none');
 assert.equal(headers['X-Calendar-NextWeek-Backup'],'financecalendar');
 assert.ok(res.body.every(e=>Date.parse(e.date)<=Date.now()||!e.actual),
   'Future results never appear before release');
});
test('Provider timeouts are below the website request deadline',()=>{
 assert.match(source,/setTimeout\(\(\)=>controller\.abort\(\),5200\)/);
 assert.match(source,/timedFetch\(url,4200\)/);
 assert.match(source,/setTimeout\(\(\)=>controller\.abort\(\),8000\)/);
 assert.match(source,/await Promise\.any\(/);
});
