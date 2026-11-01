'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const t=require('../api/calendar.js')._test;
const clock=Date.parse('2026-11-02T00:00:00Z');
function item(override={}){
 return {Date:'2026-11-09T13:30:00',Country:'United States',
  Event:'Initial Jobless Claims',CalendarId:'20269087',DateSpan:'0',
  Importance:2,Forecast:'202K',Previous:'207K',Actual:'999K',...override};
}
test('Trading Economics backup preserves UTC, importance, forecast, previous and actual release gating',()=>{
 const row=t.normalizeTE(item(),clock);
 assert.equal(row.date,'2026-11-09T13:30:00.000Z');
 assert.equal(row.country,'USD');
 assert.equal(row.impact,'Medium');
 assert.equal(row.actual,'');
 assert.equal(row.forecast,'202K');
 assert.equal(row.previous,'207K');
 assert.equal(row.source,'Trading Economics');
 assert.equal(t.normalizeTE(item(),Date.parse('2026-11-09T13:30:01Z')).actual,'999K');
});
test('Estimated and malformed release times cannot masquerade as precise scheduled timestamps',()=>{
 assert.equal(t.normalizeTE(item({DateSpan:'1'}),clock),null);
 assert.equal(t.normalizeTE(item({Date:'2026-11-09'}),clock),null);
 assert.equal(t.normalizeTE(item({Country:'Unknown Republic'}),clock),null);
});
test('Published Forex Factory values remain authoritative over licensed backup',()=>{
 const ff={date:'2026-11-09T13:30:00Z',country:'USD',title:'Initial Jobless Claims',
  impact:'High',forecast:'201K',previous:'209K',actual:'',source:'Forex Factory',ffMatched:true};
 const te=t.normalizeTE(item({Forecast:'202K',Previous:'207K'}),clock);
 const output=t.applySecondaryCalendar([ff],[te]);
 assert.equal(output.length,1);
 assert.equal(output[0].forecast,'201K');
 assert.equal(output[0].previous,'209K');
 assert.equal(output[0].title,'Initial Jobless Claims');
 assert.equal(output[0].source,'Forex Factory');
});
test('Backup only enriches the exact matched event; no cross-metric forecast borrowing',()=>{
 const fc={date:'2026-11-09T13:30:00Z',country:'USD',title:'Unemployment Claims',
   impact:'Low',forecast:'',previous:'',actual:'',source:'Finance Calendar'};
 const te=t.normalizeTE(item(),clock);
 const result=t.applySecondaryCalendar([fc],[te]);
 assert.equal(result.length,1);
 assert.equal(result[0].forecast,'202K');
 assert.equal(result[0].previous,'207K');
 assert.equal(result[0].forecastSource,'https://tradingeconomics.com/calendar');
 const unrelated=t.applySecondaryCalendar([{...fc,title:'CPI y/y'}],[te]);
 assert.equal(unrelated.length,2);
});
test('New TE backup events retain named source rather than pretending to be Forex Factory',()=>{
 const te=t.normalizeTE(item(),clock);
 const rows=t.applySecondaryCalendar([],[te]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].source,'Trading Economics');
 assert.equal(rows[0].actual,'');
});
