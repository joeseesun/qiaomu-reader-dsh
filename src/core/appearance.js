const oneOf=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const bounded=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
export function normalizeAppearance(settings={}) {
  return {...settings,fontSize:Math.round(bounded(settings.fontSize,12,32,18)),
    textAlign:oneOf(settings.textAlign,['left','justify','center','right'],settings.justify===false?'left':'justify'),
    maxLineCh:Math.round(bounded(settings.maxLineCh,0,120,0)),
    vAlign:oneOf(settings.vAlign,['top','center','bottom'],'top'),
    navMode:oneOf(settings.navMode,['buttons','click'],'buttons'),
    pageButtonsVisibility:oneOf(settings.pageButtonsVisibility,['hover','always','hidden'],'hover'),
    immersive:settings.immersive!==false,einkMode:settings.einkMode===true,pageTurnAnimation:settings.pageTurnAnimation!==false};
}
/** Space beneath the visible columns of a short paginated page. */
export function verticalPageOffset(height,deepest,align='top') {
  const gap=Math.max(0,height-deepest);
  return align==='top'||deepest<=0||gap<height*0.08?0:align==='center'?gap/2:gap;
}
