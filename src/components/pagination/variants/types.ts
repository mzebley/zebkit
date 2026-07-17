// src/components/pagination/variants/types.ts

import type { VariantConfig } from "@definitions/token-variants";
import type { PaginationTokenKey } from "../tokens/tokens";

export type PaginationVariantTokenKey = PaginationTokenKey;

/**
 * Pagination-specific variant config. Strongly typed to pagination token keys.
 */
export type PaginationVariantConfig = VariantConfig<
  "pagination",
  PaginationVariantTokenKey
>;
