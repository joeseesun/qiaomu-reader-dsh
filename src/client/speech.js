import {speechSegments} from './tts.js';
import {attachTts,openTts} from '../original/tts-ui.js';
import {localVoiceChoices} from '../original/tts-local.js';
import {Platform,enhance,createKeymap,Notice} from './native-ui.js';
export function createReaderSpeech({features,data,store,language=()=> 'zh'}){
 let service=null,plugin=null,initializing=null,disposed=false,unregister,view=null,generation=0,mountRequest=0,hasStoredTts=false;const cleanups=[];
 const secretId=id=>`qiaomu-reader-tts-${id}`;
 const key=async(provider)=> (await features.call('speech.secret',{operation:'get',id:secretId(provider)})).value;
 const read=async()=>{const saved=(await features.reload()).settings.tts;hasStoredTts=!!saved;return saved||{provider:'edge',profiles:{},rate:1};};
 async function initialize(){
  if(plugin)return plugin;if(initializing)return initializing;if(!service?.createSpeechBridge)throw Error(language()==='zh'?'请启用乔木 Audio 0.1.1 或更新版本。':'Enable Qiaomu Audio 0.1.1 or later.');
  const ticket=generation;
  initializing=(async()=>{const [tts,bridge]=await Promise.all([read(),service.createSpeechBridge()]);
   if(disposed||ticket!==generation){bridge.dispose();throw Error('Reader speech disconnected');}Platform.isMacOS=bridge.platform==='darwin';
   const secrets=new Map();try{await Promise.all(Object.keys(tts.profiles||{}).filter(id=>!['edge','system','macos','localModel'].includes(id)).map(async id=>secrets.set(secretId(id),await key(id))));}catch(error){bridge.dispose();throw error;}
   if(disposed||ticket!==generation){bridge.dispose();throw Error('Reader speech disconnected');}
   const keymap=createKeymap();let saving=Promise.resolve();
   const current={settings:{tts,language:language()},speechBridge:{...bridge,voices:(profile,options)=>typeof profile==='string'?Promise.resolve(localVoiceChoices(profile,options)):bridge.voices(profile,options)},
    app:{keymap,vault:{adapter:{}},secretStorage:{getSecret:id=>secrets.get(id)||'',async setSecret(id,value){await features.call('speech.secret',{operation:'set',id,value});secrets.set(id,value);}}},
    register:fn=>cleanups.push(fn),_saveLocalData(){const snapshot=structuredClone(current.settings.tts);const task=saving.then(async()=>{await features.reload();await features.save({tts:snapshot});hasStoredTts=true;});saving=task.catch(()=>{});return task;},
   };
   const coordination=service.coordinateSpeech?.(()=>{const c=current.tts;if(c&&!c.paused&&['playing','loading'].includes(c.state))c.toggle();});current.coordination=coordination;
   cleanups.push(()=>{coordination?.dispose();keymap.dispose();bridge.dispose();secrets.clear();});plugin=current;return current;
  })().finally(()=>{initializing=null;});return initializing;
 }
 const close=()=>{mountRequest++;if(!view)return;view._closed=true;view._ttsCleanup?.();view=null;};
 const reset=()=>{generation++;close();for(const cleanup of cleanups.splice(0))cleanup();plugin=null;};
 return {
  connect(next){reset();unregister?.();service=next;unregister=service.registerSpeechSource('qiaomu-reader-dsh',{read,getSecret:key});return()=>{if(service!==next)return;unregister?.();unregister=null;service=null;reset();};},
  async mount(content,ui,bookId,engine){close();const mountTicket=mountRequest,ticket=generation,p=await initialize();if(disposed||mountRequest!==mountTicket||generation!==ticket||store.get().bookId!==bookId||!content.isConnected)return null;
   const book=ui.bookOf(bookId);const current={plugin:p,contentEl:enhance(content),file:{path:bookId,stat:{mtime:book.addedAt||book.id}},reader:{ui,bookId,engine},pager:{currentPdfPageNumber:()=>Number(store.get().chapterIndex||0)+1}};
   const old=ui.stateOr(bookId),settings=p.settings.tts;let migrated=false;
   if(!hasStoredTts&&old.speechSettings){const previous=old.speechSettings,provider=previous.provider==='macos'?'macos':'system';Object.assign(settings,{provider,profiles:{[provider]:{voice:previous.voice||''}},rate:previous.rate||1});migrated=true;}
   if(old.speech&&!old.speech.ended&&!settings.progress?.[bookId]){const at=Math.max(0,Math.min(engine.chapterCount()-1,Number(old.speech.chapterIndex)||0)),parts=speechSegments(await engine.plainTextOf(at));if(disposed||mountRequest!==mountTicket)return null;const part=parts[Math.min(parts.length-1,Number(old.speech.segment)||0)];if(part){settings.progress||={};settings.progress[bookId]={page:at+1,offset:part.offset,mtime:current.file.stat.mtime};migrated=true;}}
   if(migrated)await p._saveLocalData();
   view=current;const tray=enhance(content.ownerDocument.createElement('div'));tray.hidden=true;attachTts(current,tray);current.tray=tray;return current;
  },
  async open(content,ui,bookId,engine,selectedText){try{const current=view?.file.path===bookId?view:await this.mount(content,ui,bookId,engine);if(current)openTts(current,selectedText);}catch(error){new Notice(error.message);}},
  relocated(){view?._ttsOnRelocate?.({reason:'user'});},close,
  dispose(){disposed=true;unregister?.();reset();service=null;},
 };
}
