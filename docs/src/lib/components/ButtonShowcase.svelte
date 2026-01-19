<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Reserved for future showcase enhancements.
  });
</script>

<section class="flex flex-col gap-6">
  <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Size presets</h3>
        <p class="text-sm ink-app-muted">
          Compare <code class="canvas-app-muted px-1 py-0.5 rounded">size="xs"</code> through
          <code class="canvas-app-muted px-1 py-0.5 rounded">xl</code>.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button size="xs">Extra small</zbk-button>
        <zbk-button size="sm">Small</zbk-button>
        <zbk-button size="md">Medium</zbk-button>
        <zbk-button size="lg">Large</zbk-button>
        <zbk-button size="xl">Extra large</zbk-button>
      </div>
    </article>

    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Variants</h3>
        <p class="text-sm ink-app-muted">
          Compare <code class="canvas-app-muted px-1 py-0.5 rounded">variant</code> prop values.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button variant="flat">Flat</zbk-button>
        <zbk-button variant="outline">Outline</zbk-button>
        <zbk-button variant="raised">Raised</zbk-button>
        <zbk-button variant="unstyled">Unstyled</zbk-button>
      </div>
    </article>

    <article class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
      <header class="flex flex-col gap-1">
        <h3 class="text-base font-semibold ink-app-strong">Disabled states</h3>
        <p class="text-sm ink-app-muted">
          Using <code class="canvas-app-muted px-1 py-0.5 rounded">disabled</code> attribute.
        </p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button disabled>Disabled button</zbk-button>
        <zbk-button variant="outline" disabled>Disabled outline</zbk-button>
      </div>
    </article>
  </div>
</section>
