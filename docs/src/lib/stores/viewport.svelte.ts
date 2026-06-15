// Docs viewport regime — mirrors zebkit's own breakpoint tokens so the docs
// site reflows on the same scale it documents (see src/core/styles/variables/
// _breakpoints.scss: tablet-lg 50rem, desktop-lg 80rem).
//
//   compact  < 50rem  (below tablet-lg) — nav drawer, inspector bottom-sheet
//   reading  50–80rem (tablet-lg→desktop-lg) — nav column, inspector toggle
//   full     ≥ 80rem  (desktop-lg) — nav column, inspector sticky rail
//
// One source for both the JS that opens/closes panels and the CSS media queries
// (kept in sync by hand against the same rem values).
export const BREAKPOINTS = {
  readingMin: '50rem', // tablet-lg
  fullMin: '80rem', // desktop-lg
} as const;

export type Regime = 'compact' | 'reading' | 'full';

export const viewport = $state({ regime: 'full' as Regime });

function compute(): Regime {
  if (typeof window === 'undefined') return 'full';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.fullMin})`).matches) return 'full';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.readingMin})`).matches) return 'reading';
  return 'compact';
}

if (typeof window !== 'undefined') {
  const full = window.matchMedia(`(min-width: ${BREAKPOINTS.fullMin})`);
  const reading = window.matchMedia(`(min-width: ${BREAKPOINTS.readingMin})`);
  const update = () => (viewport.regime = compute());
  update();
  full.addEventListener('change', update);
  reading.addEventListener('change', update);
}
