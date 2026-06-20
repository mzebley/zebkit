<script lang="ts">
  import DefaultLayout from './DefaultLayout.svelte';

  interface Props {
    title?: string;
    description?: string;
    children?: any;
  }

  let { title = '', description = '', children }: Props = $props();
</script>

<DefaultLayout {title} {description}>
  {@render children?.()}
</DefaultLayout>
