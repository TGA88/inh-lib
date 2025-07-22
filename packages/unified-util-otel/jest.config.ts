/* eslint-disable */
export default {
  displayName: 'unified-util-otel',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/unified-util-otel',
   setupFilesAfterEnv: ['<rootDir>/src/tests/test-setup.ts'],
    testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/+(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/**/test-setup.ts',
    '!src/**/test-utils.ts',

  ],
    coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
