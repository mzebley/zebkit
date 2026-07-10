// Shared screen-reader announcer.
//
// One pair of visually-hidden ARIA live regions (polite + assertive) is lazily
// mounted on <body> and reused by every caller — components never create
// private live regions (GRAMMAR.md §8). Import `announce` from anywhere and
// call it; no per-component live-region markup required.
//
//   announce("Link copied to clipboard");
//   announce("Upload failed", { urgency: "assertive" });
//
// Emptying the region before each message guarantees a repeated identical
// string is registered as a change and re-announced; the message auto-clears a
// moment later so stale text isn't read by someone who navigates to it.

export type Urgency = 'polite' | 'assertive';

export interface AnnounceOptions {
  /** "assertive" interrupts the user — reserve it for errors / time-sensitive info. */
  urgency?: Urgency;
  /** ms to keep the message in the region before wiping it (default 1000). */
  clearAfter?: number;
}

interface Region {
  el: HTMLElement;
  setTimer?: ReturnType<typeof setTimeout>;
  clearTimer?: ReturnType<typeof setTimeout>;
}

const regions: Partial<Record<Urgency, Region>> = {};

function getRegion(urgency: Urgency): Region {
  let region = regions[urgency];
  if (!region) {
    const el = document.createElement('div');
    // Visually hidden, inline: the announcer must work before (or without) any
    // zebkit stylesheet, so this is structural CSS, not a visual decision.
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    // role implies aria-live + aria-atomic, but set both explicitly so the
    // intent survives any future markup changes.
    el.setAttribute('role', urgency === 'assertive' ? 'alert' : 'status');
    el.setAttribute('aria-live', urgency);
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
    region = { el };
    regions[urgency] = region;
  }
  return region;
}

/** Announce `message` to assistive tech via the shared live region. */
export function announce(message: string, options: AnnounceOptions = {}): void {
  if (typeof document === 'undefined' || !message) return;
  const { urgency = 'polite', clearAfter = 1000 } = options;
  const region = getRegion(urgency);

  clearTimeout(region.setTimer);
  clearTimeout(region.clearTimer);

  // Empty first, then write on the next tick: a live region only announces on
  // change, so this makes back-to-back identical messages speak again.
  region.el.textContent = '';
  region.setTimer = setTimeout(() => {
    region.el.textContent = message;
    region.clearTimer = setTimeout(() => {
      region.el.textContent = '';
    }, clearAfter);
  }, 50);
}

/** Remove the mounted live regions (handy for tests / teardown). */
export function resetAnnouncer(): void {
  for (const key of Object.keys(regions) as Urgency[]) {
    const region = regions[key];
    if (!region) continue;
    clearTimeout(region.setTimer);
    clearTimeout(region.clearTimer);
    region.el.remove();
    delete regions[key];
  }
}
