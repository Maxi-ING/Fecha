import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.mjs';

async function listen(options) {
  const app = await createApp(options);
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  return { ...app, base: `http://127.0.0.1:${app.server.address().port}` };
}
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }

test('editor login, authorization, CSRF, global persistence, restart and logout', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fecha-test-'));
  let app;
  try {
    app = await listen({ dataDir: dir, password: 'test-secret-value' });
    const get = route => fetch(app.base + route);
    const initial = await (await get('/api/config')).json();
    const main = await (await get('/')).text();
    assert.ok(!main.includes('/edit'), 'home never exposes the editor');
    assert.ok(!main.includes('test-secret-value'));
    const editor = await get('/edit');
    assert.equal(editor.status, 200);
    assert.equal(editor.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal((await get('/api/session')).status, 401);
    const change = { ...initial, recipient: 'Para ti', message: 'Hola ♥\n\nUn mensaje nuevo.', date: '2027-10-20', time: '12:30' };
    const save = headers => fetch(app.base + '/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(change) });
    assert.equal((await save({})).status, 401);
    const login = password => fetch(app.base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    assert.equal((await login('incorrect')).status, 401);
    const success = await login('test-secret-value');
    assert.equal(success.status, 200);
    const cookie = success.headers.get('set-cookie').split(';')[0];
    assert.match(success.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const session = await success.json();
    assert.equal((await save({ Cookie: cookie })).status, 403);
    assert.equal((await save({ Cookie: cookie, 'X-CSRF-Token': session.csrf, Origin: 'https://other.example' })).status, 403);
    assert.equal((await save({ Cookie: cookie, 'X-CSRF-Token': session.csrf })).status, 200);
    const shared = await (await get('/api/config')).json();
    assert.equal(shared.message, change.message);
    assert.equal(shared.targetTimestamp, Date.parse('2027-10-20T17:30:00Z'));
    const invalid = await fetch(app.base + '/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': session.csrf }, body: JSON.stringify({ ...change, date: '2027-02-30' }) });
    assert.equal(invalid.status, 400);
    assert.equal(JSON.parse(await readFile(path.join(dir, 'dedication.json'), 'utf8')).message, change.message);
    const logout = await fetch(app.base + '/api/session', { method: 'DELETE', headers: { Cookie: cookie, 'X-CSRF-Token': session.csrf } });
    assert.equal(logout.status, 200);
    assert.equal((await save({ Cookie: cookie, 'X-CSRF-Token': session.csrf })).status, 401);
    for (const route of ['/.env', '/server.mjs', '/.data/dedication.json', '/.data/edit-key']) assert.equal((await get(route)).status, 404);
    await close(app.server);
    app = await listen({ dataDir: dir, password: 'test-secret-value' });
    assert.equal((await (await get('/api/config')).json()).message, change.message);
  } finally {
    if (app?.server.listening) await close(app.server);
    await rm(dir, { recursive: true, force: true });
  }
});

test('generated access key survives restarts and login attempts are limited', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fecha-key-'));
  let app;
  try {
    app = await listen({ dataDir: dir });
    assert.ok(app.generatedPassword.length >= 24);
    const key = app.generatedPassword;
    await close(app.server);
    app = await listen({ dataDir: dir });
    assert.equal(app.generatedPassword, key);
    for (let i = 0; i < 10; i++) {
      const r = await fetch(app.base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) });
      assert.equal(r.status, 401);
    }
    const r = await fetch(app.base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: key }) });
    assert.equal(r.status, 429);
  } finally {
    if (app?.server.listening) await close(app.server);
    await rm(dir, { recursive: true, force: true });
  }
});
