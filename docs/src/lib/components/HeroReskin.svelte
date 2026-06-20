<script lang="ts">
  import { theme } from "$lib/stores/theme.svelte";
  import { heroThemes, diffFor, type HeroThemeName } from "$data/hero-themes";
  import ZebkitLoader from "$components/ZebkitLoader.svelte";

  // Hero-local reskin state lives on the shared store (scaffolded there), but only
  // this component reads it — switching never touches the rest of the page.
  let active = $derived(theme.reskinTheme as HeroThemeName);
  let activeTheme = $derived(
    heroThemes.find((t) => t.name === active) ?? heroThemes[0],
  );
  let diff = $derived(diffFor(active));

  function select(name: HeroThemeName) {
    theme.reskinTheme = name;
  }

  // The reskinned subtree. Its `apple` preset header is `position: sticky`, so it
  // must pin just below the real docs TopBar. The TopBar's height isn't a constant
  // we can hardcode: the a11y dials (font scale / density) rescale rem-based spacing,
  // so its rendered height drifts. Measure it live and feed it to `--nav-top`.
  let reskinEl = $state<HTMLDivElement>();

  $effect(() => {
    const topBar = document.querySelector<HTMLElement>(".top-bar");
    if (!reskinEl || !topBar) return;

    const sync = () => {
      reskinEl!.style.setProperty(
        "--nav-top",
        `${topBar.getBoundingClientRect().height}px`,
      );
    };

    sync();
    // Catches font-scale / density dial changes, viewport reflow, and any future
    // chrome that grows the TopBar — all of which change its rendered height.
    const ro = new ResizeObserver(sync);
    ro.observe(topBar);
    return () => ro.disconnect();
  });

  // Wayfinding cards — mock the section index of a design-system docs home.
  // Static and identical across presets so the only thing that changes is tokens.
  const sections = [
    {
      label: "Layout",
      href: "/foundations/layers",
      blurb: "Grid, stack, and spacing primitives.",
      kind: "layout",
    },
    {
      label: "Typography",
      href: "/typography",
      blurb: "Type scale, families, and measure.",
      kind: "type",
    },
    {
      label: "Color",
      href: "/foundations/color",
      blurb: "Semantic palettes and contrast pairs.",
      kind: "color",
    },
    {
      label: "Icons",
      href: "/foundations/icons",
      blurb: "The icon set and sizing tokens.",
      kind: "icons",
    },
    {
      label: "Components",
      href: "/components",
      blurb: "Accessible, token-driven elements.",
      kind: "components",
    },
    {
      label: "Spacing",
      href: "/spacing",
      blurb: "The size-based spacing scale.",
      kind: "spacing",
    },
  ];

  // "Next steps" — real wayfinding into the zebkit docs (some routes are aspirational).
  const nextSteps = [
    { label: "Get started", href: "/foundations/why-tokens" },
    { label: "Design tokens", href: "/foundations/tokens" },
    { label: "Browse components", href: "/components/button" },
    { label: "Accessibility", href: "/foundations/a11y" },
  ];
</script>

