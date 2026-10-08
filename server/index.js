// HTTP entry point: static files, security headers, auth/authorization, error handling, logging.
const http = require('http'), fs = require('fs'), path = require('path');
const cfg = require('./config'), Store = require('./lib/store'), sec = require('./lib/security');
const { HttpError, bad, log } = require('./lib/util');
const { routes, STREAM } = require('./routes');
const seed = require('./seed');

const store = new Store(cfg.dbFile);
seed(store);
if (process.argv.includes('--seed')) { log('seed done'); process.exit(0); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'",
};
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0] && c[1]));
const clientIp = req => (cfg.trustProxy && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress);
const readBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > limit) { req.destroy(); reject(new HttpError(413, 'Dữ liệu quá lớn.')); } else chunks.push(c); });
  req.on('end', () => { try { resolve(size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(bad('JSON không hợp lệ.')); } });
  req.on('error', reject);
});
const send = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

function serveStatic(req, res, pathname) {
  let file = path.join(cfg.publicDir, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(cfg.publicDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(cfg.publicDir, 'index.html'); // SPA fallback
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).on('error', () => res.end()).pipe(res);
}
async function handleApi(req, res, url) {
  const route = routes.find(x => x.method === req.method && x.re.test(url.pathname));
  if (!route) throw bad('Không tìm thấy API.', 404);
  const hasBody = req.method === 'POST' || req.method === 'PATCH';
  // CSRF defence in depth: JSON-only bodies, same-origin only, SameSite=Strict cookie.
  if (hasBody && !(req.headers['content-type'] || '').startsWith('application/json')) throw bad('Cần Content-Type JSON.', 415);
  if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw bad('Origin không hợp lệ.', 403);
  const token = cookies(req).sid; let user = null;
  if (route.auth !== 'none') {
    user = sec.userFromToken(store, token);
    if (!user) throw bad('⚠️ Vui lòng đăng nhập.', 401);
    if (route.auth === 'admin' && user.role !== 'admin') throw bad('Không có quyền truy cập.', 403);
  }
  const cookieFlags = `HttpOnly; SameSite=Strict; Path=/${cfg.prod ? '; Secure' : ''}`;
  const ctx = {
    req, res, store, user, token, ip: clientIp(req), query: url.searchParams, params: url.pathname.match(route.re).slice(1),
    body: hasBody ? await readBody(req, route.limit || 1e5) : {},
    setSession: t => res.setHeader('Set-Cookie', `sid=${t}; ${cookieFlags}; Max-Age=${cfg.sessionDays * 86400}`),
    clearSession: () => res.setHeader('Set-Cookie', `sid=; ${cookieFlags}; Max-Age=0`),
  };
  const out = route.fn(ctx);
  if (out !== STREAM) send(res, 200, out);
}
const server = http.createServer(async (req, res) => {
  for (const [k, val] of Object.entries(HEADERS)) res.setHeader(k, val);
  const t0 = Date.now(), url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url); else serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (res.headersSent) res.end(); else send(res, status, { error: status === 500 ? 'Lỗi máy chủ.' : e.message });
  }
  if (url.pathname.startsWith('/api/')) log(req.method, url.pathname, res.statusCode, `${Date.now() - t0}ms`);
});
if (require.main === module) server.listen(cfg.port, () => log(`Kwihh Project listening on :${cfg.port}`));
module.exports = { server, store };
