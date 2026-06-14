<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import TokenCatalog from '$lib/components/TokenCatalog.svelte';
</script>

<ReferenceLayout
  title="Tokens"
  description="Browse every compiled zebkit token — primitive, alias, and component — generated from the synced token set."
>
  <h1 class="page-title">Token catalog</h1>
  <p class="lede">
    Every token in the compiled theme, grouped by namespace. Filter by name, value, or type. This
    catalog is generated from the synced token set, so it can't drift from what ships.
  </p>
  <TokenCatalog />
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
</style>
