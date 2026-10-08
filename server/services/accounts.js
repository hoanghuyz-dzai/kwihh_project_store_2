// Authentication + account management.
const { bad, v } = require('../lib/util');
const sec = require('../lib/security');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pub = u => u && { id: u.id, username: u.username, email: u.email, balance: u.balance, role: u.role, status: u.status, created_at: u.created_at };
const password = (x, msg) => { if (typeof x !== 'string' || x.length < 8 || x.length > 100) throw bad(msg || 'Mật khẩu từ 8 đến 100 ký tự.'); return x; };

function register(store, b) {
  const email = v.str(b.email, { max: 120, re: EMAIL, msg: 'Email không hợp lệ.' }).toLowerCase();
  const username = v.str(b.username, { min: 3, max: 20, re: /^[a-zA-Z0-9_]+$/, msg: 'Tên tài khoản 3-20 ký tự (chữ, số, _).' });
  const pw = password(b.password);
  if (pw !== b.confirm) throw bad('Xác nhận mật khẩu không khớp.');
  const bd = v.str(b.birth_date, { max: 10, re: /^\d{4}-\d{2}-\d{2}$/, msg: 'Ngày sinh không hợp lệ.' });
  const t = Date.parse(bd);
  if (isNaN(t) || t > Date.now() || new Date(t).toISOString().slice(0, 10) !== bd) throw bad('Ngày sinh không hợp lệ.');
  return store.transaction(() => {
    if (store.find('users', u => u.username.toLowerCase() === username.toLowerCase())) throw bad('Tên tài khoản này đã được sử dụng.', 409);
    if (store.find('users', u => u.email === email)) throw bad('Email đã được đăng ký.', 409);
    store.insert('users', { email, username, password_hash: sec.hashPassword(pw), birth_date: bd, balance: 0, role: 'user', status: 'active', updated_at: new Date().toISOString() });
    return { message: 'Tạo tài khoản thành công!' };
  });
}
function login(store, b, ip) {
  const username = typeof b.username === 'string' ? b.username.trim().slice(0, 20) : '';
  if (sec.rateLimited('ip:' + ip, 10, 60_000) || sec.rateLimited('u:' + username.toLowerCase(), 10, 600_000)) throw bad('Thử lại sau ít phút.', 429);
  const u = store.find('users', x => x.username.toLowerCase() === username.toLowerCase());
  const pw = typeof b.password === 'string' ? b.password.slice(0, 100) : '';
  const ok = sec.verifyPassword(pw, u ? u.password_hash : sec.DUMMY_HASH) && u && u.status === 'active';
  if (!ok) throw bad('Sai tài khoản hoặc mật khẩu!', 401); // identical message for every failure
  return { user: pub(u), token: sec.createSession(store, u.id) };
}
function changePassword(store, user, b) {
  const next = password(b.new_password, 'Mật khẩu mới từ 8 đến 100 ký tự.');
  if (typeof b.old_password !== 'string' || !sec.verifyPassword(b.old_password.slice(0, 100), user.password_hash)) throw bad('Mật khẩu cũ không đúng.');
  store.transaction(() => { store.get('users', user.id).password_hash = sec.hashPassword(next); });
  return { message: 'Đổi mật khẩu thành công.' };
}
module.exports = { register, login, changePassword, pub };
