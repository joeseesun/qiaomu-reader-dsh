import {Worker} from 'node:worker_threads';
export function readExtendedChapter({bytes,filename,format,chapter=1}, {signal,timeout=60000,source=__QMR_FORMAT_WORKER__}={}){
 if(signal?.aborted)return Promise.reject(Error('Reading cancelled'));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(source,{eval:true,execArgv:[],resourceLimits:{maxOldGenerationSizeMb:512},workerData:{bytes,filename,format,chapter,moduleURL:import.meta.url}});let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);void worker.terminate();if(error)reject(error);else resolve(value);};const cancel=()=>finish(Error('Reading cancelled'));const timer=setTimeout(()=>finish(Error('Book parsing timed out')),timeout);
  worker.on('message',result=>finish(result.error?Error(result.error):null,result.value));worker.on('error',error=>finish(error));worker.on('exit',()=>{if(!settled)finish(Error('Book parser stopped'));});signal?.addEventListener('abort',cancel,{once:true});
 });
}
