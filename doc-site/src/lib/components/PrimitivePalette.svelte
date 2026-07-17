<script lang="ts">
  import { primitivePalette, onColor, type PrimitiveFamily } from '$data/primitive-palette';

  let { families = primitivePalette.families }: { families?: PrimitiveFamily[] } = $props();

  /** Families under this saturation read as the muted register (dusk, stone, sea-glass, ...). */
  const MUTED_MAX_SATURATION = 50;

  const byHue = (a: PrimitiveFamily, b: PrimitiveFamily) =>
    a.hue - b.hue || a.saturation - b.saturation;

  const vivid = $derived(
    families.filter((f) => f.saturation >= MUTED_MAX_SATURATION).toSorted(byHue)
  );
  const muted = $derived(
    families.filter((f) => f.saturation < MUTED_MAX_SATURATION).toSorted(byHue)
  );

  const registers = $derived(
    [
      {
        key: 'vivid',
        label: 'Vivid register',
        blurb: 'Full-saturation hues, ordered around the wheel.',
        families: vivid
      },
      {
        key: 'muted',
        label: 'Muted register',
        blurb: 'Low-saturation counterparts for quiet surfaces, tags, and chrome.',
        families: muted
      }
    ].filter((r) => r.families.length > 0)
  );

  let copied = $state('');

  async function copyVar(cssVar: string) {
    try {
      await navigator.clipboard.writeText(cssVar);
      copied = cssVar;
    } catch {
      copied = '';
    }
  }
</script>

<div class="palette">
  {#each registers as register (register.key)}
    <section class="register" aria-label={register.label}>
      {#if registers.length > 1}
        <header class="register-head">
          <h2 class="register-name">{register.label}</h2>
          <p class="register-blurb">{register.blurb}</p>
        </header>
      {/if}

      <div class="scale-head" aria-hidden="true">
        <span class="scale-spacer"></span>
        <span class="scale-steps">
          {#each primitivePalette.steps as step (step)}
            <span class="scale-step">{step}</span>
          {/each}
        </span>
      </div>

      {#each register.families as fam (fam.name)}
        <div class="family" id={`family-${fam.name}`}>
          <header class="family-head">
            <span class="family-name">{fam.name}</span>
            <span class="family-meta">{fam.hue}&deg; &middot; {fam.saturation}%</span>
          </header>
          <div class="ramp" role="group" aria-label={`${fam.name} lightness ramp`}>
            {#each fam.swatches as sw (sw.step)}
              <button
                type="button"
                class="swatch"
                style={`background: var(${sw.cssVar})`}
                data-on={onColor(sw.lightness)}
                title={`${sw.cssVar} — ${sw.hsl}`}
                aria-label={`Copy ${sw.cssVar} (${sw.hsl})`}
                onclick={() => copyVar(sw.cssVar)}
              ></button>
            {/each}
          </div>
        </div>
      {/each}
    </section>
  {/each}

  {#if primitivePalette.globals.length}
    <section class="register" aria-label="Global colors">
      <header class="register-head">
        <h2 class="register-name">Globals</h2>
        <p class="register-blurb">Scale-less anchors shared by every theme.</p>
      </header>
      <div class="globals">
        {#each primitivePalette.globals as g (g.name)}
          <button
            type="button"
            class="global"
            title={`${g.cssVar} — ${g.value}`}
            aria-label={`Copy ${g.cssVar} (${g.value})`}
            onclick={() => copyVar(g.cssVar)}
          >
            <span class="global-chip" style={`background: var(${g.cssVar})`} aria-hidden="true"
            ></span>
            <span class="global-name">{g.name.replace('global-', '')}</span>
            <code class="global-value">{g.value}</code>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <p class="copy-status" role="status" aria-live="polite" data-visible={copied !== ''}>
    {#if copied}Copied <code>{copied}</code>{/if}
  </p>
</div>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-3);
  }

  .register {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .register-head {
    margin-bottom: var(--zbk-spacing-05);
  }

  .register-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    font-weight: var(--zbk-font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-2, 0.05em);
    color: var(--zbk-app-ink-muted);
    margin: 0;
  }

  .register-blurb {
    margin: var(--zbk-spacing-025) 0 0;
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-app-ink-subtle);
    max-width: var(--zbk-text-measure-3, 65ch);
  }

  /* Shared two-column template: family label rail + eleven-step ramp. */
  .scale-head,
  .family {
    display: grid;
    grid-template-columns: minmax(8rem, 11rem) 1fr;
    gap: var(--zbk-spacing-1);
    align-items: center;
  }

  .scale-steps,
  .ramp {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: var(--zbk-spacing-025);
  }

  .scale-step {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
    text-align: center;
  }

  .family-head {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .family-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
  }

  .family-meta {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
  }

  .ramp {
    border-radius: var(--zbk-border-radius-sm);
    overflow: hidden;
  }

  .swatch {
    appearance: none;
    border: none;
    margin: 0;
    padding: 0;
    min-height: var(--zbk-spacing-205, 2.5rem);
    cursor: pointer;
    /* Hairline ring keeps near-canvas steps (dusk-900 on a dark theme) visible. */
    box-shadow: inset 0 0 0 var(--zbk-border-width-xs, 1px) var(--zbk-app-border);
  }

  .swatch[data-on='dark'] {
    color: var(--zbk-color-global-white);
  }
  .swatch[data-on='light'] {
    color: var(--zbk-color-global-black);
  }

  /* currentColor tracks the legible ink for the step, so the ring reads on any swatch. */
  .swatch:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -4px;
  }

  .swatch:hover {
    box-shadow: inset 0 0 0 2px currentColor;
  }

  .globals {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05);
  }

  .global {
    appearance: none;
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    background: none;
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    cursor: pointer;
    color: var(--zbk-app-ink);
  }

  .global:hover {
    border-color: var(--zbk-app-border-emphasis);
  }

  .global-chip {
    width: var(--zbk-spacing-105, 1.5rem);
    height: var(--zbk-spacing-105, 1.5rem);
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .global-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-semibold);
  }

  .global-value {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
  }

  .copy-status {
    position: sticky;
    bottom: var(--zbk-spacing-05);
    align-self: flex-start;
    margin: 0;
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    border-radius: var(--zbk-border-radius-sm);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    background: var(--zbk-app-canvas);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    visibility: hidden;
  }

  .copy-status[data-visible='true'] {
    visibility: visible;
  }

  .copy-status code {
    font-family: var(--zbk-font-family-code);
    color: var(--zbk-app-ink);
  }

  @media (max-width: 48rem) {
    .scale-head,
    .family {
      grid-template-columns: 1fr;
      gap: var(--zbk-spacing-025);
    }

    .scale-spacer {
      display: none;
    }

    .family-head {
      flex-direction: row;
      align-items: baseline;
      gap: var(--zbk-spacing-05);
      margin-top: var(--zbk-spacing-05);
    }

    .swatch {
      min-height: var(--zbk-spacing-105, 1.5rem);
    }
  }
</style>
