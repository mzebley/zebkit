<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Overlay from './Overlay.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { focusFirst, trapFocus } from '$lib/utils/focus-trap';

  // "On this page" — section links for the current article.
  //
  // Vessels by regime:
  //   full + a complete rail — lives beside the article as a sticky reading
  //                            lens. Marginalia stay anchored to their
  //                            paragraphs and pass beneath its translucent,
  //                            backdrop-blurred canvas.
  //   otherwise              — a slim sticky bar under the TopBar summons an
  //                            anchored popover, switching to the shared
  //                            Overlay bottom sheet only on compact viewports.
  //
  // The second condition matters on instrument pages: their token inspector
  // already consumes a right column, so a wide viewport can still leave no
  // readable marginalia lane. Vessel choice follows actual container space,
  // not viewport width alone.
  //
  // DOM contract: mount inside a `.editorial-frame` as its first child. The
  // frame provides the rail geometry (see editorial.css); headings are scanned
  // from the frame, and ids are assigned where missing so Svelte-rendered
  // sections (e.g. the token catalog) anchor just like mdsvex output.

  type Item = { id: string; text: string; level: 2 | 3 };

  let host = $state<HTMLElement | null>(null);
  let items = $state<Item[]>([]);
  let activeId = $state('');
  let modalOpen = $state(false);
  let stickTop = $state(56);
  let railAvailable = $state(false);
  let railMeasure = $state<HTMLElement | null>(null);
  let popoverContainer = $state<HTMLElement | null>(null);
  let popoverPanel = $state<HTMLElement | null>(null);
  let triggerButton = $state<HTMLButtonElement | null>(null);

  const sheetMode = $derived(viewport.regime === 'compact');

  let frame: HTMLElement | null = null;
  let headings: HTMLElement[] = [];
  let headingTops: { id: string; top: number }[] = [];
  let raf = 0;

  const slugify = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';

  function collect() {
    if (!frame) return;
    headings = Array.from(frame.querySelectorAll<HTMLElement>('h2, h3')).filter(
      (h) => !host?.contains(h) && h.textContent?.trim()
    );
    const seen = new Set(
      Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
    );
    for (const h of headings) {
      if (h.id) continue;
      let id = slugify(h.textContent ?? '');
      while (seen.has(id)) id = `${id}-1`;
      h.id = id;
      seen.add(id);
    }
    items = headings.map((h) => ({
      id: h.id,
      text: h.textContent?.trim() ?? '',
      level: h.tagName === 'H3' ? 3 : 2,
    }));
  }

  function docTop(el: Element) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function measure() {
    if (!frame) return;
    const topbar = document.querySelector<HTMLElement>('header.top-bar');
    stickTop = Math.round(topbar?.getBoundingClientRect().height ?? 56);
    const railWidth = parseFloat(
      getComputedStyle(frame).getPropertyValue('--editorial-marginalia-width')
    );
    const readableWidth = railMeasure?.getBoundingClientRect().width ?? Infinity;
    railAvailable = railWidth >= readableWidth;
    if (viewport.regime === 'full' && railAvailable) modalOpen = false;
    headingTops = headings.map((h) => ({ id: h.id, top: docTop(h) }));
  }

  function track() {
    raf = 0;
    // Scroll spy — the section whose heading most recently crossed the read line.
    const readLine = window.scrollY + stickTop + window.innerHeight * 0.2;
    let current = headingTops[0]?.id ?? '';
    for (const h of headingTops) {
      if (h.top <= readLine) current = h.id;
      else break;
    }
    activeId = current;
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(track);
  }

  function remeasure() {
    measure();
    schedule();
  }

  function closeIndex(returnFocus = false) {
    modalOpen = false;
    if (returnFocus) triggerButton?.focus();
  }

  function navigateToSection(event: MouseEvent, item: Item, closeAfterNavigate: boolean) {
    // Preserve normal modified-click behavior even though same-page links rarely
    // need a new tab. Plain activation gets a deterministic Chrome-safe scroll.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(item.id);
    if (!target) return;

    event.preventDefault();
    const reduceMotion =
      theme.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    history.pushState(null, '', `#${encodeURIComponent(item.id)}`);
    activeId = item.id;

    const scroll = () =>
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });

    if (closeAfterNavigate) {
      closeIndex();
      // Let Svelte remove the summoned vessel before Chrome starts scrolling;
      // otherwise removing the activated link can collapse the smooth movement
      // into the same frame as the click.
      requestAnimationFrame(scroll);
    } else {
      scroll();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!modalOpen || sheetMode) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeIndex(true);
      return;
    }
    trapFocus(e, popoverPanel);
  }

  function handlePointerdown(e: PointerEvent) {
    if (
      modalOpen &&
      !sheetMode &&
      popoverContainer &&
      !popoverContainer.contains(e.target as Node)
    ) {
      closeIndex();
    }
  }

  // The compact Overlay owns focus management. Wider fallback layouts use an
  // anchored dialog, so move focus to its first control on open.
  $effect(() => {
    if (modalOpen && !sheetMode) {
      tick().then(() => {
        focusFirst(popoverPanel);
      });
    }
  });

  onMount(() => {
    frame = host?.closest<HTMLElement>('.editorial-frame') ?? null;
    let observer: ResizeObserver | undefined;
    // Siblings may mount after this component; scan once layout has settled.
    tick().then(() => {
      collect();
      measure();
      schedule();
      document.fonts?.ready.then(remeasure);
      if (frame) {
        observer = new ResizeObserver(remeasure);
        observer.observe(frame);
      }
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} onpointerdown={handlePointerdown} />

{#snippet linkList(closeAfterNavigate: boolean)}
  <ul class="otp-list">
    {#each items as item (item.id)}
      <li class:otp-sub={item.level === 3}>
        <a
          href="#{item.id}"
          aria-current={activeId === item.id ? 'true' : undefined}
          onclick={(event) => navigateToSection(event, item, closeAfterNavigate)}
        >
          {item.text}
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

<div class="otp" bind:this={host} style="--otp-stick-top: {stickTop}px">
  <span class="otp-rail-measure" bind:this={railMeasure} aria-hidden="true"></span>
  {#if items.length > 1}
    {#if viewport.regime === 'full' && railAvailable}
      <div class="otp-rail">
        <nav class="otp-panel" aria-label="On this page">
          <p class="otp-label">On this page</p>
          {@render linkList(false)}
        </nav>
      </div>
    {:else}
      <div class="otp-fallback" bind:this={popoverContainer}>
        <nav class="otp-bar" aria-label="On this page">
          <button
            bind:this={triggerButton}
            type="button"
            onclick={() => (modalOpen = !modalOpen)}
            aria-haspopup="dialog"
            aria-expanded={modalOpen}
          >
            <span class="otp-label">On this page</span>
            <i class="ri-list-unordered" aria-hidden="true"></i>
          </button>
        </nav>

        {#if !sheetMode && modalOpen}
          <div
            bind:this={popoverPanel}
            class="otp-popover"
            role="dialog"
            aria-label="On this page"
            tabindex="-1"
          >
            <div class="otp-summoned-header">
              <p class="otp-label">On this page</p>
              <button
                class="otp-close"
                type="button"
                aria-label="Close on this page"
                onclick={() => closeIndex(true)}
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </div>
            {@render linkList(true)}
          </div>
        {/if}
      </div>

      {#if sheetMode}
        <Overlay
          open={modalOpen}
          onclose={() => (modalOpen = false)}
          label="On this page"
          side="bottom"
        >
          <div class="otp-sheet">
            <div class="otp-summoned-header">
              <p class="otp-label">On this page</p>
              <button
                class="otp-close"
                type="button"
                aria-label="Close on this page"
                onclick={() => (modalOpen = false)}
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </div>
            {@render linkList(true)}
          </div>
        </Overlay>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .otp {
    display: contents;
  }

  /* A non-rendering token-bound ruler. The rail vessel is only viable when the
     frame can supply a readable sidebar measure; undersized rails create the
     one-character-per-line failure seen beside the token inspector. */
  .otp-rail-measure {
    position: absolute;
    inset: 0 auto auto 0;
    inline-size: var(--zbk-spacing-8);
    block-size: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }

  /* ── Rail vessel (full regime) ─────────────────────────────────────────── */
  .otp-rail {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: var(--editorial-marginalia-width);
    pointer-events: none;
  }

  .otp-panel {
    position: sticky;
    top: calc(var(--otp-stick-top) + var(--zbk-spacing-1));
    z-index: var(--zbk-z-index-sticky);
    max-block-size: calc(100dvh - var(--otp-stick-top) - var(--zbk-spacing-2));
    overflow-y: auto;
    pointer-events: auto;
    background: var(--zbk-app-canvas);
    border-inline-start: var(--zbk-border-width-xs) solid var(--zbk-app-border-subtle);
    padding: var(--zbk-spacing-05) var(--zbk-spacing-05) var(--zbk-spacing-05)
      var(--zbk-spacing-1);
  }

  /* The rail is shared with document-anchored marginalia. A translucent canvas
     turns the index into a reading lens: notes retain their true position and
     pass beneath it, softening only where the two actually overlap. */
  @supports (backdrop-filter: none) or (-webkit-backdrop-filter: none) {
    .otp-panel {
      background: color-mix(
        in srgb,
        var(--zbk-app-canvas) calc(var(--zbk-opacity-90) * 100%),
        transparent
      );
      -webkit-backdrop-filter: blur(var(--zbk-spacing-05));
      backdrop-filter: blur(var(--zbk-spacing-05));
    }
  }

  .otp-label {
    margin: 0;
    font-family: var(--zbk-font-family-interface);
    font-size: var(--zbk-font-size-2xs);
    font-weight: var(--zbk-font-weight-normal);
    letter-spacing: var(--zbk-letter-spacing-wide);
    text-transform: uppercase;
    color: var(--zbk-app-ink-subtle);
  }

  .otp-list {
    list-style: none;
    margin: var(--zbk-spacing-05) 0 0;
    padding: 0;
    font-size: var(--zbk-font-size-xs);
    line-height: var(--zbk-line-height-2);
  }

  .otp-list li + li {
    margin-block-start: var(--zbk-spacing-025);
  }

  .otp-list .otp-sub {
    padding-inline-start: var(--zbk-spacing-05);
  }

  .otp-list a {
    display: inline-block;
    padding-block: var(--zbk-spacing-025);
    color: var(--zbk-app-ink-muted);
    text-decoration: none;
  }

  .otp-list a:hover {
    color: var(--zbk-action-ink);
    text-decoration: underline;
    text-decoration-color: var(--zbk-action-ink-subtle);
    text-underline-offset: 0.15em;
  }

  .otp-list a[aria-current='true'] {
    color: var(--zbk-action-ink);
  }

  .otp-list a:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  /* ── Bar vessel (reading/compact regimes) ──────────────────────────────── */
  .otp-fallback {
    position: sticky;
    top: var(--otp-stick-top);
    z-index: var(--zbk-z-index-sticky);
    margin-block-end: var(--zbk-spacing-1);
  }

  .otp-bar {
    background: var(--zbk-app-canvas);
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-subtle);
  }

  .otp-bar button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--zbk-spacing-05);
    inline-size: 100%;
    padding: var(--zbk-spacing-05) 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--zbk-app-ink-subtle);
  }

  .otp-bar button:hover .otp-label {
    color: var(--zbk-action-ink);
  }

  .otp-bar button:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: calc(-1 * var(--zbk-focus-width));
  }

  .otp-popover {
    position: absolute;
    inset-block-start: calc(100% + var(--zbk-spacing-05));
    inset-inline-end: 0;
    z-index: var(--zbk-z-index-popover);
    inline-size: min(var(--zbk-spacing-card), 100%);
    max-block-size: min(
      var(--zbk-spacing-card),
      calc(100dvh - var(--otp-stick-top) - var(--zbk-spacing-4))
    );
    overflow-y: auto;
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    box-shadow: var(--zbk-elevation-sm);
  }

  /* ── Sheet contents ────────────────────────────────────────────────────── */
  .otp-sheet {
    padding: var(--zbk-spacing-105);
  }

  .otp-summoned-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--zbk-spacing-1);
  }

  .otp-close {
    display: grid;
    place-items: center;
    inline-size: var(--zbk-spacing-2);
    block-size: var(--zbk-spacing-2);
    border: none;
    border-radius: var(--zbk-border-radius-sm);
    background: none;
    color: var(--zbk-app-ink-muted);
    cursor: pointer;
  }

  .otp-close:hover {
    color: var(--zbk-action-ink);
    background: var(--zbk-action-canvas-subtle);
  }

  .otp-close:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .otp-sheet .otp-list {
    font-size: var(--zbk-font-size-sm);
    margin-block-start: var(--zbk-spacing-1);
  }

  .otp-popover .otp-list {
    font-size: var(--zbk-font-size-xs);
    margin-block-start: var(--zbk-spacing-1);
  }

  .otp-popover .otp-close {
    inline-size: var(--zbk-spacing-105);
    block-size: var(--zbk-spacing-105);
  }

  @media (forced-colors: active) {
    .otp-panel {
      background: Canvas;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      border-color: CanvasText;
    }
  }
</style>
