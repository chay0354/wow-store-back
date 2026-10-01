// Postgres access for the store. The API uses the secret key, which bypasses RLS.
// Tables have RLS on and no policies, so the publishable key cannot read orders or PIN hashes.
import './config.js';
import { createAdminClient } from '@supabase/server/core';

const admin = () => createAdminClient();

function fail(error) {
  const err = new Error(error.message || 'database error');
  err.status = 500;
  throw err;
}

const num = (v) => (v == null ? v : Number(v));

function productFrom(row) {
  const product = {
    id: row.id,
    name: row.name,
    meta: row.meta,
    category: row.category,
    price: num(row.price),
    shape: row.shape,
    color: row.color,
    cap: row.cap,
    popularity: row.popularity,
    info: row.info || [],
    active: row.active,
  };
  if (row.was != null) product.was = num(row.was);
  if (row.green) product.green = true;
  if (row.is_new) product.isNew = true;
  if (row.image) product.image = row.image;
  return product;
}

export function productToRow(product) {
  return {
    id: product.id,
    name: product.name,
    meta: product.meta || '',
    category: product.category,
    price: product.price,
    was: product.was ?? null,
    shape: product.shape,
    color: product.color,
    cap: product.cap,
    popularity: product.popularity ?? 0,
    info: product.info || [],
    green: !!product.green,
    is_new: !!product.isNew,
    image: product.image || null,
    active: product.active !== false,
  };
}

function couponFrom(row) {
  return {
    code: row.code,
    name: row.name,
    discount: num(row.discount),
    commission: num(row.commission),
    active: row.active,
    pinHash: row.pin_hash,
    createdAt: row.created_at,
  };
}

export function couponToRow(coupon) {
  return {
    code: coupon.code,
    name: coupon.name,
    discount: coupon.discount,
    commission: coupon.commission,
    active: coupon.active !== false,
    pin_hash: coupon.pinHash,
    created_at: coupon.createdAt,
  };
}

function orderFrom(row) {
  return {
    id: row.id,
    number: row.number,
    createdAt: row.created_at,
    status: row.status,
    customer: row.customer,
    items: row.items,
    subtotal: num(row.subtotal),
    bundleDiscount: num(row.bundle_discount),
    couponCode: row.coupon_code,
    couponDiscount: num(row.coupon_discount),
    net: num(row.net),
    shipping: num(row.shipping),
    total: num(row.total),
  };
}

export function orderToRow(order) {
  return {
    id: order.id,
    number: order.number,
    created_at: order.createdAt,
    status: order.status,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    bundle_discount: order.bundleDiscount,
    coupon_code: order.couponCode,
    coupon_discount: order.couponDiscount,
    net: order.net,
    shipping: order.shipping,
    total: order.total,
  };
}

function earningFrom(row) {
  const earning = {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    code: row.code,
    createdAt: row.created_at,
    sale: num(row.sale),
    rate: num(row.rate),
    commission: num(row.commission),
    status: row.status,
  };
  if (row.paid_at) earning.paidAt = row.paid_at;
  return earning;
}

export function earningToRow(earning) {
  return {
    id: earning.id,
    order_id: earning.orderId,
    order_number: earning.orderNumber,
    code: earning.code,
    created_at: earning.createdAt,
    sale: earning.sale,
    rate: earning.rate,
    commission: earning.commission,
    status: earning.status,
    paid_at: earning.paidAt || null,
  };
}

export async function pingDb() {
  const { error } = await admin().from('products').select('id').limit(1);
  if (error) fail(error);
}

export async function listProducts() {
  const { data, error } = await admin().from('products').select('*').eq('active', true).order('popularity');
  if (error) fail(error);
  return data.map(productFrom);
}

export async function findCoupon(code) {
  const { data, error } = await admin().from('coupons').select('*').eq('code', code).maybeSingle();
  if (error) fail(error);
  return data ? couponFrom(data) : null;
}

