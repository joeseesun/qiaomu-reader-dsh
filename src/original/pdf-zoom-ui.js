import {Modal,Menu,setIcon} from '../client/native-ui.js';
import {PDF_ZOOM_MIN,PDF_ZOOM_MAX,PDF_ZOOM_DEFAULT,clampPdfZoom,stepPdfZoom,pdfZoomPercent,pdfZoomFromWheel} from './pdf-zoom.js';
export function mountOriginalPdfZoom(parent,view,{t,applyPdfZoom,fitPdfWidth,listen}){
const qiaomuReaderTranslate=t,svgIcon=setIcon,readerIsPdf=()=>true,qiaomuReaderAutoFocus=el=>queueMicrotask(()=>el.isConnected&&el.focus());
const changePdfZoom=(view,direction)=>applyPdfZoom(view,stepPdfZoom(view.pdfZoom,direction));
function syncPdfZoomControls(view) {
  const isPdf = readerIsPdf(view);
  const zoom = clampPdfZoom(view?.pdfZoom);
  if (view?.contentEl) view.contentEl.toggleClass("qiaomu-reader-pdf-document", isPdf);
  if (view?.pdfZoomLabelEl) {
    const label = pdfZoomPercent(zoom);
    view.pdfZoomLabelEl.setText(label);
    view.pdfZoomLabelEl.setAttribute("aria-label", qiaomuReaderTranslate("pdf-zoom-options-0", label));
    view.pdfZoomLabelEl.setAttribute("title", qiaomuReaderTranslate(view.pdfZoomMode === "width" ? "fit-width" : "pdf-zoom-options-0", label));
  }
  if (view?.pdfZoomSettingsLabelEl) view.pdfZoomSettingsLabelEl.setText(pdfZoomPercent(zoom));
  if (view?.pdfZoomOutEl) view.pdfZoomOutEl.disabled = !isPdf || zoom <= PDF_ZOOM_MIN + 0.001;
  if (view?.pdfZoomInEl) view.pdfZoomInEl.disabled = !isPdf || zoom >= PDF_ZOOM_MAX - 0.001;
}
function setPdfPanMode(view, enabled) {
  view.pdfPanMode = enabled;
  view.contentEl?.toggleClass("qiaomu-reader-pdf-pan", enabled);
  view.pdfPanButton?.setAttribute("aria-pressed", String(enabled));
  view._hideHlPopup?.();
}
function showPdfZoomMenu(view, event) {
  const menu = new Menu();
  addPdfZoomMenuItems(menu, view);
  menu.showAtMouseEvent(event);
}
class PdfZoomModal extends Modal {
  constructor(app, view) { super(app); this.view = view; }
  onOpen() {
    this.setTitle(qiaomuReaderTranslate("custom-pdf-zoom"));
    const input = this.contentEl.createEl("input", { type: "number", attr: { min: String(PDF_ZOOM_MIN * 100), max: String(PDF_ZOOM_MAX * 100), step: "5", "aria-label": qiaomuReaderTranslate("zoom-percentage") } });
    input.value = String(Math.round(clampPdfZoom(this.view.pdfZoom) * 100));
    const apply = () => {
      if (!input.checkValidity() || !input.value) { input.reportValidity(); return; }
      applyPdfZoom(this.view, Number(input.value) / 100);
      this.close();
    };
    this.contentEl.createEl("button", { text: qiaomuReaderTranslate("apply"), cls: "mod-cta" }).addEventListener("click", apply);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") apply(); });
    qiaomuReaderAutoFocus(input);
  }
}
function createPdfZoomControls(parent, view) {
  const group = parent.createDiv("qiaomu-reader-pdf-zoom-control");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", qiaomuReaderTranslate("pdf-zoom"));
  const out = group.createEl("button", {
    cls: "qiaomu-reader-pdf-zoom-step",
    attr: { type: "button", "aria-label": qiaomuReaderTranslate("zoom-pdf-out") },
  });
  svgIcon(out, "minus");
  const label = group.createEl("button", { cls: "qiaomu-reader-pdf-zoom-value", attr: { type: "button" } });
  const input = group.createEl("button", {
    cls: "qiaomu-reader-pdf-zoom-step",
    attr: { type: "button", "aria-label": qiaomuReaderTranslate("zoom-pdf-in") },
  });
  svgIcon(input, "plus");
  out.addEventListener("click", () => changePdfZoom(view, -1));
  label.addEventListener("click", (event) => showPdfZoomMenu(view, event));
  input.addEventListener("click", () => changePdfZoom(view, 1));
  view.pdfZoomControlEl = group;
  view.pdfZoomOutEl = out;
  view.pdfZoomLabelEl = label;
  view.pdfZoomInEl = input;
  const pan = group.createEl("button", { cls: "qiaomu-reader-pdf-zoom-step", attr: { type: "button", "aria-label": qiaomuReaderTranslate("pan-pdf"), "aria-pressed": "false" } });
  setIcon(pan, "hand");
  pan.addEventListener("click", () => setPdfPanMode(view, !view.pdfPanMode));
  view.pdfPanButton = pan;
  syncPdfZoomControls(view);
  return group;
}
function addPdfZoomMenuItems(menu, view) {
  if (!readerIsPdf(view)) return;
  const zoom = clampPdfZoom(view.pdfZoom);
  menu.addSeparator();
  menu.addItem((item) => item
    .setTitle(qiaomuReaderTranslate("zoom-pdf-out-0", pdfZoomPercent(zoom)))
    .setIcon("zoom-out")
    .setDisabled(zoom <= PDF_ZOOM_MIN + 0.001)
    .onClick(() => changePdfZoom(view, -1)));
  menu.addItem((item) => item
    .setTitle(qiaomuReaderTranslate("fit-page-100"))
    .setIcon("scan")
    .setDisabled(Math.abs(zoom - PDF_ZOOM_DEFAULT) < 0.001)
    .onClick(() => applyPdfZoom(view, PDF_ZOOM_DEFAULT, null, "page")));
  menu.addItem((item) => item.setTitle(qiaomuReaderTranslate("fit-width")).setIcon("move-horizontal").onClick(() => fitPdfWidth(view)));
  menu.addItem((item) => item.setTitle(qiaomuReaderTranslate("custom-pdf-zoom")).setIcon("percent").onClick(() => new PdfZoomModal(view.app, view).open()));
  menu.addItem((item) => item.setTitle(qiaomuReaderTranslate("pan-pdf")).setIcon("hand").setChecked(!!view.pdfPanMode).onClick(() => setPdfPanMode(view, !view.pdfPanMode)));
  menu.addItem((item) => item
    .setTitle(qiaomuReaderTranslate("zoom-pdf-in-0", pdfZoomPercent(zoom)))
    .setIcon("zoom-in")
    .setDisabled(zoom >= PDF_ZOOM_MAX - 0.001)
    .onClick(() => changePdfZoom(view, 1)));
}
function setupPdfZoomInteractions(view) {
  const area = view?.areaEl;
  if (!area) return;
  let drag = null;
  listen(area,"pointerdown", (event) => {
    if (!readerIsPdf(view) || event.pointerType === "touch" || !(view.pdfPanMode || event.button === 1)) return;
    const page = event.target.closest?.(".qmr-pdf-sheet");
    const scroller = view.pager.scrollMode ? view.pager.clip : page;
    if (!scroller) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { scroller, x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    view._pdfPanning = true;
    area.setPointerCapture(event.pointerId);
  }, true);
  listen(area,"pointermove", (event) => {
    if (!drag) return;
    event.preventDefault();
    drag.scroller.scrollLeft = drag.left + drag.x - event.clientX;
    drag.scroller.scrollTop = drag.top + drag.y - event.clientY;
  });
  const endDrag = () => { if (drag) view._pdfPanEndedAt = Date.now(); drag = null; view._pdfPanning = false; };
  listen(area,"pointerup", endDrag);
  listen(area,"pointercancel", endDrag);
  listen(area,"lostpointercapture", endDrag);
  listen(area,"click", (event) => {
    if (view.pdfPanMode || Date.now() - (view._pdfPanEndedAt || 0) < 300) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  listen(area,"wheel", (event) => {
    if (!readerIsPdf(view) || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    applyPdfZoom(view, pdfZoomFromWheel(view.pdfZoom, event.deltaY), event);
  }, { passive: false });

  let pinchDistance = 0;
  let pinchZoom = PDF_ZOOM_DEFAULT;
  const distance = (touches) => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
  listen(area,"touchstart", (event) => {
    if (!readerIsPdf(view) || event.touches.length !== 2) return;
    pinchDistance = distance(event.touches);
    pinchZoom = clampPdfZoom(view.pdfZoom);
  }, { passive: true });
  listen(area,"touchmove", (event) => {
    if (!readerIsPdf(view) || event.touches.length !== 2 || pinchDistance <= 0) return;
    event.preventDefault();
    applyPdfZoom(view, pinchZoom * distance(event.touches) / pinchDistance, {
      clientX: (event.touches[0].clientX + event.touches[1].clientX) / 2,
      clientY: (event.touches[0].clientY + event.touches[1].clientY) / 2,
    });
  }, { passive: false });
  listen(area,"touchend", (event) => {
    if (event.touches.length < 2) pinchDistance = 0;
  }, { passive: true });
  listen(area,"touchcancel", () => { pinchDistance = 0; }, { passive: true });
}

createPdfZoomControls(parent,view);setupPdfZoomInteractions(view);return()=>syncPdfZoomControls(view);
}
