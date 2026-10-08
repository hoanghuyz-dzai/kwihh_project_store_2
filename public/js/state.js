// Shared client state + catalog metadata.
import { api } from './api.js';
export const state = { me: null };
export async function refreshMe() {
  try { state.me = (await api('/auth/me')).user; } catch { state.me = null; }
  const el = document.getElementById('bal'); if (el && state.me) el.textContent = (state.me.balance).toLocaleString('vi-VN') + 'đ';
  return state.me;
}
export const CATS = [
  { slug: 'bot', label: 'Bot', icon: '🤖', desc: 'Telegram · Zalo · Discord', href: '#/c/bot' },
  { slug: 'tool', label: 'Tool', icon: '🛠️', desc: 'Automation · Windows · Python', href: '#/c/tool' },
  { slug: 'tienich', label: 'Tiện ích', icon: '🧩', desc: 'Chrome Extension · Browser Tool', href: '#/c/tienich' },
  { slug: 'website', label: 'Website', icon: '🌐', desc: 'Website 3D · Bán hàng · Landing', href: '#/c/website' },
  { slug: 'bank', label: 'Nạp Bank', icon: '🏦', desc: 'Nạp tiền qua chuyển khoản', href: '#/bank' },
];
const TYPES = { telegram: 'Telegram', zalo: 'Zalo', discord: 'Discord', custom: 'Theo yêu cầu', automation: 'Automation', windows: 'Windows', python: 'Python', other: 'Khác', chromeextension: 'Chrome Extension', browsertool: 'Browser Tool', webutility: 'Web Utility', windowsutility: 'Windows Utility', intro: 'Website giới thiệu', shop: 'Website bán hàng', '3d': 'Website 3D', landing: 'Landing Page' };
export const typeLabel = t => TYPES[t] || t.charAt(0).toUpperCase() + t.slice(1);
export const catOf = slug => CATS.find(c => c.slug === slug);
