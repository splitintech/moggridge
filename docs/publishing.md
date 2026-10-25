# Publishing Moggridge

The npm identity remains `@splitin/react-mobile-interactions`. Repository migration
does not publish a version, change existing registry releases or transfer npm
permissions. All commands below run from the Moggridge repository root.

## Trusted publisher configuration

An npm package owner must configure its GitHub Actions trusted publisher for:

- Organization: `splitintech`
- Repository: `moggridge`
- Workflow filename: `react-mobile-interactions-publish.yml`

The previous `open-internal-tools` publisher configuration does not authorize this
repository. Complete this setup before attempting a release. Do not add an npm
token: the workflow uses GitHub OIDC and provenance.

## Qualification and validation

Run the checks in [CONTRIBUTING](../CONTRIBUTING.md), then follow
[release qualification](release.md). Preserved evidence is historical; its source
digest must match the candidate. Native/device qualification is separate from
unit tests and Metro exports. Never mark a gate passed merely to unblock publishing.

The native workflow produces build artifacts. Assemble source-bound qualification
evidence separately as a `motion-release-qualification` artifact and supply its
run ID through the publish workflow's `qualification_run_id` dispatch input
or repository variable `MOTION_QUALIFICATION_RUN_ID`. `check:release` evaluates
required evidence before publication.

## Tag and publish

After qualification, with a clean tree, matching package and lockfile versions,
and Git tag signing configured:

```sh
version=$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')
node scripts/assert-release-tag.mjs --tag "react-mobile-interactions-v$version" --prefix react-mobile-interactions-v --package package.json
git tag -s "react-mobile-interactions-v$version" -m "Moggridge $version"
git push origin "react-mobile-interactions-v$version"
```

The tag starts `.github/workflows/react-mobile-interactions-publish.yml`.
The workflow installs, tests, builds, checks the archive and release evidence,
asserts the tag version, publishes with provenance and creates a GitHub Release.
Prerelease versions use npm's `beta` dist-tag; stable versions use `latest`.
Already published versions are skipped. The workflow can also be dispatched
manually, which can publish but does not create a tagged GitHub Release.

After publication, verify the registry version, integrity, provenance and dist-tag,
then install that exact version in a fresh consumer before updating SplitIn.
