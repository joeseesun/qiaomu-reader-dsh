import {FuzzySuggestModal} from '../client/native-ui.js';
export function openBookNotePicker(t,files,onChoose){const qiaomuReaderTranslate=t;
const BookNotePicker = class extends FuzzySuggestModal {
  constructor(app, files, onChoose) {
    super(app);
    this._files = files;
    this._onChoose = onChoose;
    this.setPlaceholder(qiaomuReaderTranslate("book-note-for-links-start-typing-a-name"));
  }
  getItems() {
    return this._files;
  }
  getItemText(f) {
    return f.basename;
  }
  onChooseItem(f) {
    this._onChoose(f);
  }
};
const modal=new BookNotePicker({},files,onChoose);modal.open();return modal;
}
