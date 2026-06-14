<script lang="ts">
  // Live preview of fluid spacing + the two runtime forces (text coupling, density).
  // Mirrors src/scripts/tokens/build-space-scale.ts and the default controls; it's a
  // re-implementation so a reader can OPERATE simulated viewport / text / coupling / density
  // and watch containers respond. Keep these constants in sync with the token defaults.

  const ROOT = 16;
  const MINVW = 360, MAXVW = 1240;
  const minW = MINVW / ROOT, maxW = MAXVW / ROOT;
  const SPACE_MIN_SCALE = 0.85;

  function fluidRem(minRem: number, maxRem: number, vwPx: number): number {
    const slope = (maxRem - minRem) / (maxW - minW);
    const intercept = minRem - slope * minW;
    const pref = intercept + slope * (vwPx / ROOT);
    return Math.max(Math.min(minRem, maxRem), Math.min(pref, Math.max(minRem, maxRem)));
  }

  // body font (md, index 0): fluid 1.125->1.25rem, then * its a11y modifier
  function bodyPx(vw: number, mdMod: number): number {
    return fluidRem(1.125, 1.25, vw) * ROOT * mdMod;
  }

  // spacing: authored rem = max-anchor; min = value*minScale; * density * coupling
  function spacePx(valueRem: number, vw: number, density: number, mdMod: number, coupling: number): number {
    const fluid = fluidRem(valueRem * SPACE_MIN_SCALE, valueRem, vw);
    const couplingFactor = 1 + (mdMod - 1) * coupling;
    return fluid * ROOT * density * couplingFactor;
  }

  let viewport = $state(768);
  let textDial = $state(1); // body (md) font modifier
  let coupling = $state(0.5);
  let density = $state(1);

  const body = $derived(bodyPx(viewport, textDial));
  const padBlock = $derived(spacePx(0.5, viewport, density, textDial, coupling)); // spacing.05
  const padInline = $derived(spacePx(1, viewport, density, textDial, coupling)); // spacing.1
  const gap2 = $derived(spacePx(2, viewport, density, textDial, coupling)); // spacing.2
  const lineHeight = 1.4;
  const btnHeight = $derived(Math.max(44, body * lineHeight + 2 * padBlock));
  const r = (n: number) => Math.round(n * 10) / 10;
</script>

<figure class="space-demo" aria-label="Interactive fluid spacing preview">
  <div class="space-demo__controls">
    <label>
      <span>Viewport <output>{viewport}px</output></span>
      <input type="range" min="320" max="1600" step="1" bind:value={viewport} aria-label="Simulated viewport width" />
    </label>
    <label>
      <span>Body text dial <output>{textDial.toFixed(2)}&times;</output></span>
      <input type="range" min="1" max="1.8" step="0.05" bind:value={textDial} aria-label="Body font-size modifier" />
    </label>
    <label>
      <span>Text coupling <output>{coupling.toFixed(2)}</output></span>
      <input type="range" min="0" max="1" step="0.01" bind:value={coupling} aria-label="Spacing text coupling strength" />
    </label>
    <label>
      <span>Density <output>{density.toFixed(2)}&times;</output></span>
      <input type="range" min="0.8" max="1.3" step="0.05" bind:value={density} aria-label="Independent spacing density" />
    </label>
  </div>

  <div class="space-demo__stage">
    <button
      type="button"
      class="space-demo__btn"
      style="font-size:{body}px; line-height:{lineHeight}; padding:{padBlock}px {padInline}px; min-height:44px;"
    >Save changes</button>

    <div class="space-demo__gap" style="gap:{gap2}px;">
      <span class="space-demo__box"></span>
      <span class="space-demo__box"></span>
      <span class="space-demo__gap-label">spacing-2 gap: {r(gap2)}px</span>
    </div>
  </div>

  <dl class="space-demo__readout">
    <div><dt>body</dt><dd>{r(body)}px</dd></div>
    <div><dt>padding-block</dt><dd>{r(padBlock)}px</dd></div>
    <div><dt>button height</dt><dd>{r(btnHeight)}px</dd></div>
    <div><dt>coupling factor</dt><dd>&times;{r(1 + (textDial - 1) * coupling) * 1}</dd></div>
  </dl>

  <figcaption>
    Push <em>Body text dial</em> up and the button grows to hold the bigger text — padding and
    height track it via <em>Text coupling</em>. Drop coupling to 0 and the text overflows its
    padding; raise it toward 1 and spacing follows text 1:1. <em>Density</em> moves spacing
    independently, so you can pair big text with a compact layout.
  </figcaption>
</figure>

<style>
  .space-demo {
    margin: var(--zbk-spacing-2) 0;
    padding: var(--zbk-spacing-15);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-spacing-05);
    background: var(--zbk-app-canvas-muted);
  }
  .space-demo__controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: var(--zbk-spacing-1);
    margin-bottom: var(--zbk-spacing-15);
    padding-bottom: var(--zbk-spacing-1);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }
  .space-demo__controls label {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
  }
  .space-demo__controls span {
    display: flex;
    justify-content: space-between;
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
  }
  .space-demo__controls output {
    font-family: var(--zbk-font-family-monospace);
    color: var(--zbk-accent-primary-600);
  }
  .space-demo__controls input { width: 100%; accent-color: var(--zbk-accent-primary-600); }

  .space-demo__stage {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-15);
    align-items: flex-start;
    padding: var(--zbk-spacing-1);
  }
  .space-demo__btn {
    font-family: var(--zbk-font-family-body);
    background: var(--zbk-accent-primary-600);
    color: var(--zbk-color-global-white);
    border: none;
    border-radius: var(--zbk-spacing-025);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }
  .space-demo__gap { display: flex; align-items: center; }
  .space-demo__box {
    width: var(--zbk-spacing-205);
    height: var(--zbk-spacing-205);
    background: var(--zbk-accent-primary-200, var(--zbk-app-border));
    border-radius: var(--zbk-spacing-025);
    flex: none;
  }
  .space-demo__gap-label {
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-3xs);
    color: var(--zbk-app-ink-soft);
  }

  .space-demo__readout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--zbk-spacing-05);
    margin: var(--zbk-spacing-15) 0 0;
    padding-top: var(--zbk-spacing-1);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }
  .space-demo__readout div { display: flex; flex-direction: column; }
  .space-demo__readout dt {
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-3xs);
    color: var(--zbk-app-ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .space-demo__readout dd {
    margin: 0;
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-app-ink);
  }

  .space-demo figcaption {
    margin-top: var(--zbk-spacing-15);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    line-height: 1.6;
  }
</style>
