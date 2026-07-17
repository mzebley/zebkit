<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import UtilityTable from '$lib/components/UtilityTable.svelte';

  let { data } = $props();
</script>

<ReferenceLayout title={data.manifest.name} description={data.manifest.description}>
  <p class="back"><a href="/utilities">← All utilities</a></p>
  <h1 class="page-title">{data.manifest.name}</h1>
  <p class="banner">Generated from the linted manifest — verified on every build.</p>
  <p class="lede">{data.manifest.description}</p>

  {#each data.manifest.families as family (family.name)}
    <UtilityTable {family} />
  {/each}
</ReferenceLayout>

<style>
  .back {
    margin: 0 0 var(--zbk-spacing-2);
    font-size: var(--zbk-font-size-sm);
  }

  .back a {
    color: var(--zbk-app-ink-subtle);
    text-decoration: none;
  }

  .back a:hover {
    color: var(--zbk-accent-primary-600);
  }

  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .banner {
    display: inline-block;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-accent-primary-600);
    border: var(--zbk-border-width-xs) solid var(--zbk-accent-primary-600);
    border-radius: var(--zbk-border-radius-xs);
    padding: var(--zbk-spacing-025) var(--zbk-spacing-1);
    margin: 0 0 var(--zbk-spacing-2);
  }

  .lede {
    color: var(--zbk-app-ink-subtle);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }
</style>
