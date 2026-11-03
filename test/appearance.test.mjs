import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAppearance,verticalPageOffset} from '../src/core/appearance.js';
import {READER_THEMES} from '../src/core/reader-themes.js';

test('original palette set includes Host-follow and readable e-ink colors',()=>{
 for(const id of ['auto','bright','paper','rice','warm','celadon','bamboo','moon','mist','night','deepsea','black','eink'])assert.ok(READER_THEMES[id]?.bg,id);
 assert.match(READER_THEMES.auto.bg,/--dsw-alias-bg-layer-1/);
 assert.equal(READER_THEMES.eink.bg,'#ffffff');assert.equal(READER_THEMES.eink.text,'#000000');
});
test('appearance retains legacy alignment and original font limits while bounding imported settings',()=>{
 assert.equal(normalizeAppearance({justify:false}).textAlign,'left');
 assert.equal(normalizeAppearance({justify:true}).textAlign,'justify');
 assert.equal(normalizeAppearance({textAlign:'right',justify:true}).textAlign,'right');
 assert.equal(normalizeAppearance({fontSize:32}).fontSize,32);assert.equal(normalizeAppearance({fontSize:12}).fontSize,12);
 const bounded=normalizeAppearance({fontSize:500,maxLineCh:-4,textAlign:'inject',vAlign:'invalid',navMode:'invalid',pageButtonsVisibility:'invalid'});
 assert.equal(bounded.fontSize,32);assert.equal(bounded.maxLineCh,0);assert.equal(bounded.vAlign,'top');assert.equal(bounded.navMode,'buttons');assert.equal(bounded.pageButtonsVisibility,'hover');
});
test('short page alignment does not shift full or empty pages',()=>{
 assert.equal(verticalPageOffset(600,200,'center'),200);assert.equal(verticalPageOffset(600,200,'bottom'),400);
 assert.equal(verticalPageOffset(600,590,'bottom'),0);assert.equal(verticalPageOffset(600,0,'center'),0);assert.equal(verticalPageOffset(600,200,'top'),0);
});
