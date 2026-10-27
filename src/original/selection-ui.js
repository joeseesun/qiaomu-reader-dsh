import {setIcon,Menu} from '../client/native-ui.js';
import {selectionActionPreferences} from './selection-preferences.js';
export function mountOriginalSelection(pop,{t,settings,selection,colors,actions,close,root}){
const qiaomuReaderTranslate=t,HL_COLORS=colors,QUICK_HL_COLOR_IDS=colors.map(c=>c.id);
const view={hlPopup:pop,contentEl:root||pop.ownerDocument.body,file:{path:'book'},plugin:{settings},_currentHl:()=>selection,_applyPopupColor:actions.highlight,_hideHlPopup:close};
const selectionColor=()=>selection.color||settings.defaultHlColor||'yellow';
const openInlineHighlightComment=actions.comment,openAiSelectionChat=actions.ai,openLookupCard=actions.translate,copySelectionText=actions.copy;
function openSelectionMoreMenu(view,event,includePrimary=false){const menu=new Menu();for(const action of selectionActions(view).filter(item=>includePrimary||!item.visible))menu.addItem(item=>item.setTitle(action.label).setIcon(action.icon).onClick(action.run));for(const [key,icon,run] of [['speech.selected','volume-2',actions.read],['copy-as-a-quote','text-quote',actions.quote],['copy-position-link','link',actions.link],['create-note','file-plus',actions.note]])menu.addItem(item=>item.setTitle(t(key)).setIcon(icon).onClick(run));menu.showAtMouseEvent(event);return menu;}
function closeSelectionColorDropdown(view, focus = false) {
  view.hlPopup?.querySelector(".qiaomu-reader-color-dropdown")?.remove();
  const trigger = view.hlPopup?.querySelector(".qiaomu-reader-hl-colors");
  trigger?.setAttribute("aria-expanded", "false");
  if (focus) trigger?.focus();
}
function toggleSelectionColorDropdown(view) {
  const pop = view.hlPopup;
  if (pop.querySelector(".qiaomu-reader-color-dropdown")) { closeSelectionColorDropdown(view, true); return; }
  const trigger = pop.querySelector(".qiaomu-reader-hl-colors");
  trigger.setAttribute("aria-expanded", "true");
  const menu = pop.createDiv("qiaomu-reader-color-dropdown");
  menu.setAttribute("role", "radiogroup");
  menu.setAttribute("aria-label", qiaomuReaderTranslate("highlight-colors"));
  const buttons = [];
  for (const color of HL_COLORS.filter(entry => QUICK_HL_COLOR_IDS.includes(entry.id))) {
    const selected = color.id === selectionColor(view);
    const button = menu.createEl("button", { cls: "qiaomu-reader-color-option", attr: {
      type: "button", role: "radio", "aria-checked": String(selected), "aria-label": color.label(), tabindex: selected ? "0" : "-1",
    } });
    const swatch = button.createSpan({ cls: "qiaomu-reader-color-swatch" });
    swatch.style.background = color.css;
    if (selected) setIcon(swatch, "check");
    button.createSpan({ text: color.label() });
    button.addEventListener("click", () => view._applyPopupColor(color.id));
    buttons.push(button);
  }
  const box = pop.getBoundingClientRect(), root = view.contentEl.getBoundingClientRect();
  const width = menu.offsetWidth;
  menu.style.left = `${Math.max(0, Math.min(trigger.offsetLeft, root.right - box.left - width - 8))}px`;
  menu.classList.toggle("is-above", box.bottom + menu.offsetHeight + 8 > root.bottom);
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeSelectionColorDropdown(view, true); }
    const i = buttons.indexOf(event.target);
    if (i >= 0 && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons.forEach((b, at) => b.tabIndex = at === next ? 0 : -1);
      buttons[next].focus();
    }
  });
  (buttons.find(b => b.getAttribute("aria-checked") === "true") || buttons[0]).focus({ preventScroll: true });
}
function selectionActions(view) {
  const actions = {
    highlight: ["qiaomu-reader-hl-highlight", "highlighter", "highlight-action", () => view._applyPopupColor(selectionColor(view))],
    comment: ["qiaomu-reader-hl-comment-btn", "message-square", "annotate-action", () => openInlineHighlightComment(view)],
    ai: ["qiaomu-reader-hl-ai", "sparkles", "ask-ai-action", () => openAiSelectionChat(view)],
    translate: ["qiaomu-reader-hl-translate", "languages", "translate", () => {
      if (!view._currentHl() || !view.file || !view.plugin.settings.translateEnabled) return;
      openLookupCard(view);
    }],
    copy: ["qiaomu-reader-hl-copy", "copy", "copy", () => void copySelectionText(view)],
  };
  return selectionActionPreferences(view.plugin.settings.selectionActions)
    .filter(item => item.id !== "translate" || view.plugin.settings.translateEnabled)
    .map(item => ({ ...item, cls: actions[item.id][0], icon: actions[item.id][1], label: qiaomuReaderTranslate(actions[item.id][2]), run: actions[item.id][3] }));
}
function addBarButtons(view, pop) {
  const row = pop.createDiv("qiaomu-reader-hl-actions");
  row.setAttribute("role", "toolbar");
  row.setAttribute("aria-label", qiaomuReaderTranslate("selection-actions"));
  const button = (parent, cls, icon, label, run, compact = false) => {
    const btn = parent.createEl("button", { cls: "qiaomu-reader-selection-action " + cls, attr: { type: "button", "aria-label": label } });
    setIcon(btn, icon);
    if (!compact && view.plugin.settings.selectionShowLabels === true) btn.createSpan({ cls: "qiaomu-reader-selection-label", text: label });
    btn.addEventListener("click", run);
    return btn;
  };
  for (const action of selectionActions(view).filter(item => item.visible)) {
    const parent = action.id === "highlight" ? row.createDiv("qiaomu-reader-highlight-split") : row;
    button(parent, action.cls, action.icon, action.label, action.run);
    if (action.id === "highlight") {
      const colors = button(parent, "qiaomu-reader-hl-colors", "chevron-down", qiaomuReaderTranslate("highlight-colors"), () => toggleSelectionColorDropdown(view), true);
      colors.setAttribute("aria-expanded", "false");
    }
  }
  const more = button(row, "qiaomu-reader-hl-menu", "ellipsis", qiaomuReaderTranslate("more"), (event) => openSelectionMoreMenu(view, event), true);
  more.setAttribute("aria-haspopup", "menu");
  row.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...row.querySelectorAll("button")];
    const i = buttons.indexOf(event.target);
    if (i < 0) return;
    event.preventDefault();
    buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (i + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length].focus();
  });
  row.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); view._hideHlPopup(); }
  });
}

addBarButtons(view,pop);const context=event=>{event.preventDefault();openSelectionMoreMenu(view,event,true);};pop.addEventListener('contextmenu',context);return()=>{pop.removeEventListener('contextmenu',context);pop.replaceChildren();};
}
