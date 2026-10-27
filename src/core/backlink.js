/** Markdown note links are ordinary same-page fragments, handled by the Reader panel in Harness. */
export function highlightLink(bookId, highlightId) {
  if (!bookId || !highlightId) return '';
  return `#qmr-book=${encodeURIComponent(String(bookId))}&qmr-highlight=${encodeURIComponent(String(highlightId))}`;
}

export function parseHighlightLink(href) {
  if (typeof href !== 'string' || !href.startsWith('#qmr-book=')) return null;
  try {
    const params = new URLSearchParams(href.slice(1));
    const bookId = params.get('qmr-book');
    const highlightId = params.get('qmr-highlight');
    if(bookId&&bookId.length<=160&&params.has('qmr-chapter')){const chapterHref=params.get('qmr-chapter'),text=params.get('qmr-text'),offset=Number(params.get('qmr-offset'));if(!chapterHref||chapterHref.length>2048||!text||text.length>200||!Number.isSafeInteger(offset)||offset<0)return null;return{bookId,chapterHref,text,offset};}
    if (!bookId || !highlightId || bookId.length > 160 || highlightId.length > 160) return null;
    return { bookId, highlightId };
  } catch { return null; }
}

export function positionLink(bookId,chapterHref,text,offset=0){const params=new URLSearchParams({'qmr-book':String(bookId),'qmr-chapter':String(chapterHref||''),'qmr-text':String(text||'').slice(0,200),'qmr-offset':String(Math.max(0,Math.floor(Number(offset)||0)))});return '#'+params.toString();}
