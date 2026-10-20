import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { dedication } from '../public/config.js';
import { validateConfig, targetTimestamp } from '../public/date.js';
import { createStaticServer } from '../scripts/serve.mjs';

test('a past birthday remains fixed rather than advancing to another year', () => {
  const config = validateConfig({ ...dedication, date: '2000-01-01', time: '00:00', timezone: 'America/Lima' });
  assert.equal(new Date(targetTimestamp(config)).toISOString(), '2000-01-01T05:00:00.000Z');
});

test('the static site serves its modules without an API or an editor', async () => {
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const html = await (await fetch(base)).text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
    assert.ok(scripts.length > 0);
    const seen = new Set();
    while (scripts.length) {
      const script = scripts.shift();
      if (seen.has(script)) continue;
      seen.add(script);
      const response = await fetch(base + script);
      assert.equal(response.status, 200, script);
      assert.match(response.headers.get('content-type'), /javascript/);
      const body = await response.text();
      assert.ok(!body.includes('/api/'), 'browser modules must not depend on the removed API');
      for (const match of body.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        scripts.push(new URL(match[1], base + script).pathname);
      }
    }
    assert.ok(seen.has('/config.js'));
    assert.ok(seen.has('/date.js'));
    for (const route of ['/style.css', '/favicon.svg']) assert.equal((await fetch(base + route)).status, 200);
    for (const route of ['/edit', '/edit.html', '/editor.js', '/api/config', '/api/session', '/.env', '/package.json', '/scripts/serve.mjs']) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
