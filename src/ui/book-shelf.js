import * as React from 'react';
import { ShelfCover, ShelfCard } from './shelf-components.js';
import { IconBookmark, IconCheck, IconArrowLeft, IconExternal } from './icons.js';
import { externalBookSearchUrls, chineseStoreLinks, shelfOrder, searchShelf, shelfText, shelfSearchQuery, shelfPageUrl, pickShelfComments, hackerNewsItemUrl, matchLibraryBooks, recommendShelf, markedShelf } from '../core/book-shelf.js';
const h = React.createElement;
export function BookShelf({ ui, searchGutenberg, scrollRef, memory }) {
  const t = (key, fallback) => ui.t(`shelf.${key}`, fallback);
  const chinese = t('language', 'zh') === 'zh';
  const [data, setData] = React.useState({ books: [], topics: [], co: {} });
  const [marks, setMarks] = React.useState(null);
  const [query, setQuery] = React.useState(memory.current.query || '');
  const [view, setView] = React.useState(memory.current.view || 'best');
  const [topic, setTopic] = React.useState(memory.current.topic || '');
  const [mine, setMine] = React.useState(memory.current.mine || 'wish');
  const [limit, setLimit] = React.useState(memory.current.limit || 24);
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
  const listScroll = React.useRef(memory.current.scroll || 0), lastCard = React.useRef('');
  memory.current = { ...memory.current, query, view, topic, mine, limit, inDetail: !!detail };
  const detailId = detail?.book.id;
  React.useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    if (detailId) scroll.scrollTop = 0;
    else {
      scroll.scrollTop = listScroll.current;
      const card = scroll.querySelector(`[data-shelf-id="${lastCard.current}"]`);
      card?.focus({ preventScroll: true });
    }
  }, [detailId, data.books]);
  const open = async book => {
    if (!detail) { listScroll.current = scrollRef.current?.scrollTop || 0; memory.current.scroll = listScroll.current; lastCard.current = book.id; }
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
  let rows = query.trim() ? searchShelf(data.books, query, data.books.length) : view === 'foryou' ? recommendShelf(data.books, data.co, seeds) : view === 'mine' ? markedShelf(byId, marks || {}, mine) : shelfOrder(data.books, view);
  if (topic) rows = rows.filter(book => book.tp.includes(topic));
  const button = (label, onClick, props = {}) => h('button', { type: 'button', className: 'qmr-discovery-button', onClick, ...props }, label);
  const title = book => shelfText(book, chinese).title;
  const markButtons = book => h('div', { className: 'qmr-discovery-marks' }, ['wish', 'read'].map(status => button(h(React.Fragment, null, h(status === 'wish' ? IconBookmark : IconCheck, { width: 15, height: 15 }), t(status, status === 'wish' ? '想读' : '读过')), () => void mark(book, status), { key: status, 'aria-label': `${t(status, status === 'wish' ? '想读' : '读过')} · ${title(book)}`, disabled: saving || marks === null, 'aria-pressed': marks?.[book.id]?.s === status })));
  const card = book => h(ShelfCard, { key: book.id, book, chinese, t, owned: owned.has(book.id), mark: marks?.[book.id]?.s, onOpen: open });
  const grid = books => h('div', { className: 'qmr-discovery-grid' }, books.map(card));
  const back = () => { detailToken.current++; setDetail(null); };
  const external = (label, href) => h('a', { href, target: '_blank', rel: 'noopener noreferrer', className: 'qmr-discovery-button' }, label, h(IconExternal, { width: 14, height: 14 }));
  const changeView = next => { setView(next); setQuery(''); setLimit(24); listScroll.current = 0; if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const counts = Object.fromEntries(['wish', 'read'].map(status => [status, Object.values(marks || {}).filter(mark => mark.s === status).length]));
  const book = detail?.book, text = book ? shelfText(book, chinese) : null;
  const values = detail?.value;
  const stanceTotal = values?.stance ? Object.values(values.stance).reduce((sum, n) => sum + n, 0) : 0;
  return h('section', { className: 'qmr-shelf', 'aria-busy': loading },
    error ? h('div', { role: 'alert', className: 'qmr-discovery-state is-error' }, h('p', null, error), button(t('retry', '重试'), () => void load(), { disabled: loading })) : null,
    markError ? h('div', { role: 'alert', className: 'qmr-discovery-state is-error' }, markError) : null,
    detail ? h('div', { className: 'qmr-discovery-detail' },
      button(h(React.Fragment, null, h(IconArrowLeft, { width: 15, height: 15 }), t('back', '返回书单')), back, { className: 'qmr-discovery-text-button' }),
      h('div', { className: 'qmr-discovery-detail-top' }, h(ShelfCover, { book, chinese }),
        h('div', { className: 'qmr-discovery-detail-info' },
          h('h2', null, text.title), text.original ? h('div', { className: 'qmr-discovery-original' }, text.original) : null,
          text.subtitle ? h('div', null, text.subtitle) : null,
          h('p', { className: 'qmr-discovery-meta' }, [book.a.join(' · '), book.y].filter(Boolean).join(' · ')),
          h('div', { className: 'qmr-discovery-chips' }, book.tp.map(slug => data.topics.find(topic => topic.slug === slug)).filter(Boolean).map(topic => h('span', { key: topic.slug }, chinese ? topic.zh : topic.en))),
          h('div', { className: 'qmr-discovery-stats' }, book.q != null ? h('span', { className: 'qmr-discovery-score' }, t('score', '推荐度 {score}').replace('{score}', book.q)) : null,
            h('span', null, `${book.ru ? t('recommended', '{count} 人推荐').replace('{count}', book.ru.toLocaleString()) + ' · ' : ''}${t('mentions', '{count} 人提及').replace('{count}', book.u.toLocaleString())}`), owned.has(book.id) ? h('span', { className: 'qmr-discovery-badge' }, t('owned', '已拥有')) : null),
          text.blurb ? h('p', { className: 'qmr-discovery-detail-blurb' }, text.blurb) : null, markButtons(book))),
      h('section', { className: 'qmr-discovery-section' }, h('h3', null, t('getBook', '在哪里读')), h('div', { className: 'qmr-discovery-links' },
        external('Anna’s Archive', externalBookSearchUrls(shelfSearchQuery(book)).anna), external('Z-Library', externalBookSearchUrls(shelfSearchQuery(book)).zlibrary),
        chinese ? chineseStoreLinks(book).map(([name, href]) => h(React.Fragment, { key: name }, external(name, href))) : null,
        button('Gutenberg', () => searchGutenberg(shelfSearchQuery(book))), external('Open Library', `https://openlibrary.org/works/${book.id}`))),
      detail.loading ? h('div', { role: 'status', className: 'qmr-discovery-state' }, t('loading', '正在加载书单…')) : null,
      detail.error ? h('div', { role: 'alert', className: 'qmr-discovery-state is-error' }, h('p', null, detail.error), button(t('retry', '重试'), () => void open(book))) : null,
      values ? h(React.Fragment, null,
        values.comments.length ? h('section', { className: 'qmr-discovery-section' }, h('h3', null, t('comments', 'HN 读者评论')),
          stanceTotal ? h(React.Fragment, null,
            h('div', { className: 'qmr-discovery-stance', 'aria-hidden': 'true' }, ['r', 'n', 'c'].map(key => values.stance[key] ? h('span', { key, className: `is-${key}`, style: { flexGrow: values.stance[key] } }) : null)),
            h('div', { className: 'qmr-discovery-legend' }, ['r', 'n', 'c'].map(key => values.stance[key] ? h('span', { key }, h('i', { className: `is-${key}`, 'aria-hidden': 'true' }), `${t(`stance${key}`, { r: '推荐', n: '提及', c: '批评' }[key])} ${values.stance[key].toLocaleString()}`) : null))) : null,
          pickShelfComments(values.comments).map(comment => h('blockquote', { key: comment.id, className: 'qmr-discovery-comment' },
            h('div', { className: 'qmr-discovery-comment-head' }, comment.stance ? h('span', { className: 'qmr-discovery-tag' }, t(`stance${comment.stance}`, { r: '推荐', n: '提及', c: '批评' }[comment.stance])) : null,
              h('span', null, [comment.by, Number.isFinite(comment.ts) ? new Date(comment.ts * 1000).getFullYear() : ''].filter(Boolean).join(' · ')), external('Hacker News', hackerNewsItemUrl(comment.id))), h('p', null, (chinese && comment.zh) || comment.x)))) : null,
        chinese && values.why ? h('section', { className: 'qmr-discovery-section' }, h('h3', null, t('advice', '阅读建议')), values.why.points.length ? h('ul', null, values.why.points.map((point, i) => h('li', { key: i }, point))) : null,
          values.why.fit ? h('p', null, h('strong', null, t('fit', '适合谁'), ' · '), values.why.fit) : null, values.why.warn ? h('p', null, h('strong', null, t('warn', '读前留意'), ' · '), values.why.warn) : null) : null,
        ((chinese && values.description.zh) || values.description.en) ? h('section', { className: 'qmr-discovery-section qmr-discovery-description' }, h('h3', null, t('about', '内容简介')), h('p', null, (chinese && values.description.zh) || values.description.en)) : null,
        values.related.some(id => byId.has(id)) ? h('section', { className: 'qmr-discovery-section' }, h('h3', null, t('related', '相关书籍')), grid(values.related.map(id => byId.get(id)).filter(Boolean))) : null) : null) :
    h(React.Fragment, null,
      h('form', { className: 'qmr-discovery-search', onSubmit: event => { event.preventDefault(); setQuery(query.trim()); setLimit(24); listScroll.current = 0; } },
        h('label', { className: 'qmr-discovery-search-label' }, h('span', null, t('query', '书名或作者')), h('span', { className: 'qmr-discovery-search-field' }, h('input', { value: query, 'data-autofocus': true, onChange: e => { setQuery(e.target.value); setLimit(24); listScroll.current = 0; }, placeholder: t('query', '书名或作者') }))),
        h('button', { type: 'submit', className: 'qmr-discovery-button is-primary', disabled: !query.trim() }, ui.t('discover.search', '搜索'))),
      h('div', { className: 'qmr-discovery-views' },
        h('div', { className: 'qmr-discovery-tabs', role: 'group', 'aria-label': t('views', '书单') }, [['foryou', '为你推荐'], ['mine', '我的清单'], ['best', '值得读'], ['top', '最多人提'], ['lindy', '经典常青']].filter(([id]) => id === 'foryou' ? seeds.size > 0 || view === id : id === 'mine' ? counts.wish + counts.read > 0 || view === id : true).map(([id, label]) => button(t(id, label), () => changeView(id), { key: id, className: 'qmr-discovery-tab', 'aria-pressed': view === id }))),
        h('select', { value: topic, 'aria-label': t('topics', '全部主题'), onChange: e => { setTopic(e.target.value); setLimit(24); listScroll.current = 0; } }, h('option', { value: '' }, t('topics', '全部主题')), data.topics.map(item => h('option', { key: item.slug, value: item.slug }, chinese ? item.zh : item.en)))),
      view === 'mine' && !query ? h('div', { className: 'qmr-discovery-mine', role: 'group', 'aria-label': t('mine', '我的清单') }, ['wish', 'read'].map(status => button(`${t(status, status === 'wish' ? '想读' : '读过')} ${counts[status]}`, () => { setMine(status); setLimit(24); }, { key: status, 'aria-pressed': mine === status }))) : null,
      h('p', { className: 'qmr-discovery-view-hint' }, query ? t('searchResults', '搜索结果') : t(`${view}Hint`, { best: '读者真正推荐的好书', top: 'Hacker News 讨论中被提及最多的书', lindy: '经受时间检验、仍被读者推荐的经典', foryou: '根据书库与清单，在本地寻找相关好书', mine: '留下下一本想读的书，也记住读过的书' }[view])),
      loading && !data.books.length ? h('div', { role: 'status', className: 'qmr-discovery-state' }, t('loading', '正在加载书单…')) : null,
      !loading && !error && !rows.length ? h('div', { className: 'qmr-discovery-state' }, h('h3', null, t(query ? 'noResults' : 'empty', query ? '没有找到相关书籍' : '清单还是空的')), h('p', null, t(query ? 'noResultsHint' : view === 'foryou' ? 'seeds' : 'emptyHint', query ? '换个书名、作者或主题试试。' : view === 'foryou' ? '先加入想读清单，或导入书籍以获取推荐。' : '打开一本书的详情，标记想读或读过。'))) : null,
      grid(rows.slice(0, limit)), rows.length > limit ? h('div', { className: 'qmr-discovery-more' }, button(t('more', '显示更多'), () => setLimit(limit + 24))) : null));
}
