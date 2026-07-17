<script lang="ts">
  import { onMount } from "svelte";
  import ZebkitLoader from "$lib/components/ZebkitLoader.svelte";
  import ZbkButton from "$lib/components/ZbkButton.svelte";

  // The strata, made grabbable. Each register is a real primitive palette from
  // the token language; picking one re-points the docs theme's brand hue at that
  // palette's own hue/saturation primitives. The override is a token *reference*
  // — never a raw value — so the demo obeys the same rules it demonstrates.
  //
  // It must land on `document.documentElement` (`:root`), not a wrapper div: a
  // custom property's var() references substitute at the element where it is
  // *declared*, and the whole derived chain (`--zbk-color-ember-*` → action
  // aliases → component tokens) is declared at `:root`. Descendants only
  // inherit the finished values, so a scoped override would change nothing.
  // Overriding at the root is also the honest version of the claim: the entire
  // page re-resolves, not a sandboxed subtree.
  const registers = [
    "ember",
    "gold",
    "mint",
    "sea",
    "violet",
    "foxglove",
  ] as const;
  type Register = (typeof registers)[number];

  const HUE = "--zbk-color-ember-hue";
  const SAT = "--zbk-color-ember-saturation";

  let active = $state<Register>("ember");
  // SSR fallback matches the shipped declaration; replaced by the live
  // computed value after hydration and on every swap.
  let resolvedPrimitive = $state("hsl(16, 78%, 48%)");

  function readResolvedPrimitive() {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--zbk-color-ember-600")
      .trim();
    if (value) resolvedPrimitive = value.replace(/,(?=\S)/g, ", ");
  }

  function select(name: Register) {
    active = name;
    const root = document.documentElement;
    if (name === "ember") {
      root.style.removeProperty(HUE);
      root.style.removeProperty(SAT);
    } else {
      root.style.setProperty(HUE, `var(--zbk-color-${name}-hue)`);
      root.style.setProperty(SAT, `var(--zbk-color-${name}-saturation)`);
    }
    readResolvedPrimitive();
  }

  onMount(() => {
    readResolvedPrimitive();
    // Leaving the page takes the experiment with it.
    return () => {
      document.documentElement.style.removeProperty(HUE);
      document.documentElement.style.removeProperty(SAT);
    };
  });

  // The chain on display — real declarations from the shipped default theme,
  // one per tier. If these drift from the build, that is a docs bug.
  const tiers = [
    {
      label: "primitive",
      claim: "what exists",
      token: "--zbk-color-ember-600",
      value: "hsl(16, 78%, 48%)",
      note: "The raw vocabulary. The only tier where a literal value may appear.",
    },
    {
      label: "alias",
      claim: "what means what",
      token: "--zbk-action-ink",
      value: "var(--zbk-color-ember-600)",
      note: "The design language. Here is where a color becomes “action.”",
    },
    {
      label: "component",
      claim: "what this thing uses",
      token: "--zbk-button-ink",
      value: "var(--zbk-action-ink)",
      note: "The surface one component paints from — overridable without touching its neighbors.",
    },
  ];
</script>

<ZebkitLoader />

