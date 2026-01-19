<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = 'Token alias lookup';
  export let description: string | undefined = undefined;
  export let prefix: string = '';
  export let label: string = 'Token alias';
  export let lookupHref: string = '/zebkit/token-lookup.json';

  let lookupData: Record<string, string> = {};
  let filteredTokens: Array<[string, string]> = [];
  let selectedAlias: string = '';
  let selectedCssVar: string = '';
  let loading: boolean = true;

  onMount(async () => {
    await loadLookupData();
  });

  async function loadLookupData() {
    try {
      const response = await fetch(lookupHref);
      lookupData = await response.json();

      filteredTokens = Object.entries(lookupData)
        .filter(([key]) => (prefix ? key.startsWith(prefix) : true))
        .sort(([a], [b]) => a.localeCompare(b));

      loading = false;

      if (filteredTokens.length > 0) {
        selectToken(filteredTokens[0][0]);
      }
    } catch (error) {
      console.error('Failed to load token lookup:', error);
      loading = false;
    }
  }

  function selectToken(alias: string) {
    selectedAlias = alias;
    selectedCssVar = lookupData[alias] || '';
  }
</script>

<section class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
  <header>
    <h3 class="text-lg font-semibold ink-app-strong">{title}</h3>
    {#if description}
      <p class="text-sm ink-app-muted mt-1">{description}</p>
    {/if}
  </header>

  <label class="flex flex-col gap-2">
    <span class="text-sm font-medium ink-app-strong">{label}</span>
    <select
      bind:value={selectedAlias}
      on:change={(event) => selectToken((event.currentTarget as HTMLSelectElement).value)}
      disabled={loading}
      class="p-2 rounded border border-app-muted canvas-app ink-app"
    >
      {#if loading}
        <option>Loading {label.toLowerCase()}...</option>
      {:else}
        {#each filteredTokens as [alias]}
          <option value={alias}>{alias}</option>
        {/each}
      {/if}
    </select>
  </label>

  <div
    class="grid gap-3 canvas-app rounded-lg p-3 border border-app-muted"
    style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));"
  >
    <div>
      <span class="text-xs ink-app-muted block mb-1">Reference</span>
      <code class="block text-sm ink-app-strong">{selectedAlias || '-'}</code>
    </div>
    <div>
      <span class="text-xs ink-app-muted block mb-1">CSS custom property</span>
      <code class="block text-sm break-all ink-app-strong">
        {selectedCssVar ? `var(${selectedCssVar})` : 'var(--zbk-...)'}
      </code>
    </div>
  </div>

  {#if !loading}
    <p class="text-xs ink-app-muted">
      Showing {filteredTokens.length} token{filteredTokens.length === 1 ? '' : 's'}
      {#if prefix}with prefix "{prefix}"{/if}
    </p>
  {/if}
</section>
