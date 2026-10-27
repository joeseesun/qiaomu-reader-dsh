import {enhance,Scope} from '../client/native-ui.js';
export function createOriginalLightbox(t){const qiaomuReaderTranslate=t,docOf=el=>el.ownerDocument,active=new Set();
function buildLightboxLayer(doc, src) {
  const layer = enhance(doc.createElement("div"));
  layer.className = "qiaomu-reader-lightbox";
  const img = layer.createEl("img");
  img.setAttribute("src", src);
  const closer = layer.createDiv("qiaomu-reader-lightbox-close");
  closer.setText("✕");
  layer.createDiv("qiaomu-reader-lightbox-hint").setText(qiaomuReaderTranslate("tap-the-image-to-zoom-background-or-to-close"));
  return { layer, img, closer };
}
function pushEscapeScope(app, onEscape) {
  const keymap = app && app.keymap;
  if (!keymap || !Scope) return null;
  try {
    const escapeScope = new Scope();
    escapeScope.register([], "Escape", () => { onEscape(); return false; });
    keymap.pushScope(escapeScope);
    return escapeScope;
  } catch {
    return null;
  }
}
function popEscapeScope(app, escapeScope) {
  if (!escapeScope || !app || !app.keymap) return;
  try { app.keymap.popScope(escapeScope); } catch { /* keymap may already be gone */ }
}
function openImageLightbox(srcUrl, app, ownerEl) {
  if (!srcUrl) return;
  const ownerDoc = docOf(ownerEl);
  const { layer, img, closer } = buildLightboxLayer(ownerDoc, srcUrl);
  let dismissed = false;
  let scope;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    popEscapeScope(app, scope);
    ownerDoc.removeEventListener("keydown", onDocKey, true);
    layer.remove();
    active.delete(dismiss);
  };
  const onDocKey = (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault(); e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    dismiss();
  };
  scope = pushEscapeScope(app, dismiss);
  ownerDoc.addEventListener("keydown", onDocKey, true);
  closer.addEventListener("click", (e) => { e.stopPropagation(); dismiss(); });
  layer.addEventListener("click", (e) => { if (e.target === layer) dismiss(); });
  img.addEventListener("click", (e) => {
    e.stopPropagation(); img.classList.toggle("qiaomu-reader-lightbox-zoom");
  });
  active.add(dismiss);
  ownerDoc.body.appendChild(layer);
  window.requestAnimationFrame(() => layer.classList.add("qiaomu-reader-lightbox-on"));
  return dismiss;
}

return{open:openImageLightbox,dispose(){for(const close of [...active])close();}};}
