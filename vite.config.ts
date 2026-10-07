/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

// node_modules may be a symlink to an install outside the repository (pnpm, shared CI caches).
// Vite resolves it to its real path, so allow that path or browser tests cannot load modules.
const nodeModules = resolve(import.meta.dirname, 'node_modules');
const fsAllow = [searchForWorkspaceRoot(import.meta.dirname)];
if (existsSync(nodeModules)) fsAllow.push(realpathSync(nodeModules));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { fs: { allow: fsAllow } },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          css: false,
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        // Layout and visual criteria need a real rendering engine and the real Tailwind CSS.
        // Uses the locally installed Chrome, so no Playwright browser download is needed.
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
