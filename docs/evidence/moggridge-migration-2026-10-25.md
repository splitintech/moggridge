# Standalone Moggridge migration verification — 2026-10-25

Verified from the standalone checkout with Node 24.13.0, using fresh lockfile installs.

| Check | Result |
| --- | --- |
| Source migration | All 201 files retained; runtime, public lab assets, banner and license hashes match the consolidated snapshot. |
| TypeScript, library build, lab build | Passed. |
| Core/web/legacy unit tests | 88 passed in 19 files. |
| Release helper tests | 3 passed. |
| Packed exports | All declared exports resolve with declarations and platform isolation. |
| Fresh web consumers | React 18.3.1 and 19.3.0: ESM/CJS context sharing, SSR, TypeScript, Vite and no native engines passed. |
| Browser regression suite | 19 passed across Chromium, Firefox and WebKit; 2 intentional skips because visual artifact capture runs only on Chromium. |
| Native fixture TypeScript | Passed. |
| Native contracts | 20 passed in 4 suites. |
| Packed Expo Metro exports | iOS and Android Hermes bundles passed. |
| Packed bare Metro bundle | Android bundle passed. |
| Release qualification | Blocked: preserved qualification source digest does not match the migrated source. |

A clean bare-native install exposed inconsistent picomatch lockfile placement.
Regenerating that fixture lockfile repaired installation without changing its
direct dependency versions. The web lab explicitly uses an empty PostCSS plugin
configuration so an enclosing checkout cannot inject application build settings.

This evidence does not claim native compilation, physical-device execution,
installed-PWA acceptance, current source-bound release qualification, npm
publication or production deployment. Source migration preserves existing behavior.

The standalone CSS recheck exposed a race in the browser test: tab navigation
started while the expanded player was temporarily clipped by the opening spring.
The test now waits for the fullscreen destination and player visibility before
checking keyboard reachability, retaining the actual keyboard-focus assertion.
Five consecutive Chromium repetitions passed after this timing correction.
