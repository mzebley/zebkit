<script lang="ts">
  import ReferenceLayout from '$lib/layouts/ReferenceLayout.svelte';
  import { colorFamilies, semanticColorFamilies } from '$data/color-families';
  import { primitivePalette, type PrimitiveFamily } from '$data/primitive-palette';

  // Tri-band teaser chips (500 / 300 / 700) grouped into vivid and muted registers.
  const MUTED_MAX_SATURATION = 50;
  const BAND_STEPS = [500, 300, 700];

  const toChip = (f: PrimitiveFamily) => ({
    name: f.name,
    hue: f.hue,
    saturation: f.saturation,
    bands: BAND_STEPS.map(
      (step) => (f.swatches.find((s) => s.step === step) ?? f.swatches[0]).cssVar
    )
  });

  const byHue = (a: PrimitiveFamily, b: PrimitiveFamily) =>
    a.hue - b.hue || a.saturation - b.saturation;

  const primitiveRegisters = [
    {
      key: 'vivid',
      label: 'vivid',
      chips: primitivePalette.families
        .filter((f) => f.saturation >= MUTED_MAX_SATURATION)
        .toSorted(byHue)
        .map(toChip)
    },
    {
      key: 'muted',
      label: 'muted',
      chips: primitivePalette.families
        .filter((f) => f.saturation < MUTED_MAX_SATURATION)
        .toSorted(byHue)
        .map(toChip)
    }
  ].filter((r) => r.chips.length > 0);

  const familyCount = primitivePalette.families.length;
</script>

<ReferenceLayout
  title="Color"
  description="The zebkit color system: primitive palette, semi-semantic ramps, and semantic roles."
