<section class="flex flex-col gap-6">
  <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Style variants</h3>
        <p class="text-sm ink-app-muted">
          Structural recipes on the <code class="canvas-app-muted px-1 py-0.5 rounded">style</code>
          axis — each is a token remap, not a second component.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button>Default</zbk-button>
        <zbk-button variant="ghost">Ghost</zbk-button>
        <zbk-button variant="outline">Outline</zbk-button>
        <zbk-button variant="subtle">Subtle</zbk-button>
      </div>
    </article>

    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Size variants</h3>
        <p class="text-sm ink-app-muted">
          The <code class="canvas-app-muted px-1 py-0.5 rounded">size</code> axis composes with any
          style variant. <code class="canvas-app-muted px-1 py-0.5 rounded">sm</code> keeps the 44px
          tap-target floor.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button variant="sm">Small</zbk-button>
        <zbk-button>Default</zbk-button>
        <zbk-button variant="lg">Large</zbk-button>
        <zbk-button variant="outline lg">Outline + large</zbk-button>
      </div>
    </article>

    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">States</h3>
        <p class="text-sm ink-app-muted">
          <code class="canvas-app-muted px-1 py-0.5 rounded">loading</code> announces via
          <code class="canvas-app-muted px-1 py-0.5 rounded">aria-busy</code>, suppresses activation,
          and keeps focus; <code class="canvas-app-muted px-1 py-0.5 rounded">disabled</code> is fully
          native.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button loading>Saving…</zbk-button>
        <zbk-button disabled>Disabled</zbk-button>
        <zbk-button variant="outline" disabled>Disabled outline</zbk-button>
      </div>
    </article>

    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Icon slot</h3>
        <p class="text-sm ink-app-muted">
          <code class="canvas-app-muted px-1 py-0.5 rounded">slot="icon"</code> renders aria-hidden
          beside the label; icon-only buttons need
          <code class="canvas-app-muted px-1 py-0.5 rounded">aria-label</code>.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button variant="outline">
          <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add item
        </zbk-button>
        <zbk-button variant="ghost" aria-label="Close">
          <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </zbk-button>
      </div>
    </article>
  </div>
</section>
