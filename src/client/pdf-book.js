import { getDocument, Util } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { PDF_EMBEDDED_RESOURCE_OPTIONS } from './pdf-resources.js';
import { createPdfContextCollector } from '../core/pdf-context.js';

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
  const destinations = new Map(), destinationKeys = new Map();
  const resolveDestination = async (destination) => {
    const target = typeof destination === 'string' ? await document.getDestination(destination) : destination;
    if (!Array.isArray(target) || !target.length) return null;
    const index = typeof target[0] === 'number' ? target[0] : await document.getPageIndex(target[0]);
    if (!Number.isInteger(index) || index < 0 || index >= chapters.length) return null;
    const mode = target[1]?.name;
    if (!['XYZ','FitH','FitBH','FitV','FitBV','FitR'].includes(mode)) return chapters[index].href;
    const page = await document.getPage(index + 1), viewport = page.getViewport({scale:1});
    const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const x = ['XYZ','FitV','FitBV','FitR'].includes(mode) ? finite(target[2],page.view[0]) : page.view[0];
    const y = mode === 'XYZ' ? finite(target[3],page.view[3]) : mode === 'FitR' ? finite(target[5],page.view[3]) : ['FitH','FitBH'].includes(mode) ? finite(target[2],page.view[3]) : page.view[3];
    const point = viewport.convertToViewportPoint(x,y);
    const key = JSON.stringify([index,x,y]);
    let id = destinationKeys.get(key);
    if (!id) {
      id = `qmr-pdf-dest-${destinationKeys.size}`; destinationKeys.set(key,id);
      if (!destinations.has(index)) destinations.set(index,[]);
      destinations.get(index).push({id,x:Math.max(0,Math.min(100,point[0]/viewport.width*100)),y:Math.max(0,Math.min(100,point[1]/viewport.height*100))});
    }
    return `${chapters[index].href}#${id}`;
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
  let contextCache, disposed = false;
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
      while (textCache.size > 16 || [...textCache.values()].reduce((n, v) => n + v.length, 0) > 2000000) textCache.delete(textCache.keys().next().value);
      return text;
    },
    async documentContext({signal} = {}) {
      const check = () => { if (disposed || signal?.aborted) throw Object.assign(new Error('Aborted'), {name:'AbortError'}); };
      check();
      if (contextCache) return contextCache;
      if (chapters.length > 10000) throw new Error('PDF 超过 10000 页，无法自动提取全文');
      const collector = createPdfContextCollector();
      for (let index = 0; index < chapters.length; index++) {
        check();
        collector.add(index + 1, await this.plainTextOf(index));
        check();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      check();
      contextCache = collector.finish(chapters.length);
      return contextCache;
    },
    async render(index, _resourceResolver, options = {}) {
      if (index < 0 || index >= chapters.length) return '';
      const page = await document.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const zoom = Math.min(3, Math.max(0.5, Number(options.zoom) || 1));
      const scale = Math.min(1.6, 1000 / Math.max(1, base.width)) * zoom;
      const viewport = page.getViewport({ scale });
      const content = await page.getTextContent();
      const links = [];
      try {
        for (const annotation of await page.getAnnotations({intent:'display'})) {
          if (annotation.subtype !== 'Link' || !Array.isArray(annotation.rect)) continue;
          let href = null;
          try { href = annotation.dest ? await resolveDestination(annotation.dest) : /^https?:\/\//i.test(annotation.url || '') ? annotation.url : null; } catch { /* A broken link does not hide the page. */ }
          if (!href) continue;
          const rect = [...viewport.convertToViewportPoint(annotation.rect[0],annotation.rect[1]),...viewport.convertToViewportPoint(annotation.rect[2],annotation.rect[3])];
          links.push(`<a class="qmr-pdf-link" href="${escapeAttr(href)}" aria-label="PDF link" style="left:${Math.min(rect[0],rect[2])/viewport.width*100}%;top:${Math.min(rect[1],rect[3])/viewport.height*100}%;width:${Math.abs(rect[2]-rect[0])/viewport.width*100}%;height:${Math.abs(rect[3]-rect[1])/viewport.height*100}%"></a>`);
        }
      } catch { /* Text and image remain usable without annotations. */ }
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
      const markers = (destinations.get(index)||[]).map(p=>`<span id="${p.id}" class="qmr-pdf-destination" style="left:${p.x}%;top:${p.y}%"></span>`).join('');
      return `<div class="qmr-pdf-sheet" style="width:${viewport.width}px;max-width:${zoom > 1 ? 'none' : '100%'};aspect-ratio:${viewport.width}/${viewport.height}">${image ? `<img src="${escapeAttr(image)}" alt="第 ${index + 1} 页">` : ''}<div class="qmr-pdf-text-layer">${spans}</div>${markers}${links.join('')}</div>`;
    },
    tocFor(index) { return index >= 0 && index < chapters.length ? [{href:chapters[index].href,label:chapters[index].label}] : []; },
    resolveLink(_from, href) {
      const [path,fragment=''] = String(href).split('#');
      const index = chapters.findIndex((chapter) => chapter.href === path);
      return index < 0 ? null : { chapterIndex: index, fragment };
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
    dispose: () => { disposed = true; contextCache = null; textCache.clear(); return task.destroy(); },
  };
  return { book, engine, bytes };
}
