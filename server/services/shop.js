// Catalog, purchase and download logic. Prices/files ALWAYS come from the database, never the client.
const { bad, v } = require('../lib/util');
const { resolveProductFile, inspect } = require('./fileResolver');

const toDto = s => ({ id: s.id, category: s.category, type: s.type, name: s.name, description: s.description, price: s.price, active: s.active, hasFile: !!(resolveProductFile(s.category, s.type, s.price) || {}).exists });
function listServices(store, category, includeInactive) {
  return store.list('services', s => (includeInactive || s.active) && (!category || s.category === category))
    .sort((a, b) => a.type.localeCompare(b.type) || a.price - b.price).map(toDto);
}
function purchase(store, userId, serviceId) {
  return store.transaction(() => {
    const user = store.get('users', userId);
    if (!user || user.status !== 'active') throw bad('⚠️ Vui lòng đăng nhập.', 401);
    const svc = store.get('services', serviceId);
    if (!svc || !svc.active) throw bad('⚠️ Dịch vụ không tồn tại.', 404);
    const file = resolveProductFile(svc.category, svc.type, svc.price);
    if (!file || !file.exists) throw bad('⚠️ File sản phẩm hiện chưa được cập nhật.', 422); // checked BEFORE charging
    if (user.balance < svc.price) throw bad('⚠️ Số dư không đủ.', 402);
    user.balance -= svc.price; user.updated_at = new Date().toISOString();
    const order = store.insert('orders', { user_id: user.id, service_id: svc.id, service_name: svc.name, price: svc.price, status: 'paid', file_name: file.name });
    store.insert('transactions', { user_id: user.id, type: 'PURCHASE', amount: -svc.price, status: 'success', ref: `order#${order.id}`, note: svc.name });
    return { message: 'Mua thành công', order_id: order.id, balance: user.balance };
  });
}
const orderDto = o => ({ id: o.id, service_name: o.service_name, price: o.price, status: o.status, created_at: o.created_at });
const listOrders = (store, userId) => store.list('orders', o => o.user_id === userId).reverse().map(orderDto);
function prepareDownload(store, userId, orderId) {
  return store.transaction(() => {
    const o = store.get('orders', orderId);
    if (!o || o.user_id !== userId) throw bad('Đơn hàng không hợp lệ.', 404); // ownership check
    if (!['paid', 'completed'].includes(o.status)) throw bad('Đơn hàng chưa thanh toán.', 403);
    const f = inspect(o.file_name);
    if (!f || !f.exists) throw bad('⚠️ File sản phẩm hiện chưa được cập nhật.', 404);
    o.status = 'completed';
    return f;
  });
}
module.exports = { listServices, purchase, listOrders, prepareDownload, toDto, orderDto, v };
