import chalk from "chalk";
import { ZEBKIT_PREFIX } from "@config";
import {
  groupScale,
  tokenA11y,
  tokenScaleIndex,
  tokenValueToString,
} from "@definitions/tokens";
import type {
  FontSizeStepObject,
  TokenGroupExtensions,
  TokenInterface,
} from "@definitions/tokens";

/**
 * Resolves the generated font-size scale into emittable tokens.
 *
 * The `font-size` module ships six scale controls (min/max viewport, base, ratio)
 * as group-level `$extensions["dev.zebkit"].scale` metadata, plus named steps that
 * carry a step index (`$extensions["dev.zebkit"].scale.index`) instead of a literal
 * value. This pass turns each step into a concrete CSS value — a Utopia-style fluid
 * `clamp()` (default) or a static literal (opt-in) — and bakes in the per-step a11y
 * modifier. The controls are never tokens, so nothing leaks as a CSS variable.
 *
 * It runs AFTER token overrides are merged and BEFORE `convertTokensToCssVars`, operating
 * on a copy so exported token artifacts keep their authorable (index + controls) form.
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
  /** Per-module group `$extensions` (the scale controls live on the font-size group). */
  groupExtensions?: Record<string, TokenGroupExtensions>;
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

/** Parse a length to px. Accepts "360px", "22.5rem", `{value, unit}`, or a bare number (assumed px). */
function toPx(value: unknown): number {
  if (typeof value === "number") return value;
  const v = tokenValueToString(value).trim();
  if (v.endsWith("rem")) return parseFloat(v) * ROOT_PX;
  if (v.endsWith("px")) return parseFloat(v);
  return parseFloat(v);
}

/** Parse a length to rem. Accepts "1.125rem", "18px", `{value, unit}`, or a bare number (assumed rem). */
function toRem(value: unknown): number {
  if (typeof value === "number") return value;
  const v = tokenValueToString(value).trim();
  if (v.endsWith("rem")) return parseFloat(v);
  if (v.endsWith("px")) return parseFloat(v) / ROOT_PX;
  return parseFloat(v);
}

function readControls(
  groupExtensions: Record<string, TokenGroupExtensions> | undefined
): FluidControls | null {
  const scale = groupScale(groupExtensions?.[FONT_SIZE_KEY]);
  if (!scale) return null;
  if (CONTROL_KEYS.some((k) => scale[k] == null)) return null;

  return {
    minViewportPx: toPx(scale["min-viewport"]),
    maxViewportPx: toPx(scale["max-viewport"]),
    minBaseRem: toRem(scale["min-base"]),
    maxBaseRem: toRem(scale["max-base"]),
    minRatio: Number(scale["min-ratio"]),
    maxRatio: Number(scale["max-ratio"]),
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

function buildStaticValue(value: unknown, a11y: string | null): string {
  const v = tokenValueToString(value);
  return a11y ? `calc(${v} * var(${a11y}))` : v;
}

/** Default modifier for steps that opt in with `a11y: true` instead of naming
 * a per-step variable (post-D5 the `$type` no longer identifies a modifier). */
const FALLBACK_FONT_SIZE_MODIFIER = `--${ZEBKIT_PREFIX}-a11y-fallback-font-size-modifier`;

function stepA11yVar(step: FontSizeStepObject): string | null {
  const a11y = tokenA11y(step);
  if (typeof a11y === "string") return a11y;
  if (a11y === true) return FALLBACK_FONT_SIZE_MODIFIER;
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

  const controls = readControls(options.groupExtensions);
  if (mode === "fluid" && !controls) {
    console.warn(
      chalk.yellow(
        "Fluid type scale requested but the font-size group's scale controls are incomplete. Leaving font sizes unresolved."
      )
    );
    return tokens;
  }

  const resolvedModule: TokenInterface = {};

  for (const [name, entry] of Object.entries(module)) {
    // A step carries a scale index (base steps keep it through override merges)
    // or pins a concrete value; `{…}` references and index-less, value-less
    // entries pass through untouched.
    const isStep =
      entry &&
      (tokenScaleIndex(entry) != null ||
        ("$value" in entry &&
          entry.$value != null &&
          !(typeof entry.$value === "string" && entry.$value.trim().startsWith("{"))));
    if (!isStep) {
      resolvedModule[name] = entry;
      continue;
    }

    const step = entry as unknown as FontSizeStepObject;
    const a11y = stepA11yVar(step);
    const index = tokenScaleIndex(step);

    let value: string;
    if (mode === "static") {
      if (step.$value == null) {
        console.warn(
          chalk.yellow(
            `Static type scale is enabled but step "${name}" has no \`$value\`. Falling back to its fluid size.`
          )
        );
        value =
          controls && index != null
            ? buildFluidValue(index, controls, a11y)
            : "1rem";
      } else {
        value = buildStaticValue(step.$value, a11y);
      }
    } else if (step.$value != null) {
      // Per-step override: pinned static value inside an otherwise-fluid scale.
      value = buildStaticValue(step.$value, a11y);
    } else if (index == null) {
      console.warn(
        chalk.yellow(
          `Font-size step "${name}" has neither a \`$value\` nor a scale index. Leaving it unresolved.`
        )
      );
      resolvedModule[name] = entry;
      continue;
    } else {
      value = buildFluidValue(index, controls!, a11y);
    }

    resolvedModule[name] = {
      $value: value,
      $type: "cssDimension",
      $description: step.$description,
    };
  }

  return { ...tokens, [FONT_SIZE_KEY]: resolvedModule };
}
