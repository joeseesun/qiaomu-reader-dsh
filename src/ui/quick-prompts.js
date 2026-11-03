const KEY = 'qmr.quick-prompts.v1';

export const DEFAULT_PROMPTS = [
  { id: 'summary', title: '概括要点', body: '请概括当前章节的要点，并区分原文与推断。' },
  { id: 'explain', title: '解释选段', body: '请结合上下文，用通俗中文解释我选中的这段内容。' },
  { id: 'evidence', title: '追问证据', body: '当前章节的主要论断有哪些证据和可能的反例？' },
];

export const ENGLISH_PROMPTS = [
  { id: 'summary', title: 'Summarize', body: 'Summarize the current chapter and distinguish the original claims from inferences.' },
  { id: 'explain', title: 'Explain selection', body: 'Explain my selected passage in plain English, using its context.' },
  { id: 'evidence', title: 'Question evidence', body: 'What evidence and possible counterexamples support the main claims in this chapter?' },
];
export function defaultQuickPrompts(language = 'zh') {
  return (String(language).startsWith('zh') ? DEFAULT_PROMPTS : ENGLISH_PROMPTS).map(item => ({ ...item }));
}
export function readQuickPrompts(language = 'zh') {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string').slice(0, 20);
  } catch { /* 损坏的个人设置不阻止阅读。 */ }
  return defaultQuickPrompts(language);
}

export function saveQuickPrompts(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('qmr-prompts-changed'));
}

export function resetQuickPrompts() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('qmr-prompts-changed'));
}
