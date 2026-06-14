// A11y state — drives zebkit a11y tokens
export const theme = $state({
  reskinTheme: 'swiss',
  fontScale: 1,
  contrast: 'normal' as 'normal' | 'high',
  density: 1,
  reducedMotion: false,
});

// Apply a11y token changes to :root
function applyA11yTokens() {
  const root = document.documentElement;

  // Font scale affects both font-size and line-height
  root.style.setProperty('--zbk-a11y-fallback-font-size-modifier', theme.fontScale.toString());
  root.style.setProperty('--zbk-a11y-line-height-modifier', theme.fontScale.toString());

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
