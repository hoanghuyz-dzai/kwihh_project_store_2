// Central configuration. Tiny .env loader so the project needs zero dependencies.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env is optional */ }
const dataDir = path.resolve(root, process.env.DATA_DIR || 'data');
module.exports = {
  root, dataDir, publicDir: path.join(root, 'public'),
  fileDir: path.join(dataDir, 'file'), bankDir: path.join(dataDir, 'bank'), dbFile: path.join(dataDir, 'store.json'),
  port: process.env.PORT === undefined ? 3000 : +process.env.PORT,
  prod: process.env.NODE_ENV === 'production', trustProxy: process.env.TRUST_PROXY === '1',
  adminUsername: process.env.ADMIN_USERNAME || 'admin', adminEmail: process.env.ADMIN_EMAIL || 'admin@kwihh.local',
  adminPassword: process.env.ADMIN_PASSWORD || '', demoPassword: process.env.DEMO_PASSWORD || 'demo-pass-123',
  sessionDays: 7, maxPendingDeposits: 3,
};
