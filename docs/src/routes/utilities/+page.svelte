<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import { utilityManifests } from '$data/utility-manifests';
</script>

<ReferenceLayout
  title="Utilities"
  description="Token-bound utility classes, generated from the linted manifests."
>
  <h1 class="page-title">Utilities</h1>
  <p class="banner">Generated from the linted manifests — verified on every build.</p>
  <p class="lede">
    Every utility references a design token; none carry hard-coded values. These pages render
    straight from the manifest source of truth, so the documented vocabulary cannot drift from
    what the generator emits.
  </p>

  <ul class="manifest-list">
    {#each utilityManifests as m (m.key)}
      <li>
        <a class="manifest-link" href={`/utilities/${m.key}`}>
          <span class="manifest-name">{m.name}</span>
          <span class="manifest-desc">{m.description}</span>
          <span class="manifest-count">
            {m.families.reduce((n, f) => n + f.baseClasses.length, 0)} classes
          </span>
        </a>
      </li>
    {/each}
  </ul>
</ReferenceLayout>

<style>
  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .banner {
    display: inline-block;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-accent-primary-600);
    border: var(--zbk-border-width-xs) solid var(--zbk-accent-primary-600);
    border-radius: var(--zbk-border-radius-xs);
    padding: var(--zbk-spacing-025) var(--zbk-spacing-1);
    margin: 0 0 var(--zbk-spacing-2);
  }

  .lede {
    color: var(--zbk-app-ink-soft);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }

  .manifest-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--zbk-spacing-1);
  }

  .manifest-link {
    display: grid;
    grid-template-columns: 12rem 1fr auto;
    gap: var(--zbk-spacing-2);
    align-items: baseline;
    padding: var(--zbk-spacing-2);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    border-radius: var(--zbk-border-radius-sm);
    text-decoration: none;
    color: var(--zbk-app-ink);
  }

  .manifest-link:hover {
    background: var(--zbk-app-canvas-muted);
    border-color: var(--zbk-app-border);
  }

  .manifest-name {
    font-weight: var(--zbk-font-weight-semibold);
  }

  .manifest-desc {
    color: var(--zbk-app-ink-soft);
    font-size: var(--zbk-font-size-sm);
  }

  .manifest-count {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-soft);
    white-space: nowrap;
  }

  @media (max-width: 48rem) {
    .manifest-link {
      grid-template-columns: 1fr;
      gap: var(--zbk-spacing-05);
    }
  }
</style>
