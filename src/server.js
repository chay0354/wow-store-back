import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { pingDb } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import affiliateRoutes from './routes/affiliate.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliate', affiliateRoutes);

// In production, serve the built React app (front/dist) from the same server.
const dist = path.resolve('../front/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת' });
});

export default app;

// Vercel imports this file and serves the exported app. Listen only when running locally.
if (!process.env.VERCEL) {
  if (!process.env.SUPABASE_SECRET_KEY) {
    console.error('[config] SUPABASE_SECRET_KEY is missing from .env. Paste the full secret from the Supabase API keys page.');
    process.exit(1);
  }
  await pingDb();
  app.listen(config.port, () => console.log(`API ready on http://localhost:${config.port}`));
}
