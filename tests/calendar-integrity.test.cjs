'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const calendar=require('../api/calendar.js')._test;

test('Finance Calendar never exposes a future Actual, even if provider prematurely includes it',()=>{
  const source={release_at_utc:'2026-11-05T13:30:00.000Z',title:'CPI m/m',
    country:'US',impact:'high',status:'released',unit:'%',actual:'2.8',
    forecast:'2.6',previous:'2.7'};
  const future=calendar.normalize(source,Date.parse('2026-10-31T00:00:00Z'));
  assert.equal(future.actual,'');
  assert.equal(future.status,'confirmed');
  assert.equal(future.forecast,'2.6%');
  const released=calendar.normalize(source,Date.parse('2026-11-05T13:30:01Z'));
  assert.equal(released.actual,'2.8%');
  assert.equal(released.status,'released');
});

test('Premature provider Actual is cleared on the final output, including source metadata',()=>{
  const now=Date.parse('2026-10-31T00:00:00Z');
  const source=[{date:'2026-11-02T13:30:00Z',country:'USD',title:'Jobs',actual:'100K',
      status:'released',actualSource:'Provider',actualSourceUrl:'https://example.org'},
    {date:'2026-10-28T13:30:00Z',country:'USD',title:'CPI m/m',actual:'0.3%',
      status:'released',actualSource:'Provider'}];
  const rows=calendar.stripPrematureActuals(source,now);
  assert.equal(rows[0].actual,'');
  assert.equal(rows[0].actualSource,null);
  assert.equal(rows[0].actualSourceUrl,null);
  assert.equal(rows[0].status,'confirmed');
  assert.equal(rows[1].actual,'0.3%');
});

test('Unvalued Australian CPI package removed only when the exact recorded metric exists',()=>{
  const at='2026-10-28T00:30:00.000Z';
  const packageRow={date:at,country:'AUD',title:'Australia CPI: September 2026',
    actual:'',forecast:'',previous:''};
  const metric={date:at,country:'AUD',title:'CPI m/m',actual:'0.8%'};
  assert.deepEqual(calendar.removeEmptyCpiPackages([packageRow,metric]),[metric]);
  assert.deepEqual(calendar.removeEmptyCpiPackages([packageRow]),[packageRow]);
  assert.equal(calendar.removeEmptyCpiPackages([{...packageRow,forecast:'0.7%'},metric]).length,2);
});

test('Forex Factory event matching requires exact timestamp/currency/metric identity',()=>{
  const at='2026-10-28T00:30:00.000Z';
  const monthly={date:at,country:'AUD',title:'CPI m/m'};
  const annual={date:at,country:'AUD',title:'CPI y/y'};
  const other={date:at,country:'NZD',title:'CPI m/m'};
  assert.equal(calendar.sameFF(monthly,annual),false);
  assert.equal(calendar.sameFF(monthly,other),false);
  assert.equal(calendar.sameFF(monthly,{...monthly}),true);
});

test('October 2026 central-bank Actual values match date-locked official records',()=>{
 const now=Date.parse('2026-10-31T00:00:00Z');
 const cases=[
  {date:'2026-10-28T18:00:00.000Z',country:'USD',title:'Federal Funds Rate',actual:'4.00%',source:'US Federal Reserve'},
  {date:'2026-10-28T13:45:00.000Z',country:'CAD',title:'Overnight Rate',actual:'2.50%',source:'Bank of Canada'},
  {date:'2026-10-29T13:15:00.000Z',country:'EUR',title:'Main Refinancing Rate',actual:'2.65%',source:'European Central Bank'}
 ];
 for(const row of cases){
  const clean={...row,actual:''};
  const actual=calendar.applyPrimaryReleasedActuals([clean],now)[0];
  assert.equal(actual.actual,row.actual,row.country);
  assert.equal(actual.actualSource,row.source,row.country);
  assert.ok(/^https:\/\//.test(actual.actualSourceUrl),row.country);
  const before=calendar.applyPrimaryReleasedActuals([clean],Date.parse(row.date)-1000)[0];
  assert.equal(before.actual,'','Never release a backfill early');
  const changedDate=calendar.applyPrimaryReleasedActuals([{...clean,date:'2026-11-05T13:30:00.000Z'}],now)[0];
  assert.equal(changedDate.actual,'','Do not reuse another release date');
 }
});
