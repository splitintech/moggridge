import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: {...process.env, npm_config_cache: join(temporary, 'cache')} });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};
const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'splitin-motion-pack-'));
try {
  const [packed] = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  const unpacked = join(temporary, 'consumer');
  mkdirSync(unpacked);
  run('tar', ['-xzf', join(temporary, packed.filename), '-C', unpacked], root);
  const pkg = join(unpacked, 'package');
  const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  for (const [name, entry] of Object.entries(manifest.exports)) {
    if (typeof entry === 'string') { readFileSync(join(pkg, entry)); continue; }
    for (const target of Object.values(entry)) assert.ok(readFileSync(join(pkg, target)).length, `${name}: ${target}`);
  }
  const core = await import(pathToFileURL(join(pkg, 'dist/core/index.js')).href);
  assert.equal(core.snapTarget(90, 0, [0, 100, 200]), 100);
  assert.equal(core.resolveReducedMotion('system', true), true);
  assert.equal(core.resolveReducedMotion('never', true), false);
  run(process.execPath, ['-e', `const c=require(${JSON.stringify(join(pkg, 'dist/core/index.cjs'))});if(c.motionPresets.precise.mass!==0.5)process.exit(1)`], unpacked);
  const text = name => readFileSync(join(pkg, name), 'utf8');
  for (const name of ['dist/core/index.js', 'dist/core/index.cjs', 'dist/core/index.d.ts']) {
    assert.doesNotMatch(text(name), /(?:from\s*|require\()['"](?:react|react-dom|react-native|framer-motion)/, name);
  }
  for (const name of ['dist/web/index.js', 'dist/index.js']) assert.doesNotMatch(text(name), /from\s*['"](?:react-native|expo-)/, name);
  for (const name of ['dist/native/index.js', 'dist/native/index.d.ts']) assert.doesNotMatch(text(name), /(?:from\s*|import\()['"](?:react-dom|framer-motion|@radix-ui)/, name);
  assert.ok(!packed.files.some(file => /^(?:examples|node_modules|tests)\//.test(file.path)));
  console.log(JSON.stringify({ package: manifest.name, version: manifest.version, entrypoints: Object.keys(manifest.exports), tarballBytes: packed.size, integrity: packed.integrity, checks: 'passed' }, null, 2));
} finally { rmSync(temporary, { recursive: true, force: true }); }
