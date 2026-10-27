import {parentPort,workerData} from 'node:worker_threads';
import {JSDOM} from 'jsdom';
import {parseExtendedBook} from '../client/extended-book.js';
const dom=new JSDOM();Object.assign(globalThis,{document:dom.window.document,DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer,CSS:{escape:value=>String(value).replace(/[^\w-]/g,c=>`\\${c}`)}});
async function run(){
let record;
try{
 const {bytes,filename,format,chapter}=workerData;record=await parseExtendedBook(bytes,filename,format);const index=Number(chapter)-1;if(!Number.isInteger(index)||index<0||index>=record.book.chapters.length)throw Error(`Book has ${record.book.chapters.length} chapters`);
 parentPort.postMessage({value:{title:record.book.title,author:record.book.author,chapters:record.book.chapters.length,chapter:{index:index+1,href:record.book.chapters[index].href,label:record.book.chapters[index].label},text:(await record.engine.plainTextOf(index)).slice(0,8000)}});
}catch(error){parentPort.postMessage({error:String(error.message).slice(0,300)});}finally{record?.engine.dispose();dom.window.close();}

}
void run();
