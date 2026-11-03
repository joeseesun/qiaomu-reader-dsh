import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateSelection, normalizeTranslationTarget, translationChunks, MAX_TRANSLATION_LENGTH } from '../src/host/translation.js';
import { sameLanguage, fallbackTarget, lookupEngine, buildTranslateMessages } from '../src/core/lookup.js';
import { readLookupPreferences, saveLookupPreferences, sessionLookupTarget, setSessionLookupTarget } from '../src/ui/lookup-locale.js';

const payload = (meaning, language = 'en', dictionary = null) => [[[meaning, 'source']], dictionary, language];
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('lookup returns dictionary senses and only sends selection to the fixed Google endpoint', async () => {
  const calls = [];
  const result = await translateSelection({ text: 'curiosity', target: 'zh-CN', context: 'private context', book: 'private book', url: 'http://bad.test' }, async (url, options) => {
    calls.push([new URL(url), options]); return json(payload('好奇心', 'en', [['noun', ['好奇心', '好奇']]]));
  });
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url.origin, 'https://translate.googleapis.com');
  assert.equal(url.searchParams.get('q'), 'curiosity');
  assert.deepEqual(url.searchParams.getAll('dt'), ['t', 'bd']);
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers, undefined);
  assert.equal(url.href.includes('private'), false);
  assert.equal(result.card.meaning, '好奇心');
  assert.deepEqual(result.card.senses, [{ pos: 'noun', def: '好奇心；好奇' }]);
  assert.equal(result.kind, 'word');
});

test('same-language Chinese switches to English without modifying the saved target', async () => {
  const targets = [], input = { text: '好奇心', target: 'zh-CN' };
  const result = await translateSelection(input, async url => {
    const target = new URL(url).searchParams.get('tl'); targets.push(target);
    return json(payload(target === 'en' ? 'curiosity' : '好奇心', 'zh-CN'));
  });
  assert.deepEqual(targets, ['zh-CN', 'en']);
  assert.equal(input.target, 'zh-CN');
  assert.equal(result.requestedTarget, 'zh-CN');
  assert.equal(result.target, 'en');
  assert.equal(result.detectedLanguage, 'zh-CN');
});

test('same-language English switches to Chinese and cannot loop indefinitely', async () => {
  let calls = 0;
  const result = await translateSelection({ text: 'hello', target: 'en' }, async () => { calls++; return json(payload('你好', 'en')); });
  assert.equal(calls, 2); assert.equal(result.target, 'zh-CN');
});

test('long passages use one detected target and do not lose Unicode or whitespace between requests', async () => {
  const text = 'A sentence. '.repeat(130) + '😀 hello\nnext paragraph.';
  const sent = [], targets = [];
  const result = await translateSelection({ text, target: 'en' }, async url => {
    const u = new URL(url), q = u.searchParams.get('q'); sent.push(q); targets.push(u.searchParams.get('tl'));
    assert.deepEqual(u.searchParams.getAll('dt'), ['t']);
    return json(payload(q, 'en'));
  });
  assert.equal(result.kind, 'passage');
  assert.equal(sent.slice(1).join(''), text);
  assert.deepEqual(targets, ['en', ...targets.slice(1).map(() => 'zh-CN')]);
  assert.equal(translationChunks('a'.repeat(999) + '😀x').join(''), 'a'.repeat(999) + '😀x');
});

test('invalid inputs are rejected before networking', async () => {
  let calls = 0; const request = async () => { calls++; return json(payload('x')); };
  for (const [input, code] of [[{}, 'text'], [{ text: ' ' }, 'text'], [{ text: 'a'.repeat(MAX_TRANSLATION_LENGTH + 1) }, 'length'], [{ text: 'hi', target: 'https://bad' }, 'target']]) {
    await assert.rejects(translateSelection(input, request), { code });
  }
  assert.equal(calls, 0);
});

