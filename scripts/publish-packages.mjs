// Release step invoked by the Changesets action (`publish: npm run release`).
// By the time this runs, `changeset version` has bumped every package.json and
// `npm run build` has produced each package's dist/. This script publishes each
// package FROM ITS dist/ directory, idempotently (skips versions already on npm),
// and prints `New tag: <name>@<version>` lines so the Changesets action creates
// the matching GitHub Releases + git tags.
//
// All four packages publish from dist/: core writes dist/package.json via
// scripts/make-dist-pkg.mjs; react/vue copy it via scripts/copy-pkg-to-dist.mjs;
// angular's ng-packagr emits it. Auth comes from the workspace .npmrc / NODE_AUTH_TOKEN.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Publish order: core first so downstream metadata is available on the registry.
const PACKAGES = [
  'photon-grid-core',
  'photon-grid-angular',
  'photon-grid-react',
  'photon-grid-vue',
];

const root = process.cwd();
let publishedCount = 0;

for (const pkg of PACKAGES) {
  const distDir = resolve(root, 'packages', pkg, 'dist');
  const manifestPath = resolve(distDir, 'package.json');

  if (!existsSync(manifestPath)) {
    console.error(`✗ ${pkg}: no dist/package.json found — did the build run? Skipping.`);
    continue;
  }

  const { name, version } = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Idempotent guard: skip if this exact version is already published.
  let alreadyOnNpm = false;
  try {
    const existing = execSync(`npm view ${name}@${version} version`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    alreadyOnNpm = existing === version;
  } catch {
    alreadyOnNpm = false; // `npm view` errors when the version does not exist yet.
  }

  if (alreadyOnNpm) {
    console.log(`• ${name}@${version} already on npm — skipping`);
    continue;
  }

  console.log(`↑ publishing ${name}@${version} from ${distDir}`);
  try {
  execSync('npm publish --access public', {
    cwd: distDir,
    stdio: 'inherit',
  });
} catch (err) {
  console.error(`Failed publishing ${name}@${version}`);
  console.error(err);
  process.exit(1);
}

  // Contract with changesets/action: this exact line drives GitHub Release + tag creation.
  console.log(`New tag: ${name}@${version}`);
  publishedCount += 1;
}

console.log(publishedCount ? `Published ${publishedCount} package(s).` : 'Nothing new to publish.');
