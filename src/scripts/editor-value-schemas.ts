import {
  DTCG_COLOR_SPACES,
  DIMENSION_UNITS,
  DURATION_UNITS,
  type AllowedTokenTypes,
} from '../definitions/tokens';

type JsonSchema = Record<string, unknown>;

const wholeValueAliasSchema: JsonSchema = {
  type: 'string',
  pattern: '^\\{(?:(?!\\$)[^.{}]+\\.)*(?:(?!\\$)[^.{}]+|\\$root)\\}$',
};

const cssStringSchema: JsonSchema = { type: 'string', minLength: 1 };
const colorCssStringSchema: JsonSchema = { type: 'string' };

function componentSchema(minimum?: number, maximum?: number, exclusiveMaximum?: number): JsonSchema {
  return {
    oneOf: [
      {
        type: 'number',
        ...(minimum === undefined ? {} : { minimum }),
        ...(maximum === undefined ? {} : { maximum }),
        ...(exclusiveMaximum === undefined ? {} : { exclusiveMaximum }),
      },
      { const: 'none' },
    ],
  };
}

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
  allOf: [
    {
      if: { properties: { colorSpace: { enum: ['srgb', 'srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50'] } } },
      then: { properties: { components: { items: [componentSchema(0, 1), componentSchema(0, 1), componentSchema(0, 1)] } } },
    },
    {
      if: { properties: { colorSpace: { enum: ['hsl', 'hwb'] } } },
      then: { properties: { components: { items: [componentSchema(0, undefined, 360), componentSchema(0, 100), componentSchema(0, 100)] } } },
    },
    {
      if: { properties: { colorSpace: { const: 'lab' } } },
      then: { properties: { components: { items: [componentSchema(0, 100), componentSchema(), componentSchema()] } } },
    },
    {
      if: { properties: { colorSpace: { const: 'lch' } } },
      then: { properties: { components: { items: [componentSchema(0, 100), componentSchema(0), componentSchema(0, undefined, 360)] } } },
    },
    {
      if: { properties: { colorSpace: { const: 'oklab' } } },
      then: { properties: { components: { items: [componentSchema(0, 1), componentSchema(), componentSchema()] } } },
    },
    {
      if: { properties: { colorSpace: { const: 'oklch' } } },
      then: { properties: { components: { items: [componentSchema(0, 1), componentSchema(0), componentSchema(0, undefined, 360)] } } },
    },
  ],
};

const shadowDimensionSchema = {
  oneOf: [structuredDimensionSchema, wholeValueAliasSchema],
};

const nonnegativeShadowDimensionSchema = {
  oneOf: [
    {
      ...structuredDimensionSchema,
      properties: {
        ...structuredDimensionSchema.properties,
        value: { type: 'number', minimum: 0 },
      },
    },
    wholeValueAliasSchema,
  ],
};

const shadowLayerSchema = {
  type: 'object',
  required: ['color', 'offsetX', 'offsetY', 'blur', 'spread'],
  additionalProperties: false,
  properties: {
    color: { oneOf: [structuredColorSchema, wholeValueAliasSchema] },
    offsetX: shadowDimensionSchema,
    offsetY: shadowDimensionSchema,
    blur: nonnegativeShadowDimensionSchema,
    spread: shadowDimensionSchema,
    inset: { type: 'boolean' },
  },
};

/** Exhaustive editor projection of the canonical runtime token-type registry. */
export const AUTHORABLE_VALUE_SCHEMAS: Record<AllowedTokenTypes, JsonSchema> = {
  color: { oneOf: [colorCssStringSchema, structuredColorSchema] },
  dimension: { oneOf: [cssStringSchema, structuredDimensionSchema] },
  duration: { oneOf: [cssStringSchema, structuredDurationSchema] },
  cubicBezier: {
    oneOf: [
      cssStringSchema,
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
      cssStringSchema,
      shadowLayerSchema,
      {
        type: 'array',
        items: { oneOf: [shadowLayerSchema, wholeValueAliasSchema] },
      },
    ],
  },
  fontFamily: {
    oneOf: [
      cssStringSchema,
      { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
    ],
  },
  fontWeight: {
    oneOf: [
      { type: 'number', minimum: 1, maximum: 1000 },
      cssStringSchema,
    ],
  },
  number: { oneOf: [{ type: 'number' }, cssStringSchema] },
  strokeStyle: cssStringSchema,
  boolean: { oneOf: [{ type: 'boolean' }, wholeValueAliasSchema] },
  cssColor: cssStringSchema,
  cssDimension: cssStringSchema,
  cssDuration: cssStringSchema,
  cssFontFamily: cssStringSchema,
  cssFontWeight: cssStringSchema,
  cssEasingFunction: cssStringSchema,
  cssNumber: cssStringSchema,
  cssStrokeStyle: cssStringSchema,
  cssShadow: cssStringSchema,
  display: cssStringSchema,
  cursor: cssStringSchema,
  fontStyle: cssStringSchema,
  textDecoration: cssStringSchema,
  textTransform: cssStringSchema,
  textAlignment: cssStringSchema,
  transform: cssStringSchema,
  transitionProperty: cssStringSchema,
  asset: cssStringSchema,
  content: cssStringSchema,
  flex: cssStringSchema,
  resize: cssStringSchema,
};
