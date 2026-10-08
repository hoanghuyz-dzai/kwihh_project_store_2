// Public pages: landing, login, register.
import { api } from './api.js';
import { $, esc, busy, toast, tilt } from './ui.js';
import { CATS, refreshMe, state } from './state.js';

export async function landing(view) {
  view.innerHTML = `
  <header class="nav"><div class="logo grad" style="font-size:20px">◆ KWIHH PROJECT</div><div class="row nogrow"><a class="btn ghost sm" href="#/login">ĐĂNG NHẬP</a><a class="btn sm" href="#/register">TẠO TÀI KHOẢN</a></div></header>
  <section class="hero"><p class="tag">Software Studio</p><h1 class="hero-title grad">KWIHH<br>PROJECT</h1><h2 class="logo" style="letter-spacing:.4em">CODE. BUILD. CREATE.</h2><p class="mut">Code Your Ideas. Build Your Future.</p>
  <div class="row nogrow"><a class="btn" href="#/register">BẮT ĐẦU NGAY</a><a class="btn ghost" href="#services">XEM DỊCH VỤ</a></div></section>
  <section class="section" id="services"><h2 class="grad">Dịch vụ</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">${CATS.map(c => `<a class="glass card tilt click" href="#/login" style="color:inherit"><div class="icon">${c.icon}</div><h3>${c.label}</h3><p class="mut">${c.desc}</p></a>`).join('')}</div></section>
  <section class="section"><h2 class="grad">Vì sao chọn Kwihh Project?</h2><div class="grid three">${[['🔒', 'Bảo mật', 'Mật khẩu hash, giao dịch atomic, tải file có kiểm tra quyền.'], ['⚡', 'Nhận file ngay', 'Thanh toán bằng số dư và tải sản phẩm tức thì.'], ['🧠', 'Theo yêu cầu', 'Bot, tool, tiện ích, website theo đúng ý tưởng của bạn.']].map(([i, t, d]) => `<div class="glass card tilt"><div class="icon">${i}</div><h3>${t}</h3><p class="mut">${d}</p></div>`).join('')}</div></section>
  <section class="section"><div class="grid three" id="stats"></div></section>
  <section class="section"><h2 class="grad">Liên hệ</h2><div class="glass card" style="text-align:center"><p>Cần sản phẩm theo yêu cầu? Đăng nhập và liên hệ admin qua Zalo / Telegram / Discord.</p></div></section>
  <footer class="footer">© ${new Date().getFullYear()} KWIHH PROJECT — Code. Build. Create.</footer>`;
  tilt(view);
  try { // animated counters from real backend numbers
    const s = await api('/public/stats');
    $('#stats', view).innerHTML = [['Người dùng', s.users], ['Đơn hàng', s.orders], ['Sản phẩm', s.services]].map(([l, n]) => `<div class="glass card" style="text-align:center"><div class="stat grad" data-n="${n}">0</div><small>${l}</small></div>`).join('');
    view.querySelectorAll('[data-n]').forEach(el => { const to = +el.dataset.n; let i = 0; const id = setInterval(() => { i = Math.min(to, i + Math.ceil(to / 30)); el.textContent = i; if (i >= to) clearInterval(id); }, 30); });
  } catch { /* stats are decorative */ }
}

const eye = (id, autocomplete = 'current-password') => `<div class="input-eye"><input id="${id}" type="password" autocomplete="${autocomplete}" spellcheck="false" autocapitalize="none" inputmode="text"><button type="button" class="btn sm ghost" data-eye="${id}" aria-label="Hiện/ẩn mật khẩu" tabindex="-1">👁</button></div>`;
const bindEye = view => view.querySelectorAll('[data-eye]').forEach(b => {
  b.addEventListener('mousedown', e => e.preventDefault());
  b.addEventListener('click', () => {
    const i = $('#' + b.dataset.eye, view);
    if (!i) return;
    const pos = i.selectionStart ?? i.value.length;
    i.type = i.type === 'password' ? 'text' : 'password';
    i.focus({ preventScroll: true });
    try { i.setSelectionRange(pos, pos); } catch {}
  });
});

export function loginPage(view) {
  view.innerHTML = `<div class="center"><div class="glass form"><h2 class="grad">ĐĂNG NHẬP</h2><br><label>Tên tài khoản</label><input id="u" placeholder="abcxyz" autocomplete="username"><label>Mật khẩu</label>${eye('p')}<button class="btn block" id="go">ĐĂNG NHẬP</button><br><br><div class="row"><a href="#/register">Tạo tài khoản</a><a href="#/" style="text-align:right">← Trang chủ</a></div></div></div>`;
  bindEye(view);
  const go = () => busy($('#go', view), async () => { state.me = (await api('/auth/login', 'POST', { username: $('#u', view).value, password: $('#p', view).value })).user; toast('Đăng nhập thành công'); location.hash = '#/'; });
  $('#go', view).onclick = go; $('#p', view).onkeydown = e => e.key === 'Enter' && go();
}
export function registerPage(view) {
  const opt = (a, b, desc) => Array.from({ length: b - a + 1 }, (_, i) => { const x = desc ? b - i : a + i; return `<option>${x}</option>`; }).join('');
  view.innerHTML = `<div class="center"><div class="glass form"><h2 class="grad">TẠO TÀI KHOẢN</h2><br><label>Email</label><input id="e" type="email" placeholder="hoanghuyzdev@gmail.com"><label>Ngày sinh</label><div class="row"><select id="d">${opt(1, 31)}</select><select id="m">${opt(1, 12)}</select><select id="y">${opt(1950, new Date().getFullYear() - 5, 1)}</select></div><label>Tên tài khoản</label><input id="u" placeholder="hoanghuy" autocomplete="username"><label>Mật khẩu (≥ 8 ký tự)</label>${eye('p', 'new-password')}<label>Xác nhận mật khẩu</label>${eye('c', 'new-password')}<button class="btn block" id="go">TẠO TÀI KHOẢN</button><br><br><a href="#/login">Đã có tài khoản? Đăng nhập</a></div></div>`;
  bindEye(view);
  $('#go', view).onclick = () => busy($('#go', view), async () => {
    const z = n => String(n).padStart(2, '0');
    await api('/auth/register', 'POST', { email: $('#e', view).value, username: $('#u', view).value, password: $('#p', view).value, confirm: $('#c', view).value, birth_date: `${$('#y', view).value}-${z($('#m', view).value)}-${z($('#d', view).value)}` });
    toast('Tạo tài khoản thành công!'); location.hash = '#/login';
  });
}
