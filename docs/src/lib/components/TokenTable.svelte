<script lang="ts">
  import type { TokenRow } from '$utils/token-docs';
  import { getCssVarForReference } from '$utils/token-lookup';

  export let rows: TokenRow[] = [];
  export let showColorSwatches: boolean = true;

  let className: string = '';
  export { className as class };
</script>

<div class="overflow-x-auto {className}">
  <table class="w-full border-collapse canvas-app-soft rounded-lg overflow-hidden">
    <thead class="canvas-app-muted">
      <tr>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Token
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Type
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Value
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Description
        </th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { token, type, value, description }}
        {@const cssVar = showColorSwatches && type === 'color'
          ? getCssVarForReference(value) ?? getCssVarForReference(token)
          : null}
        <tr class="hover:canvas-app-muted transition-colors">
          <td class="p-3 border-b border-app-muted">
            <code class="text-sm font-mono ink-app-strong">{token}</code>
          </td>
          <td class="p-3 border-b border-app-muted">
            <code class="text-sm font-mono ink-app-muted">{type}</code>
          </td>
          <td class="p-3 border-b border-app-muted">
            <div class="flex items-center gap-2">
              {#if cssVar}
                <span
                  class="w-6 h-6 rounded border border-app-muted inline-block flex-shrink-0"
                  style="background: var({cssVar})"
                  aria-hidden="true"
                  title="Preview of {cssVar}"
                ></span>
              {/if}
              <code class="text-sm font-mono ink-app">{String(value)}</code>
            </div>
          </td>
          <td class="p-3 border-b border-app-muted text-sm ink-app">
            {description}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
