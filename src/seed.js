// Loads the catalogue into Supabase. If data/db.json exists, its coupons, orders,
// and earnings are copied too. Otherwise one demo coupon is created.
// Usage: npm run seed
import fs from 'node:fs';
import path from 'node:path';
import { resetDatabase } from './db.js';
import { SEED_PRODUCTS } from './seedData.js';
import { hashPassword } from './lib/password.js';

const file = path.resolve('./data/db.json');
const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const coupons = existing?.coupons?.length
  ? existing.coupons
  : [{ code: 'DEMO10', name: 'שותף לדוגמה', discount: 10, commission: 10, active: true, pinHash: hashPassword('1234'), createdAt: new Date().toISOString() }];

await resetDatabase({
  products: existing?.products?.length ? existing.products : SEED_PRODUCTS,
  coupons,
  orders: existing?.orders || [],
  earnings: existing?.earnings || [],
});

console.log(existing
  ? `Supabase loaded from data/db.json (${coupons.length} coupons, ${(existing.orders || []).length} orders).`
  : 'Supabase seeded. Demo coupon: DEMO10 (affiliate PIN 1234)');
