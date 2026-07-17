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

<section class="border-solid border-width-xs border-app-muted radius-md padding-1 display-flex flex-direction-column gap-05 canvas-app-subtle">
  <header>
    <h3 class="text-lg text-semibold ink-app-emphasis">{title}</h3>
    {#if description}
      <p class="text-sm ink-app-muted margin-block-start-025">{description}</p>
    {/if}
  </header>

  <label class="display-flex flex-direction-column gap-05">
    <span class="text-sm text-medium ink-app-emphasis">{label}</span>
    <select
      bind:value={selectedAlias}
      on:change={(event) => selectToken((event.currentTarget as HTMLSelectElement).value)}
      disabled={loading}
      class="padding-05 radius-sm border-solid border-width-xs border-app-muted canvas-app ink-app"
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
    class="display-grid gap-05 canvas-app radius-md padding-1 border-solid border-width-xs border-app-muted"
    style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));"
  >
    <div>
      <span class="text-xs ink-app-muted display-block margin-block-end-025">Reference</span>
      <code class="display-block text-sm ink-app-emphasis">{selectedAlias || '-'}</code>
    </div>
    <div>
      <span class="text-xs ink-app-muted display-block margin-block-end-025">CSS custom property</span>
      <code class="display-block text-sm word-break-all ink-app-emphasis">
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
