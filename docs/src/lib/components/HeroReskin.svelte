<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte';
  import { heroThemes, diffFor, type HeroThemeName } from '$data/hero-themes';
  import ZebkitLoader from '$components/ZebkitLoader.svelte';

  // Hero-local reskin state lives on the shared store (scaffolded there), but only
  // this component reads it — switching never touches the rest of the page.
  let active = $derived(theme.reskinTheme as HeroThemeName);
  let activeTheme = $derived(heroThemes.find((t) => t.name === active) ?? heroThemes[0]);
  let diff = $derived(diffFor(active));

  function select(name: HeroThemeName) {
    theme.reskinTheme = name;
  }

  // Wayfinding cards — mock the section index of a design-system docs home.
  // Static and identical across presets so the only thing that changes is tokens.
  const sections = [
    { label: 'Layout', href: '/foundations/layers', blurb: 'Grid, stack, and spacing primitives.', kind: 'layout' },
    { label: 'Typography', href: '/typography', blurb: 'Type scale, families, and measure.', kind: 'type' },
    { label: 'Color', href: '/foundations/color', blurb: 'Semantic palettes and contrast pairs.', kind: 'color' },
    { label: 'Icons', href: '/foundations/icons', blurb: 'The icon set and sizing tokens.', kind: 'icons' },
    { label: 'Components', href: '/components', blurb: 'Accessible, token-driven elements.', kind: 'components' },
    { label: 'Spacing', href: '/spacing', blurb: 'The size-based spacing scale.', kind: 'spacing' }
  ];

  // "Next steps" — real wayfinding into the zebkit docs (some routes are aspirational).
  const nextSteps = [
    { label: 'Get started', href: '/foundations/why-tokens' },
    { label: 'Design tokens', href: '/foundations/tokens' },
    { label: 'Browse components', href: '/components/button' },
    { label: 'Accessibility', href: '/foundations/a11y' }
  ];
</script>

