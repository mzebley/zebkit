import { error } from '@sveltejs/kit';
import { allColorFamilySlugs, getColorPage } from '$data/color-families';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => allColorFamilySlugs.map((family) => ({ family }));

export const load: PageLoad = ({ params }) => {
  const page = getColorPage(params.family);
  if (!page) throw error(404, `Unknown color family: ${params.family}`);
  return { page };
};
