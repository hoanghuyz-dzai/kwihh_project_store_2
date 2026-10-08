// Admin panel: overview, users, services, files, orders, bank, transactions, logs.
import { api, fileToBase64 } from './api.js';
import { $, $$, esc, money, dt, bytes, badge, loading, busy, toast, formModal, confirmBox } from './ui.js';
import { state } from './state.js';

const TABS = [['', 'Overview'], ['users', 'Users'], ['services', 'Services'], ['files', 'Files'], ['orders', 'Orders'], ['bank', 'Bank'], ['transactions', 'Transactions'], ['logs', 'Logs']];
const table = (head, rows, empty = 'Trống') => `<div class="glass tw">${rows.length ? `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>` : `<div class="empty">${empty}</div>`}</div>`;
// run an admin action on a button then re-render the current tab
const act = (view, sel, fn, again) => $$(sel, view).forEach(b => b.onclick = () => busy(b, async () => { if (await fn(b) === false) return; toast('Thành công'); await again(); }));

export async function adminPage(view, tab = '') {
  if (state.me.role !== 'admin') { view.innerHTML = '<div class="error">Không có quyền truy cập.</div>'; return; }
  const draw = async () => {
    const body = $('#tab', view); loading(body);
    try { await PAGES[tab || 'overview'](body, draw); } catch (e) { body.innerHTML = `<div class="error">${esc(e.message)}</div>`; }
  };
  view.innerHTML = `<div class="tabs">${TABS.map(([k, l]) => `<a href="#/admin${k ? '/' + k : ''}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div><div id="tab"></div>`;
  await draw();
}
const PAGES = {
  async overview(el) {
    const s = await api('/admin/stats');
    el.innerHTML = `<div class="grid">${[['Tổng User', s.users], ['Tổng đơn', s.orders], ['Doanh thu', money(s.revenue)], ['Tổng số dư', money(s.total_balance)], ['Nạp Bank chờ duyệt', s.pending_deposits], ['Dịch vụ đang bán', s.services]].map(([l, v]) => `<div class="glass card"><small>${l}</small><div class="price">${v}</div></div>`).join('')}</div>`;
  },
  async users(el, again) {
    const { users } = await api('/admin/users');
    el.innerHTML = `<input id="q" placeholder="Tìm username...">` + table(['User', 'Email', 'Balance', 'Role', 'Trạng thái', ''], users.map(u => `<tr><td>@${esc(u.username)}</td><td>${esc(u.email)}</td><td>${money(u.balance)}</td><td>${u.role}</td><td>${u.status === 'locked' ? '🔒 locked' : 'active'}</td><td><button class="btn sm bal" data-id="${u.id}">±TIỀN</button> <button class="btn sm lock" data-id="${u.id}" data-s="${u.status === 'locked' ? 'active' : 'locked'}">${u.status === 'locked' ? 'MỞ KHÓA' : 'KHÓA'}</button> <button class="btn sm ghost role" data-id="${u.id}" data-r="${u.role === 'admin' ? 'user' : 'admin'}">→ ${u.role === 'admin' ? 'USER' : 'ADMIN'}</button></td></tr>`));
    $('#q', el).oninput = e => $$('tr', el).forEach((tr, i) => { if (i) tr.hidden = !tr.textContent.toLowerCase().includes(e.target.value.toLowerCase()); });
    act(el, '.bal', async b => { const f = await formModal('Điều chỉnh số dư', [{ name: 'amount', label: 'Số tiền (+50000 hoặc -10000)', type: 'number' }, { name: 'reason', label: 'Lý do' }]); if (!f) return false; await api(`/admin/users/${b.dataset.id}/balance`, 'PATCH', { amount: parseInt(f.amount, 10), reason: f.reason || 'admin adjust' }); }, again);
    act(el, '.lock', b => api(`/admin/users/${b.dataset.id}`, 'PATCH', { status: b.dataset.s }), again);
    act(el, '.role', async b => { if (!await confirmBox('Đổi quyền người dùng này?')) return false; await api(`/admin/users/${b.dataset.id}`, 'PATCH', { role: b.dataset.r }); }, again);
  },
  async services(el, again) {
    const { services } = await api('/admin/services');
    el.innerHTML = '<button class="btn" id="add">+ THÊM DỊCH VỤ</button><br><br>' + table(['Category', 'Type', 'Tên', 'Giá', 'File', 'Bán', ''], services.map(s => `<tr><td>${esc(s.category)}</td><td>${esc(s.type)}</td><td>${esc(s.name)}</td><td>${money(s.price)}</td><td>${s.hasFile ? '✓' : '✕'}</td><td>${s.active ? 'Bán' : 'Ẩn'}</td><td><button class="btn sm ed" data-id="${s.id}">SỬA</button> <button class="btn sm red del" data-id="${s.id}">ẨN</button></td></tr>`));
    const fields = s => [{ name: 'category', label: 'Category (bot/tool/tienich/website)', value: s.category }, { name: 'type', label: 'Type (telegram, zalo...)', value: s.type }, { name: 'name', label: 'Tên', value: s.name }, { name: 'description', label: 'Mô tả', value: s.description }, { name: 'price', label: 'Giá (đ)', type: 'number', value: s.price }, { name: 'active', label: 'Trạng thái', value: s.active ? 'true' : 'false', options: [['true', 'Đang bán'], ['false', 'Ẩn']] }];
    const clean = f => ({ ...f, price: parseInt(f.price, 10), active: f.active === 'true' });
    $('#add', el).onclick = async () => { const f = await formModal('Thêm dịch vụ', fields({ category: 'bot', type: '', name: '', description: '', price: 20000, active: true })); if (f) { try { await api('/admin/services', 'POST', clean(f)); toast('Đã thêm'); again(); } catch (e) { toast(e.message, false); } } };
    act(el, '.ed', async b => { const s = services.find(x => x.id === +b.dataset.id); const f = await formModal('Sửa dịch vụ', fields(s)); if (!f) return false; await api(`/admin/services/${s.id}`, 'PATCH', clean(f)); }, again);
    act(el, '.del', async b => { if (!await confirmBox('Ẩn dịch vụ này?')) return false; await api(`/admin/services/${b.dataset.id}`, 'DELETE'); }, again);
  },
  async files(el, again) {
    const { files } = await api('/admin/files');
    el.innerHTML = `<div class="glass card"><p class="mut">Tên file theo quy tắc: <b>category + type + giá</b> (vd <code>bottelegram20k.zip</code>)</p><input id="fn" placeholder="bottelegram20k.zip"><input id="ff" type="file" accept=".zip"><button class="btn" id="up">UPLOAD</button></div><br>` + table(['File', 'Dung lượng'], files.map(f => `<tr><td>${esc(f.name)}</td><td>${bytes(f.size)}</td></tr>`), 'Chưa có file.');
    $('#up', el).onclick = e => busy(e.target, async () => { const f = $('#ff', el).files[0]; if (!f) throw new Error('Chọn file .zip'); await api('/admin/files', 'POST', { name: $('#fn', el).value.trim() || f.name, data: await fileToBase64(f) }); toast('Đã upload'); again(); });
  },
  async orders(el) {
    const { orders } = await api('/admin/orders');
    el.innerHTML = table(['#', 'User', 'Sản phẩm', 'Giá', 'Trạng thái', 'Thời gian'], orders.map(o => `<tr><td>${o.id}</td><td>@${esc(o.username)}</td><td>${esc(o.service_name)}</td><td>${money(o.price)}</td><td>${badge(o.status)}</td><td>${dt(o.created_at)}</td></tr>`));
  },
  async bank(el, again) {
    const [{ settings: s }, { deposits }] = await Promise.all([api('/admin/bank'), api('/admin/bank/deposits')]);
    el.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="glass card"><h3>Thông tin ngân hàng</h3><label>Ngân hàng</label><input id="bn" value="${esc(s.bank_name)}"><label>Số tài khoản</label><input id="an" value="${esc(s.account_number)}"><label>Tên tài khoản</label><input id="ac" value="${esc(s.account_name)}"><label>Mệnh giá (phân cách bằng dấu phẩy)</label><input id="am" value="${s.amounts.join(',')}"><label>Phương thức Bank</label><select id="en"><option value="true" ${s.enabled ? 'selected' : ''}>Bật</option><option value="false" ${s.enabled ? '' : 'selected'}>Tắt</option></select><button class="btn block" id="sv">LƯU</button></div>
    <div class="glass card"><h3>Ảnh QR</h3>${s.qr_file ? `<img class="qr" src="/api/bank/qr?t=${Date.now()}" alt="QR">` : '<p class="mut">Chưa có ảnh.</p>'}<br><input id="qf" type="file" accept="image/png,image/jpeg"><button class="btn block" id="qu">UPLOAD / THAY QR</button></div></div><h3 style="margin:22px 0 8px">Yêu cầu nạp Bank</h3>` +
      table(['User', 'Số tiền', 'Nội dung', 'Thời gian', 'Trạng thái', ''], deposits.map(d => `<tr><td>@${esc(d.username)}</td><td>${money(d.amount)}</td><td>${esc(d.transfer_content)}</td><td>${dt(d.created_at)}</td><td>${badge(d.status)}</td><td>${d.status === 'pending' ? `<button class="btn sm ok ap" data-id="${d.id}">DUYỆT</button> <button class="btn sm red rj" data-id="${d.id}">TỪ CHỐI</button>` : ''}</td></tr>`));
    $('#sv', el).onclick = e => busy(e.target, async () => { await api('/admin/bank', 'PATCH', { bank_name: $('#bn', el).value, account_number: $('#an', el).value, account_name: $('#ac', el).value, amounts: $('#am', el).value.split(',').map(x => parseInt(x, 10)), enabled: $('#en', el).value === 'true' }); toast('Đã lưu'); again(); });
    $('#qu', el).onclick = e => busy(e.target, async () => { const f = $('#qf', el).files[0]; if (!f) throw new Error('Chọn ảnh QR'); await api('/admin/bank/qr', 'POST', { data: await fileToBase64(f) }); toast('Đã cập nhật QR'); again(); });
    act(el, '.ap', async b => { if (!await confirmBox('Xác nhận ĐÃ nhận tiền và cộng số dư?', 'DUYỆT')) return false; await api(`/admin/bank/deposits/${b.dataset.id}/approve`, 'POST', {}); }, again);
    act(el, '.rj', async b => { if (!await confirmBox('Từ chối yêu cầu này?', 'TỪ CHỐI')) return false; await api(`/admin/bank/deposits/${b.dataset.id}/reject`, 'POST', {}); }, again);
  },
  async transactions(el) {
    const { transactions } = await api('/admin/transactions');
    el.innerHTML = table(['#', 'User ID', 'Loại', 'Số tiền', 'Ghi chú', 'Thời gian'], transactions.map(t => `<tr><td>${t.id}</td><td>${t.user_id}</td><td>${t.type}</td><td>${money(t.amount)}</td><td>${esc(t.note)}</td><td>${dt(t.created_at)}</td></tr>`));
  },
  async logs(el) {
    const { logs } = await api('/admin/logs');
    el.innerHTML = table(['Thời gian', 'Admin', 'Action', 'Target', 'Metadata'], logs.map(l => `<tr><td>${dt(l.created_at)}</td><td>${l.admin_id}</td><td>${l.action}</td><td>${esc(l.target)}</td><td><small>${esc(JSON.stringify(l.metadata))}</small></td></tr>`));
  },
};
