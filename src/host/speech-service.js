import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { TTS_PROVIDERS, ttsProfile, ttsBaseUrl, synthesizeHttp, SpeechCache, ttsError } from '../core/tts-providers.js';
import { loadVoiceCatalog } from '../core/tts-choices.js';
import { LOCAL_MODELS } from '../core/tts-local-choices.js';
import { synthesizeEdge } from './tts-edge.js';
import { EdgeSpeechClient } from './tts-edge-client.js';
import { createLocalTtsManager } from './tts-local.js';
import { macSpeechVoices, synthesizeMacSpeech } from './tts-macos.js';
import { speechAudio as sayAudio, speechVoices as sayVoices } from './speech.js';
import { privateJsonFiles } from './private-json.js';
const fields=['baseUrl','model','voice','region','resourceId'];
const profileOnly=value=>Object.fromEntries(fields.filter(key=>typeof value?.[key]==='string').map(key=>[key,value[key].trim().slice(0,512)]));
const safeError=cause=>({code:typeof cause?.code==='string'?cause.code:'network',status:Number.isInteger(cause?.status)?cause.status:undefined,retryAt:Number.isFinite(cause?.retryAt)?cause.retryAt:undefined});
/** Bounded HTTP transport for user-selected speech endpoints and trusted provider audio. */
export function speechRequest(fetcher=globalThis.fetch) {
  return async ({url,method='GET',headers,body,signal})=>{
    const active=AbortSignal.any([AbortSignal.timeout(45000),...(signal?[signal]:[])]);
    try {
      const response=await fetcher(url,{method,headers,body,signal:active,redirect:'error'});
      const limit=16*1024*1024;if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw ttsError('response');}
      const reader=response.body?.getReader(),chunks=[];let size=0;
      if(reader)try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw ttsError('response');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
      const bytes=Buffer.concat(chunks,size),text=bytes.toString('utf8');let json=null;try{json=JSON.parse(text);}catch{/* Binary audio is expected for most providers. */}
      return {status:response.status,headers:Object.fromEntries(response.headers),text,json,arrayBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};
    } catch(error){if(signal?.aborted)throw Object.assign(Error('Cancelled'),{name:'AbortError'});if(error.code==='response')throw error;throw ttsError('network');}
  };
}
export function createSpeechService({directory,home,files=privateJsonFiles(directory),request=speechRequest(),edgeRequest=synthesizeEdge,localManager,macVoices=macSpeechVoices,macSynthesize=synthesizeMacSpeech}={}) {
  const cache=new SpeechCache(),requests=new Map(),edge=new EdgeSpeechClient(edgeRequest);
  const local=localManager||createLocalTtsManager({root:path.join(home,'reader-tts'),cacheRoot:path.join(home,'cache','reader-tts')});
  let disposed=false;
  const configuration=()=>{const raw=files.read('profiles')||{};return {profiles:Object.fromEntries(Object.keys(TTS_PROVIDERS).map(id=>[id,profileOnly(raw.profiles?.[id])]))};};
  const keys=()=>files.read('keys')||{};
  const configView=()=>{const config=configuration(),secrets=keys();return {providers:Object.entries(TTS_PROVIDERS).filter(([id])=>!['system','macos'].includes(id)).map(([id,value])=>({id,label:value.label})),profiles:Object.fromEntries(Object.keys(TTS_PROVIDERS).map(id=>[id,{...ttsProfile(config,id),hasKey:!!secrets[id]}])),localModels:LOCAL_MODELS.map(m=>({id:m.id,label:m.label,bytes:m.bytes,license:m.license,source:m.source}))};};
  const getProfile=input=>{const id=input.provider==='browser'?'system':input.provider||'macos';if(!TTS_PROVIDERS[id])throw ttsError('provider');const profile=ttsProfile(configuration(),id);if(input.voice)profile.voice=String(input.voice).slice(0,512);return profile;};
  const synthesize=async input=>{
    if(disposed)throw ttsError('cancelled');const text=String(input?.text||'').trim();if(!text||text.length>1000)throw ttsError('configuration');
    const profile=getProfile(input),requestId=input.requestId||randomUUID();if(!/^[a-zA-Z0-9-]{1,100}$/.test(requestId))throw ttsError('configuration');
    if(requests.size>=3||requests.has(requestId))throw ttsError('busy');const controller=new AbortController();requests.set(requestId,controller);const signal=controller.signal;
    try{
      const key=createHash('sha256').update(JSON.stringify([profile,text])).digest('hex');let audio=cache.get(key);
      if(!audio){
        if(profile.id==='edge')audio=await edge.synthesize(text,profile.voice,{signal});
        else if(profile.id==='localModel')audio=await local.synthesize(profile,text,signal);
        else if(profile.id==='macos'){
          if(profile.voice&&!profile.voice.startsWith('com.apple.')){const old=await sayVoices();if(old.voices.some(v=>v.id===profile.voice)){const value=await sayAudio({text,voice:profile.voice,rate:1});audio={bytes:Buffer.from(value.base64,'base64'),mime:'audio/wav'};}else audio=await macSynthesize(text,profile.voice,{signal});}
          else audio=await macSynthesize(text,profile.voice,{signal});
        }else if(profile.id==='system')throw ttsError('provider');
        else audio=await synthesizeHttp(profile,text,{request:input=>request({...input,signal}),key:keys()[profile.id]||'',signal});
        if(signal.aborted)throw Object.assign(Error('Cancelled'),{name:'AbortError'});if(!audio.bytes?.length||audio.bytes.length>16*1024*1024)throw ttsError('response');cache.set(key,audio);
      }
      return {base64:Buffer.from(audio.bytes).toString('base64'),mime:audio.mime,provider:profile.id};
    }finally{requests.delete(requestId);}
  };
  return {
    async voices(){if(process.platform!=='darwin')return {voices:[],available:false};try{return {voices:await macVoices(),available:true};}catch{return sayVoices();}},
    async audio(input){try{return await synthesize(input);}catch(cause){return {error:safeError(cause)};}},
    async action(input={}){try{
      switch(input.action){
        case 'config':return configView();
        case 'save':{
          const id=input.provider;if(!TTS_PROVIDERS[id])throw ttsError('provider');const profile=profileOnly(input.profile);if(profile.baseUrl)ttsBaseUrl(profile.baseUrl);
          const old=configuration(),secret=keys();if(input.key!==undefined){if(typeof input.key!=='string'||input.key.length>4096)throw ttsError('key');if(input.key.trim())secret[id]=input.key.trim();}if(input.clearKey)delete secret[id];
          files.write('keys',secret);files.write('profiles',{profiles:{...old.profiles,[id]:profile}});cache.clear();return configView();
        }
        case 'catalog':{const profile=getProfile(input);const result=await loadVoiceCatalog(profile,{request,key:keys()[profile.id]||''});return {voices:result.voices?.slice(0,1000)||[],models:result.models?.slice(0,300)||[],more:!!result.more};}
        case 'cancel':requests.get(input.requestId)?.abort();return {cancelled:true};
        case 'localStatus':{const state=await local.status(input.model);return {...state,error:state.error?safeError(state.error):undefined};}
        case 'install':if(!LOCAL_MODELS.some(m=>m.id===input.model))throw ttsError('localModel');void local.install(input.model).catch(()=>{});return {started:true};
        case 'cancelInstall':local.cancelInstall(input.model);return {cancelled:true};
        default:throw ttsError('configuration');
      }
    }catch(cause){return {error:safeError(cause)};}},
    dispose(){disposed=true;for(const controller of requests.values())controller.abort();local.dispose();cache.clear();},
  };
}
