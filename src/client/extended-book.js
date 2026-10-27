// The same Foliate format parsers used by the original Qiaomu Reader.
// Adapt their section/resource/TOC contract to the existing accepted Harness reading surface.
import JSZip from 'jszip';
import {createReaderEngine} from '../core/reader.js';
import {sanitizeHtml} from '../core/html.js';
export const EXTENDED_FORMATS=['mobi','azw','azw3','fb2','fbz','cbz'];
const SECTION_LIMIT=12000,FILE_LIMIT=128*1024*1024,EXPANDED_LIMIT=256*1024*1024;
const nameText=value=>Array.isArray(value)?value.map(nameText).join(', '):typeof value==='object'?String(value?.name||''):String(value||'');
const hrefOf=i=>`flow/section-${i+1}.xhtml`;
const mimeOf=name=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',avif:'image/avif',bmp:'image/bmp'})[name.split('.').at(-1).toLowerCase()]||'application/octet-stream';
async function archive(bytes){
 const zip=await JSZip.loadAsync(bytes,{createFolders:false});const entries=Object.values(zip.files).filter(e=>!e.dir);let total=0;
 if(entries.length>SECTION_LIMIT)throw Error('Book archive has too many entries');
 for(const entry of entries){const n=entry._data?.uncompressedSize;if(!Number.isSafeInteger(n)||n<0||n>64*1024*1024||(total+=n)>EXPANDED_LIMIT)throw Error('Book archive exceeds the expansion limit');}
 let expanded=0;const blobs=new Map();
 return {entries:entries.map(entry=>({filename:entry.name})),getSize:name=>zip.file(name)?._data?.uncompressedSize||0,getComment:()=>zip.comment,
  async loadBlob(name,type){if(blobs.has(name))return blobs.get(name);const entry=zip.file(name);if(!entry)throw Error('Missing book resource');const data=await entry.async('uint8array');if((expanded+=data.length)>EXPANDED_LIMIT)throw Error('Book archive exceeds the expansion limit');const blob=new Blob([data],{type:type||mimeOf(name)});blobs.set(name,blob);return blob;}};
}
export async function parseExtendedBook(input,filename,format=filename.split('.').at(-1).toLowerCase()){
 const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>FILE_LIMIT)throw Error('Book must be between 1 byte and 128 MiB');
 let source;
 try{
  if(['mobi','azw','azw3'].includes(format)){
   const {MOBI,isMOBI}=await import('foliate-js/mobi.js');const {unzlibSync}=await import('foliate-js/vendor/fflate.js');const file=new Blob([bytes]);if(!await isMOBI(file))throw Error('Invalid MOBI/AZW book');source=await new MOBI({unzlib:unzlibSync}).open(file);
  }else if(format==='fb2'||format==='fbz'){
   let file=new Blob([bytes]);if(format==='fbz'){const zip=await archive(bytes);const entry=zip.entries.find(e=>e.filename.toLowerCase().endsWith('.fb2'));if(!entry)throw Error('FBZ archive contains no FB2');file=await zip.loadBlob(entry.filename);}
   const xml=await file.text();if(/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(xml))throw Error('Unsupported book XML declaration');const {makeFB2}=await import('foliate-js/fb2.js');source=await makeFB2(file);
  }else if(format==='cbz'){
   const {makeComicBook}=await import('foliate-js/comic-book.js');source=await makeComicBook(await archive(bytes),{name:filename});
  }else throw Error('Unsupported book format');
  if(!source.sections?.length||source.sections.length>SECTION_LIMIT)throw Error('Book has no readable sections or exceeds section limit');
  const docs=[];let total=0;
  for(const section of source.sections){
   // load() performs Foliate's image/stylesheet replacement; createDocument() alone does not.
   const url=await section.load();if(typeof url!=='string'||!url.startsWith('blob:'))throw Error('Unexpected book section resource');const html=await (await fetch(url)).text();if((total+=html.length)>EXPANDED_LIMIT)throw Error('Book text exceeds the limit');
   const doc=new DOMParser().parseFromString(html,'text/html');docs.push(doc);
  }
  const target=async href=>{
   try{const found=await source.resolveHref(href);if(!Number.isInteger(found?.index)||found.index<0||found.index>=docs.length)return null;const doc=docs[found.index];let anchor=typeof found.anchor==='function'?found.anchor(doc):null;if(anchor?.startContainer)anchor=anchor.startContainer.nodeType===1?anchor.startContainer:anchor.startContainer.parentElement;
    if(anchor?.setAttribute&&!anchor.id)anchor.id=`qmr-anchor-${found.index}-${[...doc.querySelectorAll('*')].indexOf(anchor)}`;
    return hrefOf(found.index)+(anchor?.id?'#'+encodeURIComponent(anchor.id):'');
   }catch{return null;}
  };
  const toc=async items=>{const out=[];for(const item of items||[]){const href=await target(item.href);if(href)out.push({label:String(item.label||''),href,children:await toc(item.subitems||[])});}return out;};
  const navigation=await toc(source.toc);let links=0;
  for(const doc of docs)for(const link of doc.querySelectorAll('a[href]')){if(++links>50000)throw Error('Book contains too many links');const href=link.getAttribute('href');if(/^(https?:|mailto:)/i.test(href))continue;const resolved=await target(href);if(resolved)link.setAttribute('href','/'+resolved);else link.removeAttribute('href');}
  const meta=source.metadata||{},book={title:nameText(meta.title)||filename.replace(/\.[^.]+$/,''),author:nameText(meta.author),language:nameText(meta.language),identifier:nameText(meta.identifier),format,fixedLayout:source.rendition?.layout==='pre-paginated',resources:{},resourceBytes:async()=>null,
   chapters:docs.map((doc,i)=>({id:String(i),href:hrefOf(i),label:navigation.find(n=>n.href.split('#')[0]===hrefOf(i))?.label||`${i+1}`,xhtml:sanitizeHtml(doc.body.innerHTML)})),toc:navigation};
  const engine=createReaderEngine(book);engine.dispose=()=>source.destroy?.();
  let cover=null;try{const blob=await source.getCover?.();if(blob&&blob.size<=1024*1024&&/^image\//.test(blob.type)){const data=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));cover=`data:${blob.type};base64,${btoa(binary)}`;}}catch{}
  return {book,engine,bytes,cover};
 }catch(error){source?.destroy?.();throw error;}
}
