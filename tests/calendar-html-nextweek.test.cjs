'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const t=require('../api/calendar.js')._test;
const now=Date.parse('2026-11-02T00:00:00Z');
const sample=String.raw`<html><head>Calendar Time Zone: America/Chicago (GMT -6)</head>
<tr class="calendar__row calendar__row--day-breaker"><td colspan="10">Sun <span>Nov 8</span></td></tr>
<tr class="calendar__row calendar__row--new-day">
<td class="calendar__cell calendar__date"><span class="date">Sun <span>Nov 8</span></span></td>
<td class="calendar__cell calendar__time">7:30pm</td>
<td class="calendar__cell calendar__currency">CNY</td>
<td class="calendar__cell calendar__impact"><span class="icon icon--ff-impact-yel"></span></td>
<td class="calendar__cell calendar__event"><span class="calendar__event-title">CPI y/y</span></td>
<td class="calendar__cell calendar__actual"></td>
<td class="calendar__cell calendar__forecast"><span>2.1%</span></td>
<td class="calendar__cell calendar__previous"><span>2.0%</span></td>
</tr>
<tr class="calendar__row"><td class="calendar__cell calendar__time"></td>
<td class="calendar__cell calendar__currency">CNY</td>
<td class="calendar__cell calendar__impact"><span class="icon icon--ff-impact-ora"></span></td>
<td class="calendar__cell calendar__event"><span class="calendar__event-title">PPI y/y</span></td>
<td class="calendar__cell calendar__forecast"></td>
<td class="calendar__cell calendar__previous"><span>-1.3%</span></td></tr>
<tr class="calendar__row calendar__row--day-breaker"><td colspan="10">Mon <span>Nov 9</span></td></tr>
<tr class="calendar__row"><td class="calendar__cell calendar__date">Mon <span>Nov 9</span></td>
<td class="calendar__cell calendar__time">7:00am</td>
<td class="calendar__cell calendar__currency">EUR</td>
<td class="calendar__cell calendar__impact"><span class="icon icon--ff-impact-red"></span></td>
<td class="calendar__cell calendar__event"><span class="calendar__event-title">German Trade Balance</span></td>
<td class="calendar__cell calendar__forecast"><span>15.3B</span></td>
<td class="calendar__cell calendar__previous"><span>14.1B</span></td></tr>
<tr class="calendar__row"><td class="calendar__cell calendar__time">Tentative</td>
<td class="calendar__cell calendar__currency">USD</td>
<td class="calendar__cell calendar__event"><span class="calendar__event-title">Tentative Event</span></td></tr>`;
test('Dated Forex Factory URL rolls automatically to next Sunday',()=>{
 assert.equal(t.ffDatedWeekURL(now,1),'https://www.forexfactory.com/calendar?week=nov8.2026');
});
test('HTML calendar parses precise names, DST-aware clock, forecast and previous',()=>{
 const rows=t.parseFFWeekHTML(sample,now,'nextweek');
 assert.equal(rows.length,3);
 assert.equal(rows[0].date,'2026-11-09T01:30:00.000Z');
 assert.equal(rows[0].title,'CPI y/y');
 assert.equal(rows[0].impact,'Low');
 assert.equal(rows[0].forecast,'2.1%');
 assert.equal(rows[0].previous,'2.0%');
 assert.equal(rows[1].title,'PPI y/y');
 assert.equal(rows[1].impact,'Medium');
 assert.equal(rows[1].date,rows[0].date);
 assert.equal(rows[2].impact,'High');
 assert.equal(rows[2].date,'2026-11-09T13:00:00.000Z');
 assert.equal(rows[2].actual,'');
});
test('Unknown timezone and Cloudflare HTML never create inferred events',()=>{
 assert.deepEqual(t.parseFFWeekHTML('<title>Just a moment...</title>',now,'nextweek'),[]);
 assert.deepEqual(t.parseFFWeekHTML(sample.replace('America/Chicago','Invalid/TimeZone'),now,'nextweek'),[]);
});
test('Tentative events stay un-timed instead of borrowing a previous event clock',()=>{
 assert.equal(t.parseFFWeekHTML(sample,now,'nextweek').some(e=>e.title==='Tentative Event'),false);
});
test('Month and year boundaries use the correct next-week date',()=>{
 const at=Date.parse('2026-12-28T13:00:00Z');
 assert.equal(t.ffDatedWeekURL(at,1),'https://www.forexfactory.com/calendar?week=jan3.2027');
});
