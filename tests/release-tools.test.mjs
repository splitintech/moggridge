import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const run = (script, args, env = process.env) => spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8' });
test('standalone package accepts its matching release tag', () => {
  const result = run('scripts/assert-release-tag.mjs', ['--tag', `react-mobile-interactions-v${pkg.version}`, '--prefix', 'react-mobile-interactions-v', '--package', 'package.json']);
  assert.equal(result.status, 0, result.stderr);
});
test('standalone package rejects a mismatched release tag', () => {
  const result = run('scripts/assert-release-tag.mjs', ['--tag', 'react-mobile-interactions-v0.0.0', '--prefix', 'react-mobile-interactions-v', '--package', 'package.json']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tag expects 0.0.0/);
});
test('publisher rejects token authentication before accessing the registry', () => {
  const result = run('scripts/oidc-npm-publish.mjs', ['--cwd', '.'], { ...process.env, NODE_AUTH_TOKEN: 'test-only-invalid-token' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be unset/);
});
