/** Small Host-private JSON files. This is filesystem permission control, not encryption. */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync, lstatSync, chmodSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
export function privateJsonFiles(directory) {
  const target=name=>{if(!/^[a-z][a-z0-9-]{0,50}$/.test(name))throw Error('private-file');return path.join(directory,name+'.json');};
  return {
    read(name) {try{const file=target(name);if(lstatSync(file).isSymbolicLink())throw Error('symlink');chmodSync(file,0o600);return JSON.parse(readFileSync(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw Error('private-read');}},
    write(name,value) {mkdirSync(directory,{recursive:true,mode:0o700});if(lstatSync(directory).isSymbolicLink())throw Error('symlink');chmodSync(directory,0o700);const file=target(name);let old;try{old=lstatSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}if(old?.isSymbolicLink())throw Error('symlink');const temp=path.join(directory,'.'+randomUUID()+'.tmp');writeFileSync(temp,JSON.stringify(value),{mode:0o600,flag:'wx'});renameSync(temp,file);chmodSync(file,0o600);},
  };
}
