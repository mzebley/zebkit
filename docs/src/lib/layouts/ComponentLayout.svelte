<script lang="ts">
  import InstrumentShell from './InstrumentShell.svelte';
  import DefaultLayout from './DefaultLayout.svelte';
  import ZebkitLoader from '$components/ZebkitLoader.svelte';

  // Component pages are an instrument register: they document tokens and utility
  // classes, so they get the inspector rail. The narrative prose styling still
  // comes from DefaultLayout, which renders inside the shell's content column.
  interface Props {
    title?: string;
    description?: string;
    children?: any;
  }

  let { title = '', description = '', children }: Props = $props();
</script>

<!-- Live demos on component pages need the custom elements registered. -->
<ZebkitLoader />

<InstrumentShell>
  <DefaultLayout {title} {description}>
    {@render children?.()}
  </DefaultLayout>
</InstrumentShell>
