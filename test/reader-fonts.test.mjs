import {createBookState,normalizeState} from '../src/core/state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink,unlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {webcrypto,createHash} from 'node:crypto';
import {createReaderFontService,parseSystemFonts} from '../src/host/fonts.js';
import {fontFileFormat,safeFontFamily,isReaderFontKey,MAX_FONT_BYTES,readerFontStack} from '../src/core/reader-fonts.js';
import {loadReaderFont,disposeReaderFonts,validateFontFile} from '../src/client/reader-fonts.js';
const bytes=await readFile(new URL('../media/fonts/QiaomuReadingFangsong.woff2',import.meta.url));
const base64=bytes.toString('base64'),hash=createHash('sha256').update(bytes).digest('hex');
async function fixture(){const root=await mkdtemp(path.join(tmpdir(),'qmr-font-'));return {root,service:createReaderFontService({directory:path.join(root,'fonts'),bundledBase64:base64,systemFonts:async()=>({families:['Songti SC'],platform:'test'})}),cleanup:()=>rm(root,{recursive:true,force:true})};}
test('font imports persist, deduplicate concurrent writes and verify bytes after restart',async()=>{
 const f=await fixture();try{
  const [a,b]=await Promise.all(['A.woff2','B.woff2'].map(filename=>f.service.action({kind:'import',filename,base64})));
  assert.equal(a.font.id,b.font.id);assert.equal((await f.service.action({kind:'list'})).fonts.length,1);
  const restarted=createReaderFontService({directory:path.join(f.root,'fonts'),bundledBase64:base64});
  const got=await restarted.action({kind:'read',id:a.font.id});assert.equal(got.base64,base64);assert.equal(got.sha256,hash);
  assert.equal((await restarted.action({kind:'read',id:'zhuque'})).sha256,hash);
  await assert.rejects(restarted.action({kind:'read',id:'../../outside'}),/找不到/);
 }finally{await f.cleanup();}
});
test('invalid font payloads and corrupt index preserve existing evidence',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.service.action({kind:'import',filename:'x.woff2',base64:'***'}),/字体/);
  await assert.rejects(f.service.action({kind:'import',filename:'x.exe',base64}),/字体文件/);
  await f.service.action({kind:'import',filename:'x.woff2',base64});
  const index=path.join(f.root,'fonts','index.json');await writeFile(index,'{broken');
  await assert.rejects(f.service.action({kind:'import',filename:'x.woff2',base64}));assert.equal(await readFile(index,'utf8'),'{broken');
 }finally{await f.cleanup();}
});
test('font reads reject tampered bytes and symlinks without altering outside files',async()=>{
 const f=await fixture();try{
  const {font}=await f.service.action({kind:'import',filename:'x.woff2',base64});const file=path.join(f.root,'fonts',font.id+'.woff2');
  await writeFile(file,'wOF2 broken');await assert.rejects(f.service.action({kind:'read',id:font.id}),/校验失败/);
  const outside=path.join(f.root,'outside');await writeFile(outside,'do not read');await unlink(file);await symlink(outside,file);
  await assert.rejects(f.service.action({kind:'read',id:font.id}));assert.equal(await readFile(outside,'utf8'),'do not read');
 }finally{await f.cleanup();}
});
test('system font parsers deduplicate safe families and fixed service operation',async()=>{
 assert.deepEqual(parseSystemFonts(JSON.stringify({_items:[{typefaces:[{family:'Songti SC'},{family:'Songti SC'},{family:'bad;name'}]}]}),'darwin'),['Songti SC']);
 assert.deepEqual(parseSystemFonts('A,B\nA\n','linux'),['A','B']);
 assert.deepEqual(parseSystemFonts('["Arial","Arial"]','win32'),['Arial']);
 const f=await fixture();try{assert.deepEqual((await f.service.action({kind:'system'})).families,['Songti SC']);}finally{await f.cleanup();}
 for(const value of ['Songti SC','霞鹜文楷'])assert.equal(safeFontFamily(value),true);
 assert.equal(safeFontFamily('evil";url(x)'),false);assert.equal(isReaderFontKey('zhuque'),true);assert.equal(isReaderFontKey('imported:'+hash),true);assert.equal(isReaderFontKey('system:bad;name'),false);
 assert.equal(fontFileFormat(bytes),'woff2');assert.equal(fontFileFormat(new Uint8Array([1,2])), '');for(const key of [null,123,{},[]])assert.equal(isReaderFontKey(key),false);
});
function documentFixture(){const faces=new Set();class Face{constructor(family,data){this.family=family;this.data=data;}async load(){return this;}}return {faces,doc:{defaultView:{FontFace:Face,crypto:webcrypto},fonts:{add:face=>faces.add(face),delete:face=>faces.delete(face)}}};}
test('client verifies font integrity, coalesces loads and removes faces on disposal',async()=>{
 const {doc,faces}=documentFixture();let calls=0;const host={fontAction:async()=>{calls++;return {base64,format:'woff2',sha256:hash};}};
 await Promise.all([loadReaderFont(host,'zhuque',doc),loadReaderFont(host,'zhuque',doc)]);assert.equal(calls,1);assert.equal(faces.size,1);disposeReaderFonts(doc);assert.equal(faces.size,0);
 const broken={fontAction:async()=>({base64,format:'woff2',sha256:'0'.repeat(64)})};await assert.rejects(loadReaderFont(broken,'zhuque',doc),/校验失败/);disposeReaderFonts(doc);
});
test('late font loads cannot register after plugin disposal and oversized files are rejected before read',async()=>{
 const {doc,faces}=documentFixture();let resolve;const host={fontAction:()=>new Promise(done=>{resolve=done;})};
 const pending=loadReaderFont(host,'zhuque',doc);disposeReaderFonts(doc);resolve({base64,format:'woff2',sha256:hash});await assert.rejects(pending,/closed/);assert.equal(faces.size,0);
 await assert.rejects(validateFontFile({size:MAX_FONT_BYTES+1,arrayBuffer(){throw Error('must not read');}},doc),/64MB/);
 const invalidDoc={defaultView:{FontFace:class {async load(){throw Error('bad font');}}}};
 await assert.rejects(validateFontFile({name:'bad.woff2',size:bytes.length,arrayBuffer:async()=>bytes},invalidDoc),/无法解码/);
});

