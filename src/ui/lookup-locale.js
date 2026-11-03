export const LOOKUP_TARGETS = Object.freeze([
  ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['en', 'English'], ['ja', '日本語'],
  ['ko', '한국어'], ['ru', 'Русский'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'],
]);
const messages = {
  target: ['译为', 'Translate to'], engine: ['翻译方式', 'Translation'], google: ['Google 免费翻译', 'Google Translate (free)'], ai: ['AI 上下文翻译', 'AI with context'],
  loading: ['正在翻译…', 'Translating…'], retry: ['重新翻译', 'Translate again'], generate: ['生成解释', 'Explain with AI'],
  fallback: ['AI 尚未就绪，已改用 Google 翻译。', 'AI is unavailable. Using Google Translate.'],
  privacy: ['Google 仅接收这次选文，无需配置模型。', 'Only this selection is sent to Google. No model setup needed.'],
  preferences: ['翻译偏好', 'Translation preferences'], defaultTarget: ['默认目标语言', 'Default target language'],
  temporary: ['上方语言仅用于本次阅读。', 'The language above applies only to this reading session.'],
  settingsFailed: ['偏好保存失败，请重试。', 'Could not save preferences. Retry.'],
  hostUnavailable: ['书库连接尚未就绪，请重试。', 'The library connection is not ready. Retry.'],
  switched: ['原文已是目标语言，本次译为', 'The text is already in the target language. Translating to'],
  saved: ['已加入生词本', 'Saved to vocabulary'], saving: ['正在保存…', 'Saving…'],
};
export function lookupText(ui, key) {
  const language = ui.t('prompts.language', 'zh');
  return messages[key]?.[language === 'en' ? 1 : 0] || key;
}

const KEY = 'qmr.lookup.preferences';
const sessionTargets = new Map();
export function readLookupPreferences(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || '{}');
    return { engine: data?.engine === 'ai' ? 'ai' : 'google', target: LOOKUP_TARGETS.some(([id]) => id === data?.target) ? data.target : 'zh-CN' };
  } catch { return { engine: 'google', target: 'zh-CN' }; }
}
export function saveLookupPreferences(value, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Storage unavailable');
  storage.setItem(KEY, JSON.stringify({ engine: value.engine === 'ai' ? 'ai' : 'google', target: LOOKUP_TARGETS.some(([id]) => id === value.target) ? value.target : 'zh-CN' }));
}
export function sessionLookupTarget(bookId, fallback) { return sessionTargets.get(bookId) || fallback; }
export function setSessionLookupTarget(bookId, target) {
  if (sessionTargets.size >= 50 && !sessionTargets.has(bookId)) sessionTargets.delete(sessionTargets.keys().next().value);
  sessionTargets.set(bookId, target);
}
