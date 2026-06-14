<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { resolveChain, type ChainNode } from '$lib/utils/token-chain';

  // Token x-ray. Traces a token's reference chain (component -> alias ->
  // primitive) and shows the live resolved value, which re-reads when the a11y
  // dials move — accessibility is something you operate, decisions are data.

  const DEFAULT_TOKEN = '--zbk-app-canvas';
  const TOKEN_RE = /^--zbk-[\w-]+$/;
  const COLOR_RE = /^(#|rgb|hsl|hwb|oklch|oklab|lab|lch|color\()/i;

  let pinned = $state(DEFAULT_TOKEN);
  let preview = $state<string | null>(null);
  let query = $state('');
  let queryError = $state(false);
  let spans: HTMLElement[] = [];

  const active = $derived(preview ?? pinned);
  const chain = $derived<ChainNode[]>(resolveChain(active));

  // Live computed value per node. Depends on the a11y dials so dragging them
  // refreshes the trace (spacing/size tokens shift with density/font-scale).
  const liveValues = $derived.by<Record<string, string>>(() => {
    void theme.fontScale;
    void theme.density;
    void theme.reducedMotion;
    if (typeof document === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const node of chain) out[node.cssVar] = cs.getPropertyValue(node.cssVar).trim();
    return out;
  });

  const resolvedValue = $derived(chain.length ? (liveValues[chain[chain.length - 1].cssVar] ?? '') : '');
  const isColor = $derived(COLOR_RE.test(resolvedValue));

  function computedValueFor(cssVar: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  }

  function pin(token: string) {
    pinned = token;
    preview = null;
  }

  function trace() {
    const value = query.trim();
    if (!value) return;
    const token = value.startsWith('--') ? value : `--zbk-${value.replace(/^zbk-/, '')}`;
    if (!TOKEN_RE.test(token) || !computedValueFor(token)) {
      queryError = true;
      return;
    }
    queryError = false;
    pin(token);
  }

  // Wire up the article's token spans: hover to preview, click/Enter to pin.
  onMount(() => {
    const article = document.querySelector('.reference-article');
    if (!article) return;

    const handlers: Array<() => void> = [];
    const codes = Array.from(article.querySelectorAll('code')) as HTMLElement[];

    for (const code of codes) {
      const text = (code.textContent ?? '').trim();
      if (!TOKEN_RE.test(text)) continue;

      code.classList.add('xray-token');
      code.tabIndex = 0;
      code.setAttribute('role', 'button');
      code.setAttribute('aria-label', `Inspect token ${text}`);

      const onEnter = () => (preview = text);
      const onLeave = () => (preview = null);
      const onClick = () => pin(text);
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pin(text);
        }
      };

      code.addEventListener('mouseenter', onEnter);
      code.addEventListener('mouseleave', onLeave);
      code.addEventListener('focus', onEnter);
      code.addEventListener('blur', onLeave);
      code.addEventListener('click', onClick);
      code.addEventListener('keydown', onKey);

      spans.push(code);
      handlers.push(() => {
        code.removeEventListener('mouseenter', onEnter);
        code.removeEventListener('mouseleave', onLeave);
        code.removeEventListener('focus', onEnter);
        code.removeEventListener('blur', onLeave);
        code.removeEventListener('click', onClick);
        code.removeEventListener('keydown', onKey);
      });
    }

    // Seed the rail from the first token in the prose, if any.
    if (spans.length) pin((spans[0].textContent ?? '').trim());

    return () => {
      for (const off of handlers) off();
      spans = [];
    };
  });

  // Mark the span matching the active token so prose and rail stay in sync.
  $effect(() => {
    for (const code of spans) {
      code.classList.toggle('xray-active', (code.textContent ?? '').trim() === active);
    }
  });
</script>

<div class="xray">
  <h2 class="xray-title">Token x-ray</h2>
  <p class="xray-hint">Hover any <code>--zbk-</code> token in the page to trace it through the strata.</p>

  <form
    class="xray-search"
    onsubmit={(e) => {
      e.preventDefault();
      trace();
    }}
  >
    <label class="xray-search-label" for="xray-input">Trace a token</label>
    <input
      id="xray-input"
      class="xray-input"
      class:error={queryError}
      type="text"
      placeholder="--zbk-button-canvas"
      bind:value={query}
      oninput={() => (queryError = false)}
      aria-invalid={queryError}
      autocomplete="off"
      spellcheck="false"
    />
    {#if queryError}<span class="xray-error" role="alert">Unknown token.</span>{/if}
  </form>

  {#if chain.length}
    <p class="xray-active-token" aria-live="polite">
      <code>{active}</code>{#if preview}<span class="xray-tag">preview</span>{/if}
    </p>

    <ol class="xray-chain">
      {#each chain as node, i (node.cssVar)}
        <li class="xray-node">
          <span class="xray-stratum xray-stratum-{node.stratum}">{node.stratum}</span>
          <code class="xray-var">{node.cssVar}</code>
          {#if node.ref}
            <span class="xray-ref" aria-hidden="true">↳ {node.ref}</span>
          {/if}
        </li>
      {/each}
    </ol>

    <div class="xray-resolved">
      <span class="xray-resolved-label">Resolved</span>
      {#if isColor}<span class="xray-swatch" style:background={resolvedValue}></span>{/if}
      <code class="xray-resolved-value">{resolvedValue || 'see source'}</code>
    </div>
  {:else}
    <p class="xray-empty">No token selected.</p>
  {/if}
</div>

<style>
  .xray {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-2);
  }

  .xray-title {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--zbk-app-ink-muted);
    margin: 0;
  }

  .xray-hint {
    margin: 0;
    font-family: var(--zbk-font-family-body, inherit);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    line-height: var(--zbk-line-height-2, 1.4);
  }

  .xray-hint code {
    font-family: var(--zbk-font-family-code);
  }

  .xray-search {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .xray-search-label {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .xray-input {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    background: var(--zbk-app-canvas-soft);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xs);
    padding: var(--zbk-spacing-05) var(--zbk-spacing-1);
  }

  .xray-input:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .xray-input.error {
    border-color: var(--zbk-critical-border-strong);
  }

  .xray-error {
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-critical-ink);
  }

  .xray-active-token {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .xray-active-token code {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
  }

  .xray-tag {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .xray-chain {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    padding-left: var(--zbk-spacing-1);
  }

  .xray-node {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .xray-stratum {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 var(--zbk-spacing-05);
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid currentColor;
  }

  .xray-stratum-component {
    color: var(--zbk-accent-primary-600);
  }

  .xray-stratum-alias {
    color: var(--zbk-accent-secondary-600);
  }

  .xray-stratum-primitive {
    color: var(--zbk-app-ink-muted);
  }

  .xray-var {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    word-break: break-all;
  }

  .xray-ref {
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-soft);
    width: 100%;
    padding-left: var(--zbk-spacing-1);
  }

  .xray-resolved {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding-top: var(--zbk-spacing-1);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .xray-resolved-label {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .xray-swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    flex: none;
  }

  .xray-resolved-value {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    word-break: break-all;
  }

  .xray-empty {
    margin: 0;
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
  }

  /* Token spans in the prose become inspectable affordances. Scoped styles
     don't reach the article DOM, so these are declared :global. */
  :global(.reference-article code.xray-token) {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
  }

  :global(.reference-article code.xray-token:hover),
  :global(.reference-article code.xray-token.xray-active) {
    color: var(--zbk-accent-primary-600);
  }

  :global(.reference-article code.xray-token:focus-visible) {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }
</style>
