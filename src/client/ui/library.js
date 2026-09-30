/**
 * 书库：响应式网格卡片 + 搜索 + 排序 + 筛选 + 导入。
 */
import * as React from 'react';
import {
  colorOfId,
  formatBytes,
  formatPercent,
  formatRelativeTime,
  initialsOf,
  truncate,
} from './format.js';
import {
  IconClose,
  IconFullscreen,
  IconImport,
  IconLibrary,
  IconRefresh,
  IconTrash,
} from './icons.js';

const h = React.createElement;
/** 单个书库卡片 */
const MAX_STATE_LOADS = 80;

const STATE_LABELS = { new: '未读', reading: '在读', finished: '已读' };

/**
 * 书库卡片。
 * @param {object} props
 * @param {object} props.ui
 * @param {object} props.book
 * @returns {React.ReactElement}
 */
function BookCard({ ui, book }) {
  const id = book && book.id;
  const progress = ui.progressOfBook(id);
  const highlightCount = ui.highlightCountOf(id);
  const readingState = ui.readingStateOf(id);
  const cover = typeof book.cover === 'string' && /^data:image\//i.test(book.cover) ? book.cover : null;
  const busy = false;

  const open = () => {
    if (busy) return;
    ui.openBook(id);
  };

  const openNotes = async (event) => {
    event.stopPropagation();
    const ok = await ui.openBook(id);
    if (ok) ui.setPanel('notes');
  };

  const openHighlights = async (event) => {
    event.stopPropagation();
    const ok = await ui.openBook(id);
    if (ok) ui.setPanel('highlights');
  };

  const remove = (event) => {
    event.stopPropagation();
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm(`从书库删除《${book.title || id}》？\n（只删除书库副本，不影响原始文件）`);
      }
    } catch (_error) {
      confirmed = true;
    }
    if (confirmed) ui.removeBook(id);
  };

  return h(
    'div',
    {
      className: 'qmr-card',
      role: 'button',
      tabIndex: 0,
      'aria-label': `打开《${book.title || id}》`,
      onClick: open,
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      },
    },
    h(
      'div',
      { className: 'qmr-cover' },
      cover
        ? h('img', { src: cover, alt: '', loading: 'lazy' })
        : h('span', {
          className: 'qmr-cover-initials',
          style: { background: colorOfId(id) },
          'aria-hidden': 'true',
        }, initialsOf(book.title)),
      h('span', { className: 'qmr-cover-badge' }, String(book.format || 'epub').toUpperCase()),
      readingState !== 'new'
        ? h('span', { className: 'qmr-cover-state' }, STATE_LABELS[readingState])
        : null,
    ),
    h('div', { className: 'qmr-card-title' }, book.title || id),
    h('div', { className: 'qmr-card-author' }, book.author || '未知作者'),
    h(
      'div',
      { className: 'qmr-card-bar', role: 'presentation' },
      h('div', { className: 'qmr-card-bar-fill', style: { width: `${Math.round(progress * 100)}%` } }),
    ),
    h(
      'div',
      { className: 'qmr-card-meta' },
      h('span', null, progress > 0 ? `${formatPercent(progress)} · ${formatRelativeTime(book.openedAt || book.addedAt)}` : '尚未开始'),
      h(
        'span',
        { style: { display: 'inline-flex', gap: 6, alignItems: 'center' } },
        highlightCount ? h('span', { className: 'qmr-pill' }, `${highlightCount} 划线`) : null,
        formatBytes(book.bytes) ? h('span', { className: 'qmr-pill' }, formatBytes(book.bytes)) : null,
      ),
    ),
    h(
      'div',
      { className: 'qmr-card-study' },
      h('button', { type: 'button', onClick: openHighlights }, `${highlightCount} 条划线`),
      h('button', { type: 'button', onClick: openNotes }, '阅读笔记'),
    ),
    h(
      'div',
      { className: 'qmr-card-actions' },
      h('button', {
        type: 'button',
        className: 'qmr-icon-btn',
        'aria-label': '从书库删除',
        onClick: remove,
      }, h(IconTrash, { width: 16, height: 16 })),
    ),
  );
}

/**
 * 书库视图。
 * @param {object} props
 * @param {object} props.ui 控制器
 * @returns {React.ReactElement}
 */
