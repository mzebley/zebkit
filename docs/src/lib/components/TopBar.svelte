<script lang="ts">
  import A11yDials from './A11yDials.svelte';
  import Overlay from './Overlay.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import { ui, toggleNav, toggleInspect } from '$lib/stores/ui.svelte';

  let dials_open = $state(false);
  let dialsContainer: HTMLDivElement;
  let triggerButton: HTMLButtonElement;

  // On compact the dials live in an Overlay bottom-sheet, which owns Esc,
  // outside-click dismiss, and focus management. The hand-rolled handlers below
  // only drive the anchored popover used on wider viewports.
  const sheetMode = $derived(viewport.regime === 'compact');

  function closeDials(returnFocus = false) {
    dials_open = false;
    if (returnFocus) triggerButton?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.metaKey && e.key === 'k') {
      e.preventDefault();
      // TODO: Phase 8 - open palette modal
    }
    if (e.key === 'Escape' && dials_open && !sheetMode) {
      // Return focus to the trigger when dismissed via keyboard.
      closeDials(true);
    }
  }

  function handlePointerDown(e: PointerEvent) {
    // Dismiss on outside click without stealing focus (popover only).
    if (dials_open && !sheetMode && dialsContainer && !dialsContainer.contains(e.target as Node)) {
      closeDials();
    }
  }

  // Move focus into the popover when it opens (the sheet's Overlay does its own).
  $effect(() => {
    if (dials_open && !sheetMode) {
      const first = dialsContainer?.querySelector<HTMLElement>('.dials-popover input, .dials-popover button');
      first?.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} onpointerdown={handlePointerDown} />

<header class="top-bar">
  <div class="top-bar-content">
    <!-- Nav drawer trigger (compact only) -->
    {#if viewport.regime === 'compact'}
      <button
        class="icon-button nav-trigger"
        onclick={toggleNav}
        aria-label="Open navigation"
        aria-expanded={ui.navOpen}
      >
        <span aria-hidden="true">☰</span>
      </button>
    {/if}

    <!-- Wordmark -->
    <div class="wordmark">
      <a href="/" class="wordmark-link">
        <span class="wordmark-text">zebkit</span>
      </a>
    </div>

    <!-- Cmd-K Search Trigger -->
    <div class="search-trigger">
      <button
        class="search-button"
        onclick={() => {
          /* TODO: Phase 8 - open palette */
        }}
        aria-label="Search documentation (Cmd-K)"
      >
        <span class="search-icon">⌘</span>
        <span class="search-text">K</span>
      </button>
    </div>

    <!-- Right-side actions -->
    <div class="top-bar-actions">
    <!-- Inspector toggle: only when the page has an inspector and the rail isn't
         a persistent column (i.e. reading / compact regimes). -->
    {#if ui.inspectAvailable && viewport.regime !== 'full'}
      <button
        class="icon-button"
        onclick={toggleInspect}
        aria-label="Toggle inspector"
        aria-expanded={ui.inspectOpen}
      >
        <span aria-hidden="true">⌖</span>
      </button>
    {/if}

    <!-- A11y Dials Popover -->
    <div class="a11y-controls" bind:this={dialsContainer}>
      <button
        bind:this={triggerButton}
        class="dials-trigger"
        onclick={() => (dials_open = !dials_open)}
        aria-label="Accessibility controls"
        aria-expanded={dials_open}
        aria-haspopup="dialog"
      >
        <span class="dials-icon">⚙</span>
      </button>

      <!-- Wide viewports: anchored popover. -->
      {#if !sheetMode}
        <div class="dials-popover" class:open={dials_open} role="dialog" aria-label="Accessibility controls">
          <A11yDials />
        </div>
      {/if}
    </div>
    </div>
  </div>
</header>

<!-- Compact: the dials ride a bottom-sheet, sharing the Overlay a11y contract. -->
{#if sheetMode}
  <Overlay open={dials_open} onclose={() => (dials_open = false)} label="Accessibility controls" side="bottom">
    <div class="dials-sheet">
      <h2 class="dials-sheet-title">Accessibility</h2>
      <A11yDials />
    </div>
  </Overlay>
{/if}

<style>
  .top-bar {
    background: var(--zbk-app-canvas);
    border-bottom: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    position: sticky;
    top: 0;
    z-index: var(--zbk-z-index-sticky);
  }

  .top-bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--zbk-spacing-025) var(--zbk-spacing-1);
    min-height: var(--zbk-spacing-205);
    max-width: 100%;
  }

  .wordmark {
    flex-shrink: 0;
  }

  .wordmark-link {
    text-decoration: none;
    color: var(--zbk-app-ink);
  }

  .wordmark-text {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-bold);
  }

  .search-trigger {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .search-button {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-025);
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink-soft);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-2xs);
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .search-button:hover {
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
  }

  .search-icon,
  .search-text {
    font-family: var(--zbk-font-family-code);
  }

  .top-bar-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--zbk-spacing-105);
    height: var(--zbk-spacing-105);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
    font-size: var(--zbk-font-size-md);
  }

  .icon-button:hover {
    background: var(--zbk-app-canvas-muted);
  }

  .icon-button[aria-expanded='true'] {
    background: var(--zbk-app-canvas-muted);
    border-color: var(--zbk-accent-primary-600);
  }

  .nav-trigger {
    flex-shrink: 0;
    margin-inline-end: var(--zbk-spacing-05);
  }

  .a11y-controls {
    flex-shrink: 0;
    position: relative;
  }

  /* Anchored popover vessel (wide viewports). */
  .dials-popover {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--zbk-app-canvas);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    padding: var(--zbk-spacing-2);
    margin-top: var(--zbk-spacing-1);
    z-index: var(--zbk-z-index-popover);
    min-width: 200px;
  }

  .dials-popover.open {
    display: block;
  }

  /* Bottom-sheet vessel (compact) — Overlay supplies the surface chrome. */
  .dials-sheet {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-2);
    padding: var(--zbk-spacing-3);
  }

  .dials-sheet-title {
    margin: 0;
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-md);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
  }

  .dials-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--zbk-spacing-105);
    height: var(--zbk-spacing-105);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
    font-size: var(--zbk-font-size-md);
  }

  .dials-trigger:hover {
    background: var(--zbk-app-canvas-muted);
  }

  .dials-trigger[aria-expanded='true'] {
    background: var(--zbk-app-canvas-muted);
    border-color: var(--zbk-accent-primary-600);
  }
</style>
