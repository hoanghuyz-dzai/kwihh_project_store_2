// Shared helpers: HttpError, tiny Zod-like validators, logging.
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (message, status = 400) => new HttpError(status, message);
const fail = msg => bad(msg || 'Dữ liệu không hợp lệ.');
const v = {
  str(x, { min = 1, max = 200, re, msg } = {}) {
    if (typeof x !== 'string') throw fail(msg);
    const s = x.trim();
    if (s.length < min || s.length > max || (re && !re.test(s))) throw fail(msg);
    return s;
  },
  int(x, { min = 0, max = 1_000_000_000, msg } = {}) {
    if (!Number.isInteger(x) || x < min || x > max) throw fail(msg || 'Số không hợp lệ.');
    return x;
  },
  oneOf(x, list, msg) { if (!list.includes(x)) throw fail(msg); return x; },
  id(x) { const n = Number(x); if (!Number.isInteger(n) || n < 1) throw bad('ID không hợp lệ.'); return n; },
  bool(x) { if (typeof x !== 'boolean') throw fail(); return x; },
};
const SLUG = /^[a-z0-9]{2,20}$/;
const now = () => new Date().toISOString();
const log = (...a) => console.log(now(), ...a); // never pass passwords/tokens here
module.exports = { HttpError, bad, v, SLUG, now, log };
