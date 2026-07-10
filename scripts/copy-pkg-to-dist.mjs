// Cross-platform "copy the publish manifest into dist/" used by the framework
// wrapper packages (react, vue) whose entry paths are already relative to dist.
// Runs from a package directory (cwd); strips dev-only fields and copies the
// README/LICENSE so the published tarball is clean. Replaces Windows-only
// `copy package.json dist` calls that break on the Linux CI runner.

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
delete pkg.scripts;
delete pkg.devDependencies;
writeFileSync(resolve(dist, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

for (const file of ['README.md', 'LICENSE']) {
  const src = resolve(root, file);
  if (existsSync(src)) copyFileSync(src, resolve(dist, file));
}

console.log(`[copy-pkg-to-dist] wrote dist/package.json for ${pkg.name}@${pkg.version}`);
