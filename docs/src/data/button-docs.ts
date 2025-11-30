import { compiledTokens } from './compiled-tokens';
import { buildTokenRows } from '../utils/token-docs';

const buttonTokenKey = 'zbk-button';
const buttonTokens = compiledTokens[buttonTokenKey];

const cssVar = (tokenName: string) => `--${buttonTokenKey}-${tokenName}`;
const describe = (tokenName: string) => buttonTokens?.[tokenName]?.description;

const buttonTokenBlueprint = [
  {
    title: 'Surface & borders',
    tokens: [
      { token: 'background', label: 'Background', type: 'color' },
      { token: 'background-hover', label: 'Background (hover)', type: 'color' },
      { token: 'border-color', label: 'Border color', type: 'color' },
      {
        token: 'border-radius',
        label: 'Border radius',
        type: 'range' as const,
        min: 0,
        max: 48,
        step: 1,
        unit: 'px',
      },
      {
        token: 'border-width',
        label: 'Border width',
        type: 'range' as const,
        min: 0,
        max: 8,
        step: 0.5,
        unit: 'px',
      },
    ],
  },
  {
    title: 'Typography',
    tokens: [
      { token: 'font-family', label: 'Font family', type: 'text' as const },
      {
        token: 'font-size',
        label: 'Font size',
        type: 'range' as const,
        min: 10,
        max: 48,
        step: 0.5,
        unit: 'px',
      },
      {
        token: 'line-height',
        label: 'Line height',
        type: 'range' as const,
        min: 1,
        max: 3,
        step: 0.05,
      },
    ],
  },
  {
    title: 'Spacing',
    tokens: [
      {
        token: 'padding-inline',
        label: 'Horizontal padding',
        type: 'range' as const,
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        token: 'padding-block',
        label: 'Vertical padding',
        type: 'range' as const,
        min: 0,
        max: 32,
        step: 0.5,
        unit: 'px',
      },
      {
        token: 'gap',
        label: 'Icon gap',
        type: 'range' as const,
        min: 0,
        max: 48,
        step: 1,
        unit: 'px',
      },
      {
        token: 'icon-size',
        label: 'Icon size',
        type: 'range' as const,
        min: 8,
        max: 48,
        step: 0.5,
        unit: 'px',
      },
    ],
  },
  {
    title: 'Foreground',
    tokens: [
      { token: 'color', label: 'Label color', type: 'color' },
      { token: 'focus-color', label: 'Focus ring', type: 'color' },
    ],
  },
];

export const buttonTokenRows = buildTokenRows(buttonTokenKey, buttonTokens);

export const buttonTokenGroups = buttonTokenBlueprint.map(({ title, tokens }) => ({
  title,
  tokens: tokens.map(({ token, ...control }) => ({
    ...control,
    property: cssVar(token),
    description: control.description ?? describe(token) ?? '',
  })),
}));

export const buttonCssTokenKey = buttonTokenKey;
