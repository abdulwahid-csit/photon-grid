import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGES = [
  'photon-grid-core',
  'photon-grid-angular',
  'photon-grid-react',
  'photon-grid-vue',
];

const root = process.cwd();
let publishedCount = 0;
const createdTags = [];

for (const pkg of PACKAGES) {
  const distDir = resolve(root, 'packages', pkg, 'dist');
  const manifestPath = resolve(distDir, 'package.json');

  if (!existsSync(manifestPath)) {
    console.error(`✗ ${pkg}: dist/package.json not found. Skipping.`);
    continue;
  }

  const { name, version } = JSON.parse(readFileSync(manifestPath, 'utf8'));

  let alreadyPublished = false;

  try {
    const existing = execSync(`npm view ${name}@${version} version`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();

    alreadyPublished = existing === version;
  } catch {
    alreadyPublished = false;
  }

  if (alreadyPublished) {
    console.log(`• ${name}@${version} already published`);
    continue;
  }

  console.log(`↑ Publishing ${name}@${version}`);

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

  try {
    execSync(`git tag ${name}@${version}`, {
      stdio: 'inherit',
    });

    createdTags.push(`${name}@${version}`);

    console.log(`New tag: ${name}@${version}`);
  } catch {
    console.log(`Tag ${name}@${version} already exists.`);
  }

  publishedCount++;
}

if (createdTags.length) {
  console.log('Pushing git tags...');

  execSync('git push --tags', {
    stdio: 'inherit',
  });
}

console.log(
  publishedCount
    ? `Published ${publishedCount} package(s).`
    : 'Nothing new to publish.'
);