/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // index.html lives at the project root; files in public/ (icons, manifest, vendor libs) are copied as-is
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
