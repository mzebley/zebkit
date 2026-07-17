<script lang="ts">
  import type { Snippet } from 'svelte';
  import Inspector from '$lib/components/Inspector.svelte';
  import Overlay from '$lib/components/Overlay.svelte';
  import CollapsiblePanel from '$lib/components/CollapsiblePanel.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import {
    ui,
    closeInspect,
    toggleInspectCollapsed,
    registerInspector,
    unregisterInspector,
  } from '$lib/stores/ui.svelte';

  // The two-column "instrument" register: dense content on the left, an
  // inspector rail on the right. The rail's vessel adapts to the viewport regime:
  //   full    (≥80rem) — collapsible right column (CollapsiblePanel: tuck to a
  //                      rail, peek on hover/focus); expanded by default
  //   reading (50–80rem) — right drawer, summoned from the TopBar inspect toggle
  //   compact (<50rem)  — bottom sheet, raised when a token is pinned
  // Below 'full' the rail rides a persistent Overlay (keepMounted) so the
  // Inspector's page-token wiring stays live while the panel is closed; the
  // CollapsiblePanel keeps the body mounted for the same reason. The content
  // column is marked `data-inspect-root` — the single hook the Inspector scans
  // regardless of which vessel holds the rail.
  type Props = {
    children?: Snippet;
    inspector?: Snippet;
  };

  let { children, inspector }: Props = $props();

  // Tell the TopBar an inspector exists on this page while the shell is mounted.
  // Count-based (register/unregister) so overlapping mount/unmount during client
  // navigation can't latch the flag off — see the store for the rationale.
  $effect(() => {
    registerInspector();
    return () => {
      unregisterInspector();
    };
  });
</script>

{#snippet rail()}
  {#if inspector}
    {@render inspector()}
  {:else}
    <Inspector />
  {/if}
{/snippet}

<div class="instrument-root" class:has-rail={viewport.regime === 'full'}>
  <div class="instrument-content" data-inspect-root>
    {@render children?.()}
  </div>

  {#if viewport.regime === 'full'}
    <CollapsiblePanel
      side="right"
      collapsed={ui.inspectCollapsed}
      onToggle={toggleInspectCollapsed}
      label="Inspector"
      peekRequest={ui.inspectPeek}
      showToggle={false}
      width='var(--zbk-spacing-card)'
    >
      <div class="rail-vessel">
        {@render rail()}
      </div>
    </CollapsiblePanel>
  {:else}
    <Overlay
      open={ui.inspectOpen}
      onclose={closeInspect}
      label="Inspector"
      side={viewport.regime === 'compact' ? 'bottom' : 'right'}
      keepMounted
    >
      <div class="rail-vessel">
        {@render rail()}
      </div>
    </Overlay>
  {/if}
</div>

<style>
  .instrument-root {
    display: block;
  }

  /* Rail column width is driven by the CollapsiblePanel itself (full column vs
     thin rail), so the track is `auto` and the content column takes the rest.

     The grid breaks out of `.app-main`'s horizontal padding so the rail sits
     flush against the viewport's right edge — mirroring the nav, which is flush
     left in `.app-body`. The content's left breathing room is restored as
     padding on the content column. (Only `full` regime renders this grid, where
     `.app-main` padding is always `spacing-5`, so the breakout stays exact.) */
  .instrument-root.has-rail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--zbk-spacing-3);
    align-items: start;
    margin-inline: calc(-1 * var(--zbk-spacing-5));
  }

  .instrument-content {
    min-width: 0;
  }

  .instrument-root.has-rail .instrument-content {
    padding-inline-start: var(--zbk-spacing-5);
  }

  /* Rail vessel — gives the rail the same typographic context across every
     vessel (collapsible column, drawer, sheet). */
  .rail-vessel {
    padding: var(--zbk-spacing-2);
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }
</style>
