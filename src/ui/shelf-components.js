import * as React from 'react';
import { shelfCoverUrl, shelfText } from '../core/book-shelf.js';
const h = React.createElement;
export function ShelfCover({ book, chinese, gutenberg = false }) {
  const src = gutenberg ? `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg` : shelfCoverUrl(book.c);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  const title = gutenberg ? book.title : shelfText(book, chinese).title;
  return h('span', { className: `qmr-discovery-cover${failed || !src ? ' is-empty' : ''}`, 'aria-hidden': 'true' },
    src && !failed ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async', referrerPolicy: 'no-referrer', onError: () => setFailed(true) }) : h(React.Fragment, null, h('span', null, title)));
}
export function ShelfCard({ book, chinese, t, owned, mark, onOpen }) {
  const text = shelfText(book, chinese);
  return h('button', { type: 'button', className: 'qmr-discovery-card', 'data-shelf-id': book.id, onClick: () => onOpen(book) },
    h(ShelfCover, { book, chinese }),
    h('span', { className: 'qmr-discovery-card-info' },
      h('strong', { className: 'qmr-discovery-card-title' }, text.title),
      h('span', { className: 'qmr-discovery-meta' }, [book.a[0], book.y].filter(Boolean).join(' · ')),
      h('span', { className: 'qmr-discovery-stats' }, book.q != null ? h('span', { className: 'qmr-discovery-score' }, book.q) : null, h('span', null, `${book.ru ? t('recommended', '{count} 人推荐').replace('{count}', book.ru.toLocaleString()) + ' · ' : ''}${t('mentions', '{count} 人提及').replace('{count}', book.u.toLocaleString())}`)),
      owned || mark ? h('span', { className: 'qmr-discovery-badge' }, t(owned ? 'owned' : mark, owned ? '已拥有' : mark === 'wish' ? '想读' : '读过')) : null,
      text.blurb ? h('span', { className: 'qmr-discovery-card-blurb' }, text.blurb) : null));
}
