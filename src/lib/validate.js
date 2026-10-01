export const normCode = (c) => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
export const isPhone = (v) => /^0\d{1,2}-?\d{7}$/.test(String(v || '').replace(/\s/g, ''));
export const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
