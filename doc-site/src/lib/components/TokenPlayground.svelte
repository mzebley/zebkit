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
  class="canvas-app-subtle border-solid border-width-xs border-app-muted radius-md padding-105 display-flex flex-direction-column gap-1"
  data-scope-selector={scopeSelector}
>
  <div class="display-flex flex-wrap align-items-center justify-content-between gap-1">
    <div>
      <p class="text-xs text-uppercase letter-spacing-wider margin-block-end-025 ink-app-muted">Live overrides</p>
      <h3 class="text-lg text-semibold ink-app-emphasis">{title}</h3>
      {#if description}
        <p class="text-sm ink-app-muted margin-block-start-025">{description}</p>
      {/if}
    </div>
    <div class="display-flex gap-05">
      <button
        type="button"
        on:click={resetAll}
        class="playground-action padding-inline-1 padding-block-05 canvas-app-muted hover:canvas-app-emphasis radius-sm ink-app text-medium text-sm"
      >
        Reset all
      </button>
      <button
        type="button"
        on:click={copyCSS}
        class="playground-action padding-inline-1 padding-block-05 canvas-action hover:canvas-action-emphasis radius-sm ink-action-inverse text-medium text-sm"
      >
        Copy CSS
      </button>
    </div>
  </div>

  <div class="display-grid gap-1" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <div class="display-flex flex-direction-column gap-1">
      {#each groups as group}
        <div class="display-flex flex-direction-column gap-05">
          <h4 class="text-sm text-semibold ink-app-emphasis">{group.label}</h4>
          {#each group.controls || [] as control}
            <label class="display-flex flex-direction-column gap-025">
              <span class="text-xs ink-app-muted">{control.label}</span>
              {#if control.type === 'color'}
                <input
                  type="color"
                  value={control.default}
                  on:input={(event) =>
                    updateToken(control.token, (event.currentTarget as HTMLInputElement).value)}
                  class="height-205 width-full radius-sm border-solid border-width-xs border-app-muted cursor-pointer"
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
                  class="width-full"
                />
              {:else}
                <input
                  type="text"
                  value={control.default}
                  on:input={(event) =>
                    updateToken(control.token, (event.currentTarget as HTMLInputElement).value)}
                  class="padding-05 radius-sm border-solid border-width-xs border-app-muted canvas-app ink-app"
                />
              {/if}
            </label>
          {/each}
        </div>
      {/each}
    </div>

    <div
      bind:this={scopeElement}
      class="border-dashed border-width-sm border-app-muted radius-md padding-1 canvas-app-subtle"
    >
      <slot />
    </div>
  </div>
</section>

<style>
  .playground-action {
    transition:
      color var(--zbk-transition-calm-fx-duration-default) var(--zbk-transition-calm-fx-function-default),
      background-color var(--zbk-transition-calm-fx-duration-default) var(--zbk-transition-calm-fx-function-default);
  }
</style>