export function LibraryView({ ui }) {
  const dataRevision = ui.useSel((state) => state.dataRevision);
  const statesVersion = ui.useSel((state) => state.statesRevision) || 0;
  const query = ui.useSel((state) => state.libraryQuery) || '';
  const sort = ui.useSel((state) => state.librarySort) || 'recent';
  const filter = ui.useSel((state) => state.libraryFilter) || 'all';
  const loading = ui.useSel((state) => state.libraryLoading);
  const importing = ui.useSel((state) => state.importing);
  const fileRef = React.useRef(null);

  const status = ui.status();
  const books = ui.books();

  // 懒加载各书状态（用于划线数与阅读状态；上限 80 本，loadState 幂等）
  React.useEffect(() => {
    let cancelled = false;
    const list = ui.books().slice(0, MAX_STATE_LOADS);
    if (!list.length) return undefined;
    (async () => {
      for (const book of list) {
        if (cancelled) return;
        try {
          await ui.loadState(book.id);
        } catch (_error) {
          /* 单本失败不影响书库 */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ui, dataRevision, statesVersion]);

  const visibleBooks = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = books.filter((book) => {
      if (!book) return false;
      if (needle) {
        const haystack = `${book.title || ''} ${book.author || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filter === 'reading') return ui.readingStateOf(book.id) === 'reading';
      if (filter === 'finished') return ui.readingStateOf(book.id) === 'finished';
      if (filter === 'highlighted') return ui.highlightCountOf(book.id) > 0;
      return true;
    });
    const withMeta = list.map((book) => ({
      book,
      recent: Number(book.openedAt) || Number(book.addedAt) || 0,
      added: Number(book.addedAt) || 0,
    }));
    if (sort === 'title') {
      withMeta.sort((a, b) => String(a.book.title || '').localeCompare(String(b.book.title || ''), 'zh-Hans-CN'));
    } else if (sort === 'added') {
      withMeta.sort((a, b) => b.added - a.added);
    } else {
      withMeta.sort((a, b) => b.recent - a.recent);
    }
    return withMeta.map((entry) => entry.book);
  }, [books, query, sort, filter, statesVersion, ui]);

  const onPickFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (event.target) event.target.value = '';
    if (file) ui.importBook(file);
  };

  const filterChips = [
    ['all', '全部'],
    ['reading', '在读'],
    ['finished', '已读'],
    ['highlighted', '有划线'],
  ];

  const isEmpty = !visibleBooks.length;
  const showLoading = (loading || status.status === 'loading') && !books.length;
  const resumeBook = filter === 'all' && !query.trim()
    ? visibleBooks.find((book) => ui.readingStateOf(book.id) === 'reading')
    : null;

  return h(
    'div',
    { className: 'qmr-library' },
    h(
      'div',
      { className: 'qmr-topbar' },
      h(IconLibrary, { width: 18, height: 18 }),
      h(
        'div',
        { className: 'qmr-topbar-title' },
        h('div', { className: 'qmr-title' }, ui.t('library', '书库')),
        h('div', { className: 'qmr-subtitle' },
          `${books.length} 本书${query.trim() ? ` · 匹配 ${visibleBooks.length} 本` : ''}`),
      ),
      h(
        'div',
        { className: 'qmr-actions' },
        h('input', {
          className: 'qmr-input qmr-input-search',
          type: 'search',
          value: query,
          placeholder: '搜索书名或作者…',
          'aria-label': '搜索书库',
          onChange: (event) => ui.store.set({ libraryQuery: event.target.value }),
        }),
        h('select', {
          className: 'qmr-select',
          value: sort,
          'aria-label': '排序方式',
          onChange: (event) => ui.store.set({ librarySort: event.target.value }),
        },
        h('option', { value: 'recent' }, '最近阅读'),
        h('option', { value: 'added' }, '加入时间'),
        h('option', { value: 'title' }, '标题')),
        h(
          'span',
          { className: 'qmr-chips', role: 'group', 'aria-label': '筛选' },
          filterChips.map(([key, label]) => h('button', {
            key,
            type: 'button',
            className: `qmr-chip${filter === key ? ' is-active' : ''}`,
            'aria-pressed': filter === key,
            onClick: () => ui.store.set({ libraryFilter: key }),
          }, label)),
        ),
        h('input', {
          ref: fileRef,
          type: 'file',
          accept: '.epub,.pdf,.txt',
          style: { display: 'none' },
          'aria-hidden': 'true',
          tabIndex: -1,
          onChange: onPickFile,
        }),
        h('button', {
          type: 'button',
          className: 'qmr-btn qmr-btn-primary',
          disabled: importing,
          onClick: () => {
            try {
              if (fileRef.current) fileRef.current.click();
            } catch (_error) {
              ui.toast('当前环境无法打开文件选择器', 'warn');
            }
          },
        }, h(IconImport, { width: 16, height: 16 }), importing ? '导入中…' : '导入书籍'),
        h('button', {
          type: 'button',
          className: 'qmr-btn qmr-btn-icon',
          'aria-label': '刷新书库',
          onClick: () => ui.refreshLibrary(),
        }, h(IconRefresh, { width: 16, height: 16 })),
        h('button', {
          type: 'button',
          className: 'qmr-btn qmr-btn-icon',
          'aria-label': '全屏',
          onClick: () => ui.toggleFullscreen(),
        }, h(IconFullscreen, { width: 16, height: 16 })),
        h('button', {
          type: 'button',
          className: 'qmr-btn qmr-btn-icon',
          'aria-label': '关闭阅读器',
          onClick: () => ui.closeOverlay(),
        }, h(IconClose, { width: 16, height: 16 })),
      ),
    ),
    h(
      'div',
      { className: 'qmr-lib-scroll' },
      status.error
        ? h('div', { className: 'qmr-errorbox' },
          h('div', { className: 'qmr-errorbox-title' }, '书库读取失败'),
          h('div', { className: 'qmr-errorbox-text' }, String(status.error)),
          h('button', {
            type: 'button',
            className: 'qmr-btn qmr-btn-sm',
            onClick: () => ui.refreshLibrary(),
          }, '重试'))
        : null,
      showLoading
        ? h('div', { className: 'qmr-busy' }, '内置书正在加载…')
        : (isEmpty
          ? h(
            'div',
            { className: 'qmr-empty' },
            h('div', { className: 'qmr-empty-title' },
              books.length ? '没有符合条件的书' : '书库还是空的'),
            h('p', null,
              books.length
                ? '换个关键词，或把筛选切回「全部」。'
                : (status.status === 'loading'
                  ? '内置公版书正在加载，稍等片刻会自动出现。'
                  : '导入 EPUB、PDF 或 TXT，就能开始阅读并保存划线与批注。')),
            h(
              'div',
              { className: 'qmr-empty-actions' },
              h('button', {
                type: 'button',
                className: 'qmr-btn qmr-btn-primary',
                onClick: () => {
                  try {
                    if (fileRef.current) fileRef.current.click();
                  } catch (_error) {
                    ui.toast('当前环境无法打开文件选择器', 'warn');
                  }
                },
              }, h(IconImport, { width: 16, height: 16 }), '导入书籍'),
              h('button', {
                type: 'button',
                className: 'qmr-btn',
                onClick: () => ui.refreshLibrary(),
              }, h(IconRefresh, { width: 16, height: 16 }), '刷新书库'),
              books.length
                ? h('button', {
                  type: 'button',
                  className: 'qmr-btn',
                  onClick: () => {
                    ui.store.set({ libraryQuery: '', libraryFilter: 'all' });
                  },
                }, '清空筛选')
                : null,
            ),
          )
          : h(
            React.Fragment,
            null,
            resumeBook ? h('div', { className: 'qmr-resume' },
              h('div', { className: 'qmr-resume-copy' },
                h('div', { className: 'qmr-resume-label' }, '继续阅读'),
                h('div', { className: 'qmr-resume-title' }, resumeBook.title || resumeBook.id),
                h('div', { className: 'qmr-resume-meta' }, `${ui.progressTextOf(resumeBook.id)} · ${ui.highlightCountOf(resumeBook.id)} 条划线`)),
              h('button', { type: 'button', className: 'qmr-btn qmr-btn-primary', onClick: () => ui.openBook(resumeBook.id) }, '继续阅读'),
            ) : null,
            h('div', { className: 'qmr-lib-grid' },
              visibleBooks.map((book) => h(BookCard, { key: String(book.id), ui, book }))),
          )),
    ),
  );
}

/** 供 shell 复用的截断（保持同一展示规则） */
export const truncateForCard = (value) => truncate(value, 60);
