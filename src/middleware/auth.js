import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(payload, expiresIn = '12h') {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Allows only requests with a valid token of the given role ('admin' | 'affiliate'). */
export const requireRole = (role) => (req, res, next) => {
  try {
    const payload = jwt.verify(readToken(req) || '', config.jwtSecret);
    if (payload.role !== role) throw new Error('wrong role');
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'נדרשת התחברות' });
  }
};
