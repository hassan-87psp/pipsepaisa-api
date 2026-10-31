'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const calendar=require('../api/calendar.js')._test;
const DAY=86400000;
const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);

test('Forex Factory ET week switches on Sunday, including November 2026 US DST',()=>{
 const before=Date.parse('2026-11-01T03:59:59Z'); // Sat Oct 31 at 23:59 New York, EDT
 const after=Date.parse('2026-11-01T06:00:00Z');  // Sun Nov 1 at 01:00 New York, EST
 assert.equal(calendar.ffWeekStart(before),'2026-10-25');
 assert.equal(calendar.ffWeekStart(before,1),'2026-11-01');
 assert.equal(calendar.ffWeekStart(after),'2026-11-01');
 assert.equal(calendar.ffWeekStart(after,1),'2026-11-08');
 assert.equal(calendar.ffWeekStart(Date.parse('2026-11-02T13:30:00Z')),'2026-11-01');
});

test('Current and next-week rows are accepted only in their correct ET weeks',()=>{
 const now=Date.parse('2026-10-31T18:00:00Z');
 const monday={date:'2026-11-02T13:30:00.000Z'};
 const october={date:'2026-10-30T13:30:00.000Z'};
 assert.equal(calendar.ffRowInWeek(monday,'nextweek',now),true);
 assert.equal(calendar.ffRowInWeek(monday,'thisweek',now),false);
 assert.equal(calendar.ffRowInWeek(october,'thisweek',now),true);
 assert.equal(calendar.ffRowInWeek(october,'nextweek',now),false);
 assert.equal(calendar.ffRowInWeek({date:'bad date'},'thisweek',now),false);
});

test('Forex Factory exact title, impact and published Forecast/Previous take priority',()=>{
 const at='2026-11-05T13:30:00Z';
 const fallback={date:at,country:'USD',title:'Unemployment Claims',impact:'Low',
  forecast:'199K',previous:'205K',source:'Finance Calendar'};
 const ff=calendar.normalizeFF({date:at,country:'USD',title:'Initial Jobless Claims',impact:'Medium',
  forecast:'202K',previous:'207K'},Date.parse('2026-11-01T00:00:00Z'));
 const result=calendar.applyFFWeekly([fallback],[ff]);
 assert.equal(result.length,1);
 assert.equal(result[0].title,'Initial Jobless Claims');
 assert.equal(result[0].providerTitle,'Unemployment Claims');
 assert.equal(result[0].impact,'Medium');
 assert.equal(result[0].forecast,'202K');
 assert.equal(result[0].previous,'207K');
 assert.equal(result[0].ffMatched,true);
});

test('A blank future-source value never copies Actual from Previous/Forecast',()=>{
 const ff=calendar.normalizeFF({date:'2026-11-05T13:30:00Z',country:'USD',
  title:'Non-Farm Employment Change',impact:'High',forecast:'63K',previous:'29K',actual:'63K'},
  Date.parse('2026-11-01T00:00:00Z'));
 assert.equal(ff.actual,'');
 assert.equal(ff.forecast,'63K');
 assert.equal(ff.previous,'29K');
 const rows=calendar.applyFFWeekly([], [ff]);
 assert.equal(rows[0].actual,'');
});

test('Same-time distinct reports stay separate without borrowing another metric value',()=>{
 const at='2026-11-03T13:30:00Z';
 const a=calendar.normalizeFF({date:at,country:'AUD',title:'CPI m/m',impact:'High',forecast:'0.4%'});
 const b=calendar.normalizeFF({date:at,country:'AUD',title:'CPI y/y',impact:'High',forecast:'3.9%'});
 const result=calendar.applyFFWeekly([], [a,b]);
 assert.equal(result.length,2);
 assert.equal(result.find(x=>x.title==='CPI m/m').forecast,'0.4%');
 assert.equal(result.find(x=>x.title==='CPI y/y').forecast,'3.9%');
});

test('Scheduled week calculation keeps next-week source windows rolling automatically',()=>{
 const current=calendar.ffWeekStart(Date.parse('2026-11-07T23:00:00Z'));
 const next=calendar.ffWeekStart(Date.parse('2026-11-08T14:00:00Z'));
 assert.equal(current,'2026-11-01');
 assert.equal(next,'2026-11-08');
 assert.equal(shift(current,7),next);
});
