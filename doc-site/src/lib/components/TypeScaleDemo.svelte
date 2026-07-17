<script lang="ts">
  // Live, viewport-simulating preview of zebkit's default fluid type scale.
  //
  // The numbers here MIRROR the build-time generator (src/scripts/tokens/build-type-scale.ts)
  // and the default control tokens (src/tokens/typography/type-scale/tokens/tokens.ts). It is a
  // re-implementation on purpose: a `clamp()` reacts to the real browser viewport, but to let a
  // reader *operate* the scale we compute each size from a SIMULATED viewport width instead.
  // If the default controls change, update these constants to match.

  const CONTROLS = {
    minViewportPx: 360,
    maxViewportPx: 1240,
    minBaseRem: 1.125, // 18px
    maxBaseRem: 1.25, //  20px
    minRatio: 1.2, // minor third
    maxRatio: 1.25 // major third
  };

  const ROOT_PX = 16;

  // name → fluid index (md is the base, index 0). Mirrors the token module.
  const STEPS: { name: string; index: number; sample: string }[] = [
    { name: '5xl', index: 6, sample: 'Display' },
    { name: '4xl', index: 5, sample: 'Display' },
    { name: '3xl', index: 4, sample: 'Heading' },
    { name: '2xl', index: 3, sample: 'Heading' },
    { name: 'xl', index: 2, sample: 'Heading' },
    { name: 'lg', index: 1, sample: 'Subhead' },
    { name: 'md', index: 0, sample: 'Body — the comfortable reading size.' },
    { name: 'sm', index: -1, sample: 'Small body and UI text.' },
    { name: 'xs', index: -2, sample: 'Secondary UI text.' },
    { name: '2xs', index: -3, sample: 'Captions and labels.' },
    { name: '3xs', index: -4, sample: 'Fine print.' }
  ];

  let viewport = $state(768);
  let a11y = $state(1);

  /** Size (in px) of a step at the simulated viewport — the exact clamp the browser would land on. */
  function sizePx(index: number, vw: number, modifier: number): number {
    const minSize = CONTROLS.minBaseRem * Math.pow(CONTROLS.minRatio, index);
    const maxSize = CONTROLS.maxBaseRem * Math.pow(CONTROLS.maxRatio, index);
    const minW = CONTROLS.minViewportPx / ROOT_PX;
    const maxW = CONTROLS.maxViewportPx / ROOT_PX;

    const lo = Math.min(minSize, maxSize);
    const hi = Math.max(minSize, maxSize);

    const slope = maxW === minW ? 0 : (maxSize - minSize) / (maxW - minW);
    const intercept = minSize - slope * minW;
    const preferred = intercept + slope * (vw / ROOT_PX);

    const clamped = Math.max(lo, Math.min(preferred, hi));
    return clamped * ROOT_PX * modifier;
  }

  const rows = $derived(
    STEPS.map((s) => ({ ...s, px: sizePx(s.index, viewport, a11y) }))
  );
</script>

<figure class="type-demo" aria-label="Interactive fluid type scale preview">
  <div class="type-demo__controls">
    <label class="type-demo__control">
      <span class="type-demo__control-label">
        Simulated viewport
        <output class="type-demo__readout">{viewport}px</output>
      </span>
      <input
        type="range"
        min="320"
        max="1600"
        step="1"
        bind:value={viewport}
        aria-label="Simulated viewport width in pixels"
      />
      <span class="type-demo__range-hints">
        <span>anchors: 360px</span><span>1240px</span>
      </span>
    </label>

    <label class="type-demo__control">
      <span class="type-demo__control-label">
        Reader font-size dial
        <output class="type-demo__readout">{a11y.toFixed(2)}&times;</output>
      </span>
      <input
        type="range"
        min="0.8"
        max="1.5"
        step="0.05"
        bind:value={a11y}
        aria-label="Accessibility font-size modifier"
      />
      <span class="type-demo__range-hints">
        <span>the runtime a11y modifier</span>
      </span>
    </label>
  </div>

  <ul class="type-demo__scale">
    {#each rows as row (row.name)}
      <li class="type-demo__row">
        <code class="type-demo__name">{row.name}</code>
        <span class="type-demo__sample" style="font-size: {row.px}px;">{row.sample}</span>
        <code class="type-demo__px">{row.px.toFixed(1)}px</code>
      </li>
    {/each}
  </ul>

  <figcaption class="type-demo__caption">
    Drag the sliders and watch the scale respond. Between the 360px and 1240px anchors each
    step interpolates; outside that range it holds at its bound. The dial shows how the runtime
    accessibility modifier multiplies through every size at once.
  </figcaption>
</figure>

<style>
  .type-demo {
    margin: var(--zbk-spacing-2) 0;
    padding: var(--zbk-spacing-15);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-spacing-05);
    background: var(--zbk-app-canvas-muted);
  }

  .type-demo__controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--zbk-spacing-15);
    margin-bottom: var(--zbk-spacing-15);
    padding-bottom: var(--zbk-spacing-1);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }

  .type-demo__control {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .type-demo__control-label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--zbk-spacing-05);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
  }

  .type-demo__readout {
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-accent-primary-600);
  }

  .type-demo__control input[type='range'] {
    width: 100%;
    accent-color: var(--zbk-accent-primary-600);
  }

  .type-demo__range-hints {
    display: flex;
    justify-content: space-between;
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-3xs);
    color: var(--zbk-app-ink-subtle);
  }

  .type-demo__scale {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
  }

  .type-demo__row {
    display: grid;
    grid-template-columns: 3rem 1fr auto;
    align-items: baseline;
    gap: var(--zbk-spacing-1);
  }

  .type-demo__name {
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }

  .type-demo__sample {
    font-family: var(--zbk-font-family-alt, serif);
    color: var(--zbk-app-ink);
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .type-demo__px {
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-3xs);
    color: var(--zbk-app-ink-subtle);
    white-space: nowrap;
  }

  .type-demo__caption {
    margin-top: var(--zbk-spacing-15);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    line-height: var(--zbk-line-height-4);
  }
</style>
