// Panel state for the responsive shell. The left nav and the inspector are
// persistent chrome on wide viewports and summoned overlays on narrow ones;
// these flags are what the TopBar triggers toggle and the Overlay vessels read.
// Kept separate from theme/viewport so a panel open-state never entangles with
// a11y tokens or the breakpoint regime.

// Collapsed-column preference persists across reloads — a panel you tucked away
// should stay tucked. (navOpen/inspectOpen are transient overlay state, NOT
// persisted; collapse is a deliberate, sticky layout choice.)
const STORAGE_KEY = 'zbk-docs-panels';

function loadCollapsed(): { nav: boolean; inspect: boolean } {
  if (typeof localStorage === 'undefined') return { nav: false, inspect: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { nav: !!v.nav, inspect: !!v.inspect };
    }
  } catch {
    // ignore malformed/blocked storage
  }
  return { nav: false, inspect: false };
}

const initialCollapsed = loadCollapsed();

export const ui = $state({
  navOpen: false,
  inspectOpen: false,
  // Set true while an InstrumentShell is mounted, so the TopBar only offers the
  // inspect toggle on pages that actually have an inspector.
  inspectAvailable: false,
  // Collapsed-rail preferences for the persistent column panels (full/reading
  // for nav, full for inspector). When collapsed the panel becomes a thin rail
  // that peeks open on hover/focus.
  navCollapsed: initialCollapsed.nav,
  inspectCollapsed: initialCollapsed.inspect,
  // Transient "peek the inspector rail" request, raised while the user is
  // engaging an inspectable token/class in the content (hover, focus, or a
  // fresh pin). Only the collapsed inspector CollapsiblePanel honors it — it's
  // inert when the rail is expanded or living in a drawer/sheet. Not persisted.
  inspectPeek: false,
});

function persistCollapsed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ nav: ui.navCollapsed, inspect: ui.inspectCollapsed })
    );
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function toggleNavCollapsed() {
  ui.navCollapsed = !ui.navCollapsed;
  persistCollapsed();
}

export function toggleInspectCollapsed() {
  ui.inspectCollapsed = !ui.inspectCollapsed;
  persistCollapsed();
}

export function toggleNav() {
  ui.navOpen = !ui.navOpen;
}

export function closeNav() {
  ui.navOpen = false;
}

export function toggleInspect() {
  ui.inspectOpen = !ui.inspectOpen;
}

export function openInspect() {
  ui.inspectOpen = true;
}

export function closeInspect() {
  ui.inspectOpen = false;
}

// Peek control for the collapsed inspector rail. The content's inspectable
// affordances raise/release these as you hover/focus/leave them; the rail's
// CollapsiblePanel translates the flag into its own show/hide (with the same
// delay that smooths the gap between an affordance and the peeked panel).
export function requestInspectPeek() {
  ui.inspectPeek = true;
}

export function releaseInspectPeek() {
  ui.inspectPeek = false;
}