>
  <h1 class="page-title">Color</h1>
  <p class="lede">
    Color in zebkit is layered. Raw <strong>primitives</strong> feed
    <strong>semi-semantic ramps</strong>, which feed <strong>semantic roles</strong>. Components only
    ever reference the semantic layer, so re-theming is a matter of remapping tokens — never editing
    component internals.
  </p>

  <ol class="strata">
    <li>
      <span class="strata-num">1</span>
      <div>
        <h3>Primitive palette</h3>
        <p>
          Hue + saturation families generated across eleven lightness steps
          (<code>--zbk-color-blue-500</code>). The raw material; not used directly in components.
        </p>
      </div>
    </li>
    <li>
      <span class="strata-num">2</span>
      <div>
        <h3>Semi-semantic ramps</h3>
        <p>
          Named eleven-step ramps that alias primitives — <code>brand</code>,
          <code>accent-primary</code>, <code>accent-secondary</code>, <code>neutral</code>.
        </p>
      </div>
    </li>
    <li>
      <span class="strata-num">3</span>
      <div>
        <h3>Semantic roles</h3>
        <p>
          Role-shaped families — <code>canvas</code>, <code>ink</code>, <code>border</code> with
          intensity and inverse variants. What components actually consume.
        </p>
      </div>
    </li>
  </ol>

  <section class="block">
    <div class="block-head">
      <h2>Primitive palette</h2>
      <a class="more" href="/foundations/color/primitives">View all {familyCount} families →</a>
    </div>
    {#each primitiveRegisters as register (register.key)}
      <div class="teaser-group">
        <span class="teaser-label">{register.label}</span>
        <div class="teaser">
          {#each register.chips as chip (chip.name)}
            <a class="chip" href={`/foundations/color/primitives#family-${chip.name}`}>
              <span class="chip-bands" aria-hidden="true">
                {#each chip.bands as band (band)}
                  <span style={`background: var(${band})`}></span>
                {/each}
              </span>
              <span class="chip-name">{chip.name}</span>
              <span class="chip-meta">{chip.hue}&deg; &middot; {chip.saturation}%</span>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </section>

  <section class="block">
    <h2>Semi-semantic ramps</h2>
    <div class="cards">
      {#each colorFamilies as f (f.family)}
        <a class="card" href={`/foundations/color/${f.family}`}>
          <span class="card-name">{f.family}</span>
          <span class="card-strip">
            {#each f.steps as step (step.step)}
              <span style="background: var({step.cssVar})"></span>
            {/each}
          </span>
        </a>
      {/each}
    </div>
  </section>

  <section class="block">
    <h2>Semantic families</h2>
    <div class="cards">
      {#each semanticColorFamilies as f (f.family)}
        <a class="card" href={`/foundations/color/${f.family}`}>
          <span class="card-name">{f.family}</span>
          <span class="card-strip">
            <span style="background: var(--{f.key}-canvas)"></span>
            <span style="background: var(--{f.key}-canvas-subtle)"></span>
            <span style="background: var(--{f.key}-ink)"></span>
            <span style="background: var(--{f.key}-border)"></span>
            <span style="background: var(--{f.key}-canvas-emphasis)"></span>
          </span>
        </a>
      {/each}
    </div>
  </section>
</ReferenceLayout>

<style>
  .page-title {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin: 0 0 var(--zbk-spacing-1);
  }

  .lede {
    color: var(--zbk-app-ink-subtle);
    max-width: var(--zbk-text-measure-3, 65ch);
    margin: 0 0 var(--zbk-spacing-4);
  }
  .strata code {
    font-family: var(--zbk-font-family-code);
    font-size: 0.9em;
  }

  .strata {
    list-style: none;
    margin: 0 0 var(--zbk-spacing-6);
    padding: 0;
    display: grid;
    gap: var(--zbk-spacing-2);
  }
  .strata li {
    display: flex;
    gap: var(--zbk-spacing-2);
    align-items: flex-start;
  }
  .strata-num {
    flex: none;
    width: var(--zbk-spacing-105, 1.5rem);
    height: var(--zbk-spacing-105, 1.5rem);
    display: grid;
    place-items: center;
    border-radius: var(--zbk-border-radius-full, 999px);
    background: var(--zbk-accent-primary-100);
    color: var(--zbk-accent-primary-700);
    font-family: var(--zbk-font-family-code);
    font-weight: var(--zbk-font-weight-bold);
    font-size: var(--zbk-font-size-xs);
  }
  .strata h3 {
    margin: 0;
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-md);
  }
  .strata p {
    margin: var(--zbk-spacing-025) 0 0;
    color: var(--zbk-app-ink-subtle);
  }

  .block {
    margin-bottom: var(--zbk-spacing-6);
  }
  .block h2 {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-lg);
    margin: 0 0 var(--zbk-spacing-2);
  }
  .block-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--zbk-spacing-2);
    margin-bottom: var(--zbk-spacing-2);
  }
  .block-head h2 {
    margin: 0;
  }
  .more {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    color: var(--zbk-accent-primary-600);
    text-decoration: none;
  }
  .more:hover {
    text-decoration: underline;
  }

  .teaser-group {
    margin-bottom: var(--zbk-spacing-2);
  }
  .teaser-label {
    display: block;
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    text-transform: uppercase;
    letter-spacing: var(--zbk-letter-spacing-2, 0.05em);
    color: var(--zbk-app-ink-muted);
    margin-bottom: var(--zbk-spacing-05);
  }
  .teaser {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: var(--zbk-spacing-05);
  }
  .chip {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    border-radius: var(--zbk-border-radius-sm);
  }
  .chip-bands {
    display: flex;
    height: var(--zbk-spacing-205, 2.5rem);
    border-radius: var(--zbk-border-radius-sm);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    overflow: hidden;
  }
  .chip-bands span {
    flex: 1;
  }
  .chip-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-xs);
    font-weight: var(--zbk-font-weight-semibold);
    color: var(--zbk-app-ink);
    margin-top: var(--zbk-spacing-05);
  }
  .chip-meta {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-2xs);
    color: var(--zbk-app-ink-muted);
  }
  .chip:hover .chip-bands {
    border-color: var(--zbk-app-border-emphasis);
  }
  .chip:hover .chip-name {
    text-decoration: underline;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: var(--zbk-spacing-2);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--zbk-spacing-1);
    padding: var(--zbk-spacing-2);
    border-radius: var(--zbk-border-radius-sm);
    border: var(--zbk-border-width-xs) solid var(--zbk-app-border);
    text-decoration: none;
    color: var(--zbk-app-ink);
  }
  .card:hover {
    border-color: var(--zbk-app-border-emphasis);
    background: var(--zbk-app-canvas-subtle);
  }
  .card-name {
    font-family: var(--zbk-font-family-code);
    font-size: var(--zbk-font-size-sm);
    font-weight: var(--zbk-font-weight-semibold);
  }
  .card-strip {
    display: flex;
    height: var(--zbk-spacing-3, 1rem);
    border-radius: var(--zbk-border-radius-xs);
    overflow: hidden;
  }
  .card-strip span {
    flex: 1;
  }
</style>
