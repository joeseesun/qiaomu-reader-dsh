import test from 'node:test';
import assert from 'node:assert/strict';
import { readingPositionModel, parseReadingPosition, positionForLocator } from '../src/core/reading-position.js';
import { addBookmark, createBookState, normalizeState } from '../src/core/state.js';

test('stable text locations cross chapter boundaries and ignore layout settings', async () => {
  let calls=0;
  const engine={book:{},chapterCount:()=>3,plainTextOf:async index=>{calls++;return ['a'.repeat(1000),'b'.repeat(2000),''][index];}};
  const model=await readingPositionModel(engine);
  assert.equal(await readingPositionModel(engine),model);
  assert.equal(calls,3);
  assert.equal(model.total,2);
  assert.deepEqual(parseReadingPosition('2',model),{chapterIndex:1,textOffset:500,scroll:0.25});
  assert.equal(positionForLocator(model,{chapterIndex:1,textOffset:500,scroll:0.9}).current,2);
  for(const value of ['0','3','1.5','2x','', '-1','9007199254740992'])assert.equal(parseReadingPosition(value,model),null);
  assert.deepEqual(parseReadingPosition('100%',model),{fraction:1});
  assert.equal(parseReadingPosition('101%',model),null);
});

test('publication page labels support Roman numerals and reject ambiguous labels',async()=>{
  const engine={book:{pageList:[{label:'iv',href:'a#iv'},{label:'1',href:'a#p1',children:[{label:'2',href:'b#p2'}]}]},chapterCount:()=>2,plainTextOf:async()=> 'content'};
  const model=await readingPositionModel(engine);
  assert.equal(model.kind,'original');assert.equal(model.total,3);
  assert.deepEqual(parseReadingPosition('IV',model),{href:'a#iv'});
  assert.equal(parseReadingPosition('3',model),null);
  assert.equal(positionForLocator(model,{originalPage:'iv'}).current,'iv');
  assert.equal(parseReadingPosition('1',{...model,pages:[...model.pages,{label:'1',href:'other'}]}),null);
});

test('PDF positions use physical pages without fetching all page text',async()=>{
  const model=await readingPositionModel({book:{format:'pdf'},chapterCount:()=>20,plainTextOf:()=>{throw Error('must not scan');}});
  assert.deepEqual(parseReadingPosition('20',model),{chapterIndex:19,scroll:0});
  assert.equal(parseReadingPosition('21',model),null);
  assert.equal(positionForLocator(model,{chapterIndex:8}).current,9);
});

test('named bookmarks retain semantic locator through a serialized restart',()=>{
  const locator={chapterIndex:2,chapterHref:'text/3.xhtml',scroll:0.4,textOffset:2200,textQuote:'A stable sentence',contentFingerprint:'sha256:book'};
  const {state}=addBookmark(createBookState('b'),{label:'Read this again',percent:0.5,locator});
  const restored=normalizeState(JSON.parse(JSON.stringify(state)), 'b');
  assert.equal(restored.bookmarks[0].label,'Read this again');
  assert.deepEqual(restored.bookmarks[0].locator,locator);
});

 test('chapter lookup strips publication page fragments',async()=>{const {chapterIndexForHref}=await import('../src/ui/format.js');assert.equal(chapterIndexForHref({book:{chapters:[{href:'book/chapter.xhtml'}]}},'book/chapter.xhtml#iv'),0);});
