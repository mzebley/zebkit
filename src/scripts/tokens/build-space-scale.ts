import chalk from "chalk";
import { ZEBKIT_PREFIX } from "@config";
import type { TokenInterface, TokenObject } from "@definitions/tokens";

/**
 * Resolves the spacing scale into emittable tokens — the spacing counterpart to
 * `resolveTypeScale`.
 *
 * Each spacing primitive (`type: "rootSize"`) carries its size at the MIN (mobile) viewport
 * anchor as `value` — a guaranteed floor that never shrinks below what was authored; this pass
 * derives the max-anchor size (`value × growth`) and fits a fluid `clamp()` across the anchors
 * shared with the font scale. `growth` is per-token: a continuous log curve (see `curveGrowth`)
 * positions each floor by magnitude so micro gaps stay flat while large layout spacing blooms
 * toward the `max-scale` ceiling — no manual tiering, classification emerges from the rem value.
 * A token may pin its own `growth` to bypass the curve. The result is multiplied by two runtime
 * forces:
 *
 *   × var(--zbk-a11y-spacing-modifier)                               (independent density)
 *   × (1 + (var(--zbk-a11y-font-size-modifier-md) - 1) · var(--zbk-a11y-spacing-text-coupling))
 *                                                                    (follows body text size)
 *
 * Precision px tokens skip the viewport interpolation (fluidizing a 1px hairline is nonsense)
 * but still get the density + coupling multiplier — every spacing token, rem or px, honors the
 * runtime a11y dials. Only `0` is emitted exact (scaling zero is pointless). Semantic spacing
 * aliases are `type: "spacing"` with `{…}` references and pass through untouched — they resolve
 * to the primitive var, which already carries the fluid + coupling behavior.
 *
 * Viewport anchors are read from the font-size module so type and space share one
 * responsive rhythm; run this BEFORE `resolveTypeScale` strips those settings (or it falls
 * back to the same defaults). Runs on a copy so exported token artifacts keep their
 * authorable form.
 */

const ROOT_PX = 16;
const DEFAULT_MIN_VIEWPORT_PX = 360;
const DEFAULT_MAX_VIEWPORT_PX = 1240;
const DEFAULT_MAX_SCALE = 1.25;

// Continuous growth-curve anchors (rem). These are deliberately HIDDEN builder constants,
// NOT token settings: the whole point of the curve is that an author sets a single
// `max-scale` ceiling (how much the largest layout tokens bloom on wide screens) and never
// has to reason about per-token curve shape. A token's growth is derived from its floor
// magnitude on a log curve between these anchors — floors at/below MICRO stay flat (no
// viewport growth; their authored value is already the right size for touch/micro gaps),
// floors at/above MACRO reach the full `max-scale`. The anchors are FIXED absolute sizes
// (never derived from the token set) so adding a new spacing token can never re-curve its
// neighbors. If author control over the curve shape is ever needed, promote these to
// optional `micro-anchor` / `macro-anchor` settings.
const MICRO_ANCHOR_REM = 0.5;
const MACRO_ANCHOR_REM = 16;

const SPACING_KEY = `${ZEBKIT_PREFIX}-spacing`;
const FONT_SIZE_KEY = `${ZEBKIT_PREFIX}-font-size`;

const DENSITY_VAR = `--${ZEBKIT_PREFIX}-a11y-spacing-modifier`;
const MD_FONT_MODIFIER_VAR = `--${ZEBKIT_PREFIX}-a11y-font-size-modifier-md`;
const COUPLING_VAR = `--${ZEBKIT_PREFIX}-a11y-spacing-text-coupling`;

export type SpaceScaleMode = "fluid" | "static";

export interface ResolveSpaceScaleOptions {
  /** "fluid" (default) generates clamps; "static" drops the viewport interpolation. */
  mode?: SpaceScaleMode;
}

interface SpaceControls {
  minViewportPx: number;
  maxViewportPx: number;
  maxScale: number;
}