<svelte:head>
  {#each heroThemes as t (t.name)}
    <link rel="stylesheet" href={`/zebkit/themes/zbk-${t.name}.css`} />
  {/each}
</svelte:head>

<ZebkitLoader />

<section
  class="reskin-stage"
  aria-label="Reskin demo — change the tokens, keep the HTML"
  id="reskin-playground"
>
  <!-- Preset switcher -->
  <div class="switcher" role="group" aria-label="Theme preset">
    {#each heroThemes as t (t.name)}
      <button
        type="button"
        class="chip font-code text-xs"
        class:is-active={active === t.name}
        aria-pressed={active === t.name}
        onclick={() => select(t.name)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <!-- The themed subtree: one HTML tree, re-skinned purely by the data attribute -->
  <div
    class="reskin canvas-app ink-app"
    data-zbk-theme={active}
    bind:this={reskinEl}
  >
    <!-- Site header -->
    <header class="site-nav">
      <span class="wordmark">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 13.35 72.337 35.1"
          data-asc="0.957"
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
      </span>
      <nav class="site-nav-links" aria-label="Primary">
        <span class="nav-link is-current">Docs</span>
        <span class="nav-link">Components</span>
        <span class="nav-link">Foundations</span>
        <span class="nav-link">GitHub</span>
      </nav>
      <a
        class="influence-link"
        href={activeTheme.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Influenced by ${activeTheme.source} — opens the ${activeTheme.source} design system in a new tab`}
      >
        <span>Influenced by {activeTheme.source}</span>
        <i class="influence-icon ri-arrow-left-s-line" aria-hidden="true"></i>
      </a>
    </header>

    <!-- Intro / lede -->
    <div class="intro prose">
      <h1>Their design system,<br /> your tokens.</h1>
      <p class="lede">
        Everything below is one fixed markup tree — the same sort of landing
        page any traditional design system would ship. Switch the preset and
        only the design tokens driving the UI decisions are changed, the
        structure and semantic HTML remain constant.
      </p>
      <div class="cta-row">
        <zbk-button>Get started</zbk-button>
        <zbk-button variant="outline">Read the docs</zbk-button>
      </div>
    </div>

    <!-- Section index cards -->
    <section class="sections" aria-label="Explore the system">
      <h3
        class="font-code text-uppercase text-sm section-heading ink-app-muted"
      >
        Explore the system
      </h3>
      <div class="section-grid">
        {#each sections as s (s.label)}
          <a class="section-card" href={s.href}>
            <!-- Decorative, token-driven thumbnail. Not an image: it re-skins with the
                 preset (accent ramp, radius, type) and is hidden from assistive tech. -->
            <span class="thumb thumb-{s.kind}" aria-hidden="true">
              {#if s.kind === "layout"}
                <span class="m-layout"
                  ><i class="m-col"></i><span class="m-stack"
                    ><i></i><i></i><i></i></span
                  ></span
                >
              {:else if s.kind === "type"}
                <span class="m-type font-heading">Aa</span>
              {:else if s.kind === "color"}
                <span class="m-swatches">
                  <i style="background:var(--zbk-accent-primary-200)"></i>
                  <i style="background:var(--zbk-accent-primary-400)"></i>
                  <i style="background:var(--zbk-accent-primary-500)"></i>
                  <i style="background:var(--zbk-accent-primary-600)"></i>
                  <i style="background:var(--zbk-accent-primary-800)"></i>
                </span>
              {:else if s.kind === "icons"}
                <span class="m-icons"
                  ><i class="m-circle"></i><i class="m-square"></i><i
                    class="m-tri"
                  ></i></span
                >
              {:else if s.kind === "components"}
                <span class="m-components"
                  ><span class="m-btn">Button</span><i class="m-field"
                  ></i></span
                >
              {:else if s.kind === "spacing"}
                <span class="m-spacing"
                  ><i style="inline-size:35%"></i><i style="inline-size:60%"
                  ></i><i style="inline-size:85%"></i></span
                >
              {/if}
            </span>
            <span class="section-card-body">
              <span class="section-card-title font-heading text-xl ink-app"
                >{s.label}</span
              >
              <span class="section-card-blurb font-body text-sm ink-app-muted"
                >{s.blurb}</span
              >
              <span
                class="section-card-go font-code text-2xs text-uppercase ink-accent-primary-700"
                aria-hidden="true">Explore →</span
              >
            </span>
          </a>
        {/each}
      </div>
    </section>

    <!-- Accent band — a deliberately inverted surface to show the action color in full -->
    <section class="accent-band">
      <p class="font-code text-uppercase text-2xs accent-eyebrow">
        Accessible by default
      </p>
      <h3 class="font-heading text-2xl accent-headline">
        Contrast, focus, and motion are baked into the tokens.
      </h3>
      <p class="font-body text-md accent-lede">
        This band paints from the action color instead of the page canvas — and
        its text pairs with it automatically, in every preset.
      </p>
      <a class="accent-cta font-interface text-bold" href="/foundations/a11y"
        >See the a11y model →</a
      >
    </section>

    <!-- Next steps -->
    <section class="next-steps">
      <h3 class="font-heading text-xl ink-app next-steps-heading">
        Next steps
      </h3>
      <div class="next-grid">
        {#each nextSteps as step (step.label)}
          <a class="next-link font-interface text-bold" href={step.href}
            >{step.label}</a
          >
        {/each}
      </div>
    </section>
  </div>

  <!-- Token-diff strip — the proof that only tokens changed, not the HTML -->
  <aside class="diff-strip" aria-live="polite">
    <div class="diff-lead">
      <h3 class="font-code text-uppercase text-sm diff-title">
        Tokens changed
      </h3>
      <p class="font-body text-2xs diff-sub">
        vs. the zebkit base — <strong>{diff.totalChanged}</strong> values
      </p>
    </div>
    <dl class="diff-list font-body text-sm">
      {#each diff.rows as row (row.label)}
        <div class="diff-row">
          <dt>{row.label}</dt>
          <dd class="font-code">{row.value}</dd>
        </div>
      {/each}
    </dl>
  </aside>

  <p class="reskin-caption font-body text-sm">
    Same HTML. Same classes. Only the tokens changed.
  </p>
</section>

<style>
  /* ── Stage chrome (NOT themed — belongs to the docs page) ──────────────── */
  .reskin-stage {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding-block-start: var(--zbk-spacing-3);
  }

  .switcher {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05);
  }
  .chip {
    padding-block: var(--zbk-spacing-025);
    padding-inline: var(--zbk-spacing-1);
    background: transparent;
    color: var(--zbk-app-ink);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    background: var(--zbk-app-canvas);
    border-radius: var(--zbk-border-radius-sm);
    cursor: pointer;
    transition:
      background-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast);
  }
  .chip:hover {
    color: var(--zbk-app-ink);
    border-color: var(--zbk-action-canvas-soft);
  }
  .chip.is-active {
    background: var(--zbk-action-canvas-muted);
    color: var(--zbk-app-ink);
    border-color: var(--zbk-action-canvas);
  }
  .chip:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  /* ── The themed subtree ────────────────────────────────────────────────── */
  .reskin {
    /* Every paint inside binds a token, so flipping data-zbk-theme repaints all of it. */
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-lg);
    overflow: clip;
    transition:
      background-color var(--zbk-transition-duration-default),
      color var(--zbk-transition-duration-default),
      border-color var(--zbk-transition-duration-default);
  }

  /* Site header */
  .site-nav {
    display: flex;
    align-items: center;
    justify-content: var(--nav-justify);
    flex-wrap: wrap;
    gap: var(--nav-gap);
    padding-inline: var(--nav-padding-inline);
    padding-block: var(--nav-padding-block);
    background: var(--nav-canvas);
    border-block-end: var(--nav-border-width) solid var(--zbk-app-border);
    min-height: var(--nav-min-height);
    position: var(--nav-position);
    /* `--nav-top` is measured from the live docs TopBar height in HeroReskin's
       script (a ResizeObserver keeps it synced through a11y dial changes), with
       the token below as the pre-hydration / SSR fallback. */
    top: var(--nav-top);
    font-size: var(--nav-font-size);
    font-family: var(--nav-font-family);
    font-weight: var(--nav-font-weight);
    backdrop-filter: var(--nav-backdrop-filter);
    z-index: 1;
  }

  [data-zbk-theme="apple"] {
    --nav-min-height: var(--zbk-spacing-3);
    --nav-position: sticky;
    --nav-padding-block: 0;
    --nav-padding-inline: var(--zbk-spacing-2);
    --nav-top: var(--zbk-spacing-205);
    --nav-justify: center;
    --nav-font-size: var(--zbk-font-size-sm);
    --nav-font-family: var(--zbk-font-family-primary);
    --nav-font-weight: 400;
    --nav-ink: rgba(0, 0, 0, 0.8);
    --nav-ink-current: currentColor;
    --nav-canvas: rgba(250, 250, 252, 0.8);
    --nav-backdrop-filter: saturate(180%) blur(20px);
    --nav-border-width: 0px;
    --nav-gap: var(--zbk-spacing-2);
    --nav-link-gap: var(--zbk-spacing-2);

    --wordmark-height: var(--zbk-spacing-1);
    --wordmark-ink: currentColor;
  }
  .wordmark {
    color: var(--wordmark-ink);
    svg {
      height: var(--wordmark-height);
    }
  }
  .site-nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nav-link-gap);
  }
  .nav-link {
    color: var(--nav-ink);
    cursor: pointer;
  }
  .nav-link.is-current {
    color: var(--nav-ink-current);
  }
  .influence-link {
    display: inline-flex;
    align-items: center;
    gap: var(--influence-link-gap);
    padding-inline: var(--influence-link-padding-inline);
    padding-block: var(--influence-link-padding-block);
    color: var(--influence-link-ink);
    background: var(--influence-link-canvas);
    border: var(--influence-link-border-width) solid
      var(--influence-link-border-color);
    border-radius: var(--influence-link-border-radius);
    text-decoration: none;
    white-space: nowrap;
    font-size: var(--influence-link-font-size);
    font-family: var(--influence-link-font-family);
    font-weight: var(--influence-link-font-weight);
    line-height: var(--influence-link-line-height);
    letter-spacing: var(--influence-link-letter-spacing);
    transition:
      background-color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast);
  }

  .influence-link > span {
    text-decoration: var(--influence-link-text-decoration);
  }

  .influence-link:hover {
    color: var(--influence-link-ink-hover);
    background: var(--influence-link-canvas-hover);
    border-color: var(--influence-link-border-color-hover);
    
  }

  .influence-link:hover > span {
    text-decoration: var(--influence-link-text-decoration-hover);
  }
  .influence-link:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }
  .influence-icon {
    font-size: var(--influence-link-icon-size);
    line-height: 0;
  }

  .influence-icon:before {
    content: var(--influence-link-icon-content);
  }

  [data-zbk-theme="apple"] {
    --influence-link-gap: var(--zbk-spacing-0);
    --influence-link-padding-block: var(--zbk-spacing-05);
    --influence-link-padding-inline: var(--zbk-spacing-05);
    --influence-link-ink: var(--zbk-action-ink);
    --influence-link-ink-hover: var(--zbk-action-ink);
    --influence-link-canvas: transparent;
    --influence-link-canvas-hover: transparent;
    --influence-link-border-radius: 0px;
    --influence-link-border-width: 0px;
    --influence-link-border-color: transparent;
    --influence-link-border-color-hover: transparent;
    --influence-link-text-decoration: none;
    --influence-link-text-decoration-hover: underline;
    --influence-link-icon-size: var(--zbk-font-size-md);
    --influence-link-icon-content: "\ea6e";
    --influence-link-font-size: var(--zbk-font-size-sm);
    --influence-link-font-family: var(--zbk-font-family-primary);
    --influence-link-font-weight: 400;
    --influence-link-line-height: var(--zbk-line-height-4);
    --influence-link-letter-spacing: var(--zbk-letter-spacing-tighter);
  }

  /* Intro */
  .intro {
    display: flex;
    flex-direction: column;
    align-items: var(--intro-align, flex-start);
    padding-inline: var(--intro-padding-inline);
    padding-block: var(--intro-padding-block);
    background: var(--intro-canvas);
  }

  .intro h1 {
    text-align: var(--intro-h1-align);
  }

  .lede {
    margin-block: var(--lede-margin-block-start) var(--lede-margin-block-end);
    font-size: var(--lede-font-size);
    max-inline-size: var(--lede-measure);
    text-align: var(--lede-align);
    line-height: var(--lede-line-height);
    font-weight: var(--lede-font-weight);
    width: 100%;
  }

  [data-zbk-theme="apple"] {
    --intro-align: center;
    --intro-h1-align: center;
    --intro-padding-block: var(--zbk-spacing-6);
    --intro-padding-inline: var(--zbk-spacing-3);
    --intro-canvas: var(--zbk-app-canvas);

    --lede-align: center;
    --lede-font-size: var(--zbk-font-size-lg);
    --lede-measure: 64ch;
    --lede-margin-block-start: var(--zbk-spacing-105);
    --lede-margin-block-end: var(--zbk-spacing-105);
    --lede-line-height: var(--zbk-line-height-3);
    --lede-font-weight: 300;

    .zbk-button--outline {
      --zbk-button-border-width: var(--zbk-border-width-xs);
      --zbk-button-canvas: transparent;
      --zbk-button-ink: var(--zbk-action-ink);
    }
  }
  .display {
    margin: 0;
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-button-group-gap);
    margin-block-start: var(--zbk-spacing-105);
  }

  /* Section index */
  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-105);
    padding-inline: var(--zbk-spacing-2);
    padding-block-end: var(--zbk-spacing-3);
  }
  .section-heading {
    margin: 0;
    letter-spacing: var(--zbk-letter-spacing-wide);
  }
  .section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: var(--zbk-spacing-1);
  }
  .section-card {
    display: flex;
    flex-direction: column;
    background: var(--zbk-app-canvas-soft);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-lg);
    overflow: clip;
    text-decoration: none;
    transition:
      background-color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast),
      transform var(--zbk-transition-duration-fast);
  }
  .section-card:hover {
    border-color: var(--zbk-accent-primary-600);
    background: var(--zbk-app-canvas-muted);
  }
  .section-card:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }
  .section-card-body {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding: var(--zbk-spacing-105);
  }
  .section-card-title {
    margin: 0;
  }
  .section-card-go {
    margin-block-start: var(--zbk-spacing-025);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }

  /* Decorative thumbnails — pure token-driven CSS, so they re-skin with the preset
     (brand accent ramp, corner radius, display type) instead of freezing like images. */
  .thumb {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 16 / 9;
    padding: var(--zbk-spacing-105);
    background: var(--zbk-accent-primary-100);
    color: var(--zbk-accent-primary-700);
    border-block-end: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    overflow: clip;
    pointer-events: none;
  }

  /* Layout — a sidebar column beside stacked content rows. */
  .m-layout {
    display: flex;
    gap: var(--zbk-spacing-05);
    inline-size: 72%;
    block-size: 62%;
  }
  .m-col {
    inline-size: 26%;
    background: currentColor;
    border-radius: var(--zbk-border-radius-xs);
  }
  .m-stack {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }
  .m-stack i {
    flex: 1;
    background: currentColor;
    opacity: 0.5;
    border-radius: var(--zbk-border-radius-xs);
  }

  /* Typography — a display-type specimen in the preset's heading family. */
  .m-type {
    font-size: 2.75rem;
    font-weight: 700;
    line-height: 1;
  }

  /* Color — a slice of the brand accent ramp. */
  .m-swatches {
    display: flex;
    gap: var(--zbk-spacing-025);
  }
  .m-swatches i {
    inline-size: 1.1rem;
    block-size: 2.4rem;
    border-radius: var(--zbk-border-radius-xs);
  }

  /* Icons — primitive shapes; the square picks up the preset's corner radius. */
  .m-icons {
    display: flex;
    align-items: center;
    gap: var(--zbk-spacing-105);
  }
  .m-circle,
  .m-square {
    inline-size: 1.6rem;
    block-size: 1.6rem;
    border: var(--zbk-border-width-md) solid currentColor;
  }
  .m-circle {
    border-radius: 50%;
  }
  .m-square {
    border-radius: var(--zbk-border-radius-sm);
  }
  .m-tri {
    inline-size: 0;
    block-size: 0;
    border-inline: 0.9rem solid transparent;
    border-block-end: 1.6rem solid currentColor;
  }

  /* Components — a filled button (brand action color + radius) over a field. */
  .m-components {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--zbk-spacing-075, var(--zbk-spacing-05));
    inline-size: 74%;
  }
  .m-btn {
    padding-inline: var(--zbk-spacing-105);
    padding-block: var(--zbk-spacing-05);
    background: var(--zbk-action-canvas);
    color: var(--zbk-action-ink-inverse);
    border-radius: var(--zbk-border-radius-sm);
    font-size: var(--zbk-font-size-2xs, 0.75rem);
    white-space: nowrap;
  }
  .m-field {
    inline-size: 100%;
    block-size: 1.4rem;
    background: var(--zbk-app-canvas);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
  }

  /* Spacing — bars on the size scale. */
  .m-spacing {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    inline-size: 76%;
  }
  .m-spacing i {
    block-size: 0.55rem;
    background: currentColor;
    border-radius: var(--zbk-border-radius-xs);
  }

  /* Accent band — inverts the surface using the action (primary) color pair, the
     one combination guaranteed to stay contrast-safe across every preset. */
  .accent-band {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    padding-inline: var(--zbk-spacing-2);
    padding-block: var(--zbk-spacing-3);
    background: var(--zbk-action-canvas);
    color: var(--zbk-action-ink-inverse);
  }
  .accent-eyebrow {
    margin: 0;
    color: var(--zbk-action-ink-inverse-muted);
    letter-spacing: var(--zbk-letter-spacing-wider);
  }
  .accent-headline {
    margin: 0;
    max-inline-size: var(--zbk-text-measure-2);
  }
  .accent-lede {
    margin: 0;
    max-inline-size: var(--zbk-text-measure-2);
    color: var(--zbk-action-ink-inverse-soft);
  }
  .accent-cta {
    align-self: start;
    margin-block-start: var(--zbk-spacing-05);
    padding-inline: var(--zbk-spacing-105);
    padding-block: var(--zbk-spacing-075, var(--zbk-spacing-05));
    color: var(--zbk-action-ink-inverse);
    border: var(--zbk-border-width-sm) solid var(--zbk-action-ink-inverse);
    border-radius: var(--zbk-border-radius-sm);
    text-decoration: none;
  }
  .accent-cta:hover {
    background: var(--zbk-action-ink-inverse);
    color: var(--zbk-action-canvas);
  }
  .accent-cta:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-action-ink-inverse);
    outline-offset: var(--zbk-focus-offset);
  }

  /* Next steps */
  .next-steps {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-105);
    padding-inline: var(--zbk-spacing-2);
    padding-block: var(--zbk-spacing-3);
  }
  .next-steps-heading {
    margin: 0;
  }
  .next-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-1);
  }
  .next-link {
    padding-inline: var(--zbk-spacing-105);
    padding-block: var(--zbk-spacing-075, var(--zbk-spacing-05));
    color: var(--zbk-action-ink-inverse);
    background: var(--zbk-action-canvas);
    border: var(--zbk-border-width-sm) solid var(--zbk-action-canvas);
    border-radius: var(--zbk-border-radius-sm);
    text-decoration: none;
    transition:
      background-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast);
  }
  .next-link:hover {
    background: var(--zbk-action-canvas-strong);
    border-color: var(--zbk-action-canvas-strong);
  }
  .next-link:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  /* ── Diff strip (stage chrome) ─────────────────────────────────────────── */
  .diff-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--zbk-spacing-1) var(--zbk-spacing-3);
    padding: var(--zbk-spacing-105) var(--zbk-spacing-2);
    background: var(--zbk-app-canvas-soft);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
  }
  .diff-lead {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
    flex: 0 0 auto;
  }
  .diff-title {
    margin: 0;
    color: var(--zbk-app-ink);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }
  .diff-sub {
    margin: 0;
    color: var(--zbk-app-ink-muted);
  }
  .diff-list {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-1) var(--zbk-spacing-2);
    flex: 1 1 auto;
  }
  .diff-row {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
    min-inline-size: 7rem;
  }
  .diff-row dt {
    color: var(--zbk-app-ink-muted);
  }
  .diff-row dd {
    margin: 0;
    color: var(--zbk-accent-primary-700);
  }

  .reskin-caption {
    margin: 0;
    color: var(--zbk-app-ink-soft);
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    .chip,
    .reskin,
    .reskin *,
    .section-card {
      transition: none;
    }
  }
</style>
