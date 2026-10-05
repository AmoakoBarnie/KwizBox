// api/index.js — Vercel proxy handler: routes /api/* to the correct sub-handler

const path = require('path');

// Route registry: maps path pattern to module
const ROUTES = {
  // Auth (no params)
  '/auth/register': () => require('../lib/auth/register'),
  '/auth/login': () => require('../lib/auth/login'),
  '/auth/guest': () => require('../lib/auth/guest'),
  '/auth/me': () => require('../lib/auth/me'),
  '/auth/me/avatar': () => require('../lib/auth/avatar'),
  '/auth/me/password': () => require('../lib/auth/password'),
  '/auth/me/delete': () => require('../lib/auth/delete'),
  // Quiz (no params)
  '/quiz/check': () => require('../lib/quiz/check'),
  '/quiz/pack': () => require('../lib/quiz/pack'),
  '/quiz/submit': () => require('../lib/quiz/submit'),
  '/quiz/leaderboard': () => require('../lib/quiz/leaderboard'),
  '/quiz/progress': () => require('../lib/quiz/progress'),
  // Admin
  '/admin/token': () => require('../lib/admin/token'),
  '/admin/logout': () => require('../lib/admin/logout'),
  '/admin/me': () => require('../lib/admin/me'),
  '/admin/dashboard': () => require('../lib/admin/dashboard'),
  '/admin/monitor': () => require('../lib/admin/monitor'),
  '/admin/audit': () => require('../lib/admin/audit'),
};

// Routes with params — extracted from URL
const DYNAMIC_ROUTES = [
  { pattern: '/admin/users/:id/status', module: () => require('../lib/admin/users-id-status') },
  { pattern: '/admin/users/:id', module: () => require('../lib/admin/users-id') },
  { pattern: '/admin/questions/:id/active', module: () => require('../lib/admin/questions-id-active') },
  { pattern: '/admin/questions/:id', module: () => require('../lib/admin/questions-id') },
  { pattern: '/admin/school-codes/:id', module: () => require('../lib/admin/school-codes-id') },
  { pattern: '/admin/settings/:key', module: () => require('../lib/admin/settings-key') },
  { pattern: '/admin/admins/:id/status', module: () => require('../lib/admin/admins-id-status') },
];

// List endpoints (no params but query strings)
const LIST_ROUTES = {
  '/admin/users': () => require('../lib/admin/users-list'),
  '/admin/questions': () => require('../lib/admin/questions-list'),
  '/admin/school-codes': () => require('../lib/admin/school-codes-list'),
  '/admin/leaderboard': () => require('../lib/admin/leaderboard'),
  '/admin/settings': () => require('../lib/admin/settings'),
  '/admin/admins': () => require('../lib/admin/admins-list'),
  '/admin/admins/create': () => require('../lib/admin/create-admin'),
  '/admin/export/users': () => require('../lib/admin/export-users'),
  '/admin/export/leaderboard': () => require('../lib/admin/export-leaderboard'),
  '/admin/export/game-history': () => require('../lib/admin/export-game-history'),
  '/admin/export/questions': () => require('../lib/admin/export-questions'),
  '/admin/cleanup/guests': () => require('../lib/admin/cleanup-guests'),
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