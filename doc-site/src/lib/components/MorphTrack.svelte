<div class="morph-track margin-block-start-1" aria-hidden="true">
  <svg
    viewBox="0 0 760 150"
    preserveAspectRatio="xMidYMid slice"
    focusable="false"
  >
    <path
      class="track"
      d="M -72 76 C 16 18 82 132 164 72 S 304 32 386 82 S 526 128 608 68 S 724 28 832 76"
    />

    <g class="rider rider--toggle">
      <g class="specimen specimen--toggle">
        <rect class="surface" x="-30" y="-16" width="60" height="32" />
        <circle class="ui-detail toggle-thumb" cx="-14" cy="0" r="10" />
      </g>
    </g>

    <g class="rider rider--card">
      <g class="specimen specimen--card">
        <rect class="surface" x="-28" y="-21" width="56" height="42" />
        <path class="ui-detail detail-line" d="M -16 -7 H 16 M -16 1 H 7 M -16 9 H 13" />
      </g>
    </g>

    <g class="rider rider--button">
      <g class="specimen specimen--button">
        <rect class="surface" x="-32" y="-15" width="64" height="30" />
        <path class="ui-detail detail-line" d="M -11 0 H 11" />
      </g>
    </g>

    <g class="rider rider--checkbox">
      <g class="specimen specimen--checkbox">
        <rect class="surface" x="-17" y="-17" width="34" height="34" />
        <path class="ui-detail checkmark" d="M -9 0 L -2 8 L 10 -9" />
      </g>
    </g>

    <g class="rider rider--grid">
      <g class="specimen specimen--grid">
        <rect class="surface" x="-18" y="-18" width="15" height="15" />
        <rect class="surface" x="3" y="-18" width="15" height="15" />
        <rect class="surface" x="-18" y="3" width="15" height="15" />
        <rect class="surface" x="3" y="3" width="15" height="15" />
      </g>
    </g>

    <g class="rider rider--diamond">
      <g class="specimen specimen--diamond">
        <rect class="surface" x="-17" y="-17" width="34" height="34" />
      </g>
    </g>

    <g class="rider rider--orb">
      <g class="specimen specimen--orb">
        <circle class="surface" cx="0" cy="0" r="22" />
        <circle class="ui-detail orb-core" cx="0" cy="0" r="7" />
      </g>
    </g>
  </svg>
</div>

