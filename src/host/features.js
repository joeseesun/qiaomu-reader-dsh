import {applyReadingTime} from './reading-time.js';
import {createFontHost} from './font-service.js';
import {createLookupHost} from './lookup-service.js';
import {CredentialStore} from './credential-store.js';
import {createEbookHost} from './ebook-service.js';
import {boundedHttpRequest} from './network.js';
import path from 'node:path';
import {readFile,writeFile,mkdir,rename,stat,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import * as calibre from '../original/calibre-library.js';
export function createReaderFeatures({root,importBook,appendTranslation,vocabularyOperation,notesOperation,bookNotesOperation,recoveryOperation}){
 const fonts=createFontHost({root});
 let data=null,loading,lane=Promise.resolve();const handles=new Map(),credentials=new CredentialStore(),lookup=createLookupHost();
 const load=()=>loading ||= (async()=>{try{data=JSON.parse(await readFile(path.join(root(),'features.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;data={revision:0,settings:{}};}if(!data||typeof data!=='object'||!data.settings||typeof data.settings!=='object')throw Error('Invalid Reader feature settings');return data;})();
 const save=async()=>{await mkdir(root(),{recursive:true});const target=path.join(root(),'features.json'),temp=target+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data,null,2),{mode:0o600,flag:'wx'});await rename(temp,target);};
 const serial=fn=>{const next=lane.then(fn);lane=next.catch(()=>{});return next;};
 const settings=()=>({...data.settings,calibreLibraryPath:calibre.detectCalibreLibraryPath(data.settings.calibreLibraryPath),calibreCalibredbPath:calibre.detectCalibredbPath(data.settings.calibreCalibredbPath)});
 const ebook=createEbookHost({loadState:async()=>{await load();return data.ebook||{};},saveState:next=>serial(async()=>{const previous=data;data={...data,ebook:next};try{await save();}catch(error){data=previous;throw error;}}),importBook});
 const updateNotes=async updater=>{await load();return serial(async()=>{const previous=data;data={...data,revision:data.revision+1,settings:{...data.settings,notes:updater(data.settings.notes||{})}};try{await save();}catch(error){data=previous;throw error;}return data.settings.notes;});};
 async function call(method,input={}){
  await load();
  if(method==='reading')return serial(async()=>{if(input.action==='load')return applyReadingTime(data.reading,input);const previous=data;data={...data,reading:applyReadingTime(data.reading,input)};try{await save();}catch(error){data=previous;throw error;}return data.reading;});
  if(method==='notes.settings'){if(!input||typeof input!=='object'||Array.isArray(input)||JSON.stringify(input).length>128000)throw Error('Invalid note settings');return updateNotes(previous=>({...previous,...input}));}
  if(method==='notes')return notesOperation(input);
  if(method==='recovery')return recoveryOperation(input);
  if(method==='bookNotes')return bookNotesOperation(input);
  if(method==='font')return fonts(input);
  if(method==='vocabulary')return vocabularyOperation(input);
  if(method==='lookup')return lookup.run(input);
  if(method==='translation.note')return appendTranslation(input);
  if(method==='speech.secret'){const id=String(input.id||'');if(!/^qiaomu-reader-tts-[a-z0-9-]+$/.test(id))throw Error('Invalid speech credential');if(input.operation==='get')return {value:await credentials.get(id)};if(input.operation==='set'){await credentials.set(id,input.value);return {value:true};}throw Error('Unknown credential operation');}
  if(method==='ebook')return ebook.operation(input);
  if(method==='public.request'){const url=new URL(input.url);if(url.origin!=='https://www.gutenberg.org')throw Error('Unsupported public catalogue');return boundedHttpRequest({url:url.href,method:'GET'});}
  if(method==='load')return {revision:data.revision,settings:settings()};
  if(method==='save')return serial(async()=>{if(input.revision!==data.revision)throw Error('Reader settings changed; reload before saving');const patch=input.settings;if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid Reader settings');const allowed=['calibreLibraryPath','calibreCalibredbPath','tts','lookup','reading','notes'];for(const key of Object.keys(patch))if(!allowed.includes(key))throw Error('Unknown Reader setting');if(JSON.stringify(patch).length>512000)throw Error('Reader settings exceed limit');const previous=data;data={...data,revision:data.revision+1,settings:{...data.settings,...patch}};try{await save();}catch(error){data=previous;throw error;}return {revision:data.revision,settings:settings()};});
  if(method==='calibre.search'){
   const config=settings();if(!config.calibreLibraryPath)throw Error('missing-library');const query=String(input.query||'').slice(0,1000),limit=Math.max(1,Math.min(80,Number(input.limit)||40));
   const result=await calibre.searchCalibreLibrary({libraryPath:config.calibreLibraryPath,calibredbPath:config.calibreCalibredbPath,query,limit,syntax:!!input.syntax});
   for(const [id,item] of handles)if(Date.now()-item.at>30*60_000)handles.delete(id);
   const books=[];for(const book of result.books){const id=randomUUID();handles.set(id,{book,root:config.calibreLibraryPath,at:Date.now()});let coverData='';try{const file=calibre.calibreCoverPath(config.calibreLibraryPath,book);if(file&&(await stat(file)).size<1024*1024&&(await realpath(file)).startsWith((await realpath(config.calibreLibraryPath))+path.sep))coverData=calibre.readCoverDataUrl(file);}catch{}
    books.push({...book,coverData,dshHandle:id});}
   while(handles.size>800)handles.delete(handles.keys().next().value);return {...result,books};
  }
  if(method==='calibre.import'){
   const entry=handles.get(input.handle);if(!entry||Date.now()-entry.at>30*60_000)throw Error('Calibre search expired');const format=String(input.format||'').toLowerCase();if(!calibre.CALIBRE_FORMAT_ORDER.includes(format)||!entry.book.formats.some(x=>x.toLowerCase()===format))throw Error('Unsupported Calibre format');
   const file=calibre.resolveCalibreBookFile(entry.root,entry.book,format);if(!file)throw Error('Calibre book file is missing');const {bytes}=calibre.readLibraryFile(entry.root,file);const book=entry.book;
   const result=await importBook({filename:calibre.calibreSafeFilename(book.title,format),base64:Buffer.from(bytes).toString('base64'),title:book.title,author:book.authors||book.author,identifier:book.isbn||book.uuid,source:'calibre',sourceId:book.uuid,isbn:book.isbn});
   await serial(async()=>{const previous=data;data={...data,revision:data.revision+1,settings:{...data.settings,calibreImports:{...data.settings.calibreImports,[book.uuid]:{...book,path:result.book.id}}}};try{await save();}catch(error){data=previous;throw error;}});return result;
  }
  throw Error('Unknown Reader feature operation');
 }
 return {updateNotes,async operation(request){try{return {value:await call(request?.method,request?.input)}}catch(error){return {failure:{message:error.message,code:error.code||'operation',qiaomuReaderReason:error.qiaomuReaderReason,qiaomuReaderStatus:error.qiaomuReaderStatus}};}},dispose(){handles.clear();ebook.dispose();lookup.dispose();}};
}
