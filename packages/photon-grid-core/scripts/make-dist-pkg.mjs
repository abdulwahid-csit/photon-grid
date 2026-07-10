// Generates a clean, publish-ready package.json inside dist/ from the real
// package.json (whose version is managed by Changesets), then copies the
// README, LICENSE and styles/ folder in. The package is published FROM dist/,
// so every path drops its leading "dist/" segment.
//
// This replaces the old static package.publish.json, which drifted out of sync
// with the source version. Single source of truth = ./package.json.

import { readFileSync, writeFileSync, copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

/** Drops a leading "./dist/" (or "dist/") from a path string. */
const stripDist = (p) =>
  typeof p === 'string' ? p.replace(/^\.\/dist\//, './').replace(/^dist\//, '') : p;

/** Recursively rewrites every string value in an exports map. */
const rewriteExports = (node) => {
  if (typeof node === 'string') return stripDist(node);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = rewriteExports(v);
    return out;
  }
  return node;
};

const distPkg = { ...pkg };

// Fields that must not ship in a published manifest.
delete distPkg.scripts;
delete distPkg.devDependencies;
delete distPkg.files; // publishing from dist/: ship everything in dist/

// Rewrite entry-point paths (they were relative to the package root).
for (const field of ['main', 'module', 'types', 'typings', 'browser', 'unpkg', 'jsdelivr']) {
  if (distPkg[field]) distPkg[field] = stripDist(distPkg[field]);
}
if (distPkg.exports) distPkg.exports = rewriteExports(distPkg.exports);

writeFileSync(resolve(dist, 'package.json'), JSON.stringify(distPkg, null, 2) + '\n');

// Copy supporting files consumers expect at the package root.
for (const file of ['README.md', 'LICENSE']) {
  const src = resolve(root, file);
  if (existsSync(src)) copyFileSync(src, resolve(dist, file));
}

// Theme CSS lives in styles/ (exported via "./styles/*") — ship it inside dist.
const styles = resolve(root, 'styles');
if (existsSync(styles)) cpSync(styles, resolve(dist, 'styles'), { recursive: true });

console.log(`[make-dist-pkg] wrote dist/package.json for ${distPkg.name}@${distPkg.version}`);
