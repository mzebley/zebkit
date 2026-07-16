<script lang="ts">
  import { setFontScale } from '$lib/stores/theme.svelte';
  import '../../styles/editorial.css';

  let fontScaleValue = 1;
</script>

<div style="padding: var(--zbk-spacing-4);">
  <h1 style="font-family: var(--zbk-font-family-alt);">Styleguide</h1>

  <section style="margin-bottom: var(--zbk-spacing-5);">
    <h2>Typography Tokens</h2>
    <p>Fonts are wired from self-hosted files.</p>

    <div
      style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--zbk-spacing-3);
        margin-top: var(--zbk-spacing-3);
      "
    >
      <div style="border: 1px solid var(--zbk-app-border-muted); padding: var(--zbk-spacing-2);">
        <p style="font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink-soft);">Display/Headings</p>
        <p style="font-family: var(--zbk-font-family-alt); font-size: var(--zbk-font-size-2xl);">Instrument Serif</p>
      </div>

      <div style="border: 1px solid var(--zbk-app-border-muted); padding: var(--zbk-spacing-2);">
        <p style="font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink-soft);">Body/Secondary</p>
        <p style="font-family: var(--zbk-font-family-primary); font-size: var(--zbk-font-size-base);">
          Newsreader
        </p>
      </div>

      <div style="border: 1px solid var(--zbk-app-border-muted); padding: var(--zbk-spacing-2);">
        <p style="font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink-soft);">Monospace/Code</p>
        <p style="font-family: var(--zbk-font-family-code); font-size: var(--zbk-font-size-sm);">Space Mono</p>
      </div>

      <div style="border: 1px solid var(--zbk-app-border-muted); padding: var(--zbk-spacing-2);">
        <p style="font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink-soft);">A11y High-Legibility</p>
        <p style="font-family: 'Atkinson Hyperlegible Next', sans-serif; font-size: var(--zbk-font-size-base);">
          Atkinson
        </p>
      </div>
    </div>
  </section>

  <section style="margin-bottom: var(--zbk-spacing-5);">
    <h2>Color Tokens</h2>
    <p>Warm canvas and ink via zebkit tokens.</p>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--zbk-spacing-3); margin-top: var(--zbk-spacing-3);">
      <div
        style="
          padding: var(--zbk-spacing-3);
          background: var(--zbk-app-canvas);
          border: 1px solid var(--zbk-app-border-muted);
        "
      >
        <p style="margin: 0; font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink);">
          Canvas: var(--zbk-app-canvas)
        </p>
      </div>

      <div
        style="
          padding: var(--zbk-spacing-3);
          background: var(--zbk-app-canvas-muted);
          border: 1px solid var(--zbk-app-border-muted);
        "
      >
        <p style="margin: 0; font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink);">
          Canvas Muted: var(--zbk-app-canvas-muted)
        </p>
      </div>

      <div
        style="
          padding: var(--zbk-spacing-3);
          background: var(--zbk-app-canvas-soft);
          border: 1px solid var(--zbk-app-border-muted);
        "
      >
        <p style="margin: 0; font-size: var(--zbk-font-size-sm); color: var(--zbk-app-ink);">
          Canvas Soft: var(--zbk-app-canvas-soft)
        </p>
      </div>
    </div>
  </section>

  <section style="margin-bottom: var(--zbk-spacing-5);">
    <h2>A11y Controls</h2>
    <p>Test the a11y dials — font scale should enlarge text site-wide.</p>

    <div style="display: flex; gap: var(--zbk-spacing-2); align-items: center; margin-top: var(--zbk-spacing-2);">
      <label>
        Font Scale:
        <input
          type="range"
          min="0.8"
          max="1.5"
          step="0.1"
          bind:value={fontScaleValue}
          on:change={() => setFontScale(fontScaleValue)}
          style="margin-left: var(--zbk-spacing-1);"
        />
      </label>
      <span style="font-family: var(--zbk-font-family-code);">{fontScaleValue.toFixed(1)}</span>
    </div>
  </section>

  <section style="margin-bottom: var(--zbk-spacing-5);">
    <h2>Editorial Grid (with Marginalia)</h2>
    <p>Two-column layout on wide screens, single column on mobile.</p>

    <div class="editorial-root" style="margin-top: var(--zbk-spacing-3);">
      <div class="editorial-main">
        <h3>Main Content</h3>
        <p>
          This is a test of the editorial grid. The main column is constrained to a comfortable reading measure
          (65 characters) using <code>max-inline-size</code> bound to a zebkit token. Baseline rhythm is maintained
          through line-height modifiers.
        </p>

        <h4>Heading Level 4</h4>
        <p>
          Paragraphs respect the baseline grid by using consistent margin-block-end values tied to
          <code>--editorial-gap</code>, which is itself a zebkit spacing token.
        </p>

        <p>
          On wider screens (75rem+), the marginalia column appears to the right. On mobile, it stacks below.
        </p>

        <pre><code>{`const example = () => {
  return "All values are token-bound";
};`}</code></pre>
      </div>

      <aside class="editorial-marginalia">
        <p><strong>Sidenote:</strong> This marginalia section uses the same token system. Font size, line-height, and color all bind to zebkit tokens.</p>
      </aside>
    </div>
  </section>

  <section>
    <h2>Next Steps</h2>
    <p>
      This styleguide verifies T1.1–T1.4 are working:
    </p>
    <ul>
      <li><strong>T1.1:</strong> Fonts load from self-hosted files ✓</li>
      <li><strong>T1.2:</strong> Typography tokens wired to fonts, warm canvas/ink active ✓</li>
      <li><strong>T1.3:</strong> A11y dials move tokens (drag font-scale slider above) ✓</li>
      <li><strong>T1.4:</strong> Editorial grid with marginalia, all token-bound ✓</li>
    </ul>
  </section>
</div>

<style>
  h2 {
    font-family: var(--zbk-font-family-alt);
    font-size: var(--zbk-font-size-2xl);
    margin-top: var(--zbk-spacing-4);
  }
</style>
