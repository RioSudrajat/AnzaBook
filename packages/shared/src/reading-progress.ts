export function bookProgressPercent(
  chapterIndex: number,
  chapterCount: number,
  chapterPercent: number,
): number {
  if (chapterIndex < 0 || chapterIndex >= chapterCount) return 0;
  return Math.floor((chapterIndex * 100 + chapterPercent) / chapterCount);
}
