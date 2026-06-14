<script lang="ts">
  import { theme, setFontScale, setDensity, setReducedMotion } from '$lib/stores/theme.svelte';

  let { open = false }: { open?: boolean } = $props();
</script>

<div class="a11y-dials" class:open role="dialog" aria-label="Accessibility controls">
  <fieldset class="dials-group">
    <legend class="sr-only">Accessibility controls</legend>

    <!-- Font Scale Slider -->
    <div class="dial-item">
      <label for="font-scale">Font scale</label>
      <input
        id="font-scale"
        type="range"
        min="0.8"
        max="1.5"
        step="0.05"
        value={theme.fontScale}
        oninput={(e) => setFontScale(parseFloat((e.target as HTMLInputElement).value))}
        aria-label="Font scale: adjust text size"
      />
      <output class="value-label">{theme.fontScale.toFixed(2)}x</output>
    </div>

    <!-- Density Slider -->
    <div class="dial-item">
      <label for="density">Density</label>
      <input
        id="density"
        type="range"
        min="0.8"
        max="1.3"
        step="0.05"
        value={theme.density}
        oninput={(e) => setDensity(parseFloat((e.target as HTMLInputElement).value))}
        aria-label="Density: adjust spacing"
      />
      <output class="value-label">{theme.density.toFixed(2)}x</output>
    </div>

    <!-- Reduced Motion Toggle -->
    <div class="dial-item toggle">
      <label for="reduced-motion">Reduce motion</label>
      <button
        id="reduced-motion"
        type="button"
        class="toggle-button"
        class:active={theme.reducedMotion}
        onclick={() => setReducedMotion(!theme.reducedMotion)}
        aria-label={`Reduce motion: ${theme.reducedMotion ? 'on' : 'off'}`}
        aria-pressed={theme.reducedMotion}
      >
        {theme.reducedMotion ? 'On' : 'Off'}
      </button>
    </div>
  </fieldset>
</div>

<style>
  .a11y-dials {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--zbk-app-canvas);
    border: 1px solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    padding: var(--zbk-spacing-2);
    margin-top: var(--zbk-spacing-1);
    z-index: var(--zbk-z-index-popover);
    min-width: 200px;
  }

  .a11y-dials.open {
    display: block;
  }

  .dials-group {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-2);
    border: none;
    margin: 0;
    padding: 0;
  }

  .dial-item {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .dial-item.toggle {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  label {
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
    font-family: var(--zbk-font-family-body);
  }

  input[type='range'] {
    width: 100%;
    cursor: pointer;
  }

  .value-label {
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    font-family: var(--zbk-font-family-code);
  }

  .toggle-button {
    padding: var(--zbk-spacing-05) var(--zbk-spacing-1);
    border: 1px solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xs);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-sm);
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .toggle-button:hover {
    background: var(--zbk-app-canvas-muted);
  }

  .toggle-button.active {
    background: var(--zbk-accent-primary-600);
    color: var(--zbk-app-canvas);
    border-color: var(--zbk-accent-primary-600);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
