import * as React from 'react';
export function useDialogFocus(ref, onClose) {
  const close = React.useRef(onClose); close.current = onClose;
  React.useEffect(() => {
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => ref.current?.querySelector('[data-autofocus],button,input')?.focus());
    return () => { cancelAnimationFrame(frame); if (previous?.isConnected) previous.focus(); };
  }, []);
  return event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
    if (event.key !== 'Tab') return;
    const nodes = [...ref.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (!nodes.length) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
}
