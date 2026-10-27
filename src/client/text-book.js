import { Marked } from 'marked';
import { parse, parseFragment, serializeOuter } from 'parse5';
import { createReaderEngine } from '../core/reader.js';
import { toPlainText } from '../core/html.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function legacyTextBook(bytes, title = '文本') {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.trim()) throw new Error('TXT 文件没有可读文字');
  const chunks = [];
  const lines = text.split('\n');
  let current = [];
  let size = 0;
  for (const line of lines) {
    if (size >= 12000 && current.length) {
      chunks.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) chunks.push(current.join('\n'));
  const chapters = chunks.map((chunk, index) => ({
    href: `text/page-${index + 1}.xhtml`,
    label: chunks.length === 1 ? title : `第 ${index + 1} 部分`,
    xhtml: `<div class="qmr-txt-body">${chunk.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')}</div>`,
  }));
  const book = { title, author: '', format: 'txt', chapters, toc: chapters.map((chapter) => ({ href: chapter.href, label: chapter.label })) };
  return { book, engine: createReaderEngine(book), bytes };
}

const CHAPTER = /^(?:第[零〇一二三四五六七八九十百千万两\d]+[章回卷部节篇](?:\s.*|[^\s]{0,35})|(?:chapter|part|book)\s+(?:\d+|[ivxlcdm]+)\b.*|序章|序言|前言|楔子|尾声|后记)$/iu;
const markdown = new Marked({ gfm: true, breaks: false });
const SAFE = new Set('p div span section article h1 h2 h3 h4 h5 h6 strong b em i u s del sub sup br hr pre code blockquote ul ol li dl dt dd table thead tbody tfoot tr th td caption a img'.split(' '));
const DROP = new Set('script style iframe object embed form button textarea select svg math template noscript audio video'.split(' '));
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value || '';
const content = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(content).join('');
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };

export function decodeBookText(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length > 20 * 1024 * 1024) throw new Error('文本文件不能超过 20 MB');
  const encoding = data[0] === 255 && data[1] === 254 ? 'utf-16le' : data[0] === 254 && data[1] === 255 ? 'utf-16be' : 'utf-8';
  let text;
  try { text = new TextDecoder(encoding, { fatal: true }).decode(data); }
  catch {
    if (encoding !== 'utf-8' || (data[0] === 239 && data[1] === 187 && data[2] === 191)) throw new Error('无法解码文本编码');
    try { text = new TextDecoder('gb18030', { fatal: true }).decode(data); }
    catch { throw new Error('无法解码文本编码'); }
  }
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text)) throw new Error('文件含无效文本字符');
  if (!text.trim()) throw new Error('文件没有可读文字');
  return text;
}

