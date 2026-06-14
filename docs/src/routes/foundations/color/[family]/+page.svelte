<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import ColorFamily from '$lib/components/ColorFamily.svelte';
  import { colorFamilySlugs } from '$data/color-families';

  let { data } = $props();
</script>

<ReferenceLayout
  title={`${data.family.family} — color family`}
  description={`The ${data.family.family} color ramp and its token names.`}
>
  <h1 class="page-title">{data.family.family}</h1>
  <p class="lede">
    The <code>{data.family.key}</code> ramp — eleven steps, each an alias onto a primitive.
    Swatches render the live token, so this page re-skins with the theme.
  </p>

  <ColorFamily family={data.family} />

  <nav class="family-nav" aria-label="Other color families">
    {#each colorFamilySlugs as slug (slug)}
      <a href={`/foundations/color/${slug}`} aria-current={slug === data.family.family ? 'page' : undefined}>
        {slug}
      </a>
    {/each}
  </nav>
</ReferenceLayout>

<style>
  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .lede {
    color: var(--zbk-app-ink-soft);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }

  .lede code {
    font-family: var(--zbk-font-family-code);
  }

  .family-nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-1);
    margin-top: var(--zbk-spacing-5);
    padding-top: var(--zbk-spacing-2);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .family-nav a {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
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