test('language variants preserve Chinese script and fallback semantics', () => {
  assert.equal(normalizeTranslationTarget('zh_Hant'), 'zh-TW');
  assert.equal(normalizeTranslationTarget('pt-BR'), 'pt');
  assert.equal(sameLanguage('en-US', 'en'), true);
  assert.equal(sameLanguage('zh-TW', 'zh-CN'), false);
  assert.equal(fallbackTarget('zh-TW'), 'en');
  assert.equal(lookupEngine({ translateEngine: 'ai' }, false), 'google');
  assert.match(buildTranslateMessages({ text: 'hola', target: 'ja' })[0].content, /日本語/);
});

test('rate limiting and HTTP failures have bounded actionable errors', async () => {
  for (const status of [429, 503, 403]) {
    await assert.rejects(translateSelection({ text: 'hello' }, async () => new Response('failure', { status })), { code: status === 403 ? 'http' : 'limit' });
  }
});

test('malformed and empty replies never become a successful blank translation', async () => {
  for (const [value, code] of [['<html>error', 'response'], ['{}', 'response'], ['[[],null,"en"]', 'empty']]) {
    await assert.rejects(translateSelection({ text: 'hello' }, async () => new Response(value)), { code });
  }
});

test('oversized declared and streaming responses are rejected', async () => {
  await assert.rejects(translateSelection({ text: 'hello' }, async () => new Response('[]', { headers: { 'Content-Length': '99999999' } })), { code: 'size' });
  await assert.rejects(translateSelection({ text: 'hello' }, async () => new Response('x'.repeat(512 * 1024 + 1))), { code: 'size' });
});

test('network failures do not leak the selected text and a subsequent retry succeeds', async () => {
  await assert.rejects(translateSelection({ text: 'private excerpt' }, async url => { throw new Error(`fetch ${url}`); }), error => error.code === 'network' && !error.message.includes('private'));
  assert.equal((await translateSelection({ text: 'hello' }, async () => json(payload('你好')))).text, '你好');
});

test('cancel before sending makes no request', async () => {
  const abort = new AbortController(); abort.abort(); let calls = 0;
  await assert.rejects(translateSelection({ text: 'hello' }, async () => { calls++; }, { signal: abort.signal }), { code: 'cancelled' });
  assert.equal(calls, 0);
});

test('cancellation between fallback requests cannot deliver a stale result', async () => {
  const abort = new AbortController(); let calls = 0;
  await assert.rejects(translateSelection({ text: 'hello', target: 'en' }, async () => {
    calls++; abort.abort(); return json(payload('hello', 'en'));
  }, { signal: abort.signal }), { code: 'cancelled' });
  assert.equal(calls, 1);
});

test('temporary target is per reading session and never rewrites defaults', () => {
  let saved = ''; const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  assert.deepEqual(readLookupPreferences(storage), { engine: 'google', target: 'zh-CN' });
  saveLookupPreferences({ engine: 'ai', target: 'ja' }, storage);
  setSessionLookupTarget('test-book', 'en');
  assert.equal(sessionLookupTarget('test-book', 'ja'), 'en');
  assert.equal(sessionLookupTarget('other-book', 'ja'), 'ja');
  assert.deepEqual(readLookupPreferences(storage), { engine: 'ai', target: 'ja' });
  saved = '{corrupt';
  assert.deepEqual(readLookupPreferences(storage), { engine: 'google', target: 'zh-CN' });
  assert.throws(() => saveLookupPreferences({ engine: 'google', target: 'en' }, { setItem: () => { throw new Error('quota'); } }));
});

test('Host exposes translation to the same remote operation without requiring AI or activation', async () => {
  const { hostHarness } = await import('./host-harness.mjs');
  const host = await hostHarness(), original = globalThis.fetch;
  globalThis.fetch = async () => json(payload('好奇心'));
  try { assert.equal((await host.api.translateSelection({ text: 'curiosity' })).text, '好奇心'); }
  finally { globalThis.fetch = original; await host.cleanup(); }
});
