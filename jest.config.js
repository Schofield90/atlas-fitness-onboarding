/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/tests/ui/',
    '/tests/e2e/',
    '/tests/integration/',
    '/tests/database/',
    '/tests/api/facebook/',
    '/tests/admin-hq/',
    '/tests/api/',
    '/tests/security/',
    '/tests/backend-fixes.spec.ts',
    '/tests/facebook-oauth-fix.spec.ts',
    '/tests/facebook-oauth-fixed.spec.ts',
    '/tests/settings-ui.spec.ts',
    '/tests/comprehensive-verification.spec.ts',
    '/tests/unit/automation-builder.*',
    '/tests/unit/automation-.*',
    '/tests/unit/dynamic-config-panel.*',
    '/tests/unit/workflow-.*',
    '/tests/unit/leads.*',
    '/tests/unit/billing.test.tsx',
    '/tests/unit/billing/'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        target: 'es2020'
      }
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-dnd|dnd-core|@react-dnd|nanoid)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    // ESM-heavy libs mocked to avoid transform issues
    '^react-dnd$': '<rootDir>/tests/mocks/react-dnd.cjs',
    '^react-dnd-html5-backend$': '<rootDir>/tests/mocks/react-dnd-html5-backend.cjs',
    '^react-dnd-test-backend$': '<rootDir>/tests/mocks/react-dnd-test-backend.cjs'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  extensionsToTreatAsEsm: [],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.stories.tsx',
    '!app/**/layout.tsx',
    '!app/**/page.tsx'
  ],
  coverageThreshold: undefined,
  testTimeout: 30000,
  verbose: true
}

module.exports = config