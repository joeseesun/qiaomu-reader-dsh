import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPdfContextCollector,PDF_CONTEXT_LIMIT} from '../src/core/pdf-context.js';
import {normalizeReadingMaterial} from '../src/core/reading-material.js';
import {parsePdfBook} from '../src/client/pdf-book.js';
import {navigationPdf} from './fixtures/pdf-fixtures.mjs';
test('PDF context preserves every text page below budget and reports scan pages without OCR',()=>{
 const c=createPdfContextCollector();c.add(1,'Beginning');c.add(2,'');c.add(3,'Ending');const d=c.finish(3);assert.equal(d.text,'[第 1 页]\nBeginning\n\n[第 3 页]\nEnding');assert.equal(d.truncated,false);assert.deepEqual(d.includedPages,[1,3]);assert.equal(d.textPages,2);assert.equal(d.totalPages,3);
 const empty=createPdfContextCollector().finish(4);assert.equal(empty.text,'');assert.equal(empty.truncated,false);
});
test('long PDF samples across the document including the final page within a strict character bound',()=>{
 const c=createPdfContextCollector();for(let i=1;i<=12;i++)c.add(i,`PAGE_${i}_`+'a'.repeat(30000));const d=c.finish(12);assert.equal(d.truncated,true);assert.ok(d.text.length<=PDF_CONTEXT_LIMIT);for(let i=1;i<=12;i++)assert.ok(d.text.includes(`PAGE_${i}_`));assert.equal(d.sourceChars,360087);
});
test('page-label overflow evenly samples pages rather than dropping the document tail',()=>{
 const c=createPdfContextCollector(1000);for(let i=1;i<=100;i++)c.add(i,'Evidence '+i+' '+'x'.repeat(80));const d=c.finish(100);assert.ok(d.text.length<=1000);assert.equal(d.includedPages[0],1);assert.equal(d.includedPages.at(-1),100);assert.ok(d.text.includes('Evidence 100'));assert.ok(d.includedPages.length<100);
});
test('Host retains PDF whole-document material separately from bounded current page and selection',()=>{
 const d=normalizeReadingMaterial({page:'p'.repeat(20000),selection:'s'.repeat(9000),document:'d'.repeat(200000),documentInfo:{format:'pdf',totalPages:3,textPages:3,includedPages:[3,1,1,0,9],truncated:true,ocr:true}});assert.equal(d.document.length,180000);assert.equal(d.page.length,12000);assert.equal(d.selection.length,6000);assert.deepEqual(d.documentInfo.includedPages,[1,3]);assert.equal(d.documentInfo.ocr,false);assert.equal(normalizeReadingMaterial({document:'unsupported',documentInfo:{format:'pdf',totalPages:10001}}).document,undefined);
});
test('actual PDF engine resolves named XYZ outline and annotation to a stable page coordinate',async()=>{
 const {engine}=await parsePdfBook(navigationPdf());try{const href=engine.book.toc[0].href;assert.match(href,/^pdf\/page-2#qmr-pdf-dest-/);assert.equal(engine.resolveLink(0,href).chapterIndex,1);const first=await engine.render(0);assert.ok(first.includes(`href="${href}"`));const second=await engine.render(1);assert.match(second,/left:42\.857/);assert.match(second,/top:85\.714/);assert.ok(second.includes(`id="${href.split('#')[1]}"`));const context=await engine.documentContext();assert.equal(context.totalPages,3);assert.ok(context.text.includes('LAST_PAGE_EVIDENCE'));assert.strictEqual(await engine.documentContext(),context);}finally{await engine.dispose();}
});
test('rotated PDF destination uses viewport coordinate conversion',async()=>{
 const {engine}=await parsePdfBook(navigationPdf({rotation:90}));try{const html=await engine.render(1);assert.match(html,/left:14\.285/);assert.match(html,/top:42\.857/);}finally{await engine.dispose();}
});
test('PDF whole-document extraction cancels without poisoning a later retry or surviving disposal',async()=>{
 const {engine}=await parsePdfBook(navigationPdf());const controller=new AbortController();const pending=engine.documentContext({signal:controller.signal});queueMicrotask(()=>controller.abort());await assert.rejects(pending,{name:'AbortError'});const data=await engine.documentContext();assert.equal(data.textPages,3);await engine.dispose();await assert.rejects(engine.documentContext(),{name:'AbortError'});
});
test('actual dense PDF extraction samples all twelve pages rather than silently truncating at the Host page limit',async()=>{
 const {engine}=await parsePdfBook(navigationPdf({texts:Array.from({length:12},(_,i)=>`PAGE_${i+1}_`+'word '.repeat(4000))}));try{const data=await engine.documentContext();assert.ok(data.sourceChars>180000);assert.ok(data.text.length<=180000);assert.equal(data.truncated,true);assert.equal(data.includedPages.length,12);assert.ok(data.text.includes('PAGE_12_'));assert.equal(normalizeReadingMaterial({document:data.text,documentInfo:{format:'pdf',...data}}).document,data.text);}finally{await engine.dispose();}
});

test('PDF reflow keeps visible lower text at its viewport position and uses the center for scans',async()=>{
 const {capturePdfPoint,pdfPointScrollDelta,normalizePdfPoint}=await import('../src/core/pdf-location.js');
 const viewport={left:0,top:56,right:532,bottom:852,width:532,height:796};
 const oldSheet={left:0,top:-227,width:532,height:1064};
 const point=capturePdfPoint(oldSheet,viewport,[{left:228,top:680,right:400,bottom:692}]);
 const newSheet={left:0,top:-227,width:732,height:1464};
 const delta=pdfPointScrollDelta(point,newSheet,{...viewport,width:732,right:732});
 assert.ok(Math.abs(newSheet.top+point.y*newSheet.height-delta.top-680)<0.01);
 const scan=capturePdfPoint(oldSheet,viewport,[]);assert.equal(scan.viewportY,0.5);assert.equal(scan.viewportX,0.5);
 assert.equal(normalizePdfPoint({x:NaN,y:2}),null);assert.equal(normalizePdfPoint({x:2,y:-1}).x,1);
});
