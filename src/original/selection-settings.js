import {Modal,Setting} from '../client/native-ui.js';
import {selectionActionPreferences} from './selection-preferences.js';
export function openSelectionSettings(ui){const id=ui.store.get().bookId,settings=structuredClone(ui.settingsOf(id)),qiaomuReaderTranslate=ui.props().features.t;const plugin={settings,async saveAll(){ui.updateSettings(id,{selectionActions:settings.selectionActions,selectionShowLabels:settings.selectionShowLabels});const r=await ui.flushState(id);if(r?.ok===false)throw Error(r.error);}};
  function renderSettings(host) {
    const s = plugin.settings, t = qiaomuReaderTranslate;
    const render = () => {
      host.empty();
      new Setting(host).setName(t("selection-show-labels"))
        .addToggle(toggle => toggle.setValue(s.selectionShowLabels === true).onChange(async value => {
          s.selectionShowLabels = value; await plugin.saveAll();
        }));
      host.createEl("p", { cls: "qiaomu-reader-set-note", text: t("selection-hidden-in-more") });
      const items = selectionActionPreferences(s.selectionActions);
      const labels = { highlight: "highlight-action", comment: "annotate-action", ai: "ask-ai-action", translate: "translate", copy: "copy" };
      const save = async (focus) => {
        s.selectionActions = items; await plugin.saveAll(); render();
        if (focus) host.querySelector(focus)?.focus();
      };
      items.forEach((item, index) => {
        const row = new Setting(host).setName(t(labels[item.id]));
        for (const [direction, delta, icon] of [["up", -1, "arrow-up"], ["down", 1, "arrow-down"]]) {
          row.addButton(button => {
            button.setIcon(icon).setDisabled(index + delta < 0 || index + delta >= items.length);
            button.buttonEl.setAttribute("aria-label", t(direction === "up" ? "selection-move-up" : "selection-move-down"));
            button.buttonEl.dataset.selectionMove = item.id + "-" + direction;
            button.onClick(async () => {
              [items[index], items[index + delta]] = [items[index + delta], items[index]];
              await save(`[data-selection-move="${item.id}-${direction}"]`);
            });
          });
        }
        row.addToggle(toggle => {
          toggle.toggleEl.dataset.selectionVisible = item.id;
          toggle.setValue(item.visible).onChange(async value => {
            item.visible = value; await save(`[data-selection-visible="${item.id}"]`);
          });
        });
      });
      new Setting(host).addButton(button => button.setButtonText(t("restore-defaults")).onClick(async () => {
        s.selectionActions = null; s.selectionShowLabels = false; await plugin.saveAll(); render();
      }));
    };
    render();
  }

class Preferences extends Modal{onOpen(){this.setTitle(qiaomuReaderTranslate('selection-toolbar'));renderSettings(this.contentEl);}}const modal=new Preferences({});modal.open();return modal;}
