import {enhance,Menu,Notice,setIcon} from '../client/native-ui.js';
import {isLookupTerm,cleanLookupTerm,createLookupCache,lookupCacheKey} from './lookup.js';
export function mountOriginalLookup(parent,options){
 const qiaomuReaderTranslate=options.t;
 const plugin={settings:options.settings||{},_lookupCache:options.cache};
 const view={plugin},lookupAiReady=()=>options.aiReady(),aiConfig=()=>({transport:'harness',provider:{label:'DeepSeek Harness'}});
 const aiLookupTerm=(_,request)=>options.ai({...request,word:true}),aiTranslateText=(_,request)=>options.ai({...request,word:false});
 const googleLookupTerm=(text,target)=>options.google(text,target,true,state.controller.signal),googleTranslateDetailed=(text,target)=>options.google(text,target,false,state.controller.signal);
 const placeLookupCard=()=>options.onLayout?.(),docOf=el=>el.ownerDocument,copyToClipboard=options.copy;
 const aiConnectionErrorMessage=error=>error.message;
 const currentTranslationNote=()=>null,dailyNoteProvider=()=>true;
 const vocabularyEntry=(_,card)=>({...card,term:state.term,context:state.context});
 const vocabularyHasWord=(_,term,lemma)=>options.hasWord(term,lemma);
 const addWordToVocabulary=(_,entry)=>options.saveWord(entry);
 const openNoteBesideBook=()=>options.openVocabulary();
 const vocabularyErrorMessage=error=>error.message;
 const pushWordToAnki=()=>options.anki?.();
 const ankiErrorMessage=error=>error.message;
 const saveTranslationNote=(_,destination,markdown)=>options.saveNote(destination,markdown);
 const state={view,plugin,app:{},bookFile:options.bookFile,text:options.text,term:cleanLookupTerm(options.text),context:options.context,word:isLookupTerm(options.text),book:options.bookFile.basename,target:options.target||'zh-CN',engine:options.engine==='ai'&&options.aiReady()?'ai':'google',noteTarget:null,savedTargets:new Map(),controller:null};
 const card=enhance(parent).createDiv('qiaomu-reader-lookup');
const TRANSLATION_LANGUAGE_CHOICES = Object.freeze([
  ["zh-CN", "simplified-chinese"],
  ["zh-TW", "traditional-chinese"],
  ["en", "english"],
  ["ja", "japanese"],
  ["ko", "korean"],
  ["ru", "russian"],
  ["de", "german"],
  ["fr", "french"],
  ["es", "spanish"],
]);
function lookupLanguageLabel(code) {
  const choice = TRANSLATION_LANGUAGE_CHOICES.find(([value]) => value === code);
  return choice ? qiaomuReaderTranslate(choice[1]) : code;
}
function lookupFailureText(error, engine) {
  const why = error && error.qiaomuReaderReason;
  if (engine === "ai") return aiConnectionErrorMessage(error);
  if (why === "limit") return qiaomuReaderTranslate("google-is-rate-limiting-translations-wait-a-minute-and-try-again");
  if (why === "http") return qiaomuReaderTranslate("the-translator-answered-with-error-0-your-connection-is-fine-try", error.qiaomuReaderStatus);
  if (why === "empty") return qiaomuReaderTranslate("the-translator-returned-nothing");
  return qiaomuReaderTranslate("could-not-reach-the-translator-it-looks-like-there-is-no-interne");
}
function lookupCardMarkdown(state, result) {
  if (state.word && result.card) {
    const c = result.card;
    const head = `**${c.lemma || state.term}**${c.phonetic ? ` ${c.phonetic}` : ""}`;
    const lines = [c.meaning ? `${head} — ${c.meaning}` : head];
    for (const sense of c.senses) lines.push(`- ${sense.pos ? `*${sense.pos}* ` : ""}${sense.def}`);
    if (c.note) lines.push(c.note);
    if (c.example) lines.push(`> ${c.example}${c.exampleTranslation ? `\n> ${c.exampleTranslation}` : ""}`);
    return lines.join("\n");
  }
  return result.text || "";
}
async function runLookup(card, state) {
  const { view, plugin } = state;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  state.result = null;
  card.empty();
  const head = card.createDiv("qiaomu-reader-lookup-head");
  const title = head.createDiv("qiaomu-reader-lookup-title");
  if (state.word) title.createSpan({ cls: "qiaomu-reader-lookup-term", text: state.term });
  else title.createSpan({ cls: "qiaomu-reader-lookup-kind", text: qiaomuReaderTranslate("translation") });
  const targetBtn = head.createEl("button", {
    cls: "qiaomu-reader-lookup-target",
    attr: { type: "button", "aria-haspopup": "menu", "aria-label": qiaomuReaderTranslate("translate-into-0", lookupLanguageLabel(state.target)) },
  });
  targetBtn.createSpan({ text: `→ ${lookupLanguageLabel(state.target)}` });
  setIcon(targetBtn.createSpan({ cls: "qiaomu-reader-lookup-chevron" }), "chevron-down");
  targetBtn.addEventListener("click", () => {
    const menu = new Menu().setUseNativeMenu(false);
    for (const [code, label] of TRANSLATION_LANGUAGE_CHOICES) {
      menu.addItem((item) => item.setTitle(qiaomuReaderTranslate(label)).setChecked(code === state.target).onClick(() => {
        if (code === state.target) return;
        // A temporary choice lasts for this reader session; the default in
        // settings is left alone.
        state.target = code; view._lookupTarget = code;
        void runLookup(card, state);
      }));
    }
    const rect = targetBtn.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom }, docOf(targetBtn));
  });
  const body = card.createDiv({ cls: "qiaomu-reader-lookup-body", attr: { "aria-live": "polite" } });
  const status = body.createDiv({ cls: "qiaomu-reader-lookup-status", text: qiaomuReaderTranslate(state.word ? "looking-up" : "translating") });
  const cfg = aiConfig(plugin);
  const slow = state.engine === "ai" && cfg.transport === "cli"
    ? window.setTimeout(() => { if (status.isConnected) status.setText(qiaomuReaderTranslate("lk-cli-slow")); }, 2500)
    : null;
  window.requestAnimationFrame(() => placeLookupCard(view));
  const cache = plugin._lookupCache ||= createLookupCache(200);
  const key = lookupCacheKey(state.word ? "word" : "text", state.engine, state.target, state.word ? state.term : state.text, state.context);
  let result = cache.get(key);
  try {
    if (!result) {
      if (state.word) {
        result = state.engine === "ai"
          ? await aiLookupTerm(plugin, { term: state.term, sentence: state.context, book: state.book, target: state.target, signal: controller.signal })
          : await googleLookupTerm(state.term, state.target);
      } else if (state.engine === "ai") {
        let out = null, frame = 0;
        result = await aiTranslateText(plugin, {
          text: state.text, context: state.context, book: state.book, target: state.target, signal: controller.signal,
          onDelta: (delta) => {
            if (controller.signal.aborted || !card.isConnected) return;
            if (!out) { status.remove(); out = body.createDiv("qiaomu-reader-lookup-text"); }
            out.setText(delta.answer || "");
            if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; placeLookupCard(view); });
          },
        });
      } else {
        result = await googleTranslateDetailed(state.text, state.target);
      }
      cache.set(key, result);
    }
  } catch (error) {
    window.clearTimeout(slow);
    if (controller.signal.aborted || !card.isConnected) return;
    console.error("Qiaomu Reader: lookup failed", error);
    body.empty();
    body.createDiv({ cls: "qiaomu-reader-lookup-error", text: lookupFailureText(error, state.engine), attr: { role: "alert" } });
    const actions = card.createDiv("qiaomu-reader-lookup-actions");
    actions.createEl("button", { text: qiaomuReaderTranslate("try-again"), attr: { type: "button" } })
      .addEventListener("click", () => void runLookup(card, state));
    if (state.engine === "ai") {
      actions.createEl("button", { text: qiaomuReaderTranslate("use-google-translate"), attr: { type: "button" } })
        .addEventListener("click", () => { state.engine = "google"; void runLookup(card, state); });
    }
    placeLookupCard(view);
    return;
  }
  window.clearTimeout(slow);
  if (controller.signal.aborted || !card.isConnected) return;
  state.result = result;
  body.empty();
  if (state.word && result.card?.phonetic) title.createSpan({ cls: "qiaomu-reader-lookup-phonetic", text: result.card.phonetic });
  if (state.word) renderLookupWord(body, state, result.card);
  else body.createDiv({ cls: "qiaomu-reader-lookup-text", text: result.text || qiaomuReaderTranslate("the-translator-returned-nothing") });
  if (result.target !== state.target) {
    body.createDiv({ cls: "qiaomu-reader-lookup-hint", text: qiaomuReaderTranslate("lk-fallback", lookupLanguageLabel(state.target), lookupLanguageLabel(result.target)) });
  }
  renderLookupActions(card, state);
  window.requestAnimationFrame(() => placeLookupCard(view));
}
function renderLookupWord(body, state, c) {
  if (c.lemma && c.lemma.toLowerCase() !== state.term.toLowerCase()) {
    const line = body.createDiv("qiaomu-reader-lookup-lemma");
    line.appendText(qiaomuReaderTranslate("base-form") + " ");
    line.createSpan({ cls: "qiaomu-reader-lookup-lemma-word", text: c.lemma });
  }
  if (c.meaning) body.createDiv({ cls: "qiaomu-reader-lookup-meaning", text: c.meaning });
  // Google often repeats the headline translation as its only sense.
  const senses = c.senses.filter((sense) => sense.def !== c.meaning);
  if (senses.length) {
    const list = body.createEl("ul", "qiaomu-reader-lookup-senses");
    for (const sense of senses) {
      const li = list.createEl("li");
      if (sense.pos) li.createSpan({ cls: "qiaomu-reader-lookup-pos", text: sense.pos });
      li.createSpan({ text: sense.def });
    }
  }
  if (c.note) body.createDiv({ cls: "qiaomu-reader-lookup-note", text: c.note });
  if (c.example) {
    const ex = body.createDiv("qiaomu-reader-lookup-example");
    ex.createDiv({ text: c.example });
    if (c.exampleTranslation) ex.createDiv({ cls: "qiaomu-reader-lookup-example-tr", text: c.exampleTranslation });
  }
}
function renderLookupActions(card, state) {
  const { plugin } = state;
  const foot = card.createDiv("qiaomu-reader-lookup-actions");
  // The engine that answered stays visible; the other one is one click away
  // only when it can actually answer.
  const other = state.engine === "ai" ? "google" : lookupAiReady(plugin) ? "ai" : "";
  const engine = foot.createDiv("qiaomu-reader-lookup-engine");
  const provider = aiConfig(plugin).provider;
  engine.createSpan({ text: state.engine === "ai" && provider
    ? qiaomuReaderTranslate(provider.label) : qiaomuReaderTranslate(state.engine === "ai" ? "engine-ai" : "engine-google") });
  if (other) {
    engine.createEl("button", {
      cls: "qiaomu-reader-lookup-switch",
      text: qiaomuReaderTranslate(other === "ai" ? (state.word ? "explain-with-ai" : "translate-with-ai") : "use-google-translate"),
      attr: { type: "button" },
    }).addEventListener("click", () => { state.engine = other; void runLookup(card, state); });
  }
  if (state.word && state.result?.card) renderVocabularyButton(foot, state, state.result.card);
  const markdown = lookupCardMarkdown(state, state.result);
  const copy = foot.createEl("button", { cls: "qiaomu-reader-lookup-icon", attr: { type: "button", "aria-label": qiaomuReaderTranslate("copy") } });
  setIcon(copy, "copy");
  copy.addEventListener("click", async () => {
    const copied = await copyToClipboard(markdown);
    new Notice(qiaomuReaderTranslate(copied ? "copied" : "could-not-copy"));
  });
  const save = foot.createEl("button", { cls: "qiaomu-reader-lookup-icon", attr: { type: "button", "aria-label": qiaomuReaderTranslate("translation-save-to"), "aria-haspopup": "menu" } });
  setIcon(save, "file-plus");
  save.addEventListener("click", () => {
    const menu = new Menu().setUseNativeMenu(false);
    const targets = [
      ["book", "book-open", qiaomuReaderTranslate("translation-save-book"), true],
      ["current", "file-text", state.noteTarget ? qiaomuReaderTranslate("translation-current-note", state.noteTarget.file.basename) : qiaomuReaderTranslate("translation-no-current-note"), !!(state.noteTarget && currentTranslationNote(plugin, state.noteTarget))],
      ["new", "file-plus", qiaomuReaderTranslate("create-new-note"), true],
      ["daily", "calendar", qiaomuReaderTranslate("translation-daily-note"), !!dailyNoteProvider(state.app)],
    ];
    for (const [id, icon, label, available] of targets) {
      menu.addItem((item) => item.setTitle(label).setIcon(icon).setDisabled(!available).onClick(() => void saveLookupResult(card, state, id, markdown)));
    }
    const rect = save.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom }, docOf(save));
  });
}
function renderVocabularyButton(foot, state, card) {
  const { plugin } = state;
  const button = foot.createEl("button", { cls: "qiaomu-reader-lookup-add", attr: { type: "button" } });
  setIcon(button.createSpan({ cls: "qiaomu-reader-lookup-add-icon" }), "plus");
  const label = button.createSpan({ text: qiaomuReaderTranslate("add-to-vocabulary") });
  let savedFile = null;
  const markSaved = (text) => {
    button.addClass("is-saved");
    button.empty();
    setIcon(button.createSpan({ cls: "qiaomu-reader-lookup-add-icon" }), "check");
    button.createSpan({ text });
  };
  void vocabularyHasWord(plugin, state.term, card?.lemma).then((known) => {
    if (known && button.isConnected && !savedFile) markSaved(qiaomuReaderTranslate("in-vocabulary"));
  }).catch(() => {});
  button.addEventListener("click", async () => {
    if (savedFile) { void openNoteBesideBook(plugin.app, plugin, savedFile); return; }
    if (button.disabled) return;
    button.disabled = true;
    try {
      const result = await addWordToVocabulary(plugin, vocabularyEntry(state, card));
      savedFile = result.file;
      if (!button.isConnected) return;
      markSaved(qiaomuReaderTranslate(result.status === "added" ? "added-to-vocabulary"
        : result.status === "context" ? "vb-example-added" : "in-vocabulary"));
      button.setAttr("aria-label", qiaomuReaderTranslate("open-vocabulary"));
      if (result.status === "added" && plugin.settings.ankiSync) {
        pushWordToAnki(plugin, result.file, result.word).catch((error) => {
          console.error("Qiaomu Reader: Anki push failed", error);
          new Notice(ankiErrorMessage(error), 10000);
        });
      }
    } catch (error) {
      console.error("Qiaomu Reader: vocabulary save failed", error);
      new Notice(vocabularyErrorMessage(error), 8000);
      if (label.isConnected) label.setText(qiaomuReaderTranslate("add-to-vocabulary"));
    } finally { button.disabled = false; }
  });
}
async function saveLookupResult(card, state, destination, markdown) {
  if (state.saving) return;
  state.saving = true;
  try {
    const file = await saveTranslationNote(state, destination, markdown);
    if (!file) return;
    state.savedTargets.set(destination, file);
    new Notice(qiaomuReaderTranslate("translation-saved", file.basename));
  } catch (error) {
    console.error("Qiaomu Reader: lookup save failed", error);
    new Notice(qiaomuReaderTranslate("translation-save-failed"));
  } finally { state.saving = false; }
}

 void runLookup(card,state);return {state,dispose(){state.controller?.abort();card.remove();},refresh(){return runLookup(card,state);}};
}
