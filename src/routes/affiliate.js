// Affiliate area: login with coupon code + PIN, then see own earnings only.
import { Router } from 'express';
import { findCoupon, loadAll } from '../db.js';
import { signToken, requireRole } from '../middleware/auth.js';
import { verifyPassword } from '../lib/password.js';
import { normCode } from '../lib/validate.js';
import { loginLimiter } from '../middleware/limit.js';
import { asyncRoute } from '../lib/async.js';

const r = Router();

r.post('/login', loginLimiter, asyncRoute(async (req, res) => {
  const code = normCode(req.body?.code);
  const coupon = await findCoupon(code);
  if (!coupon || !verifyPassword(req.body?.pin || '', coupon.pinHash)) {
    return res.status(401).json({ error: 'קוד או קוד כניסה שגויים' });
  }
  res.json({ token: signToken({ role: 'affiliate', code }, '7d') });
}));

r.get('/me', requireRole('affiliate'), asyncRoute(async (req, res) => {
  const { coupons, earnings } = await loadAll();
  const coupon = coupons.find((x) => x.code === req.auth.code);
  if (!coupon) return res.status(404).json({ error: 'הקוד נמחק' });
  const rows = earnings
    .filter((e) => e.code === coupon.code && e.status !== 'cancelled')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ orderNumber, createdAt, sale, commission, status }) => ({ orderNumber, createdAt, sale, commission, status }));
  const sum = (arr) => Math.round(arr.reduce((s, e) => s + e.commission, 0) * 100) / 100;
  res.json({
    coupon: { code: coupon.code, name: coupon.name, discount: coupon.discount, commission: coupon.commission, active: coupon.active },
    totals: {
      orders: rows.length,
      sales: Math.round(rows.reduce((s, e) => s + e.sale, 0) * 100) / 100,
      earned: sum(rows),
      paid: sum(rows.filter((e) => e.status === 'paid')),
      pending: sum(rows.filter((e) => e.status === 'pending')),
    },
    rows,
  });
}));

export default r;
