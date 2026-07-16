import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import path from 'node:path';

const docsRoot = process.cwd().endsWith(`${path.sep}doc-site`)
  ? process.cwd()
  : path.join(process.cwd(), 'doc-site');

const layoutPath = (relativePath) => path.join(docsRoot, relativePath);

const config = {
  extensions: ['.svelte', '.md', '.mdx'],
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: ['.md', '.mdx'],
      // Generate slug ids on headings so in-page anchor links resolve site-wide.
      rehypePlugins: [rehypeSlug],
      layout: {
        // Registers (brief §3) — selected per page via frontmatter `layout`.
        editorial: layoutPath('src/lib/layouts/EditorialLayout.svelte'),
        reference: layoutPath('src/lib/layouts/ReferenceLayout.svelte'),
        // Specialized content layouts.
        foundations: layoutPath('src/lib/layouts/FoundationsLayout.svelte'),
        components: layoutPath('src/lib/layouts/ComponentLayout.svelte'),
        // Default register is editorial.
        _: layoutPath('src/lib/layouts/EditorialLayout.svelte')
      }
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false,
      strict: true
    }),
    prerender: {
      entries: ['*'],
      handleHttpError: 'warn'
    },
    alias: {
      $definitions: '../src/definitions',
      $core: '../src/tokens',
      $data: './src/lib/data',
      $components: './src/lib/components',
      $utils: './src/lib/utils'
    }
  }
};

export default config;
