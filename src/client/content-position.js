// Text anchors survive font/viewport changes and highlight wrappers. Geometry is used only
// to capture the visible character; persisted positions contain no layout coordinates.
const visible=(rect,box)=>rect.width>0&&rect.height>0&&rect.right>box.left+1&&rect.left<box.right-1&&rect.bottom>box.top+1&&rect.top<box.bottom-1;
function nodesOf(root){const walker=root.ownerDocument.createTreeWalker(root,4);const nodes=[];let node;while((node=walker.nextNode()))nodes.push(node);return nodes;}
export function captureContentAnchor(root,viewport){
 if(!root||!viewport)return null;const box=viewport.getBoundingClientRect();if(!box.width||!box.height)return null;
 const nodes=nodesOf(root);let offset=0;
 for(const node of nodes){const value=node.nodeValue||'';if(!value.length)continue;const range=root.ownerDocument.createRange();range.selectNodeContents(node);
  if([...range.getClientRects()].some(rect=>visible(rect,box))){let low=1,high=value.length;while(low<high){const middle=Math.floor((low+high)/2);range.setEnd(node,middle);if([...range.getClientRects()].some(rect=>visible(rect,box)))high=middle;else low=middle+1;}
   const at=offset+low-1,text=root.textContent||'';return{offset:at,quote:text.slice(at,at+120),prefix:text.slice(Math.max(0,at-40),at)};}
  offset+=value.length;
 }
 return null;
}
export function resolveContentAnchor(root,anchor){
 if(!root||!anchor||!Number.isFinite(anchor.offset))return null;const text=root.textContent||'';if(!text)return null;let offset=Math.max(0,Math.min(text.length-1,anchor.offset));
 if(anchor.quote&&text.slice(offset,offset+anchor.quote.length)!==anchor.quote){const matches=[];let at=text.indexOf(anchor.quote);while(at>=0){matches.push(at);at=text.indexOf(anchor.quote,at+1);}matches.sort((a,b)=>{const score=p=>(anchor.prefix&&text.slice(Math.max(0,p-anchor.prefix.length),p)===anchor.prefix?-text.length:0)+Math.abs(p-anchor.offset);return score(a)-score(b);});if(matches.length)offset=matches[0];}
 let passed=0;for(const node of nodesOf(root)){const length=node.nodeValue?.length||0;if(offset<passed+length){const range=root.ownerDocument.createRange();range.setStart(node,offset-passed);range.setEnd(node,Math.min(length,offset-passed+1));return range;}passed+=length;}return null;
}
export function printedPageAt(engine,chapterIndex,root,anchor){
 if(!root||!anchor)return '';const list=[];const visit=pages=>{for(const page of pages||[]){if(page.href)list.push(page);visit(page.children||page.subitems);}};visit(engine.book?.pageList);
 const href=engine.book?.chapters?.[chapterIndex]?.href;let current='';for(const page of list){const [file,hash]=page.href.split('#');const index=engine.book.chapters.findIndex(c=>c.href===file);if(index<0||index>chapterIndex)continue;if(index<chapterIndex){current=page.href;continue;}let id=hash;try{id=decodeURIComponent(hash||'');}catch{}const node=id?[...root.querySelectorAll('[id]')].find(el=>el.id===id):root;if(!node)continue;const range=root.ownerDocument.createRange();range.selectNodeContents(root);if(node!==root)range.setEndBefore(node);else range.setEnd(root,0);if(range.toString().length<=anchor.offset)current=page.href;}
 return current;
}
