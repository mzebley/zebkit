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
  },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    extensionsToTreatAsEsm: ['.ts'],
  };
