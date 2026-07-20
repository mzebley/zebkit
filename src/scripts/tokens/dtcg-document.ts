/**
 * DTCG document <-> internal token-map transforms (Phase 3, plan decisions
 * D2/D5/D6). Exported artifacts (per-module snapshots, combined exports, the
 * docs `default-tokens.json`) are real DTCG documents; the internal pipeline
 * works with a flat `TokenInterface` (record of leaf entries, each carrying its
 * own `$type`). These two functions are the single boundary between the shapes:
 *
 *   toDtcgDocument   flat entries + module metadata -> DTCG document
 *                    (hoists a shared `$type` to the group; folds layer /
 *                     cssEmission / scale into `$extensions["dev.zebkit"]`)
 *   fromDtcgDocument DTCG document -> flat entries + module metadata
 *                    (expands the group `$type` back onto entries, flattens
 *                     nested groups by joining path segments with `-` per D6,
 *                     rejects `$ref` / `$extends`)
 *
 * The round-trip is identity — `fromDtcgDocument(toDtcgDocument(x, m))` restores
 * `x` and `m` — so JSON-mode builds emit byte-identical CSS to source builds.
 */
import type { TokenInterface, TokenObject, TokenGroupExtensions } from '@definitions/tokens';
import { allowedTokenTypes, tokenObjectSchema, tokenScaleIndex } from '@definitions/tokens';
import { ZEBKIT_EXTENSION_KEY, isDtcgSpecType } from '@definitions/dtcg';
import { DEFAULT_LAYER, LayerName } from '@definitions/layers';

/** JSON Pointer / inheritance alias forms zebkit deliberately does not support (D6). */
const REJECTED_REFERENCE_KEYS = ['$ref', '$extends'] as const;

/** Module-level metadata carried outside the entry map. */
export interface ModuleMeta {
  layer: LayerName;
  /** Present only for emission-external modules (the primitive palette). */
  cssEmission?: 'external';
  /** The `{ "dev.zebkit": { scale } }` group block, when the module has fluid-scale controls. */
  groupExtensions?: TokenGroupExtensions;
}

/**
 * True when a document member is a leaf token rather than a nested group. A
 * leaf usually carries `$value`, but zebkit's fluid generated-scale steps
 * (font sizes) omit it — they are derived at build from the group's scale
 * controls — so a member with only `$`-prefixed data and no nested token/group
 * children (e.g. `{ $type, $description, $extensions }`) is also a leaf.
 */
function isLeafToken(value: unknown): value is TokenObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if ('$value' in record) return true;
  return !Object.keys(record).some((key) => !key.startsWith('$') && !key.startsWith('_'));
}

function assertNoRejectedRefs(value: Record<string, unknown>, pathLabel: string): void {
  for (const key of REJECTED_REFERENCE_KEYS) {
    if (key in value) {
      throw new Error(
        `Token '${pathLabel}' uses '${key}', which zebkit does not support. ` +
          `Use a curly-brace reference ('{module.entry}') as the '$value' instead ` +
          `(JSON Pointer '$ref' and '$extends' are rejected — plan decision D6).`
      );
    }
  }
}

/**
 * Serialize a module's flat entries and metadata into a DTCG document. A `$type`
 * shared by every entry is hoisted to the group and dropped from the entries;
 * layer / cssEmission / scale ride a group-level `$extensions["dev.zebkit"]`
 * block. Group `$`-members are emitted first, then the entries in their original
 * order.
 */
export function toDtcgDocument(
  entries: TokenInterface,
  meta: ModuleMeta
): Record<string, unknown> {
  const names = Object.keys(entries);
  const distinctTypes = new Set(names.map((name) => entries[name].$type));
  const groupType = distinctTypes.size === 1 ? [...distinctTypes][0] : undefined;

  const scale = meta.groupExtensions?.[ZEBKIT_EXTENSION_KEY]?.scale;
  const vendor: Record<string, unknown> = { layer: meta.layer };
  if (meta.cssEmission) vendor.cssEmission = meta.cssEmission;
  if (scale) vendor.scale = scale;

  const doc: Record<string, unknown> = {};
  if (groupType) doc.$type = groupType;
  doc.$extensions = { [ZEBKIT_EXTENSION_KEY]: vendor };

  for (const name of names) {
    if (groupType) {
      const { $type, ...rest } = entries[name];
      doc[name] = rest;
    } else {
      doc[name] = entries[name];
    }
  }
  return doc;
}

/** A compiled build's per-module outputs — everything needed to serialize its DTCG documents. */
export interface ModuleBuildOutput {
  tokens: Record<string, TokenInterface>;
  layers?: Record<string, LayerName>;
  groupExtensions?: Record<string, TokenGroupExtensions | undefined>;
  externalModules?: ReadonlySet<string>;
}

/**
 * Serialize every module of a build to its DTCG document, keyed by module key.
 * This is the single source of truth for what the exporters emit — the CLI
 * defaults snapshots (`build:defaults`), the `writeTokensToFile` exports, and
 * the `check:dtcg-validate` gate all derive their documents from here so the
 * validated shape can never drift from the exported one.
 */
export function toDtcgDocuments(
  build: ModuleBuildOutput
): Record<string, Record<string, unknown>> {
  const documents: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(build.tokens)) {
    documents[key] = toDtcgDocument(build.tokens[key], {
      layer: build.layers?.[key] ?? DEFAULT_LAYER,
      cssEmission: build.externalModules?.has(key) ? 'external' : undefined,
      groupExtensions: build.groupExtensions?.[key],
    });
  }
  return documents;
}

