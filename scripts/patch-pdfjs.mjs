#!/usr/bin/env node
/**
 * patch-pdfjs.mjs — 修复 pdf.js 丢句末标点（对照原版 qiaomu-reader 4.2.4）。
 *
 * 部分 PDF 的 ToUnicode 映射有缺陷：句号字形解码成 " ."（空格 + 句号）。
 * pdf.js 把「以空白开头」的字形一律当纯空白输出，整本书的句号就全丢了。
 * worker 里的判定是：
 *     const SpecialCharRegExp = /^(\s)|(\p{Mn})|(\p{Cf})$/u;
 * `^(\s)` 只看第一个字符；修复要求整串都是空白才算空白：
 *     /^(\s+)$|(\p{Mn})|(\p{Cf})$/u
 * 纯空白（" "、"\r\n"）不受影响，" ." 不再被吞。
 *
 * DSH 在构建时从 node_modules 打包 pdf.js，而 npm install 会还原文件，
 * 所以打进 build 流程（build.mjs 在打包前调用），幂等。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAIRS = [
  ['"^(\\\\s)|(\\\\p{Mn})|(\\\\p{Cf})$"', '"^(\\\\s+)$|(\\\\p{Mn})|(\\\\p{Cf})$"'],
  ['/^(\\s)|(\\p{Mn})|(\\p{Cf})$/u', '/^(\\s+)$|(\\p{Mn})|(\\p{Cf})$/u'],
];

const targets = [
  'node_modules/pdfjs-dist/build/pdf.worker.mjs',
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  'node_modules/pdfjs-dist/build/pdf.worker.js',
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
];

let patched = 0;
let already = 0;
let missing = 0;
for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { missing += 1; continue; }
  let source = fs.readFileSync(file, 'utf8');
  const pair = PAIRS.find(([oldValue, newValue]) => source.includes(newValue) || source.includes(oldValue));
  if (!pair) { process.stderr.write(`  patch-pdfjs：未找到判定模式（pdf.js 版本变了？）：${rel}\n`); missing += 1; continue; }
  const [oldValue, newValue] = pair;
  if (source.includes(newValue)) { already += 1; continue; }
  const count = source.split(oldValue).length - 1;
  fs.writeFileSync(file, source.split(oldValue).join(newValue));
  process.stdout.write(`  patch-pdfjs：修复 ${count} 处 —— ${rel}\n`);
  patched += 1;
}
process.stdout.write(`patch-pdfjs：${patched} 修复，${already} 已是修复版，${missing} 跳过。\n`);
if (!patched && !already) {
  process.stderr.write('patch-pdfjs：没有任何 worker 文件被打上补丁。\n');
  process.exitCode = 1;
}
