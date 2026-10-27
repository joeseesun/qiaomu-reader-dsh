import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,realpath,lstat} from 'node:fs/promises';
import {createKindleController} from '../original/kindle.js';
import {CredentialStore} from './credential-store.js';

/** One native controller and bounded, cancellable job set per Harness profile. Keys never cross Remote. */
export function createKindleService({root, bookById, credentials=new CredentialStore(), makeController=createKindleController}) {
 let loaded,plugin,controller,disposed=false;
 const files=new Map(),jobs=new Map();
 const init=()=>loaded ||= (async()=>{
  const settingsPath=path.join(root(),'kindle.json');let settings;
  try{settings=JSON.parse(await readFile(settingsPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;settings={};}
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error('Invalid Kindle settings');
  plugin={settings:{kindle:settings},app:{secretStorage:{getSecret:id=>credentials.get(id),setSecret:(id,value)=>credentials.set(id,value)},vault:{
   getAbstractFileByPath:p=>files.get(p),adapter:{getBasePath:root,getFullPath:p=>path.resolve(root(),p)},
  }},async _saveLocalData(){
   await mkdir(root(),{recursive:true});const tmp=settingsPath+'.'+randomUUID()+'.tmp';
   await writeFile(tmp,JSON.stringify(plugin.settings.kindle,null,2),{mode:0o600,flag:'wx'});await rename(tmp,settingsPath);return true;
  }};
  controller=makeController(plugin);if(disposed)controller.dispose();return controller;
 })();
 const config=()=>{const c={...controller.config()};delete c.secretId;return {...c,paired:controller.isPaired()};};
 const failure=e=>({code:typeof e?.code==='string'?e.code:'network',message:'Kindle operation failed'});
 async function execute(method,input,signal,onProgress){
  const c=await init();if(disposed||signal?.aborted)throw Object.assign(Error('cancelled'),{code:'cancelled'});
  if(method==='mode'){await c.setMode(input.mode);return config();}
  if(method==='usb')return c.findUsb();
  if(method==='pair'){await c.pairUsb(input.root,signal);return config();}
  if(method==='discover')return c.discover(signal);
  if(method==='test'){const receipt=await c.test(input,signal);return {...receipt,config:config()};}
  if(method==='send'){
   const book=await bookById(input.bookId);if(!book)throw Object.assign(Error('file'),{code:'file'});
   const base=await realpath(root()),absolute=path.resolve(base,book.file||'');
   if(!absolute.startsWith(base+path.sep)||(await lstat(absolute)).isSymbolicLink()||!(await realpath(absolute)).startsWith(base+path.sep))throw Object.assign(Error('file'),{code:'file'});
   const name=String(book.title||book.id).replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,140)+'.'+book.format;
   const file={path:path.relative(base,absolute),name,basename:book.title||book.id};files.set(file.path,file);
   try{return await c.send(file,onProgress,signal);}finally{if(files.get(file.path)===file)files.delete(file.path);}
  }
  throw Error('Unknown Kindle operation');
 }
 return {
  async operation(request={}){
   if(disposed)throw Error('Reader is closed');
   const {method,input={}}=request;
   if(method==='config'){await init();return {value:config()};}
   if(method==='poll'){
    const job=jobs.get(input.id);if(!job)throw Error('Kindle operation expired');
    if(job.state==='pending')return {state:job.state,progress:job.progress};
    clearTimeout(job.timer);jobs.delete(input.id);return {state:job.state,value:job.value,failure:job.failure};
   }
   if(method==='cancel'){const job=jobs.get(input.id);if(job){job.abort.abort();clearTimeout(job.timer);jobs.delete(input.id);}return {value:null};}
   if(!['mode','usb','pair','discover','test','send'].includes(method))throw Error('Unknown Kindle operation');
   if([...jobs.values()].some(j=>j.state==='pending')||jobs.size>=8)return {failure:{code:'busy',message:'Kindle operation already active'}};
   const id=randomUUID(),abort=new AbortController(),job={state:'pending',abort};jobs.set(id,job);
   job.timer=setTimeout(()=>{abort.abort();jobs.delete(id);},15*60_000);job.timer.unref?.();
   execute(method,input,abort.signal,progress=>{job.progress=progress;}).then(value=>{job.state='done';job.value=value;},error=>{job.state='error';job.failure=failure(error);});
   return {id};
  },
  dispose(){disposed=true;plugin&&(plugin._unloading=true);for(const job of jobs.values()){job.abort.abort();clearTimeout(job.timer);}jobs.clear();controller?.dispose();},
 };
}
