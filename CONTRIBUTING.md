# Contributing & Releasing

This is an npm-workspaces monorepo. All packages live under `packages/*` and are
released **together, in lockstep** via [Changesets](https://github.com/changesets/changesets).

## Setup

```bash
npm install      # installs & links all workspaces
npm run build    # builds core -> angular -> react -> vue
npm run typecheck
```

## Making a change that should be released

1. Make your code change on a branch and open a PR.
2. Add a changeset describing the change:

   ```bash
   npm run changeset
   ```

   Choose the bump type (patch / minor / major) and write a short summary. Because
   the four `photon-grid-*` packages are **fixed** together, selecting any one bumps
   them all to the same version. Commit the generated file in `.changeset/`.
3. Merge the PR into `main`.

## How releases happen (automated)

On every push to `main`, `.github/workflows/release.yml` runs the Changesets action:

- If there are pending changesets, it opens/updates a **"Version Packages"** PR that
  applies the version bumps + changelogs.
- When you merge that PR (so no changesets remain), the workflow **builds all packages
  and publishes them to npm** (`npm run release` → `scripts/publish-packages.mjs`),
  publishing each package from its `dist/` and creating GitHub Releases + tags.

Publishing is idempotent — a version already on npm is skipped.

## Required repository secret

Add an npm **automation** access token as the `NPM_TOKEN` repository secret
(Settings → Secrets and variables → Actions). It needs publish rights to
`photon-grid-core`, `photon-grid-react`, `photon-grid-angular`, and
`photon-grid-vue`. `GITHUB_TOKEN` is provided automatically.

## CI

`.github/workflows/ci.yml` builds and typechecks every push/PR (except `main`), so
broken builds are caught before merge.
