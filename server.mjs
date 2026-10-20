import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defaultConfig, validateConfig, targetTimestamp, TIME_ZONES } from './lib/config.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SESSION_TTL = 8 * 60 * 60 * 1000;
const BODY_LIMIT = 24 * 1024;
const PUBLIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/edit', ['edit.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/tree.js', ['tree.js', 'text/javascript; charset=utf-8']],
  ['/editor.js', ['editor.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) {
    throw Object.assign(new Error('Envía un formulario válido.'), { status: 415 });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw Object.assign(new Error('El mensaje es demasiado largo.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('El formulario no es válido.'), { status: 400 }); }
}

/** File-backed server: shared edits survive reloads and restarts on persistent storage. */
export async function createApp(options = {}) {
  const dataDir = path.resolve(options.dataDir || process.env.DATA_DIR || path.join(ROOT, '.data'));
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const configPath = path.join(dataDir, 'dedication.json');
  const atomicWrite = async (config) => {
    const temp = `${configPath}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    await rename(temp, configPath);
  };
  let config;
  try { config = validateConfig(JSON.parse(await readFile(configPath, 'utf8'))); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('No se pudo leer la dedicatoria guardada. Revisa el archivo de datos.', { cause: error });
    config = defaultConfig();
    await atomicWrite(config);
  }
  let password = options.password || process.env.EDIT_PASSWORD;
  let generatedPassword;
  if (!password) {
    const keyPath = path.join(dataDir, 'edit-key');
    try { password = (await readFile(keyPath, 'utf8')).trim(); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      password = randomBytes(18).toString('base64url');
      await writeFile(keyPath, password, { mode: 0o600, flag: 'wx' });
    }
    generatedPassword = password;
  }
  const salt = randomBytes(16);
  const passwordHash = scryptSync(password, salt, 32);
  password = undefined;
  const sessions = new Map();
  const attempts = new Map();
  const secure = options.secureCookies ?? (process.env.COOKIE_SECURE === 'true');
  // Keep the login throttler bounded. Proxy headers are deliberately not trusted.
  const maintenance = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions) if (value.expires < now) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  }, 60000).unref();
  const cookie = (token, maxAge) => `fecha_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const sessionFor = req => {
    const token = /(?:^|;\s*)fecha_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    const session = sessions.get(token);
    if (!session || session.expires < Date.now()) { sessions.delete(token); return null; }
    return { ...session, token };
  };
  const publicConfig = () => ({ ...config, targetTimestamp: targetTimestamp(config) });
  let saveQueue = Promise.resolve();

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname.replace(/\/$/, '') || '/';
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Browser writes must originate from this host; CSRF token protects saves too.
        const origin = req.headers.origin;
        if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && new URL(origin).host !== req.headers.host)) {
          return json(403, { error: 'Abre el editor desde esta página para guardar.' });
        }
      }
      if (route === '/api/config' && req.method === 'GET') return json(200, publicConfig());
      if (route === '/api/session' && req.method === 'GET') {
        const session = sessionFor(req);
        return session ? json(200, { csrf: session.csrf, timezones: TIME_ZONES }) : json(401, { error: 'Introduce tu clave para editar.' });
      }
      if (route === '/api/session' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'local';
        const now = Date.now();
        let attempt = attempts.get(ip);
        if (!attempt || attempt.until < now) attempt = { count: 0, until: now + 15 * 60000 };
        if (attempt.count >= 10) return json(429, { error: 'Demasiados intentos. Inténtalo en 15 minutos.' });
        const input = await readJson(req);
        attempt.count++;
        attempts.set(ip, attempt);
        if (typeof input.password !== 'string' || input.password.length > 512 || !timingSafeEqual(scryptSync(input.password, salt, 32), passwordHash)) {
          return json(401, { error: 'La clave no es correcta.' });
        }
        attempts.delete(ip);
        const previous = sessionFor(req);
        if (previous) sessions.delete(previous.token);
        const token = randomBytes(32).toString('hex');
        const csrf = randomBytes(24).toString('hex');
        sessions.set(token, { csrf, expires: now + SESSION_TTL });
        res.setHeader('Set-Cookie', cookie(token, SESSION_TTL / 1000));
        return json(200, { csrf, timezones: TIME_ZONES });
      }
      if (route === '/api/session' && req.method === 'DELETE') {
        const session = sessionFor(req);
        if (session && req.headers['x-csrf-token'] !== session.csrf) return json(403, { error: 'Vuelve a entrar al editor.' });
        if (session) sessions.delete(session.token);
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(200, { ok: true });
      }
      if (route === '/api/config' && req.method === 'PUT') {
        const session = sessionFor(req);
        if (!session) return json(401, { error: 'Tu sesión terminó. Vuelve a introducir tu clave.' });
        if (req.headers['x-csrf-token'] !== session.csrf) return json(403, { error: 'Vuelve a entrar al editor antes de guardar.' });
        const input = await readJson(req);
        let next;
        try { next = validateConfig(input); }
        catch (error) { return json(400, { error: error.message }); }
        saveQueue = saveQueue.catch(() => {}).then(async () => {
          await atomicWrite(next);
          config = next;
        });
        await saveQueue;
        return json(200, { ok: true, config: publicConfig() });
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        const file = PUBLIC_FILES.get(route);
        if (file) {
          if (route === '/edit') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          const body = await readFile(path.join(ROOT, 'public', file[0]));
          res.writeHead(200, { 'Content-Type': file[1], 'Content-Length': body.length });
          return res.end(req.method === 'HEAD' ? undefined : body);
        }
      }
      json(404, { error: 'No encontramos esa página.' });
    } catch (error) {
      if (!error.status) console.error('[fecha] Error de solicitud:', error.message);
      if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.' });
      else res.end();
    }
  });
  server.on('close', () => clearInterval(maintenance));
  return { server, generatedPassword };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { server, generatedPassword } = await createApp();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Fecha lista: http://localhost:${port}\nEditor: http://localhost:${port}/edit`);
    if (generatedPassword) console.log(`Tu clave de edición: ${generatedPassword}\nPuedes reemplazarla con EDIT_PASSWORD en .env.`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
