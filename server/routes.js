// Route table. auth: 'none' | 'user' | 'admin'. Authorization is enforced in index.js before fn runs.
const fs = require('fs');
const { v } = require('./lib/util');
const accounts = require('./services/accounts'), shop = require('./services/shop'), bank = require('./services/bank'), admin = require('./services/admin');
const STREAM = Symbol('stream');
const routes = [];
const r = (method, p, auth, fn, limit) => routes.push({ method, auth, fn, limit, re: new RegExp('^' + p.replace(/:\w+/g, '([^/]+)') + '$') });

// ---- public / auth ----
r('GET', '/api/public/stats', 'none', ({ store }) => ({ users: store.data.users.length, orders: store.data.orders.length, services: store.data.services.filter(s => s.active).length }));
r('POST', '/api/auth/register', 'none', ({ store, body }) => accounts.register(store, body));
r('POST', '/api/auth/login', 'none', ({ store, body, ip, setSession }) => { const { user, token } = accounts.login(store, body, ip); setSession(token); return { user }; });
r('POST', '/api/auth/logout', 'user', ({ store, token, clearSession }) => { require('./lib/security').destroySession(store, token); clearSession(); return { ok: true }; });
r('GET', '/api/auth/me', 'user', ({ user }) => ({ user: accounts.pub(user) }));
r('GET', '/api/account', 'user', ({ user }) => ({ user: accounts.pub(user) }));
r('PATCH', '/api/account/password', 'user', ({ store, user, body }) => accounts.changePassword(store, user, body));

// ---- catalog / orders ----
r('GET', '/api/services', 'user', ({ store, query }) => ({ services: shop.listServices(store, query.get('category') || '', false) }));
r('GET', '/api/services/:id', 'user', ({ store, params }) => { const s = store.get('services', v.id(params[0])); if (!s || !s.active) throw require('./lib/util').bad('⚠️ Dịch vụ không tồn tại.', 404); return { service: shop.toDto(s) }; });
r('POST', '/api/orders', 'user', ({ store, user, body }) => shop.purchase(store, user.id, v.id(body.service_id)));
r('GET', '/api/orders', 'user', ({ store, user }) => ({ orders: shop.listOrders(store, user.id) }));
r('GET', '/api/orders/:id', 'user', ({ store, user, params }) => { const o = store.get('orders', v.id(params[0])); if (!o || o.user_id !== user.id) throw require('./lib/util').bad('Đơn hàng không hợp lệ.', 404); return { order: shop.orderDto(o) }; });
r('GET', '/api/orders/:id/download', 'user', ({ store, user, params, res }) => {
  const f = shop.prepareDownload(store, user.id, v.id(params[0]));
  res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${f.name}"` });
  fs.createReadStream(f.full).pipe(res); return STREAM;
});
r('GET', '/api/transactions', 'user', ({ store, user }) => ({ transactions: store.list('transactions', t => t.user_id === user.id).reverse().slice(0, 200).map(t => ({ id: t.id, type: t.type, amount: t.amount, status: t.status, note: t.note, created_at: t.created_at })) }));

// ---- bank ----
r('GET', '/api/bank/info', 'user', ({ store, user }) => bank.info(store, user));
r('GET', '/api/bank/qr', 'user', ({ store, res }) => {
  const q = bank.qrFile(store); if (!q || !fs.existsSync(q.full)) throw require('./lib/util').bad('Chưa có ảnh QR.', 404);
  res.writeHead(200, { 'Content-Type': q.mime, 'Cache-Control': 'no-cache' }); fs.createReadStream(q.full).pipe(res); return STREAM;
});
r('POST', '/api/bank/deposit', 'user', ({ store, user, body }) => bank.createDeposit(store, user, body));
r('GET', '/api/bank/deposits', 'user', ({ store, user }) => ({ deposits: bank.listDeposits(store, user.id) }));

// ---- admin ----
r('GET', '/api/admin/stats', 'admin', ({ store }) => admin.stats(store));
r('GET', '/api/admin/users', 'admin', ({ store, query }) => ({ users: admin.listUsers(store, query.get('q') || '') }));
r('PATCH', '/api/admin/users/:id/balance', 'admin', ({ store, user, params, body }) => admin.adjustBalance(store, user, v.id(params[0]), body));
r('PATCH', '/api/admin/users/:id', 'admin', ({ store, user, params, body }) => admin.setUserState(store, user, v.id(params[0]), body));
r('GET', '/api/admin/services', 'admin', ({ store }) => ({ services: admin.listServices(store) }));
r('POST', '/api/admin/services', 'admin', ({ store, user, body }) => admin.createService(store, user, body));
r('PATCH', '/api/admin/services/:id', 'admin', ({ store, user, params, body }) => admin.updateService(store, user, v.id(params[0]), body));
r('DELETE', '/api/admin/services/:id', 'admin', ({ store, user, params }) => admin.deleteService(store, user, v.id(params[0])));
r('GET', '/api/admin/files', 'admin', () => ({ files: admin.listFiles() }));
r('POST', '/api/admin/files', 'admin', ({ store, user, body }) => admin.uploadFile(store, user, body), 14e6);
r('GET', '/api/admin/orders', 'admin', ({ store }) => ({ orders: admin.listOrders(store) }));
r('GET', '/api/admin/bank', 'admin', ({ store }) => ({ settings: bank.settings(store) }));
r('PATCH', '/api/admin/bank', 'admin', ({ store, user, body }) => bank.updateSettings(store, user, body, admin.logAdmin));
r('POST', '/api/admin/bank/qr', 'admin', ({ store, user, body }) => bank.uploadQr(store, user, body, admin.logAdmin), 3.5e6);
r('GET', '/api/admin/bank/deposits', 'admin', ({ store }) => ({ deposits: bank.listDeposits(store, null) }));
r('POST', '/api/admin/bank/deposits/:id/approve', 'admin', ({ store, user, params }) => bank.decide(store, user, v.id(params[0]), 'approved', admin.logAdmin));
r('POST', '/api/admin/bank/deposits/:id/reject', 'admin', ({ store, user, params }) => bank.decide(store, user, v.id(params[0]), 'rejected', admin.logAdmin));
r('GET', '/api/admin/transactions', 'admin', ({ store }) => ({ transactions: store.data.transactions.slice(-200).reverse() }));
r('GET', '/api/admin/logs', 'admin', ({ store }) => ({ logs: store.data.admin_logs.slice(-200).reverse() }));
module.exports = { routes, STREAM };
