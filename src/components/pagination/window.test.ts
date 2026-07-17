import { paginationWindow, type PaginationWindowItem } from "./window";

const E = "ellipsis" as const;

describe("paginationWindow", () => {
  it("renders every page when the window can hold them all", () => {
    // total <= boundaries*2 + siblings*2 + 3 (= 7 at the defaults)
    expect(paginationWindow(1, 1)).toEqual([1]);
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("matches the worked example table (siblings=1, boundaries=1, total=12)", () => {
    const table: Array<[number, PaginationWindowItem[]]> = [
      [1, [1, 2, 3, 4, 5, E, 12]],
      [2, [1, 2, 3, 4, 5, E, 12]],
      [3, [1, 2, 3, 4, 5, E, 12]],
      [4, [1, 2, 3, 4, 5, E, 12]],
      [5, [1, E, 4, 5, 6, E, 12]],
      [6, [1, E, 5, 6, 7, E, 12]],
      [7, [1, E, 6, 7, 8, E, 12]],
      [8, [1, E, 7, 8, 9, E, 12]],
      [9, [1, E, 8, 9, 10, 11, 12]],
      [10, [1, E, 8, 9, 10, 11, 12]],
      [11, [1, E, 8, 9, 10, 11, 12]],
      [12, [1, E, 8, 9, 10, 11, 12]],
    ];
    for (const [current, expected] of table) {
      expect(paginationWindow(current, 12)).toEqual(expected);
    }
  });

  it("keeps a constant window width across every page", () => {
    for (const [siblings, boundaries, total] of [
      [1, 1, 30],
      [2, 1, 30],
      [1, 2, 30],
      [0, 1, 30],
      [2, 2, 50],
    ]) {
      const width = boundaries * 2 + siblings * 2 + 3;
      for (let current = 1; current <= total; current++) {
        const window = paginationWindow(current, total, siblings, boundaries);
        expect(window).toHaveLength(width);
      }
    }
  });

  it("never hides a single page behind an ellipsis", () => {
    // An ellipsis standing for exactly one page renders that page instead:
    // with total=8 and current=1 the gap before the end boundary is 6..7 (a
    // real ellipsis), but with current=5 the start gap is just page 2.
    expect(paginationWindow(1, 8)).toEqual([1, 2, 3, 4, 5, E, 8]);
    expect(paginationWindow(5, 8)).toEqual([1, E, 4, 5, 6, 7, 8]);
  });

  it("honors siblings and boundaries", () => {
    expect(paginationWindow(10, 20, 2, 2)).toEqual([
      1, 2, E, 8, 9, 10, 11, 12, E, 19, 20,
    ]);
  });

  it("supports boundaries=0 (no pinned endpoints)", () => {
    expect(paginationWindow(1, 10, 1, 0)).toEqual([1, 2, 3, 4, E]);
    expect(paginationWindow(5, 10, 1, 0)).toEqual([E, 4, 5, 6, E]);
    expect(paginationWindow(10, 10, 1, 0)).toEqual([E, 7, 8, 9, 10]);
  });

  it("every page remains reachable through window items plus prev/next", () => {
    // Walking with next from page 1 must eventually show every page number.
    const seen = new Set<number>();
    for (let current = 1; current <= 30; current++) {
      for (const item of paginationWindow(current, 30)) {
        if (typeof item === "number") seen.add(item);
      }
    }
    expect(seen.size).toBe(30);
  });
});
