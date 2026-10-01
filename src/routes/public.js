// Routes anyone can call: catalogue, coupon check, price quote, place order.
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { priceCart } from '../lib/pricing.js';
import { normCode, isPhone, clean } from '../lib/validate.js';
import { BUNDLE } from '../seedData.js';

const r = Router();

const activeCoupon = (code) => {
  const c = db.get().coupons.find((x) => x.code === normCode(code));
  return c && c.active ? c : null;
};

r.get('/products', (req, res) => {
  res.json({ products: db.get().products.filter((p) => p.active !== false), bundle: BUNDLE });
});

r.get('/coupons/:code', (req, res) => {
  const c = activeCoupon(req.params.code);
  if (!c) return res.status(404).json({ error: 'הקוד לא קיים או שאינו פעיל' });
  res.json({ code: c.code, discount: c.discount }); // never expose commission or pin
});

r.post('/cart/quote', (req, res) => {
  const body = req.body || {};
  const coupon = body.couponCode ? activeCoupon(body.couponCode) : null;
  const q = priceCart(body.items, db.get().products, coupon);
  delete q.commission;
  res.json({ ...q, coupon: coupon ? { code: coupon.code, discount: coupon.discount } : null });
});

r.post('/orders', async (req, res) => {
  const { customer = {}, items = [], couponCode } = req.body || {};
  const errors = {};
  if (clean(customer.name).length < 2) errors.name = 'צריך שם מלא';
  if (!isPhone(customer.phone)) errors.phone = 'מספר בפורמט 050-1234567';
  if (clean(customer.city).length < 2) errors.city = 'חסרה עיר';
  if (!/\d/.test(clean(customer.street))) errors.street = 'הוסיפו רחוב ומספר בית';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'יש שדות חסרים', fields: errors });

  const data = db.get();
  const coupon = couponCode ? activeCoupon(couponCode) : null;
  const q = priceCart(items, data.products, coupon);
  if (!q.lines.length) return res.status(400).json({ error: 'הסל ריק' });

  const order = {
    id: crypto.randomUUID(),
    number: String(100000 + Math.floor(Math.random() * 900000)),
    createdAt: new Date().toISOString(),
    status: 'new', // new | processing | shipped | cancelled
    customer: {
      name: clean(customer.name, 80), phone: clean(customer.phone, 20), city: clean(customer.city, 60),
      street: clean(customer.street, 120), slot: clean(customer.slot, 40), note: clean(customer.note, 300),
    },
    items: q.lines,
    subtotal: q.subtotal, bundleDiscount: q.bundleDiscount, couponCode: coupon?.code || null,
    couponDiscount: q.couponDiscount, net: q.net, shipping: q.shipping, total: q.total,
  };
  data.orders.push(order);

  if (coupon) {
    data.earnings.push({
      id: order.id, orderId: order.id, orderNumber: order.number, code: coupon.code,
      createdAt: order.createdAt, sale: q.net, rate: coupon.commission, commission: q.commission,
      status: 'pending', // pending | paid | cancelled
    });
  }
  await db.save();
  res.status(201).json({ id: order.id, number: order.number, total: order.total });
});

export default r;
