<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Frontmatter } from '$lib/types/frontmatter';
  import OnThisPage from '$lib/components/OnThisPage.svelte';

  // Content-register layout (editorial / narrative). The app shell (TopBar +
  // LeftNav) is provided by the root +layout.svelte; this wraps page content only.
  // Applied per page via mdsvex frontmatter `layout: editorial` (also the default).
  //
  // Marginalia are authored inline: `<aside class="editorial-marginalia">` after
  // the paragraph it annotates. editorial.css floats them into the rail at the
  // full viewport regime and renders them as inset sidenotes below it.
  type Props = Partial<Frontmatter> & {
    children?: Snippet;
  };

  let { title = '', description = '', children }: Props = $props();
</script>

<svelte:head>
  {#if title}<title>{title} | zebkit</title>{/if}
  {#if description}<meta name="description" content={description} />{/if}
</svelte:head>

<article class="editorial-root">
  <div class="editorial-frame">
    <OnThisPage />
    <div class="editorial-main prose">
      {@render children?.()}
    </div>
  </div>
</article>
