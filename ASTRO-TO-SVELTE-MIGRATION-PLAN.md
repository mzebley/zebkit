# Astro → SvelteKit Migration Plan for Zebkit Documentation

## Executive Summary

Migrate zebkit documentation from Astro/Starlight to SvelteKit with zebkit utility classes as the exclusive styling system. This eliminates the Starlight/Rapide theming conflicts and provides a familiar, maintainable framework.

**Technology Stack:**
- SvelteKit (static site generation)
- mdsvex (MDX in Svelte)
- TypeScript
- Zebkit utility classes only (no custom CSS beyond minimal global styles)

**Migration Type:** Phased, component-by-component

**Timeline:** 3 weeks (estimated)

---

## Phase 1: Foundation Setup

### 1.1 Initialize SvelteKit Project

**Location:** `docs/` directory (replace existing Astro setup)

**Commands:**
```bash
cd docs
npm create svelte@latest . --template skeleton --types typescript
npm install -D @sveltejs/adapter-static mdsvex sass svelte-preprocess
```

**Critical Files to Create:**

#### `svelte.config.js`
```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

const config = {
  extensions: ['.svelte', '.md', '.mdx'],
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: ['.md', '.mdx'],
      layout: {
        foundations: './src/lib/layouts/FoundationsLayout.svelte',
        components: './src/lib/layouts/ComponentLayout.svelte',
        _: './src/lib/layouts/DefaultLayout.svelte'
      }
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false,
      strict: true
    }),
    prerender: {
      entries: ['*'],
      handleHttpError: 'warn'
    },
    alias: {
      '$definitions': '../src/definitions',
      '$data': './src/lib/data',
      '$components': './src/lib/components',
      '$utils': './src/lib/utils'
    }
  }
};

export default config;
```

