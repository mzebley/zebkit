<script lang="ts">
  import { onMount } from "svelte";
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

  const colors: SelectionItem[] = [
    { name: "ember", value: "hsl(16, 78%, 48%)" },
    { name: "gold", value: "hsl(40, 85%, 48%)" },
    { name: "mint", value: "hsl(158, 42%, 48%)" },
    { name: "deepcurrent", value: "hsl(224,85%,36%)" },
    { name: "violet", value: "hsl(268, 76%, 48%)" },
    { name: "rosewater", value: "hsl(352, 40%, 48%)" },
  ];
  interface SelectionItem {
    name: string;
    value: string;
    size?: string;
  }

  const families: SelectionItem[] = [
    { name: "primary", value: "Proza Libre", size: "xs" },
    { name: "alt", value: "Fraunces", size: "sm" },
    { name: "monospace", value: "Inconsolata", size: "sm" },
  ];

  let activeColor = $state<SelectionItem>(colors[0]);
  let activeFamily = $state<SelectionItem>(families[0]);

  function selectColor(color: SelectionItem) {
    activeColor = color;
  }

  function selectFamily(family: SelectionItem) {
    activeFamily = family;
  }
</script>

<div class="token-chain margin-block-2">
  <div
    class="width-full display-flex gap-1 flex-direction-column"
    role="group"
    aria-label="Swap the primitive palette driving the chain"
  >
    <span
      class="ink-accent-primary letter-spacing-wide display-flex gap-05 font-code text-uppercase text-sm"
      >Tokens in action</span
    >
    <div class="register-row">
      {#each colors as color (color)}
        <button
          type="button"
          class="register"
          class:is-active={activeColor.name === color.name}
          aria-pressed={activeColor.name === color.name}
          style={activeColor.name === color.name
            ? `border-color: var(--zbk-color-${color.name}-600)`
            : undefined}
          onclick={() => selectColor(color)}
        >
          <span
            class="register-swatch"
            style={`background: var(--zbk-color-${color.name}-600)`}
            aria-hidden="true"
          ></span>
          <span class="font-code text-capitalize text-sm">{color.name}</span>
        </button>
      {/each}
    </div>
    <div class="register-row">
      {#each families as family (family)}
        <button
          type="button"
          class="register"
          class:is-active={activeFamily.name === family.name}
          aria-pressed={activeFamily.name === family.name}
          style={activeFamily.name === family.name
            ? `border-color: var(--zbk-color-${activeColor.name}-600)`
            : undefined}
          onclick={() => selectFamily(family)}
        >
          <span
            class="register-swatch"
            style={activeFamily.name === family.name
              ? `background: var(--zbk-color-${activeColor.name}-600)`
              : `background: var(--zbk-app-border)`}
            aria-hidden="true"
          ></span>
          <span class="font-code text-capitalize text-sm"
            >{family.name} font</span
          >
        </button>
      {/each}
    </div>
  </div>

  <div class="chain">
    <div class="tier">
      <p class="tier-label font-code text-uppercase text-sm">
        <span class="tier-index">01</span>
        Primitives
      </p>
      <p class="tier-token font-code margin-block-start-05 text-sm">
        <span
          class="tier-swatch"
          style={`background: var(--zbk-color-${activeColor.name}-400)`}
          aria-hidden="true"
        ></span>
        {`--zbk-color-${activeColor.name}-400`}
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400)`}
        >
          {activeColor.value}
        </p>
      </span>
      <p class="tier-token margin-block-start-05 font-code text-sm">
        {`--zbk-font-family-${activeFamily.name}`}
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400);`}
        >
          {activeFamily.value}
        </p>
      </span>
      <p class="prose margin-block-start-05 text-xs">
        The raw vocabulary. Generally speaking, this should be the only tier
        where you'll find literal values.
      </p>
    </div>
    <div class="tier">
      <p class="tier-label font-code text-uppercase text-sm">
        <span class="tier-index">02</span>
        Aliases
      </p>
      <p class="tier-token font-code margin-block-start-05 text-sm">
        --zbk-action-ink
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400)`}
        >
          {`var(--zbk-color-${activeColor.name}-400)`}
        </p>
      </span>
      <p class="tier-token margin-block-start-05 font-code text-sm">
        --zbk-font-family-interface
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400)`}
        >
          {`var(--zbk-font-family-${activeFamily.name})`}
        </p>
      </span>
      <p class="prose text-xs margin-block-start-05">
        The design language. Here is where a raw color can become “action ink,”
        while a font family gains intuitive usage meaning from a new name.
      </p>
    </div>
    <div class="tier">
      <p class="tier-label font-code text-uppercase text-sm">
        <span class="tier-index">03</span>
        Consumers
      </p>
      <p class="tier-token font-code margin-block-start-05 text-sm">
        --zbk-toggle-canvas-checked
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400)`}
        >
          var(--zbk-action-ink)
        </p>
      </span>
      <p class="tier-token margin-block-start-05 font-code text-sm">
        --zbk-link-font-family
      </p>
      <span class="display-flex align-items-center gap-025">
        <i class="ri-corner-down-right-line ink-app-muted text-md"></i>
        <p
          class="tier-value font-code text-sm"
          style={`color: var(--zbk-color-${activeColor.name}-400)`}
        >
          var(--zbk-font-family-interface)
        </p>
      </span>
      <p class="prose text-xs margin-block-start-05">
        The token recipient. An element or utility class can consume these
        values and, uh, do things with them.
      </p>
    </div>
    <div class="tier tier-result">
      <p class="tier-label font-code text-uppercase text-sm">
        <span class="tier-index">04</span>
        The results
      </p>
      <div class="display-flex gap-1 align-items-center">
       <zbk-toggle style={`--zbk-toggle-font-family: var(--zbk-font-family-${activeFamily.name});--zbk-toggle-canvas-checked: var(--zbk-color-${activeColor.name}-400);--zbk-toggle-border-color-checked: var(--zbk-color-${activeColor.name}-400)`} name="notifications" checked>Email me about updates</zbk-toggle>

        <a class="jump-link" href="#" style={`--zbk-font-family-interface: var(--zbk-font-family-${activeFamily.name}); --zbk-action-ink: var(--zbk-color-${activeColor.name}-400); --zbk-action-ink-muted: var(--zbk-color-${activeColor.name}-200)`}
          ><span>Type scaling</span><i
            class="ri-arrow-right-line"
            aria-hidden="true"
          ></i></a
        >
      </div>
      <p class="prose text-xs">
        A real <code>&lt;zbk-button&gt;</code> — canvas, ink, border, and every hover
        state riding the same chain. So is every other button on this page.
      </p>
    </div>
  </div>

  <p class="chain-caption text-sm">
    References flow downward only, so this is no sandbox: one primitive moved at
    the root and the entire page followed — chrome, links, cards, this very
    caption. No component was edited, no class was written. Ember brings it
    home.
  </p>
</div>

<style>
  .token-chain {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
  }

  /* ── Register switcher ─────────────────────────────────────────────────── */
  .register-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zbk-spacing-05);
  }

  .register {
    display: inline-flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding-inline: var(--zbk-spacing-05) var(--zbk-spacing-1);
    padding-block: var(--zbk-spacing-05);
    background: var(--zbk-app-canvas-muted);
    color: var(--zbk-app-ink);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xl);
    height: var(--zbk-spacing-2);
    cursor: pointer;
    overflow: clip;
    transition:
      border-color var(--zbk-transition-playful-motion-duration-fast)
        var(--zbk-transition-playful-motion-function-fast),
      color var(--zbk-transition-playful-motion-duration-fast)
        var(--zbk-transition-playful-motion-function-fast),
      background-color var(--zbk-transition-playful-motion-duration-fast)
        var(--zbk-transition-playful-motion-function-fast);
  }

  .register:hover {
    border-color: var(--zbk-app-border-emphasis);
    color: var(--zbk-app-ink-emphasis);
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
    inline-size: var(--zbk-spacing-1);
    block-size: var(--zbk-spacing-1);
    border-radius: 50%;
    transition: transform var(--zbk-transition-playful-fx-duration-slow)
      var(--zbk-transition-playful-fx-function-slow);
  }

  .register.is-active .register-swatch {
    transform-origin: right center;
    transform: scale(3);
  }

  /* ── The chain ─────────────────────────────────────────────────────────── */
  .chain {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--zbk-spacing-1);
  }

  .tier {
    flex: 1 1 calc(var(--zbk-spacing-card) + var(--zbk-spacing-2));
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding: var(--zbk-spacing-1);
    background: var(--zbk-app-canvas-muted);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
  }

  .tier-label {
    color: var(--zbk-accent-primary-ink);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }

  .tier-index {
    color: var(--zbk-accent-secondary-ink);
    font-weight: var(--zbk-font-weight-semibold);
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
    border-radius: var(--zbk-border-radius-sm);
    transition: background-color var(--zbk-transition-duration-default);
  }

  .tier-value {
    color: var(--zbk-action-ink-muted);
    overflow-wrap: anywhere;
  }

  .jump-link {
    display: inline-flex;
    align-items: flex-end;
    gap: var(--zbk-spacing-025);
    font-family: var(--zbk-font-family-interface);
    font-size: var(--zbk-font-size-sm);
    text-decoration: none;
    color: var(--zbk-action-ink);
  }

  .jump-link > span {
    text-decoration: underline dotted var(--zbk-action-ink)
      var(--zbk-border-width-md);
    text-underline-offset: var(--zbk-spacing-05);
  }

  .jump-link:hover {
    color: var(--zbk-action-ink-muted);
  }

  .jump-link:hover > span {
    text-decoration-color: var(--zbk-action-ink-muted);
  }

  .jump-link:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
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
