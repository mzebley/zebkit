<script lang="ts">
  import { onMount } from 'svelte';

  onMount(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    if ((window as { __zebkitLoaded?: boolean }).__zebkitLoaded) {
      return;
    }

    (window as { __zebkitLoaded?: boolean }).__zebkitLoaded = true;

    try {
      const scriptUrl = new URL('/zebkit/zebkit.js', window.location.origin).toString();
      const module = await import(/* @vite-ignore */ scriptUrl);
      module?.core?.defineCoreComponents?.();
    } catch (error) {
      console.error('Failed to load zebkit components:', error);
    }
  });
</script>
