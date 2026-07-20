import type { LayerName } from "@definitions/layers";
import { z } from "zod";
import { tokenSchema } from "./token-schema";

export const key = "opacity";
export const layer: LayerName = "base";
export type OpacityTokens = z.infer<typeof tokenSchema>;

const tokens = {
  "0": {
    $value: 0,
    $type: "number",
    $description: "Fully transparent (invisible).",
  },
  "5": {
    $value: 0.05,
    $type: "number",
    $description: "5% opacity - barely visible.",
  },
  "10": {
    $value: 0.1,
    $type: "number",
    $description: "10% opacity - very faint.",
  },
  "15": {
    $value: 0.15,
    $type: "number",
    $description: "15% opacity - faint.",
  },
  "20": {
    $value: 0.2,
    $type: "number",
    $description: "20% opacity - subtle.",
  },
  "25": {
    $value: 0.25,
    $type: "number",
    $description: "25% opacity - quarter visible.",
  },
  "30": {
    $value: 0.3,
    $type: "number",
    $description: "30% opacity - light.",
  },
  "40": {
    $value: 0.4,
    $type: "number",
    $description: "40% opacity - moderate-light.",
  },
  "50": {
    $value: 0.5,
    $type: "number",
    $description: "50% opacity - half visible.",
  },
  "60": {
    $value: 0.6,
    $type: "number",
    $description: "60% opacity - moderate.",
  },
  "70": {
    $value: 0.7,
    $type: "number",
    $description: "70% opacity - mostly visible.",
  },
  "75": {
    $value: 0.75,
    $type: "number",
    $description: "75% opacity - three-quarters visible.",
  },
  "80": {
    $value: 0.8,
    $type: "number",
    $description: "80% opacity - largely visible.",
  },
  "85": {
    $value: 0.85,
    $type: "number",
    $description: "85% opacity - mostly opaque.",
  },
  "90": {
    $value: 0.9,
    $type: "number",
    $description: "90% opacity - nearly opaque.",
  },
  "95": {
    $value: 0.95,
    $type: "number",
    $description: "95% opacity - almost fully opaque.",
  },
  "100": {
    $value: 1,
    $type: "number",
    $description: "Fully opaque (default).",
  },
} as const satisfies OpacityTokens;

export default tokens;
