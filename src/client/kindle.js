import {openKindlePairing,sendBookToKindle} from '../original/kindle-ui.js';
import {KINDLE_TEXT} from '../original/kindle-i18n.js';
import {isKindleBook} from '../original/kindle-config.js';
import {Modal,disposeNativeSurfaces} from './native-ui.js';
const cancelled=()=>Object.assign(Error('cancelled'),{code:'cancelled',name:'AbortError'});
export function createKindleClient({host,language=()=> 'zh',pickDirectory}){
 let settings={},disposed=false;const aborters=new Set(),modals=new Set();
 const t=(key,...values)=>{let text=(KINDLE_TEXT[language()]||KINDLE_TEXT.zh)[key]||KINDLE_TEXT.en[key]||key;values.forEach((v,i)=>text=text.replaceAll(`{${i}}`,String(v)));return text;};
 const call=async(method,input={})=>{const api=host();if(!api?.kindleOperation)throw Error('Reader host is unavailable');const response=await api.kindleOperation({method,input});if(response.failure)throw Object.assign(Error(response.failure.message),{code:response.failure.code});return response;};
 async function run(method,input={},signal,onProgress){
  if(disposed||signal?.aborted)throw cancelled();
  const abort=new AbortController();aborters.add(abort);const onAbort=()=>abort.abort();signal?.addEventListener('abort',onAbort,{once:true});let id;
  try{
   ({id}=await call(method,input));
   while(true){if(abort.signal.aborted)throw cancelled();const result=await call('poll',{id});if(result.progress)onProgress?.(result.progress);if(result.state==='done')return result.value;if(result.state==='error')throw Object.assign(Error(result.failure.message),{code:result.failure.code});await new Promise(resolve=>setTimeout(resolve,200));}
  }finally{signal?.removeEventListener('abort',onAbort);aborters.delete(abort);if(id&&abort.signal.aborted)await call('cancel',{id}).catch(()=>{});}
 }
 async function refresh(){settings=(await call('config')).value;return settings;}
 const controller={config:()=>settings,isBook:isKindleBook,isPaired:()=>!!settings.paired,trackModal(modal,open){if(open)modals.add(modal);else modals.delete(modal);},
  async setMode(mode){settings=await run('mode',{mode});},findUsb:()=>run('usb'),
  async pairUsb(root,signal){settings=await run('pair',{root},signal);return settings;},
  discover:signal=>run('discover',{},signal),async test(input,signal){const result=await run('test',input,signal);settings=result.config;return result;},
  send:(file,onProgress,signal)=>run('send',{bookId:file.id},signal,onProgress),
  async chooseDirectory(){
   if(pickDirectory){const result=await pickDirectory();return typeof result==='string'?result:result?.path||null;}
   return new Promise(resolve=>{
    class DirectoryModal extends Modal{onOpen(){this.setTitle(t('kindle.pair'));const label=this.contentEl.createEl('label',{text:language()==='zh'?'Kindle USB 挂载目录':'Kindle USB mount directory'});const input=label.createEl('input',{attr:{type:'text',placeholder:'/Volumes/Kindle'}});const button=this.contentEl.createEl('button',{text:t('kindle.pair')});button.addEventListener('click',()=>{const value=input.value.trim();if(!value)return;resolve(value);this.close();});}onClose(){resolve(null);}}
    new DirectoryModal({}).open();
   });
  },
 };
 const plugin={app:{},kindle:controller};
 return{async open(){await refresh();openKindlePairing(plugin,t);},async send(book){await refresh();return sendBookToKindle(plugin,{id:book.id,path:book.id,name:(book.title||book.id)+'.'+book.format,basename:book.title},t);},dispose(){disposed=true;plugin._unloading=true;for(const abort of aborters)abort.abort();for(const modal of modals)modal.close();disposeNativeSurfaces();}};
}