test('custom font stacks preserve quoted families and reject malformed CSS',()=>{assert.equal(readerFontStack('\"Georgia\", serif'),'\"Georgia\", serif');assert.equal(readerFontStack("'Songti SC', Georgia, serif"),'\"Songti SC\", \"Georgia\", serif');for(const value of ['a; color:red','\"unclosed',',serif',''])assert.equal(readerFontStack(value),'');assert.equal(isReaderFontKey('custom:Georgia, serif'),true);});

test('new books use bundled Zhuque while existing font preferences are preserved',()=>{assert.equal(createBookState('new').settings.fontFamily,'zhuque');assert.equal(normalizeState({bookId:'old',settings:{fontFamily:'serif'}},'old').settings.fontFamily,'serif');});

test('reimport repairs damaged assets, preserving the corrupt bytes and saved font key',async()=>{
 const f=await fixture();try{const input={kind:'import',filename:'x.woff2',base64};const original=await f.service.action(input);const dir=path.join(f.root,'fonts'),file=path.join(dir,original.font.id+'.woff2');
 await writeFile(file,'damaged font evidence');const restored=await f.service.action(input);assert.equal(restored.repaired,true);assert.equal(restored.font.id,original.font.id);assert.equal(restored.fonts.length,1);assert.equal((await f.service.action({kind:'read',id:original.font.id})).base64,base64);const archive=(await readdir(dir)).find(name=>name.includes('.corrupt-'));assert.equal(await readFile(path.join(dir,archive),'utf8'),'damaged font evidence');
 }finally{await f.cleanup();}
});
