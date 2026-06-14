<script lang="ts">
  import type { TokenRow } from '$utils/token-docs';
  import { getCssVarForReference } from '$utils/token-lookup';

  let { rows = [], showSwatch = true }: { rows?: TokenRow[]; showSwatch?: boolean } = $props();

  function swatchVar(row: TokenRow): string | null {
    if (!showSwatch || row.type !== 'color') return null;
    return getCssVarForReference(row.value) ?? getCssVarForReference(row.token);
  }
</script>

<div class="token-table-scroll">
  <table class="token-table">
    <thead>
      <tr>
        <th>Token</th>
        <th>Type</th>
        <th>Value</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.token)}
        {@const cssVar = swatchVar(row)}
        <tr>
          <td><code class="tok">{row.token}</code></td>
          <td><code class="type">{row.type}</code></td>
          <td>
            <div class="value-cell">
              {#if cssVar}
                <span class="swatch" style="background: var({cssVar})" aria-hidden="true" title={cssVar}></span>
              {/if}
              <code class="val">{String(row.value)}</code>
            </div>
          </td>
          <td class="desc">{row.description}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .token-table-scroll {
    overflow-x: auto;
  }

  .token-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--zbk-font-size-sm);
  }

  th {
    text-align: left;
    font-family: var(--zbk-font-family-body);
    font-weight: var(--zbk-font-weight-semibold);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    padding: var(--zbk-spacing-1) var(--zbk-spacing-2);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    white-space: nowrap;
  }

  td {
    padding: var(--zbk-spacing-1) var(--zbk-spacing-2);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    vertical-align: top;
  }

  tbody tr:hover {
    background: var(--zbk-app-canvas-muted);
  }

  code {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
  }

  .tok {
    color: var(--zbk-app-ink);
  }

  .type {
    color: var(--zbk-app-ink-soft);
  }

  .value-cell {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-1);
  }

  .swatch {
    width: var(--zbk-spacing-2);
    height: var(--zbk-spacing-2);
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    flex-shrink: 0;
  }

  .val {
    color: var(--zbk-app-ink);
  }

  .desc {
    color: var(--zbk-app-ink-soft);
    font-size: var(--zbk-font-size-xs);
    max-width: 40ch;
  }
</style>
