import {
  DTCG_2025_10_WEIGHT_ALIASES,
  DTCG_COLOR_SPACES,
  DIMENSION_UNITS,
  DURATION_UNITS,
  type AllowedTokenTypes,
} from '../definitions/tokens';

type JsonSchema = Record<string, unknown>;

const wholeValueAliasSchema: JsonSchema = {
  type: 'string',
  pattern: '^\\{[^{}]+\\}$',
};

export const structuredDimensionSchema = {
  type: 'object',
  required: ['value', 'unit'],
  additionalProperties: false,
  properties: {
    value: { type: 'number' },
    unit: { type: 'string', enum: [...DIMENSION_UNITS] },
  },
};

const structuredDurationSchema = {
  type: 'object',
  required: ['value', 'unit'],
  additionalProperties: false,
  properties: {
    value: { type: 'number' },
    unit: { type: 'string', enum: [...DURATION_UNITS] },
  },
};

const structuredColorSchema = {
  type: 'object',
  required: ['colorSpace', 'components'],
  additionalProperties: false,
  properties: {
    colorSpace: { type: 'string', enum: [...DTCG_COLOR_SPACES] },
    components: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { oneOf: [{ type: 'number' }, { const: 'none' }] },
    },
    alpha: { type: 'number', minimum: 0, maximum: 1 },
    hex: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
  },
};

const shadowDimensionSchema = {
  oneOf: [structuredDimensionSchema, wholeValueAliasSchema],
};

const shadowLayerSchema = {
  type: 'object',
  required: ['color', 'offsetX', 'offsetY', 'blur', 'spread'],
  additionalProperties: false,
  properties: {
    color: { oneOf: [structuredColorSchema, wholeValueAliasSchema] },
    offsetX: shadowDimensionSchema,
    offsetY: shadowDimensionSchema,
    blur: shadowDimensionSchema,
    spread: shadowDimensionSchema,
    inset: { type: 'boolean' },
  },
};

/** Exhaustive editor projection of the canonical runtime token-type registry. */
export const AUTHORABLE_VALUE_SCHEMAS: Record<AllowedTokenTypes, JsonSchema> = {
  color: { oneOf: [{ type: 'string' }, structuredColorSchema] },
  dimension: { oneOf: [{ type: 'string' }, structuredDimensionSchema] },
  duration: { oneOf: [{ type: 'string' }, structuredDurationSchema] },
  cubicBezier: {
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: [
          { type: 'number', minimum: 0, maximum: 1 },
          { type: 'number' },
          { type: 'number', minimum: 0, maximum: 1 },
          { type: 'number' },
        ],
        additionalItems: false,
      },
    ],
  },
  shadow: {
    oneOf: [
      { type: 'string' },
      shadowLayerSchema,
      {
        type: 'array',
        items: { oneOf: [shadowLayerSchema, wholeValueAliasSchema] },
      },
    ],
  },
  fontFamily: {
    oneOf: [
      { type: 'string' },
      { type: 'array', minItems: 1, items: { type: 'string' } },
    ],
  },
  fontWeight: {
    oneOf: [
      { type: 'number', minimum: 1, maximum: 1000 },
      { type: 'string', enum: [...DTCG_2025_10_WEIGHT_ALIASES] },
      wholeValueAliasSchema,
    ],
  },
  number: { oneOf: [{ type: 'number' }, wholeValueAliasSchema] },
  strokeStyle: {
    oneOf: [
      {
        type: 'string',
        enum: ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset'],
      },
      wholeValueAliasSchema,
    ],
  },
  boolean: { oneOf: [{ type: 'boolean' }, wholeValueAliasSchema] },
  cssDimension: { type: 'string' },
  display: { type: 'string' },
  cursor: { type: 'string' },
  fontStyle: { type: 'string' },
  textDecoration: { type: 'string' },
  textTransform: { type: 'string' },
  textAlignment: { type: 'string' },
  transform: { type: 'string' },
  transitionProperty: { type: 'string' },
  transitionTimingFunction: { type: 'string' },
  utility: { type: 'string' },
  asset: { type: 'string' },
  content: { type: 'string' },
  flex: { type: 'string' },
};
