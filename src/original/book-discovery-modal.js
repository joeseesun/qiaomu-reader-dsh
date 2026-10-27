import {Modal,enhance,setIcon} from '../client/native-ui.js';
import {mountEbookDiscovery,createEbookResult,createEbookDownloadProgress} from './ebook-library-ui.js';
import {showBookOwnership} from './book-ownership-ui.js';
import {externalBookSearchUrls,gutenbergSearchUrl,parseGutenbergSearch,gutenbergCoverUrl,safeBookFileName,gutenbergDetailUrl,parseGutenbergEpub,validGutenbergEpub} from './book-discovery.js';
const ANNA_SOURCE_NAME = "Anna’s Archive";
export const BookDiscoveryModal = class extends Modal {
  constructor(app, plugin, library) {
    super(app);
    this.plugin = plugin;
    this.library = library;
    this._request = 0;
  }
  onOpen() {
    this.setTitle(this.plugin.t("find-books"));this.titleEl.hidden=true;
    this._open = true;
    (this.plugin._bookDiscoveryModals ||= new Set()).add(this);
    this.modalEl.addClass("qiaomu-reader-book-discovery");
    this.contentEl.empty();
    const heading = this.contentEl.createDiv({ cls: "qiaomu-reader-discovery-heading" });
    heading.createEl("h2", { text: this.plugin.t("find-books") });
    const form = this.contentEl.createEl("form", { cls: "qiaomu-reader-discovery-search" });
    const label = form.createEl("label", { text: this.plugin.t("catalog.query") });
    const field = label.createEl("input", { attr: { type: "search", autocomplete: "off", placeholder: this.plugin.t("catalog.query") } });
    form.createEl("button", { attr: { type: "submit" }, text: this.plugin.t("search") });
    this._ebookPanel = mountEbookDiscovery(this.contentEl, this.plugin, this.library, this.plugin.t, { icon: setIcon, sourceParent: heading, sharedForm: form, sharedField: field, onNavigate: () => this.close() });
    const root = enhance(this._ebookPanel.publicRoot);
    const primary = root.createEl("section", { cls: "qiaomu-reader-discovery-primary" });
    primary.createEl("h3", { text: this.plugin.t("browser-book-sources") });
    const primaryLinks = primary.createDiv({ cls: "qiaomu-reader-discovery-primary-links" });
    const anna = primaryLinks.createEl("a", { href: "https://annas-archive.gl/", attr: { target: "_blank", rel: "noopener noreferrer" } });
    anna.textContent = ANNA_SOURCE_NAME;
    setIcon(anna.createSpan({ cls: "qiaomu-reader-discovery-link-icon" }), "arrow-up-right");
    const zlibrary = primaryLinks.createEl("a", { href: "https://z-library.sk/", attr: { target: "_blank", rel: "noopener noreferrer" } });
    zlibrary.createSpan({ text: "Z-Library" });
    setIcon(zlibrary.createSpan({ cls: "qiaomu-reader-discovery-link-icon" }), "arrow-up-right");
    const gutenberg = root.createEl("section", { cls: "qiaomu-reader-discovery-gutenberg" });
    gutenberg.createEl("h3", { text: this.plugin.t("search-gutenberg") });
    const status = gutenberg.createDiv({ cls: "qiaomu-reader-discovery-status" });
    status.setAttribute("role", "status");
    const results = gutenberg.createDiv({ cls: "qiaomu-reader-discovery-results" });
    const updateLinks = () => {
      const urls = externalBookSearchUrls(field.value);
      anna.href = urls?.anna || "https://annas-archive.gl/";
      zlibrary.href = urls?.zlibrary || "https://z-library.sk/";
      for (const { link, base, parameter } of links) {
        const target = new URL(base);
        if (field.value.trim()) target.searchParams.set(parameter, field.value.trim());
        link.href = !field.value.trim() && parameter === "search" ? "https://zh.wikisource.org/" : target.href;
      }
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this._ebookPanel.source() !== "public" || !field.value.trim()) return;
      void this._search(field.value, status, results);
    });
    field.addEventListener("input", updateLinks);
    const other = root.createEl("section", { cls: "qiaomu-reader-discovery-other" });
    other.createEl("h3", { text: this.plugin.t("other-book-sources") });
    const external = other.createDiv({ cls: "qiaomu-reader-discovery-sources" });
    const sources = [
      ["Standard Ebooks", "https://standardebooks.org/ebooks", "query"],
      [this.plugin.t("wikisource"), "https://zh.wikisource.org/w/index.php", "search"]
    ];
    const links = sources.map(([name, base, parameter]) => ({
      link: external.createEl("a", { text: name, href: base, attr: { target: "_blank", rel: "noopener noreferrer" } }),
      base, parameter
    }));
    other.createDiv({ cls: "qiaomu-reader-discovery-hint", text: this.plugin.t("external-book-source-hint") });
    field.focus();
  }
  async _search(query, status, results) {
    const value = String(query || "").trim();
    if (!value) return;
    const request = ++this._request;
    results.empty();
    status.setText(this.plugin.t("searching-books"));
    try {
      const response = await this.plugin.request({ url: gutenbergSearchUrl(value), method: "GET", throw: false });
      if (!this._open || request !== this._request) return;
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const books = parseGutenbergSearch(response.text, (xml) => new DOMParser().parseFromString(xml, "application/xml"));
      status.setText(books.length ? this.plugin.t("gutenberg-results-note") : this.plugin.t("no-books-found"));
      for (const book of books) {
        const result = createEbookResult(results, { ...book, format: "epub" }, this.plugin.t, {
          icon: setIcon, pageUrl: book.pageUrl,
          onDownload: button => void this._download(book, button, status)
        });
        showBookOwnership(result, { ...book, source: "gutenberg", sourceId: book.id }, this.plugin, this.plugin.t);
        result.setCover({ url: gutenbergCoverUrl(book.id), sourceUrl: book.pageUrl });
      }
    } catch (error) {
      if (!this._open || request !== this._request) return;
      console.warn("Qiaomu Reader: book search failed", error);
      status.setText(this.plugin.t("book-search-failed"));
    }
  }
  async _download(book, button, status) {
    if (button.disabled) return;
    const fileName = safeBookFileName(book.title, book.id);
    if (this.plugin.hasBookSource('gutenberg',book.id)) {
      status.setText(this.plugin.t("book-already-in-library"));
      return;
    }
    button.disabled = true;
    button.setText(this.plugin.t("downloading-book"));
    const feedback = createEbookDownloadProgress(button, this.plugin.t);
    feedback.update("queued");
    let completed = false;
    try {
      const detail = await this.plugin.request({ url: gutenbergDetailUrl(book.id), method: "GET", throw: false });
      if (!this._open) return;
      if (detail.status !== 200) throw new Error(`Catalog HTTP ${detail.status}`);
      const epub = parseGutenbergEpub(detail.text, book.id, (xml) => new DOMParser().parseFromString(xml, "application/xml"));
      if (!epub) throw new Error("No EPUB acquisition link");
      feedback.update("running");
      const response = await this.plugin.request({ url: epub.url, method: "GET", throw: false });
      if (!this._open) return;
      feedback.update("verifying");
      if (response.status !== 200 || !validGutenbergEpub(response.arrayBuffer)) throw new Error("Invalid EPUB response");
      feedback.update("importing");
      const imported = await this.library._importBooks([{ bookMetadata: { ...book, source: "gutenberg", sourceId: book.id }, name: fileName, type: "application/epub+zip", arrayBuffer: async () => response.arrayBuffer }]);
      if (!imported) throw new Error("Vault import failed");
      completed = true;
      if (!this._open) return;
      feedback.update("imported");
      status.setText(this.plugin.t("book-import-finished"));
    } catch (error) {
      if (!this._open) return;
      console.warn("Qiaomu Reader: book download failed", error);
      feedback.fail(this.plugin.t("book-download-failed"));
      status.setText(this.plugin.t("book-download-failed"));
    } finally {
      if (this._open) {
        button.disabled = completed;
        button.setText(this.plugin.t(completed ? "ebook.imported" : "ebook.download"));
      }
    }
  }
  onClose() {
    this._open = false;
    this.plugin._bookDiscoveryModals?.delete(this);
    this._ebookPanel?.dispose();
    this._request += 1;
    this.contentEl.empty();
  }
};
