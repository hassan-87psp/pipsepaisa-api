(async function(){
 const urls=[
  'https://www.forexfactory.com/calendar?week=next',
  'https://www.forexfactory.com/calendar?week=nov8.2026'
 ];
 for(const url of urls){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{
    Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; PipSePaisaCalendar/1.0)'}});
   const html=await r.text();
   const row=html.match(/<tr\b[^>]*\bcalendar__row\b[^>]*>[\s\S]*?<\/tr>/i)?.[0]||'';
   const head=html.match(/Calendar Time Zone[^<]{0,180}/i)?.[0]||'';
   const impact=html.match(/<td\b[^>]*\bcalendar__impact\b[^>]*>[\s\S]{0,450}/i)?.[0]||'';
   const time=html.match(/<td\b[^>]*\bcalendar__time\b[^>]*>[\s\S]{0,450}/i)?.[0]||'';
   console.log('FF_HTML_DIAG '+JSON.stringify({url,status:r.status,bytes:html.length,
    title:html.match(/<title[^>]*>([\s\S]{0,200})<\/title>/i)?.[1]||'',
    rowCount:(html.match(/<tr\b[^>]*\bcalendar__row\b/gi)||[]).length,
    row:row.slice(0,5200),impact,time,head,
    sample:html.slice(0,280)}));
  }catch(e){console.log('FF_HTML_DIAG_ERROR '+String(e));}
 }
})();
