import {ENGINE_LOCATION_SIZE,enginePositionModel} from '../original/reader-position.js';
import {GoToPageModal} from '../original/position-modal.js';
const cache=new WeakMap();
export function positionData(engine){
 if(cache.has(engine))return cache.get(engine);const chapters=engine.book?.chapters||[];
 const sizes=chapters.map(c=>c.linear===false?0:Math.max(0,Number(c.size)||new TextEncoder().encode(c.xhtml||'').length));const starts=[];let size=0;for(const n of sizes){starts.push(size);size+=n;}
 const pages=list=>(list||[]).map(p=>({...p,subitems:pages(p.children||p.subitems)}));
 const value={sizes,starts,size,book:{pageList:pages(engine.book?.pageList),rendition:engine.book?.fixedLayout||engine.book?.format==='pdf'?{layout:'pre-paginated'}:{},sections:sizes.map(size=>({size}))}};cache.set(engine,value);return value;
}
export function readerPosition(engine,chapter,scroll=0,pageHref=""){
 const data=positionData(engine),at=(data.starts[chapter]||0)+(data.sizes[chapter]||0)*Math.max(0,Math.min(1,scroll));
 const fraction=data.size?at/data.size:chapter/Math.max(1,engine.chapterCount());
 const detail={fraction,location:{current:Math.floor(at/ENGINE_LOCATION_SIZE)},section:{current:chapter}};
 const model=enginePositionModel(detail,data.book,chapter);if(model.kind==='original'){const href=engine.book.chapters[chapter]?.href;model.current=model.pages.find(p=>p.href===pageHref)?.label||model.pages.find(p=>p.href.split('#')[0]===href)?.label||model.pages[0]?.label||'';}return model;
}
export function positionLocation(engine,fraction){const d=positionData(engine);if(!d.size){const at=Math.min(.999999,Math.max(0,fraction))*engine.chapterCount();return{chapterIndex:Math.floor(at),scroll:at%1};}const at=Math.max(0,Math.min(1,fraction))*d.size;let i=d.sizes.length-1;for(let n=0;n<d.sizes.length;n++)if(d.sizes[n]&&at<d.starts[n]+d.sizes[n]){i=n;break;}return{chapterIndex:i,scroll:d.sizes[i]?(at-d.starts[i])/d.sizes[i]:0};}
export function openReaderPosition(ui,engine,t){const state=ui.store.get(),bookId=state.bookId;const model=readerPosition(engine,state.chapterIndex,ui.stateOr(bookId).locator?.scroll||0,ui.stateOr(bookId).locator?.pageHref);const modal=new GoToPageModal({},model.total,model.current-1,async target=>{if(target.href)ui.goHref(target.href);else if(target.page)ui.goLocation({chapterIndex:target.page-1,scroll:0});else ui.goLocation(positionLocation(engine,target.fraction));},{position:model,t,isCurrent:()=>ui.store.get().bookId===bookId});modal.open();return modal;}
