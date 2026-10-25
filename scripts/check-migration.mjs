import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('docs/migration/source-files.json'));
for (const file of manifest.files) {
  assert.ok(existsSync(resolve(root, file.path)), `Missing migrated file: ${file.path}`);
  if (process.argv.includes('--snapshot') && (/^src\//.test(file.path) || file.path === 'docs/banner.webp' || file.path === 'LICENSE' || /^examples\/web\/public\//.test(file.path))) {
    const digest = createHash('sha256').update(readFileSync(resolve(root, file.path))).digest('hex');
    assert.equal(digest, file.sha256, `Migration changed original source: ${file.path}`);
  }
}
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.name, '@splitin/react-mobile-interactions');
assert.equal(pkg.repository.url, 'git+https://github.com/splitintech/moggridge.git');
assert.equal(pkg.repository.directory, undefined);
for (const doc of ['README.md', 'CONTRIBUTING.md', 'docs/migration.md', 'docs/publishing.md']) {
  for (const match of read(doc).matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/.test(target)) continue;
    assert.ok(existsSync(resolve(root, dirname(doc), target)), `${doc}: broken link ${target}`);
  }
}
for (const helper of ['assert-release-tag', 'oidc-npm-publish']) assert.ok(existsSync(resolve(root, `scripts/${helper}.mjs`)));
console.log(`Migration verified: ${manifest.files.length} source files, repository metadata and documentation links${process.argv.includes('--snapshot') ? ', original runtime and asset hashes' : ''}.`);