export async function loadAll() {
  const sb = admin();
  const [products, coupons, orders, earnings] = await Promise.all([
    sb.from('products').select('*').order('id'),
    sb.from('coupons').select('*').order('created_at'),
    sb.from('orders').select('*').order('created_at', { ascending: false }),
    sb.from('earnings').select('*'),
  ]);
  if (products.error) fail(products.error);
  if (coupons.error) fail(coupons.error);
  if (orders.error) fail(orders.error);
  if (earnings.error) fail(earnings.error);
  return {
    products: products.data.map(productFrom),
    coupons: coupons.data.map(couponFrom),
    orders: orders.data.map(orderFrom),
    earnings: earnings.data.map(earningFrom),
  };
}

export async function insertOrder(order, earning) {
  const sb = admin();
  let saved = null;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = orderToRow(attempt === 0 ? order : { ...order, number: orderNumber() });
    const { data, error } = await sb.from('orders').insert(row).select('*').single();
    if (!error) {
      saved = data;
      break;
    }
    lastError = error;
    if (error.code !== '23505') fail(error);
  }
  if (!saved) fail(lastError);

  if (earning) {
    const { error } = await sb.from('earnings').insert(earningToRow({ ...earning, orderNumber: saved.number, orderId: saved.id }));
    if (error) {
      await sb.from('orders').delete().eq('id', saved.id);
      fail(error);
    }
  }
  return orderFrom(saved);
}

function orderNumber() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export async function updateOrderStatus(id, status) {
  const sb = admin();
  const { data: order, error } = await sb.from('orders').update({ status }).eq('id', id).select('*').maybeSingle();
  if (error) fail(error);
  if (!order) return null;

  const { data: earning, error: earnError } = await sb.from('earnings').select('*').eq('order_id', id).maybeSingle();
  if (earnError) fail(earnError);
  if (earning && earning.status !== 'paid') {
    const next = status === 'cancelled' ? 'cancelled' : 'pending';
    const { error: updateError } = await sb.from('earnings').update({ status: next }).eq('id', earning.id);
    if (updateError) fail(updateError);
  }
  return orderFrom(order);
}

export async function insertCoupon(coupon) {
  const { data, error } = await admin().from('coupons').insert(couponToRow(coupon)).select('*').single();
  if (error?.code === '23505') {
    const err = new Error('exists');
    err.status = 409;
    throw err;
  }
  if (error) fail(error);
  return couponFrom(data);
}

export async function updateCoupon(code, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.discount !== undefined) row.discount = patch.discount;
  if (patch.commission !== undefined) row.commission = patch.commission;
  if (patch.pinHash !== undefined) row.pin_hash = patch.pinHash;
  if (!Object.keys(row).length) {
    const { data, error } = await admin().from('coupons').select('*').eq('code', code).maybeSingle();
    if (error) fail(error);
    return data ? couponFrom(data) : null;
  }
  const { data, error } = await admin().from('coupons').update(row).eq('code', code).select('*').maybeSingle();
  if (error) fail(error);
  return data ? couponFrom(data) : null;
}

export async function deleteCoupon(code) {
  const { data, error } = await admin().from('coupons').delete().eq('code', code).select('code');
  if (error) fail(error);
  return data.length > 0;
}

export async function payCoupon(code) {
  const sb = admin();
  const now = new Date().toISOString();
  const { data, error } = await sb.from('earnings').update({ status: 'paid', paid_at: now }).eq('code', code).eq('status', 'pending').select('id');
  if (error) fail(error);
  return data.length;
}

async function deleteAll(table, column) {
  const { error } = await admin().from(table).delete().not(column, 'is', null);
  if (error) fail(error);
}

export async function resetDatabase({ products, coupons, orders, earnings }) {
  await deleteAll('earnings', 'id');
  await deleteAll('orders', 'id');
  await deleteAll('coupons', 'code');
  await deleteAll('products', 'id');

  const sb = admin();
  if (products.length) {
    const { error } = await sb.from('products').insert(products.map(productToRow));
    if (error) fail(error);
  }
  if (coupons.length) {
    const { error } = await sb.from('coupons').insert(coupons.map(couponToRow));
    if (error) fail(error);
  }
  if (orders.length) {
    const { error } = await sb.from('orders').insert(orders.map(orderToRow));
    if (error) fail(error);
  }
  if (earnings.length) {
    const { error } = await sb.from('earnings').insert(earnings.map(earningToRow));
    if (error) fail(error);
  }
}
