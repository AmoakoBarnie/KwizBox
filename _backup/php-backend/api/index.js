// api/index.js — Vercel proxy handler: routes /api/* to the correct sub-handler

const path = require('path');

// Route registry: maps path pattern to module
const ROUTES = {
  // Auth (no params)
  '/auth/register': () => require('./auth/register'),
  '/auth/login': () => require('./auth/login'),
  '/auth/guest': () => require('./auth/guest'),
  '/auth/me': () => require('./auth/me'),
  '/auth/me/avatar': () => require('./auth/avatar'),
  '/auth/me/password': () => require('./auth/password'),
  '/auth/me/delete': () => require('./auth/delete'),
  // Quiz (no params)
  '/quiz/check': () => require('./quiz/check'),
  '/quiz/pack': () => require('./quiz/pack'),
  '/quiz/submit': () => require('./quiz/submit'),
  '/quiz/leaderboard': () => require('./quiz/leaderboard'),
  '/quiz/progress': () => require('./quiz/progress'),
  // Admin
  '/admin/token': () => require('./admin/token'),
  '/admin/logout': () => require('./admin/logout'),
  '/admin/me': () => require('./admin/me'),
  '/admin/dashboard': () => require('./admin/dashboard'),
  '/admin/monitor': () => require('./admin/monitor'),
  '/admin/audit': () => require('./admin/audit'),
};

// Routes with params — extracted from URL
const DYNAMIC_ROUTES = [
  { pattern: '/admin/users/:id/status', module: () => require('./admin/users-id-status') },
  { pattern: '/admin/users/:id', module: () => require('./admin/users-id') },
  { pattern: '/admin/questions/:id/active', module: () => require('./admin/questions-id-active') },
  { pattern: '/admin/questions/:id', module: () => require('./admin/questions-id') },
  { pattern: '/admin/school-codes/:id', module: () => require('./admin/school-codes-id') },
  { pattern: '/admin/settings/:key', module: () => require('./admin/settings-key') },
  { pattern: '/admin/admins/:id/status', module: () => require('./admin/admins-id-status') },
];

// List endpoints (no params but query strings)
const LIST_ROUTES = {
  '/admin/users': () => require('./admin/users-list'),
  '/admin/questions': () => require('./admin/questions-list'),
  '/admin/school-codes': () => require('./admin/school-codes-list'),
  '/admin/leaderboard': () => require('./admin/leaderboard'),
  '/admin/settings': () => require('./admin/settings'),
  '/admin/admins': () => require('./admin/admins-list'),
  '/admin/admins/create': () => require('./admin/create-admin'),
  '/admin/export/users': () => require('./admin/export-users'),
  '/admin/export/leaderboard': () => require('./admin/export-leaderboard'),
  '/admin/export/game-history': () => require('./admin/export-game-history'),
  '/admin/export/questions': () => require('./admin/export-questions'),
  '/admin/cleanup/guests': () => require('./admin/cleanup-guests'),
};

function parseUrl(url) {
  // Strip query string
  const [pathname] = url.split('?');
  const segments = pathname.split('/').filter(Boolean);
  return { segments };
}

function matchDynamic(segments, patternSegments) {
  if (segments.length !== patternSegments.length) return null;
  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i].startsWith(':')) {
      params[patternSegments[i].slice(1)] = segments[i];
    } else if (patternSegments[i] !== segments[i]) {
      return null;
    }
  }
  return params;
}

module.exports = async function handler(req, res) {
  const { segments, query } = parseUrl(req.url);
  const body = await parseBody(req);

  // Attach body to req for handlers
  req.body = body;
  req.query = query;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Try exact match
  const pathStr = '/' + segments.join('/');
  if (ROUTES[pathStr]) {
    const fn = ROUTES[pathStr]();
    try {
      await fn(req, res);
    } catch (err) {
      console.error('Route error:', err);
      if (!res.headersSent) {
        res.status(err.status || 500).json({ detail: err.message || 'Internal server error' });
      }
    }
    return;
  }

  // Try dynamic routes
  for (const route of DYNAMIC_ROUTES) {
    const patternSegments = route.pattern.split('/').filter(Boolean);
    const params = matchDynamic(segments, patternSegments);
    if (params) {
      const fn = route.module();
      try {
        await fn(req, res, params);
      } catch (err) {
        console.error('Route error:', err);
        if (!res.headersSent) {
          res.status(err.status || 500).json({ detail: err.message || 'Internal server error' });
        }
      }
      return;
    }
  }

  // Try list routes
  if (LIST_ROUTES[pathStr]) {
    const fn = LIST_ROUTES[pathStr]();
    try {
      await fn(req, res);
    } catch (err) {
      console.error('Route error:', err);
      if (!res.headersSent) {
        res.status(err.status || 500).json({ detail: err.message || 'Internal server error' });
      }
    }
    return;
  }

  res.status(404).json({ detail: 'Not found' });
};

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      resolve({});
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}