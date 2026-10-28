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
test('does not invent snapshot forecasts or previous results for upcoming USD reports',()=>{
 const a=actual();
 for (const item of a) {
  assert.equal(item.forecast,'');
  assert.equal(item.previous,'');
  assert.equal(item.forecastSnapshot,undefined);
 }
});
test('uses published precise Forex Factory consensus without fabricating a generic report forecast',()=>{
 const testHelpers=require('../api/calendar.js')._test;
 const a=testHelpers.applyFFWeekly(actual(),[{
  date:'2026-10-29T12:30:00.000Z',country:'USD',title:'Core PCE Price Index m/m',
  forecast:'0.3%',previous:'0.2%',actual:'',source:'Forex Factory',
  sourceUrl:'https://www.forexfactory.com/calendar',status:'confirmed',impact:'High'
 }]);
 const pce=a.find(x=>x.title==='Core PCE Price Index m/m');
 assert.equal(pce.forecast,'0.3%');
 assert.equal(pce.previous,'0.2%');
 assert.equal(pce.forecastSource,'https://www.forexfactory.com/calendar');
});
test('generic report figures must never inherit a precise trading metric label',()=>{
 const testHelpers=require('../api/calendar.js')._test;
 const broad={date:'2026-10-29T12:30:00.000Z',title:'US Personal Income and Outlays (PCE) October 2026',
  country:'USD',seriesCode:'us-pce',status:'confirmed',impact:'High',
  forecast:'2.9%',previous:'3.1%',actual:'2.8%'};
 const pce=testHelpers.nameEvent(broad);
 assert.equal(pce.title,'Core PCE Price Index m/m');
 assert.deepEqual([pce.forecast,pce.previous,pce.actual],['','','']);
 const cpi=testHelpers.nameEvent({...broad,title:'US CPI Report November 2026',seriesCode:'us-cpi',unit:'% y/y'});
 assert.equal(cpi.title,'CPI y/y');
 assert.equal(cpi.forecast,'2.9%');
 const cpiUnknown=testHelpers.nameEvent({...broad,title:'US CPI Report November 2026',seriesCode:'us-cpi',unit:''});
 assert.deepEqual([cpiUnknown.forecast,cpiUnknown.previous,cpiUnknown.actual],['','','']);
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

test('published CPI y/y actual and previous retain their year-over-year units',()=>{
 const row={country:'US',title:'US CPI Report October 2026',impact:'high',
  release_at_utc:'2026-10-14T12:30:00+00:00',series_code:'us-cpi',
  status:'released',unit:'% y/y',prior:'3.4',actual:'3.7',
  source_url:'https://www.bls.gov/news.release/cpi.nr0.htm'};
 const raw=require('../api/calendar.js')._test.normalize(row);
 const result=addRecurringCompanions([raw]);
 assert.equal(result.length,3);
 assert.equal(result[0].title,'CPI y/y');
 assert.equal(result[0].actual,'3.7%');
 assert.equal(result[0].previous,'3.4%');
 assert.equal(result.find(x=>x.title==='CPI m/m').actual,'');
 assert.equal(result.find(x=>x.title==='Core CPI m/m').actual,'');
});
test('past NFP actual jobs and previous convert correctly to K and remain visible',()=>{
 const raw=require('../api/calendar.js')._test.normalize({
  country:'US',title:'US Employment Situation (Non-Farm Payrolls) October 2026',
  impact:'high',release_at_utc:'2026-10-02T12:30:00+00:00',series_code:'us-nfp',
  status:'released',unit:'jobs',prior:'133000',actual:'29000',
  source_url:'https://www.bls.gov/schedule/news_release/bls.ics'
 });
 const result=addRecurringCompanions([raw]);
 const payroll=result.find(x=>x.title==='Non-Farm Employment Change');
 assert.equal(payroll.previous,'133K');
 assert.equal(payroll.actual,'29K');
 assert.equal(result.find(x=>x.title==='Unemployment Rate').actual,'');
});
test('unknown values remain genuinely missing rather than becoming 0 or invented forecasts',()=>{
 const test=require('../api/calendar.js')._test;
 assert.equal(test.formatRecordedValue(null,'% y/y'),'');
 assert.equal(test.formatRecordedValue('','jobs'),'');
 assert.equal(test.formatRecordedValue('0','%'),'0%');
 assert.equal(test.formatRecordedValue('high yield 4.25%; bid-to-cover 2.4',''),'high yield 4.25%; bid-to-cover 2.4');
});

test('published Forex Factory Actual values flow to the matching event with attribution only after release',()=>{
 const t=require('../api/calendar.js')._test;
 const past=new Date(Date.now()-86400000).toISOString();
 const source=t.normalizeFF({title:'Core PCE Price Index m/m',country:'USD',date:past,
   impact:'High',actual:'0.4%',forecast:'0.3%',previous:'0.2%'});
 assert.equal(source.actual,'0.4%');
 assert.equal(source.actualSource,'https://www.forexfactory.com/calendar');
 const merged=t.applyFFWeekly([{date:past,title:'Core PCE Price Index m/m',country:'USD',
  impact:'High',status:'confirmed',forecast:'',previous:'',actual:''}],[source]);
 assert.equal(merged.length,1);
 assert.equal(merged[0].actual,'0.4%');
 assert.equal(merged[0].actualSource,'https://www.forexfactory.com/calendar');
 const future=t.normalizeFF({title:'Federal Funds Rate',country:'USD',
   date:new Date(Date.now()+86400000).toISOString(),impact:'High',actual:'4.00%'});
 assert.equal(future.actual,'');
 assert.equal(future.actualSource,null);
});
