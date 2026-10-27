import {mountOriginalLookup} from '../original/lookup-ui.js';
import {sentenceAround} from '../original/lookup.js';
import {createLookupActions} from '../client/lookup.js';
import * as React from 'react';
import { IconClose } from './icons.js';
import { downloadText } from './format.js';
import { vocabularyMarkdown } from '../core/vocabulary.js';
const h = React.createElement;

export function LookupCard({ui,selection,bookId,engine,chatApi,SessionProvider,renderSlot}){
 const root=React.useRef(null),body=React.useRef(null);const [chat,setChat]=React.useState(null);
 React.useEffect(()=>{let closed=false,lookup,actions;const node=root.current;const close=()=>ui.store.set({lookupSelection:null});
  const outside=e=>{if(!node.contains(e.target)&&!e.target.closest?.('.qmr-native-menu'))close();};const key=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
  const place=()=>{if(!node.isConnected)return;const rect=node.getBoundingClientRect(),anchor=selection.anchor||{};node.style.left=Math.max(8,Math.min(anchor.left||40,window.innerWidth-rect.width-8))+'px';node.style.top=Math.max(8,Math.min((anchor.bottom||60)+10,window.innerHeight-rect.height-8))+'px';};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('resize',place);
  const features=ui.props().features;
  (async()=>{try{const chapter=Math.max(0,engine.book.chapters.findIndex(c=>c.href===selection.chapterHref));const text=await engine.plainTextOf(chapter);const at=Math.max(0,selection.textOffset??text.indexOf(selection.text));const context=sentenceAround(text,at,at+selection.text.length);const settings=(await features.reload()).settings.lookup||{};if(closed)return;
   actions=createLookupActions({features,ui,bookId,selection,chatApi,onChat:value=>{if(!closed)setChat(value);}});
   lookup=mountOriginalLookup(body.current,{...actions,t:features.t,text:selection.text,context,bookFile:{basename:ui.bookOf(bookId)?.title||'',path:bookId},settings,target:settings.target||'zh-CN',engine:settings.engine||'google',aiReady:()=>!!chatApi?.defaultWorkspace?.(),copy:ui.copy,openVocabulary:()=>{close();ui.setPanel('vocabulary');},onLayout:place});place();
  }catch(error){if(!closed)body.current.textContent=error.message;}})();
  return()=>{closed=true;lookup?.dispose();actions?.dispose();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',place);};
 },[ui,selection,bookId,engine,chatApi]);
 return h('section',{ref:root,className:'qiaomu-reader-hl-popup qiaomu-reader-hl-popup-lookup qiaomu-reader-hl-popup-on qmr-native-tokens',role:'dialog','aria-label':ui.props().features.t('translation'),style:{position:'fixed',zIndex:80,maxHeight:'calc(100vh - 16px)',overflow:'auto'}},h('div',{ref:body}),chat&&SessionProvider&&renderSlot?h('div',{className:'qmr-lookup-chat'},h(SessionProvider,{session:chat.reference},renderSlot('qiaomu-reader.chat',{}))):null);
}

export function VocabularyPanel({ ui, bookId }) {
  const state = ui.useSel(s => s.states?.[bookId]);
  const entries = state?.vocabulary || [];
  const t = (key, fallback) => ui.t(`lookup.${key}`, fallback);
  return h('div', { className: 'qmr-panel-content' },
    h('div', { className: 'qmr-panel-head' }, h('strong', { className: 'qmr-panel-title' }, t('vocabulary', '生词本')),
      h('button', { className: 'qmr-icon-btn', 'aria-label': t('close', '关闭'), onClick: () => ui.setPanel(null) }, h(IconClose))),
    h('div', { className: 'qmr-panel-body qmr-feature-panel' },
      h('button', { className: 'qmr-btn', disabled: !entries.length, onClick: () => downloadText(vocabularyMarkdown(bookId, entries), `${ui.bookOf(bookId)?.title || 'Vocabulary'}-vocabulary.md`) }, t('export', '导出 Markdown')),
      !entries.length ? h('p', null, t('empty', '选中文字，点击查词后加入生词本。')) : null,
      entries.map(entry => h('article', { className: 'qmr-vocabulary-entry', key: entry.id }, h('strong', null, entry.term), h('p', null, entry.meaning), h('blockquote', null, entry.context),
        h('div', { className: 'qmr-feature-actions' },
          h('button', { className: 'qmr-btn', onClick: () => ui.focusHighlight(bookId, entry.highlightId) }, t('back', '回到原文')),
          h('button', { className: 'qmr-btn', onClick: async () => {
            try {
              const host = ui.props().data?.getHost();
              if (!host) throw new Error(t('unavailable', '宿主未连接'));
              const saved = await ui.flushState(bookId);
              if (saved?.ok === false) throw new Error(saved.error);
              await host.sendToAnki({ bookId, entryId: entry.id }); ui.toast(t('ankiSaved', '已发送到 Anki'), 'ok');
            }
            catch (cause) { ui.toast(cause?.message || String(cause), 'error'); }
          } }, t('anki', '发送到 Anki')))))));
}
