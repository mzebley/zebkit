<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import PrimitivePalette from '$lib/components/PrimitivePalette.svelte';
  import { primitivePalette } from '$data/primitive-palette';

  // Honor family deep links (e.g. #family-dusk) ourselves: the shell's root
  // scroll-behavior: smooth swallows hash targeting, and the shell re-scrolls
  // after mount, so jump instantly and once more after it settles.
  function jumpToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  onMount(() => {
    jumpToHash();
    const settle = setTimeout(jumpToHash, 150);
    return () => clearTimeout(settle);
  });

  afterNavigate(jumpToHash);
</script>

<ReferenceLayout
  title="Primitive palette — color"
  description="Every primitive color family in zebkit, generated across eleven lightness steps."
>
  <a class="back" href="/foundations/color">← Color overview</a>
  <h1 class="page-title">Primitive palette</h1>
  <p class="lede">
    {primitivePalette.families.length} hue families, each generated from a shared
    <code>hue</code> + <code>saturation</code> across eleven lightness steps as
    <code>--zbk-color-&lt;family&gt;-&lt;step&gt;</code>. Families split into two registers: a
    vivid wheel and its low-saturation muted counterparts. Primitives are the raw material —
    semantic tokens alias them, and components reference the semantic layer, never these
    directly. Select any swatch to copy its variable.
  </p>

  <PrimitivePalette />
</ReferenceLayout>

<style>
  .back {
    display: inline-block;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    text-decoration: none;
    margin-bottom: var(--zbk-spacing-2);
  }
  .back:hover {
    color: var(--zbk-app-ink);
  }

  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .lede {
    color: var(--zbk-app-ink-subtle);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }
  .lede code {
    font-family: var(--zbk-font-family-code);
    font-size: 0.9em;
  }
</style>
