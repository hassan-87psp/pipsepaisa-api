// Historical price movement AROUND a specific published headline.
// This measures prices; it cannot establish that an article caused the movement.
// No directional output without timestamp-matched, observed price candles.
const INSTRUMENTS = [
  {label:'Gold Futures',symbol:'GC=F',kind:/\b(?:gold|bullion|xau\s*\/?\s*usd)\b/i,flat:0.08,strong:0.7},
  {label:'Silver Futures',symbol:'SI=F',kind:/\b(?:silver|xag\s*\/?\s*usd)\b/i,flat:0.1,strong:1.0},
  {label:'EUR/USD',symbol:'EURUSD=X',kind:/\b(?:eur\s*\/?\s*usd)\b/i,flat:0.025,strong:0.25},
  {label:'GBP/USD',symbol:'GBPUSD=X',kind:/\b(?:gbp\s*\/?\s*usd)\b/i,flat:0.025,strong:0.25},
  {label:'USD/JPY',symbol:'USDJPY=X',kind:/\b(?:usd\s*\/?\s*jpy)\b/i,flat:0.025,strong:0.25},
  {label:'USD/CAD',symbol:'USDCAD=X',kind:/\b(?:usd\s*\/?\s*cad)\b/i,flat:0.025,strong:0.25},
  {label:'AUD/USD',symbol:'AUDUSD=X',kind:/\b(?:aud\s*\/?\s*usd)\b/i,flat:0.025,strong:0.25},
  {label:'USD Index',symbol:'DX-Y.NYB',kind:/\b(?:dxy|usd index|us dollar index|dollar index)\b/i,flat:0.04,strong:0.25},
  {label:'WTI Futures',symbol:'CL=F',kind:/\b(?:wti|west texas intermediate|nymex crude)\b/i,flat:0.1,strong:1.0},
  {label:'Brent Futures',symbol:'BZ=F',kind:/\b(?:brent crude|brent oil|brent futures)\b/i,flat:0.1,strong:1.0},
  {label:'Bitcoin',symbol:'BTC-USD',kind:/\b(?:bitcoin|btc)\b/i,flat:0.1,strong:1.5},
  {label:'Ethereum',symbol:'ETH-USD',kind:/\b(?:ethereum|ether|eth)\b/i,flat:0.1,strong:1.5}
];
const WINDOW_MINUTES = 30;
const MAX_LAG = 12 * 60 * 1000;
const cache = new Map();
const TTL = 60 * 1000;

function observation(candles, publishedMs, instrument) {
  // Baseline is the last actual 5-minute close no more than 12 minutes before publication.
  const base = [...candles].reverse().find(c=>c.t<=publishedMs && c.t>=publishedMs-MAX_LAG);
  // End is first actual close 30-42 minutes after publication.
  const targetTime = publishedMs + WINDOW_MINUTES * 60000;
  const end = candles.find(c=>c.t>=targetTime && c.t<=targetTime+MAX_LAG);
  if (!base || !end || base.t===end.t || !Number.isFinite(base.v) || !Number.isFinite(end.v) || base.v<=0 || end.v<=0) return null;
  const change = (end.v-base.v)/base.v * 100;
  const abs=Math.abs(change);
  const sentiment = abs<instrument.flat?'Neutral':change>=instrument.strong?'Strong Positive':
    change>0?'Positive':change<=-instrument.strong?'Strong Negative':'Negative';
  return {
    instrument:instrument.label, symbol:instrument.symbol,
    sentiment, changePercent:Number(change.toFixed(3)),
    priceBefore:base.v, priceAfter:end.v,
    beforeTime:new Date(base.t).toISOString(), afterTime:new Date(end.t).toISOString(),
    thresholdStrongPercent:instrument.strong, thresholdNeutralBelowPercent:instrument.flat,
    source:'Yahoo Finance', windowMinutes:WINDOW_MINUTES
  };
}

async function getCandles(instrument) {
  const key=instrument.symbol, prev=cache.get(key);
  if (prev && Date.now()-prev.at<TTL) return prev.candles;
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),6000);
  try{
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(key)+'?interval=5m&range=5d';
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}});
    if(!response.ok)throw new Error('Market data source unavailable');
    const payload=await response.json();
    const ch=payload && payload.chart && payload.chart.result && payload.chart.result[0];
    const stamps=ch && ch.timestamp, values=ch && ch.indicators && ch.indicators.quote && ch.indicators.quote[0] && ch.indicators.quote[0].close;
    if(!Array.isArray(stamps)||!Array.isArray(values))throw new Error('No price candles');
    const candles=stamps.map((t,i)=>({t:t*1000,v:values[i]}))
      .filter(c=>Number.isFinite(c.t)&&Number.isFinite(c.v)&&c.v>0).sort((a,b)=>a.t-b.t);
    if(!candles.length)throw new Error('Empty price candles');
    cache.set(key,{at:Date.now(),candles});
    return candles;
  }finally{clearTimeout(timer);}
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method && req.method!=='GET')return res.status(405).json({success:false,status:'unavailable'});
  const title=String((req.query||{}).title||'').slice(0,350);
  const publishedAt=String((req.query||{}).at||'');
  const publishedMs=Date.parse(publishedAt);
  const base={success:true,publishedAt:Number.isFinite(publishedMs)?new Date(publishedMs).toISOString():null,
    disclaimer:'Measured price movement after publication is not proof that this news caused it.'};
  if(!Number.isFinite(publishedMs)||publishedMs>Date.now()+300000||Date.now()-publishedMs>5*86400000)
    return res.status(200).json({...base,status:'unavailable',reason:'Publication time missing or outside available intraday history',observations:[]});
  const matches=INSTRUMENTS.filter(i=>i.kind.test(title)).slice(0,3);
  if(!matches.length)return res.status(200).json({...base,status:'not_applicable',
    reason:'Headline does not directly name a supported tradable instrument',observations:[]});
  if(Date.now()<publishedMs+42*60000)return res.status(200).json({...base,status:'pending',
    reason:'Waiting for the full 30-minute observation window',instruments:matches.map(i=>i.label),observations:[]});
  const observations=(await Promise.all(matches.map(async i=>{
    try{return observation(await getCandles(i),publishedMs,i);}catch{return null;}
  }))).filter(Boolean);
  if(!observations.length)return res.status(200).json({...base,status:'unavailable',
    reason:'No reliable candles around this publication time (market may have been closed)',observations:[]});
  return res.status(200).json({...base,status:'observed',windowMinutes:WINDOW_MINUTES,observations});
};
