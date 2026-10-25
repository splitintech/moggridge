# Current native verification after source recovery

Verified on 2026-10-25 against the reconstructed tree:

- Native TypeScript check (`examples/native/tsconfig.check.json`): exit 0.
- Native Jest: four suites, 20 tests passed, exit 0 (31.617 seconds). The suites cover interaction contracts, overlays, hosts, and completion. A redundant second run was stopped during host resource contention; it is not counted as verification.
- Packed-package Expo Metro export: Android 1,266 modules and iOS 1,268 modules; both Hermes bundles approximately 3.3 MB; deterministic continuity media asset included; exit 0.
- Packed-package bare React Native Android Metro release-mode JavaScript bundle: approximately 1.8 MB; exit 0.
- Packed native source is byte-identical to the recovered native source checked here. Metro logged actual package export resolution: `/native` resolves its `react-native` condition to packed `src/native/index.ts`, and `/core` resolves packed `dist/core/index.js`. Fixture configuration did not bypass packed exports.

The packed runs used Node 24.13.0 and `--max-workers 2`. Early attempts with the shell's default Node 18 failed before bundling because Metro requires newer Node APIs; those attempts are not counted. Artifact paths, byte sizes, and SHA-256 digests are recorded in `native-recovery-artifacts.json`.

The bare fixture's Android and iOS projects and Gemfile were regenerated with official community CLI 20.2.0 and React Native 0.88.0 using `--skip-install --skip-git-init`. Existing fixture source/configuration was preserved. A mistakenly nested duplicate native fixture manifest from a historical failed command was removed.

Native release compilation, physical-device gestures/accessibility, installed-PWA behavior, and device frame pacing remain unqualified. This machine selects `/Library/Developer/CommandLineTools`, has no full Xcode installation or available Android adb, and `java -version` reports no Java runtime. Metro and mock-based contracts do not establish native compilation or physical-device results.
