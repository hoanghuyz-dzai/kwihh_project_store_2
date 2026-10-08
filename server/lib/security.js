// Password hashing (scrypt + per-user salt), persistent sessions, rate limiting.
const crypto = require('crypto');
const cfg = require('./../config');

const hashPassword = pw => {
  const salt = crypto.randomBytes(16);
  return `s$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
const verifyPassword = (pw, stored) => {
  const [, salt, key] = stored.split('$');
  const derived = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(derived, Buffer.from(key, 'hex'));
};
const DUMMY_HASH = hashPassword('dummy-password'); // equalises timing for unknown usernames

const sha = t => crypto.createHash('sha256').update(t).digest('hex');
function createSession(store, userId) {
  const token = crypto.randomBytes(32).toString('hex'); // only the hash is stored
  store.transaction(() => {
    store.remove('sessions', s => s.expires < Date.now());
    store.insert('sessions', { token_hash: sha(token), user_id: userId, expires: Date.now() + cfg.sessionDays * 864e5 });
  });
  return token;
}
function userFromToken(store, token) {
  if (!token) return null;
  const s = store.find('sessions', x => x.token_hash === sha(token));
  if (!s || s.expires < Date.now()) return null;
  const u = store.get('users', s.user_id);
  return u && u.status === 'active' ? u : null;
}
const destroySession = (store, token) => token && store.transaction(() => store.remove('sessions', s => s.token_hash === sha(token)));
const destroyUserSessions = (store, uid) => store.remove('sessions', s => s.user_id === uid);

const hits = new Map();
function rateLimited(key, max, windowMs) {
  const t = Date.now(), arr = (hits.get(key) || []).filter(x => t - x < windowMs);
  arr.push(t); hits.set(key, arr);
  return arr.length > max;
}
module.exports = { hashPassword, verifyPassword, DUMMY_HASH, createSession, userFromToken, destroySession, destroyUserSessions, rateLimited };
