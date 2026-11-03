// Adapted from Qiaomu Reader 4.9.4 (GPL-3.0-only); no Obsidian dependencies.
// Browsing shelf: books mentioned in Hacker News comments, served as static JSON
// by the Qiaomu-run mirror of hackerbooks.org. Only rankings and short metadata
// are fetched; the plugin never downloads a book from this source.
export const SHELF_ORIGIN = "https://hackerbooks.qiaomu.ai";
export const SHELF_VIEWS = ["foryou", "mine", "best", "top", "lindy"];
const SHELF_ID = /^OL\d+W$/;
const LINDY_AGE = 30;

export function shelfDataUrl(name) {
  if (!["books", "books-top", "topics", "paths", "co-index"].includes(name)) throw new Error("Unknown shelf data");
  return `${SHELF_ORIGIN}/data/${name}.json`;
}

export function shelfBookUrl(id) {
  if (!SHELF_ID.test(String(id))) throw new Error("Invalid shelf book ID");
  return `${SHELF_ORIGIN}/data/book/${id}.json`;
}

export function shelfPageUrl(id) {
  if (!SHELF_ID.test(String(id))) throw new Error("Invalid shelf book ID");
  return `${SHELF_ORIGIN}/b/${id}`;
}

export function shelfCoverUrl(cover) {
  return Number.isSafeInteger(cover) && cover > 0 ? `${SHELF_ORIGIN}/covers/${cover}.webp` : "";
}

const count = (value) => Number.isFinite(value) && value > 0 ? value : 0;

/** Keeps only well-formed rows so a broken or hostile response cannot break rendering. */
export function normalizeShelfBooks(data) {
  if (!Array.isArray(data)) throw new Error("Invalid shelf response");
  return data.filter((book) => book && SHELF_ID.test(book.id) && typeof book.t === "string" && book.t.trim()).map((book) => ({
    ...book,
    t: book.t.slice(0, 500),
    ...Object.fromEntries(['tz', 'st', 'sz', 'w'].map(key => [key, typeof book[key] === 'string' ? book[key].slice(0, 4000) : ''])),
    k: Array.isArray(book.k) ? book.k.filter(value => typeof value === 'string') : [],
    q: Number.isFinite(book.q) ? book.q : null,
    s: count(book.s),
    y: Number.isFinite(book.y) ? book.y : null,
    a: Array.isArray(book.a) ? book.a.filter((name) => typeof name === "string") : [],
    tp: Array.isArray(book.tp) ? book.tp.filter((slug) => typeof slug === "string") : [],
    u: count(book.u), ru: count(book.ru), cu: count(book.cu), lr: count(book.lr)
  }));
}

export function normalizeShelfTopics(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((topic) => topic && typeof topic.slug === "string" && typeof topic.name === "string" && topic.slug !== "other")
    .map((topic) => ({ slug: topic.slug, zh: topic.name, en: typeof topic.en === "string" ? topic.en : topic.name, n: count(topic.n) }));
}

/** Orders the shelf the way the web version ranks each list. */
export function shelfOrder(books, view, { topic = "", lastYear = new Date().getFullYear() } = {}) {
  let pool = topic ? books.filter((book) => book.tp.includes(topic)) : books.slice();
  if (view === "top") return pool.sort((a, b) => (b.s ?? 0) - (a.s ?? 0) || b.u - a.u);
  if (view === "lindy") {
    const cut = lastYear - LINDY_AGE;
    return pool.filter((book) => Number.isFinite(book.y) && book.y <= cut && book.lr >= 1 && book.ru >= 8 && book.q != null).sort((a, b) => b.q - a.q);
  }
  return pool.filter((book) => book.q != null).sort((a, b) => b.q - a.q || b.ru - a.ru);
}

