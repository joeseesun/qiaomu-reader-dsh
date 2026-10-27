export const TEXT_FORMATS = ['txt', 'md', 'html'];
export const BOOK_FORMATS = ['epub', 'pdf', ...TEXT_FORMATS];
export const BOOK_ACCEPT = '.epub,.pdf,.txt,.md,.markdown,.html,.htm';
export function formatOf(filename) {
  const ext = String(filename || '').split('.').at(-1).toLowerCase();
  const format = ext === 'markdown' ? 'md' : ext === 'htm' ? 'html' : ext;
  if (!BOOK_FORMATS.includes(format)) throw new Error('支持 EPUB、PDF、TXT、Markdown 和 HTML 文件');
  return format;
}
