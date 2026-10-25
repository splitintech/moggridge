# Migration to Moggridge

Moggridge is the standalone home of `@splitin/react-mobile-interactions`:
https://github.com/splitintech/moggridge.

## What moved

All 201 source files in the consolidated local package snapshot were imported,
including the legacy runtime, core/web/native adapters, card motion, presets,
integrations, tests, documentation, assets and both native fixtures. The three
motion workflows and the two publishing helpers were also carried over. Runtime
source and the original `docs/banner.webp` are unchanged by this migration.
README, package metadata, workflow paths and contributor/release instructions were
adapted for a repository with the package at its root. A clean installation also
exposed inconsistent picomatch placement in the bare-native lockfile; it was
regenerated to place picomatch 4 with tinyglobby and retain picomatch 2 for
micromatch/jest-util. Direct fixture dependency versions are unchanged.

The npm package name remains `@splitin/react-mobile-interactions`, with the same
entrypoints and `react-mobile-interactions-v<version>` release tag convention.
The current `1.0.0-beta.1` source candidate is not published by this migration.

## History and provenance

The upstream main snapshot was `3e34ca2cb722e5970b6659c1d48e00363c2ed315` in
`splitintech/open-internal-tools`. History was filtered to the package directory,
its motion workflows and publishing helpers, then the package directory was
promoted to the repository root. Relevant author and commit history is retained;
commit IDs change because the paths and trees change. Some original commit
messages refer to other tools whose files are intentionally absent here.

[commit-map.txt](migration/commit-map.txt) maps original to filtered commit IDs.
[source-files.json](migration/source-files.json) records SHA-256 hashes for the
201-file consolidated snapshot from local source HEAD `8400df3`, including its
uncommitted consolidation work. That local work is recorded in the standalone
migration commit; unrelated local branch commits are not imported.

Run `npm run check:migration -- --snapshot` to check the migration's runtime,
asset and license hashes. Ordinary `check:migration` remains useful after later
runtime changes by validating the retained inventory and README links.

## SplitIn and retirement

SplitIn application providers, flags, wrappers, product screens and app-specific
tests stay in SplitIn. Its versioned vendor tarball is built from Moggridge; its
lab sync script accepts the Moggridge checkout. Those generated copies are
consumers, not a second editable library.

After the standalone repository is verified and available, the old
`open-internal-tools/react-mobile-interactions` folder is replaced by a migration
notice and its old publishing workflow is removed. Other tools and their shared
publishing helpers remain in the hub. Existing local recovery checkouts may be
retained as backups; new package work belongs in Moggridge.

## Qualification

Historical evidence is preserved with its original context. Moving the package
changes its source digest, so old qualification evidence is not current release
proof. Native/device, accessibility and release gates must be satisfied against
the new source before claiming a qualified release. npm trusted publishing must
also be configured for the new repository; see [publishing](publishing.md).
