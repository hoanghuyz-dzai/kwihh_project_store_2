// JSON-file data store with a repository-style API and atomic transactions.
// Node is single-threaded and every mutation happens inside a synchronous transaction(),
// so two requests can never interleave -> no double-spend. Swap this file for SQLite/Postgres
// later without touching the service layer.
const fs = require('fs'), path = require('path');
const { now } = require('./util');
const TABLES = ['users', 'services', 'orders', 'transactions', 'bank_deposits', 'admin_logs', 'sessions'];

class Store {
  constructor(file) {
    this.file = file;
    this.data = { seq: {}, settings: {} };
    for (const t of TABLES) this.data[t] = [];
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) Object.assign(this.data, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  save() { // write temp file then rename => never leaves a half-written database
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
  /** Run fn atomically: on any error the in-memory state is rolled back and nothing is saved. */
  transaction(fn) {
    const snapshot = structuredClone(this.data);
    try { const r = fn(); this.save(); return r; }
    catch (e) { this.data = snapshot; throw e; }
  }
  insert(table, row) {
    const id = (this.data.seq[table] || 0) + 1;
    this.data.seq[table] = id;
    const rec = { id, ...row, created_at: now() };
    this.data[table].push(rec);
    return rec;
  }
  get(table, id) { return this.data[table].find(r => r.id === id) || null; }
  find(table, pred) { return this.data[table].find(pred) || null; }
  list(table, pred = () => true) { return this.data[table].filter(pred); }
  remove(table, pred) { this.data[table] = this.data[table].filter(r => !pred(r)); }
  setting(key, fallback) { return key in this.data.settings ? this.data.settings[key] : fallback; }
  setSetting(key, value) { this.data.settings[key] = value; }
}
module.exports = Store;
