// Single source of truth for prices. The server ALWAYS recalculates totals;
// numbers sent by the browser are never trusted.
import { config } from '../config.js';
import { BUNDLE } from '../seedData.js';

export const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {Array<{productId:number, qty:number}>} items
 * @param {Array} products  catalogue
 * @param {{discount:number, commission:number}|null} coupon
 */
export function priceCart(items, products, coupon) {
  const list = Array.isArray(items) ? items : [];
  const catalog = Array.isArray(products) ? products : [];
  const lines = [];
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    const p = catalog.find((x) => x.id === Number(it.productId) && x.active !== false);
    let qty = Math.floor(Number(it.qty));
    if (!p || !(qty > 0)) continue;
    if (qty > 99) qty = 99;
    lines.push({ productId: p.id, name: p.name, price: p.price, qty, lineTotal: round2(p.price * qty) });
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  const qtyOf = (id) => lines.find((l) => l.productId === id)?.qty || 0;
  const sets = Math.min(...BUNDLE.productIds.map(qtyOf));
  const fullSetPrice = BUNDLE.productIds.reduce((s, id) => s + (catalog.find((p) => p.id === id)?.price || 0), 0);
  const bundleDiscount = sets > 0 ? round2(Math.max(0, sets * (fullSetPrice - BUNDLE.price))) : 0;

  const afterBundle = round2(subtotal - bundleDiscount);
  const couponDiscount = coupon ? round2((afterBundle * coupon.discount) / 100) : 0;
  const net = round2(afterBundle - couponDiscount); // the amount commission is calculated on
  const shipping = net === 0 || net >= config.freeShippingFrom ? 0 : config.shippingPrice;
  const total = round2(net + shipping);
  const commission = coupon ? round2((net * coupon.commission) / 100) : 0;

  return { lines, subtotal, bundleDiscount, couponDiscount, net, shipping, total, commission };
}
