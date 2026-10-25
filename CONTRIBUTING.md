# Contributing to Moggridge

Use Node 22 or 24 and run `npm ci --legacy-peer-deps` from this repository root.
Start the interactive catalog with `npm run dev:lab`.

Before submitting changes, run:

```sh
npm run check:migration
npm run test:release-tools
npm run typecheck
npm test
npm run build
npm run check:package
npm run check:consumers
npm run build:lab
npx playwright install chromium firefox webkit
npm run test:browser
```

Keep the legacy root exports compatible. Add shared behavior to `src/core`, browser
adapters to `src/web`, and native adapters to `src/native`. Native runtime imports
must not enter the web or core entrypoints. Update the catalog and public API docs
when adding an interaction. Test cancellation, reversal, reduced motion, focus
restoration and disposal where relevant to the change.

The native fixtures have their own lockfiles and setup instructions:
[Expo](examples/native/README.md) and [bare React Native](examples/bare-native/README.md).
Unit and browser checks do not replace physical-device qualification.

The migration manifest records the original source snapshot. `check:migration`
checks inventory and documentation links; its optional `--snapshot` mode verifies
original runtime hashes and is intended for the migration, not later development.

See [publishing](docs/publishing.md) before cutting a release. A repository push
alone does not publish npm packages or qualify a stable release.
