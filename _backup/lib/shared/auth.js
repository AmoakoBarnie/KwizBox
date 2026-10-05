// api/_shared/auth.js — JWT + password hashing for Vercel serverless functions
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_ALGORITHM = 'HS256';
const JWT_ACCESS_EXPIRY = 60 * 24 * 30; // 30 days
const JWT_ADMIN_EXPIRY = 60 * 2;        // 2 hours

// ─── JWT helpers ───────────────────────────────────────────────

function base64UrlEncode(data) {
  return data.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (str.length % 4);
  if (padding !== 4) str += '='.repeat(padding);
  return Buffer.from(str, 'base64');
}

function jwtEncode(payload) {
  const header = Buffer.from(JSON.stringify({ alg: JWT_ALGORITHM, typ: 'JWT' }));
  const payloadBuf = Buffer.from(JSON.stringify(payload));
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(payloadBuf)}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function jwtDecode(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signature = base64UrlDecode(sigB64);
  const signingInput = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest();
  if (!crypto.timingSafeEqual(expected, signature)) return null;
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  if (!payload || typeof payload !== 'object') return null;
  if (payload.exp && payload.exp < Date.now() / 1000) return null;
  return payload;
}

// ─── Password helpers ──────────────────────────────────────────

function hashPassword(password) {
  return crypto.scryptSync(password, 'kwizbox-salt', 64).toString('hex');
}

function verifyPassword(password, hash) {
  const computed = crypto.scryptSync(password, 'kwizbox-salt', 64).toString('hex');
  return computed === hash;
}

// ─── Auth helpers ──────────────────────────────────────────────

function createUserToken(userId, isGuest = false) {
  return jwtEncode({
    sub: String(userId),
    guest: isGuest,
    exp: Math.floor(Date.now() / 1000) + JWT_ACCESS_EXPIRY,
  });
}

function createAdminToken(adminId) {
  return jwtEncode({
    sub: String(adminId),
    admin: true,
    exp: Math.floor(Date.now() / 1000) + JWT_ADMIN_EXPIRY,
  });
}

function bearerToken(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/Bearer\s+(.+)/i);
  return match ? match[1] : null;
}

function currentUser(req) {
  const token = bearerToken(req);
  if (!token) return null;
  return jwtDecode(token);
}

function requireAuth(req) {
  const user = currentUser(req);
  if (!user) {
    throw { status: 401, detail: 'Not authenticated' };
  }
  return user;
}

module.exports = {
  jwtEncode,
  jwtDecode,
  hashPassword,
  verifyPassword,
  createUserToken,
  createAdminToken,
  bearerToken,
  currentUser,
  requireAuth,
};