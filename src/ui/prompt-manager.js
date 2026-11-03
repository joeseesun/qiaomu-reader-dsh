import * as React from 'react';
import { IconClose, IconTrash, IconPlus } from './icons.js';
import { readQuickPrompts, saveQuickPrompts, resetQuickPrompts, defaultQuickPrompts } from './quick-prompts.js';
import { useDialogFocus } from './dialog-focus.js';
const h = React.createElement;
/** Original Reader's one-draft editor: no edits reach the quick bar until Save succeeds. */
export function PromptManager({ ui, onClose }) {
  const t = (key, fallback) => ui.t(`prompts.${key}`, fallback);
  const language = t('language', 'zh');
  const [items, setItems] = React.useState(() => readQuickPrompts(language));
  const [error, setError] = React.useState('');
  const [restored, setRestored] = React.useState(false);
  const dirty = React.useRef(false), dialog = React.useRef(null), pendingFocus = React.useRef(null);
  const keyDown = useDialogFocus(dialog, onClose);
  React.useEffect(() => { if (!dirty.current) setItems(readQuickPrompts(language)); }, [language]);
  React.useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    dialog.current?.querySelector(`[data-prompt-id="${pendingFocus.current}"] input`)?.focus();
    pendingFocus.current = null;
  }, [items.length]);
  const change = (id, field, value) => { dirty.current = true; setRestored(false); setItems(previous => previous.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const add = () => {
    if (items.length >= 20) return;
    const id = crypto.randomUUID(); pendingFocus.current = id; dirty.current = true; setRestored(false);
    setItems(previous => [...previous, { id, title: '', body: '' }]);
  };
  const save = event => {
    event.preventDefault();
    if (items.some(item => !item.title.trim() || !item.body.trim())) { setError(t('required', '请填写每条提示词的名称和正文')); return; }
    try {
      if (restored) resetQuickPrompts();
      else saveQuickPrompts(items.map(item => ({ ...item, title: item.title.trim(), body: item.body.trim() })));
      onClose();
    } catch { setError(t('failed', '保存失败，修改已保留，请重试')); }
  };
  return h('div', { className: 'qmr-prompt-backdrop', onClick: event => { if (event.target === event.currentTarget) onClose(); } },
    h('section', { className: 'qmr-prompt-dialog', ref: dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': t('manage', '管理快捷提示词'), onKeyDown: keyDown },
      h('header', null, h('div', null, h('h2', null, t('manage', '管理快捷提示词')), h('p', null, t('editorHint', '名称显示在按钮上，完整提示词发送给 AI。'))), h('button', { type: 'button', className: 'qmr-icon-btn', 'aria-label': t('close', '关闭'), onClick: onClose }, h(IconClose, { width: 18, height: 18 }))),
      h('form', { className: 'qmr-prompt-editor', onSubmit: save },
        h('div', { className: 'qmr-prompt-list' },
          !items.length ? h('div', { className: 'qmr-prompt-empty' }, h('p', null, t('empty', '还没有快捷提示词。添加一条，或恢复内置提示词。'))) : null,
          items.map((item, index) => h('div', { className: 'qmr-prompt-item', key: item.id, 'data-prompt-id': item.id },
            h('label', null, h('span', null, t('name', '名称')), h('input', { 'data-autofocus': index === 0 ? true : undefined, maxLength: 60, value: item.title, onChange: event => change(item.id, 'title', event.target.value) })),
            h('label', null, h('span', null, t('body', '提示词')), h('textarea', { rows: 3, maxLength: 5000, value: item.body, onChange: event => change(item.id, 'body', event.target.value) })),
            h('button', { type: 'button', className: 'qmr-prompt-delete', 'aria-label': `${t('delete', '删除')} ${item.title || index + 1}`, onClick: () => { dirty.current = true; setRestored(false); setItems(previous => previous.filter(prompt => prompt.id !== item.id)); } }, h(IconTrash, { width: 14, height: 14 }), t('delete', '删除'))))),
        error ? h('div', { className: 'qmr-prompt-error', role: 'alert' }, error) : null,
        h('footer', { className: 'qmr-prompt-actions' },
          h('button', { type: 'button', disabled: items.length >= 20, onClick: add }, h(IconPlus, { width: 14, height: 14 }), t('add', '新增提示词')),
          h('button', { type: 'button', onClick: () => { dirty.current = true; setItems(defaultQuickPrompts(language)); setRestored(true); setError(''); } }, t('reset', '恢复内置')),
          h('div', { className: 'qmr-prompt-submit' }, h('button', { type: 'button', onClick: onClose }, t('cancel', '取消')), h('button', { type: 'submit', className: 'is-primary' }, t('save', '保存')))))));
}
