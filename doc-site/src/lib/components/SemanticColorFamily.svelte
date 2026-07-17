<script lang="ts">
  import type {
    SemanticColorFamilyData,
    SemanticSwatch,
    ColorVariant,
    ColorIntensity
  } from '$data/color-families';

  let { family }: { family: SemanticColorFamilyData } = $props();

  const ROLE_LABEL: Record<string, string> = {
    canvas: 'Canvas',
    ink: 'Ink',
    border: 'Border'
  };

  const ROLE_BLURB: Record<string, string> = {
    canvas: 'Backgrounds and surfaces.',
    ink: 'Text and icons.',
    border: 'Outlines, strokes, and dividers.'
  };

  const VARIANT_LABEL: Record<ColorVariant, string> = {
    base: 'Base',
    inverse: 'Inverse — for dark / inverted surfaces'
  };

  const VARIANTS: ColorVariant[] = ['base', 'inverse'];
  const INTENSITY_ORDER: ColorIntensity[] = ['base', 'subtle', 'muted', 'emphasis'];

  function byIntensity(swatches: SemanticSwatch[], variant: ColorVariant): SemanticSwatch[] {
    return swatches
      .filter((s) => s.variant === variant)
      .sort((a, b) => INTENSITY_ORDER.indexOf(a.intensity) - INTENSITY_ORDER.indexOf(b.intensity));
  }
</script>

<div class="family">
  {#each family.roles as group (group.role)}
    <section class="role" aria-label="{family.family} {group.role}">
      <header class="role-head">
        <h2 class="role-title">{ROLE_LABEL[group.role] ?? group.role}</h2>
        <p class="role-blurb">{ROLE_BLURB[group.role] ?? ''}</p>
      </header>

      {#each VARIANTS as variant (variant)}
        {@const swatches = byIntensity(group.swatches, variant)}
        {#if swatches.length}
          <h3 class="variant-title">{VARIANT_LABEL[variant]}</h3>
          <div class="row" data-variant={variant} data-role={group.role}>
            {#each swatches as s (s.slot)}
              <div class="cell" class:unset={!s.filled}>
                {#if s.filled}
                  {#if group.role === 'canvas'}
                    <div class="demo demo-canvas" style="background: var({s.cssVar})"></div>
                  {:else if group.role === 'ink'}
                    <div class="demo demo-ink"><span style="color: var({s.cssVar})">Aa</span></div>
                  {:else}
                    <div class="demo demo-border" style="border-color: var({s.cssVar})"></div>
                  {/if}
                {:else}
                  <div class="demo demo-unset" aria-hidden="true">not set</div>
                {/if}
                <span class="intensity">{s.intensity}</span>
                <code class="var">{s.cssVar}</code>
                <code class="ref">{s.value || '—'}</code>
              </div>
            {/each}
          </div>
        {/if}
      {/each}
    </section>
  {/each}
</div>

<style>
  .family {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-5);
  }

  .role-head {
    margin-bottom: var(--zbk-spacing-2);
  }

  .role-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-lg);
    margin: 0;
  }

  .role-blurb {
    color: var(--zbk-app-ink-subtle);
    margin: var(--zbk-spacing-025) 0 0;
  }

  .variant-title {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-2, 0.05em);
    color: var(--zbk-app-ink-muted);
    margin: var(--zbk-spacing-3) 0 var(--zbk-spacing-1);
  }

  /* Inverse variants are meant for dark surfaces — preview them on one. */
  .row[data-variant='inverse'] {
    background: var(--zbk-app-canvas-inverse);
    border-radius: var(--zbk-border-radius-sm);
    padding: var(--zbk-spacing-2);
  }
  .row[data-variant='inverse'] .intensity {
    color: var(--zbk-app-ink-inverse);
  }
  .row[data-variant='inverse'] .var,
  .row[data-variant='inverse'] .ref {
    color: var(--zbk-app-ink-inverse-subtle);
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: var(--zbk-spacing-1);
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
  }

  .demo {
    height: var(--zbk-spacing-7, 3rem);
    border-radius: var(--zbk-border-radius-sm);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .demo-ink {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--zbk-app-canvas-subtle);
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-lg);
    font-weight: var(--zbk-font-weight-bold);
  }

  .demo-border {
    background: var(--zbk-app-canvas);
    border-width: var(--zbk-border-width-lg, 3px);
  }

  .demo-unset {
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(
      45deg,
      var(--zbk-app-canvas-muted),
      var(--zbk-app-canvas-muted) 6px,
      transparent 6px,
      transparent 12px
    );
    border-style: dashed;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
  }

  .intensity {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
  }

  .var,
  .ref {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    word-break: break-all;
    color: var(--zbk-app-ink-subtle);
  }
</style>
