// One bounded, credential-free metadata shape for every import source.
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, 1000) : '';
const people = value => (Array.isArray(value) ? value : [value]).map(x => text(x?.name ?? x)).filter(Boolean).join(', ');
export function bookMetadata(value = {}) {
  value ||= {};
  const fields = { title: text(value.title), author: people(value.author || value.authors), year: text(value.year || value.published || value.date).slice(0, 40), language: people(value.language), isbn: text(value.isbn), publisher: people(value.publisher), source: text(value.source), sourceId: text(value.sourceId) };
  const identifier = value.identifier;
  if (!fields.isbn && typeof identifier === 'string' && /^(?:urn:isbn:)?[\dXx -]{10,25}$/.test(identifier)) fields.isbn = identifier.replace(/^urn:isbn:/, '');
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value));
}
// ISBN-10 and ISBN-13 describe the same edition. Invalid values never prove ownership.
export function canonicalIsbn(value) {
  let isbn = String(value || '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    if ([...isbn].reduce((sum, n, i) => sum + (n === 'X' ? 10 : +n) * (10 - i), 0) % 11) return '';
    isbn = '978' + isbn.slice(0, 9);
    isbn += (10 - [...isbn].reduce((sum, n, i) => sum + +n * (i % 2 ? 3 : 1), 0) % 10) % 10;
  }
  return /^\d{13}$/.test(isbn) && [...isbn].reduce((sum, n, i) => sum + +n * (i % 2 ? 3 : 1), 0) % 10 === 0 ? isbn : '';
}
export function matchBook(candidate, records) {
  const book = bookMetadata(candidate), isbn = canonicalIsbn(book.isbn);
  const normalize = s => String(s || '').normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]/gu, '');
  let possible = null;
  for (const record of records) {
    const other = bookMetadata(record);
    if (isbn && isbn === canonicalIsbn(other.isbn) || book.source && book.sourceId && book.source === other.source && book.sourceId === other.sourceId) return { record, exact: true };
    if (book.title && book.author && normalize(book.title) === normalize(other.title) && normalize(book.author) === normalize(other.author)) possible ||= { record, exact: false };
  }
  return possible;
}
