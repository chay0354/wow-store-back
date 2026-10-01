// Resets the database file to the starting catalogue and adds one demo coupon.
// Usage: npm run seed   (WARNING: deletes existing orders/coupons)
import { db } from './db.js';
import { SEED_PRODUCTS } from './seedData.js';
import { hashPassword } from './lib/password.js';

await db.reset({
  products: SEED_PRODUCTS,
  coupons: [{ code: 'DEMO10', name: 'שותף לדוגמה', discount: 10, commission: 10, active: true, pinHash: hashPassword('1234'), createdAt: new Date().toISOString() }],
  orders: [],
  earnings: [],
});
console.log('Database reset. Demo coupon: DEMO10 (affiliate PIN 1234)');
