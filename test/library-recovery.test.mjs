import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hostHarness } from './host-harness.mjs';
import { createDataLayer } from '../src/client/bridge.js';
import { createBookState, addHighlight } from '../src/core/state.js';

test('remove, restart, restore and reimport preserve bytes, progress, notes and metadata', async () => {
  const host = await hostHarness();
  try {
    const input = { filename: 'book.txt', base64: Buffer.from('Keep this text').toString('base64'), author: 'Author', chapterCount: 2 };
    const { book } = await host.api.import(input);
    const state = addHighlight(createBookState(book.id), { chapterHref: 'text/page-1.xhtml', text: 'Keep', note: 'my note', textOffset: 0 }).state;
    state.locator.scroll = 0.45;
    await host.api.saveState(book.id, state);
    const notes = await host.api.exportNotes(book.id);
    await writeFile(notes.path, `Handwritten\n${notes.markdown}`);
    await host.api.remove(book.id);
    const restarted = host.restart();
    assert.equal((await restarted.library()).books.length, 0);
    assert.equal((await restarted.library()).removedBooks[0].id, book.id);
    assert.equal((await restarted.loadState(book.id)).locator.scroll, 0.45);
    assert.match(await readFile(notes.path, 'utf8'), /^Handwritten/);
    assert.equal(await readFile(path.join(host.root, '乔木阅读', book.file), 'utf8'), 'Keep this text');
    await restarted.restore(book.id);
    assert.equal((await restarted.library()).books[0].author, 'Author');
    await restarted.remove(book.id);
    const again = await restarted.import({ ...input, author: '' });
    assert.equal(again.book.author, 'Author');
    assert.equal(again.book.id, book.id);
    assert.equal((await restarted.library()).books.length, 1);
    assert.equal((await restarted.loadState(book.id)).highlights[0].note, 'my note');
  } finally { await host.cleanup(); }
});

test('concurrent imports and progress updates never overwrite library membership', async () => {
  const host = await hostHarness();
  try {
    const books = await Promise.all(Array.from({ length: 12 }, (_, i) => host.api.import({ filename: `${i}.txt`, base64: Buffer.from(`book ${i}`).toString('base64') })));
    assert.equal((await host.api.library()).books.length, 12);
    await Promise.all(books.flatMap(({ book }, i) => [host.api.saveState(book.id, createBookState(book.id)), i % 2 === 0 ? host.api.remove(book.id) : Promise.resolve()]));
    assert.equal((await host.api.library()).books.length, 6);
    assert.equal((await host.api.library()).removedBooks.length, 6);
  } finally { await host.cleanup(); }
});

test('host removal failure keeps client membership and state', async () => {
  const book = { id: 'remote-book', title: 'Book', format: 'txt', source: 'upload' };
  const data = createDataLayer({ host: { library: async () => ({ books: [book] }), loadState: async () => createBookState(book.id), remove: async () => { throw new Error('disk full'); } } });
  await data.refreshLibrary();
  await data.ensureState(book.id);
  const result = await data.removeBook(book.id);
  assert.equal(result.ok, false);
  assert.match(result.error, /disk full/);
  assert.ok(data.getLibrary().books.some(b => b.id === book.id));
  assert.ok(data.getState(book.id));
});
