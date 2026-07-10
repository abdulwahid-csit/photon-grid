# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Every change that should trigger a release needs a changeset. Add one with:

```bash
npm run changeset
```

Pick the packages and the bump type (major / minor / patch), then write a short
summary. All four `photon-grid-*` packages are **fixed** together, so they always
version and release in lockstep — selecting any one bumps them all.

On merge to `main`, the release workflow opens (or updates) a **"Version Packages"**
PR that applies the accumulated changesets. Merging that PR builds every package
and publishes them to npm.
