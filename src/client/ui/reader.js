/**
 * 阅读器正文区：章节渲染、翻页（分页 / 连续滚动）、进度、键盘、选中菜单、搜索命中高亮。
 *
 * 分页实现：正文容器用 CSS 多列（column-width = 视口正文宽），通过 transform 平移整页，
 * 宽屏 + 设置里开启「双页」时每页并排两列。连续滚动模式退化为普通 overflow 容器。
 */
import * as React from 'react';
import {
  fontStackOf,
  readerThemeVars,
} from './theme.js';
import { chapterIndexForHref, chapterLabelMap, formatPercent } from './format.js';
import { useMediaQuery } from './hooks.js';
import {
  IconBack,
  IconClose,
  IconFullscreen,
  IconHighlight,
  IconNext,
  IconPrev,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconToc,
} from './icons.js';
import { CompanionPanel } from './companion.js';
import { SelectionMenu } from './selection-menu.js';
import { TocPanel } from './toc.js';
import { HighlightsPanel } from './panel-highlights.js';
import { SearchPanel } from './panel-search.js';
import { SettingsPanel } from './panel-settings.js';

const h = React.createElement;
/** 相邻两列之间的间距 */
const COLUMN_GAP = 56;

/** 取章节 href */
function chapterHrefOf(engine, index) {
  try {
    const chapters = (engine && engine.book && engine.book.chapters) || [];
    const chapter = chapters[index];
    return chapter ? String(chapter.href || '') : '';
  } catch (_error) {
    return '';
  }
}

/**
 * 收集容器内文本节点，生成「空白折叠后的文本」与「归一化下标 -> DOM 位置」映射。
 * 跨节点补一个空格，保证跨 <em>/<a> 的选区也能整段匹配。
 * @param {HTMLElement} container
 * @returns {{text:string, map:Array<{node:Text,offset:number}>}}
 */
function buildTextIndex(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const map = [];
  let text = '';
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue || '';
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      if (/\s/.test(ch)) {
        if (text && !text.endsWith(' ')) {
          text += ' ';
          map.push({ node, offset: i });
        }
        continue;
      }
      text += ch;
      map.push({ node, offset: i });
    }
    node = walker.nextNode();
    if (node && text && !text.endsWith(' ')) {
      text += ' ';
      map.push({ node, offset: 0 });
    }
  }
  return { text, map };
}

/** 在归一化文本里找所有匹配下标 */
function findRanges(text, needle, limit) {
  const hay = String(text || '').toLowerCase();
  const need = String(needle || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const out = [];
  if (!need) return out;
  let from = 0;
  while (out.length < limit) {
    const at = hay.indexOf(need, from);
    if (at < 0) break;
    out.push({ start: at, end: at + need.length });
    from = at + Math.max(1, need.length);
  }
  return out;
}

/** 把一个归一化区间包裹成 <mark>，失败返回 null */
function applyRange(map, range, className, attributes) {
  const start = map[range.start];
  const end = map[range.end - 1];
  if (!start || !end) return null;
  try {
    const domRange = document.createRange();
    domRange.setStart(start.node, start.offset);
    domRange.setEnd(end.node, end.offset + 1);
    const mark = document.createElement('mark');
    mark.className = className;
    for (const key of Object.keys(attributes || {})) mark.setAttribute(key, attributes[key]);
    const fragment = domRange.extractContents();
    mark.appendChild(fragment);
    domRange.insertNode(mark);
    return mark;
  } catch (_error) {
    return null;
  }
}

/**
 * 把容器内所有匹配串包成 <mark class=...>，返回文档顺序的 mark 列表。
 * @param {HTMLElement} container
 * @param {string} needle
 * @param {string} className
 * @param {object} [attributes]
 * @returns {HTMLElement[]}
 */
export function wrapTextMatches(container, needle, className, attributes) {
  const { text, map } = buildTextIndex(container);
  const ranges = findRanges(text, needle, 80);
  const marks = [];
  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const mark = applyRange(map, ranges[i], className, attributes);
    if (mark) marks.push(mark);
  }
  return marks.reverse();
}

/**
 * 给本章划线打标记（贪心去重：同一段文字只用一次，互不重叠）。
 * @param {HTMLElement} container
 * @param {object[]} highlights
 * @returns {HTMLElement[]}
 */
