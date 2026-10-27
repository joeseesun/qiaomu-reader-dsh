import {Modal,Setting,Notice} from '../client/native-ui.js';
import {defaultVocabularyPath,vocabularyDeckTag} from './vocabulary.js';
import {ANKI_ADDON_CODE,ANKI_DEFAULT_DECK} from './anki.js';
export async function openLookupSettings({features,ui,chatApi}){
 const loaded=await features.reload(),status=await features.call('vocabulary',{action:'status'}),saved=loaded.settings.lookup||{};
 const qiaomuReaderTranslate=features.t,lookupAiReady=()=>!!chatApi?.defaultWorkspace?.(),aiConfig=()=>({provider:{label:'DeepSeek Harness'}});
 const openPluginAiSettings=()=>{ui.setPanel('companion');modal.close();};
 const vocabularyPath=()=>plugin.settings.vocabularyFile||'notes/生词本.md',vocabularyZh=()=>true,notesFolderPath=()=> 'notes',vocabularyDeckName=()=>vocabularyDeckTag();
 const noteFolderPath=path=>{if(!path.startsWith('notes')||path.split('/').some(p=>p==='..'||p==='.'||!p))throw Error('path');return path;},qiaomuReaderPath=x=>x;
 const openVocabulary=()=>{modal.close();ui.setPanel('vocabulary');};
 const ankiTarget=()=>({url:'http://127.0.0.1:8765',deck:plugin.settings.ankiDeck||ANKI_DEFAULT_DECK}),ankiPost=()=>{};
 const ensureAnkiSetup=()=>features.call('vocabulary',{action:'test'}),ankiErrorMessage=error=>error.message;
 const syncVocabularyToAnki=async()=>{try{return await features.call('vocabulary',{action:'sync'});}catch(error){new Notice(error.message);return null;}};
 class TFile{};
 const plugin={settings:{...saved,translateEnabled:saved.enabled!==false,translateEngine:saved.engine||'google',translateTo:saved.target||'zh-CN'},app:{vault:{getAbstractFileByPath:path=>status.exists&&path===status.path?new TFile():null}},async saveAll(){await features.reload();await features.save({lookup:{enabled:plugin.settings.translateEnabled,engine:plugin.settings.translateEngine,target:plugin.settings.translateTo,vocabularyFile:plugin.settings.vocabularyFile,ankiSync:plugin.settings.ankiSync,ankiDeck:plugin.settings.ankiDeck}});ui.store.set({lookupEnabled:plugin.settings.translateEnabled});}};
 class Settings extends Modal{
 constructor(){super(plugin.app);this.plugin=plugin;}
 onOpen(){this.setTitle(qiaomuReaderTranslate('translation'));this._redraw();}
 _redraw(){this.contentEl.empty();this._translateSelectionRows(this.contentEl);}
  _translateSelectionRows(host) {
    new Setting(host)
      .setName(qiaomuReaderTranslate("translate-button-in-the-selection-popup"))
      .setDesc(qiaomuReaderTranslate("adds-a-translate-button-to-the-popup-that-appears-when-you-selec"))
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.translateEnabled === true).onChange(async (v) => {
        this.plugin.settings.translateEnabled = v; await this.plugin.saveAll(); this._redraw();
      }));
    if (this.plugin.settings.translateEnabled !== true) return;
    const aiReady = lookupAiReady(this.plugin);
    const cfg = aiConfig(this.plugin);
    const wantsAi = this.plugin.settings.translateEngine === "ai";
    const engine = new Setting(host)
      .setName(qiaomuReaderTranslate("translation-engine"))
      .setDesc(qiaomuReaderTranslate(wantsAi && !aiReady ? "lk-ai-not-ready"
        : wantsAi ? "lk-ai-desc"
        : "lk-google-desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("google", qiaomuReaderTranslate("engine-google"));
        dropdown.addOption("ai", cfg.provider ? qiaomuReaderTranslate("engine-ai-0", qiaomuReaderTranslate(cfg.provider.label)) : qiaomuReaderTranslate("engine-ai"));
        dropdown.setValue(wantsAi ? "ai" : "google").onChange(async (v) => {
          this.plugin.settings.translateEngine = v; await this.plugin.saveAll(); this._redraw();
        });
      });
    if (wantsAi && !aiReady) {
      engine.descEl.addClass("qiaomu-reader-setting-warning");
      engine.addButton((btn) => btn.setButtonText(qiaomuReaderTranslate("set-up-ai"))
        .onClick(() => openPluginAiSettings(this.app, this.plugin, () => this._redraw())));
    }
    new Setting(host)
      .setName(qiaomuReaderTranslate("translate-into"))
      .setDesc(qiaomuReaderTranslate("lk-target-desc"))
      .addDropdown((dropdown) => {
        TRANSLATION_LANGUAGE_CHOICES.forEach(([value, label]) => dropdown.addOption(value, qiaomuReaderTranslate(label)));
        dropdown.setValue(this.plugin.settings.translateTo || "zh-CN")
          .onChange(async (v) => { this.plugin.settings.translateTo = v; await this.plugin.saveAll(); });
      });
    this._vocabularyRows(host);
  }
  _vocabularyRows(host) {
    const plugin = this.plugin, settings = plugin.settings, tx = qiaomuReaderTranslate;
    const path = vocabularyPath(plugin);
    const exists = plugin.app.vault.getAbstractFileByPath(path) instanceof TFile;
    const book = new Setting(host).setName(tx("vocabulary-note"));
    book.descEl.appendText(tx(exists ? "vb-saved-in" : "vb-created-at"));
    book.descEl.createEl("code", { text: path });
    if (exists) book.addButton((btn) => btn.setButtonText(tx("open")).onClick(() => void openVocabulary(plugin)));
    book.addButton((btn) => btn.setButtonText(tx("change-location")).onClick(() => {
      this._vocabularyPathOpen = !this._vocabularyPathOpen; this._redraw();
    }));
    if (this._vocabularyPathOpen) {
      const where = new Setting(host).setName(tx("vocabulary-location"))
        .setDesc(tx("vb-location-desc"));
      where.addText((text) => {
        text.setPlaceholder(defaultVocabularyPath(notesFolderPath(this.app), vocabularyZh())).setValue(path);
        const commit = async () => {
          let value = text.getValue().trim();
          if (!value) value = defaultVocabularyPath(notesFolderPath(this.app), vocabularyZh());
          if (!/\.md$/i.test(value)) value += ".md";
          try {
            const folder = value.includes("/") ? value.slice(0, value.lastIndexOf("/")) : "";
            noteFolderPath(folder);
            if (!folder) throw new Error("root");
          } catch {
            text.inputEl.setAttr("aria-invalid", "true");
            where.descEl.setText(tx("vb-no-root"));
            return;
          }
          settings.vocabularyFile = qiaomuReaderPath(value);
          await plugin.saveAll();
          this._vocabularyPathOpen = false;
          this._redraw();
        };
        text.inputEl.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); void commit(); } });
        where.addButton((btn) => btn.setButtonText(tx("save")).setCta().onClick(() => void commit()));
      });
    }
    const srReady = !!plugin.app.plugins?.enabledPlugins?.has?.("obsidian-spaced-repetition");
    const review = new Setting(host).setName(tx("vb-review-sr"));
    if (srReady) review.setDesc(tx("vb-sr-deck", vocabularyDeckName()));
    else {
      review.setDesc(tx("vb-sr-install"));
      review.addButton((btn) => btn.setButtonText(tx("view-plugin")).onClick(() => window.open("https://github.com/st3v3nmw/obsidian-spaced-repetition","_blank","noopener,noreferrer")));
    }
    new Setting(host)
      .setName(tx("sync-to-anki"))
      .setDesc(tx("anki-sync-desc", ANKI_ADDON_CODE))
      .addToggle((toggle) => toggle.setValue(settings.ankiSync === true).onChange(async (v) => {
        settings.ankiSync = v; await plugin.saveAll(); this._redraw();
      }));
    if (settings.ankiSync !== true) return;
    const deck = new Setting(host).setName(tx("anki-deck"));
    deck.addText((text) => text.setPlaceholder(ANKI_DEFAULT_DECK).setValue(settings.ankiDeck || "")
      .onChange(async (v) => { settings.ankiDeck = v.trim(); await plugin.saveAll(); }));
    const status = new Setting(host).setName(tx("anki-connection"));
    const paint = (text, error = false) => { status.descEl.setText(text); status.descEl.toggleClass("qiaomu-reader-setting-warning", error); };
    paint(tx("not-checked-yet"));
    status.addButton((btn) => btn.setButtonText(tx("test")).onClick(async () => {
      btn.setDisabled(true); paint(tx("checking"));
      try {
        const { url, deck: name } = ankiTarget(plugin);
        await ensureAnkiSetup(ankiPost, url, name);
        paint(tx("anki-ready", name));
      } catch (error) { paint(ankiErrorMessage(error), true); }
      finally { btn.setDisabled(false); }
    }));
    status.addButton((btn) => btn.setButtonText(tx("sync-all-words")).onClick(async () => {
      btn.setDisabled(true); paint(tx("syncing"));
      const result = await syncVocabularyToAnki(plugin);
      paint(result ? tx("anki-sync-result", result.added, result.skipped) : tx("anki-sync-failed"), !result);
      btn.setDisabled(false);
    }));
  }

}
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

const modal=new Settings();modal.open();return modal;
}
