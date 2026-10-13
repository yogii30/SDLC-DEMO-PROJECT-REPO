/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite';

// node_modules may be a symlink to an install outside the repository (pnpm, shared CI caches).
// Vite resolves it to its real path, so allow that path or browser tests cannot load modules.
const nodeModules = resolve(import.meta.dirname, 'node_modules');
const fsAllow = [searchForWorkspaceRoot(import.meta.dirname)];
if (existsSync(nodeModules)) fsAllow.push(realpathSync(nodeModules));

/** The browser test provider. Loaded only under Vitest, so dev and build never need Playwright. */
async function browserProvider() {
  const [{ playwright }, { chromium }] = await Promise.all([
    import('@vitest/browser-playwright'),
    import('playwright'),
  ]);
  // Prefer Playwright's bundled Chromium (`npx playwright install chromium`); fall back to an
  // installed Google Chrome so the browser tests run without a browser download.
  const channel = existsSync(chromium.executablePath()) ? undefined : 'chrome';
  return playwright({ launchOptions: { channel } });
}

export default defineConfig(async (): Promise<UserConfig> => ({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: fsAllow },
    // `npm run dev:api` serves the login API; the dev server forwards /api to it.
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3001' },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'backend/**/*.ts'],
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'backend/server.ts',
        'backend/**/*.test.ts',
      ],
    },
    projects: process.env.VITEST
      ? [
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
            // The login API (SDLC-47), exercised over real HTTP.
            extends: true,
            test: {
              name: 'api',
              environment: 'node',
              include: ['backend/**/*.test.ts'],
            },
          },
          {
            // Layout and visual criteria need a real rendering engine and the real Tailwind CSS.
            extends: true,
            test: {
              name: 'browser',
              include: ['src/**/*.browser.test.{ts,tsx}'],
              browser: {
                enabled: true,
                headless: true,
                provider: await browserProvider(),
                instances: [{ browser: 'chromium' }],
              },
            },
          },
        ]
      : undefined,
  },
}));
