<script lang="ts">
  import EditorialLayout from "$lib/layouts/EditorialLayout.svelte";
  import HeroReskin from "$lib/components/HeroReskin.svelte";
</script>

<div class="home text-wrap-pretty">
  <EditorialLayout
    title="Change everything. Rewrite nothing."
    description="Zebkit is a token-driven, accessibility-first design system. Traditional design systems make you trade consistency for their look-and-feel. Zebkit keeps the consistency and hands the design opinions back to you."
  >
    <p class="eyebrow">A token-driven, accessibility-first design system</p>
    <h1 class="display">Change everything.<br />Rewrite nothing.</h1>
    <p class="lede">
      Traditional design systems make you pay for their consistency by enforcing
      their look-and-feel. Zebkit keeps the consistency and hands the opinion
      back to you.
    </p>
    <p class="sub">
      Every visual decision in zebkit is a token, and every token is data you
      can swap. Change the tokens and the whole product takes on <strong><em>your look</em></strong>: same HTML, same behavior, <strong><em>new everything</em></strong>.
    </p>
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
    <div class="margin-block-start-2">
      <a class="font-code text-sm" href="#reskin-playground"
      ><span>Take it for a spin</span><i
        class="ri-corner-right-down-line text-md"
      ></i></a>
    </div>
  </EditorialLayout>

  <!-- Centerpiece: the same HTML, re-skinned by tokens alone. -->
  <HeroReskin />
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
  }

  .eyebrow {
    margin: 0 0 var(--zbk-spacing-05);
    font-family: var(--zbk-font-family-code);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-tight);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-accent-primary-700);
  }

  .lede {
    color: var(--zbk-app-ink-muted);
    font-size: var(--zbk-font-size-md);
    max-width: 50ch;
  }

  .sub {
    max-width: 60ch;
  }

  .watermark {
    width: var(--zbk-spacing-tablet-lg);
    max-width: 90vw;
    position: fixed;
    opacity: 0.375;
    z-index: -1;
    touch-action: none;
    pointer-events: none;
    bottom: 0;
    right: 0;
    color: var(--zbk-neutral-100);
  }

  a {
    text-decoration: none;
    color: var(--zbk-action-ink);
    margin-top: auto;
    display: flex;
    align-items: flex-end;
    gap: var(--zbk-spacing-025);
    > span {
      text-decoration: underline dotted var(--zbk-action-ink-muted) 3px;
      text-underline-offset: var(--zbk-spacing-05);
    }

    > i {
      line-height: 1;
    }
  }
</style>
