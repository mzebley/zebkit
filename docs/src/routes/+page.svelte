<script lang="ts">
  import EditorialLayout from '$lib/layouts/EditorialLayout.svelte';
  import HeroReskin from '$lib/components/HeroReskin.svelte';
</script>

<div class="home">
  <EditorialLayout
    title="Change everything. Rewrite nothing."
    description="Zebkit is a token-driven, accessibility-first web component library. The HTML is the contract; the tokens are the design."
  >
    <p class="eyebrow">A token-driven, accessibility-first component library</p>
    <h1>Change everything.<br />Rewrite nothing.</h1>
    <p class="lede">
      In zebkit the markup is a contract and the tokens are the design. Re-skin an entire
      product — color, type, density, radius — without touching a line of HTML. The demo
      below is one fixed component tree, repainted entirely by swapping token sets.
    </p>
  </EditorialLayout>

  <!-- Centerpiece: the same HTML, re-skinned by tokens alone. -->
  <HeroReskin />
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-4);
  }

  .eyebrow {
    margin: 0 0 var(--zbk-spacing-1);
    font-family: var(--zbk-font-family-code);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-wider);
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-accent-primary-600);
  }

  .lede {
    color: var(--zbk-app-ink-muted);
    font-size: var(--zbk-font-size-lg);
  }
</style>
