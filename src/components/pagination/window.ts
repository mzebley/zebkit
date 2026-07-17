// The pagination window: which page numbers render between prev and next.
//
// The window has a constant width of `boundaries * 2 + siblings * 2 + 3` items
// (pinned boundary pages at each end, the current page with its siblings, and
// two slots that hold either an ellipsis or the single page it would have
// hidden). Constant width keeps the control from reflowing as the user pages —
// the sibling range shifts toward the middle near the edges to compensate.
//
// Worked examples (siblings = 1, boundaries = 1, total = 12):
//
//   current | window
//   --------|---------------------------
//   1       | 1 2 3 4 5 … 12
//   4       | 1 2 3 4 5 … 12
//   5       | 1 … 4 5 6 … 12
//   8       | 1 … 7 8 9 … 12
//   9       | 1 … 8 9 10 11 12
//   12      | 1 … 8 9 10 11 12

export type PaginationWindowItem = number | "ellipsis";

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);

/**
 * Compute the visible page items for `current` of `total` pages.
 * `siblings` is the count of neighbors shown on each side of the current page;
 * `boundaries` is the count of pages pinned at each end. An ellipsis never
 * hides a single page — when the gap is exactly one page, the page renders.
 */
export function paginationWindow(
  current: number,
  total: number,
  siblings = 1,
  boundaries = 1,
): PaginationWindowItem[] {
  // Every page fits without hiding anything.
  if (total <= boundaries * 2 + siblings * 2 + 3) return range(1, total);

  const startPages = range(1, boundaries);
  const endPages = range(total - boundaries + 1, total);

  // The sibling range around `current`, shifted inward near the edges so the
  // window keeps its width instead of shrinking.
  const windowStart = Math.max(
    Math.min(current - siblings, total - boundaries - siblings * 2 - 1),
    boundaries + 2,
  );
  const windowEnd = Math.min(
    Math.max(current + siblings, boundaries + siblings * 2 + 2),
    total - boundaries - 1,
  );

  return [
    ...startPages,
    windowStart === boundaries + 2 ? boundaries + 1 : "ellipsis",
    ...range(windowStart, windowEnd),
    windowEnd === total - boundaries - 1 ? total - boundaries : "ellipsis",
    ...endPages,
  ];
}
