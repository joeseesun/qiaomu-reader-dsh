const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export async function sendAnkiEntry(book, entry, request = globalThis.fetch) {
  const invoke = async (action, params) => {
    let response;
    try { response = await request('http://127.0.0.1:8765', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }), signal: AbortSignal.timeout(5000), redirect: 'error' }); }
    catch { throw new Error('无法连接 AnkiConnect，请打开 Anki 并启用 AnkiConnect（端口 8765）'); }
    if (!response.ok) throw new Error(`AnkiConnect HTTP ${response.status}`);
    const value = await response.json();
    if (value.error) throw new Error(String(value.error));
    return value.result;
  };
  const tag = `qmr_${book.id}_${entry.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const existing = await invoke('findNotes', { query: `tag:${tag}` });
  if (Array.isArray(existing) && existing.length) return { noteId: existing[0], duplicate: true };
  const noteId = await invoke('addNote', { note: { deckName: 'Default', modelName: 'Basic',
    fields: { Front: escape(entry.term), Back: `${escape(entry.meaning)}<br><blockquote>${escape(entry.context)}</blockquote><small>${escape(book.title)}</small>` },
    options: { allowDuplicate: false }, tags: ['QiaomuReader', tag] } });
  if (!Number.isFinite(noteId)) throw new Error('Anki 未返回笔记编号');
  return { noteId, duplicate: false };
}
