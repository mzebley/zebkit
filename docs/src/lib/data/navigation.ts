import { colorFamilySlugs, semanticColorFamilySlugs } from './color-families';
import { utilityManifests } from './utility-manifests';

export interface NavItem {
  label: string;
  link: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    label: 'Home',
    items: [{ label: 'Home', link: '/' }]
  },
  {
    label: 'Foundations',
    items: [
      { label: 'Tokens — the strata', link: '/foundations/tokens' },
      { label: 'Why tokens', link: '/foundations/why-tokens' },
      { label: 'Layers', link: '/foundations/layers' },
      { label: 'A11y as runtime', link: '/foundations/a11y' }
    ]
  },
  {
    label: 'Typography',
    items: [{ label: 'Type scaling', link: '/typography/type-scale' }]
  },
  {
    label: 'Spacing',
    items: [{ label: 'Fluid spacing & coupling', link: '/spacing/scaling' }]
  },
  {
    label: 'Tokens',
    items: [{ label: 'Browse all', link: '/tokens' }]
  },
  {
    label: 'Color',
    items: [
      { label: 'Overview', link: '/foundations/color' },
      { label: 'Primitive palette', link: '/foundations/color/primitives' },
      ...colorFamilySlugs.map((slug) => ({
        label: slug,
        link: `/foundations/color/${slug}`
      })),
      ...semanticColorFamilySlugs.map((slug) => ({
        label: slug,
        link: `/foundations/color/${slug}`
      }))
    ]
  },
  {
    label: 'Components',
    items: [{ label: 'Button', link: '/components/button' }]
  },
  {
    label: 'Utilities',
    items: [
      { label: 'Overview', link: '/utilities' },
      ...utilityManifests.map((m) => ({ label: m.key, link: `/utilities/${m.key}` }))
    ]
  },
  {
    label: 'Theming',
    items: [
      { label: 'Playground', link: '/theming/playground' },
      { label: 'Export config', link: '/theming/export' }
    ]
  },
  {
    label: 'For Agents',
    items: [{ label: 'Machine-readable', link: '/agents' }]
  }
];
