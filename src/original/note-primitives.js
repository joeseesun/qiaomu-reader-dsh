// Extracted from original 4.9.2 note-title, template and quote helpers.
export function originalNotePrimitives(t,day){const qiaomuReaderTranslate=t,window={moment:()=>({format:()=>day()})};
const RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
function sanitizeNoteTitle(raw, max = 100) {
  // eslint-disable-next-line no-control-regex -- removing control characters is exactly what this replace is for
  let t = (raw || "").replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/[\x00-\x1F\x7F]/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
  if (t.length > max) t = t.slice(0, max).replace(/[.\s]+$/, "");
  if (!t) t = qiaomuReaderTranslate("note");
  if (RESERVED_NAMES.test(t)) t = `_${t}`;
  return t;
}
function suggestNoteTitle(text, max = 60) {
  const flat = (text || "").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const tail = /[.,;:!?…\s]+$/;
  if (flat.length <= max) return flat.replace(tail, "");
  const sentence = flat.match(/^(.{10,}?[.!?…])(\s|$)/);
  if (sentence && sentence[1].length <= max && /[\p{L}]{3}[.!?…]+$/u.test(sentence[1])) {
    return sentence[1].replace(tail, "");
  }
  let cut = flat.slice(0, max + 1);
  const gap = cut.lastIndexOf(" ");
  if (gap > max * 0.5) cut = cut.slice(0, gap);
  cut = cut.replace(/\s+[a-zа-яё]{1,2}$/i, "");
  return cut.replace(/[.,;:!?…\-—\s]+$/, "");
}function processTemplateManually(tplText, title) {
  let today;
  try {
    today = window.moment ? window.moment().format("YYYY-MM-DD") : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  } catch {
    today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  return tplText.replace(/<%[-_]?\s*tp\.file\.title\s*[-_]?%>/g, title).replace(/<%[-_]?\s*tp\.date\.now\([^)]*\)\s*[-_]?%>/g, today).replace(/<%[-_]?\s*tp\.file\.cursor\([^)]*\)\s*[-_]?%>/g, "").replace(/<%[\s\S]*?%>/g, "");
}
const QUOTE_TEMPLATE_DEFAULT = "> {text}\n\n— [[{book}]]{page}{link}";
// Keep the backlink useful without inserting interface prose into the reader's
// notes. The arrow is the complete visible label; old custom text settings are
// intentionally ignored so copied quotations stay clean.
function backlinkLabel() { return "↩"; }
function quoteMarkdown(plugin, hl, bookFile) {
  const clean = String(hl && hl.text || "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
  if (!clean) return "";
  const bookName = bookFile ? bookNoteLinkFor(plugin, bookFile) || bookFile.basename : "";
  const page = hl && hl.page ? qiaomuReaderTranslate("p-0-2", hl.page) : "";
  let link = "";
  const uri = highlightBacklink(plugin.app.vault.getName(), bookFile?.path, hl);
  if (plugin.settings.quoteBacklinks !== false && uri) {
    link = ` [${backlinkLabel()}](${uri})`;
  }
  const commentText = hl && hl.comment ? String(hl.comment).trim() : "";
  const comment = commentText ? `\n\n**${qiaomuReaderTranslate("comment-on-a-highlight")}：** ${commentText.replace(/\n/g, "\n\n")}` : "";
  const tpl = plugin.settings.quoteTemplate || QUOTE_TEMPLATE_DEFAULT;
  return tpl.split("{text}").join(clean + comment).split("{book}").join(bookName).split("{page}").join(page).split("{link}").join(link).split("{comment}").join(commentText).trim();
}

let backlink='';const highlightBacklink=()=>backlink,bookNoteLinkFor=(plugin,file)=>String(plugin.settings.bookNoteLinks?.[file.path]||'').replace(/\.md$/,'');
return{sanitizeNoteTitle,suggestNoteTitle,processTemplateManually,formatQuote(settings,book,hl,link){backlink=link;return quoteMarkdown({settings,app:{vault:{getName:()=>''}}},hl,{basename:book.title||book.id,path:book.id});}};
}
