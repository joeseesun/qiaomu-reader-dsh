import {BookDiscoveryModal} from '../original/book-discovery-modal.js';
import {CalibreSearchModal} from '../original/calibre-modal.js';
import {Modal,Setting,Notice} from './native-ui.js';
import {QIAOMU_READER_EN} from '../original/i18n-en.js';
import {QIAOMU_READER_ZH_CN} from '../original/i18n-zh.js';
export function createReaderFeaturesClient({data,store,language=()=> 'zh'}){
 let current={revision:0,settings:{}},disposed=false;const dialogs=new Set();
 const call=async(method,input={})=>{if(disposed)throw Error('Reader is closed');const host=data.getHost();if(!host?.featureOperation)throw Error('Reader host is unavailable');const r=await host.featureOperation({method,input});if(r.failure)throw Object.assign(Error(r.failure.message),r.failure);return r.value;};
 const reload=async()=>{current=await call('load');store.set({lookupEnabled:current.settings.lookup?.enabled!==false});return current;};
 const save=async settings=>{current=await call('save',{revision:current.revision,settings});return current;};
 const tx=(key,...args)=>String(({zh:{'match-obsidian-2':'跟随 Harness','for-obsidian-on-an-android-e-ink-reader-removes-animations-fades':'适用于墨水屏设备；关闭动画和淡入淡出，使用高对比度书页。'},en:{'match-obsidian-2':'Match Harness','for-obsidian-on-an-android-e-ink-reader-removes-animations-fades':'For e-ink displays: remove animations and fades, and use high-contrast pages.'}}[language()==='zh'?'zh':'en'][key])||(language()==='zh'?QIAOMU_READER_ZH_CN:QIAOMU_READER_EN)[key]||key).replace(/\{(\d+)\}/g,(m,d)=>args[+d]??m);
 const ebookAborters=new Set();
 async function ebookCall(action,args=[],signal,progress){if(signal?.aborted)throw Object.assign(Error('cancelled'),{code:'cancelled'});const abort=new AbortController();ebookAborters.add(abort);const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});let id;
  try{({id}=await call('ebook',{action,args}));for(;;){if(abort.signal.aborted)throw Object.assign(Error('cancelled'),{code:'cancelled'});const result=await call('ebook',{action:'poll',id});if(result.progress)progress?.(result.progress);if(result.failure)throw Object.assign(Error(result.failure.message),{code:result.failure.code});if(result.state==='done')return result.value;await new Promise(resolve=>setTimeout(resolve,200));}}
  finally{signal?.removeEventListener('abort',cancel);ebookAborters.delete(abort);if(id&&abort.signal.aborted)await data.getHost()?.featureOperation({method:'ebook',input:{action:'cancel',id}}).catch(()=>{});}
 }
 const files=()=>data.getLibrary().books.map(b=>({path:b.id,basename:b.title,name:b.title+'.'+b.format,extension:b.format}));
 const openFile=async file=>{const id=file.path||file.id;await data.openBook(id);store.set({bookId:id,view:'reader',panel:null});};
 const plugin={app:{vault:{getAbstractFileByPath:id=>files().find(b=>b.path===id),getFiles:files},workspace:{getLeaf:()=>({openFile})}},
  get settings(){return {...current.settings,bookImports:Object.fromEntries(data.getLibrary().books.map(b=>[b.id,b])),language:language()};},bookFiles:files,openFile,t:tx,
  calibre:{search:input=>call('calibre.search',input)},
  async request(request){const result=await call('public.request',request);const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0));return {...result,arrayBuffer:bytes.buffer,text:new TextDecoder().decode(bytes)};},
  hasBookSource:(source,id)=>data.getLibrary().books.some(b=>b.source===source&&b.sourceId===String(id)||b.identifier===`${source}:${id}`),
  searchCalibreBooks:query=>call('calibre.search',{query,limit:80}),openCalibrePicker:(_,query)=>void api.calibre(query),
  ebookLibrary:{isActivated:()=>ebookCall('isActivated'),activate:(code,signal)=>ebookCall('activate',[code],signal),profile:signal=>ebookCall('profile',[],signal),logout:signal=>ebookCall('logout',[],signal),search:(query,signal)=>ebookCall('search',[query],signal),covers:(books,signal)=>ebookCall('covers',[books],signal),jobs:signal=>ebookCall('jobs',[],signal),async download(book,importer,progress,signal,resume){const result=await ebookCall('download',[book,resume],signal,progress);await data.refreshLibrary();return result;}},
 };
 const library={async _importBooks(files){for(const file of files){const result=await data.importBook(file);if(!result.ok)throw Error(result.error);}return true;}};

 const api={reload,save,call,t:tx,saveNotes:patch=>call('notes.settings',patch),
  async findBooks(){await reload();const modal=new BookDiscoveryModal(plugin.app,plugin,library);dialogs.add(modal);modal.open();},
  async calibre(query=''){
   await reload();if(!current.settings.calibreLibraryPath){api.calibreSettings(()=>void api.calibre(query));return;}
   const modal=new CalibreSearchModal(plugin.app,plugin,{query,allowedFormats:['epub','pdf','fb2','fbz','azw3','mobi','azw','cbz'],async addBooks(jobs){for(const job of jobs){if(job.state.kind!=='new'){await data.openBook(job.state.path);store.set({bookId:job.state.path,view:'reader',panel:null});continue;}await call('calibre.import',{handle:job.filePath,format:job.format});}await data.refreshLibrary();await reload();}});dialogs.add(modal);modal.open();
  },
  calibreSettings(after){
   class Settings extends Modal{onOpen(){this.setTitle(tx('add-from-calibre'));this.modalEl.classList.add('qiaomu-reader-calibre-modal');this.render();}render(){const c=this.contentEl;c.empty();const settings=current.settings,found=settings.calibreLibraryPath;
    const persistViaDisk=async(key,value)=>{try{await save({[key]:value});}catch(error){new Notice(error.message);}};
    new Setting(c).setName(tx('calibre-library-path')).setDesc(found?tx('calibre-library-using',found):tx('calibre-library-missing')).addText(text=>text.setPlaceholder('~/calibre').setValue(settings.calibreLibraryPath||found||'').onChange(v=>persistViaDisk('calibreLibraryPath',v))).addButton(button=>button.setButtonText(tx('calibre-detect')).onClick(async()=>{await save({calibreLibraryPath:''});if(!current.settings.calibreLibraryPath)new Notice(tx('calibre-library-missing'));this.render();}));
    new Setting(c).setName(tx('calibre-calibredb-path')).setDesc(tx('calibre-calibredb-desc')).addText(text=>text.setPlaceholder(settings.calibreCalibredbPath||'calibredb').setValue(settings.calibreCalibredbPath||'').onChange(v=>persistViaDisk('calibreCalibredbPath',v)));
    new Setting(c).setName(tx('add-from-calibre')).addButton(button=>button.setButtonText(tx('add-from-calibre')).onClick(()=>{if(!current.settings.calibreLibraryPath){new Notice(tx('calibre-library-missing'));return;}this.close();after?.();}));
   }}
   const modal=new Settings({});dialogs.add(modal);modal.open();
  },dispose(){for(const abort of ebookAborters)abort.abort();for(const modal of dialogs)modal.close();dialogs.clear();disposed=true;},
 };
 return api;
}
