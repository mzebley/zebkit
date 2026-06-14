import { error } from '@sveltejs/kit';
import { colorFamilies, getColorFamily } from '$data/color-families';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => colorFamilies.map((f) => ({ family: f.family }));

export const load: PageLoad = ({ params }) => {
  const family = getColorFamily(params.family);
  if (!family) throw error(404, `Unknown color family: ${params.family}`);
  return { family };
};
