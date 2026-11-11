// PipSePaisa Content Studio — authenticated private audio/video transcription.
// Does not accept raw media uploads. Only an explicitly authorized user's
// own file in the private Supabase bucket can be processed.
// Existing Vercel GROQ_API_KEY stays server-side; never expose it to the client.
export const maxDuration = 60;
const BASE='https://etfolhinohgmskbfjoyh.supabase.co';
const PUB=process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_LgmfuH2ePiY8fxNGs7nTTA_FSS_oPBw';
const BUCKET='psp-studio-recordings';
const ALLOW=new Set(['https://pipsepaisa.com','https://www.pipsepaisa.com','https://hassan-87psp.github.io']);
const MAX_BYTES=20*1024*1024;
function setup(req,res){
 const origin=String(req.headers.origin||'');
 if(ALLOW.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 return !origin||ALLOW.has(origin);
}
function reply(res,status,data){return res.status(status).json(data)}
async function authorized(header){
 const headers={'apikey':PUB,'Authorization':header,'Content-Type':'application/json'};
 const check=await fetch(BASE+'/auth/v1/user',{headers,signal:AbortSignal.timeout(12000)});
 if(!check.ok)return null;
 const user=await check.json();
 if(!user?.id)return null;
 const perm=await fetch(BASE+'/rest/v1/rpc/psp_content_permission_v1',{
  method:'POST',headers,body:'{}',signal:AbortSignal.timeout(12000)
 });
 if(!perm.ok)return null;
 const level=await perm.json();
 if(!['creator','editor','approver'].includes(level))return null;
 return {id:String(user.id),headers};
}
async function allowance(headers){
 const r=await fetch(BASE+'/rest/v1/rpc/psp_ai_rate_limit_v475',{
  method:'POST',headers,body:'{}',signal:AbortSignal.timeout(12000)
 });
 return r.ok&&(await r.json())===true;
}
export default async function handler(req,res){
 const corsOk=setup(req,res);
 if(req.method==='OPTIONS')return corsOk?res.status(204).end():res.status(403).end();
 if(!corsOk)return reply(res,403,{error:'Origin not allowed'});
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 const length=Number(req.headers['content-length']||0);
 if(length>4096)return reply(res,413,{error:'Request too large'});
 const header=String(req.headers.authorization||'');
 if(!/^Bearer\s+\S+$/i.test(header))return reply(res,401,{error:'Sign in required'});
 try{
  const session=await authorized(header);
  if(!session)return reply(res,403,{error:'Content Studio creator permission required'});
  const groq=process.env.GROQ_API_KEY;
  if(!groq)return reply(res,503,{error:'AI transcription is not configured on the server'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const file=String(body.path||'');
  if(file.length>230||!/^[0-9a-f-]{36}\/(?:audio|video)-[0-9A-Za-z._-]{10,190}\.(?:webm|mp4|mp3)$/.test(file))
   return reply(res,400,{error:'Invalid private recording path'});
  if(!file.startsWith(session.id+'/'))return reply(res,403,{error:'Recording belongs to a different account'});
  const language=['en','ur'].includes(body.language)?body.language:null;
  if(!(await allowance(session.headers)))return reply(res,429,{error:'AI usage limit reached. Try again later'});
  const name=file.substring(file.indexOf('/')+1);
  const path=file.split('/').map(encodeURIComponent).join('/');
  const fileResponse=await fetch(BASE+'/storage/v1/object/authenticated/'+BUCKET+'/'+path,{
   headers:{apikey:PUB,Authorization:header},signal:AbortSignal.timeout(18000)
  });
  if(!fileResponse.ok)return reply(res,fileResponse.status===404?404:403,{error:'Could not read your private recording'});
  const declared=Number(fileResponse.headers.get('content-length')||0);
  if(declared>MAX_BYTES)return reply(res,413,{error:'Recording is too large (20 MB maximum)'});
  const bytes=await fileResponse.arrayBuffer();
  if(bytes.byteLength===0||bytes.byteLength>MAX_BYTES)return reply(res,413,{error:'Recording must be between 1 byte and 20 MB'});
  const mime=(fileResponse.headers.get('content-type')||'').split(';')[0];
  const contentType=['audio/webm','audio/mp4','audio/mpeg','video/webm','video/mp4'].includes(mime)?mime:name.endsWith('.mp4')?'video/mp4':name.endsWith('.mp3')?'audio/mpeg':'audio/webm';
  const form=new FormData();
  form.append('file',new Blob([bytes],{type:contentType}),name);
  form.append('model','whisper-large-v3-turbo');
  form.append('response_format','verbose_json');
  form.append('timestamp_granularities[]','segment');
  form.append('temperature','0');
  form.append('prompt','PipSePaisa, XAUUSD, Forex, BTCUSD, CPI, FOMC, NFP.');
  if(language)form.append('language',language);
  const transcription=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
   method:'POST',headers:{Authorization:'Bearer '+groq},body:form,
   signal:AbortSignal.timeout(50000)
  });
  if(!transcription.ok)return reply(res,transcription.status===429?429:503,{error:transcription.status===429?'Transcription limit reached':'AI transcription temporarily unavailable'});
  const result=await transcription.json();
  const text=String(result.text||'').slice(0,30000);
  const segments=Array.isArray(result.segments)?result.segments.slice(0,600).map(s=>({
   start:Math.max(0,Number(s.start)||0),
   end:Math.max(0,Number(s.end)||0),
   text:String(s.text||'').trim().slice(0,500)
  })).filter(s=>s.text&&s.end>s.start):[];
  if(!text.trim())return reply(res,503,{error:'No speech was detected in this recording'});
  return reply(res,200,{ok:true,text,segments,provider:'groq-whisper',requires_review:true,
   note:'Transcription and segment times may contain errors. Review before publishing.'});
 }catch(e){
  return reply(res,503,{error:'Could not transcribe recording at this time'});
 }
}
