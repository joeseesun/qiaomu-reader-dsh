import * as React from 'react';
import { IconClose, IconTrash } from './icons.js';
import { readQuickPrompts, saveQuickPrompts, resetQuickPrompts, defaultQuickPrompts } from './quick-prompts.js';

const h = React.createElement;

export function PromptManager({ ui, onClose }) {
  const t = (key, fallback) => ui.t(`prompts.${key}`, fallback);
  const language = t('language', 'zh');
  const [items, setItems] = React.useState(() => readQuickPrompts(language));
  const [error, setError] = React.useState('');
  const dialog = React.useRef(null);
  React.useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const nodes = [...dialog.current.querySelectorAll('button:not(:disabled), input, textarea')];
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const persist = next => {
    try { saveQuickPrompts(next); setItems(next); setError(''); return true; }
    catch { setError(t('failed', '保存失败，修改已保留，请重试')); return false; }
  };
  React.useEffect(() => { setItems(readQuickPrompts(language)); }, [language]);
  const [editing, setEditing] = React.useState(null);
  const save = (event) => {
    event.preventDefault();
    const title = editing.title.trim();
    const body = editing.body.trim();
    if (!title || !body) return;
    const next = editing.id ? items.map((item) => item.id === editing.id ? { id: item.id, title, body } : item)
      : [...items, { id: crypto.randomUUID(), title, body }];
    if (persist(next)) setEditing(null);
  };
  return h('div', { className: 'qmr-prompt-backdrop', onClick: onClose },
    h('section', { className: 'qmr-prompt-dialog', ref: dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': t('manage', '管理快捷提示词'), onClick: (event) => event.stopPropagation(), onKeyDown: keyDown },
      h('header', null, h('strong', null, t('title', '快捷提示词')), h('button', { type: 'button', className: 'qmr-icon-btn', 'aria-label': t('close', '关闭'), onClick: onClose }, h(IconClose, { width: 16, height: 16 }))),
      h('p', null, t('hint', '显示在伴读输入框上方。点击后直接发送；已有手写草稿时会保留草稿。')),
      error ? h('p', { role: 'alert' }, error) : null,
      h('button', { type: 'button', className: 'qmr-btn', onClick: () => { try { resetQuickPrompts(); setItems(defaultQuickPrompts(language)); setEditing(null); setError(''); } catch { setError(t('failed', '保存失败，修改已保留，请重试')); } } }, t('reset', '恢复内置')),
      h('div', { className: 'qmr-prompt-list' }, items.map((item) => h('div', { className: 'qmr-prompt-row', key: item.id },
        h('div', null, h('strong', null, item.title), h('span', null, item.body)),
        h('button', { type: 'button', 'aria-label': `${t('edit', '编辑')} ${item.title}`, onClick: () => setEditing(item) }, t('edit', '编辑')),
        h('button', { type: 'button', 'aria-label': `${t('delete', '删除')} ${item.title}`, onClick: () => { const next = items.filter((prompt) => prompt.id !== item.id); persist(next); } }, h(IconTrash, { width: 15, height: 15 }))))),
      editing ? h('form', { className: 'qmr-prompt-editor', onSubmit: save },
        h('label', null, t('name', '名称'), h('input', { autoFocus: true, maxLength: 60, value: editing.title, onChange: (event) => setEditing({ ...editing, title: event.target.value }) })),
        h('label', null, t('body', '提示词'), h('textarea', { rows: 5, maxLength: 5000, value: editing.body, onChange: (event) => setEditing({ ...editing, body: event.target.value }) })),
        h('div', null, h('button', { type: 'button', onClick: () => setEditing(null) }, t('cancel', '取消')), h('button', { type: 'submit', disabled: !editing.title.trim() || !editing.body.trim() }, t('save', '保存')))) :
        h('button', { type: 'button', className: 'qmr-prompt-new', disabled: items.length >= 20, onClick: () => setEditing({ title: '', body: '' }) }, t('add', '+ 新增提示词'))));
}
