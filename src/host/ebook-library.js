/** Host-only optional Qiaomu service. Credentials are never returned over Remote. */
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, renameSync, lstatSync, chmodSync } from 'node:fs';
import { createEbookLibrary, EBOOK_API, ebookError } from './ebook-protocol.js';
import { bookMetadata, matchBook } from '../core/book-metadata.js';
export const READABLE_EBOOK_FORMATS = ['epub', 'pdf', 'txt'];
const idPattern = /^[a-f0-9]{32}$/;
const knownErrors = new Set(['cancelled','invalid-code','invalid-device','unauthorized','inactive','device-revoked','device-limit','quota','save','file','busy','pending','search-expired','file-expired','file-missing','import','already-imported','download-failed','service-restarted','network','service','invalid-query','unsupported-format']);
export const safeEbookError = cause => knownErrors.has(cause?.code) ? cause.code : 'service';
export function ebookCredentialDirectory(libraryRoot, home = process.env.DSH_HOME || path.join(homedir(), '.dsh')) {
  return path.join(home, 'credentials', 'qiaomu-reader', createHash('sha256').update(path.resolve(libraryRoot)).digest('hex').slice(0,32));
}
/** Atomic mode-0600 files in an owner-only directory, outside the shareable library. */
export function credentialStore(directory) {
  const prepare = () => {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (lstatSync(directory).isSymbolicLink()) throw ebookError('save');
    chmodSync(directory, 0o700);
  };
  const target = key => path.join(directory, key === 'secret' ? 'refresh.json' : 'installation.json');
  const load = key => {
    try { const file = target(key); if (lstatSync(file).isSymbolicLink()) throw ebookError('save'); chmodSync(file, 0o600); return JSON.parse(readFileSync(file,'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw ebookError('save'); }
  };
  const save = (key, value) => {
    try {
      prepare(); const file = target(key); let previous;
      try { previous = lstatSync(file); } catch (error) { if(error.code !== 'ENOENT') throw error; }
      if (previous?.isSymbolicLink()) throw ebookError('save');
      const temp = path.join(directory, '.'+randomUUID()+'.tmp');
      writeFileSync(temp, JSON.stringify(value), { mode:0o600, flag:'wx' }); renameSync(temp,file); chmodSync(file,0o600);
    } catch { throw ebookError('save'); }
  };
  return { load, save };
}
/** Fixed-origin, bounded, cancellable transport; never logs server bodies or credentials. */
export function ebookTransport(fetcher = globalThis.fetch) {
  return async ({ url, method, headers, body, signal }) => {
    if (!url.startsWith(EBOOK_API+'/') || new URL(url).origin !== new URL(EBOOK_API).origin) throw ebookError('network');
    const active = AbortSignal.any([AbortSignal.timeout(45000), ...(signal ? [signal] : [])]);
    try {
      const response = await fetcher(url, { method, headers, body, signal:active, redirect:'error' });
      const limit = /\/file$/.test(url) && response.ok ? 32*1024*1024 : 1024*1024;
      if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw ebookError('file'); }
      const chunks=[];let size=0;const reader=response.body?.getReader();
      if (reader) { try { while(true) { const value=await reader.read(); if(value.done) break;size+=value.value.byteLength;if(size>limit) throw ebookError('file');chunks.push(value.value); } } finally { await reader.cancel().catch(()=>{}); } }
      const bytes=Buffer.concat(chunks,size), arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      let json=null; if(!/\/file$/.test(url)||!response.ok) { try { json=JSON.parse(bytes.toString('utf8')); } catch { if(response.ok) throw ebookError('service'); } }
      return { status:response.status, json, arrayBuffer };
    } catch (error) { if(signal?.aborted) throw ebookError('cancelled'); if(error?.code==='file'||error?.code==='service') throw error; throw ebookError('network'); }
  };
}
export function createHostEbookLibrary({ directory, deviceName='DeepSeek Harness', library, importer, request=ebookTransport(), store=credentialStore(directory), delay, now }) {
  let records=[], operation=null, aborter=null, disposed=false, starting=false;
  const candidates=new Map();
  const plugin={ app:{ loadLocalStorage:()=>store.load('state'), saveLocalStorage:(_key,value)=>store.save('state',value),
    secretStorage:{getSecret:()=>store.load('secret') || '',setSecret:(_key,value)=>store.save('secret',value)},vault:{getName:()=>deviceName} },
    bookRecords:{ hasJob:id=>records.some(book=>book.qiaomuJobs?.includes(id)) } };
  const service=createEbookLibrary(plugin, request, { ...(delay?{delay}:{}),...(now?{now}: {}) });
  const refreshRecords=async()=>{ records=await library(); };
  const profile=async()=>{
    const value=await service.profile();
    if (![value?.dailyLimit,value?.usedToday,value?.expiresAt].every(Number.isFinite)||value.dailyLimit<0||value.usedToday<0) throw ebookError('service');
    if(value.expiresAt*1000 <= (now?now():Date.now())) throw ebookError('inactive');
    return { dailyLimit:value.dailyLimit,usedToday:value.usedToday,expiresAt:value.expiresAt };
  };
  const owned=candidate=>matchBook({ ...candidate,source:'qiaomu',sourceId:candidate.sourceId||candidate.id },records)?.exact ? matchBook({...candidate,source:'qiaomu',sourceId:candidate.sourceId||candidate.id},records).record : null;
  const start=async input=>{
    if(starting||operation?.active) throw ebookError('busy');
    starting=true;
    try {
      await refreshRecords();
      const candidate=candidates.get(input.candidateId);
      if(!input.jobId&&!candidate) throw ebookError('search-expired');
      if(candidate&&!READABLE_EBOOK_FORMATS.includes(candidate.format)) throw ebookError('unsupported-format');
      const existing=candidate&&owned(candidate); if(existing&&!existing.removedAt) return {stage:'imported',book:existing,active:false};
      if(input.jobId&&!idPattern.test(input.jobId)) throw ebookError('file');
      aborter=new AbortController();const signal=aborter.signal;
      operation={ id:randomUUID(),stage:'queued',active:true,candidateId:candidate?.id||null,jobId:input.jobId||null };
      const current=operation;
      void service.download(candidate,async files=>{
        const file=files[0];if(!READABLE_EBOOK_FORMATS.includes(file.name.split('.').at(-1).toLowerCase())) throw ebookError('unsupported-format');
        current.stage='importing';current.jobId=file.bookJobId;
        try { current.book=await importer(file);await refreshRecords();return true; } catch { throw ebookError('import'); }
      },stage=>{current.stage=stage;},signal,input.jobId).then(()=>{current.stage='imported';},error=>{current.stage=safeEbookError(error)==='cancelled'?'cancelled':'error';current.error=safeEbookError(error);}).finally(()=>{current.active=false;});
      return {...current};
    } finally { starting=false; }
  };
  return {
    async action(input={}) {
      if(disposed) throw ebookError('cancelled');
      switch(input.action) {
        case 'profile': return service.isActivated()?{profile:await profile()}:{profile:null};
        case 'activate': await service.activate(input.code);return {profile:await profile()};
        case 'logout': if(operation?.active) throw ebookError('busy');await service.logout();return {profile:null};
        case 'search': {
          const rows=await service.search(input.query);await refreshRecords();candidates.clear();
          const results=rows.slice(0,100).map(row=>{
            const value={...bookMetadata(row),sourceId:row.sourceId||row.id,id:row.id,title:String(row.title).slice(0,1000),format:row.format,size_str:String(row.size_str||'').slice(0,40)};
            candidates.set(value.id,value);return {...value,readable:READABLE_EBOOK_FORMATS.includes(value.format),ownedId:owned(value)?.removedAt?null:owned(value)?.id||null};
          });return {results};
        }
        case 'covers': return {results:await service.covers((input.ids||[]).filter(id=>candidates.has(id)).map(id=>({id})))};
        case 'jobs': await refreshRecords();return {jobs:(await service.jobs()).slice(0,100).map(job=>({id:job.id,state:job.state,title:store.load('state')?.pendingBooks?.[job.id]?.title || String(job.result?.filename || '').slice(0,180)}))};
        case 'start': return start(input);
        case 'status': return operation?{...operation}:{active:false,stage:'idle'};
        case 'cancel': if(operation?.active&&operation.stage!=='importing') aborter?.abort();return operation?{...operation}:{active:false,stage:'idle'};
        default: throw ebookError('service');
      }
    },
    dispose() { disposed=true;plugin._unloading=true;aborter?.abort();service.dispose(); },
  };
}
