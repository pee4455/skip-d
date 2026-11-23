/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const DIST = resolve(__dirname, 'dist');

/* Writes dist/sw.js from src/sw.template.js with the list of built files and a version hash,
   so every deploy that changes any file produces a new service worker (which triggers the update bar). */
function serviceWorker(): Plugin {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  return {
    name: 'skipd-service-worker',
    apply: 'build',
    closeBundle() {
      const files = walk(DIST).filter(f => !f.endsWith(`${sep}sw.js`)).sort();
      const urls = files.map(f => '/' + relative(DIST, f).split(sep).join('/')).map(u => u === '/index.html' ? '/' : u);
      const template = readFileSync(resolve(__dirname, 'src/sw.template.js'), 'utf8');
      const hash = createHash('sha256').update(template);
      files.forEach(f => hash.update(relative(DIST, f)).update(readFileSync(f)));
      const sw = template
        .replace("const VERSION = '__VERSION__';", `const VERSION = '${hash.digest('hex').slice(0, 12)}';`)
        .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(urls)};`);
      if(sw.includes("'__VERSION__'") || sw.includes('= __PRECACHE__')) throw new Error('service worker template placeholders were not filled');
      writeFileSync(join(DIST, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  // index.html lives at the project root; files in public/ (icons, manifest, vendor libs) are copied as-is
  publicDir: 'public',
  plugins: [serviceWorker()],
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
