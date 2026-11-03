import * as React from 'react';
import { shelfOrder, searchShelf, shelfText, shelfSearchQuery, shelfPageUrl, pickShelfComments, hackerNewsItemUrl, matchLibraryBooks, recommendShelf, markedShelf } from '../core/book-shelf.js';
const h = React.createElement;
export function BookShelf({ ui, searchGutenberg }) {
  const t = (key, fallback) => ui.t(`shelf.${key}`, fallback);
  const chinese = t('language', 'zh') === 'zh';
  const [data, setData] = React.useState({ books: [], topics: [], co: {} });
  const [marks, setMarks] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState('best');
  const [topic, setTopic] = React.useState('');
  const [limit, setLimit] = React.useState(24);
  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [markError, setMarkError] = React.useState('');
  const generation = React.useRef(0), detailToken = React.useRef(0), alive = React.useRef(true), writing = React.useRef(false);
  const host = () => { const api = ui.props().data?.getHost(); if (!api) throw new Error(t('offline', '请连接宿主后重试')); return api; };
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; detailToken.current++; }; }, []);
  const load = async () => {
    const token = ++generation.current; setLoading(true); setError('');
    try {
      const api = host();
      // Independent sections can become usable even if another source fails.
      const results = await Promise.allSettled([
        api.shelfData({ kind: 'books' }).then(books => { if (token === generation.current) setData(d => ({ ...d, books })); }),
        api.shelfData({ kind: 'topics' }).then(topics => { if (token === generation.current) setData(d => ({ ...d, topics })); }),
        api.shelfData({ kind: 'co-index' }).then(co => { if (token === generation.current) setData(d => ({ ...d, co })); }),
        api.shelfMarks().then(value => { if (token === generation.current) setMarks(value); }),
      ]);
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
    } catch (cause) { if (token === generation.current) setError(`${t('loadFailed', '书单加载失败，请重试')} · ${cause?.message || cause}`); }
    finally { if (token === generation.current) setLoading(false); }
  };
  React.useEffect(() => { void load(); }, []);
  const open = async book => {
    const token = ++detailToken.current; setDetail({ book, loading: true });
    try { const value = await host().shelfData({ kind: 'detail', id: book.id }); if (token === detailToken.current) setDetail({ book, value }); }
    catch (cause) { if (token === detailToken.current) setDetail({ book, error: String(cause?.message || cause) }); }
  };
  const mark = async (book, status) => {
    if (writing.current || marks === null) return;
    writing.current = true; setSaving(true); setMarkError('');
    try { const next = await host().markShelf({ id: book.id, status }); if (alive.current) setMarks(next); }
    catch (cause) { if (alive.current) setMarkError(`${t('saveFailed', '保存失败，原清单已保留，请重试')} · ${cause?.message || cause}`); }
    finally { writing.current = false; if (alive.current) setSaving(false); }
  };
  const byId = React.useMemo(() => new Map(data.books.map(book => [book.id, book])), [data.books]);
  const library = ui.books();
  const owned = React.useMemo(() => matchLibraryBooks(data.books, library.filter(book => !book.removedAt).map(book => book.title)), [data.books, library]);
  const seeds = new Set([...owned, ...Object.keys(marks || {})]);
  let rows = query.trim() ? searchShelf(data.books, query, data.books.length) : view === 'foryou' ? recommendShelf(data.books, data.co, seeds) : ['wish', 'read'].includes(view) ? markedShelf(byId, marks || {}, view) : shelfOrder(data.books, view);
  if (topic) rows = rows.filter(book => book.tp.includes(topic));
  const button = (label, onClick, props = {}) => h('button', { type: 'button', className: 'qmr-btn', onClick, ...props }, label);
  const title = book => shelfText(book, chinese).title;
  const markButtons = book => h('div', { className: 'qmr-feature-actions' }, ['wish', 'read'].map(status => button(t(status, status === 'wish' ? '想读' : '读过'), () => void mark(book, status), { key: status, 'aria-label': `${t(status, status === 'wish' ? '想读' : '读过')} · ${title(book)}`, disabled: saving || marks === null, 'aria-pressed': marks?.[book.id]?.s === status })));
  const row = book => h('article', { key: book.id, className: 'qmr-shelf-row' },
    h('button', { type: 'button', className: 'qmr-shelf-title', onClick: () => void open(book) }, title(book)),
    h('span', { className: 'qmr-shelf-meta' }, `${book.a.join(' · ')}${owned.has(book.id) ? ` · ${t('owned', '已拥有')}` : ''}`),
    shelfText(book, chinese).blurb ? h('p', null, shelfText(book, chinese).blurb) : null, markButtons(book));
  const back = () => { detailToken.current++; setDetail(null); };
  return h('section', { className: 'qmr-shelf' },
    h('p', { className: 'qmr-shelf-meta' }, t('privacy', 'Hacker Books 书单；搜索和推荐在本地计算，书库与清单不上传。')),
    error ? h('p', { role: 'alert' }, error, button(t('retry', '重试'), () => void load(), { disabled: loading })) : null,
    loading ? h('p', { role: 'status' }, t('loading', '正在加载书单…')) : null,
    markError ? h('p', { role: 'alert' }, markError) : null,
    detail ? h('div', null, button(t('back', '返回书单'), back), h('h3', null, title(detail.book)), h('p', null, detail.book.a.join(' · ')), markButtons(detail.book),
      h('div', { className: 'qmr-feature-actions' },
        h('a', { href: shelfPageUrl(detail.book.id), target: '_blank', rel: 'noopener noreferrer' }, 'Hacker Books'),
        button('Gutenberg', () => searchGutenberg(shelfSearchQuery(detail.book))),
        h('a', { href: `https://openlibrary.org/works/${detail.book.id}`, target: '_blank', rel: 'noopener noreferrer' }, 'Open Library')),
      detail.loading ? h('p', { role: 'status' }, t('loading', '正在加载书单…')) : null,
      detail.error ? h('p', { role: 'alert' }, detail.error, button(t('retry', '重试'), () => void open(detail.book))) : null,
      detail.value ? h(React.Fragment, null,
        h('p', null, (chinese && detail.value.description.zh) || detail.value.description.en),
        chinese && detail.value.why ? h('section', null, h('h4', null, t('advice', '阅读建议')), h('ul', null, detail.value.why.points.map((point, i) => h('li', { key: i }, point))), h('p', null, detail.value.why.fit), h('p', null, detail.value.why.warn)) : null,
        h('h4', null, t('comments', 'HN 读者评论')), pickShelfComments(detail.value.comments).map(comment => h('blockquote', { key: comment.id }, h('p', null, (chinese && comment.zh) || comment.x), h('a', { href: hackerNewsItemUrl(comment.id), target: '_blank', rel: 'noopener noreferrer' }, `${comment.by} · Hacker News`))),
        h('h4', null, t('related', '相关书籍')), detail.value.related.map(id => byId.get(id)).filter(Boolean).map(row)) : null) :
    h(React.Fragment, null,
      h('div', { className: 'qmr-feature-actions' }, h('input', { value: query, onChange: e => { setQuery(e.target.value); setLimit(24); }, placeholder: t('query', '书名或作者'), 'aria-label': t('query', '书名或作者') }),
        h('select', { value: topic, 'aria-label': t('topics', '全部主题'), onChange: e => { setTopic(e.target.value); setLimit(24); } }, h('option', { value: '' }, t('topics', '全部主题')), data.topics.map(item => h('option', { key: item.slug, value: item.slug }, chinese ? item.zh : item.en)))),
      h('div', { className: 'qmr-feature-actions', role: 'group', 'aria-label': t('views', '书单') }, [['best', '值得读'], ['top', '最多人提'], ['lindy', '经典常青'], ['foryou', '为你推荐'], ['wish', '想读'], ['read', '读过']].map(([id, label]) => button(t(id, label), () => { setView(id); setQuery(''); setLimit(24); }, { key: id, 'aria-pressed': view === id }))),
      !loading && !rows.length ? h('p', null, t(view === 'foryou' && !seeds.size ? 'seeds' : 'empty', view === 'foryou' && !seeds.size ? '先加入想读清单，或导入书籍以获取推荐。' : '暂无书籍')) : null,
      rows.slice(0, limit).map(row), rows.length > limit ? button(t('more', '显示更多'), () => setLimit(limit + 24)) : null));
}
