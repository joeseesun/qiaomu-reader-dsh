export const TEXT_FORMATS = ['txt', 'md', 'html'];
export const BOOK_FORMATS = ['epub', 'pdf', 'mobi', 'azw', 'azw3', 'fb2', 'fbz', 'cbz', ...TEXT_FORMATS];
export const BOOK_ACCEPT = '.epub,.pdf,.txt,.md,.markdown,.html,.htm,.mobi,.azw,.azw3,.fb2,.fbz,.cbz';
export function formatOf(filename) {
  const ext = String(filename || '').split('.').at(-1).toLowerCase();
  const format = ext === 'markdown' ? 'md' : ext === 'htm' ? 'html' : ext;
  if (!BOOK_FORMATS.includes(format)) throw new Error('支持 EPUB、PDF、MOBI、AZW、FB2、FBZ、CBZ、TXT、Markdown 和 HTML 文件');
  return format;
}