<div class="token-chain">
  <div
    class="register-row"
    role="group"
    aria-label="Swap the primitive palette driving the chain"
  >
    <span class="register-label font-code text-uppercase text-2xs"
      >Swap the primitive</span
    >
    {#each registers as name (name)}
      <button
        type="button"
        class="register"
        class:is-active={active === name}
        aria-pressed={active === name}
        onclick={() => select(name)}
      >
        <span
          class="register-swatch"
          style={`background: var(--zbk-color-${name}-500)`}
          aria-hidden="true"
        ></span>
        <span class="font-code text-xs"
          >{name}{#if name === "ember" && active !== "ember"}<span
              class="register-reset">(reset)</span
            >{/if}</span
        >
      </button>
    {/each}
  </div>

  <div class="chain">
    {#each tiers as tier, i (tier.token)}
      {#if i > 0}
        <span class="chain-arrow font-code" aria-hidden="true">&rarr;</span>
      {/if}
      <div class="tier">
        <p class="tier-label font-code text-uppercase text-2xs">
          <span class="tier-index">0{i + 1}</span>
          {tier.label} <em>&mdash; {tier.claim}</em>
        </p>
        <p class="tier-token font-code text-sm">
          {tier.token}{#if i === 0}<span
              class="tier-swatch"
              style="background: var(--zbk-color-ember-600)"
              aria-hidden="true"
            ></span>{/if}
        </p>
        <p class="tier-value font-code text-xs">
          {i === 0 ? resolvedPrimitive : tier.value}
        </p>
        <p class="tier-note text-xs">{tier.note}</p>
      </div>
    {/each}

    <span class="chain-arrow font-code" aria-hidden="true">&rarr;</span>

    <div class="tier tier-result">
      <p class="tier-label font-code text-uppercase text-2xs">
        <span class="tier-index">04</span>
        the paint
      </p>
      <div class="result-stage">
        <ZbkButton>Hover me</ZbkButton>
      </div>
      <p class="tier-note text-xs">
        A real <code>&lt;zbk-button&gt;</code> — canvas, ink, border, and every hover
        state riding the same chain. So is every other button on this page.
      </p>
    </div>
  </div>

  <p class="chain-caption text-sm">
    References flow downward only, so this is no sandbox: one primitive moved
    at the root and the entire page followed — chrome, links, cards, this very
    caption. No component was edited, no class was written. Ember brings it
    home.
  </p>
</div>

<style>
  .token-chain {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-105);
  }

  /* ── Register switcher ─────────────────────────────────────────────────── */
  .register-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .register-label {
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wide);
    margin-inline-end: var(--zbk-spacing-05);
  }

  .register {
    display: inline-flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding-inline: var(--zbk-spacing-05);
    padding-block: var(--zbk-spacing-025);
    background: var(--zbk-app-canvas-subtle);
    color: var(--zbk-app-ink-muted);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xl);
    cursor: pointer;
    transition:
      border-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast),
      background-color var(--zbk-transition-duration-fast);
  }

  .register:hover {
    border-color: var(--zbk-app-border-emphasis);
    color: var(--zbk-app-ink);
  }

  .register.is-active {
    border-color: var(--zbk-action-ink-muted);
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
  }

  .register:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .register-swatch {
    inline-size: var(--zbk-spacing-05);
    block-size: var(--zbk-spacing-05);
    border-radius: 50%;
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
  }

  .register-reset {
    color: var(--zbk-app-ink-subtle);
    margin-inline-start: var(--zbk-spacing-025);
  }

  /* ── The chain ─────────────────────────────────────────────────────────── */
  .chain {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--zbk-spacing-05);
  }

  .chain-arrow {
    align-self: center;
    color: var(--zbk-app-ink-subtle);
    font-size: var(--zbk-font-size-lg);
  }

  .tier {
    flex: 1 1 13rem;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas-subtle);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
  }

  .tier p {
    margin: 0;
  }

  .tier-label {
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }

  .tier-label em {
    font-style: normal;
    text-transform: none;
    letter-spacing: normal;
  }

  .tier-index {
    color: var(--zbk-action-ink-muted);
  }

  .tier-token {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    color: var(--zbk-app-ink);
    overflow-wrap: anywhere;
  }

  .tier-swatch {
    flex: 0 0 auto;
    inline-size: var(--zbk-spacing-1);
    block-size: var(--zbk-spacing-1);
    border-radius: var(--zbk-border-radius-xs);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    transition: background-color var(--zbk-transition-duration-default);
  }

  .tier-value {
    color: var(--zbk-action-ink-muted);
    overflow-wrap: anywhere;
  }

  .tier-note {
    color: var(--zbk-app-ink-muted);
    max-inline-size: var(--zbk-text-measure-2);
  }

  .tier-note code {
    font-family: var(--zbk-font-family-code);
  }

  .tier-result {
    border-color: var(--zbk-app-border-emphasis);
  }

  .result-stage {
    display: flex;
    align-items: center;
    flex: 1 0 auto;
    padding-block: var(--zbk-spacing-05);
  }

  .chain-caption {
    margin: 0;
    color: var(--zbk-app-ink-subtle);
    font-style: italic;
    max-inline-size: var(--zbk-text-measure-3);
  }

  @media (prefers-reduced-motion: reduce) {
    .register,
    .tier-swatch {
      transition: none;
    }
  }

  :global(html[data-zbk-reduced-motion]) .register,
  :global(html[data-zbk-reduced-motion]) .tier-swatch {
    transition: none;
  }
</style>
