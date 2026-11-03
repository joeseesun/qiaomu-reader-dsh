import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createHostEbookLibrary, credentialStore, ebookTransport, ebookCredentialDirectory } from '../src/host/ebook-library.js';
import { verifyEbook } from '../src/host/ebook-protocol.js';
import { STARTER_BOOKS } from '../media/starter-books.js';
import { hostHarness } from './host-harness.mjs';
const id='a'.repeat(32),jobId='b'.repeat(32),code='QM-'+'A'.repeat(32);
const bytes=Buffer.from(STARTER_BOOKS[0].data,'base64');
const result={filename:'Book.epub',format:'epub',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const token={accessToken:'access-'.padEnd(40,'a'),refreshToken:'refresh-'.padEnd(40,'b'),expiresAt:Date.now()/1000+3600};
const profile={dailyLimit:10,usedToday:2,expiresAt:Date.now()/1000+86400};
function fixture(route,options={}){
 const saved=new Map(),calls=[],records=[];
 const request=async input=>{calls.push(input);const url=input.url;if(url.endsWith('/activate')||url.endsWith('/refresh'))return {status:200,json:token};if(url.endsWith('/me'))return {status:200,json:profile};if(route){const value=await route(input);if(value)return value;}if(url.endsWith('/search'))return {status:200,json:{results:[{id,title:'Selected edition',author:'Author',format:'epub',year:'2026',size_str:'1 MB',sourceId:'edition-1'}]}};if(url.endsWith('/jobs'))return {status:200,json:input.method==='GET'?{jobs:[{id:jobId,state:'complete',availableUntil:Date.now()/1000+3600,result}]}:{id:jobId,state:'complete',result}};if(url.endsWith('/file'))return {status:200,arrayBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};if(url.endsWith('/jobs/'+jobId))return {status:200,json:{id:jobId,state:'complete',result}};return {status:200,json:{}};};
 const config={store:{load:key=>saved.get(key),save:(key,value)=>saved.set(key,structuredClone(value))},request,library:async()=>records,importer:async file=>{const book={id:'local-book',...file.bookMetadata,qiaomuJobs:[file.bookJobId]};records.push(book);return book;},delay:async()=>{},...options};
 const service=createHostEbookLibrary(config);return {service,saved,calls,records,config};
}
async function activate(f){await f.service.action({action:'activate',code});}
async function finish(service){const deadline=Date.now()+5000;while(Date.now()<deadline){const value=await service.action({action:'status'});if(!value.active)return value;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('download did not finish');}
test('service state is really validated; no activation code or token crosses Remote or shareable state',async()=>{
 const f=fixture();assert.deepEqual(await f.service.action({action:'profile'}),{profile:null});await activate(f);
 const value=await f.service.action({action:'profile'});assert.deepEqual(value,{profile});assert(!JSON.stringify(value).includes('Token'));assert(!JSON.stringify(f.saved.get('state')).includes(code));assert(!JSON.stringify(f.saved.get('state')).includes('refresh-'));assert(f.saved.get('secret').includes('refresh-'));
 f.config.request=async()=>{};f.service.dispose();
 const expired=fixture(input=>input.url.endsWith('/search')?{status:403,json:{error:'inactive'}}:null);await activate(expired);await assert.rejects(expired.service.action({action:'search',query:'Book'}),{code:'inactive'});
});
test('activation retry keeps one installation identity after private credential save failure',async()=>{
 const f=fixture();const save=f.config.store.save;let fail=true;f.config.store.save=(key,value)=>{if(key==='secret'&&fail)throw Error('disk');save(key,value);};
 await assert.rejects(activate(f),{code:'save'});fail=false;await activate(f);const identities=f.calls.filter(x=>x.url.endsWith('/activate')).map(x=>JSON.parse(x.body).installationId);assert.equal(identities.length,2);assert.equal(identities[0],identities[1]);
});
test('download validates chosen edition, imports only once and preserves restart receipts',async()=>{
 const f=fixture();await activate(f);await f.service.action({action:'search',query:'Book'});await f.service.action({action:'start',candidateId:id});const value=await finish(f.service);assert.equal(value.stage,'imported');assert.equal(f.records.length,1);assert.equal(f.records[0].title,'Selected edition');assert.equal(f.records[0].source,'qiaomu');assert.equal(f.records[0].sourceId,'edition-1');assert.deepEqual(f.records[0].qiaomuJobs,[jobId]);
 assert.equal((await f.service.action({action:'start',candidateId:id})).stage,'imported');assert.equal(f.records.length,1);
 const restarted=createHostEbookLibrary(f.config);assert.deepEqual((await restarted.action({action:'jobs'})).jobs,[]);await restarted.action({action:'start',jobId});assert.equal((await finish(restarted)).error,'already-imported');assert.equal(f.records.length,1);
});
test('unsupported editions stay visible but cannot start a download',async()=>{
 const f=fixture(input=>input.url.endsWith('/search')?{status:200,json:{results:[{id,title:'Mobi edition',format:'mobi'}]}}:null);await activate(f);const value=await f.service.action({action:'search',query:'Book'});assert.equal(value.results[0].readable,false);await assert.rejects(f.service.action({action:'start',candidateId:id}),{code:'unsupported-format'});assert(!f.calls.some(x=>x.url.endsWith('/jobs')));
});
test('failed import keeps server job available for retry without redownloading a new job',async()=>{
 let fail=true;const f=fixture(null,{importer:async file=>{if(fail)throw Error('disk');const book={id:'local',qiaomuJobs:[file.bookJobId]};f.records.push(book);return book;}});await activate(f);await f.service.action({action:'search',query:'Book'});await f.service.action({action:'start',candidateId:id});assert.equal((await finish(f.service)).error,'import');assert.equal((await f.service.action({action:'jobs'})).jobs.length,1);assert(!f.saved.get('state').importedJobs?.length);
 fail=false;await f.service.action({action:'start',jobId});assert.equal((await finish(f.service)).stage,'imported');assert.equal(f.calls.filter(x=>x.url.endsWith('/jobs')&&x.method==='POST').length,1);
});
test('cancel aborts network and never imports or records a receipt',async()=>{
 let begin;const started=new Promise(resolve=>begin=resolve);const f=fixture(async input=>{if(input.url.endsWith('/file')){begin();return new Promise((_resolve,reject)=>input.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));}});await activate(f);await f.service.action({action:'search',query:'Book'});await f.service.action({action:'start',candidateId:id});await started;await f.service.action({action:'cancel'});assert.equal((await finish(f.service)).stage,'cancelled');assert.equal(f.records.length,0);assert(!f.saved.get('state').importedJobs?.length);
});
test('ambiguous create-job failure retries the same request ID',async()=>{
 let attempt=0;const f=fixture(input=>{if(input.url.endsWith('/jobs')&&input.method==='POST'&&attempt++===0)throw Error('lost response');});await activate(f);await f.service.action({action:'search',query:'Book'});await f.service.action({action:'start',candidateId:id});assert.equal((await finish(f.service)).error,'network');await f.service.action({action:'start',candidateId:id});await finish(f.service);const requests=f.calls.filter(x=>x.url.endsWith('/jobs')&&x.method==='POST').map(x=>JSON.parse(x.body).requestId);assert.equal(requests[0],requests[1]);
});
test('file validation rejects HTML, corrupt checksums, sizes and path traversal',async()=>{
 const array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);
 for(const change of [{filename:'../Book.epub'},{sha256:'0'.repeat(64)},{bytes:bytes.length+1},{format:'exe'}])await assert.rejects(verifyEbook(array,{...result,...change}),{code:'file'});
 const html=new TextEncoder().encode('<html>Login error</html>');await assert.rejects(verifyEbook(html.buffer,{...result,bytes:html.length}),{code:'file'});
});
test('transport rejects redirects, oversized responses and propagates cancellation',async()=>{
 let options;const transport=ebookTransport(async(_url,input)=>{options=input;return new Response('x',{status:200,headers:{'content-length':String(33*1024*1024)}});});await assert.rejects(transport({url:'https://ebook-mcp.qiaomu.ai/reader/api/jobs/'+jobId+'/file'}),{code:'file'});assert.equal(options.redirect,'error');assert(options.signal);await assert.rejects(transport({url:'https://attacker.example/file'}),{code:'network'});
});
test('Host private files have owner-only permissions and remain outside book export directory',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'qmr-credentials-'));try{const directory=ebookCredentialDirectory(path.join(root,'books'),path.join(root,'home'));const store=credentialStore(directory);store.save('state',{installationId:'id'});store.save('secret','refresh-token');assert.equal((await stat(directory)).mode&0o777,0o700);for(const file of await readdir(directory))assert.equal((await stat(path.join(directory,file))).mode&0o777,0o600);assert(!directory.startsWith(path.join(root,'books')));assert.equal(store.load('secret'),'refresh-token');}finally{await rm(root,{recursive:true,force:true});}
});
test('actual Host API writes validated EPUB, metadata and receipt then reads it after restart',async()=>{
 const host=await hostHarness();const oldFetch=globalThis.fetch,oldHome=process.env.DSH_HOME;process.env.DSH_HOME=path.join(host.root,'private');
 const f=fixture();globalThis.fetch=async(url,options)=>{const value=await f.config.request({url,method:options.method,headers:options.headers,body:options.body,signal:options.signal});return new Response(value.arrayBuffer||JSON.stringify(value.json),{status:value.status});};
 try{assert(!(await host.api.ebookAction({action:'activate',code})).error);await host.api.ebookAction({action:'search',query:'Book'});await host.api.ebookAction({action:'start',candidateId:id});let value;for(let n=0;n<100;n++){value=await host.api.ebookAction({action:'status'});if(!value.active)break;await new Promise(resolve=>setTimeout(resolve,5));}assert.equal(value.stage,'imported');const library=await host.restart().library();const book=library.books[0];assert.equal(book.source,'qiaomu');assert.deepEqual(book.qiaomuJobs,[jobId]);assert.equal(book.cover,STARTER_BOOKS[0].cover);assert.deepEqual(await readFile(path.join(host.root,'乔木阅读',book.file)),bytes);assert.equal((await host.api.ebookAction({action:'jobs'})).jobs.length,0);}finally{globalThis.fetch=oldFetch;if(oldHome===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=oldHome;await host.cleanup();}
});
test('concurrent expired access shares one rotating refresh and quota errors do not import',async()=>{
 let refreshes=0;const f=fixture();await activate(f);const original=f.config.request;
 // Recreate with the same private identity but no in-memory access token.
 const restarted=createHostEbookLibrary({...f.config,request:async input=>{if(input.url.endsWith('/refresh')){refreshes++;await new Promise(resolve=>setImmediate(resolve));}return original(input);}});
 await Promise.all([restarted.action({action:'search',query:'A'}),restarted.action({action:'search',query:'B'})]);assert.equal(refreshes,1);
 const quota=fixture(input=>input.url.endsWith('/jobs')&&input.method==='POST'?{status:403,json:{error:'quota'}}:null);await activate(quota);await quota.service.action({action:'search',query:'Book'});await quota.service.action({action:'start',candidateId:id});assert.equal((await finish(quota.service)).error,'quota');assert.equal(quota.records.length,0);
});
test('reference covers only accept fixed work attribution and do not replace the chosen edition',async()=>{
 const cover={url:'https://covers.openlibrary.org/b/id/10527843-M.jpg?default=false',sourceUrl:'https://openlibrary.org/works/OL138052W',source:'Open Library',match:'work'};
 const f=fixture(input=>input.url.endsWith('/covers')?{status:200,json:{results:[{id,cover},{id:'c'.repeat(32),cover}]}}:null);await activate(f);await f.service.action({action:'search',query:'Book'});const values=await f.service.action({action:'covers',ids:[id,'c'.repeat(32)]});assert.deepEqual(values.results,[{id,cover,pending:false}]);await f.service.action({action:'start',candidateId:id});await finish(f.service);assert.equal(f.records[0].title,'Selected edition');assert.equal(JSON.parse(f.calls.find(x=>x.url.endsWith('/jobs')&&x.method==='POST').body).candidateId,id);
});
test('simultaneous start requests cannot replace an in-flight operation',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let block=false;const f=fixture(null,{library:async()=>{if(block)await gate;return [];}});await activate(f);await f.service.action({action:'search',query:'Book'});block=true;const first=f.service.action({action:'start',candidateId:id});await assert.rejects(f.service.action({action:'start',candidateId:id}),{code:'busy'});release();await first;assert.equal((await finish(f.service)).stage,'imported');assert.equal(f.calls.filter(x=>x.url.endsWith('/jobs')&&x.method==='POST').length,1);
});
test('downloading bytes already in the library reuses the file and adds Qiaomu ownership without losing state',async()=>{
 const host=await hostHarness();const oldFetch=globalThis.fetch,oldHome=process.env.DSH_HOME;process.env.DSH_HOME=path.join(host.root,'private');const f=fixture();globalThis.fetch=async(url,options)=>{const value=await f.config.request({url,method:options.method,headers:options.headers,body:options.body,signal:options.signal});return new Response(value.arrayBuffer||JSON.stringify(value.json),{status:value.status});};
 try{const {book}=await host.api.import({filename:'existing.epub',base64:bytes.toString('base64'),source:'upload'});await host.api.saveState(book.id,{locator:{chapterIndex:1,scroll:.4},highlights:[{id:'h',text:'keep'}]});const before=await host.api.loadState(book.id);await host.api.ebookAction({action:'activate',code});await host.api.ebookAction({action:'search',query:'Book'});await host.api.ebookAction({action:'start',candidateId:id});let value;for(let n=0;n<100;n++){value=await host.api.ebookAction({action:'status'});if(!value.active)break;await new Promise(resolve=>setTimeout(resolve,5));}assert.equal(value.stage,'imported');const library=await host.api.library();assert.equal(library.books.length,1);assert.equal(library.books[0].id,book.id);assert.equal(library.books[0].source,'qiaomu');assert.equal(library.books[0].sourceId,'edition-1');assert.deepEqual(await host.api.loadState(book.id),before);const next=await host.api.ebookAction({action:'search',query:'Book'});assert.equal(next.results[0].ownedId,book.id);}finally{globalThis.fetch=oldFetch;if(oldHome===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=oldHome;await host.cleanup();}
});
test('background imports and foreground progress share one index transaction queue',async()=>{
 const host=await hostHarness();try{const {book}=await host.api.import({filename:'existing.txt',base64:Buffer.from('Original book').toString('base64')});await Promise.all([host.api.saveState(book.id,{locator:{scroll:.4},highlights:[]}),...Array.from({length:6},(_,n)=>host.api.import({filename:`new-${n}.txt`,base64:Buffer.from('New book '+n).toString('base64')}))]);const library=await host.restart().library();assert.equal(library.books.length,7);assert.equal(library.books.find(b=>b.id===book.id).readProgress,.4);assert.equal((await host.api.loadState(book.id)).locator.scroll,.4);}finally{await host.cleanup();}
});
