/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@supabase|@stripe))'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.tsx',
    '!**/layout.tsx',
    '!**/page.tsx',
    '!**/*.config.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 30000,
  verbose: true,
  testPathIgnorePatterns: ['<rootDir>/__tests__/e2e/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

module.exports = config