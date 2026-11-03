/** Stable text locations, separate from layout-dependent screen pages. */
export const READING_LOCATION_SIZE=1500;
export function flattenPageList(items=[]) {return Array.isArray(items)?items.flatMap(item=>[...(typeof item?.href==='string'&&String(item.label||'').trim()?[{label:String(item.label).trim(),href:item.href}]:[]),...flattenPageList(item?.children||item?.subitems||[])]):[];}
const models=new WeakMap();
export function readingPositionModel(engine) {
  if(!engine||typeof engine.chapterCount!=='function')return Promise.reject(Error('Reading engine unavailable'));
  if(models.has(engine))return models.get(engine);
  const promise=(async()=>{
    const count=engine.chapterCount(),pages=flattenPageList(engine.book?.pageList);
    if(engine.book?.format==='pdf')return {kind:'page',total:count,chapterCount:count,pages:[],size:count,lengths:Array(count).fill(1),starts:Array.from({length:count},(_,i)=>i)};
    const lengths=[],starts=[];let size=0;
    for(let index=0;index<count;index++){starts.push(size);const text=String(await engine.plainTextOf(index)).replace(/\s+/g,' ').trim();lengths.push(text.length);size+=text.length;if(index%16===15)await new Promise(resolve=>setTimeout(resolve,0));}
    if(!size&&!pages.length)return {kind:'page',total:count,chapterCount:count,pages:[],size:count,lengths:Array(count).fill(1),starts:Array.from({length:count},(_,i)=>i)};
    return {kind:pages.length?'original':'location',pages,size,lengths,starts,chapterCount:count,total:pages.length||Math.max(1,Math.ceil(size/READING_LOCATION_SIZE))};
  })();models.set(engine,promise);void promise.catch(()=>models.delete(engine));return promise;
}
export function positionForLocator(model,locator={}) {
  const chapter=Math.max(0,Math.min(model.chapterCount-1,Math.floor(Number(locator.chapterIndex)||0)));
  if(model.kind==='page')return {current:chapter+1,total:model.total,kind:'page'};
  const offset=Number.isFinite(locator.textOffset)?locator.textOffset:Math.round((model.lengths[chapter]||0)*Math.min(1,Math.max(0,Number(locator.scroll)||0)));
  const absolute=Math.min(model.size,Math.max(0,(model.starts[chapter]||0)+Math.max(0,offset)));
  const location=Math.min(Math.max(1,Math.ceil(model.size/READING_LOCATION_SIZE)),Math.floor(absolute/READING_LOCATION_SIZE)+1);
  if(model.kind==='original')return {kind:'original',current:locator.originalPage||'',total:model.total,location};
  return {kind:'location',current:location,total:Math.max(1,Math.ceil(model.size/READING_LOCATION_SIZE))};
}
export function parseReadingPosition(raw,model,mode=model.kind) {
  const value=String(raw||'').trim();
  if(mode==='percent'||value.endsWith('%')){const text=value.replace(/%$/,'');const number=Number(text);return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)&&number>=0&&number<=100?{fraction:number/100}:null;}
  if(mode==='original'){const matches=model.pages.filter(p=>p.label.toLocaleLowerCase()===value.toLocaleLowerCase());return matches.length===1?{href:matches[0].href}:null;}
  if(!/^\d+$/.test(value))return null;const number=Number(value),total=mode==='page'?model.chapterCount:Math.max(1,Math.ceil(model.size/READING_LOCATION_SIZE));if(!Number.isSafeInteger(number)||number<1||number>total)return null;
  if(mode==='page')return {chapterIndex:number-1,scroll:0};
  const absolute=(number-1)*READING_LOCATION_SIZE;let chapter=model.chapterCount-1;
  for(let index=0;index<model.chapterCount;index++)if(absolute<(model.starts[index]||0)+(model.lengths[index]||0)){chapter=index;break;}
  const offset=Math.max(0,absolute-(model.starts[chapter]||0));return {chapterIndex:chapter,textOffset:offset,scroll:model.lengths[chapter]?offset/model.lengths[chapter]:0};
}
