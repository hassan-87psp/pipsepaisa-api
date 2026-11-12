'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  activeFeeds,gradeHeadline,classify,selectPriorityHeadlines,selectGeneralHeadlines
}=require('../api/news.js')._test;
const NOW=Date.parse('2026-11-12T08:00:00.000Z');
function item(category,heat,index,marketFocus=true){
  return {
    title:category+' trading headline '+index,
    category,heat,marketFocus,
    date:new Date(NOW-index*60_000).toISOString()
  };
}
const combined=[
 ...Array.from({length:250},(_,i)=>item('Gold','warm',i)),
 ...Array.from({length:250},(_,i)=>item('Forex','warm',i+250)),
 ...Array.from({length:230},(_,i)=>item(i%2?'Macro':'Central Banks','hot',i+500)),
 ...Array.from({length:200},(_,i)=>item('Geopolitics','hot',i+750)),
 ...Array.from({length:120},(_,i)=>item('Crypto','warm',i+1000)),
 ...Array.from({length:180},(_,i)=>item('Markets','cold',i+1200,false))
].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));

test('gold and forex targeted sources configured without repeat feed URLs',()=>{
 const urls=activeFeeds.map(f=>f.url);
 assert.equal(urls.length,new Set(urls).size);
 assert.ok(urls.length>=170,'expected curated source expansion');
 assert.ok(urls.some(u=>u.includes('kitco.com')));
 assert.ok(urls.some(u=>u.includes('gold.org')));
 assert.ok(urls.some(u=>u.includes('CFTC') || u.toLowerCase().includes('cftc')));
 assert.ok(urls.some(u=>u.includes('GBPJPY') || u.toLowerCase().includes('gbpjpy')));
});
test('Fed/ECB/BoE official coverage added without disabled CFTC RSS',()=>{
 assert.ok(activeFeeds.some(f=>f.name==='Federal Reserve'&&f.url.includes('press_monetary.xml')));
 assert.ok(activeFeeds.some(f=>f.name==='European Central Bank'&&f.url.includes('/rss/press.html')));
 assert.ok(activeFeeds.some(f=>f.name==='Bank of England'&&f.url.includes('/rss/news')));
 assert.ok(!activeFeeds.some(f=>f.url.includes('cftc.gov/RSS/')));
});
test('named FX pairs override generic central-bank mentions',()=>{
 assert.equal(classify('GBPJPY rebounds as Bank of Japan discusses rates','Markets'),'Forex');
 assert.equal(classify('EURJPY rises as ECB hints at monetary policy shift','Markets'),'Forex');
 assert.equal(classify('USDCAD sinks as Bank of Canada acts','Markets'),'Forex');
 assert.equal(classify('Spot gold XAUUSD climbs amid Treasury move','Markets'),'Gold');
});
test('gold positioning headlines are relevant without being labeled confirmed shocks',()=>{
 const cot=gradeHeadline('CFTC Commitments of Traders gold net long positions increase');
 const etf=gradeHeadline('Gold ETF inflows surge as dollar yields ease');
 assert.equal(cot.level,'warm');
 assert.equal(etf.topic,'Positioning & Gold Flows');
 assert.equal(gradeHeadline('24K gold jewellery price per gram in Delhi').level,'cold');
});
test('specialist digest reserves both Gold and Forex when headlines are available',()=>{
 const selected=selectPriorityHeadlines(combined,500,NOW);
 const gold=selected.filter(i=>i.category==='Gold').length;
 const forex=selected.filter(i=>i.category==='Forex').length;
 assert.equal(selected.length,500);
 assert.ok(gold>=120,'Gold should have allocated news');
 assert.ok(forex>=80,'Forex should have allocated news');
 assert.equal(new Set(selected).size,500);
 assert.ok(selected.every(item=>item.marketFocus));
});
test('general World News Hub retains unrelated stories while specialist feed remains focused',()=>{
 const general=selectGeneralHeadlines(combined,500);
 const trading=selectPriorityHeadlines(combined,500,NOW);
 assert.equal(general.length,500);
 assert.ok(general.filter(x=>x.heat==='cold').length>=90);
 assert.ok(trading.filter(x=>x.heat==='cold').length===0);
});
test('both digests preserve recent published order after selection',()=>{
 for(const list of [selectGeneralHeadlines(combined,500),selectPriorityHeadlines(combined,500,NOW)]){
   for(let i=1;i<list.length;i++){
     assert.ok(Date.parse(list[i-1].date)>=Date.parse(list[i].date),'published order');
   }
 }
});
