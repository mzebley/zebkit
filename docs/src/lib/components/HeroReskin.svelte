<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte';
  import { heroThemes, diffFor, type HeroThemeName } from '$data/hero-themes';
  import ZebkitLoader from '$components/ZebkitLoader.svelte';

  // Hero-local reskin state lives on the shared store (scaffolded there), but only
  // this component reads it — switching never touches the rest of the page.
  let active = $derived(theme.reskinTheme as HeroThemeName);
  let diff = $derived(diffFor(active));

  function select(name: HeroThemeName) {
    theme.reskinTheme = name;
  }

  // Sample data for the mini-app table — static, identical across presets so the
  // only thing that ever changes is the tokens.
  const rows = [
    { id: 'ZBK-418', owner: 'Avery', status: 'Shipped', load: 92 },
    { id: 'ZBK-377', owner: 'Mateo', status: 'Review', load: 61 },
    { id: 'ZBK-209', owner: 'Priya', status: 'Blocked', load: 34 }
  ];
  const bars = [38, 64, 52, 81, 47, 73, 90];
</script>

<svelte:head>
  {#each heroThemes as t (t.name)}
    <link rel="stylesheet" href={`/zebkit/themes/${t.name}.css`} />
  {/each}
</svelte:head>

<ZebkitLoader />

<section class="reskin-stage" aria-label="Reskin demo — change the tokens, keep the HTML">
  <!-- Preset switcher -->
  <div class="switcher" role="group" aria-label="Theme preset">
    {#each heroThemes as t (t.name)}
      <button
        type="button"
        class="chip font-code text-uppercase text-sm"
        class:is-active={active === t.name}
        aria-pressed={active === t.name}
        onclick={() => select(t.name)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <div class="stage-grid">
    <!-- The themed subtree: one HTML tree, re-skinned purely by the data attribute -->
    <div class="reskin" data-zbk-theme={active}>
      <!-- App chrome -->
      <header class="app-nav">
        <span class="font-code text-bold text-uppercase wordmark">zebkit/os</span>
        <nav class="app-nav-links font-interface text-sm">
          <span class="nav-link is-current">Overview</span>
          <span class="nav-link">Activity</span>
          <span class="nav-link">Settings</span>
        </nav>
        <zbk-button size="sm">New</zbk-button>
      </header>

      <!-- Type specimen + lede -->
      <div class="specimen padding-inline-2 padding-block-2">
        <p class="font-code text-uppercase text-2xs eyebrow ink-accent-primary-600">{active} preset</p>
        <h2 class="font-heading display ink-app">Same&nbsp;HTML.<br />New&nbsp;skin.</h2>
        <p class="font-body text-lg ink-app-muted lede">
          Every surface below is one fixed markup tree. Switch the preset and only the
          design tokens change — colors, type, radius — never the structure.
        </p>
        <div class="cta-row">
          <zbk-button size="md">Get started</zbk-button>
          <zbk-button size="md" variant="outline">Read the docs</zbk-button>
        </div>
      </div>

      <!-- Cards + form -->
      <div class="panel-grid">
        <article class="card">
          <div class="card-head">
            <h3 class="font-heading text-xl ink-app">Throughput</h3>
            <span class="badge badge-accent font-code text-2xs text-uppercase">live</span>
          </div>
          <p class="font-body text-sm ink-app-muted">Requests handled this cycle, by region.</p>
          <div class="chart" aria-hidden="true">
            {#each bars as h, i (i)}
              <div class="bar canvas-accent-primary-500" style={`height:${h}%`}></div>
            {/each}
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <h3 class="font-heading text-xl ink-app">Status</h3>
            <span class="badge badge-secondary font-code text-2xs text-uppercase">3 open</span>
          </div>
          <ul class="stat-list font-body text-sm ink-app">
            <li><span>Uptime</span><strong class="ink-accent-primary-700">99.98%</strong></li>
            <li><span>p95 latency</span><strong class="ink-accent-primary-700">112ms</strong></li>
            <li><span>Error rate</span><strong class="ink-accent-primary-700">0.04%</strong></li>
          </ul>
        </article>

        <form class="card form" onsubmit={(e) => e.preventDefault()}>
          <h3 class="font-heading text-xl ink-app">Invite a teammate</h3>
          <label class="field font-body text-sm ink-app-muted">
            Email
            <input class="control font-interface" type="email" placeholder="name@team.dev" />
          </label>
          <label class="field font-body text-sm ink-app-muted">
            Role
            <select class="control font-interface">
              <option>Viewer</option>
              <option>Editor</option>
              <option>Admin</option>
            </select>
          </label>
          <zbk-button size="md">Send invite</zbk-button>
        </form>
      </div>

      <!-- Data table -->
      <div class="card table-card">
        <table class="data-table font-body text-sm ink-app">
          <thead class="font-code text-2xs text-uppercase ink-app-muted">
            <tr><th>Build</th><th>Owner</th><th>Status</th><th>Load</th></tr>
          </thead>
          <tbody>
            {#each rows as r (r.id)}
              <tr>
                <td class="font-code">{r.id}</td>
                <td>{r.owner}</td>
                <td><span class="badge badge-outline font-code text-2xs text-uppercase">{r.status}</span></td>
                <td>
                  <div class="meter" aria-hidden="true">
                    <div class="meter-fill canvas-accent-primary-600" style={`inline-size:${r.load}%`}></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Token-diff panel -->
    <aside class="diff-panel" aria-live="polite">
      <h3 class="font-code text-uppercase text-sm diff-title">Tokens changed</h3>
      <p class="font-body text-2xs diff-sub">
        vs. the zebkit base — <strong>{diff.totalChanged}</strong> values
      </p>
      <dl class="diff-list font-body text-sm">
        {#each diff.rows as row (row.label)}
          <div class="diff-row">
            <dt>{row.label}</dt>
            <dd class="font-code">{row.value}</dd>
          </div>
        {/each}
      </dl>
    </aside>
  </div>

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
  }

  .switcher {
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05);
  }
  .chip {
    padding-block: var(--zbk-spacing-05);
    padding-inline: var(--zbk-spacing-105);
    background: transparent;
    color: var(--zbk-app-ink-muted);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
    cursor: pointer;
    letter-spacing: var(--zbk-letter-spacing-wide);
    transition:
      background-color var(--zbk-transition-duration-fast),
      color var(--zbk-transition-duration-fast),
      border-color var(--zbk-transition-duration-fast);
  }
  .chip:hover {
    color: var(--zbk-app-ink);
    border-color: var(--zbk-app-ink-muted);
  }
  .chip.is-active {
    background: var(--zbk-accent-primary-600);
    color: var(--zbk-accent-primary-50);
    border-color: var(--zbk-accent-primary-600);
  }
  .chip:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
  }

  .stage-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--zbk-spacing-2);
  }
  @media (min-width: 60rem) {
    .stage-grid {
      grid-template-columns: minmax(0, 1fr) 16rem;
      align-items: start;
    }
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

  .app-nav {
    display: flex;
    align-items: center;
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
  .app-nav-links {
    display: flex;
    gap: var(--zbk-spacing-105);
    margin-inline-start: auto;
  }
  .nav-link {
    color: var(--zbk-app-ink-muted);
  }
  .nav-link.is-current {
    color: var(--zbk-app-ink);
  }

  .specimen {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
  }
  .eyebrow {
    letter-spacing: var(--zbk-letter-spacing-wider);
    margin: 0;
  }
  .display {
    margin: 0;
    font-size: clamp(2.25rem, 1.2rem + 4vw, 4rem);
    line-height: var(--zbk-line-height-1);
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

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--zbk-spacing-1);
    padding: var(--zbk-spacing-2);
    padding-block-start: 0;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas-soft);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--zbk-spacing-1);
  }
  .card-head h3 {
    margin: 0;
  }

  .chart {
    display: flex;
    align-items: flex-end;
    gap: var(--zbk-spacing-05);
    block-size: 5rem;
  }
  .bar {
    flex: 1;
    border-radius: var(--zbk-border-radius-xs);
    min-block-size: 2px;
  }

  .stat-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }
  .stat-list li {
    display: flex;
    justify-content: space-between;
    padding-block: var(--zbk-spacing-025);
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-soft);
  }

  .form {
    gap: var(--zbk-spacing-105);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-025);
  }
  .control {
    padding-inline: var(--zbk-spacing-1);
    padding-block: var(--zbk-spacing-05);
    background: var(--zbk-app-canvas);
    color: var(--zbk-app-ink);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-sm);
  }
  .control:focus-visible {
    outline: var(--zbk-focus-width) solid var(--zbk-focus-color);
    outline-offset: var(--zbk-focus-offset);
    border-color: var(--zbk-accent-primary-600);
  }

  .table-card {
    margin-inline: var(--zbk-spacing-2);
    margin-block-end: var(--zbk-spacing-2);
    padding: 0;
    overflow: clip;
  }
  .data-table {
    inline-size: 100%;
    border-collapse: collapse;
  }
  .data-table th,
  .data-table td {
    text-align: start;
    padding-inline: var(--zbk-spacing-105);
    padding-block: var(--zbk-spacing-075, var(--zbk-spacing-05));
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-soft);
  }
  .data-table thead th {
    background: var(--zbk-app-canvas-muted);
    letter-spacing: var(--zbk-letter-spacing-wide);
  }
  .meter {
    inline-size: 6rem;
    block-size: 0.5rem;
    background: var(--zbk-app-canvas-muted);
    border-radius: var(--zbk-border-radius-xs);
    overflow: clip;
  }
  .meter-fill {
    block-size: 100%;
  }

  .badge {
    align-self: center;
    padding-inline: var(--zbk-spacing-05);
    padding-block: var(--zbk-spacing-025);
    border-radius: var(--zbk-border-radius-xs);
    letter-spacing: var(--zbk-letter-spacing-wide);
    white-space: nowrap;
  }
  .badge-accent {
    background: var(--zbk-accent-primary-100);
    color: var(--zbk-accent-primary-800);
  }
  .badge-secondary {
    background: var(--zbk-accent-secondary-100);
    color: var(--zbk-accent-secondary-800);
  }
  .badge-outline {
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border-strong);
    color: var(--zbk-app-ink-muted);
  }

  /* ── Diff panel (stage chrome) ─────────────────────────────────────────── */
  .diff-panel {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
    padding: var(--zbk-spacing-105);
    background: var(--zbk-app-canvas-soft);
    border: var(--zbk-border-width-sm) solid var(--zbk-app-border);
    border-radius: var(--zbk-border-radius-md);
    position: sticky;
    top: var(--zbk-spacing-2);
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
    flex-direction: column;
  }
  .diff-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--zbk-spacing-1);
    padding-block: var(--zbk-spacing-05);
    border-block-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-soft);
  }
  .diff-row dt {
    color: var(--zbk-app-ink-muted);
  }
  .diff-row dd {
    margin: 0;
    color: var(--zbk-accent-primary-700);
    text-align: end;
  }

  .reskin-caption {
    margin: 0;
    color: var(--zbk-app-ink-soft);
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    .chip,
    .reskin,
    .reskin * {
      transition: none;
    }
  }
</style>
