import {splitSpeechText} from '../original/tts-text.js';
import {rememberSpeechProgress} from '../original/tts-progress.js';
import {checkTtsSignal,ttsError} from '../original/tts-providers.js';
// Original segment/controller semantics; Harness chapters replace Obsidian CFI/PDF page adapters.
export async function startHarnessReading(view,{controller,settings,profile,selectedText,saved,persist}){
 const {ui,bookId,engine}=view.reader,file=view.file;
 const request=view._ttsRequest=(view._ttsRequest||0)+1;controller.stop();const generation=controller.generation;
 const live=()=>!view._closed&&view.file===file&&view._ttsRequest===request&&controller.generation===generation;
 const local=settings.provider==='localModel',count=engine.chapterCount();
 const chunks=async chapter=>splitSpeechText(await engine.plainTextOf(chapter),local?40:240,local).map(item=>({...item,page:chapter+1}));
 let chapter=saved?.page?saved.page-1:Number(ui.store.get().chapterIndex)||0;
 if(chapter<0||chapter>=count)throw ttsError('resume');
 let items=selectedText?splitSpeechText(selectedText,local?40:240,local):await chunks(chapter);if(!live())return;
 if(!selectedText){const offset=saved?.offset??Math.round((await engine.plainTextOf(chapter)).length*(ui.stateOr(bookId).locator?.scroll||0));items=items.filter(item=>item.end>offset);}
 if(!live())return;if(!items.length)throw ttsError('emptyText');
 const owner={view,follow:true,clearHighlight:()=>ui.store.set({speechFocus:null}),onSegment:async item=>{
  if(view._closed||view.file!==file){controller.stop(owner);return;}
  if(selectedText)return;
  rememberSpeechProgress(settings,file,{page:item.page,offset:item.start});persist();
  if(owner.follow){view._ttsNavigating=(view._ttsNavigating||0)+1;try{if(ui.store.get().chapterIndex!==item.page-1)await ui.goChapter(item.page-1);ui.store.set({speechFocus:{text:item.text,offset:item.start,chapterIndex:item.page-1,token:Date.now()}});}finally{view._ttsNavigating--;}}
 }};
 const nextSection=selectedText?undefined:async signal=>{while(++chapter<count){checkTtsSignal(signal);if(view._closed||view.file!==file)throw new DOMException('Cancelled','AbortError');const items=await chunks(chapter);checkTtsSignal(signal);if(items.length)return items;}return [];};
 controller.makeAudio=()=>new view.contentEl.ownerDocument.defaultView.Audio();
 controller.start(owner,items,profile,{nextSection,rate:settings.rate||1});
}
