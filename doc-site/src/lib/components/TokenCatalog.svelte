<script lang="ts">
  import TokenTable from './TokenTable.svelte';
  import { tokenGroups, tokenTypes, totalTokenCount } from '$data/token-catalog';

  let query = $state('');
  let typeFilter = $state('');

  const filtered = $derived(
    tokenGroups
      .map((group) => {
        const q = query.trim().toLowerCase();
        const rows = group.rows.filter((r) => {
          const matchesType = !typeFilter || r.type === typeFilter;
          const matchesQuery =
            !q ||
            r.token.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            String(r.value).toLowerCase().includes(q);
          return matchesType && matchesQuery;
        });
        return { ...group, rows };
      })
      .filter((group) => group.rows.length > 0)
  );

  const shownCount = $derived(filtered.reduce((n, g) => n + g.rows.length, 0));
</script>

<div class="catalog">
  <div class="controls">
    <label class="field">
      <span class="field-label">Search tokens</span>
      <input
        type="search"
        bind:value={query}
        placeholder="name, value, or description…"
        aria-label="Search tokens"
      />
    </label>
    <label class="field">
      <span class="field-label">Type</span>
      <select bind:value={typeFilter} aria-label="Filter by token type">
        <option value="">All types</option>
        {#each tokenTypes as t (t)}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </label>
    <p class="count" aria-live="polite">{shownCount} of {totalTokenCount} tokens</p>
  </div>

  {#if filtered.length === 0}
    <p class="empty">No tokens match your filters.</p>
  {:else}
    {#each filtered as group (group.key)}
      <section class="group">
        <h2 class="group-label">
          {group.label}
          <code class="group-key">{group.key}</code>
        </h2>
        <TokenTable rows={group.rows} />
      </section>
    {/each}
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--zbk-spacing-2);
    margin-bottom: var(--zbk-spacing-4);
    padding-bottom: var(--zbk-spacing-2);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .field-label {
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink-subtle);
  }

  input,
  select {
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-app-ink);
    background: var(--zbk-app-canvas);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    padding: var(--zbk-spacing-05) var(--zbk-spacing-1);
  }

  input[type='search'] {
    min-width: 22ch;
  }

  .count {
    margin: 0 0 0 auto;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }

  .group {
    margin-bottom: var(--zbk-spacing-5);
  }

  .group-label {
    display: flex;
    align-items: baseline;
    gap: var(--zbk-spacing-1);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-md);
    font-weight: var(--zbk-font-weight-semibold);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .group-key {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }

  .empty {
    color: var(--zbk-app-ink-subtle);
  }
</style>
