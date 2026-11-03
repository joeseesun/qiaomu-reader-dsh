import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TTS_PROVIDERS, buildSpeechRequest, synthesizeHttp, ttsProfile } from '../src/core/tts-providers.js';
import { voiceChoices, changeSpeechModel } from '../src/core/tts-choices.js';
import { EdgeSpeechClient } from '../src/host/tts-edge-client.js';
import { macSpeechWav } from '../src/host/tts-macos.js';
const built=await build({entryPoints:['src/host/speech-service.js','src/host/tts-local.js'],bundle:true,write:false,outdir:'out',format:'cjs',platform:'node',loader:{'.py':'text'}});
const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),{runInNewContext}=await import('node:vm');
function moduleApi(name){const module={exports:{}};runInNewContext(built.outputFiles.find(f=>f.path.endsWith(name)).text,{module,exports:module.exports,require,process,Buffer,URL,AbortController,AbortSignal,TextEncoder,TextDecoder,Uint8Array,DataView,setTimeout,clearTimeout,fetch,Response,globalThis});return module.exports;}
const {createSpeechService,speechRequest}=moduleApi('speech-service.js'),localApi=moduleApi('tts-local.js');
const audioBytes=new Uint8Array([0xff,0xfb,1,2]);
function fixture(options={}){const stored=new Map(),calls=[];const local={status:async()=>({phase:'missing'}),install:async()=>{},cancelInstall(){},dispose(){},synthesize:async()=>({bytes:audioBytes,mime:'audio/wav'})};const service=createSpeechService({directory:'/unused',home:'/unused',files:{read:k=>stored.get(k),write:(k,v)=>stored.set(k,structuredClone(v))},localManager:local,request:async input=>{calls.push(input);return {status:200,headers:{'content-type':'audio/mpeg'},arrayBuffer:audioBytes.buffer};},...options});return {service,stored,calls,local};}
test('speech credentials persist only in Host-private key state, never in returned profiles',async()=>{
 const f=fixture();const value=await f.service.action({action:'save',provider:'openai',profile:{model:'tts-1',voice:'nova',baseUrl:'https://api.openai.com/v1',key:'ignored'},key:'unit-test-secret'});assert.equal(f.stored.get('keys').openai,'unit-test-secret');assert.equal(value.profiles.openai.hasKey,true);assert(!JSON.stringify(value).includes('unit-test-secret'));assert(!JSON.stringify(f.stored.get('profiles')).includes('unit-test-secret'));
 await f.service.audio({provider:'openai',text:'Hello',requestId:'one'});assert.equal(f.calls[0].headers.Authorization,'Bearer unit-test-secret');assert.equal((await f.service.action({action:'config'})).profiles.openai.hasKey,true);await f.service.action({action:'save',provider:'openai',profile:{model:'tts-1',voice:'nova'},clearKey:true});assert.equal((await f.service.action({action:'config'})).profiles.openai.hasKey,false);f.service.dispose();
});
test('every cloud provider retains its own request contract and custom models are allowed',()=>{
 for(const id of ['openai','compatible','qwen','doubao','minimax','siliconflow','elevenlabs','azure']){const profile={...ttsProfile({},id),...(id==='compatible'?{baseUrl:'http://127.0.0.1:9999/v1',model:'custom-model',voice:'custom-voice'}:{}),...(id==='azure'?{region:'eastasia'}:{})};const value=buildSpeechRequest(profile,'a < b & c','key');assert.equal(value.method,'POST');assert(value.body.includes(id==='azure'?'a &lt; b &amp; c':'a < b & c'));if(id==='azure')assert.equal(value.headers.Authorization,undefined);if(id==='doubao')assert.equal(value.headers['X-Api-Resource-Id'],'seed-tts-2.0');if(id==='elevenlabs')assert.equal(value.headers['xi-api-key'],'key');}
 assert.throws(()=>buildSpeechRequest({id:'compatible',baseUrl:'http://public.example',model:'m',voice:'v'},'text'),{code:'https'});assert.throws(()=>buildSpeechRequest(ttsProfile({},'openai'),'text'),{code:'key'});
});
test('provider JSON/NDJSON and signed Qwen audio decode without forwarding credentials',async()=>{
 const minimax=await synthesizeHttp(ttsProfile({},'minimax'),'Hello',{key:'k',request:async()=>({status:200,json:{base_resp:{status_code:0},data:{audio:'fffb0102'}}})});assert.deepEqual([...minimax.bytes],[255,251,1,2]);
 const doubao=await synthesizeHttp(ttsProfile({},'doubao'),'Hello',{key:'k',request:async()=>({status:200,text:JSON.stringify({code:0,data:'//sBAg=='})+'\n'+JSON.stringify({code:20000000})})});assert.deepEqual([...doubao.bytes],[255,251,1,2]);
 const calls=[];await synthesizeHttp(ttsProfile({},'qwen'),'Hello',{key:'private',request:async input=>{calls.push(input);return calls.length===1?{status:200,json:{output:{audio:{url:'http://sample.oss-cn-beijing.aliyuncs.com/a?signature=test'}}}}:{status:200,arrayBuffer:audioBytes.buffer,headers:{'content-type':'audio/wav'}};}});assert.equal(calls[1].headers,undefined);assert(calls[1].url.startsWith('https:'));for(const response of [{status:403},{status:200,arrayBuffer:new ArrayBuffer(0)},{status:200,arrayBuffer:audioBytes.buffer,headers:{'content-type':'text/html'}}])await assert.rejects(synthesizeHttp(ttsProfile({},'openai'),'x',{key:'k',request:async()=>response}));
});
test('Edge cooldown persists between requests and cancellation never changes identities or endpoints',async()=>{
 let now=0,calls=0;const client=new EdgeSpeechClient(async()=>{calls++;throw Object.assign(Error('http'),{code:'http',status:429,retryAfterMs:60000});},{now:()=>now,wait:async ms=>{now+=ms;},random:()=>0});await assert.rejects(client.synthesize('one','voice'),{status:429});await assert.rejects(client.synthesize('two','voice'),{status:429});assert.equal(calls,1);now=60001;await assert.rejects(client.synthesize('three','voice'));assert.equal(calls,2);
});
test('host cancellation aborts the exact synthesis request and cache excludes credentials',async()=>{
 let begin;const started=new Promise(r=>begin=r);const f=fixture({request:input=>{begin();return new Promise((_resolve,reject)=>input.signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})),{once:true}));}});await f.service.action({action:'save',provider:'compatible',profile:{baseUrl:'http://localhost:9000/v1',model:'m',voice:'v'}});const promise=f.service.audio({provider:'compatible',text:'Private book text',requestId:'cancel-me'});await started;await f.service.action({action:'cancel',requestId:'cancel-me'});assert((await promise).error);f.service.dispose();
 const cached=fixture();await cached.service.action({action:'save',provider:'openai',profile:{model:'tts-1',voice:'nova'},key:'k'});await cached.service.audio({provider:'openai',text:'one'});await cached.service.audio({provider:'openai',text:'one'});assert.equal(cached.calls.length,1);cached.service.dispose();
});
test('custom model changes clear incompatible model-scoped voices',()=>{
 const changed=changeSpeechModel({id:'siliconflow',model:'FunAudioLLM/CosyVoice2-0.5B',voice:'FunAudioLLM/CosyVoice2-0.5B:alex'},'unknown-model');assert.equal(changed.voice,'');assert(voiceChoices({id:'openai',model:'tts-1'}).some(v=>v.id==='alloy'));
});
test('local model installer uses fixed runtime assets and refuses a library or symlink destination',async()=>{
 assert.equal(localApi.uvAssetName('darwin','arm64'),'uv-aarch64-apple-darwin.tar.gz');assert.equal(localApi.uvAssetName('win32','x64'),'uv-x86_64-pc-windows-msvc.zip');assert.throws(()=>localApi.uvAssetName('linux','ia32'),{code:'localPlatform'});assert.throws(()=>localApi.uvTarBinary(Buffer.alloc(512)),{code:'localArchive'});
 const root=await mkdtemp(path.join(tmpdir(),'qmr-local-model-test-'));try{const library=path.join(root,'library');await mkdir(library);await symlink(library,path.join(root,'link'));for(const target of [path.join(library,'models'),path.join(root,'link','models')]){const manager=localApi.createLocalTtsManager({root:target,cacheRoot:path.join(root,'cache'),vaultPaths:[library]});await assert.rejects(manager.initialize(),{code:'localPath'});}const manager=localApi.createLocalTtsManager({root:path.join(root,'data'),cacheRoot:path.join(root,'cache'),vaultPaths:[library]});assert.equal((await manager.status('kokoro')).phase,'missing');manager.dispose();}finally{await rm(root,{recursive:true,force:true});}
});
test('speech HTTP transport bounds declared audio and never follows redirects',async()=>{
 let options;const request=speechRequest(async(_url,input)=>{options=input;return new Response('x',{status:200,headers:{'content-length':String(17*1024*1024)}});});await assert.rejects(request({url:'https://api.example/audio'}),{code:'response'});assert.equal(options.redirect,'error');
});
