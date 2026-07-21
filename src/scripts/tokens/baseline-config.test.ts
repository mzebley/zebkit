/** @jest-environment node */

import { withoutTokenArtifactOutputs } from './baseline-config';

describe('withoutTokenArtifactOutputs', () => {
  it('keeps derived baseline config valid when the source enables strict export', () => {
    const source = {
      exportTokens: true,
      exportStrict: true,
      writeVariantRegistry: true,
      writeTokenLookup: true,
      writeAllowedTokenTypes: true,
      tokenLookupOutputPath: './tokens.json',
    };

    expect(withoutTokenArtifactOutputs(source)).toEqual({
      exportTokens: false,
      exportStrict: false,
      writeVariantRegistry: false,
      writeTokenLookup: false,
      writeAllowedTokenTypes: false,
    });
    expect(source.exportStrict).toBe(true);
  });
});

