import { colorFamilySlugs, semanticColorFamilySlugs } from './color-families';
import { utilityManifests } from './utility-manifests';

export interface NavItem {
  label: string;
  link: string;
}

// A section is either a collapsible group (`items`) or a direct link (`link`).
// Use the direct-link form for top-level destinations that don't warrant an
// accordion (Home, single-page sections).
export interface NavGroup {
  label: string;
  items: NavItem[];
  link?: never;
}

export interface NavLink {
  label: string;
  link: string;
  items?: never;
}

export type NavSection = NavGroup | NavLink;

export const navigation: NavSection[] = [
  {
    label: 'Home',
    link: '/'
  },
  {
    label: 'CLI',
    link: '/cli'
  },
  {
    label: 'Foundations',
    items: [
      { label: 'Tokens — the strata', link: '/foundations/tokens' },
      { label: 'Why tokens', link: '/foundations/why-tokens' },
      { label: 'Layers', link: '/foundations/layers' },
      { label: 'Overlay themes', link: '/foundations/theming' },
      { label: 'A11y as runtime', link: '/foundations/a11y' }
    ]
  },
  {
    label: 'Typography',
    items: [
      { label: 'Type scaling', link: '/typography/type-scale' },
      { label: 'Fonts', link: '/typography/fonts' }
    ]
  },
  {
    label: 'Spacing',
    items: [
      { label: 'Dynamic spacing growth', link: '/spacing/dynamic-scaling' },
      { label: 'Fluid spacing & coupling', link: '/spacing/scaling' }
    ]
  },
  {
    label: 'Tokens',
    link: '/tokens'
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
    items: [
      { label: 'Button', link: '/components/button' },
      { label: 'Checkbox', link: '/components/checkbox' },
      { label: 'Input', link: '/components/input' },
      { label: 'Pagination', link: '/components/pagination' },
      { label: 'Radio', link: '/components/radio' },
      { label: 'Select', link: '/components/select' },
      { label: 'Textarea', link: '/components/textarea' },
      { label: 'Toggle', link: '/components/toggle' },
      { label: 'Tooltip', link: '/components/tooltip' }
    ]
  },
  {
    label: 'Utilities',
    items: [
      { label: 'Overview', link: '/utilities' },
      ...utilityManifests.map((m) => ({ label: m.key, link: `/utilities/${m.key}` }))
    ]
  },
  {
    label: 'Pruning',
    link: '/pruning'
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
    link: '/agents'
  }
];
