// App shell: hash router, layout (sidebar / mobile bottom nav), page transitions, bootstrap.
import { api } from './api.js';
import { $, $$, esc, money, loading, toast } from './ui.js';
import { state, refreshMe, CATS } from './state.js';
import { startBackground } from './bg.js';
import { landing, loginPage, registerPage } from './landing.js';
import { home, categoryPage, typePage } from './shop.js';
import { bankPage } from './bank.js';
import { historyPage, accountPage } from './account.js';
import { adminPage } from './admin.js';

const app = $('#app');
const NAV = [['#/', 'Trang Chủ', '🏠'], ['#/c/bot', 'Bot', '🤖'], ['#/c/tool', 'Tool', '🛠️'], ['#/c/tienich', 'Tiện ích', '🧩'], ['#/c/website', 'Website', '🌐'], ['#/bank', 'Nạp Bank', '🏦'], ['#/history', 'Lịch sử', '📜'], ['#/account', 'Tài khoản', '👤']];

function layout(path) {
  const items = [...NAV, ...(state.me.role === 'admin' ? [['#/admin', 'Admin', '⚙️']] : [])];
  const active = h => (h === '#/' ? path === '' : path === h.slice(2) || path.startsWith(h.slice(2) + '/') || (h === '#/c/bot' && false));
  const links = (mob) => items.map(([h, l, i]) => `<a href="${h}" class="${active(h) ? 'on' : ''}">${mob ? i + '<br>' : ''}${l}</a>`).join('') + (mob ? '' : '<a id="out">Đăng Xuất</a>');
  app.innerHTML = `<div class="layout"><aside class="side glass"><div class="logo grad" style="padding:8px 14px;font-size:18px">◆ KWIHH PROJECT</div>${links(false)}</aside>
  <main class="main"><div class="topbar"><b class="grad">◆ KWIHH</b><span>@${esc(state.me.username)} · <b id="bal2"></b></span></div>
  <div class="glass head"><div>Xin chào, <b>@${esc(state.me.username)}</b></div><div>Số dư: <b id="bal" style="color:var(--c1)">${money(state.me.balance)}</b></div></div><div id="view"></div></main></div><nav class="bnav">${links(true)}<a id="out2">🚪<br>Thoát</a></nav>`;
  $('#bal2').textContent = money(state.me.balance);
  const logout = async () => { await api('/auth/logout', 'POST', {}).catch(() => {}); state.me = null; location.hash = '#/'; render(); };
  $('#out').onclick = logout; $('#out2').onclick = logout;
}
const PUBLIC = new Set(['', 'login', 'register']);
async function render() {
  const path = location.hash.replace(/^#\/?/, '').replace(/\/$/, ''), parts = path.split('/');
  window.scrollTo(0, 0);
  if (!state.me) {
    if (!PUBLIC.has(path)) { location.hash = '#/login'; return; }
    const page = { '': landing, login: loginPage, register: registerPage }[path]; app.innerHTML = '<div id="view"></div>'; return page($('#view'));
  }
  if (path === 'login' || path === 'register') { location.hash = '#/'; return; }
  layout(path);
  const view = $('#view');
  try {
    if (path === '') await home(view);
    else if (parts[0] === 'c' && parts[1] && parts[2]) await typePage(view, parts[1], parts[2]);
    else if (parts[0] === 'c' && parts[1]) await categoryPage(view, parts[1]);
    else if (path === 'bank') await bankPage(view);
    else if (path === 'history') await historyPage(view);
    else if (path === 'account') await accountPage(view);
    else if (parts[0] === 'admin') await adminPage(view, parts[1] || '');
    else view.innerHTML = '<div class="empty">Không tìm thấy trang. <a href="#/">Về trang chủ</a></div>';
  } catch (e) {
    if (e.status === 401) { state.me = null; toast('Phiên đăng nhập đã hết hạn.', false); location.hash = '#/login'; return render(); }
    view.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}
addEventListener('hashchange', render);
(async () => { startBackground(); await refreshMe(); render(); })();