function r(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function toPx(value: string | number): number {
  if (typeof value === "number") return value;
  const v = value.trim();
  if (v.endsWith("rem")) return parseFloat(v) * ROOT_PX;
  return parseFloat(v);
}

function readControls(tokens: Record<string, TokenInterface>): SpaceControls {
  const font = tokens[FONT_SIZE_KEY];
  const spacing = tokens[SPACING_KEY];
  const minVp = font?.["min-viewport"]?.$value;
  const maxVp = font?.["max-viewport"]?.$value;
  const maxScale = spacing?.["max-scale"]?.$value;

  return {
    minViewportPx: minVp != null ? toPx(minVp) : DEFAULT_MIN_VIEWPORT_PX,
    maxViewportPx: maxVp != null ? toPx(maxVp) : DEFAULT_MAX_VIEWPORT_PX,
    maxScale: maxScale != null ? Number(maxScale) : DEFAULT_MAX_SCALE,
  };
}

/** ` * density * coupling` suffix applied to each clamp term. */
function multiplier(): string {
  return (
    ` * var(${DENSITY_VAR})` +
    ` * (1 + (var(${MD_FONT_MODIFIER_VAR}) - 1) * var(${COUPLING_VAR}))`
  );
}

/**
 * Per-token growth multiplier from the continuous log curve. The authored floor's magnitude
 * positions it between MICRO and MACRO anchors; micro floors stay flat (×1), macro floors
 * reach the full `max-scale` ceiling, everything between rides a smooth log ramp. `|floor|`
 * is used so negative tokens grow like their positive twin.
 */
function curveGrowth(floorRem: number, maxScale: number): number {
  const mag = Math.abs(floorRem);
  if (mag <= MICRO_ANCHOR_REM) return 1;
  const t = Math.min(
    1,
    (Math.log(mag) - Math.log(MICRO_ANCHOR_REM)) /
      (Math.log(MACRO_ANCHOR_REM) - Math.log(MICRO_ANCHOR_REM))
  );
  return 1 + (maxScale - 1) * t;
}

/**
 * Builds the fluid `clamp()` for one spacing token. `baseRem` is the authored mobile floor;
 * the max anchor is `floor × growth`, where growth is the per-token curve value unless an
 * explicit `growthOverride` pins it.
 */
function buildFluidValue(
  baseRem: number,
  c: SpaceControls,
  growthOverride?: number
): string {
  const growth = growthOverride ?? curveGrowth(baseRem, c.maxScale);
  const minRem = baseRem;
  const maxRem = baseRem * growth;
  const minW = c.minViewportPx / ROOT_PX;
  const maxW = c.maxViewportPx / ROOT_PX;

  const lo = Math.min(minRem, maxRem);
  const hi = Math.max(minRem, maxRem);
  const m = multiplier();

  // Flat token (micro floor → growth 1, or a degenerate viewport range): no interpolation
  // to emit, so collapse to a single calc instead of a same-bounds clamp.
  if (maxRem === minRem || maxW === minW) {
    return `calc(${r(minRem)}rem${m})`;
  }

  const slope = (maxRem - minRem) / (maxW - minW);
  const intercept = minRem - slope * minW;
  const preferred = `${r(intercept)}rem + ${r(slope * 100)}vw`;

  return `clamp(calc(${r(lo)}rem${m}), calc((${preferred})${m}), calc(${r(hi)}rem${m}))`;
}

/** Resolves a single rootSize primitive's value (rem → fluid; px/0 → exact). */
function resolveValue(
  raw: string | number,
  c: SpaceControls,
  mode: SpaceScaleMode,
  growthOverride?: number
): string {
  if (typeof raw === "string" && raw.trim().startsWith("{")) return String(raw);

  const v = String(raw).trim();
  if (v === "0" || v === "0px") return "0";
  // Precision/non-rem values skip the viewport interpolation — fluidizing a 1px hairline
  // is nonsense — but they STILL get the a11y multiplier. Every spacing token (rem or px)
  // honors the runtime density + text-coupling dials; that the unit happens to be px must
  // not opt it out of the end user's accessibility controls.
  if (!v.endsWith("rem")) {
    return `calc(${v}${multiplier()})`;
  }

  const baseRem = parseFloat(v);
  if (mode === "static") {
    return `calc(${r(baseRem)}rem${multiplier()})`;
  }
  return buildFluidValue(baseRem, c, growthOverride);
}

/**
 * Returns a new token map with the spacing scale resolved. If the spacing module is absent,
 * the input is returned unchanged.
 */
export function resolveSpaceScale(
  tokens: Record<string, TokenInterface>,
  options: ResolveSpaceScaleOptions = {}
): Record<string, TokenInterface> {
  const mode = options.mode ?? "fluid";
  const module = tokens[SPACING_KEY];
  if (!module) return tokens;

  const controls = readControls(tokens);
  if (!Number.isFinite(controls.maxScale) || controls.maxScale <= 0) {
    console.warn(
      chalk.yellow(
        `Spacing max-scale is invalid (${controls.maxScale}); falling back to ${DEFAULT_MAX_SCALE}.`
      )
    );
    controls.maxScale = DEFAULT_MAX_SCALE;
  }

  const resolvedModule: TokenInterface = {};
  for (const [name, entry] of Object.entries(module)) {
    // Strip the build-time control — it must not become a CSS variable.
    if (name === "max-scale") continue;

    if (!entry || entry.$type !== "rootSize" || !("$value" in entry)) {
      resolvedModule[name] = entry;
      continue;
    }

    // Optional per-token escape hatch: `growth` pins this token's max-anchor multiplier,
    // bypassing the curve. Absent on every normal token (the curve handles them) and
    // consumed here — it is not re-emitted, so it never leaks to a CSS variable.
    const growthOverride = (entry as { growth?: number }).growth;
    const value = resolveValue(
      entry.$value as string | number,
      controls,
      mode,
      growthOverride
    );
    resolvedModule[name] = {
      $value: value,
      $type: "rootSize",
      $description: entry.$description,
    } as TokenObject;
  }

  return { ...tokens, [SPACING_KEY]: resolvedModule };
}
