import { stableId } from './state.js';
import { highlightLink } from './backlink.js';

export function vocabularyEntry(bookId, input) {
  const term = String(input.term || '').trim().slice(0, 6000);
  if (!term) throw new Error('没有选中文字');
  const context = String(input.context || term).trim().slice(0, 12000);
  return { lemma:String(input.lemma||'').slice(0,80),phonetic:String(input.phonetic||'').slice(0,160),senses:(Array.isArray(input.senses)?input.senses:[]).slice(0,8).map(s=>({pos:String(s.pos||'').slice(0,80),def:String(s.def||'').slice(0,1000)})),id: stableId('vocab', bookId, term.toLocaleLowerCase(), context), term, context,
    meaning: String(input.meaning || '').trim().slice(0, 16000), chapterHref: String(input.chapterHref || ''),
    highlightId: String(input.highlightId || ''), createdAt: input.createdAt || Date.now() };
}
export function upsertVocabulary(entries, entry) {
  const previous = (entries || []).find(v => v.id === entry.id);
  return [...(entries || []).filter(v => v.id !== entry.id), { ...previous, ...entry, createdAt: previous?.createdAt || entry.createdAt }];
}
export function vocabularyMarkdown(bookId, entries) {
  if (!entries?.length) return '';
  const safe = value => String(value || '').replace(/[\\`*_{}[\]<>#]/g, '\\$&');
  return ['## 生词本 / Vocabulary', '', ...entries.flatMap(entry => [
    `### ${safe(entry.term)}`, '', `> ${safe(entry.context).replace(/\n/g, '\n> ')}`, '',
    safe(entry.meaning), '', `[↩ 回到原文](${highlightLink(bookId, entry.highlightId)})`, '',
  ])].join('\n');
}

/** Read only the latest bounded chat projection, never hidden reasoning blocks. */
export function latestLookupAnswer(snapshot) {
  const chat = snapshot?.views?.get?.('chat');
  const keys = chat?.order;
  if (!keys || !chat?.nodes?.get) return '';
  for (let i = keys.length - 1; i >= Math.max(0, keys.length - 30); i--) {
    const node = chat.nodes.get(keys[i]);
    if (node?.kind !== 'assistant-step' || !node.data?.finalNode) continue;
    const text = (node.data.blocks || []).filter(b => b.kind === 'text').map(b => b.text).join('\n').trim();
    if (text) return text;
  }
  return '';
}
