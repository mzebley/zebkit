import { buildColorFamilySchema } from "../../shared-token-schema";

export const tokenSchema = buildColorFamilySchema();
export type BrandRoleTokenSchema = typeof tokenSchema;
