import {buildLookupMessages,buildTranslateMessages,parseLookupAnswer,looksLikeLanguage,fallbackTarget} from '../original/lookup.js';
export function createLookupActions({features,ui,bookId,selection,chatApi,onChat=()=>{}}){
 const sessions=new Set();let closed=false;
 return{
  async google(text,target,word,signal){const id=crypto.randomUUID();const cancel=()=>void features.call('lookup',{id,cancel:true}).catch(()=>{});if(signal.aborted)throw new DOMException('Cancelled','AbortError');signal.addEventListener('abort',cancel,{once:true});try{const value=await features.call('lookup',{id,text,target,word});signal.throwIfAborted();return value;}finally{signal.removeEventListener('abort',cancel);}},
  async ai(request){const {signal,word}=request;if(closed||signal.aborted)throw new DOMException('Cancelled','AbortError');const workspaceId=chatApi?.defaultWorkspace();if(!workspaceId)throw Error('Harness 对话服务尚未就绪');const chat=await chatApi.openChat({workspaceId});if(closed||signal.aborted){chat.release();throw new DOMException('Cancelled','AbortError');}sessions.add(chat);onChat(chat);const target=looksLikeLanguage(request.term||request.text,request.target)?fallbackTarget(request.target):request.target;
   const messages=word?buildLookupMessages({...request,target}):buildTranslateMessages({...request,target});
   await chatApi.setReadingContext({sessionId:chat.sessionId,title:ui.bookOf(bookId)?.title||'',chapter:selection.chapterHref,page:request.sentence||request.context,selection:selection.text});signal.throwIfAborted();
   const text=await new Promise((resolve,reject)=>{let unwatch=()=>{};const done=(error,value)=>{clearTimeout(timer);unwatch();signal.removeEventListener('abort',abort);error?reject(error):resolve(value);};const abort=()=>done(new DOMException('Cancelled','AbortError'));const timer=setTimeout(()=>done(Error('等待回答超时，可在原生会话中查看进度或重试。')),180000);signal.addEventListener('abort',abort,{once:true});unwatch=chat.watchAnswer(answer=>{if(answer)done(null,answer);});chat.submitPrompt(messages.map(m=>m.content).join('\n\n')).catch(error=>done(error));});
   signal.throwIfAborted();return word?{card:parseLookupAnswer(text)||{lemma:'',phonetic:'',meaning:text,senses:[],note:'',example:'',exampleTranslation:''},target}:{text,target};
  },
  saveWord:entry=>ui.saveVocabulary(bookId,{...entry,meaning:entry.meaning,chapterHref:selection.chapterHref,textOffset:selection.textOffset,percent:selection.percent}).then(value=>({file:value,status:'added',word:entry.term})),
  hasWord:async(term,lemma)=>ui.stateOr(bookId).vocabulary?.some(v=>[term,lemma].filter(Boolean).some(x=>x.toLowerCase()===v.term.toLowerCase()))||false,
  saveNote:(target,text)=>features.call('translation.note',{bookId,target,text,source:selection.text}),
  dispose(){closed=true;for(const chat of sessions)chat.release();sessions.clear();},
 };
}
