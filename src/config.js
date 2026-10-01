import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || '',
  dataFile: process.env.DATA_FILE || './data/db.json',
  freeShippingFrom: 199,
  shippingPrice: 24.9,
};

if (!config.adminPassword || !config.jwtSecret) {
  console.warn('[config] ADMIN_PASSWORD or JWT_SECRET is missing. Copy .env.example to .env and set them.');
}