function wrapHighlights(container, highlights) {
  const { text, map } = buildTextIndex(container);
  const taken = [];
  const plan = [];
  for (const highlight of highlights) {
    const needle = String((highlight && highlight.text) || '').trim();
    if (!needle) continue;
    const candidates = findRanges(text, needle, 200);
    if (Number.isFinite(highlight.textOffset)) {
      candidates.sort((a, b) => Math.abs(a.start - highlight.textOffset) - Math.abs(b.start - highlight.textOffset));
    }
    let chosen = null;
    for (const candidate of candidates) {
      const overlaps = taken.some((item) => candidate.start < item.end && item.start < candidate.end);
      if (!overlaps) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) continue;
    taken.push(chosen);
    plan.push({ range: chosen, highlight });
  }
  plan.sort((a, b) => b.range.start - a.range.start);
  const marks = [];
  for (const item of plan) {
    const color = item.highlight.color || 'yellow';
    const mark = applyRange(map, item.range, `qmr-hl qmr-hl-${color}`, { 'data-qmr-hl': String(item.highlight.id || '') });
    if (mark) marks.push(mark);
  }
  return marks;
}

/** 本章划线 / 搜索命中的选中状态清理 */
function clearFocusMarks(container) {
  try {
    for (const node of container.querySelectorAll('.qmr-hl.is-focused')) node.classList.remove('is-focused');
    for (const node of container.querySelectorAll('.qm-hit.is-current')) node.classList.remove('is-current');
  } catch (_error) {
    /* 忽略 */
  }
}

/**
 * 阅读视图。
 * @param {object} props
 * @param {object} props.ui 控制器
 * @returns {React.ReactElement}
 */
