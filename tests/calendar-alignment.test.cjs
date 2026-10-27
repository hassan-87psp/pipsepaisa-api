// Regression audit for the Oct 2026 verified USD trading calendar.
const test=require('node:test');
const assert=require('node:assert/strict');
const {addVerifiedFedEvents,addRecurringCompanions,alignTradingCalendarNames} = require('../api/calendar.js')._test;
const feed=[
 {date:'2026-10-28T18:00:00.000Z',title:'FOMC Rate Decision October 2026',
  country:'USD',impact:'High',status:'confirmed',forecast:'',previous:'',actual:'',
  seriesCode:'fomc',sourceUrl:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'},
 {date:'2026-10-29T12:30:00.000Z',title:'US Gross Domestic Product October 2026',
  country:'USD',impact:'High',status:'confirmed',forecast:'',previous:'',actual:'',
  seriesCode:'us-gdp',sourceUrl:'https://www.bea.gov/news/schedule'},
 {date:'2026-10-29T12:30:00.000Z',title:'US Personal Income and Outlays (PCE) October 2026',
  country:'USD',impact:'High',status:'confirmed',forecast:'',previous:'',actual:'9.9%',
  seriesCode:'us-pce',sourceUrl:'https://www.bea.gov/news/schedule'}
];
const actual=()=>addVerifiedFedEvents(feed).map(alignTradingCalendarNames);
test('shows five DISTINCT USD releases with trading metric names and verified UTC timing',()=>{
 const a=actual();
 assert.deepEqual(a.map(x=>x.title),[
  'Federal Funds Rate','FOMC Statement','FOMC Press Conference',
  'Advance GDP q/q','Core PCE Price Index m/m']);
 assert.deepEqual(a.map(x=>x.date),[
  '2026-10-28T18:00:00.000Z','2026-10-28T18:00:00.000Z',
  '2026-10-28T18:30:00.000Z','2026-10-29T12:30:00.000Z',
  '2026-10-29T12:30:00.000Z']);
 assert.equal(a.every(x=>x.impact==='High'),true);
 assert.equal(new Set(a.map(x=>x.eventId)).size,5);
});
test('preserves admin screenshot values only as explicitly dated snapshots',()=>{
 const a=actual();
 assert.deepEqual([a[0].forecast,a[0].previous],['4.00%','4.00%']);
 assert.deepEqual([a[3].forecast,a[3].previous],['3.2%','2.2%']);
 assert.deepEqual([a[4].forecast,a[4].previous],['0.3%','0.2%']);
 assert.equal(a[4].forecastSnapshot,'2026-10-27');
 assert.match(a[4].forecastSource,/not a live feed/);
});
test('never presents generic PCE package actual as monthly core PCE',()=>{
 assert.equal(actual()[4].actual,'');
 const specificallyLabeled={...feed[2],title:'Core PCE Price Index m/m',actual:'0.5%'};
 assert.equal(alignTradingCalendarNames(specificallyLabeled).actual,'0.5%');
});
test('ignores same-looking events on unrelated dates or currencies',()=>{
 const fake={...feed[0],date:'2026-12-16T19:00:00.000Z'};
 const other={...feed[0],country:'CAD'};
 assert.equal(alignTradingCalendarNames(fake).title,fake.title);
 assert.equal(alignTradingCalendarNames(other).title,other.title);
 assert.equal(addVerifiedFedEvents([{...feed[0],status:'estimated'}]).length,1);
 assert.equal(addVerifiedFedEvents(addVerifiedFedEvents(feed)).length,5);
});

test('next FOMC meeting auto-generates statement and conference in EST, no hardcoded October date',()=>{
 const feed=[{...actual()[0],eventId:'fomc-dec2026',title:'FOMC Rate Decision December 2026',
   sourceTitle:undefined,date:'2026-12-09T19:00:00.000Z',
   seriesCode:'fomc',forecast:'',previous:'',forecastSnapshot:undefined}];
 const a=addRecurringCompanions(feed);
 assert.deepEqual(a.map(x=>x.title),['Federal Funds Rate','FOMC Statement','FOMC Press Conference']);
 assert.equal(a[2].date,'2026-12-09T19:30:00.000Z');
 assert.equal(a.every(x=>!x.forecast),true);
 assert.equal(addRecurringCompanions(a).length,3);
});
test('next PCE and NFP auto use trading labels, without fabricated consensus',()=>{
 const feed=[
  {date:'2026-11-25T13:30:00.000Z',title:'US Personal Income and Outlays (PCE) November 2026',
   seriesCode:'us-pce',country:'USD',impact:'High',status:'confirmed',
   sourceUrl:'https://www.bea.gov/news/schedule',forecast:'',previous:'',actual:'8.5%'},
  {date:'2026-12-04T13:30:00.000Z',title:'US Employment Situation (Non-Farm Payrolls) December 2026',
   seriesCode:'us-nfp',country:'USD',impact:'High',status:'confirmed',
   sourceUrl:'https://www.bls.gov/schedule/news_release/bls.ics',forecast:'',previous:'',actual:''}
 ];
 const a=addRecurringCompanions(feed);
 assert.deepEqual(a.map(x=>x.title),['Core PCE Price Index m/m','Non-Farm Employment Change','Unemployment Rate']);
 assert.equal(a[0].actual,'');
 assert.equal(a.every(x=>x.forecast===''&&x.previous===''),true);
});
test('CPI automatically expands to monthly/core/annual metrics, only for confirmed BLS release',()=>{
 const base={date:'2026-12-10T13:30:00.000Z',title:'US CPI Report December 2026',
  seriesCode:'us-cpi',country:'USD',impact:'High',status:'confirmed',
  sourceUrl:'https://www.bls.gov/schedule/news_release/bls.ics',
  forecast:'',previous:'',actual:'2.6%'};
 const a=addRecurringCompanions([base]);
 assert.deepEqual(a.map(x=>x.title),['CPI m/m','Core CPI m/m','CPI y/y']);
 assert.equal(a[0].actual,'');
 assert.equal(addRecurringCompanions([{...base,status:'estimated'}]).length,1);
});
test('unverified policy time never manufactures a conference',()=>{
 const e={...feed[0],date:'2026-12-09T18:00:00.000Z'};
 assert.equal(addRecurringCompanions([e]).length,1);
 assert.equal(addRecurringCompanions([{...e,date:'2026-12-09T19:00:00.000Z',status:'estimated'}]).length,1);
});
