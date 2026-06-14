<script lang="ts">
  import A11yDials from './A11yDials.svelte';

  let dials_open = $state(false);
  let dialsContainer: HTMLDivElement;
  let triggerButton: HTMLButtonElement;

  function closeDials(returnFocus = false) {
    dials_open = false;
    if (returnFocus) triggerButton?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.metaKey && e.key === 'k') {
      e.preventDefault();
      // TODO: Phase 8 - open palette modal
    }
    if (e.key === 'Escape' && dials_open) {
      // Return focus to the trigger when dismissed via keyboard.
      closeDials(true);
    }
  }

  function handlePointerDown(e: PointerEvent) {
    // Dismiss on outside click without stealing focus.
    if (dials_open && dialsContainer && !dialsContainer.contains(e.target as Node)) {
      closeDials();
    }
  }

  // Move focus into the popover when it opens.
  $effect(() => {
    if (dials_open) {
      const first = dialsContainer?.querySelector<HTMLElement>('.a11y-dials input, .a11y-dials button');
      first?.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} onpointerdown={handlePointerDown} />

<header class="top-bar">
  <div class="top-bar-content">
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
      <A11yDials open={dials_open} />
    </div>
  </div>
</header>

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

  .a11y-controls {
    flex-shrink: 0;
    position: relative;
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
