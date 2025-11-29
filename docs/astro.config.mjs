import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rapide from 'starlight-theme-rapide';

// Starlight site configuration for Zebkit docs.
export default defineConfig({
  site: 'https://zebkit.dev',
  integrations: [
    starlight({
      title: 'zebkit',
      tagline: 'Token-driven, accessibility-first web components and utilities.',
      plugins: [rapide()],
      sidebar: [
        {
          label: 'Foundations',
          items: [
            { label: 'Layers', link: '/foundations/layers' },
            { label: 'Color', link: '/foundations/color' },
            {
              label: 'Color families',
              collapsed: false,
              items: [
                { label: 'Brand', link: '/foundations/color/brand' },
                { label: 'Accent Primary', link: '/foundations/color/accent-primary' },
                { label: 'Accent Secondary', link: '/foundations/color/accent-secondary' },
                { label: 'App', link: '/foundations/color/app' },
                { label: 'Action', link: '/foundations/color/action' },
                { label: 'Caution', link: '/foundations/color/caution' },
                { label: 'Critical', link: '/foundations/color/critical' },
                { label: 'Info', link: '/foundations/color/info' },
                { label: 'Positive', link: '/foundations/color/positive' },
              ],
            },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Button', link: '/components/button' },
          ],
        },
      ],
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@definitions': fileURLToPath(new URL('../src/definitions', import.meta.url)),
      },
    },
  },
});
