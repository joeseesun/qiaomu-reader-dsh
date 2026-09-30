/**
 * 设计令牌、阅读主题与组件级样式。
 *
 * 约束：
 * - UI 外壳只使用 DSH 主题令牌 --dsw-alias-*；书页（纸张底色/正文色）使用阅读主题自带颜色。
 * - 所有 class 名以 qmr- 前缀，避免污染宿主样式。
 * - 样式通过 <StyleSheet /> React 元素注入，随组件卸载自动移除，不写 document.head。
 */
import * as React from 'react';

const h = React.createElement;

/** 划线颜色顺序（黄/绿/蓝/粉） */
export const HIGHLIGHT_COLORS = Object.freeze(['yellow', 'green', 'blue', 'pink']);

/** 划线颜色中文名 */
export const HIGHLIGHT_COLOR_LABELS = Object.freeze({
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  pink: '粉',
});

/**
 * 5 套纸张阅读主题。每个主题定义页底色、正文色、次要色、选中高亮色、边线、强调色，
 * 以及 4 种划线的纸面覆盖色（paints）。
 */
export const READER_THEMES = Object.freeze({
  paper: {
    id: 'paper',
    label: '纸白',
    bg: '#f8f6f0',
    text: '#24231f',
    muted: '#746f66',
    ui: '#efebe2',
    border: '#dcd5c8',
    accent: '#4f6758',
    selection: 'rgba(79,103,88,.22)',
    hover: 'rgba(0,0,0,.035)',
    paints: {
      yellow: 'rgba(255,206,64,.45)',
      green: 'rgba(118,214,108,.42)',
      blue: 'rgba(96,165,250,.42)',
      pink: 'rgba(248,123,168,.42)',
    },
  },
  warm: {
    id: 'warm',
    label: '暖纸',
    bg: '#f3ebdd',
    text: '#30291f',
    muted: '#776b59',
    ui: '#e9decb',
    border: '#d5c5ab',
    accent: '#755d3c',
    selection: 'rgba(117,93,60,.22)',
    hover: 'rgba(90,60,20,.05)',
    paints: {
      yellow: 'rgba(240,190,60,.5)',
      green: 'rgba(124,198,110,.44)',
      blue: 'rgba(96,150,225,.44)',
      pink: 'rgba(232,120,158,.44)',
    },
  },
  celadon: {
    id: 'celadon',
    label: '青瓷',
    bg: '#eaf0e8',
    text: '#243029',
    muted: '#667269',
    ui: '#dfe8dd',
    border: '#c6d3c4',
    accent: '#4f6d5a',
    selection: 'rgba(79,109,90,.24)',
    hover: 'rgba(30,70,50,.05)',
    paints: {
      yellow: 'rgba(240,206,84,.5)',
      green: 'rgba(118,206,120,.45)',
      blue: 'rgba(108,170,232,.42)',
      pink: 'rgba(238,138,172,.42)',
    },
  },
  moon: {
    id: 'moon',
    label: '月白',
    bg: '#eef2f3',
    text: '#263238',
    muted: '#5f6d74',
    ui: '#e2e8ea',
    border: '#c9d2d5',
    accent: '#516c78',
    selection: 'rgba(81,108,120,.24)',
    hover: 'rgba(30,60,80,.05)',
    paints: {
      yellow: 'rgba(255,206,64,.48)',
      green: 'rgba(118,214,108,.42)',
      blue: 'rgba(96,165,250,.45)',
      pink: 'rgba(248,123,168,.42)',
    },
  },
  night: {
    id: 'night',
    label: '夜间',
    bg: '#181a1b',
    text: '#d9d7d1',
    muted: '#9a9a94',
    ui: '#222526',
    border: '#383c3d',
    accent: '#91ab9a',
    selection: 'rgba(145,171,154,.3)',
    hover: 'rgba(255,255,255,.05)',
    paints: {
      yellow: 'rgba(214,168,42,.34)',
      green: 'rgba(92,168,88,.32)',
      blue: 'rgba(74,128,196,.34)',
      pink: 'rgba(198,92,132,.32)',
    },
  },
});

/** 主题 id 列表（设置面板展示顺序） */
export const READER_THEME_IDS = Object.freeze(['paper', 'warm', 'celadon', 'moon', 'night']);

/** 字体族候选 */
export const READER_FONT_STACKS = Object.freeze({
  serif: 'Georgia, "Songti SC", "Noto Serif SC", "Source Han Serif SC", "Times New Roman", serif',
  'sans-serif':
    'system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace',
});

