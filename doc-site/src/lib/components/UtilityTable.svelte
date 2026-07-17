<script lang="ts">
  import type { UtilityFamilyDoc } from '$data/utility-manifests';

  let { family }: { family: UtilityFamilyDoc } = $props();
</script>

<section class="utility-family">
  <header class="family-head">
    <h2 class="family-name">{family.name}</h2>
    <p class="family-desc">{family.description}</p>
    <dl class="meta">
      <div class="meta-row">
        <dt>Properties</dt>
        <dd>{#each family.properties as p, i (p)}<code>{p}</code>{#if i < family.properties.length - 1}, {/if}{/each}</dd>
      </div>
      {#if family.tokenGroup}
        <div class="meta-row">
          <dt>Token group</dt>
          <dd><code>{family.tokenGroup}</code></dd>
        </div>
      {/if}
      {#if family.responsive.length}
        <div class="meta-row">
          <dt>Responsive</dt>
          <dd>{#each family.responsive as bp, i (bp)}<code>{bp}:</code>{#if i < family.responsive.length - 1}{' '}{/if}{/each}</dd>
        </div>
      {/if}
    </dl>
  </header>

  {#if family.a11y}
    <p class="a11y"><span class="a11y-tag">a11y</span> {family.a11y}</p>
  {/if}

  {#if family.guidance.length}
    <div class="guidance">
      <h3 class="sub">Guidance</h3>
      <ul>
        {#each family.guidance as g, i (i)}
          <li>{g}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="vocabulary">
    <h3 class="sub">Vocabulary <span class="vcount">{family.baseClasses.length} classes</span></h3>
    <ul class="class-list">
      {#each family.baseClasses as cls (cls)}
        <li><code data-inspect-class={cls}>{cls}</code></li>
      {/each}
    </ul>
    {#if family.responsive.length}
      <p class="note">
        Each class also accepts a responsive prefix:
        {#each family.responsive as bp, i (bp)}<code>{bp}:{family.baseClasses[0] ?? ''}</code>{#if i < family.responsive.length - 1}, {/if}{/each}.
      </p>
    {/if}
  </div>
</section>

<style>
  .utility-family {
    margin-bottom: var(--zbk-spacing-6);
  }

  .family-name {
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-lg);
    font-weight: var(--zbk-font-weight-semibold);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .family-desc {
    color: var(--zbk-app-ink);
    margin: 0 0 var(--zbk-spacing-2);
    max-width: var(--zbk-text-measure-3, 65ch);
  }

  .meta {
    margin: 0 0 var(--zbk-spacing-2);
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-05);
  }

  .meta-row {
    display: flex;
    gap: var(--zbk-spacing-1);
    font-size: var(--zbk-font-size-sm);
  }

  .meta-row dt {
    flex-shrink: 0;
    width: 9rem;
    color: var(--zbk-app-ink-subtle);
    font-weight: var(--zbk-font-weight-semibold);
  }

  .meta-row dd {
    margin: 0;
  }

  code {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
  }

  .a11y {
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-app-ink);
    border-left: var(--zbk-border-width-sm) solid var(--zbk-accent-primary-600);
    padding-left: var(--zbk-spacing-2);
  }

  .a11y-tag {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    color: var(--zbk-accent-primary-600);
    font-weight: var(--zbk-font-weight-bold);
  }

  .sub {
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink-subtle);
    margin: var(--zbk-spacing-3) 0 var(--zbk-spacing-1);
  }

  .vcount {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-subtle);
    font-weight: var(--zbk-font-weight-normal);
  }

  .guidance ul {
    margin: 0;
    padding-left: var(--zbk-spacing-3);
    font-size: var(--zbk-font-size-sm);
    color: var(--zbk-app-ink);
  }

  .class-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--zbk-spacing-05);
  }

  .class-list li code {
    display: inline-block;
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    background: var(--zbk-app-canvas-muted);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    border-radius: var(--zbk-border-radius-xs);
    color: var(--zbk-app-ink);
  }

  .note {
    margin-top: var(--zbk-spacing-2);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-app-ink-subtle);
  }
</style>
