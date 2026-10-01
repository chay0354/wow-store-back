// Very small in-memory rate limit for login endpoints (10 tries / 15 min per IP).
const hits = new Map();
const WINDOW = 15 * 60 * 1000, MAX = 10;

export function loginLimiter(req, res, next) {
  const key = req.ip + req.baseUrl;
  const now = Date.now();
  const h = (hits.get(key) || []).filter((t) => now - t < WINDOW);
  if (h.length >= MAX) return res.status(429).json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.' });
  h.push(now);
  hits.set(key, h);
  next();
}
