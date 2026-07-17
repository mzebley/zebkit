<script lang="ts">
  import HeroReskin from "$lib/components/HeroReskin.svelte";
  import MorphTrack from "$lib/components/MorphTrack.svelte";
  import RotatingEyebrow from "$lib/components/RotatingEyebrow.svelte";
  import TokenChain from "$lib/components/TokenChain.svelte";
  import A11yDials from "$lib/components/A11yDials.svelte";

  // The grammar conjugated across three components — every cell is a real,
  // shipped spelling (variant registry + compiled token surface).
  const conjugations = [
    {
      intent: "Size variant",
      cells: ['variant="lg"', 'variant="lg"', 'variant="lg"'],
    },
    {
      intent: "Hover paint",
      cells: [
        "--zbk-button-canvas-hover",
        "--zbk-input-canvas-hover",
        "--zbk-select-canvas-hover",
      ],
    },
    {
      intent: "Disabled ink",
      cells: [
        "--zbk-button-ink-disabled",
        "--zbk-input-ink-disabled",
        "--zbk-select-ink-disabled",
      ],
    },
  ];

  const componentPages = [
    "button",
    "checkbox",
    "input",
    "radio",
    "select",
    "textarea",
    "toggle",
    "tooltip",
  ];

  // The field guide — every door into the rest of the site.
  const guide = [
    {
      heading: "Foundations",
      entries: [
        {
          label: "Why tokens",
          href: "/foundations/why-tokens",
          blurb: "The premise, in full.",
        },
        {
          label: "Tokens — the strata",
          href: "/foundations/tokens",
          blurb: "Primitive, alias, component: a theory of change.",
        },
        {
          label: "Overlay themes",
          href: "/foundations/theming",
          blurb: "A theme is a diff, not a second stylesheet.",
        },
        {
          label: "A11y as runtime",
          href: "/foundations/a11y",
          blurb: "Dials end users hold, not a checklist.",
        },
        {
          label: "Layers",
          href: "/foundations/layers",
          blurb: "The override story — never !important.",
        },
        {
          label: "Color",
          href: "/foundations/color",
          blurb: "Vivid and muted registers, by intent.",
        },
      ],
    },
    {
      heading: "Reference",
      entries: [
        {
          label: "Components",
          href: "/components/button",
          blurb: "Eight patterns, finished on purpose.",
        },
        {
          label: "Utilities",
          href: "/utilities",
          blurb: "Exhaustive over the platform, token-bound.",
        },
        {
          label: "Token catalog",
          href: "/tokens",
          blurb: "Every token — named, typed, described.",
        },
        {
          label: "Type scaling",
          href: "/typography/type-scale",
          blurb: "The scale, and how it flexes.",
        },
        {
          label: "Fluid spacing",
          href: "/spacing/scaling",
          blurb: "Size-based space that couples to type.",
        },
        {
          label: "Styleguide",
          href: "/styleguide",
          blurb: "The vocabulary on one wall.",
        },
      ],
    },
    {
      heading: "Tooling",
      entries: [
        {
          label: "CLI",
          href: "/cli",
          blurb: "One self-documenting zebkit.config.json.",
        },
        {
          label: "Pruning",
          href: "/pruning",
          blurb: "Build with everything, ship what you reference.",
        },
        {
          label: "For agents",
          href: "/agents",
          blurb: "The whole contract, compiled for context windows.",
        },
      ],
    },
  ];
</script>

<svelte:head>
  <title>"Change everything. Rewrite nothing."</title>
  <meta
    name="description"
    content="Zebkit is a token-driven, accessibility-first design system. Traditional design systems make you trade consistency for their look-and-feel. Zebkit keeps the consistency and hands the design opinions back to you."
  />
</svelte:head>

