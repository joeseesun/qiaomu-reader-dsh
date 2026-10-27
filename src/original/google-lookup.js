import {parseGoogleLookup,googleDetectedLanguage,sameLanguage,fallbackTarget} from './lookup.js';
export function createGoogleLookup(requestUrl){
const TRANSLATE_CHUNK_LIMIT = 1600;

// Splits oversized input on sentence ends, falling back to spaces, then to a
// hard cut. Each produced piece is at most `limit` characters long.
function splitTranslateChunks(text, limit) {
  const pieces = [];
  let rest = text;
  while (rest.length > limit) {
    const sentence = rest.lastIndexOf(". ", limit);
    const anchor = sentence >= limit * 0.4 ? sentence : rest.lastIndexOf(" ", limit);
    const width = anchor > 0 ? anchor + 1 : limit;
    pieces.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  if (rest) pieces.push(rest);
  return pieces;
}

function translateRequestUrl(chunk, target) {
  return "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto"
    + `&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(chunk)}`;
}

function translateHttpError(message, reason, status) {
  const err = new Error(message);
  err.qiaomuReaderReason = reason;
  if (status !== undefined) err.qiaomuReaderStatus = status;
  return err;
}

async function requestGooglePayload(chunk, target, dictionary = false) {
  const url = translateRequestUrl(chunk, target) + (dictionary ? "&dt=bd" : "");
  const res = await requestUrl({ url, method: "GET", throw: false });
  if ([429, 503].includes(res.status)) throw translateHttpError("translate rate-limited", "limit");
  if (res.status < 200 || 300 <= res.status) {
    throw translateHttpError(`translate http ${res.status}`, "http", res.status);
  }
  const payload = res.json;
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) throw new Error("unexpected translate response");
  return payload;
}
function googleSegmentText(payload) {
  return payload[0].map((part) => (part && part[0]) || "").join("");
}
async function requestTranslatedSegment(chunk, target) {
  return googleSegmentText(await requestGooglePayload(chunk, target));
}
// Source language is always detected. Text already in the target language is
// sent again to the fallback language instead of coming back unchanged.
async function googleTranslateDetailed(text, target) {
  const q = String(text || "").replace(/\s+/g, " ").trim();
  if (!q) return { text: "", target };
  const chunks = splitTranslateChunks(q, TRANSLATE_CHUNK_LIMIT);
  let used = target;
  let first = await requestGooglePayload(chunks[0], used);
  if (sameLanguage(googleDetectedLanguage(first), target)) {
    used = fallbackTarget(target);
    first = await requestGooglePayload(chunks[0], used);
  }
  let translated = googleSegmentText(first);
  for (const chunk of chunks.slice(1)) translated += await requestTranslatedSegment(chunk, used);
  return { text: translated.trim(), target: used };
}
async function googleLookupTerm(term, target) {
  let used = target;
  let payload = await requestGooglePayload(term, used, true);
  if (sameLanguage(googleDetectedLanguage(payload), target)) {
    used = fallbackTarget(target);
    payload = await requestGooglePayload(term, used, true);
  }
  const card = parseGoogleLookup(payload);
  if (!card) throw translateHttpError("empty lookup", "empty");
  return { card, target: used };
}

return {translate:googleTranslateDetailed,word:googleLookupTerm};
}
