import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createUiStore} from '../src/ui/store.js';
const result=await build({entryPoints:['src/client/speech.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const {createReaderSpeech}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true});globalThis.window=dom.window;globalThis.document=dom.window.document;
 dom.window.ResizeObserver=class{observe(){}disconnect(){}};const players=[],calls=[],secrets=new Map();
 dom.window.Audio=class{constructor(){players.push(this);}async play(){this.played=true;}pause(){this.played=false;}removeAttribute(){}load(){}};
 let saved={provider:'edge',profiles:{},introSeen:true},source,disposedBridge=0;
 const bridge={platform:'darwin',async speech(profile,text){calls.push({profile,text});return{bytes:new Uint8Array([1,2]),mime:'audio/wav'};},async voices(){return{voices:[{id:'fixture-voice',label:'测试声音'}]};},snapshot:()=>({phase:'ready'}),status:async()=>({phase:'ready'}),install:async()=>({phase:'ready'}),cancelInstall:async()=>({phase:'cancelled'}),subscribe:()=>()=>{},dispose(){disposedBridge++;}};
 const features={async reload(){return{settings:{tts:structuredClone(saved)}};},async save(p){saved=structuredClone(p.tts);},async call(method,input){assert.equal(method,'speech.secret');if(input.operation==='get')return{value:secrets.get(input.id)||''};secrets.set(input.id,input.value);return{value:true};}};
 const store=createUiStore({bookId:'fixture',chapterIndex:0}),chapters=['第一章第一句。 第一章第二句。','第二章内容。'];
 const engine={chapterCount:()=>chapters.length,plainTextOf:async i=>chapters[i]};
 const ui={store,bookOf:()=>({id:'fixture',addedAt:'2026-10-27'}),stateOr:()=>({locator:{scroll:0}}),goChapter:i=>store.set({chapterIndex:i})};
 const speech=createReaderSpeech({features,store,data:{}}),disconnect=speech.connect({createSpeechBridge:async()=>bridge,registerSpeechSource(id,value){assert.equal(id,'qiaomu-reader-dsh');source=value;return()=>{source=null;};}});
 return{dom,ui,engine,speech,bridge,features,store,players,calls,secrets,get source(){return source;},saved:()=>saved,root:document.querySelector('main'),disposedBridge:()=>disposedBridge,cleanup(){disconnect();speech.dispose();dom.window.close();}};
}
test('original Reader player, voice picker and settings use the shared Audio bridge with durable progress',async()=>{
 const f=fixture();try{
  const view=await f.speech.mount(f.root,f.ui,'fixture',f.engine);await f.speech.open(f.root,f.ui,'fixture',f.engine);
  const q=s=>f.root.querySelector(s);assert.equal(q('.qbr-tts-player').hidden,false);assert.ok(q('.qbr-tts-controls'));assert.equal(document.querySelector('.qmr-feature-panel'),null);
  q('.qbr-tts-play').click();await tick();await tick();assert.equal(view.plugin.tts.state,'playing');assert.match(f.calls[0].text,/第一章/);assert.equal(f.store.get().speechFocus.chapterIndex,0);
  await tick();assert.equal(f.saved().progress.fixture.page,1);assert.equal((await f.source.read()).provider,'edge');
  q('.qbr-tts-play').click();assert.equal(view.plugin.tts.state,'paused');q('.qbr-tts-speed').click();const rate=[...q('.qbr-tts-rate-choices').children].find(el=>el.dataset.rate==='1.5');rate.click();await tick();assert.equal(view.plugin.tts.rate,1.5);
  q('.qbr-tts-current-voice').click();assert.equal(q('.qbr-tts-options').hidden,false);const preview=q('.qbr-tts-voice-preview');preview.click();await tick();assert.notEqual(view.plugin.tts.owner?.view,view);view.plugin.tts.audio.onended();await tick();assert.equal(view.plugin.tts.owner?.view,view);assert.equal(view.plugin.tts.state,'paused');
  q('.qbr-tts-popup-footer button').click();assert.ok(document.querySelector('.qbr-tts-settings'));const select=document.querySelector('.qbr-tts-settings .setting-item select');select.value='openai';select.dispatchEvent(new f.dom.window.Event('change'));const input=document.querySelector('.qbr-tts-settings input[type=password]');input.value='fixture-secret';input.dispatchEvent(new f.dom.window.Event('change'));await tick();assert.equal(await f.source.getSecret('openai'),'fixture-secret');assert.ok(!JSON.stringify(f.saved()).includes('fixture-secret'));
  document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.querySelector('[role=dialog]'),null);
  f.speech.close();assert.equal(q('.qbr-tts-player'),null);
 }finally{f.cleanup();}
});
test('reading follows chapters, pauses when browsing away and resumes saved anchors after remount',async()=>{
 const f=fixture();try{
  let view=await f.speech.mount(f.root,f.ui,'fixture',f.engine);await f.speech.open(f.root,f.ui,'fixture',f.engine);f.root.querySelector('.qbr-tts-play').click();await tick();await tick();
  f.store.set({chapterIndex:1});f.speech.relocated();assert.equal(view.plugin.tts.owner.follow,false);for(let n=0;n<10&&!view.plugin.tts.waitingSection;n++){view.plugin.tts.audio.onended();await tick();}assert.equal(view.plugin.tts.state,'paused');assert.equal(view.plugin.tts.waitingSection,true);assert.equal(f.store.get().chapterIndex,1);
  f.root.querySelector('.qbr-tts-play').click();await tick();await tick();assert.equal(view.plugin.tts.state,'playing');assert.match(view.plugin.tts.items[0].text,/第二章/);await tick();assert.equal(f.saved().progress.fixture.page,2);
  f.speech.close();view=await f.speech.mount(f.root,f.ui,'fixture',f.engine);await f.speech.open(f.root,f.ui,'fixture',f.engine);f.root.querySelector('.qbr-tts-play').click();await tick();assert.equal(view.plugin.tts.items[0].page,2);
 }finally{f.cleanup();}
});
test('closing while bridge initializes cannot attach a late player',async()=>{
 const f=fixture();try{let release;f.features.reload=()=>new Promise(r=>{release=r;});const pending=f.speech.mount(f.root,f.ui,'fixture',f.engine);f.speech.close();release({settings:{tts:{provider:'edge',profiles:{}}}});assert.equal(await pending,null);assert.equal(f.root.querySelector('.qbr-tts-player'),null);}finally{f.cleanup();}
});
