// Routes anyone can call: catalogue, coupon check, price quote, place order.
import { Router } from 'express';
import crypto from 'node:crypto';
import { findCoupon, insertOrder, listProducts } from '../db.js';
import { priceCart } from '../lib/pricing.js';
import { normCode, isPhone, clean } from '../lib/validate.js';
import { asyncRoute } from '../lib/async.js';
import { BUNDLE } from '../seedData.js';

const r = Router();

async function activeCoupon(code) {
  const coupon = await findCoupon(normCode(code));
  return coupon && coupon.active ? coupon : null;
}

r.get('/products', asyncRoute(async (req, res) => {
  res.json({ products: await listProducts(), bundle: BUNDLE });
}));

r.get('/coupons/:code', asyncRoute(async (req, res) => {
  const coupon = await activeCoupon(req.params.code);
  if (!coupon) return res.status(404).json({ error: 'הקוד לא קיים או שאינו פעיל' });
  res.json({ code: coupon.code, discount: coupon.discount });
}));

r.post('/cart/quote', asyncRoute(async (req, res) => {
  const body = req.body || {};
  const coupon = body.couponCode ? await activeCoupon(body.couponCode) : null;
  const products = await listProducts();
  const quote = priceCart(body.items, products, coupon);
  delete quote.commission;
  res.json({ ...quote, coupon: coupon ? { code: coupon.code, discount: coupon.discount } : null });
}));

r.post('/orders', asyncRoute(async (req, res) => {
  const { customer = {}, items = [], couponCode } = req.body || {};
  const errors = {};
  if (clean(customer.name).length < 2) errors.name = 'צריך שם מלא';
  if (!isPhone(customer.phone)) errors.phone = 'מספר בפורמט 050-1234567';
  if (clean(customer.city).length < 2) errors.city = 'חסרה עיר';
  if (!/\d/.test(clean(customer.street))) errors.street = 'הוסיפו רחוב ומספר בית';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'יש שדות חסרים', fields: errors });

  const coupon = couponCode ? await activeCoupon(couponCode) : null;
  const quote = priceCart(items, await listProducts(), coupon);
  if (!quote.lines.length) return res.status(400).json({ error: 'הסל ריק' });

  const order = {
    id: crypto.randomUUID(),
    number: String(100000 + Math.floor(Math.random() * 900000)),
    createdAt: new Date().toISOString(),
    status: 'new',
    customer: {
      name: clean(customer.name, 80), phone: clean(customer.phone, 20), city: clean(customer.city, 60),
      street: clean(customer.street, 120), slot: clean(customer.slot, 40), note: clean(customer.note, 300),
    },
    items: quote.lines,
    subtotal: quote.subtotal, bundleDiscount: quote.bundleDiscount, couponCode: coupon?.code || null,
    couponDiscount: quote.couponDiscount, net: quote.net, shipping: quote.shipping, total: quote.total,
  };
  const earning = coupon ? {
    id: order.id, orderId: order.id, orderNumber: order.number, code: coupon.code,
    createdAt: order.createdAt, sale: quote.net, rate: coupon.commission, commission: quote.commission,
    status: 'pending',
  } : null;

  const saved = await insertOrder(order, earning);
  res.status(201).json({ id: saved.id, number: saved.number, total: saved.total });
}));

export default r;
