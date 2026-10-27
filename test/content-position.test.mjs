import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {captureContentAnchor,resolveContentAnchor,printedPageAt} from '../src/client/content-position.js';
import {readerPosition} from '../src/client/position.js';
test('visible text capture and restoration survive inserted highlight wrappers and changed text before a repeated quote',()=>{
 const dom=new JSDOM('<main><p>前文。</p><p>重复内容。现在开始阅读这一段文字。</p><p>重复内容。现在开始阅读这一段文字。</p></main>');const doc=dom.window.document,root=doc.querySelector('main');const box={left:0,right:400,top:100,bottom:200,width:400,height:100};
 const proto=dom.window.Range.prototype;proto.getClientRects=function(){const p=this.startContainer.parentElement;const top=p===root.children[0]?0:p===root.children[1]?100:300;return[{...box,top,bottom:top+20,height:20,width:this.endOffset>5?100:0}];};
 try{const anchor=captureContentAnchor(root,{getBoundingClientRect:()=>box});assert.equal(anchor.offset,8);assert.ok(anchor.quote.startsWith('现在开始'));root.children[1].innerHTML='重复内容。<mark>现在开始阅读</mark>这一段文字。';let range=resolveContentAnchor(root,anchor);assert.equal(range.toString(),'现');root.children[0].textContent='比之前更长的前文。';range=resolveContentAnchor(root,anchor);assert.equal(range.startContainer.parentElement.tagName,'MARK');assert.equal(range.toString(),'现');}finally{dom.window.close();}
});
test('printed page follows the visible page anchor within a chapter and retains previous printed page between anchors',()=>{
 const dom=new JSDOM('<main><p id="p1">第一页的内容。</p><p id="p2">第二页的内容。</p></main>'),root=dom.window.document.querySelector('main');const engine={book:{chapters:[{href:'a',size:3000},{href:'b',size:1000}],pageList:[{href:'a#p1',label:'i'},{href:'a#p2',label:'1'},{href:'b#p3',label:'2'}]},chapterCount:()=>2};
 try{assert.equal(printedPageAt(engine,0,root,{offset:1}),'a#p1');const href=printedPageAt(engine,0,root,{offset:8});assert.equal(href,'a#p2');assert.equal(readerPosition(engine,0,.5,href).current,'1');assert.equal(printedPageAt(engine,1,root,{offset:0}),'a#p2');}finally{dom.window.close();}
});
