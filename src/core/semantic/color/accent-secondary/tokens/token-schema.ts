import { buildColorFamilySchema } from "../../shared-token-schema";

export const tokenSchema = buildColorFamilySchema();
export type AccentSecondaryRoleTokenSchema = typeof tokenSchema;
