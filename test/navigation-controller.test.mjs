import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createUiStore } from '../src/ui/store.js';
import { createBookState } from '../src/core/state.js';
const {outputFiles}=await build({entryPoints:['src/ui/controller.js'],bundle:true,write:false,format:'cjs',platform:'node',external:['react']});
const module={exports:{}};
vm.runInNewContext(outputFiles[0].text,{module,exports:module.exports,require:()=>({}),setTimeout,clearTimeout,console,URL,Uint8Array});
const {createController}=module.exports;
function harness(){
  let failed=false,saved;
  const store=createUiStore({bookId:'b',chapterIndex:1,states:{b:createBookState('b')}});
  const ui=createController(()=>({engineOf:()=>({book:{chapters:[{href:'a'},{href:'b'}]},chapterCount:()=>2,resolveLink:()=>({chapterIndex:1})}),actions:{saveState:async(_id,state)=>{if(failed)throw Error('Disk full');saved=structuredClone(state);}}}),store);
  ui.registerPager({capture:()=>({chapterIndex:1,chapterHref:'b',scroll:0.3,textOffset:500,textQuote:'Remember this'})});
  return {ui,store,fail:value=>{failed=value;},saved:()=>saved};
}
test('bookmark failed save retains draft and retry renames same entry without duplicates',async()=>{
  const h=harness();h.fail(true);let id;
  await assert.rejects(h.ui.saveBookmark({label:'Draft'}),error=>{id=error.bookmarkId;return error.message==='Disk full'&&!!id;});
  assert.equal(h.store.get().states.b.bookmarks.length,1);
  h.fail(false);await h.ui.saveBookmark({id,label:'Final'});
  assert.equal(h.saved().bookmarks.length,1);assert.equal(h.saved().bookmarks[0].label,'Final');
  assert.equal(h.saved().bookmarks[0].locator.textOffset,500);
  h.ui.openBookmark(h.saved().bookmarks[0]);
  assert.equal(h.store.get().restoreAnchor.textQuote,'Remember this');
  await h.ui.flushState('b');
});
test('failed bookmark deletion restores entries while preserving latest reader position',async()=>{
  const h=harness();const bookmark=await h.ui.saveBookmark({label:'Keep'});h.fail(true);
  await assert.rejects(h.ui.deleteBookmark(bookmark.id),/Disk full/);
  assert.equal(h.store.get().states.b.bookmarks[0].id,bookmark.id);
  h.fail(false);await h.ui.deleteBookmark(bookmark.id);
  assert.equal(h.saved().bookmarks.length,0);
});
test('layout settings capture an anchor before reflow and reject bookmarks during chapter loading',async()=>{
  const h=harness();h.ui.updateSettings('b',{fontSize:28});
  assert.equal(h.store.get().restoreAnchor.textOffset,500);
  assert.equal(h.store.get().states.b.settings.fontSize,28);
  h.store.set({chapterBusy:true});await assert.rejects(h.ui.saveBookmark({label:'Too early'}),/加载完成/);
  await h.ui.flushState('b');
});

test('position reports clear one-time fragment targets before creating bookmarks',async()=>{
 const h=harness();h.ui.goHref('b#note');assert.equal(h.store.get().restoreAnchor.fragment,'note');
 h.ui.reportPosition('b',{chapterIndex:1,scroll:0.3,textOffset:500,textQuote:'Remember this'});
 assert.equal(h.store.get().states.b.locator.fragment,'');await h.ui.flushState('b');
});
