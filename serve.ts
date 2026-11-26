// Tiny static server for local play-testing only (not part of the entry):
// serves game/ at http://localhost:8080 so the game opens in a desktop
// browser exactly as the grader's static host would serve it.
// Run: node serve.ts   (Node 22, standard library only)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!existsSync(path) || !path.startsWith(root)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8080, () => console.log('RIDGELINE at http://localhost:8080'));
