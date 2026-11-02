import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const staticDirectories = ['js', 'css', 'images', 'assets'];
const staticFiles = ['manifest.json', 'sw.js'];

// Keep the source tree WITHOUT a public/ folder. Vite processes index.html,
// while this plugin copies classic scripts, modular CSS, icons and PWA files
// into dist/ so their existing URLs and service-worker precache still work.
function copyRootStaticFiles() {
  return {
    name: 'ea-copy-root-static-files',
    apply: 'build',
    writeBundle(outputOptions) {
      const out = resolve(projectRoot, outputOptions.dir || 'dist');
      mkdirSync(out, { recursive: true });

      for (const dir of staticDirectories) {
        const source = resolve(projectRoot, dir);
        if (!existsSync(source)) throw new Error(`Missing app directory: ${dir}`);
        cpSync(source, resolve(out, dir), { recursive: true, force: true });
      }
      for (const file of staticFiles) {
        const source = resolve(projectRoot, file);
        if (!existsSync(source)) throw new Error(`Missing PWA file: ${file}`);
        copyFileSync(source, resolve(out, file));
      }
    },
  };
}

export default defineConfig({
  root: projectRoot,
  publicDir: false,
  plugins: [copyRootStaticFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