#### `vite.config.ts`
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '$definitions': fileURLToPath(new URL('../src/definitions', import.meta.url)),
      '$data': fileURLToPath(new URL('./src/lib/data', import.meta.url)),
      '$components': fileURLToPath(new URL('./src/lib/components', import.meta.url)),
      '$utils': fileURLToPath(new URL('./src/lib/utils', import.meta.url))
    }
  }
});
```

#### `package.json` scripts
```json
{
  "scripts": {
    "sync:tokens": "npm run build:tokens --prefix .. -- --config zebkit.docs.config.json",
    "predev": "npm run sync:tokens",
    "dev": "vite dev",
    "prebuild": "npm run sync:tokens",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 1.2 Directory Structure

**New Structure:**
```
docs/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte              # Root layout
│   │   ├── +layout.ts                  # Navigation data
│   │   ├── +page.md                    # Homepage
│   │   ├── foundations/
│   │   │   ├── tokens/+page.mdx
│   │   │   ├── layers/+page.md
│   │   │   ├── color/
│   │   │   │   ├── +page.md
│   │   │   │   ├── brand/+page.mdx
│   │   │   │   └── [family]/+page.ts   # Dynamic routes
│   │   │   ├── elevation/+page.mdx
│   │   │   ├── opacity/+page.mdx
│   │   │   ├── z-index/+page.mdx
│   │   │   └── transitions/+page.mdx
│   │   ├── components/
│   │   │   └── button/+page.mdx
│   │   └── utilities/
│   │       └── overview/+page.md
│   ├── lib/
│   │   ├── components/              # Svelte components
│   │   ├── layouts/                 # MDX layouts
│   │   ├── data/                    # Existing data files (moved)
│   │   └── utils/                   # Existing utils (moved)
│   ├── app.html                     # HTML shell
│   └── app.css                      # Global styles
├── static/
│   └── zebkit/                      # Token sync output
│       ├── zbk-default.min.css
│       ├── zebkit.js
│       ├── default-tokens.json
│       └── token-lookup.json
└── package.json
```

### 1.3 Global Styling Setup

#### `src/app.css`
```css
/* Import zebkit compiled CSS */
@import '/zebkit/zbk-default.min.css';

/* Font imports */
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@200..800&display=swap');

/* Zebkit already defines @layer theme, base, components, utilities */
/* NO custom layers - use zebkit's system */

/* Minimal global overrides using zebkit tokens */
:root {
  font-family: var(--zbk-font-family-body);
}

body {
  margin: 0;
  background: var(--zbk-app-canvas);
  color: var(--zbk-app-ink);
}

* {
  box-sizing: border-box;
}

/* All other styling via zebkit utility classes */
```

### 1.4 Navigation Data

#### `src/lib/data/navigation.ts`
```typescript
export const navigation = [
  {
    label: 'Foundations',
    items: [
      { label: 'Tokens', link: '/foundations/tokens' },
      { label: 'Layers', link: '/foundations/layers' },
      { label: 'Color', link: '/foundations/color' },
      { label: 'Elevation', link: '/foundations/elevation' },
      { label: 'Opacity', link: '/foundations/opacity' },
      { label: 'Transitions', link: '/foundations/transitions' },
      { label: 'Z-Index', link: '/foundations/z-index' }
    ]
  },
  {
    label: 'Color families',
    collapsed: true,
    items: [
      { label: 'Primitives', link: '/foundations/color/primitives' },
      { label: 'Brand', link: '/foundations/color/brand' },
      { label: 'Accent Primary', link: '/foundations/color/accent-primary' },
      { label: 'Accent Secondary', link: '/foundations/color/accent-secondary' },
      { label: 'App', link: '/foundations/color/app' },
      { label: 'Action', link: '/foundations/color/action' },
      { label: 'Caution', link: '/foundations/color/caution' },
      { label: 'Critical', link: '/foundations/color/critical' },
      { label: 'Info', link: '/foundations/color/info' },
      { label: 'Positive', link: '/foundations/color/positive' }
    ]
  },
  {
    label: 'Components',
    items: [
      { label: 'Button', link: '/components/button' }
    ]
  },
  {
    label: 'Utilities',
    items: [
      { label: 'Overview', link: '/utilities/overview' }
    ]
  }
];
```

---

## Phase 2: Layout Components

### 2.1 Root Layout

#### `src/routes/+layout.svelte`
```svelte
<script lang="ts">
  import '../app.css';
  import ZebkitLoader from '$components/ZebkitLoader.svelte';
  import Header from '$components/Header.svelte';
  import Sidebar from '$components/Sidebar.svelte';
  import { page } from '$app/stores';

  export let data;
</script>

<ZebkitLoader />

<div class="flex flex-col min-h-screen canvas-app ink-app">
  <Header />

  <div class="flex flex-1">
    <Sidebar navigation={data.navigation} currentPath={$page.url.pathname} />

    <main class="flex-1 p-8 max-w-4xl mx-auto w-full">
      <slot />
    </main>
  </div>
</div>
```

#### `src/routes/+layout.ts`
```typescript
import { navigation } from '$lib/data/navigation';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
  return {
    navigation
  };
};

export const prerender = true;
```

### 2.2 Header Component

#### `src/lib/components/Header.svelte`
```svelte
<header class="canvas-brand-strong ink-brand-inverse border-b-2 border-brand-muted p-4">
  <div class="flex items-center justify-between max-w-7xl mx-auto">
    <a
      href="/"
      class="text-2xl font-bold hover:ink-brand-soft transition-colors"
    >
      zebkit
    </a>
    <nav class="flex gap-6">
      <a
        href="/foundations/tokens"
        class="hover:ink-brand-muted transition-colors font-medium"
      >
        Foundations
      </a>
      <a
        href="/components/button"
        class="hover:ink-brand-muted transition-colors font-medium"
      >
        Components
      </a>
      <a
        href="/utilities/overview"
        class="hover:ink-brand-muted transition-colors font-medium"
      >
        Utilities
      </a>
    </nav>
  </div>
</header>
```

### 2.3 Sidebar Component

#### `src/lib/components/Sidebar.svelte`
```svelte
<script lang="ts">
  export let navigation: any[];
  export let currentPath: string;

  let collapsedSections = new Set(['Color families']);

  function isActive(path: string) {
    return currentPath.startsWith(path);
  }

  function toggleSection(label: string) {
    if (collapsedSections.has(label)) {
      collapsedSections.delete(label);
    } else {
      collapsedSections.add(label);
    }
    collapsedSections = collapsedSections;
  }
</script>

<aside class="w-64 canvas-app-soft border-r border-app-muted p-6 overflow-y-auto">
  {#each navigation as section}
    <div class="mb-6">
      <button
        type="button"
        on:click={() => toggleSection(section.label)}
        class="w-full text-left text-sm font-semibold uppercase tracking-wide ink-app-muted mb-2 hover:ink-app-strong transition-colors"
      >
        {section.label}
        {#if section.collapsed !== undefined}
          <span class="float-right">
            {collapsedSections.has(section.label) ? '▸' : '▾'}
          </span>
        {/if}
      </button>

      {#if !collapsedSections.has(section.label)}
        <ul class="flex flex-col gap-1">
          {#each section.items as item}
            <li>
              <a
                href={item.link}
                class="block p-2 rounded hover:canvas-brand-soft transition-colors"
                class:canvas-brand-muted={isActive(item.link)}
                class:ink-brand-strong={isActive(item.link)}
                class:font-semibold={isActive(item.link)}
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</aside>
```

### 2.4 MDX Layout

#### `src/lib/layouts/DefaultLayout.svelte`
```svelte
<script lang="ts">
  export let title: string = '';
  export let description: string = '';
</script>

<svelte:head>
  <title>{title} | zebkit</title>
  <meta name="description" content={description} />
</svelte:head>

<article class="flex flex-col gap-6">
  {#if title}
    <header class="border-b border-app-muted pb-6">
      <h1 class="text-4xl font-bold ink-app-strong mb-2">{title}</h1>
      {#if description}
        <p class="text-lg ink-app-muted">{description}</p>
      {/if}
    </header>
  {/if}

  <div class="prose-zebkit">
    <slot />
  </div>
</article>

<style>
  /* Typography using zebkit utilities - define prose-zebkit scope */
  :global(.prose-zebkit) {
    @apply flex flex-col gap-4;
  }

  :global(.prose-zebkit h2) {
    @apply text-2xl font-bold ink-app-strong mt-8 mb-4;
  }

  :global(.prose-zebkit h3) {
    @apply text-xl font-semibold ink-app-strong mt-6 mb-3;
  }

  :global(.prose-zebkit p) {
    @apply text-base ink-app leading-relaxed;
  }

  :global(.prose-zebkit code) {
    @apply canvas-app-muted px-1 py-0.5 rounded text-sm font-mono;
  }

  :global(.prose-zebkit a) {
    @apply ink-action underline hover:ink-action-strong transition-colors;
  }
</style>
```

---

## Phase 3: Interactive Components

### 3.1 ZebkitLoader

#### `src/lib/components/ZebkitLoader.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  const cssHref = '/zebkit/zbk-default.min.css';
  const scriptPath = '/zebkit/zebkit.js';

  onMount(async () => {
    if (typeof window !== 'undefined' && !(window as any).__zebkitLoaded) {
      (window as any).__zebkitLoaded = true;
      try {
        const { core } = await import(scriptPath);
        core.defineCoreComponents();
      } catch (err) {
        console.error('Failed to load zebkit components:', err);
      }
    }
  });
</script>

<svelte:head>
  <link rel="stylesheet" href={cssHref} />
</svelte:head>
```

### 3.2 TokenTable

#### `src/lib/components/TokenTable.svelte`
```svelte
<script lang="ts">
  import type { TokenRow } from '$utils/token-docs';
  import { getCssVarForReference } from '$utils/token-lookup';

  export let rows: TokenRow[] = [];
  export let showColorSwatches: boolean = true;

  let className: string = '';
  export { className as class };
</script>

<div class="overflow-x-auto {className}">
  <table class="w-full border-collapse canvas-app-soft rounded-lg overflow-hidden">
    <thead class="canvas-app-muted">
      <tr>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Token
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Type
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Value
        </th>
        <th class="text-left p-3 font-semibold text-sm ink-app-strong border-b border-app-muted">
          Description
        </th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { token, type, value, description }, i}
        {@const cssVar = showColorSwatches && type === 'color'
          ? getCssVarForReference(value) ?? getCssVarForReference(token)
          : null}
        <tr class="hover:canvas-app-muted transition-colors">
          <td class="p-3 border-b border-app-muted">
            <code class="text-sm font-mono ink-app-strong">{token}</code>
          </td>
          <td class="p-3 border-b border-app-muted">
            <code class="text-sm font-mono ink-app-muted">{type}</code>
          </td>
          <td class="p-3 border-b border-app-muted">
            <div class="flex items-center gap-2">
              {#if cssVar}
                <span
                  class="w-6 h-6 rounded border border-app-muted inline-block flex-shrink-0"
                  style="background: var({cssVar})"
                  aria-hidden="true"
                  title="Preview of {cssVar}"
                />
              {/if}
              <code class="text-sm font-mono ink-app">{String(value)}</code>
            </div>
          </td>
          <td class="p-3 border-b border-app-muted text-sm ink-app">
            {description}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

### 3.3 TokenPlayground

#### `src/lib/components/TokenPlayground.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = 'Token playground';
  export let description: string | undefined = undefined;
  export let groups: any[];
  export let scopeSelector: string = ':root';

  let scopeElement: HTMLElement;
  let overrides = new Map<string, string>();

  onMount(() => {
    initializePlayground();
  });

  function initializePlayground() {
    // Initialize controls based on groups
  }

  function updateToken(token: string, value: string) {
    overrides.set(token, value);
    applyOverrides();
  }

  function applyOverrides() {
    const target = scopeSelector === ':root' ? document.documentElement : scopeElement;
    if (!target) return;

    overrides.forEach((value, token) => {
      target.style.setProperty(token, value);
    });
  }

  function resetAll() {
    overrides.clear();
    const target = scopeSelector === ':root' ? document.documentElement : scopeElement;
    if (!target) return;

    groups.forEach(group => {
      group.controls?.forEach((control: any) => {
        target.style.removeProperty(control.token);
      });
    });
  }

  function copyCSS() {
    const css = Array.from(overrides.entries())
      .map(([token, value]) => `  ${token}: ${value};`)
      .join('\n');

    const output = `${scopeSelector} {\n${css}\n}`;
    navigator.clipboard.writeText(output);
  }
</script>

<section
  class="canvas-app-soft border border-app-muted rounded-lg p-6 flex flex-col gap-5"
  data-scope-selector={scopeSelector}
>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-wider mb-1 ink-app-muted">Live overrides</p>
      <h3 class="text-lg font-semibold ink-app-strong">{title}</h3>
      {#if description}
        <p class="text-sm ink-app-muted mt-1">{description}</p>
      {/if}
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        on:click={resetAll}
        class="px-4 py-2 canvas-app-muted hover:canvas-app-strong rounded transition-colors ink-app font-medium text-sm"
      >
        Reset all
      </button>
      <button
        type="button"
        on:click={copyCSS}
        class="px-4 py-2 canvas-action hover:canvas-action-strong rounded transition-colors ink-action-inverse font-medium text-sm"
      >
        Copy CSS
      </button>
    </div>
  </div>

  <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <div class="flex flex-col gap-4">
      {#each groups as group}
        <div class="flex flex-col gap-2">
          <h4 class="text-sm font-semibold ink-app-strong">{group.label}</h4>
          {#each group.controls || [] as control}
            <label class="flex flex-col gap-1">
              <span class="text-xs ink-app-muted">{control.label}</span>
              {#if control.type === 'color'}
                <input
                  type="color"
                  value={control.default}
                  on:input={(e) => updateToken(control.token, e.currentTarget.value)}
                  class="h-10 w-full rounded border border-app-muted cursor-pointer"
                />
              {:else if control.type === 'range'}
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step || 1}
                  value={control.default}
                  on:input={(e) => updateToken(control.token, e.currentTarget.value + (control.unit || ''))}
                  class="w-full"
                />
              {:else}
                <input
                  type="text"
                  value={control.default}
                  on:input={(e) => updateToken(control.token, e.currentTarget.value)}
                  class="p-2 rounded border border-app-muted canvas-app ink-app"
                />
              {/if}
            </label>
          {/each}
        </div>
      {/each}
    </div>

    <div
      bind:this={scopeElement}
      class="border-2 border-dashed border-app-muted rounded-lg p-5 canvas-app-soft"
    >
      <slot />
    </div>
  </div>
</section>
```

### 3.4 ButtonShowcase

#### `src/lib/components/ButtonShowcase.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Any initialization needed
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
        <p class="text-sm ink-app-muted">Using <code class="canvas-app-muted px-1 py-0.5 rounded">disabled</code> attribute.</p>
      </header>
      <div class="flex flex-wrap gap-3 items-center">
        <zbk-button disabled>Disabled button</zbk-button>
        <zbk-button variant="outline" disabled>Disabled outline</zbk-button>
      </div>
    </article>
  </div>
</section>
```

### 3.5 TokenLookupDemo

#### `src/lib/components/TokenLookupDemo.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string = 'Token alias lookup';
  export let description: string | undefined = undefined;
  export let prefix: string = '';
  export let label: string = 'Token alias';
  export let lookupHref: string = '/zebkit/token-lookup.json';

  let lookupData: Record<string, string> = {};
  let filteredTokens: [string, string][] = [];
  let selectedAlias: string = '';
  let selectedCssVar: string = '';
  let loading: boolean = true;

  onMount(async () => {
    await loadLookupData();
  });

  async function loadLookupData() {
    try {
      const response = await fetch(lookupHref);
      lookupData = await response.json();

      filteredTokens = Object.entries(lookupData)
        .filter(([key]) => prefix ? key.startsWith(prefix) : true)
        .sort(([a], [b]) => a.localeCompare(b));

      loading = false;

      if (filteredTokens.length > 0) {
        selectToken(filteredTokens[0][0]);
      }
    } catch (err) {
      console.error('Failed to load token lookup:', err);
      loading = false;
    }
  }

  function selectToken(alias: string) {
    selectedAlias = alias;
    selectedCssVar = lookupData[alias] || '';
  }
</script>

<section class="border border-app-muted rounded-lg p-4 flex flex-col gap-3 canvas-app-soft">
  <header>
    <h3 class="text-lg font-semibold ink-app-strong">{title}</h3>
    {#if description}
      <p class="text-sm ink-app-muted mt-1">{description}</p>
    {/if}
  </header>

  <label class="flex flex-col gap-2">
    <span class="text-sm font-medium ink-app-strong">{label}</span>
    <select
      bind:value={selectedAlias}
      on:change={(e) => selectToken(e.currentTarget.value)}
      disabled={loading}
      class="p-2 rounded border border-app-muted canvas-app ink-app"
    >
      {#if loading}
        <option>Loading {label.toLowerCase()}…</option>
      {:else}
        {#each filteredTokens as [alias]}
          <option value={alias}>{alias}</option>
        {/each}
      {/if}
    </select>
  </label>

  <div class="grid gap-3 canvas-app rounded-lg p-3 border border-app-muted"
       style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
    <div>
      <span class="text-xs ink-app-muted block mb-1">Reference</span>
      <code class="block text-sm ink-app-strong">{selectedAlias || '–'}</code>
    </div>
    <div>
      <span class="text-xs ink-app-muted block mb-1">CSS custom property</span>
      <code class="block text-sm break-all ink-app-strong">
        {selectedCssVar ? `var(${selectedCssVar})` : 'var(--zbk-…)'}
      </code>
    </div>
  </div>

  {#if !loading}
    <p class="text-xs ink-app-muted">
      Showing {filteredTokens.length} token{filteredTokens.length === 1 ? '' : 's'}
      {#if prefix}with prefix "{prefix}"{/if}
    </p>
  {/if}
</section>
```

---

## Phase 4: Content Migration

### 4.1 Data Layer Migration

**Actions:**
1. Copy existing data files to new locations:
   - `docs/src/data/` → `docs/src/lib/data/`
   - `docs/src/utils/` → `docs/src/lib/utils/`

**Files to move (no changes needed):**
- `compiled-tokens.ts`
- `button-docs.ts`
- `foundation-colors.ts`
- `token-rows.ts`
- `token-types.ts`
- `palette-map.ts`
- `token-docs.ts`
- `token-lookup.ts`

### 4.2 Page Content Migration

**Strategy:** Convert `.md` and `.mdx` files from `docs/src/content/docs/` to SvelteKit routes.

**Mapping:**

| Current Astro Path | New SvelteKit Path |
|-------------------|-------------------|
| `src/content/docs/index.md` | `src/routes/+page.md` |
| `src/content/docs/foundations/tokens.mdx` | `src/routes/foundations/tokens/+page.mdx` |
| `src/content/docs/foundations/layers.md` | `src/routes/foundations/layers/+page.md` |
| `src/content/docs/foundations/color.md` | `src/routes/foundations/color/+page.md` |
| `src/content/docs/foundations/color/brand.mdx` | `src/routes/foundations/color/brand/+page.mdx` |
| `src/content/docs/components/button.mdx` | `src/routes/components/button/+page.mdx` |
| `src/content/docs/utilities/overview.md` | `src/routes/utilities/overview/+page.md` |

**Conversion Steps per File:**
1. Copy content from Astro MDX to new SvelteKit route
2. Update frontmatter (keep title/description)
3. Change component imports:
   - Old: `import TokenTable from '@components/TokenTable.astro'`
   - New: `import TokenTable from '$components/TokenTable.svelte'`
4. Update data imports to use `$data` alias
5. Verify component usage syntax (should be identical)

**Example conversion:**

**Before (Astro):**
```mdx
---
title: Brand colors
description: Primary identity palette
---

import TokenTable from '@components/TokenTable.astro';
import { brandTokenRows } from '@data/foundation-colors';

Brand colors anchor the Zebkit identity...

## Tokens
<TokenTable rows={brandTokenRows} showColorSwatches={true} />
```

**After (SvelteKit):**
```mdx
---
title: Brand colors
description: Primary identity palette
---

<script>
  import TokenTable from '$components/TokenTable.svelte';
  import { brandTokenRows } from '$data/foundation-colors';
</script>

Brand colors anchor the Zebkit identity...

## Tokens
<TokenTable rows={brandTokenRows} showColorSwatches={true} />
```

### 4.3 Dynamic Color Family Routes

#### `src/routes/foundations/color/[family]/+page.ts`
```typescript
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

const families = [
  'primitives', 'brand', 'accent-primary', 'accent-secondary',
  'app', 'action', 'caution', 'critical', 'info', 'positive'
];

export const load: PageLoad = async ({ params }) => {
  if (!families.includes(params.family)) {
    throw error(404, 'Color family not found');
  }

  return {
    family: params.family
  };
};

export const entries = () => {
  return families.map(family => ({ family }));
};

export const prerender = true;
```

---

## Phase 5: Build & Deployment

### 5.1 Static Asset Handling

**Token Sync:** Keep existing pre-build hooks in `package.json`
- `predev` runs `sync:tokens` before dev server
- `prebuild` runs `sync:tokens` before production build

**Output Location:** `static/zebkit/` (automatically served at `/zebkit/`)

**Assets:**
- `zbk-default.min.css`
- `zebkit.js`
- `default-tokens.json`
- `token-lookup.json`
- `allowed-token-types.json`

### 5.2 Production Build

**Commands:**
```bash
npm run build    # Runs prebuild (token sync) then vite build
npm run preview  # Preview production build locally
```

**Output:** `build/` directory (static HTML/CSS/JS)

### 5.3 Search Implementation

**Option 1: Pagefind (Recommended - minimal changes)**
```bash
npm install -D pagefind
```

Add to `package.json`:
```json
{
  "scripts": {
    "postbuild": "pagefind --source build"
  }
}
```

Create search component:
```svelte
<!-- src/lib/components/Search.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let pagefind: any;
  let query = '';
  let results: any[] = [];

  onMount(async () => {
    pagefind = await import('/pagefind/pagefind.js');
  });

  async function search() {
    if (!pagefind || !query) {
      results = [];
      return;
    }

    const searchResults = await pagefind.search(query);
    results = await Promise.all(
      searchResults.results.map((r: any) => r.data())
    );
  }
</script>

<div class="search-container">
  <input
    type="search"
    bind:value={query}
    on:input={search}
    placeholder="Search documentation..."
    class="w-full p-2 rounded border border-app-muted canvas-app ink-app"
  />

  {#if results.length > 0}
    <ul class="mt-2 canvas-app-soft border border-app-muted rounded-lg">
      {#each results as result}
        <li class="border-b border-app-muted last:border-b-0">
          <a href={result.url} class="block p-3 hover:canvas-app-muted transition-colors">
            <h4 class="font-semibold ink-app-strong">{result.meta.title}</h4>
            <p class="text-sm ink-app-muted mt-1">{@html result.excerpt}</p>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

---

## Phase 6: Migration Execution Plan

### Week 1: Foundation
- [ ] Day 1: Initialize SvelteKit, configure mdsvex, set up aliases
- [ ] Day 2: Create global styles, token sync integration, static asset handling
- [ ] Day 3: Build root layout, header, sidebar components
- [ ] Day 4: Create MDX layouts, navigation data
- [ ] Day 5: Verify dev server runs, token sync works, zebkit CSS loads

### Week 2: Components & Content
- [ ] Day 1: Migrate ZebkitLoader, TokenTable components
- [ ] Day 2: Migrate TokenPlayground, TokenLookupDemo components
- [ ] Day 3: Migrate ButtonShowcase, test all interactive components
- [ ] Day 4: Migrate homepage, foundations pages (tokens, layers, color)
- [ ] Day 5: Migrate all 10 color family pages, set up dynamic routing

### Week 3: Completion & Polish
- [ ] Day 1: Migrate button component page, utilities overview
- [ ] Day 2: Migrate elevation, opacity, z-index, transitions pages
- [ ] Day 3: Implement search, visual parity validation
- [ ] Day 4: Cross-browser testing, accessibility audit, performance optimization
- [ ] Day 5: Production build, deployment, documentation

### Visual Parity Checklist
- [ ] Header matches current layout (logo, nav links, styling)
- [ ] Sidebar navigation identical (sections, collapsing, active states)
- [ ] Homepage content and layout preserved
- [ ] Color family pages display token tables with swatches
- [ ] TokenPlayground controls work correctly
- [ ] Button showcase renders all sizes/variants
- [ ] Token lookup demo fetches and displays properly
- [ ] Typography hierarchy matches
- [ ] Spacing and padding consistent
- [ ] All hover/focus/active states work
- [ ] Mobile responsive behavior maintained
- [ ] Dark mode support (if applicable)

---

## Critical Files Reference

### Must Create
1. [svelte.config.js](svelte.config.js) - SvelteKit + mdsvex configuration
2. [vite.config.ts](vite.config.ts) - Path aliases
3. [src/routes/+layout.svelte](src/routes/+layout.svelte) - Root layout
4. [src/routes/+layout.ts](src/routes/+layout.ts) - Navigation data loader
5. [src/app.css](src/app.css) - Global styles with zebkit imports
6. [src/lib/data/navigation.ts](src/lib/data/navigation.ts) - Sidebar structure
7. [src/lib/components/Header.svelte](src/lib/components/Header.svelte) - Site header
8. [src/lib/components/Sidebar.svelte](src/lib/components/Sidebar.svelte) - Navigation sidebar
9. [src/lib/layouts/DefaultLayout.svelte](src/lib/layouts/DefaultLayout.svelte) - MDX wrapper

### Must Migrate
1. All 5 interactive components (.astro → .svelte)
2. All data files from `src/data/` → `src/lib/data/`
3. All utils from `src/utils/` → `src/lib/utils/`
4. All content from `src/content/docs/` → `src/routes/`

### Can Delete (After Migration Complete)
1. `astro.config.mjs`
2. `src/content/config.ts`
3. `docs/.astro/` directory
4. All `.astro` component files
5. Starlight/Rapide dependencies from package.json

---

## Verification Testing

### Functional Tests
1. **Token sync**: Run `npm run sync:tokens`, verify files appear in `static/zebkit/`
2. **Dev server**: Run `npm run dev`, verify site loads at localhost
3. **Navigation**: Click all sidebar links, verify routing works
4. **Interactive components**:
   - TokenTable: Displays rows, color swatches render
   - TokenPlayground: Controls update CSS variables, reset/copy work
   - TokenLookupDemo: Dropdown loads, selection shows CSS var
   - ButtonShowcase: All button variants render correctly
5. **Search**: Enter queries, verify results appear
6. **Production build**: Run `npm run build`, verify static output in `build/`

### Visual Regression Tests
1. Take screenshots of current Astro site (all pages)
2. Take screenshots of new SvelteKit site (all pages)
3. Compare side-by-side for layout/styling differences
4. Verify zebkit utility classes produce identical visual results

### Accessibility Tests
1. Run Lighthouse audit (target: 100 accessibility score)
2. Test keyboard navigation (tab through all interactive elements)
3. Test screen reader compatibility (VoiceOver/NVDA)
4. Verify ARIA labels on interactive components
5. Check color contrast ratios meet WCAG AA standards

---

## Success Criteria

- ✅ All pages from Astro site migrated to SvelteKit
- ✅ All interactive components work identically
- ✅ Visual layout matches current site pixel-perfect
- ✅ Only zebkit utility classes used for styling (no Starlight/Rapide)
- ✅ Token sync integration preserved
- ✅ Build process produces static output
- ✅ Search functionality working
- ✅ No TypeScript errors
- ✅ All links and navigation functional
- ✅ Accessibility score ≥95
- ✅ Mobile responsive
- ✅ Developer experience improved (easier to understand and update)

---

## Risk Mitigation

**Risk:** mdsvex doesn't support all MDX features
**Mitigation:** Test component imports early, have fallback to static HTML if needed

**Risk:** Visual parity difficult to achieve with utility classes
**Mitigation:** Reference existing Starlight styles, map to equivalent zebkit utilities systematically

**Risk:** Search functionality breaks
**Mitigation:** Pagefind is framework-agnostic, should work identically

**Risk:** Token sync breaks in new setup
**Mitigation:** Keep exact same prebuild hooks, test early in Phase 1

**Risk:** Interactive components lose functionality
**Mitigation:** Port logic carefully, test each component individually before integration
