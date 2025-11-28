/**
 * Canonical cascade layer names and ordering for Zebkit token output.
 * Layers let us control which token groups win in the cascade without
 * changing their values or selectors.
 */
export type LayerName = 'theme' | 'base' | 'components' | 'utilities';

export const LAYER_ORDER: LayerName[] = ['theme', 'base', 'components', 'utilities'];

// Default layer for token modules that do not opt into a specific layer.
export const DEFAULT_LAYER: LayerName = 'base';
