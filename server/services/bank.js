// Bank top-up: user declares a transfer -> pending -> admin verifies in the bank app -> approve/reject.
// Money is NEVER credited automatically from a user click.
const fs = require('fs'), path = require('path');
const { bad, v } = require('../lib/util');
const { bankDir, maxPendingDeposits } = require('../config');

const DEFAULTS = { enabled: true, bank_name: '', account_number: '', account_name: '', qr_file: '', amounts: [10000, 20000, 50000, 100000, 200000, 500000] };
const settings = store => ({ ...DEFAULTS, ...store.setting('bank', {}) });
const transferContent = u => `NAP BANK @${u.username}`;

function info(store, user) {
  const s = settings(store);
  return { enabled: s.enabled, bank_name: s.bank_name, account_number: s.account_number, account_name: s.account_name, amounts: s.amounts, has_qr: !!s.qr_file, transfer_content: transferContent(user) };
}
function createDeposit(store, user, b) {
  return store.transaction(() => {
    const s = settings(store);
    if (!s.enabled) throw bad('Phương thức Bank đang tắt.', 403);
    const amount = v.int(b.amount, { min: 1000, msg: 'Số tiền không hợp lệ.' });
    if (!s.amounts.includes(amount)) throw bad('Mệnh giá không được hỗ trợ.');
    if (store.list('bank_deposits', d => d.user_id === user.id && d.status === 'pending').length >= maxPendingDeposits) throw bad('Bạn có quá nhiều yêu cầu đang chờ duyệt.', 429);
    store.insert('bank_deposits', { user_id: user.id, username: user.username, amount, transfer_content: transferContent(user), status: 'pending', processed_at: null });
    return { message: 'Đã gửi yêu cầu, vui lòng chờ admin xác minh.' };
  });
}
const depositDto = d => ({ id: d.id, username: d.username, amount: d.amount, transfer_content: d.transfer_content, status: d.status, created_at: d.created_at, processed_at: d.processed_at });
const listDeposits = (store, userId) => store.list('bank_deposits', d => userId == null || d.user_id === userId).reverse().map(depositDto);

function decide(store, admin, id, status, logAdmin) {
  return store.transaction(() => {
    const d = store.get('bank_deposits', id);
    if (!d) throw bad('Không tìm thấy yêu cầu.', 404);
    if (d.status !== 'pending') throw bad('Yêu cầu đã được xử lý.', 409); // blocks double approval
    d.status = status; d.processed_at = new Date().toISOString();
    if (status === 'approved') {
      const u = store.get('users', d.user_id);
      u.balance += d.amount; u.updated_at = d.processed_at;
      store.insert('transactions', { user_id: u.id, type: 'DEPOSIT', amount: d.amount, status: 'success', ref: `deposit#${d.id}`, note: 'Bank' });
    }
    logAdmin(store, admin.id, status === 'approved' ? 'BANK_APPROVE' : 'BANK_REJECT', `deposit#${id}`, { amount: d.amount, user: d.username });
    return { ok: true };
  });
}
function updateSettings(store, admin, b, logAdmin) {
  return store.transaction(() => {
    const cur = settings(store), next = { ...cur };
    if ('enabled' in b) next.enabled = v.bool(b.enabled);
    if ('bank_name' in b) next.bank_name = v.str(b.bank_name, { min: 0, max: 80 });
    if ('account_number' in b) next.account_number = v.str(b.account_number, { min: 0, max: 40, re: /^[0-9A-Za-z .-]*$/ });
    if ('account_name' in b) next.account_name = v.str(b.account_name, { min: 0, max: 80 });
    if ('amounts' in b) {
      if (!Array.isArray(b.amounts) || !b.amounts.length || b.amounts.length > 12) throw bad('Danh sách mệnh giá không hợp lệ.');
      next.amounts = [...new Set(b.amounts.map(a => v.int(a, { min: 1000, max: 50_000_000 })))].sort((x, y) => x - y);
    }
    store.setSetting('bank', next);
    logAdmin(store, admin.id, 'BANK_SETTINGS', 'bank', { enabled: next.enabled });
    return { ok: true };
  });
}
function uploadQr(store, admin, b, logAdmin) {
  const buf = Buffer.from(typeof b.data === 'string' ? b.data : '', 'base64');
  if (!buf.length || buf.length > 2 * 1024 * 1024) throw bad('Ảnh phải nhỏ hơn 2MB.');
  const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), jpg = buf[0] === 0xff && buf[1] === 0xd8; // magic bytes, not trusting client mime
  if (!png && !jpg) throw bad('Chỉ hỗ trợ PNG hoặc JPG.');
  const name = png ? 'bank.png' : 'bank.jpg';
  fs.mkdirSync(bankDir, { recursive: true });
  for (const f of ['bank.png', 'bank.jpg']) fs.rmSync(path.join(bankDir, f), { force: true });
  fs.writeFileSync(path.join(bankDir, name), buf);
  store.transaction(() => { store.setSetting('bank', { ...settings(store), qr_file: name }); logAdmin(store, admin.id, 'BANK_QR_UPLOAD', name, { bytes: buf.length }); });
  return { ok: true };
}
function qrFile(store) {
  const f = settings(store).qr_file;
  return f === 'bank.png' || f === 'bank.jpg' ? { full: path.join(bankDir, f), mime: f.endsWith('png') ? 'image/png' : 'image/jpeg' } : null;
}
module.exports = { info, createDeposit, listDeposits, decide, updateSettings, uploadQr, qrFile, settings };
