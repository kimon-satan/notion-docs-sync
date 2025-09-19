import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts', 'scripts/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/index.ts',
        'scripts/**/__tests__/**',
        'scripts/**/*.test.ts',
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
