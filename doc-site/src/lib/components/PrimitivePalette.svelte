<script lang="ts">
  import { primitivePalette, onColor, type PrimitiveFamily } from '$data/primitive-palette';

  let { families = primitivePalette.families }: { families?: PrimitiveFamily[] } = $props();
</script>

<div class="palette">
  {#each families as fam (fam.name)}
    <section class="family" aria-label="{fam.name} palette">
      <header class="family-head">
        <h2 class="family-name">{fam.name}</h2>
        <span class="family-meta">hue {fam.hue} · sat {fam.saturation}%</span>
      </header>
      <div class="ramp" role="list">
        {#each fam.swatches as sw (sw.step)}
          <div
            class="swatch"
            role="listitem"
            style="background: var({sw.cssVar})"
            data-on={onColor(sw.lightness)}
          >
            <span class="step">{sw.step}</span>
            <code class="hsl">{sw.hsl}</code>
          </div>
        {/each}
      </div>
    </section>
  {/each}

  {#if primitivePalette.globals.length}
    <section class="family" aria-label="global colors">
      <header class="family-head">
        <h2 class="family-name">global</h2>
        <span class="family-meta">scale-less</span>
      </header>
      <div class="ramp ramp-globals" role="list">
        {#each primitivePalette.globals as g (g.name)}
          <div class="swatch swatch-global" role="listitem" style="background: var({g.cssVar})">
            <span class="step">{g.name.replace('global-', '')}</span>
            <code class="hsl">{g.value}</code>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-4);
  }

  .family-head {
    display: flex;
    align-items: baseline;
    gap: var(--zbk-spacing-2);
    margin-bottom: var(--zbk-spacing-1);
  }

  .family-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-md);
    margin: 0;
  }

  .family-meta {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
  }

  .ramp {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: var(--zbk-spacing-025);
    border-radius: var(--zbk-border-radius-sm);
    overflow: hidden;
  }

  .ramp-globals {
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--zbk-spacing-1);
  }

  .swatch {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
    min-height: var(--zbk-spacing-7, 3.5rem);
    padding: var(--zbk-spacing-1);
    justify-content: flex-end;
  }

  .swatch-global {
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
  }

  .swatch[data-on='dark'] {
    color: var(--zbk-color-global-white);
  }
  .swatch[data-on='light'] {
    color: var(--zbk-color-global-black);
  }

  .step {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    font-weight: var(--zbk-font-weight-bold);
  }

  .hsl {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-3xs, 0.625rem);
    line-height: 1.1;
    word-break: break-all;
    opacity: var(--zbk-opacity-80, 0.85);
  }

  /* On narrow viewports the 11-up ramp gets too tight for legible labels. */
  @media (max-width: 60rem) {
    .hsl {
      display: none;
    }
    .swatch {
      min-height: var(--zbk-spacing-6, 2.5rem);
    }
  }
</style>
