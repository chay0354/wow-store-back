// Admin panel API. Login with ADMIN_PASSWORD, then send `Authorization: Bearer <token>`.
import { Router } from 'express';
import { deleteCoupon, insertCoupon, loadAll, payCoupon, updateCoupon, updateOrderStatus } from '../db.js';
import { config } from '../config.js';
import { signToken, requireRole } from '../middleware/auth.js';
import { hashPassword, safeEqual } from '../lib/password.js';
import { normCode, clean } from '../lib/validate.js';
import { loginLimiter } from '../middleware/limit.js';
import { asyncRoute } from '../lib/async.js';

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
  const sum = (arr, key) => Math.round(arr.reduce((s, e) => s + e[key], 0) * 100) / 100;
  return {
    orders: rows.length,
    sales: sum(rows, 'sale'),
    earned: sum(rows, 'commission'),
    unpaid: sum(rows.filter((e) => e.status === 'pending'), 'commission'),
  };
}

const publicCoupon = (coupon, earnings) => {
  const { pinHash, ...rest } = coupon;
  return { ...rest, hasPin: !!pinHash, stats: couponStats(coupon.code, earnings) };
};

r.get('/summary', asyncRoute(async (req, res) => {
  const { orders, earnings, coupons } = await loadAll();
  const live = orders.filter((o) => o.status !== 'cancelled');
  res.json({
    revenue: Math.round(live.reduce((s, o) => s + o.total, 0) * 100) / 100,
    orders: live.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    commissionDue: Math.round(earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.commission, 0) * 100) / 100,
    activeCoupons: coupons.filter((c) => c.active).length,
  });
}));

r.get('/orders', asyncRoute(async (req, res) => {
  const { orders } = await loadAll();
  res.json({ orders });
}));

r.patch('/orders/:id', asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'סטטוס לא תקין' });
  const order = await updateOrderStatus(req.params.id, status);
  if (!order) return res.status(404).json({ error: 'הזמנה לא נמצאה' });
  res.json({ order });
}));

r.get('/coupons', asyncRoute(async (req, res) => {
  const { coupons, earnings } = await loadAll();
  res.json({ coupons: coupons.map((c) => publicCoupon(c, earnings)) });
}));

const pct = (v) => Number.isFinite(+v) && +v >= 0 && +v <= 50;

r.post('/coupons', asyncRoute(async (req, res) => {
  const code = normCode(req.body?.code);
  const name = clean(req.body?.name, 80);
  const { discount, commission, pin } = req.body || {};
  if (code.length < 3) return res.status(400).json({ error: 'קוד קופון צריך לפחות 3 תווים באנגלית או מספרים' });
  if (!name) return res.status(400).json({ error: 'הוסיפו את שם השותף' });
  if (!pct(discount) || !pct(commission)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' });
  if (!pin || String(pin).length < 4) return res.status(400).json({ error: 'קוד כניסה לשותף: לפחות 4 תווים' });
  const coupon = { code, name, discount: +discount, commission: +commission, active: true, pinHash: hashPassword(pin), createdAt: new Date().toISOString() };
  try {
    const saved = await insertCoupon(coupon);
    const { earnings } = await loadAll();
    res.status(201).json({ coupon: publicCoupon(saved, earnings) });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: `הקוד ${code} כבר קיים` });
    throw err;
  }
}));

r.patch('/coupons/:code', asyncRoute(async (req, res) => {
  const code = normCode(req.params.code);
  const body = req.body || {};
  const patch = {};
  if (body.name !== undefined) patch.name = clean(body.name, 80);
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.discount !== undefined) {
    if (!pct(body.discount)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' });
    patch.discount = +body.discount;
  }
  if (body.commission !== undefined) {
    if (!pct(body.commission)) return res.status(400).json({ error: 'אחוזים בין 0 ל-50' });
    patch.commission = +body.commission;
  }
  if (body.pin) {
    if (String(body.pin).length < 4) return res.status(400).json({ error: 'קוד כניסה: לפחות 4 תווים' });
    patch.pinHash = hashPassword(body.pin);
  }
  const saved = await updateCoupon(code, patch);
  if (!saved) return res.status(404).json({ error: 'קופון לא נמצא' });
  const { earnings } = await loadAll();
  res.json({ coupon: publicCoupon(saved, earnings) });
}));

r.delete('/coupons/:code', asyncRoute(async (req, res) => {
  const removed = await deleteCoupon(normCode(req.params.code));
  if (!removed) return res.status(404).json({ error: 'קופון לא נמצא' });
  res.json({ ok: true });
}));

r.post('/coupons/:code/pay', asyncRoute(async (req, res) => {
  const paid = await payCoupon(normCode(req.params.code));
  res.json({ paid });
}));

export default r;
