<script lang="ts">
  export let title: string = '';
  export let description: string = '';
</script>

<svelte:head>
  <title>{title} | zebkit</title>
  <meta name="description" content={description} />
</svelte:head>

<article class="flex flex-col gap-6">
  {#if title}
    <header class="border-b border-app-muted pb-6">
      <h1 class="text-4xl font-bold ink-app-strong mb-2">{title}</h1>
      {#if description}
        <p class="text-lg ink-app-muted">{description}</p>
      {/if}
    </header>
  {/if}

  <div class="prose-zebkit">
    <slot />
  </div>
</article>

<style>
  :global(.prose-zebkit) {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-4);
  }

  :global(.prose-zebkit h2) {
    font-size: var(--zbk-font-size-2xl);
    font-weight: var(--zbk-font-weight-bold);
    color: var(--zbk-app-ink);
    margin-top: var(--zbk-spacing-8);
    margin-bottom: var(--zbk-spacing-4);
  }

  :global(.prose-zebkit h3) {
    font-size: var(--zbk-font-size-xl);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
    margin-top: var(--zbk-spacing-6);
    margin-bottom: var(--zbk-spacing-3);
  }

  :global(.prose-zebkit p) {
    font-size: var(--zbk-font-size-md);
    color: var(--zbk-app-ink);
    line-height: var(--zbk-line-height-relaxed);
  }

  :global(.prose-zebkit code) {
    background: var(--zbk-app-canvas-muted);
    padding: 0.125rem 0.25rem;
    border-radius: var(--zbk-radius-sm);
    font-size: var(--zbk-font-size-sm);
    font-family: var(--zbk-font-family-mono);
  }

  :global(.prose-zebkit a) {
    color: var(--zbk-action);
    text-decoration: underline;
  }

  :global(.prose-zebkit a:hover) {
    color: var(--zbk-action-strong);
  }
</style>
