<script lang="ts">
  import { onMount } from 'svelte';

  // Embeds the generated agent context (GRAMMAR.md §10) for one component:
  // the distilled contract compiled from the Custom Elements Manifest, token
  // modules, and variant registry by `npm run build:context`. The same file a
  // human reads here is what an agent should be handed.
  interface Props {
    /** Custom element tag, e.g. "zbk-checkbox". */
    tag: string;
  }

  let { tag }: Props = $props();

  const contextUrl = $derived(`/zebkit/context/${tag}.md`);

  let context = $state('');
  let error = $state(false);
  let copied = $state(false);

  onMount(async () => {
    try {
      const response = await fetch(contextUrl);
      if (!response.ok) throw new Error(String(response.status));
      context = await response.text();
    } catch {
      error = true;
    }
  });

  async function copy() {
    await navigator.clipboard.writeText(context);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<section class="border-solid border-width-xs border-app-muted radius-md canvas-app-subtle display-flex flex-direction-column">
  <header class="agent-context-header display-flex flex-wrap align-items-center justify-content-between gap-05 padding-1">
    <div class="display-flex flex-direction-column gap-025">
      <h3 class="text-md text-semibold ink-app-emphasis">Agent context</h3>
      <p class="text-sm ink-app-muted">
        The compiled contract for <code>&lt;{tag}&gt;</code> — attributes, slots, tokens, and
        variants in one file. Paste it into an agent's context or point tooling at the URL.
      </p>
    </div>
    <div class="display-flex gap-05">
      <button
        class="zbk-button zbk-button--outline zbk-button--sm"
        onclick={copy}
        disabled={!context}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <a href={contextUrl} download={`${tag}.md`} class="zbk-button zbk-button--outline zbk-button--sm">
        Download
      </a>
    </div>
  </header>

  {#if error}
    <p class="padding-1 text-sm ink-app-muted">
      Context file not found. Run <code>npm run build:context</code> to generate it.
    </p>
  {:else}
    <details class="agent-context-details">
      <summary class="padding-1 text-sm ink-app-muted cursor-pointer user-select-none">
        Show the full context ({contextUrl})
      </summary>
      <pre class="agent-context-pre">{context}</pre>
    </details>
  {/if}
</section>

<style>
  .agent-context-header {
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }

  .agent-context-pre {
    margin: 0;
    padding: var(--zbk-spacing-1);
    max-block-size: 32rem;
    overflow: auto;
    font-size: var(--zbk-font-size-xs, 0.75rem);
    line-height: 1.5;
    white-space: pre-wrap;
    border-block-start: 1px solid var(--zbk-app-border-muted, currentColor);
  }
</style>
