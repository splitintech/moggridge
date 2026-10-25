# Release and rollback

The working version is `1.0.0-beta.1`. It is an implementation candidate, not a statement that npm has this version. The observed public baseline was `0.1.0`. Publication occurs only after `check:release` passes.

## Qualification

1. Install using Node22/24 and `npm ci --legacy-peer-deps` (root development dependencies intentionally include React18 web and RN0.88 type fixtures; isolated native consumers use React19.3).
2. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run check:package`, `npm run check:consumers`, `npm run build:lab`, and `npm run test:browser` with Chromium, Firefox and WebKit installed.
3. Install each native fixture from its lockfile. Run native tests, fixture typechecks, packed-package Expo exports and bare Metro bundles. Native compilation and physical tests remain additional gates.
4. Record honest gate status and evidence in `qualification.json`. A pending/failed required gate makes `check:release` fail. A beta requires automated core/compatibility/package/web/native evidence. Stable additionally requires completed SplitIn rollout, installed-PWA checks, and physical iOS/Android qualification bound to the release commit.
5. Stable evidence must be an external `motion-release-qualification` artifact whose `qualification.json` names the exact build SHA. Supply its GitHub Actions run ID through the workflow input or `MOTION_QUALIFICATION_RUN_ID` repository variable. Local checks accept `MOTION_QUALIFICATION_FILE`; keeping SHA-bound evidence external avoids a self-referential commit hash. Use the existing signed-tag/OIDC workflow. A version containing a prerelease suffix goes to npm `beta`; GitHub tags for prereleases create prereleases. Do not reuse a published version.
6. Verify `npm view @splitin/react-mobile-interactions version dist-tags dist.integrity`, provenance, release visibility, and fresh consumer installation. Install the exact published version into SplitIn and regenerate its lockfile.

## Local SplitIn integration

Before a qualified beta is published, SplitIn uses the exact versioned `vendor/splitin-react-mobile-interactions-1.0.0-beta.1.tgz` artifact. This is a packed dependency, not a second editable package source. Rebuild/repack from the canonical `splitintech/moggridge` checkout to refresh it. Replace the `file:` dependency with the exact registry version only after verifying the release.

All motion flags default off. They are Vite environment flags and require a deployment to change; they are not remotely mutable runtime switches. Family flags require the master flag. Test both paths on actual consuming routes before rollout.

## Rollback

Disable the master flag and redeploy to restore legacy component paths. If package-level rollback is needed, revert the package version/lockfile together with the integration commit; version0.1 lacks the new subpath imports and cannot be substituted alone. Retain prior deployment artifacts. Preserve media URLs, application state, analytics and business decisions independently of animation.
