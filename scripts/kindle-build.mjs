import {build} from 'esbuild';
import JSZip from 'jszip';
export const kindleSsh={name:'reader-native-ssh',setup(build){build.onResolve({filter:/^cpu-features$|sshcrypto\.node$/},()=>({path:'ssh-optional',namespace:'reader-ssh'}));build.onLoad({filter:/.*/,namespace:'reader-ssh'},()=>({contents:'module.exports=undefined;',loader:'js'}));}};
export async function kindleDefines(){
 const r=await build({entryPoints:['src/original/kindle-converter-worker.js'],bundle:true,write:false,alias:{setimmediate:'./src/original/kindle-zip-scheduler.js',immediate:'./src/original/kindle-zip-scheduler.js'},format:'cjs',platform:'node',target:'node22',banner:{js:"const {parentPort}=require('node:worker_threads');const self={postMessage:(...args)=>parentPort.postMessage(...args)};parentPort.on('message',data=>self.onmessage({data}));"}});
 const zip=new JSZip();zip.file('kindle-converter.js',r.outputFiles[0].text,{date:new Date('2026-01-01T00:00:00Z')});
 return {__KINDLE_CONVERTER_ARCHIVE__:JSON.stringify(await zip.generateAsync({type:'base64',compression:'DEFLATE',compressionOptions:{level:9}}))};
}
export async function formatDefines(){
 const r=await build({stdin:{contents:"import('./src/host/format-worker.js');",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node',target:'node22',external:['jsdom'],banner:{js:"require=require('node:module').createRequire(require('node:worker_threads').workerData.moduleURL);"}});
 return {__QMR_FORMAT_WORKER__:JSON.stringify(r.outputFiles[0].text)};
}
