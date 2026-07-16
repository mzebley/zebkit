<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { theme } from '$lib/stores/theme.svelte';

  // Shared dismissible-overlay primitive. Every summoned panel in the docs —
  // nav drawer, inspector bottom-sheet, future Cmd-K — routes through here so
  // the accessibility contract is written once: focus trap, Esc to close, scrim
  // click to dismiss, focus returned to the trigger on close, and motion that
  // respects the reduced-motion dial.
  //
  // Controlled component: the parent owns `open` (a ui-store flag) and supplies
  // `onclose`. `side` picks the entry edge — 'left'/'right' slide as drawers,
  // 'bottom' rises as a sheet.
  //
  // `keepMounted` keeps the panel in the DOM while closed (animated off-canvas
  // via CSS + `inert`) instead of unmounting it. The inspector needs this: its
  // page-token wiring must stay alive while the sheet is closed so that tapping
  // a token can open it. The nav drawer leaves it false — unmounting links is fine.

  type Side = 'left' | 'right' | 'bottom';
  type Props = {
    open: boolean;
    onclose: () => void;
    label: string;
    side?: Side;
    keepMounted?: boolean;
    children: Snippet;
  };

  let { open, onclose, label, side = 'left', keepMounted = false, children }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  let returnTo: HTMLElement | null = null;

  const flyDistance = $derived(theme.reducedMotion ? 0 : side === 'bottom' ? 24 : 32);
  const motion = $derived(theme.reducedMotion ? 0 : 180);

  function focusables(): HTMLElement[] {
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) {
      e.preventDefault();
      panel?.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Move focus in on open, restore it to the trigger on close.
  $effect(() => {
    if (!open) {
      if (returnTo) {
        returnTo.focus();
        returnTo = null;
      }
      return;
    }
    returnTo = document.activeElement as HTMLElement;
    tick().then(() => {
      const items = focusables();
      (items[0] ?? panel)?.focus();
    });
  });
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if keepMounted}
  <!-- Persistent vessel: never unmounts, animates off-canvas, inert while closed. -->
  <div class="overlay overlay-{side} keep-mounted" class:is-open={open} inert={!open}>
    <button class="scrim" tabindex="-1" aria-label={`Close ${label}`} onclick={onclose}></button>
    <div
      class="panel panel-{side}"
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabindex="-1"
    >
      {@render children()}
    </div>
  </div>
{:else if open}
  <div class="overlay overlay-{side}">
    <button
      class="scrim"
      tabindex="-1"
      aria-label={`Close ${label}`}
      onclick={onclose}
      transition:fade={{ duration: motion }}
    ></button>
    <div
      class="panel panel-{side}"
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabindex="-1"
      transition:fly={{
        duration: motion,
        x: side === 'bottom' ? 0 : side === 'left' ? -flyDistance : flyDistance,
        y: side === 'bottom' ? flyDistance : 0,
      }}
    >
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--zbk-z-index-modal);
    display: flex;
    overflow: clip;
  }
  .overlay-left {
    justify-content: flex-start;
  }
  .overlay-right {
    justify-content: flex-end;
  }
  .overlay-bottom {
    align-items: flex-end;
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: var(--zbk-app-ink);
    opacity: 0.32;
    cursor: pointer;
  }

  .panel {
    position: relative;
    background: var(--zbk-app-canvas);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .panel:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: calc(-1 * var(--zbk-focus-width));
  }

  .panel-left,
  .panel-right {
    height: 100%;
    width: min(20rem, 82vw);
  }
  .panel-left {
    border-right: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }
  .panel-right {
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .panel-bottom {
    width: 100%;
    max-height: 72vh;
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-top-left-radius: var(--zbk-border-radius-lg);
    border-top-right-radius: var(--zbk-border-radius-lg);
  }

  /* keepMounted mode: CSS-driven open/close (the {#if} branch animates via
     Svelte transitions instead, so these rules are scoped to .keep-mounted only
     — otherwise they'd shove the open nav drawer off-canvas). Closed = panel
     off-canvas, scrim transparent, whole layer non-interactive (inert handles
     a11y + pointers). */
  .keep-mounted .scrim,
  .keep-mounted .panel {
    transition:
      transform var(--zbk-transition-duration-default, 180ms) var(--zbk-transition-timing-function, ease),
      opacity var(--zbk-transition-duration-default, 180ms) var(--zbk-transition-timing-function, ease);
  }
  .keep-mounted:not(.is-open) {
    pointer-events: none;
  }
  .keep-mounted:not(.is-open) .scrim {
    opacity: 0;
  }
  .keep-mounted:not(.is-open) .panel-left {
    transform: translateX(-100%);
  }
  .keep-mounted:not(.is-open) .panel-right {
    transform: translateX(100%);
  }
  .keep-mounted:not(.is-open) .panel-bottom {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .keep-mounted .scrim,
    .keep-mounted .panel {
      transition: none;
    }
  }
</style>
