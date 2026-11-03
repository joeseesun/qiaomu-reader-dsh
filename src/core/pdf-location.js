const unit = n => Math.min(1,Math.max(0,n));
export function normalizePdfPoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return {x:unit(point.x),y:unit(point.y),
    ...(Number.isFinite(point.viewportX)?{viewportX:unit(point.viewportX)}:{}),
    ...(Number.isFinite(point.viewportY)?{viewportY:unit(point.viewportY)}:{})};
}
export function capturePdfPoint(sheet, viewport, textRects = []) {
  if (!(sheet?.width > 0 && sheet?.height > 0 && viewport?.width > 0 && viewport?.height > 0)) return null;
  const text = textRects.find(r=>r.bottom>viewport.top&&r.top<viewport.bottom&&r.right>viewport.left&&r.left<viewport.right);
  const x = text ? Math.max(viewport.left+8,text.left) : viewport.left+viewport.width/2;
  const y = text ? Math.max(viewport.top+8,text.top) : viewport.top+viewport.height/2;
  return normalizePdfPoint({x:(x-sheet.left)/sheet.width,y:(y-sheet.top)/sheet.height,
    viewportX:(x-viewport.left)/viewport.width,viewportY:(y-viewport.top)/viewport.height});
}
export function pdfPointScrollDelta(point, sheet, viewport) {
  const p = normalizePdfPoint(point);
  if (!p) return null;
  return {left:sheet.left+p.x*sheet.width-viewport.left-(p.viewportX||0)*viewport.width,
    top:sheet.top+p.y*sheet.height-viewport.top-(p.viewportY||0)*viewport.height};
}
