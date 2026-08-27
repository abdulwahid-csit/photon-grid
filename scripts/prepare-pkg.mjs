#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';

// Called from packages/*/package.json `prepare` script. We want to build
// the package when a consumer installs it from git (npm runs `prepare`),
// but avoid running the build during a monorepo `npm ci` where the package
// lives inside the workspace root and core packages are built separately.

const scriptDir = dirname(new URL(import.meta.url).pathname.replace(/^\/*/, ''));

function findUpPackageJson(startDir) {
  let dir = startDir;
  while (true) {
    const candidate = resolve(dir, 'package.json');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const rootPkgPath = findUpPackageJson(scriptDir);
if (rootPkgPath) {
  try {
    const raw = readFileSync(rootPkgPath, 'utf8');
    const content = JSON.parse(raw);
    if (content && content.workspaces) {
      // We're inside the monorepo — skip the per-package prepare to avoid
      // triggering builds during `npm ci`.
      console.log('prepare-pkg: detected monorepo workspace; skipping package build');
      process.exit(0);
    }
  } catch (e) {
    // Fall through and attempt build.
  }
}

// Not inside a monorepo workspace — run the package build so `dist/` is
// available to consumers installing from GitHub.
console.log('prepare-pkg: building package (prepare)');
try {
  execSync('npm run build', { stdio: 'inherit' });
  process.exit(0);
} catch (err) {
  console.error('prepare-pkg: build failed', err);
  process.exit(1);
}
