import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeChatBridge } from '../src/client/native-chat.js';
test('native prompt preserves typed draft, attachments and busy input; submits only empty plain composer', async () => {
  let state = { phase: 'plain', draft: 'my private draft', attachmentIds: [] }, submits = 0;
  const input = { getSnapshot: () => state, subscribe: () => () => {} };
  const bridge = nativeChatBridge({ inject: (_, ready) => ready({
    uiWorkspace: { workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'w' }] }) } } },
    sessions: { create: async () => 's', retain: () => ({ release() {} }) },
    uiSession: { bindingSource: () => ({ value: { hooks: { input }, props: { inputActions: { setDraft: draft => { state = { ...state, draft }; }, submit: () => { submits++; } } } } }) },
  }) });
  const chat = await bridge.openChat({ workspaceId: 'w' });
  await assert.rejects(chat.submitPrompt('Summarize'), /草稿/); assert.equal(state.draft, 'my private draft');
  state = { phase: 'plain', draft: '', attachmentIds: ['file'] };
  await assert.rejects(chat.submitPrompt('Summarize'), /附件/); assert.equal(state.draft, '');
  state = { phase: 'sending', draft: '', attachmentIds: [] };
  await assert.rejects(chat.submitPrompt('Summarize'), /处理/);
  state = { phase: 'plain', draft: '', attachmentIds: [] };
  await chat.submitPrompt('Summarize'); assert.equal(state.draft, 'Summarize'); assert.equal(submits, 1);
});
