// UI toolkit: formatting, toasts, busy buttons, modals, 3D tilt.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => (n || 0).toLocaleString('vi-VN') + 'đ';
export const dt = s => (s ? new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const bytes = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB');
export const STATUS = { pending: ['Chờ duyệt', 'pd'], approved: ['Đã duyệt', 'ok'], rejected: ['Từ chối', 'no'], paid: ['Đã thanh toán', 'ok'], completed: ['Hoàn tất', 'ok'], success: ['Thành công', 'ok'], cancelled: ['Đã hủy', 'no'] };
export const badge = s => `<span class="badge ${(STATUS[s] || ['', ''])[1]}">${(STATUS[s] || [s])[0]}</span>`;

export function toast(msg, ok = true) {
  const d = document.createElement('div'); d.className = 't ' + (ok ? 's' : 'e'); d.textContent = (ok ? '✓ ' : '✕ ') + msg;
  $('#toast').append(d); setTimeout(() => d.remove(), 3800);
}
/** Disable a button with a loading label while fn runs; errors become toasts + shake. */
export async function busy(btn, fn) {
  const label = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Đang xử lý...';
  try { return await fn(); }
  catch (e) { toast(e.message, false); const f = btn.closest('.form'); if (f) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); } }
  finally { btn.disabled = false; btn.textContent = label; }
}
export function loading(el) { el.innerHTML = '<div class="loading"><div class="spinner"></div>Đang tải...</div>'; }
export function modal(html) {
  const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="glass form">${html}</div>`;
  o.addEventListener('mousedown', e => { if (e.target === o) o.remove(); }); document.body.append(o); return o;
}
/** formModal('Title', [{name,label,type,value,options}]) -> Promise<values|null> */
export function formModal(title, fields, submit = 'LƯU') {
  return new Promise(resolve => {
    const o = modal(`<h2>${esc(title)}</h2><br>${fields.map(f => `<label>${esc(f.label)}</label>${f.options ? `<select name="${f.name}">${f.options.map(x => `<option value="${esc(x[0])}" ${String(x[0]) === String(f.value) ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select>` : `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}">`}`).join('')}<div class="row"><button class="btn ghost" data-x>HỦY</button><button class="btn" data-ok>${esc(submit)}</button></div>`);
    $('[data-x]', o).onclick = () => { o.remove(); resolve(null); };
    $('[data-ok]', o).onclick = () => { const out = {}; fields.forEach(f => { const el = $(`[name="${f.name}"]`, o); out[f.name] = f.type === 'file' ? el.files[0] : el.value; }); o.remove(); resolve(out); };
  });
}
export const confirmBox = (text, label = 'XÁC NHẬN') => formModal(text, [], label).then(Boolean);
export const copy = async (text, what = 'nội dung') => { try { await navigator.clipboard.writeText(text); toast(`Đã copy ${what}`); } catch { toast('Không thể copy, hãy copy thủ công.', false); } };
/** Mouse-follow 3D tilt + spotlight on every .card.tilt inside root. Disabled on touch/reduced motion. */
export function tilt(root) {
  if (matchMedia('(pointer:coarse),(prefers-reduced-motion:reduce)').matches) return;
  $$('.tilt', root).forEach(c => {
    c.addEventListener('pointermove', e => { const b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; c.style.transform = `perspective(700px) rotateY(${(x - .5) * 12}deg) rotateX(${(.5 - y) * 12}deg) translateZ(8px)`; c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%'); });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });
}
