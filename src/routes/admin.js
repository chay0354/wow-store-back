// Admin panel API. Login with ADMIN_PASSWORD, then send `Authorization: Bearer <token>`.
import { Router } from 'express';
import { db } from '../db.js';
import { config } from '../config.js';
import { signToken, requireRole } from '../middleware/auth.js';
import { hashPassword, safeEqual } from '../lib/password.js';
import { normCode, clean } from '../lib/validate.js';
import { loginLimiter } from '../middleware/limit.js';

const r = Router();
const ORDER_STATUSES = ['new', 'processing', 'shipped', 'cancelled'];

r.post('/login', loginLimiter, (req, res) => {
  if (!config.adminPassword || !safeEqual(req.body?.password || '', config.adminPassword)) {
    return res.status(401).json({ error: 'סיסמה שגויה' });
  }
  res.json({ token: signToken({ role: 'admin' }) });
});

r.use(requireRole('admin'));

function couponStats(code, earnings) {
  const rows = earnings.filter((e) => e.code === code && e.status !== 'cancelled');
  const sum = (arr, k) => Math.round(arr.reduce((s, e) => s + e[k], 0) * 100) / 100;
  return {
    orders: rows.length,
    sales: sum(rows, 'sale'),
    earned: sum(rows, 'commission'),
    unpaid: sum(rows.filter((e) => e.status === 'pending'), 'commission'),
  };
}
const publicCoupon = (c, earnings) => {
  const { pinHash, ...rest } = c;
  return { ...rest, hasPin: !!pinHash, stats: couponStats(c.code, earnings) };
};

r.get('/summary', (req, res) => {
  const { orders, earnings, coupons } = db.get();
  const live = orders.filter((o) => o.status !== 'cancelled');
  res.json({
    revenue: Math.round(live.reduce((s, o) => s + o.total, 0) * 100) / 100,
    orders: live.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    commissionDue: Math.round(earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.commission, 0) * 100) / 100,
    activeCoupons: coupons.filter((c) => c.active).length,
  });
});

r.get('/orders', (req, res) => {
  const orders = [...db.get().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ orders });
});

r.patch('/orders/:id', async (req, res) => {
  const data = db.get();
  const order = data.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'הזמנה לא נמצאה' });
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'סטטוס לא תקין' });
  order.status = status;
  const earning = data.earnings.find((e) => e.orderId === order.id);
  if (earning && earning.status !== 'paid') earning.status = status === 'cancelled' ? 'cancelled' : 'pending';
  await db.save();
  res.json({ order });
});

r.get('/coupons', (req, res) => {
  const { coupons, earnings } = db.get();
  res.json({ coupons: coupons.map((c) => publicCoupon(c, earnings)) });
});

const pct = (v) => Number.isFinite(+v) && +v >= 0 && +v <= 50;

r.post('/coupons', async (req, res) => {
  const data = db.get();
  const code = normCode(req.body?.code);
  const name = clean(req.body?.name, 80);
  const { discount, commission, pin } = req.body || {};
  if (code.length < 3) return res.status(400).json({ error: 'קוד קופון צריך לפחות 3 תווים באנגלית או מספרים' });
  if (!name) return res.status(400).json({ error: 'הוסיפו את שם השותף' });
  if (!pct(discount) || !pct(commission)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' });
  if (!pin || String(pin).length < 4) return res.status(400).json({ error: 'קוד כניסה לשותף: לפחות 4 תווים' });
  if (data.coupons.some((c) => c.code === code)) return res.status(409).json({ error: `הקוד ${code} כבר קיים` });
  const coupon = { code, name, discount: +discount, commission: +commission, active: true, pinHash: hashPassword(pin), createdAt: new Date().toISOString() };
  data.coupons.push(coupon);
  await db.save();
  res.status(201).json({ coupon: publicCoupon(coupon, data.earnings) });
});

r.patch('/coupons/:code', async (req, res) => {
  const data = db.get();
  const c = data.coupons.find((x) => x.code === normCode(req.params.code));
  if (!c) return res.status(404).json({ error: 'קופון לא נמצא' });
  const b = req.body || {};
  if (b.name !== undefined) c.name = clean(b.name, 80);
  if (b.active !== undefined) c.active = !!b.active;
  if (b.discount !== undefined) { if (!pct(b.discount)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' }); c.discount = +b.discount; }
  if (b.commission !== undefined) { if (!pct(b.commission)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' }); c.commission = +b.commission; }
  if (b.pin) { if (String(b.pin).length < 4) return res.status(400).json({ error: 'קוד כניסה: לפחות 4 תווים' }); c.pinHash = hashPassword(b.pin); }
  await db.save();
  res.json({ coupon: publicCoupon(c, data.earnings) });
});

r.delete('/coupons/:code', async (req, res) => {
  const data = db.get();
  const code = normCode(req.params.code);
  const before = data.coupons.length;
  data.coupons = data.coupons.filter((c) => c.code !== code);
  if (data.coupons.length === before) return res.status(404).json({ error: 'קופון לא נמצא' });
  await db.save(); // earnings history is kept on purpose
  res.json({ ok: true });
});

r.post('/coupons/:code/pay', async (req, res) => {
  const data = db.get();
  const code = normCode(req.params.code);
  const now = new Date().toISOString();
  let count = 0;
  for (const e of data.earnings) if (e.code === code && e.status === 'pending') { e.status = 'paid'; e.paidAt = now; count++; }
  await db.save();
  res.json({ paid: count });
});

export default r;