export function ReaderView({ ui, chatApi, SessionProvider, renderSlot }) {
  const bookId = ui.useSel((state) => state.bookId);
  const chapterIndex = ui.useSel((state) => Number(state.chapterIndex) || 0);
  const chapterCount = ui.useSel((state) => Number(state.chapterCount) || 0);
  const panel = ui.useSel((state) => state.panel);
  const selection = ui.useSel((state) => state.selection);
  const searchQuery = ui.useSel((state) => state.searchQuery);
  const searchIndex = ui.useSel((state) => Number(state.searchIndex));
  const searchResults = ui.useSel((state) => state.searchResults) || [];
  const restoreScroll = ui.useSel((state) => state.restoreScroll);
  const focusHighlightId = ui.useSel((state) => state.focusHighlightId);
  const focusToken = ui.useSel((state) => state.focusToken);
  const searchFocusToken = ui.useSel((state) => state.searchFocusToken);
  const imagesVersion = ui.useSel((state) => state.imagesVersion);
  const engineVersion = ui.useSel((state) => state.engineVersion);
  const chapterBusy = ui.useSel((state) => state.chapterBusy);
  const bookState = ui.useSel((state) => (state.states || {})[bookId] || null);
  const narrow = useMediaQuery('(max-width: 900px)');

  const book = ui.bookOf(bookId);
  const sectionUnit = book?.format === 'pdf' ? '页' : book?.format === 'txt' ? '部分' : '章';
  const engine = ui.engineOf(bookId);
  const storedSettings = ui.settingsOf(bookId);
  const settings = book?.format === 'pdf' ? { ...storedSettings, flow: 'scroll' } : storedSettings;
  const themeVars = readerThemeVars(settings.theme);
  const labels = React.useMemo(() => chapterLabelMap(engine), [engine, engineVersion]);

  const [html, setHtml] = React.useState('');
  const [renderError, setRenderError] = React.useState(null);
  const [page, setPageState] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);

  const viewportRef = React.useRef(null);
  const flowRef = React.useRef(null);
  const measureRef = React.useRef({ pages: 1, perPage: 1, columnWidth: 320, gap: COLUMN_GAP });
  const lastHtmlRef = React.useRef(null);
  const pendingLandLastRef = React.useRef(false);
  const lastFocusRef = React.useRef('');
  const lastSearchFocusRef = React.useRef(null);
  const scrollTimerRef = React.useRef(null);

  const highlights = React.useMemo(
    () => ((bookState && bookState.highlights) || []).filter(Boolean),
    [bookState],
  );
  const highlightSignature = highlights.map((item) => `${item.id}:${item.color}`).join('|');
  /** 用 ref 保存最新集合：DOM 重建只依赖签名，避免位置上报等状态写入重建正文 */
  const highlightsRef = React.useRef(highlights);
  highlightsRef.current = highlights;
  const searchResultsRef = React.useRef(searchResults);
  searchResultsRef.current = searchResults;

  /** 当前渲染用的实时快照（供 pager / 事件回调读取最新值） */
  const liveRef = React.useRef({});
  liveRef.current = {
    page,
    pageCount,
    chapterIndex,
    chapterCount,
    engine,
    settings,
    bookId,
    book,
    highlights,
    searchQuery,
    searchIndex,
    searchResults,
    focusHighlightId,
    restoreScroll,
  };

  // ------------------------------------------------------------- 状态加载

  React.useEffect(() => {
    if (bookId != null) ui.loadState(bookId);
  }, [bookId, ui]);

  // ------------------------------------------------------------- 章节 HTML

  React.useEffect(() => {
    let cancelled = false;
    if (!engine || bookId == null) {
      setHtml('');
      return undefined;
    }
    ui.store.set({ chapterBusy: true });
    Promise.resolve()
      .then(() => engine.render(chapterIndex, ui.resourceResolver(bookId)))
      .then((out) => {
        if (cancelled) return;
        setHtml(typeof out === 'string' ? out : '');
        setRenderError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setHtml('');
        setRenderError(ui.reportError(error, true));
      })
      .then(() => {
        if (!cancelled) ui.store.set({ chapterBusy: false });
      }, () => {});
    return () => {
      cancelled = true;
    };
  }, [engine, bookId, chapterIndex, engineVersion, imagesVersion, ui]);

  // ------------------------------------------------------------- 设置页码

  const setPage = React.useCallback((next) => {
    setPageState((previous) => {
      const max = Math.max(0, (measureRef.current.pages || 1) - 1);
      const raw = typeof next === 'function' ? next(previous) : next;
      const value = Math.min(Math.max(0, Number(raw) || 0), max);
      return value;
    });
  }, []);

  /** 测量并布局分页 */
  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    const flow = flowRef.current;
    if (!viewport || !flow) return measureRef.current;
    try {
      const computed = window.getComputedStyle ? window.getComputedStyle(viewport) : null;
      const padLeft = computed ? parseFloat(computed.paddingLeft) || 0 : 0;
      const padRight = computed ? parseFloat(computed.paddingRight) || 0 : 0;
      const width = Math.max(140, viewport.clientWidth - padLeft - padRight);
      const paginated = settings.flow !== 'scroll';
      const perPage = paginated && settings.spread && width >= 900 ? 2 : 1;
      const gap = COLUMN_GAP;
      const columnWidth = Math.max(90, (width - (perPage - 1) * gap) / perPage);
      flow.style.width = `${width}px`;
      flow.style.height = paginated ? '100%' : 'auto';
      if (paginated) {
        flow.style.columnWidth = `${columnWidth}px`;
        flow.style.columnGap = `${gap}px`;
        flow.style.columnFill = 'auto';
      }
      let pages = 1;
      if (paginated) {
        const total = flow.scrollWidth || width;
        const columns = Math.max(1, Math.round((total + gap) / (columnWidth + gap)));
        pages = Math.max(1, Math.ceil(columns / perPage));
      }
      measureRef.current = { pages, perPage, columnWidth, gap };
      setPageCount(pages);
      setPage((value) => value);
      return measureRef.current;
    } catch (_error) {
      return measureRef.current;
    }
  }, [settings.flow, settings.spread, setPage]);

  // ------------------------------------------------------------- 应用 DOM（划线/搜索）

  /**
   * 重效果：只在「章节 HTML / 划线集合 / 搜索词」真正变化时重建正文 DOM。
   * 位置上报等 BookState 写入不会触发这里，避免每几秒重建 DOM（会打断用户选中与滚动）。
   */
  React.useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const isNewHtml = lastHtmlRef.current !== html;
    lastHtmlRef.current = html;
    try {
      flow.innerHTML = html || '';
    } catch (error) {
      ui.reportError(error, true);
      return;
    }
    try {
      const chapterHref = chapterHrefOf(engine, chapterIndex);
      const forChapter = (highlightsRef.current || []).filter((item) => {
        if (!item) return false;
        if (!item.chapterHref) return true;
        if (item.chapterHref === chapterHref) return true;
        return chapterIndexForHref(engine, item.chapterHref) === chapterIndex;
      });
      if (forChapter.length) wrapHighlights(flow, forChapter);
      if (searchQuery && String(searchQuery).trim()) wrapTextMatches(flow, searchQuery, 'qm-hit', {});
    } catch (error) {
      ui.reportError(error, true);
    }

    const meta = measure();

    if (isNewHtml) {
      if (pendingLandLastRef.current) {
        pendingLandLastRef.current = false;
        setPage(Math.max(0, (meta.pages || 1) - 1));
        if (settings.flow === 'scroll') {
          requestAnimationFrame(() => {
            const viewport = viewportRef.current;
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
          });
        }
      } else {
        setPage(0);
        if (settings.flow === 'scroll') {
          const fraction = Math.min(1, Math.max(0, Number(restoreScroll) || 0));
          requestAnimationFrame(() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            viewport.scrollTop = fraction * Math.max(0, viewport.scrollHeight - viewport.clientHeight);
          });
        }
      }
    }
  }, [
    html,
    highlightSignature,
    searchQuery,
    chapterIndex,
    restoreScroll,
    settings.flow,
    settings.spread,
    engine,
    measure,
    setPage,
    ui,
  ]);

  /**
   * 轻效果：只切换「当前搜索命中 / 当前划线」的 class 与滚动位置，不重建 DOM。
   */
  React.useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    try {
      clearFocusMarks(flow);

      // 当前搜索命中
      let current = null;
      if (searchQuery && String(searchQuery).trim()) {
        const marks = flow.querySelectorAll('.qm-hit');
        const ordinal = (searchResultsRef.current || [])
          .slice(0, Math.max(0, searchIndex))
          .filter((hit) => hit && Number(hit.chapterIndex) === chapterIndex).length;
        current = marks[ordinal] || null;
        if (current) current.classList.add('is-current');
      }

      // 划线定位（找不到精确 mark 时回退到与之重叠的 mark，避免「点了没反应」）
      if (focusHighlightId && html && !chapterBusy) {
        const focusKey = `${focusToken}:${focusHighlightId}`;
        const key = String(focusHighlightId).replace(/"/g, '');
        let target = flow.querySelector(`[data-qmr-hl="${key}"]`);
        if (!target) {
          const wanted = (highlightsRef.current || []).find((item) => item && String(item.id) === key);
          const needle = String((wanted && wanted.text) || '').replace(/\s+/g, '').slice(0, 6);
          if (needle) {
            for (const mark of flow.querySelectorAll('.qmr-hl')) {
              const markText = String(mark.textContent || '').replace(/\s+/g, '');
              if (markText && (markText.includes(needle) || needle.includes(markText.slice(0, 4)))) {
                target = mark;
                break;
              }
            }
          }
        }
        if (target) {
          target.classList.add('is-focused');
          if (lastFocusRef.current !== focusKey) {
            lastFocusRef.current = focusKey;
            if (target.scrollIntoView) target.scrollIntoView({ block: 'center', inline: 'nearest' });
          }
        } else if (lastFocusRef.current !== focusKey) {
          requestAnimationFrame(() => {
            const settled = flow.querySelector(`[data-qmr-hl="${key}"]`);
            if (settled) {
              settled.classList.add('is-focused');
              settled.scrollIntoView?.({ block: 'center', inline: 'nearest' });
            } else if (lastFocusRef.current !== focusKey) {
              ui.toast('这条划线在当前页面找不到对应文字', 'warn');
            }
            lastFocusRef.current = focusKey;
          });
        }
      }

      // 搜索命中定位
      const searchKey = `${searchFocusToken}:${searchIndex}:${chapterIndex}:${searchQuery}`;
      if (current && lastSearchFocusRef.current !== searchKey) {
        lastSearchFocusRef.current = searchKey;
        if (current.scrollIntoView) current.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    } catch (_error) {
      /* 忽略 */
    }
  }, [
    html,
    highlightSignature,
    searchQuery,
    searchIndex,
    searchFocusToken,
    chapterIndex,
    focusToken,
    focusHighlightId,
    chapterBusy,
  ]);

  // 平移当前页
  React.useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    if (settings.flow === 'scroll') {
      flow.style.transform = 'none';
      return;
    }
    const meta = measureRef.current;
    const offset = page * (meta.perPage || 1) * ((meta.columnWidth || 320) + (meta.gap || COLUMN_GAP));
    flow.style.transform = `translateX(${-offset}px)`;
    flow.style.transition = 'transform .18s ease';
  }, [page, settings.flow, pageCount, settings.spread, settings.fontSize, settings.margin]);

  // 尺寸变化重新测量
  React.useEffect(() => {
    const measureNow = () => {
      try {
        measure();
      } catch (_error) {
        /* 忽略 */
      }
    };
    measureNow();
    let observer = null;
    try {
      if (typeof ResizeObserver === 'function' && viewportRef.current) {
        observer = new ResizeObserver(measureNow);
        observer.observe(viewportRef.current);
      }
    } catch (_error) {
      observer = null;
    }
    window.addEventListener('resize', measureNow);
    return () => {
      window.removeEventListener('resize', measureNow);
      if (observer) {
        try {
          observer.disconnect();
        } catch (_error) {
          /* 忽略 */
        }
      }
    };
  }, [measure, html]);

  // ------------------------------------------------------------- 位置上报

  const reportPosition = React.useCallback(() => {
    const live = liveRef.current;
    if (live.bookId == null) return;
    let scroll = 0;
    if (live.settings && live.settings.flow === 'scroll') {
      const viewport = viewportRef.current;
      if (viewport && viewport.scrollHeight > viewport.clientHeight) {
        scroll = viewport.scrollTop / (viewport.scrollHeight - viewport.clientHeight);
      }
    } else {
      const pages = (measureRef.current && measureRef.current.pages) || 1;
      scroll = pages > 1 ? live.page / (pages - 1) : 0;
    }
    let quote = '';
    try {
      const flow = flowRef.current;
      if (flow) quote = String(flow.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    } catch (_error) {
      quote = '';
    }
    ui.reportPosition(live.bookId, {
      chapterIndex: live.chapterIndex,
      chapterHref: chapterHrefOf(live.engine, live.chapterIndex),
      scroll: Math.min(1, Math.max(0, scroll)),
      textQuote: quote,
    });
  }, [ui]);

  React.useEffect(() => {
    ui.store.set({ page, pageCount });
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      reportPosition();
    }, 350);
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [page, pageCount, chapterIndex, ui, reportPosition]);

  // ------------------------------------------------------------- pager 注册

  React.useEffect(() => {
    const isScroll = () => {
      const live = liveRef.current;
      return !!(live.settings && live.settings.flow === 'scroll');
    };
    const next = () => {
      const live = liveRef.current;
      if (isScroll()) {
        const viewport = viewportRef.current;
        if (viewport) {
          const remaining = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
          if (remaining > 8) {
            viewport.scrollTop = Math.min(viewport.scrollTop + viewport.clientHeight * 0.9, viewport.scrollHeight);
            return;
          }
        }
        if (live.chapterIndex + 1 < live.chapterCount) ui.goChapter(live.chapterIndex + 1);
        else ui.toast('已经是最后一页');
        return;
      }
      const pages = (measureRef.current && measureRef.current.pages) || 1;
      if (live.page + 1 < pages) setPage(live.page + 1);
      else if (live.chapterIndex + 1 < live.chapterCount) ui.goChapter(live.chapterIndex + 1);
      else ui.toast('已经是最后一页');
    };
    const prev = () => {
      const live = liveRef.current;
      if (isScroll()) {
        const viewport = viewportRef.current;
        if (viewport && viewport.scrollTop > 0) {
          viewport.scrollTop = Math.max(0, viewport.scrollTop - viewport.clientHeight * 0.9);
          return;
        }
        if (live.chapterIndex > 0) {
          pendingLandLastRef.current = true;
          ui.goChapter(live.chapterIndex - 1);
        } else {
          ui.toast('已经是第一页');
        }
        return;
      }
      if (live.page > 0) setPage(live.page - 1);
      else if (live.chapterIndex > 0) {
        pendingLandLastRef.current = true;
        ui.goChapter(live.chapterIndex - 1);
      } else {
        ui.toast('已经是第一页');
      }
    };
    ui.registerPager({ next, prev, jump: (fraction) => ui.goPercent(fraction) });
    return () => {
      ui.registerPager({ next: () => ui.goChapter((ui.store.get().chapterIndex || 0) + 1), prev: () => ui.goChapter((ui.store.get().chapterIndex || 0) - 1) });
    };
  }, [ui, setPage]);

  // ------------------------------------------------------------- 键盘

  React.useEffect(() => {
    const onKeyDown = (event) => {
      const state = ui.store.get();
      if (!state.visible || state.view !== 'reader') return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          ui.turnPage(-1);
          break;
        case 'ArrowRight':
        case 'PageDown':
          ui.turnPage(1);
          break;
        case ' ':
        case 'Spacebar':
          if (event.shiftKey) ui.turnPage(-1);
          else ui.turnPage(1);
          break;
        case 'Home':
          ui.goChapter(0);
          break;
        case 'End':
          ui.goChapter(Math.max(0, (Number(state.chapterCount) || 1) - 1));
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ui]);

  // ------------------------------------------------------------- 选中 / 点击

  React.useEffect(() => {
    const onMouseUp = () => {
      try {
        const flow = flowRef.current;
        if (!flow) return;
        const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if (!flow.contains(range.commonAncestorContainer)) return;
        const text = String(sel.toString() || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        const before = range.cloneRange();
        before.selectNodeContents(flow);
        before.setEnd(range.startContainer, range.startOffset);
        const textOffset = before.toString().replace(/\s+/g, ' ').trim().length;
        const rect = range.getBoundingClientRect();
        if (!rect || (!rect.width && !rect.height)) return;
        const live = liveRef.current;
        const pages = (measureRef.current && measureRef.current.pages) || 1;
        const within = pages > 1 ? live.page / (pages - 1) : 0;
        const count = Number(live.chapterCount) || 0;
        ui.setSelection({
          text,
          anchor: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
          },
          chapterHref: chapterHrefOf(live.engine, live.chapterIndex),
          textOffset,
          percent: count ? Math.min(1, (live.chapterIndex + within) / count) : 0,
        });
      } catch (_error) {
        ui.clearSelection();
      }
    };
    const onMouseDown = (event) => {
      try {
        const target = event.target;
        if (target && target.closest && target.closest('.qmr-selmenu')) return;
        const selection = ui.store.get().selection;
        if (selection) ui.clearSelection();
      } catch (_error) {
        /* 忽略 */
      }
    };
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [ui]);

  const onContentClick = (event) => {
    try {
      const target = event.target;
      if (target && target.closest) {
        const mark = target.closest('[data-qmr-hl]');
        if (mark) {
          const id = mark.getAttribute('data-qmr-hl');
          if (id) {
            ui.store.set({ focusHighlightId: id });
            ui.setPanel('highlights');
            return;
          }
        }
        const anchor = target.closest('a[href]');
        if (anchor) {
          const href = String(anchor.getAttribute('href') || '');
          if (/^https?:/i.test(href)) {
            event.preventDefault();
            try {
              window.open(href, '_blank', 'noopener,noreferrer');
            } catch (_error) {
              /* 忽略 */
            }
            return;
          }
          event.preventDefault();
          const live = liveRef.current;
          let index = null;
          try {
            index = live.engine && live.engine.resolveLink ? live.engine.resolveLink(live.chapterIndex, href) : null;
          } catch (_error) {
            index = null;
          }
          if (typeof index === 'number' && index >= 0) ui.goChapter(index);
          else ui.toast('无法定位这个链接', 'warn');
        }
      }
    } catch (_error) {
      /* 忽略 */
    }
  };

  // ------------------------------------------------------------- 进度条

  const progress = chapterCount
    ? Math.min(1, Math.max(0, (chapterIndex + (pageCount > 1 ? page / (pageCount - 1) : 0)) / chapterCount))
    : 0;

  const jumpFromPointer = (clientX, element) => {
    try {
      const rect = element.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      ui.goPercent(ratio);
    } catch (_error) {
      /* 忽略 */
    }
  };

  const onTrackPointerDown = (event) => {
    try {
      const element = event.currentTarget;
      if (element.setPointerCapture) element.setPointerCapture(event.pointerId);
      element.dataset.qmrDragging = '1';
      jumpFromPointer(event.clientX, element);
    } catch (_error) {
      /* 忽略 */
    }
  };
  const onTrackPointerMove = (event) => {
    try {
      const element = event.currentTarget;
      if (element.dataset && element.dataset.qmrDragging === '1') jumpFromPointer(event.clientX, element);
    } catch (_error) {
      /* 忽略 */
    }
  };
  const onTrackPointerUp = (event) => {
    try {
      const element = event.currentTarget;
      if (element.dataset) delete element.dataset.qmrDragging;
      if (element.releasePointerCapture) element.releasePointerCapture(event.pointerId);
    } catch (_error) {
      /* 忽略 */
    }
  };

  // ------------------------------------------------------------- 选中菜单动作

  const onHighlight = (color) => {
    const current = ui.store.get().selection;
    if (!current) return;
    ui.addHighlight(bookId, {
      text: current.text,
      chapterHref: current.chapterHref,
      color,
      percent: current.percent,
      textOffset: current.textOffset,
    });
    ui.clearSelection();
    ui.toast('已划线', 'ok');
  };

  const onNote = () => {
    const current = ui.store.get().selection;
    if (!current) return;
    const highlight = ui.addHighlight(bookId, {
      text: current.text,
      chapterHref: current.chapterHref,
      color: 'yellow',
      percent: current.percent,
      textOffset: current.textOffset,
      note: '',
    });
    ui.clearSelection();
    if (highlight) {
      ui.store.set({ editingHighlightId: highlight.id });
      ui.setPanel('highlights');
    } else {
      ui.toast('请稍候再试', 'warn');
    }
  };

  const onAsk = () => {
    const current = ui.store.get().selection;
    if (current) ui.store.set({ companionSelection: { text: current.text, chapterHref: current.chapterHref } });
    if (ui.store.get().panel !== 'companion') ui.setPanel('companion');
    else ui.clearSelection();
  };

  // ------------------------------------------------------------- 渲染

  const viewportClass = `qmr-page-viewport`;
  const contentStyle = settings.flow === 'scroll'
    ? { padding: `${Math.round(settings.margin * 0.55)}px ${settings.margin}px 28px` }
    : { padding: `24px ${settings.margin}px 30px` };
  contentStyle.width = '100%';
  contentStyle.maxWidth = settings.spread ? '1160px' : '880px';
  contentStyle.marginInline = 'auto';
  const flowStyle = {
    fontFamily: fontStackOf(settings.fontFamily),
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.justify ? 'justify' : 'left',
    color: 'var(--qmr-ink)',
  };

  const panelNode = panel === 'toc'
    ? h(TocPanel, { ui })
    : panel === 'search'
      ? h(SearchPanel, { ui })
      : panel === 'highlights' || panel === 'notes'
        ? h(HighlightsPanel, { ui })
        : panel === 'companion'
          ? h(CompanionPanel, { ui, bookId, chapterIndex, engine, chatApi, SessionProvider, renderSlot })
        : panel === 'settings'
          ? h(SettingsPanel, { ui })
          : null;

  const title = (book && book.title) || '阅读';
  const author = (book && book.author) || '';
  const chapterLabel = labels.get(chapterIndex) || `第 ${chapterIndex + 1} 章`;

  const toolbarButton = (key, icon, label, onClick, active) => h(
    'button',
    {
      key,
      type: 'button',
      className: `qmr-btn${active ? ' is-active' : ''}`,
      'aria-label': label,
      'aria-pressed': active ? 'true' : undefined,
      onClick,
    },
    icon,
    h('span', { className: 'qmr-toolbar-label' }, label),
  );

  return h(
    'div',
    { className: 'qmr-reader', 'data-qmr-theme': settings.theme, style: themeVars },
    h(
      'div',
      { className: 'qmr-topbar' },
      h('button', {
        type: 'button',
        className: 'qmr-btn qmr-btn-icon',
        'aria-label': '返回书库',
        onClick: () => ui.backToLibrary(),
      }, h(IconBack, { width: 16, height: 16 })),
      h(
        'div',
        { className: 'qmr-topbar-title' },
        h('div', { className: 'qmr-title' }, title),
        h('div', { className: 'qmr-subtitle' },
          [author, chapterLabel, formatPercent(progress)].filter(Boolean).join(' · ')),
      ),
      h(
        'div',
        { className: 'qmr-actions' },
        toolbarButton('toc', h(IconToc, { width: 16, height: 16 }), '目录', () => ui.setPanel('toc'), panel === 'toc'),
        toolbarButton('search', h(IconSearch, { width: 16, height: 16 }), '搜索', () => ui.setPanel('search'), panel === 'search'),
        toolbarButton('hl', h(IconHighlight, { width: 16, height: 16 }), '划线', () => ui.setPanel('highlights'), panel === 'highlights' || panel === 'notes'),
        toolbarButton('ai', h(IconSparkles, { width: 16, height: 16 }), 'AI 伴读', () => ui.setPanel('companion'), panel === 'companion'),
        toolbarButton('settings', h(IconSettings, { width: 16, height: 16 }), '设置', () => ui.setPanel('settings'), panel === 'settings'),
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
      { className: 'qmr-reader-main' },
      h(
        'div',
        {
          className: `qmr-reader-content${settings.flow === 'scroll' ? ' qmr-flow-scroll' : ''}`,
        },
        settings.flow !== 'scroll'
          ? h('button', {
            type: 'button',
            className: 'qmr-page-zone qmr-page-zone-prev',
            'aria-label': '上一页',
            onClick: () => ui.turnPage(-1),
          })
          : null,
        h(
          'div',
          { className: viewportClass, ref: viewportRef, style: contentStyle },
          h('div', {
            className: 'qmr-page-flow qmr-paper-body',
            ref: flowRef,
            style: flowStyle,
            onClick: onContentClick,
            onScroll: undefined,
          }),
        ),
        settings.flow !== 'scroll'
          ? h('button', {
            type: 'button',
            className: 'qmr-page-zone qmr-page-zone-next',
            'aria-label': '下一页',
            onClick: () => ui.turnPage(1),
          })
          : null,
        settings.flow !== 'scroll'
          ? h('div', { className: 'qmr-page-count' }, `第 ${page + 1} / ${pageCount} 页`)
          : null,
        chapterBusy ? h('div', { className: 'qmr-chapter-loading' }, '正在排版…') : null,
        renderError
          ? h('div', { className: 'qmr-errorbox' },
            h('div', { className: 'qmr-errorbox-title' }, `这一${sectionUnit}渲染失败`),
            h('div', { className: 'qmr-errorbox-text' }, renderError),
            h('button', {
              type: 'button',
              className: 'qmr-btn qmr-btn-sm',
              onClick: () => ui.store.set({ engineVersion: (ui.store.get().engineVersion || 0) + 1 }),
            }, '重试'))
          : null,
        selection ? h(SelectionMenu, { ui, selection, onHighlight, onNote, onAsk }) : null,
      ),
      panelNode
        ? h('div', { className: `qmr-panel${panel === 'companion' ? ' qmr-panel-companion' : ''}${narrow ? ' qmr-panel-overlay' : ''}` }, panelNode)
        : null,
    ),
    h(
      'div',
      { className: 'qmr-bottombar' },
      h('button', {
        type: 'button',
        className: 'qmr-icon-btn',
        'aria-label': '上一页',
        onClick: () => ui.turnPage(-1),
      }, h(IconPrev, { width: 16, height: 16 })),
      h(
        'div',
        {
          className: 'qmr-track',
          role: 'slider',
          tabIndex: 0,
          'aria-label': '阅读进度',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': Math.round(progress * 100),
          onPointerDown: onTrackPointerDown,
          onPointerMove: onTrackPointerMove,
          onPointerUp: onTrackPointerUp,
          onPointerCancel: onTrackPointerUp,
          onKeyDown: (event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              ui.turnPage(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              ui.turnPage(1);
            }
          },
        },
        h('div', { className: 'qmr-track-rail' }),
        h('div', { className: 'qmr-track-fill', style: { width: `${Math.round(progress * 100)}%` } }),
        h('div', { className: 'qmr-track-knob', style: { left: `${Math.round(progress * 100)}%` } }),
      ),
      h('span', { className: 'qmr-bottom-text' }, `第 ${chapterIndex + 1} / ${chapterCount || '?'} ${sectionUnit}`),
      h('span', { className: 'qmr-bottom-text' }, formatPercent(progress)),
      h('button', {
        type: 'button',
        className: 'qmr-icon-btn',
        'aria-label': '下一页',
        onClick: () => ui.turnPage(1),
      }, h(IconNext, { width: 16, height: 16 })),
    ),
  );
}
