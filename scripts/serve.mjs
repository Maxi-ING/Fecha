// Servidor estático SOLO para probar en tu PC. Vercel publica public/ directamente.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

export function createStaticServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Método no permitido.');
    }
    try {
      const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(ROOT, route === '/' ? 'index.html' : `.${route}`);
      if (!file.startsWith(ROOT) || route.includes('\\')) {
        res.writeHead(404);
        return res.end('Página no encontrada.');
      }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      res.writeHead(['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 400);
      res.end('Página no encontrada.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  createStaticServer().listen(port, '127.0.0.1', () => console.log(`Dedicatoria: http://localhost:${port}`));
}
