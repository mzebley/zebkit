<script lang="ts">
  import type { ColorFamilyData } from '$data/color-families';

  let { family }: { family: ColorFamilyData } = $props();
</script>

<div class="ramp" role="list" aria-label="{family.family} color ramp">
  {#each family.steps as step (step.step)}
    <div class="swatch" role="listitem" style="background: var({step.cssVar})" data-on={step.onColor}>
      <span class="step">{step.step}</span>
      <code class="var">{step.cssVar}</code>
      <code class="ref">{step.value}</code>
    </div>
  {/each}
</div>

<style>
  .ramp {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: var(--zbk-spacing-1);
  }

  .swatch {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
    min-height: var(--zbk-spacing-card, 6rem);
    padding: var(--zbk-spacing-2);
    border-radius: var(--zbk-border-radius-sm);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    justify-content: flex-end;
  }

  /* Heuristic legible foreground — light steps take dark ink, dark steps take light ink. */
  .swatch[data-on='dark'] {
    color: var(--zbk-app-ink);
  }
  .swatch[data-on='light'] {
    color: var(--zbk-app-canvas);
  }

  .step {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-md);
    font-weight: var(--zbk-font-weight-bold);
  }

  .var,
  .ref {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    word-break: break-all;
    opacity: var(--zbk-opacity-80, 0.8);
  }
</style>
