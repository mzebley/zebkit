export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@config$': '<rootDir>/src/config/zebkit.ts',
    '^@definitions/(.*)$': '<rootDir>/src/definitions/$1',
    '^@token-scripts/(.*)$': '<rootDir>/src/scripts/tokens/$1',
    '^@component-scripts/(.*)$': '<rootDir>/src/scripts/components/$1',
    '^chalk$': '<rootDir>/src/test-support/chalk.mock.ts',
    // Source uses `.js` extensions on relative imports (required for the
    // NodeNext/esbuild build); strip them so ts-jest resolves the `.ts` source.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['\\.integration\\.test\\.tsx?$'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.integration.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  coverageThreshold: {
    global: {
      statements: 45,
      branches: 35,
      functions: 45,
      lines: 45,
    },
    './src/scripts/tokens/': {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    './src/cli/': {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
