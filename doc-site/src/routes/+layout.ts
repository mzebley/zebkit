import { navigation } from '$lib/data/navigation';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
  return {
    navigation
  };
};

export const prerender = true;
