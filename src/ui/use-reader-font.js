import * as React from 'react';
import {loadReaderFont} from '../client/reader-fonts.js';
export function useReaderFont(ui,bookId,key,scope='book'){
 const retry=ui.useSel(state=>state.fontRetry||0),host=ui.props().data?.getHost();
 React.useEffect(()=>{
  let active=true;
  const status=value=>ui.store.set({fontStatuses:{...ui.store.get().fontStatuses,[key]:value}});
  status({loading:key==='zhuque'||key?.startsWith('imported:'),error:null});
  loadReaderFont(host,key).then(loaded=>{
   const selected=scope==='book'?ui.settingsOf(bookId).fontFamily:ui.store.get().companionAppearance?.fontFamily;
   if(!active||ui.store.get().bookId!==bookId||selected!==key)return;
   status({loading:false,error:null});const state=ui.store.get();
   if(loaded){const anchor=ui.stateOr(bookId).locator;ui.store.set({fontVersion:(state.fontVersion||0)+1,...(scope==='book'?{restoreAnchor:anchor,restoreScroll:anchor.scroll,jumpToken:(state.jumpToken||0)+1}:{})});}
  },cause=>{if(active)status({loading:false,error:cause.message});});
  return()=>{active=false;};
 },[ui,bookId,key,retry,host,scope]);
}
