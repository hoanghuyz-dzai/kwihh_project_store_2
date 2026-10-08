// FileResolverService: the ONLY place that turns (category, type, price) into a file path.
// Callers never pass paths, so path traversal is impossible by construction.
const fs = require('fs'), path = require('path');
const { fileDir } = require('../config');
const { SLUG } = require('../lib/util');

const priceTag = p => (p % 1000 === 0 ? `${p / 1000}k` : String(p)); // 20000 -> "20k"
const SAFE_NAME = /^[a-z0-9]+\.zip$/;

function inspect(name) {
  if (!SAFE_NAME.test(name)) return null;
  const full = path.join(fileDir, name);
  if (path.dirname(full) !== fileDir) return null;
  let exists = false;
  try { exists = fs.statSync(full).isFile(); } catch { /* missing */ }
  return { name, full, exists };
}
/** resolveProductFile("bot","telegram",20000) -> data/file/bottelegram20k.zip */
function resolveProductFile(category, type, price) {
  if (!SLUG.test(category) || !SLUG.test(type) || !Number.isInteger(price) || price <= 0) return null;
  return inspect(`${category}${type}${priceTag(price)}.zip`);
}
module.exports = { resolveProductFile, inspect, priceTag };
