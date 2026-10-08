// Bank top-up page: shows admin-configured account + QR, mandatory transfer content, deposit request.
import { api } from './api.js';
import { $, $$, esc, money, dt, badge, loading, busy, toast, copy } from './ui.js';

export async function bankPage(view) {
  loading(view);
  const [info, hist] = await Promise.all([api('/bank/info'), api('/bank/deposits')]);
  if (!info.enabled) { view.innerHTML = '<div class="glass empty">Phương thức nạp Bank đang tạm tắt.</div>'; return; }
  let amount = info.amounts[0];
  const row = (label, val) => `<tr><td class="mut">${label}</td><td><b>${esc(val) || '<i class="mut">Admin chưa cấu hình</i>'}</b></td><td>${val ? `<button class="btn sm ghost" data-copy="${esc(val)}">COPY</button>` : ''}</td></tr>`;
  view.innerHTML = `<h2 class="grad" style="margin-bottom:16px">NẠP BANK</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
    <div class="glass card"><h3>THÔNG TIN CHUYỂN KHOẢN</h3><br>${info.has_qr ? `<div style="text-align:center"><img class="qr" src="/api/bank/qr?t=${Date.now()}" alt="QR ngân hàng"></div><br>` : ''}<div class="tw"><table>${row('Ngân hàng', info.bank_name)}${row('Số tài khoản', info.account_number)}${row('Tên tài khoản', info.account_name)}</table></div></div>
    <div class="glass card"><h3>CHỌN SỐ TIỀN</h3><div class="row" id="amts" style="margin:12px 0">${info.amounts.map(a => `<button class="btn ghost ${a === amount ? 'ok' : ''}" data-a="${a}">${money(a)}</button>`).join('')}</div>
      <div class="alert"><b>⚠️ BẮT BUỘC</b><p>Nội dung chuyển khoản:</p><div class="big">${esc(info.transfer_content)}</div><p>Vui lòng nhập <b>ĐÚNG</b> nội dung chuyển khoản.</p><br><button class="btn sm" data-copy="${esc(info.transfer_content)}">COPY NỘI DUNG</button></div>
      <p style="margin:14px 0">Số tiền: <b class="grad" id="shown">${money(amount)}</b></p><button class="btn block ok" id="sent">TÔI ĐÃ CHUYỂN KHOẢN</button><p class="mut" style="margin-top:10px;font-size:12px">Admin sẽ kiểm tra giao dịch và cộng tiền sau khi xác minh.</p></div></div>
  <h3 style="margin:24px 0 10px">Lịch sử nạp Bank</h3><div class="glass tw" id="dh"></div>`;
  const drawHistory = list => { $('#dh', view).innerHTML = list.length ? `<table>${list.map(d => `<tr><td>Bank</td><td style="color:var(--ok)">+${money(d.amount)}</td><td>${badge(d.status)}</td><td>${dt(d.created_at)}</td></tr>`).join('')}</table>` : '<div class="empty">Chưa có yêu cầu nạp.</div>'; };
  drawHistory(hist.deposits);
  $$('[data-copy]', view).forEach(b => b.onclick = () => copy(b.dataset.copy));
  $$('[data-a]', view).forEach(b => b.onclick = () => { amount = +b.dataset.a; $$('[data-a]', view).forEach(x => x.classList.toggle('ok', x === b)); $('#shown', view).textContent = money(amount); });
  $('#sent', view).onclick = e => busy(e.target, async () => { toast((await api('/bank/deposit', 'POST', { amount })).message); drawHistory((await api('/bank/deposits')).deposits); });
}