/** 字体族展示名 */
export const READER_FONT_LABELS = Object.freeze({
  serif: '衬线',
  'sans-serif': '无衬线',
  mono: '等宽',
});

/** 排版默认值（core DEFAULT_READER_SETTINGS 缺失时的兜底，也补齐 UI 专有字段 spread） */
export const UI_SETTING_DEFAULTS = Object.freeze({
  theme: 'paper',
  fontSize: 18,
  lineHeight: 1.75,
  fontFamily: 'serif',
  margin: 64,
  flow: 'paginated',
  justify: true,
  /** 单双页：宽屏时并用两栏（UI 专有字段，core normalize 可能丢弃，UI 侧始终兜底） */
  spread: false,
});

/**
 * 取某个主题下某种划线色的纸面颜色。
 * @param {string} themeId
 * @param {string} color yellow|green|blue|pink
 * @returns {string} css 颜色
 */
export function highlightPaint(themeId, color) {
  const theme = READER_THEMES[themeId] || READER_THEMES.paper;
  return (theme.paints && theme.paints[color]) || theme.paints.yellow;
}

/**
 * 取字体族 CSS 值。
 * @param {string} fontFamily serif|sans-serif|mono
 * @returns {string}
 */
export function fontStackOf(fontFamily) {
  return READER_FONT_STACKS[fontFamily] || READER_FONT_STACKS.serif;
}

/**
 * 生成挂在阅读器根节点上的 CSS 变量（书页纸张表现）。
 * @param {string} themeId 阅读主题 id
 * @returns {object} React inline style
 */
export function readerThemeVars(themeId) {
  const theme = READER_THEMES[themeId] || READER_THEMES.paper;
  return {
    '--qmr-paper': theme.bg,
    '--qmr-ink': theme.text,
    '--qmr-muted': theme.muted,
    '--qmr-ui': theme.ui,
    '--qmr-border': theme.border,
    '--qmr-accent': theme.accent,
    '--qmr-selection': theme.selection,
    '--qmr-hover': theme.hover,
    '--qmr-hl-yellow': theme.paints.yellow,
    '--qmr-hl-green': theme.paints.green,
    '--qmr-hl-blue': theme.paints.blue,
    '--qmr-hl-pink': theme.paints.pink,
  };
}

