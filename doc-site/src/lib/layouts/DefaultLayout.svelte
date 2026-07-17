<script lang="ts">
  import OnThisPage from '$lib/components/OnThisPage.svelte';

  interface Props {
    title?: string;
    description?: string;
    children?: any;
  }

  let { title = '', description = '', children }: Props = $props();
</script>

<svelte:head>
  <title>{title} | zebkit</title>
  <meta name="description" content={description} />
</svelte:head>

<div class="editorial-root">
  <div class="editorial-frame">
    <OnThisPage />
    <article class="default-article">
      {#if title}
        <header class="default-header">
          <h1>{title}</h1>
          {#if description}
            <p>{description}</p>
          {/if}
        </header>
      {/if}

      <div class="prose-zebkit">
        {@render children?.()}
      </div>
    </article>
  </div>
</div>

<style>
  .default-article {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-2);
  }

  .default-header {
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    padding-block-end: var(--zbk-spacing-105);
  }

  .default-header h1 {
    font-size: var(--zbk-font-size-4xl);
    font-weight: var(--zbk-font-weight-bold);
    color: var(--zbk-app-ink-emphasis);
    line-height: var(--zbk-line-height-1);
    margin-block: 0 var(--zbk-spacing-05);
  }

  .default-header p {
    font-size: var(--zbk-font-size-lg);
    color: var(--zbk-app-ink-muted);
    margin-block: 0;
    max-inline-size: var(--zbk-text-measure-3);
  }

  :global(.prose-zebkit) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--zbk-spacing-1);
  }

  :global(.prose-zebkit h2) {
    font-size: var(--zbk-font-size-2xl);
    font-weight: var(--zbk-font-weight-bold);
    color: var(--zbk-app-ink);
    line-height: var(--zbk-line-height-2);
    margin-block: var(--zbk-spacing-3) 0;
  }

  :global(.prose-zebkit h3) {
    font-size: var(--zbk-font-size-xl);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
    line-height: var(--zbk-line-height-2);
    margin-block: var(--zbk-spacing-2) 0;
  }

  :global(.prose-zebkit p) {
    font-size: var(--zbk-p-font-size);
    line-height: var(--zbk-p-line-height);
    color: var(--zbk-p-color);
    max-inline-size: var(--zbk-p-measure);
    margin-block: 0;
  }

  :global(.prose-zebkit :is(ul, ol)) {
    font-size: var(--zbk-p-font-size);
    line-height: var(--zbk-p-line-height);
    color: var(--zbk-p-color);
    max-inline-size: var(--zbk-p-measure);
    margin-block: 0;
    padding-inline-start: var(--zbk-spacing-105);
  }

  :global(.prose-zebkit li + li) {
    margin-block-start: var(--zbk-spacing-05);
  }

  :global(.prose-zebkit pre) {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    line-height: var(--zbk-line-height-3);
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas-muted);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border-subtle);
    border-radius: var(--zbk-border-radius-sm);
    overflow-x: auto;
    tab-size: 2;
    align-self: stretch;
    margin-block: 0;
  }

  :global(.prose-zebkit :not(pre) > code) {
    font-family: var(--zbk-font-family-code);
    font-size: 0.875em;
    background: var(--zbk-app-canvas-muted);
    padding: 0.1em 0.35em;
    border-radius: var(--zbk-border-radius-sm);
  }

  :global(.prose-zebkit a) {
    color: var(--zbk-action-ink);
    text-decoration: underline;
  }

  :global(.prose-zebkit a:hover) {
    color: var(--zbk-action-ink-emphasis);
  }
</style>
