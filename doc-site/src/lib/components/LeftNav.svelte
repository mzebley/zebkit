<script lang="ts">
  import { page } from '$app/stores';
  import { navigation, type NavGroup, type NavLink, type NavSection } from '$lib/data/navigation';
  import { closeNav } from '$lib/stores/ui.svelte';

  // `fill` is set when the nav rides the compact drawer: it should fill the
  // drawer panel rather than hold its fixed column width, and shed the column-
  // only chrome (right border, sticky, viewport-height) the Overlay provides.
  let { fill = false }: { fill?: boolean } = $props();

  let expanded = $state<{ [key: string]: boolean }>({});

  // Toggle section expansion
  function toggleSection(label: string) {
    expanded[label] = !expanded[label];
  }

  // Check if route is active
  function isActive(link: string): boolean {
    return $page.url.pathname === link;
  }

  // Check if any item in a collapsible group is active
  function groupHasActive(group: NavGroup): boolean {
    return group.items.some((item) => isActive(item.link));
  }

  // Distinguish the direct-link variation from a collapsible group
  function isLink(section: NavSection): section is NavLink {
    return 'link' in section;
  }
</script>

<nav class="left-nav" class:fill>
  <div class="nav-content">
    {#each navigation as section (section.label)}
      <div class="nav-section">
        {#if isLink(section)}
          <a
            href={section.link}
            class="section-header section-link"
            class:active={isActive(section.link)}
            aria-current={isActive(section.link) ? 'page' : undefined}
            onclick={closeNav}
          >
            <span class="section-label">{section.label}</span>
          </a>
        {:else}
          <button
            class="section-header"
            onclick={() => toggleSection(section.label)}
            aria-expanded={expanded[section.label] ?? groupHasActive(section)}
          >
            <span class="section-label">{section.label}</span>
            <span class="section-toggle">›</span>
          </button>

          {#if expanded[section.label] ?? groupHasActive(section)}
            <ul class="nav-items">
              {#each section.items as item (item.link)}
                <li>
                  <a
                    href={item.link}
                    class="nav-link"
                    class:active={isActive(item.link)}
                    aria-current={isActive(item.link) ? 'page' : undefined}
                    onclick={closeNav}
                  >
                    {item.label}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</nav>

<style>
  .left-nav {
    min-width: var(--zbk-spacing-10);
    /* background: var(--zbk-app-canvas); */
    border-right: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    overflow-y: auto;
    height: calc(100vh - var(--zbk-spacing-205));
    position: sticky;
    top: var(--zbk-spacing-205);
    padding-bottom: var(--zbk-spacing-4);
  }

  /* Drawer context: fill the Overlay panel and drop the column-only chrome. */
  .left-nav.fill {
    width: 100%;
    min-width: 0;
    height: auto;
    position: static;
    border-right: none;
  }

  .nav-content {
    padding: 0;
  }

  .nav-section {
    margin: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: calc(100% - var(--zbk-border-width-xs));
    padding: var(--zbk-spacing-025) var(--zbk-spacing-05);
    border: none;
    background: transparent;
    color: var(--zbk-app-ink);
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-medium);
    text-align: left;
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .section-header:hover {
    background: var(--zbk-action-canvas-muted);
  }

  /* Direct-link variation: a top-level section that navigates instead of
     toggling. Sheds the chevron and gains a link's text/active treatment. */
  .section-link {
    text-decoration: none;
  }

  .section-link.active {
    color: var(--zbk-action-ink);
    font-weight: var(--zbk-font-weight-semibold);
    background: var(--zbk-action-canvas-muted);
  }

  .section-label {
    flex: 1;
  }

  .section-toggle {
    display: inline-block;
    transform: rotate(90deg);
    transition: transform var(--zbk-transition-duration) var(--zbk-transition-timing-function);
    font-size: var(--zbk-font-size-sm);
  }

  .section-header[aria-expanded='true'] .section-toggle {
    transform: rotate(90deg) rotateX(180deg);
  }

  .nav-items {
    list-style: none;
    margin: 0;
    padding: 0;
    /* background-color: var(--zbk-app-canvas-muted); */
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    border-left: none;
    border-right: none;
  }

  .nav-link {
    display: block;
    padding: var(--zbk-spacing-05) var(--zbk-spacing-05);
    color: var(--zbk-app-ink-subtle);
    border-left: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
    padding-left: calc(var(--zbk-spacing-05) - var(--zbk-border-width-xs));
    text-decoration: none;
    font-family: var(--zbk-font-family-monospace);
    font-size: var(--zbk-font-size-xs);
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .nav-link:hover {
    color: var(--zbk-app-ink);
    background: var(--zbk-action-canvas-muted);
  }

  .nav-link.active {
    color: var(--zbk-action-ink);
    font-weight: var(--zbk-font-weight-semibold);
    border-left: var(--zbk-border-width-md) solid var(--zbk-action-ink);
    padding-left: calc(var(--zbk-spacing-05) - var(--zbk-border-width-md));
  }
/* 
  @media (max-width: 1024px) {
    .left-nav {
      min-width: var(--zbk-spacing-card);
    }
  } */
</style>
