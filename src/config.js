import 'dotenv/config';

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: clientOrigins,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || '',
  freeShippingFrom: 199,
  shippingPrice: 24.9,
};

if (!config.adminPassword || !config.jwtSecret) {
  console.warn('[config] ADMIN_PASSWORD or JWT_SECRET is missing. Copy .env.example to .env and set them.');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('[config] SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.');
}
