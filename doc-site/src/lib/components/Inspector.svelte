<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { resolveChain, allTokenVars, buildTimeVarNote, type ChainNode } from '$lib/utils/token-chain';
  import { getClassDeclaration, utilityClassSet } from '$data/utility-manifests';
  import { viewport } from '$lib/stores/viewport.svelte';
  import { openInspect, requestInspectPeek, releaseInspectPeek } from '$lib/stores/ui.svelte';

  // Adaptive inspector rail. It scans the page's `[data-inspect-root]` content
  // and wires up the things worth inspecting:
  //   - tokens  (`--zbk-*` code, or `[data-inspect-token]`) -> token x-ray
  //   - classes (utility-class code, or `[data-inspect-class]`) -> class inspector
  // Hover/focus previews, click/Enter pins. When a page has neither (the
  // "x-ray doesn't make sense" case), the rail shows an on-this-page contents
  // list built from the page's headings. Live values re-read when the a11y dials
  // move — accessibility is something you operate, decisions are data.

  type Selection = { kind: 'token'; value: string } | { kind: 'class'; value: string };
  type Wire = { el: HTMLElement; sel: Selection; off: () => void };

  const TOKEN_RE = /^--zbk-[\w-]+$/;
  const COLOR_RE = /^(#|rgb|hsl|hwb|oklch|oklab|lab|lch|color\()/i;
  const tokenVarSet = new Set(allTokenVars);

  let pinned = $state<Selection | null>(null);
  let preview = $state<Selection | null>(null);
  let query = $state('');
  let queryError = $state(false);
  let headings = $state<{ id: string; text: string; level: number }[]>([]);
  let wired = $state<Wire[]>([]);

  const active = $derived(preview ?? pinned);
  const mode = $derived<'token' | 'class' | 'contents'>(active ? active.kind : 'contents');
  const hasTokens = $derived(wired.some((w) => w.sel.kind === 'token'));

  function computedValue(cssVar: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  }

  // --- token mode ---
  const chain = $derived<ChainNode[]>(active?.kind === 'token' ? resolveChain(active.value) : []);
  const tokenLive = $derived.by<Record<string, string>>(() => {
    void theme.fontScale;
    void theme.density;
    void theme.reducedMotion;
    const out: Record<string, string> = {};
    for (const node of chain) out[node.cssVar] = computedValue(node.cssVar);
    return out;
  });
  const tokenResolved = $derived(chain.length ? (tokenLive[chain[chain.length - 1].cssVar] ?? '') : '');
  const tokenIsColor = $derived(COLOR_RE.test(tokenResolved));
  // Build-time tokens (e.g. breakpoints) aren't emitted as CSS vars by default, so
  // they resolve empty here — surface a note explaining that rather than a blank.
  const tokenNote = $derived(
    chain.length && !tokenResolved ? buildTimeVarNote(chain[chain.length - 1].cssVar) : null
  );

  // --- class mode ---
  const classInfo = $derived(active?.kind === 'class' ? getClassDeclaration(active.value) : null);
  const classVarLive = $derived.by<Record<string, string>>(() => {
    void theme.fontScale;
    void theme.density;
    void theme.reducedMotion;
    const out: Record<string, string> = {};
    if (!classInfo) return out;
    for (const d of classInfo.declarations) for (const v of d.vars) out[v] = computedValue(v);
    return out;
  });
  // Distinct token vars referenced by the active class, in declaration order.
  const classVars = $derived(
    classInfo ? [...new Set(classInfo.declarations.flatMap((d) => d.vars))] : []
  );

  function pin(sel: Selection) {
    pinned = sel;
    preview = null;
  }

  // A pin the *user* initiated (click, Enter, or the trace box) — distinct from
  // the initial auto-seed. Below the 'full' regime the rail lives in a drawer or
  // sheet, so a deliberate pin raises it; on 'full' the rail is always visible.
  function userPin(sel: Selection) {
    pin(sel);
    if (viewport.regime !== 'full') openInspect();
  }

  function normalizeToken(value: string): string {
    return value.startsWith('--') ? value : `--zbk-${value.replace(/^zbk-/, '')}`;
  }

  function trace() {
    const value = query.trim();
    if (!value) return;
    const token = normalizeToken(value);
    if (!TOKEN_RE.test(token) || !computedValue(token)) {
      queryError = true;
      return;
    }
    queryError = false;
    userPin({ kind: 'token', value: token });
  }

  // Trace immediately when the field holds an exact token — covers picking from
  // the autocomplete list as well as finishing typing a full name.
  function onQueryInput() {
    queryError = false;
    const token = normalizeToken(query.trim());
    if (tokenVarSet.has(token)) userPin({ kind: 'token', value: token });
  }

  function sameSel(a: Selection | null, b: Selection | null): boolean {
    return !!a && !!b && a.kind === b.kind && a.value === b.value;
  }

  // Classify an element as an inspectable token or class, or null. Explicit
  // data attributes win; otherwise a bare <code> is matched by its text.
  function selectionFor(el: HTMLElement): Selection | null {
    const tokenAttr = el.getAttribute('data-inspect-token');
    if (tokenAttr) return { kind: 'token', value: tokenAttr };
    const classAttr = el.getAttribute('data-inspect-class');
    if (classAttr) return { kind: 'class', value: classAttr };
    if (el.tagName === 'CODE') {
      const text = (el.textContent ?? '').trim();
      if (TOKEN_RE.test(text)) return { kind: 'token', value: text };
      if (utilityClassSet.has(text)) return { kind: 'class', value: text };
    }
    return null;
  }

  function attach(el: HTMLElement, sel: Selection): () => void {
    el.classList.add('inspect-target', sel.kind === 'token' ? 'inspect-token' : 'inspect-class');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Inspect ${sel.kind} ${sel.value}`);

    // The collapsed rail peeks only for the *selected* (pinned) affordance —
    // never on a casual hover of an unselected one (that would be a noisy,
    // surprising trigger for mouse and keyboard alike). So: a pin (click/Enter)
    // selects it and raises the peek; thereafter hovering/focusing that same
    // selection re-raises it and leaving releases it. Preview still updates for
    // every affordance — that drives the expanded rail's hover x-ray.
    const onEnter = () => {
      preview = sel;
      if (sameSel(sel, pinned)) requestInspectPeek();
    };
    const onLeave = () => {
      preview = null;
      releaseInspectPeek();
    };
    const onClick = () => {
      userPin(sel);
      requestInspectPeek();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        userPin(sel);
        requestInspectPeek();
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('focus', onEnter);
    el.addEventListener('blur', onLeave);
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('focus', onEnter);
      el.removeEventListener('blur', onLeave);
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
    };
  }

  // (Re)wire the content root. Idempotent: keeps still-present wires, drops
  // removed ones, and adds new ones — so it survives the catalog/utility filters
  // mutating the DOM. Also refreshes the on-this-page heading list.
  function rewire(root: Element) {
    const live = wired.filter((w) => {
      if (root.contains(w.el)) return true;
      w.off();
      return false;
    });
    const known = new Set(live.map((w) => w.el));

    const candidates = new Set<HTMLElement>();
    root.querySelectorAll<HTMLElement>('[data-inspect-token],[data-inspect-class],code').forEach((el) =>
      candidates.add(el)
    );

    for (const el of candidates) {
      if (known.has(el)) continue;
      const sel = selectionFor(el);
      if (!sel) continue;
      live.push({ el, sel, off: attach(el, sel) });
    }

    wired = live;

    if (!pinned) {
      const seed = wired.find((w) => w.sel.kind === 'token') ?? wired[0];
      if (seed) pin(seed.sel);
    }

    headings = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'))
      .filter((h) => h.id)
      .map((h) => ({ id: h.id, text: (h.textContent ?? '').trim(), level: Number(h.tagName[1]) }));
  }

  onMount(() => {
    const root = document.querySelector('[data-inspect-root]');
    if (!root) return;

    rewire(root);
    const observer = new MutationObserver(() => rewire(root));
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const w of wired) w.off();
      wired = [];
    };
  });

  // Keep the active prose affordance highlighted in sync with the rail.
  $effect(() => {
    for (const w of wired) w.el.classList.toggle('inspect-active', sameSel(w.sel, active));
  });
</script>

<div class="rail">
  {#if mode === 'token'}
    <h2 class="rail-title">Token x-ray</h2>
    <p class="rail-hint">Hover any <code>--zbk-</code> token in the page to trace it through the strata.</p>
  {:else if mode === 'class'}
    <h2 class="rail-title">Class inspector</h2>
    <p class="rail-hint">The CSS a utility class applies, with the tokens it resolves to.</p>
  {:else}
    <h2 class="rail-title">On this page</h2>
    <p class="rail-hint">Nothing to inspect here — jump to a section instead.</p>
  {/if}

  <form
    class="rail-search"
    onsubmit={(e) => {
      e.preventDefault();
      trace();
    }}
  >
    <label class="rail-search-label" for="xray-input">Trace a token</label>
    <input
      id="xray-input"
      class="rail-input"
      class:error={queryError}
      type="search"
      placeholder="--zbk-button-canvas"
      list="token-options"
      bind:value={query}
      oninput={onQueryInput}
      aria-invalid={queryError}
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
    />
    <datalist id="token-options">
      {#each allTokenVars as v (v)}
        <option value={v}></option>
      {/each}
    </datalist>
    {#if queryError}<span class="rail-error" role="alert">Unknown token.</span>{/if}
  </form>

  {#if mode === 'token' && chain.length}
    <p class="rail-active" aria-live="polite">
      <code>{active?.value}</code>{#if preview}<span class="rail-tag">preview</span>{/if}
    </p>

    <ol class="xray-chain">
      {#each chain as node (node.cssVar)}
        <li class="xray-node">
          <span class="xray-stratum xray-stratum-{node.stratum}">{node.stratum}</span>
          <code class="xray-var">{node.cssVar}</code>
          {#if node.ref}
            <span class="xray-ref" aria-hidden="true">↳ {node.ref}</span>
          {/if}
        </li>
      {/each}
    </ol>

    <div class="resolved">
      <span class="resolved-label">Resolved</span>
      {#if tokenIsColor}<span class="swatch" style:background={tokenResolved}></span>{/if}
      <code class="resolved-value">{tokenResolved || (tokenNote ? 'not emitted' : 'see source')}</code>
    </div>
    {#if tokenNote}
      <p class="resolved-note">{tokenNote}</p>
    {/if}
  {:else if mode === 'class' && classInfo}
    <p class="rail-active" aria-live="polite">
      <code>{active?.value}</code>{#if preview}<span class="rail-tag">preview</span>{/if}
    </p>

    <pre class="class-css"><code>.{active?.value} {'{'}
{#each classInfo.declarations as d (d.property)}  {d.property}: {d.value};
{/each}{'}'}</code></pre>

    {#if classVars.length}
      <div class="class-tokens">
        <span class="resolved-label">Resolves to</span>
        <ul class="token-values">
          {#each classVars as v (v)}
            <li class="token-value">
              {#if COLOR_RE.test(classVarLive[v] ?? '')}<span class="swatch" style:background={classVarLive[v]}></span>{/if}
              <code class="xray-var">{v}</code>
              <code class="resolved-value">{classVarLive[v] || 'see source'}</code>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <p class="class-meta">
      from <a href="/utilities/{classInfo.manifestKey}">{classInfo.family}</a>
      {#if classInfo.responsive.length}· responsive{/if}
      {#if classInfo.hover}· hover{/if}
    </p>
  {:else if headings.length}
    <nav class="contents" aria-label="On this page">
      <ul>
        {#each headings as h (h.id)}
          <li class="toc-l{h.level}"><a href="#{h.id}">{h.text}</a></li>
        {/each}
      </ul>
    </nav>
  {:else}
    <p class="rail-empty">Nothing to inspect on this page.</p>
  {/if}
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-2);
  }

  .rail-title {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--zbk-app-ink-muted);
    margin: 0;
  }

  .rail-hint {
    margin: 0;
    font-family: var(--zbk-font-family-body, inherit);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
    line-height: var(--zbk-line-height-2, 1.4);
  }

  .rail-hint code {
    font-family: var(--zbk-font-family-code);
  }

  .rail-search {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .rail-search-label {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .rail-input {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    background: var(--zbk-app-canvas-subtle);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xs);
    padding: var(--zbk-spacing-05) var(--zbk-spacing-1);
    /* type=search keeps Safari's password/contact autofill off this field;
       strip the search-input chrome so it still reads as a plain box. */
    appearance: none;
    -webkit-appearance: none;
  }

  .rail-input::-webkit-search-cancel-button,
  .rail-input::-webkit-search-decoration {
    appearance: none;
    -webkit-appearance: none;
  }

  .rail-input:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .rail-input.error {
    border-color: var(--zbk-critical-border-emphasis);
  }

  .rail-error {
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-critical-ink);
  }

  .rail-active {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .rail-active code {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
  }

  .rail-tag {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .xray-chain {
    list-style: none;
    margin: 0;
    padding: 0 0 0 var(--zbk-spacing-1);
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
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
    color: var(--zbk-app-ink-subtle);
    width: 100%;
    padding-left: var(--zbk-spacing-1);
  }

  .resolved {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding-top: var(--zbk-spacing-1);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .resolved-label {
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zbk-app-ink-muted);
  }

  .swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    flex: none;
  }

  .resolved-value {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    word-break: break-all;
  }

  .resolved-note {
    margin: var(--zbk-spacing-05) 0 0;
    font-size: var(--zbk-font-size-2xs);
    line-height: 1.4;
    color: var(--zbk-app-ink-muted);
  }

  /* class mode */
  .class-css {
    margin: 0;
    padding: var(--zbk-spacing-1);
    overflow-x: auto;
    background: var(--zbk-app-canvas-subtle);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xs);
  }

  .class-css code {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink);
    white-space: pre;
  }

  .class-tokens {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding-top: var(--zbk-spacing-1);
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .token-values {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .token-value {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .class-meta {
    margin: 0;
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-subtle);
  }

  .class-meta a {
    color: var(--zbk-accent-primary-600);
    text-decoration: none;
  }

  .class-meta a:hover {
    text-decoration: underline;
  }

  /* contents mode */
  .contents ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .contents li {
    padding-left: var(--zbk-spacing-1);
  }

  .contents .toc-l3 {
    padding-left: var(--zbk-spacing-3);
  }

  .contents a {
    color: var(--zbk-app-ink-subtle);
    text-decoration: none;
    font-size: var(--zbk-font-size-xs);
  }

  .contents a:hover {
    color: var(--zbk-accent-primary-600);
  }

  .rail-empty {
    margin: 0;
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }

  /* Inspectable affordances in the content. Scoped styles don't reach the
     article DOM, so these are declared :global, anchored to the inspect root. */
  :global([data-inspect-root] .inspect-target) {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
  }

  :global([data-inspect-root] .inspect-target:hover),
  :global([data-inspect-root] .inspect-target.inspect-active) {
    color: var(--zbk-accent-primary-600);
  }

  :global([data-inspect-root] .inspect-target:focus-visible) {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }
</style>
