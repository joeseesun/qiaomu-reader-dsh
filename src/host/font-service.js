import path from 'node:path';import {lstat,mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';import {createHash,randomUUID} from 'node:crypto';
import {fontFileFormat,MAX_FONT_BYTES} from '../original/reader-fonts.js';
export function createFontHost({root}){return async input=>{
 const rel=String(input.path||''),folder='_attachments/qiaomu-reader-fonts',match=new RegExp('^'+folder+'/([a-f0-9]{64})\\.(ttf|otf|woff|woff2)$').exec(rel);
 if(!match&&!['_attachments',folder].includes(rel))throw Error('Invalid font path');let target=root();for(const bit of rel.split('/')){target=path.join(target,bit);try{if((await lstat(target)).isSymbolicLink())throw Error('Font path contains a symlink');}catch(error){if(error.code!=='ENOENT')throw error;}}
 if(input.action==='exists'){try{await lstat(target);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
 if(input.action==='mkdir'&&!match){await mkdir(target,{recursive:true});return true;}
 if(!match)throw Error('Expected a font file');
 const verify=bytes=>{if(!bytes.length||bytes.length>MAX_FONT_BYTES||createHash('sha256').update(bytes).digest('hex')!==match[1]||fontFileFormat(bytes)!==match[2])throw Error('Invalid font integrity or format');};
 if(input.action==='read'){const info=await lstat(target);if(info.size>MAX_FONT_BYTES)throw Error('Font exceeds size limit');const bytes=await readFile(target);verify(bytes);return bytes.toString('base64');}
 if(input.action==='write'){if(typeof input.base64!=='string'||input.base64.length>Math.ceil(MAX_FONT_BYTES/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))throw Error('Invalid font bytes');const bytes=Buffer.from(input.base64,'base64');verify(bytes);await mkdir(path.dirname(target),{recursive:true});const tmp=target+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,bytes,{flag:'wx',mode:0o600});await rename(tmp,target);}finally{await unlink(tmp).catch(()=>{});}return true;}
 throw Error('Unknown font action');
};}
