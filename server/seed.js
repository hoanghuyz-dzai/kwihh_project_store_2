// Idempotent seed: admin, demo user, catalog and placeholder product files for local testing.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const cfg = require('./config'), sec = require('./lib/security'), { log } = require('./lib/util');
const { resolveProductFile } = require('./services/fileResolver');

const LABELS = { bot: 'Bot', tool: 'Tool', tienich: 'Tiện ích', website: 'Website', telegram: 'Telegram', zalo: 'Zalo', discord: 'Discord', custom: 'Theo yêu cầu', automation: 'Automation', windows: 'Windows', python: 'Python', other: 'Khác', chromeextension: 'Chrome Extension', browsertool: 'Browser Tool', webutility: 'Web Utility', windowsutility: 'Windows Utility', intro: 'Giới thiệu', shop: 'Bán hàng', '3d': '3D', landing: 'Landing Page' };
const K = n => n.map(x => x * 1000);
const CATALOG = {
  bot: { telegram: K([20, 30, 50, 100, 200, 300, 500]), zalo: K([20, 50, 100, 200, 500]), discord: K([20, 50, 100, 200, 500]) },
  tool: Object.fromEntries(['custom', 'automation', 'windows', 'python', 'other'].map(t => [t, K([10, 20, 50, 100, 200])])),
  tienich: Object.fromEntries(['chromeextension', 'browsertool', 'webutility', 'windowsutility'].map(t => [t, K([20, 50, 100])])),
  website: Object.fromEntries(['intro', 'shop', '3d', 'landing', 'custom'].map(t => [t, K([100, 200, 500])])),
};
// Which demo products get a placeholder zip (the rest show "file not updated").
const DEMO_FILES = new Set(['bottelegram20k', 'bottelegram50k', 'bottelegram100k', 'bottelegram200k', 'bottelegram500k', 'botzalo20k', 'botzalo50k', 'botzalo100k', 'botzalo200k', 'botzalo500k', 'botdiscord20k', 'botdiscord50k', 'botdiscord100k', 'botdiscord200k', 'botdiscord500k', 'toolautomation20k', 'tienichchromeextension20k', 'website3d200k']);
const MINI_ZIP = Buffer.from('504b0506000000000000000000000000000000000000', 'hex'); // valid empty zip

module.exports = function seed(store) {
  fs.mkdirSync(cfg.fileDir, { recursive: true }); fs.mkdirSync(cfg.bankDir, { recursive: true });
  store.transaction(() => {
    const addUser = (username, email, pw, role, balance) => {
      if (store.find('users', u => u.username === username)) return;
      store.insert('users', { username, email, password_hash: sec.hashPassword(pw), birth_date: '2000-01-01', balance, role, status: 'active', updated_at: new Date().toISOString() });
    };
    let adminPw = cfg.adminPassword;
    if (!store.find('users', u => u.username === cfg.adminUsername)) {
      if (!adminPw) { adminPw = crypto.randomBytes(9).toString('base64url'); log(`[seed] generated admin password (shown once): ${adminPw}`); }
      addUser(cfg.adminUsername, cfg.adminEmail, adminPw, 'admin', 0);
    }
    addUser('demo', 'demo@kwihh.local', cfg.demoPassword, 'user', 20000);
    if (!store.data.services.length) {
      for (const [cat, types] of Object.entries(CATALOG)) for (const [type, prices] of Object.entries(types)) for (const price of prices)
        store.insert('services', { category: cat, type, name: `${LABELS[cat]} ${LABELS[type]}`, description: `${LABELS[cat]} ${LABELS[type]} - phiên bản ${price.toLocaleString('vi-VN')}đ`, price, active: true });
    }
  });
  for (const s of store.data.services) {
    const f = resolveProductFile(s.category, s.type, s.price);
    if (f && !f.exists && DEMO_FILES.has(f.name.replace('.zip', ''))) fs.writeFileSync(f.full, MINI_ZIP);
  }
};
