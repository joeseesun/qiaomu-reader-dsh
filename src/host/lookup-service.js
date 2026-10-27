import {createGoogleLookup} from '../original/google-lookup.js';
import {boundedHttpRequest} from './network.js';
export function createLookupHost({request=boundedHttpRequest}={}){
 const jobs=new Map();let disposed=false;
 return{async run(input){if(disposed)throw Error('Reader is closed');if(input.cancel){jobs.get(input.id)?.abort();return null;}
  if(typeof input.id!=='string'||!/^[a-z0-9-]{8,80}$/.test(input.id)||jobs.has(input.id)||jobs.size>=8)throw Error('Invalid or busy translation request');
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>16000||!['zh-CN','zh-TW','en','ja','ko','ru','de','fr','es'].includes(input.target))throw Error('Invalid translation request');
  const abort=new AbortController();jobs.set(input.id,abort);
  const google=createGoogleLookup(async options=>{abort.signal.throwIfAborted();const result=await request({...options,signal:abort.signal});abort.signal.throwIfAborted();let json;try{json=JSON.parse(Buffer.from(result.base64,'base64').toString('utf8'));}catch{}return{...result,json};});
  try{return await (input.word?google.word(input.text,input.target):google.translate(input.text,input.target));}finally{jobs.delete(input.id);}
 },dispose(){disposed=true;for(const job of jobs.values())job.abort();jobs.clear();}};
}
