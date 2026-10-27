import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeBookText, parseTextBook } from '../src/client/text-book.js';
import { createDataLayer } from '../src/client/bridge.js';
import { hostHarness } from './host-harness.mjs';
const bytes = text => new TextEncoder().encode(text);

test('UTF-8/UTF-16 BOMs and GB18030 decode without replacement characters', () => {
  assert.equal(decodeBookText(bytes('\uFEFF中文\r\n正文')), '中文\n正文');
  assert.equal(decodeBookText(Uint8Array.from([255, 254, 45, 78, 135, 101])), '中文');
  assert.equal(decodeBookText(Uint8Array.from([254, 255, 78, 45, 101, 135])), '中文');
  assert.equal(decodeBookText(Uint8Array.from([214, 208, 206, 196])), '中文');
  for (const input of [[255, 254, 1], [239, 187, 191, 255], [0, 1, 2]]) assert.throws(() => decodeBookText(Uint8Array.from(input)));
});

test('GFM tables/tasks/code and heading links are readable and searchable', async () => {
  const parsed = parseTextBook(bytes('# One\n\n[Next](#two)\n\n- [x] done\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n## Two\n\n```js\nalert("not executed")\n```'), 'Book', 'md');
  assert.equal(parsed.engine.chapterCount(), 2);
  const html = await parsed.engine.render(0);
  assert.match(html, /<table>/);
  assert.match(html, /☑/);
  assert.match(html, /text\/page-2.xhtml#heading/);
  assert.equal((await parsed.engine.search('not executed'))[0].chapterIndex, 1);
  assert.equal(parsed.engine.resolveLink(0, 'page-2.xhtml#two'), 1);
});

test('HTML cleans executable content, URL obfuscation, styles and foreign namespaces', async () => {
  const parsed = parseTextBook(bytes('<html><head><title>Title</title></head><body><h1>Safe</h1><p style="position:fixed" onclick="evil()">text</p><script>evil()</script><svg><a href="javascript:evil()">bad</a></svg><a href="java&#x09;script:evil()">link</a><iframe srcdoc="bad"></iframe><img src="file:///private/test" onerror="evil()" alt="local image"></body></html>'), 'Book', 'html');
  assert.equal(parsed.book.title, 'Title');
  const html = await parsed.engine.render(0);
  assert.doesNotMatch(html, /evil|style=|onclick|iframe|<svg|file:/);
  assert.match(html, /local image/);
});

test('TXT chapter recognition is versioned so old highlights keep original coordinates', async () => {
  const input = bytes('第一章 开始\n第一段\n\n第二章 结束\n第二段');
  const latest = parseTextBook(input, 'Book');
  const legacy = parseTextBook(input, 'Book', 'txt', { layout: 1 });
  assert.equal(latest.engine.chapterCount(), 2);
  assert.equal(legacy.engine.chapterCount(), 1);
  assert.equal(legacy.book.chapters[0].href, 'text/page-1.xhtml');
  assert.match(await legacy.engine.plainTextOf(0), /第二章/);
});

test('MD/HTML/TXT import through client and host shares Agent chapter content after restart', async () => {
  const host = await hostHarness();
  try {
    for (const [name, source] of [['book.markdown', '# One\n\nHello\n\n## Two\n\nWorld'], ['book.htm', '<h1>One</h1><p>Hello</p><h2>Two</h2><p>World</p>'], ['book.txt', '第一章 开始\nHello\n第二章 结束\nWorld']]) {
      const data = createDataLayer({ host: host.api });
      await data.refreshLibrary();
      const imported = await data.importBook({ name, arrayBuffer: async () => bytes(source).buffer });
      assert.equal(imported.ok, true);
      const reopened = createDataLayer({ host: host.restart() });
      await reopened.refreshLibrary();
      const record = await reopened.openBook(imported.book.id);
      assert.equal(record.engine.chapterCount(), 2);
      const agent = await host.tool.execute({ action: 'read', id: imported.book.id, chapter: 2 });
      assert.equal(agent.text, await record.engine.plainTextOf(1));
    }
    const indexPath = path.join(host.root, '乔木阅读/library.json');
    const index = JSON.parse(await readFile(indexPath));
    const old = index.books.find(b => b.format === 'txt'); delete old.textLayout;
    await writeFile(indexPath, JSON.stringify(index));
    const original = await host.api.readBookBytes(old.id);
    await host.api.remove(old.id);
    const again = await host.api.import({ filename: 'renamed.txt', base64: original.base64 });
    assert.equal(again.book.textLayout, 1);
    assert.equal(again.book.chapterCount, 1);
  } finally { await host.cleanup(); }
});
