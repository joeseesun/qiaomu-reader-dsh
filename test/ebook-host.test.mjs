import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createEbookHost} from '../src/host/ebook-service.js';
import {hostHarness} from './host-harness.mjs';
const id='a'.repeat(32),code='QM-'+ 'A'.repeat(32);
const token={accessToken:'access-'+ 'a'.repeat(40),refreshToken:'refresh-'+ 'b'.repeat(50),expiresAt:Date.now()/1000+900};
async function request(host,action,args=[]){const {id}=await host.operation({action,args});for(let tries=0;tries<200;tries++){const value=await host.operation({action:'poll',id});if(value.failure)throw Object.assign(Error(value.failure.message),value.failure);if(value.state==='done')return value.value;await new Promise(r=>setTimeout(r,10));}throw Error('test timeout');}
test('Host ebook activation, verified EPUB import and restored receipt never expose tokens to clients',async()=>{
 const reader=await hostHarness(),secrets=new Map(),calls=[];let state={};
 const bytes=await readFile('test/fixtures/7337.epub');const result={filename:'测试书.epub',format:'epub',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 const options={loadState:async()=>structuredClone(state),saveState:async next=>{state=structuredClone(next);},credentials:{async get(k){return secrets.get(k)||'';},async set(k,v){secrets.set(k,v);}},importBook:input=>reader.api.import(input),requestImpl:async req=>{calls.push(req);if(req.url.endsWith('/activate')||req.url.endsWith('/refresh'))return {status:200,json:token};if(req.url.endsWith('/me'))return {status:200,json:{dailyLimit:10,usedToday:0,expiresAt:1800000000}};if(req.url.endsWith('/search'))return {status:200,json:{results:[{id,title:'中文书库测试',author:'测试作者',format:'epub'}]}};if(req.url.endsWith('/file'))return {status:200,arrayBuffer:Uint8Array.from(bytes).buffer};if(req.url.endsWith('/jobs')&&req.method==='GET')return {status:200,json:{jobs:[{id,state:'complete',availableUntil:Date.now()/1000+3600,result}]}};return {status:200,json:{id,state:'complete',result}};}};
 let host=createEbookHost(options);
 try{
  assert.equal(calls.length,0);assert.equal(await request(host,'isActivated'),false);assert.equal(calls.length,0);
  const profile=await request(host,'activate',[code]);assert.equal(profile.dailyLimit,10);
  const books=await request(host,'search',['中文']);assert.equal(books.length,1);
  assert.equal(await request(host,'download',[books[0]]),'测试书.epub');const library=await reader.api.library();assert.equal(library.books.length,1);assert.equal(library.books[0].sourceId,id);assert.equal(library.books[0].title,'中文书库测试');
  assert.ok(!JSON.stringify(state).includes('refresh-'));assert.ok(!JSON.stringify(profile).includes('access-'));assert.ok(!JSON.stringify(library).includes(code));assert.equal(state.importedJobs[0],id);
  host.dispose();host=createEbookHost(options);assert.equal(await request(host,'isActivated'),true);assert.deepEqual(await request(host,'jobs'),[]);await assert.rejects(request(host,'download',[null,id]),{code:'already-imported'});assert.equal((await reader.api.library()).books.length,1);
  await request(host,'logout');assert.equal(await request(host,'isActivated'),false);
 }finally{host.dispose();await reader.cleanup();}
});
test('Host cancellation and disposal abort in-flight network and prevent a late import',async()=>{
 let finish,seenSignal,imports=0;const host=createEbookHost({loadState:async()=>({installationId:'fixture',secretId:'fixture'}),saveState:async()=>{},credentials:{async get(){return JSON.stringify({refreshToken:token.refreshToken});},async set(){}},importBook:async()=>{imports++;},requestImpl:async req=>{if(req.url.endsWith('/refresh'))return {status:200,json:token};seenSignal=req.signal;return new Promise(resolve=>{finish=resolve;});}});
 const {id:job}=await host.operation({action:'search',args:['Book']});while(!finish)await new Promise(r=>setImmediate(r));await host.operation({action:'cancel',id:job});assert.equal(seenSignal.aborted,true);finish({status:200,json:{results:[]}});await new Promise(r=>setImmediate(r));await assert.rejects(host.operation({action:'poll',id:job}),/expired/);assert.equal(imports,0);host.dispose();await assert.rejects(host.operation({action:'isActivated'}),/closed/);
});
