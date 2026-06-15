<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';

  // A persistent column panel (left nav / right inspector rail) that can collapse
  // to a thin rail and "peek" — float open over the content on hover or keyboard
  // focus, then retract when you leave — modeled on the Claude app's sidebar.
  //
  // Three visual states:
  //   expanded  — normal in-flow column; the header toggle pins it collapsed.
  //   collapsed — a thin rail/handle holds the flow; content reclaims the width.
  //   peeking   — collapsed + hover/focus: the panel slides out as a floating
  //               overlay (does NOT reflow content), retracting on leave.
  //
  // Controlled: the parent owns `collapsed` (a persisted ui-store pref) and
  // supplies `onToggle`. The peek is transient and lives here. The panel body
  // stays mounted across all states (only `inert`/off-canvas when hidden) so a
  // hosted Inspector's page-token wiring never dies.

  type Side = 'left' | 'right';
  type Props = {
    side: Side;
    collapsed: boolean;
    onToggle: () => void;
    label: string;
    width?: string;
    // Optional external peek request. When true (and collapsed) the panel peeks
    // out; when false it retracts (after the same hide-delay). Lets hosted
    // content — e.g. the inspector's tokens — summon the rail on hover/focus.
    peekRequest?: boolean;
    children: Snippet;
  };

  let {
    side,
    collapsed,
    onToggle,
    label,
    width = 'var(--zbk-spacing-card)',
    peekRequest = false,
    children,
  }: Props = $props();

  let peeking = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let handleEl = $state<HTMLButtonElement | null>(null);
  let toggleEl = $state<HTMLButtonElement | null>(null);

  function show() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    peeking = true;
  }

  // Small delay so crossing the sliver between handle and panel — or a momentary
  // hover gap — doesn't make the peek flicker shut.
  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      peeking = false;
      hideTimer = null;
    }, 220);
  }

  // Focus within the panel body holds the peek open (so you can tab through a
  // hover-peeked panel); focus leaving it retracts. The collapsed *handle* does
  // NOT peek on focus — it's a deliberate "expand" button, and treating its focus
  // as a peek would re-open the panel the moment you collapsed it.
  function onPanelFocusOut(e: FocusEvent) {
    const root = e.currentTarget as HTMLElement;
    const next = e.relatedTarget as Node | null;
    if (!next || !root.contains(next)) scheduleHide();
  }

  // Toggle + move focus somewhere sensible for keyboard users: to the handle when
  // collapsing (so the now-hidden panel isn't holding focus), to the collapse
  // toggle when expanding.
  function handleToggle() {
    const wasCollapsed = collapsed;
    onToggle();
    tick().then(() => {
      if (wasCollapsed) {
        toggleEl?.focus();
      } else {
        peeking = false;
        handleEl?.focus();
      }
    });
  }

  // Pinning the panel open (expand) clears any transient peek.
  $effect(() => {
    if (!collapsed) peeking = false;
  });

  // Mirror an external peek request into the local show/hide. Going through the
  // same scheduleHide() lets a mouse cross from the requesting affordance onto
  // the panel without flicker (the panel's own mouseenter cancels the hide).
  $effect(() => {
    if (!collapsed) return;
    if (peekRequest) show();
    else scheduleHide();
  });

  // Glyph points toward where the panel will go: collapse tucks it to its own
  // edge, expand pushes it out toward the content.
  const toggleGlyph = $derived(side === 'left' ? (collapsed ? '»' : '«') : collapsed ? '«' : '»');
  const hidden = $derived(collapsed && !peeking);
</script>

