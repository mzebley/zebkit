<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Frontmatter } from '$lib/types/frontmatter';

  // Content-register layout (instrument / reference). Dense, with a right
  // inspector rail. The app shell is provided by the root +layout.svelte.
  // Applied per page via mdsvex frontmatter `layout: reference`.
  type Props = Partial<Frontmatter> & {
    children?: Snippet;
    inspector?: Snippet;
  };

  let { title = '', description = '', children, inspector }: Props = $props();
</script>

<svelte:head>
  {#if title}<title>{title} | zebkit</title>{/if}
  {#if description}<meta name="description" content={description} />{/if}
</svelte:head>

<div class="reference-root">
  <article class="reference-article">
    {@render children?.()}
  </article>
  <aside class="reference-inspector">
    {#if inspector}
      {@render inspector()}
    {:else}
      <!-- TODO(Phase 4): mount the live token x-ray Inspector here. -->
      <p class="reference-inspector-placeholder">Inspector rail — wired in Phase 4.</p>
    {/if}
  </aside>
</div>

<style>
  .reference-root {
    display: grid;
    grid-template-columns: 1fr var(--zbk-spacing-card);
    gap: var(--zbk-spacing-4);
    align-items: start;
  }

  .reference-article {
    font-size: var(--zbk-font-size-sm);
    line-height: var(--zbk-line-height-3);
    min-width: 0;
  }

  .reference-inspector {
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    padding-left: var(--zbk-spacing-3);
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    position: sticky;
    top: var(--zbk-spacing-3);
  }

  .reference-inspector-placeholder {
    margin: 0;
  }

  @media (max-width: 80rem) {
    .reference-root {
      grid-template-columns: 1fr;
    }

    .reference-inspector {
      border-left: none;
      border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
      padding-left: 0;
      padding-top: var(--zbk-spacing-3);
      position: static;
    }
  }
</style>