<div class="home width-full min-width-0 text-wrap-pretty">
  <div class="home-hero width-full">
    <div
      class="display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
    >
      <h1 class="text-4xl margin-block-end-1 tablet:text-5xl">
        Change everything.<br />Rewrite nothing.
      </h1>
      <RotatingEyebrow />
    </div>

    <MorphTrack />

    <div
      class="hero-footer display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
    >
      <a class="hero-cta font-code text-lg" href="#about-zebkit"
        ><span>Meet zebkit</span><i class="ri-corner-right-down-line text-md"
        ></i></a
      >
    </div>
  </div>

  <!-- 01 · The premise -->
  <section
    id="about-zebkit"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">01</span>The premise
    </p>
    <p class="lede">
      Traditional design systems make you pay for their consistency by enforcing
      their look-and-feel. Zebkit keeps the consistency and hands the opinion
      back to you.
    </p>
    <p class="sub">
      Every visual decision in zebkit is a token, and every token is data you
      can swap. Change the tokens and the whole product takes on <em
        >your look</em
      >: same HTML, same behavior, <em>new everything</em>.
    </p>
    <nav class="jump-links" aria-label="The premise — related pages">
      <a href="/foundations/why-tokens"
        ><span>Why tokens</span><i class="ri-arrow-right-line" aria-hidden="true"
        ></i></a
      >
    </nav>
  </section>

  <!-- 02 · The mechanism -->
  <section
    id="mechanism"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">02</span>The mechanism
    </p>
    <h2>Three tiers. One move.</h2>
    <p class="section-copy">
      Tokens are organized as a theory of change: <strong>primitives</strong> say
      what exists, <strong>aliases</strong> say what means what, and
      <strong>component tokens</strong> say what one specific thing uses. Swap a
      single primitive and everything built on its meaning moves in lockstep.
      Try it — it will re-brand this entire page, live, until you hand ember
      back.
    </p>
    <TokenChain />
    <nav class="jump-links" aria-label="The mechanism — related pages">
      <a href="/foundations/tokens"
        ><span>The strata</span><i class="ri-arrow-right-line" aria-hidden="true"
        ></i></a
      >
      <a href="/tokens"
        ><span>Token catalog</span><i
          class="ri-arrow-right-line"
          aria-hidden="true"
        ></i></a
      >
      <a href="/foundations/color"
        ><span>The palette</span><i
          class="ri-arrow-right-line"
          aria-hidden="true"
        ></i></a
      >
    </nav>
  </section>

  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 13.35 72.337 35.1"
    data-asc="0.957"
    aria-hidden="true"
    role="img"
    class="watermark"
  >
    <g fill="currentColor">
      <g transform="translate(0, 0)">
        <path
          d="M 0 47.85 L 0 45.05 L 13.25 25.9 L 9.25 25.9 C 8.05 25.9 6.983333333333333 26.06 6.05 26.38 C 5.116666666666667 26.693333333333335 4.3500000000000005 27.256666666666668 3.75 28.07 C 3.15 28.89 2.7 30.066666666666666 2.4 31.6 L 0.9 31.6 L 1.45 24.35 L 20.65 24.35 L 20.65 26.5 L 7.4 46.25 L 11.85 46.25 C 13.65 46.25 15.05 46.06666666666667 16.05 45.7 C 17.05 45.333333333333336 17.833333333333332 44.666666666666664 18.4 43.7 C 18.966666666666665 42.733333333333334 19.466666666666665 41.36666666666667 19.9 39.6 L 21.4 39.6 L 20.85 47.85 L 0 47.85 Z"
        />
        <g transform="matrix(1, 0, 0, 1, -23, 0)">
          <path
            d="M 67.25 47.85 L 67.25 46.2 C 68.183 46.2 68.883 46.133 69.35 46 C 69.817 45.867 70.117 45.623 70.25 45.27 C 70.383 44.923 70.45 44.4 70.45 43.7 L 70.45 18.2 C 70.45 17.433 70.357 16.917 70.17 16.65 C 69.99 16.383 69.6 16.25 69 16.25 L 67.35 16.25 L 67.35 14.6 L 75.4 13.35 L 77.55 13.35 L 77.55 35.413 L 83.4 29.45 C 84.533 28.283 85.11 27.407 85.13 26.82 C 85.143 26.24 84.8 25.95 84.1 25.95 L 82.85 25.95 L 82.85 24.3 L 93.2 24.35 L 93.2 26 L 92.8 26 C 91.333 26 90.007 26.41 88.82 27.23 C 87.64 28.043 86.35 29.15 84.95 30.55 L 83.206 32.257 L 90 41.75 C 90.733 42.783 91.373 43.623 91.92 44.27 C 92.473 44.923 92.973 45.41 93.42 45.73 C 93.873 46.043 94.283 46.2 94.65 46.2 L 95.15 46.2 L 95.15 47.85 L 82.6 47.85 L 82.6 46.2 L 83.3 46.2 C 83.6 46.2 83.823 46.16 83.97 46.08 C 84.123 45.993 84.2 45.867 84.2 45.7 C 84.2 45.533 84.093 45.277 83.88 44.93 C 83.66 44.577 83.417 44.2 83.15 43.8 L 78.534 36.831 L 77.55 37.794 L 77.55 43.699 C 77.55 44.399 77.6 44.922 77.7 45.269 C 77.8 45.622 78.04 45.866 78.42 45.999 C 78.807 46.132 79.417 46.199 80.25 46.199 L 80.25 47.849 L 67.25 47.85 Z"
          />
        </g>
        <g transform="matrix(1, 0, 0, 1, -30, 0)">
          <path
            d="M 64.15 48.45 C 63.017 48.45 61.993 48.343 61.08 48.13 C 60.16 47.91 59.31 47.633 58.53 47.3 C 57.843 47.009 57.15 46.692 56.453 46.35 L 56.45 46.35 L 55 47.85 L 52.6 47.85 L 52.6 18.25 C 52.6 17.417 52.5 16.877 52.3 16.63 C 52.1 16.377 51.633 16.25 50.9 16.25 L 49.5 16.25 L 49.5 14.55 L 57.45 13.35 L 59.65 13.35 L 59.65 26.394 C 60.01 26.083 60.387 25.792 60.78 25.52 C 61.527 25.007 62.393 24.59 63.38 24.27 C 64.36 23.957 65.483 23.8 66.75 23.8 C 69.717 23.8 72.05 24.783 73.75 26.75 C 75.45 28.717 76.3 31.633 76.3 35.5 C 76.3 38.367 75.81 40.757 74.83 42.67 C 73.843 44.59 72.45 46.033 70.65 47 Z M 59.83 44.88 C 60.343 45.393 60.927 45.817 61.58 46.15 C 62.227 46.483 62.933 46.65 63.7 46.65 C 65.467 46.65 66.767 45.857 67.6 44.27 C 68.433 42.69 68.85 40.083 68.85 36.45 C 68.85 33.317 68.45 30.893 67.65 29.18 C 66.85 27.46 65.567 26.6 63.8 26.6 C 63.033 26.6 62.333 26.8 61.7 27.2 C 61.067 27.6 60.493 28.057 59.98 28.57 C 59.868 28.682 59.758 28.792 59.65 28.9 L 59.65 44.696 C 59.709 44.758 59.769 44.819 59.83 44.88 Z"
          />
        </g>
      </g>
    </g>
  </svg>

  <!-- 03 · The proof — the same HTML, re-skinned by tokens alone. -->
  <section
    id="proof"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">03</span>The proof
    </p>
    <h2>Now at full scale.</h2>
    <p class="section-copy">
      Below is a complete landing page — header, cards, accent band, the works —
      as one fixed markup tree. Switch the preset and only token values change;
      the diff strip underneath is the receipt. Your own look is the same
      operation: an <a href="/foundations/theming">overlay theme</a> that
      redeclares only what it disagrees with.
    </p>
  </section>
  <HeroReskin />

  <!-- 04 · The dials -->
  <section
    id="runtime"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">04</span>The dials
    </p>
    <h2>Accessibility is a runtime property.</h2>
    <div class="runtime-grid display-grid grid-cols-1 tablet-lg:grid-cols-2">
      <div class="runtime-copy">
        <p class="section-copy">
          Most systems audit accessibility once, at build time, and ship the
          same compiled answer to every user. Zebkit wires the modifiers into
          the token chain itself — so font scale, density, and motion belong to
          the <em>end user</em>, while the application is running.
        </p>
        <p class="section-copy">
          There is no demo frame here. The page you are reading is built on the
          tokens these dials move, so everything responds — this sentence
          included.
        </p>
        <nav class="jump-links" aria-label="The dials — related pages">
          <a href="/foundations/a11y"
            ><span>A11y as runtime</span><i
              class="ri-arrow-right-line"
              aria-hidden="true"
            ></i></a
          >
          <a href="/spacing/dynamic-scaling"
            ><span>Dynamic spacing</span><i
              class="ri-arrow-right-line"
              aria-hidden="true"
            ></i></a
          >
          <a href="/typography/type-scale"
            ><span>Type scaling</span><i
              class="ri-arrow-right-line"
              aria-hidden="true"
            ></i></a
          >
        </nav>
      </div>
      <div class="dial-panel">
        <p class="dial-panel-label font-code text-uppercase text-2xs">
          Runtime dials <span class="dial-panel-live">— live on this page</span>
        </p>
        <A11yDials />
        <p class="dial-panel-note text-xs">
          The same controls sit in the top bar on every page of these docs.
        </p>
      </div>
    </div>
  </section>

  <!-- 05 · The grammar -->
  <section
    id="grammar"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">05</span>The grammar
    </p>
    <h2>Learn one component. You've learned them all.</h2>
    <p class="section-copy">
      Zebkit optimizes for the developer with no memory — the person on day one,
      the person back after six months, and the agent generating UI. One
      spelling per intent, one grammar across components: a correct guess about
      a component you've never seen is the expected case, not luck.
    </p>
    <div class="conjugation-scroll">
      <table class="conjugation">
        <caption class="font-code text-uppercase text-2xs"
          >Conjugation table — three components, zero new spellings</caption
        >
        <thead>
          <tr>
            <th scope="col">One intent</th>
            <th scope="col">zbk-button</th>
            <th scope="col">zbk-input</th>
            <th scope="col">zbk-select</th>
          </tr>
        </thead>
        <tbody>
          {#each conjugations as row (row.intent)}
            <tr>
              <th scope="row">{row.intent}</th>
              {#each row.cells as cell, i (i)}
                <td><code>{cell}</code></td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="section-copy">
      The other five conjugate identically. Pick any of them and test the claim:
    </p>
    <nav class="chip-row" aria-label="Component pages">
      {#each componentPages as name (name)}
        <a class="chip font-code text-xs" href={`/components/${name}`}
          >zbk-{name}</a
        >
      {/each}
    </nav>
    <aside class="agent-callout">
      <p class="agent-callout-title font-code text-uppercase text-2xs">
        Bring your agent
      </p>
      <p class="agent-callout-body text-sm">
        The whole contract — components, tokens, variants, utilities — compiles
        to context files at <a href="/llms.txt"><code>/llms.txt</code></a>.
        Nothing in them is hand-written, so nothing in them can drift from what
        ships.
      </p>
      <nav class="jump-links" aria-label="The grammar — related pages">
        <a href="/agents"
          ><span>For agents</span><i
            class="ri-arrow-right-line"
            aria-hidden="true"
          ></i></a
        >
      </nav>
    </aside>
  </section>

  <!-- 06 · The field guide -->
  <section
    id="field-guide"
    class="home-section display-flex flex-direction-column prose width-full max-width-section padding-inline-105 padding-block-2 tablet:padding-inline-4"
  >
    <p class="section-eyebrow font-code text-uppercase text-sm">
      <span class="eyebrow-index">06</span>The field guide
    </p>
    <h2>Pick a door.</h2>
    <div class="guide-grid display-grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3">
      {#each guide as group (group.heading)}
        <nav class="guide-group" aria-label={group.heading}>
          <p class="guide-heading font-code text-uppercase text-2xs">
            {group.heading}
          </p>
          <ul class="guide-list">
            {#each group.entries as entry (entry.href)}
              <li>
                <a href={entry.href}>{entry.label}</a>
                <span class="guide-blurb text-xs">{entry.blurb}</span>
              </li>
            {/each}
          </ul>
        </nav>
      {/each}
    </div>
    <p class="guide-coda font-code text-sm">
      Change everything. Rewrite nothing.
    </p>
  </section>
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .home-hero {
    --home-top-bar-height: calc(
      var(--zbk-spacing-205) + var(--zbk-border-width-xs)
    );

    display: flex;
    flex-direction: column;
    align-items: center;
    min-block-size: calc(100dvh - var(--home-top-bar-height));
  }

  .hero-footer {
    flex: 0 0 auto;
    min-height: max-content;
  }

  .sub {
    max-width: 60ch;
    margin-top: var(--zbk-spacing-1);
  }

  .watermark {
    width: var(--zbk-spacing-tablet-lg);
    max-width: 90vw;
    position: fixed;
    opacity: 0.15;
    z-index: -1;
    touch-action: none;
    pointer-events: none;
    bottom: 0;
    right: 0;
    color: var(--zbk-brand-canvas-muted);
  }

  /* ── Section rhythm ────────────────────────────────────────────────────── */
  .home-section {
    scroll-margin-block-start: calc(
      var(--zbk-spacing-205) + var(--zbk-spacing-1)
    );
    padding-block: var(--zbk-spacing-3);
  }

  .home-section h2 {
    margin-block: 0;
    max-inline-size: var(--zbk-text-measure-3);
  }

  .section-eyebrow {
    margin: 0 0 var(--zbk-spacing-05);
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wider);
  }

  .eyebrow-index {
    color: var(--zbk-action-ink-muted);
    margin-inline-end: var(--zbk-spacing-05);
  }

  .section-copy {
    max-inline-size: var(--zbk-text-measure-3);
  }

  .section-copy a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--zbk-action-ink-subtle);
    text-underline-offset: 0.15em;
  }

  .section-copy a:hover {
    color: var(--zbk-action-ink);
    text-decoration-color: currentColor;
  }

  /* ── Jump links — the hero CTA's dotted register, in miniature ─────────── */
  .jump-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05) var(--zbk-spacing-2);
    margin-block-start: var(--zbk-spacing-105);
  }

  .jump-links a {
    display: inline-flex;
    align-items: flex-end;
    gap: var(--zbk-spacing-025);
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-sm);
    text-decoration: none;
    color: var(--zbk-action-ink-muted);
  }

  .jump-links a > span {
    text-decoration: underline dotted var(--zbk-action-ink-muted)
      var(--zbk-border-width-md);
    text-underline-offset: var(--zbk-spacing-05);
  }

  .jump-links a:hover {
    color: var(--zbk-action-ink);
  }

  .jump-links a:hover > span {
    text-decoration-color: var(--zbk-action-ink);
  }

  .jump-links a:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .jump-links i {
    line-height: 1;
  }

  /* ── Hero CTA (unchanged register) ─────────────────────────────────────── */
  .hero-cta {
    text-decoration: none;
    color: var(--zbk-action-ink-muted);
    margin-top: auto;
    display: flex;
    align-items: flex-end;
    gap: var(--zbk-spacing-025);
  }

  .hero-cta > span {
    text-decoration: underline dotted var(--zbk-action-ink-muted) 3px;
    text-underline-offset: var(--zbk-spacing-05);
  }

  .hero-cta > i {
    line-height: 1;
  }

  /* ── 04 · Runtime dials ────────────────────────────────────────────────── */
  .runtime-grid {
    gap: var(--zbk-spacing-2);
    align-items: start;
  }

  .runtime-copy {
    display: flex;
    flex-direction: column;
  }

  .dial-panel {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-105);
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas-subtle);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
    max-inline-size: var(--zbk-text-measure-2);
  }

  .dial-panel-label {
    margin: 0;
    color: var(--zbk-app-ink);
    letter-spacing: var(--zbk-letter-spacing-wide);
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    padding-block-end: var(--zbk-spacing-05);
  }

  .dial-panel-live {
    color: var(--zbk-action-ink-muted);
    text-transform: none;
    letter-spacing: normal;
  }

  .dial-panel-note {
    margin: 0;
    color: var(--zbk-app-ink-subtle);
    font-style: italic;
  }

  /* ── 05 · Grammar ──────────────────────────────────────────────────────── */
  .conjugation-scroll {
    overflow-x: auto;
    margin-block-start: var(--zbk-spacing-1);
  }

  .conjugation {
    border-collapse: collapse;
    font-size: var(--zbk-font-size-sm);
    line-height: var(--zbk-line-height-2);
  }

  .conjugation caption {
    caption-side: top;
    text-align: start;
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wide);
    padding-block-end: var(--zbk-spacing-05);
  }

  .conjugation th {
    font-family: var(--zbk-font-family-interface);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-normal);
    letter-spacing: var(--zbk-letter-spacing-wide);
    text-transform: uppercase;
    text-align: start;
    color: var(--zbk-app-ink-subtle);
  }

  .conjugation thead th {
    border-block-end: var(--zbk-border-width-xs) solid
      var(--zbk-app-border-emphasis);
  }

  .conjugation :is(th, td) {
    padding: var(--zbk-spacing-05) var(--zbk-spacing-105);
  }

  .conjugation :is(th, td):first-child {
    padding-inline-start: 0;
  }

  .conjugation td {
    border-block-end: var(--zbk-border-width-xs) solid
      var(--zbk-app-border-subtle);
  }

  .conjugation tbody th {
    border-block-end: var(--zbk-border-width-xs) solid
      var(--zbk-app-border-subtle);
  }

  .conjugation code {
    font-family: var(--zbk-font-family-code);
    white-space: nowrap;
    color: var(--zbk-action-ink-muted);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05);
  }

  .chip {
    padding-inline: var(--zbk-spacing-05);
    padding-block: var(--zbk-spacing-025);
    color: var(--zbk-app-ink-muted);
    background: var(--zbk-app-canvas-subtle);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-xl);
    text-decoration: none;
    transition:
      border-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast);
  }

  .chip:hover {
    color: var(--zbk-action-ink);
    border-color: var(--zbk-action-ink-muted);
  }

  .chip:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .agent-callout {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    margin-block-start: var(--zbk-spacing-2);
    padding: var(--zbk-spacing-105);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-inline-start: var(--zbk-border-width-lg) solid
      var(--zbk-action-ink-muted);
    border-radius: var(--zbk-border-radius-md);
    background: var(--zbk-app-canvas-subtle);
    max-inline-size: var(--zbk-text-measure-3);
  }

  .agent-callout p {
    margin: 0;
  }

  .agent-callout .jump-links {
    margin-block-start: var(--zbk-spacing-05);
  }

  .agent-callout-title {
    color: var(--zbk-app-ink);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }

  .agent-callout-body {
    color: var(--zbk-app-ink-muted);
  }

  .agent-callout-body a {
    color: var(--zbk-action-ink-muted);
  }

  .agent-callout-body a:hover {
    color: var(--zbk-action-ink);
  }

  .agent-callout-body code {
    font-family: var(--zbk-font-family-code);
  }

  /* ── 06 · Field guide ──────────────────────────────────────────────────── */
  .guide-grid {
    gap: var(--zbk-spacing-2);
    margin-block-start: var(--zbk-spacing-1);
  }

  .guide-heading {
    margin: 0 0 var(--zbk-spacing-05);
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wider);
    border-block-end: var(--zbk-border-width-xs) solid
      var(--zbk-app-border-emphasis);
    padding-block-end: var(--zbk-spacing-05);
  }

  .guide-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .guide-list li {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
  }

  .guide-list a {
    align-self: start;
    color: var(--zbk-app-ink);
    font-family: var(--zbk-font-family-interface);
    text-decoration: underline;
    text-decoration-color: var(--zbk-action-ink-subtle);
    text-decoration-thickness: var(--zbk-border-width-xs);
    text-underline-offset: 0.15em;
  }

  .guide-list a:hover {
    color: var(--zbk-action-ink);
    text-decoration-color: currentColor;
  }

  .guide-list a:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .guide-blurb {
    color: var(--zbk-app-ink-subtle);
  }

  .guide-coda {
    margin: var(--zbk-spacing-3) 0 0;
    color: var(--zbk-app-ink-subtle);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }

  @media (prefers-reduced-motion: reduce) {
    .chip {
      transition: none;
    }
  }

  :global(html[data-zbk-reduced-motion]) .chip {
    transition: none;
  }
</style>
