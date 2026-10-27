import {Modal} from '../client/native-ui.js';
import {parseReaderPosition} from './reader-position.js';
export const GoToPageModal = class extends Modal {
  constructor(app, total, current, onSubmit, options = {}) {
    super(app);
    this.total = total;
    this.current = current || 0;
    this.onSubmit = onSubmit;
    this.options = options;
    this.position = options.position || { kind: "page", total, current: (current || 0) + 1, fraction: current / Math.max(1, total - 1) };
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("qiaomu-reader-confirm-modal", "qiaomu-reader-position-modal");
    contentEl.empty();
    this.setTitle(this.options.t("position-jump-title"));
    const model = this.position;
    const row = contentEl.createDiv("qiaomu-reader-position-fields");
    const modeLabel = row.createEl("label");
    modeLabel.createSpan({ text: this.options.t("position-jump-by") });
    const mode = modeLabel.createEl("select");
    if (model.kind !== "percent") mode.createEl("option", { value: model.kind, text: this.options.t(model.kind === "original" ? "position-original" : model.kind === "location" ? "reading-position" : "position-page") });
    mode.createEl("option", { value: "percent", text: this.options.t("position-percent") });
    const valueLabel = row.createEl("label");
    valueLabel.createSpan({ text: this.options.t("position-target") });
    const input = valueLabel.createEl("input", { cls: "qiaomu-reader-gotopage-input", attr: { type: "text", enterkeyhint: "go", autocomplete: "off" } });
    const hint = contentEl.createDiv("qiaomu-reader-position-hint");
    const error = contentEl.createDiv({ cls: "qiaomu-reader-title-error", attr: { role: "alert" } });
    const reset = () => {
      error.empty(); input.removeAttribute("aria-invalid");
      input.setAttribute("inputmode", mode.value === "original" ? "text" : mode.value === "percent" ? "decimal" : "numeric");
      input.value = mode.value === "percent" ? String(Math.round(model.fraction * 100)) : String(model.current);
      input.placeholder = mode.value === "percent" ? "0–100" : mode.value === "original" ? model.pages[0].label : `1–${model.total}`;
      hint.setText(this.options.t(mode.value === "location" ? "position-location-help" : mode.value === "original" ? "position-original-help" : "position-range", mode.value === "percent" ? "0–100%" : `1–${model.total}`));
    };
    reset();
    mode.addEventListener("change", () => { reset(); input.focus(); input.select(); });
    input.addEventListener("input", () => { error.empty(); input.removeAttribute("aria-invalid"); });
    const submit = async () => {
      if (this._busy || this._closed) return;
      const target = parseReaderPosition(input.value, model, mode.value);
      if (!target) {
        error.setText(this.options.t("position-invalid")); input.setAttribute("aria-invalid", "true"); return;
      }
      this._busy = true; go.disabled = true; mode.disabled = true; input.disabled = true;
      try {
        if (this.options.isCurrent && !this.options.isCurrent()) throw new Error("Reader changed");
        const value = this.options.position ? target : target.page ?? 1 + Math.round((this.total - 1) * target.fraction);
        await this.onSubmit(value);
        if (!this._closed) this.close();
      } catch {
        if (!this._closed) error.setText(this.options.t("position-jump-failed"));
      } finally {
        this._busy = false; go.disabled = false; mode.disabled = false; input.disabled = false;
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        void submit();
      }
    });
    const btns = contentEl.createDiv("qiaomu-reader-confirm-btns");
    btns.createEl("button", { text: this.options.t("cancel"), attr: { type: "button" } }).addEventListener("click", () => this.close());
    const go = btns.createEl("button", { text: this.options.t("position-go") });
    go.addClass("qiaomu-reader-confirm-yes");
    go.addEventListener("click", submit);
    queueMicrotask(()=>{if(!this._closed){input.focus();input.select();}});
  }
  onClose() {
    this._closed = true;
    this.contentEl.empty();
  }
};
