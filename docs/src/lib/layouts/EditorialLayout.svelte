<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Frontmatter } from '$lib/types/frontmatter';

  // Content-register layout (editorial / narrative). The app shell (TopBar +
  // LeftNav) is provided by the root +layout.svelte; this wraps page content only.
  // Applied per page via mdsvex frontmatter `layout: editorial` (also the default).
  type Props = Partial<Frontmatter> & {
    children?: Snippet;
    marginalia?: Snippet;
  };

  let { title = '', description = '', children, marginalia }: Props = $props();
</script>

<svelte:head>
  {#if title}<title>{title} | zebkit</title>{/if}
  {#if description}<meta name="description" content={description} />{/if}
</svelte:head>

<article class="editorial-root">
  <div class="editorial-main">
    {@render children?.()}
  </div>
  {#if marginalia}
    <aside class="editorial-marginalia">
      {@render marginalia()}
    </aside>
  {/if}
</article>
