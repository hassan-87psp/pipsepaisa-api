const test=require('node:test');
const assert=require('node:assert/strict');
const {clean,parseFeed}=require('../api/news.js')._test;
const NOW=Date.parse('2026-10-28T05:00:00Z');
test('Bloomberg CDATA headline and description remain readable',()=>{
 const xml='<rss><channel><item>'+
  '<title><![CDATA[New Zealand Holds Interest Rates Steady]]></title>'+
  '<description><![CDATA[<p>Kiwi dollar falls as central bank holds rates.</p>]]></description>'+
  '<link>https://www.bloomberg.com/news/articles/2026-10-28/new-zealand-holds-rates</link>'+
  '<pubDate>Wed, 28 Oct 2026 01:04:33 GMT</pubDate></item></channel></rss>';
 const out=parseFeed(xml,{name:'Bloomberg',category:'Markets',url:'https://www.bloomberg.com/feeds/news.rss'},NOW);
 assert.equal(out.length,1);
 assert.equal(out[0].title,'New Zealand Holds Interest Rates Steady');
 assert.equal(out[0].desc,'Kiwi dollar falls as central bank holds rates.');
 assert.equal(out[0].source,'Bloomberg');
 assert.equal(out[0].date,'2026-10-28T01:04:33.000Z');
});
test('CDATA HTML cannot leak tags and ordinary RSS text still renders',()=>{
 assert.equal(clean('<![CDATA[Gold <strong>rises</strong> &amp; USD falls]]>'),'Gold rises & USD falls');
 assert.equal(clean('<p>US CPI rises 0.3%</p>'),'US CPI rises 0.3%');
 assert.equal(clean('<![CDATA[<script>alert(1)</script>Fed decision]]>'),'alert(1) Fed decision');
});
test('old or untimed items are filtered rather than treated as new',()=>{
 const xml='<rss><channel><item><title><![CDATA[Old Bloomberg Story]]></title>'+
 '<link>https://www.bloomberg.com/news/articles/old</link>'+
 '<pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate></item></channel></rss>';
 assert.equal(parseFeed(xml,{name:'Bloomberg',category:'Markets',url:'https://www.bloomberg.com/feeds/news.rss'},NOW).length,0);
});