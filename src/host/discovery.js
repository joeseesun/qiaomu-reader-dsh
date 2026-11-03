import { shelfDataUrl, shelfBookUrl, normalizeShelfBooks, normalizeShelfTopics, normalizeShelfDetail } from '../core/book-shelf.js';
import { parseFragment } from 'parse5';
import { parseEpub } from '../core/epub.js';
const ORIGIN = 'https://www.gutenberg.org';
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value || '';
const textOf = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textOf).join('');
function elements(root, tag) {
  const result = [];
  const visit = node => { if (node.tagName === tag) result.push(node); for (const child of node.childNodes || []) visit(child); };
  visit(root); return result;
}
const bookId = raw => {
  try { const u = new URL(raw, ORIGIN); return u.origin === ORIGIN ? /^\/ebooks\/(\d+)(?:\.opds)?$/.exec(u.pathname)?.[1] : null; }
  catch { return null; }
};
export function parseCatalog(xml) {
  const doc = parseFragment(xml);
  if (!elements(doc, 'feed').length) throw new Error('书源返回了无效目录');
  return elements(doc, 'entry').flatMap(entry => {
    const id = bookId(elements(entry, 'id').map(textOf)[0]);
    const title = elements(entry, 'title').map(textOf)[0]?.trim();
    const author = elements(entry, 'author').flatMap(n => elements(n, 'name')).map(textOf).join(', ')
      || elements(entry, 'content').filter(n => attr(n, 'type') === 'text').map(textOf).find(value => !/^[\d,. ]+\s+downloads?$/i.test(value)) || '';
    return id && title ? [{ id, title, author, identifier: `gutenberg:${id}`, pageUrl: `${ORIGIN}/ebooks/${id}` }] : [];
  }).filter((book, i, list) => list.findIndex(b => b.id === book.id) === i).slice(0, 25);
}
export function epubUrl(xml, id) {
  const choices = elements(parseFragment(xml), 'link').flatMap(node => {
    if (attr(node, 'type') !== 'application/epub+zip' || attr(node, 'rel') !== 'http://opds-spec.org/acquisition') return [];
    try {
      const u = new URL(attr(node, 'href'), ORIGIN);
      return u.origin === ORIGIN && u.pathname.startsWith(`/ebooks/${id}.epub`) ? [u.href] : [];
    } catch { return []; }
  });
  return choices.find(url => url.includes('.epub3.images')) || choices[0];
}
async function getBounded(url, limit, request) {
  const response = await request(url, { signal: AbortSignal.timeout(45000), redirect: 'manual', headers: { 'User-Agent': 'QiaomuReader/1.1' } });
  if (response.status >= 300 && response.status < 400) {
    const next = new URL(response.headers.get('location') || '', url);
    if (next.origin !== ORIGIN || next.href === url) throw new Error('书源重定向地址不受支持');
    return getBoundedFinal(next.href, limit, request);
  }
  return readResponse(response, limit);
}
async function getBoundedFinal(url, limit, request) {
  return readResponse(await request(url, { signal: AbortSignal.timeout(45000), redirect: 'error' }), limit);
}
async function readResponse(response, limit) {
  if (!response.ok) throw new Error(`书源请求失败：HTTP ${response.status}`);
  if (Number(response.headers.get('content-length')) > limit) throw new Error('下载文件超过大小限制');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length; if (size > limit) throw new Error('下载文件超过大小限制'); chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function searchBooks(query, request = globalThis.fetch) {
  const text = String(query || '').trim().slice(0, 200);
  if (!text) return { books: [] };
  const bytes = await getBounded(`${ORIGIN}/ebooks/search.opds/?query=${encodeURIComponent(text)}`, 2_000_000, request);
  return { books: parseCatalog(bytes.toString('utf8')) };
}
export async function downloadBook(id, request = globalThis.fetch) {
  if (!/^\d{1,10}$/.test(String(id))) throw new Error('无效的 Gutenberg 编号');
  const detail = await getBounded(`${ORIGIN}/ebooks/${id}.opds`, 2_000_000, request);
  const url = epubUrl(detail.toString('utf8'), id);
  if (!url) throw new Error('该版本没有可用 EPUB');
  const bytes = await getBounded(url, 30 * 1024 * 1024, request);
  const book = await parseEpub(bytes); // Validate ZIP CRC and readable spine before import.
  if (!book.chapters.length) throw new Error('下载文件没有可读章节');
  return { base64: bytes.toString('base64'), filename: `Gutenberg-${id}.epub`, identifier: `gutenberg:${id}` };
}

// Cache public metadata only. Never send local titles, queries or reading lists.
export function createShelfSource(request = globalThis.fetch) {
  const cached = new Map(), pending = new Map();
  async function json(url, normalize) {
    if (cached.has(url)) return cached.get(url);
    if (pending.has(url)) return pending.get(url);
    const work = (async () => {
      const response = await request(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = await readResponse(response, 12 * 1024 * 1024);
      const result = normalize(JSON.parse(bytes.toString('utf8')));
      if (cached.size >= 100) cached.delete(cached.keys().next().value);
      cached.set(url, result); return result;
    })().finally(() => pending.delete(url));
    pending.set(url, work); return work;
  }
  return async ({ kind = 'books', id } = {}) => {
    if (kind === 'detail') return json(shelfBookUrl(id), data => normalizeShelfDetail(data, id));
    if (kind === 'books') return json(shelfDataUrl('books'), normalizeShelfBooks);
    if (kind === 'topics') return json(shelfDataUrl('topics'), normalizeShelfTopics);
    if (kind === 'co-index') return json(shelfDataUrl('co-index'), data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid recommendation data');
      return Object.fromEntries(Object.entries(data).filter(([id, rows]) => /^OL\d+W$/.test(id) && Array.isArray(rows))
        .map(([id, rows]) => [id, rows.filter(value => /^OL\d+W$/.test(value)).slice(0, 200)]));
    });
    throw new Error('Unknown shelf request');
  };
}
