const copy = {
  extracting: ['正在提取 PDF 全文…', 'Extracting PDF document…'],
  full: ['PDF 全文 · {pages} 页', 'Full PDF · {pages} pages'],
  sampled: ['PDF 均匀摘取 · {included}/{total} 个文字页 · 最多 180000 字符', 'PDF evenly sampled · {included}/{total} text pages · up to 180000 characters'],
  empty: ['PDF 没有可提取文字；未执行 OCR，可讨论当前选段。', 'No extractable PDF text. OCR was not performed; selected text is still available.'],
  failed: ['PDF 全文提取失败，当前仅关联本页；重新打开伴读可重试。', 'PDF extraction failed. Only the current page is attached; reopen companion to retry.'],
};
export function pdfContextText(ui, key, values = {}) {
  let value = copy[key]?.[ui.t('prompts.language', 'zh') === 'en' ? 1 : 0] || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
}
