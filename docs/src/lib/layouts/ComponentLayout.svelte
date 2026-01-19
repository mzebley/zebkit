<script lang="ts">
  import DefaultLayout from './DefaultLayout.svelte';

  export let title: string = '';
  export let description: string = '';
</script>

<DefaultLayout {title} {description}>
  <slot />
</DefaultLayout>
