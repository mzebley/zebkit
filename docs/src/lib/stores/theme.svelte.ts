// A11y state — drives zebkit a11y tokens
export const theme = $state({
  reskinTheme: 'apple',
  fontScale: 1,
  contrast: 'normal' as 'normal' | 'high',
  density: 1,
  reducedMotion: false,
});

// Font-size tiers, smallest → largest. zebkit exposes a per-tier a11y modifier
// (`--zbk-a11y-font-size-modifier-<tier>`) for each, by design: scaling is
// non-linear so small text can grow aggressively while large text stays
// conservative, preserving hierarchy instead of ballooning headlines.
const FONT_TIERS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const;

// Per-tier responsiveness to the dial. The smallest tier follows the dial the
// hardest (W_MAX); the largest barely moves (W_MIN). 'md' (body) lands ~1.0, so
// body text tracks the dial value while captions over-scale and display under-scales.
const W_MAX = 1.5;
const W_MIN = 0.4;

/**
 * Map the global font-scale dial to a per-tier modifier.
 *
 * Growing (scale ≥ 1): small text scales most. Shrinking (scale < 1): the weighting
 * mirrors so small text is *protected* — it shrinks least, large text shrinks most —
 * keeping captions legible even when the reader pulls the dial down.
 */
function tierModifier(index: number, count: number, scale: number): number {
  // bias: 1 at the smallest tier, 0 at the largest
  const bias = count > 1 ? (count - 1 - index) / (count - 1) : 1;
  const weight = scale >= 1 ? W_MIN + (W_MAX - W_MIN) * bias : W_MIN + (W_MAX - W_MIN) * (1 - bias);
  return 1 + (scale - 1) * weight;
}

// Apply a11y token changes to :root
function applyA11yTokens() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Font scale: non-linear, one modifier per tier.
  FONT_TIERS.forEach((tier, i) => {
    const mod = tierModifier(i, FONT_TIERS.length, theme.fontScale);
    root.style.setProperty(`--zbk-a11y-font-size-modifier-${tier}`, mod.toFixed(4));
  });

  // Leading tracks body-text growth (gentler than the smallest tiers).
  const bodyMod = tierModifier(FONT_TIERS.indexOf('md'), FONT_TIERS.length, theme.fontScale);
  root.style.setProperty('--zbk-a11y-line-height-modifier', bodyMod.toFixed(4));

  // Density affects spacing
  root.style.setProperty('--zbk-a11y-spacing-modifier', theme.density.toString());

  // Reduced motion affects transition duration
  root.style.setProperty('--zbk-a11y-transition-duration-modifier', theme.reducedMotion ? '0' : '1');

  // TODO: contrast token not yet in zebkit — log as gap
}

export function setFontScale(value: number) {
  theme.fontScale = Math.max(0.8, Math.min(1.5, value)); // Clamp 0.8–1.5
  applyA11yTokens();
}

export function setDensity(value: number) {
  theme.density = Math.max(0.8, Math.min(1.3, value)); // Clamp 0.8–1.3
  applyA11yTokens();
}

export function setContrast(value: 'normal' | 'high') {
  theme.contrast = value;
  applyA11yTokens();
  // TODO: implement contrast toggle via custom token or class
}

export function setReducedMotion(value: boolean) {
  theme.reducedMotion = value;
  applyA11yTokens();
}

export function setReskinTheme(preset: string) {
  theme.reskinTheme = preset;
}

// Detect system reduced-motion preference on init
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  theme.reducedMotion = mediaQuery.matches;

  mediaQuery.addEventListener('change', (e) => {
    theme.reducedMotion = e.matches;
    applyA11yTokens();
  });
}
