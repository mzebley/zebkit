<section class="display-flex flex-direction-column gap-105">
  <div class="display-grid gap-1" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <article class="border-solid border-width-xs border-app-muted radius-md padding-1 display-flex flex-direction-column gap-05 canvas-app-subtle">
      <header class="display-flex flex-direction-column gap-025">
        <h3 class="text-md text-semibold ink-app-emphasis">Style variants</h3>
        <p class="text-sm ink-app-muted">
          Structural recipes on the <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">style</code>
          axis — each is a token remap, not a second component.
        </p>
      </header>
      <div class="display-flex flex-wrap gap-05 align-items-center">
        <zbk-button>Default</zbk-button>
        <zbk-button variant="ghost">Ghost</zbk-button>
        <zbk-button variant="outline">Outline</zbk-button>
        <zbk-button variant="subtle">Subtle</zbk-button>
      </div>
    </article>

    <article class="border-solid border-width-xs border-app-muted radius-md padding-1 display-flex flex-direction-column gap-05 canvas-app-subtle">
      <header class="display-flex flex-direction-column gap-025">
        <h3 class="text-md text-semibold ink-app-emphasis">Size variants</h3>
        <p class="text-sm ink-app-muted">
          The <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">size</code> axis composes with any
          style variant. <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">sm</code> keeps the 44px
          tap-target floor.
        </p>
      </header>
      <div class="display-flex flex-wrap gap-05 align-items-center">
        <zbk-button variant="sm">Small</zbk-button>
        <zbk-button>Default</zbk-button>
        <zbk-button variant="lg">Large</zbk-button>
        <zbk-button variant="outline lg">Outline + large</zbk-button>
      </div>
    </article>

    <article class="border-solid border-width-xs border-app-muted radius-md padding-1 display-flex flex-direction-column gap-05 canvas-app-subtle">
      <header class="display-flex flex-direction-column gap-025">
        <h3 class="text-md text-semibold ink-app-emphasis">States</h3>
        <p class="text-sm ink-app-muted">
          <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">loading</code> announces via
          <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">aria-busy</code>, suppresses activation,
          and keeps focus; <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">disabled</code> is fully
          native.
        </p>
      </header>
      <div class="display-flex flex-wrap gap-05 align-items-center">
        <zbk-button loading>Saving…</zbk-button>
        <zbk-button disabled>Disabled</zbk-button>
        <zbk-button variant="outline" disabled>Disabled outline</zbk-button>
      </div>
    </article>

    <article class="border-solid border-width-xs border-app-muted radius-md padding-1 display-flex flex-direction-column gap-05 canvas-app-subtle">
      <header class="display-flex flex-direction-column gap-025">
        <h3 class="text-md text-semibold ink-app-emphasis">Icon slot</h3>
        <p class="text-sm ink-app-muted">
          <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">slot="icon"</code> renders aria-hidden
          beside the label. Use
          <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">data-position="start|end"</code>
          for explicit placement; icon-only buttons need
          <code class="canvas-app-muted padding-inline-025 padding-block-2px radius-sm">aria-label</code>.
        </p>
      </header>
      <div class="display-flex flex-wrap gap-05 align-items-center">
        <zbk-button variant="outline">
          <svg slot="icon" data-position="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add item
        </zbk-button>
        <zbk-button variant="ghost" aria-label="Close">
          <svg slot="icon" data-position="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </zbk-button>
      </div>
    </article>
  </div>
</section>
