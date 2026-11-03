import * as React from 'react';
import { BookShelf } from './book-shelf.js';
const h = React.createElement;
function Gutenberg({ ui, initialQuery }) {
  const [query, setQuery] = React.useState(initialQuery || '');
  const [books, setBooks] = React.useState([]);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const token = React.useRef(0);
  React.useEffect(() => () => { token.current++; }, []);
  const t = (key, fallback) => ui.t(`discover.${key}`, fallback);
  const host = () => {
    const api = ui.props().data?.getHost();
    if (!api) throw new Error(t('offline', '请连接宿主后再搜索书源'));
    return api;
  };
  const search = async e => {
    e.preventDefault(); const current = ++token.current; setStatus('searching'); setError('');
    try { const result = await host().searchBooks({ query }); if (current === token.current) { setBooks(result.books); setStatus(result.books.length ? '' : 'empty'); } }
    catch (cause) { if (current === token.current) { setError(cause?.message || String(cause)); setStatus(''); } }
  };
  const download = async book => {
    const current = ++token.current; setStatus('downloading'); setError('');
    try {
      const result = await host().downloadBook({ id: book.id });
      if (current !== token.current) return;
      setStatus('importing');
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const imported = await ui.importBook({ name: result.filename, arrayBuffer: async () => bytes.buffer,
        discoveryIdentifier: result.identifier });
      if (imported?.ok === false) throw new Error(imported.error);
      if (current === token.current) setStatus('added');
    } catch (cause) { if (current === token.current) { setError(cause?.message || String(cause)); setStatus(''); } }
  };
  const busy = ['searching', 'downloading', 'importing'].includes(status);
  return h('section', { className: 'qmr-gutenberg' }, h('h3', null, 'Project Gutenberg'),
    h('form', { onSubmit: search, className: 'qmr-feature-actions' }, h('input', { value: query, onChange: e => setQuery(e.target.value), placeholder: t('query', '书名或作者'), 'aria-label': t('query', '书名或作者') }), h('button', { className: 'qmr-btn', disabled: busy || !query.trim() }, t('search', '搜索'))),
    status ? h('p', { role: 'status' }, t(status, ({ searching: '正在搜索…', downloading: '正在下载并校验…', importing: '正在加入书库…', empty: '未找到相关书籍', added: '已加入书库' })[status] || status)) : null,
    error ? h('p', { role: 'alert' }, error) : null,
    books.map(book => {
      const owned = ui.books().some(b => b.identifier === book.identifier);
      return h('div', { key: book.id, className: 'qmr-library-toolbar' }, h('span', null, h('a', { href: book.pageUrl, target: '_blank', rel: 'noopener noreferrer' }, book.title), ` · ${book.author}`),
        h('button', { className: 'qmr-btn', disabled: busy || owned, onClick: () => download(book) }, owned ? t('owned', '已拥有') : t('download', '下载 EPUB')));
    }));
}

export function BookDiscovery({ ui }) {
  const [open, setOpen] = React.useState(false);
  const [source, setSource] = React.useState('shelf');
  const [query, setQuery] = React.useState('');
  return h('details', { className: 'qmr-discovery', onToggle: event => setOpen(event.currentTarget.open) },
    h('summary', null, ui.t('discover.title', '找书')),
    open ? h(React.Fragment, null,
      h('div', { className: 'qmr-feature-actions' }, ['shelf', 'gutenberg'].map(id => h('button', { key: id, type: 'button', className: 'qmr-btn', 'aria-pressed': source === id, onClick: () => setSource(id) }, id === 'shelf' ? 'Hacker Books' : 'Gutenberg'))),
      source === 'shelf' ? h(BookShelf, { ui, searchGutenberg: value => { setQuery(value); setSource('gutenberg'); } }) : h(Gutenberg, { ui, initialQuery: query })) : null);
}
