<script lang="ts">
  export let navigation: Array<{
    label: string;
    collapsed?: boolean;
    items: Array<{ label: string; link: string }>;
  }>;
  export let currentPath: string;
  let className = '';
  export { className as class };

  let collapsedSections = new Set(['Color families']);

  const baseLinkClass =
    'display-block padding-inline-1 padding-block-05 radius-md hover:canvas-brand-100';

  const sectionId = (label: string) =>
    `section-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  function isActive(path: string) {
    return currentPath.startsWith(path);
  }

  function toggleSection(label: string) {
    const updated = new Set(collapsedSections);
    if (updated.has(label)) {
      updated.delete(label);
    } else {
      updated.add(label);
    }
    collapsedSections = updated;
  }
</script>

<aside
  class={`canvas-app-subtle padding-05 overflow-y-auto ${className}`}
>
  <nav class="display-flex flex-direction-column gap-6" aria-label="Documentation">
    {#each navigation as section}
      {@const isCollapsible = section.collapsed !== undefined}
      {@const id = sectionId(section.label)}
      <section class="display-flex flex-direction-column gap-2">
        {#if isCollapsible}
          <button
            type="button"
            class="width-full display-flex align-items-center justify-content-between text-left text-2xs font-weight-semibold text-uppercase letter-spacing-wider ink-app-muted hover:ink-app-emphasis"
            on:click={() => toggleSection(section.label)}
            aria-controls={id}
            aria-expanded={!collapsedSections.has(section.label)}
          >
            {section.label}
            <span>
              {collapsedSections.has(section.label) ? '▸' : '▾'}
            </span>
          </button>
        {:else}
          <div class="text-2xs font-weight-semibold text-uppercase letter-spacing-wider ink-app-muted">
            {section.label}
          </div>
        {/if}

        {#if !collapsedSections.has(section.label)}
          <ul id={id} class="display-flex flex-direction-column gap-1">
            {#each section.items as item}
              <li>
                <a
                  href={item.link}
                  class={`${baseLinkClass} ${
                    isActive(item.link)
                      ? 'canvas-brand-100 ink-brand-700 font-weight-semibold border-width-left-md border-brand-500'
                      : 'ink-app border-width-left-md border-app-muted'
                  }`}
                  aria-current={isActive(item.link) ? 'page' : undefined}
                >
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}
  </nav>
</aside>

<style>
  aside {
    border-inline-end: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }

  nav :is(a, button) {
    transition:
      color var(--zbk-transition-calm-fx-duration-default) var(--zbk-transition-calm-fx-function-default),
      background-color var(--zbk-transition-calm-fx-duration-default) var(--zbk-transition-calm-fx-function-default);
  }

  nav a {
    border-inline-start-style: solid;
  }
</style>
