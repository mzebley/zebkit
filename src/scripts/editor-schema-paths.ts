export function tokenForGroupRoot<T>(
  entries: Record<string, T>,
  prefix: string
): T | undefined {
  return entries[`${prefix}-root`];
}
