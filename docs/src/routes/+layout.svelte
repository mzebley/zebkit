<script lang="ts">
  import '../app.css';
  import '../styles/editorial.css';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftNav from '$lib/components/LeftNav.svelte';

  let { children } = $props();
</script>

<!--
  App shell. TopBar + LeftNav are the persistent chrome and live here, NOT in the
  register layouts. Per-page register (editorial vs reference) is selected by
  mdsvex frontmatter and wraps only the page *content* inside <main>.
-->
<div class="app-shell">
  <TopBar />
  <div class="app-body">
    <LeftNav />
    <main class="app-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .app-body {
    display: flex;
    flex: 1;
  }

  .app-main {
    flex: 1;
    overflow-y: auto;
    padding: var(--zbk-spacing-4) var(--zbk-spacing-5);
  }

  @media (max-width: 64rem) {
    .app-main {
      padding: var(--zbk-spacing-3) var(--zbk-spacing-4);
    }
  }

  @media (max-width: 48rem) {
    .app-main {
      padding: var(--zbk-spacing-2) var(--zbk-spacing-3);
    }
  }
</style>
