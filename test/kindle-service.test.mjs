import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createKindleService} from '../src/host/kindle-service.js';
// Pairing does not need the converter; the production build embeds its archive.
globalThis.__KINDLE_CONVERTER_ARCHIVE__='';
async function result(service,request){const started=await service.operation(request);if(started.failure)throw started.failure;for(let i=0;i<200;i++){const r=await service.operation({method:'poll',input:{id:started.id}});if(r.state!=='pending')return r;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');}
async function fixture(t){const root=await mkdtemp(path.join(os.tmpdir(),'reader-kindle-host-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('Host USB pairing persists a key reference, keeps original settings and restores native/KOReader profiles',async t=>{
 const root=await fixture(t),usb=path.join(root,'Kindle');await mkdir(path.join(usb,'system'),{recursive:true});await mkdir(path.join(usb,'koreader/settings'),{recursive:true});
 await writeFile(path.join(usb,'system/version.txt'),'Kindle 5.16.2');await writeFile(path.join(usb,'koreader/koreader.sh'),'#!/bin/sh\n');await writeFile(path.join(usb,'koreader/settings.reader.lua'),'return {\n    ["keep_me"] = true,\n}\n');
 const secrets=new Map(),credentials={async get(id){return secrets.get(id)||'';},async set(id,value){await new Promise(r=>setTimeout(r,5));secrets.set(id,value);}};
 const make=()=>createKindleService({root:()=>path.join(root,'reader'),bookById:async()=>null,credentials});let service=make();t.after(()=>service.dispose());
 const paired=await result(service,{method:'pair',input:{root:usb}});assert.equal(paired.state,'done');assert.equal(paired.value.paired,true);assert.equal(paired.value.secretId,undefined);
 const stored=await readFile(path.join(root,'reader/kindle.json'),'utf8');assert.ok(!stored.includes('PRIVATE'));assert.ok(JSON.parse(stored).secretId);assert.equal(secrets.size,1);
 const lua=await readFile(path.join(usb,'koreader/settings.reader.lua'),'utf8');assert.match(lua,/keep_me/);assert.match(lua,/SSH_key_only_auth.*true/);
 assert.match(await readFile(path.join(usb,'koreader/settings/SSH/authorized_keys'),'utf8'),/^ecdsa-sha2-nistp256/);
 assert.equal((await result(service,{method:'mode',input:{mode:'native'}})).value.paired,false);
 assert.equal((await result(service,{method:'mode',input:{mode:'koreader'}})).value.paired,true);
 service.dispose();service=make();const restored=(await service.operation({method:'config'})).value;assert.equal(restored.paired,true);assert.equal(restored.secretId,undefined);
});
test('Host jobs reject overlap and cancellation reaches the native controller',async t=>{
 const root=await fixture(t);let stopped=false,aborted=false;
 const service=createKindleService({root:()=>root,bookById:async()=>null,makeController:()=>({config:()=>({secretId:'hidden',paired:true}),isPaired:()=>true,discover:signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Object.assign(Error('cancelled'),{code:'cancelled'}));},{once:true})),dispose(){stopped=true;}})});t.after(()=>service.dispose());
 const {id}=await service.operation({method:'discover'});await new Promise(r=>setTimeout(r,20));assert.equal((await service.operation({method:'mode',input:{mode:'native'}})).failure.code,'busy');
 await service.operation({method:'cancel',input:{id}});assert.equal(aborted,true);await assert.rejects(service.operation({method:'poll',input:{id}}),/expired/);service.dispose();assert.equal(stopped,true);
});
test('send only resolves a library book and refuses paths outside its library',async t=>{
 const root=await fixture(t);let calls=0;const service=createKindleService({root:()=>root,bookById:async()=>({id:'bad',file:'../private.txt',format:'txt'}),makeController:()=>({config:()=>({}),isPaired:()=>false,send(){calls++;},dispose(){}})});t.after(()=>service.dispose());
 const response=await result(service,{method:'send',input:{bookId:'bad'}});assert.equal(response.failure.code,'file');assert.equal(calls,0);assert.ok(!JSON.stringify(response).includes('private.txt'));
});
