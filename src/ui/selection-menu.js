import {mountOriginalSelection} from '../original/selection-ui.js';
import {enhance} from '../client/native-ui.js';
import {positionLink} from '../core/backlink.js';
/**
 * 选中文字后的小工具条：四色划线 / 复制 / 写批注 / 取消。
 * 用 getBoundingClientRect() 的坐标定位（position: fixed），超出视口自动翻转/收拢。
 */
import * as React from 'react';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_LABELS, highlightPaint } from './theme.js';
import { IconClose, IconCopy, IconHighlight, IconNote, IconSparkles, IconLanguages, IconAudio } from './icons.js';

const h = React.createElement;

/**
 * 计算工具条位置（考虑视口翻转与左右收拢）。
 * @param {{top:number,left:number,width:number,height:number,bottom:number}} anchor 选区的视口坐标
 * @param {{width:number,height:number}} [size] 工具条自身尺寸
 * @returns {{left:number,top:number}}
 */
export function computeMenuPosition(anchor, size) {
  const width = Math.max(80, (size && size.width) || 250);
  const height = Math.max(28, (size && size.height) || 42);
  const viewportWidth = (typeof window !== 'undefined' && window.innerWidth) || 1280;
  const viewportHeight = (typeof window !== 'undefined' && window.innerHeight) || 800;
  const center = (anchor.left || 0) + (anchor.width || 0) / 2;
  let left = center - width / 2;
  left = Math.min(Math.max(8, left), Math.max(8, viewportWidth - width - 8));
  let top = (anchor.top || 0) - height - 10;
  if (top < 8) top = (anchor.bottom || anchor.top || 0) + 10;
  if (top + height > viewportHeight - 8) top = Math.max(8, (anchor.top || 0) - height - 10);
  return { left, top };
}

/**
 * 选中小工具条。
 * @param {object} props
 * @param {object} props.ui 控制器
 * @param {{text:string,anchor:object,chapterHref:string,percent:number}} props.selection 选区信息
 * @param {(color:string)=>void} props.onHighlight 划线
 * @param {()=>void} props.onNote 写批注
 * @returns {React.ReactElement|null}
 */
export function SelectionMenu({ui,selection,onHighlight,onNote,onAsk,onLookup,onRead}) {
 const elementRef=React.useRef(null),[position,setPosition]=React.useState(()=>computeMenuPosition(selection.anchor));
 const bookId=ui.useSel(state=>state.bookId),lookupEnabled=ui.useSel(state=>state.lookupEnabled)!==false;
 const settings=ui.settingsOf(bookId);const config=JSON.stringify([settings.selectionActions,settings.selectionShowLabels,lookupEnabled]);
 React.useLayoutEffect(()=>{const el=elementRef.current;if(!el)return;const t=key=>key==='speech.selected'?ui.t('speech.selected','朗读选中内容'):ui.props().features.t(key);
  const link=()=>positionLink(bookId,selection.chapterHref,selection.text,selection.textOffset);
  const dispose=mountOriginalSelection(enhance(el),{t,settings:{...settings,translateEnabled:lookupEnabled},selection,colors:HIGHLIGHT_COLORS.map(id=>({id,label:()=>HIGHLIGHT_COLOR_LABELS[id],css:highlightPaint(settings.theme,id)})),close:()=>ui.clearSelection(),actions:{highlight:onHighlight,comment:onNote,ai:onAsk,translate:onLookup,copy:()=>ui.copy(selection.text),read:onRead,quote:()=>ui.copy('> '+selection.text.replace(/\n/g,'\n> ')+'\n\n['+ui.bookOf(bookId)?.title+']('+link()+')'),link:()=>ui.copy(link()),note:()=>void ui.props().features.call('translation.note',{bookId,target:'new',source:'',text:'> '+selection.text.replace(/\n/g,'\n> ')+'\n\n[↩]('+link()+')'}).then(()=>ui.toast(t('saved'))).catch(error=>ui.toast(error.message,'warn'))}});
  setPosition(computeMenuPosition(selection.anchor,{width:el.offsetWidth,height:el.offsetHeight}));return dispose;
 },[ui,selection,config,onHighlight,onNote,onAsk,onLookup,onRead]);
 return h('div',{ref:elementRef,className:'qiaomu-reader-hl-popup qiaomu-reader-hl-popup-on',style:{position:'fixed',left:position.left,top:position.top,zIndex:1500},onMouseDown:event=>event.preventDefault()});
}

/** 供阅读器复用的划线图标按钮（保持图标一致） */
export const HighlightActionIcon = IconHighlight;
