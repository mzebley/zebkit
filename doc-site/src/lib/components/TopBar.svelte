<script lang="ts">
  import A11yDials from "./A11yDials.svelte";
  import Overlay from "./Overlay.svelte";
  import { viewport } from "$lib/stores/viewport.svelte";
  import {
    ui,
    toggleNav,
    toggleInspect,
    toggleNavCollapsed,
    toggleInspectCollapsed,
  } from "$lib/stores/ui.svelte";

  let dials_open = $state(false);
  let dialsContainer: HTMLDivElement;
  let triggerButton: HTMLButtonElement;

  // On compact the dials live in an Overlay bottom-sheet, which owns Esc,
  // outside-click dismiss, and focus management. The hand-rolled handlers below
  // only drive the anchored popover used on wider viewports.
  const sheetMode = $derived(viewport.regime === "compact");

  function closeDials(returnFocus = false) {
    dials_open = false;
    if (returnFocus) triggerButton?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.metaKey && e.key === "k") {
      e.preventDefault();
      // TODO: Phase 8 - open palette modal
    }
    if (e.key === "Escape" && dials_open && !sheetMode) {
      // Return focus to the trigger when dismissed via keyboard.
      closeDials(true);
    }
  }

  function handlePointerDown(e: PointerEvent) {
    // Dismiss on outside click without stealing focus (popover only).
    if (
      dials_open &&
      !sheetMode &&
      dialsContainer &&
      !dialsContainer.contains(e.target as Node)
    ) {
      closeDials();
    }
  }

  // Move focus into the popover when it opens (the sheet's Overlay does its own).
  $effect(() => {
    if (dials_open && !sheetMode) {
      const first = dialsContainer?.querySelector<HTMLElement>(
        ".dials-popover input, .dials-popover button",
      );
      first?.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} onpointerdown={handlePointerDown} />

<header class="top-bar">
  <div class="top-bar-content">
    <!-- Nav control (left slot). Compact: opens the drawer. Wider: collapses /
         expands the persistent nav column — the toggle that used to live inside
         the panel now rides here. -->
    {#if viewport.regime === "compact"}
      <button
        class="icon-button nav-trigger"
        onclick={toggleNav}
        aria-label="Open navigation"
        aria-expanded={ui.navOpen}
      >
        <i class="ri-menu-2-fill"></i>
      </button>
    {:else}
      <button
        class="icon-button nav-trigger"
        onclick={toggleNavCollapsed}
        aria-label={ui.navCollapsed
          ? "Expand navigation"
          : "Collapse navigation"}
        aria-expanded={!ui.navCollapsed}
        title={ui.navCollapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <i
          class={ui.navCollapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"}
          aria-hidden="true"
        ></i>
      </button>
    {/if}

    <!-- Wordmark -->
    <div class="wordmark">
      <a href="/" class="wordmark-link" aria-label="Zebkit home">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 13.35 125.346 35.1" data-asc="0.957" aria-hidden="true" role="img">
  <g fill="currentColor">
    <g transform="translate(0, 0)">
      <path d="M 0 47.85 L 0 45.05 L 13.25 25.9 L 9.25 25.9 C 8.05 25.9 6.983333333333333 26.06 6.05 26.38 C 5.116666666666667 26.693333333333335 4.3500000000000005 27.256666666666668 3.75 28.07 C 3.15 28.89 2.7 30.066666666666666 2.4 31.6 L 0.9 31.6 L 1.45 24.35 L 20.65 24.35 L 20.65 26.5 L 7.4 46.25 L 11.85 46.25 C 13.65 46.25 15.05 46.06666666666667 16.05 45.7 C 17.05 45.333333333333336 17.833333333333332 44.666666666666664 18.4 43.7 C 18.966666666666665 42.733333333333334 19.466666666666665 41.36666666666667 19.9 39.6 L 21.4 39.6 L 20.85 47.85 L 0 47.85 Z"/>
      <path d="M 117.95 48.45 C 116.583 48.45 115.4 48.21 114.4 47.73 C 113.4 47.243 112.643 46.46 112.13 45.38 C 111.61 44.293 111.35 42.867 111.35 41.1 L 111.35 26.15 L 108.35 26.15 L 108.35 24.5 C 109.683 24.233 110.917 23.673 112.05 22.82 C 113.183 21.973 114.157 20.91 114.97 19.63 C 115.79 18.343 116.4 16.967 116.8 15.5 L 118.45 15.5 L 118.45 24.35 L 123.35 24.35 L 123.35 26.15 L 118.45 26.15 L 118.45 40.8 C 118.45 42.333 118.657 43.49 119.07 44.27 C 119.49 45.057 120.233 45.45 121.3 45.45 C 121.9 45.45 122.457 45.327 122.97 45.08 C 123.49 44.827 123.85 44.633 124.05 44.5 L 124.9 45.9 C 124.467 46.2 123.95 46.55 123.35 46.95 C 122.75 47.35 122.017 47.7 121.15 48 C 120.283 48.3 119.217 48.45 117.95 48.45 Z"/>
      <path d="M 96.4 47.85 L 96.4 46.125 C 97.367 46.125 98.073 46.055 98.52 45.915 C 98.973 45.776 99.267 45.521 99.4 45.152 C 99.533 44.789 99.6 44.242 99.6 43.51 L 99.6 28.034 C 99.6 27.232 99.507 26.703 99.32 26.445 C 99.14 26.18 98.767 26.047 98.2 26.047 L 96.55 26.047 L 96.55 24.322 L 104.5 23.015 L 106.7 23.015 L 106.7 43.51 C 106.7 44.242 106.767 44.789 106.9 45.152 C 107.033 45.521 107.307 45.776 107.72 45.915 C 108.14 46.055 108.767 46.125 109.6 46.125 L 109.6 47.85 L 96.4 47.85 Z" style=""/>
      <path d="M 102.95 21.3 C 101.85 21.3 100.89 20.917 100.07 20.15 C 99.257 19.383 98.85 18.45 98.85 17.35 C 98.85 16.217 99.257 15.267 100.07 14.5 C 100.89 13.733 101.85 13.35 102.95 13.35 C 103.717 13.35 104.407 13.533 105.02 13.9 C 105.64 14.267 106.133 14.75 106.5 15.35 C 106.867 15.95 107.05 16.617 107.05 17.35 C 107.05 18.45 106.64 19.383 105.82 20.15 C 105.007 20.917 104.05 21.3 102.95 21.3 Z"/>
      <g>
        <path d="M 67.25 47.85 L 67.25 46.2 C 68.183 46.2 68.883 46.133 69.35 46 C 69.817 45.867 70.117 45.623 70.25 45.27 C 70.383 44.923 70.45 44.4 70.45 43.7 L 70.45 18.2 C 70.45 17.433 70.357 16.917 70.17 16.65 C 69.99 16.383 69.6 16.25 69 16.25 L 67.35 16.25 L 67.35 14.6 L 75.4 13.35 L 77.55 13.35 L 77.55 35.413 L 83.4 29.45 C 84.533 28.283 85.11 27.407 85.13 26.82 C 85.143 26.24 84.8 25.95 84.1 25.95 L 82.85 25.95 L 82.85 24.3 L 93.2 24.35 L 93.2 26 L 92.8 26 C 91.333 26 90.007 26.41 88.82 27.23 C 87.64 28.043 86.35 29.15 84.95 30.55 L 83.206 32.257 L 90 41.75 C 90.733 42.783 91.373 43.623 91.92 44.27 C 92.473 44.923 92.973 45.41 93.42 45.73 C 93.873 46.043 94.283 46.2 94.65 46.2 L 95.15 46.2 L 95.15 47.85 L 82.6 47.85 L 82.6 46.2 L 83.3 46.2 C 83.6 46.2 83.823 46.16 83.97 46.08 C 84.123 45.993 84.2 45.867 84.2 45.7 C 84.2 45.533 84.093 45.277 83.88 44.93 C 83.66 44.577 83.417 44.2 83.15 43.8 L 78.534 36.831 L 77.55 37.794 L 77.55 43.699 C 77.55 44.399 77.6 44.922 77.7 45.269 C 77.8 45.622 78.04 45.866 78.42 45.999 C 78.807 46.132 79.417 46.199 80.25 46.199 L 80.25 47.849 L 67.25 47.85 Z"/>
      </g>
      <path d="M 58.55 26.95 L 58.55 26.3 L 60.2 26.3 L 60.2 26.95 L 58.55 26.95 Z"/>
      <g transform="matrix(1, 0, 0, 1, -7, 0)">
        <path d="M 64.15 48.45 C 63.017 48.45 61.993 48.343 61.08 48.13 C 60.16 47.91 59.31 47.633 58.53 47.3 C 57.843 47.009 57.15 46.692 56.453 46.35 L 56.45 46.35 L 55 47.85 L 52.6 47.85 L 52.6 18.25 C 52.6 17.417 52.5 16.877 52.3 16.63 C 52.1 16.377 51.633 16.25 50.9 16.25 L 49.5 16.25 L 49.5 14.55 L 57.45 13.35 L 59.65 13.35 L 59.65 26.394 C 60.01 26.083 60.387 25.792 60.78 25.52 C 61.527 25.007 62.393 24.59 63.38 24.27 C 64.36 23.957 65.483 23.8 66.75 23.8 C 69.717 23.8 72.05 24.783 73.75 26.75 C 75.45 28.717 76.3 31.633 76.3 35.5 C 76.3 38.367 75.81 40.757 74.83 42.67 C 73.843 44.59 72.45 46.033 70.65 47 Z M 59.83 44.88 C 60.343 45.393 60.927 45.817 61.58 46.15 C 62.227 46.483 62.933 46.65 63.7 46.65 C 65.467 46.65 66.767 45.857 67.6 44.27 C 68.433 42.69 68.85 40.083 68.85 36.45 C 68.85 33.317 68.45 30.893 67.65 29.18 C 66.85 27.46 65.567 26.6 63.8 26.6 C 63.033 26.6 62.333 26.8 61.7 27.2 C 61.067 27.6 60.493 28.057 59.98 28.57 C 59.868 28.682 59.758 28.792 59.65 28.9 L 59.65 44.696 C 59.709 44.758 59.769 44.819 59.83 44.88 Z"/>
      </g>
      <path d="M 33.4 48.4 C 29.733 48.4 26.943 47.377 25.03 45.33 C 23.11 43.277 22.15 40.217 22.15 36.15 C 22.15 33.383 22.593 31.083 23.48 29.25 C 24.36 27.417 25.643 26.05 27.33 25.15 C 29.01 24.25 31.083 23.8 33.55 23.8 C 35.483 23.8 37.15 24.077 38.55 24.63 C 39.95 25.177 41.093 25.973 41.98 27.02 C 42.86 28.073 43.51 29.333 43.93 30.8 C 44.343 32.267 44.55 33.95 44.55 35.85 L 44.55 36.3 L 26.4 36.3 L 26.4 34.5 L 37.1 34.5 C 37.1 32.467 37.01 30.8 36.83 29.5 C 36.643 28.2 36.293 27.223 35.78 26.57 C 35.26 25.923 34.5 25.6 33.5 25.6 C 32.667 25.6 31.96 25.867 31.38 26.4 C 30.793 26.933 30.35 27.867 30.05 29.2 C 29.75 30.533 29.6 32.383 29.6 34.75 C 29.6 36.583 29.7 38.16 29.9 39.48 C 30.1 40.793 30.427 41.883 30.88 42.75 C 31.327 43.617 31.943 44.26 32.73 44.68 C 33.51 45.093 34.467 45.3 35.6 45.3 C 36.767 45.3 37.777 45.11 38.63 44.73 C 39.477 44.343 40.21 43.8 40.83 43.1 C 41.443 42.4 41.95 41.583 42.35 40.65 L 44.05 41.55 C 43.617 42.583 43.017 43.633 42.25 44.7 C 41.483 45.767 40.41 46.65 39.03 47.35 C 37.643 48.05 35.767 48.4 33.4 48.4 Z"/>
    </g>
  </g>
</svg>
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
        <i class="ri-command-line"></i>
        <span class="search-text">K</span>
      </button>
    </div>

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
        <i class="ri-accessibility-line"></i>
      </button>

      <!-- Wide viewports: anchored popover. -->
      {#if !sheetMode}
        <div
          class="dials-popover"
          class:open={dials_open}
          role="dialog"
          aria-label="Accessibility controls"
        >
          <A11yDials />
        </div>
      {/if}
    </div>

    <!-- Right-side actions -->
    <div class="top-bar-actions">
      <!-- Inspector control. Reading / compact: opens the drawer or sheet. Full:
         collapses / expands the persistent rail — mirror of the nav toggle on
         the left, with the fold/unfold glyphs flipped to point toward the right
         edge the rail tucks against. -->
      {#if viewport.regime !== "full"}
        <button
          disabled={!ui.inspectAvailable}
          class="icon-button"
          onclick={toggleInspect}
          aria-label="Toggle inspector"
          aria-expanded={ui.inspectOpen && ui.inspectAvailable}
        >
          <i class="ri-crosshair-2-line"></i>
        </button>
      {:else if viewport.regime === "full"}
        <button
          disabled={!ui.inspectAvailable}
          class="icon-button"
          onclick={toggleInspectCollapsed}
          aria-label={(ui.inspectCollapsed && ui.inspectAvailable)
            ? "Expand inspector"
            : "Collapse inspector"}
          aria-expanded={ui.inspectOpen && ui.inspectAvailable}
          title={ui.inspectCollapsed
            ? "Expand inspector"
            : "Collapse inspector"}
        >
          <i
            class={(ui.inspectCollapsed || !ui.inspectAvailable)
              ? "ri-menu-fold-line"
              : "ri-menu-unfold-line"}
            aria-hidden="true"
          ></i>
        </button>
      {/if}
    </div>
  </div>
</header>

<!-- Compact: the dials ride a bottom-sheet, sharing the Overlay a11y contract. -->
{#if sheetMode}
  <Overlay
    open={dials_open}
    onclose={() => (dials_open = false)}
    label="Accessibility controls"
    side="bottom"
  >
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
    padding: 0 var(--zbk-spacing-05);
    height: var(--zbk-spacing-205);
    max-width: 100%;
  }

  .wordmark {
    flex-shrink: 0;
  }

  .wordmark-link {
    text-decoration: none;
    color: var(--zbk-app-ink);
  }

  .wordmark-link > svg {
    height: var(--zbk-spacing-1);
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
    height:var(--zbk-spacing-2);
    padding: 0 var(--zbk-spacing-05);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink-soft);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-xs);
    cursor: pointer;
    transition: all var(--zbk-transition-duration)
      var(--zbk-transition-timing-function);
  }

  .search-button:hover {
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
  }

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
    width: var(--zbk-spacing-2);
    height: var(--zbk-spacing-2);
    border: none;
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    cursor: pointer;
    transition: all var(--zbk-transition-duration)
      var(--zbk-transition-timing-function);
    font-size: var(--zbk-font-size-md);
  }

  .icon-button:not([disabled]):hover {
    background: var(--zbk-action-canvas-muted);
  }

  .icon-button:disabled {
    color: var(--zbk-disabled-ink-soft);
    cursor: not-allowed;
    /* opacity: .5; */
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
    margin-top: var(--zbk-spacing-05);
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
    width: var(--zbk-spacing-2);
    height: var(--zbk-spacing-2);
    border: none;
    border-radius: 50%;
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    cursor: pointer;
    transition: all var(--zbk-transition-duration)
      var(--zbk-transition-timing-function);
    font-size: var(--zbk-font-size-lg);
    margin-right: var(--zbk-spacing-025);
  }

  .dials-trigger:hover {
    background: var(--zbk-action-canvas-muted);
  }

  .dials-trigger[aria-expanded="true"] {
    background: var(--zbk-action-canvas-soft);
  }
</style>
