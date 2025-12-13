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
      customCss: ['/src/styles/global.css'],
      head: [
        { tag: 'link', attrs: { rel: 'stylesheet', href: '/zebkit/zbk-default.min.css' } },
        {
          tag: 'script',
          attrs: { type: 'module', 'data-script': '/zebkit/zebkit.js' },
          content: `
            const currentScript = document.currentScript;
            const moduleHref =
              currentScript && currentScript.dataset && currentScript.dataset.script
                ? currentScript.dataset.script
                : '/zebkit/zebkit.js';
            if (!window.__zebkitLoaded) {
              window.__zebkitLoaded = true;
              import(moduleHref).then(({ core }) => {
                core.defineCoreComponents();
              });
            }
          `.trim(),
        },
      ],
      plugins: [rapide()],
      sidebar: [
        {
          label: 'Foundations',
          items: [
            { label: 'Tokens', link: '/foundations/tokens' },
            { label: 'Layers', link: '/foundations/layers' },
            { label: 'Color', link: '/foundations/color' },

          ],
        },
        {
          label: 'Color families',
          collapsed: true,
          items: [
            { label: 'Primitives', link: '/foundations/color/primitives' },
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
        '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      },
    },
  },
});
