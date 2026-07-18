import chalk from "chalk";
import { ZEBKIT_PREFIX } from "@config";
import { a11yMap } from "@definitions/a11y-map";
import { tokenA11y } from "@definitions/tokens";
import type {
  RootFontSizeStepObject,
  SettingTokenObject,
  TokenInterface,
} from "@definitions/tokens";

/**
 * Resolves the generated font-size scale into emittable tokens.
 *
 * The `font-size` module ships as six control settings (min/max viewport, base, ratio)
 * plus named steps that carry an `index` instead of a literal value. This pass turns each
 * step into a concrete CSS value — a Utopia-style fluid `clamp()` (default) or a static
 * literal (opt-in) — bakes in the per-step a11y modifier, and strips the control settings
 * so they never leak as CSS variables.
 *
 * It runs AFTER token overrides are merged and BEFORE `convertTokensToCssVars`, operating
 * on a copy so exported token artifacts keep their authorable (index + settings) form.
 */

const ROOT_PX = 16;
const FONT_SIZE_KEY = `${ZEBKIT_PREFIX}-font-size`;

const CONTROL_KEYS = [
  "min-viewport",
  "max-viewport",
  "min-base",
  "max-base",
  "min-ratio",
  "max-ratio",
] as const;

export type TypeScaleMode = "fluid" | "static";

export interface ResolveTypeScaleOptions {
  /** "fluid" (default) generates clamps; "static" emits each step's authored literal. */
  mode?: TypeScaleMode;
}

interface FluidControls {
  minViewportPx: number;
  maxViewportPx: number;
  minBaseRem: number;
  maxBaseRem: number;
  minRatio: number;
  maxRatio: number;
}

/** Round to 4 decimals to keep emitted clamps tidy. */
function r(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Parse a length to px. Accepts "360px", "22.5rem", or a bare number (assumed px). */
function toPx(value: string | number): number {
  if (typeof value === "number") return value;
  const v = value.trim();
  if (v.endsWith("rem")) return parseFloat(v) * ROOT_PX;
  if (v.endsWith("px")) return parseFloat(v);
  return parseFloat(v);
}

/** Parse a length to rem. Accepts "1.125rem", "18px", or a bare number (assumed rem). */
function toRem(value: string | number): number {
  if (typeof value === "number") return value;
  const v = value.trim();
  if (v.endsWith("rem")) return parseFloat(v);
  if (v.endsWith("px")) return parseFloat(v) / ROOT_PX;
  return parseFloat(v);
}

function readControls(module: TokenInterface): FluidControls | null {
  const get = (k: string): SettingTokenObject | undefined =>
    module[k] as SettingTokenObject | undefined;
  const settings = CONTROL_KEYS.map((k) => get(k));
  if (settings.some((s) => !s || s.$value == null)) return null;

  return {
    minViewportPx: toPx(get("min-viewport")!.$value),
    maxViewportPx: toPx(get("max-viewport")!.$value),
    minBaseRem: toRem(get("min-base")!.$value),
    maxBaseRem: toRem(get("max-base")!.$value),
    minRatio: Number(get("min-ratio")!.$value),
    maxRatio: Number(get("max-ratio")!.$value),
  };
}

/**
 * Builds the fluid `clamp()` for one step. Bounds are ordered by magnitude (not by
 * anchor) so steps below the base — where the small-viewport size exceeds the
 * large-viewport size — interpolate smoothly instead of pinning to the larger bound.
 */
function buildFluidValue(
  index: number,
  c: FluidControls,
  a11y: string | null
): string {
  const minSize = c.minBaseRem * Math.pow(c.minRatio, index);
  const maxSize = c.maxBaseRem * Math.pow(c.maxRatio, index);
  const minW = c.minViewportPx / ROOT_PX;
  const maxW = c.maxViewportPx / ROOT_PX;

  const lo = Math.min(minSize, maxSize);
  const hi = Math.max(minSize, maxSize);
  const wrap = (expr: string) => (a11y ? `calc(${expr} * var(${a11y}))` : expr);

  if (maxW === minW) {
    // Degenerate range: no fluidity possible, emit the (a11y-scaled) base size.
    return wrap(`${r(lo)}rem`);
  }

  const slope = (maxSize - minSize) / (maxW - minW);
  const intercept = minSize - slope * minW;
  const preferred = `${r(intercept)}rem + ${r(slope * 100)}vw`;

  return `clamp(${wrap(`${r(lo)}rem`)}, ${wrap(`(${preferred})`)}, ${wrap(
    `${r(hi)}rem`
  )})`;
}

function buildStaticValue(value: string | number, a11y: string | null): string {
  return a11y ? `calc(${value} * var(${a11y}))` : `${value}`;
}

function stepA11yVar(step: RootFontSizeStepObject): string | null {
  const a11y = tokenA11y(step);
  if (typeof a11y === "string") return a11y;
  if (a11y === true) return a11yMap.fontSize;
  return null;
}

/**
 * Returns a new token map with the font-size scale resolved. If the module is absent or
 * lacks a recognizable scale, the input is returned unchanged.
 */
export function resolveTypeScale(
  tokens: Record<string, TokenInterface>,
  options: ResolveTypeScaleOptions = {}
): Record<string, TokenInterface> {
  const mode = options.mode ?? "fluid";
  const module = tokens[FONT_SIZE_KEY];
  if (!module) return tokens;

  const controls = readControls(module);
  if (mode === "fluid" && !controls) {
    console.warn(
      chalk.yellow(
        "Fluid type scale requested but font-size control settings are incomplete. Leaving font sizes unresolved."
      )
    );
    return tokens;
  }

  const control = new Set<string>(CONTROL_KEYS);
  const resolvedModule: TokenInterface = {};

  for (const [name, entry] of Object.entries(module)) {
    // Strip build-time controls — they must not become CSS variables.
    if (control.has(name)) continue;

    if (!entry || entry.$type !== "rootFontSize") {
      resolvedModule[name] = entry;
      continue;
    }

    const step = entry as unknown as RootFontSizeStepObject;
    const a11y = stepA11yVar(step);

    let value: string;
    if (mode === "static") {
      if (step.$value == null) {
        console.warn(
          chalk.yellow(
            `Static type scale is enabled but step "${name}" has no \`$value\`. Falling back to its fluid size.`
          )
        );
        value = controls
          ? buildFluidValue(step.index, controls, a11y)
          : "1rem";
      } else {
        value = buildStaticValue(step.$value, a11y);
      }
    } else if (step.$value != null) {
      // Per-step override: pinned static value inside an otherwise-fluid scale.
      value = buildStaticValue(step.$value, a11y);
    } else {
      value = buildFluidValue(step.index, controls!, a11y);
    }

    resolvedModule[name] = {
      $value: value,
      $type: "rootFontSize",
      $description: step.$description,
    };
  }

  return { ...tokens, [FONT_SIZE_KEY]: resolvedModule };
}
