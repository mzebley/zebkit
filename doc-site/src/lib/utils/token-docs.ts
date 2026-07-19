import type {
  ColorValue,
  CompiledToken,
  CubicBezierValue,
  DimensionValue,
  DurationValue,
  ShadowValue,
} from '../data/compiled-tokens';

export interface TokenRow {
  token: string;
  type: string;
  value: string | number;
  description: string;
}

export type { CompiledToken };
export type CompiledTokenMap = Record<string, CompiledToken>;

/** Canonical CSS string for a structured dimension (leading zero dropped below 1). */
function serializeDimension(d: DimensionValue): string {
  return `${String(d.value).replace(/^(-?)0\./, '$1.')}${d.unit}`;
}

/** Duration: `<n><unit>`, dropping the unit at zero (`0`, not `0ms`). */
function serializeDuration(d: DurationValue): string {
  return d.value === 0 ? '0' : `${d.value}${d.unit}`;
}

/** Cubic-bezier curve at two decimals, matching the emitted CSS. */
function serializeCubicBezier(v: CubicBezierValue): string {
  return `cubic-bezier(${v.map((n) => n.toFixed(2)).join(', ')})`;
}

/** Mirror of the shared `serializeColorValue` (doc-site is decoupled from `src`). */
function serializeColor(c: ColorValue): string {
  const alpha = c.alpha ?? 1;
  const [c1, c2, c3] = c.components;
  if (alpha === 0 && c1 === 0 && c2 === 0 && c3 === 0) return 'transparent';
  if (c.hex && alpha === 1) return c.hex;
  if (c.colorSpace === 'hsl') {
    return alpha === 1
      ? `hsl(${c1}, ${c2}%, ${c3}%)`
      : `hsla(${c1}, ${c2}%, ${c3}%, ${alpha})`;
  }
  if (c.colorSpace === 'srgb') {
    const to255 = (n: number) => Math.round(n * 255);
    return alpha === 1
      ? `rgb(${to255(c1)}, ${to255(c2)}, ${to255(c3)})`
      : `rgba(${to255(c1)}, ${to255(c2)}, ${to255(c3)}, ${alpha})`;
  }
  return `color(${c.colorSpace} ${c1} ${c2} ${c3}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

/** Shadow colors use CSS Color 4 space notation (srgb → `rgb(r g b[ / a])`). */
function serializeShadowColor(c: ColorValue): string {
  const alpha = c.alpha ?? 1;
  if (c.colorSpace === 'srgb') {
    const to255 = (n: number) => Math.round(n * 255);
    const [r, g, b] = c.components;
    const rgb = `${to255(r)} ${to255(g)} ${to255(b)}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgb(${rgb} / ${alpha})`;
  }
  return serializeColor(c);
}

function serializeShadowLayer(s: ShadowValue): string {
  const dim = (d: DimensionValue) => (d.value === 0 ? '0' : serializeDimension(d));
  const body = [dim(s.offsetX), dim(s.offsetY), dim(s.blur), dim(s.spread), serializeShadowColor(s.color)].join(' ');
  return s.inset ? `inset ${body}` : body;
}

/** Mirror of the shared `serializeShadowValue`: the empty array is `none`. */
function serializeShadow(layers: ShadowValue[]): string {
  return layers.length === 0 ? 'none' : layers.map(serializeShadowLayer).join(', ');
}

/**
 * Structured token values render as their canonical CSS string — dimensions and
 * durations (`{value, unit}`), colors (`{colorSpace, components, ...}`),
 * cubic-bezier curves (`[x1,y1,x2,y2]`), and shadows (layer objects or arrays;
 * `[]` → `none`). References and scalars pass through.
 */
export function formatTokenValue(value: CompiledToken['$value']): string | number {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((n) => typeof n === 'number')
      ? serializeCubicBezier(value as CubicBezierValue)
      : serializeShadow(value as ShadowValue[]);
  }
  if (value !== null && typeof value === 'object') {
    if ('offsetX' in value) return serializeShadow([value]);
    if ('colorSpace' in value) return serializeColor(value);
    if (value.unit === 'ms' || value.unit === 's') return serializeDuration(value);
    return serializeDimension(value);
  }
  return value ?? '';
}

export function buildTokenRows(
  tokenKey: string,
  tokens: CompiledTokenMap | undefined
): TokenRow[] {
  if (!tokens) return [];

  return Object.entries(tokens)
    // The group-level $extensions member is scale metadata, not a token.
    .filter(([name]) => !name.startsWith('$'))
    .map(([name, token]) => ({
      token: `${tokenKey}.${name}`,
      type: token.$type,
      value:
        token.$value != null
          ? formatTokenValue(token.$value)
          : token.$extensions?.['dev.zebkit']?.scale?.index ?? '',
      description: token.$description,
    }));
}
