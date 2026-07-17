<script lang="ts">
  import '../app.css';
  import '../styles/editorial.css';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftNav from '$lib/components/LeftNav.svelte';
  import ZebkitLoader from '$lib/components/ZebkitLoader.svelte';
  import Overlay from '$lib/components/Overlay.svelte';
  import CollapsiblePanel from '$lib/components/CollapsiblePanel.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import { ui, closeNav, toggleNavCollapsed } from '$lib/stores/ui.svelte';

  let { children } = $props();
</script>

<!--
  App shell. TopBar + LeftNav are the persistent chrome and live here, NOT in the
  register layouts. Per-page register (editorial vs reference) is selected by
  mdsvex frontmatter and wraps only the page *content* inside <main>.

  The nav is a collapsible column on full/reading viewports (CollapsiblePanel —
  tuck it to a rail, peek on hover/focus) and an off-canvas drawer (summoned by
  the TopBar hamburger) on compact ones — same LeftNav, different vessel.
-->
<!-- Registers the zebkit custom elements once for every route: zebkit
     elements appear throughout the site (component demos, token tables). -->
<ZebkitLoader />

<div class="app-shell">
  <TopBar />
  <div class="app-body">
    {#if viewport.regime === 'compact'}
      <Overlay open={ui.navOpen} onclose={closeNav} label="Navigation" side="left">
        <LeftNav fill />
      </Overlay>
    {:else}
      <CollapsiblePanel
        side="left"
        collapsed={ui.navCollapsed}
        onToggle={toggleNavCollapsed}
        label="Navigation"
        showToggle={false}
      >
        <LeftNav fill />
      </CollapsiblePanel>
    {/if}
    <main class="app-main min-width-0">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    /* Contain the collapsed panels' off-canvas peek so it can't add horizontal
       scroll. The shell wraps all content (no vertical overflow of its own), so
       clipping is horizontal-only in effect. */
    overflow-x: clip;
  }

  .app-body {
    display: flex;
    flex: 1;
  }

  .app-main {
    flex: 1;
    /* Clip the inspector rail's off-canvas peek on the x-axis so it can't make
       the page horizontally scrollable. `overflow-x: clip` computes overflow-y
       to clip too — which is fine (the shell wraps all content, nothing
       overflows vertically) — and crucially does NOT make this a scroll
       container, so the inspector rail's `position: sticky` references the
       window (like the nav) instead of getting trapped here. */
    overflow-x: clip;
  }


  
</style>
