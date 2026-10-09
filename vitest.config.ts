import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/*.d.ts', 'src/types/**'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
    },
  },
}));
