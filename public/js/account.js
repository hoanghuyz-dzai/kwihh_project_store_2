// History and account pages.
import { api } from './api.js';
import { $, $$, esc, money, dt, badge, loading, busy, toast } from './ui.js';
import { state } from './state.js';

export async function historyPage(view) {
  loading(view);
  const [o, d, t] = await Promise.all([api('/orders'), api('/bank/deposits'), api('/transactions')]);
  const tbl = (rows, empty) => `<div class="glass tw">${rows.length ? `<table>${rows.join('')}</table>` : `<div class="empty">${empty}</div>`}</div>`;
  view.innerHTML = `<h3 style="margin-bottom:8px">Lịch sử mua</h3>${tbl(o.orders.map(x => `<tr><td>${esc(x.service_name)}</td><td style="color:var(--no)">-${money(x.price)}</td><td>${badge(x.status)}</td><td>${dt(x.created_at)}</td><td><button class="btn sm dl" data-id="${x.id}">TẢI</button></td></tr>`), 'Chưa có đơn hàng.')}
  <h3 style="margin:22px 0 8px">Lịch sử nạp Bank</h3>${tbl(d.deposits.map(x => `<tr><td>Bank</td><td style="color:var(--ok)">+${money(x.amount)}</td><td>${badge(x.status)}</td><td>${dt(x.created_at)}</td></tr>`), 'Chưa có yêu cầu nạp.')}
  <h3 style="margin:22px 0 8px">Giao dịch</h3>${tbl(t.transactions.map(x => `<tr><td>${dt(x.created_at)}</td><td>${x.type}</td><td style="color:var(--${x.amount < 0 ? 'no' : 'ok'})">${x.amount > 0 ? '+' : ''}${money(x.amount)}</td><td>${badge(x.status)}</td></tr>`), 'Chưa có giao dịch.')}`;
  $$('.dl', view).forEach(b => b.onclick = () => { location.href = `/api/orders/${b.dataset.id}/download`; });
}
export async function accountPage(view) {
  const u = state.me;
  view.innerHTML = `<div class="glass form" style="margin:auto"><h2 class="grad">TÀI KHOẢN</h2><br><p>Username: <b>@${esc(u.username)}</b></p><p>Email: ${esc(u.email)}</p><p>Ngày tạo: ${dt(u.created_at)}</p><p>Số dư: <b>${money(u.balance)}</b></p><br><h3>Đổi mật khẩu</h3><label>Mật khẩu cũ</label><input id="o" type="password" autocomplete="current-password"><label>Mật khẩu mới</label><input id="n" type="password" autocomplete="new-password"><button class="btn block" id="go">ĐỔI MẬT KHẨU</button><br><br><a href="#/history">Xem lịch sử &amp; đơn hàng →</a></div>`;
  $('#go', view).onclick = e => busy(e.target, async () => { toast((await api('/account/password', 'PATCH', { old_password: $('#o', view).value, new_password: $('#n', view).value })).message); $('#o', view).value = $('#n', view).value = ''; });
}
