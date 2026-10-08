// Home dashboard, category pages, product price tiers and the purchase flow.
import { api } from './api.js';
import { $, $$, esc, money, loading, busy, toast, modal, tilt } from './ui.js';
import { CATS, catOf, typeLabel, refreshMe } from './state.js';

export async function home(view) {
  view.innerHTML = `<div class="glass hero" style="min-height:260px;margin-bottom:20px"><h1 class="hero-title grad" style="font-size:clamp(2rem,7vw,4rem)">KWIHH PROJECT</h1><h3 class="logo">CODE. BUILD. CREATE.</h3><p class="mut">Everything you need to build your digital idea.</p></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${CATS.map(c => `<a class="glass card tilt click" href="${c.href}" style="color:inherit"><div class="icon">${c.icon}</div><h3>${c.label}</h3><p class="mut">${c.desc}</p></a>`).join('')}</div>`;
  tilt(view);
}
const crumbs = (cat, type) => `<p class="mut" style="margin-bottom:14px"><a href="#/">Trang chủ</a> › <a href="#/c/${cat}">${esc(catOf(cat)?.label || cat)}</a>${type ? ' › ' + esc(typeLabel(type)) : ''}</p>`;

export async function categoryPage(view, cat) {
  loading(view);
  const { services } = await api('/services?category=' + encodeURIComponent(cat));
  if (!services.length) { view.innerHTML = crumbs(cat) + '<div class="glass empty">Chưa có sản phẩm trong danh mục này.</div>'; return; }
  const groups = {}; services.forEach(s => (groups[s.type] ||= []).push(s));
  view.innerHTML = crumbs(cat) + `<h2 class="grad" style="margin-bottom:16px">${esc(catOf(cat)?.label || cat)}</h2><div class="grid three">${Object.entries(groups).map(([type, list]) => `<a class="glass card tilt click" href="#/c/${cat}/${type}" style="color:inherit"><div class="icon">${catOf(cat)?.icon || '📦'}</div><h3>${esc(catOf(cat)?.label)} ${esc(typeLabel(type))}</h3><p class="mut">${list.length} mức giá · từ ${money(Math.min(...list.map(s => s.price)))}</p></a>`).join('')}</div>`;
  tilt(view);
}
export async function typePage(view, cat, type) {
  loading(view);
  const list = (await api('/services?category=' + encodeURIComponent(cat))).services.filter(s => s.type === type);
  if (!list.length) { view.innerHTML = crumbs(cat, type) + '<div class="glass empty">Không có sản phẩm.</div>'; return; }
  view.innerHTML = crumbs(cat, type) + `<h2 class="grad">${esc(list[0].name)}</h2><p class="mut" style="margin-bottom:16px">Chọn phiên bản / mức giá</p><div class="grid">${list.map(s => `<div class="glass card tilt"><span class="tag">${esc(typeLabel(type))}</span><div class="price">${money(s.price)}</div><p class="mut" style="min-height:44px">${esc(s.description)}</p>${s.hasFile ? '' : '<p class="badge no" style="margin-bottom:8px;display:inline-block">Sản phẩm hiện chưa có file.</p>'}<button class="btn block buy" data-id="${s.id}" ${s.hasFile ? '' : 'disabled'}>MUA NGAY</button></div>`).join('')}</div>`;
  tilt(view);
  $$('.buy', view).forEach(b => b.onclick = () => {
    const s = list.find(x => x.id === +b.dataset.id);
    const o = modal(`<h2>Xác nhận mua</h2><p style="margin:12px 0">${esc(s.name)} — <b class="grad">${money(s.price)}</b></p><div class="row"><button class="btn ghost" data-x>HỦY</button><button class="btn" data-ok>MUA NGAY</button></div>`);
    $('[data-x]', o).onclick = () => o.remove();
    $('[data-ok]', o).onclick = e => busy(e.target, async () => {
      const r = await api('/orders', 'POST', { service_id: s.id }); await refreshMe();
      o.firstElementChild.innerHTML = `<h2 class="grad">✓ Mua thành công</h2><p style="margin:12px 0">Số dư còn lại: <b>${money(r.balance)}</b></p><button class="btn block ok" data-dl>TẢI FILE ${esc(s.name.toUpperCase())}</button><br><button class="btn ghost block" data-x>ĐÓNG</button>`;
      $('[data-dl]', o).onclick = () => { location.href = `/api/orders/${r.order_id}/download`; };
      $('[data-x]', o).onclick = () => o.remove(); toast('Mua thành công');
    });
  });
}
