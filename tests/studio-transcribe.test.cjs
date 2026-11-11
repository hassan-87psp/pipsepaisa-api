'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const raw=fs.readFileSync(path.join(__dirname,'../api/studio-transcribe.js'),'utf8')
  .replace('export const maxDuration = 60;','const maxDuration = 60;')
  .replace('export default async function handler(req,res)','async function handler(req,res)');
const user='44c2cc1a-5961-49b7-b1ad-b634f73a33b9';
const media=user+'/audio-2026-11-12T11-55-00Z-abc12345.webm';
function server(fetcher,env={GROQ_API_KEY:'test-secret'}){
 return new Function('process','fetch',raw+'; return handler')({env},fetcher);
}
async function hit(handler,method='POST',headers={},body={}){
 const reply={code:200,headers:{},payload:null,
 setHeader(k,v){this.headers[k]=v;return this},
 status(n){this.code=n;return this},
 json(v){this.payload=v;return this},
 end(){return this}};
 await handler({method,headers:{origin:'https://www.pipsepaisa.com',...headers},body},reply);
 return reply;
}
const forbiddenFetch=()=>{throw Error('Unauthorized request must not access external services')};
test('rejects untrusted origins before any provider call',async()=>{
 const r=await hit(server(forbiddenFetch),'POST',{origin:'https://evil.example'});
 assert.equal(r.code,403);assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);
});
test('rejects wrong method and missing bearer',async()=>{
 assert.equal((await hit(server(forbiddenFetch),'GET')).code,405);
 assert.equal((await hit(server(forbiddenFetch),'POST')).code,401);
});
test('rejects invalid JWT before processing media',async()=>{
 const r=await hit(server(async()=>({ok:false,status:401})),'POST',{authorization:'Bearer invalid'});
 assert.equal(r.code,403);
});
function mockProvider({role='approver',limit=true,withoutAudio=false}={}){
 return async function(url,opts={}){
  if(url.endsWith('/auth/v1/user'))return {ok:true,async json(){return{id:user}}};
  if(url.includes('/rpc/psp_content_permission_v1'))return {ok:true,async json(){return role}};
  if(url.includes('/rpc/psp_ai_rate_limit_v475'))return {ok:true,async json(){return limit}};
  if(url.includes('/storage/v1/object/authenticated/'))return {ok:true,status:200,
   headers:new Headers({'content-type':'audio/webm','content-length':'3'}),
   async arrayBuffer(){return new Uint8Array([1,2,3]).buffer}};
  if(url.includes('/audio/transcriptions')){
   if(withoutAudio)throw Error('Must not reach Groq');
   assert.equal(opts.body.get('model'),'whisper-large-v3-turbo');
   assert.equal(opts.body.get('response_format'),'verbose_json');
   assert.ok(opts.body.get('file') instanceof Blob);
   return {ok:true,async json(){return {text:'Gold update',segments:[{start:0,end:2.1,text:'Gold update'}]}}};
  }
  throw Error('Unexpected external request: '+url);
 };
}
test('denies a user without an individual Creator grant',async()=>{
 const r=await hit(server(mockProvider({role:null,withoutAudio:true})),'POST',{authorization:'Bearer token'},{path:media});
 assert.equal(r.code,403);
});
test('rejects cross-user and malformed recording paths',async()=>{
 const h=server(mockProvider({withoutAudio:true}));
 let r=await hit(h,'POST',{authorization:'Bearer token'},{path:media.replace(user,'11111111-1111-1111-1111-111111111111')});
 assert.equal(r.code,403);
 r=await hit(h,'POST',{authorization:'Bearer token'},{path:user+'/../private.webm'});
 assert.equal(r.code,400);
});
test('enforces per-user AI rate limits',async()=>{
 const r=await hit(server(mockProvider({limit:false,withoutAudio:true})),'POST',{authorization:'Bearer token'},{path:media});
 assert.equal(r.code,429);
});
test('returns timestamped transcription for authorized private recording',async()=>{
 const r=await hit(server(mockProvider()),'POST',{authorization:'Bearer token'},{path:media});
 assert.equal(r.code,200);
 assert.equal(r.payload.ok,true);
 assert.equal(r.payload.text,'Gold update');
 assert.deepEqual(r.payload.segments,[{start:0,end:2.1,text:'Gold update'}]);
});
