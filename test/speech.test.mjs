import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechController, speechSegments } from '../src/client/tts.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
const engine = { chapterCount: () => 3, plainTextOf: async i => ['First. Again.', '', 'Last.'][i] };

test('continuous speech skips empty chapters, saves each sentence and ends once', async () => {
  const spoken = [], saved = [];
  const c = createSpeechController({ engine, provider: { cancel() {}, async speak(text) { spoken.push(text); } }, onPosition: p => saved.push(p) });
  await c.play();
  assert.deepEqual(spoken, ['First.', 'Again.', 'Last.']);
  assert.equal(c.snapshot().status, 'ended');
  assert.equal(saved.filter(p => p.ended).length, 1);
  assert.equal(saved.find(p => p.text === 'Last.').chapterIndex, 2);
});

test('pause and late provider completion cannot advance into the next sentence', async () => {
  const spoken = []; let finish;
  const c = createSpeechController({ engine, provider: { cancel() {}, speak(text) { spoken.push(text); return new Promise(r => { finish = r; }); } } });
  const run = c.play(); await tick(); c.pause(); finish(); await run;
  assert.equal(c.snapshot().status, 'paused');
  assert.deepEqual(spoken, ['First.']);
  const resumed = c.play(); await tick(); c.dispose(); finish(); await resumed;
  assert.deepEqual(spoken, ['First.', 'First.']);
});

test('saved next-sentence position resumes without skipping unread text', async () => {
  const spoken = [];
  const c = createSpeechController({ engine, position: { chapterIndex: 0, segment: 1 }, provider: { cancel() {}, async speak(text) { spoken.push(text); } } });
  await c.play(); assert.deepEqual(spoken, ['Again.', 'Last.']);
});

test('voice errors are recoverable and pending chapter reads cancel on disposal', async () => {
  let fail = true;
  const c = createSpeechController({ engine, provider: { cancel() {}, async speak() { if (fail) throw new Error('voice unavailable'); } } });
  await c.play(); assert.equal(c.snapshot().status, 'error');
  fail = false; await c.play(); assert.equal(c.snapshot().status, 'ended');
  let release; let count = 0;
  const loading = createSpeechController({ engine: { chapterCount: () => 1, plainTextOf: () => new Promise(r => { release = r; }) }, provider: { cancel() {}, speak() { count++; } } });
  const run = loading.play(); loading.dispose(); release('Must not play.'); await run; assert.equal(count, 0);
});

test('long sentences are bounded and repeated quotes retain distinct offsets', () => {
  const parts = speechSegments('Same. Same. ' + '字'.repeat(1000));
  assert.notEqual(parts[0].offset, parts[1].offset);
  assert.ok(parts.every(p => p.text.length <= 220));
});
