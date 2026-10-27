import {Modal} from '../client/native-ui.js';
export const ReaderNameModal = class extends Modal {
  constructor(app, title, value, submit, t) { super(app); this.title = title; this.value = value; this.submit = submit; this.t=t; }
  onOpen() {
    this.setTitle(this.title);this.titleEl.hidden=true;const c = this.contentEl;
    c.createEl("h3", { text: this.title });
    const input = c.createEl("input", { cls: "qiaomu-reader-panel-input", attr: { type: "text", "aria-label": this.title, maxlength: "80" } });
    input.value = this.value || "";
    const error = c.createDiv({ cls: "qiaomu-reader-title-error", attr: { role: "alert" } });
    const save = c.createEl("button", { text: this.t("save") });
    const submit = async () => {
      const title = input.value.trim();
      if (!title || save.disabled) return;
      save.disabled = true;
      try { await this.submit(title.slice(0, 80)); this.close(); }
      catch { error.setText(this.t("saving-failed-check-vault-permissions-and-retry")); save.disabled = false; }
    };
    save.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); void submit(); } });
    queueMicrotask(()=>{if(this.opened){input.focus();input.select();}});
  }
  onClose() { this.contentEl.empty(); }
};

export const ConfirmModal = class extends Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts || {};
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("qiaomu-reader-confirm-modal");
    contentEl.empty();this.setTitle(this.opts.title||this.opts.t("confirm"));this.titleEl.hidden=true;
    if (this.opts.title) contentEl.createDiv("qiaomu-reader-confirm-title").setText(this.opts.title);
    if (this.opts.body) contentEl.createDiv("qiaomu-reader-confirm-body").setText(this.opts.body);
    const btns = contentEl.createDiv("qiaomu-reader-confirm-btns");
    const no = btns.createEl("button", { text: this.opts.cancelText || this.opts.t("no") });
    no.addClass("qiaomu-reader-confirm-no");
    no.addEventListener("click", () => {
      this._done = true;
      this.close();
      this.opts.onNo && this.opts.onNo();
    });
    const yes = btns.createEl("button", { text: this.opts.okText || this.opts.t("yes") });
    yes.addClass("qiaomu-reader-confirm-yes");
    yes.addEventListener("click", () => {
      this._done = true;
      this.close();
      this.opts.onYes && this.opts.onYes();
    });
    queueMicrotask(()=>{if(this.opened)(this.opts.focusCancel ? no : yes).focus();});
  }
  onClose() {
    this.contentEl.empty();
  }
};