/** 组件级样式表。只用 --dsw-alias-* / --dsw-specific-* 令牌，书页部分用 --qmr-* 读书主题变量。 */
export const UI_CSS = `
.qmr-overlay{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;
  background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);
  font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;text-align:left;isolation:isolate}
.qmr-overlay.qmr-embedded{position:relative;inset:auto;z-index:auto;flex:1 1 auto;width:100%;height:100%;min-height:0;min-width:0;overflow:hidden;border-left:0}
.qmr-overlay *,.qmr-overlay *::before,.qmr-overlay *::after{box-sizing:border-box}
.qmr-overlay button,.qmr-overlay input,.qmr-overlay select,.qmr-overlay textarea{font-family:inherit}
.qmr-root{display:flex;flex-direction:column;height:100%;min-height:0;position:relative}
.qmr-topbar{display:flex;align-items:center;gap:8px;padding:8px 12px;min-height:52px;flex:0 0 auto;
  flex-wrap:wrap;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1));
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.qmr-topbar-title{display:flex;flex-direction:column;min-width:0;flex:1 1 180px;gap:2px}
.qmr-title{font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qmr-subtitle{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qmr-spacer{flex:1 1 auto}
.qmr-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.qmr-library .qmr-actions{flex:0 1 auto;justify-content:flex-end}
.qmr-library .qmr-input-search{flex:0 1 220px}
.qmr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 10px;
  border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;
  color:var(--dsw-alias-label-primary);cursor:pointer;font-size:13px;white-space:nowrap}
.qmr-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.qmr-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.qmr-btn.is-active{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.qmr-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.qmr-btn-primary:hover{background:var(--dsw-alias-brand-primary);opacity:.9}
.qmr-btn-icon{width:34px;height:34px;padding:0}
.qmr-btn-sm{height:26px;padding:0 8px;font-size:12px;border-radius:6px}
.qmr-btn:disabled{opacity:.5;cursor:default}
.qmr-btn-danger:hover{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.qmr-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;
  border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.qmr-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.qmr-input,.qmr-select{height:32px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 10px;
  font-size:13px;min-width:0;max-width:100%}
.qmr-input:focus,.qmr-select:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.qmr-input-search{flex:1 1 180px;min-width:120px}
.qmr-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.qmr-chip{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer}
.qmr-chip:hover{background:var(--dsw-alias-bg-layer-2)}
.qmr-chip.is-active{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.qmr-muted{color:var(--dsw-alias-label-secondary)}
.qmr-small{font-size:12px}
.qmr-library{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.qmr-lib-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:16px 16px 40px}
.qmr-lib-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));
  max-width:1440px;margin:0 auto}
.qmr-resume{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1440px;margin:0 auto 16px;
  padding:16px 20px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.qmr-resume-copy{min-width:0}
.qmr-resume-label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.qmr-resume-title{font-size:17px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qmr-resume-meta{font-size:12px;color:var(--dsw-alias-label-secondary)}
.qmr-card{position:relative;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;
  border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);cursor:pointer;text-align:left}
.qmr-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.qmr-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.qmr-cover{position:relative;width:100%;aspect-ratio:2/3;border-radius:8px;overflow:hidden;display:flex;
  align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);
  border:1px solid var(--dsw-alias-border-l1)}
.qmr-cover img{display:block;width:100%;height:100%;object-fit:contain}
.qmr-cover-initials{font-size:38px;font-weight:600;color:#fff;letter-spacing:2px}
.qmr-cover-badge{position:absolute;left:6px;bottom:6px;padding:2px 6px;border-radius:4px;font-size:11px;
  letter-spacing:.5px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));
  color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);text-transform:uppercase}
.qmr-cover-state{position:absolute;right:6px;top:6px;padding:2px 6px;border-radius:4px;font-size:11px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);
  border:1px solid var(--dsw-alias-border-l1)}
.qmr-card-title{font-size:14px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.qmr-card-author{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:16px}
.qmr-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;
  color:var(--dsw-alias-label-secondary)}
.qmr-card-bar{height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden}
.qmr-card-bar-fill{height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.qmr-card-actions{position:absolute;top:6px;left:6px;display:flex;gap:4px;opacity:0;transition:opacity .15s}
.qmr-card:hover .qmr-card-actions,.qmr-card:focus-within .qmr-card-actions{opacity:1}
.qmr-card-study{display:flex;align-items:center;gap:10px;min-height:26px}
.qmr-card-study button{border:0;background:transparent;padding:2px 0;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer}
.qmr-card-study button:hover,.qmr-card-study button:focus-visible{color:var(--dsw-alias-label-primary);text-decoration:underline}
.qmr-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:999px;font-size:11px;
  border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.qmr-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 24px;text-align:center;
  color:var(--dsw-alias-label-secondary);max-width:520px;margin:0 auto}
.qmr-empty-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}
.qmr-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.qmr-reader{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.qmr-reader[data-qmr-theme]{background:var(--qmr-paper);color:var(--qmr-ink)}
.qmr-reader-main{position:relative;display:flex;flex:1 1 auto;min-height:0}
.qmr-reader-content{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-width:0;
  background:var(--qmr-paper);color:var(--qmr-ink)}
.qmr-page-viewport{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;display:flex;align-items:stretch}
.qmr-flow-scroll .qmr-page-viewport{display:block;overflow-y:auto;overflow-x:hidden}
.qmr-page-flow{flex:0 0 auto;height:100%;overflow-wrap:break-word;word-break:break-word}
.qmr-flow-scroll .qmr-page-flow{height:auto;min-height:100%;column-width:auto!important;transform:none!important}
.qmr-paper-body{color:var(--qmr-ink);font-family:var(--qmr-font,Georgia,serif);margin:0}
.qmr-paper-body ::selection{background:var(--qmr-selection)}
.qmr-paper-body p,.qmr-paper-body div,.qmr-paper-body li,.qmr-paper-body dd,.qmr-paper-body dt{margin:0 0 .85em}
.qmr-paper-body h1,.qmr-paper-body h2,.qmr-paper-body h3,.qmr-paper-body h4{margin:1.1em 0 .6em;line-height:1.35;font-weight:600}
.qmr-paper-body h1{font-size:1.5em}.qmr-paper-body h2{font-size:1.3em}.qmr-paper-body h3{font-size:1.15em}
.qmr-paper-body img{max-width:100%;height:auto;border-radius:6px;margin:.6em 0}
.qmr-pdf-sheet{position:relative;container-type:inline-size;max-width:100%;height:auto;margin:0 auto 20px;
  background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.12)}
.qmr-pdf-sheet img{display:block;width:100%;height:100%;max-width:none;object-fit:fill;margin:0;border-radius:0}
.qmr-pdf-text-layer{position:absolute;inset:0;overflow:hidden}
.qmr-pdf-text-layer span{position:absolute;display:block;white-space:pre;color:transparent;line-height:1;user-select:text}
.qmr-pdf-text-layer span::selection{background:var(--qmr-selection);color:transparent}
.qmr-pdf-text-layer mark.qmr-hl,.qmr-pdf-text-layer mark.qm-hit{color:transparent;padding:0;mix-blend-mode:multiply}
.qmr-txt-body{max-width:70ch;margin:0 auto}
.qmr-md-preview h3{font-size:15px;margin:0 0 16px}.qmr-md-preview h4{font-size:13px;margin:18px 0 8px}
.qmr-md-quote{padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.qmr-md-quote blockquote{margin:0 0 6px;line-height:1.65}.qmr-md-quote p{margin:0 0 6px}
.qmr-md-backlink{display:inline-block;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:2px 0;cursor:pointer;text-decoration:none}
.qmr-md-backlink:hover,.qmr-md-backlink:focus-visible{color:var(--dsw-alias-label-primary);text-decoration:underline}
.qmr-paper-body blockquote{margin:1em 0;padding:.1em 0 .1em 1em;border-left:3px solid var(--qmr-border);color:var(--qmr-muted)}
.qmr-paper-body a{color:var(--qmr-accent);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.qmr-paper-body hr{border:0;border-top:1px solid var(--qmr-border);margin:1.4em 0}
.qmr-paper-body pre,.qmr-paper-body code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
.qmr-paper-body pre{background:var(--qmr-hover);padding:10px;border-radius:6px;overflow:auto}
.qmr-paper-body table{border-collapse:collapse;max-width:100%}
.qmr-paper-body th,.qmr-paper-body td{border:1px solid var(--qmr-border);padding:4px 8px}
.qmr-paper-body sup,.qmr-paper-body sub{line-height:0}
.qmr-page-zone{position:absolute;top:0;bottom:0;width:12%;max-width:120px;padding:0;border:0;z-index:2;
  background:transparent;cursor:pointer;color:transparent}
.qmr-page-zone:hover{background:var(--qmr-hover)}
.qmr-page-zone-prev{left:0}
.qmr-page-zone-next{right:0}
.qmr-page-count{position:absolute;right:14px;bottom:6px;z-index:3;font-size:12px;color:var(--qmr-muted);pointer-events:none}
.qmr-chapter-loading{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:3;padding:2px 10px;
  border-radius:999px;font-size:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.qmr-hl{border-radius:2px;padding:0 1px;box-decoration-break:clone;-webkit-box-decoration-break:clone;cursor:pointer}
.qmr-hl-yellow{background:var(--qmr-hl-yellow)}
.qmr-hl-green{background:var(--qmr-hl-green)}
.qmr-hl-blue{background:var(--qmr-hl-blue)}
.qmr-hl-pink{background:var(--qmr-hl-pink)}
.qmr-hl.is-focused{outline:2px solid var(--qmr-accent);outline-offset:1px}
.qm-hit,.qmr-mark{background:var(--qmr-hl-yellow,rgba(255,206,64,.6));color:inherit;border-radius:2px;padding:0 1px}
.qm-hit.is-current,.qmr-mark.is-current{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;
  background:var(--qmr-hl-yellow,rgba(255,206,64,.85))}
.qmr-paper-body .qm-hit{box-decoration-break:clone;-webkit-box-decoration-break:clone}
.qmr-bottombar{display:flex;align-items:center;gap:10px;flex:0 0 auto;padding:6px 14px;font-size:12px;
  color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);
  border-top:1px solid var(--dsw-alias-border-l1)}
.qmr-track{position:relative;display:flex;align-items:center;flex:1 1 auto;height:16px;cursor:pointer;touch-action:none}
.qmr-track-rail{position:absolute;left:0;right:0;height:4px;border-radius:2px;background:var(--dsw-alias-border-l1)}
.qmr-track-fill{position:absolute;left:0;height:4px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.qmr-track-knob{position:absolute;width:12px;height:12px;border-radius:50%;transform:translateX(-50%);
  background:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1)}
.qmr-panel{display:flex;flex-direction:column;flex:0 0 340px;width:340px;min-height:0;
  border-left:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.qmr-panel-overlay{position:absolute;inset:0;z-index:6;width:auto;flex:1 1 auto;border-left:0;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base))}
.qmr-panel-head{display:flex;align-items:center;gap:8px;flex:0 0 auto;padding:8px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.qmr-panel-title{flex:1 1 auto;font-size:14px;font-weight:600;min-width:80px}
.qmr-panel-body{flex:1 1 auto;min-height:0;overflow:auto;padding:10px}
.qmr-panel.qmr-panel-companion{flex:0 0 min(44%,680px);width:min(44%,680px);min-width:380px;padding:0}
.qmr-companion{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.qmr-companion-context{display:flex;flex-direction:column;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px}
.qmr-companion-context span{color:var(--dsw-alias-label-secondary)}
.qmr-companion-prompts{display:flex;gap:6px;padding:7px 12px;overflow:auto;flex:0 0 auto}
.qmr-companion-prompts button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px 6px;white-space:nowrap;cursor:pointer}
.qmr-companion-prompts button:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.qmr-companion-error{padding:8px 12px;color:var(--dsw-alias-state-error-primary);font-size:12px}
.qmr-native-chat{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.qmr-native-chat>[data-conversation-content]{flex:1;min-height:0}
.qmr-native-chat [data-content-phase="hero"] [data-conversation-scroll]{justify-content:flex-end}
.qmr-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden}
.qmr-seg button{height:28px;padding:0 10px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);
  font-size:12px;cursor:pointer}
.qmr-seg button.is-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.qmr-toc-tree{display:flex;flex-direction:column;gap:2px}
.qmr-toc-row{display:flex;align-items:center;gap:4px}
.qmr-toc-toggle{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;
  flex:0 0 auto;padding:0;border:0;border-radius:4px;background:transparent;cursor:pointer;
  color:var(--dsw-alias-label-secondary)}
.qmr-toc-toggle:hover{background:var(--dsw-alias-bg-layer-2)}
.qmr-toc-toggle svg{transition:transform .12s}
.qmr-toc-toggle.is-open svg{transform:rotate(90deg)}
.qmr-toc-item{display:block;flex:1 1 auto;min-width:0;padding:5px 8px;border:0;border-radius:6px;
  background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;text-align:left;cursor:pointer;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qmr-toc-item:hover{background:var(--dsw-alias-bg-layer-2)}
.qmr-toc-item.is-current{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);font-weight:600}
.qmr-toc-children{margin-left:10px;padding-left:6px;border-left:1px solid var(--dsw-alias-border-l1)}
.qmr-group-title{margin:12px 0 6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);
  display:flex;align-items:center;gap:6px}
.qmr-group-title:first-child{margin-top:2px}
.qmr-hl-item{margin-bottom:8px;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;
  background:var(--dsw-alias-bg-base)}
.qmr-hl-top{display:flex;align-items:flex-start;gap:6px}
.qmr-dot{width:10px;height:10px;flex:0 0 auto;border-radius:50%;margin-top:5px;border:1px solid var(--dsw-alias-border-l2)}
.qmr-dot-yellow{background:var(--qmr-hl-yellow,rgba(255,206,64,.9))}
.qmr-dot-green{background:var(--qmr-hl-green,rgba(118,214,108,.9))}
.qmr-dot-blue{background:var(--qmr-hl-blue,rgba(96,165,250,.9))}
.qmr-dot-pink{background:var(--qmr-hl-pink,rgba(248,123,168,.9))}
.qmr-hl-quote{flex:1 1 auto;min-width:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-primary);
  cursor:pointer;word-break:break-word}
.qmr-hl-quote:hover{color:var(--dsw-alias-brand-primary)}
.qmr-hl-note{margin-top:6px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);
  white-space:pre-wrap;word-break:break-word}
.qmr-hl-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}
.qmr-swatches{display:inline-flex;gap:4px;align-items:center}
.qmr-swatch{width:18px;height:18px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);cursor:pointer}
.qmr-swatch.is-active{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}
.qmr-textarea{width:100%;min-height:64px;padding:8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.6;resize:vertical}
.qmr-search-item{display:block;width:100%;margin-bottom:6px;padding:8px 10px;border-radius:8px;text-align:left;
  border:1px solid transparent;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);cursor:pointer}
.qmr-search-item:hover{border-color:var(--dsw-alias-border-l2)}
.qmr-search-item.is-current{border-color:var(--dsw-alias-brand-primary)}
.qmr-search-chapter{font-size:11px;color:var(--dsw-alias-label-secondary)}
.qmr-search-snippet{margin-top:3px;font-size:13px;line-height:1.6;word-break:break-word}
.qmr-field{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.qmr-field-label{flex:0 0 62px;font-size:13px}
.qmr-field-ctl{flex:1 1 auto;display:flex;align-items:center;gap:8px;min-width:0}
.qmr-field-value{flex:0 0 auto;min-width:40px;text-align:right;font-size:12px;color:var(--dsw-alias-label-secondary)}
.qmr-range{flex:1 1 auto;min-width:70px;accent-color:var(--dsw-alias-brand-primary)}
.qmr-theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.qmr-theme-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border-radius:10px;
  border:1px solid var(--dsw-alias-border-l1);background:transparent;cursor:pointer;font-size:12px;
  color:var(--dsw-alias-label-primary)}
.qmr-theme-card.is-active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary)}
.qmr-theme-swatch{width:100%;height:34px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
.qmr-switch{display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;user-select:none}
.qmr-switch input{accent-color:var(--dsw-alias-brand-primary);width:16px;height:16px;cursor:pointer}
.qmr-md{white-space:pre-wrap;word-break:break-word;padding:10px;border-radius:8px;font-size:13px;line-height:1.75;
  background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qmr-selmenu{position:fixed;z-index:40;display:flex;align-items:center;gap:4px;padding:5px 6px;border-radius:10px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));border:1px solid var(--dsw-alias-border-l2);
  box-shadow:0 10px 28px rgba(0,0,0,.3)}
.qmr-selmenu-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;
  border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.qmr-selmenu-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.qmr-selmenu-sep{width:1px;height:18px;margin:0 2px;background:var(--dsw-alias-border-l1)}
.qmr-toast{position:absolute;left:50%;bottom:22px;z-index:60;transform:translateX(-50%);max-width:80%;
  padding:8px 14px;border-radius:8px;font-size:13px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));
  border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 20px rgba(0,0,0,.24)}
.qmr-toast.is-error{border-color:var(--dsw-alias-state-error-primary)}
.qmr-toast.is-ok{border-color:var(--dsw-alias-state-success-primary)}
.qmr-toast.is-warn{border-color:var(--dsw-alias-state-warn-primary)}
.qmr-errorbox{margin:24px auto;max-width:560px;padding:16px;border-radius:10px;
  border:1px solid var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1)}
.qmr-errorbox-title{font-weight:600;margin-bottom:6px}
.qmr-errorbox-text{font-size:13px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;margin-bottom:12px}
.qmr-busy{padding:40px;text-align:center;color:var(--dsw-alias-label-secondary)}
.qmr-bottom-text{white-space:nowrap}
.qmr-errorbar{position:absolute;left:50%;top:58px;z-index:55;transform:translateX(-50%);display:flex;
  align-items:center;gap:8px;max-width:80%;padding:6px 8px 6px 12px;border-radius:8px;font-size:13px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));
  border:1px solid var(--dsw-alias-state-error-primary);box-shadow:0 6px 20px rgba(0,0,0,.24)}
.qmr-divider{height:1px;margin:10px 0;background:var(--dsw-alias-border-l1)}
.qmr-kbd{display:inline-block;padding:1px 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);
  font-size:11px;color:var(--dsw-alias-label-secondary)}
@media (max-width:820px){
  .qmr-panel.qmr-panel-companion.qmr-panel-overlay{width:100%;min-width:0;flex:1 1 auto}
  .qmr-toolbar-label{display:none}
  .qmr-btn{padding:0 8px}
  .qmr-bottom-text{display:none}
  .qmr-errorbar{top:52px;max-width:92%}
}
@media (max-width:760px){
  .qmr-panel{flex:0 0 300px;width:300px}
  .qmr-topbar{min-height:48px;padding:6px 8px}
  .qmr-resume{align-items:flex-start;flex-direction:column}
}
`;

/**
 * 注入组件级样式表；随组件卸载自动移除（React 会移除该 <style> 节点）。
 * @returns {React.ReactElement}
 */
export function StyleSheet() {
  return h('style', { 'data-qmr-style': '1' }, UI_CSS);
}
