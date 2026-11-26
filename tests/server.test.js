// Integration tests for the local static server (PLAN.md §4.3).
// serve.ts serves game/ on localhost and refuses paths outside game/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 18099;

async function startServer() {
  const child = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const started = await new Promise((done) => {
    const timer = setTimeout(() => done(false), 5000);
    child.stdout.on('data', () => {
      clearTimeout(timer);
      done(true);
    });
    child.on('exit', () => {
      clearTimeout(timer);
      done(false);
    });
  });
  return { child, started };
}

test('serve.ts serves index.html with HTTP 200 and text/html', async () => {
  const { child, started } = await startServer();
  try {
    assert.equal(started, true, 'server did not start');
    const res = await fetch(`http://127.0.0.1:${PORT}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const text = await res.text();
    assert.ok(text.includes('<canvas'), 'index.html must contain the game canvas');
  } finally {
    child.kill();
  }
});

test('serve.ts serves each game module', async () => {
  const { child, started } = await startServer();
  try {
    assert.equal(started, true, 'server did not start');
    for (const mod of ['main.js', 'config.js', 'flight.js', 'missions.js', 'terrain.js']) {
      const res = await fetch(`http://127.0.0.1:${PORT}/src/${mod}`);
      assert.equal(res.status, 200, `GET /src/${mod} -> ${res.status}`);
    }
  } finally {
    child.kill();
  }
});

test('serve.ts refuses paths outside game/ (no traversal)', async () => {
  const { child, started } = await startServer();
  try {
    assert.equal(started, true, 'server did not start');
    const res = await fetch(`http://127.0.0.1:${PORT}/..%2F..%2FPLAN.md`);
    assert.ok(res.status === 403 || res.status === 404, `traversal answered ${res.status}`);
    const res2 = await fetch(`http://127.0.0.1:${PORT}/%2e%2e/%2e%2e/README.md`);
    assert.ok(res2.status === 403 || res2.status === 404, `traversal answered ${res2.status}`);
  } finally {
    child.kill();
  }
});
