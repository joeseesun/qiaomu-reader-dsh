import path from 'node:path';import {readFile,writeFile,mkdir,lstat,rename,unlink} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const valid=(value,id)=>plain(value)&&(!value.bookId||value.bookId===id)&&Array.isArray(value.highlights)&&Array.isArray(value.bookmarks)&&(!value.locator||plain(value.locator));
function pathsFor(root,id){if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('Invalid book id');return{current:path.join(root,id+'.json'),snapshot:path.join(root,id+'.recovery.json'),history:path.join(root,id+'.history.json')};}
async function read(file){try{const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size>32*1024*1024)throw Error('Invalid state file');return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function atomic(file,value){const temporary=file+'.'+randomUUID()+'.tmp',text=JSON.stringify(value,null,2)+'\n';await mkdir(path.dirname(file),{recursive:true});try{await writeFile(temporary,text,{flag:'wx',mode:0o600});if(await readFile(temporary,'utf8')!==text)throw Error('State write verification failed');await rename(temporary,file);}finally{await unlink(temporary).catch(()=>{});}}
export async function readStoredState(root,id){const files=pathsFor(root,id);let current,error;try{current=await read(files.current);if(current!==null&&!valid(current,id))throw Error('Invalid reading state');}catch(cause){error=cause;}
 if(!error&&current!==null)return{raw:current};let snapshot;try{snapshot=await read(files.snapshot);}catch{}
 if(valid(snapshot,id))return{raw:snapshot,recovery:{path:files.current,snapshot:files.snapshot,message:'阅读状态文件无法读取；已从独立备份恢复显示，写入暂停。请在阅读设置中恢复。'}};
 if(error)throw Error('无法读取阅读状态，已保留原文件：'+files.current,{cause:error});return{raw:null};
}
export async function writeStoredState(root,id,next,{chapterCount=1}={}){const files=pathsFor(root,id);const loaded=await readStoredState(root,id);if(loaded.recovery)throw Error(loaded.recovery.message);if(!valid(next,id))throw Error('Invalid reading state');const clean={...next};delete clean.recovery;
 const previous=loaded.raw;let history;try{history=await read(files.history);}catch{history=null;}if(!Array.isArray(history))history=[];
 const fraction=state=>Number.isFinite(state?.locator?.progress)?state.locator.progress:((Number(state?.locator?.chapterIndex)||0)+(Number(state?.locator?.scroll)||0))/Math.max(1,chapterCount);
 const now=Date.now(),last=history.at(-1),old=fraction(previous),fresh=fraction(clean);if(previous?.locator&&JSON.stringify(previous.locator)!==JSON.stringify(clean.locator)&&(!last||now-last.ts>=180000||Math.abs(fresh-old)>=.1))history.push({locator:previous.locator,percent:Math.round(Math.max(0,Math.min(1,old))*100),ts:now});
 // The independent last-known-good snapshot is verified before the main state changes.
 await atomic(files.snapshot,clean);await atomic(files.current,clean);if(history.length)await atomic(files.history,history.slice(-30));return clean;
}
export async function stateRecoveryOperation(root,input){const files=pathsFor(root,input.bookId);if(input.action==='list'){const loaded=await readStoredState(root,input.bookId);let history=[];try{const value=await read(files.history);if(Array.isArray(value))history=value.filter(item=>plain(item)&&plain(item.locator)).slice(-30);}catch{}return{history,recovery:loaded.recovery||null};}
 if(input.action!=='restore')throw Error('Unknown state recovery operation');const snapshot=await read(files.snapshot);if(!valid(snapshot,input.bookId))throw Error('No valid recovery snapshot');const loaded=await readStoredState(root,input.bookId);if(!loaded.recovery)return{state:loaded.raw,unchanged:true};let preserved;
 try{const stat=await lstat(files.current);if(stat.isSymbolicLink()||!stat.isFile())throw Error('Refusing to replace a linked state file');preserved=path.join(root,input.bookId+'.damaged-'+Date.now()+'-'+randomUUID()+'.json');await writeFile(preserved,await readFile(files.current),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='ENOENT')throw error;}
 await atomic(files.current,snapshot);return{state:snapshot,preserved};
}
