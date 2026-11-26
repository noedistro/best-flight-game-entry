// Gate-constraint tests (PLAN.md §4.4). Run against the real out/
// produced by main.ts. These are a local tripwire; the kit check and the
// server gate are the authoritative references / dossier checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = join(repo, 'out');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

test('out/ exists: main.ts has been run', () => {
  assert.ok(existsSync(out), 'run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` first');
  assert.ok(existsSync(join(out, 'dossier.json')));
  assert.ok(existsSync(join(out, 'game', 'index.html')));
});

test('game_files: no symlinks, <=993 entries, <=48 MiB, paths <=1000 bytes', () => {
  const gameDir = join(out, 'game');
  const files = walk(gameDir);
  assert.ok(files.length <= 993, `${files.length} files`);
  let total = 0;
  for (const file of files) {
    assert.ok(!lstatSync(file).isSymbolicLink(), `symlink: ${file}`);
    total += statSync(file).size;
    assert.ok(Buffer.byteLength(file, 'utf8') <= 1000, `path too long: ${file}`);
  }
  assert.ok(total <= 48 * 1024 * 1024, `game/ is ${total} bytes`);
  const index = statSync(join(gameDir, 'index.html'));
  assert.ok(index.isFile() && index.size <= 1024 * 1024);
});

test('references: no http/https/protocol-relative refs in index.html or modules', () => {
  const gameDir = join(out, 'game');
  const files = walk(gameDir).filter((f) => /\.(html|js|mjs|css)$/.test(f));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    assert.ok(!/https?:\/\//.test(stripped), `${file} contains an http(s) reference`);
    assert.ok(!/src\s*=\s*["']\/\//.test(stripped), `${file} contains a protocol-relative src`);
  }
});

test('references: every static import resolves to a file inside game/', () => {
  const gameDir = join(out, 'game');
  const files = walk(gameDir).filter((f) => /\.(js|mjs)$/.test(f));
  const importRe = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(importRe)) {
      const spec = match[1] ?? match[2];
      assert.ok(spec.startsWith('./') || spec.startsWith('../'),
        `${file} imports non-relative specifier ${spec}`);
      const target = resolve(join(file, '..'), spec);
      assert.ok(target.startsWith(gameDir), `${file} imports outside game/: ${spec}`);
      assert.ok(existsSync(target), `${file} imports missing file ${spec}`);
    }
  }
});

test('no import map is shipped', () => {
  const html = readFileSync(join(out, 'game', 'index.html'), 'utf8');
  assert.ok(!html.includes('type="importmap"'), 'an import map must not be shipped');
});

test('screenshots: exactly 4, valid names, <=256 KiB, 1280x720', () => {
  const shotsDir = join(out, 'screenshots');
  const names = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  assert.deepEqual(names, ['1-cover.jpg', '2-flight.jpg', '3-rings.jpg', '4-landing.jpg']);
  for (const name of names) {
    assert.ok(/^[A-Za-z0-9._-]+$/.test(name) && name.length >= 1 && name.length <= 128);
    assert.ok(!name.startsWith('.') && !name.startsWith('-'));
    const file = join(shotsDir, name);
    const size = statSync(file).size;
    assert.ok(size <= 256 * 1024, `${name} is ${size} bytes`);
    const bytes = readFileSync(file);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    assert.ok(isJpeg || isPng, `${name} is not a whole JPEG or PNG`);
    if (isJpeg) {
      // SOF0/SOF2 marker gives height then width (big-endian, after the length field).
      let width = 0;
      let height = 0;
      for (let i = 2; i < bytes.length - 9; i++) {
        if (bytes[i] === 0xff && (bytes[i + 1] === 0xc0 || bytes[i + 1] === 0xc2)) {
          height = bytes.readUInt16BE(i + 5);
          width = bytes.readUInt16BE(i + 7);
          break;
        }
      }
      assert.equal(width, 1280, `${name} width ${width}`);
      assert.equal(height, 720, `${name} height ${height}`);
    }
  }
});

test('dossier_matches: dossier.json is <=1.5 MiB and text cap holds', () => {
  const dossier = readFileSync(join(out, 'dossier.json'));
  assert.ok(dossier.length <= 1536 * 1024, `dossier.json is ${dossier.length} bytes`);
  const parsed = JSON.parse(dossier.toString('utf8'));
  assert.ok(parsed, 'dossier.json must parse as JSON');
});

test('title/count truth: title is 85-104 chars and every number is true', () => {
  const title = 'Arang Skylark — 5 missions, 3 airfields, 12 rings, fuel & damage, 240-second sorties over Teluk Arang';
  assert.ok(title.length >= 85 && title.length <= 104, `title is ${title.length} chars`);
  assert.equal(title.length, 101);
  const missions = readFileSync(join(repo, 'game', 'src', 'missions.js'), 'utf8');
  assert.ok(missions.includes("'ring-run'"));
  assert.ok(missions.includes("'mail-run'"));
});

test('js_parses: every game module parses (node --check)', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const gameDir = join(out, 'game');
  const files = walk(gameDir).filter((f) => /\.(js|mjs)$/.test(f));
  assert.ok(files.length > 0);
  for (const file of files) {
    await run(process.execPath, ['--check', file]);
  }
});
