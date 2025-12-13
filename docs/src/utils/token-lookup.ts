import lookup from '../../public/zebkit/token-lookup.json';

type TokenLookupMap = Record<string, string>;

const tokenLookup = lookup as TokenLookupMap;
const ZEBKIT_PREFIX = 'zbk-';

function normalizeReference(reference: string): string[] {
  const candidates: string[] = [];
  const addCandidate = (candidate?: string) => {
    if (!candidate) return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    if (!candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  const trimmedReference = reference.trim();
  addCandidate(trimmedReference);

  // Strip braces like {token.value}
  if (trimmedReference.startsWith('{') && trimmedReference.endsWith('}')) {
    addCandidate(trimmedReference.slice(1, -1));
  }

  // Also consider values that may already include braces in the middle.
  addCandidate(trimmedReference.replace(/^\{|\}$/g, ''));

  // Remove zbk- prefix when present so lookups can match the registry.
  for (const candidate of [...candidates]) {
    if (candidate.startsWith(ZEBKIT_PREFIX)) {
      addCandidate(candidate.slice(ZEBKIT_PREFIX.length));
    }
  }

  return candidates;
}

export function getCssVarForReference(reference?: string | number | null): string | null {
  if (reference === undefined || reference === null) return null;

  const value = String(reference);
  const candidates = normalizeReference(value);

  for (const candidate of candidates) {
    const cssVar = tokenLookup[candidate];
    if (cssVar) {
      return cssVar;
    }
  }

  return null;
}
