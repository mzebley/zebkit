<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  // Thin Svelte wrapper over the <zbk-button> custom element.
  //
  // Why it exists: <zbk-button> renders a real <button> in light DOM, so it's a
  // genuine interactive control (native Enter/Space activation, button role). But
  // Svelte's a11y checker treats every hyphenated custom element as static and
  // non-interactive, so attaching `onclick` trips `a11y_click_events_have_key_events`
  // and `a11y_no_static_element_interactions`. The rule can't be taught about
  // custom elements, so this component owns the (correct) suppression once and
  // gives call sites typed props + event forwarding. Reach for the raw element
  // only for non-interactive, decorative buttons.
  //
  //   <ZbkButton variant="outline lg" onclick={save}>Save draft</ZbkButton>

  type Props = HTMLButtonAttributes & {
    /** Structural recipe(s) on the style/size axes, space-separated (e.g. "outline lg"). */
    variant?: string;
    /** Busy state — announces via aria-busy, suppresses activation, keeps focus. */
    loading?: boolean;
    /** Label content (its accessible name); may include a `slot="icon"` child. */
    children: Snippet;
    /** Bindable ref to the underlying <zbk-button> element. */
    element?: HTMLElement;
  };

  let { children, element = $bindable(), ...rest }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<zbk-button bind:this={element} {...rest}>
  {@render children()}
</zbk-button>
