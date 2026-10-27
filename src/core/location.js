export function percentLocation(fraction, chapterCount) {
  const count = Math.max(1, Math.floor(Number(chapterCount) || 1));
  const position = Math.min(1, Math.max(0, Number(fraction) || 0)) * count;
  const chapterIndex = Math.min(count - 1, Math.floor(position));
  return { chapterIndex, scroll: Math.min(1, position - chapterIndex) };
}
