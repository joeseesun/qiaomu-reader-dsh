import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STARTER_BOOKS } from '../media/starter-books.js';
import { createDataLayer } from '../src/client/bridge.js';
import { hostHarness } from './host-harness.mjs';
const original = STARTER_BOOKS[0];
test('old EPUB imports recover the actual embedded cover without changing book bytes or reading state', async () => {
  const host = await hostHarness();
  try {
    const { book } = await host.api.import({ filename: 'old.epub', base64: original.data });
    assert.equal(book.cover, null);
    await host.api.saveState(book.id, { bookId: book.id, locator: { scroll: .6 }, vocabulary: [{ id: 'v', term: 'reader' }] });
    const before = await host.api.loadState(book.id);
    const result = await host.api.bookCover({ bookId: book.id });
    assert.equal(result.cover, original.cover);
    assert.equal((await host.restart().library()).books[0].cover, original.cover);
    assert.deepEqual(await host.api.loadState(book.id), before);
    assert.deepEqual(await readFile(path.join(host.root, '乔木阅读', book.file)), Buffer.from(original.data, 'base64'));
    assert.equal((await host.api.bookCover({ bookId: 'missing' })).cover, null);
  } finally { await host.cleanup(); }
});
test('offline-to-host migration carries the extracted real cover', async () => {
  const cache = new Map();
  globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) };
  const host = await hostHarness();
  try {
    const data = createDataLayer(); await data.refreshLibrary();
    const bytes = Uint8Array.from(Buffer.from(original.data, 'base64'));
    const result = await data.importBook({ name: 'cover.epub', arrayBuffer: async () => bytes.buffer });
    assert.equal(result.book.cover, original.cover);
    await data.setHost(host.api);
    assert.equal((await host.api.library()).books[0].cover, original.cover);
  } finally { await host.cleanup(); }
});
