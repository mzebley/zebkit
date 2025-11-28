import type { ButtonVariantConfig } from './types';
import large from './large';

export const buttonVariants: ButtonVariantConfig[] = [large];

export const buttonVariantsByName: Record<string, ButtonVariantConfig> =
  buttonVariants.reduce((acc, variant) => {
    acc[variant.name] = variant;
    return acc;
  }, {} as Record<string, ButtonVariantConfig>);
