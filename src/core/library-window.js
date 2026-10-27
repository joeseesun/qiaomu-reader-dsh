export function libraryWindow(count, scroll, height, rowHeight = 80, overscan = 6) {
  const total = Math.max(0, Math.floor(count));
  const start = Math.min(Math.max(0, total - 1), Math.max(0, Math.floor(scroll / rowHeight) - overscan));
  const end = Math.min(total, start + Math.ceil(Math.max(1, height) / rowHeight) + overscan * 2);
  return { start, end, before: start * rowHeight, after: Math.max(0, total - end) * rowHeight };
}
