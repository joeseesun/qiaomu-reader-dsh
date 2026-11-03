import * as React from 'react';
import { createPortal } from 'react-dom';
import { BookShelf } from './book-shelf.js';
import { ShelfCover } from './shelf-components.js';
import { IconClose, IconSearch, IconArrowLeft } from './icons.js';
import { useDialogFocus } from './dialog-focus.js';
import { DISCOVERY_CSS } from './discovery-style.js';
const h = React.createElement;
function Gutenberg({ ui, initialQuery, memory }) {
  const [query, setQuery] = React.useState(initialQuery || memory.current.query || '');
  const [books, setBooks] = React.useState(memory.current.books || []);
  const [status, setStatus] = React.useState('');
  const [busyId, setBusyId] = React.useState(null);
  const [error, setError] = React.useState('');
  const token = React.useRef(0);
  React.useEffect(() => () => { token.current++; }, []);
  memory.current = { query, books };
  const t = (key, fallback) => ui.t(`discover.${key}`, fallback);
  const host = () => { const api = ui.props().data?.getHost(); if (!api) throw new Error(t('offline', '请连接宿主后再搜索书源')); return api; };
  const search = async event => {
    event?.preventDefault(); if (!query.trim()) return;
    const current = ++token.current; setStatus('searching'); setError('');
    try { const result = await host().searchBooks({ query }); if (current === token.current) { setBooks(result.books); setStatus(result.books.length ? '' : 'empty'); } }
    catch (cause) { if (current === token.current) { setError(cause?.message || String(cause)); setStatus(''); } }
  };
  const download = async book => {
    const current = ++token.current; setBusyId(book.id); setStatus('downloading'); setError('');
    try {
      const result = await host().downloadBook({ id: book.id });
      if (current !== token.current) return;
      setStatus('importing');
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const imported = await ui.importBook({ name: result.filename, arrayBuffer: async () => bytes.buffer, discoveryIdentifier: result.identifier });
      if (imported?.ok === false) throw new Error(imported.error);
      if (current === token.current) setStatus('');
    } catch (cause) { if (current === token.current) { setError(cause?.message || String(cause)); setStatus(''); } }
    finally { if (current === token.current) setBusyId(null); }
  };
  const busy = ['searching', 'downloading', 'importing'].includes(status);
  return h('section', { className: 'qmr-gutenberg', 'aria-busy': busy },
    h('form', { onSubmit: search, className: 'qmr-discovery-search' }, h('label', { className: 'qmr-discovery-search-field' }, h(IconSearch, { width: 17, height: 17 }), h('span', { className: 'qmr-discovery-sr-only' }, t('query', '书名或作者')), h('input', { value: query, disabled: !!busyId, 'data-autofocus': true, onChange: event => { token.current++; setQuery(event.target.value); setStatus(''); }, placeholder: t('query', '书名或作者') })), h('button', { className: 'qmr-discovery-button is-primary', disabled: busy || !query.trim() }, t('search', '搜索'))),
    h('p', { className: 'qmr-discovery-view-hint' }, t('hint', '在 Project Gutenberg 搜索公版书，下载后直接加入书库。')),
    status ? h('div', { role: 'status', className: 'qmr-discovery-state is-compact' }, t(status, ({ searching: '正在搜索…', downloading: '正在下载并校验…', importing: '正在加入书库…', empty: '未找到相关书籍' })[status] || status)) : null,
    error ? h('div', { role: 'alert', className: 'qmr-discovery-state is-error' }, h('p', null, error), h('button', { type: 'button', className: 'qmr-discovery-button', disabled: busy, onClick: search }, t('retry', '重试搜索'))) : null,
    !books.length && !status && !error ? h('div', { className: 'qmr-discovery-state' }, h(IconSearch, { width: 28, height: 28 }), h('h3', null, t('start', '找一本公版书')), h('p', null, t('startHint', '输入书名或作者，如 Alice 或 Shakespeare。'))) : null,
    h('div', { className: 'qmr-discovery-results' }, books.map(book => {
      const owned = ui.books().some(b => !b.removedAt && b.identifier === book.identifier);
      return h('article', { key: book.id, className: 'qmr-discovery-result' }, h(ShelfCover, { book, gutenberg: true }),
        h('div', { className: 'qmr-discovery-result-info' }, h('h3', null, h('a', { href: book.pageUrl, target: '_blank', rel: 'noopener noreferrer' }, book.title)), h('p', { className: 'qmr-discovery-meta' }, book.author)),
        h('button', { type: 'button', className: 'qmr-discovery-button', disabled: busy || owned, onClick: () => download(book) }, owned ? t('owned', '已拥有') : busyId === book.id ? t(status, status === 'importing' ? '正在加入书库…' : '正在下载并校验…') : t('download', '下载 EPUB')));
    })));
}
function DiscoveryDialog({ ui, onClose, memory, gutenbergMemory }) {
  const [source, setSource] = React.useState(memory.current.source || 'shelf');
  const [query, setQuery] = React.useState('');
  const dialog = React.useRef(null), scrollRef = React.useRef(null);
  const close = () => { if (!memory.current.inDetail && source === 'shelf') memory.current.scroll = scrollRef.current?.scrollTop || 0; onClose(); };
  const keyDown = useDialogFocus(dialog, close);
  memory.current.source = source;
  const searchGutenberg = value => { setQuery(value); setSource('gutenberg'); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  return createPortal(h('div', { className: 'qmr-discovery-backdrop', onClick: event => { if (event.target === event.currentTarget) close(); } }, h('style', null, DISCOVERY_CSS),
    h('section', { className: 'qmr-discovery-dialog', ref: dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': ui.t('discover.title', '找书'), onKeyDown: keyDown },
      h('header', { className: 'qmr-discovery-header' }, h('h1', null, ui.t('discover.title', '找书')),
        h('div', { className: 'qmr-discovery-source-nav', role: 'group', 'aria-label': ui.t('discover.sources', '书源') },
          h('button', { type: 'button', 'aria-pressed': source === 'shelf', onClick: () => setSource('shelf') }, ui.t('discover.publicSource', '公开书源')),
          h('button', { type: 'button', onClick: () => { close(); requestAnimationFrame(() => document.querySelector('.qmr-library-search input')?.focus()); } }, ui.t('discover.localSource', '本地书库')),
          h('button', { type: 'button', 'aria-pressed': source === 'gutenberg', onClick: () => { if (source === 'shelf' && !memory.current.inDetail) memory.current.scroll = scrollRef.current?.scrollTop || 0; setSource('gutenberg'); } }, 'Gutenberg')),
        h('button', { className: 'qmr-discovery-icon', type: 'button', 'aria-label': ui.t('prompts.close', '关闭'), onClick: close }, h(IconClose, { width: 20, height: 20 }))),
      h('div', { className: 'qmr-discovery-scroll', ref: scrollRef }, source === 'shelf' ? h(BookShelf, { ui, scrollRef, memory, searchGutenberg }) : h(React.Fragment, null,
        query ? h('button', { type: 'button', className: 'qmr-discovery-text-button', onClick: () => setSource('shelf') }, h(IconArrowLeft, { width: 15, height: 15 }), ui.t('shelf.back', '返回书单')) : null,
        h(Gutenberg, { ui, initialQuery: query, memory: gutenbergMemory }))),
      h('footer', { className: 'qmr-discovery-footer' }, ui.t('discover.localHint', '书库和清单留在本地；公开目录仅提供找书线索。')))), document.body);
}
export function BookDiscovery({ ui }) {
  const [open, setOpen] = React.useState(false);
  const memory = React.useRef({}), gutenbergMemory = React.useRef({});
  return h('div', { className: 'qmr-discovery-entry' }, h('button', { className: 'qmr-btn', type: 'button', onClick: () => setOpen(true) }, h(IconSearch, { width: 16, height: 16 }), ui.t('discover.title', '找书')),
    open ? h(DiscoveryDialog, { ui, memory, gutenbergMemory, onClose: () => setOpen(false) }) : null);
}
