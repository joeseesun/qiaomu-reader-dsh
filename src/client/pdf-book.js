import { getDocument, Util } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { PDF_EMBEDDED_RESOURCE_OPTIONS } from './pdf-resources.js';

// The plugin is one self-contained client bundle. PDF.js uses its in-process
// worker handler so it never requests a separate unserved worker URL.
globalThis.pdfjsWorker = { WorkerMessageHandler };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const escapeAttr = escapeHtml;

export async function parsePdfBook(bytes, title = 'PDF') {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true, ...PDF_EMBEDDED_RESOURCE_OPTIONS });
  let document;
  try { document = await task.promise; }
  catch (error) { await task.destroy(); throw new Error(`PDF 解析失败：${error?.message || error}`); }
  if (!document.numPages) { await task.destroy(); throw new Error('PDF 没有页面'); }
  const chapters = Array.from({ length: document.numPages }, (_, index) => ({
    href: `pdf/page-${index + 1}`, label: `第 ${index + 1} 页`, xhtml: '',
  }));
  const book = { title, author: '', format: 'pdf', chapters, toc: chapters.map((chapter) => ({ href: chapter.href, label: chapter.label })) };
  const resolveDestination = async (destination) => {
    const target = typeof destination === 'string' ? await document.getDestination(destination) : destination;
    if (!Array.isArray(target) || !target.length) return null;
    const index = typeof target[0] === 'number' ? target[0] : await document.getPageIndex(target[0]);
    return Number.isInteger(index) && index >= 0 && index < chapters.length ? chapters[index].href : null;
  };
  const outlineItems = async (items) => {
    const result = [];
    for (const item of items || []) {
      let href = null;
      try { href = await resolveDestination(item.dest); } catch { /* Keep nested valid destinations. */ }
      const children = await outlineItems(item.items);
      if (href || children.length) result.push({ label: item.title || 'PDF', href: href || children[0].href, children });
    }
    return result;
  };
  try { const outline = await outlineItems(await document.getOutline()); if (outline.length) book.toc = outline; } catch { /* Page list remains available. */ }
  const textCache = new Map();
  const engine = {
    book,
    chapterCount: () => chapters.length,
    async plainTextOf(index) {
      if (index < 0 || index >= chapters.length) return '';
      if (textCache.has(index)) return textCache.get(index);
      const page = await document.getPage(index + 1);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str || '').join(' ');
      textCache.set(index, text);
      return text;
    },
    async render(index, _resourceResolver, options = {}) {
      if (index < 0 || index >= chapters.length) return '';
      const page = await document.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const zoom = Math.min(3, Math.max(0.5, Number(options.zoom) || 1));
      const scale = Math.min(1.6, 1000 / Math.max(1, base.width)) * zoom;
      const viewport = page.getViewport({ scale });
      const content = await page.getTextContent();
      let image = '';
      if (typeof globalThis.document?.createElement === 'function') {
        const canvas = globalThis.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport }).promise;
        image = canvas.toDataURL('image/jpeg', 0.88);
        canvas.width = canvas.height = 0;
      }
      const spans = content.items.filter((item) => item.str).map((item) => {
        const matrix = Util.transform(viewport.transform, item.transform);
        const fontSize = Math.max(4, Math.hypot(matrix[2], matrix[3]));
        const left = matrix[4];
        const top = matrix[5] - fontSize;
        return `<span style="left:${left / viewport.width * 100}%;top:${top / viewport.height * 100}%;font-size:${fontSize / viewport.width * 100}cqw;min-width:${Math.max(1, item.width * scale) / viewport.width * 100}%">${escapeHtml(item.str)}</span>`;
      }).join('');
      return `<div class="qmr-pdf-sheet" style="width:${viewport.width}px;max-width:${zoom > 1 ? 'none' : '100%'};aspect-ratio:${viewport.width}/${viewport.height}">${image ? `<img src="${escapeAttr(image)}" alt="第 ${index + 1} 页">` : ''}<div class="qmr-pdf-text-layer">${spans}</div></div>`;
    },
    tocFor(index) { return index >= 0 && index < chapters.length ? [{href:chapters[index].href,label:chapters[index].label}] : []; },
    resolveLink(_from, href) {
      const index = chapters.findIndex((chapter) => chapter.href === href);
      return index < 0 ? null : { chapterIndex: index, fragment: '' };
    },
    async search(query, options = {}) {
      const needle = String(query || '').trim().toLowerCase();
      if (!needle) return [];
      const hits = [];
      const limit = typeof options === 'number' ? options : options?.limit;
      for (let index = 0; index < chapters.length && hits.length < (limit || 80); index += 1) {
        const text = await this.plainTextOf(index);
        let at = 0;
        while (hits.length < (limit || 80) && (at = text.toLowerCase().indexOf(needle, at)) >= 0) {
          hits.push({ chapterIndex: index, chapterHref: chapters[index].href, textOffset: at, snippet: text.slice(Math.max(0, at - 35), at + needle.length + 45), percent: index / chapters.length });
          at += needle.length;
        }
      }
      return hits;
    },
    dispose: () => task.destroy(),
  };
  return { book, engine, bytes };
}