// HTML5 parsing precedes the allowlist: imported styles, forms and namespaces
// must never reach the same-origin host document.
function cleanNodes(nodes) {
  return nodes.flatMap(node => {
    if (node.nodeName === '#text') return [node];
    if (!node.tagName || DROP.has(node.tagName) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return [];
    if (node.tagName === 'input') return attr(node, 'type') === 'checkbox'
      ? [{ nodeName: '#text', value: node.attrs.some(a => a.name === 'checked') ? '☑ ' : '☐ ' }] : [];
    node.childNodes = cleanNodes(node.childNodes || []);
    if (!SAFE.has(node.tagName)) return node.childNodes;
    node.attrs = (node.attrs || []).filter(a => {
      if (a.namespace || a.prefix) return false;
      if (['id', 'title', 'alt'].includes(a.name)) return true;
      if (['colspan', 'rowspan', 'start'].includes(a.name)) return /^\d{1,3}$/.test(a.value);
      if (a.name === 'href' && node.tagName === 'a') return /^(?:https?:\/\/|mailto:|#)/i.test(a.value) && !/[\u0000-\u0020]/.test(a.value);
      if (a.name === 'src' && node.tagName === 'img') return /^(?:https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(a.value) && !/[\u0000-\u0020]/.test(a.value);
      return false;
    });
    if (node.tagName === 'img' && !attr(node, 'src')) return [{ nodeName: '#text', value: attr(node, 'alt') }];
    return [node];
  });
}

export function parseTextBook(bytes, title = '文本', format = 'txt', options = {}) {
  // Old TXT positions use the original chapter boundaries and offsets.
  if (format === 'txt' && options.layout === 1) return legacyTextBook(bytes, title);
  let text = decodeBookText(bytes);
  let author = ''; let language = ''; let nodes;
  if (format === 'txt') {
    const html = text.split('\n').map(line => CHAPTER.test(line.trim()) && line.trim().length <= 80
      ? `<h2>${escapeHtml(line.trim())}</h2>` : `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
    nodes = parseFragment(html).childNodes;
  } else if (format === 'md') {
    const frontmatter = /^---\n[\s\S]*?\n(?:---|\.\.\.)\s*(?:\n|$)/.exec(text);
    if (frontmatter) text = text.slice(frontmatter[0].length);
    nodes = parseFragment(markdown.parse(text)).childNodes;
  } else {
    const doc = parse(text);
    let body;
    walk(doc, node => {
      if (node.tagName === 'title') title = content(node).trim() || title;
      if (node.tagName === 'meta' && attr(node, 'name') === 'author') author = attr(node, 'content');
      if (node.tagName === 'html') language = attr(node, 'lang');
      if (node.tagName === 'body') body = node;
    });
    nodes = body?.childNodes || [];
  }
  nodes = cleanNodes(nodes);
  const flatten = list => list.flatMap(n => ['div', 'section', 'article'].includes(n.tagName) ? flatten(n.childNodes) : [n]);
  nodes = flatten(nodes);
  const chunks = []; let current = []; let size = 0;
  const flush = () => { if (current.length) { chunks.push({ nodes: current }); current = []; size = 0; } };
  for (const node of nodes) {
    if (node.nodeName === '#text' && !node.value.trim()) continue;
    if (/^h[12]$/.test(node.tagName) || size > 24000) flush();
    current.push(node); size += content(node).length;
  }
  flush();
  const aliases = new Map();
  chunks.forEach((chunk, i) => {
    let label = '';
    for (const node of chunk.nodes) walk(node, n => {
      if (/^h[1-6]$/.test(n.tagName)) {
        label ||= content(n).trim();
        const id = attr(n, 'id') || `heading-${i}-${aliases.size}`;
        if (!attr(n, 'id')) n.attrs.push({ name: 'id', value: id });
        for (const key of [id, content(n).trim(), content(n).trim().toLowerCase().replace(/\s+/g, '-')]) {
          if (!aliases.has(key)) aliases.set(key, `page-${i + 1}.xhtml#${id}`);
        }
      }
      if (attr(n, 'id') && !aliases.has(attr(n, 'id'))) aliases.set(attr(n, 'id'), `page-${i + 1}.xhtml#${attr(n, 'id')}`);
    });
    chunk.label = label || (chunks.length === 1 ? title : `第 ${i + 1} 部分`);
  });
  chunks.forEach(chunk => {
    for (const node of chunk.nodes) walk(node, n => {
      const href = attr(n, 'href');
      if (href.startsWith('#')) {
        let key = href.slice(1); try { key = decodeURIComponent(key); } catch {}
        if (aliases.has(key)) n.attrs.find(a => a.name === 'href').value = aliases.get(key);
      }
    });
    chunk.xhtml = chunk.nodes.map(node => node.nodeName === '#text' ? escapeHtml(node.value) : serializeOuter(node)).join('');
    delete chunk.nodes;
  });
  if (!chunks.length || !chunks.some(c => toPlainText(c.xhtml).trim() || /<img\b/.test(c.xhtml))) throw new Error('文件没有可读文字');
  const chapters = chunks.map((c, i) => ({ ...c, href: `text/page-${i + 1}.xhtml` }));
  const book = { title, author, language, format, chapters, toc: chapters.map(c => ({ href: c.href, label: c.label })) };
  return { book, engine: createReaderEngine(book), bytes };
}
