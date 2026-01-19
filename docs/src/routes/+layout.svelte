<script lang="ts">
  import '../app.css';
  import ZebkitLoader from '$components/ZebkitLoader.svelte';
  import Header from '$components/Header.svelte';
  import Sidebar from '$components/Sidebar.svelte';
  import { page } from '$app/stores';

  export let data: { navigation: Array<{
    label: string;
    collapsed?: boolean;
    items: Array<{ label: string; link: string }>;
  }> };
</script>

<ZebkitLoader />

<div class="display-flex flex-direction-column min-height-100 canvas-app ink-app">
  <Header currentPath={$page.url.pathname} />

  <div class="display-flex flex-direction-column flex-grow-1 tablet:flex-direction-row">
    <Sidebar
      navigation={data.navigation}
      currentPath={$page.url.pathname}
      class="width-full tablet:width-10 flex-shrink-0"
    />

    <main class="flex-grow-1 padding-inline-1 padding-block-2 width-full">
      <slot />
    </main>
  </div>
</div>
