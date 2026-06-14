import chalk from "chalk";
import { ZEBKIT_PREFIX } from "@config";
import type { TokenInterface, TokenObject } from "@definitions/tokens";

/**
 * Resolves the spacing scale into emittable tokens — the spacing counterpart to
 * `resolveTypeScale`.
 *
 * Each spacing primitive (`type: "rootSize"`) carries its size at the MAX viewport anchor
 * as `value`; this pass derives the min-anchor size (`value × min-scale`), fits a fluid
 * `clamp()` across the anchors shared with the font scale, and multiplies in two runtime
 * forces:
 *
 *   × var(--zbk-a11y-spacing-modifier)                               (independent density)
 *   × (1 + (var(--zbk-a11y-font-size-modifier-md) - 1) · var(--zbk-a11y-spacing-text-coupling))
 *                                                                    (follows body text size)
 *
 * Precision px tokens and `0` are emitted exact (no scaling). Semantic spacing aliases are
 * `type: "spacing"` with `{…}` references and pass through untouched — they resolve to the
 * primitive var, which already carries the fluid + coupling behavior.
 *
 * Viewport anchors are read from the font-size module so type and space share one
 * responsive rhythm; run this BEFORE `resolveTypeScale` strips those settings (or it falls
 * back to the same defaults). Runs on a copy so exported token artifacts keep their
 * authorable form.
 */

const ROOT_PX = 16;
const DEFAULT_MIN_VIEWPORT_PX = 360;
const DEFAULT_MAX_VIEWPORT_PX = 1240;
const DEFAULT_MIN_SCALE = 0.85;

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
  minScale: number;
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
  const minVp = font?.["min-viewport"]?.value;
  const maxVp = font?.["max-viewport"]?.value;
  const minScale = spacing?.["min-scale"]?.value;

  return {
    minViewportPx: minVp != null ? toPx(minVp) : DEFAULT_MIN_VIEWPORT_PX,
    maxViewportPx: maxVp != null ? toPx(maxVp) : DEFAULT_MAX_VIEWPORT_PX,
    minScale: minScale != null ? Number(minScale) : DEFAULT_MIN_SCALE,
  };
}

/** ` * density * coupling` suffix applied to each clamp term. */
function multiplier(): string {
  return (
    ` * var(${DENSITY_VAR})` +
    ` * (1 + (var(${MD_FONT_MODIFIER_VAR}) - 1) * var(${COUPLING_VAR}))`
  );
}

function buildFluidValue(baseRem: number, c: SpaceControls): string {
  const minRem = baseRem * c.minScale;
  const maxRem = baseRem;
  const minW = c.minViewportPx / ROOT_PX;
  const maxW = c.maxViewportPx / ROOT_PX;

  const lo = Math.min(minRem, maxRem);
  const hi = Math.max(minRem, maxRem);
  const m = multiplier();

  if (maxW === minW) {
    return `calc(${r(maxRem)}rem${m})`;
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
  mode: SpaceScaleMode
): string {
  if (typeof raw === "string" && raw.trim().startsWith("{")) return String(raw);

  const v = String(raw).trim();
  if (v === "0" || v === "0px") return "0";
  // Precision/non-rem values stay exact — fluidizing a 1px hairline is nonsense.
  if (!v.endsWith("rem")) return v;

  const baseRem = parseFloat(v);
  if (mode === "static") {
    return `calc(${r(baseRem)}rem${multiplier()})`;
  }
  return buildFluidValue(baseRem, c);
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
  if (!Number.isFinite(controls.minScale) || controls.minScale <= 0) {
    console.warn(
      chalk.yellow(
        `Spacing min-scale is invalid (${controls.minScale}); falling back to ${DEFAULT_MIN_SCALE}.`
      )
    );
    controls.minScale = DEFAULT_MIN_SCALE;
  }

  const resolvedModule: TokenInterface = {};
  for (const [name, entry] of Object.entries(module)) {
    // Strip the build-time control — it must not become a CSS variable.
    if (name === "min-scale") continue;

    if (!entry || entry.type !== "rootSize" || !("value" in entry)) {
      resolvedModule[name] = entry;
      continue;
    }

    const value = resolveValue(entry.value as string | number, controls, mode);
    resolvedModule[name] = {
      value,
      type: "rootSize",
      description: entry.description,
    } as TokenObject;
  }

  return { ...tokens, [SPACING_KEY]: resolvedModule };
}
