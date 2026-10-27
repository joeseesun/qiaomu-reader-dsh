/**
 * AI 伴读独立外观（对照原版 qiaomu-reader 4.5.10 ai-appearance.js）。
 *
 * 原版给 AI 伴读独立了主题 / 字体 / 字号 / 行高；DSH 的伴读是原生会话，
 * 能接上的是包裹层：主题整套变量 + 会话容器字体。null 表示跟随正文
 * （书籍设置），自定义值存全局（localStorage），跨书共用——与原版一致。
 */

/** 伴读外观默认值（自定义模式的兜底，字号比正文小一档） */
export const COMPANION_APPEARANCE_DEFAULTS = Object.freeze({
  theme: 'paper',
  fontFamily: 'serif',
  fontSize: 15,
  lineHeight: 1.7,
});

const STORAGE_KEY = 'qmr.companionAppearance';

/**
 * 归一化一份伴读外观；字段不全时用默认值补齐。
 * @param {object|null} value
 * @returns {object|null} null 原样返回（跟随正文）
 */
export function normalizeCompanionAppearance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const merged = { ...COMPANION_APPEARANCE_DEFAULTS };
  if (typeof value.theme === 'string') merged.theme = value.theme;
  if (typeof value.fontFamily === 'string') merged.fontFamily = value.fontFamily;
  const size = Math.round(Number(value.fontSize));
  if (Number.isFinite(size)) merged.fontSize = Math.min(32, Math.max(12, size));
  const lineHeight = Number(value.lineHeight);
  if (Number.isFinite(lineHeight)) merged.lineHeight = Math.min(2.2, Math.max(1.4, lineHeight));
  return merged;
}

/**
 * 读取已保存的伴读外观（localStorage 不可用时返回 null = 跟随正文）。
 * @returns {object|null}
 */
export function readCompanionAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeCompanionAppearance(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

/**
 * 保存伴读外观；传 null 清除（回到跟随正文）。
 * @param {object|null} value
 * @returns {object|null} 归一化后的值
 */
export function saveCompanionAppearance(value) {
  const normalized = normalizeCompanionAppearance(value);
  try {
    if (normalized) localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    /* 持久化失败不影响本次会话 */
  }
  return normalized;
}
