<script lang="ts">
  import type { TokenRow } from '$utils/token-docs';
  import { getCssVarForReference } from '$utils/token-lookup';

  let {
    rows = [],
    showSwatch = true,
    pageSize = 10
  }: { rows?: TokenRow[]; showSwatch?: boolean; pageSize?: number } = $props();

  let page = $state(1);

  const pageCount = $derived(Math.max(1, Math.ceil(rows.length / pageSize)));
  // Filters upstream (e.g. the token catalog search) can shrink rows under us.
  const clampedPage = $derived(Math.min(page, pageCount));
  const pagedRows = $derived(
    rows.length > pageSize
      ? rows.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)
      : rows
  );

  function handlePageChange(event: Event) {
    page = (event as CustomEvent<{ page: number }>).detail.page;
  }

  function swatchVar(row: TokenRow): string | null {
    if (!showSwatch || row.type !== 'color') return null;
    return getCssVarForReference(row.value) ?? getCssVarForReference(row.token);
  }

  // The compiled CSS custom property for a row (`zbk-spacing.4` -> `--zbk-spacing-4`),
  // so the inspector rail can trace it through the strata.
  function inspectVar(row: TokenRow): string {
    return `--${row.token.replaceAll('.', '-')}`;
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
      {#each pagedRows as row (row.token)}
        {@const cssVar = swatchVar(row)}
        <tr>
          <td><code class="tok" data-inspect-token={inspectVar(row)}>{row.token}</code></td>
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

{#if pageCount > 1}
  <div class="pagination-row">
    <zbk-pagination
      variant="sm"
      current={clampedPage}
      total={pageCount}
      aria-label="Token table pages"
      on:zbk-page-change={handlePageChange}
    ></zbk-pagination>
    <p class="pagination-count">
      {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, rows.length)} of {rows.length} tokens
    </p>
  </div>
{/if}

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
    color: var(--zbk-app-ink-subtle);
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
    color: var(--zbk-app-ink-subtle);
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
    color: var(--zbk-app-ink-subtle);
    font-size: var(--zbk-font-size-xs);
    max-width: 40ch;
  }

  .pagination-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--zbk-spacing-2);
    margin-top: var(--zbk-spacing-2);
  }

  .pagination-count {
    margin: 0;
    color: var(--zbk-app-ink-subtle);
    font-size: var(--zbk-font-size-xs);
  }
</style>
