// Preserve text from the whole document within a bounded first-turn payload.
export const PDF_CONTEXT_LIMIT = 180000;
export function createPdfContextCollector(limit = PDF_CONTEXT_LIMIT) {
  limit = Math.max(1000, Math.min(PDF_CONTEXT_LIMIT, Math.floor(Number(limit) || PDF_CONTEXT_LIMIT)));
  const pages = [];
  let sourceChars = 0, truncated = false, retainedChars = 0, headerChars = 0;
  return {
    add(page, value) {
      const text = String(value || '').trim();
      if (!text) return;
      sourceChars += text.length;
      pages.push({ page, text: text.slice(0, limit) });
      retainedChars += Math.min(text.length, limit);
      headerChars += `[第 ${page} 页]\n`.length + (pages.length > 1 ? 2 : 0);
      if (text.length > limit) truncated = true;
      // Reserve room for every page label before allocating equal text quotas.
      if (retainedChars + headerChars > limit) {
        truncated = true;
        // Retain a small snippet even when there are more labels than fit.
        const quota = Math.max(32, Math.floor((limit - headerChars) / pages.length));
        for (const p of pages) if (p.text.length > quota) p.text = quota > 1 ? `${p.text.slice(0, quota - 1)}…` : '';
        retainedChars = pages.reduce((n, p) => n + p.text.length, 0);
      }
    },
    finish(totalPages) {
      let selected = pages;
      // Even page selection when labels alone would exhaust the budget.
      if (retainedChars + headerChars > limit) {
        truncated = true;
        const count = Math.max(2, Math.floor(limit / 80));
        const length = Math.min(count, pages.length);
        selected = Array.from({length}, (_, i) => pages[Math.round(i * (pages.length - 1) / (length - 1))]);
      }
      return { text: selected.map(p => `[第 ${p.page} 页]\n${p.text}`).join('\n\n').slice(0, limit), totalPages, textPages: pages.length, includedPages: selected.map(p => p.page), sourceChars, truncated };
    },
  };
}
