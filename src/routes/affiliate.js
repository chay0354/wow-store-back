// Affiliate area: login with coupon code + PIN, then see own earnings only.
import { Router } from 'express';
import { db } from '../db.js';
import { signToken, requireRole } from '../middleware/auth.js';
import { verifyPassword } from '../lib/password.js';
import { normCode } from '../lib/validate.js';
import { loginLimiter } from '../middleware/limit.js';

const r = Router();

r.post('/login', loginLimiter, (req, res) => {
  const code = normCode(req.body?.code);
  const c = db.get().coupons.find((x) => x.code === code);
  if (!c || !verifyPassword(req.body?.pin || '', c.pinHash)) {
    return res.status(401).json({ error: 'קוד או קוד כניסה שגויים' });
  }
  res.json({ token: signToken({ role: 'affiliate', code }, '7d') });
});

r.get('/me', requireRole('affiliate'), (req, res) => {
  const { coupons, earnings } = db.get();
  const c = coupons.find((x) => x.code === req.auth.code);
  if (!c) return res.status(404).json({ error: 'הקוד נמחק' });
  const rows = earnings
    .filter((e) => e.code === c.code && e.status !== 'cancelled')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ orderNumber, createdAt, sale, commission, status }) => ({ orderNumber, createdAt, sale, commission, status }));
  const sum = (arr) => Math.round(arr.reduce((s, e) => s + e.commission, 0) * 100) / 100;
  res.json({
    coupon: { code: c.code, name: c.name, discount: c.discount, commission: c.commission, active: c.active },
    totals: {
      orders: rows.length,
      sales: Math.round(rows.reduce((s, e) => s + e.sale, 0) * 100) / 100,
      earned: sum(rows),
      paid: sum(rows.filter((e) => e.status === 'paid')),
      pending: sum(rows.filter((e) => e.status === 'pending')),
    },
    rows,
  });
});

export default r;
