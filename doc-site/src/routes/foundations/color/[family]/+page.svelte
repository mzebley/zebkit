<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import ColorFamily from '$lib/components/ColorFamily.svelte';
  import SemanticColorFamily from '$lib/components/SemanticColorFamily.svelte';
  import { colorFamilySlugs, semanticColorFamilySlugs } from '$data/color-families';

  let { data } = $props();

  const slug = $derived(data.page.family.family);
  const isRamp = $derived(data.page.kind === 'ramp');
</script>

<ReferenceLayout
  title={`${slug} — color`}
  description={isRamp
    ? `The ${slug} color ramp and its token names.`
    : `The ${slug} semantic color family — canvas, ink, and border roles.`}
>
  <a class="back" href="/foundations/color">← Color overview</a>
  <h1 class="page-title">{slug}</h1>

  {#if data.page.kind === 'ramp'}
    <p class="lede">
      The <code>{data.page.family.key}</code> ramp — eleven steps, each an alias onto a primitive.
      Swatches render the live token, so this page re-skins with the theme.
    </p>
    <ColorFamily family={data.page.family} />
  {:else}
    <p class="lede">
      The <code>{data.page.family.key}</code> family — <code>canvas</code>, <code>ink</code>, and
      <code>border</code> roles, each with intensity steps and an inverse variant for dark surfaces.
      Swatches render the live token, so this page re-skins with the theme.
    </p>
    <SemanticColorFamily family={data.page.family} />
  {/if}

  <nav class="family-nav" aria-label="Other color families">
    <span class="nav-group-label">Ramps</span>
    {#each colorFamilySlugs as s (s)}
      <a href={`/foundations/color/${s}`} aria-current={s === slug ? 'page' : undefined}>{s}</a>
    {/each}
    <span class="nav-group-label">Semantic</span>
    {#each semanticColorFamilySlugs as s (s)}
      <a href={`/foundations/color/${s}`} aria-current={s === slug ? 'page' : undefined}>{s}</a>
    {/each}
  </nav>
</ReferenceLayout>

<style>
  .back {
    display: inline-block;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    text-decoration: none;
    margin-bottom: var(--zbk-spacing-2);
  }
  .back:hover {
    color: var(--zbk-app-ink);
  }

  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .lede {
    color: var(--zbk-app-ink-subtle);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }

  .lede code {
    font-family: var(--zbk-font-family-code);
  }

  .family-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zbk-spacing-1);
    margin-top: var(--zbk-spacing-5);
    padding-top: var(--zbk-spacing-2);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .nav-group-label {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-2, 0.05em);
    color: var(--zbk-app-ink-muted);
    margin-right: var(--zbk-spacing-05);
  }
  .nav-group-label:not(:first-child) {
    margin-left: var(--zbk-spacing-2);
  }

  .family-nav a {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    text-decoration: none;
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    border-radius: var(--zbk-border-radius-xs);
  }

  .family-nav a:hover {
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
  }

  .family-nav a[aria-current='page'] {
    color: var(--zbk-accent-primary-600);
    font-weight: var(--zbk-font-weight-semibold);
  }
</style>
