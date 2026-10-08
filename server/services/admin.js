// Admin operations. Every important action writes an admin_logs row.
const fs = require('fs');
const path = require('path');
const { bad, v, SLUG } = require('../lib/util');
const sec = require('../lib/security');
const { fileDir } = require('../config');
const { toDto } = require('./shop');
const { pub } = require('./accounts');
const { priceTag } = require('./fileResolver');

const logAdmin = (store, adminId, action, target, metadata = {}) => store.insert('admin_logs', { admin_id: adminId, action, target: String(target), metadata });

function stats(store) {
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  return {
    users: store.data.users.length, orders: store.data.orders.length, services: store.data.services.filter(s => s.active).length,
    revenue: sum(store.data.orders, o => o.price), total_balance: sum(store.data.users, u => u.balance),
    pending_deposits: store.list('bank_deposits', d => d.status === 'pending').length,
  };
}
const listUsers = (store, q) => store.list('users', u => !q || u.username.toLowerCase().includes(q.toLowerCase())).map(pub);
function adjustBalance(store, admin, id, b) {
  const amount = v.int(b.amount, { min: -100_000_000, max: 100_000_000, msg: 'Số tiền không hợp lệ.' });
  if (amount === 0) throw bad('Số tiền không hợp lệ.');
  const reason = v.str(b.reason ?? 'admin adjust', { min: 0, max: 200 }) || 'admin adjust';
  return store.transaction(() => {
    const u = store.get('users', id); if (!u) throw bad('Không tìm thấy user.', 404);
    if (u.balance + amount < 0) throw bad('Số dư không thể âm.');
    u.balance += amount; u.updated_at = new Date().toISOString();
    store.insert('transactions', { user_id: u.id, admin_id: admin.id, type: amount > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE', amount, status: 'success', ref: 'admin', note: reason });
    logAdmin(store, admin.id, 'BALANCE_CHANGE', u.username, { amount, reason });
    return { balance: u.balance };
  });
}
function setUserState(store, admin, id, b) {
  if (id === admin.id) throw bad('Không thể tự khóa hoặc đổi quyền chính mình.');
  return store.transaction(() => {
    const u = store.get('users', id); if (!u) throw bad('Không tìm thấy user.', 404);
    if ('role' in b) u.role = v.oneOf(b.role, ['user', 'admin'], 'Role không hợp lệ.');
    if ('status' in b) { u.status = v.oneOf(b.status, ['active', 'locked'], 'Trạng thái không hợp lệ.'); if (u.status === 'locked') sec.destroyUserSessions(store, u.id); }
    logAdmin(store, admin.id, 'USER_UPDATE', u.username, { role: u.role, status: u.status });
    return { ok: true };
  });
}
function serviceFields(b) {
  const category = v.str(b.category, { re: SLUG, msg: 'Category chỉ gồm a-z, 0-9 (2-20 ký tự).' });
  const type = v.str(b.type, { re: SLUG, msg: 'Type chỉ gồm a-z, 0-9 (2-20 ký tự).' });
  return { category, type, name: v.str(b.name, { max: 80 }), description: v.str(b.description ?? '', { min: 0, max: 500 }), price: v.int(b.price, { min: 1000, max: 50_000_000, msg: 'Giá không hợp lệ.' }), active: b.active === false ? false : true };
}
const listServices = store => store.list('services').map(toDto);
function createService(store, admin, b) {
  const f = serviceFields(b);
  return store.transaction(() => {
    if (store.find('services', s => s.category === f.category && s.type === f.type && s.price === f.price)) throw bad('Dịch vụ này (category/type/giá) đã tồn tại.', 409);
    const s = store.insert('services', f); logAdmin(store, admin.id, 'SERVICE_CREATE', s.id, f); return { id: s.id };
  });
}
function updateService(store, admin, id, b) {
  const f = serviceFields(b);
  return store.transaction(() => {
    const s = store.get('services', id); if (!s) throw bad('Dịch vụ không tồn tại.', 404);
    if (store.find('services', o => o.id !== id && o.category === f.category && o.type === f.type && o.price === f.price)) throw bad('Dịch vụ này đã tồn tại.', 409);
    logAdmin(store, admin.id, 'SERVICE_UPDATE', id, { from: { price: s.price, active: s.active }, to: f }); Object.assign(s, f); return { ok: true };
  });
}
function deleteService(store, admin, id) { // soft delete keeps order history valid
  return store.transaction(() => { const s = store.get('services', id); if (!s) throw bad('Dịch vụ không tồn tại.', 404); s.active = false; logAdmin(store, admin.id, 'SERVICE_DELETE', id, { name: s.name }); return { ok: true }; });
}
function listFiles() {
  fs.mkdirSync(fileDir, { recursive: true });
  return fs.readdirSync(fileDir).filter(n => /^[a-z0-9]+\.zip$/.test(n)).map(n => ({ name: n, size: fs.statSync(path.join(fileDir, n)).size }));
}
function uploadFile(store, admin, b) {
  const name = v.str(b.name, { max: 80, re: /^[a-z0-9]+\.zip$/, msg: 'Tên file dạng bottelegram20k.zip (a-z, 0-9).' });
  const buf = Buffer.from(typeof b.data === 'string' ? b.data : '', 'base64');
  if (buf.length < 4 || buf.length > 10 * 1024 * 1024) throw bad('File phải nhỏ hơn 10MB.');
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw bad('Chỉ nhận file .zip hợp lệ.');
  fs.mkdirSync(fileDir, { recursive: true });
  fs.writeFileSync(path.join(fileDir, name), buf);
  store.transaction(() => logAdmin(store, admin.id, 'FILE_UPLOAD', name, { bytes: buf.length }));
  return { ok: true };
}
const listOrders = store => store.list('orders').reverse().map(o => ({ ...o, username: (store.get('users', o.user_id) || {}).username }));
module.exports = { logAdmin, stats, listUsers, adjustBalance, setUserState, listServices, createService, updateService, deleteService, listFiles, uploadFile, listOrders, priceTag };
