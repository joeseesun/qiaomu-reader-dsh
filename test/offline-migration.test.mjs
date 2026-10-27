import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDataLayer } from '../src/client/bridge.js';
import { build } from 'esbuild';
const controllerBuild = await build({ entryPoints:['src/ui/controller.js'], bundle:true, write:false, format:'esm', platform:'node', plugins:[{name:'react-unused',setup(b){b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const createElement=()=>null, useEffect=()=>{}, useLayoutEffect=()=>{};'}));}}] });
const { createController } = await import(`data:text/javascript;base64,${Buffer.from(controllerBuild.outputFiles[0].text).toString('base64')}`);
import { createUiStore } from '../src/ui/store.js';
import { saveLocalState } from '../src/client/storage.js';
import { hostHarness } from './host-harness.mjs';

const cache = new Map();
globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) };

test('offline archived book migrates with speech, vocabulary and backlinks and survives host restart', async () => {
  cache.clear(); const host = await hostHarness();
  try {
    const data = createDataLayer(); await data.refreshLibrary();
    const { book } = await data.importBook({ name: 'Offline.txt', arrayBuffer: async () => new TextEncoder().encode('Offline book text').buffer });
    const oldState = await data.ensureState(book.id);
    const state = { ...oldState, updatedAt: Date.now(), locator: { ...oldState.locator, scroll: .7 }, speech: { chapterIndex: 0, segment: 2 }, vocabulary: [{ id:'v1', term:'text', meaning:'文字' }] };
    data.persistState(book.id, state); await data.flushStateWrites(book.id);
    assert.equal((await data.removeBook(book.id)).ok,true);
    await data.setHost(host.api);
    const archived = data.getLibrary().removedBooks;
    assert.equal(archived.length,1);
    const persisted = await host.restart().loadState(archived[0].id);
    assert.equal(persisted.locator.scroll,.7); assert.equal(persisted.speech.segment,2); assert.equal(persisted.vocabulary[0].meaning,'文字');
    assert.equal(data.resolveBookId(book.id), archived[0].id);
    assert.equal((await data.restoreBook(archived[0].id)).ok,true);
    assert.equal((await host.api.library()).books.length,1);
  } finally { await host.cleanup(); cache.clear(); }
});

test('newer unsynced local state is recovered instead of stale host state', async () => {
  cache.clear();
  await saveLocalState('b',{bookId:'b',updatedAt:200,locator:{scroll:.8},vocabulary:[{id:'v'}]});
  const data=createDataLayer({host:{loadState:async()=>({bookId:'b',updatedAt:100,locator:{scroll:.1}})}});
  assert.equal((await data.ensureState('b')).locator.scroll,.8);
  assert.equal(data.getState('b').vocabulary.length,1);
  cache.clear();
});

test('vocabulary save reports host failure while keeping retryable local edits', async()=>{
  const store=createUiStore();
  const ui=createController(()=>({stateOf:async()=>({bookId:'b',highlights:[],updatedAt:0}),actions:{saveState:async()=>({ok:false,error:'disk full'})}}),store);
  await assert.rejects(ui.saveVocabulary('b',{term:'word',context:'A word',meaning:'词',chapterHref:'text/page-1.xhtml',textOffset:2}),/disk full/);
  assert.equal(ui.stateOr('b').vocabulary.length,1);
});

test('large-library metadata lookup is indexed and refreshes after membership replacement',()=>{
  let idReads=0;
  let rows=Array.from({length:10000},(_,i)=>({get id(){idReads++; return String(i)},title:String(i),readProgress:0,highlightCount:0}));
  const ui=createController(()=>({getBooks:()=>rows}));
  const first=ui.books(); assert.equal(ui.books(),first);
  for(let i=0;i<10000;i++) {assert.equal(ui.bookOf(String(i)).title,String(i));ui.progressOfBook(String(i));ui.highlightCountOf(String(i));}
  assert.ok(idReads<20000,`Expected indexed reads, received ${idReads}`);
  rows=[{id:'new',title:'New'}];assert.equal(ui.bookOf('9999'),null);assert.equal(ui.bookOf('new').title,'New');
});


test('migration preserves the newer speech and vocabulary fields from the host', async()=>{
  const { mergeStates }=await import('../src/core/state.js');
  const merged=mergeStates({bookId:'b',updatedAt:200,speech:{segment:8},vocabulary:[{id:'new'}]}, {bookId:'b',updatedAt:100,speech:{segment:2},vocabulary:[{id:'old'}]});
  assert.equal(merged.speech.segment,8);assert.equal(merged.vocabulary[0].id,'new');
});
