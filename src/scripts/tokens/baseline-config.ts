import type { TokensConfig } from '../config';

/** Remove every token artifact side output from a derived CSS-baseline build. */
export function withoutTokenArtifactOutputs(tokens: TokensConfig): TokensConfig {
  const { tokenLookupOutputPath: _tokenLookupOutputPath, ...rest } = tokens;
  return {
    ...rest,
    exportTokens: false,
    exportStrict: false,
    writeVariantRegistry: false,
    writeTokenLookup: false,
    writeAllowedTokenTypes: false,
  };
}

