import { defineCollection } from 'astro:content';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

// Starlight content collections define frontmatter and i18n defaults.
const docs = defineCollection({ schema: docsSchema() });
const i18n = defineCollection({ type: 'data', schema: i18nSchema() });

export const collections = { docs, i18n };