<div class="cp cp-{side}" class:collapsed class:peeking style:--cp-width={width}>
  {#if collapsed}
    <button
      bind:this={handleEl}
      type="button"
      class="cp-handle"
      onmouseenter={show}
      onmouseleave={scheduleHide}
      onclick={handleToggle}
      aria-label={`Expand ${label}`}
      aria-expanded="false"
      title={`Expand ${label}`}
    >
      <span class="cp-grip" aria-hidden="true"></span>
    </button>
  {/if}

  <div
    class="cp-panel"
    inert={hidden}
    aria-hidden={hidden ? 'true' : undefined}
    onmouseenter={collapsed ? show : undefined}
    onmouseleave={collapsed ? scheduleHide : undefined}
    onfocusin={collapsed ? show : undefined}
    onfocusout={collapsed ? onPanelFocusOut : undefined}
  >
    <div class="cp-header">
      <button
        bind:this={toggleEl}
        type="button"
        class="cp-toggle"
        onclick={handleToggle}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        aria-expanded={!collapsed}
        title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      >
        <span aria-hidden="true">{toggleGlyph}</span>
      </button>
    </div>
    <div class="cp-content">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .cp {
    position: sticky;
    top: var(--zbk-spacing-205);
    align-self: start;
    height: calc(100vh - var(--zbk-spacing-205));
    flex: none;
    width: var(--cp-width);
    background: var(--zbk-app-canvas);
    transition: width var(--zbk-transition-duration-default, 180ms)
      var(--zbk-transition-timing-function, ease);
  }

  .cp-left {
    border-right: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }
  .cp-right {
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .cp.collapsed {
    width: var(--zbk-spacing-2);
  }

  /* ── Collapsed handle: thin hover/focus target with a centered grip ─────── */
  .cp-handle {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }
  .cp-handle:hover .cp-grip,
  .cp-handle:focus-visible .cp-grip {
    background: var(--zbk-accent-primary-600);
  }
  .cp-handle:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: calc(-1 * var(--zbk-focus-width));
  }
  .cp-grip {
    width: var(--zbk-border-width-md, 2px);
    height: var(--zbk-spacing-4);
    max-height: 40%;
    border-radius: var(--zbk-border-radius-pill, 999px);
    background: var(--zbk-app-border-strong, var(--zbk-app-ink-muted));
    transition: background-color var(--zbk-transition-duration-fast, 120ms)
      var(--zbk-transition-timing-function, ease);
  }

  /* ── Panel body ─────────────────────────────────────────────────────────── */
  .cp-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: var(--cp-width);
    background: var(--zbk-app-canvas);
  }
  .cp-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .cp-header {
    display: flex;
    flex: none;
    padding: var(--zbk-spacing-05);
  }
  .cp-left .cp-header {
    justify-content: flex-end;
  }
  .cp-right .cp-header {
    justify-content: flex-start;
  }

  .cp-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--zbk-spacing-105);
    height: var(--zbk-spacing-105);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink-soft);
    cursor: pointer;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-sm);
    line-height: 1;
    transition:
      background-color var(--zbk-transition-duration-fast, 120ms) ease,
      color var(--zbk-transition-duration-fast, 120ms) ease;
  }
  .cp-toggle:hover {
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
  }
  .cp-toggle:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  /* ── Collapsed: panel floats as an overlay, hidden off-canvas until peek ───
     Relying on the parent's overflow clip alone leaves a sliver showing in the
     content area's padding, so the hidden panel is also `visibility: hidden`.
     The visibility flip is delayed until the slide-out finishes (and is
     instant on the way in) so the animation still reads. */
  .cp.collapsed .cp-panel {
    position: absolute;
    top: 0;
    height: 100%;
    z-index: var(--zbk-z-index-dropdown);
    box-shadow: var(--zbk-elevation-xl, var(--zbk-elevation-lg));
    visibility: hidden;
    pointer-events: none;
    transition:
      transform var(--zbk-transition-duration-default, 180ms)
        var(--zbk-transition-timing-function, ease),
      visibility 0s linear var(--zbk-transition-duration-default, 180ms);
  }
  .cp.collapsed.cp-left .cp-panel {
    left: 0;
    transform: translateX(-100%);
    border-right: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }
  .cp.collapsed.cp-right .cp-panel {
    right: 0;
    transform: translateX(100%);
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }
  .cp.collapsed.peeking .cp-panel {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
    transition: transform var(--zbk-transition-duration-default, 180ms)
      var(--zbk-transition-timing-function, ease);
  }

  @media (prefers-reduced-motion: reduce) {
    .cp,
    .cp .cp-panel,
    .cp-grip {
      transition: none;
    }
  }
</style>
