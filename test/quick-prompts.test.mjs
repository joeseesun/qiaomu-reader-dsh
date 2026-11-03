import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readQuickPrompts, saveQuickPrompts, resetQuickPrompts } from '../src/ui/quick-prompts.js';
import { LIBRARY_MESSAGES, flatMessages } from '../src/ui/library-locale.js';
test('default prompts follow language, custom and empty lists survive changes, restore follows language', () => {
  let value = null, events = 0;
  globalThis.localStorage = { getItem: () => value, setItem: (_, v) => { value = v; }, removeItem: () => { value = null; } };
  globalThis.window = { dispatchEvent: () => events++ };
  assert.equal(readQuickPrompts('en')[0].title, 'Summarize');
  const custom = [{ id: 'custom', title: '我写的', body: 'keep me' }];
  saveQuickPrompts(custom); assert.deepEqual(readQuickPrompts('en'), custom);
  saveQuickPrompts([]); assert.deepEqual(readQuickPrompts('zh'), []);
  resetQuickPrompts(); assert.equal(readQuickPrompts('zh')[0].title, '概括要点'); assert.equal(events, 3);
  value = '{broken'; assert.equal(readQuickPrompts('en')[0].title, 'Summarize');
});
test('storage failure leaves saved prompts intact and emits no success notification', () => {
  const saved = JSON.stringify([{ id: 'old', title: 'Old', body: 'Original' }]);
  globalThis.localStorage = { getItem: () => saved, setItem: () => { throw Error('disk full'); }, removeItem: () => { throw Error('disk full'); } };
  globalThis.window = { dispatchEvent: () => assert.fail('must not notify failed save') };
  assert.throws(() => saveQuickPrompts([]), /disk full/);
  assert.throws(resetQuickPrompts, /disk full/);
  assert.equal(readQuickPrompts()[0].id, 'old');
});
test('new locale keys match between Chinese and English', () => {
  const zh = flatMessages(LIBRARY_MESSAGES.zh), en = flatMessages(LIBRARY_MESSAGES.en);
  for (const key of Object.keys(zh).filter(k => /^(shelf|prompts)\./.test(k))) assert.ok(en[key], key);
});

test('locale files preserve the new registered prompt and shelf messages', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const lang of ['zh', 'en']) {
    const file = JSON.parse(await readFile(new URL(`../locale/${lang}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(file.prompts, LIBRARY_MESSAGES[lang].prompts);
    assert.deepEqual(file.shelf, LIBRARY_MESSAGES[lang].shelf);
  }
});
