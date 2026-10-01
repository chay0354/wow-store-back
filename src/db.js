// Tiny JSON-file database. Good enough for a prototype / small shop.
// Swap for Postgres/SQLite later: every route only talks to these functions.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { SEED_PRODUCTS } from './seedData.js';

const file = path.resolve(config.dataFile);
let data = null;

function load() {
  if (data) return data;
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    data = { products: SEED_PRODUCTS, coupons: [], orders: [], earnings: [] };
    persist();
  }
  return data;
}

let writing = Promise.resolve();
function persist() {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const snapshot = JSON.stringify(data, null, 2);
  // write atomically: temp file then rename
  writing = writing.then(() => {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, snapshot);
    fs.renameSync(tmp, file);
  });
  return writing;
}

export const db = {
  get: () => load(),
  save: () => persist(),
  reset(next) { data = next; return persist(); },
};
