import { error } from '@sveltejs/kit';
import { utilityManifests, getUtilityManifest } from '$data/utility-manifests';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => utilityManifests.map((m) => ({ family: m.key }));

export const load: PageLoad = ({ params }) => {
  const manifest = getUtilityManifest(params.family);
  if (!manifest) throw error(404, `Unknown utility family: ${params.family}`);
  return { manifest };
};
