import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeShelfBooks, searchShelf, shelfOrder, recommendShelf, toggleShelfMark, matchLibraryBooks } from '../src/core/book-shelf.js';
import { createShelfSource } from '../src/host/discovery.js';
import { hostHarness } from './host-harness.mjs';
const rows = normalizeShelfBooks([
  { id: 'OL1W', t: 'Deep Work', tz: '深度工作', a: ['Cal Newport'], tp: ['work'], q: 90, s: 20, ru: 10, y: 1980, lr: 2 },
  { id: 'OL2W', t: 'Next Book', a: ['Writer'], tp: ['work'], q: 70, s: 50, ru: 10, y: 2020, lr: 1 },
  { id: '../bad', t: 'Bad' },
]);
test('shelf ranks, searches bilingual titles/authors, matches library and recommends without seeds', () => {
  assert.equal(rows.length, 2);
  assert.equal(searchShelf(rows, '深度工作')[0].id, 'OL1W');
  assert.equal(searchShelf(rows, 'newport')[0].id, 'OL1W');
  assert.equal(shelfOrder(rows, 'top')[0].id, 'OL2W');
  assert.deepEqual(shelfOrder(rows, 'lindy', { lastYear: 2026 }).map(b => b.id), ['OL1W']);
  const seeds = matchLibraryBooks(rows, ['Deep Work.epub']);
  assert.deepEqual([...seeds], ['OL1W']);
  assert.deepEqual(recommendShelf(rows, { OL1W: ['OL2W', 'OL1W'] }, seeds).map(b => b.id), ['OL2W']);
  assert.deepEqual(recommendShelf(rows, {}, new Set()), []);
});
test('public source coalesces requests, retries failures and only fetches fixed public metadata', async () => {
  let calls = 0;
  const source = createShelfSource(async (url, options) => {
    calls++; assert.match(url, /^https:\/\/hackerbooks.qiaomu.ai\/data\/books.json$/);
    assert.equal(options.redirect, 'error');
    return calls === 1 ? new Response('failed', { status: 503 }) : Response.json(rows);
  });
  await assert.rejects(source({ kind: 'books', query: 'private title' }), /503/);
  await Promise.all([source({ kind: 'books' }), source({ kind: 'books' })]);
  await source({ kind: 'books' }); assert.equal(calls, 2);
  await assert.rejects(source({ kind: 'detail', id: '../../private' }), /Invalid/);
  await assert.rejects(createShelfSource(async () => Response.json({}))({ kind: 'books' }), /Invalid/);
});
test('lists survive host restart, serialize concurrent changes, preserve corrupt file and retry', async () => {
  const host = await hostHarness();
  try {
    await Promise.all([host.api.markShelf({ id: 'OL1W', status: 'wish' }), host.api.markShelf({ id: 'OL2W', status: 'read' })]);
    const saved = await host.restart().shelfMarks();
    assert.equal(saved.OL1W.s, 'wish'); assert.equal(saved.OL2W.s, 'read');
    const file = path.join(host.root, '乔木阅读/reading-lists.json');
    await writeFile(file, '{broken');
    await assert.rejects(host.api.markShelf({ id: 'OL1W', status: 'read' }), /已保留原文件/);
    assert.equal(await readFile(file, 'utf8'), '{broken');
    await writeFile(file, JSON.stringify(saved));
    await host.api.markShelf({ id: 'OL1W', status: 'read' });
    assert.equal((await host.api.shelfMarks()).OL1W.s, 'read');
    assert.equal(toggleShelfMark(saved, 'OL1W', 'wish').OL1W, undefined);
  } finally { await host.cleanup(); }
});

test('malformed optional display metadata cannot escape normalization', () => {
  const book = normalizeShelfBooks([{ id: 'OL99W', t: 'Safe', tz: {}, w: [], k: {}, a: [null, 'Author'], q: 'bad', tp: [false, 'work'] }])[0];
  assert.equal(book.tz, ''); assert.equal(book.w, ''); assert.deepEqual(book.k, []);
  assert.equal(book.q, null); assert.deepEqual(book.a, ['Author']); assert.deepEqual(book.tp, ['work']);
});
