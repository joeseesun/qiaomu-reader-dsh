/** Reader fonts are assets, never installed into the operating system. */
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,lstat,open,rename,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {MAX_FONT_BYTES,fontFileFormat,safeFontFamily} from '../core/reader-fonts.js';
import {privateJsonFiles} from './private-json.js';
const exec=promisify(execFile),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validEntry=e=>e&&/^[a-f0-9]{64}$/.test(e.id)&&/^(ttf|otf|woff|woff2)$/.test(e.format)&&typeof e.name==='string'&&e.name.length<=120;
export function parseSystemFonts(stdout,platform){
 let names=[];
 if(platform==='darwin'){
  const visit=value=>{if(!value||typeof value!=='object')return;if(typeof value.family==='string')names.push(value.family);for(const item of Object.values(value))if(typeof item==='object')visit(item);};visit(JSON.parse(stdout));
 }else if(platform==='win32'){const parsed=JSON.parse(stdout);names=Array.isArray(parsed)?parsed:[parsed];}
 else names=String(stdout).split(/[\n,]/);
 return [...new Set(names.filter(safeFontFamily).map(name=>name.trim()))].sort((a,b)=>a.localeCompare(b)).slice(0,10000);
}
export async function systemReaderFonts({platform=process.platform,run=exec}={}){
 const spec=platform==='darwin'?['/usr/sbin/system_profiler',['SPFontsDataType','-json','-detailLevel','mini']]:platform==='win32'?['powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Drawing; @((New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object {$_.Name}) | ConvertTo-Json -Compress"]]:platform==='linux'?['fc-list',['--format','%{family}\\n']]:null;
 if(!spec)throw Error('当前宿主不支持系统字体枚举，可直接填写字体名称或导入文件');
 try{const {stdout}=await run(spec[0],spec[1],{timeout:20000,maxBuffer:24*1024*1024,encoding:'utf8',windowsHide:true});const families=parseSystemFonts(stdout,platform);if(!families.length)throw Error('empty');return {families,platform};}
 catch{throw Error('系统字体读取失败，可直接填写字体名称或导入字体文件');}
}
export function createReaderFontService({directory,bundledBase64,systemFonts=systemReaderFonts}={}){
 const files=privateJsonFiles(directory);let queue=Promise.resolve();
 const entries=()=>{const data=files.read('index');if(data===null)return [];if(!Array.isArray(data.fonts)||!data.fonts.every(validEntry))throw Error('字体索引损坏，原文件已保留');return data.fonts.map(({id,name,format,bytes})=>({id,name,format,bytes}));};
 const prepare=async()=>{await mkdir(directory,{recursive:true,mode:0o700});if((await lstat(directory)).isSymbolicLink())throw Error('字体目录不能是符号链接');};
 const read=async entry=>{
  await prepare();const filename=path.join(directory,entry.id+'.'+entry.format);if((await lstat(filename)).isSymbolicLink())throw Error('字体文件不能是符号链接');const fd=await open(filename,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{const stat=await fd.stat();if(!stat.isFile()||stat.size>MAX_FONT_BYTES)throw Error('字体文件无效');const bytes=await fd.readFile();if(hash(bytes)!==entry.id||fontFileFormat(bytes)!==entry.format)throw Error('字体文件校验失败，原文件已保留');return bytes;}finally{await fd.close();}
 };
 const action=async input=>{
  if(input?.kind==='list')return {fonts:entries()};
  if(input?.kind==='system')return systemFonts();
  if(input?.kind==='read'){
   if(input.id==='zhuque'){const bytes=Buffer.from(bundledBase64,'base64');return {id:'zhuque',format:'woff2',sha256:hash(bytes),base64:bundledBase64};}
   const entry=entries().find(font=>font.id===input.id);if(!entry)throw Error('找不到这份字体文件');const bytes=await read(entry);return {...entry,sha256:entry.id,base64:bytes.toString('base64')};
  }
  if(input?.kind!=='import')throw Error('无效字体操作');
  const encoded=input.base64;if(typeof encoded!=='string'||encoded.length>Math.ceil(MAX_FONT_BYTES/3)*4||!encoded.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('请选择64MB以内的字体文件');
  const bytes=Buffer.from(encoded,'base64');if(!bytes.length||bytes.length>MAX_FONT_BYTES||bytes.toString('base64')!==encoded)throw Error('字体数据无效');
  const format=fontFileFormat(bytes);if(!format||!/\.(ttf|otf|woff|woff2)$/i.test(String(input.filename||'')))throw Error('请选择TTF、OTF、WOFF或WOFF2字体文件');
  const id=hash(bytes),fonts=entries(),existing=fonts.find(font=>font.id===id);
  if(!existing&&fonts.length>=200)throw Error('字体数量已达200份');
  await prepare();const entry=existing||{id,format,name:String(input.filename).replace(/\.[^.]+$/,'').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,120)||'Font',bytes:bytes.length};
  const filename=path.join(directory,id+'.'+entry.format),temp=path.join(directory,'.'+randomUUID()+'.tmp');
  let repaired=false;
  try{
   const info=await lstat(filename).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
   if(info&&(info.isSymbolicLink()||!info.isFile()))throw Error('字体文件不能是符号链接或目录');
   let intact=false;if(info)try{await read(entry);intact=true;}catch{ /* The selected file restores missing or damaged assets. */ }
   if(!intact){
    const fd=await open(temp,'wx',0o600);try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}
    if(info)await rename(filename,filename+'.corrupt-'+randomUUID());
    await rename(temp,filename);await read(entry);repaired=!!existing;
   }
   const next=existing?fonts:[...fonts,entry];if(!existing)files.write('index',{fonts:next});
   return {font:entry,fonts:next,repaired};
  }finally{await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}

 };
 return {action(input){if(input?.kind!=='import')return action(input);const next=queue.then(()=>action(input));queue=next.catch(()=>{});return next;}};
}
