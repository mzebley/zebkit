<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Frontmatter } from '$lib/types/frontmatter';
  import InstrumentShell from './InstrumentShell.svelte';

  // Content-register layout (instrument / reference). Dense, with a right
  // inspector rail provided by InstrumentShell. The app shell is provided by the
  // root +layout.svelte. Applied per page via mdsvex frontmatter `layout: reference`.
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

<InstrumentShell {inspector}>
  <article class="reference-article">
    {@render children?.()}
  </article>
</InstrumentShell>

<style>
  .reference-article {
    font-size: var(--zbk-font-size-sm);
    line-height: var(--zbk-line-height-3);
    min-width: 0;
  }
</style>