function flattenInto(
  out: TokenInterface,
  node: Record<string, unknown>,
  prefix: string,
  inheritedType: string | undefined
): void {
  for (const [key, value] of Object.entries(node)) {
    // Group-level metadata ($type/$extensions/$description) and any legacy
    // sidecar (_key/_layer/_cssEmission) are handled by the caller, not entries.
    if (key.startsWith('$') || key.startsWith('_')) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    const name = prefix ? `${prefix}-${key}` : key;
    const record = value as Record<string, unknown>;
    assertNoRejectedRefs(record, name);

    if (isLeafToken(record)) {
      const entry = { ...(record as TokenObject) };
      if (!entry.$type && inheritedType) entry.$type = inheritedType as TokenObject['$type'];
      out[name] = entry;
    } else {
      // A nested group: it may carry its own `$type` / `$extensions`; recurse
      // with the joined path and the nearest enclosing group type (D6).
      const nestedType = typeof record.$type === 'string' ? record.$type : inheritedType;
      flattenInto(out, record, name, nestedType);
    }
  }
}

/**
 * Parse a DTCG document into flat entries plus module metadata. The group
 * `$type` is applied to any entry that omits one; nested groups flatten by
 * joining path segments with `-` (D6); `$ref` / `$extends` are rejected.
 */
export function fromDtcgDocument(doc: Record<string, unknown>): {
  entries: TokenInterface;
  meta: ModuleMeta;
} {
  const groupType = typeof doc.$type === 'string' ? doc.$type : undefined;
  const groupExt = (doc.$extensions as Record<string, unknown> | undefined)?.[
    ZEBKIT_EXTENSION_KEY
  ] as Record<string, unknown> | undefined;

  const layer = (groupExt?.layer as LayerName) ?? DEFAULT_LAYER;
  const cssEmission = groupExt?.cssEmission === 'external' ? 'external' : undefined;
  const scale = groupExt?.scale;
  const groupExtensions = scale
    ? ({ [ZEBKIT_EXTENSION_KEY]: { scale } } as TokenGroupExtensions)
    : undefined;

  const entries: TokenInterface = {};
  flattenInto(entries, doc, '', groupType);

  return { entries, meta: { layer, cssEmission, groupExtensions } };
}

/** One token a strict-mode export dropped because its `$type` is proprietary (D9). */
export interface DroppedToken {
  /** Flattened token name within the module. */
  name: string;
  /** The proprietary `$type` (D4 registry) that caused the drop. */
  $type: string;
}

/** The result of a strict-mode export: the spec-only document plus what it shed. */
export interface StrictDtcgDocument {
  /** The DTCG document with every proprietary-typed entry removed. */
  document: Record<string, unknown>;
  /** Manifest of the tokens dropped to reach spec-only conformance. */
  dropped: DroppedToken[];
}

/**
 * Strict-mode export (decision D9): reduce a module document to only DTCG
 * spec-typed tokens — for consumers that hard-fail on an unknown `$type` — and
 * report what was dropped. Proprietary-typed entries (the D4 registry:
 * `cssDimension`, `display`, `transitionProperty`, `boolean`, …) are removed
 * and listed in the returned drop-manifest. The survivors re-serialize through
 * the normal boundary, so the strict document is itself a well-formed DTCG
 * document (its group `$type` is recomputed for the entries that remain).
 */
export function toStrictDtcgDocument(doc: Record<string, unknown>): StrictDtcgDocument {
  const { entries, meta } = fromDtcgDocument(doc);
  const kept: TokenInterface = {};
  const dropped: DroppedToken[] = [];
  for (const [name, entry] of Object.entries(entries)) {
    if (entry.$type && isDtcgSpecType(entry.$type)) {
      kept[name] = entry;
    } else {
      dropped.push({ name, $type: entry.$type ?? '(none)' });
    }
  }
  return { document: toDtcgDocument(kept, meta), dropped };
}

const ALLOWED_TYPES = new Set<string>(allowedTokenTypes.options);

/**
 * Validate one exported DTCG document (a module) for zebkit-conformance: it
 * parses (no `$ref`/`$extends`, well-formed groups), every leaf resolves a
 * `$type` in the allowed set (spec + documented proprietary registry), and
 * every entry with a `$value` matches the DTCG entry schema. A fluid
 * generated-scale step legitimately omits `$value` (it is derived at build from
 * the group's scale controls) and is accepted when it carries a scale index.
 * Returns a list of human-readable problems — empty means valid. This is the
 * local Phase 3 gate; Phase 4 wires it into `npm run check`.
 */
export function validateDtcgDocument(doc: unknown, label = 'document'): string[] {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return [`${label}: not a JSON object`];
  }
  let parsed: { entries: TokenInterface };
  try {
    parsed = fromDtcgDocument(doc as Record<string, unknown>);
  } catch (error) {
    return [`${label}: ${error instanceof Error ? error.message : String(error)}`];
  }

  const errors: string[] = [];
  for (const [name, entry] of Object.entries(parsed.entries)) {
    if (!entry.$type) {
      errors.push(`${label}.${name}: no $type (and no group $type to inherit)`);
    } else if (!ALLOWED_TYPES.has(entry.$type)) {
      errors.push(`${label}.${name}: unknown $type '${entry.$type}'`);
    }
    if (entry.$value === undefined) {
      if (tokenScaleIndex(entry) === undefined) {
        errors.push(`${label}.${name}: missing $value`);
      }
      continue;
    }
    const result = tokenObjectSchema.safeParse(entry);
    if (!result.success) {
      errors.push(`${label}.${name}: ${result.error.issues[0]?.message ?? 'invalid entry'}`);
    }
  }
  return errors;
}
