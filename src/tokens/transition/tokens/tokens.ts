import type { LayerName } from "@definitions/layers";
import {
  serializeCubicBezierValue,
  serializeDurationValue,
  type CubicBezierValue,
  type TokenObject,
} from "@definitions/tokens";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "transition";
export const layer: LayerName = "base";
export type SemanticTransitionTokens = z.infer<typeof tokenSchema>;

/**
 * Transition tokens split into DTCG types (Phase 2d, decision D5): `ms` timings
 * are spec `duration` `{value, unit}` values (reduced-motion opts in via the
 * a11y duration modifier), and the easing curves are spec `cubicBezier`
 * `[x1, y1, x2, y2]` coordinate tuples. The `css` strings are the byte-for-byte
 * output the golden baseline pins; `build` asserts each structured value
 * round-trips to its string, so the structured form and emitted CSS can never
 * silently diverge.
 */
type Spec =
  | { kind: "duration"; ms: number; css: string; description: string }
  | { kind: "function"; curve: CubicBezierValue; css: string; description: string };

const SPEC: Record<string, Spec> = {
  "duration-default": {
    kind: "duration",
    ms: 325,
    css: "325ms",
    description:
      "Default duration used by utility transition classes with non-specialized timing functions (ease, linear, ease-in, etc",
  },
  "duration-slow": {
    kind: "duration",
    ms: 625,
    css: "625ms",
    description:
      "Slower duration used by utility transition classes with non-specialized timing functions (ease, linear, ease-in, etc",
  },
  "duration-fast": {
    kind: "duration",
    ms: 125,
    css: "125ms",
    description:
      "Faster duration used by utility transition classes with non-specialized timing functions (ease, linear, ease-in, etc",
  },
  "playful-motion-function-default": {
    kind: "function",
    curve: [0.38, 1.21, 0.22, 1.0],
    css: "cubic-bezier(0.38, 1.21, 0.22, 1.00)",
    description:
      "Playful motion (spatial) default timing curve. Use for movement and layout-related transitions where a lively, expressive settle feels appropriate.",
  },
  "playful-motion-function-slow": {
    kind: "function",
    curve: [0.39, 1.29, 0.35, 0.98],
    css: "cubic-bezier(0.39, 1.29, 0.35, 0.98)",
    description:
      "Playful motion (spatial) slow timing curve. Use for larger, more noticeable movement where you want a longer, expressive ease into the final position without feeling abrupt.",
  },
  "playful-motion-function-fast": {
    kind: "function",
    curve: [0.42, 1.67, 0.21, 0.9],
    css: "cubic-bezier(0.42, 1.67, 0.21, 0.90)",
    description:
      "Playful motion (spatial) fast timing curve. Use for quick movement that still feels springy and characterful—snappy, but not rigid.",
  },
  "playful-motion-duration-default": {
    kind: "duration",
    ms: 500,
    css: "500ms",
    description:
      "Playful motion (spatial) default duration. Pairs with the playful motion default curve for common movement transitions.",
  },
  "playful-motion-duration-slow": {
    kind: "duration",
    ms: 650,
    css: "650ms",
    description:
      "Playful motion (spatial) slow duration. Pairs with the playful motion slow curve for larger or more prominent movement transitions.",
  },
  "playful-motion-duration-fast": {
    kind: "duration",
    ms: 350,
    css: "350ms",
    description:
      "Playful motion (spatial) fast duration. Pairs with the playful motion fast curve for quick spatial transitions that should still feel expressive.",
  },
  "playful-fx-function-default": {
    kind: "function",
    curve: [0.34, 0.8, 0.34, 1.0],
    css: "cubic-bezier(0.34, 0.80, 0.34, 1.00)",
    description:
      "Playful effects (non-spatial) default timing curve. Use for opacity, color, shadow, blur, and other visual effects where overshoot is not appropriate.",
  },
  "playful-fx-function-slow": {
    kind: "function",
    curve: [0.34, 0.88, 0.34, 1.0],
    css: "cubic-bezier(0.34, 0.88, 0.34, 1.00)",
    description:
      "Playful effects (non-spatial) slow timing curve. Use for slower fades and effect changes that should feel smooth and deliberate without bounce.",
  },
  "playful-fx-function-fast": {
    kind: "function",
    curve: [0.31, 0.94, 0.34, 1.0],
    css: "cubic-bezier(0.31, 0.94, 0.34, 1.00)",
    description:
      "Playful effects (non-spatial) fast timing curve. Use for quick effect transitions that should feel responsive but still smooth.",
  },
  "playful-fx-duration-default": {
    kind: "duration",
    ms: 200,
    css: "200ms",
    description:
      "Playful effects (non-spatial) default duration. Pairs with the playful effects default curve for common fades and visual effect transitions.",
  },
  "playful-fx-duration-slow": {
    kind: "duration",
    ms: 300,
    css: "300ms",
    description:
      "Playful effects (non-spatial) slow duration. Pairs with the playful effects slow curve for more noticeable fades or effect changes.",
  },
  "playful-fx-duration-fast": {
    kind: "duration",
    ms: 150,
    css: "150ms",
    description:
      "Playful effects (non-spatial) fast duration. Pairs with the playful effects fast curve for subtle, quick visual updates.",
  },
  "calm-motion-function-default": {
    kind: "function",
    curve: [0.27, 1.06, 0.18, 1.0],
    css: "cubic-bezier(0.27, 1.06, 0.18, 1.00)",
    description:
      "Calm motion (spatial) timing curve. Use for movement and layout-related transitions when you want a standard, stable feel with minimal flourish.",
  },
  "calm-motion-function-slow": {
    kind: "function",
    curve: [0.27, 1.06, 0.18, 1.0],
    css: "cubic-bezier(0.27, 1.06, 0.18, 1.00)",
    description:
      "Calm motion (spatial) timing curve for slow movement. The curve is consistent across speeds; use the slow duration to make the transition feel more deliberate.",
  },
  "calm-motion-function-fast": {
    kind: "function",
    curve: [0.27, 1.06, 0.18, 1.0],
    css: "cubic-bezier(0.27, 1.06, 0.18, 1.00)",
    description:
      "Calm motion (spatial) timing curve for fast movement. The curve is consistent across speeds; use the fast duration for snappier, standard motion.",
  },
  "calm-motion-duration-default": {
    kind: "duration",
    ms: 500,
    css: "500ms",
    description:
      "Calm motion (spatial) default duration. Pairs with the calm motion curve for common movement transitions.",
  },
  "calm-motion-duration-slow": {
    kind: "duration",
    ms: 750,
    css: "750ms",
    description:
      "Calm motion (spatial) slow duration. Pairs with the calm motion curve for larger or more prominent movement transitions that should feel steady and unhurried.",
  },
  "calm-motion-duration-fast": {
    kind: "duration",
    ms: 350,
    css: "350ms",
    description:
      "Calm motion (spatial) fast duration. Pairs with the calm motion curve for quick, standard movement transitions.",
  },
  "calm-fx-function-default": {
    kind: "function",
    curve: [0.34, 0.8, 0.34, 1.0],
    css: "cubic-bezier(0.34, 0.80, 0.34, 1.00)",
    description:
      "Calm effects (non-spatial) default timing curve. Use for opacity, color, shadow, blur, and other visual effects where overshoot is not appropriate.",
  },
  "calm-fx-function-slow": {
    kind: "function",
    curve: [0.34, 0.88, 0.34, 1.0],
    css: "cubic-bezier(0.34, 0.88, 0.34, 1.00)",
    description:
      "Calm effects (non-spatial) slow timing curve. Use for slower fades and effect changes that should feel smooth and restrained.",
  },
  "calm-fx-function-fast": {
    kind: "function",
    curve: [0.31, 0.94, 0.34, 1.0],
    css: "cubic-bezier(0.31, 0.94, 0.34, 1.00)",
    description:
      "Calm effects (non-spatial) fast timing curve. Use for quick effect transitions that should feel responsive without drawing attention.",
  },
  "calm-fx-duration-default": {
    kind: "duration",
    ms: 200,
    css: "200ms",
    description:
      "Calm effects (non-spatial) default duration. Pairs with the calm effects default curve for common fades and visual effect transitions.",
  },
  "calm-fx-duration-slow": {
    kind: "duration",
    ms: 300,
    css: "300ms",
    description:
      "Calm effects (non-spatial) slow duration. Pairs with the calm effects slow curve for more noticeable fades or effect changes.",
  },
  "calm-fx-duration-fast": {
    kind: "duration",
    ms: 150,
    css: "150ms",
    description:
      "Calm effects (non-spatial) fast duration. Pairs with the calm effects fast curve for subtle, quick visual updates.",
  },
};

function build(): Record<string, TokenObject> {
  const entries: Record<string, TokenObject> = {};
  for (const [name, spec] of Object.entries(SPEC)) {
    if (spec.kind === "duration") {
      const value = { value: spec.ms, unit: "ms" as const };
      const got = serializeDurationValue(value);
      if (got !== spec.css) {
        throw new Error(`Transition '${name}': duration serializes to '${got}' but emits '${spec.css}'.`);
      }
      // Durations opt into the reduced-motion modifier; curves do not.
      entries[name] = {
        $value: value,
        $type: "duration",
        $description: spec.description,
        $extensions: { "dev.zebkit": { a11y: true } },
      };
    } else {
      const got = serializeCubicBezierValue(spec.curve);
      if (got !== spec.css) {
        throw new Error(`Transition '${name}': curve serializes to '${got}' but emits '${spec.css}'.`);
      }
      entries[name] = {
        $value: spec.curve,
        $type: "cubicBezier",
        $description: spec.description,
      };
    }
  }
  return entries;
}

const tokens = build() as SemanticTransitionTokens;

export default tokens;
