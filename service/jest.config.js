/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/features/**/*.ts',
    'src/lib/**/*.ts',
    'src/auth/**/*.ts',
    '!src/**/*.routes.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.test.ts',
  ],
  clearMocks: true,
};
