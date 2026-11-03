import {MAX_FONT_BYTES,fontFileFormat,importedFontFamily} from '../core/reader-fonts.js';
const documents=new WeakMap();
const fromBase64=text=>{const value=atob(text),bytes=new Uint8Array(value.length);for(let i=0;i<value.length;i++)bytes[i]=value.charCodeAt(i);return bytes;};
export function fontBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
async function sha256(bytes,doc){return [...new Uint8Array(await doc.defaultView.crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function validateFontFile(file,doc=globalThis.document){
 if(!file?.size||file.size>MAX_FONT_BYTES)throw Error('请选择64MB以内的字体文件');
 const bytes=new Uint8Array(await file.arrayBuffer()),format=fontFileFormat(bytes);
 if(!format||!/\.(ttf|otf|woff|woff2)$/i.test(file.name))throw Error('请选择有效的TTF、OTF、WOFF或WOFF2字体');
 try{await new doc.defaultView.FontFace('QMR Font Validation',bytes).load();}catch{throw Error('字体无法解码，请选择完整有效的字体文件');}
 return bytes;
}
export function loadReaderFont(host,key,doc=globalThis.document){
 const id=key==='zhuque'?'zhuque':String(key).startsWith('imported:')?key.slice(9):null;
 if(!id)return Promise.resolve(false);
 if(!doc?.fonts||!host?.fontAction)return Promise.reject(Error('字体服务尚未就绪，请重试'));
 let cache=documents.get(doc);if(!cache){cache={hosts:new Map(),disposed:false,faces:new Set()};documents.set(doc,cache);}
 let fonts=cache.hosts.get(host);if(!fonts){fonts=new Map();cache.hosts.set(host,fonts);}
 if(fonts.has(id))return fonts.get(id);
 const promise=(async()=>{
  const result=await host.fontAction({kind:'read',id});if(typeof result.base64!=='string'||result.base64.length>Math.ceil(MAX_FONT_BYTES/3)*4)throw Error('字体数据超出限制');
  const bytes=fromBase64(result.base64);if(fontFileFormat(bytes)!==result.format||await sha256(bytes,doc)!==result.sha256)throw Error('字体校验失败，请重新导入');
  const family=id==='zhuque'?'QMR Zhuque Fangsong':importedFontFamily(id);if(!family)throw Error('无效字体');
  const face=await new doc.defaultView.FontFace(family,bytes).load();
  if(cache.disposed)throw Object.assign(Error('Reader closed'),{name:'AbortError'});
  doc.fonts.add(face);cache.faces.add(face);return true;
 })();fonts.set(id,promise);void promise.catch(()=>fonts.delete(id));return promise;
}
export function disposeReaderFonts(doc=globalThis.document){const cache=documents.get(doc);if(!cache)return;cache.disposed=true;for(const face of cache.faces)doc.fonts.delete(face);documents.delete(doc);}
