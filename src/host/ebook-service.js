import {randomUUID} from 'node:crypto';
import {createEbookLibrary} from '../original/ebook-library.js';
import {boundedHttpRequest} from './network.js';
import {CredentialStore} from './credential-store.js';
export function createEbookHost({loadState,saveState,importBook,credentials=new CredentialStore(),requestImpl}){
 let state,loading,disposed=false,service;const jobs=new Map();
 const init=()=>loading ||= (async()=>{state=await loadState()||{};const plugin={settings:{},app:{vault:{getName:()=> 'Qiaomu Reader · DeepSeek Harness'},secretStorage:{getSecret:id=>credentials.get(id),setSecret:(id,value)=>credentials.set(id,value)},loadLocalStorage:()=>structuredClone(state),async saveLocalStorage(_,next){await saveState(next);state=structuredClone(next);}}};
  service=createEbookLibrary(plugin,requestImpl||(async request=>{const r=await boundedHttpRequest(request);const bytes=Uint8Array.from(Buffer.from(r.base64,'base64'));const text=new TextDecoder().decode(bytes);let json;try{json=JSON.parse(text);}catch{}return {status:r.status,headers:r.headers,text,json,arrayBuffer:bytes.buffer};}));if(disposed)service.dispose();return service;
 })();
 return {async operation(input={}){
  if(disposed)throw Error('Reader is closed');
  if(input.action==='poll'){const j=jobs.get(input.id);if(!j)throw Error('Book request expired');if(j.state==='pending')return {state:j.state,progress:j.progress};clearTimeout(j.timer);jobs.delete(input.id);return {state:j.state,value:j.value,failure:j.failure};}
  if(input.action==='cancel'){const j=jobs.get(input.id);if(j){j.abort.abort();clearTimeout(j.timer);jobs.delete(input.id);}return null;}
  const allowed=['isActivated','activate','profile','logout','search','covers','jobs','download'];if(!allowed.includes(input.action))throw Error('Unknown ebook operation');if(jobs.size>=16)throw Error('Too many ebook requests');
  const id=randomUUID(),abort=new AbortController(),job={state:'pending',abort};jobs.set(id,job);job.timer=setTimeout(()=>{abort.abort();jobs.delete(id);},5*60_000);job.timer.unref?.();
  void (async()=>{const api=await init();if(abort.signal.aborted)throw Object.assign(Error('cancelled'),{code:'cancelled'});const args=input.args||[];if(!Array.isArray(args))throw Error('Invalid ebook arguments');
   if(input.action==='download')return api.download(args[0],async files=>{for(const file of files){const result=await importBook({filename:file.name,base64:Buffer.from(await file.arrayBuffer()).toString('base64'),...file.bookMetadata,source:'qiaomu',sourceId:file.bookJobId});if(!result.book)throw Error('import');}return true;},progress=>{job.progress=progress;},abort.signal,args[1]);
   if(['activate','search','covers'].includes(input.action))return api[input.action](args[0],abort.signal);return api[input.action](abort.signal);
  })().then(value=>{job.state='done';job.value=value;},error=>{job.state='error';job.failure={code:error.code||'network',message:'Book service request failed'};});return {id};
 },dispose(){disposed=true;for(const job of jobs.values()){job.abort.abort();clearTimeout(job.timer);}jobs.clear();service?.dispose();}};
}