const fold = (value) => String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Title/author search; exact and prefix title hits rank above popularity. */
export function searchShelf(books, query, limit = 40) {
  const needle = fold(query);
  if (!needle) return [];
  const terms = needle.split(" ");
  const hits = [];
  for (const book of books) {
    const titles = [fold(book.t), fold(book.tz), fold(book.st), ...(book.k || []).map(fold)];
    const authors = book.a.map(fold);
    const haystack = [...titles, ...authors].join(" ");
    // CJK titles carry punctuation users rarely type: also match with spaces removed.
    if (!terms.every((term) => haystack.includes(term)) && !haystack.replace(/ /g, "").includes(needle.replace(/ /g, ""))) continue;
    const rank = titles.some((title) => title === needle) ? 3 : titles.some((title) => title.startsWith(needle)) ? 2 : authors.some((name) => name.includes(needle)) ? 1.5 : 1;
    hits.push({ book, score: rank * 1000 + Math.log1p(book.u) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map((hit) => hit.book);
}

/** Display text: Chinese interface uses the curated Chinese title and blurb. */
export function shelfText(book, chinese) {
  return {
    title: (chinese && book.tz) || book.t,
    original: chinese && book.tz && book.tz !== book.t ? book.t : "",
    subtitle: (chinese && book.sz) || book.st || "",
    blurb: chinese && typeof book.w === "string" ? book.w : ""
  };
}

/** The original title plus the first author finds the most editions in catalogs. */
export function shelfSearchQuery(book) {
  return [book.t, book.a[0]].filter(Boolean).join(" ");
}

export function chineseStoreLinks(book) {
  const query = encodeURIComponent(book.tz || book.t);
  return [
    ["豆瓣读书", `https://www.douban.com/search?cat=1001&q=${query}`],
    ["微信读书", `https://weread.qq.com/web/search/global?keyword=${query}`]
  ];
}

/** Detail JSON: keeps the reading-judgement parts and drops malformed entries. */
export function normalizeShelfDetail(data, id) {
  if (!data || data.id !== id) throw new Error("Invalid shelf detail");
  const stance = data.stance && typeof data.stance === "object" ? { r: count(data.stance.r), n: count(data.stance.n), c: count(data.stance.c) } : null;
  const why = data.why && typeof data.why === "object" ? {
    points: Array.isArray(data.why.why) ? data.why.why.filter((item) => typeof item === "string" && item).slice(0, 4) : [],
    fit: typeof data.why.fit === "string" ? data.why.fit : "",
    warn: typeof data.why.warn === "string" ? data.why.warn : ""
  } : null;
  const comments = (Array.isArray(data.comments) ? data.comments : [])
    .filter((item) => item && Number.isSafeInteger(item.id) && typeof item.x === "string" && item.x.trim())
    .map((item) => ({ id: item.id, by: typeof item.by === "string" ? item.by : "", ts: item.ts, x: item.x, zh: typeof item.zh === "string" ? item.zh : "", stance: ["r", "n", "c"].includes(item.sv) ? item.sv : "" }));
  return {
    description: { zh: typeof data.dz === "string" ? data.dz : "", en: typeof data.desc === "string" ? data.desc : "" },
    stance, why, comments,
    related: (Array.isArray(data.related) ? data.related : []).filter((related) => SHELF_ID.test(related) && related !== id).slice(0, 8)
  };
}

/** Recommendation comments first, then one critical voice so a judgement has both sides. */
export function pickShelfComments(comments, limit = 3) {
  const recommend = comments.filter((item) => item.stance === "r");
  const critical = comments.filter((item) => item.stance === "c");
  const chosen = [...recommend.slice(0, critical.length ? limit - 1 : limit), ...critical.slice(0, 1)];
  for (const item of comments) if (chosen.length < limit && !chosen.includes(item)) chosen.push(item);
  return chosen.slice(0, limit);
}

export function hackerNewsItemUrl(id) {
  return `https://news.ycombinator.com/item?id=${Number(id)}`;
}

// File names carry extras such as "- Author", "(z-lib.org)" or "[EPUB]".
const cleanBookName = (name) => fold(String(name || "").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[([{【（][^)\]}】）]*[)\]}】）]/g, " ").split(/\s[-–—_]{1,2}\s|_{2,}/)[0]);

/** Shelf IDs of the user's own books, matched by title only when unambiguous. */
export function matchLibraryBooks(books, names) {
  const byTitle = new Map();
  for (const book of books) {
    for (const title of [fold(book.t), fold(book.tz), fold([book.t, book.st].filter(Boolean).join(" "))]) {
      if (title.length >= 2 && (!byTitle.has(title) || byTitle.get(title).u < book.u)) byTitle.set(title, book);
    }
  }
  const ids = new Set();
  for (const name of names) {
    const clean = cleanBookName(name);
    const book = byTitle.get(clean) || byTitle.get(clean.replace(/ /g, ""));
    if (book) ids.add(book.id);
  }
  return ids;
}

/** Books mentioned in the same discussions as the seeds, topic affinity as a tie-breaker. */
export function recommendShelf(books, coIndex, seeds, limit = 60) {
  const byId = new Map(books.map((book) => [book.id, book]));
  const affinity = new Map();
  for (const id of seeds) for (const topic of byId.get(id)?.tp || []) affinity.set(topic, (affinity.get(topic) || 0) + 1);
  const top = Math.max(1, ...affinity.values());
  const scores = new Map();
  for (const id of seeds) {
    const neighbours = Array.isArray(coIndex?.[id]) ? coIndex[id] : [];
    for (const next of neighbours) if (!seeds.has(next) && byId.has(next)) scores.set(next, (scores.get(next) || 0) + 4);
  }
  for (const [id, score] of scores) {
    const book = byId.get(id);
    scores.set(id, score + book.tp.reduce((sum, topic) => sum + (affinity.get(topic) || 0), 0) / top + (book.q ?? 0) / 100);
  }
  return [...scores].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => byId.get(id));
}

// Reading lists: { [shelfId]: { s: "wish" | "read", at: epochMs } }, stored in plugin settings.
export const SHELF_MARKS = ["wish", "read"];
const MAX_SHELF_MARKS = 5000;

export function normalizeShelfMarks(value) {
  const marks = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return marks;
  const rows = Object.entries(value).filter(([id, mark]) => SHELF_ID.test(id) && SHELF_MARKS.includes(mark?.s))
    .map(([id, mark]) => [id, { s: mark.s, at: Number.isFinite(mark.at) ? mark.at : 0 }])
    .sort((a, b) => b[1].at - a[1].at).slice(0, MAX_SHELF_MARKS);
  for (const [id, mark] of rows) marks[id] = mark;
  return marks;
}

/** Choosing the current status again clears it, like a toggle button. */
export function toggleShelfMark(marks, id, status, now = Date.now()) {
  if (!SHELF_ID.test(String(id)) || !SHELF_MARKS.includes(status)) return marks;
  const next = { ...marks };
  if (next[id]?.s === status) delete next[id];
  else next[id] = { s: status, at: now };
  return next;
}

/** Books on one list, most recently marked first; unknown IDs are skipped. */
export function markedShelf(byId, marks, status) {
  return Object.entries(marks).filter(([, mark]) => mark.s === status).sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => byId.get(id)).filter(Boolean);
}

/** Original Reader's external catalogue links; only navigation, never automatic requests. */
export function externalBookSearchUrls(query) {
  const value = String(query || '').trim();
  return { anna: `https://annas-archive.gl/search?q=${encodeURIComponent(value)}`, zlibrary: `https://z-library.sk/s/${encodeURIComponent(value)}` };
}