<style>
	.morph-track {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		inline-size: 100%;
		min-block-size: 0;
		overflow: hidden;
		color: var(--zbk-app-canvas-subtle);
	}

	svg {
		display: block;
		flex: 1 1 0;
		inline-size: 100%;
		block-size: 100%;
    min-block-size: 0;
    overflow: hidden;
  }

  .track {
    fill: none;
    stroke: currentColor;
    stroke-width: var(--zbk-border-width-lg);
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .rider {
    --travel-duration: calc(150 * var(--zbk-transition-playful-motion-duration-slow));

    offset-path: path("M -72 76 C 16 18 82 132 164 72 S 304 32 386 82 S 526 128 608 68 S 724 28 832 76");
    offset-distance: var(--rest-position);
    offset-rotate: 0deg;
    animation: travel var(--travel-duration) linear var(--travel-delay) infinite;
  }

  .rider--toggle {
    --rest-position: 9%;
    --travel-delay: 0s;
    --morph-duration: calc(40 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-7 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--card {
    --rest-position: 23%;
    --travel-delay: calc(-21 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(44 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-15 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--button {
    --rest-position: 38%;
    --travel-delay: calc(-42 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(34 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-11 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--checkbox {
    --rest-position: 52%;
    --travel-delay: calc(-63 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(44 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-6 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--grid {
    --rest-position: 67%;
    --travel-delay: calc(-84 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(52 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-20 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--diamond {
    --rest-position: 81%;
    --travel-delay: calc(-102 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(38 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-13 * var(--zbk-transition-playful-motion-duration-default));
  }

  .rider--orb {
    --rest-position: 94%;
    --travel-delay: calc(-128 * var(--zbk-transition-playful-motion-duration-slow));
    --morph-duration: calc(56 * var(--zbk-transition-playful-motion-duration-default));
    --morph-delay: calc(-4 * var(--zbk-transition-playful-motion-duration-default));
  }

  .specimen {
    transform-box: fill-box;
    transform-origin: center;
    animation:
      morph var(--morph-duration) var(--zbk-transition-playful-motion-function-slow)
        var(--morph-delay) infinite,
      color-shift calc(2 * var(--morph-duration)) linear var(--morph-delay) infinite;
  }

  .specimen--card {
    animation-name: morph-wide, color-shift;
  }

  .specimen--grid {
    animation-name: morph-grid, color-shift;
  }

  .specimen--diamond {
    animation-name: morph-diamond, color-shift;
  }

  .specimen--orb {
    animation-name: morph-orb, color-shift;
  }

  .surface {
    fill: var(--zbk-accent-primary-canvas);
    rx: var(--zbk-border-radius-md);
    animation: radius-shift var(--morph-duration)
      var(--zbk-transition-playful-fx-function-slow) var(--morph-delay) infinite;
  }

  circle.surface {
    animation: none;
  }

  .ui-detail {
    opacity: 0;
    animation: reveal-ui var(--morph-duration)
      var(--zbk-transition-playful-fx-function-default) var(--morph-delay) infinite;
  }

  .toggle-thumb,
  .orb-core {
    fill: var(--zbk-app-canvas);
  }

  .detail-line,
  .checkmark {
    fill: none;
    stroke: var(--zbk-app-canvas);
    stroke-width: var(--zbk-border-width-lg);
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .toggle-thumb {
    animation:
      reveal-ui var(--morph-duration) var(--zbk-transition-playful-fx-function-default)
        var(--morph-delay) infinite,
      toggle var(--morph-duration) var(--zbk-transition-playful-motion-function-slow)
        var(--morph-delay) infinite;
  }

  @keyframes travel {
    from {
      offset-distance: 0%;
    }

    to {
      offset-distance: 100%;
    }
  }

  @keyframes morph {
    0%,
    100% {
      transform: rotate(-14deg) scale(0.9, 1.08);
    }
    24% {
      transform: rotate(0deg) scale(1.18, 0.92);
    }
    52% {
      transform: rotate(6deg) scale(0.98, 1.2);
    }
    76% {
      transform: rotate(0deg) scale(1.22, 0.96);
    }
  }

  @keyframes morph-wide {
    0%,
    100% {
      transform: rotate(9deg) scale(0.86, 0.98);
    }
    30% {
      transform: rotate(0deg) scale(1.16, 0.88);
    }
    58% {
      transform: rotate(-4deg) scale(0.94, 1.18);
    }
    82% {
      transform: rotate(0deg) scale(1.22, 0.98);
    }
  }

  @keyframes morph-diamond {
    0%,
    100% {
      transform: rotate(45deg) scale(0.92);
    }
    35% {
      transform: rotate(0deg) scale(1.24, 0.84);
    }
    65% {
      transform: rotate(90deg) scale(0.98);
    }
    84% {
      transform: rotate(0deg) scale(1.12);
    }
  }

  @keyframes morph-grid {
    0%,
    100% {
      transform: rotate(-8deg) scale(0.9);
    }
    30% {
      transform: rotate(0deg) scale(1.15, 0.92);
    }
    58% {
      transform: rotate(8deg) scale(0.96, 1.18);
    }
    82% {
      transform: rotate(0deg) scale(1.1);
    }
  }

  @keyframes morph-orb {
    0%,
    100% {
      transform: scale(0.88);
    }
    32% {
      transform: scale(1.18, 0.9);
    }
    63% {
      transform: scale(0.94, 1.2);
    }
    84% {
      transform: scale(1.12);
    }
  }

  @keyframes color-shift {
    0%,
    100% {
      color: var(--zbk-accent-primary-canvas);
    }
    28% {
      color: var(--zbk-action-canvas);
    }
    54% {
      color: var(--zbk-accent-secondary-canvas);
    }
    78% {
      color: var(--zbk-accent-primary-700);
    }
  }

  .specimen .surface {
    fill: currentColor;
  }

  @keyframes radius-shift {
    0%,
    100% {
      rx: var(--zbk-border-radius-xs);
    }
    28%,
    62% {
      rx: var(--zbk-border-radius-md);
    }
    82% {
      rx: var(--zbk-border-radius-sm);
    }
  }

  @keyframes reveal-ui {
    0%,
    16%,
    82%,
    100% {
      opacity: 0;
    }
    32%,
    68% {
      opacity: 1;
    }
  }

  @keyframes toggle {
    0%,
    24%,
    100% {
      transform: translateX(0);
    }
    48%,
    72% {
      transform: translateX(28px);
    }
  }

  :global(html[data-zbk-reduced-motion]) .rider,
  :global(html[data-zbk-reduced-motion]) .specimen,
  :global(html[data-zbk-reduced-motion]) .surface,
  :global(html[data-zbk-reduced-motion]) .ui-detail {
    animation: none;
  }

  :global(html[data-zbk-reduced-motion]) .ui-detail {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .rider,
    .specimen,
    .surface,
    .ui-detail {
      animation: none;
    }

    .ui-detail {
      opacity: 1;
    }
  }
</style>
