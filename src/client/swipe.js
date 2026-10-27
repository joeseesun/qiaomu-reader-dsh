// Original attachReaderSwipeNav thresholds and selection/zoom guards. Harness owns listener cleanup.
export function attachReaderSwipe(area,{turn,isPdfZoomed=()=>false,isEnabled=()=>true}){
 const view=area.ownerDocument.defaultView;let originX=0,originY=0,axis=null,holdTimer=null,longPress=false,hadSelection=false,disposed=false;
 const selection=()=>{const selected=view.getSelection();return !!(selected&&!selected.isCollapsed);};
 const cancel=()=>{view.clearTimeout(holdTimer);axis='v';};
 const start=event=>{view.clearTimeout(holdTimer);if(disposed||!isEnabled()||event.touches.length!==1||isPdfZoomed()||event.target.closest?.('input,textarea,button,select,[contenteditable=true]')){axis='v';return;}originX=event.touches[0].clientX;originY=event.touches[0].clientY;axis=null;longPress=false;hadSelection=selection();holdTimer=view.setTimeout(()=>{longPress=true;},350);};
 const move=event=>{if(event.touches.length!==1){cancel();return;}if(axis!==null){if(axis==='h')event.preventDefault();return;}const dx=Math.abs(event.touches[0].clientX-originX),dy=Math.abs(event.touches[0].clientY-originY);if(Math.max(dx,dy)<8)return;view.clearTimeout(holdTimer);if(longPress||hadSelection||selection()){axis='v';return;}axis=dx>dy?'h':'v';if(axis==='h')event.preventDefault();};
 const end=event=>{view.clearTimeout(holdTimer);if(axis!=='h'||!event.changedTouches.length||!isEnabled()||selection()||isPdfZoomed()){axis=null;return;}const travel=event.changedTouches[0].clientX-originX;axis=null;if(Math.abs(travel)>44)turn(travel<0?1:-1);};
 area.addEventListener('touchstart',start,{passive:true});area.addEventListener('touchmove',move,{passive:false});area.addEventListener('touchend',end,{passive:true});area.addEventListener('touchcancel',cancel,{passive:true});return()=>{disposed=true;cancel();area.removeEventListener('touchstart',start);area.removeEventListener('touchmove',move);area.removeEventListener('touchend',end);area.removeEventListener('touchcancel',cancel);};
}
