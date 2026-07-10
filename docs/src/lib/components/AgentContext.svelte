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

  const contextUrl = `/zebkit/context/${tag}.md`;

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

<section class="border border-app-muted rounded-lg canvas-app-soft flex flex-col">
  <header class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-app-muted">
    <div class="flex flex-col gap-1">
      <h3 class="text-base font-semibold ink-app-strong">Agent context</h3>
      <p class="text-sm ink-app-muted">
        The compiled contract for <code>&lt;{tag}&gt;</code> — attributes, slots, tokens, and
        variants in one file. Paste it into an agent's context or point tooling at the URL.
      </p>
    </div>
    <div class="flex gap-2">
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
    <p class="p-4 text-sm ink-app-muted">
      Context file not found. Run <code>npm run build:context</code> to generate it.
    </p>
  {:else}
    <details class="agent-context-details">
      <summary class="p-4 text-sm ink-app-muted cursor-pointer select-none">
        Show the full context ({contextUrl})
      </summary>
      <pre class="agent-context-pre">{context}</pre>
    </details>
  {/if}
</section>

<style>
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
