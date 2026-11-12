const test=require('node:test');
const assert=require('node:assert/strict');
const {dedupe}=require('../api/news.js')._test;
const origin=Date.parse('2026-11-12T12:00:00Z');
const story=(title,i)=>({title,source:i?'Alternate publisher':'Original publisher',
 date:new Date(origin-i*60_000).toISOString(),heat:'warm'});

test('same Gold article shared by Investing.com and regional syndication appears once',()=>{
 const headlines=[
  'Gold slips below $4,000 as hawkish Fed bets keep bullion under pressure By Investing.com - Investing.com South Africa',
  'Gold slips below $4,000 as hawkish Fed bets keep bullion under pressure'];
 assert.equal(dedupe(headlines.map(story)).length,1);
});
test('minor publication prefixes and suffixes do not repeat a syndicated article',()=>{
 const headlines=[
  'Analysis-From SpaceX to Anthropic, markets have a new playbook for mega-share debuts',
  'From SpaceX to Anthropic, markets have a new playbook for mega-share debuts - marketscreener.com'];
 assert.equal(dedupe(headlines.map(story)).length,1);
});
test('publisher attribution in similar rupiah headlines is deduplicated',()=>{
 const headlines=[
  'Indonesian rupiah hits record low amid MSCI downgrade concerns - Investing.com',
  'Indonesian rupiah hits record low amid MSCI downgrade concerns By Investing.com - Investing.com South Africa'];
 assert.equal(dedupe(headlines.map(story)).length,1);
});
test('small synonymous differences in same syndicated report are merged',()=>{
 const headlines=[
  'Vietnam Dollar Bond Sale on Hold as Fuel Shock Fans Inflation - Bloomberg.com',
  'Vietnam Dollar Bond Sale on Hold as Fuel Cost Fans Inflation'];
 assert.equal(dedupe(headlines.map(story)).length,1);
});
test('BTC spot price and price-range prediction products stay separate',()=>{
 const headlines=[
  'BTC price on Nov 12, 2026 at 1am EST Prediction Market - Robinhood',
  'BTC price range on Nov 12, 2026 at 1am EST Prediction Market - Robinhood'];
 assert.equal(dedupe(headlines.map(story)).length,2);
});
test('opposite bullish and bearish price moves are never combined',()=>{
 const headlines=[
  'Gold rises above $4,000 as Fed rate expectations shift on strong CPI report',
  'Gold falls below $4,000 as Fed rate expectations shift on strong CPI report'];
 assert.equal(dedupe(headlines.map(story)).length,2);
});
test('South African and broader African market stories stay separate',()=>{
 const headlines=[
  'South African Markets - Factors to watch on November 12 - marketscreener.com',
  'African markets - factors to watch on November 12 - MarketScreener UK'];
 assert.equal(dedupe(headlines.map(story)).length,2);
});
test('deduplication keeps the newest original when near matches exist',()=>{
 const rows=[
  story('From SpaceX to Anthropic, markets have a new playbook for mega-share debuts - marketscreener.com',1),
  story('Analysis-From SpaceX to Anthropic, markets have a new playbook for mega-share debuts',0)
 ];
 const newestTitle=rows[1].title;
 const unique=dedupe(rows);
 assert.equal(unique.length,1);
 assert.equal(unique[0].title,newestTitle);
});

test('source-specific attribution removes exact syndicated news repeated via Moomoo',()=>{
 const a=story('Asian Currencies Falter as Dollar Thrives - marketscreener.com',0);
 const b=story('Asian Currencies Falter as Dollar Thrives - Moomoo',1);
 a.source='marketscreener.com';b.source='Moomoo';
 assert.equal(dedupe([a,b]).length,1);
});
test('source-specific attribution merges MarketScreener regional reprints',()=>{
 const a=story('African markets - factors to watch on November 12 - MarketScreener UK',0);
 const b=story('African markets - factors to watch on November 12 - marketscreener.com',1);
 a.source='MarketScreener UK';b.source='marketscreener.com';
 assert.equal(dedupe([a,b]).length,1);
});

test('two titles pointing to one live article URL appear only once',()=>{
 const link='https://www.bloomberg.com/news/live-blog/2026-11-12/ftse-market-updates';
 const first={...story('FTSE 100 Poised to Rise, Pound Falls',0),link};
 const second={...story('UK Economy Grew More Than Expected in September',1),link};
 const kept=dedupe([second,first]);
 assert.equal(kept.length,1);
 assert.equal(kept[0].title,first.title);
});
