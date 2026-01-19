// @ts-nocheck
import { navigation } from '$lib/data/navigation';
import type { LayoutLoad } from './$types';

export const load = () => {
  return {
    navigation
  };
};

export const prerender = true;
;null as any as LayoutLoad;