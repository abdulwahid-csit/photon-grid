// Cross-platform "copy the publish manifest into dist/" used by the
// framework wrapper packages (react, vue).
//
// The dist/ directory is published directly, so paths in the generated
// package.json must be relative to dist/ itself.

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
  mkdirSync(dist, { recursive: true });
}

const pkg = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8')
);

// Remove development-only fields.
delete pkg.scripts;
delete pkg.devDependencies;

// `dist/` itself is the published package root.
// Therefore all entry paths must be relative to dist/.
pkg.main = './index.cjs';
pkg.module = './index.js';
pkg.types = './index.d.ts';

if (pkg.exports?.['.']) {
  pkg.exports['.'].types = './index.d.ts';
  pkg.exports['.'].import = './index.js';
  pkg.exports['.'].require = './index.cjs';
}

// IMPORTANT:
// Do not keep `"files": ["dist"]` because npm is publishing FROM dist/.
delete pkg.files;

writeFileSync(
  resolve(dist, 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n'
);

// Copy documentation into the published package.
for (const file of ['README.md', 'LICENSE']) {
  const src = resolve(root, file);

  if (existsSync(src)) {
    copyFileSync(src, resolve(dist, file));
  }
}

console.log(
  `[copy-pkg-to-dist] wrote dist/package.json for ${pkg.name}@${pkg.version}`
);