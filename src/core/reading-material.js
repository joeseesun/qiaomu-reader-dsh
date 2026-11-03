import { PDF_CONTEXT_LIMIT } from './pdf-context.js';
const boundedInt = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : 0;
export function normalizeReadingMaterial(request) {
  const material = {
    title: String(request?.title || '').slice(0,300), author: String(request?.author || '').slice(0,200),
    chapter: String(request?.chapter || '').slice(0,300), page: String(request?.page || '').slice(0,12000), selection: String(request?.selection || '').slice(0,6000),
  };
  const info = request?.documentInfo;
  const totalPages = boundedInt(info?.totalPages,10000);
  if (info?.format === 'pdf' && totalPages > 0) {
    material.document = String(request?.document || '').slice(0,PDF_CONTEXT_LIMIT);
    material.documentInfo = {format:'pdf',totalPages,textPages:boundedInt(info.textPages,totalPages),
      includedPages:[...new Set((Array.isArray(info.includedPages)?info.includedPages:[]).slice(0,10000).filter(n=>Number.isInteger(n)&&n>0&&n<=totalPages))].sort((a,b)=>a-b),
      sourceChars:boundedInt(info.sourceChars,Number.MAX_SAFE_INTEGER),truncated:info.truncated===true,ocr:false};
  }
  return material;
}
