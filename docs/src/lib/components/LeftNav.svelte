<script lang="ts">
  import { page } from '$app/stores';
  import { navigation } from '$lib/data/navigation';

  interface NavSection {
    label: string;
    items: NavItem[];
  }

  interface NavItem {
    label: string;
    link: string;
  }

  let expanded = $state<{ [key: string]: boolean }>({});

  // Toggle section expansion
  function toggleSection(label: string) {
    expanded[label] = !expanded[label];
  }

  // Check if route is active
  function isActive(link: string): boolean {
    return $page.url.pathname === link;
  }

  // Check if any item in a section is active
  function sectionHasActive(section: NavSection): boolean {
    return section.items.some((item) => isActive(item.link));
  }
</script>

<nav class="left-nav">
  <div class="nav-content">
    {#each navigation as section, idx (section.label)}
      <div class="nav-section">
        <button
          class="section-header"
          onclick={() => toggleSection(section.label)}
          aria-expanded={expanded[section.label] ?? sectionHasActive(section)}
        >
          <span class="section-label">{section.label}</span>
          <span class="section-toggle">›</span>
        </button>

        {#if expanded[section.label] ?? sectionHasActive(section)}
          <ul class="nav-items">
            {#each section.items as item (item.link)}
              <li>
                <a
                  href={item.link}
                  class="nav-link"
                  class:active={isActive(item.link)}
                  aria-current={isActive(item.link) ? 'page' : undefined}
                >
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </div>
</nav>

<style>
  .left-nav {
    min-width: var(--zbk-spacing-card);
    background: var(--zbk-app-canvas);
    border-right: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    overflow-y: auto;
    height: calc(100vh - var(--zbk-spacing-205));
    position: sticky;
    top: var(--zbk-spacing-205);
  }

  .nav-content {
    padding: var(--zbk-spacing-05) 0;
  }

  .nav-section {
    margin: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--zbk-spacing-05) var(--zbk-spacing-1);
    border: none;
    background: transparent;
    color: var(--zbk-app-ink);
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
    text-align: left;
    cursor: pointer;
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .section-header:hover {
    background: var(--zbk-app-canvas-muted);
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
    border-top: var(--zbk-border-width-xs) solid var(--zbk-app-border-muted);
  }

  .nav-link {
    display: block;
    padding: var(--zbk-spacing-05) var(--zbk-spacing-05);
    color: var(--zbk-app-ink-soft);
    text-decoration: none;
    font-family: var(--zbk-font-family-body);
    font-size: var(--zbk-font-size-xs);
    transition: all var(--zbk-transition-duration) var(--zbk-transition-timing-function);
  }

  .nav-link:hover {
    color: var(--zbk-app-ink);
    background: var(--zbk-app-canvas-muted);
  }

  .nav-link.active {
    color: var(--zbk-accent-primary-600);
    font-weight: var(--zbk-font-weight-semibold);
    border-left: var(--zbk-border-width-sm) solid var(--zbk-accent-primary-600);
    padding-left: calc(var(--zbk-spacing-05) - var(--zbk-border-width-sm));
  }
/* 
  @media (max-width: 1024px) {
    .left-nav {
      min-width: var(--zbk-spacing-card);
    }
  } */
</style>
