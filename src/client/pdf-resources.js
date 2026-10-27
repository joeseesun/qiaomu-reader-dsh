/**
 * 内嵌 PDF 资源（对照原版 qiaomu-reader 4.5.13 的 pdf-cmaps.js）。
 *
 * 为什么需要：pdf.js 6 解析扫描版 PDF 时按需从 CDN 拉取三类资源——
 * 中文 CMap（*.bcmap）、JBIG2/OpenJPEG 图像解码器和 qcms 颜色管理的
 * wasm。DSH 客户端是单个自包含 bundle，没有可解析的资源 URL，不接上
 * 这层，扫描版 PDF 的页图会整页空白。做法与原版一致：
 *
 * - 资源本体生成在 `./pdf-resources-data.js`（scripts/generate-pdf-resources.mjs）；
 * - 运行时给 getDocument 传一个自定义 `BinaryDataFactory`：
 *   pdf.js 只按 duck-typing 调 `fetch({ kind, filename })`（worker 关闭
 *   useWorkerFetch 后经 FetchBinaryData 消息走到这里），worker 内嵌在
 *   主线程（globalThis.pdfjsWorker），调用是直接的异步函数调用；
 * - wasm 三个解码器打包成一个 deflate zip，用 core/zip.js 解出；
 *   每次调用返回全新字节，因为 pdf.js 可能把缓冲区 transfer 给 worker。
 */
import { openZip } from '../core/zip.js';
import { EMBEDDED_PDF_CMAPS, EMBEDDED_PDF_WASM_ARCHIVE } from './pdf-resources-data.js';

/** base64 → 字节（仅客户端模块；atob 在目标浏览器环境始终可用） */
function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 内嵌 wasm zip 的惰性解析；失败时清空缓存，允许下次重试 */
let wasmArchivePromise = null;
async function embeddedWasm(filename) {
  if (!wasmArchivePromise) {
    wasmArchivePromise = openZip(decodeBase64(EMBEDDED_PDF_WASM_ARCHIVE)).catch((error) => {
      wasmArchivePromise = null;
      throw error;
    });
  }
  const archive = await wasmArchivePromise;
  const data = await archive.read(filename);
  if (!data) throw new Error(`内嵌 PDF 资源不可用：${filename}`);
  return data;
}

/**
 * pdf.js 的资源工厂（duck-typing：只要求 `fetch({ kind, filename })`）。
 * kind 取值见 pdf.js 6 的 BaseBinaryDataFactory：cMapUrl / standardFontDataUrl / wasmUrl。
 * 标准字体不内嵌（与原版一致，useSystemFonts 走系统字体）。
 */
export class EmbeddedPdfBinaryDataFactory {
  async fetch({ kind, filename }) {
    if (kind === 'wasmUrl') return embeddedWasm(filename);
    if (kind !== 'cMapUrl') throw new Error(`不支持的内嵌 PDF 资源类型：${kind}`);
    const encoded = EMBEDDED_PDF_CMAPS[filename];
    if (!encoded) throw new Error(`内嵌 PDF CMap 不可用：${filename}`);
    return decodeBase64(encoded);
  }
}

/**
 * 传给 getDocument 的资源选项。URL 值只是占位（pdf.js 要求带尾斜杠的
 * 字符串），实际取数全部走上面的工厂。
 */
export const PDF_EMBEDDED_RESOURCE_OPTIONS = Object.freeze({
  cMapUrl: 'qmr-embedded:///',
  cMapPacked: true,
  wasmUrl: 'qmr-embedded:///',
  useWorkerFetch: false,
  BinaryDataFactory: EmbeddedPdfBinaryDataFactory,
});
