// Adapted from original Reader's Google lookup path. Only the explicitly
// selected text goes to this fixed endpoint; no book, context or account data.
import { isLookupTerm, cleanLookupTerm, parseGoogleLookup, googleDetectedLanguage,
  sameLanguage, fallbackTarget } from '../core/lookup.js';

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TARGETS = new Set(['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'ru', 'de', 'fr', 'es', 'pt']);
export const MAX_TRANSLATION_LENGTH = 12000;
const RESPONSE_LIMIT = 512 * 1024;

function failure(code, message) { return Object.assign(new Error(message), { code }); }
export function normalizeTranslationTarget(value = 'zh-CN') {
  const raw = String(value).replace('_', '-').toLowerCase();
  const alias = { zh: 'zh-CN', 'zh-cn': 'zh-CN', 'zh-hans': 'zh-CN', 'zh-tw': 'zh-TW', 'zh-hk': 'zh-TW', 'zh-hant': 'zh-TW', 'pt-br': 'pt' };
  const target = alias[raw] || raw;
  if (!TARGETS.has(target)) throw failure('target', '请选择支持的翻译目标语言');
  return target;
}

// Bound URL size without cutting Unicode surrogate pairs or losing whitespace.
export function translationChunks(text, limit = 1000) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Invalid chunk limit');
  const points = Array.from(text), chunks = [];
  for (let i = 0; i < points.length;) {
    let width = Math.min(limit, points.length - i);
    if (i + width < points.length) {
      const sample = points.slice(i, i + width);
      let boundary = sample.findLastIndex(char => /[.!?。！？\n]/.test(char));
      if (boundary < width * 0.4) boundary = sample.findLastIndex(char => /\s/.test(char));
      if (boundary > 0) width = boundary + 1;
    }
    chunks.push(points.slice(i, i + width).join('')); i += width;
  }
  return chunks;
}

async function payloadFor(text, target, dictionary, request, signal) {
  signal.throwIfAborted();
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: text }).toString();
  if (dictionary) url.searchParams.append('dt', 'bd');
  const response = await request(url.href, { method: 'GET', redirect: 'error', signal });
  if (!response.ok || Number(response.headers.get('content-length')) > RESPONSE_LIMIT) {
    await response.body?.cancel().catch(() => {});
    if ([429, 503].includes(response.status)) throw failure('limit', '翻译服务繁忙，请稍后重试');
    if (!response.ok) throw failure('http', `翻译请求失败（HTTP ${response.status}），请重试`);
    throw failure('size', '翻译结果超过大小限制，请缩短选文后重试');
  }
  if (!response.body) throw failure('empty', '翻译服务没有返回结果，请重试');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    signal.throwIfAborted();
    size += chunk.byteLength;
    if (size > RESPONSE_LIMIT) throw failure('size', '翻译结果超过大小限制，请缩短选文后重试');
    chunks.push(chunk);
  }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw failure('response', '翻译服务返回了无法识别的结果，请重试'); }
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) throw failure('response', '翻译服务返回了无法识别的结果，请重试');
  const card = parseGoogleLookup(payload);
  if (!card) throw failure('empty', '没有查到翻译结果，请调整选文后重试');
  return { card, detectedLanguage: googleDetectedLanguage(payload) };
}

/** Host operation; network is injectable for protocol tests, never from Client. */
export async function translateSelection(input, request = globalThis.fetch, options = {}) {
  if (!input || typeof input.text !== 'string' || !input.text.trim()) throw failure('text', '请先选中要翻译的文字');
  const text = input.text.trim();
  if (text.length > MAX_TRANSLATION_LENGTH) throw failure('length', '选文过长，请分段翻译（最多 12000 字符）');
  const requestedTarget = normalizeTranslationTarget(input.target);
  const kind = isLookupTerm(text) ? 'word' : 'passage';
  const chunks = translationChunks(kind === 'word' ? cleanLookupTerm(text) : text);
  const timeout = AbortSignal.timeout(25000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let target = requestedTarget;
  try {
    let first = await payloadFor(chunks[0], target, kind === 'word', request, signal);
    const detectedLanguage = first.detectedLanguage;
    if (sameLanguage(detectedLanguage, target)) {
      target = fallbackTarget(target);
      first = await payloadFor(chunks[0], target, kind === 'word', request, signal);
    }
    let meaning = first.card.meaning;
    for (const [index, chunk] of chunks.slice(1).entries()) {
      const next = await payloadFor(chunk, target, false, request, signal);
      const gap = /\n\s*$/.test(chunks[index]) ? '\n' : !/^(zh|ja)/.test(target) ? ' ' : '';
      meaning += gap + next.card.meaning;
    }
    return { engine: 'google', kind, requestedTarget, target, detectedLanguage,
      card: { ...first.card, lemma: kind === 'word' ? cleanLookupTerm(text) : '', meaning },
      text: meaning };
  } catch (error) {
    if (signal.aborted) throw failure(timeout.aborted ? 'timeout' : 'cancelled', timeout.aborted ? '翻译超时，请重试' : '已取消翻译');
    if (error?.code && ['limit', 'http', 'size', 'empty', 'response'].includes(error.code)) throw error;
    // Fetch errors may contain a URL with the selected text. Never expose it.
    throw failure('network', '无法连接翻译服务，请检查网络后重试');
  }
}
