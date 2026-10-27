import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {parseExtendedBook} from '../src/client/extended-book.js';
import {convert,epubFixture} from './helpers/kindle-converter-fixture.mjs';
import {createKindleConverter} from '../src/original/kindle-converter.js';
import {kindleDefines} from '../scripts/kindle-build.mjs';
const dom=new JSDOM();Object.assign(globalThis,{document:dom.window.document,DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer,CSS:{escape:value=>String(value).replace(/[^\w-]/g,c=>`\\${c}`)}});
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V8AAAAASUVORK5CYII=';
const fb2=`<?xml version="1.0" encoding="UTF-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><genre>prose</genre><author><first-name>中文</first-name><last-name>作者</last-name></author><book-title>格式迁移验收</book-title><lang>zh</lang><coverpage><image l:href="#cover"/></coverpage></title-info></description><body><section id="first"><title><p>第一章</p></title><p>中文正文与脚注<a l:href="#note">注释</a></p><image l:href="#cover"/></section><section id="second"><title><p>第二章</p></title><p>第二章内容</p></section></body><body name="notes"><section id="note"><p>注释正文<a l:href="#first">返回</a></p></section></body><binary id="cover" content-type="image/png">${png}</binary></FictionBook>`;
for(const format of ['fb2','fbz'])test(`${format} preserves Chinese metadata, images, nested notes and reading/search contract`,async()=>{
 let bytes=new TextEncoder().encode(fb2);if(format==='fbz'){const z=new JSZip();z.file('book.fb2',bytes);bytes=await z.generateAsync({type:'uint8array'});}
 const record=await parseExtendedBook(bytes,`test.${format}`,format);try{
  assert.equal(record.book.title,'格式迁移验收');assert.match(record.book.author,/中文/);assert.ok(record.engine.chapterCount()>=3);
  const html=await record.engine.render(0);assert.match(html,/中文正文/);assert.match(html,/<img[^>]*src="(?:blob:|data:image)/);assert.match(html,/href="flow\/section-3.xhtml#note"/);assert.match(await record.engine.plainTextOf(2),/注释正文/);assert.ok((await record.engine.search('第二章内容')).length);
  const url=html.match(/src="((?:blob:|data:image)[^"]+)"/)[1];assert.equal((await (await fetch(url)).arrayBuffer()).byteLength,Buffer.from(png,'base64').length);
 }finally{record.engine.dispose();}
});
test('AZW3 uses the original MOBI parser and keeps Chinese chapters, images and footnote targets',async()=>{
 const converted=await convert(await epubFixture());const record=await parseExtendedBook(converted.bytes,'中文.azw3','azw3');try{assert.equal(record.book.title,'中文测试书 & English');assert.equal(record.book.chapters.length,2);const html=await record.engine.render(0);assert.match(html,/中文开头/);assert.match(html,/<img/);assert.match(html,/href="flow\/section-2.xhtml/);assert.equal(record.book.toc[0].children.length,1);assert.match(await record.engine.plainTextOf(1),/脚注正文/);}finally{record.engine.dispose();}
});
test('CBZ uses original comic parser with page order, actual image bytes and disposal',async()=>{
 const zip=new JSZip();zip.file('002.png',Buffer.from(png,'base64'));zip.file('001.png',Buffer.from(png,'base64'));const record=await parseExtendedBook(await zip.generateAsync({type:'uint8array'}),'漫画.cbz','cbz');const html=await record.engine.render(0),url=html.match(/src="((?:blob:|data:image)[^"]+)"/)[1];assert.equal(record.engine.chapterCount(),2);assert.equal(record.book.toc[0].label,'001.png');assert.equal(record.book.fixedLayout,true);assert.equal((await (await fetch(url)).arrayBuffer()).byteLength,Buffer.from(png,'base64').length);record.engine.dispose();await assert.rejects(fetch(url));
});
test('format suffixes do not hide invalid archives, XML entities or encrypted/unrecognized books',async()=>{
 await assert.rejects(parseExtendedBook(new TextEncoder().encode('not mobi'),'bad.mobi','mobi'));
 await assert.rejects(parseExtendedBook(new TextEncoder().encode('<!DOCTYPE x [<!ENTITY x "danger">]>'),'bad.fb2','fb2'),/declaration/);
 const zip=new JSZip();zip.file('note.txt','not an ebook');await assert.rejects(parseExtendedBook(await zip.generateAsync({type:'uint8array'}),'bad.fbz','fbz'),/no FB2/);
});
test('production Host worker archive converts EPUB and is independently readable',async()=>{
 const defines=await kindleDefines();const convertHost=createKindleConverter(JSON.parse(defines.__KINDLE_CONVERTER_ARCHIVE__));const result=await convertHost(await epubFixture());const record=await parseExtendedBook(result.bytes,'worker.azw3','azw3');try{assert.equal(record.book.chapters.length,2);assert.match(await record.engine.plainTextOf(0),/道可道/);}finally{record.engine.dispose();}
});
test('Host Agent reads the same extended chapter in an isolated DOM worker',async()=>{
 const {formatDefines}=await import('../scripts/kindle-build.mjs'),{readExtendedChapter}=await import('../src/host/extended-formats.js');const defines=await formatDefines(),source=JSON.parse(defines.__QMR_FORMAT_WORKER__);
 const result=await readExtendedChapter({bytes:new TextEncoder().encode(fb2),filename:'sample.fb2',format:'fb2',chapter:2},{source});assert.equal(result.title,'格式迁移验收');assert.equal(result.chapters,3);assert.match(result.text,/第二章内容/);assert.equal(result.chapter.href,'flow/section-2.xhtml');
 const abort=new AbortController();abort.abort();await assert.rejects(readExtendedChapter({bytes:new Uint8Array(),filename:'x.fb2',format:'fb2'},{source,signal:abort.signal}),/cancelled/);
});
