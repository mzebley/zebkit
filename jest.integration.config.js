import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  collectCoverage: false,
  testPathIgnorePatterns: [],
  testRegex: '(/__tests__/.*|(\\.|/)integration\\.test)\\.tsx?$',
};