<svelte:head>
  {#each heroThemes as t (t.name)}
    <link rel="stylesheet" href={`/zebkit/themes/${t.name}.css`} />
  {/each}
</svelte:head>

<ZebkitLoader />

<section class="reskin-stage" aria-label="Reskin demo — change the tokens, keep the HTML" id="reskin-playground">
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
  <div class="reskin" data-zbk-theme={active}>
    <!-- Site header -->
    <header class="site-nav">
      <span class="font-code text-bold text-uppercase wordmark">zebkit/ds</span>
      <nav class="site-nav-links font-interface text-sm" aria-label="Primary">
        <span class="nav-link is-current">Docs</span>
        <span class="nav-link">Components</span>
        <span class="nav-link">Foundations</span>
        <span class="nav-link">GitHub</span>
      </nav>
      <a
        class="influence-link font-interface text-sm text-bold"
        href={activeTheme.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Influenced by ${activeTheme.source} — opens the ${activeTheme.source} design system in a new tab`}
      >
        Influenced by {activeTheme.source}<span class="influence-arrow" aria-hidden="true">↗</span>
      </a>
    </header>

    <!-- Intro / lede -->
    <div class="intro">
      <p class="font-code text-uppercase text-2xs eyebrow ink-accent-primary-600">{active} preset</p>
      <h2 class="font-heading display ink-app">A design system,<br />in your tokens.</h2>
      <p class="font-body text-lg ink-app-muted lede">
        Everything below is one fixed markup tree — the same landing page a real design
        system would ship. Switch the preset and only the design tokens change: colors,
        type, radius. Never the structure.
      </p>
      <div class="cta-row">
        <zbk-button size="md">Get started</zbk-button>
        <zbk-button size="md" variant="outline">Read the docs</zbk-button>
      </div>
    </div>

    <!-- Section index cards -->
    <section class="sections" aria-label="Explore the system">
      <h3 class="font-code text-uppercase text-sm section-heading ink-app-muted">Explore the system</h3>
      <div class="section-grid">
        {#each sections as s (s.label)}
          <a class="section-card" href={s.href}>
            <!-- Decorative, token-driven thumbnail. Not an image: it re-skins with the
                 preset (accent ramp, radius, type) and is hidden from assistive tech. -->
            <span class="thumb thumb-{s.kind}" aria-hidden="true">
              {#if s.kind === 'layout'}
                <span class="m-layout"><i class="m-col"></i><span class="m-stack"><i></i><i></i><i></i></span></span>
              {:else if s.kind === 'type'}
                <span class="m-type font-heading">Aa</span>
              {:else if s.kind === 'color'}
                <span class="m-swatches">
                  <i style="background:var(--zbk-accent-primary-200)"></i>
                  <i style="background:var(--zbk-accent-primary-400)"></i>
                  <i style="background:var(--zbk-accent-primary-500)"></i>
                  <i style="background:var(--zbk-accent-primary-600)"></i>
                  <i style="background:var(--zbk-accent-primary-800)"></i>
                </span>
              {:else if s.kind === 'icons'}
                <span class="m-icons"><i class="m-circle"></i><i class="m-square"></i><i class="m-tri"></i></span>
              {:else if s.kind === 'components'}
                <span class="m-components"><span class="m-btn">Button</span><i class="m-field"></i></span>
              {:else if s.kind === 'spacing'}
                <span class="m-spacing"><i style="inline-size:35%"></i><i style="inline-size:60%"></i><i style="inline-size:85%"></i></span>
              {/if}
            </span>
            <span class="section-card-body">
              <span class="section-card-title font-heading text-xl ink-app">{s.label}</span>
              <span class="section-card-blurb font-body text-sm ink-app-muted">{s.blurb}</span>
              <span class="section-card-go font-code text-2xs text-uppercase ink-accent-primary-700" aria-hidden="true">Explore →</span>
            </span>
          </a>
        {/each}
      </div>
    </section>

    <!-- Accent band — a deliberately inverted surface to show the action color in full -->
    <section class="accent-band">
      <p class="font-code text-uppercase text-2xs accent-eyebrow">Accessible by default</p>
      <h3 class="font-heading text-2xl accent-headline">Contrast, focus, and motion are baked into the tokens.</h3>
      <p class="font-body text-md accent-lede">
        This band paints from the action color instead of the page canvas — and its text
        pairs with it automatically, in every preset.
      </p>
      <a class="accent-cta font-interface text-bold" href="/foundations/a11y">See the a11y model →</a>
    </section>

    <!-- Next steps -->
    <section class="next-steps">
      <h3 class="font-heading text-xl ink-app next-steps-heading">Next steps</h3>
      <div class="next-grid">
        {#each nextSteps as step (step.label)}
          <a class="next-link font-interface text-bold" href={step.href}>{step.label}</a>
        {/each}
      </div>
    </section>
  </div>

  <!-- Token-diff strip — the proof that only tokens changed, not the HTML -->
  <aside class="diff-strip" aria-live="polite">
    <div class="diff-lead">
      <h3 class="font-code text-uppercase text-sm diff-title">Tokens changed</h3>
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
    gap: var(--zbk-spacing-2);
    padding-block-start: var(--zbk-spacing-4);
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
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-lg);
    overflow: clip;
    transition:
      background-color var(--zbk-transition-duration-default),
      color var(--zbk-transition-duration-default),
      border-color var(--zbk-transition-duration-default);
  }
  .reskin * {
    transition:
      background-color var(--zbk-transition-duration-default),
      color var(--zbk-transition-duration-default),
      border-color var(--zbk-transition-duration-default);
  }

  /* Site header */
  .site-nav {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-105);
    padding-inline: var(--zbk-spacing-2);
    padding-block: var(--zbk-spacing-1);
    background: var(--zbk-app-canvas-soft);
    border-block-end: var(--zbk-border-width-sm) solid var(--zbk-app-border);
  }
  .wordmark {
    color: var(--zbk-accent-primary-600);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }
  .site-nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-105);
    margin-inline-start: auto;
  }
  .nav-link {
    color: var(--zbk-app-ink-muted);
  }
  .nav-link.is-current {
    color: var(--zbk-app-ink);
  }
  .influence-link {
    display: inline-flex;
    align-items: center;
    gap: var(--zbk-spacing-05);
    padding-inline: var(--zbk-spacing-105);
    padding-block: var(--zbk-spacing-05);
    color: var(--zbk-action-ink-inverse);
    background: var(--zbk-action-canvas);
    border: var(--zbk-border-width-sm) solid var(--zbk-action-canvas);
    border-radius: var(--zbk-border-radius-sm);
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast);
  }
  .influence-link:hover {
    background: var(--zbk-action-canvas-strong);
    border-color: var(--zbk-action-canvas-strong);
  }
  .influence-link:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }
  .influence-arrow {
    font-size: 0.85em;
  }

  /* Intro */
  .intro {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    padding-inline: var(--zbk-spacing-2);
    padding-block: var(--zbk-spacing-3);
  }
  .eyebrow {
    letter-spacing: var(--zbk-letter-spacing-wider);
    margin: 0;
  }
  .display {
    margin: 0;
  }
  .lede {
    margin: 0;
    max-inline-size: var(--zbk-text-measure-2);
  }
  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-1);
    margin-block-start: var(--zbk-spacing-05);
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
    border-radius: var(--zbk-border-radius-md);
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
