<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = 'Token playground';
  export let description: string | undefined = undefined;
  export let groups: Array<{ label: string; controls?: Array<any> }>;
  export let scopeSelector: string = ':root';

  let scopeElement: HTMLElement;
  let overrides = new Map<string, string>();

  onMount(() => {
    initializePlayground();
  });

  function initializePlayground() {
    // Initialize controls based on groups when needed.
  }

  function updateToken(token: string, value: string) {
    overrides.set(token, value);
    applyOverrides();
  }

  function applyOverrides() {
    const target = scopeSelector === ':root' ? document.documentElement : scopeElement;
    if (!target) {
      return;
    }

    overrides.forEach((value, token) => {
      target.style.setProperty(token, value);
    });
  }

  function resetAll() {
    overrides.clear();
    const target = scopeSelector === ':root' ? document.documentElement : scopeElement;
    if (!target) {
      return;
    }

    groups.forEach((group) => {
      group.controls?.forEach((control: any) => {
        target.style.removeProperty(control.token);
      });
    });
  }

  function copyCSS() {
    const css = Array.from(overrides.entries())
      .map(([token, value]) => `  ${token}: ${value};`)
      .join('\n');

    const output = `${scopeSelector} {\n${css}\n}`;
    navigator.clipboard.writeText(output);
  }
</script>

<section
  class="canvas-app-soft border border-app-muted rounded-lg p-6 flex flex-col gap-5"
  data-scope-selector={scopeSelector}
>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-wider mb-1 ink-app-muted">Live overrides</p>
      <h3 class="text-lg font-semibold ink-app-strong">{title}</h3>
      {#if description}
        <p class="text-sm ink-app-muted mt-1">{description}</p>
      {/if}
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        on:click={resetAll}
        class="px-4 py-2 canvas-app-muted hover:canvas-app-strong rounded transition-colors ink-app font-medium text-sm"
      >
        Reset all
      </button>
      <button
        type="button"
        on:click={copyCSS}
        class="px-4 py-2 canvas-action hover:canvas-action-strong rounded transition-colors ink-action-inverse font-medium text-sm"
      >
        Copy CSS
      </button>
    </div>
  </div>

  <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <div class="flex flex-col gap-4">
      {#each groups as group}
        <div class="flex flex-col gap-2">
          <h4 class="text-sm font-semibold ink-app-strong">{group.label}</h4>
          {#each group.controls || [] as control}
            <label class="flex flex-col gap-1">
              <span class="text-xs ink-app-muted">{control.label}</span>
              {#if control.type === 'color'}
                <input
                  type="color"
                  value={control.default}
                  on:input={(event) =>
                    updateToken(control.token, (event.currentTarget as HTMLInputElement).value)}
                  class="h-10 w-full rounded border border-app-muted cursor-pointer"
                />
              {:else if control.type === 'range'}
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step || 1}
                  value={control.default}
                  on:input={(event) =>
                    updateToken(
                      control.token,
                      (event.currentTarget as HTMLInputElement).value + (control.unit || '')
                    )}
                  class="w-full"
                />
              {:else}
                <input
                  type="text"
                  value={control.default}
                  on:input={(event) =>
                    updateToken(control.token, (event.currentTarget as HTMLInputElement).value)}
                  class="p-2 rounded border border-app-muted canvas-app ink-app"
                />
              {/if}
            </label>
          {/each}
        </div>
      {/each}
    </div>

    <div
      bind:this={scopeElement}
      class="border-2 border-dashed border-app-muted rounded-lg p-5 canvas-app-soft"
    >
      <slot />
    </div>
  </div>
</section>
